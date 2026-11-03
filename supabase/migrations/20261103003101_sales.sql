-- Ventas con cuenta corriente: ventas, productos vendidos y pagos parciales.
--
-- Modelo de acceso:
--   * Cada consultora ve solo lo suyo (user_id = auth.uid()); no hay política para la directora.
--   * `user_id` lo pone la base. El cliente NO puede escribir totales, pagado, saldo,
--     nombre ni costo: los calculan triggers (funciones en el schema `private`, sin
--     EXECUTE para roles de la API).
--   * Las ventas no se borran: se anulan (estado = 'anulada'), lo que devuelve el stock.
--   * Los productos vendidos no se editan ni borran: una venta se corrige anulándola.
--
-- Reglas que garantiza la base (códigos propios para que la app muestre mensajes claros):
--   BG001  stock insuficiente                BG004  venta, producto o clienta no encontrados
--   BG002  la venta no tiene productos       BG005  el pago supera el saldo / venta no activa
--   BG003  saldo pendiente sin clienta       BG006  venta anulada: no se puede modificar
--
-- Dinero en centavos enteros (bigint). La fecha usa la zona horaria de Argentina.

create table public.sales (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  -- restrict: una clienta con ventas no se puede borrar (se perdería la deuda).
  client_id uuid references public.clients (id) on delete restrict,
  vendida_el date not null default ((now() at time zone 'America/Argentina/Buenos_Aires')::date),
  vence_el date,
  notas text check (notas is null or char_length(notas) <= 2000),
  estado text not null default 'activa' check (estado in ('activa', 'anulada')),
  anulada_at timestamptz,
  total_centavos bigint not null default 0 check (total_centavos between 0 and 1000000000000000),
  pagado_centavos bigint not null default 0 check (pagado_centavos >= 0),
  saldo_centavos bigint generated always as (total_centavos - pagado_centavos) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint sales_pagado_no_supera_total check (pagado_centavos <= total_centavos)
);

create table public.sale_items (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references public.sales (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  -- set null: borrar un producto del catálogo no borra el historial (queda el nombre).
  product_id uuid references public.products (id) on delete set null,
  nombre_producto text not null,
  cantidad integer not null check (cantidad between 1 and 100000),
  precio_centavos bigint not null check (precio_centavos between 0 and 100000000000),
  costo_centavos bigint not null check (costo_centavos between 0 and 100000000000),
  created_at timestamptz not null default now()
);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references public.sales (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  monto_centavos bigint not null check (monto_centavos between 1 and 1000000000000),
  medio text not null default 'efectivo' check (medio in ('efectivo', 'transferencia', 'otro')),
  pagado_el date not null default ((now() at time zone 'America/Argentina/Buenos_Aires')::date),
  created_at timestamptz not null default now()
);

-- Índices (claves foráneas y consultas frecuentes).
create index sales_user_id_vendida_el_idx on public.sales (user_id, vendida_el desc);
create index sales_client_id_idx on public.sales (client_id);
-- "Por cobrar": ventas activas con saldo.
create index sales_por_cobrar_idx on public.sales (user_id, vence_el)
  where estado = 'activa' and saldo_centavos > 0;
create index sale_items_sale_id_idx on public.sale_items (sale_id);
create index sale_items_product_id_idx on public.sale_items (product_id);
create index sale_items_user_id_idx on public.sale_items (user_id);
create index payments_sale_id_idx on public.payments (sale_id);
create index payments_user_id_idx on public.payments (user_id);

-- Permisos mínimos para la Data API (desde 2026-10-30 no hay grants automáticos).
revoke all on public.sales, public.sale_items, public.payments from anon, authenticated;
grant select on public.sales, public.sale_items to authenticated;
grant select, delete on public.payments to authenticated;
grant insert (client_id, vendida_el, vence_el, notas) on public.sales to authenticated;
-- `estado` se puede cambiar solo para anular (lo valida el trigger).
grant update (vence_el, notas, estado) on public.sales to authenticated;
grant insert (sale_id, product_id, cantidad, precio_centavos) on public.sale_items to authenticated;
grant insert (sale_id, monto_centavos, medio, pagado_el) on public.payments to authenticated;

alter table public.sales enable row level security;
alter table public.sale_items enable row level security;
alter table public.payments enable row level security;

-- sales
create policy sales_select_propias on public.sales
  for select to authenticated
  using ((select auth.uid()) = user_id);

-- La clienta debe ser de la propia consultora (la clave foránea no mira RLS).
create policy sales_insert_propias on public.sales
  for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and (
      client_id is null
      or exists (
        select 1 from public.clients c
        where c.id = client_id and c.user_id = (select auth.uid())
      )
    )
  );

create policy sales_update_propias on public.sales
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- sale_items
create policy sale_items_select_propios on public.sale_items
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy sale_items_insert_propios on public.sale_items
  for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.sales s
      where s.id = sale_id and s.user_id = (select auth.uid())
    )
  );

-- payments
create policy payments_select_propios on public.payments
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy payments_insert_propios on public.payments
  for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.sales s
      where s.id = sale_id and s.user_id = (select auth.uid())
    )
  );

create policy payments_delete_propios on public.payments
  for delete to authenticated
  using ((select auth.uid()) = user_id);

-- updated_at automático.
create trigger sales_set_updated_at
  before update on public.sales
  for each row execute function private.set_updated_at();

-- ---------------------------------------------------------------------------
-- Triggers de integridad. Las funciones que escriben otras tablas son
-- SECURITY DEFINER (el cliente no tiene permiso de escribir totales ni stock),
-- viven en `private`, usan search_path vacío y verifican la pertenencia a mano
-- porque saltean RLS.
-- ---------------------------------------------------------------------------

-- Venta anulada: no se modifica. Al anular se registra la fecha.
create function private.sales_before_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.estado = 'anulada' then
    raise exception 'Una venta anulada no se puede modificar.' using errcode = 'BG006';
  end if;
  if new.estado = 'anulada' then
    new.anulada_at := now();
  end if;
  return new;
end;
$$;

create trigger sales_before_update
  before update on public.sales
  for each row execute function private.sales_before_update();

-- Al anular, devuelve el stock de los productos vendidos.
create function private.sales_after_cancel()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.products p
  set stock = p.stock + a.cantidad
  from (
    select i.product_id, sum(i.cantidad) as cantidad
    from public.sale_items i
    where i.sale_id = new.id and i.product_id is not null
    group by i.product_id
  ) a
  where p.id = a.product_id and p.user_id = new.user_id;
  return null;
end;
$$;

create trigger sales_restock_on_cancel
  after update of estado on public.sales
  for each row
  when (old.estado = 'activa' and new.estado = 'anulada')
  execute function private.sales_after_cancel();

-- Saldo pendiente exige clienta. Se evalúa al final de la transacción (diferido),
-- porque el total se arma a medida que se insertan los productos.
create function private.sales_check_client_for_balance()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.estado = 'activa' and new.client_id is null and new.saldo_centavos > 0 then
    raise exception 'Para dejar saldo pendiente elegí una clienta.' using errcode = 'BG003';
  end if;
  return null;
end;
$$;

create constraint trigger sales_check_client
  after insert or update on public.sales
  deferrable initially deferred
  for each row execute function private.sales_check_client_for_balance();

-- Productos vendidos: toma nombre y costo del producto, descuenta el stock y no deja vender de más.
create function private.sale_items_before_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  s record;
  p record;
begin
  select user_id, estado into s from public.sales where id = new.sale_id for update;
  if not found or s.user_id <> new.user_id then
    raise exception 'Venta no encontrada.' using errcode = 'BG004';
  end if;
  if s.estado <> 'activa' then
    raise exception 'Una venta anulada no se puede modificar.' using errcode = 'BG006';
  end if;

  select user_id, nombre, costo_centavos, stock into p
  from public.products where id = new.product_id for update;
  if not found or p.user_id <> new.user_id then
    raise exception 'Producto no encontrado.' using errcode = 'BG004';
  end if;
  if p.stock < new.cantidad then
    raise exception 'Stock insuficiente de «%»: quedan %.', p.nombre, p.stock using errcode = 'BG001';
  end if;

  update public.products set stock = stock - new.cantidad where id = new.product_id;
  new.nombre_producto := p.nombre;
  new.costo_centavos := p.costo_centavos;
  return new;
end;
$$;

create trigger sale_items_before_insert
  before insert on public.sale_items
  for each row execute function private.sale_items_before_insert();

create function private.sale_items_after_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.sales
  set total_centavos = total_centavos + new.cantidad * new.precio_centavos
  where id = new.sale_id;
  return null;
end;
$$;

create trigger sale_items_after_insert
  after insert on public.sale_items
  for each row execute function private.sale_items_after_insert();

-- Pagos: solo sobre ventas propias y activas, y nunca por encima del saldo.
create function private.payments_before_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  s record;
begin
  select user_id, estado, total_centavos, pagado_centavos into s
  from public.sales where id = new.sale_id for update;
  if not found or s.user_id <> new.user_id then
    raise exception 'Venta no encontrada.' using errcode = 'BG004';
  end if;
  if s.estado <> 'activa' then
    raise exception 'No se puede cobrar una venta anulada.' using errcode = 'BG005';
  end if;
  if new.monto_centavos > s.total_centavos - s.pagado_centavos then
    raise exception 'El pago supera el saldo pendiente.' using errcode = 'BG005';
  end if;
  return new;
end;
$$;

create trigger payments_before_insert
  before insert on public.payments
  for each row execute function private.payments_before_insert();

create function private.payments_after_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.sales
  set pagado_centavos = pagado_centavos + new.monto_centavos
  where id = new.sale_id;
  return null;
end;
$$;

create trigger payments_after_insert
  after insert on public.payments
  for each row execute function private.payments_after_insert();

-- Borrar un pago (corregir un error) devuelve el saldo; no se permite en ventas anuladas.
-- Si la venta ya no existe (borrado en cascada) no hay nada que bloquear ni ajustar.
create function private.payments_before_delete()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  anulada boolean;
begin
  select (estado = 'anulada') into anulada from public.sales where id = old.sale_id;
  if coalesce(anulada, false) then
    raise exception 'Una venta anulada no se puede modificar.' using errcode = 'BG006';
  end if;
  return old;
end;
$$;

create trigger payments_before_delete
  before delete on public.payments
  for each row execute function private.payments_before_delete();

create function private.payments_after_delete()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.sales
  set pagado_centavos = pagado_centavos - old.monto_centavos
  where id = old.sale_id;
  return null;
end;
$$;

create trigger payments_after_delete
  after delete on public.payments
  for each row execute function private.payments_after_delete();

-- Ninguna función interna es invocable desde la API.
revoke execute on function private.sales_before_update() from public, anon, authenticated, service_role;
revoke execute on function private.sales_after_cancel() from public, anon, authenticated, service_role;
revoke execute on function private.sales_check_client_for_balance() from public, anon, authenticated, service_role;
revoke execute on function private.sale_items_before_insert() from public, anon, authenticated, service_role;
revoke execute on function private.sale_items_after_insert() from public, anon, authenticated, service_role;
revoke execute on function private.payments_before_insert() from public, anon, authenticated, service_role;
revoke execute on function private.payments_after_insert() from public, anon, authenticated, service_role;
revoke execute on function private.payments_before_delete() from public, anon, authenticated, service_role;
revoke execute on function private.payments_after_delete() from public, anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Registrar una venta completa en una sola operación (todo o nada).
-- SECURITY INVOKER: corre con los permisos y RLS de quien llama; las reglas
-- las aplican los triggers de arriba.
--   p_items: [{"product_id": uuid, "cantidad": int, "precio_centavos": bigint}, ...]
--   p_pagos: [{"monto_centavos": bigint, "medio": "efectivo|transferencia|otro"}, ...]
-- ---------------------------------------------------------------------------
create function public.register_sale(
  p_client_id uuid,
  p_vence_el date,
  p_notas text,
  p_items jsonb,
  p_pagos jsonb default '[]'::jsonb
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_sale_id uuid;
begin
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'La venta necesita al menos un producto.' using errcode = 'BG002';
  end if;

  insert into public.sales (client_id, vence_el, notas)
  values (p_client_id, p_vence_el, nullif(btrim(p_notas), ''))
  returning id into v_sale_id;

  insert into public.sale_items (sale_id, product_id, cantidad, precio_centavos)
  select v_sale_id, (i ->> 'product_id')::uuid, (i ->> 'cantidad')::int, (i ->> 'precio_centavos')::bigint
  from jsonb_array_elements(p_items) as i;

  insert into public.payments (sale_id, monto_centavos, medio)
  select v_sale_id, (p ->> 'monto_centavos')::bigint, coalesce(p ->> 'medio', 'efectivo')
  from jsonb_array_elements(coalesce(p_pagos, '[]'::jsonb)) as p;

  return v_sale_id;
end;
$$;

revoke execute on function public.register_sale(uuid, date, text, jsonb, jsonb) from public, anon;
grant execute on function public.register_sale(uuid, date, text, jsonb, jsonb) to authenticated;

-- Reversión (no se ejecuta; guardada por si hay que deshacer):
--   drop function if exists public.register_sale(uuid, date, text, jsonb, jsonb);
--   drop table if exists public.payments, public.sale_items, public.sales;
--   drop function if exists private.sales_before_update(), private.sales_after_cancel(),
--     private.sales_check_client_for_balance(), private.sale_items_before_insert(),
--     private.sale_items_after_insert(), private.payments_before_insert(),
--     private.payments_after_insert(), private.payments_before_delete(),
--     private.payments_after_delete();
