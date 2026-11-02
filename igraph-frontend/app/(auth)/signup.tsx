import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TextInputProps,
  Pressable,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Platform,
  Image,
  KeyboardAvoidingView,
  Animated,
  Easing,
  AccessibilityInfo,
  useWindowDimensions,
} from 'react-native';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { Svg, Circle, Ellipse, Rect, Path, G, Defs, LinearGradient, Stop } from 'react-native-svg';
import { initializeApp, FirebaseApp, getApps } from 'firebase/app';
import {
  getAuth,
  Auth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  browserSessionPersistence,
  setPersistence,
} from 'firebase/auth';
import * as WebBrowser from 'expo-web-browser';
import * as authService from '@/services/authService';
import { markNewUserForOnboarding } from '@/utils/onboardingTour';
import { usePageTitle } from '@/utils/usePageTitle';

/* -------------------------------------------------------------------------- */
/*  Firebase                                                                  */
/* -------------------------------------------------------------------------- */

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

let firebaseApp: FirebaseApp | undefined;
let auth: Auth | undefined;

if (!getApps().length) {
  firebaseApp = initializeApp(firebaseConfig);
} else {
  firebaseApp = getApps()[0];
}
auth = getAuth(firebaseApp);

if (Platform.OS === 'web' && auth) {
  setPersistence(auth, browserSessionPersistence).catch((err) => {
    console.warn('[Firebase] Persistence setting failed:', err.message);
  });
}

WebBrowser.maybeCompleteAuthSession();

/* -------------------------------------------------------------------------- */
/*  Design tokens                                                             */
/* -------------------------------------------------------------------------- */

const COLORS = {
  brand: '#3B5BDB',
  brandDark: '#2F49C7',
  brandDisabled: '#6F86E6',
  ink: '#0F172A',
  label: '#1E293B',
  body: '#475569',
  muted: '#64748B', // placeholders, icons, helper text (AA on white)
  border: '#DDE3FA',
  error: '#DC2626',
  errorBg: '#FEF2F2',
  errorBorder: '#FECACA',
  errorText: '#991B1B',
  success: '#047857',
  amber: '#B45309',
  orange: '#C2410C',
};

// One font stack for every text node, including TextInput and the Google button.
const FONT: string | undefined = Platform.select({
  web: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  default: undefined,
});

/* -------------------------------------------------------------------------- */
/*  Accessibility helpers                                                     */
/* -------------------------------------------------------------------------- */

// Focus rings on buttons/links should show for keyboard users, not after a mouse click.
let keyboardNavigation = false;
if (Platform.OS === 'web' && typeof window !== 'undefined') {
  window.addEventListener('keydown', (e) => { if (e.key === 'Tab') keyboardNavigation = true; }, true);
  window.addEventListener('pointerdown', () => { keyboardNavigation = false; }, true);
}

const webRing = (color: string = COLORS.brand, offset = 2): any =>
  Platform.OS === 'web'
    ? { outlineWidth: 2, outlineStyle: 'solid', outlineColor: color, outlineOffset: offset }
    : null;

const webNoOutline: any = Platform.OS === 'web' ? { outlineStyle: 'none' } : null;

const useKeyboardFocus = () => {
  const [focused, setFocused] = useState(false);
  return {
    focused,
    focusProps: {
      onFocus: () => setFocused(Platform.OS === 'web' && keyboardNavigation),
      onBlur: () => setFocused(false),
    },
  };
};

// null until the system setting has been read, so nothing animates by mistake.
const useReduceMotion = () => {
  const [reduce, setReduce] = useState<boolean | null>(null);
  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((value) => { if (mounted) setReduce(value); })
      .catch(() => { if (mounted) setReduce(false); });
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduce);
    return () => {
      mounted = false;
      sub?.remove?.();
    };
  }, []);
  return reduce;
};

/* -------------------------------------------------------------------------- */
/*  Validation                                                                */
/* -------------------------------------------------------------------------- */

const SPECIAL_CHARS_REGEX = /[!@#$%^&*(),.?":{}|<>]/;
const NAME_REGEX = /^[A-Za-zÀ-ÖØ-öø-ÿ]+(?:[ '-][A-Za-zÀ-ÖØ-öø-ÿ]+)*$/;

const PASSWORD_RULES = [
  { key: 'length', label: '8+ characters', test: (p: string) => p.length >= 8 },
  { key: 'upper', label: 'Uppercase letter', test: (p: string) => /[A-Z]/.test(p) },
  { key: 'lower', label: 'Lowercase letter', test: (p: string) => /[a-z]/.test(p) },
  { key: 'number', label: 'Number', test: (p: string) => /[0-9]/.test(p) },
  { key: 'special', label: 'Special character', test: (p: string) => SPECIAL_CHARS_REGEX.test(p) },
];

const IOS_PASSWORD_RULES =
  'minlength: 8; required: lower; required: upper; required: digit; required: [!@#$%^&*(),.?":{}|<>];';

const validateName = (value: string): string => {
  const name = value.trim();
  if (!name) return 'Name is required.';
  if (name.length < 2 || name.length > 100) return 'Name must be between 2 and 100 characters.';
  if (!NAME_REGEX.test(name)) return 'Use letters, spaces, hyphens and apostrophes only, with no repeated symbols.';
  return '';
};

const validateEmail = (value: string): string => {
  const email = value.trim();
  if (!email) return 'Email address is required.';
  if (!/\S+@\S+\.\S+/.test(email)) return 'Enter a valid email address.';
  return '';
};

const getStrength = (score: number) => {
  if (score === 5) return { label: 'Strong', color: COLORS.success };
  if (score === 4) return { label: 'Good', color: COLORS.amber };
  if (score === 3) return { label: 'Fair', color: COLORS.orange };
  return { label: 'Weak', color: COLORS.error };
};

const getLogoSize = (windowWidth: number, windowHeight: number): number => {
  const short = windowHeight < 680;
  if (windowWidth < 480) return short ? 36 : 42;
  return short ? 44 : 52;
};

/* -------------------------------------------------------------------------- */
/*  Icons                                                                     */
/* -------------------------------------------------------------------------- */

const GoogleIcon = ({ dimmed = false }: { dimmed?: boolean }) => (
  <Svg width={18} height={18} viewBox="0 0 24 24" opacity={dimmed ? 0.5 : 1}>
    <Path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
    <Path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
    <Path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
    <Path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
  </Svg>
);

const EyeIcon = ({ visible }: { visible: boolean }) => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
    {visible ? (
      <>
        <Path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke={COLORS.muted} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
        <Circle cx={12} cy={12} r={3} stroke={COLORS.muted} strokeWidth={1.8} />
      </>
    ) : (
      <>
        <Path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94" stroke={COLORS.muted} strokeWidth={1.8} strokeLinecap="round" />
        <Path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19" stroke={COLORS.muted} strokeWidth={1.8} strokeLinecap="round" />
        <Path d="M1 1l22 22" stroke={COLORS.muted} strokeWidth={1.8} strokeLinecap="round" />
      </>
    )}
  </Svg>
);

const AlertIcon = () => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="12" r="10" stroke={COLORS.error} strokeWidth="1.8" />
    <Path d="M12 8v4M12 16h.01" stroke={COLORS.error} strokeWidth="2" strokeLinecap="round" />
  </Svg>
);

type StatusState = 'met' | 'unmet' | 'neutral';

const StatusIcon = ({ state }: { state: StatusState }) => (
  <Svg width={14} height={14} viewBox="0 0 14 14" fill="none">
    {state === 'met' && (
      <>
        <Circle cx="7" cy="7" r="7" fill={COLORS.success} />
        <Path d="M4 7.2l2 2L10 5" stroke="#ffffff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </>
    )}
    {state === 'unmet' && (
      <>
        <Circle cx="7" cy="7" r="6.2" stroke={COLORS.error} strokeWidth="1.4" />
        <Path d="M4.8 4.8l4.4 4.4M9.2 4.8L4.8 9.2" stroke={COLORS.error} strokeWidth="1.4" strokeLinecap="round" />
      </>
    )}
    {state === 'neutral' && <Circle cx="7" cy="7" r="6.2" stroke={COLORS.muted} strokeWidth="1.4" />}
  </Svg>
);

/* -------------------------------------------------------------------------- */
/*  Logo tile                                                                 */
/* -------------------------------------------------------------------------- */

const AnimatedLogo = ({
  size,
  showSuccess = false,
  reduceMotion,
  onAnimationComplete,
}: {
  size: number;
  showSuccess?: boolean;
  reduceMotion: boolean | null;
  onAnimationComplete?: () => void;
}) => {
  const entranceAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (reduceMotion === null) return;
    if (reduceMotion) {
      entranceAnim.setValue(1);
      rotateAnim.setValue(1);
      return;
    }
    Animated.parallel([
      Animated.spring(entranceAnim, { toValue: 1, friction: 6, tension: 40, useNativeDriver: true }),
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 600,
        easing: Easing.out(Easing.back(0.5)),
        useNativeDriver: true,
      }),
    ]).start();
  }, [reduceMotion]);

  useEffect(() => {
    if (!showSuccess) return;
    if (reduceMotion) {
      onAnimationComplete?.();
      return;
    }
    Animated.sequence([
      Animated.spring(pulseAnim, { toValue: 1.3, friction: 2, tension: 60, useNativeDriver: true }),
      Animated.spring(pulseAnim, { toValue: 1, friction: 4, tension: 40, useNativeDriver: true }),
      Animated.spring(pulseAnim, { toValue: 1.1, friction: 3, tension: 50, useNativeDriver: true }),
      Animated.spring(pulseAnim, { toValue: 1, friction: 5, useNativeDriver: true }),
    ]).start(() => onAnimationComplete?.());
  }, [showSuccess]);

  const scale = entranceAnim.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1] });
  const rotate = rotateAnim.interpolate({ inputRange: [0, 1], outputRange: ['-13deg', '-8deg'] });
  const opacity = entranceAnim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 0.5, 1] });

  const containerSize = size * 1.5;

  return (
    <Animated.View
      style={[
        styles.logoTile,
        {
          opacity,
          transform: [{ scale }, { scale: pulseAnim }, { rotate }],
          width: containerSize,
          height: containerSize,
          borderRadius: containerSize * 0.22,
        },
      ]}
    >
      <Image
        source={require('../../assets/images/logo1.png')}
        style={{ width: size, height: size, borderRadius: size * 0.22, backgroundColor: 'transparent' }}
        resizeMode="contain"
        accessibilityLabel="iGraphIT logo"
      />
    </Animated.View>
  );
};

/* -------------------------------------------------------------------------- */
/*  Background (decorative, responsive)                                       */
/* -------------------------------------------------------------------------- */

const DiagramBackground = React.memo(function DiagramBackground() {
  const { width: w, height: h } = useWindowDimensions();
  const showDoodles = w >= 640; // on phones the card covers them anyway
  const s = w < 1000 ? 0.85 : 1;

  const classX = w * 0.06;
  const classY = h * 0.09;
  const erdX = w * 0.72;
  const erdY = h * 0.13;
  const actorX = w * 0.1;
  const actorY = h * 0.6;
  const ovalX = w * 0.24;
  const ovalY = actorY + 6 * s;
  const flowX = w * 0.8;
  const flowY = h * 0.66;
  const lifeX = w * 0.9;
  const lifeY = h * 0.35;

  const line = '#a9b8ff';
  const fill = '#c3cdff';

  return (
    <View
      style={StyleSheet.absoluteFillObject}
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      {...({ 'aria-hidden': true } as any)}
    >
      <Svg width={w} height={h} style={StyleSheet.absoluteFillObject}>
        <Defs>
          <LinearGradient id="bgWash" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#e8edff" stopOpacity="1" />
            <Stop offset="55%" stopColor="#eef2ff" stopOpacity="1" />
            <Stop offset="100%" stopColor="#e3e9ff" stopOpacity="1" />
          </LinearGradient>
          <LinearGradient id="blobTopRight" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#c7d2fe" stopOpacity="0.55" />
            <Stop offset="100%" stopColor="#c7d2fe" stopOpacity="0" />
          </LinearGradient>
          <LinearGradient id="blobBottomLeft" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#b6c2ff" stopOpacity="0.45" />
            <Stop offset="100%" stopColor="#b6c2ff" stopOpacity="0" />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width={w} height={h} fill="url(#bgWash)" />
        <Circle cx={w * 0.9} cy={h * 0.08} r={Math.max(w, 400) * 0.55} fill="url(#blobTopRight)" />
        <Circle cx={w * 0.05} cy={h * 0.95} r={Math.max(w, 400) * 0.5} fill="url(#blobBottomLeft)" />
      </Svg>

      <Image source={require('../../assets/images/grid-bg.png')} style={styles.gridBackground} resizeMode="repeat" />
      <View style={styles.gridOverlay} />

      {showDoodles && (
        <Svg width={w} height={h} style={StyleSheet.absoluteFillObject}>
          {/* Association line between the class box and the ERD entity */}
          <Path
            d={`M ${classX + 118 * s} ${classY + 44 * s} C ${w * 0.34} ${h * 0.05}, ${w * 0.58} ${h * 0.12}, ${erdX} ${erdY + 35 * s}`}
            stroke={line}
            strokeWidth="1.5"
            fill="none"
            opacity={0.45}
          />
          <Circle cx={classX + 122 * s} cy={classY + 44 * s} r="2.5" fill={line} opacity={0.5} />

          {/* Class diagram */}
          <G transform={`translate(${classX} ${classY}) scale(${s})`} opacity={0.55}>
            <Rect width="118" height="88" rx="6" stroke={line} strokeWidth="1.5" fill="#ffffff" fillOpacity="0.4" />
            <Path d="M 0 26 h 118 M 0 58 h 118" stroke={line} strokeWidth="1.5" />
            <Rect x="10" y="10" width="54" height="7" rx="3" fill={line} opacity="0.8" />
            <Rect x="10" y="35" width="40" height="5" rx="2.5" fill={fill} />
            <Rect x="10" y="45" width="60" height="5" rx="2.5" fill={fill} />
            <Rect x="10" y="67" width="48" height="5" rx="2.5" fill={fill} />
            <Rect x="10" y="77" width="56" height="5" rx="2.5" fill={fill} />
          </G>

          {/* ERD entity */}
          <G transform={`translate(${erdX} ${erdY}) scale(${s})`} opacity={0.5}>
            <Rect width="132" height="70" rx="6" stroke={line} strokeWidth="1.5" fill="#ffffff" fillOpacity="0.4" />
            <Path d="M 0 22 h 132" stroke={line} strokeWidth="1.5" />
            <Rect x="10" y="8" width="50" height="6" rx="3" fill={line} opacity="0.8" />
            <Circle cx="12" cy="34" r="2" fill={fill} />
            <Rect x="20" y="31" width="46" height="5" rx="2.5" fill={fill} />
            <Circle cx="12" cy="48" r="2" fill={fill} />
            <Rect x="20" y="45" width="58" height="5" rx="2.5" fill={fill} />
          </G>

          {/* Actor, dashed link, use-case oval */}
          <Path
            d={`M ${actorX + 12 * s} ${actorY + 12 * s} L ${ovalX - 22 * s} ${ovalY}`}
            stroke={line}
            strokeWidth="1.5"
            strokeDasharray="5 6"
            opacity={0.45}
          />
          <G transform={`translate(${actorX} ${actorY}) scale(${s})`} opacity={0.5}>
            <Circle cx="0" cy="0" r="4.5" stroke={line} strokeWidth="1.6" fill="none" />
            <Path d="M 0 4.5 v 16 M -8 12 h 16 M 0 20.5 l -7 12 M 0 20.5 l 7 12" stroke={line} strokeWidth="1.6" fill="none" />
          </G>
          <Ellipse cx={ovalX} cy={ovalY} rx={22 * s} ry={13 * s} stroke={line} strokeWidth="1.5" fill="#ffffff" fillOpacity="0.35" opacity={0.5} />

          {/* Flowchart: decision + terminator */}
          <G transform={`translate(${flowX} ${flowY}) scale(${s})`} opacity={0.5}>
            <Path d="M 0 0 L 20 14 L 0 28 L -20 14 Z" stroke={line} strokeWidth="1.5" fill="#ffffff" fillOpacity="0.35" />
            <Path d="M 0 28 v 22" stroke={line} strokeWidth="1.5" strokeDasharray="4 5" opacity="0.8" />
            <Rect x="-30" y="50" width="60" height="24" rx="12" stroke={line} strokeWidth="1.5" fill="#ffffff" fillOpacity="0.35" />
          </G>

          {/* Sequence-diagram lifeline */}
          <G transform={`translate(${lifeX} ${lifeY}) scale(${s})`} opacity={0.35}>
            <Path d="M 0 0 v 90" stroke="#bfd0ff" strokeWidth="1.4" strokeDasharray="3 6" />
            <Rect x="-26" y="0" width="52" height="18" rx="4" stroke="#bfd0ff" strokeWidth="1.4" fill="none" />
          </G>
        </Svg>
      )}
    </View>
  );
});

/* -------------------------------------------------------------------------- */
/*  Form building blocks                                                      */
/* -------------------------------------------------------------------------- */

type ButtonProps = {
  label: string;
  loadingLabel?: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: 'primary' | 'secondary';
  icon?: React.ReactNode;
};

const Button = ({ label, loadingLabel, onPress, disabled, loading, variant = 'primary', icon }: ButtonProps) => {
  const { focused, focusProps } = useKeyboardFocus();
  const primary = variant === 'primary';
  const inactive = !!disabled && !loading;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={loading && loadingLabel ? loadingLabel : label}
      accessibilityState={{ disabled: !!disabled || !!loading, busy: !!loading }}
      disabled={!!disabled || !!loading}
      onPress={onPress}
      {...focusProps}
      style={({ pressed }) => [
        styles.btn,
        primary ? styles.btnPrimary : styles.btnSecondary,
        inactive && (primary ? styles.btnPrimaryDisabled : styles.btnSecondaryDisabled),
        pressed && !inactive && styles.btnPressed,
        focused && webRing(),
      ]}
    >
      {loading ? (
        <>
          <ActivityIndicator color={primary ? '#ffffff' : COLORS.brand} size="small" />
          <Text style={primary ? styles.btnPrimaryText : styles.btnSecondaryText}>{loadingLabel || label}</Text>
        </>
      ) : (
        <>
          {icon}
          <Text style={[primary ? styles.btnPrimaryText : styles.btnSecondaryText, inactive && !primary && styles.btnSecondaryTextDisabled]}>
            {label}
          </Text>
        </>
      )}
    </Pressable>
  );
};

const LinkButton = ({ label, onPress }: { label: string; onPress: () => void }) => {
  const { focused, focusProps } = useKeyboardFocus();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="link"
      accessibilityLabel={label}
      {...focusProps}
      style={[styles.linkButton, focused && webRing(COLORS.brand, 0)]}
    >
      <Text style={styles.signinLink}>{label}</Text>
    </Pressable>
  );
};

const PasswordToggle = ({ visible, onToggle }: { visible: boolean; onToggle: () => void }) => {
  const { focused, focusProps } = useKeyboardFocus();
  return (
    <Pressable
      onPress={onToggle}
      accessibilityRole="button"
      accessibilityLabel={visible ? 'Hide password' : 'Show password'}
      {...focusProps}
      style={[styles.eyeBtn, focused && webRing(COLORS.brand, -2)]}
    >
      <EyeIcon visible={visible} />
    </Pressable>
  );
};

const Checkbox = ({ checked, invalid, onToggle }: { checked: boolean; invalid: boolean; onToggle: () => void }) => {
  const { focused, focusProps } = useKeyboardFocus();
  return (
    <Pressable
      onPress={onToggle}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      accessibilityLabel="Agree to the Terms and Conditions and Privacy Policy"
      hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
      {...focusProps}
      style={[
        styles.checkbox,
        checked && styles.checkboxChecked,
        invalid && !checked && styles.checkboxInvalid,
        focused && webRing(invalid ? COLORS.error : COLORS.brand),
      ]}
    >
      {checked && (
        <Svg width={12} height={12} viewBox="0 0 10 10">
          <Path d="M2 5l2.5 2.5L8 3" stroke="#ffffff" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </Svg>
      )}
    </Pressable>
  );
};

type TextFieldProps = TextInputProps & {
  label: string;
  error?: string;
  invalid?: boolean;
  inputRef?: React.Ref<TextInput>;
  right?: React.ReactNode;
  children?: React.ReactNode;
};

const TextField = ({ label, error, invalid, inputRef, right, children, onFocus, onBlur, ...inputProps }: TextFieldProps) => {
  const [focused, setFocused] = useState(false);
  const hasError = !!error || !!invalid;
  const stateColor = hasError ? COLORS.error : COLORS.brand;

  return (
    <View style={styles.formGroup}>
      <Text style={styles.label}>{label}</Text>
      <View
        style={[
          styles.inputWrap,
          (focused || hasError) && { borderColor: stateColor },
          focused && styles.inputWrapFocused,
          focused && webRing(stateColor, 1),
        ]}
      >
        <TextInput
          ref={inputRef}
          style={[styles.input, right ? styles.inputWithRight : null, webNoOutline]}
          placeholderTextColor={COLORS.muted}
          selectionColor={COLORS.brand}
          cursorColor={COLORS.brand}
          underlineColorAndroid="transparent"
          accessibilityLabel={label}
          {...inputProps}
          onFocus={(e) => { setFocused(true); onFocus?.(e); }}
          onBlur={(e) => { setFocused(false); onBlur?.(e); }}
        />
        {right}
      </View>
      {children}
      {error ? (
        <Text style={styles.fieldError} accessibilityRole="alert">
          {error}
        </Text>
      ) : null}
    </View>
  );
};

const PasswordChecklist = ({ password, flagUnmet }: { password: string; flagUnmet: boolean }) => {
  const results = PASSWORD_RULES.map((rule) => ({ ...rule, met: rule.test(password) }));
  const score = results.filter((r) => r.met).length;
  const strength = getStrength(score);

  return (
    <View style={styles.checklist}>
      {password.length > 0 && (
        <View style={styles.strengthRow}>
          <View style={styles.strengthBar}>
            <View style={[styles.strengthFill, { width: `${(score / PASSWORD_RULES.length) * 100}%`, backgroundColor: strength.color }]} />
          </View>
          <Text style={[styles.strengthText, { color: strength.color }]}>{strength.label}</Text>
        </View>
      )}
      <View style={styles.rulesGrid}>
        {results.map((rule) => {
          const state: StatusState = rule.met ? 'met' : flagUnmet ? 'unmet' : 'neutral';
          const color = state === 'met' ? COLORS.success : state === 'unmet' ? COLORS.error : COLORS.muted;
          return (
            <View key={rule.key} style={styles.ruleItem}>
              <StatusIcon state={state} />
              <Text style={[styles.ruleText, { color }]} accessibilityLabel={`${rule.label}, ${rule.met ? 'met' : 'not met'}`}>
                {rule.label}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
};

/* -------------------------------------------------------------------------- */
/*  Screen                                                                    */
/* -------------------------------------------------------------------------- */

export default function SignUp() {
  usePageTitle('Sign Up');
  const router = useRouter();
  const params = useLocalSearchParams();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const reduceMotion = useReduceMotion();

  const isCompact = windowWidth < 400;
  const logoSize = getLogoSize(windowWidth, windowHeight);
  const logoContainer = logoSize * 1.5;

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState(typeof params.prefilledEmail === 'string' ? params.prefilledEmail : '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreed, setAgreed] = useState(false);

  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false);
  const [isAnimatingOut, setIsAnimatingOut] = useState(false);

  const [formError, setFormError] = useState('');
  const [emailInlineError, setEmailInlineError] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [touched, setTouched] = useState({ fullName: false, email: false, password: false, confirm: false });
  const [passwordFocused, setPasswordFocused] = useState(false);

  const cardOpacity = useRef(new Animated.Value(0)).current;
  const cardTranslateY = useRef(new Animated.Value(20)).current;

  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const confirmPasswordRef = useRef<TextInput>(null);
  const googleSignInInProgress = useRef(false);

  /* ----- derived state ---------------------------------------------------- */

  const busy = loading || googleLoading;
  const nameError = validateName(fullName);
  const emailError = validateEmail(email);
  const passwordMet = PASSWORD_RULES.every((rule) => rule.test(password));
  const passwordsMatch = confirmPassword.length > 0 && password === confirmPassword;
  const formValid = !nameError && !emailError && passwordMet && passwordsMatch && agreed;

  const visibleNameError = touched.fullName || submitted ? nameError : '';
  const visibleEmailError = emailInlineError || (touched.email || submitted ? emailError : '');

  const flagUnmet = (touched.password && password.length > 0) || submitted;
  const passwordInvalid = flagUnmet && !passwordMet;
  const passwordRequiredError = submitted && !password ? 'Password is required.' : '';

  const showMismatch =
    confirmPassword.length > 0 && !passwordsMatch && (touched.confirm || confirmPassword.length >= password.length);
  const confirmError = showMismatch
    ? "Passwords don't match."
    : submitted && !confirmPassword
    ? 'Please confirm your password.'
    : '';

  /* ----- effects ---------------------------------------------------------- */

  useEffect(() => {
    if (reduceMotion === null) return;
    if (reduceMotion || params.prefilledEmail !== undefined) {
      cardOpacity.setValue(1);
      cardTranslateY.setValue(0);
      return;
    }
    Animated.parallel([
      Animated.timing(cardOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.timing(cardTranslateY, {
        toValue: 0,
        duration: 400,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [reduceMotion]);

  useEffect(() => {
    const handleRedirectResult = async () => {
      if (!auth || Platform.OS === 'web') return;
      try {
        const result = await getRedirectResult(auth);
        if (result) {
          setGoogleLoading(true);
          await handleGoogleSignInResult(result);
        }
      } catch (error: any) {
        console.error('Redirect result error:', error);
        setGoogleLoading(false);
      }
    };
    handleRedirectResult();
  }, []);

  /* ----- navigation ------------------------------------------------------- */

  const openTerms = useCallback(() => {
    router.push('/(auth)/terms');
  }, [router]);

  const navigateToSignIn = useCallback(() => {
    if (isAnimatingOut) return;
    const go = () =>
      router.replace({
        pathname: '/(auth)/signin',
        params: email ? { prefilledEmail: email } : {},
      });

    if (reduceMotion) {
      go();
      return;
    }
    setIsAnimatingOut(true);
    Animated.parallel([
      Animated.timing(cardOpacity, { toValue: 0, duration: 150, useNativeDriver: true }),
      Animated.timing(cardTranslateY, {
        toValue: -20,
        duration: 150,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start(go);
  }, [cardOpacity, cardTranslateY, router, email, isAnimatingOut, reduceMotion]);

  /* ----- sign up ---------------------------------------------------------- */

  const applySignUpError = (message: string, code?: string) => {
    const lower = (message || '').toLowerCase();
    if (code === 'GOOGLE_ACCOUNT' || lower.includes('google') || lower.includes('oauth')) {
      setEmailInlineError('This email is already registered with Google.');
    } else if (lower.includes('already registered') || lower.includes('already exists')) {
      setEmailInlineError('An account with this email already exists.');
    } else {
      setFormError(message || 'Something went wrong. Please try again.');
    }
  };

  const handleSignUp = async () => {
    if (busy) return;
    setFormError('');
    setEmailInlineError('');
    setSubmitted(true);
    if (!formValid) return;

    setLoading(true);
    const startTime = Date.now();

    try {
      const result = await authService.signUp({
        fullName: fullName.trim(),
        email: email.trim(),
        password,
      });
      const elapsed = Date.now() - startTime;
      if (elapsed < 500) await new Promise((r) => setTimeout(r, 500 - elapsed));

      if (result.success) {
        router.push({ pathname: '/(auth)/verify-otp', params: { email: email.trim(), purpose: 'register' } });
      } else {
        applySignUpError(result.message || '', result.code);
      }
    } catch (error: any) {
      console.error('Sign up error:', error);
      const data = error?.response?.data;
      if (data?.message) {
        applySignUpError(data.message, data.code);
      } else {
        setFormError(error?.message || 'Something went wrong. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  /* ----- google ----------------------------------------------------------- */

  const handleGoogleSignInResult = async (result: any) => {
    try {
      const idToken = await result.user.getIdToken();
      // No "Remember me" on signup (there's nothing to remember yet) — true matches
      // the email/password signup path, which the backend already treats as persistent.
      const apiResult = await authService.googleAuth(idToken, null, true);

      if (apiResult.success) {
        if (apiResult.data?.isNewUser) markNewUserForOnboarding();
        setShowSuccessAnimation(true);
        setTimeout(() => { router.replace('/(tabs)/home'); }, reduceMotion ? 0 : 700);
      } else {
        await auth?.signOut();
        const msg = apiResult.message || '';
        const lower = msg.toLowerCase();
        if (lower.includes('already registered') || lower.includes('already exists') || lower.includes('email/password')) {
          const googleEmail = result.user.email || '';
          if (googleEmail) setEmail(googleEmail);
          setEmailInlineError('An account with this email already exists.');
        } else {
          setFormError(msg || 'Google sign up failed. Please try again.');
        }
      }
    } catch (error: any) {
      console.error('Error handling Google sign-in result:', error);
      if (error.response?.status === 409) {
        setEmailInlineError('An account with this email already exists.');
      } else if (error.code === 'ECONNABORTED' || error.message?.toLowerCase().includes('timeout')) {
        setFormError('Our server is waking up after being idle. Please try again in a few seconds.');
      } else {
        setFormError(error.message || 'Something went wrong. Please try again.');
      }
    } finally {
      setGoogleLoading(false);
      googleSignInInProgress.current = false;
    }
  };

  const handleGoogleSignIn = async () => {
    setFormError('');
    setEmailInlineError('');

    if (!agreed) {
      setSubmitted(true);
      return;
    }
    if (!auth) {
      setFormError('Google sign up is not available right now.');
      return;
    }
    if (googleSignInInProgress.current) return;
    googleSignInInProgress.current = true;
    authService.pingBackend?.(); // Wake up free-tier backend while the user picks an account

    // Native uses a full-page redirect, so show loading immediately. Web uses a popup,
    // so only show loading once an account has been picked.
    if (Platform.OS !== 'web') setGoogleLoading(true);

    // Firebase can take several seconds to reject signInWithPopup after the user closes it.
    // Closing the popup hands focus back to this window almost immediately, so use that
    // as a fast signal to unblock the button instead of waiting on Firebase.
    let settled = false;
    let unstickTimer: ReturnType<typeof setTimeout> | undefined;
    const handleWindowFocus = () => {
      unstickTimer = setTimeout(() => {
        if (!settled) googleSignInInProgress.current = false;
      }, 300);
    };
    if (Platform.OS === 'web') window.addEventListener('focus', handleWindowFocus);
    const stopWatchingFocus = () => {
      settled = true;
      clearTimeout(unstickTimer);
      if (Platform.OS === 'web') window.removeEventListener('focus', handleWindowFocus);
    };

    try {
      const provider = new GoogleAuthProvider();
      provider.addScope('email');
      provider.addScope('profile');
      // See signin.tsx for why this is 'login' and not 'select_account'.
      provider.setCustomParameters({ prompt: 'login' });

      if (Platform.OS === 'web') {
        const result = await signInWithPopup(auth, provider);
        stopWatchingFocus();
        setGoogleLoading(true);
        await handleGoogleSignInResult(result);
      } else {
        await signInWithRedirect(auth, provider);
      }
    } catch (error: any) {
      stopWatchingFocus();
      console.error('Google Sign-In error:', error);
      setGoogleLoading(false);
      if (error.code === 'auth/popup-closed-by-user' || error.code === 'auth/cancelled-popup-request') {
        // Cancelled, or superseded by a fresh click: nothing to show.
      } else if (error.code === 'auth/popup-blocked') {
        setFormError('Your browser blocked the Google popup. Allow popups for this site and try again.');
      } else if (error.code === 'auth/network-request-failed') {
        setFormError('Unable to reach Google. Check your internet connection and try again.');
      } else {
        setFormError(error.message || 'Google sign up failed. Please try again.');
      }
    } finally {
      googleSignInInProgress.current = false;
    }
  };

  /* ----- render ----------------------------------------------------------- */

  return (
    <>
      <Stack.Screen options={{ headerShown: false, animation: 'none' }} />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
      >
        <DiagramBackground />

        <ScrollView
          contentContainerStyle={[styles.scrollContent, { minHeight: windowHeight }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={false}
          automaticallyAdjustKeyboardInsets={true}
          keyboardDismissMode="interactive"
          contentInsetAdjustmentBehavior="always"
        >
          <View style={styles.cardOuter}>
            <View style={[styles.logoWrap, { marginBottom: -(logoContainer / 2) }]}>
              <AnimatedLogo size={logoSize} showSuccess={showSuccessAnimation} reduceMotion={reduceMotion} />
            </View>

            <Animated.View
              style={[
                styles.card,
                {
                  paddingTop: logoContainer / 2 + 18,
                  paddingHorizontal: isCompact ? 20 : 28,
                  opacity: cardOpacity,
                  transform: [{ translateY: cardTranslateY }],
                },
              ]}
            >
              <View style={styles.connectorTop} />
              <View style={styles.connectorBottom} />
              <View style={styles.connectorLeft} />
              <View style={styles.connectorRight} />

              <Text style={[styles.heading, isCompact && { fontSize: 24 }]} accessibilityRole="header">
                Create your account
              </Text>
              <Text style={styles.subtitle}>Start learning SDLC models and UML diagrams.</Text>

              {formError ? (
                <View style={styles.banner} accessibilityRole="alert" accessibilityLiveRegion="polite">
                  <AlertIcon />
                  <Text style={styles.bannerText}>{formError}</Text>
                </View>
              ) : null}

              <TextField
                label="Full Name"
                placeholder="Juan dela Cruz"
                value={fullName}
                error={visibleNameError}
                onChangeText={(text) => {
                  setFullName(text.replace(/[^A-Za-zÀ-ÖØ-öø-ÿ\s'-]/g, '').slice(0, 100));
                }}
                onBlur={() => setTouched((t) => ({ ...t, fullName: true }))}
                autoCapitalize="words"
                autoComplete="name"
                textContentType="name"
                returnKeyType="next"
                blurOnSubmit={false}
                onSubmitEditing={() => emailRef.current?.focus()}
              />

              <TextField
                label="Email"
                inputRef={emailRef}
                placeholder="you@example.com"
                value={email}
                error={visibleEmailError}
                onChangeText={(text) => {
                  setEmail(text);
                  if (emailInlineError) setEmailInlineError('');
                }}
                onBlur={() => setTouched((t) => ({ ...t, email: true }))}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
                textContentType="emailAddress"
                returnKeyType="next"
                blurOnSubmit={false}
                onSubmitEditing={() => passwordRef.current?.focus()}
              />

              <TextField
                label="Password"
                inputRef={passwordRef}
                placeholder="Create a strong password"
                value={password}
                invalid={passwordInvalid}
                error={passwordRequiredError}
                onChangeText={setPassword}
                onFocus={() => setPasswordFocused(true)}
                onBlur={() => {
                  setPasswordFocused(false);
                  setTouched((t) => ({ ...t, password: true }));
                }}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="new-password"
                textContentType="newPassword"
                {...({ passwordRules: IOS_PASSWORD_RULES } as any)}
                returnKeyType="next"
                blurOnSubmit={false}
                onSubmitEditing={() => confirmPasswordRef.current?.focus()}
                right={<PasswordToggle visible={showPassword} onToggle={() => setShowPassword((v) => !v)} />}
              >
                {(passwordFocused || password.length > 0) && (
                  <PasswordChecklist password={password} flagUnmet={flagUnmet} />
                )}
              </TextField>

              <TextField
                label="Confirm Password"
                inputRef={confirmPasswordRef}
                placeholder="Re-enter your password"
                value={confirmPassword}
                error={confirmError}
                onChangeText={setConfirmPassword}
                onBlur={() => setTouched((t) => ({ ...t, confirm: true }))}
                secureTextEntry={!showConfirmPassword}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="new-password"
                textContentType="newPassword"
                returnKeyType="done"
                blurOnSubmit={true}
                onSubmitEditing={handleSignUp}
                right={<PasswordToggle visible={showConfirmPassword} onToggle={() => setShowConfirmPassword((v) => !v)} />}
              >
                {passwordsMatch ? (
                  <View style={styles.matchRow}>
                    <StatusIcon state="met" />
                    <Text style={styles.matchText}>Passwords match</Text>
                  </View>
                ) : null}
              </TextField>

              <View style={styles.termsRow}>
                <Checkbox
                  checked={agreed}
                  invalid={submitted && !agreed}
                  onToggle={() => setAgreed((prev) => !prev)}
                />
                <Text style={styles.termsText}>
                  By signing up, you agree to the{' '}
                  <Text style={styles.termsLink} onPress={openTerms} accessibilityRole="link">
                    Terms and Conditions
                  </Text>
                  {'\u00A0& '}
                  <Text style={styles.termsLink} onPress={openTerms} accessibilityRole="link">
                    Privacy Policy
                  </Text>
                  .
                </Text>
              </View>
              {submitted && !agreed ? (
                <Text style={[styles.fieldError, { marginTop: -8, marginBottom: 12 }]} accessibilityRole="alert">
                  You must agree to the Terms and Privacy Policy.
                </Text>
              ) : null}

              <Button
                label="Sign up"
                loadingLabel="Creating account…"
                onPress={handleSignUp}
                disabled={!formValid || busy}
                loading={loading}
              />

              {Platform.OS === 'web' && (
                <>
                  <View style={styles.divider}>
                    <View style={styles.dividerLine} />
                    <Text style={styles.dividerText}>or</Text>
                    <View style={styles.dividerLine} />
                  </View>
                  <Button
                    variant="secondary"
                    label="Sign up with Google"
                    loadingLabel="Signing up…"
                    onPress={handleGoogleSignIn}
                    disabled={!agreed || busy}
                    loading={googleLoading}
                    icon={<GoogleIcon dimmed={!agreed || busy} />}
                  />
                </>
              )}

              <View style={styles.signinWrap}>
                <Text style={styles.signinText}>Already have an account?</Text>
                <LinkButton label="Sign in" onPress={navigateToSignIn} />
              </View>
            </Animated.View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}

/* -------------------------------------------------------------------------- */
/*  Styles                                                                    */
/* -------------------------------------------------------------------------- */

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#eef2ff' },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 16,
  },
  cardOuter: { width: '100%', maxWidth: 440, alignItems: 'center' },

  logoWrap: { alignItems: 'center', justifyContent: 'center', zIndex: 10 },
  logoTile: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#eef2ff',
    borderWidth: 2.5,
    borderColor: COLORS.brand,
    shadowColor: COLORS.brand,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },

  card: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    paddingBottom: 24,
    width: '100%',
    position: 'relative',
    borderWidth: 1,
    borderColor: '#edf1ff',
    shadowColor: '#1e293b',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.06,
    shadowRadius: 20,
    elevation: 3,
  },
  connectorTop: { position: 'absolute', top: -4, alignSelf: 'center', width: 8, height: 8, borderRadius: 4, backgroundColor: '#ffffff', borderWidth: 1.5, borderColor: '#c7d2fe' },
  connectorBottom: { position: 'absolute', bottom: -4, alignSelf: 'center', width: 8, height: 8, borderRadius: 4, backgroundColor: '#ffffff', borderWidth: 1.5, borderColor: '#c7d2fe' },
  connectorLeft: { position: 'absolute', left: -4, top: '50%', transform: [{ translateY: -4 }], width: 8, height: 8, borderRadius: 4, backgroundColor: '#ffffff', borderWidth: 1.5, borderColor: '#c7d2fe' },
  connectorRight: { position: 'absolute', right: -4, top: '50%', transform: [{ translateY: -4 }], width: 8, height: 8, borderRadius: 4, backgroundColor: '#ffffff', borderWidth: 1.5, borderColor: '#c7d2fe' },

  heading: { fontFamily: FONT, fontSize: 26, fontWeight: '800', color: COLORS.ink, textAlign: 'center' },
  subtitle: { fontFamily: FONT, fontSize: 15, lineHeight: 21, color: COLORS.body, textAlign: 'center', marginTop: 6, marginBottom: 22 },

  banner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 12,
    borderRadius: 12,
    backgroundColor: COLORS.errorBg,
    borderWidth: 1,
    borderColor: COLORS.errorBorder,
    marginBottom: 16,
  },
  bannerText: { flex: 1, fontFamily: FONT, fontSize: 14, lineHeight: 20, color: COLORS.errorText, fontWeight: '500' },

  formGroup: { marginBottom: 16 },
  label: { fontFamily: FONT, fontSize: 14, fontWeight: '600', color: COLORS.label, marginBottom: 6 },
  inputWrap: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    backgroundColor: '#ffffff',
    minHeight: 48,
    justifyContent: 'center',
  },
  inputWrapFocused: {
    shadowColor: COLORS.brand,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  input: {
    fontFamily: FONT,
    height: 46,
    paddingHorizontal: 14,
    paddingVertical: 0,
    fontSize: 16, // 16px stops iOS Safari zooming on focus
    color: COLORS.ink,
    backgroundColor: 'transparent',
  },
  inputWithRight: { paddingRight: 52 },
  eyeBtn: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
  },
  fieldError: { fontFamily: FONT, fontSize: 14, lineHeight: 20, color: COLORS.error, marginTop: 6, fontWeight: '500' },

  checklist: { marginTop: 10 },
  strengthRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  strengthBar: { flex: 1, height: 4, backgroundColor: '#e2e8f0', borderRadius: 2, overflow: 'hidden' },
  strengthFill: { height: '100%', borderRadius: 2 },
  strengthText: { fontFamily: FONT, fontSize: 13, fontWeight: '700', minWidth: 44, textAlign: 'right' },
  rulesGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  ruleItem: { width: '50%', flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 3, paddingRight: 6 },
  ruleText: { fontFamily: FONT, fontSize: 13, lineHeight: 18, flexShrink: 1 },

  matchRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
  matchText: { fontFamily: FONT, fontSize: 14, lineHeight: 20, color: COLORS.success, fontWeight: '600' },

  termsRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 16 },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: COLORS.muted,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
    flexShrink: 0,
  },
  checkboxChecked: { borderColor: COLORS.brand, backgroundColor: COLORS.brand },
  checkboxInvalid: { borderColor: COLORS.error },
  termsText: { flex: 1, fontFamily: FONT, fontSize: 14, lineHeight: 22, color: COLORS.body },
  termsLink: { fontWeight: '700', color: COLORS.brand },

  btn: {
    minHeight: 48,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 16,
  },
  btnPrimary: {
    backgroundColor: COLORS.brand,
    borderWidth: 1,
    borderColor: COLORS.brandDark,
    shadowColor: COLORS.brand,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
  },
  btnPrimaryDisabled: {
    backgroundColor: COLORS.brandDisabled,
    borderColor: COLORS.brandDisabled,
    shadowOpacity: 0,
    elevation: 0,
  },
  btnPrimaryText: { fontFamily: FONT, color: '#ffffff', fontSize: 16, fontWeight: '700', letterSpacing: 0.2 },
  btnSecondary: { backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#cbd5e1' },
  btnSecondaryDisabled: { backgroundColor: '#f8fafc', borderColor: '#e2e8f0' },
  btnSecondaryText: { fontFamily: FONT, color: COLORS.ink, fontSize: 15, fontWeight: '600' },
  btnSecondaryTextDisabled: { color: COLORS.muted },
  btnPressed: { opacity: 0.9 },

  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 16 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#e2e8f0' },
  dividerText: { marginHorizontal: 12, fontFamily: FONT, fontSize: 13, color: COLORS.muted, fontWeight: '600' },

  signinWrap: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap', marginTop: 8 },
  signinText: { fontFamily: FONT, fontSize: 14, color: COLORS.body },
  signinLink: { fontFamily: FONT, fontSize: 14, fontWeight: '700', color: COLORS.brand },
  linkButton: { minHeight: 44, paddingHorizontal: 6, justifyContent: 'center', borderRadius: 6 },

  gridBackground: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
  gridOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(255,255,255,0.10)' },
});