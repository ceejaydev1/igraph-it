// igraph-frontend/app/(tabs)/home.tsx
// No spinner - only skeleton loading

import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { 
  View, 
  Text,
  StyleSheet, 
  TextInput, 
  Platform, 
  TouchableOpacity, 
  Keyboard, 
  ScrollView,
  useWindowDimensions,
  LayoutAnimation,
  UIManager,
  Animated,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as authService from '../../services/authService';
import { Svg, Path, Circle } from 'react-native-svg';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
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
  { id: 8, title: 'Activity Diagram - Library', type: 'UML' },
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
// SKELETON LOADER COMPONENTS (Inline - no external imports)
// ─────────────────────────────────────────────────────────────────────────────

const Shimmer = ({ width, height, borderRadius = 8, style = {} }: any) => {
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

  return (
    <View style={[styles.shimmerContainer, { width, height, borderRadius }, style]}>
      <Animated.View
        style={[
          styles.shimmer,
          {
            transform: [{ translateX: shimmerTranslate }],
            width: typeof width === 'number' ? width * 2 : 400,
          },
        ]}
      />
    </View>
  );
};

const CardSkeleton = () => {
  const { width } = useWindowDimensions();
  const cardWidth = width < 768 ? width - 32 : width < 1024 ? (width - 44) / 2 : 300;
  
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
  
  return (
    <View style={styles.skeletonContainer}>
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
          <CardSkeleton key={i} />
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
      stroke="#e2e6f3"
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
  <TouchableOpacity
    style={[styles.tabButton, isActive && styles.tabButtonActive]}
    onPress={onPress}
    activeOpacity={0.7}
  >
    <Text style={[styles.tabButtonText, isActive && styles.tabButtonTextActive]}>
      {label}
    </Text>
    <View style={[styles.tabBadge, isActive && styles.tabBadgeActive]}>
      <Text style={[styles.tabBadgeText, isActive && styles.tabBadgeTextActive]}>
        {count}
      </Text>
    </View>
  </TouchableOpacity>
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

  return (
    <TouchableOpacity 
      onPress={onPress} 
      activeOpacity={0.95} 
      style={styles.cardTouchable}
    >
      <View style={styles.diagramCard}>
        <View style={[
          styles.cardPreview, 
          isDesktop && styles.cardPreviewDesktop,
          { backgroundColor: colors.light }
        ]}>
          <View style={styles.cardPreviewPattern}>
            {[...Array(12)].map((_, i) => (
              <View 
                key={i} 
                style={[
                  styles.previewDot, 
                  { 
                    backgroundColor: colors.primary,
                    opacity: 0.15 + (i % 3) * 0.1,
                    width: 6 + (i % 4) * 2,
                    height: 6 + (i % 4) * 2,
                    top: 10 + (i * 15) % 80,
                    left: 10 + (i * 30) % 90,
                  }
                ]} 
              />
            ))}
          </View>
        </View>
        
        <View style={styles.cardContent}>
          <Text 
            style={[styles.cardTitle, isDesktop && styles.cardTitleDesktop]} 
            numberOfLines={2}
          >
            {title}
          </Text>
          <View style={styles.cardMeta}>
            <View style={[styles.cardTypeBadge, { backgroundColor: `${colors.primary}15` }]}>
              <Text style={[styles.cardTypeText, { color: colors.primary }]}>
                {type}
              </Text>
            </View>
          </View>
        </View>
      </View>
    </TouchableOpacity>
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
// MAIN HOME COMPONENT - NO SPINNER, ONLY SKELETON
// ─────────────────────────────────────────────────────────────────────────────

export default function Home() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<TabType>('All');
  const [showContent, setShowContent] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const router = useRouter();
  
  const filteredDiagrams = useFilteredDiagrams(activeTab, searchQuery);
  const layout = useResponsiveLayout();

  // Show skeleton on mount, then show content after a short delay
  useEffect(() => {
    // Brief skeleton display for smooth transition
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

  // ✅ ONLY skeleton loading - NO spinner anywhere
  if (!showContent) {
    return <HomeGridSkeleton />;
  }

  return (
    <View style={styles.container}>
      <View style={styles.dotPattern} />
      
      <View style={styles.headerSection}>
        <View style={styles.searchBarContainer}>
          <View style={styles.searchBar}>
            <TextInput
              ref={inputRef}
              style={styles.searchInput}
              placeholder="Search SDLC and UML diagrams"
              placeholderTextColor="#b8c0d4"
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSubmitEditing={handleSearchSubmit}
              autoCapitalize="none"
              returnKeyType="search"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity 
                onPress={handleClearSearch} 
                style={styles.clearButton}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <ClearIcon />
              </TouchableOpacity>
            )}
            <TouchableOpacity 
              style={styles.searchButton} 
              onPress={handleSearchSubmit}
              activeOpacity={0.85}
            >
              <SearchIcon />
            </TouchableOpacity>
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
    backgroundColor: '#f8faff',
  },
  
  // Skeleton styles
  skeletonContainer: {
    flex: 1,
    backgroundColor: '#f8faff',
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  skeletonCardContent: {
    padding: 14,
  },
  shimmerContainer: {
    backgroundColor: '#e2e6f3',
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
  
  // Dot pattern background
  dotPattern: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.4,
    backgroundColor: 'transparent',
    backgroundImage: 'radial-gradient(circle at 2px 2px, #4c6fff 1px, transparent 1px)',
    backgroundSize: '32px 32px',
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
    borderColor: '#e2e6f3',
    gap: 10,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#1a1f36',
    paddingVertical: 8,
    ...Platform.select({
      web: {
        outlineStyle: 'none',
        fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      },
      ios: {
        fontFamily: 'System',
      },
      android: {
        fontFamily: 'Roboto',
      },
    }),
  },
  clearButton: {
    padding: 4,
  },
  searchButton: {
    backgroundColor: '#4c6fff',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
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
    backgroundColor: '#f0f4ff',
  },
  tabButtonActive: {
    backgroundColor: '#4c6fff',
    shadowColor: '#4c6fff',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  tabButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
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
  },
  diagramCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#eef2ff',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  cardPreview: {
    height: 120,
    position: 'relative',
  },
  cardPreviewDesktop: {
    height: 140,
  },
  cardPreviewPattern: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  previewDot: {
    position: 'absolute',
    borderRadius: 50,
  },
  cardContent: {
    padding: 14,
    backgroundColor: '#ffffff',
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1f36',
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
    color: '#1a1f36',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#8896b3',
    textAlign: 'center',
    lineHeight: 20,
  },
});