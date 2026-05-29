// app/(auth)/verify-otp.tsx - Full updated file with optimizations

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
  Modal,
  Image,
  Animated,
} from 'react-native';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { Svg, Circle, Rect, Path } from 'react-native-svg';
import * as authService from '../../services/authService';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const OTP_LENGTH = 6;

// DiagramBackground with grid-bg.png
const DiagramBackground = () => (
  <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
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
    <Path d="M19 12H5M5 12l7 7M5 12l7-7" stroke="#4a5568" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const CheckIcon = () => (
  <Svg width={40} height={40} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="12" r="10" stroke="#10b981" strokeWidth="2" />
    <Path d="M8 12l3 3 5-6" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

// Custom Error Popup Modal
const ErrorPopupModal = ({ visible, title, message, onClose, onAction, actionButtonText }: { 
  visible: boolean; 
  title: string; 
  message: string; 
  onClose: () => void;
  onAction?: () => void;
  actionButtonText?: string;
}) => {
  return (
    <Modal 
      animationType="fade" 
      transparent={true} 
      visible={visible} 
      onRequestClose={onClose}
    >
      <TouchableOpacity 
        style={styles.errorModalOverlay} 
        activeOpacity={1} 
        onPress={onClose}
      >
        <View style={styles.errorModalContainer}>
          <View style={styles.errorModalIconWrapper}>
            <View style={styles.errorModalIconCircle}>
              <Svg width={32} height={32} viewBox="0 0 24 24" fill="none">
                <Circle cx="12" cy="12" r="10" stroke="#3b5bdb" strokeWidth="1.5" />
                <Path d="M12 8v4M12 16h.01" stroke="#3b5bdb" strokeWidth="2" strokeLinecap="round" />
              </Svg>
            </View>
          </View>
          <Text style={styles.errorModalTitle}>{title}</Text>
          <Text style={styles.errorModalMessage}>{message}</Text>
          {onAction && (
            <TouchableOpacity
              style={styles.errorModalButtonPrimary}
              onPress={() => {
                onClose();
                onAction();
              }}
            >
              <Text style={styles.errorModalButtonTextPrimary}>{actionButtonText || 'Continue'}</Text>
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

// Success Modal (only for registration flow)
const SuccessModal = ({ visible, title, message, onClose, buttonText = 'Continue' }: { 
  visible: boolean; 
  title: string; 
  message: string; 
  onClose: () => void;
  buttonText?: string;
}) => {
  return (
    <Modal 
      animationType="fade" 
      transparent={true} 
      visible={visible} 
      onRequestClose={onClose}
    >
      <TouchableOpacity 
        style={styles.errorModalOverlay} 
        activeOpacity={1} 
        onPress={onClose}
      >
        <View style={styles.errorModalContainer}>
          <View style={styles.errorModalIconWrapper}>
            <View style={[styles.errorModalIconCircle, { backgroundColor: '#d1fae5' }]}>
              <Svg width={32} height={32} viewBox="0 0 24 24" fill="none">
                <Circle cx="12" cy="12" r="10" stroke="#10b981" strokeWidth="1.5" />
                <Path d="M8 12l3 3 5-6" stroke="#10b981" strokeWidth="2" strokeLinecap="round" />
              </Svg>
            </View>
          </View>
          <Text style={styles.errorModalTitle}>{title}</Text>
          <Text style={styles.errorModalMessage}>{message}</Text>
          <TouchableOpacity style={[styles.errorModalButtonPrimary, { backgroundColor: '#10b981' }]} onPress={onClose}>
            <Text style={styles.errorModalButtonTextPrimary}>{buttonText}</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

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

// OTP Input Component
const OTPInput = ({ 
  value, 
  onChange, 
  onComplete, 
  hasError 
}: { 
  value: string; 
  onChange: (val: string) => void; 
  onComplete?: (val: string) => void;
  hasError: boolean;
}) => {
  const inputRef = useRef<TextInput>(null);
  const [isFocused, setIsFocused] = useState(false);
  const otpArray = value.split('').concat(Array(OTP_LENGTH - value.length).fill(''));

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 100);
  }, []);

  const handleChange = (text: string) => {
    const cleaned = text.replace(/[^0-9]/g, '').slice(0, OTP_LENGTH);
    onChange(cleaned);
    
    if (cleaned.length === OTP_LENGTH && onComplete) {
      onComplete(cleaned);
    }
  };

  return (
    <TouchableOpacity 
      activeOpacity={1} 
      onPress={() => inputRef.current?.focus()}
      style={styles.otpContainer}
    >
      <View style={styles.otpRow}>
        {otpArray.map((digit, index) => (
          <View
            key={index}
            style={[
              styles.otpBox,
              isFocused && styles.otpBoxFocused,
              hasError && styles.otpBoxError,
              digit && !hasError && styles.otpBoxFilled,
            ]}
          >
            <Text style={[styles.otpDigit, hasError && styles.otpDigitError]}>
              {digit}
            </Text>
            {isFocused && !digit && <View style={styles.cursor} />}
          </View>
        ))}
      </View>
      <TextInput
        ref={inputRef}
        style={styles.hiddenInput}
        value={value}
        onChangeText={handleChange}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        keyboardType="numeric"
        inputMode="numeric"
        maxLength={OTP_LENGTH}
        autoFocus
        caretHidden
        selectionColor="#4c6fff"
      />
    </TouchableOpacity>
  );
};

// Success Overlay Component for smooth transition
const SuccessOverlay = ({ visible, onAnimationComplete }: { visible: boolean; onAnimationComplete: () => void }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.successOverlay,
        {
          opacity: fadeAnim,
        },
      ]}
    >
      <Animated.View
        style={[
          styles.successContent,
          {
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        <View style={styles.successIconCircle}>
          <CheckIcon />
        </View>
        <Text style={styles.successTitle}>Verified!</Text>
        <Text style={styles.successMessage}>Redirecting to reset password...</Text>
      </Animated.View>
    </Animated.View>
  );
};

export default function VerifyOTP() {
  const router = useRouter();
  const { email, purpose } = useLocalSearchParams<{ email: string; purpose: 'reset' | 'register' }>();

  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resending, setResending] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showSuccessOverlay, setShowSuccessOverlay] = useState(false);
  const [errorModalData, setErrorModalData] = useState({ 
    title: '', 
    message: '',
    onAction: undefined as (() => void) | undefined,
    actionButtonText: '' 
  });

  const { seconds, expired, reset: resetTimer } = useCountdown(300);

  const showErrorPopup = (title: string, message: string, onAction?: () => void, actionButtonText?: string) => {
    setErrorModalData({ title, message, onAction, actionButtonText: actionButtonText || '' });
    setShowErrorModal(true);
  };

  const handleVerify = async (code?: string) => {
    const otpCode = code || otp;
    if (otpCode.length < OTP_LENGTH) {
      setError('Please enter the complete 6-digit code.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      let result;
      if (purpose === 'reset') {
        result = await authService.verifyResetOTP(email!, otpCode);
      } else {
        result = await authService.verifyOTP(email!, otpCode);
      }

      if (result.success) {
        if (purpose === 'reset') {
          // Show success overlay with smooth animation
          setShowSuccessOverlay(true);
          
          // Wait for animation then redirect - OPTIMIZED: 400ms
          setTimeout(() => {
            router.push({
              pathname: '/(auth)/reset-password',
              params: { 
                email: email,
                otp: otpCode 
              },
            });
          }, 400); // Changed from 800ms to 400ms
        } else {
          setShowSuccessModal(true);
        }
      } else {
        setError(result.message || 'Invalid code. Please try again.');
      }
    } catch (error: any) {
      console.error('Verification error:', error);
      setError(error.response?.data?.message || 'Verification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!expired) {
      showErrorPopup('Wait', `Please wait ${seconds}s before requesting another code`);
      return;
    }
    
    setResending(true);
    try {
      if (purpose === 'reset') {
        await authService.forgotPassword(email!);
      } else {
        await authService.resendOTP(email!);
      }
      setOtp('');
      setError('');
      resetTimer();
      showErrorPopup('Success', 'A new OTP code has been sent to your email.');
    } catch (error: any) {
      showErrorPopup('Error', error.response?.data?.message || 'Failed to resend code');
    } finally {
      setResending(false);
    }
  };

  const maskedEmail = email ? email.replace(/(.{2})(.*)(@.*)/, (_, a, b, c) => a + b.replace(/./g, '•') + c) : '';

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      
      <ErrorPopupModal
        visible={showErrorModal}
        title={errorModalData.title}
        message={errorModalData.message}
        onClose={() => setShowErrorModal(false)}
        onAction={errorModalData.onAction}
        actionButtonText={errorModalData.actionButtonText}
      />

      <SuccessModal
        visible={showSuccessModal}
        title="Email Verified!"
        message="Your email has been successfully verified. You can now sign in to your account."
        onClose={() => {
          setShowSuccessModal(false);
          router.replace('/(auth)/signin');
        }}
        buttonText="Sign In Now"
      />

      <SuccessOverlay 
        visible={showSuccessOverlay} 
        onAnimationComplete={() => {}}
      />

      <KeyboardAvoidingView 
        style={styles.flex} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
      >
        <DiagramBackground />
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={styles.card}>
            {/* Connectors */}
            <View style={styles.connectorTop} />
            <View style={styles.connectorBottom} />
            <View style={styles.connectorLeft} />
            <View style={styles.connectorRight} />
            
            <TouchableOpacity 
              style={styles.backBtn} 
              onPress={() => router.back()} 
              activeOpacity={0.7}
              accessibilityLabel="Go back to previous screen"
              accessibilityRole="button"
            >
              <BackIcon />
              <Text style={styles.backText}>Back</Text>
            </TouchableOpacity>
            
            <Text style={styles.heading}>Verify Your Email</Text>
            <Text style={styles.subtitle}>
              {purpose === 'reset'
                ? `Enter the 6-digit OTP code sent to\n`
                : `We sent a 6-digit OTP code to\n`
              }
              <Text style={styles.emailHighlight}>{maskedEmail}</Text>
            </Text>

            <OTPInput 
              value={otp}
              onChange={setOtp}
              onComplete={handleVerify}
              hasError={!!error}
            />
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
            
            <View style={styles.timerRow}>
              {expired ? (
                <Text style={styles.timerExpired}>Code expired</Text>
              ) : (
                <>
                  <Text style={styles.timerLabel}>Code expires in </Text>
                  <Text style={styles.timerCount}>
                    {String(Math.floor(seconds / 60)).padStart(2, '0')}:{String(seconds % 60).padStart(2, '0')}
                  </Text>
                </>
              )}
            </View>
            
            <TouchableOpacity
              style={[styles.btnVerify, (otp.length < OTP_LENGTH || loading) && styles.btnDisabled]}
              onPress={() => handleVerify()}
              activeOpacity={0.9}
              disabled={otp.length < OTP_LENGTH || loading}
            >
              {loading ? <ActivityIndicator color="#ffffff" size="small" /> : <Text style={styles.btnVerifyText}>Verify Code</Text>}
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.resendBtn} 
              onPress={handleResend} 
              disabled={resending}
              activeOpacity={expired ? 0.7 : 1}
            >
              <Text style={[styles.resendText, !expired && styles.resendDisabled]}>
                {resending ? 'Sending...' : expired ? 'Resend code' : `Resend code in ${seconds}s`}
              </Text>
            </TouchableOpacity>
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
    paddingHorizontal: 18, 
    paddingVertical: 40,
    minHeight: SCREEN_HEIGHT,
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
    position: 'relative' 
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
    zIndex: 20 
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
    zIndex: 20 
  },
  connectorLeft: { 
    position: 'absolute', 
    left: -7, 
    top: '50%', 
    transform: [{ translateY: -7 }], 
    width: 14, 
    height: 14, 
    borderRadius: 7, 
    backgroundColor: '#ffffff', 
    borderWidth: 2, 
    borderColor: '#c7d2fe', 
    zIndex: 20 
  },
  connectorRight: { 
    position: 'absolute', 
    right: -7, 
    top: '50%', 
    transform: [{ translateY: -7 }], 
    width: 14, 
    height: 14, 
    borderRadius: 7, 
    backgroundColor: '#ffffff', 
    borderWidth: 2, 
    borderColor: '#c7d2fe', 
    zIndex: 20 
  },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 24, alignSelf: 'flex-start' },
  backText: { fontSize: 14, color: '#4a5568', fontWeight: '600' },
  heading: { 
    fontSize: 26, 
    fontWeight: '800', 
    color: '#0f172a', 
    textAlign: 'center', 
    letterSpacing: -0.6, 
    marginBottom: 12
  },
  subtitle: { fontSize: 14, color: '#7f8bb3', textAlign: 'center', lineHeight: 22, marginBottom: 32 },
  emailHighlight: { color: '#4c6fff', fontWeight: '700' },
  
  // OTP Input Styles
  otpContainer: {
    width: '100%',
    marginBottom: 8,
  },
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
    backgroundColor: 'transparent',
  },
  otpBox: { 
    flex: 1,
    aspectRatio: 1,
    maxWidth: 58,
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
  // Success Overlay Styles
  successOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2000,
  },
  successContent: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 32,
    marginHorizontal: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  successIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#d1fae5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 8,
  },
  successMessage: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
  },
  gridBackground: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  gridOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.10)',
  },
  errorModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorModalContainer: {
    width: '85%',
    maxWidth: 340,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  errorModalIconWrapper: {
    marginBottom: 16,
  },
  errorModalIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#f0f4ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b',
    textAlign: 'center',
    marginBottom: 8,
  },
  errorModalMessage: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  errorModalButtonPrimary: {
    width: '100%',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: '#3b5bdb',
  },
  errorModalButtonTextPrimary: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});