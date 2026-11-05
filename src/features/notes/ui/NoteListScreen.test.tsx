import { fireEvent, render, screen } from '@testing-library/react-native';

import { useNoteList } from '../application/useNotes';
import type { Note } from '../domain/note';
import { NoteListScreen } from './NoteListScreen';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, back: jest.fn(), replace: jest.fn() }),
  useFocusEffect: jest.fn(),
}));
jest.mock('@expo/vector-icons/MaterialIcons', () => 'MaterialIcons');
jest.mock('../application/useNotes', () => ({ useNoteList: jest.fn() }));

const mockedList = jest.mocked(useNoteList);

const notes: Note[] = [
  {
    id: 'n1',
    titulo: 'Pedido de ciclo',
    contenido: 'Llamar a Ana',
    updatedAt: '2026-11-05T10:00:00Z',
  },
  { id: 'n2', titulo: 'Ideas', contenido: 'Sorteo en redes', updatedAt: '2026-11-04T10:00:00Z' },
];

function setup(data: Note[]) {
  mockedList.mockReturnValue({
    state: { status: 'ready', data },
    retry: jest.fn(),
    refresh: jest.fn(),
  });
}

beforeEach(() => mockPush.mockClear());

describe('NoteListScreen', () => {
  it('lista las notas con su vista previa y abre la que se toca', async () => {
    setup(notes);
    await render(<NoteListScreen />);
    expect(screen.getByText('Pedido de ciclo')).toBeTruthy();
    expect(screen.getByText('Llamar a Ana')).toBeTruthy();
    await fireEvent.press(screen.getByText('Ideas'));
    expect(mockPush).toHaveBeenCalledWith('/notas/n2');
  });

  it('filtra con el buscador', async () => {
    setup(notes);
    await render(<NoteListScreen />);
    await fireEvent.changeText(screen.getByLabelText('Buscar en tus notas'), 'sorteo');
    expect(screen.queryByText('Pedido de ciclo')).toBeNull();
    expect(screen.getByText('Ideas')).toBeTruthy();
    await fireEvent.changeText(screen.getByLabelText('Buscar en tus notas'), 'zzz');
    expect(screen.getByText('No hay notas que coincidan con la búsqueda.')).toBeTruthy();
  });

  it('sin notas explica qué hacer y abre el alta', async () => {
    setup([]);
    await render(<NoteListScreen />);
    expect(screen.getByText('Todavía no tenés notas')).toBeTruthy();
    await fireEvent.press(screen.getByText('Nueva nota'));
    expect(mockPush).toHaveBeenCalledWith('/notas/nueva');
  });
});
