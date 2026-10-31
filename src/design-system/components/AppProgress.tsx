import { StyleSheet, View } from 'react-native';

import { useTheme } from '../theme';

type AppProgressProps = {
  /** Avance de 0 a 100. */
  value: number;
  /** `onPrimary` se dibuja sobre una tarjeta de color principal. */
  tone?: 'primary' | 'onPrimary';
};

/** Indicador de progreso lineal de Material 3. */
export function AppProgress({ value, tone = 'primary' }: AppProgressProps) {
  const { colors } = useTheme();
  const clamped = Math.min(100, Math.max(0, value));
  const fill = tone === 'onPrimary' ? colors.onPrimary : colors.primary;

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: clamped }}
      style={[styles.track, { backgroundColor: `${fill}4D` }]}
    >
      <View style={[styles.fill, { backgroundColor: fill, width: `${clamped}%` }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: { height: 4, borderRadius: 2, overflow: 'hidden' },
  fill: { height: 4, borderRadius: 2 },
});
