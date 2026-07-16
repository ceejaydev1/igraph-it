import React from 'react';
import { Svg, Rect, Ellipse, Polygon, Circle, Line, Path, Text as SvgText } from 'react-native-svg';

interface ShapeProps {
  width: number;
  height: number;
  color?: string;
  fillColor?: string;
  strokeWidth?: number;
}

// ─── 1. DC Voltage Source (Battery) ──────────────────────────────────────

export const SchematicBatteryShape: React.FC<ShapeProps> = ({
  width,
  height,
  color = '#1a1f36',
  strokeWidth = 2,
}) => {
  const cy = height / 2;
  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <Line x1={2} y1={cy} x2={width * 0.35} y2={cy} stroke={color} strokeWidth={strokeWidth} />
      <Line x1={width * 0.35} y1={height * 0.2} x2={width * 0.35} y2={height * 0.8} stroke={color} strokeWidth={strokeWidth} />
      <Line x1={width * 0.45} y1={height * 0.3} x2={width * 0.45} y2={height * 0.7} stroke={color} strokeWidth={strokeWidth} />
      <Line x1={width * 0.45} y1={cy} x2={width - 2} y2={cy} stroke={color} strokeWidth={strokeWidth} />
      <SvgText x={width * 0.15} y={height * 0.2} fontSize={10} fill={color} textAnchor="middle">+</SvgText>
    </Svg>
  );
};

// ─── 2. AC Voltage Source ─────────────────────────────────────────────────

export const SchematicACShape: React.FC<ShapeProps> = ({
  width,
  height,
  color = '#1a1f36',
  strokeWidth = 2,
}) => {
  const cx = width / 2;
  const cy = height / 2;
  const r = Math.min(width, height) * 0.33;
  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <Line x1={2} y1={cy} x2={cx - r} y2={cy} stroke={color} strokeWidth={strokeWidth} />
      <Line x1={cx + r} y1={cy} x2={width - 2} y2={cy} stroke={color} strokeWidth={strokeWidth} />
      <Ellipse cx={cx} cy={cy} rx={r} ry={r} fill="none" stroke={color} strokeWidth={strokeWidth} />
      <Path
        d={`M${cx - r * 0.5},${cy} Q${cx},${cy - r * 0.6} ${cx + r * 0.7},${cy}`}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
      />
    </Svg>
  );
};

// ─── 3. Ground ─────────────────────────────────────────────────────────────

export const SchematicGroundShape: React.FC<ShapeProps> = ({
  width,
  height,
  color = '#1a1f36',
  strokeWidth = 2,
}) => {
  const cx = width / 2;
  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <Line x1={cx} y1={2} x2={cx} y2={height * 0.35} stroke={color} strokeWidth={strokeWidth} />
      <Line x1={width * 0.2} y1={height * 0.35} x2={width * 0.8} y2={height * 0.35} stroke={color} strokeWidth={strokeWidth} />
      <Line x1={width * 0.28} y1={height * 0.55} x2={width * 0.72} y2={height * 0.55} stroke={color} strokeWidth={strokeWidth} />
      <Line x1={width * 0.36} y1={height * 0.75} x2={width * 0.64} y2={height * 0.75} stroke={color} strokeWidth={strokeWidth} />
    </Svg>
  );
};

// ─── 4. Resistor ──────────────────────────────────────────────────────────

export const SchematicResistorShape: React.FC<ShapeProps> = ({
  width,
  height,
  color = '#1a1f36',
  strokeWidth = 2,
}) => {
  const cy = height / 2;
  const s = height * 0.2;
  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <Line x1={2} y1={cy} x2={width * 0.15} y2={cy} stroke={color} strokeWidth={strokeWidth} />
      <Polygon
        points={`${width * 0.15},${cy - s} ${width * 0.23},${cy + s} ${width * 0.31},${cy - s} ${width * 0.39},${cy + s} ${width * 0.47},${cy - s} ${width * 0.55},${cy + s} ${width * 0.63},${cy - s} ${width * 0.71},${cy + s} ${width * 0.79},${cy - s} ${width * 0.87},${cy}`}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
      />
      <Line x1={width * 0.87} y1={cy} x2={width - 2} y2={cy} stroke={color} strokeWidth={strokeWidth} />
    </Svg>
  );
};

// ─── 5. Variable Resistor ─────────────────────────────────────────────────

export const SchematicVariableResistorShape: React.FC<ShapeProps> = ({
  width,
  height,
  color = '#1a1f36',
  strokeWidth = 2,
}) => {
  const cy = height / 2;
  const s = height * 0.15;
  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <Line x1={2} y1={cy} x2={width * 0.15} y2={cy} stroke={color} strokeWidth={strokeWidth} />
      <Polygon
        points={`${width * 0.15},${cy - s} ${width * 0.23},${cy + s} ${width * 0.31},${cy - s} ${width * 0.39},${cy + s} ${width * 0.47},${cy - s} ${width * 0.55},${cy + s} ${width * 0.63},${cy - s} ${width * 0.71},${cy + s} ${width * 0.79},${cy}`}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
      />
      <Line x1={width * 0.79} y1={cy} x2={width - 2} y2={cy} stroke={color} strokeWidth={strokeWidth} />
      {/* Arrow indicator */}
      <Line x1={width * 0.2} y1={height * 0.85} x2={width * 0.55} y2={height * 0.25} stroke={color} strokeWidth={strokeWidth} />
      <Polygon
        points={`${width * 0.55},${height * 0.25} ${width * 0.48},${height * 0.3} ${width * 0.52},${height * 0.38}`}
        fill={color}
      />
    </Svg>
  );
};

// ─── 6. Capacitor ─────────────────────────────────────────────────────────

export const SchematicCapacitorShape: React.FC<ShapeProps> = ({
  width,
  height,
  color = '#1a1f36',
  strokeWidth = 2,
}) => {
  const cy = height / 2;
  const x1 = width * 0.4;
  const x2 = width * 0.6;
  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <Line x1={2} y1={cy} x2={x1} y2={cy} stroke={color} strokeWidth={strokeWidth} />
      <Line x1={x1} y1={height * 0.1} x2={x1} y2={height * 0.9} stroke={color} strokeWidth={strokeWidth} />
      <Line x1={x2} y1={height * 0.15} x2={x2} y2={height * 0.85} stroke={color} strokeWidth={strokeWidth} />
      <Line x1={x2} y1={cy} x2={width - 2} y2={cy} stroke={color} strokeWidth={strokeWidth} />
    </Svg>
  );
};

// ─── 7. Inductor ──────────────────────────────────────────────────────────

export const SchematicInductorShape: React.FC<ShapeProps> = ({
  width,
  height,
  color = '#1a1f36',
  strokeWidth = 2,
}) => {
  const cy = height / 2;
  const coils = 4;
  const spacing = (width - 8) / (coils * 2 + 1);
  let path = `M2,${cy} L${2 + spacing},${cy}`;
  for (let i = 0; i < coils; i++) {
    const x1 = 2 + (i * 2 + 1) * spacing;
    const x2 = 2 + (i * 2 + 2) * spacing;
    const mid = (x1 + x2) / 2;
    path += ` Q${mid},${cy - height * 0.35} ${x2},${cy}`;
  }
  path += ` L${width - 2},${cy}`;
  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <Path d={path} fill="none" stroke={color} strokeWidth={strokeWidth} />
    </Svg>
  );
};

// ─── 8. Diode ─────────────────────────────────────────────────────────────

export const SchematicDiodeShape: React.FC<ShapeProps> = ({
  width,
  height,
  color = '#1a1f36',
  fillColor = '#ffffff',
  strokeWidth = 2,
}) => {
  const cy = height / 2;
  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <Line x1={2} y1={cy} x2={width * 0.3} y2={cy} stroke={color} strokeWidth={strokeWidth} />
      <Polygon
        points={`${width * 0.3},${cy - height * 0.35} ${width * 0.3},${cy + height * 0.35} ${width * 0.55},${cy}`}
        fill={fillColor}
        stroke={color}
        strokeWidth={strokeWidth}
      />
      <Line x1={width * 0.55} y1={height * 0.2} x2={width * 0.55} y2={height * 0.8} stroke={color} strokeWidth={strokeWidth} />
      <Line x1={width * 0.55} y1={cy} x2={width - 2} y2={cy} stroke={color} strokeWidth={strokeWidth} />
    </Svg>
  );
};

// ─── 9. LED ────────────────────────────────────────────────────────────────

export const SchematicLEDShape: React.FC<ShapeProps> = ({
  width,
  height,
  color = '#1a1f36',
  fillColor = '#ffffff',
  strokeWidth = 2,
}) => {
  const cy = height / 2;
  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <Line x1={2} y1={cy} x2={width * 0.25} y2={cy} stroke={color} strokeWidth={strokeWidth} />
      <Polygon
        points={`${width * 0.25},${cy - height * 0.3} ${width * 0.25},${cy + height * 0.3} ${width * 0.45},${cy}`}
        fill={fillColor}
        stroke={color}
        strokeWidth={strokeWidth}
      />
      <Line x1={width * 0.45} y1={height * 0.2} x2={width * 0.45} y2={height * 0.8} stroke={color} strokeWidth={strokeWidth} />
      <Line x1={width * 0.45} y1={cy} x2={width * 0.7} y2={cy} stroke={color} strokeWidth={strokeWidth} />
      {/* Arrows indicating light */}
      <Line x1={width * 0.55} y1={height * 0.2} x2={width * 0.7} y2={height * 0.05} stroke={color} strokeWidth={1.5} />
      <Line x1={width * 0.62} y1={height * 0.3} x2={width * 0.77} y2={height * 0.15} stroke={color} strokeWidth={1.5} />
    </Svg>
  );
};

// ─── 10. NPN Transistor ───────────────────────────────────────────────────

export const SchematicNPNShape: React.FC<ShapeProps> = ({
  width,
  height,
  color = '#1a1f36',
  strokeWidth = 2,
}) => {
  const cx = width / 2;
  const cy = height / 2;
  const r = Math.min(width, height) * 0.25;
  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <Ellipse cx={cx} cy={cy} rx={r} ry={r} fill="none" stroke={color} strokeWidth={strokeWidth} />
      <Line x1={2} y1={cy} x2={cx - r} y2={cy} stroke={color} strokeWidth={strokeWidth} />
      <Line x1={cx} y1={cy - r} x2={cx} y2={2} stroke={color} strokeWidth={strokeWidth} />
      <Line x1={cx} y1={cy + r} x2={width * 0.7} y2={height - 2} stroke={color} strokeWidth={strokeWidth} />
      {/* Arrow on emitter */}
      <Polygon
        points={`${cx},${height - 2} ${cx - 4},${height - 10} ${cx + 4},${height - 10}`}
        fill={color}
      />
    </Svg>
  );
};

// ─── 11. Switch ────────────────────────────────────────────────────────────

export const SchematicSwitchShape: React.FC<ShapeProps> = ({
  width,
  height,
  color = '#1a1f36',
  strokeWidth = 2,
}) => {
  const cy = height * 0.6;
  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <Line x1={2} y1={cy} x2={width * 0.2} y2={cy} stroke={color} strokeWidth={strokeWidth} />
      <Line x1={width * 0.8} y1={cy} x2={width - 2} y2={cy} stroke={color} strokeWidth={strokeWidth} />
      <Line x1={width * 0.25} y1={cy} x2={width * 0.6} y2={height * 0.2} stroke={color} strokeWidth={strokeWidth} />
      {/* Connection dots */}
      <Circle cx={width * 0.2} cy={cy} r={3} fill={color} />
      <Circle cx={width * 0.8} cy={cy} r={3} fill={color} />
    </Svg>
  );
};

// ─── 12. Fuse ─────────────────────────────────────────────────────────────

export const SchematicFuseShape: React.FC<ShapeProps> = ({
  width,
  height,
  color = '#1a1f36',
  fillColor = '#ffffff',
  strokeWidth = 2,
}) => {
  const cy = height / 2;
  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <Line x1={2} y1={cy} x2={width * 0.25} y2={cy} stroke={color} strokeWidth={strokeWidth} />
      <Rect x={width * 0.25} y={height * 0.2} width={width * 0.5} height={height * 0.6} fill={fillColor} stroke={color} strokeWidth={strokeWidth} />
      <Line x1={width * 0.75} y1={cy} x2={width - 2} y2={cy} stroke={color} strokeWidth={strokeWidth} />
      <Line x1={width * 0.35} y1={cy} x2={width * 0.65} y2={cy} stroke={color} strokeWidth={strokeWidth} />
    </Svg>
  );
};

// ─── 13. Wire Connection ──────────────────────────────────────────────────

export const SchematicConnectionShape: React.FC<ShapeProps> = ({
  width,
  height,
  color = '#1a1f36',
  strokeWidth = 2,
}) => {
  const cy = height / 2;
  const cx = width / 2;
  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <Line x1={2} y1={cy} x2={width - 2} y2={cy} stroke={color} strokeWidth={strokeWidth} />
      <Circle cx={cx} cy={cy} r={4} fill={color} />
    </Svg>
  );
};

// ─── 14. No Connection ────────────────────────────────────────────────────

export const SchematicNoConnectionShape: React.FC<ShapeProps> = ({
  width,
  height,
  color = '#1a1f36',
  strokeWidth = 2,
}) => {
  const cy = height / 2;
  const cx = width / 2;
  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <Line x1={2} y1={cy} x2={width - 2} y2={cy} stroke={color} strokeWidth={strokeWidth} />
      <Line x1={cx} y1={2} x2={cx} y2={height - 2} stroke={color} strokeWidth={strokeWidth} />
    </Svg>
  );
};
