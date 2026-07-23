create extension if not exists pgcrypto;

-- Mantém a senha protegida mesmo quando alguém insere um usuário diretamente
-- pelo SQL Editor/Table Editor. A aplicação também gera bcrypt antes do insert;
-- o gatilho abaixo evita hash duplo nesses casos.
create or replace function public.hash_user_password()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  if new.password_hash is null or new.password_hash = '' then
    raise exception 'password_hash não pode ser vazio';
  end if;

  if new.password_hash !~ '^\$2[aby]\$' then
    new.password_hash := crypt(new.password_hash, gen_salt('bf', 10));
  end if;

  return new;
end;
$$;

create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  username text not null unique,
  password_hash text not null,
  role text not null check (role in ('admin','garcom')),
  area text check (area in ('salao','copa')),
  tables_json jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

-- Cadastro permanente das mesas. O numero e o identificador operacional exibido na tela;
-- o id UUID e a chave estavel para futuras referencias.
create table if not exists public.restaurant_tables (
  id uuid primary key default gen_random_uuid(),
  number integer not null unique check (number > 0),
  name text not null default '',
  area text not null check (area in ('salao','copa')),
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create table if not exists public.menu_items (id uuid primary key default gen_random_uuid(), name text not null unique, kind text not null default 'Prato' check (kind in ('Prato','Bebida')), price numeric(10,2) not null default 0, active boolean not null default true, created_at timestamptz not null default now());

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

drop trigger if exists users_hash_password on public.users;
create trigger users_hash_password
before insert or update of password_hash on public.users
for each row execute function public.hash_user_password();
create table if not exists public.sessions (token text primary key, user_id uuid not null references public.users(id) on delete cascade, expires_at bigint not null);
create table if not exists public.table_orders (table_number integer primary key, items_json jsonb not null, opened_by uuid references public.users(id), opened_at timestamptz not null default now());
create table if not exists public.table_events (id uuid primary key default gen_random_uuid(), table_number integer not null, user_id uuid not null references public.users(id), action text not null, created_at timestamptz not null default now());
create table if not exists public.service_sessions (id uuid primary key default gen_random_uuid(), table_number integer not null, opened_by uuid not null references public.users(id), released_by uuid references public.users(id), area text check (area in ('salao','copa')), opened_at timestamptz not null default now(), released_at timestamptz, closed_items_json jsonb not null default '[]'::jsonb);
create table if not exists public.consumption_logs (id uuid primary key default gen_random_uuid(), session_id uuid not null references public.service_sessions(id) on delete cascade, table_number integer not null, user_id uuid not null references public.users(id), items_json jsonb not null, created_at timestamptz not null default now());
create table if not exists public.print_jobs (id uuid primary key default gen_random_uuid(), table_number integer not null, payload text not null, status text not null default 'pending' check (status in ('pending','processing','printed','error')), attempts integer not null default 0, error_message text, created_at timestamptz not null default now(), printed_at timestamptz);
alter table public.users enable row level security;
alter table public.restaurant_tables enable row level security;
alter table public.table_groups enable row level security;
alter table public.table_group_tables enable row level security;
alter table public.table_group_users enable row level security;
alter table public.sessions enable row level security;
alter table public.table_orders enable row level security;
alter table public.table_events enable row level security;
alter table public.service_sessions enable row level security;
alter table public.consumption_logs enable row level security;
alter table public.print_jobs enable row level security;

insert into public.users (name, username, password_hash, role)
values ('Administrador', 'admin', '$2b$10$fYcIp9S/Rxoo4cxTCrV6buTsQex5AbU.t.OV5EAAEHm45DdyWwfua', 'admin')
on conflict (username) do update
set name = excluded.name,
    password_hash = excluded.password_hash,
    role = excluded.role,
    area = null,
    tables_json = '[]'::jsonb;

insert into public.restaurant_tables (number, name, area)
select number, 'Mesa ' || number, case when number >= 20 then 'copa' else 'salao' end
from generate_series(1, 28) as number
on conflict (number) do nothing;
