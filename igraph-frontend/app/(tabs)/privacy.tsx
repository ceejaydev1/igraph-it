import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  useWindowDimensions,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Svg, Path } from 'react-native-svg';

// ============================================================================
// COLORS - Matching the app theme
// ============================================================================

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

// Readable-width cap for the document pane on wide screens — matches the
// ~65-75 character line length that's comfortable to read.
const CONTENT_MAX_WIDTH = 720;

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
// CONTENT COMPONENTS
// ============================================================================

const TermsContent = () => (
  <View style={styles.tabContent}>
    <Text style={styles.sectionTitle}>1. Acceptance of Terms</Text>
    <Text style={styles.text}>
      By registering for or using iGraph IT ("Platform"), you agree to be bound by these Terms and
      Conditions. If you disagree with any part, you must not use our Platform.
    </Text>

    <Text style={styles.sectionTitle}>2. Account Registration</Text>
    <Text style={styles.subSection}>2.1 Account Security</Text>
    <Text style={styles.text}>
      • You are responsible for maintaining password confidentiality{'\n'}
      • You must notify us immediately of unauthorized access{'\n'}
      • We are not liable for losses from compromised accounts
    </Text>
    <Text style={styles.subSection}>2.2 Accuracy of Information</Text>
    <Text style={styles.text}>
      You must provide accurate, current, and complete information during registration and update it
      as needed.
    </Text>

    <Text style={styles.sectionTitle}>3. User Conduct</Text>
    <Text style={styles.text}>
      You agree NOT to:{'\n'}
      • Share your account credentials with others{'\n'}
      • Attempt to bypass authentication mechanisms{'\n'}
      • Use automated scripts to access the Platform{'\n'}
      • Upload malicious content or code{'\n'}
      • Attempt to access other users' data{'\n'}
      • Reverse engineer any part of the Platform{'\n'}
      • Use the Platform for illegal activities
    </Text>

    <Text style={styles.sectionTitle}>4. Intellectual Property</Text>
    <Text style={styles.subSection}>4.1 Our Content</Text>
    <Text style={styles.text}>
      All platform content, including UI design, diagrams, educational materials about SDLC and UML,
      and source code is owned by iGraph IT and protected by copyright laws.
    </Text>
    <Text style={styles.subSection}>4.2 Your Content</Text>
    <Text style={styles.text}>
      • You retain ownership of diagrams you create{'\n'}
      • You grant us license to display your content within the Platform, including sharing it with
      collaborators you invite (or who invite you) to a diagram{'\n'}
      • You are responsible for your content's legality
    </Text>

    <Text style={styles.sectionTitle}>5. Authentication and Security</Text>
    <Text style={styles.subSection}>5.1 Token Management</Text>
    <Text style={styles.text}>
      • Access tokens expire after 15 minutes{'\n'}
      • Refresh tokens expire after 7 days{'\n'}
      • You must re-authenticate after token expiration
    </Text>
    <Text style={styles.subSection}>5.2 OTP Verification</Text>
    <Text style={styles.text}>
      • OTPs expire after 5 minutes{'\n'}
      • Maximum 5 OTP requests per account every 15 minutes{'\n'}
      • Do not share OTPs with anyone
    </Text>

    <Text style={styles.sectionTitle}>6. Limitation of Liability</Text>
    <Text style={styles.text}>
      To the maximum extent permitted by law, the Platform is provided "as is" without warranties.
      We are not liable for indirect, incidental, or consequential damages.
    </Text>

    <Text style={styles.sectionTitle}>7. Governing Law</Text>
    <Text style={styles.text}>
      These terms are governed by the laws of the Philippines, without regard to conflict of law
      principles.
    </Text>

    <Text style={styles.sectionTitle}>8. Contact Us</Text>
    <Text style={styles.text}>
      Email: legal@igraphit.com{'\n'}Response time: Within 5 business days
    </Text>

    <Text style={styles.footer}>
      By using iGraph IT, you acknowledge that you have read, understood, and agree to be bound by
      these Terms and Conditions.
    </Text>
  </View>
);

const PrivacyContent = () => (
  <View style={styles.tabContent}>
    <Text style={styles.sectionTitle}>1. Introduction</Text>
    <Text style={styles.text}>
      Welcome to iGraph IT. We are committed to protecting your personal information and your right
      to privacy.
    </Text>

    <Text style={styles.sectionTitle}>2. Information We Collect</Text>
    <Text style={styles.subSection}>2.1 Personal Information You Provide</Text>
    <Text style={styles.text}>
      • Account Information: Full name, email address, password (encrypted){'\n'}
      • Profile Information: Profile picture (optional){'\n'}
      • Authentication Data: Sign-in methods (email/password, or Sign in with Google via Firebase
      Authentication)
    </Text>
    <Text style={styles.subSection}>2.2 Automatically Collected Information</Text>
    <Text style={styles.text}>
      • Usage Data: Pages visited, diagrams created, time spent on platform{'\n'}
      • Device Information: Browser type, operating system, IP address{'\n'}
      • Cookies: Authentication cookies required to keep you signed in (see Section 9)
    </Text>

    <Text style={styles.sectionTitle}>3. How We Use Your Information</Text>
    <Text style={styles.text}>
      We use your information to:{'\n'}
      • Create and manage your account{'\n'}
      • Authenticate your identity and secure your access{'\n'}
      • Send OTP verification and password reset emails{'\n'}
      • Enable real-time collaboration when you share a diagram or accept one shared with you (see
      Section 10){'\n'}
      • Improve our platform and user experience
    </Text>

    <Text style={styles.sectionTitle}>4. Data Storage and Security</Text>
    <Text style={styles.text}>
      • Your password is encrypted using bcrypt (12 rounds){'\n'}
      • Access tokens expire after 15 minutes{'\n'}
      • Refresh tokens expire after 7 days{'\n'}
      • Both tokens are stored in secure, httpOnly cookies your browser sends automatically — they
      can't be read by page scripts, which protects them from theft via cross-site scripting{'\n'}
      • A separate CSRF-protection token guards state-changing requests
    </Text>

    <Text style={styles.sectionTitle}>5. Email Communications</Text>
    <Text style={styles.text}>
      We send account verification OTPs and password reset links. These are essential and cannot be
      opted out of.
    </Text>

    <Text style={styles.sectionTitle}>6. Data Retention</Text>
    <Text style={styles.text}>
      • Account data: Retained until you request deletion (see Section 7) — we don't yet offer a
      self-service "delete account" option inside the app itself{'\n'}
      • Session data: Your sign-in stays valid for 7 days from when you signed in if "Remember Me"
      was selected, or until you close your browser if it wasn't — it does not extend automatically
      just from continued activity
    </Text>

    <Text style={styles.sectionTitle}>7. Your Rights</Text>
    <Text style={styles.text}>
      You have the right to access, correct, delete, or export your personal data. These requests
      are currently handled manually rather than through a self-service tool in the app — email
      privacy@igraphit.com and we will act on your request within 30 days.
    </Text>

    <Text style={styles.sectionTitle}>8. Third-Party Services</Text>
    <Text style={styles.text}>
      We use Firebase (Google) for authentication and database storage, and Brevo for transactional
      email delivery (OTPs, password resets). We do not use advertising, analytics, or tracking
      services, and we do not sell your data to any third party.
    </Text>

    <Text style={styles.sectionTitle}>9. Cookies</Text>
    <Text style={styles.text}>
      We use httpOnly cookies to keep you signed in — one short-lived cookie for your access token
      (15 minutes) and one longer-lived cookie for your refresh token (7 days, or session-only if
      you didn't select "Remember Me"). We also set a CSRF-protection cookie to verify requests
      genuinely come from your browser. These cookies are essential to the Platform working and
      aren't used for advertising or cross-site tracking, so there's no cookie consent banner or
      opt-out — disabling them will sign you out.
    </Text>

    <Text style={styles.sectionTitle}>10. Collaboration and Sharing</Text>
    <Text style={styles.text}>
      When you share a diagram with other users, or someone shares one with you, everyone currently
      viewing that diagram can see, in real time, your display name, user ID, and permission level
      (owner, editor, or viewer). We never show your email address or password to other
      collaborators.
    </Text>

    <Text style={styles.sectionTitle}>11. Children's Privacy</Text>
    <Text style={styles.text}>
      iGraph IT is not intended for children under 13. We do not knowingly collect information from
      children under 13.
    </Text>

    <Text style={styles.sectionTitle}>12. Contact Us</Text>
    <Text style={styles.text}>
      For privacy concerns, contact us at: privacy@igraphit.com
    </Text>

    <Text style={styles.footer}>By using iGraph IT, you agree to this Privacy Policy.</Text>
  </View>
);

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function PrivacyPage() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const scrollViewRef = useRef<ScrollView>(null);

  const [activeTab, setActiveTab] = useState<'terms' | 'privacy'>('terms');
  const [showScrollTop, setShowScrollTop] = useState(false);

  const isDesktop = width >= 1024;
  const isMobile = width < 768;

  const handleTabSwitch = (tab: 'terms' | 'privacy') => {
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
  // screen is only ever reached from there (see userAccount.tsx's "Privacy"
  // action), but router.back() follows whatever the real previous route
  // was, which isn't always Account (e.g. arriving via the tab bar), and
  // would land back on Home instead.
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
      {/* Header — flat, full-width (matches previous layout) */}
      <View style={[styles.header, { paddingTop: insets.top + SPACING.sm }]}>
        <TouchableOpacity onPress={handleBackPress} style={styles.backButton} activeOpacity={0.6}>
          <BackIcon />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Privacy</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Tab Bar — outer spans full width for the divider/background, inner
          caps at the same width as the content below so the tabs line up
          with the text they control instead of spreading to the page edges
          on desktop. */}
      <View style={styles.tabBarOuter}>
        <View style={[styles.tabBarInner, isDesktop && { maxWidth: CONTENT_MAX_WIDTH }]}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'terms' && styles.activeTab]}
            onPress={() => handleTabSwitch('terms')}
          >
            <Text style={[styles.tabText, activeTab === 'terms' && styles.activeTabText]}>
              Terms & Conditions
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'privacy' && styles.activeTab]}
            onPress={() => handleTabSwitch('privacy')}
          >
            <Text style={[styles.tabText, activeTab === 'privacy' && styles.activeTabText]}>
              Privacy Policy
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Content — capped + centered so paragraph lines stay a comfortable
          reading length on wide screens instead of stretching edge to edge */}
      <ScrollView
        ref={scrollViewRef}
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        contentContainerStyle={[
          styles.scrollContentOuter,
          { paddingBottom: isMobile ? SPACING.xxl : SPACING.xxxl },
        ]}
      >
        <View style={[styles.scrollContentInner, isDesktop && { maxWidth: CONTENT_MAX_WIDTH }]}>
          {activeTab === 'terms' ? <TermsContent /> : <PrivacyContent />}
        </View>
      </ScrollView>

      {/* Scroll to Top Button — outer wrapper spans full width and centers its
          child; the inner box carries the maxWidth/padding and right-aligns
          the button within it. This mirrors the header/tab-bar pattern above
          instead of fighting absolute left/right insets against a maxWidth,
          which is what caused the button to hug the left edge on desktop. */}
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

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
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

  // Tab Bar
  tabBarOuter: {
    flexDirection: 'row',
    justifyContent: 'center',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  tabBarInner: {
    flexDirection: 'row',
    width: '100%',
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

  // Tab Content
  tabContent: {
    paddingVertical: SPACING.sm,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.primary,
    marginTop: SPACING.xl,
    marginBottom: SPACING.sm,
  },
  subSection: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginTop: SPACING.md,
    marginBottom: SPACING.xs,
  },
  text: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 22,
    marginBottom: SPACING.sm,
  },
  footer: {
    fontSize: 12,
    color: COLORS.textTertiary,
    textAlign: 'center',
    marginTop: SPACING.xxxl,
    paddingTop: SPACING.lg,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },

  // Scroll to Top Button
  // Outer: absolutely positioned, spans full width, centers its child.
  // Inner: normal-flow width/maxWidth box (no left/right insets), so it
  // centers correctly via the outer's alignItems and shrinks cleanly on
  // desktop. The button sits flush to the inner's right edge, lining up
  // with the back button and tab-bar right edge above.
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