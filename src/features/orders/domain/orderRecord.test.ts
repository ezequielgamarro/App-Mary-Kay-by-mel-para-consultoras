import type { SuggestionLine } from './order';
import {
  buildOrderInput,
  orderSummaryText,
  recordMessage,
  type OrderRecordDetail,
} from './orderRecord';

function line(productId: string, nombre: string, sugerido: number): SuggestionLine {
  return {
    productId,
    nombre,
    stock: 0,
    stockMinimo: sugerido,
    vendidas: 0,
    costoCentavos: 100000,
    precioCentavos: 600000,
    sugerido,
    motivo: 'Sin stock',
  };
}

describe('buildOrderInput', () => {
  const lines = [line('a', 'Crema', 4), line('b', 'Labial', 2)];

  it('toma lo sugerido si no se tocó la cantidad y recorta las notas', () => {
    expect(buildOrderInput(lines, {}, '  ciclo 11  ')).toEqual({
      ok: true,
      input: {
        notas: 'ciclo 11',
        items: [
          { productId: 'a', cantidad: 4 },
          { productId: 'b', cantidad: 2 },
        ],
      },
    });
  });

  it('descarta los renglones en 0 y deja las notas vacías en null', () => {
    const built = buildOrderInput(lines, { a: '0', b: '5' }, '   ');
    expect(built).toEqual({
      ok: true,
      input: { notas: null, items: [{ productId: 'b', cantidad: 5 }] },
    });
  });

  it('rechaza un pedido sin productos', () => {
    expect(buildOrderInput(lines, { a: '0', b: '' }, '')).toEqual({
      ok: false,
      message: 'Elegí al menos un producto para pedir.',
    });
  });

  it('rechaza notas demasiado largas', () => {
    expect(buildOrderInput(lines, {}, 'x'.repeat(2001))).toMatchObject({ ok: false });
  });
});

describe('textos del historial', () => {
  const order: OrderRecordDetail = {
    id: 'o1',
    pedidoEl: '2026-11-05',
    estado: 'pendiente',
    notas: null,
    unidades: 6,
    costoCentavos: 600000,
    ventaCentavos: 3600000,
    createdAt: '',
    items: [
      {
        id: 'i1',
        productId: 'a',
        nombreProducto: 'Crema',
        cantidad: 6,
        costoCentavos: 100000,
        precioCentavos: 600000,
      },
    ],
  };

  it('resume el estado y las unidades', () => {
    expect(orderSummaryText(order)).toBe('Pendiente · 6 unidades');
    expect(orderSummaryText({ ...order, unidades: 1, estado: 'cancelado' })).toBe(
      'Cancelado · 1 unidad',
    );
  });

  it('arma el mensaje para compartir', () => {
    expect(recordMessage(order)).toBe('Pedido\n• 6 × Crema\nTotal: 6 unidades · costo $ 6.000');
  });
});
