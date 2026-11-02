import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { confirmDestructive } from '@/core/ui/confirm';
import { AppButton, AppText, AppTextField, AppTopBar, spacing, useTheme } from '@/design-system';

import { useClient, useClientActions } from '../application/useClients';
import { birthdayToDayMonth, whatsappUrl, type Client, type ClientForm } from '../domain/client';

type Props = { clientId?: string };

/** Alta (sin `clientId`) o edición de una clienta. */
export function ClientFormScreen({ clientId }: Props) {
  const { colors } = useTheme();
  const router = useRouter();
  const { state, retry } = useClient(clientId);

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.background }]}>
      <AppTopBar title={clientId ? 'Editar clienta' : 'Nueva clienta'} />

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

      {state.status === 'ready' && clientId && state.data === null ? (
        <View style={styles.center}>
          <AppText variant="title">No encontramos a esta clienta</AppText>
          <AppButton label="Volver" variant="tonal" onPress={() => router.back()} />
        </View>
      ) : null}

      {state.status === 'ready' && (!clientId || state.data !== null) ? (
        <FormBody key={clientId ?? 'nueva'} client={state.data} />
      ) : null}
    </SafeAreaView>
  );
}

function toForm(client: Client | null): ClientForm {
  return {
    nombre: client?.nombre ?? '',
    telefono: client?.telefono ?? '',
    cumpleanos: birthdayToDayMonth(client?.cumpleanos ?? null),
    notas: client?.notas ?? '',
  };
}

function FormBody({ client }: { client: Client | null }) {
  const router = useRouter();
  const { save, remove } = useClientActions();
  const [form, setForm] = useState<ClientForm>(() => toForm(client));
  const [error, setError] = useState<{ field?: keyof ClientForm; message: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const set = (field: keyof ClientForm) => (value: string) =>
    setForm((current) => ({ ...current, [field]: value }));
  const errorFor = (field: keyof ClientForm) => (error?.field === field ? error.message : null);
  const whatsapp = whatsappUrl(form.telefono.trim() || null);

  async function onSave() {
    if (busy) return;
    setBusy(true);
    setError(null);
    const result = await save(client?.id ?? null, form);
    if (result.ok) {
      router.back();
      return;
    }
    setError({ field: result.field, message: result.message });
    setBusy(false);
  }

  async function onDelete() {
    if (!client || busy) return;
    const confirmed = await confirmDestructive(
      'Eliminar clienta',
      `Se va a eliminar a ${client.nombre}. Esta acción no se puede deshacer.`,
      'Eliminar',
    );
    if (!confirmed) return;
    setBusy(true);
    const result = await remove(client.id);
    if (result.ok) {
      router.back();
      return;
    }
    setError({ message: result.message });
    setBusy(false);
  }

  async function onWhatsapp() {
    if (!whatsapp) return;
    try {
      await Linking.openURL(whatsapp);
    } catch {
      setError({ message: 'No pudimos abrir WhatsApp en este dispositivo.' });
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <AppTextField
          label="Nombre"
          value={form.nombre}
          onChangeText={set('nombre')}
          autoComplete="name"
          maxLength={120}
          error={errorFor('nombre')}
        />
        <AppTextField
          label="Teléfono (con código de área, sin 15)"
          value={form.telefono}
          onChangeText={set('telefono')}
          keyboardType="phone-pad"
          autoComplete="tel"
          maxLength={30}
          error={errorFor('telefono')}
        />
        <AppTextField
          label="Cumpleaños (DD/MM)"
          value={form.cumpleanos}
          onChangeText={set('cumpleanos')}
          placeholder="15/03"
          keyboardType="numbers-and-punctuation"
          maxLength={5}
          error={errorFor('cumpleanos')}
        />
        <AppTextField
          label="Notas"
          value={form.notas}
          onChangeText={set('notas')}
          multiline
          maxLength={2000}
          error={errorFor('notas')}
        />

        {error && !error.field ? (
          <AppText variant="body" color="error" accessibilityLiveRegion="polite">
            {error.message}
          </AppText>
        ) : null}

        <AppButton label={busy ? 'Guardando…' : 'Guardar'} onPress={onSave} disabled={busy} />
        {whatsapp ? (
          <AppButton label="Escribir por WhatsApp" variant="tonal" onPress={onWhatsapp} />
        ) : null}
        {client ? (
          <AppButton
            label="Eliminar clienta"
            variant="outlined"
            onPress={onDelete}
            disabled={busy}
          />
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
