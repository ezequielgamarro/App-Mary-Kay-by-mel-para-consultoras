import { Text, type TextProps } from 'react-native';

import { useTheme } from '../theme';
import type { ThemeColors } from '../tokens/colors';
import { textVariants, type TextVariant } from '../tokens/typography';

export type AppTextColor = keyof Pick<
  ThemeColors,
  | 'onSurface'
  | 'onSurfaceVariant'
  | 'primary'
  | 'onPrimary'
  | 'onPrimaryContainer'
  | 'error'
  | 'success'
>;

type AppTextProps = TextProps & {
  variant?: TextVariant;
  color?: AppTextColor;
};

export function AppText({ variant = 'body', color = 'onSurface', style, ...rest }: AppTextProps) {
  const { colors } = useTheme();
  return <Text {...rest} style={[textVariants[variant], { color: colors[color] }, style]} />;
}
