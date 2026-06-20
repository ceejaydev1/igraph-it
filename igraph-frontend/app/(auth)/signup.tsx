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
  useWindowDimensions,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Svg, Circle, Rect, Path } from 'react-native-svg';
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

// ─── FIREBASE SETUP ───────────────────────────────────────────────────────────

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || "AIzaSyCyM0zjlTQ6cCuAf3CGWbxLnUUle_z88F8",
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || "igraph-it.firebaseapp.com",
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || "igraph-it",
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || "igraph-it.firebasestorage.app",
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "513560698622",
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || "1:513560698622:web:71e12cbf9a1bb95dab0faf"
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

// ─── HELPER FUNCTIONS ─────────────────────────────────────────────────────────

const getOutlineColor = (isFocused: boolean, hasError: string) => {
  if (hasError) return '#ef4444';
  if (isFocused) return '#4c6fff';
  return '#dde3fa';
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

// ─── ICONS ────────────────────────────────────────────────────────────────────

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

// ─── TERMS AND PRIVACY POLICY CONTENT ─────────────────────────────────────────

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
      You must provide accurate, current, and complete information during registration and update it as needed.
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
      All platform content, including UI design, diagrams, educational materials about SDLC and UML, and source code is owned by iGraph IT and protected by copyright laws.
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
      To the maximum extent permitted by law, the Platform is provided "as is" without warranties. We are not liable for indirect, incidental, or consequential damages.
    </Text>
    <Text style={modalStyles.sectionTitle}>7. Governing Law</Text>
    <Text style={modalStyles.text}>
      These terms are governed by the laws of the Philippines, without regard to conflict of law principles.
    </Text>
    <Text style={modalStyles.sectionTitle}>8. Contact Us</Text>
    <Text style={modalStyles.text}>
      Email: legal@igraphit.com{'\n'}Response time: Within 5 business days
    </Text>
    <Text style={modalStyles.footer}>
      By using iGraph IT, you acknowledge that you have read, understood, and agree to be bound by these Terms and Conditions.
    </Text>
  </View>
);

const PrivacyContent = () => (
  <View style={modalStyles.tabContent}>
    <Text style={modalStyles.sectionTitle}>1. Introduction</Text>
    <Text style={modalStyles.text}>
      Welcome to iGraph IT. We are committed to protecting your personal information and your right to privacy.
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
      We send account verification OTPs and password reset links. These are essential and cannot be opted out of.
    </Text>
    <Text style={modalStyles.sectionTitle}>6. Data Retention</Text>
    <Text style={modalStyles.text}>
      • Account data: Until you delete your account{'\n'}
      • Session data: 7 days from last activity
    </Text>
    <Text style={modalStyles.sectionTitle}>7. Your Rights</Text>
    <Text style={modalStyles.text}>
      You have the right to access your data, correct inaccurate data, delete your account, and export your data.
    </Text>
    <Text style={modalStyles.sectionTitle}>8. Third-Party Services</Text>
    <Text style={modalStyles.text}>
      We use Firebase (Google) for authentication and database, and Brevo for email delivery.
    </Text>
    <Text style={modalStyles.sectionTitle}>9. Children's Privacy</Text>
    <Text style={modalStyles.text}>
      iGraph IT is not intended for children under 13. We do not knowingly collect information from children under 13.
    </Text>
    <Text style={modalStyles.sectionTitle}>10. Contact Us</Text>
    <Text style={modalStyles.text}>
      For privacy concerns, contact us at: privacy@igraphit.com
    </Text>
    <Text style={modalStyles.footer}>By using iGraph IT, you agree to this Privacy Policy.</Text>
  </View>
);

// ─── POLICY MODAL ────────────────────────────────────────────────────────────

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

// ─── ERROR POPUP MODAL ────────────────────────────────────────────────────────

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

// ─── SUCCESS MODAL ────────────────────────────────────────────────────

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

// ─── BACKGROUND ───────────────────────────────────────────────────────────────

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

// ─── PASSWORD STRENGTH HELPERS ────────────────────────────────────

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

// ─── COMPACT PASSWORD STRENGTH INDICATOR ────────────────────────────────────

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

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

export default function SignUp() {
  const router = useRouter();
  const { height: windowHeight } = useWindowDimensions();
  const isSmallScreen = windowHeight < 680;

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPolicyModal, setShowPolicyModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
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

  const [fullNameFocused, setFullNameFocused] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [confirmPasswordFocused, setConfirmPasswordFocused] = useState(false);

  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const confirmPasswordRef = useRef<TextInput>(null);

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

  // ── Password Validation Helpers ──────────────────────────────────────────

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

  // ── Form Validation ──────────────────────────────────────────────────────

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
      const missing = getPasswordMissingRequirements(password);
      newErrors.password = `Password must include: ${missing.join(', ')}`;
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

  // ─── GOOGLE SIGN-IN ───

  const handleGoogleSignIn = async () => {
    if (!agreed) {
      setErrors((prev) => ({
        ...prev,
        agreed: 'You must agree to the Terms and Privacy Policy before continuing',
      }));
      openPolicyModal();
      return;
    }
    if (!auth) {
      showErrorPopup('Error', 'Firebase auth not available');
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

      if (Platform.OS === 'web') {
        const result = await signInWithPopup(auth, provider);
        await handleGoogleSignInResult(result);
      } else {
        await signInWithRedirect(auth, provider);
      }
    } catch (error: any) {
      console.error('Google Sign-In error:', error);
      setLoading(false);
      
      if (error.code === 'auth/popup-closed-by-user') {
        // Do nothing
      } else if (error.code === 'auth/popup-blocked') {
        showErrorPopup('Popup Blocked', 'Please allow popups for this website to sign in with Google.', undefined, 'OK');
      } else if (error.code === 'auth/network-request-failed') {
        showErrorPopup('Network Error', 'Unable to reach Google servers. Please check your internet connection.', undefined, 'OK');
      } else {
        showErrorPopup('Google Sign In Failed', error.message || 'Something went wrong. Please try again.', undefined, 'OK');
      }
    }
  };

  const handleGoogleSignInResult = async (result: any) => {
    try {
      const idToken = await result.user.getIdToken();
      const apiResult = await authService.googleAuth(idToken);

      if (apiResult.success) {
        showSuccessPopup('Welcome!', 'Your Google account has been successfully signed up.', '', '');
        setTimeout(() => {
          router.replace('/(tabs)/home');
        }, 400);
      } else {
        await auth?.signOut();
        const msg = apiResult.message || '';
        
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
            () => router.push({ pathname: '/(auth)/signin', params: { prefilledEmail: googleEmail } }),
            'Sign In with Email/Password',
            <EmailIcon />
          );
        } else {
          showErrorPopup('Sign Up Failed', msg || 'Google sign up failed. Please try again.');
        }
      }
    } catch (error: any) {
      console.error('Error handling Google sign-in result:', error);
      if (error.response?.status === 409) {
        showErrorPopup(
          'Account Already Exists',
          error.response?.data?.message || 'This email is already registered with email/password.',
          () => router.push('/(auth)/signin'),
          'Sign In with Email/Password',
          <EmailIcon />
        );
      } else {
        showErrorPopup('Sign Up Failed', error.message || 'Something went wrong');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
    await handleGoogleSignIn();
  };

  // ── Email/Password Sign Up ─────────────────────────────────────────

  const handleSignUp = async () => {
    if (!validate()) return;

    setLoading(true);
    const startTime = Date.now();

    try {
      const result = await authService.signUp({ fullName, email, password });
      const elapsed = Date.now() - startTime;
      if (elapsed < 500) await new Promise((r) => setTimeout(r, 500 - elapsed));

      if (result.success) {
        setShowSuccessModal(true);
        setSuccessModalData({
          title: 'Verification Code Sent!',
          message: `We've sent a 6-digit verification code to ${email.replace(/(.{2})(.*)(@.*)/, '$1•••$3')}`,
          email: email,
          purpose: 'register',
        });
      } else {
        const msg = result.message || '';
        const errorCode = result.code;
        
        if (errorCode === 'GOOGLE_ACCOUNT' || msg.toLowerCase().includes('google') || msg.toLowerCase().includes('oauth')) {
          showErrorPopup(
            'Google Account Detected',
            'This email is registered with Google. Please sign in using Google instead.',
            handleGoogleSignIn,
            'Sign In with Google',
            <GoogleIcon />
          );
        } 
        else if (msg.toLowerCase().includes('already registered') || 
                   msg.toLowerCase().includes('already exists')) {
          showErrorPopup(
            'Email Already Exists',
            'An account with this email already exists. Would you like to sign in instead?',
            () => router.push({ pathname: '/(auth)/signin', params: { prefilledEmail: email } }),
            'Go to Sign In',
            <EmailIcon />
          );
        } else {
          showToastMessage(msg || 'Something went wrong', true);
        }
      }
    } catch (error: any) {
      console.error('Sign up error:', error);
      if (error.response?.data?.message) {
        const msg = error.response.data.message;
        const errorCode = error.response.data.code;
        
        if (errorCode === 'GOOGLE_ACCOUNT' || msg.toLowerCase().includes('google') || msg.toLowerCase().includes('oauth')) {
          showErrorPopup(
            'Google Account Detected',
            'This email is registered with Google. Please sign in using Google instead.',
            handleGoogleSignIn,
            'Sign In with Google',
            <GoogleIcon />
          );
        } 
        else if (msg.toLowerCase().includes('already registered') || 
                   msg.toLowerCase().includes('already exists')) {
          showErrorPopup(
            'Email Already Exists',
            'An account with this email already exists. Would you like to sign in instead?',
            () => router.push({ pathname: '/(auth)/signin', params: { prefilledEmail: email } }),
            'Go to Sign In',
            <EmailIcon />
          );
        } else {
          showToastMessage(msg || 'Something went wrong', true);
        }
      } else {
        showToastMessage(error.message || 'Something went wrong', true);
      }
    } finally {
      setLoading(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />

      <PolicyModal visible={showPolicyModal} onClose={() => setShowPolicyModal(false)} onAgree={handleAgree} />
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
          <View style={styles.card}>
            {/* Scaled-down connectors */}
            <View style={styles.connectorTop} />
            <View style={styles.connectorBottom} />
            <View style={styles.connectorLeft} />
            <View style={styles.connectorRight} />

            <Text style={[styles.heading, isSmallScreen && { fontSize: 20 }]}>Sign Up</Text>

            {/* Full Name */}
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

            {/* Email */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Email</Text>
              <View style={[styles.inputWrap, emailFocused && styles.inputWrapFocused, errors.email ? styles.inputError : null]}>
                <TextInput
                  ref={emailRef}
                  style={[styles.input, Platform.OS === 'web' && { outlineWidth: 1, outlineStyle: 'solid', outlineOffset: 0, borderRadius: 10, outlineColor: getOutlineColor(emailFocused, errors.email) }]}
                  placeholder="you@example.com"
                  placeholderTextColor="#b8c0d4"
                  value={email}
                  onChangeText={(text) => { setEmail(text); if (errors.email) setErrors({ ...errors, email: '' }); }}
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
            </View>

            {/* Password */}
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
                <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowPassword(!showPassword)}>
                  <EyeIcon visible={showPassword} />
                </TouchableOpacity>
              </View>
              
              <CompactPasswordStrength password={password} />
              
              {inlinePasswordError ? (
                <Text style={styles.inlineErrorText}>{inlinePasswordError}</Text>
              ) : null}
              {errors.password ? <Text style={styles.fieldError}>{errors.password}</Text> : null}
            </View>

            {/* Confirm Password */}
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
                <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
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

            {/* Sign Up Button */}
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

            {/* Divider - web only for Google button */}
            {Platform.OS === 'web' && (
              <>
                <View style={styles.divider}>
                  <View style={styles.line} />
                  <Text style={styles.orText}>or</Text>
                  <View style={styles.line} />
                </View>

                {/* Google Sign Up */}
                <TouchableOpacity style={[styles.btnGoogle, loading && styles.btnDisabled]} onPress={handleGoogleSignUp} activeOpacity={0.85} disabled={loading}>
                  {loading ? <ActivityIndicator color="#3b5bdb" size="small" /> : <GoogleIcon />}
                  <Text style={styles.btnGoogleText}>Continue with Google</Text>
                </TouchableOpacity>
              </>
            )}

            {/* Terms */}
            <View style={[styles.termsWrap, errors.agreed ? styles.termsError : null]}>
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
                I agree to the{' '}
                <Text style={styles.termsLink} onPress={openPolicyModal}>Terms and Condition</Text>
                {' & '}
                <Text style={styles.termsLink} onPress={openPolicyModal}>Privacy Policy</Text>
              </Text>
            </View>
            {errors.agreed ? <Text style={styles.fieldError}>{errors.agreed}</Text> : null}

            {/* Sign In link */}
            <View style={styles.signinWrap}>
              <Text style={styles.signinText}>Have an account? </Text>
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

// ─── STYLES ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#eef2ff' },
  scrollContent: { 
    flexGrow: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    paddingVertical: 16, 
    paddingHorizontal: 12, 
    minHeight: SCREEN_HEIGHT 
  },
  card: { 
    backgroundColor: '#ffffff', 
    borderRadius: 20, 
    paddingHorizontal: 22, 
    paddingVertical: 22, 
    width: '100%', 
    maxWidth: 400, 
    minWidth: 300, 
    position: 'relative', 
    shadowColor: '#1e293b', 
    shadowOffset: { width: 0, height: 10 }, 
    shadowOpacity: 0.06, 
    shadowRadius: 20, 
    elevation: 8, 
    marginTop: 0, 
    borderColor: '#f1f5ff' 
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
    borderColor: '#c7d2fe' 
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
    borderColor: '#c7d2fe' 
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
    borderColor: '#c7d2fe' 
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
    borderColor: '#c7d2fe' 
  },
  heading: { 
    fontSize: 22, 
    fontWeight: '800', 
    color: '#0f172a', 
    textAlign: 'center', 
    marginBottom: 14 
  },
  formGroup: { 
    marginBottom: 10 
  },
  label: { 
    fontSize: 12, 
    fontWeight: '600', 
    color: '#334155', 
    marginBottom: 3 
  },
  inputWrap: { 
    borderWidth: 1, 
    borderColor: '#dde3fa', 
    borderRadius: 10, 
    backgroundColor: '#ffffff', 
    minHeight: 36, 
    justifyContent: 'center' 
  },
  inputWrapFocused: { 
    backgroundColor: '#ffffff', 
    shadowColor: '#3b5bdb', 
    shadowOffset: { width: 0, height: 4 }, 
    shadowOpacity: 0.1, 
    shadowRadius: 8, 
    elevation: 3 
  },
  input: { 
    flex: 1, 
    paddingHorizontal: 12, 
    paddingVertical: Platform.OS === 'ios' ? 9 : 8, 
    fontSize: 13, 
    color: '#1a1f36', 
    backgroundColor: 'transparent', 
    minHeight: 40, 
    textAlignVertical: 'center' 
  },
  inputWithIcon: { 
    paddingRight: 40 
  },
  eyeBtn: { 
    position: 'absolute', 
    right: 8, 
    padding: 8 
  },
  inputError: { 
    borderColor: '#ef4444' 
  },
  fieldError: { 
    fontSize: 11, 
    color: '#ef4444', 
    marginTop: 3, 
    marginLeft: 2, 
    fontWeight: '500' 
  },
  inlineErrorText: { 
    fontSize: 11, 
    color: '#f59e0b', 
    marginTop: 2, 
    marginLeft: 2, 
    fontWeight: '500' 
  },
  strengthContainer: { 
    marginTop: 4 
  },
  strengthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  strengthBar: { 
    flex: 1,
    height: 3, 
    backgroundColor: '#e2e6f3', 
    borderRadius: 1.5, 
    overflow: 'hidden' 
  },
  strengthFill: { 
    height: '100%', 
    borderRadius: 1.5 
  },
  strengthText: { 
    fontSize: 10, 
    fontWeight: '600',
    minWidth: 48,
    textAlign: 'right',
  },
  matchSuccess: { 
    color: '#10b981', 
    fontSize: 11, 
    marginTop: 3, 
    marginLeft: 2, 
    fontWeight: '500'
  },
  btnCreate: { 
    backgroundColor: '#3b5bdb', 
    borderRadius: 10, 
    borderWidth: 1, 
    borderColor: '#2f49c7', 
    paddingVertical: 10, 
    alignItems: 'center', 
    marginTop: 4, 
    overflow: 'hidden', 
    shadowColor: '#3b5bdb', 
    shadowOffset: { width: 0, height: 6 }, 
    shadowOpacity: 0.2, 
    shadowRadius: 12, 
    elevation: 6 
  },
  btnDisabled: { 
    opacity: 0.75 
  },
  btnCreateText: { 
    color: '#ffffff', 
    fontSize: 14, 
    fontWeight: '700', 
    letterSpacing: 0.3 
  },
  divider: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginVertical: 8 
  },
  line: { 
    flex: 1, 
    height: 1, 
    backgroundColor: '#e5e9f5' 
  },
  orText: { 
    marginHorizontal: 8, 
    fontSize: 11, 
    color: '#8896b3', 
    fontWeight: '600' 
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
    marginTop: 4,
    backgroundColor: '#ffffff',
  },
  btnGoogleText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#1a1f36',
    marginLeft: 6,
  },
  termsWrap: { 
    flexDirection: 'row', 
    alignItems: 'flex-start', 
    gap: 8, 
    marginTop: 10, 
    padding: 8, 
    borderWidth: 1, 
    borderColor: '#e2e6f3', 
    borderRadius: 8, 
    backgroundColor: '#f8f9ff' 
  },
  termsError: { 
    borderColor: '#ef4444' 
  },
  customCheckbox: { 
    width: 16, 
    height: 16, 
    borderRadius: 8, 
    borderWidth: 2, 
    borderColor: '#8896b3', 
    alignItems: 'center', 
    justifyContent: 'center', 
    marginTop: 1, 
    flexShrink: 0 
  },
  customCheckboxChecked: { 
    borderColor: '#3b5bdb', 
    backgroundColor: '#3b5bdb' 
  },
  termsText: { 
    fontSize: 11.5, 
    color: '#4a5568', 
    flex: 1, 
    lineHeight: 16 
  },
  termsLink: { 
    fontWeight: '700', 
    color: '#3b5bdb' 
  },
  signinWrap: { 
    flexDirection: 'row', 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginTop: 12 
  },
  signinText: { 
    fontSize: 12, 
    color: '#64748b' 
  },
  signinLink: { 
    fontSize: 12, 
    fontWeight: '700', 
    color: '#3b5bdb' 
  },
  gridBackground: { 
    ...StyleSheet.absoluteFillObject, 
    width: '100%', 
    height: '100%' 
  },
  gridOverlay: { 
    ...StyleSheet.absoluteFillObject, 
    backgroundColor: 'rgba(255,255,255,0.10)' 
  },
  errorModalOverlay: { 
    flex: 1, 
    backgroundColor: 'rgba(0, 0, 0, 0.5)', 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  errorModalContainer: { 
    width: '85%', 
    maxWidth: 320, 
    backgroundColor: '#FFFFFF', 
    borderRadius: 20, 
    padding: 20, 
    alignItems: 'center', 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 4 }, 
    shadowOpacity: 0.15, 
    shadowRadius: 12, 
    elevation: 8 
  },
  errorModalIconWrapper: { 
    marginBottom: 12 
  },
  errorModalIconCircle: { 
    width: 56, 
    height: 56, 
    borderRadius: 28, 
    backgroundColor: '#f0f4ff', 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  errorModalTitle: { 
    fontSize: 18, 
    fontWeight: '700', 
    color: '#1e293b', 
    textAlign: 'center', 
    marginBottom: 6 
  },
  errorModalMessage: { 
    fontSize: 13, 
    color: '#64748b', 
    textAlign: 'center', 
    lineHeight: 18, 
    marginBottom: 20 
  },
  errorModalButtonPrimary: { 
    width: '100%', 
    paddingVertical: 10, 
    borderRadius: 10, 
    alignItems: 'center', 
    backgroundColor: '#3b5bdb', 
    flexDirection: 'row', 
    justifyContent: 'center' 
  },
  errorModalButtonTextPrimary: { 
    color: '#ffffff', 
    fontSize: 14, 
    fontWeight: '600' 
  },
});

const modalStyles = StyleSheet.create({
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContainer: { backgroundColor: '#ffffff', borderRadius: 24, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.25, shadowRadius: 20, elevation: 15 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#e2e6f3', backgroundColor: '#f8f9ff' },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#1a1f36' },
  tabBar: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#e2e6f3', backgroundColor: '#ffffff' },
  tab: { flex: 1, paddingVertical: 14, alignItems: 'center' },
  activeTab: { borderBottomWidth: 2, borderBottomColor: '#3b5bdb' },
  tabText: { fontSize: 14, fontWeight: '600', color: '#8896b3' },
  activeTabText: { color: '#3b5bdb' },
  tabContent: { padding: 20 },
  scrollHintBanner: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#eef2ff', paddingHorizontal: 14, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#c7d2fe' },
  scrollHintText: { fontSize: 12, color: '#3b5bdb', flex: 1, fontWeight: '500' },
  modalFooter: { flexDirection: 'row', padding: 16, borderTopWidth: 1, borderTopColor: '#e2e6f3', gap: 12, backgroundColor: '#ffffff' },
  agreeButton: { flex: 1, backgroundColor: '#3b5bdb', borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  agreeButtonDisabled: { backgroundColor: '#c7d2fe' },
  agreeButtonText: { color: '#ffffff', fontSize: 15, fontWeight: '700' },
  agreeButtonTextDisabled: { color: '#8fa3e0' },
  declineButton: { flex: 1, backgroundColor: '#e5e9f5', borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  declineButtonText: { color: '#4a5568', fontSize: 14, fontWeight: '600' },
  scrollTopButton: { position: 'absolute', bottom: 80, right: 20, backgroundColor: '#3b5bdb', width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6, zIndex: 10 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#3b5bdb', marginTop: 20, marginBottom: 8 },
  subSection: { fontSize: 16, fontWeight: '600', color: '#4a5568', marginTop: 12, marginBottom: 4 },
  text: { fontSize: 14, color: '#4a5568', lineHeight: 22, marginBottom: 8 },
  footer: { fontSize: 12, color: '#8896b3', textAlign: 'center', marginTop: 24, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#e2e6f3' },
});