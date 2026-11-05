import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, type PressableProps } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTheme } from '../theme';
import { minTouchTarget, radius, spacing } from '../tokens/spacing';
import { AppText } from './AppText';

type AppFabProps = Omit<PressableProps, 'children' | 'style'> & {
  label: string;
  icon: ComponentProps<typeof MaterialIcons>['name'];
};

/**
 * Botón de acción flotante extendido de Material 3: una sola acción principal por pantalla.
 * Se ancla solo abajo a la derecha y deja libre la barra de navegación del sistema.
 */
export function AppFab({ label, icon, ...rest }: AppFabProps) {
  const { colors } = useTheme();

  return (
    <SafeAreaView edges={['bottom']} pointerEvents="box-none" style={styles.anchor}>
      <Pressable
        {...rest}
        accessibilityRole="button"
        android_ripple={{ color: `${colors.onPrimary}33` }}
        style={[styles.fab, { backgroundColor: colors.primary }]}
      >
        <MaterialIcons name={icon} size={24} color={colors.onPrimary} />
        <AppText variant="bodyStrong" color="onPrimary">
          {label}
        </AppText>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  anchor: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'flex-end',
    paddingRight: spacing.md,
    paddingBottom: spacing.md,
  },
  fab: {
    height: minTouchTarget + 8,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    overflow: 'hidden',
    elevation: 6,
  },
});
