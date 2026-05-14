// app/(auth)/signup.tsx

import React, { useState, useRef } from 'react';
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
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Svg, Circle, Rect, Path, Defs, Pattern } from 'react-native-svg';
import * as authService from '@/services/authService';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// ==================== TERMS AND PRIVACY CONTENT ====================

const TermsContent = () => (
  <View style={modalStyles.tabContent}>
    <Text style={modalStyles.sectionTitle}>1. Acceptance of Terms</Text>
    <Text style={modalStyles.text}>By registering for or using iGraph IT ("Platform"), you agree to be bound by these Terms and Conditions.</Text>

    <Text style={modalStyles.sectionTitle}>2. Account Registration</Text>
    <Text style={modalStyles.subSection}>2.1 Account Security</Text>
    <Text style={modalStyles.text}>• You are responsible for maintaining password confidentiality{'\n'}• You must notify us immediately of unauthorized access</Text>
    <Text style={modalStyles.subSection}>2.2 Accuracy of Information</Text>
    <Text style={modalStyles.text}>You must provide accurate, current, and complete information during registration.</Text>

    <Text style={modalStyles.sectionTitle}>3. User Conduct</Text>
    <Text style={modalStyles.text}>You agree NOT to share account credentials, bypass authentication, use automated scripts, upload malicious content, or use the Platform for illegal activities.</Text>

    <Text style={modalStyles.sectionTitle}>4. Intellectual Property</Text>
    <Text style={modalStyles.text}>All platform content is owned by iGraph IT. You retain ownership of diagrams you create.</Text>

    <Text style={modalStyles.sectionTitle}>5. Authentication and Security</Text>
    <Text style={modalStyles.text}>• Access tokens expire after 15 minutes{'\n'}• Refresh tokens expire after 7 days{'\n'}• OTPs expire after 5 minutes</Text>

    <Text style={modalStyles.sectionTitle}>6. Limitation of Liability</Text>
    <Text style={modalStyles.text}>The Platform is provided "as is". We are not liable for indirect or consequential damages.</Text>

    <Text style={modalStyles.sectionTitle}>7. Governing Law</Text>
    <Text style={modalStyles.text}>These terms are governed by the laws of the Philippines.</Text>

    <Text style={modalStyles.sectionTitle}>8. Contact Us</Text>
    <Text style={modalStyles.text}>Email: legal@igraphit.com</Text>

    <Text style={modalStyles.footer}>By using iGraph IT, you agree to these Terms and Conditions.</Text>
  </View>
);

const PrivacyContent = () => (
  <View style={modalStyles.tabContent}>
    <Text style={modalStyles.sectionTitle}>1. Introduction</Text>
    <Text style={modalStyles.text}>We are committed to protecting your personal information and your right to privacy.</Text>

    <Text style={modalStyles.sectionTitle}>2. Information We Collect</Text>
    <Text style={modalStyles.subSection}>Personal Information</Text>
    <Text style={modalStyles.text}>Full name, username, email address, encrypted password, profile picture (optional).</Text>
    <Text style={modalStyles.subSection}>Usage Data</Text>
    <Text style={modalStyles.text}>Pages visited, diagrams created, time spent on platform.</Text>

    <Text style={modalStyles.sectionTitle}>3. How We Use Your Information</Text>
    <Text style={modalStyles.text}>To create and manage your account, authenticate your identity, send OTP verification, improve our platform, and comply with legal obligations.</Text>

    <Text style={modalStyles.sectionTitle}>4. Data Storage and Security</Text>
    <Text style={modalStyles.text}>Passwords are encrypted using bcrypt. All data is stored in Firebase Firestore with HTTPS/TLS encryption.</Text>

    <Text style={modalStyles.sectionTitle}>5. Email Communications</Text>
    <Text style={modalStyles.text}>We send account verification OTPs and password reset links. These are essential and cannot be opted out of.</Text>

    <Text style={modalStyles.sectionTitle}>6. Your Rights</Text>
    <Text style={modalStyles.text}>You have the right to access your data, correct inaccurate data, delete your account, and export your data.</Text>

    <Text style={modalStyles.sectionTitle}>7. Contact Us</Text>
    <Text style={modalStyles.text}>Email: privacy@igraphit.com</Text>

    <Text style={modalStyles.footer}>By using iGraph IT, you agree to this Privacy Policy.</Text>
  </View>
);

// ==================== POLICY MODAL COMPONENT ====================

const PolicyModal = ({ visible, onClose, onAgree }: { visible: boolean; onClose: () => void; onAgree: () => void }) => {
  const [activeTab, setActiveTab] = useState<'terms' | 'privacy'>('terms');

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
          </View>

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

          <ScrollView style={modalStyles.modalBody}>
            {activeTab === 'terms' ? <TermsContent /> : <PrivacyContent />}
          </ScrollView>

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

// ==================== CUSTOM ERROR POPUP MODAL ====================

const ErrorPopupModal = ({ visible, title, message, onClose }: { 
  visible: boolean; 
  title: string; 
  message: string; 
  onClose: () => void;
}) => {
  return (
    <Modal animationType="fade" transparent={true} visible={visible} onRequestClose={onClose}>
      <View style={styles.errorModalOverlay}>
        <View style={styles.errorModalContainer}>
          <View style={styles.errorModalIcon}>
            <Svg width={56} height={56} viewBox="0 0 56 56" fill="none">
              <Circle cx="28" cy="28" r="26" fill="#FEE2E2" stroke="#EF4444" strokeWidth="2" />
              <Path d="M28 16V30M28 38H28.01" stroke="#EF4444" strokeWidth="3" strokeLinecap="round" />
            </Svg>
          </View>
          <Text style={styles.errorModalTitle}>{title}</Text>
          <Text style={styles.errorModalMessage}>{message}</Text>
          <View style={styles.errorModalButtons}>
            <TouchableOpacity style={styles.errorModalButton} onPress={onClose}>
              <Text style={styles.errorModalButtonText}>Got it</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

// ==================== BACKGROUND ====================

const DiagramBackground = () => (
  <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
    <Image
      source={require('../../assets/images/grid-bg.png')}
      style={styles.gridBackground}
      resizeMode="repeat"
    />
    <View style={styles.gridOverlay} />
    <Svg width="100%" height="100%" viewBox={`0 0 ${SCREEN_WIDTH} ${SCREEN_HEIGHT}`} style={StyleSheet.absoluteFillObject}>
      <Path
        d={`M ${SCREEN_WIDTH * 0.08} ${SCREEN_HEIGHT * 0.22} C ${SCREEN_WIDTH * 0.20} ${SCREEN_HEIGHT * 0.08}, ${SCREEN_WIDTH * 0.38} ${SCREEN_HEIGHT * 0.42}, ${SCREEN_WIDTH * 0.52} ${SCREEN_HEIGHT * 0.30}`}
        stroke="#bfd0ff" strokeWidth="2" strokeDasharray="8 10" fill="none" opacity="0.30"
      />
      <Rect x={SCREEN_WIDTH * 0.08} y={SCREEN_HEIGHT * 0.12} width="130" height="74" rx="14" stroke="#bfd0ff" strokeWidth="1.4" fill="none" opacity="0.38" />
      <Rect x={SCREEN_WIDTH * 0.74} y={SCREEN_HEIGHT * 0.20} width="140" height="78" rx="14" stroke="#bfd0ff" strokeWidth="1.4" fill="none" opacity="0.38" />
      <Circle cx={SCREEN_WIDTH * 0.76} cy={SCREEN_HEIGHT * 0.74} r="22" stroke="#bfd0ff" strokeWidth="2" fill="none" opacity="0.30" />
    </Svg>
  </View>
);

// ==================== EYE ICON ====================

const EyeIcon = ({ visible }: { visible: boolean }) => (
  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
    {visible ? (
      <>
        <Path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="#8896b3" strokeWidth={1.8} />
        <Circle cx={12} cy={12} r={3} stroke="#8896b3" strokeWidth={1.8} />
      </>
    ) : (
      <>
        <Path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94" stroke="#8896b3" strokeWidth={1.8} />
        <Path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19" stroke="#8896b3" strokeWidth={1.8} />
        <Path d="M1 1l22 22" stroke="#8896b3" strokeWidth={1.8} />
      </>
    )}
  </Svg>
);

// ==================== MAIN COMPONENT ====================

export default function SignUp() {
  const router = useRouter();

  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPolicyModal, setShowPolicyModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorModalData, setErrorModalData] = useState({ title: '', message: '' });
  const [errors, setErrors] = useState({
    fullName: '',
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    agreed: '',
  });

  const usernameRef = useRef<TextInput>(null);
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const confirmPasswordRef = useRef<TextInput>(null);

  const openPolicyModal = () => {
    setShowPolicyModal(true);
  };

  const handleAgree = () => {
    setAgreed(true);
    setErrors(prev => ({ ...prev, agreed: '' }));
  };

  const showErrorPopup = (title: string, message: string) => {
    setErrorModalData({ title, message });
    setShowErrorModal(true);
  };

  const validate = () => {
    const newErrors = {
      fullName: '',
      username: '',
      email: '',
      password: '',
      confirmPassword: '',
      agreed: '',
    };
    let isValid = true;

    if (!fullName.trim()) {
      newErrors.fullName = 'Full name is required.';
      isValid = false;
    }
    if (!username.trim()) {
      newErrors.username = 'Username is required.';
      isValid = false;
    } else if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      newErrors.username = 'Username can only contain letters, numbers, and underscores.';
      isValid = false;
    } else if (username.length < 3) {
      newErrors.username = 'Username must be at least 3 characters.';
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
    } else if (password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters.';
      isValid = false;
    } else if (!/[A-Z]/.test(password)) {
      newErrors.password = 'Must contain at least one uppercase letter.';
      isValid = false;
    } else if (!/[a-z]/.test(password)) {
      newErrors.password = 'Must contain at least one lowercase letter.';
      isValid = false;
    } else if (!/[0-9]/.test(password)) {
      newErrors.password = 'Must contain at least one number.';
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

  const handleSignUp = async () => {
    const isValid = validate();
    if (!isValid) return;

    setLoading(true);
    try {
      const result = await authService.signUp({
        fullName,
        username,
        email,
        password,
      });

      if (result.success) {
        router.push({
          pathname: '/(auth)/verify-otp',
          params: { email, purpose: 'register' },
        });
      } else {
        showErrorPopup('Sign Up Failed', result.message || 'Something went wrong');
      }
    } catch (error: any) {
      console.error('Sign up error:', error);
      
      let errorMessage = '';
      let statusCode = 0;
      
      if (error.response) {
        statusCode = error.response.status;
        errorMessage = error.response.data?.message || error.response.data?.error || error.message;
      } else {
        errorMessage = error.message || 'Something went wrong';
      }
      
      // Handle 409 Conflict - Email already exists with Google
      if (statusCode === 409 || errorMessage?.toLowerCase().includes('already registered')) {
        showErrorPopup('Email Already Exists', errorMessage);
      } else {
        showErrorPopup('Sign Up Failed', errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />

      <PolicyModal visible={showPolicyModal} onClose={() => setShowPolicyModal(false)} onAgree={handleAgree} />

      <ErrorPopupModal
        visible={showErrorModal}
        title={errorModalData.title}
        message={errorModalData.message}
        onClose={() => setShowErrorModal(false)}
      />

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
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

            <View style={styles.logoWrap}>
              <Image
                source={require('../../assets/images/logo.png')}
                style={styles.logo}
                resizeMode="contain"
              />
            </View>

            <Text style={styles.heading}>Create Account</Text>

            {/* FULL NAME */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Full Name</Text>
              <View style={[styles.inputWrap, errors.fullName ? styles.inputError : null]}>
                <TextInput
                  style={styles.input}
                  placeholder="Juan dela Cruz"
                  placeholderTextColor="#b8c0d4"
                  value={fullName}
                  onChangeText={(text) => { setFullName(text); setErrors({ ...errors, fullName: '' }); }}
                  autoCapitalize="words"
                  returnKeyType="next"
                  onSubmitEditing={() => usernameRef.current?.focus()}
                />
              </View>
              {errors.fullName ? <Text style={styles.fieldError}>{errors.fullName}</Text> : null}
            </View>

            {/* USERNAME */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Username</Text>
              <View style={[styles.inputWrap, errors.username ? styles.inputError : null]}>
                <TextInput
                  ref={usernameRef}
                  style={styles.input}
                  placeholder="juan_delacruz"
                  placeholderTextColor="#b8c0d4"
                  value={username}
                  onChangeText={(text) => {
                    setUsername(text.toLowerCase().replace(/[^a-z0-9_]/g, '_'));
                    setErrors({ ...errors, username: '' });
                  }}
                  autoCapitalize="none"
                  returnKeyType="next"
                  onSubmitEditing={() => emailRef.current?.focus()}
                />
              </View>
              {errors.username ? <Text style={styles.fieldError}>{errors.username}</Text> : null}
            </View>

            {/* EMAIL */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Email Address</Text>
              <View style={[styles.inputWrap, errors.email ? styles.inputError : null]}>
                <TextInput
                  ref={emailRef}
                  style={styles.input}
                  placeholder="you@example.com"
                  placeholderTextColor="#b8c0d4"
                  value={email}
                  onChangeText={(text) => { setEmail(text); setErrors({ ...errors, email: '' }); }}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  returnKeyType="next"
                  onSubmitEditing={() => passwordRef.current?.focus()}
                />
              </View>
              {errors.email ? <Text style={styles.fieldError}>{errors.email}</Text> : null}
            </View>

            {/* PASSWORD */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Password</Text>
              <View style={[styles.inputWrap, errors.password ? styles.inputError : null]}>
                <TextInput
                  ref={passwordRef}
                  style={[styles.input, styles.inputWithIcon]}
                  placeholder="At least 8 characters"
                  placeholderTextColor="#b8c0d4"
                  value={password}
                  onChangeText={(text) => { setPassword(text); setErrors({ ...errors, password: '' }); }}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  returnKeyType="next"
                  onSubmitEditing={() => confirmPasswordRef.current?.focus()}
                />
                <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowPassword(!showPassword)}>
                  <EyeIcon visible={showPassword} />
                </TouchableOpacity>
              </View>
              {errors.password ? <Text style={styles.fieldError}>{errors.password}</Text> : null}
            </View>

            {/* CONFIRM PASSWORD */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Confirm Password</Text>
              <View style={[styles.inputWrap, errors.confirmPassword ? styles.inputError : null]}>
                <TextInput
                  ref={confirmPasswordRef}
                  style={[styles.input, styles.inputWithIcon]}
                  placeholder="Re-enter your password"
                  placeholderTextColor="#b8c0d4"
                  value={confirmPassword}
                  onChangeText={(text) => { setConfirmPassword(text); setErrors({ ...errors, confirmPassword: '' }); }}
                  secureTextEntry={!showConfirmPassword}
                  autoCapitalize="none"
                  returnKeyType="done"
                  onSubmitEditing={handleSignUp}
                />
                <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                  <EyeIcon visible={showConfirmPassword} />
                </TouchableOpacity>
              </View>
              {errors.confirmPassword ? <Text style={styles.fieldError}>{errors.confirmPassword}</Text> : null}
            </View>

            {/* TERMS - CLICKABLE */}
            <TouchableOpacity style={styles.termsWrap} onPress={openPolicyModal} activeOpacity={0.8}>
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
            {errors.agreed ? <Text style={styles.fieldError}>{errors.agreed}</Text> : null}

            {/* CREATE BUTTON */}
            <TouchableOpacity
              style={[styles.btnCreate, loading && styles.btnDisabled]}
              onPress={handleSignUp}
              activeOpacity={0.85}
              disabled={loading}
            >
              {loading ? <ActivityIndicator color="#ffffff" size="small" /> : <Text style={styles.btnCreateText}>Create Account</Text>}
            </TouchableOpacity>

            {/* SIGN IN LINK */}
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

// ==================== STYLES ====================

const styles = StyleSheet.create({
  flex: { 
    flex: 1, 
    backgroundColor: '#eef2ff' 
  },
  scrollContent: { 
    flexGrow: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    paddingVertical: 40, 
    paddingHorizontal: 16,
    minHeight: SCREEN_HEIGHT + 100,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#ffffff',
    borderRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 28,
    shadowColor: '#3b5bdb',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 8,
    position: 'relative',
  },
  connectorTop: { 
    position: 'absolute', 
    top: -5, 
    alignSelf: 'center', 
    width: 10, 
    height: 10, 
    borderRadius: 5, 
    backgroundColor: '#ffffff', 
    borderWidth: 1.5, 
    borderColor: '#cbd5f5' 
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
    borderColor: '#cbd5f5' 
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
    borderWidth: 1.5, 
    borderColor: '#cbd5f5' 
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
    borderWidth: 1.5, 
    borderColor: '#cbd5f5' 
  },
  logoWrap: { 
    alignItems: 'center', 
    marginBottom: 16 
  },
  logo: { 
    width: 56, 
    height: 56, 
    borderRadius: 14,
    backgroundColor: 'transparent',
  },
  heading: { 
    fontSize: 26, 
    fontWeight: '700', 
    color: '#1a1f36', 
    textAlign: 'center', 
    marginBottom: 24 
  },
  formGroup: { 
    marginBottom: 16 
  },
  label: { 
    fontSize: 13, 
    fontWeight: '600', 
    color: '#4a5568', 
    marginBottom: 6 
  },
  inputWrap: { 
    borderWidth: 1.5, 
    borderColor: '#e2e6f3', 
    borderRadius: 12, 
    backgroundColor: '#f8f9ff', 
    flexDirection: 'row', 
    alignItems: 'center' 
  },
  inputError: { 
    borderColor: '#e53e3e' 
  },
  input: { 
    flex: 1, 
    paddingHorizontal: 14, 
    paddingVertical: Platform.OS === 'ios' ? 12 : 10, 
    fontSize: 14, 
    color: '#1a1f36' 
  },
  inputWithIcon: { 
    paddingRight: 44 
  },
  eyeBtn: { 
    position: 'absolute', 
    right: 12, 
    padding: 6 
  },
  fieldError: { 
    color: '#e53e3e', 
    fontSize: 11, 
    marginTop: 4, 
    marginLeft: 4 
  },
  termsWrap: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 10, 
    marginTop: 8, 
    marginBottom: 8, 
    padding: 8 
  },
  customCheckbox: { 
    width: 18, 
    height: 18, 
    borderRadius: 9, 
    borderWidth: 2, 
    borderColor: '#8896b3', 
    alignItems: 'center', 
    justifyContent: 'center' 
  },
  customCheckboxChecked: { 
    backgroundColor: '#3b5bdb', 
    borderColor: '#3b5bdb' 
  },
  termsText: { 
    flex: 1, 
    fontSize: 12, 
    lineHeight: 18, 
    color: '#4a5568' 
  },
  termsLink: { 
    fontWeight: '700', 
    color: '#3b5bdb' 
  },
  btnCreate: { 
    backgroundColor: '#3b5bdb', 
    borderRadius: 12, 
    paddingVertical: 14, 
    alignItems: 'center', 
    marginTop: 16, 
    marginBottom: 12 
  },
  btnDisabled: { 
    opacity: 0.7 
  },
  btnCreateText: { 
    color: '#ffffff', 
    fontSize: 15, 
    fontWeight: '600' 
  },
  signinWrap: { 
    flexDirection: 'row', 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginTop: 12 
  },
  signinText: { 
    fontSize: 13, 
    color: '#8896b3' 
  },
  signinLink: { 
    fontSize: 13, 
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
  // Error Modal Styles
  errorModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorModalContainer: {
    width: '85%',
    maxWidth: 340,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  errorModalIcon: {
    marginBottom: 16,
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
  errorModalButtons: {
    width: '100%',
  },
  errorModalButton: {
    backgroundColor: '#3b5bdb',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  errorModalButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

// ==================== MODAL STYLES ====================

const modalStyles = StyleSheet.create({
  modalOverlay: { 
    flex: 1, 
    backgroundColor: 'rgba(0,0,0,0.5)', 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  modalContainer: { 
    width: SCREEN_WIDTH - 40, 
    maxWidth: 500, 
    maxHeight: SCREEN_HEIGHT - 80, 
    backgroundColor: '#ffffff', 
    borderRadius: 24, 
    overflow: 'hidden' 
  },
  modalHeader: { 
    flexDirection: 'row', 
    justifyContent: 'center', 
    alignItems: 'center', 
    paddingHorizontal: 20, 
    paddingVertical: 16, 
    borderBottomWidth: 1, 
    borderBottomColor: '#e2e6f3', 
    backgroundColor: '#f8f9ff' 
  },
  modalTitle: { 
    fontSize: 18, 
    fontWeight: '700', 
    color: '#1a1f36' 
  },
  tabBar: { 
    flexDirection: 'row', 
    borderBottomWidth: 1, 
    borderBottomColor: '#e2e6f3' 
  },
  tab: { 
    flex: 1, 
    paddingVertical: 14, 
    alignItems: 'center' 
  },
  activeTab: { 
    borderBottomWidth: 2, 
    borderBottomColor: '#3b5bdb' 
  },
  tabText: { 
    fontSize: 14, 
    fontWeight: '600', 
    color: '#8896b3' 
  },
  activeTabText: { 
    color: '#3b5bdb' 
  },
  tabContent: { 
    padding: 20 
  },
  modalBody: { 
    padding: 20, 
    maxHeight: 400 
  },
  sectionTitle: { 
    fontSize: 16, 
    fontWeight: '700', 
    color: '#3b5bdb', 
    marginTop: 16, 
    marginBottom: 8 
  },
  subSection: { 
    fontSize: 14, 
    fontWeight: '600', 
    color: '#4a5568', 
    marginTop: 12, 
    marginBottom: 4 
  },
  text: { 
    fontSize: 13, 
    color: '#4a5568', 
    lineHeight: 20, 
    marginBottom: 8 
  },
  footer: { 
    fontSize: 12, 
    color: '#8896b3', 
    textAlign: 'center', 
    marginTop: 20, 
    paddingTop: 16, 
    borderTopWidth: 1, 
    borderTopColor: '#e2e6f3' 
  },
  modalFooter: { 
    flexDirection: 'row', 
    padding: 16, 
    borderTopWidth: 1, 
    borderTopColor: '#e2e6f3', 
    gap: 12 
  },
  agreeButton: { 
    flex: 1, 
    backgroundColor: '#3b5bdb', 
    borderRadius: 10, 
    paddingVertical: 12, 
    alignItems: 'center' 
  },
  agreeButtonText: { 
    color: '#ffffff', 
    fontSize: 14, 
    fontWeight: '600' 
  },
  declineButton: { 
    flex: 1, 
    backgroundColor: '#e5e9f5', 
    borderRadius: 10, 
    paddingVertical: 12, 
    alignItems: 'center' 
  },
  declineButtonText: { 
    color: '#4a5568', 
    fontSize: 14, 
    fontWeight: '600' 
  },
});