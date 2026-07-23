alter table public.service_sessions
add column if not exists closed_items_json jsonb not null default '[]'::jsonb;
