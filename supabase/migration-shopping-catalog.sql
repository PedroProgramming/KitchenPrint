-- Catálogo de itens selecionáveis da lista de compras.
create table if not exists public.shopping_catalog_items (
  id uuid primary key default gen_random_uuid(),
  target text not null check (target in ('cozinha','salao','copa')),
  category text not null,
  name text not null,
  default_unit text not null default 'un',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (target, category, name)
);

alter table public.shopping_catalog_items enable row level security;

insert into public.shopping_catalog_items (target, category, name, default_unit) values
('cozinha','Mercearia','Arroz','kg'), ('cozinha','Mercearia','Feijão','kg'), ('cozinha','Mercearia','Óleo','L'), ('cozinha','Mercearia','Sal','kg'), ('cozinha','Mercearia','Açúcar','kg'), ('cozinha','Mercearia','Farinha de trigo','kg'),
('cozinha','Hortifruti','Tomate','kg'), ('cozinha','Hortifruti','Cebola','kg'), ('cozinha','Hortifruti','Alho','kg'),
('cozinha','Limpeza','Detergente','un'), ('cozinha','Limpeza','Esponja','un'), ('cozinha','Limpeza','Papel toalha','pct'),
('salao','Viagem','Sacola pequena','pct'), ('salao','Viagem','Sacola grande','pct'), ('salao','Viagem','Embalagem para viagem','pct'),
('salao','Atendimento','Guardanapo','pct'), ('salao','Atendimento','Canudo','pct'), ('salao','Atendimento','Copo descartável','pct'), ('salao','Atendimento','Bobina para máquina','un'),
('salao','Higiene','Álcool','L'), ('salao','Higiene','Papel toalha','pct'), ('salao','Higiene','Luva descartável','cx'),
('copa','Bebidas','Café','pct'), ('copa','Bebidas','Açúcar','kg'), ('copa','Bebidas','Leite','L'), ('copa','Bebidas','Água','fardo'), ('copa','Bebidas','Gelo','kg'),
('copa','Descartáveis','Copo descartável','pct'), ('copa','Descartáveis','Guardanapo','pct'),
('copa','Limpeza','Detergente','un'), ('copa','Limpeza','Esponja','un')
on conflict (target, category, name) do nothing;
