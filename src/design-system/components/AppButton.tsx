import { Pressable, StyleSheet, type PressableProps } from 'react-native';

import { useTheme } from '../theme';
import { minTouchTarget, radius, spacing } from '../tokens/spacing';
import { AppText, type AppTextColor } from './AppText';

type ButtonVariant = 'filled' | 'tonal' | 'outlined' | 'text';

type AppButtonProps = Omit<PressableProps, 'children' | 'style'> & {
  label: string;
  variant?: ButtonVariant;
};

export function AppButton({ label, variant = 'filled', disabled, ...rest }: AppButtonProps) {
  const { colors } = useTheme();

  const look: Record<
    ButtonVariant,
    { background: string; border: string; text: AppTextColor; ripple: string }
  > = {
    filled: {
      background: colors.primary,
      border: 'transparent',
      text: 'onPrimary',
      ripple: `${colors.onPrimary}33`,
    },
    tonal: {
      background: colors.primaryContainer,
      border: 'transparent',
      text: 'onPrimaryContainer',
      ripple: `${colors.onPrimaryContainer}22`,
    },
    outlined: {
      background: 'transparent',
      border: colors.outline,
      text: 'primary',
      ripple: `${colors.primary}22`,
    },
    text: {
      background: 'transparent',
      border: 'transparent',
      text: 'primary',
      ripple: `${colors.primary}22`,
    },
  };
  const current = look[variant];

  return (
    <Pressable
      {...rest}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      android_ripple={{ color: current.ripple }}
      style={({ pressed }) => [
        styles.base,
        { backgroundColor: current.background, borderColor: current.border },
        { opacity: disabled ? 0.5 : pressed ? 0.9 : 1 },
      ]}
    >
      <AppText variant="bodyStrong" color={current.text}>
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: minTouchTarget,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
});
