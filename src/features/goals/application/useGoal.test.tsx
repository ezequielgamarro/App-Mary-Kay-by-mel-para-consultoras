import { renderHook, waitFor } from '@testing-library/react-native';

import type { Goal } from '../domain/goal';
import type { GoalRepository } from '../domain/goalRepository';
import { useGoal, useGoalActions } from './useGoal';

// Evita cargar el cliente real de Supabase (exige variables de entorno) en los tests.
jest.mock('../data/supabaseGoalRepository', () => ({ supabaseGoalRepository: {} }));

const meta: Goal = {
  id: 'g1',
  mes: '2026-11-01',
  ventasCentavos: 50000000,
  gananciaCentavos: null,
};

function fakeRepo(overrides: Partial<GoalRepository> = {}): GoalRepository {
  return {
    get: jest.fn().mockResolvedValue({ ok: true, data: meta }),
    save: jest.fn().mockResolvedValue({ ok: true, data: meta }),
    remove: jest.fn().mockResolvedValue({ ok: true, data: null }),
    ...overrides,
  };
}

describe('useGoal', () => {
  it('carga la meta del mes', async () => {
    const repo = fakeRepo();
    const { result } = await renderHook(() => useGoal('2026-11-01', repo));
    await waitFor(() => expect(result.current.state).toEqual({ status: 'ready', data: meta }));
    expect(repo.get).toHaveBeenCalledWith('2026-11-01');
  });

  it('muestra el error del repositorio', async () => {
    const repo = fakeRepo({
      get: jest.fn().mockResolvedValue({ ok: false, message: 'sin señal' }),
    });
    const { result } = await renderHook(() => useGoal('2026-11-01', repo));
    await waitFor(() =>
      expect(result.current.state).toEqual({ status: 'error', message: 'sin señal' }),
    );
  });
});

describe('useGoalActions', () => {
  it('valida y guarda con importes en centavos', async () => {
    const repo = fakeRepo();
    const { result } = await renderHook(() => useGoalActions(repo));
    expect(await result.current.save('2026-11-01', { ventas: '500.000', ganancia: '' })).toEqual({
      ok: true,
      goal: meta,
    });
    expect(repo.save).toHaveBeenCalledWith('2026-11-01', {
      ventasCentavos: 50000000,
      gananciaCentavos: null,
    });
  });

  it('no llama al repositorio con datos inválidos y señala el campo', async () => {
    const repo = fakeRepo();
    const { result } = await renderHook(() => useGoalActions(repo));
    expect(await result.current.save('2026-11-01', { ventas: '', ganancia: '' })).toMatchObject({
      ok: false,
      field: 'ventas',
    });
    expect(repo.save).not.toHaveBeenCalled();
  });

  it('propaga el error del repositorio', async () => {
    const repo = fakeRepo({ save: jest.fn().mockResolvedValue({ ok: false, message: 'caído' }) });
    const { result } = await renderHook(() => useGoalActions(repo));
    expect(await result.current.save('2026-11-01', { ventas: '1000', ganancia: '' })).toEqual({
      ok: false,
      message: 'caído',
    });
  });
});
