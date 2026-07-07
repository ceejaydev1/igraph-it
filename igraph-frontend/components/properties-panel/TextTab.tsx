// components/properties-panel/TextTab.tsx

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Platform } from 'react-native';
import { COLORS, SPACING, RADIUS, TYPOGRAPHY } from '@/constants/theme';
import { applyStylePatch, getCommonStyleValue } from './PropertiesPanel';
import {
  Field,
  InlineField,
  NumberStepper,
  ToggleButton,
  CheckboxRow,
  MiniSwatch,
  CollapsibleSection,
  Dropdown,
} from './shared';
import {
  BoldIcon,
  ItalicIcon,
  UnderlineIcon,
  TextDirectionIcon,
  AlignLeftIcon,
  AlignCenterIcon,
  AlignRightIcon,
  VAlignTopIcon,
  VAlignMiddleIcon,
  VAlignBottomIcon,
} from './icons';

interface TabProps {
  graph: any;
  cells: any[];
}

const FONT_FAMILIES = ['Helvetica', 'Arial', 'Verdana', 'Georgia', 'Times New Roman', 'Courier New'];

type LabelPosition = 'center' | 'top' | 'bottom' | 'left' | 'right';
const LABEL_POSITIONS: { key: LabelPosition; align: string; verticalAlign: string; label: string }[] = [
  { key: 'center', align: 'center', verticalAlign: 'middle', label: 'Center' },
  { key: 'top', align: 'center', verticalAlign: 'top', label: 'Top' },
  { key: 'bottom', align: 'center', verticalAlign: 'bottom', label: 'Bottom' },
  { key: 'left', align: 'left', verticalAlign: 'middle', label: 'Left' },
  { key: 'right', align: 'right', verticalAlign: 'middle', label: 'Right' },
];

type WritingDirection = 'auto' | 'ltr' | 'rtl';
const WRITING_DIRECTIONS: { key: WritingDirection; label: string }[] = [
  { key: 'auto', label: 'Automatic' },
  { key: 'ltr', label: 'Left-to-Right' },
  { key: 'rtl', label: 'Right-to-Left' },
];

export default function TextTab({ graph, cells }: TabProps) {
  const [fontMenuOpen, setFontMenuOpen] = useState(false);

  const fontFamily = getCommonStyleValue(cells, 'fontFamily') as string | undefined;
  const fontSize = getCommonStyleValue(cells, 'fontSize') as number | undefined;
  const fontColor = getCommonStyleValue(cells, 'fontColor') as string | undefined;
  const fontStyle = getCommonStyleValue(cells, 'fontStyle') as number | undefined; // bitmask: 1=bold 2=italic 4=underline
  const align = getCommonStyleValue(cells, 'align') as string | undefined;
  const verticalAlign = getCommonStyleValue(cells, 'verticalAlign') as string | undefined;
  const horizontalText = getCommonStyleValue(cells, 'horizontal') as number | undefined; // 0 = vertical text
  const fillColor = getCommonStyleValue(cells, 'labelBackgroundColor') as string | undefined;
  const strokeColor = getCommonStyleValue(cells, 'labelBorderColor') as string | undefined;
  const shadow = getCommonStyleValue(cells, 'shadow') as number | undefined;
  const opacity = getCommonStyleValue(cells, 'textOpacity') as number | undefined;
  const writingDirection = (getCommonStyleValue(cells, 'writingDirection') as WritingDirection | undefined) ?? 'auto';

  const spacingTop = getCommonStyleValue(cells, 'spacingTop') as number | undefined;
  const spacingGlobal = getCommonStyleValue(cells, 'spacing') as number | undefined;
  const spacingLeft = getCommonStyleValue(cells, 'spacingLeft') as number | undefined;
  const spacingRight = getCommonStyleValue(cells, 'spacingRight') as number | undefined;

  const patch = (p: Record<string, any>) => applyStylePatch(graph, cells, p);

  const isBold = ((fontStyle ?? 0) & 1) === 1;
  const isItalic = ((fontStyle ?? 0) & 2) === 2;
  const isUnderline = ((fontStyle ?? 0) & 4) === 4;

  const toggleFontStyleBit = (bit: number) => {
    const current = fontStyle ?? 0;
    const next = current & bit ? current & ~bit : current | bit;
    patch({ fontStyle: next });
  };

  const currentLabelPosition = LABEL_POSITIONS.find(
    (p) => p.align === align && p.verticalAlign === verticalAlign
  )?.key;

  return (
    <View>
      <Field label="Font">
        <TouchableOpacity style={styles.dropdownTrigger} onPress={() => setFontMenuOpen((o) => !o)}>
          <Text style={styles.dropdownValue}>{fontFamily ?? 'mixed'}</Text>
          <Text style={styles.dropdownCaret}>▾</Text>
        </TouchableOpacity>
        {fontMenuOpen && (
          <ScrollView style={styles.dropdownMenu} nestedScrollEnabled>
            {FONT_FAMILIES.map((f) => (
              <TouchableOpacity
                key={f}
                style={styles.dropdownItem}
                onPress={() => {
                  patch({ fontFamily: f });
                  setFontMenuOpen(false);
                }}
              >
                <Text style={[styles.dropdownItemText, { fontFamily: Platform.OS === 'web' ? f : undefined }]}>
                  {f}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </Field>

      {/* B / I / U / horizontal-text toggle + font size, all on one row */}
      <View style={styles.fontRow}>
        <ToggleButton active={isBold} onPress={() => toggleFontStyleBit(1)}>
          <BoldIcon active={isBold} />
        </ToggleButton>
        <ToggleButton active={isItalic} onPress={() => toggleFontStyleBit(2)}>
          <ItalicIcon active={isItalic} />
        </ToggleButton>
        <ToggleButton active={isUnderline} onPress={() => toggleFontStyleBit(4)}>
          <UnderlineIcon active={isUnderline} />
        </ToggleButton>
        <ToggleButton
          active={horizontalText === 0}
          onPress={() => patch({ horizontal: horizontalText === 0 ? 1 : 0 })}
        >
          <TextDirectionIcon active={horizontalText === 0} />
        </ToggleButton>
        <View style={styles.fontSizeStepper}>
          <NumberStepper value={fontSize} onChange={(n) => patch({ fontSize: n })} min={6} max={96} step={1} suffix="px" />
        </View>
      </View>

      {/* Horizontal align + vertical align, grouped in one row */}
      <View style={styles.alignRow}>
        <View style={styles.alignGroup}>
          <ToggleButton active={align === 'left'} onPress={() => patch({ align: 'left' })}>
            <AlignLeftIcon active={align === 'left'} />
          </ToggleButton>
          <ToggleButton active={align === 'center'} onPress={() => patch({ align: 'center' })}>
            <AlignCenterIcon active={align === 'center'} />
          </ToggleButton>
          <ToggleButton active={align === 'right'} onPress={() => patch({ align: 'right' })}>
            <AlignRightIcon active={align === 'right'} />
          </ToggleButton>
        </View>
        <View style={styles.alignGroup}>
          <ToggleButton active={verticalAlign === 'top'} onPress={() => patch({ verticalAlign: 'top' })}>
            <VAlignTopIcon active={verticalAlign === 'top'} />
          </ToggleButton>
          <ToggleButton active={verticalAlign === 'middle'} onPress={() => patch({ verticalAlign: 'middle' })}>
            <VAlignMiddleIcon active={verticalAlign === 'middle'} />
          </ToggleButton>
          <ToggleButton active={verticalAlign === 'bottom'} onPress={() => patch({ verticalAlign: 'bottom' })}>
            <VAlignBottomIcon active={verticalAlign === 'bottom'} />
          </ToggleButton>
        </View>
      </View>

      <InlineField label="Position">
        <Dropdown<LabelPosition>
          value={currentLabelPosition}
          options={LABEL_POSITIONS.map((p) => ({ key: p.key, label: p.label }))}
          onChange={(key) => {
            const preset = LABEL_POSITIONS.find((p) => p.key === key)!;
            patch({ align: preset.align, verticalAlign: preset.verticalAlign });
          }}
        />
      </InlineField>

      <InlineField label="Writing Direction">
        <Dropdown<WritingDirection>
          value={writingDirection}
          options={WRITING_DIRECTIONS}
          onChange={(key) => patch({ writingDirection: key })}
        />
      </InlineField>

      <View style={styles.divider} />

      <CheckboxRow
        checked={fontColor !== undefined && fontColor !== 'none'}
        onToggle={() => patch({ fontColor: fontColor && fontColor !== 'none' ? 'none' : '#000000' })}
        label="Font Color"
        right={<MiniSwatch value={fontColor ?? '#000000'} onChange={(hex) => patch({ fontColor: hex })} />}
      />
      <CheckboxRow
        checked={fillColor !== undefined && fillColor !== 'none'}
        onToggle={() => patch({ labelBackgroundColor: fillColor && fillColor !== 'none' ? 'none' : '#ffffff' })}
        label="Background Color"
        right={<MiniSwatch value={fillColor ?? '#ffffff'} onChange={(hex) => patch({ labelBackgroundColor: hex })} />}
      />
      <CheckboxRow
        checked={strokeColor !== undefined && strokeColor !== 'none'}
        onToggle={() => patch({ labelBorderColor: strokeColor && strokeColor !== 'none' ? 'none' : '#000000' })}
        label="Border Color"
        right={<MiniSwatch value={strokeColor ?? '#000000'} onChange={(hex) => patch({ labelBorderColor: hex })} />}
      />
      <CheckboxRow
        checked={shadow === 1}
        onToggle={() => patch({ shadow: shadow === 1 ? 0 : 1 })}
        label="Shadow"
      />

      <CollapsibleSection title="Advanced" defaultOpen={false}>
        <InlineField label="Line Spacing">
          <NumberStepper
            value={(getCommonStyleValue(cells, 'lineSpacing') as number | undefined) ?? 100}
            onChange={(n) => patch({ lineSpacing: n })}
            min={0}
            max={400}
            step={5}
            suffix="%"
          />
        </InlineField>
      </CollapsibleSection>

      <InlineField label="Opacity">
        <NumberStepper
          value={opacity === undefined ? 100 : opacity}
          onChange={(n) => patch({ textOpacity: Math.max(0, Math.min(100, n)) })}
          min={0}
          max={100}
          step={5}
          suffix="%"
        />
      </InlineField>

      <CollapsibleSection title="Spacing" defaultOpen>
        <View style={styles.spacingRow}>
          <View style={styles.pairItem}>
            <NumberStepper label="Top" value={spacingTop ?? 0} onChange={(n) => patch({ spacingTop: n })} step={1} suffix="pt" />
          </View>
          <View style={styles.pairItem}>
            <NumberStepper label="Global" value={spacingGlobal ?? 2} onChange={(n) => patch({ spacing: n })} step={1} suffix="pt" />
          </View>
        </View>
        <View style={styles.spacingRow}>
          <View style={styles.pairItem}>
            <NumberStepper value={spacingLeft ?? 0} onChange={(n) => patch({ spacingLeft: n })} step={1} suffix="pt" />
          </View>
          <View style={styles.pairItem}>
            <NumberStepper value={spacingRight ?? 0} onChange={(n) => patch({ spacingRight: n })} step={1} suffix="pt" />
          </View>
        </View>
      </CollapsibleSection>
    </View>
  );
}

const styles = StyleSheet.create({
  fontRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginBottom: SPACING.md,
  },
  fontSizeStepper: {
    flex: 1,
    minWidth: 0,
  },
  alignRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  alignGroup: {
    flexDirection: 'row',
    gap: SPACING.xs,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.borderLight,
    marginVertical: SPACING.sm,
  },
  spacingRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  pairItem: {
    flex: 1,
  },
  dropdownTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 8,
  },
  dropdownValue: {
    fontSize: 13,
    color: COLORS.gray900,
  },
  dropdownCaret: {
    fontSize: 11,
    color: COLORS.gray400,
  },
  dropdownMenu: {
    maxHeight: 160,
    marginTop: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.white,
  },
  dropdownItem: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  dropdownItemText: {
    fontSize: 13,
    color: COLORS.gray900,
  },
});