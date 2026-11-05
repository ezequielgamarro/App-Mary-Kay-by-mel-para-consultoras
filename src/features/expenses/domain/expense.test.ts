import { buildExpenseInput, monthExpensesTotal, type Expense, type ExpenseForm } from './expense';

const TODAY = '2026-11-10';
const valid: ExpenseForm = {
  concepto: ' Nafta ',
  monto: '2.500',
  fecha: '08/11/2026',
  categoria: 'transporte',
};

describe('buildExpenseInput', () => {
  it('arma el gasto con el texto recortado, el monto en centavos y la fecha ISO', () => {
    expect(buildExpenseInput(valid, TODAY)).toEqual({
      ok: true,
      input: {
        concepto: 'Nafta',
        montoCentavos: 250000,
        fecha: '2026-11-08',
        categoria: 'transporte',
      },
    });
  });

  it.each([
    [{ concepto: '   ' }, 'concepto'],
    [{ concepto: 'x'.repeat(201) }, 'concepto'],
    [{ monto: '' }, 'monto'],
    [{ monto: '0' }, 'monto'],
    [{ monto: 'abc' }, 'monto'],
    [{ fecha: '31/02/2026' }, 'fecha'],
    [{ fecha: '11/11/2026' }, 'fecha'], // futura
  ] as [Partial<ExpenseForm>, keyof ExpenseForm][])(
    'rechaza %j en el campo %s',
    (change, field) => {
      const result = buildExpenseInput({ ...valid, ...change }, TODAY);
      expect(result).toMatchObject({ ok: false, field });
    },
  );

  it('acepta un gasto de hoy', () => {
    expect(buildExpenseInput({ ...valid, fecha: '10/11/2026' }, TODAY).ok).toBe(true);
  });
});

describe('monthExpensesTotal', () => {
  const expense = (fecha: string, montoCentavos: number): Expense => ({
    id: fecha,
    fecha,
    concepto: 'x',
    categoria: 'otros',
    montoCentavos,
  });

  it('suma solo los gastos del mes de hoy', () => {
    const list = [
      expense('2026-11-01', 100),
      expense('2026-11-09', 250),
      expense('2026-10-31', 999),
      expense('2025-11-05', 999),
    ];
    expect(monthExpensesTotal(list, TODAY)).toBe(350);
  });
});
