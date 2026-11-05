-- Pruebas de notas (public.notes) y su RLS.
-- Se ejecutan DESPUÉS de aplicar la migración, dentro de una transacción que
-- termina en ROLLBACK: no deja datos. Cada bloque lanza una excepción si falla.
-- Usuarias de prueba: A = ...aaaa, B = ...bbbb.

begin;

insert into auth.users (id, instance_id, aud, role, email)
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'a@test.invalid'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'b@test.invalid');

-- 1) A crea una nota; el user_id lo pone la base; título vacío, largo o user_id ajeno se rechazan.
do $$
declare dueña uuid; vacio boolean := false; largo boolean := false; enorme boolean := false; ajeno boolean := false;
begin
  set local role authenticated;
  perform set_config('request.jwt.claims', '{"sub":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa","role":"authenticated"}', true);
  insert into public.notes (titulo, contenido) values ('Pedido de ciclo', 'Llamar a la directora');
  select user_id into dueña from public.notes;
  begin insert into public.notes (titulo) values ('   '); exception when check_violation then vacio := true; end;
  begin insert into public.notes (titulo) values (repeat('x', 121)); exception when check_violation then largo := true; end;
  begin insert into public.notes (titulo, contenido) values ('ok', repeat('x', 10001)); exception when check_violation then enorme := true; end;
  begin insert into public.notes (user_id, titulo) values ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'ajena');
  exception when insufficient_privilege then ajeno := true; end;
  reset role;
  if dueña <> 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' then raise exception 'FALLA 1a: dueña incorrecta'; end if;
  if not vacio then raise exception 'FALLA 1b: aceptó título vacío'; end if;
  if not largo then raise exception 'FALLA 1c: aceptó título largo'; end if;
  if not enorme then raise exception 'FALLA 1d: aceptó contenido enorme'; end if;
  if not ajeno then raise exception 'FALLA 1e: A pudo escribir user_id'; end if;
end $$;

-- 2) A edita su nota (título y contenido) pero no puede cambiar la dueña ni la fecha de creación.
do $$
declare editado text; dueña_cambiada boolean := false; creada_cambiada boolean := false;
begin
  set local role authenticated;
  perform set_config('request.jwt.claims', '{"sub":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa","role":"authenticated"}', true);
  update public.notes set titulo = 'Pedido de noviembre', contenido = 'listo';
  select titulo into editado from public.notes;
  begin update public.notes set user_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'; exception when insufficient_privilege then dueña_cambiada := true; end;
  begin update public.notes set created_at = now(); exception when insufficient_privilege then creada_cambiada := true; end;
  reset role;
  if editado <> 'Pedido de noviembre' then raise exception 'FALLA 2a: no editó'; end if;
  if not dueña_cambiada then raise exception 'FALLA 2b: cambió la dueña'; end if;
  if not creada_cambiada then raise exception 'FALLA 2c: cambió created_at'; end if;
end $$;

-- 3) B no ve, no edita y no borra las notas de A.
do $$
declare visibles int; tocadas int; borradas int; restantes int;
begin
  set local role authenticated;
  perform set_config('request.jwt.claims', '{"sub":"bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb","role":"authenticated"}', true);
  select count(*) into visibles from public.notes;
  update public.notes set titulo = 'hackeada';
  get diagnostics tocadas = row_count;
  delete from public.notes;
  get diagnostics borradas = row_count;
  reset role;
  select count(*) into restantes from public.notes where titulo = 'Pedido de noviembre';
  if visibles <> 0 then raise exception 'FALLA 3a: B ve notas de A'; end if;
  if tocadas <> 0 then raise exception 'FALLA 3b: B editó notas de A'; end if;
  if borradas <> 0 then raise exception 'FALLA 3c: B borró notas de A'; end if;
  if restantes <> 1 then raise exception 'FALLA 3d: la nota de A cambió'; end if;
end $$;

-- 4) A borra la suya; anónimo no accede a nada.
do $$
declare restantes int; bloqueado boolean := false;
begin
  set local role authenticated;
  perform set_config('request.jwt.claims', '{"sub":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa","role":"authenticated"}', true);
  delete from public.notes;
  select count(*) into restantes from public.notes;
  reset role;
  set local role anon;
  begin perform count(*) from public.notes; exception when insufficient_privilege then bloqueado := true; end;
  reset role;
  if restantes <> 0 then raise exception 'FALLA 4a: no borró'; end if;
  if not bloqueado then raise exception 'FALLA 4b: anon leyó notas'; end if;
end $$;

rollback;
