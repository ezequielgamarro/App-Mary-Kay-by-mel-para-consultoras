import type { RepoResult } from '@/core/data/repoResult';

import type { PaymentInput, Sale, SaleDetail, SaleInput } from './sale';

export type { RepoResult };

/** Contrato de acceso a datos de ventas: la UI y los hooks solo conocen esta interfaz. */
export interface SaleRepository {
  list(): Promise<RepoResult<Sale[]>>;
  get(id: string): Promise<RepoResult<SaleDetail | null>>;
  /** Registra venta, productos y pago inicial en una sola operación (todo o nada). */
  register(input: SaleInput): Promise<RepoResult<string>>;
  addPayment(saleId: string, input: PaymentInput): Promise<RepoResult<null>>;
  removePayment(paymentId: string): Promise<RepoResult<null>>;
  /** Ganancia (precio menos costo guardado) de lo vendido en ventas activas desde `from` (AAAA-MM-DD). */
  profitSince(from: string): Promise<RepoResult<number>>;
  /** Unidades vendidas por producto (id) en ventas activas desde `from` (AAAA-MM-DD). */
  soldUnitsSince(from: string): Promise<RepoResult<Record<string, number>>>;
  /** Anula la venta y devuelve el stock de los productos vendidos. */
  cancel(saleId: string): Promise<RepoResult<null>>;
}
