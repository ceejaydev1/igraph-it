// app/(auth)/signup.tsx

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
import { Stack, useRouter } from 'expo-router';
import { Svg, Circle, Rect, Path } from 'react-native-svg';
import * as authService from '@/services/authService';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// ─── RESPONSIVE LOGO SIZE HELPER ──────────────────────────────────────────────────────────────

const getResponsiveLogoSize = (windowWidth: number): number => {
  if (Platform.OS === 'web') {
    if (windowWidth < 480) return 48;
    if (windowWidth < 768) return 56;
    if (windowWidth < 1024) return 64;
    if (windowWidth < 1440) return 72;
    return 80;
  }
  
  if (Platform.OS === 'ios') return 56;
  if (Platform.OS === 'android') return 52;
  return 56;
};

// ─── ANIMATED LOGO ────────────────────────────────────────────────────────────

const AnimatedLogo = ({
  size = 56,
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
  const rotate = rotateAnim.interpolate({ inputRange: [0, 1], outputRange: ['-5deg', '0deg'] });
  const opacity = entranceAnim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 0.5, 1] });

  return (
    <Animated.View
      style={[styles.logoWrapper, { opacity, transform: [{ scale }, { scale: pulseAnim }, { rotate }] }]}
    >
      <Image
        source={require('../../assets/images/logo.png')}
        style={[styles.logo, { width: size, height: size, borderRadius: size * 0.25 }]}
        resizeMode="contain"
      />
    </Animated.View>
  );
};

// ─── TOAST HELPER ─────────────────────────────────────────────────────────────

const showToastMessage = (message: string, isError: boolean = false) => {
  if (Platform.OS === 'android') {
    ToastAndroid.show(message, ToastAndroid.SHORT);
  } else if (Platform.OS === 'ios') {
    Alert.alert(isError ? 'Error' : 'Success', message);
  }
};

// ─── TERMS CONTENT ────────────────────────────────────────────────────────────

const TermsContent = () => (
  <View style={modalStyles.tabContent}>
    <Text style={modalStyles.sectionTitle}>1. Acceptance of Terms</Text>
    <Text style={modalStyles.text}>
      By registering for or using iGraph IT ("Platform"), you agree to be bound by these Terms and
      Conditions.
    </Text>

    <Text style={modalStyles.sectionTitle}>2. Account Registration</Text>
    <Text style={modalStyles.subSection}>2.1 Account Security</Text>
    <Text style={modalStyles.text}>
      • You are responsible for maintaining password confidentiality{'\n'}
      • You must notify us immediately of unauthorized access
    </Text>
    <Text style={modalStyles.subSection}>2.2 Accuracy of Information</Text>
    <Text style={modalStyles.text}>
      You must provide accurate, current, and complete information during registration.
    </Text>

    <Text style={modalStyles.sectionTitle}>3. User Conduct</Text>
    <Text style={modalStyles.text}>
      You agree NOT to share account credentials, bypass authentication, use automated scripts,
      upload malicious content, or use the Platform for illegal activities.
    </Text>

    <Text style={modalStyles.sectionTitle}>4. Intellectual Property</Text>
    <Text style={modalStyles.text}>
      All platform content is owned by iGraph IT. You retain ownership of diagrams you create.
    </Text>

    <Text style={modalStyles.sectionTitle}>5. Authentication and Security</Text>
    <Text style={modalStyles.text}>
      • Access tokens expire after 15 minutes{'\n'}
      • Refresh tokens expire after 7 days{'\n'}
      • OTPs expire after 5 minutes
    </Text>

    <Text style={modalStyles.sectionTitle}>6. Limitation of Liability</Text>
    <Text style={modalStyles.text}>
      The Platform is provided "as is". We are not liable for indirect or consequential damages.
    </Text>

    <Text style={modalStyles.sectionTitle}>7. Governing Law</Text>
    <Text style={modalStyles.text}>These terms are governed by the laws of the Philippines.</Text>

    <Text style={modalStyles.sectionTitle}>8. Contact Us</Text>
    <Text style={modalStyles.text}>Email: legal@igraphit.com</Text>

    <Text style={modalStyles.footer}>By using iGraph IT, you agree to these Terms and Conditions.</Text>
  </View>
);

// ─── PRIVACY CONTENT ──────────────────────────────────────────────────────────

const PrivacyContent = () => (
  <View style={modalStyles.tabContent}>
    <Text style={modalStyles.sectionTitle}>1. Introduction</Text>
    <Text style={modalStyles.text}>
      We are committed to protecting your personal information and your right to privacy.
    </Text>

    <Text style={modalStyles.sectionTitle}>2. Information We Collect</Text>
    <Text style={modalStyles.subSection}>Personal Information</Text>
    <Text style={modalStyles.text}>
      Full name, email address, encrypted password, profile picture (optional).
    </Text>
    <Text style={modalStyles.subSection}>Usage Data</Text>
    <Text style={modalStyles.text}>Pages visited, diagrams created, time spent on platform.</Text>

    <Text style={modalStyles.sectionTitle}>3. How We Use Your Information</Text>
    <Text style={modalStyles.text}>
      To create and manage your account, authenticate your identity, send OTP verification, improve
      our platform, and comply with legal obligations.
    </Text>

    <Text style={modalStyles.sectionTitle}>4. Data Storage and Security</Text>
    <Text style={modalStyles.text}>
      Passwords are encrypted using bcrypt. All data is stored in Firebase Firestore with HTTPS/TLS
      encryption.
    </Text>

    <Text style={modalStyles.sectionTitle}>5. Email Communications</Text>
    <Text style={modalStyles.text}>
      We send account verification OTPs and password reset links. These are essential and cannot be
      opted out of.
    </Text>

    <Text style={modalStyles.sectionTitle}>6. Your Rights</Text>
    <Text style={modalStyles.text}>
      You have the right to access your data, correct inaccurate data, delete your account, and
      export your data.
    </Text>

    <Text style={modalStyles.sectionTitle}>7. Contact Us</Text>
    <Text style={modalStyles.text}>Email: privacy@igraphit.com</Text>

    <Text style={modalStyles.footer}>By using iGraph IT, you agree to this Privacy Policy.</Text>
  </View>
);

// ─── POLICY MODAL (scroll-to-bottom enforcement per tab) ──────────────────────

const PolicyModal = ({
  visible,
  onClose,
  onAgree,
}: {
  visible: boolean;
  onClose: () => void;
  onAgree: () => void;
}) => {
  const { width: ww, height: wh } = useWindowDimensions();
  const [activeTab, setActiveTab] = useState<'terms' | 'privacy'>('terms');
  const scrollViewRef = useRef<ScrollView>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [termsRead, setTermsRead] = useState(false);
  const [privacyRead, setPrivacyRead] = useState(false);

  const bothRead = termsRead && privacyRead;

  // Reset read state every time the modal opens
  useEffect(() => {
    if (visible) {
      setTermsRead(false);
      setPrivacyRead(false);
      setActiveTab('terms');
      setShowScrollTop(false);
    }
  }, [visible]);

  const handleTabSwitch = (tab: 'terms' | 'privacy') => {
    setActiveTab(tab);
    setShowScrollTop(false);
    scrollViewRef.current?.scrollTo({ y: 0, animated: false });
  };

  const handleScroll = (event: any) => {
    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
    setShowScrollTop(contentOffset.y > 200);
    const isAtBottom = layoutMeasurement.height + contentOffset.y >= contentSize.height - 40;
    if (isAtBottom) {
      if (activeTab === 'terms') setTermsRead(true);
      else setPrivacyRead(true);
    }
  };

  const scrollToTop = () => scrollViewRef.current?.scrollTo({ y: 0, animated: true });

  const handleAgree = () => {
    onAgree();
    onClose();
  };

  const modalWidth = Math.min(ww - 40, 500);
  const modalMaxHeight = wh - 80;

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
      accessible={true}
      accessibilityLabel="Terms and Conditions agreement"
      accessibilityRole="alert"
    >
      <View style={modalStyles.modalOverlay}>
        <View style={[modalStyles.modalContainer, { width: modalWidth, maxHeight: modalMaxHeight }]}>
          {/* Header */}
          <View style={modalStyles.modalHeader}>
            <Text style={modalStyles.modalTitle}>Legal Agreement</Text>
          </View>

          {/* Tabs */}
          <View style={modalStyles.tabBar}>
            <TouchableOpacity
              style={[modalStyles.tab, activeTab === 'terms' && modalStyles.activeTab]}
              onPress={() => handleTabSwitch('terms')}
              accessibilityLabel="Terms and Conditions tab"
              accessibilityRole="tab"
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={[modalStyles.tabText, activeTab === 'terms' && modalStyles.activeTabText]}>
                  Terms & Conditions
                </Text>
                {termsRead && (
                  <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
                    <Circle cx="12" cy="12" r="10" fill="#3b5bdb" />
                    <Path
                      d="M8 12l2.5 2.5L16 9"
                      stroke="white"
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </Svg>
                )}
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              style={[modalStyles.tab, activeTab === 'privacy' && modalStyles.activeTab]}
              onPress={() => handleTabSwitch('privacy')}
              accessibilityLabel="Privacy Policy tab"
              accessibilityRole="tab"
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={[modalStyles.tabText, activeTab === 'privacy' && modalStyles.activeTabText]}>
                  Privacy Policy
                </Text>
                {privacyRead && (
                  <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
                    <Circle cx="12" cy="12" r="10" fill="#3b5bdb" />
                    <Path
                      d="M8 12l2.5 2.5L16 9"
                      stroke="white"
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </Svg>
                )}
              </View>
            </TouchableOpacity>
          </View>

          {/* Scroll hint banner */}
          {!bothRead && (
            <View style={modalStyles.scrollHintBanner}>
              <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
                <Path
                  d="M12 5v14M5 12l7 7 7-7"
                  stroke="#3b5bdb"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </Svg>
              <Text style={modalStyles.scrollHintText}>
                Please scroll to the bottom of{' '}
                {!termsRead && !privacyRead
                  ? 'both documents'
                  : !termsRead
                  ? 'Terms & Conditions'
                  : 'Privacy Policy'}{' '}
                to enable Agree
              </Text>
            </View>
          )}

          <ScrollView
            ref={scrollViewRef}
            showsVerticalScrollIndicator={true}
            onScroll={handleScroll}
            scrollEventThrottle={16}
            accessibilityLabel="Legal document content"
          >
            {activeTab === 'terms' ? <TermsContent /> : <PrivacyContent />}
          </ScrollView>

          {showScrollTop && (
            <TouchableOpacity
              style={modalStyles.scrollTopButton}
              onPress={scrollToTop}
              activeOpacity={0.8}
              accessibilityLabel="Scroll to top"
            >
              <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
                <Path
                  d="M12 19V5M5 12l7-7 7 7"
                  stroke="#ffffff"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </Svg>
            </TouchableOpacity>
          )}

          {/* Footer */}
          <View style={modalStyles.modalFooter}>
            <TouchableOpacity
              style={[modalStyles.agreeButton, !bothRead && modalStyles.agreeButtonDisabled]}
              onPress={bothRead ? handleAgree : undefined}
              activeOpacity={bothRead ? 0.7 : 1}
              accessibilityLabel={bothRead ? 'Agree to terms' : 'Read both documents to enable agree'}
            >
              <Text style={[modalStyles.agreeButtonText, !bothRead && modalStyles.agreeButtonTextDisabled]}>
                {bothRead ? 'I Agree' : 'Read First'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={modalStyles.declineButton}
              onPress={onClose}
              activeOpacity={0.7}
              accessibilityLabel="Decline terms"
            >
              <Text style={modalStyles.declineButtonText}>Decline</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

// ─── ERROR POPUP MODAL ────────────────────────────────────────────────────────

const ErrorPopupModal = ({
  visible,
  title,
  message,
  onClose,
  onAction,
  actionButtonText,
}: {
  visible: boolean;
  title: string;
  message: string;
  onClose: () => void;
  onAction?: () => void;
  actionButtonText?: string;
}) => {
  return (
    <Modal animationType="fade" transparent={true} visible={visible} onRequestClose={onClose}>
      <TouchableOpacity style={styles.errorModalOverlay} activeOpacity={1} onPress={onClose}>
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
          {onAction ? (
            <TouchableOpacity
              style={styles.errorModalButtonPrimary}
              onPress={() => { onClose(); onAction(); }}
            >
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

// ─── SUCCESS MODAL ────────────────────────────────────────────────────────────

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
              <Svg width={32} height={32} viewBox="0 0 24 24" fill="none">
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

// ─── BACKGROUND ───────────────────────────────────────────────────────────────

const DiagramBackground = () => (
  <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
    <Image
      source={require('../../assets/images/grid-bg.png')}
      style={styles.gridBackground}
      resizeMode="repeat"
    />
    <View style={styles.gridOverlay} />
    <Svg
      width="100%"
      height="100%"
      viewBox={`0 0 ${SCREEN_WIDTH} ${SCREEN_HEIGHT}`}
      style={StyleSheet.absoluteFillObject}
    >
      <Path
        d={`M ${SCREEN_WIDTH * 0.08} ${SCREEN_HEIGHT * 0.22} C ${SCREEN_WIDTH * 0.20} ${
          SCREEN_HEIGHT * 0.08
        }, ${SCREEN_WIDTH * 0.38} ${SCREEN_HEIGHT * 0.42}, ${SCREEN_WIDTH * 0.52} ${
          SCREEN_HEIGHT * 0.30
        }`}
        stroke="#bfd0ff"
        strokeWidth="2"
        strokeDasharray="8 10"
        fill="none"
        opacity="0.30"
      />
      <Rect
        x={SCREEN_WIDTH * 0.08}
        y={SCREEN_HEIGHT * 0.12}
        width="130"
        height="74"
        rx="14"
        stroke="#bfd0ff"
        strokeWidth="1.4"
        fill="none"
        opacity="0.38"
      />
      <Rect
        x={SCREEN_WIDTH * 0.74}
        y={SCREEN_HEIGHT * 0.20}
        width="140"
        height="78"
        rx="14"
        stroke="#bfd0ff"
        strokeWidth="1.4"
        fill="none"
        opacity="0.38"
      />
      <Circle
        cx={SCREEN_WIDTH * 0.76}
        cy={SCREEN_HEIGHT * 0.74}
        r="22"
        stroke="#bfd0ff"
        strokeWidth="2"
        fill="none"
        opacity="0.30"
      />
    </Svg>
  </View>
);

// ─── EYE ICON ─────────────────────────────────────────────────────────────────

const EyeIcon = ({ visible }: { visible: boolean }) => (
  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
    {visible ? (
      <>
        <Path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="#8896b3" strokeWidth={1.8} />
        <Circle cx={12} cy={12} r={3} stroke="#8896b3" strokeWidth={1.8} />
      </>
    ) : (
      <>
        <Path
          d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"
          stroke="#8896b3"
          strokeWidth={1.8}
        />
        <Path
          d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"
          stroke="#8896b3"
          strokeWidth={1.8}
        />
        <Path d="M1 1l22 22" stroke="#8896b3" strokeWidth={1.8} />
      </>
    )}
  </Svg>
);

// ─── PASSWORD PROGRESSIVE VALIDATION ──────────────────────────────────────────

interface PasswordValidation {
  minLength: boolean;
  hasUpper: boolean;
  hasLower: boolean;
  hasNumber: boolean;
}

const PasswordStrengthIndicator = ({ password }: { password: string }) => {
  const [validation, setValidation] = useState<PasswordValidation>({
    minLength: false,
    hasUpper: false,
    hasLower: false,
    hasNumber: false,
  });

  useEffect(() => {
    setValidation({
      minLength: password.length >= 8,
      hasUpper: /[A-Z]/.test(password),
      hasLower: /[a-z]/.test(password),
      hasNumber: /[0-9]/.test(password),
    });
  }, [password]);

  const getStrength = () => {
    const passed = Object.values(validation).filter(Boolean).length;
    if (passed === 4) return { text: 'Strong password!', color: '#10b981', percentage: 100 };
    if (passed === 3) return { text: 'Good password', color: '#f59e0b', percentage: 75 };
    if (passed > 0) return { text: 'Weak password', color: '#ef4444', percentage: 50 };
    return { text: 'Enter a password', color: '#8896b3', percentage: 0 };
  };

  const strength = getStrength();

  if (!password) return null;

  return (
    <View style={styles.strengthContainer}>
      <View style={styles.strengthBar}>
        <View style={[styles.strengthFill, { width: `${strength.percentage}%`, backgroundColor: strength.color }]} />
      </View>
      <Text style={[styles.strengthText, { color: strength.color }]}>{strength.text}</Text>
      <View style={styles.validationList}>
        <Text style={[styles.validationItem, validation.minLength && styles.validationValid]}>
          {validation.minLength ? '✓' : '○'} At least 8 characters
        </Text>
        <Text style={[styles.validationItem, validation.hasUpper && styles.validationValid]}>
          {validation.hasUpper ? '✓' : '○'} One uppercase letter
        </Text>
        <Text style={[styles.validationItem, validation.hasLower && styles.validationValid]}>
          {validation.hasLower ? '✓' : '○'} One lowercase letter
        </Text>
        <Text style={[styles.validationItem, validation.hasNumber && styles.validationValid]}>
          {validation.hasNumber ? '✓' : '○'} One number
        </Text>
      </View>
    </View>
  );
};

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

export default function SignUp() {
  const router = useRouter();
  const { width: windowWidth } = useWindowDimensions();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false);
  const [showPolicyModal, setShowPolicyModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [errorModalData, setErrorModalData] = useState({
    title: '',
    message: '',
    onAction: undefined as (() => void) | undefined,
    actionButtonText: '',
  });
  const [successModalData, setSuccessModalData] = useState({
    title: '',
    message: '',
  });
  const [errors, setErrors] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    agreed: '',
  });

  const [fullNameFocused, setFullNameFocused] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [confirmPasswordFocused, setConfirmPasswordFocused] = useState(false);

  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const confirmPasswordRef = useRef<TextInput>(null);

  const logoSize = getResponsiveLogoSize(windowWidth);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const openPolicyModal = () => setShowPolicyModal(true);

  const handleAgree = useCallback(() => {
    setAgreed(true);
    setErrors((prev) => ({ ...prev, agreed: '' }));
  }, []);

  const handleToggleAgreement = useCallback(() => {
    if (!agreed) {
      openPolicyModal();
    } else {
      setAgreed(false);
    }
  }, [agreed]);

  const showErrorPopup = (
    title: string,
    message: string,
    onAction?: () => void,
    actionButtonText?: string
  ) => {
    setErrorModalData({ title, message, onAction, actionButtonText: actionButtonText || '' });
    setShowErrorModal(true);
  };

  const showSuccessPopup = (title: string, message: string) => {
    setSuccessModalData({ title, message });
    setShowSuccessModal(true);
  };

  // ── Real-time password validation ────────────────────────────────────────

  const isPasswordValid = (pwd: string) => {
    return pwd.length >= 8 && /[A-Z]/.test(pwd) && /[a-z]/.test(pwd) && /[0-9]/.test(pwd);
  };

  const doPasswordsMatch = () => {
    if (!confirmPassword) return null;
    return password === confirmPassword;
  };

  // ── Validation ────────────────────────────────────────────────────────────

  const validate = () => {
    const newErrors = {
      fullName: '',
      email: '',
      password: '',
      confirmPassword: '',
      agreed: '',
    };
    let isValid = true;

    if (!fullName.trim()) {
      newErrors.fullName = 'Name is required.';
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
    } else if (!isPasswordValid(password)) {
      newErrors.password = 'Please meet all password requirements below.';
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
      newErrors.agreed = 'You must agree to the Terms and Privacy Policy.';
      isValid = false;
      openPolicyModal();
    }

    setErrors(newErrors);
    return isValid;
  };

  // ── Sign Up ───────────────────────────────────────────────────────────────

  const handleGoogleSignInRedirect = () => {
    router.push({ pathname: '/(auth)/signin', params: { prefilledEmail: email } });
  };

  const handleSignUp = async () => {
    if (!validate()) return;

    setLoading(true);
    try {
      const result = await authService.signUp({ fullName, email, password });

      if (result.success) {
        setShowSuccessAnimation(true);
        setTimeout(() => {
          showSuccessPopup(
            'Verification Code Sent!',
            `We've sent a 6-digit verification code to ${email.replace(/(.{2})(.*)(@.*)/, '$1•••$3')}`
          );
          setTimeout(() => {
            router.push({ pathname: '/(auth)/verify-otp', params: { email, purpose: 'register' } });
          }, 1500);
        }, 800);
      } else {
        const msg = result.message || '';
        if (
          msg.toLowerCase().includes('google') ||
          msg.toLowerCase().includes('oauth') ||
          msg.toLowerCase().includes('already registered with google')
        ) {
          showErrorPopup(
            'Google Account Detected',
            'This email is already registered with Google. Would you like to sign in with Google instead?',
            handleGoogleSignInRedirect,
            'Sign In with Google'
          );
        } else {
          showToastMessage(msg || 'Something went wrong', true);
        }
      }
    } catch (error: any) {
      console.error('Sign up error:', error);
      const statusCode = error.response?.status ?? 0;
      const errorMessage =
        error.response?.data?.message ||
        error.response?.data?.error ||
        error.message ||
        'Something went wrong';

      if (
        statusCode === 409 ||
        errorMessage.toLowerCase().includes('already registered') ||
        errorMessage.toLowerCase().includes('already exists')
      ) {
        if (
          errorMessage.toLowerCase().includes('google') ||
          errorMessage.toLowerCase().includes('oauth')
        ) {
          showErrorPopup(
            'Google Account Detected',
            'This email is already registered with Google. Would you like to sign in with Google instead?',
            handleGoogleSignInRedirect,
            'Sign In with Google'
          );
        } else {
          showErrorPopup(
            'Email Already Exists',
            'An account with this email already exists. Would you like to sign in with email/password instead?',
            () => router.push({ pathname: '/(auth)/signin', params: { prefilledEmail: email } }),
            'Sign In with Email/Password'
          );
        }
      } else {
        showToastMessage(errorMessage, true);
      }
    } finally {
      setLoading(false);
    }
  };

  const isAnyInputFocused =
    fullNameFocused || emailFocused || passwordFocused || confirmPasswordFocused;

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />

      <PolicyModal        visible={showPolicyModal}
        onClose={() => setShowPolicyModal(false)}
        onAgree={handleAgree}
      />

      <ErrorPopupModal
        visible={showErrorModal}
        title={errorModalData.title}
        message={errorModalData.message}
        onClose={() => setShowErrorModal(false)}
        onAction={errorModalData.onAction}
        actionButtonText={errorModalData.actionButtonText}
      />

      <SuccessModal
        visible={showSuccessModal}
        title={successModalData.title}
        message={successModalData.message}
        onClose={() => setShowSuccessModal(false)}
        buttonText="Continue"
      />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
      >
        <DiagramBackground />

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={true}
          bounces={true}
        >
          <View style={styles.card}>
            <View style={styles.connectorTop} />
            <View style={styles.connectorBottom} />
            <View style={styles.connectorLeft} />
            <View style={styles.connectorRight} />

            {/* Logo with responsive sizing */}
            <View style={styles.logoWrap}>
              <AnimatedLogo
                size={logoSize}
                isInputFocused={isAnyInputFocused}
                showSuccess={showSuccessAnimation}
              />
            </View>

            <Text style={styles.heading}>Create Account</Text>

            {/* Full Name */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Name</Text>
              <View
                style={[
                  styles.inputWrap,
                  fullNameFocused && styles.inputWrapFocused,
                  errors.fullName ? styles.inputError : null,
                ]}
              >
                <TextInput
                  style={[styles.input, Platform.OS === 'web' ? { outlineWidth: 0 } : null]}
                  placeholder="Juan dela Cruz"
                  placeholderTextColor="#b8c0d4"
                  value={fullName}
                  onChangeText={(text) => { setFullName(text); setErrors({ ...errors, fullName: '' }); }}
                  onFocus={() => setFullNameFocused(true)}
                  onBlur={() => setFullNameFocused(false)}
                  autoCapitalize="words"
                  returnKeyType="next"
                  onSubmitEditing={() => emailRef.current?.focus()}
                />
              </View>
              {errors.fullName ? <Text style={styles.fieldError}>{errors.fullName}</Text> : null}
            </View>

            {/* Email */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Email Address</Text>
              <View
                style={[
                  styles.inputWrap,
                  emailFocused && styles.inputWrapFocused,
                  errors.email ? styles.inputError : null,
                ]}
              >
                <TextInput
                  ref={emailRef}
                  style={[styles.input, Platform.OS === 'web' ? { outlineWidth: 0 } : null]}
                  placeholder="you@example.com"
                  placeholderTextColor="#b8c0d4"
                  value={email}
                  onChangeText={(text) => { setEmail(text); setErrors({ ...errors, email: '' }); }}
                  onFocus={() => setEmailFocused(true)}
                  onBlur={() => setEmailFocused(false)}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  returnKeyType="next"
                  onSubmitEditing={() => passwordRef.current?.focus()}
                />
              </View>
              {errors.email ? <Text style={styles.fieldError}>{errors.email}</Text> : null}
            </View>

            {/* Password with strength indicator */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Password</Text>
              <View
                style={[
                  styles.inputWrap,
                  passwordFocused && styles.inputWrapFocused,
                  errors.password ? styles.inputError : null,
                ]}
              >
                <TextInput
                  ref={passwordRef}
                  style={[styles.input, styles.inputWithIcon, Platform.OS === 'web' ? { outlineWidth: 0 } : null]}
                  placeholder="Create a strong password"
                  placeholderTextColor="#b8c0d4"
                  value={password}
                  onChangeText={(text) => { setPassword(text); setErrors({ ...errors, password: '' }); }}
                  onFocus={() => setPasswordFocused(true)}
                  onBlur={() => setPasswordFocused(false)}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  returnKeyType="next"
                  onSubmitEditing={() => confirmPasswordRef.current?.focus()}
                />
                <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowPassword(!showPassword)}>
                  <EyeIcon visible={showPassword} />
                </TouchableOpacity>
              </View>
              <PasswordStrengthIndicator password={password} />
              {errors.password ? <Text style={styles.fieldError}>{errors.password}</Text> : null}
            </View>

            {/* Confirm Password */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Confirm Password</Text>
              <View
                style={[
                  styles.inputWrap,
                  confirmPasswordFocused && styles.inputWrapFocused,
                  errors.confirmPassword ? styles.inputError : null,
                ]}
              >
                <TextInput
                  ref={confirmPasswordRef}
                  style={[styles.input, styles.inputWithIcon, Platform.OS === 'web' ? { outlineWidth: 0 } : null]}
                  placeholder="Re-enter your password"
                  placeholderTextColor="#b8c0d4"
                  value={confirmPassword}
                  onChangeText={(text) => { setConfirmPassword(text); setErrors({ ...errors, confirmPassword: '' }); }}
                  onFocus={() => setConfirmPasswordFocused(true)}
                  onBlur={() => setConfirmPasswordFocused(false)}
                  secureTextEntry={!showConfirmPassword}
                  autoCapitalize="none"
                  returnKeyType="done"
                  onSubmitEditing={handleSignUp}
                />
                <TouchableOpacity
                  style={styles.eyeBtn}
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  <EyeIcon visible={showConfirmPassword} />
                </TouchableOpacity>
              </View>
              {doPasswordsMatch() === false && !errors.confirmPassword ? (
                <Text style={styles.fieldError}>Passwords do not match</Text>
              ) : doPasswordsMatch() && password ? (
                <Text style={styles.matchSuccess}>✓ Passwords match</Text>
              ) : null}
              {errors.confirmPassword ? <Text style={styles.fieldError}>{errors.confirmPassword}</Text> : null}
            </View>

            {/* Terms checkbox row */}
            <View style={[styles.termsWrap, errors.agreed ? styles.termsError : null]}>
              <TouchableOpacity
                onPress={handleToggleAgreement}
                activeOpacity={0.7}
                accessibilityLabel={agreed ? 'Revoke agreement' : 'Open terms to agree'}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <View style={[styles.customCheckbox, agreed && styles.customCheckboxChecked]}>
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
              </TouchableOpacity>

              <Text style={styles.termsText}>
                {'I agree to the '}
                <Text style={styles.termsLink} onPress={openPolicyModal}>
                  Terms and Conditions
                </Text>
                {' and '}
                <Text style={styles.termsLink} onPress={openPolicyModal}>
                  Privacy Policy
                </Text>
              </Text>
            </View>

            {errors.agreed ? <Text style={styles.fieldError}>{errors.agreed}</Text> : null}

            {/* Create Account Button */}
            <TouchableOpacity
              style={[styles.btnCreate, loading && styles.btnDisabled]}
              onPress={handleSignUp}
              activeOpacity={0.85}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <Text style={styles.btnCreateText}>Create Account</Text>
              )}
            </TouchableOpacity>

            {/* Sign In link */}
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

// ─── STYLES ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#eef2ff' },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 16,
    minHeight: SCREEN_HEIGHT,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#ffffff',
    borderRadius: 24,
    paddingHorizontal: 28,
    paddingVertical: 28,
    shadowColor: '#0a0f1e',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.08,
    shadowRadius: 40,
    elevation: 10,
    position: 'relative',
    marginTop: -25,
  },

  connectorTop: {
    position: 'absolute', top: -5, alignSelf: 'center',
    width: 10, height: 10, borderRadius: 5,
    backgroundColor: '#ffffff', borderWidth: 2, borderColor: '#c7d2fe',
  },
  connectorBottom: {
    position: 'absolute', bottom: -5, alignSelf: 'center',
    width: 10, height: 10, borderRadius: 5,
    backgroundColor: '#ffffff', borderWidth: 2, borderColor: '#c7d2fe',
  },
  connectorLeft: {
    position: 'absolute', left: -5, top: '50%',
    transform: [{ translateY: -5 }],
    width: 10, height: 10, borderRadius: 5,
    backgroundColor: '#ffffff', borderWidth: 2, borderColor: '#c7d2fe',
  },
  connectorRight: {
    position: 'absolute', right: -5, top: '50%',
    transform: [{ translateY: -5 }],
    width: 10, height: 10, borderRadius: 5,
    backgroundColor: '#ffffff', borderWidth: 2, borderColor: '#c7d2fe',
  },

  logoWrap: { alignItems: 'center', justifyContent: 'center', marginBottom: -10, minHeight: 80 },
  logoWrapper: { alignItems: 'center', justifyContent: 'center' },
  logo: { borderRadius: 14, backgroundColor: 'transparent' },

  heading: { fontSize: 28, fontWeight: '800', color: '#0f172a', textAlign: 'center', marginBottom: 24 },
  formGroup: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', color: '#334155', marginBottom: 6 },

  inputWrap: {
    borderWidth: 1, borderColor: '#dde3fa', borderRadius: 12,
    backgroundColor: '#ffffff', minHeight: 40, justifyContent: 'center',
    flexDirection: 'row', alignItems: 'center',
  },
  inputWrapFocused: {
    backgroundColor: '#ffffff',
    shadowColor: '#3b5bdb',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
  },
  inputError: { borderColor: '#e53e3e' },
  input: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 13 : 11,
    fontSize: 14,
    color: '#1a1f36',
    backgroundColor: 'transparent',
    minHeight: 44,
    textAlignVertical: 'center',
  },
  inputWithIcon: { paddingRight: 44 },
  eyeBtn: { position: 'absolute', right: 12, padding: 6 },
  fieldError: { color: '#e53e3e', fontSize: 11, marginTop: 4, marginLeft: 4 },
  
  strengthContainer: {
    marginTop: 8,
  },
  strengthBar: {
    height: 4,
    backgroundColor: '#e2e6f3',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 6,
  },
  strengthFill: {
    height: '100%',
    borderRadius: 2,
  },
  strengthText: {
    fontSize: 11,
    marginBottom: 6,
  },
  validationList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  validationItem: {
    fontSize: 10,
    color: '#8896b3',
    marginRight: 12,
  },
  validationValid: {
    color: '#10b981',
  },
  matchSuccess: {
    color: '#10b981',
    fontSize: 11,
    marginTop: 4,
    marginLeft: 4,
  },
  passwordHint: { fontSize: 11, color: '#8896b3', marginTop: 4, marginLeft: 4 },
  passwordHintSuccess: { color: '#10b981', fontSize: 11, marginTop: 4 },

  termsWrap: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginTop: 5,
    padding: 10,
    borderWidth: 1.5,
    borderColor: '#e2e6f3',
    borderRadius: 10,
    backgroundColor: '#f8f9ff',
  },
  termsError: { borderColor: '#e53e3e' },
  customCheckbox: {
    width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: '#8896b3',
    alignItems: 'center', justifyContent: 'center', marginTop: 1, flexShrink: 0,
  },
  customCheckboxChecked: { backgroundColor: '#3b5bdb', borderColor: '#3b5bdb' },
  termsText: { flex: 1, fontSize: 12.5, lineHeight: 18, color: '#4a5568' },
  termsLink: { fontWeight: '700', color: '#3b5bdb' },

  btnCreate: {
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
  btnDisabled: { opacity: 0.7 },
  btnCreateText: { color: '#ffffff', fontSize: 15, fontWeight: '700', letterSpacing: 0.3 },

  signinWrap: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 20 },
  signinText: { fontSize: 13, color: '#64748b' },
  signinLink: { fontSize: 13, fontWeight: '700', color: '#3b5bdb' },

  gridBackground: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
  gridOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(255,255,255,0.10)' },

  // Error Modal
  errorModalOverlay: {
    flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center', alignItems: 'center',
  },
  errorModalContainer: {
    width: '85%', maxWidth: 340, backgroundColor: '#FFFFFF',
    borderRadius: 20, padding: 24, alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15, shadowRadius: 12, elevation: 8,
  },
  errorModalIconWrapper: { marginBottom: 16 },
  errorModalIconCircle: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: '#f0f4ff', justifyContent: 'center', alignItems: 'center',
  },
  errorModalTitle: { fontSize: 20, fontWeight: '700', color: '#1e293b', textAlign: 'center', marginBottom: 8 },
  errorModalMessage: { fontSize: 14, color: '#64748b', textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  errorModalButtonPrimary: {
    width: '100%', paddingVertical: 12, borderRadius: 10,
    alignItems: 'center', backgroundColor: '#3b5bdb',
  },
  errorModalButtonTextPrimary: { color: '#ffffff', fontSize: 16, fontWeight: '600' },
});

// ─── MODAL STYLES ─────────────────────────────────────────────────────────────

const modalStyles = StyleSheet.create({
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center', alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: '#ffffff', borderRadius: 24,
    overflow: 'hidden', shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25, shadowRadius: 20, elevation: 15,
  },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 16,
    borderBottomWidth: 1, borderBottomColor: '#e2e6f3', backgroundColor: '#f8f9ff',
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#1a1f36' },

  tabBar: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#e2e6f3' },
  tab: { flex: 1, paddingVertical: 14, alignItems: 'center' },
  activeTab: { borderBottomWidth: 2, borderBottomColor: '#3b5bdb' },
  tabText: { fontSize: 14, fontWeight: '600', color: '#8896b3' },
  activeTabText: { color: '#3b5bdb' },
  tabContent: { padding: 20 },

  scrollHintBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#eef2ff', paddingHorizontal: 14, paddingVertical: 8,
    borderBottomWidth: 1, borderBottomColor: '#c7d2fe',
  },
  scrollHintText: { fontSize: 12, color: '#3b5bdb', flex: 1, fontWeight: '500' },

  modalFooter: {
    flexDirection: 'row', padding: 16,
    borderTopWidth: 1, borderTopColor: '#e2e6f3',
    gap: 12, backgroundColor: '#ffffff',
  },
  agreeButton: {
    flex: 1, backgroundColor: '#3b5bdb',
    borderRadius: 10, paddingVertical: 12, alignItems: 'center',
  },
  agreeButtonDisabled: { backgroundColor: '#c7d2fe' },
  agreeButtonText: { color: '#ffffff', fontSize: 15, fontWeight: '700' },
  agreeButtonTextDisabled: { color: '#8fa3e0' },
  declineButton: {
    flex: 1, backgroundColor: '#e5e9f5',
    borderRadius: 10, paddingVertical: 12, alignItems: 'center',
  },
  declineButtonText: { color: '#4a5568', fontSize: 14, fontWeight: '600' },

  scrollTopButton: {
    position: 'absolute', bottom: 80, right: 20,
    backgroundColor: '#3b5bdb', width: 48, height: 48, borderRadius: 24,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 6, zIndex: 10,
  },

  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#3b5bdb', marginTop: 16, marginBottom: 8 },
  subSection: { fontSize: 14, fontWeight: '600', color: '#4a5568', marginTop: 12, marginBottom: 4 },
  text: { fontSize: 13, color: '#4a5568', lineHeight: 20, marginBottom: 8 },
  footer: {
    fontSize: 12, color: '#8896b3', textAlign: 'center',
    marginTop: 20, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#e2e6f3',
  },
});