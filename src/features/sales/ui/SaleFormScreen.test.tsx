import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { useSaleActions } from '../application/useSales';
import { SaleFormScreen } from './SaleFormScreen';

const mockReplace = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn(), replace: mockReplace }),
}));
jest.mock('@expo/vector-icons/MaterialIcons', () => 'MaterialIcons');
jest.mock('../application/useSales', () => ({ useSaleActions: jest.fn() }));

// Los buscadores consultan clientas y productos reales: se reemplazan por botones simples.
jest.mock('./ClientPicker', () => {
  const React = jest.requireActual('react');
  const { Pressable, Text } = jest.requireActual('react-native');
  return {
    ClientPicker: ({ onSelect }: { onSelect: (id: string | null) => void }) =>
      React.createElement(
        Pressable,
        { onPress: () => onSelect('c1') },
        React.createElement(Text, null, 'elegir-clienta'),
      ),
  };
});
jest.mock('./ProductPicker', () => {
  const React = jest.requireActual('react');
  const { Pressable, Text } = jest.requireActual('react-native');
  return {
    ProductPicker: ({
      onPick,
    }: {
      onPick: (p: { id: string; nombre: string; precioCentavos: number; stock: number }) => void;
    }) =>
      React.createElement(
        Pressable,
        { onPress: () => onPick({ id: 'p1', nombre: 'Crema', precioCentavos: 600000, stock: 5 }) },
        React.createElement(Text, null, 'agregar-crema'),
      ),
  };
});

const mockedActions = jest.mocked(useSaleActions);

function setup(register = jest.fn().mockResolvedValue({ ok: true, saleId: 's9' })) {
  mockedActions.mockReturnValue({
    register,
    addPayment: jest.fn(),
    removePayment: jest.fn(),
    cancel: jest.fn(),
  });
  return register;
}

beforeEach(() => mockReplace.mockClear());

describe('SaleFormScreen', () => {
  it('arma el total con los productos agregados', async () => {
    setup();
    await render(<SaleFormScreen />);
    await fireEvent.press(screen.getByText('agregar-crema'));
    expect(screen.getByText('$ 6.000')).toBeTruthy();
    await fireEvent.changeText(screen.getByLabelText('Cantidad (hay 5)'), '3');
    expect(screen.getAllByText('$ 18.000').length).toBeGreaterThan(0);
  });

  it('registra la venta con clienta y pago parcial y abre el detalle', async () => {
    const register = setup();
    await render(<SaleFormScreen />);
    await fireEvent.press(screen.getByText('elegir-clienta'));
    await fireEvent.press(screen.getByText('agregar-crema'));
    await fireEvent.changeText(screen.getByLabelText('Pagó ahora ($)'), '2.000');
    await fireEvent.press(screen.getByText('Transferencia'));
    await fireEvent.press(screen.getAllByText('Registrar venta').at(-1)!);

    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/ventas/s9'));
    expect(register).toHaveBeenCalledWith(
      expect.objectContaining({
        clientId: 'c1',
        pago: '2.000',
        medio: 'transferencia',
        lines: [expect.objectContaining({ productId: 'p1', cantidad: '1', precio: '6000' })],
      }),
    );
  });

  it('muestra el saldo pendiente y pide vencimiento cuando no se paga todo', async () => {
    setup();
    await render(<SaleFormScreen />);
    await fireEvent.press(screen.getByText('agregar-crema'));
    await fireEvent.changeText(screen.getByLabelText('Pagó ahora ($)'), '1.000');
    expect(screen.getByText(/Saldo pendiente: \$ 5.000/)).toBeTruthy();
    await fireEvent.press(screen.getByText('En 7 días'));
    expect(screen.getByLabelText('Vence el (opcional)').props.value).toMatch(
      /^\d{2}\/\d{2}\/\d{4}$/,
    );
  });

  it('el botón «Pagó todo» completa el pago con el total', async () => {
    setup();
    await render(<SaleFormScreen />);
    await fireEvent.press(screen.getByText('agregar-crema'));
    await fireEvent.press(screen.getByText('Pagó todo'));
    expect(screen.getByLabelText('Pagó ahora ($)').props.value).toBe('6000');
    expect(screen.queryByText(/Saldo pendiente/)).toBeNull();
  });

  it('muestra el error que devuelve el registro y no navega', async () => {
    setup(
      jest.fn().mockResolvedValue({
        ok: false,
        message: 'Stock insuficiente de «Crema»: quedan 1.',
      }),
    );
    await render(<SaleFormScreen />);
    await fireEvent.press(screen.getByText('agregar-crema'));
    await fireEvent.press(screen.getAllByText('Registrar venta').at(-1)!);
    expect(await screen.findByText('Stock insuficiente de «Crema»: quedan 1.')).toBeTruthy();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('señala el campo con error de validación', async () => {
    setup(
      jest.fn().mockResolvedValue({
        ok: false,
        field: 'lines',
        message: 'Agregá al menos un producto.',
      }),
    );
    await render(<SaleFormScreen />);
    await fireEvent.press(screen.getAllByText('Registrar venta').at(-1)!);
    expect(await screen.findByText('Agregá al menos un producto.')).toBeTruthy();
  });

  it('quita un producto de la venta', async () => {
    setup();
    await render(<SaleFormScreen />);
    await fireEvent.press(screen.getByText('agregar-crema'));
    await fireEvent.press(screen.getByText('Quitar'));
    expect(screen.queryByLabelText('Cantidad (hay 5)')).toBeNull();
  });
});
