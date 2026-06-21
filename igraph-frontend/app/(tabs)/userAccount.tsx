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

// ============================================================================
// DOT GRID PATTERN
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
  <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
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

const ProfileIcon = () => (
  <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="8" r="4" stroke="#4c6fff" strokeWidth={2} />
    <Path d="M20 21V19C20 16.8 18.2 15 16 15H8C5.8 15 4 16.8 4 19V21" stroke="#4c6fff" strokeWidth={2} strokeLinecap="round" />
  </Svg>
);

const EditIcon = () => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
    <Path d="M11 4H4C3.46957 4 3.96086 4.21071 3.58579 4.58579C3.21071 4.96086 3 5.46957 3 6V20C3 20.5304 3.21071 21.0391 3.58579 21.4142C3.7893 21.0391 4.46957 22 5 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V13" stroke="#4c6fff" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M18.5 2.5L21.5 5.5L12 15H9V12L18.5 2.5Z" stroke="#4c6fff" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

// ============================================================================
// ANIMATED CHEVRON COMPONENT
// ✅ FIX: rotates 0deg -> 90deg so the right-pointing ">" becomes a
// down-pointing "v" when expanded (previously rotated to 180deg, which
// turned it into a left-pointing "<").
// ============================================================================

const AnimatedChevron = ({ expanded, color }: { expanded: boolean; color: string }) => {
  const spinValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(spinValue, {
      toValue: expanded ? 1 : 0,
      duration: 250,
      useNativeDriver: true,
    }).start();
  }, [expanded]);

  const spin = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '90deg'],
  });

  return (
    <Animated.View style={{ transform: [{ rotate: spin }] }}>
      <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
        <Path 
          d="M9 18l6-6-6-6" 
          stroke={color} 
          strokeWidth={2} 
          strokeLinecap="round" 
          strokeLinejoin="round" 
        />
      </Svg>
    </Animated.View>
  );
};

// ============================================================================
// SKELETON LOADER
// ============================================================================

const SkeletonLoader = () => {
  const opacity = useRef(new Animated.Value(0.3)).current;
  const { width: windowWidth } = useWindowDimensions();
  const isDesktop = windowWidth >= 1024;
  const isMobile = windowWidth < 768;

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

  const SkeletonBlock = ({ width, height, style, borderRadius = RADIUS.sm }: { width: number | string; height: number; style?: any; borderRadius?: number }) => (
    <Animated.View style={[{ opacity, backgroundColor: COLORS.gray200, borderRadius }, { width, height }, style]} />
  );

  return (
    <View style={styles.skeletonContainer}>
      <DotGrid />
      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent, 
          { 
            paddingTop: Platform.OS === 'ios' ? 60 : SPACING.xxl,
            paddingHorizontal: isDesktop ? SPACING.xxxl : SPACING.xl,
            maxWidth: isDesktop ? 800 : '100%',
            alignSelf: isDesktop ? 'center' : 'stretch',
            width: '100%',
          }
        ]}
      >
        {/* Profile Banner Skeleton */}
        <View style={[styles.profileCard, { marginBottom: SPACING.xxxl }]}>
          <View style={[styles.profileBanner, { minHeight: 120 }]}>
            <View style={styles.profileInfo}>
              <SkeletonBlock width={80} height={80} borderRadius={RADIUS.full} style={{ backgroundColor: 'rgba(255, 255, 255, 0.3)' }} />
              <View style={styles.userInfo}>
                <SkeletonBlock width="60%" height={24} borderRadius={RADIUS.sm} style={{ backgroundColor: 'rgba(255, 255, 255, 0.3)' }} />
                <SkeletonBlock width="80%" height={16} borderRadius={RADIUS.sm} style={{ marginTop: SPACING.sm, backgroundColor: 'rgba(255, 255, 255, 0.3)' }} />
              </View>
            </View>
          </View>
        </View>

        <View style={styles.profileExpandableCard}>
          <View style={styles.profileExpandableHeader}>
            <View style={styles.profileExpandableHeaderLeft}>
              <SkeletonBlock width={24} height={24} borderRadius={RADIUS.sm} />
              <View style={styles.actionContent}>
                <SkeletonBlock width={60} height={18} borderRadius={RADIUS.sm} />
                <SkeletonBlock width={120} height={12} borderRadius={RADIUS.sm} style={{ marginTop: SPACING.xs }} />
              </View>
            </View>
            <SkeletonBlock width={20} height={20} borderRadius={RADIUS.sm} />
          </View>
        </View>

        {[
          { icon: 24, titleWidth: 120, subtitle: true },
          { icon: 24, titleWidth: 70, subtitle: true },
          { icon: 24, titleWidth: 80, subtitle: true },
          { icon: 24, titleWidth: 70, subtitle: false },
        ].map((item, i) => (
          <View key={i} style={[styles.actionCard, { marginTop: SPACING.md }]}>
            <SkeletonBlock width={24} height={24} borderRadius={RADIUS.sm} />
            <View style={styles.actionContent}>
              <SkeletonBlock width={item.titleWidth} height={18} borderRadius={RADIUS.sm} />
              {item.subtitle && (
                <SkeletonBlock width={100} height={12} borderRadius={RADIUS.sm} style={{ marginTop: SPACING.xs }} />
              )}
            </View>
            <SkeletonBlock width={20} height={20} borderRadius={RADIUS.sm} />
          </View>
        ))}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
};

// ============================================================================
// ✅ EDIT PROFILE MODAL - Name only (no profile picture)
// ============================================================================

const EditProfileModal = ({
  visible,
  onClose,
  userData,
  onUpdateProfile,
}: {
  visible: boolean;
  onClose: () => void;
  userData: any;
  onUpdateProfile: (data: { fullName: string }) => Promise<void>;
}) => {
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const [fullName, setFullName] = useState(userData.fullName || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isDesktop = windowWidth >= 1024;
  const isMobile = windowWidth < 768;

  const modalWidth = isDesktop ? 480 : isMobile ? windowWidth - 32 : 440;
  const maxModalHeight = Math.min(windowHeight * 0.85, 700);

  const handleSave = async () => {
    if (!fullName.trim()) {
      setError('Name cannot be empty');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      await onUpdateProfile({ fullName: fullName.trim() });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={[styles.modalWrapper, { padding: isMobile ? SPACING.md : SPACING.xl }]}
        >
          <Pressable 
            style={[
              styles.editProfileModalContainer,
              { 
                width: modalWidth,
                maxHeight: maxModalHeight,
              }
            ]}
          >
            <View style={styles.editProfileHeader}>
              <Text style={[styles.editProfileTitle, { fontSize: isDesktop ? 20 : 18 }]}>
                Edit Profile
              </Text>
              <TouchableOpacity onPress={onClose} style={styles.editProfileClose}>
                <CloseIcon />
              </TouchableOpacity>
            </View>

            {error ? (
              <View style={styles.errorBanner}>
                <Text style={styles.errorBannerText}>{error}</Text>
              </View>
            ) : null}

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Full Name Field */}
              <View style={styles.editProfileField}>
                <Text style={[styles.editProfileLabel, { fontSize: isMobile ? 12 : 14 }]}>Full Name</Text>
                <TextInput
                  style={[styles.editProfileInput, { fontSize: isMobile ? 15 : 16 }]}
                  value={fullName}
                  onChangeText={(text) => {
                    setFullName(text);
                    setError('');
                  }}
                  placeholder="Enter your full name"
                  placeholderTextColor={COLORS.gray400}
                />
              </View>

              {/* Email Field - Read Only */}
              <View style={[styles.editProfileField, { marginBottom: isDesktop ? SPACING.xxl : SPACING.md }]}>
                <Text style={[styles.editProfileLabel, { fontSize: isMobile ? 12 : 14 }]}>Email Address</Text>
                <View style={styles.editProfileEmailContainer}>
                  <Text style={[styles.editProfileEmail, { fontSize: isMobile ? 15 : 16 }]}>{userData.email}</Text>
                </View>
              </View>

      
            </ScrollView>

            <View style={[styles.editProfileFooter, { padding: isDesktop ? SPACING.xl : SPACING.lg }]}>
              <TouchableOpacity
                style={[styles.editProfileButton, styles.editProfileCancelButton]}
                onPress={onClose}
              >
                <Text style={[styles.editProfileCancelText, { fontSize: isMobile ? 14 : 16 }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.editProfileButton, styles.editProfileSaveButton, loading && styles.modalButtonDisabled]}
                onPress={handleSave}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color={COLORS.white} size="small" />
                ) : (
                  <Text style={[styles.editProfileSaveText, { fontSize: isMobile ? 14 : 16 }]}>Save Changes</Text>
                )}
              </TouchableOpacity>
            </View>
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
};

// Helper function for avatar color
const getAvatarColor = (email: string) => {
  const colors = [
    '#4c6fff', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
    '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#84cc16'
  ];
  let hash = 0;
  for (let i = 0; i < email.length; i++) {
    hash = email.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

// ============================================================================
// PASSWORD CHANGE MODAL
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
  const { width: windowWidth } = useWindowDimensions();
  const isDesktop = windowWidth >= 1024;
  const isMobile = windowWidth < 768;
  const modalWidth = isDesktop ? 480 : isMobile ? windowWidth - 32 : 440;

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
        <Pressable style={[styles.modalContainer, { width: modalWidth }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { fontSize: isDesktop ? 20 : 18 }]}>Change Password</Text>
            <TouchableOpacity onPress={handleClose} style={styles.modalClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <CloseIcon />
            </TouchableOpacity>
          </View>
          
          <View style={styles.passwordInputWrapper}>
            <Text style={[styles.inputLabel, { fontSize: isMobile ? 12 : 14 }]}>Current Password</Text>
            <View style={[styles.passwordInputContainer, error && !currentPassword ? styles.inputError : null]}>
              <LockIcon color={COLORS.gray400} />
              <TextInput
                style={[styles.passwordInput, { fontSize: isMobile ? 15 : 16 }]}
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
            <Text style={[styles.inputLabel, { fontSize: isMobile ? 12 : 14 }]}>New Password</Text>
            <View style={styles.passwordInputContainer}>
              <LockIcon color={COLORS.gray400} />
              <TextInput
                style={[styles.passwordInput, { fontSize: isMobile ? 15 : 16 }]}
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
                    <Text style={[styles.passwordRequirementText, { fontSize: isMobile ? 11 : 12 }]}>{err}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
          
          <View style={styles.passwordInputWrapper}>
            <Text style={[styles.inputLabel, { fontSize: isMobile ? 12 : 14 }]}>Confirm New Password</Text>
            <View style={[styles.passwordInputContainer, confirmPassword && newPassword !== confirmPassword ? styles.inputError : null]}>
              <LockIcon color={COLORS.gray400} />
              <TextInput
                style={[styles.passwordInput, { fontSize: isMobile ? 15 : 16 }]}
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
              <Text style={[styles.passwordMismatchText, { fontSize: isMobile ? 11 : 12 }]}>Passwords do not match</Text>
            )}
            {confirmPassword && newPassword === confirmPassword && newPassword.length > 0 && (
              <Text style={[styles.matchSuccess, { fontSize: isMobile ? 11 : 12 }]}>✓ Passwords match</Text>
            )}
          </View>
          
          {error ? <Text style={[styles.modalError, { fontSize: isMobile ? 12 : 14 }]}>{error}</Text> : null}
          
          <TouchableOpacity
            style={[styles.modalButton, loading && styles.modalButtonDisabled]}
            onPress={handleChangePassword}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color={COLORS.white} size="small" />
            ) : (
              <Text style={[styles.modalButtonText, { fontSize: isMobile ? 15 : 16 }]}>Update Password</Text>
            )}
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

// ============================================================================
// SIGN OUT CONFIRMATION MODAL
// ============================================================================

const SignOutModal = ({
  visible,
  onClose,
  onConfirm,
  loading,
}: {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
  loading: boolean;
}) => {
  const { width: windowWidth } = useWindowDimensions();
  const isDesktop = windowWidth >= 1024;
  const isMobile = windowWidth < 768;
  const modalWidth = isDesktop ? 400 : isMobile ? windowWidth - 32 : 380;

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <Pressable style={[styles.signOutModalContainer, { width: modalWidth }]}>
          <View style={styles.signOutIconWrapper}>
            <View style={[styles.signOutIconCircle, { width: isDesktop ? 72 : 64, height: isDesktop ? 72 : 64 }]}>
              <SignOutIcon color={COLORS.danger} />
            </View>
          </View>

          <Text style={[styles.signOutModalTitle, { fontSize: isDesktop ? 20 : 18 }]}>Sign Out</Text>
          <Text style={[styles.signOutModalMessage, { fontSize: isMobile ? 14 : 16 }]}>
            Are you sure you want to sign out?
          </Text>

          <View style={styles.signOutModalButtons}>
            <TouchableOpacity
              style={[styles.signOutModalButton, styles.signOutModalCancelButton]}
              onPress={onClose}
              disabled={loading}
            >
              <Text style={[styles.signOutModalCancelText, { fontSize: isMobile ? 14 : 16 }]}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.signOutModalButton, styles.signOutModalConfirmButton]}
              onPress={onConfirm}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={COLORS.white} size="small" />
              ) : (
                <Text style={[styles.signOutModalConfirmText, { fontSize: isMobile ? 14 : 16 }]}>Sign Out</Text>
              )}
            </TouchableOpacity>
          </View>
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
        Animated.spring(slideAnim, { toValue: 0, ...{ tension: 50, friction: 7 }, useNativeDriver: true }),
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
// ✅ MAIN USER ACCOUNT COMPONENT - Simplified (no profile picture upload)
// ============================================================================

export default function UserAccount() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  
  const isDesktop = windowWidth >= 1024;
  const isMobile = windowWidth < 768;

  const [userData, setUserData] = useState({
    fullName: '',
    email: '',
    username: '',
    authProvider: 'email' as 'email' | 'google' | null,
  });
  const [savedDiagrams, setSavedDiagrams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  const [isProfileExpanded, setIsProfileExpanded] = useState(false);
  
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showSignOutModal, setShowSignOutModal] = useState(false);
  const [signOutLoading, setSignOutLoading] = useState(false);
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

  // ============================================================================
  // LOAD USER DATA
  // ============================================================================

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
      console.log('📥 Loaded user data:', result);
      
      if (result.success && result.data?.user) {
        const { fullName, email, username, authProvider } = result.data.user;
        setUserData({
          fullName: fullName || '',
          email: email || '',
          username: username || '',
          authProvider: authProvider || 'email',
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

  // ============================================================================
  // ✅ UPDATE PROFILE - Name only
  // ============================================================================

  const handleUpdateProfile = async (data: { fullName: string }) => {
    try {
      console.log('📤 Starting profile update...');
      console.log('📤 Data:', { fullName: data.fullName });
      
      const token = await authService.getAccessToken();
      if (!token) {
        console.error('❌ No access token found');
        showToast('Session expired. Please sign in again.', true);
        router.replace('/(auth)/signin');
        return;
      }

      const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://igraph-backend.onrender.com';
      const url = `${API_URL}/api/auth/update-profile`;
      
      console.log('📡 Sending request to:', url);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);
      
      try {
        const response = await fetch(url, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(data),
          signal: controller.signal,
        });
        
        clearTimeout(timeoutId);
        
        console.log('📥 Response status:', response.status);
        
        const result = await response.json();
        console.log('📥 Response data:', result);
        
        if (result.success) {
          setUserData(prev => ({
            ...prev,
            fullName: result.data.user.fullName,
          }));
          
          if (Platform.OS === 'web') {
            try {
              const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
              storedUser.fullName = result.data.user.fullName;
              localStorage.setItem('user', JSON.stringify(storedUser));
              console.log('💾 Updated localStorage user data');
            } catch (e) {
              console.warn('Could not update localStorage:', e);
            }
          }
          
          showToast('Profile updated successfully');
          setShowEditProfileModal(false);
        } else {
          console.error('❌ Update failed:', result.message);
          showToast(result.message || 'Failed to update profile', true);
        }
      } catch (fetchError: any) {
        clearTimeout(timeoutId);
        if (fetchError.name === 'AbortError') {
          showToast('Request timed out. Please try again.', true);
        } else {
          throw fetchError;
        }
      }
    } catch (error: any) {
      console.error('❌ Update profile error:', error);
      
      if (error.message?.includes('Failed to fetch') || error.message?.includes('Network')) {
        showToast('Cannot connect to server. Please check your connection.', true);
      } else {
        showToast(error.message || 'Failed to update profile. Please try again.', true);
      }
    }
  };

  const handlePasswordSuccess = () => {
    showToast('Password changed successfully');
    setShowPasswordModal(false);
  };

  const handleSignOutConfirm = async () => {
    setSignOutLoading(true);
    
    try {
      await authService.logout();
      setUserData({ fullName: '', email: '', username: '', authProvider: null });
      setShowSignOutModal(false);
      router.replace('/(auth)/signin');
    } catch (error) {
      console.error('Sign out error:', error);
      setShowSignOutModal(false);
      router.replace('/(auth)/signin');
    } finally {
      setSignOutLoading(false);
    }
  };

  const handleSignOutPress = () => {
    setShowSignOutModal(true);
  };

  // ============================================================================
  // ✅ Email-based avatar functions
  // ============================================================================

  const getInitials = useCallback(() => {
    if (!userData.fullName) return 'U';
    return userData.fullName
      .split(' ')
      .map((n: string) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }, [userData.fullName]);

  const getDisplayName = useCallback(() => {
    if (userData.fullName && userData.fullName.trim()) return userData.fullName;
    if (userData.email) return userData.email.split('@')[0];
    return 'User';
  }, [userData.fullName, userData.email]);

  // Generate avatar color from email
  const getAvatarColor = useCallback((email: string) => {
    const colors = [
      '#4c6fff', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
      '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#84cc16'
    ];
    let hash = 0;
    for (let i = 0; i < email.length; i++) {
      hash = email.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  }, []);

  const avatarColor = getAvatarColor(userData.email);

  if (loading) {
    return <SkeletonLoader />;
  }

  const isGoogleUser = userData.authProvider === 'google';

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <DotGrid />

      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <ScrollView 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.scrollContent, 
            { 
              paddingTop: insets.top + SPACING.xxl,
              paddingHorizontal: isDesktop ? SPACING.xxxl : SPACING.xl,
              maxWidth: isDesktop ? 800 : '100%',
              alignSelf: isDesktop ? 'center' : 'stretch',
              width: '100%',
            }
          ]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={COLORS.primary}
              colors={[COLORS.primary]}
            />
          }
        >
          {/* Profile Card - Email-based avatar */}
          <View style={[styles.profileCard, { marginBottom: isDesktop ? SPACING.xxxl : SPACING.xxxl }]}>
            <View style={styles.profileBanner}>
              <View style={styles.profileInfo}>
                <View style={styles.avatarContainer}>
                  <View style={[styles.avatar, styles.avatarPlaceholder, { backgroundColor: avatarColor }]}>
                    <Text style={styles.avatarInitials}>{getInitials()}</Text>
                  </View>
                </View>
                
                <View style={styles.userInfo}>
                  <Text style={[styles.userName, { fontSize: isDesktop ? 20 : 18 }]}>{getDisplayName()}</Text>
                  <Text style={[styles.userEmail, { fontSize: isDesktop ? 15 : 14 }]}>{userData.email}</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Action Cards */}
          <View style={[styles.actionsGrid, { gap: isDesktop ? SPACING.lg : SPACING.md }]}>
            {/* Profile Expandable Card */}
            <View style={styles.profileExpandableCard}>
              <Pressable 
                style={({ pressed }) => [
                  styles.profileExpandableHeader,
                  pressed && styles.actionCardPressed,
                ]}
                onPress={() => setIsProfileExpanded(!isProfileExpanded)}
              >
                <View style={styles.profileExpandableHeaderLeft}>
                  <ProfileIcon />
                  <View style={styles.actionContent}>
                    <Text style={[styles.actionTitle, { fontSize: isMobile ? 15 : 16 }]}>Profile</Text>
                    <Text style={[styles.actionDescription, { fontSize: isMobile ? 11 : 12 }]}>
                      {isProfileExpanded ? 'Tap to collapse' : 'Manage your account details'}
                    </Text>
                  </View>
                </View>
                <AnimatedChevron 
                  expanded={isProfileExpanded} 
                  color={isProfileExpanded ? COLORS.primary : '#94a3b8'} 
                />
              </Pressable>

              {isProfileExpanded && (
                <View style={styles.profileExpandableContent}>
                  <Pressable 
                    style={({ pressed }) => [
                      styles.profileOption,
                      pressed && styles.profileOptionPressed,
                    ]}
                    onPress={() => {
                      setIsProfileExpanded(false);
                      setTimeout(() => setShowEditProfileModal(true), 150);
                    }}
                  >
                    <View style={styles.profileOptionLeft}>
                      <EditIcon />
                      <Text style={[styles.profileOptionText, { fontSize: isMobile ? 15 : 16 }]}>Edit Profile</Text>
                    </View>
                    <ChevronRight color="#94a3b8" />
                  </Pressable>

                  {!isGoogleUser && (
                    <Pressable 
                      style={({ pressed }) => [
                        styles.profileOption,
                        pressed && styles.profileOptionPressed,
                      ]}
                      onPress={() => {
                        setIsProfileExpanded(false);
                        setTimeout(() => setShowPasswordModal(true), 150);
                      }}
                    >
                      <View style={styles.profileOptionLeft}>
                        <LockIcon color={COLORS.primary} />
                        <Text style={[styles.profileOptionText, { fontSize: isMobile ? 15 : 16 }]}>Change Password</Text>
                      </View>
                      <ChevronRight color="#94a3b8" />
                    </Pressable>
                  )}
                </View>
              )}
            </View>

            <Pressable 
              style={({ pressed }) => [styles.actionCard, pressed && styles.actionCardPressed]}
              onPress={() => router.push('/(tabs)/savedDiagrams')}
            >
              <DiagramIcon />
              <View style={styles.actionContent}>
                <Text style={[styles.actionTitle, { fontSize: isMobile ? 15 : 16 }]}>Saved Diagrams</Text>
                <Text style={[styles.actionDescription, { fontSize: isMobile ? 11 : 12 }]}>
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
                <Text style={[styles.actionTitle, { fontSize: isMobile ? 15 : 16 }]}>Privacy</Text>
                <Text style={[styles.actionDescription, { fontSize: isMobile ? 11 : 12 }]}>Terms & policies</Text>
              </View>
              <ChevronRight />
            </Pressable>

            <Pressable 
              style={({ pressed }) => [styles.actionCard, pressed && styles.actionCardPressed]}
              onPress={() => router.push('/(tabs)/aboutUs')}
            >
              <ShieldIcon />
              <View style={styles.actionContent}>
                <Text style={[styles.actionTitle, { fontSize: isMobile ? 15 : 16 }]}>About Us</Text>
                <Text style={[styles.actionDescription, { fontSize: isMobile ? 11 : 12 }]}>Team & system info</Text>
              </View>
              <ChevronRight />
            </Pressable>

            <Pressable 
              style={({ pressed }) => [styles.actionCard, styles.signOutCard, pressed && styles.actionCardPressed]}
              onPress={handleSignOutPress}
            >
              <SignOutIcon color={COLORS.danger} />
              <View style={styles.actionContent}>
                <Text style={[styles.actionTitle, styles.signOutText, { fontSize: isMobile ? 15 : 16 }]}>Sign Out</Text>
              </View>
              <ChevronRight color={COLORS.danger} />
            </Pressable>
          </View>
        </ScrollView>
      </TouchableWithoutFeedback>

      {/* Modals */}
      <EditProfileModal
        visible={showEditProfileModal}
        onClose={() => setShowEditProfileModal(false)}
        userData={userData}
        onUpdateProfile={handleUpdateProfile}
      />

      <ChangePasswordModal
        visible={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
        onSuccess={handlePasswordSuccess}
        router={router}
      />

      <SignOutModal
        visible={showSignOutModal}
        onClose={() => setShowSignOutModal(false)}
        onConfirm={handleSignOutConfirm}
        loading={signOutLoading}
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
    flexGrow: 1,
    paddingBottom: 40,
  },
  
  skeletonContainer: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  
  profileCard: {
    borderRadius: RADIUS.xxl,
    overflow: 'hidden',
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
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitials: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.white,
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
  
  profileExpandableCard: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    ...SHADOWS.sm,
  },
  profileExpandableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.lg,
  },
  profileExpandableHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: SPACING.md,
  },
  profileExpandableContent: {
    borderTopWidth: 1,
    borderTopColor: COLORS.gray100,
    paddingVertical: SPACING.sm,
  },
  profileOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  profileOptionPressed: {
    backgroundColor: COLORS.gray50,
  },
  profileOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  profileOptionText: {
    ...TYPOGRAPHY.body,
    color: COLORS.gray800,
  },
  
  editProfileModalContainer: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.xxl,
    overflow: 'hidden',
    ...SHADOWS.lg,
  },
  editProfileHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray100,
  },
  editProfileTitle: {
    ...TYPOGRAPHY.h3,
    color: COLORS.gray900,
  },
  editProfileClose: {
    padding: SPACING.xs,
  },
  editProfileField: {
    paddingHorizontal: SPACING.xl,
    marginBottom: SPACING.md,
  },
  editProfileLabel: {
    ...TYPOGRAPHY.small,
    color: COLORS.gray500,
    marginBottom: SPACING.xs,
  },
  editProfileInput: {
    ...TYPOGRAPHY.body,
    color: COLORS.gray900,
    borderWidth: 1,
    borderColor: COLORS.gray200,
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  editProfileEmailContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.sm,
  },
  editProfileEmail: {
    ...TYPOGRAPHY.body,
    color: COLORS.gray600,
  },
  editProfileEmailBadge: {
    backgroundColor: COLORS.successLight,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
  },
  editProfileEmailBadgeText: {
    ...TYPOGRAPHY.tiny,
    color: COLORS.success,
  },
  editProfileAvatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  editProfileAvatar: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editProfileAvatarText: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.white,
  },
  editProfileAvatarInfo: {
    color: COLORS.gray500,
    flex: 1,
  },
  editProfileFooter: {
    flexDirection: 'row',
    gap: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray100,
  },
  editProfileButton: {
    flex: 1,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.lg,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  editProfileCancelButton: {
    backgroundColor: COLORS.gray100,
  },
  editProfileSaveButton: {
    backgroundColor: COLORS.primary,
  },
  editProfileCancelText: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.gray700,
  },
  editProfileSaveText: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.white,
  },
  modalButtonDisabled: {
    opacity: 0.6,
  },
  
  errorBanner: {
    backgroundColor: COLORS.dangerLight,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    marginBottom: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.danger,
  },
  errorBannerText: {
    color: COLORS.danger,
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
  
  modalOverlay: {
    flex: 1,
    backgroundColor: COLORS.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
  },
  modalWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
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
  modalButtonText: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.white,
  },
  
  signOutModalContainer: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.xxl,
    padding: SPACING.xxl,
    alignItems: 'center',
    ...SHADOWS.lg,
  },
  signOutIconWrapper: {
    marginBottom: SPACING.lg,
  },
  signOutIconCircle: {
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.dangerLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  signOutModalTitle: {
    ...TYPOGRAPHY.h3,
    color: COLORS.gray900,
    marginBottom: SPACING.sm,
  },
  signOutModalMessage: {
    ...TYPOGRAPHY.body,
    color: COLORS.gray500,
    textAlign: 'center',
    marginBottom: SPACING.xl,
    lineHeight: 22,
  },
  signOutModalButtons: {
    flexDirection: 'row',
    gap: SPACING.md,
    width: '100%',
  },
  signOutModalButton: {
    flex: 1,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.lg,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  signOutModalCancelButton: {
    backgroundColor: COLORS.gray100,
  },
  signOutModalConfirmButton: {
    backgroundColor: COLORS.danger,
  },
  signOutModalCancelText: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.gray700,
  },
  signOutModalConfirmText: {
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