-- Pruebas del bucket `product-images` y de products.imagen_path.
-- Se ejecutan DESPUÉS de aplicar la migración, dentro de una transacción que
-- termina en ROLLBACK: no deja datos. Cada bloque lanza una excepción si falla.
-- Usuarias de prueba: A = ...aaaa, B = ...bbbb.

begin;

insert into auth.users (id, instance_id, aud, role, email)
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'a@test.invalid'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'b@test.invalid');

-- 1) El bucket existe, es privado, limita a 1 MB y solo admite JPEG/WebP.
do $$
declare b record;
begin
  select * into b from storage.buckets where id = 'product-images';
  if b.id is null then raise exception 'FALLA 1a: no existe el bucket'; end if;
  if b.public then raise exception 'FALLA 1b: el bucket es público'; end if;
  if b.file_size_limit <> 1048576 then raise exception 'FALLA 1c: límite = %', b.file_size_limit; end if;
  if b.allowed_mime_types is distinct from array['image/jpeg', 'image/webp'] then
    raise exception 'FALLA 1d: tipos permitidos = %', b.allowed_mime_types;
  end if;
end $$;

-- 2) A puede registrar un archivo en su carpeta; no puede hacerlo en la de B ni en otro bucket.
do $$
declare ajena boolean := false; otro_bucket boolean := false;
begin
  set local role authenticated;
  perform set_config('request.jwt.claims', '{"sub":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa","role":"authenticated"}', true);
  insert into storage.objects (bucket_id, name)
  values ('product-images', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa/foto1.jpg');
  begin
    insert into storage.objects (bucket_id, name)
    values ('product-images', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb/intruso.jpg');
  exception when others then ajena := true;
  end;
  begin
    insert into storage.objects (bucket_id, name)
    values ('otro-bucket', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa/x.jpg');
  exception when others then otro_bucket := true;
  end;
  reset role;
  if not ajena then raise exception 'FALLA 2a: A pudo subir a la carpeta de B'; end if;
  if not otro_bucket then raise exception 'FALLA 2b: A pudo escribir en otro bucket'; end if;
end $$;

-- 3) B no ve ni edita los archivos de A. (El borrado no se prueba por SQL: Supabase bloquea
--    `delete from storage.objects` con un trigger y obliga a usar la API; ver prueba 7.)
do $$
declare vistos int; editados int;
begin
  set local role authenticated;
  perform set_config('request.jwt.claims', '{"sub":"bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb","role":"authenticated"}', true);
  select count(*) into vistos from storage.objects where bucket_id = 'product-images';
  update storage.objects set name = name where bucket_id = 'product-images';
  get diagnostics editados = row_count;
  reset role;
  if vistos <> 0 or editados <> 0 then
    raise exception 'FALLA 3: B vio % y editó % archivos de A', vistos, editados;
  end if;
end $$;

-- 4) A ve su archivo; anon no ve nada.
do $$
declare propios int; anonimos int;
begin
  set local role authenticated;
  perform set_config('request.jwt.claims', '{"sub":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa","role":"authenticated"}', true);
  select count(*) into propios from storage.objects where bucket_id = 'product-images';
  reset role;
  set local role anon;
  select count(*) into anonimos from storage.objects where bucket_id = 'product-images';
  reset role;
  if propios <> 1 then raise exception 'FALLA 4a: A ve % archivos (esperado 1)', propios; end if;
  if anonimos <> 0 then raise exception 'FALLA 4b: anon ve % archivos', anonimos; end if;
end $$;

-- 5) products.imagen_path: A puede apuntar a su carpeta, pero no a la de B ni a una ruta suelta.
do $$
declare propia boolean := false; ajena boolean := false; suelta boolean := false; larga boolean := false;
begin
  set local role authenticated;
  perform set_config('request.jwt.claims', '{"sub":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa","role":"authenticated"}', true);
  insert into public.products (nombre, imagen_path)
  values ('Con foto', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa/foto1.jpg');
  propia := true;
  begin
    insert into public.products (nombre, imagen_path)
    values ('Robo', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb/foto.jpg');
  exception when check_violation then ajena := true;
  end;
  begin
    insert into public.products (nombre, imagen_path) values ('Suelta', 'foto.jpg');
  exception when check_violation then suelta := true;
  end;
  begin
    insert into public.products (nombre, imagen_path)
    values ('Larga', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa/' || repeat('x', 200));
  exception when check_violation then larga := true;
  end;
  reset role;
  if not propia then raise exception 'FALLA 5a: A no pudo guardar su ruta'; end if;
  if not ajena then raise exception 'FALLA 5b: A pudo apuntar a la carpeta de B'; end if;
  if not suelta then raise exception 'FALLA 5c: aceptó una ruta sin carpeta'; end if;
  if not larga then raise exception 'FALLA 5d: aceptó una ruta de más de 200 caracteres'; end if;
end $$;

-- 6) A puede quitar la imagen del producto (imagen_path = null).
do $$
declare quitadas int;
begin
  set local role authenticated;
  perform set_config('request.jwt.claims', '{"sub":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa","role":"authenticated"}', true);
  update public.products set imagen_path = null where nombre = 'Con foto';
  get diagnostics quitadas = row_count;
  reset role;
  if quitadas <> 1 then raise exception 'FALLA 6: no pudo quitar la imagen'; end if;
end $$;

-- 7) Existen las 4 políticas de la carpeta propia (la de borrado se aplica vía la API de Storage).
do $$
declare faltan text;
begin
  select string_agg(c, ', ') into faltan
  from unnest(array['SELECT', 'INSERT', 'UPDATE', 'DELETE']) as c
  where not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and policyname = 'product_images_' || lower(c) || '_propias'
      and cmd = c
      and 'authenticated' = any (roles)
      and coalesce(qual, with_check) like '%product-images%'
      and coalesce(qual, with_check) like '%storage.foldername%'
  );
  if faltan is not null then raise exception 'FALLA 7: faltan políticas para %', faltan; end if;
end $$;

rollback;
