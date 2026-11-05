import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, ScrollView, Share, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { formatArs } from '@/core/money/formatArs';
import {
  AppButton,
  AppCard,
  AppText,
  AppTextField,
  AppTopBar,
  spacing,
  useTheme,
} from '@/design-system';

import { useOrderActions } from '../application/useOrders';
import { useOrderSuggestion } from '../application/useOrderSuggestion';
import { orderMessage, simulateOrder, type SuggestionLine } from '../domain/order';

/** Pedido a la empresa: sugiere qué reponer, deja ajustar las cantidades y simula el costo y la ganancia. */
export function OrderScreen() {
  const { colors } = useTheme();
  const { state, retry } = useOrderSuggestion();

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

      {state.status === 'ready' ? <OrderBody lines={state.data} /> : null}
    </SafeAreaView>
  );
}

function OrderBody({ lines }: { lines: SuggestionLine[] }) {
  const router = useRouter();
  const { save } = useOrderActions();
  // Solo se guarda lo que la usuaria cambió; el resto toma la cantidad sugerida.
  const [quantities, setQuantities] = useState<Record<string, string>>({});
  const [notas, setNotas] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const totals = simulateOrder(lines, quantities);

  async function onSave() {
    if (busy) return;
    setBusy(true);
    setError(null);
    const result = await save(lines, quantities, notas);
    if (result.ok) {
      router.replace(`/pedidos/${result.orderId}`);
      return;
    }
    setError(result.message);
    setBusy(false);
  }

  const history = (
    <AppButton
      label="Ver historial de pedidos"
      variant="text"
      onPress={() => router.push('/pedidos/historial')}
    />
  );

  if (lines.length === 0) {
    return (
      <View style={styles.center}>
        <AppText variant="title">No hace falta pedir nada</AppText>
        <AppText variant="body" color="onSurfaceVariant">
          Todos tus productos tienen stock suficiente para lo que vendés en un mes.
        </AppText>
        {history}
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <AppText variant="body" color="onSurfaceVariant">
        Armado con tu stock actual y lo que vendiste en los últimos 60 días, para cubrir un mes.
        Cambiá las cantidades o poné 0 para sacar un producto.
      </AppText>
      {history}

      <AppCard tone="primary" style={styles.summary}>
        <AppText variant="label" color="onPrimary">
          Costo del pedido
        </AppText>
        <AppText variant="numeric" color="onPrimary" numberOfLines={1} adjustsFontSizeToFit>
          {formatArs(totals.costoCentavos)}
        </AppText>
        <AppText variant="body" color="onPrimary">
          {totals.unidades === 1 ? '1 unidad' : `${totals.unidades} unidades`} · al venderlo
          recaudás {formatArs(totals.ventaCentavos)} · ganancia estimada{' '}
          {formatArs(totals.gananciaCentavos)}
        </AppText>
      </AppCard>

      {lines.map((line) => (
        <AppCard key={line.productId} style={styles.line}>
          <AppText variant="bodyStrong">{line.nombre}</AppText>
          <AppText variant="label" color={line.stock === 0 ? 'error' : 'onSurfaceVariant'}>
            {line.motivo}
          </AppText>
          <AppTextField
            label={`Cantidad de ${line.nombre}`}
            value={quantities[line.productId] ?? String(line.sugerido)}
            onChangeText={(text) =>
              setQuantities((current) => ({ ...current, [line.productId]: text }))
            }
            keyboardType="number-pad"
            editable={!busy}
          />
          <AppText variant="label" color="onSurfaceVariant">
            Costo {formatArs(line.costoCentavos)} · precio {formatArs(line.precioCentavos)} por
            unidad
          </AppText>
        </AppCard>
      ))}

      <AppTextField
        label="Notas (opcional)"
        value={notas}
        onChangeText={setNotas}
        placeholder="Por ejemplo: pedido del ciclo de noviembre"
        editable={!busy}
      />

      {error ? (
        <AppText variant="body" color="error" accessibilityLiveRegion="polite">
          {error}
        </AppText>
      ) : null}

      <AppButton
        label={busy ? 'Guardando…' : 'Guardar pedido'}
        disabled={busy || totals.unidades === 0}
        onPress={onSave}
      />
      <AppButton
        label="Compartir sin guardar"
        variant="outlined"
        disabled={busy || totals.unidades === 0}
        onPress={() => void Share.share({ message: orderMessage(lines, quantities) })}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: spacing.md, gap: spacing.md, paddingBottom: spacing.xl },
  center: { alignItems: 'center', padding: spacing.lg, gap: spacing.md },
  summary: { gap: spacing.sm },
  line: { gap: spacing.sm },
});
