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
  const rotate = rotateAnim.interpolate({ inputRange: [0, 1], outputRange: ['-5deg', '0deg'] });
  const opacity = entranceAnim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 0.5, 1] });
  const finalSize = size || 56;

  return (
    <Animated.View
      style={[styles.logoWrapper, { opacity, transform: [{ scale }, { scale: pulseAnim }, { rotate }] }]}
    >
      <Image
        source={require('../../assets/images/logo.png')}
        style={[styles.logo, { width: finalSize, height: finalSize, borderRadius: finalSize * 0.25 }]}
        resizeMode="contain"
      />
    </Animated.View>
  );
};

// ─── RESPONSIVE LOGO SIZE ─────────────────────────────────────────────────────

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
      console.log('[Firebase] App initialized');
    } else {
      firebaseApp = getApps()[0];
    }
    auth = getAuth(firebaseApp);
  } catch (e: any) {
    console.error('[Firebase] Init error:', e.message);
  }
}

//TERMS AND PRIVACY POLICY CONTENT
const TermsContent = () => (
  <View style={modalStyles.tabContent}>
    <Text style={modalStyles.sectionTitle}>1. Acceptance of Terms</Text>
    <Text style={modalStyles.text}>
      By registering for or using iGraph IT ("Platform"), you agree to be bound by these Terms and
      Conditions. If you disagree with any part, you must not use our Platform.
    </Text>

    <Text style={modalStyles.sectionTitle}>2. Account Registration</Text>
    <Text style={modalStyles.subSection}>2.1 Account Security</Text>
    <Text style={modalStyles.text}>
      • You are responsible for maintaining password confidentiality{'\n'}
      • You must notify us immediately of unauthorized access{'\n'}
      • We are not liable for losses from compromised accounts
    </Text>
    <Text style={modalStyles.subSection}>2.2 Accuracy of Information</Text>
    <Text style={modalStyles.text}>
      You must provide accurate, current, and complete information during registration and update it
      as needed.
    </Text>

    <Text style={modalStyles.sectionTitle}>3. User Conduct</Text>
    <Text style={modalStyles.text}>
      You agree NOT to:{'\n'}
      • Share your account credentials with others{'\n'}
      • Attempt to bypass authentication mechanisms{'\n'}
      • Use automated scripts to access the Platform{'\n'}
      • Upload malicious content or code{'\n'}
      • Attempt to access other users' data{'\n'}
      • Reverse engineer any part of the Platform{'\n'}
      • Use the Platform for illegal activities
    </Text>

    <Text style={modalStyles.sectionTitle}>4. Intellectual Property</Text>
    <Text style={modalStyles.subSection}>4.1 Our Content</Text>
    <Text style={modalStyles.text}>
      All platform content, including UI design, diagrams, educational materials about SDLC and UML,
      and source code is owned by iGraph IT and protected by copyright laws.
    </Text>
    <Text style={modalStyles.subSection}>4.2 Your Content</Text>
    <Text style={modalStyles.text}>
      • You retain ownership of diagrams you create{'\n'}
      • You grant us license to display your content within the Platform{'\n'}
      • You are responsible for your content's legality
    </Text>

    <Text style={modalStyles.sectionTitle}>5. Authentication and Security</Text>
    <Text style={modalStyles.subSection}>5.1 Token Management</Text>
    <Text style={modalStyles.text}>
      • Access tokens expire after 15 minutes{'\n'}
      • Refresh tokens expire after 7 days{'\n'}
      • You must re-authenticate after token expiration
    </Text>
    <Text style={modalStyles.subSection}>5.2 OTP Verification</Text>
    <Text style={modalStyles.text}>
      • OTPs expire after 5 minutes{'\n'}
      • Maximum 3 OTP requests per 15 minutes{'\n'}
      • Do not share OTPs with anyone
    </Text>

    <Text style={modalStyles.sectionTitle}>6. Limitation of Liability</Text>
    <Text style={modalStyles.text}>
      To the maximum extent permitted by law, the Platform is provided "as is" without warranties.
      We are not liable for indirect, incidental, or consequential damages.
    </Text>

    <Text style={modalStyles.sectionTitle}>7. Governing Law</Text>
    <Text style={modalStyles.text}>
      These terms are governed by the laws of the Philippines, without regard to conflict of law
      principles.
    </Text>

    <Text style={modalStyles.sectionTitle}>8. Contact Us</Text>
    <Text style={modalStyles.text}>
      Email: legal@igraphit.com{'\n'}Response time: Within 5 business days
    </Text>

    <Text style={modalStyles.footer}>
      By using iGraph IT, you acknowledge that you have read, understood, and agree to be bound by
      these Terms and Conditions.
    </Text>
  </View>
);

const PrivacyContent = () => (
  <View style={modalStyles.tabContent}>
    <Text style={modalStyles.sectionTitle}>1. Introduction</Text>
    <Text style={modalStyles.text}>
      Welcome to iGraph IT. We are committed to protecting your personal information and your right
      to privacy.
    </Text>

    <Text style={modalStyles.sectionTitle}>2. Information We Collect</Text>
    <Text style={modalStyles.subSection}>2.1 Personal Information You Provide</Text>
    <Text style={modalStyles.text}>
      • Account Information: Full name, email address, password (encrypted){'\n'}
      • Profile Information: Profile picture (optional){'\n'}
      • Authentication Data: Sign-in methods (email/password or Google OAuth)
    </Text>
    <Text style={modalStyles.subSection}>2.2 Automatically Collected Information</Text>
    <Text style={modalStyles.text}>
      • Usage Data: Pages visited, diagrams created, time spent on platform{'\n'}
      • Device Information: Browser type, operating system, IP address
    </Text>

    <Text style={modalStyles.sectionTitle}>3. How We Use Your Information</Text>
    <Text style={modalStyles.text}>
      We use your information to:{'\n'}
      • Create and manage your account{'\n'}
      • Authenticate your identity and secure your access{'\n'}
      • Send OTP verification and password reset emails{'\n'}
      • Improve our platform and user experience
    </Text>

    <Text style={modalStyles.sectionTitle}>4. Data Storage and Security</Text>
    <Text style={modalStyles.text}>
      • Your password is encrypted using bcrypt (12 rounds){'\n'}
      • Access tokens expire after 15 minutes{'\n'}
      • Refresh tokens expire after 7 days
    </Text>

    <Text style={modalStyles.sectionTitle}>5. Email Communications</Text>
    <Text style={modalStyles.text}>
      We send account verification OTPs and password reset links. These are essential and cannot be
      opted out of.
    </Text>

    <Text style={modalStyles.sectionTitle}>6. Data Retention</Text>
    <Text style={modalStyles.text}>
      • Account data: Until you delete your account{'\n'}
      • Session data: 7 days from last activity
    </Text>

    <Text style={modalStyles.sectionTitle}>7. Your Rights</Text>
    <Text style={modalStyles.text}>
      You have the right to access your data, correct inaccurate data, delete your account, and
      export your data.
    </Text>

    <Text style={modalStyles.sectionTitle}>8. Third-Party Services</Text>
    <Text style={modalStyles.text}>
      We use Firebase (Google) for authentication and database, and Brevo for email delivery.
    </Text>

    <Text style={modalStyles.sectionTitle}>9. Children's Privacy</Text>
    <Text style={modalStyles.text}>
      iGraph IT is not intended for children under 13. We do not knowingly collect information from
      children under 13.
    </Text>

    <Text style={modalStyles.sectionTitle}>10. Contact Us</Text>
    <Text style={modalStyles.text}>
      For privacy concerns, contact us at: privacy@igraphit.com
    </Text>

    <Text style={modalStyles.footer}>By using iGraph IT, you agree to this Privacy Policy.</Text>
  </View>
);

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
    const offsetY = contentOffset.y;
    setShowScrollTop(offsetY > 200);
    const isAtBottom = layoutMeasurement.height + offsetY >= contentSize.height - 40;
    if (isAtBottom) {
      if (activeTab === 'terms') setTermsRead(true);
      else setPrivacyRead(true);
    }
  };

  const scrollToTop = () => {
    scrollViewRef.current?.scrollTo({ y: 0, animated: true });
  };

  const handleAgree = () => {
    onAgree();
    onClose();
  };

  const handleDecline = () => {
    onClose();
  };

  const modalWidth = Math.min(ww - 40, 500);
  const modalMaxHeight = wh - 80;

  return (
    <Modal animationType="slide" transparent={true} visible={visible} onRequestClose={onClose}>
      <View style={modalStyles.modalOverlay}>
        <View style={[modalStyles.modalContainer, { width: modalWidth, maxHeight: modalMaxHeight }]}>
          <View style={modalStyles.modalHeader}>
            <Text style={modalStyles.modalTitle}>Legal Agreement</Text>
          </View>

          <View style={modalStyles.tabBar}>
            <TouchableOpacity
              style={[modalStyles.tab, activeTab === 'terms' && modalStyles.activeTab]}
              onPress={() => handleTabSwitch('terms')}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={[modalStyles.tabText, activeTab === 'terms' && modalStyles.activeTabText]}>
                  Terms & Conditions
                </Text>
                {termsRead && (
                  <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
                    <Circle cx="12" cy="12" r="10" fill="#3b5bdb" />
                    <Path d="M8 12l2.5 2.5L16 9" stroke="white" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                  </Svg>
                )}
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              style={[modalStyles.tab, activeTab === 'privacy' && modalStyles.activeTab]}
              onPress={() => handleTabSwitch('privacy')}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={[modalStyles.tabText, activeTab === 'privacy' && modalStyles.activeTabText]}>
                  Privacy Policy
                </Text>
                {privacyRead && (
                  <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
                    <Circle cx="12" cy="12" r="10" fill="#3b5bdb" />
                    <Path d="M8 12l2.5 2.5L16 9" stroke="white" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                  </Svg>
                )}
              </View>
            </TouchableOpacity>
          </View>

          {!bothRead && (
            <View style={modalStyles.scrollHintBanner}>
              <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
                <Path d="M12 5v14M5 12l7 7 7-7" stroke="#3b5bdb" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
              </Svg>
              <Text style={modalStyles.scrollHintText}>
                Please scroll to the bottom of{' '}
                {!termsRead && !privacyRead ? 'both documents' : !termsRead ? 'Terms & Conditions' : 'Privacy Policy'}{' '}
                to enable Agree
              </Text>
            </View>
          )}

          <ScrollView
            ref={scrollViewRef}
            showsVerticalScrollIndicator={true}
            onScroll={handleScroll}
            scrollEventThrottle={16}
          >
            {activeTab === 'terms' ? <TermsContent /> : <PrivacyContent />}
          </ScrollView>

          {showScrollTop && (
            <TouchableOpacity style={modalStyles.scrollTopButton} onPress={scrollToTop}>
              <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
                <Path d="M12 19V5M5 12l7-7 7 7" stroke="#ffffff" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
              </Svg>
            </TouchableOpacity>
          )}

          <View style={modalStyles.modalFooter}>
            <TouchableOpacity
              style={[modalStyles.agreeButton, !bothRead && modalStyles.agreeButtonDisabled]}
              onPress={bothRead ? handleAgree : undefined}
            >
              <Text style={[modalStyles.agreeButtonText, !bothRead && modalStyles.agreeButtonTextDisabled]}>
                {bothRead ? 'I Agree' : 'Read First'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={modalStyles.declineButton} onPress={handleDecline}>
              <Text style={modalStyles.declineButtonText}>Decline</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

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
              <Svg width={32} height={32} viewBox="0 0 24 24" fill="none">
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

const GoogleIcon = () => (
  <Svg width={18} height={18} viewBox="0 0 24 24">
    <Path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
    <Path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
    <Path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
    <Path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
  </Svg>
);

const EmailIcon = () => (
  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
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
  const { width: windowWidth } = useWindowDimensions();

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
  const [showPolicyModal, setShowPolicyModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorModalData, setErrorModalData] = useState({
    title: '',
    message: '',
    onAction: undefined as (() => void) | undefined,
    actionButtonText: '',
    actionIcon: undefined as React.ReactNode | undefined,
  });

  const passwordRef = useRef<TextInput>(null);
  const logoSize = getResponsiveLogoSize(windowWidth);

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
            setTimeout(() => {
              router.replace('/(tabs)/home');
            }, 400);
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
  const openPolicyModal = () => setShowPolicyModal(true);
  const handleAgree = useCallback(() => {
    setAgreed(true);
    setErrors((prev) => ({ ...prev, terms: '' }));
  }, []);

  const handleToggleAgreement = useCallback(() => {
    if (!agreed) {
      openPolicyModal();
    } else {
      setAgreed(false);
    }
  }, [agreed]);

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
      if (isError) {
        Alert.alert('Error', message);
      }
    }
  };

  //GOOGLE SIGN IN
  const handleFirebaseGoogleSignIn = async () => {
    if (!agreed) {
      setErrors((prev) => ({
        ...prev,
        terms: 'You must agree to the Terms and Privacy Policy before continuing',
      }));
      openPolicyModal();
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
      provider.setCustomParameters({ 
        prompt: 'select_account',
      });

      const result = await signInWithPopup(auth, provider);
      const idToken = await result.user.getIdToken();
      const apiResult = await authService.googleAuth(idToken);

      if (apiResult.success) {
        setShowSuccessAnimation(true);
        setTimeout(() => {
          router.replace('/(tabs)/home');
        }, 400);
      } else {
        await auth.signOut();
        const msg = apiResult.message || '';
        // Check if email already exists with email/password (409 conflict)
        if (msg.toLowerCase().includes('already registered') || 
            msg.toLowerCase().includes('already exists') ||
            msg.toLowerCase().includes('email/password')) {
          const googleEmail = result.user.email || '';
          if (googleEmail) {
            setEmail(googleEmail);
          }
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
      
      // Handle 409 from backend
      if (error.response?.status === 409) {
        const errorMsg = error.response?.data?.message || '';
        showErrorPopup(
          'Account Already Exists',
          errorMsg || 'This email is already registered with email/password. Please sign in using your email and password instead.',
          () => passwordRef.current?.focus(),
          'Sign In with Email/Password',
          <EmailIcon />
        );
      }
      // User closed popup - silently handle
      else if (error.code === 'auth/popup-closed-by-user') {
        // Do nothing - user cancelled
      }
      else if (error.code === 'auth/popup-blocked') {
        showErrorPopup(
          'Popup Blocked',
          'Please allow popups for this website to sign in with Google.',
          undefined,
          'OK'
        );
      }
      else if (error.code === 'auth/network-request-failed') {
        showErrorPopup(
          'Network Error',
          'Unable to reach Google servers. Please check your internet connection.',
          undefined,
          'OK'
        );
      }
      else if (error.code === 'auth/internal-error' || error.message?.includes('Failed to fetch')) {
        showErrorPopup(
          'Google Sign In Unavailable',
          'Google Sign-In is currently unavailable. Please use email/password to sign in instead.',
          undefined,
          'OK'
        );
      }
      else {
        showErrorPopup(
          'Google Sign In Failed', 
          error.message || 'Something went wrong. Please try again.',
          undefined,
          'OK'
        );
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

    if (!agreed) {
      openPolicyModal();
      return;
    }
    if (newErrors.email || newErrors.password) return;

    setLoading(true);
    const startTime = Date.now();

    try {
      const result = await authService.signIn(email, password);
      const elapsed = Date.now() - startTime;
      if (elapsed < 500) await new Promise((r) => setTimeout(r, 500 - elapsed));

      if (result.success) {
        await saveRememberMe(email, rememberMe);
        setShowSuccessAnimation(true);
        setTimeout(() => {
          router.replace('/(tabs)/home');
        }, 400);
      } else {
        const msg = result.message || '';
        if (msg === 'Invalid email or password.' || msg.toLowerCase().includes('invalid')) {
          setErrors((prev) => ({ ...prev, password: 'Invalid email or password. Please try again.' }));
        } else if (msg.includes('EMAIL_NOT_VERIFIED') || msg.toLowerCase().includes('verify')) {
          showToastMessage('Please verify your email address before signing in.', true);
        } else if (msg.toLowerCase().includes('google') || msg.toLowerCase().includes('oauth')) {
          showErrorPopup(
            'Google Account Detected',
            'This email is registered with Google. Please sign in using Google instead.',
            handleFirebaseGoogleSignIn,
            'Sign In with Google',
            <GoogleIcon />
          );
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
          showErrorPopup(
            'Google Account Detected',
            'This email is registered with Google. Please sign in using Google instead.',
            handleFirebaseGoogleSignIn,
            'Sign In with Google',
            <GoogleIcon />
          );
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
    return <SplashScreen />;
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />

      <PolicyModal visible={showPolicyModal} onClose={() => setShowPolicyModal(false)} onAgree={handleAgree} />
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

        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} automaticallyAdjustKeyboardInsets={true} keyboardDismissMode="interactive" contentInsetAdjustmentBehavior="always">
          <View style={styles.card}>
            <View style={styles.connectorTop} />
            <View style={styles.connectorBottom} />
            <View style={styles.connectorLeft} />
            <View style={styles.connectorRight} />

            <View style={styles.logoWrap}>
              <AnimatedLogo size={logoSize} isInputFocused={isAnyInputFocused} showSuccess={showSuccessAnimation} />
            </View>

            <Text style={styles.heading}>Welcome Back</Text>
            <Text style={styles.subtitle}>Sign in to continue your learning journey</Text>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Email</Text>
              <View style={[styles.inputWrap, emailFocused && styles.inputWrapFocused, errors.email && styles.inputError]}>
                <TextInput
                  style={[styles.input, Platform.OS === 'web' && { outlineWidth: 1, outlineStyle: 'solid', outlineOffset: 0, borderRadius: 12, outlineColor: getOutlineColor(emailFocused, errors.email) }]}
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
                  style={[styles.input, styles.inputWithIcon, Platform.OS === 'web' && { outlineWidth: 1, outlineStyle: 'solid', outlineOffset: 0, borderRadius: 12, outlineColor: getOutlineColor(passwordFocused, errors.password) }]}
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
              {errors.password ? <Text style={styles.errorText}>{errors.password}</Text> : <Text style={styles.passwordHint} />}

              <View style={styles.optionsRow}>
                <TouchableOpacity style={styles.rememberMeRow} onPress={() => setRememberMe(!rememberMe)}>
                  <View style={[styles.checkbox, rememberMe && styles.checkboxChecked]}>
                    {rememberMe && (
                      <Svg width={10} height={10} viewBox="0 0 10 10">
                        <Path d="M2 5l2.5 2.5L8 3" stroke="white" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" fill="none" />
                      </Svg>
                    )}
                  </View>
                  <Text style={styles.rememberMeText}>Remember me</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.forgotWrap} onPress={() => router.push('/(auth)/forgot-password')}>
                  <Text style={styles.forgotText}>Forgot password?</Text>
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

            {Platform.OS !== 'web' ? (
              <View style={styles.nativeGoogleFallback}>
                <Text style={styles.nativeGoogleFallbackText}>Google Sign In is available on web. Please use email/password on mobile.</Text>
              </View>
            ) : (
              <TouchableOpacity style={[styles.btnGoogle, loading && styles.btnDisabled]} onPress={handleFirebaseGoogleSignIn} activeOpacity={0.85} disabled={loading}>
                {loading ? <ActivityIndicator color="#3b5bdb" size="small" /> : <GoogleIcon />}
                <Text style={styles.btnGoogleText}>Sign in with Google</Text>
              </TouchableOpacity>
            )}

            <View style={[styles.termsWrap, errors.terms && styles.termsError]}>
              <TouchableOpacity onPress={handleToggleAgreement} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <View style={[styles.customCheckbox, agreed && styles.customCheckboxChecked]}>
                  {agreed && (
                    <Svg width={10} height={10} viewBox="0 0 10 10">
                      <Path d="M2 5l2.5 2.5L8 3" stroke="white" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" fill="none" />
                    </Svg>
                  )}
                </View>
              </TouchableOpacity>
              <Text style={styles.termsText}>
                {'I agree to the '}
                <Text style={styles.termsLink} onPress={openPolicyModal}>Terms and Conditions</Text>
                {' and '}
                <Text style={styles.termsLink} onPress={openPolicyModal}>Privacy Policy</Text>
              </Text>
            </View>
            {errors.terms ? <Text style={styles.errorText}>{errors.terms}</Text> : null}

            <View style={styles.signupWrap}>
              <Text style={styles.signupText}>Don't have an account? </Text>
              <TouchableOpacity onPress={() => router.push('/(auth)/signup')}>
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

  // Layout & Background
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
    paddingVertical: 40,
    paddingHorizontal: 16,
    minHeight: SCREEN_HEIGHT,
  },

  //FORM
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    paddingHorizontal: 28,
    paddingVertical: 28,
    width: '100%',
    maxWidth: 420,
    minWidth: 320,
    position: 'relative',
    shadowColor: '#1e293b',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.08,
    shadowRadius: 40,
    elevation: 10,
    marginTop: -25,
    borderColor: '#f1f5ff',
  },
  connectorTop: {
    position: 'absolute',
    top: -5,
    alignSelf: 'center',
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderColor: '#c7d2fe',
  },
  connectorBottom: {
    position: 'absolute',
    bottom: -5,
    alignSelf: 'center',
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderColor: '#c7d2fe',
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
    borderWidth: 2,
    borderColor: '#c7d2fe',
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
    borderWidth: 2,
    borderColor: '#c7d2fe',
  },

  //LOGO
  logoWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: -10,
    minHeight: 80,
  },
  logoWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    backgroundColor: 'transparent',
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
    marginBottom: 6,
  },
  inputWrap: {
    borderWidth: 1,
    borderColor: '#dde3fa',
    borderRadius: 12,
    backgroundColor: '#ffffff',
    minHeight: 40,
    justifyContent: 'center',
  },
  inputWrapFocused: {
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
    paddingVertical: Platform.OS === 'ios' ? 13 : 11,
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

  optionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  rememberMeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  checkbox: {
    width: 18,
    height: 18,
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
    fontSize: 12.5,
    color: '#4a5568',
  },
  forgotWrap: {
    alignItems: 'flex-end',
  },
  forgotText: {
    fontSize: 12.5,
    color: '#8896b3',
    fontWeight: '500',
  },

  // Validation
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
  passwordHint: {
    fontSize: 11,
    color: '#8896b3',
    marginTop: 6,
    marginLeft: 4,
  },

  // Buttons
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

  // Divider
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

  // Google Button
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
  nativeGoogleFallback: {
    marginTop: 10,
    padding: 12,
    backgroundColor: '#fef3c7',
    borderRadius: 12,
    alignItems: 'center',
  },
  nativeGoogleFallbackText: {
    fontSize: 12,
    color: '#92400e',
    textAlign: 'center',
  },

  // Terms
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
    color: '#3b5bdb',
  },

  // Sign Up Link
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

  // Error Modal
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
    backgroundColor: '#3b5bdb',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  errorModalButtonTextPrimary: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});


// ─── MODAL STYLES ────────────────────────────────────────────────────────────

const modalStyles = StyleSheet.create({

  // Modal Shell
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 15,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e6f3',
    backgroundColor: '#f8f9ff',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1f36',
  },

  // Tabs
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e6f3',
    backgroundColor: '#ffffff',
  },
  tab: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#3b5bdb',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8896b3',
  },
  activeTabText: {
    color: '#3b5bdb',
  },
  tabContent: {
    padding: 20,
  },

  // Scroll Hint
  scrollHintBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#eef2ff',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#c7d2fe',
  },
  scrollHintText: {
    fontSize: 12,
    color: '#3b5bdb',
    flex: 1,
    fontWeight: '500',
  },

  // Footer & Buttons
  modalFooter: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e2e6f3',
    gap: 12,
    backgroundColor: '#ffffff',
  },
  agreeButton: {
    flex: 1,
    backgroundColor: '#3b5bdb',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  agreeButtonDisabled: {
    backgroundColor: '#c7d2fe',
  },
  agreeButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  agreeButtonTextDisabled: {
    color: '#8fa3e0',
  },
  declineButton: {
    flex: 1,
    backgroundColor: '#e5e9f5',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  declineButtonText: {
    color: '#4a5568',
    fontSize: 16,
    fontWeight: '600',
  },
  scrollTopButton: {
    position: 'absolute',
    bottom: 80,
    right: 20,
    backgroundColor: '#3b5bdb',
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
    zIndex: 10,
  },

  // Content Typography
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#3b5bdb',
    marginTop: 20,
    marginBottom: 8,
  },
  subSection: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4a5568',
    marginTop: 12,
    marginBottom: 4,
  },
  text: {
    fontSize: 14,
    color: '#4a5568',
    lineHeight: 22,
    marginBottom: 8,
  },
  footer: {
    fontSize: 12,
    color: '#8896b3',
    textAlign: 'center',
    marginTop: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e2e6f3',
  },
});