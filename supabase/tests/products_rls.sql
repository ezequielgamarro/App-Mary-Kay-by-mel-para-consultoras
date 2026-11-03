-- Pruebas de RLS, permisos y restricciones de public.products.
-- Se ejecutan DESPUÉS de aplicar la migración, dentro de una transacción que
-- termina en ROLLBACK: no deja datos. Cada bloque lanza una excepción si falla.
-- Usuarias de prueba: A = ...aaaa, B = ...bbbb.

begin;

insert into auth.users (id, instance_id, aud, role, email)
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'a@test.invalid'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'b@test.invalid');

-- 1) A crea un producto sin indicar user_id: la base lo completa con A.
do $$
declare duena uuid;
begin
  set local role authenticated;
  perform set_config('request.jwt.claims', '{"sub":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa","role":"authenticated"}', true);
  insert into public.products (nombre, codigo, costo_centavos, precio_centavos, stock, stock_minimo)
  values ('Crema de manos', 'CM-01', 350000, 600000, 10, 3) returning user_id into duena;
  reset role;
  if duena <> 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' then
    raise exception 'FALLA 1: user_id = %, esperado A', duena;
  end if;
end $$;

-- 2) A no puede crear un producto a nombre de B.
do $$
declare ok boolean := false;
begin
  set local role authenticated;
  perform set_config('request.jwt.claims', '{"sub":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa","role":"authenticated"}', true);
  begin
    insert into public.products (user_id, nombre) values ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Intruso');
  exception when others then ok := true;
  end;
  reset role;
  if not ok then raise exception 'FALLA 2: A pudo insertar un producto con user_id de B'; end if;
end $$;

-- 3) B no ve los productos de A.
do $$
declare n int;
begin
  set local role authenticated;
  perform set_config('request.jwt.claims', '{"sub":"bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb","role":"authenticated"}', true);
  select count(*) into n from public.products;
  reset role;
  if n <> 0 then raise exception 'FALLA 3: B ve % productos de A', n; end if;
end $$;

-- 4) B no puede editar ni borrar productos de A (0 filas afectadas).
do $$
declare editadas int; borradas int;
begin
  set local role authenticated;
  perform set_config('request.jwt.claims', '{"sub":"bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb","role":"authenticated"}', true);
  update public.products set nombre = 'Hackeado';
  get diagnostics editadas = row_count;
  delete from public.products;
  get diagnostics borradas = row_count;
  reset role;
  if editadas <> 0 or borradas <> 0 then
    raise exception 'FALLA 4: B editó % y borró % productos de A', editadas, borradas;
  end if;
end $$;

-- 5) A edita sus datos, pero no puede reasignar el producto a B ni tocar columnas sin permiso.
do $$
declare editadas int; reasigna boolean := false; created boolean := false;
begin
  set local role authenticated;
  perform set_config('request.jwt.claims', '{"sub":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa","role":"authenticated"}', true);
  update public.products set stock = 7;
  get diagnostics editadas = row_count;
  begin
    update public.products set user_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
  exception when others then reasigna := true;
  end;
  begin
    update public.products set created_at = now();
  exception when others then created := true;
  end;
  reset role;
  if editadas <> 1 then raise exception 'FALLA 5a: A editó % filas (esperado 1)', editadas; end if;
  if not reasigna then raise exception 'FALLA 5b: A pudo reasignar el producto a B'; end if;
  if not created then raise exception 'FALLA 5c: A pudo escribir created_at'; end if;
end $$;

-- 6) Restricciones: nombre vacío, precio negativo, stock negativo y stock excesivo.
do $$
declare vacio boolean := false; precio boolean := false; negativo boolean := false; excesivo boolean := false;
begin
  set local role authenticated;
  perform set_config('request.jwt.claims', '{"sub":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa","role":"authenticated"}', true);
  begin
    insert into public.products (nombre) values ('   ');
  exception when check_violation then vacio := true;
  end;
  begin
    insert into public.products (nombre, precio_centavos) values ('Ok1', -1);
  exception when check_violation then precio := true;
  end;
  begin
    insert into public.products (nombre, stock) values ('Ok2', -1);
  exception when check_violation then negativo := true;
  end;
  begin
    insert into public.products (nombre, stock) values ('Ok3', 1000001);
  exception when check_violation then excesivo := true;
  end;
  reset role;
  if not vacio then raise exception 'FALLA 6a: aceptó un nombre vacío'; end if;
  if not precio then raise exception 'FALLA 6b: aceptó un precio negativo'; end if;
  if not negativo then raise exception 'FALLA 6c: aceptó stock negativo'; end if;
  if not excesivo then raise exception 'FALLA 6d: aceptó un stock mayor al máximo'; end if;
end $$;

-- 7) El código es único por consultora: A no puede repetirlo, B sí puede usar el mismo.
do $$
declare repetido boolean := false; otra_ok boolean := false;
begin
  set local role authenticated;
  perform set_config('request.jwt.claims', '{"sub":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa","role":"authenticated"}', true);
  begin
    insert into public.products (nombre, codigo) values ('Duplicado', 'CM-01');
  exception when unique_violation then repetido := true;
  end;
  -- Dos productos sin código sí se permiten.
  insert into public.products (nombre) values ('Sin codigo 1');
  insert into public.products (nombre) values ('Sin codigo 2');
  perform set_config('request.jwt.claims', '{"sub":"bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb","role":"authenticated"}', true);
  insert into public.products (nombre, codigo) values ('Crema de B', 'CM-01');
  otra_ok := true;
  reset role;
  if not repetido then raise exception 'FALLA 7a: A pudo repetir su código'; end if;
  if not otra_ok then raise exception 'FALLA 7b: B no pudo usar un código que ya usa A'; end if;
end $$;

-- 8) updated_at se actualiza al editar. Se inserta una fila ya "vieja" porque el trigger
--    fuerza updated_at = now() en cada UPDATE (y now() es fijo dentro de la transacción).
do $$
declare pid uuid; despues timestamptz;
begin
  insert into public.products (user_id, nombre, created_at, updated_at)
  values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Vieja', now() - interval '1 day', now() - interval '1 day')
  returning id into pid;
  update public.products set stock = 1 where id = pid;
  select updated_at into despues from public.products where id = pid;
  if despues < now() - interval '1 hour' then raise exception 'FALLA 8: updated_at no cambió'; end if;
end $$;

-- 9) A puede borrar sus productos.
do $$
declare borradas int;
begin
  set local role authenticated;
  perform set_config('request.jwt.claims', '{"sub":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa","role":"authenticated"}', true);
  delete from public.products;
  get diagnostics borradas = row_count;
  reset role;
  if borradas < 1 then raise exception 'FALLA 9: A no pudo borrar sus productos'; end if;
end $$;

-- 10) anon no tiene acceso a la tabla.
do $$
declare ok boolean := false;
begin
  set local role anon;
  begin
    perform count(*) from public.products;
  exception when insufficient_privilege then ok := true;
  end;
  reset role;
  if not ok then raise exception 'FALLA 10: anon pudo leer public.products'; end if;
end $$;

rollback;
