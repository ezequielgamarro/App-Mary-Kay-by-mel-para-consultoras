-- Gastos de la consultora (transporte, publicidad, mercadería, etc.).
--
-- Modelo de acceso: igual que `tasks`.
--   * Cada consultora ve y modifica solo lo suyo (user_id = auth.uid()).
--   * `user_id` lo pone la base (default auth.uid()): el cliente no puede escribirlo.
--
-- Dinero en centavos enteros (bigint).

create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  fecha date not null default ((now() at time zone 'America/Argentina/Buenos_Aires')::date),
  concepto text not null check (char_length(btrim(concepto)) between 1 and 200),
  categoria text not null default 'otros'
    check (categoria in ('mercaderia', 'transporte', 'publicidad', 'otros')),
  monto_centavos bigint not null check (monto_centavos between 1 and 1000000000000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index expenses_user_id_fecha_idx on public.expenses (user_id, fecha desc);

revoke all on public.expenses from anon, authenticated;
grant select, delete on public.expenses to authenticated;
grant insert (fecha, concepto, categoria, monto_centavos) on public.expenses to authenticated;
grant update (fecha, concepto, categoria, monto_centavos) on public.expenses to authenticated;

alter table public.expenses enable row level security;

create policy expenses_select_propios on public.expenses
  for select to authenticated using ((select auth.uid()) = user_id);
create policy expenses_insert_propios on public.expenses
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy expenses_update_propios on public.expenses
  for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy expenses_delete_propios on public.expenses
  for delete to authenticated using ((select auth.uid()) = user_id);

create trigger expenses_set_updated_at
  before update on public.expenses
  for each row execute function private.set_updated_at();

-- Reversión (no se ejecuta; guardada por si hay que deshacer):
--   drop table if exists public.expenses;
