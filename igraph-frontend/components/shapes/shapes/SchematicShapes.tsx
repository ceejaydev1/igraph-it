// components/shapes/shapes/SchematicShapes.tsx
// Electronic schematic diagram shapes - FIXED

import React from 'react';
import { Svg, Rect, Ellipse, Polygon, Circle, Line, G, Path, Text as SvgText } from 'react-native-svg';

interface ShapeProps {
  width: number;
  height: number;
  color?: string;
  fillColor?: string;  // ✅ Added fillColor
  strokeWidth?: number;
}

// ─── Resistor ──────────────────────────────────────────────────────────────

export const ResistorShape: React.FC<ShapeProps> = ({
  width,
  height,
  color = '#1a1f36',
  strokeWidth = 2,
}) => {
  const cy = height / 2;
  const segs = 6;
  const segW = (width - 8) / segs;
  let path = `M4,${cy}`;
  for (let i = 0; i < segs; i++) {
    const x = 4 + i * segW;
    const isUp = i % 2 === 0;
    const y = isUp ? cy - height * 0.35 : cy + height * 0.35;
    path += ` L${x},${y}`;
  }
  path += ` L${width - 4},${cy}`;
  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <Path d={path} fill="none" stroke={color} strokeWidth={strokeWidth} />
      <Line x1={4} y1={cy} x2={0} y2={cy} stroke={color} strokeWidth={strokeWidth} />
      <Line x1={width - 4} y1={cy} x2={width} y2={cy} stroke={color} strokeWidth={strokeWidth} />
    </Svg>
  );
};

// ─── Capacitor ─────────────────────────────────────────────────────────────

export const CapacitorShape: React.FC<ShapeProps> = ({
  width,
  height,
  color = '#1a1f36',
  strokeWidth = 2,
}) => {
  const cy = height / 2;
  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <Line x1={4} y1={cy} x2={width / 2 - 6} y2={cy} stroke={color} strokeWidth={strokeWidth} />
      <Line x1={width / 2 - 2} y1={4} x2={width / 2 - 2} y2={height - 4} stroke={color} strokeWidth={strokeWidth} />
      <Line x1={width / 2 + 2} y1={6} x2={width / 2 + 2} y2={height - 6} stroke={color} strokeWidth={strokeWidth} />
      <Line x1={width / 2 + 6} y1={cy} x2={width - 4} y2={cy} stroke={color} strokeWidth={strokeWidth} />
    </Svg>
  );
};

// ─── Inductor ──────────────────────────────────────────────────────────────

export const InductorShape: React.FC<ShapeProps> = ({
  width,
  height,
  color = '#1a1f36',
  strokeWidth = 2,
}) => {
  const cy = height / 2;
  const loops = 5;
  const loopW = (width - 8) / loops;
  let path = `M4,${cy}`;
  for (let i = 0; i < loops; i++) {
    const x = 4 + i * loopW;
    path += ` A${loopW / 2},${height / 3} 0 0,1 ${x + loopW},${cy}`;
  }
  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <Path d={path} fill="none" stroke={color} strokeWidth={strokeWidth} />
      <Line x1={4} y1={cy} x2={0} y2={cy} stroke={color} strokeWidth={strokeWidth} />
      <Line x1={width - 4} y1={cy} x2={width} y2={cy} stroke={color} strokeWidth={strokeWidth} />
    </Svg>
  );
};

// ─── Voltage Source ────────────────────────────────────────────────────────

export const VoltageShape: React.FC<ShapeProps> = ({
  width,
  height,
  color = '#1a1f36',
  strokeWidth = 2,
}) => {
  const cx = width / 2;
  const cy = height / 2;
  const r = Math.min(width, height) * 0.35;
  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <Circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth={strokeWidth} />
      <Line x1={cx - r * 0.4} y1={cy} x2={cx + r * 0.4} y2={cy} stroke={color} strokeWidth={strokeWidth} />
      <Line x1={cx} y1={cy - r * 0.4} x2={cx} y2={cy + r * 0.4} stroke={color} strokeWidth={strokeWidth} />
      {/* ✅ FIX: Use SvgText instead of react-native Text */}
      <SvgText x={cx - r * 0.2} y={cy + r * 0.3} fontSize={10} fill={color}>+</SvgText>
      <SvgText x={cx - r * 0.2} y={cy - r * 0.2} fontSize={10} fill={color}>-</SvgText>
    </Svg>
  );
};

// ─── Ground ────────────────────────────────────────────────────────────────

export const GroundShape: React.FC<ShapeProps> = ({
  width,
  height,
  color = '#1a1f36',
  strokeWidth = 2,
}) => {
  const cx = width / 2;
  const h = height;
  const lines = 3;
  const spacing = h / (lines + 2);
  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <Line x1={cx} y1={4} x2={cx} y2={h - 4 - lines * spacing} stroke={color} strokeWidth={strokeWidth} />
      {Array.from({ length: lines }).map((_, i) => {
        const y = h - 4 - i * spacing;
        const w = width * (0.8 - i * 0.15);
        return (
          <Line
            key={i}
            x1={cx - w / 2}
            y1={y}
            x2={cx + w / 2}
            y2={y}
            stroke={color}
            strokeWidth={Math.max(0.5, strokeWidth - i * 0.3)}
          />
        );
      })}
    </Svg>
  );
};

// ─── Diode ─────────────────────────────────────────────────────────────────

export const DiodeShape: React.FC<ShapeProps> = ({
  width,
  height,
  color = '#1a1f36',
  strokeWidth = 2,
}) => {
  const cy = height / 2;
  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <Line x1={4} y1={cy} x2={width * 0.3} y2={cy} stroke={color} strokeWidth={strokeWidth} />
      <Polygon
        points={`${width * 0.3},${cy} ${width * 0.5},${cy - height * 0.4} ${width * 0.5},${cy + height * 0.4}`}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
      />
      <Line x1={width * 0.5} y1={cy - height * 0.4} x2={width * 0.5} y2={cy + height * 0.4} stroke={color} strokeWidth={strokeWidth} />
      <Line x1={width * 0.5} y1={cy} x2={width - 4} y2={cy} stroke={color} strokeWidth={strokeWidth} />
    </Svg>
  );
};

// ─── Transistor ────────────────────────────────────────────────────────────

export const TransistorShape: React.FC<ShapeProps> = ({
  width,
  height,
  color = '#1a1f36',
  strokeWidth = 2,
}) => {
  const cx = width / 2;
  const cy = height / 2;
  const r = Math.min(width, height) * 0.3;
  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <Circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth={strokeWidth} />
      <Line x1={cx} y1={cy - r} x2={cx} y2={4} stroke={color} strokeWidth={strokeWidth} />
      <Line x1={cx - r} y1={cy} x2={4} y2={cy} stroke={color} strokeWidth={strokeWidth} />
      <Line x1={cx + r} y1={cy} x2={width - 4} y2={cy} stroke={color} strokeWidth={strokeWidth} />
      {/* Arrow on emitter */}
      <Line x1={cx} y1={cy + r} x2={cx} y2={height - 4} stroke={color} strokeWidth={strokeWidth} />
      <Polygon points={`${cx},${height - 4} ${cx - 4},${height - 12} ${cx + 4},${height - 12}`} fill={color} />
    </Svg>
  );
};

// ─── IC (Integrated Circuit) ──────────────────────────────────────────────

export const ICShape: React.FC<ShapeProps> = ({
  width,
  height,
  color = '#1a1f36',
  fillColor = '#ffffff',  // ✅ Now using the prop
  strokeWidth = 2,
}) => {
  const pinCount = 4;
  const pinSpacing = (height - 8) / (pinCount + 1);
  return (
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
      {Array.from({ length: pinCount }).map((_, i) => {
        const y = 4 + (i + 1) * pinSpacing;
        return (
          <G key={i}>
            <Line x1={0} y1={y} x2={4} y2={y} stroke={color} strokeWidth={1.5} />
            <Line x1={width - 4} y1={y} x2={width} y2={y} stroke={color} strokeWidth={1.5} />
          </G>
        );
      })}
      {/* IC label placeholder */}
      <Line x1={width * 0.3} y1={height * 0.5} x2={width * 0.7} y2={height * 0.5} stroke={color} strokeWidth={1} opacity={0.3} />
    </Svg>
  );
};

// ─── Op-Amp ────────────────────────────────────────────────────────────────

export const OpAmpShape: React.FC<ShapeProps> = ({
  width,
  height,
  color = '#1a1f36',
  strokeWidth = 2,
}) => {
  const cx = width / 2;
  const cy = height / 2;
  const w = width - 8;
  const h = height - 8;
  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <Polygon
        points={`4,${cy} ${4 + w * 0.3},${cy - h / 2} ${4 + w * 0.7},${cy - h / 2} ${width - 4},${cy} ${4 + w * 0.7},${cy + h / 2} ${4 + w * 0.3},${cy + h / 2}`}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
      />
      <Line x1={4} y1={cy - h * 0.25} x2={4 + w * 0.1} y2={cy - h * 0.25} stroke={color} strokeWidth={strokeWidth} />
      <Line x1={4} y1={cy + h * 0.25} x2={4 + w * 0.1} y2={cy + h * 0.25} stroke={color} strokeWidth={strokeWidth} />
      {/* ✅ FIX: Use SvgText instead of react-native Text */}
      <SvgText x={2} y={cy - h * 0.25 + 3} fontSize={8} fill={color}>-</SvgText>
      <SvgText x={2} y={cy + h * 0.25 + 3} fontSize={8} fill={color}>+</SvgText>
      <Line x1={width - 4} y1={cy} x2={width - 4} y2={cy} stroke={color} strokeWidth={strokeWidth} />
    </Svg>
  );
};

// ─── Switch ────────────────────────────────────────────────────────────────

export const SwitchShape: React.FC<ShapeProps> = ({
  width,
  height,
  color = '#1a1f36',
  strokeWidth = 2,
}) => {
  const cx = width / 2;
  const cy = height / 2;
  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <Line x1={4} y1={cy} x2={cx - 4} y2={cy} stroke={color} strokeWidth={strokeWidth} />
      <Line x1={cx + 4} y1={cy} x2={width - 4} y2={cy} stroke={color} strokeWidth={strokeWidth} />
      <Circle cx={cx} cy={cy} r={Math.min(width, height) * 0.2} fill="none" stroke={color} strokeWidth={strokeWidth} />
      <Line x1={cx} y1={cy} x2={cx + 6} y2={cy - 8} stroke={color} strokeWidth={strokeWidth} />
    </Svg>
  );
};

// ─── Fuse ──────────────────────────────────────────────────────────────────

export const FuseShape: React.FC<ShapeProps> = ({
  width,
  height,
  color = '#1a1f36',
  strokeWidth = 2,
}) => {
  const cy = height / 2;
  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <Rect
        x={width * 0.15}
        y={cy - height * 0.3}
        width={width * 0.7}
        height={height * 0.6}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        rx={2}
      />
      <Line x1={4} y1={cy} x2={width * 0.15} y2={cy} stroke={color} strokeWidth={strokeWidth} />
      <Line x1={width * 0.85} y1={cy} x2={width - 4} y2={cy} stroke={color} strokeWidth={strokeWidth} />
      <Line x1={width * 0.3} y1={cy} x2={width * 0.7} y2={cy} stroke={color} strokeWidth={1.5} />
    </Svg>
  );
};

// ─── Transformer ───────────────────────────────────────────────────────────

export const TransformerShape: React.FC<ShapeProps> = ({
  width,
  height,
  color = '#1a1f36',
  strokeWidth = 2,
}) => {
  const cy = height / 2;
  const coils = 4;
  const spacing = (width - 8) / (coils * 2 + 1);
  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <G>
        {Array.from({ length: coils }).map((_, i) => {
          const x1 = 4 + (i * 2 + 0.5) * spacing;
          const x2 = 4 + (i * 2 + 1.5) * spacing;
          return (
            <G key={i}>
              <Line x1={x1} y1={cy - height * 0.35} x2={x2} y2={cy - height * 0.35} stroke={color} strokeWidth={1.5} />
              <Line x1={x1} y1={cy + height * 0.35} x2={x2} y2={cy + height * 0.35} stroke={color} strokeWidth={1.5} />
            </G>
          );
        })}
        {/* Core */}
        <Line
          x1={4}
          y1={cy - height * 0.3}
          x2={width - 4}
          y2={cy - height * 0.3}
          stroke={color}
          strokeWidth={1}
          strokeDasharray="2,2"
        />
        <Line
          x1={4}
          y1={cy + height * 0.3}
          x2={width - 4}
          y2={cy + height * 0.3}
          stroke={color}
          strokeWidth={1}
          strokeDasharray="2,2"
        />
      </G>
    </Svg>
  );
};