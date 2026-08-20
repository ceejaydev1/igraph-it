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
  const r = Math.min(width, height) / 2 - 2;
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
      <Line x1={2} y1={cy} x2={width - arrowSize - 2} y2={cy} stroke={color} strokeWidth={strokeWidth} />
      <Polygon
        points={`${width - 2},${cy} ${width - arrowSize - 2},${cy - 5} ${width - arrowSize - 2},${cy + 5}`}
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
      <Line x1={2} y1={y1} x2={width - 2} y2={y1} stroke={color} strokeWidth={strokeWidth} />
      <Line x1={2} y1={y2} x2={width - 2} y2={y2} stroke={color} strokeWidth={strokeWidth} />
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
      <Rect x={2} y={2} width={width - 4} height={height - 4} fill={fillColor} stroke={color} strokeWidth={strokeWidth} />
      <Line x1={width * 0.2} y1={2} x2={width * 0.2} y2={height - 2} stroke={color} strokeWidth={strokeWidth} />
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
      <Rect x={2} y={2} width={width - 4} height={height - 4} fill={fillColor} stroke={color} strokeWidth={strokeWidth} />
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
  const arrow = 10;
  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      {/* Left arrow (pointing left) */}
      <Polygon
        points={`2,${cy} ${arrow + 2},${cy - 5} ${arrow + 2},${cy + 5}`}
        fill={color}
      />
      {/* Right arrow (pointing right) */}
      <Polygon
        points={`${width - 2},${cy} ${width - arrow - 2},${cy - 5} ${width - arrow - 2},${cy + 5}`}
        fill={color}
      />
      {/* Line connecting them */}
      <Line x1={arrow + 2} y1={cy} x2={width - arrow - 2} y2={cy} stroke={color} strokeWidth={strokeWidth} />
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
        x={2}
        y={2}
        width={width - 4}
        height={height - 4}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeDasharray="8,6"
      />
    </Svg>
  );
};

// ─── 8. DFD Note ──────────────────────────────────────────────────────────

export const DFDNoteShape: React.FC<ShapeProps> = ({
  width,
  height,
  color = '#1a1f36',
  fillColor = '#ffffff',
  strokeWidth = 2,
}) => {
  const fold = Math.min(width, height) * 0.2;
  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <Path
        d={`M2,2 L${width - fold - 2},2 L${width - 2},${fold + 2} L${width - 2},${height - 2} L2,${height - 2} Z`}
        fill={fillColor}
        stroke={color}
        strokeWidth={strokeWidth}
      />
      <Line
        x1={width - fold - 2}
        y1={2}
        x2={width - fold - 2}
        y2={fold + 2}
        stroke={color}
        strokeWidth={strokeWidth}
      />
      <Line
        x1={width - fold - 2}
        y1={fold + 2}
        x2={width - 2}
        y2={fold + 2}
        stroke={color}
        strokeWidth={strokeWidth}
      />
    </Svg>
  );
};

// ─── 9. DFD On-Page Connector ─────────────────────────────────────────────
// Canvas leaves the inner dot filled white (no setFillColor before the
// second ellipse), so it doesn't actually show as a colored dot - matched
// here rather than "fixed" to keep parity with current canvas rendering.

export const DFDOnPageShape: React.FC<ShapeProps> = ({
  width,
  height,
  color = '#1a1f36',
  fillColor = '#ffffff',
  strokeWidth = 2,
}) => {
  const cx = width / 2;
  const cy = height / 2;
  const r = Math.min(width, height) / 2 - 2;
  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <Circle cx={cx} cy={cy} r={r} fill={fillColor} stroke={color} strokeWidth={strokeWidth} />
      <Circle cx={cx} cy={cy} r={r * 0.3} fill={fillColor} />
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
        points={`2,2 ${width - 2},2 ${width - 2},${height * 0.65} ${cx},${height - 2} 2,${height * 0.65}`}
        fill={fillColor}
        stroke={color}
        strokeWidth={strokeWidth}
      />
    </Svg>
  );
};
