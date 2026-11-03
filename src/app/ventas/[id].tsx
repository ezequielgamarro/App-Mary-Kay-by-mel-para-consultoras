import { useLocalSearchParams } from 'expo-router';

import { SaleDetailScreen } from '@/features/sales/ui/SaleDetailScreen';

export default function VentaRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <SaleDetailScreen saleId={id} />;
}
