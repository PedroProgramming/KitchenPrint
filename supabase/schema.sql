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
create table if not exists public.shopping_list_items (id uuid primary key default gen_random_uuid(), target text not null check (target in ('cozinha','salao','copa')), name text not null, quantity numeric(12,3) not null check (quantity > 0), unit text not null, priority text not null default 'normal' check (priority in ('normal','urgente')), note text not null default '', status text not null default 'pendente' check (status in ('pendente','comprado','cancelado')), requested_by uuid not null references public.users(id), resolved_by uuid references public.users(id), created_at timestamptz not null default now(), resolved_at timestamptz);
create table if not exists public.cash_registers (id uuid primary key default gen_random_uuid(), business_date date not null unique, opening_amount numeric(12,2) not null default 0 check (opening_amount >= 0), closing_amount numeric(12,2) check (closing_amount >= 0), expected_amount numeric(12,2), opened_by uuid not null references public.users(id), closed_by uuid references public.users(id), opened_at timestamptz not null default now(), closed_at timestamptz, notes text not null default '', created_at timestamptz not null default now(), check ((closed_at is null and closed_by is null and closing_amount is null) or (closed_at is not null and closed_by is not null and closing_amount is not null)));
create table if not exists public.finance_entries (id uuid primary key default gen_random_uuid(), cash_register_id uuid references public.cash_registers(id) on delete set null, entry_date date not null, type text not null check (type in ('receita','despesa')), category text not null, description text not null, amount numeric(12,2) not null check (amount > 0), payment_method text not null check (payment_method in ('dinheiro','pix','cartao','boleto','outro')), status text not null default 'pago' check (status in ('pago','pendente','cancelado')), due_date date, paid_at timestamptz, supplier text not null default '', document_number text not null default '', document_note text not null default '', proof_image_name text not null default '', proof_image_data_url text not null default '', proof_images_json jsonb not null default '[]'::jsonb, installment_group_id uuid, installment_number integer not null default 1 check (installment_number > 0), installment_total integer not null default 1 check (installment_total > 0), installment_interval_days integer not null default 0 check (installment_interval_days >= 0), original_due_date date, due_date_adjusted boolean not null default false, created_by uuid not null references public.users(id), created_at timestamptz not null default now());
alter table public.finance_entries add column if not exists proof_images_json jsonb not null default '[]'::jsonb;
create table if not exists public.finance_categories (id uuid primary key default gen_random_uuid(), name text not null unique, created_at timestamptz not null default now());
create index if not exists cash_registers_business_date_idx on public.cash_registers (business_date desc);
create index if not exists finance_entries_entry_date_idx on public.finance_entries (entry_date desc);
create index if not exists finance_entries_status_due_idx on public.finance_entries (status, due_date);
create index if not exists finance_entries_entry_created_idx on public.finance_entries (entry_date desc, created_at desc);
create index if not exists finance_entries_cash_register_idx on public.finance_entries (cash_register_id);
create index if not exists finance_entries_open_payables_idx on public.finance_entries (due_date, entry_date) where type = 'despesa' and status = 'pendente';
create index if not exists shopping_list_items_status_priority_created_idx on public.shopping_list_items (status, priority desc, created_at desc);
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
alter table public.shopping_list_items enable row level security;
alter table public.cash_registers enable row level security;
alter table public.finance_entries enable row level security;
alter table public.finance_categories enable row level security;
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
