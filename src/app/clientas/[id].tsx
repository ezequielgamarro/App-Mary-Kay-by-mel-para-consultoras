import { useLocalSearchParams } from 'expo-router';

import { ClientFormScreen } from '@/features/clients/ui/ClientFormScreen';

export default function EditarClientaRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <ClientFormScreen clientId={id} />;
}
