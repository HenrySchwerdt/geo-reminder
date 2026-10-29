import tokens from '@worktime/design-tokens';
import { useColorScheme } from 'react-native';

type ColorName = keyof typeof tokens.color;
export type Palette = Record<ColorName, string>;

const build = (mode: 'light' | 'dark') =>
  Object.fromEntries(Object.entries(tokens.color).map(([k, v]) => [k, v[mode]])) as Palette;

export const palettes = { light: build('light'), dark: build('dark') };

export function useColors(): Palette {
  return palettes[useColorScheme() === 'dark' ? 'dark' : 'light'];
}

export const space = tokens.spacing;
export const radius = tokens.radius;

/** Text styles from the design system; the system font (SF Pro / Roboto) replaces the Inter stand-ins. */
export const type = {
  timer: { fontSize: 64, lineHeight: 68, fontWeight: '600', letterSpacing: -1.3, fontVariant: ['tabular-nums'] },
  largeTitle: { fontSize: 34, lineHeight: 41, fontWeight: '700' },
  title1: { fontSize: 28, lineHeight: 34, fontWeight: '700' },
  title2: { fontSize: 22, lineHeight: 28, fontWeight: '600' },
  title3: { fontSize: 20, lineHeight: 25, fontWeight: '600' },
  headline: { fontSize: 17, lineHeight: 22, fontWeight: '600' },
  body: { fontSize: 17, lineHeight: 22, fontWeight: '400' },
  callout: { fontSize: 16, lineHeight: 21, fontWeight: '400' },
  subhead: { fontSize: 15, lineHeight: 20, fontWeight: '400' },
  subheadStrong: { fontSize: 15, lineHeight: 20, fontWeight: '600' },
  footnote: { fontSize: 13, lineHeight: 18, fontWeight: '400' },
  footnoteStrong: { fontSize: 13, lineHeight: 18, fontWeight: '600' },
  caption: { fontSize: 12, lineHeight: 16, fontWeight: '500' },
  captionUpper: { fontSize: 12, lineHeight: 16, fontWeight: '600', letterSpacing: 0.5, textTransform: 'uppercase' },
  numericLarge: { fontSize: 28, lineHeight: 32, fontWeight: '600', fontVariant: ['tabular-nums'] },
  numericMedium: { fontSize: 20, lineHeight: 24, fontWeight: '600', fontVariant: ['tabular-nums'] },
  numericSmall: { fontSize: 15, lineHeight: 20, fontWeight: '500', fontVariant: ['tabular-nums'] },
} as const;

export type TypeName = keyof typeof type;
