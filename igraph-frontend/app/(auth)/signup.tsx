import React, { useState, useRef, useEffect, useCallback } from 'react';
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
  Modal,
  ToastAndroid,
  Alert,
  Animated,
  Easing,
  useWindowDimensions,
} from 'react-native';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { Svg, Circle, Rect, Path, Defs, LinearGradient, Stop } from 'react-native-svg';
import { initializeApp, FirebaseApp, getApps } from 'firebase/app';
import {
  getAuth,
  Auth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  browserSessionPersistence,
  setPersistence,
} from 'firebase/auth';
import * as WebBrowser from 'expo-web-browser';
import * as authService from '@/services/authService';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

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

if (!getApps().length) {
  firebaseApp = initializeApp(firebaseConfig);
} else {
  firebaseApp = getApps()[0];
}
auth = getAuth(firebaseApp);

if (Platform.OS === 'web' && auth) {
  setPersistence(auth, browserSessionPersistence).catch((err) => {
    console.warn('[Firebase] Persistence setting failed:', err.message);
  });
}

WebBrowser.maybeCompleteAuthSession();

const getOutlineColor = (isFocused: boolean, hasError: string) => {
  if (hasError) return '#ef4444';
  if (isFocused) return '#4c6fff';
  return '#dde3fa';
};

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
    if (windowWidth < 1024) return 52;
    if (windowWidth < 1440) return 56;
    return 64;
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
        },
      ]}
    >
      <Image
        source={require('../../assets/images/logo.png')}
        style={[
          styles.logo,
          {
            width: finalSize,
            height: finalSize,
            borderRadius: finalSize * 0.22,
          },
        ]}
        resizeMode="contain"
      />
    </Animated.View>
  );
};

const GoogleIcon = () => (
  <Svg width={18} height={18} viewBox="0 0 24 24">
    <Path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
    <Path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
    <Path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
    <Path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
  </Svg>
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

const EmailIcon = () => (
  <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
    <Path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" stroke="#ffffff" strokeWidth={1.5} fill="none"/>
    <Path d="M22 6l-10 7L2 6" stroke="#ffffff" strokeWidth={1.5} fill="none"/>
  </Svg>
);

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

const SuccessModal = ({
  visible,
  title,
  message,
  onClose,
  buttonText = 'Continue',
  email,
  purpose,
}: {
  visible: boolean;
  title: string;
  message: string;
  onClose: () => void;
  buttonText?: string;
  email?: string;
  purpose?: string;
}) => {
  const router = useRouter();

  const handleClose = () => {
    onClose();
    if (email && purpose) {
      setTimeout(() => {
        router.push({
          pathname: '/(auth)/verify-otp',
          params: { email, purpose }
        });
      }, 100);
    }
  };

  return (
    <Modal animationType="fade" transparent={true} visible={visible} onRequestClose={handleClose}>
      <TouchableOpacity style={styles.errorModalOverlay} activeOpacity={1} onPress={handleClose}>
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
          <TouchableOpacity style={[styles.errorModalButtonPrimary, { backgroundColor: '#10b981' }]} onPress={handleClose}>
            <Text style={styles.errorModalButtonTextPrimary}>{buttonText}</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

const CustomToast = ({
  visible,
  message,
  isError,
  onHide,
}: {
  visible: boolean;
  message: string;
  isError: boolean;
  onHide: () => void;
}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(-50)).current;
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
      ]).start();

      timeoutRef.current = setTimeout(() => {
        hideToast();
      }, 3000);
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [visible]);

  const hideToast = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: -50,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onHide();
    });
  };

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.toastContainer,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <View style={[styles.toastContent, isError ? styles.toastError : styles.toastSuccess]}>
        {isError ? (
          <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
            <Circle cx="12" cy="12" r="10" stroke="#fff" strokeWidth="1.5" />
            <Path d="M12 8v4M12 16h.01" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
          </Svg>
        ) : (
          <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
            <Circle cx="12" cy="12" r="10" stroke="#fff" strokeWidth="1.5" />
            <Path d="M8 12l3 3 5-6" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
          </Svg>
        )}
        <Text style={styles.toastText}>{message}</Text>
      </View>
    </Animated.View>
  );
};

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
      <Path d={`M ${SCREEN_WIDTH * 0.06 + 118} ${SCREEN_HEIGHT * 0.09 + 44} C ${SCREEN_WIDTH * 0.34} ${SCREEN_HEIGHT * 0.05}, ${SCREEN_WIDTH * 0.42} ${SCREEN_HEIGHT * 0.14}, ${SCREEN_WIDTH * 0.55} ${SCREEN_HEIGHT * 0.16}`} stroke="#a9b8ff" strokeWidth="1.5" fill="none" opacity="0.45" />
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

const SPECIAL_CHARS_REGEX = /[!@#$%^&*(),.?":{}|<>]/;

const getStrengthPercentage = (pwd: string): number => {
  let score = 0;
  if (pwd.length >= 8) score++;
  if (/[A-Z]/.test(pwd)) score++;
  if (/[a-z]/.test(pwd)) score++;
  if (/[0-9]/.test(pwd)) score++;
  if (SPECIAL_CHARS_REGEX.test(pwd)) score++;
  return (score / 5) * 100;
};

const getStrengthColor = (pwd: string): string => {
  const percentage = getStrengthPercentage(pwd);
  if (percentage === 100) return '#10b981';
  if (percentage >= 80) return '#f59e0b';
  if (percentage >= 60) return '#f97316';
  return '#ef4444';
};

const getStrengthLabel = (pwd: string): string => {
  const percentage = getStrengthPercentage(pwd);
  if (percentage === 100) return 'Strong';
  if (percentage >= 80) return 'Good';
  if (percentage >= 60) return 'Weak';
  return 'Very weak';
};

const CompactPasswordStrength = ({ password }: { password: string }) => {
  if (!password) return null;
  return (
    <View style={styles.strengthContainer}>
      <View style={styles.strengthRow}>
        <View style={styles.strengthBar}>
          <View style={[styles.strengthFill, { width: `${getStrengthPercentage(password)}%`, backgroundColor: getStrengthColor(password) }]} />
        </View>
        <Text style={[styles.strengthText, { color: getStrengthColor(password) }]}>
          {getStrengthLabel(password)}
        </Text>
      </View>
    </View>
  );
};

export default function SignUp() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const isSmallScreen = windowHeight < 680;
  const logoSize = getResponsiveLogoSize(windowWidth, windowHeight);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState((params.prefilledEmail as string) || '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false);
  const [errorModalData, setErrorModalData] = useState({
    title: '',
    message: '',
    onAction: undefined as (() => void) | undefined,
    actionButtonText: '',
    actionIcon: undefined as React.ReactNode | undefined,
  });
  const [successModalData, setSuccessModalData] = useState({
    title: '',
    message: '',
    email: '',
    purpose: '',
  });
  const [errors, setErrors] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    agreed: '',
  });

  const [inlinePasswordError, setInlinePasswordError] = useState('');
  const [emailInlineError, setEmailInlineError] = useState('');

  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastIsError, setToastIsError] = useState(false);

  const showToast = (message: string, isError: boolean = false) => {
    setToastMessage(message);
    setToastIsError(isError);
    setToastVisible(true);
  };

  const hideToast = () => {
    setToastVisible(false);
  };

  const [fullNameFocused, setFullNameFocused] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [confirmPasswordFocused, setConfirmPasswordFocused] = useState(false);

  const isAnyInputFocused = fullNameFocused || emailFocused || passwordFocused || confirmPasswordFocused;

  const cardOpacity = useRef(new Animated.Value(0)).current;
  const cardTranslateY = useRef(new Animated.Value(20)).current;
  const [isAnimatingOut, setIsAnimatingOut] = useState(false);

  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const confirmPasswordRef = useRef<TextInput>(null);
  const googleSignInInProgress = useRef(false);

  useEffect(() => {
    const hasPrefilledEmail = params.prefilledEmail !== undefined;
    
    if (hasPrefilledEmail) {
      cardOpacity.setValue(1);
      cardTranslateY.setValue(0);
    } else {
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
  }, []);

  useEffect(() => {
    const handleRedirectResult = async () => {
      if (!auth || Platform.OS === 'web') return;
      try {
        const result = await getRedirectResult(auth);
        if (result) {
          setLoading(true);
          await handleGoogleSignInResult(result);
          setLoading(false);
        }
      } catch (error: any) {
        console.error('Redirect result error:', error);
        setLoading(false);
      }
    };
    handleRedirectResult();
  }, []);

  const handleToggleAgreement = useCallback(() => {
    setAgreed((prev) => !prev);
    if (errors.agreed) setErrors((prev) => ({ ...prev, agreed: '' }));
  }, [errors.agreed]);

  const openPrivacyPage = useCallback(() => {
    router.push('/(auth)/privacy1');
  }, [router]);

  const showErrorPopup = (
    title: string,
    message: string,
    onAction?: () => void,
    actionButtonText?: string,
    actionIcon?: React.ReactNode
  ) => {
    setErrorModalData({ title, message, onAction, actionButtonText: actionButtonText || '', actionIcon });
    setShowErrorModal(true);
  };

  const showSuccessPopup = (title: string, message: string, email: string, purpose: string) => {
    setSuccessModalData({ title, message, email, purpose });
    setShowSuccessModal(true);
  };

  const navigateToSignIn = useCallback(() => {
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
        pathname: '/(auth)/signin',
        params: email ? { prefilledEmail: email } : {}
      });
    });
  }, [cardOpacity, cardTranslateY, router, email, isAnimatingOut]);

  const isPasswordValid = (pwd: string) => {
    return pwd.length >= 8 &&
           /[A-Z]/.test(pwd) &&
           /[a-z]/.test(pwd) &&
           /[0-9]/.test(pwd) &&
           SPECIAL_CHARS_REGEX.test(pwd);
  };

  const getPasswordMissingRequirements = (pwd: string): string[] => {
    const missing: string[] = [];
    if (pwd.length < 8) missing.push('8+ characters');
    if (!/[A-Z]/.test(pwd)) missing.push('uppercase letter');
    if (!/[a-z]/.test(pwd)) missing.push('lowercase letter');
    if (!/[0-9]/.test(pwd)) missing.push('number');
    if (!SPECIAL_CHARS_REGEX.test(pwd)) missing.push('special character');
    return missing;
  };

  const doPasswordsMatch = () => {
    if (!confirmPassword) return null;
    return password === confirmPassword;
  };

  const validate = () => {
    const newErrors = { fullName: '', email: '', password: '', confirmPassword: '', agreed: '' };
    let isValid = true;

    if (!fullName.trim()) { newErrors.fullName = 'Name is required.'; isValid = false; }
    if (!email.trim()) { newErrors.email = 'Email address is required.'; isValid = false; }
    else if (!/\S+@\S+\.\S+/.test(email)) { newErrors.email = 'Please enter a valid email.'; isValid = false; }
    if (!password) { newErrors.password = 'Password is required.'; isValid = false; }
    else if (!isPasswordValid(password)) {
      const missing = getPasswordMissingRequirements(password);
      newErrors.password = `Password must include: ${missing.join(', ')}`;
      isValid = false;
    }
    if (!confirmPassword) { newErrors.confirmPassword = 'Please confirm your password.'; isValid = false; }
    else if (password !== confirmPassword) { newErrors.confirmPassword = 'Passwords do not match.'; isValid = false; }
    if (!agreed) { newErrors.agreed = 'You must agree to the Terms and Privacy Policy.'; isValid = false; }

    setErrors(newErrors);
    return isValid;
  };

  const handleGoogleSignIn = async () => {
    setEmailInlineError('');

    if (!agreed) {
      setErrors((prev) => ({
        ...prev,
        agreed: 'You must agree to the Terms and Privacy Policy before continuing',
      }));
      return;
    }
    if (!auth) {
      showErrorPopup('Error', 'Firebase auth not available');
      return;
    }

    if (googleSignInInProgress.current) return;
    googleSignInInProgress.current = true;
    authService.pingBackend?.(); // Wake up free-tier backend while the user picks an account

    // Native uses a full-page redirect, so show loading immediately since we're
    // navigating away. Web uses a popup — no spinner while it's open (the user
    // is still choosing/cancelling); only show loading once an account is picked.
    if (Platform.OS !== 'web') {
      setLoading(true);
    }

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
    if (Platform.OS === 'web') {
      window.addEventListener('focus', handleWindowFocus);
    }
    const stopWatchingFocus = () => {
      settled = true;
      clearTimeout(unstickTimer);
      if (Platform.OS === 'web') {
        window.removeEventListener('focus', handleWindowFocus);
      }
    };

    try {
      const provider = new GoogleAuthProvider();
      provider.addScope('email');
      provider.addScope('profile');
      // See signin.tsx for why this is 'login' and not 'select_account'.
      provider.setCustomParameters({ prompt: 'login' });

      if (Platform.OS === 'web') {
        const result = await signInWithPopup(auth, provider);
        stopWatchingFocus();
        setLoading(true);
        await handleGoogleSignInResult(result);
      } else {
        await signInWithRedirect(auth, provider);
      }
    } catch (error: any) {
      stopWatchingFocus();
      console.error('Google Sign-In error:', error);
      setLoading(false);
      if (error.code === 'auth/popup-closed-by-user' || error.code === 'auth/cancelled-popup-request') {
        // User cancelled, or this attempt was superseded by a fresh click — no spinner, nothing to show
      } else if (error.code === 'auth/popup-blocked') {
        showErrorPopup('Popup Blocked', 'Please allow popups for this website to sign in with Google.', undefined, 'OK');
      } else if (error.code === 'auth/network-request-failed') {
        showErrorPopup('Network Error', 'Unable to reach Google servers. Please check your internet connection.', undefined, 'OK');
      } else {
        showErrorPopup('Google Sign In Failed', error.message || 'Something went wrong. Please try again.', undefined, 'OK');
      }
    } finally {
      googleSignInInProgress.current = false;
    }
  };

  const handleGoogleSignInResult = async (result: any) => {
    try {
      const idToken = await result.user.getIdToken();
      const apiResult = await authService.googleAuth(idToken);

      if (apiResult.success) {
        setShowSuccessAnimation(true);
        showSuccessPopup('Welcome!', 'Your Google account has been successfully signed up.', '', '');
        setTimeout(() => { router.replace('/(tabs)/home'); }, 400);
      } else {
        await auth?.signOut();
        const msg = apiResult.message || '';
        if (msg.toLowerCase().includes('already registered') ||
            msg.toLowerCase().includes('already exists') ||
            msg.toLowerCase().includes('email/password')) {
          const googleEmail = result.user.email || '';
          if (googleEmail) setEmail(googleEmail);
          setEmailInlineError('An account with this email already exists.');
        } else {
          showErrorPopup('Sign Up Failed', msg || 'Google sign up failed. Please try again.');
        }
      }
    } catch (error: any) {
      console.error('Error handling Google sign-in result:', error);
      if (error.response?.status === 409) {
        setEmailInlineError('An account with this email already exists.');
      } else if (error.code === 'ECONNABORTED' || error.message?.toLowerCase().includes('timeout')) {
        showErrorPopup('Server Waking Up', 'Our server is starting up after being idle. Please try signing up with Google again in a few seconds.');
      } else {
        showErrorPopup('Sign Up Failed', error.message || 'Something went wrong');
      }
    } finally {
      setLoading(false);
      googleSignInInProgress.current = false;
    }
  };

  const handleGoogleSignUp = async () => {
    await handleGoogleSignIn();
  };

  const handleSignUp = async () => {
    setEmailInlineError('');
    if (!validate()) return;

    setLoading(true);
    const startTime = Date.now();

    try {
      const result = await authService.signUp({ fullName, email, password });
      const elapsed = Date.now() - startTime;
      if (elapsed < 500) await new Promise((r) => setTimeout(r, 500 - elapsed));

      if (result.success) {
        const maskedEmail = email.replace(/(.{2})(.*)(@.*)/, '$1•••$3');
        showToast(`Verification code sent to ${maskedEmail}`);
        setTimeout(() => {
          router.push({ pathname: '/(auth)/verify-otp', params: { email, purpose: 'register' } });
        }, 400);
      } else {
        const msg = result.message || '';
        const errorCode = result.code;
        if (errorCode === 'GOOGLE_ACCOUNT' || msg.toLowerCase().includes('google') || msg.toLowerCase().includes('oauth')) {
          setEmailInlineError('This email is registered with Google.');
        } else if (msg.toLowerCase().includes('already registered') || msg.toLowerCase().includes('already exists')) {
          setEmailInlineError('An account with this email already exists.');
        } else {
          showToast(msg || 'Something went wrong', true);
        }
      }
    } catch (error: any) {
      console.error('Sign up error:', error);
      if (error.response?.data?.message) {
        const msg = error.response.data.message;
        const errorCode = error.response.data.code;
        if (errorCode === 'GOOGLE_ACCOUNT' || msg.toLowerCase().includes('google') || msg.toLowerCase().includes('oauth')) {
          setEmailInlineError('This email is registered with Google.');
        } else if (msg.toLowerCase().includes('already registered') || msg.toLowerCase().includes('already exists')) {
          setEmailInlineError('An account with this email already exists.');
        } else {
          showToast(msg || 'Something went wrong', true);
        }
      } else {
        showToast(error.message || 'Something went wrong', true);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Stack.Screen options={{ 
        headerShown: false,
        animation: 'none',
      }} />

      <ErrorPopupModal visible={showErrorModal} title={errorModalData.title} message={errorModalData.message} onClose={() => setShowErrorModal(false)} onAction={errorModalData.onAction} actionButtonText={errorModalData.actionButtonText} actionIcon={errorModalData.actionIcon} />
      <SuccessModal
        visible={showSuccessModal}
        title={successModalData.title}
        message={successModalData.message}
        onClose={() => setShowSuccessModal(false)}
        buttonText="Continue"
        email={successModalData.email}
        purpose={successModalData.purpose}
      />
      <CustomToast
        visible={toastVisible}
        message={toastMessage}
        isError={toastIsError}
        onHide={hideToast}
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

              <Text style={[styles.heading, isSmallScreen && { fontSize: 20 }]}>Sign Up</Text>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Full Name</Text>
                <View style={[styles.inputWrap, fullNameFocused && styles.inputWrapFocused, errors.fullName ? styles.inputError : null]}>
                  <TextInput
                    style={[styles.input, Platform.OS === 'web' && { outlineWidth: 1, outlineStyle: 'solid', outlineOffset: 0, borderRadius: 10, outlineColor: getOutlineColor(fullNameFocused, errors.fullName) }]}
                    placeholder="Juan dela Cruz"
                    placeholderTextColor="#b8c0d4"
                    value={fullName}
                    onChangeText={(text) => { setFullName(text); if (errors.fullName) setErrors({ ...errors, fullName: '' }); }}
                    onFocus={() => setFullNameFocused(true)}
                    onBlur={() => setFullNameFocused(false)}
                    autoCapitalize="words"
                    returnKeyType="next"
                    blurOnSubmit={false}
                    onSubmitEditing={() => emailRef.current?.focus()}
                    underlineColorAndroid="transparent"
                    selectionColor="#3b5bdb"
                    cursorColor="#3b5bdb"
                  />
                </View>
                {errors.fullName ? <Text style={styles.fieldError}>{errors.fullName}</Text> : null}
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Email</Text>
                <View style={[styles.inputWrap, emailFocused && styles.inputWrapFocused, (errors.email || emailInlineError) ? styles.inputError : null]}>
                  <TextInput
                    ref={emailRef}
                    style={[styles.input, Platform.OS === 'web' && { outlineWidth: 1, outlineStyle: 'solid', outlineOffset: 0, borderRadius: 10, outlineColor: getOutlineColor(emailFocused, errors.email || emailInlineError) }]}
                    placeholder="you@example.com"
                    placeholderTextColor="#b8c0d4"
                    value={email}
                    onChangeText={(text) => { setEmail(text); if (errors.email) setErrors({ ...errors, email: '' }); if (emailInlineError) setEmailInlineError(''); }}
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
                {errors.email ? <Text style={styles.fieldError}>{errors.email}</Text> : null}
                {emailInlineError ? <Text style={styles.fieldError}>{emailInlineError}</Text> : null}
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Password</Text>
                <View style={[styles.inputWrap, passwordFocused && styles.inputWrapFocused, errors.password ? styles.inputError : null]}>
                  <TextInput
                    ref={passwordRef}
                    style={[styles.input, styles.inputWithIcon, Platform.OS === 'web' && { outlineWidth: 1, outlineStyle: 'solid', outlineOffset: 0, borderRadius: 10, outlineColor: getOutlineColor(passwordFocused, errors.password) }]}
                    placeholder="Create a strong password"
                    placeholderTextColor="#b8c0d4"
                    value={password}
                    onChangeText={(text) => {
                      setPassword(text);
                      if (errors.password) setErrors({ ...errors, password: '' });
                      setInlinePasswordError('');
                    }}
                    onFocus={() => setPasswordFocused(true)}
                    onBlur={() => {
                      setPasswordFocused(false);
                      if (password && !isPasswordValid(password)) {
                        const missing = getPasswordMissingRequirements(password);
                        setInlinePasswordError(`Missing: ${missing.join(', ')}`);
                      } else {
                        setInlinePasswordError('');
                      }
                    }}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    returnKeyType="next"
                    blurOnSubmit={false}
                    onSubmitEditing={() => confirmPasswordRef.current?.focus()}
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
                <CompactPasswordStrength password={password} />
                {inlinePasswordError ? <Text style={styles.inlineErrorText}>{inlinePasswordError}</Text> : null}
                {errors.password ? <Text style={styles.fieldError}>{errors.password}</Text> : null}
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Confirm Password</Text>
                <View style={[styles.inputWrap, confirmPasswordFocused && styles.inputWrapFocused, errors.confirmPassword ? styles.inputError : null]}>
                  <TextInput
                    ref={confirmPasswordRef}
                    style={[styles.input, styles.inputWithIcon, Platform.OS === 'web' && { outlineWidth: 1, outlineStyle: 'solid', outlineOffset: 0, borderRadius: 10, outlineColor: getOutlineColor(confirmPasswordFocused, errors.confirmPassword) }]}
                    placeholder="Re-enter your password"
                    placeholderTextColor="#b8c0d4"
                    value={confirmPassword}
                    onChangeText={(text) => { setConfirmPassword(text); if (errors.confirmPassword) setErrors({ ...errors, confirmPassword: '' }); }}
                    onFocus={() => setConfirmPasswordFocused(true)}
                    onBlur={() => setConfirmPasswordFocused(false)}
                    secureTextEntry={!showConfirmPassword}
                    autoCapitalize="none"
                    returnKeyType="done"
                    blurOnSubmit={true}
                    onSubmitEditing={handleSignUp}
                    underlineColorAndroid="transparent"
                    selectionColor="#3b5bdb"
                    cursorColor="#3b5bdb"
                    autoComplete="off"
                    importantForAutofill="no"
                  />
                  <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowConfirmPassword(!showConfirmPassword)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                    <EyeIcon visible={showConfirmPassword} />
                  </TouchableOpacity>
                </View>
                {confirmPassword ? (
                  doPasswordsMatch() ? (
                    <Text style={styles.matchSuccess}>✓ Match</Text>
                  ) : !errors.confirmPassword ? (
                    <Text style={styles.fieldError}>✗ Doesn't match</Text>
                  ) : null
                ) : null}
                {errors.confirmPassword ? <Text style={styles.fieldError}>{errors.confirmPassword}</Text> : null}
              </View>

              <TouchableOpacity style={[styles.btnCreate, loading && styles.btnDisabled]} onPress={handleSignUp} activeOpacity={0.85} disabled={loading}>
                {loading ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <ActivityIndicator color="#ffffff" size="small" />
                    <Text style={styles.btnCreateText}>Creating Account...</Text>
                  </View>
                ) : (
                  <Text style={styles.btnCreateText}>Sign Up</Text>
                )}
              </TouchableOpacity>

              {Platform.OS === 'web' && (
                <>
                  <View style={styles.divider}>
                    <View style={styles.line} />
                    <Text style={styles.orText}>or</Text>
                    <View style={styles.line} />
                  </View>
                  <TouchableOpacity style={[styles.btnGoogle, loading && styles.btnDisabled]} onPress={handleGoogleSignUp} activeOpacity={0.85} disabled={loading}>
                    {loading ? <ActivityIndicator color="#3b5bdb" size="small" /> : <GoogleIcon />}
                    <Text style={styles.btnGoogleText}>Continue with Google</Text>
                  </TouchableOpacity>
                </>
              )}

              <View style={styles.termsWrap}>
                <TouchableOpacity onPress={handleToggleAgreement} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <View style={[styles.customCheckbox, agreed && styles.customCheckboxChecked, errors.agreed ? styles.customCheckboxError : null]}>
                    {agreed && (
                      <Svg width={9} height={9} viewBox="0 0 10 10">
                        <Path d="M2 5l2.5 2.5L8 3" stroke="white" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" fill="none" />
                      </Svg>
                    )}
                  </View>
                </TouchableOpacity>
                <Text style={styles.termsText}>
                  By signing up, you agree to the{' '}
                  <Text style={styles.termsLink} onPress={openPrivacyPage}>Terms and Condition</Text>
                  {' & '}
                  <Text style={styles.termsLink} onPress={openPrivacyPage}>Privacy Policy</Text>
                </Text>
              </View>
              {errors.agreed ? <Text style={styles.fieldError}>{errors.agreed}</Text> : null}

              <View style={styles.signinWrap}>
                <Text style={styles.signinText}>Have an account? </Text>
                <TouchableOpacity onPress={navigateToSignIn}>
                  <Text style={styles.signinLink}>Sign In</Text>
                </TouchableOpacity>
              </View>
            </Animated.View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#eef2ff' },
  scrollContent: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 16, paddingHorizontal: 12, minHeight: SCREEN_HEIGHT },
  cardOuter: { width: '100%', maxWidth: 400, minWidth: 300, alignItems: 'center' },
  card: { backgroundColor: '#ffffff', borderRadius: 20, paddingHorizontal: 22, paddingVertical: 20, paddingTop: 44, width: '100%', position: 'relative', shadowColor: '#1e293b', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.06, shadowRadius: 20, elevation: 8, marginTop: 0, borderColor: '#f1f5ff'},
  connectorTop: { position: 'absolute', top: -4, alignSelf: 'center', width: 8, height: 8, borderRadius: 4, backgroundColor: '#ffffff', borderWidth: 1.5, borderColor: '#c7d2fe' },
  connectorBottom: { position: 'absolute', bottom: -4, alignSelf: 'center', width: 8, height: 8, borderRadius: 4, backgroundColor: '#ffffff', borderWidth: 1.5, borderColor: '#c7d2fe' },
  connectorLeft: { position: 'absolute', left: -4, top: '50%', transform: [{ translateY: -4 }], width: 8, height: 8, borderRadius: 4, backgroundColor: '#ffffff', borderWidth: 1.5, borderColor: '#c7d2fe' },
  connectorRight: { position: 'absolute', right: -4, top: '50%', transform: [{ translateY: -4 }], width: 8, height: 8, borderRadius: 4, backgroundColor: '#ffffff', borderWidth: 1.5, borderColor: '#c7d2fe' },
  logoWrap: { alignItems: 'center', justifyContent: 'center', marginBottom: -36, zIndex: 10 },
  logoWrapper: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#eef2ff', borderWidth: 2.5, borderColor: '#3b5bdb', shadowColor: '#3b5bdb', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 8, elevation: 5 },
  logo: { backgroundColor: 'transparent' },
  heading: { fontSize: 22, fontWeight: '800', color: '#0f172a', textAlign: 'center', marginBottom: 14 },
  formGroup: { marginBottom: 10 },
  label: { fontSize: 12, fontWeight: '600', color: '#334155', marginBottom: 3 },
  inputWrap: { borderWidth: 1, borderColor: '#dde3fa', borderRadius: 10, backgroundColor: '#ffffff', minHeight: 36, justifyContent: 'center' },
  inputWrapFocused: { backgroundColor: '#ffffff', shadowColor: '#3b5bdb', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 3 },
  input: { flex: 1, paddingHorizontal: 12, paddingVertical: Platform.OS === 'ios' ? 9 : 8, fontSize: 13, color: '#1a1f36', backgroundColor: 'transparent', minHeight: 40, textAlignVertical: 'center' },
  inputWithIcon: { paddingRight: 40 },
  eyeBtn: { position: 'absolute', right: 8, padding: 12 },
  inputError: { borderColor: '#ef4444' },
  fieldError: { fontSize: 11, color: '#ef4444', marginTop: 3, marginLeft: 2, fontWeight: '500' },
  inlineErrorText: { fontSize: 11, color: '#f59e0b', marginTop: 2, marginLeft: 2, fontWeight: '500' },
  strengthContainer: { marginTop: 4 },
  strengthRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  strengthBar: { flex: 1, height: 3, backgroundColor: '#e2e6f3', borderRadius: 1.5, overflow: 'hidden' },
  strengthFill: { height: '100%', borderRadius: 1.5 },
  strengthText: { fontSize: 10, fontWeight: '600', minWidth: 48, textAlign: 'right' },
  matchSuccess: { color: '#10b981', fontSize: 11, marginTop: 3, marginLeft: 2, fontWeight: '500' },
  btnCreate: { backgroundColor: '#3b5bdb', borderRadius: 10, borderWidth: 1, borderColor: '#2f49c7', paddingVertical: 10, alignItems: 'center', marginTop: 4, overflow: 'hidden', shadowColor: '#3b5bdb', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.2, shadowRadius: 12, elevation: 6 },
  btnDisabled: { opacity: 0.75 },
  btnCreateText: { color: '#ffffff', fontSize: 14, fontWeight: '700', letterSpacing: 0.3 },
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 8 },
  line: { flex: 1, height: 1, backgroundColor: '#e5e9f5' },
  orText: { marginHorizontal: 8, fontSize: 11, color: '#8896b3', fontWeight: '600' },
  btnGoogle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, paddingVertical: 9, marginTop: 4, backgroundColor: '#ffffff' },
  btnGoogleText: { fontSize: 13, fontWeight: '500', color: '#1a1f36', marginLeft: 6 },
  termsWrap: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginTop: 12, paddingHorizontal: 2 },
  customCheckbox: { width: 16, height: 16, borderRadius: 4, borderWidth: 2, borderColor: '#8896b3', alignItems: 'center', justifyContent: 'center', marginTop: 1, flexShrink: 0 },
  customCheckboxChecked: { borderColor: '#3b5bdb', backgroundColor: '#3b5bdb' },
  customCheckboxError: { borderColor: '#ef4444' },
  termsText: { fontSize: 12, color: '#4a5568', flex: 1, lineHeight: 17 },
  termsLink: { fontWeight: '700', color: '#3b5bdb' },
  signinWrap: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 12 },
  signinText: { fontSize: 12, color: '#64748b' },
  signinLink: { fontSize: 12, fontWeight: '700', color: '#3b5bdb' },
  gridBackground: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
  gridOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(255,255,255,0.10)' },
  errorModalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'center', alignItems: 'center' },
  errorModalContainer: { width: '85%', maxWidth: 320, backgroundColor: '#FFFFFF', borderRadius: 20, padding: 20, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 8 },
  errorModalIconWrapper: { marginBottom: 12 },
  errorModalIconCircle: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#f0f4ff', justifyContent: 'center', alignItems: 'center' },
  errorModalTitle: { fontSize: 18, fontWeight: '700', color: '#1e293b', textAlign: 'center', marginBottom: 6 },
  errorModalMessage: { fontSize: 13, color: '#64748b', textAlign: 'center', lineHeight: 18, marginBottom: 20 },
  errorModalButtonPrimary: { width: '100%', paddingVertical: 10, borderRadius: 10, alignItems: 'center', backgroundColor: '#3b5bdb', flexDirection: 'row', justifyContent: 'center' },
  errorModalButtonTextPrimary: { color: '#ffffff', fontSize: 14, fontWeight: '600' },
  toastContainer: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 50,
    left: 20,
    right: 20,
    zIndex: 1000,
    alignItems: 'center',
  },
  toastContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    minWidth: 200,
    maxWidth: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  toastSuccess: {
    backgroundColor: '#10b981',
  },
  toastError: {
    backgroundColor: '#ef4444',
  },
  toastText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 10,
    flex: 1,
  },
});