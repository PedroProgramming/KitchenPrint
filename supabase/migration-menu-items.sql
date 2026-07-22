create table if not exists public.menu_items (id uuid primary key default gen_random_uuid(), name text not null unique, price numeric(10,2) not null default 0, active boolean not null default true, created_at timestamptz not null default now());
alter table public.menu_items add column if not exists kind text not null default 'Prato';
alter table public.menu_items drop constraint if exists menu_items_kind_check;
alter table public.menu_items add constraint menu_items_kind_check check (kind in ('Prato','Bebida'));

insert into public.menu_items (name, price) values
('Virada à paulista', 35.90), ('Escondidinho', 32.90), ('Panqueca', 28.90), ('Picadinho', 30.90), ('Feijoada', 36.90), ('Filé de frango com creme de milho', 34.90), ('Nhoque', 35.90), ('Frango assado', 29.90), ('Filé de peixe com molho de camarão', 36.90),
('Filé de frango grelhado', 26.90), ('Filé de frango à milanesa', 28.90), ('Filé de frango à parmegiana', 35.90), ('Calabresa acebolada', 25.90), ('Bisteca acebolada', 26.90), ('Fígado acebolado', 26.90), ('Omelete', 29.90), ('Tilápia grelhada', 38.90), ('Carne assada', 32.90), ('Contra filé à parmegiana', 45.90), ('Contra filé grelhado', 36.90), ('Contra filé à milanesa', 38.90), ('Picanha gaúcha', 58.00), ('Filé mignon', 54.00), ('Filé mignon à milanesa', 56.90), ('Filé mignon à parmegiana', 64.90), ('Paella', 68.00), ('Arroz internacional', 65.00), ('Salmão', 62.90)
on conflict (name) do nothing;

insert into public.menu_items (name, kind, price) values
('Água', 'Bebida', 6.00), ('Água com gás', 'Bebida', 6.00), ('Coca 200ml', 'Bebida', 5.00), ('Coca lata', 'Bebida', 8.00), ('Coca 600', 'Bebida', 12.00), ('Suco Del Valle', 'Bebida', 8.00), ('Schweppes', 'Bebida', 8.00), ('Fanta laranja / uva', 'Bebida', 8.00), ('H2O', 'Bebida', 8.00), ('Tônica', 'Bebida', 8.00), ('Energético', 'Bebida', 8.00), ('Powerade', 'Bebida', 12.00), ('Gatorade', 'Bebida', 12.00),
('Laranja', 'Bebida', 12.00), ('Abacaxi', 'Bebida', 12.00), ('Manga', 'Bebida', 12.00), ('Acerola', 'Bebida', 12.00), ('Morango', 'Bebida', 12.00), ('Vitamina de mamão, laranja, maçã e beterraba', 'Bebida', 0.00), ('Beterraba', 'Bebida', 18.00), ('Abacate', 'Bebida', 16.00), ('Banana', 'Bebida', 16.00),
('Heineken 600ml', 'Bebida', 20.00), ('Original 600ml', 'Bebida', 20.00), ('Amstel 600ml', 'Bebida', 17.00), ('Eisenbahn', 'Bebida', 17.00), ('Long neck', 'Bebida', 12.00), ('Caipirinha', 'Bebida', 15.00), ('Caipirinha vodka', 'Bebida', 20.00), ('Caporali', 'Bebida', 16.00), ('Gin tônica', 'Bebida', 15.00), ('Batida', 'Bebida', 20.00), ('Saquerinha', 'Bebida', 20.00)
on conflict (name) do nothing;
