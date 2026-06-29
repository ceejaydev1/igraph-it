// components/shapes/shapes/SequenceShapes.tsx
// Sequence Diagram shapes

import React from 'react';
import { Svg, Rect, Line, Polygon, Path, G, Text as SvgText } from 'react-native-svg';

interface ShapeProps {
  width: number;
  height: number;
  color?: string;
  fillColor?: string;
  strokeWidth?: number;
}

// ─── 1. Lifeline ──────────────────────────────────────────────────────────

export const UMLLifelineShape: React.FC<ShapeProps> = ({
  width,
  height,
  color = '#1a1f36',
  fillColor = '#ffffff',
  strokeWidth = 2,
}) => {
  const header = Math.min(50, height * 0.15);
  const cx = width / 2;
  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <Rect x={width * 0.1} y={4} width={width * 0.8} height={header} fill={fillColor} stroke={color} strokeWidth={strokeWidth} rx={2} />
      <Line x1={cx} y1={header + 4} x2={cx} y2={height - 4} stroke={color} strokeWidth={1.5} strokeDasharray="6,4" />
    </Svg>
  );
};

// ─── 2. Activation ────────────────────────────────────────────────────────

export const UMLActivationShape: React.FC<ShapeProps> = ({
  width,
  height,
  color = '#1a1f36',
  fillColor = '#ffffff',
  strokeWidth = 2,
}) => {
  const barW = Math.min(16, width * 0.4);
  const x = (width - barW) / 2;
  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <Rect x={x} y={4} width={barW} height={height - 8} fill={fillColor} stroke={color} strokeWidth={strokeWidth} rx={2} />
    </Svg>
  );
};

// ─── 3. Destroy (X) ──────────────────────────────────────────────────────

export const UMLDestroyShape: React.FC<ShapeProps> = ({
  width,
  height,
  color = '#1a1f36',
  strokeWidth = 2,
}) => {
  const p = Math.min(width, height) * 0.2;
  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <Line x1={p} y1={p} x2={width - p} y2={height - p} stroke={color} strokeWidth={strokeWidth} />
      <Line x1={width - p} y1={p} x2={p} y2={height - p} stroke={color} strokeWidth={strokeWidth} />
    </Svg>
  );
};

// ─── 4. Sync Message ─────────────────────────────────────────────────────

export const UMLSyncMsgShape: React.FC<ShapeProps> = ({
  width,
  height,
  color = '#1a1f36',
  strokeWidth = 2,
}) => {
  const cy = height / 2;
  const arrow = 12;
  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <Line x1={4} y1={cy} x2={width - arrow - 4} y2={cy} stroke={color} strokeWidth={strokeWidth} />
      <Polygon
        points={`${width - 4},${cy} ${width - arrow - 4},${cy - 6} ${width - arrow - 4},${cy + 6}`}
        fill={color}
      />
    </Svg>
  );
};

// ─── 5. Async Message ────────────────────────────────────────────────────

export const UMLAsyncMsgShape: React.FC<ShapeProps> = ({
  width,
  height,
  color = '#1a1f36',
  strokeWidth = 2,
}) => {
  const cy = height / 2;
  const arrow = 12;
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

// ─── 6. Return Message ───────────────────────────────────────────────────

export const UMLReturnMsgShape: React.FC<ShapeProps> = ({
  width,
  height,
  color = '#1a1f36',
  strokeWidth = 2,
}) => {
  const cy = height / 2;
  const arrow = 12;
  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <Line
        x1={4 + arrow}
        y1={cy}
        x2={width - 4}
        y2={cy}
        stroke={color}
        strokeWidth={strokeWidth}
        strokeDasharray="6,4"
      />
      <Polygon
        points={`4,${cy} ${4 + arrow},${cy - 6} ${4 + arrow},${cy + 6}`}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
      />
    </Svg>
  );
};

// ─── 7. ALT Fragment ─────────────────────────────────────────────────────

export const UMLAltShape: React.FC<ShapeProps> = ({
  width,
  height,
  color = '#1a1f36',
  strokeWidth = 2,
}) => {
  const cx = width / 2;
  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <Rect x={4} y={4} width={width - 8} height={height - 8} fill="none" stroke={color} strokeWidth={strokeWidth} rx={2} />
      <Path d={`M4,4 L30,4 L38,20 L38,35 L4,35 Z`} fill="none" stroke={color} strokeWidth={strokeWidth} />
      <SvgText x={16} y={22} fontSize={10} fill={color} textAnchor="middle" fontWeight="600">alt</SvgText>
      <Line x1={4} y1={height / 2} x2={width - 4} y2={height / 2} stroke={color} strokeWidth={1.5} strokeDasharray="6,4" />
    </Svg>
  );
};

// ─── 8. OPT Fragment ─────────────────────────────────────────────────────

export const UMLOptShape: React.FC<ShapeProps> = ({
  width,
  height,
  color = '#1a1f36',
  strokeWidth = 2,
}) => {
  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <Rect x={4} y={4} width={width - 8} height={height - 8} fill="none" stroke={color} strokeWidth={strokeWidth} rx={2} />
      <Path d={`M4,4 L30,4 L38,20 L38,35 L4,35 Z`} fill="none" stroke={color} strokeWidth={strokeWidth} />
      <SvgText x={16} y={22} fontSize={10} fill={color} textAnchor="middle" fontWeight="600">opt</SvgText>
    </Svg>
  );
};

// ─── 9. LOOP Fragment ────────────────────────────────────────────────────

export const UMLLoopShape: React.FC<ShapeProps> = ({
  width,
  height,
  color = '#1a1f36',
  strokeWidth = 2,
}) => {
  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <Rect x={4} y={4} width={width - 8} height={height - 8} fill="none" stroke={color} strokeWidth={strokeWidth} rx={2} />
      <Path d={`M4,4 L35,4 L43,20 L43,35 L4,35 Z`} fill="none" stroke={color} strokeWidth={strokeWidth} />
      <SvgText x={20} y={22} fontSize={10} fill={color} textAnchor="middle" fontWeight="600">loop</SvgText>
    </Svg>
  );
};

// ─── 10. PAR Fragment ─────────────────────────────────────────────────────

export const UMLParShape: React.FC<ShapeProps> = ({
  width,
  height,
  color = '#1a1f36',
  strokeWidth = 2,
}) => {
  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <Rect x={4} y={4} width={width - 8} height={height - 8} fill="none" stroke={color} strokeWidth={strokeWidth} rx={2} />
      <Path d={`M4,4 L30,4 L38,20 L38,35 L4,35 Z`} fill="none" stroke={color} strokeWidth={strokeWidth} />
      <SvgText x={16} y={22} fontSize={10} fill={color} textAnchor="middle" fontWeight="600">par</SvgText>
      <Line x1={4} y1={height / 2} x2={width - 4} y2={height / 2} stroke={color} strokeWidth={1.5} strokeDasharray="6,4" />
    </Svg>
  );
};

// ─── 11. BREAK Fragment ──────────────────────────────────────────────────

export const UMLBreakShape: React.FC<ShapeProps> = ({
  width,
  height,
  color = '#1a1f36',
  strokeWidth = 2,
}) => {
  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <Rect x={4} y={4} width={width - 8} height={height - 8} fill="none" stroke={color} strokeWidth={strokeWidth} rx={2} />
      <Path d={`M4,4 L38,4 L46,20 L46,35 L4,35 Z`} fill="none" stroke={color} strokeWidth={strokeWidth} />
      <SvgText x={22} y={22} fontSize={10} fill={color} textAnchor="middle" fontWeight="600">break</SvgText>
    </Svg>
  );
};