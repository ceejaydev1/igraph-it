import React from 'react';
import { Svg, Rect, Ellipse, Polygon, Line, Path } from 'react-native-svg';

interface ShapeProps {
  width: number;
  height: number;
  color?: string;
  fillColor?: string;
  strokeWidth?: number;
}

// FDD canvas shapes hardcode their own fill/stroke colors per type. The
// shape-panel previews below intentionally ignore that and render neutral
// (color/fillColor props, same as every other shape-panel icon) since the
// panel no longer shows per-type coloring.

// ─── 1. FUNCTION SHAPE ─────────────────────────────────────────────────────

export const FDD_FunctionShape: React.FC<ShapeProps> = ({
  width,
  height,
  color = '#1a1f36',
  fillColor = '#ffffff',
  strokeWidth = 2,
}) => {
  const r = Math.min(width, height) * 0.08;
  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <Rect
        x={1}
        y={1}
        width={width - 2}
        height={height - 2}
        rx={r}
        fill={fillColor}
        stroke={color}
        strokeWidth={strokeWidth}
      />
    </Svg>
  );
};

// ─── 2. INPUT SHAPE ──────────────────────────────────────────────────────

export const FDD_InputShape: React.FC<ShapeProps> = ({
  width,
  height,
  color = '#1a1f36',
  fillColor = '#ffffff',
  strokeWidth = 2,
}) => {
  const r = Math.min(width, height) * 0.08;
  const cy = height / 2;
  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <Rect
        x={1}
        y={1}
        width={width - 2}
        height={height - 2}
        rx={r}
        fill={fillColor}
        stroke={color}
        strokeWidth={strokeWidth}
      />
      <Polygon
        points={`${width - 6},${cy} ${width - 14},${cy - 5} ${width - 14},${cy + 5}`}
        fill={color}
        stroke={color}
        strokeWidth={strokeWidth}
      />
    </Svg>
  );
};

// ─── 3. OUTPUT SHAPE ─────────────────────────────────────────────────────

export const FDD_OutputShape: React.FC<ShapeProps> = ({
  width,
  height,
  color = '#1a1f36',
  fillColor = '#ffffff',
  strokeWidth = 2,
}) => {
  const r = Math.min(width, height) * 0.08;
  const cy = height / 2;
  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <Rect
        x={1}
        y={1}
        width={width - 2}
        height={height - 2}
        rx={r}
        fill={fillColor}
        stroke={color}
        strokeWidth={strokeWidth}
      />
      <Polygon
        points={`6,${cy} 14,${cy - 5} 14,${cy + 5}`}
        fill={color}
        stroke={color}
        strokeWidth={strokeWidth}
      />
    </Svg>
  );
};

// ─── 4. CONTROL CONNECTOR ──────────────────────────────────────────────

export const FDD_ControlShape: React.FC<ShapeProps> = ({
  width,
  height,
  color = '#1a1f36',
  strokeWidth = 2,
}) => {
  const cy = height / 2;
  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <Line x1={2} y1={cy} x2={width - 12} y2={cy} stroke={color} strokeWidth={strokeWidth} />
      <Polygon
        points={`${width - 2},${cy} ${width - 12},${cy - 6} ${width - 12},${cy + 6}`}
        fill={color}
        stroke={color}
        strokeWidth={strokeWidth}
      />
    </Svg>
  );
};

// ─── 5. MECHANISM ──────────────────────────────────────────────────────

export const FDD_MechanismShape: React.FC<ShapeProps> = ({
  width,
  height,
  color = '#1a1f36',
  strokeWidth = 2,
}) => {
  const cy = height / 2;
  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <Line
        x1={2}
        y1={cy}
        x2={width - 12}
        y2={cy}
        stroke={color}
        strokeWidth={strokeWidth}
        strokeDasharray="8 4"
      />
      <Polygon
        points={`${width - 2},${cy} ${width - 12},${cy - 6} ${width - 12},${cy + 6}`}
        fill={color}
        stroke={color}
        strokeWidth={strokeWidth}
      />
    </Svg>
  );
};

// ─── 6. INTERFACE CONNECTOR ─────────────────────────────────────────────

export const FDD_InterfaceShape: React.FC<ShapeProps> = ({
  width,
  height,
  color = '#1a1f36',
  strokeWidth = 2,
}) => {
  const cy = height / 2;
  const arrowWidth = 12;
  const arrowSize = 6;
  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      {/* Left arrow - pointing left */}
      <Polygon
        points={`2,${cy} ${arrowWidth},${cy - arrowSize} ${arrowWidth},${cy + arrowSize}`}
        fill={color}
        stroke={color}
        strokeWidth={strokeWidth}
      />
      {/* Right arrow - pointing right */}
      <Polygon
        points={`${width - 2},${cy} ${width - arrowWidth},${cy - arrowSize} ${width - arrowWidth},${cy + arrowSize}`}
        fill={color}
        stroke={color}
        strokeWidth={strokeWidth}
      />
      {/* Line connecting them */}
      <Line
        x1={arrowWidth}
        y1={cy}
        x2={width - arrowWidth}
        y2={cy}
        stroke={color}
        strokeWidth={strokeWidth}
      />
    </Svg>
  );
};

// ─── 7. BOUNDARY ──────────────────────────────────────────────────────

export const FDD_BoundaryShape: React.FC<ShapeProps> = ({
  width,
  height,
  color = '#1a1f36',
  strokeWidth = 2,
}) => {
  const r = Math.min(width, height) * 0.06;
  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <Rect
        x={1}
        y={1}
        width={width - 2}
        height={height - 2}
        rx={r}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeDasharray="8 4"
      />
    </Svg>
  );
};

// ─── 8. NOTE ──────────────────────────────────────────────────────────────

export const FDD_NoteShape: React.FC<ShapeProps> = ({
  width,
  height,
  color = '#1a1f36',
  fillColor = '#ffffff',
  strokeWidth = 2,
}) => {
  const fold = Math.min(width, height) * 0.18;
  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <Path
        d={`M1,1 L${width - fold - 1},1 L${width - 1},${fold + 1} L${width - 1},${height - 1} L1,${height - 1} Z`}
        fill={fillColor}
        stroke={color}
        strokeWidth={strokeWidth}
      />
      <Line
        x1={width - fold - 1}
        y1={1}
        x2={width - fold - 1}
        y2={fold + 1}
        stroke={color}
        strokeWidth={strokeWidth}
      />
      <Line
        x1={width - fold - 1}
        y1={fold + 1}
        x2={width - 1}
        y2={fold + 1}
        stroke={color}
        strokeWidth={strokeWidth}
      />
    </Svg>
  );
};

// ─── 9. EXTERNAL ENTITY ────────────────────────────────────────────────────

export const FDD_ExternalEntityShape: React.FC<ShapeProps> = ({
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
        rx={width / 2 - 1}
        ry={height / 2 - 1}
        fill={fillColor}
        stroke={color}
        strokeWidth={strokeWidth}
      />
    </Svg>
  );
};
