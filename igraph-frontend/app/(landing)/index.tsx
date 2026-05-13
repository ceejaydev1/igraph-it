
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
  TouchableOpacity,
  Image,
  Animated,
  Platform,
  Modal,
  Linking,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Svg, Rect, Path, Circle } from 'react-native-svg';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const isMobile = SCREEN_WIDTH < 768;
const isTablet = SCREEN_WIDTH >= 768 && SCREEN_WIDTH < 1024;
const isDesktop = SCREEN_WIDTH >= 1024;

// ====================== ANIMATIONS ======================

const FadeInUp = ({ children, delay = 0, style = {} }: any) => {
  const fade = useRef(new Animated.Value(0)).current;
  const move = useRef(new Animated.Value(40)).current;

  useEffect(() => {
    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(fade, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.spring(move, {
          toValue: 0,
          useNativeDriver: true,
          tension: 60,
          friction: 9,
        }),
      ]).start();
    }, delay);

    return () => clearTimeout(timer);
  }, []);

  return (
    <Animated.View
      style={[
        style,
        {
          opacity: fade,
          transform: [{ translateY: move }],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
};

// ====================== HELPERS ======================

const scrollToSection = (id: string) => {
  if (Platform.OS === 'web') {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }
};

// ====================== SVG PREVIEW ======================

const DiagramPreview = () => (
  <Svg width={isMobile ? 300 : 520} height={isMobile ? 220 : 380} viewBox="0 0 520 380">
    <Rect x="60" y="70" width="120" height="60" rx="16" fill="#FFFFFF" stroke="#2563EB" strokeWidth="3" />
    <Rect x="210" y="70" width="120" height="60" rx="16" fill="#DBEAFE" stroke="#2563EB" strokeWidth="3" />
    <Rect x="360" y="70" width="100" height="60" rx="16" fill="#FFFFFF" stroke="#2563EB" strokeWidth="3" />

    <Path d="M180 100 L210 100" stroke="#2563EB" strokeWidth="3" />
    <Path d="M330 100 L360 100" stroke="#2563EB" strokeWidth="3" />

    <Rect x="140" y="220" width="110" height="55" rx="14" fill="#FFFFFF" stroke="#10B981" strokeWidth="3" />
    <Rect x="300" y="220" width="110" height="55" rx="14" fill="#ECFDF5" stroke="#10B981" strokeWidth="3" />

    <Path d="M270 130 L270 180" stroke="#64748B" strokeWidth="3" />
    <Path d="M195 180 L355 180" stroke="#64748B" strokeWidth="3" />
    <Path d="M195 180 L195 220" stroke="#64748B" strokeWidth="3" />
    <Path d="M355 180 L355 220" stroke="#64748B" strokeWidth="3" />

    <Circle cx="270" cy="180" r="12" fill="#2563EB" />
  </Svg>
);

// ====================== NAVBAR ======================

const Navbar = ({ scrolled, openMenu }: any) => {
  const router = useRouter();

  const navItems = [
    { label: 'Features', section: 'features' },
    { label: 'Learning', section: 'learning' },
    { label: 'Diagrams', section: 'diagrams' },
    { label: 'Resources', section: 'resources' },
  ];

  return (
    <View style={[styles.navbar, scrolled && styles.navbarScrolled]}>
      <View style={styles.navInner}>
        <TouchableOpacity style={styles.logoWrap} onPress={() => scrollToSection('hero')}>
          <Image
            source={require('../../assets/images/logo.png')}
            style={styles.logo}
          />
          <Text style={styles.logoText}>iGraph IT</Text>
        </TouchableOpacity>

        {!isMobile && (
          <View style={styles.desktopNav}>
            {navItems.map((item) => (
              <TouchableOpacity
                key={item.label}
                onPress={() => scrollToSection(item.section)}
              >
                <Text style={styles.navLink}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <View style={styles.navActions}>
          {!isMobile && (
            <TouchableOpacity
              style={styles.signInBtn}
              onPress={() => router.push('/(auth)/signin')}
            >
              <Text style={styles.signInText}>Sign In</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => router.push('/(auth)/signup')}
          >
            <Text style={styles.primaryButtonText}>Get Started</Text>
          </TouchableOpacity>

          {isMobile && (
            <TouchableOpacity style={styles.menuBtn} onPress={openMenu}>
              <View style={styles.hamburger} />
              <View style={styles.hamburger} />
              <View style={styles.hamburgerSmall} />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
};

// ====================== MOBILE MENU ======================

const MobileMenu = ({ visible, closeMenu }: any) => {
  const router = useRouter();

  const items = [
    { label: 'Features', section: 'features' },
    { label: 'Learning', section: 'learning' },
    { label: 'Diagrams', section: 'diagrams' },
    { label: 'Resources', section: 'resources' },
  ];

  return (
    <Modal visible={visible} transparent animationType="fade">
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={closeMenu}>
        <View style={styles.mobileMenu}>
          {items.map((item) => (
            <TouchableOpacity
              key={item.label}
              style={styles.mobileLinkWrap}
              onPress={() => {
                closeMenu();
                setTimeout(() => {
                  scrollToSection(item.section);
                }, 200);
              }}
            >
              <Text style={styles.mobileLink}>{item.label}</Text>
            </TouchableOpacity>
          ))}

          <TouchableOpacity
            style={styles.mobileSignIn}
            onPress={() => {
              closeMenu();
              router.push('/(auth)/signin');
            }}
          >
            <Text style={styles.mobileSignInText}>Sign In</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.mobileGetStarted}
            onPress={() => {
              closeMenu();
              router.push('/(auth)/signup');
            }}
          >
            <Text style={styles.mobileGetStartedText}>Get Started</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

// ====================== HERO ======================

const HeroSection = () => {
  const router = useRouter();

  return (
    <View id="hero" style={styles.hero}>
      <View style={styles.heroContent}>
        <View style={styles.heroBadge}>
          <View style={styles.liveDot} />
          <Text style={styles.heroBadgeText}>Built for IT students & capstone teams</Text>
        </View>

        <Text style={styles.heroTitle}>
          Build UML diagrams that actually look{' '}
          <Text style={styles.gradientText}>professional</Text>
        </Text>

        <Text style={styles.heroSubtitle}>
          Learn SDLC concepts, design UML diagrams, organize workflows,
          and export polished outputs for presentations, reports, and capstone projects.
        </Text>

        <View style={styles.heroButtons}>
          <TouchableOpacity
            style={styles.heroPrimaryBtn}
            onPress={() => router.push('/(auth)/signup')}
          >
            <Text style={styles.heroPrimaryText}>Start Creating</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.heroSecondaryBtn}
            onPress={() => scrollToSection('learning')}
          >
            <Text style={styles.heroSecondaryText}>Explore Features</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.heroStats}>
          <Text style={styles.heroStat}>10+ UML diagrams</Text>
          <Text style={styles.heroStat}>Cloud save</Text>
          <Text style={styles.heroStat}>Export to PDF / PNG / SVG</Text>
        </View>
      </View>

      <View style={styles.heroVisual}>
        <View style={styles.heroCard}>
          <View style={styles.cardTop}>
            <View style={styles.cardDot} />
            <View style={styles.cardDot} />
            <View style={styles.cardDot} />
          </View>
          <DiagramPreview />
        </View>
      </View>
    </View>
  );
};

// ====================== FEATURES ======================

const features = [
  {
    title: 'Interactive SDLC Learning',
    desc: 'Understand Agile, Waterfall, Spiral, RAD, and Incremental models with visual explanations and examples.',
  },
  {
    title: 'Professional UML Workspace',
    desc: 'Design clean Use Case, Sequence, Class, and Activity diagrams with a polished modern interface.',
  },
  {
    title: 'Smart Diagram Validation',
    desc: 'Get guided structure validation to help you avoid incorrect UML relationships and workflows.',
  },
  {
    title: 'Real Export Tools',
    desc: 'Download professional-quality diagrams in PDF, SVG, and PNG ready for thesis and reports.',
  },
  {
    title: 'Team Collaboration',
    desc: 'Share diagrams with classmates and work together on system analysis and software design.',
  },
  {
    title: 'Cloud Sync',
    desc: 'Access your diagrams anytime across mobile, tablet, and desktop devices.',
  },
];

const FeaturesSection = () => (
  <View id="features" style={styles.section}>
    <Text style={styles.sectionMini}>FEATURES</Text>
    <Text style={styles.sectionTitle}>Everything students need in one platform</Text>

    <View style={styles.featureGrid}>
      {features.map((item, index) => (
        <FadeInUp key={item.title} delay={index * 70}>
          <TouchableOpacity style={styles.featureCard} activeOpacity={0.9}>
            <View style={styles.featureIcon} />

            <Text style={styles.featureTitle}>{item.title}</Text>
            <Text style={styles.featureDesc}>{item.desc}</Text>

            <TouchableOpacity
              onPress={() => {
                if (Platform.OS === 'web') {
                  alert(`${item.title}\n\n${item.desc}\n\nThis feature helps IT students build professional diagrams and understand software engineering workflows faster.`);
                }
              }}
            >
              <Text style={styles.learnMore}>Learn more →</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </FadeInUp>
      ))}
    </View>
  </View>
);

// ====================== LEARNING SECTION ======================

const LearningSection = () => (
  <View id="learning" style={[styles.section, styles.learningSection]}>
    <View style={styles.learningContainer}>
      <View style={styles.learningLeft}>
        <Text style={styles.sectionMini}>LEARNING EXPERIENCE</Text>
        <Text style={styles.learningTitle}>
          Built to support real software engineering workflows
        </Text>

        <Text style={styles.learningDesc}>
          iGraph IT is more than a UML tool. It helps students understand
          system analysis, software planning, process flow visualization,
          and software documentation with a clean educational experience.
        </Text>

        <View style={styles.learningList}>
          <Text style={styles.learningItem}>✓ SDLC visual explanations</Text>
          <Text style={styles.learningItem}>✓ UML relationship guidance</Text>
          <Text style={styles.learningItem}>✓ Presentation-ready exports</Text>
          <Text style={styles.learningItem}>✓ Modern workflow interface</Text>
        </View>
      </View>

      <View style={styles.learningRight}>
        <View style={styles.learningCard}>
          <View style={styles.learningCardHeader}>
            <Text style={styles.learningCardTitle}>System Planning</Text>
          </View>

          <View style={styles.fakeChart}>
            <View style={styles.fakeLineLong} />
            <View style={styles.fakeLineShort} />
            <View style={styles.fakeLineMedium} />
          </View>

          <View style={styles.workflowRow}>
            <View style={styles.workflowBox} />
            <View style={styles.workflowConnector} />
            <View style={styles.workflowBoxBlue} />
          </View>
        </View>
      </View>
    </View>
  </View>
);

// ====================== DIAGRAMS ======================

const diagrams = [
  'Use Case',
  'Class Diagram',
  'Sequence',
  'Activity',
  'ERD',
  'DFD',
  'Flowchart',
  'State Diagram',
  'Fishbone',
  'FDD',
];

const DiagramsSection = () => (
  <View id="diagrams" style={styles.section}>
    <Text style={styles.sectionMini}>DIAGRAMS</Text>
    <Text style={styles.sectionTitle}>Create diagrams faster</Text>

    <View style={styles.diagramWrap}>
      {diagrams.map((item) => (
        <View key={item} style={styles.diagramCard}>
          <View style={styles.diagramIcon} />
          <Text style={styles.diagramText}>{item}</Text>
        </View>
      ))}
    </View>
  </View>
);

// ====================== RESOURCES ======================

const ResourcesSection = () => (
  <View id="resources" style={[styles.section, styles.resourceSection]}>
    <Text style={styles.sectionMini}>RESOURCES</Text>
    <Text style={styles.sectionTitle}>Helpful tools and learning materials</Text>

    <View style={styles.resourceGrid}>
      <TouchableOpacity style={styles.resourceCard}>
        <Text style={styles.resourceTitle}>SDLC Guides</Text>
        <Text style={styles.resourceDesc}>
          Learn software development models with visual examples.
        </Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.resourceCard}>
        <Text style={styles.resourceTitle}>UML Tutorials</Text>
        <Text style={styles.resourceDesc}>
          Understand UML relationships, notation, and workflows.
        </Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.resourceCard}>
        <Text style={styles.resourceTitle}>Capstone References</Text>
        <Text style={styles.resourceDesc}>
          Organize project documentation and planning better.
        </Text>
      </TouchableOpacity>
    </View>
  </View>
);

// ====================== CTA ======================

const CTA = () => {
  const router = useRouter();

  return (
    <View style={styles.ctaSection}>
      <Text style={styles.ctaTitle}>Ready to design smarter?</Text>
      <Text style={styles.ctaSubtitle}>
        Create your first UML diagram in minutes.
      </Text>

      <TouchableOpacity
        style={styles.ctaBtn}
        onPress={() => router.push('/(auth)/signup')}
      >
        <Text style={styles.ctaBtnText}>Get Started Free</Text>
      </TouchableOpacity>
    </View>
  );
};

// ====================== FOOTER ======================

const Footer = () => (
  <View style={styles.footer}>
    <Text style={styles.footerBrand}>iGraph IT</Text>
    <Text style={styles.footerText}>
      Modern UML & SDLC learning platform for IT students.
    </Text>

    <Text style={styles.footerCopy}>© 2026 iGraph IT. All rights reserved.</Text>
  </View>
);

// ====================== MAIN ======================

export default function LandingPage() {
  const [menuVisible, setMenuVisible] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  return (
    <View style={{ flex: 1 }}>
      <Navbar
        scrolled={scrolled}
        openMenu={() => setMenuVisible(true)}
      />

      <MobileMenu
        visible={menuVisible}
        closeMenu={() => setMenuVisible(false)}
      />

      <ScrollView
        style={styles.container}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        onScroll={(e) => {
          setScrolled(e.nativeEvent.contentOffset.y > 20);
        }}
      >
        <HeroSection />
        <FeaturesSection />
        <LearningSection />
        <DiagramsSection />
        <ResourcesSection />
        <CTA />
        <Footer />
      </ScrollView>
    </View>
  );
}

// ====================== STYLES ======================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },

  navbar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 999,
    paddingVertical: 18,
    paddingHorizontal: 24,
  },

  navbarScrolled: {
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },

  navInner: {
    maxWidth: 1280,
    width: '100%',
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  logoWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },

  logo: {
    width: 42,
    height: 42,
    borderRadius: 12,
  },

  logoText: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
  },

  desktopNav: {
    flexDirection: 'row',
    gap: 36,
  },

  navLink: {
    color: '#334155',
    fontWeight: '600',
    fontSize: 15,
  },

  navActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },

  signInBtn: {
    paddingHorizontal: 10,
    paddingVertical: 10,
  },

  signInText: {
    color: '#334155',
    fontWeight: '600',
  },

  primaryButton: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 14,
  },

  primaryButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },

  menuBtn: {
    gap: 5,
  },

  hamburger: {
    width: 26,
    height: 3,
    borderRadius: 10,
    backgroundColor: '#0F172A',
  },

  hamburgerSmall: {
    width: 18,
    height: 3,
    borderRadius: 10,
    backgroundColor: '#0F172A',
  },

  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
  },

  mobileMenu: {
    width: '80%',
    height: '100%',
    backgroundColor: '#FFFFFF',
    padding: 28,
    paddingTop: 90,
  },

  mobileLinkWrap: {
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },

  mobileLink: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },

  mobileSignIn: {
    marginTop: 30,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },

  mobileSignInText: {
    fontWeight: '700',
  },

  mobileGetStarted: {
    marginTop: 14,
    backgroundColor: '#2563EB',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },

  mobileGetStartedText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },

  hero: {
    paddingTop: 140,
    paddingBottom: 100,
    paddingHorizontal: 24,
    maxWidth: 1280,
    width: '100%',
    alignSelf: 'center',
    flexDirection: isMobile ? 'column' : 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 50,
  },

  heroContent: {
    flex: 1,
    maxWidth: 620,
  },

  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#DBEAFE',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    marginBottom: 28,
    gap: 8,
  },

  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
    backgroundColor: '#10B981',
  },

  heroBadgeText: {
    color: '#1D4ED8',
    fontWeight: '700',
    fontSize: 13,
  },

  heroTitle: {
    fontSize: isMobile ? 42 : 64,
    lineHeight: isMobile ? 50 : 74,
    fontWeight: '900',
    color: '#0F172A',
  },

  gradientText: {
    color: '#2563EB',
  },

  heroSubtitle: {
    marginTop: 22,
    fontSize: 18,
    lineHeight: 32,
    color: '#475569',
  },

  heroButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginTop: 34,
  },

  heroPrimaryBtn: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 26,
    paddingVertical: 16,
    borderRadius: 18,
  },

  heroPrimaryText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 15,
  },

  heroSecondaryBtn: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingHorizontal: 26,
    paddingVertical: 16,
    borderRadius: 18,
  },

  heroSecondaryText: {
    fontWeight: '700',
    color: '#0F172A',
  },

  heroStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 18,
    marginTop: 26,
  },

  heroStat: {
    color: '#64748B',
    fontWeight: '600',
  },

  heroVisual: {
    flex: 1,
    alignItems: 'center',
  },

  heroCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 30,
    padding: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOpacity: 0.08,
    shadowRadius: 20,
    shadowOffset: {
      width: 0,
      height: 10,
    },
    elevation: 5,
  },

  cardTop: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },

  cardDot: {
    width: 10,
    height: 10,
    borderRadius: 999,
    backgroundColor: '#CBD5E1',
  },

  section: {
    paddingVertical: 100,
    paddingHorizontal: 24,
    maxWidth: 1280,
    width: '100%',
    alignSelf: 'center',
  },

  sectionMini: {
    color: '#2563EB',
    fontWeight: '800',
    letterSpacing: 1.2,
    marginBottom: 16,
    textAlign: 'center',
  },

  sectionTitle: {
    fontSize: isMobile ? 34 : 48,
    fontWeight: '900',
    color: '#0F172A',
    textAlign: 'center',
    marginBottom: 50,
  },

  featureGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 24,
  },

  featureCard: {
    width: isMobile ? '100%' : isTablet ? '47%' : 360,
    backgroundColor: '#FFFFFF',
    padding: 28,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },

  featureIcon: {
    width: 58,
    height: 58,
    borderRadius: 18,
    backgroundColor: '#DBEAFE',
    marginBottom: 24,
  },

  featureTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 12,
  },

  featureDesc: {
    color: '#64748B',
    lineHeight: 26,
    marginBottom: 18,
  },

  learnMore: {
    color: '#2563EB',
    fontWeight: '800',
  },

  learningSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 30,
  },

  learningContainer: {
    flexDirection: isMobile ? 'column' : 'row',
    alignItems: 'center',
    gap: 50,
  },

  learningLeft: {
    flex: 1,
  },

  learningRight: {
    flex: 1,
    alignItems: 'center',
  },

  learningTitle: {
    fontSize: isMobile ? 34 : 46,
    lineHeight: isMobile ? 42 : 56,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 20,
  },

  learningDesc: {
    color: '#64748B',
    lineHeight: 30,
    fontSize: 17,
    marginBottom: 28,
  },

  learningList: {
    gap: 14,
  },

  learningItem: {
    color: '#0F172A',
    fontWeight: '700',
  },

  learningCard: {
    width: '100%',
    maxWidth: 500,
    backgroundColor: '#0F172A',
    borderRadius: 28,
    padding: 26,
  },

  learningCardHeader: {
    marginBottom: 24,
  },

  learningCardTitle: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 20,
  },

  fakeChart: {
    gap: 12,
  },

  fakeLineLong: {
    height: 14,
    width: '100%',
    borderRadius: 999,
    backgroundColor: '#1E293B',
  },

  fakeLineShort: {
    height: 14,
    width: '60%',
    borderRadius: 999,
    backgroundColor: '#2563EB',
  },

  fakeLineMedium: {
    height: 14,
    width: '82%',
    borderRadius: 999,
    backgroundColor: '#1E293B',
  },

  workflowRow: {
    marginTop: 34,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },

  workflowBox: {
    width: 70,
    height: 70,
    borderRadius: 18,
    backgroundColor: '#1E293B',
  },

  workflowConnector: {
    width: 70,
    height: 4,
    backgroundColor: '#475569',
  },

  workflowBoxBlue: {
    width: 70,
    height: 70,
    borderRadius: 18,
    backgroundColor: '#2563EB',
  },

  diagramWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 18,
  },

  diagramCard: {
    width: 160,
    backgroundColor: '#FFFFFF',
    paddingVertical: 28,
    borderRadius: 22,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },

  diagramIcon: {
    width: 52,
    height: 52,
    borderRadius: 18,
    backgroundColor: '#DBEAFE',
    marginBottom: 16,
  },

  diagramText: {
    fontWeight: '700',
    color: '#0F172A',
  },

  resourceSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 30,
  },

  resourceGrid: {
    flexDirection: isMobile ? 'column' : 'row',
    gap: 24,
  },

  resourceCard: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 24,
    padding: 30,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },

  resourceTitle: {
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 12,
    color: '#0F172A',
  },

  resourceDesc: {
    color: '#64748B',
    lineHeight: 26,
  },

  ctaSection: {
    paddingVertical: 110,
    paddingHorizontal: 24,
    alignItems: 'center',
  },

  ctaTitle: {
    fontSize: isMobile ? 38 : 60,
    fontWeight: '900',
    color: '#0F172A',
    textAlign: 'center',
  },

  ctaSubtitle: {
    marginTop: 18,
    color: '#64748B',
    fontSize: 18,
    textAlign: 'center',
  },

  ctaBtn: {
    marginTop: 34,
    backgroundColor: '#2563EB',
    paddingHorizontal: 30,
    paddingVertical: 18,
    borderRadius: 20,
  },

  ctaBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 16,
  },

  footer: {
    paddingVertical: 60,
    paddingHorizontal: 24,
    backgroundColor: '#0F172A',
    alignItems: 'center',
  },

  footerBrand: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 28,
    marginBottom: 10,
  },

  footerText: {
    color: '#94A3B8',
    textAlign: 'center',
  },

  footerCopy: {
    marginTop: 30,
    color: '#64748B',
  },
});
