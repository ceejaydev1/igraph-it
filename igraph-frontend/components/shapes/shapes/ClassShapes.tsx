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
      <Rect x={2} y={2} width={width - 4} height={height - 4} fill={fillColor} stroke={color} strokeWidth={strokeWidth} />
      <Line x1={2} y1={height * 0.3 + 2} x2={width - 2} y2={height * 0.3 + 2} stroke={color} strokeWidth={strokeWidth} />
      <Line x1={2} y1={height * 0.65 + 2} x2={width - 2} y2={height * 0.65 + 2} stroke={color} strokeWidth={strokeWidth} />
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
      <Line x1={2} y1={cy} x2={width - arrow - 2} y2={cy} stroke={color} strokeWidth={strokeWidth} />
      {/* Open "V" arrowhead, not a closed triangle — see the matching
          canvas shape's own comment (maxgraph-custom-shapes.ts,
          UMLDirectedAssociationShapeCanvas): a navigable association's
          arrow is a thin open stick-arrow, distinct from generalization/
          realization's hollow triangle. */}
      <Line x1={width - arrow - 2} y1={cy - 6} x2={width - 2} y2={cy} stroke={color} strokeWidth={strokeWidth} />
      <Line x1={width - 2} y1={cy} x2={width - arrow - 2} y2={cy + 6} stroke={color} strokeWidth={strokeWidth} />
    </Svg>
  );
};

// ─── 3. Aggregation ──────────────────────────────────────────────────────
// Canvas always fills the diamond white regardless of style.

export const UMLAggregationShape: React.FC<ShapeProps> = ({
  width,
  height,
  color = '#1a1f36',
  strokeWidth = 2,
}) => {
  const cy = height / 2;
  const d = 14;
  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <Line x1={d * 2 + 2} y1={cy} x2={width - 2} y2={cy} stroke={color} strokeWidth={strokeWidth} />
      <Polygon
        points={`2,${cy} ${2 + d},${cy - d} ${2 + d * 2},${cy} ${2 + d},${cy + d}`}
        fill="#ffffff"
        stroke={color}
        strokeWidth={strokeWidth}
      />
    </Svg>
  );
};

// ─── 4. Composition ──────────────────────────────────────────────────────
// Canvas always fills the diamond with the stroke color regardless of style.

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
      <Line x1={d * 2 + 2} y1={cy} x2={width - 2} y2={cy} stroke={color} strokeWidth={strokeWidth} />
      <Polygon
        points={`2,${cy} ${2 + d},${cy - d} ${2 + d * 2},${cy} ${2 + d},${cy + d}`}
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
        x1={2}
        y1={cy}
        x2={width - arrow - 2}
        y2={cy}
        stroke={color}
        strokeWidth={strokeWidth}
        strokeDasharray="6,4"
      />
      {/* Open "V" arrowhead, not a closed triangle — same reasoning as
          Directed Association's above; dependency's marker is the same
          open stick-arrow, just on a dashed shaft. */}
      <Line x1={width - arrow - 2} y1={cy - 6} x2={width - 2} y2={cy} stroke={color} strokeWidth={strokeWidth} />
      <Line x1={width - 2} y1={cy} x2={width - arrow - 2} y2={cy + 6} stroke={color} strokeWidth={strokeWidth} />
    </Svg>
  );
};

// ─── 5b. Realization / Implementation ────────────────────────────────────
// Same hollow triangle as Generalization (UseCaseShapes.tsx), on a dashed
// shaft instead of solid — the same solid/dashed split Association/
// Dependency use for their own shared marker shape.

export const UMLRealizationShape: React.FC<ShapeProps> = ({
  width,
  height,
  color = '#1a1f36',
  strokeWidth = 2,
}) => {
  const cy = height / 2;
  const s = 14;
  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <Line
        x1={2}
        y1={cy}
        x2={width - s - 2}
        y2={cy}
        stroke={color}
        strokeWidth={strokeWidth}
        strokeDasharray="6,4"
      />
      <Polygon
        points={`${width - s - 2},${cy - s / 2} ${width - 2},${cy} ${width - s - 2},${cy + s / 2}`}
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
      <SvgText x={cx} y={cy + 4} fontSize={12} fill={color} textAnchor="middle">1</SvgText>
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
      <SvgText x={cx} y={cy + 4} fontSize={11} fill={color} textAnchor="middle">0..1</SvgText>
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
      <SvgText x={cx} y={cy + 4} fontSize={14} fill={color} textAnchor="middle">*</SvgText>
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
      <SvgText x={cx} y={cy + 4} fontSize={11} fill={color} textAnchor="middle">1..*</SvgText>
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
      <SvgText x={cx} y={cy + 4} fontSize={11} fill={color} textAnchor="middle">n..m</SvgText>
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
      <SvgText x={cx} y={cy + 4} fontSize={12} fill={color} textAnchor="middle">n</SvgText>
    </Svg>
  );
};
