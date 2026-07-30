import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { COLORS, SPACING } from '@/constants/theme';
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
  useSidebarColorPicker,
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
const FONT_FAMILY_OPTIONS = FONT_FAMILIES.map((f) => ({ key: f, label: f }));

/** Renders the font name label set in that font itself (e.g. "Times New Roman"
 *  actually shown in Times New Roman) — matches the toolbar's font menu and
 *  how draw.io / Lucidchart preview fonts in their font pickers. */
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

export default function TextTab({ graph, cells }: TabProps) {
  const { openPicker, activePicker } = useSidebarColorPicker();

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

  // While a color picker is open, it replaces the whole tab (full panel
  // width, closed with its own X) instead of floating over these fields —
  // see useSidebarColorPicker.
  if (activePicker) return <View>{activePicker}</View>;

  return (
    <View>
      <Field label="Font" style={styles.fontField}>
        <Dropdown<string>
          value={fontFamily ?? FONT_FAMILY_OPTIONS[0].key}
          options={FONT_FAMILY_OPTIONS}
          onChange={(f) => patch({ fontFamily: f })}
          renderValue={(f) => <FontFamilyLabel family={f} />}
        />
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

      <View style={styles.divider} />

      <CheckboxRow
        checked={fontColor !== undefined && fontColor !== 'none'}
        onToggle={() => patch({ fontColor: fontColor && fontColor !== 'none' ? 'none' : '#000000' })}
        label="Font Color"
        right={<MiniSwatch value={fontColor ?? '#000000'} onChange={(hex) => patch({ fontColor: hex })} title="Select a font color" onRequestOpen={openPicker} />}
      />
      <CheckboxRow
        checked={fillColor !== undefined && fillColor !== 'none'}
        onToggle={() => patch({ labelBackgroundColor: fillColor && fillColor !== 'none' ? 'none' : '#ffffff' })}
        label="Background Color"
        right={<MiniSwatch value={fillColor ?? '#ffffff'} onChange={(hex) => patch({ labelBackgroundColor: hex })} title="Select a background color" onRequestOpen={openPicker} />}
      />
      <CheckboxRow
        checked={strokeColor !== undefined && strokeColor !== 'none'}
        onToggle={() => patch({ labelBorderColor: strokeColor && strokeColor !== 'none' ? 'none' : '#000000' })}
        label="Border Color"
        right={<MiniSwatch value={strokeColor ?? '#000000'} onChange={(hex) => patch({ labelBorderColor: hex })} title="Select a border color" onRequestOpen={openPicker} />}
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
  // Raised above every row that follows (B/I/U row, align row, Font/BG/Border
  // Color checkboxes, ...) so the Font dropdown's open menu — nested inside
  // Field — floats over them instead of painting underneath. Same fix as
  // the Line Style dropdown in StyleTab.tsx.
  fontField: {
    zIndex: 2,
  },
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
  fontFamilyLabel: {
    fontSize: 13,
    color: COLORS.gray900,
  },
});