import { fireEvent, render, screen } from '@testing-library/react-native';

import { useSaleList } from '../application/useSales';
import type { Sale } from '../domain/sale';
import { SaleListScreen } from './SaleListScreen';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, back: jest.fn(), replace: jest.fn() }),
  useFocusEffect: jest.fn(),
}));
jest.mock('@expo/vector-icons/MaterialIcons', () => 'MaterialIcons');
jest.mock('../application/useSales', () => ({ useSaleList: jest.fn() }));

const mockedList = jest.mocked(useSaleList);

function sale(overrides: Partial<Sale> = {}): Sale {
  return {
    id: 's1',
    clientId: 'c1',
    clientName: 'Marta Giménez',
    vendidaEl: '2026-10-30',
    venceEl: null,
    notas: null,
    estado: 'activa',
    totalCentavos: 1000000,
    pagadoCentavos: 400000,
    saldoCentavos: 600000,
    createdAt: '',
    ...overrides,
  };
}

function mockState(state: ReturnType<typeof useSaleList>['state']) {
  const retry = jest.fn();
  mockedList.mockReturnValue({ state, retry, refresh: jest.fn() });
  return retry;
}

beforeEach(() => mockPush.mockClear());

describe('SaleListScreen', () => {
  it('invita a registrar la primera venta cuando no hay ninguna', async () => {
    mockState({ status: 'ready', data: [] });
    await render(<SaleListScreen />);
    expect(screen.getByText('Todavía no registraste ventas')).toBeTruthy();
    await fireEvent.press(screen.getByText('Registrar venta'));
    expect(mockPush).toHaveBeenCalledWith('/ventas/nueva');
  });

  it('lista las ventas con el saldo pendiente y el total por cobrar', async () => {
    mockState({
      status: 'ready',
      data: [
        sale(),
        sale({
          id: 's2',
          clientId: null,
          clientName: null,
          saldoCentavos: 0,
          pagadoCentavos: 1000000,
        }),
        sale({ id: 's3', estado: 'anulada', saldoCentavos: 900000 }),
      ],
    });
    await render(<SaleListScreen />);
    // Por cobrar suma solo ventas activas: $ 6.000.
    expect(screen.getAllByText('$ 6.000').length).toBeGreaterThan(0);
    expect(screen.getByText('Venta de mostrador')).toBeTruthy();
    expect(screen.getByText(/Pagada/)).toBeTruthy();
    expect(screen.getByText(/Anulada/)).toBeTruthy();
  });

  it('abre el detalle al tocar una venta', async () => {
    mockState({ status: 'ready', data: [sale()] });
    await render(<SaleListScreen />);
    await fireEvent.press(screen.getByText('Marta Giménez'));
    expect(mockPush).toHaveBeenCalledWith('/ventas/s1');
  });

  it('muestra el error y permite reintentar', async () => {
    const retry = mockState({ status: 'error', message: 'sin señal' });
    await render(<SaleListScreen />);
    expect(screen.getByText('sin señal')).toBeTruthy();
    await fireEvent.press(screen.getByText('Reintentar'));
    expect(retry).toHaveBeenCalled();
  });
});
