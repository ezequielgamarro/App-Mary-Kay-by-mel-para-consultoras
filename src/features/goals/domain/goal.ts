import { parseArs } from '@/core/money/parseArs';

export type Goal = {
  id: string;
  /** Primer día del mes de la meta (AAAA-MM-01). */
  mes: string;
  ventasCentavos: number;
  /** La meta de ganancia es opcional. */
  gananciaCentavos: number | null;
};

export type GoalInput = {
  ventasCentavos: number;
  gananciaCentavos: number | null;
};

/** Lo que escribe la usuaria: importes en pesos como texto. */
export type GoalForm = { ventas: string; ganancia: string };

/** Primer día del mes de una fecha AAAA-MM-DD. */
export function monthStart(date: string): string {
  return `${date.slice(0, 7)}-01`;
}

const MONTH_NAMES = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
];

/** «2026-11-01» → «noviembre de 2026». */
export function monthLabel(mes: string): string {
  const month = Number(mes.slice(5, 7));
  return `${MONTH_NAMES[month - 1] ?? ''} de ${mes.slice(0, 4)}`;
}

export type GoalBuildResult =
  { ok: true; input: GoalInput } | { ok: false; field: keyof GoalForm; message: string };

/** Valida el formulario: la meta de ventas es obligatoria y positiva; la de ganancia es opcional. */
export function buildGoalInput(form: GoalForm): GoalBuildResult {
  const ventas = parseArs(form.ventas);
  if (ventas === null || ventas <= 0) {
    return {
      ok: false,
      field: 'ventas',
      message: 'Ingresá la meta de ventas en pesos, por ejemplo 500.000.',
    };
  }
  let ganancia: number | null = null;
  if (form.ganancia.trim() !== '') {
    ganancia = parseArs(form.ganancia);
    if (ganancia === null || ganancia <= 0) {
      return {
        ok: false,
        field: 'ganancia',
        message: 'Ingresá la meta de ganancia en pesos, o dejala vacía.',
      };
    }
  }
  return { ok: true, input: { ventasCentavos: ventas, gananciaCentavos: ganancia } };
}

/** Avance hacia una meta en porcentaje entero (puede pasar de 100). Null si no hay meta. */
export function goalProgressPct(
  actualCentavos: number,
  targetCentavos: number | null,
): number | null {
  if (targetCentavos === null || targetCentavos <= 0) return null;
  return Math.max(0, Math.round((actualCentavos * 100) / targetCentavos));
}
