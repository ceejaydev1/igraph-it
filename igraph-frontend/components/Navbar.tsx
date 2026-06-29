// components/Navbar.tsx - Full updated with mobile compact support

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Dimensions,
  Image,
  ScrollView,
  StatusBar,
  Animated,
  Platform,
} from 'react-native';
import { useRouter, usePathname, Href } from 'expo-router';
import { Svg, Path, Rect, Circle } from 'react-native-svg';

// ============ BREAKPOINT ============
const DESKTOP_BREAKPOINT = 1024;

// ============ HEIGHT CONSTANTS ============
const NAVBAR_HEIGHT_DEFAULT = 52;
const NAVBAR_HEIGHT_COMPACT = 40;
const NAVBAR_HEIGHT_MOBILE_COMPACT = 44; // ← Mobile compact (slightly taller for touch)

// ============ ICONS ============
const DiagramIcon = ({ active }: { active: boolean }) => (
  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
    <Rect x="3" y="3" width="18" height="18" rx="3" stroke={active ? '#2563eb' : '#64748b'} strokeWidth={1.8} fill={active ? '#eff6ff' : 'none'} />
    <Path d="M8 8h8M8 12h6M8 16h4" stroke={active ? '#2563eb' : '#64748b'} strokeWidth={1.8} strokeLinecap="round" />
  </Svg>
);

const CreateIcon = ({ active }: { active: boolean }) => (
  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
    <Path d="M4 20L8.5 19L19.5 8L16 4.5L5 15.5L4 20Z" stroke={active ? '#2563eb' : '#64748b'} strokeWidth={1.8} fill={active ? '#eff6ff' : 'none'} strokeLinejoin="round" />
    <Path d="M14 6L18 10" stroke={active ? '#2563eb' : '#64748b'} strokeWidth={1.8} strokeLinecap="round" />
  </Svg>
);

const LearnIcon = ({ active }: { active: boolean }) => (
  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
    <Path d="M12 4L3 9L12 14L21 9L12 4Z" stroke={active ? '#2563eb' : '#64748b'} strokeWidth={1.8} fill={active ? '#eff6ff' : 'none'} strokeLinejoin="round" />
    <Path d="M3 14L12 19L21 14" stroke={active ? '#2563eb' : '#64748b'} strokeWidth={1.8} fill="none" />
  </Svg>
);

const UserAccountIcon = ({ active }: { active: boolean }) => (
  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="8" r="4" stroke={active ? '#2563eb' : '#64748b'} strokeWidth={1.8} fill="none" />
    <Path d="M20 21V19C20 16.8 18.2 15 16 15H8C5.8 15 4 16.8 4 19V21" stroke={active ? '#2563eb' : '#64748b'} strokeWidth={1.8} strokeLinecap="round" fill="none" />
  </Svg>
);

const MenuIcon = () => (
  <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
    <Path d="M3 12H21M3 6H21M3 18H21" stroke="#0f172a" strokeWidth={2} strokeLinecap="round" />
  </Svg>
);

const CloseIcon = () => (
  <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
    <Path d="M18 6L6 18M6 6L18 18" stroke="#0f172a" strokeWidth={2} strokeLinecap="round" />
  </Svg>
);

interface NavbarProps {
  fullName?: string;
  userEmail?: string;
  profilePicture?: string | null;
  compact?: boolean;
  hideNavLinks?: boolean;
  actions?: React.ReactNode;
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
}: NavbarProps) {
  const router = useRouter();
  const pathname = usePathname();

  const [screenWidth, setScreenWidth] = useState(Dimensions.get('window').width);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const isBurger = screenWidth < DESKTOP_BREAKPOINT;

  // ─── Dynamic values based on compact mode AND platform ──────────────────
  // Mobile compact uses 44px (better for touch), desktop compact uses 40px
  const getNavbarHeight = () => {
    if (!compact) return NAVBAR_HEIGHT_DEFAULT;
    if (isBurger) return NAVBAR_HEIGHT_MOBILE_COMPACT; // 44px on mobile
    return NAVBAR_HEIGHT_COMPACT; // 40px on desktop
  };

  const navbarHeight = getNavbarHeight();
  const logoSize = compact ? (isBurger ? 24 : 22) : 28;
  const logoFontSize = compact ? (isBurger ? 15 : 14) : 17;
  const navFontSize = compact ? (isBurger ? 13 : 12) : 14;
  const avatarSize = compact ? (isBurger ? 30 : 28) : 32;
  const showGreeting = !compact;

  const iconAnim = useRef(new Animated.Value(0)).current;
  const menuAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const sub = Dimensions.addEventListener('change', ({ window }) => {
      setScreenWidth(window.width);
      if (window.width >= DESKTOP_BREAKPOINT && isMobileMenuOpen) {
        forceCloseMenu();
      }
    });
    return () => sub.remove();
  }, [isMobileMenuOpen]);

  const forceCloseMenu = () => {
    iconAnim.setValue(0);
    menuAnim.setValue(0);
    setIsMobileMenuOpen(false);
  };

  const openMenu = () => {
    setIsMobileMenuOpen(true);
    Animated.parallel([
      Animated.timing(iconAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
      Animated.timing(menuAnim, { toValue: 1, duration: 280, useNativeDriver: true }),
    ]).start();
  };

  const closeMenu = (callback?: () => void) => {
    Animated.parallel([
      Animated.timing(iconAnim, { toValue: 0, duration: 220, useNativeDriver: true }),
      Animated.timing(menuAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start(() => {
      setIsMobileMenuOpen(false);
      callback?.();
    });
  };

  const toggleMenu = () => (isMobileMenuOpen ? closeMenu() : openMenu());

  const handleNavigation = (route: string) => {
    if (isMobileMenuOpen) {
      closeMenu(() => router.push(route as Href));
    } else {
      router.push(route as Href);
    }
  };

  const navItems = [
    { label: 'Diagram Library', route: '/(tabs)/home', icon: DiagramIcon },
    { label: 'Create Diagram', route: '/(tabs)/create', icon: CreateIcon },
    { label: 'Learning References', route: '/(tabs)/reference', icon: LearnIcon },
    { label: 'Account', route: '/(tabs)/userAccount', icon: UserAccountIcon },
  ];

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
              <View style={styles.navLinks}>
                {navItems.map((item) => {
                  const isActive = isRouteActive(pathname, item.route);
                  const Icon = item.icon;
                  return (
                    <Pressable
                      key={item.label}
                      onPress={() => handleNavigation(item.route)}
                      style={({ pressed }) => [
                        styles.navItem,
                        { height: navbarHeight },
                        pressed && styles.navItemPressed,
                      ]}
                    >
                      <View style={styles.navItemInner}>
                        <Icon active={isActive} />
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

            {/* Right side: Actions + Avatar */}
            <View style={styles.navRight}>
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
  // ─────────────────────────────────────────────
  return (
    <>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      {/* Top Bar */}
      <View style={[styles.mobileContainer, { height: navbarHeight }]}>
        <View style={[styles.mobileNav, { height: navbarHeight }]}>
          {/* Logo only on left side */}
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
            {actions}  {/* ← Save button appears here on mobile */}
            <Pressable 
              onPress={toggleMenu} 
              style={({ pressed }) => [
                styles.menuBtn,
                pressed && styles.menuBtnPressed,
              ]}
            >
              <Animated.View
                style={[
                  StyleSheet.absoluteFillObject,
                  styles.iconCenter,
                  {
                    opacity: iconAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [1, 0],
                    }),
                    transform: [{
                      rotate: iconAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: ['0deg', '-90deg'],
                      }),
                    }],
                  },
                ]}
              >
                <MenuIcon />
              </Animated.View>

              <Animated.View
                style={[
                  StyleSheet.absoluteFillObject,
                  styles.iconCenter,
                  {
                    opacity: iconAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, 1],
                    }),
                    transform: [{
                      rotate: iconAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: ['90deg', '0deg'],
                      }),
                    }],
                  },
                ]}
              >
                <CloseIcon />
              </Animated.View>
            </Pressable>
          </View>
        </View>
      </View>

      {/* Mobile Menu Dropdown */}
      {isMobileMenuOpen && (
        <>
          <Animated.View
            style={[styles.overlay, { top: navbarHeight, opacity: menuAnim }]}
            pointerEvents="auto"
          >
            <Pressable style={StyleSheet.absoluteFillObject} onPress={toggleMenu} />
          </Animated.View>

          <Animated.View
            style={[
              styles.mobileMenu,
              {
                top: navbarHeight,
                opacity: menuAnim,
                transform: [{
                  translateY: menuAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-8, 0],
                  }),
                }],
              },
            ]}
          >
            <ScrollView
              style={styles.mobileMenuItems}
              bounces={false}
              showsVerticalScrollIndicator={false}
            >
              {navItems.map((item) => {
                const isActive = isRouteActive(pathname, item.route);
                const Icon = item.icon;
                return (
                  <Pressable
                    key={item.label}
                    onPress={() => handleNavigation(item.route)}
                    style={({ pressed }) => [
                      styles.mobileNavItem,
                      isActive && styles.mobileNavItemActive,
                      pressed && styles.mobileNavItemPressed,
                    ]}
                  >
                    <Icon active={isActive} />
                    <Text style={[styles.mobileNavLabel, isActive && styles.mobileNavLabelActive]}>
                      {item.label}
                    </Text>
                  </Pressable>
                );
              })}
              
              {/* Email-based Avatar in Mobile Menu */}
              <View style={styles.mobileUserInfoSection}>
                <View style={styles.mobileUserInfoContainer}>
                  <Avatar fullName={fullName} email={userEmail} size={44} />
                  <View style={styles.mobileUserTextContainer}>
                    <Text style={styles.mobileFullName}>{getDisplayName(fullName, userEmail)}</Text>
                    {userEmail ? (
                      <Text style={styles.mobileUserEmail} numberOfLines={1}>
                        {userEmail}
                      </Text>
                    ) : null}
                  </View>
                </View>
              </View>
            </ScrollView>
          </Animated.View>
        </>
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

  // ── MOBILE + TABLET ───────────────────────────
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
    gap: 8,
  },
  menuBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  menuBtnPressed: {
    backgroundColor: '#f1f5f9',
  },
  iconCenter: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  overlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    zIndex: 100,
  },
  mobileMenu: {
    position: 'absolute',
    left: 0,
    right: 0,
    backgroundColor: '#ffffff',
    zIndex: 150,
    paddingBottom: 16,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  mobileMenuItems: {
    paddingHorizontal: 16,
    paddingTop: 4,
  },
  mobileNavItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  mobileNavItemActive: {
    backgroundColor: '#eff6ff',
  },
  mobileNavItemPressed: {
    backgroundColor: '#dbeafe',
  },
  mobileNavLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: '#475569',
  },
  mobileNavLabelActive: {
    color: '#2563eb',
    fontWeight: '600',
  },
  mobileUserInfoSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  mobileUserInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
  },
  mobileUserTextContainer: {
    flex: 1,
  },
  mobileFullName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 2,
  },
  mobileUserEmail: {
    fontSize: 13,
    color: '#64748b',
  },
});