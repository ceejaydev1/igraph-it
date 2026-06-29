// components/shapes/ShapesBottomPanel.tsx - COMPLETE FIXED VERSION

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  Animated,
  PanResponder,
  Dimensions,
  TextInput,
} from 'react-native';
import { DIAGRAM_TABS, DIAGRAM_SHAPES, ShapeDefinition } from '@/constants/shapes';
import { ShapePreview } from './ShapeIcon';
import { Svg, Path, Circle, Rect} from 'react-native-svg';

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');

// ─── Icons ────────────────────────────────────────────────────────────────────

const SearchIcon = ({ color = '#94a3b8' }: { color?: string }) => (
  <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
    <Path
      d="M21 21L15 15M17 9C17 13.4183 13.4183 17 9 17C4.58172 17 1 13.4183 1 9C1 4.58172 4.58172 1 9 1C13.4183 1 17 4.58172 17 9Z"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const ClearIcon = () => (
  <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="12" r="10" stroke="#94a3b8" strokeWidth={1.5} />
    <Path d="M15 9L9 15M9 9L15 15" stroke="#94a3b8" strokeWidth={1.8} strokeLinecap="round" />
  </Svg>
);

const HandleIcon = () => (
  <Svg width={36} height={4} viewBox="0 0 36 4">
    <Rect x="0" y="0" width="36" height="4" rx="2" fill="#d1d5db" />
  </Svg>
);

const CloseIcon = ({ color = '#4a5568' }: { color?: string }) => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
    <Path d="M18 6L6 18M6 6L18 18" stroke={color} strokeWidth={2} strokeLinecap="round" />
  </Svg>
);

interface ShapesBottomPanelProps {
  visible: boolean;
  onClose: () => void;
  onSelectShape: (shapeId: string, shapeData?: ShapeDefinition) => void;
  onUmlTypeChange?: (type: string) => void;
  isGraphReady: boolean;
  toolbarHeight: number;
}

export default function ShapesBottomPanel({
  visible,
  onClose,
  onSelectShape,
  onUmlTypeChange,
  isGraphReady,
  toolbarHeight,
}: ShapesBottomPanelProps) {
  const [activeTab, setActiveTab] = useState('Flowchart');
  const [expanded, setExpanded] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [lastTapped, setLastTapped] = useState<string | null>(null);

  const slideAnim = useRef(new Animated.Value(0)).current;
  const currentHeightRef = useRef(0);

  const COLLAPSED_HEIGHT = 60;
  const EXPANDED_HEIGHT = SCREEN_HEIGHT * 0.55;

  useEffect(() => {
    const id = slideAnim.addListener(({ value }) => {
      currentHeightRef.current = value;
    });
    return () => slideAnim.removeListener(id);
  }, []);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {},
      onPanResponderMove: (_, gestureState) => {
        const currentHeight = expanded ? EXPANDED_HEIGHT : COLLAPSED_HEIGHT;
        const newHeight = currentHeight - gestureState.dy;
        if (newHeight >= COLLAPSED_HEIGHT && newHeight <= EXPANDED_HEIGHT) {
          slideAnim.setValue(newHeight);
        }
      },
      onPanResponderRelease: () => {
        const midPoint = (EXPANDED_HEIGHT + COLLAPSED_HEIGHT) / 2;
        if (currentHeightRef.current > midPoint) {
          expandPanel();
        } else {
          collapsePanel();
        }
      },
    })
  ).current;

  useEffect(() => {
    if (visible) {
      slideAnim.setValue(COLLAPSED_HEIGHT);
      setTimeout(expandPanel, 50);
    } else {
      slideAnim.setValue(0);
      setLastTapped(null);
      setSearchQuery('');
    }
  }, [visible]);

  const expandPanel = () => {
    setExpanded(true);
    Animated.spring(slideAnim, {
      toValue: EXPANDED_HEIGHT,
      useNativeDriver: false,
      tension: 65,
      friction: 12,
    }).start();
  };

  const collapsePanel = () => {
    setExpanded(false);
    Animated.spring(slideAnim, {
      toValue: COLLAPSED_HEIGHT,
      useNativeDriver: false,
      tension: 65,
      friction: 12,
    }).start();
  };

  const togglePanel = () => (expanded ? collapsePanel() : expandPanel());

const handleShapeTap = (shape: ShapeDefinition) => {
  if (!isGraphReady) return;
  setLastTapped(shape.id);
  setTimeout(() => {
    onSelectShape(shape.id, shape); // ← This passes the shape ID
    onClose();
  }, 150);
};

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    setSearchQuery('');
    if (onUmlTypeChange) {
      onUmlTypeChange(tab);
    }
  };

  const getFilteredShapes = () => {
    const shapes = DIAGRAM_SHAPES[activeTab] || [];
    if (!searchQuery.trim()) return shapes;
    const query = searchQuery.toLowerCase().trim();
    return shapes.filter(
      (shape) =>
        shape.label.toLowerCase().includes(query) ||
        shape.id.toLowerCase().includes(query) ||
        shape.description?.toLowerCase().includes(query)
    );
  };

  const filteredShapes = getFilteredShapes();
  const iconSize = 36;
  const tileSize = 64;

  return (
    <Animated.View
      style={[
        styles.panelContainer,
        {
          height: slideAnim,
          bottom: toolbarHeight,
          transform: [
            {
              translateY: slideAnim.interpolate({
                inputRange: [0, EXPANDED_HEIGHT],
                outputRange: [EXPANDED_HEIGHT, 0],
              }),
            },
          ],
          opacity: slideAnim.interpolate({
            inputRange: [0, 50],
            outputRange: [0, 1],
          }),
        },
      ]}
      pointerEvents={visible ? 'auto' : 'none'}
    >
      <View {...panResponder.panHandlers}>
        <TouchableOpacity
          style={styles.handleContainer}
          onPress={togglePanel}
          activeOpacity={0.8}
        >
          <HandleIcon />
        </TouchableOpacity>
      </View>

      <View style={styles.panelHeader}>
        <Text style={styles.panelTitle}>Shapes</Text>
        <TouchableOpacity
          onPress={onClose}
          style={styles.panelCloseBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <CloseIcon color="#4a5568" />
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchInputWrapper}>
          <SearchIcon color="#94a3b8" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search shapes..."
            placeholderTextColor="#94a3b8"
            value={searchQuery}
            onChangeText={setSearchQuery}
            clearButtonMode="while-editing"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => setSearchQuery('')}
              style={styles.clearBtn}
            >
              <ClearIcon />
            </TouchableOpacity>
          )}
        </View>
        {searchQuery.length > 0 && (
          <Text style={styles.searchResults}>
            {filteredShapes.length} result{filteredShapes.length !== 1 ? 's' : ''}
          </Text>
        )}
      </View>

      <View style={styles.tabsContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabsScrollContent}
        >
          {DIAGRAM_TABS.map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, activeTab === tab && styles.tabActive]}
              onPress={() => handleTabChange(tab)}
            >
              <Text
                style={[styles.tabText, activeTab === tab && styles.tabTextActive]}
                numberOfLines={1}
              >
                {tab.replace(' Diagram', '').replace(' Entity', '').length > 15
                  ? tab.replace(' Diagram', '').replace(' Entity', '').substring(0, 12) + '…'
                  : tab.replace(' Diagram', '').replace(' Entity', '')}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView
        style={styles.shapesScroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.shapesContent}
        scrollEventThrottle={16}
      >
        {filteredShapes.length > 0 ? (
          <View style={styles.shapesGrid}>
            {filteredShapes.map((shape) => {
              const isTapped = lastTapped === shape.id;
              return (
                <TouchableOpacity
                  key={shape.id}
                  style={[
                    styles.shapeTile,
                    !isGraphReady && styles.shapeTileDisabled,
                    isTapped && styles.shapeTileTapped,
                    { width: tileSize, height: tileSize + 16 },
                  ]}
                  onPress={() => handleShapeTap(shape)}
                  disabled={!isGraphReady}
                  activeOpacity={0.65}
                >
                  <ShapePreview
                    name={shape.svgComponent}
                    label={shape.label}
                    width={iconSize}
                    height={iconSize * 0.6}
                    selected={isTapped}
                  />
                </TouchableOpacity>
              );
            })}
          </View>
        ) : (
          <View style={styles.noResults}>
            <Text style={styles.noResultsText}>No shapes found</Text>
            <Text style={styles.noResultsSubtext}>Try a different search term</Text>
          </View>
        )}

        {!isGraphReady && (
          <Text style={styles.notReadyHint}>Canvas is loading…</Text>
        )}
      </ScrollView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  panelContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    zIndex: 5,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
      },
      android: {
        elevation: 10,
      },
      web: {
        boxShadow: '0 -4px 20px rgba(0,0,0,0.1)',
      },
    }),
  },
  handleContainer: {
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 8,
  },
  panelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  panelTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1f36',
  },
  panelCloseBtn: {
    padding: 4,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 36,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#1a1f36',
    paddingVertical: 4,
    paddingHorizontal: 8,
    ...Platform.select({ web: { outlineStyle: 'none' } }),
  },
  clearBtn: {
    padding: 4,
  },
  searchResults: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 6,
    paddingHorizontal: 4,
  },
  tabsContainer: {
    paddingHorizontal: 16,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  tabsScrollContent: {
    paddingHorizontal: 0,
  },
  tab: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    marginRight: 6,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
  },
  tabActive: {
    backgroundColor: '#4c6fff',
  },
  tabText: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
  },
  tabTextActive: {
    color: '#ffffff',
  },
  shapesScroll: {
    flex: 1,
  },
  shapesContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 20,
  },
  shapesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  shapeTile: {
    borderRadius: 10,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 3,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  shapeTileTapped: {
    borderColor: '#4c6fff',
    backgroundColor: '#eef2ff',
  },
  shapeTileDisabled: {
    opacity: 0.4,
  },
  noResults: {
    padding: 32,
    alignItems: 'center',
  },
  noResultsText: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
  },
  noResultsSubtext: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 4,
  },
  notReadyHint: {
    textAlign: 'center',
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 16,
  },
});