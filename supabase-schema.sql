-- Run in Supabase SQL Editor. Enable RLS and replace the policy stubs with your organisation's access rules before production.
create table if not exists clients (id bigint generated always as identity primary key, company_name text, contact_person text, email text not null unique, phone text, country text, website text, notes text, created_at timestamptz default now(), updated_at timestamptz default now());
create table if not exists samples (id bigint generated always as identity primary key, sample_name text not null, category text, description text, fabric text, color text, image_url text, status text default 'Draft', created_at timestamptz default now(), updated_at timestamptz default now());
create table if not exists requests (id bigint generated always as identity primary key, request_number text unique default ('EAMA-' || to_char(now(),'YYYYMMDD') || '-' || upper(substr(md5(random()::text),1,6))), client_id bigint references clients(id), request_type text not null check (request_type in ('MANUFACTURING_INQUIRY','DESIGN_SUBMISSION','FACTORY_VISIT','GENERAL_INQUIRY')), status text not null, priority text default 'normal', assigned_admin_id uuid references auth.users(id), selected_sample_id bigint references samples(id), details jsonb not null default '{}', internal_notes text, preferred_visit_at timestamptz, created_at timestamptz default now(), updated_at timestamptz default now());
create table if not exists documents (id bigint generated always as identity primary key, request_id bigint references requests(id) on delete cascade, client_id bigint references clients(id), uploaded_by uuid references auth.users(id), file_name text not null, file_path text not null, mime_type text, file_size integer, document_type text default 'client_file', created_at timestamptz default now());
create table if not exists request_messages (id bigint generated always as identity primary key, request_id bigint not null references requests(id) on delete cascade, sender_user_id uuid references auth.users(id), sender_type text not null, message text not null, created_at timestamptz default now());
create table if not exists factory_slots (id bigint generated always as identity primary key, starts_at timestamptz not null unique, ends_at timestamptz, capacity integer default 1, status text default 'available', created_at timestamptz default now());
create table if not exists design_submissions (id bigint generated always as identity primary key, company_name text, contact_person text, email text, phone text, country text, garment_category text, product_type text, number_of_styles text, target_quantity text, preferred_fabric text, fabric_gsm text, color_requirements text, additional_material_requirements text, customization_requirements text, packaging_requirements text, production_timeline text, additional_notes text, uploaded_files jsonb default '[]', status text default 'New', admin_notes text, created_at timestamptz default now());
create table if not exists manufacturing_requests (id bigint generated always as identity primary key, company_name text, contact_person text, email text, phone text, country text, details jsonb default '{}', uploaded_files jsonb default '[]', status text default 'New', created_at timestamptz default now());
create table if not exists factory_visits (id bigint generated always as identity primary key, company text, visitor_name text, email text, phone text, country text, visit_date text, visit_time text, visitor_count text, purpose text, message text, status text default 'New', created_at timestamptz default now());
create table if not exists contact_messages (id bigint generated always as identity primary key, name text, company text, email text, phone text, country text, message text, status text default 'New', created_at timestamptz default now());
create table if not exists cms_content (id bigint generated always as identity primary key, content_key text unique not null, content_value jsonb not null default '{}', published_at timestamptz, updated_at timestamptz default now());
insert into storage.buckets (id,name,public) values ('eama-files','eama-files',false) on conflict do nothing;
insert into storage.buckets (id,name,public) values ('sample-images','sample-images',true) on conflict do nothing;

alter table clients add column if not exists notes text;

create or replace function public.ensure_client_from_submission(p_email text, p_company_name text, p_contact_person text, p_phone text, p_country text)
returns bigint language plpgsql as $$
declare
  v_client_id bigint;
begin
  insert into public.clients (company_name, contact_person, email, phone, country)
  values (p_company_name, p_contact_person, p_email, p_phone, p_country)
  on conflict (email) do update set company_name = excluded.company_name, contact_person = excluded.contact_person, phone = excluded.phone, country = excluded.country
  returning id into v_client_id;
  return v_client_id;
end;
$$;

alter table clients enable row level security;
alter table samples enable row level security;
alter table requests enable row level security;
alter table design_submissions enable row level security;
alter table manufacturing_requests enable row level security;
alter table factory_visits enable row level security;
alter table contact_messages enable row level security;
alter table cms_content enable row level security;

create policy if not exists "public can insert submissions" on public.design_submissions for insert to anon with check (true);
create policy if not exists "public can insert manufacturing requests" on public.manufacturing_requests for insert to anon with check (true);
create policy if not exists "public can insert factory visits" on public.factory_visits for insert to anon with check (true);
create policy if not exists "public can insert contact messages" on public.contact_messages for insert to anon with check (true);
create policy if not exists "public can insert clients" on public.clients for insert to anon with check (true);
create policy if not exists "public can not read submissions" on public.design_submissions for select to anon using (false);
create policy if not exists "public can not read manufacturing requests" on public.manufacturing_requests for select to anon using (false);
create policy if not exists "public can not read factory visits" on public.factory_visits for select to anon using (false);
create policy if not exists "public can not read contact messages" on public.contact_messages for select to anon using (false);
create policy if not exists "public can not read clients" on public.clients for select to anon using (false);
create policy if not exists "admin full access" on public.design_submissions for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy if not exists "admin full access samples" on public.samples for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy if not exists "admin full access clients" on public.clients for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy if not exists "admin full access cms" on public.cms_content for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
