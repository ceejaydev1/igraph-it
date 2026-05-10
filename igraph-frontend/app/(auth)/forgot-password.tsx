// app/(auth)/forgot-password.tsx

import React, { useState } from 'react';
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
import { useRouter } from 'expo-router';
import { Svg, Circle, Rect, Path, Text as SvgText, Defs, Pattern } from 'react-native-svg';
import * as authService from '../../services/authService';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// DiagramBackground component (same as before - kept short)
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

const MailIcon = () => (
  <Svg width={56} height={56} viewBox="0 0 48 48" fill="none">
    <Rect width={48} height={48} rx={16} fill="#eef2ff" />
    <Path d="M12 16a2 2 0 012-2h20a2 2 0 012 2v16a2 2 0 01-2 2H14a2 2 0 01-2-2V16z" stroke="#4c6fff" strokeWidth={1.8} fill="none" />
    <Path d="M12 16l12 9 12-9" stroke="#4c6fff" strokeWidth={1.8} strokeLinecap="round" fill="none" />
  </Svg>
);

const BackIcon = () => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
    <Path d="M19 12H5M5 12l7 7M5 12l7-7" stroke="#4a5568" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

export default function ForgotPassword() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [emailFocused, setEmailFocused] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSendOTP = async () => {
    setError('');

    if (!email.trim()) {
      setError('Please enter your email address.');
      return;
    }

    if (!/\S+@\S+\.\S+/.test(email)) {
      setError('Please enter a valid email address.');
      return;
    }

    setLoading(true);
    try {
      const result = await authService.forgotPassword(email);
      if (result.success) {
        router.push({
          pathname: '/(auth)/verify-otp',
          params: { email, purpose: 'reset' },
        });
      } else {
        Alert.alert('Error', result.message || 'Failed to send OTP');
      }
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to send OTP. Please try again.');
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
          <View style={styles.iconWrap}>
            <MailIcon />
          </View>
          <Text style={styles.heading}>Forgot Password?</Text>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Email Address</Text>
            <View style={[styles.inputWrap, emailFocused && styles.inputWrapFocused, error && styles.inputWrapError]}>
              <TextInput
                style={styles.input}
                placeholder="you@example.com"
                placeholderTextColor="#b8c0d4"
                value={email}
                onChangeText={(text) => {
                  setEmail(text);
                  if (error) setError('');
                }}
                onFocus={() => setEmailFocused(true)}
                onBlur={() => setEmailFocused(false)}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
          </View>

          <TouchableOpacity style={[styles.btnSend, loading && styles.btnDisabled]} onPress={handleSendOTP} activeOpacity={0.9} disabled={loading}>
            {loading ? <ActivityIndicator color="#ffffff" size="small" /> : <Text style={styles.btnSendText}>Send OTP Code</Text>}
          </TouchableOpacity>

          <View style={styles.signinWrap}>
            <Text style={styles.signinText}>Remember your password?</Text>
            <TouchableOpacity onPress={() => router.push('/(auth)/signin')}>
              <Text style={styles.signinLink}>Sign In</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.connectorBottom} />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#eef2ff' },
  scrollContent: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 18, paddingVertical: 40 },
  card: { backgroundColor: '#ffffff', borderRadius: 28, paddingHorizontal: 32, paddingTop: 34, paddingBottom: 34, width: '100%', maxWidth: 430, shadowColor: '#1e293b', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.12, shadowRadius: 30, elevation: 14, borderWidth: 1.5, borderColor: '#f1f5ff', position: 'relative' },
  connectorTop: { position: 'absolute', top: -7, alignSelf: 'center', width: 14, height: 14, borderRadius: 7, backgroundColor: '#ffffff', borderWidth: 2, borderColor: '#c7d2fe', zIndex: 20 },
  connectorBottom: { position: 'absolute', bottom: -7, alignSelf: 'center', width: 14, height: 14, borderRadius: 7, backgroundColor: '#ffffff', borderWidth: 2, borderColor: '#c7d2fe', zIndex: 20 },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 24, alignSelf: 'flex-start' },
  backText: { fontSize: 14, color: '#4a5568', fontWeight: '600' },
  iconWrap: { alignItems: 'center', marginBottom: 22 },
  heading: { fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif', fontSize: 22, fontWeight: '700', color: '#1a1f36', textAlign: 'center', letterSpacing: -0.6, marginBottom: 30, marginTop: -6 },
  formGroup: { marginBottom: 8 },
  label: { fontSize: 13, fontWeight: '600', color: '#4a5568', marginBottom: 8 },
  inputWrap: { borderWidth: 1.5, borderColor: '#dde3fa', borderRadius: 14, backgroundColor: '#f8faff', flexDirection: 'row', alignItems: 'center' },
  inputWrapFocused: { borderColor: '#4c6fff', backgroundColor: '#ffffff', shadowColor: '#4c6fff', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.16, shadowRadius: 10, elevation: 4 },
  inputWrapError: { borderColor: '#ef4444' },
  input: { flex: 1, paddingHorizontal: 16, paddingVertical: Platform.OS === 'ios' ? 15 : 13, fontSize: 15, color: '#1a1f36' },
  errorText: { fontSize: 12, color: '#ef4444', marginTop: 8, marginLeft: 4, fontWeight: '500' },
  btnSend: { backgroundColor: '#4c6fff', borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 18, shadowColor: '#4c6fff', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.32, shadowRadius: 20, elevation: 8 },
  btnDisabled: { opacity: 0.75 },
  btnSendText: { color: '#ffffff', fontSize: 15, fontWeight: '700', letterSpacing: 0.3 },
  signinWrap: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 22 },
  signinText: { fontSize: 13, color: '#8896b3' },
  signinLink: { fontSize: 13, fontWeight: '700', color: '#1a1f36', marginLeft: 4 },
});