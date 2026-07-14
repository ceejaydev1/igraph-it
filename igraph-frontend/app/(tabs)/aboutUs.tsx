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
import { Svg, Path } from 'react-native-svg';

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
      <View style={[styles.memberAvatarRing, { borderColor: `${accentColor}30` }]}>
        <View style={[styles.memberAvatar, { borderColor: accentColor }]}>
          {imageUrl ? (
            <Image
              source={{ uri: imageUrl }}
              style={styles.memberImage}
              resizeMode="cover"
            />
          ) : (
            <View style={[styles.memberAvatarPlaceholder, { backgroundColor: `${accentColor}15` }]}>
              <View style={[styles.memberAvatarInner, { backgroundColor: accentColor }]}>
                <Text style={styles.memberInitials}>
                  {name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                </Text>
              </View>
            </View>
          )}
        </View>
      </View>
      <Text style={styles.memberName}>{name}</Text>
      <Text style={styles.memberRole}>{role}</Text>
    </View>
  );
};

// ABOUT CONTENT

const AboutContent = () => (
  <View style={styles.tabContent}>
    <Text style={styles.aboutText}>
      iGraph IT is a learning platform built for students who want to get better at creating
      SDLC and UML diagrams. Instead of just reading about diagrams in a textbook, you can
      actually practice making them — flowcharts, use case diagrams, class diagrams, and more —
      all in one place. It's basically a hands-on way to understand how systems and software
      projects come together, step by step.
    </Text>
    <Text style={styles.aboutTextSecondary}>
      We made this because diagramming can feel confusing at first, especially when you're just
      starting out. iGraph IT breaks it down and lets you learn by doing, so by the time you need
      these skills for school projects.
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

  const handleBackPress = () => {
    try {
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace('/(tabs)/userAccount');
      }
    } catch (error) {
      router.replace('/(tabs)/userAccount');
    }
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
          { paddingBottom: isMobile ? SPACING.xxl : SPACING.xxxl },
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
  aboutText: {
    fontSize: 17,
    color: COLORS.textSecondary,
    lineHeight: 26,
    marginBottom: SPACING.lg,
    fontWeight: '400',
    textAlign: 'center',
  },
  aboutTextSecondary: {
    fontSize: 17,
    color: COLORS.textSecondary,
    lineHeight: 26,
    textAlign: 'center',
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
  memberAvatarRing: {
    width: 130,
    height: 130,
    borderRadius: 65,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  memberAvatar: {
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 3,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
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
    borderRadius: 55,
  },
  memberAvatarPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  memberAvatarInner: {
    width: 90,
    height: 90,
    borderRadius: 45,
    justifyContent: 'center',
    alignItems: 'center',
  },
  memberInitials: {
    fontSize: 32,
    fontWeight: '700',
    color: COLORS.surface,
    letterSpacing: -0.5,
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