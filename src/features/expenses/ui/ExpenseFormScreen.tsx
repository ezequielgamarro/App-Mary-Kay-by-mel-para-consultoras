import { useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { formatDateAr, todayIso } from '@/core/date/dates';
import { AppButton, AppText, AppTextField, AppTopBar, spacing, useTheme } from '@/design-system';

import { useExpenseActions } from '../application/useExpenses';
import { EXPENSE_CATEGORIES, type ExpenseForm } from '../domain/expense';

/** Nuevo gasto: en qué, cuánto, cuándo y de qué tipo. */
export function ExpenseFormScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { create } = useExpenseActions();
  const [form, setForm] = useState<ExpenseForm>(() => ({
    concepto: '',
    monto: '',
    fecha: formatDateAr(todayIso()),
    categoria: 'otros',
  }));
  const [error, setError] = useState<{ field?: keyof ExpenseForm; message: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const errorFor = (field: keyof ExpenseForm) => (error?.field === field ? error.message : null);

  async function onSave() {
    if (busy) return;
    setBusy(true);
    setError(null);
    const result = await create(form);
    if (result.ok) {
      router.back();
      return;
    }
    setError({ field: result.field, message: result.message });
    setBusy(false);
  }

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.background }]}>
      <AppTopBar title="Nuevo gasto" />
      <KeyboardAvoidingView
        style={styles.screen}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <AppTextField
            label="¿En qué gastaste?"
            value={form.concepto}
            onChangeText={(concepto) => setForm((current) => ({ ...current, concepto }))}
            maxLength={200}
            editable={!busy}
            error={errorFor('concepto')}
          />
          <AppTextField
            label="Monto ($)"
            value={form.monto}
            onChangeText={(monto) => setForm((current) => ({ ...current, monto }))}
            keyboardType="decimal-pad"
            placeholder="2.500"
            editable={!busy}
            error={errorFor('monto')}
          />
          <AppTextField
            label="Fecha"
            value={form.fecha}
            onChangeText={(fecha) => setForm((current) => ({ ...current, fecha }))}
            placeholder="DD/MM/AAAA"
            keyboardType="numbers-and-punctuation"
            maxLength={10}
            editable={!busy}
            error={errorFor('fecha')}
          />
          <AppText variant="label" color="onSurfaceVariant">
            Tipo de gasto
          </AppText>
          <View style={styles.categories}>
            {EXPENSE_CATEGORIES.map((category) => (
              <AppButton
                key={category.value}
                label={category.label}
                variant={form.categoria === category.value ? 'tonal' : 'outlined'}
                accessibilityState={{ selected: form.categoria === category.value }}
                onPress={() => setForm((current) => ({ ...current, categoria: category.value }))}
                disabled={busy}
              />
            ))}
          </View>

          {error && !error.field ? (
            <AppText variant="body" color="error" accessibilityLiveRegion="polite">
              {error.message}
            </AppText>
          ) : null}

          <AppButton label={busy ? 'Guardando…' : 'Guardar'} onPress={onSave} disabled={busy} />
          <AppButton label="Cancelar" variant="text" onPress={() => router.back()} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: spacing.md, gap: spacing.md, paddingBottom: spacing.xl },
  categories: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
});
