// app/(auth)/reset-password.tsx

import React, { useState, useRef } from 'react';
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
} from 'react-native';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { Svg, Circle, Rect, Path, Text as SvgText, Defs, Pattern } from 'react-native-svg';
import * as authService from '../../services/authService';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

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
        stroke="#bfd0ff" strokeWidth="2" strokeDasharray="8 10" fill="none" opacity="0.32"
      />
      <Path
        d={`M ${SCREEN_WIDTH * 0.82} ${SCREEN_HEIGHT * 0.18} C ${SCREEN_WIDTH * 0.96} ${SCREEN_HEIGHT * 0.30}, ${SCREEN_WIDTH * 0.95} ${SCREEN_HEIGHT * 0.55}, ${SCREEN_WIDTH * 0.78} ${SCREEN_HEIGHT * 0.76}`}
        stroke="#bfd0ff" strokeWidth="2" strokeDasharray="8 10" fill="none" opacity="0.32"
      />
      <Rect x={SCREEN_WIDTH * 0.07} y={SCREEN_HEIGHT * 0.12} width="130" height="72" rx="14" stroke="#bfd0ff" strokeWidth="1.4" fill="none" opacity="0.38" />
      <Rect x={SCREEN_WIDTH * 0.74} y={SCREEN_HEIGHT * 0.16} width="140" height="78" rx="14" stroke="#bfd0ff" strokeWidth="1.4" fill="none" opacity="0.38" />
      <Circle cx={SCREEN_WIDTH * 0.76} cy={SCREEN_HEIGHT * 0.72} r="24" stroke="#bfd0ff" strokeWidth="2" fill="none" opacity="0.3" />
    </Svg>
  </View>
);

const LockIcon = () => (
  <Svg width={56} height={56} viewBox="0 0 48 48" fill="none">
    <Rect width={48} height={48} rx={16} fill="#eef2ff" />
    <Path d="M16 20V14a8 8 0 0 1 16 0v6" stroke="#4c6fff" strokeWidth={1.8} fill="none" />
    <Rect x="12" y="20" width="24" height="16" rx="3" stroke="#4c6fff" strokeWidth={1.8} fill="none" />
    <Circle cx="24" cy="28" r="2" stroke="#4c6fff" strokeWidth={1.8} fill="none" />
  </Svg>
);

const BackIcon = () => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
    <Path d="M19 12H5M5 12l7 7M5 12l7-7" stroke="#4a5568" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const EyeIcon = ({ visible }: { visible: boolean }) => (
  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
    {visible ? (
      <>
        <Path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="#8896b3" strokeWidth={1.8} />
        <Circle cx={12} cy={12} r={3} stroke="#8896b3" strokeWidth={1.8} />
      </>
    ) : (
      <>
        <Path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94" stroke="#8896b3" strokeWidth={1.8} />
        <Path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19" stroke="#8896b3" strokeWidth={1.8} />
        <Path d="M1 1l22 22" stroke="#8896b3" strokeWidth={1.8} />
      </>
    )}
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

// Success Modal
const SuccessModal = ({ visible, title, message, onClose }: { 
  visible: boolean; 
  title: string; 
  message: string; 
  onClose: () => void;
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
            <Text style={styles.errorModalButtonTextPrimary}>Sign In</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

// Password strength indicator
const PasswordStrengthIndicator = ({ password }: { password: string }) => {
  const getStrength = () => {
    if (!password) return { text: '', color: '#8896b3', percentage: 0 };
    
    let score = 0;
    if (password.length >= 8) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[a-z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    
    if (score === 4) return { text: 'Strong password!', color: '#10b981', percentage: 100 };
    if (score === 3) return { text: 'Good password', color: '#f59e0b', percentage: 75 };
    if (score > 0) return { text: 'Weak password', color: '#ef4444', percentage: 50 };
    return { text: 'Enter a password', color: '#8896b3', percentage: 0 };
  };

  const strength = getStrength();

  if (!password) return null;

  return (
    <View style={styles.strengthContainer}>
      <View style={styles.strengthBar}>
        <View style={[styles.strengthFill, { width: `${strength.percentage}%`, backgroundColor: strength.color }]} />
      </View>
      <Text style={[styles.strengthText, { color: strength.color }]}>{strength.text}</Text>
    </View>
  );
};

export default function ResetPassword() {
  const router = useRouter();
  const { email, otp } = useLocalSearchParams<{ email: string; otp: string }>();

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({ newPassword: '', confirmPassword: '' });
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [errorModalData, setErrorModalData] = useState({ 
    title: '', 
    message: '',
    onAction: undefined as (() => void) | undefined,
    actionButtonText: '' 
  });

  const confirmRef = useRef<TextInput>(null);

  const showErrorPopup = (title: string, message: string, onAction?: () => void, actionButtonText?: string) => {
    setErrorModalData({ title, message, onAction, actionButtonText: actionButtonText || '' });
    setShowErrorModal(true);
  };

  const isPasswordValid = (pwd: string) => {
    return pwd.length >= 8 && /[A-Z]/.test(pwd) && /[a-z]/.test(pwd) && /[0-9]/.test(pwd);
  };

  const validate = () => {
    const newErrors = { newPassword: '', confirmPassword: '' };
    let isValid = true;

    if (!newPassword) {
      newErrors.newPassword = 'Password is required';
      isValid = false;
    } else if (!isPasswordValid(newPassword)) {
      newErrors.newPassword = 'Password must be at least 8 characters with uppercase, lowercase, and number';
      isValid = false;
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
      isValid = false;
    } else if (newPassword !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleReset = async () => {
    if (!validate()) return;

    setLoading(true);
    try {
      const result = await authService.resetPassword(email!, otp!, newPassword);
      
      if (result.success) {
        await authService.clearTokens();
        // Show success modal before navigation
        setShowSuccessModal(true);
      } else {
        showErrorPopup('Error', result.message || 'Failed to reset password');
      }
    } catch (error: any) {
      showErrorPopup('Error', error.response?.data?.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const handleSuccessClose = () => {
    setShowSuccessModal(false);
    router.replace('/(auth)/signin');
  };

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
        title="Password Reset Successful"
        message="Your password has been updated. You can now sign in with your new password."
        onClose={handleSuccessClose}
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
            
            <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
              <BackIcon />
              <Text style={styles.backText}>Back</Text>
            </TouchableOpacity>
            
            <View style={styles.iconWrap}>
              <LockIcon />
            </View>
            <Text style={styles.heading}>Reset Password</Text>
            <Text style={styles.subtitle}>Enter your new password below</Text>

            <View style={styles.formGroup}>
              <Text style={styles.label}>New Password</Text>
              <View style={[styles.inputWrap, errors.newPassword && styles.inputError]}>
                <TextInput
                  style={[styles.input, styles.inputWithIcon, Platform.OS === 'web' ? { outlineWidth: 0, outlineColor: ' #808080'} : null]}
                  placeholder="At least 8 characters"
                  placeholderTextColor="#b8c0d4"
                  value={newPassword}
                  onChangeText={(text) => {
                    setNewPassword(text);
                    setErrors({ ...errors, newPassword: '' });
                  }}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  returnKeyType="next"
                  onSubmitEditing={() => confirmRef.current?.focus()}
                />
                <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowPassword(!showPassword)}>
                  <EyeIcon visible={showPassword} />
                </TouchableOpacity>
              </View>
              <PasswordStrengthIndicator password={newPassword} />
              {errors.newPassword ? <Text style={styles.errorText}>{errors.newPassword}</Text> : null}
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Confirm Password</Text>
              <View style={[styles.inputWrap, errors.confirmPassword && styles.inputError]}>
                <TextInput
                  ref={confirmRef}
                  style={[styles.input, styles.inputWithIcon, Platform.OS === 'web' ? { outlineWidth: 0, outlineColor: ' #808080'} : null]}
                  placeholder="Re-enter your password"
                  placeholderTextColor="#b8c0d4"
                  value={confirmPassword}
                  onChangeText={(text) => {
                    setConfirmPassword(text);
                    setErrors({ ...errors, confirmPassword: '' });
                  }}
                  secureTextEntry={!showConfirmPassword}
                  autoCapitalize="none"
                  returnKeyType="done"
                  onSubmitEditing={handleReset}
                />
                <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                  <EyeIcon visible={showConfirmPassword} />
                </TouchableOpacity>
              </View>
              {confirmPassword && newPassword === confirmPassword && !errors.confirmPassword && newPassword ? (
                <Text style={styles.matchSuccess}>✓ Passwords match</Text>
              ) : null}
              {errors.confirmPassword ? <Text style={styles.errorText}>{errors.confirmPassword}</Text> : null}
            </View>

            <TouchableOpacity style={[styles.btnReset, loading && styles.btnDisabled]} onPress={handleReset} disabled={loading}>
              {loading ? <ActivityIndicator color="#ffffff" size="small" /> : <Text style={styles.btnResetText}>Reset Password</Text>}
            </TouchableOpacity>

            <TouchableOpacity style={styles.signinLink} onPress={() => router.push('/(auth)/signin')}>
              <Text style={styles.signinText}>Back to Sign In</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  flex: { 
    flex: 1, 
    backgroundColor: '#eef2ff' 
  },
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
    paddingBottom: 34, 
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
  backBtn: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 6, 
    marginBottom: 24, 
    alignSelf: 'flex-start' 
  },
  backText: { 
    fontSize: 14, 
    color: '#4a5568', 
    fontWeight: '600' 
  },
  iconWrap: { 
    alignItems: 'center', 
    marginBottom: 22 
  },
  heading: { 
    fontSize: 26, 
    fontWeight: '800', 
    color: '#0f172a', 
    textAlign: 'center', 
    letterSpacing: -0.6, 
    marginBottom: 5
  },
  subtitle: { 
    fontSize: 14, 
    color: '#64748b', 
    textAlign: 'center', 
    marginBottom: 28,
    lineHeight: 20,
  },
  formGroup: { 
    marginBottom: 16 
  },
  label: { 
    fontSize: 13, 
    fontWeight: '600', 
    color: '#4a5568', 
    marginBottom: 8 
  },
  inputWrap: { 
    borderWidth: 1.5, 
    borderColor: '#dde3fa', 
    borderRadius: 14, 
    backgroundColor: '#f8faff', 
    flexDirection: 'row', 
    alignItems: 'center',
    minHeight: 40,
  },
  inputError: { 
    borderColor: '#ef4444' 
  },
  input: { 
    flex: 1, 
    paddingHorizontal: 16, 
    paddingVertical: Platform.OS === 'ios' ? 13 : 11, 
    fontSize: 15, 
    color: '#1a1f36',
  },
  inputWithIcon: { 
    paddingRight: 44 
  },
  eyeBtn: { 
    position: 'absolute', 
    right: 12, 
    padding: 10,
  },
  errorText: { 
    fontSize: 12, 
    color: '#ef4444', 
    marginTop: 8, 
    marginLeft: 4, 
    fontWeight: '500' 
  },
  strengthContainer: {
    marginTop: 8,
  },
  strengthBar: {
    height: 4,
    backgroundColor: '#e2e6f3',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 6,
  },
  strengthFill: {
    height: '100%',
    borderRadius: 2,
  },
  strengthText: {
    fontSize: 11,
  },
  matchSuccess: {
    color: '#10b981',
    fontSize: 11,
    marginTop: 4,
    marginLeft: 4,
  },
  btnReset: { 
    backgroundColor: '#4c6fff', 
    borderRadius: 14, 
    paddingVertical: 16, 
    alignItems: 'center', 
    marginTop: 18, 
    shadowColor: '#4c6fff', 
    shadowOffset: { width: 0, height: 10 }, 
    shadowOpacity: 0.32, 
    shadowRadius: 20, 
    elevation: 8 
  },
  btnDisabled: { 
    opacity: 0.75 
  },
  btnResetText: { 
    color: '#ffffff', 
    fontSize: 15, 
    fontWeight: '700', 
    letterSpacing: 0.3 
  },
  signinLink: { 
    alignItems: 'center', 
    marginTop: 20 
  },
  signinText: { 
    fontSize: 14, 
    color: '#4c6fff', 
    fontWeight: '600' 
  },
  // Grid background styles
  gridBackground: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  gridOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.10)',
  },
  // Redesigned Error Modal Styles (No Cancel Button)
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