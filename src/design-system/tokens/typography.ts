import type { TextStyle } from 'react-native';

/**
 * Escala tipográfica de Material 3 con la fuente del sistema (Roboto en Android).
 * Sin fuentes propias: el texto sigue el tamaño de letra que configure la usuaria.
 */
export type TextVariant =
  'display' | 'headline' | 'title' | 'body' | 'bodyStrong' | 'label' | 'numeric';

export const textVariants: Record<TextVariant, TextStyle> = {
  display: { fontSize: 36, lineHeight: 44, fontWeight: '400' },
  headline: { fontSize: 24, lineHeight: 32, fontWeight: '500' },
  title: { fontSize: 18, lineHeight: 24, fontWeight: '500' },
  body: { fontSize: 16, lineHeight: 24, fontWeight: '400' },
  bodyStrong: { fontSize: 16, lineHeight: 24, fontWeight: '500' },
  label: { fontSize: 12, lineHeight: 16, fontWeight: '500', letterSpacing: 0.5 },
  numeric: { fontSize: 36, lineHeight: 44, fontWeight: '500', fontVariant: ['tabular-nums'] },
};
