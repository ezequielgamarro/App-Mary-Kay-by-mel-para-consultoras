import { useCallback } from 'react';

import { useLoad } from '@/core/data/useLoad';
import { todayIso } from '@/core/date/dates';
import { supabaseGoalRepository } from '@/features/goals/data/supabaseGoalRepository';
import { monthStart } from '@/features/goals/domain/goal';
import type { GoalRepository } from '@/features/goals/domain/goalRepository';
import { supabaseProductRepository } from '@/features/products/data/supabaseProductRepository';
import type { ProductRepository } from '@/features/products/domain/productRepository';
import { supabaseSaleRepository } from '@/features/sales/data/supabaseSaleRepository';
import type { SaleRepository } from '@/features/sales/domain/saleRepository';

import { buildHomeSummary, type HomeSummary } from '../domain/homeSummary';

type Repositories = {
  sales: SaleRepository;
  products: ProductRepository;
  goals: GoalRepository;
};

const DEFAULT_REPOSITORIES: Repositories = {
  sales: supabaseSaleRepository,
  products: supabaseProductRepository,
  goals: supabaseGoalRepository,
};

/** Cifras reales del inicio, calculadas con las ventas y productos de la consultora. */
export function useHomeSummary(
  repositories: Repositories = DEFAULT_REPOSITORIES,
  today: () => string = todayIso,
) {
  const load = useCallback(async () => {
    const now = today();
    const month = monthStart(now);
    const [sales, products, profit, goal] = await Promise.all([
      repositories.sales.list(),
      repositories.products.list(),
      repositories.sales.profitSince(month),
      repositories.goals.get(month),
    ]);
    if (!sales.ok) return sales;
    if (!products.ok) return products;
    if (!profit.ok) return profit;
    if (!goal.ok) return goal;
    return {
      ok: true as const,
      data: buildHomeSummary(sales.data, products.data, now, {
        gananciaMesCentavos: profit.data,
        goal: goal.data,
      }),
    };
  }, [repositories, today]);
  return useLoad<HomeSummary>(load);
}
