import React, { useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  ActivityIndicator,
  Animated,
  Dimensions,
  Easing,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  PressableProps,
  ScrollView,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
} from 'react-native';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { Svg, Circle, Rect, Path, Defs, LinearGradient, Stop } from 'react-native-svg';
import * as authService from '../../services/authService';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

/* ────────────────────────────── Design tokens ────────────────────────────── */

const C = {
  brand: '#3b5bdb',
  brandDisabled: '#6a80de',
  ink: '#0f172a',
  text: '#334155',
  muted: '#64748b',
  border: '#94a3b8',
  error: '#dc2626',
  errorText: '#b91c1c',
  errorBg: '#fef2f2',
  errorBorder: '#fecaca',
  success: '#047857',
  successBg: '#ecfdf5',
  warn: '#b45309',
  warnBg: '#fffbeb',
  white: '#ffffff',
};

// 2px focus ring for web / keyboard users. Native touch has no focus state.
const focusRing = (color: string = C.brand): ViewStyle =>
  Platform.OS === 'web'
    ? ({
        outlineWidth: 2,
        outlineStyle: 'solid',
        outlineColor: color,
        outlineOffset: 2,
      } as unknown as ViewStyle)
    : {};

// Input focus ring (same as signup): 2px, offset 1, drawn on the field wrapper.
const fieldRing = (color: string = C.brand): ViewStyle =>
  Platform.OS === 'web'
    ? ({
        outlineWidth: 2,
        outlineStyle: 'solid',
        outlineColor: color,
        outlineOffset: 1,
      } as unknown as ViewStyle)
    : {};

const noWebOutline =
  Platform.OS === 'web' ? ({ outlineStyle: 'none' } as unknown as TextInputProps['style']) : null;

/* ───────────────────────────── Password rules ────────────────────────────── */

const SPECIAL_CHARS_REGEX = /[!@#$%^&*(),.?":{}|<>]/;

const RULES = [
  { key: 'length', label: '8+ characters', test: (p: string) => p.length >= 8 },
  { key: 'upper', label: 'Uppercase letter', test: (p: string) => /[A-Z]/.test(p) },
  { key: 'lower', label: 'Lowercase letter', test: (p: string) => /[a-z]/.test(p) },
  { key: 'number', label: 'A number', test: (p: string) => /[0-9]/.test(p) },
  { key: 'special', label: 'Special character', test: (p: string) => SPECIAL_CHARS_REGEX.test(p) },
];

const isPasswordValid = (pwd: string) => RULES.every((r) => r.test(pwd));

const getStrength = (pwd: string) => {
  const met = RULES.filter((r) => r.test(pwd)).length;
  if (met === RULES.length) return { label: 'Strong', color: C.success, ratio: 1 };
  if (met >= 3) return { label: 'Fair', color: C.warn, ratio: met / RULES.length };
  return { label: 'Weak', color: C.errorText, ratio: Math.max(met, 1) / RULES.length };
};

const maskEmail = (email: string) => {
  const [local, domain] = email.split('@');
  if (!local || !domain) return email;
  return `${local.slice(0, local.length > 2 ? 2 : 1)}•••@${domain}`;
};

const firstParam = (value?: string | string[]) => (Array.isArray(value) ? value[0] : value) ?? '';

const EXPIRED_PATTERN = /expired|invalid otp|invalid code|invalid token|incorrect code/i;

/* ─────────────────────────────── Motion hook ─────────────────────────────── */

// One quiet entrance per view. Skipped when the system asks for reduced motion.
const useEntrance = (trigger: unknown) => {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let cancelled = false;
    progress.setValue(0);
    AccessibilityInfo.isReduceMotionEnabled().then((reduce) => {
      if (cancelled) return;
      if (reduce) {
        progress.setValue(1);
        return;
      }
      Animated.timing(progress, {
        toValue: 1,
        duration: 280,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: Platform.OS !== 'web',
      }).start();
    });
    return () => {
      cancelled = true;
    };
  }, [trigger, progress]);

  return {
    opacity: progress,
    transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }],
  };
};

/* ──────────────────────────────── Icons ──────────────────────────────────── */

const CheckIcon = ({ color, size = 16 }: { color: string; size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M5 12.5l4.5 4.5L19 7.5" stroke={color} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const CrossIcon = ({ color, size = 16 }: { color: string; size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M6 6l12 12M18 6L6 18" stroke={color} strokeWidth={2.4} strokeLinecap="round" />
  </Svg>
);

const AlertIcon = ({ color, size = 20 }: { color: string; size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="12" r="10" stroke={color} strokeWidth={1.8} />
    <Path d="M12 7.5v5M12 16.2h.01" stroke={color} strokeWidth={2.2} strokeLinecap="round" />
  </Svg>
);

const EyeIcon = ({ visible }: { visible: boolean }) => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
    {visible ? (
      <>
        <Path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke={C.muted} strokeWidth={1.8} />
        <Circle cx={12} cy={12} r={3} stroke={C.muted} strokeWidth={1.8} />
      </>
    ) : (
      <>
        <Path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94" stroke={C.muted} strokeWidth={1.8} />
        <Path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19" stroke={C.muted} strokeWidth={1.8} />
        <Path d="M1 1l22 22" stroke={C.muted} strokeWidth={1.8} />
      </>
    )}
  </Svg>
);

/* ─────────────────────────────── Primitives ──────────────────────────────── */

// Pressable that shows the shared focus ring and a pressed state.
const FocusPressable = ({
  style,
  onFocus,
  onBlur,
  ...rest
}: Omit<PressableProps, 'style'> & { style?: StyleProp<ViewStyle> }) => {
  const [focused, setFocused] = useState(false);
  return (
    <Pressable
      {...rest}
      onFocus={(e) => {
        setFocused(true);
        onFocus?.(e);
      }}
      onBlur={(e) => {
        setFocused(false);
        onBlur?.(e);
      }}
      style={({ pressed }) => [style, pressed && styles.pressed, focused && focusRing()]}
    />
  );
};

const LogoTile = () => (
  <View style={styles.logoTile} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
    <Svg width={26} height={26} viewBox="0 0 24 24" fill="none">
      <Rect x={5} y={11} width={14} height={10} rx={2.5} stroke={C.white} strokeWidth={2} />
      <Path d="M8 11V8a4 4 0 018 0v3" stroke={C.white} strokeWidth={2} strokeLinecap="round" />
      <Circle cx={12} cy={16} r={1.3} fill={C.white} />
    </Svg>
  </View>
);

const StatusBadge = ({ tone }: { tone: 'success' | 'warning' }) => {
  const success = tone === 'success';
  return (
    <View
      style={[styles.statusBadge, { backgroundColor: success ? C.successBg : C.warnBg }]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {success ? <CheckIcon color={C.success} size={30} /> : <AlertIcon color={C.warn} size={30} />}
    </View>
  );
};

const Banner = ({ message }: { message: string }) => (
  <View style={styles.banner} accessibilityRole="alert" accessibilityLiveRegion="assertive">
    <AlertIcon color={C.errorText} size={18} />
    <Text style={styles.bannerText}>{message}</Text>
  </View>
);

const Rule = ({ met, touched, label }: { met: boolean; touched: boolean; label: string }) => {
  const color = met ? C.success : touched ? C.error : C.muted;
  return (
    <View style={styles.rule} accessible accessibilityLabel={`${label}, ${met ? 'met' : 'not met'}`}>
      <View style={styles.ruleIcon}>
        {met ? (
          <CheckIcon color={color} size={14} />
        ) : touched ? (
          <CrossIcon color={color} size={14} />
        ) : (
          <View style={styles.ruleDot} />
        )}
      </View>
      <Text style={[styles.ruleText, { color }]}>{label}</Text>
    </View>
  );
};

const PasswordField = ({
  label,
  value,
  onChangeText,
  placeholder,
  hasError,
  onBlur,
  inputRef,
  returnKeyType,
  onSubmitEditing,
  editable = true,
  children,
}: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  hasError?: boolean;
  onBlur?: () => void;
  inputRef?: React.Ref<TextInput>;
  returnKeyType?: TextInputProps['returnKeyType'];
  onSubmitEditing?: () => void;
  editable?: boolean;
  children?: React.ReactNode;
}) => {
  const [visible, setVisible] = useState(false);
  const [focused, setFocused] = useState(false);

  return (
    <View style={styles.formGroup}>
      <Text style={styles.label}>{label}</Text>
      <View
        style={[
          styles.field,
          focused && styles.fieldFocused,
          hasError && styles.fieldError,
          focused && fieldRing(hasError ? C.error : C.brand),
        ]}
      >
        <TextInput
          ref={inputRef}
          style={[styles.input, noWebOutline]}
          placeholder={placeholder}
          placeholderTextColor={C.muted}
          value={value}
          onChangeText={onChangeText}
          onFocus={() => setFocused(true)}
          onBlur={() => {
            setFocused(false);
            onBlur?.();
          }}
          secureTextEntry={!visible}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="new-password"
          textContentType="newPassword"
          passwordRules={'minlength: 8; required: lower; required: upper; required: digit; required: [!@#$%^&*(),.?":{}|<>];'}
          returnKeyType={returnKeyType}
          onSubmitEditing={onSubmitEditing}
          editable={editable}
          accessibilityLabel={label}
        />
        <FocusPressable
          style={styles.eyeBtn}
          onPress={() => setVisible((v) => !v)}
          accessibilityRole="button"
          accessibilityLabel={visible ? 'Hide password' : 'Show password'}
        >
          <EyeIcon visible={visible} />
        </FocusPressable>
      </View>
      {children}
    </View>
  );
};

/* ──────────────────────────── Decorative background ──────────────────────── */

const DiagramBackground = () => (
  <View
    style={StyleSheet.absoluteFillObject}
    pointerEvents="none"
    accessibilityElementsHidden
    importantForAccessibility="no-hide-descendants"
  >
    <Svg width="100%" height="100%" viewBox={`0 0 ${SCREEN_WIDTH} ${SCREEN_HEIGHT}`} preserveAspectRatio="xMidYMid slice" style={StyleSheet.absoluteFillObject}>
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

      <Rect x="0" y="0" width={SCREEN_WIDTH} height={SCREEN_HEIGHT} fill="url(#bgWash)" />
      <Circle cx={SCREEN_WIDTH * 0.9} cy={SCREEN_HEIGHT * 0.08} r={SCREEN_WIDTH * 0.55} fill="url(#blobTopRight)" />
      <Circle cx={SCREEN_WIDTH * 0.05} cy={SCREEN_HEIGHT * 0.95} r={SCREEN_WIDTH * 0.5} fill="url(#blobBottomLeft)" />
    </Svg>

    <Image source={require('../../assets/images/grid-bg.png')} style={styles.gridBackground} resizeMode="repeat" />
    <View style={styles.gridOverlay} />

    <Svg width="100%" height="100%" viewBox={`0 0 ${SCREEN_WIDTH} ${SCREEN_HEIGHT}`} preserveAspectRatio="xMidYMid slice" style={StyleSheet.absoluteFillObject}>
      {/* Mini class diagram (top-left) */}
      <Rect x={SCREEN_WIDTH * 0.06} y={SCREEN_HEIGHT * 0.09} width="118" height="88" rx="6" stroke="#a9b8ff" strokeWidth="1.5" fill="#ffffff" fillOpacity="0.4" opacity="0.55" />
      <Path d={`M ${SCREEN_WIDTH * 0.06} ${SCREEN_HEIGHT * 0.09 + 26} h 118`} stroke="#a9b8ff" strokeWidth="1.5" opacity="0.55" />
      <Path d={`M ${SCREEN_WIDTH * 0.06} ${SCREEN_HEIGHT * 0.09 + 58} h 118`} stroke="#a9b8ff" strokeWidth="1.5" opacity="0.55" />
      <Rect x={SCREEN_WIDTH * 0.06 + 10} y={SCREEN_HEIGHT * 0.09 + 10} width="54" height="7" rx="3" fill="#a9b8ff" opacity="0.5" />
      <Rect x={SCREEN_WIDTH * 0.06 + 10} y={SCREEN_HEIGHT * 0.09 + 35} width="40" height="5" rx="2.5" fill="#c3cdff" opacity="0.5" />
      <Rect x={SCREEN_WIDTH * 0.06 + 10} y={SCREEN_HEIGHT * 0.09 + 45} width="60" height="5" rx="2.5" fill="#c3cdff" opacity="0.5" />
      <Rect x={SCREEN_WIDTH * 0.06 + 10} y={SCREEN_HEIGHT * 0.09 + 67} width="48" height="5" rx="2.5" fill="#c3cdff" opacity="0.5" />
      <Rect x={SCREEN_WIDTH * 0.06 + 10} y={SCREEN_HEIGHT * 0.09 + 77} width="56" height="5" rx="2.5" fill="#c3cdff" opacity="0.5" />

      {/* Association line toward the ERD entity */}
      <Path d={`M ${SCREEN_WIDTH * 0.06 + 118} ${SCREEN_HEIGHT * 0.09 + 44} C ${SCREEN_WIDTH * 0.34} ${SCREEN_HEIGHT * 0.05}, ${SCREEN_WIDTH * 0.58} ${SCREEN_HEIGHT * 0.12}, ${SCREEN_WIDTH * 0.72} ${SCREEN_HEIGHT * 0.13 + 35}`} stroke="#a9b8ff" strokeWidth="1.5" fill="none" opacity="0.45" />
      <Circle cx={SCREEN_WIDTH * 0.06 + 122} cy={SCREEN_HEIGHT * 0.09 + 44} r="2.5" fill="#a9b8ff" opacity="0.5" />

      {/* ERD entity (upper-right) */}
      <Rect x={SCREEN_WIDTH * 0.72} y={SCREEN_HEIGHT * 0.13} width="132" height="70" rx="6" stroke="#a9b8ff" strokeWidth="1.5" fill="#ffffff" fillOpacity="0.4" opacity="0.5" />
      <Path d={`M ${SCREEN_WIDTH * 0.72} ${SCREEN_HEIGHT * 0.13 + 22} h 132`} stroke="#a9b8ff" strokeWidth="1.5" opacity="0.5" />
      <Rect x={SCREEN_WIDTH * 0.72 + 10} y={SCREEN_HEIGHT * 0.13 + 8} width="50" height="6" rx="3" fill="#a9b8ff" opacity="0.5" />
      <Circle cx={SCREEN_WIDTH * 0.72 + 12} cy={SCREEN_HEIGHT * 0.13 + 34} r="2" fill="#c3cdff" opacity="0.6" />
      <Rect x={SCREEN_WIDTH * 0.72 + 20} y={SCREEN_HEIGHT * 0.13 + 31} width="46" height="5" rx="2.5" fill="#c3cdff" opacity="0.5" />
      <Circle cx={SCREEN_WIDTH * 0.72 + 12} cy={SCREEN_HEIGHT * 0.13 + 48} r="2" fill="#c3cdff" opacity="0.6" />
      <Rect x={SCREEN_WIDTH * 0.72 + 20} y={SCREEN_HEIGHT * 0.13 + 45} width="58" height="5" rx="2.5" fill="#c3cdff" opacity="0.5" />

      {/* Use-case actor and oval (lower-left) */}
      <Circle cx={SCREEN_WIDTH * 0.10} cy={SCREEN_HEIGHT * 0.60} r="4.5" stroke="#a9b8ff" strokeWidth="1.6" fill="none" opacity="0.5" />
      <Path d={`M ${SCREEN_WIDTH * 0.10} ${SCREEN_HEIGHT * 0.60 + 4.5} v 16 M ${SCREEN_WIDTH * 0.10 - 8} ${SCREEN_HEIGHT * 0.60 + 12} h 16 M ${SCREEN_WIDTH * 0.10} ${SCREEN_HEIGHT * 0.60 + 20.5} l -7 12 M ${SCREEN_WIDTH * 0.10} ${SCREEN_HEIGHT * 0.60 + 20.5} l 7 12`} stroke="#a9b8ff" strokeWidth="1.6" fill="none" opacity="0.5" />
      <Path d={`M ${SCREEN_WIDTH * 0.10 + 12} ${SCREEN_HEIGHT * 0.60 + 12} L ${SCREEN_WIDTH * 0.24} ${SCREEN_HEIGHT * 0.60 + 6}`} stroke="#a9b8ff" strokeWidth="1.5" strokeDasharray="5 6" opacity="0.45" />
      <Path d={`M ${SCREEN_WIDTH * 0.24} ${SCREEN_HEIGHT * 0.60 + 6} m -22, 0 a 22,13 0 1,0 44,0 a 22,13 0 1,0 -44,0`} stroke="#a9b8ff" strokeWidth="1.5" fill="#ffffff" fillOpacity="0.35" opacity="0.5" />

      {/* Flowchart decision and terminator (lower-right) */}
      <Path d={`M ${SCREEN_WIDTH * 0.80} ${SCREEN_HEIGHT * 0.66} L ${SCREEN_WIDTH * 0.80 + 20} ${SCREEN_HEIGHT * 0.66 + 14} L ${SCREEN_WIDTH * 0.80} ${SCREEN_HEIGHT * 0.66 + 28} L ${SCREEN_WIDTH * 0.80 - 20} ${SCREEN_HEIGHT * 0.66 + 14} Z`} stroke="#a9b8ff" strokeWidth="1.5" fill="#ffffff" fillOpacity="0.35" opacity="0.5" />
      <Path d={`M ${SCREEN_WIDTH * 0.80} ${SCREEN_HEIGHT * 0.66 + 28} v 22`} stroke="#a9b8ff" strokeWidth="1.5" strokeDasharray="4 5" opacity="0.4" />
      <Rect x={SCREEN_WIDTH * 0.80 - 30} y={SCREEN_HEIGHT * 0.66 + 50} width="60" height="24" rx="12" stroke="#a9b8ff" strokeWidth="1.5" fill="#ffffff" fillOpacity="0.35" opacity="0.5" />

      {/* Sequence-diagram lifeline (center-right) */}
      <Path d={`M ${SCREEN_WIDTH * 0.90} ${SCREEN_HEIGHT * 0.35} v 90`} stroke="#bfd0ff" strokeWidth="1.4" strokeDasharray="3 6" opacity="0.35" />
      <Rect x={SCREEN_WIDTH * 0.90 - 26} y={SCREEN_HEIGHT * 0.35} width="52" height="18" rx="4" stroke="#bfd0ff" strokeWidth="1.4" fill="none" opacity="0.35" />
    </Svg>
  </View>
);

/* ──────────────────────────────── Screen ─────────────────────────────────── */

export default function ResetPassword() {
  const router = useRouter();
  const params = useLocalSearchParams<{ email?: string | string[]; otp?: string | string[] }>();

  // Keep the email and code in state, then remove them from the URL so they
  // don't linger in the address bar. A reload lands on the "expired" view.
  const [credentials, setCredentials] = useState(() => ({
    email: firstParam(params.email),
    otp: firstParam(params.otp),
  }));

  useEffect(() => {
    const email = firstParam(params.email);
    const otp = firstParam(params.otp);
    if (email && otp) {
      setCredentials({ email, otp });
      router.setParams({ email: undefined, otp: undefined } as any);
    }
  }, [params.email, params.otp]);

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [newTouched, setNewTouched] = useState(false);
  const [confirmTouched, setConfirmTouched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [codeExpired, setCodeExpired] = useState(false);
  const [done, setDone] = useState(false);

  const confirmRef = useRef<TextInput>(null);

  const missingCredentials = !credentials.email || !credentials.otp;
  const view: 'form' | 'success' | 'expired' = done
    ? 'success'
    : codeExpired || missingCredentials
    ? 'expired'
    : 'form';

  const cardAnimation = useEntrance(view);

  const passwordOk = isPasswordValid(newPassword);
  const matches = confirmPassword.length > 0 && newPassword === confirmPassword;
  const showMismatch =
    confirmPassword.length > 0 &&
    !matches &&
    (confirmTouched || confirmPassword.length >= newPassword.length);
  const canSubmit = passwordOk && matches && !loading;
  const strength = getStrength(newPassword);

  const handleFailure = (message?: string) => {
    if (message && EXPIRED_PATTERN.test(message)) {
      setCodeExpired(true);
      return;
    }
    setSubmitError(message || 'We couldn’t reset your password. Check your connection and try again.');
  };

  const handleReset = async () => {
    if (!canSubmit) return;

    setSubmitError('');
    setLoading(true);
    try {
      const result = await authService.resetPassword(credentials.email, credentials.otp, newPassword);
      if (result.success) {
        await authService.clearTokens();
        setNewPassword('');
        setConfirmPassword('');
        setDone(true);
      } else {
        handleFailure(result.message);
      }
    } catch (error: any) {
      handleFailure(error?.response?.data?.message);
    } finally {
      setLoading(false);
    }
  };

  const goToSignIn = () => router.replace('/(auth)/signin');
  const requestNewCode = () => router.replace('/(auth)/forgot-password');

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
      >
        <DiagramBackground />
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <Animated.View style={[styles.card, cardAnimation]}>
            {/* Diagram connector dots */}
            <View style={[styles.connector, styles.connectorTop]} />
            <View style={[styles.connector, styles.connectorBottom]} />
            <View style={[styles.connector, styles.connectorLeft]} />
            <View style={[styles.connector, styles.connectorRight]} />

            {view === 'form' && (
              <>
                <LogoTile />
                <Text style={styles.heading} accessibilityRole="header">
                  Create a new password
                </Text>
                <Text style={styles.subtitle}>
                  Choose a new password for{' '}
                  <Text style={styles.subtitleEmail}>{maskEmail(credentials.email)}</Text>.
                </Text>

                <PasswordField
                  label="New password"
                  value={newPassword}
                  onChangeText={(text) => {
                    setNewPassword(text);
                    if (submitError) setSubmitError('');
                  }}
                  placeholder="At least 8 characters"
                  onBlur={() => {
                    if (newPassword.length > 0) setNewTouched(true);
                  }}
                  returnKeyType="next"
                  onSubmitEditing={() => confirmRef.current?.focus()}
                  editable={!loading}
                >
                  {newPassword.length > 0 && (
                    <View style={styles.strengthRow}>
                      <View style={styles.strengthTrack}>
                        <View
                          style={[
                            styles.strengthFill,
                            { width: `${strength.ratio * 100}%`, backgroundColor: strength.color },
                          ]}
                        />
                      </View>
                      <Text
                        style={[styles.strengthLabel, { color: strength.color }]}
                        accessibilityLabel={`Password strength: ${strength.label}`}
                      >
                        {strength.label}
                      </Text>
                    </View>
                  )}
                  <View style={styles.rules}>
                    {RULES.map((rule) => (
                      <Rule
                        key={rule.key}
                        label={rule.label}
                        met={rule.test(newPassword)}
                        touched={newTouched}
                      />
                    ))}
                  </View>
                </PasswordField>

                <PasswordField
                  label="Confirm password"
                  value={confirmPassword}
                  onChangeText={(text) => {
                    setConfirmPassword(text);
                    if (submitError) setSubmitError('');
                  }}
                  placeholder="Re-enter your password"
                  hasError={showMismatch}
                  onBlur={() => setConfirmTouched(true)}
                  inputRef={confirmRef}
                  returnKeyType="done"
                  onSubmitEditing={handleReset}
                  editable={!loading}
                >
                  {matches && (
                    <View style={styles.matchRow} accessibilityLiveRegion="polite">
                      <CheckIcon color={C.success} size={14} />
                      <Text style={[styles.matchText, { color: C.success }]}>Passwords match</Text>
                    </View>
                  )}
                  {showMismatch && (
                    <View style={styles.matchRow} accessibilityLiveRegion="polite">
                      <CrossIcon color={C.errorText} size={14} />
                      <Text style={[styles.matchText, { color: C.errorText }]}>Passwords don’t match</Text>
                    </View>
                  )}
                </PasswordField>

                {submitError ? <Banner message={submitError} /> : null}

                <FocusPressable
                  style={[styles.btn, !canSubmit && !loading && styles.btnDisabled]}
                  onPress={handleReset}
                  disabled={!canSubmit}
                  accessibilityRole="button"
                  accessibilityState={{ disabled: !canSubmit, busy: loading }}
                >
                  {loading ? (
                    <View style={styles.btnContent}>
                      <ActivityIndicator color={C.white} size="small" />
                      <Text style={styles.btnText}>Resetting…</Text>
                    </View>
                  ) : (
                    <Text style={styles.btnText}>Reset password</Text>
                  )}
                </FocusPressable>

                <FocusPressable style={styles.linkBtn} onPress={goToSignIn} accessibilityRole="link">
                  <Text style={styles.linkText}>Back to sign in</Text>
                </FocusPressable>
              </>
            )}

            {view === 'success' && (
              <>
                <StatusBadge tone="success" />
                <Text style={styles.heading} accessibilityRole="header">
                  Password updated
                </Text>
                <Text style={styles.subtitle}>
                  Your password has been changed. Sign in with your new password to continue.
                </Text>
                <FocusPressable style={styles.btn} onPress={goToSignIn} accessibilityRole="button">
                  <Text style={styles.btnText}>Continue to sign in</Text>
                </FocusPressable>
              </>
            )}

            {view === 'expired' && (
              <>
                <StatusBadge tone="warning" />
                <Text style={styles.heading} accessibilityRole="header">
                  This reset link has expired
                </Text>
                <Text style={styles.subtitle}>
                  For your security, a reset code works once and only for a short time. Request a new
                  code to continue.
                </Text>
                <FocusPressable style={styles.btn} onPress={requestNewCode} accessibilityRole="button">
                  <Text style={styles.btnText}>Request a new code</Text>
                </FocusPressable>
                <FocusPressable style={styles.linkBtn} onPress={goToSignIn} accessibilityRole="link">
                  <Text style={styles.linkText}>Back to sign in</Text>
                </FocusPressable>
              </>
            )}
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}

/* ──────────────────────────────── Styles ─────────────────────────────────── */

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: '#eef2ff',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 40,
    minHeight: SCREEN_HEIGHT,
  },
  pressed: {
    opacity: 0.85,
  },

  // Card
  card: {
    backgroundColor: C.white,
    borderRadius: 28,
    paddingHorizontal: 32,
    paddingTop: 36,
    paddingBottom: 28,
    width: '100%',
    maxWidth: 430,
    shadowColor: '#1e293b',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.12,
    shadowRadius: 30,
    elevation: 14,
    borderWidth: 1.5,
    borderColor: '#f1f5ff',
    position: 'relative',
  },
  connector: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: C.white,
    borderWidth: 1.5,
    borderColor: '#c7d2fe',
  },
  connectorTop: { top: -4, alignSelf: 'center' },
  connectorBottom: { bottom: -4, alignSelf: 'center' },
  connectorLeft: { left: -4, top: '50%', transform: [{ translateY: -4 }] },
  connectorRight: { right: -4, top: '50%', transform: [{ translateY: -4 }] },

  // Header
  logoTile: {
    alignSelf: 'center',
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: C.brand,
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '-6deg' }],
    marginBottom: 22,
    shadowColor: C.brand,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.28,
    shadowRadius: 14,
    elevation: 6,
  },
  statusBadge: {
    alignSelf: 'center',
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  heading: {
    fontSize: 26,
    fontWeight: '800',
    color: C.ink,
    textAlign: 'center',
    letterSpacing: -0.6,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 15,
    color: C.text,
    textAlign: 'center',
    marginBottom: 28,
    lineHeight: 22,
  },
  subtitleEmail: {
    fontWeight: '600',
    color: C.ink,
  },

  // Fields
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: C.text,
    marginBottom: 8,
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 48,
    borderWidth: 1.5,
    borderColor: C.border,
    borderRadius: 12,
    backgroundColor: C.white,
  },
  fieldFocused: {
    borderColor: C.brand,
    shadowColor: C.brand,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  fieldError: {
    borderColor: C.error,
  },
  input: {
    flex: 1,
    minHeight: 46,
    paddingLeft: 14,
    paddingRight: 4,
    fontSize: 16,
    color: C.ink,
    textAlignVertical: 'center',
  },
  eyeBtn: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
  },

  // Strength and rules
  strengthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 10,
  },
  strengthTrack: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#e2e8f0',
    overflow: 'hidden',
  },
  strengthFill: {
    height: '100%',
    borderRadius: 2,
  },
  strengthLabel: {
    fontSize: 13,
    fontWeight: '700',
    minWidth: 48,
    textAlign: 'right',
  },
  rules: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
    rowGap: 4,
  },
  rule: {
    flexBasis: '50%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 24,
  },
  ruleIcon: {
    width: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ruleDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#cbd5e1',
  },
  ruleText: {
    fontSize: 14,
    lineHeight: 20,
  },
  matchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  matchText: {
    fontSize: 14,
    fontWeight: '500',
  },

  // Banner
  banner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 12,
    marginBottom: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.errorBorder,
    backgroundColor: C.errorBg,
  },
  bannerText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    color: C.errorText,
    fontWeight: '500',
  },

  // Buttons and links
  btn: {
    minHeight: 52,
    borderRadius: 14,
    paddingVertical: 15,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.brand,
    shadowColor: C.brand,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 8,
  },
  btnDisabled: {
    backgroundColor: C.brandDisabled,
    shadowOpacity: 0,
    elevation: 0,
  },
  btnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  btnText: {
    color: C.white,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  linkBtn: {
    alignSelf: 'center',
    minHeight: 44,
    paddingHorizontal: 16,
    marginTop: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
  },
  linkText: {
    fontSize: 15,
    color: C.brand,
    fontWeight: '600',
  },

  // Background
  gridBackground: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  gridOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.10)',
  },
});