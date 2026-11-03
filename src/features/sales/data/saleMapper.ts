import type { Payment, PaymentMedium, Sale, SaleInput, SaleItem } from '../domain/sale';

/** Fila de `public.sales` con el nombre de la clienta embebido. */
export type SaleRow = {
  id: string;
  client_id: string | null;
  vendida_el: string;
  vence_el: string | null;
  notas: string | null;
  estado: 'activa' | 'anulada';
  total_centavos: number;
  pagado_centavos: number;
  saldo_centavos: number;
  created_at: string;
  clients: { nombre: string } | null;
};

export type SaleItemRow = {
  id: string;
  product_id: string | null;
  nombre_producto: string;
  cantidad: number;
  precio_centavos: number;
  costo_centavos: number;
};

export type PaymentRow = {
  id: string;
  monto_centavos: number;
  medio: PaymentMedium;
  pagado_el: string;
  created_at: string;
};

/** Producto vendido con los datos mínimos para calcular ganancia. */
export type ProfitRow = { cantidad: number; precio_centavos: number; costo_centavos: number };

export const SALE_COLUMNS =
  'id, client_id, vendida_el, vence_el, notas, estado, total_centavos, pagado_centavos, saldo_centavos, created_at, clients(nombre)';
export const SALE_ITEM_COLUMNS =
  'id, product_id, nombre_producto, cantidad, precio_centavos, costo_centavos';
export const PAYMENT_COLUMNS = 'id, monto_centavos, medio, pagado_el, created_at';

export function toSale(row: SaleRow): Sale {
  return {
    id: row.id,
    clientId: row.client_id,
    clientName: row.clients?.nombre ?? null,
    vendidaEl: row.vendida_el,
    venceEl: row.vence_el,
    notas: row.notas,
    estado: row.estado,
    totalCentavos: row.total_centavos,
    pagadoCentavos: row.pagado_centavos,
    saldoCentavos: row.saldo_centavos,
    createdAt: row.created_at,
  };
}

export function toSaleItem(row: SaleItemRow): SaleItem {
  return {
    id: row.id,
    productId: row.product_id,
    nombreProducto: row.nombre_producto,
    cantidad: row.cantidad,
    precioCentavos: row.precio_centavos,
    costoCentavos: row.costo_centavos,
  };
}

export function toPayment(row: PaymentRow): Payment {
  return {
    id: row.id,
    montoCentavos: row.monto_centavos,
    medio: row.medio,
    pagadoEl: row.pagado_el,
    createdAt: row.created_at,
  };
}

/** Parámetros de la función `register_sale` (los nombres son los de la base). */
export function toRegisterSaleArgs(input: SaleInput) {
  return {
    p_client_id: input.clientId,
    p_vence_el: input.venceEl,
    p_notas: input.notas,
    p_items: input.items.map((item) => ({
      product_id: item.productId,
      cantidad: item.cantidad,
      precio_centavos: item.precioCentavos,
    })),
    p_pagos: input.pagos.map((pago) => ({
      monto_centavos: pago.montoCentavos,
      medio: pago.medio,
    })),
  };
}
