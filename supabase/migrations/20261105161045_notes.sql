-- Notas libres de la consultora (ideas, recordatorios, datos de clientas o de la empresa).
--
-- Modelo de acceso: igual que `tasks` y `expenses`.
--   * Cada consultora ve y modifica solo lo suyo (user_id = auth.uid()).
--   * `user_id` lo pone la base (default auth.uid()): el cliente no puede escribirlo.
--   * La directora no ve las notas: no existe ningún camino de lectura compartida.

create table public.notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  titulo text not null check (char_length(btrim(titulo)) between 1 and 120),
  contenido text not null default '' check (char_length(contenido) <= 10000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- La lista muestra primero lo último que se tocó.
create index notes_user_id_updated_at_idx on public.notes (user_id, updated_at desc);

revoke all on public.notes from anon, authenticated;
grant select, delete on public.notes to authenticated;
grant insert (titulo, contenido) on public.notes to authenticated;
grant update (titulo, contenido) on public.notes to authenticated;

alter table public.notes enable row level security;

create policy notes_select_propias on public.notes
  for select to authenticated using ((select auth.uid()) = user_id);
create policy notes_insert_propias on public.notes
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy notes_update_propias on public.notes
  for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy notes_delete_propias on public.notes
  for delete to authenticated using ((select auth.uid()) = user_id);

create trigger notes_set_updated_at
  before update on public.notes
  for each row execute function private.set_updated_at();

-- Reversión (no se ejecuta; guardada por si hay que deshacer):
--   drop table if exists public.notes;
