import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useRef } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { formatDateAr } from '@/core/date/dates';
import { formatArs } from '@/core/money/formatArs';
import {
  AppNotice,
  AppButton,
  AppListItem,
  AppText,
  AppTopBar,
  spacing,
  useTheme,
} from '@/design-system';

import { useOrderList } from '../application/useOrders';
import { orderSummaryText } from '../domain/orderRecord';

/** Historial de pedidos guardados, del más reciente al más antiguo. */
export function OrderHistoryScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { state, retry, refresh } = useOrderList();

  // Al volver del detalle (recibir o cancelar), la lista se actualiza sin parpadeo.
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

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.background }]}>
      <AppTopBar title="Historial de pedidos" />
      {state.status === 'ready' && state.stale ? (
        <AppNotice message="Sin conexión: ves lo último que se guardó en este teléfono." />
      ) : null}

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
          <AppText variant="title">Todavía no guardaste pedidos</AppText>
          <AppText variant="body" color="onSurfaceVariant" style={styles.centerText}>
            Armá un pedido y tocá «Guardar pedido»: cuando te llegue, lo marcás como recibido y el
            stock se actualiza solo.
          </AppText>
          <AppButton label="Armar pedido" onPress={() => router.back()} />
        </View>
      ) : null}

      {state.status === 'ready' && state.data.length > 0 ? (
        <FlatList
          data={state.data}
          keyExtractor={(order) => order.id}
          contentContainerStyle={styles.content}
          renderItem={({ item }) => (
            <AppListItem
              title={`Pedido del ${formatDateAr(item.pedidoEl)}`}
              supporting={orderSummaryText(item)}
              supportingColor={item.estado === 'cancelado' ? 'error' : 'onSurfaceVariant'}
              trailing={formatArs(item.costoCentavos)}
              onPress={() => router.push(`/pedidos/${item.id}`)}
            />
          )}
        />
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: spacing.md, gap: spacing.xs, paddingBottom: spacing.xl },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    gap: spacing.md,
  },
  centerText: { textAlign: 'center' },
});
