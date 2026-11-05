import { orderErrorMessage, GENERIC_ERROR } from './orderErrors';
import { toOrder, toRegisterOrderArgs, type OrderRow } from './orderMapper';

describe('toOrder', () => {
  it('suma unidades, costo y venta de los renglones', () => {
    const row: OrderRow = {
      id: 'o1',
      pedido_el: '2026-11-05',
      estado: 'pendiente',
      notas: null,
      created_at: '',
      order_items: [
        { cantidad: 4, costo_centavos: 100000, precio_centavos: 600000 },
        { cantidad: 2, costo_centavos: 50000, precio_centavos: 300000 },
      ],
    };
    expect(toOrder(row)).toMatchObject({
      unidades: 6,
      costoCentavos: 500000,
      ventaCentavos: 3000000,
      pedidoEl: '2026-11-05',
    });
  });
});

describe('toRegisterOrderArgs', () => {
  it('usa los nombres de la función de la base', () => {
    expect(toRegisterOrderArgs({ notas: 'x', items: [{ productId: 'p', cantidad: 3 }] })).toEqual({
      p_notas: 'x',
      p_items: [{ product_id: 'p', cantidad: 3 }],
    });
  });
});

describe('orderErrorMessage', () => {
  it('muestra el texto de las reglas de negocio y oculta lo técnico', () => {
    expect(orderErrorMessage({ code: 'BP003', message: 'Ese pedido no existe.' })).toBe(
      'Ese pedido no existe.',
    );
    expect(orderErrorMessage({ code: '42501', message: 'permission denied for table x' })).toBe(
      GENERIC_ERROR,
    );
  });
});
