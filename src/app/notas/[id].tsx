import { useLocalSearchParams } from 'expo-router';

import { NoteFormScreen } from '@/features/notes/ui/NoteFormScreen';

export default function NotaRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <NoteFormScreen id={id} />;
}
