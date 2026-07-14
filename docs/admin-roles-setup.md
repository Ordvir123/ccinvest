# Admin Role Setup (one-time SQL)

The AI editor endpoints (`extract-page`, `edit-page`) now require the
signed-in user to be an ADMIN, so any signed-up user cannot burn AI credits.

Admin membership is stored in `public.user_roles` and checked via the
`public.has_role(uuid, app_role)` RPC. Both must exist for the AI editor
buttons to work.

## Apply once in the Supabase SQL editor

Open the Supabase dashboard → SQL editor → New query, paste the block below,
and run it.

```sql
do $$
begin
  if not exists (select 1 from pg_type where typname = 'app_role') then
    create type public.app_role as enum ('admin');
  end if;
end$$;

create table if not exists public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role public.app_role not null,
  unique (user_id, role)
);

grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;

alter table public.user_roles enable row level security;

drop policy if exists "users read own roles" on public.user_roles;
create policy "users read own roles" on public.user_roles
  for select to authenticated using (auth.uid() = user_id);

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = _user_id and role = _role
  );
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_role(auth.uid(), 'admin'::public.app_role);
$$;

grant execute on function public.has_role(uuid, public.app_role)
  to anon, authenticated, service_role;
grant execute on function public.is_admin()
  to anon, authenticated, service_role;

-- Seed: promote every existing auth user (they already had admin login access)
-- to preserve behaviour. Future users need an explicit grant.
insert into public.user_roles (user_id, role)
  select id, 'admin'::public.app_role from auth.users
on conflict do nothing;
```

## Adding a new admin later

```sql
insert into public.user_roles (user_id, role)
values ('<uuid-from-auth.users>', 'admin')
on conflict do nothing;
```
