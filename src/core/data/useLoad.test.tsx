import { renderHook, waitFor } from '@testing-library/react-native';

import { readCache, writeCache } from './offlineCache';
import { useLoad } from './useLoad';

jest.mock('./offlineCache', () => ({ readCache: jest.fn(), writeCache: jest.fn() }));

const mockedRead = jest.mocked(readCache);
const mockedWrite = jest.mocked(writeCache);

beforeEach(() => {
  mockedRead.mockReset();
  mockedWrite.mockReset();
});

describe('useLoad', () => {
  it('carga y devuelve los datos', async () => {
    const load = jest.fn().mockResolvedValue({ ok: true, data: [1, 2] });
    const { result } = await renderHook(() => useLoad<number[]>(load));
    await waitFor(() => expect(result.current.state.status).toBe('ready'));
    expect(result.current.state).toEqual({ status: 'ready', data: [1, 2] });
    expect(mockedWrite).not.toHaveBeenCalled();
  });

  it('guarda una copia cuando tiene clave y la carga salió bien', async () => {
    const load = jest.fn().mockResolvedValue({ ok: true, data: ['a'] });
    const { result } = await renderHook(() => useLoad<string[]>(load, 'clients'));
    await waitFor(() => expect(result.current.state.status).toBe('ready'));
    expect(mockedWrite).toHaveBeenCalledWith('clients', ['a']);
  });

  it('si falla la carga muestra la última copia marcada como desactualizada', async () => {
    mockedRead.mockResolvedValue(['viejo']);
    const load = jest.fn().mockResolvedValue({ ok: false, message: 'sin red' });
    const { result } = await renderHook(() => useLoad<string[]>(load, 'clients'));
    await waitFor(() => expect(result.current.state.status).toBe('ready'));
    expect(result.current.state).toEqual({ status: 'ready', data: ['viejo'], stale: true });
  });

  it('si falla y no hay copia, muestra el error', async () => {
    mockedRead.mockResolvedValue(null);
    const load = jest.fn().mockResolvedValue({ ok: false, message: 'sin red' });
    const { result } = await renderHook(() => useLoad<string[]>(load, 'clients'));
    await waitFor(() => expect(result.current.state.status).toBe('error'));
    expect(result.current.state).toEqual({ status: 'error', message: 'sin red' });
  });

  it('sin clave nunca usa copias', async () => {
    const load = jest.fn().mockResolvedValue({ ok: false, message: 'sin red' });
    const { result } = await renderHook(() => useLoad<string[]>(load));
    await waitFor(() => expect(result.current.state.status).toBe('error'));
    expect(mockedRead).not.toHaveBeenCalled();
  });
});
