import type { Product, ProductInput } from '../domain/product';

/** Fila tal como la devuelve la tabla `public.products`. */
export type ProductRow = {
  id: string;
  nombre: string;
  codigo: string | null;
  costo_centavos: number;
  precio_centavos: number;
  stock: number;
  stock_minimo: number;
  imagen_path: string | null;
  created_at: string;
  updated_at: string;
};

export const PRODUCT_COLUMNS =
  'id, nombre, codigo, costo_centavos, precio_centavos, stock, stock_minimo, imagen_path, created_at, updated_at';

export function toProduct(row: ProductRow): Product {
  return {
    id: row.id,
    nombre: row.nombre,
    codigo: row.codigo,
    costoCentavos: row.costo_centavos,
    precioCentavos: row.precio_centavos,
    stock: row.stock,
    stockMinimo: row.stock_minimo,
    imagenPath: row.imagen_path,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** Solo las columnas que la consultora puede escribir (`user_id` lo pone la base). */
export function toWritableRow(input: ProductInput) {
  return {
    nombre: input.nombre,
    codigo: input.codigo,
    costo_centavos: input.costoCentavos,
    precio_centavos: input.precioCentavos,
    stock: input.stock,
    stock_minimo: input.stockMinimo,
    imagen_path: input.imagenPath,
  };
}
