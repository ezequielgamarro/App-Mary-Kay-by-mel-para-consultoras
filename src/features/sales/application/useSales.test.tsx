import { renderHook, waitFor } from '@testing-library/react-native';

import { EMPTY_DRAFT, type Sale, type SaleDetail, type SaleDraft } from '../domain/sale';
import type { SaleRepository } from '../domain/saleRepository';
import { useSale, useSaleActions, useSaleList } from './useSales';

// Evita cargar el cliente real de Supabase (exige variables de entorno) en los tests.
jest.mock('../data/supabaseSaleRepository', () => ({ supabaseSaleRepository: {} }));

const venta: Sale = {
  id: 's1',
  clientId: 'c1',
  clientName: 'Marta',
  vendidaEl: '2026-11-02',
  venceEl: null,
  notas: null,
  estado: 'activa',
  totalCentavos: 1200000,
  pagadoCentavos: 0,
  saldoCentavos: 1200000,
  createdAt: '',
};

const detalle: SaleDetail = { ...venta, items: [], payments: [] };

function fakeRepo(overrides: Partial<SaleRepository> = {}): SaleRepository {
  return {
    list: jest.fn().mockResolvedValue({ ok: true, data: [venta] }),
    get: jest.fn().mockResolvedValue({ ok: true, data: detalle }),
    register: jest.fn().mockResolvedValue({ ok: true, data: 's9' }),
    addPayment: jest.fn().mockResolvedValue({ ok: true, data: null }),
    removePayment: jest.fn().mockResolvedValue({ ok: true, data: null }),
    profitSince: jest.fn().mockResolvedValue({ ok: true, data: 0 }),
    cancel: jest.fn().mockResolvedValue({ ok: true, data: null }),
    ...overrides,
  };
}

const draft: SaleDraft = {
  ...EMPTY_DRAFT,
  clientId: 'c1',
  lines: [{ productId: 'p1', nombre: 'Crema', stock: 5, cantidad: '2', precio: '6.000' }],
  pago: '4.000',
  medio: 'transferencia',
};

describe('useSaleList', () => {
  it('pasa a listo con las ventas', async () => {
    const repo = fakeRepo();
    const { result } = await renderHook(() => useSaleList(repo));
    await waitFor(() => expect(result.current.state).toEqual({ status: 'ready', data: [venta] }));
  });

  it('muestra el error del repositorio', async () => {
    const repo = fakeRepo({
      list: jest.fn().mockResolvedValue({ ok: false, message: 'sin señal' }),
    });
    const { result } = await renderHook(() => useSaleList(repo));
    await waitFor(() =>
      expect(result.current.state).toEqual({ status: 'error', message: 'sin señal' }),
    );
  });
});

describe('useSale', () => {
  it('carga el detalle por id', async () => {
    const repo = fakeRepo();
    const { result } = await renderHook(() => useSale('s1', repo));
    await waitFor(() => expect(result.current.state).toEqual({ status: 'ready', data: detalle }));
    expect(repo.get).toHaveBeenCalledWith('s1');
  });

  it('devuelve null sin consultar si no hay id', async () => {
    const repo = fakeRepo();
    const { result } = await renderHook(() => useSale(undefined, repo));
    await waitFor(() => expect(result.current.state).toEqual({ status: 'ready', data: null }));
    expect(repo.get).not.toHaveBeenCalled();
  });
});

describe('useSaleActions.register', () => {
  it('valida el borrador y registra con importes en centavos', async () => {
    const repo = fakeRepo();
    const { result } = await renderHook(() => useSaleActions(repo));
    expect(await result.current.register(draft, '2026-11-02')).toEqual({ ok: true, saleId: 's9' });
    expect(repo.register).toHaveBeenCalledWith({
      clientId: 'c1',
      venceEl: null,
      notas: null,
      items: [{ productId: 'p1', cantidad: 2, precioCentavos: 600000 }],
      pagos: [{ montoCentavos: 400000, medio: 'transferencia' }],
    });
  });

  it('no llama al repositorio con un borrador inválido y señala el campo', async () => {
    const repo = fakeRepo();
    const { result } = await renderHook(() => useSaleActions(repo));
    const registered = await result.current.register({ ...draft, clientId: null }, '2026-11-02');
    expect(registered).toMatchObject({ ok: false, field: 'cliente' });
    expect(repo.register).not.toHaveBeenCalled();
  });

  it('propaga el error de la base (por ejemplo stock insuficiente)', async () => {
    const repo = fakeRepo({
      register: jest
        .fn()
        .mockResolvedValue({ ok: false, message: 'Stock insuficiente de «Crema»: quedan 1.' }),
    });
    const { result } = await renderHook(() => useSaleActions(repo));
    expect(await result.current.register(draft, '2026-11-02')).toEqual({
      ok: false,
      message: 'Stock insuficiente de «Crema»: quedan 1.',
    });
  });
});

describe('useSaleActions cobros y anulación', () => {
  it('registra un cobro válido', async () => {
    const repo = fakeRepo();
    const { result } = await renderHook(() => useSaleActions(repo));
    expect(await result.current.addPayment('s1', '2.500', 'efectivo', 1200000)).toEqual({
      ok: true,
    });
    expect(repo.addPayment).toHaveBeenCalledWith('s1', {
      montoCentavos: 250000,
      medio: 'efectivo',
    });
  });

  it('rechaza un cobro mayor al saldo sin llamar al repositorio', async () => {
    const repo = fakeRepo();
    const { result } = await renderHook(() => useSaleActions(repo));
    expect(await result.current.addPayment('s1', '20.000', 'efectivo', 1200000)).toMatchObject({
      ok: false,
    });
    expect(repo.addPayment).not.toHaveBeenCalled();
  });

  it('borra un cobro y anula la venta', async () => {
    const repo = fakeRepo();
    const { result } = await renderHook(() => useSaleActions(repo));
    expect(await result.current.removePayment('pay1')).toEqual({ ok: true });
    expect(repo.removePayment).toHaveBeenCalledWith('pay1');
    expect(await result.current.cancel('s1')).toEqual({ ok: true });
    expect(repo.cancel).toHaveBeenCalledWith('s1');
  });

  it('devuelve el mensaje cuando la base rechaza la anulación', async () => {
    const repo = fakeRepo({
      cancel: jest
        .fn()
        .mockResolvedValue({ ok: false, message: 'Una venta anulada no se puede modificar.' }),
    });
    const { result } = await renderHook(() => useSaleActions(repo));
    expect(await result.current.cancel('s1')).toEqual({
      ok: false,
      message: 'Una venta anulada no se puede modificar.',
    });
  });
});
