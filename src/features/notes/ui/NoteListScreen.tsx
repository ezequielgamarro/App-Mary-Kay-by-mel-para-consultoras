import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { formatDateAr } from '@/core/date/dates';
import {
  AppNotice,
  AppButton,
  AppFab,
  AppListItem,
  AppText,
  AppTextField,
  AppTopBar,
  spacing,
  useTheme,
} from '@/design-system';

import { useNoteList } from '../application/useNotes';
import { filterNotes, notePreview } from '../domain/note';

/** Lista de notas con buscador; la última que se tocó aparece primero. */
export function NoteListScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { state, retry, refresh } = useNoteList();
  const [query, setQuery] = useState('');

  // Al volver de crear o editar, la lista se actualiza sin parpadeo.
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

  const goToNew = () => router.push('/notas/nueva');
  const notes = state.status === 'ready' ? filterNotes(state.data, query) : [];

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.background }]}>
      <AppTopBar title="Notas" />
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
          <AppText variant="title">Todavía no tenés notas</AppText>
          <AppText variant="body" color="onSurfaceVariant" style={styles.centerText}>
            Anotá ideas, datos de tus clientas o lo que no quieras olvidarte. Son solo tuyas.
          </AppText>
          <AppButton label="Nueva nota" onPress={goToNew} />
        </View>
      ) : null}

      {state.status === 'ready' && state.data.length > 0 ? (
        <FlatList
          data={notes}
          keyExtractor={(note) => note.id}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          ListHeaderComponent={
            <AppTextField
              label="Buscar en tus notas"
              value={query}
              onChangeText={setQuery}
              autoCapitalize="none"
            />
          }
          ListEmptyComponent={
            <AppText variant="body" color="onSurfaceVariant">
              No hay notas que coincidan con la búsqueda.
            </AppText>
          }
          renderItem={({ item }) => (
            <AppListItem
              title={item.titulo}
              supporting={notePreview(item) || 'Sin texto'}
              trailing={formatDateAr(item.updatedAt.slice(0, 10))}
              onPress={() => router.push(`/notas/${item.id}`)}
            />
          )}
        />
      ) : null}

      {state.status === 'ready' && state.data.length > 0 ? (
        <AppFab label="Nueva nota" icon="add" onPress={goToNew} />
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: spacing.md, gap: spacing.xs, paddingBottom: 120 },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    gap: spacing.md,
  },
  centerText: { textAlign: 'center' },
});
