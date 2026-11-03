import { GENERIC_ERROR, saleErrorMessage } from './saleErrors';

describe('saleErrorMessage', () => {
  it('muestra el texto de las reglas de negocio de la base', () => {
    expect(
      saleErrorMessage({ code: 'BG001', message: 'Stock insuficiente de «Crema»: quedan 2.' }),
    ).toBe('Stock insuficiente de «Crema»: quedan 2.');
    expect(
      saleErrorMessage({ code: 'BG003', message: 'Para dejar saldo pendiente elegí una clienta.' }),
    ).toBe('Para dejar saldo pendiente elegí una clienta.');
  });

  it('oculta los errores técnicos', () => {
    expect(saleErrorMessage({ code: '23514', message: 'new row violates check constraint' })).toBe(
      GENERIC_ERROR,
    );
    expect(saleErrorMessage({ code: 'PGRST301', message: 'JWT expired' })).toBe(GENERIC_ERROR);
  });

  it('no confía en códigos parecidos ni en errores sin código', () => {
    expect(saleErrorMessage({ code: 'BG009', message: 'raro' })).toBe(GENERIC_ERROR);
    expect(saleErrorMessage({ message: 'sin señal' })).toBe(GENERIC_ERROR);
    expect(saleErrorMessage({})).toBe(GENERIC_ERROR);
  });

  it('usa el mensaje genérico si la regla llega sin texto', () => {
    expect(saleErrorMessage({ code: 'BG002', message: '  ' })).toBe(GENERIC_ERROR);
  });
});
