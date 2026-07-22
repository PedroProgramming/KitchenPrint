-- Execute no Supabase SQL Editor para uma instalação que já possui o schema.
-- Esta migração não altera dados legados nem converte uma coluna id já criada
-- como integer: nesse caso, faça a migração dos relacionamentos antes de trocar
-- o tipo da coluna.
create extension if not exists pgcrypto;

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

drop trigger if exists users_hash_password on public.users;
create trigger users_hash_password
before insert or update of password_hash on public.users
for each row execute function public.hash_user_password();

-- Confirma que os novos registros receberão UUID automaticamente.
alter table public.users
  alter column id set default gen_random_uuid();
