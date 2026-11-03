import { Image } from 'expo-image';
import { Pressable, StyleSheet, View } from 'react-native';

import { useTheme } from '../theme';
import { minTouchTarget, spacing } from '../tokens/spacing';
import { AppText, type AppTextColor } from './AppText';

type AppListItemProps = {
  title: string;
  supporting: string;
  trailing?: string;
  supportingColor?: AppTextColor;
  trailingColor?: AppTextColor;
  /** Foto que reemplaza a las iniciales en el avatar (por ejemplo, la de un producto). */
  imageUri?: string;
  onPress?: () => void;
};

function initials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');
}

/** Fila de lista de Material 3 con avatar de iniciales, dos líneas de texto y un valor a la derecha. */
export function AppListItem({
  title,
  supporting,
  trailing,
  supportingColor = 'onSurfaceVariant',
  trailingColor = 'onSurface',
  imageUri,
  onPress,
}: AppListItemProps) {
  const { colors } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={[title, supporting, trailing].filter(Boolean).join(', ')}
      android_ripple={{ color: `${colors.primary}22` }}
      style={styles.row}
    >
      <View style={[styles.avatar, { backgroundColor: colors.primaryContainer }]}>
        {imageUri ? (
          <Image source={{ uri: imageUri }} style={styles.avatarImage} contentFit="cover" />
        ) : (
          <AppText variant="bodyStrong" color="onPrimaryContainer">
            {initials(title)}
          </AppText>
        )}
      </View>
      <View style={styles.texts}>
        <AppText variant="body" numberOfLines={1}>
          {title}
        </AppText>
        <AppText variant="label" color={supportingColor} numberOfLines={1}>
          {supporting}
        </AppText>
      </View>
      {trailing ? (
        <AppText
          variant="bodyStrong"
          color={trailingColor}
          numberOfLines={1}
          style={styles.trailing}
        >
          {trailing}
        </AppText>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: minTouchTarget + 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  avatar: {
    width: minTouchTarget - 8,
    height: minTouchTarget - 8,
    borderRadius: (minTouchTarget - 8) / 2,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: { width: minTouchTarget - 8, height: minTouchTarget - 8 },
  texts: { flex: 1 },
  trailing: { fontVariant: ['tabular-nums'] },
});
