import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  useWindowDimensions,
  Platform,
  Dimensions,
  Animated,
  PanResponder,
} from 'react-native';
import { Svg, Path, Rect } from 'react-native-svg';
import { InternalEvent } from '@maxgraph/core';
import { COLORS, SPACING, RADIUS, TYPOGRAPHY, SHADOWS } from '@/constants/theme';
import StyleTab from './StyleTab';
import TextTab from './TextTab';
import ArrangeTab from './ArrangeTab';

type TabKey = 'style' | 'text' | 'arrange';

// Matches ShapesBottomPanel's own module-level Dimensions.get('window') read
// (same accepted tradeoff: doesn't react to rotation, but this app is a
// portrait-locked mobile editor).
const { height: SCREEN_HEIGHT } = Dimensions.get('window');
// A short, scrollable strip — not a tall drawer — so most of the diagram
// canvas stays visible above it, matching Word Mobile's compact format bar
// (its own options list scrolls within a similarly short strip rather than
// growing the sheet to fit everything at once).
const MOBILE_SHEET_HEIGHT = Math.min(300, SCREEN_HEIGHT * 0.38);

interface PropertiesPanelProps {
  graph: any; // maxGraph Graph instance
  visible?: boolean; // optional external override (e.g. force-hide on mobile)
  /** Skip the collapsed edge-rail and always render the full panel — used by
   *  the mobile bottom toolbar's "Properties" tab, which is itself the
   *  explicit open/close control, so the rail would just be a redundant
   *  second toggle. */
  forceOpen?: boolean;
  /** Called when the header's collapse/close buttons are used while forceOpen
   *  is set, so the external toggle driving forceOpen (e.g. the mobile
   *  toolbar tab) can flip back off in sync — otherwise those buttons would
   *  do nothing (collapsing is a no-op under forceOpen) or desync from the
   *  tab's active state. */
  onRequestClose?: () => void;
  /** Height (in px) of whatever bottom toolbar this panel should sit above on
   *  mobile, so the sheet's bottom edge lines up with it instead of covering
   *  it. Ignored on desktop. */
  toolbarHeight?: number;
  /** Jumps to this tab whenever it (or `visible`) changes — lets an external
   *  trigger open straight to a specific tab (e.g. mobile's Text/Draw/Comment
   *  buttons opening directly to Text/Style/Arrange) instead of always
   *  landing on whichever tab was last active. The tab bar itself still lets
   *  the user switch freely afterwards. */
  initialTab?: TabKey;
}

// ─── Shared style helpers, exported for the tab components ────────────────

export type StyleValue = string | number | undefined;

/** Reads a style key across all selected cells. Returns undefined if mixed. */
export function getCommonStyleValue(cells: any[], key: string): StyleValue {
  if (cells.length === 0) return undefined;
  const values = cells.map((c) => (c.getStyle ? c.getStyle()?.[key] : undefined));
  const first = values[0];
  const allSame = values.every((v) => v === first);
  return allSame ? first : undefined;
}

/** Reads a geometry field across all selected cells (undefined if mixed). */
export function getCommonGeoValue(cells: any[], key: 'x' | 'y' | 'width' | 'height'): StyleValue {
  if (cells.length === 0) return undefined;
  const values = cells.map((c) => c.getGeometry?.()?.[key]);
  const first = values[0];
  const allSame = values.every((v) => v === first);
  return allSame ? first : undefined;
}

/**
 * Applies a partial style patch to every selected cell as ONE undoable edit.
 * Uses graph.batchUpdate so multi-cell changes collapse into a single undo step.
 */
export function applyStylePatch(graph: any, cells: any[], patch: Record<string, any>) {
  if (!graph || cells.length === 0) return;
  graph.batchUpdate(() => {
    cells.forEach((cell: any) => {
      const currentStyle = cell.getStyle ? { ...cell.getStyle() } : {};
      const nextStyle = { ...currentStyle, ...patch };
      graph.getDataModel().setStyle(cell, nextStyle);
    });
  });
}

/** Replaces the entire style object on every selected cell (used by Edit Style). */
export function replaceStyle(graph: any, cells: any[], newStyle: Record<string, any>) {
  if (!graph || cells.length === 0) return;
  graph.batchUpdate(() => {
    cells.forEach((cell: any) => {
      graph.getDataModel().setStyle(cell, { ...newStyle });
    });
  });
}

// ─── Icons ──────────────────────────────────────────────────────────────────

const CloseIcon = ({ color = COLORS.gray500 }: { color?: string }) => (
  <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
    <Path d="M18 6L6 18M6 6L18 18" stroke={color} strokeWidth={2} strokeLinecap="round" />
  </Svg>
);

const ChevronIcon = ({ open, color = COLORS.gray500 }: { open: boolean; color?: string }) => (
  <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
    <Path
      d={open ? 'M9 18l6-6-6-6' : 'M15 6l-6 6 6 6'}
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const TABS: { key: TabKey; label: string }[] = [
  { key: 'style', label: 'Style' },
  { key: 'text', label: 'Text' },
  { key: 'arrange', label: 'Arrange' },
];

export default function PropertiesPanel({ graph, visible = true, forceOpen = false, onRequestClose, toolbarHeight = 0, initialTab }: PropertiesPanelProps) {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  const [selectedCells, setSelectedCells] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<TabKey>('style');
  const [collapsed, setCollapsed] = useState(isMobile); // collapsed by default on small viewports
  const [, forceTick] = useState(0); // used to re-render tabs after external (e.g. rotation handle) updates

  const listenerRef = useRef<any>(null);
  // Reset scroll to top whenever the active tab changes, so switching tabs
  // doesn't leave the user scrolled halfway down the previous tab's content.
  const scrollRef = useRef<ScrollView>(null);

  // Jump to the requested tab whenever the trigger changes tab or re-opens
  // the panel — see initialTab's doc comment.
  useEffect(() => {
    if (initialTab && visible) setActiveTab(initialTab);
  }, [initialTab, visible]);

  // ─── Selection-change wiring ──────────────────────────────────────────────
  useEffect(() => {
    if (!graph) return;

    const handleSelectionChange = () => {
      const cells = graph.getSelectionCells?.() ?? [];
      const vertices = cells.filter((c: any) => c.isVertex && c.isVertex());
      setSelectedCells(vertices);
      if (vertices.length > 0 && isMobile) setCollapsed(false);
    };

    const selectionModel = graph.getSelectionModel();
    selectionModel.addListener(InternalEvent.CHANGE, handleSelectionChange);
    listenerRef.current = handleSelectionChange;

    // Also refresh values live when geometry/style changes via other means
    // (e.g. dragging, resizing, or your rotation handle updating style.rotation)
    graph.getDataModel().addListener(InternalEvent.CHANGE, () => {
      forceTick((t) => t + 1);
    });

    // Populate initial state in case something is already selected
    handleSelectionChange();

    return () => {
      selectionModel.removeListener(handleSelectionChange);
    };
  }, [graph]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  }, [activeTab]);

  const hasSelection = selectedCells.length > 0;

  const handleClose = useCallback(() => {
    graph?.clearSelection?.();
    onRequestClose?.();
  }, [graph, onRequestClose]);

  const handleChevronPress = useCallback(() => {
    if (forceOpen) {
      onRequestClose?.();
      return;
    }
    setCollapsed(true);
  }, [forceOpen, onRequestClose]);

  // ─── Mobile bottom sheet: animated open/close + swipe-down-to-close ───────
  // Mirrors ShapesBottomPanel's feel (slide up/down, draggable handle)
  // instead of the panel just snapping in/out of existence.
  const isMobileSheet = isMobile && forceOpen;
  // No hasSelection gate here (unlike the desktop/rail path below): this
  // sheet is opened explicitly via the Text/Draw/Comment toolbar buttons —
  // same as ShapesBottomPanel opens on its own toolbar tap regardless of
  // selection — so it should open right away instead of silently no-op'ing
  // until something happens to already be selected.
  const shouldShowSheet = isMobileSheet && visible;

  const sheetHeightAnim = useRef(new Animated.Value(0)).current;
  const dragYAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!isMobileSheet) return;
    dragYAnim.setValue(0);
    Animated.spring(sheetHeightAnim, {
      toValue: shouldShowSheet ? MOBILE_SHEET_HEIGHT : 0,
      useNativeDriver: false,
      tension: 65,
      friction: 12,
    }).start();
  }, [shouldShowSheet, isMobileSheet]);

  const dragCloseThreshold = 70;
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dy) > 4,
      onPanResponderMove: (_, gesture) => {
        if (gesture.dy > 0) dragYAnim.setValue(gesture.dy);
      },
      onPanResponderRelease: (_, gesture) => {
        if (gesture.dy > dragCloseThreshold) {
          onRequestClose?.();
        } else {
          Animated.spring(dragYAnim, { toValue: 0, useNativeDriver: false, tension: 65, friction: 12 }).start();
        }
      },
    })
  ).current;

  // ─── Mobile bottom sheet (Text/Draw/Comment → Text/Style/Arrange) ─────────
  // Always mounted (never returns null) so open/close can animate like
  // ShapesBottomPanel — it just animates its height to 0 and disables
  // pointer events instead of unmounting. No internal tab bar: the toolbar
  // button that opened it (Text/Draw/Comment) IS the tab selector, so only
  // that one tab's content ever shows here.
  if (isMobileSheet) {
    const activeTabLabel = TABS.find((t) => t.key === activeTab)?.label ?? 'Style';
    return (
      <Animated.View
        style={[
          styles.panel,
          styles.panelMobile,
          {
            bottom: toolbarHeight,
            height: sheetHeightAnim,
            opacity: sheetHeightAnim.interpolate({ inputRange: [0, 40], outputRange: [0, 1], extrapolate: 'clamp' }),
            transform: [{ translateY: dragYAnim }],
          },
        ]}
        pointerEvents={shouldShowSheet ? 'auto' : 'none'}
      >
        {/* Drag-handle: also the swipe-down-to-close gesture surface. Same
            spacing as ShapesBottomPanel's handleContainer. */}
        <View style={styles.sheetHandleRow} {...panResponder.panHandlers}>
          <Svg width={36} height={4} viewBox="0 0 36 4">
            <Rect x="0" y="0" width="36" height="4" rx="2" fill={COLORS.gray300} />
          </Svg>
        </View>

        {/* Header matches ShapesBottomPanel's panelHeader/panelTitle/
            panelCloseBtn exactly (no border, no fixed row height, same
            title size/weight/color, same 4px close-button padding) so the
            two sheets read as one consistent system, not two designs. */}
        <View style={styles.sheetHeader}>
          <Text style={styles.sheetTitle}>
            {selectedCells.length > 1 ? `${selectedCells.length} shapes selected` : activeTabLabel}
          </Text>
          <TouchableOpacity
            onPress={handleClose}
            style={styles.sheetCloseBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <CloseIcon color="#4a5568" />
          </TouchableOpacity>
        </View>

        <ScrollView
          ref={scrollRef}
          style={styles.tabContent}
          contentContainerStyle={styles.tabContentInner}
          showsVerticalScrollIndicator={Platform.OS === 'web'}
          keyboardShouldPersistTaps="handled"
          nestedScrollEnabled
        >
          {!hasSelection && (
            <Text style={styles.emptyStateText}>Select a shape to edit its {activeTabLabel.toLowerCase()}.</Text>
          )}
          {hasSelection && activeTab === 'style' && <StyleTab graph={graph} cells={selectedCells} />}
          {hasSelection && activeTab === 'text' && <TextTab graph={graph} cells={selectedCells} />}
          {hasSelection && activeTab === 'arrange' && <ArrangeTab graph={graph} cells={selectedCells} />}
        </ScrollView>
      </Animated.View>
    );
  }

  if (!visible || !hasSelection) return null;

  // ─── Collapsed rail (mobile-friendly toggle tab) ──────────────────────────
  if (collapsed) {
    return (
      <TouchableOpacity
        style={styles.collapsedRail}
        onPress={() => setCollapsed(false)}
        activeOpacity={0.8}
      >
        <ChevronIcon open={false} color={COLORS.primary} />
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.panel}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          {selectedCells.length > 1 ? `${selectedCells.length} shapes selected` : 'Style'}
        </Text>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={handleChevronPress} style={styles.iconBtn}>
            <ChevronIcon open={true} />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleClose} style={styles.iconBtn}>
            <CloseIcon />
          </TouchableOpacity>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabBar}>
        {TABS.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tabBtn, activeTab === tab.key && styles.tabBtnActive]}
            onPress={() => setActiveTab(tab.key)}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabLabel, activeTab === tab.key && styles.tabLabelActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Tab content — scrollable so sections like Spacing/Advanced don't get clipped
          when everything is expanded and the content is taller than the panel. */}
      <ScrollView
        ref={scrollRef}
        style={styles.tabContent}
        contentContainerStyle={styles.tabContentInner}
        showsVerticalScrollIndicator={Platform.OS === 'web'}
        keyboardShouldPersistTaps="handled"
        nestedScrollEnabled
      >
        {activeTab === 'style' && <StyleTab graph={graph} cells={selectedCells} />}
        {activeTab === 'text' && <TextTab graph={graph} cells={selectedCells} />}
        {activeTab === 'arrange' && <ArrangeTab graph={graph} cells={selectedCells} />}
      </ScrollView>
    </View>
  );
}

const PANEL_WIDTH = 280;

const styles = StyleSheet.create({
  panel: {
    width: PANEL_WIDTH,
    height: '100%',
    backgroundColor: COLORS.white,
    borderLeftWidth: 1,
    borderLeftColor: COLORS.border,
    ...(Platform.OS === 'web' ? { boxShadow: '-2px 0 12px rgba(15,23,42,0.05)' } : SHADOWS.md),
  },
  // Bottom sheet, not a full-height side drawer: only `left`/`right`/`bottom`
  // are set here — no `top`, since the explicit `height: MOBILE_SHEET_HEIGHT`
  // passed inline is what keeps this short enough to leave the canvas visible
  // above it (see the component's `bottom: toolbarHeight` inline override,
  // which docks it right above the mobile bottom toolbar instead of under it).
  // Values match ShapesBottomPanel's `panelContainer` 1:1 (radius, shadow,
  // zIndex) so the two sheets read as one consistent system.
  panelMobile: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 5,
    // NOTE: `width: undefined` here would NOT clear `panel`'s width: 280 —
    // react-native-web's style merge (styleq) skips keys whose value is
    // undefined rather than treating them as an override, so the base
    // panel's fixed width silently won through. An explicit value is
    // required to actually override it.
    width: '100%',
    borderLeftWidth: 0,
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
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
  sheetHandleRow: {
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 4,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 4,
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1a1f36',
  },
  sheetCloseBtn: {
    padding: 4,
  },
  collapsedRail: {
    position: 'absolute',
    top: '50%',
    right: 0,
    width: 22,
    height: 56,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRightWidth: 0,
    borderTopLeftRadius: RADIUS.md,
    borderBottomLeftRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,
    ...SHADOWS.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 44,
    paddingHorizontal: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  headerTitle: {
    ...TYPOGRAPHY.captionBold,
    color: COLORS.gray900,
  },
  headerActions: {
    flexDirection: 'row',
    gap: SPACING.xs,
  },
  iconBtn: {
    width: 26,
    height: 26,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: SPACING.sm,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabBtnActive: {
    borderBottomColor: COLORS.primary,
  },
  tabLabel: {
    fontSize: 12,
    lineHeight: 16,
    color: COLORS.gray500,
    fontWeight: '600',
  },
  tabLabelActive: {
    color: COLORS.primary,
  },
  tabContent: {
    flex: 1,
  },
  tabContentInner: {
    padding: SPACING.md,
    paddingBottom: SPACING.xl,
  },
  emptyStateText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.gray500,
    textAlign: 'center',
    paddingVertical: SPACING.lg,
  },
});