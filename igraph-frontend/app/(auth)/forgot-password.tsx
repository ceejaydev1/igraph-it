// app/(auth)/forgot-password.tsx
// iGraph IT — Premium Forgot Password Screen

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
} from 'react-native';

import { useRouter } from 'expo-router';

import {
  Svg,
  Circle,
  Rect,
  Path,
  Text as SvgText,
  Defs,
  Pattern,
  Polygon,
} from 'react-native-svg';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } =
  Dimensions.get('window');

//
// ──────────────────────────────────────────────────────────
// BEAUTIFUL FLOWCHART BACKGROUND
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

        {/* STRONGER GRID FOR MOBILE */}
        <Pattern
          id="grid"
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

        {/* DOTS */}
        <Pattern
          id="dots"
          width="26"
          height="26"
          patternUnits="userSpaceOnUse"
        >
          <Circle
            cx="13"
            cy="13"
            r="1.3"
            fill="#b8c4f3"
            opacity="0.8"
          />
        </Pattern>

      </Defs>

      {/* BACKGROUND */}
      <Rect
        width={SCREEN_WIDTH}
        height={SCREEN_HEIGHT}
        fill="#eef2ff"
      />

      {/* GRID */}
      <Rect
        width={SCREEN_WIDTH}
        height={SCREEN_HEIGHT}
        fill="url(#grid)"
        opacity="1"
      />

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
      <Rect
        x={40}
        y={80}
        width={100}
        height={42}
        rx={21}
        fill="#ffffff"
        stroke="#c9d2f4"
        strokeWidth={1.5}
      />

      <SvgText
        x={90}
        y={106}
        textAnchor="middle"
        fontSize={14}
        fill="#6070c7"
        fontWeight="700"
      >
        Start
      </SvgText>

      {/* FLOW TO VERIFY */}
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

      {/* FLOW DOWN */}
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

      {/* SEND OTP */}
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
        Send OTP
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

      {/* FLOW LINE TO CONNECTOR */}
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
      <Circle
        cx={SCREEN_WIDTH * 0.18}
        cy={SCREEN_HEIGHT * 0.1}
        r={24}
        fill="#dfe5ff"
        opacity={0.45}
      />

      <Circle
        cx={SCREEN_WIDTH * 0.78}
        cy={SCREEN_HEIGHT * 0.18}
        r={32}
        fill="#dfe5ff"
        opacity={0.35}
      />

      <Circle
        cx={SCREEN_WIDTH * 0.55}
        cy={SCREEN_HEIGHT * 0.88}
        r={24}
        fill="#dfe5ff"
        opacity={0.4}
      />
    </Svg>
  </View>
);

//
// ──────────────────────────────────────────────────────────
// ICONS
// ──────────────────────────────────────────────────────────
//

const MailIcon = () => (
  <Svg width={56} height={56} viewBox="0 0 48 48" fill="none">
    <Rect width={48} height={48} rx={16} fill="#eef2ff" />

    <Path
      d="M12 16a2 2 0 012-2h20a2 2 0 012 2v16a2 2 0 01-2 2H14a2 2 0 01-2-2V16z"
      stroke="#4c6fff"
      strokeWidth={1.8}
      fill="none"
    />

    <Path
      d="M12 16l12 9 12-9"
      stroke="#4c6fff"
      strokeWidth={1.8}
      strokeLinecap="round"
      fill="none"
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
// MAIN SCREEN
// ──────────────────────────────────────────────────────────
//

export default function ForgotPassword() {

  const router = useRouter();

  const [email, setEmail] = useState('');
  const [emailFocused, setEmailFocused] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  const handleEmailChange = (text: string) => {
    setEmail(text);

    // AUTO REMOVE ERROR
    if (error) {
      setError('');
    }
  };

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

    try {

      setLoading(true);

      setTimeout(() => {
        setLoading(false);
        // setSent(true);  ← remove this
        router.push({
            pathname: '/(auth)/verify-otp',
            params: {
            email,
            purpose: 'reset',
            },
        });
        }, 1500);

    } catch (err: any) {

      setLoading(false);

      setError(
        err.message || 'Failed to send OTP. Please try again.'
      );
    }
  };

  const handleContinue = () => {
    router.push({
      pathname: '/(auth)/verify-otp',
      params: {
        email,
        purpose: 'reset',
      },
    });
  };

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
            <MailIcon />
          </View>

          {/* TITLE */}
          <Text style={styles.heading}>
            Forgot Password?
          </Text>

          {!sent ? (
            <>
              {/* INPUT */}
              <View style={styles.formGroup}>

                <Text style={styles.label}>
                  Email Address
                </Text>

                <View
                  style={[
                    styles.inputWrap,
                    emailFocused && styles.inputWrapFocused,
                    error && styles.inputWrapError,
                  ]}
                >

                  <TextInput
                    style={styles.input}
                    placeholder="you@example.com"
                    placeholderTextColor="#b8c0d4"
                    value={email}
                    onChangeText={handleEmailChange}
                    onFocus={() => setEmailFocused(true)}
                    onBlur={() => setEmailFocused(false)}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />

                </View>

                {/* PERFECT ERROR POSITION */}
                {error ? (
                  <Text style={styles.errorText}>
                    {error}
                  </Text>
                ) : null}

              </View>

              {/* BUTTON */}
              <TouchableOpacity
                style={[
                  styles.btnSend,
                  loading && styles.btnDisabled,
                ]}
                onPress={handleSendOTP}
                activeOpacity={0.9}
                disabled={loading}
              >

                {loading ? (
                  <ActivityIndicator
                    color="#ffffff"
                    size="small"
                  />
                ) : (
                  <Text style={styles.btnSendText}>
                    Send OTP Code
                  </Text>
                )}

              </TouchableOpacity>
            </>
          ) : (
            <>
              {/* SUCCESS */}
              <View style={styles.successBox}>

                <View style={styles.successIcon}>

                  <Svg
                    width={24}
                    height={24}
                    viewBox="0 0 24 24"
                    fill="none"
                  >

                    <Path
                      d="M20 6L9 17l-5-5"
                      stroke="#4c6fff"
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />

                  </Svg>

                </View>

                <Text style={styles.successTitle}>
                  Email Sent!
                </Text>

                <Text style={styles.successText}>
                  We sent a reset code to{'\n'}

                  <Text style={styles.successEmail}>
                    {email}
                  </Text>
                </Text>

              </View>

              <TouchableOpacity
                style={styles.btnSend}
                onPress={handleContinue}
              >
                <Text style={styles.btnSendText}>
                  Enter Reset Code
                </Text>
              </TouchableOpacity>
            </>
          )}

          {/* SIGN IN */}
          <View style={styles.signinWrap}>

            <Text style={styles.signinText}>
              Remember your password?
            </Text>

            <TouchableOpacity
              onPress={() => router.push('/(auth)/signin')}
            >
              <Text style={styles.signinLink}>
                Sign In
              </Text>
            </TouchableOpacity>

          </View>

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
    paddingBottom: 34,

    width: '100%',
    maxWidth: 430,

    shadowColor: '#1e293b',
    shadowOffset: {
      width: 0,
      height: 12,
    },
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
    fontFamily:
      Platform.OS === 'ios'
        ? 'Georgia'
        : 'serif',

    fontSize: 22,
    fontWeight: '700',
    color: '#1a1f36',
    textAlign: 'center',
    letterSpacing: -0.6,
    marginBottom: 30,
    marginTop: -6,
  },

  formGroup: {
    marginBottom: 8,
  },

  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4a5568',
    marginBottom: 8,
  },

  inputWrap: {
    borderWidth: 1.5,
    borderColor: '#dde3fa',

    borderRadius: 14,

    backgroundColor: '#f8faff',

    flexDirection: 'row',
    alignItems: 'center',
  },

  inputWrapFocused: {
    borderColor: '#4c6fff',

    backgroundColor: '#ffffff',

    shadowColor: '#4c6fff',
    shadowOffset: {
      width: 0,
      height: 0,
    },

    shadowOpacity: 0.16,
    shadowRadius: 10,

    elevation: 4,
  },

  inputWrapError: {
    borderColor: '#ef4444',
  },

  input: {
    flex: 1,

    paddingHorizontal: 16,

    paddingVertical:
      Platform.OS === 'ios'
        ? 15
        : 13,

    fontSize: 15,

    color: '#1a1f36',
  },

  errorText: {
    fontSize: 12,
    color: '#ef4444',
    marginTop: 8,
    marginLeft: 4,
    fontWeight: '500',
  },

  btnSend: {
    backgroundColor: '#4c6fff',

    borderRadius: 14,

    paddingVertical: 16,

    alignItems: 'center',

    marginTop: 18,

    shadowColor: '#4c6fff',

    shadowOffset: {
      width: 0,
      height: 10,
    },

    shadowOpacity: 0.32,
    shadowRadius: 20,

    elevation: 8,
  },

  btnDisabled: {
    opacity: 0.75,
  },

  btnSendText: {
    color: '#ffffff',

    fontSize: 15,
    fontWeight: '700',

    letterSpacing: 0.3,
  },

  successBox: {
    alignItems: 'center',

    backgroundColor: '#f4f7ff',

    borderRadius: 18,

    padding: 24,

    marginBottom: 22,

    borderWidth: 1,
    borderColor: '#dde5ff',
  },

  successIcon: {
    width: 56,
    height: 56,

    borderRadius: 28,

    backgroundColor: '#e6ecff',

    alignItems: 'center',
    justifyContent: 'center',

    marginBottom: 14,
  },

  successTitle: {
    fontSize: 20,
    fontWeight: '700',

    color: '#1a1f36',

    marginBottom: 10,
  },

  successText: {
    fontSize: 14,

    color: '#7f8bb3',

    textAlign: 'center',

    lineHeight: 22,
  },

  successEmail: {
    color: '#4c6fff',
    fontWeight: '700',
  },

  signinWrap: {
    flexDirection: 'row',

    justifyContent: 'center',
    alignItems: 'center',

    marginTop: 22,
  },

  signinText: {
    fontSize: 13,
    color: '#8896b3',
  },

  signinLink: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1a1f36',
    marginLeft: 4,
  },

});