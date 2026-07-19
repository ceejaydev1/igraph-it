import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { COLORS, SPACING, RADIUS, TYPOGRAPHY, SHADOWS } from '@/constants/theme';
import ColorPickerPopover from './ColorPickerPopover';

// ─── Mutual exclusion for MiniSwatch popovers ──────────────────────────────
// Fill / Font / Line color (and any other MiniSwatch) share one "which swatch
// is open" slot, so opening one (e.g. Fill Color) closes whichever other one
// (e.g. Font Color) was already open — matches how draw.io / Lucidchart never
// show two color popovers at once.
let activeSwatchId: symbol | null = null;
const activeSwatchListeners = new Set<() => void>();

function setActiveSwatch(id: symbol | null) {
  activeSwatchId = id;
  activeSwatchListeners.forEach((l) => l());
}

function useExclusiveOpen(): [boolean, () => void, () => void] {
  const idRef = useRef<symbol | null>(null);
  if (idRef.current === null) idRef.current = Symbol('swatch');

  const [, tick] = useState(0);
  useEffect(() => {
    const listener = () => tick((t) => t + 1);
    activeSwatchListeners.add(listener);
    return () => {
      activeSwatchListeners.delete(listener);
      // Unmounting while open (e.g. selection changed) shouldn't leave a
      // dangling "active" slot that nothing can ever reclaim.
      if (activeSwatchId === idRef.current) setActiveSwatch(null);
    };
  }, []);

  const isOpen = activeSwatchId === idRef.current;
  const open = () => setActiveSwatch(idRef.current);
  const close = () => { if (activeSwatchId === idRef.current) setActiveSwatch(null); };
  return [isOpen, open, close];
}

export const Row = ({ children, style }: { children: React.ReactNode; style?: any }) => (
  <View style={[rowStyles.row, style]}>{children}</View>
);

export const Field = ({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) => (
  <View style={rowStyles.field}>
    <Text style={rowStyles.label}>{label}</Text>
    {children}
  </View>
);

const PRESET_COLORS = [
  '#ffffff', '#f1f5f9', '#e2e8f0', '#94a3b8', '#1a1f36',
  '#4c6fff', '#3b82f6', '#10b981', '#f59e0b', '#ef4444',
  '#8b5cf6', '#ec4899',
];

/** Simple swatch + inline hex input + small preset palette on tap. */
export function ColorField({
  label,
  value,
  onChange,
  allowNone = false,
}: {
  label: string;
  value: string | undefined;
  onChange: (hex: string | undefined) => void;
  allowNone?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState(value ?? '');

  const commit = (hex: string) => {
    setText(hex);
    if (/^#?[0-9a-fA-F]{3,8}$/.test(hex)) {
      onChange(hex.startsWith('#') ? hex : `#${hex}`);
    }
  };

  return (
    <Field label={label}>
      <View>
        <View style={rowStyles.colorInputRow}>
          <TouchableOpacity
            style={[
              rowStyles.swatch,
              { backgroundColor: value === 'none' ? 'transparent' : value || COLORS.gray200 },
            ]}
            onPress={() => setOpen((o) => !o)}
          />
          <TextInput
            style={[rowStyles.input, { flex: 1 }, Platform.OS === 'web' && ({ outlineStyle: 'none' } as any)]}
            value={value === 'none' ? 'none' : text}
            placeholder="mixed"
            placeholderTextColor={COLORS.gray400}
            onChangeText={commit}
            autoCapitalize="none"
          />
        </View>
        {open && (
          <View style={rowStyles.palette}>
            {allowNone && (
              <TouchableOpacity
                style={[rowStyles.paletteSwatch, { borderWidth: 1, borderColor: COLORS.gray300 }]}
                onPress={() => {
                  onChange('none');
                  setOpen(false);
                }}
              />
            )}
            {PRESET_COLORS.map((c) => (
              <TouchableOpacity
                key={c}
                style={[rowStyles.paletteSwatch, { backgroundColor: c }]}
                onPress={() => {
                  onChange(c);
                  setText(c);
                  setOpen(false);
                }}
              />
            ))}
          </View>
        )}
      </View>
    </Field>
  );
}

/** Small color square with a pencil badge — tap to reveal a preset palette. Matches the
 *  swatch used next to "Font Color / Background Color / Border Color / Line / Fill" rows. */
export function MiniSwatch({
  value,
  onChange,
  disabled = false,
  title,
  allowNone,
}: {
  value: string | undefined;
  onChange: (hex: string) => void;
  disabled?: boolean;
  /** Heading shown at the top of the popover, e.g. "Select a fill color". */
  title?: string;
  /** Shows a "no color" swatch as the first grid entry, calling onChange('none'). */
  allowNone?: boolean;
}) {
  const [open, doOpen, close] = useExclusiveOpen();
  const bg = value && value !== 'none' ? value : COLORS.white;

  return (
    <View>
      <TouchableOpacity
        style={[rowStyles.miniSwatch, { backgroundColor: bg }, disabled && rowStyles.miniSwatchDisabled]}
        onPress={() => !disabled && (open ? close() : doOpen())}
        activeOpacity={0.8}
        disabled={disabled}
      >
        <Text style={rowStyles.miniSwatchPencil}>✎</Text>
      </TouchableOpacity>
      {open && (
        <ColorPickerPopover
          value={value}
          onChange={onChange}
          onClose={close}
          title={title}
          allowNone={allowNone}
        />
      )}
    </View>
  );
}

/** Checkbox control (unlabeled) — used inside CheckboxRow, or standalone. */
export function Checkbox({ checked, onPress }: { checked: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity
      style={[rowStyles.checkboxBox, checked && rowStyles.checkboxBoxChecked]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {checked && <Text style={rowStyles.checkboxMark}>✓</Text>}
    </TouchableOpacity>
  );
}

/** Full row: checkbox + label on the left, arbitrary content (e.g. a MiniSwatch) on the right.
 *  Matches "Font Color / Background Color / Border Color / Shadow" and "Fill" / "Line" rows. */
export function CheckboxRow({
  checked,
  onToggle,
  label,
  right,
}: {
  checked: boolean;
  onToggle: () => void;
  label: string;
  right?: React.ReactNode;
}) {
  return (
    <View style={rowStyles.checkboxRow}>
      <TouchableOpacity style={rowStyles.checkboxRowLeft} onPress={onToggle} activeOpacity={0.7}>
        <Checkbox checked={checked} onPress={onToggle} />
        <Text style={rowStyles.checkboxRowLabel}>{label}</Text>
      </TouchableOpacity>
      {right ? <View style={rowStyles.checkboxRowRight}>{right}</View> : null}
    </View>
  );
}

/** Collapsible section with a chevron + title header, matching "Fill", "Line", "Size / Position",
 *  "Rotation", "Flip", "Advanced", "Spacing" sections in the reference UI. */
export function CollapsibleSection({
  title,
  defaultOpen = true,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <View style={rowStyles.collapsibleSection}>
      <TouchableOpacity style={rowStyles.collapsibleHeader} onPress={() => setOpen((o) => !o)} activeOpacity={0.7}>
        <Text style={rowStyles.collapsibleChevron}>{open ? '▾' : '▸'}</Text>
        <Text style={rowStyles.collapsibleTitle}>{title}</Text>
      </TouchableOpacity>
      {open && <View style={rowStyles.collapsibleBody}>{children}</View>}
    </View>
  );
}

/** Generic labeled dropdown (tap to open a list, tap an item to select). Used for
 *  "Auto" fill type, line style, label "Position", and "Writing Direction". */
export function Dropdown<T extends string>({
  value,
  options,
  onChange,
  placeholder = 'mixed',
  renderValue,
}: {
  value: T | undefined;
  options: { key: T; label: string }[];
  onChange: (key: T) => void;
  placeholder?: string;
  renderValue?: (key: T) => React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const current = options.find((o) => o.key === value);

  return (
    // zIndex bumps up only while open, so this dropdown's absolute menu paints
    // above any sibling fields that come after it (needed on Android; iOS/web
    // generally respect the absolute position regardless).
    <View style={[rowStyles.dropdownWrap, open && rowStyles.dropdownWrapOpen]}>
      <TouchableOpacity style={rowStyles.dropdownTrigger} onPress={() => setOpen((o) => !o)} activeOpacity={0.7}>
        {current && renderValue ? (
          renderValue(current.key)
        ) : (
          <Text style={rowStyles.dropdownValue}>{current ? current.label : placeholder}</Text>
        )}
        <Text style={rowStyles.dropdownCaret}>▾</Text>
      </TouchableOpacity>
      {open && (
        <View style={rowStyles.dropdownMenu}>
          {options.map((o) => (
            <TouchableOpacity
              key={o.key}
              style={rowStyles.dropdownItem}
              onPress={() => {
                onChange(o.key);
                setOpen(false);
              }}
            >
              {renderValue ? renderValue(o.key) : <Text style={rowStyles.dropdownItemText}>{o.label}</Text>}
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

/** Theme-style fill/stroke color pairs shown as a paginated swatch grid at the top of the Style tab. */
const THEME_PRESETS: { fill: string; stroke: string }[] = [
  { fill: '#ffffff', stroke: '#000000' },
  { fill: '#f5f5f5', stroke: '#666666' },
  { fill: '#dae8fc', stroke: '#6c8ebf' },
  { fill: '#d5e8d4', stroke: '#82b366' },
  { fill: '#ffe6cc', stroke: '#d79b00' },
  { fill: '#fff2cc', stroke: '#d6b656' },
  { fill: '#f8cecc', stroke: '#b85450' },
  { fill: '#e1d5e7', stroke: '#9673a6' },
  { fill: '#d0cee2', stroke: '#56517e' },
  { fill: '#ffcd28', stroke: '#d79b00' },
  { fill: '#b0e3e6', stroke: '#0e8088' },
  { fill: '#dae8fc', stroke: '#6c8ebf' },
  { fill: '#f5f5f5', stroke: '#666666' },
  { fill: '#f8cecc', stroke: '#b85450' },
  { fill: '#d5e8d4', stroke: '#82b366' },
  { fill: '#ffe6cc', stroke: '#d79b00' },
];

export function PresetSwatchGrid({ onSelect }: { onSelect: (fill: string, stroke: string) => void }) {
  const PER_PAGE = 8;
  const pages: { fill: string; stroke: string }[][] = [];
  for (let i = 0; i < THEME_PRESETS.length; i += PER_PAGE) pages.push(THEME_PRESETS.slice(i, i + PER_PAGE));
  const [page, setPage] = useState(0);
  const current = pages[page] ?? [];
  const atStart = page === 0;
  const atEnd = page === pages.length - 1;

  return (
    <View style={rowStyles.presetWrap}>
      <View style={rowStyles.presetRow}>
        <TouchableOpacity
          onPress={() => setPage((p) => Math.max(0, p - 1))}
          disabled={atStart}
          style={rowStyles.presetArrow}
        >
          <Text style={[rowStyles.presetArrowText, atStart && rowStyles.presetArrowDisabled]}>‹</Text>
        </TouchableOpacity>

        <View style={rowStyles.presetGrid}>
          {current.map((p, i) => (
            <TouchableOpacity
              key={i}
              style={[rowStyles.presetSwatch, { backgroundColor: p.fill, borderColor: p.stroke }]}
              onPress={() => onSelect(p.fill, p.stroke)}
              activeOpacity={0.8}
            />
          ))}
        </View>

        <TouchableOpacity
          onPress={() => setPage((p) => Math.min(pages.length - 1, p + 1))}
          disabled={atEnd}
          style={rowStyles.presetArrow}
        >
          <Text style={[rowStyles.presetArrowText, atEnd && rowStyles.presetArrowDisabled]}>›</Text>
        </TouchableOpacity>
      </View>

      <View style={rowStyles.presetDots}>
        {pages.map((_, i) => (
          <View key={i} style={[rowStyles.presetDot, i === page && rowStyles.presetDotActive]} />
        ))}
      </View>
    </View>
  );
}

/** Numeric input styled as a native-style spinner: value + unit suffix inline, with a
 *  narrow stacked ▲/▼ control at the right edge (matches Width/Height/Left/Top/Angle/etc).
 *  If `label` is given it renders as a small centered caption BELOW the box (e.g. "Width"),
 *  matching the reference UI. For label-left rows (Opacity, Perimeter, Angle) wrap this in
 *  <InlineField> instead and omit the `label` prop here. */
export function NumberStepper({
  label,
  labelColor,
  value,
  onChange,
  step = 1,
  min,
  max,
  suffix,
}: {
  label?: string;
  labelColor?: string;
  value: number | undefined;
  onChange: (n: number) => void;
  step?: number;
  min?: number;
  max?: number;
  suffix?: string;
}) {
  const [text, setText] = useState(value !== undefined ? String(value) : '');

  React.useEffect(() => {
    setText(value !== undefined ? String(value) : '');
  }, [value]);

  const clamp = (n: number) => {
    if (min !== undefined) n = Math.max(min, n);
    if (max !== undefined) n = Math.min(max, n);
    return n;
  };

  const commitText = (t: string) => {
    setText(t);
    const n = parseFloat(t);
    if (!isNaN(n)) onChange(clamp(n));
  };

  const bump = (delta: number) => {
    const current = parseFloat(text) || 0;
    const next = clamp(current + delta);
    setText(String(next));
    onChange(next);
  };

  const body = (
    <View style={rowStyles.spinBox}>
      <TextInput
        style={[rowStyles.spinInput, Platform.OS === 'web' && ({ outlineStyle: 'none' } as any)]}
        value={text}
        placeholder="—"
        placeholderTextColor={COLORS.gray400}
        onChangeText={commitText}
        keyboardType="numeric"
      />
      {suffix ? <Text style={rowStyles.spinSuffix}>{suffix}</Text> : null}
      <View style={rowStyles.spinArrows}>
        <TouchableOpacity style={rowStyles.spinArrowBtn} onPress={() => bump(step)} activeOpacity={0.6}>
          <Text style={rowStyles.spinArrowGlyph}>▲</Text>
        </TouchableOpacity>
        <View style={rowStyles.spinArrowDivider} />
        <TouchableOpacity style={rowStyles.spinArrowBtn} onPress={() => bump(-step)} activeOpacity={0.6}>
          <Text style={rowStyles.spinArrowGlyph}>▼</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (!label) return body;

  return (
    <View style={rowStyles.spinFieldWrap}>
      {body}
      <Text style={[rowStyles.spinCaption, labelColor ? { color: labelColor } : null]}>{label}</Text>
    </View>
  );
}

/** Single row with a label on the left and a control (dropdown / stepper) on the right,
 *  matching "Position", "Writing Direction", "Opacity", "Perimeter", "Angle" rows. */
export function InlineField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <View style={rowStyles.inlineField}>
      <Text style={rowStyles.inlineFieldLabel}>{label}</Text>
      <View style={rowStyles.inlineFieldControl}>{children}</View>
    </View>
  );
}

/** Horizontal segmented control, used for line style, align groups, etc. */
export function SegmentedGroup<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { key: T; label: React.ReactNode }[];
  value: T | undefined;
  onChange: (key: T) => void;
}) {
  return (
    <View style={rowStyles.segmentGroup}>
      {options.map((opt) => (
        <TouchableOpacity
          key={opt.key}
          style={[rowStyles.segmentBtn, value === opt.key && rowStyles.segmentBtnActive]}
          onPress={() => onChange(opt.key)}
          activeOpacity={0.7}
        >
          {typeof opt.label === 'string' ? (
            <Text style={[rowStyles.segmentText, value === opt.key && rowStyles.segmentTextActive]}>
              {opt.label}
            </Text>
          ) : (
            opt.label
          )}
        </TouchableOpacity>
      ))}
    </View>
  );
}

/** Toggle "pill" button used for Bold/Italic/Underline/Rounded/Word-wrap. */
export function ToggleButton({
  active,
  onPress,
  children,
}: {
  active: boolean;
  onPress: () => void;
  children: React.ReactNode;
}) {
  return (
    <TouchableOpacity
      style={[rowStyles.toggleBtn, active && rowStyles.toggleBtnActive]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {children}
    </TouchableOpacity>
  );
}

/** Full-width action button, used for "To Front / To Back / Bring Forward / Send Backward"
 *  and "Horizontal / Vertical" flip buttons. */
export function ActionButton({
  label,
  active,
  onPress,
}: {
  label: string;
  active?: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[rowStyles.actionBtn, active && rowStyles.actionBtnActive]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={[rowStyles.actionBtnText, active && rowStyles.actionBtnTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

export function SectionLabel({ children }: { children: React.ReactNode }) {
  return <Text style={rowStyles.sectionLabel}>{children}</Text>;
}

const rowStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  field: {
    marginBottom: SPACING.md,
  },
  label: {
    fontSize: 12,
    lineHeight: 16,
    color: COLORS.gray600,
    marginBottom: SPACING.xs,
    fontWeight: '600',
  },
  sectionLabel: {
    ...TYPOGRAPHY.label,
    color: COLORS.gray400,
    marginTop: SPACING.md,
    marginBottom: SPACING.sm,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 6,
    fontSize: 13,
    color: COLORS.gray900,
    backgroundColor: COLORS.white,
  },
  colorInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  swatch: {
    width: 28,
    height: 28,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  miniSwatch: {
    width: 26,
    height: 26,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'flex-end',
    justifyContent: 'flex-end',
    padding: 1,
  },
  miniSwatchDisabled: {
    opacity: 0.4,
  },
  miniSwatchPencil: {
    fontSize: 9,
    color: COLORS.gray500,
  },
  palette: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: SPACING.sm,
  },
  paletteSwatch: {
    width: 20,
    height: 20,
    borderRadius: RADIUS.sm,
  },
  checkboxBox: {
    width: 16,
    height: 16,
    borderRadius: 3,
    borderWidth: 1.5,
    borderColor: COLORS.gray300,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.white,
  },
  checkboxBoxChecked: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  checkboxMark: {
    fontSize: 11,
    lineHeight: 12,
    color: COLORS.white,
    fontWeight: '700',
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.sm,
  },
  checkboxRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  checkboxRowLabel: {
    fontSize: 13,
    color: COLORS.gray800,
    fontWeight: '500',
  },
  checkboxRowRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  collapsibleSection: {
    marginBottom: SPACING.sm,
  },
  collapsibleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: SPACING.xs,
  },
  collapsibleChevron: {
    fontSize: 10,
    color: COLORS.gray400,
    width: 12,
  },
  collapsibleTitle: {
    fontSize: 13,
    color: COLORS.gray800,
    fontWeight: '600',
  },
  collapsibleBody: {
    paddingTop: SPACING.xs,
    paddingLeft: 4,
  },
  dropdownWrap: {
    position: 'relative',
  },
  dropdownWrapOpen: {
    zIndex: 50,
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
    backgroundColor: COLORS.white,
  },
  dropdownValue: {
    fontSize: 13,
    color: COLORS.gray900,
  },
  dropdownCaret: {
    fontSize: 11,
    color: COLORS.gray400,
  },
  // FIX: floats over content instead of pushing it down. Positioned relative
  // to dropdownWrap (position: 'relative' above), anchored just under the
  // trigger. zIndex + elevation make sure it paints above sibling fields.
  dropdownMenu: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    marginTop: 4,
    maxHeight: 160,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.white,
    zIndex: 50,
    elevation: 6, // Android stacking + shadow
    ...(Platform.OS === 'web'
      ? { boxShadow: '0 4px 12px rgba(15,23,42,0.12)' }
      : SHADOWS.md),
  },
  dropdownItem: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
    backgroundColor: COLORS.white,
  },
  dropdownItemText: {
    fontSize: 13,
    color: COLORS.gray900,
  },
  presetWrap: {
    marginBottom: SPACING.md,
  },
  presetRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  presetArrow: {
    width: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  presetArrowText: {
    fontSize: 18,
    color: COLORS.gray500,
  },
  presetArrowDisabled: {
    color: COLORS.gray200,
  },
  presetGrid: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  presetSwatch: {
    width: '23%',
    aspectRatio: 1,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    marginBottom: 6,
  },
  presetDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 5,
    marginTop: 2,
  },
  presetDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: COLORS.gray200,
  },
  presetDotActive: {
    backgroundColor: COLORS.primary,
  },
  spinFieldWrap: {
    marginBottom: SPACING.md,
  },
  // ─── FIX APPLIED HERE ───────────────────────────────────────────────────
  // Added `width: '100%'` so spinBox always fills its parent instead of
  // shrink-wrapping to content, which previously let narrow containers
  // clip the arrows column.
  spinBox: {
    flexDirection: 'row',
    alignItems: 'stretch',
    height: 32,
    width: '100%',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.white,
    overflow: 'hidden',
  },
  spinInput: {
    flex: 1,
    // FIX: on web, a flex:1 TextInput defaults to min-width:auto and refuses
    // to shrink below its content's intrinsic width. In narrow containers
    // (InlineField width:140, crowded fontRow, etc.) this pushed the ▲▼
    // arrows column outside the spinBox's overflow:'hidden' bounds, so the
    // arrows silently disappeared everywhere except the wider Size row.
    // minWidth: 0 + flexShrink: 1 forces the input to yield space to the
    // arrows in every context.
    minWidth: 0,
    flexShrink: 1,
    fontSize: 13,
    color: COLORS.gray900,
    paddingLeft: SPACING.sm,
    paddingVertical: 0,
  },
  spinSuffix: {
    fontSize: 12,
    color: COLORS.gray400,
    alignSelf: 'center',
    marginRight: 6,
    flexShrink: 0,
  },
  spinArrows: {
    width: 18,
    flexShrink: 0, // never let the arrows column shrink/clip
    borderLeftWidth: 1,
    borderLeftColor: COLORS.border,
  },
  spinArrowBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.gray50,
  },
  spinArrowDivider: {
    height: 1,
    backgroundColor: COLORS.border,
  },
  spinArrowGlyph: {
    fontSize: 7,
    lineHeight: 8,
    color: COLORS.gray500,
  },
  spinCaption: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.gray500,
    textAlign: 'center',
    marginTop: 4,
  },
  inlineField: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  inlineFieldLabel: {
    fontSize: 13,
    color: COLORS.gray700,
    flexShrink: 1,
    marginRight: SPACING.sm,
  },
  inlineFieldControl: {
    flexGrow: 0,
    flexShrink: 0,
    width: 140,
  },
  segmentGroup: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.sm,
    overflow: 'hidden',
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 6,
    alignItems: 'center',
    justifyContent: 'center',
    borderRightWidth: 1,
    borderRightColor: COLORS.border,
  },
  segmentBtnActive: {
    backgroundColor: COLORS.primaryLight,
  },
  segmentText: {
    fontSize: 11,
    color: COLORS.gray500,
    fontWeight: '600',
  },
  segmentTextActive: {
    color: COLORS.primary,
  },
  toggleBtn: {
    width: 32,
    height: 30,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.white,
  },
  toggleBtnActive: {
    backgroundColor: COLORS.primaryLight,
    borderColor: COLORS.primary,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    backgroundColor: COLORS.gray50,
  },
  actionBtnActive: {
    backgroundColor: COLORS.primaryLight,
    borderColor: COLORS.primary,
  },
  actionBtnText: {
    fontSize: 13,
    color: COLORS.gray800,
    fontWeight: '500',
  },
  actionBtnTextActive: {
    color: COLORS.primary,
  },
});