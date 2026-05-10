// app/(auth)/signin.tsx

import React, { useState, useRef } from 'react';
import { Pressable } from 'react-native';
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
import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri, useAuthRequest } from 'expo-auth-session';
import * as Google from 'expo-auth-session/providers/google';
import {
  Svg,
  Line,
  Circle,
  Rect,
  Path,
  Text as SvgText,
  Defs,
  Pattern,
} from 'react-native-svg';

import * as authService from '../../services/authService';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// ─── DIAGRAM BACKGROUND (same as before) ──────────────────────────────────────

const DiagramBackground = () => (
  <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
    <Svg
      width="100%"
      height="100%"
      viewBox={`0 0 ${SCREEN_WIDTH} ${SCREEN_HEIGHT}`}
      preserveAspectRatio="xMidYMid slice"
      style={StyleSheet.absoluteFillObject}
    >
      <Defs>
        <Pattern id="grid" width="34" height="34" patternUnits="userSpaceOnUse">
          <Path
            d="M 34 0 L 0 0 0 34"
            fill="none"
            stroke="#ccd5f7"
            strokeWidth="1.2"
            opacity="1"
          />
        </Pattern>

        <Pattern id="dots" width="26" height="26" patternUnits="userSpaceOnUse">
          <Circle cx="13" cy="13" r="1.3" fill="#b8c4f3" opacity="0.8" />
        </Pattern>
      </Defs>

      {/* BACKGROUND */}
      <Rect width={SCREEN_WIDTH} height={SCREEN_HEIGHT} fill="#eef2ff" />

      {/* GRID */}
      <Rect width={SCREEN_WIDTH} height={SCREEN_HEIGHT} fill="url(#grid)" opacity="1" />

      {/* DOT DECORATIONS */}
      <Rect
        x={SCREEN_WIDTH * 0.72}
        y={0}
        width={SCREEN_WIDTH * 0.28}
        height={SCREEN_HEIGHT * 0.34}
        fill="url(#dots)"
      />
      <Rect
        x={0}
        y={SCREEN_HEIGHT * 0.68}
        width={SCREEN_WIDTH * 0.28}
        height={SCREEN_HEIGHT * 0.32}
        fill="url(#dots)"
      />

      {/* FLOW LINE TOP */}
      <Path
        d={`
          M ${SCREEN_WIDTH / 2} 0
          L ${SCREEN_WIDTH / 2} 50
          C ${SCREEN_WIDTH / 2} 90,
            120 100,
            90 100
        `}
        stroke="#b7c2f1"
        strokeWidth="2"
        fill="none"
        strokeDasharray="6,6"
      />

      {/* START NODE */}
      <Rect x={40} y={80} width={100} height={42} rx={21} fill="#ffffff" stroke="#c9d2f4" strokeWidth={1.5} />
      <SvgText x={90} y={106} textAnchor="middle" fontSize={14} fill="#6070c7" fontWeight="700">
        Start
      </SvgText>

      {/* FLOW TO VERIFY DIAMOND */}
      <Path
        d={`
          M 140 100
          C 200 100,
            ${SCREEN_WIDTH - 180} 110,
            ${SCREEN_WIDTH - 150} 110
        `}
        stroke="#bcc8f5"
        strokeWidth="2"
        fill="none"
        strokeDasharray="5,5"
      />

      {/* VERIFY DIAMOND */}
      <Path
        d={`
          M ${SCREEN_WIDTH - 110},70
          L ${SCREEN_WIDTH - 70},110
          L ${SCREEN_WIDTH - 110},150
          L ${SCREEN_WIDTH - 150},110
          Z
        `}
        fill="#ffffff"
        stroke="#c9d2f4"
        strokeWidth={1.5}
      />
      <SvgText
        x={SCREEN_WIDTH - 110}
        y={115}
        textAnchor="middle"
        fontSize={12}
        fill="#6070c7"
        fontWeight="700"
      >
        Verify
      </SvgText>

      {/* FLOW DOWN FROM DIAMOND */}
      <Path
        d={`
          M ${SCREEN_WIDTH - 110} 150
          L ${SCREEN_WIDTH - 110} ${SCREEN_HEIGHT * 0.42}
        `}
        stroke="#b7c2f1"
        strokeWidth="2"
        fill="none"
        strokeDasharray="6,6"
      />

      {/* SEND OTP NODE */}
      <Rect
        x={SCREEN_WIDTH - 155}
        y={SCREEN_HEIGHT * 0.42}
        width={125}
        height={40}
        rx={12}
        fill="#ffffff"
        stroke="#c9d2f4"
        strokeWidth={1.5}
      />
      <SvgText
        x={SCREEN_WIDTH - 92}
        y={SCREEN_HEIGHT * 0.42 + 25}
        textAnchor="middle"
        fontSize={13}
        fill="#6070c7"
        fontWeight="700"
      >
        Sign In
      </SvgText>

      {/* FLOW TO END */}
      <Path
        d={`
          M ${SCREEN_WIDTH - 92} ${SCREEN_HEIGHT * 0.42 + 40}
          C ${SCREEN_WIDTH - 92} ${SCREEN_HEIGHT * 0.62},
            ${SCREEN_WIDTH - 80} ${SCREEN_HEIGHT * 0.68},
            ${SCREEN_WIDTH - 80} ${SCREEN_HEIGHT * 0.76}
        `}
        stroke="#bcc8f5"
        strokeWidth="2"
        fill="none"
        strokeDasharray="6,6"
      />

      {/* END NODE */}
      <Circle
        cx={SCREEN_WIDTH - 80}
        cy={SCREEN_HEIGHT * 0.82}
        r={24}
        fill="#ffffff"
        stroke="#c9d2f4"
        strokeWidth={1.5}
      />
      <SvgText
        x={SCREEN_WIDTH - 80}
        y={SCREEN_HEIGHT * 0.82 + 5}
        textAnchor="middle"
        fontSize={14}
        fill="#6070c7"
        fontWeight="700"
      >
        End
      </SvgText>

      {/* FLOW LINE TO BOTTOM */}
      <Path
        d={`
          M ${SCREEN_WIDTH - 80} ${SCREEN_HEIGHT * 0.82 + 24}
          C ${SCREEN_WIDTH - 80} ${SCREEN_HEIGHT * 0.92},
            ${SCREEN_WIDTH / 2} ${SCREEN_HEIGHT * 0.92},
            ${SCREEN_WIDTH / 2} ${SCREEN_HEIGHT}
        `}
        stroke="#b7c2f1"
        strokeWidth="2"
        fill="none"
        strokeDasharray="6,6"
      />

      {/* BLOBS */}
      <Circle cx={SCREEN_WIDTH * 0.18} cy={SCREEN_HEIGHT * 0.1} r={24} fill="#dfe5ff" opacity={0.45} />
      <Circle cx={SCREEN_WIDTH * 0.78} cy={SCREEN_HEIGHT * 0.18} r={32} fill="#dfe5ff" opacity={0.35} />
      <Circle cx={SCREEN_WIDTH * 0.55} cy={SCREEN_HEIGHT * 0.88} r={24} fill="#dfe5ff" opacity={0.4} />
    </Svg>
  </View>
);

// ─── EYE ICON ────────────────────────────────────────────────────────────────

const EyeIcon = ({ visible }: { visible: boolean }) => (
  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
    {visible ? (
      <>
        <Path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="#8896b3" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
        <Circle cx={12} cy={12} r={3} stroke="#8896b3" strokeWidth={1.8} />
      </>
    ) : (
      <>
        <Path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94" stroke="#8896b3" strokeWidth={1.8} strokeLinecap="round" />
        <Path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19" stroke="#8896b3" strokeWidth={1.8} strokeLinecap="round" />
        <Path d="M1 1l22 22" stroke="#8896b3" strokeWidth={1.8} strokeLinecap="round" />
      </>
    )}
  </Svg>
);

// ─── GOOGLE ICON ─────────────────────────────────────────────────────────────

const GoogleIcon = () => (
  <Svg width={18} height={18} viewBox="0 0 24 24">
    <Path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
    <Path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
    <Path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
    <Path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
  </Svg>
);

WebBrowser.maybeCompleteAuthSession();

// ─── MAIN COMPONENT ──────────────────────────────────────────────────────────

export default function SignIn() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [errors, setErrors] = useState({
    email: '',
    password: '',
    terms: '',
  });

  const passwordRef = useRef<TextInput>(null);

  // Google Sign In
  const [request, response, promptAsync] = Google.useAuthRequest({
    webClientId: '633434684809-p1a626c6bh4cn11v53dtbeq81u3s94a2.apps.googleusercontent.com', // Add your Google Client ID
    // iosClientId: 'YOUR_IOS_CLIENT_ID.apps.googleusercontent.com',
    // androidClientId: 'YOUR_ANDROID_CLIENT_ID.apps.googleusercontent.com',
  });

  React.useEffect(() => {
    const handleGoogleResponse = async () => {
      if (response?.type === 'success' && response.params?.id_token) {
        setLoading(true);
        try {
          const result = await authService.googleAuth(response.params.id_token);
          if (result.success) {
            router.replace('/(tabs)/home');
          } else {
            Alert.alert('Sign In Failed', result.message || 'Google sign in failed');
          }
        } catch (error: any) {
          Alert.alert('Sign In Failed', error.message || 'Something went wrong');
        } finally {
          setLoading(false);
        }
      }
    };
    handleGoogleResponse();
  }, [response]);

  const handleSignIn = async () => {
    const newErrors = { email: '', password: '', terms: '' };

    if (!email) newErrors.email = 'Email is required';
    if (!password) newErrors.password = 'Password is required';
    if (!agreed) newErrors.terms = 'You must agree to continue';

    setErrors(newErrors);
    if (newErrors.email || newErrors.password || newErrors.terms) return;

    setLoading(true);
    try {
      const result = await authService.signIn(email, password);
      if (result.success) {
        router.replace('/(tabs)/home');
      } else {
        Alert.alert('Sign In Failed', result.message || 'Invalid email or password');
      }
    } catch (error: any) {
      Alert.alert('Sign In Failed', error.response?.data?.message || error.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    if (!request) return;
    try {
      await promptAsync();
    } catch (error) {
      Alert.alert('Google Sign In', 'Failed to connect to Google');
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
          {/* ── CARD ── */}
          <View style={styles.card}>

            {/* CONNECTOR DOTS */}
            <View style={styles.connectorTop} />
            <View style={styles.connectorBottom} />
            <View style={styles.connectorLeft} />
            <View style={styles.connectorRight} />

            {/* LOGO */}
            <View style={styles.logoWrap}>
              <Image
                source={require('../../assets/images/logo.png')}
                style={styles.logo}
                resizeMode="contain"
              />
            </View>

            {/* HEADING */}
            <Text style={styles.heading}>Welcome Back</Text>
            <Text style={styles.subtitle}>Sign in to continue your learning journey</Text>

            {/* EMAIL */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Email</Text>
              <View
                style={[
                  styles.inputWrap,
                  emailFocused && styles.inputWrapFocused,
                  errors.email && styles.inputError,
                ]}
              >
                <TextInput
                  style={[
                    styles.input,
                    Platform.OS === 'web' ? { outlineWidth: 0 } : null,
                  ]}
                  placeholder="you@example.com"
                  placeholderTextColor="#b8c0d4"
                  value={email}
                  onChangeText={(text) => {
                    setEmail(text);
                    if (errors.email) setErrors(prev => ({ ...prev, email: '' }));
                  }}
                  onFocus={() => setEmailFocused(true)}
                  onBlur={() => setEmailFocused(false)}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="next"
                  blurOnSubmit={false}
                  onSubmitEditing={() => passwordRef.current?.focus()}
                  underlineColorAndroid="transparent"
                  selectionColor="#3b5bdb"
                  cursorColor="#3b5bdb"
                  autoComplete="off"
                  importantForAutofill="no"
                />
              </View>
              {errors.email ? (
                <Text style={styles.errorText}>{errors.email}</Text>
              ) : null}
            </View>

            {/* PASSWORD */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Password</Text>
              <View
                style={[
                  styles.inputWrap,
                  passwordFocused && styles.inputWrapFocused,
                  errors.password && styles.inputError,
                ]}
              >
                <TextInput
                  ref={passwordRef}
                  style={[styles.input, styles.inputWithIcon]}
                  placeholder="Enter your password"
                  placeholderTextColor="#b8c0d4"
                  value={password}
                  onChangeText={(text) => {
                    setPassword(text);
                    if (errors.password) setErrors(prev => ({ ...prev, password: '' }));
                  }}
                  onFocus={() => setPasswordFocused(true)}
                  onBlur={() => setPasswordFocused(false)}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  returnKeyType="done"
                  blurOnSubmit={true}
                  onSubmitEditing={handleSignIn}
                  underlineColorAndroid="transparent"
                  selectionColor="#3b5bdb"
                  cursorColor="#3b5bdb"
                  autoComplete="off"
                  importantForAutofill="no"
                />
                <TouchableOpacity
                  style={styles.eyeBtn}
                  onPress={() => setShowPassword(!showPassword)}
                  activeOpacity={0.7}
                >
                  <EyeIcon visible={showPassword} />
                </TouchableOpacity>
              </View>
              {errors.password ? (
                <Text style={styles.errorText}>{errors.password}</Text>
              ) : null}
              <TouchableOpacity
                style={styles.forgotWrap}
                onPress={() => router.push('/(auth)/forgot-password')}
                activeOpacity={0.7}
              >
                <Text style={styles.forgotText}>Forgot password?</Text>
              </TouchableOpacity>
            </View>

            {/* SIGN IN BUTTON */}
            <Pressable
              style={({ pressed }) => [
                styles.btnSignIn,
                loading && styles.btnDisabled,
                {
                  transform: [{ scale: pressed ? 0.97 : 1 }],
                  opacity: pressed ? 0.9 : 1,
                },
              ]}
              onPress={handleSignIn}
              disabled={loading}
            >
              {loading ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <ActivityIndicator color="#fff" size="small" />
                  <Text style={styles.btnSignInText}>Signing in...</Text>
                </View>
              ) : (
                <Text style={styles.btnSignInText}>Sign In</Text>
              )}
            </Pressable>

            {/* DIVIDER */}
            <View style={styles.divider}>
              <View style={styles.line} />
              <Text style={styles.orText}>OR</Text>
              <View style={styles.line} />
            </View>

            {/* GOOGLE */}
            <TouchableOpacity
              style={styles.btnGoogle}
              onPress={handleGoogleSignIn}
              activeOpacity={0.85}
              disabled={!request}
            >
              <GoogleIcon />
              <Text style={styles.btnGoogleText}>Continue with Google</Text>
            </TouchableOpacity>

            {/* TERMS */}
            <TouchableOpacity
              style={[
                styles.termsWrap,
                errors.terms && styles.termsError,
              ]}
              onPress={() => {
                setAgreed(!agreed);
                if (errors.terms) setErrors(prev => ({ ...prev, terms: '' }));
              }}
              activeOpacity={0.8}
            >
              <View
                style={[
                  styles.customCheckbox,
                  agreed && styles.customCheckboxChecked,
                ]}
              >
                {agreed && (
                  <Svg width={10} height={10} viewBox="0 0 10 10">
                    <Path
                      d="M2 5l2.5 2.5L8 3"
                      stroke="white"
                      strokeWidth={1.8}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      fill="none"
                    />
                  </Svg>
                )}
              </View>
              <Text style={styles.termsText}>
                I agree to the{' '}
                <Text style={styles.termsLink}>Terms and Conditions</Text>
                {' '}and{' '}
                <Text style={styles.termsLink}>Privacy Policy</Text>
              </Text>
            </TouchableOpacity>

            {errors.terms ? (
              <Text style={styles.errorText}>{errors.terms}</Text>
            ) : null}

            {/* SIGN UP LINK */}
            <View style={styles.signupWrap}>
              <Text style={styles.signupText}>Don't have an account? </Text>
              <TouchableOpacity
                onPress={() => router.push('/(auth)/signup')}
                activeOpacity={0.7}
              >
                <Text style={styles.signupLink}>Sign Up</Text>
              </TouchableOpacity>
            </View>

          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: '#eef2ff',
  },

  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 16,
  },

  card: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    paddingHorizontal: 28,
    paddingVertical: 28,
    width: '100%',
    maxWidth: 420,
    position: 'relative',
    shadowColor: '#0a0f1e',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.08,
    shadowRadius: 40,
    elevation: 10,
    marginTop: -25,
  },

  connectorTop: {
    position: 'absolute',
    top: -5,
    alignSelf: 'center',
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#cbd5f5',
  },

  connectorBottom: {
    position: 'absolute',
    bottom: -5,
    alignSelf: 'center',
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#cbd5f5',
  },

  connectorLeft: {
    position: 'absolute',
    left: -5,
    top: '50%',
    transform: [{ translateY: -5 }],
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#cbd5f5',
  },

  connectorRight: {
    position: 'absolute',
    right: -5,
    top: '50%',
    transform: [{ translateY: -5 }],
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#cbd5f5',
  },

  logoWrap: {
    alignItems: 'center',
    marginBottom: 16,
  },

  logo: {
    width: 56,
    height: 56,
    borderRadius: 14,
    backgroundColor: '#0a0f1e',
  },

  heading: {
    fontSize: 28,
    fontWeight: '800',
    color: '#0f172a',
    textAlign: 'center',
  },

  subtitle: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 24,
    textAlign: 'center',
  },

  formGroup: {
    marginBottom: 16,
  },

  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
  },

  inputWrap: {
    borderWidth: 1,
    borderColor: '#d0d7ff',
    borderRadius: 12,
    backgroundColor: '#ffffff',
    minHeight: 40,
    justifyContent: 'center',
  },

  inputWrapFocused: {
    borderColor: '#3b5bdb',
    backgroundColor: '#ffffff',
    shadowColor: '#3b5bdb',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
  },

  input: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 11 : 9,
    fontSize: 14,
    color: '#1a1f36',
    backgroundColor: 'transparent',
    minHeight: 44,
    textAlignVertical: 'center',
  },

  inputWithIcon: {
    paddingRight: 44,
  },

  eyeBtn: {
    position: 'absolute',
    right: 12,
    padding: 10,
  },

  forgotWrap: {
    alignItems: 'flex-end',
    marginTop: 6,
  },

  forgotText: {
    fontSize: 12.5,
    color: '#8896b3',
    fontWeight: '500',
  },

  inputError: {
    borderColor: '#e11d48',
  },

  termsError: {
    borderColor: '#e11d48',
  },

  errorText: {
    fontSize: 12,
    color: '#e11d48',
    marginTop: 6,
    marginLeft: 4,
    fontWeight: '500',
  },

  btnSignIn: {
    backgroundColor: '#3b5bdb',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2f49c7',
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 5,
    overflow: 'hidden',
    shadowColor: '#3b5bdb',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 8,
  },

  btnDisabled: {
    opacity: 0.75,
  },

  btnSignInText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.3,
  },

  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 10,
  },

  line: {
    flex: 1,
    height: 1,
    backgroundColor: '#e5e9f5',
  },

  orText: {
    marginHorizontal: 10,
    fontSize: 12,
    color: '#8896b3',
    fontWeight: '600',
  },

  btnGoogle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    paddingVertical: 8,
    marginTop: 5,
    backgroundColor: '#ffffff',
  },

  btnGoogleText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1a1f36',
    marginLeft: 8,
  },

  termsWrap: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginTop: 14,
    padding: 10,
    borderWidth: 1.5,
    borderColor: '#e2e6f3',
    borderRadius: 10,
    backgroundColor: '#f8f9ff',
  },

  customCheckbox: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: '#8896b3',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
    flexShrink: 0,
  },

  customCheckboxChecked: {
    borderColor: '#3b5bdb',
    backgroundColor: '#3b5bdb',
  },

  termsText: {
    fontSize: 12.5,
    color: '#4a5568',
    flex: 1,
    lineHeight: 18,
  },

  termsLink: {
    fontWeight: '700',
    color: '#1a1f36',
  },

  signupWrap: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },

  signupText: {
    fontSize: 13,
    color: '#64748b',
  },

  signupLink: {
    fontSize: 13,
    fontWeight: '700',
    color: '#3b5bdb',
  },
});