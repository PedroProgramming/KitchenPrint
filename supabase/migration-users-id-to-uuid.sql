-- Migra users.id de bigint para UUID preservando os registros existentes.
-- Faça um backup do projeto antes de executar.
-- Execute este arquivo antes de migration-tables-groups.sql.

begin;

alter table public.users add column if not exists id_uuid uuid default gen_random_uuid();
update public.users set id_uuid = gen_random_uuid() where id_uuid is null;
alter table public.users alter column id_uuid set not null;

alter table public.sessions add column if not exists user_id_uuid uuid;
update public.sessions s set user_id_uuid = u.id_uuid from public.users u where u.id = s.user_id;
alter table public.table_orders add column if not exists opened_by_uuid uuid;
update public.table_orders t set opened_by_uuid = u.id_uuid from public.users u where u.id = t.opened_by;
alter table public.table_events add column if not exists user_id_uuid uuid;
update public.table_events e set user_id_uuid = u.id_uuid from public.users u where u.id = e.user_id;
alter table public.service_sessions add column if not exists opened_by_uuid uuid;
alter table public.service_sessions add column if not exists released_by_uuid uuid;
update public.service_sessions s set opened_by_uuid = u.id_uuid from public.users u where u.id = s.opened_by;
update public.service_sessions s set released_by_uuid = u.id_uuid from public.users u where u.id = s.released_by;
alter table public.consumption_logs add column if not exists user_id_uuid uuid;
update public.consumption_logs l set user_id_uuid = u.id_uuid from public.users u where u.id = l.user_id;

alter table public.sessions drop constraint if exists sessions_user_id_fkey;
alter table public.table_orders drop constraint if exists table_orders_opened_by_fkey;
alter table public.table_events drop constraint if exists table_events_user_id_fkey;
alter table public.service_sessions drop constraint if exists service_sessions_opened_by_fkey;
alter table public.service_sessions drop constraint if exists service_sessions_released_by_fkey;
alter table public.consumption_logs drop constraint if exists consumption_logs_user_id_fkey;

alter table public.sessions drop column user_id;
alter table public.sessions rename column user_id_uuid to user_id;
alter table public.table_orders drop column opened_by;
alter table public.table_orders rename column opened_by_uuid to opened_by;
alter table public.table_events drop column user_id;
alter table public.table_events rename column user_id_uuid to user_id;
alter table public.service_sessions drop column opened_by;
alter table public.service_sessions rename column opened_by_uuid to opened_by;
alter table public.service_sessions drop column released_by;
alter table public.service_sessions rename column released_by_uuid to released_by;
alter table public.consumption_logs drop column user_id;
alter table public.consumption_logs rename column user_id_uuid to user_id;

alter table public.users drop constraint if exists users_pkey;
alter table public.users drop column id;
alter table public.users rename column id_uuid to id;
alter table public.users add primary key (id);

alter table public.sessions add constraint sessions_user_id_fkey foreign key (user_id) references public.users(id) on delete cascade;
alter table public.table_orders add constraint table_orders_opened_by_fkey foreign key (opened_by) references public.users(id);
alter table public.table_events add constraint table_events_user_id_fkey foreign key (user_id) references public.users(id);
alter table public.service_sessions add constraint service_sessions_opened_by_fkey foreign key (opened_by) references public.users(id);
alter table public.service_sessions add constraint service_sessions_released_by_fkey foreign key (released_by) references public.users(id);
alter table public.consumption_logs add constraint consumption_logs_user_id_fkey foreign key (user_id) references public.users(id);

commit;
