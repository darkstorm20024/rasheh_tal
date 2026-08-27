-- Run this in Supabase SQL Editor.
-- 1) Ensure the profile table can be linked to Supabase Auth.
alter table public.clients add column if not exists auth_user_id uuid unique;

-- 2) Optional but useful constraints/defaults.
alter table public.clients alter column credits_balance set default 0;

-- 3) Recommended: enable RLS. Vercel server uses service_role and remains able to access these tables.
alter table public.candidates enable row level security;
alter table public.clients enable row level security;
alter table public.contact_requests enable row level security;
alter table public.search_logs enable row level security;

-- Do not create public SELECT policies for candidates: phone, email, and CV URLs are private.
-- The Vercel API controls what data is returned to users.
