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
      <Line x1={2} y1={cy} x2={width - 2} y2={cy} stroke={color} strokeWidth={strokeWidth} />
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
        points={`${cx},2 ${width - 2},${height / 2} ${cx},${height - 2}`}
        fill={fillColor}
        stroke={color}
        strokeWidth={strokeWidth}
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
        x={2}
        y={2}
        width={width - 4}
        height={height - 4}
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
    <Line x1={2} y1={height - 2} x2={width - 2} y2={2} stroke={color} strokeWidth={strokeWidth} />
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
    <Line x1={2} y1={2} x2={width - 2} y2={height - 2} stroke={color} strokeWidth={strokeWidth} />
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
    <Line x1={2} y1={height - 2} x2={width - 2} y2={2} stroke={color} strokeWidth={strokeWidth} />
    <Line x1={width * 0.6} y1={height * 0.4} x2={width - 2} y2={height * 0.4} stroke={color} strokeWidth={strokeWidth} />
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
    <Line x1={2} y1={2} x2={width - 2} y2={height - 2} stroke={color} strokeWidth={strokeWidth} />
    <Line x1={width * 0.6} y1={height * 0.6} x2={width - 2} y2={height * 0.6} stroke={color} strokeWidth={strokeWidth} />
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
    <Line x1={2} y1={height - 2} x2={width - 2} y2={2} stroke={color} strokeWidth={strokeWidth} />
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
      <Line x1={2} y1={cy} x2={width - arrow - 2} y2={cy} stroke={color} strokeWidth={strokeWidth} />
      <Polygon
        points={`${width - 2},${cy} ${width - arrow - 2},${cy - arrow / 2} ${width - arrow - 2},${cy + arrow / 2}`}
        fill={color}
        stroke={color}
        strokeWidth={strokeWidth}
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
        x1={2}
        y1={cy}
        x2={width - arrow - 2}
        y2={cy}
        stroke={color}
        strokeWidth={strokeWidth}
        strokeDasharray="6,4"
      />
      <Polygon
        points={`${width - 2},${cy} ${width - arrow - 2},${cy - arrow / 2} ${width - arrow - 2},${cy + arrow / 2}`}
        fill={color}
        stroke={color}
        strokeWidth={strokeWidth}
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
      <Rect x={2} y={2} width={width - 4} height={height - 4} fill={fillColor} stroke={color} strokeWidth={strokeWidth} rx={r} />
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
      <Ellipse cx={cx} cy={cy} rx={width / 2 - 2} ry={height / 2 - 2} fill={fillColor} stroke={color} strokeWidth={strokeWidth} />
    </Svg>
  );
};

// ─── 13. Fishbone Note ────────────────────────────────────────────────────
// Canvas always fills #fef9c3 regardless of style.

export const FishboneNoteShape: React.FC<ShapeProps> = ({
  width,
  height,
  color = '#1a1f36',
  strokeWidth = 2,
}) => {
  const fold = Math.min(width, height) * 0.2;
  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <Path
        d={`M2,2 L${width - fold - 2},2 L${width - 2},${fold + 2} L${width - 2},${height - 2} L2,${height - 2} Z`}
        fill="#fef9c3"
        stroke={color}
        strokeWidth={strokeWidth}
      />
      <Line
        x1={width - fold - 2}
        y1={2}
        x2={width - fold - 2}
        y2={fold + 2}
        stroke={color}
        strokeWidth={strokeWidth}
      />
      <Line
        x1={width - fold - 2}
        y1={fold + 2}
        x2={width - 2}
        y2={fold + 2}
        stroke={color}
        strokeWidth={strokeWidth}
      />
    </Svg>
  );
};
