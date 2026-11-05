import type { Product } from '@/features/products/domain/product';

import {
  buildSuggestion,
  chosenQuantity,
  orderMessage,
  parseQuantity,
  simulateOrder,
} from './order';

function product(overrides: Partial<Product> & { id: string; nombre: string }): Product {
  return {
    codigo: null,
    costoCentavos: 300000,
    precioCentavos: 600000,
    stock: 10,
    stockMinimo: 2,
    imagenPath: null,
    createdAt: '',
    updatedAt: '',
    ...overrides,
  };
}

describe('buildSuggestion', () => {
  it('sugiere lo que falta para llegar al mínimo o a un mes de ventas, lo que sea mayor', () => {
    const lines = buildSuggestion(
      [
        product({ id: 'a', nombre: 'Crema', stock: 1, stockMinimo: 5 }),
        product({ id: 'b', nombre: 'Labial', stock: 4, stockMinimo: 2 }),
      ],
      { a: 2, b: 20 }, // b: 20 en 60 días → 10 por mes
    );
    expect(lines.find((l) => l.productId === 'a')?.sugerido).toBe(4); // mínimo 5 − 1
    expect(lines.find((l) => l.productId === 'b')?.sugerido).toBe(6); // 10 − 4
  });

  it('no sugiere productos con stock suficiente', () => {
    expect(buildSuggestion([product({ id: 'a', nombre: 'Crema', stock: 10 })], { a: 6 })).toEqual(
      [],
    );
  });

  it('ordena primero lo agotado, después lo bajo el mínimo y al final lo que rota', () => {
    const lines = buildSuggestion(
      [
        product({ id: 'rota', nombre: 'Rota', stock: 5, stockMinimo: 1 }),
        product({ id: 'baja', nombre: 'Baja', stock: 2, stockMinimo: 3 }),
        product({ id: 'cero', nombre: 'Cero', stock: 0, stockMinimo: 0 }),
      ],
      { rota: 60, baja: 1, cero: 1 },
    );
    expect(lines.map((l) => l.productId)).toEqual(['cero', 'baja', 'rota']);
    expect(lines[0]?.motivo).toBe('Sin stock');
    expect(lines[1]?.motivo).toBe('Stock bajo: quedan 2 (mínimo 3)');
  });
});

describe('parseQuantity', () => {
  it('acepta enteros y trata lo inválido como 0', () => {
    expect(parseQuantity(' 12 ')).toBe(12);
    expect(parseQuantity('')).toBe(0);
    expect(parseQuantity('-3')).toBe(0);
    expect(parseQuantity('2,5')).toBe(0);
    expect(parseQuantity('99999999')).toBe(0);
  });
});

describe('simulateOrder y orderMessage', () => {
  const lines = buildSuggestion(
    [
      product({ id: 'a', nombre: 'Crema', stock: 0, stockMinimo: 4, costoCentavos: 100000 }),
      product({ id: 'b', nombre: 'Labial', stock: 0, stockMinimo: 2, costoCentavos: 50000 }),
    ],
    {},
  );

  it('usa lo sugerido si no se tocó la cantidad', () => {
    expect(chosenQuantity(lines[0]!, {})).toBe(4);
    const totals = simulateOrder(lines, {});
    expect(totals).toEqual({
      productos: 2,
      unidades: 6,
      costoCentavos: 4 * 100000 + 2 * 50000,
      ventaCentavos: 6 * 600000,
      gananciaCentavos: 6 * 600000 - (4 * 100000 + 2 * 50000),
    });
  });

  it('respeta las cantidades cambiadas y descarta las que quedan en 0', () => {
    const quantities = { a: '1', b: '0' };
    expect(simulateOrder(lines, quantities).unidades).toBe(1);
    const message = orderMessage(lines, quantities);
    expect(message).toContain('• 1 × Crema');
    expect(message).not.toContain('Labial');
    expect(message).toMatch(/Total: 1 unidad ·/);
  });
});
