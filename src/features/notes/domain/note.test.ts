import { buildNoteInput, filterNotes, notePreview, type Note } from './note';

const note = (titulo: string, contenido: string): Note => ({
  id: titulo,
  titulo,
  contenido,
  updatedAt: '2026-11-05T10:00:00Z',
});

describe('buildNoteInput', () => {
  it('recorta el título y el contenido', () => {
    expect(buildNoteInput({ titulo: '  Pedido ', contenido: ' hola \n' })).toEqual({
      ok: true,
      input: { titulo: 'Pedido', contenido: 'hola' },
    });
  });

  it('permite una nota sin contenido', () => {
    expect(buildNoteInput({ titulo: 'Idea', contenido: '' }).ok).toBe(true);
  });

  it.each([
    [{ titulo: '   ', contenido: '' }, 'titulo'],
    [{ titulo: 'x'.repeat(121), contenido: '' }, 'titulo'],
    [{ titulo: 'ok', contenido: 'x'.repeat(10001) }, 'contenido'],
  ] as const)('rechaza %j en el campo %s', (form, field) => {
    expect(buildNoteInput(form)).toMatchObject({ ok: false, field });
  });
});

describe('filterNotes', () => {
  const notes = [note('Cumpleaños', 'Comprar regalo'), note('Pedido', 'Crema ÚNICA')];

  it('busca en título y contenido sin importar tildes ni mayúsculas', () => {
    expect(filterNotes(notes, 'cumpleanos').map((n) => n.titulo)).toEqual(['Cumpleaños']);
    expect(filterNotes(notes, 'unica').map((n) => n.titulo)).toEqual(['Pedido']);
  });

  it('sin texto devuelve todas', () => {
    expect(filterNotes(notes, '  ')).toHaveLength(2);
  });
});

describe('notePreview', () => {
  it('toma la primera línea con texto y la recorta', () => {
    expect(notePreview(note('t', '\n\nuna línea\notra'))).toBe('una línea');
    expect(notePreview(note('t', 'a'.repeat(100)), 10)).toBe('aaaaaaaaa…');
    expect(notePreview(note('t', ''))).toBe('');
  });
});
