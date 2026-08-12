-- Align the Tech Pack form, Storage bucket, and database records.
-- This migration is intentionally additive so existing requests/documents remain intact.

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

alter table public.documents
  add column if not exists manufacturing_request_id bigint references public.manufacturing_requests(id) on delete cascade,
  add column if not exists file_url text,
  add column if not exists file_type text;

create index if not exists documents_manufacturing_request_id_idx
  on public.documents (manufacturing_request_id);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
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
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "anonymous techpack uploads" on storage.objects;
create policy "anonymous techpack uploads"
  on storage.objects for insert to anon, authenticated
  with check (
    bucket_id = 'techpacks'
    and (storage.foldername(name))[1] = 'designs'
  );

-- A security-definer RPC returns the generated ID without granting anonymous
-- visitors read access to every manufacturing request. It also creates the
-- document rows in the same database transaction as the request.
create or replace function public.submit_manufacturing_request(
  p_submission jsonb,
  p_documents jsonb default '[]'::jsonb
)
returns bigint
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_request_id bigint;
  v_document jsonb;
begin
  if coalesce(trim(p_submission ->> 'company_name'), '') = ''
     or coalesce(trim(p_submission ->> 'contact_person'), '') = ''
     or coalesce(trim(p_submission ->> 'email'), '') = ''
     or coalesce(trim(p_submission ->> 'phone'), '') = ''
     or coalesce(trim(p_submission ->> 'country'), '') = ''
     or coalesce(trim(p_submission ->> 'garment_category'), '') = '' then
    raise exception 'Required manufacturing request fields are missing.';
  end if;

  if jsonb_typeof(p_documents) <> 'array' then
    raise exception 'Uploaded documents must be an array.';
  end if;

  insert into public.manufacturing_requests (
    request_type, status, company_name, contact_person, email, phone, country,
    garment_category, product_type, number_of_styles, target_quantity,
    fabric_preference, fabric_weight_gsm, color_requirements,
    additional_material_requirements, customization_requirements,
    packaging_requirements, production_timeline, additional_notes, uploaded_files
  ) values (
    coalesce(nullif(trim(p_submission ->> 'request_type'), ''), 'Quote'),
    coalesce(nullif(trim(p_submission ->> 'status'), ''), 'New'),
    trim(p_submission ->> 'company_name'), trim(p_submission ->> 'contact_person'),
    lower(trim(p_submission ->> 'email')), trim(p_submission ->> 'phone'), trim(p_submission ->> 'country'),
    trim(p_submission ->> 'garment_category'), nullif(trim(p_submission ->> 'product_type'), ''),
    nullif(p_submission ->> 'number_of_styles', '')::integer,
    nullif(p_submission ->> 'target_quantity', '')::integer,
    nullif(trim(p_submission ->> 'fabric_preference'), ''), nullif(trim(p_submission ->> 'fabric_weight_gsm'), ''),
    nullif(trim(p_submission ->> 'color_requirements'), ''),
    nullif(trim(p_submission ->> 'additional_material_requirements'), ''),
    nullif(trim(p_submission ->> 'customization_requirements'), ''),
    nullif(trim(p_submission ->> 'packaging_requirements'), ''),
    nullif(trim(p_submission ->> 'production_timeline'), ''),
    nullif(trim(p_submission ->> 'additional_notes'), ''), p_documents
  ) returning id into v_request_id;

  for v_document in select value from jsonb_array_elements(p_documents)
  loop
    if coalesce(trim(v_document ->> 'file_name'), '') = ''
       or coalesce(trim(v_document ->> 'file_path'), '') = ''
       or coalesce(trim(v_document ->> 'file_url'), '') = '' then
      raise exception 'An uploaded document is missing its storage details.';
    end if;

    insert into public.documents (
      manufacturing_request_id, file_name, file_path, file_url, file_type,
      mime_type, file_size, document_type
    ) values (
      v_request_id, trim(v_document ->> 'file_name'), trim(v_document ->> 'file_path'),
      trim(v_document ->> 'file_url'), nullif(trim(v_document ->> 'file_type'), ''),
      nullif(trim(v_document ->> 'file_type'), ''), nullif(v_document ->> 'file_size', '')::integer,
      'client_file'
    );
  end loop;

  return v_request_id;
end;
$$;

revoke all on function public.submit_manufacturing_request(jsonb, jsonb) from public;
grant execute on function public.submit_manufacturing_request(jsonb, jsonb) to anon, authenticated;
