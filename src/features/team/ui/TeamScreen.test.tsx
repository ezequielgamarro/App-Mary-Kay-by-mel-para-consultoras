import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { confirmDestructive } from '@/core/ui/confirm';

import { useMyTeam, useTeamActions, useTeamMembers } from '../application/useTeam';
import type { MyTeam, TeamMember } from '../domain/team';
import { TeamScreen } from './TeamScreen';

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn(), replace: jest.fn() }),
}));
jest.mock('@expo/vector-icons/MaterialIcons', () => 'MaterialIcons');
jest.mock('@/core/ui/confirm', () => ({ confirmDestructive: jest.fn() }));
jest.mock('../application/useTeam', () => ({
  useMyTeam: jest.fn(),
  useTeamMembers: jest.fn(),
  useTeamActions: jest.fn(),
}));

const mockedMyTeam = jest.mocked(useMyTeam);
const mockedMembers = jest.mocked(useTeamMembers);
const mockedActions = jest.mocked(useTeamActions);
const mockedConfirm = jest.mocked(confirmDestructive);

const sinEquipo: MyTeam = {
  codigo: 'AB12CD34EF',
  patrocinadoraNombre: null,
  comparte: false,
  integrantes: 0,
};

const beti: TeamMember = {
  id: 'm1',
  nombre: 'Beti',
  comparte: true,
  ventasMesCentavos: 500000,
  cantidadVentas: 2,
  metaVentasCentavos: 2000000,
};
const cami: TeamMember = {
  id: 'm2',
  nombre: 'Cami',
  comparte: false,
  ventasMesCentavos: null,
  cantidadVentas: null,
  metaVentasCentavos: null,
};

function setup(team: MyTeam, members: TeamMember[] = []) {
  const refresh = jest.fn();
  const actions = {
    join: jest.fn().mockResolvedValue({ ok: true }),
    leave: jest.fn().mockResolvedValue({ ok: true }),
    setSharing: jest.fn().mockResolvedValue({ ok: true }),
    removeMember: jest.fn().mockResolvedValue({ ok: true }),
  };
  mockedMyTeam.mockReturnValue({
    state: { status: 'ready', data: team },
    retry: jest.fn(),
    refresh,
  });
  mockedMembers.mockReturnValue({
    state: { status: 'ready', data: members },
    retry: jest.fn(),
    refresh: jest.fn(),
  });
  mockedActions.mockReturnValue(actions);
  return { refresh, actions };
}

beforeEach(() => mockedConfirm.mockReset());

describe('TeamScreen', () => {
  it('muestra el código de invitación propio', async () => {
    setup(sinEquipo);
    await render(<TeamScreen />);
    expect(screen.getByText('AB12CD34EF')).toBeTruthy();
    expect(screen.getByText('Compartir código')).toBeTruthy();
  });

  it('sin equipo, explica qué se comparte y se une con el código', async () => {
    const { actions, refresh } = setup(sinEquipo);
    await render(<TeamScreen />);
    expect(
      screen.getByText(/aceptás compartir con ella tus ventas del mes y tu meta/),
    ).toBeTruthy();
    await fireEvent.changeText(screen.getByLabelText('Código de tu directora'), 'zz99yy88xx');
    await fireEvent.press(screen.getByText('Unirme al equipo'));
    await waitFor(() => expect(actions.join).toHaveBeenCalledWith('zz99yy88xx'));
    await waitFor(() => expect(refresh).toHaveBeenCalled());
  });

  it('muestra el mensaje cuando el código es rechazado', async () => {
    const { actions, refresh } = setup(sinEquipo);
    actions.join.mockResolvedValue({
      ok: false,
      message: 'No encontramos ese código. Revisalo con tu directora.',
    });
    await render(<TeamScreen />);
    await fireEvent.press(screen.getByText('Unirme al equipo'));
    expect(
      await screen.findByText('No encontramos ese código. Revisalo con tu directora.'),
    ).toBeTruthy();
    expect(refresh).not.toHaveBeenCalled();
  });

  it('en un equipo, muestra la directora y permite dejar de compartir', async () => {
    const { actions } = setup({
      ...sinEquipo,
      patrocinadoraNombre: 'Ana',
      comparte: true,
    });
    await render(<TeamScreen />);
    expect(screen.getByText('Ana')).toBeTruthy();
    expect(screen.getByText(/nunca ve tus clientas, tus deudas/)).toBeTruthy();
    await fireEvent(
      screen.getByLabelText('Compartir mis ventas del mes y mi meta con mi directora'),
      'valueChange',
      false,
    );
    await waitFor(() => expect(actions.setSharing).toHaveBeenCalledWith(false));
  });

  it('sale del equipo solo si confirma', async () => {
    const { actions } = setup({ ...sinEquipo, patrocinadoraNombre: 'Ana', comparte: true });
    mockedConfirm.mockResolvedValueOnce(false);
    await render(<TeamScreen />);
    await fireEvent.press(screen.getByText('Salir del equipo'));
    expect(actions.leave).not.toHaveBeenCalled();

    mockedConfirm.mockResolvedValueOnce(true);
    await fireEvent.press(screen.getByText('Salir del equipo'));
    await waitFor(() => expect(actions.leave).toHaveBeenCalled());
  });

  it('la directora ve los números de quien comparte y no los de quien no', async () => {
    setup({ ...sinEquipo, integrantes: 2 }, [beti, cami]);
    await render(<TeamScreen />);
    expect(screen.getByText('Beti')).toBeTruthy();
    expect(screen.getByText(/\$ 5.000 · 2 ventas/)).toBeTruthy();
    expect(screen.getByText(/25 % de su meta de \$ 20.000/)).toBeTruthy();
    expect(screen.getByText('Cami')).toBeTruthy();
    expect(screen.getByText('No comparte sus números.')).toBeTruthy();
    // Total del equipo: solo suma a quien comparte.
    expect(screen.getAllByText('$ 5.000').length).toBeGreaterThan(0);
  });

  it('saca a una integrante después de confirmar', async () => {
    const { actions } = setup({ ...sinEquipo, integrantes: 1 }, [cami]);
    mockedConfirm.mockResolvedValue(true);
    await render(<TeamScreen />);
    await fireEvent.press(screen.getByText('Sacar del equipo'));
    await waitFor(() => expect(actions.removeMember).toHaveBeenCalledWith('m2'));
  });

  it('no consulta integrantes si no es directora de nadie', async () => {
    setup(sinEquipo);
    await render(<TeamScreen />);
    expect(screen.queryByText('Mi equipo')).toBeNull();
  });
});
