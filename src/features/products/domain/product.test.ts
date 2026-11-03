import {
  filterProducts,
  gananciaCentavos,
  margenSobreCostoPct,
  productFormSchema,
  stockStatus,
  valorStockCentavos,
  type Product,
} from './product';

const make = (over: Partial<Product> = {}): Product => ({
  id: '1',
  nombre: 'Crema de manos',
  codigo: 'CM-01',
  costoCentavos: 350000,
  precioCentavos: 600000,
  stock: 10,
  stockMinimo: 3,
  imagenPath: null,
  createdAt: '',
  updatedAt: '',
  ...over,
});

describe('productFormSchema', () => {
  const base = {
    nombre: ' Crema ',
    codigo: '',
    costoCentavos: '3.500',
    precioCentavos: '6000,50',
    stock: '10',
    stockMinimo: '',
  };

  it('normaliza texto a centavos y enteros', () => {
    expect(productFormSchema.parse(base)).toEqual({
      nombre: 'Crema',
      codigo: null,
      costoCentavos: 350000,
      precioCentavos: 600050,
      stock: 10,
      stockMinimo: 0,
    });
  });
  it('los números vacíos valen 0', () => {
    const r = productFormSchema.parse({
      ...base,
      costoCentavos: '',
      precioCentavos: '',
      stock: '',
    });
    expect([r.costoCentavos, r.precioCentavos, r.stock]).toEqual([0, 0, 0]);
  });
  it('rechaza nombre vacío o largo y código largo', () => {
    expect(productFormSchema.safeParse({ ...base, nombre: ' ' }).success).toBe(false);
    expect(productFormSchema.safeParse({ ...base, nombre: 'a'.repeat(121) }).success).toBe(false);
    expect(productFormSchema.safeParse({ ...base, codigo: 'x'.repeat(41) }).success).toBe(false);
  });
  it('rechaza importes y cantidades inválidos con el campo en el mensaje', () => {
    const precio = productFormSchema.safeParse({ ...base, precioCentavos: 'abc' });
    expect(precio.success).toBe(false);
    if (!precio.success) expect(precio.error.issues[0].message).toMatch(/Precio de venta/);
    expect(productFormSchema.safeParse({ ...base, stock: '-1' }).success).toBe(false);
    expect(productFormSchema.safeParse({ ...base, stock: '2,5' }).success).toBe(false);
    expect(productFormSchema.safeParse({ ...base, stock: '1000001' }).success).toBe(false);
    expect(productFormSchema.safeParse({ ...base, costoCentavos: '1.000.000.001' }).success).toBe(
      false,
    );
  });
});

describe('stockStatus', () => {
  it('distingue sin stock, bajo y ok', () => {
    expect(stockStatus(make({ stock: 0 }))).toBe('sin_stock');
    expect(stockStatus(make({ stock: 3, stockMinimo: 3 }))).toBe('bajo');
    expect(stockStatus(make({ stock: 4, stockMinimo: 3 }))).toBe('ok');
  });
  it('sin mínimo configurado, con existencias está ok', () => {
    expect(stockStatus(make({ stock: 1, stockMinimo: 0 }))).toBe('ok');
  });
});

describe('ganancia y margen', () => {
  it('calcula ganancia por unidad y margen sobre el costo', () => {
    expect(gananciaCentavos(make())).toBe(250000);
    expect(margenSobreCostoPct(make())).toBe(71);
  });
  it('ganancia negativa si se vende bajo el costo; margen null sin costo', () => {
    expect(gananciaCentavos(make({ precioCentavos: 300000 }))).toBe(-50000);
    expect(margenSobreCostoPct(make({ costoCentavos: 0 }))).toBeNull();
  });
});

describe('valorStockCentavos', () => {
  it('suma costo por existencias', () => {
    const items = [make(), make({ id: '2', costoCentavos: 100000, stock: 2 })];
    expect(valorStockCentavos(items)).toBe(350000 * 10 + 100000 * 2);
    expect(valorStockCentavos([])).toBe(0);
  });
});

describe('filterProducts', () => {
  const all = [make(), make({ id: '2', nombre: 'Labial rojo', codigo: null })];
  it('busca por nombre o código sin tildes ni mayúsculas', () => {
    expect(filterProducts(all, 'CREMA')).toHaveLength(1);
    expect(filterProducts(all, 'cm-01')).toHaveLength(1);
    expect(filterProducts(all, 'rojó')).toHaveLength(1);
  });
  it('búsqueda vacía devuelve todo', () => {
    expect(filterProducts(all, ' ')).toHaveLength(2);
  });
});
