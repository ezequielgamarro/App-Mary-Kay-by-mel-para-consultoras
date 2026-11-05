import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { confirmDestructive } from '@/core/ui/confirm';

import { useOrderActions, useOrderDetail } from '../application/useOrders';
import type { OrderRecordDetail } from '../domain/orderRecord';
import { OrderDetailScreen } from './OrderDetailScreen';

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn(), replace: jest.fn() }),
}));
jest.mock('@expo/vector-icons/MaterialIcons', () => 'MaterialIcons');
jest.mock('@/core/ui/confirm', () => ({ confirmDestructive: jest.fn() }));
jest.mock('../application/useOrders', () => ({
  useOrderDetail: jest.fn(),
  useOrderActions: jest.fn(),
}));

const mockedDetail = jest.mocked(useOrderDetail);
const mockedActions = jest.mocked(useOrderActions);
const mockedConfirm = jest.mocked(confirmDestructive);

const pendiente: OrderRecordDetail = {
  id: 'o1',
  pedidoEl: '2026-11-05',
  estado: 'pendiente',
  notas: 'ciclo 11',
  unidades: 4,
  costoCentavos: 400000,
  ventaCentavos: 2400000,
  createdAt: '',
  items: [
    {
      id: 'i1',
      productId: 'p1',
      nombreProducto: 'Crema',
      cantidad: 4,
      costoCentavos: 100000,
      precioCentavos: 600000,
    },
  ],
};

function setup(order: OrderRecordDetail | null) {
  const refresh = jest.fn();
  const actions = {
    save: jest.fn(),
    receive: jest.fn().mockResolvedValue({ ok: true }),
    cancel: jest.fn().mockResolvedValue({ ok: true }),
  };
  mockedDetail.mockReturnValue({
    state: { status: 'ready', data: order },
    retry: jest.fn(),
    refresh,
  });
  mockedActions.mockReturnValue(actions);
  return { refresh, actions };
}

beforeEach(() => mockedConfirm.mockReset());

describe('OrderDetailScreen', () => {
  it('muestra el estado, los renglones y las notas', async () => {
    setup(pendiente);
    await render(<OrderDetailScreen id="o1" />);
    expect(screen.getByText('Pedido del 05/11/2026')).toBeTruthy();
    expect(screen.getByText(/Pendiente · 4 unidades/)).toBeTruthy();
    expect(screen.getByText('Crema')).toBeTruthy();
    expect(screen.getByText('ciclo 11')).toBeTruthy();
  });

  it('recibe el pedido solo si la usuaria confirma y recarga', async () => {
    const { actions, refresh } = setup(pendiente);
    mockedConfirm.mockResolvedValueOnce(false);
    await render(<OrderDetailScreen id="o1" />);
    await fireEvent.press(screen.getByText('Marcar como recibido'));
    expect(actions.receive).not.toHaveBeenCalled();

    mockedConfirm.mockResolvedValueOnce(true);
    await fireEvent.press(screen.getByText('Marcar como recibido'));
    await waitFor(() => expect(actions.receive).toHaveBeenCalledWith('o1'));
    await waitFor(() => expect(refresh).toHaveBeenCalled());
  });

  it('cancela el pedido después de confirmar', async () => {
    const { actions } = setup(pendiente);
    mockedConfirm.mockResolvedValue(true);
    await render(<OrderDetailScreen id="o1" />);
    await fireEvent.press(screen.getByText('Cancelar pedido'));
    await waitFor(() => expect(actions.cancel).toHaveBeenCalledWith('o1'));
  });

  it('muestra el error de la acción', async () => {
    const { actions, refresh } = setup(pendiente);
    actions.receive.mockResolvedValue({
      ok: false,
      message: 'Ese pedido no existe o ya no está pendiente.',
    });
    mockedConfirm.mockResolvedValue(true);
    await render(<OrderDetailScreen id="o1" />);
    await fireEvent.press(screen.getByText('Marcar como recibido'));
    expect(await screen.findByText('Ese pedido no existe o ya no está pendiente.')).toBeTruthy();
    expect(refresh).not.toHaveBeenCalled();
  });

  it('un pedido recibido ya no ofrece recibir ni cancelar', async () => {
    setup({ ...pendiente, estado: 'recibido' });
    await render(<OrderDetailScreen id="o1" />);
    expect(screen.queryByText('Marcar como recibido')).toBeNull();
    expect(screen.queryByText('Cancelar pedido')).toBeNull();
    expect(screen.getByText('Compartir pedido')).toBeTruthy();
  });

  it('avisa cuando el pedido no existe', async () => {
    setup(null);
    await render(<OrderDetailScreen id="nada" />);
    expect(screen.getByText('No encontramos este pedido')).toBeTruthy();
  });
});
