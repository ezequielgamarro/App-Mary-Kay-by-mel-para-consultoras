-- Clientas de cada consultora.
--
-- Modelo de acceso:
--   * Cada consultora ve y modifica solo sus clientas (user_id = auth.uid()).
--   * `user_id` lo pone la base (default auth.uid()): el cliente no puede
--     escribirlo ni reasignar una clienta a otra usuaria.
--   * Las clientas nunca se exponen a la directora (no hay política para ella).
--   * Nadie sin sesión (anon) accede a la tabla.

create table public.clients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  nombre text not null check (char_length(btrim(nombre)) between 1 and 120),
  telefono text check (telefono is null or char_length(telefono) <= 30),
  cumpleanos date,
  notas text check (notas is null or char_length(notas) <= 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Cubre el filtro por dueña (RLS) y el orden alfabético de la lista.
create index clients_user_id_nombre_idx on public.clients (user_id, nombre);

-- Permisos mínimos para la Data API (desde 2026-10-30 no hay grants automáticos).
revoke all on public.clients from anon, authenticated;
grant select, delete on public.clients to authenticated;
grant insert (nombre, telefono, cumpleanos, notas) on public.clients to authenticated;
grant update (nombre, telefono, cumpleanos, notas) on public.clients to authenticated;

alter table public.clients enable row level security;

create policy clients_select_propias on public.clients
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy clients_insert_propias on public.clients
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy clients_update_propias on public.clients
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy clients_delete_propias on public.clients
  for delete to authenticated
  using ((select auth.uid()) = user_id);

create trigger clients_set_updated_at
  before update on public.clients
  for each row execute function private.set_updated_at();

-- Reversión (no se ejecuta; guardada por si hay que deshacer):
--   drop table if exists public.clients;
