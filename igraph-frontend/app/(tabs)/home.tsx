// igraph-frontend/app/(tabs)/home.tsx

import React, { useState, useRef, useEffect } from 'react';
import { 
  View, 
  Text,
  StyleSheet, 
  ActivityIndicator, 
  TextInput, 
  Platform, 
  TouchableOpacity, 
  Keyboard, 
  Animated, 
  Easing,
  ScrollView,
  useWindowDimensions
} from 'react-native';
import { useRouter } from 'expo-router';
import * as authService from '../../services/authService';
import { Svg, Path, Circle, Rect } from 'react-native-svg';

// Search Button Icon
const SearchButtonIcon = ({ animated, isLoading }: { animated: Animated.Value; isLoading: boolean }) => {
  const spin = animated.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  if (isLoading) {
    return (
      <Animated.View style={{ transform: [{ rotate: spin }] }}>
        <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
          <Circle cx="12" cy="12" r="10" stroke="#ffffff" strokeWidth={2} strokeLinecap="round" strokeDasharray="30 10" />
          <Path d="M12 2a10 10 0 0 1 10 10" stroke="#ffffff" strokeWidth={2} strokeLinecap="round" />
        </Svg>
      </Animated.View>
    );
  }

  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
      <Path
        d="M21 21L16.65 16.65M19 11C19 15.4183 15.4183 19 11 19C6.58172 19 3 15.4183 3 11C3 6.58172 6.58172 3 11 3C15.4183 3 19 6.58172 19 11Z"
        stroke="#ffffff"
        strokeWidth={2}
        strokeLinecap="round"
      />
    </Svg>
  );
};

// Tab Button Component
const TabButton = ({ label, count, isActive, onPress, index }: { 
  label: string; 
  count: number; 
  isActive: boolean; 
  onPress: () => void; 
  index: number;
}) => {
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 6,
        tension: 40,
        delay: index * 80,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 300,
        delay: index * 80,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View
      style={{
        opacity: opacityAnim,
        transform: [{ scale: scaleAnim }],
      }}
    >
      <TouchableOpacity
        style={[styles.tabButton, isActive && styles.tabButtonActive]}
        onPress={onPress}
        activeOpacity={0.7}
      >
        <Text style={[styles.tabButtonText, isActive && styles.tabButtonTextActive]}>{label}</Text>
        <View style={[styles.tabBadge, isActive && styles.tabBadgeActive]}>
          <Text style={[styles.tabBadgeText, isActive && styles.tabBadgeTextActive]}>{count}</Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

// Diagram Card Component - Without Icon (keeping container size)
const DiagramCard = ({ title, type, onPress, index }: { 
  title: string; 
  type: string; 
  onPress?: () => void;
  index: number;
}) => {
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        tension: 40,
        delay: Math.min(index * 50, 300),
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 300,
        delay: Math.min(index * 50, 300),
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const getTypeColor = () => {
    switch (type) {
      case 'UML': return '#4c6fff';
      case 'SDLC': return '#10b981';
      default: return '#f59e0b';
    }
  };

  return (
    <Animated.View
      style={[
        styles.diagramCard,
        {
          opacity: opacityAnim,
          transform: [{ scale: scaleAnim }],
        },
      ]}
    >
      <TouchableOpacity onPress={onPress} activeOpacity={0.9} style={styles.cardTouchable}>
        {/* Preview section removed - keeping space for layout */}
        <View style={[styles.cardPreview, isDesktop && styles.cardPreviewDesktop]} />
        <View style={styles.cardContent}>
          <Text style={[styles.cardTitle, isDesktop && styles.cardTitleDesktop]} numberOfLines={2}>
            {title}
          </Text>
          <View style={styles.cardMeta}>
            <View style={[styles.cardType, { backgroundColor: `${getTypeColor()}15` }]}>
              <Text style={[styles.cardTypeText, { color: getTypeColor() }]}>{type}</Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

export default function Home() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isShaking, setIsShaking] = useState(false);
  const [activeTab, setActiveTab] = useState('All');
  const [filteredDiagrams, setFilteredDiagrams] = useState<any[]>([]);
  const inputRef = useRef<TextInput>(null);
  
  const bounceAnim = useRef(new Animated.Value(0)).current;
  const buttonAnim = useRef(new Animated.Value(0)).current;
  const spinAnim = useRef(new Animated.Value(0)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const isBouncingRef = useRef(true);

  const isMobile = width < 768;
  const isTablet = width >= 768 && width < 1024;
  const isDesktop = width >= 1024;

  // All diagrams data - without date
  const allDiagrams = [
    { id: 1, title: 'Login Sequence Diagram', type: 'UML' },
    { id: 2, title: 'User Authentication Flow', type: 'UML' },
    { id: 3, title: 'Database ER Diagram', type: 'UML' },
    { id: 4, title: 'Agile SDLC Model', type: 'SDLC' },
    { id: 5, title: 'Waterfall Methodology', type: 'SDLC' },
    { id: 6, title: 'Use Case Diagram', type: 'UML' },
    { id: 7, title: 'Spiral Model', type: 'SDLC' },
    { id: 8, title: 'Class Diagram - Library', type: 'UML' },
    { id: 9, title: 'V-Model SDLC', type: 'SDLC' },
    { id: 10, title: 'Activity Diagram', type: 'UML' },
    { id: 11, title: 'Component Diagram', type: 'UML' },
    { id: 12, title: 'Deployment Diagram', type: 'UML' },
    { id: 13, title: 'RAD Model', type: 'SDLC' },
    { id: 14, title: 'Prototype Model', type: 'SDLC' },
    { id: 15, title: 'State Diagram', type: 'UML' },
    { id: 16, title: 'Communication Diagram', type: 'UML' },
    { id: 17, title: 'Incremental Model', type: 'SDLC' },
    { id: 18, title: 'DevOps Pipeline', type: 'SDLC' },
  ];

  // Filter diagrams based on search and active tab
  const filterDiagrams = () => {
    let filtered = [...allDiagrams];
    
    // Filter by active tab
    if (activeTab !== 'All') {
      filtered = filtered.filter(d => d.type === activeTab);
    }
    
    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(d => 
        d.title.toLowerCase().includes(query) ||
        d.type.toLowerCase().includes(query)
      );
    }
    
    setFilteredDiagrams(filtered);
  };

  // Update counts based on filtered results
  const getTabCount = (tabName: string) => {
    if (tabName === 'All') {
      if (searchQuery) {
        return filteredDiagrams.length;
      }
      return allDiagrams.length;
    }
    const filtered = allDiagrams.filter(d => d.type === tabName);
    if (searchQuery) {
      return filtered.filter(d => 
        d.title.toLowerCase().includes(searchQuery.toLowerCase())
      ).length;
    }
    return filtered.length;
  };

  useEffect(() => {
    filterDiagrams();
  }, [activeTab, searchQuery]);

  useEffect(() => {
    checkAuth();
    startBouncingAnimation();
  }, []);

  const startBouncingAnimation = () => {
    isBouncingRef.current = true;
    Animated.loop(
      Animated.sequence([
        Animated.timing(bounceAnim, { toValue: 1, duration: 1500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(bounceAnim, { toValue: 0, duration: 1500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    ).start();
  };

  const stopBouncingAnimation = () => {
    isBouncingRef.current = false;
    bounceAnim.stopAnimation();
    Animated.timing(bounceAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start();
  };

  const checkAuth = async () => {
    try {
      const token = await authService.getAccessToken();
      if (!token) {
        router.replace('/(auth)/signin');
      } else {
        setLoading(false);
        filterDiagrams();
        Animated.spring(buttonAnim, { toValue: 1, friction: 6, tension: 40, useNativeDriver: true }).start();
      }
    } catch (error) {
      console.error('Auth check error:', error);
      router.replace('/(auth)/signin');
    }
  };

  const handleSearch = () => {
    if (!searchQuery.trim()) {
      shakeSearchBar();
      return;
    }
    
    setIsSearching(true);
    stopBouncingAnimation();
    
    Animated.sequence([
      Animated.timing(buttonAnim, { toValue: 0.9, duration: 100, useNativeDriver: true }),
      Animated.spring(buttonAnim, { toValue: 1, friction: 5, tension: 50, useNativeDriver: true }),
    ]).start();
    
    setTimeout(() => {
      console.log('Searching for:', searchQuery);
      Keyboard.dismiss();
      setIsSearching(false);
      if (!isFocused && !searchQuery) startBouncingAnimation();
    }, 500);
  };

  const shakeSearchBar = () => {
    setIsShaking(true);
    shakeAnim.setValue(0);
    
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 1, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -1, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0.5, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -0.5, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 100, useNativeDriver: true }),
    ]).start(() => {
      setIsShaking(false);
      if (!isFocused && !searchQuery && isBouncingRef.current === false) startBouncingAnimation();
    });
  };

  const handleFocus = () => {
    setIsFocused(true);
    stopBouncingAnimation();
  };

  const handleBlur = () => {
    setIsFocused(false);
    if (!searchQuery) startBouncingAnimation();
  };

  const clearSearch = () => {
    setSearchQuery('');
    inputRef.current?.focus();
  };

  const bounceTranslateY = bounceAnim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, -4, 0] });
  const shakeTranslateX = shakeAnim.interpolate({ inputRange: [-1, -0.5, 0, 0.5, 1], outputRange: [-6, -3, 0, 3, 6] });

  const getTransform = () => {
    if (isShaking) return [{ translateX: shakeTranslateX }];
    return [{ translateY: bounceTranslateY }];
  };

  const buttonScale = buttonAnim;
  const buttonRotate = buttonAnim.interpolate({ inputRange: [0.9, 1], outputRange: ['-3deg', '0deg'] });

  const cardWidth = () => {
    const padding = 16;
    const gap = 12;
    if (isMobile) return width - padding * 2;
    if (isTablet) return (width - padding * 2 - gap) / 2;
    return 300;
  };

  const containerPadding = () => {
    if (isMobile) return 16;
    if (isTablet) return 24;
    return 32;
  };

  const tabs = [
    { label: 'All', count: getTabCount('All') },
    { label: 'SDLC', count: getTabCount('SDLC') },
    { label: 'UML', count: getTabCount('UML') }
  ];

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4c6fff" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.dotPattern} />
      
      <View style={styles.headerSection}>
        <Animated.View style={[styles.searchBarContainer, { transform: getTransform() }]}>
          <View style={[styles.searchBar, isFocused && styles.searchBarFocused]}>
            <TextInput
              ref={inputRef}
              style={[
                styles.searchInput,
                Platform.OS === 'web' && { outline: 'none', outlineWidth: 0 } as any
              ]}
              placeholder="Search SDLC and UML diagrams"
              placeholderTextColor="#b8c0d4"
              value={searchQuery}
              onChangeText={setSearchQuery}
              onFocus={handleFocus}
              onBlur={handleBlur}
              onSubmitEditing={handleSearch}
              autoCapitalize="none"
              returnKeyType="search"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={clearSearch} style={styles.clearButton}>
                <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
                  <Circle cx="12" cy="12" r="10" stroke="#8896b3" strokeWidth={1.5} />
                  <Path d="M15 9L9 15M9 9L15 15" stroke="#8896b3" strokeWidth={1.8} strokeLinecap="round" />
                </Svg>
              </TouchableOpacity>
            )}
            <Animated.View style={{ transform: [{ scale: buttonScale }, { rotate: buttonRotate }] }}>
              <TouchableOpacity 
                style={[styles.searchButton, isSearching && styles.searchButtonActive]} 
                onPress={handleSearch}
                activeOpacity={0.85}
                disabled={isSearching}
              >
                <SearchButtonIcon animated={spinAnim} isLoading={isSearching} />
              </TouchableOpacity>
            </Animated.View>
          </View>
        </Animated.View>

        <View style={styles.tabsRow}>
          {tabs.map((tab, index) => (
            <TabButton
              key={tab.label}
              label={tab.label}
              count={tab.count}
              isActive={activeTab === tab.label}
              onPress={() => setActiveTab(tab.label)}
              index={index}
            />
          ))}
        </View>
        
        {/* Search results info */}
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
          { paddingHorizontal: containerPadding() }
        ]}
      >
        {filteredDiagrams.length === 0 ? (
          <View style={styles.emptyState}>
            <Svg width={80} height={80} viewBox="0 0 24 24" fill="none">
              <Path
                d="M21 21L16.65 16.65M19 11C19 15.4183 15.4183 19 11 19C6.58172 19 3 15.4183 3 11C3 6.58172 6.58172 3 11 3C15.4183 3 19 6.58172 19 11Z"
                stroke="#e2e6f3"
                strokeWidth={1.5}
              />
            </Svg>
            <Text style={styles.emptyStateTitle}>No diagrams found</Text>
            <Text style={styles.emptyStateText}>
              Try searching for "UML", "SDLC", or "Diagram"
            </Text>
          </View>
        ) : (
          <View style={[styles.gridContainer, { justifyContent: isDesktop ? 'center' : 'flex-start' }]}>
            <View style={styles.gridWrapper}>
              <View style={styles.grid}>
                {filteredDiagrams.map((diagram, index) => (
                  <View
                    key={diagram.id}
                    style={[
                      styles.gridItem,
                      { width: cardWidth(), marginRight: isMobile ? 0 : 12 }
                    ]}
                  >
                    <DiagramCard
                      title={diagram.title}
                      type={diagram.type}
                      index={index}
                      onPress={() => console.log('Open:', diagram.title)}
                    />
                  </View>
                ))}
              </View>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8faff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8faff',
  },
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
  searchBarFocused: {
    borderColor: '#4c6fff',
    shadowColor: '#4c6fff',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#1a1f36',
    paddingVertical: 6,
    paddingHorizontal: 0,
    fontFamily: Platform.select({
      ios: 'System',
      android: 'Roboto',
      web: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    }),
    fontWeight: '400',
  },
  clearButton: {
    padding: 4,
  },
  searchButton: {
    backgroundColor: '#4c6fff',
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 42,
  },
  searchButtonActive: {
    backgroundColor: '#3b5bdb',
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
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#f0f4ff',
  },
  tabButtonActive: {
    backgroundColor: '#4c6fff',
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
    backgroundColor: '#ffffff',
  },
  tabBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4c6fff',
  },
  tabBadgeTextActive: {
    color: '#4c6fff',
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  gridContainer: {
    alignItems: 'center',
    width: '100%',
  },
  gridWrapper: {
    width: '100%',
    maxWidth: 1200,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'flex-start',
    gap: 12,
  },
  gridItem: {
    marginBottom: 0,
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
  cardTouchable: {
    flex: 1,
  },
  cardPreview: {
    height: 120,
    backgroundColor: '#fafcff',
    borderBottomWidth: 1,
    borderBottomColor: '#eef2ff',
  },
  cardPreviewDesktop: {
    height: 140,
  },
  cardContent: {
    padding: 12,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1f36',
    marginBottom: 6,
  },
  cardTitleDesktop: {
    fontSize: 15,
  },
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardType: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  cardTypeText: {
    fontSize: 11,
    fontWeight: '600',
  },
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
  },
});