import {
  addProductToDraft,
  buildPaymentInput,
  buildSaleInput,
  draftTotal,
  EMPTY_DRAFT,
  gananciaVenta,
  lineSubtotal,
  saleStatus,
  saleStatusText,
  totalPorCobrar,
  type DraftLine,
  type Sale,
  type SaleDraft,
} from './sale';

const TODAY = '2026-11-02';

const crema = { id: 'p1', nombre: 'Crema', precioCentavos: 600000, stock: 5 };

function line(overrides: Partial<DraftLine> = {}): DraftLine {
  return {
    productId: 'p1',
    nombre: 'Crema',
    stock: 5,
    cantidad: '2',
    precio: '6.000',
    ...overrides,
  };
}

function draft(overrides: Partial<SaleDraft> = {}): SaleDraft {
  return { ...EMPTY_DRAFT, clientId: 'c1', lines: [line()], ...overrides };
}

function sale(overrides: Partial<Sale> = {}): Sale {
  return {
    id: 's1',
    clientId: 'c1',
    clientName: 'Marta',
    vendidaEl: '2026-10-30',
    venceEl: null,
    notas: null,
    estado: 'activa',
    totalCentavos: 1000000,
    pagadoCentavos: 400000,
    saldoCentavos: 600000,
    createdAt: '',
    ...overrides,
  };
}

describe('addProductToDraft', () => {
  it('agrega el producto con cantidad 1 y su precio de lista', () => {
    expect(addProductToDraft([], crema)).toEqual([
      { productId: 'p1', nombre: 'Crema', stock: 5, cantidad: '1', precio: '6000' },
    ]);
  });
  it('si ya estaba, suma una unidad sin pasar del stock', () => {
    const una = addProductToDraft([], { ...crema, stock: 2 });
    const dos = addProductToDraft(una, { ...crema, stock: 2 });
    expect(dos[0].cantidad).toBe('2');
    expect(addProductToDraft(dos, { ...crema, stock: 2 })[0].cantidad).toBe('2');
  });
  it('no agrega productos sin stock', () => {
    expect(addProductToDraft([], { ...crema, stock: 0 })).toEqual([]);
  });
});

describe('lineSubtotal y draftTotal', () => {
  it('multiplica cantidad por precio en centavos', () => {
    expect(lineSubtotal(line())).toBe(1200000);
  });
  it('devuelve null con datos incompletos y no los suma al total', () => {
    expect(lineSubtotal(line({ cantidad: '' }))).toBeNull();
    expect(draftTotal([line(), line({ productId: 'p2', precio: 'abc' })])).toBe(1200000);
  });
});

describe('buildSaleInput', () => {
  it('arma la venta con pago parcial y vencimiento', () => {
    const result = buildSaleInput(
      draft({ pago: '4.000', medio: 'transferencia', venceEl: '15/11/2026', notas: ' hola ' }),
      TODAY,
    );
    expect(result).toEqual({
      ok: true,
      totalCentavos: 1200000,
      saldoCentavos: 800000,
      input: {
        clientId: 'c1',
        venceEl: '2026-11-15',
        notas: 'hola',
        items: [{ productId: 'p1', cantidad: 2, precioCentavos: 600000 }],
        pagos: [{ montoCentavos: 400000, medio: 'transferencia' }],
      },
    });
  });

  it('una venta de mostrador pagada completa no necesita clienta ni vencimiento', () => {
    const result = buildSaleInput(draft({ clientId: null, pago: '12.000', venceEl: '' }), TODAY);
    expect(result).toMatchObject({ ok: true, saldoCentavos: 0 });
    if (result.ok) {
      expect(result.input.venceEl).toBeNull();
      expect(result.input.clientId).toBeNull();
    }
  });

  it('ignora el vencimiento cuando no queda saldo', () => {
    const result = buildSaleInput(draft({ pago: '12.000', venceEl: 'cualquier cosa' }), TODAY);
    expect(result).toMatchObject({ ok: true });
  });

  it('rechaza una venta sin productos', () => {
    expect(buildSaleInput(draft({ lines: [] }), TODAY)).toMatchObject({
      ok: false,
      field: 'lines',
    });
  });

  it('rechaza cantidades fuera de rango o mayores al stock', () => {
    for (const cantidad of ['0', '6', '-1', '1,5', '']) {
      expect(buildSaleInput(draft({ lines: [line({ cantidad })] }), TODAY)).toMatchObject({
        ok: false,
        field: 'lines',
      });
    }
  });

  it('rechaza precios inválidos', () => {
    expect(buildSaleInput(draft({ lines: [line({ precio: 'gratis' })] }), TODAY)).toMatchObject({
      ok: false,
      field: 'lines',
    });
  });

  it('rechaza un pago mayor al total o ilegible', () => {
    expect(buildSaleInput(draft({ pago: '12.001' }), TODAY)).toMatchObject({
      ok: false,
      field: 'pago',
    });
    expect(buildSaleInput(draft({ pago: 'mucho' }), TODAY)).toMatchObject({
      ok: false,
      field: 'pago',
    });
  });

  it('exige clienta cuando queda saldo', () => {
    expect(buildSaleInput(draft({ clientId: null, pago: '1.000' }), TODAY)).toMatchObject({
      ok: false,
      field: 'cliente',
    });
  });

  it('valida el formato y que el vencimiento no sea pasado', () => {
    expect(buildSaleInput(draft({ venceEl: '2026-11-15' }), TODAY)).toMatchObject({
      ok: false,
      field: 'venceEl',
    });
    expect(buildSaleInput(draft({ venceEl: '01/11/2026' }), TODAY)).toMatchObject({
      ok: false,
      field: 'venceEl',
    });
    expect(buildSaleInput(draft({ venceEl: '02/11/2026' }), TODAY)).toMatchObject({ ok: true });
  });

  it('no manda pagos cuando no se cobró nada', () => {
    const result = buildSaleInput(draft({ pago: '' }), TODAY);
    expect(result).toMatchObject({ ok: true });
    if (result.ok) expect(result.input.pagos).toEqual([]);
  });

  it('rechaza notas demasiado largas', () => {
    expect(buildSaleInput(draft({ notas: 'x'.repeat(2001) }), TODAY)).toMatchObject({
      ok: false,
      field: 'notas',
    });
  });
});

describe('buildPaymentInput', () => {
  it('acepta un importe dentro del saldo', () => {
    expect(buildPaymentInput('2.500', 'efectivo', 600000)).toEqual({
      ok: true,
      input: { montoCentavos: 250000, medio: 'efectivo' },
    });
  });
  it('acepta cobrar exactamente el saldo', () => {
    expect(buildPaymentInput('6000', 'otro', 600000)).toMatchObject({ ok: true });
  });
  it('rechaza cero, texto y más que el saldo', () => {
    expect(buildPaymentInput('0', 'efectivo', 600000)).toMatchObject({ ok: false });
    expect(buildPaymentInput('abc', 'efectivo', 600000)).toMatchObject({ ok: false });
    expect(buildPaymentInput('6.001', 'efectivo', 600000)).toMatchObject({ ok: false });
  });
});

describe('saleStatus y saleStatusText', () => {
  it('distingue anulada, pagada, vencida y por cobrar', () => {
    expect(saleStatus(sale({ estado: 'anulada' }), TODAY)).toBe('anulada');
    expect(saleStatus(sale({ saldoCentavos: 0 }), TODAY)).toBe('pagada');
    expect(saleStatus(sale({ venceEl: '2026-10-30' }), TODAY)).toBe('vencida');
    expect(saleStatus(sale({ venceEl: TODAY }), TODAY)).toBe('por_cobrar');
    expect(saleStatus(sale(), TODAY)).toBe('por_cobrar');
  });
  it('escribe el estado en palabras', () => {
    expect(saleStatusText(sale({ estado: 'anulada' }), TODAY)).toBe('Anulada');
    expect(saleStatusText(sale({ saldoCentavos: 0 }), TODAY)).toBe('Pagada');
    expect(saleStatusText(sale(), TODAY)).toBe('Con saldo');
    expect(saleStatusText(sale({ venceEl: '2026-10-30' }), TODAY)).toBe('Vencida hace 3 días');
    expect(saleStatusText(sale({ venceEl: '2026-11-01' }), TODAY)).toBe('Vencida ayer');
    expect(saleStatusText(sale({ venceEl: TODAY }), TODAY)).toBe('Vence hoy');
    expect(saleStatusText(sale({ venceEl: '2026-11-03' }), TODAY)).toBe('Vence mañana');
    expect(saleStatusText(sale({ venceEl: '2026-11-09' }), TODAY)).toBe('Vence en 7 días');
  });
});

describe('totales', () => {
  it('suma el saldo solo de las ventas activas', () => {
    expect(
      totalPorCobrar([
        sale({ saldoCentavos: 600000 }),
        sale({ saldoCentavos: 100000 }),
        sale({ estado: 'anulada', saldoCentavos: 900000 }),
      ]),
    ).toBe(700000);
  });
  it('calcula la ganancia con el costo guardado al vender', () => {
    expect(
      gananciaVenta([
        {
          id: 'i1',
          productId: 'p1',
          nombreProducto: 'Crema',
          cantidad: 3,
          precioCentavos: 600000,
          costoCentavos: 350000,
        },
        {
          id: 'i2',
          productId: null,
          nombreProducto: 'Labial',
          cantidad: 1,
          precioCentavos: 90000,
          costoCentavos: 100000,
        },
      ]),
    ).toBe(3 * 250000 - 10000);
  });
});
