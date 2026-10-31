import { useColorScheme } from 'react-native';

import { darkColors, lightColors, type ThemeColors } from './tokens/colors';

export type Theme = { scheme: 'light' | 'dark'; colors: ThemeColors };

export const lightTheme: Theme = { scheme: 'light', colors: lightColors };
export const darkTheme: Theme = { scheme: 'dark', colors: darkColors };

export function useTheme(): Theme {
  return useColorScheme() === 'dark' ? darkTheme : lightTheme;
}
