import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useRef } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { formatDateAr, todayIso } from '@/core/date/dates';
import { formatArs } from '@/core/money/formatArs';
import {
  AppButton,
  AppCard,
  AppFab,
  AppListItem,
  AppText,
  AppTopBar,
  spacing,
  useTheme,
} from '@/design-system';

import { useSaleList } from '../application/useSales';
import { saleStatus, saleStatusText, totalPorCobrar } from '../domain/sale';

export function SaleListScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { state, retry, refresh } = useSaleList();
  const today = todayIso();

  // Al volver de registrar o cobrar, se actualiza la lista sin parpadeo.
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

  const goToNew = () => router.push('/ventas/nueva');

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.background }]}>
      <AppTopBar title="Ventas" />

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
          <AppText variant="title">Todavía no registraste ventas</AppText>
          <AppText variant="body" color="onSurfaceVariant" style={styles.centerText}>
            Registrá tu primera venta: se descuenta el stock y, si queda saldo, lo ves en la cuenta
            corriente de la clienta.
          </AppText>
          <AppButton label="Registrar venta" onPress={goToNew} />
        </View>
      ) : null}

      {state.status === 'ready' && state.data.length > 0 ? (
        <FlatList
          data={state.data}
          keyExtractor={(sale) => sale.id}
          contentContainerStyle={styles.content}
          ListHeaderComponent={
            <AppCard tone="tonal" style={styles.summary}>
              <AppText variant="label" color="onSurfaceVariant">
                Por cobrar
              </AppText>
              <AppText variant="numeric">{formatArs(totalPorCobrar(state.data))}</AppText>
            </AppCard>
          }
          renderItem={({ item }) => {
            const kind = saleStatus(item, today);
            return (
              <AppListItem
                title={item.clientName ?? 'Venta de mostrador'}
                supporting={`${formatDateAr(item.vendidaEl)} · ${saleStatusText(item, today)}`}
                supportingColor={kind === 'vencida' ? 'error' : 'onSurfaceVariant'}
                trailing={formatArs(
                  kind === 'por_cobrar' || kind === 'vencida'
                    ? item.saldoCentavos
                    : item.totalCentavos,
                )}
                trailingColor={kind === 'vencida' ? 'error' : 'onSurface'}
                onPress={() => router.push(`/ventas/${item.id}`)}
              />
            );
          }}
        />
      ) : null}

      {state.status === 'ready' && state.data.length > 0 ? (
        <AppFab label="Registrar venta" icon="add" onPress={goToNew} />
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: spacing.md, gap: spacing.xs, paddingBottom: 120 },
  summary: { gap: spacing.xs, marginBottom: spacing.sm },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    gap: spacing.md,
  },
  centerText: { textAlign: 'center' },
});
