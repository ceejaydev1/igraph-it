// app/(auth)/verify-otp.tsx

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
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Svg, Circle, Rect, Path, Text as SvgText, Defs, Pattern } from 'react-native-svg';
import * as authService from '../../services/authService';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const OTP_LENGTH = 6;

// DiagramBackground (simplified)
const DiagramBackground = () => (
  <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
    <Svg width={SCREEN_WIDTH} height={SCREEN_HEIGHT} style={StyleSheet.absoluteFillObject}>
      <Defs>
        <Pattern id="grid" width="34" height="34" patternUnits="userSpaceOnUse">
          <Path d="M 34 0 L 0 0 0 34" fill="none" stroke="#ccd5f7" strokeWidth="1.2" opacity="1" />
        </Pattern>
        <Pattern id="dots" width="26" height="26" patternUnits="userSpaceOnUse">
          <Circle cx="13" cy="13" r="1.3" fill="#b8c4f3" opacity="0.8" />
        </Pattern>
      </Defs>
      <Rect width={SCREEN_WIDTH} height={SCREEN_HEIGHT} fill="#eef2ff" />
      <Rect width={SCREEN_WIDTH} height={SCREEN_HEIGHT} fill="url(#grid)" opacity="1" />
      <Rect x={0} y={0} width={SCREEN_WIDTH * 0.28} height={SCREEN_HEIGHT * 0.34} fill="url(#dots)" />
      <Rect x={SCREEN_WIDTH * 0.72} y={SCREEN_HEIGHT * 0.66} width={SCREEN_WIDTH * 0.28} height={SCREEN_HEIGHT * 0.34} fill="url(#dots)" />
    </Svg>
  </View>
);

const ShieldIcon = () => (
  <Svg width={56} height={56} viewBox="0 0 48 48" fill="none">
    <Rect width={48} height={48} rx={16} fill="#eef2ff" />
    <Path d="M24 10l-10 4v8c0 6.6 4.3 12.8 10 14 5.7-1.2 10-7.4 10-14v-8l-10-4z" stroke="#4c6fff" strokeWidth={1.8} fill="none" strokeLinejoin="round" />
    <Path d="M20 24l3 3 5-5" stroke="#4c6fff" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const BackIcon = () => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
    <Path d="M19 12H5M5 12l7 7M5 12l7-7" stroke="#4a5568" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const CheckIcon = () => (
  <Svg width={56} height={56} viewBox="0 0 48 48" fill="none">
    <Rect width={48} height={48} rx={16} fill="#e6ecff" />
    <Path d="M14 24l8 8 12-14" stroke="#4c6fff" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

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
    <Text style={[styles.otpDigit, hasError && styles.otpDigitError]}>{value || ''}</Text>
    {focused && !value ? <View style={styles.cursor} /> : null}
  </View>
);

export default function VerifyOTP() {
  const router = useRouter();
  const { email, purpose } = useLocalSearchParams<{ email: string; purpose: 'reset' | 'register' }>();

  const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [focusedIndex, setFocusedIndex] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [verified, setVerified] = useState(false);
  const [resending, setResending] = useState(false);

  const inputRefs = useRef<Array<TextInput | null>>(Array(OTP_LENGTH).fill(null));
  const { seconds, expired, reset: resetTimer } = useCountdown(60);

  useEffect(() => {
    setTimeout(() => inputRefs.current[0]?.focus(), 300);
  }, []);

  const handleChange = (text: string, index: number) => {
    const digit = text.replace(/[^0-9]/g, '').slice(-1);
    setError('');
    const updated = [...otp];
    updated[index] = digit;
    setOtp(updated);
    if (digit && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
      setFocusedIndex(index + 1);
    }
  };

  const handleKeyPress = (e: NativeSyntheticEvent<TextInputKeyPressEventData>, index: number) => {
    if (e.nativeEvent.key === 'Backspace') {
      setError('');
      const updated = [...otp];
      if (updated[index]) {
        updated[index] = '';
        setOtp(updated);
      } else if (index > 0) {
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
      let result;
      if (purpose === 'reset') {
        result = await authService.verifyResetOTP(email!, code);
      } else {
        result = await authService.verifyOTP(email!, code);
      }

      if (result.success) {
        setVerified(true);
        setTimeout(() => {
          if (purpose === 'reset') {
            router.push({
              pathname: '/(auth)/reset-password',
              params: { email, otp: code },
            });
          } else {
            router.replace('/(auth)/signin');
          }
        }, 1200);
      } else {
        setError(result.message || 'Invalid code. Please try again.');
      }
    } catch (error: any) {
      setError(error.response?.data?.message || 'Verification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!expired) return;
    setResending(true);
    try {
      if (purpose === 'reset') {
        await authService.forgotPassword(email!);
      } else {
        await authService.resendOTP(email!);
      }
      setOtp(Array(OTP_LENGTH).fill(''));
      setError('');
      resetTimer();
      inputRefs.current[0]?.focus();
      setFocusedIndex(0);
      Alert.alert('Success', 'A new OTP has been sent to your email.');
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to resend OTP');
    } finally {
      setResending(false);
    }
  };

  const maskedEmail = email ? email.replace(/(.{2})(.*)(@.*)/, (_, a, b, c) => a + b.replace(/./g, '•') + c) : '';
  const isComplete = otp.every((d) => d !== '');

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <DiagramBackground />
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <View style={styles.connectorTop} />
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
            <BackIcon />
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>
          <View style={styles.iconWrap}>{verified ? <CheckIcon /> : <ShieldIcon />}</View>
          <Text style={styles.heading}>{verified ? 'Verified!' : 'Check Your Email'}</Text>
          <Text style={styles.subtitle}>
            {verified ? 'Your code was accepted.\nRedirecting you now…' : `We sent a 6-digit code to\n`}
            {!verified && <Text style={styles.emailHighlight}>{maskedEmail}</Text>}
          </Text>

          {!verified && (
            <>
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
                    <OtpBox value={digit} focused={focusedIndex === i} hasError={!!error} />
                  </View>
                ))}
              </View>
              {error ? <Text style={styles.errorText}>{error}</Text> : null}
              <View style={styles.timerRow}>
                {expired ? <Text style={styles.timerExpired}>Code expired</Text> : (
                  <>
                    <Text style={styles.timerLabel}>Code expires in </Text>
                    <Text style={styles.timerCount}>{String(Math.floor(seconds / 60)).padStart(2, '0')}:{String(seconds % 60).padStart(2, '0')}</Text>
                  </>
                )}
              </View>
              <TouchableOpacity
                style={[styles.btnVerify, (!isComplete || loading) && styles.btnDisabled]}
                onPress={handleVerify}
                activeOpacity={0.9}
                disabled={!isComplete || loading}
              >
                {loading ? <ActivityIndicator color="#ffffff" size="small" /> : <Text style={styles.btnVerifyText}>Verify Code</Text>}
              </TouchableOpacity>
              <TouchableOpacity style={styles.resendBtn} onPress={handleResend} disabled={!expired || resending} activeOpacity={expired ? 0.7 : 1}>
                <Text style={[styles.resendText, !expired && styles.resendDisabled]}>
                  {resending ? 'Sending...' : 'Resend code'}
                </Text>
              </TouchableOpacity>
            </>
          )}
          <View style={styles.connectorBottom} />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#eef2ff' },
  scrollContent: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 18, paddingVertical: 40 },
  card: { backgroundColor: '#ffffff', borderRadius: 28, paddingHorizontal: 32, paddingTop: 34, paddingBottom: 36, width: '100%', maxWidth: 430, shadowColor: '#1e293b', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.12, shadowRadius: 30, elevation: 14, borderWidth: 1.5, borderColor: '#f1f5ff', position: 'relative' },
  connectorTop: { position: 'absolute', top: -7, alignSelf: 'center', width: 14, height: 14, borderRadius: 7, backgroundColor: '#ffffff', borderWidth: 2, borderColor: '#c7d2fe', zIndex: 20 },
  connectorBottom: { position: 'absolute', bottom: -7, alignSelf: 'center', width: 14, height: 14, borderRadius: 7, backgroundColor: '#ffffff', borderWidth: 2, borderColor: '#c7d2fe', zIndex: 20 },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 24, alignSelf: 'flex-start' },
  backText: { fontSize: 14, color: '#4a5568', fontWeight: '600' },
  iconWrap: { alignItems: 'center', marginBottom: 22 },
  heading: { fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif', fontSize: 22, fontWeight: '700', color: '#1a1f36', textAlign: 'center', letterSpacing: -0.6, marginBottom: 10, marginTop: -6 },
  subtitle: { fontSize: 14, color: '#7f8bb3', textAlign: 'center', lineHeight: 22, marginBottom: 32 },
  emailHighlight: { color: '#4c6fff', fontWeight: '700' },
  otpRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 10, marginBottom: 8 },
  hiddenInput: { position: 'absolute', width: '100%', height: '100%', opacity: 0, zIndex: 10 },
  otpBox: { width: (Math.min(SCREEN_WIDTH - 36, 430) - 64 - 50) / OTP_LENGTH, height: 58, borderRadius: 14, borderWidth: 1.8, borderColor: '#dde3fa', backgroundColor: '#f8faff', alignItems: 'center', justifyContent: 'center' },
  otpBoxFocused: { borderColor: '#4c6fff', backgroundColor: '#ffffff', shadowColor: '#4c6fff', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.18, shadowRadius: 10, elevation: 5 },
  otpBoxFilled: { borderColor: '#a5b4fc', backgroundColor: '#f0f4ff' },
  otpBoxError: { borderColor: '#ef4444', backgroundColor: '#fff5f5' },
  otpDigit: { fontSize: 22, fontWeight: '700', color: '#1a1f36' },
  otpDigitError: { color: '#ef4444' },
  cursor: { position: 'absolute', bottom: 12, width: 2, height: 20, borderRadius: 2, backgroundColor: '#4c6fff', opacity: 0.8 },
  timerRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 14, marginBottom: 4 },
  timerLabel: { fontSize: 13, color: '#8896b3' },
  timerCount: { fontSize: 13, fontWeight: '700', color: '#4c6fff' },
  timerExpired: { fontSize: 13, color: '#ef4444', fontWeight: '600' },
  errorText: { fontSize: 12, color: '#ef4444', marginTop: 8, textAlign: 'center', fontWeight: '500' },
  btnVerify: { backgroundColor: '#4c6fff', borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 22, shadowColor: '#4c6fff', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.32, shadowRadius: 20, elevation: 8 },
  btnDisabled: { opacity: 0.5 },
  btnVerifyText: { color: '#ffffff', fontSize: 15, fontWeight: '700', letterSpacing: 0.3 },
  resendBtn: { alignItems: 'center', marginTop: 18, paddingVertical: 4 },
  resendText: { fontSize: 13, fontWeight: '700', color: '#1a1f36' },
  resendDisabled: { color: '#b0bbd6' },
});