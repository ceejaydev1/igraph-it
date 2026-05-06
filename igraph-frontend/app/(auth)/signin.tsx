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
import { Svg, Line, Circle, Rect, Path, G, Text as SvgText, Defs, Pattern, Marker, Polygon } from 'react-native-svg';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// ─── DIAGRAM BACKGROUND ──────────────────────────────────────────────────────

const DiagramBackground = () => (
  <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
    <Svg width="100%" height="100%" style={StyleSheet.absoluteFillObject}>
      <Defs>
        {/* Grid pattern */}
        <Pattern id="grid" width="32" height="32" patternUnits="userSpaceOnUse">
          <Path d="M 32 0 L 0 0 0 32" fill="none" stroke="#c5cae9" strokeWidth="0.6" opacity="0.25" />
        </Pattern>
        {/* Dot pattern */}
        <Pattern id="dots" width="32" height="32" patternUnits="userSpaceOnUse">
          <Circle cx="16" cy="16" r="1.2" fill="#b0b8e8" opacity="0.25" />
        </Pattern>
      </Defs>

      {/* Background fill */}
      <Rect width={SCREEN_WIDTH} height={SCREEN_HEIGHT} fill="#eef0fb" />

      {/* Grid lines */}
      <Rect width={SCREEN_WIDTH} height={SCREEN_HEIGHT} fill="url(#grid)" />

      {/* Dot pattern overlay on right side */}
      <Rect x={SCREEN_WIDTH * 0.6} y={0} width={SCREEN_WIDTH * 0.4} height={SCREEN_HEIGHT * 0.5} fill="url(#dots)" />
      <Rect x={0} y={SCREEN_HEIGHT * 0.6} width={SCREEN_WIDTH * 0.3} height={SCREEN_HEIGHT * 0.4} fill="url(#dots)" />

      {/* ── TOP LEFT: Start node + UML class ── */}
      {/* Start oval */}
      <Rect x={40} y={80} width={90} height={36} rx={18} fill="white" stroke="#c5cae9" strokeWidth={1.2} />
      <SvgText x={85} y={103} textAnchor="middle" fontSize={13} fill="#7986cb" fontWeight="500">Start</SvgText>
      {/* Small circle connector on right of Start */}
      <Circle cx={130} cy={98} r={4} fill="white" stroke="#c5cae9" strokeWidth={1.2} />

      {/* UML Class box top-left */}
      <Rect x={160} y={30} width={110} height={64} rx={4} fill="white" stroke="#c5cae9" strokeWidth={1.2} />
      <Line x1={160} y1={50} x2={270} y2={50} stroke="#c5cae9" strokeWidth={1.2} />
      <SvgText x={215} y={44} textAnchor="middle" fontSize={10} fill="#9fa8da">{'<<class>> User'}</SvgText>
      <SvgText x={168} y={62} fontSize={10} fill="#9fa8da">+ email: String</SvgText>
      <SvgText x={168} y={76} fontSize={10} fill="#9fa8da">+ password: String</SvgText>

      {/* Dashed arrow from Start down */}
      <Line x1={85} y1={116} x2={85} y2={200} stroke="#c5cae9" strokeWidth={1.2} strokeDasharray="5,4" />
      <Polygon points={`82,200 88,200 85,210`} fill="#c5cae9" />

      {/* ── TOP RIGHT: Decision diamond ── */}
      {/* Diamond */}
      <Path
        d={`M ${SCREEN_WIDTH - 100},60 L ${SCREEN_WIDTH - 60},100 L ${SCREEN_WIDTH - 100},140 L ${SCREEN_WIDTH - 140},100 Z`}
        fill="white" stroke="#c5cae9" strokeWidth={1.2}
      />
      <SvgText x={SCREEN_WIDTH - 100} y={105} textAnchor="middle" fontSize={12} fill="#7986cb">Decision</SvgText>
      {/* Small circle left of diamond */}
      <Circle cx={SCREEN_WIDTH - 145} cy={100} r={4} fill="white" stroke="#c5cae9" strokeWidth={1.2} />
      {/* Arrow down from diamond */}
      <Line x1={SCREEN_WIDTH - 100} y1={140} x2={SCREEN_WIDTH - 100} y2={220} stroke="#c5cae9" strokeWidth={1.2} strokeDasharray="5,4" />
      <Polygon points={`${SCREEN_WIDTH - 103},220 ${SCREEN_WIDTH - 97},220 ${SCREEN_WIDTH - 100},230`} fill="#c5cae9" />

      {/* ── TOP RIGHT: Tree/hierarchy icon ── */}
      <Rect x={SCREEN_WIDTH - 30} y={160} width={14} height={10} rx={2} fill="white" stroke="#c5cae9" strokeWidth={1} />
      <Line x1={SCREEN_WIDTH - 23} y1={170} x2={SCREEN_WIDTH - 23} y2={182} stroke="#c5cae9" strokeWidth={1} />
      <Line x1={SCREEN_WIDTH - 36} y1={182} x2={SCREEN_WIDTH - 10} y2={182} stroke="#c5cae9" strokeWidth={1} />
      <Rect x={SCREEN_WIDTH - 40} y={182} width={10} height={8} rx={1} fill="white" stroke="#c5cae9" strokeWidth={1} />
      <Rect x={SCREEN_WIDTH - 27} y={182} width={10} height={8} rx={1} fill="white" stroke="#c5cae9" strokeWidth={1} />
      <Rect x={SCREEN_WIDTH - 14} y={182} width={10} height={8} rx={1} fill="white" stroke="#c5cae9" strokeWidth={1} />

      {/* ── MID LEFT: Validate node ── */}
      <Rect x={20} y={SCREEN_HEIGHT * 0.42} width={80} height={30} rx={4} fill="white" stroke="#c5cae9" strokeWidth={1.2} />
      <SvgText x={60} y={SCREEN_HEIGHT * 0.42 + 20} textAnchor="middle" fontSize={12} fill="#7986cb">Validate</SvgText>
      {/* Circle connector right of Validate */}
      <Circle cx={100} cy={SCREEN_HEIGHT * 0.42 + 15} r={4} fill="white" stroke="#c5cae9" strokeWidth={1.2} />
      {/* Dashed line left */}
      <Line x1={20} y1={SCREEN_HEIGHT * 0.42 + 15} x2={0} y2={SCREEN_HEIGHT * 0.42 + 15} stroke="#c5cae9" strokeWidth={1.2} strokeDasharray="5,4" />

      {/* ── MID RIGHT: Authenticate node ── */}
      <Circle cx={SCREEN_WIDTH - 120} cy={SCREEN_HEIGHT * 0.42 + 15} r={4} fill="white" stroke="#c5cae9" strokeWidth={1.2} />
      <Rect x={SCREEN_WIDTH - 116} y={SCREEN_HEIGHT * 0.42} width={100} height={30} rx={4} fill="white" stroke="#c5cae9" strokeWidth={1.2} />
      <SvgText x={SCREEN_WIDTH - 66} y={SCREEN_HEIGHT * 0.42 + 20} textAnchor="middle" fontSize={12} fill="#7986cb">Authenticate</SvgText>
      {/* Arrow down from Authenticate */}
      <Line x1={SCREEN_WIDTH - 66} y1={SCREEN_HEIGHT * 0.42 + 30} x2={SCREEN_WIDTH - 66} y2={SCREEN_HEIGHT * 0.42 + 80} stroke="#c5cae9" strokeWidth={1.2} strokeDasharray="5,4" />
      <Polygon
        points={`${SCREEN_WIDTH - 69},${SCREEN_HEIGHT * 0.42 + 80} ${SCREEN_WIDTH - 63},${SCREEN_HEIGHT * 0.42 + 80} ${SCREEN_WIDTH - 66},${SCREEN_HEIGHT * 0.42 + 90}`}
        fill="#c5cae9"
      />

      {/* ── BOTTOM LEFT: Database + Process ── */}
      {/* Database cylinder */}
      <Rect x={30} y={SCREEN_HEIGHT * 0.78} width={50} height={40} rx={4} fill="white" stroke="#c5cae9" strokeWidth={1.2} />
      <Path d={`M 30,${SCREEN_HEIGHT * 0.78 + 8} Q 55,${SCREEN_HEIGHT * 0.78} 80,${SCREEN_HEIGHT * 0.78 + 8}`} fill="white" stroke="#c5cae9" strokeWidth={1.2} />
      <Path d={`M 30,${SCREEN_HEIGHT * 0.78 + 14} Q 55,${SCREEN_HEIGHT * 0.78 + 22} 80,${SCREEN_HEIGHT * 0.78 + 14}`} fill="none" stroke="#c5cae9" strokeWidth={1.2} />
      {/* Arrow from DB to Process */}
      <Line x1={80} y1={SCREEN_HEIGHT * 0.78 + 20} x2={105} y2={SCREEN_HEIGHT * 0.78 + 20} stroke="#c5cae9" strokeWidth={1.2} strokeDasharray="5,4" />
      <Polygon
        points={`105,${SCREEN_HEIGHT * 0.78 + 17} 115,${SCREEN_HEIGHT * 0.78 + 20} 105,${SCREEN_HEIGHT * 0.78 + 23}`}
        fill="#c5cae9"
      />
      {/* Process box */}
      <Rect x={115} y={SCREEN_HEIGHT * 0.78 + 8} width={80} height={26} rx={4} fill="white" stroke="#c5cae9" strokeWidth={1.2} />
      <Circle cx={195} cy={SCREEN_HEIGHT * 0.78 + 21} r={4} fill="white" stroke="#c5cae9" strokeWidth={1.2} />
      <SvgText x={155} y={SCREEN_HEIGHT * 0.78 + 26} textAnchor="middle" fontSize={12} fill="#7986cb">Process</SvgText>
      {/* Arrow right from Process */}
      <Line x1={199} y1={SCREEN_HEIGHT * 0.78 + 21} x2={230} y2={SCREEN_HEIGHT * 0.78 + 21} stroke="#c5cae9" strokeWidth={1.2} />
      <Polygon
        points={`230,${SCREEN_HEIGHT * 0.78 + 18} 240,${SCREEN_HEIGHT * 0.78 + 21} 230,${SCREEN_HEIGHT * 0.78 + 24}`}
        fill="#c5cae9"
      />

      {/* ── BOTTOM RIGHT: End node ── */}
      <Circle cx={SCREEN_WIDTH - 80} cy={SCREEN_HEIGHT * 0.78 + 20} r={22} fill="white" stroke="#c5cae9" strokeWidth={1.2} />
      <SvgText x={SCREEN_WIDTH - 80} y={SCREEN_HEIGHT * 0.78 + 25} textAnchor="middle" fontSize={13} fill="#7986cb">End</SvgText>
      {/* Dashed line to End */}
      <Line x1={SCREEN_WIDTH - 200} y1={SCREEN_HEIGHT * 0.78 + 20} x2={SCREEN_WIDTH - 104} y2={SCREEN_HEIGHT * 0.78 + 20} stroke="#c5cae9" strokeWidth={1.2} strokeDasharray="5,4" />

      {/* ── BOTTOM LEFT: Flowchart decision ── */}
      <Path
        d={`M ${90},${SCREEN_HEIGHT * 0.88 + 16} L ${110},${SCREEN_HEIGHT * 0.88} L ${130},${SCREEN_HEIGHT * 0.88 + 16} L ${110},${SCREEN_HEIGHT * 0.88 + 32} Z`}
        fill="white" stroke="#c5cae9" strokeWidth={1.2}
      />
      {/* Small rectangle left */}
      <Rect x={60} y={SCREEN_HEIGHT * 0.88 + 8} width={20} height={14} rx={2} fill="white" stroke="#c5cae9" strokeWidth={1} />

      {/* ── SCATTER: X marks, plus signs, circles ── */}
      {/* X marks */}
      <Path d={`M ${SCREEN_WIDTH * 0.12 - 5},${SCREEN_HEIGHT * 0.05} L ${SCREEN_WIDTH * 0.12 + 5},${SCREEN_HEIGHT * 0.05 + 10}`} stroke="#c5cae9" strokeWidth={1.2} />
      <Path d={`M ${SCREEN_WIDTH * 0.12 + 5},${SCREEN_HEIGHT * 0.05} L ${SCREEN_WIDTH * 0.12 - 5},${SCREEN_HEIGHT * 0.05 + 10}`} stroke="#c5cae9" strokeWidth={1.2} />

      <Path d={`M ${SCREEN_WIDTH * 0.42 - 5},${SCREEN_HEIGHT * 0.62} L ${SCREEN_WIDTH * 0.42 + 5},${SCREEN_HEIGHT * 0.62 + 10}`} stroke="#c5cae9" strokeWidth={1.2} />
      <Path d={`M ${SCREEN_WIDTH * 0.42 + 5},${SCREEN_HEIGHT * 0.62} L ${SCREEN_WIDTH * 0.42 - 5},${SCREEN_HEIGHT * 0.62 + 10}`} stroke="#c5cae9" strokeWidth={1.2} />

      <Path d={`M ${SCREEN_WIDTH * 0.72 - 5},${SCREEN_HEIGHT * 0.55} L ${SCREEN_WIDTH * 0.72 + 5},${SCREEN_HEIGHT * 0.55 + 10}`} stroke="#c5cae9" strokeWidth={1.2} />
      <Path d={`M ${SCREEN_WIDTH * 0.72 + 5},${SCREEN_HEIGHT * 0.55} L ${SCREEN_WIDTH * 0.72 - 5},${SCREEN_HEIGHT * 0.55 + 10}`} stroke="#c5cae9" strokeWidth={1.2} />

      {/* Plus signs */}
      <Path d={`M ${SCREEN_WIDTH - 20},${SCREEN_HEIGHT * 0.55} L ${SCREEN_WIDTH - 20},${SCREEN_HEIGHT * 0.55 + 10}`} stroke="#c5cae9" strokeWidth={1.2} />
      <Path d={`M ${SCREEN_WIDTH - 25},${SCREEN_HEIGHT * 0.55 + 5} L ${SCREEN_WIDTH - 15},${SCREEN_HEIGHT * 0.55 + 5}`} stroke="#c5cae9" strokeWidth={1.2} />

      {/* Scatter circles (blobs) */}
      <Circle cx={SCREEN_WIDTH * 0.65} cy={SCREEN_HEIGHT * 0.08} r={28} fill="#dde0f7" opacity={0.5} />
      <Circle cx={SCREEN_WIDTH * 0.3} cy={SCREEN_HEIGHT * 0.06} r={18} fill="#dde0f7" opacity={0.4} />
      <Circle cx={SCREEN_WIDTH * 0.55} cy={SCREEN_HEIGHT * 0.85} r={22} fill="#dde0f7" opacity={0.45} />
      <Circle cx={SCREEN_WIDTH * 0.72} cy={SCREEN_HEIGHT * 0.92} r={16} fill="#dde0f7" opacity={0.4} />

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

  const handleSignIn = async () => {
  const newErrors = {
    email: '',
    password: '',
    terms: '',
  };

  if (!email) {
    newErrors.email = 'Email is required';
  }

  if (!password) {
    newErrors.password = 'Password is required';
  }

  if (!agreed) {
    newErrors.terms = 'You must agree to continue';
  }

  setErrors(newErrors);

  // stop if any error exists
  if (newErrors.email || newErrors.password || newErrors.terms) return;

  try {
    setLoading(true);

    setTimeout(() => {
      setLoading(false);
      router.replace('/(tabs)/home');
    }, 1500);

  } catch (err: any) {
    setLoading(false);

    // fallback: attach to password (or email)
    setErrors(prev => ({
      ...prev,
      password: err.message || 'Invalid credentials',
    }));
  }
};

  const handleGoogleSignIn = async () => {
    // Implement Google Auth via expo-auth-session
    Alert.alert('Google Sign In', 'Google authentication coming soon.');
  };

  return (
  <>
    <Stack.Screen options={{ headerShown: false }} />
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Diagram Background */}
      <DiagramBackground />

      <View style={styles.scrollContent}>
        {/* ── CARD ── */}
        <View style={styles.card}>

          {/* Top connector dot */}
          <View style={styles.connectorTop} />

          {/* Logo */}
          <View style={styles.logoWrap}>
            <Image
              source={require('../../assets/images/logo.png')}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>

          {/* Heading */}
          <Text style={styles.heading}>Welcome Back</Text>
          <Text style={styles.subtitle}>Sign in to continue your learning journey</Text>

          {/* Email Field */}
          <View style={styles.formGroup}>
  <Text style={styles.label}>Email</Text>

  <View
    style={[
      styles.inputWrap,
      emailFocused && styles.inputWrapFocused,
      errors.email && styles.inputError, // 🔥 error border
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
        if (errors.email) {
          setErrors(prev => ({ ...prev, email: '' })); // 🔥 clear error live
        }
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

          {/* Password Field */}
          <View style={styles.formGroup}>
  <Text style={styles.label}>Password</Text>

  <View
    style={[
      styles.inputWrap,
      passwordFocused && styles.inputWrapFocused,
      errors.password && styles.inputError, // 🔥 error border
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
        if (errors.password) {
          setErrors(prev => ({ ...prev, password: '' })); // 🔥 clear error
        }
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

          {/* Sign In Button */}
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

          <View style={styles.divider}>
            <View style={styles.line} />
            <Text style={styles.orText}>OR</Text>
            <View style={styles.line} />
          </View>

          {/* Continue with Google */}
          <TouchableOpacity
            style={styles.btnGoogle}
            onPress={handleGoogleSignIn}
            activeOpacity={0.85}
          >
            <GoogleIcon />
            <Text style={styles.btnGoogleText}>Continue with Google</Text>
          </TouchableOpacity>

          {/* Terms and Conditions */}
          <TouchableOpacity
            style={[
              styles.termsWrap,
              errors.terms && styles.termsError, // 🔥 error border
            ]}
            onPress={() => {
              setAgreed(!agreed);

              if (errors.terms) {
                setErrors(prev => ({ ...prev, terms: '' })); // 🔥 clear error
              }
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

          {/* Sign Up Link */}
          <View style={styles.signupWrap}>
            <Text style={styles.signupText}>Don't have an account? </Text>
            <TouchableOpacity onPress={() => router.push('/(auth)/signup')} activeOpacity={0.7}>
              <Text style={styles.signupLink}>Sign Up</Text>
            </TouchableOpacity>
          </View>

          {/* Bottom connector dot */}
          <View style={styles.connectorBottom} />
          <View style={styles.connectorLeft} />
          <View style={styles.connectorRight} />

        </View>
      </View>
    </KeyboardAvoidingView>
    </>
  );
}

// ─── STYLES ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: '#eef0fb',
  },

  scrollContent: {
    flex: 1, // 🔥 change this
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 16,
  },

  // ── CARD
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    paddingHorizontal: 28,
    paddingVertical: 28,
    width: '100%',
    maxWidth: 420,
    marginTop: -25,

    shadowColor: '#0a0f1e',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.08,
    shadowRadius: 40,
    elevation: 10,
  },


  // Connector dots (top/bottom of card, matching the design)
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
    left: -5, // adjust how far outside the card
    top: '50%',
    transform: [{ translateY: -5 }], // half of height to perfectly center
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#cbd5f5',
  },

    connectorRight: {
    position: 'absolute',
    right: -5, // adjust how far outside the card
    top: '50%',
    transform: [{ translateY: -5 }], // half of height to perfectly center
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#cbd5f5',
  },

  // ── LOGO
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

  // ── HEADING
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
    marginBottom: 16, // from 14
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
    minHeight: 40, // 🔥 better control
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
    backgroundColor: 'transparent', // prevents overlay issues
    minHeight: 44,
    textAlignVertical: "center",
  },

  inputWithIcon: {
    paddingRight: 44,
  },

  eyeBtn: {
    position: 'absolute',
    right: 12,
    padding: 10,
  },

  // ── FORGOT
  forgotWrap: {
    alignItems: 'flex-end',
    marginTop: 6,
  },

  forgotText: {
    fontSize: 12.5,
    color: '#8896b3',
    fontWeight: '500',
  },

  // ── ERROR
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

  // ── SIGN IN BUTTON
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
  

  // ── GOOGLE BUTTON
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

  btnGoogleText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1a1f36',
    marginLeft: 8,
  },

  // ── TERMS
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

  // ── SIGNUP LINK
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