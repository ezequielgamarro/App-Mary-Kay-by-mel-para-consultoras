-- Historial de pedidos de reposición a la empresa.
--
-- Modelo de acceso:
--   * Cada consultora ve solo sus pedidos (user_id = auth.uid()).
--   * Las tablas son de solo lectura para la Data API: todo cambio pasa por las funciones
--     `register_order`, `receive_order` y `cancel_order`, que validan y hacen todo o nada.
--   * Cada renglón guarda una copia del nombre, costo y precio del producto al pedir, para que
--     el historial no cambie si después se edita o se borra el producto.
--   * Al marcar el pedido como recibido, las funciones suman las unidades al stock.
--
-- Errores propios (errcode): BP001 sin productos, BP002 producto inexistente o cantidad inválida,
-- BP003 el pedido no existe o ya no está pendiente.

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  pedido_el date not null default ((now() at time zone 'America/Argentina/Buenos_Aires')::date),
  estado text not null default 'pendiente' check (estado in ('pendiente', 'recibido', 'cancelado')),
  notas text check (notas is null or char_length(notas) <= 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  order_id uuid not null references public.orders (id) on delete cascade,
  product_id uuid references public.products (id) on delete set null,
  nombre_producto text not null,
  cantidad integer not null check (cantidad between 1 and 1000000),
  costo_centavos bigint not null check (costo_centavos between 0 and 100000000000),
  precio_centavos bigint not null check (precio_centavos between 0 and 100000000000),
  created_at timestamptz not null default now()
);

create index orders_user_id_pedido_el_idx on public.orders (user_id, pedido_el desc);
create index order_items_order_id_idx on public.order_items (order_id);
create index order_items_product_id_idx on public.order_items (product_id);
create index order_items_user_id_idx on public.order_items (user_id);

revoke all on public.orders, public.order_items from anon, authenticated;
grant select on public.orders, public.order_items to authenticated;

alter table public.orders enable row level security;
alter table public.order_items enable row level security;

create policy orders_select_propios on public.orders
  for select to authenticated using ((select auth.uid()) = user_id);
create policy order_items_select_propios on public.order_items
  for select to authenticated using ((select auth.uid()) = user_id);

create trigger orders_set_updated_at
  before update on public.orders
  for each row execute function private.set_updated_at();

-- ---------------------------------------------------------------------------
-- register_order(p_notas, p_items)
--   p_items: [{"product_id": uuid, "cantidad": int}, ...]
-- ---------------------------------------------------------------------------
create function public.register_order(p_notas text, p_items jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_order_id uuid;
  v_count int;
  v_found int;
begin
  if v_user is null then
    raise exception 'Iniciá sesión para registrar el pedido.' using errcode = 'BP002';
  end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'El pedido necesita al menos un producto.' using errcode = 'BP001';
  end if;

  v_count := jsonb_array_length(p_items);
  select count(*) into v_found
  from jsonb_array_elements(p_items) as i
  join public.products p on p.id = (i ->> 'product_id')::uuid and p.user_id = v_user
  where (i ->> 'cantidad')::int between 1 and 1000000;
  if v_found <> v_count then
    raise exception 'Algún producto del pedido no existe o su cantidad no es válida.'
      using errcode = 'BP002';
  end if;

  insert into public.orders (user_id, notas)
  values (v_user, nullif(btrim(p_notas), ''))
  returning id into v_order_id;

  insert into public.order_items
    (user_id, order_id, product_id, nombre_producto, cantidad, costo_centavos, precio_centavos)
  select v_user, v_order_id, p.id, p.nombre, (i ->> 'cantidad')::int, p.costo_centavos, p.precio_centavos
  from jsonb_array_elements(p_items) as i
  join public.products p on p.id = (i ->> 'product_id')::uuid and p.user_id = v_user;

  return v_order_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- receive_order(p_order_id): pendiente -> recibido y suma las unidades al stock.
-- ---------------------------------------------------------------------------
create function public.receive_order(p_order_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
begin
  update public.orders set estado = 'recibido'
  where id = p_order_id and user_id = v_user and estado = 'pendiente';
  if not found then
    raise exception 'Ese pedido no existe o ya no está pendiente.' using errcode = 'BP003';
  end if;

  update public.products p
  set stock = least(p.stock + s.cantidad, 1000000)
  from (
    select product_id, sum(cantidad)::int as cantidad
    from public.order_items
    where order_id = p_order_id and user_id = v_user and product_id is not null
    group by product_id
  ) s
  where p.id = s.product_id and p.user_id = v_user;
end;
$$;

-- ---------------------------------------------------------------------------
-- cancel_order(p_order_id): pendiente -> cancelado (no toca el stock).
-- ---------------------------------------------------------------------------
create function public.cancel_order(p_order_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.orders set estado = 'cancelado'
  where id = p_order_id and user_id = auth.uid() and estado = 'pendiente';
  if not found then
    raise exception 'Ese pedido no existe o ya no está pendiente.' using errcode = 'BP003';
  end if;
end;
$$;

revoke execute on function public.register_order(text, jsonb) from public, anon;
revoke execute on function public.receive_order(uuid) from public, anon;
revoke execute on function public.cancel_order(uuid) from public, anon;
grant execute on function public.register_order(text, jsonb) to authenticated;
grant execute on function public.receive_order(uuid) to authenticated;
grant execute on function public.cancel_order(uuid) to authenticated;

-- Reversión (no se ejecuta; guardada por si hay que deshacer):
--   drop function if exists public.register_order(text, jsonb), public.receive_order(uuid),
--     public.cancel_order(uuid);
--   drop table if exists public.order_items, public.orders;
