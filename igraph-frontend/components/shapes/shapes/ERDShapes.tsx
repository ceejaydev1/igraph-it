// components/shapes/shapes/ERDShapes.tsx
// Entity Relationship Diagram shapes

import React from 'react';
import { Svg, Rect, Ellipse, Polygon, Line, Path, Text as SvgText } from 'react-native-svg';

interface ShapeProps {
  width: number;
  height: number;
  color?: string;
  fillColor?: string;
  strokeWidth?: number;
}

// ─── 1. Entity ─────────────────────────────────────────────────────────────

export const ERDEntityShape: React.FC<ShapeProps> = ({
  width,
  height,
  color = '#1a1f36',
  fillColor = '#ffffff',
  strokeWidth = 2,
}) => (
  <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
    <Rect x={4} y={4} width={width - 8} height={height - 8} fill={fillColor} stroke={color} strokeWidth={strokeWidth} rx={2} />
  </Svg>
);

// ─── 2. Weak Entity ────────────────────────────────────────────────────────

export const ERDWeakEntityShape: React.FC<ShapeProps> = ({
  width,
  height,
  color = '#1a1f36',
  fillColor = '#ffffff',
  strokeWidth = 2,
}) => (
  <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
    <Rect x={4} y={4} width={width - 8} height={height - 8} fill={fillColor} stroke={color} strokeWidth={strokeWidth} rx={2} />
    <Rect x={8} y={8} width={width - 16} height={height - 16} fill="none" stroke={color} strokeWidth={1.5} rx={2} />
  </Svg>
);

// ─── 3. Relationship (Diamond) ────────────────────────────────────────────

export const ERDRelationshipShape: React.FC<ShapeProps> = ({
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

// ─── 4. Identifying Relationship (Double Diamond) ────────────────────────

export const ERDIdentifyingRelShape: React.FC<ShapeProps> = ({
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

// ─── 5. Attribute ──────────────────────────────────────────────────────────

export const ERDAttributeShape: React.FC<ShapeProps> = ({
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

// ─── 6. Multivalued Attribute ─────────────────────────────────────────────

export const ERDMultivaluedAttrShape: React.FC<ShapeProps> = ({
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
      <Ellipse cx={cx} cy={cy} rx={width / 2 - 8} ry={height / 2 - 8} fill="none" stroke={color} strokeWidth={1.5} />
    </Svg>
  );
};

// ─── 7. Derived Attribute ─────────────────────────────────────────────────

export const ERDDerivedAttrShape: React.FC<ShapeProps> = ({
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
        strokeDasharray="6,4"
      />
    </Svg>
  );
};

// ─── 8. ERD Connector ─────────────────────────────────────────────────────

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

// ─── 9. Cardinality 1:1 ───────────────────────────────────────────────────

export const ERDCardinality11Shape: React.FC<ShapeProps> = ({
  width,
  height,
  color = '#1a1f36',
  strokeWidth = 2,
}) => {
  const cy = height * 0.65;
  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <SvgText x={width * 0.15} y={height * 0.5} fontSize={14} fill={color} textAnchor="middle" fontWeight="600">1</SvgText>
      <SvgText x={width * 0.85} y={height * 0.5} fontSize={14} fill={color} textAnchor="middle" fontWeight="600">1</SvgText>
      <Line x1={4} y1={cy} x2={width - 4} y2={cy} stroke={color} strokeWidth={strokeWidth} />
    </Svg>
  );
};

// ─── 10. Cardinality 1:N ──────────────────────────────────────────────────

export const ERDCardinality1NShape: React.FC<ShapeProps> = ({
  width,
  height,
  color = '#1a1f36',
  strokeWidth = 2,
}) => {
  const cy = height * 0.65;
  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <SvgText x={width * 0.15} y={height * 0.5} fontSize={14} fill={color} textAnchor="middle" fontWeight="600">1</SvgText>
      <SvgText x={width * 0.85} y={height * 0.5} fontSize={14} fill={color} textAnchor="middle" fontWeight="600">N</SvgText>
      <Line x1={4} y1={cy} x2={width - 4} y2={cy} stroke={color} strokeWidth={strokeWidth} />
    </Svg>
  );
};

// ─── 11. Cardinality N:1 ──────────────────────────────────────────────────

export const ERDCardinalityN1Shape: React.FC<ShapeProps> = ({
  width,
  height,
  color = '#1a1f36',
  strokeWidth = 2,
}) => {
  const cy = height * 0.65;
  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <SvgText x={width * 0.15} y={height * 0.5} fontSize={14} fill={color} textAnchor="middle" fontWeight="600">N</SvgText>
      <SvgText x={width * 0.85} y={height * 0.5} fontSize={14} fill={color} textAnchor="middle" fontWeight="600">1</SvgText>
      <Line x1={4} y1={cy} x2={width - 4} y2={cy} stroke={color} strokeWidth={strokeWidth} />
    </Svg>
  );
};

// ─── 12. Cardinality M:N ──────────────────────────────────────────────────

export const ERDCardinalityMNShape: React.FC<ShapeProps> = ({
  width,
  height,
  color = '#1a1f36',
  strokeWidth = 2,
}) => {
  const cy = height * 0.65;
  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <SvgText x={width * 0.15} y={height * 0.5} fontSize={14} fill={color} textAnchor="middle" fontWeight="600">M</SvgText>
      <SvgText x={width * 0.85} y={height * 0.5} fontSize={14} fill={color} textAnchor="middle" fontWeight="600">N</SvgText>
      <Line x1={4} y1={cy} x2={width - 4} y2={cy} stroke={color} strokeWidth={strokeWidth} />
    </Svg>
  );
};