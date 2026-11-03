-- Imagen de referencia de cada producto.
--
-- Modelo de acceso:
--   * Las fotos viven en el bucket PRIVADO `product-images`, en la carpeta de cada
--     consultora: `<user_id>/<archivo>.jpg`. Solo ella puede leer, subir, reemplazar
--     o borrar archivos de su carpeta (políticas sobre storage.objects).
--   * La app las muestra con URLs firmadas y temporales; nada es público.
--   * `products.imagen_path` guarda la ruta del archivo y solo puede apuntar a la
--     carpeta de la propia dueña (no a la de otra consultora).
--   * Límite de 1 MB por archivo y solo JPEG o WebP (la app comprime antes de subir).

alter table public.products add column imagen_path text;

alter table public.products add constraint products_imagen_path_valida
  check (
    imagen_path is null
    or (char_length(imagen_path) <= 200 and starts_with(imagen_path, user_id::text || '/'))
  );

grant insert (imagen_path) on public.products to authenticated;
grant update (imagen_path) on public.products to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('product-images', 'product-images', false, 1048576, array['image/jpeg', 'image/webp'])
on conflict (id) do nothing;

create policy product_images_select_propias on storage.objects
  for select to authenticated
  using (
    bucket_id = 'product-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy product_images_insert_propias on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'product-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy product_images_update_propias on storage.objects
  for update to authenticated
  using (
    bucket_id = 'product-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'product-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy product_images_delete_propias on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'product-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

-- Reversión (no se ejecuta; guardada por si hay que deshacer):
--   drop policy product_images_select_propias on storage.objects;
--   drop policy product_images_insert_propias on storage.objects;
--   drop policy product_images_update_propias on storage.objects;
--   drop policy product_images_delete_propias on storage.objects;
--   delete from storage.objects where bucket_id = 'product-images';
--   delete from storage.buckets where id = 'product-images';
--   alter table public.products drop constraint products_imagen_path_valida;
--   alter table public.products drop column imagen_path;
