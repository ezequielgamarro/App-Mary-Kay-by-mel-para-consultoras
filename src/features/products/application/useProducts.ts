import { useCallback, useEffect, useState } from 'react';

import { useLoad } from '@/core/data/useLoad';

import { supabaseProductRepository } from '../data/supabaseProductRepository';
import {
  productFormSchema,
  type ImageChange,
  type Product,
  type ProductForm,
} from '../domain/product';
import type { ProductRepository, RepoResult } from '../domain/productRepository';

export function useProductList(repository: ProductRepository = supabaseProductRepository) {
  const load = useCallback(() => repository.list(), [repository]);
  return useLoad<Product[]>(load);
}

export function useProduct(
  id: string | undefined,
  repository: ProductRepository = supabaseProductRepository,
) {
  const load = useCallback(
    () =>
      id
        ? repository.get(id)
        : Promise.resolve<RepoResult<Product | null>>({ ok: true, data: null }),
    [id, repository],
  );
  return useLoad<Product | null>(load);
}

/**
 * URLs temporales de las fotos (bucket privado), indexadas por ruta. Si falla, simplemente
 * no hay URL: la UI muestra el producto sin foto en vez de bloquearse.
 */
export function useProductImageUrls(
  paths: string[],
  repository: ProductRepository = supabaseProductRepository,
): Record<string, string> {
  const [urls, setUrls] = useState<Record<string, string>>({});
  const key = paths.join('|');

  useEffect(() => {
    if (!key) return;
    let active = true;
    repository.signedImageUrls(key.split('|')).then((result) => {
      if (active && result.ok) setUrls(result.data);
    });
    return () => {
      active = false;
    };
  }, [key, repository]);

  return key ? urls : {};
}

export type SaveResult =
  { ok: true; product: Product } | { ok: false; message: string; field?: keyof ProductForm };

export type ImageEdit = {
  /** Ruta de la foto que tiene hoy el producto (null si no tiene o es un alta). */
  previousPath: string | null;
  change: ImageChange;
};

const KEEP: ImageEdit = { previousPath: null, change: { type: 'keep' } };

/** Casos de uso de escritura: validan el formulario, manejan la foto y delegan en el repositorio. */
export function useProductActions(repository: ProductRepository = supabaseProductRepository) {
  const save = useCallback(
    async (id: string | null, form: ProductForm, image: ImageEdit = KEEP): Promise<SaveResult> => {
      const parsed = productFormSchema.safeParse(form);
      if (!parsed.success) {
        const issue = parsed.error.issues[0];
        const field = issue?.path[0];
        return {
          ok: false,
          message: issue?.message ?? 'Revisá los datos ingresados.',
          field: typeof field === 'string' ? (field as keyof ProductForm) : undefined,
        };
      }

      let imagenPath = image.previousPath;
      let uploadedPath: string | null = null;
      if (image.change.type === 'replace') {
        const uploaded = await repository.uploadImage(image.change.localUri);
        if (!uploaded.ok) return { ok: false, message: uploaded.message };
        uploadedPath = uploaded.data;
        imagenPath = uploaded.data;
      } else if (image.change.type === 'remove') {
        imagenPath = null;
      }

      const input = { ...parsed.data, imagenPath };
      const result = id ? await repository.update(id, input) : await repository.create(input);
      if (!result.ok) {
        // No dejar un archivo huérfano si el producto no se pudo guardar.
        if (uploadedPath) await repository.removeImage(uploadedPath);
        return { ok: false, message: result.message };
      }

      // La foto anterior ya no se usa: limpiarla (si falla no es grave, solo ocupa lugar).
      if (image.previousPath && image.previousPath !== imagenPath) {
        await repository.removeImage(image.previousPath);
      }
      return { ok: true, product: result.data };
    },
    [repository],
  );

  const remove = useCallback(
    async (product: Pick<Product, 'id' | 'imagenPath'>) => {
      const result = await repository.remove(product.id);
      if (result.ok && product.imagenPath) await repository.removeImage(product.imagenPath);
      return result;
    },
    [repository],
  );

  return { save, remove };
}
