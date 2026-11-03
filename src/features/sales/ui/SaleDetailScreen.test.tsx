import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { confirmDestructive } from '@/core/ui/confirm';

import { useSale, useSaleActions } from '../application/useSales';
import type { SaleDetail } from '../domain/sale';
import { SaleDetailScreen } from './SaleDetailScreen';

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn(), replace: jest.fn() }),
}));
jest.mock('@expo/vector-icons/MaterialIcons', () => 'MaterialIcons');
jest.mock('@/core/ui/confirm', () => ({ confirmDestructive: jest.fn() }));
jest.mock('../application/useSales', () => ({ useSale: jest.fn(), useSaleActions: jest.fn() }));

const mockedUseSale = jest.mocked(useSale);
const mockedActions = jest.mocked(useSaleActions);
const mockedConfirm = jest.mocked(confirmDestructive);

const sale: SaleDetail = {
  id: 's1',
  clientId: 'c1',
  clientName: 'Marta Giménez',
  vendidaEl: '2026-11-02',
  venceEl: null,
  notas: 'Entrega el viernes',
  estado: 'activa',
  totalCentavos: 1200000,
  pagadoCentavos: 400000,
  saldoCentavos: 800000,
  createdAt: '',
  items: [
    {
      id: 'i1',
      productId: 'p1',
      nombreProducto: 'Crema hidratante',
      cantidad: 2,
      precioCentavos: 600000,
      costoCentavos: 350000,
    },
  ],
  payments: [
    {
      id: 'pay1',
      montoCentavos: 400000,
      medio: 'transferencia',
      pagadoEl: '2026-11-02',
      createdAt: '',
    },
  ],
};

function setup(detail: SaleDetail = sale) {
  const refresh = jest.fn();
  const actions = {
    register: jest.fn(),
    addPayment: jest.fn().mockResolvedValue({ ok: true }),
    removePayment: jest.fn().mockResolvedValue({ ok: true }),
    cancel: jest.fn().mockResolvedValue({ ok: true }),
  };
  mockedUseSale.mockReturnValue({
    state: { status: 'ready', data: detail },
    retry: jest.fn(),
    refresh,
  });
  mockedActions.mockReturnValue(actions);
  return { refresh, actions };
}

beforeEach(() => {
  mockedConfirm.mockReset();
});

describe('SaleDetailScreen', () => {
  it('muestra el total, lo cobrado, el saldo, los productos y las notas', async () => {
    setup();
    await render(<SaleDetailScreen saleId="s1" />);
    expect(screen.getAllByText('$ 12.000').length).toBeGreaterThan(0);
    expect(screen.getByText(/Pagado \$ 4.000 · Saldo \$ 8.000/)).toBeTruthy();
    expect(screen.getByText('Crema hidratante')).toBeTruthy();
    expect(screen.getByText(/Ganancia de esta venta: \$ 5.000/)).toBeTruthy();
    expect(screen.getByText(/02\/11\/2026 · Transferencia/)).toBeTruthy();
    expect(screen.getByText('Entrega el viernes')).toBeTruthy();
  });

  it('registra un cobro con el importe y el medio elegidos y recarga', async () => {
    const { actions, refresh } = setup();
    await render(<SaleDetailScreen saleId="s1" />);
    await fireEvent.changeText(screen.getByLabelText('Importe cobrado ($)'), '2.500');
    await fireEvent.press(screen.getByText('Efectivo'));
    await fireEvent.press(screen.getByText('Registrar cobro'));
    await waitFor(() => expect(refresh).toHaveBeenCalled());
    expect(actions.addPayment).toHaveBeenCalledWith('s1', '2.500', 'efectivo', 800000);
  });

  it('el atajo completa el importe con todo el saldo', async () => {
    setup();
    await render(<SaleDetailScreen saleId="s1" />);
    await fireEvent.press(screen.getByText(/Cobrar el saldo completo/));
    expect(screen.getByLabelText('Importe cobrado ($)').props.value).toBe('8000');
  });

  it('muestra el error si el cobro es rechazado', async () => {
    const { actions, refresh } = setup();
    actions.addPayment.mockResolvedValue({
      ok: false,
      message: 'El cobro no puede superar el saldo pendiente.',
    });
    await render(<SaleDetailScreen saleId="s1" />);
    await fireEvent.changeText(screen.getByLabelText('Importe cobrado ($)'), '99.999');
    await fireEvent.press(screen.getByText('Registrar cobro'));
    expect(await screen.findByText('El cobro no puede superar el saldo pendiente.')).toBeTruthy();
    expect(refresh).not.toHaveBeenCalled();
  });

  it('anula la venta solo si la usuaria confirma', async () => {
    const { actions, refresh } = setup();
    mockedConfirm.mockResolvedValueOnce(false);
    await render(<SaleDetailScreen saleId="s1" />);
    await fireEvent.press(screen.getByText('Anular venta'));
    expect(actions.cancel).not.toHaveBeenCalled();

    mockedConfirm.mockResolvedValueOnce(true);
    await fireEvent.press(screen.getByText('Anular venta'));
    await waitFor(() => expect(actions.cancel).toHaveBeenCalledWith('s1'));
    await waitFor(() => expect(refresh).toHaveBeenCalled());
  });

  it('borra un cobro después de confirmar', async () => {
    const { actions } = setup();
    mockedConfirm.mockResolvedValue(true);
    await render(<SaleDetailScreen saleId="s1" />);
    await fireEvent.press(screen.getByText('Borrar'));
    await waitFor(() => expect(actions.removePayment).toHaveBeenCalledWith('pay1'));
  });

  it('en una venta anulada no ofrece cobrar, borrar cobros ni anular', async () => {
    setup({ ...sale, estado: 'anulada' });
    await render(<SaleDetailScreen saleId="s1" />);
    expect(screen.queryByText('Registrar cobro')).toBeNull();
    expect(screen.queryByText('Anular venta')).toBeNull();
    expect(screen.queryByText('Borrar')).toBeNull();
    expect(screen.getByText('Anulada')).toBeTruthy();
  });

  it('no ofrece cobrar cuando la venta ya está pagada', async () => {
    setup({ ...sale, pagadoCentavos: 1200000, saldoCentavos: 0 });
    await render(<SaleDetailScreen saleId="s1" />);
    expect(screen.queryByText('Registrar cobro')).toBeNull();
    expect(screen.getByText('Pagada')).toBeTruthy();
  });

  it('avisa cuando la venta no existe', async () => {
    mockedUseSale.mockReturnValue({
      state: { status: 'ready', data: null },
      retry: jest.fn(),
      refresh: jest.fn(),
    });
    mockedActions.mockReturnValue({
      register: jest.fn(),
      addPayment: jest.fn(),
      removePayment: jest.fn(),
      cancel: jest.fn(),
    });
    await render(<SaleDetailScreen saleId="nada" />);
    expect(screen.getByText('No encontramos esta venta')).toBeTruthy();
  });
});
