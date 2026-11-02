import { act, renderHook, waitFor } from '@testing-library/react-native';

import type { Client } from '../domain/client';
import type { ClientRepository } from '../domain/clientRepository';
import { useClient, useClientActions, useClientList } from './useClients';

// Evita cargar el cliente real de Supabase (exige variables de entorno) en los tests.
jest.mock('../data/supabaseClientRepository', () => ({ supabaseClientRepository: {} }));

const marta: Client = {
  id: '1',
  nombre: 'Marta',
  telefono: null,
  cumpleanos: null,
  notas: null,
  createdAt: '',
  updatedAt: '',
};

function fakeRepo(overrides: Partial<ClientRepository> = {}): ClientRepository {
  return {
    list: jest.fn().mockResolvedValue({ ok: true, data: [marta] }),
    get: jest.fn().mockResolvedValue({ ok: true, data: marta }),
    create: jest.fn().mockResolvedValue({ ok: true, data: marta }),
    update: jest.fn().mockResolvedValue({ ok: true, data: marta }),
    remove: jest.fn().mockResolvedValue({ ok: true, data: null }),
    ...overrides,
  };
}

describe('useClientList', () => {
  it('pasa de cargando a listo con los datos', async () => {
    const repo = fakeRepo();
    const { result } = await renderHook(() => useClientList(repo));
    await waitFor(() => expect(result.current.state.status).toBe('ready'));
    expect(result.current.state).toEqual({ status: 'ready', data: [marta] });
  });

  it('queda en cargando mientras la consulta no responde', async () => {
    const repo = fakeRepo({ list: () => new Promise(() => undefined) });
    const { result } = await renderHook(() => useClientList(repo));
    expect(result.current.state.status).toBe('loading');
  });

  it('muestra el error y permite reintentar', async () => {
    const list = jest
      .fn()
      .mockResolvedValueOnce({ ok: false, message: 'sin señal' })
      .mockResolvedValueOnce({ ok: true, data: [marta] });
    const repo = fakeRepo({ list });
    const { result } = await renderHook(() => useClientList(repo));
    await waitFor(() =>
      expect(result.current.state).toEqual({ status: 'error', message: 'sin señal' }),
    );

    await act(async () => result.current.retry());
    await waitFor(() => expect(result.current.state.status).toBe('ready'));
    expect(list).toHaveBeenCalledTimes(2);
  });
});

describe('useClient', () => {
  it('devuelve null sin consultar si no hay id (alta nueva)', async () => {
    const repo = fakeRepo();
    const { result } = await renderHook(() => useClient(undefined, repo));
    await waitFor(() => expect(result.current.state).toEqual({ status: 'ready', data: null }));
    expect(repo.get).not.toHaveBeenCalled();
  });
});

describe('useClientActions', () => {
  const form = { nombre: ' Marta ', telefono: '', cumpleanos: '15/03', notas: '' };

  it('valida y crea con los datos normalizados', async () => {
    const repo = fakeRepo();
    const { result } = await renderHook(() => useClientActions(repo));
    const saved = await result.current.save(null, form);
    expect(saved.ok).toBe(true);
    expect(repo.create).toHaveBeenCalledWith({
      nombre: 'Marta',
      telefono: null,
      cumpleanos: '2000-03-15',
      notas: null,
    });
  });

  it('actualiza cuando hay id', async () => {
    const repo = fakeRepo();
    const { result } = await renderHook(() => useClientActions(repo));
    await result.current.save('1', form);
    expect(repo.update).toHaveBeenCalledWith('1', expect.objectContaining({ nombre: 'Marta' }));
    expect(repo.create).not.toHaveBeenCalled();
  });

  it('no llama al repositorio si el formulario es inválido y señala el campo', async () => {
    const repo = fakeRepo();
    const { result } = await renderHook(() => useClientActions(repo));
    const saved = await result.current.save(null, { ...form, cumpleanos: '99/99' });
    expect(saved).toMatchObject({ ok: false, field: 'cumpleanos' });
    expect(repo.create).not.toHaveBeenCalled();
  });

  it('propaga el error del repositorio', async () => {
    const repo = fakeRepo({ create: jest.fn().mockResolvedValue({ ok: false, message: 'fallo' }) });
    const { result } = await renderHook(() => useClientActions(repo));
    expect(await result.current.save(null, form)).toEqual({ ok: false, message: 'fallo' });
  });
});
