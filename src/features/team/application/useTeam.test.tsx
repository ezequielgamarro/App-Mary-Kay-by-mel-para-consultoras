import { renderHook, waitFor } from '@testing-library/react-native';

import type { MyTeam, TeamMember } from '../domain/team';
import type { TeamRepository } from '../domain/teamRepository';
import { useMyTeam, useTeamActions, useTeamMembers } from './useTeam';

// Evita cargar el cliente real de Supabase (exige variables de entorno) en los tests.
jest.mock('../data/supabaseTeamRepository', () => ({ supabaseTeamRepository: {} }));

const mio: MyTeam = {
  codigo: 'AB12CD34EF',
  patrocinadoraNombre: null,
  comparte: false,
  integrantes: 1,
};
const beti: TeamMember = {
  id: 'm1',
  nombre: 'Beti',
  comparte: true,
  ventasMesCentavos: 500000,
  cantidadVentas: 1,
  metaVentasCentavos: null,
};

function fakeRepo(overrides: Partial<TeamRepository> = {}): TeamRepository {
  return {
    myTeam: jest.fn().mockResolvedValue({ ok: true, data: mio }),
    members: jest.fn().mockResolvedValue({ ok: true, data: [beti] }),
    join: jest.fn().mockResolvedValue({ ok: true, data: null }),
    leave: jest.fn().mockResolvedValue({ ok: true, data: null }),
    setSharing: jest.fn().mockResolvedValue({ ok: true, data: null }),
    removeMember: jest.fn().mockResolvedValue({ ok: true, data: null }),
    ...overrides,
  };
}

describe('useMyTeam', () => {
  it('carga mi situación', async () => {
    const repo = fakeRepo();
    const { result } = await renderHook(() => useMyTeam(repo));
    await waitFor(() => expect(result.current.state).toEqual({ status: 'ready', data: mio }));
  });

  it('muestra el error del repositorio', async () => {
    const repo = fakeRepo({ myTeam: jest.fn().mockResolvedValue({ ok: false, message: 'caído' }) });
    const { result } = await renderHook(() => useMyTeam(repo));
    await waitFor(() =>
      expect(result.current.state).toEqual({ status: 'error', message: 'caído' }),
    );
  });
});

describe('useTeamMembers', () => {
  it('consulta las integrantes cuando está habilitado', async () => {
    const repo = fakeRepo();
    const { result } = await renderHook(() => useTeamMembers(true, repo));
    await waitFor(() => expect(result.current.state).toEqual({ status: 'ready', data: [beti] }));
  });

  it('no consulta nada si no tiene integrantes', async () => {
    const repo = fakeRepo();
    const { result } = await renderHook(() => useTeamMembers(false, repo));
    await waitFor(() => expect(result.current.state).toEqual({ status: 'ready', data: [] }));
    expect(repo.members).not.toHaveBeenCalled();
  });
});

describe('useTeamActions', () => {
  it('normaliza el código antes de unirse', async () => {
    const repo = fakeRepo();
    const { result } = await renderHook(() => useTeamActions(repo));
    expect(await result.current.join(' ab12cd34ef ')).toEqual({ ok: true });
    expect(repo.join).toHaveBeenCalledWith('AB12CD34EF');
  });

  it('rechaza un código mal escrito sin llamar al repositorio', async () => {
    const repo = fakeRepo();
    const { result } = await renderHook(() => useTeamActions(repo));
    expect(await result.current.join('123')).toMatchObject({ ok: false });
    expect(repo.join).not.toHaveBeenCalled();
  });

  it('propaga el mensaje de la base (por ejemplo, código inexistente)', async () => {
    const repo = fakeRepo({
      join: jest.fn().mockResolvedValue({ ok: false, message: 'No encontramos ese código.' }),
    });
    const { result } = await renderHook(() => useTeamActions(repo));
    expect(await result.current.join('AB12CD34EF')).toEqual({
      ok: false,
      message: 'No encontramos ese código.',
    });
  });

  it('sale del equipo, cambia el permiso y saca a una integrante', async () => {
    const repo = fakeRepo();
    const { result } = await renderHook(() => useTeamActions(repo));
    expect(await result.current.leave()).toEqual({ ok: true });
    expect(await result.current.setSharing(false)).toEqual({ ok: true });
    expect(repo.setSharing).toHaveBeenCalledWith(false);
    expect(await result.current.removeMember('m1')).toEqual({ ok: true });
    expect(repo.removeMember).toHaveBeenCalledWith('m1');
  });
});
