// components/Navbar.tsx

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
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
// < 1024  → burger (phones + tablets)
// ≥ 1024  → full desktop nav
const DESKTOP_BREAKPOINT = 1024;

// ============ ICONS ============
const DiagramIcon = ({ active }: { active: boolean }) => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
    <Rect x="3" y="3" width="18" height="18" rx="3" stroke={active ? '#4c6fff' : '#64748b'} strokeWidth={1.8} fill={active ? '#eef2ff' : 'none'} />
    <Path d="M8 8h8M8 12h6M8 16h4" stroke={active ? '#4c6fff' : '#64748b'} strokeWidth={1.8} strokeLinecap="round" />
  </Svg>
);

const CreateIcon = ({ active }: { active: boolean }) => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
    <Path d="M4 20L8.5 19L19.5 8L16 4.5L5 15.5L4 20Z" stroke={active ? '#4c6fff' : '#64748b'} strokeWidth={1.8} fill={active ? '#eef2ff' : 'none'} strokeLinejoin="round" />
    <Path d="M14 6L18 10" stroke={active ? '#4c6fff' : '#64748b'} strokeWidth={1.8} strokeLinecap="round" />
  </Svg>
);

const LearnIcon = ({ active }: { active: boolean }) => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
    <Path d="M12 4L3 9L12 14L21 9L12 4Z" stroke={active ? '#4c6fff' : '#64748b'} strokeWidth={1.8} fill={active ? '#eef2ff' : 'none'} strokeLinejoin="round" />
    <Path d="M3 14L12 19L21 14" stroke={active ? '#4c6fff' : '#64748b'} strokeWidth={1.8} fill="none" />
  </Svg>
);

const UserAccountIcon = ({ active }: { active: boolean }) => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="8" r="4" stroke={active ? '#4c6fff' : '#64748b'} strokeWidth={1.8} fill="none" />
    <Path d="M20 21V19C20 16.8 18.2 15 16 15H8C5.8 15 4 16.8 4 19V21" stroke={active ? '#4c6fff' : '#64748b'} strokeWidth={1.8} strokeLinecap="round" fill="none" />
  </Svg>
);

const LogoutIcon = () => (
  <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
    <Path d="M9 21H5C3.9 21 3 20.1 3 19V5C3 3.9 3.9 3 5 3H9" stroke="#ef4444" strokeWidth={1.8} strokeLinecap="round" />
    <Path d="M16 17L21 12L16 7" stroke="#ef4444" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M21 12H9" stroke="#ef4444" strokeWidth={1.8} strokeLinecap="round" />
  </Svg>
);

const MenuIcon = () => (
  <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
    <Path d="M3 12H21M3 6H21M3 18H21" stroke="#1a1f36" strokeWidth={2} strokeLinecap="round" />
  </Svg>
);

const CloseIcon = () => (
  <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
    <Path d="M18 6L6 18M6 6L18 18" stroke="#1a1f36" strokeWidth={2} strokeLinecap="round" />
  </Svg>
);

// Chevron down icon for dropdown
const ChevronDownIcon = () => (
  <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
    <Path d="M6 9l6 6 6-6" stroke="#64748b" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

interface NavbarProps {
  fullName?: string;
  userEmail?: string;
  profilePicture?: string | null;
}

export default function Navbar({
  fullName = 'User',
  userEmail = '',
  profilePicture = null,
}: NavbarProps) {
  const router = useRouter();
  const pathname = usePathname();

  const [screenWidth, setScreenWidth] = useState(Dimensions.get('window').width);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const navbarHeight = 60;

  // true  → phones & tablets  (burger)
  // false → desktop            (full nav)
  const isBurger = screenWidth < DESKTOP_BREAKPOINT;

  // Burger ↔ X  (0 = burger, 1 = X)
  const iconAnim = useRef(new Animated.Value(0)).current;
  // Menu slide + fade  (0 = hidden, 1 = visible)
  const menuAnim = useRef(new Animated.Value(0)).current;
  // Dropdown animation
  const dropdownAnim = useRef(new Animated.Value(0)).current;

  // Re-check on every orientation / resize event
  useEffect(() => {
    const sub = Dimensions.addEventListener('change', ({ window }) => {
      setScreenWidth(window.width);
      // If we just jumped to desktop size, forcefully close the menu
      if (window.width >= DESKTOP_BREAKPOINT && isMobileMenuOpen) {
        forceCloseMenu();
      }
      // Close dropdown on resize
      if (isDropdownOpen) {
        closeDropdown();
      }
    });
    return () => sub.remove();
  }, [isMobileMenuOpen, isDropdownOpen]);

  // Close dropdown when clicking outside (web only)
  useEffect(() => {
    if (Platform.OS === 'web' && isDropdownOpen) {
      const handleClickOutside = (e: MouseEvent) => {
        const target = e.target as HTMLElement;
        if (!target.closest('.dropdown-container') && !target.closest('.dropdown-trigger')) {
          closeDropdown();
        }
      };
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [isDropdownOpen]);

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

  const openDropdown = () => {
    setIsDropdownOpen(true);
    Animated.spring(dropdownAnim, {
      toValue: 1,
      tension: 50,
      friction: 7,
      useNativeDriver: true,
    }).start();
  };

  const closeDropdown = () => {
    Animated.timing(dropdownAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setIsDropdownOpen(false);
    });
  };

  const toggleDropdown = () => {
    if (isDropdownOpen) {
      closeDropdown();
    } else {
      openDropdown();
    }
  };

  const handleNavigation = (route: string) => {
    if (isMobileMenuOpen) {
      closeMenu(() => router.push(route as Href));
    } else {
      router.push(route as Href);
    }
    // Close dropdown if open
    if (isDropdownOpen) {
      closeDropdown();
    }
  };

  const handleLogout = async () => {
    const { logout } = await import('../services/authService');
    if (isMobileMenuOpen) {
      closeMenu(async () => {
        await logout();
        router.replace('/(auth)/signin' as Href);
      });
    } else {
      await logout();
      router.replace('/(auth)/signin' as Href);
    }
    // Close dropdown if open
    if (isDropdownOpen) {
      closeDropdown();
    }
  };

  const navItems = [
    { label: 'Diagram Library',   route: '/(tabs)/home',        icon: DiagramIcon },
    { label: 'Create Diagram',    route: '/(tabs)/create',      icon: CreateIcon },
    { label: 'Learning Reference',route: '/(tabs)/reference',   icon: LearnIcon },
    { label: 'User Account',      route: '/(tabs)/userAccount', icon: UserAccountIcon },
  ];

  // Get initials for avatar
  const getInitials = () => {
    return fullName
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // ─────────────────────────────────────────────
  // DESKTOP  (≥ 1024 px)
  // ─────────────────────────────────────────────
  if (!isBurger) {
    const dropdownTranslateY = dropdownAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [-10, 0],
    });

    const dropdownOpacity = dropdownAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 1],
    });

    return (
      <>
        <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
        <View style={styles.desktopContainer}>
          <View style={styles.desktopNav}>
            <TouchableOpacity
              onPress={() => handleNavigation('/(tabs)/home')}
              style={styles.logoArea}
            >
              <Image source={require('../assets/images/logo.png')} style={styles.logoImage} />
              <Text style={styles.logoText}>iGraph IT</Text>
            </TouchableOpacity>

            <View style={styles.navLinks}>
              {navItems.map((item) => {
                const isActive = pathname === item.route;
                const Icon = item.icon;
                return (
                  <TouchableOpacity
                    key={item.label}
                    style={[styles.navItem, isActive && styles.navItemActive]}
                    onPress={() => handleNavigation(item.route)}
                  >
                    <Icon active={isActive} />
                    <Text style={[styles.navLabel, isActive && styles.navLabelActive]}>
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Profile Dropdown - replaces sign out button */}
            <View style={styles.dropdownContainer}>
              <TouchableOpacity
                style={styles.profileTrigger}
                onPress={toggleDropdown}
                activeOpacity={0.7}
              >
                {profilePicture ? (
                  <Image source={{ uri: profilePicture }} style={styles.avatarImage} />
                ) : (
                  <View style={styles.avatarPlaceholder}>
                    <Text style={styles.avatarInitials}>{getInitials()}</Text>
                  </View>
                )}
                <ChevronDownIcon />
              </TouchableOpacity>

              {isDropdownOpen && (
                <Animated.View
                  style={[
                    styles.dropdownMenu,
                    {
                      opacity: dropdownOpacity,
                      transform: [{ translateY: dropdownTranslateY }],
                    },
                  ]}
                >
                  <View style={styles.dropdownHeader}>
                    {profilePicture ? (
                      <Image source={{ uri: profilePicture }} style={styles.dropdownAvatar} />
                    ) : (
                      <View style={styles.dropdownAvatarPlaceholder}>
                        <Text style={styles.dropdownAvatarInitials}>{getInitials()}</Text>
                      </View>
                    )}
                    <View style={styles.dropdownUserInfo}>
                      <Text style={styles.dropdownUserName} numberOfLines={1}>
                        {fullName}
                      </Text>
                      <Text style={styles.dropdownUserEmail} numberOfLines={1}>
                        {userEmail}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.dropdownDivider} />
                  <TouchableOpacity
                    style={styles.dropdownLogoutBtn}
                    onPress={handleLogout}
                  >
                    <LogoutIcon />
                    <Text style={styles.dropdownLogoutText}>Sign Out</Text>
                  </TouchableOpacity>
                </Animated.View>
              )}
            </View>
          </View>
        </View>
      </>
    );
  }

  // ─────────────────────────────────────────────
  // MOBILE + TABLET  (< 1024 px)  — burger menu
  // ─────────────────────────────────────────────
  return (
    <>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      {/* ── Top bar — always visible, never moves ── */}
      <View style={styles.mobileContainer}>
        <View style={styles.mobileNav}>
          {/* Logo */}
          <TouchableOpacity
            onPress={() => handleNavigation('/(tabs)/home')}
            style={styles.logoArea}
          >
            <Image source={require('../assets/images/logo.png')} style={styles.mobileLogoImage} />
            <Text style={styles.logoText}>iGraph IT</Text>
          </TouchableOpacity>

          {/* Animated burger / X */}
          <TouchableOpacity onPress={toggleMenu} style={styles.menuBtn}>
            {/* Burger — rotates & fades out */}
            <Animated.View
              style={[
                StyleSheet.absoluteFillObject,
                {
                  alignItems: 'center',
                  justifyContent: 'center',
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

            {/* X — rotates & fades in */}
            <Animated.View
              style={[
                StyleSheet.absoluteFillObject,
                {
                  alignItems: 'center',
                  justifyContent: 'center',
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
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Dropdown — appears directly below the top bar ── */}
      {isMobileMenuOpen && (
        <>
          {/* Dim overlay */}
          <Animated.View
            style={[styles.overlay, { top: navbarHeight, opacity: menuAnim }]}
            pointerEvents="auto"
          >
            <TouchableOpacity style={StyleSheet.absoluteFillObject} onPress={toggleMenu} />
          </Animated.View>

          {/* Menu panel */}
          <Animated.View
            style={[
              styles.mobileMenu,
              {
                top: navbarHeight,
                opacity: menuAnim,
                transform: [{
                  translateY: menuAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-12, 0],
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
                const isActive = pathname === item.route;
                const Icon = item.icon;
                return (
                  <TouchableOpacity
                    key={item.label}
                    style={[styles.mobileNavItem, isActive && styles.mobileNavItemActive]}
                    onPress={() => handleNavigation(item.route)}
                  >
                    <Icon active={isActive} />
                    <Text style={[styles.mobileNavLabel, isActive && styles.mobileNavLabelActive]}>
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}

              <View style={styles.divider} />

              {/* User Info Section in Mobile Menu */}
              <View style={styles.mobileUserInfo}>
                {profilePicture ? (
                  <Image source={{ uri: profilePicture }} style={styles.mobileAvatar} />
                ) : (
                  <View style={styles.mobileAvatarPlaceholder}>
                    <Text style={styles.mobileAvatarInitials}>{getInitials()}</Text>
                  </View>
                )}
                <View style={styles.mobileUserText}>
                  <Text style={styles.mobileUserName} numberOfLines={1}>
                    {fullName}
                  </Text>
                  <Text style={styles.mobileUserEmail} numberOfLines={1}>
                    {userEmail}
                  </Text>
                </View>
              </View>

              <TouchableOpacity style={styles.mobileLogoutBtn} onPress={handleLogout}>
                <LogoutIcon />
                <Text style={styles.mobileLogoutText}>Sign Out</Text>
              </TouchableOpacity>
            </ScrollView>
          </Animated.View>
        </>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  // ── DESKTOP ──────────────────────────────────
  desktopContainer: {
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#eef2ff',
    paddingHorizontal: 32,
    paddingVertical: 12,
    zIndex: 100,
  },
  desktopNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    maxWidth: 1200,
    alignSelf: 'center',
    width: '100%',
  },
  logoArea: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logoImage: {
    width: 36,
    height: 36,
    borderRadius: 8,
  },
  logoText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1f36',
  },
  navLinks: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  navItemActive: {
    backgroundColor: '#eef2ff',
  },
  navLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748b',
  },
  navLabelActive: {
    color: '#4c6fff',
    fontWeight: '600',
  },

  // ── Profile Dropdown (Desktop) ──────────────────
  dropdownContainer: {
    position: 'relative',
  },
  profileTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 40,
    backgroundColor: '#f8faff',
    borderWidth: 1,
    borderColor: '#eef2ff',
  },
  avatarImage: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  avatarPlaceholder: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#4c6fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  dropdownMenu: {
    position: 'absolute',
    top: 52,
    right: 0,
    width: 260,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#eef2ff',
    zIndex: 1000,
  },
  dropdownHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
  },
  dropdownAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  dropdownAvatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#4c6fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dropdownAvatarInitials: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
  },
  dropdownUserInfo: {
    flex: 1,
  },
  dropdownUserName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1f36',
    marginBottom: 2,
  },
  dropdownUserEmail: {
    fontSize: 12,
    color: '#8896b3',
  },
  dropdownDivider: {
    height: 1,
    backgroundColor: '#eef2ff',
  },
  dropdownLogoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 8,
    margin: 8,
    marginTop: 4,
  },
  dropdownLogoutText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#ef4444',
  },

  // ── MOBILE + TABLET ───────────────────────────
  mobileContainer: {
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#eef2ff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    zIndex: 200,
  },
  mobileNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  mobileLogoImage: {
    width: 36,
    height: 36,
    borderRadius: 8,
  },
  menuBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  overlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.45)',
    zIndex: 100,
  },
  mobileMenu: {
    position: 'absolute',
    left: 0,
    right: 0,
    backgroundColor: '#ffffff',
    zIndex: 150,
    paddingBottom: 24,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  mobileMenuItems: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  mobileNavItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 16,
  },
  mobileNavItemActive: {
    backgroundColor: '#eef2ff',
    borderRadius: 8,
    paddingHorizontal: 12,
    marginHorizontal: -12,
  },
  mobileNavLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: '#64748b',
  },
  mobileNavLabelActive: {
    color: '#4c6fff',
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: '#eef2ff',
    marginVertical: 12,
  },
  // Mobile User Info
  mobileUserInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    marginBottom: 8,
  },
  mobileAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  mobileAvatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#4c6fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mobileAvatarInitials: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
  },
  mobileUserText: {
    flex: 1,
  },
  mobileUserName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1f36',
    marginBottom: 2,
  },
  mobileUserEmail: {
    fontSize: 12,
    color: '#8896b3',
  },
  mobileLogoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
  },
  mobileLogoutText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#ef4444',
  },
});