import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { confirmDestructive } from '@/core/ui/confirm';

import { useAgenda, useTaskActions } from '../application/useAgenda';
import type { AgendaItem } from '../domain/agenda';
import { AgendaScreen } from './AgendaScreen';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, back: jest.fn(), replace: jest.fn() }),
  useFocusEffect: jest.fn(),
}));
jest.mock('@expo/vector-icons/MaterialIcons', () => 'MaterialIcons');
jest.mock('@/core/ui/confirm', () => ({ confirmDestructive: jest.fn() }));
jest.mock('../application/useAgenda', () => ({ useAgenda: jest.fn(), useTaskActions: jest.fn() }));

const mockedAgenda = jest.mocked(useAgenda);
const mockedActions = jest.mocked(useTaskActions);
const mockedConfirm = jest.mocked(confirmDestructive);

const TODAY = '2026-11-10';

const items: AgendaItem[] = [
  {
    key: 'cobro:s1',
    kind: 'cobro',
    fecha: '2026-11-08',
    titulo: 'Cobrar a Marta',
    detalle: 'Saldo $ 6.000',
    refId: 's1',
  },
  {
    key: 'tarea:t1',
    kind: 'tarea',
    fecha: TODAY,
    titulo: 'Llamar a Ana',
    detalle: 'Tarea',
    refId: 't1',
  },
  {
    key: 'cumple:c1',
    kind: 'cumple',
    fecha: '2026-11-15',
    titulo: 'Cumpleaños de Lucía',
    detalle: 'Mandale un saludo',
    refId: 'c1',
  },
];

function setup(data: AgendaItem[] = items) {
  const refresh = jest.fn();
  const actions = {
    create: jest.fn(),
    complete: jest.fn().mockResolvedValue({ ok: true }),
    remove: jest.fn().mockResolvedValue({ ok: true }),
  };
  mockedAgenda.mockReturnValue({
    state: { status: 'ready', data: { items: data, today: TODAY } },
    retry: jest.fn(),
    refresh,
  });
  mockedActions.mockReturnValue(actions);
  return { refresh, actions };
}

beforeEach(() => {
  mockPush.mockClear();
  mockedConfirm.mockReset();
});

describe('AgendaScreen', () => {
  it('agrupa lo atrasado, lo de hoy y los próximos días', async () => {
    setup();
    await render(<AgendaScreen />);
    expect(screen.getByText('Atrasado')).toBeTruthy();
    expect(screen.getByText('Hoy')).toBeTruthy();
    expect(screen.getByText('Próximos días')).toBeTruthy();
    expect(screen.getByText('Cobrar a Marta')).toBeTruthy();
    expect(screen.getByText('Cumpleaños de Lucía')).toBeTruthy();
  });

  it('abre la venta al tocar un cobro y la clienta al tocar un cumpleaños', async () => {
    setup();
    await render(<AgendaScreen />);
    await fireEvent.press(screen.getByText('Cobrar a Marta'));
    expect(mockPush).toHaveBeenCalledWith('/ventas/s1');
    await fireEvent.press(screen.getByText('Cumpleaños de Lucía'));
    expect(mockPush).toHaveBeenCalledWith('/clientas/c1');
  });

  it('marca una tarea como hecha y recarga', async () => {
    const { actions, refresh } = setup();
    await render(<AgendaScreen />);
    await fireEvent.press(screen.getByText('Hecha'));
    await waitFor(() => expect(actions.complete).toHaveBeenCalledWith('t1'));
    await waitFor(() => expect(refresh).toHaveBeenCalled());
  });

  it('borra una tarea solo si la usuaria confirma', async () => {
    const { actions } = setup();
    mockedConfirm.mockResolvedValueOnce(false);
    await render(<AgendaScreen />);
    await fireEvent.press(screen.getByText('Borrar'));
    expect(actions.remove).not.toHaveBeenCalled();

    mockedConfirm.mockResolvedValueOnce(true);
    await fireEvent.press(screen.getByText('Borrar'));
    await waitFor(() => expect(actions.remove).toHaveBeenCalledWith('t1'));
  });

  it('muestra el error si la acción falla', async () => {
    const { actions, refresh } = setup();
    actions.complete.mockResolvedValue({ ok: false, message: 'sin señal' });
    await render(<AgendaScreen />);
    await fireEvent.press(screen.getByText('Hecha'));
    expect(await screen.findByText('sin señal')).toBeTruthy();
    expect(refresh).not.toHaveBeenCalled();
  });

  it('explica qué se verá cuando no hay nada pendiente', async () => {
    setup([]);
    await render(<AgendaScreen />);
    expect(screen.getByText('No tenés nada pendiente')).toBeTruthy();
  });

  it('el botón flotante abre el alta de tareas', async () => {
    setup([]);
    await render(<AgendaScreen />);
    await fireEvent.press(screen.getByText('Nueva tarea'));
    expect(mockPush).toHaveBeenCalledWith('/agenda/nueva');
  });
});
