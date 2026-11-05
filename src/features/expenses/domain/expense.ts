import { parseDateAr } from '@/core/date/dates';
import { MAX_CENTS, parseArs } from '@/core/money/parseArs';

export type ExpenseCategory = 'mercaderia' | 'transporte' | 'publicidad' | 'otros';

export const EXPENSE_CATEGORIES: { value: ExpenseCategory; label: string }[] = [
  { value: 'mercaderia', label: 'Mercadería' },
  { value: 'transporte', label: 'Transporte' },
  { value: 'publicidad', label: 'Publicidad' },
  { value: 'otros', label: 'Otros' },
];

export function categoryLabel(category: ExpenseCategory): string {
  return EXPENSE_CATEGORIES.find((c) => c.value === category)?.label ?? category;
}

export type Expense = {
  id: string;
  /** Fecha ISO (AAAA-MM-DD). */
  fecha: string;
  concepto: string;
  categoria: ExpenseCategory;
  montoCentavos: number;
};

export type ExpenseInput = Omit<Expense, 'id'>;

/** Lo que escribe la usuaria: todo texto, la fecha como DD/MM/AAAA. */
export type ExpenseForm = {
  concepto: string;
  monto: string;
  fecha: string;
  categoria: ExpenseCategory;
};

export const MAX_EXPENSE_CONCEPT = 200;

export type ExpenseBuildResult =
  { ok: true; input: ExpenseInput } | { ok: false; field: keyof ExpenseForm; message: string };

/** Valida el formulario: concepto, monto mayor a 0 y una fecha real que no sea futura. */
export function buildExpenseInput(form: ExpenseForm, today: string): ExpenseBuildResult {
  const concepto = form.concepto.trim();
  if (concepto === '') {
    return { ok: false, field: 'concepto', message: 'Escribí en qué gastaste.' };
  }
  if (concepto.length > MAX_EXPENSE_CONCEPT) {
    return {
      ok: false,
      field: 'concepto',
      message: `El texto es muy largo (máximo ${MAX_EXPENSE_CONCEPT} caracteres).`,
    };
  }
  const monto = parseArs(form.monto);
  if (monto === null || monto <= 0 || monto > MAX_CENTS) {
    return {
      ok: false,
      field: 'monto',
      message: 'Ingresá un importe mayor a 0, por ejemplo 2.500 o 1.234,50.',
    };
  }
  const fecha = parseDateAr(form.fecha);
  if (fecha === null) {
    return { ok: false, field: 'fecha', message: 'Ingresá la fecha como DD/MM/AAAA.' };
  }
  if (fecha > today) {
    return { ok: false, field: 'fecha', message: 'La fecha no puede ser futura.' };
  }
  return { ok: true, input: { concepto, montoCentavos: monto, fecha, categoria: form.categoria } };
}

/** Total gastado en el mes de `today` (mismo año y mes). */
export function monthExpensesTotal(expenses: Expense[], today: string): number {
  const month = today.slice(0, 7);
  return expenses
    .filter((expense) => expense.fecha.slice(0, 7) === month)
    .reduce((sum, expense) => sum + expense.montoCentavos, 0);
}
