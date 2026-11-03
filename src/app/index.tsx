import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View, type NativeScrollEvent } from 'react-native';
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

// Datos de muestra para ver la identidad: no son cifras ni clientas reales.
const SAMPLE = {
  soldCents: 61230000,
  receivableCents: 18450000,
  stockCents: 124000000,
  goalPercent: 68,
  clients: [
    { name: 'Marta Giménez', note: 'Vencido hace 3 días', balanceCents: 6200000, overdue: true },
    { name: 'Lucía Paredes', note: 'Compró ayer', balanceCents: 3850000, overdue: false },
    { name: 'Romina Díaz', note: 'Vence el viernes', balanceCents: 980000, overdue: false },
    { name: 'Carla Soria', note: 'Vence el lunes', balanceCents: 2430000, overdue: false },
    { name: 'Ana Ferreyra', note: 'Pagó hoy', balanceCents: 0, overdue: false },
  ],
};

function isScrolled(event: NativeScrollEvent): boolean {
  return event.contentOffset.y > 0;
}

/** Pantalla provisoria: muestra la identidad nueva antes de construir los módulos reales. */
export default function Index() {
  const { colors } = useTheme();
  const router = useRouter();
  const [scrolled, setScrolled] = useState(false);

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.background }]}>
      <AppTopBar title="Bella Gestión" elevated={scrolled} />
      <ScrollView
        contentContainerStyle={styles.content}
        scrollEventThrottle={16}
        onScroll={(event) => setScrolled(isScrolled(event.nativeEvent))}
      >
        <AppCard tone="primary" style={styles.hero}>
          <AppText variant="label" color="onPrimary">
            Ventas del mes · datos de muestra
          </AppText>
          <AppText variant="numeric" color="onPrimary" numberOfLines={1} adjustsFontSizeToFit>
            {formatArs(SAMPLE.soldCents)}
          </AppText>
          <AppProgress value={SAMPLE.goalPercent} tone="onPrimary" />
          <AppText variant="body" color="onPrimary">
            {SAMPLE.goalPercent} % de la meta
          </AppText>
        </AppCard>

        <View style={styles.row}>
          <AppCard style={styles.half}>
            <AppText variant="label" color="onSurfaceVariant">
              Por cobrar
            </AppText>
            <AppText variant="title" numberOfLines={1} adjustsFontSizeToFit>
              {formatArs(SAMPLE.receivableCents)}
            </AppText>
          </AppCard>
          <AppCard style={styles.half}>
            <AppText variant="label" color="onSurfaceVariant">
              Stock
            </AppText>
            <AppText variant="title" numberOfLines={1} adjustsFontSizeToFit>
              {formatArs(SAMPLE.stockCents)}
            </AppText>
          </AppCard>
        </View>

        <View style={styles.sectionHeader}>
          <AppText variant="title">Productos</AppText>
          <AppButton label="Ver todos" variant="text" onPress={() => router.push('/productos')} />
        </View>

        <View style={styles.sectionHeader}>
          <AppText variant="title">Clientas</AppText>
          <AppButton label="Ver todas" variant="text" onPress={() => router.push('/clientas')} />
        </View>
        {SAMPLE.clients.map((client) => (
          <AppListItem
            key={client.name}
            title={client.name}
            supporting={client.note}
            supportingColor={client.overdue ? 'error' : 'onSurfaceVariant'}
            trailing={formatArs(client.balanceCents)}
            trailingColor={client.overdue ? 'error' : 'onSurface'}
            onPress={() => undefined}
          />
        ))}
        <AppButton label="Cerrar sesión" variant="outlined" onPress={() => void signOut()} />
      </ScrollView>

      <View style={styles.fab}>
        <AppFab label="Registrar venta" icon="add" onPress={() => undefined} />
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
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
  fab: { position: 'absolute', right: spacing.md, bottom: spacing.md },
});
