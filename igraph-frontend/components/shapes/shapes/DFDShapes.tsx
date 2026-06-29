// components/shapes/shapes/DFDShapes.tsx
// Data Flow Diagram shapes

import React from 'react';
import { Svg, Circle, Ellipse, Rect, Line, Polygon, Path, G } from 'react-native-svg';

interface ShapeProps {
  width: number;
  height: number;
  color?: string;
  fillColor?: string;
  strokeWidth?: number;
}

// ─── 1. DFD Process (Circle) ──────────────────────────────────────────────

export const DFDProcessShape: React.FC<ShapeProps> = ({
  width,
  height,
  color = '#1a1f36',
  fillColor = '#ffffff',
  strokeWidth = 2,
}) => {
  const cx = width / 2;
  const cy = height / 2;
  const r = Math.min(width, height) / 2 - strokeWidth / 2;
  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <Circle cx={cx} cy={cy} r={r} fill={fillColor} stroke={color} strokeWidth={strokeWidth} />
    </Svg>
  );
};

// ─── 2. DFD Data Flow (Arrow) ─────────────────────────────────────────────

export const DFDDataFlowShape: React.FC<ShapeProps> = ({
  width,
  height,
  color = '#1a1f36',
  strokeWidth = 2,
}) => {
  const cy = height / 2;
  const arrowSize = 10;
  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <Line x1={4} y1={cy} x2={width - arrowSize - 4} y2={cy} stroke={color} strokeWidth={strokeWidth} />
      <Polygon
        points={`${width - 4},${cy} ${width - arrowSize - 4},${cy - 5} ${width - arrowSize - 4},${cy + 5}`}
        fill={color}
      />
    </Svg>
  );
};

// ─── 3. DFD Data Store (Yourdon/DeMarco - Parallel Lines) ────────────────

export const DFDDataStoreShape: React.FC<ShapeProps> = ({
  width,
  height,
  color = '#1a1f36',
  strokeWidth = 2,
}) => {
  const y1 = height * 0.2;
  const y2 = height * 0.8;
  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <Line x1={4} y1={y1} x2={width - 4} y2={y1} stroke={color} strokeWidth={strokeWidth} />
      <Line x1={4} y1={y2} x2={width - 4} y2={y2} stroke={color} strokeWidth={strokeWidth} />
    </Svg>
  );
};

// ─── 4. DFD Data Store (Gane & Sarson - Rectangle with side line) ──────

export const DFDDataStoreGSShape: React.FC<ShapeProps> = ({
  width,
  height,
  color = '#1a1f36',
  fillColor = '#ffffff',
  strokeWidth = 2,
}) => {
  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <Rect x={4} y={4} width={width - 8} height={height - 8} fill={fillColor} stroke={color} strokeWidth={strokeWidth} rx={2} />
      <Line x1={width * 0.2} y1={4} x2={width * 0.2} y2={height - 4} stroke={color} strokeWidth={strokeWidth} />
    </Svg>
  );
};

// ─── 5. DFD External Entity ───────────────────────────────────────────────

export const DFDExternalEntityShape: React.FC<ShapeProps> = ({
  width,
  height,
  color = '#1a1f36',
  fillColor = '#ffffff',
  strokeWidth = 2,
}) => {
  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <Rect x={4} y={4} width={width - 8} height={height - 8} fill={fillColor} stroke={color} strokeWidth={strokeWidth} rx={2} />
    </Svg>
  );
};

// ─── 6. DFD Bidirectional Data Flow ──────────────────────────────────────

export const DFDBidirectionalShape: React.FC<ShapeProps> = ({
  width,
  height,
  color = '#1a1f36',
  strokeWidth = 2,
}) => {
  const cy = height / 2;
  const arrowSize = 10;
  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      {/* Left arrow (pointing left) */}
      <Polygon
        points={`4,${cy} ${4 + arrowSize},${cy - 5} ${4 + arrowSize},${cy + 5}`}
        fill={color}
      />
      {/* Right arrow (pointing right) */}
      <Polygon
        points={`${width - 4},${cy} ${width - 4 - arrowSize},${cy - 5} ${width - 4 - arrowSize},${cy + 5}`}
        fill={color}
      />
      {/* Line connecting them */}
      <Line x1={4 + arrowSize} y1={cy} x2={width - 4 - arrowSize} y2={cy} stroke={color} strokeWidth={strokeWidth} />
    </Svg>
  );
};

// ─── 7. DFD System Boundary ──────────────────────────────────────────────

export const DFDBoundaryShape: React.FC<ShapeProps> = ({
  width,
  height,
  color = '#1a1f36',
  strokeWidth = 2,
}) => {
  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <Rect
        x={4}
        y={4}
        width={width - 8}
        height={height - 8}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeDasharray="8,6"
        rx={4}
      />
    </Svg>
  );
};

// ─── 8. DFD Note ──────────────────────────────────────────────────────────

export const DFDNoteShape: React.FC<ShapeProps> = ({
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

// ─── 9. DFD On-Page Connector ─────────────────────────────────────────────

export const DFDOnPageShape: React.FC<ShapeProps> = ({
  width,
  height,
  color = '#1a1f36',
  fillColor = '#ffffff',
  strokeWidth = 2,
}) => {
  const cx = width / 2;
  const cy = height / 2;
  const r = Math.min(width, height) / 2 - strokeWidth / 2;
  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <Circle cx={cx} cy={cy} r={r} fill={fillColor} stroke={color} strokeWidth={strokeWidth} />
      <Circle cx={cx} cy={cy} r={r * 0.3} fill={color} />
    </Svg>
  );
};

// ─── 10. DFD Off-Page Connector ───────────────────────────────────────────

export const DFDOffPageShape: React.FC<ShapeProps> = ({
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
        points={`4,4 ${width - 4},4 ${width - 4},${height * 0.65} ${cx},${height - 4} 4,${height * 0.65}`}
        fill={fillColor}
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
      />
    </Svg>
  );
};