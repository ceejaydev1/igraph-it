import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { SPACING } from '@/constants/theme';
import {
  applyStylePatch,
  getCommonStyleValue,
} from './PropertiesPanel';
import {
  InlineField,
  NumberStepper,
  CheckboxRow,
  MiniSwatch,
  CollapsibleSection,
  Dropdown,
  PresetSwatchGrid,
  useSidebarColorPicker,
} from './shared';

interface TabProps {
  graph: any;
  cells: any[];
}

type LineStyle = 'solid' | 'dashed' | 'dotted';
const LINE_STYLES: { key: LineStyle; label: string }[] = [
  { key: 'solid', label: '───────' },
  { key: 'dashed', label: '- - - - -' },
  { key: 'dotted', label: '· · · · ·' },
];

function getLineStyle(cells: any[]): LineStyle | undefined {
  const dashed = getCommonStyleValue(cells, 'dashed');
  const pattern = getCommonStyleValue(cells, 'dashPattern');
  if (dashed === undefined) return undefined;
  if (!dashed || dashed === 0) return 'solid';
  return pattern === '1 2' ? 'dotted' : 'dashed';
}

export default function StyleTab({ graph, cells }: TabProps) {
  const { openPicker, activePicker } = useSidebarColorPicker();

  const fillColor = getCommonStyleValue(cells, 'fillColor') as string | undefined;
  const strokeColor = getCommonStyleValue(cells, 'strokeColor') as string | undefined;
  const strokeWidth = getCommonStyleValue(cells, 'strokeWidth') as number | undefined;
  const opacity = getCommonStyleValue(cells, 'opacity') as number | undefined;
  const perimeterSpacing = getCommonStyleValue(cells, 'perimeterSpacing') as number | undefined;
  const gradientColor = getCommonStyleValue(cells, 'gradientColor') as string | undefined;
  const lineStyle = useMemo(() => getLineStyle(cells), [cells]);

  const fillEnabled = fillColor !== 'none';
  const lineEnabled = strokeColor !== 'none';
  const gradientEnabled = gradientColor !== undefined && gradientColor !== 'none';

  const patch = (p: Record<string, any>) => applyStylePatch(graph, cells, p);

  const handleLineStyle = (style: LineStyle) => {
    if (style === 'solid') patch({ dashed: 0, dashPattern: undefined });
    if (style === 'dashed') patch({ dashed: 1, dashPattern: '8 4' });
    if (style === 'dotted') patch({ dashed: 1, dashPattern: '1 2' });
  };

  // While a color picker is open, it replaces the whole tab (full panel
  // width, closed with its own X) instead of floating over these fields —
  // see useSidebarColorPicker.
  if (activePicker) return <View>{activePicker}</View>;

  return (
    <View>
      <PresetSwatchGrid onSelect={(fill, stroke) => patch({ fillColor: fill, strokeColor: stroke })} />

      {/* ─── Fill ─────────────────────────────────────────────────────── */}
      <CollapsibleSection title="Fill" defaultOpen>
        <CheckboxRow
          checked={fillEnabled}
          onToggle={() => patch({ fillColor: fillEnabled ? 'none' : '#ffffff' })}
          label="Fill"
          right={
            <MiniSwatch
              value={fillEnabled ? fillColor ?? '#ffffff' : undefined}
              onChange={(hex) => patch({ fillColor: hex })}
              disabled={!fillEnabled}
              title="Select a fill color"
              onRequestOpen={openPicker}
              size={32}
            />
          }
        />
        <CheckboxRow
          checked={gradientEnabled}
          onToggle={() => patch({ gradientColor: gradientEnabled ? 'none' : '#ffffff' })}
          label="Gradient"
        />
      </CollapsibleSection>

      {/* ─── Line ─────────────────────────────────────────────────────── */}
      <CollapsibleSection title="Line" defaultOpen style={styles.lineSection}>
        <CheckboxRow
          checked={lineEnabled}
          onToggle={() => patch({ strokeColor: lineEnabled ? 'none' : '#000000' })}
          label="Line"
        />

        <View style={styles.lineStyleRow}>
          <View style={styles.lineStyleDropdown}>
            <Dropdown<LineStyle>
              value={lineStyle ?? LINE_STYLES[0].key}
              options={LINE_STYLES}
              onChange={handleLineStyle}
            />
          </View>
          <View style={styles.lineWidthStepper}>
            <NumberStepper value={strokeWidth ?? 1} onChange={(n) => patch({ strokeWidth: n })} min={0} max={10} step={1} suffix="pt" />
          </View>
          <MiniSwatch
            value={lineEnabled ? strokeColor ?? '#000000' : undefined}
            onChange={(hex) => patch({ strokeColor: hex })}
            disabled={!lineEnabled}
            title="Select a line color"
            onRequestOpen={openPicker}
            size={32}
          />
        </View>

        <InlineField label="Perimeter">
          <NumberStepper
            value={perimeterSpacing ?? 0}
            onChange={(n) => patch({ perimeterSpacing: n })}
            min={0}
            max={100}
            step={1}
            suffix="pt"
          />
        </InlineField>
      </CollapsibleSection>

      <InlineField label="Opacity">
        <NumberStepper
          value={opacity === undefined ? 100 : opacity}
          onChange={(n) => patch({ opacity: Math.max(0, Math.min(100, n)) })}
          min={0}
          max={100}
          step={5}
          suffix="%"
        />
      </InlineField>
    </View>
  );
}

const styles = StyleSheet.create({
  // Raised above the "Opacity" field (and any later sibling) so the Line
  // Style dropdown's open menu — nested a few flex layers deep — can float
  // over them instead of being painted underneath: a plain zIndex on the
  // dropdown itself only wins against its own immediate siblings, not
  // ancestors further out that don't also carry an elevated stacking order.
  lineSection: {
    zIndex: 2,
  },
  lineStyleRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
    zIndex: 2,
  },
  lineStyleDropdown: {
    flex: 1.4,
  },
  lineWidthStepper: {
    flex: 1,
  },
});