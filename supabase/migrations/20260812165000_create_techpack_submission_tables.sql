-- Baseline for fresh Supabase environments. Existing projects keep their
-- tables and are brought up to date by the following migration.
create table if not exists public.manufacturing_requests (
  id bigint generated always as identity primary key,
  company_name text,
  contact_person text,
  email text,
  phone text,
  country text,
  details jsonb default '{}'::jsonb,
  uploaded_files jsonb default '[]'::jsonb,
  status text default 'New',
  created_at timestamptz default now()
);

create table if not exists public.documents (
  id bigint generated always as identity primary key,
  request_id bigint,
  file_name text not null,
  file_path text not null,
  mime_type text,
  file_size integer,
  document_type text default 'client_file',
  created_at timestamptz default now()
);
