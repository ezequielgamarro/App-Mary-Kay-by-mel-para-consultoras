import { useCallback } from 'react';

import { useLoad } from '@/core/data/useLoad';

import { supabaseOrderRepository } from '../data/supabaseOrderRepository';
import type { SuggestionLine } from '../domain/order';
import { buildOrderInput, type OrderRecord, type OrderRecordDetail } from '../domain/orderRecord';
import type { OrderRepository, RepoResult } from '../domain/orderRepository';

export function useOrderList(repository: OrderRepository = supabaseOrderRepository) {
  const load = useCallback(() => repository.list(), [repository]);
  return useLoad<OrderRecord[]>(load, 'orders');
}

export function useOrderDetail(
  id: string | undefined,
  repository: OrderRepository = supabaseOrderRepository,
) {
  const load = useCallback(
    () =>
      id
        ? repository.get(id)
        : Promise.resolve<RepoResult<OrderRecordDetail | null>>({ ok: true, data: null }),
    [id, repository],
  );
  return useLoad<OrderRecordDetail | null>(load, id ? `order:${id}` : undefined);
}

export type SaveOrderResult = { ok: true; orderId: string } | { ok: false; message: string };
export type ActionResult = { ok: true } | { ok: false; message: string };

/** Casos de uso de escritura: validan con las reglas del dominio y delegan en el repositorio. */
export function useOrderActions(repository: OrderRepository = supabaseOrderRepository) {
  const save = useCallback(
    async (
      lines: SuggestionLine[],
      quantities: Record<string, string>,
      notas: string,
    ): Promise<SaveOrderResult> => {
      const built = buildOrderInput(lines, quantities, notas);
      if (!built.ok) return built;
      const result = await repository.register(built.input);
      return result.ok ? { ok: true, orderId: result.data } : result;
    },
    [repository],
  );

  const receive = useCallback(
    async (id: string): Promise<ActionResult> => {
      const result = await repository.receive(id);
      return result.ok ? { ok: true } : result;
    },
    [repository],
  );

  const cancel = useCallback(
    async (id: string): Promise<ActionResult> => {
      const result = await repository.cancel(id);
      return result.ok ? { ok: true } : result;
    },
    [repository],
  );

  return { save, receive, cancel };
}
