-- Pruebas de Equipo: código de invitación, vínculo con la directora, permiso de compartir
-- y lo único que ve la directora. Se ejecutan DESPUÉS de aplicar la migración, dentro de una
-- transacción que termina en ROLLBACK: no deja datos. Cada bloque lanza una excepción si falla.
-- Usuarias: A = directora (...aaaa), B y C = consultoras de A (...bbbb, ...cccc), D = ajena (...dddd).
-- Los perfiles los crea solo el trigger de alta de usuarias.

begin;

insert into auth.users (id, instance_id, aud, role, email)
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'a@test.invalid'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'b@test.invalid'),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'c@test.invalid'),
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'd@test.invalid');

update public.profiles set nombre = 'Ana (directora)' where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
update public.profiles set nombre = 'Beti' where id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
update public.profiles set nombre = 'Cami' where id = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
update public.profiles set nombre = 'Dora' where id = 'dddddddd-dddd-dddd-dddd-dddddddddddd';

-- Datos de B (como administrador): una venta activa del mes, una anulada, una del mes pasado,
-- una clienta con deuda y la meta del mes. Nada de esto debe filtrarse a la directora.
insert into public.clients (id, user_id, nombre)
values ('c1c1c1c1-0000-0000-0000-00000000000b', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Clienta secreta');
insert into public.sales (user_id, client_id, total_centavos, pagado_centavos, estado, vendida_el) values
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'c1c1c1c1-0000-0000-0000-00000000000b', 500000, 0, 'activa',
    (now() at time zone 'America/Argentina/Buenos_Aires')::date),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'c1c1c1c1-0000-0000-0000-00000000000b', 900000, 0, 'anulada',
    (now() at time zone 'America/Argentina/Buenos_Aires')::date),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'c1c1c1c1-0000-0000-0000-00000000000b', 700000, 0, 'activa',
    (date_trunc('month', now() at time zone 'America/Argentina/Buenos_Aires')::date - 1));
insert into public.goals (user_id, mes, ventas_centavos)
values ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  date_trunc('month', now() at time zone 'America/Argentina/Buenos_Aires')::date, 2000000);
-- Ventas de C (no comparte): no deben verse ni sumarse.
insert into public.sales (user_id, total_centavos, pagado_centavos, estado)
values ('cccccccc-cccc-cccc-cccc-cccccccccccc', 300000, 300000, 'activa');

-- 1) Todos los perfiles tienen código único de 10 caracteres y arrancan sin equipo ni compartir.
do $$
declare distintos int; malos int;
begin
  select count(distinct codigo_invitacion), count(*) filter (where codigo_invitacion !~ '^[A-Z0-9]{10}$')
  into distintos, malos from public.profiles;
  if malos <> 0 then raise exception 'FALLA 1a: % códigos con formato inválido', malos; end if;
  if distintos <> (select count(*) from public.profiles) then raise exception 'FALLA 1b: códigos repetidos'; end if;
  if exists (select 1 from public.profiles where patrocinadora_id is not null or comparte_con_patrocinadora) then
    raise exception 'FALLA 1c: hay perfiles con equipo o compartiendo al crearse';
  end if;
end $$;

-- 2) B se une con el código de A (escrito en minúsculas y con espacios): queda en su equipo y comparte.
do $$
declare codigo text; b record;
begin
  select codigo_invitacion into codigo from public.profiles where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  set local role authenticated;
  perform set_config('request.jwt.claims', '{"sub":"bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb","role":"authenticated"}', true);
  perform public.join_team('  ' || lower(codigo) || ' ');
  reset role;
  select * into b from public.profiles where id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
  if b.patrocinadora_id <> 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' or not b.comparte_con_patrocinadora then
    raise exception 'FALLA 2: B no quedó en el equipo de A compartiendo';
  end if;
end $$;

-- 3) C también se une y después deja de compartir.
do $$
declare codigo text; c record;
begin
  select codigo_invitacion into codigo from public.profiles where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  set local role authenticated;
  perform set_config('request.jwt.claims', '{"sub":"cccccccc-cccc-cccc-cccc-cccccccccccc","role":"authenticated"}', true);
  perform public.join_team(codigo);
  perform public.set_team_sharing(false);
  reset role;
  select * into c from public.profiles where id = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
  if c.patrocinadora_id is null or c.comparte_con_patrocinadora then
    raise exception 'FALLA 3: C debería estar en el equipo sin compartir';
  end if;
end $$;

-- 4) Errores al unirse: código inexistente, el propio, ya en un equipo, y ciclo.
do $$
declare codigo_d text; codigo_b text; inexistente boolean := false; propio boolean := false;
        ya_en_equipo boolean := false; ciclo boolean := false;
begin
  select codigo_invitacion into codigo_d from public.profiles where id = 'dddddddd-dddd-dddd-dddd-dddddddddddd';
  select codigo_invitacion into codigo_b from public.profiles where id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
  set local role authenticated;
  perform set_config('request.jwt.claims', '{"sub":"dddddddd-dddd-dddd-dddd-dddddddddddd","role":"authenticated"}', true);
  begin perform public.join_team('NOEXISTE00'); exception when sqlstate 'BT001' then inexistente := true; end;
  begin perform public.join_team(codigo_d); exception when sqlstate 'BT002' then propio := true; end;
  perform set_config('request.jwt.claims', '{"sub":"bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb","role":"authenticated"}', true);
  begin perform public.join_team(codigo_d); exception when sqlstate 'BT003' then ya_en_equipo := true; end;
  -- A (directora de B) intenta unirse con el código de B: cerraría un ciclo.
  perform set_config('request.jwt.claims', '{"sub":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa","role":"authenticated"}', true);
  begin perform public.join_team(codigo_b); exception when sqlstate 'BT004' then ciclo := true; end;
  reset role;
  if not inexistente then raise exception 'FALLA 4a: aceptó un código inexistente'; end if;
  if not propio then raise exception 'FALLA 4b: aceptó su propio código'; end if;
  if not ya_en_equipo then raise exception 'FALLA 4c: permitió unirse estando en otro equipo'; end if;
  if not ciclo then raise exception 'FALLA 4d: permitió cerrar un ciclo'; end if;
end $$;

-- 5) Nadie puede escribir directamente el vínculo, el permiso ni el código.
do $$
declare patro boolean := false; comp boolean := false; cod boolean := false;
begin
  set local role authenticated;
  perform set_config('request.jwt.claims', '{"sub":"dddddddd-dddd-dddd-dddd-dddddddddddd","role":"authenticated"}', true);
  begin update public.profiles set patrocinadora_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'; exception when insufficient_privilege then patro := true; end;
  begin update public.profiles set comparte_con_patrocinadora = true; exception when insufficient_privilege then comp := true; end;
  begin update public.profiles set codigo_invitacion = 'AAAAAAAAAA'; exception when insufficient_privilege then cod := true; end;
  reset role;
  if not patro then raise exception 'FALLA 5a: D pudo escribir patrocinadora_id'; end if;
  if not comp then raise exception 'FALLA 5b: D pudo escribir comparte_con_patrocinadora'; end if;
  if not cod then raise exception 'FALLA 5c: D pudo cambiar su código'; end if;
end $$;

-- 6) La directora ve a B con sus números del mes y a C sin números; D no aparece; el mes pasado
--    y lo anulado no cuentan.
do $$
declare filas int; b record; c record; d_aparece boolean;
begin
  set local role authenticated;
  perform set_config('request.jwt.claims', '{"sub":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa","role":"authenticated"}', true);
  select count(*) into filas from public.team_summary();
  select * into b from public.team_summary() where nombre = 'Beti';
  select * into c from public.team_summary() where nombre = 'Cami';
  select exists (select 1 from public.team_summary() where nombre = 'Dora') into d_aparece;
  reset role;
  if filas <> 2 then raise exception 'FALLA 6a: la directora ve % integrantes (esperado 2)', filas; end if;
  if b.ventas_mes_centavos <> 500000 or b.cantidad_ventas <> 1 or b.meta_ventas_centavos <> 2000000 or not b.comparte then
    raise exception 'FALLA 6b: números de Beti = % / % / %', b.ventas_mes_centavos, b.cantidad_ventas, b.meta_ventas_centavos;
  end if;
  if c.comparte or c.ventas_mes_centavos is not null or c.cantidad_ventas is not null or c.meta_ventas_centavos is not null then
    raise exception 'FALLA 6c: se filtraron números de Cami, que no comparte';
  end if;
  if d_aparece then raise exception 'FALLA 6d: una ajena aparece en el equipo'; end if;
end $$;

-- 7) La directora NO accede a clientas, ventas, productos ni pagos de sus integrantes.
do $$
declare clientas int; ventas int; productos int; pagos int; items int;
begin
  set local role authenticated;
  perform set_config('request.jwt.claims', '{"sub":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa","role":"authenticated"}', true);
  select count(*) into clientas from public.clients;
  select count(*) into ventas from public.sales;
  select count(*) into productos from public.products;
  select count(*) into pagos from public.payments;
  select count(*) into items from public.sale_items;
  reset role;
  if clientas + ventas + productos + pagos + items <> 0 then
    raise exception 'FALLA 7: la directora ve % clientas, % ventas, % productos, % pagos, % items', clientas, ventas, productos, pagos, items;
  end if;
end $$;

-- 8) Alguien sin integrantes recibe una lista vacía; las integrantes no ven el resumen de otras.
do $$
declare d_filas int; b_filas int;
begin
  set local role authenticated;
  perform set_config('request.jwt.claims', '{"sub":"dddddddd-dddd-dddd-dddd-dddddddddddd","role":"authenticated"}', true);
  select count(*) into d_filas from public.team_summary();
  perform set_config('request.jwt.claims', '{"sub":"bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb","role":"authenticated"}', true);
  select count(*) into b_filas from public.team_summary();
  reset role;
  if d_filas <> 0 or b_filas <> 0 then raise exception 'FALLA 8: vio % / % integrantes sin ser directora', d_filas, b_filas; end if;
end $$;

-- 9) my_team: B ve a su directora y que comparte; A ve su código y 2 integrantes.
do $$
declare b record; a record;
begin
  set local role authenticated;
  perform set_config('request.jwt.claims', '{"sub":"bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb","role":"authenticated"}', true);
  select * into b from public.my_team();
  perform set_config('request.jwt.claims', '{"sub":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa","role":"authenticated"}', true);
  select * into a from public.my_team();
  reset role;
  if b.patrocinadora_nombre <> 'Ana (directora)' or not b.comparte or b.integrantes <> 0 then
    raise exception 'FALLA 9a: my_team de B = % / % / %', b.patrocinadora_nombre, b.comparte, b.integrantes;
  end if;
  if a.patrocinadora_nombre is not null or a.integrantes <> 2 or a.codigo !~ '^[A-Z0-9]{10}$' then
    raise exception 'FALLA 9b: my_team de A = % / % / %', a.patrocinadora_nombre, a.integrantes, a.codigo;
  end if;
end $$;

-- 10) B revoca y vuelve a dar permiso; sin equipo, set_team_sharing falla.
do $$
declare apagado record; encendido record; sin_equipo boolean := false;
begin
  set local role authenticated;
  perform set_config('request.jwt.claims', '{"sub":"bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb","role":"authenticated"}', true);
  perform public.set_team_sharing(false);
  perform set_config('request.jwt.claims', '{"sub":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa","role":"authenticated"}', true);
  select * into apagado from public.team_summary() where nombre = 'Beti';
  perform set_config('request.jwt.claims', '{"sub":"bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb","role":"authenticated"}', true);
  perform public.set_team_sharing(true);
  perform set_config('request.jwt.claims', '{"sub":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa","role":"authenticated"}', true);
  select * into encendido from public.team_summary() where nombre = 'Beti';
  perform set_config('request.jwt.claims', '{"sub":"dddddddd-dddd-dddd-dddd-dddddddddddd","role":"authenticated"}', true);
  begin perform public.set_team_sharing(true); exception when sqlstate 'BT005' then sin_equipo := true; end;
  reset role;
  if apagado.comparte or apagado.ventas_mes_centavos is not null then raise exception 'FALLA 10a: sigue mostrando números tras revocar'; end if;
  if not encendido.comparte or encendido.ventas_mes_centavos <> 500000 then raise exception 'FALLA 10b: no volvió a mostrar tras compartir'; end if;
  if not sin_equipo then raise exception 'FALLA 10c: set_team_sharing funcionó sin equipo'; end if;
end $$;

-- 11) La directora saca a C; no puede sacar a una ajena; B no puede sacar a nadie.
do $$
declare c record; ajena boolean := false; sin_poder boolean := false;
begin
  set local role authenticated;
  perform set_config('request.jwt.claims', '{"sub":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa","role":"authenticated"}', true);
  perform public.remove_team_member('cccccccc-cccc-cccc-cccc-cccccccccccc');
  begin perform public.remove_team_member('dddddddd-dddd-dddd-dddd-dddddddddddd'); exception when sqlstate 'BT006' then ajena := true; end;
  perform set_config('request.jwt.claims', '{"sub":"bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb","role":"authenticated"}', true);
  begin perform public.remove_team_member('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'); exception when sqlstate 'BT006' then sin_poder := true; end;
  reset role;
  select * into c from public.profiles where id = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
  if c.patrocinadora_id is not null or c.comparte_con_patrocinadora then raise exception 'FALLA 11a: C sigue en el equipo'; end if;
  if not ajena then raise exception 'FALLA 11b: sacó a alguien que no era de su equipo'; end if;
  if not sin_poder then raise exception 'FALLA 11c: una integrante pudo sacar a su directora'; end if;
end $$;

-- 12) B sale del equipo: deja de aparecer y de compartir; puede unirse a otro equipo después.
do $$
declare b record; filas int; codigo_d text; reunida boolean := false;
begin
  select codigo_invitacion into codigo_d from public.profiles where id = 'dddddddd-dddd-dddd-dddd-dddddddddddd';
  set local role authenticated;
  perform set_config('request.jwt.claims', '{"sub":"bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb","role":"authenticated"}', true);
  perform public.leave_team();
  perform public.join_team(codigo_d);
  reset role;
  select * into b from public.profiles where id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
  if b.patrocinadora_id <> 'dddddddd-dddd-dddd-dddd-dddddddddddd' then raise exception 'FALLA 12a: no pudo cambiar de equipo'; end if;
  set local role authenticated;
  perform set_config('request.jwt.claims', '{"sub":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa","role":"authenticated"}', true);
  select count(*) into filas from public.team_summary();
  reset role;
  if filas <> 0 then raise exception 'FALLA 12b: A todavía ve % integrantes', filas; end if;
end $$;

-- 13) anon no puede ejecutar ninguna de las funciones.
do $$
declare bloqueadas int := 0;
begin
  set local role anon;
  begin perform public.join_team('X'); exception when insufficient_privilege then bloqueadas := bloqueadas + 1; end;
  begin perform public.leave_team(); exception when insufficient_privilege then bloqueadas := bloqueadas + 1; end;
  begin perform public.set_team_sharing(true); exception when insufficient_privilege then bloqueadas := bloqueadas + 1; end;
  begin perform public.remove_team_member(gen_random_uuid()); exception when insufficient_privilege then bloqueadas := bloqueadas + 1; end;
  begin perform * from public.my_team(); exception when insufficient_privilege then bloqueadas := bloqueadas + 1; end;
  begin perform * from public.team_summary(); exception when insufficient_privilege then bloqueadas := bloqueadas + 1; end;
  reset role;
  if bloqueadas <> 6 then raise exception 'FALLA 13: anon pudo ejecutar % de 6 funciones', 6 - bloqueadas; end if;
end $$;

rollback;
