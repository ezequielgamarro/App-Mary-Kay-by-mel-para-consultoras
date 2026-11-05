import { useCallback } from 'react';

import { useLoad } from '@/core/data/useLoad';
import { todayIso } from '@/core/date/dates';

import { supabaseSaleRepository } from '../data/supabaseSaleRepository';
import {
  buildPaymentInput,
  buildSaleInput,
  type DraftField,
  type PaymentMedium,
  type Sale,
  type SaleDetail,
  type SaleDraft,
} from '../domain/sale';
import type { RepoResult, SaleRepository } from '../domain/saleRepository';

export function useSaleList(repository: SaleRepository = supabaseSaleRepository) {
  const load = useCallback(() => repository.list(), [repository]);
  return useLoad<Sale[]>(load, 'sales');
}

export function useSale(
  id: string | undefined,
  repository: SaleRepository = supabaseSaleRepository,
) {
  const load = useCallback(
    () =>
      id
        ? repository.get(id)
        : Promise.resolve<RepoResult<SaleDetail | null>>({ ok: true, data: null }),
    [id, repository],
  );
  return useLoad<SaleDetail | null>(load, id ? `sale:${id}` : undefined);
}

export type RegisterResult =
  { ok: true; saleId: string } | { ok: false; message: string; field?: DraftField };

export type ActionResult = { ok: true } | { ok: false; message: string };

/** Casos de uso de escritura: validan con las reglas del dominio y delegan en el repositorio. */
export function useSaleActions(repository: SaleRepository = supabaseSaleRepository) {
  const register = useCallback(
    async (draft: SaleDraft, today: string = todayIso()): Promise<RegisterResult> => {
      const built = buildSaleInput(draft, today);
      if (!built.ok) return { ok: false, message: built.message, field: built.field };
      const result = await repository.register(built.input);
      return result.ok ? { ok: true, saleId: result.data } : { ok: false, message: result.message };
    },
    [repository],
  );

  const addPayment = useCallback(
    async (
      saleId: string,
      text: string,
      medio: PaymentMedium,
      saldoCentavos: number,
    ): Promise<ActionResult> => {
      const built = buildPaymentInput(text, medio, saldoCentavos);
      if (!built.ok) return built;
      const result = await repository.addPayment(saleId, built.input);
      return result.ok ? { ok: true } : { ok: false, message: result.message };
    },
    [repository],
  );

  const removePayment = useCallback(
    async (paymentId: string): Promise<ActionResult> => {
      const result = await repository.removePayment(paymentId);
      return result.ok ? { ok: true } : { ok: false, message: result.message };
    },
    [repository],
  );

  const cancel = useCallback(
    async (saleId: string): Promise<ActionResult> => {
      const result = await repository.cancel(saleId);
      return result.ok ? { ok: true } : { ok: false, message: result.message };
    },
    [repository],
  );

  return { register, addPayment, removePayment, cancel };
}
