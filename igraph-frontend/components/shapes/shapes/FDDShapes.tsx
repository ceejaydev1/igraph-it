import React from 'react';
import { Svg, Rect, Ellipse, Polygon, Line, Path } from 'react-native-svg';

interface ShapeProps {
  width: number;
  height: number;
  color?: string;
  fillColor?: string;
  strokeWidth?: number;
}

// Every FDD canvas shape hardcodes its own fill/stroke colors and a
// strokeWidth of 2, ignoring whatever style the cell/panel would otherwise
// pass in - so these previews hardcode the same values instead of taking
// the color/fillColor/strokeWidth props, to stay pixel-matched with canvas.

// ─── 1. FUNCTION SHAPE ─────────────────────────────────────────────────────
// Canvas: fillColor: '#DCEAF7', strokeColor: '#4A78A8', strokeWidth: 2, rounded

export const FDD_FunctionShape: React.FC<ShapeProps> = ({ width, height }) => {
  const r = Math.min(width, height) * 0.08;
  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <Rect
        x={1}
        y={1}
        width={width - 2}
        height={height - 2}
        rx={r}
        fill="#DCEAF7"
        stroke="#4A78A8"
        strokeWidth={2}
      />
    </Svg>
  );
};

// ─── 2. INPUT SHAPE ──────────────────────────────────────────────────────
// Canvas: fillColor: '#DCEFD2', strokeColor: '#5A9E4B', strokeWidth: 2, rounded + right arrow

export const FDD_InputShape: React.FC<ShapeProps> = ({ width, height }) => {
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
        fill="#DCEFD2"
        stroke="#5A9E4B"
        strokeWidth={2}
      />
      <Polygon
        points={`${width - 6},${cy} ${width - 14},${cy - 5} ${width - 14},${cy + 5}`}
        fill="#5A9E4B"
        stroke="#5A9E4B"
        strokeWidth={2}
      />
    </Svg>
  );
};

// ─── 3. OUTPUT SHAPE ─────────────────────────────────────────────────────
// Canvas: fillColor: '#FBE8B8', strokeColor: '#F39C12', strokeWidth: 2, rounded + left arrow

export const FDD_OutputShape: React.FC<ShapeProps> = ({ width, height }) => {
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
        fill="#FBE8B8"
        stroke="#F39C12"
        strokeWidth={2}
      />
      <Polygon
        points={`6,${cy} 14,${cy - 5} 14,${cy + 5}`}
        fill="#F39C12"
        stroke="#F39C12"
        strokeWidth={2}
      />
    </Svg>
  );
};

// ─── 4. CONTROL CONNECTOR ──────────────────────────────────────────────
// Canvas: strokeColor: '#000000', strokeWidth: 2, solid arrow

export const FDD_ControlShape: React.FC<ShapeProps> = ({ width, height }) => {
  const cy = height / 2;
  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <Line x1={2} y1={cy} x2={width - 12} y2={cy} stroke="#000000" strokeWidth={2} />
      <Polygon
        points={`${width - 2},${cy} ${width - 12},${cy - 6} ${width - 12},${cy + 6}`}
        fill="#000000"
        stroke="#000000"
        strokeWidth={2}
      />
    </Svg>
  );
};

// ─── 5. MECHANISM ──────────────────────────────────────────────────────
// Canvas: strokeColor: '#000000', strokeWidth: 2, dashed (8,4) arrow

export const FDD_MechanismShape: React.FC<ShapeProps> = ({ width, height }) => {
  const cy = height / 2;
  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <Line
        x1={2}
        y1={cy}
        x2={width - 12}
        y2={cy}
        stroke="#000000"
        strokeWidth={2}
        strokeDasharray="8 4"
      />
      <Polygon
        points={`${width - 2},${cy} ${width - 12},${cy - 6} ${width - 12},${cy + 6}`}
        fill="#000000"
        stroke="#000000"
        strokeWidth={2}
      />
    </Svg>
  );
};

// ─── 6. INTERFACE CONNECTOR ─────────────────────────────────────────────
// Canvas: strokeColor: '#000000', strokeWidth: 2, double-ended arrow

export const FDD_InterfaceShape: React.FC<ShapeProps> = ({ width, height }) => {
  const cy = height / 2;
  const arrowWidth = 12;
  const arrowSize = 6;
  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      {/* Left arrow - pointing left */}
      <Polygon
        points={`2,${cy} ${arrowWidth},${cy - arrowSize} ${arrowWidth},${cy + arrowSize}`}
        fill="#000000"
        stroke="#000000"
        strokeWidth={2}
      />
      {/* Right arrow - pointing right */}
      <Polygon
        points={`${width - 2},${cy} ${width - arrowWidth},${cy - arrowSize} ${width - arrowWidth},${cy + arrowSize}`}
        fill="#000000"
        stroke="#000000"
        strokeWidth={2}
      />
      {/* Line connecting them */}
      <Line
        x1={arrowWidth}
        y1={cy}
        x2={width - arrowWidth}
        y2={cy}
        stroke="#000000"
        strokeWidth={2}
      />
    </Svg>
  );
};

// ─── 7. BOUNDARY ──────────────────────────────────────────────────────
// Canvas: strokeColor: '#666666', strokeWidth: 2, dashed (8,4), rounded, no fill

export const FDD_BoundaryShape: React.FC<ShapeProps> = ({ width, height }) => {
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
        stroke="#666666"
        strokeWidth={2}
        strokeDasharray="8 4"
      />
    </Svg>
  );
};

// ─── 8. NOTE ──────────────────────────────────────────────────────────────
// Canvas: fillColor: '#FFF4CC', strokeColor: '#B7950B', strokeWidth: 2, document shape

export const FDD_NoteShape: React.FC<ShapeProps> = ({ width, height }) => {
  const fold = Math.min(width, height) * 0.18;
  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <Path
        d={`M1,1 L${width - fold - 1},1 L${width - 1},${fold + 1} L${width - 1},${height - 1} L1,${height - 1} Z`}
        fill="#FFF4CC"
        stroke="#B7950B"
        strokeWidth={2}
      />
      <Line
        x1={width - fold - 1}
        y1={1}
        x2={width - fold - 1}
        y2={fold + 1}
        stroke="#B7950B"
        strokeWidth={2}
      />
      <Line
        x1={width - fold - 1}
        y1={fold + 1}
        x2={width - 1}
        y2={fold + 1}
        stroke="#B7950B"
        strokeWidth={2}
      />
    </Svg>
  );
};

// ─── 9. EXTERNAL ENTITY ────────────────────────────────────────────────────
// Canvas: fillColor: '#F4F4F4', strokeColor: '#8E8E8E', strokeWidth: 2, ellipse

export const FDD_ExternalEntityShape: React.FC<ShapeProps> = ({ width, height }) => {
  const cx = width / 2;
  const cy = height / 2;
  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <Ellipse
        cx={cx}
        cy={cy}
        rx={width / 2 - 1}
        ry={height / 2 - 1}
        fill="#F4F4F4"
        stroke="#8E8E8E"
        strokeWidth={2}
      />
    </Svg>
  );
};
