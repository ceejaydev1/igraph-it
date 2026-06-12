// igraph-frontend/app/(tabs)/home.tsx

import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { 
  View, 
  Text,
  StyleSheet, 
  TextInput, 
  Platform, 
  Pressable, 
  Keyboard, 
  ScrollView,
  useWindowDimensions,
  LayoutAnimation,
  UIManager,
  Animated,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Svg, Path, Circle } from 'react-native-svg';

// Enable LayoutAnimation on Android (safe check)
if (Platform.OS === 'android') {
  if (UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
  }
}

// Types
interface Diagram {
  id: number;
  title: string;
  type: 'UML' | 'SDLC';
}

type TabType = 'All' | 'UML' | 'SDLC';

// Constants
const DIAGRAMS: Diagram[] = [
  { id: 1, title: 'Functional Decomposition Diagram', type: 'UML' },
  { id: 2, title: 'Flowchart', type: 'UML' },
  { id: 3, title: 'Data Flow Diagram', type: 'UML' },
  { id: 4, title: 'Entity Relationship Diagram', type: 'UML' },
  { id: 5, title: 'Fishbone Diagram', type: 'UML' },
  { id: 6, title: 'Schematic Diagram', type: 'UML' },
  { id: 7, title: 'Use Case Diagram', type: 'UML' },
  { id: 8, title: 'Activity Diagram', type: 'UML' },
  { id: 9, title: 'Sequence Diagram', type: 'UML' },
  { id: 10, title: 'Class Diagram', type: 'UML' },
  { id: 11, title: 'Waterfall Model', type: 'SDLC' },
  { id: 12, title: 'Big Bang Model', type: 'SDLC' },
  { id: 13, title: 'Prototype Model', type: 'SDLC' },
  { id: 14, title: 'Agile Model', type: 'SDLC' },
  { id: 15, title: 'Iterative Model', type: 'SDLC' },
  { id: 16, title: 'V Model', type: 'SDLC' },
  { id: 17, title: 'Rapid Application Development', type: 'SDLC' },
  { id: 18, title: 'Spiral Model', type: 'SDLC' },
];

const TYPE_COLORS = {
  UML: { primary: '#4c6fff', light: '#eef2ff' },
  SDLC: { primary: '#10b981', light: '#ecfdf5' },
} as const;

const TABS: TabType[] = ['All', 'SDLC', 'UML'];

// ─────────────────────────────────────────────────────────────────────────────
// DOT GRID PATTERN - Cross-platform compatible
// ─────────────────────────────────────────────────────────────────────────────

const DotGrid = () => {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const DOT_SPACING = 32;
  const DOT_SIZE = 2;
  
  const columns = Math.ceil(screenWidth / DOT_SPACING);
  const rows = Math.ceil(screenHeight / DOT_SPACING);
  const totalDots = columns * rows;
  
  return (
    <View style={styles.dotGridContainer} pointerEvents="none">
      {[...Array(Math.min(totalDots, 200))].map((_, i) => {
        const col = i % columns;
        const row = Math.floor(i / columns);
        return (
          <View
            key={i}
            style={[
              styles.dotGridItem,
              {
                left: col * DOT_SPACING,
                top: row * DOT_SPACING,
                width: DOT_SIZE,
                height: DOT_SIZE,
              },
            ]}
          />
        );
      })}
    </View>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// SKELETON LOADER COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────

const Shimmer = ({ width, height, borderRadius = 8, style = {} }: { 
  width: number | string; 
  height: number; 
  borderRadius?: number; 
  style?: any;
}) => {
  const shimmerValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerValue, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerValue, {
          toValue: 0,
          duration: 1200,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, []);

  const shimmerTranslate = shimmerValue.interpolate({
    inputRange: [0, 1],
    outputRange: [-200, 200],
  });

  const numericWidth = typeof width === 'number' ? width : 400;

  return (
    <View style={[styles.shimmerContainer, { width, height, borderRadius }, style]}>
      <Animated.View
        style={[
          styles.shimmer,
          {
            transform: [{ translateX: shimmerTranslate }],
            width: numericWidth * 2,
          },
        ]}
      />
    </View>
  );
};

const CardSkeleton = ({ cardWidth }: { cardWidth: number }) => {
  return (
    <View style={[styles.skeletonCard, { width: cardWidth }]}>
      <Shimmer width="100%" height={120} borderRadius={12} />
      <View style={styles.skeletonCardContent}>
        <Shimmer width="80%" height={20} borderRadius={4} style={{ marginBottom: 12 }} />
        <Shimmer width="40%" height={16} borderRadius={4} />
      </View>
    </View>
  );
};

const HomeGridSkeleton = () => {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;
  const cardWidth = width < 768 ? width - 32 : width < 1024 ? (width - 44) / 2 : 300;
  
  return (
    <View style={styles.skeletonContainer}>
      <DotGrid />
      <View style={styles.skeletonHeader}>
        <Shimmer width="100%" height={44} borderRadius={12} style={{ maxWidth: 640 }} />
        <View style={styles.skeletonTabs}>
          <Shimmer width={80} height={36} borderRadius={20} />
          <Shimmer width={80} height={36} borderRadius={20} />
          <Shimmer width={80} height={36} borderRadius={20} />
        </View>
      </View>
      
      <View style={styles.skeletonGrid}>
        {[...Array(isDesktop ? 12 : 6)].map((_, i) => (
          <CardSkeleton key={i} cardWidth={cardWidth} />
        ))}
      </View>
    </View>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// ICONS
// ─────────────────────────────────────────────────────────────────────────────

const SearchIcon = () => (
  <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
    <Path
      d="M21 21L16.65 16.65M19 11C19 15.4183 15.4183 19 11 19C6.58172 19 3 15.4183 3 11C3 6.58172 6.58172 3 11 3C15.4183 3 19 6.58172 19 11Z"
      stroke="#ffffff"
      strokeWidth={2}
      strokeLinecap="round"
    />
  </Svg>
);

const ClearIcon = () => (
  <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="12" r="10" stroke="#8896b3" strokeWidth={1.5} />
    <Path d="M15 9L9 15M9 9L15 15" stroke="#8896b3" strokeWidth={1.8} strokeLinecap="round" />
  </Svg>
);

const EmptySearchIcon = () => (
  <Svg width={80} height={80} viewBox="0 0 24 24" fill="none">
    <Path
      d="M21 21L16.65 16.65M19 11C19 15.4183 15.4183 19 11 19C6.58172 19 3 15.4183 3 11C3 6.58172 6.58172 3 11 3C15.4183 3 19 6.58172 19 11Z"
      stroke="#cbd5e1"
      strokeWidth={1.5}
    />
  </Svg>
);

// ─────────────────────────────────────────────────────────────────────────────
// TAB BUTTON
// ─────────────────────────────────────────────────────────────────────────────

const TabButton = ({ 
  label, 
  count, 
  isActive, 
  onPress 
}: { 
  label: string;
  count: number; 
  isActive: boolean; 
  onPress: () => void;
}) => (
  <Pressable
    style={({ pressed }) => [
      styles.tabButton,
      isActive && styles.tabButtonActive,
      pressed && !isActive && styles.tabButtonPressed,
    ]}
    onPress={onPress}
  >
    <Text style={[styles.tabButtonText, isActive && styles.tabButtonTextActive]}>
      {label}
    </Text>
    <View style={[styles.tabBadge, isActive && styles.tabBadgeActive]}>
      <Text style={[styles.tabBadgeText, isActive && styles.tabBadgeTextActive]}>
        {count}
      </Text>
    </View>
  </Pressable>
);

// ─────────────────────────────────────────────────────────────────────────────
// DIAGRAM CARD
// ─────────────────────────────────────────────────────────────────────────────

const DiagramCard = ({ 
  title, 
  type, 
  onPress,
}: { 
  title: string; 
  type: Diagram['type'];
  onPress?: () => void;
}) => {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;
  const colors = TYPE_COLORS[type];
  const [isHovered, setIsHovered] = useState(false);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const shadowAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: isHovered ? 1.02 : 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.timing(shadowAnim, {
        toValue: isHovered ? 1 : 0,
        duration: 200,
        useNativeDriver: false,
      }),
    ]).start();
  }, [isHovered]);

  const shadowOpacity = shadowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.04, 0.12],
  });

  const elevation = shadowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [2, 6],
  });

  return (
    <Pressable 
      onPress={onPress}
      style={({ pressed }) => [
        styles.cardTouchable,
        pressed && styles.cardPressed,
      ]}
      // @ts-ignore - React Native Web specific props
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Animated.View 
        style={[
          styles.diagramCard,
          isHovered && styles.diagramCardHovered,
          {
            transform: [{ scale: scaleAnim }],
            shadowOpacity,
            elevation,
          },
        ]}
      >
        <View style={[
          styles.cardPreview, 
          isDesktop && styles.cardPreviewDesktop,
          { backgroundColor: colors.light }
        ]}>
          {isHovered && (
            <View style={[styles.hoverOverlay, { backgroundColor: colors.primary + '08' }]} />
          )}
        </View>
        
        <View style={styles.cardContent}>
          <Text 
            style={[styles.cardTitle, isDesktop && styles.cardTitleDesktop]} 
            numberOfLines={2}
          >
            {title}
          </Text>
          <View style={styles.cardMeta}>
            <View style={[
              styles.cardTypeBadge, 
              { backgroundColor: isHovered ? colors.primary + '25' : `${colors.primary}15` }
            ]}>
              <Text style={[styles.cardTypeText, { color: colors.primary }]}>
                {type}
              </Text>
            </View>
          </View>
        </View>
      </Animated.View>
    </Pressable>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// CUSTOM HOOKS
// ─────────────────────────────────────────────────────────────────────────────

const useFilteredDiagrams = (activeTab: TabType, searchQuery: string) => {
  return useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    
    return DIAGRAMS.filter(diagram => {
      const matchesTab = activeTab === 'All' || diagram.type === activeTab;
      const matchesSearch = !query || 
        diagram.title.toLowerCase().includes(query) ||
        diagram.type.toLowerCase().includes(query);
      
      return matchesTab && matchesSearch;
    });
  }, [activeTab, searchQuery]);
};

const useResponsiveLayout = () => {
  const { width } = useWindowDimensions();
  
  return useMemo(() => ({
    isMobile: width < 768,
    isTablet: width >= 768 && width < 1024,
    isDesktop: width >= 1024,
    cardWidth: width < 768 
      ? width - 32 
      : width < 1024 
        ? (width - 44) / 2 
        : 300,
    containerPadding: width < 768 ? 16 : width < 1024 ? 24 : 32,
  }), [width]);
};

// ─────────────────────────────────────────────────────────────────────────────
// MAIN HOME COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export default function Home() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<TabType>('All');
  const [showContent, setShowContent] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const router = useRouter();
  
  const filteredDiagrams = useFilteredDiagrams(activeTab, searchQuery);
  const layout = useResponsiveLayout();

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowContent(true);
    }, 400);
    
    return () => clearTimeout(timer);
  }, []);

  const tabCounts = useMemo(() => {
    const counts: Record<TabType, number> = { All: 0, UML: 0, SDLC: 0 };
    const query = searchQuery.toLowerCase().trim();
    
    DIAGRAMS.forEach(diagram => {
      const matchesSearch = !query || 
        diagram.title.toLowerCase().includes(query) ||
        diagram.type.toLowerCase().includes(query);
      
      if (matchesSearch) {
        counts.All++;
        counts[diagram.type]++;
      }
    });
    
    return counts;
  }, [searchQuery]);

  const handleTabChange = useCallback((tab: TabType) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setActiveTab(tab);
  }, []);

  const handleSearchSubmit = useCallback(() => {
    Keyboard.dismiss();
  }, []);

  const handleClearSearch = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setSearchQuery('');
    if (Platform.OS === 'web') {
      inputRef.current?.focus();
    }
  }, []);

  const handleDiagramPress = useCallback((id: number) => {
    router.push({
      pathname: `/(tabs)/diagram/${id}` as any,
    });
  }, [router]);

  if (!showContent) {
    return <HomeGridSkeleton />;
  }

  return (
    <View style={styles.container}>
      <DotGrid />
      
      <View style={styles.headerSection}>
        <View style={styles.searchBarContainer}>
          <View style={styles.searchBar}>
            <TextInput
              ref={inputRef}
              style={styles.searchInput}
              placeholder="Search SDLC and UML diagrams"
              placeholderTextColor="#94a3b8"
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSubmitEditing={handleSearchSubmit}
              autoCapitalize="none"
              returnKeyType="search"
            />
            {searchQuery.length > 0 && (
              <Pressable 
                onPress={handleClearSearch} 
                style={({ pressed }) => [
                  styles.clearButton,
                  pressed && styles.clearButtonPressed,
                ]}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <ClearIcon />
              </Pressable>
            )}
            <Pressable 
              style={({ pressed }) => [
                styles.searchButton,
                pressed && styles.searchButtonPressed,
              ]}
              onPress={handleSearchSubmit}
            >
              <SearchIcon />
            </Pressable>
          </View>
        </View>

        <View style={styles.tabsRow}>
          {TABS.map((tab) => (
            <TabButton
              key={tab}
              label={tab}
              count={tabCounts[tab]}
              isActive={activeTab === tab}
              onPress={() => handleTabChange(tab)}
            />
          ))}
        </View>
        
        {searchQuery.length > 0 && (
          <View style={styles.searchInfo}>
            <Text style={styles.searchInfoText}>
              Found {filteredDiagrams.length} result{filteredDiagrams.length !== 1 ? 's' : ''} for "{searchQuery}"
            </Text>
          </View>
        )}
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingHorizontal: layout.containerPadding }
        ]}
        keyboardShouldPersistTaps="handled"
      >
        {filteredDiagrams.length === 0 ? (
          <View style={styles.emptyState}>
            <EmptySearchIcon />
            <Text style={styles.emptyStateTitle}>No diagrams found</Text>
            <Text style={styles.emptyStateText}>
              Try adjusting your search or switching tabs
            </Text>
          </View>
        ) : (
          <View style={styles.grid}>
            {filteredDiagrams.map((diagram) => (
              <View
                key={diagram.id}
                style={[styles.gridItem, { width: layout.cardWidth }]}
              >
                <DiagramCard
                  title={diagram.title}
                  type={diagram.type}
                  onPress={() => handleDiagramPress(diagram.id)}
                />
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  
  // Dot Grid Pattern - Cross platform
  dotGridContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
  },
  dotGridItem: {
    position: 'absolute',
    backgroundColor: '#4c6fff',
    borderRadius: 1,
    opacity: 0.12,
  },
  
  // Skeleton styles
  skeletonContainer: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  skeletonHeader: {
    paddingTop: Platform.OS === 'ios' ? 60 : 20,
    paddingHorizontal: 16,
    paddingBottom: 12,
    alignItems: 'center',
  },
  skeletonTabs: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 16,
  },
  skeletonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    padding: 12,
    gap: 12,
  },
  skeletonCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 4,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
  },
  skeletonCardContent: {
    padding: 14,
  },
  shimmerContainer: {
    backgroundColor: '#e2e8f0',
    overflow: 'hidden',
    position: 'relative',
  },
  shimmer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    ...Platform.select({
      web: {
        background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.6), transparent)',
      },
    }),
  },
  
  // Header
  headerSection: {
    paddingTop: Platform.OS === 'ios' ? 60 : 20,
    paddingHorizontal: 16,
    paddingBottom: 12,
    alignItems: 'center',
    zIndex: 10,
  },
  searchBarContainer: {
    alignSelf: 'center',
    marginBottom: 16,
    width: '100%',
    maxWidth: 640,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 10,
    width: '100%',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#0f172a',
    paddingVertical: 8,
    ...Platform.select({
      web: {
        outlineStyle: 'none',
      },
    }),
  },
  clearButton: {
    padding: 4,
    borderRadius: 4,
  },
  clearButtonPressed: {
    backgroundColor: '#f1f5f9',
  },
  searchButton: {
    backgroundColor: '#4c6fff',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchButtonPressed: {
    backgroundColor: '#3b5de7',
  },
  searchInfo: {
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 6,
    backgroundColor: '#eef2ff',
    borderRadius: 20,
  },
  searchInfoText: {
    fontSize: 12,
    color: '#4c6fff',
    fontWeight: '500',
  },
  
  // Tabs
  tabsRow: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  tabButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
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
  
  // Scroll and grid
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 32,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 12,
  },
  gridItem: {
    marginBottom: 4,
  },
  
  // Diagram card
  cardTouchable: {
    flex: 1,
    borderRadius: 16,
  },
  cardPressed: {
    opacity: 0.9,
  },
  diagramCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
  },
  diagramCardHovered: {
    borderColor: '#cbd5e1',
  },
  cardPreview: {
    height: 120,
    position: 'relative',
  },
  cardPreviewDesktop: {
    height: 140,
  },
  hoverOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  cardContent: {
    padding: 14,
    backgroundColor: '#ffffff',
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 10,
    lineHeight: 20,
  },
  cardTitleDesktop: {
    fontSize: 15,
    lineHeight: 22,
  },
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardTypeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  cardTypeText: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  
  // Empty state
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
    paddingHorizontal: 32,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0f172a',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 20,
  },
});