import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { confirmDestructive } from '@/core/ui/confirm';

import { useNote, useNoteActions } from '../application/useNotes';
import type { Note } from '../domain/note';
import { NoteFormScreen } from './NoteFormScreen';

const mockBack = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), back: mockBack, replace: jest.fn() }),
}));
jest.mock('@expo/vector-icons/MaterialIcons', () => 'MaterialIcons');
jest.mock('@/core/ui/confirm', () => ({ confirmDestructive: jest.fn() }));
jest.mock('../application/useNotes', () => ({ useNote: jest.fn(), useNoteActions: jest.fn() }));

const mockedNote = jest.mocked(useNote);
const mockedActions = jest.mocked(useNoteActions);
const mockedConfirm = jest.mocked(confirmDestructive);

const existing: Note = {
  id: 'n1',
  titulo: 'Pedido',
  contenido: 'Llamar a Ana',
  updatedAt: '2026-11-05T10:00:00Z',
};

function setup(note: Note | null) {
  const actions = {
    save: jest.fn().mockResolvedValue({ ok: true, note: existing }),
    remove: jest.fn().mockResolvedValue({ ok: true }),
  };
  mockedNote.mockReturnValue({
    state: { status: 'ready', data: note },
    retry: jest.fn(),
    refresh: jest.fn(),
  });
  mockedActions.mockReturnValue(actions);
  return actions;
}

beforeEach(() => {
  mockBack.mockClear();
  mockedConfirm.mockReset();
});

describe('NoteFormScreen', () => {
  it('crea una nota nueva y vuelve', async () => {
    const actions = setup(null);
    await render(<NoteFormScreen />);
    await fireEvent.changeText(screen.getByLabelText('Título'), 'Idea');
    await fireEvent.changeText(screen.getByLabelText('Nota'), 'Sorteo');
    await fireEvent.press(screen.getByText('Guardar'));
    await waitFor(() => expect(mockBack).toHaveBeenCalled());
    expect(actions.save).toHaveBeenCalledWith({ titulo: 'Idea', contenido: 'Sorteo' }, undefined);
    expect(screen.queryByText('Borrar nota')).toBeNull();
  });

  it('edita una nota existente', async () => {
    const actions = setup(existing);
    await render(<NoteFormScreen id="n1" />);
    expect(screen.getByLabelText('Título').props.value).toBe('Pedido');
    await fireEvent.changeText(screen.getByLabelText('Título'), 'Pedido nov');
    await fireEvent.press(screen.getByText('Guardar'));
    await waitFor(() => expect(mockBack).toHaveBeenCalled());
    expect(actions.save).toHaveBeenCalledWith(
      { titulo: 'Pedido nov', contenido: 'Llamar a Ana' },
      'n1',
    );
  });

  it('muestra el error de validación y no vuelve', async () => {
    const actions = setup(null);
    actions.save.mockResolvedValue({
      ok: false,
      field: 'titulo',
      message: 'Poné un título a la nota.',
    });
    await render(<NoteFormScreen />);
    await fireEvent.press(screen.getByText('Guardar'));
    expect(await screen.findByText('Poné un título a la nota.')).toBeTruthy();
    expect(mockBack).not.toHaveBeenCalled();
  });

  it('borra la nota solo si confirma', async () => {
    const actions = setup(existing);
    await render(<NoteFormScreen id="n1" />);
    mockedConfirm.mockResolvedValueOnce(false);
    await fireEvent.press(screen.getByText('Borrar nota'));
    expect(actions.remove).not.toHaveBeenCalled();
    mockedConfirm.mockResolvedValueOnce(true);
    await fireEvent.press(screen.getByText('Borrar nota'));
    await waitFor(() => expect(actions.remove).toHaveBeenCalledWith('n1'));
    await waitFor(() => expect(mockBack).toHaveBeenCalled());
  });

  it('avisa si la nota no existe', async () => {
    setup(null);
    await render(<NoteFormScreen id="nada" />);
    expect(screen.getByText('No encontramos esta nota')).toBeTruthy();
  });
});
