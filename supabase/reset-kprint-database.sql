-- ATENCAO: apaga todos os dados do KPrint.
-- Nao remove usuarios do sistema de autenticacao do Supabase.
-- Execute este arquivo uma vez e depois execute schema.sql.

begin;

drop table if exists public.table_group_users cascade;
drop table if exists public.print_jobs cascade;
drop table if exists public.table_group_tables cascade;
drop table if exists public.table_groups cascade;
drop table if exists public.restaurant_tables cascade;
drop table if exists public.consumption_logs cascade;
drop table if exists public.table_events cascade;
drop table if exists public.table_orders cascade;
drop table if exists public.service_sessions cascade;
drop table if exists public.sessions cascade;
drop table if exists public.users cascade;

commit;
