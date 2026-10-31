import { StyleSheet, View, type ViewProps } from 'react-native';

import { useTheme } from '../theme';
import { radius, spacing } from '../tokens/spacing';

type AppCardProps = ViewProps & {
  /** `primary` destaca la cifra principal; `tonal` es la tarjeta común; `surface` es neutra. */
  tone?: 'primary' | 'tonal' | 'surface';
};

export function AppCard({ tone = 'tonal', style, ...rest }: AppCardProps) {
  const { colors } = useTheme();
  const background = {
    primary: colors.primary,
    tonal: colors.surfaceVariant,
    surface: colors.surface,
  }[tone];

  return (
    <View
      {...rest}
      style={[
        styles.card,
        { backgroundColor: background },
        tone === 'surface' && { borderWidth: 1, borderColor: colors.outlineVariant },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  card: {
    padding: spacing.md,
    borderRadius: radius.md,
  },
});
