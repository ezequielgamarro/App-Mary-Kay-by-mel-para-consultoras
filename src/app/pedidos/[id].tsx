import { useLocalSearchParams } from 'expo-router';

import { OrderDetailScreen } from '@/features/orders/ui/OrderDetailScreen';

export default function PedidoRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <OrderDetailScreen id={id} />;
}
