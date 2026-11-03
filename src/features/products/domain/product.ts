import { z } from 'zod';

import { MAX_CENTS, parseArs } from '@/core/money/parseArs';
import { normalizeSearch } from '@/core/text/normalizeSearch';

export type Product = {
  id: string;
  nombre: string;
  codigo: string | null;
  costoCentavos: number;
  precioCentavos: number;
  stock: number;
  stockMinimo: number;
  /** Ruta del archivo en el bucket privado `product-images`, o null si no tiene foto. */
  imagenPath: string | null;
  createdAt: string;
  updatedAt: string;
};

/** Campos de texto del formulario, ya validados y normalizados. */
export type ProductFields = {
  nombre: string;
  codigo: string | null;
  costoCentavos: number;
  precioCentavos: number;
  stock: number;
  stockMinimo: number;
};

/** Datos que se guardan: los campos validados más la ruta de la imagen (null = sin foto). */
export type ProductInput = ProductFields & { imagenPath: string | null };

/** Qué hacer con la foto al guardar: dejarla como está, quitarla o reemplazarla por un archivo local. */
export type ImageChange =
  { type: 'keep' } | { type: 'remove' } | { type: 'replace'; localUri: string };

export const MAX_STOCK = 1_000_000;

const emptyToNull = (value: string) => (value.trim() === '' ? null : value.trim());

function moneyField(label: string) {
  return z.string().transform((value, ctx) => {
    if (value.trim() === '') return 0;
    const cents = parseArs(value);
    if (cents === null) {
      ctx.addIssue({
        code: 'custom',
        message: `${label}: ingresá un importe válido, por ejemplo 6.000 o 1.234,50.`,
      });
      return z.NEVER;
    }
    return cents;
  });
}

function unitsField(label: string) {
  return z.string().transform((value, ctx) => {
    const text = value.trim();
    if (text === '') return 0;
    const units = /^\d+$/.test(text) ? Number(text) : NaN;
    if (!Number.isSafeInteger(units) || units > MAX_STOCK) {
      ctx.addIssue({
        code: 'custom',
        message: `${label}: ingresá un número entero entre 0 y ${MAX_STOCK.toLocaleString('es-AR')}.`,
      });
      return z.NEVER;
    }
    return units;
  });
}

/** Entrada cruda del formulario: todos los campos son texto. Vacío en números equivale a 0. */
export const productFormSchema = z.object({
  nombre: z
    .string()
    .trim()
    .min(1, { error: 'Ingresá el nombre del producto.' })
    .max(120, { error: 'El nombre es muy largo (máximo 120).' }),
  codigo: z
    .string()
    .max(40, { error: 'El código es muy largo (máximo 40).' })
    .transform(emptyToNull),
  costoCentavos: moneyField('Costo'),
  precioCentavos: moneyField('Precio de venta'),
  stock: unitsField('Stock'),
  stockMinimo: unitsField('Stock mínimo'),
});

export type ProductForm = Record<keyof ProductFields, string>;

export type StockStatus = 'sin_stock' | 'bajo' | 'ok';

/** Sin stock si no queda nada; bajo si llegó al mínimo configurado (cuando hay uno). */
export function stockStatus(product: Pick<Product, 'stock' | 'stockMinimo'>): StockStatus {
  if (product.stock === 0) return 'sin_stock';
  if (product.stockMinimo > 0 && product.stock <= product.stockMinimo) return 'bajo';
  return 'ok';
}

/** Ganancia por unidad en centavos (puede ser negativa si se vende por debajo del costo). */
export function gananciaCentavos(product: Pick<Product, 'costoCentavos' | 'precioCentavos'>) {
  return product.precioCentavos - product.costoCentavos;
}

/** Margen sobre el costo en porcentaje entero, o null si no hay costo cargado. */
export function margenSobreCostoPct(product: Pick<Product, 'costoCentavos' | 'precioCentavos'>) {
  if (product.costoCentavos === 0) return null;
  return Math.round((gananciaCentavos(product) * 100) / product.costoCentavos);
}

/** Valor del stock al costo, en centavos. */
export function valorStockCentavos(products: Product[]): number {
  return products.reduce((total, p) => total + p.costoCentavos * p.stock, 0);
}

/** Filtra por nombre o código, sin distinguir mayúsculas ni tildes. */
export function filterProducts(products: Product[], query: string): Product[] {
  const needle = normalizeSearch(query);
  if (!needle) return products;
  return products.filter(
    (p) =>
      normalizeSearch(p.nombre).includes(needle) ||
      (p.codigo !== null && normalizeSearch(p.codigo).includes(needle)),
  );
}

export { MAX_CENTS };
