-- Link sourcing_requests to a Supabase Auth user
alter table sourcing_requests
  add column if not exists auth_user_id uuid references auth.users(id) on delete set null;
create index if not exists sourcing_requests_auth_user_id_idx
  on sourcing_requests(auth_user_id);

-- 1:1 buyer profile linked to auth.users
create table if not exists buyer_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  name text,
  company text,
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table buyer_profiles enable row level security;

create policy "Users can view own profile" on buyer_profiles
  for select using (auth.uid() = id);
create policy "Users can update own profile" on buyer_profiles
  for update using (auth.uid() = id);
create policy "Users can insert own profile" on buyer_profiles
  for insert with check (auth.uid() = id);

-- Auto-create a buyer_profiles row whenever an auth user is created
-- (covers both self-registration and magic-link auto-invite)
create or replace function public.handle_new_buyer_user()
returns trigger as $$
begin
  insert into public.buyer_profiles (id, email, name, company)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'name',
    new.raw_user_meta_data->>'company'
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_buyer_user();
