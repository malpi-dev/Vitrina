/** Mirrors the CSS variables in src/global.css (a test keeps both in sync). */
export const colors = {
  light: {
    primary: '#BB512B',
    onPrimary: '#FFFFFF',
    background: '#FAF7F2',
    surface: '#FFFFFF',
    surfaceMuted: '#F1ECE4',
    text: '#1E1A17',
    textMuted: '#6B625A',
    border: '#E4DDD3',
    success: '#2F7D4F',
    warning: '#A16B1B',
    info: '#2B6CB0',
    danger: '#B42318',
  },
  dark: {
    primary: '#E07A52',
    onPrimary: '#1A1411',
    background: '#14110F',
    surface: '#1F1A17',
    surfaceMuted: '#2A2420',
    text: '#F3EEE8',
    textMuted: '#A89E94',
    border: '#3A322C',
    success: '#5CB880',
    warning: '#E0A94A',
    info: '#6AA3E0',
    danger: '#F07167',
  },
} as const;

export type ThemeColors = { [K in keyof (typeof colors)['light']]: string };
export type ColorScheme = keyof typeof colors;
