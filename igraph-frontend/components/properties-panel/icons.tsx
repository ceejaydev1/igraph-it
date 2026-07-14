import React from 'react';
import { Svg, Rect, Path } from 'react-native-svg';
import { COLORS } from '@/constants/theme';

const c = (active?: boolean) => (active ? COLORS.primary : COLORS.gray500);

// ─── Horizontal text-align icons (3 bars, varying widths per align) ────────

export const AlignLeftIcon = ({ active }: { active?: boolean }) => (
  <Svg width={16} height={16} viewBox="0 0 16 16">
    <Rect x="2" y="3" width="12" height="1.6" rx="0.8" fill={c(active)} />
    <Rect x="2" y="7.2" width="8" height="1.6" rx="0.8" fill={c(active)} />
    <Rect x="2" y="11.4" width="10" height="1.6" rx="0.8" fill={c(active)} />
  </Svg>
);

export const AlignCenterIcon = ({ active }: { active?: boolean }) => (
  <Svg width={16} height={16} viewBox="0 0 16 16">
    <Rect x="2" y="3" width="12" height="1.6" rx="0.8" fill={c(active)} />
    <Rect x="4" y="7.2" width="8" height="1.6" rx="0.8" fill={c(active)} />
    <Rect x="3" y="11.4" width="10" height="1.6" rx="0.8" fill={c(active)} />
  </Svg>
);

export const AlignRightIcon = ({ active }: { active?: boolean }) => (
  <Svg width={16} height={16} viewBox="0 0 16 16">
    <Rect x="2" y="3" width="12" height="1.6" rx="0.8" fill={c(active)} />
    <Rect x="6" y="7.2" width="8" height="1.6" rx="0.8" fill={c(active)} />
    <Rect x="4" y="11.4" width="10" height="1.6" rx="0.8" fill={c(active)} />
  </Svg>
);

// ─── Vertical align icons (bar weighting shows top/middle/bottom) ─────────

export const VAlignTopIcon = ({ active }: { active?: boolean }) => (
  <Svg width={16} height={16} viewBox="0 0 16 16">
    <Rect x="2" y="2" width="12" height="1.6" rx="0.8" fill={c(active)} />
    <Rect x="4" y="6" width="8" height="1.6" rx="0.8" fill={c(active)} />
    <Rect x="4" y="9.5" width="8" height="1.6" rx="0.8" fill={c(active)} />
  </Svg>
);

export const VAlignMiddleIcon = ({ active }: { active?: boolean }) => (
  <Svg width={16} height={16} viewBox="0 0 16 16">
    <Rect x="2" y="2.5" width="12" height="1.6" rx="0.8" fill={c(active)} />
    <Rect x="4" y="7.2" width="8" height="1.6" rx="0.8" fill={c(active)} />
    <Rect x="2" y="11.9" width="12" height="1.6" rx="0.8" fill={c(active)} />
  </Svg>
);

export const VAlignBottomIcon = ({ active }: { active?: boolean }) => (
  <Svg width={16} height={16} viewBox="0 0 16 16">
    <Rect x="4" y="4.5" width="8" height="1.6" rx="0.8" fill={c(active)} />
    <Rect x="4" y="8" width="8" height="1.6" rx="0.8" fill={c(active)} />
    <Rect x="2" y="12.4" width="12" height="1.6" rx="0.8" fill={c(active)} />
  </Svg>
);

// ─── Horizontal/Vertical text-direction toggle ─────────────────────────────
// (diagonal arrow, matches the draw.io "rotate text 90°" glyph)

export const TextDirectionIcon = ({ active }: { active?: boolean }) => (
  <Svg width={16} height={16} viewBox="0 0 16 16" fill="none">
    <Path
      d="M3 13L13 3M13 3H6M13 3V10"
      stroke={c(active)}
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

// ─── Resize/size icon used next to Width/Height in Arrange tab ─────────────

export const SizeIcon = () => (
  <Svg width={14} height={14} viewBox="0 0 14 14" fill="none">
    <Rect x="1" y="1" width="12" height="12" rx="1" stroke={COLORS.gray400} strokeWidth={1.2} />
    <Path d="M1 4H4M1 1V4" stroke={COLORS.gray400} strokeWidth={1.2} />
    <Path d="M13 10H10M13 13V10" stroke={COLORS.gray400} strokeWidth={1.2} />
  </Svg>
);

// ─── Bold / Italic / Underline (crisper than plain <Text>B/I/U</Text>) ─────

export const BoldIcon = ({ active }: { active?: boolean }) => (
  <Svg width={14} height={14} viewBox="0 0 14 14" fill="none">
    <Path
      d="M4 2.5H8C9.4 2.5 10.4 3.3 10.4 4.6C10.4 5.6 9.8 6.3 9 6.6C10 6.9 10.7 7.7 10.7 8.8C10.7 10.2 9.6 11.2 8.1 11.2H4V2.5Z"
      stroke={c(active)}
      strokeWidth={1.4}
      strokeLinejoin="round"
    />
    <Path d="M4 6.6H8" stroke={c(active)} strokeWidth={1.4} />
  </Svg>
);

export const ItalicIcon = ({ active }: { active?: boolean }) => (
  <Svg width={14} height={14} viewBox="0 0 14 14" fill="none">
    <Path
      d="M8.5 2.5H5.5M8.5 11.5H5.5M8 2.5L6 11.5"
      stroke={c(active)}
      strokeWidth={1.4}
      strokeLinecap="round"
    />
  </Svg>
);

export const UnderlineIcon = ({ active }: { active?: boolean }) => (
  <Svg width={14} height={14} viewBox="0 0 14 14" fill="none">
    <Path
      d="M4 2.5V6.5C4 8.4 5.3 9.5 7 9.5C8.7 9.5 10 8.4 10 6.5V2.5"
      stroke={c(active)}
      strokeWidth={1.4}
      strokeLinecap="round"
    />
    <Path d="M3.3 11.5H10.7" stroke={c(active)} strokeWidth={1.4} strokeLinecap="round" />
  </Svg>
);