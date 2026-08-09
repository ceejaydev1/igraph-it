import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Svg, Path } from 'react-native-svg';
import { InternalEvent } from '@maxgraph/core';
import { COLORS } from '@/constants/theme';
import { getCommonStyleValue, applyStylePatch } from './PropertiesPanel';
import { Dropdown, Tooltip } from './shared';

// ─── Edge-only controls: Waypoints (routing) + Connection (arrowhead) ──────
// draw.io's toolbar shows these right beside the line-style picker. Both
// only make sense for edges (connectors) — a shape's own outline doesn't
// route or have an arrowhead. Extracted out of QuickFormatBar so the mobile
// "Connectors" sheet can render the exact same controls (same state, same
// patch logic) instead of a second, drifting copy.

type WaypointStyle = 'straight' | 'orthogonal' | 'curved' | 'entityRelation';
const WAYPOINT_STYLES: { key: WaypointStyle; label: string }[] = [
  { key: 'straight', label: 'Straight' },
  { key: 'orthogonal', label: 'Orthogonal' },
  { key: 'curved', label: 'Curved' },
  { key: 'entityRelation', label: 'Entity Relation' },
];

// maxGraph's registered edge-routing names (registerDefaultEdgeStyles) —
// 'straight' isn't one of them, it just means "no edgeStyle set".
const WAYPOINT_EDGE_STYLE: Record<WaypointStyle, string | undefined> = {
  straight: undefined,
  orthogonal: 'orthogonalEdgeStyle',
  curved: 'orthogonalEdgeStyle',
  entityRelation: 'entityRelationEdgeStyle',
};

function getWaypointStyle(cells: any[]): WaypointStyle | undefined {
  const edgeStyle = getCommonStyleValue(cells, 'edgeStyle') as string | undefined;
  const curved = getCommonStyleValue(cells, 'curved');
  if (cells.length === 0) return undefined;
  if (edgeStyle === 'entityRelationEdgeStyle') return 'entityRelation';
  if (edgeStyle === 'orthogonalEdgeStyle') return curved ? 'curved' : 'orthogonal';
  if (!edgeStyle) return 'straight';
  return undefined;
}

type ConnectionArrow = 'classic' | 'open' | 'block' | 'none';
const CONNECTION_ARROWS: { key: ConnectionArrow; label: string }[] = [
  { key: 'classic', label: 'Classic' },
  { key: 'open', label: 'Open' },
  { key: 'block', label: 'Block' },
  { key: 'none', label: 'None' },
];

/** A short line ending in the actual arrowhead shape, instead of a text
 *  label — shows what the connector will really look like. Sized to fill a
 *  96px-wide trigger (matching Line Style's own preview, which spans its
 *  box edge-to-edge) instead of sitting as a small icon lost in extra
 *  whitespace. */
function ConnectionPreview({ arrow }: { arrow: ConnectionArrow }) {
  const color = COLORS.gray700;
  return (
    <View style={styles.symbolPreviewWrap}>
      <Svg width={48} height={16} viewBox="0 0 48 16">
        <Path d="M2 8H32" stroke={color} strokeWidth={1.6} fill="none" strokeLinecap="round" />
        {arrow === 'classic' && <Path d="M32 8L21 3V13Z" fill={color} />}
        {arrow === 'block' && <Path d="M32 8L20 3V13Z" fill={color} stroke={color} strokeWidth={1} strokeLinejoin="round" />}
        {arrow === 'open' && (
          <Path d="M22 3L32 8L22 13" stroke={color} strokeWidth={1.6} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        )}
      </Svg>
    </View>
  );
}

/** Small routed path matching how the connector will actually be drawn —
 *  straight/orthogonal/curved/entity-relation — instead of a text label.
 *  Same 48px-wide sizing as ConnectionPreview, for the same reason. */
function WaypointsPreview({ style }: { style: WaypointStyle }) {
  const color = COLORS.gray700;
  const d = {
    straight: 'M4 13L44 3',
    orthogonal: 'M4 13H24V3H44',
    curved: 'M4 13C22 13 26 3 44 3',
    entityRelation: 'M4 13H14C14 8 14 3 24 3H44',
  }[style];
  return (
    <View style={styles.symbolPreviewWrap}>
      <Svg width={48} height={16} viewBox="0 0 48 16">
        <Path d={d} stroke={color} strokeWidth={1.6} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    </View>
  );
}

interface EdgeConnectorControlsProps {
  graph: any; // maxGraph Graph instance
  /** 'toolbar' = compact icon-only dropdowns for the desktop QuickFormatBar
   *  row (hover tooltip carries the label). 'sheet' = labeled, full-width
   *  dropdowns for the mobile bottom sheet (no hover on touch, so the label
   *  has to sit on the row itself). */
  variant?: 'toolbar' | 'sheet';
}

export default function EdgeConnectorControls({ graph, variant = 'toolbar' }: EdgeConnectorControlsProps) {
  const [edgeCells, setEdgeCells] = useState<any[]>([]);

  useEffect(() => {
    if (!graph) {
      setEdgeCells([]);
      return;
    }

    const handleSelectionChange = () => {
      const selected = graph.getSelectionCells?.() ?? [];
      setEdgeCells(selected.filter((c: any) => c.isEdge && c.isEdge()));
    };

    const selectionModel = graph.getSelectionModel();
    selectionModel.addListener(InternalEvent.CHANGE, handleSelectionChange);
    handleSelectionChange();

    return () => selectionModel.removeListener(handleSelectionChange);
  }, [graph]);

  // Connection + Waypoints work two ways, matching draw.io: with an edge
  // selected, they restyle that edge; with nothing selected (including
  // before any connection has ever been drawn), they instead set the
  // graph's default edge style, so the *next* connection you draw picks it
  // up. Either way they're live/interactive from the start — unlike most
  // style controls they don't need a selection to be useful.
  const edgePatch = (p: Record<string, any>) => {
    if (edgeCells.length > 0) {
      applyStylePatch(graph, edgeCells, p);
    } else if (graph) {
      Object.assign(graph.getStylesheet().getDefaultEdgeStyle(), p);
    }
  };

  const defaultEdgeStyle = graph?.getStylesheet?.()?.getDefaultEdgeStyle?.() ?? {};
  const waypointStyle = edgeCells.length > 0 ? getWaypointStyle(edgeCells) : getWaypointStyle([{ getStyle: () => defaultEdgeStyle }]);
  const connectionArrow = (
    edgeCells.length > 0
      ? (getCommonStyleValue(edgeCells, 'endArrow') as ConnectionArrow | undefined)
      : (defaultEdgeStyle.endArrow as ConnectionArrow | undefined)
  ) ?? undefined;

  const handleWaypointStyle = (style: WaypointStyle) => {
    edgePatch({ edgeStyle: WAYPOINT_EDGE_STYLE[style], curved: style === 'curved' ? 1 : undefined });
  };

  const handleConnectionArrow = (arrow: ConnectionArrow) => {
    edgePatch({ endArrow: arrow });
  };

  if (variant === 'sheet') {
    const activeConnection = connectionArrow ?? CONNECTION_ARROWS[0].key;
    const activeWaypoint = waypointStyle ?? WAYPOINT_STYLES[0].key;

    return (
      <View style={styles.sheetGroup}>
        {/* Same tile-row shape as ShapesBottomPanel's shape grid (title above,
            a horizontal row of directly-tappable tiles below) instead of a
            dropdown — there's no hover on touch to preview a collapsed
            dropdown's current value, and this way every option is visible
            and one tap away, same as picking a shape. */}
        <Text style={styles.sheetSectionTitle}>Connection</Text>
        <View style={styles.sheetRow}>
          {CONNECTION_ARROWS.map((opt) => (
            <TouchableOpacity
              key={opt.key}
              style={[styles.sheetTile, activeConnection === opt.key && styles.sheetTileActive]}
              onPress={() => handleConnectionArrow(opt.key)}
              activeOpacity={0.7}
            >
              <ConnectionPreview arrow={opt.key} />
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.sheetSectionTitle}>Waypoints</Text>
        <View style={styles.sheetRow}>
          {WAYPOINT_STYLES.map((opt) => (
            <TouchableOpacity
              key={opt.key}
              style={[styles.sheetTile, activeWaypoint === opt.key && styles.sheetTileActive]}
              onPress={() => handleWaypointStyle(opt.key)}
              activeOpacity={0.7}
            >
              <WaypointsPreview style={opt.key} />
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.toolbarGroup}>
      <Tooltip label="Connection">
        <View style={styles.connectionDropdown}>
          <Dropdown<ConnectionArrow>
            value={connectionArrow ?? CONNECTION_ARROWS[0].key}
            options={CONNECTION_ARROWS}
            onChange={handleConnectionArrow}
            renderValue={(key) => <ConnectionPreview arrow={key} />}
            itemTooltips
          />
        </View>
      </Tooltip>
      <Tooltip label="Waypoints">
        <View style={styles.waypointsDropdown}>
          <Dropdown<WaypointStyle>
            value={waypointStyle ?? WAYPOINT_STYLES[0].key}
            options={WAYPOINT_STYLES}
            onChange={handleWaypointStyle}
            renderValue={(key) => <WaypointsPreview style={key} />}
            itemTooltips
          />
        </View>
      </Tooltip>
    </View>
  );
}

const styles = StyleSheet.create({
  toolbarGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  // Matches Line Style's own box 1:1: same 96px width, and — like
  // lineStyleDropdown in QuickFormatBar — no border/radius/background of
  // its own. Dropdown's inner dropdownTrigger already draws exactly that
  // (rowStyles.dropdownTrigger), so adding a second one here on the outer
  // wrapper stacked a duplicate border directly on top of it, reading as a
  // heavier/uneven edge next to Line Style's single clean border.
  connectionDropdown: {
    width: 96,
  },
  waypointsDropdown: {
    width: 96,
  },
  // No paddingVertical here (unlike a first pass at this that added 8, to
  // "match" LinePreview's own padding) — dropdownTrigger, the parent both
  // this and LinePreview sit inside, already contributes paddingVertical:8
  // itself. LinePreview's actual content is a near-zero-height line, so
  // that trigger padding alone is basically its full visible height.
  // ConnectionPreview/WaypointsPreview's content is a real 16px-tall icon,
  // so adding the *same* wrapper padding on top of the *same* trigger
  // padding stacked height on top of height and made these two boxes taller
  // than Line Style's, not matched to it.
  symbolPreviewWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetGroup: {
    gap: 4,
  },
  sheetSectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.gray700,
    marginBottom: 6,
  },
  // Same tile-row shape as ShapesBottomPanel's shapesGrid + shapeTile: a
  // horizontal row of directly-tappable, individually-rounded tiles instead
  // of a bordered segmented control.
  sheetRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  // Inactive: a subtle, consistently-visible border (matching the desktop
  // dropdowns' own border color) instead of a transparent one relying on
  // background fill alone to read as a tile. Active: a heavier primary-
  // color border + tinted background so selection is unambiguous.
  sheetTile: {
    flex: 1,
    height: 44,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetTileActive: {
    backgroundColor: COLORS.primaryLight,
    borderColor: COLORS.primary,
    borderWidth: 1.5,
  },
});
