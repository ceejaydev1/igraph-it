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
  Alert,
} from 'react-native';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { Svg, Circle, Rect, Path, Text as SvgText, Defs, Pattern } from 'react-native-svg';
import * as authService from '../../services/authService';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

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
      <Rect x={SCREEN_WIDTH * 0.72} y={0} width={SCREEN_WIDTH * 0.28} height={SCREEN_HEIGHT * 0.34} fill="url(#dots)" />
      <Rect x={0} y={SCREEN_HEIGHT * 0.68} width={SCREEN_WIDTH * 0.28} height={SCREEN_HEIGHT * 0.32} fill="url(#dots)" />
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

export default function ResetPassword() {
  const router = useRouter();
  const { email, otp } = useLocalSearchParams<{ email: string; otp: string }>();

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({ newPassword: '', confirmPassword: '' });

  const confirmRef = useRef<TextInput>(null);

  const validate = () => {
    const newErrors = { newPassword: '', confirmPassword: '' };
    let isValid = true;

    if (!newPassword) {
      newErrors.newPassword = 'Password is required';
      isValid = false;
    } else if (newPassword.length < 8) {
      newErrors.newPassword = 'Password must be at least 8 characters';
      isValid = false;
    } else if (!/[A-Z]/.test(newPassword)) {
      newErrors.newPassword = 'Must contain at least one uppercase letter';
      isValid = false;
    } else if (!/[a-z]/.test(newPassword)) {
      newErrors.newPassword = 'Must contain at least one lowercase letter';
      isValid = false;
    } else if (!/[0-9]/.test(newPassword)) {
      newErrors.newPassword = 'Must contain at least one number';
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
        router.replace('/(auth)/signin');
        console.log('Password reset successfully');
      } else {
        Alert.alert('Error', result.message || 'Failed to reset password');
        setLoading(false);
      }
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Something went wrong');
      setLoading(false);
    }
  };

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
          <View style={styles.iconWrap}>
            <LockIcon />
          </View>
          <Text style={styles.heading}>Reset Password</Text>
          <Text style={styles.subtitle}>Enter your new password below</Text>

          <View style={styles.formGroup}>
            <Text style={styles.label}>New Password</Text>
            <View style={[styles.inputWrap, errors.newPassword && styles.inputError]}>
              <TextInput
                style={[
                  styles.input, 
                  styles.inputWithIcon,
                  Platform.OS === 'web' && { 
                    outline: 'none',
                    outlineStyle: 'solid',
                    outlineWidth: 0,
                  }
                ]}
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
            {errors.newPassword ? <Text style={styles.errorText}>{errors.newPassword}</Text> : null}
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Confirm Password</Text>
            <View style={[styles.inputWrap, errors.confirmPassword && styles.inputError]}>
              <TextInput
                ref={confirmRef}
                style={[
                  styles.input, 
                  styles.inputWithIcon,
                  Platform.OS === 'web' && { 
                    outline: 'solid',
                    outlineStyle: 'solid',
                    outlineColor: 'transparent',  
                  }
                ]}
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
            {errors.confirmPassword ? <Text style={styles.errorText}>{errors.confirmPassword}</Text> : null}
          </View>

          <TouchableOpacity style={[styles.btnReset, loading && styles.btnDisabled]} onPress={handleReset} disabled={loading}>
            {loading ? <ActivityIndicator color="#ffffff" size="small" /> : <Text style={styles.btnResetText}>Reset Password</Text>}
          </TouchableOpacity>

          <TouchableOpacity style={styles.signinLink} onPress={() => router.push('/(auth)/signin')}>
            <Text style={styles.signinText}>Back to Sign In</Text>
          </TouchableOpacity>

          <View style={styles.connectorBottom} />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
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
    paddingVertical: 40 
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
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif', 
    fontSize: 22, 
    fontWeight: '700', 
    color: '#1a1f36', 
    textAlign: 'center', 
    letterSpacing: -0.6, 
    marginBottom: 10 
  },
  subtitle: { 
    fontSize: 14, 
    color: '#7f8bb3', 
    textAlign: 'center', 
    marginBottom: 28 
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
    minHeight: 52,
  },
  inputError: { 
    borderColor: '#ef4444' 
  },
  input: { 
    flex: 1, 
    paddingHorizontal: 16, 
    paddingVertical: Platform.OS === 'ios' ? 15 : 13, 
    fontSize: 15, 
    color: '#1a1f36',
    // Remove black border on focus
    outlineWidth: 0,
    outlineStyle: 'solid',
  },
  inputWithIcon: { 
    paddingRight: 44 
  },
  eyeBtn: { 
    position: 'absolute', 
    right: 12, 
    padding: 10,
    top: '50%',
    transform: [{ translateY: -15 }],
  },
  errorText: { 
    fontSize: 12, 
    color: '#ef4444', 
    marginTop: 8, 
    marginLeft: 4, 
    fontWeight: '500' 
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
});