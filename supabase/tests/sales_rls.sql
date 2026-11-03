-- Pruebas de ventas, pagos, stock y RLS (public.sales, sale_items, payments, register_sale).
-- Se ejecutan DESPUÉS de aplicar la migración, dentro de una transacción que
-- termina en ROLLBACK: no deja datos. Cada bloque lanza una excepción si falla.
-- Usuarias de prueba: A = ...aaaa, B = ...bbbb.
--
-- Nota: el trigger "sales_check_client" es diferido (se evalúa al COMMIT); en las pruebas
-- se fuerza con `set constraints all immediate` para verlo dentro de la transacción.

begin;

insert into auth.users (id, instance_id, aud, role, email)
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'a@test.invalid'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'b@test.invalid');

-- Datos base (como administrador, con ids fijos para referenciarlos).
insert into public.clients (id, user_id, nombre) values
  ('c1c1c1c1-0000-0000-0000-00000000000a', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Clienta de A'),
  ('c1c1c1c1-0000-0000-0000-00000000000b', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Clienta de B');

insert into public.products (id, user_id, nombre, costo_centavos, precio_centavos, stock) values
  ('d1d1d1d1-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Crema A', 100000, 200000, 10),
  ('d1d1d1d1-0000-0000-0000-000000000002', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Labial A', 50000, 90000, 2),
  ('d1d1d1d1-0000-0000-0000-00000000000b', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Crema B', 100000, 200000, 10);

-- 1) A registra una venta con clienta, 3 cremas a $2.500 y un pago de $3.000 → total 7.500, saldo 4.500.
do $$
declare sid uuid; s record; stock_p1 int; it record;
begin
  set local role authenticated;
  perform set_config('request.jwt.claims', '{"sub":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa","role":"authenticated"}', true);
  select public.register_sale(
    'c1c1c1c1-0000-0000-0000-00000000000a', current_date + 7, 'primera',
    '[{"product_id":"d1d1d1d1-0000-0000-0000-000000000001","cantidad":3,"precio_centavos":250000}]'::jsonb,
    '[{"monto_centavos":300000,"medio":"transferencia"}]'::jsonb
  ) into sid;
  select * into s from public.sales where id = sid;
  select stock into stock_p1 from public.products where id = 'd1d1d1d1-0000-0000-0000-000000000001';
  select * into it from public.sale_items where sale_id = sid;
  reset role;
  if s.total_centavos <> 750000 then raise exception 'FALLA 1a: total = %', s.total_centavos; end if;
  if s.pagado_centavos <> 300000 or s.saldo_centavos <> 450000 then
    raise exception 'FALLA 1b: pagado = %, saldo = %', s.pagado_centavos, s.saldo_centavos;
  end if;
  if s.user_id <> 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' then raise exception 'FALLA 1c: dueña incorrecta'; end if;
  if stock_p1 <> 7 then raise exception 'FALLA 1d: stock = % (esperado 7)', stock_p1; end if;
  if it.nombre_producto <> 'Crema A' or it.costo_centavos <> 100000 then
    raise exception 'FALLA 1e: no tomó nombre/costo del producto (% / %)', it.nombre_producto, it.costo_centavos;
  end if;
end $$;

-- 2) Stock insuficiente: se rechaza y no cambia nada (ni venta ni stock).
do $$
declare rechazada boolean := false; ventas_antes int; ventas_despues int; stock_p2 int;
begin
  set local role authenticated;
  perform set_config('request.jwt.claims', '{"sub":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa","role":"authenticated"}', true);
  select count(*) into ventas_antes from public.sales;
  begin
    perform public.register_sale(null, null, null,
      '[{"product_id":"d1d1d1d1-0000-0000-0000-000000000002","cantidad":3,"precio_centavos":90000}]'::jsonb,
      '[{"monto_centavos":270000}]'::jsonb);
  exception when sqlstate 'BG001' then rechazada := true;
  end;
  select count(*) into ventas_despues from public.sales;
  select stock into stock_p2 from public.products where id = 'd1d1d1d1-0000-0000-0000-000000000002';
  reset role;
  if not rechazada then raise exception 'FALLA 2a: vendió más stock del que había'; end if;
  if ventas_antes <> ventas_despues then raise exception 'FALLA 2b: quedó una venta a medias'; end if;
  if stock_p2 <> 2 then raise exception 'FALLA 2c: el stock cambió a %', stock_p2; end if;
end $$;

-- 3) Saldo pendiente sin clienta se rechaza; pagada completa sin clienta es válida.
do $$
declare rechazada boolean := false; sid uuid;
begin
  set local role authenticated;
  perform set_config('request.jwt.claims', '{"sub":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa","role":"authenticated"}', true);
  begin
    perform public.register_sale(null, null, null,
      '[{"product_id":"d1d1d1d1-0000-0000-0000-000000000001","cantidad":1,"precio_centavos":200000}]'::jsonb,
      '[{"monto_centavos":50000}]'::jsonb);
    set constraints all immediate;
  exception when sqlstate 'BG003' then rechazada := true;
  end;
  if not rechazada then
    reset role;
    raise exception 'FALLA 3a: aceptó saldo pendiente sin clienta';
  end if;
  -- El modo inmediato del intento anterior sigue activo: volver al diferido (el real) para que
  -- el chequeo corra con la venta ya armada.
  set constraints all deferred;
  select public.register_sale(null, null, null,
    '[{"product_id":"d1d1d1d1-0000-0000-0000-000000000001","cantidad":1,"precio_centavos":200000}]'::jsonb,
    '[{"monto_centavos":200000}]'::jsonb) into sid;
  set constraints all immediate;
  reset role;
  if sid is null then raise exception 'FALLA 3b: no registró la venta de mostrador pagada'; end if;
end $$;

-- 4) Pagos: no se puede pagar de más; un pago válido deja el saldo en 0; borrarlo lo devuelve.
do $$
declare sid uuid; demasiado boolean := false; s record; pid uuid;
begin
  set local role authenticated;
  perform set_config('request.jwt.claims', '{"sub":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa","role":"authenticated"}', true);
  select id into sid from public.sales where notas = 'primera';
  begin
    insert into public.payments (sale_id, monto_centavos) values (sid, 450001);
  exception when sqlstate 'BG005' then demasiado := true;
  end;
  insert into public.payments (sale_id, monto_centavos, medio) values (sid, 450000, 'efectivo') returning id into pid;
  select * into s from public.sales where id = sid;
  if s.saldo_centavos <> 0 then reset role; raise exception 'FALLA 4b: saldo = % tras pagar todo', s.saldo_centavos; end if;
  delete from public.payments where id = pid;
  select * into s from public.sales where id = sid;
  reset role;
  if not demasiado then raise exception 'FALLA 4a: aceptó un pago mayor al saldo'; end if;
  if s.saldo_centavos <> 450000 then raise exception 'FALLA 4c: saldo = % tras borrar el pago', s.saldo_centavos; end if;
end $$;

-- 5) Datos de venta inválidos: sin productos, cantidad 0, precio negativo, medio inválido.
do $$
declare sin_items boolean := false; cant boolean := false; precio boolean := false; medio boolean := false;
begin
  set local role authenticated;
  perform set_config('request.jwt.claims', '{"sub":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa","role":"authenticated"}', true);
  begin perform public.register_sale(null, null, null, '[]'::jsonb);
  exception when sqlstate 'BG002' then sin_items := true; end;
  begin perform public.register_sale('c1c1c1c1-0000-0000-0000-00000000000a', null, null,
    '[{"product_id":"d1d1d1d1-0000-0000-0000-000000000001","cantidad":0,"precio_centavos":100}]'::jsonb);
  exception when check_violation then cant := true; end;
  begin perform public.register_sale('c1c1c1c1-0000-0000-0000-00000000000a', null, null,
    '[{"product_id":"d1d1d1d1-0000-0000-0000-000000000001","cantidad":1,"precio_centavos":-5}]'::jsonb);
  exception when check_violation then precio := true; end;
  begin perform public.register_sale('c1c1c1c1-0000-0000-0000-00000000000a', null, null,
    '[{"product_id":"d1d1d1d1-0000-0000-0000-000000000001","cantidad":1,"precio_centavos":100}]'::jsonb,
    '[{"monto_centavos":100,"medio":"bitcoin"}]'::jsonb);
  exception when check_violation then medio := true; end;
  reset role;
  if not sin_items then raise exception 'FALLA 5a: aceptó una venta sin productos'; end if;
  if not cant then raise exception 'FALLA 5b: aceptó cantidad 0'; end if;
  if not precio then raise exception 'FALLA 5c: aceptó un precio negativo'; end if;
  if not medio then raise exception 'FALLA 5d: aceptó un medio de pago inválido'; end if;
end $$;

-- 6) Aislamiento: B no ve nada de A y no puede usar sus productos ni sus clientas.
do $$
declare v_sales int; v_items int; v_pay int; editadas int;
        producto_ajeno boolean := false; clienta_ajena boolean := false; pago_ajeno boolean := false; sid uuid;
begin
  select id into sid from public.sales where notas = 'primera';
  set local role authenticated;
  perform set_config('request.jwt.claims', '{"sub":"bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb","role":"authenticated"}', true);
  select count(*) into v_sales from public.sales;
  select count(*) into v_items from public.sale_items;
  select count(*) into v_pay from public.payments;
  update public.sales set notas = 'hackeada';
  get diagnostics editadas = row_count;
  begin
    perform public.register_sale(null, null, null,
      '[{"product_id":"d1d1d1d1-0000-0000-0000-000000000001","cantidad":1,"precio_centavos":100}]'::jsonb,
      '[{"monto_centavos":100}]'::jsonb);
  exception when sqlstate 'BG004' then producto_ajeno := true; end;
  begin
    perform public.register_sale('c1c1c1c1-0000-0000-0000-00000000000a', null, null,
      '[{"product_id":"d1d1d1d1-0000-0000-0000-00000000000b","cantidad":1,"precio_centavos":100}]'::jsonb,
      '[{"monto_centavos":100}]'::jsonb);
  exception when others then clienta_ajena := true; end;
  begin
    insert into public.payments (sale_id, monto_centavos) values (sid, 100);
  exception when others then pago_ajeno := true; end;
  reset role;
  if v_sales <> 0 or v_items <> 0 or v_pay <> 0 then
    raise exception 'FALLA 6a: B ve % ventas, % productos vendidos y % pagos de A', v_sales, v_items, v_pay;
  end if;
  if editadas <> 0 then raise exception 'FALLA 6b: B editó % ventas de A', editadas; end if;
  if not producto_ajeno then raise exception 'FALLA 6c: B vendió un producto de A'; end if;
  if not clienta_ajena then raise exception 'FALLA 6d: B usó una clienta de A'; end if;
  if not pago_ajeno then raise exception 'FALLA 6e: B registró un pago en una venta de A'; end if;
end $$;

-- 7) A no puede falsear totales ni saltear las reglas escribiendo directo en las tablas.
do $$
declare total_dir boolean := false; pagado_dir boolean := false; borrar_venta boolean := false;
        editar_item boolean := false; borrar_item boolean := false; insertar_total boolean := false;
begin
  set local role authenticated;
  perform set_config('request.jwt.claims', '{"sub":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa","role":"authenticated"}', true);
  begin update public.sales set total_centavos = 1; exception when insufficient_privilege then total_dir := true; end;
  begin update public.sales set pagado_centavos = 1; exception when insufficient_privilege then pagado_dir := true; end;
  begin delete from public.sales; exception when insufficient_privilege then borrar_venta := true; end;
  begin update public.sale_items set cantidad = 1; exception when insufficient_privilege then editar_item := true; end;
  begin delete from public.sale_items; exception when insufficient_privilege then borrar_item := true; end;
  begin insert into public.sales (total_centavos) values (999); exception when insufficient_privilege then insertar_total := true; end;
  reset role;
  if not total_dir then raise exception 'FALLA 7a: A pudo escribir total_centavos'; end if;
  if not pagado_dir then raise exception 'FALLA 7b: A pudo escribir pagado_centavos'; end if;
  if not borrar_venta then raise exception 'FALLA 7c: A pudo borrar una venta'; end if;
  if not editar_item then raise exception 'FALLA 7d: A pudo editar un producto vendido'; end if;
  if not borrar_item then raise exception 'FALLA 7e: A pudo borrar un producto vendido'; end if;
  if not insertar_total then raise exception 'FALLA 7f: A pudo insertar una venta con total propio'; end if;
end $$;

-- 8) Una clienta con ventas no se puede borrar.
do $$
declare bloqueada boolean := false;
begin
  begin
    delete from public.clients where id = 'c1c1c1c1-0000-0000-0000-00000000000a';
  exception when foreign_key_violation then bloqueada := true;
  end;
  if not bloqueada then raise exception 'FALLA 8: se pudo borrar una clienta con ventas'; end if;
end $$;

-- 9) Anular: devuelve el stock, no se puede volver a modificar ni cobrar.
do $$
declare sid uuid; s record; stock_p1 int; modificar boolean := false; cobrar boolean := false; anulacion_directa boolean := false;
begin
  set local role authenticated;
  perform set_config('request.jwt.claims', '{"sub":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa","role":"authenticated"}', true);
  select id into sid from public.sales where notas = 'primera';
  select stock into stock_p1 from public.products where id = 'd1d1d1d1-0000-0000-0000-000000000001';
  update public.sales set estado = 'anulada' where id = sid;
  select * into s from public.sales where id = sid;
  begin update public.sales set notas = 'otra' where id = sid; exception when sqlstate 'BG006' then modificar := true; end;
  begin insert into public.payments (sale_id, monto_centavos) values (sid, 100); exception when sqlstate 'BG005' then cobrar := true; end;
  reset role;
  if s.estado <> 'anulada' or s.anulada_at is null then raise exception 'FALLA 9a: no quedó anulada'; end if;
  if (select stock from public.products where id = 'd1d1d1d1-0000-0000-0000-000000000001') <> stock_p1 + 3 then
    raise exception 'FALLA 9b: no devolvió las 3 unidades al stock';
  end if;
  if not modificar then raise exception 'FALLA 9c: se pudo modificar una venta anulada'; end if;
  if not cobrar then raise exception 'FALLA 9d: se pudo cobrar una venta anulada'; end if;
end $$;

-- 10) Pagos de una venta anulada no se pueden borrar; nadie sin sesión (anon) accede ni registra ventas.
do $$
declare anon_tabla boolean := false; anon_func boolean := false; borrar_pago boolean := false; pid uuid; sid uuid;
begin
  select id into sid from public.sales where notas = 'primera';
  select id into pid from public.payments where sale_id = sid limit 1;
  set local role authenticated;
  perform set_config('request.jwt.claims', '{"sub":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa","role":"authenticated"}', true);
  begin delete from public.payments where id = pid; exception when sqlstate 'BG006' then borrar_pago := true; end;
  reset role;
  set local role anon;
  begin perform count(*) from public.sales; exception when insufficient_privilege then anon_tabla := true; end;
  begin perform public.register_sale(null, null, null, '[]'::jsonb); exception when insufficient_privilege then anon_func := true; end;
  reset role;
  if not borrar_pago then raise exception 'FALLA 10a: se pudo borrar un pago de una venta anulada'; end if;
  if not anon_tabla then raise exception 'FALLA 10b: anon pudo leer public.sales'; end if;
  if not anon_func then raise exception 'FALLA 10c: anon pudo ejecutar register_sale'; end if;
end $$;

-- 11) Las funciones internas de los triggers no son invocables desde la API.
do $$
declare expuestas text;
begin
  select string_agg(p.proname, ', ') into expuestas
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'private'
    and (p.proname like 'sale%' or p.proname like 'payments%')
    and (has_function_privilege('authenticated', p.oid, 'execute')
      or has_function_privilege('anon', p.oid, 'execute'));
  if expuestas is not null then raise exception 'FALLA 11: funciones internas expuestas: %', expuestas; end if;
end $$;

rollback;
