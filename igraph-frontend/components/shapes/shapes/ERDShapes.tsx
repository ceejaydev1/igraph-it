// components/shapes/shapes/ERDShapes.tsx
// Entity Relationship Diagram (ERD) shapes
// Chen Notation and Crow's Foot variants

import React from 'react';
import { Svg, Rect, Ellipse, Polygon, Circle, Line, G, Path, Text as SvgText } from 'react-native-svg';

interface ShapeProps {
  width: number;
  height: number;
  color?: string;
  fillColor?: string;
  strokeWidth?: number;
}

// ─── Entity ──────────────────────────────────────────────────────────────────

export const EntityShape: React.FC<ShapeProps> = ({
  width,
  height,
  color = '#1a1f36',
  fillColor = '#ffffff',
  strokeWidth = 2,
}) => (
  <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
    <Rect
      x={4}
      y={4}
      width={width - 8}
      height={height - 8}
      fill={fillColor}
      stroke={color}
      strokeWidth={strokeWidth}
      rx={2}
    />
  </Svg>
);

// ─── Weak Entity (Double Rectangle) ────────────────────────────────────────

export const WeakEntityShape: React.FC<ShapeProps> = ({
  width,
  height,
  color = '#1a1f36',
  fillColor = '#ffffff',
  strokeWidth = 2,
}) => (
  <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
    <Rect
      x={4}
      y={4}
      width={width - 8}
      height={height - 8}
      fill={fillColor}
      stroke={color}
      strokeWidth={strokeWidth}
      rx={2}
    />
    <Rect
      x={8}
      y={8}
      width={width - 16}
      height={height - 16}
      fill="none"
      stroke={color}
      strokeWidth={1.5}
      rx={2}
    />
  </Svg>
);

// ─── Attribute ──────────────────────────────────────────────────────────────

export const AttributeShape: React.FC<ShapeProps> = ({
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
      <Ellipse
        cx={cx}
        cy={cy}
        rx={width / 2 - 4}
        ry={height / 2 - 4}
        fill={fillColor}
        stroke={color}
        strokeWidth={strokeWidth}
      />
    </Svg>
  );
};

// ─── Primary Key Attribute (Underlined) ────────────────────────────────────

export const PrimaryKeyShape: React.FC<ShapeProps> = ({
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
      <Ellipse
        cx={cx}
        cy={cy}
        rx={width / 2 - 4}
        ry={height / 2 - 4}
        fill={fillColor}
        stroke={color}
        strokeWidth={strokeWidth}
      />
      <Line
        x1={width * 0.15}
        y1={height - 6}
        x2={width * 0.85}
        y2={height - 6}
        stroke={color}
        strokeWidth={2}
      />
    </Svg>
  );
};

// ─── Derived Attribute (Dashed Oval) ──────────────────────────────────────

export const DerivedAttrShape: React.FC<ShapeProps> = ({
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
      <Ellipse
        cx={cx}
        cy={cy}
        rx={width / 2 - 4}
        ry={height / 2 - 4}
        fill={fillColor}
        stroke={color}
        strokeWidth={strokeWidth}
        strokeDasharray="4,3"
      />
    </Svg>
  );
};

// ─── Composite Attribute ────────────────────────────────────────────────────

export const CompositeAttrShape: React.FC<ShapeProps> = ({
  width,
  height,
  color = '#1a1f36',
  fillColor = '#ffffff',
  strokeWidth = 2,
}) => {
  const cx = width / 2;
  const cy = height / 2;
  const childRadius = Math.min(width, height) * 0.25;
  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      {/* Parent oval */}
      <Ellipse
        cx={cx}
        cy={cy}
        rx={width / 2 - 4}
        ry={height / 2 - 4}
        fill={fillColor}
        stroke={color}
        strokeWidth={strokeWidth}
      />
      {/* Child oval (composite part) */}
      <Ellipse
        cx={cx + childRadius * 1.2}
        cy={cy + childRadius * 0.8}
        rx={childRadius}
        ry={childRadius * 0.7}
        fill={fillColor}
        stroke={color}
        strokeWidth={strokeWidth}
      />
      {/* Connecting line */}
      <Line
        x1={cx + width * 0.2}
        y1={cy + height * 0.1}
        x2={cx + childRadius * 0.8}
        y2={cy + childRadius * 0.5}
        stroke={color}
        strokeWidth={strokeWidth}
      />
    </Svg>
  );
};

// ─── Multi-valued Attribute (Double Oval) ─────────────────────────────────

export const MultiAttrShape: React.FC<ShapeProps> = ({
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
      <Ellipse
        cx={cx}
        cy={cy}
        rx={width / 2 - 4}
        ry={height / 2 - 4}
        fill={fillColor}
        stroke={color}
        strokeWidth={strokeWidth}
      />
      <Ellipse
        cx={cx}
        cy={cy}
        rx={width / 2 - 8}
        ry={height / 2 - 8}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
      />
    </Svg>
  );
};

// ─── Relationship (Diamond) ────────────────────────────────────────────────

export const RelationshipShape: React.FC<ShapeProps> = ({
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
      <Polygon
        points={`${cx},4 ${width - 4},${cy} ${cx},${height - 4} 4,${cy}`}
        fill={fillColor}
        stroke={color}
        strokeWidth={strokeWidth}
      />
    </Svg>
  );
};

// ─── Identifying Relationship (Double Diamond) ────────────────────────────

export const IdentifyingRelShape: React.FC<ShapeProps> = ({
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
      <Polygon
        points={`${cx},4 ${width - 4},${cy} ${cx},${height - 4} 4,${cy}`}
        fill={fillColor}
        stroke={color}
        strokeWidth={strokeWidth}
      />
      <Polygon
        points={`${cx},8 ${width - 8},${cy} ${cx},${height - 8} 8,${cy}`}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
      />
    </Svg>
  );
};

// ─── Cardinality (Chen Notation - Numbers) ────────────────────────────────

export const CardinalityShape: React.FC<ShapeProps> = ({
  width,
  height,
  color = '#1a1f36',
}) => {
  const cx = width / 2;
  const cy = height / 2;
  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <Rect
        x={4}
        y={4}
        width={width - 8}
        height={height - 8}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        rx={2}
      />
      <SvgText
        x={cx}
        y={cy + 4}
        fontSize={Math.min(width, height) * 0.5}
        fill={color}
        textAnchor="middle"
        fontWeight="600"
      >
        1
      </SvgText>
    </Svg>
  );
};

// ─── Crow's Foot - One ─────────────────────────────────────────────────────

export const CrowOneShape: React.FC<ShapeProps> = ({
  width,
  height,
  color = '#1a1f36',
  strokeWidth = 2,
}) => {
  const cy = height / 2;
  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <Line x1={4} y1={cy} x2={width - 4} y2={cy} stroke={color} strokeWidth={strokeWidth} />
      <Line x1={width - 4} y1={4} x2={width - 4} y2={height - 4} stroke={color} strokeWidth={strokeWidth} />
    </Svg>
  );
};

// ─── Crow's Foot - Zero or One ────────────────────────────────────────────

export const CrowZeroOneShape: React.FC<ShapeProps> = ({
  width,
  height,
  color = '#1a1f36',
  strokeWidth = 2,
}) => {
  const cy = height / 2;
  const r = Math.min(width, height) * 0.3;
  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <Line x1={4} y1={cy} x2={width - r - 4} y2={cy} stroke={color} strokeWidth={strokeWidth} />
      <Circle cx={width - r - 4} cy={cy} r={r} fill="none" stroke={color} strokeWidth={strokeWidth} />
      <Line x1={width - r - 4} y1={cy - r} x2={width - r - 4} y2={cy + r} stroke={color} strokeWidth={strokeWidth} />
    </Svg>
  );
};

// ─── Crow's Foot - Zero or Many ───────────────────────────────────────────

export const CrowZeroManyShape: React.FC<ShapeProps> = ({
  width,
  height,
  color = '#1a1f36',
  strokeWidth = 2,
}) => {
  const cy = height / 2;
  const r = Math.min(width, height) * 0.2;
  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <Line x1={4} y1={cy} x2={width - 8} y2={cy} stroke={color} strokeWidth={strokeWidth} />
      <Circle cx={width - 8} cy={cy} r={r} fill="none" stroke={color} strokeWidth={strokeWidth} />
      <Line x1={width - 8} y1={cy - r * 2} x2={width - 8} y2={cy + r * 2} stroke={color} strokeWidth={strokeWidth} />
      <Line
        x1={width - 8 - r * 0.5}
        y1={cy - r * 1.5}
        x2={width - 8 + r * 0.5}
        y2={cy - r * 1.5}
        stroke={color}
        strokeWidth={strokeWidth}
      />
      <Line
        x1={width - 8 - r * 0.5}
        y1={cy + r * 1.5}
        x2={width - 8 + r * 0.5}
        y2={cy + r * 1.5}
        stroke={color}
        strokeWidth={strokeWidth}
      />
    </Svg>
  );
};

// ─── Crow's Foot - One or Many ────────────────────────────────────────────

export const CrowOneManyShape: React.FC<ShapeProps> = ({
  width,
  height,
  color = '#1a1f36',
  strokeWidth = 2,
}) => {
  const cy = height / 2;
  const r = Math.min(width, height) * 0.2;
  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <Line x1={4} y1={cy} x2={width - 8} y2={cy} stroke={color} strokeWidth={strokeWidth} />
      <Line x1={width - 8} y1={cy - r * 1.5} x2={width - 8} y2={cy + r * 1.5} stroke={color} strokeWidth={strokeWidth} />
      <Line
        x1={width - 8 - r * 0.5}
        y1={cy - r * 1.5}
        x2={width - 8 + r * 0.5}
        y2={cy - r * 1.5}
        stroke={color}
        strokeWidth={strokeWidth}
      />
      <Line
        x1={width - 8 - r * 0.5}
        y1={cy + r * 1.5}
        x2={width - 8 + r * 0.5}
        y2={cy + r * 1.5}
        stroke={color}
        strokeWidth={strokeWidth}
      />
    </Svg>
  );
};

// ─── Crow's Foot - Exactly Many ───────────────────────────────────────────

export const CrowManyShape: React.FC<ShapeProps> = ({
  width,
  height,
  color = '#1a1f36',
  strokeWidth = 2,
}) => {
  const cy = height / 2;
  const r = Math.min(width, height) * 0.2;
  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <Line x1={4} y1={cy} x2={width - 8} y2={cy} stroke={color} strokeWidth={strokeWidth} />
      <Line
        x1={width - 8 - r * 0.5}
        y1={cy - r * 1.5}
        x2={width - 8 + r * 0.5}
        y2={cy - r * 1.5}
        stroke={color}
        strokeWidth={strokeWidth}
      />
      <Line
        x1={width - 8 - r * 0.5}
        y1={cy + r * 1.5}
        x2={width - 8 + r * 0.5}
        y2={cy + r * 1.5}
        stroke={color}
        strokeWidth={strokeWidth}
      />
    </Svg>
  );
};

// ─── Total Participation (Double Line) ─────────────────────────────────────

export const TotalParticipationShape: React.FC<ShapeProps> = ({
  width,
  height,
  color = '#1a1f36',
  strokeWidth = 2,
}) => {
  const cy = height / 2;
  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <Line x1={4} y1={cy} x2={width - 4} y2={cy} stroke={color} strokeWidth={strokeWidth} />
      <Line x1={6} y1={4} x2={6} y2={height - 4} stroke={color} strokeWidth={strokeWidth} />
      <Line x1={10} y1={4} x2={10} y2={height - 4} stroke={color} strokeWidth={strokeWidth} />
    </Svg>
  );
};

// ─── Partial Participation (Single Line) ──────────────────────────────────

export const PartialParticipationShape: React.FC<ShapeProps> = ({
  width,
  height,
  color = '#1a1f36',
  strokeWidth = 2,
}) => {
  const cy = height / 2;
  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <Line x1={4} y1={cy} x2={width - 4} y2={cy} stroke={color} strokeWidth={strokeWidth} />
      <Line x1={6} y1={4} x2={6} y2={height - 4} stroke={color} strokeWidth={strokeWidth} />
    </Svg>
  );
};

// ─── ERD Connector Line ────────────────────────────────────────────────────

export const ERDConnectorShape: React.FC<ShapeProps> = ({
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