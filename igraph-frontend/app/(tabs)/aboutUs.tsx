import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Pressable,
  useWindowDimensions,
  Platform,
  Image,
  Linking,
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

const CONTENT_MAX_WIDTH = 720;
const TEAM_MAX_WIDTH_DESKTOP = 640;

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

const AboutAccent = () => (
  <Svg width={72} height={24} viewBox="0 0 72 24" style={styles.aboutAccent}>
    <Path d="M8 12 H64" stroke={COLORS.primary} strokeWidth={1.5} opacity={0.35} />
    <Circle cx={8} cy={12} r={4} fill={COLORS.primary} opacity={0.85} />
    <Circle cx={36} cy={12} r={5} fill={COLORS.primary} />
    <Circle cx={64} cy={12} r={4} fill={COLORS.primary} opacity={0.85} />
  </Svg>
);

const AboutDivider = () => (
  <Svg width={56} height={16} viewBox="0 0 56 16" style={styles.aboutDivider}>
    <Path d="M2 8 H21" stroke={COLORS.border} strokeWidth={1.2} strokeDasharray="3 3" />
    <Path d="M35 8 H54" stroke={COLORS.border} strokeWidth={1.2} strokeDasharray="3 3" />
    <Path d="M28 1.5 L34.5 8 L28 14.5 L21.5 8 Z" stroke={COLORS.primary} strokeWidth={1.4} fill={COLORS.primaryLight} />
  </Svg>
);

const PersonSilhouetteIcon = () => (
  <Svg width={40} height={40} viewBox="0 0 24 24" fill="none">
    <Circle cx={12} cy={8.5} r={4} fill="#bec3c9" />
    <Path d="M4 20.5c0-4.5 3.6-7 8-7s8 2.5 8 7" fill="#bec3c9" />
  </Svg>
);

const FacebookIcon = () => (
  <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
    <Path
      d="M22 12.06C22 6.5 17.52 2 12 2S2 6.5 2 12.06C2 17.08 5.66 21.23 10.44 22v-7.03H7.9v-2.91h2.54V9.85c0-2.5 1.49-3.89 3.77-3.89 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56v1.88h2.78l-.44 2.91h-2.34V22C18.34 21.23 22 17.08 22 12.06Z"
      fill="#1877F2"
    />
  </Svg>
);

// TYPES

type MemberContact = {
  facebook?: string;
};

type Member = {
  name: string;
  role: string;
  imageSource?: any;
  contact?: MemberContact;
};

// MEMBER CARD COMPONENT

const MemberCard = ({
  name,
  role,
  index,
  imageSource,
  isDesktop,
  contact,
  onPress,
}: {
  name: string;
  role: string;
  index: number;
  imageSource?: any;
  isDesktop: boolean;
  contact?: MemberContact;
  onPress?: () => void;
}) => {
  const [hovered, setHovered] = useState(false);
  const isContactable = !!(contact && contact.facebook);

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
  const avatarSize = isDesktop ? 120 : 96;

  const renderImage = () => {
    if (!imageSource) {
      return (
        <View style={styles.memberAvatarPlaceholder}>
          <PersonSilhouetteIcon />
        </View>
      );
    }
    return (
      <Image
        source={imageSource}
        style={styles.memberImage}
        resizeMode="cover"
      />
    );
  };

  return (
    <Pressable
      style={[
        styles.memberCard,
        isDesktop && styles.memberCardDesktop,
        Platform.OS === 'web' &&
          ({ cursor: isContactable ? 'pointer' : 'default' } as any),
      ]}
      onPress={isContactable ? onPress : undefined}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      accessibilityRole={isContactable ? 'button' : undefined}
      accessibilityLabel={
        isContactable ? `${name}, ${role}. Tap to contact.` : `${name}, ${role}`
      }
    >
      <View
        style={[
          styles.memberAvatar,
          {
            width: avatarSize,
            height: avatarSize,
            borderRadius: avatarSize / 2,
            borderColor: accentColor,
          },
          hovered && styles.memberAvatarHovered,
        ]}
      >
        {renderImage()}
        {isContactable && (
          <View style={styles.contactBadge}>
            <FacebookIcon />
          </View>
        )}
      </View>
      <Text style={[styles.memberName, isDesktop && styles.memberNameDesktop]}>{name}</Text>
      <Text style={[styles.memberRole, isDesktop && styles.memberRoleDesktop]}>{role}</Text>
    </Pressable>
  );
};

// ABOUT CONTENT

const AboutContent = () => (
  <View style={styles.tabContent}>
    <AboutAccent />

    <Text style={styles.aboutEyebrow}>WHAT IS iGRAPH IT?</Text>
    <Text style={styles.aboutHeading}>A hands-on way to learn SDLC and UML</Text>

    <Text style={styles.aboutText}>
      iGraph IT is a capstone project designed to make learning the Software
      Development Life Cycle (SDLC) and Unified Modeling Language (UML)
      diagramming more practical for IT students. Rather than treating each
      diagram type as a separate exercise, the platform brings the full set of
      SDLC and UML diagramming tools into a single workspace, so a complete
      diagram can be planned, drawn, and refined without switching between
      unrelated applications.
    </Text>

    <Text style={styles.aboutText}>
      iGraph IT is built as a Progressive Web App, so it runs directly in the
      browser on both desktop and mobile without requiring a separate
      installation. Alongside the diagramming workspace, a built-in learning
      reference module walks through SDLC models and UML concepts, giving
      students a place to review the theory and immediately apply it to a
      diagram of their own.
    </Text>

    <AboutDivider />

    <View style={styles.whyCard}>
      <Text style={styles.whyEyebrow}>WHY WE BUILT IT</Text>
      <Text style={styles.whyText}>
        Diagramming is a skill that is difficult to fully internalize from a
        textbook alone; it becomes clearer through repeated, hands-on practice.
        iGraph IT was developed around that idea, by a five-person student team,
        as a dedicated space to build SDLC and UML diagramming skills that
        transfer directly into real academic and professional projects.
      </Text>
    </View>
  </View>
);

const openFacebook = (url: string) => {
  Linking.openURL(url).catch(() => {});
};

// TEAM CONTENT

const TeamContent = ({ isDesktop }: { isDesktop: boolean }) => {
  const members: Member[] = [
    {
      name: 'Ceejay Estabillo',
      role: 'Programmer',
      imageSource: require('../../assets/team/Ceejay.png'),
      contact: {
        facebook: 'https://www.facebook.com/ceejayyyE',
      },
    },
    {
      name: 'Jhocel Nicole Caintic',
      role: 'Project Manager',
      imageSource: require('../../assets/team/Jhocel.png'),
    },
    {
      name: 'Jhanine Faith Samatra',
      role: 'UI/UX Designer',
      imageSource: require('../../assets/team/Jhanine Faith.png'),
    },
    {
      name: 'Joe Marc Samson',
      role: 'Database Designer',
      imageSource: require('../../assets/team/Joe Marc.png'),
    },
    {
      name: 'Francis Marquina',
      role: 'QA Tester',
      imageSource: require('../../assets/team/Francis.png'),
    },
  ];

  // 3-top / 2-bottom pyramid on every screen size, desktop just gets
  // bigger avatars/text via the isDesktop prop passed to MemberCard.
  return (
    <View style={styles.tabContent}>
      <View style={styles.teamRowTop}>
        {members.slice(0, 3).map((member, index) => (
          <MemberCard
            key={member.name}
            name={member.name}
            role={member.role}
            index={index}
            imageSource={member.imageSource}
            isDesktop={isDesktop}
            contact={member.contact}
            onPress={
              member.contact?.facebook
                ? () => openFacebook(member.contact!.facebook!)
                : undefined
            }
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
            imageSource={member.imageSource}
            isDesktop={isDesktop}
            contact={member.contact}
            onPress={
              member.contact?.facebook
                ? () => openFacebook(member.contact!.facebook!)
                : undefined
            }
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
    router.navigate('/(tabs)/userAccount');
  };

  // Team tab gets its own (narrower, "hugging") max width on desktop;
  // About tab keeps the original reading-width container.
  const contentMaxWidth =
    activeTab === 'team' ? TEAM_MAX_WIDTH_DESKTOP : CONTENT_MAX_WIDTH;

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

      {/* Tab Bar */}
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

      {/* Content */}
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
        <View style={[styles.scrollContentInner, isDesktop && { maxWidth: contentMaxWidth }]}>
          {activeTab === 'about' ? <AboutContent /> : <TeamContent isDesktop={isDesktop} />}
        </View>
      </ScrollView>

      {/* Scroll to Top Button */}
      {showScrollTop && (
        <View pointerEvents="box-none" style={styles.scrollTopOuter}>
          <View
            pointerEvents="box-none"
            style={[styles.scrollTopInner, isDesktop && { maxWidth: contentMaxWidth }]}
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

  scrollContentOuter: {
    flexGrow: 1,
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.xl,
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
  aboutEyebrow: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
    letterSpacing: 1.2,
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },
  aboutHeading: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.textPrimary,
    textAlign: 'center',
    lineHeight: 30,
    marginBottom: SPACING.lg,
    letterSpacing: -0.3,
  },
  aboutText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    lineHeight: 25,
    marginBottom: SPACING.xl,
    fontWeight: '400',
    textAlign: 'center',
  },
  aboutDivider: {
    alignSelf: 'center',
    marginBottom: SPACING.xxl,
  },
  whyCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.xl,
    ...Platform.select({
      ios: {
        shadowColor: COLORS.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  whyEyebrow: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
    letterSpacing: 1.2,
    marginBottom: SPACING.sm,
  },
  whyText: {
    fontSize: 15,
    color: COLORS.textSecondary,
    lineHeight: 24,
    textAlign: 'left',
  },

  // Mobile/tablet pyramid layout
  teamRowTop: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: SPACING.xl,
    marginBottom: SPACING.xxxl,
    flexWrap: 'wrap',
  },
  teamRowBottom: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: SPACING.xl,
    flexWrap: 'wrap',
  },

  memberCard: {
    alignItems: 'center',
    width: 160,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.xs,
    borderRadius: RADIUS.lg,
  },
  memberCardDesktop: {
    width: 168,
  },
  memberAvatar: {
    borderWidth: 2,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.lg,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 3,
    ...Platform.select({
      web: {
        transitionProperty: 'transform, box-shadow',
        transitionDuration: '150ms',
      } as any,
    }),
  },
  memberAvatarHovered: {
    transform: [{ scale: 1.05 }],
    shadowOpacity: 0.16,
    elevation: 8,
    ...Platform.select({
      web: {
        boxShadow: '0 6px 16px rgba(15, 23, 42, 0.16)',
      } as any,
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
  memberNameDesktop: {
    fontSize: 16,
  },
  memberRole: {
    fontSize: 12,
    color: COLORS.textTertiary,
    textAlign: 'center',
    fontWeight: '500',
  },
  memberRoleDesktop: {
    fontSize: 13,
  },
  contactBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.borderLight,
    ...Platform.select({
      ios: {
        shadowColor: COLORS.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.12,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },

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