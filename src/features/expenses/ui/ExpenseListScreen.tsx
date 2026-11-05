import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { formatDateAr, todayIso } from '@/core/date/dates';
import { formatArs } from '@/core/money/formatArs';
import { confirmDestructive } from '@/core/ui/confirm';
import {
  AppNotice,
  AppButton,
  AppCard,
  AppFab,
  AppListItem,
  AppText,
  AppTopBar,
  spacing,
  useTheme,
} from '@/design-system';

import { useExpenseActions, useExpenseList } from '../application/useExpenses';
import { categoryLabel, monthExpensesTotal } from '../domain/expense';

/** Gastos: total del mes y lista; tocar un gasto permite borrarlo. */
export function ExpenseListScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { state, retry, refresh } = useExpenseList();
  const { remove } = useExpenseActions();
  const [error, setError] = useState<string | null>(null);

  // Al volver de cargar un gasto, la lista se actualiza sin parpadeo.
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

  const goToNew = () => router.push('/gastos/nueva');

  async function onRemove(id: string, concepto: string) {
    const confirmed = await confirmDestructive(
      'Borrar gasto',
      `Se va a borrar «${concepto}». Esto no se puede deshacer.`,
      'Borrar',
    );
    if (!confirmed) return;
    setError(null);
    const result = await remove(id);
    if (result.ok) refresh();
    else setError(result.message);
  }

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.background }]}>
      <AppTopBar title="Gastos" />
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

      {state.status === 'ready' && state.data.length === 0 ? (
        <View style={styles.center}>
          <AppText variant="title">Todavía no cargaste gastos</AppText>
          <AppText variant="body" color="onSurfaceVariant" style={styles.centerText}>
            Anotá lo que gastás en transporte, publicidad o mercadería para saber cuánto te queda de
            verdad.
          </AppText>
          <AppButton label="Nuevo gasto" onPress={goToNew} />
        </View>
      ) : null}

      {state.status === 'ready' && state.data.length > 0 ? (
        <FlatList
          data={state.data}
          keyExtractor={(expense) => expense.id}
          contentContainerStyle={styles.content}
          ListHeaderComponent={
            <View style={styles.header}>
              <AppCard tone="tonal" style={styles.summary}>
                <AppText variant="label" color="onSurfaceVariant">
                  Gastado este mes
                </AppText>
                <AppText variant="numeric">
                  {formatArs(monthExpensesTotal(state.data, todayIso()))}
                </AppText>
              </AppCard>
              {error ? (
                <AppText variant="body" color="error" accessibilityLiveRegion="polite">
                  {error}
                </AppText>
              ) : null}
            </View>
          }
          renderItem={({ item }) => (
            <AppListItem
              title={item.concepto}
              supporting={`${formatDateAr(item.fecha)} · ${categoryLabel(item.categoria)}`}
              trailing={formatArs(item.montoCentavos)}
              onPress={() => void onRemove(item.id, item.concepto)}
            />
          )}
        />
      ) : null}

      {state.status === 'ready' && state.data.length > 0 ? (
        <AppFab label="Nuevo gasto" icon="add" onPress={goToNew} />
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: spacing.md, gap: spacing.xs, paddingBottom: 120 },
  header: { gap: spacing.sm, marginBottom: spacing.sm },
  summary: { gap: spacing.xs },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    gap: spacing.md,
  },
  centerText: { textAlign: 'center' },
});
