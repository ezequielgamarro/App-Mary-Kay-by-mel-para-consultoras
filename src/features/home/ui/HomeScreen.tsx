import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  View,
  type NativeScrollEvent,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { signOut } from '@/core/auth/actions';
import { formatArs } from '@/core/money/formatArs';
import {
  AppButton,
  AppCard,
  AppFab,
  AppListItem,
  AppProgress,
  AppText,
  AppTopBar,
  spacing,
  useTheme,
} from '@/design-system';

import { useHomeSummary } from '../application/useHomeSummary';
import type { HomeSummary } from '../domain/homeSummary';

function isScrolled(event: NativeScrollEvent): boolean {
  return event.contentOffset.y > 0;
}

function stockAlert(summary: HomeSummary): string | null {
  const parts: string[] = [];
  if (summary.productosSinStock > 0) parts.push(`${summary.productosSinStock} sin stock`);
  if (summary.productosStockBajo > 0) parts.push(`${summary.productosStockBajo} con stock bajo`);
  return parts.length > 0 ? parts.join(' · ') : null;
}

/** Inicio: cifras reales del mes, lo que falta cobrar y las clientas con saldo. */
export function HomeScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { state, retry, refresh } = useHomeSummary();
  const [scrolled, setScrolled] = useState(false);

  // Al volver de registrar una venta o un cobro, las cifras se actualizan sin parpadeo.
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

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.background }]}>
      <AppTopBar title="Bella Gestión" elevated={scrolled} />
      <ScrollView
        contentContainerStyle={styles.content}
        scrollEventThrottle={16}
        onScroll={(event) => setScrolled(isScrolled(event.nativeEvent))}
      >
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
          <>
            <AppCard tone="primary" style={styles.hero}>
              <AppText variant="label" color="onPrimary">
                Vendido este mes
              </AppText>
              <AppText variant="numeric" color="onPrimary" numberOfLines={1} adjustsFontSizeToFit>
                {formatArs(state.data.vendidoMesCentavos)}
              </AppText>
              <AppText variant="body" color="onPrimary">
                {state.data.ventasMes === 1 ? '1 venta' : `${state.data.ventasMes} ventas`} ·
                ganancia {formatArs(state.data.gananciaMesCentavos)}
              </AppText>
              {state.data.meta ? (
                <>
                  <AppProgress value={state.data.meta.ventasPct} tone="onPrimary" />
                  <AppText variant="body" color="onPrimary">
                    {state.data.meta.ventasPct} % de tu meta de{' '}
                    {formatArs(state.data.meta.ventasMetaCentavos)}
                  </AppText>
                  {state.data.meta.gananciaPct !== null &&
                  state.data.meta.gananciaMetaCentavos !== null ? (
                    <AppText variant="label" color="onPrimary">
                      Ganancia: {state.data.meta.gananciaPct} % de{' '}
                      {formatArs(state.data.meta.gananciaMetaCentavos)}
                    </AppText>
                  ) : null}
                </>
              ) : null}
              <AppButton
                label={state.data.meta ? 'Cambiar meta' : 'Definir meta del mes'}
                variant="tonal"
                onPress={() => router.push('/metas')}
              />
            </AppCard>

            <View style={styles.row}>
              <AppCard style={styles.half}>
                <AppText variant="label" color="onSurfaceVariant">
                  Por cobrar
                </AppText>
                <AppText variant="title" numberOfLines={1} adjustsFontSizeToFit>
                  {formatArs(state.data.porCobrarCentavos)}
                </AppText>
              </AppCard>
              <AppCard style={styles.half}>
                <AppText variant="label" color="onSurfaceVariant">
                  Stock al costo
                </AppText>
                <AppText variant="title" numberOfLines={1} adjustsFontSizeToFit>
                  {formatArs(state.data.valorStockCentavos)}
                </AppText>
              </AppCard>
            </View>

            {stockAlert(state.data) ? (
              <AppText variant="label" color="error">
                Atención en productos: {stockAlert(state.data)}
              </AppText>
            ) : null}

            <View style={styles.sectionHeader}>
              <AppText variant="title">Clientas con saldo</AppText>
              <AppButton
                label="Ver clientas"
                variant="text"
                onPress={() => router.push('/clientas')}
              />
            </View>
            {state.data.deudoras.length === 0 ? (
              <AppText variant="body" color="onSurfaceVariant">
                Nadie te debe nada por ahora.
              </AppText>
            ) : null}
            {state.data.deudoras.map((debtor) => (
              <AppListItem
                key={debtor.clientId}
                title={debtor.nombre}
                supporting={debtor.nota}
                supportingColor={debtor.vencida ? 'error' : 'onSurfaceVariant'}
                trailing={formatArs(debtor.saldoCentavos)}
                trailingColor={debtor.vencida ? 'error' : 'onSurface'}
                onPress={() => router.push(`/clientas/${debtor.clientId}`)}
              />
            ))}
          </>
        ) : null}

        <View style={styles.sectionHeader}>
          <AppText variant="title">Equipo</AppText>
          <AppButton label="Ver equipo" variant="text" onPress={() => router.push('/equipo')} />
        </View>
        <View style={styles.sectionHeader}>
          <AppText variant="title">Agenda</AppText>
          <AppButton label="Ver agenda" variant="text" onPress={() => router.push('/agenda')} />
        </View>
        <View style={styles.sectionHeader}>
          <AppText variant="title">Ventas</AppText>
          <AppButton label="Ver todas" variant="text" onPress={() => router.push('/ventas')} />
        </View>
        <View style={styles.sectionHeader}>
          <AppText variant="title">Productos</AppText>
          <AppButton label="Ver todos" variant="text" onPress={() => router.push('/productos')} />
        </View>
        <View style={styles.sectionHeader}>
          <AppText variant="title">Clientas</AppText>
          <AppButton label="Ver todas" variant="text" onPress={() => router.push('/clientas')} />
        </View>

        <AppButton label="Cerrar sesión" variant="outlined" onPress={() => void signOut()} />
      </ScrollView>

      <View style={styles.fab}>
        <AppFab label="Registrar venta" icon="add" onPress={() => router.push('/ventas/nueva')} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: spacing.md, gap: spacing.md, paddingBottom: 120 },
  hero: { gap: spacing.sm },
  row: { flexDirection: 'row', gap: spacing.md },
  half: { flex: 1, gap: spacing.xs },
  center: { alignItems: 'center', padding: spacing.lg, gap: spacing.md },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
  fab: { position: 'absolute', right: spacing.md, bottom: spacing.md },
});
