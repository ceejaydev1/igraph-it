import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  useWindowDimensions,
  Platform,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Svg, Path, Circle } from 'react-native-svg';

// COLORS

const COLORS = {
  primary: '#4c6fff',
  primaryLight: '#eef2ff',
  primaryDark: '#3b4fcc',
  surface: '#FFFFFF',
  background: '#f8faff',
  textPrimary: '#1E293B',
  textSecondary: '#475569',
  textTertiary: '#94A3B8',
  border: '#E8ECF1',
  borderLight: '#F1F5F9',
  shadow: '#0F172A',
  success: '#10b981',
  white: '#ffffff',
};

const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

const RADIUS = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  full: 999,
};

// Readable-width cap for the content pane on wide screens — same value used
// in privacy.tsx so both screens feel consistent.
const CONTENT_MAX_WIDTH = 720;

// The bottom navbar (Navbar.tsx's bottomNavCard) is a docked, absolutely-
// positioned overlay, not part of normal document flow — this screen's own
// ScrollView has no idea it's there and needs to reserve this much space
// itself or the last row of content ends up underneath it. Same value/
// pattern as userAccount.tsx's TAB_BAR_ALLOWANCE.
const TAB_BAR_ALLOWANCE = 90;

// ICONS

const BackIcon = () => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
    <Path
      d="M15 18l-6-6 6-6"
      stroke={COLORS.textPrimary}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

// A small chain of connected nodes — the same visual language the app uses
// for its own diagrams — as a quiet visual anchor above the origin-story
// text, instead of it opening straight into a wall of plain paragraphs.
const AboutAccent = () => (
  <Svg width={72} height={24} viewBox="0 0 72 24" style={styles.aboutAccent}>
    <Path d="M8 12 H64" stroke={COLORS.primary} strokeWidth={1.5} opacity={0.35} />
    <Circle cx={8} cy={12} r={4} fill={COLORS.primary} opacity={0.85} />
    <Circle cx={36} cy={12} r={5} fill={COLORS.primary} />
    <Circle cx={64} cy={12} r={4} fill={COLORS.primary} opacity={0.85} />
  </Svg>
);

// A flowchart decision-diamond divider between the two paragraphs — draws
// on the same SDLC/UML shape vocabulary this app is actually about, instead
// of a generic tinted-box-with-colored-border "AI blockquote" treatment.
const AboutDivider = () => (
  <Svg width={56} height={16} viewBox="0 0 56 16" style={styles.aboutDivider}>
    <Path d="M2 8 H21" stroke={COLORS.border} strokeWidth={1.2} strokeDasharray="3 3" />
    <Path d="M35 8 H54" stroke={COLORS.border} strokeWidth={1.2} strokeDasharray="3 3" />
    <Path d="M28 1.5 L34.5 8 L28 14.5 L21.5 8 Z" stroke={COLORS.primary} strokeWidth={1.4} fill={COLORS.primaryLight} />
  </Svg>
);

// Generic "no profile photo" placeholder — same head-and-shoulders
// silhouette-on-flat-gray look Facebook (and most social apps) fall back to
// when an account has no photo, rather than this app inventing its own.
const PersonSilhouetteIcon = () => (
  <Svg width={40} height={40} viewBox="0 0 24 24" fill="none">
    <Circle cx={12} cy={8.5} r={4} fill="#bec3c9" />
    <Path d="M4 20.5c0-4.5 3.6-7 8-7s8 2.5 8 7" fill="#bec3c9" />
  </Svg>
);

// MEMBER CARD COMPONENT

const MemberCard = ({
  name,
  role,
  index,
  imageUrl,
}: {
  name: string;
  role: string;
  index: number;
  imageUrl?: string;
}) => {
  const getAccentColor = () => {
    const colors = [
      COLORS.primary,
      '#7C5CFC',
      '#6366F1',
      '#8B5CF6',
      '#4F46E5',
    ];
    return colors[index % colors.length];
  };

  const accentColor = getAccentColor();

  return (
    <View style={styles.memberCard}>
      <View style={[styles.memberAvatar, { borderColor: accentColor }]}>
        {imageUrl ? (
          <Image
            source={{ uri: imageUrl }}
            style={styles.memberImage}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.memberAvatarPlaceholder}>
            <PersonSilhouetteIcon />
          </View>
        )}
      </View>
      <Text style={styles.memberName}>{name}</Text>
      <Text style={styles.memberRole}>{role}</Text>
    </View>
  );
};

// ABOUT CONTENT

const AboutContent = () => (
  <View style={styles.tabContent}>
    <AboutAccent />
    <Text style={styles.aboutText}>
      iGraph IT began as a school project built by a small team who wanted to get better at
      drawing SDLC and UML diagrams. It lets you build flowcharts, use case diagrams, class
      diagrams, and more in one place, without switching between separate tools to finish a
      single diagram.
    </Text>
    <AboutDivider />
    <Text style={styles.aboutTextSecondary}>
      Diagramming was the part of our own coursework that never fully made sense from a
      textbook. It only clicked once we sat down and started drawing things out for ourselves.
      That is the idea behind this app: practice it enough here, and it becomes second nature by
      the time you actually need it for a real project.
    </Text>
  </View>
);

// TEAM CONTENT

const TeamContent = () => {
  const members = [
    { name: 'Ceejay Estabillo', role: 'Programmer' },
    { name: 'Jhocel Nicole Caintic', role: 'Project Manager' },
    { name: 'Jhanine Faith Samatra', role: 'UI/UX Designer' },
    { name: 'Joe Marc Samson', role: 'Database Designer' },
    { name: 'Francis Marquina', role: 'QA Tester' },
  ];

  return (
    <View style={styles.tabContent}>
      <View style={styles.teamRowTop}>
        {members.slice(0, 3).map((member, index) => (
          <MemberCard
            key={member.name}
            name={member.name}
            role={member.role}
            index={index}
          />
        ))}
      </View>

      <View style={styles.teamRowBottom}>
        {members.slice(3, 5).map((member, index) => (
          <MemberCard
            key={member.name}
            name={member.name}
            role={member.role}
            index={index + 3}
          />
        ))}
      </View>
    </View>
  );
};

// MAIN COMPONENT

export default function AboutUs() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const scrollViewRef = useRef<ScrollView>(null);

  const [activeTab, setActiveTab] = useState<'about' | 'team'>('about');
  const [showScrollTop, setShowScrollTop] = useState(false);

  const isDesktop = width >= 1024;
  const isMobile = width < 768;

  const handleTabSwitch = (tab: 'about' | 'team') => {
    setActiveTab(tab);
    setShowScrollTop(false);
    scrollViewRef.current?.scrollTo({ y: 0, animated: false });
  };

  const handleScroll = (event: any) => {
    const { contentOffset } = event.nativeEvent;
    setShowScrollTop(contentOffset.y > 300);
  };

  const scrollToTop = () => {
    scrollViewRef.current?.scrollTo({ y: 0, animated: true });
  };

  // Always back to Account, regardless of actual navigation history — this
  // screen is only ever reached from there (see userAccount.tsx's "About
  // Us" action), but router.back() follows whatever the real previous
  // route was, which isn't always Account (e.g. arriving via the tab bar),
  // and would land back on Home instead.
  //
  // navigate, not replace: replace still mounts a brand-new instance of the
  // persistently-anchored (tabs) group on top of the existing one instead of
  // resurfacing the existing Account screen already sitting there — see
  // savedDiagrams.tsx's handleBackPress for the full explanation (same fix).
  const handleBackPress = () => {
    router.navigate('/(tabs)/userAccount');
  };

  return (
    <View style={styles.container}>
      {/* Header — flat, full-width */}
      <View style={[styles.header, { paddingTop: insets.top + SPACING.sm }]}>
        <TouchableOpacity
          onPress={handleBackPress}
          style={styles.backButton}
          activeOpacity={0.6}
        >
          <BackIcon />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>About Us</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Tab Bar - flat, full-width (same style as Privacy) */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'about' && styles.activeTab]}
          onPress={() => handleTabSwitch('about')}
        >
          <Text style={[styles.tabText, activeTab === 'about' && styles.activeTabText]}>
            About
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'team' && styles.activeTab]}
          onPress={() => handleTabSwitch('team')}
        >
          <Text style={[styles.tabText, activeTab === 'team' && styles.activeTabText]}>
            Team
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content — capped + centered on wide screens, same pattern as privacy.tsx */}
      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        contentContainerStyle={[
          styles.scrollContentOuter,
          { paddingBottom: insets.bottom + (isMobile ? TAB_BAR_ALLOWANCE : SPACING.xxxl) },
        ]}
      >
        <View style={[styles.scrollContentInner, isDesktop && { maxWidth: CONTENT_MAX_WIDTH }]}>
          {activeTab === 'about' ? <AboutContent /> : <TeamContent />}
        </View>
      </ScrollView>

      {/* Scroll to Top Button — outer wrapper centers its child, inner box
          carries the maxWidth and right-aligns the button within it. Same
          fix as privacy.tsx: avoids fighting absolute left/right insets
          against a maxWidth. */}
      {showScrollTop && (
        <View pointerEvents="box-none" style={styles.scrollTopOuter}>
          <View
            pointerEvents="box-none"
            style={[styles.scrollTopInner, isDesktop && { maxWidth: CONTENT_MAX_WIDTH }]}
          >
            <TouchableOpacity style={styles.scrollTopButton} onPress={scrollToTop} activeOpacity={0.85}>
              <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
                <Path d="M12 19V5M5 12l7-7 7 7" stroke="#ffffff" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
              </Svg>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

// STYLES

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.xl,
    paddingBottom: SPACING.sm,
    backgroundColor: COLORS.background,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    ...Platform.select({
      ios: {
        shadowColor: COLORS.shadow,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
    letterSpacing: -0.3,
  },
  headerSpacer: {
    width: 36,
  },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.xl,
  },
  tab: {
    flex: 1,
    paddingVertical: SPACING.lg,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: COLORS.primary,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textTertiary,
  },
  activeTabText: {
    color: COLORS.primary,
  },

  scrollView: {
    flex: 1,
  },

  // Scroll Content
  scrollContentOuter: {
    flexGrow: 1,
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.lg,
  },
  scrollContentInner: {
    width: '100%',
  },

  tabContent: {
    paddingVertical: SPACING.sm,
  },
  aboutAccent: {
    alignSelf: 'center',
    marginBottom: SPACING.lg,
  },
  aboutText: {
    fontSize: 17,
    color: COLORS.textPrimary,
    lineHeight: 26,
    marginBottom: SPACING.xxl,
    fontWeight: '400',
    textAlign: 'center',
  },
  aboutDivider: {
    alignSelf: 'center',
    marginBottom: SPACING.xxl,
  },
  // The reflective "why we built this" paragraph reads differently from the
  // factual lead above it — italic and a touch muted, set off by the
  // decision-diamond divider above rather than a boxed/bordered treatment.
  aboutTextSecondary: {
    fontSize: 16,
    color: COLORS.textSecondary,
    lineHeight: 25,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  teamRowTop: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: SPACING.lg,
    marginBottom: SPACING.xxxl,
    flexWrap: 'wrap',
  },
  teamRowBottom: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: SPACING.xxxl,
    paddingHorizontal: SPACING.xxxl,
  },
  memberCard: {
    alignItems: 'center',
    width: 160,
  },
  memberAvatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 2,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.lg,
    ...Platform.select({
      ios: {
        shadowColor: COLORS.shadow,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  memberImage: {
    width: '100%',
    height: '100%',
  },
  memberAvatarPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#e4e6eb',
    justifyContent: 'center',
    alignItems: 'center',
  },
  memberName: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: SPACING.xs,
  },
  memberRole: {
    fontSize: 12,
    color: COLORS.textTertiary,
    textAlign: 'center',
    fontWeight: '500',
  },

  // Scroll to Top Button
  scrollTopOuter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingBottom: SPACING.xxxl,
  },
  scrollTopInner: {
    width: '100%',
    alignItems: 'flex-end',
    paddingHorizontal: SPACING.xl,
  },
  scrollTopButton: {
    backgroundColor: COLORS.primary,
    width: 48,
    height: 48,
    borderRadius: RADIUS.full,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
    zIndex: 10,
  },
});