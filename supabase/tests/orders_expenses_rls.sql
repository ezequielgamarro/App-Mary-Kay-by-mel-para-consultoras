-- Pruebas de pedidos (orders, order_items y sus funciones) y gastos (expenses).
-- Se ejecutan DESPUÉS de aplicar las migraciones, dentro de una transacción que
-- termina en ROLLBACK: no deja datos. Cada bloque lanza una excepción si falla.
-- Usuarias de prueba: A = ...aaaa, B = ...bbbb.

begin;

insert into auth.users (id, instance_id, aud, role, email)
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'a@test.invalid'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'b@test.invalid');

insert into public.products (id, user_id, nombre, costo_centavos, precio_centavos, stock) values
  ('a0000000-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Crema', 100000, 600000, 2),
  ('a0000000-0000-0000-0000-000000000002', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Labial', 50000, 300000, 0),
  ('b0000000-0000-0000-0000-000000000001', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Ajena', 1, 2, 0);

-- 1) A registra un pedido: copia nombre, costo y precio; queda pendiente; el stock no cambia aún.
do $$
declare oid uuid; n int; estado text; nom text; costo bigint; stock_crema int;
begin
  set local role authenticated;
  perform set_config('request.jwt.claims', '{"sub":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa","role":"authenticated"}', true);
  oid := public.register_order('  para el 10  ', '[
    {"product_id":"a0000000-0000-0000-0000-000000000001","cantidad":4},
    {"product_id":"a0000000-0000-0000-0000-000000000002","cantidad":3}]'::jsonb);
  select count(*), min(o.estado) into n, estado from public.order_items i join public.orders o on o.id = i.order_id where o.id = oid;
  select nombre_producto, costo_centavos into nom, costo from public.order_items where order_id = oid and cantidad = 4;
  select p.stock into stock_crema from public.products p where p.id = 'a0000000-0000-0000-0000-000000000001';
  reset role;
  if n <> 2 then raise exception 'FALLA 1a: renglones %', n; end if;
  if estado <> 'pendiente' then raise exception 'FALLA 1b: estado %', estado; end if;
  if nom <> 'Crema' or costo <> 100000 then raise exception 'FALLA 1c: copia del producto'; end if;
  if stock_crema <> 2 then raise exception 'FALLA 1d: el stock cambió antes de recibir'; end if;
end $$;

-- 2) Pedido vacío, producto ajeno o cantidad inválida: se rechazan sin dejar nada.
do $$
declare vacio boolean := false; ajeno boolean := false; cero boolean := false; total int;
begin
  set local role authenticated;
  perform set_config('request.jwt.claims', '{"sub":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa","role":"authenticated"}', true);
  begin perform public.register_order(null, '[]'::jsonb);
  exception when sqlstate 'BP001' then vacio := true; end;
  begin perform public.register_order(null, '[{"product_id":"b0000000-0000-0000-0000-000000000001","cantidad":1}]'::jsonb);
  exception when sqlstate 'BP002' then ajeno := true; end;
  begin perform public.register_order(null, '[{"product_id":"a0000000-0000-0000-0000-000000000001","cantidad":0}]'::jsonb);
  exception when sqlstate 'BP002' then cero := true; end;
  select count(*) into total from public.orders;
  reset role;
  if not vacio then raise exception 'FALLA 2a: aceptó un pedido vacío'; end if;
  if not ajeno then raise exception 'FALLA 2b: aceptó un producto ajeno'; end if;
  if not cero then raise exception 'FALLA 2c: aceptó cantidad 0'; end if;
  if total <> 1 then raise exception 'FALLA 2d: quedaron pedidos de más (%)', total; end if;
end $$;

-- 3) B no ve los pedidos de A y no puede recibirlos ni cancelarlos.
do $$
declare visibles int; recibir boolean := false; cancelar boolean := false; oid uuid;
begin
  select id into oid from public.orders limit 1;
  set local role authenticated;
  perform set_config('request.jwt.claims', '{"sub":"bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb","role":"authenticated"}', true);
  select count(*) into visibles from public.orders;
  begin perform public.receive_order(oid); exception when sqlstate 'BP003' then recibir := true; end;
  begin perform public.cancel_order(oid); exception when sqlstate 'BP003' then cancelar := true; end;
  reset role;
  if visibles <> 0 then raise exception 'FALLA 3a: B ve pedidos de A'; end if;
  if not recibir then raise exception 'FALLA 3b: B pudo recibir el pedido de A'; end if;
  if not cancelar then raise exception 'FALLA 3c: B pudo cancelar el pedido de A'; end if;
end $$;

-- 4) Las tablas son de solo lectura para la Data API.
do $$
declare ins boolean := false; upd boolean := false; del boolean := false;
begin
  set local role authenticated;
  perform set_config('request.jwt.claims', '{"sub":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa","role":"authenticated"}', true);
  begin insert into public.orders (notas) values ('x'); exception when insufficient_privilege then ins := true; end;
  begin update public.orders set estado = 'recibido'; exception when insufficient_privilege then upd := true; end;
  begin delete from public.order_items; exception when insufficient_privilege then del := true; end;
  reset role;
  if not ins then raise exception 'FALLA 4a: pudo insertar directo'; end if;
  if not upd then raise exception 'FALLA 4b: pudo actualizar directo'; end if;
  if not del then raise exception 'FALLA 4c: pudo borrar directo'; end if;
end $$;

-- 5) Recibir suma al stock, una sola vez; después no se puede cancelar ni recibir de nuevo.
do $$
declare oid uuid; stock_crema int; stock_labial int; otra_vez boolean := false; cancelar boolean := false;
begin
  select id into oid from public.orders limit 1;
  set local role authenticated;
  perform set_config('request.jwt.claims', '{"sub":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa","role":"authenticated"}', true);
  perform public.receive_order(oid);
  select stock into stock_crema from public.products where id = 'a0000000-0000-0000-0000-000000000001';
  select stock into stock_labial from public.products where id = 'a0000000-0000-0000-0000-000000000002';
  begin perform public.receive_order(oid); exception when sqlstate 'BP003' then otra_vez := true; end;
  begin perform public.cancel_order(oid); exception when sqlstate 'BP003' then cancelar := true; end;
  reset role;
  if stock_crema <> 6 then raise exception 'FALLA 5a: stock de crema % (esperado 6)', stock_crema; end if;
  if stock_labial <> 3 then raise exception 'FALLA 5b: stock de labial % (esperado 3)', stock_labial; end if;
  if not otra_vez then raise exception 'FALLA 5c: recibió dos veces'; end if;
  if not cancelar then raise exception 'FALLA 5d: canceló un pedido recibido'; end if;
end $$;

-- 6) Cancelar no toca el stock; el historial sobrevive al borrado del producto.
do $$
declare oid uuid; stock_crema int; estado text; nombre text;
begin
  set local role authenticated;
  perform set_config('request.jwt.claims', '{"sub":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa","role":"authenticated"}', true);
  oid := public.register_order(null, '[{"product_id":"a0000000-0000-0000-0000-000000000001","cantidad":9}]'::jsonb);
  perform public.cancel_order(oid);
  select stock into stock_crema from public.products where id = 'a0000000-0000-0000-0000-000000000001';
  select o.estado into estado from public.orders o where o.id = oid;
  delete from public.products where id = 'a0000000-0000-0000-0000-000000000001';
  select nombre_producto into nombre from public.order_items where order_id = oid;
  reset role;
  if stock_crema <> 6 then raise exception 'FALLA 6a: cancelar cambió el stock'; end if;
  if estado <> 'cancelado' then raise exception 'FALLA 6b: estado %', estado; end if;
  if nombre <> 'Crema' then raise exception 'FALLA 6c: el historial perdió el nombre'; end if;
end $$;

-- 7) Anónimo no accede a nada.
do $$
declare bloqueado boolean := false; fn boolean := false;
begin
  set local role anon;
  begin perform count(*) from public.orders; exception when insufficient_privilege then bloqueado := true; end;
  begin perform public.register_order(null, '[]'::jsonb); exception when insufficient_privilege then fn := true; end;
  reset role;
  if not bloqueado then raise exception 'FALLA 7a: anon leyó pedidos'; end if;
  if not fn then raise exception 'FALLA 7b: anon ejecutó register_order'; end if;
end $$;

-- 8) Gastos: A crea, edita y borra lo suyo; B no ve nada; datos inválidos se rechazan.
do $$
declare dueña uuid; eid uuid; visibles_b int; monto0 boolean := false; cat_mala boolean := false;
        vacio boolean := false; ajeno boolean := false; editado bigint; restantes int;
begin
  set local role authenticated;
  perform set_config('request.jwt.claims', '{"sub":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa","role":"authenticated"}', true);
  insert into public.expenses (concepto, categoria, monto_centavos) values ('Nafta', 'transporte', 250000) returning id into eid;
  select user_id into dueña from public.expenses where id = eid;
  begin insert into public.expenses (concepto, monto_centavos) values ('Cero', 0); exception when check_violation then monto0 := true; end;
  begin insert into public.expenses (concepto, categoria, monto_centavos) values ('X', 'lujo', 1); exception when check_violation then cat_mala := true; end;
  begin insert into public.expenses (concepto, monto_centavos) values ('   ', 1); exception when check_violation then vacio := true; end;
  begin insert into public.expenses (user_id, concepto, monto_centavos) values ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Ajeno', 1);
  exception when insufficient_privilege then ajeno := true; end;
  update public.expenses set monto_centavos = 300000 where id = eid;
  select monto_centavos into editado from public.expenses where id = eid;
  perform set_config('request.jwt.claims', '{"sub":"bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb","role":"authenticated"}', true);
  select count(*) into visibles_b from public.expenses;
  delete from public.expenses where id = eid;
  perform set_config('request.jwt.claims', '{"sub":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa","role":"authenticated"}', true);
  select count(*) into restantes from public.expenses;
  delete from public.expenses where id = eid;
  reset role;
  if dueña <> 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' then raise exception 'FALLA 8a: dueña incorrecta'; end if;
  if not monto0 then raise exception 'FALLA 8b: aceptó monto 0'; end if;
  if not cat_mala then raise exception 'FALLA 8c: aceptó categoría inválida'; end if;
  if not vacio then raise exception 'FALLA 8d: aceptó concepto vacío'; end if;
  if not ajeno then raise exception 'FALLA 8e: A pudo escribir user_id'; end if;
  if editado <> 300000 then raise exception 'FALLA 8f: no editó'; end if;
  if visibles_b <> 0 then raise exception 'FALLA 8g: B ve gastos de A'; end if;
  if restantes <> 1 then raise exception 'FALLA 8h: B pudo borrar el gasto de A'; end if;
end $$;

rollback;
