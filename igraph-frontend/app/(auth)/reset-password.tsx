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
import { useRouter, useLocalSearchParams } from 'expo-router';
import { authAPI, clearAuthData } from '@/services/api';
import { Svg, Circle, Rect, Path, Defs, Pattern } from 'react-native-svg';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const DiagramBackground = () => (
  <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
    <Svg width={SCREEN_WIDTH} height={SCREEN_HEIGHT}>
      <Defs>
        <Pattern id="grid" width="34" height="34" patternUnits="userSpaceOnUse">
          <Path d="M 34 0 L 0 0 0 34" fill="none" stroke="#ccd5f7" strokeWidth="1.2" opacity="1" />
        </Pattern>
      </Defs>
      <Rect width={SCREEN_WIDTH} height={SCREEN_HEIGHT} fill="#eef2ff" />
      <Rect width={SCREEN_WIDTH} height={SCREEN_HEIGHT} fill="url(#grid)" opacity="1" />
    </Svg>
  </View>
);

const EyeIcon = ({ visible }: { visible: boolean }) => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
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

const BackIcon = () => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
    <Path d="M19 12H5M5 12l7 7M5 12l7-7" stroke="#4a5568" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

export default function ResetPassword() {
  const router = useRouter();
  const { email, otp } = useLocalSearchParams<{ email: string; otp: string }>();
  
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const confirmPasswordRef = useRef<TextInput>(null);
  
  const validate = () => {
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return false;
    }
    if (!/[A-Z]/.test(password)) {
      setError('Password must contain at least one uppercase letter.');
      return false;
    }
    if (!/[a-z]/.test(password)) {
      setError('Password must contain at least one lowercase letter.');
      return false;
    }
    if (!/[0-9]/.test(password)) {
      setError('Password must contain at least one number.');
      return false;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return false;
    }
    return true;
  };
  
  const handleResetPassword = async () => {
    if (!validate()) return;
    
    setLoading(true);
    setError('');
    
    try {
      const response = await authAPI.resetPassword({
        email: email!,
        otp: otp!,
        newPassword: password,
      });
      
      if (response.data.success) {
        await clearAuthData();
        Alert.alert(
          'Password Reset Successful',
          'Your password has been reset. Please sign in with your new password.',
          [{ text: 'Sign In', onPress: () => router.replace('/(auth)/signin') }]
        );
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to reset password. Please try again.');
    } finally {
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
          
          <Text style={styles.heading}>Create New Password</Text>
          <Text style={styles.subtitle}>Your new password must be different from previous passwords</Text>
          
          <View style={styles.formGroup}>
            <Text style={styles.label}>New Password</Text>
            <View style={styles.inputWrap}>
              <TextInput
                style={[styles.input, styles.inputWithIcon]}
                placeholder="••••••••"
                placeholderTextColor="#b8c0d4"
                value={password}
                onChangeText={(text) => {
                  setPassword(text);
                  setError('');
                }}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                returnKeyType="next"
                onSubmitEditing={() => confirmPasswordRef.current?.focus()}
              />
              <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowPassword(!showPassword)}>
                <EyeIcon visible={showPassword} />
              </TouchableOpacity>
            </View>
          </View>
          
          <View style={styles.formGroup}>
            <Text style={styles.label}>Confirm Password</Text>
            <View style={styles.inputWrap}>
              <TextInput
                ref={confirmPasswordRef}
                style={[styles.input, styles.inputWithIcon]}
                placeholder="••••••••"
                placeholderTextColor="#b8c0d4"
                value={confirmPassword}
                onChangeText={(text) => {
                  setConfirmPassword(text);
                  setError('');
                }}
                secureTextEntry={!showConfirmPassword}
                autoCapitalize="none"
                returnKeyType="done"
                onSubmitEditing={handleResetPassword}
              />
              <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                <EyeIcon visible={showConfirmPassword} />
              </TouchableOpacity>
            </View>
          </View>
          
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
          
          <TouchableOpacity
            style={[styles.btnReset, loading && styles.btnDisabled]}
            onPress={handleResetPassword}
            activeOpacity={0.9}
            disabled={loading}
          >
            {loading ? <ActivityIndicator color="#ffffff" size="small" /> : <Text style={styles.btnResetText}>Reset Password</Text>}
          </TouchableOpacity>
          
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
  heading: { fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif', fontSize: 22, fontWeight: '700', color: '#1a1f36', textAlign: 'center', letterSpacing: -0.6, marginBottom: 10 },
  subtitle: { fontSize: 14, color: '#7f8bb3', textAlign: 'center', marginBottom: 32, lineHeight: 20 },
  formGroup: { marginBottom: 20 },
  label: { fontSize: 13, fontWeight: '600', color: '#4a5568', marginBottom: 8 },
  inputWrap: { borderWidth: 1.5, borderColor: '#dde3fa', borderRadius: 14, backgroundColor: '#f8faff', flexDirection: 'row', alignItems: 'center' },
  input: { flex: 1, paddingHorizontal: 16, paddingVertical: Platform.OS === 'ios' ? 15 : 13, fontSize: 15, color: '#1a1f36' },
  inputWithIcon: { paddingRight: 44 },
  eyeBtn: { position: 'absolute', right: 12, padding: 4 },
  errorText: { fontSize: 12, color: '#ef4444', marginTop: 8, textAlign: 'center', fontWeight: '500' },
  btnReset: { backgroundColor: '#4c6fff', borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 10, shadowColor: '#4c6fff', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.32, shadowRadius: 20, elevation: 8 },
  btnDisabled: { opacity: 0.5 },
  btnResetText: { color: '#ffffff', fontSize: 15, fontWeight: '700', letterSpacing: 0.3 },
});