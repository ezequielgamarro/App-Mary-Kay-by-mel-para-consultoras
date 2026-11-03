-- Productos y stock de cada consultora (catálogo propio: no hay catálogo oficial).
--
-- Modelo de acceso: igual que `clients`.
--   * Cada consultora ve y modifica solo sus productos (user_id = auth.uid()).
--   * `user_id` lo pone la base (default auth.uid()); el cliente no puede escribirlo.
--   * Nadie sin sesión (anon) accede a la tabla.
--
-- Dinero en centavos enteros (bigint), nunca decimales. `stock` es la existencia
-- actual; cuando exista el módulo de ventas lo descontará una función controlada.

create table public.products (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  nombre text not null check (char_length(btrim(nombre)) between 1 and 120),
  codigo text check (codigo is null or char_length(btrim(codigo)) between 1 and 40),
  costo_centavos bigint not null default 0 check (costo_centavos between 0 and 100000000000),
  precio_centavos bigint not null default 0 check (precio_centavos between 0 and 100000000000),
  stock integer not null default 0 check (stock between 0 and 1000000),
  stock_minimo integer not null default 0 check (stock_minimo between 0 and 1000000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Orden alfabético de la lista y filtro por dueña (RLS).
create index products_user_id_nombre_idx on public.products (user_id, nombre);

-- Un código no se repite dentro del catálogo de la misma consultora (otra consultora sí puede usarlo).
create unique index products_user_id_codigo_key on public.products (user_id, codigo)
  where codigo is not null;

-- Permisos mínimos para la Data API (desde 2026-10-30 no hay grants automáticos).
revoke all on public.products from anon, authenticated;
grant select, delete on public.products to authenticated;
grant insert (nombre, codigo, costo_centavos, precio_centavos, stock, stock_minimo)
  on public.products to authenticated;
grant update (nombre, codigo, costo_centavos, precio_centavos, stock, stock_minimo)
  on public.products to authenticated;

alter table public.products enable row level security;

create policy products_select_propios on public.products
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy products_insert_propios on public.products
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy products_update_propios on public.products
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy products_delete_propios on public.products
  for delete to authenticated
  using ((select auth.uid()) = user_id);

create trigger products_set_updated_at
  before update on public.products
  for each row execute function private.set_updated_at();

-- Reversión (no se ejecuta; guardada por si hay que deshacer):
--   drop table if exists public.products;
