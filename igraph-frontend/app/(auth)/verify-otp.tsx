import React, { useState, useRef, useEffect, useMemo, forwardRef, useImperativeHandle } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Pressable,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Platform,
  Dimensions,
  useWindowDimensions,
  KeyboardAvoidingView,
  Modal,
  Image,
  Animated,
  AppState,
  AccessibilityInfo,
} from 'react-native';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { Svg, Circle, Rect, Path } from 'react-native-svg';
import * as authService from '../../services/authService';
import { markNewUserForOnboarding } from '../../utils/onboardingTour';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const OTP_LENGTH = 6;
const CODE_TTL_SECONDS = 300; // how long a code stays valid
const RESEND_COOLDOWN_SECONDS = 45; // how long before another code can be requested

// Layout numbers the OTP box size is derived from. Keep in sync with
// styles.scrollContent (paddingHorizontal) and styles.card (maxWidth, paddingHorizontal).
const OTP_GAP = 8;
const PAGE_PADDING_H = 18;
const CARD_MAX_WIDTH = 430;
const CARD_PADDING_H = 32;

// Same palette as forgot-password.tsx. Text colors all pass AA (4.5:1) on white.
const COLORS = {
  brand: '#3b5bdb',
  brandDark: '#364fc7',
  textStrong: '#0f172a',
  textBody: '#475569',
  textMuted: '#64748b',
  label: '#334155',
  error: '#dc2626',
  success: '#047857',
  boxBorder: '#94a3b8',
  boxFill: '#f8fafc',
};

// Visible keyboard focus ring. Only web has a browser outline to style.
const focusRing: any =
  Platform.OS === 'web'
    ? { outlineWidth: 2, outlineStyle: 'solid', outlineColor: COLORS.brand, outlineOffset: 2 }
    : {};

const MESSAGES = {
  incomplete: `Enter all ${OTP_LENGTH} digits.`,
  incorrect: 'That code is incorrect. Try again.',
  expired: 'This code has expired. Request a new one.',
  network: 'Could not reach the server. Check your connection and try again.',
};

const formatTime = (totalSeconds: number) =>
  `${Math.floor(totalSeconds / 60)}:${String(totalSeconds % 60).padStart(2, '0')}`;

// Turns whatever the backend says into one of our own messages where we can.
const describeFailure = (message?: string) => {
  if (!message) return MESSAGES.incorrect;
  if (/expired/i.test(message)) return MESSAGES.expired;
  if (/invalid|incorrect|wrong/i.test(message)) return MESSAGES.incorrect;
  return message;
};

// ─── Decorative pieces ───────────────────────────────────────────────────────

const DiagramBackground = () => (
  <View
    style={StyleSheet.absoluteFillObject}
    pointerEvents="none"
    accessibilityElementsHidden
    importantForAccessibility="no-hide-descendants"
  >
    <Image
      source={require('../../assets/images/grid-bg.png')}
      style={styles.gridBackground}
      resizeMode="repeat"
    />
    <View style={styles.gridOverlay} />
    <Svg width={SCREEN_WIDTH} height={SCREEN_HEIGHT} style={StyleSheet.absoluteFillObject}>
      <Path
        d={`M ${SCREEN_WIDTH * 0.08} ${SCREEN_HEIGHT * 0.25} C ${SCREEN_WIDTH * 0.22} ${SCREEN_HEIGHT * 0.10}, ${SCREEN_WIDTH * 0.36} ${SCREEN_HEIGHT * 0.42}, ${SCREEN_WIDTH * 0.52} ${SCREEN_HEIGHT * 0.32}`}
        stroke="#bfd0ff"
        strokeWidth="2"
        strokeDasharray="8 10"
        fill="none"
        opacity="0.32"
      />
      <Path
        d={`M ${SCREEN_WIDTH * 0.82} ${SCREEN_HEIGHT * 0.18} C ${SCREEN_WIDTH * 0.96} ${SCREEN_HEIGHT * 0.30}, ${SCREEN_WIDTH * 0.95} ${SCREEN_HEIGHT * 0.55}, ${SCREEN_WIDTH * 0.78} ${SCREEN_HEIGHT * 0.76}`}
        stroke="#bfd0ff"
        strokeWidth="2"
        strokeDasharray="8 10"
        fill="none"
        opacity="0.32"
      />
      <Rect x={SCREEN_WIDTH * 0.07} y={SCREEN_HEIGHT * 0.12} width="130" height="72" rx="14" stroke="#bfd0ff" strokeWidth="1.4" fill="none" opacity="0.38" />
      <Rect x={SCREEN_WIDTH * 0.74} y={SCREEN_HEIGHT * 0.16} width="140" height="78" rx="14" stroke="#bfd0ff" strokeWidth="1.4" fill="none" opacity="0.38" />
      <Circle cx={SCREEN_WIDTH * 0.76} cy={SCREEN_HEIGHT * 0.72} r="24" stroke="#bfd0ff" strokeWidth="2" fill="none" opacity="0.3" />
    </Svg>
  </View>
);

const BackIcon = () => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
    <Path d="M19 12H5M5 12l7 7M5 12l7-7" stroke="#334155" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

// Same tile as forgot-password.tsx, with a mail icon. If signin.tsx has a shared
// logo component, swap this for it.
const LogoTile = () => (
  <View style={styles.logoTile} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
    <Svg width={26} height={26} viewBox="0 0 24 24" fill="none">
      <Rect x="3.5" y="5.5" width="17" height="13" rx="2.5" stroke="#ffffff" strokeWidth="1.8" />
      <Path d="M4.5 7.5l7.5 6 7.5-6" stroke="#ffffff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  </View>
);

const InlineErrorIcon = () => (
  <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="12" r="10" stroke={COLORS.error} strokeWidth="1.8" />
    <Path d="M12 7.5v5M12 16h.01" stroke={COLORS.error} strokeWidth="2" strokeLinecap="round" />
  </Svg>
);

const CheckMark = ({ size = 18 }: { size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M5 12.5l4.5 4.5L19 7.5" stroke="#ffffff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

// ─── Toast ───────────────────────────────────────────────────────────────────

const CustomToast = ({ visible, message, isError, onHide }: {
  visible: boolean;
  message: string;
  isError: boolean;
  onHide: () => void;
}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(-50)).current;
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.spring(slideAnim, { toValue: 0, tension: 50, friction: 7, useNativeDriver: true }),
      ]).start();

      timeoutRef.current = setTimeout(hideToast, 3000);
    }

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [visible]);

  const hideToast = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: -50, duration: 300, useNativeDriver: true }),
    ]).start(onHide);
  };

  if (!visible) return null;

  return (
    <Animated.View
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      style={[styles.toastContainer, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}
    >
      <View style={[styles.toastContent, isError ? styles.toastError : styles.toastSuccess]}>
        <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
          <Circle cx="12" cy="12" r="10" stroke="#fff" strokeWidth="1.5" />
          {isError ? (
            <Path d="M12 8v4M12 16h.01" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
          ) : (
            <Path d="M8 12l3 3 5-6" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
          )}
        </Svg>
        <Text style={styles.toastText}>{message}</Text>
      </View>
    </Animated.View>
  );
};

// ─── Success modal (registration flow only) ──────────────────────────────────

const SuccessModal = ({ visible, title, message, onClose, buttonText = 'Continue' }: {
  visible: boolean;
  title: string;
  message: string;
  onClose: () => void;
  buttonText?: string;
}) => (
  <Modal animationType="fade" transparent visible={visible} onRequestClose={onClose}>
    <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={onClose}>
      <View style={styles.modalContainer} accessibilityViewIsModal>
        <View style={styles.modalIconWrapper}>
          <View style={[styles.modalIconCircle, { backgroundColor: '#d1fae5' }]}>
            <Svg width={32} height={32} viewBox="0 0 24 24" fill="none">
              <Circle cx="12" cy="12" r="10" stroke={COLORS.success} strokeWidth="1.5" />
              <Path d="M8 12l3 3 5-6" stroke={COLORS.success} strokeWidth="2" strokeLinecap="round" />
            </Svg>
          </View>
        </View>
        <Text style={styles.modalTitle} accessibilityRole="header">{title}</Text>
        <Text style={styles.modalMessage}>{message}</Text>
        <TouchableOpacity
          style={[styles.modalButton, { backgroundColor: COLORS.success }]}
          onPress={onClose}
          accessibilityRole="button"
        >
          <Text style={styles.modalButtonText}>{buttonText}</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  </Modal>
);

// ─── Countdown ───────────────────────────────────────────────────────────────

// Counts down to a fixed deadline rather than subtracting one per tick, so the
// display stays correct after the tab or app has been in the background and
// its timers were throttled.
function useCountdown(initial: number) {
  const endAtRef = useRef(Date.now() + initial * 1000);
  const [seconds, setSeconds] = useState(initial);
  const [active, setActive] = useState(true);

  const recompute = () => {
    const remaining = Math.max(0, Math.ceil((endAtRef.current - Date.now()) / 1000));
    setSeconds(remaining);
    if (remaining <= 0) setActive(false);
  };

  useEffect(() => {
    if (!active) return;
    const interval = setInterval(recompute, 1000);
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') recompute();
    });
    return () => {
      clearInterval(interval);
      sub.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  const reset = () => {
    endAtRef.current = Date.now() + initial * 1000;
    setSeconds(initial);
    setActive(true);
  };

  return { seconds, expired: seconds <= 0, reset };
}

// ─── OTP input ───────────────────────────────────────────────────────────────

type OTPInputHandle = { focus: () => void };

// Six display boxes over one real (invisible) input. That keeps paste, SMS
// autofill and the system keyboard working as they do for any text field.
const OTPInput = forwardRef<OTPInputHandle, {
  value: string;
  onChange: (val: string) => void;
  onComplete?: (val: string) => void;
  hasError: boolean;
  shakeX: Animated.Value;
}>(({ value, onChange, onComplete, hasError, shakeX }, ref) => {
  const inputRef = useRef<TextInput>(null);
  const [isFocused, setIsFocused] = useState(false);

  useImperativeHandle(ref, () => ({ focus: () => inputRef.current?.focus() }));

  const digits = value.split('').concat(Array(OTP_LENGTH - value.length).fill(''));

  const { width: windowWidth } = useWindowDimensions();
  const boxSize = useMemo(() => {
    const cardWidth = Math.min(windowWidth - PAGE_PADDING_H * 2, CARD_MAX_WIDTH);
    const rowWidth = cardWidth - CARD_PADDING_H * 2;
    return Math.max(44, Math.min(60, Math.floor((rowWidth - OTP_GAP * (OTP_LENGTH - 1)) / OTP_LENGTH)));
  }, [windowWidth]);

  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 100);
    return () => clearTimeout(t);
  }, []);

  // No maxLength on the TextInput: it would cut a pasted "123 456" before we
  // get to strip the space. We clean first, then trim.
  const handleChange = (text: string) => {
    const cleaned = text.replace(/\D/g, '').slice(0, OTP_LENGTH);
    onChange(cleaned);
    if (cleaned.length === OTP_LENGTH) onComplete?.(cleaned);
  };

  const activeIndex = isFocused ? Math.min(value.length, OTP_LENGTH - 1) : -1;

  return (
    <TouchableOpacity
      activeOpacity={1}
      onPress={() => inputRef.current?.focus()}
      style={styles.otpContainer}
      accessible={false}
    >
      <Animated.View
        style={[styles.otpRow, { transform: [{ translateX: shakeX }] }]}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        {digits.map((digit, index) => {
          const isActive = activeIndex === index;
          const hasDigit = digit !== '';
          return (
            <View
              key={index}
              style={[
                styles.otpBox,
                { width: boxSize, height: Math.round(boxSize * 1.15) },
                hasDigit && styles.otpBoxFilled,
                isActive && styles.otpBoxActive,
                isActive && focusRing,
                hasError && styles.otpBoxError,
              ]}
            >
              {isActive && !hasDigit ? (
                <View style={[styles.cursor, { height: Math.round(boxSize * 0.4) }]} />
              ) : (
                <Text style={[styles.otpDigit, { fontSize: Math.round(boxSize * 0.42) }, hasError && styles.otpDigitError]}>
                  {digit}
                </Text>
              )}
            </View>
          );
        })}
      </Animated.View>

      <TextInput
        ref={inputRef}
        style={[styles.hiddenInput, Platform.OS === 'web' && ({ outlineStyle: 'none' } as any)]}
        value={value}
        onChangeText={handleChange}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        keyboardType="number-pad"
        inputMode="numeric"
        textContentType="oneTimeCode"
        autoComplete={(Platform.OS === 'android' ? 'sms-otp' : 'one-time-code') as any}
        caretHidden
        selectionColor={COLORS.brand}
        accessibilityLabel="Verification code"
        accessibilityHint={`Enter the ${OTP_LENGTH}-digit code from your email`}
      />
    </TouchableOpacity>
  );
});

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function VerifyOTP() {
  const router = useRouter();
  const { email, purpose } = useLocalSearchParams<{ email: string; purpose: 'reset' | 'register' }>();

  const otpRef = useRef<OTPInputHandle>(null);
  const submittingRef = useRef(false);
  const reduceMotionRef = useRef(false);
  const navTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const shakeX = useRef(new Animated.Value(0)).current;

  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [verified, setVerified] = useState(false);
  const [error, setError] = useState('');
  const [resending, setResending] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [toast, setToast] = useState({ visible: false, message: '', isError: false });
  const [focusedControl, setFocusedControl] = useState<'back' | 'wrong' | 'verify' | 'resend' | null>(null);
  const [announcement, setAnnouncement] = useState('');

  const expiry = useCountdown(CODE_TTL_SECONDS);
  const cooldown = useCountdown(RESEND_COOLDOWN_SECONDS);
  const canResend = cooldown.expired;

  const showToast = (message: string, isError = false) => setToast({ visible: true, message, isError });
  const hideToast = () => setToast((t) => ({ ...t, visible: false }));

  // Wakes the free-tier backend before the user submits.
  useEffect(() => {
    authService.pingBackend?.();
    AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      reduceMotionRef.current = enabled;
    });
    return () => {
      if (navTimeoutRef.current) clearTimeout(navTimeoutRef.current);
    };
  }, []);

  // Screen readers hear the countdown only at the moments that matter,
  // not every second.
  useEffect(() => {
    if (expiry.expired) setAnnouncement(MESSAGES.expired);
    else if (expiry.seconds === 60) setAnnouncement('One minute left before this code expires.');
  }, [expiry.seconds, expiry.expired]);

  const shake = () => {
    if (reduceMotionRef.current) return;
    Animated.sequence(
      [8, -8, 6, -6, 0].map((toValue) =>
        Animated.timing(shakeX, { toValue, duration: 60, useNativeDriver: true })
      )
    ).start();
  };

  // Wrong or expired code: show the message, shake, then clear the boxes so
  // the user can type again straight away.
  const rejectCode = (message: string) => {
    setError(message);
    shake();
    setTimeout(() => {
      setOtp('');
      otpRef.current?.focus();
    }, 350);
  };

  const handleOtpChange = (value: string) => {
    setOtp(value);
    if (error) setError('');
  };

  const handleVerify = async (code?: string) => {
    const otpCode = code ?? otp;
    if (submittingRef.current || loading || verified) return;

    if (otpCode.length < OTP_LENGTH) {
      setError(MESSAGES.incomplete);
      otpRef.current?.focus();
      return;
    }

    if (expiry.expired) {
      rejectCode(MESSAGES.expired);
      return;
    }

    submittingRef.current = true;
    setLoading(true);
    setError('');

    try {
      const result = purpose === 'reset'
        ? await authService.verifyResetOTP(email!, otpCode)
        : await authService.verifyOTP(email!, otpCode);

      if (!result.success) {
        rejectCode(describeFailure(result.message));
        return;
      }

      setVerified(true);

      if (purpose === 'reset') {
        navTimeoutRef.current = setTimeout(() => {
          router.push({
            pathname: '/(auth)/reset-password',
            params: { email, otp: otpCode },
          });
          // This screen stays mounted under the next one, so clear the state
          // for when the user comes back.
          setVerified(false);
        }, 700);
      } else {
        // The one reliable signal of a brand-new account: flags this browser so
        // the onboarding tour plays once after the first sign-in
        // (see utils/onboardingTour.ts).
        markNewUserForOnboarding();
        setShowSuccessModal(true);
      }
    } catch (err: any) {
      const message = err.response?.data?.message;
      if (message) rejectCode(describeFailure(message));
      else setError(MESSAGES.network);
    } finally {
      submittingRef.current = false;
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resending || !canResend) return;

    setResending(true);
    try {
      if (purpose === 'reset') {
        await authService.forgotPassword(email!);
      } else {
        await authService.resendOTP(email!);
      }
      setOtp('');
      setError('');
      setAnnouncement('');
      expiry.reset();
      cooldown.reset();
      authService.pingBackend?.();
      showToast('New code sent. Check your email.');
      otpRef.current?.focus();
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Could not resend the code. Try again.', true);
    } finally {
      setResending(false);
    }
  };

  const maskedEmail = email ? email.replace(/(.{2})(.*)(@.*)/, '$1•••$3') : '';
  const heading = purpose === 'reset' ? 'Check your email' : 'Verify your email';
  const busy = loading || verified;

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />

      <CustomToast visible={toast.visible} message={toast.message} isError={toast.isError} onHide={hideToast} />

      <SuccessModal
        visible={showSuccessModal}
        title="Email verified"
        message="Your account is ready, and you're already signed in."
        onClose={() => {
          setShowSuccessModal(false);
          // verifyOTP signs the account in as part of verification, so this
          // goes straight to Home.
          router.replace('/(tabs)/home');
        }}
      />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
      >
        <DiagramBackground />
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={styles.card}>
            {/* Decorative connector dots */}
            <View style={styles.connectorTop} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden />
            <View style={styles.connectorBottom} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden />
            <View style={styles.connectorLeft} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden />
            <View style={styles.connectorRight} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden />

            <Pressable
              style={({ pressed }) => [
                styles.backBtn,
                focusedControl === 'back' && focusRing,
                pressed && styles.pressed,
              ]}
              onPress={() => router.back()}
              onFocus={() => setFocusedControl('back')}
              onBlur={() => setFocusedControl(null)}
              hitSlop={{ top: 6, bottom: 6, left: 10, right: 16 }}
              accessibilityRole="button"
              accessibilityLabel="Go back"
            >
              <BackIcon />
              <Text style={styles.backText}>Back</Text>
            </Pressable>

            <LogoTile />

            <Text style={styles.heading} accessibilityRole="header">{heading}</Text>
            <Text style={styles.subtitle}>
              {`We sent a ${OTP_LENGTH}-digit code to\n`}
              <Text style={styles.emailHighlight}>{maskedEmail}</Text>
            </Text>

            <Pressable
              style={({ pressed }) => [
                styles.wrongEmailBtn,
                focusedControl === 'wrong' && focusRing,
                pressed && styles.pressed,
              ]}
              onPress={() => router.back()}
              onFocus={() => setFocusedControl('wrong')}
              onBlur={() => setFocusedControl(null)}
              accessibilityRole="link"
              accessibilityLabel="Wrong email? Go back and change it"
            >
              <Text style={styles.linkText}>Wrong email?</Text>
            </Pressable>

            <OTPInput
              ref={otpRef}
              value={otp}
              onChange={handleOtpChange}
              onComplete={handleVerify}
              hasError={!!error}
              shakeX={shakeX}
            />

            {error ? (
              <View style={styles.statusRow} accessibilityRole="alert" accessibilityLiveRegion="polite">
                <InlineErrorIcon />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <View style={styles.timerRow}>
              {expiry.expired ? (
                <Text style={styles.timerExpired}>Code expired</Text>
              ) : (
                <>
                  <Text style={styles.timerLabel}>Code expires in </Text>
                  <Text style={styles.timerCount}>{formatTime(expiry.seconds)}</Text>
                </>
              )}
            </View>

            <Pressable
              style={({ pressed }) => [
                styles.btnVerify,
                busy && styles.btnBusy,
                focusedControl === 'verify' && focusRing,
                pressed && !busy && styles.pressed,
              ]}
              onPress={() => handleVerify()}
              onFocus={() => setFocusedControl('verify')}
              onBlur={() => setFocusedControl(null)}
              disabled={busy}
              accessibilityRole="button"
              accessibilityLabel={loading ? 'Verifying code' : verified ? 'Code verified' : 'Verify code'}
              accessibilityState={{ disabled: busy, busy: loading }}
            >
              {loading ? (
                <View style={styles.btnContentRow}>
                  <ActivityIndicator color="#ffffff" size="small" />
                  <Text style={[styles.btnVerifyText, { marginLeft: 10 }]}>Verifying…</Text>
                </View>
              ) : verified ? (
                <View style={styles.btnContentRow}>
                  <CheckMark />
                  <Text style={[styles.btnVerifyText, { marginLeft: 8 }]}>Verified</Text>
                </View>
              ) : (
                <Text style={styles.btnVerifyText}>Verify Code</Text>
              )}
            </Pressable>

            <View style={styles.resendRow}>
              {canResend ? (
                <Pressable
                  style={({ pressed }) => [
                    styles.resendBtn,
                    focusedControl === 'resend' && focusRing,
                    pressed && styles.pressed,
                  ]}
                  onPress={handleResend}
                  onFocus={() => setFocusedControl('resend')}
                  onBlur={() => setFocusedControl(null)}
                  disabled={resending}
                  accessibilityRole="button"
                  accessibilityLabel="Resend code"
                  accessibilityState={{ disabled: resending, busy: resending }}
                >
                  <Text style={styles.linkText}>{resending ? 'Sending…' : 'Resend code'}</Text>
                </Pressable>
              ) : (
                <Text style={styles.resendWait}>Resend code in {formatTime(cooldown.seconds)}</Text>
              )}
            </View>

            <Text style={styles.srOnly} accessibilityLiveRegion="polite">{announcement}</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#eef2ff' },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: PAGE_PADDING_H,
    paddingVertical: 40,
    minHeight: SCREEN_HEIGHT,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 28,
    paddingHorizontal: CARD_PADDING_H,
    paddingTop: 22,
    paddingBottom: 28,
    width: '100%',
    maxWidth: CARD_MAX_WIDTH,
    shadowColor: '#1e293b',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.12,
    shadowRadius: 30,
    elevation: 14,
    borderWidth: 1.5,
    borderColor: '#f1f5ff',
    position: 'relative',
  },
  connectorTop: {
    position: 'absolute', top: -4, alignSelf: 'center',
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: '#ffffff', borderWidth: 1.5, borderColor: '#c7d2fe',
  },
  connectorBottom: {
    position: 'absolute', bottom: -4, alignSelf: 'center',
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: '#ffffff', borderWidth: 1.5, borderColor: '#c7d2fe',
  },
  connectorLeft: {
    position: 'absolute', left: -4, top: '50%', transform: [{ translateY: -4 }],
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: '#ffffff', borderWidth: 1.5, borderColor: '#c7d2fe',
  },
  connectorRight: {
    position: 'absolute', right: -4, top: '50%', transform: [{ translateY: -4 }],
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: '#ffffff', borderWidth: 1.5, borderColor: '#c7d2fe',
  },
  pressed: { opacity: 0.7 },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 44,
    paddingRight: 12,
    marginBottom: 4,
    alignSelf: 'flex-start',
    borderRadius: 10,
  },
  backText: { fontSize: 15, color: '#334155', fontWeight: '600' },
  logoTile: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: COLORS.brand,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 18,
    transform: [{ rotate: '-6deg' }],
    shadowColor: COLORS.brand,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 14,
    elevation: 6,
  },
  heading: {
    fontSize: 26,
    fontWeight: '800',
    color: COLORS.textStrong,
    textAlign: 'center',
    letterSpacing: -0.6,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textBody,
    textAlign: 'center',
    lineHeight: 22,
  },
  emailHighlight: { color: COLORS.brand, fontWeight: '700' },
  wrongEmailBtn: {
    alignSelf: 'center',
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 10,
    marginBottom: 8,
    borderRadius: 8,
  },
  linkText: { fontSize: 14, fontWeight: '700', color: COLORS.brand },

  otpContainer: { width: '100%' },
  otpRow: { flexDirection: 'row', justifyContent: 'center', gap: OTP_GAP },
  hiddenInput: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    opacity: 0,
    zIndex: 10,
    backgroundColor: 'transparent',
  },
  // Width, height and font size come from the live box size computed in OTPInput.
  otpBox: {
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: COLORS.boxBorder,
    backgroundColor: COLORS.boxFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  otpBoxFilled: { borderColor: COLORS.textMuted, backgroundColor: '#ffffff' },
  otpBoxActive: {
    borderWidth: 2,
    borderColor: COLORS.brand,
    backgroundColor: '#ffffff',
    shadowColor: COLORS.brand,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 5,
  },
  otpBoxError: { borderColor: COLORS.error, backgroundColor: '#fff5f5' },
  otpDigit: { fontWeight: '700', color: '#1a1f36' },
  otpDigitError: { color: COLORS.error },
  cursor: { width: 2, borderRadius: 1, backgroundColor: COLORS.brand },

  statusRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'center',
    gap: 6,
    marginTop: 12,
  },
  errorText: { flexShrink: 1, fontSize: 13, lineHeight: 18, color: COLORS.error, fontWeight: '500' },
  timerRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 14 },
  timerLabel: { fontSize: 14, color: COLORS.textMuted },
  timerCount: { fontSize: 14, fontWeight: '700', color: COLORS.brand, fontVariant: ['tabular-nums'] },
  timerExpired: { fontSize: 14, color: COLORS.error, fontWeight: '600' },

  btnVerify: {
    backgroundColor: COLORS.brand,
    borderRadius: 14,
    minHeight: 52,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 18,
    shadowColor: COLORS.brand,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 8,
  },
  btnBusy: { backgroundColor: COLORS.brandDark, opacity: 0.9 },
  btnContentRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  btnVerifyText: { color: '#ffffff', fontSize: 16, fontWeight: '700', letterSpacing: 0.3 },

  resendRow: { alignItems: 'center', marginTop: 6 },
  resendBtn: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 12, borderRadius: 8 },
  resendWait: {
    minHeight: 44,
    textAlignVertical: 'center',
    lineHeight: 44,
    fontSize: 14,
    color: COLORS.textMuted,
    fontVariant: ['tabular-nums'],
  },
  srOnly: { position: 'absolute', width: 1, height: 1, overflow: 'hidden' },

  // Toast
  toastContainer: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 50,
    left: 20,
    right: 20,
    zIndex: 1000,
    alignItems: 'center',
  },
  toastContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    minWidth: 200,
    maxWidth: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  toastSuccess: { backgroundColor: COLORS.success },
  toastError: { backgroundColor: COLORS.error },
  toastText: { color: '#ffffff', fontSize: 14, fontWeight: '600', marginLeft: 10, flex: 1 },

  // Background
  gridBackground: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
  gridOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(255,255,255,0.10)' },

  // Success modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContainer: {
    width: '85%',
    maxWidth: 340,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  modalIconWrapper: { marginBottom: 16 },
  modalIconCircle: { width: 64, height: 64, borderRadius: 32, justifyContent: 'center', alignItems: 'center' },
  modalTitle: { fontSize: 20, fontWeight: '700', color: '#1e293b', textAlign: 'center', marginBottom: 8 },
  modalMessage: { fontSize: 14, color: COLORS.textMuted, textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  modalButton: { width: '100%', paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  modalButtonText: { color: '#ffffff', fontSize: 16, fontWeight: '600' },
});