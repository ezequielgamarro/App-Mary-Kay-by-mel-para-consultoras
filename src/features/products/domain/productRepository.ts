import type { RepoResult } from '@/core/data/repoResult';

import type { Product, ProductInput } from './product';

export type { RepoResult };

/** Contrato de acceso a datos de productos: la UI y los hooks solo conocen esta interfaz. */
export interface ProductRepository {
  list(): Promise<RepoResult<Product[]>>;
  get(id: string): Promise<RepoResult<Product | null>>;
  create(input: ProductInput): Promise<RepoResult<Product>>;
  update(id: string, input: ProductInput): Promise<RepoResult<Product>>;
  remove(id: string): Promise<RepoResult<null>>;
  /** Sube una imagen local ya comprimida a la carpeta de la consultora y devuelve su ruta. */
  uploadImage(localUri: string): Promise<RepoResult<string>>;
  removeImage(path: string): Promise<RepoResult<null>>;
  /** URLs temporales para mostrar imágenes del bucket privado, indexadas por ruta. */
  signedImageUrls(paths: string[]): Promise<RepoResult<Record<string, string>>>;
}
