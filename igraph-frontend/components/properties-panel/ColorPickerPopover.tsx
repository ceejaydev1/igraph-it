import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { COLORS, RADIUS, SHADOWS } from '@/constants/theme';

// ════════════════════════════════════════════════════════════════════════════
// Color math — hex <-> rgb <-> hsv, all in [0,1]/[0,255]/[0,360] as noted.
// ════════════════════════════════════════════════════════════════════════════

function clamp01(n: number) {
  return Math.max(0, Math.min(1, n));
}

function normalizeHex(hex: string): string | null {
  const m = /^#?([0-9a-fA-F]{6}|[0-9a-fA-F]{3})$/.exec(hex.trim());
  if (!m) return null;
  let h = m[1];
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  return `#${h.toLowerCase()}`;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const norm = normalizeHex(hex) ?? '#ffffff';
  const n = parseInt(norm.slice(1), 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (n: number) => Math.round(clamp01(n / 255) * 255).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function rgbToHsv(r: number, g: number, b: number): { h: number; s: number; v: number } {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  if (d !== 0) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  const s = max === 0 ? 0 : d / max;
  const v = max;
  return { h, s, v };
}

function hsvToRgb(h: number, s: number, v: number): { r: number; g: number; b: number } {
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;
  let r = 0, g = 0, b = 0;
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  return { r: (r + m) * 255, g: (g + m) * 255, b: (b + m) * 255 };
}

function hsvToHex(h: number, s: number, v: number): string {
  const { r, g, b } = hsvToRgb(h, s, v);
  return rgbToHex(r, g, b);
}

// ════════════════════════════════════════════════════════════════════════════
// Preset grid — grayscale row + tint/base/shade rows, same shape as the
// draw.io / Lucidchart swatch grid.
// ════════════════════════════════════════════════════════════════════════════

const GRAYSCALE_ROW = ['#ffffff', '#f1f5f9', '#e2e8f0', '#cbd5e1', '#94a3b8', '#64748b', '#334155', '#1e293b', '#000000'];
const PALETTE_ROWS = [
  ['#dbeafe', '#e0e7ff', '#f3e8ff', '#fce7f3', '#ffe4e6', '#ffedd5', '#fef9c3', '#dcfce7', '#ccfbf1'],
  ['#93c5fd', '#a5b4fc', '#d8b4fe', '#f9a8d4', '#fda4af', '#fdba74', '#fde047', '#86efac', '#5eead4'],
  ['#3b82f6', '#6366f1', '#a855f7', '#ec4899', '#f43f5e', '#f97316', '#eab308', '#22c55e', '#14b8a6'],
  ['#1d4ed8', '#4338ca', '#7e22ce', '#be185d', '#be123c', '#c2410c', '#a16207', '#15803d', '#0f766e'],
];

// ════════════════════════════════════════════════════════════════════════════
// "Custom colors" — a small in-memory, session-lifetime shared list (not
// persisted to disk; resets on reload). Module-scoped + a tiny listener set
// so every popover instance stays in sync without lifting state up through
// StyleTab/TextTab/QuickFormatBar.
// ════════════════════════════════════════════════════════════════════════════

let customColorsStore: string[] = [];
const customColorListeners = new Set<() => void>();

function addCustomColor(hex: string) {
  if (customColorsStore[0] === hex) return;
  customColorsStore = [hex, ...customColorsStore.filter((c) => c !== hex)].slice(0, 8);
  customColorListeners.forEach((l) => l());
}

function useCustomColors(): string[] {
  const [, tick] = useState(0);
  useEffect(() => {
    const listener = () => tick((t) => t + 1);
    customColorListeners.add(listener);
    return () => { customColorListeners.delete(listener); };
  }, []);
  return customColorsStore;
}

// ════════════════════════════════════════════════════════════════════════════

interface ColorPickerPopoverProps {
  value: string | undefined; // current hex, or 'none'/undefined
  onChange: (hex: string) => void;
  onClose: () => void;
  title?: string;
  allowNone?: boolean;
  /** Renders in-flow at 100% of its parent's width with a title-row X to
   *  close, instead of a small fixed-width floating box with Cancel/Done —
   *  used by useSidebarColorPicker so it fills the properties panel it's
   *  opened from rather than hanging off the swatch that triggered it. */
  fillWidth?: boolean;
}

export default function ColorPickerPopover({ value, onChange, onClose, title = 'Select a color', allowNone = false, fillWidth = false }: ColorPickerPopoverProps) {
  const startingValue = value && value !== 'none' ? value : '#ffffff';
  const originalRef = useRef(value);

  const [hsv, setHsv] = useState(() => {
    const { r, g, b } = hexToRgb(startingValue);
    return rgbToHsv(r, g, b);
  });
  const [hexText, setHexText] = useState(startingValue.replace('#', ''));
  const customColors = useCustomColors();

  const squareRef = useRef<HTMLDivElement | null>(null);
  const hueRef = useRef<HTMLDivElement | null>(null);
  const draggingRef = useRef<'square' | 'hue' | null>(null);

  const currentHex = hsvToHex(hsv.h, hsv.s, hsv.v);

  const applyHsv = (next: { h: number; s: number; v: number }) => {
    setHsv(next);
    const hex = hsvToHex(next.h, next.s, next.v);
    setHexText(hex.replace('#', ''));
    onChange(hex);
  };

  const applyHex = (hex: string) => {
    const norm = normalizeHex(hex);
    if (!norm) return;
    const { r, g, b } = hexToRgb(norm);
    setHsv(rgbToHsv(r, g, b));
    onChange(norm);
  };

  // Web-only pointer dragging for the saturation/value square and hue strip.
  useEffect(() => {
    if (Platform.OS !== 'web') return;

    const handleMove = (e: MouseEvent) => {
      if (draggingRef.current === 'square' && squareRef.current) {
        const rect = squareRef.current.getBoundingClientRect();
        const s = clamp01((e.clientX - rect.left) / rect.width);
        const v = clamp01(1 - (e.clientY - rect.top) / rect.height);
        applyHsv({ h: hsv.h, s, v });
      } else if (draggingRef.current === 'hue' && hueRef.current) {
        const rect = hueRef.current.getBoundingClientRect();
        const h = clamp01((e.clientX - rect.left) / rect.width) * 360;
        applyHsv({ h, s: hsv.s, v: hsv.v });
      }
    };
    const handleUp = () => { draggingRef.current = null; };

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
    // hsv.h/s/v read via closure on every drag frame — re-bind whenever they change
    // so a stale hue/sv value never overwrites a fresher pointer move.
  }, [hsv.h, hsv.s, hsv.v]);

  const handleCancel = () => {
    if (originalRef.current) onChange(originalRef.current);
    onClose();
  };

  const handleDone = () => {
    addCustomColor(currentHex);
    onClose();
  };

  // fillWidth's X behaves like Done (keep whatever's live, save it as a
  // custom color) rather than Cancel — the color's already been applied
  // live while dragging/typing, so reverting on close would be surprising.
  const handleCloseX = () => {
    addCustomColor(currentHex);
    onClose();
  };

  const handleEyedropper = async () => {
    // @ts-ignore - EyeDropper is a newer browser API, not yet in lib.dom.d.ts everywhere.
    const EyeDropperCtor = typeof window !== 'undefined' ? window.EyeDropper : undefined;
    if (!EyeDropperCtor) return;
    try {
      const result = await new EyeDropperCtor().open();
      if (result?.sRGBHex) applyHex(result.sRGBHex);
    } catch {
      // user cancelled the eyedropper — nothing to do
    }
  };

  const supportsEyedropper = Platform.OS === 'web' && typeof window !== 'undefined' && !!(window as any).EyeDropper;

  return (
    <View style={[styles.card, fillWidth && styles.cardFillWidth]}>
      {fillWidth ? (
        <View style={styles.headerRow}>
          <Text style={[styles.title, styles.titleInRow]}>{title}</Text>
          <TouchableOpacity
            onPress={handleCloseX}
            style={styles.closeBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.closeBtnText}>✕</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <Text style={styles.title}>{title}</Text>
      )}

      {/* ─── Preset grid ──────────────────────────────────────────────── */}
      <View style={styles.grid}>
        {allowNone && (
          <TouchableOpacity
            style={[styles.gridSwatch, styles.noneSwatch]}
            onPress={() => { onChange('none'); onClose(); }}
          />
        )}
        {GRAYSCALE_ROW.map((c) => (
          <TouchableOpacity key={c} style={[styles.gridSwatch, { backgroundColor: c }]} onPress={() => applyHex(c)} />
        ))}
        {PALETTE_ROWS.flat().map((c, i) => (
          <TouchableOpacity key={c + i} style={[styles.gridSwatch, { backgroundColor: c }]} onPress={() => applyHex(c)} />
        ))}
      </View>

      {/* ─── Custom colors ────────────────────────────────────────────── */}
      <Text style={styles.sectionLabel}>Custom colors</Text>
      <View style={styles.grid}>
        {customColors.map((c) => (
          <TouchableOpacity key={c} style={[styles.gridSwatch, { backgroundColor: c }]} onPress={() => applyHex(c)} />
        ))}
        <TouchableOpacity style={[styles.gridSwatch, styles.addSwatch]} onPress={() => addCustomColor(currentHex)}>
          <Text style={styles.addSwatchPlus}>+</Text>
        </TouchableOpacity>
      </View>

      {Platform.OS === 'web' ? (
        <>
          {/* ─── Saturation/Value square ────────────────────────────────── */}
          <div
            ref={squareRef}
            onMouseDown={(e) => {
              draggingRef.current = 'square';
              const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
              applyHsv({
                h: hsv.h,
                s: clamp01((e.clientX - rect.left) / rect.width),
                v: clamp01(1 - (e.clientY - rect.top) / rect.height),
              });
            }}
            style={{
              position: 'relative',
              width: '100%',
              height: 140,
              borderRadius: RADIUS.md,
              marginTop: 12,
              cursor: 'crosshair',
              background: `hsl(${hsv.h}, 100%, 50%)`,
              backgroundImage:
                'linear-gradient(to top, #000, rgba(0,0,0,0)), linear-gradient(to right, #fff, rgba(255,255,255,0))',
              userSelect: 'none',
            }}
          >
            <div
              style={{
                position: 'absolute',
                left: `${hsv.s * 100}%`,
                top: `${(1 - hsv.v) * 100}%`,
                width: 14,
                height: 14,
                marginLeft: -7,
                marginTop: -7,
                borderRadius: '50%',
                border: '2px solid #ffffff',
                boxShadow: '0 0 0 1px rgba(0,0,0,0.35), 0 1px 3px rgba(0,0,0,0.4)',
                backgroundColor: currentHex,
                pointerEvents: 'none',
              }}
            />
          </div>

          {/* ─── Eyedropper + hue slider ────────────────────────────────── */}
          <View style={styles.hueRow}>
            {supportsEyedropper && (
              <TouchableOpacity style={styles.eyedropperBtn} onPress={handleEyedropper}>
                <Text style={styles.eyedropperGlyph}>💧</Text>
              </TouchableOpacity>
            )}
            <div
              ref={hueRef}
              onMouseDown={(e) => {
                draggingRef.current = 'hue';
                const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
                applyHsv({ h: clamp01((e.clientX - rect.left) / rect.width) * 360, s: hsv.s, v: hsv.v });
              }}
              style={{
                position: 'relative',
                flex: 1,
                height: 14,
                borderRadius: 999,
                cursor: 'pointer',
                background: 'linear-gradient(to right, red, yellow, lime, cyan, blue, magenta, red)',
                userSelect: 'none',
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  left: `${(hsv.h / 360) * 100}%`,
                  top: '50%',
                  width: 16,
                  height: 16,
                  marginLeft: -8,
                  marginTop: -8,
                  borderRadius: '50%',
                  border: '2px solid #ffffff',
                  boxShadow: '0 0 0 1px rgba(0,0,0,0.35), 0 1px 3px rgba(0,0,0,0.4)',
                  backgroundColor: `hsl(${hsv.h}, 100%, 50%)`,
                  pointerEvents: 'none',
                }}
              />
            </div>
          </View>
        </>
      ) : (
        // Native fallback: no pointer-drag surface available, so the square/hue
        // strip are skipped — the preset grid, custom colors and hex field
        // below still give full control over the color.
        <View style={[styles.gridSwatch, { width: '100%', height: 60, backgroundColor: currentHex, marginTop: 12 }]} />
      )}

      {/* ─── Hex input ────────────────────────────────────────────────── */}
      <View style={styles.hexRow}>
        <Text style={styles.hexLabel}>Hex</Text>
        <View style={styles.hexInputWrap}>
          <Text style={styles.hexHash}>#</Text>
          <TextInput
            style={[styles.hexInput, Platform.OS === 'web' && ({ outlineStyle: 'none' } as any)]}
            value={hexText}
            onChangeText={(t) => {
              const cleaned = t.replace(/[^0-9a-fA-F]/g, '').slice(0, 6);
              setHexText(cleaned);
              if (cleaned.length === 6 || cleaned.length === 3) applyHex(`#${cleaned}`);
            }}
            autoCapitalize="none"
            autoCorrect={false}
            maxLength={6}
          />
        </View>
      </View>

      {/* ─── Actions ──────────────────────────────────────────────────── */}
      {/* fillWidth already has its X in the header row above — Cancel/Done
          would be redundant (and Cancel's "revert" doesn't fit a picker
          that's meant to be closed and reopened freely while it fills the
          whole panel). */}
      {!fillWidth && (
        <View style={styles.actionsRow}>
          <TouchableOpacity style={styles.cancelBtn} onPress={handleCancel}>
            <Text style={styles.cancelBtnText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.doneBtn} onPress={handleDone}>
            <Text style={styles.doneBtnText}>Done</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const SWATCH_SIZE = 22;

const styles = StyleSheet.create({
  card: {
    position: Platform.OS === 'web' ? ('absolute' as any) : 'relative',
    top: '100%',
    left: 0,
    marginTop: 6,
    width: 264,
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
    zIndex: 60,
    ...(Platform.OS === 'web' ? { boxShadow: '0 12px 32px rgba(15,23,42,0.18)' } : SHADOWS.lg),
  },
  // Renders in-flow filling the tab it's opened from, instead of floating
  // off the swatch — see useSidebarColorPicker.
  //
  // NOTE: `top`/`left` are set to real values (0), not `undefined` — react-
  // native-web's style merge (styleq) skips keys whose value is `undefined`
  // rather than treating them as an override, so `card`'s `top: '100%'`
  // would otherwise silently survive and push this down by its own height
  // (position:relative + top:100% = shifted down by 100% of its own
  // rendered height, which is exactly the large empty gap this caused).
  cardFillWidth: {
    position: 'relative',
    top: 0,
    left: 0,
    marginTop: 0,
    width: '100%',
    zIndex: 0,
    ...(Platform.OS === 'web' ? { boxShadow: 'none' } : { shadowOpacity: 0, elevation: 0 }),
  },
  title: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.gray900,
    marginBottom: 10,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  titleInRow: {
    marginBottom: 0,
    flexShrink: 1,
  },
  closeBtn: {
    width: 24,
    height: 24,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    fontSize: 13,
    color: COLORS.gray500,
    fontWeight: '700',
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.gray500,
    marginTop: 10,
    marginBottom: 6,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  gridSwatch: {
    width: SWATCH_SIZE,
    height: SWATCH_SIZE,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: 'rgba(15,23,42,0.08)',
  },
  noneSwatch: {
    backgroundColor: COLORS.white,
    borderColor: COLORS.gray300,
    // Diagonal "no color" slash via a rotated pseudo-border isn't available in
    // RN StyleSheet, so this renders as a plain bordered white swatch — still
    // clearly distinct from the color rows since it sits before the grayscale.
  },
  addSwatch: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.gray50,
    borderStyle: 'dashed',
    borderColor: COLORS.gray300,
  },
  addSwatchPlus: {
    fontSize: 14,
    color: COLORS.gray500,
    fontWeight: '700',
  },
  hueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
  },
  eyedropperBtn: {
    width: 26,
    height: 26,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eyedropperGlyph: {
    fontSize: 12,
  },
  hexRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
    gap: 8,
  },
  hexLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.gray600,
    width: 28,
  },
  hexInputWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.sm,
    paddingHorizontal: 10,
    height: 32,
  },
  hexHash: {
    fontSize: 13,
    color: COLORS.gray400,
    marginRight: 2,
  },
  hexInput: {
    flex: 1,
    fontSize: 13,
    color: COLORS.gray900,
    paddingVertical: 0,
    textTransform: 'lowercase',
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 14,
  },
  cancelBtn: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cancelBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.gray700,
  },
  doneBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.gray900,
  },
  doneBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.white,
  },
});
