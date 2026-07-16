import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Modal,
  Platform,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Keyboard,
  Animated,
  RefreshControl,
  Pressable,
  useWindowDimensions,
  LayoutAnimation,
  UIManager,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Svg, Path, Circle, Rect } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as authService from '../../services/authService';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// DESIGN SYSTEM CONSTANTS

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
  overlay: 'rgba(15, 23, 42, 0.55)',
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

const SPACING = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, xxxl: 32 };
const RADIUS = { sm: 6, md: 10, lg: 14, xl: 18, xxl: 24, full: 999 };

// Extra clearance for content sitting under a bottom tab bar on mobile
// (this screen lives under a (tabs) route group). Covers typical tab
// bar height so the last card in a ScrollView isn't hidden behind it.
const TAB_BAR_ALLOWANCE = 90;

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

const EASE_LAYOUT = LayoutAnimation.create(
  220,
  LayoutAnimation.Types.easeInEaseOut,
  LayoutAnimation.Properties.opacity
);

const AVATAR_COLORS = ['#4c6fff', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#84cc16'];

const getAvatarColor = (email: string) => {
  if (!email) return AVATAR_COLORS[0];
  let hash = 0;
  for (let i = 0; i < email.length; i++) {
    hash = email.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
};

const getInitialsFromName = (name: string, fallbackEmail?: string) => {
  const source = name?.trim() ? name.trim() : fallbackEmail?.split('@')[0] || '';
  if (!source) return 'U';
  return source
    .split(' ')
    .filter(Boolean)
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

// DOT GRID PATTERN (single SVG instead of ~200 mapped Views)

const DotGrid = () => {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const DOT_SPACING = 32;
  const DOT_SIZE = 1.4;

  return (
    <View style={styles.dotGridContainer} pointerEvents="none">
      <Svg width={screenWidth} height={screenHeight}>
        {Array.from({ length: Math.ceil(screenHeight / DOT_SPACING) }).map((_, row) =>
          Array.from({ length: Math.ceil(screenWidth / DOT_SPACING) }).map((_, col) => (
            <Circle
              key={`${row}-${col}`}
              cx={col * DOT_SPACING}
              cy={row * DOT_SPACING}
              r={DOT_SIZE}
              fill={COLORS.primary}
              opacity={0.12}
            />
          ))
        )}
      </Svg>
    </View>
  );
};

// ICONS

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

const InfoIcon = ({ color = '#000000' }: { color?: string }) => (
  <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="12" r="9" stroke={color} strokeWidth={2} />
    <Path d="M12 11v6M12 8h.01" stroke={color} strokeWidth={2} strokeLinecap="round" />
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

const CloseIcon = ({ color = '#0f172a' }: { color?: string }) => (
  <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
    <Path d="M18 6L6 18M6 6L18 18" stroke={color} strokeWidth={2.5} strokeLinecap="round" />
  </Svg>
);

const ChevronRight = ({ color = '#94a3b8' }: { color?: string }) => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
    <Path d="M9 18l6-6-6-6" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const CheckCircleIcon = () => (
  <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="12" r="10" stroke="#ffffff" strokeWidth={2} />
    <Path d="M8 12l2 2 4-4" stroke="#ffffff" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const AlertCircleIcon = () => (
  <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="12" r="10" stroke="#ffffff" strokeWidth={2} />
    <Path d="M12 8v5M12 16h.01" stroke="#ffffff" strokeWidth={2} strokeLinecap="round" />
  </Svg>
);

const ProfileIcon = () => (
  <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="8" r="4" stroke="#4c6fff" strokeWidth={2} />
    <Path d="M20 21V19C20 16.8 18.2 15 16 15H8C5.8 15 4 16.8 4 19V21" stroke="#4c6fff" strokeWidth={2} strokeLinecap="round" />
  </Svg>
);

const EditIcon = ({ color = '#4c6fff' }: { color?: string }) => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
    <Path d="M11 4H4C3.46957 4 2.96086 4.21071 2.58579 4.58579C2.21071 4.96086 2 5.46957 2 6V20C2 20.5304 2.21071 21.0391 2.58579 21.4142C2.96086 21.7893 3.46957 22 4 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V13" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M18.5 2.5L21.5 5.5L12 15H9V12L18.5 2.5Z" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

// ANIMATED CHEVRON
// Rotates 0deg -> 90deg: right-pointing ">" becomes a down-pointing "v" when expanded.

const AnimatedChevron = ({ expanded, color }: { expanded: boolean; color: string }) => {
  const spinValue = useRef(new Animated.Value(expanded ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(spinValue, {
      toValue: expanded ? 1 : 0,
      duration: 220,
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
        <Path d="M9 18l6-6-6-6" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    </Animated.View>
  );
};

// SKELETON LOADER

const SkeletonLoader = () => {
  const opacity = useRef(new Animated.Value(0.35)).current;
  const { width: windowWidth } = useWindowDimensions();
  const isDesktop = windowWidth >= 1024;
  const isMobile = windowWidth < 768;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 750, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.35, duration: 750, useNativeDriver: true }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, []);

  const SkeletonBlock = ({
    width,
    height,
    style,
    borderRadius = RADIUS.sm,
  }: {
    width: number | string;
    height: number;
    style?: any;
    borderRadius?: number;
  }) => <Animated.View style={[{ opacity, backgroundColor: COLORS.gray200, borderRadius }, { width, height }, style]} />;

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
          },
        ]}
      >
        <View style={[styles.profileCard, { marginBottom: SPACING.xxxl }]}>
          <View style={[styles.profileBanner, { minHeight: 120 }]}>
            <View style={styles.profileInfo}>
              <SkeletonBlock width={80} height={80} borderRadius={RADIUS.full} style={{ backgroundColor: 'rgba(255,255,255,0.3)' }} />
              <View style={styles.userInfo}>
                <SkeletonBlock width="60%" height={24} borderRadius={RADIUS.sm} style={{ backgroundColor: 'rgba(255,255,255,0.3)' }} />
                <SkeletonBlock width="80%" height={16} borderRadius={RADIUS.sm} style={{ marginTop: SPACING.sm, backgroundColor: 'rgba(255,255,255,0.3)' }} />
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
          { titleWidth: 120, subtitle: true },
          { titleWidth: 70, subtitle: true },
          { titleWidth: 80, subtitle: true },
          { titleWidth: 70, subtitle: false },
        ].map((item, i) => (
          <View key={i} style={[styles.actionCard, { marginTop: SPACING.md }]}>
            <SkeletonBlock width={24} height={24} borderRadius={RADIUS.sm} />
            <View style={styles.actionContent}>
              <SkeletonBlock width={item.titleWidth} height={18} borderRadius={RADIUS.sm} />
              {item.subtitle && <SkeletonBlock width={100} height={12} borderRadius={RADIUS.sm} style={{ marginTop: SPACING.xs }} />}
            </View>
            <SkeletonBlock width={20} height={20} borderRadius={RADIUS.sm} />
          </View>
        ))}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
};

// EDIT PROFILE MODAL

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
  const [nameFocused, setNameFocused] = useState(false);

  const isDesktop = windowWidth >= 1024;
  const isMobile = windowWidth < 768;

  const modalWidth = isDesktop ? 460 : isMobile ? windowWidth - 32 : 420;
  const maxModalHeight = Math.min(windowHeight * 0.85, 640);
  const isDirty = fullName.trim() !== (userData.fullName || '').trim();
  const hasError = !!error;

  useEffect(() => {
    if (visible) {
      setFullName(userData.fullName || '');
      setError('');
      setNameFocused(false);
    }
  }, [visible, userData.fullName]);

  const handleSave = async () => {
    if (loading) return;
    if (!fullName.trim()) {
      setError('Name cannot be empty');
      return;
    }
    if (!isDirty) {
      onClose();
      return;
    }

    setLoading(true);
    setError('');

    try {
      await onUpdateProfile({ fullName: fullName.trim() });
    } catch (err: any) {
      setError(err.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (loading) return;
    onClose();
  };

  return (
    <Modal animationType="fade" transparent visible={visible} onRequestClose={handleClose}>
      <Pressable style={styles.modalOverlay} onPress={handleClose}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={[styles.modalWrapper, { padding: isMobile ? SPACING.md : SPACING.xl }]}
        >
          <Pressable style={[styles.editProfileModalContainer, { width: modalWidth, maxHeight: maxModalHeight }]}>
            <TouchableOpacity
              onPress={handleClose}
              style={[styles.editProfileClose, loading && styles.disabledTouchable]}
              disabled={loading}
              accessibilityRole="button"
              accessibilityLabel="Close edit profile"
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <CloseIcon color={COLORS.gray500} />
            </TouchableOpacity>

            <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
              <View style={styles.editProfileHeroSection}>
                <Text style={[styles.editProfileTitle, { fontSize: isDesktop ? 20 : 19 }]}>Edit Profile</Text>
                <Text style={styles.editProfileSubtitle}>Update your name below</Text>
              </View>

              <View style={styles.editProfileField}>
                <Text style={styles.editProfileLabel}>Full Name</Text>
                <TextInput
                  style={[
                    styles.editProfileInput,
                    { fontSize: isMobile ? 15 : 16 },
                    nameFocused && styles.editProfileInputFocused,
                    hasError && styles.inputError,
                    loading && styles.disabledInput,
                  ]}
                  value={fullName}
                  onChangeText={(text) => {
                    setFullName(text);
                    setError('');
                  }}
                  onFocus={() => setNameFocused(true)}
                  onBlur={() => setNameFocused(false)}
                  placeholder="Enter your full name"
                  placeholderTextColor={COLORS.gray400}
                  editable={!loading}
                  accessibilityLabel="Full name"
                />
                {hasError ? <Text style={styles.editProfileFieldError}>{error}</Text> : null}
              </View>

              <View style={styles.editProfileField}>
                <Text style={styles.editProfileLabel}>Email Address</Text>
                <View style={styles.editProfileEmailRow}>
                  <LockIcon color={COLORS.gray400} />
                  <Text style={styles.editProfileEmail} numberOfLines={1}>
                    {userData.email}
                  </Text>
                </View>
                <Text style={styles.editProfileFieldHint}>Your email can't be changed</Text>
              </View>
            </ScrollView>

            <View style={[styles.editProfileFooter, { padding: isDesktop ? SPACING.xl : SPACING.lg }]}>
              <TouchableOpacity
                style={[styles.editProfileButton, styles.editProfileCancelButton, loading && styles.disabledTouchable]}
                onPress={handleClose}
                disabled={loading}
                accessibilityRole="button"
                accessibilityLabel="Cancel edit"
              >
                <Text style={[styles.editProfileCancelText, { fontSize: isMobile ? 14 : 16 }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.editProfileButton,
                  styles.editProfileSaveButton,
                  (loading || !isDirty) && styles.modalButtonDisabled,
                ]}
                onPress={handleSave}
                disabled={loading || !isDirty}
                accessibilityRole="button"
                accessibilityLabel="Save changes"
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

// PASSWORD CHANGE MODAL

type PasswordFieldError = 'current' | 'new' | 'confirm' | null;

const ChangePasswordModal = ({
  visible,
  onClose,
  onSuccess,
  router,
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
  const [errorField, setErrorField] = useState<PasswordFieldError>(null);
  const [passwordErrors, setPasswordErrors] = useState<string[]>([]);

  const validateNewPassword = (pwd: string) => {
    const errs: string[] = [];
    if (pwd.length < 8) errs.push('At least 8 characters');
    if (!/[A-Z]/.test(pwd)) errs.push('One uppercase letter');
    if (!/[a-z]/.test(pwd)) errs.push('One lowercase letter');
    if (!/[0-9]/.test(pwd)) errs.push('One number');
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(pwd)) errs.push('One special character');
    setPasswordErrors(errs);
    return errs.length === 0;
  };

  const handleChangePassword = async () => {
    if (loading) return;
    setError('');
    setErrorField(null);

    if (!currentPassword) {
      setError('Please enter your current password');
      setErrorField('current');
      return;
    }
    if (!validateNewPassword(newPassword)) {
      setError('Please meet all password requirements');
      setErrorField('new');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('New passwords do not match');
      setErrorField('confirm');
      return;
    }

    setLoading(true);

    try {
      const result = await authService.changePassword(currentPassword, newPassword);

      if (result.success) {
        handleClose();
        onSuccess();
        setTimeout(async () => {
          await authService.logout();
          router.replace('/(auth)/signin');
        }, 900);
      } else {
        setError(result.message || 'Failed to change password');
        setErrorField('current');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Unable to change password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (loading) return;
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setShowCurrentPassword(false);
    setShowNewPassword(false);
    setShowConfirmPassword(false);
    setError('');
    setErrorField(null);
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
    <Modal animationType="fade" transparent visible={visible} onRequestClose={handleClose}>
      <Pressable style={styles.modalOverlay} onPress={handleClose}>
        <Pressable style={[styles.modalContainer, { width: modalWidth }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { fontSize: isDesktop ? 20 : 18 }]}>Change Password</Text>
            <TouchableOpacity
              onPress={handleClose}
              style={[styles.modalClose, loading && styles.disabledTouchable]}
              disabled={loading}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessibilityRole="button"
              accessibilityLabel="Close change password"
            >
              <CloseIcon />
            </TouchableOpacity>
          </View>

          <View style={styles.passwordInputWrapper}>
            <Text style={[styles.inputLabel, { fontSize: isMobile ? 12 : 14 }]}>Current Password</Text>
            <View style={[styles.passwordInputContainer, errorField === 'current' && styles.inputError, loading && styles.disabledInput]}>
              <LockIcon color={COLORS.gray400} />
              <TextInput
                style={[styles.passwordInput, { fontSize: isMobile ? 15 : 16 }]}
                placeholder="Enter your current password"
                placeholderTextColor={COLORS.gray400}
                value={currentPassword}
                onChangeText={(text) => {
                  setCurrentPassword(text);
                  setError('');
                  setErrorField(null);
                }}
                secureTextEntry={!showCurrentPassword}
                autoCapitalize="none"
                editable={!loading}
                accessibilityLabel="Current password"
              />
              <TouchableOpacity
                style={styles.passwordEyeBtn}
                onPress={() => setShowCurrentPassword(!showCurrentPassword)}
                accessibilityRole="button"
                accessibilityLabel={showCurrentPassword ? 'Hide current password' : 'Show current password'}
              >
                <EyeIcon visible={showCurrentPassword} />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.passwordInputWrapper}>
            <Text style={[styles.inputLabel, { fontSize: isMobile ? 12 : 14 }]}>New Password</Text>
            <View style={[styles.passwordInputContainer, errorField === 'new' && styles.inputError, loading && styles.disabledInput]}>
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
                  setErrorField(null);
                }}
                secureTextEntry={!showNewPassword}
                autoCapitalize="none"
                editable={!loading}
                accessibilityLabel="New password"
              />
              <TouchableOpacity
                style={styles.passwordEyeBtn}
                onPress={() => setShowNewPassword(!showNewPassword)}
                accessibilityRole="button"
                accessibilityLabel={showNewPassword ? 'Hide new password' : 'Show new password'}
              >
                <EyeIcon visible={showNewPassword} />
              </TouchableOpacity>
            </View>

            {newPassword.length > 0 && (
              <View style={styles.passwordStrengthContainer}>
                <View style={styles.passwordStrengthBar}>
                  <View style={[styles.passwordStrengthFill, { width: strength.width, backgroundColor: strength.color }]} />
                </View>
                {strength.text ? <Text style={[styles.passwordStrengthText, { color: strength.color }]}>{strength.text}</Text> : null}
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
            <View
              style={[
                styles.passwordInputContainer,
                (errorField === 'confirm' || (confirmPassword && newPassword !== confirmPassword)) && styles.inputError,
                loading && styles.disabledInput,
              ]}
            >
              <LockIcon color={COLORS.gray400} />
              <TextInput
                style={[styles.passwordInput, { fontSize: isMobile ? 15 : 16 }]}
                placeholder="Confirm new password"
                placeholderTextColor={COLORS.gray400}
                value={confirmPassword}
                onChangeText={(text) => {
                  setConfirmPassword(text);
                  setError('');
                  setErrorField(null);
                }}
                secureTextEntry={!showConfirmPassword}
                autoCapitalize="none"
                editable={!loading}
                accessibilityLabel="Confirm new password"
              />
              <TouchableOpacity
                style={styles.passwordEyeBtn}
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                accessibilityRole="button"
                accessibilityLabel={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
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
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Update password"
          >
            {loading ? <ActivityIndicator color={COLORS.white} size="small" /> : (
              <Text style={[styles.modalButtonText, { fontSize: isMobile ? 15 : 16 }]}>Update Password</Text>
            )}
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

// SIGN OUT CONFIRMATION MODAL

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
    <Modal animationType="fade" transparent visible={visible} onRequestClose={() => !loading && onClose()}>
      <Pressable style={styles.modalOverlay} onPress={() => !loading && onClose()}>
        <Pressable style={[styles.signOutModalContainer, { width: modalWidth }]}>
          <View style={styles.signOutIconWrapper}>
            <View style={[styles.signOutIconCircle, { width: isDesktop ? 72 : 64, height: isDesktop ? 72 : 64 }]}>
              <SignOutIcon color={COLORS.danger} />
            </View>
          </View>

          <Text style={[styles.signOutModalTitle, { fontSize: isDesktop ? 20 : 18 }]}>Sign Out</Text>
          <Text style={[styles.signOutModalMessage, { fontSize: isMobile ? 14 : 16 }]}>
            Are you sure you want to sign out of your account?
          </Text>

          <View style={styles.signOutModalButtons}>
            <TouchableOpacity
              style={[styles.signOutModalButton, styles.signOutModalCancelButton, loading && styles.disabledTouchable]}
              onPress={onClose}
              disabled={loading}
              accessibilityRole="button"
              accessibilityLabel="Cancel sign out"
            >
              <Text style={[styles.signOutModalCancelText, { fontSize: isMobile ? 14 : 16 }]}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.signOutModalButton, styles.signOutModalConfirmButton, loading && styles.modalButtonDisabled]}
              onPress={onConfirm}
              disabled={loading}
              accessibilityRole="button"
              accessibilityLabel="Confirm sign out"
            >
              {loading ? <ActivityIndicator color={COLORS.white} size="small" /> : (
                <Text style={[styles.signOutModalConfirmText, { fontSize: isMobile ? 14 : 16 }]}>Sign Out</Text>
              )}
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

// TOAST COMPONENT

const Toast = ({
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
  const slideAnim = useRef(new Animated.Value(-40)).current;
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
        Animated.spring(slideAnim, { toValue: 0, tension: 60, friction: 8, useNativeDriver: true }),
      ]).start();
      timeoutRef.current = setTimeout(() => hideToast(), 3200);
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
      Animated.timing(fadeAnim, { toValue: 0, duration: 250, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: -40, duration: 250, useNativeDriver: true }),
    ]).start(() => onHide());
  };

  if (!visible) return null;

  return (
    <Animated.View style={[styles.toastContainer, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]} pointerEvents="none">
      <View style={[styles.toastContent, isError ? styles.toastError : styles.toastSuccess]}>
        <View style={styles.toastIcon}>{isError ? <AlertCircleIcon /> : <CheckCircleIcon />}</View>
        <Text style={styles.toastText} numberOfLines={2}>{message}</Text>
      </View>
    </Animated.View>
  );
};

// MAIN USER ACCOUNT COMPONENT

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
    setToast((prev) => ({ ...prev, visible: false }));
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

  // LOAD USER DATA

  const loadUserData = async () => {
    try {
      const token = await authService.getAccessToken();
      if (!token) {
        router.replace('/(auth)/signin');
        return;
      }

      // Goes through the shared axios instance so an expired access token
      // (15 min TTL) triggers an automatic refresh-and-retry instead of
      // silently failing and leaving fullName/email blank (-> "User" fallback).
      const result = await authService.verifyToken();

      if (result.success && result.data?.user) {
        const { fullName, email, username, authProvider } = result.data.user;
        setUserData({
          fullName: fullName || '',
          email: email || '',
          username: username || '',
          authProvider: authProvider || 'email',
        });
      } else {
        // verifyToken() already clears tokens when the session is truly
        // expired/invalid (401 after a failed refresh); anything else is
        // a transient failure, so don't boot the user out for that.
        const stillHasToken = await authService.getAccessToken();
        if (!stillHasToken) {
          router.replace('/(auth)/signin');
        } else {
          await useCachedUserAsFallback();
          showToast('Failed to load user data. Pull down to refresh.', true);
        }
      }
    } catch (error) {
      console.error('Failed to load user data:', error);
      await useCachedUserAsFallback();
      showToast('Failed to load user data. Pull down to refresh.', true);
    } finally {
      setLoading(false);
    }
  };

  // A transient failure (server unreachable, etc.) shouldn't blank out a
  // name/email the user already saw moments ago and replace it with the
  // generic "User" placeholder — fall back to whatever's cached instead.
  const useCachedUserAsFallback = async () => {
    const cached = await authService.getCachedUser();
    if (cached) {
      setUserData({
        fullName: cached.fullName || '',
        email: cached.email || '',
        username: cached.username || '',
        authProvider: cached.authProvider || 'email',
      });
    }
  };

  const loadSavedDiagrams = async () => {
    try {
      const token = await authService.getAccessToken();
      if (!token) return;

      const result = await authService.getUserDiagrams();
      if (result.success && result.data) {
        setSavedDiagrams(result.data);
      }
    } catch (error) {
      console.error('Failed to load diagrams:', error);
    }
  };

  // UPDATE PROFILE (name only)

  const handleUpdateProfile = async (data: { fullName: string }) => {
    const token = await authService.getAccessToken();
    if (!token) {
      showToast('Session expired. Please sign in again.', true);
      router.replace('/(auth)/signin');
      throw new Error('No access token');
    }

    // authService.updateProfile() goes through the shared axios instance
    // (auto-refreshes an expired access token) and already updates the
    // cached/localStorage user on success.
    const result = await authService.updateProfile({ fullName: data.fullName });

    if (result.success && result.data?.user) {
      setUserData((prev) => ({ ...prev, fullName: result.data.user.fullName }));
      showToast('Profile updated successfully');
      setShowEditProfileModal(false);
    } else {
      throw new Error(result.message || 'Failed to update profile');
    }
  };

  const handlePasswordSuccess = () => {
    showToast('Password changed. Signing you out…');
  };

  const handleSignOutConfirm = async () => {
    setSignOutLoading(true);
    try {
      await authService.logout();
      setUserData({ fullName: '', email: '', username: '', authProvider: null });
    } catch (error) {
      console.error('Sign out error:', error);
    } finally {
      setSignOutLoading(false);
      setShowSignOutModal(false);
      router.replace('/(auth)/signin');
    }
  };

  const handleSignOutPress = () => {
    setShowSignOutModal(true);
  };

  const toggleProfileExpanded = () => {
    LayoutAnimation.configureNext(EASE_LAYOUT);
    setIsProfileExpanded((prev) => !prev);
  };

  // AVATAR HELPERS

  const getDisplayName = useCallback(() => {
    if (userData.fullName && userData.fullName.trim()) return userData.fullName;
    if (userData.email) return userData.email.split('@')[0];
    return 'User';
  }, [userData.fullName, userData.email]);

  const avatarColor = getAvatarColor(userData.email);
  const avatarInitials = getInitialsFromName(userData.fullName, userData.email);

  if (loading) {
    return <SkeletonLoader />;
  }

  const isGoogleUser = userData.authProvider === 'google';

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
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
              // Clears the bottom tab bar + home indicator on mobile so the
              // Sign Out card (last item) isn't hidden behind them.
              paddingBottom: insets.bottom + (isMobile ? TAB_BAR_ALLOWANCE : SPACING.xxxl),
            },
          ]}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} colors={[COLORS.primary]} />
          }
        >
          {/* Profile Card */}
          <View style={[styles.profileCard, { marginBottom: SPACING.xxxl }]}>
            <View style={styles.profileBanner}>
              <View style={styles.profileInfo}>
                <View style={[styles.avatar, styles.avatarPlaceholder, { backgroundColor: avatarColor }]}>
                  <Text style={styles.avatarInitials}>{avatarInitials}</Text>
                </View>

                <View style={styles.userInfo}>
                  <Text style={[styles.userName, { fontSize: isDesktop ? 20 : 18 }]} numberOfLines={1}>
                    {getDisplayName()}
                  </Text>
                  <Text style={[styles.userEmail, { fontSize: isDesktop ? 15 : 14 }]} numberOfLines={1}>
                    {userData.email}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Action Cards */}
          <View style={[styles.actionsGrid, { gap: isDesktop ? SPACING.lg : SPACING.md }]}>
            {/* Profile Expandable Card */}
            <View style={styles.profileExpandableCard}>
              <Pressable
                style={({ pressed }) => [styles.profileExpandableHeader, pressed && styles.actionCardPressed]}
                onPress={toggleProfileExpanded}
                accessibilityRole="button"
                accessibilityLabel="Profile settings"
                accessibilityState={{ expanded: isProfileExpanded }}
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
                <AnimatedChevron expanded={isProfileExpanded} color={isProfileExpanded ? COLORS.primary : COLORS.gray400} />
              </Pressable>

              {isProfileExpanded && (
                <View style={styles.profileExpandableContent}>
                  <Pressable
                    style={({ pressed }) => [styles.profileOption, pressed && styles.profileOptionPressed]}
                    onPress={() => {
                      toggleProfileExpanded();
                      setTimeout(() => setShowEditProfileModal(true), 180);
                    }}
                    accessibilityRole="button"
                    accessibilityLabel="Edit profile"
                  >
                    <View style={styles.profileOptionLeft}>
                      <EditIcon />
                      <Text style={[styles.profileOptionText, { fontSize: isMobile ? 15 : 16 }]}>Edit Profile</Text>
                    </View>
                    <ChevronRight color={COLORS.gray400} />
                  </Pressable>

                  {!isGoogleUser && (
                    <Pressable
                      style={({ pressed }) => [styles.profileOption, pressed && styles.profileOptionPressed]}
                      onPress={() => {
                        toggleProfileExpanded();
                        setTimeout(() => setShowPasswordModal(true), 180);
                      }}
                      accessibilityRole="button"
                      accessibilityLabel="Change password"
                    >
                      <View style={styles.profileOptionLeft}>
                        <LockIcon color={COLORS.primary} />
                        <Text style={[styles.profileOptionText, { fontSize: isMobile ? 15 : 16 }]}>Change Password</Text>
                      </View>
                      <ChevronRight color={COLORS.gray400} />
                    </Pressable>
                  )}
                </View>
              )}
            </View>

            <Pressable
              style={({ pressed }) => [styles.actionCard, pressed && styles.actionCardPressed]}
              onPress={() => router.push('/(tabs)/savedDiagrams')}
              accessibilityRole="button"
              accessibilityLabel={`Saved diagrams, ${savedDiagrams.length} saved`}
            >
              <DiagramIcon color={COLORS.gray700} />
              <View style={styles.actionContent}>
                <Text style={[styles.actionTitle, { fontSize: isMobile ? 15 : 16 }]}>Saved Diagrams</Text>
                <Text style={[styles.actionDescription, { fontSize: isMobile ? 11 : 12 }]}>{savedDiagrams.length} saved</Text>
              </View>
              <ChevronRight />
            </Pressable>

            <Pressable
              style={({ pressed }) => [styles.actionCard, pressed && styles.actionCardPressed]}
              onPress={() => router.push('/(tabs)/privacy')}
              accessibilityRole="button"
              accessibilityLabel="Privacy, terms and policies"
            >
              <ShieldIcon color={COLORS.gray700} />
              <View style={styles.actionContent}>
                <Text style={[styles.actionTitle, { fontSize: isMobile ? 15 : 16 }]}>Privacy</Text>
                <Text style={[styles.actionDescription, { fontSize: isMobile ? 11 : 12 }]}>Terms & policies</Text>
              </View>
              <ChevronRight />
            </Pressable>

            <Pressable
              style={({ pressed }) => [styles.actionCard, pressed && styles.actionCardPressed]}
              onPress={() => router.push('/(tabs)/aboutUs')}
              accessibilityRole="button"
              accessibilityLabel="About us, team and system info"
            >
              <InfoIcon color={COLORS.gray700} />
              <View style={styles.actionContent}>
                <Text style={[styles.actionTitle, { fontSize: isMobile ? 15 : 16 }]}>About Us</Text>
                <Text style={[styles.actionDescription, { fontSize: isMobile ? 11 : 12 }]}>Team & system info</Text>
              </View>
              <ChevronRight />
            </Pressable>

            <Pressable
              style={({ pressed }) => [styles.actionCard, styles.signOutCard, pressed && styles.actionCardPressed]}
              onPress={handleSignOutPress}
              accessibilityRole="button"
              accessibilityLabel="Sign out"
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

      <Toast visible={toast.visible} message={toast.message} isError={toast.isError} onHide={hideToast} />
    </KeyboardAvoidingView>
  );
}

// STYLES

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.gray50 },

  dotGridContainer: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, overflow: 'hidden' },

  scrollContent: { flexGrow: 1, paddingBottom: 40 },

  skeletonContainer: { flex: 1, backgroundColor: COLORS.gray50 },

  profileCard: { borderRadius: RADIUS.xxl, overflow: 'hidden', ...SHADOWS.md },
  profileBanner: { backgroundColor: COLORS.primary, minHeight: 120 },
  profileInfo: { flexDirection: 'row', alignItems: 'center', padding: SPACING.xxl, gap: SPACING.lg },
  avatar: { width: 80, height: 80, borderRadius: RADIUS.full, borderWidth: 3, borderColor: COLORS.white },
  avatarPlaceholder: { justifyContent: 'center', alignItems: 'center' },
  avatarInitials: { fontSize: 28, fontWeight: '700', color: COLORS.white },
  userInfo: { flex: 1 },
  userName: { ...TYPOGRAPHY.h3, color: COLORS.white },
  userEmail: { ...TYPOGRAPHY.caption, color: 'rgba(255,255,255,0.9)', marginTop: 2 },

  actionsGrid: { gap: SPACING.md },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    ...SHADOWS.sm,
  },
  actionCardPressed: { backgroundColor: COLORS.gray50, transform: [{ scale: 0.98 }] },
  signOutCard: { borderWidth: 1, borderColor: COLORS.dangerLight },
  actionContent: { flex: 1, marginLeft: SPACING.md },
  actionTitle: { ...TYPOGRAPHY.bodyBold, color: COLORS.gray900 },
  actionDescription: { ...TYPOGRAPHY.small, color: COLORS.gray500, marginTop: 2 },
  signOutText: { color: COLORS.danger },

  profileExpandableCard: { backgroundColor: COLORS.white, borderRadius: RADIUS.lg, overflow: 'hidden', ...SHADOWS.sm },
  profileExpandableHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: SPACING.lg },
  profileExpandableHeaderLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: SPACING.md },
  profileExpandableContent: { borderTopWidth: 1, borderTopColor: COLORS.gray100, paddingVertical: SPACING.sm },
  profileOption: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md },
  profileOptionPressed: { backgroundColor: COLORS.gray50 },
  profileOptionLeft: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  profileOptionText: { ...TYPOGRAPHY.body, color: COLORS.gray800 },

  editProfileModalContainer: { backgroundColor: COLORS.white, borderRadius: RADIUS.xxl, overflow: 'hidden', ...SHADOWS.lg },
  editProfileClose: {
    position: 'absolute',
    top: SPACING.lg,
    right: SPACING.lg,
    zIndex: 1,
    padding: SPACING.xs,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.gray50,
  },
  editProfileHeroSection: {
    alignItems: 'center',
    paddingTop: SPACING.xxl,
    paddingBottom: SPACING.lg,
    paddingHorizontal: SPACING.xl,
  },
  editProfileTitle: { ...TYPOGRAPHY.h3, color: COLORS.gray900 },
  editProfileSubtitle: {
    ...TYPOGRAPHY.caption,
    color: COLORS.gray500,
    textAlign: 'center',
    marginTop: SPACING.xs,
    maxWidth: 260,
  },
  editProfileField: { paddingHorizontal: SPACING.xl, marginBottom: SPACING.lg },
  editProfileLabel: { ...TYPOGRAPHY.captionBold, color: COLORS.gray700, marginBottom: SPACING.sm },
  editProfileInput: {
    ...TYPOGRAPHY.body,
    color: COLORS.gray900,
    borderWidth: 1.5,
    borderColor: COLORS.gray200,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.gray50,
  },
  editProfileInputFocused: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.white,
  },
  editProfileFieldError: { ...TYPOGRAPHY.small, color: COLORS.danger, marginTop: SPACING.sm },
  editProfileFieldHint: { ...TYPOGRAPHY.small, color: COLORS.gray400, marginTop: SPACING.sm },
  editProfileEmailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.gray50,
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
    borderColor: COLORS.gray100,
  },
  editProfileEmail: { ...TYPOGRAPHY.body, color: COLORS.gray500, flex: 1 },
  editProfileFooter: { flexDirection: 'row', gap: SPACING.md, borderTopWidth: 1, borderTopColor: COLORS.gray100 },
  editProfileButton: { flex: 1, paddingVertical: SPACING.md, borderRadius: RADIUS.lg, alignItems: 'center', justifyContent: 'center', minHeight: 48 },
  editProfileCancelButton: { backgroundColor: COLORS.gray100 },
  editProfileSaveButton: { backgroundColor: COLORS.primary },
  editProfileCancelText: { ...TYPOGRAPHY.bodyBold, color: COLORS.gray700 },
  editProfileSaveText: { ...TYPOGRAPHY.bodyBold, color: COLORS.white },
  modalButtonDisabled: { opacity: 0.55 },
  disabledTouchable: { opacity: 0.4 },
  disabledInput: { backgroundColor: COLORS.gray50, opacity: 0.7 },

  modalOverlay: { flex: 1, backgroundColor: COLORS.overlay, justifyContent: 'center', alignItems: 'center', padding: SPACING.xl },
  modalWrapper: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  modalContainer: { backgroundColor: COLORS.white, borderRadius: RADIUS.xxl, overflow: 'hidden', ...SHADOWS.lg },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray100,
  },
  modalTitle: { ...TYPOGRAPHY.h3, color: COLORS.gray900 },
  modalClose: { padding: SPACING.xs, borderRadius: RADIUS.full },
  modalError: { ...TYPOGRAPHY.small, color: COLORS.danger, marginTop: SPACING.sm, paddingHorizontal: SPACING.xl },
  modalButton: { backgroundColor: COLORS.primary, margin: SPACING.xl, paddingVertical: SPACING.lg, borderRadius: RADIUS.lg, alignItems: 'center' },
  modalButtonText: { ...TYPOGRAPHY.bodyBold, color: COLORS.white },

  signOutModalContainer: { backgroundColor: COLORS.white, borderRadius: RADIUS.xxl, padding: SPACING.xxl, alignItems: 'center', ...SHADOWS.lg },
  signOutIconWrapper: { marginBottom: SPACING.lg },
  signOutIconCircle: { borderRadius: RADIUS.full, backgroundColor: COLORS.dangerLight, justifyContent: 'center', alignItems: 'center' },
  signOutModalTitle: { ...TYPOGRAPHY.h3, color: COLORS.gray900, marginBottom: SPACING.sm },
  signOutModalMessage: { ...TYPOGRAPHY.body, color: COLORS.gray500, textAlign: 'center', marginBottom: SPACING.xl, lineHeight: 22 },
  signOutModalButtons: { flexDirection: 'row', gap: SPACING.md, width: '100%' },
  signOutModalButton: { flex: 1, paddingVertical: SPACING.md, borderRadius: RADIUS.lg, alignItems: 'center', justifyContent: 'center', minHeight: 48 },
  signOutModalCancelButton: { backgroundColor: COLORS.gray100 },
  signOutModalConfirmButton: { backgroundColor: COLORS.danger },
  signOutModalCancelText: { ...TYPOGRAPHY.bodyBold, color: COLORS.gray700 },
  signOutModalConfirmText: { ...TYPOGRAPHY.bodyBold, color: COLORS.white },

  passwordInputWrapper: { paddingHorizontal: SPACING.xl, paddingTop: SPACING.lg },
  inputLabel: { ...TYPOGRAPHY.captionBold, color: COLORS.gray700, marginBottom: SPACING.sm },
  passwordInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.gray200,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.white,
    paddingHorizontal: SPACING.md,
  },
  inputError: { borderColor: COLORS.danger },
  passwordInput: { flex: 1, paddingVertical: SPACING.md, marginLeft: SPACING.sm, ...TYPOGRAPHY.body, color: COLORS.gray900 },
  passwordEyeBtn: { padding: SPACING.sm },
  passwordStrengthContainer: { marginTop: SPACING.md },
  passwordStrengthBar: { height: 4, backgroundColor: COLORS.gray200, borderRadius: RADIUS.full, overflow: 'hidden' },
  passwordStrengthFill: { height: '100%', borderRadius: RADIUS.full },
  passwordStrengthText: { ...TYPOGRAPHY.small, marginTop: SPACING.sm },
  passwordRequirements: { marginTop: SPACING.sm },
  passwordRequirementRow: { flexDirection: 'row', alignItems: 'center', marginTop: SPACING.xs },
  passwordRequirementDot: { width: 4, height: 4, borderRadius: RADIUS.full, backgroundColor: COLORS.gray400, marginRight: SPACING.sm },
  passwordRequirementText: { ...TYPOGRAPHY.small, color: COLORS.gray500 },
  passwordMismatchText: { ...TYPOGRAPHY.small, color: COLORS.danger, marginTop: SPACING.sm },
  matchSuccess: { color: COLORS.success, marginTop: SPACING.sm, fontSize: 12, fontWeight: '500' },

  toastContainer: { position: 'absolute', top: Platform.OS === 'ios' ? 60 : 50, left: SPACING.xl, right: SPACING.xl, zIndex: 1000, alignItems: 'center' },
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
  toastIcon: { marginRight: SPACING.sm },
  toastSuccess: { backgroundColor: COLORS.success },
  toastError: { backgroundColor: COLORS.danger },
  toastText: { ...TYPOGRAPHY.captionBold, color: COLORS.white, flex: 1 },
});