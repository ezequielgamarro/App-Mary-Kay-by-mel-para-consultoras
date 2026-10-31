-- Perfiles de las consultoras: una fila por usuaria de auth.users.
-- Incluye la auto-referencia `patrocinadora_id` (árbol de la red de directoras).
--
-- Modelo de acceso:
--   * Cada usuaria lee solo su perfil y puede cambiar únicamente `nombre`.
--   * `patrocinadora_id` NO lo escribe el cliente: lo asignará una función
--     controlada (fase 6, módulo Equipo) que además evite ciclos en el árbol.
--   * El perfil se crea solo, con un trigger al registrarse en Auth.
--   * Nadie sin sesión (anon) accede a la tabla.

-- Schema no expuesto a la Data API, para funciones internas.
create schema if not exists private;

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  nombre text not null default '' check (char_length(nombre) <= 120),
  patrocinadora_id uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_sin_auto_patrocinio check (patrocinadora_id is distinct from id)
);

-- Índice de la clave foránea: acelera el recorrido del árbol de la red.
create index profiles_patrocinadora_id_idx on public.profiles (patrocinadora_id);

-- Permisos mínimos para la Data API (desde 2026-10-30 no hay grants automáticos).
revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;
grant update (nombre) on public.profiles to authenticated;

alter table public.profiles enable row level security;

create policy profiles_select_propio on public.profiles
  for select to authenticated
  using ((select auth.uid()) = id);

create policy profiles_update_propio on public.profiles
  for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- updated_at automático (SECURITY INVOKER: no necesita privilegios especiales).
create function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function private.set_updated_at();

-- Alta automática del perfil al registrarse. SECURITY DEFINER porque Auth
-- inserta sin permisos sobre public.profiles; vive en `private`, con
-- search_path vacío y sin EXECUTE para ningún rol de la API.
-- `nombre` viene de user_metadata (editable por la usuaria): solo se usa para
-- mostrar, nunca para decidir permisos.
create function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, nombre)
  values (new.id, left(coalesce(new.raw_user_meta_data ->> 'nombre', ''), 120));
  return new;
end;
$$;

revoke execute on function private.handle_new_user() from public, anon, authenticated, service_role;
revoke execute on function private.set_updated_at() from public, anon, authenticated, service_role;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

-- Reversión (no se ejecuta; guardada por si hay que deshacer):
--   drop trigger if exists on_auth_user_created on auth.users;
--   drop table if exists public.profiles;
--   drop function if exists private.handle_new_user();
--   drop function if exists private.set_updated_at();
