// components/shapes/shapes/FishboneShapes.tsx
// Fishbone Diagram shapes

import React from 'react';
import { Svg, Line, Polygon, Rect, Ellipse, Path } from 'react-native-svg';

interface ShapeProps {
  width: number;
  height: number;
  color?: string;
  fillColor?: string;
  strokeWidth?: number;
}

// ─── 1. Fishbone Spine ────────────────────────────────────────────────────

export const FishboneSpineShape: React.FC<ShapeProps> = ({
  width,
  height,
  color = '#1a1f36',
  strokeWidth = 2,
}) => {
  const cy = height / 2;
  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <Line x1={4} y1={cy} x2={width - 4} y2={cy} stroke={color} strokeWidth={strokeWidth} />
    </Svg>
  );
};

// ─── 2. Fishbone Head ─────────────────────────────────────────────────────

export const FishboneHeadShape: React.FC<ShapeProps> = ({
  width,
  height,
  color = '#1a1f36',
  fillColor = '#ffffff',
  strokeWidth = 2,
}) => {
  const cx = width / 2;
  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <Polygon
        points={`${cx},4 ${width - 4},${height / 2} ${cx},${height - 4}`}
        fill={fillColor}
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
      />
    </Svg>
  );
};

// ─── 3. Fishbone Problem/Effect Box ──────────────────────────────────────

export const FishboneProblemShape: React.FC<ShapeProps> = ({
  width,
  height,
  color = '#1a1f36',
  strokeWidth = 2,
}) => {
  const r = Math.min(width, height) * 0.1;
  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <Rect
        x={4}
        y={4}
        width={width - 8}
        height={height - 8}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeDasharray="6,4"
        rx={r}
      />
    </Svg>
  );
};

// ─── 4. Main Cause (Top) ──────────────────────────────────────────────────

export const FishboneCauseTopShape: React.FC<ShapeProps> = ({
  width,
  height,
  color = '#1a1f36',
  strokeWidth = 2,
}) => (
  <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
    <Line x1={4} y1={height - 4} x2={width - 4} y2={4} stroke={color} strokeWidth={strokeWidth} />
  </Svg>
);

// ─── 5. Main Cause (Bottom) ───────────────────────────────────────────────

export const FishboneCauseBottomShape: React.FC<ShapeProps> = ({
  width,
  height,
  color = '#1a1f36',
  strokeWidth = 2,
}) => (
  <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
    <Line x1={4} y1={4} x2={width - 4} y2={height - 4} stroke={color} strokeWidth={strokeWidth} />
  </Svg>
);

// ─── 6. Sub-Cause (Top) ───────────────────────────────────────────────────

export const FishboneSubCauseTopShape: React.FC<ShapeProps> = ({
  width,
  height,
  color = '#1a1f36',
  strokeWidth = 2,
}) => (
  <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
    <Line x1={4} y1={height - 4} x2={width - 4} y2={4} stroke={color} strokeWidth={strokeWidth} />
    <Line x1={width * 0.6} y1={height * 0.4} x2={width - 4} y2={height * 0.4} stroke={color} strokeWidth={strokeWidth} />
  </Svg>
);

// ─── 7. Sub-Cause (Bottom) ────────────────────────────────────────────────

export const FishboneSubCauseBottomShape: React.FC<ShapeProps> = ({
  width,
  height,
  color = '#1a1f36',
  strokeWidth = 2,
}) => (
  <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
    <Line x1={4} y1={4} x2={width - 4} y2={height - 4} stroke={color} strokeWidth={strokeWidth} />
    <Line x1={width * 0.6} y1={height * 0.6} x2={width - 4} y2={height * 0.6} stroke={color} strokeWidth={strokeWidth} />
  </Svg>
);

// ─── 8. Tertiary Cause Branch ─────────────────────────────────────────────

export const FishboneTertiaryShape: React.FC<ShapeProps> = ({
  width,
  height,
  color = '#1a1f36',
  strokeWidth = 1.5,
}) => (
  <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
    <Line x1={4} y1={height - 4} x2={width - 4} y2={4} stroke={color} strokeWidth={strokeWidth} />
  </Svg>
);

// ─── 9. Fishbone Arrow ────────────────────────────────────────────────────

export const FishboneArrowShape: React.FC<ShapeProps> = ({
  width,
  height,
  color = '#1a1f36',
  strokeWidth = 2,
}) => {
  const cy = height / 2;
  const arrow = Math.min(width, height) * 0.35;
  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <Line x1={4} y1={cy} x2={width - arrow - 4} y2={cy} stroke={color} strokeWidth={strokeWidth} />
      <Polygon
        points={`${width - 4},${cy} ${width - arrow - 4},${cy - arrow / 2} ${width - arrow - 4},${cy + arrow / 2}`}
        fill={color}
      />
    </Svg>
  );
};

// ─── 10. Fishbone Dashed Arrow ────────────────────────────────────────────

export const FishboneDashedArrowShape: React.FC<ShapeProps> = ({
  width,
  height,
  color = '#1a1f36',
  strokeWidth = 2,
}) => {
  const cy = height / 2;
  const arrow = Math.min(width, height) * 0.35;
  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <Line
        x1={4}
        y1={cy}
        x2={width - arrow - 4}
        y2={cy}
        stroke={color}
        strokeWidth={strokeWidth}
        strokeDasharray="6,4"
      />
      <Polygon
        points={`${width - 4},${cy} ${width - arrow - 4},${cy - arrow / 2} ${width - arrow - 4},${cy + arrow / 2}`}
        fill={color}
      />
    </Svg>
  );
};

// ─── 11. Fishbone Category Box ────────────────────────────────────────────

export const FishboneCategoryShape: React.FC<ShapeProps> = ({
  width,
  height,
  color = '#1a1f36',
  fillColor = '#ffffff',
  strokeWidth = 2,
}) => {
  const r = Math.min(width, height) * 0.1;
  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <Rect x={4} y={4} width={width - 8} height={height - 8} fill={fillColor} stroke={color} strokeWidth={strokeWidth} rx={r} />
    </Svg>
  );
};

// ─── 12. Fishbone Bubble ──────────────────────────────────────────────────

export const FishboneBubbleShape: React.FC<ShapeProps> = ({
  width,
  height,
  color = '#1a1f36',
  fillColor = '#ffffff',
  strokeWidth = 2,
}) => {
  const cx = width / 2;
  const cy = height / 2;
  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <Ellipse cx={cx} cy={cy} rx={width / 2 - 4} ry={height / 2 - 4} fill={fillColor} stroke={color} strokeWidth={strokeWidth} />
    </Svg>
  );
};

// ─── 13. Fishbone Note ────────────────────────────────────────────────────

export const FishboneNoteShape: React.FC<ShapeProps> = ({
  width,
  height,
  color = '#1a1f36',
  fillColor = '#fef9c3',
  strokeWidth = 2,
}) => {
  const fold = Math.min(width, height) * 0.2;
  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <Path
        d={`M4,4 L${width - fold - 4},4 L${width - 4},${fold + 4} L${width - 4},${height - 4} L4,${height - 4} Z`}
        fill={fillColor}
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
      />
      <Line
        x1={width - fold - 4}
        y1={4}
        x2={width - fold - 4}
        y2={fold + 4}
        stroke={color}
        strokeWidth={strokeWidth}
      />
      <Line
        x1={width - fold - 4}
        y1={fold + 4}
        x2={width - 4}
        y2={fold + 4}
        stroke={color}
        strokeWidth={strokeWidth}
      />
    </Svg>
  );
};