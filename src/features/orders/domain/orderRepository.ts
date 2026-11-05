import type { RepoResult } from '@/core/data/repoResult';

import type { OrderInput, OrderRecord, OrderRecordDetail } from './orderRecord';

export type { RepoResult };

/** Contrato de acceso a datos del historial de pedidos. */
export interface OrderRepository {
  list(): Promise<RepoResult<OrderRecord[]>>;
  get(id: string): Promise<RepoResult<OrderRecordDetail | null>>;
  /** Guarda el pedido con todos sus renglones (todo o nada). Devuelve el id. */
  register(input: OrderInput): Promise<RepoResult<string>>;
  /** Marca el pedido como recibido y suma las unidades al stock. */
  receive(id: string): Promise<RepoResult<null>>;
  /** Cancela un pedido pendiente (no toca el stock). */
  cancel(id: string): Promise<RepoResult<null>>;
}
