import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { confirmDestructive } from '@/core/ui/confirm';

import { useExpenseActions, useExpenseList } from '../application/useExpenses';
import { todayIso } from '@/core/date/dates';
import type { Expense } from '../domain/expense';
import { ExpenseListScreen } from './ExpenseListScreen';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, back: jest.fn(), replace: jest.fn() }),
  useFocusEffect: jest.fn(),
}));
jest.mock('@expo/vector-icons/MaterialIcons', () => 'MaterialIcons');
jest.mock('@/core/ui/confirm', () => ({ confirmDestructive: jest.fn() }));
jest.mock('../application/useExpenses', () => ({
  useExpenseList: jest.fn(),
  useExpenseActions: jest.fn(),
}));

const mockedList = jest.mocked(useExpenseList);
const mockedActions = jest.mocked(useExpenseActions);
const mockedConfirm = jest.mocked(confirmDestructive);

const nafta: Expense = {
  id: 'e1',
  fecha: todayIso(),
  concepto: 'Nafta',
  categoria: 'transporte',
  montoCentavos: 250000,
};

function setup(data: Expense[]) {
  const refresh = jest.fn();
  const actions = {
    create: jest.fn(),
    remove: jest.fn().mockResolvedValue({ ok: true }),
  };
  mockedList.mockReturnValue({
    state: { status: 'ready', data },
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

describe('ExpenseListScreen', () => {
  it('muestra el total del mes y cada gasto con su tipo', async () => {
    setup([nafta]);
    await render(<ExpenseListScreen />);
    expect(screen.getByText('Gastado este mes')).toBeTruthy();
    expect(screen.getAllByText('$ 2.500').length).toBeGreaterThan(1); // total y renglón
    expect(screen.getByText('Nafta')).toBeTruthy();
    expect(screen.getByText(/Transporte/)).toBeTruthy();
  });

  it('explica qué hacer cuando no hay gastos y abre el alta', async () => {
    setup([]);
    await render(<ExpenseListScreen />);
    expect(screen.getByText('Todavía no cargaste gastos')).toBeTruthy();
    await fireEvent.press(screen.getByText('Nuevo gasto'));
    expect(mockPush).toHaveBeenCalledWith('/gastos/nueva');
  });

  it('borra un gasto solo si la usuaria confirma', async () => {
    const { actions, refresh } = setup([nafta]);
    mockedConfirm.mockResolvedValueOnce(false);
    await render(<ExpenseListScreen />);
    await fireEvent.press(screen.getByText('Nafta'));
    expect(actions.remove).not.toHaveBeenCalled();

    mockedConfirm.mockResolvedValueOnce(true);
    await fireEvent.press(screen.getByText('Nafta'));
    await waitFor(() => expect(actions.remove).toHaveBeenCalledWith('e1'));
    await waitFor(() => expect(refresh).toHaveBeenCalled());
  });

  it('muestra el error si no se pudo borrar', async () => {
    const { actions } = setup([nafta]);
    actions.remove.mockResolvedValue({ ok: false, message: 'sin señal' });
    mockedConfirm.mockResolvedValue(true);
    await render(<ExpenseListScreen />);
    await fireEvent.press(screen.getByText('Nafta'));
    expect(await screen.findByText('sin señal')).toBeTruthy();
  });
});
