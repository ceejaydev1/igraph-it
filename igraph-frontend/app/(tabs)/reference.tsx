import React, { useState, useMemo, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Pressable,
  StyleSheet,
  LayoutAnimation,
  Platform,
  UIManager,
  useWindowDimensions,
} from 'react-native';
import { Svg, Path, Circle } from 'react-native-svg';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// ── Icons (same style as Home screen's search bar) ──────
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
  <Svg width={64} height={64} viewBox="0 0 24 24" fill="none">
    <Path
      d="M21 21L16.65 16.65M19 11C19 15.4183 15.4183 19 11 19C6.58172 19 3 15.4183 3 11C3 6.58172 6.58172 3 11 3C15.4183 3 19 6.58172 19 11Z"
      stroke="#cbd5e1"
      strokeWidth={1.5}
    />
  </Svg>
);

const ChevronIcon = ({ up }: { up: boolean }) => (
  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
    <Path
      d={up ? 'M18 15L12 9L6 15' : 'M6 9L12 15L18 9'}
      stroke="#3b5bdb"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const DotGrid = () => {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const DOT_SPACING = 32;
  const DOT_SIZE = 1.4;

  return (
    <View style={styles.dotGridContainer} pointerEvents="none">
      <Svg width={screenWidth} height={screenHeight}>
        {Array.from({ length: Math.ceil(screenHeight / DOT_SPACING) }).map((_, row) =>
          Array.from({ length: Math.ceil(screenWidth / DOT_SPACING) }).map((_, col) => (
            <Circle
              key={`${row}-${col}`}
              cx={col * DOT_SPACING}
              cy={row * DOT_SPACING}
              r={DOT_SIZE}
              fill="#4c6fff"
              opacity={0.12}
            />
          ))
        )}
      </Svg>
    </View>
  );
};

// ── Types ──────────────────────────────────────────────
type Category = 'All' | 'UML' | 'SDLC' | 'General Terms';

interface ReferenceTerm {
  id: string;
  term: string;
  category: Exclude<Category, 'All'>;
  definition: string;
}

// ── Data (real term names, lorem ipsum definitions as placeholder) ──
// 4 UML + 8 SDLC + 6 System/Analysis(General) = 18 topics
const REFERENCE_DATA: ReferenceTerm[] = [
  // UML (4)
  {
    id: 'uml-1',
    term: 'Class Diagram',
    category: 'UML',
    definition:
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
  },
  {
    id: 'uml-2',
    term: 'Use Case Diagram',
    category: 'UML',
    definition:
      'Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.',
  },
  {
    id: 'uml-3',
    term: 'Sequence Diagram',
    category: 'UML',
    definition:
      'Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.',
  },
  {
    id: 'uml-4',
    term: 'Activity Diagram',
    category: 'UML',
    definition:
      'Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.',
  },

  // SDLC (8)
  {
    id: 'sdlc-1',
    term: 'Waterfall Model',
    category: 'SDLC',
    definition:
      'Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium.',
  },
  {
    id: 'sdlc-2',
    term: 'Agile Model',
    category: 'SDLC',
    definition:
      'Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni.',
  },
  {
    id: 'sdlc-3',
    term: 'Scrum Framework',
    category: 'SDLC',
    definition:
      'Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit.',
  },
  {
    id: 'sdlc-4',
    term: 'Spiral Model',
    category: 'SDLC',
    definition:
      'Ut enim ad minima veniam, quis nostrum exercitationem ullam corporis suscipit laboriosam.',
  },
  {
    id: 'sdlc-5',
    term: 'Iterative Model',
    category: 'SDLC',
    definition:
      'Quis autem vel eum iure reprehenderit qui in ea voluptate velit esse quam nihil molestiae consequatur.',
  },
  {
    id: 'sdlc-6',
    term: 'V-Model',
    category: 'SDLC',
    definition:
      'At vero eos et accusamus et iusto odio dignissimos ducimus qui blanditiis praesentium voluptatum.',
  },
  {
    id: 'sdlc-7',
    term: 'Prototyping Model',
    category: 'SDLC',
    definition:
      'Et harum quidem rerum facilis est et expedita distinctio nam libero tempore cum soluta nobis.',
  },
  {
    id: 'sdlc-8',
    term: 'DevOps Model',
    category: 'SDLC',
    definition:
      'Temporibus autem quibusdam et aut officiis debitis aut rerum necessitatibus saepe eveniet.',
  },

  // General / System-Analysis Terms (6)
  {
    id: 'gen-1',
    term: 'Requirements Analysis',
    category: 'General Terms',
    definition:
      'Itaque earum rerum hic tenetur a sapiente delectus, ut aut reiciendis voluptatibus maiores alias.',
  },
  {
    id: 'gen-2',
    term: 'System Design',
    category: 'General Terms',
    definition:
      'Consectetur, adipisci velit, sed quia non numquam eius modi tempora incidunt ut labore et dolore.',
  },
  {
    id: 'gen-3',
    term: 'Entity-Relationship Diagram',
    category: 'General Terms',
    definition:
      'Magni dolores eos qui ratione voluptatem sequi nesciunt, neque porro quisquam est qui dolorem.',
  },
  {
    id: 'gen-4',
    term: 'Data Flow Diagram',
    category: 'General Terms',
    definition:
      'Ut labore et dolore magnam aliquam quaerat voluptatem, ut enim ad minima veniam quis nostrum.',
  },
  {
    id: 'gen-5',
    term: 'Software Testing',
    category: 'General Terms',
    definition:
      'Nam libero tempore cum soluta nobis est eligendi optio cumque nihil impedit quo minus id quod.',
  },
  {
    id: 'gen-6',
    term: 'Version Control',
    category: 'General Terms',
    definition:
      'Maxime placeat facere possimus omnis voluptas assumenda est omnis dolor repellendus temporibus autem.',
  },
];

const CATEGORIES: Category[] = ['All', 'UML', 'SDLC', 'General Terms'];

// ── Component ──────────────────────────────────────────
export default function LearningReference() {
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<Category>('All');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const inputRef = useRef<TextInput>(null);
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;

  const filteredTerms = useMemo(() => {
    return REFERENCE_DATA.filter((item) => {
      const matchesCategory = activeCategory === 'All' || item.category === activeCategory;
      const matchesSearch = item.term.toLowerCase().includes(search.trim().toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [search, activeCategory]);

  const toggleExpand = (id: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const handleClearSearch = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setSearch('');
    if (Platform.OS === 'web') inputRef.current?.focus();
  };

  return (
    <View style={styles.container}>
      <DotGrid />

      {/* Header — centered */}
      <View style={styles.headerSection}>
        {/* Search Bar — same pattern as Home screen */}
        <View style={styles.searchBarContainer}>
          <View style={styles.searchBar}>
            <TextInput
              ref={inputRef}
              style={styles.searchInput}
              placeholder="Search a term (e.g. Class Diagram)"
              placeholderTextColor="#94a3b8"
              value={search}
              onChangeText={setSearch}
              autoCapitalize="none"
              returnKeyType="search"
              onSubmitEditing={() => Platform.OS !== 'web' && undefined}
            />
            {search.length > 0 && (
              <Pressable
                onPress={handleClearSearch}
                style={({ pressed }) => [styles.clearButton, pressed && styles.clearButtonPressed]}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <ClearIcon />
              </Pressable>
            )}
            <Pressable
              style={({ pressed }) => [styles.searchButton, pressed && styles.searchButtonPressed]}
            >
              <SearchIcon />
            </Pressable>
          </View>
        </View>

        {/* Category Filter Tabs — centered, wraps instead of horizontal scroll */}
        <View style={styles.tabsRow}>
          {CATEGORIES.map((cat) => {
            const isActive = activeCategory === cat;
            return (
              <Pressable
                key={cat}
                onPress={() => setActiveCategory(cat)}
                style={[styles.categoryChip, isActive && styles.categoryChipActive]}
              >
                <Text style={[styles.categoryChipText, isActive && styles.categoryChipTextActive]}>
                  {cat}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {search.length > 0 && (
          <View style={styles.searchInfo}>
            <Text style={styles.searchInfoText}>
              Found {filteredTerms.length} result{filteredTerms.length !== 1 ? 's' : ''} for "{search}"
            </Text>
          </View>
        )}
      </View>

      {/* Term List — centered column */}
      <ScrollView
        style={styles.list}
        contentContainerStyle={[
          styles.listContent,
          // Extra clearance on mobile/tablet so the last card isn't hidden
          // behind the floating docked bottom navbar (Navbar.tsx).
          { paddingBottom: isDesktop ? 32 : 120 },
        ]}
      >
        <View style={styles.listInner}>
          {filteredTerms.length === 0 ? (
            <View style={styles.emptyState}>
              <EmptySearchIcon />
              <Text style={styles.emptyStateTitle}>No matching terms found</Text>
              <Text style={styles.emptyText}>Try adjusting your search or category</Text>
            </View>
          ) : (
            filteredTerms.map((item) => {
              const isExpanded = expandedId === item.id;
              return (
                <Pressable
                  key={item.id}
                  onPress={() => toggleExpand(item.id)}
                  style={styles.card}
                >
                  <View style={styles.cardHeader}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.cardTerm}>{item.term}</Text>
                      <Text style={styles.cardCategory}>{item.category}</Text>
                    </View>
                    <ChevronIcon up={isExpanded} />
                  </View>
                  {isExpanded && (
                    <Text style={styles.cardDefinition}>{item.definition}</Text>
                  )}
                </Pressable>
              );
            })
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8faff',
  },
  dotGridContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
  },

  // Header — everything centered, same as Home screen's headerSection
  headerSection: {
    paddingTop: Platform.OS === 'ios' ? 50 : 16,
    paddingHorizontal: 16,
    paddingBottom: 12,
    alignItems: 'center',
  },

  // Search bar — copied from Home screen (centered, max width 640, search button)
  searchBarContainer: {
    alignSelf: 'center',
    width: '100%',
    maxWidth: 640,
    marginBottom: 16,
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
      web: { outlineStyle: 'none' as any },
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
    backgroundColor: '#3b5bdb',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchButtonPressed: {
    backgroundColor: '#2f4bc0',
  },
  searchInfo: {
    marginTop: 4,
    paddingHorizontal: 16,
    paddingVertical: 6,
    backgroundColor: '#eef2ff',
    borderRadius: 20,
  },
  searchInfoText: {
    fontSize: 12,
    color: '#3b5bdb',
    fontWeight: '500',
  },

  // Category tabs — centered, wraps on small widths
  tabsRow: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  categoryChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
  },
  categoryChipActive: {
    backgroundColor: '#3b5bdb',
    elevation: 3,
    shadowColor: '#3b5bdb',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  categoryChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  categoryChipTextActive: {
    color: '#ffffff',
  },

  // Term list — centered column, capped width like the desktop grid
  list: {
    flex: 1,
  },
  listContent: {
    flexGrow: 1,
    alignItems: 'center',
    paddingBottom: 32,
  },
  listInner: {
    width: '100%',
    maxWidth: 720,
    paddingHorizontal: 16,
    gap: 10,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardTerm: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1a1f36',
  },
  cardCategory: {
    fontSize: 12,
    color: '#3b5bdb',
    marginTop: 2,
  },
  cardDefinition: {
    marginTop: 10,
    fontSize: 13,
    lineHeight: 19,
    color: '#475569',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
    gap: 6,
  },
  emptyStateTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1f36',
    marginTop: 12,
  },
  emptyText: {
    fontSize: 13,
    color: '#94a3b8',
  },
});