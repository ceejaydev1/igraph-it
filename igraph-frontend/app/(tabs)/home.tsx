import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Platform,
  Pressable,
  Keyboard,
  FlatList,
  useWindowDimensions,
  LayoutAnimation,
  UIManager,
  Animated,
  Easing,
  RefreshControl,
  Image,
  AccessibilityInfo,
  ImageSourcePropType,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Svg, Path, Circle, Defs, Pattern, Rect } from 'react-native-svg';
import { DIAGRAM_ICON_MAP, GenericDiagramGlyph } from '../../constants/diagramTypeIcons';
import { useOnboardingTour } from '../../hooks/useOnboardingTour';
import { usePullToRefreshWeb } from '../../hooks/usePullToRefreshWeb';
import { HOME_TOUR_ID, getHomeTourSteps } from '../../utils/tours';
import { PullToRefreshIndicator } from '../../components/PullToRefreshIndicator';
import { usePageTitle } from '../../utils/usePageTitle';

// Enable LayoutAnimation on Android (safe check)
if (Platform.OS === 'android') {
  if (UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
  }
}

/* -------------------------------------------------------------------------- */
/*  Types & data                                                              */
/* -------------------------------------------------------------------------- */

interface Diagram {
  id: number;
  title: string;
  type: 'UML' | 'SDLC';
  tagline: string;
  image?: ImageSourcePropType;
}

type TabType = 'All' | 'UML' | 'SDLC';

// Images and taglines mirror diagram/[id].tsx so a card previews exactly what
// the detail page opens with. Keep the two in sync when either changes.
const DIAGRAMS: Diagram[] = [
  { id: 1, title: 'Functional Decomposition Diagram', type: 'UML', tagline: 'Breaks a system down into a hierarchy of functions and sub functions, showing what the system does at every level.', image: require('../../assets/uml/FDD.png') },
  { id: 2, title: 'Flowchart', type: 'UML', tagline: 'Maps a process step by step using standardized shapes, following the order the steps actually happen in.', image: require('../../assets/uml/Flowchart.png') },
  { id: 3, title: 'Data Flow Diagram', type: 'UML', tagline: 'Traces how data moves through a system, between processes, external entities, and data stores.', image: require('../../assets/uml/DFD.png') },
  { id: 4, title: 'Entity Relationship Diagram', type: 'UML', tagline: 'Maps the entities in a system and the relationships between them, most often to design a database.', image: require('../../assets/uml/ERD.png') },
  { id: 5, title: 'Fishbone Diagram', type: 'UML', tagline: 'Traces a problem back to its possible root causes, organized into major categories along a central spine.', image: require('../../assets/uml/Fishbone.png') },
  { id: 6, title: 'Schematic Diagram', type: 'UML', tagline: 'Represents an electrical circuit using standardized component symbols and the wires connecting them.', image: require('../../assets/uml/Schematic.png') },
  { id: 7, title: 'Use Case Diagram', type: 'UML', tagline: 'Shows the goals different actors accomplish with a system, without describing how those goals are carried out.', image: require('../../assets/uml/Use Case.png') },
  { id: 8, title: 'Activity Diagram', type: 'UML', tagline: 'Models the flow of actions in a process, including decisions, parallel paths, and where the flow ends.', image: require('../../assets/uml/Activity Diagram.png') },
  { id: 9, title: 'Sequence Diagram', type: 'UML', tagline: 'Shows the order messages pass between objects over time, read top to bottom.', image: require('../../assets/uml/Sequence.png') },
  { id: 10, title: 'Class Diagram', type: 'UML', tagline: "Maps a system's classes, attributes, and relationships into one static structural view.", image: require('../../assets/uml/Class Diagram.png') },
  { id: 11, title: 'Waterfall Model', type: 'SDLC', tagline: 'The classic, linear approach to the SDLC. Each phase must fully finish before the next one begins.', image: require('../../assets/diagram library/Waterfall.png') },
  { id: 12, title: 'Modified Waterfall Model', type: 'SDLC', tagline: 'A Waterfall variant that lets adjacent phases overlap so problems surface before final testing, not after.', image: require('../../assets/diagram library/Modified Waterfall.png') },
  { id: 13, title: 'Big Bang Model', type: 'SDLC', tagline: 'Starts coding with little to no planning and lets the requirements take shape as the work happens.', image: require('../../assets/diagram library/bigbang2.png') },
  { id: 14, title: 'Prototype Model', type: 'SDLC', tagline: 'Builds a working mock up first, then refines it with user feedback until the real system takes shape.', image: require('../../assets/diagram library/Prototype.jpg') },
  { id: 15, title: 'Agile Model', type: 'SDLC', tagline: 'A flexible, iterative approach built around adapting to changing requirements through continuous collaboration.', image: require('../../assets/diagram library/Agile.png') },
  { id: 16, title: 'Iterative Model', type: 'SDLC', tagline: 'Builds the system in repeated cycles, starting with a small working version and expanding it each pass.', image: require('../../assets/diagram library/Iterative.png') },
  { id: 17, title: 'V Model', type: 'SDLC', tagline: 'Pairs every development phase with a matching testing phase, shaped like the letter V.', image: require('../../assets/diagram library/V-Model.png') },
  { id: 18, title: 'Rapid Application Development', type: 'SDLC', tagline: 'Trades heavy planning done in advance for fast, iterative prototyping built through close user involvement.', image: require('../../assets/diagram library/RAD.jpg') },
  { id: 19, title: 'Spiral Model', type: 'SDLC', tagline: 'Combines Prototyping and Waterfall into repeating loops driven by risk, best suited to large, complex projects.', image: require('../../assets/diagram library/spiral-model.jpg') },
];

// `primary` is for fills and decoration; `strong` is the darker shade used for
// text so it clears WCAG AA contrast on white and on the light tint. `paper` is
// the faint tint of the drafting-paper tile behind each card's preview, so the
// two categories are told apart by the sheet itself, not only by a small badge.
const TYPE_COLORS = {
  UML: { primary: '#4c6fff', strong: '#3b5bdb', light: '#eef2ff', paper: '#f5f8ff' },
  SDLC: { primary: '#10b981', strong: '#047857', light: '#ecfdf5', paper: '#f3fbf7' },
} as const;

const COLORS = {
  brand: '#4c6fff',
  brandStrong: '#3b5bdb',
  brandPressed: '#2f49c7',
  title: '#1a1f36',
  ink: '#0f172a',
  body: '#475569',
  muted: '#64748b', // placeholders, icons, helper text (AA on white)
  border: '#e2e8f0',
  page: '#f8fafc',
};

const TABS: TabType[] = ['All', 'SDLC', 'UML'];

const SUGGESTED_SEARCHES = ['Agile', 'Database', 'Flow'];

// Search covers the title, the type AND the tagline, so "database" finds the
// ERD and "risk" finds the Spiral model. Every word has to match (any order).
// Lower-cased once here instead of on every keystroke.
const SEARCH_INDEX = new Map<number, string>(
  DIAGRAMS.map((d) => [d.id, `${d.title} ${d.type} ${d.tagline}`.toLowerCase()])
);

const matchesQuery = (diagram: Diagram, query: string) => {
  if (!query) return true;
  const haystack = SEARCH_INDEX.get(diagram.id) ?? '';
  return query.split(/\s+/).every((term) => haystack.includes(term));
};

/* -------------------------------------------------------------------------- */
/*  Accessibility helpers                                                     */
/* -------------------------------------------------------------------------- */

// Focus rings should show for keyboard users, not after a mouse click.
let keyboardNavigation = false;
if (Platform.OS === 'web' && typeof window !== 'undefined') {
  window.addEventListener('keydown', (e) => { if (e.key === 'Tab') keyboardNavigation = true; }, true);
  window.addEventListener('pointerdown', () => { keyboardNavigation = false; }, true);
}

const webFocusRing: any =
  Platform.OS === 'web'
    ? { outlineWidth: 2, outlineStyle: 'solid', outlineColor: COLORS.brand, outlineOffset: 2 }
    : null;

const useKeyboardFocus = () => {
  const [kbFocus, setKbFocus] = useState(false);
  return {
    kbFocus,
    focusProps: {
      onFocus: () => setKbFocus(Platform.OS === 'web' && keyboardNavigation),
      onBlur: () => setKbFocus(false),
    },
  };
};

const useReduceMotion = (): boolean => {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((value) => { if (mounted) setReduce(value); })
      .catch(() => {});
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduce);
    return () => {
      mounted = false;
      sub?.remove?.();
    };
  }, []);
  return reduce;
};

/* -------------------------------------------------------------------------- */
/*  Responsive grid                                                           */
/* -------------------------------------------------------------------------- */

const GRID_GAP = 16;
const MAX_CONTENT_WIDTH = 1280;
const MAX_SINGLE_COLUMN_WIDTH = 520;

const useResponsiveLayout = () => {
  const { width } = useWindowDimensions();

  return useMemo(() => {
    const isMobile = width < 768;
    const isTablet = width >= 768 && width < 1024;
    const isDesktop = width >= 1024;
    const isWide = width >= 1280;

    const containerPadding = isMobile ? 16 : isTablet ? 24 : 32;
    const numColumns = width < 640 ? 1 : width < 1024 ? 2 : isWide ? 4 : 3;

    // The grid never grows past MAX_CONTENT_WIDTH, so cards on a very wide
    // screen keep the same size as on a 1280px one and the grid centers.
    const contentWidth = Math.min(width - containerPadding * 2, MAX_CONTENT_WIDTH);
    const rawCard = (contentWidth - GRID_GAP * (numColumns - 1)) / numColumns;
    const cardWidth = Math.floor(numColumns === 1 ? Math.min(rawCard, MAX_SINGLE_COLUMN_WIDTH) : rawCard);

    return { isMobile, isTablet, isDesktop, isWide, cardWidth, containerPadding, numColumns };
  }, [width]);
};

/* -------------------------------------------------------------------------- */
/*  Background & skeletons                                                    */
/* -------------------------------------------------------------------------- */

const DOT_SPACING = 32;
const DOT_SIZE = 1.4;

const webDots: any =
  Platform.OS === 'web'
    ? {
        backgroundImage: 'radial-gradient(circle, rgba(76, 111, 255, 0.14) 1.4px, transparent 1.6px)',
        backgroundSize: `${DOT_SPACING}px ${DOT_SPACING}px`,
      }
    : null;

const DotGrid = React.memo(function DotGrid() {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();

  // On the web a single CSS gradient draws the dots.
  if (Platform.OS === 'web') {
    return <View style={[styles.dotGridContainer, webDots]} pointerEvents="none" />;
  }

  // On native, one <Pattern> tile repeated by a single <Rect> replaces what used
  // to be ~1,700 individual <Circle> nodes (a full viewport of them).
  return (
    <View style={styles.dotGridContainer} pointerEvents="none">
      <Svg width={screenWidth} height={screenHeight}>
        <Defs>
          <Pattern id="home-dots" width={DOT_SPACING} height={DOT_SPACING} patternUnits="userSpaceOnUse">
            <Circle cx={DOT_SPACING / 2} cy={DOT_SPACING / 2} r={DOT_SIZE} fill={COLORS.brand} opacity={0.12} />
          </Pattern>
        </Defs>
        <Rect width={screenWidth} height={screenHeight} fill="url(#home-dots)" />
      </Svg>
    </View>
  );
});

// One shared pulse drives every skeleton block on screen. Before, each block
// ran its own looping animation (30+ at once on a desktop skeleton). The loop
// starts with the first block that mounts and stops with the last one.
const shimmerPulse = new Animated.Value(0);
let shimmerUsers = 0;
let shimmerLoop: Animated.CompositeAnimation | null = null;

const acquireShimmer = () => {
  if (shimmerUsers++ === 0) {
    shimmerLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerPulse, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(shimmerPulse, { toValue: 0, duration: 900, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ])
    );
    shimmerLoop.start();
  }
  return () => {
    if (--shimmerUsers === 0) {
      shimmerLoop?.stop();
      shimmerLoop = null;
    }
  };
};

const Shimmer = ({ width, height, borderRadius = 8, style = {} }: {
  width: number | string;
  height: number;
  borderRadius?: number;
  style?: any;
}) => {
  const reduceMotion = useReduceMotion();

  useEffect(() => (reduceMotion ? undefined : acquireShimmer()), [reduceMotion]);

  const opacity = shimmerPulse.interpolate({ inputRange: [0, 1], outputRange: [0, 0.55] });

  return (
    <View style={[styles.shimmerContainer, { width, height, borderRadius }, style]}>
      {!reduceMotion && <Animated.View style={[styles.shimmer, { opacity }]} />}
    </View>
  );
};

const CardSkeleton = ({ cardWidth }: { cardWidth: number }) => {
  // Matches DiagramCard: 8px padding around a 2:1 preview.
  const previewHeight = Math.max((cardWidth - 16) / 2, 60);

  return (
    <View style={[styles.skeletonCard, { width: cardWidth }]}>
      <Shimmer width="100%" height={previewHeight} borderRadius={10} />
      <View style={styles.skeletonCardContent}>
        <Shimmer width="70%" height={18} borderRadius={4} style={{ marginBottom: 10 }} />
        <Shimmer width="100%" height={12} borderRadius={4} style={{ marginBottom: 6 }} />
        <Shimmer width="85%" height={12} borderRadius={4} style={{ marginBottom: 14 }} />
        <Shimmer width={56} height={24} borderRadius={6} />
      </View>
    </View>
  );
};

// Exported so app/(tabs)/_layout.tsx can show this same skeleton (matching
// Home's actual responsive grid via useResponsiveLayout, unlike the plain,
// unused-elsewhere HomeGridSkeleton in components/SkeletonLoader.tsx) while
// it re-verifies the session on every focus — replacing what used to be a
// bare transparent View there (nothing behind it but the raw page
// background, i.e. a white flash) with a loading state that actually reads
// as "loading" instead of "broken".
export const HomeGridSkeleton = () => {
  const { cardWidth, numColumns, containerPadding } = useResponsiveLayout();
  const frame = { paddingHorizontal: containerPadding, maxWidth: MAX_CONTENT_WIDTH + containerPadding * 2 };

  return (
    <View style={styles.skeletonContainer}>
      <DotGrid />
      {/* Same left-aligned header and the same width as the real screen, so
          nothing jumps when the real content replaces the skeleton. */}
      <View style={[styles.skeletonFrame, frame]}>
        <View style={styles.skeletonHeader}>
          <Shimmer width="100%" height={50} borderRadius={12} style={{ maxWidth: 560, marginBottom: 12 }} />
          <Shimmer width={252} height={46} borderRadius={12} />
        </View>

        <View style={[styles.skeletonGrid, { justifyContent: numColumns === 1 ? 'center' : 'flex-start' }]}>
          {[...Array(numColumns * 3)].map((_, i) => (
            <CardSkeleton key={i} cardWidth={cardWidth} />
          ))}
        </View>
      </View>
    </View>
  );
};

/* -------------------------------------------------------------------------- */
/*  Icons                                                                     */
/* -------------------------------------------------------------------------- */

const SearchIcon = () => (
  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
    <Path
      d="M21 21L16.65 16.65M19 11C19 15.4183 15.4183 19 11 19C6.58172 19 3 15.4183 3 11C3 6.58172 6.58172 3 11 3C15.4183 3 19 6.58172 19 11Z"
      stroke={COLORS.muted}
      strokeWidth={2}
      strokeLinecap="round"
    />
  </Svg>
);

const ClearIcon = () => (
  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="12" r="10" stroke={COLORS.muted} strokeWidth={1.5} />
    <Path d="M15 9L9 15M9 9L15 15" stroke={COLORS.muted} strokeWidth={1.8} strokeLinecap="round" />
  </Svg>
);

const EmptySearchIcon = () => (
  <Svg width={52} height={52} viewBox="0 0 24 24" fill="none">
    <Path
      d="M21 21L16.65 16.65M19 11C19 15.4183 15.4183 19 11 19C6.58172 19 3 15.4183 3 11C3 6.58172 6.58172 3 11 3C15.4183 3 19 6.58172 19 11Z"
      stroke={COLORS.brand}
      strokeWidth={1.5}
      strokeLinecap="round"
      opacity={0.55}
    />
  </Svg>
);

/* -------------------------------------------------------------------------- */
/*  Tabs                                                                      */
/* -------------------------------------------------------------------------- */

const TabButton = React.memo(({
  label,
  count,
  isActive,
  stretch,
  onPress,
}: {
  label: string;
  count: number;
  isActive: boolean;
  stretch?: boolean;
  onPress: () => void;
}) => {
  const { kbFocus, focusProps } = useKeyboardFocus();

  return (
    <Pressable
      style={({ pressed }) => [
        styles.tabButton,
        stretch && styles.tabButtonStretch,
        isActive && styles.tabButtonActive,
        pressed && !isActive && styles.tabButtonPressed,
        kbFocus && webFocusRing,
      ]}
      onPress={onPress}
      accessibilityRole="tab"
      accessibilityState={{ selected: isActive }}
      accessibilityLabel={`${label}, ${count} ${count === 1 ? 'diagram' : 'diagrams'}`}
      {...focusProps}
    >
      <Text style={[styles.tabButtonText, isActive && styles.tabButtonTextActive]}>{label}</Text>
      <View style={[styles.tabBadge, isActive && styles.tabBadgeActive]}>
        <Text style={[styles.tabBadgeText, isActive && styles.tabBadgeTextActive]}>{count}</Text>
      </View>
    </Pressable>
  );
});

/* -------------------------------------------------------------------------- */
/*  Card                                                                      */
/* -------------------------------------------------------------------------- */

// Graph paper behind each preview: a faint 16px grid with a firmer line every
// 64px, tinted by category. One <Pattern> + one <Rect> per card, same on
// native and web. (Pattern ids repeat across cards of one type; the tiles are
// identical, so that is harmless.)
const PaperGrid = React.memo(({ type }: { type: Diagram['type'] }) => {
  const color = TYPE_COLORS[type].primary;
  const id = `paper-${type}`;

  return (
    <Svg width="100%" height="100%" style={StyleSheet.absoluteFill} pointerEvents="none">
      <Defs>
        <Pattern id={id} width={64} height={64} patternUnits="userSpaceOnUse">
          <Path
            d="M16 0V64M32 0V64M48 0V64M0 16H64M0 32H64M0 48H64"
            stroke={color}
            strokeWidth={1}
            fill="none"
            opacity={0.09}
          />
          <Path d="M0 0V64M0 0H64" stroke={color} strokeWidth={1} fill="none" opacity={0.2} />
        </Pattern>
      </Defs>
      <Rect width="100%" height="100%" fill={`url(#${id})`} />
    </Svg>
  );
});

const DiagramCard = React.memo(({
  diagram,
  onPress,
  nativeID,
  reduceMotion,
}: {
  diagram: Diagram;
  onPress: (id: number) => void;
  nativeID?: string;
  reduceMotion: boolean;
}) => {
  const { id, title, type, tagline, image } = diagram;
  const colors = TYPE_COLORS[type];
  const Glyph = DIAGRAM_ICON_MAP[title] ?? GenericDiagramGlyph;
  const [isHovered, setIsHovered] = useState(false);
  const { kbFocus, focusProps } = useKeyboardFocus();
  const lift = useRef(new Animated.Value(0)).current;
  const active = isHovered || kbFocus;

  useEffect(() => {
    Animated.timing(lift, {
      toValue: active ? 1 : 0,
      duration: reduceMotion ? 0 : 180,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [active, reduceMotion, lift]);

  // One value drives the lift, the shadow and the border together, so the
  // card reads as a single deliberate state change instead of three effects.
  // At rest the card is flat (border only); the shadow only appears on
  // hover/focus, and it is tinted with the card's own category colour.
  const translateY = lift.interpolate({ inputRange: [0, 1], outputRange: [0, reduceMotion ? 0 : -3] });
  const shadowOpacity = lift.interpolate({ inputRange: [0, 1], outputRange: [0, 0.16] });
  const borderColor = lift.interpolate({
    inputRange: [0, 1],
    outputRange: [COLORS.border, `${colors.primary}99`],
  });

  return (
    <Pressable
      nativeID={nativeID}
      onPress={() => onPress(id)}
      accessibilityRole="button"
      accessibilityLabel={`${title}, ${type} diagram. ${tagline}`}
      style={({ pressed }) => [
        styles.cardTouchable,
        pressed && styles.cardPressed,
        kbFocus && webFocusRing,
      ]}
      {...focusProps}
      // @ts-ignore - React Native Web specific props
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Animated.View
        style={[
          styles.diagramCard,
          { transform: [{ translateY }], shadowColor: colors.primary, shadowOpacity, borderColor },
        ]}
      >
        <View style={[styles.cardPreview, { backgroundColor: colors.paper }]}>
          <PaperGrid type={type} />
          {/* The diagram sits on its own white sheet, pinned to the paper. */}
          <View style={styles.cardSheet}>
            {image ? (
              <Image source={image} style={styles.cardImage} resizeMode="contain" accessible={false} />
            ) : (
              <Glyph color={colors.primary} />
            )}
          </View>
        </View>

        <View style={styles.cardContent}>
          <View>
            <Text style={styles.cardTitle} numberOfLines={2}>
              {title}
            </Text>
            <Text style={styles.cardTagline} numberOfLines={3}>
              {tagline}
            </Text>
          </View>

          <View style={styles.cardFooterRow}>
            <View style={[styles.cardTypeBadge, { backgroundColor: colors.light }]}>
              <View style={[styles.cardTypeDot, { backgroundColor: colors.primary }]} />
              <Text style={[styles.cardTypeText, { color: colors.strong }]}>{type}</Text>
            </View>
          </View>
        </View>
      </Animated.View>
    </Pressable>
  );
});

const SuggestionChip = ({ label, onPress }: { label: string; onPress: () => void }) => {
  const { kbFocus, focusProps } = useKeyboardFocus();

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Search for ${label}`}
      {...focusProps}
      style={({ pressed }) => [
        styles.chip,
        pressed && styles.chipPressed,
        kbFocus && webFocusRing,
      ]}
    >
      <Text style={styles.chipText}>{label}</Text>
    </Pressable>
  );
};

/* -------------------------------------------------------------------------- */
/*  Screen                                                                    */
/* -------------------------------------------------------------------------- */

const useFilteredDiagrams = (activeTab: TabType, searchQuery: string) => {
  return useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    return DIAGRAMS.filter(
      (diagram) => (activeTab === 'All' || diagram.type === activeTab) && matchesQuery(diagram, query)
    );
  }, [activeTab, searchQuery]);
};

export default function Home() {
  usePageTitle('Diagram Library');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('All');
  const [refreshing, setRefreshing] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const router = useRouter();
  const reduceMotion = useReduceMotion();
  const clearFocus = useKeyboardFocus();
  const resetFocus = useKeyboardFocus();

  const filteredDiagrams = useFilteredDiagrams(activeTab, searchQuery);
  const layout = useResponsiveLayout();

  const homeTourSteps = useMemo(() => getHomeTourSteps({ router }), [router]);
  useOnboardingTour(HOME_TOUR_ID, homeTourSteps, true);

  // Web: press "/" anywhere outside a text field to jump to search.
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== '/' || e.metaKey || e.ctrlKey || e.altKey) return;
      const el = document.activeElement as HTMLElement | null;
      const tag = el?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || el?.isContentEditable) return;
      e.preventDefault();
      inputRef.current?.focus();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const tabCounts = useMemo(() => {
    const counts: Record<TabType, number> = { All: 0, UML: 0, SDLC: 0 };
    const query = searchQuery.toLowerCase().trim();

    DIAGRAMS.forEach((diagram) => {
      if (matchesQuery(diagram, query)) {
        counts.All++;
        counts[diagram.type]++;
      }
    });

    return counts;
  }, [searchQuery]);

  const animateLayout = useCallback(() => {
    if (!reduceMotion) LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
  }, [reduceMotion]);

  // Switching tabs: the grid fades and slides up into place. Skipped for
  // reduced motion. (Native driver: opacity + translateY only.)
  const tabContentAnim = useRef(new Animated.Value(1)).current;

  const handleTabChange = useCallback((tab: TabType) => {
    if (!reduceMotion) {
      tabContentAnim.setValue(0);
      Animated.timing(tabContentAnim, {
        toValue: 1,
        duration: 280,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    }
    setActiveTab(tab);
  }, [animateLayout]);

  // Search is live (it filters as you type), so Enter only needs to close the
  // keyboard. There is no separate search button.
  const handleSearchSubmit = useCallback(() => {
    Keyboard.dismiss();
  }, []);

  // DIAGRAMS above is a static, local reference-template list — there's no
  // server data to re-fetch here. This still matches the swipe-to-refresh
  // gesture users expect on this screen (consistent with My Diagrams and
  // Account, which do have real data to reload), just as a brief pulse
  // rather than pretending to sync something that doesn't exist.
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 600);
  }, []);

  // <RefreshControl> is a no-op on web (see the hook's own comment) — this
  // drives the same onRefresh via a hand-rolled swipe-down gesture there.
  const pullToRefreshWeb = usePullToRefreshWeb(onRefresh);

  const handleClearSearch = useCallback(() => {
    animateLayout();
    setSearchQuery('');
    if (Platform.OS === 'web') {
      inputRef.current?.focus();
    }
  }, [animateLayout]);

  const handleResetFilters = useCallback(() => {
    animateLayout();
    setSearchQuery('');
    setActiveTab('All');
  }, [animateLayout]);

  const handleSuggestion = useCallback((term: string) => {
    animateLayout();
    setActiveTab('All');
    setSearchQuery(term.toLowerCase());
  }, [animateLayout]);

  // navigate, not push: push mounts a brand-new instance of the
  // persistently-anchored (tabs) group on top of the existing one instead of
  // resurfacing it — browsing several reference diagrams in a row (open one,
  // back, open another...) stacked one more duplicate (extra Navbar, extra
  // everything) on every round trip. See diagram/[id].tsx's handleGoHome for
  // the other half of this same fix.
  const handleDiagramPress = useCallback((id: number) => {
    router.navigate({
      pathname: `/(tabs)/diagram/${id}` as any,
    });
  }, [router]);

  const renderItem = useCallback(({ item, index }: { item: Diagram; index: number }) => (
    <View
      style={[
        styles.gridItem,
        // One column: center the (max-width) card. Several columns: let items
        // stretch so every card in a row is the same height.
        { width: layout.cardWidth, alignSelf: layout.numColumns === 1 ? 'center' : 'stretch' },
      ]}
    >
      <DiagramCard
        diagram={item}
        onPress={handleDiagramPress}
        reduceMotion={reduceMotion}
        // The Home tour's card-anatomy step anchors to the first rendered
        // card — only ever the one at index 0 in the current filter/search
        // state, so this can't collide with a second nativeID elsewhere.
        nativeID={index === 0 ? 'tour-home-card-example' : undefined}
      />
    </View>
  ), [layout.cardWidth, layout.numColumns, handleDiagramPress, reduceMotion]);

  const keyExtractor = useCallback((item: Diagram) => item.id.toString(), []);

  // Passed to the list as an element, not as a component. As a component
  // (created in a useCallback that depended on the reset button's focus
  // state) it got a new identity whenever that button gained focus, which
  // remounted it and dropped keyboard focus the moment you tabbed onto it.
  const emptyState = (
    <View style={styles.emptyState}>
      <View style={styles.emptyIconWrap}>
        <EmptySearchIcon />
      </View>
      <Text style={styles.emptyStateTitle}>No matching diagrams</Text>
      <Text style={styles.emptyStateText}>
        Try a diagram name or a topic instead, or clear your filters.
      </Text>
      <View style={styles.chipsRow}>
        {SUGGESTED_SEARCHES.map((term) => (
          <SuggestionChip key={term} label={term} onPress={() => handleSuggestion(term)} />
        ))}
      </View>
      <Pressable
        onPress={handleResetFilters}
        accessibilityRole="button"
        accessibilityLabel="Reset search and filters"
        {...resetFocus.focusProps}
        style={({ pressed }) => [
          styles.emptyStateButton,
          pressed && styles.emptyStateButtonPressed,
          resetFocus.kbFocus && webFocusRing,
        ]}
      >
        <Text style={styles.emptyStateButtonText}>Reset search and filters</Text>
      </Pressable>
    </View>
  );

  const trimmedQuery = searchQuery.trim();
  const count = filteredDiagrams.length;
  const resultText = trimmedQuery
    ? `${count} ${count === 1 ? 'result' : 'results'} for “${trimmedQuery}”`
    : `${count} ${count === 1 ? 'diagram' : 'diagrams'}`;

  const showSlashHint = Platform.OS === 'web' && layout.isDesktop && !isSearchFocused && searchQuery.length === 0;

  // The pull-to-refresh indicator stays inside the list (it has to move with
  // the scroll)...
  const listHeader = (
    <PullToRefreshIndicator
      pullDistance={pullToRefreshWeb.pullDistance}
      refreshing={pullToRefreshWeb.refreshing}
      tintColor={COLORS.brand}
    />
  );

  // ...while the search bar and tabs are pinned above the list, so they stay
  // visible while scrolling (same as the Reference screen). The frame matches
  // the grid's own max width and side padding so everything still lines up.
  const pinnedHeader = (
    <View
      style={[
        styles.pinnedFrame,
        { maxWidth: MAX_CONTENT_WIDTH + layout.containerPadding * 2, paddingHorizontal: layout.containerPadding },
      ]}
    >
      <View style={[styles.headerSection, layout.isDesktop && styles.headerSectionDesktop]}>
        {/* Desktop: search on the left, category control on the right.
            Smaller screens stack them, with the control full width. */}
        <View style={[styles.toolbar, layout.isDesktop && styles.toolbarDesktop]}>
          <View
            nativeID="tour-home-search"
            accessibilityRole="search"
            style={[styles.searchBarContainer, layout.isDesktop && styles.searchBarContainerDesktop]}
          >
            <View style={[styles.searchBar, isSearchFocused && styles.searchBarFocused]}>
              <SearchIcon />
              <TextInput
                ref={inputRef}
                style={styles.searchInput}
                placeholder="Search by name or topic, like “database”"
                placeholderTextColor={COLORS.muted}
                accessibilityLabel="Search diagrams by name or topic"
                value={searchQuery}
                onChangeText={setSearchQuery}
                onSubmitEditing={handleSearchSubmit}
                onFocus={() => setIsSearchFocused(true)}
                onBlur={() => setIsSearchFocused(false)}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="search"
              />
              {searchQuery.length > 0 ? (
                <Pressable
                  onPress={handleClearSearch}
                  accessibilityRole="button"
                  accessibilityLabel="Clear search"
                  hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                  {...clearFocus.focusProps}
                  style={({ pressed }) => [
                    styles.clearButton,
                    pressed && styles.clearButtonPressed,
                    clearFocus.kbFocus && webFocusRing,
                  ]}
                >
                  <ClearIcon />
                </Pressable>
              ) : showSlashHint ? (
                <View style={styles.kbd} accessible={false}>
                  <Text style={styles.kbdText}>/</Text>
                </View>
              ) : null}
            </View>
          </View>

          <View
            nativeID="tour-home-tabs"
            accessibilityRole="tablist"
            style={[styles.tabsRow, !layout.isDesktop && styles.tabsRowStretch]}
          >
            {TABS.map((tab) => (
              <TabButton
                key={tab}
                label={tab}
                count={tabCounts[tab]}
                isActive={activeTab === tab}
                stretch={!layout.isDesktop}
                onPress={() => handleTabChange(tab)}
              />
            ))}
          </View>
        </View>

        <Text style={styles.resultCount} accessibilityLiveRegion="polite" numberOfLines={1}>
          {resultText}
        </Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <DotGrid />

      {pinnedHeader}

      <Animated.View
        style={{
          flex: 1,
          opacity: tabContentAnim,
          transform: [
            {
              translateY: tabContentAnim.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }),
            },
          ],
        }}
      >
      <FlatList
        data={filteredDiagrams}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={emptyState}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.brand}
            colors={[COLORS.brand]}
          />
        }
        {...pullToRefreshWeb.scrollHandlers}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingHorizontal: layout.containerPadding,
            maxWidth: MAX_CONTENT_WIDTH + layout.containerPadding * 2,
            // Extra clearance on mobile/tablet so the last row isn't hidden
            // behind the floating docked bottom navbar (Navbar.tsx).
            paddingBottom: layout.isDesktop ? 40 : 120,
          },
        ]}
        keyboardShouldPersistTaps="handled"
        numColumns={layout.numColumns}
        key={layout.numColumns} // Force re-render when columns change
        columnWrapperStyle={layout.numColumns > 1 ? { gap: GRID_GAP } : undefined}
        initialNumToRender={layout.numColumns * 3}
        maxToRenderPerBatch={layout.numColumns * 3}
        windowSize={5}
        removeClippedSubviews={Platform.OS !== 'web'}
      />
      </Animated.View>
    </View>
  );
}

/* -------------------------------------------------------------------------- */
/*  Styles                                                                    */
/* -------------------------------------------------------------------------- */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.page,
  },
  dotGridContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
  },

  /* skeleton */
  skeletonContainer: {
    flex: 1,
    backgroundColor: COLORS.page,
  },
  skeletonFrame: {
    width: '100%',
    alignSelf: 'center',
  },
  skeletonHeader: {
    paddingTop: Platform.OS === 'ios' ? 60 : 24,
    paddingBottom: 28,
    alignItems: 'flex-start',
    width: '100%',
  },
  skeletonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: '100%',
    gap: GRID_GAP,
  },
  skeletonCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  skeletonCardContent: {
    paddingHorizontal: 6,
    paddingTop: 14,
    paddingBottom: 6,
  },
  shimmerContainer: {
    backgroundColor: '#e2e8f0',
    overflow: 'hidden',
    position: 'relative',
  },
  // A white wash that fades in and out over the grey block (see shimmerPulse).
  shimmer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#ffffff',
  },

  /* header */
  pinnedFrame: {
    width: '100%',
    alignSelf: 'center',
  },
  headerSection: {
    paddingTop: Platform.OS === 'ios' ? 60 : 24,
    paddingBottom: 20,
    alignItems: 'stretch',
    // No zIndex here on purpose: with the header pinned above the grid, a
    // hovered card's lift would be painted over by the header's square edge.
  },
  headerSectionDesktop: {
    paddingTop: 40,
    paddingBottom: 24,
  },

  /* toolbar: search + category control */
  toolbar: {
    gap: 12,
  },
  toolbarDesktop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
  },
  searchBarContainer: {
    width: '100%',
  },
  searchBarContainerDesktop: {
    width: 'auto',
    flex: 1,
    maxWidth: 560,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    minHeight: 50,
    paddingLeft: 14,
    paddingRight: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 10,
    width: '100%',
  },
  // Focused: the neutral hairline becomes the brand blue, with a faint
  // matching glow, so the focus reads as intentional rather than a color swap.
  searchBarFocused: {
    borderColor: COLORS.brand,
    shadowColor: COLORS.brand,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
    ...Platform.select({
      web: { boxShadow: '0 0 0 3px rgba(76, 111, 255, 0.16)' },
    }),
  },
  searchInput: {
    flex: 1,
    minWidth: 0,
    fontSize: 16, // 16px stops iOS Safari zooming on focus
    color: COLORS.ink,
    paddingVertical: 8,
    ...Platform.select({
      web: {
        outlineStyle: 'none',
      },
    }),
  },
  clearButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearButtonPressed: {
    backgroundColor: '#f1f5f9',
  },
  kbd: {
    minWidth: 24,
    height: 24,
    paddingHorizontal: 7,
    marginRight: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.page,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kbdText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.muted,
  },
  resultCount: {
    marginTop: 20,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    fontSize: 13,
    lineHeight: 18,
    color: COLORS.muted,
    fontWeight: '500',
  },

  /* tabs: separate pills (classic style) */
  tabsRow: {
    flexDirection: 'row',
    alignSelf: 'flex-start',
    gap: 8,
    flexWrap: 'wrap',
  },
  tabsRowStretch: {
    alignSelf: 'stretch',
  },
  tabButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minHeight: 38,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
  },
  tabButtonStretch: {
    flex: 1,
  },
  tabButtonActive: {
    backgroundColor: '#4c6fff',
    elevation: 3,
    shadowColor: '#4c6fff',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  tabButtonPressed: {
    backgroundColor: '#e2e8f0',
  },
  tabButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  tabButtonTextActive: {
    color: '#ffffff',
  },
  tabBadge: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 22,
    alignItems: 'center',
  },
  tabBadgeActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  tabBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4c6fff',
  },
  tabBadgeTextActive: {
    color: '#ffffff',
  },

  /* grid */
  scrollContent: {
    flexGrow: 1,
    width: '100%',
    alignSelf: 'center',
  },
  gridItem: {
    marginBottom: GRID_GAP,
  },

  /* card */
  cardTouchable: {
    flex: 1,
    borderRadius: 16,
  },
  cardPressed: {
    opacity: 0.94,
  },
  diagramCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 18,
  },
  cardPreview: {
    aspectRatio: 2, // every card shares one preview size, whatever the image
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.06)',
    overflow: 'hidden',
  },
  cardSheet: {
    flex: 1,
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 6,
    backgroundColor: '#ffffff',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e6ebf5',
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  cardContent: {
    flex: 1,
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 6,
    paddingTop: 14,
    paddingBottom: 6,
  },
  cardTitle: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '700',
    color: COLORS.title,
    letterSpacing: -0.2,
  },
  cardTagline: {
    marginTop: 4,
    fontSize: 14,
    lineHeight: 20,
    color: COLORS.body,
  },
  cardFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 6,
  },
  cardTypeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  cardTypeText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.2,
  },

  /* empty state */
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 40,
    paddingHorizontal: 32,
  },
  emptyIconWrap: {
    width: 104,
    height: 104,
    borderRadius: 52,
    backgroundColor: '#eef2ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.3,
    color: COLORS.ink,
    marginTop: 20,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: COLORS.body,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 320,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginTop: 20,
  },
  chip: {
    minHeight: 40,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipPressed: {
    backgroundColor: '#eef2ff',
  },
  chipText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.body,
  },
  emptyStateButton: {
    marginTop: 12,
    minHeight: 44,
    paddingHorizontal: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyStateButtonPressed: {
    backgroundColor: '#e0e7ff',
  },
  emptyStateButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.brandStrong,
  },
});