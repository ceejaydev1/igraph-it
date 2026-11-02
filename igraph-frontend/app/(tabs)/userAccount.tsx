import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Modal,
  Platform,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Keyboard,
  Animated,
  RefreshControl,
  Pressable,
  useWindowDimensions,
  LayoutAnimation,
  UIManager,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Svg, Path, Circle, Rect } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, signOut as firebaseSignOut, GoogleAuthProvider, signInWithPopup, Auth } from 'firebase/auth';
import * as authService from '../../services/authService';
import { useSave } from '../../contexts/SaveContext';
import { useNotes } from '../../contexts/NotesContext';
import { useOnboardingTour } from '../../hooks/useOnboardingTour';
import { usePullToRefreshWeb } from '../../hooks/usePullToRefreshWeb';
import { ACCOUNT_TOUR_ID, getAccountTourSteps } from '../../utils/tours';
import { PullToRefreshIndicator } from '../../components/PullToRefreshIndicator';
import { usePageTitle } from '../../utils/usePageTitle';

// authService.logout() only clears iGraph IT's own tokens/session — it can't
// touch Google's own browser session, but it should at least drop Firebase's
// *local* cached credential so this tab stops acting as if that Google
// account is still connected. Same lazy init pattern as the auth screens.
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

let firebaseAuth: Auth | undefined;
if (Platform.OS === 'web' && typeof window !== 'undefined') {
  try {
    const app: FirebaseApp = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
    firebaseAuth = getAuth(app);
  } catch (e: any) {
    console.error('[Firebase] Init error:', e.message);
  }
}

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// DESIGN SYSTEM CONSTANTS

const COLORS = {
  primary: '#4c6fff',
  primaryLight: '#eef2ff',
  primaryDark: '#3b4fcc',
  success: '#10b981',
  successLight: '#ecfdf5',
  warning: '#f59e0b',
  warningLight: '#fef3c7',
  danger: '#ef4444',
  dangerText: '#dc2626',
  dangerLight: '#fef2f2',
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
  white: '#ffffff',
  black: '#000000',
  overlay: 'rgba(15, 23, 42, 0.55)',
};

const TYPOGRAPHY = {
  hero: { fontSize: 32, fontWeight: '800' as const, letterSpacing: -0.5, lineHeight: 40 },
  h3: { fontSize: 18, fontWeight: '700' as const, lineHeight: 24 },
  body: { fontSize: 16, fontWeight: '400' as const, lineHeight: 24 },
  bodyBold: { fontSize: 16, fontWeight: '600' as const, lineHeight: 24 },
  caption: { fontSize: 14, fontWeight: '400' as const, lineHeight: 20 },
  captionBold: { fontSize: 14, fontWeight: '600' as const, lineHeight: 20 },
  small: { fontSize: 12, fontWeight: '500' as const, lineHeight: 16 },
  tiny: { fontSize: 10, fontWeight: '700' as const, lineHeight: 14 },
};

const SPACING = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, xxxl: 32 };

// React Native Web renders TextInput/TouchableOpacity as real DOM nodes, so
// with no custom focus style the browser falls back to its own default
// focus ring — a solid black outline on inputs, a black box on buttons.
// This kills that default so our own (blue) focus styles are what shows.
const WEB_NO_OUTLINE: any = Platform.OS === 'web' ? { outlineStyle: 'none', outlineWidth: 0 } : {};
const RADIUS = { sm: 6, md: 10, lg: 14, xl: 18, xxl: 24, full: 999 };

const TAB_BAR_ALLOWANCE = 90;
const ROW_MIN_HEIGHT = 60;
const TILE = 40;

// Hover / pressed / keyboard-only focus ring. On web, React Native Web reports
// `focused` after a mouse click too, which left a sharp blue box stuck on the
// row (its square corners poking past the card's rounded corners). We only show
// the ring when the user is navigating with the keyboard, and round + inset it
// so it sits inside the card.
let isKeyboardNav = false;
if (Platform.OS === 'web' && typeof window !== 'undefined') {
  window.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.key === 'Tab') isKeyboardNav = true;
  }, true);
  window.addEventListener('mousedown', () => { isKeyboardNav = false; }, true);
  window.addEventListener('touchstart', () => { isKeyboardNav = false; }, true);
}

const interactiveRow = ({ pressed, hovered, focused }: any): any[] => [
  pressed && { backgroundColor: COLORS.gray100 },
  !pressed && hovered && { backgroundColor: COLORS.gray50 },
  Platform.OS === 'web' &&
    (focused && isKeyboardNav
      ? {
          outlineStyle: 'solid',
          outlineWidth: 2,
          outlineColor: COLORS.primary,
          outlineOffset: -4,
          borderRadius: RADIUS.md,
        }
      : { outlineStyle: 'none' }),
];

const SHADOWS = {
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
  modal: {
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.12,
    shadowRadius: 28,
    elevation: 8,
  },
};

const PROFILE_COLLAPSE_DURATION = 220;

const EASE_LAYOUT = LayoutAnimation.create(
  PROFILE_COLLAPSE_DURATION,
  LayoutAnimation.Types.easeInEaseOut,
  LayoutAnimation.Properties.opacity
);

const AVATAR_COLORS = ['#4c6fff', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#84cc16'];

const getAvatarColor = (email: string) => {
  if (!email) return AVATAR_COLORS[0];
  let hash = 0;
  for (let i = 0; i < email.length; i++) {
    hash = email.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
};

const darkenHex = (hex: string, amount: number) => {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.max(0, Math.round(((num >> 16) & 0xff) * (1 - amount)));
  const g = Math.max(0, Math.round(((num >> 8) & 0xff) * (1 - amount)));
  const b = Math.max(0, Math.round((num & 0xff) * (1 - amount)));
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
};

const getInitialsFromName = (name: string, fallbackEmail?: string) => {
  const source = name?.trim() ? name.trim() : fallbackEmail?.split('@')[0] || '';
  if (!source) return 'U';
  return source
    .split(' ')
    .filter(Boolean)
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

const DotGrid = React.memo(() => {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const DOT_SPACING = 32;
  const DOT_SIZE = 1.4;

  return (
    <View style={styles.dotGridContainer} pointerEvents="none">
      <Svg width={screenWidth} height={screenHeight}>
        {Array.from({ length: Math.ceil(screenHeight / DOT_SPACING) }).map((_, row) =>
          Array.from({ length: Math.ceil(screenWidth / DOT_SPACING) }).map((_, col) => (
            <Circle
              key={`${row}-${col}`}
              cx={col * DOT_SPACING}
              cy={row * DOT_SPACING}
              r={DOT_SIZE}
              fill={COLORS.primary}
              opacity={0.12}
            />
          ))
        )}
      </Svg>
    </View>
  );
});

const LockIcon = ({ color = '#000000' }: { color?: string }) => (
  <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
    <Rect x="3" y="11" width="18" height="11" rx="2" stroke={color} strokeWidth={2} />
    <Path d="M7 11V7C7 4.8 8.8 3 11 3H13C15.2 3 17 4.8 17 7V11" stroke={color} strokeWidth={2} strokeLinecap="round" />
  </Svg>
);

const DiagramIcon = ({ color = '#000000' }: { color?: string }) => (
  <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
    <Rect x="9" y="3" width="6" height="5" rx="1" stroke={color} strokeWidth={2} />
    <Rect x="3" y="16" width="6" height="5" rx="1" stroke={color} strokeWidth={2} />
    <Rect x="15" y="16" width="6" height="5" rx="1" stroke={color} strokeWidth={2} />
    <Path d="M12 8v4M6 16v-4h12v4" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const NoteIcon = ({ color = '#000000' }: { color?: string }) => (
  <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
    <Rect x="4" y="3" width="16" height="18" rx="2" stroke={color} strokeWidth={2} />
    <Path d="M8 7h8M8 11h6M8 15h4" stroke={color} strokeWidth={2} strokeLinecap="round" />
  </Svg>
);

const ShieldIcon = ({ color = '#000000' }: { color?: string }) => (
  <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
    <Path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const InfoIcon = ({ color = '#000000' }: { color?: string }) => (
  <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="12" r="9" stroke={color} strokeWidth={2} />
    <Path d="M12 11v6M12 8h.01" stroke={color} strokeWidth={2} strokeLinecap="round" />
  </Svg>
);

const SignOutIcon = ({ color = '#000000' }: { color?: string }) => (
  <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
    <Path d="M9 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H9" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M16 17L21 12L16 7" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M21 12H9" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const EyeIcon = ({ visible }: { visible: boolean }) => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
    {visible ? (
      <>
        <Path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="#64748b" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
        <Circle cx="12" cy="12" r="3" stroke="#64748b" strokeWidth={1.8} />
      </>
    ) : (
      <>
        <Path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94" stroke="#64748b" strokeWidth={1.8} strokeLinecap="round" />
        <Path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19" stroke="#64748b" strokeWidth={1.8} strokeLinecap="round" />
        <Path d="M1 1l22 22" stroke="#64748b" strokeWidth={1.8} strokeLinecap="round" />
      </>
    )}
  </Svg>
);

const CloseIcon = ({ color = '#0f172a' }: { color?: string }) => (
  <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
    <Path d="M18 6L6 18M6 6L18 18" stroke={color} strokeWidth={2.5} strokeLinecap="round" />
  </Svg>
);

const GoogleIcon = () => (
  <Svg width={18} height={18} viewBox="0 0 24 24">
    <Path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
    <Path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
    <Path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
    <Path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
  </Svg>
);

const ChevronRight = ({ color = '#64748b' }: { color?: string }) => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
    <Path d="M9 18l6-6-6-6" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const CheckCircleIcon = () => (
  <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="12" r="10" stroke="#ffffff" strokeWidth={2} />
    <Path d="M8 12l2 2 4-4" stroke="#ffffff" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const AlertCircleIcon = ({ color = '#ffffff', size = 16 }: { color?: string; size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="12" r="10" stroke={color} strokeWidth={2} />
    <Path d="M12 8v5M12 16h.01" stroke={color} strokeWidth={2} strokeLinecap="round" />
  </Svg>
);

const ProfileIcon = ({ color = '#000000' }: { color?: string }) => (
  <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="8" r="4" stroke={color} strokeWidth={2} />
    <Path d="M20 21V19C20 16.8 18.2 15 16 15H8C5.8 15 4 16.8 4 19V21" stroke={color} strokeWidth={2} strokeLinecap="round" />
  </Svg>
);

const EditIcon = ({ color = '#4c6fff' }: { color?: string }) => (
  <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
    <Path d="M11 4H4C3.46957 4 2.96086 4.21071 2.58579 4.58579C2.21071 4.96086 2 5.46957 2 6V20C2 20.5304 2.21071 21.0391 2.58579 21.4142C2.96086 21.7893 3.46957 22 4 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V13" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M18.5 2.5L21.5 5.5L12 15H9V12L18.5 2.5Z" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const AnimatedChevron = ({ expanded, color }: { expanded: boolean; color: string }) => {
  const spinValue = useRef(new Animated.Value(expanded ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(spinValue, {
      toValue: expanded ? 1 : 0,
      duration: 220,
      useNativeDriver: true,
    }).start();
  }, [expanded]);

  const spin = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['90deg', '-90deg'],
  });

  return (
    <Animated.View style={{ transform: [{ rotate: spin }] }}>
      <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
        <Path d="M9 18l6-6-6-6" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    </Animated.View>
  );
};

const IconTile = ({ children, tone = 'default' }: { children: React.ReactNode; tone?: 'default' | 'danger' }) => (
  <View style={[styles.iconTile, tone === 'danger' && styles.iconTileDanger]}>{children}</View>
);

const Row = ({
  icon,
  title,
  subtitle,
  badge,
  onPress,
  accessibilityLabel,
  nativeID,
  tone = 'default',
  showChevron = true,
  trailing,
  expanded,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  badge?: number;
  onPress: () => void;
  accessibilityLabel: string;
  nativeID?: string;
  tone?: 'default' | 'danger';
  showChevron?: boolean;
  trailing?: React.ReactNode;
  expanded?: boolean;
}) => (
  <Pressable
    nativeID={nativeID}
    onPress={onPress}
    accessibilityRole="button"
    accessibilityLabel={accessibilityLabel}
    accessibilityState={expanded === undefined ? undefined : { expanded }}
    style={(state: any) => [styles.row, ...interactiveRow(state)]}
  >
    <IconTile tone={tone}>{icon}</IconTile>
    <View style={styles.rowContent}>
      <Text style={[styles.rowTitle, tone === 'danger' && styles.rowTitleDanger]}>{title}</Text>
      {subtitle ? <Text style={styles.rowSubtitle}>{subtitle}</Text> : null}
    </View>
    {badge !== undefined && (
      <View style={styles.badge}>
        <Text style={styles.badgeText}>{badge}</Text>
      </View>
    )}
    {trailing ?? (showChevron ? <ChevronRight /> : null)}
  </Pressable>
);

const SubRow = ({
  icon,
  label,
  onPress,
  accessibilityLabel,
}: {
  icon: React.ReactNode;
  label: string;
  onPress: () => void;
  accessibilityLabel: string;
}) => (
  <Pressable
    onPress={onPress}
    accessibilityRole="button"
    accessibilityLabel={accessibilityLabel}
    style={(state: any) => [styles.subRow, ...interactiveRow(state)]}
  >
    <View style={styles.subIcon}>{icon}</View>
    <Text style={styles.subRowText}>{label}</Text>
    <ChevronRight />
  </Pressable>
);

const Group = ({ label, children }: { label?: string; children: React.ReactNode }) => (
  <View style={styles.group}>
    {label ? (
      <Text accessibilityRole="header" style={styles.groupLabel}>
        {label}
      </Text>
    ) : null}
    <View style={styles.groupCard}>{children}</View>
  </View>
);

const RowDivider = () => <View style={styles.rowDivider} />;

const ProfileBannerAccent = React.memo(() => (
  <Svg
    width={140}
    height={100}
    viewBox="0 0 140 100"
    style={styles.profileBannerAccent}
    pointerEvents="none"
  >
    <Path d="M58 78 L92 50" stroke="#ffffff" strokeWidth={1.5} opacity={0.22} />
    <Path d="M92 50 L118 66" stroke="#ffffff" strokeWidth={1.5} opacity={0.22} />
    <Rect x={38} y={68} width={40} height={22} rx={6} fill="#ffffff" opacity={0.14} />
    <Circle cx={92} cy={50} r={7} fill="#ffffff" opacity={0.18} />
    <Circle cx={118} cy={66} r={5} stroke="#ffffff" strokeWidth={1.5} fill="none" opacity={0.22} />
  </Svg>
));

const Stat = ({
  value,
  label,
  onPress,
  accessibilityLabel,
}: {
  value: number;
  label: string;
  onPress: () => void;
  accessibilityLabel: string;
}) => (
  <Pressable
    onPress={onPress}
    accessibilityRole="button"
    accessibilityLabel={accessibilityLabel}
    style={(state: any) => [
      styles.stat,
      state.pressed && { backgroundColor: 'rgba(255,255,255,0.18)' },
      !state.pressed && state.hovered && { backgroundColor: 'rgba(255,255,255,0.10)' },
      Platform.OS === 'web' && ({ cursor: 'pointer', outlineStyle: 'none' } as any),
    ]}
  >
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </Pressable>
);


const SkeletonLoader = () => {
  const opacity = useRef(new Animated.Value(0.35)).current;
  const { width: windowWidth } = useWindowDimensions();
  const isDesktop = windowWidth >= 1024;
  const isMobile = windowWidth < 768;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 750, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.35, duration: 750, useNativeDriver: true }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, []);

  const SkeletonBlock = ({
    width,
    height,
    style,
    borderRadius = RADIUS.sm,
  }: {
    width: number | string;
    height: number;
    style?: any;
    borderRadius?: number;
  }) => <Animated.View style={[{ opacity, backgroundColor: COLORS.gray200, borderRadius }, { width, height }, style]} />;

  return (
    <View style={styles.skeletonContainer}>
      <DotGrid />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: Platform.OS === 'ios' ? 60 : SPACING.xxl,
            paddingHorizontal: isDesktop ? SPACING.xxxl : SPACING.xl,
            maxWidth: isDesktop ? 800 : '100%',
            alignSelf: isDesktop ? 'center' : 'stretch',
            width: '100%',
          },
        ]}
      >
        <View style={[styles.profileCard, { marginBottom: SPACING.xxxl }]}>
          <View style={[styles.profileBanner, { minHeight: 120 }]}>
            <View style={styles.profileInfo}>
              <SkeletonBlock width={80} height={80} borderRadius={RADIUS.full} style={{ backgroundColor: 'rgba(255,255,255,0.3)' }} />
              <View style={styles.userInfo}>
                <SkeletonBlock width="60%" height={24} borderRadius={RADIUS.sm} style={{ backgroundColor: 'rgba(255,255,255,0.3)' }} />
                <SkeletonBlock width="80%" height={16} borderRadius={RADIUS.sm} style={{ marginTop: SPACING.sm, backgroundColor: 'rgba(255,255,255,0.3)' }} />
              </View>
            </View>
          </View>
        </View>

        <View style={styles.profileExpandableCard}>
          <View style={styles.profileExpandableHeader}>
            <View style={styles.profileExpandableHeaderLeft}>
              <SkeletonBlock width={24} height={24} borderRadius={RADIUS.sm} />
              <View style={styles.actionContent}>
                <SkeletonBlock width={60} height={18} borderRadius={RADIUS.sm} />
                <SkeletonBlock width={120} height={12} borderRadius={RADIUS.sm} style={{ marginTop: SPACING.xs }} />
              </View>
            </View>
            <SkeletonBlock width={20} height={20} borderRadius={RADIUS.sm} />
          </View>
        </View>

        {[
          { titleWidth: 120, subtitle: true },
          { titleWidth: 70, subtitle: true },
          { titleWidth: 80, subtitle: true },
          { titleWidth: 70, subtitle: false },
        ].map((item, i) => (
          <View key={i} style={[styles.actionCard, { marginTop: SPACING.md }]}>
            <SkeletonBlock width={24} height={24} borderRadius={RADIUS.sm} />
            <View style={styles.actionContent}>
              <SkeletonBlock width={item.titleWidth} height={18} borderRadius={RADIUS.sm} />
              {item.subtitle && <SkeletonBlock width={100} height={12} borderRadius={RADIUS.sm} style={{ marginTop: SPACING.xs }} />}
            </View>
            <SkeletonBlock width={20} height={20} borderRadius={RADIUS.sm} />
          </View>
        ))}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
};

const EditProfileModal = ({
  visible,
  onClose,
  userData,
  onUpdateProfile,
}: {
  visible: boolean;
  onClose: () => void;
  userData: any;
  onUpdateProfile: (data: { fullName: string }) => Promise<void>;
}) => {
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const [fullName, setFullName] = useState(userData.fullName || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [nameFocused, setNameFocused] = useState(false);

  const isDesktop = windowWidth >= 1024;
  const isMobile = windowWidth < 768;

  const [keyboardHeight, setKeyboardHeight] = useState(0);
  useEffect(() => {
    const showEvt = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvt = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSub = Keyboard.addListener(showEvt, (e) => setKeyboardHeight(e.endCoordinates.height));
    const hideSub = Keyboard.addListener(hideEvt, () => setKeyboardHeight(0));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const modalWidth = isDesktop ? 460 : isMobile ? windowWidth - 32 : 420;
  const maxModalHeight = Math.min(windowHeight * 0.85, 640, windowHeight - keyboardHeight - SPACING.xxl * 2);
  const isDirty = fullName.trim() !== (userData.fullName || '').trim();
  const hasError = !!error;

  useEffect(() => {
    if (visible) {
      setFullName(userData.fullName || '');
      setError('');
      setNameFocused(false);
    }
  }, [visible, userData.fullName]);

  const handleSave = async () => {
    if (loading) return;
    const trimmedName = fullName.trim();
    if (!trimmedName) {
      setError('Name cannot be empty');
      return;
    }
    if (trimmedName.length < 2 || trimmedName.length > 100) {
      setError('Name must be between 2 and 100 characters');
      return;
    }
    if (!/^[A-Za-zÀ-ÖØ-öø-ÿ]+(?:[ '-][A-Za-zÀ-ÖØ-öø-ÿ]+)*$/.test(trimmedName)) {
      setError('Name can only contain letters, spaces, hyphens, and apostrophes');
      return;
    }
    if (!isDirty) {
      onClose();
      return;
    }

    setLoading(true);
    setError('');

    try {
      await onUpdateProfile({ fullName: fullName.trim() });
    } catch (err: any) {
      setError(err.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (loading) return;
    onClose();
  };

  return (
    <Modal animationType="fade" transparent visible={visible} onRequestClose={() => {}}>
      <View style={styles.modalOverlay}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={[styles.modalWrapper, { padding: isMobile ? SPACING.md : SPACING.xl }]}
        >
          <Pressable style={[styles.editProfileModalContainer, { width: modalWidth, maxHeight: maxModalHeight }]}>
            <View style={styles.modalHeaderRow}>
              <View style={styles.modalHeaderIconTitle}>
                <Text style={[styles.modalTitle, { fontSize: isDesktop ? 19 : 18 }]}>Edit profile</Text>
                <Text style={styles.modalSubtitle}>Update the name shown on your account</Text>
              </View>
              <TouchableOpacity
                onPress={handleClose}
                style={[styles.modalClose, loading && styles.disabledTouchable]}
                disabled={loading}
                accessibilityRole="button"
                accessibilityLabel="Close edit profile"
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <CloseIcon />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} bounces={false}>
              <View style={[styles.editProfileField, { marginTop: SPACING.sm }]}>
                <Text style={styles.editProfileLabel}>Full name</Text>
                <View
                  style={[
                    styles.editProfileNameRow,
                    nameFocused && styles.editProfileInputFocused,
                    hasError && styles.inputError,
                    loading && styles.disabledInput,
                  ]}
                >
                  <TextInput
                    style={[styles.editProfileNameInput, { fontSize: isMobile ? 15 : 16 }]}
                    value={fullName}
                    onChangeText={(text) => {
                      const filtered = text.replace(/[^A-Za-zÀ-ÖØ-öø-ÿ\s'-]/g, '').slice(0, 100);
                      setFullName(filtered);
                      setError('');
                    }}
                    onFocus={() => setNameFocused(true)}
                    onBlur={() => setNameFocused(false)}
                    placeholder="Enter your full name"
                    placeholderTextColor={COLORS.gray400}
                    editable={!loading}
                    accessibilityLabel="Full name"
                  />
                </View>
                {hasError ? <Text style={styles.editProfileFieldError}>{error}</Text> : null}
              </View>

              <View style={styles.editProfileField}>
                <Text style={styles.editProfileLabel}>Email address</Text>
                <View style={styles.editProfileEmailRow}>
                  <Text style={styles.editProfileEmail} numberOfLines={1}>
                    {userData.email}
                  </Text>
                </View>
                <Text style={styles.editProfileFieldHint}>Your email can't be changed</Text>
              </View>
            </ScrollView>

            <View style={[styles.editProfileFooter, { padding: isDesktop ? SPACING.xl : SPACING.lg }]}>
              <TouchableOpacity
                style={[styles.editProfileButton, styles.editProfileCancelButton, loading && styles.disabledTouchable]}
                onPress={handleClose}
                disabled={loading}
                accessibilityRole="button"
                accessibilityLabel="Cancel edit"
              >
                <Text style={[styles.editProfileCancelText, { fontSize: isMobile ? 14 : 16 }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.editProfileButton,
                  styles.editProfileSaveButton,
                  (loading || !isDirty) && styles.modalButtonDisabled,
                ]}
                onPress={handleSave}
                disabled={loading || !isDirty}
                accessibilityRole="button"
                accessibilityLabel="Save changes"
              >
                {loading ? (
                  <ActivityIndicator color={COLORS.white} size="small" />
                ) : (
                  <Text style={[styles.editProfileSaveText, { fontSize: isMobile ? 14 : 16 }]}>Save Changes</Text>
                )}
              </TouchableOpacity>
            </View>
          </Pressable>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

type PasswordFieldError = 'current' | 'new' | 'confirm' | null;
// Which of the three ChangePasswordModal fields currently has focus, so we
// can apply the (previously-defined-but-unused) passwordInputFocused style.
type PasswordFieldFocus = 'current' | 'new' | 'confirm' | null;

const PASSWORD_RULES: { key: string; label: string; test: (pwd: string) => boolean }[] = [
  { key: 'length', label: 'At least 8 characters', test: (p) => p.length >= 8 },
  { key: 'upper', label: 'One uppercase letter', test: (p) => /[A-Z]/.test(p) },
  { key: 'lower', label: 'One lowercase letter', test: (p) => /[a-z]/.test(p) },
  { key: 'number', label: 'One number', test: (p) => /[0-9]/.test(p) },
  { key: 'special', label: 'One special character', test: (p) => /[!@#$%^&*(),.?":{}|<>]/.test(p) },
];

const isPasswordValid = (pwd: string) => PASSWORD_RULES.every((r) => r.test(pwd));

const getPasswordStrengthMeta = (pwd: string) => {
  const score = PASSWORD_RULES.filter((r) => r.test(pwd)).length;
  if (score >= 5) return { text: 'Strong', color: COLORS.success };
  if (score >= 3) return { text: 'Good', color: COLORS.warning };
  if (score > 0) return { text: 'Weak', color: COLORS.danger };
  return { text: '', color: COLORS.gray200 };
};

const PasswordStrengthMeter = ({ password }: { password: string }) => {
  if (!password) return null;
  const score = PASSWORD_RULES.filter((r) => r.test(password)).length;
  const meta = getPasswordStrengthMeta(password);
  return (
    <View style={styles.strengthMeterWrap}>
      <View style={styles.strengthSegmentRow}>
        {PASSWORD_RULES.map((_, i) => (
          <View
            key={i}
            style={[styles.strengthSegment, i < score && { backgroundColor: meta.color }]}
          />
        ))}
      </View>
      {meta.text ? <Text style={[styles.strengthMeterText, { color: meta.color }]}>{meta.text}</Text> : null}
    </View>
  );
};

const PasswordChecklist = ({ password, isMobile }: { password: string; isMobile: boolean }) => {
  const unmet = PASSWORD_RULES.filter((rule) => !rule.test(password));
  if (unmet.length === 0) return null;
  return (
    <Text style={[styles.checklistText, { fontSize: isMobile ? 11 : 12, marginTop: SPACING.sm }]}>
      Still needs: {unmet.map((r) => r.label.replace(/^(At least |One )/, '')).join(', ')}
    </Text>
  );
};

const ChangePasswordModal = ({
  visible,
  onClose,
  onSuccess,
  router,
}: {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
  router: any;
}) => {
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const isDesktop = windowWidth >= 1024;
  const isMobile = windowWidth < 768;

  const [keyboardHeight, setKeyboardHeight] = useState(0);
  useEffect(() => {
    const showEvt = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvt = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSub = Keyboard.addListener(showEvt, (e) => setKeyboardHeight(e.endCoordinates.height));
    const hideSub = Keyboard.addListener(hideEvt, () => setKeyboardHeight(0));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const modalWidth = isDesktop ? 460 : isMobile ? windowWidth - 32 : 420;
  const maxModalHeight = Math.min(windowHeight * 0.85, 640, windowHeight - keyboardHeight - SPACING.xxl * 2);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [errorField, setErrorField] = useState<PasswordFieldError>(null);
  // FIX: passwordInputFocused was already defined in styles but never
  // applied — tracks which field is focused so its container gets the
  // blue-border focus treatment on tap, matching the other inputs in the app.
  const [focusedField, setFocusedField] = useState<PasswordFieldFocus>(null);

  const handleChangePassword = async () => {
    if (loading) return;
    setError('');
    setErrorField(null);

    if (!currentPassword) {
      setError('Please enter your current password.');
      setErrorField('current');
      return;
    }
    if (!isPasswordValid(newPassword)) {
      setError('Please meet all password requirements below.');
      setErrorField('new');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('New passwords do not match.');
      setErrorField('confirm');
      return;
    }

    setLoading(true);

    try {
      const result = await authService.changePassword(currentPassword, newPassword);

      if (result.success) {
        handleClose();
        onSuccess();
      } else {
        setError(result.message || 'Failed to change password.');
      }
    } catch (err: any) {
      const message = err.response?.data?.message || err.message || 'Unable to change password. Please try again.';
      setError(message);
      setErrorField(message.toLowerCase().includes('current') ? 'current' : null);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (loading) return;
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setShowCurrentPassword(false);
    setShowNewPassword(false);
    setShowConfirmPassword(false);
    setError('');
    setErrorField(null);
    setFocusedField(null);
    onClose();
  };

  return (
    <Modal animationType="fade" transparent visible={visible} onRequestClose={() => {}}>
      <View style={styles.modalOverlay}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={[styles.modalWrapper, { padding: isMobile ? SPACING.md : SPACING.xl }]}
        >
        <Pressable style={[styles.modalContainer, { width: modalWidth, maxHeight: maxModalHeight }]}>
          <View style={styles.modalHeaderRow}>
            <View style={styles.modalHeaderIconTitle}>
              <Text style={[styles.modalTitle, { fontSize: isDesktop ? 19 : 18 }]}>Change password</Text>
              <Text style={styles.modalSubtitle}>Use 8+ characters you don't use elsewhere</Text>
            </View>
            <TouchableOpacity
              onPress={handleClose}
              style={[styles.modalClose, loading && styles.disabledTouchable]}
              disabled={loading}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessibilityRole="button"
              accessibilityLabel="Close change password"
            >
              <CloseIcon />
            </TouchableOpacity>
          </View>

          <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} bounces={false}>
          <View style={styles.passwordInputWrapper}>
            <Text style={[styles.inputLabel, { fontSize: isMobile ? 12 : 13 }]}>Current password</Text>
            <View
              style={[
                styles.passwordInputContainer,
                focusedField === 'current' && styles.passwordInputFocused,
                errorField === 'current' && styles.inputError,
                loading && styles.disabledInput,
              ]}
            >
              <TextInput
                style={[styles.passwordInput, { fontSize: isMobile ? 15 : 16 }]}
                placeholder="Enter your current password"
                placeholderTextColor={COLORS.gray400}
                value={currentPassword}
                onChangeText={(text) => {
                  setCurrentPassword(text);
                  setError('');
                  setErrorField(null);
                }}
                onFocus={() => setFocusedField('current')}
                onBlur={() => setFocusedField((prev) => (prev === 'current' ? null : prev))}
                secureTextEntry={!showCurrentPassword}
                autoCapitalize="none"
                editable={!loading}
                accessibilityLabel="Current password"
              />
              <TouchableOpacity
                style={styles.passwordEyeBtn}
                onPress={() => setShowCurrentPassword(!showCurrentPassword)}
                accessibilityRole="button"
                accessibilityLabel={showCurrentPassword ? 'Hide current password' : 'Show current password'}
              >
                <EyeIcon visible={showCurrentPassword} />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.passwordInputWrapper}>
            <Text style={[styles.inputLabel, { fontSize: isMobile ? 12 : 13 }]}>New password</Text>
            <View
              style={[
                styles.passwordInputContainer,
                focusedField === 'new' && styles.passwordInputFocused,
                errorField === 'new' && styles.inputError,
                loading && styles.disabledInput,
              ]}
            >
              <TextInput
                style={[styles.passwordInput, { fontSize: isMobile ? 15 : 16 }]}
                placeholder="Enter new password"
                placeholderTextColor={COLORS.gray400}
                value={newPassword}
                onChangeText={(text) => {
                  setNewPassword(text);
                  setError('');
                  setErrorField(null);
                }}
                onFocus={() => setFocusedField('new')}
                onBlur={() => setFocusedField((prev) => (prev === 'new' ? null : prev))}
                secureTextEntry={!showNewPassword}
                autoCapitalize="none"
                editable={!loading}
                accessibilityLabel="New password"
              />
              <TouchableOpacity
                style={styles.passwordEyeBtn}
                onPress={() => setShowNewPassword(!showNewPassword)}
                accessibilityRole="button"
                accessibilityLabel={showNewPassword ? 'Hide new password' : 'Show new password'}
              >
                <EyeIcon visible={showNewPassword} />
              </TouchableOpacity>
            </View>

            <PasswordStrengthMeter password={newPassword} />
            {newPassword.length > 0 && <PasswordChecklist password={newPassword} isMobile={isMobile} />}
          </View>

          <View style={styles.passwordInputWrapper}>
            <Text style={[styles.inputLabel, { fontSize: isMobile ? 12 : 13 }]}>Confirm new password</Text>
            <View
              style={[
                styles.passwordInputContainer,
                focusedField === 'confirm' && styles.passwordInputFocused,
                (errorField === 'confirm' || (confirmPassword && newPassword !== confirmPassword)) && styles.inputError,
                loading && styles.disabledInput,
              ]}
            >
              <TextInput
                style={[styles.passwordInput, { fontSize: isMobile ? 15 : 16 }]}
                placeholder="Confirm new password"
                placeholderTextColor={COLORS.gray400}
                value={confirmPassword}
                onChangeText={(text) => {
                  setConfirmPassword(text);
                  setError('');
                  setErrorField(null);
                }}
                onFocus={() => setFocusedField('confirm')}
                onBlur={() => setFocusedField((prev) => (prev === 'confirm' ? null : prev))}
                secureTextEntry={!showConfirmPassword}
                autoCapitalize="none"
                editable={!loading}
                accessibilityLabel="Confirm new password"
              />
              <TouchableOpacity
                style={styles.passwordEyeBtn}
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                accessibilityRole="button"
                accessibilityLabel={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
              >
                <EyeIcon visible={showConfirmPassword} />
              </TouchableOpacity>
            </View>
            {confirmPassword && newPassword !== confirmPassword && (
              <Text style={[styles.passwordMismatchText, { fontSize: isMobile ? 11 : 12 }]}>Passwords do not match</Text>
            )}
            {confirmPassword && newPassword === confirmPassword && newPassword.length > 0 && (
              <Text style={[styles.matchSuccess, { fontSize: isMobile ? 11 : 12 }]}>Passwords match</Text>
            )}
          </View>

          {error ? <Text style={[styles.modalError, { fontSize: isMobile ? 12 : 14 }]}>{error}</Text> : null}
          </ScrollView>

          <View style={styles.modalFooterRow}>
            <TouchableOpacity
              style={[styles.modalSecondaryButton, loading && styles.disabledTouchable]}
              onPress={handleClose}
              disabled={loading}
              accessibilityRole="button"
              accessibilityLabel="Cancel"
            >
              <Text style={styles.modalSecondaryButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalPrimaryButton, loading && styles.modalButtonDisabled]}
              onPress={handleChangePassword}
              disabled={loading}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Update password"
            >
              {loading ? <ActivityIndicator color={COLORS.white} size="small" /> : (
                <Text style={[styles.modalButtonText, { fontSize: isMobile ? 15 : 16 }]}>Update Password</Text>
              )}
            </TouchableOpacity>
          </View>
        </Pressable>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

const SetPasswordModal = ({
  visible,
  onClose,
  onSuccess,
  currentEmail,
  verifiedToken,
  onVerified,
}: {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
  currentEmail: string;
  verifiedToken: string | null;
  onVerified: (token: string | null) => void;
}) => {
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const isDesktop = windowWidth >= 1024;
  const isMobile = windowWidth < 768;

  const [keyboardHeight, setKeyboardHeight] = useState(0);
  useEffect(() => {
    const showEvt = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvt = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSub = Keyboard.addListener(showEvt, (e) => setKeyboardHeight(e.endCoordinates.height));
    const hideSub = Keyboard.addListener(hideEvt, () => setKeyboardHeight(0));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const modalWidth = isDesktop ? 460 : isMobile ? windowWidth - 32 : 420;
  const maxModalHeight = Math.min(windowHeight * 0.85, 640, windowHeight - keyboardHeight - SPACING.xxl * 2);

  const [step, setStep] = useState<'verify' | 'password'>(verifiedToken ? 'password' : 'verify');
  const [verifying, setVerifying] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [wrongAccountEmail, setWrongAccountEmail] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setStep(verifiedToken ? 'password' : 'verify');
      setError('');
    }
  }, [visible]);

  const handleClose = () => {
    if (loading || verifying) return;
    setNewPassword('');
    setConfirmPassword('');
    setShowNewPassword(false);
    setShowConfirmPassword(false);
    setError('');
    setWrongAccountEmail(null);
    onClose();
  };

  const handleBack = () => {
    if (loading) return;
    setStep('verify');
    setError('');
  };

  const handleVerifyGoogle = async () => {
    if (verifying) return;
    setError('');
    setWrongAccountEmail(null);
    if (!firebaseAuth) {
      setError('Google verification is unavailable on this platform.');
      return;
    }
    setVerifying(true);
    try {
      const provider = new GoogleAuthProvider();
      provider.addScope('email');
      provider.addScope('profile');
      provider.setCustomParameters({ prompt: 'login' });
      const result = await signInWithPopup(firebaseAuth, provider);
      const pickedEmail = result.user.email?.toLowerCase();
      if (pickedEmail && currentEmail && pickedEmail !== currentEmail.toLowerCase()) {
        setWrongAccountEmail(result.user.email || pickedEmail);
        return;
      }
      const idToken = await result.user.getIdToken();
      onVerified(idToken);
      setStep('password');
    } catch (err: any) {
      if (err.code !== 'auth/popup-closed-by-user' && err.code !== 'auth/cancelled-popup-request') {
        setError('Could not verify your Google account. Please try again.');
      }
    } finally {
      setVerifying(false);
    }
  };

  const handleSetPassword = async () => {
    if (loading) return;
    setError('');

    if (!isPasswordValid(newPassword)) {
      setError('Please meet all password requirements below.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (!verifiedToken) {
      setError('Your Google verification expired — please verify again.');
      setStep('verify');
      return;
    }

    setLoading(true);
    try {
      const result = await authService.setPassword(verifiedToken, newPassword);
      if (result.success) {
        onVerified(null);
        handleClose();
        onSuccess();
      } else {
        setError(result.message || 'Failed to set password.');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Unable to set password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
    <Modal animationType="fade" transparent visible={visible} onRequestClose={handleClose}>
      <Pressable style={styles.modalOverlay} onPress={handleClose}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={[styles.modalWrapper, { padding: isMobile ? SPACING.md : SPACING.xl }]}
        >
        <Pressable style={[styles.modalContainer, { width: modalWidth, maxHeight: maxModalHeight }]}>
          <View style={styles.modalHeaderRow}>
            <View style={styles.modalHeaderIconTitle}>
              <Text style={[styles.modalTitle, { fontSize: isDesktop ? 19 : 18 }]}>Set a password</Text>
              <Text style={styles.modalSubtitle}>
                {step === 'verify' ? "Confirm it's you, then choose a password" : 'Choose a password for your account'}
              </Text>
            </View>
            <TouchableOpacity
              onPress={handleClose}
              style={[styles.modalClose, (loading || verifying) && styles.disabledTouchable]}
              disabled={loading || verifying}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessibilityRole="button"
              accessibilityLabel="Close set password"
            >
              <CloseIcon />
            </TouchableOpacity>
          </View>

          <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} bounces={false}>
          {step === 'verify' ? (
            <View style={styles.setPasswordVerifyStep}>
              {wrongAccountEmail ? (
                <View style={styles.wrongAccountBanner}>
                  <AlertCircleIcon color={COLORS.dangerText} size={16} />
                  <Text style={styles.wrongAccountBannerText}>
                    That was {wrongAccountEmail}, but you're signed in as {currentEmail}. Pick that Google account instead.
                  </Text>
                </View>
              ) : null}
              {verifiedToken ? (
                <>
                  <View style={styles.setPasswordVerifiedRow}>
                    <View style={styles.setPasswordVerifiedCheck}>
                      <CheckCircleIcon />
                    </View>
                    <Text style={[styles.setPasswordVerifyText, { marginBottom: 0 }]}>
                      Google account confirmed as {currentEmail}.
                    </Text>
                  </View>
                  {error ? <Text style={[styles.modalError, { fontSize: isMobile ? 12 : 14, marginTop: 0, marginHorizontal: 0 }]}>{error}</Text> : null}
                  <TouchableOpacity
                    style={[styles.modalPrimaryButton, { marginTop: SPACING.md }]}
                    onPress={() => setStep('password')}
                    accessibilityRole="button"
                    accessibilityLabel="Continue"
                  >
                    <Text style={[styles.modalButtonText, { fontSize: isMobile ? 15 : 16 }]}>Continue</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={handleVerifyGoogle}
                    disabled={verifying}
                    accessibilityRole="button"
                    accessibilityLabel="Use a different Google account"
                  >
                    <Text style={styles.setPasswordSwitchAccountText}>
                      {verifying ? 'Verifying…' : 'Use a different Google account'}
                    </Text>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <Text style={styles.setPasswordVerifyText}>
                    You signed in with Google. To also sign in with your email and a password, confirm your Google account first.
                  </Text>
                  {error ? <Text style={[styles.modalError, { fontSize: isMobile ? 12 : 14, marginTop: 0, marginHorizontal: 0 }]}>{error}</Text> : null}
                  <TouchableOpacity
                    style={[styles.googleVerifyButton, verifying && styles.modalButtonDisabled]}
                    onPress={handleVerifyGoogle}
                    disabled={verifying}
                    accessibilityRole="button"
                    accessibilityLabel="Continue with Google"
                  >
                    {verifying ? <ActivityIndicator color={COLORS.gray700} size="small" /> : (
                      <>
                        <GoogleIcon />
                        <Text style={styles.googleVerifyButtonText}>Continue with Google</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </>
              )}
            </View>
          ) : (
            <>
              <View style={styles.passwordInputWrapper}>
                <Text style={[styles.inputLabel, { fontSize: isMobile ? 12 : 13 }]}>New password</Text>
                <View style={[styles.passwordInputContainer, loading && styles.disabledInput]}>
                  <TextInput
                    style={[styles.passwordInput, { fontSize: isMobile ? 15 : 16 }]}
                    placeholder="Enter a password"
                    placeholderTextColor={COLORS.gray400}
                    value={newPassword}
                    onChangeText={(text) => { setNewPassword(text); setError(''); }}
                    secureTextEntry={!showNewPassword}
                    autoCapitalize="none"
                    editable={!loading}
                    accessibilityLabel="New password"
                  />
                  <TouchableOpacity
                    style={styles.passwordEyeBtn}
                    onPress={() => setShowNewPassword(!showNewPassword)}
                    accessibilityRole="button"
                    accessibilityLabel={showNewPassword ? 'Hide password' : 'Show password'}
                  >
                    <EyeIcon visible={showNewPassword} />
                  </TouchableOpacity>
                </View>
                <PasswordStrengthMeter password={newPassword} />
                {newPassword.length > 0 && <PasswordChecklist password={newPassword} isMobile={isMobile} />}
              </View>

              <View style={styles.passwordInputWrapper}>
                <Text style={[styles.inputLabel, { fontSize: isMobile ? 12 : 13 }]}>Confirm password</Text>
                <View style={[styles.passwordInputContainer, (confirmPassword && newPassword !== confirmPassword) && styles.inputError, loading && styles.disabledInput]}>
                  <TextInput
                    style={[styles.passwordInput, { fontSize: isMobile ? 15 : 16 }]}
                    placeholder="Re-enter the password"
                    placeholderTextColor={COLORS.gray400}
                    value={confirmPassword}
                    onChangeText={(text) => { setConfirmPassword(text); setError(''); }}
                    secureTextEntry={!showConfirmPassword}
                    autoCapitalize="none"
                    editable={!loading}
                    accessibilityLabel="Confirm password"
                  />
                  <TouchableOpacity
                    style={styles.passwordEyeBtn}
                    onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                    accessibilityRole="button"
                    accessibilityLabel={showConfirmPassword ? 'Hide password' : 'Show password'}
                  >
                    <EyeIcon visible={showConfirmPassword} />
                  </TouchableOpacity>
                </View>
                {confirmPassword && newPassword !== confirmPassword && (
                  <Text style={[styles.passwordMismatchText, { fontSize: isMobile ? 11 : 12 }]}>Passwords do not match</Text>
                )}
                {confirmPassword && newPassword === confirmPassword && newPassword.length > 0 && (
                  <Text style={[styles.matchSuccess, { fontSize: isMobile ? 11 : 12 }]}>Passwords match</Text>
                )}
              </View>

              {error ? <Text style={[styles.modalError, { fontSize: isMobile ? 12 : 14 }]}>{error}</Text> : null}
            </>
          )}
          </ScrollView>

          {step === 'password' && (
          <View style={styles.modalFooterRow}>
            <TouchableOpacity
              style={[styles.modalSecondaryButton, loading && styles.disabledTouchable]}
              onPress={handleBack}
              disabled={loading}
              accessibilityRole="button"
              accessibilityLabel="Back"
            >
              <Text style={styles.modalSecondaryButtonText}>Back</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalPrimaryButton, loading && styles.modalButtonDisabled]}
              onPress={handleSetPassword}
              disabled={loading}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Set password"
            >
              {loading ? <ActivityIndicator color={COLORS.white} size="small" /> : (
                <Text style={[styles.modalButtonText, { fontSize: isMobile ? 15 : 16 }]}>Set Password</Text>
              )}
            </TouchableOpacity>
          </View>
          )}
        </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
    </>
  );
};

// Focus ring for the dialog buttons: only for keyboard users, same rule as
// the account rows (see isKeyboardNav above).
const dialogFocusRing = ({ focused }: any): any =>
  Platform.OS === 'web'
    ? focused && isKeyboardNav
      ? { outlineStyle: 'solid', outlineWidth: 2, outlineColor: COLORS.primary, outlineOffset: 2 }
      : { outlineStyle: 'none' }
    : null;

// Signing out is routine and fully recoverable, so this is a plain
// confirmation, not a danger dialog: same shell, type and buttons as the Edit
// profile and Change password modals, with the safe action (Cancel) focused
// when it opens.
const SignOutModal = ({
  visible,
  onClose,
  onConfirm,
  loading,
}: {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
  loading: boolean;
}) => {
  const { width: windowWidth } = useWindowDimensions();
  const modalWidth = Math.min(400, windowWidth - SPACING.xxl * 2);
  const cancelRef = useRef<View>(null);

  useEffect(() => {
    if (Platform.OS !== 'web' || !visible) return;
    const t = setTimeout(() => (cancelRef.current as any)?.focus?.(), 60);
    return () => clearTimeout(t);
  }, [visible]);

  const dismiss = () => {
    if (!loading) onClose();
  };

  const dialogA11y: any =
    Platform.OS === 'web'
      ? { role: 'alertdialog', 'aria-modal': true, 'aria-labelledby': 'sign-out-title', 'aria-describedby': 'sign-out-message' }
      : { accessibilityViewIsModal: true };

  return (
    <Modal animationType="fade" transparent visible={visible} onRequestClose={dismiss}>
      <Pressable style={styles.modalOverlay} onPress={dismiss}>
        <Pressable style={[styles.signOutDialog, { width: modalWidth }]} {...dialogA11y}>
          <Text nativeID="sign-out-title" accessibilityRole="header" style={styles.signOutTitle}>
            Sign out of your account?
          </Text>
          <Text nativeID="sign-out-message" style={styles.signOutMessage}>
            You'll need to sign in again to get back to your diagrams and notes.
          </Text>

          <View style={styles.signOutActions}>
            <Pressable
              ref={cancelRef}
              onPress={onClose}
              disabled={loading}
              accessibilityRole="button"
              accessibilityLabel="Cancel"
              style={(state: any) => [
                styles.signOutButton,
                styles.signOutCancel,
                state.hovered && !state.pressed && { backgroundColor: COLORS.gray50 },
                state.pressed && { backgroundColor: COLORS.gray100 },
                loading && styles.disabledTouchable,
                dialogFocusRing(state),
              ]}
            >
              <Text style={styles.signOutCancelText}>Cancel</Text>
            </Pressable>

            <Pressable
              onPress={onConfirm}
              disabled={loading}
              accessibilityRole="button"
              accessibilityLabel={loading ? 'Signing out' : 'Sign out'}
              accessibilityState={{ busy: loading, disabled: loading }}
              style={(state: any) => [
                styles.signOutButton,
                styles.signOutConfirm,
                state.hovered && !state.pressed && { backgroundColor: COLORS.primaryDark },
                state.pressed && { backgroundColor: COLORS.primaryDark },
                dialogFocusRing(state),
              ]}
            >
              {loading ? (
                <ActivityIndicator color={COLORS.white} size="small" />
              ) : (
                <Text style={styles.signOutConfirmText}>Sign out</Text>
              )}
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const Toast = ({
  visible,
  message,
  isError,
  onHide,
}: {
  visible: boolean;
  message: string;
  isError: boolean;
  onHide: () => void;
}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(-40)).current;
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
        Animated.spring(slideAnim, { toValue: 0, tension: 60, friction: 8, useNativeDriver: true }),
      ]).start();
      timeoutRef.current = setTimeout(() => hideToast(), 3200);
    }
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [visible]);

  const hideToast = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 0, duration: 250, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: -40, duration: 250, useNativeDriver: true }),
    ]).start(() => onHide());
  };

  if (!visible) return null;

  return (
    <Animated.View style={[styles.toastContainer, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]} pointerEvents="none">
      <View style={[styles.toastContent, isError ? styles.toastError : styles.toastSuccess]}>
        <View style={styles.toastIcon}>{isError ? <AlertCircleIcon /> : <CheckCircleIcon />}</View>
        <Text style={styles.toastText} numberOfLines={2}>{message}</Text>
      </View>
    </Animated.View>
  );
};

export default function UserAccount() {
  usePageTitle('Account');
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const { onFlushDraft } = useSave();
  const { notes } = useNotes();

  const isDesktop = windowWidth >= 1024;
  const isMobile = windowWidth < 768;

  const [userData, setUserData] = useState({
    fullName: '',
    email: '',
    username: '',
    authProvider: 'email' as 'email' | 'google' | null,
    hasPassword: true,
  });
  const [savedDiagrams, setSavedDiagrams] = useState<any[]>(() => authService.getCachedDiagrams() ?? []);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [isProfileExpanded, setIsProfileExpanded] = useState(false);

  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showSetPasswordModal, setShowSetPasswordModal] = useState(false);
  const [googleVerifiedToken, setGoogleVerifiedToken] = useState<string | null>(null);
  const [showSignOutModal, setShowSignOutModal] = useState(false);
  const [signOutLoading, setSignOutLoading] = useState(false);
  const [toast, setToast] = useState({ visible: false, message: '', isError: false });

  const showToast = useCallback((message: string, isError: boolean = false) => {
    setToast({ visible: true, message, isError });
  }, []);

  const hideToast = useCallback(() => {
    setToast((prev) => ({ ...prev, visible: false }));
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadUserData();
      loadSavedDiagrams();
    }, [])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([loadUserData(), loadSavedDiagrams()]);
    setRefreshing(false);
  }, []);

  const pullToRefreshWeb = usePullToRefreshWeb(onRefresh);

  const loadUserData = async () => {
    let usedCache = false;
    try {
      const signedIn = await authService.hasActiveSession();
      if (!signedIn) {
        router.replace('/(auth)/signin');
        return;
      }

      const cached = await authService.getCachedUser();
      if (cached) {
        usedCache = true;
        setUserData({
          fullName: cached.fullName || '',
          email: cached.email || '',
          username: cached.username || '',
          authProvider: cached.authProvider || 'email',
          hasPassword: cached.hasPassword !== false,
        });
        setLoading(false);
      }

      const result = await authService.verifyToken();

      if (result.success && result.data?.user) {
        const { fullName, email, username, authProvider, hasPassword } = result.data.user;
        setUserData({
          fullName: fullName || '',
          email: email || '',
          username: username || '',
          authProvider: authProvider || 'email',
          hasPassword: hasPassword !== false,
        });
      } else {
        const stillSignedIn = await authService.hasActiveSession();
        if (!stillSignedIn) {
          router.replace('/(auth)/signin');
        } else if (!usedCache) {
          await useCachedUserAsFallback();
          showToast('Failed to load user data. Pull down to refresh.', true);
        }
      }
    } catch (error) {
      console.error('Failed to load user data:', error);
      if (!usedCache) {
        await useCachedUserAsFallback();
        showToast('Failed to load user data. Pull down to refresh.', true);
      }
    } finally {
      setLoading(false);
    }
  };

  const useCachedUserAsFallback = async () => {
    const cached = await authService.getCachedUser();
    if (cached) {
      setUserData({
        fullName: cached.fullName || '',
        email: cached.email || '',
        username: cached.username || '',
        authProvider: cached.authProvider || 'email',
        hasPassword: cached.hasPassword !== false,
      });
    }
  };

  const loadSavedDiagrams = async () => {
    try {
      const signedIn = await authService.hasActiveSession();
      if (!signedIn) return;

      const result = await authService.getUserDiagrams();
      if (result.success && result.data) {
        setSavedDiagrams(result.data);
      }
    } catch (error) {
      console.error('Failed to load diagrams:', error);
    }
  };

  const handleUpdateProfile = async (data: { fullName: string }) => {
    const signedIn = await authService.hasActiveSession();
    if (!signedIn) {
      showToast('Session expired. Please sign in again.', true);
      router.replace('/(auth)/signin');
      throw new Error('No access token');
    }

    const result = await authService.updateProfile({ fullName: data.fullName });

    if (result.success && result.data?.user) {
      setUserData((prev) => ({ ...prev, fullName: result.data.user.fullName }));
      showToast('Profile updated successfully');
      setShowEditProfileModal(false);
    } else {
      throw new Error(result.message || 'Failed to update profile');
    }
  };

  const handlePasswordSuccess = () => {
    showToast('Password changed successfully.');
  };

  const handleSetPasswordSuccess = () => {
    setUserData((prev) => ({ ...prev, hasPassword: true }));
    showToast('Password set! You can now also sign in with your email and password.');
  };

  const handleSignOutConfirm = async () => {
    setSignOutLoading(true);
    try {
      await onFlushDraft?.();
      await authService.logout();
      if (firebaseAuth) {
        await firebaseSignOut(firebaseAuth).catch(() => {});
      }
      setUserData({ fullName: '', email: '', username: '', authProvider: null, hasPassword: true });
    } catch (error) {
      console.error('Sign out error:', error);
    } finally {
      setSignOutLoading(false);
      setShowSignOutModal(false);
      router.replace('/(auth)/signin');
    }
  };

  const handleSignOutPress = () => {
    setShowSignOutModal(true);
  };

  const toggleProfileExpanded = () => {
    LayoutAnimation.configureNext(EASE_LAYOUT);
    setIsProfileExpanded((prev) => !prev);
  };

  const getDisplayName = useCallback(() => {
    if (userData.fullName && userData.fullName.trim()) return userData.fullName;
    if (userData.email) return userData.email.split('@')[0];
    return 'User';
  }, [userData.fullName, userData.email]);

  const avatarColor = getAvatarColor(userData.email);
  const avatarInitials = getInitialsFromName(userData.fullName, userData.email);

  const accountTourSteps = useMemo(() => getAccountTourSteps({ router }), [router]);
  useOnboardingTour(ACCOUNT_TOUR_ID, accountTourSteps, !loading);

  if (loading) {
    return <SkeletonLoader />;
  }

  const isGoogleUser = userData.authProvider === 'google';

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <DotGrid />

      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingTop: insets.top + SPACING.xxl,
              paddingHorizontal: isDesktop ? SPACING.xxxl : SPACING.xl,
              maxWidth: isDesktop ? 800 : '100%',
              alignSelf: isDesktop ? 'center' : 'stretch',
              width: '100%',
              paddingBottom: insets.bottom + (isMobile ? TAB_BAR_ALLOWANCE : SPACING.xxxl),
            },
          ]}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} colors={[COLORS.primary]} />
          }
          {...pullToRefreshWeb.scrollHandlers}
        >
          <PullToRefreshIndicator
            pullDistance={pullToRefreshWeb.pullDistance}
            refreshing={pullToRefreshWeb.refreshing}
            tintColor={COLORS.primary}
          />
          {/* Profile banner */}
          <View
            nativeID="tour-account-profile"
            style={[styles.profileCard, isMobile && styles.profileCardMobile, { marginBottom: SPACING.xxl }]}
          >
            <LinearGradient
              colors={[avatarColor, darkenHex(avatarColor, 0.35)]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.profileBanner}
            >
              <ProfileBannerAccent />
              <View style={[styles.profileInfo, isMobile && { padding: SPACING.lg }]}>
                <View style={styles.avatarRing}>
                  <View style={[styles.avatar, styles.avatarPlaceholder, { backgroundColor: avatarColor }]}>
                    <Text style={styles.avatarInitials}>{avatarInitials}</Text>
                  </View>
                </View>
                <View style={styles.userInfo}>
                  <Text style={[styles.userName, { fontSize: isDesktop ? 20 : 18 }]} numberOfLines={1}>
                    {getDisplayName()}
                  </Text>
                  <Text style={[styles.userEmail, { fontSize: isDesktop ? 15 : 14 }]} numberOfLines={1}>
                    {userData.email}
                  </Text>
                </View>
              </View>
              <View style={styles.statsRow}>
                <Stat
                  value={savedDiagrams.length}
                  label="Diagrams"
                  accessibilityLabel={`Saved diagrams, ${savedDiagrams.length} saved`}
                  onPress={() => router.navigate('/(tabs)/savedDiagrams')}
                />
                <View style={styles.statDivider} />
                <Stat
                  value={notes.length}
                  label="Notes"
                  accessibilityLabel={`Saved notes, ${notes.length} saved`}
                  onPress={() => router.navigate('/(tabs)/savedNotes')}
                />
              </View>
            </LinearGradient>
          </View>

          {/* ACCOUNT */}
          <Group label="ACCOUNT">
            <View nativeID="tour-account-settings">
              <Row
                icon={<ProfileIcon color={COLORS.gray700} />}
                title="Profile"
                subtitle="Manage your account details"
                onPress={toggleProfileExpanded}
                accessibilityLabel="Profile settings"
                expanded={isProfileExpanded}
                trailing={
                  <AnimatedChevron
                    expanded={isProfileExpanded}
                    color={isProfileExpanded ? COLORS.primary : COLORS.gray500}
                  />
                }
              />
              {isProfileExpanded && (
                <View style={styles.subList}>
                  <SubRow
                    icon={<EditIcon color={COLORS.gray700} />}
                    label="Edit Profile"
                    accessibilityLabel="Edit profile"
                    onPress={() => {
                      toggleProfileExpanded();
                      setTimeout(() => setShowEditProfileModal(true), PROFILE_COLLAPSE_DURATION);
                    }}
                  />
                  <SubRow
                    icon={<LockIcon color={COLORS.gray700} />}
                    label={isGoogleUser && !userData.hasPassword ? 'Set Password' : 'Change Password'}
                    accessibilityLabel={isGoogleUser && !userData.hasPassword ? 'Set password' : 'Change password'}
                    onPress={() => {
                      const needsSetPassword = isGoogleUser && !userData.hasPassword;
                      toggleProfileExpanded();
                      setTimeout(() => {
                        if (needsSetPassword) setShowSetPasswordModal(true);
                        else setShowPasswordModal(true);
                      }, PROFILE_COLLAPSE_DURATION);
                    }}
                  />
                </View>
              )}
            </View>
          </Group>

          {/* LIBRARY */}
          <Group label="LIBRARY">
            <Row
              nativeID="tour-account-saved"
              icon={<DiagramIcon color={COLORS.gray700} />}
              title="Saved Diagrams"
              badge={savedDiagrams.length}
              accessibilityLabel={`Saved diagrams, ${savedDiagrams.length} saved`}
              onPress={() => router.navigate('/(tabs)/savedDiagrams')}
            />
            <RowDivider />
            <Row
  nativeID="tour-account-notes"
  icon={<NoteIcon color={COLORS.gray700} />}
  title="Saved Notes"
  badge={notes.length}
  accessibilityLabel={`Saved notes, ${notes.length} saved`}
  onPress={() => router.navigate('/(tabs)/savedNotes')}
/>
          </Group>

          {/* SUPPORT */}
          <Group label="SUPPORT">
            <Row
              nativeID="tour-account-privacy"
              icon={<ShieldIcon color={COLORS.gray700} />}
              title="Privacy"
              subtitle="Terms and policies"
              accessibilityLabel="Privacy, terms and policies"
              onPress={() => router.navigate('/(tabs)/privacy')}
            />
            <RowDivider />
            <Row
              nativeID="tour-account-about"
              icon={<InfoIcon color={COLORS.gray700} />}
              title="About iGraph IT"
              subtitle="The team behind the project"
              accessibilityLabel="About iGraph IT, the team behind the project"
              onPress={() => router.navigate('/(tabs)/aboutUs')}
            />
          </Group>

          {/* Sign out: its own group, no chevron (it's an action, and the confirm modal already exists) */}
          <Group>
            <Row
              tone="danger"
              icon={<SignOutIcon color={COLORS.dangerText} />}
              title="Sign Out"
              showChevron={false}
              accessibilityLabel="Sign out"
              onPress={handleSignOutPress}
            />
          </Group>
        </ScrollView>
      </TouchableWithoutFeedback>

      {/* Modals */}
      <EditProfileModal
        visible={showEditProfileModal}
        onClose={() => setShowEditProfileModal(false)}
        userData={userData}
        onUpdateProfile={handleUpdateProfile}
      />

      <ChangePasswordModal
        visible={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
        onSuccess={handlePasswordSuccess}
        router={router}
      />

      <SetPasswordModal
        visible={showSetPasswordModal}
        onClose={() => setShowSetPasswordModal(false)}
        onSuccess={handleSetPasswordSuccess}
        currentEmail={userData.email}
        verifiedToken={googleVerifiedToken}
        onVerified={setGoogleVerifiedToken}
      />

      <SignOutModal
        visible={showSignOutModal}
        onClose={() => setShowSignOutModal(false)}
        onConfirm={handleSignOutConfirm}
        loading={signOutLoading}
      />

      <Toast visible={toast.visible} message={toast.message} isError={toast.isError} onHide={hideToast} />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.gray50 },

  dotGridContainer: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, overflow: 'hidden' },

  scrollContent: { flexGrow: 1, paddingBottom: 40 },

  skeletonContainer: { flex: 1, backgroundColor: COLORS.gray50 },

  profileCard: { borderRadius: RADIUS.xxl, overflow: 'hidden', ...SHADOWS.md },
  profileBanner: { minHeight: 120 },
  // Sits in the top (name/email) area so it never overlaps the tappable stats row
  profileBannerAccent: { position: 'absolute', right: 0, top: 20 },
  profileInfo: { flexDirection: 'row', alignItems: 'center', padding: SPACING.xxl, gap: SPACING.lg },
  avatarRing: {
    width: 92,
    height: 92,
    borderRadius: RADIUS.full,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatar: { width: 80, height: 80, borderRadius: RADIUS.full, borderWidth: 3, borderColor: COLORS.white },
  avatarPlaceholder: { justifyContent: 'center', alignItems: 'center' },
  avatarInitials: { fontSize: 28, fontWeight: '700', color: COLORS.white },
  userInfo: { flex: 1 },
  userName: { ...TYPOGRAPHY.h3, color: COLORS.white },
  userEmail: { ...TYPOGRAPHY.caption, color: 'rgba(255,255,255,0.92)', marginTop: 2 },

  actionsGrid: { gap: SPACING.md },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    ...SHADOWS.sm,
  },
  actionCardPressed: { backgroundColor: COLORS.gray50, transform: [{ scale: 0.98 }] },
  signOutCard: { marginTop: SPACING.lg },
  actionContent: { flex: 1, marginLeft: SPACING.md },
  actionTitle: { ...TYPOGRAPHY.bodyBold, color: COLORS.gray900 },
  actionDescription: { ...TYPOGRAPHY.small, color: COLORS.gray500, marginTop: 2 },
  signOutText: { color: COLORS.dangerText },

  profileExpandableCard: { backgroundColor: COLORS.white, borderRadius: RADIUS.lg, overflow: 'hidden', ...SHADOWS.sm },
  profileExpandableHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: SPACING.lg },
  profileExpandableHeaderLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: SPACING.md },
  profileExpandableContent: { borderTopWidth: 1, borderTopColor: COLORS.gray100, paddingVertical: SPACING.sm },
  profileOption: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md },
  profileOptionPressed: { backgroundColor: COLORS.gray50 },
  profileOptionLeft: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  profileOptionText: { ...TYPOGRAPHY.body, color: COLORS.gray800 },

  // Mobile: banner goes full-bleed
  profileCardMobile: { marginHorizontal: -SPACING.xl, borderRadius: 0 },

  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.18)',
  },
  stat: { flex: 1, alignItems: 'center', alignSelf: 'stretch', justifyContent: 'center', paddingVertical: SPACING.md },
  statValue: { fontSize: 20, fontWeight: '700', color: COLORS.white, lineHeight: 26 },
  statLabel: { fontSize: 13, color: 'rgba(255,255,255,0.9)', lineHeight: 18 },
  statDivider: { width: 1, height: 28, backgroundColor: 'rgba(255,255,255,0.18)' },

  group: { marginBottom: SPACING.xxl },
  groupLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    color: COLORS.gray500,
    marginBottom: SPACING.sm,
    marginLeft: SPACING.xs,
  },
  groupCard: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.gray200,
    ...SHADOWS.sm,
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: ROW_MIN_HEIGHT,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
  },
  iconTile: {
    width: TILE,
    height: TILE,
    borderRadius: RADIUS.md,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconTileDanger: { backgroundColor: COLORS.dangerLight },
  rowContent: { flex: 1, marginLeft: SPACING.md },
  rowTitle: { ...TYPOGRAPHY.bodyBold, color: COLORS.gray900 },
  rowTitleDanger: { color: COLORS.dangerText },
  rowSubtitle: { fontSize: 13, lineHeight: 18, color: COLORS.gray500, marginTop: 2 },
  rowDivider: {
    height: 1,
    backgroundColor: COLORS.gray100,
    marginLeft: SPACING.lg + TILE + SPACING.md,
  },

  badge: {
    minWidth: 28,
    height: 24,
    paddingHorizontal: SPACING.sm,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.sm,
  },
  badgeText: { fontSize: 13, fontWeight: '700', color: COLORS.primaryDark },

  // Sub-items: icon lines up with the parent title's x position
  subList: { borderTopWidth: 1, borderTopColor: COLORS.gray100 },
  subRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 52,
    paddingRight: SPACING.lg,
    paddingLeft: SPACING.lg + TILE + SPACING.md,
  },
  subIcon: { width: 24, height: 24, alignItems: 'center', justifyContent: 'center', marginRight: SPACING.md },
  subRowText: { flex: 1, ...TYPOGRAPHY.body, color: COLORS.gray800 },


  editProfileModalContainer: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(15,23,42,0.06)',
    ...SHADOWS.modal,
  },
  editProfileField: { paddingHorizontal: SPACING.xl, marginBottom: SPACING.lg },
  editProfileLabel: { ...TYPOGRAPHY.captionBold, color: COLORS.gray700, marginBottom: SPACING.sm, fontWeight: '600' },
  editProfileNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.gray200,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    backgroundColor: COLORS.white,
  },
  editProfileNameInput: {
    flex: 1,
    paddingVertical: 12,
    ...TYPOGRAPHY.body,
    color: COLORS.gray900,
    ...WEB_NO_OUTLINE,
  },
  editProfileInputFocused: {
    borderColor: COLORS.primary,
    borderWidth: 1.5,
  },
  editProfileFieldError: { ...TYPOGRAPHY.small, color: COLORS.danger, marginTop: SPACING.sm },
  editProfileFieldHint: { ...TYPOGRAPHY.small, color: COLORS.gray400, marginTop: SPACING.sm },
  editProfileEmailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: 12,
    backgroundColor: COLORS.gray50,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.gray100,
  },
  editProfileEmail: { ...TYPOGRAPHY.body, color: COLORS.gray500, flex: 1 },
  editProfileFooter: { flexDirection: 'row', gap: SPACING.md, borderTopWidth: 1, borderTopColor: COLORS.gray100 },
  editProfileButton: { flex: 1, paddingVertical: 13, borderRadius: RADIUS.md, alignItems: 'center', justifyContent: 'center', minHeight: 46 },
  editProfileCancelButton: { backgroundColor: 'transparent' },
  editProfileSaveButton: { backgroundColor: COLORS.primary },
  editProfileCancelText: { ...TYPOGRAPHY.bodyBold, color: COLORS.gray600, fontWeight: '600' },
  editProfileSaveText: { ...TYPOGRAPHY.bodyBold, color: COLORS.white },
  modalButtonDisabled: { opacity: 0.45 },
  disabledTouchable: { opacity: 0.4 },
  disabledInput: { backgroundColor: COLORS.gray50, opacity: 0.7 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.45)', justifyContent: 'center', alignItems: 'center', padding: SPACING.xl },
  modalWrapper: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  modalContainer: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(15,23,42,0.06)',
    ...SHADOWS.modal,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray100,
  },
  modalTitle: { ...TYPOGRAPHY.h3, color: COLORS.gray900, fontWeight: '600' },
  modalClose: { padding: 6, borderRadius: RADIUS.full, ...WEB_NO_OUTLINE },
  modalError: {
    ...TYPOGRAPHY.small,
    color: COLORS.dangerText,
    marginTop: SPACING.sm,
    marginHorizontal: SPACING.xl,
    backgroundColor: COLORS.dangerLight,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.sm,
  },
  modalButton: {
    backgroundColor: COLORS.primary,
    margin: SPACING.xl,
    paddingVertical: SPACING.lg,
    borderRadius: RADIUS.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.primaryDark,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
  },
  modalButtonText: { ...TYPOGRAPHY.bodyBold, color: COLORS.white },

  // Sign-out confirmation: same shell as the other modals, left-aligned.
  signOutDialog: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.xl,
    padding: SPACING.xxl,
    borderWidth: 1,
    borderColor: 'rgba(15,23,42,0.06)',
    ...SHADOWS.modal,
  },
  signOutTitle: { ...TYPOGRAPHY.h3, color: COLORS.gray900, fontWeight: '600' },
  signOutMessage: {
    ...TYPOGRAPHY.caption,
    color: COLORS.gray600,
    marginTop: SPACING.sm,
    ...Platform.select({ web: { textWrap: 'pretty' } as any }),
  },
  signOutActions: { flexDirection: 'row', gap: SPACING.md, marginTop: SPACING.xxl },
  signOutButton: {
    flex: 1,
    minHeight: 46,
    paddingVertical: 13,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  signOutCancel: { backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.gray200 },
  signOutConfirm: { backgroundColor: COLORS.primary },
  signOutCancelText: { ...TYPOGRAPHY.bodyBold, color: COLORS.gray700 },
  signOutConfirmText: { ...TYPOGRAPHY.bodyBold, color: COLORS.white },

  passwordInputWrapper: { paddingHorizontal: SPACING.xl, paddingTop: SPACING.lg },
  inputLabel: { ...TYPOGRAPHY.captionBold, color: COLORS.gray700, marginBottom: SPACING.sm, fontWeight: '600' },
  passwordInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.gray200,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.white,
    paddingHorizontal: SPACING.md,
  },
  passwordInputFocused: { borderColor: COLORS.primary, borderWidth: 1.5 },
  inputError: { borderColor: COLORS.dangerText },
  passwordInput: { flex: 1, paddingVertical: 12, ...TYPOGRAPHY.body, color: COLORS.gray900, ...WEB_NO_OUTLINE },
  passwordEyeBtn: { padding: SPACING.sm, marginRight: -SPACING.sm, borderRadius: RADIUS.sm, ...WEB_NO_OUTLINE },

  strengthMeterWrap: { marginTop: SPACING.sm, flexDirection: 'row', alignItems: 'center' },
  strengthSegmentRow: { flex: 1, flexDirection: 'row', gap: 3, marginRight: SPACING.sm },
  strengthSegment: { flex: 1, height: 3, borderRadius: RADIUS.full, backgroundColor: COLORS.gray200 },
  strengthMeterText: { ...TYPOGRAPHY.small, fontWeight: '600' },
  passwordChecklist: { marginTop: SPACING.sm },
  checklistRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 3 },
  checklistDot: {
    width: 4,
    height: 4,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.gray400,
    marginRight: SPACING.sm,
    marginTop: 7,
  },
  checklistDotMet: { backgroundColor: COLORS.success },
  checklistText: { ...TYPOGRAPHY.small, color: COLORS.gray500 },
  checklistTextMet: { color: COLORS.gray400, textDecorationLine: 'line-through' },
  passwordMismatchText: { ...TYPOGRAPHY.small, color: COLORS.dangerText, marginTop: SPACING.sm },
  matchSuccess: { color: COLORS.success, marginTop: SPACING.sm, fontSize: 12, fontWeight: '500' },

  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.xl,
    paddingBottom: SPACING.lg,
  },
  modalHeaderIconTitle: { flex: 1, paddingRight: SPACING.lg },
  modalIconCircleSmall: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalHeaderTextCol: { flex: 1 },
  modalSubtitle: { ...TYPOGRAPHY.small, color: COLORS.gray500, marginTop: 4, lineHeight: 17 },
  modalFooterRow: {
    flexDirection: 'row',
    gap: SPACING.md,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.lg,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray100,
  },
  modalPrimaryButton: {
    flex: 1,
    backgroundColor: COLORS.primary,
    paddingVertical: 13,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 46,
  },
  modalSecondaryButton: {
    flex: 1,
    backgroundColor: 'transparent',
    paddingVertical: 13,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 46,
  },
  modalSecondaryButtonText: { ...TYPOGRAPHY.bodyBold, color: COLORS.gray600, fontWeight: '600' },
  setPasswordVerifyStep: { paddingHorizontal: SPACING.xl, paddingTop: SPACING.sm, paddingBottom: SPACING.xl },
  setPasswordVerifyText: { ...TYPOGRAPHY.body, fontSize: 14, color: COLORS.gray600, lineHeight: 20, marginBottom: SPACING.lg, flex: 1 },
  setPasswordVerifiedRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
    backgroundColor: COLORS.successLight,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
  },
  setPasswordVerifiedCheck: {
    width: 20,
    height: 20,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.success,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 1,
  },
  setPasswordSwitchAccountText: {
    ...TYPOGRAPHY.small,
    color: COLORS.gray500,
    textAlign: 'center',
    marginTop: SPACING.md,
    textDecorationLine: 'underline',
  },
  googleVerifyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.gray200,
    borderRadius: RADIUS.md,
    paddingVertical: 13,
    backgroundColor: COLORS.white,
  },
  googleVerifyButtonText: { ...TYPOGRAPHY.bodyBold, color: COLORS.gray700, fontWeight: '600' },
  wrongAccountBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
    backgroundColor: COLORS.dangerLight,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginHorizontal: SPACING.xl,
    marginBottom: SPACING.lg,
  },
  wrongAccountBannerText: { ...TYPOGRAPHY.small, color: COLORS.dangerText, flex: 1, lineHeight: 17 },

  toastContainer: { position: 'absolute', top: Platform.OS === 'ios' ? 60 : 50, left: SPACING.xl, right: SPACING.xl, zIndex: 1000, alignItems: 'center' },
  toastContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.lg,
    minWidth: 200,
    maxWidth: '90%',
    ...SHADOWS.lg,
  },
  toastIcon: { marginRight: SPACING.sm },
  toastSuccess: { backgroundColor: COLORS.success },
  toastError: { backgroundColor: COLORS.danger },
  toastText: { ...TYPOGRAPHY.captionBold, color: COLORS.white, flex: 1 },
});