import { toProduct, toWritableRow } from './productMapper';

describe('productMapper', () => {
  it('convierte una fila de la base a Product', () => {
    expect(
      toProduct({
        id: '1',
        nombre: 'Crema',
        codigo: 'CM-01',
        costo_centavos: 350000,
        precio_centavos: 600000,
        stock: 10,
        stock_minimo: 3,
        imagen_path: 'u1/foto.jpg',
        created_at: '2026-11-02T10:00:00Z',
        updated_at: '2026-11-02T11:00:00Z',
      }),
    ).toEqual({
      id: '1',
      nombre: 'Crema',
      codigo: 'CM-01',
      costoCentavos: 350000,
      precioCentavos: 600000,
      stock: 10,
      stockMinimo: 3,
      imagenPath: 'u1/foto.jpg',
      createdAt: '2026-11-02T10:00:00Z',
      updatedAt: '2026-11-02T11:00:00Z',
    });
  });

  it('nunca envía user_id ni columnas que la consultora no puede escribir', () => {
    const row = toWritableRow({
      nombre: 'Crema',
      codigo: null,
      costoCentavos: 1,
      precioCentavos: 2,
      stock: 3,
      stockMinimo: 4,
      imagenPath: null,
    });
    expect(Object.keys(row).sort()).toEqual([
      'codigo',
      'costo_centavos',
      'imagen_path',
      'nombre',
      'precio_centavos',
      'stock',
      'stock_minimo',
    ]);
  });
});
