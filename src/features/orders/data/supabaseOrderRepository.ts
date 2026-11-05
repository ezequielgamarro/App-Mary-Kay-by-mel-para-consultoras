import type { RepoResult } from '@/core/data/repoResult';
import { supabase } from '@/core/supabase/client';

import type { OrderRepository } from '../domain/orderRepository';
import { orderErrorMessage } from './orderErrors';
import {
  ORDER_COLUMNS,
  ORDER_ITEM_COLUMNS,
  toOrder,
  toOrderDetail,
  toRegisterOrderArgs,
  type OrderItemRow,
  type OrderRow,
} from './orderMapper';

function fail<T>(error: object): RepoResult<T> {
  // El detalle técnico va solo al log; la usuaria ve un mensaje claro.
  console.warn('[orders] error de Supabase', error);
  return { ok: false, message: orderErrorMessage(error) };
}

export const supabaseOrderRepository: OrderRepository = {
  async list() {
    const { data, error } = await supabase
      .from('orders')
      .select(ORDER_COLUMNS)
      .order('pedido_el', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(200)
      .returns<OrderRow[]>();
    if (error) return fail(error);
    return { ok: true, data: data.map(toOrder) };
  },

  async get(id) {
    const [order, items] = await Promise.all([
      supabase.from('orders').select(ORDER_COLUMNS).eq('id', id).maybeSingle<OrderRow>(),
      supabase
        .from('order_items')
        .select(ORDER_ITEM_COLUMNS)
        .eq('order_id', id)
        .order('created_at', { ascending: true })
        .order('nombre_producto', { ascending: true })
        .returns<OrderItemRow[]>(),
    ]);
    if (order.error) return fail(order.error);
    if (items.error) return fail(items.error);
    if (!order.data) return { ok: true, data: null };
    return { ok: true, data: toOrderDetail(order.data, items.data) };
  },

  async register(input) {
    const { data, error } = await supabase.rpc('register_order', toRegisterOrderArgs(input));
    if (error) return fail(error);
    return { ok: true, data: String(data) };
  },

  async receive(id) {
    const { error } = await supabase.rpc('receive_order', { p_order_id: id });
    if (error) return fail(error);
    return { ok: true, data: null };
  },

  async cancel(id) {
    const { error } = await supabase.rpc('cancel_order', { p_order_id: id });
    if (error) return fail(error);
    return { ok: true, data: null };
  },
};
