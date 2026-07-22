-- Limpa somente pedidos, consumos e atendimentos das mesas.
-- Preserva usuarios, restaurant_tables, table_groups e atribuicoes.

begin;

delete from public.print_jobs;
delete from public.consumption_logs;
delete from public.table_events;
delete from public.table_orders;
delete from public.service_sessions;

commit;
