import { daysBetween } from '@/core/date/dates';
import { goalProgressPct, type Goal } from '@/features/goals/domain/goal';
import { valorStockCentavos } from '@/features/products/domain/product';
import type { Product } from '@/features/products/domain/product';
import type { Sale } from '@/features/sales/domain/sale';

export type Debtor = {
  clientId: string;
  nombre: string;
  saldoCentavos: number;
  /** Vencimiento más próximo entre sus ventas con saldo (AAAA-MM-DD), o null si ninguna tiene. */
  venceEl: string | null;
  vencida: boolean;
  nota: string;
};

export type GoalProgress = {
  ventasMetaCentavos: number;
  ventasPct: number;
  /** Solo si la consultora definió una meta de ganancia. */
  gananciaMetaCentavos: number | null;
  gananciaPct: number | null;
};

/** Datos que no salen de las ventas ni de los productos: ganancia del mes y meta definida. */
export type HomeExtras = { gananciaMesCentavos: number; goal: Goal | null };

export type HomeSummary = {
  /** Total vendido en el mes de `today` (ventas activas). */
  vendidoMesCentavos: number;
  ventasMes: number;
  gananciaMesCentavos: number;
  /** Avance hacia la meta del mes, o null si todavía no la definió. */
  meta: GoalProgress | null;
  porCobrarCentavos: number;
  valorStockCentavos: number;
  productosSinStock: number;
  productosStockBajo: number;
  /** Clientas con saldo: vencidas primero, después por monto. */
  deudoras: Debtor[];
};

const MAX_DEBTORS = 5;

function debtNote(venceEl: string | null, vencida: boolean, today: string): string {
  if (venceEl === null) return 'Con saldo';
  const days = daysBetween(venceEl, today);
  if (vencida) return days === 1 ? 'Vencido ayer' : `Vencido hace ${days} días`;
  if (days === 0) return 'Vence hoy';
  return days === -1 ? 'Vence mañana' : `Vence en ${-days} días`;
}

/** Resume ventas y productos para el inicio. Es pura: recibe «hoy» (AAAA-MM-DD) como dato. */
export function buildHomeSummary(
  sales: Sale[],
  products: Product[],
  today: string,
  extras: HomeExtras = { gananciaMesCentavos: 0, goal: null },
): HomeSummary {
  const month = today.slice(0, 7);
  const active = sales.filter((sale) => sale.estado === 'activa');

  const thisMonth = active.filter((sale) => sale.vendidaEl.startsWith(month));
  const vendidoMesCentavos = thisMonth.reduce((sum, sale) => sum + sale.totalCentavos, 0);
  const porCobrarCentavos = active.reduce((sum, sale) => sum + sale.saldoCentavos, 0);

  const byClient = new Map<string, { nombre: string; saldo: number; venceEl: string | null }>();
  for (const sale of active) {
    if (sale.clientId === null || sale.saldoCentavos <= 0) continue;
    const current = byClient.get(sale.clientId) ?? {
      nombre: sale.clientName ?? 'Clienta',
      saldo: 0,
      venceEl: null,
    };
    current.saldo += sale.saldoCentavos;
    if (sale.venceEl !== null && (current.venceEl === null || sale.venceEl < current.venceEl)) {
      current.venceEl = sale.venceEl;
    }
    byClient.set(sale.clientId, current);
  }

  const deudoras: Debtor[] = [...byClient.entries()]
    .map(([clientId, d]) => {
      const vencida = d.venceEl !== null && d.venceEl < today;
      return {
        clientId,
        nombre: d.nombre,
        saldoCentavos: d.saldo,
        venceEl: d.venceEl,
        vencida,
        nota: debtNote(d.venceEl, vencida, today),
      };
    })
    .sort((a, b) =>
      a.vencida !== b.vencida ? (a.vencida ? -1 : 1) : b.saldoCentavos - a.saldoCentavos,
    )
    .slice(0, MAX_DEBTORS);

  return {
    vendidoMesCentavos,
    ventasMes: thisMonth.length,
    gananciaMesCentavos: extras.gananciaMesCentavos,
    meta: extras.goal
      ? {
          ventasMetaCentavos: extras.goal.ventasCentavos,
          ventasPct: goalProgressPct(vendidoMesCentavos, extras.goal.ventasCentavos) ?? 0,
          gananciaMetaCentavos: extras.goal.gananciaCentavos,
          gananciaPct: goalProgressPct(extras.gananciaMesCentavos, extras.goal.gananciaCentavos),
        }
      : null,
    porCobrarCentavos,
    valorStockCentavos: valorStockCentavos(products),
    productosSinStock: products.filter((p) => p.stock === 0).length,
    productosStockBajo: products.filter(
      (p) => p.stock > 0 && p.stockMinimo > 0 && p.stock <= p.stockMinimo,
    ).length,
    deudoras,
  };
}
