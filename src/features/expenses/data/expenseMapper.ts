import type { Expense, ExpenseCategory, ExpenseInput } from '../domain/expense';

/** Fila tal como la devuelve la tabla `public.expenses`. */
export type ExpenseRow = {
  id: string;
  fecha: string;
  concepto: string;
  categoria: ExpenseCategory;
  monto_centavos: number;
};

export const EXPENSE_COLUMNS = 'id, fecha, concepto, categoria, monto_centavos';

export function toExpense(row: ExpenseRow): Expense {
  return {
    id: row.id,
    fecha: row.fecha,
    concepto: row.concepto,
    categoria: row.categoria,
    montoCentavos: row.monto_centavos,
  };
}

/** Solo las columnas que la consultora puede escribir (`user_id` lo pone la base). */
export function toWritableRow(input: ExpenseInput) {
  return {
    fecha: input.fecha,
    concepto: input.concepto,
    categoria: input.categoria,
    monto_centavos: input.montoCentavos,
  };
}
