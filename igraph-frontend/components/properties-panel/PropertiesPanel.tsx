import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  useWindowDimensions,
  Platform,
} from 'react-native';
import { Svg, Path } from 'react-native-svg';
import { InternalEvent } from '@maxgraph/core';
import { COLORS, SPACING, RADIUS, TYPOGRAPHY, SHADOWS } from '@/constants/theme';
import StyleTab from './StyleTab';
import TextTab from './TextTab';
import ArrangeTab from './ArrangeTab';

type TabKey = 'style' | 'text' | 'arrange';

interface PropertiesPanelProps {
  graph: any; // maxGraph Graph instance
  visible?: boolean; // optional external override (e.g. force-hide on mobile)
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

export default function PropertiesPanel({ graph, visible = true }: PropertiesPanelProps) {
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
  }, [graph]);

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
    <View style={[styles.panel, isMobile && styles.panelMobile]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          {selectedCells.length > 1 ? `${selectedCells.length} shapes selected` : 'Style'}
        </Text>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={() => setCollapsed(true)} style={styles.iconBtn}>
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
  panelMobile: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    zIndex: 20,
    width: Math.min(PANEL_WIDTH, 300),
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
});