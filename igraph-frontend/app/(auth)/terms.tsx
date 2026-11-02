import React, { useCallback, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  useWindowDimensions,
  Platform,
  Linking,
  LayoutChangeEvent,
  NativeScrollEvent,
  NativeSyntheticEvent,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Svg, Path } from 'react-native-svg';

// ============================================================================
// TOKENS
// ============================================================================

const COLORS = {
  primary: '#4c6fff',
  primaryLight: '#eef2ff',
  primaryDark: '#3b4fcc', // use for small text (passes WCAG AA on white)
  surface: '#FFFFFF',
  background: '#f8faff',
  textPrimary: '#0F172A', // headings          (~17:1 on background)
  textSecondary: '#334155', // body            (~9:1)
  textTertiary: '#64748B', // meta / inactive  (~4.7:1, was #94A3B8 = 2.6:1)
  border: '#E2E8F0',
  borderLight: '#F1F5F9',
  shadow: '#0F172A',
};

const SPACING = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, xxxl: 32, huge: 48 };
const RADIUS = { sm: 8, md: 12, lg: 16, xl: 20, full: 999 };

// Update this whenever the legal text changes.
const LAST_UPDATED = 'October 30, 2026';

const CONTENT_MAX_WIDTH = 720; // ~65-75 characters per line
const SIDEBAR_WIDTH = 240;
const BODY_MAX_WIDTH = CONTENT_MAX_WIDTH + SIDEBAR_WIDTH + SPACING.xxxl + SPACING.xl * 2;
const SCROLL_SPY_OFFSET = 140; // how far below the top a section "becomes active"

// ============================================================================
// CONTENT (data-driven so the TOC, scroll-spy and layout all come from one source)
// ============================================================================

type Block =
  | { type: 'p'; text: string }
  | { type: 'sub'; text: string }
  | { type: 'list'; items: string[]; labelled?: boolean; plain?: boolean };

type Section = { id: string; title: string; blocks: Block[] };

type Doc = { id: 'terms' | 'privacy'; tabLabel: string; title: string; sections: Section[]; footer: string };

const TERMS: Doc = {
  id: 'terms',
  tabLabel: 'Terms & Conditions',
  title: 'Terms & Conditions',
  footer:
    'By using iGraph IT, you acknowledge that you have read, understood, and agree to be bound by these Terms and Conditions.',
  sections: [
    {
      id: 'terms-1',
      title: '1. Acceptance of Terms',
      blocks: [
        {
          type: 'p',
          text: 'By registering for or using iGraph IT ("Platform"), you agree to be bound by these Terms and Conditions. If you disagree with any part, you must not use our Platform.',
        },
      ],
    },
    {
      id: 'terms-2',
      title: '2. Account Registration',
      blocks: [
        { type: 'sub', text: '2.1 Account Security' },
        {
          type: 'list',
          items: [
            'You are responsible for maintaining password confidentiality',
            'You must notify us immediately of unauthorized access',
            'We are not liable for losses from compromised accounts',
          ],
        },
        { type: 'sub', text: '2.2 Accuracy of Information' },
        {
          type: 'p',
          text: 'You must provide accurate, current, and complete information during registration and update it as needed.',
        },
      ],
    },
    {
      id: 'terms-3',
      title: '3. User Conduct',
      blocks: [
        { type: 'p', text: 'You agree NOT to:' },
        {
          type: 'list',
          items: [
            'Share your account credentials with others',
            'Attempt to bypass authentication mechanisms',
            'Use automated scripts to access the Platform',
            'Upload malicious content or code',
            "Attempt to access other users' data",
            'Reverse engineer any part of the Platform',
            'Use the Platform for illegal activities',
          ],
        },
      ],
    },
    {
      id: 'terms-4',
      title: '4. Intellectual Property',
      blocks: [
        { type: 'sub', text: '4.1 Our Content' },
        {
          type: 'p',
          text: 'All platform content, including UI design, diagrams, educational materials about SDLC and UML, and source code is owned by iGraph IT and protected by copyright laws.',
        },
        { type: 'sub', text: '4.2 Your Content' },
        {
          type: 'list',
          items: [
            'You retain ownership of diagrams you create',
            'You grant us license to display your content within the Platform, including sharing it with collaborators you invite (or who invite you) to a diagram',
            "You are responsible for your content's legality",
          ],
        },
      ],
    },
    {
      id: 'terms-5',
      title: '5. Authentication and Security',
      blocks: [
        { type: 'sub', text: '5.1 Token Management' },
        {
          type: 'list',
          items: [
            'Access tokens expire after 15 minutes',
            'Refresh tokens expire after 7 days',
            'You must re-authenticate after token expiration',
          ],
        },
        { type: 'sub', text: '5.2 OTP Verification' },
        {
          type: 'list',
          items: [
            'OTPs expire after 5 minutes',
            'Maximum 5 OTP requests per account every 15 minutes',
            'Do not share OTPs with anyone',
          ],
        },
      ],
    },
    {
      id: 'terms-6',
      title: '6. Limitation of Liability',
      blocks: [
        {
          type: 'p',
          text: 'To the maximum extent permitted by law, the Platform is provided "as is" without warranties. We are not liable for indirect, incidental, or consequential damages.',
        },
      ],
    },
    {
      id: 'terms-7',
      title: '7. Governing Law',
      blocks: [
        {
          type: 'p',
          text: 'These terms are governed by the laws of the Philippines, without regard to conflict of law principles.',
        },
      ],
    },
    {
      id: 'terms-8',
      title: '8. Contact Us',
      blocks: [
        {
          type: 'list',
          plain: true,
          labelled: true,
          items: ['Email: legal@igraphit.com', 'Response time: Within 5 business days'],
        },
      ],
    },
  ],
};

const PRIVACY: Doc = {
  id: 'privacy',
  tabLabel: 'Privacy Policy',
  title: 'Privacy Policy',
  footer: 'By using iGraph IT, you agree to this Privacy Policy.',
  sections: [
    {
      id: 'privacy-1',
      title: '1. Introduction',
      blocks: [
        {
          type: 'p',
          text: 'Welcome to iGraph IT. We are committed to protecting your personal information and your right to privacy.',
        },
      ],
    },
    {
      id: 'privacy-2',
      title: '2. Information We Collect',
      blocks: [
        { type: 'sub', text: '2.1 Personal Information You Provide' },
        {
          type: 'list',
          labelled: true,
          items: [
            'Account Information: Full name, email address, password (encrypted)',
            'Profile Information: Profile picture (optional)',
            'Authentication Data: Sign-in methods (email/password, or Sign in with Google via Firebase Authentication)',
          ],
        },
        { type: 'sub', text: '2.2 Automatically Collected Information' },
        {
          type: 'list',
          labelled: true,
          items: [
            'Usage Data: Pages visited, diagrams created, time spent on platform',
            'Device Information: Browser type, operating system, IP address',
            'Cookies: Authentication cookies required to keep you signed in (see Section 9)',
          ],
        },
      ],
    },
    {
      id: 'privacy-3',
      title: '3. How We Use Your Information',
      blocks: [
        { type: 'p', text: 'We use your information to:' },
        {
          type: 'list',
          items: [
            'Create and manage your account',
            'Authenticate your identity and secure your access',
            'Send OTP verification and password reset emails',
            'Enable real-time collaboration when you share a diagram or accept one shared with you (see Section 10)',
            'Improve our platform and user experience',
          ],
        },
      ],
    },
    {
      id: 'privacy-4',
      title: '4. Data Storage and Security',
      blocks: [
        {
          type: 'list',
          items: [
            'Your password is encrypted using bcrypt (12 rounds)',
            'Access tokens expire after 15 minutes',
            'Refresh tokens expire after 7 days',
            "Both tokens are stored in secure, httpOnly cookies your browser sends automatically — they can't be read by page scripts, which protects them from theft via cross-site scripting",
            'A separate CSRF-protection token guards state-changing requests',
          ],
        },
      ],
    },
    {
      id: 'privacy-5',
      title: '5. Email Communications',
      blocks: [
        {
          type: 'p',
          text: 'We send account verification OTPs and password reset links. These are essential and cannot be opted out of.',
        },
      ],
    },
    {
      id: 'privacy-6',
      title: '6. Data Retention',
      blocks: [
        {
          type: 'list',
          labelled: true,
          items: [
            'Account data: Retained until you request deletion (see Section 7) — we don\'t yet offer a self-service "delete account" option inside the app itself',
            'Session data: Your sign-in stays valid for 7 days from when you signed in if "Remember Me" was selected, or until you close your browser if it wasn\'t — it does not extend automatically just from continued activity',
          ],
        },
      ],
    },
    {
      id: 'privacy-7',
      title: '7. Your Rights',
      blocks: [
        {
          type: 'p',
          text: 'You have the right to access, correct, delete, or export your personal data. These requests are currently handled manually rather than through a self-service tool in the app — email privacy@igraphit.com and we will act on your request within 30 days.',
        },
      ],
    },
    {
      id: 'privacy-8',
      title: '8. Third-Party Services',
      blocks: [
        {
          type: 'p',
          text: 'We use Firebase (Google) for authentication and database storage, and Brevo for transactional email delivery (OTPs, password resets). We do not use advertising, analytics, or tracking services, and we do not sell your data to any third party.',
        },
      ],
    },
    {
      id: 'privacy-9',
      title: '9. Cookies',
      blocks: [
        {
          type: 'p',
          text: 'We use httpOnly cookies to keep you signed in — one short-lived cookie for your access token (15 minutes) and one longer-lived cookie for your refresh token (7 days, or session-only if you didn\'t select "Remember Me"). We also set a CSRF-protection cookie to verify requests genuinely come from your browser. These cookies are essential to the Platform working and aren\'t used for advertising or cross-site tracking, so there\'s no cookie consent banner or opt-out — disabling them will sign you out.',
        },
      ],
    },
    {
      id: 'privacy-10',
      title: '10. Collaboration and Sharing',
      blocks: [
        {
          type: 'p',
          text: 'When you share a diagram with other users, or someone shares one with you, everyone currently viewing that diagram can see, in real time, your display name, user ID, and permission level (owner, editor, or viewer). We never show your email address or password to other collaborators.',
        },
      ],
    },
    {
      id: 'privacy-11',
      title: "11. Children's Privacy",
      blocks: [
        {
          type: 'p',
          text: 'iGraph IT is not intended for children under 13. We do not knowingly collect information from children under 13.',
        },
      ],
    },
    {
      id: 'privacy-12',
      title: '12. Contact Us',
      blocks: [{ type: 'p', text: 'For privacy concerns, contact us at: privacy@igraphit.com' }],
    },
  ],
};

const DOCS: Record<'terms' | 'privacy', Doc> = { terms: TERMS, privacy: PRIVACY };

// ============================================================================
// SMALL PIECES
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

const EMAIL_RE = /([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})/g;

// Turns any email address in a string into a tappable mailto: link.
const renderInline = (text: string) =>
  text.split(EMAIL_RE).map((part, i) =>
    i % 2 === 1 ? (
      <Text
        key={i}
        style={styles.link}
        accessibilityRole="link"
        onPress={() => Linking.openURL(`mailto:${part}`)}
      >
        {part}
      </Text>
    ) : (
      part
    )
  );

const BlockView = ({ block }: { block: Block }) => {
  switch (block.type) {
    case 'sub':
      return (
        <Text style={styles.subSection} accessibilityRole="header">
          {block.text}
        </Text>
      );
    case 'p':
      return (
        <Text style={styles.text} selectable>
          {renderInline(block.text)}
        </Text>
      );
    case 'list':
      // Real list structure: each item is its own row with a hanging bullet,
      // so wrapped lines align under the text instead of under the "•".
      return (
        <View style={styles.list} role="list">
          {block.items.map((item, i) => {
            const m = block.labelled ? item.match(/^([^:]+):\s+(.*)$/) : null;
            return (
              <View key={i} style={styles.listItem} role="listitem">
                {!block.plain && <View style={styles.bullet} />}
                <Text style={styles.listText} selectable>
                  {m ? (
                    <>
                      <Text style={styles.listLabel}>{m[1]}: </Text>
                      {renderInline(m[2])}
                    </>
                  ) : (
                    renderInline(item)
                  )}
                </Text>
              </View>
            );
          })}
        </View>
      );
  }
};

type NavProps = { sections: Section[]; activeId: string; onSelect: (id: string) => void };

// Desktop: sticky "On this page" sidebar
const TableOfContents = ({ sections, activeId, onSelect }: NavProps) => (
  <View accessibilityLabel="Table of contents">
    <Text style={styles.tocLabel}>On this page</Text>
    {sections.map((s) => {
      const active = s.id === activeId;
      return (
        <TouchableOpacity
          key={s.id}
          onPress={() => onSelect(s.id)}
          activeOpacity={0.6}
          style={[styles.tocItem, active && styles.tocItemActive]}
          accessibilityRole="link"
          accessibilityState={{ selected: active }}
        >
          <Text style={[styles.tocText, active && styles.tocTextActive]} numberOfLines={2}>
            {s.title}
          </Text>
        </TouchableOpacity>
      );
    })}
  </View>
);

// Mobile / tablet: horizontally scrolling section chips
const SectionChips = ({ sections, activeId, onSelect }: NavProps) => (
  <View style={styles.chipsBar}>
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.chipsContent}
      accessibilityLabel="Jump to section"
    >
      {sections.map((s) => {
        const active = s.id === activeId;
        return (
          <TouchableOpacity
            key={s.id}
            onPress={() => onSelect(s.id)}
            activeOpacity={0.7}
            style={[styles.chip, active && styles.chipActive]}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
          >
            <Text style={[styles.chipText, active && styles.chipTextActive]}>
              {s.title.replace(/^\d+\.\s*/, '')}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
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
  const [activeSection, setActiveSection] = useState<string>(TERMS.sections[0].id);
  const [showScrollTop, setShowScrollTop] = useState(false);

  // Section positions, measured on layout, used for TOC jumps + scroll-spy.
  const sectionY = useRef<Record<string, number>>({});
  const innerY = useRef(0);

  const isDesktop = width >= 1024;
  const isMobile = width < 768;
  const doc = DOCS[activeTab];

  const absoluteY = (id: string) => innerY.current + (sectionY.current[id] ?? 0);

  const handleTabSwitch = (tab: 'terms' | 'privacy') => {
    if (tab === activeTab) return;
    sectionY.current = {};
    setActiveTab(tab);
    setActiveSection(DOCS[tab].sections[0].id);
    setShowScrollTop(false);
    scrollViewRef.current?.scrollTo({ y: 0, animated: false });
  };

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const y = event.nativeEvent.contentOffset.y;
      setShowScrollTop(y > 300);

      // Scroll-spy: the last section whose top has passed the threshold wins.
      const probe = y + SCROLL_SPY_OFFSET;
      let current = DOCS[activeTab].sections[0].id;
      for (const s of DOCS[activeTab].sections) {
        const top = innerY.current + (sectionY.current[s.id] ?? Number.POSITIVE_INFINITY);
        if (top <= probe) current = s.id;
      }
      setActiveSection((prev) => (prev === current ? prev : current));
    },
    [activeTab]
  );

  const scrollToSection = (id: string) => {
    setActiveSection(id);
    scrollViewRef.current?.scrollTo({ y: Math.max(absoluteY(id) - SPACING.lg, 0), animated: true });
  };

  const scrollToTop = () => scrollViewRef.current?.scrollTo({ y: 0, animated: true });

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

  const nav = { sections: doc.sections, activeId: activeSection, onSelect: scrollToSection };

  return (
    <View style={styles.container}>
      {/* Header — generic "Legal" so it's correct for both tabs */}
      <View style={[styles.header, { paddingTop: insets.top + SPACING.sm }]}>
        <TouchableOpacity
          onPress={handleBackPress}
          style={styles.backButton}
          activeOpacity={0.6}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <BackIcon />
        </TouchableOpacity>
        <Text style={styles.headerTitle} accessibilityRole="header">
          Legal
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Tab bar */}
      <View style={styles.tabBar} accessibilityRole="tablist">
        {(['terms', 'privacy'] as const).map((tab) => {
          const selected = activeTab === tab;
          return (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, selected && styles.activeTab]}
              onPress={() => handleTabSwitch(tab)}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
            >
              <Text style={[styles.tabText, selected && styles.activeTabText]}>
                {DOCS[tab].tabLabel}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Mobile/tablet: section chips (fixed, outside the scroll area) */}
      {!isDesktop && <SectionChips {...nav} />}

      {/* Body: sticky TOC sidebar + scrolling document */}
      <View style={[styles.body, isDesktop && styles.bodyDesktop]}>
        {isDesktop && (
          <ScrollView
            style={styles.sidebar}
            contentContainerStyle={styles.sidebarContent}
            showsVerticalScrollIndicator={false}
          >
            <TableOfContents {...nav} />
          </ScrollView>
        )}

        <ScrollView
          ref={scrollViewRef}
          style={styles.scroll}
          showsVerticalScrollIndicator={false}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          contentContainerStyle={[
            styles.scrollContentOuter,
            { paddingBottom: isMobile ? SPACING.xxl : SPACING.huge },
          ]}
        >
          <View
            style={[styles.scrollContentInner, isDesktop && { maxWidth: CONTENT_MAX_WIDTH }]}
            onLayout={(e: LayoutChangeEvent) => {
              innerY.current = e.nativeEvent.layout.y;
            }}
          >
            <View style={[styles.card, !isMobile && styles.cardRoomy]}>
              {/* Document title + last updated */}
              <View>
                <Text style={styles.docTitle} accessibilityRole="header">
                  {doc.title}
                </Text>
                <Text style={styles.updated}>Last updated {LAST_UPDATED}</Text>
              </View>

              {doc.sections.map((section) => (
                <View
                  key={section.id}
                  style={styles.section}
                  onLayout={(e: LayoutChangeEvent) => {
                    // y is relative to the card, which sits at y=0 inside scrollContentInner.
                    sectionY.current[section.id] = e.nativeEvent.layout.y;
                  }}
                >
                  <Text style={styles.sectionTitle} accessibilityRole="header">
                    {section.title}
                  </Text>
                  {section.blocks.map((block, i) => (
                    <BlockView key={i} block={block} />
                  ))}
                </View>
              ))}

              <Text style={styles.footer}>{doc.footer}</Text>
            </View>
          </View>
        </ScrollView>
      </View>

      {/* Back to top — right edge lines up with the content column */}
      {showScrollTop && (
        <View pointerEvents="box-none" style={styles.scrollTopOuter}>
          <View
            pointerEvents="box-none"
            style={[styles.scrollTopInner, isDesktop && { maxWidth: BODY_MAX_WIDTH }]}
          >
            <TouchableOpacity
              style={styles.scrollTopButton}
              onPress={scrollToTop}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Back to top"
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
    width: 44, // 44pt minimum touch target
    height: 44,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    ...Platform.select({
      ios: {
        shadowColor: COLORS.shadow,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
      },
      android: { elevation: 1 },
    }),
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.textPrimary,
    letterSpacing: -0.3,
  },
  headerSpacer: {
    width: 44,
  },

  // Tab bar
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
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: COLORS.primary,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textTertiary,
  },
  activeTabText: {
    color: COLORS.primaryDark,
  },

  // Section chips (mobile / tablet)
  chipsBar: {
    backgroundColor: COLORS.background,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  chipsContent: {
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    gap: SPACING.sm,
  },
  chip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  chipActive: {
    backgroundColor: COLORS.primaryLight,
    borderColor: COLORS.primary,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
  chipTextActive: {
    color: COLORS.primaryDark,
    fontWeight: '700',
  },

  // Body layout
  body: {
    flex: 1,
  },
  bodyDesktop: {
    flexDirection: 'row',
    width: '100%',
    maxWidth: BODY_MAX_WIDTH,
    alignSelf: 'center',
    paddingHorizontal: SPACING.xl,
    gap: SPACING.xxxl,
  },

  // Sidebar TOC (desktop)
  sidebar: {
    width: SIDEBAR_WIDTH,
    flexGrow: 0,
    flexShrink: 0,
  },
  sidebarContent: {
    paddingTop: SPACING.xxl,
    paddingBottom: SPACING.xxxl,
  },
  tocLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
    paddingLeft: SPACING.md,
  },
  tocItem: {
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderLeftWidth: 2,
    borderLeftColor: COLORS.border,
  },
  tocItemActive: {
    borderLeftColor: COLORS.primary,
    backgroundColor: COLORS.primaryLight,
    borderTopRightRadius: RADIUS.sm,
    borderBottomRightRadius: RADIUS.sm,
  },
  tocText: {
    fontSize: 14,
    lineHeight: 20,
    color: COLORS.textSecondary,
  },
  tocTextActive: {
    color: COLORS.primaryDark,
    fontWeight: '700',
  },

  // Scroll content
  scroll: {
    flex: 1,
  },
  scrollContentOuter: {
    flexGrow: 1,
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.xl,
  },
  scrollContentInner: {
    width: '100%',
  },

  // Document card
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.xxl,
  },
  cardRoomy: {
    paddingHorizontal: SPACING.huge,
    paddingVertical: SPACING.xxxl + SPACING.sm,
  },
  docTitle: {
    fontSize: 30,
    lineHeight: 38,
    fontWeight: '800',
    color: COLORS.textPrimary,
    letterSpacing: -0.6,
  },
  updated: {
    fontSize: 13,
    color: COLORS.textTertiary,
    marginTop: SPACING.xs,
  },

  // Sections
  section: {
    marginTop: SPACING.xxxl,
  },
  sectionTitle: {
    fontSize: 20,
    lineHeight: 28,
    fontWeight: '700',
    color: COLORS.primary,
    marginBottom: SPACING.md,
  },
  subSection: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginTop: SPACING.lg,
    marginBottom: SPACING.sm,
  },
  text: {
    fontSize: 15,
    lineHeight: 24,
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
  },

  // Lists
  list: {
    marginBottom: SPACING.sm,
    gap: SPACING.xs + 2,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  bullet: {
    width: 5,
    height: 5,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.primary,
    marginTop: 10, // centres the dot on the first line of 15/24 text
    marginRight: SPACING.md,
    marginLeft: SPACING.xs,
  },
  listText: {
    flex: 1,
    fontSize: 15,
    lineHeight: 24,
    color: COLORS.textSecondary,
  },
  listLabel: {
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  link: {
    color: COLORS.primaryDark,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },

  footer: {
    fontSize: 13,
    lineHeight: 20,
    color: COLORS.textTertiary,
    textAlign: 'center',
    marginTop: SPACING.huge,
    paddingTop: SPACING.lg,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },

  // Back to top
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