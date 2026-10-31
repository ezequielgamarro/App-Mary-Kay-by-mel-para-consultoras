import { StyleSheet, View } from 'react-native';

import { useTheme } from '../theme';
import { spacing } from '../tokens/spacing';
import { AppText } from './AppText';

type AppTopBarProps = {
  title: string;
  /** Eleva la barra con un tono de superficie cuando el contenido se desplaza por debajo. */
  elevated?: boolean;
};

/** Barra superior de Material 3: 64 dp de alto y título de 22 sp. */
export function AppTopBar({ title, elevated = false }: AppTopBarProps) {
  const { colors } = useTheme();

  return (
    <View
      style={[
        styles.bar,
        { backgroundColor: elevated ? colors.surfaceVariant : colors.background },
      ]}
    >
      <AppText variant="headline" accessibilityRole="header" style={styles.title}>
        {title}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    height: 64,
    paddingHorizontal: spacing.md,
    justifyContent: 'center',
  },
  title: { fontSize: 22, lineHeight: 28 },
});
