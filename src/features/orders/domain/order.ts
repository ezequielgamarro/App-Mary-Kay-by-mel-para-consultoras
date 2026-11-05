import { formatArs } from '@/core/money/formatArs';
import { MAX_STOCK, type Product } from '@/features/products/domain/product';

/** Ventana de ventas que se mira para estimar cuánto rota cada producto. */
export const SALES_WINDOW_DAYS = 60;
/** Para cuántos días de ventas se quiere tener stock al hacer el pedido. */
export const COVER_DAYS = 30;

export type SuggestionLine = {
  productId: string;
  nombre: string;
  stock: number;
  stockMinimo: number;
  /** Unidades vendidas en la ventana de ventas. */
  vendidas: number;
  costoCentavos: number;
  precioCentavos: number;
  /** Unidades sugeridas para llegar al objetivo de stock. */
  sugerido: number;
  motivo: string;
};

function reason(product: Product, vendidas: number): string {
  if (product.stock === 0) return 'Sin stock';
  if (product.stock <= product.stockMinimo) {
    return `Stock bajo: quedan ${product.stock} (mínimo ${product.stockMinimo})`;
  }
  const alMes = Math.round((vendidas * COVER_DAYS) / SALES_WINDOW_DAYS);
  return `Se vende ~${alMes} al mes y quedan ${product.stock}`;
}

/**
 * Sugiere qué reponer: el objetivo de cada producto es lo mayor entre su stock mínimo y lo que
 * se vende en `COVER_DAYS` días; se sugiere la diferencia con el stock actual.
 * Primero lo agotado, después lo que está bajo el mínimo y al final lo que rota más.
 */
export function buildSuggestion(
  products: Product[],
  soldByProduct: Record<string, number>,
): SuggestionLine[] {
  const lines: SuggestionLine[] = [];
  for (const product of products) {
    const vendidas = soldByProduct[product.id] ?? 0;
    const objetivo = Math.max(
      product.stockMinimo,
      Math.ceil((vendidas * COVER_DAYS) / SALES_WINDOW_DAYS),
    );
    const sugerido = objetivo - product.stock;
    if (sugerido <= 0) continue;
    lines.push({
      productId: product.id,
      nombre: product.nombre,
      stock: product.stock,
      stockMinimo: product.stockMinimo,
      vendidas,
      costoCentavos: product.costoCentavos,
      precioCentavos: product.precioCentavos,
      sugerido,
      motivo: reason(product, vendidas),
    });
  }
  const rank = (line: SuggestionLine) =>
    line.stock === 0 ? 0 : line.stock <= line.stockMinimo ? 1 : 2;
  return lines.sort(
    (a, b) => rank(a) - rank(b) || b.vendidas - a.vendidas || a.nombre.localeCompare(b.nombre),
  );
}

/** Cantidad escrita por la usuaria: entero entre 0 y el máximo; lo inválido cuenta como 0. */
export function parseQuantity(text: string): number {
  const trimmed = text.trim();
  if (!/^\d+$/.test(trimmed)) return 0;
  const value = Number(trimmed);
  return Number.isSafeInteger(value) && value <= MAX_STOCK ? value : 0;
}

/** Cantidad elegida para una línea: lo que escribió la usuaria o, si no tocó nada, lo sugerido. */
export function chosenQuantity(line: SuggestionLine, quantities: Record<string, string>): number {
  const typed = quantities[line.productId];
  return typed === undefined ? line.sugerido : parseQuantity(typed);
}

export type OrderTotals = {
  productos: number;
  unidades: number;
  costoCentavos: number;
  ventaCentavos: number;
  gananciaCentavos: number;
};

/** Simula el pedido: cuánto cuesta, cuánto se recauda al venderlo y la ganancia estimada. */
export function simulateOrder(
  lines: SuggestionLine[],
  quantities: Record<string, string>,
): OrderTotals {
  const totals: OrderTotals = {
    productos: 0,
    unidades: 0,
    costoCentavos: 0,
    ventaCentavos: 0,
    gananciaCentavos: 0,
  };
  for (const line of lines) {
    const quantity = chosenQuantity(line, quantities);
    if (quantity === 0) continue;
    totals.productos += 1;
    totals.unidades += quantity;
    totals.costoCentavos += quantity * line.costoCentavos;
    totals.ventaCentavos += quantity * line.precioCentavos;
  }
  totals.gananciaCentavos = totals.ventaCentavos - totals.costoCentavos;
  return totals;
}

/** Texto del pedido listo para mandar por WhatsApp u otra app. */
export function orderMessage(lines: SuggestionLine[], quantities: Record<string, string>): string {
  const rows = lines
    .map((line) => ({ line, quantity: chosenQuantity(line, quantities) }))
    .filter((item) => item.quantity > 0)
    .map(({ line, quantity }) => `• ${quantity} × ${line.nombre}`);
  const totals = simulateOrder(lines, quantities);
  return [
    'Pedido',
    ...rows,
    `Total: ${totals.unidades === 1 ? '1 unidad' : `${totals.unidades} unidades`} · costo ${formatArs(totals.costoCentavos)}`,
  ].join('\n');
}
