// igraph-frontend/app/(tabs)/userAccount.tsx

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  Image,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Keyboard,
  Animated,
  RefreshControl,
  Pressable,
  useWindowDimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Svg, Path, Circle, Rect } from 'react-native-svg';
import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as authService from '../../services/authService';

// ============================================================================
// DESIGN SYSTEM CONSTANTS
// ============================================================================

const COLORS = {
  primary: '#4c6fff',
  primaryLight: '#eef2ff',
  primaryDark: '#3b4fcc',
  success: '#10b981',
  successLight: '#ecfdf5',
  warning: '#f59e0b',
  warningLight: '#fef3c7',
  danger: '#ef4444',
  dangerLight: '#fef2f2',
  gray50: '#f8fafc',
  gray100: '#f1f5f9',
  gray200: '#e2e8f0',
  gray300: '#cbd5e1',
  gray400: '#94a3b8',
  gray500: '#64748b',
  gray600: '#475569',
  gray700: '#334155',
  gray800: '#1e293b',
  gray900: '#0f172a',
  white: '#ffffff',
  black: '#000000',
  overlay: 'rgba(0, 0, 0, 0.5)',
};

const TYPOGRAPHY = {
  hero: { fontSize: 32, fontWeight: '800' as const, letterSpacing: -0.5, lineHeight: 40 },
  h3: { fontSize: 18, fontWeight: '700' as const, lineHeight: 24 },
  body: { fontSize: 16, fontWeight: '400' as const, lineHeight: 24 },
  bodyBold: { fontSize: 16, fontWeight: '600' as const, lineHeight: 24 },
  caption: { fontSize: 14, fontWeight: '400' as const, lineHeight: 20 },
  captionBold: { fontSize: 14, fontWeight: '600' as const, lineHeight: 20 },
  small: { fontSize: 12, fontWeight: '500' as const, lineHeight: 16 },
  tiny: { fontSize: 10, fontWeight: '700' as const, lineHeight: 14 },
};

const SPACING = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, xxxl: 17 };
const RADIUS = { sm: 6, md: 10, lg: 14, xl: 18, xxl: 24, full: 999 };

const SHADOWS = {
  sm: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  md: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  lg: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 5,
  },
};

const ANIMATION = {
  spring: { tension: 50, friction: 7 },
  timing: { duration: 300 },
};

// ============================================================================
// DOT GRID PATTERN - Full screen background matching home.tsx
// ============================================================================

const DotGrid = () => {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const DOT_SPACING = 32;
  const DOT_SIZE = 2;
  
  const columns = Math.ceil(screenWidth / DOT_SPACING);
  const rows = Math.ceil(screenHeight / DOT_SPACING);
  const totalDots = columns * rows;
  
  return (
    <View style={styles.dotGridContainer} pointerEvents="none">
      {[...Array(Math.min(totalDots, 200))].map((_, i) => {
        const col = i % columns;
        const row = Math.floor(i / columns);
        return (
          <View
            key={i}
            style={[
              styles.dotGridItem,
              {
                left: col * DOT_SPACING,
                top: row * DOT_SPACING,
                width: DOT_SIZE,
                height: DOT_SIZE,
              },
            ]}
          />
        );
      })}
    </View>
  );
};

// ============================================================================
// ICONS
// ============================================================================

const CameraIcon = () => (
  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
    <Path d="M23 19C23 19.5304 22.7893 20.0391 22.4142 20.4142C22.0391 20.7893 21.5304 21 21 21H3C2.46957 21 1.96086 20.7893 1.58579 20.4142C1.21071 20.0391 1 19.5304 1 19V8C1 7.46957 1.21071 6.96086 1.58579 6.58579C1.96086 6.21071 2.46957 6 3 6H7L9 3H15L17 6H21C21.5304 6 22.0391 6.21071 22.4142 6.58579C22.7893 6.96086 23 7.46957 23 8V19Z" stroke="#000000" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    <Circle cx="12" cy="13" r="4" stroke="#000000" strokeWidth={2} />
  </Svg>
);

const LockIcon = ({ color = '#000000' }: { color?: string }) => (
  <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
    <Rect x="3" y="11" width="18" height="11" rx="2" stroke={color} strokeWidth={2} />
    <Path d="M7 11V7C7 4.8 8.8 3 11 3H13C15.2 3 17 4.8 17 7V11" stroke={color} strokeWidth={2} strokeLinecap="round" />
  </Svg>
);

const DiagramIcon = ({ color = '#000000' }: { color?: string }) => (
  <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
    <Rect x="3" y="3" width="18" height="18" rx="2" stroke={color} strokeWidth={2} />
    <Path d="M8 8h8M8 12h6M8 16h4" stroke={color} strokeWidth={2} strokeLinecap="round" />
  </Svg>
);

const ShieldIcon = ({ color = '#000000' }: { color?: string }) => (
  <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
    <Path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const SignOutIcon = ({ color = '#000000' }: { color?: string }) => (
  <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
    <Path d="M9 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H9" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M16 17L21 12L16 7" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M21 12H9" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const EyeIcon = ({ visible }: { visible: boolean }) => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
    {visible ? (
      <>
        <Path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="#64748b" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
        <Circle cx="12" cy="12" r="3" stroke="#64748b" strokeWidth={1.8} />
      </>
    ) : (
      <>
        <Path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94" stroke="#64748b" strokeWidth={1.8} strokeLinecap="round" />
        <Path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19" stroke="#64748b" strokeWidth={1.8} strokeLinecap="round" />
        <Path d="M1 1l22 22" stroke="#64748b" strokeWidth={1.8} strokeLinecap="round" />
      </>
    )}
  </Svg>
);

const CloseIcon = () => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
    <Path d="M18 6L6 18M6 6L18 18" stroke="#0f172a" strokeWidth={2.5} strokeLinecap="round" />
  </Svg>
);

const ChevronRight = ({ color = '#94a3b8' }: { color?: string }) => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
    <Path d="M9 18l6-6-6-6" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const CheckCircleIcon = () => (
  <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="12" r="10" stroke="#10b981" strokeWidth={2} />
    <Path d="M8 12l2 2 4-4" stroke="#10b981" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

// ============================================================================
// SKELETON LOADER
// ============================================================================

const SkeletonLoader = () => {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, []);

  const SkeletonBlock = ({ width, height, style }: { width: number | string; height: number; style?: any }) => (
    <Animated.View style={[{ opacity, backgroundColor: COLORS.gray200, borderRadius: RADIUS.sm }, { width, height }, style]} />
  );

  return (
    <View style={styles.skeletonContainer}>
      {/* <DotGrid /> */}
      <View style={[styles.skeletonContent, { paddingTop: Platform.OS === 'ios' ? 60 : SPACING.xxl }]}>
        <View style={styles.skeletonCard}>
          <View style={styles.skeletonRow}>
            <SkeletonBlock width={80} height={80} style={{ borderRadius: RADIUS.full }} />
            <View style={{ flex: 1, marginLeft: SPACING.lg }}>
              <SkeletonBlock width="70%" height={20} />
              <SkeletonBlock width="50%" height={16} style={{ marginTop: SPACING.sm }} />
              <SkeletonBlock width="30%" height={14} style={{ marginTop: SPACING.xs }} />
            </View>
          </View>
        </View>

        {[1, 2, 3, 4].map((i) => (
          <View key={i} style={styles.skeletonActionCard}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <SkeletonBlock width={24} height={24} />
              <View style={{ flex: 1, marginLeft: SPACING.md }}>
                <SkeletonBlock width="60%" height={18} />
                <SkeletonBlock width="40%" height={12} style={{ marginTop: SPACING.xs }} />
              </View>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
};

// ============================================================================
// PASSWORD CHANGE MODAL (with router passed as parameter)
// ============================================================================

const ChangePasswordModal = ({ 
  visible, 
  onClose, 
  onSuccess,
  router 
}: { 
  visible: boolean; 
  onClose: () => void; 
  onSuccess: () => void;
  router: any;
}) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [passwordErrors, setPasswordErrors] = useState<string[]>([]);

  const validateNewPassword = (pwd: string) => {
    const errors: string[] = [];
    if (pwd.length < 8) errors.push('At least 8 characters');
    if (!/[A-Z]/.test(pwd)) errors.push('One uppercase letter');
    if (!/[a-z]/.test(pwd)) errors.push('One lowercase letter');
    if (!/[0-9]/.test(pwd)) errors.push('One number');
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(pwd)) errors.push('One special character');
    setPasswordErrors(errors);
    return errors.length === 0;
  };

  const handleChangePassword = async () => {
    setError('');
    
    if (!currentPassword) {
      setError('Please enter your current password');
      return;
    }
    
    if (!validateNewPassword(newPassword)) {
      setError('Please meet all password requirements');
      return;
    }
    
    if (newPassword !== confirmPassword) {
      setError('New passwords do not match');
      return;
    }
    
    setLoading(true);
    
    try {
      const result = await authService.changePassword(currentPassword, newPassword);
      
      if (result.success) {
        onSuccess();
        handleClose();
        Alert.alert(
          'Password Changed',
          'Your password has been changed successfully. Please sign in again.',
          [
            {
              text: 'OK',
              onPress: async () => {
                await authService.logout();
                router.replace('/(auth)/signin');
              }
            }
          ]
        );
      } else {
        setError(result.message || 'Failed to change password');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Unable to change password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setError('');
    setPasswordErrors([]);
    onClose();
  };

  const getPasswordStrength = () => {
    let score = 0;
    if (newPassword.length >= 8) score++;
    if (/[A-Z]/.test(newPassword)) score++;
    if (/[a-z]/.test(newPassword)) score++;
    if (/[0-9]/.test(newPassword)) score++;
    if (/[!@#$%^&*(),.?":{}|<>]/.test(newPassword)) score++;
    
    if (score >= 4) return { text: 'Strong', color: COLORS.success, width: '100%' as const };
    if (score === 3) return { text: 'Good', color: COLORS.warning, width: '75%' as const };
    if (score > 0) return { text: 'Weak', color: COLORS.danger, width: '50%' as const };
    return { text: '', color: COLORS.gray200, width: '0%' as const };
  };

  const strength = getPasswordStrength();

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={handleClose}
    >
      <Pressable style={styles.modalOverlay} onPress={handleClose}>
        <Pressable style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Change Password</Text>
            <TouchableOpacity onPress={handleClose} style={styles.modalClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <CloseIcon />
            </TouchableOpacity>
          </View>
          
          <View style={styles.passwordInputWrapper}>
            <Text style={styles.inputLabel}>Current Password</Text>
            <View style={[styles.passwordInputContainer, error && !currentPassword ? styles.inputError : null]}>
              <LockIcon color={COLORS.gray400} />
              <TextInput
                style={styles.passwordInput}
                placeholder="Enter your current password"
                placeholderTextColor={COLORS.gray400}
                value={currentPassword}
                onChangeText={(text) => {
                  setCurrentPassword(text);
                  setError('');
                }}
                secureTextEntry={!showCurrentPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity 
                style={styles.passwordEyeBtn}
                onPress={() => setShowCurrentPassword(!showCurrentPassword)}
              >
                <EyeIcon visible={showCurrentPassword} />
              </TouchableOpacity>
            </View>
          </View>
          
          <View style={styles.passwordInputWrapper}>
            <Text style={styles.inputLabel}>New Password</Text>
            <View style={styles.passwordInputContainer}>
              <LockIcon color={COLORS.gray400} />
              <TextInput
                style={styles.passwordInput}
                placeholder="Enter new password"
                placeholderTextColor={COLORS.gray400}
                value={newPassword}
                onChangeText={(text) => {
                  setNewPassword(text);
                  validateNewPassword(text);
                  setError('');
                }}
                secureTextEntry={!showNewPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity 
                style={styles.passwordEyeBtn}
                onPress={() => setShowNewPassword(!showNewPassword)}
              >
                <EyeIcon visible={showNewPassword} />
              </TouchableOpacity>
            </View>
            
            {newPassword.length > 0 && (
              <View style={styles.passwordStrengthContainer}>
                <View style={styles.passwordStrengthBar}>
                  <View style={[styles.passwordStrengthFill, { width: strength.width, backgroundColor: strength.color }]} />
                </View>
                {strength.text ? (
                  <Text style={[styles.passwordStrengthText, { color: strength.color }]}>{strength.text}</Text>
                ) : null}
              </View>
            )}
            
            {passwordErrors.length > 0 && (
              <View style={styles.passwordRequirements}>
                {passwordErrors.map((err, i) => (
                  <View key={i} style={styles.passwordRequirementRow}>
                    <View style={styles.passwordRequirementDot} />
                    <Text style={styles.passwordRequirementText}>{err}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
          
          <View style={styles.passwordInputWrapper}>
            <Text style={styles.inputLabel}>Confirm New Password</Text>
            <View style={[styles.passwordInputContainer, confirmPassword && newPassword !== confirmPassword ? styles.inputError : null]}>
              <LockIcon color={COLORS.gray400} />
              <TextInput
                style={styles.passwordInput}
                placeholder="Confirm new password"
                placeholderTextColor={COLORS.gray400}
                value={confirmPassword}
                onChangeText={(text) => {
                  setConfirmPassword(text);
                  setError('');
                }}
                secureTextEntry={!showConfirmPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity 
                style={styles.passwordEyeBtn}
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                <EyeIcon visible={showConfirmPassword} />
              </TouchableOpacity>
            </View>
            {confirmPassword && newPassword !== confirmPassword && (
              <Text style={styles.passwordMismatchText}>Passwords do not match</Text>
            )}
            {confirmPassword && newPassword === confirmPassword && newPassword.length > 0 && (
              <Text style={styles.matchSuccess}>✓ Passwords match</Text>
            )}
          </View>
          
          {error ? <Text style={styles.modalError}>{error}</Text> : null}
          
          <TouchableOpacity
            style={[styles.modalButton, loading && styles.modalButtonDisabled]}
            onPress={handleChangePassword}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color={COLORS.white} size="small" />
            ) : (
              <Text style={styles.modalButtonText}>Update Password</Text>
            )}
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

// ============================================================================
// TOAST COMPONENT
// ============================================================================

const Toast = ({ visible, message, isError, onHide }: { visible: boolean; message: string; isError: boolean; onHide: () => void; }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(-50)).current;
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.spring(slideAnim, { toValue: 0, ...ANIMATION.spring, useNativeDriver: true }),
      ]).start();
      timeoutRef.current = setTimeout(() => hideToast(), 3000);
    }
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [visible]);

  const hideToast = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: -50, duration: 300, useNativeDriver: true }),
    ]).start(() => onHide());
  };

  if (!visible) return null;

  return (
    <Animated.View style={[styles.toastContainer, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
      <View style={[styles.toastContent, isError ? styles.toastError : styles.toastSuccess]}>
        <View style={styles.toastIcon}>
          {isError ? <CloseIcon /> : <CheckCircleIcon />}
        </View>
        <Text style={styles.toastText}>{message}</Text>
      </View>
    </Animated.View>
  );
};

// ============================================================================
// MAIN USER ACCOUNT COMPONENT
// ============================================================================

export default function UserAccount() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  
  const [userData, setUserData] = useState({
    fullName: '',
    email: '',
    username: '',
    profilePicture: null as string | null,
  });
  const [savedDiagrams, setSavedDiagrams] = useState<any[]>([]);
  const [showSavedDiagrams, setShowSavedDiagrams] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [toast, setToast] = useState({ visible: false, message: '', isError: false });

  const showToast = useCallback((message: string, isError: boolean = false) => {
    setToast({ visible: true, message, isError });
  }, []);

  const hideToast = useCallback(() => {
    setToast(prev => ({ ...prev, visible: false }));
  }, []);

  useEffect(() => {
    loadUserData();
    loadSavedDiagrams();
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([loadUserData(), loadSavedDiagrams()]);
    setRefreshing(false);
  }, []);

  const loadUserData = async () => {
    try {
      const token = await authService.getAccessToken();
      if (!token) {
        router.replace('/(auth)/signin');
        return;
      }

      const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://igraph-backend.onrender.com';
      const response = await fetch(`${API_URL}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      const result = await response.json();
      if (result.success && result.data?.user) {
        const { fullName, email, username, profilePicture } = result.data.user;
        setUserData({
          fullName: fullName || '',
          email: email || '',
          username: username || '',
          profilePicture: profilePicture || null,
        });
      } else if (result.success === false && result.message === 'User not found') {
        await authService.clearTokens();
        router.replace('/(auth)/signin');
      }
    } catch (error) {
      console.error('Failed to load user data:', error);
      showToast('Failed to load user data. Pull down to refresh.', true);
    } finally {
      setLoading(false);
    }
  };

  const loadSavedDiagrams = async () => {
    try {
      const token = await authService.getAccessToken();
      if (!token) return;

      const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://igraph-backend.onrender.com';
      const response = await fetch(`${API_URL}/api/diagrams/user`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      const result = await response.json();
      if (result.success && result.data) {
        setSavedDiagrams(result.data);
      }
    } catch (error) {
      console.error('Failed to load diagrams:', error);
    }
  };

  const handleProfilePictureUpload = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        showToast('Permission to access gallery is required', true);
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        
        if (asset.fileSize && asset.fileSize > 5 * 1024 * 1024) {
          showToast('Image size must be less than 5MB', true);
          return;
        }
        
        setUploadingImage(true);
        
        const token = await authService.getAccessToken();
        const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://igraph-backend.onrender.com';
        
        const response = await fetch(`${API_URL}/api/auth/upload-profile-picture`, {
          method: 'POST',
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ 
            profilePictureUrl: asset.uri
          }),
        });
        
        const responseData = await response.json();
        
        if (responseData.success && responseData.data?.profilePictureUrl) {
          setUserData(prev => ({ ...prev, profilePicture: responseData.data.profilePictureUrl }));
          showToast('Profile picture updated successfully');
        } else {
          showToast(responseData.message || 'Failed to update profile picture', true);
        }
      }
    } catch (error) {
      console.error('Image upload error:', error);
      showToast('Failed to upload image. Please try again.', true);
    } finally {
      setUploadingImage(false);
    }
  };

  const handlePasswordSuccess = () => {
    showToast('Password changed successfully');
  };

const handleSignOut = async () => {
  Alert.alert(
    'Sign Out',
    'Are you sure you want to sign out?',
    [
      { text: 'Cancel', style: 'cancel' },
      { 
        text: 'Sign Out', 
        style: 'destructive',
        onPress: async () => {
          try {
            setLoading(true); // Optional: Add loading state
            await authService.logout();
            // Clear any local user data
            setUserData({ fullName: '', email: '', username: '', profilePicture: null });
            // Use replace to prevent going back to userAccount
            router.replace('/(auth)/signin');
          } catch (error) {
            console.error('Sign out error:', error);
            // Still redirect even if API fails
            router.replace('/(auth)/signin');
          } finally {
            setLoading(false);
          }
        }
      },
    ]
  );
};

  const getInitials = useCallback(() => {
    if (!userData.fullName) return 'U';
    return userData.fullName
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }, [userData.fullName]);

  const getDisplayName = useCallback(() => {
    if (userData.fullName && userData.fullName.trim()) return userData.fullName;
    if (userData.email) return userData.email.split('@')[0];
    return 'User';
  }, [userData.fullName, userData.email]);

  if (loading) {
    return <SkeletonLoader />;
  }

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <DotGrid />

      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <ScrollView 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + SPACING.xxl }]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={COLORS.primary}
              colors={[COLORS.primary]}
            />
          }
        >
          {/* Profile Card */}
          <View style={styles.profileCard}>
            <View style={styles.profileBanner}>
              <View style={styles.profileInfo}>
                <TouchableOpacity 
                  style={styles.avatarContainer}
                  onPress={handleProfilePictureUpload}
                  disabled={uploadingImage}
                  activeOpacity={0.8}
                >
                  {uploadingImage ? (
                    <View style={[styles.avatar, styles.avatarLoading]}>
                      <ActivityIndicator color={COLORS.primary} size="large" />
                    </View>
                  ) : userData.profilePicture ? (
                    <Image source={{ uri: userData.profilePicture }} style={styles.avatar} />
                  ) : (
                    <View style={[styles.avatar, styles.avatarPlaceholder]}>
                      <Text style={styles.avatarInitials}>{getInitials()}</Text>
                    </View>
                  )}
                  <View style={styles.avatarEditBadge}>
                    <CameraIcon />
                  </View>
                </TouchableOpacity>
                
                <View style={styles.userInfo}>
                  <Text style={styles.userName}>{getDisplayName()}</Text>
                  <Text style={styles.userEmail}>{userData.email}</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Action Cards */}
          <View style={styles.actionsGrid}>
            <Pressable 
              style={({ pressed }) => [styles.actionCard, pressed && styles.actionCardPressed]}
              onPress={() => setShowPasswordModal(true)}
            >
              <LockIcon />
              <View style={styles.actionContent}>
                <Text style={styles.actionTitle}>Password</Text>
                <Text style={styles.actionDescription}>Change password</Text>
              </View>
              <ChevronRight />
            </Pressable>

            <Pressable 
              style={({ pressed }) => [styles.actionCard, pressed && styles.actionCardPressed]}
              onPress={() => router.push('/(tabs)/savedDiagrams')}
            >
              <DiagramIcon />
              <View style={styles.actionContent}>
                <Text style={styles.actionTitle}>Saved Diagrams</Text>
                <Text style={styles.actionDescription}>
                  {savedDiagrams.length} saved
                </Text>
              </View>
              <ChevronRight />
            </Pressable>

            <Pressable 
              style={({ pressed }) => [styles.actionCard, pressed && styles.actionCardPressed]}
              onPress={() => router.push('/modal')}
            >
              <ShieldIcon />
              <View style={styles.actionContent}>
                <Text style={styles.actionTitle}>Privacy</Text>
                <Text style={styles.actionDescription}>Terms & policies</Text>
              </View>
              <ChevronRight />
            </Pressable>

            <Pressable 
              style={({ pressed }) => [styles.actionCard, pressed && styles.actionCardPressed]}
              onPress={() => router.push('/(tabs)/aboutUs')}
            >
              <ShieldIcon />
              <View style={styles.actionContent}>
                <Text style={styles.actionTitle}>About Us</Text>
                <Text style={styles.actionDescription}>Team & system info</Text>
              </View>
              <ChevronRight />
            </Pressable>

            <Pressable 
              style={({ pressed }) => [styles.actionCard, styles.signOutCard, pressed && styles.actionCardPressed]}
              onPress={async () => {
                try {
                  await authService.logout();
                  router.replace('/(auth)/signin');
                } catch (error) {
                  console.error('Sign out error:', error);
                  router.replace('/(auth)/signin');
                }
              }}
            >
              <SignOutIcon color={COLORS.danger} />
              <View style={styles.actionContent}>
                <Text style={[styles.actionTitle, styles.signOutText]}>Sign Out</Text>
              </View>
              <ChevronRight color={COLORS.danger} />
            </Pressable>
          </View>

          {/* Saved Diagrams Section */}
          {showSavedDiagrams && (
            <View style={styles.savedDiagramsSection}>
              {savedDiagrams.length === 0 ? (
                <View style={styles.emptyDiagrams}>
                  <Text style={styles.emptyDiagramsText}>No saved diagrams yet</Text>
                  <Text style={styles.emptyDiagramsSubtext}>Diagrams you save will appear here</Text>
                </View>
              ) : (
                savedDiagrams.map((diagram, index) => (
                  <View key={diagram.id || index} style={styles.savedDiagramItem}>
                    <Text style={styles.savedDiagramTitle}>{diagram.title}</Text>
                  </View>
                ))
              )}
            </View>
          )}
        </ScrollView>
      </TouchableWithoutFeedback>

      <ChangePasswordModal
        visible={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
        onSuccess={handlePasswordSuccess}
        router={router}
      />

      <Toast
        visible={toast.visible}
        message={toast.message}
        isError={toast.isError}
        onHide={hideToast}
      />
    </KeyboardAvoidingView>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  
  dotGridContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
  },
  dotGridItem: {
    position: 'absolute',
    backgroundColor: '#4c6fff',
    borderRadius: 1,
    opacity: 0.12,
  },
  
  scrollContent: {
    paddingHorizontal: SPACING.xl,
    paddingBottom: 40,
  },
  
  skeletonContainer: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  skeletonContent: {
    paddingHorizontal: SPACING.xl,
  },
  skeletonCard: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.xxl,
    padding: SPACING.xl,
    marginBottom: SPACING.lg,
    ...SHADOWS.md,
  },
  skeletonRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  skeletonActionCard: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    ...SHADOWS.sm,
  },
  
  profileCard: {
    borderRadius: RADIUS.xxl,
    overflow: 'hidden',
    marginBottom: SPACING.xxxl,
    ...SHADOWS.md,
  },
  profileBanner: {
    backgroundColor: COLORS.primary,
    minHeight: 120,
  },
  profileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.xxl,
    gap: SPACING.lg,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: RADIUS.full,
    borderWidth: 3,
    borderColor: COLORS.white,
  },
  avatarPlaceholder: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarLoading: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitials: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.white,
  },
  avatarEditBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: COLORS.white,
    width: 32,
    height: 32,
    borderRadius: RADIUS.full,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.sm,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    ...TYPOGRAPHY.h3,
    color: COLORS.white,
  },
  userEmail: {
    ...TYPOGRAPHY.caption,
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: 2,
  },
  
  actionsGrid: {
    gap: SPACING.md,
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    ...SHADOWS.sm,
  },
  actionCardPressed: {
    backgroundColor: COLORS.gray50,
    transform: [{ scale: 0.98 }],
  },
  signOutCard: {
    borderWidth: 1,
    borderColor: COLORS.dangerLight,
  },
  actionContent: {
    flex: 1,
    marginLeft: SPACING.md,
  },
  actionTitle: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.gray900,
  },
  actionDescription: {
    ...TYPOGRAPHY.small,
    color: COLORS.gray500,
    marginTop: 2,
  },
  signOutText: {
    color: COLORS.danger,
  },
  
  savedDiagramsSection: {
    marginTop: SPACING.xxl,
  },
  savedDiagramItem: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    ...SHADOWS.sm,
  },
  savedDiagramTitle: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.gray900,
  },
  emptyDiagrams: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    padding: SPACING.xxxl,
    alignItems: 'center',
    ...SHADOWS.sm,
  },
  emptyDiagramsText: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.gray600,
    marginBottom: SPACING.sm,
  },
  emptyDiagramsSubtext: {
    ...TYPOGRAPHY.small,
    color: COLORS.gray400,
    textAlign: 'center',
  },
  
  modalOverlay: {
    flex: 1,
    backgroundColor: COLORS.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
  },
  modalContainer: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.xxl,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray100,
  },
  modalTitle: {
    ...TYPOGRAPHY.h3,
    color: COLORS.gray900,
  },
  modalClose: {
    padding: SPACING.xs,
  },
  modalError: {
    ...TYPOGRAPHY.small,
    color: COLORS.danger,
    marginTop: SPACING.sm,
    paddingHorizontal: SPACING.xl,
  },
  modalButton: {
    backgroundColor: COLORS.primary,
    margin: SPACING.xl,
    paddingVertical: SPACING.lg,
    borderRadius: RADIUS.lg,
    alignItems: 'center',
  },
  modalButtonDisabled: {
    opacity: 0.6,
  },
  modalButtonText: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.white,
  },
  
  passwordInputWrapper: {
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.lg,
  },
  inputLabel: {
    ...TYPOGRAPHY.captionBold,
    color: COLORS.gray700,
    marginBottom: SPACING.sm,
  },
  passwordInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.gray200,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.white,
    paddingHorizontal: SPACING.md,
  },
  inputError: {
    borderColor: COLORS.danger,
  },
  passwordInput: {
    flex: 1,
    paddingVertical: SPACING.md,
    marginLeft: SPACING.sm,
    ...TYPOGRAPHY.body,
    color: COLORS.gray900,
  },
  passwordEyeBtn: {
    padding: SPACING.sm,
  },
  passwordStrengthContainer: {
    marginTop: SPACING.md,
  },
  passwordStrengthBar: {
    height: 4,
    backgroundColor: COLORS.gray200,
    borderRadius: RADIUS.full,
    overflow: 'hidden',
  },
  passwordStrengthFill: {
    height: '100%',
    borderRadius: RADIUS.full,
  },
  passwordStrengthText: {
    ...TYPOGRAPHY.small,
    marginTop: SPACING.sm,
  },
  passwordRequirements: {
    marginTop: SPACING.sm,
  },
  passwordRequirementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.xs,
  },
  passwordRequirementDot: {
    width: 4,
    height: 4,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.gray400,
    marginRight: SPACING.sm,
  },
  passwordRequirementText: {
    ...TYPOGRAPHY.small,
    color: COLORS.gray500,
  },
  passwordMismatchText: {
    ...TYPOGRAPHY.small,
    color: COLORS.danger,
    marginTop: SPACING.sm,
  },
  matchSuccess: {
    color: COLORS.success,
    fontSize: 12,
    marginTop: SPACING.sm,
  },
  
  toastContainer: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 50,
    left: SPACING.xl,
    right: SPACING.xl,
    zIndex: 1000,
    alignItems: 'center',
  },
  toastContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.lg,
    minWidth: 200,
    maxWidth: '90%',
    ...SHADOWS.lg,
  },
  toastIcon: {
    marginRight: SPACING.sm,
  },
  toastSuccess: {
    backgroundColor: COLORS.success,
  },
  toastError: {
    backgroundColor: COLORS.danger,
  },
  toastText: {
    ...TYPOGRAPHY.captionBold,
    color: COLORS.white,
    flex: 1,
  },
});