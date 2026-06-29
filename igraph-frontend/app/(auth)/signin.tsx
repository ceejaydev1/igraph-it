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
} from 'react-native-svg';

import * as authService from '../../services/authService';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
        source={require('../../assets/images/logo.png')}
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

// ─── BACKGROUND ─────────────────────────────────────────────────────────────

const DiagramBackground = () => (
  <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
    <Image source={require('../../assets/images/grid-bg.png')} style={styles.gridBackground} resizeMode="repeat" />
    <View style={styles.gridOverlay} />
    <Svg width="100%" height="100%" viewBox={`0 0 ${SCREEN_WIDTH} ${SCREEN_HEIGHT}`} preserveAspectRatio="xMidYMid slice" style={StyleSheet.absoluteFillObject}>
      <Path d={`M ${SCREEN_WIDTH * 0.08} ${SCREEN_HEIGHT * 0.25} C ${SCREEN_WIDTH * 0.22} ${SCREEN_HEIGHT * 0.10}, ${SCREEN_WIDTH * 0.36} ${SCREEN_HEIGHT * 0.42}, ${SCREEN_WIDTH * 0.52} ${SCREEN_HEIGHT * 0.32}`} stroke="#bfd0ff" strokeWidth="2" strokeDasharray="8 10" fill="none" opacity="0.32" />
      <Path d={`M ${SCREEN_WIDTH * 0.82} ${SCREEN_HEIGHT * 0.18} C ${SCREEN_WIDTH * 0.96} ${SCREEN_HEIGHT * 0.30}, ${SCREEN_WIDTH * 0.95} ${SCREEN_HEIGHT * 0.55}, ${SCREEN_WIDTH * 0.78} ${SCREEN_HEIGHT * 0.76}`} stroke="#bfd0ff" strokeWidth="2" strokeDasharray="8 10" fill="none" opacity="0.32" />
      <Rect x={SCREEN_WIDTH * 0.07} y={SCREEN_HEIGHT * 0.12} width="130" height="72" rx="14" stroke="#bfd0ff" strokeWidth="1.4" fill="none" opacity="0.38" />
      <Rect x={SCREEN_WIDTH * 0.74} y={SCREEN_HEIGHT * 0.16} width="140" height="78" rx="14" stroke="#bfd0ff" strokeWidth="1.4" fill="none" opacity="0.38" />
      <Path d={`M ${SCREEN_WIDTH * 0.15} ${SCREEN_HEIGHT * 0.56} L ${SCREEN_WIDTH * 0.19} ${SCREEN_HEIGHT * 0.60} L ${SCREEN_WIDTH * 0.15} ${SCREEN_HEIGHT * 0.64} L ${SCREEN_WIDTH * 0.11} ${SCREEN_HEIGHT * 0.60} Z`} stroke="#bfd0ff" strokeWidth="1.5" fill="none" opacity="0.35" />
      <Circle cx={SCREEN_WIDTH * 0.76} cy={SCREEN_HEIGHT * 0.72} r="24" stroke="#bfd0ff" strokeWidth="2" fill="none" opacity="0.3" />
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

  const [initialLoading, setInitialLoading] = useState(true);
  const [email, setEmail] = useState((params.prefilledEmail as string) || '');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false);
  const [errors, setErrors] = useState({ email: '', password: '', terms: '' });
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorModalData, setErrorModalData] = useState({
    title: '',
    message: '',
    onAction: undefined as (() => void) | undefined,
    actionButtonText: '',
    actionIcon: undefined as React.ReactNode | undefined,
  });

  const passwordRef = useRef<TextInput>(null);
  const logoSize = getResponsiveLogoSize(windowWidth, windowHeight);
  const isSmallScreen = windowHeight < 680;

  useEffect(() => {
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

  useEffect(() => {
    const checkExistingSession = async () => {
      try {
        const token = await authService.getAccessToken();
        if (token) {
          const response = await authService.verifyToken();
          if (response.success) {
            router.replace('/(tabs)/home');
            return;
          }
        }
      } catch (error) {
        console.log('No valid session found');
      } finally {
        setInitialLoading(false);
      }
    };
    checkExistingSession();
  }, [router]);

  //HANDLERS
  const handleToggleAgreement = useCallback(() => {
    setAgreed((prev) => !prev);
    if (errors.terms) setErrors((prev) => ({ ...prev, terms: '' }));
  }, [errors.terms]);

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

  //GOOGLE SIGN IN
  const handleFirebaseGoogleSignIn = async () => {
    if (!agreed) {
      setErrors((prev) => ({
        ...prev,
        terms: 'You must agree to the Terms and Privacy Policy before continuing',
      }));
      return;
    }
    if (!auth) {
      showErrorPopup('Error', 'Firebase auth not available on this platform');
      return;
    }

    setLoading(true);

    try {
      const provider = new GoogleAuthProvider();
      provider.addScope('email');
      provider.addScope('profile');
      provider.setCustomParameters({ prompt: 'select_account' });

      const result = await signInWithPopup(auth, provider);
      const idToken = await result.user.getIdToken();
      const apiResult = await authService.googleAuth(idToken);

      if (apiResult.success) {
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
      console.error('Google Sign-In error:', error);
      if (error.response?.status === 409) {
        const errorMsg = error.response?.data?.message || '';
        showErrorPopup(
          'Account Already Exists',
          errorMsg || 'This email is already registered with email/password.',
          () => passwordRef.current?.focus(),
          'Sign In with Email/Password',
          <EmailIcon />
        );
      } else if (error.code === 'auth/popup-closed-by-user') {
        // User cancelled
      } else if (error.code === 'auth/popup-blocked') {
        showErrorPopup('Popup Blocked', 'Please allow popups for this website to sign in with Google.', undefined, 'OK');
      } else if (error.code === 'auth/network-request-failed') {
        showErrorPopup('Network Error', 'Unable to reach Google servers. Please check your internet connection.', undefined, 'OK');
      } else if (error.code === 'auth/internal-error' || error.message?.includes('Failed to fetch')) {
        showErrorPopup('Google Sign In Unavailable', 'Google Sign-In is currently unavailable. Please use email/password to sign in instead.', undefined, 'OK');
      } else {
        showErrorPopup('Google Sign In Failed', error.message || 'Something went wrong. Please try again.', undefined, 'OK');
      }
    } finally {
      setLoading(false);
    }
  };

  //EMAIL & PASSWORD SIGNIN
  const handleSignIn = async () => {
    const newErrors = { email: '', password: '', terms: '' };

    if (!email) newErrors.email = 'Email is required';
    if (!password) newErrors.password = 'Password is required';
    if (!agreed) newErrors.terms = 'You must agree to the Terms and Privacy Policy';

    setErrors(newErrors);

    if (newErrors.email || newErrors.password || newErrors.terms) return;

    setLoading(true);
    const startTime = Date.now();

    try {
      const result = await authService.signIn(email, password);
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
          // *** INLINE ERROR instead of popup ***
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
          // *** INLINE ERROR instead of popup ***
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

  if (initialLoading) {
    return null;
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />

      <ErrorPopupModal 
        visible={showErrorModal} 
        title={errorModalData.title} 
        message={errorModalData.message} 
        onClose={() => setShowErrorModal(false)} 
        onAction={errorModalData.onAction} 
        actionButtonText={errorModalData.actionButtonText}
        actionIcon={errorModalData.actionIcon}
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

            <View style={styles.card}>
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
                  <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowPassword(!showPassword)}>
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
                <Text style={styles.orText}>OR</Text>
                <View style={styles.line} />
              </View>

              {Platform.OS === 'web' ? (
                <TouchableOpacity style={[styles.btnGoogle, loading && styles.btnDisabled]} onPress={handleFirebaseGoogleSignIn} activeOpacity={0.85} disabled={loading}>
                  {loading ? <ActivityIndicator color="#3b5bdb" size="small" /> : <GoogleIcon />}
                  <Text style={styles.btnGoogleText}>Continue with Google</Text>
                </TouchableOpacity>
              ) : null}

              {/* ── Terms Checkbox ── */}
              <View style={[styles.termsWrap, errors.terms && styles.termsError]}>
                <TouchableOpacity onPress={handleToggleAgreement} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <View style={[styles.customCheckbox, agreed && styles.customCheckboxChecked]}>
                    {agreed && (
                      <Svg width={9} height={9} viewBox="0 0 10 10">
                        <Path d="M2 5l2.5 2.5L8 3" stroke="white" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" fill="none" />
                      </Svg>
                    )}
                  </View>
                </TouchableOpacity>
                <Text style={styles.termsText}>
                  By signing in, you agree to the{' '}
                  <Text style={styles.termsLink} onPress={openPrivacyPage}>Terms and Condition</Text>
                  {' & '}
                  <Text style={styles.termsLink} onPress={openPrivacyPage}>Privacy Policy</Text>
                </Text>
              </View>
              {errors.terms ? <Text style={styles.errorText}>{errors.terms}</Text> : null}

              <View style={styles.signupWrap}>
                <Text style={styles.signupText}>New here? </Text>
                <TouchableOpacity onPress={() => router.push('/(auth)/signup')}>
                  <Text style={styles.signupLink}>Sign Up</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#eef2ff' },
  splashContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#eef2ff' },
  gridBackground: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
  gridOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(255,255,255,0.10)' },
  scrollContent: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 20, paddingHorizontal: 12, minHeight: SCREEN_HEIGHT },
  cardOuter: { width: '100%', maxWidth: 400, minWidth: 300, alignItems: 'center' },
  card: { backgroundColor: '#ffffff', borderRadius: 20, paddingHorizontal: 24, paddingVertical: 20, paddingTop: 44, width: '100%', position: 'relative', shadowColor: '#1e293b', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.06, shadowRadius: 20, elevation: 8, marginTop: 0, borderColor: '#f1f5ff' },
  connectorTop: { position: 'absolute', top: -4, alignSelf: 'center', width: 8, height: 8, borderRadius: 4, backgroundColor: '#ffffff', borderWidth: 1.5, borderColor: '#c7d2fe' },
  connectorBottom: { position: 'absolute', bottom: -4, alignSelf: 'center', width: 8, height: 8, borderRadius: 4, backgroundColor: '#ffffff', borderWidth: 1.5, borderColor: '#c7d2fe' },
  connectorLeft: { position: 'absolute', left: -4, top: '50%', transform: [{ translateY: -4 }], width: 8, height: 8, borderRadius: 4, backgroundColor: '#ffffff', borderWidth: 1.5, borderColor: '#c7d2fe' },
  connectorRight: { position: 'absolute', right: -4, top: '50%', transform: [{ translateY: -4 }], width: 8, height: 8, borderRadius: 4, backgroundColor: '#ffffff', borderWidth: 1.5, borderColor: '#c7d2fe' },
  logoWrap: { alignItems: 'center', justifyContent: 'center', marginBottom: -36, zIndex: 10 },
  logoWrapper: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#eef2ff', borderWidth: 2.5, borderColor: '#3b5bdb', shadowColor: '#3b5bdb', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 8, elevation: 5 },
  logo: { backgroundColor: 'transparent' },
  heading: { fontSize: 24, fontWeight: '800', color: '#0f172a', textAlign: 'center', marginBottom: 2 },
  subtitle: { fontSize: 13, color: '#64748b', marginBottom: 16, textAlign: 'center' },
  formGroup: { marginBottom: 12 },
  label: { fontSize: 12, fontWeight: '600', color: '#334155', marginBottom: 4 },
  inputWrap: { borderWidth: 1, borderColor: '#dde3fa', borderRadius: 10, backgroundColor: '#ffffff', minHeight: 38, justifyContent: 'center' },
  inputWrapFocused: { backgroundColor: '#ffffff', shadowColor: '#3b5bdb', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 8, elevation: 3 },
  input: { flex: 1, paddingHorizontal: 12, paddingVertical: Platform.OS === 'ios' ? 10 : 9, fontSize: 14, color: '#1a1f36', backgroundColor: 'transparent', minHeight: 40, textAlignVertical: 'center' },
  inputWithIcon: { paddingRight: 40 },
  eyeBtn: { position: 'absolute', right: 8, padding: 10 },
  optionsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4, marginBottom: 0 },
  rememberMeRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  checkbox: { width: 16, height: 16, borderRadius: 4, borderWidth: 2, borderColor: '#8896b3', alignItems: 'center', justifyContent: 'center' },
  checkboxChecked: { backgroundColor: '#3b5bdb', borderColor: '#3b5bdb' },
  rememberMeText: { fontSize: 12, color: '#4a5568' },
  forgotWrap: { alignItems: 'flex-end' },
  forgotText: { fontSize: 12, color: '#8896b3', fontWeight: '500' },
  inputError: { borderColor: '#e11d48' },
  termsError: { borderColor: '#e11d48' },
  errorText: { fontSize: 11, color: '#e11d48', marginTop: 4, marginLeft: 4, fontWeight: '500' },
  btnSignIn: { backgroundColor: '#3b5bdb', borderRadius: 10, borderWidth: 1, borderColor: '#2f49c7', paddingVertical: 10, alignItems: 'center', marginTop: 2, shadowColor: '#3b5bdb', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.2, shadowRadius: 12, elevation: 6 },
  btnDisabled: { opacity: 0.75 },
  btnSignInText: { color: '#ffffff', fontSize: 14, fontWeight: '700', letterSpacing: 0.3 },
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 6 },
  line: { flex: 1, height: 1, backgroundColor: '#e5e9f5' },
  orText: { marginHorizontal: 10, fontSize: 11, color: '#8896b3', fontWeight: '600' },
  btnGoogle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, paddingVertical: 9, marginTop: 2, backgroundColor: '#ffffff' },
  btnGoogleText: { fontSize: 13, fontWeight: '500', color: '#1a1f36', marginLeft: 6 },
  termsWrap: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginTop: 8, padding: 8, borderWidth: 1, borderColor: '#e2e6f3', borderRadius: 8, backgroundColor: '#f8f9ff' },
  customCheckbox: { width: 16, height: 16, borderRadius: 8, borderWidth: 2, borderColor: '#8896b3', alignItems: 'center', justifyContent: 'center', marginTop: 1, flexShrink: 0 },
  customCheckboxChecked: { borderColor: '#3b5bdb', backgroundColor: '#3b5bdb' },
  termsText: { fontSize: 12, color: '#4a5568', flex: 1, lineHeight: 17 },
  termsLink: { fontWeight: '700', color: '#3b5bdb' },
  signupWrap: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 12 },
  signupText: { fontSize: 12, color: '#64748b' },
  signupLink: { fontSize: 12, fontWeight: '700', color: '#3b5bdb' },
  errorModalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'center', alignItems: 'center' },
  errorModalContainer: { width: '85%', maxWidth: 320, backgroundColor: '#FFFFFF', borderRadius: 20, padding: 22, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 8 },
  errorModalIconWrapper: { marginBottom: 14 },
  errorModalIconCircle: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#f0f4ff', justifyContent: 'center', alignItems: 'center' },
  errorModalTitle: { fontSize: 18, fontWeight: '700', color: '#1e293b', textAlign: 'center', marginBottom: 8 },
  errorModalMessage: { fontSize: 13, color: '#64748b', textAlign: 'center', lineHeight: 19, marginBottom: 20 },
  errorModalButtonPrimary: { width: '100%', paddingVertical: 11, borderRadius: 10, alignItems: 'center', backgroundColor: '#3b5bdb', flexDirection: 'row', justifyContent: 'center' },
  errorModalButtonTextPrimary: { color: '#ffffff', fontSize: 15, fontWeight: '600' },
});