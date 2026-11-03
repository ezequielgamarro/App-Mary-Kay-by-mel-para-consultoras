import { renderHook, waitFor } from '@testing-library/react-native';

import type { GoalRepository } from '@/features/goals/domain/goalRepository';
import type { ProductRepository } from '@/features/products/domain/productRepository';
import type { Sale } from '@/features/sales/domain/sale';
import type { SaleRepository } from '@/features/sales/domain/saleRepository';

import { useHomeSummary } from './useHomeSummary';

// Evita cargar el cliente real de Supabase (exige variables de entorno) en los tests.
jest.mock('@/features/sales/data/supabaseSaleRepository', () => ({ supabaseSaleRepository: {} }));
jest.mock('@/features/goals/data/supabaseGoalRepository', () => ({ supabaseGoalRepository: {} }));
jest.mock('@/features/products/data/supabaseProductRepository', () => ({
  supabaseProductRepository: {},
}));

const venta: Sale = {
  id: 's1',
  clientId: 'c1',
  clientName: 'Marta',
  vendidaEl: '2026-11-05',
  venceEl: null,
  notas: null,
  estado: 'activa',
  totalCentavos: 500000,
  pagadoCentavos: 0,
  saldoCentavos: 500000,
  createdAt: '',
};

function repos(
  sales: Partial<SaleRepository> = {},
  products: Partial<ProductRepository> = {},
  goals: Partial<GoalRepository> = {},
) {
  return {
    sales: {
      list: jest.fn().mockResolvedValue({ ok: true, data: [venta] }),
      profitSince: jest.fn().mockResolvedValue({ ok: true, data: 120000 }),
      ...sales,
    } as unknown as SaleRepository,
    products: {
      list: jest.fn().mockResolvedValue({ ok: true, data: [] }),
      ...products,
    } as unknown as ProductRepository,
    goals: {
      get: jest.fn().mockResolvedValue({
        ok: true,
        data: { id: 'g', mes: '2026-11-01', ventasCentavos: 1000000, gananciaCentavos: null },
      }),
      ...goals,
    } as unknown as GoalRepository,
  };
}

const today = () => '2026-11-10';

describe('useHomeSummary', () => {
  it('calcula las cifras con ventas y productos', async () => {
    const r = repos();
    const { result } = await renderHook(() => useHomeSummary(r, today));
    await waitFor(() => expect(result.current.state.status).toBe('ready'));
    expect(result.current.state).toMatchObject({
      status: 'ready',
      data: {
        vendidoMesCentavos: 500000,
        porCobrarCentavos: 500000,
        gananciaMesCentavos: 120000,
        meta: { ventasPct: 50 },
      },
    });
  });

  it('muestra el error si fallan las ventas', async () => {
    const r = repos({ list: jest.fn().mockResolvedValue({ ok: false, message: 'sin señal' }) });
    const { result } = await renderHook(() => useHomeSummary(r, today));
    await waitFor(() =>
      expect(result.current.state).toEqual({ status: 'error', message: 'sin señal' }),
    );
  });

  it('muestra el error si falla la meta o la ganancia', async () => {
    const r1 = repos(
      {},
      {},
      { get: jest.fn().mockResolvedValue({ ok: false, message: 'meta caída' }) },
    );
    const a = await renderHook(() => useHomeSummary(r1, today));
    await waitFor(() =>
      expect(a.result.current.state).toEqual({ status: 'error', message: 'meta caída' }),
    );
    const r2 = repos({
      profitSince: jest.fn().mockResolvedValue({ ok: false, message: 'sin ganancia' }),
    });
    const b = await renderHook(() => useHomeSummary(r2, today));
    await waitFor(() =>
      expect(b.result.current.state).toEqual({ status: 'error', message: 'sin ganancia' }),
    );
  });

  it('muestra el error si fallan los productos', async () => {
    const r = repos({}, { list: jest.fn().mockResolvedValue({ ok: false, message: 'caído' }) });
    const { result } = await renderHook(() => useHomeSummary(r, today));
    await waitFor(() =>
      expect(result.current.state).toEqual({ status: 'error', message: 'caído' }),
    );
  });
});
