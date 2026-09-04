import React, { useState, useRef, useEffect, useMemo } from 'react';
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
import {
  DIAGRAM_TABS,
  DIAGRAM_SHAPES,
  ShapeDefinition,
} from '@/constants/shapes';
import { ShapePreview } from './ShapeIcon';
import { Svg, Path, Circle, Rect } from 'react-native-svg';

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');

// Same fix as PropertiesPanel: without this, dragging one of this sheet's
// ScrollViews past its own edge chains the leftover gesture into bouncing
// the whole page behind it.
const WEB_SCROLL_CONTAIN =
  Platform.OS === 'web'
    ? { overscrollBehavior: 'contain' as const }
    : undefined;

// ─── Icons ────────────────────────────────────────────────────────────────────

const SearchIcon = ({ color = '#94a3b8' }: { color?: string }) => (
  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
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
  <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
    <Circle
      cx="12"
      cy="12"
      r="10"
      stroke="#94a3b8"
      strokeWidth={1.5}
    />
    <Path
      d="M15 9L9 15M9 9L15 15"
      stroke="#94a3b8"
      strokeWidth={1.8}
      strokeLinecap="round"
    />
  </Svg>
);

const HandleIcon = () => (
  <Svg width={36} height={4} viewBox="0 0 36 4">
    <Rect
      x="0"
      y="0"
      width="36"
      height="4"
      rx="2"
      fill="#d1d5db"
    />
  </Svg>
);

const CloseIcon = ({ color = '#4a5568' }: { color?: string }) => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
    <Path
      d="M18 6L6 18M6 6L18 18"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
    />
  </Svg>
);

// ─── Text Shape ───────────────────────────────────────────────────────────────
//
// TextShape already exists in your shape component registry.
// This definition is only used as a fallback so the bottom panel can show
// Text even when constants/shapes.ts does not yet contain it.
//
// If Text already exists in DIAGRAM_SHAPES.Standard, this fallback is NOT
// added, preventing duplicates.

const TEXT_SHAPE: ShapeDefinition = {
  id: 'text',
  label: 'Text',
  description: 'Add editable text to the canvas',
  svgComponent: 'TextShape',
} as ShapeDefinition;

// ─── Props ────────────────────────────────────────────────────────────────────

interface ShapesBottomPanelProps {
  visible: boolean;
  onClose: () => void;
  onSelectShape: (
    shapeId: string,
    shapeData?: ShapeDefinition
  ) => void;
  isGraphReady: boolean;
  toolbarHeight: number;
}

// ─── Content-fit sizing ───────────────────────────────────────────────────────

const TILE_HEIGHT = 52;
const HANDLE_HEIGHT = 16;
const HEADER_ROW_HEIGHT = 28;
const SEARCH_ROW_HEIGHT = 52;
const TABS_ROW_HEIGHT = 42;
const SHAPES_ROW_HEIGHT = TILE_HEIGHT + 8;
const DOTS_ROW_HEIGHT = 18;
const BOTTOM_SAFE_PADDING = Platform.OS === 'ios' ? 20 : 10;

const COLLAPSED_HEIGHT = 56;

const EXPANDED_HEIGHT =
  HANDLE_HEIGHT +
  HEADER_ROW_HEIGHT +
  SEARCH_ROW_HEIGHT +
  TABS_ROW_HEIGHT +
  SHAPES_ROW_HEIGHT +
  DOTS_ROW_HEIGHT +
  BOTTOM_SAFE_PADDING;

// ─── Component ────────────────────────────────────────────────────────────────

export default function ShapesBottomPanel({
  visible,
  onClose,
  onSelectShape,
  isGraphReady,
  toolbarHeight,
}: ShapesBottomPanelProps) {
  const [activeTab, setActiveTab] = useState('Flowchart');
  const [expanded, setExpanded] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [lastTapped, setLastTapped] = useState<string | null>(null);
  const [activePage, setActivePage] = useState(0);

  const scrollViewRef = useRef<ScrollView>(null);
  const slideAnim = useRef(new Animated.Value(0)).current;
  const currentHeightRef = useRef(0);

  const [containerWidth, setContainerWidth] = useState(0);

  // ─── Animation listener ────────────────────────────────────────────────────

  useEffect(() => {
    const id = slideAnim.addListener(({ value }) => {
      currentHeightRef.current = value;
    });

    return () => {
      slideAnim.removeListener(id);
    };
  }, [slideAnim]);

  // ─── Expand / Collapse ─────────────────────────────────────────────────────

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

  const togglePanel = () => {
    if (expanded) {
      collapsePanel();
    } else {
      expandPanel();
    }
  };

  // ─── Panel visibility ──────────────────────────────────────────────────────

  useEffect(() => {
    if (visible) {
      slideAnim.setValue(COLLAPSED_HEIGHT);

      const timeout = setTimeout(() => {
        expandPanel();
      }, 50);

      return () => clearTimeout(timeout);
    }

    slideAnim.setValue(0);
    setLastTapped(null);
    setSearchQuery('');
    setActivePage(0);
  }, [visible]);

  // ─── Pan responder ─────────────────────────────────────────────────────────

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,

      onMoveShouldSetPanResponder: () => true,

      onPanResponderGrant: () => {},

      onPanResponderMove: (_, gestureState) => {
        const currentHeight = expanded
          ? EXPANDED_HEIGHT
          : COLLAPSED_HEIGHT;

        const newHeight = currentHeight - gestureState.dy;

        if (
          newHeight >= COLLAPSED_HEIGHT &&
          newHeight <= EXPANDED_HEIGHT
        ) {
          slideAnim.setValue(newHeight);
        }
      },

      onPanResponderRelease: () => {
        const midPoint =
          (EXPANDED_HEIGHT + COLLAPSED_HEIGHT) / 2;

        if (currentHeightRef.current > midPoint) {
          expandPanel();
        } else {
          collapsePanel();
        }
      },
    })
  ).current;

  // ─── Text shape integration ────────────────────────────────────────────────
  //
  // Standard shapes come from constants/shapes.ts.
  //
  // If Text already exists there, use the existing definition.
  // Otherwise, append our fallback Text definition.

  const getShapesForTab = (tab: string): ShapeDefinition[] => {
    const originalShapes = DIAGRAM_SHAPES[tab] || [];

    if (tab !== 'Standard') {
      return originalShapes;
    }

    const hasTextShape = originalShapes.some(
      (shape) =>
        shape.id?.toLowerCase() === 'text' ||
        shape.svgComponent === 'TextShape'
    );

    if (hasTextShape) {
      return originalShapes;
    }

    return [...originalShapes, TEXT_SHAPE];
  };

  // ─── Tab change ────────────────────────────────────────────────────────────

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    setSearchQuery('');
    setActivePage(0);
    setLastTapped(null);

    if (scrollViewRef.current) {
      scrollViewRef.current.scrollTo({
        x: 0,
        animated: false,
      });
    }
  };

  // ─── Search / filtering ────────────────────────────────────────────────────

  const filteredShapes = useMemo(() => {
    const shapes = getShapesForTab(activeTab);

    const query = searchQuery.toLowerCase().trim();

    if (!query) {
      return shapes;
    }

    return shapes.filter(
      (shape) =>
        shape.label.toLowerCase().includes(query) ||
        shape.id.toLowerCase().includes(query) ||
        shape.description?.toLowerCase().includes(query)
    );
  }, [activeTab, searchQuery]);

  // ─── Shape selection ───────────────────────────────────────────────────────

  const handleShapeTap = (shape: ShapeDefinition) => {
    if (!isGraphReady) {
      return;
    }

    setLastTapped(shape.id);

    setTimeout(() => {
      onSelectShape(shape.id, shape);
      onClose();
    }, 150);
  };

  // ─── Responsive sizing ─────────────────────────────────────────────────────

  const isSmallScreen = SCREEN_WIDTH < 380;
  const isMediumScreen = SCREEN_WIDTH < 768;

  const iconSize = isSmallScreen
    ? 52
    : isMediumScreen
      ? 58
      : 62;

  const iconHeight = iconSize * 0.6;

  const NUM_ROWS = 1;
  const tileGap = 2;
  const tileHeight = TILE_HEIGHT;

  const getTileWidth = () => {
    const availableWidth =
      (containerWidth || SCREEN_WIDTH) - 16;

    const baseSize = isSmallScreen
      ? 70
      : isMediumScreen
        ? 80
        : 88;

    const itemsPerRow = Math.max(
      1,
      Math.floor(
        (availableWidth + tileGap) /
          (baseSize + tileGap)
      )
    );

    return Math.floor(
      (availableWidth -
        (itemsPerRow - 1) * tileGap) /
        itemsPerRow
    );
  };

  const tileWidth = getTileWidth();

  const itemsPerRow = Math.max(
    1,
    Math.floor(
      ((containerWidth || SCREEN_WIDTH) - 16 + tileGap) /
        (tileWidth + tileGap)
    )
  );

  const itemsPerPage = itemsPerRow * NUM_ROWS;

  const totalPages = Math.max(
    1,
    Math.ceil(filteredShapes.length / itemsPerPage)
  );

  // ─── Pagination ────────────────────────────────────────────────────────────

  const getPageShapes = (pageIndex: number) => {
    const start = pageIndex * itemsPerPage;
    const end = Math.min(
      start + itemsPerPage,
      filteredShapes.length
    );

    return filteredShapes.slice(start, end);
  };

  const handleScroll = (event: any) => {
    if (!containerWidth) {
      return;
    }

    const offsetX =
      event.nativeEvent.contentOffset.x;

    const page = Math.round(
      offsetX / containerWidth
    );

    if (
      page !== activePage &&
      page >= 0 &&
      page < totalPages
    ) {
      setActivePage(page);
    }
  };

  // ─── Render ────────────────────────────────────────────────────────────────

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
      {/* ─── Handle ───────────────────────────────────────────────────────── */}

      <View {...panResponder.panHandlers}>
        <TouchableOpacity
          style={styles.handleContainer}
          onPress={togglePanel}
          activeOpacity={0.8}
        >
          <HandleIcon />
        </TouchableOpacity>
      </View>

      {/* ─── Header ───────────────────────────────────────────────────────── */}

      <View style={styles.panelHeader}>
        <Text style={styles.panelTitle}>
          Shapes
        </Text>

        <TouchableOpacity
          onPress={onClose}
          style={styles.panelCloseBtn}
          hitSlop={{
            top: 8,
            bottom: 8,
            left: 8,
            right: 8,
          }}
        >
          <CloseIcon color="#4a5568" />
        </TouchableOpacity>
      </View>

      {/* ─── Search ───────────────────────────────────────────────────────── */}

      <View style={styles.searchContainer}>
        <View style={styles.searchInputWrapper}>
          <SearchIcon color="#94a3b8" />

          <TextInput
            style={styles.searchInput}
            placeholder="Search shapes..."
            placeholderTextColor="#94a3b8"
            value={searchQuery}
            onChangeText={(text) => {
              setSearchQuery(text);
              setActivePage(0);

              if (scrollViewRef.current) {
                scrollViewRef.current.scrollTo({
                  x: 0,
                  animated: false,
                });
              }
            }}
            clearButtonMode="while-editing"
          />

          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => {
                setSearchQuery('');
                setActivePage(0);

                if (scrollViewRef.current) {
                  scrollViewRef.current.scrollTo({
                    x: 0,
                    animated: false,
                  });
                }
              }}
              style={styles.clearBtn}
            >
              <ClearIcon />
            </TouchableOpacity>
          )}
        </View>

        {searchQuery.length > 0 && (
          <Text style={styles.searchResults}>
            {filteredShapes.length} result
            {filteredShapes.length !== 1 ? 's' : ''}
          </Text>
        )}
      </View>

      {/* ─── Diagram Type Tabs ─────────────────────────────────────────────── */}

      <View style={styles.tabsContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabsScrollContent}
          style={WEB_SCROLL_CONTAIN}
        >
          {DIAGRAM_TABS.map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[
                styles.tab,
                activeTab === tab && styles.tabActive,
              ]}
              onPress={() => handleTabChange(tab)}
            >
              <Text
                style={[
                  styles.tabText,
                  activeTab === tab &&
                    styles.tabTextActive,
                ]}
                numberOfLines={1}
              >
                {tab
                  .replace(' Diagram', '')
                  .replace(' Entity', '')
                  .length > 15
                  ? tab
                      .replace(' Diagram', '')
                      .replace(' Entity', '')
                      .substring(0, 12) + '…'
                  : tab
                      .replace(' Diagram', '')
                      .replace(' Entity', '')}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* ─── Shapes ───────────────────────────────────────────────────────── */}

      {filteredShapes.length > 0 ? (
        <>
          <ScrollView
            ref={scrollViewRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            style={[
              styles.shapesScroll,
              WEB_SCROLL_CONTAIN,
            ]}
            contentContainerStyle={[
              styles.shapesContent,
              {
                height: tileHeight + 2,
              },
            ]}
            onLayout={(e) => {
              const width =
                e.nativeEvent.layout.width;

              if (width > 0) {
                setContainerWidth(width);
              }
            }}
            onScroll={handleScroll}
            scrollEventThrottle={16}
            decelerationRate="fast"
          >
            {Array.from({
              length: totalPages,
            }).map((_, pageIndex) => {
              const pageShapes =
                getPageShapes(pageIndex);

              return (
                <View
                  key={pageIndex}
                  style={[
                    styles.pageContainer,
                    {
                      width:
                        containerWidth ||
                        SCREEN_WIDTH,
                      paddingHorizontal: 6,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.shapesGrid,
                      {
                        height: tileHeight,
                      },
                    ]}
                  >
                    {pageShapes.map((shape) => {
                      const isTapped =
                        lastTapped === shape.id;

                      const isTextShape =
                        shape.svgComponent ===
                        'TextShape';

                      return (
                        <TouchableOpacity
                          key={shape.id}
                          style={[
                            styles.shapeTile,

                            !isGraphReady &&
                              styles.shapeTileDisabled,

                            isTapped &&
                              styles.shapeTileTapped,

                            isTextShape &&
                              styles.textShapeTile,

                            {
                              width: tileWidth,
                              height: tileHeight,
                            },
                          ]}
                          onPress={() =>
                            handleShapeTap(shape)
                          }
                          disabled={!isGraphReady}
                          activeOpacity={0.7}
                        >
                          <ShapePreview
                            name={shape.svgComponent}
                            width={iconSize}
                            height={iconHeight}
                            selected={isTapped}
                            showLabel={false}
                            color="#1a1f36"
                            fillColor="#ffffff"
                            strokeWidth={2}
                          />

                          {/* Small label specifically for Text */}
                          {isTextShape && (
                            <Text
                              style={styles.textShapeLabel}
                              numberOfLines={1}
                            >
                              Text
                            </Text>
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              );
            })}
          </ScrollView>

          {/* ─── Pagination Dots ─────────────────────────────────────────── */}

          {totalPages > 1 && (
            <View style={styles.dotsContainer}>
              {Array.from({
                length: totalPages,
              }).map((_, i) => (
                <View
                  key={i}
                  style={[
                    styles.dot,
                    i === activePage &&
                      styles.dotActive,
                  ]}
                />
              ))}
            </View>
          )}
        </>
      ) : (
        <View style={styles.noResults}>
          <Text style={styles.noResultsText}>
            No shapes found
          </Text>

          <Text style={styles.noResultsSubtext}>
            Try a different search term
          </Text>
        </View>
      )}

      {/* ─── Loading state ───────────────────────────────────────────────── */}

      {!isGraphReady && (
        <Text style={styles.notReadyHint}>
          Canvas is loading…
        </Text>
      )}
    </Animated.View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

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
        shadowOffset: {
          width: 0,
          height: -4,
        },
        shadowOpacity: 0.1,
        shadowRadius: 20,
      },

      android: {
        elevation: 10,
      },

      web: {
        boxShadow:
          '0 -4px 20px rgba(0,0,0,0.1)',
      },
    }),
  },

  handleContainer: {
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 4,
  },

  panelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 4,
  },

  panelTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1a1f36',
  },

  panelCloseBtn: {
    padding: 4,
  },

  // ─── Search ───────────────────────────────────────────────────────────────

  searchContainer: {
    paddingHorizontal: 12,
    paddingBottom: 8,
  },

  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 42,
  },

  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#1a1f36',
    paddingVertical: 4,
    paddingHorizontal: 8,

    ...Platform.select({
      web: {
        outlineStyle: 'none' as any,
      },
    }),
  },

  clearBtn: {
    padding: 4,
  },

  searchResults: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 2,
    paddingHorizontal: 4,
  },

  // ─── Tabs ────────────────────────────────────────────────────────────────

  tabsContainer: {
    paddingHorizontal: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },

  tabsScrollContent: {
    paddingHorizontal: 0,
  },

  tab: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginRight: 6,
    borderRadius: 14,
    backgroundColor: '#f1f5f9',
  },

  tabActive: {
    backgroundColor: '#4c6fff',
  },

  tabText: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '600',
  },

  tabTextActive: {
    color: '#ffffff',
  },

  // ─── Shapes ──────────────────────────────────────────────────────────────

  shapesScroll: {
    height: TILE_HEIGHT + 8,
  },

  shapesContent: {
    paddingBottom: 0,
  },

  pageContainer: {},

  shapesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignContent: 'flex-start',
    gap: 2,
    justifyContent: 'flex-start',
    alignItems: 'center',
  },

  shapeTile: {
    borderRadius: 6,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 0,
  },

  shapeTileTapped: {
    backgroundColor: '#eef2ff',
    borderRadius: 6,
  },

  shapeTileDisabled: {
    opacity: 0.4,
  },

  // Text gets a normal tile treatment.
  // This style is intentionally subtle so it matches the rest
  // of the existing shape panel.
  textShapeTile: {
    position: 'relative',
  },

  textShapeLabel: {
    position: 'absolute',
    bottom: 2,
    fontSize: 8,
    fontWeight: '600',
    color: '#64748b',
  },

  // ─── Pagination ─────────────────────────────────────────────────────────

  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 2,
    paddingBottom: 4,
    gap: 4,
  },

  dot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#d1d5db',
  },

  dotActive: {
    backgroundColor: '#4c6fff',
    width: 5,
    height: 5,
  },

  // ─── Empty state ─────────────────────────────────────────────────────────

  noResults: {
    padding: 20,
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

  // ─── Loading ─────────────────────────────────────────────────────────────

  notReadyHint: {
    textAlign: 'center',
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 8,
  },
});