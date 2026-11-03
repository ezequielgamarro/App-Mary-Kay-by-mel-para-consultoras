import { toPayment, toRegisterSaleArgs, toSale, toSaleItem, type SaleRow } from './saleMapper';

const row: SaleRow = {
  id: 's1',
  client_id: 'c1',
  vendida_el: '2026-11-02',
  vence_el: '2026-11-15',
  notas: 'nota',
  estado: 'activa',
  total_centavos: 1200000,
  pagado_centavos: 400000,
  saldo_centavos: 800000,
  created_at: '2026-11-02T10:00:00Z',
  clients: { nombre: 'Marta' },
};

describe('saleMapper', () => {
  it('convierte la fila de la venta con el nombre de la clienta', () => {
    expect(toSale(row)).toEqual({
      id: 's1',
      clientId: 'c1',
      clientName: 'Marta',
      vendidaEl: '2026-11-02',
      venceEl: '2026-11-15',
      notas: 'nota',
      estado: 'activa',
      totalCentavos: 1200000,
      pagadoCentavos: 400000,
      saldoCentavos: 800000,
      createdAt: '2026-11-02T10:00:00Z',
    });
  });

  it('acepta una venta de mostrador (sin clienta)', () => {
    expect(toSale({ ...row, client_id: null, clients: null })).toMatchObject({
      clientId: null,
      clientName: null,
    });
  });

  it('convierte productos vendidos y pagos', () => {
    expect(
      toSaleItem({
        id: 'i1',
        product_id: null,
        nombre_producto: 'Crema',
        cantidad: 2,
        precio_centavos: 600000,
        costo_centavos: 350000,
      }),
    ).toEqual({
      id: 'i1',
      productId: null,
      nombreProducto: 'Crema',
      cantidad: 2,
      precioCentavos: 600000,
      costoCentavos: 350000,
    });
    expect(
      toPayment({
        id: 'p1',
        monto_centavos: 400000,
        medio: 'transferencia',
        pagado_el: '2026-11-02',
        created_at: 'x',
      }),
    ).toEqual({
      id: 'p1',
      montoCentavos: 400000,
      medio: 'transferencia',
      pagadoEl: '2026-11-02',
      createdAt: 'x',
    });
  });

  it('arma los parámetros de register_sale con los nombres de la base', () => {
    expect(
      toRegisterSaleArgs({
        clientId: 'c1',
        venceEl: '2026-11-15',
        notas: null,
        items: [{ productId: 'p1', cantidad: 2, precioCentavos: 600000 }],
        pagos: [{ montoCentavos: 400000, medio: 'efectivo' }],
      }),
    ).toEqual({
      p_client_id: 'c1',
      p_vence_el: '2026-11-15',
      p_notas: null,
      p_items: [{ product_id: 'p1', cantidad: 2, precio_centavos: 600000 }],
      p_pagos: [{ monto_centavos: 400000, medio: 'efectivo' }],
    });
  });
});
