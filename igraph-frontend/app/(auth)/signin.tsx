// app/(auth)/signin.tsx

import React, { useState, useRef, useEffect } from 'react';
import { Pressable, Modal, ScrollView as ModalScroll } from 'react-native';
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
import { initializeApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth, signInWithPopup, GoogleAuthProvider, browserSessionPersistence, setPersistence } from 'firebase/auth';
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

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCyM0zjlTQ6cCuAf3CGWbxLnUUle_z88F8",
  authDomain: "igraph-it.firebaseapp.com",
  projectId: "igraph-it",
  storageBucket: "igraph-it.firebasestorage.app",
  messagingSenderId: "513560698622",
  appId: "1:513560698622:web:71e12cbf9a1bb95dab0faf"
};

// Initialize Firebase
let firebaseApp: FirebaseApp | undefined;
let auth: Auth | undefined;

if (Platform.OS === 'web') {
  firebaseApp = initializeApp(firebaseConfig);
  auth = getAuth(firebaseApp);
}

// ─── TERMS AND PRIVACY POLICY CONTENT ──────────────────────────────────────────────

const TermsContent = () => (
  <View style={modalStyles.tabContent}>
    <Text style={modalStyles.sectionTitle}>1. Acceptance of Terms</Text>
    <Text style={modalStyles.text}>By registering for or using iGraph IT ("Platform"), you agree to be bound by these Terms and Conditions. If you disagree with any part, you must not use our Platform.</Text>

    <Text style={modalStyles.sectionTitle}>2. Account Registration</Text>
    <Text style={modalStyles.subSection}>2.1 Account Security</Text>
    <Text style={modalStyles.text}>• You are responsible for maintaining password confidentiality{'\n'}• You must notify us immediately of unauthorized access{'\n'}• We are not liable for losses from compromised accounts</Text>
    <Text style={modalStyles.subSection}>2.2 Accuracy of Information</Text>
    <Text style={modalStyles.text}>You must provide accurate, current, and complete information during registration and update it as needed.</Text>

    <Text style={modalStyles.sectionTitle}>3. User Conduct</Text>
    <Text style={modalStyles.text}>You agree NOT to:{'\n'}• Share your account credentials with others{'\n'}• Attempt to bypass authentication mechanisms{'\n'}• Use automated scripts to access the Platform{'\n'}• Upload malicious content or code{'\n'}• Attempt to access other users' data{'\n'}• Reverse engineer any part of the Platform{'\n'}• Use the Platform for illegal activities</Text>

    <Text style={modalStyles.sectionTitle}>4. Intellectual Property</Text>
    <Text style={modalStyles.subSection}>4.1 Our Content</Text>
    <Text style={modalStyles.text}>All platform content, including UI design, diagrams, educational materials about SDLC and UML, and source code is owned by iGraph IT and protected by copyright laws.</Text>
    <Text style={modalStyles.subSection}>4.2 Your Content</Text>
    <Text style={modalStyles.text}>• You retain ownership of diagrams you create{'\n'}• You grant us license to display your content within the Platform{'\n'}• You are responsible for your content's legality</Text>

    <Text style={modalStyles.sectionTitle}>5. Authentication and Security</Text>
    <Text style={modalStyles.subSection}>5.1 Token Management</Text>
    <Text style={modalStyles.text}>• Access tokens expire after 15 minutes{'\n'}• Refresh tokens expire after 7 days{'\n'}• You must re-authenticate after token expiration</Text>
    <Text style={modalStyles.subSection}>5.2 OTP Verification</Text>
    <Text style={modalStyles.text}>• OTPs expire after 5 minutes{'\n'}• Maximum 3 OTP requests per 15 minutes{'\n'}• Do not share OTPs with anyone</Text>

    <Text style={modalStyles.sectionTitle}>6. Limitation of Liability</Text>
    <Text style={modalStyles.text}>To the maximum extent permitted by law, the Platform is provided "as is" without warranties. We are not liable for indirect, incidental, or consequential damages.</Text>

    <Text style={modalStyles.sectionTitle}>7. Governing Law</Text>
    <Text style={modalStyles.text}>These terms are governed by the laws of the Philippines, without regard to conflict of law principles.</Text>

    <Text style={modalStyles.sectionTitle}>8. Contact Us</Text>
    <Text style={modalStyles.text}>Email: legal@igraphit.com{'\n'}Response time: Within 5 business days</Text>

    <Text style={modalStyles.footer}>By using iGraph IT, you acknowledge that you have read, understood, and agree to be bound by these Terms and Conditions.</Text>
  </View>
);

const PrivacyContent = () => (
  <View style={modalStyles.tabContent}>
    <Text style={modalStyles.sectionTitle}>1. Introduction</Text>
    <Text style={modalStyles.text}>Welcome to iGraph IT. We are committed to protecting your personal information and your right to privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information.</Text>

    <Text style={modalStyles.sectionTitle}>2. Information We Collect</Text>
    <Text style={modalStyles.subSection}>2.1 Personal Information You Provide</Text>
    <Text style={modalStyles.text}>• Account Information: Full name, username, email address, password (encrypted){'\n'}• Profile Information: Profile picture (optional){'\n'}• Authentication Data: Sign-in methods (email/password or Google OAuth)</Text>
    <Text style={modalStyles.subSection}>2.2 Automatically Collected Information</Text>
    <Text style={modalStyles.text}>• Usage Data: Pages visited, diagrams created, time spent on platform{'\n'}• Device Information: Browser type, operating system, IP address{'\n'}• Cookies and Similar Technologies: To enhance user experience</Text>

    <Text style={modalStyles.sectionTitle}>3. How We Use Your Information</Text>
    <Text style={modalStyles.text}>We use your information to:{'\n'}• Create and manage your account{'\n'}• Authenticate your identity and secure your access{'\n'}• Send OTP verification and password reset emails{'\n'}• Improve our platform and user experience{'\n'}• Provide customer support{'\n'}• Comply with legal obligations</Text>

    <Text style={modalStyles.sectionTitle}>4. Data Storage and Security</Text>
    <Text style={modalStyles.text}>• Your password is encrypted using bcrypt (12 rounds){'\n'}• Access tokens expire after 15 minutes{'\n'}• Refresh tokens expire after 7 days{'\n'}• All data is stored in Firebase Firestore (Google Cloud){'\n'}• We use industry-standard security including HTTPS/TLS encryption</Text>

    <Text style={modalStyles.sectionTitle}>5. Email Communications</Text>
    <Text style={modalStyles.text}>We may send you account verification OTPs, password reset links, and important platform updates. You cannot opt out of transactional emails as they are essential for account security.</Text>

    <Text style={modalStyles.sectionTitle}>6. Data Retention</Text>
    <Text style={modalStyles.text}>• Account data: Until you delete your account{'\n'}• Session data: 7 days from last activity{'\n'}• OTP codes: Deleted after 5 minutes or once used</Text>

    <Text style={modalStyles.sectionTitle}>7. Your Rights</Text>
    <Text style={modalStyles.text}>You have the right to access your personal data, correct inaccurate data, delete your account, opt out of marketing communications, and export your data.</Text>

    <Text style={modalStyles.sectionTitle}>8. Third-Party Services</Text>
    <Text style={modalStyles.text}>We use Firebase (Google) for authentication and database, Brevo for email delivery, and Google OAuth for optional sign-in. These services have their own privacy policies.</Text>

    <Text style={modalStyles.sectionTitle}>9. Children's Privacy</Text>
    <Text style={modalStyles.text}>iGraph IT is not intended for children under 13. We do not knowingly collect information from children under 13.</Text>

    <Text style={modalStyles.sectionTitle}>10. Contact Us</Text>
    <Text style={modalStyles.text}>For privacy concerns, contact us at: privacy@igraphit.com</Text>

    <Text style={modalStyles.footer}>By using iGraph IT, you acknowledge that you have read, understood, and agree to this Privacy Policy.</Text>
  </View>
);

// ─── TABBED MODAL COMPONENT ──────────────────────────────────────────────────────────────

// Update the PolicyModal component only - replace the existing one:

const PolicyModal = ({ visible, onClose, onAgree }: { visible: boolean; onClose: () => void; onAgree: () => void }) => {
  const [activeTab, setActiveTab] = useState<'terms' | 'privacy'>('terms');
  const scrollViewRef = useRef<ScrollView>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);

  const scrollToTop = () => {
    scrollViewRef.current?.scrollTo({ y: 0, animated: true });
  };

  const handleAgree = () => {
    onAgree();
    onClose();
  };

  return (
    <Modal animationType="slide" transparent={true} visible={visible} onRequestClose={onClose}>
      <View style={modalStyles.modalOverlay}>
        <View style={modalStyles.modalContainer}>
          <View style={modalStyles.modalHeader}>
            <Text style={modalStyles.modalTitle}>Legal Agreement</Text>
            {/* REMOVED X BUTTON */}
          </View>

          {/* Tab Bar */}
          <View style={modalStyles.tabBar}>
            <TouchableOpacity
              style={[modalStyles.tab, activeTab === 'terms' && modalStyles.activeTab]}
              onPress={() => setActiveTab('terms')}
            >
              <Text style={[modalStyles.tabText, activeTab === 'terms' && modalStyles.activeTabText]}>
                Terms & Conditions
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[modalStyles.tab, activeTab === 'privacy' && modalStyles.activeTab]}
              onPress={() => setActiveTab('privacy')}
            >
              <Text style={[modalStyles.tabText, activeTab === 'privacy' && modalStyles.activeTabText]}>
                Privacy Policy
              </Text>
            </TouchableOpacity>
          </View>

          {/* Tab Content with ScrollView ref */}
          <ModalScroll
            ref={scrollViewRef}
            showsVerticalScrollIndicator={false}
            onScroll={(event) => {
              const offsetY = event.nativeEvent.contentOffset.y;
              setShowScrollTop(offsetY > 200);
            }}
            scrollEventThrottle={16}
          >
            {activeTab === 'terms' ? <TermsContent /> : <PrivacyContent />}
          </ModalScroll>

          {/* Scroll to Top Button - Arrow Up */}
          {showScrollTop && (
            <TouchableOpacity style={modalStyles.scrollTopButton} onPress={scrollToTop} activeOpacity={0.8}>
              <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
                <Path d="M12 19V5M5 12l7-7 7 7" stroke="#ffffff" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
              </Svg>
            </TouchableOpacity>
          )}

          {/* Footer with Agree Button */}
          <View style={modalStyles.modalFooter}>
            <TouchableOpacity style={modalStyles.agreeButton} onPress={handleAgree}>
              <Text style={modalStyles.agreeButtonText}>I Agree</Text>
            </TouchableOpacity>
            <TouchableOpacity style={modalStyles.declineButton} onPress={onClose}>
              <Text style={modalStyles.declineButtonText}>Decline</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const DiagramBackground = () => (
  <View style={StyleSheet.absoluteFillObject} pointerEvents="none">

    {/* GRID IMAGE */}
    <Image
      source={require('../../assets/images/grid-bg.png')}
      style={styles.gridBackground}
      resizeMode="repeat"
    />

    {/* LIGHT OVERLAY */}
    <View style={styles.gridOverlay} />

    {/* SVG NODE LAYER */}
    <Svg
      width="100%"
      height="100%"
      viewBox={`0 0 ${SCREEN_WIDTH} ${SCREEN_HEIGHT}`}
      preserveAspectRatio="xMidYMid slice"
      style={StyleSheet.absoluteFillObject}
    >

      {/* FLOW LINE */}
      <Path
        d={`
          M ${SCREEN_WIDTH * 0.08} ${SCREEN_HEIGHT * 0.25}
          C ${SCREEN_WIDTH * 0.22} ${SCREEN_HEIGHT * 0.10},
            ${SCREEN_WIDTH * 0.36} ${SCREEN_HEIGHT * 0.42},
            ${SCREEN_WIDTH * 0.52} ${SCREEN_HEIGHT * 0.32}
        `}
        stroke="#bfd0ff"
        strokeWidth="2"
        strokeDasharray="8 10"
        fill="none"
        opacity="0.32"
      />

      {/* FLOW LINE */}
      <Path
        d={`
          M ${SCREEN_WIDTH * 0.82} ${SCREEN_HEIGHT * 0.18}
          C ${SCREEN_WIDTH * 0.96} ${SCREEN_HEIGHT * 0.30},
            ${SCREEN_WIDTH * 0.95} ${SCREEN_HEIGHT * 0.55},
            ${SCREEN_WIDTH * 0.78} ${SCREEN_HEIGHT * 0.76}
        `}
        stroke="#bfd0ff"
        strokeWidth="2"
        strokeDasharray="8 10"
        fill="none"
        opacity="0.32"
      />

      {/* UML BOX */}
      <Rect
        x={SCREEN_WIDTH * 0.07}
        y={SCREEN_HEIGHT * 0.12}
        width="130"
        height="72"
        rx="14"
        stroke="#bfd0ff"
        strokeWidth="1.4"
        fill="none"
        opacity="0.38"
      />

      {/* UML BOX */}
      <Rect
        x={SCREEN_WIDTH * 0.74}
        y={SCREEN_HEIGHT * 0.16}
        width="140"
        height="78"
        rx="14"
        stroke="#bfd0ff"
        strokeWidth="1.4"
        fill="none"
        opacity="0.38"
      />

      {/* DECISION DIAMOND */}
      <Path
        d={`
          M ${SCREEN_WIDTH * 0.15} ${SCREEN_HEIGHT * 0.56}
          L ${SCREEN_WIDTH * 0.19} ${SCREEN_HEIGHT * 0.60}
          L ${SCREEN_WIDTH * 0.15} ${SCREEN_HEIGHT * 0.64}
          L ${SCREEN_WIDTH * 0.11} ${SCREEN_HEIGHT * 0.60}
          Z
        `}
        stroke="#bfd0ff"
        strokeWidth="1.5"
        fill="none"
        opacity="0.35"
      />

      {/* CIRCLE */}
      <Circle
        cx={SCREEN_WIDTH * 0.76}
        cy={SCREEN_HEIGHT * 0.72}
        r="24"
        stroke="#bfd0ff"
        strokeWidth="2"
        fill="none"
        opacity="0.3"
      />

      {/* LABELS */}
      <SvgText
        x={SCREEN_WIDTH * 0.10}
        y={SCREEN_HEIGHT * 0.11}
        fontSize="11"
        fill="#9bb0ea"
        opacity="0.65"
      >
      </SvgText>

      <SvgText
        x={SCREEN_WIDTH * 0.76}
        y={SCREEN_HEIGHT * 0.15}
        fontSize="11"
        fill="#9bb0ea"
        opacity="0.65"
      >
       
      </SvgText>

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
  const [errors, setErrors] = useState({ email: '', password: '', terms: '' });
  
  // Modal states
  const [showPolicyModal, setShowPolicyModal] = useState(false);

  const passwordRef = useRef<TextInput>(null);

  // Open modal and reset agreement
  const openPolicyModal = () => {
    setShowPolicyModal(true);
  };

  // Handle agreement from modal
  const handleAgree = () => {
    setAgreed(true);
    setErrors(prev => ({ ...prev, terms: '' }));
  };

  // Firebase Google Sign In with agreement check
  const handleFirebaseGoogleSignIn = async () => {
    if (!agreed) {
      setErrors(prev => ({ ...prev, terms: 'You must agree to the Terms and Privacy Policy before continuing' }));
      openPolicyModal();
      return;
    }

    if (!auth) {
      Alert.alert('Error', 'Firebase auth not available on this platform');
      return;
    }

    setLoading(true);
    try {
      await setPersistence(auth, browserSessionPersistence);
      const provider = new GoogleAuthProvider();
      provider.addScope('email');
      provider.addScope('profile');
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      const idToken = await user.getIdToken();
      const apiResult = await authService.googleAuth(idToken);
      
      if (apiResult.success) {
        router.replace('/(tabs)/home');
      } else {
        Alert.alert('Sign In Failed', apiResult.message || 'Google sign in failed');
        await auth.signOut();
      }
    } catch (error: any) {
      console.error('Firebase Google Sign-In error:', error);
      if (error.code === 'auth/popup-blocked') {
        Alert.alert('Popup Blocked', 'Please allow popups for this site and try again.');
      } else {
        Alert.alert('Google Sign In Failed', error.message || 'Something went wrong');
      }
    } finally {
      setLoading(false);
    }
  };

  // In the handleSignIn function, update the error handling:

const handleSignIn = async () => {
  const newErrors = { email: '', password: '', terms: '' };

  if (!email) newErrors.email = 'Email is required';
  if (!password) newErrors.password = 'Password is required';
  if (!agreed) newErrors.terms = 'You must agree to the Terms and Privacy Policy';

  setErrors(newErrors);
  
  // If terms not agreed, open modal
  if (!agreed) {
    openPolicyModal();
    return;
  }
  
  if (newErrors.email || newErrors.password) return;

  setLoading(true);
  try {
    const result = await authService.signIn(email, password);
    if (result.success) {
      router.replace('/(tabs)/home');
    } else {
      // Show specific error for invalid credentials
      if (result.message === 'Invalid email or password.' || 
          result.message?.includes('Invalid') ||
          result.message?.includes('invalid')) {
        setErrors(prev => ({ ...prev, password: 'Invalid email or password. Please try again.' }));
      } else {
        Alert.alert('Sign In Failed', result.message || 'Invalid email or password');
      }
    }
  } catch (error: any) {
    console.error('Sign in error:', error);
    // Handle 401 Unauthorized error
    if (error.response?.status === 401) {
      setErrors(prev => ({ ...prev, password: 'Invalid email or password. Please try again.' }));
    } else if (error.response?.data?.message) {
      // Check if it's an invalid credentials message
      const msg = error.response.data.message;
      if (msg === 'Invalid email or password.' || msg?.toLowerCase().includes('invalid')) {
        setErrors(prev => ({ ...prev, password: 'Invalid email or password. Please try again.' }));
      } else if (msg === 'EMAIL_NOT_VERIFIED' || msg?.toLowerCase().includes('verify')) {
        Alert.alert('Email Not Verified', 'Please verify your email address before signing in.');
      } else {
        Alert.alert('Sign In Failed', msg || 'Something went wrong');
      }
    } else {
      Alert.alert('Sign In Failed', error.message || 'Something went wrong');
    }
  } finally {
    setLoading(false);
  }
};

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Policy Modal with Tabs */}
      <PolicyModal 
        visible={showPolicyModal} 
        onClose={() => setShowPolicyModal(false)} 
        onAgree={handleAgree}
      />

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <DiagramBackground />

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          automaticallyAdjustKeyboardInsets={true}
          keyboardDismissMode="interactive"
          contentInsetAdjustmentBehavior="always"
        >
          
          <View style={styles.card}>
            <View style={styles.connectorTop} />
            <View style={styles.connectorBottom} />
            <View style={styles.connectorLeft} />
            <View style={styles.connectorRight} />

            <View style={styles.logoWrap}>
              <Image source={require('../../assets/images/logo.png')} style={styles.logo} resizeMode="contain" />
            </View>

            <Text style={styles.heading}>Welcome Back</Text>
            <Text style={styles.subtitle}>Sign in to continue your learning journey</Text>

            {/* EMAIL */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Email</Text>
              <View style={[styles.inputWrap, emailFocused && styles.inputWrapFocused, errors.email && styles.inputError]}>
                <TextInput
                  style={[styles.input, Platform.OS === 'web' ? { outlineWidth: 0 } : null]}
                  placeholder="you@example.com"
                  placeholderTextColor="#b8c0d4"
                  value={email}
                  onChangeText={(text) => { setEmail(text); if (errors.email) setErrors(prev => ({ ...prev, email: '' })); }}
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

            {/* PASSWORD */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Password</Text>
              <View style={[styles.inputWrap, passwordFocused && styles.inputWrapFocused, errors.password && styles.inputError]}>
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
                <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowPassword(!showPassword)} activeOpacity={0.7}>
                  <EyeIcon visible={showPassword} />
                </TouchableOpacity>
              </View>
              {errors.password ? <Text style={styles.errorText}>{errors.password}</Text> : null}
              <TouchableOpacity style={styles.forgotWrap} onPress={() => router.push('/(auth)/forgot-password')} activeOpacity={0.7}>
                <Text style={styles.forgotText}>Forgot password?</Text>
              </TouchableOpacity>
            </View>

            {/* SIGN IN BUTTON */}
            <Pressable
              style={({ pressed }) => [styles.btnSignIn, loading && styles.btnDisabled, { transform: [{ scale: pressed ? 0.97 : 1 }], opacity: pressed ? 0.9 : 1 }]}
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

            {/* GOOGLE - with agreement check */}
            <TouchableOpacity style={styles.btnGoogle} onPress={handleFirebaseGoogleSignIn} activeOpacity={0.85} disabled={loading}>
              <GoogleIcon />
              <Text style={styles.btnGoogleText}>Continue with Google</Text>
            </TouchableOpacity>

            {/* TERMS - Click to open modal */}
            <TouchableOpacity style={[styles.termsWrap, errors.terms && styles.termsError]} onPress={openPolicyModal} activeOpacity={0.8}>
              <View style={[styles.customCheckbox, agreed && styles.customCheckboxChecked]}>
                {agreed && (
                  <Svg width={10} height={10} viewBox="0 0 10 10">
                    <Path d="M2 5l2.5 2.5L8 3" stroke="white" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" fill="none" />
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

            {errors.terms ? <Text style={styles.errorText}>{errors.terms}</Text> : null}

            {/* SIGN UP LINK */}
            <View style={styles.signupWrap}>
              <Text style={styles.signupText}>Don't have an account? </Text>
              <TouchableOpacity onPress={() => router.push('/(auth)/signup')} activeOpacity={0.7}>
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

  card: {
  backgroundColor: '#ffffff',
  borderRadius: 24,
  paddingHorizontal: 28,
  paddingVertical: 28,
  width: '100%',
  maxWidth: 420,
  minWidth: 320,
  position: 'relative',

  shadowColor: '#0a0f1e',
  shadowOffset: { width: 0, height: 20 },
  shadowOpacity: 0.08,
  shadowRadius: 40,
  elevation: 10,

  marginTop: -25,
},
  connectorTop: { position: 'absolute', top: -5, alignSelf: 'center', width: 10, height: 10, borderRadius: 5, backgroundColor: '#ffffff', borderWidth: 1.5, borderColor: '#cbd5f5' },
  connectorBottom: { position: 'absolute', bottom: -5, alignSelf: 'center', width: 10, height: 10, borderRadius: 5, backgroundColor: '#ffffff', borderWidth: 1.5, borderColor: '#cbd5f5' },
  connectorLeft: { position: 'absolute', left: -5, top: '50%', transform: [{ translateY: -5 }], width: 10, height: 10, borderRadius: 5, backgroundColor: '#ffffff', borderWidth: 1.5, borderColor: '#cbd5f5' },
  connectorRight: { position: 'absolute', right: -5, top: '50%', transform: [{ translateY: -5 }], width: 10, height: 10, borderRadius: 5, backgroundColor: '#ffffff', borderWidth: 1.5, borderColor: '#cbd5f5' },
  logoWrap: { alignItems: 'center', marginBottom: 16 },
  logo: { width: 56, height: 56, borderRadius: 14, backgroundColor: 'transparent' },
  heading: { fontSize: 28, fontWeight: '800', color: '#0f172a', textAlign: 'center' },
  subtitle: { fontSize: 14, color: '#64748b', marginBottom: 24, textAlign: 'center' },
  formGroup: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', color: '#334155' },
  inputWrap: { borderWidth: 1, borderColor: '#d0d7ff', borderRadius: 12, backgroundColor: '#ffffff', minHeight: 40, justifyContent: 'center' },
  inputWrapFocused: { borderColor: '#3b5bdb', backgroundColor: '#ffffff', shadowColor: '#3b5bdb', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 4 },
  input: { flex: 1, paddingHorizontal: 14, paddingVertical: Platform.OS === 'ios' ? 11 : 9, fontSize: 14, color: '#1a1f36', backgroundColor: 'transparent', minHeight: 44, textAlignVertical: 'center' },
  inputWithIcon: { paddingRight: 44 },
  eyeBtn: { position: 'absolute', right: 12, padding: 10 },
  forgotWrap: { alignItems: 'flex-end', marginTop: 6 },
  forgotText: { fontSize: 12.5, color: '#8896b3', fontWeight: '500' },
  inputError: { borderColor: '#e11d48' },
  termsError: { borderColor: '#e11d48' },
  errorText: { fontSize: 12, color: '#e11d48', marginTop: 6, marginLeft: 4, fontWeight: '500' },
  btnSignIn: { backgroundColor: '#3b5bdb', borderRadius: 12, borderWidth: 1, borderColor: '#2f49c7', paddingVertical: 12, alignItems: 'center', marginTop: 5, overflow: 'hidden', shadowColor: '#3b5bdb', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.25, shadowRadius: 20, elevation: 8 },
  btnDisabled: { opacity: 0.75 },
  btnSignInText: { color: '#ffffff', fontSize: 15, fontWeight: '700', letterSpacing: 0.3 },
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 10 },
  line: { flex: 1, height: 1, backgroundColor: '#e5e9f5' },
  orText: { marginHorizontal: 10, fontSize: 12, color: '#8896b3', fontWeight: '600' },
  btnGoogle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12, paddingVertical: 8, marginTop: 5, backgroundColor: '#ffffff' },
  btnGoogleText: { fontSize: 14, fontWeight: '500', color: '#1a1f36', marginLeft: 8 },
  termsWrap: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginTop: 14, padding: 10, borderWidth: 1.5, borderColor: '#e2e6f3', borderRadius: 10, backgroundColor: '#f8f9ff' },
  customCheckbox: { width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: '#8896b3', alignItems: 'center', justifyContent: 'center', marginTop: 1, flexShrink: 0 },
  customCheckboxChecked: { borderColor: '#3b5bdb', backgroundColor: '#3b5bdb' },
  termsText: { fontSize: 12.5, color: '#4a5568', flex: 1, lineHeight: 18 },
  termsLink: { fontWeight: '700', color: '#3b5bdb' },
  signupWrap: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 20 },
  signupText: { fontSize: 13, color: '#64748b' },
  signupLink: { fontSize: 13, fontWeight: '700', color: '#3b5bdb' },
});

// Modal Styles
const modalStyles = StyleSheet.create({
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContainer: { width: SCREEN_WIDTH - 40, maxWidth: 500, maxHeight: SCREEN_HEIGHT - 80, backgroundColor: '#ffffff', borderRadius: 24, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.25, shadowRadius: 20, elevation: 15 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#e2e6f3', backgroundColor: '#f8f9ff' },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#1a1f36', alignItems: 'center'},
  closeButton: { padding: 4 },
  
  // Tab Styles
  tabBar: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#e2e6f3', backgroundColor: '#ffffff' },
  tab: { flex: 1, paddingVertical: 14, alignItems: 'center' },
  activeTab: { borderBottomWidth: 2, borderBottomColor: '#3b5bdb' },
  tabText: { fontSize: 14, fontWeight: '600', color: '#8896b3' },
  activeTabText: { color: '#3b5bdb' },
  tabContent: { padding: 20 },
  
  // Footer Buttons
  modalFooter: { flexDirection: 'row', padding: 16, borderTopWidth: 1, borderTopColor: '#e2e6f3', gap: 12, backgroundColor: '#ffffff' },
  agreeButton: { flex: 1, backgroundColor: '#3b5bdb', borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  agreeButtonText: { color: '#ffffff', fontSize: 16, fontWeight: '700' },
  declineButton: { flex: 1, backgroundColor: '#e5e9f5', borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  declineButtonText: { color: '#4a5568', fontSize: 16, fontWeight: '600' },

  // Add to modalStyles object:

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
  
  // Content Styles
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#3b5bdb', marginTop: 20, marginBottom: 8 },
  subSection: { fontSize: 16, fontWeight: '600', color: '#4a5568', marginTop: 12, marginBottom: 4 },
  text: { fontSize: 14, color: '#4a5568', lineHeight: 22, marginBottom: 8 },
  footer: { fontSize: 12, color: '#8896b3', textAlign: 'center', marginTop: 24, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#e2e6f3' },
});