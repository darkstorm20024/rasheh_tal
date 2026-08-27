create table if not exists public.site_content (id integer primary key, content jsonb not null default '{}'::jsonb, updated_at timestamptz not null default now());
insert into public.site_content (id, content) values (1, '{}'::jsonb) on conflict (id) do nothing;
alter table public.site_content enable row level security;
