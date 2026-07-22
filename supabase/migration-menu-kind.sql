-- Atualiza a tabela de itens já existente para separar pratos e bebidas.
alter table public.menu_items
  add column if not exists kind text not null default 'Prato';

alter table public.menu_items
  drop constraint if exists menu_items_kind_check;

alter table public.menu_items
  add constraint menu_items_kind_check check (kind in ('Prato', 'Bebida'));

insert into public.menu_items (name, kind, price) values
('Água', 'Bebida', 6.00),
('Água com gás', 'Bebida', 6.00),
('Coca 200ml', 'Bebida', 5.00),
('Coca lata', 'Bebida', 8.00),
('Coca 600', 'Bebida', 12.00),
('Suco Del Valle', 'Bebida', 8.00),
('Schweppes', 'Bebida', 8.00),
('Fanta laranja / uva', 'Bebida', 8.00),
('H2O', 'Bebida', 8.00),
('Tônica', 'Bebida', 8.00),
('Energético', 'Bebida', 8.00),
('Powerade', 'Bebida', 12.00),
('Gatorade', 'Bebida', 12.00),
('Laranja', 'Bebida', 12.00),
('Abacaxi', 'Bebida', 12.00),
('Manga', 'Bebida', 12.00),
('Acerola', 'Bebida', 12.00),
('Morango', 'Bebida', 12.00),
('Beterraba', 'Bebida', 18.00),
('Abacate', 'Bebida', 16.00),
('Banana', 'Bebida', 16.00),
('Heineken 600ml', 'Bebida', 20.00),
('Original 600ml', 'Bebida', 20.00),
('Amstel 600ml', 'Bebida', 17.00),
('Eisenbahn', 'Bebida', 17.00),
('Long neck', 'Bebida', 12.00),
('Caipirinha', 'Bebida', 15.00),
('Caipirinha vodka', 'Bebida', 20.00),
('Caporali', 'Bebida', 16.00),
('Gin tônica', 'Bebida', 15.00),
('Batida', 'Bebida', 20.00),
('Saquerinha', 'Bebida', 20.00)
on conflict (name) do nothing;
