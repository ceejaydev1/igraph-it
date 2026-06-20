// igraph-frontend/app/(tabs)/aboutUs.tsx

import React from 'react';
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

// ============================================================================
// COLORS - Refined palette with subtle gradients
// ============================================================================

const COLORS = {
  primary: '#5B6AF0',
  primaryDark: '#4A56D4',
  primaryLight: '#EEF0FF',
  secondary: '#7C5CFC',
  accent: '#F0F4FF',
  success: '#10B981',
  surface: '#FFFFFF',
  surfaceSecondary: '#F8FAFC',
  background: '#FBFCFE',
  textPrimary: '#1E293B',
  textSecondary: '#475569',
  textTertiary: '#94A3B8',
  border: '#E8ECF1',
  borderLight: '#F1F5F9',
  shadow: '#0F172A',
};

const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  xxxxl: 48,
  xxxxxl: 64,
};

const RADIUS = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  full: 999,
};

// ============================================================================
// ICONS
// ============================================================================

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

// ============================================================================
// MEMBER CARD COMPONENT
// ============================================================================

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
      COLORS.secondary,
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

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function AboutUs() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  const isDesktop = width >= 1024;
  const isTablet = width >= 768 && width < 1024;
  const isMobile = !isDesktop && !isTablet;

  // Calculate bottom tab bar height (typically 50-90px depending on platform)
  const TAB_BAR_HEIGHT = Platform.OS === 'ios' ? 85 : 65;

  const members = [
    { name: 'Ceejay Estabillo', role: 'Programmer', imageUrl: 'https://via.placeholder.com/200' },
    { name: 'Jhocel Nicole Caintic', role: 'Project Manager', imageUrl: 'https://via.placeholder.com/200' },
    { name: 'Jhanine Faith Samatra', role: 'UI/UX Designer', imageUrl: 'https://via.placeholder.com/200' },
    { name: 'Joe Marc Samson', role: 'Database Designer', imageUrl: 'https://via.placeholder.com/200' },
    { name: 'Francis Marquina', role: 'QA Tester', imageUrl: 'https://via.placeholder.com/200' },
  ];

  // Handle back navigation with fallback
  const handleBackPress = () => {
    try {
      if (router.canGoBack()) {
        router.back();
      } else {
        // Fallback to home screen
        router.replace('/(tabs)/userAccount');
      }
    } catch (error) {
      // If all else fails, navigate to home
      router.replace('/(tabs)');
    }
  };

  return (
    <View style={styles.container}>
      {/* Background Pattern */}
      <View style={[styles.bgCircle, styles.bgCircle1]} />
      <View style={[styles.bgCircle, styles.bgCircle2]} />

      {/* Header */}
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

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          isMobile && styles.scrollContentMobile,
          // Add bottom padding to account for tab bar
          { paddingBottom: isMobile ? SPACING.xxxxl + TAB_BAR_HEIGHT : SPACING.xxxxl },
        ]}
        contentInsetAdjustmentBehavior="automatic"
        bounces={false}
      >
        {/* Content Section */}
        <View style={[
          styles.contentSection,
          isDesktop && styles.contentSectionDesktop,
          isMobile && styles.contentSectionMobile,
        ]}>
          {/* Left Column - About */}
          <View style={[styles.aboutColumn, isDesktop && styles.aboutColumnDesktop]}>
            {/* Centered Section Title */}
            <View style={styles.sectionHeaderCentered}>
              <Text style={styles.sectionTitleCentered}>About the System</Text>
              <View style={styles.sectionTitleUnderline} />
            </View>

            {/* Text without card background */}
            <View style={[
              styles.aboutContent,
              isMobile && styles.aboutContentMobile,
            ]}>
              <Text style={[
                styles.aboutText,
                isMobile && styles.aboutTextMobile,
              ]}>
                iGraph IT is a learning platform built for students who want to get better at creating
                SDLC and UML diagrams. Instead of just reading about diagrams in a textbook, you can
                actually practice making them — flowcharts, use case diagrams, class diagrams, and more —
                all in one place. It's basically a hands-on way to understand how systems and software
                projects come together, step by step.
              </Text>
              <Text style={[
                styles.aboutTextSecondary,
                isMobile && styles.aboutTextSecondaryMobile,
              ]}>
                We made this because diagramming can feel confusing at first, especially when you're just
                starting out. iGraph IT breaks it down and lets you learn by doing, so by the time you need
                these skills for school projects or your future job, you'll already feel comfortable with them.
              </Text>
            </View>
          </View>

          {/* Divider - Desktop/Tablet */}
          {(isDesktop || isTablet) && (
            <View style={styles.desktopDivider}>
              <View style={styles.dividerLine} />
            </View>
          )}

          {/* Divider - Mobile */}
          {isMobile && (
            <View style={[styles.mobileDivider, styles.mobileDividerCompact]}>
              <View style={styles.mobileDividerLine} />
              <View style={styles.mobileDividerDot} />
              <View style={styles.mobileDividerLine} />
            </View>
          )}

          {/* Right Column - Team */}
          <View style={[styles.teamColumn, isDesktop && styles.teamColumnDesktop]}>
            {/* Centered Section Title */}
            <View style={styles.sectionHeaderCentered}>
              <Text style={styles.sectionTitleCentered}>Meet the Team</Text>
              <View style={styles.sectionTitleUnderline} />
            </View>

            {/* 3 members on top */}
            <View style={[
              styles.teamRowTop,
              isMobile && styles.teamRowTopMobile,
            ]}>
              {members.slice(0, 3).map((member, index) => (
                <MemberCard
                  key={member.name}
                  name={member.name}
                  role={member.role}
                  index={index}
                  imageUrl={member.imageUrl}
                />
              ))}
            </View>

            {/* 2 members centered on bottom */}
            <View style={[
              styles.teamRowBottom,
              isMobile && styles.teamRowBottomMobile,
            ]}>
              {members.slice(3, 5).map((member, index) => (
                <MemberCard
                  key={member.name}
                  name={member.name}
                  role={member.role}
                  index={index + 3}
                  imageUrl={member.imageUrl}
                />
              ))}
            </View>
          </View>
        </View>

        {/* Footer */}

      </ScrollView>
    </View>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  // Background decorative elements
  bgCircle: {
    position: 'absolute',
    borderRadius: 999,
    opacity: 0.03,
  },
  bgCircle1: {
    top: -100,
    right: -100,
    width: 400,
    height: 400,
    backgroundColor: COLORS.primary,
  },
  bgCircle2: {
    bottom: -50,
    left: -50,
    width: 300,
    height: 300,
    backgroundColor: COLORS.secondary,
  },

  // Header
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

  // Scroll Content
  scrollContent: {
    flexGrow: 1,
  },
  scrollContentMobile: {
    paddingBottom: SPACING.xl,
  },

  // Content Section
  contentSection: {
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.lg,
    gap: SPACING.xxxl,
  },
  contentSectionDesktop: {
    flexDirection: 'row',
    gap: SPACING.xxxxl,
    maxWidth: 1200,
    alignSelf: 'center',
    width: '100%',
  },
  contentSectionMobile: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    gap: 0,
  },

  // Centered Section Headers
  sectionHeaderCentered: {
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  sectionTitleCentered: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.textPrimary,
    letterSpacing: -0.3,
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },
  sectionTitleUnderline: {
    width: 40,
    height: 3,
    backgroundColor: COLORS.primary,
    borderRadius: 2,
  },

  // Section Headers (Original - kept for reference, not used)
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.xl,
  },
  sectionHeaderMobile: {
    marginBottom: SPACING.sm,
  },
  sectionIndicator: {
    width: 3,
    height: 20,
    backgroundColor: COLORS.primary,
    borderRadius: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.textPrimary,
    letterSpacing: -0.3,
  },

  // About Column
  aboutColumn: {
    flex: 1,
  },
  aboutColumnDesktop: {
    flex: 1,
  },
  aboutContent: {
    paddingHorizontal: SPACING.md,
  },
  aboutContentMobile: {
    paddingHorizontal: SPACING.xs,
  },
  aboutText: {
    fontSize: 17,
    color: COLORS.textSecondary,
    lineHeight: 26,
    marginBottom: SPACING.lg,
    fontWeight: '400',
    textAlign: 'center',
  },
  aboutTextMobile: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: SPACING.md,
  },
  aboutTextSecondary: {
    fontSize: 17,
    color: COLORS.textSecondary,
    lineHeight: 26,
    textAlign: 'center',
  },
  aboutTextSecondaryMobile: {
    fontSize: 16,
    lineHeight: 24,
  },

  // Dividers
  desktopDivider: {
    justifyContent: 'center',
    paddingHorizontal: SPACING.md,
  },
  dividerLine: {
    width: 1,
    height: '100%',
    backgroundColor: COLORS.border,
    minHeight: 200,
  },
  mobileDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.md,
  },
  mobileDividerCompact: {
    paddingVertical: SPACING.xs,
  },
  mobileDividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.border,
  },
  mobileDividerDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.primary,
    opacity: 0.4,
  },

  // Team Column
  teamColumn: {
    flex: 1,
  },
  teamColumnDesktop: {
    flex: 1,
  },

  // Team rows
  teamRowTop: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: SPACING.lg,
    marginBottom: SPACING.xxxl,
    flexWrap: 'wrap',
  },
  teamRowTopMobile: {
    gap: SPACING.md,
    marginBottom: SPACING.lg,
  },
  teamRowBottom: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: SPACING.xxxxl,
    paddingHorizontal: SPACING.xxxxl,
  },
  teamRowBottomMobile: {
    gap: SPACING.xl,
    paddingHorizontal: SPACING.xl,
  },

  // Member Card
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

  // Footer
  footer: {
    alignItems: 'center',
    paddingTop: SPACING.xxxxl,
    paddingHorizontal: SPACING.xl,
  },
  footerMobile: {
    paddingTop: SPACING.xxl,
    paddingBottom: SPACING.xl,
  },
  footerLine: {
    width: 32,
    height: 3,
    backgroundColor: COLORS.border,
    borderRadius: 2,
    marginBottom: SPACING.xl,
  },
  footerLineMobile: {
    marginBottom: SPACING.md,
  },
  footerText: {
    fontSize: 12,
    color: COLORS.textTertiary,
    marginBottom: SPACING.xs,
  },
  footerTextMobile: {
    fontSize: 11,
    textAlign: 'center',
  },
  footerSubtext: {
    fontSize: 11,
    color: COLORS.border,
    fontStyle: 'italic',
  },
  footerSubtextMobile: {
    fontSize: 10,
    textAlign: 'center',
    paddingHorizontal: SPACING.lg,
  },
});