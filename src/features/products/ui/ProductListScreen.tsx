import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { formatArs } from '@/core/money/formatArs';
import {
  AppButton,
  AppCard,
  AppFab,
  AppListItem,
  AppText,
  AppTextField,
  AppTopBar,
  spacing,
  useTheme,
} from '@/design-system';

import { useProductImageUrls, useProductList } from '../application/useProducts';
import {
  filterProducts,
  stockStatus,
  valorStockCentavos,
  type Product,
  type StockStatus,
} from '../domain/product';

const STATUS_TEXT: Record<StockStatus, (product: Product) => string> = {
  sin_stock: () => 'Sin stock',
  bajo: (product) => `Stock bajo: quedan ${product.stock}`,
  ok: (product) => `Stock: ${product.stock}`,
};

export function ProductListScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { state, retry, refresh } = useProductList();
  const [query, setQuery] = useState('');
  const imageUrls = useProductImageUrls(
    state.status === 'ready' ? state.data.flatMap((p) => (p.imagenPath ? [p.imagenPath] : [])) : [],
  );

  // Al volver de crear o editar, se actualiza la lista sin parpadeo (la primera carga ya la hace el hook).
  const firstFocus = useRef(true);
  useFocusEffect(
    useCallback(() => {
      if (firstFocus.current) {
        firstFocus.current = false;
        return;
      }
      refresh();
    }, [refresh]),
  );

  const goToNew = () => router.push('/productos/nuevo');

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.background }]}>
      <AppTopBar title="Productos" />

      {state.status === 'loading' ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} accessibilityLabel="Cargando" />
        </View>
      ) : null}

      {state.status === 'error' ? (
        <View style={styles.center}>
          <AppText variant="body" color="error" accessibilityLiveRegion="polite">
            {state.message}
          </AppText>
          <AppButton label="Reintentar" variant="tonal" onPress={retry} />
        </View>
      ) : null}

      {state.status === 'ready' && state.data.length === 0 ? (
        <View style={styles.center}>
          <AppText variant="title">Todavía no cargaste productos</AppText>
          <AppText variant="body" color="onSurfaceVariant" style={styles.centerText}>
            Agregá tu primer producto con su costo, precio y stock para ver tu ganancia.
          </AppText>
          <AppButton label="Agregar producto" onPress={goToNew} />
        </View>
      ) : null}

      {state.status === 'ready' && state.data.length > 0 ? (
        <FlatList
          data={filterProducts(state.data, query)}
          keyExtractor={(product) => product.id}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          ListHeaderComponent={
            <View style={styles.header}>
              <AppCard tone="tonal" style={styles.summary}>
                <AppText variant="label" color="onSurfaceVariant">
                  Valor del stock al costo
                </AppText>
                <AppText variant="numeric">{formatArs(valorStockCentavos(state.data))}</AppText>
              </AppCard>
              <AppTextField
                label="Buscar"
                value={query}
                onChangeText={setQuery}
                placeholder="Nombre o código"
                autoCapitalize="none"
                returnKeyType="search"
              />
            </View>
          }
          ListEmptyComponent={
            <AppText variant="body" color="onSurfaceVariant" style={styles.centerText}>
              No hay productos que coincidan con la búsqueda.
            </AppText>
          }
          renderItem={({ item }) => {
            const status = stockStatus(item);
            return (
              <AppListItem
                title={item.nombre}
                supporting={STATUS_TEXT[status](item)}
                supportingColor={status === 'ok' ? 'onSurfaceVariant' : 'error'}
                trailing={formatArs(item.precioCentavos)}
                imageUri={item.imagenPath ? imageUrls[item.imagenPath] : undefined}
                onPress={() => router.push(`/productos/${item.id}`)}
              />
            );
          }}
        />
      ) : null}

      {state.status === 'ready' && state.data.length > 0 ? (
        <View style={styles.fab}>
          <AppFab label="Nuevo producto" icon="add" onPress={goToNew} />
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: spacing.md, gap: spacing.xs, paddingBottom: 120 },
  header: { gap: spacing.md, marginBottom: spacing.sm },
  summary: { gap: spacing.xs },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    gap: spacing.md,
  },
  centerText: { textAlign: 'center' },
  fab: { position: 'absolute', right: spacing.md, bottom: spacing.md },
});
