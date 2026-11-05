import { useCallback } from 'react';

import { useLoad } from '@/core/data/useLoad';
import { addDays, todayIso } from '@/core/date/dates';
import { supabaseProductRepository } from '@/features/products/data/supabaseProductRepository';
import type { ProductRepository } from '@/features/products/domain/productRepository';
import { supabaseSaleRepository } from '@/features/sales/data/supabaseSaleRepository';
import type { SaleRepository } from '@/features/sales/domain/saleRepository';

import { buildSuggestion, SALES_WINDOW_DAYS, type SuggestionLine } from '../domain/order';

type Repositories = { products: ProductRepository; sales: SaleRepository };

const DEFAULT_REPOSITORIES: Repositories = {
  products: supabaseProductRepository,
  sales: supabaseSaleRepository,
};

/** Productos a reponer según el stock actual y lo vendido en los últimos 60 días. */
export function useOrderSuggestion(
  repositories: Repositories = DEFAULT_REPOSITORIES,
  today: () => string = todayIso,
) {
  const load = useCallback(async () => {
    const from = addDays(today(), -SALES_WINDOW_DAYS);
    const [products, sold] = await Promise.all([
      repositories.products.list(),
      repositories.sales.soldUnitsSince(from),
    ]);
    if (!products.ok) return products;
    if (!sold.ok) return sold;
    return { ok: true as const, data: buildSuggestion(products.data, sold.data) };
  }, [repositories, today]);
  return useLoad<SuggestionLine[]>(load);
}
