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
  KeyboardAvoidingView,
  Modal,
  Image,
  Animated,
  Easing,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Svg, Circle, Rect, Path, Defs, LinearGradient, Stop } from 'react-native-svg';
import { initializeApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth, signInWithPopup, GoogleAuthProvider, browserSessionPersistence, setPersistence } from 'firebase/auth';
import * as authService from '../../services/authService';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Firebase configuration
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

if (Platform.OS === 'web') {
  firebaseApp = initializeApp(firebaseConfig);
  auth = getAuth(firebaseApp);
}

// Custom Toast Component
const CustomToast = ({ visible, message, isError, onHide }: { 
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

// Helper function to get input wrapper style
const getInputWrapperStyle = (isFocused: boolean, hasError: string) => {
  if (hasError && isFocused) {
    return [styles.inputWrap, styles.inputWrapError, styles.inputWrapErrorFocused];
  }
  if (hasError) {
    return [styles.inputWrap, styles.inputWrapError];
  }
  if (isFocused) {
    return [styles.inputWrap, styles.inputWrapFocused];
  }
  return [styles.inputWrap];
};

// ─── BACKGROUND (matches signin.tsx / signup.tsx) ──────────────────────────

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

const BackIcon = () => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
    <Path d="M19 12H5M5 12l7 7M5 12l7-7" stroke="#4a5568" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const GoogleIcon = () => (
  <Svg width={20} height={20} viewBox="0 0 24 24">
    <Path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
    <Path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
    <Path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
    <Path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
  </Svg>
);

const ErrorPopupModal = ({ visible, title, message, onClose, onAction, actionButtonText, actionIcon }: { 
  visible: boolean; 
  title: string; 
  message: string; 
  onClose: () => void;
  onAction?: () => void;
  actionButtonText?: string;
  actionIcon?: React.ReactNode;
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
              {actionIcon && <View style={{ marginRight: 8 }}>{actionIcon}</View>}
              <Text style={styles.errorModalButtonTextPrimary}>{actionButtonText || 'Continue'}</Text>
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

export default function ForgotPassword() {
  const router = useRouter();
  const emailInputRef = useRef<TextInput>(null);
  const [email, setEmail] = useState('');
  const [emailFocused, setEmailFocused] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastIsError, setToastIsError] = useState(false);
  const [errorModalData, setErrorModalData] = useState({ 
    title: '', 
    message: '',
    onAction: undefined as (() => void) | undefined,
    actionButtonText: '',
    actionIcon: undefined as React.ReactNode | undefined
  });

  // Card entrance/exit animation — matches the transition used between
  // signin.tsx <-> signup.tsx, now shared with forgot-password <-> signin.
  const cardOpacity = useRef(new Animated.Value(0)).current;
  const cardTranslateY = useRef(new Animated.Value(20)).current;
  const [isAnimatingOut, setIsAnimatingOut] = useState(false);

  useEffect(() => {
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
  }, []);

  // Shared exit animation before leaving this screen for Sign In
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
      router.push('/(auth)/signin');
    });
  }, [cardOpacity, cardTranslateY, router, isAnimatingOut]);

  const handleBack = useCallback(() => {
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
      router.back();
    });
  }, [cardOpacity, cardTranslateY, router, isAnimatingOut]);

  const showToast = (message: string, isError: boolean = false) => {
    setToastMessage(message);
    setToastIsError(isError);
    setToastVisible(true);
  };

  const hideToast = () => {
    setToastVisible(false);
  };

  const showErrorPopup = (title: string, message: string, onAction?: () => void, actionButtonText?: string, actionIcon?: React.ReactNode) => {
    setErrorModalData({ title, message, onAction, actionButtonText: actionButtonText || '', actionIcon });
    setShowErrorModal(true);
  };

  // Google Sign In handler (still used if needed elsewhere, but removed from popup)
  const handleGoogleSignIn = async () => {
    if (!auth) {
      showErrorPopup('Error', 'Firebase auth not available on this platform');
      return;
    }

    setLoading(true);
    try {
      await setPersistence(auth, browserSessionPersistence);
      const provider = new GoogleAuthProvider();
      provider.addScope('email');
      provider.addScope('profile');
      // See signin.tsx for why this is 'login' and not left at Google's default.
      provider.setCustomParameters({ prompt: 'login' });
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      const idToken = await user.getIdToken();
      const apiResult = await authService.googleAuth(idToken);
      
      if (apiResult.success) {
        router.replace('/(tabs)/home');
      } else {
        await auth.signOut();
        showErrorPopup('Sign In Failed', apiResult.message || 'Google sign in failed');
      }
    } catch (error: any) {
      console.error('Firebase Google Sign-In error:', error);
      let errorMessage = error.message || 'Something went wrong';
      showErrorPopup('Google Sign In Failed', errorMessage);
      try {
        await auth.signOut();
      } catch (signOutError) {
        console.log('Sign out error:', signOutError);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSendOTP = async () => {
    console.log('🔍 handleSendOTP called with email:', email);
    
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
      console.log('📤 Sending forgot password request for:', email);
      const result = await authService.forgotPassword(email);
      console.log('📥 Forgot password response:', result);
      
      if (!result.success) {
        console.log('❌ Forgot password failed:', result.message, result.code);
        
        if (result.code === 'EMAIL_NOT_FOUND') {
          setError('No account found with this email address.');
          setLoading(false);
          return;
        }
        
        if (result.code === 'GOOGLE_ACCOUNT') {
          // ⭐ Inline error instead of popup
          setError("This email is linked to Google. Please use 'Continue with Google' to log in.");
          setLoading(false);
          return;
        }
        
        if (result.code === 'EMAIL_NOT_VERIFIED' || result.message?.toLowerCase().includes('verify')) {
          showToast('Please verify your email address first. Check your inbox for the OTP code.', true);
          setLoading(false);
          return;
        }
        
        showToast(result.message || 'Something went wrong. Please try again.', true);
        setLoading(false);
        return;
      }

      console.log('OTP sent successfully, navigating to verify-otp');
      const maskedEmail = email.replace(/(.{2})(.*)(@.*)/, '$1•••$3');
      showToast(`OTP code sent to ${maskedEmail}`, false);
      // Every other branch above resets loading before returning; this one
      // didn't, since it navigates away instead of returning into this
      // screen. But this screen isn't unmounted by that navigation — Expo
      // Router keeps it alive in the background — so coming back to it
      // later (e.g. tapping Back on verify-otp) resumed this exact stale
      // `loading: true` state, leaving Send OTP permanently spinning/disabled.
      setLoading(false);

      setTimeout(() => {
        router.push({
          pathname: '/(auth)/verify-otp',
          params: { email, purpose: 'reset' },
        });
      }, 400);
      
    } catch (error: any) {
      console.error('❌ Forgot password error:', error);
      
      if (error.code === 'NETWORK_ERROR' || error.message === 'Network Error') {
        showToast('Cannot connect to server. Please check your internet connection.', true);
        setLoading(false);
        return;
      }
      
      if (error.response?.status === 404) {
        const data = error.response?.data;
        if (data?.code === 'EMAIL_NOT_FOUND') {
          setError('No account found with this email address.');
          setLoading(false);
          return;
        }
      }
      
      if (error.response?.status === 400) {
        const data = error.response?.data;
        if (data?.code === 'GOOGLE_ACCOUNT') {
          setError("This email is linked to Google. Please use 'Continue with Google' to log in.");
          setLoading(false);
          return;
        }
        
        if (data?.code === 'EMAIL_NOT_VERIFIED') {
          showToast('Please verify your email address first.', true);
          setLoading(false);
          return;
        }
      }
      
      const errorMessage = error.response?.data?.message || error.message || 'Something went wrong. Please try again.';
      showToast(errorMessage, true);
      setLoading(false);
    } finally {
      console.log('🔚 handleSendOTP finished');
    }
  };

  const handleSubmitEditing = () => {
    handleSendOTP();
  };

  const getOutlineColor = () => {
    if (error) return '#ef4444';
    if (emailFocused) return '#4c6fff';
    return '#dde3fa';
  };

  return (
    <>
      <Stack.Screen options={{
        headerShown: false,
        animation: 'none',
      }} />

      <KeyboardAvoidingView 
        style={styles.flex} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
      >
        <ErrorPopupModal
          visible={showErrorModal}
          title={errorModalData.title}
          message={errorModalData.message}
          onClose={() => setShowErrorModal(false)}
          onAction={errorModalData.onAction}
          actionButtonText={errorModalData.actionButtonText}
          actionIcon={errorModalData.actionIcon}
        />
        
        <CustomToast
          visible={toastVisible}
          message={toastMessage}
          isError={toastIsError}
          onHide={hideToast}
        />
        
        <DiagramBackground />
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <Animated.View
            style={[
              styles.card,
              {
                opacity: cardOpacity,
                transform: [{ translateY: cardTranslateY }],
              },
            ]}
          >
            {/* Connectors */}
            <View style={styles.connectorTop} />
            <View style={styles.connectorBottom} />
            <View style={styles.connectorLeft} />
            <View style={styles.connectorRight} />
            
            <TouchableOpacity style={styles.backBtn} onPress={handleBack} activeOpacity={0.7}>
              <BackIcon />
              <Text style={styles.backText}>Back</Text>
            </TouchableOpacity>
            
            <Text style={styles.heading}>Forgot Password?</Text>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Email Address</Text>
              <View style={getInputWrapperStyle(emailFocused, error)}>
                <TextInput
                  ref={emailInputRef}
                  style={[
                    styles.input, 
                    Platform.OS === 'web' && { 
                      outlineWidth: 1,
                      outlineStyle: 'solid',
                      outlineOffset: 0,
                      borderRadius: 12,
                      outlineColor: getOutlineColor(),
                    }
                  ]}
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
                  returnKeyType="go"
                  blurOnSubmit={false}
                  onSubmitEditing={handleSubmitEditing}
                />
              </View>
              {error ? <Text style={styles.errorText}>{error}</Text> : null}
            </View>

            <TouchableOpacity style={[styles.btnSend, loading && styles.btnDisabled]} onPress={handleSendOTP} activeOpacity={0.9} disabled={loading}>
              {loading ? <ActivityIndicator color="#ffffff" size="small" /> : <Text style={styles.btnSendText}>Send OTP Code</Text>}
            </TouchableOpacity>

            <View style={styles.signinWrap}>
              <Text style={styles.signinText}>Remember your password?</Text>
              <TouchableOpacity onPress={navigateToSignIn}>
                <Text style={styles.signinLink}>Sign In</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#eef2ff' },
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
  heading: { 
    fontSize: 26, 
    fontWeight: '800', 
    color: '#0f172a', 
    textAlign: 'center', 
    letterSpacing: -0.6, 
    marginBottom: 30, 
    marginTop: 30
  },
  formGroup: { 
    marginBottom: 8 
  },
  label: { 
    fontSize: 13, 
    fontWeight: '600', 
    color: '#4a5568', 
    marginBottom: 8 
  },
  inputWrap: { 
    borderWidth: 1, 
    borderColor: '#dde3fa', 
    borderRadius: 12,
    backgroundColor: '#ffffff', 
    flexDirection: 'row', 
    alignItems: 'center',
  },
  inputWrapFocused: { 
    borderWidth: 1,
    backgroundColor: '#ffffff', 
    borderColor: '#3b5bdb',
    shadowColor: '#3b5bdb',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4 
  },
  inputWrapError: { 
    borderColor: '#ef4444',
    borderWidth: 1,
  },
  inputWrapErrorFocused: {
    borderColor: '#ef4444',
    borderWidth: 1,
    backgroundColor: '#ffffff',
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
  },
  input: { 
    flex: 1, 
    paddingHorizontal: 16, 
    paddingVertical: Platform.OS === 'ios' ? 13 : 11, 
    fontSize: 15, 
    color: '#1a1f36',
  },
  errorText: { 
    fontSize: 12, 
    color: '#ef4444', 
    marginTop: 8, 
    marginLeft: 4, 
    fontWeight: '500' 
  },
  btnSend: { 
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
  btnSendText: { 
    color: '#ffffff', 
    fontSize: 15, 
    fontWeight: '700', 
    letterSpacing: 0.3 
  },
  signinWrap: { 
    flexDirection: 'row', 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginTop: 22 
  },
  signinText: { 
    fontSize: 13, 
    color: '#8896b3' 
  },
  signinLink: { 
    fontSize: 13, 
    fontWeight: '700', 
    color: '#3b5bdb', 
    marginLeft: 4 
  },
  // Toast Styles
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
  // Error Modal Styles
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
    justifyContent: 'center',
    flexDirection: 'row',
    backgroundColor: '#3b5bdb',
  },
  errorModalButtonTextPrimary: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});