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

import { todayIso } from '@/core/date/dates';
import { centsToInput } from '@/core/money/parseArs';
import { confirmDestructive } from '@/core/ui/confirm';
import { AppButton, AppText, AppTextField, AppTopBar, spacing, useTheme } from '@/design-system';

import { useGoal, useGoalActions } from '../application/useGoal';
import { monthLabel, monthStart, type Goal, type GoalForm } from '../domain/goal';

/** Meta del mes en curso: ventas (obligatoria) y ganancia (opcional). */
export function GoalScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const mes = monthStart(todayIso());
  const { state, retry } = useGoal(mes);

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.background }]}>
      <AppTopBar title="Meta del mes" />

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

      {state.status === 'ready' ? <FormBody mes={mes} goal={state.data} /> : null}
    </SafeAreaView>
  );
}

function toForm(goal: Goal | null): GoalForm {
  return {
    ventas: goal ? centsToInput(goal.ventasCentavos) : '',
    ganancia: goal?.gananciaCentavos != null ? centsToInput(goal.gananciaCentavos) : '',
  };
}

function FormBody({ mes, goal }: { mes: string; goal: Goal | null }) {
  const router = useRouter();
  const { save, remove } = useGoalActions();
  const [form, setForm] = useState<GoalForm>(() => toForm(goal));
  const [error, setError] = useState<{ field?: keyof GoalForm; message: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const errorFor = (field: keyof GoalForm) => (error?.field === field ? error.message : null);

  async function onSave() {
    if (busy) return;
    setBusy(true);
    setError(null);
    const result = await save(mes, form);
    if (result.ok) {
      router.back();
      return;
    }
    setError({ field: result.field, message: result.message });
    setBusy(false);
  }

  async function onRemove() {
    if (busy) return;
    const confirmed = await confirmDestructive(
      'Quitar meta',
      `Se va a quitar la meta de ${monthLabel(mes)}. Tus ventas no se tocan.`,
      'Quitar',
    );
    if (!confirmed) return;
    setBusy(true);
    const result = await remove(mes);
    if (result.ok) {
      router.back();
      return;
    }
    setError({ message: result.message });
    setBusy(false);
  }

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <AppText variant="title">{monthLabel(mes)}</AppText>
        <AppTextField
          label="Meta de ventas ($)"
          value={form.ventas}
          onChangeText={(ventas) => setForm((current) => ({ ...current, ventas }))}
          keyboardType="decimal-pad"
          placeholder="500.000"
          editable={!busy}
          error={errorFor('ventas')}
        />
        <AppTextField
          label="Meta de ganancia ($, opcional)"
          value={form.ganancia}
          onChangeText={(ganancia) => setForm((current) => ({ ...current, ganancia }))}
          keyboardType="decimal-pad"
          placeholder="150.000"
          editable={!busy}
          error={errorFor('ganancia')}
        />

        {error && !error.field ? (
          <AppText variant="body" color="error" accessibilityLiveRegion="polite">
            {error.message}
          </AppText>
        ) : null}

        <AppButton label={busy ? 'Guardando…' : 'Guardar meta'} onPress={onSave} disabled={busy} />
        {goal ? (
          <AppButton label="Quitar meta" variant="outlined" onPress={onRemove} disabled={busy} />
        ) : null}
        <AppButton label="Cancelar" variant="text" onPress={() => router.back()} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: spacing.md, gap: spacing.md, paddingBottom: spacing.xl },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    gap: spacing.md,
  },
});
