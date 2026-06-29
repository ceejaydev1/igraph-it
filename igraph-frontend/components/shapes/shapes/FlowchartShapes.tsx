// components/shapes/shapes/FlowchartShapes.tsx
// Flowchart specific shapes

import React from 'react';
import { Svg, Rect, Polygon, Ellipse, Line, G, Path } from 'react-native-svg';

interface ShapeProps {
  width: number;
  height: number;
  color?: string;
  fillColor?: string;
  strokeWidth?: number;
}

const defaultProps = {
  color: '#1a1f36',
  fillColor: '#ffffff',
  strokeWidth: 2,
};

// ─── Parallelogram ─────────────────────────────────────────────────────────

export const ParallelogramShape: React.FC<ShapeProps> = ({
  width,
  height,
  color = '#1a1f36',
  fillColor = '#ffffff',
  strokeWidth = 2,
}) => (
  <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
    <Polygon
      points={`${width * 0.2},4 ${width - 4},4 ${width * 0.8},${height - 4} 4,${height - 4}`}
      fill={fillColor}
      stroke={color}
      strokeWidth={strokeWidth}
    />
  </Svg>
);

// ─── Cylinder (Database) ──────────────────────────────────────────────────

export const CylinderShape: React.FC<ShapeProps> = ({
  width,
  height,
  color = '#1a1f36',
  fillColor = '#ffffff',
  strokeWidth = 2,
}) => {
  const cx = width / 2;
  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <Ellipse
        cx={cx}
        cy={height - 8}
        rx={width / 2 - 4}
        ry={6}
        fill={fillColor}
        stroke={color}
        strokeWidth={strokeWidth}
      />
      <Line x1={4} y1={8} x2={4} y2={height - 8} stroke={color} strokeWidth={strokeWidth} />
      <Line x1={width - 4} y1={8} x2={width - 4} y2={height - 8} stroke={color} strokeWidth={strokeWidth} />
      <Ellipse
        cx={cx}
        cy={8}
        rx={width / 2 - 4}
        ry={6}
        fill={fillColor}
        stroke={color}
        strokeWidth={strokeWidth}
      />
    </Svg>
  );
};

// ─── Note (Document) ──────────────────────────────────────────────────────

export const NoteShape: React.FC<ShapeProps> = ({
  width,
  height,
  color = '#1a1f36',
  fillColor = '#fef9c3',
  strokeWidth = 2,
}) => {
  const cx = width / 2;
  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <G>
        <Path
          d={`M4,4 L${width - 8},4 L${width - 8},${height - 8} C${width - 8},${height - 8} ${cx},${height - 12} ${cx},${height - 8} C${cx},${height - 12} 4,${height - 8} 4,${height - 8} Z`}
          fill={fillColor}
          stroke={color}
          strokeWidth={strokeWidth}
        />
        <Rect
          x={10}
          y={10}
          width={width - 24}
          height={height - 20}
          fill="none"
          stroke={color}
          strokeWidth={1}
          opacity={0.3}
        />
      </G>
    </Svg>
  );
};

// ─── Cloud ─────────────────────────────────────────────────────────────────

export const CloudShape: React.FC<ShapeProps> = ({
  width,
  height,
  color = '#1a1f36',
  fillColor = '#e0f2fe',
  strokeWidth = 2,
}) => {
  const cx = width / 2;
  const cy = height / 2;
  const r = Math.min(width, height) * 0.4;
  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <Path
        d={`M${cx - r * 0.6} ${height - 6} C${cx - r * 0.9} ${height - 6} ${cx - r} ${height - 10} ${cx - r} ${height - 16} 
           C${cx - r} ${height - 22} ${cx - r * 0.8} ${height - 26} ${cx - r * 0.5} ${height - 27} 
           C${cx - r * 0.6} ${height - 30} ${cx - r * 0.3} ${height - 34} ${cx} ${height - 34} 
           C${cx + r * 0.3} ${height - 34} ${cx + r * 0.5} ${height - 30} ${cx + r * 0.4} ${height - 27} 
           C${cx + r * 0.7} ${height - 26} ${cx + r * 0.9} ${height - 22} ${cx + r} ${height - 16} 
           C${cx + r} ${height - 10} ${cx + r * 0.8} ${height - 6} ${cx + r * 0.5} ${height - 6} Z`}
        fill={fillColor}
        stroke={color}
        strokeWidth={strokeWidth}
      />
    </Svg>
  );
};

// ─── Predefined Process ────────────────────────────────────────────────────

export const PredefinedShape: React.FC<ShapeProps> = ({
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
    <Line x1={10} y1={4} x2={10} y2={height - 4} stroke={color} strokeWidth={strokeWidth} />
    <Line x1={width - 10} y1={4} x2={width - 10} y2={height - 4} stroke={color} strokeWidth={strokeWidth} />
  </Svg>
);