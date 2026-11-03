import { supabase } from '@/core/supabase/client';

import type { ProductRepository, RepoResult } from '../domain/productRepository';
import { PRODUCT_COLUMNS, toProduct, toWritableRow, type ProductRow } from './productMapper';

const IMAGES_BUCKET = 'product-images';
/** Las URLs firmadas duran 1 hora: alcanza para una sesión de uso y no queda una copia pública. */
const SIGNED_URL_SECONDS = 3600;
const IMAGE_ERROR = 'No pudimos subir la foto. Revisá tu conexión y probá de nuevo.';
const GENERIC_ERROR = 'No pudimos completar la acción. Revisá tu conexión y probá de nuevo.';
const DUPLICATE_CODE = 'Ya tenés un producto con ese código.';

function fail<T>(error: object): RepoResult<T> {
  // El detalle técnico va solo al log; la usuaria ve un mensaje claro.
  console.warn('[products] error de Supabase', error);
  // 23505 = violación de unicidad: el índice (user_id, codigo).
  const code = 'code' in error ? error.code : undefined;
  return { ok: false, message: code === '23505' ? DUPLICATE_CODE : GENERIC_ERROR };
}

export const supabaseProductRepository: ProductRepository = {
  async list() {
    const { data, error } = await supabase
      .from('products')
      .select(PRODUCT_COLUMNS)
      .order('nombre', { ascending: true })
      .returns<ProductRow[]>();
    if (error) return fail(error);
    return { ok: true, data: data.map(toProduct) };
  },

  async get(id) {
    const { data, error } = await supabase
      .from('products')
      .select(PRODUCT_COLUMNS)
      .eq('id', id)
      .maybeSingle<ProductRow>();
    if (error) return fail(error);
    return { ok: true, data: data ? toProduct(data) : null };
  },

  async create(input) {
    const { data, error } = await supabase
      .from('products')
      .insert(toWritableRow(input))
      .select(PRODUCT_COLUMNS)
      .single<ProductRow>();
    if (error) return fail(error);
    return { ok: true, data: toProduct(data) };
  },

  async update(id, input) {
    const { data, error } = await supabase
      .from('products')
      .update(toWritableRow(input))
      .eq('id', id)
      .select(PRODUCT_COLUMNS)
      .single<ProductRow>();
    if (error) return fail(error);
    return { ok: true, data: toProduct(data) };
  },

  async remove(id) {
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) return fail(error);
    return { ok: true, data: null };
  },

  async uploadImage(localUri) {
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData.session?.user.id;
    if (!userId) return { ok: false, message: GENERIC_ERROR };

    try {
      const body = await (await fetch(localUri)).arrayBuffer();
      // Ruta nueva en cada subida: así nunca se sirve una versión vieja desde la caché.
      const path = `${userId}/${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}.jpg`;
      const { error } = await supabase.storage
        .from(IMAGES_BUCKET)
        .upload(path, body, { contentType: 'image/jpeg', upsert: false });
      if (error) {
        console.warn('[products] error al subir la imagen', error);
        return { ok: false, message: IMAGE_ERROR };
      }
      return { ok: true, data: path };
    } catch (error) {
      console.warn('[products] error al leer o subir la imagen', error);
      return { ok: false, message: IMAGE_ERROR };
    }
  },

  async removeImage(path) {
    const { error } = await supabase.storage.from(IMAGES_BUCKET).remove([path]);
    if (error) return fail(error);
    return { ok: true, data: null };
  },

  async signedImageUrls(paths) {
    if (paths.length === 0) return { ok: true, data: {} };
    const { data, error } = await supabase.storage
      .from(IMAGES_BUCKET)
      .createSignedUrls(paths, SIGNED_URL_SECONDS);
    if (error) return fail(error);
    const urls: Record<string, string> = {};
    for (const item of data) {
      if (item.path && item.signedUrl) urls[item.path] = item.signedUrl;
    }
    return { ok: true, data: urls };
  },
};
