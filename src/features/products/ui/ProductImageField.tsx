import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { AppButton, AppText, radius, spacing, useTheme } from '@/design-system';

import type { ImageChange } from '../domain/product';

type Props = {
  /** URL firmada de la foto que ya tiene el producto (null si no tiene o aún no cargó). */
  currentUrl: string | null;
  change: ImageChange;
  error: string | null;
  disabled?: boolean;
  onPickGallery: () => void;
  onPickCamera: () => void;
  onRemove: () => void;
};

const SIZE = 168;

/** Foto de referencia del producto: vista previa y acciones para elegir, sacar o quitar. */
export function ProductImageField({
  currentUrl,
  change,
  error,
  disabled,
  onPickGallery,
  onPickCamera,
  onRemove,
}: Props) {
  const { colors } = useTheme();

  const uri =
    change.type === 'replace' ? change.localUri : change.type === 'keep' ? currentUrl : null;

  return (
    <View style={styles.wrapper}>
      <AppText variant="label" color="onSurfaceVariant">
        Foto de referencia (opcional)
      </AppText>

      <View style={[styles.preview, { backgroundColor: colors.surfaceVariant }]}>
        {uri ? (
          <Image
            source={{ uri }}
            style={styles.image}
            contentFit="cover"
            accessibilityLabel="Foto de referencia del producto"
          />
        ) : (
          <MaterialIcons name="image" size={48} color={colors.onSurfaceVariant} />
        )}
      </View>

      <View style={styles.actions}>
        <AppButton
          label={uri ? 'Cambiar desde galería' : 'Elegir de la galería'}
          variant="tonal"
          onPress={onPickGallery}
          disabled={disabled}
        />
        <AppButton
          label="Sacar foto"
          variant="outlined"
          onPress={onPickCamera}
          disabled={disabled}
        />
        {uri ? (
          <AppButton label="Quitar foto" variant="text" onPress={onRemove} disabled={disabled} />
        ) : null}
      </View>

      {error ? (
        <AppText variant="label" color="error" accessibilityLiveRegion="polite">
          {error}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: spacing.sm },
  preview: {
    width: SIZE,
    height: SIZE,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    alignSelf: 'center',
  },
  image: { width: SIZE, height: SIZE },
  actions: { gap: spacing.sm },
});
