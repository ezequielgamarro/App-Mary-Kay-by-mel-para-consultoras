import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { useExpenseActions } from '../application/useExpenses';
import { ExpenseFormScreen } from './ExpenseFormScreen';

const mockBack = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), back: mockBack, replace: jest.fn() }),
}));
jest.mock('@expo/vector-icons/MaterialIcons', () => 'MaterialIcons');
jest.mock('../application/useExpenses', () => ({ useExpenseActions: jest.fn() }));

const mockedActions = jest.mocked(useExpenseActions);

function setup() {
  const create = jest.fn().mockResolvedValue({ ok: true });
  mockedActions.mockReturnValue({ create, remove: jest.fn() });
  return create;
}

beforeEach(() => mockBack.mockClear());

describe('ExpenseFormScreen', () => {
  it('guarda el gasto con el tipo elegido y vuelve', async () => {
    const create = setup();
    await render(<ExpenseFormScreen />);
    await fireEvent.changeText(screen.getByLabelText('¿En qué gastaste?'), 'Flyers');
    await fireEvent.changeText(screen.getByLabelText('Monto ($)'), '1.500');
    await fireEvent.press(screen.getByText('Publicidad'));
    await fireEvent.press(screen.getByText('Guardar'));
    await waitFor(() => expect(mockBack).toHaveBeenCalled());
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ concepto: 'Flyers', monto: '1.500', categoria: 'publicidad' }),
    );
  });

  it('señala el campo con error y no vuelve', async () => {
    const create = setup();
    create.mockResolvedValue({
      ok: false,
      field: 'monto',
      message: 'Ingresá un importe mayor a 0, por ejemplo 2.500 o 1.234,50.',
    });
    await render(<ExpenseFormScreen />);
    await fireEvent.press(screen.getByText('Guardar'));
    expect(
      await screen.findByText('Ingresá un importe mayor a 0, por ejemplo 2.500 o 1.234,50.'),
    ).toBeTruthy();
    expect(mockBack).not.toHaveBeenCalled();
  });
});
