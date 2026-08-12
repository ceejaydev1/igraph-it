import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Pressable,
  Modal,
  ScrollView as ModalScroll,
  useWindowDimensions,
} from 'react-native';
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
  ToastAndroid,
  Alert,
  Animated,
  Easing,
} from 'react-native';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { initializeApp, FirebaseApp, getApps } from 'firebase/app';
import {
  getAuth,
  Auth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  setPersistence,
  browserSessionPersistence,
} from 'firebase/auth';
import {
  Svg,
  Circle,
  Rect,
  Path,
  Defs,
  LinearGradient,
  Stop,
} from 'react-native-svg';

import * as authService from '../../services/authService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { markNewUserForOnboarding } from '../../utils/onboardingTour';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// ─── RESPONSIVE LOGO SIZE ─────────────────────────────────────────────────────

const getResponsiveLogoSize = (windowWidth: number, windowHeight: number): number => {
  if (windowHeight < 680) {
    if (Platform.OS === 'web') {
      if (windowWidth < 480) return 36;
      if (windowWidth < 768) return 40;
      return 48;
    }
    return 38;
  }
  if (Platform.OS === 'web') {
    if (windowWidth < 480) return 42;
    if (windowWidth < 768) return 48;
    // Capped here rather than continuing to scale up with viewport width —
    // the card itself stops growing past maxWidth: 400 (see styles.cardOuter),
    // so a logo that kept scaling with the window made it proportionally
    // bigger against that fixed card the wider the screen got, instead of
    // staying visually consistent with how it reads on mobile.
    return 52;
  }
  if (Platform.OS === 'ios') return 44;
  if (Platform.OS === 'android') return 42;
  return 44;
};

const AnimatedLogo = ({
  size,
  isInputFocused = false,
  showSuccess = false,
  onAnimationComplete,
}: {
  size?: number;
  isInputFocused?: boolean;
  showSuccess?: boolean;
  onAnimationComplete?: () => void;
}) => {
  const entranceAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const pulseLoop = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    Animated.parallel([
      Animated.spring(entranceAnim, {
        toValue: 1,
        friction: 6,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 600,
        easing: Easing.out(Easing.back(0.5)),
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  useEffect(() => {
    if (showSuccess) {
      if (pulseLoop.current) {
        pulseLoop.current.stop();
        pulseLoop.current = null;
      }
      Animated.sequence([
        Animated.spring(pulseAnim, { toValue: 1.3, friction: 2, tension: 60, useNativeDriver: true }),
        Animated.spring(pulseAnim, { toValue: 1, friction: 4, tension: 40, useNativeDriver: true }),
        Animated.spring(pulseAnim, { toValue: 1.1, friction: 3, tension: 50, useNativeDriver: true }),
        Animated.spring(pulseAnim, { toValue: 1, friction: 5, useNativeDriver: true }),
      ]).start(() => {
        if (onAnimationComplete) onAnimationComplete();
      });
    } else if (isInputFocused) {
      pulseLoop.current = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.05, duration: 800, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
        ])
      );
      pulseLoop.current.start();
    } else {
      if (pulseLoop.current) {
        pulseLoop.current.stop();
        pulseLoop.current = null;
      }
      pulseAnim.setValue(1);
    }


    return () => {
      if (pulseLoop.current) {
        pulseLoop.current.stop();
        pulseLoop.current = null;
      }
    };
  }, [isInputFocused, showSuccess]);

  const scale = entranceAnim.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1] });
  const rotate = rotateAnim.interpolate({ inputRange: [0, 1], outputRange: ['-13deg', '-8deg'] });
  const opacity = entranceAnim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 0.5, 1] });
  const finalSize = size || 44;

  const padding = finalSize * 0.25;
  const containerSize = finalSize + (padding * 2);
  const borderRadius = containerSize * 0.22;

  return (
    <Animated.View
      style={[
        styles.logoWrapper,
        {
          opacity,
          transform: [{ scale }, { scale: pulseAnim }, { rotate }],
          width: containerSize,
          height: containerSize,
          borderRadius: borderRadius,
          backgroundColor: '#eef2ff',
          borderWidth: Platform.OS === 'web' ? 2.5 : 2,
          borderColor: '#3b5bdb',
          shadowColor: '#3b5bdb',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.15,
          shadowRadius: 8,
          elevation: 5,
        }
      ]}
    >
      <Image
        source={require('../../assets/images/logo1.png')}
        style={[
          styles.logo,
          {
            width: finalSize,
            height: finalSize,
            borderRadius: finalSize * 0.22,
          }
        ]}
        resizeMode="contain"
      />
    </Animated.View>
  );
};

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID
};

let firebaseApp: FirebaseApp | undefined;
let auth: Auth | undefined;

if (Platform.OS === 'web' && typeof window !== 'undefined') {
  try {
    if (!getApps().length) {
      firebaseApp = initializeApp(firebaseConfig);
    } else {
      firebaseApp = getApps()[0];
    }
    auth = getAuth(firebaseApp);
  } catch (e: any) {
    console.error('[Firebase] Init error:', e.message);
  }
}

//ERROR POPUP
const ErrorPopupModal = ({
  visible,
  title,
  message,
  onClose,
  onAction,
  actionButtonText,
  actionIcon,
}: {
  visible: boolean;
  title: string;
  message: string;
  onClose: () => void;
  onAction?: () => void;
  actionButtonText?: string;
  actionIcon?: React.ReactNode;
}) => {
  return (
    <Modal animationType="fade" transparent={true} visible={visible} onRequestClose={onClose}>
      <TouchableOpacity style={styles.errorModalOverlay} activeOpacity={1} onPress={onClose}>
        <View style={styles.errorModalContainer}>
          <View style={styles.errorModalIconWrapper}>
            <View style={styles.errorModalIconCircle}>
              <Svg width={28} height={28} viewBox="0 0 24 24" fill="none">
                <Circle cx="12" cy="12" r="10" stroke="#3b5bdb" strokeWidth="1.5" />
                <Path d="M12 8v4M12 16h.01" stroke="#3b5bdb" strokeWidth="2" strokeLinecap="round" />
              </Svg>
            </View>
          </View>
          <Text style={styles.errorModalTitle}>{title}</Text>
          <Text style={styles.errorModalMessage}>{message}</Text>
          {onAction ? (
            <TouchableOpacity style={styles.errorModalButtonPrimary} onPress={() => { onClose(); onAction(); }}>
              {actionIcon && <View style={{ marginRight: 8 }}>{actionIcon}</View>}
              <Text style={styles.errorModalButtonTextPrimary}>{actionButtonText || 'Continue'}</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.errorModalButtonPrimary} onPress={onClose}>
              <Text style={styles.errorModalButtonTextPrimary}>OK</Text>
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

//SUCCESS MODAL
const SuccessModal = ({
  visible,
  title,
  message,
  onClose,
  buttonText = 'Continue',
}: {
  visible: boolean;
  title: string;
  message: string;
  onClose: () => void;
  buttonText?: string;
}) => {
  return (
    <Modal animationType="fade" transparent={true} visible={visible} onRequestClose={onClose}>
      <TouchableOpacity style={styles.errorModalOverlay} activeOpacity={1} onPress={onClose}>
        <View style={styles.errorModalContainer}>
          <View style={styles.errorModalIconWrapper}>
            <View style={[styles.errorModalIconCircle, { backgroundColor: '#d1fae5' }]}>
              <Svg width={28} height={28} viewBox="0 0 24 24" fill="none">
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

// LINK GOOGLE ACCOUNT MODAL
// Shown when Google sign-in matches an email that already has a
// password-based account — confirming that password proves ownership
// before Google is allowed to sign into it going forward.
const LinkGoogleModal = ({
  visible,
  email,
  password,
  onChangePassword,
  showPassword,
  onToggleShowPassword,
  error,
  loading,
  onCancel,
  onConfirm,
}: {
  visible: boolean;
  email: string;
  password: string;
  onChangePassword: (text: string) => void;
  showPassword: boolean;
  onToggleShowPassword: () => void;
  error: string;
  loading: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) => {
  return (
    <Modal animationType="fade" transparent visible={visible} onRequestClose={onCancel}>
      <TouchableOpacity style={styles.errorModalOverlay} activeOpacity={1} onPress={onCancel}>
        <TouchableOpacity activeOpacity={1} style={styles.errorModalContainer} onPress={() => {}}>
          <View style={styles.errorModalIconWrapper}>
            <View style={styles.errorModalIconCircle}>
              <Svg width={28} height={28} viewBox="0 0 24 24" fill="none">
                <Path d="M12 15v2m-6 3h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zM8 11V8a4 4 0 118 0v3" stroke="#3b5bdb" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </Svg>
            </View>
          </View>
          <Text style={styles.errorModalTitle}>Link Your Google Account</Text>
          <Text style={styles.errorModalMessage}>
            {email || 'This email'} already has a password-protected account. Enter its password to also sign in with Google from now on.
          </Text>

          <View style={[styles.formGroup, { width: '100%' }]}>
            <View style={[styles.inputWrap, error && styles.inputError]}>
              <TextInput
                style={[styles.input, styles.inputWithIcon]}
                placeholder="Enter your password"
                placeholderTextColor="#b8c0d4"
                value={password}
                onChangeText={onChangePassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                editable={!loading}
                autoFocus
                onSubmitEditing={onConfirm}
                returnKeyType="done"
              />
              <TouchableOpacity style={styles.eyeBtn} onPress={onToggleShowPassword} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <EyeIcon visible={showPassword} />
              </TouchableOpacity>
            </View>
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
          </View>

          <TouchableOpacity
            style={[styles.errorModalButtonPrimary, loading && { opacity: 0.7 }]}
            onPress={onConfirm}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#ffffff" size="small" />
            ) : (
              <Text style={styles.errorModalButtonTextPrimary}>Link Account</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity style={styles.linkGoogleCancelBtn} onPress={onCancel} disabled={loading}>
            <Text style={styles.linkGoogleCancelText}>Cancel</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};

// ─── BACKGROUND ─────────────────────────────────────────────────────────────

const DiagramBackground = () => (
  <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
    <Svg width="100%" height="100%" viewBox={`0 0 ${SCREEN_WIDTH} ${SCREEN_HEIGHT}`} preserveAspectRatio="xMidYMid slice" style={StyleSheet.absoluteFillObject}>
      <Defs>
        <LinearGradient id="bgWash" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor="#e8edff" stopOpacity="1" />
          <Stop offset="55%" stopColor="#eef2ff" stopOpacity="1" />
          <Stop offset="100%" stopColor="#e3e9ff" stopOpacity="1" />
        </LinearGradient>
        <LinearGradient id="blobTopRight" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor="#c7d2fe" stopOpacity="0.55" />
          <Stop offset="100%" stopColor="#c7d2fe" stopOpacity="0" />
        </LinearGradient>
        <LinearGradient id="blobBottomLeft" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor="#b6c2ff" stopOpacity="0.45" />
          <Stop offset="100%" stopColor="#b6c2ff" stopOpacity="0" />
        </LinearGradient>
      </Defs>

      <Rect x="0" y="0" width={SCREEN_WIDTH} height={SCREEN_HEIGHT} fill="url(#bgWash)" />
      <Circle cx={SCREEN_WIDTH * 0.9} cy={SCREEN_HEIGHT * 0.08} r={SCREEN_WIDTH * 0.55} fill="url(#blobTopRight)" />
      <Circle cx={SCREEN_WIDTH * 0.05} cy={SCREEN_HEIGHT * 0.95} r={SCREEN_WIDTH * 0.5} fill="url(#blobBottomLeft)" />
    </Svg>

    <Image source={require('../../assets/images/grid-bg.png')} style={styles.gridBackground} resizeMode="repeat" />
    <View style={styles.gridOverlay} />

    <Svg width="100%" height="100%" viewBox={`0 0 ${SCREEN_WIDTH} ${SCREEN_HEIGHT}`} preserveAspectRatio="xMidYMid slice" style={StyleSheet.absoluteFillObject}>

      {/* ── Mini class diagram (top-left): name / attributes / methods ── */}
      <Rect x={SCREEN_WIDTH * 0.06} y={SCREEN_HEIGHT * 0.09} width="118" height="88" rx="6" stroke="#a9b8ff" strokeWidth="1.5" fill="#ffffff" fillOpacity="0.4" opacity="0.55" />
      <Path d={`M ${SCREEN_WIDTH * 0.06} ${SCREEN_HEIGHT * 0.09 + 26} h 118`} stroke="#a9b8ff" strokeWidth="1.5" opacity="0.55" />
      <Path d={`M ${SCREEN_WIDTH * 0.06} ${SCREEN_HEIGHT * 0.09 + 58} h 118`} stroke="#a9b8ff" strokeWidth="1.5" opacity="0.55" />
      <Rect x={SCREEN_WIDTH * 0.06 + 10} y={SCREEN_HEIGHT * 0.09 + 10} width="54" height="7" rx="3" fill="#a9b8ff" opacity="0.5" />
      <Rect x={SCREEN_WIDTH * 0.06 + 10} y={SCREEN_HEIGHT * 0.09 + 35} width="40" height="5" rx="2.5" fill="#c3cdff" opacity="0.5" />
      <Rect x={SCREEN_WIDTH * 0.06 + 10} y={SCREEN_HEIGHT * 0.09 + 45} width="60" height="5" rx="2.5" fill="#c3cdff" opacity="0.5" />
      <Rect x={SCREEN_WIDTH * 0.06 + 10} y={SCREEN_HEIGHT * 0.09 + 67} width="48" height="5" rx="2.5" fill="#c3cdff" opacity="0.5" />
      <Rect x={SCREEN_WIDTH * 0.06 + 10} y={SCREEN_HEIGHT * 0.09 + 77} width="56" height="5" rx="2.5" fill="#c3cdff" opacity="0.5" />

      {/* Association line + multiplicity dot toward the ERD entity */}
      <Path d={`M ${SCREEN_WIDTH * 0.06 + 118} ${SCREEN_HEIGHT * 0.09 + 44} C ${SCREEN_WIDTH * 0.34} ${SCREEN_HEIGHT * 0.05}, ${SCREEN_WIDTH * 0.58} ${SCREEN_HEIGHT * 0.12}, ${SCREEN_WIDTH * 0.72} ${SCREEN_HEIGHT * 0.13 + 35}`} stroke="#a9b8ff" strokeWidth="1.5" fill="none" opacity="0.45" />
      <Circle cx={SCREEN_WIDTH * 0.06 + 122} cy={SCREEN_HEIGHT * 0.09 + 44} r="2.5" fill="#a9b8ff" opacity="0.5" />

      {/* ── ERD entity (upper-right): rectangle with header row ── */}
      <Rect x={SCREEN_WIDTH * 0.72} y={SCREEN_HEIGHT * 0.13} width="132" height="70" rx="6" stroke="#a9b8ff" strokeWidth="1.5" fill="#ffffff" fillOpacity="0.4" opacity="0.5" />
      <Path d={`M ${SCREEN_WIDTH * 0.72} ${SCREEN_HEIGHT * 0.13 + 22} h 132`} stroke="#a9b8ff" strokeWidth="1.5" opacity="0.5" />
      <Rect x={SCREEN_WIDTH * 0.72 + 10} y={SCREEN_HEIGHT * 0.13 + 8} width="50" height="6" rx="3" fill="#a9b8ff" opacity="0.5" />
      <Circle cx={SCREEN_WIDTH * 0.72 + 12} cy={SCREEN_HEIGHT * 0.13 + 34} r="2" fill="#c3cdff" opacity="0.6" />
      <Rect x={SCREEN_WIDTH * 0.72 + 20} y={SCREEN_HEIGHT * 0.13 + 31} width="46" height="5" rx="2.5" fill="#c3cdff" opacity="0.5" />
      <Circle cx={SCREEN_WIDTH * 0.72 + 12} cy={SCREEN_HEIGHT * 0.13 + 48} r="2" fill="#c3cdff" opacity="0.6" />
      <Rect x={SCREEN_WIDTH * 0.72 + 20} y={SCREEN_HEIGHT * 0.13 + 45} width="58" height="5" rx="2.5" fill="#c3cdff" opacity="0.5" />

      {/* ── Use-case oval + actor stick figure (lower-left) ── */}
      <Circle cx={SCREEN_WIDTH * 0.10} cy={SCREEN_HEIGHT * 0.60} r="4.5" stroke="#a9b8ff" strokeWidth="1.6" fill="none" opacity="0.5" />
      <Path d={`M ${SCREEN_WIDTH * 0.10} ${SCREEN_HEIGHT * 0.60 + 4.5} v 16 M ${SCREEN_WIDTH * 0.10 - 8} ${SCREEN_HEIGHT * 0.60 + 12} h 16 M ${SCREEN_WIDTH * 0.10} ${SCREEN_HEIGHT * 0.60 + 20.5} l -7 12 M ${SCREEN_WIDTH * 0.10} ${SCREEN_HEIGHT * 0.60 + 20.5} l 7 12`} stroke="#a9b8ff" strokeWidth="1.6" fill="none" opacity="0.5" />
      <Path d={`M ${SCREEN_WIDTH * 0.10 + 12} ${SCREEN_HEIGHT * 0.60 + 12} L ${SCREEN_WIDTH * 0.24} ${SCREEN_HEIGHT * 0.60 + 6}`} stroke="#a9b8ff" strokeWidth="1.5" strokeDasharray="5 6" opacity="0.45" />
      <Path d={`M ${SCREEN_WIDTH * 0.24} ${SCREEN_HEIGHT * 0.60 + 6} m -22, 0 a 22,13 0 1,0 44,0 a 22,13 0 1,0 -44,0`} stroke="#a9b8ff" strokeWidth="1.5" fill="#ffffff" fillOpacity="0.35" opacity="0.5" />

      {/* ── Flowchart bits (lower-right): decision diamond + terminator ── */}
      <Path d={`M ${SCREEN_WIDTH * 0.80} ${SCREEN_HEIGHT * 0.66} L ${SCREEN_WIDTH * 0.80 + 20} ${SCREEN_HEIGHT * 0.66 + 14} L ${SCREEN_WIDTH * 0.80} ${SCREEN_HEIGHT * 0.66 + 28} L ${SCREEN_WIDTH * 0.80 - 20} ${SCREEN_HEIGHT * 0.66 + 14} Z`} stroke="#a9b8ff" strokeWidth="1.5" fill="#ffffff" fillOpacity="0.35" opacity="0.5" />
      <Path d={`M ${SCREEN_WIDTH * 0.80} ${SCREEN_HEIGHT * 0.66 + 28} v 22`} stroke="#a9b8ff" strokeWidth="1.5" strokeDasharray="4 5" opacity="0.4" />
      <Rect x={SCREEN_WIDTH * 0.80 - 30} y={SCREEN_HEIGHT * 0.66 + 50} width="60" height="24" rx="12" stroke="#a9b8ff" strokeWidth="1.5" fill="#ffffff" fillOpacity="0.35" opacity="0.5" />

      {/* Faint sequence-diagram lifeline for balance, center-right */}
      <Path d={`M ${SCREEN_WIDTH * 0.90} ${SCREEN_HEIGHT * 0.35} v 90`} stroke="#bfd0ff" strokeWidth="1.4" strokeDasharray="3 6" opacity="0.35" />
      <Rect x={SCREEN_WIDTH * 0.90 - 26} y={SCREEN_HEIGHT * 0.35} width="52" height="18" rx="4" stroke="#bfd0ff" strokeWidth="1.4" fill="none" opacity="0.35" />
    </Svg>
  </View>
);

const EyeIcon = ({ visible }: { visible: boolean }) => (
  <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
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

const GoogleIcon = () => (
  <Svg width={16} height={16} viewBox="0 0 24 24">
    <Path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
    <Path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
    <Path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
    <Path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
  </Svg>
);

const EmailIcon = () => (
  <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
    <Path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" stroke="#ffffff" strokeWidth={1.5} fill="none"/>
    <Path d="M22 6l-10 7L2 6" stroke="#ffffff" strokeWidth={1.5} fill="none"/>
  </Svg>
);

WebBrowser.maybeCompleteAuthSession();

const SplashScreen = () => (
  <View style={styles.splashContainer}>
    <ActivityIndicator size="large" color="#3b5bdb" />
  </View>
);

const saveRememberMe = async (email: string, remember: boolean) => {
  if (remember && email) {
    await AsyncStorage.setItem('rememberedEmail', email);
    await AsyncStorage.setItem('rememberMe', 'true');
  } else if (!remember) {
    await AsyncStorage.removeItem('rememberedEmail');
    await AsyncStorage.setItem('rememberMe', 'false');
  }
};

const loadRememberedEmail = async () => {
  try {
    const remember = await AsyncStorage.getItem('rememberMe');
    if (remember === 'true') {
      const email = await AsyncStorage.getItem('rememberedEmail');
      return email || '';
    }
  } catch (error) {
    console.log('Error loading remembered email:', error);
  }
  return '';
};

//THE MAIN COMPONENT

export default function SignIn() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();

  // NOTE: `initialLoading` gate was removed. It previously made this screen
  // render `null` while an async session check resolved, causing a blank
  // frame -> abrupt pop-in "flick" when navigating here from signup.tsx
  // (which has no such gate). The session check below now runs in the
  // background and only redirects if a valid session is found; it no
  // longer blocks the initial render, so signin.tsx mounts its UI
  // immediately just like signup.tsx does.
  const [email, setEmail] = useState((params.prefilledEmail as string) || '');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  // Defaults to checked: without it, web sessions live in sessionStorage and
  // vanish the moment the tab closes, so a user who signs in and closes the
  // tab without explicitly signing out gets bounced back to sign-in on
  // reopen instead of resuming where they left off. Defaulting to persistent
  // (localStorage) matches what most users expect; unchecking it is still
  // there for anyone on a shared/lab machine who wants session-only auth.
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false);
  const [errors, setErrors] = useState({ email: '', password: '' });
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorModalData, setErrorModalData] = useState({
    title: '',
    message: '',
    onAction: undefined as (() => void) | undefined,
    actionButtonText: '',
    actionIcon: undefined as React.ReactNode | undefined,
  });

  // ─── Link Google to an existing email/password account ──────────────────
  // Shown when googleAuth comes back with LINK_PASSWORD_REQUIRED: this
  // email already has a password account, so we ask for that password
  // before letting Google sign into it.
  const [showLinkGoogleModal, setShowLinkGoogleModal] = useState(false);
  const [linkGooglePassword, setLinkGooglePassword] = useState('');
  const [linkGoogleShowPassword, setLinkGoogleShowPassword] = useState(false);
  const [linkGoogleLoading, setLinkGoogleLoading] = useState(false);
  const [linkGoogleError, setLinkGoogleError] = useState('');
  const pendingGoogleIdTokenRef = useRef<string | null>(null);
  const pendingGoogleEmailRef = useRef<string>('');

  // Card entrance animation
  const cardOpacity = useRef(new Animated.Value(0)).current;
  const cardTranslateY = useRef(new Animated.Value(20)).current;
  const [isAnimatingOut, setIsAnimatingOut] = useState(false);

  const passwordRef = useRef<TextInput>(null);
  const googleSignInInProgress = useRef(false);
  const logoSize = getResponsiveLogoSize(windowWidth, windowHeight);
  const isSmallScreen = windowHeight < 680;

  useEffect(() => {
    // Only animate entrance if not coming from signup (no prefilledEmail means fresh load)
    const hasPrefilledEmail = params.prefilledEmail !== undefined;

    if (hasPrefilledEmail) {
      // Coming from signup - skip entrance animation, set directly
      cardOpacity.setValue(1);
      cardTranslateY.setValue(0);
    } else {
      // Fresh load - animate entrance
      Animated.parallel([
        Animated.timing(cardOpacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(cardTranslateY, {
          toValue: 0,
          duration: 400,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();
    }

    const loadEmail = async () => {
      const remembered = await loadRememberedEmail();
      if (remembered) {
        setEmail(remembered);
        setRememberMe(true);
      }
    };
    loadEmail();
  }, []);

  useEffect(() => {
    const handleRedirectResult = async () => {
      if (!auth) return;
      try {
        const result = await getRedirectResult(auth);
        if (result) {
          setLoading(true);
          const idToken = await result.user.getIdToken();
          const apiResult = await authService.googleAuth(idToken);
          if (apiResult.success) {
            if (apiResult.data?.isNewUser) markNewUserForOnboarding();
            setShowSuccessAnimation(true);
            setTimeout(() => { router.replace('/(tabs)/home'); }, 400);
          } else {
            await auth.signOut();
            showErrorPopup('Sign In Failed', apiResult.message || 'Google sign in failed');
          }
          setLoading(false);
        }
      } catch (error: any) {
        console.error('Redirect result error:', error);
        setLoading(false);
      }
    };
    handleRedirectResult();
  }, [auth, router]);

  // Background session check — no longer gates the initial render.
  // If a valid session exists, redirect; otherwise do nothing and let the
  // form stay visible (it was already rendered on mount). Prefers the saved
  // lastRoute over home — same validation guard as app/index.tsx, so a
  // corrupt/stale value falls back to home instead of an invalid href.
  useEffect(() => {
    const checkExistingSession = async () => {
      try {
        // No token-presence pre-check — web's session lives in an httpOnly
        // cookie this code can never read, so verifyToken() is called
        // unconditionally and applies its own per-platform fast-path.
        const response = await authService.verifyToken();
        if (response.success) {
          const savedRoute = await authService.getLastRoute();
          const isValidSavedRoute = typeof savedRoute === 'string' && savedRoute.startsWith('/(tabs)');
          router.replace((isValidSavedRoute ? savedRoute : '/(tabs)/home') as any);
        }
      } catch (error) {
        console.log('No valid session found');
      }
    };
    checkExistingSession();
  }, [router]);

  //HANDLERS
  const openPrivacyPage = useCallback(() => {
    router.push('/(auth)/privacy1');
  }, [router]);

  const showErrorPopup = (title: string, message: string, onAction?: () => void, actionButtonText?: string, actionIcon?: React.ReactNode) => {
    setErrorModalData({ title, message, onAction, actionButtonText: actionButtonText || '', actionIcon });
    setShowErrorModal(true);
  };

  const showToastMessage = (message: string, isError: boolean = false) => {
    if (Platform.OS === 'android') {
      ToastAndroid.show(message, ToastAndroid.SHORT);
    } else if (Platform.OS === 'ios') {
      Alert.alert(isError ? 'Error' : 'Success', message);
    } else {
      console.log(message);
      if (isError) Alert.alert('Error', message);
    }
  };

  // Smooth navigation to sign up
  const navigateToSignUp = useCallback(() => {
    if (isAnimatingOut) return;
    setIsAnimatingOut(true);

    Animated.parallel([
      Animated.timing(cardOpacity, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(cardTranslateY, {
        toValue: -20,
        duration: 150,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start(() => {
      router.push({
        pathname: '/(auth)/signup',
        params: email ? { prefilledEmail: email } : {}
      });
    });
  }, [cardOpacity, cardTranslateY, router, email, isAnimatingOut]);

  //GOOGLE SIGN IN
  const handleFirebaseGoogleSignIn = async () => {
    if (!auth) {
      showErrorPopup('Error', 'Firebase auth not available on this platform');
      return;
    }

    if (googleSignInInProgress.current) return;
    googleSignInInProgress.current = true;
    authService.pingBackend?.(); // Wake up free-tier backend while the user picks an account

    // No spinner while the popup is open — the user is still choosing/cancelling.
    // Only show loading once an account is actually selected (result resolves).
    //
    // Firebase can take several seconds to reject signInWithPopup after the user
    // manually closes it (it polls for closure rather than detecting it instantly).
    // Closing the popup hands focus back to this window almost immediately, so use
    // that as a fast signal to unblock the button instead of waiting on Firebase.
    let settled = false;
    let unstickTimer: ReturnType<typeof setTimeout> | undefined;
    const handleWindowFocus = () => {
      unstickTimer = setTimeout(() => {
        if (!settled) googleSignInInProgress.current = false;
      }, 300);
    };
    window.addEventListener('focus', handleWindowFocus);
    const stopWatchingFocus = () => {
      settled = true;
      clearTimeout(unstickTimer);
      window.removeEventListener('focus', handleWindowFocus);
    };

    try {
      const provider = new GoogleAuthProvider();
      provider.addScope('email');
      provider.addScope('profile');
      // 'select_account' silently lets Firebase pick whichever Google account
      // is already signed into this browser session — on a shared machine
      // that's how one student ends up authenticated as whoever used it
      // last. 'login' forces an actual re-authentication step every time.
      provider.setCustomParameters({ prompt: 'login' });

      const result = await signInWithPopup(auth, provider);
      stopWatchingFocus();
      setLoading(true);
      const idToken = await result.user.getIdToken();
      // Kept in refs (not local consts) so the catch block below — a
      // separate lexical scope — can still reach them if googleAuth throws.
      pendingGoogleIdTokenRef.current = idToken;
      pendingGoogleEmailRef.current = result.user.email || '';
      const apiResult = await authService.googleAuth(idToken);

      if (apiResult.success) {
        if (apiResult.data?.isNewUser) markNewUserForOnboarding();
        setShowSuccessAnimation(true);
        setTimeout(() => { router.replace('/(tabs)/home'); }, 400);
      } else {
        await auth.signOut();
        const msg = apiResult.message || '';
        if (msg.toLowerCase().includes('already registered') ||
            msg.toLowerCase().includes('already exists') ||
            msg.toLowerCase().includes('email/password')) {
          const googleEmail = result.user.email || '';
          if (googleEmail) setEmail(googleEmail);
          showErrorPopup(
            'Account Already Exists',
            'This email is already registered with email/password. Please sign in using your email and password instead.',
            () => passwordRef.current?.focus(),
            'Sign In with Email/Password',
            <EmailIcon />
          );
        } else {
          showErrorPopup('Sign In Failed', msg || 'Google sign in failed. Please try again.');
        }
      }
    } catch (error: any) {
      stopWatchingFocus();
      console.error('Google Sign-In error:', error);
      if (error.response?.data?.code === 'LINK_PASSWORD_REQUIRED') {
        setLinkGoogleError('');
        setLinkGooglePassword('');
        setShowLinkGoogleModal(true);
      } else if (error.response?.status === 409) {
        const errorMsg = error.response?.data?.message || '';
        showErrorPopup(
          'Account Already Exists',
          errorMsg || 'This email is already registered with email/password.',
          () => passwordRef.current?.focus(),
          'Sign In with Email/Password',
          <EmailIcon />
        );
      } else if (error.code === 'auth/popup-closed-by-user' || error.code === 'auth/cancelled-popup-request') {
        // User cancelled, or this attempt was superseded by a fresh click — no spinner, nothing to show
      } else if (error.code === 'auth/popup-blocked') {
        showErrorPopup('Popup Blocked', 'Please allow popups for this website to sign in with Google.', undefined, 'OK');
      } else if (error.code === 'auth/network-request-failed') {
        showErrorPopup('Network Error', 'Unable to reach Google servers. Please check your internet connection.', undefined, 'OK');
      } else if (error.code === 'auth/internal-error' || error.message?.includes('Failed to fetch')) {
        showErrorPopup('Google Sign In Unavailable', 'Google Sign-In is currently unavailable. Please use email/password to sign in instead.', undefined, 'OK');
      } else if (error.code === 'ECONNABORTED' || error.message?.toLowerCase().includes('timeout')) {
        showErrorPopup('Server Waking Up', 'Our server is starting up after being idle. Please try signing in with Google again in a few seconds.', undefined, 'OK');
      } else {
        showErrorPopup('Google Sign In Failed', error.message || 'Something went wrong. Please try again.', undefined, 'OK');
      }
    } finally {
      googleSignInInProgress.current = false;
      setLoading(false);
    }
  };

  const closeLinkGoogleModal = () => {
    if (linkGoogleLoading) return;
    setShowLinkGoogleModal(false);
    setLinkGooglePassword('');
    setLinkGoogleShowPassword(false);
    setLinkGoogleError('');
    pendingGoogleIdTokenRef.current = null;
  };

  const handleConfirmLinkGoogle = async () => {
    if (linkGoogleLoading) return;
    if (!linkGooglePassword) {
      setLinkGoogleError('Please enter your password.');
      return;
    }
    const idToken = pendingGoogleIdTokenRef.current;
    if (!idToken) {
      setLinkGoogleError('Your Google session expired — please try Sign in with Google again.');
      return;
    }

    setLinkGoogleLoading(true);
    setLinkGoogleError('');

    try {
      const result = await authService.linkGoogleAccount(idToken, linkGooglePassword, rememberMe);
      if (result.success) {
        setShowLinkGoogleModal(false);
        setShowSuccessAnimation(true);
        setTimeout(() => { router.replace('/(tabs)/home'); }, 400);
      } else {
        setLinkGoogleError(result.message || 'Could not link your Google account.');
      }
    } catch (error: any) {
      if (error.response?.status === 401) {
        setLinkGoogleError('Incorrect password.');
      } else {
        setLinkGoogleError(error.response?.data?.message || 'Could not link your Google account. Please try again.');
      }
    } finally {
      setLinkGoogleLoading(false);
    }
  };

  //EMAIL & PASSWORD SIGNIN
  const handleSignIn = async () => {
    const newErrors = { email: '', password: '' };

    if (!email) newErrors.email = 'Email is required';
    if (!password) newErrors.password = 'Password is required';

    setErrors(newErrors);

    if (newErrors.email || newErrors.password) return;

    setLoading(true);
    const startTime = Date.now();

    try {
      const result = await authService.signIn(email, password, null, rememberMe);
      const elapsed = Date.now() - startTime;
      if (elapsed < 500) await new Promise((r) => setTimeout(r, 500 - elapsed));

      if (result.success) {
        await saveRememberMe(email, rememberMe);
        setShowSuccessAnimation(true);
        setTimeout(() => { router.replace('/(tabs)/home'); }, 400);
      } else {
        const msg = result.message || '';
        if (msg === 'Invalid email or password.' || msg.toLowerCase().includes('invalid')) {
          setErrors((prev) => ({ ...prev, password: 'Invalid email or password. Please try again.' }));
        } else if (msg.includes('EMAIL_NOT_VERIFIED') || msg.toLowerCase().includes('verify')) {
          showToastMessage('Please verify your email address before signing in.', true);
        } else if (msg.toLowerCase().includes('google') || msg.toLowerCase().includes('oauth')) {
          setErrors((prev) => ({ ...prev, email: 'This email already use in google authentication.' }));
        } else {
          setErrors((prev) => ({ ...prev, password: msg || 'Invalid email or password' }));
        }
      }
    } catch (error: any) {
      console.error('Sign in error:', error);
      if (error.response?.status === 401) {
        setErrors((prev) => ({ ...prev, password: 'Invalid email or password. Please try again.' }));
      } else if (error.response?.data?.message) {
        const msg = error.response.data.message;
        if (msg === 'Invalid email or password.' || msg.toLowerCase().includes('invalid')) {
          setErrors((prev) => ({ ...prev, password: 'Invalid email or password. Please try again.' }));
        } else if (msg === 'EMAIL_NOT_VERIFIED' || msg.toLowerCase().includes('verify')) {
          showToastMessage('Please verify your email address before signing in.', true);
        } else if (msg.toLowerCase().includes('google') || msg.toLowerCase().includes('oauth')) {
          setErrors((prev) => ({ ...prev, email: 'This email already use in google authentication.' }));
        } else {
          setErrors((prev) => ({ ...prev, password: msg || 'Something went wrong' }));
        }
      } else {
        setErrors((prev) => ({ ...prev, password: error.message || 'Something went wrong' }));
      }
    } finally {
      setLoading(false);
    }
  };

  const isAnyInputFocused = emailFocused || passwordFocused;

  const getOutlineColor = (isFocused: boolean, hasError: string, defaultColor: string = '#dde3fa') => {
    if (hasError) return '#ef4444';
    if (isFocused) return '#4c6fff';
    return defaultColor;
  };

  return (
    <>
      <Stack.Screen options={{
        headerShown: false,
        animation: 'none',
      }} />

      <ErrorPopupModal
        visible={showErrorModal}
        title={errorModalData.title}
        message={errorModalData.message}
        onClose={() => setShowErrorModal(false)}
        onAction={errorModalData.onAction}
        actionButtonText={errorModalData.actionButtonText}
        actionIcon={errorModalData.actionIcon}
      />

      <LinkGoogleModal
        visible={showLinkGoogleModal}
        email={pendingGoogleEmailRef.current}
        password={linkGooglePassword}
        onChangePassword={(text) => { setLinkGooglePassword(text); setLinkGoogleError(''); }}
        showPassword={linkGoogleShowPassword}
        onToggleShowPassword={() => setLinkGoogleShowPassword((v) => !v)}
        error={linkGoogleError}
        loading={linkGoogleLoading}
        onCancel={closeLinkGoogleModal}
        onConfirm={handleConfirmLinkGoogle}
      />

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}>
        <DiagramBackground />

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={false}
          automaticallyAdjustKeyboardInsets={true}
          keyboardDismissMode="interactive"
          contentInsetAdjustmentBehavior="always"
        >
          <View style={styles.cardOuter}>
            <View style={styles.logoWrap}>
              <AnimatedLogo size={logoSize} isInputFocused={isAnyInputFocused} showSuccess={showSuccessAnimation} />
            </View>

            <Animated.View style={[
              styles.card,
              {
                opacity: cardOpacity,
                transform: [{ translateY: cardTranslateY }],
              }
            ]}>
              <View style={styles.connectorTop} />
              <View style={styles.connectorBottom} />
              <View style={styles.connectorLeft} />
              <View style={styles.connectorRight} />

              <Text style={[styles.heading, isSmallScreen && { fontSize: 22 }]}>Welcome Back</Text>
              <Text style={[styles.subtitle, isSmallScreen && { fontSize: 12, marginBottom: 12 }]}>Sign in to continue learning</Text>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Email</Text>
                <View style={[styles.inputWrap, emailFocused && styles.inputWrapFocused, errors.email && styles.inputError]}>
                  <TextInput
                    style={[styles.input, Platform.OS === 'web' && { outlineWidth: 1, outlineStyle: 'solid', outlineOffset: 0, borderRadius: 10, outlineColor: getOutlineColor(emailFocused, errors.email) }]}
                    placeholder="you@example.com"
                    placeholderTextColor="#b8c0d4"
                    value={email}
                    onChangeText={(text) => { setEmail(text); if (errors.email) setErrors((prev) => ({ ...prev, email: '' })); }}
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
                {errors.email ? <Text style={styles.errorText}>{errors.email}</Text> : null}
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Password</Text>
                <View style={[styles.inputWrap, passwordFocused && styles.inputWrapFocused, errors.password && styles.inputError]}>
                  <TextInput
                    ref={passwordRef}
                    style={[styles.input, styles.inputWithIcon, Platform.OS === 'web' && { outlineWidth: 1, outlineStyle: 'solid', outlineOffset: 0, borderRadius: 10, outlineColor: getOutlineColor(passwordFocused, errors.password) }]}
                    placeholder="Enter your password"
                    placeholderTextColor="#b8c0d4"
                    value={password}
                    onChangeText={(text) => { setPassword(text); if (errors.password) setErrors((prev) => ({ ...prev, password: '' })); }}
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
                  <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowPassword(!showPassword)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                    <EyeIcon visible={showPassword} />
                  </TouchableOpacity>
                </View>
                {errors.password ? <Text style={styles.errorText}>{errors.password}</Text> : null}

                <View style={styles.optionsRow}>
                  <TouchableOpacity style={styles.rememberMeRow} onPress={() => setRememberMe(!rememberMe)}>
                    <View style={[styles.checkbox, rememberMe && styles.checkboxChecked]}>
                      {rememberMe && (
                        <Svg width={9} height={9} viewBox="0 0 10 10">
                          <Path d="M2 5l2.5 2.5L8 3" stroke="white" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" fill="none" />
                        </Svg>
                      )}
                    </View>
                    <Text style={styles.rememberMeText}>Remember me</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.forgotWrap} onPress={() => router.push('/(auth)/forgot-password')}>
                    <Text style={styles.forgotText}>Forgot Password?</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <Pressable style={({ pressed }) => [styles.btnSignIn, loading && styles.btnDisabled, { transform: [{ scale: pressed ? 0.97 : 1 }], opacity: pressed ? 0.9 : 1 }]} onPress={handleSignIn} disabled={loading}>
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
                <Text style={styles.orText}>or</Text>
                <View style={styles.line} />
              </View>

              {Platform.OS === 'web' ? (
                <TouchableOpacity style={[styles.btnGoogle, loading && styles.btnDisabled]} onPress={handleFirebaseGoogleSignIn} activeOpacity={0.85} disabled={loading}>
                  {loading ? <ActivityIndicator color="#3b5bdb" size="small" /> : <GoogleIcon />}
                  <Text style={styles.btnGoogleText}>Continue with Google</Text>
                </TouchableOpacity>
              ) : null}

              <View style={styles.signupWrap}>
                <Text style={styles.signupText}>New here? </Text>
                <TouchableOpacity onPress={navigateToSignUp}>
                  <Text style={styles.signupLink}>Sign Up</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.footerDivider} />

              <View style={styles.termsWrap}>
                <Text style={styles.termsText}>
                  By signing in, you agree to the{' '}
                  <Text style={styles.termsLink} onPress={openPrivacyPage}>Terms and Condition</Text>
                  {' & '}
                  <Text style={styles.termsLink} onPress={openPrivacyPage}>Privacy Policy</Text>
                </Text>
              </View>
            </Animated.View>
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
  splashContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#eef2ff',
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
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 12,
    minHeight: SCREEN_HEIGHT,
  },
  cardOuter: {
    width: '100%',
    maxWidth: 400,
    minWidth: 300,
    alignItems: 'center',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    paddingHorizontal: 24,
    paddingVertical: 20,
    paddingTop: 44,
    width: '100%',
    position: 'relative',
    shadowColor: '#1e293b',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.06,
    shadowRadius: 20,
    elevation: 8,
    marginTop: 0,
    borderColor: '#f1f5ff',
  },
  connectorTop: {
    position: 'absolute',
    top: -4,
    alignSelf: 'center',
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#c7d2fe',
  },
  connectorBottom: {
    position: 'absolute',
    bottom: -4,
    alignSelf: 'center',
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#c7d2fe',
  },
  connectorLeft: {
    position: 'absolute',
    left: -4,
    top: '50%',
    transform: [{ translateY: -4 }],
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#c7d2fe',
  },
  connectorRight: {
    position: 'absolute',
    right: -4,
    top: '50%',
    transform: [{ translateY: -4 }],
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#c7d2fe',
  },
  logoWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: -36,
    zIndex: 10,
  },
  logoWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#eef2ff',
    borderWidth: 2.5,
    borderColor: '#3b5bdb',
    shadowColor: '#3b5bdb',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  logo: {
    backgroundColor: 'transparent',
  },
  heading: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0f172a',
    textAlign: 'center',
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 16,
    textAlign: 'center',
  },
  formGroup: {
    marginBottom: 12,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 4,
  },
  inputWrap: {
    borderWidth: 1,
    borderColor: '#dde3fa',
    borderRadius: 10,
    backgroundColor: '#ffffff',
    minHeight: 38,
    justifyContent: 'center',
  },
  inputWrapFocused: {
    backgroundColor: '#ffffff',
    shadowColor: '#3b5bdb',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 3,
  },
  input: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 10 : 9,
    fontSize: 14,
    color: '#1a1f36',
    backgroundColor: 'transparent',
    minHeight: 40,
    textAlignVertical: 'center',
  },
  inputWithIcon: {
    paddingRight: 40,
  },
  eyeBtn: {
    position: 'absolute',
    right: 8,
    padding: 12,
  },
  optionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 0,
  },
  rememberMeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  checkbox: {
    width: 16,
    height: 16,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#8896b3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#3b5bdb',
    borderColor: '#3b5bdb',
  },
  rememberMeText: {
    fontSize: 12,
    color: '#4a5568',
  },
  forgotWrap: {
    alignItems: 'flex-end',
  },
  forgotText: {
    fontSize: 12,
    color: '#8896b3',
    fontWeight: '500',
  },
  inputError: {
    borderColor: '#e11d48',
  },
  errorText: {
    fontSize: 11,
    color: '#e11d48',
    marginTop: 4,
    marginLeft: 4,
    fontWeight: '500',
  },
  btnSignIn: {
    backgroundColor: '#3b5bdb',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#2f49c7',
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: 2,
    shadowColor: '#3b5bdb',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
  },
  btnDisabled: {
    opacity: 0.75,
  },
  btnSignInText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 6,
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: '#e5e9f5',
  },
  orText: {
    marginHorizontal: 10,
    fontSize: 11,
    color: '#8896b3',
    fontWeight: '600',
  },
  btnGoogle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    paddingVertical: 9,
    marginTop: 2,
    backgroundColor: '#ffffff',
  },
  btnGoogleText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#1a1f36',
    marginLeft: 6,
  },
  footerDivider: {
    height: 1,
    backgroundColor: '#e5e9f5',
    marginTop: 14,
    marginBottom: 10,
  },
  termsWrap: {
    paddingHorizontal: 2,
  },
  termsText: {
    fontSize: 12,
    color: '#4a5568',
    lineHeight: 17,
    textAlign: 'center',
  },
  termsLink: {
    fontWeight: '700',
    color: '#3b5bdb',
  },
  signupWrap: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
  },
  signupText: {
    fontSize: 12,
    color: '#64748b',
  },
  signupLink: {
    fontSize: 12,
    fontWeight: '700',
    color: '#3b5bdb',
  },
  errorModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorModalContainer: {
    width: '85%',
    maxWidth: 320,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 22,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  errorModalIconWrapper: {
    marginBottom: 14,
  },
  errorModalIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#f0f4ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
    textAlign: 'center',
    marginBottom: 8,
  },
  errorModalMessage: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 20,
  },
  errorModalButtonPrimary: {
    width: '100%',
    paddingVertical: 11,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: '#3b5bdb',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  errorModalButtonTextPrimary: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
  linkGoogleCancelBtn: {
    width: '100%',
    paddingVertical: 11,
    alignItems: 'center',
    marginTop: 6,
  },
  linkGoogleCancelText: {
    color: '#64748b',
    fontSize: 14,
    fontWeight: '600',
  },
});