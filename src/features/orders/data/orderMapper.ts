import type {
  OrderInput,
  OrderRecord,
  OrderRecordDetail,
  OrderRecordItem,
  OrderStatus,
} from '../domain/orderRecord';

export type OrderItemRow = {
  id: string;
  product_id: string | null;
  nombre_producto: string;
  cantidad: number;
  costo_centavos: number;
  precio_centavos: number;
};

/** Fila de `public.orders` con los renglones embebidos (solo para sumar totales). */
export type OrderRow = {
  id: string;
  pedido_el: string;
  estado: OrderStatus;
  notas: string | null;
  created_at: string;
  order_items: Pick<OrderItemRow, 'cantidad' | 'costo_centavos' | 'precio_centavos'>[];
};

export const ORDER_COLUMNS =
  'id, pedido_el, estado, notas, created_at, order_items(cantidad, costo_centavos, precio_centavos)';
export const ORDER_ITEM_COLUMNS =
  'id, product_id, nombre_producto, cantidad, costo_centavos, precio_centavos';

export function toOrder(row: OrderRow): OrderRecord {
  return {
    id: row.id,
    pedidoEl: row.pedido_el,
    estado: row.estado,
    notas: row.notas,
    unidades: row.order_items.reduce((sum, item) => sum + item.cantidad, 0),
    costoCentavos: row.order_items.reduce((sum, i) => sum + i.cantidad * i.costo_centavos, 0),
    ventaCentavos: row.order_items.reduce((sum, i) => sum + i.cantidad * i.precio_centavos, 0),
    createdAt: row.created_at,
  };
}

export function toOrderItem(row: OrderItemRow): OrderRecordItem {
  return {
    id: row.id,
    productId: row.product_id,
    nombreProducto: row.nombre_producto,
    cantidad: row.cantidad,
    costoCentavos: row.costo_centavos,
    precioCentavos: row.precio_centavos,
  };
}

export function toOrderDetail(row: OrderRow, items: OrderItemRow[]): OrderRecordDetail {
  return { ...toOrder(row), items: items.map(toOrderItem) };
}

/** Parámetros de la función `register_order` (los nombres son los de la base). */
export function toRegisterOrderArgs(input: OrderInput) {
  return {
    p_notas: input.notas,
    p_items: input.items.map((item) => ({ product_id: item.productId, cantidad: item.cantidad })),
  };
}
