import type { RepoResult } from '@/core/data/repoResult';
import { supabase } from '@/core/supabase/client';

import type { SaleRepository } from '../domain/saleRepository';
import { saleErrorMessage } from './saleErrors';
import {
  PAYMENT_COLUMNS,
  SALE_COLUMNS,
  SALE_ITEM_COLUMNS,
  toPayment,
  toRegisterSaleArgs,
  toSale,
  toSaleItem,
  type PaymentRow,
  type SaleItemRow,
  type ProfitRow,
  type SaleRow,
} from './saleMapper';

function fail<T>(error: object): RepoResult<T> {
  // El detalle técnico va solo al log; la usuaria ve un mensaje claro.
  console.warn('[sales] error de Supabase', error);
  return { ok: false, message: saleErrorMessage(error) };
}

export const supabaseSaleRepository: SaleRepository = {
  async list() {
    const { data, error } = await supabase
      .from('sales')
      .select(SALE_COLUMNS)
      .order('vendida_el', { ascending: false })
      .order('created_at', { ascending: false })
      .returns<SaleRow[]>();
    if (error) return fail(error);
    return { ok: true, data: data.map(toSale) };
  },

  async get(id) {
    const [sale, items, payments] = await Promise.all([
      supabase.from('sales').select(SALE_COLUMNS).eq('id', id).maybeSingle<SaleRow>(),
      supabase
        .from('sale_items')
        .select(SALE_ITEM_COLUMNS)
        .eq('sale_id', id)
        .order('created_at', { ascending: true })
        .returns<SaleItemRow[]>(),
      supabase
        .from('payments')
        .select(PAYMENT_COLUMNS)
        .eq('sale_id', id)
        .order('pagado_el', { ascending: true })
        .order('created_at', { ascending: true })
        .returns<PaymentRow[]>(),
    ]);
    if (sale.error) return fail(sale.error);
    if (items.error) return fail(items.error);
    if (payments.error) return fail(payments.error);
    if (!sale.data) return { ok: true, data: null };
    return {
      ok: true,
      data: {
        ...toSale(sale.data),
        items: items.data.map(toSaleItem),
        payments: payments.data.map(toPayment),
      },
    };
  },

  async register(input) {
    const { data, error } = await supabase.rpc('register_sale', toRegisterSaleArgs(input));
    if (error) return fail(error);
    return { ok: true, data: String(data) };
  },

  async addPayment(saleId, input) {
    const { error } = await supabase.from('payments').insert({
      sale_id: saleId,
      monto_centavos: input.montoCentavos,
      medio: input.medio,
    });
    if (error) return fail(error);
    return { ok: true, data: null };
  },

  async removePayment(paymentId) {
    const { error } = await supabase.from('payments').delete().eq('id', paymentId);
    if (error) return fail(error);
    return { ok: true, data: null };
  },

  async profitSince(from) {
    // Se pagina porque la Data API devuelve como máximo 1000 filas por consulta.
    const PAGE = 1000;
    let profit = 0;
    for (let start = 0; ; start += PAGE) {
      const { data, error } = await supabase
        .from('sale_items')
        .select('cantidad, precio_centavos, costo_centavos, sales!inner(estado, vendida_el)')
        .eq('sales.estado', 'activa')
        .gte('sales.vendida_el', from)
        .order('created_at', { ascending: true })
        .order('id', { ascending: true })
        .range(start, start + PAGE - 1)
        .returns<ProfitRow[]>();
      if (error) return fail(error);
      profit += data.reduce(
        (sum, row) => sum + row.cantidad * (row.precio_centavos - row.costo_centavos),
        0,
      );
      if (data.length < PAGE) return { ok: true, data: profit };
    }
  },

  async soldUnitsSince(from) {
    // Se pagina porque la Data API devuelve como máximo 1000 filas por consulta.
    const PAGE = 1000;
    const units: Record<string, number> = {};
    for (let start = 0; ; start += PAGE) {
      const { data, error } = await supabase
        .from('sale_items')
        .select('product_id, cantidad, sales!inner(estado, vendida_el)')
        .eq('sales.estado', 'activa')
        .gte('sales.vendida_el', from)
        .not('product_id', 'is', null)
        .order('created_at', { ascending: true })
        .order('id', { ascending: true })
        .range(start, start + PAGE - 1)
        .returns<{ product_id: string; cantidad: number }[]>();
      if (error) return fail(error);
      for (const row of data) units[row.product_id] = (units[row.product_id] ?? 0) + row.cantidad;
      if (data.length < PAGE) return { ok: true, data: units };
    }
  },

  async cancel(saleId) {
    const { error } = await supabase.from('sales').update({ estado: 'anulada' }).eq('id', saleId);
    if (error) return fail(error);
    return { ok: true, data: null };
  },
};
