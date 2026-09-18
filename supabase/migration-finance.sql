  create table if not exists public.cash_registers (
    id uuid primary key default gen_random_uuid(),
    business_date date not null unique,
    opening_amount numeric(12,2) not null default 0 check (opening_amount >= 0),
    closing_amount numeric(12,2) check (closing_amount >= 0),
    expected_amount numeric(12,2),
    opened_by uuid not null references public.users(id),
    closed_by uuid references public.users(id),
    opened_at timestamptz not null default now(),
    closed_at timestamptz,
    notes text not null default '',
    created_at timestamptz not null default now(),
    check ((closed_at is null and closed_by is null and closing_amount is null) or (closed_at is not null and closed_by is not null and closing_amount is not null))
  );

  create table if not exists public.finance_entries (
    id uuid primary key default gen_random_uuid(),
    cash_register_id uuid references public.cash_registers(id) on delete set null,
    entry_date date not null,
    type text not null check (type in ('receita','despesa')),
    category text not null,
    description text not null,
    amount numeric(12,2) not null check (amount > 0),
    payment_method text not null check (payment_method in ('dinheiro','pix','cartao','boleto','outro')),
    status text not null default 'pago' check (status in ('pago','pendente','cancelado')),
    due_date date,
    paid_at timestamptz,
    supplier text not null default '',
    document_number text not null default '',
    document_note text not null default '',
    proof_image_name text not null default '',
    proof_image_data_url text not null default '',
    proof_images_json jsonb not null default '[]'::jsonb,
    installment_group_id uuid,
    installment_number integer not null default 1 check (installment_number > 0),
    installment_total integer not null default 1 check (installment_total > 0),
    installment_interval_days integer not null default 0 check (installment_interval_days >= 0),
    original_due_date date,
    due_date_adjusted boolean not null default false,
    created_by uuid not null references public.users(id),
    created_at timestamptz not null default now()
  );

  create table if not exists public.finance_categories (
    id uuid primary key default gen_random_uuid(),
    name text not null unique,
    created_at timestamptz not null default now()
  );

  alter table public.finance_entries add column if not exists proof_image_name text not null default '';
  alter table public.finance_entries add column if not exists proof_image_data_url text not null default '';
  alter table public.finance_entries add column if not exists proof_images_json jsonb not null default '[]'::jsonb;
  alter table public.finance_entries add column if not exists installment_group_id uuid;
  alter table public.finance_entries add column if not exists installment_number integer not null default 1 check (installment_number > 0);
  alter table public.finance_entries add column if not exists installment_total integer not null default 1 check (installment_total > 0);
  alter table public.finance_entries add column if not exists installment_interval_days integer not null default 0 check (installment_interval_days >= 0);
  alter table public.finance_entries add column if not exists original_due_date date;
  alter table public.finance_entries add column if not exists due_date_adjusted boolean not null default false;

create index if not exists cash_registers_business_date_idx on public.cash_registers (business_date desc);
create index if not exists finance_entries_entry_date_idx on public.finance_entries (entry_date desc);
create index if not exists finance_entries_status_due_idx on public.finance_entries (status, due_date);
create index if not exists finance_entries_entry_created_idx on public.finance_entries (entry_date desc, created_at desc);
create index if not exists finance_entries_cash_register_idx on public.finance_entries (cash_register_id);
create index if not exists finance_entries_open_payables_idx on public.finance_entries (due_date, entry_date) where type = 'despesa' and status = 'pendente';

alter table public.cash_registers enable row level security;
  alter table public.finance_entries enable row level security;
  alter table public.finance_categories enable row level security;
