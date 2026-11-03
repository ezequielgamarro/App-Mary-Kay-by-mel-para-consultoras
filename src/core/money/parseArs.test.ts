import { centsToInput, MAX_CENTS, parseArs } from './parseArs';

describe('parseArs', () => {
  it.each([
    ['0', 0],
    ['1234', 123400],
    ['1.234', 123400],
    ['1.234,50', 123450],
    ['1234,5', 123450],
    ['12,05', 1205],
    ['12.50', 1250],
    ['$ 6.000', 600000],
    ['  $1.234.567,89 ', 123456789],
  ])('«%s» → %i centavos', (text, cents) => {
    expect(parseArs(text)).toBe(cents);
  });

  it.each(['', '   ', 'abc', '1,234,5', '12,345', '1.23.4', '-5', '1e3', '1..000', '1.2345'])(
    'rechaza «%s»',
    (text) => {
      expect(parseArs(text)).toBeNull();
    },
  );

  it('rechaza importes mayores al máximo de la base', () => {
    expect(parseArs('1.000.000.000')).toBe(MAX_CENTS);
    expect(parseArs('1.000.000.001')).toBeNull();
  });

  it('no pierde centavos por decimales flotantes', () => {
    expect(parseArs('0,29')).toBe(29);
    expect(parseArs('19,99')).toBe(1999);
  });
});

describe('centsToInput', () => {
  it('muestra el importe editable y es inverso de parseArs', () => {
    expect(centsToInput(123450)).toBe('1234,50');
    expect(centsToInput(600000)).toBe('6000');
    expect(centsToInput(1205)).toBe('12,05');
    expect(parseArs(centsToInput(123450))).toBe(123450);
  });
});
