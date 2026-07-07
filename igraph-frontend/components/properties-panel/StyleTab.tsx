// components/properties-panel/StyleTab.tsx

import React, { useMemo, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Modal, StyleSheet, Platform } from 'react-native';
import { COLORS, SPACING, RADIUS, TYPOGRAPHY } from '@/constants/theme';
import {
  applyStylePatch,
  replaceStyle,
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

type FillType = 'auto' | 'none';
const FILL_TYPES: { key: FillType; label: string }[] = [
  { key: 'auto', label: 'Auto' },
  { key: 'none', label: 'None' },
];

function getLineStyle(cells: any[]): LineStyle | undefined {
  const dashed = getCommonStyleValue(cells, 'dashed');
  const pattern = getCommonStyleValue(cells, 'dashPattern');
  if (dashed === undefined) return undefined;
  if (!dashed || dashed === 0) return 'solid';
  return pattern === '1 2' ? 'dotted' : 'dashed';
}

export default function StyleTab({ graph, cells }: TabProps) {
  const [editStyleOpen, setEditStyleOpen] = useState(false);

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
            <View style={styles.fillRowRight}>
              <View style={styles.fillTypeDropdown}>
                <Dropdown<FillType>
                  value={fillEnabled ? 'auto' : 'none'}
                  options={FILL_TYPES}
                  onChange={(key) => patch({ fillColor: key === 'none' ? 'none' : fillColor && fillColor !== 'none' ? fillColor : '#ffffff' })}
                />
              </View>
              <MiniSwatch
                value={fillEnabled ? fillColor ?? '#ffffff' : undefined}
                onChange={(hex) => patch({ fillColor: hex })}
                disabled={!fillEnabled}
              />
            </View>
          }
        />
        <CheckboxRow
          checked={gradientEnabled}
          onToggle={() => patch({ gradientColor: gradientEnabled ? 'none' : '#ffffff' })}
          label="Gradient"
        />
      </CollapsibleSection>

      {/* ─── Line ─────────────────────────────────────────────────────── */}
      <CollapsibleSection title="Line" defaultOpen>
        <CheckboxRow
          checked={lineEnabled}
          onToggle={() => patch({ strokeColor: lineEnabled ? 'none' : '#000000' })}
          label="Line"
          right={
            <MiniSwatch
              value={lineEnabled ? strokeColor ?? '#000000' : undefined}
              onChange={(hex) => patch({ strokeColor: hex })}
              disabled={!lineEnabled}
            />
          }
        />

        <View style={styles.lineStyleRow}>
          <View style={styles.lineStyleDropdown}>
            <Dropdown<LineStyle>
              value={lineStyle}
              options={LINE_STYLES}
              onChange={handleLineStyle}
            />
          </View>
          <View style={styles.lineWidthStepper}>
            <NumberStepper value={strokeWidth ?? 1} onChange={(n) => patch({ strokeWidth: n })} min={0} max={40} step={1} suffix="pt" />
          </View>
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

      <TouchableOpacity style={styles.editStyleBtn} onPress={() => setEditStyleOpen(true)}>
        <Text style={styles.editStyleBtnText}>Edit Style…</Text>
      </TouchableOpacity>

      <EditStyleModal
        visible={editStyleOpen}
        onClose={() => setEditStyleOpen(false)}
        graph={graph}
        cells={cells}
      />
    </View>
  );
}

// ─── Raw style editor ───────────────────────────────────────────────────────

function styleObjectToText(style: Record<string, any>): string {
  return Object.entries(style)
    .filter(([, v]) => v !== undefined)
    .map(([k, v]) => `${k}=${v}`)
    .join(';\n');
}

function textToStyleObject(text: string): Record<string, any> {
  const result: Record<string, any> = {};
  text
    .split(/;|\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .forEach((line) => {
      const idx = line.indexOf('=');
      if (idx === -1) return;
      const key = line.slice(0, idx).trim();
      let value: any = line.slice(idx + 1).trim();
      if (value === 'true') value = true;
      else if (value === 'false') value = false;
      else if (!isNaN(Number(value)) && value !== '') value = Number(value);
      result[key] = value;
    });
  return result;
}

function EditStyleModal({
  visible,
  onClose,
  graph,
  cells,
}: {
  visible: boolean;
  onClose: () => void;
  graph: any;
  cells: any[];
}) {
  const initial = cells[0]?.getStyle ? cells[0].getStyle() : {};
  const [text, setText] = useState(styleObjectToText(initial));

  React.useEffect(() => {
    if (visible) setText(styleObjectToText(cells[0]?.getStyle?.() ?? {}));
  }, [visible]);

  const handleApply = () => {
    const parsed = textToStyleObject(text);
    replaceStyle(graph, cells, parsed);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          <Text style={styles.modalTitle}>Edit Style</Text>
          <Text style={styles.modalHint}>One key=value pair per line.</Text>
          <TextInput
            style={[styles.styleTextArea, Platform.OS === 'web' && ({ outlineStyle: 'none' } as any)]}
            value={text}
            onChangeText={setText}
            multiline
            textAlignVertical="top"
            autoCapitalize="none"
            autoCorrect={false}
          />
          <View style={styles.modalActions}>
            <TouchableOpacity style={styles.modalBtnGhost} onPress={onClose}>
              <Text style={styles.modalBtnGhostText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalBtnPrimary} onPress={handleApply}>
              <Text style={styles.modalBtnPrimaryText}>Apply</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fillRowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  fillTypeDropdown: {
    width: 72,
  },
  lineStyleRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  lineStyleDropdown: {
    flex: 1.4,
  },
  lineWidthStepper: {
    flex: 1,
  },
  editStyleBtn: {
    marginTop: SPACING.sm,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  editStyleBtnText: {
    fontSize: 12,
    lineHeight: 16,
    color: COLORS.primary,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: COLORS.overlay,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xl,
  },
  modalCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
  },
  modalTitle: {
    ...TYPOGRAPHY.h5,
    color: COLORS.gray900,
    marginBottom: 4,
  },
  modalHint: {
    fontSize: 12,
    lineHeight: 16,
    color: COLORS.gray400,
    marginBottom: SPACING.sm,
  },
  styleTextArea: {
    height: 200,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.sm,
    padding: SPACING.sm,
    fontSize: 12,
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
    color: COLORS.gray900,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: SPACING.sm,
    marginTop: SPACING.md,
  },
  modalBtnGhost: {
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    borderRadius: RADIUS.sm,
  },
  modalBtnGhostText: {
    color: COLORS.gray500,
    fontWeight: '600',
  },
  modalBtnPrimary: {
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.primary,
  },
  modalBtnPrimaryText: {
    color: COLORS.white,
    fontWeight: '700',
  },
});