// app/(auth)/signup.tsx

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
  Image,
  KeyboardAvoidingView,
  Alert,
} from 'react-native';

import { Stack, useRouter } from 'expo-router';

import {
  Svg,
  Circle,
  Rect,
  Path,
  Text as SvgText,
  Defs,
  Pattern,
} from 'react-native-svg';

import * as authService from '@/services/authService';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// BACKGROUND
const DiagramBackground = () => (
  <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
    <Svg width="100%" height="100%" viewBox={`0 0 ${SCREEN_WIDTH} ${SCREEN_HEIGHT}`}>
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
      <Rect x={SCREEN_WIDTH * 0.72} y={SCREEN_HEIGHT * 0.68} width={SCREEN_WIDTH * 0.28} height={SCREEN_HEIGHT * 0.32} fill="url(#dots)" />
    </Svg>
  </View>
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

const GoogleIcon = () => (
  <Svg width={18} height={18} viewBox="0 0 24 24">
    <Path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
    <Path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
    <Path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
    <Path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
  </Svg>
);

export default function SignUp() {
  const router = useRouter();

  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({
    fullName: '',
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    agreed: '',
  });

  const usernameRef = useRef<TextInput>(null);
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const confirmPasswordRef = useRef<TextInput>(null);

  const validate = () => {
    const newErrors = {
      fullName: '',
      username: '',
      email: '',
      password: '',
      confirmPassword: '',
      agreed: '',
    };

    let isValid = true;

    if (!fullName.trim()) {
      newErrors.fullName = 'Full name is required.';
      isValid = false;
    }

    if (!username.trim()) {
      newErrors.username = 'Username is required.';
      isValid = false;
    } else if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      newErrors.username = 'Username can only contain letters, numbers, and underscores.';
      isValid = false;
    } else if (username.length < 3) {
      newErrors.username = 'Username must be at least 3 characters.';
      isValid = false;
    }

    if (!email.trim()) {
      newErrors.email = 'Email address is required.';
      isValid = false;
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Please enter a valid email.';
      isValid = false;
    }

    if (!password) {
      newErrors.password = 'Password is required.';
      isValid = false;
    } else if (password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters.';
      isValid = false;
    } else if (!/[A-Z]/.test(password)) {
      newErrors.password = 'Password must contain at least one uppercase letter.';
      isValid = false;
    } else if (!/[a-z]/.test(password)) {
      newErrors.password = 'Password must contain at least one lowercase letter.';
      isValid = false;
    } else if (!/[0-9]/.test(password)) {
      newErrors.password = 'Password must contain at least one number.';
      isValid = false;
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password.';
      isValid = false;
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match.';
      isValid = false;
    }

    if (!agreed) {
      newErrors.agreed = 'Please agree to the Terms and Conditions.';
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleSignUp = async () => {
    console.log('🔵 STEP 1: Button clicked!');
    console.log('📝 Form data:', { fullName, username, email, password });
    
    const isValid = validate();
    console.log('✅ STEP 2: Validation result:', isValid);
    if (!isValid) return;

    setLoading(true);
    console.log('⏳ STEP 3: Loading started');
    
    try {
      console.log('🚀 STEP 4: Calling API...');
      const result = await authService.signUp({
        fullName,
        username,
        email,
        password,
      });
      
      console.log('📦 STEP 5: API Response:', result);
      console.log('🎯 STEP 6: Result.success:', result.success);

      if (result.success) {
        console.log('🔄 STEP 7: Navigating to verify-otp');
        router.push({
          pathname: '/(auth)/verify-otp',
          params: {
            email,
            purpose: 'register',
          },
        });
      } else {
        console.log('❌ STEP 8: API returned false');
        Alert.alert('Sign Up Failed', result.message || 'Something went wrong');
      }
    } catch (error: any) {
      console.log('💥 STEP 9: ERROR caught:', error);
      console.log('💥 Error message:', error.message);
      console.log('💥 Error response:', error.response?.data);
      Alert.alert('Sign Up Failed', error.response?.data?.message || error.message || 'Something went wrong');
    } finally {
      console.log('🏁 STEP 10: Loading finished');
      setLoading(false);
    }
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <DiagramBackground />

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.card}>
            <View style={styles.connectorTop} />
            <View style={styles.connectorBottom} />
            <View style={styles.connectorLeft} />
            <View style={styles.connectorRight} />

            <View style={styles.logoWrap}>
              <Image
                source={require('../../assets/images/logo.png')}
                style={styles.logo}
                resizeMode="contain"
              />
            </View>

            <Text style={styles.heading}>Create Account</Text>

            {/* FULL NAME */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Full Name</Text>
              <View style={styles.inputWrap}>
                <TextInput
                  style={styles.input}
                  placeholder="Juan dela Cruz"
                  placeholderTextColor="#b8c0d4"
                  value={fullName}
                  onChangeText={(text) => {
                    setFullName(text);
                    setErrors({ ...errors, fullName: '' });
                  }}
                  autoCapitalize="words"
                  returnKeyType="next"
                  onSubmitEditing={() => usernameRef.current?.focus()}
                />
              </View>
              {errors.fullName ? <Text style={styles.fieldError}>{errors.fullName}</Text> : null}
            </View>

            {/* USERNAME */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Username</Text>
              <View style={styles.inputWrap}>
                <TextInput
                  ref={usernameRef}
                  style={styles.input}
                  placeholder="juan_delacruz"
                  placeholderTextColor="#b8c0d4"
                  value={username}
                  onChangeText={(text) => {
                    setUsername(text.toLowerCase().replace(/[^a-z0-9_]/g, '_'));
                    setErrors({ ...errors, username: '' });
                  }}
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="next"
                  onSubmitEditing={() => emailRef.current?.focus()}
                />
              </View>
              {errors.username ? <Text style={styles.fieldError}>{errors.username}</Text> : null}
            </View>

            {/* EMAIL */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Email Address</Text>
              <View style={styles.inputWrap}>
                <TextInput
                  ref={emailRef}
                  style={styles.input}
                  placeholder="you@example.com"
                  placeholderTextColor="#b8c0d4"
                  value={email}
                  onChangeText={(text) => {
                    setEmail(text);
                    setErrors({ ...errors, email: '' });
                  }}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="next"
                  onSubmitEditing={() => passwordRef.current?.focus()}
                />
              </View>
              {errors.email ? <Text style={styles.fieldError}>{errors.email}</Text> : null}
            </View>

            {/* PASSWORD */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Password</Text>
              <View style={styles.inputWrap}>
                <TextInput
                  ref={passwordRef}
                  style={[styles.input, styles.inputWithIcon]}
                  placeholder="At least 8 characters"
                  placeholderTextColor="#b8c0d4"
                  value={password}
                  onChangeText={(text) => {
                    setPassword(text);
                    setErrors({ ...errors, password: '' });
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
              {errors.password ? <Text style={styles.fieldError}>{errors.password}</Text> : null}
            </View>

            {/* CONFIRM PASSWORD */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Confirm Password</Text>
              <View style={styles.inputWrap}>
                <TextInput
                  ref={confirmPasswordRef}
                  style={[styles.input, styles.inputWithIcon]}
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
                  onSubmitEditing={handleSignUp}
                />
                <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                  <EyeIcon visible={showConfirmPassword} />
                </TouchableOpacity>
              </View>
              {errors.confirmPassword ? <Text style={styles.fieldError}>{errors.confirmPassword}</Text> : null}
            </View>

            {/* TERMS */}
            <TouchableOpacity
              style={styles.termsWrap}
              onPress={() => {
                setAgreed(!agreed);
                setErrors({ ...errors, agreed: '' });
              }}
              activeOpacity={0.8}
            >
              <View style={[styles.customCheckbox, agreed && styles.customCheckboxChecked]}>
                {agreed && (
                  <Svg width={10} height={10} viewBox="0 0 10 10">
                    <Path d="M2 5l2.5 2.5L8 3" stroke="white" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" fill="none" />
                  </Svg>
                )}
              </View>
              <Text style={styles.termsText}>
                I agree to the <Text style={styles.termsLink}>Terms and Conditions</Text> and{' '}
                <Text style={styles.termsLink}>Privacy Policy</Text>
              </Text>
            </TouchableOpacity>
            {errors.agreed ? <Text style={styles.fieldError}>{errors.agreed}</Text> : null}

            {/* CREATE BUTTON */}
            <TouchableOpacity
              style={[styles.btnCreate, loading && styles.btnDisabled]}
              onPress={handleSignUp}
              activeOpacity={0.85}
              disabled={loading}
            >
              {loading ? <ActivityIndicator color="#ffffff" size="small" /> : <Text style={styles.btnCreateText}>Create Account</Text>}
            </TouchableOpacity>

            {/* SIGN IN LINK */}
            <View style={styles.signinWrap}>
              <Text style={styles.signinText}>Already have an account? </Text>
              <TouchableOpacity onPress={() => router.push('/(auth)/signin')}>
                <Text style={styles.signinLink}>Sign In</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#eef2ff' },
  scrollContent: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 40, paddingHorizontal: 16 },
  card: { width: '100%', maxWidth: 380, backgroundColor: '#ffffff', borderRadius: 24, paddingHorizontal: 28, paddingTop: 26, paddingBottom: 22, shadowColor: '#3b5bdb', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.12, shadowRadius: 24, elevation: 8, position: 'relative', marginTop: -25 },
  connectorTop: { position: 'absolute', top: -5, alignSelf: 'center', width: 10, height: 10, borderRadius: 5, backgroundColor: '#ffffff', borderWidth: 1.5, borderColor: '#cbd5f5' },
  connectorBottom: { position: 'absolute', bottom: -5, alignSelf: 'center', width: 10, height: 10, borderRadius: 5, backgroundColor: '#ffffff', borderWidth: 1.5, borderColor: '#cbd5f5' },
  connectorLeft: { position: 'absolute', left: -5, top: '50%', transform: [{ translateY: -5 }], width: 10, height: 10, borderRadius: 5, backgroundColor: '#ffffff', borderWidth: 1.5, borderColor: '#cbd5f5' },
  connectorRight: { position: 'absolute', right: -5, top: '50%', transform: [{ translateY: -5 }], width: 10, height: 10, borderRadius: 5, backgroundColor: '#ffffff', borderWidth: 1.5, borderColor: '#cbd5f5' },
  logoWrap: { alignItems: 'center', marginBottom: 14 },
  logo: { width: 56, height: 56, borderRadius: 14, backgroundColor: '#0a0f1e' },
  heading: { fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif', fontSize: 24, fontWeight: '700', color: '#1a1f36', textAlign: 'center', marginBottom: 16 },
  formGroup: { marginBottom: 12 },
  label: { fontSize: 13, fontWeight: '600', color: '#4a5568', marginBottom: 7 },
  inputWrap: { borderWidth: 1.5, borderColor: '#e2e6f3', borderRadius: 10, backgroundColor: '#f8f9ff', flexDirection: 'row', alignItems: 'center' },
  input: { flex: 1, paddingHorizontal: 14, paddingVertical: Platform.OS === 'ios' ? 12 : 10, fontSize: 14, color: '#1a1f36' },
  inputWithIcon: { paddingRight: 44 },
  eyeBtn: { position: 'absolute', right: 12, padding: 4 },
  fieldError: { color: '#e53e3e', fontSize: 12, marginTop: 6, marginLeft: 4, fontWeight: '500' },
  termsWrap: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginTop: 2, marginBottom: 4 },
  customCheckbox: { width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: '#8896b3', alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  customCheckboxChecked: { backgroundColor: '#3b5bdb', borderColor: '#3b5bdb' },
  termsText: { flex: 1, fontSize: 13, lineHeight: 20, color: '#4a5568' },
  termsLink: { fontWeight: '700', color: '#1a1f36' },
  btnCreate: { backgroundColor: '#3b5bdb', borderRadius: 10, paddingVertical: 12, alignItems: 'center', marginTop: 14, marginBottom: 10, shadowColor: '#3b5bdb', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 10, elevation: 5 },
  btnDisabled: { opacity: 0.7 },
  btnCreateText: { color: '#ffffff', fontSize: 15, fontWeight: '700', letterSpacing: 0.3 },
  signinWrap: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 14 },
  signinText: { fontSize: 13, color: '#8896b3' },
  signinLink: { fontSize: 13, fontWeight: '700', color: '#1a1f36' },
});