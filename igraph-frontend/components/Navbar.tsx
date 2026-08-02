import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Dimensions,
  Image,
  StatusBar,
  Platform,
  Animated,
} from 'react-native';
import { useRouter, usePathname, Href } from 'expo-router';
import { Svg, Path, Rect, Circle } from 'react-native-svg';
import * as Haptics from 'expo-haptics'; // npx expo install expo-haptics
import { useSave } from '../contexts/SaveContext';

// One nativeID per tab link, so each tab's onboarding tour (utils/tours.ts)
// can point a step at "the nav item for this tab" regardless of which
// layout (desktop side links vs. mobile bottom dock) is currently rendered.
const NAV_TOUR_IDS: Record<string, string> = {
  '/(tabs)/home': 'tour-nav-home',
  '/(tabs)/create': 'tour-nav-create',
  '/(tabs)/reference': 'tour-nav-reference',
  '/(tabs)/userAccount': 'tour-nav-profile',
};

// ============ BREAKPOINT ============
const DESKTOP_BREAKPOINT = 1024;

// ============ HEIGHT CONSTANTS ============
const NAVBAR_HEIGHT_DEFAULT = 52;
const NAVBAR_HEIGHT_COMPACT = 40;
const NAVBAR_HEIGHT_MOBILE_COMPACT = 44;

// ============ ICONS ============
const DiagramIcon = ({ active, size = 18, color }: { active: boolean; size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Rect x="3" y="3" width="18" height="18" rx="3" stroke={color ?? (active ? '#ffffff' : '#64748b')} strokeWidth={1.8} fill="none" />
    <Path d="M8 8h8M8 12h6M8 16h4" stroke={color ?? (active ? '#ffffff' : '#64748b')} strokeWidth={1.8} strokeLinecap="round" />
  </Svg>
);

const CreateIcon = ({ active, size = 18, color }: { active: boolean; size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M4 20L8.5 19L19.5 8L16 4.5L5 15.5L4 20Z" stroke={color ?? (active ? '#ffffff' : '#64748b')} strokeWidth={1.8} fill="none" strokeLinejoin="round" />
    <Path d="M14 6L18 10" stroke={color ?? (active ? '#ffffff' : '#64748b')} strokeWidth={1.8} strokeLinecap="round" />
  </Svg>
);

const LearnIcon = ({ active, size = 18, color }: { active: boolean; size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M12 4L3 9L12 14L21 9L12 4Z" stroke={color ?? (active ? '#ffffff' : '#64748b')} strokeWidth={1.8} fill="none" strokeLinejoin="round" />
    <Path d="M3 14L12 19L21 14" stroke={color ?? (active ? '#ffffff' : '#64748b')} strokeWidth={1.8} fill="none" />
  </Svg>
);

const UserAccountIcon = ({ active, size = 18, color }: { active: boolean; size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="8" r="4" stroke={color ?? (active ? '#ffffff' : '#64748b')} strokeWidth={1.8} fill="none" />
    <Path d="M20 21V19C20 16.8 18.2 15 16 15H8C5.8 15 4 16.8 4 19V21" stroke={color ?? (active ? '#ffffff' : '#64748b')} strokeWidth={1.8} strokeLinecap="round" fill="none" />
  </Svg>
);

const SaveIcon = ({ color = '#ffffff' }: { color?: string }) => (
  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
    <Path d="M19 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.21071 3.96086 4.46957 3 5 3H16L21 8V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21Z" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M17 21V13H7V21" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M7 3V8H15" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

interface NavbarProps {
  fullName?: string;
  userEmail?: string;
  profilePicture?: string | null;
  compact?: boolean;
  hideNavLinks?: boolean;
  actions?: React.ReactNode;
  showSave?: boolean;
  hideTopBar?: boolean;
}

// ============================================================================
// ✅ EMAIL-BASED AVATAR HELPER FUNCTIONS
// ============================================================================

const getInitials = (fullName: string): string => {
  if (!fullName) return 'U';
  return fullName
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

const getDisplayName = (fullName: string, email: string): string => {
  if (fullName && fullName.trim()) return fullName;
  if (email) return email.split('@')[0];
  return 'User';
};

const getAvatarColor = (email: string): string => {
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
// ✅ ROUTE HELPER
// ============================================================================

const stripGroups = (path: string): string => {
  if (!path) return '/';
  const stripped = path.replace(/\/\([^)]+\)/g, '');
  return stripped === '' ? '/' : stripped;
};

const isRouteActive = (pathname: string, route: string): boolean => {
  const cleanPathname = stripGroups(pathname);
  const cleanRoute = stripGroups(route);
  if (cleanRoute === '/home') {
    return cleanPathname === '/home' || cleanPathname === '/';
  }
  return cleanPathname === cleanRoute;
};

// ============================================================================
// AVATAR COMPONENT
// ============================================================================

const Avatar = ({ fullName, email, size = 28 }: { fullName: string; email: string; size?: number }) => {
  const initials = getInitials(fullName);
  const color = getAvatarColor(email);
  const fontSize = size * 0.45;

  return (
    <View style={[styles.avatarContainer, { width: size, height: size, borderRadius: size / 2, backgroundColor: color }]}>
      <Text style={[styles.avatarText, { fontSize: Math.max(fontSize, 10) }]}>{initials}</Text>
    </View>
  );
};

// ============================================================================
// NAVBAR COMPONENT
// ============================================================================

export default function Navbar({
  fullName = 'User',
  userEmail = '',
  profilePicture = null,
  compact = false,
  hideNavLinks = false,
  actions,
  showSave = false,
  hideTopBar = false,
}: NavbarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { onSave, isSaving } = useSave();

  const [screenWidth, setScreenWidth] = useState(Dimensions.get('window').width);

  const isBurger = screenWidth < DESKTOP_BREAKPOINT;

  // ─── Dynamic values based on compact mode AND platform ──────────────────
  const getNavbarHeight = () => {
    if (!compact) return NAVBAR_HEIGHT_DEFAULT;
    if (isBurger) return NAVBAR_HEIGHT_MOBILE_COMPACT;
    return NAVBAR_HEIGHT_COMPACT;
  };

  const navbarHeight = getNavbarHeight();
  const logoSize = compact ? (isBurger ? 24 : 22) : 28;
  const logoFontSize = compact ? (isBurger ? 15 : 14) : 17;
  const navFontSize = compact ? (isBurger ? 13 : 12) : 14;
  const avatarSize = compact ? (isBurger ? 30 : 28) : 32;
  const showGreeting = !compact;

  useEffect(() => {
    const sub = Dimensions.addEventListener('change', ({ window }) => {
      setScreenWidth(window.width);
    });
    return () => sub.remove();
  }, []);

  const handleNavigation = (route: string) => {
    // Create lives on a plain Stack (not real tabs), so router.push would
    // always mount a brand-new, blank create screen and leave the old one
    // (with in-progress shapes) frozen behind it. router.navigate resurfaces
    // the existing instance instead. Scoped to just this route since the
    // other screens refetch on mount and rely on actually remounting.
    if (route === '/(tabs)/create') {
      router.navigate(route as Href);
      return;
    }
    router.push(route as Href);
  };

  const triggerTabHaptic = () => {
    if (Platform.OS === 'ios' || Platform.OS === 'android') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
  };

  const navItems = [
    { label: 'Diagram Library', route: '/(tabs)/home', icon: DiagramIcon },
    { label: 'Create Diagram', route: '/(tabs)/create', icon: CreateIcon },
    { label: 'Learning References', route: '/(tabs)/reference', icon: LearnIcon },
    { label: 'Account', route: '/(tabs)/userAccount', icon: UserAccountIcon },
  ];

  // Bottom navbar drops Account — it's already reachable via the top avatar button
  const bottomNavItems = navItems.filter((item) => item.label !== 'Account');

  // ─── ✅ Animated sliding indicator for the bottom navbar ─────────────────
  // The indicator glides behind whichever side tab (Diagram Library /
  // Learning References) is active. The Create tab is a raised FAB and
  // isn't part of the sliding indicator — it gets its own active treatment.
  const [barWidth, setBarWidth] = useState(0);
  const itemWidth = barWidth / bottomNavItems.length;
  const indicatorX = useRef(new Animated.Value(0)).current;
  const indicatorOpacity = useRef(new Animated.Value(0)).current;

  const activeSideIndex = bottomNavItems.findIndex(
    (item) => item.route !== '/(tabs)/create' && isRouteActive(pathname, item.route)
  );

  useEffect(() => {
    if (itemWidth <= 0) return;
    if (activeSideIndex === -1) {
      Animated.timing(indicatorOpacity, { toValue: 0, duration: 150, useNativeDriver: true }).start();
      return;
    }
    Animated.parallel([
      Animated.spring(indicatorX, {
        toValue: activeSideIndex * itemWidth,
        useNativeDriver: true,
        friction: 8,
        tension: 65,
      }),
      Animated.timing(indicatorOpacity, { toValue: 1, duration: 150, useNativeDriver: true }),
    ]).start();
  }, [activeSideIndex, itemWidth]);

  // ─── ✅ FIXED: Handle Save - Guard against accidental auto-saves ──────────
  const handleSavePress = async () => {
    if (isSaving) {
      console.log('🔄 Save already in progress, ignoring duplicate click');
      return;
    }

    console.log('🟢 Navbar Save button clicked');
    console.log('🟢 onSave:', !!onSave);
    if (onSave) {
      console.log('🟢 Calling onSave()...');
      await onSave();
      console.log('🟢 onSave() completed');
    } else {
      console.log('❌ No save handler registered!');
    }
  };

  // ─────────────────────────────────────────────
  // DESKTOP  (≥ 1024 px)
  // ─────────────────────────────────────────────
  if (!isBurger) {
    return (
      <>
        <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
        <View style={[styles.desktopContainer, { height: navbarHeight }]}>
          <View style={[styles.desktopNav, { height: navbarHeight }]}>
            {/* Logo */}
            <Pressable
              onPress={() => handleNavigation('/(tabs)/home')}
              style={({ pressed }) => [
                styles.logoArea,
                pressed && styles.logoPressed,
              ]}
            >
              <Image
                source={require('../assets/images/logo.png')}
                style={[styles.logoImage, { width: logoSize, height: logoSize }]}
              />
              <Text style={[styles.logoText, { fontSize: logoFontSize }]}>
                iGraph IT
              </Text>
            </Pressable>

            {/* Navigation Items - conditionally hidden */}
            {!hideNavLinks && (
              <View nativeID="tour-navbar-overview" style={styles.navLinks}>
                {navItems.map((item) => {
                  const isActive = isRouteActive(pathname, item.route);
                  const Icon = item.icon;
                  return (
                    <Pressable
                      key={item.label}
                      nativeID={NAV_TOUR_IDS[item.route]}
                      onPress={() => handleNavigation(item.route)}
                      style={({ pressed }) => [
                        styles.navItem,
                        { height: navbarHeight },
                        pressed && styles.navItemPressed,
                      ]}
                    >
                      <View style={styles.navItemInner}>
                        <Icon active={isActive} color={isActive ? '#2563eb' : '#64748b'} />
                        <Text style={[
                          styles.navLabel,
                          isActive && styles.navLabelActive,
                          { fontSize: navFontSize }
                        ]}>
                          {item.label}
                        </Text>
                      </View>
                      {isActive && <View style={styles.navUnderline} />}
                    </Pressable>
                  );
                })}
              </View>
            )}

            {/* Right side: Save + Actions + Avatar */}
            <View style={styles.navRight}>
              {showSave && onSave && (
                <Pressable
                  onPress={handleSavePress}
                  disabled={isSaving}
                  style={({ pressed }) => [
                    styles.saveButton,
                    isSaving && styles.saveButtonDisabled,
                    pressed && styles.saveButtonPressed,
                  ]}
                >
                  {isSaving ? (
                    <View style={styles.saveSpinner} />
                  ) : (
                    <>
                      <SaveIcon color="#ffffff" />
                      <Text style={styles.saveButtonText}>Save</Text>
                    </>
                  )}
                </Pressable>
              )}
              {actions}
              <Avatar fullName={fullName} email={userEmail} size={avatarSize} />
              {showGreeting && (
                <Text style={[styles.greetingText, { fontSize: 14 }]} numberOfLines={1}>
                  {getDisplayName(fullName, userEmail)}
                </Text>
              )}
            </View>
          </View>
        </View>
      </>
    );
  }

  // ─────────────────────────────────────────────
  // MOBILE + TABLET  (< 1024 px)
  // Top bar: logo + save + account shortcut (no burger)
  // Bottom: floating premium navbar with sliding indicator + FAB
  // ─────────────────────────────────────────────

  const isCreateScreen = isRouteActive(pathname, '/(tabs)/create');
  const shouldShowTopBar = !hideTopBar && !isCreateScreen;

  return (
    <>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      {/* Top Bar — fully removed on the create screen (mobile) */}
      {shouldShowTopBar && (
        <View style={[styles.mobileContainer, { height: navbarHeight }]}>
          <View style={[styles.mobileNav, { height: navbarHeight }]}>
            <Pressable
              onPress={() => handleNavigation('/(tabs)/home')}
              style={({ pressed }) => [
                styles.logoArea,
                pressed && styles.logoPressed,
              ]}
            >
              <Image
                source={require('../assets/images/logo.png')}
                style={[styles.logoImage, { width: logoSize, height: logoSize }]}
              />
              <Text style={[styles.logoText, { fontSize: logoFontSize }]}>
                iGraph IT
              </Text>
            </Pressable>

            <View style={styles.mobileRight}>
              {showSave && onSave && (
                <Pressable
                  onPress={handleSavePress}
                  disabled={isSaving}
                  style={({ pressed }) => [
                    styles.mobileSaveButton,
                    isSaving && styles.mobileSaveButtonDisabled,
                    pressed && styles.mobileSaveButtonPressed,
                  ]}
                >
                  {isSaving ? (
                    <View style={styles.saveSpinnerSmall} />
                  ) : (
                    <SaveIcon color="#10b981" />
                  )}
                </Pressable>
              )}
              {actions}

              <Pressable
                onPress={() => handleNavigation('/(tabs)/userAccount')}
                style={({ pressed }) => [
                  styles.accountBtn,
                  pressed && styles.accountBtnPressed,
                ]}
              >
                <Avatar fullName={fullName} email={userEmail} size={30} />
              </Pressable>
            </View>
          </View>
        </View>
      )}

      {/* Docked Bottom Navbar — premium version. Hidden on the create screen
          (mobile): it has its own bottom toolbar + shapes panel, and this
          floating bar (zIndex 200) was sitting on top of and hiding them. */}
      {!isCreateScreen && (
      <View style={styles.bottomNavWrapper}>
        <View
          nativeID="tour-navbar-mobile-dock"
          style={styles.bottomNavCard}
          onLayout={(e) => setBarWidth(e.nativeEvent.layout.width)}
        >
          {/* Sliding active-tab indicator, sits behind Diagram Library / Learning References */}
          {barWidth > 0 && (
            <Animated.View
              pointerEvents="none"
              style={[
                styles.slidingIndicator,
                {
                  width: itemWidth - 20,
                  left: 10,
                  opacity: indicatorOpacity,
                  transform: [{ translateX: indicatorX }],
                },
              ]}
            />
          )}

          {bottomNavItems.map((item) => {
            const isActive = isRouteActive(pathname, item.route);
            const isCreateTab = item.route === '/(tabs)/create';
            const Icon = item.icon;

            // ─── Create tab: raised FAB, always visually elevated ───
            if (isCreateTab) {
              return (
                <Pressable
                  key={item.label}
                  nativeID={NAV_TOUR_IDS[item.route]}
                  onPress={() => {
                    triggerTabHaptic();
                    handleNavigation(item.route);
                  }}
                  style={({ pressed }) => [
                    styles.createTabWrapper,
                    pressed && styles.createTabPressed,
                  ]}
                >
                  <View style={[styles.createFab, isActive && styles.createFabActive]}>
                    <Icon active size={24} color="#ffffff" />
                  </View>
                  <Text style={styles.createTabLabel}>Create</Text>
                </Pressable>
              );
            }

            // ─── Side tabs: icon + label riding on the sliding indicator ───
            return (
              <Pressable
                key={item.label}
                nativeID={NAV_TOUR_IDS[item.route]}
                onPress={() => {
                  triggerTabHaptic();
                  handleNavigation(item.route);
                }}
                style={({ pressed }) => [
                  styles.bottomNavItem,
                  pressed && styles.bottomNavItemPressed,
                ]}
              >
                <Icon active={isActive} size={22} color={isActive ? '#2563eb' : '#94a3b8'} />
                <Text
                  style={[
                    styles.bottomNavLabel,
                    isActive ? styles.bottomNavLabelActive : styles.bottomNavLabelInactive,
                  ]}
                  numberOfLines={1}
                >
                  {item.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
      )}
    </>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  // ── DESKTOP ──────────────────────────────────
  desktopContainer: {
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    paddingHorizontal: 24,
    zIndex: 100,
  },
  desktopNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    maxWidth: 1280,
    alignSelf: 'center',
    width: '100%',
  },
  logoArea: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 6,
    borderRadius: 8,
  },
  logoPressed: {
    backgroundColor: '#f1f5f9',
  },
  logoImage: {
    borderRadius: 6,
  },
  logoText: {
    fontWeight: '700',
    color: '#0f172a',
    letterSpacing: -0.3,
  },
  navLinks: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    height: '100%',
  },
  navItem: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    position: 'relative',
  },
  navItemPressed: {
    opacity: 0.7,
  },
  navItemInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  navLabel: {
    fontWeight: '500',
    color: '#64748b',
  },
  navLabelActive: {
    color: '#2563eb',
    fontWeight: '600',
  },
  navUnderline: {
    position: 'absolute',
    bottom: 0,
    left: 8,
    right: 8,
    height: 3,
    backgroundColor: '#2563eb',
    borderRadius: 2,
  },
  navRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#10b981',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.95 }],
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
  },
  saveSpinner: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: '#ffffff',
    borderTopColor: 'transparent',
  },
  saveSpinnerSmall: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#10b981',
    borderTopColor: 'transparent',
  },
  avatarContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  avatarText: {
    fontWeight: '600',
    color: '#ffffff',
  },
  greetingText: {
    fontWeight: '500',
    color: '#0f172a',
  },

  // ── MOBILE + TABLET TOP BAR ───────────────────
  mobileContainer: {
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    paddingHorizontal: 16,
    zIndex: 200,
  },
  mobileNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  mobileRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  mobileSaveButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  mobileSaveButtonDisabled: {
    opacity: 0.4,
  },
  mobileSaveButtonPressed: {
    backgroundColor: '#dcfce7',
  },
  accountBtn: {
    borderRadius: 20,
    padding: 2,
  },
  accountBtnPressed: {
    opacity: 0.7,
  },
  // ── DOCKED BOTTOM NAVBAR (premium) ───────────
  bottomNavWrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 200,
  },
  bottomNavCard: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.97)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(226, 232, 240, 0.7)',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 12,
    paddingHorizontal: 4,
    paddingBottom: Platform.OS === 'ios' ? 22 : 14,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.10,
    shadowRadius: 16,
    elevation: 14,
    overflow: 'visible',
  },
  slidingIndicator: {
    position: 'absolute',
    top: 6,
    height: 44,
    borderRadius: 16,
    backgroundColor: 'rgba(37, 99, 235, 0.09)',
  },
  bottomNavItem: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 6,
  },
  bottomNavItemPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.96 }],
  },
  bottomNavLabel: {
    fontSize: 10.5,
    letterSpacing: 0.1,
  },
  bottomNavLabelInactive: {
    color: '#94a3b8',
    fontWeight: '500',
  },
  bottomNavLabelActive: {
    color: '#2563eb',
    fontWeight: '700',
  },

  // Elevated Create FAB — the visual centerpiece of the bar
  createTabWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
  },
  createTabPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.95 }],
  },
  createFab: {
    width: 54,
    height: 54,
    borderRadius: 27,
    marginTop: -30,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563eb',
    borderWidth: 4,
    borderColor: '#ffffff',
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 10,
  },
  createFabActive: {
    backgroundColor: '#1d4ed8',
  },
  createTabLabel: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#2563eb',
    letterSpacing: 0.1,
  },
});