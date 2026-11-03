import { daysBetween, parseDateAr } from '@/core/date/dates';
import { centsToInput, parseArs } from '@/core/money/parseArs';

export type PaymentMedium = 'efectivo' | 'transferencia' | 'otro';

export const PAYMENT_MEDIA: { value: PaymentMedium; label: string }[] = [
  { value: 'efectivo', label: 'Efectivo' },
  { value: 'transferencia', label: 'Transferencia' },
  { value: 'otro', label: 'Otro' },
];

export function mediumLabel(medium: PaymentMedium): string {
  return PAYMENT_MEDIA.find((m) => m.value === medium)?.label ?? medium;
}

export type Sale = {
  id: string;
  clientId: string | null;
  clientName: string | null;
  /** Fechas ISO (AAAA-MM-DD). */
  vendidaEl: string;
  venceEl: string | null;
  notas: string | null;
  estado: 'activa' | 'anulada';
  totalCentavos: number;
  pagadoCentavos: number;
  saldoCentavos: number;
  createdAt: string;
};

export type SaleItem = {
  id: string;
  productId: string | null;
  nombreProducto: string;
  cantidad: number;
  precioCentavos: number;
  costoCentavos: number;
};

export type Payment = {
  id: string;
  montoCentavos: number;
  medio: PaymentMedium;
  pagadoEl: string;
  createdAt: string;
};

export type SaleDetail = Sale & { items: SaleItem[]; payments: Payment[] };

/** Lo que se envía a la base para registrar una venta completa. */
export type SaleInput = {
  clientId: string | null;
  venceEl: string | null;
  notas: string | null;
  items: { productId: string; cantidad: number; precioCentavos: number }[];
  pagos: PaymentInput[];
};

export type PaymentInput = { montoCentavos: number; medio: PaymentMedium };

// ---------------------------------------------------------------------------
// Borrador de la venta (lo que se arma en la pantalla; todo texto editable)
// ---------------------------------------------------------------------------

export const MAX_ITEM_QUANTITY = 100_000;
export const MAX_NOTES = 2000;

/** Producto del catálogo tal como lo necesita el armado de la venta. */
export type SellableProduct = {
  id: string;
  nombre: string;
  precioCentavos: number;
  stock: number;
};

export type DraftLine = {
  productId: string;
  nombre: string;
  /** Unidades disponibles cuando se agregó (la base vuelve a comprobarlo al registrar). */
  stock: number;
  cantidad: string;
  precio: string;
};

export type SaleDraft = {
  clientId: string | null;
  lines: DraftLine[];
  venceEl: string;
  notas: string;
  pago: string;
  medio: PaymentMedium;
};

export const EMPTY_DRAFT: SaleDraft = {
  clientId: null,
  lines: [],
  venceEl: '',
  notas: '',
  pago: '',
  medio: 'efectivo',
};

/** Agrega un producto al borrador; si ya estaba, suma una unidad (sin pasar del stock). */
export function addProductToDraft(lines: DraftLine[], product: SellableProduct): DraftLine[] {
  if (product.stock <= 0) return lines;
  const existing = lines.find((line) => line.productId === product.id);
  if (!existing) {
    return [
      ...lines,
      {
        productId: product.id,
        nombre: product.nombre,
        stock: product.stock,
        cantidad: '1',
        precio: centsToInput(product.precioCentavos),
      },
    ];
  }
  const next = Math.min(Number(existing.cantidad || '0') + 1, existing.stock);
  return lines.map((line) =>
    line.productId === product.id ? { ...line, cantidad: String(next) } : line,
  );
}

function parseQuantity(text: string, max: number): number | null {
  const value = /^\d+$/.test(text.trim()) ? Number(text.trim()) : NaN;
  return Number.isSafeInteger(value) && value >= 1 && value <= max ? value : null;
}

/** Subtotal de una línea en centavos, o null si la cantidad o el precio aún no son válidos. */
export function lineSubtotal(line: DraftLine): number | null {
  const cantidad = parseQuantity(line.cantidad, MAX_ITEM_QUANTITY);
  const precio = parseArs(line.precio);
  return cantidad === null || precio === null ? null : cantidad * precio;
}

/** Total del borrador (suma de los subtotales válidos). */
export function draftTotal(lines: DraftLine[]): number {
  return lines.reduce((sum, line) => sum + (lineSubtotal(line) ?? 0), 0);
}

export type DraftField = 'lines' | 'cliente' | 'pago' | 'venceEl' | 'notas';

export type BuildResult =
  | { ok: true; input: SaleInput; totalCentavos: number; saldoCentavos: number }
  | { ok: false; message: string; field: DraftField };

/** Valida el borrador con las mismas reglas que la base y arma lo que se envía. */
export function buildSaleInput(draft: SaleDraft, today: string): BuildResult {
  const fail = (field: DraftField, message: string): BuildResult => ({ ok: false, field, message });

  if (draft.lines.length === 0) return fail('lines', 'Agregá al menos un producto.');

  const items: SaleInput['items'] = [];
  for (const line of draft.lines) {
    const cantidad = parseQuantity(line.cantidad, Math.min(line.stock, MAX_ITEM_QUANTITY));
    if (cantidad === null) {
      return fail('lines', `«${line.nombre}»: ingresá una cantidad entre 1 y ${line.stock}.`);
    }
    const precio = parseArs(line.precio);
    if (precio === null) {
      return fail('lines', `«${line.nombre}»: ingresá un precio válido, por ejemplo 6.000.`);
    }
    items.push({ productId: line.productId, cantidad, precioCentavos: precio });
  }
  const totalCentavos = items.reduce((sum, i) => sum + i.cantidad * i.precioCentavos, 0);

  let pagado = 0;
  if (draft.pago.trim() !== '') {
    const parsed = parseArs(draft.pago);
    if (parsed === null) return fail('pago', 'Ingresá un importe válido para el pago.');
    pagado = parsed;
  }
  if (pagado > totalCentavos) return fail('pago', 'El pago no puede superar el total de la venta.');

  const saldoCentavos = totalCentavos - pagado;
  if (saldoCentavos > 0 && draft.clientId === null) {
    return fail('cliente', 'Para dejar saldo pendiente elegí una clienta.');
  }

  let venceEl: string | null = null;
  if (saldoCentavos > 0 && draft.venceEl.trim() !== '') {
    venceEl = parseDateAr(draft.venceEl);
    if (venceEl === null) return fail('venceEl', 'Ingresá la fecha como DD/MM/AAAA.');
    if (venceEl < today) return fail('venceEl', 'La fecha de vencimiento ya pasó.');
  }

  const notas = draft.notas.trim();
  if (notas.length > MAX_NOTES) {
    return fail('notas', `Las notas son muy largas (máximo ${MAX_NOTES} caracteres).`);
  }

  return {
    ok: true,
    totalCentavos,
    saldoCentavos,
    input: {
      clientId: draft.clientId,
      venceEl,
      notas: notas === '' ? null : notas,
      items,
      pagos: pagado > 0 ? [{ montoCentavos: pagado, medio: draft.medio }] : [],
    },
  };
}

export type PaymentBuildResult = { ok: true; input: PaymentInput } | { ok: false; message: string };

/** Valida un cobro posterior: importe positivo que no supere el saldo pendiente. */
export function buildPaymentInput(
  text: string,
  medio: PaymentMedium,
  saldoCentavos: number,
): PaymentBuildResult {
  const monto = parseArs(text);
  if (monto === null || monto <= 0) {
    return { ok: false, message: 'Ingresá un importe válido, por ejemplo 2.500.' };
  }
  if (monto > saldoCentavos) {
    return { ok: false, message: 'El cobro no puede superar el saldo pendiente.' };
  }
  return { ok: true, input: { montoCentavos: monto, medio } };
}

// ---------------------------------------------------------------------------
// Consultas sobre ventas ya registradas
// ---------------------------------------------------------------------------

export type SaleStatusKind = 'anulada' | 'pagada' | 'vencida' | 'por_cobrar';

export function saleStatus(sale: Sale, today: string): SaleStatusKind {
  if (sale.estado === 'anulada') return 'anulada';
  if (sale.saldoCentavos === 0) return 'pagada';
  if (sale.venceEl !== null && sale.venceEl < today) return 'vencida';
  return 'por_cobrar';
}

/** Texto corto del estado para listas, p. ej. «Vencida hace 3 días». */
export function saleStatusText(sale: Sale, today: string): string {
  const kind = saleStatus(sale, today);
  if (kind === 'anulada') return 'Anulada';
  if (kind === 'pagada') return 'Pagada';
  if (sale.venceEl === null) return 'Con saldo';
  const days = daysBetween(sale.venceEl, today);
  if (kind === 'vencida') return days === 1 ? 'Vencida ayer' : `Vencida hace ${days} días`;
  const left = -days;
  if (left === 0) return 'Vence hoy';
  return left === 1 ? 'Vence mañana' : `Vence en ${left} días`;
}

/** Suma de lo que falta cobrar en ventas activas. */
export function totalPorCobrar(sales: Sale[]): number {
  return sales.reduce((sum, s) => (s.estado === 'activa' ? sum + s.saldoCentavos : sum), 0);
}

/** Ganancia de una venta: lo vendido menos el costo que tenían los productos al venderse. */
export function gananciaVenta(items: SaleItem[]): number {
  return items.reduce((sum, i) => sum + i.cantidad * (i.precioCentavos - i.costoCentavos), 0);
}
