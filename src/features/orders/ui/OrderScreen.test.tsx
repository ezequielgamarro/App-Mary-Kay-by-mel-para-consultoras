import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { Share } from 'react-native';

import { useOrderActions } from '../application/useOrders';
import { useOrderSuggestion } from '../application/useOrderSuggestion';
import type { SuggestionLine } from '../domain/order';
import { OrderScreen } from './OrderScreen';

const mockPush = jest.fn();
const mockReplace = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, back: jest.fn(), replace: mockReplace }),
}));
jest.mock('@expo/vector-icons/MaterialIcons', () => 'MaterialIcons');
jest.mock('../application/useOrderSuggestion', () => ({ useOrderSuggestion: jest.fn() }));
jest.mock('../application/useOrders', () => ({ useOrderActions: jest.fn() }));

const mockedSuggestion = jest.mocked(useOrderSuggestion);
const mockedActions = jest.mocked(useOrderActions);

const crema: SuggestionLine = {
  productId: 'a',
  nombre: 'Crema',
  stock: 0,
  stockMinimo: 4,
  vendidas: 3,
  costoCentavos: 100000,
  precioCentavos: 600000,
  sugerido: 4,
  motivo: 'Sin stock',
};

function setup(lines: SuggestionLine[]) {
  const save = jest.fn().mockResolvedValue({ ok: true, orderId: 'o9' });
  mockedSuggestion.mockReturnValue({
    state: { status: 'ready', data: lines },
    retry: jest.fn(),
    refresh: jest.fn(),
  });
  mockedActions.mockReturnValue({ save, receive: jest.fn(), cancel: jest.fn() });
  return save;
}

beforeEach(() => {
  mockPush.mockClear();
  mockReplace.mockClear();
});

describe('OrderScreen', () => {
  it('muestra lo sugerido con el costo y la ganancia estimada', async () => {
    setup([crema]);
    await render(<OrderScreen />);
    expect(screen.getByText('Crema')).toBeTruthy();
    expect(screen.getByText('Sin stock')).toBeTruthy();
    expect(screen.getByLabelText('Cantidad de Crema').props.value).toBe('4');
    expect(screen.getByText('$ 4.000')).toBeTruthy(); // costo: 4 × 1.000
    expect(screen.getByText(/ganancia estimada \$ 20.000/)).toBeTruthy(); // 24.000 − 4.000
  });

  it('recalcula la simulación al cambiar la cantidad', async () => {
    setup([crema]);
    await render(<OrderScreen />);
    await fireEvent.changeText(screen.getByLabelText('Cantidad de Crema'), '2');
    expect(screen.getByText('$ 2.000')).toBeTruthy();
    expect(screen.getByText('2 unidades', { exact: false })).toBeTruthy();
  });

  it('guarda el pedido con las cantidades y las notas, y abre su detalle', async () => {
    const save = setup([crema]);
    await render(<OrderScreen />);
    await fireEvent.changeText(screen.getByLabelText('Cantidad de Crema'), '2');
    await fireEvent.changeText(screen.getByLabelText('Notas (opcional)'), 'ciclo 11');
    await fireEvent.press(screen.getByText('Guardar pedido'));
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/pedidos/o9'));
    expect(save).toHaveBeenCalledWith([crema], { a: '2' }, 'ciclo 11');
  });

  it('muestra el error al guardar y no navega', async () => {
    const save = setup([crema]);
    save.mockResolvedValue({ ok: false, message: 'Elegí al menos un producto para pedir.' });
    await render(<OrderScreen />);
    await fireEvent.press(screen.getByText('Guardar pedido'));
    expect(await screen.findByText('Elegí al menos un producto para pedir.')).toBeTruthy();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('comparte el pedido sin guardarlo', async () => {
    setup([crema]);
    const share = jest
      .spyOn(Share, 'share')
      .mockResolvedValue({ action: Share.sharedAction, activityType: undefined });
    await render(<OrderScreen />);
    await fireEvent.press(screen.getByText('Compartir sin guardar'));
    expect(share).toHaveBeenCalledWith({ message: expect.stringContaining('• 4 × Crema') });
    share.mockRestore();
  });

  it('abre el historial', async () => {
    setup([crema]);
    await render(<OrderScreen />);
    await fireEvent.press(screen.getByText('Ver historial de pedidos'));
    expect(mockPush).toHaveBeenCalledWith('/pedidos/historial');
  });

  it('avisa cuando no hace falta pedir nada, pero deja ver el historial', async () => {
    setup([]);
    await render(<OrderScreen />);
    expect(screen.getByText('No hace falta pedir nada')).toBeTruthy();
    expect(screen.getByText('Ver historial de pedidos')).toBeTruthy();
  });
});
