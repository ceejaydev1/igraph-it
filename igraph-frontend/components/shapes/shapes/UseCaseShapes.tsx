// components/shapes/shapes/UseCaseShapes.tsx
// Use Case Diagram shapes

import React from 'react';
import { Svg, Rect, Ellipse, Polygon, Line, Path, Circle, Text as SvgText } from 'react-native-svg';

interface ShapeProps {
  width: number;
  height: number;
  color?: string;
  fillColor?: string;
  strokeWidth?: number;
}

// ─── 1. Actor ──────────────────────────────────────────────────────────────

export const UMLActorShape: React.FC<ShapeProps> = ({
  width,
  height,
  color = '#1a1f36',
  strokeWidth = 2,
}) => {
  const cx = width / 2;
  const head = Math.min(width, height) * 0.15;
  const bodyTop = head + 2;
  const bodyBottom = height * 0.58;
  const armY = height * 0.38;
  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <Ellipse cx={cx} cy={head / 2 + 2} rx={head} ry={head} fill="none" stroke={color} strokeWidth={strokeWidth} />
      <Line x1={cx} y1={bodyTop + head} x2={cx} y2={bodyBottom} stroke={color} strokeWidth={strokeWidth} />
      <Line x1={width * 0.2} y1={armY} x2={width * 0.8} y2={armY} stroke={color} strokeWidth={strokeWidth} />
      <Line x1={cx} y1={bodyBottom} x2={width * 0.2} y2={height - 4} stroke={color} strokeWidth={strokeWidth} />
      <Line x1={cx} y1={bodyBottom} x2={width * 0.8} y2={height - 4} stroke={color} strokeWidth={strokeWidth} />
    </Svg>
  );
};

// ─── 2. Use Case ──────────────────────────────────────────────────────────

export const UMLUseCaseShape: React.FC<ShapeProps> = ({
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

// ─── 3. System Boundary ──────────────────────────────────────────────────

export const UMLSystemBoundaryShape: React.FC<ShapeProps> = ({
  width,
  height,
  color = '#1a1f36',
  strokeWidth = 2,
}) => {
  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <Rect x={4} y={4} width={width - 8} height={height - 8} fill="none" stroke={color} strokeWidth={strokeWidth} rx={4} />
    </Svg>
  );
};

// ─── 4. Association ──────────────────────────────────────────────────────

export const UMLAssociationShape: React.FC<ShapeProps> = ({
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

// ─── 5. Include Relationship ─────────────────────────────────────────────

export const UMLIncludeShape: React.FC<ShapeProps> = ({
  width,
  height,
  color = '#1a1f36',
  strokeWidth = 2,
}) => {
  const cy = height / 2;
  const arrow = 12;
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
        points={`${width - 4},${cy} ${width - arrow - 4},${cy - 5} ${width - arrow - 4},${cy + 5}`}
        fill={color}
      />
    </Svg>
  );
};

// ─── 6. Extend Relationship ──────────────────────────────────────────────

export const UMLExtendShape: React.FC<ShapeProps> = ({
  width,
  height,
  color = '#1a1f36',
  strokeWidth = 2,
}) => {
  const cy = height / 2;
  const arrow = 12;
  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <Line
        x1={4 + arrow}
        y1={cy}
        x2={width - 4}
        y2={cy}
        stroke={color}
        strokeWidth={strokeWidth}
        strokeDasharray="6,4"
      />
      <Polygon
        points={`4,${cy} ${4 + arrow},${cy - 5} ${4 + arrow},${cy + 5}`}
        fill={color}
      />
    </Svg>
  );
};

// ─── 7. Generalization ────────────────────────────────────────────────────

export const UMLGeneralizationShape: React.FC<ShapeProps> = ({
  width,
  height,
  color = '#1a1f36',
  strokeWidth = 2,
}) => {
  const cy = height / 2;
  const s = 14;
  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <Line x1={4} y1={cy} x2={width - s - 4} y2={cy} stroke={color} strokeWidth={strokeWidth} />
      <Polygon
        points={`${width - s - 4},${cy - s / 2} ${width - 4},${cy} ${width - s - 4},${cy + s / 2}`}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
      />
    </Svg>
  );
};

// ─── 8. Note ──────────────────────────────────────────────────────────────

export const UMLNoteShape: React.FC<ShapeProps> = ({
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

// ─── 9. Note Connector ────────────────────────────────────────────────────

export const UMLNoteConnectorShape: React.FC<ShapeProps> = ({
  width,
  height,
  color = '#1a1f36',
  strokeWidth = 2,
}) => {
  const cy = height / 2;
  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <Line
        x1={4}
        y1={cy}
        x2={width - 4}
        y2={cy}
        stroke={color}
        strokeWidth={strokeWidth}
        strokeDasharray="6,4"
      />
    </Svg>
  );
};

// ─── 10. Include Label ────────────────────────────────────────────────────

export const UMLIncludeLabelShape: React.FC<ShapeProps> = ({
  width,
  height,
  color = '#1a1f36',
}) => {
  const cx = width / 2;
  const cy = height / 2;
  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <SvgText x={cx} y={cy + 4} fontSize={10} fill={color} textAnchor="middle" fontStyle="italic">«include»</SvgText>
    </Svg>
  );
};

// ─── 11. Extend Label ─────────────────────────────────────────────────────

export const UMLExtendLabelShape: React.FC<ShapeProps> = ({
  width,
  height,
  color = '#1a1f36',
}) => {
  const cx = width / 2;
  const cy = height / 2;
  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <SvgText x={cx} y={cy + 4} fontSize={10} fill={color} textAnchor="middle" fontStyle="italic">«extend»</SvgText>
    </Svg>
  );
};