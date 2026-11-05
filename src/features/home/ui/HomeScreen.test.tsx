import { fireEvent, render, screen } from '@testing-library/react-native';

import { useHomeSummary } from '../application/useHomeSummary';
import type { HomeSummary } from '../domain/homeSummary';
import { HomeScreen } from './HomeScreen';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, back: jest.fn(), replace: jest.fn() }),
  useFocusEffect: jest.fn(),
}));
// Los íconos cargan una fuente que no existe en Jest.
jest.mock('@expo/vector-icons/MaterialIcons', () => 'MaterialIcons');
jest.mock('@/core/auth/actions', () => ({ signOut: jest.fn() }));
jest.mock('../application/useHomeSummary', () => ({ useHomeSummary: jest.fn() }));

const mockedUseHomeSummary = jest.mocked(useHomeSummary);

const summary: HomeSummary = {
  vendidoMesCentavos: 61230000,
  ventasMes: 12,
  gananciaMesCentavos: 20000000,
  gastosMesCentavos: 0,
  gananciaNetaCentavos: 20000000,
  meta: {
    ventasMetaCentavos: 90000000,
    ventasPct: 68,
    gananciaMetaCentavos: null,
    gananciaPct: null,
  },
  porCobrarCentavos: 18450000,
  valorStockCentavos: 124000000,
  productosSinStock: 2,
  productosStockBajo: 1,
  deudoras: [
    {
      clientId: 'c1',
      nombre: 'Marta Giménez',
      saldoCentavos: 6200000,
      venceEl: '2026-11-01',
      vencida: true,
      nota: 'Vencido hace 3 días',
    },
  ],
};

function mockState(state: ReturnType<typeof useHomeSummary>['state']) {
  const retry = jest.fn();
  mockedUseHomeSummary.mockReturnValue({ state, retry, refresh: jest.fn() });
  return retry;
}

beforeEach(() => {
  mockPush.mockClear();
});

describe('HomeScreen', () => {
  it('no muestra gastos si no hay en el mes', async () => {
    mockState({ status: 'ready', data: summary });
    await render(<HomeScreen />);
    expect(screen.queryByText(/ganancia neta/)).toBeNull();
  });

  it('muestra los gastos y la ganancia neta cuando hay gastos en el mes', async () => {
    mockState({
      status: 'ready',
      data: { ...summary, gastosMesCentavos: 5000000, gananciaNetaCentavos: 15000000 },
    });
    await render(<HomeScreen />);
    expect(screen.getByText(/Gastos \$ 50.000 · ganancia neta \$ 150.000/)).toBeTruthy();
  });

  it('muestra las cifras reales del mes y la meta', async () => {
    mockState({ status: 'ready', data: summary });
    await render(<HomeScreen />);
    expect(screen.getByText('$ 612.300')).toBeTruthy();
    expect(screen.getByText(/12 ventas/)).toBeTruthy();
    expect(screen.getByText(/68 % de tu meta de \$ 900.000/)).toBeTruthy();
    expect(screen.getByText('$ 184.500')).toBeTruthy();
    expect(screen.getByText(/2 sin stock · 1 con stock bajo/)).toBeTruthy();
  });

  it('lista a las clientas con saldo y abre su ficha', async () => {
    mockState({ status: 'ready', data: summary });
    await render(<HomeScreen />);
    expect(screen.getByText('Vencido hace 3 días')).toBeTruthy();
    await fireEvent.press(screen.getByText('Marta Giménez'));
    expect(mockPush).toHaveBeenCalledWith('/clientas/c1');
  });

  it('ofrece definir la meta cuando todavía no hay una', async () => {
    mockState({ status: 'ready', data: { ...summary, meta: null } });
    await render(<HomeScreen />);
    await fireEvent.press(screen.getByText('Definir meta del mes'));
    expect(mockPush).toHaveBeenCalledWith('/metas');
  });

  it('avisa cuando nadie debe nada', async () => {
    mockState({ status: 'ready', data: { ...summary, deudoras: [] } });
    await render(<HomeScreen />);
    expect(screen.getByText('Nadie te debe nada por ahora.')).toBeTruthy();
  });

  it('muestra el error y permite reintentar', async () => {
    const retry = mockState({ status: 'error', message: 'sin señal' });
    await render(<HomeScreen />);
    expect(screen.getByText('sin señal')).toBeTruthy();
    await fireEvent.press(screen.getByText('Reintentar'));
    expect(retry).toHaveBeenCalled();
  });

  it('el botón flotante abre el registro de venta', async () => {
    mockState({ status: 'loading' });
    await render(<HomeScreen />);
    await fireEvent.press(screen.getByText('Registrar venta'));
    expect(mockPush).toHaveBeenCalledWith('/ventas/nueva');
  });
});
