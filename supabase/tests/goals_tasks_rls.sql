-- Pruebas de metas y tareas (public.goals, public.tasks) y su RLS.
-- Se ejecutan DESPUÉS de aplicar la migración, dentro de una transacción que
-- termina en ROLLBACK: no deja datos. Cada bloque lanza una excepción si falla.
-- Usuarias de prueba: A = ...aaaa, B = ...bbbb.

begin;

insert into auth.users (id, instance_id, aud, role, email)
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'a@test.invalid'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'b@test.invalid');

-- 1) A crea su meta del mes; el user_id lo pone la base; no puede repetir el mes.
do $$
declare dueña uuid; repetida boolean := false;
begin
  set local role authenticated;
  perform set_config('request.jwt.claims', '{"sub":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa","role":"authenticated"}', true);
  insert into public.goals (mes, ventas_centavos, ganancia_centavos) values ('2026-11-01', 50000000, 20000000);
  select user_id into dueña from public.goals where mes = '2026-11-01';
  begin
    insert into public.goals (mes, ventas_centavos) values ('2026-11-01', 1);
  exception when unique_violation then repetida := true;
  end;
  reset role;
  if dueña <> 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' then raise exception 'FALLA 1a: dueña incorrecta'; end if;
  if not repetida then raise exception 'FALLA 1b: aceptó dos metas para el mismo mes'; end if;
end $$;

-- 2) Datos inválidos: mes que no es día 1, importes negativos, user_id ajeno.
do $$
declare mes_malo boolean := false; negativa boolean := false; ganancia_neg boolean := false; ajeno boolean := false;
begin
  set local role authenticated;
  perform set_config('request.jwt.claims', '{"sub":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa","role":"authenticated"}', true);
  begin insert into public.goals (mes, ventas_centavos) values ('2026-12-15', 1);
  exception when check_violation then mes_malo := true; end;
  begin insert into public.goals (mes, ventas_centavos) values ('2026-12-01', -1);
  exception when check_violation then negativa := true; end;
  begin insert into public.goals (mes, ventas_centavos, ganancia_centavos) values ('2026-12-01', 1, -5);
  exception when check_violation then ganancia_neg := true; end;
  begin insert into public.goals (user_id, mes) values ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '2027-01-01');
  exception when insufficient_privilege then ajeno := true; end;
  reset role;
  if not mes_malo then raise exception 'FALLA 2a: aceptó un mes que no es día 1'; end if;
  if not negativa then raise exception 'FALLA 2b: aceptó una meta negativa'; end if;
  if not ganancia_neg then raise exception 'FALLA 2c: aceptó una ganancia negativa'; end if;
  if not ajeno then raise exception 'FALLA 2d: A pudo escribir user_id'; end if;
end $$;

-- 3) A puede actualizar su meta (upsert), pero no cambiar el mes ni la dueña.
do $$
declare cambiada int; mes_cambiado boolean := false; dueña_cambiada boolean := false; valor bigint;
begin
  set local role authenticated;
  perform set_config('request.jwt.claims', '{"sub":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa","role":"authenticated"}', true);
  update public.goals set ventas_centavos = 70000000 where mes = '2026-11-01';
  get diagnostics cambiada = row_count;
  select ventas_centavos into valor from public.goals where mes = '2026-11-01';
  begin update public.goals set mes = '2026-10-01'; exception when insufficient_privilege then mes_cambiado := true; end;
  begin update public.goals set user_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'; exception when insufficient_privilege then dueña_cambiada := true; end;
  reset role;
  if cambiada <> 1 or valor <> 70000000 then raise exception 'FALLA 3a: no pudo actualizar su meta'; end if;
  if not mes_cambiado then raise exception 'FALLA 3b: pudo cambiar el mes'; end if;
  if not dueña_cambiada then raise exception 'FALLA 3c: pudo reasignar la meta'; end if;
end $$;

-- 4) Tareas: A crea una; el título no puede estar vacío ni ser larguísimo; hecha arranca en false.
do $$
declare t record; vacio boolean := false; largo boolean := false; sin_fecha boolean := false;
begin
  set local role authenticated;
  perform set_config('request.jwt.claims', '{"sub":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa","role":"authenticated"}', true);
  insert into public.tasks (titulo, fecha) values ('Llamar a Marta', '2026-11-05');
  select * into t from public.tasks where titulo = 'Llamar a Marta';
  begin insert into public.tasks (titulo, fecha) values ('   ', '2026-11-05');
  exception when check_violation then vacio := true; end;
  begin insert into public.tasks (titulo, fecha) values (repeat('x', 201), '2026-11-05');
  exception when check_violation then largo := true; end;
  begin insert into public.tasks (titulo, fecha) values ('Sin fecha', null);
  exception when not_null_violation then sin_fecha := true; end;
  reset role;
  if t.user_id <> 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' or t.hecha then
    raise exception 'FALLA 4a: tarea mal creada';
  end if;
  if not vacio then raise exception 'FALLA 4b: aceptó un título vacío'; end if;
  if not largo then raise exception 'FALLA 4c: aceptó un título de más de 200 caracteres'; end if;
  if not sin_fecha then raise exception 'FALLA 4d: aceptó una tarea sin fecha'; end if;
end $$;

-- 5) A marca la tarea como hecha y la edita; no puede reasignarla.
do $$
declare hechas int; reasignada boolean := false; est boolean;
begin
  set local role authenticated;
  perform set_config('request.jwt.claims', '{"sub":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa","role":"authenticated"}', true);
  update public.tasks set hecha = true, titulo = 'Llamé a Marta' where titulo = 'Llamar a Marta';
  get diagnostics hechas = row_count;
  select hecha into est from public.tasks;
  begin update public.tasks set user_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'; exception when insufficient_privilege then reasignada := true; end;
  reset role;
  if hechas <> 1 or not est then raise exception 'FALLA 5a: no pudo marcar la tarea como hecha'; end if;
  if not reasignada then raise exception 'FALLA 5b: pudo reasignar la tarea'; end if;
end $$;

-- 6) Aislamiento: B no ve, edita ni borra nada de A.
do $$
declare metas int; tareas int; editadas int; borradas int; metas_borradas int;
begin
  set local role authenticated;
  perform set_config('request.jwt.claims', '{"sub":"bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb","role":"authenticated"}', true);
  select count(*) into metas from public.goals;
  select count(*) into tareas from public.tasks;
  update public.tasks set titulo = 'hackeada';
  get diagnostics editadas = row_count;
  delete from public.tasks;
  get diagnostics borradas = row_count;
  delete from public.goals;
  get diagnostics metas_borradas = row_count;
  reset role;
  if metas <> 0 or tareas <> 0 then raise exception 'FALLA 6a: B ve % metas y % tareas de A', metas, tareas; end if;
  if editadas <> 0 or borradas <> 0 or metas_borradas <> 0 then
    raise exception 'FALLA 6b: B modificó datos de A (% / % / %)', editadas, borradas, metas_borradas;
  end if;
end $$;

-- 7) A puede borrar lo suyo.
do $$
declare t int; g int;
begin
  set local role authenticated;
  perform set_config('request.jwt.claims', '{"sub":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa","role":"authenticated"}', true);
  delete from public.tasks;
  get diagnostics t = row_count;
  delete from public.goals;
  get diagnostics g = row_count;
  reset role;
  if t <> 1 or g <> 1 then raise exception 'FALLA 7: borró % tareas y % metas (esperado 1 y 1)', t, g; end if;
end $$;

-- 8) anon no accede a ninguna de las dos tablas.
do $$
declare metas boolean := false; tareas boolean := false;
begin
  set local role anon;
  begin perform count(*) from public.goals; exception when insufficient_privilege then metas := true; end;
  begin perform count(*) from public.tasks; exception when insufficient_privilege then tareas := true; end;
  reset role;
  if not metas then raise exception 'FALLA 8a: anon pudo leer goals'; end if;
  if not tareas then raise exception 'FALLA 8b: anon pudo leer tasks'; end if;
end $$;

-- 9) updated_at se actualiza al modificar (fila envejecida a propósito).
do $$
declare antes timestamptz; despues timestamptz;
begin
  insert into public.tasks (user_id, titulo, fecha, updated_at)
  values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Vieja', '2026-11-05', now() - interval '1 day');
  select updated_at into antes from public.tasks where titulo = 'Vieja';
  update public.tasks set hecha = true where titulo = 'Vieja';
  select updated_at into despues from public.tasks where titulo = 'Vieja';
  if despues <= antes then raise exception 'FALLA 9: updated_at no cambió'; end if;
end $$;

rollback;
