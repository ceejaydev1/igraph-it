import React from 'react';
import { Svg, Rect, Ellipse, Polygon, Circle, Line, G, Path } from 'react-native-svg';

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

// ─── Actor (Stick Figure) ──────────────────────────────────────────────────

export const ActorShape: React.FC<ShapeProps> = ({
  width,
  height,
  color = '#1a1f36',
  strokeWidth = 2,
}) => {
  const cx = width / 2;
  const h = height;
  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <Circle cx={cx} cy={h * 0.22} r={5} fill="none" stroke={color} strokeWidth={strokeWidth} />
      <Line x1={cx} y1={h * 0.38} x2={cx} y2={h * 0.68} stroke={color} strokeWidth={strokeWidth} />
      <Line x1={cx - 10} y1={h * 0.48} x2={cx + 10} y2={h * 0.48} stroke={color} strokeWidth={strokeWidth} />
      <Line x1={cx} y1={h * 0.68} x2={cx - 10} y2={h * 0.9} stroke={color} strokeWidth={strokeWidth} />
      <Line x1={cx} y1={h * 0.68} x2={cx + 10} y2={h * 0.9} stroke={color} strokeWidth={strokeWidth} />
    </Svg>
  );
};

// ─── Initial Node ──────────────────────────────────────────────────────────

export const InitialNodeShape: React.FC<ShapeProps> = ({
  width,
  height,
  color = '#1a1f36',
}) => {
  const cx = width / 2;
  const cy = height / 2;
  const r = Math.min(width, height) * 0.4;
  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <Circle cx={cx} cy={cy} r={r} fill={color} />
    </Svg>
  );
};

// ─── Final Node ────────────────────────────────────────────────────────────

export const FinalNodeShape: React.FC<ShapeProps> = ({
  width,
  height,
  color = '#1a1f36',
}) => {
  const cx = width / 2;
  const cy = height / 2;
  const r = Math.min(width, height) * 0.4;
  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <Circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth={2} />
      <Circle cx={cx} cy={cy} r={r * 0.5} fill={color} />
    </Svg>
  );
};

// ─── Fork/Join ─────────────────────────────────────────────────────────────

export const ForkJoinShape: React.FC<ShapeProps> = ({
  width,
  height,
  color = '#1a1f36',
}) => {
  const cy = height / 2;
  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <Rect x={4} y={cy - 8} width={width - 8} height={16} fill={color} rx={2} />
    </Svg>
  );
};

// ─── Lifeline ──────────────────────────────────────────────────────────────

export const LifelineShape: React.FC<ShapeProps> = ({
  width,
  height,
  color = '#1a1f36',
  fillColor = '#ffffff',
  strokeWidth = 2,
}) => {
  const cx = width / 2;
  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <Rect
        x={width * 0.15}
        y={4}
        width={width * 0.7}
        height={height * 0.2}
        fill={fillColor}
        stroke={color}
        strokeWidth={strokeWidth}
        rx={2}
      />
      <Line
        x1={cx}
        y1={height * 0.2 + 4}
        x2={cx}
        y2={height - 4}
        stroke={color}
        strokeWidth={1.5}
        strokeDasharray="4,3"
      />
    </Svg>
  );
};

// ─── Activation Box ────────────────────────────────────────────────────────

export const ActivationShape: React.FC<ShapeProps> = ({
  width,
  height,
  color = '#1a1f36',
  fillColor = '#ffffff',
  strokeWidth = 2,
}) => {
  const cx = width / 2;
  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <Line
        x1={cx}
        y1={2}
        x2={cx}
        y2={height - 2}
        stroke={color}
        strokeWidth={1}
        strokeDasharray="3,3"
      />
      <Rect
        x={cx - 6}
        y={height * 0.25}
        width={12}
        height={height * 0.5}
        fill={fillColor}
        stroke={color}
        strokeWidth={strokeWidth}
      />
    </Svg>
  );
};

// ─── Class Box ─────────────────────────────────────────────────────────────

export const ClassBoxShape: React.FC<ShapeProps> = ({
  width,
  height,
  color = '#1a1f36',
  fillColor = '#ffffff',
  strokeWidth = 2,
}) => {
  const h1 = height * 0.3;
  const h2 = height * 0.6;
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
      <Line x1={4} y1={h1 + 4} x2={width - 4} y2={h1 + 4} stroke={color} strokeWidth={1.5} />
      <Line x1={4} y1={h2 + 4} x2={width - 4} y2={h2 + 4} stroke={color} strokeWidth={1.5} />
      {/* Class name text placeholder */}
      <Line x1={width * 0.3} y1={h1 * 0.5 + 4} x2={width * 0.7} y2={h1 * 0.5 + 4} stroke={color} strokeWidth={1} opacity={0.3} />
      <Line x1={width * 0.2} y1={h1 * 0.5 + 8} x2={width * 0.6} y2={h1 * 0.5 + 8} stroke={color} strokeWidth={1} opacity={0.2} />
    </Svg>
  );
};

// ─── Interface ─────────────────────────────────────────────────────────────

export const InterfaceShape: React.FC<ShapeProps> = ({
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
    <Rect
      x={8}
      y={8}
      width={width - 16}
      height={height - 16}
      fill="none"
      stroke={color}
      strokeWidth={1}
      strokeDasharray="2,2"
      rx={1}
    />
    {/* <<interface>> text placeholder */}
    <Line x1={width * 0.25} y1={height * 0.3} x2={width * 0.75} y2={height * 0.3} stroke={color} strokeWidth={1} opacity={0.3} />
  </Svg>
);

// ─── Abstract Class ────────────────────────────────────────────────────────

export const AbstractClassShape: React.FC<ShapeProps> = ({
  width,
  height,
  color = '#1a1f36',
  fillColor = '#ffffff',
  strokeWidth = 2,
}) => {
  const h1 = height * 0.3;
  const h2 = height * 0.6;
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
      <Line x1={4} y1={h1 + 4} x2={width - 4} y2={h1 + 4} stroke={color} strokeWidth={1.5} />
      <Line x1={4} y1={h2 + 4} x2={width - 4} y2={h2 + 4} stroke={color} strokeWidth={1.5} />
      {/* Italic text placeholder */}
      <Line x1={width * 0.3} y1={h1 * 0.5 + 4} x2={width * 0.7} y2={h1 * 0.5 + 4} stroke={color} strokeWidth={1} opacity={0.3} strokeDasharray="4,2" />
    </Svg>
  );
};