import { renderHook, waitFor } from '@testing-library/react-native';

import type { ClientRepository } from '@/features/clients/domain/clientRepository';
import type { SaleRepository } from '@/features/sales/domain/saleRepository';

import type { Task } from '../domain/task';
import type { TaskRepository } from '../domain/taskRepository';
import { useAgenda, useTaskActions } from './useAgenda';

// Evita cargar el cliente real de Supabase (exige variables de entorno) en los tests.
jest.mock('../data/supabaseTaskRepository', () => ({ supabaseTaskRepository: {} }));
jest.mock('@/features/sales/data/supabaseSaleRepository', () => ({ supabaseSaleRepository: {} }));
jest.mock('@/features/clients/data/supabaseClientRepository', () => ({
  supabaseClientRepository: {},
}));

const today = () => '2026-11-10';

const tarea: Task = { id: 't1', titulo: 'Llamar a Ana', fecha: '2026-11-11', hecha: false };

function fakeTasks(overrides: Partial<TaskRepository> = {}): TaskRepository {
  return {
    listPending: jest.fn().mockResolvedValue({ ok: true, data: [tarea] }),
    create: jest.fn().mockResolvedValue({ ok: true, data: tarea }),
    setDone: jest.fn().mockResolvedValue({ ok: true, data: null }),
    remove: jest.fn().mockResolvedValue({ ok: true, data: null }),
    ...overrides,
  };
}

function repos(tasks: TaskRepository = fakeTasks(), salesFail = false) {
  return {
    tasks,
    sales: {
      list: jest
        .fn()
        .mockResolvedValue(
          salesFail ? { ok: false, message: 'ventas caídas' } : { ok: true, data: [] },
        ),
    } as unknown as SaleRepository,
    clients: {
      list: jest.fn().mockResolvedValue({
        ok: true,
        data: [
          {
            id: 'c1',
            nombre: 'Lucía',
            telefono: null,
            cumpleanos: '2000-11-12',
            notas: null,
            createdAt: '',
            updatedAt: '',
          },
        ],
      }),
    } as unknown as ClientRepository,
  };
}

describe('useAgenda', () => {
  it('arma la agenda con tareas y cumpleaños', async () => {
    const r = repos();
    const { result } = await renderHook(() => useAgenda(r, today));
    await waitFor(() => expect(result.current.state.status).toBe('ready'));
    if (result.current.state.status !== 'ready') throw new Error('no listo');
    expect(result.current.state.data.today).toBe('2026-11-10');
    expect(result.current.state.data.items.map((i) => i.kind)).toEqual(['tarea', 'cumple']);
  });

  it('muestra el error si falla alguna fuente', async () => {
    const r = repos(fakeTasks(), true);
    const { result } = await renderHook(() => useAgenda(r, today));
    await waitFor(() =>
      expect(result.current.state).toEqual({ status: 'error', message: 'ventas caídas' }),
    );
  });
});

describe('useTaskActions', () => {
  it('valida y crea la tarea', async () => {
    const repo = fakeTasks();
    const { result } = await renderHook(() => useTaskActions(repo, today));
    expect(await result.current.create({ titulo: ' Llamar ', fecha: '11/11/2026' })).toEqual({
      ok: true,
      task: tarea,
    });
    expect(repo.create).toHaveBeenCalledWith({ titulo: 'Llamar', fecha: '2026-11-11' });
  });

  it('no llama al repositorio con datos inválidos y señala el campo', async () => {
    const repo = fakeTasks();
    const { result } = await renderHook(() => useTaskActions(repo, today));
    expect(await result.current.create({ titulo: 'a', fecha: '01/01/2020' })).toMatchObject({
      ok: false,
      field: 'fecha',
    });
    expect(repo.create).not.toHaveBeenCalled();
  });

  it('marca como hecha y borra', async () => {
    const repo = fakeTasks();
    const { result } = await renderHook(() => useTaskActions(repo, today));
    expect(await result.current.complete('t1')).toEqual({ ok: true });
    expect(repo.setDone).toHaveBeenCalledWith('t1', true);
    expect(await result.current.remove('t1')).toEqual({ ok: true });
    expect(repo.remove).toHaveBeenCalledWith('t1');
  });

  it('propaga el error del repositorio', async () => {
    const repo = fakeTasks({
      setDone: jest.fn().mockResolvedValue({ ok: false, message: 'sin señal' }),
    });
    const { result } = await renderHook(() => useTaskActions(repo, today));
    expect(await result.current.complete('t1')).toEqual({ ok: false, message: 'sin señal' });
  });
});
