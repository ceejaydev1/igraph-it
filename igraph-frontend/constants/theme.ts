import { Platform } from 'react-native';

// ─── COLORS ──────────────────────────────────────────────────────────────────

export const COLORS = {
  // Primary
  primary: '#4c6fff',
  primaryLight: '#eef2ff',
  primaryDark: '#3b4fcc',
  primaryHover: '#3b5de7',
  
  // Secondary
  secondary: '#8b5cf6',
  secondaryLight: '#ede9fe',
  secondaryDark: '#7c3aed',
  
  // Success
  success: '#10b981',
  successLight: '#d1fae5',
  successDark: '#059669',
  
  // Warning
  warning: '#f59e0b',
  warningLight: '#fef3c7',
  warningDark: '#d97706',
  
  // Danger
  danger: '#ef4444',
  dangerLight: '#fee2e2',
  dangerDark: '#dc2626',
  
  // Info
  info: '#3b82f6',
  infoLight: '#dbeafe',
  infoDark: '#2563eb',
  
  // Grays
  gray50: '#f8fafc',
  gray100: '#f1f5f9',
  gray200: '#e2e8f0',
  gray300: '#cbd5e1',
  gray400: '#94a3b8',
  gray500: '#64748b',
  gray600: '#475569',
  gray700: '#334155',
  gray800: '#1e293b',
  gray900: '#0f172a',
  
  // Neutrals
  white: '#ffffff',
  black: '#000000',
  transparent: 'transparent',
  
  // Overlays
  overlay: 'rgba(0, 0, 0, 0.5)',
  overlayLight: 'rgba(0, 0, 0, 0.2)',
  overlayDark: 'rgba(0, 0, 0, 0.7)',
  
  // Backgrounds
  background: '#f8faff',
  surface: '#ffffff',
  surfaceHover: '#f8fafc',
  
  // Borders
  border: '#e2e8f0',
  borderLight: '#f1f5f9',
  borderDark: '#cbd5e1',
  
  // Text
  textPrimary: '#0f172a',
  textSecondary: '#475569',
  textTertiary: '#94a3b8',
  textInverse: '#ffffff',
};

// ─── SPACING ──────────────────────────────────────────────────────────────────

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  xxxxl: 40,
  huge: 48,
  massive: 64,
} as const;

// ─── BORDER RADIUS ───────────────────────────────────────────────────────────

export const RADIUS = {
  none: 0,
  sm: 6,
  md: 8,
  lg: 10,
  xl: 12,
  xxl: 16,
  xxxl: 20,
  xxxxl: 24,
  full: 999,
} as const;

// ─── TYPOGRAPHY ──────────────────────────────────────────────────────────────

export const TYPOGRAPHY = {
  // Headings
  h1: {
    fontSize: 32,
    fontWeight: '800' as const,
    letterSpacing: -0.5,
    lineHeight: 40,
  },
  h2: {
    fontSize: 28,
    fontWeight: '700' as const,
    letterSpacing: -0.3,
    lineHeight: 36,
  },
  h3: {
    fontSize: 24,
    fontWeight: '700' as const,
    letterSpacing: -0.2,
    lineHeight: 32,
  },
  h4: {
    fontSize: 20,
    fontWeight: '600' as const,
    letterSpacing: -0.1,
    lineHeight: 28,
  },
  h5: {
    fontSize: 18,
    fontWeight: '600' as const,
    lineHeight: 24,
  },
  h6: {
    fontSize: 16,
    fontWeight: '600' as const,
    lineHeight: 22,
  },
  
  // Body
  body: {
    fontSize: 16,
    fontWeight: '400' as const,
    lineHeight: 24,
  },
  bodyBold: {
    fontSize: 16,
    fontWeight: '600' as const,
    lineHeight: 24,
  },
  bodyLarge: {
    fontSize: 18,
    fontWeight: '400' as const,
    lineHeight: 28,
  },
  bodySmall: {
    fontSize: 14,
    fontWeight: '400' as const,
    lineHeight: 20,
  },
  
  // Captions
  caption: {
    fontSize: 14,
    fontWeight: '400' as const,
    lineHeight: 20,
  },
  captionBold: {
    fontSize: 14,
    fontWeight: '600' as const,
    lineHeight: 20,
  },
  
  // Labels
  label: {
    fontSize: 12,
    fontWeight: '500' as const,
    lineHeight: 16,
    letterSpacing: 0.3,
    textTransform: 'uppercase' as const,
  },
  labelSmall: {
    fontSize: 10,
    fontWeight: '600' as const,
    lineHeight: 14,
    letterSpacing: 0.5,
    textTransform: 'uppercase' as const,
  },
  
  // Buttons
  button: {
    fontSize: 16,
    fontWeight: '600' as const,
    lineHeight: 20,
  },
  buttonSmall: {
    fontSize: 14,
    fontWeight: '600' as const,
    lineHeight: 18,
  },
  
  // Code
  code: {
    fontSize: 14,
    fontWeight: '400' as const,
    fontFamily: Platform.select({
      ios: 'ui-monospace',
      android: 'monospace',
      web: 'SFMono-Regular, Menlo, Monaco, Consolas, monospace',
    }),
    lineHeight: 20,
  },
} as const;

// ─── SHADOWS ─────────────────────────────────────────────────────────────────

export const SHADOWS = {
  none: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  sm: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  md: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  lg: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 5,
  },
  xl: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 8,
  },
  xxl: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.16,
    shadowRadius: 32,
    elevation: 12,
  },
  // Primary color shadow (for buttons)
  primary: {
    shadowColor: '#4c6fff',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  // Success color shadow
  success: {
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  // Danger color shadow
  danger: {
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
} as const;

// ─── FONTS ──────────────────────────────────────────────────────────────────

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  android: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});

// ─── Z-INDEX ─────────────────────────────────────────────────────────────────

export const Z_INDEX = {
  base: 0,
  content: 1,
  overlay: 10,
  dropdown: 20,
  sticky: 30,
  modal: 40,
  tooltip: 50,
  notification: 60,
  max: 999,
} as const;

// ─── BREAKPOINTS ─────────────────────────────────────────────────────────────

export const BREAKPOINTS = {
  mobile: 480,
  tablet: 768,
  desktop: 1024,
  wide: 1280,
} as const;

// ─── DURATIONS ──────────────────────────────────────────────────────────────

export const DURATIONS = {
  instant: 0,
  fast: 150,
  normal: 300,
  slow: 500,
  slower: 800,
} as const;

// ─── OPACITY ─────────────────────────────────────────────────────────────────

export const OPACITY = {
  disabled: 0.4,
  hover: 0.8,
  active: 0.9,
  inactive: 0.6,
} as const;

// ─── COMPATIBILITY EXPORTS (for existing code) ─────────────────────────────

// Legacy Colors export for backward compatibility
export const Colors = {
  light: {
    text: COLORS.textPrimary,
    background: COLORS.white,
    tint: COLORS.primary,
    icon: COLORS.gray400,
    tabIconDefault: COLORS.gray400,
    tabIconSelected: COLORS.primary,
  },
  dark: {
    text: '#ECEDEE',
    background: '#151718',
    tint: '#fff',
    icon: '#9BA1A6',
    tabIconDefault: '#9BA1A6',
    tabIconSelected: '#fff',
  },
};

// ─── THEME HOOK HELPER ──────────────────────────────────────────────────────

export const getThemeColor = (
  colorName: keyof typeof COLORS,
  variant?: 'light' | 'dark'
): string => {
  // If variant is specified, use Colors object
  if (variant && Colors[variant]) {
    const colorMap = {
      text: Colors[variant].text,
      background: Colors[variant].background,
      tint: Colors[variant].tint,
      icon: Colors[variant].icon,
    };
    // @ts-ignore - dynamic access
    return colorMap[colorName] || COLORS[colorName] || COLORS.gray500;
  }
  // Otherwise return from COLORS
  return COLORS[colorName] || COLORS.gray500;
};