-- Pruebas de RLS y permisos de public.clients.
-- Se ejecutan DESPUÉS de aplicar la migración, dentro de una transacción que
-- termina en ROLLBACK: no deja datos. Cada bloque lanza una excepción si falla.
-- Usuarias de prueba: A = ...aaaa, B = ...bbbb.

begin;

insert into auth.users (id, instance_id, aud, role, email)
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'a@test.invalid'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'b@test.invalid');

-- 1) A crea una clienta sin indicar user_id: la base lo completa con A.
do $$
declare duena uuid;
begin
  set local role authenticated;
  perform set_config('request.jwt.claims', '{"sub":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa","role":"authenticated"}', true);
  insert into public.clients (nombre, telefono) values ('Marta', '+54 9 11 5555-0000') returning user_id into duena;
  reset role;
  if duena <> 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' then
    raise exception 'FALLA 1: user_id = %, esperado A', duena;
  end if;
end $$;

-- 2) A no puede crear una clienta a nombre de B.
do $$
declare ok boolean := false;
begin
  set local role authenticated;
  perform set_config('request.jwt.claims', '{"sub":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa","role":"authenticated"}', true);
  begin
    insert into public.clients (user_id, nombre) values ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Intrusa');
  exception when others then ok := true;
  end;
  reset role;
  if not ok then raise exception 'FALLA 2: A pudo insertar una clienta con user_id de B'; end if;
end $$;

-- 3) B no ve las clientas de A.
do $$
declare n int;
begin
  set local role authenticated;
  perform set_config('request.jwt.claims', '{"sub":"bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb","role":"authenticated"}', true);
  select count(*) into n from public.clients;
  reset role;
  if n <> 0 then raise exception 'FALLA 3: B ve % clientas de A', n; end if;
end $$;

-- 4) B no puede editar ni borrar clientas de A (0 filas afectadas).
do $$
declare editadas int; borradas int;
begin
  set local role authenticated;
  perform set_config('request.jwt.claims', '{"sub":"bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb","role":"authenticated"}', true);
  update public.clients set nombre = 'Hackeada';
  get diagnostics editadas = row_count;
  delete from public.clients;
  get diagnostics borradas = row_count;
  reset role;
  if editadas <> 0 or borradas <> 0 then
    raise exception 'FALLA 4: B editó % y borró % clientas de A', editadas, borradas;
  end if;
end $$;

-- 5) A puede editar sus datos, pero no reasignar la clienta a B (user_id sin permiso de escritura).
do $$
declare editadas int; ok boolean := false;
begin
  set local role authenticated;
  perform set_config('request.jwt.claims', '{"sub":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa","role":"authenticated"}', true);
  update public.clients set nombre = 'Marta G.';
  get diagnostics editadas = row_count;
  begin
    update public.clients set user_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
  exception when others then ok := true;
  end;
  reset role;
  if editadas <> 1 then raise exception 'FALLA 5a: A editó % filas (esperado 1)', editadas; end if;
  if not ok then raise exception 'FALLA 5b: A pudo reasignar la clienta a B'; end if;
end $$;

-- 6) Validaciones: nombre vacío o solo espacios, y teléfono demasiado largo.
do $$
declare vacio boolean := false; largo boolean := false;
begin
  set local role authenticated;
  perform set_config('request.jwt.claims', '{"sub":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa","role":"authenticated"}', true);
  begin
    insert into public.clients (nombre) values ('   ');
  exception when check_violation then vacio := true;
  end;
  begin
    insert into public.clients (nombre, telefono) values ('Ok', repeat('1', 31));
  exception when check_violation then largo := true;
  end;
  reset role;
  if not vacio then raise exception 'FALLA 6a: aceptó un nombre vacío'; end if;
  if not largo then raise exception 'FALLA 6b: aceptó un teléfono de más de 30 caracteres'; end if;
end $$;

-- 7) updated_at se actualiza al editar. Se inserta una fila ya "vieja" porque el trigger
--    fuerza updated_at = now() en cada UPDATE (y now() es fijo dentro de la transacción).
do $$
declare cid uuid; despues timestamptz;
begin
  insert into public.clients (user_id, nombre, created_at, updated_at)
  values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Vieja', now() - interval '1 day', now() - interval '1 day')
  returning id into cid;
  update public.clients set notas = 'x' where id = cid;
  select updated_at into despues from public.clients where id = cid;
  if despues < now() - interval '1 hour' then raise exception 'FALLA 7: updated_at no cambió'; end if;
end $$;

-- 8) A puede borrar su clienta.
do $$
declare borradas int;
begin
  set local role authenticated;
  perform set_config('request.jwt.claims', '{"sub":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa","role":"authenticated"}', true);
  delete from public.clients;
  get diagnostics borradas = row_count;
  reset role;
  if borradas < 1 then raise exception 'FALLA 8: A no pudo borrar sus clientas'; end if;
end $$;

-- 9) anon no tiene acceso a la tabla.
do $$
declare ok boolean := false;
begin
  set local role anon;
  begin
    perform count(*) from public.clients;
  exception when insufficient_privilege then ok := true;
  end;
  reset role;
  if not ok then raise exception 'FALLA 9: anon pudo leer public.clients'; end if;
end $$;

rollback;
