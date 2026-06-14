-- Link supplier_offerings to a Supabase Auth user (one login per company)
alter table supplier_offerings
  add column if not exists auth_user_id uuid references auth.users(id) on delete set null;
create index if not exists supplier_offerings_auth_user_id_idx
  on supplier_offerings(auth_user_id);

-- 1:1 supplier portal profile linked to auth.users
create table if not exists supplier_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  name text,
  phone text,
  supplier_id uuid references supplier_offerings(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table supplier_profiles enable row level security;

create policy "Suppliers can view own profile" on supplier_profiles
  for select using (auth.uid() = id);
create policy "Suppliers can update own profile" on supplier_profiles
  for update using (auth.uid() = id);
create policy "Suppliers can insert own profile" on supplier_profiles
  for insert with check (auth.uid() = id);

-- Auto-create a supplier_profiles row whenever an auth user is created.
-- Named distinctly from the buyer portal's on_auth_user_created trigger so
-- both run independently (every signup gets a row in both profile tables —
-- harmless, avoids cross-coordination between the two features).
create or replace function public.handle_new_supplier_portal_user()
returns trigger as $$
begin
  insert into public.supplier_profiles (id, email, name, supplier_id)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'name',
    (new.raw_user_meta_data->>'supplier_id')::uuid
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists on_auth_user_created_supplier_portal on auth.users;
create trigger on_auth_user_created_supplier_portal
  after insert on auth.users
  for each row execute function public.handle_new_supplier_portal_user();
