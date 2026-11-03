import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { confirmDestructive } from '@/core/ui/confirm';

import { useGoal, useGoalActions } from '../application/useGoal';
import type { Goal } from '../domain/goal';
import { GoalScreen } from './GoalScreen';

const mockBack = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), back: mockBack, replace: jest.fn() }),
}));
jest.mock('@expo/vector-icons/MaterialIcons', () => 'MaterialIcons');
jest.mock('@/core/ui/confirm', () => ({ confirmDestructive: jest.fn() }));
jest.mock('../application/useGoal', () => ({ useGoal: jest.fn(), useGoalActions: jest.fn() }));

const mockedGoal = jest.mocked(useGoal);
const mockedActions = jest.mocked(useGoalActions);
const mockedConfirm = jest.mocked(confirmDestructive);

function setup(goal: Goal | null) {
  const actions = {
    save: jest.fn().mockResolvedValue({ ok: true, goal }),
    remove: jest.fn().mockResolvedValue({ ok: true, data: null }),
  };
  mockedGoal.mockReturnValue({
    state: { status: 'ready', data: goal },
    retry: jest.fn(),
    refresh: jest.fn(),
  });
  mockedActions.mockReturnValue(actions as unknown as ReturnType<typeof useGoalActions>);
  return actions;
}

beforeEach(() => {
  mockBack.mockClear();
  mockedConfirm.mockReset();
});

describe('GoalScreen', () => {
  it('guarda la meta nueva y vuelve', async () => {
    const actions = setup(null);
    await render(<GoalScreen />);
    await fireEvent.changeText(screen.getByLabelText('Meta de ventas ($)'), '500.000');
    await fireEvent.changeText(screen.getByLabelText('Meta de ganancia ($, opcional)'), '150.000');
    await fireEvent.press(screen.getByText('Guardar meta'));
    await waitFor(() => expect(mockBack).toHaveBeenCalled());
    expect(actions.save).toHaveBeenCalledWith(expect.stringMatching(/^\d{4}-\d{2}-01$/), {
      ventas: '500.000',
      ganancia: '150.000',
    });
  });

  it('muestra el error de validación en el campo y no vuelve', async () => {
    const actions = setup(null);
    actions.save.mockResolvedValue({
      ok: false,
      field: 'ventas',
      message: 'Ingresá la meta de ventas en pesos, por ejemplo 500.000.',
    });
    await render(<GoalScreen />);
    await fireEvent.press(screen.getByText('Guardar meta'));
    expect(
      await screen.findByText('Ingresá la meta de ventas en pesos, por ejemplo 500.000.'),
    ).toBeTruthy();
    expect(mockBack).not.toHaveBeenCalled();
  });

  it('carga la meta existente y permite quitarla con confirmación', async () => {
    const actions = setup({
      id: 'g1',
      mes: '2026-11-01',
      ventasCentavos: 50000000,
      gananciaCentavos: null,
    });
    mockedConfirm.mockResolvedValue(true);
    await render(<GoalScreen />);
    expect(screen.getByLabelText('Meta de ventas ($)').props.value).toBe('500000');
    await fireEvent.press(screen.getByText('Quitar meta'));
    await waitFor(() => expect(actions.remove).toHaveBeenCalled());
    await waitFor(() => expect(mockBack).toHaveBeenCalled());
  });

  it('no ofrece quitar una meta que todavía no existe', async () => {
    setup(null);
    await render(<GoalScreen />);
    expect(screen.queryByText('Quitar meta')).toBeNull();
  });
});
