-- Execute este arquivo uma vez no Supabase SQL Editor.
-- Pode ser executado novamente sem duplicar mesas ou grupos.

create extension if not exists pgcrypto;

create table if not exists public.restaurant_tables (
  id uuid primary key default gen_random_uuid(),
  number integer not null unique check (number > 0),
  name text not null default '',
  area text not null check (area in ('salao','copa')),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.table_groups (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  area text not null check (area in ('salao','copa')),
  created_at timestamptz not null default now()
);

create table if not exists public.table_group_tables (
  group_id uuid not null references public.table_groups(id) on delete cascade,
  table_id uuid not null references public.restaurant_tables(id) on delete cascade,
  primary key (group_id, table_id),
  unique (table_id)
);

create table if not exists public.table_group_users (
  group_id uuid not null references public.table_groups(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  primary key (group_id, user_id)
);

alter table public.restaurant_tables enable row level security;
alter table public.table_groups enable row level security;
alter table public.table_group_tables enable row level security;
alter table public.table_group_users enable row level security;

insert into public.restaurant_tables (number, name, area)
select number, 'Mesa ' || number,
       case when number >= 20 then 'copa' else 'salao' end
from generate_series(1, 28) as number
on conflict (number) do nothing;

insert into public.table_groups (name, area)
values ('Salão', 'salao'), ('Copa', 'copa')
on conflict (name) do nothing;

insert into public.table_group_tables (group_id, table_id)
select g.id, t.id
from public.table_groups g
join public.restaurant_tables t on t.area = g.area
where g.name in ('Salão', 'Copa')
on conflict (table_id) do nothing;
