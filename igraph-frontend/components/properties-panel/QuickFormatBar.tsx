import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { InternalEvent } from '@maxgraph/core';
import { COLORS } from '@/constants/theme';
import { applyStylePatch, getCommonStyleValue } from './PropertiesPanel';
import { MiniSwatch, ToggleButton, Dropdown, NumberStepper, Tooltip } from './shared';
import { BoldIcon, ItalicIcon, UnderlineIcon, AlignLeftIcon, AlignCenterIcon, AlignRightIcon } from './icons';
import EdgeConnectorControls from './EdgeConnectorControls';

type LineStyle = 'solid' | 'dashed' | 'dotted';
const LINE_STYLES: { key: LineStyle; label: string }[] = [
  { key: 'solid', label: 'Solid' },
  { key: 'dashed', label: 'Dashed' },
  { key: 'dotted', label: 'Dotted' },
];

/** Actual solid/dashed/dotted rule, drawn with the real CSS border style
 *  (not a text label) so the dropdown shows what the line will really look
 *  like — matches the line-style pickers in draw.io / Lucidchart. */
function LinePreview({ style }: { style: LineStyle }) {
  return (
    <View style={styles.linePreviewWrap}>
      <View style={[styles.linePreviewRule, { borderStyle: style }]} />
    </View>
  );
}

const FONT_FAMILIES = ['Helvetica', 'Arial', 'Verdana', 'Georgia', 'Times New Roman', 'Courier New'];
const FONT_FAMILY_OPTIONS = FONT_FAMILIES.map((f) => ({ key: f, label: f }));

/** Renders the font name label set in that font itself (e.g. "Times New Roman"
 *  actually shown in Times New Roman), matching the sidebar Text tab's font
 *  menu and how draw.io / Lucidchart preview fonts in their font pickers. */
function FontFamilyLabel({ family }: { family: string }) {
  return (
    <Text
      numberOfLines={1}
      style={[styles.fontFamilyLabel, Platform.OS === 'web' ? { fontFamily: family } : null]}
    >
      {family}
    </Text>
  );
}

function getLineStyle(cells: any[]): LineStyle | undefined {
  const dashed = getCommonStyleValue(cells, 'dashed');
  const pattern = getCommonStyleValue(cells, 'dashPattern');
  if (dashed === undefined) return undefined;
  if (!dashed || dashed === 0) return 'solid';
  return pattern === '1 2' ? 'dotted' : 'dashed';
}

interface QuickFormatBarProps {
  graph: any; // maxGraph Graph instance
}

/** Compact, always-visible strip of the most common shape/text formatting
 *  controls — font, size, bold/italic/underline, font color, text align,
 *  fill, line color/width/style — living next to Undo/Redo. Matches the
 *  "second row" toolbar in draw.io / Lucidchart. Mirrors the sidebar's
 *  Style/Text tabs (same patch helpers) but disables itself when nothing is
 *  selected instead of disappearing, so the row layout next to Undo/Redo
 *  stays stable.
 *
 *  Deliberately NOT wrapped in a ScrollView: the Dropdown/MiniSwatch popovers
 *  it uses render as position:'absolute' children that pop open *below* the
 *  row, and a horizontal ScrollView's own overflow clipping (needed to make
 *  the scroll axis work) clips that perpendicular (vertical) overflow too —
 *  the popovers would silently fail to render. A plain row can overflow the
 *  viewport on very narrow windows, which is a lesser problem than that. */
export default function QuickFormatBar({ graph }: QuickFormatBarProps) {
  const [cells, setCells] = useState<any[]>([]);
  const [edgeCells, setEdgeCells] = useState<any[]>([]);

  useEffect(() => {
    if (!graph) {
      setCells([]);
      setEdgeCells([]);
      return;
    }

    const handleSelectionChange = () => {
      const selected = graph.getSelectionCells?.() ?? [];
      setCells(selected.filter((c: any) => c.isVertex && c.isVertex()));
      setEdgeCells(selected.filter((c: any) => c.isEdge && c.isEdge()));
    };

    const selectionModel = graph.getSelectionModel();
    selectionModel.addListener(InternalEvent.CHANGE, handleSelectionChange);
    handleSelectionChange();

    return () => selectionModel.removeListener(handleSelectionChange);
  }, [graph]);

  const disabled = cells.length === 0;
  const patch = (p: Record<string, any>) => applyStylePatch(graph, cells, p);

  const fontFamily = getCommonStyleValue(cells, 'fontFamily') as string | undefined;
  const fontSize = getCommonStyleValue(cells, 'fontSize') as number | undefined;
  const fontColor = getCommonStyleValue(cells, 'fontColor') as string | undefined;
  const fontStyle = getCommonStyleValue(cells, 'fontStyle') as number | undefined;
  const align = getCommonStyleValue(cells, 'align') as string | undefined;

  const fillColor = getCommonStyleValue(cells, 'fillColor') as string | undefined;

  // Line Color/Width/Style apply to edges too, not just shapes — a
  // connector's line *is* its whole visible style, so restricting these to
  // vertex-only `cells` (as Fill/Font/Align rightly are) meant selecting
  // just a connector left them doing nothing. `lineCells` is vertices+edges
  // together so whichever's selected gets restyled.
  const lineCells = edgeCells.length > 0 ? [...cells, ...edgeCells] : cells;
  const lineDisabled = lineCells.length === 0;
  const linePatch = (p: Record<string, any>) => applyStylePatch(graph, lineCells, p);
  const strokeColor = getCommonStyleValue(lineCells, 'strokeColor') as string | undefined;
  const strokeWidth = getCommonStyleValue(lineCells, 'strokeWidth') as number | undefined;
  const lineStyle = getLineStyle(lineCells);

  const isBold = ((fontStyle ?? 0) & 1) === 1;
  const isItalic = ((fontStyle ?? 0) & 2) === 2;
  const isUnderline = ((fontStyle ?? 0) & 4) === 4;

  const toggleFontStyleBit = (bit: number) => {
    const current = fontStyle ?? 0;
    const next = current & bit ? current & ~bit : current | bit;
    patch({ fontStyle: next });
  };

  const handleLineStyle = (style: LineStyle) => {
    if (style === 'solid') linePatch({ dashed: 0, dashPattern: undefined });
    if (style === 'dashed') linePatch({ dashed: 1, dashPattern: '8 4' });
    if (style === 'dotted') linePatch({ dashed: 1, dashPattern: '1 2' });
  };

  return (
    // Outer row is never dimmed/blocked itself — only `vertexControls` below
    // is. CSS opacity on an ancestor dims every descendant no matter what
    // pointerEvents says on a child (unlike pointer-events, opacity can't be
    // "opted out of" partway down the tree), so Connection/Waypoints have to
    // live outside that dimmed subtree entirely, not just override
    // pointerEvents inside it — otherwise they render faded even while
    // fully clickable.
    <View style={styles.row}>
      <View
        style={[styles.vertexControls, disabled && styles.rowDisabled]}
        pointerEvents={disabled ? 'none' : 'auto'}
      >
      <Tooltip label="Font Family">
        <View style={styles.fontFamilyDropdown}>
          <Dropdown<string>
            value={fontFamily ?? FONT_FAMILY_OPTIONS[0].key}
            options={FONT_FAMILY_OPTIONS}
            onChange={(f) => patch({ fontFamily: f })}
            renderValue={(f) => <FontFamilyLabel family={f} />}
          />
        </View>
      </Tooltip>

      <Tooltip label="Font Size">
        <View style={styles.fontSizeStepper}>
          <NumberStepper value={fontSize} onChange={(n) => patch({ fontSize: n })} min={6} max={96} step={1} suffix="px" />
        </View>
      </Tooltip>

      <View style={styles.divider} />

      <Tooltip label="Bold">
        <ToggleButton active={isBold} onPress={() => toggleFontStyleBit(1)}>
          <BoldIcon active={isBold} />
        </ToggleButton>
      </Tooltip>
      <Tooltip label="Italic">
        <ToggleButton active={isItalic} onPress={() => toggleFontStyleBit(2)}>
          <ItalicIcon active={isItalic} />
        </ToggleButton>
      </Tooltip>
      <Tooltip label="Underline">
        <ToggleButton active={isUnderline} onPress={() => toggleFontStyleBit(4)}>
          <UnderlineIcon active={isUnderline} />
        </ToggleButton>
      </Tooltip>

      <Tooltip label="Font Color">
        <MiniSwatch
          value={fontColor ?? '#000000'}
          onChange={(hex) => patch({ fontColor: hex })}
          disabled={disabled}
          title="Select a font color"
        />
      </Tooltip>

      <View style={styles.divider} />

      <Tooltip label="Align Left">
        <ToggleButton active={align === 'left'} onPress={() => patch({ align: 'left' })}>
          <AlignLeftIcon active={align === 'left'} />
        </ToggleButton>
      </Tooltip>
      <Tooltip label="Align Center">
        <ToggleButton active={align === 'center'} onPress={() => patch({ align: 'center' })}>
          <AlignCenterIcon active={align === 'center'} />
        </ToggleButton>
      </Tooltip>
      <Tooltip label="Align Right">
        <ToggleButton active={align === 'right'} onPress={() => patch({ align: 'right' })}>
          <AlignRightIcon active={align === 'right'} />
        </ToggleButton>
      </Tooltip>

      <View style={styles.divider} />

      <Tooltip label="Fill Color">
        <MiniSwatch
          value={fillColor ?? '#ffffff'}
          onChange={(hex) => patch({ fillColor: hex })}
          disabled={disabled}
          title="Select a fill color"
          allowNone
        />
      </Tooltip>
      </View>

      <View style={styles.divider} />

      {/* Line Color/Width/Style get their own group (not `vertexControls`,
          not `disabled`) because they're valid on edges too — a connector
          with no shape selected still has a line. `lineDisabled` covers the
          one case that's actually empty: nothing at all selected. */}
      <View
        style={[styles.vertexControls, lineDisabled && styles.rowDisabled]}
        pointerEvents={lineDisabled ? 'none' : 'auto'}
      >
      <Tooltip label="Line Color">
        <MiniSwatch
          value={strokeColor ?? '#000000'}
          onChange={(hex) => linePatch({ strokeColor: hex })}
          disabled={lineDisabled}
          title="Select a line color"
          allowNone
        />
      </Tooltip>

      <Tooltip label="Line Width">
        <View style={styles.strokeWidthStepper}>
          <NumberStepper value={strokeWidth ?? 1} onChange={(n) => linePatch({ strokeWidth: n })} min={0} max={10} step={1} suffix="pt" />
        </View>
      </Tooltip>

      <Tooltip label="Line Style">
        <View style={styles.lineStyleDropdown}>
          <Dropdown<LineStyle>
            value={lineStyle ?? LINE_STYLES[0].key}
            options={LINE_STYLES}
            onChange={handleLineStyle}
            renderValue={(key) => <LinePreview style={key} />}
          />
        </View>
      </Tooltip>
      </View>

      <View style={styles.divider} />

      {/* Unlike every other control in this bar, these two don't need — and
          deliberately aren't gated behind — a selection: with an edge
          selected they restyle it, otherwise they set the graph's default
          edge style for the *next* connection you draw. Living outside
          `vertexControls` above (rather than inside it with a pointerEvents
          override) is what keeps them fully opaque/legible even while that
          group is dimmed for "nothing selected". */}
      <EdgeConnectorControls graph={graph} variant="toolbar" />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  // Just the font/fill/line group that genuinely needs a selection — split
  // out from `row` so Connection/Waypoints (siblings, outside this View)
  // never inherit its dimmed opacity when nothing's selected.
  vertexControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  rowDisabled: {
    opacity: 0.4,
  },
  divider: {
    width: 1,
    height: 20,
    backgroundColor: COLORS.border,
    marginHorizontal: 4,
  },
  fontFamilyDropdown: {
    width: 110,
  },
  lineStyleDropdown: {
    width: 96,
  },
  fontSizeStepper: {
    width: 68,
  },
  strokeWidthStepper: {
    width: 68,
  },
  fontFamilyLabel: {
    fontSize: 13,
    color: COLORS.gray900,
  },
  linePreviewWrap: {
    flex: 1,
    paddingVertical: 8,
    justifyContent: 'center',
  },
  linePreviewRule: {
    width: '100%',
    height: 0,
    borderBottomWidth: 2,
    borderBottomColor: COLORS.gray700,
  },
});
