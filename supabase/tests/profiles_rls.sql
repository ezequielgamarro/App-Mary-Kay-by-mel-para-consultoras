-- Pruebas de RLS y permisos de public.profiles.
-- Se ejecutan DESPUÉS de aplicar la migración, dentro de una transacción que
-- termina en ROLLBACK: no deja datos. Cada bloque lanza una excepción si falla.
-- Usuarias de prueba: A = ...aaaa, B = ...bbbb.

begin;

insert into auth.users (id, instance_id, aud, role, email)
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'a@test.invalid'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'b@test.invalid');

-- 1) El trigger de alta creó un perfil por usuaria.
do $$
begin
  if (select count(*) from public.profiles
      where id in ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb')) <> 2 then
    raise exception 'FALLA 1: el trigger no creó los dos perfiles';
  end if;
end $$;

-- 2) A solo ve su propio perfil.
do $$
declare n int;
begin
  set local role authenticated;
  perform set_config('request.jwt.claims', '{"sub":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa","role":"authenticated"}', true);
  select count(*) into n from public.profiles;
  reset role;
  if n <> 1 then raise exception 'FALLA 2: A ve % perfiles (esperado 1)', n; end if;
end $$;

-- 3) A puede cambiar su nombre, pero no el de B.
do $$
declare propio int; ajeno int;
begin
  set local role authenticated;
  perform set_config('request.jwt.claims', '{"sub":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa","role":"authenticated"}', true);
  update public.profiles set nombre = 'Ana' where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  get diagnostics propio = row_count;
  update public.profiles set nombre = 'hack' where id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
  get diagnostics ajeno = row_count;
  reset role;
  if propio <> 1 then raise exception 'FALLA 3a: A no pudo editar su perfil'; end if;
  if ajeno <> 0 then raise exception 'FALLA 3b: A modificó el perfil de B'; end if;
end $$;

-- 4) A no puede cambiar patrocinadora_id (columna sin permiso de UPDATE).
do $$
begin
  set local role authenticated;
  perform set_config('request.jwt.claims', '{"sub":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa","role":"authenticated"}', true);
  begin
    update public.profiles set patrocinadora_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
      where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
    reset role;
    raise exception 'FALLA 4: A pudo cambiar patrocinadora_id';
  exception when insufficient_privilege then
    reset role;
  end;
end $$;

-- 5) A no puede insertar ni borrar perfiles desde la API.
do $$
begin
  set local role authenticated;
  perform set_config('request.jwt.claims', '{"sub":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa","role":"authenticated"}', true);
  begin
    insert into public.profiles (id) values (gen_random_uuid());
    reset role;
    raise exception 'FALLA 5a: A pudo insertar un perfil';
  exception when insufficient_privilege then
    reset role;
  end;
  set local role authenticated;
  begin
    delete from public.profiles where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
    reset role;
    raise exception 'FALLA 5b: A pudo borrar su perfil';
  exception when insufficient_privilege then
    reset role;
  end;
end $$;

-- 6) Sin sesión (anon) no se accede a la tabla.
do $$
begin
  set local role anon;
  begin
    perform count(*) from public.profiles;
    reset role;
    raise exception 'FALLA 6: anon pudo leer profiles';
  exception when insufficient_privilege then
    reset role;
  end;
end $$;

-- 7) updated_at avanza al editar el nombre. now() está congelado dentro de la
-- transacción, así que se retrasa created_at un día antes de editar.
update public.profiles
  set created_at = now() - interval '1 day'
  where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

update public.profiles
  set nombre = 'Ana María'
  where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

do $$
begin
  if (select updated_at from public.profiles where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa')
     <= (select created_at from public.profiles where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa') then
    raise exception 'FALLA 7: updated_at no se actualizó';
  end if;
end $$;

select 'OK: pruebas de profiles superadas' as resultado;

rollback;
