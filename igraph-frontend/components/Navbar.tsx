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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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

// (tabs)/_layout.tsx renders exactly one <Navbar> in its own JSX — but under
// certain repeated-navigation patterns (Saved Diagrams/Account/Create round
// trips stacking duplicate top bars; the bottom dock rendering garbled after
// closing and reopening the installed PWA) the router still ends up with
// more than one instance of the persistently-anchored (tabs) group mounted
// at once (see unstable_settings.anchor in app/_layout.tsx) — each with its
// own Navbar. Rather than depend on nailing the exact router-level trigger,
// this registry makes the visible symptom structurally impossible: every
// Navbar instance announces itself here on mount, which tells any
// *previously* mounted instance it's no longer the latest one — see
// isStaleInstance below. Only the most-recently-mounted instance ever
// renders anything; every earlier one renders null instead of leaving two
// top bars, or two absolutely-positioned bottom docks fighting over the
// same screen space.
const staleNotifiers = new Set<() => void>();

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
  const insets = useSafeAreaInsets();

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

  // Same class of stale-repaint bug as create.tsx's own visibilitychange
  // handler (see its comment) — an installed PWA resuming from the
  // background can leave these floating, elevation/shadow-composited mobile
  // bars painted incorrectly: reported as the bottom dock showing only the
  // raised Create FAB, with the pill background and the other three tabs
  // missing until something forces a real repaint.
  //
  // This used to force a repaint by bumping a `key` on each bar, so React
  // would unmount and remount them fresh. That turned out to be the wrong
  // tool for the job and is exactly what caused a *different*, worse bug:
  // on this app's React/react-native-web combination, a keyed remount of
  // these particular Views didn't reliably tear down the old DOM node
  // before the new one painted, leaving both alive at once — the actual
  // cause of the duplicated top bar and garbled bottom dock reported after
  // that fix shipped (confirmed by removing the two `key` props, which
  // eliminated the duplication outright). Nudging the existing DOM node's
  // own transform via refs forces the browser to recompute that element's
  // compositing layer without ever touching React's tree, so there's no
  // window where an old and new copy could coexist.
  //
  // Four triggers, because "closed then reopened" covers more than one
  // real scenario and each needs its own signal:
  //  - Backgrounded, not killed (switched app, came back): visibilitychange
  //    fires reliably for this.
  //  - Backgrounded, restored from the bfcache (some Android/Chrome resume
  //    paths): visibilitychange can miss this; pageshow's persisted flag is
  //    the one built specifically to catch it.
  //  - Actually closed (swiped away in the app switcher, killing the
  //    process) and reopened: this is a genuine cold launch, not a resume —
  //    neither event above ever fires, since there's no surviving page to
  //    fire them on. What's actually going on then is Android's own system
  //    UI (status/nav bar) still settling into place right after a fresh
  //    launch, which can leave the very first layout pass measuring the
  //    wrong viewport before it settles a moment later.
  //  - The settle from the case above finishing *after* a fixed-delay nudge
  //    already fired: a single setTimeout was a guess at how long Android
  //    takes to settle its system UI, and guessing wrong left the corrupted
  //    paint uncaught until the next visibilitychange (i.e. the user had to
  //    background/resume once more). The system UI settling is itself what
  //    fires a real `resize` (visualViewport is the reliable one for mobile
  //    browser-chrome changes) once it's done, so listening for that catches
  //    the moment layout actually stabilizes instead of guessing a delay.
  const mobileTopBarRef = useRef<any>(null);
  const mobileBottomDockRef = useRef<any>(null);
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;
    const nudgeRepaint = () => {
      [mobileTopBarRef.current, mobileBottomDockRef.current].forEach((node) => {
        if (!node || !node.style) return;
        node.style.transform = 'translateZ(0)';
        void node.offsetHeight; // forces a synchronous layout read
        node.style.transform = '';
      });
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') nudgeRepaint();
    };
    const onPageShow = (e: PageTransitionEvent) => {
      if (e.persisted) nudgeRepaint();
    };
    const onViewportResize = () => nudgeRepaint();

    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('pageshow', onPageShow);

    // visualViewport reports mobile browser-chrome (status/nav bar) size
    // changes more reliably than window's own resize event; fall back to
    // window if it's unavailable.
    const viewport = (window as any).visualViewport as VisualViewport | undefined;
    viewport?.addEventListener('resize', onViewportResize);
    window.addEventListener('resize', onViewportResize);

    // Cheap early nudges for the common case where system UI was already
    // settled before mount, so there's nothing left to resize into.
    const earlyNudge1 = setTimeout(nudgeRepaint, 300);
    const earlyNudge2 = setTimeout(nudgeRepaint, 1000);

    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('pageshow', onPageShow);
      viewport?.removeEventListener('resize', onViewportResize);
      window.removeEventListener('resize', onViewportResize);
      clearTimeout(earlyNudge1);
      clearTimeout(earlyNudge2);
    };
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

  // ─── Desktop nav: same sliding-pill effect as the mobile dock above, not
  // just the same idea reimplemented — same spring/opacity choreography,
  // adapted for items whose widths genuinely differ ("Learning References"
  // vs "Account"), unlike the bottom dock's fixed-width side tabs. That
  // means position AND width both need to animate, so this can't ride
  // useNativeDriver (native transforms can't touch layout width) the way
  // the bottom dock's translateX-only indicator does — still smooth for a
  // top bar with 4 static-width labels, not a high-frequency gesture.
  const desktopIndicatorX = useRef(new Animated.Value(0)).current;
  const desktopIndicatorWidth = useRef(new Animated.Value(0)).current;
  const desktopIndicatorOpacity = useRef(new Animated.Value(0)).current;
  const [desktopItemLayouts, setDesktopItemLayouts] = useState<Record<string, { x: number; width: number }>>({});

  const activeDesktopIndex = navItems.findIndex((item) => isRouteActive(pathname, item.route));
  const activeDesktopLayout = activeDesktopIndex !== -1 ? desktopItemLayouts[navItems[activeDesktopIndex].label] : undefined;

  useEffect(() => {
    if (!activeDesktopLayout) {
      Animated.timing(desktopIndicatorOpacity, { toValue: 0, duration: 150, useNativeDriver: false }).start();
      return;
    }
    Animated.parallel([
      Animated.spring(desktopIndicatorX, {
        toValue: activeDesktopLayout.x,
        useNativeDriver: false,
        friction: 8,
        tension: 65,
      }),
      Animated.spring(desktopIndicatorWidth, {
        toValue: activeDesktopLayout.width,
        useNativeDriver: false,
        friction: 8,
        tension: 65,
      }),
      Animated.timing(desktopIndicatorOpacity, { toValue: 1, duration: 150, useNativeDriver: false }),
    ]).start();
  }, [activeDesktopLayout?.x, activeDesktopLayout?.width]);

  // See staleNotifiers' own comment above. Every mount claims "latest" for
  // itself and tells whichever instance held that title before to stand
  // down; every unmount removes this instance from the registry so it can't
  // wrongly mark a genuinely-new instance stale later.
  const [isStaleInstance, setIsStaleInstance] = useState(false);
  useEffect(() => {
    staleNotifiers.forEach((markStale) => markStale());
    const markThisStale = () => setIsStaleInstance(true);
    staleNotifiers.add(markThisStale);
    return () => {
      staleNotifiers.delete(markThisStale);
    };
  }, []);

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

  // A newer Navbar instance has taken over — see staleNotifiers' own
  // comment. Covers both branches below in one place.
  if (isStaleInstance) return null;

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
                {/* Sliding active-tab pill — same glide/fade choreography as
                    the mobile dock's indicator (see its own comment above),
                    sized and positioned from each item's own measured
                    navItemInner bounds since these labels aren't equal-width. */}
                {activeDesktopLayout && (
                  <Animated.View
                    pointerEvents="none"
                    style={[
                      styles.desktopSlidingIndicator,
                      {
                        left: desktopIndicatorX,
                        width: desktopIndicatorWidth,
                        opacity: desktopIndicatorOpacity,
                      },
                    ]}
                  />
                )}

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
                      // onLayout here, not on navItemInner — layout x/width are
                      // relative to the DIRECT parent. navItem is navLinks'
                      // direct child (the same coordinate space the indicator
                      // is positioned in); navItemInner is nested one level
                      // deeper, so its own onLayout only ever reported its
                      // small, near-constant offset *within* navItem — the
                      // same tiny value for every tab — which is why the
                      // indicator looked stuck in one place no matter which
                      // tab was actually active. The 8px inset mirrors the
                      // original static underline's own left:8/right:8.
                      onLayout={(e) => {
                        const { x, width } = e.nativeEvent.layout;
                        setDesktopItemLayouts((prev) => ({ ...prev, [item.label]: { x: x + 8, width: width - 16 } }));
                      }}
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
        <View ref={mobileTopBarRef} style={[styles.mobileContainer, { height: navbarHeight }]}>
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
      <View ref={mobileBottomDockRef} style={styles.bottomNavWrapper}>
        <View
          nativeID="tour-navbar-mobile-dock"
          style={[
            styles.bottomNavCard,
            // Real device inset (home indicator / 3-button nav bar height)
            // instead of the old hardcoded per-platform guess, which was
            // nowhere near tall enough to clear a real Android nav bar —
            // see this file's viewport-fit=cover comment in app/+html.tsx
            // for why insets.bottom couldn't report anything useful before.
            { paddingBottom: insets.bottom + (Platform.OS === 'ios' ? 8 : 14) },
          ]}
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
  // Same underline this replaced (bottom: 0, height: 3) — the ask was just
  // the mobile dock's glide/fade animation applied to it, not a new pill
  // background; the desktop active-tab look itself stays exactly as it was.
  desktopSlidingIndicator: {
    position: 'absolute',
    bottom: 0,
    height: 3,
    borderRadius: 2,
    backgroundColor: '#2563eb',
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
    // paddingBottom is applied inline where this style is used — it needs
    // useSafeAreaInsets()'s runtime value, not available in a static
    // StyleSheet object.
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