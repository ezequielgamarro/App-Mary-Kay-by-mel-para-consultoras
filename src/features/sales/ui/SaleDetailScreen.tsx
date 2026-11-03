import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { formatDateAr, todayIso } from '@/core/date/dates';
import { formatArs } from '@/core/money/formatArs';
import { centsToInput } from '@/core/money/parseArs';
import { confirmDestructive } from '@/core/ui/confirm';
import {
  AppButton,
  AppCard,
  AppText,
  AppTextField,
  AppTopBar,
  spacing,
  useTheme,
} from '@/design-system';

import { useSale, useSaleActions } from '../application/useSales';
import {
  gananciaVenta,
  mediumLabel,
  saleStatus,
  saleStatusText,
  type PaymentMedium,
  type SaleDetail,
} from '../domain/sale';
import { PaymentMediumPicker } from './PaymentMediumPicker';

type Props = { saleId: string };

/** Detalle de una venta: productos, cobros, saldo, nuevo cobro y anulación. */
export function SaleDetailScreen({ saleId }: Props) {
  const { colors } = useTheme();
  const router = useRouter();
  const { state, retry, refresh } = useSale(saleId);

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.background }]}>
      <AppTopBar title="Venta" />

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
          <AppButton label="Volver" variant="text" onPress={() => router.back()} />
        </View>
      ) : null}

      {state.status === 'ready' && state.data === null ? (
        <View style={styles.center}>
          <AppText variant="title">No encontramos esta venta</AppText>
          <AppButton label="Volver" variant="tonal" onPress={() => router.back()} />
        </View>
      ) : null}

      {state.status === 'ready' && state.data !== null ? (
        <DetailBody sale={state.data} onChanged={refresh} />
      ) : null}
    </SafeAreaView>
  );
}

function DetailBody({ sale, onChanged }: { sale: SaleDetail; onChanged: () => void }) {
  const router = useRouter();
  const { addPayment, removePayment, cancel } = useSaleActions();
  const [amount, setAmount] = useState('');
  const [medium, setMedium] = useState<PaymentMedium>('efectivo');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const today = todayIso();
  const kind = saleStatus(sale, today);
  const active = sale.estado === 'activa';

  async function onCollect() {
    if (busy) return;
    setBusy(true);
    setError(null);
    const result = await addPayment(sale.id, amount, medium, sale.saldoCentavos);
    setBusy(false);
    if (result.ok) {
      setAmount('');
      onChanged();
    } else {
      setError(result.message);
    }
  }

  async function onRemovePayment(paymentId: string, monto: number) {
    if (busy) return;
    const confirmed = await confirmDestructive(
      'Borrar cobro',
      `Se va a borrar el cobro de ${formatArs(monto)} y el saldo de la venta vuelve a subir.`,
      'Borrar',
    );
    if (!confirmed) return;
    setBusy(true);
    setError(null);
    const result = await removePayment(paymentId);
    setBusy(false);
    if (result.ok) onChanged();
    else setError(result.message);
  }

  async function onCancel() {
    if (busy) return;
    const confirmed = await confirmDestructive(
      'Anular venta',
      'Se devuelve el stock de los productos y la venta deja de contar como deuda. Una venta anulada no se puede volver a activar.',
      'Anular',
    );
    if (!confirmed) return;
    setBusy(true);
    setError(null);
    const result = await cancel(sale.id);
    setBusy(false);
    if (result.ok) onChanged();
    else setError(result.message);
  }

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <AppCard tone={active ? 'primary' : 'tonal'} style={styles.summary}>
          <AppText variant="label" color={active ? 'onPrimary' : 'onSurfaceVariant'}>
            {sale.clientName ?? 'Venta de mostrador'} · {formatDateAr(sale.vendidaEl)}
          </AppText>
          <AppText
            variant="numeric"
            color={active ? 'onPrimary' : 'onSurface'}
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            {formatArs(sale.totalCentavos)}
          </AppText>
          <AppText variant="body" color={active ? 'onPrimary' : 'onSurface'}>
            Pagado {formatArs(sale.pagadoCentavos)} · Saldo {formatArs(sale.saldoCentavos)}
          </AppText>
          <AppText variant="bodyStrong" color={active ? 'onPrimary' : 'error'}>
            {saleStatusText(sale, today)}
            {sale.venceEl && kind !== 'pagada' && kind !== 'anulada'
              ? ` · vence el ${formatDateAr(sale.venceEl)}`
              : ''}
          </AppText>
        </AppCard>

        <AppText variant="title">Productos</AppText>
        {sale.items.map((item) => (
          <View key={item.id} style={styles.row}>
            <View style={styles.rowText}>
              <AppText variant="body">{item.nombreProducto}</AppText>
              <AppText variant="label" color="onSurfaceVariant">
                {item.cantidad} × {formatArs(item.precioCentavos)}
              </AppText>
            </View>
            <AppText variant="bodyStrong">{formatArs(item.cantidad * item.precioCentavos)}</AppText>
          </View>
        ))}
        <AppText variant="label" color="onSurfaceVariant">
          Ganancia de esta venta: {formatArs(gananciaVenta(sale.items))}
        </AppText>

        <AppText variant="title">Cobros</AppText>
        {sale.payments.length === 0 ? (
          <AppText variant="body" color="onSurfaceVariant">
            Todavía no hay cobros registrados.
          </AppText>
        ) : null}
        {sale.payments.map((payment) => (
          <View key={payment.id} style={styles.row}>
            <View style={styles.rowText}>
              <AppText variant="body">{formatArs(payment.montoCentavos)}</AppText>
              <AppText variant="label" color="onSurfaceVariant">
                {formatDateAr(payment.pagadoEl)} · {mediumLabel(payment.medio)}
              </AppText>
            </View>
            {active ? (
              <AppButton
                label="Borrar"
                variant="text"
                onPress={() => void onRemovePayment(payment.id, payment.montoCentavos)}
                disabled={busy}
              />
            ) : null}
          </View>
        ))}

        {active && sale.saldoCentavos > 0 ? (
          <AppCard tone="surface" style={styles.collect}>
            <AppText variant="bodyStrong">Registrar un cobro</AppText>
            <AppTextField
              label="Importe cobrado ($)"
              value={amount}
              onChangeText={setAmount}
              keyboardType="decimal-pad"
              editable={!busy}
            />
            <AppButton
              label={`Cobrar el saldo completo (${formatArs(sale.saldoCentavos)})`}
              variant="tonal"
              onPress={() => setAmount(centsToInput(sale.saldoCentavos))}
              disabled={busy}
            />
            <PaymentMediumPicker value={medium} onChange={setMedium} disabled={busy} />
            <AppButton
              label={busy ? 'Guardando…' : 'Registrar cobro'}
              onPress={() => void onCollect()}
              disabled={busy}
            />
          </AppCard>
        ) : null}

        {sale.notas ? (
          <>
            <AppText variant="title">Notas</AppText>
            <AppText variant="body">{sale.notas}</AppText>
          </>
        ) : null}

        {error ? (
          <AppText variant="body" color="error" accessibilityLiveRegion="polite">
            {error}
          </AppText>
        ) : null}

        {active ? (
          <AppButton
            label="Anular venta"
            variant="outlined"
            onPress={() => void onCancel()}
            disabled={busy}
          />
        ) : null}
        <AppButton label="Volver" variant="text" onPress={() => router.back()} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: spacing.md, gap: spacing.md, paddingBottom: spacing.xl },
  summary: { gap: spacing.xs },
  collect: { gap: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  rowText: { flex: 1 },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    gap: spacing.md,
  },
});
