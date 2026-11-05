import { formatArs } from '@/core/money/formatArs';

import { chosenQuantity, type SuggestionLine } from './order';

export type OrderStatus = 'pendiente' | 'recibido' | 'cancelado';

export type OrderRecordItem = {
  id: string;
  productId: string | null;
  nombreProducto: string;
  cantidad: number;
  costoCentavos: number;
  precioCentavos: number;
};

/** Pedido guardado en el historial. */
export type OrderRecord = {
  id: string;
  /** Fecha ISO (AAAA-MM-DD). */
  pedidoEl: string;
  estado: OrderStatus;
  notas: string | null;
  unidades: number;
  costoCentavos: number;
  ventaCentavos: number;
  createdAt: string;
};

export type OrderRecordDetail = OrderRecord & { items: OrderRecordItem[] };

/** Lo que se envía a la base para guardar un pedido. */
export type OrderInput = {
  notas: string | null;
  items: { productId: string; cantidad: number }[];
};

export const MAX_ORDER_NOTES = 2000;

export const STATUS_LABEL: Record<OrderStatus, string> = {
  pendiente: 'Pendiente',
  recibido: 'Recibido',
  cancelado: 'Cancelado',
};

export type BuildOrderResult = { ok: true; input: OrderInput } | { ok: false; message: string };

/** Arma lo que se guarda: las líneas con cantidad mayor a 0 y las notas recortadas. */
export function buildOrderInput(
  lines: SuggestionLine[],
  quantities: Record<string, string>,
  notas: string,
): BuildOrderResult {
  const items = lines
    .map((line) => ({ productId: line.productId, cantidad: chosenQuantity(line, quantities) }))
    .filter((item) => item.cantidad > 0);
  if (items.length === 0) return { ok: false, message: 'Elegí al menos un producto para pedir.' };
  const text = notas.trim();
  if (text.length > MAX_ORDER_NOTES) {
    return { ok: false, message: `Las notas son muy largas (máximo ${MAX_ORDER_NOTES}).` };
  }
  return { ok: true, input: { notas: text === '' ? null : text, items } };
}

/** Línea de resumen de un pedido guardado. */
export function orderSummaryText(order: OrderRecord): string {
  const unidades = order.unidades === 1 ? '1 unidad' : `${order.unidades} unidades`;
  return `${STATUS_LABEL[order.estado]} · ${unidades}`;
}

/** Texto del pedido guardado, listo para mandar. */
export function recordMessage(order: OrderRecordDetail): string {
  const rows = order.items.map((item) => `• ${item.cantidad} × ${item.nombreProducto}`);
  const unidades = order.unidades === 1 ? '1 unidad' : `${order.unidades} unidades`;
  return ['Pedido', ...rows, `Total: ${unidades} · costo ${formatArs(order.costoCentavos)}`].join(
    '\n',
  );
}
