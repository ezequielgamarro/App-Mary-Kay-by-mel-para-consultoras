import { fireEvent, render, screen } from '@testing-library/react-native';

import { useOrderList } from '../application/useOrders';
import type { OrderRecord } from '../domain/orderRecord';
import { OrderHistoryScreen } from './OrderHistoryScreen';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, back: jest.fn(), replace: jest.fn() }),
  useFocusEffect: jest.fn(),
}));
jest.mock('@expo/vector-icons/MaterialIcons', () => 'MaterialIcons');
jest.mock('../application/useOrders', () => ({ useOrderList: jest.fn() }));

const mockedList = jest.mocked(useOrderList);

const pedido: OrderRecord = {
  id: 'o1',
  pedidoEl: '2026-11-05',
  estado: 'recibido',
  notas: null,
  unidades: 1,
  costoCentavos: 100000,
  ventaCentavos: 600000,
  createdAt: '',
};

function setup(data: OrderRecord[]) {
  mockedList.mockReturnValue({
    state: { status: 'ready', data },
    retry: jest.fn(),
    refresh: jest.fn(),
  });
}

beforeEach(() => mockPush.mockClear());

describe('OrderHistoryScreen', () => {
  it('lista los pedidos con fecha, estado y costo, y abre el detalle', async () => {
    setup([pedido]);
    await render(<OrderHistoryScreen />);
    expect(screen.getByText('Pedido del 05/11/2026')).toBeTruthy();
    expect(screen.getByText('Recibido · 1 unidad')).toBeTruthy();
    expect(screen.getByText('$ 1.000')).toBeTruthy();
    await fireEvent.press(screen.getByText('Pedido del 05/11/2026'));
    expect(mockPush).toHaveBeenCalledWith('/pedidos/o1');
  });

  it('explica qué pasa cuando todavía no hay pedidos', async () => {
    setup([]);
    await render(<OrderHistoryScreen />);
    expect(screen.getByText('Todavía no guardaste pedidos')).toBeTruthy();
  });
});
