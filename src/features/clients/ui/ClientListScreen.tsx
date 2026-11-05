import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

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

import { useClientList } from '../application/useClients';
import { filterClients } from '../domain/client';

export function ClientListScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { state, retry, refresh } = useClientList();
  const [query, setQuery] = useState('');

  // Al volver de crear o editar, se actualiza la lista sin parpadeo (la primera carga ya la hace el hook).
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

  const goToNew = () => router.push('/clientas/nueva');

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.background }]}>
      <AppTopBar title="Clientas" />
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
          <AppText variant="title">Todavía no cargaste clientas</AppText>
          <AppText variant="body" color="onSurfaceVariant" style={styles.centerText}>
            Agregá a tu primera clienta para llevar sus pedidos y cobros.
          </AppText>
          <AppButton label="Agregar clienta" onPress={goToNew} />
        </View>
      ) : null}

      {state.status === 'ready' && state.data.length > 0 ? (
        <FlatList
          data={filterClients(state.data, query)}
          keyExtractor={(client) => client.id}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          ListHeaderComponent={
            <AppTextField
              label="Buscar"
              value={query}
              onChangeText={setQuery}
              placeholder="Nombre o teléfono"
              autoCapitalize="none"
              returnKeyType="search"
            />
          }
          ListEmptyComponent={
            <AppText variant="body" color="onSurfaceVariant" style={styles.centerText}>
              No hay clientas que coincidan con la búsqueda.
            </AppText>
          }
          renderItem={({ item }) => (
            <AppListItem
              title={item.nombre}
              supporting={item.telefono ?? 'Sin teléfono'}
              onPress={() => router.push(`/clientas/${item.id}`)}
            />
          )}
        />
      ) : null}

      {state.status === 'ready' && state.data.length > 0 ? (
        <AppFab label="Nueva clienta" icon="person-add" onPress={goToNew} />
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
