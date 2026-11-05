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

import { confirmDestructive } from '@/core/ui/confirm';
import { AppButton, AppText, AppTextField, AppTopBar, spacing, useTheme } from '@/design-system';

import { useNote, useNoteActions } from '../application/useNotes';
import type { Note, NoteForm } from '../domain/note';

/** Crea una nota o, si recibe `id`, la edita. */
export function NoteFormScreen({ id }: { id?: string }) {
  const { colors } = useTheme();
  const router = useRouter();
  const { state, retry } = useNote(id);

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.background }]}>
      <AppTopBar title={id ? 'Nota' : 'Nueva nota'} />

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

      {state.status === 'ready' && id && state.data === null ? (
        <View style={styles.center}>
          <AppText variant="title">No encontramos esta nota</AppText>
          <AppButton label="Volver" variant="tonal" onPress={() => router.back()} />
        </View>
      ) : null}

      {state.status === 'ready' && (!id || state.data) ? (
        <FormBody note={state.data} id={id} />
      ) : null}
    </SafeAreaView>
  );
}

function FormBody({ note, id }: { note: Note | null; id?: string }) {
  const router = useRouter();
  const { save, remove } = useNoteActions();
  const [form, setForm] = useState<NoteForm>({
    titulo: note?.titulo ?? '',
    contenido: note?.contenido ?? '',
  });
  const [error, setError] = useState<{ field?: keyof NoteForm; message: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const errorFor = (field: keyof NoteForm) => (error?.field === field ? error.message : null);

  async function onSave() {
    if (busy) return;
    setBusy(true);
    setError(null);
    const result = await save(form, id);
    if (result.ok) {
      router.back();
      return;
    }
    setError({ field: result.field, message: result.message });
    setBusy(false);
  }

  async function onRemove() {
    if (busy || !id) return;
    const confirmed = await confirmDestructive(
      'Borrar nota',
      'Se va a borrar esta nota. Esto no se puede deshacer.',
      'Borrar',
    );
    if (!confirmed) return;
    setBusy(true);
    const result = await remove(id);
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
        <AppTextField
          label="Título"
          value={form.titulo}
          onChangeText={(titulo) => setForm((current) => ({ ...current, titulo }))}
          maxLength={120}
          editable={!busy}
          error={errorFor('titulo')}
        />
        <AppTextField
          label="Nota"
          value={form.contenido}
          onChangeText={(contenido) => setForm((current) => ({ ...current, contenido }))}
          multiline
          textAlignVertical="top"
          maxLength={10000}
          editable={!busy}
          error={errorFor('contenido')}
        />

        {error && !error.field ? (
          <AppText variant="body" color="error" accessibilityLiveRegion="polite">
            {error.message}
          </AppText>
        ) : null}

        <AppButton label={busy ? 'Guardando…' : 'Guardar'} onPress={onSave} disabled={busy} />
        {id ? (
          <AppButton label="Borrar nota" variant="outlined" onPress={onRemove} disabled={busy} />
        ) : null}
        <AppButton label="Cancelar" variant="text" onPress={() => router.back()} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: spacing.md, gap: spacing.md, paddingBottom: spacing.xl },
  center: { alignItems: 'center', padding: spacing.lg, gap: spacing.md },
});
