import { normalizeSearch } from './normalizeSearch';

describe('normalizeSearch', () => {
  it('quita tildes, pasa a minúsculas y recorta', () => {
    expect(normalizeSearch('  María GÓMEZ ')).toBe('maria gomez');
  });
  it('también quita la marca de la ñ', () => {
    expect(normalizeSearch('Muñoz')).toBe('munoz');
  });
});
