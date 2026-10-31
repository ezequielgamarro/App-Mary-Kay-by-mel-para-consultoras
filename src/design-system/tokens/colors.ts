/**
 * Paleta de «Bella Gestión»: roles de color de Material 3 con un rosa propio.
 * El rosa principal es provisorio y se cambia aquí, en un solo lugar.
 */
export const palette = {
  pink600: '#D6006E',
  pink100: '#FFD9EA',
  pink50: '#FBE9F1',
  pink25: '#FFF8FA',
  white: '#FFFFFF',
  ink900: '#231A1E',
  ink700: '#5B4651',
  ink400: '#85707A',
  rose200: '#E6D3DB',
  plum950: '#1D1317',
  plum900: '#251A1F',
  plum800: '#3A2A32',
  pinkDark300: '#FFB0D2',
  pinkDark900: '#5E0036',
  pinkDark700: '#8A0050',
  inkDark100: '#F1DFE5',
  inkDark300: '#D6C0C9',
  inkDark500: '#9E8891',
  red700: '#B3261E',
  green700: '#1B6B3A',
  redDark300: '#FFB4AB',
  greenDark300: '#7DD99A',
} as const;

export type ThemeColors = {
  background: string;
  surface: string;
  surfaceVariant: string;
  outline: string;
  outlineVariant: string;
  onSurface: string;
  onSurfaceVariant: string;
  primary: string;
  onPrimary: string;
  primaryContainer: string;
  onPrimaryContainer: string;
  error: string;
  success: string;
};

export const lightColors: ThemeColors = {
  background: palette.pink25,
  surface: palette.white,
  surfaceVariant: palette.pink50,
  outline: palette.ink400,
  outlineVariant: palette.rose200,
  onSurface: palette.ink900,
  onSurfaceVariant: palette.ink700,
  primary: palette.pink600,
  onPrimary: palette.white,
  primaryContainer: palette.pink100,
  onPrimaryContainer: '#3A0A24',
  error: palette.red700,
  success: palette.green700,
};

export const darkColors: ThemeColors = {
  background: palette.plum950,
  surface: palette.plum900,
  surfaceVariant: palette.plum800,
  outline: palette.inkDark500,
  outlineVariant: '#4A3A42',
  onSurface: palette.inkDark100,
  onSurfaceVariant: palette.inkDark300,
  primary: palette.pinkDark300,
  onPrimary: palette.pinkDark900,
  primaryContainer: palette.pinkDark700,
  onPrimaryContainer: palette.pink100,
  error: palette.redDark300,
  success: palette.greenDark300,
};
