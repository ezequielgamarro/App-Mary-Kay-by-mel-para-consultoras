import type { Goal, GoalInput } from '../domain/goal';

/** Fila tal como la devuelve la tabla `public.goals`. */
export type GoalRow = {
  id: string;
  mes: string;
  ventas_centavos: number;
  ganancia_centavos: number | null;
};

export const GOAL_COLUMNS = 'id, mes, ventas_centavos, ganancia_centavos';

export function toGoal(row: GoalRow): Goal {
  return {
    id: row.id,
    mes: row.mes,
    ventasCentavos: row.ventas_centavos,
    gananciaCentavos: row.ganancia_centavos,
  };
}

/** Fila a guardar: solo columnas que la consultora puede escribir (`user_id` lo pone la base). */
export function toWritableRow(mes: string, input: GoalInput) {
  return {
    mes,
    ventas_centavos: input.ventasCentavos,
    ganancia_centavos: input.gananciaCentavos,
  };
}
