// components/shapes/shapes/FDDShapes.tsx
// Functional Decomposition Diagram shapes - EXACTLY matching canvas specifications

import React from 'react';
import { Svg, Rect, Ellipse, Polygon, Line, G, Path } from 'react-native-svg';

interface ShapeProps {
  width: number;
  height: number;
  color?: string;
  fillColor?: string;
  strokeWidth?: number;
}

// ─── 1. FUNCTION SHAPE ─────────────────────────────────────────────────────
// Canvas: fillColor: '#DCEAF7', strokeColor: '#4A78A8', strokeWidth: 2, rounded

export const FDD_FunctionShape: React.FC<ShapeProps> = ({
  width,
  height,
  color = '#4A78A8',
  fillColor = '#DCEAF7',
  strokeWidth = 2,
}) => {
  const r = Math.min(width, height) * 0.08;
  const pad = strokeWidth / 2;
  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <Rect
        x={pad}
        y={pad}
        width={width - strokeWidth}
        height={height - strokeWidth}
        rx={r}
        fill={fillColor}
        stroke={color}
        strokeWidth={strokeWidth}
      />
    </Svg>
  );
};

// ─── 2. INPUT SHAPE ──────────────────────────────────────────────────────
// Canvas: fillColor: '#DCEFD2', strokeColor: '#5A9E4B', strokeWidth: 2, rounded + right arrow

export const FDD_InputShape: React.FC<ShapeProps> = ({
  width,
  height,
  color = '#5A9E4B',
  fillColor = '#DCEFD2',
  strokeWidth = 2,
}) => {
  const r = Math.min(width, height) * 0.08;
  const pad = strokeWidth / 2;
  const cy = height / 2;
  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <Rect
        x={pad}
        y={pad}
        width={width - strokeWidth}
        height={height - strokeWidth}
        rx={r}
        fill={fillColor}
        stroke={color}
        strokeWidth={strokeWidth}
      />
      <Polygon
        points={`${width - 6},${cy} ${width - 14},${cy - 5} ${width - 14},${cy + 5}`}
        fill={color}
      />
    </Svg>
  );
};

// ─── 3. OUTPUT SHAPE ─────────────────────────────────────────────────────
// Canvas: fillColor: '#FBE8B8', strokeColor: '#F39C12', strokeWidth: 2, rounded + left arrow

export const FDD_OutputShape: React.FC<ShapeProps> = ({
  width,
  height,
  color = '#F39C12',
  fillColor = '#FBE8B8',
  strokeWidth = 2,
}) => {
  const r = Math.min(width, height) * 0.08;
  const pad = strokeWidth / 2;
  const cy = height / 2;
  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <Rect
        x={pad}
        y={pad}
        width={width - strokeWidth}
        height={height - strokeWidth}
        rx={r}
        fill={fillColor}
        stroke={color}
        strokeWidth={strokeWidth}
      />
      <Polygon
        points={`6,${cy} 14,${cy - 5} 14,${cy + 5}`}
        fill={color}
      />
    </Svg>
  );
};

// ─── 4. CONTROL CONNECTOR ──────────────────────────────────────────────
// Canvas: strokeColor: '#000000', strokeWidth: 2, solid arrow

export const FDD_ControlShape: React.FC<ShapeProps> = ({
  width,
  height,
  color = '#000000',
  strokeWidth = 2,
}) => {
  const cy = height / 2;
  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <Line x1={2} y1={cy} x2={width - 12} y2={cy} stroke={color} strokeWidth={strokeWidth} />
      <Polygon
        points={`${width - 2},${cy} ${width - 12},${cy - 6} ${width - 12},${cy + 6}`}
        fill={color}
      />
    </Svg>
  );
};

// ─── 5. MECHANISM ──────────────────────────────────────────────────────
// Canvas: strokeColor: '#000000', strokeWidth: 2, dashed (8,4) arrow

export const FDD_MechanismShape: React.FC<ShapeProps> = ({
  width,
  height,
  color = '#000000',
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
      />
    </Svg>
  );
};

// ─── 6. INTERFACE CONNECTOR ─────────────────────────────────────────────
// Canvas: strokeColor: '#000000', strokeWidth: 2, double-ended arrow

export const FDD_InterfaceShape: React.FC<ShapeProps> = ({
  width,
  height,
  color = '#000000',
  strokeWidth = 2,
}) => {
  const cy = height / 2;
  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      {/* Left arrow - pointing left */}
      <Polygon
        points={`2,${cy} 12,${cy - 5} 12,${cy + 5}`}
        fill={color}
      />
      {/* Right arrow - pointing right */}
      <Polygon
        points={`${width - 2},${cy} ${width - 12},${cy - 5} ${width - 12},${cy + 5}`}
        fill={color}
      />
      {/* Line connecting them */}
      <Line
        x1={12}
        y1={cy}
        x2={width - 12}
        y2={cy}
        stroke={color}
        strokeWidth={strokeWidth}
      />
    </Svg>
  );
};

// ─── 7. BOUNDARY ──────────────────────────────────────────────────────
// Canvas: fillColor: 'transparent', strokeColor: '#666666', strokeWidth: 2, dashed (8,4), rounded

export const FDD_BoundaryShape: React.FC<ShapeProps> = ({
  width,
  height,
  color = '#666666',
  fillColor = 'transparent',
  strokeWidth = 2,
}) => {
  const r = Math.min(width, height) * 0.06;
  const pad = strokeWidth / 2;
  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <Rect
        x={pad}
        y={pad}
        width={width - strokeWidth}
        height={height - strokeWidth}
        rx={r}
        fill={fillColor}
        stroke={color}
        strokeWidth={strokeWidth}
        strokeDasharray="8 4"
      />
    </Svg>
  );
};

// ─── 8. NOTE ──────────────────────────────────────────────────────────────
// Canvas: fillColor: '#FFF4CC', strokeColor: '#B7950B', strokeWidth: 2, document shape

export const FDD_NoteShape: React.FC<ShapeProps> = ({
  width,
  height,
  color = '#B7950B',
  fillColor = '#FFF4CC',
  strokeWidth = 2,
}) => {
  const fold = Math.min(width, height) * 0.18;
  const pad = strokeWidth / 2;
  
  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <Path
        d={`M${pad},${pad} L${width - fold - pad},${pad} L${width - pad},${pad + fold} L${width - pad},${height - pad} L${pad},${height - pad} Z`}
        fill={fillColor}
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
      />
      <Line
        x1={width - fold - pad}
        y1={pad}
        x2={width - fold - pad}
        y2={pad + fold}
        stroke={color}
        strokeWidth={strokeWidth}
      />
      <Line
        x1={width - fold - pad}
        y1={pad + fold}
        x2={width - pad}
        y2={pad + fold}
        stroke={color}
        strokeWidth={strokeWidth}
      />
    </Svg>
  );
};

// ─── 9. EXTERNAL ENTITY ────────────────────────────────────────────────────
// Canvas: fillColor: '#F4F4F4', strokeColor: '#8E8E8E', strokeWidth: 2, ellipse

export const FDD_ExternalEntityShape: React.FC<ShapeProps> = ({
  width,
  height,
  color = '#8E8E8E',
  fillColor = '#F4F4F4',
  strokeWidth = 2,
}) => {
  const cx = width / 2;
  const cy = height / 2;
  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <Ellipse
        cx={cx}
        cy={cy}
        rx={(width - strokeWidth) / 2}
        ry={(height - strokeWidth) / 2}
        fill={fillColor}
        stroke={color}
        strokeWidth={strokeWidth}
      />
    </Svg>
  );
};