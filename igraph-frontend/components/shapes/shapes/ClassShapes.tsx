// components/shapes/shapes/ClassShapes.tsx
// Class Diagram shapes

import React from 'react';
import { Svg, Rect, Line, Polygon, Path, Text as SvgText } from 'react-native-svg';

interface ShapeProps {
  width: number;
  height: number;
  color?: string;
  fillColor?: string;
  strokeWidth?: number;
}

// ─── 1. Class ─────────────────────────────────────────────────────────────

export const UMLClassShape: React.FC<ShapeProps> = ({
  width,
  height,
  color = '#1a1f36',
  fillColor = '#ffffff',
  strokeWidth = 2,
}) => {
  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <Rect x={4} y={4} width={width - 8} height={height - 8} fill={fillColor} stroke={color} strokeWidth={strokeWidth} rx={2} />
      <Line x1={4} y1={height * 0.3 + 4} x2={width - 4} y2={height * 0.3 + 4} stroke={color} strokeWidth={1.5} />
      <Line x1={4} y1={height * 0.65 + 4} x2={width - 4} y2={height * 0.65 + 4} stroke={color} strokeWidth={1.5} />
    </Svg>
  );
};

// ─── 2. Directed Association ─────────────────────────────────────────────

export const UMLDirectedAssociationShape: React.FC<ShapeProps> = ({
  width,
  height,
  color = '#1a1f36',
  strokeWidth = 2,
}) => {
  const cy = height / 2;
  const arrow = 14;
  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <Line x1={4} y1={cy} x2={width - arrow - 4} y2={cy} stroke={color} strokeWidth={strokeWidth} />
      <Polygon
        points={`${width - 4},${cy} ${width - arrow - 4},${cy - 6} ${width - arrow - 4},${cy + 6}`}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
      />
    </Svg>
  );
};

// ─── 3. Aggregation ──────────────────────────────────────────────────────

export const UMLAggregationShape: React.FC<ShapeProps> = ({
  width,
  height,
  color = '#1a1f36',
  fillColor = '#ffffff',
  strokeWidth = 2,
}) => {
  const cy = height / 2;
  const d = 14;
  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <Line x1={d * 2 + 4} y1={cy} x2={width - 4} y2={cy} stroke={color} strokeWidth={strokeWidth} />
      <Polygon
        points={`4,${cy} ${4 + d},${cy - d} ${4 + d * 2},${cy} ${4 + d},${cy + d}`}
        fill={fillColor}
        stroke={color}
        strokeWidth={strokeWidth}
      />
    </Svg>
  );
};

// ─── 4. Composition ──────────────────────────────────────────────────────

export const UMLCompositionShape: React.FC<ShapeProps> = ({
  width,
  height,
  color = '#1a1f36',
  strokeWidth = 2,
}) => {
  const cy = height / 2;
  const d = 14;
  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <Line x1={d * 2 + 4} y1={cy} x2={width - 4} y2={cy} stroke={color} strokeWidth={strokeWidth} />
      <Polygon
        points={`4,${cy} ${4 + d},${cy - d} ${4 + d * 2},${cy} ${4 + d},${cy + d}`}
        fill={color}
        stroke={color}
        strokeWidth={strokeWidth}
      />
    </Svg>
  );
};

// ─── 5. Dependency ───────────────────────────────────────────────────────

export const UMLDependencyShape: React.FC<ShapeProps> = ({
  width,
  height,
  color = '#1a1f36',
  strokeWidth = 2,
}) => {
  const cy = height / 2;
  const arrow = 14;
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
        points={`${width - 4},${cy} ${width - arrow - 4},${cy - 6} ${width - arrow - 4},${cy + 6}`}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
      />
    </Svg>
  );
};

// ─── 6. Multiplicity: Exactly One ──────────────────────────────────────

export const UMLMultiplicity1Shape: React.FC<ShapeProps> = ({
  width,
  height,
  color = '#1a1f36',
}) => {
  const cx = width / 2;
  const cy = height / 2;
  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <SvgText x={cx} y={cy + 4} fontSize={12} fill={color} textAnchor="middle" fontWeight="600">1</SvgText>
    </Svg>
  );
};

// ─── 7. Multiplicity: Zero or One ───────────────────────────────────────

export const UMLMultiplicity01Shape: React.FC<ShapeProps> = ({
  width,
  height,
  color = '#1a1f36',
}) => {
  const cx = width / 2;
  const cy = height / 2;
  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <SvgText x={cx} y={cy + 4} fontSize={11} fill={color} textAnchor="middle" fontWeight="600">0..1</SvgText>
    </Svg>
  );
};

// ─── 8. Multiplicity: Zero or More ──────────────────────────────────────

export const UMLMultiplicityManyShape: React.FC<ShapeProps> = ({
  width,
  height,
  color = '#1a1f36',
}) => {
  const cx = width / 2;
  const cy = height / 2;
  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <SvgText x={cx} y={cy + 4} fontSize={14} fill={color} textAnchor="middle" fontWeight="600">*</SvgText>
    </Svg>
  );
};

// ─── 9. Multiplicity: One or More ──────────────────────────────────────

export const UMLMultiplicity1ManyShape: React.FC<ShapeProps> = ({
  width,
  height,
  color = '#1a1f36',
}) => {
  const cx = width / 2;
  const cy = height / 2;
  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <SvgText x={cx} y={cy + 4} fontSize={11} fill={color} textAnchor="middle" fontWeight="600">1..*</SvgText>
    </Svg>
  );
};

// ─── 10. Multiplicity: Range ─────────────────────────────────────────────

export const UMLMultiplicityRangeShape: React.FC<ShapeProps> = ({
  width,
  height,
  color = '#1a1f36',
}) => {
  const cx = width / 2;
  const cy = height / 2;
  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <SvgText x={cx} y={cy + 4} fontSize={11} fill={color} textAnchor="middle" fontWeight="600">n..m</SvgText>
    </Svg>
  );
};

// ─── 11. Multiplicity: Exactly n ─────────────────────────────────────────

export const UMLMultiplicityNShape: React.FC<ShapeProps> = ({
  width,
  height,
  color = '#1a1f36',
}) => {
  const cx = width / 2;
  const cy = height / 2;
  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <SvgText x={cx} y={cy + 4} fontSize={12} fill={color} textAnchor="middle" fontWeight="600">n</SvgText>
    </Svg>
  );
};