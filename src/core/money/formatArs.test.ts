import { formatArs } from './formatArs';

describe('formatArs', () => {
  it.each([
    [0, '$ 0'],
    [50, '$ 0,50'],
    [100, '$ 1'],
    [123450, '$ 1.234,50'],
    [61230000, '$ 612.300'],
    [123456789, '$ 1.234.567,89'],
    [-18450000, '-$ 184.500'],
  ])('%i centavos → %s', (cents, expected) => {
    expect(formatArs(cents)).toBe(expected);
  });
});
