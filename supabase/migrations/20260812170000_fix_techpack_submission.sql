-- Align the Tech Pack form, Storage bucket, and database records.
-- This migration is intentionally additive so existing requests/documents remain intact.

-- ============================================================
-- 1. Add Tech Pack / manufacturing request fields
-- ============================================================

alter table public.manufacturing_requests
  add column if not exists request_type text default 'Quote',
  add column if not exists garment_category text,
  add column if not exists product_type text,
  add column if not exists number_of_styles integer,
  add column if not exists target_quantity integer,
  add column if not exists fabric_preference text,
  add column if not exists fabric_weight_gsm text,
  add column if not exists color_requirements text,
  add column if not exists additional_material_requirements text,
  add column if not exists customization_requirements text,
  add column if not exists packaging_requirements text,
  add column if not exists production_timeline text,
  add column if not exists additional_notes text,
  add column if not exists priority text default 'Medium',
  add column if not exists admin_notes text,
  add column if not exists updated_at timestamptz default now();


-- ============================================================
-- 2. Add document relationship and file information
-- ============================================================
-- manufacturing_requests.id is UUID in the existing database,
-- therefore manufacturing_request_id must also be UUID.

alter table public.documents
  add column if not exists manufacturing_request_id uuid
    references public.manufacturing_requests(id)
    on delete cascade,
  add column if not exists file_url text,
  add column if not exists file_type text;


-- ============================================================
-- 3. Index for faster document lookups
-- ============================================================

create index if not exists documents_manufacturing_request_id_idx
  on public.documents (manufacturing_request_id);


-- ============================================================
-- 4. Create / update Tech Pack Storage bucket
-- ============================================================

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'techpacks',
  'techpacks',
  true,
  20971520,
  array[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'application/postscript',
    'application/illustrator',
    'application/zip',
    'application/x-zip-compressed',
    'multipart/x-zip'
  ]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;


-- ============================================================
-- 5. Allow anonymous/authenticated Tech Pack uploads
-- ============================================================

drop policy if exists "anonymous techpack uploads"
on storage.objects;

create policy "anonymous techpack uploads"
on storage.objects
for insert
to anon, authenticated
with check (
  bucket_id = 'techpacks'
  and (storage.foldername(name))[1] = 'designs'
);


-- ============================================================
-- 6. Secure Tech Pack submission RPC
-- ============================================================
-- This function:
--   - validates required fields
--   - creates the manufacturing request
--   - creates linked document records
--   - returns the UUID of the newly created request
--
-- SECURITY DEFINER allows the anonymous client to submit without
-- granting anonymous users read access to manufacturing_requests.

create or replace function public.submit_manufacturing_request(
  p_submission jsonb,
  p_documents jsonb default '[]'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_request_id uuid;
  v_document jsonb;
begin

  -- ==========================================================
  -- Validate required fields
  -- ==========================================================

  if coalesce(trim(p_submission ->> 'company_name'), '') = ''
     or coalesce(trim(p_submission ->> 'contact_person'), '') = ''
     or coalesce(trim(p_submission ->> 'email'), '') = ''
     or coalesce(trim(p_submission ->> 'phone'), '') = ''
     or coalesce(trim(p_submission ->> 'country'), '') = ''
     or coalesce(trim(p_submission ->> 'garment_category'), '') = '' then

    raise exception 'Required manufacturing request fields are missing.';

  end if;


  -- ==========================================================
  -- Validate documents JSON
  -- ==========================================================

  if jsonb_typeof(p_documents) <> 'array' then
    raise exception 'Uploaded documents must be an array.';
  end if;


  -- ==========================================================
  -- Create manufacturing request
  -- ==========================================================

  insert into public.manufacturing_requests (
    request_type,
    status,
    company_name,
    contact_person,
    email,
    phone,
    country,
    garment_category,
    product_type,
    number_of_styles,
    target_quantity,
    fabric_preference,
    fabric_weight_gsm,
    color_requirements,
    additional_material_requirements,
    customization_requirements,
    packaging_requirements,
    production_timeline,
    additional_notes,
    uploaded_files
  )
  values (
    coalesce(
      nullif(trim(p_submission ->> 'request_type'), ''),
      'Quote'
    ),

    coalesce(
      nullif(trim(p_submission ->> 'status'), ''),
      'New'
    ),

    trim(p_submission ->> 'company_name'),

    trim(p_submission ->> 'contact_person'),

    lower(trim(p_submission ->> 'email')),

    trim(p_submission ->> 'phone'),

    trim(p_submission ->> 'country'),

    trim(p_submission ->> 'garment_category'),

    nullif(
      trim(p_submission ->> 'product_type'),
      ''
    ),

    nullif(
      p_submission ->> 'number_of_styles',
      ''
    )::integer,

    nullif(
      p_submission ->> 'target_quantity',
      ''
    )::integer,

    nullif(
      trim(p_submission ->> 'fabric_preference'),
      ''
    ),

    nullif(
      trim(p_submission ->> 'fabric_weight_gsm'),
      ''
    ),

    nullif(
      trim(p_submission ->> 'color_requirements'),
      ''
    ),

    nullif(
      trim(p_submission ->> 'additional_material_requirements'),
      ''
    ),

    nullif(
      trim(p_submission ->> 'customization_requirements'),
      ''
    ),

    nullif(
      trim(p_submission ->> 'packaging_requirements'),
      ''
    ),

    nullif(
      trim(p_submission ->> 'production_timeline'),
      ''
    ),

    nullif(
      trim(p_submission ->> 'additional_notes'),
      ''
    ),

    p_documents
  )

  returning id into v_request_id;


  -- ==========================================================
  -- Create document records
  -- ==========================================================

  for v_document in
    select value
    from jsonb_array_elements(p_documents)
  loop

    if coalesce(trim(v_document ->> 'file_name'), '') = ''
       or coalesce(trim(v_document ->> 'file_path'), '') = ''
       or coalesce(trim(v_document ->> 'file_url'), '') = '' then

      raise exception
        'An uploaded document is missing its storage details.';

    end if;


    insert into public.documents (
      manufacturing_request_id,
      file_name,
      file_path,
      file_url,
      file_type,
      mime_type,
      file_size,
      document_type
    )
    values (
      v_request_id,

      trim(v_document ->> 'file_name'),

      trim(v_document ->> 'file_path'),

      trim(v_document ->> 'file_url'),

      nullif(
        trim(v_document ->> 'file_type'),
        ''
      ),

      nullif(
        trim(v_document ->> 'file_type'),
        ''
      ),

      nullif(
        v_document ->> 'file_size',
        ''
      )::integer,

      'client_file'
    );

  end loop;


  -- ==========================================================
  -- Return the UUID of the newly created request
  -- ==========================================================

  return v_request_id;

end;
$$;


-- ============================================================
-- 7. RPC permissions
-- ============================================================

revoke all
on function public.submit_manufacturing_request(jsonb, jsonb)
from public;

grant execute
on function public.submit_manufacturing_request(jsonb, jsonb)
to anon, authenticated;