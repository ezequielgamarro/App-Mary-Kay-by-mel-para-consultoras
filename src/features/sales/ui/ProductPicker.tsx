import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { formatArs } from '@/core/money/formatArs';
import { AppButton, AppListItem, AppText, AppTextField, spacing } from '@/design-system';
import { useProductList } from '@/features/products/application/useProducts';
import { filterProducts } from '@/features/products/domain/product';

import type { SellableProduct } from '../domain/sale';

const MAX_RESULTS = 6;

type Props = {
  disabled?: boolean;
  onPick: (product: SellableProduct) => void;
};

/** Busca en el catálogo y agrega productos con stock a la venta. */
export function ProductPicker({ disabled, onPick }: Props) {
  const { state, retry } = useProductList();
  const [query, setQuery] = useState('');

  if (state.status === 'loading') {
    return (
      <AppText variant="body" color="onSurfaceVariant">
        Cargando productos…
      </AppText>
    );
  }
  if (state.status === 'error') {
    return (
      <View style={styles.block}>
        <AppText variant="body" color="error">
          {state.message}
        </AppText>
        <AppButton label="Reintentar" variant="tonal" onPress={retry} />
      </View>
    );
  }
  if (state.data.length === 0) {
    return (
      <AppText variant="body" color="onSurfaceVariant">
        Todavía no cargaste productos. Cargalos desde «Productos» para poder venderlos.
      </AppText>
    );
  }

  const withStock = state.data.filter((product) => product.stock > 0);
  const matches = filterProducts(withStock, query).slice(0, MAX_RESULTS);

  return (
    <View style={styles.block}>
      <AppTextField
        label="Agregar producto"
        value={query}
        onChangeText={setQuery}
        placeholder="Nombre o código"
        autoCapitalize="none"
        editable={!disabled}
      />
      {matches.map((product) => (
        <AppListItem
          key={product.id}
          title={product.nombre}
          supporting={`Stock: ${product.stock}`}
          trailing={formatArs(product.precioCentavos)}
          onPress={() => {
            if (disabled) return;
            onPick({
              id: product.id,
              nombre: product.nombre,
              precioCentavos: product.precioCentavos,
              stock: product.stock,
            });
          }}
        />
      ))}
      {matches.length === 0 ? (
        <AppText variant="label" color="onSurfaceVariant">
          {withStock.length === 0
            ? 'No hay productos con stock para vender.'
            : 'No hay productos que coincidan con la búsqueda.'}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({ block: { gap: spacing.sm } });
