import { useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { addDays, formatDateAr, todayIso } from '@/core/date/dates';
import { AppButton, AppText, AppTextField, AppTopBar, spacing, useTheme } from '@/design-system';

import { useTaskActions } from '../application/useAgenda';
import type { TaskForm } from '../domain/task';

const SHORTCUTS: { label: string; days: number }[] = [
  { label: 'Hoy', days: 0 },
  { label: 'Mañana', days: 1 },
  { label: 'En 7 días', days: 7 },
];

/** Nueva tarea de la agenda: qué hacer y para cuándo. */
export function TaskFormScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { create } = useTaskActions();
  const [form, setForm] = useState<TaskForm>(() => ({
    titulo: '',
    fecha: formatDateAr(todayIso()),
  }));
  const [error, setError] = useState<{ field?: keyof TaskForm; message: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const errorFor = (field: keyof TaskForm) => (error?.field === field ? error.message : null);

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
      <AppTopBar title="Nueva tarea" />
      <KeyboardAvoidingView
        style={styles.screen}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <AppTextField
            label="¿Qué tenés que hacer?"
            value={form.titulo}
            onChangeText={(titulo) => setForm((current) => ({ ...current, titulo }))}
            maxLength={200}
            editable={!busy}
            error={errorFor('titulo')}
          />
          <AppTextField
            label="Para el día"
            value={form.fecha}
            onChangeText={(fecha) => setForm((current) => ({ ...current, fecha }))}
            placeholder="DD/MM/AAAA"
            keyboardType="numbers-and-punctuation"
            maxLength={10}
            editable={!busy}
            error={errorFor('fecha')}
          />
          <View style={styles.shortcuts}>
            {SHORTCUTS.map((shortcut) => (
              <AppButton
                key={shortcut.label}
                label={shortcut.label}
                variant="outlined"
                onPress={() =>
                  setForm((current) => ({
                    ...current,
                    fecha: formatDateAr(addDays(todayIso(), shortcut.days)),
                  }))
                }
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
  shortcuts: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
});
