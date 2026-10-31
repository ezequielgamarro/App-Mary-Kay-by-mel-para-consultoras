import { useState } from 'react';
import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { useTheme } from '../theme';
import { minTouchTarget, radius, spacing } from '../tokens/spacing';
import { AppText } from './AppText';

type AppTextFieldProps = Omit<TextInputProps, 'style' | 'placeholderTextColor'> & {
  label: string;
  /** Mensaje de error; si existe, el campo se marca en rojo. */
  error?: string | null;
};

/** Campo de texto delineado de Material 3 con etiqueta fija arriba (legible con letra grande). */
export function AppTextField({ label, error, onFocus, onBlur, ...rest }: AppTextFieldProps) {
  const { colors } = useTheme();
  const [focused, setFocused] = useState(false);
  const borderColor = error ? colors.error : focused ? colors.primary : colors.outline;

  return (
    <View style={styles.wrapper}>
      <AppText variant="label" color={error ? 'error' : 'onSurfaceVariant'}>
        {label}
      </AppText>
      <TextInput
        {...rest}
        accessibilityLabel={label}
        placeholderTextColor={colors.onSurfaceVariant}
        onFocus={(event) => {
          setFocused(true);
          onFocus?.(event);
        }}
        onBlur={(event) => {
          setFocused(false);
          onBlur?.(event);
        }}
        style={[
          styles.input,
          {
            borderColor,
            borderWidth: focused || error ? 2 : 1,
            color: colors.onSurface,
            backgroundColor: colors.surface,
          },
        ]}
      />
      {error ? (
        <AppText variant="label" color="error" accessibilityLiveRegion="polite">
          {error}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: spacing.xs },
  input: {
    minHeight: minTouchTarget + 8,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    fontSize: 16,
  },
});
