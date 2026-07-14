import React from 'react';
import { Svg, Line, Polygon, G, Path, Rect} from 'react-native-svg';

interface ShapeProps {
  width: number;
  height: number;
  color?: string;
  strokeWidth?: number;
}

const defaultProps = {
  color: '#1a1f36',
  strokeWidth: 2,
};

// ─── Basic Arrow ───────────────────────────────────────────────────────────

export const ArrowShape: React.FC<ShapeProps> = ({
  width,
  height,
  color = '#1a1f36',
  strokeWidth = 2,
}) => {
  const cy = height / 2;
  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <Line x1={4} y1={cy} x2={width - 8} y2={cy} stroke={color} strokeWidth={strokeWidth} />
      <Polygon points={`${width - 8},${cy} ${width - 16},${cy - 5} ${width - 16},${cy + 5}`} fill={color} />
    </Svg>
  );
};

// ─── Arrow Down ────────────────────────────────────────────────────────────

export const ArrowDownShape: React.FC<ShapeProps> = ({
  width,
  height,
  color = '#1a1f36',
  strokeWidth = 2,
}) => {
  const cx = width / 2;
  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <Line x1={cx} y1={4} x2={cx} y2={height - 8} stroke={color} strokeWidth={strokeWidth} />
      <Polygon points={`${cx},${height - 8} ${cx - 5},${height - 16} ${cx + 5},${height - 16}`} fill={color} />
    </Svg>
  );
};

// ─── Arrow Right ───────────────────────────────────────────────────────────

export const ArrowRightShape: React.FC<ShapeProps> = ({
  width,
  height,
  color = '#1a1f36',
  strokeWidth = 2,
}) => {
  const cy = height / 2;
  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <Line x1={4} y1={cy} x2={width - 8} y2={cy} stroke={color} strokeWidth={strokeWidth} />
      <Polygon points={`${width - 8},${cy} ${width - 16},${cy - 6} ${width - 16},${cy + 6}`} fill={color} />
    </Svg>
  );
};

// ─── Filled Arrow ──────────────────────────────────────────────────────────

export const FilledArrowShape: React.FC<ShapeProps> = ({
  width,
  height,
  color = '#1a1f36',
  strokeWidth = 2,
}) => {
  const cy = height / 2;
  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <Line x1={4} y1={cy} x2={width - 8} y2={cy} stroke={color} strokeWidth={strokeWidth} />
      <Polygon points={`${width - 8},${cy} ${width - 16},${cy - 6} ${width - 16},${cy + 6}`} fill={color} />
    </Svg>
  );
};

// ─── Open Arrow ────────────────────────────────────────────────────────────

export const OpenArrowShape: React.FC<ShapeProps> = ({
  width,
  height,
  color = '#1a1f36',
  strokeWidth = 2,
}) => {
  const cy = height / 2;
  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <Line x1={4} y1={cy} x2={width - 8} y2={cy} stroke={color} strokeWidth={strokeWidth} />
      <Polygon
        points={`${width - 8},${cy} ${width - 16},${cy - 6} ${width - 16},${cy + 6}`}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
      />
    </Svg>
  );
};

// ─── Dashed Arrow ──────────────────────────────────────────────────────────

export const DashedArrowShape: React.FC<ShapeProps> = ({
  width,
  height,
  color = '#1a1f36',
  strokeWidth = 2,
}) => {
  const cy = height / 2;
  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <Line
        x1={4}
        y1={cy}
        x2={width - 8}
        y2={cy}
        stroke={color}
        strokeWidth={strokeWidth}
        strokeDasharray="4,4"
      />
      <Polygon points={`${width - 8},${cy} ${width - 16},${cy - 5} ${width - 16},${cy + 5}`} fill={color} />
    </Svg>
  );
};

// ─── Dashed Arrow Back ─────────────────────────────────────────────────────

export const DashedArrowBackShape: React.FC<ShapeProps> = ({
  width,
  height,
  color = '#1a1f36',
  strokeWidth = 2,
}) => {
  const cy = height / 2;
  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <Line
        x1={4}
        y1={cy}
        x2={width - 8}
        y2={cy}
        stroke={color}
        strokeWidth={strokeWidth}
        strokeDasharray="4,4"
      />
      <Polygon points={`4,${cy} ${12},${cy - 5} ${12},${cy + 5}`} fill={color} />
    </Svg>
  );
};

// ─── Triangle Arrow (Inheritance) ─────────────────────────────────────────

export const TriangleArrowShape: React.FC<ShapeProps> = ({
  width,
  height,
  color = '#1a1f36',
  strokeWidth = 2,
}) => {
  const cy = height / 2;
  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <Line x1={4} y1={cy} x2={width - 8} y2={cy} stroke={color} strokeWidth={strokeWidth} />
      <Polygon
        points={`${width - 8},${cy} ${width - 18},${cy - 8} ${width - 18},${cy + 8}`}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
      />
    </Svg>
  );
};

// ─── Loop Arrow (Self-Call) ───────────────────────────────────────────────

export const LoopArrowShape: React.FC<ShapeProps> = ({
  width,
  height,
  color = '#1a1f36',
  strokeWidth = 2,
}) => {
  const cx = width / 2;
  const cy = height / 2;
  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <Path
        d={`M${cx - 4},${cy + 4} C${cx - 4},${cy + 4} ${cx - width * 0.4},${cy + 4} ${cx - width * 0.4},${cy - 4} C${cx - width * 0.4},${cy - 12} ${cx + width * 0.4},${cy - 12} ${cx + width * 0.4},${cy - 4} C${cx + width * 0.4},${cy + 4} ${cx + 4},${cy + 4} ${cx + 4},${cy + 4}`}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
      />
      <Polygon points={`${cx + 4},${cy + 4} ${cx - 2},${cy + 10} ${cx - 2},${cy - 2}`} fill={color} />
    </Svg>
  );
};

// ─── Create Arrow ──────────────────────────────────────────────────────────

export const CreateArrowShape: React.FC<ShapeProps> = ({
  width,
  height,
  color = '#1a1f36',
  strokeWidth = 2,
}) => {
  const cy = height / 2;
  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <Line x1={4} y1={cy} x2={width - 8} y2={cy} stroke={color} strokeWidth={strokeWidth} />
      <Polygon points={`${width - 8},${cy} ${width - 16},${cy - 5} ${width - 16},${cy + 5}`} fill={color} />
      {/* <<create>> marker */}
      <Line x1={width * 0.3} y1={cy - 8} x2={width * 0.7} y2={cy - 8} stroke={color} strokeWidth={1} opacity={0.3} />
    </Svg>
  );
};

// ─── Destruction ───────────────────────────────────────────────────────────

export const DestructionShape: React.FC<ShapeProps> = ({
  width,
  height,
  color = '#1a1f36',
  strokeWidth = 2,
}) => {
  const cx = width / 2;
  const cy = height / 2;
  const s = Math.min(width, height) * 0.3;
  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <Line x1={cx - s} y1={cy - s} x2={cx + s} y2={cy + s} stroke={color} strokeWidth={strokeWidth} />
      <Line x1={cx + s} y1={cy - s} x2={cx - s} y2={cy + s} stroke={color} strokeWidth={strokeWidth} />
    </Svg>
  );
};

// ─── Aggregation ───────────────────────────────────────────────────────────

export const AggregationShape: React.FC<ShapeProps> = ({
  width,
  height,
  color = '#1a1f36',
  strokeWidth = 2,
}) => {
  const cy = height / 2;
  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <Polygon
        points={`4,${cy} ${14},${cy - 8} ${24},${cy} ${14},${cy + 8}`}
        fill="#ffffff"
        stroke={color}
        strokeWidth={strokeWidth}
      />
      <Line x1={24} y1={cy} x2={width - 4} y2={cy} stroke={color} strokeWidth={strokeWidth} />
    </Svg>
  );
};

// ─── Composition ───────────────────────────────────────────────────────────

export const CompositionShape: React.FC<ShapeProps> = ({
  width,
  height,
  color = '#1a1f36',
  strokeWidth = 2,
}) => {
  const cy = height / 2;
  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <Polygon
        points={`4,${cy} ${14},${cy - 8} ${24},${cy} ${14},${cy + 8}`}
        fill={color}
        stroke={color}
        strokeWidth={strokeWidth}
      />
      <Line x1={24} y1={cy} x2={width - 4} y2={cy} stroke={color} strokeWidth={strokeWidth} />
    </Svg>
  );
};

// ─── Multiplicity ──────────────────────────────────────────────────────────

export const MultiplicityShape: React.FC<ShapeProps> = ({
  width,
  height,
  color = '#1a1f36',
  strokeWidth = 2,
}) => {
  const cy = height / 2;
  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <Rect x={4} y={cy - 6} width={width - 8} height={12} fill="none" stroke={color} strokeWidth={strokeWidth} rx={2} />
    </Svg>
  );
};

// ─── Diagonal Arrow (Fishbone) ────────────────────────────────────────────

export const ArrowDiagShape: React.FC<ShapeProps> = ({
  width,
  height,
  color = '#1a1f36',
  strokeWidth = 2,
}) => {
  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <Line x1={4} y1={height - 4} x2={width - 4} y2={4} stroke={color} strokeWidth={strokeWidth} />
      <Polygon points={`${width - 4},4 ${width - 12},4 ${width - 8},12`} fill={color} />
    </Svg>
  );
};

// ─── Small Arrow ───────────────────────────────────────────────────────────

export const ArrowSmallShape: React.FC<ShapeProps> = ({
  width,
  height,
  color = '#1a1f36',
  strokeWidth = 2,
}) => {
  const cy = height / 2;
  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <Line x1={4} y1={cy} x2={width - 6} y2={cy} stroke={color} strokeWidth={1.5} />
      <Polygon points={`${width - 6},${cy} ${width - 12},${cy - 4} ${width - 12},${cy + 4}`} fill={color} />
    </Svg>
  );
};