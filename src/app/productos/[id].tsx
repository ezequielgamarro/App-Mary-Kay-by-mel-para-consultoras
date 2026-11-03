import { useLocalSearchParams } from 'expo-router';

import { ProductFormScreen } from '@/features/products/ui/ProductFormScreen';

export default function EditarProductoRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <ProductFormScreen productId={id} />;
}
