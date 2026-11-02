import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  useWindowDimensions,
  Platform,
  Image,
  Linking,
  Animated,
  AccessibilityInfo,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Svg, Path, Circle } from 'react-native-svg';
import { usePageTitle } from '../../utils/usePageTitle';

// TOKENS

const COLORS = {
  primary: '#4c6fff',
  primaryLight: '#eef2ff',
  primaryDark: '#3b4fcc',
  primaryPressed: '#3243b8',
  surface: '#FFFFFF',
  background: '#f8faff',
  textPrimary: '#1E293B',
  textSecondary: '#475569',
  textTertiary: '#64748B', // was #94A3B8, now passes AA
  border: '#E2E8F0',
  borderLight: '#EDF1F7',
  shadow: '#0F172A',
  avatarBg: '#E8EDF7', // one shared photo backdrop
  white: '#ffffff',
};

const SPACING = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, xxxl: 32, huge: 48 };
const RADIUS = { sm: 8, md: 12, lg: 16, xl: 20, full: 999 };

// Match this to the max-width of your top nav container
const SHELL_MAX_WIDTH = 1280;
const CONTENT_MAX_WIDTH = 960;
const READING_MAX_WIDTH = 680; // ~65ch at 17px
const TAB_BAR_ALLOWANCE = 90;

// TODO: set to your real Create Diagram route
const CREATE_DIAGRAM_ROUTE = '/(tabs)/create';

// Optional font pairing. Load them with @expo-google-fonts and set the names here,
// e.g. heading: 'PlusJakartaSans_700Bold', body: 'Inter_400Regular'.
// Leave undefined to use the system font.
const FONTS: { heading?: string; body?: string } = {
  heading: undefined,
  body: undefined,
};

// HELPERS

const webOnly = (style: object): any => (Platform.OS === 'web' ? style : null);

const focusRing = (focused: boolean): any =>
  Platform.OS === 'web'
    ? focused
      ? {
          outlineStyle: 'solid',
          outlineWidth: 2,
          outlineColor: COLORS.primary,
          outlineOffset: 2,
        }
      : { outlineStyle: 'none' }
    : null;

const useInteractive = () => {
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  return {
    hovered,
    focused,
    handlers: {
      onHoverIn: () => setHovered(true),
      onHoverOut: () => setHovered(false),
      onFocus: () => setFocused(true),
      onBlur: () => setFocused(false),
    },
  };
};

const useLayout = () => {
  const { width } = useWindowDimensions();
  return {
    width,
    isMobile: width < 640,
    isTablet: width >= 640 && width < 1024,
    isDesktop: width >= 1024,
  };
};

const FadeIn = ({
  children,
  delay = 0,
  style,
}: {
  children: React.ReactNode;
  delay?: number;
  style?: any;
}) => {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(8)).current;

  useEffect(() => {
    let cancelled = false;
    AccessibilityInfo.isReduceMotionEnabled().then((reduce) => {
      if (cancelled) return;
      if (reduce) {
        opacity.setValue(1);
        translateY.setValue(0);
        return;
      }
      const useNativeDriver = Platform.OS !== 'web';
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 280, delay, useNativeDriver }),
        Animated.timing(translateY, { toValue: 0, duration: 280, delay, useNativeDriver }),
      ]).start();
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <Animated.View style={[style, { opacity, transform: [{ translateY }] }]}>
      {children}
    </Animated.View>
  );
};

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
  <Svg width={72} height={24} viewBox="0 0 72 24" style={styles.accent}>
    <Path d="M8 12 H64" stroke={COLORS.primary} strokeWidth={1.5} opacity={0.35} />
    <Circle cx={8} cy={12} r={4} fill={COLORS.primary} opacity={0.85} />
    <Circle cx={36} cy={12} r={5} fill={COLORS.primary} />
    <Circle cx={64} cy={12} r={4} fill={COLORS.primary} opacity={0.85} />
  </Svg>
);

const AboutDivider = () => (
  <Svg width={56} height={16} viewBox="0 0 56 16" style={styles.divider}>
    <Path d="M2 8 H21" stroke={COLORS.border} strokeWidth={1.2} strokeDasharray="3 3" />
    <Path d="M35 8 H54" stroke={COLORS.border} strokeWidth={1.2} strokeDasharray="3 3" />
    <Path
      d="M28 1.5 L34.5 8 L28 14.5 L21.5 8 Z"
      stroke={COLORS.primary}
      strokeWidth={1.4}
      fill={COLORS.primaryLight}
    />
  </Svg>
);

const PersonSilhouetteIcon = () => (
  <Svg width={40} height={40} viewBox="0 0 24 24" fill="none">
    <Circle cx={12} cy={8.5} r={4} fill="#b4bcc8" />
    <Path d="M4 20.5c0-4.5 3.6-7 8-7s8 2.5 8 7" fill="#b4bcc8" />
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

type Member = {
  name: string;
  role: string;
  imageSource?: any;
  facebook?: string;
};

// DATA

const MEMBERS: Member[] = [
  {
    name: 'Jhocel Nicole Caintic',
    role: 'Project Manager',
    imageSource: require('../../assets/team/Jhocel.png'),
  },
  {
    name: 'Ceejay Estabillo',
    role: 'Programmer',
    imageSource: require('../../assets/team/Ceejay.png'),
    facebook: 'https://www.facebook.com/ceejayyyE',
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

const HIGHLIGHTS = [
  {
    title: 'One workspace',
    text: 'The full set of SDLC and UML diagramming tools together, so a diagram can be planned, drawn, and refined in one place.',
  },
  {
    title: 'Runs in the browser',
    text: 'A Progressive Web App for desktop and mobile, with no separate installation.',
  },
  {
    title: 'Learn, then apply',
    text: 'Built-in references cover SDLC models and UML concepts, ready to apply to your own diagram.',
  },
];

// MEMBER CARD

const MemberCard = ({
  member,
  layout,
}: {
  member: Member;
  layout: 'stacked' | 'row';
}) => {
  const card = useInteractive();
  const social = useInteractive();
  const isRow = layout === 'row';
  const size = isRow ? 72 : 112;

  const avatar = (
    <View style={[styles.avatarRing, { borderRadius: (size + 10) / 2 }]}>
      <View
        style={[
          styles.avatarInner,
          { width: size, height: size, borderRadius: size / 2 },
        ]}
      >
        {member.imageSource ? (
          <Image
            source={member.imageSource}
            alt={member.name}
            accessibilityLabel={member.name}
            style={[styles.memberImage, webOnly({ objectPosition: 'center 20%' })]}
            resizeMode="cover"
          />
        ) : (
          <PersonSilhouetteIcon />
        )}
      </View>
    </View>
  );

  const social_ = member.facebook ? (
    <Pressable
      onPress={() => Linking.openURL(member.facebook!).catch(() => {})}
      accessibilityRole="link"
      accessibilityLabel={`${member.name} on Facebook`}
      {...social.handlers}
      style={[
        styles.socialButton,
        social.hovered && styles.socialButtonHover,
        focusRing(social.focused),
        webOnly({ cursor: 'pointer', transitionProperty: 'background-color', transitionDuration: '150ms' }),
      ]}
    >
      <FacebookIcon />
    </Pressable>
  ) : null;

  return (
    <View
      {...(Platform.OS === 'web'
        ? ({
            onMouseEnter: card.handlers.onHoverIn,
            onMouseLeave: card.handlers.onHoverOut,
          } as any)
        : {})}
      style={[
        styles.memberCard,
        isRow ? styles.memberCardRow : styles.memberCardStacked,
        card.hovered &&
          webOnly({
            transform: [{ translateY: -3 }],
            boxShadow: '0 12px 28px rgba(15, 23, 42, 0.10)',
          }),
        webOnly({
          transitionProperty: 'transform, box-shadow',
          transitionDuration: '180ms',
        }),
      ]}
    >
      {avatar}
      <View style={isRow ? styles.memberTextRow : styles.memberTextStacked}>
        <Text style={[styles.memberName, isRow && { textAlign: 'left' }]}>{member.name}</Text>
        <View style={styles.rolePill}>
          <Text style={styles.rolePillText}>{member.role}</Text>
        </View>
      </View>
      {social_ ? <View style={isRow ? styles.socialRow : styles.socialStacked}>{social_}</View> : null}
    </View>
  );
};

// SHARED BITS

const SectionIntro = ({
  eyebrow,
  heading,
  isMobile,
}: {
  eyebrow: string;
  heading: string;
  isMobile: boolean;
}) => (
  <>
    <Text style={styles.eyebrow}>{eyebrow}</Text>
    <Text
      accessibilityRole="header"
      style={[styles.heading, isMobile ? styles.headingMobile : styles.headingDesktop]}
    >
      {heading}
    </Text>
  </>
);

const Footer = () => (
  <View style={styles.footer}>
    <Text style={styles.footerText}>iGraph IT  ·  Capstone project  ·  DCT</Text>
  </View>
);

// ABOUT

const AboutContent = ({ isMobile, isDesktop }: { isMobile: boolean; isDesktop: boolean }) => {
  const router = useRouter();
  const cta = useInteractive();
  const [pressed, setPressed] = useState(false);
  const bodyStyle = [styles.aboutText, isMobile && styles.aboutTextMobile];

  return (
    <FadeIn>
      <AboutAccent />
      <SectionIntro
        eyebrow="WHAT IS iGRAPH IT?"
        heading="A hands-on way to learn SDLC and UML"
        isMobile={isMobile}
      />

      <Text style={bodyStyle}>
        iGraph IT is a capstone project designed to make learning the Software Development Life
        Cycle (SDLC) and Unified Modeling Language (UML) diagramming more practical for IT
        students. Rather than treating each diagram type as a separate exercise, the platform
        brings the full set of SDLC and UML diagramming tools into a single workspace, so a
        complete diagram can be planned, drawn, and refined without switching between unrelated
        applications.
      </Text>
      <Text style={bodyStyle}>
        iGraph IT is built as a Progressive Web App, so it runs directly in the browser on both
        desktop and mobile without requiring a separate installation. Alongside the diagramming
        workspace, a built-in learning reference module walks through SDLC models and UML
        concepts, giving students a place to review the theory and immediately apply it to a
        diagram of their own.
      </Text>

      <View style={[styles.highlights, isDesktop && styles.highlightsRow]}>
        {HIGHLIGHTS.map((h) => (
          <View key={h.title} style={[styles.highlightCard, isDesktop && { flex: 1 }]}>
            <View style={styles.highlightBar} />
            <Text style={styles.highlightTitle}>{h.title}</Text>
            <Text style={styles.highlightText}>{h.text}</Text>
          </View>
        ))}
      </View>

      <AboutDivider />

      <View style={styles.whyCard}>
        <Text style={styles.whyEyebrow}>WHY WE BUILT IT</Text>
        <Text style={styles.whyText}>
          Diagramming is a skill that is difficult to fully internalize from a textbook alone; it
          becomes clearer through repeated, hands-on practice. iGraph IT was developed around that
          idea, by a five-person student team, as a dedicated space to build SDLC and UML
          diagramming skills that transfer directly into real academic and professional projects.
        </Text>
      </View>

      <View style={styles.ctaWrap}>
        <Pressable
          onPress={() => router.navigate(CREATE_DIAGRAM_ROUTE as any)}
          onPressIn={() => setPressed(true)}
          onPressOut={() => setPressed(false)}
          accessibilityRole="button"
          accessibilityLabel="Start creating a diagram"
          {...cta.handlers}
          style={[
            styles.ctaButton,
            (cta.hovered || pressed) && { backgroundColor: COLORS.primaryPressed },
            focusRing(cta.focused),
            webOnly({ cursor: 'pointer', transitionProperty: 'background-color', transitionDuration: '150ms' }),
          ]}
        >
          <Text style={styles.ctaText}>Start creating</Text>
        </Pressable>
      </View>
    </FadeIn>
  );
};

// TEAM

const TeamContent = ({ isMobile }: { isMobile: boolean }) => (
  <FadeIn>
    <AboutAccent />
    <SectionIntro eyebrow="THE TEAM" heading="Five students, one capstone" isMobile={isMobile} />
    <View style={[styles.teamGrid, isMobile && styles.teamGridMobile]}>
      {MEMBERS.map((m) => (
        <MemberCard key={m.name} member={m} layout={isMobile ? 'row' : 'stacked'} />
      ))}
    </View>
  </FadeIn>
);

// MAIN

export default function AboutUs() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isMobile, isDesktop } = useLayout();
  const scrollViewRef = useRef<ScrollView>(null);

  const [activeTab, setActiveTab] = useState<'about' | 'team'>('about');
  const [showScrollTop, setShowScrollTop] = useState(false);
  usePageTitle(activeTab === 'team' ? 'Team' : 'About iGraph IT');

  const back = useInteractive();
  const top = useInteractive();

  const handleTabSwitch = (tab: 'about' | 'team') => {
    setActiveTab(tab);
    setShowScrollTop(false);
    scrollViewRef.current?.scrollTo({ y: 0, animated: false });
  };

  const handleScroll = (e: any) => setShowScrollTop(e.nativeEvent.contentOffset.y > 300);
  const scrollToTop = () => scrollViewRef.current?.scrollTo({ y: 0, animated: true });

  const tabs: { key: 'about' | 'team'; label: string }[] = [
    { key: 'about', label: 'Overview' },
    { key: 'team', label: 'Team' },
  ];

  return (
    <View style={styles.container}>
      {/* Header: back button left, title centered, spacer right (same as Legal) */}
      <View style={[styles.header, { paddingTop: insets.top + SPACING.sm }]}>
        <Pressable
          onPress={() => router.navigate('/(tabs)/userAccount')}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          {...back.handlers}
          style={[
            styles.backButton,
            back.hovered && { backgroundColor: COLORS.primaryLight },
            focusRing(back.focused),
            webOnly({ cursor: 'pointer' }),
          ]}
        >
          <BackIcon />
        </Pressable>
        <Text accessibilityRole="header" style={styles.headerTitle}>
          About iGraph IT
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Tab bar: full width, equal tabs (same as Legal) */}
      <View style={styles.tabBar} accessibilityRole="tablist">
        {tabs.map((t) => (
          <TabButton
            key={t.key}
            label={t.label}
            selected={activeTab === t.key}
            fill
            onPress={() => handleTabSwitch(t.key)}
          />
        ))}
      </View>

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
        <View style={styles.scrollContentInner} key={activeTab}>
          {activeTab === 'about' ? (
            <AboutContent isMobile={isMobile} isDesktop={isDesktop} />
          ) : (
            <TeamContent isMobile={isMobile} />
          )}
          <Footer />
        </View>
      </ScrollView>

      {showScrollTop && (
        <View
          pointerEvents="box-none"
          style={[
            styles.scrollTopOuter,
            // Lift above the bottom tab bar on mobile
            { paddingBottom: insets.bottom + (isMobile ? TAB_BAR_ALLOWANCE : SPACING.xxxl) },
          ]}
        >
          <View pointerEvents="box-none" style={styles.scrollTopInner}>
            <Pressable
              onPress={scrollToTop}
              accessibilityRole="button"
              accessibilityLabel="Scroll to top"
              {...top.handlers}
              style={[
                styles.scrollTopButton,
                top.hovered && { backgroundColor: COLORS.primaryPressed },
                focusRing(top.focused),
                webOnly({ cursor: 'pointer' }),
              ]}
            >
              <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
                <Path
                  d="M12 19V5M5 12l7-7 7 7"
                  stroke="#ffffff"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </Svg>
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
}

const TabButton = ({
  label,
  selected,
  fill,
  onPress,
}: {
  label: string;
  selected: boolean;
  fill: boolean;
  onPress: () => void;
}) => {
  const { hovered, focused, handlers } = useInteractive();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="tab"
      accessibilityState={{ selected }}
      {...handlers}
      style={[
        styles.tab,
        fill ? { flex: 1 } : { paddingHorizontal: SPACING.xxxl, minWidth: 140 },
        selected && styles.activeTab,
        focusRing(focused),
        webOnly({ cursor: 'pointer' }),
      ]}
    >
      <Text
        style={[
          styles.tabText,
          hovered && !selected && { color: COLORS.textPrimary },
          selected && styles.activeTabText,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
};

// STYLES

const cardShadow = Platform.select({
  ios: {
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
  },
  android: { elevation: 1 },
  default: {},
}) as object;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },

  // Shell shared by header + tabs
  shell: {
    width: '100%',
    maxWidth: SHELL_MAX_WIDTH,
    alignSelf: 'center',
    paddingHorizontal: SPACING.xl,
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
    width: 44,
    height: 44,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.textPrimary,
    letterSpacing: -0.3,
    fontFamily: FONTS.heading,
  },
  headerSpacer: { width: 44 },

  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.xl,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  tabRow: { flexDirection: 'row' },
  tab: {
    minHeight: 48,
    paddingVertical: SPACING.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
    marginBottom: -1,
  },
  activeTab: { borderBottomColor: COLORS.primaryDark },
  tabText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textTertiary,
    fontFamily: FONTS.body,
  },
  activeTabText: { color: COLORS.primaryDark },

  scrollView: { flex: 1 },
  scrollContentOuter: {
    flexGrow: 1,
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.xxxl,
  },
  scrollContentInner: { width: '100%', maxWidth: CONTENT_MAX_WIDTH },

  // Intro
  accent: { alignSelf: 'center', marginBottom: SPACING.lg },
  divider: { alignSelf: 'center', marginVertical: SPACING.xxl },
  eyebrow: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.primaryDark,
    letterSpacing: 1.2,
    textAlign: 'center',
    marginBottom: SPACING.sm,
    fontFamily: FONTS.body,
  },
  heading: {
    fontWeight: '700',
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: SPACING.xxl,
    letterSpacing: 0,
    fontFamily: FONTS.heading,
  },
  headingDesktop: { fontSize: 32, lineHeight: 40 },
  headingMobile: { fontSize: 25, lineHeight: 32 },

  aboutText: {
    width: '100%',
    maxWidth: READING_MAX_WIDTH,
    alignSelf: 'center',
    fontSize: 17,
    lineHeight: 29, // 1.7
    color: COLORS.textSecondary,
    textAlign: 'left',
    marginBottom: SPACING.xl,
    fontFamily: FONTS.body,
  },
  aboutTextMobile: { fontSize: 16, lineHeight: 27 },

  // Highlights
  highlights: { gap: SPACING.lg, marginTop: SPACING.sm },
  highlightsRow: { flexDirection: 'row' },
  highlightCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    padding: SPACING.xl,
    ...cardShadow,
  },
  highlightBar: {
    width: 24,
    height: 3,
    borderRadius: 2,
    backgroundColor: COLORS.primary,
    marginBottom: SPACING.md,
  },
  highlightTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
    fontFamily: FONTS.heading,
  },
  highlightText: {
    fontSize: 14,
    lineHeight: 22,
    color: COLORS.textSecondary,
    fontFamily: FONTS.body,
  },

  whyCard: {
    width: '100%',
    maxWidth: READING_MAX_WIDTH + 80,
    alignSelf: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    paddingVertical: SPACING.xl,
    paddingHorizontal: SPACING.xxl,
    ...cardShadow,
  },
  whyEyebrow: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.primaryDark,
    letterSpacing: 1.2,
    marginBottom: SPACING.sm,
    fontFamily: FONTS.body,
  },
  whyText: {
    fontSize: 16,
    lineHeight: 26,
    color: COLORS.textSecondary,
    fontFamily: FONTS.body,
  },

  ctaWrap: { alignItems: 'center', marginTop: SPACING.xxxl },
  ctaButton: {
    minHeight: 48,
    minWidth: 180,
    paddingHorizontal: SPACING.xxl,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primaryDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
    fontFamily: FONTS.body,
  },

  // Team
  teamGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: SPACING.xl,
  },
  teamGridMobile: { flexDirection: 'column', flexWrap: 'nowrap', gap: SPACING.md },

  memberCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    ...cardShadow,
  },
  memberCardStacked: {
    width: 264,
    alignItems: 'center',
    paddingTop: SPACING.xxl,
    paddingBottom: SPACING.xl,
    paddingHorizontal: SPACING.lg,
  },
  memberCardRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.lg,
    gap: SPACING.lg,
  },

  avatarRing: {
    padding: 3,
    borderWidth: 2,
    borderColor: COLORS.primary,
    backgroundColor: COLORS.surface,
  },
  avatarInner: {
    overflow: 'hidden',
    backgroundColor: COLORS.avatarBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberImage: { width: '100%', height: '100%' },

  memberTextStacked: { alignItems: 'center', marginTop: SPACING.lg },
  memberTextRow: { flex: 1, alignItems: 'flex-start' },
  memberName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: SPACING.sm,
    fontFamily: FONTS.heading,
  },
  rolePill: {
    backgroundColor: COLORS.primaryLight,
    borderRadius: RADIUS.full,
    paddingVertical: 4,
    paddingHorizontal: SPACING.md,
  },
  rolePillText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.primaryDark,
    fontFamily: FONTS.body,
  },

  socialStacked: { marginTop: SPACING.md },
  socialRow: {},
  socialButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  socialButtonHover: { backgroundColor: COLORS.primaryLight },

  // Footer
  footer: {
    marginTop: SPACING.huge,
    paddingTop: SPACING.xl,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 13,
    color: COLORS.textTertiary,
    fontFamily: FONTS.body,
  },

  // Scroll to top
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
    maxWidth: CONTENT_MAX_WIDTH,
    alignItems: 'flex-end',
    paddingHorizontal: SPACING.xl,
  },
  scrollTopButton: {
    backgroundColor: COLORS.primaryDark,
    width: 48,
    height: 48,
    borderRadius: RADIUS.full,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
    zIndex: 10,
  },
});