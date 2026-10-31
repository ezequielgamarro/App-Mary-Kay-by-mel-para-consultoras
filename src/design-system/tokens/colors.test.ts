import { darkColors, lightColors, type ThemeColors } from './colors';

function luminance(hex: string): number {
  const channels = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const [r, g, b] = channels.map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
}

const AA_TEXT = 4.5;
const AA_NON_TEXT = 3;

const textPairs: [keyof ThemeColors, keyof ThemeColors][] = [
  ['onSurface', 'background'],
  ['onSurface', 'surface'],
  ['onSurface', 'surfaceVariant'],
  ['onSurfaceVariant', 'background'],
  ['onSurfaceVariant', 'surface'],
  ['onSurfaceVariant', 'surfaceVariant'],
  ['onPrimary', 'primary'],
  ['onPrimaryContainer', 'primaryContainer'],
  ['primary', 'background'],
  ['error', 'background'],
  ['error', 'surfaceVariant'],
  ['success', 'background'],
];

const nonTextPairs: [keyof ThemeColors, keyof ThemeColors][] = [['outline', 'background']];

describe.each([
  ['claro', lightColors],
  ['oscuro', darkColors],
])('contraste AA del tema %s', (_name, colors) => {
  it.each(textPairs)('texto %s sobre %s', (foreground, background) => {
    expect(contrast(colors[foreground], colors[background])).toBeGreaterThanOrEqual(AA_TEXT);
  });

  it.each(nonTextPairs)('elemento %s sobre %s', (foreground, background) => {
    expect(contrast(colors[foreground], colors[background])).toBeGreaterThanOrEqual(AA_NON_TEXT);
  });
});
