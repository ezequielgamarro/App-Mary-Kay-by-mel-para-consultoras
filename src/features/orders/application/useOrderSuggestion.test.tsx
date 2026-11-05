import { renderHook, waitFor } from '@testing-library/react-native';

import type { Product } from '@/features/products/domain/product';
import type { ProductRepository } from '@/features/products/domain/productRepository';
import type { SaleRepository } from '@/features/sales/domain/saleRepository';

import { useOrderSuggestion } from './useOrderSuggestion';

jest.mock('@/features/sales/data/supabaseSaleRepository', () => ({ supabaseSaleRepository: {} }));
jest.mock('@/features/products/data/supabaseProductRepository', () => ({
  supabaseProductRepository: {},
}));

const crema: Product = {
  id: 'a',
  nombre: 'Crema',
  codigo: null,
  costoCentavos: 100000,
  precioCentavos: 600000,
  stock: 0,
  stockMinimo: 3,
  imagenPath: null,
  createdAt: '',
  updatedAt: '',
};

function repos(overrides: { products?: object; sales?: object } = {}) {
  return {
    products: {
      list: jest.fn().mockResolvedValue({ ok: true, data: [crema] }),
      ...overrides.products,
    } as unknown as ProductRepository,
    sales: {
      soldUnitsSince: jest.fn().mockResolvedValue({ ok: true, data: { a: 12 } }),
      ...overrides.sales,
    } as unknown as SaleRepository,
  };
}

describe('useOrderSuggestion', () => {
  it('mira las ventas de los últimos 60 días y arma la sugerencia', async () => {
    const repositories = repos();
    const today = () => '2026-11-10';
    const { result } = await renderHook(() => useOrderSuggestion(repositories, today));
    await waitFor(() => expect(result.current.state.status).toBe('ready'));
    expect(repositories.sales.soldUnitsSince).toHaveBeenCalledWith('2026-09-11');
    expect(result.current.state).toMatchObject({
      status: 'ready',
      data: [expect.objectContaining({ productId: 'a', sugerido: 6 })], // 12 en 60 días → 6 al mes
    });
  });

  it('devuelve el error si falla la consulta de ventas', async () => {
    const repositories = repos({
      sales: { soldUnitsSince: jest.fn().mockResolvedValue({ ok: false, message: 'sin red' }) },
    });
    const { result } = await renderHook(() => useOrderSuggestion(repositories));
    await waitFor(() => expect(result.current.state.status).toBe('error'));
    expect(result.current.state).toMatchObject({ message: 'sin red' });
  });
});
