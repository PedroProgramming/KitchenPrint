-- Mantem somente o administrador e preserva mesas/grupos.
-- Remove os registros operacionais e todos os usuarios garcom.

begin;

delete from public.print_jobs;
delete from public.consumption_logs;
delete from public.table_events;
delete from public.table_orders;
delete from public.service_sessions;
delete from public.sessions;
delete from public.table_group_users
where user_id in (select id from public.users where role = 'garcom');
delete from public.users where role = 'garcom';

update public.users
set name = 'Administrador',
    username = 'admin',
    password_hash = '$2b$10$fYcIp9S/Rxoo4cxTCrV6buTsQex5AbU.t.OV5EAAEHm45DdyWwfua',
    role = 'admin',
    area = null,
    tables_json = '[]'::jsonb
where username = 'admin';

commit;
