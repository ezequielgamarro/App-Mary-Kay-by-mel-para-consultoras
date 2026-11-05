import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { formatDateAr } from '@/core/date/dates';
import { confirmDestructive } from '@/core/ui/confirm';
import {
  AppNotice,
  AppButton,
  AppCard,
  AppFab,
  AppText,
  AppTopBar,
  minTouchTarget,
  spacing,
  useTheme,
} from '@/design-system';

import { useAgenda, useTaskActions } from '../application/useAgenda';
import { groupAgenda, type AgendaItem, type AgendaKind } from '../domain/agenda';

const KIND_LABEL: Record<AgendaKind, string> = {
  cobro: 'Cobro',
  tarea: 'Tarea',
  cumple: 'Cumpleaños',
};

/** Agenda: lo atrasado, lo de hoy y lo que viene en los próximos días. */
export function AgendaScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { state, retry, refresh } = useAgenda();
  const { complete, remove } = useTaskActions();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Al volver de crear una tarea, la agenda se actualiza sin parpadeo.
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

  function open(item: AgendaItem) {
    if (item.kind === 'cobro') router.push(`/ventas/${item.refId}`);
    else if (item.kind === 'cumple') router.push(`/clientas/${item.refId}`);
  }

  async function onComplete(item: AgendaItem) {
    if (busy) return;
    setBusy(true);
    setError(null);
    const result = await complete(item.refId);
    setBusy(false);
    if (result.ok) refresh();
    else setError(result.message);
  }

  async function onRemove(item: AgendaItem) {
    if (busy) return;
    const confirmed = await confirmDestructive(
      'Borrar tarea',
      `Se va a borrar «${item.titulo}».`,
      'Borrar',
    );
    if (!confirmed) return;
    setBusy(true);
    setError(null);
    const result = await remove(item.refId);
    setBusy(false);
    if (result.ok) refresh();
    else setError(result.message);
  }

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.background }]}>
      <AppTopBar title="Agenda" />
      {state.status === 'ready' && state.stale ? (
        <AppNotice message="Sin conexión: ves lo último que se guardó en este teléfono." />
      ) : null}

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

      {state.status === 'ready' ? (
        <ScrollView contentContainerStyle={styles.content}>
          {state.data.items.length === 0 ? (
            <View style={styles.empty}>
              <AppText variant="title">No tenés nada pendiente</AppText>
              <AppText variant="body" color="onSurfaceVariant" style={styles.centerText}>
                Acá vas a ver los cobros que vencen, los cumpleaños de tus clientas y las tareas que
                anotes para los próximos 14 días.
              </AppText>
            </View>
          ) : null}

          {error ? (
            <AppText variant="body" color="error" accessibilityLiveRegion="polite">
              {error}
            </AppText>
          ) : null}

          {groupAgenda(state.data.items, state.data.today).map((section) => (
            <View key={section.key} style={styles.section}>
              <AppText variant="title" color={section.key === 'atrasado' ? 'error' : 'onSurface'}>
                {section.title}
              </AppText>
              {section.items.map((item) => (
                <AppCard key={item.key} tone="tonal" style={styles.card}>
                  <Pressable
                    onPress={() => open(item)}
                    disabled={item.kind === 'tarea'}
                    accessibilityRole={item.kind === 'tarea' ? undefined : 'button'}
                    accessibilityLabel={`${KIND_LABEL[item.kind]}: ${item.titulo}, ${item.detalle}`}
                    style={styles.cardBody}
                  >
                    <AppText variant="label" color="onSurfaceVariant">
                      {KIND_LABEL[item.kind]} · {formatDateAr(item.fecha)}
                    </AppText>
                    <AppText variant="bodyStrong">{item.titulo}</AppText>
                    {item.kind !== 'tarea' ? (
                      <AppText variant="label" color="onSurfaceVariant">
                        {item.detalle}
                      </AppText>
                    ) : null}
                  </Pressable>
                  {item.kind === 'tarea' ? (
                    <View style={styles.actions}>
                      <AppButton
                        label="Hecha"
                        variant="tonal"
                        onPress={() => void onComplete(item)}
                        disabled={busy}
                      />
                      <AppButton
                        label="Borrar"
                        variant="text"
                        onPress={() => void onRemove(item)}
                        disabled={busy}
                      />
                    </View>
                  ) : null}
                </AppCard>
              ))}
            </View>
          ))}
        </ScrollView>
      ) : null}

      <AppFab label="Nueva tarea" icon="add" onPress={() => router.push('/agenda/nueva')} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: spacing.md, gap: spacing.lg, paddingBottom: 120 },
  section: { gap: spacing.sm },
  card: { gap: spacing.sm },
  cardBody: { minHeight: minTouchTarget, justifyContent: 'center', gap: spacing.xs },
  actions: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  empty: { alignItems: 'center', gap: spacing.md, paddingVertical: spacing.xl },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    gap: spacing.md,
  },
  centerText: { textAlign: 'center' },
});
