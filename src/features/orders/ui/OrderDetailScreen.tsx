import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, ScrollView, Share, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { formatDateAr } from '@/core/date/dates';
import { formatArs } from '@/core/money/formatArs';
import { confirmDestructive } from '@/core/ui/confirm';
import {
  AppButton,
  AppCard,
  AppListItem,
  AppText,
  AppTopBar,
  spacing,
  useTheme,
} from '@/design-system';

import { useOrderActions, useOrderDetail } from '../application/useOrders';
import { orderSummaryText, recordMessage, type OrderRecordDetail } from '../domain/orderRecord';

/** Detalle de un pedido guardado: renglones, totales y, si está pendiente, recibirlo o cancelarlo. */
export function OrderDetailScreen({ id }: { id: string | undefined }) {
  const { colors } = useTheme();
  const router = useRouter();
  const { state, retry, refresh } = useOrderDetail(id);

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.background }]}>
      <AppTopBar title="Pedido" />

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

      {state.status === 'ready' && state.data === null ? (
        <View style={styles.center}>
          <AppText variant="title">No encontramos este pedido</AppText>
          <AppButton label="Volver" variant="tonal" onPress={() => router.back()} />
        </View>
      ) : null}

      {state.status === 'ready' && state.data ? (
        <DetailBody order={state.data} onChanged={refresh} />
      ) : null}
    </SafeAreaView>
  );
}

function DetailBody({ order, onChanged }: { order: OrderRecordDetail; onChanged: () => void }) {
  const { receive, cancel } = useOrderActions();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function run(action: () => Promise<{ ok: true } | { ok: false; message: string }>) {
    if (busy) return;
    setBusy(true);
    setError(null);
    const result = await action();
    if (result.ok) onChanged();
    else setError(result.message);
    setBusy(false);
  }

  async function onReceive() {
    const confirmed = await confirmDestructive(
      'Marcar como recibido',
      'Se suman las unidades del pedido al stock de tus productos. Esto no se puede deshacer.',
      'Recibido',
    );
    if (confirmed) await run(() => receive(order.id));
  }

  async function onCancel() {
    const confirmed = await confirmDestructive(
      'Cancelar pedido',
      'El pedido queda como cancelado en el historial. El stock no cambia.',
      'Cancelar pedido',
    );
    if (confirmed) await run(() => cancel(order.id));
  }

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <AppCard tone="primary" style={styles.summary}>
        <AppText variant="label" color="onPrimary">
          Pedido del {formatDateAr(order.pedidoEl)}
        </AppText>
        <AppText variant="numeric" color="onPrimary" numberOfLines={1} adjustsFontSizeToFit>
          {formatArs(order.costoCentavos)}
        </AppText>
        <AppText variant="body" color="onPrimary">
          {orderSummaryText(order)} · al venderlo recaudás {formatArs(order.ventaCentavos)}
        </AppText>
      </AppCard>

      {order.notas ? (
        <AppText variant="body" color="onSurfaceVariant">
          {order.notas}
        </AppText>
      ) : null}

      {order.items.map((item) => (
        <AppListItem
          key={item.id}
          title={item.nombreProducto}
          supporting={`${item.cantidad} × ${formatArs(item.costoCentavos)}`}
          trailing={formatArs(item.cantidad * item.costoCentavos)}
        />
      ))}

      {error ? (
        <AppText variant="body" color="error" accessibilityLiveRegion="polite">
          {error}
        </AppText>
      ) : null}

      {order.estado === 'pendiente' ? (
        <>
          <AppButton label="Marcar como recibido" onPress={onReceive} disabled={busy} />
          <AppButton
            label="Cancelar pedido"
            variant="outlined"
            onPress={onCancel}
            disabled={busy}
          />
        </>
      ) : null}
      <AppButton
        label="Compartir pedido"
        variant={order.estado === 'pendiente' ? 'text' : 'tonal'}
        onPress={() => void Share.share({ message: recordMessage(order) })}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: spacing.md, gap: spacing.md, paddingBottom: spacing.xl },
  center: { alignItems: 'center', padding: spacing.lg, gap: spacing.md },
  summary: { gap: spacing.sm },
});
