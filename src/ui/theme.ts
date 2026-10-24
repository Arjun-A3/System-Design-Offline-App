export type Palette = {
  bg: string;
  surface: string;
  surface2: string;
  ink: string;
  muted: string;
  line: string;
  accent: string;
  accentInk: string;
  warning: string;
  warningBg: string;
  danger: string;
  heat0: string;
  heat1: string;
  heat2: string;
  heat3: string;
  future: string;
};

export const palettes: Record<'light' | 'dark', Palette> = {
  light: {
    bg: '#F3F0E8',
    surface: '#FFFCF7',
    surface2: '#E7E1D6',
    ink: '#1C1915',
    muted: '#5E584E',
    line: '#D9D1C3',
    accent: '#0E6B52',
    accentInk: '#F3FBF7',
    warning: '#8A4B08',
    warningBg: '#F6E6CF',
    danger: '#8E2F2F',
    heat0: '#E4DDD2',
    heat1: '#9FCBB8',
    heat2: '#2F8F6E',
    heat3: '#0E6B52',
    future: '#F7F4EE',
  },
  dark: {
    bg: '#121614',
    surface: '#1C221F',
    surface2: '#2A332E',
    ink: '#E8E2D6',
    muted: '#A8A092',
    line: '#343C38',
    accent: '#3DBE9A',
    accentInk: '#06231A',
    warning: '#E2B15A',
    warningBg: '#3A2E1A',
    danger: '#F0A3A3',
    heat0: '#24302B',
    heat1: '#1E4D3E',
    heat2: '#1F7A5C',
    heat3: '#3DBE9A',
    future: '#1A201D',
  },
};

export function scaleFor(fontScale: 'compact' | 'default' | 'large'): number {
  if (fontScale === 'compact') return 0.92;
  if (fontScale === 'large') return 1.16;
  return 1;
}
