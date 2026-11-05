import type { Product } from '@/features/products/domain/product';
import type { Sale } from '@/features/sales/domain/sale';

import { buildHomeSummary } from './homeSummary';

const TODAY = '2026-11-10';

function sale(overrides: Partial<Sale> = {}): Sale {
  return {
    id: 's',
    clientId: 'c1',
    clientName: 'Marta',
    vendidaEl: '2026-11-05',
    venceEl: null,
    notas: null,
    estado: 'activa',
    totalCentavos: 1000000,
    pagadoCentavos: 0,
    saldoCentavos: 1000000,
    createdAt: '',
    ...overrides,
  };
}

function product(overrides: Partial<Product> = {}): Product {
  return {
    id: 'p',
    nombre: 'Crema',
    codigo: null,
    costoCentavos: 100000,
    precioCentavos: 200000,
    stock: 10,
    stockMinimo: 2,
    imagenPath: null,
    createdAt: '',
    updatedAt: '',
    ...overrides,
  };
}

describe('buildHomeSummary con metas', () => {
  const goal = { id: 'g', mes: '2026-11-01', ventasCentavos: 1000000, gananciaCentavos: 400000 };

  it('calcula el avance de ventas y de ganancia', () => {
    const summary = buildHomeSummary(
      [sale({ totalCentavos: 250000, saldoCentavos: 0 })],
      [],
      TODAY,
      { gananciaMesCentavos: 100000, goal },
    );
    expect(summary.gananciaMesCentavos).toBe(100000);
    expect(summary.meta).toEqual({
      ventasMetaCentavos: 1000000,
      ventasPct: 25,
      gananciaMetaCentavos: 400000,
      gananciaPct: 25,
    });
  });

  it('sin meta de ganancia solo informa el avance de ventas', () => {
    const summary = buildHomeSummary([], [], TODAY, {
      gananciaMesCentavos: 0,
      goal: { ...goal, gananciaCentavos: null },
    });
    expect(summary.meta).toMatchObject({
      ventasPct: 0,
      gananciaMetaCentavos: null,
      gananciaPct: null,
    });
  });

  it('permite superar el 100 %', () => {
    const summary = buildHomeSummary(
      [sale({ totalCentavos: 2000000, saldoCentavos: 0 })],
      [],
      TODAY,
      { gananciaMesCentavos: 0, goal },
    );
    expect(summary.meta?.ventasPct).toBe(200);
  });
});

describe('buildHomeSummary con gastos', () => {
  it('resta los gastos de la ganancia y permite un resultado negativo', () => {
    const summary = buildHomeSummary([], [], TODAY, {
      gananciaMesCentavos: 100000,
      goal: null,
      gastosMesCentavos: 130000,
    });
    expect(summary.gastosMesCentavos).toBe(130000);
    expect(summary.gananciaNetaCentavos).toBe(-30000);
  });
});

describe('buildHomeSummary', () => {
  it('sin datos devuelve todo en cero', () => {
    expect(buildHomeSummary([], [], TODAY)).toEqual({
      vendidoMesCentavos: 0,
      ventasMes: 0,
      gananciaMesCentavos: 0,
      gastosMesCentavos: 0,
      gananciaNetaCentavos: 0,
      meta: null,
      porCobrarCentavos: 0,
      valorStockCentavos: 0,
      productosSinStock: 0,
      productosStockBajo: 0,
      deudoras: [],
    });
  });

  it('suma lo vendido solo del mes en curso y de ventas activas', () => {
    const summary = buildHomeSummary(
      [
        sale({ id: '1', totalCentavos: 300000, saldoCentavos: 0 }),
        sale({ id: '2', totalCentavos: 200000, saldoCentavos: 0, vendidaEl: '2026-11-01' }),
        sale({ id: '3', totalCentavos: 900000, saldoCentavos: 0, vendidaEl: '2026-10-31' }),
        sale({ id: '4', totalCentavos: 700000, saldoCentavos: 0, estado: 'anulada' }),
      ],
      [],
      TODAY,
    );
    expect(summary.vendidoMesCentavos).toBe(500000);
    expect(summary.ventasMes).toBe(2);
  });

  it('por cobrar incluye meses anteriores pero no las anuladas', () => {
    const summary = buildHomeSummary(
      [
        sale({ id: '1', saldoCentavos: 400000 }),
        sale({ id: '2', saldoCentavos: 100000, vendidaEl: '2026-09-01' }),
        sale({ id: '3', saldoCentavos: 800000, estado: 'anulada' }),
      ],
      [],
      TODAY,
    );
    expect(summary.porCobrarCentavos).toBe(500000);
  });

  it('agrupa por clienta, ordena vencidas primero y calcula las notas', () => {
    const summary = buildHomeSummary(
      [
        sale({ id: '1', clientId: 'a', clientName: 'Ana', saldoCentavos: 900000 }),
        sale({
          id: '2',
          clientId: 'b',
          clientName: 'Beti',
          saldoCentavos: 100000,
          venceEl: '2026-11-07',
        }),
        sale({
          id: '3',
          clientId: 'b',
          clientName: 'Beti',
          saldoCentavos: 50000,
          venceEl: '2026-11-09',
        }),
        sale({
          id: '4',
          clientId: 'c',
          clientName: 'Cami',
          saldoCentavos: 300000,
          venceEl: '2026-11-11',
        }),
        sale({ id: '5', clientId: null, clientName: null, saldoCentavos: 0 }),
      ],
      [],
      TODAY,
    );
    expect(summary.deudoras.map((d) => [d.nombre, d.saldoCentavos, d.nota])).toEqual([
      ['Beti', 150000, 'Vencido hace 3 días'],
      ['Ana', 900000, 'Con saldo'],
      ['Cami', 300000, 'Vence mañana'],
    ]);
    expect(summary.deudoras[0].vencida).toBe(true);
  });

  it('ordena por monto entre clientas no vencidas y limita a 5', () => {
    const sales = ['a', 'b', 'c', 'd', 'e', 'f'].map((id, i) =>
      sale({ id, clientId: id, clientName: id, saldoCentavos: (i + 1) * 1000 }),
    );
    const summary = buildHomeSummary(sales, [], TODAY);
    expect(summary.deudoras.map((d) => d.nombre)).toEqual(['f', 'e', 'd', 'c', 'b']);
  });

  it('cuenta el stock: valor al costo, sin stock y stock bajo', () => {
    const summary = buildHomeSummary(
      [],
      [
        product({ id: '1', stock: 10, costoCentavos: 100000 }),
        product({ id: '2', stock: 0 }),
        product({ id: '3', stock: 2, stockMinimo: 2, costoCentavos: 50000 }),
        product({ id: '4', stock: 1, stockMinimo: 0 }),
      ],
      TODAY,
    );
    expect(summary.valorStockCentavos).toBe(1000000 + 100000 + 0 + product().costoCentavos);
    expect(summary.productosSinStock).toBe(1);
    expect(summary.productosStockBajo).toBe(1);
  });
});
