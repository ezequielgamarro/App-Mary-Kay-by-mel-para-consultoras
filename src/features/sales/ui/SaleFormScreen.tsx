import { useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { addDays, formatDateAr, todayIso } from '@/core/date/dates';
import { formatArs } from '@/core/money/formatArs';
import { centsToInput, parseArs } from '@/core/money/parseArs';
import {
  AppButton,
  AppCard,
  AppText,
  AppTextField,
  AppTopBar,
  spacing,
  useTheme,
} from '@/design-system';

import { useSaleActions } from '../application/useSales';
import {
  addProductToDraft,
  draftTotal,
  EMPTY_DRAFT,
  type DraftField,
  type SaleDraft,
} from '../domain/sale';
import { ClientPicker } from './ClientPicker';
import { PaymentMediumPicker } from './PaymentMediumPicker';
import { ProductPicker } from './ProductPicker';
import { SaleLineEditor } from './SaleLineEditor';

const DUE_SHORTCUTS = [7, 15, 30];

/** Registrar una venta: productos, clienta opcional, pago inicial y vencimiento del saldo. */
export function SaleFormScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { register } = useSaleActions();
  const [draft, setDraft] = useState<SaleDraft>(EMPTY_DRAFT);
  const [error, setError] = useState<{ field?: DraftField; message: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const set = <K extends keyof SaleDraft>(key: K, value: SaleDraft[K]) =>
    setDraft((current) => ({ ...current, [key]: value }));
  const errorFor = (field: DraftField) => (error?.field === field ? error.message : null);

  const total = draftTotal(draft.lines);
  const paid = draft.pago.trim() === '' ? 0 : (parseArs(draft.pago) ?? 0);
  const balance = Math.max(total - paid, 0);

  async function onSave() {
    if (busy) return;
    setBusy(true);
    setError(null);
    const result = await register(draft);
    if (result.ok) {
      router.replace(`/ventas/${result.saleId}`);
      return;
    }
    setError({ field: result.field, message: result.message });
    setBusy(false);
  }

  function applyDueShortcut(days: number) {
    set('venceEl', formatDateAr(addDays(todayIso(), days)));
  }

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.background }]}>
      <AppTopBar title="Registrar venta" />
      <KeyboardAvoidingView
        style={styles.screen}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <ClientPicker
            selectedId={draft.clientId}
            error={errorFor('cliente')}
            disabled={busy}
            onSelect={(clientId) => set('clientId', clientId)}
          />

          <ProductPicker
            disabled={busy}
            onPick={(product) => set('lines', addProductToDraft(draft.lines, product))}
          />

          {draft.lines.map((line) => (
            <SaleLineEditor
              key={line.productId}
              line={line}
              disabled={busy}
              onChange={(next) =>
                set(
                  'lines',
                  draft.lines.map((l) => (l.productId === next.productId ? next : l)),
                )
              }
              onRemove={() =>
                set(
                  'lines',
                  draft.lines.filter((l) => l.productId !== line.productId),
                )
              }
            />
          ))}
          {errorFor('lines') ? (
            <AppText variant="label" color="error" accessibilityLiveRegion="polite">
              {errorFor('lines')}
            </AppText>
          ) : null}

          <AppCard tone="primary" style={styles.summary}>
            <AppText variant="label" color="onPrimary">
              Total de la venta
            </AppText>
            <AppText variant="numeric" color="onPrimary" numberOfLines={1} adjustsFontSizeToFit>
              {formatArs(total)}
            </AppText>
          </AppCard>

          <AppTextField
            label="Pagó ahora ($)"
            value={draft.pago}
            onChangeText={(pago) => set('pago', pago)}
            keyboardType="decimal-pad"
            placeholder="Dejalo vacío si todavía no pagó"
            editable={!busy}
            error={errorFor('pago')}
          />
          {total > 0 ? (
            <AppButton
              label="Pagó todo"
              variant="tonal"
              onPress={() => set('pago', centsToInput(total))}
              disabled={busy}
            />
          ) : null}
          <PaymentMediumPicker
            value={draft.medio}
            onChange={(medio) => set('medio', medio)}
            disabled={busy}
          />

          {total > 0 && balance > 0 ? (
            <View style={styles.due}>
              <AppText variant="bodyStrong" color="error">
                Saldo pendiente: {formatArs(balance)}
              </AppText>
              <AppTextField
                label="Vence el (opcional)"
                value={draft.venceEl}
                onChangeText={(venceEl) => set('venceEl', venceEl)}
                placeholder="DD/MM/AAAA"
                keyboardType="numbers-and-punctuation"
                maxLength={10}
                editable={!busy}
                error={errorFor('venceEl')}
              />
              <View style={styles.shortcuts}>
                {DUE_SHORTCUTS.map((days) => (
                  <AppButton
                    key={days}
                    label={`En ${days} días`}
                    variant="outlined"
                    onPress={() => applyDueShortcut(days)}
                    disabled={busy}
                  />
                ))}
              </View>
            </View>
          ) : null}

          <AppTextField
            label="Notas (opcional)"
            value={draft.notas}
            onChangeText={(notas) => set('notas', notas)}
            multiline
            maxLength={2000}
            editable={!busy}
            error={errorFor('notas')}
          />

          {error && !error.field ? (
            <AppText variant="body" color="error" accessibilityLiveRegion="polite">
              {error.message}
            </AppText>
          ) : null}

          <AppButton
            label={busy ? 'Registrando…' : 'Registrar venta'}
            onPress={onSave}
            disabled={busy}
          />
          <AppButton label="Cancelar" variant="text" onPress={() => router.back()} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: spacing.md, gap: spacing.md, paddingBottom: spacing.xl },
  summary: { gap: spacing.xs },
  due: { gap: spacing.sm },
  shortcuts: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
});
