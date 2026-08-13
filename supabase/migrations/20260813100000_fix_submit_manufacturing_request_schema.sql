-- Match the Tech Pack submission RPC to the production tables.
-- Uploaded files are represented only by linked public.documents rows.

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
    additional_notes
  )
  values (
    coalesce(nullif(trim(p_submission ->> 'request_type'), ''), 'Quote'),
    coalesce(nullif(trim(p_submission ->> 'status'), ''), 'New'),
    trim(p_submission ->> 'company_name'),
    trim(p_submission ->> 'contact_person'),
    lower(trim(p_submission ->> 'email')),
    trim(p_submission ->> 'phone'),
    trim(p_submission ->> 'country'),
    trim(p_submission ->> 'garment_category'),
    nullif(trim(p_submission ->> 'product_type'), ''),
    nullif(p_submission ->> 'number_of_styles', '')::integer,
    nullif(p_submission ->> 'target_quantity', '')::integer,
    nullif(trim(p_submission ->> 'fabric_preference'), ''),
    nullif(trim(p_submission ->> 'fabric_weight_gsm'), ''),
    nullif(trim(p_submission ->> 'color_requirements'), ''),
    nullif(trim(p_submission ->> 'additional_material_requirements'), ''),
    nullif(trim(p_submission ->> 'customization_requirements'), ''),
    nullif(trim(p_submission ->> 'packaging_requirements'), ''),
    nullif(trim(p_submission ->> 'production_timeline'), ''),
    nullif(trim(p_submission ->> 'additional_notes'), '')
  )
  returning id into v_request_id;

  for v_document in
    select value from jsonb_array_elements(p_documents)
  loop
    if coalesce(trim(v_document ->> 'file_name'), '') = ''
       or coalesce(trim(v_document ->> 'file_url'), '') = '' then
      raise exception 'An uploaded document is missing its storage details.';
    end if;

    insert into public.documents (
      manufacturing_request_id,
      file_name,
      file_url,
      file_type,
      uploaded_at
    )
    values (
      v_request_id,
      trim(v_document ->> 'file_name'),
      trim(v_document ->> 'file_url'),
      nullif(trim(v_document ->> 'file_type'), ''),
      now()
    );
  end loop;

  return v_request_id;
end;
$$;

revoke all
on function public.submit_manufacturing_request(jsonb, jsonb)
from public;

grant execute
on function public.submit_manufacturing_request(jsonb, jsonb)
to anon, authenticated;
