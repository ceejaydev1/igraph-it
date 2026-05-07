// app/(auth)/verify-otp.tsx
// iGraph IT — Premium Verify OTP Screen

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Platform,
  Dimensions,
  KeyboardAvoidingView,
  NativeSyntheticEvent,
  TextInputKeyPressEventData,
} from 'react-native';

import { useRouter, useLocalSearchParams } from 'expo-router';

import {
  Svg,
  Circle,
  Rect,
  Path,
  Text as SvgText,
  Defs,
  Pattern,
} from 'react-native-svg';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } =
  Dimensions.get('window');

const OTP_LENGTH = 6;

//
// ──────────────────────────────────────────────────────────
// DIAGRAM BACKGROUND (same theme as forgot-password)
// ──────────────────────────────────────────────────────────
//

const DiagramBackground = () => (
  <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
    <Svg
      width={SCREEN_WIDTH}
      height={SCREEN_HEIGHT}
      style={StyleSheet.absoluteFillObject}
    >
      <Defs>
        <Pattern
          id="grid2"
          width="34"
          height="34"
          patternUnits="userSpaceOnUse"
        >
          <Path
            d="M 34 0 L 0 0 0 34"
            fill="none"
            stroke="#ccd5f7"
            strokeWidth="1.2"
            opacity="1"
          />
        </Pattern>

        <Pattern
          id="dots2"
          width="26"
          height="26"
          patternUnits="userSpaceOnUse"
        >
          <Circle cx="13" cy="13" r="1.3" fill="#b8c4f3" opacity="0.8" />
        </Pattern>
      </Defs>

      {/* BG */}
      <Rect width={SCREEN_WIDTH} height={SCREEN_HEIGHT} fill="#eef2ff" />

      {/* GRID */}
      <Rect
        width={SCREEN_WIDTH}
        height={SCREEN_HEIGHT}
        fill="url(#grid2)"
        opacity="1"
      />

      {/* DOT PATCHES */}
      <Rect
        x={0}
        y={0}
        width={SCREEN_WIDTH * 0.28}
        height={SCREEN_HEIGHT * 0.34}
        fill="url(#dots2)"
      />
      <Rect
        x={SCREEN_WIDTH * 0.72}
        y={SCREEN_HEIGHT * 0.66}
        width={SCREEN_WIDTH * 0.28}
        height={SCREEN_HEIGHT * 0.34}
        fill="url(#dots2)"
      />

      {/* TOP FLOW LINE */}
      <Path
        d={`
          M ${SCREEN_WIDTH / 2} 0
          L ${SCREEN_WIDTH / 2} 50
          C ${SCREEN_WIDTH / 2} 90,
            ${SCREEN_WIDTH - 120} 100,
            ${SCREEN_WIDTH - 90} 100
        `}
        stroke="#b7c2f1"
        strokeWidth="2"
        fill="none"
        strokeDasharray="6,6"
      />

      {/* VALIDATE NODE (top right) */}
      <Rect
        x={SCREEN_WIDTH - 155}
        y={78}
        width={120}
        height={42}
        rx={12}
        fill="#ffffff"
        stroke="#c9d2f4"
        strokeWidth={1.5}
      />
      <SvgText
        x={SCREEN_WIDTH - 95}
        y={104}
        textAnchor="middle"
        fontSize={13}
        fill="#6070c7"
        fontWeight="700"
      >
        Validate
      </SvgText>

      {/* FLOW DOWN RIGHT */}
      <Path
        d={`
          M ${SCREEN_WIDTH - 95} 120
          L ${SCREEN_WIDTH - 95} ${SCREEN_HEIGHT * 0.38}
        `}
        stroke="#b7c2f1"
        strokeWidth="2"
        fill="none"
        strokeDasharray="6,6"
      />

      {/* DECISION DIAMOND */}
      <Path
        d={`
          M ${SCREEN_WIDTH - 55},${SCREEN_HEIGHT * 0.38}
          L ${SCREEN_WIDTH - 15},${SCREEN_HEIGHT * 0.38 + 40}
          L ${SCREEN_WIDTH - 55},${SCREEN_HEIGHT * 0.38 + 80}
          L ${SCREEN_WIDTH - 95},${SCREEN_HEIGHT * 0.38 + 40}
          Z
        `}
        fill="#ffffff"
        stroke="#c9d2f4"
        strokeWidth={1.5}
      />
      <SvgText
        x={SCREEN_WIDTH - 55}
        y={SCREEN_HEIGHT * 0.38 + 45}
        textAnchor="middle"
        fontSize={11}
        fill="#6070c7"
        fontWeight="700"
      >
        Valid?
      </SvgText>

      {/* FLOW TO BOTTOM LEFT */}
      <Path
        d={`
          M ${SCREEN_WIDTH - 95} ${SCREEN_HEIGHT * 0.38 + 40}
          C ${SCREEN_WIDTH - 160} ${SCREEN_HEIGHT * 0.38 + 40},
            80 ${SCREEN_HEIGHT * 0.72},
            60 ${SCREEN_HEIGHT * 0.76}
        `}
        stroke="#bcc8f5"
        strokeWidth="2"
        fill="none"
        strokeDasharray="6,6"
      />

      {/* SUCCESS NODE */}
      <Rect
        x={10}
        y={SCREEN_HEIGHT * 0.76}
        width={100}
        height={40}
        rx={12}
        fill="#ffffff"
        stroke="#c9d2f4"
        strokeWidth={1.5}
      />
      <SvgText
        x={60}
        y={SCREEN_HEIGHT * 0.76 + 25}
        textAnchor="middle"
        fontSize={12}
        fill="#6070c7"
        fontWeight="700"
      >
        Success
      </SvgText>

      {/* FLOW FROM SUCCESS TO BOTTOM */}
      <Path
        d={`
          M 60 ${SCREEN_HEIGHT * 0.76 + 40}
          C 60 ${SCREEN_HEIGHT * 0.88},
            ${SCREEN_WIDTH / 2} ${SCREEN_HEIGHT * 0.92},
            ${SCREEN_WIDTH / 2} ${SCREEN_HEIGHT}
        `}
        stroke="#b7c2f1"
        strokeWidth="2"
        fill="none"
        strokeDasharray="6,6"
      />

      {/* BLOBS */}
      <Circle
        cx={SCREEN_WIDTH * 0.82}
        cy={SCREEN_HEIGHT * 0.08}
        r={26}
        fill="#dfe5ff"
        opacity={0.4}
      />
      <Circle
        cx={SCREEN_WIDTH * 0.18}
        cy={SCREEN_HEIGHT * 0.88}
        r={30}
        fill="#dfe5ff"
        opacity={0.38}
      />
      <Circle
        cx={SCREEN_WIDTH * 0.5}
        cy={SCREEN_HEIGHT * 0.5}
        r={18}
        fill="#dfe5ff"
        opacity={0.25}
      />
    </Svg>
  </View>
);

//
// ──────────────────────────────────────────────────────────
// ICONS
// ──────────────────────────────────────────────────────────
//

const ShieldIcon = () => (
  <Svg width={56} height={56} viewBox="0 0 48 48" fill="none">
    <Rect width={48} height={48} rx={16} fill="#eef2ff" />
    <Path
      d="M24 10l-10 4v8c0 6.6 4.3 12.8 10 14 5.7-1.2 10-7.4 10-14v-8l-10-4z"
      stroke="#4c6fff"
      strokeWidth={1.8}
      fill="none"
      strokeLinejoin="round"
    />
    <Path
      d="M20 24l3 3 5-5"
      stroke="#4c6fff"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const BackIcon = () => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
    <Path
      d="M19 12H5M5 12l7 7M5 12l7-7"
      stroke="#4a5568"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

//
// ──────────────────────────────────────────────────────────
// COUNTDOWN TIMER HOOK
// ──────────────────────────────────────────────────────────
//

function useCountdown(initial: number) {
  const [seconds, setSeconds] = useState(initial);
  const [active, setActive] = useState(true);

  useEffect(() => {
    if (!active || seconds <= 0) return;
    const t = setTimeout(() => setSeconds((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [seconds, active]);

  const reset = () => {
    setSeconds(initial);
    setActive(true);
  };

  return { seconds, expired: seconds <= 0, reset };
}

//
// ──────────────────────────────────────────────────────────
// OTP DIGIT BOX
// ──────────────────────────────────────────────────────────
//

interface OtpBoxProps {
  value: string;
  focused: boolean;
  hasError: boolean;
}

const OtpBox = ({ value, focused, hasError }: OtpBoxProps) => (
  <View
    style={[
      styles.otpBox,
      focused && styles.otpBoxFocused,
      hasError && styles.otpBoxError,
      value && !hasError && styles.otpBoxFilled,
    ]}
  >
    <Text style={[styles.otpDigit, hasError && styles.otpDigitError]}>
      {value || ''}
    </Text>
    {focused && !value ? <View style={styles.cursor} /> : null}
  </View>
);

//
// ──────────────────────────────────────────────────────────
// MAIN SCREEN
// ──────────────────────────────────────────────────────────
//

export default function VerifyOTP() {
  const router = useRouter();
  const { email, purpose } = useLocalSearchParams<{
    email: string;
    purpose: 'reset' | 'register';
  }>();

  const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [focusedIndex, setFocusedIndex] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [verified, setVerified] = useState(false);

  const inputRefs = useRef<Array<TextInput | null>>(
    Array(OTP_LENGTH).fill(null)
  );

  const { seconds, expired, reset: resetTimer } = useCountdown(60);

  // Focus first box on mount
  useEffect(() => {
    const t = setTimeout(() => {
      inputRefs.current[0]?.focus();
    }, 300);
    return () => clearTimeout(t);
  }, []);

  const handleChange = (text: string, index: number) => {
    // Allow only digits
    const digit = text.replace(/[^0-9]/g, '').slice(-1);

    setError('');

    const updated = [...otp];
    updated[index] = digit;
    setOtp(updated);

    // Auto-advance
    if (digit && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
      setFocusedIndex(index + 1);
    }
  };

  const handleKeyPress = (
    e: NativeSyntheticEvent<TextInputKeyPressEventData>,
    index: number
  ) => {
    if (e.nativeEvent.key === 'Backspace') {
      setError('');
      const updated = [...otp];

      if (updated[index]) {
        // Clear current
        updated[index] = '';
        setOtp(updated);
      } else if (index > 0) {
        // Go back
        updated[index - 1] = '';
        setOtp(updated);
        inputRefs.current[index - 1]?.focus();
        setFocusedIndex(index - 1);
      }
    }
  };

  const handleVerify = async () => {
    const code = otp.join('');

    if (code.length < OTP_LENGTH) {
      setError('Please enter the complete 6-digit code.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Placeholder: replace with real Firebase OTP verification
      await new Promise((res) => setTimeout(res, 1500));

      setLoading(false);
      setVerified(true);

      // Navigate after brief success display
      setTimeout(() => {
        if (purpose === 'reset') {
          router.push({
            pathname: '/(auth)/reset-password',
            params: { email },
          });
        } else {
          router.replace('/(tabs)');
        }
      }, 1200);
    } catch (err: any) {
      setLoading(false);
      setError(err.message || 'Invalid code. Please try again.');
    }
  };

  const handleResend = () => {
    if (!expired) return;
    setOtp(Array(OTP_LENGTH).fill(''));
    setError('');
    resetTimer();
    inputRefs.current[0]?.focus();
    setFocusedIndex(0);
    // TODO: call Firebase resend OTP
  };

  const maskedEmail = email
    ? email.replace(/(.{2})(.*)(@.*)/, (_, a, b, c) =>
        a + b.replace(/./g, '•') + c
      )
    : '';

  const isComplete = otp.every((d) => d !== '');

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <DiagramBackground />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.card}>

          {/* CONNECTOR TOP */}
          <View style={styles.connectorTop} />

          {/* BACK */}
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <BackIcon />
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>

          {/* ICON */}
          <View style={styles.iconWrap}>
            {verified ? (
              // Checkmark icon on success
              <Svg width={56} height={56} viewBox="0 0 48 48" fill="none">
                <Rect width={48} height={48} rx={16} fill="#e6ecff" />
                <Path
                  d="M14 24l8 8 12-14"
                  stroke="#4c6fff"
                  strokeWidth={2.2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </Svg>
            ) : (
              <ShieldIcon />
            )}
          </View>

          {/* TITLE */}
          <Text style={styles.heading}>
            {verified ? 'Verified!' : 'Check Your Email'}
          </Text>

          {/* SUBTITLE */}
          <Text style={styles.subtitle}>
            {verified
              ? 'Your code was accepted.\nRedirecting you now…'
              : `We sent a 6-digit code to\n`}
            {!verified && (
              <Text style={styles.emailHighlight}>{maskedEmail}</Text>
            )}
          </Text>

          {!verified && (
            <>
              {/* OTP INPUT ROW */}
              <View style={styles.otpRow}>
                {otp.map((digit, i) => (
                  <View key={i}>
                    <TextInput
                      ref={(ref) => { inputRefs.current[i] = ref; }}
                      style={styles.hiddenInput}
                      value={digit}
                      onChangeText={(t) => handleChange(t, i)}
                      onKeyPress={(e) => handleKeyPress(e, i)}
                      onFocus={() => setFocusedIndex(i)}
                      onBlur={() => setFocusedIndex(-1)}
                      keyboardType="number-pad"
                      maxLength={1}
                      selectTextOnFocus
                      caretHidden
                    />
                    <OtpBox
                      value={digit}
                      focused={focusedIndex === i}
                      hasError={!!error}
                    />
                  </View>
                ))}
              </View>

              {/* ERROR */}
              {error ? (
                <Text style={styles.errorText}>{error}</Text>
              ) : null}

              {/* TIMER */}
              <View style={styles.timerRow}>
                {expired ? (
                  <Text style={styles.timerExpired}>Code expired</Text>
                ) : (
                  <>
                    <Text style={styles.timerLabel}>
                      Code expires in{' '}
                    </Text>
                    <Text style={styles.timerCount}>
                      {String(Math.floor(seconds / 60)).padStart(2, '0')}:
                      {String(seconds % 60).padStart(2, '0')}
                    </Text>
                  </>
                )}
              </View>

              {/* VERIFY BUTTON */}
              <TouchableOpacity
                style={[
                  styles.btnVerify,
                  (!isComplete || loading) && styles.btnDisabled,
                ]}
                onPress={handleVerify}
                activeOpacity={0.9}
                disabled={!isComplete || loading}
              >
                {loading ? (
                  <ActivityIndicator color="#ffffff" size="small" />
                ) : (
                  <Text style={styles.btnVerifyText}>Verify Code</Text>
                )}
              </TouchableOpacity>

              {/* RESEND */}
              <TouchableOpacity
                style={styles.resendBtn}
                onPress={handleResend}
                disabled={!expired}
                activeOpacity={expired ? 0.7 : 1}
              >
                <Text
                  style={[
                    styles.resendText,
                    !expired && styles.resendDisabled,
                  ]}
                >
                  Resend code
                </Text>
              </TouchableOpacity>
            </>
          )}

          {/* CONNECTOR BOTTOM */}
          <View style={styles.connectorBottom} />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

//
// ──────────────────────────────────────────────────────────
// STYLES
// ──────────────────────────────────────────────────────────
//

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
  },

  card: {
    backgroundColor: '#ffffff',
    borderRadius: 28,
    paddingHorizontal: 32,
    paddingTop: 34,
    paddingBottom: 36,
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

  connectorTop: {
    position: 'absolute',
    top: -7,
    alignSelf: 'center',
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderColor: '#c7d2fe',
    zIndex: 20,
  },

  connectorBottom: {
    position: 'absolute',
    bottom: -7,
    alignSelf: 'center',
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderColor: '#c7d2fe',
    zIndex: 20,
  },

  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 24,
    alignSelf: 'flex-start',
  },

  backText: {
    fontSize: 14,
    color: '#4a5568',
    fontWeight: '600',
  },

  iconWrap: {
    alignItems: 'center',
    marginBottom: 22,
  },

  heading: {
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    fontSize: 22,
    fontWeight: '700',
    color: '#1a1f36',
    textAlign: 'center',
    letterSpacing: -0.6,
    marginBottom: 10,
    marginTop: -6,
  },

  subtitle: {
    fontSize: 14,
    color: '#7f8bb3',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },

  emailHighlight: {
    color: '#4c6fff',
    fontWeight: '700',
  },

  // ── OTP ROW ──

  otpRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 8,
  },

  hiddenInput: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    opacity: 0,
    zIndex: 10,
  },

  otpBox: {
    width: (Math.min(SCREEN_WIDTH - 36, 430) - 64 - 50) / OTP_LENGTH,
    height: 58,
    borderRadius: 14,
    borderWidth: 1.8,
    borderColor: '#dde3fa',
    backgroundColor: '#f8faff',
    alignItems: 'center',
    justifyContent: 'center',
  },

  otpBoxFocused: {
    borderColor: '#4c6fff',
    backgroundColor: '#ffffff',
    shadowColor: '#4c6fff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 5,
  },

  otpBoxFilled: {
    borderColor: '#a5b4fc',
    backgroundColor: '#f0f4ff',
  },

  otpBoxError: {
    borderColor: '#ef4444',
    backgroundColor: '#fff5f5',
  },

  otpDigit: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1a1f36',
    letterSpacing: 0,
  },

  otpDigitError: {
    color: '#ef4444',
  },

  cursor: {
    position: 'absolute',
    bottom: 12,
    width: 2,
    height: 20,
    borderRadius: 2,
    backgroundColor: '#4c6fff',
    opacity: 0.8,
  },

  // ── TIMER ──

  timerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 14,
    marginBottom: 4,
  },

  timerLabel: {
    fontSize: 13,
    color: '#8896b3',
  },

  timerCount: {
    fontSize: 13,
    fontWeight: '700',
    color: '#4c6fff',
  },

  timerExpired: {
    fontSize: 13,
    color: '#ef4444',
    fontWeight: '600',
  },

  // ── ERROR ──

  errorText: {
    fontSize: 12,
    color: '#ef4444',
    marginTop: 8,
    textAlign: 'center',
    fontWeight: '500',
  },

  // ── BUTTON ──

  btnVerify: {
    backgroundColor: '#4c6fff',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 22,
    shadowColor: '#4c6fff',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.32,
    shadowRadius: 20,
    elevation: 8,
  },

  btnDisabled: {
    opacity: 0.5,
  },

  btnVerifyText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.3,
  },

  // ── RESEND ──

  resendBtn: {
    alignItems: 'center',
    marginTop: 18,
    paddingVertical: 4,
  },

  resendText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1a1f36',
  },

  resendDisabled: {
    color: '#b0bbd6',
  },
});