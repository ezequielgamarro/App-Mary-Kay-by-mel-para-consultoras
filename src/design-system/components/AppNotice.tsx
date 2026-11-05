import { StyleSheet, View } from 'react-native';

import { useTheme } from '../theme';
import { radius, spacing } from '../tokens/spacing';
import { AppText } from './AppText';

type AppNoticeProps = { message: string };

/** Aviso breve y discreto sobre el estado de lo que se está viendo (por ejemplo, sin conexión). */
export function AppNotice({ message }: AppNoticeProps) {
  const { colors } = useTheme();
  return (
    <View
      accessibilityRole="alert"
      style={[styles.notice, { backgroundColor: colors.surfaceVariant }]}
    >
      <AppText variant="label" color="onSurfaceVariant">
        {message}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  notice: {
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
  },
});
