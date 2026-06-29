// components/shapes/shapes/BasicShapes.tsx
// Full file with all standard shapes + updated flowchart shapes

import React from 'react';
import { Svg, Rect, Ellipse, Polygon, Circle, Line, G, Path } from 'react-native-svg';

interface ShapeProps {
  width: number;
  height: number;
  color?: string;
  fillColor?: string;
  strokeWidth?: number;
}

// ─── Rectangle ───────────────────────────────────────────────────────────────

export const RectShape: React.FC<ShapeProps> = ({
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
  </Svg>
);

// ─── Rounded Rectangle ──────────────────────────────────────────────────────

export const RoundedRectShape: React.FC<ShapeProps> = ({
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
      rx={width * 0.15}
    />
  </Svg>
);

// ─── Circle ─────────────────────────────────────────────────────────────────

export const CircleShape: React.FC<ShapeProps> = ({
  width,
  height,
  color = '#1a1f36',
  fillColor = '#ffffff',
  strokeWidth = 2,
}) => {
  const cx = width / 2;
  const cy = height / 2;
  const r = Math.min(width, height) / 2 - 4;
  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <Circle
        cx={cx}
        cy={cy}
        r={r}
        fill={fillColor}
        stroke={color}
        strokeWidth={strokeWidth}
      />
    </Svg>
  );
};

// ─── Ellipse ────────────────────────────────────────────────────────────────

export const EllipseShape: React.FC<ShapeProps> = ({
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
        rx={width / 2 - 4}
        ry={height / 2 - 4}
        fill={fillColor}
        stroke={color}
        strokeWidth={strokeWidth}
      />
    </Svg>
  );
};

// ─── Diamond (Rhombus) ─────────────────────────────────────────────────────

export const DiamondShape: React.FC<ShapeProps> = ({
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
      <Polygon
        points={`${cx},4 ${width - 4},${cy} ${cx},${height - 4} 4,${cy}`}
        fill={fillColor}
        stroke={color}
        strokeWidth={strokeWidth}
      />
    </Svg>
  );
};

// ─── Triangle ──────────────────────────────────────────────────────────────

export const TriangleShape: React.FC<ShapeProps> = ({
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
        points={`${cx},4 ${width - 4},${height - 4} 4,${height - 4}`}
        fill={fillColor}
        stroke={color}
        strokeWidth={strokeWidth}
      />
    </Svg>
  );
};

// ─── Parallelogram ─────────────────────────────────────────────────────────

export const ParallelogramShape: React.FC<ShapeProps> = ({
  width,
  height,
  color = '#1a1f36',
  fillColor = '#ffffff',
  strokeWidth = 2,
}) => (
  <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
    <Polygon
      points={`${width * 0.2},4 ${width - 4},4 ${width * 0.8},${height - 4} 4,${height - 4}`}
      fill={fillColor}
      stroke={color}
      strokeWidth={strokeWidth}
    />
  </Svg>
);

// ─── Cylinder (Database) ──────────────────────────────────────────────────

export const CylinderShape: React.FC<ShapeProps> = ({
  width,
  height,
  color = '#1a1f36',
  fillColor = '#ffffff',
  strokeWidth = 2,
}) => {
  const cx = width / 2;
  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <Ellipse
        cx={cx}
        cy={height - 8}
        rx={width / 2 - 4}
        ry={6}
        fill={fillColor}
        stroke={color}
        strokeWidth={strokeWidth}
      />
      <Line x1={4} y1={8} x2={4} y2={height - 8} stroke={color} strokeWidth={strokeWidth} />
      <Line x1={width - 4} y1={8} x2={width - 4} y2={height - 8} stroke={color} strokeWidth={strokeWidth} />
      <Ellipse
        cx={cx}
        cy={8}
        rx={width / 2 - 4}
        ry={6}
        fill={fillColor}
        stroke={color}
        strokeWidth={strokeWidth}
      />
    </Svg>
  );
};

// ─── Document (with wavy bottom) ──────────────────────────────────────────

export const DocumentShape: React.FC<ShapeProps> = ({
  width,
  height,
  color = '#1a1f36',
  fillColor = '#ffffff',
  strokeWidth = 2,
}) => {
  const cx = width / 2;
  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <Path
        d={`M4,4 L${width - 4},4 L${width - 4},${height - 8} C${width * 0.75},${height - 18} ${width * 0.6},${height + 2} ${cx},${height - 8} C${width * 0.4},${height + 2} ${width * 0.25},${height - 18} 4,${height - 8} Z`}
        fill={fillColor}
        stroke={color}
        strokeWidth={strokeWidth}
      />
      <Rect
        x={10}
        y={10}
        width={width - 24}
        height={height - 20}
        fill="none"
        stroke={color}
        strokeWidth={1}
        opacity={0.3}
      />
    </Svg>
  );
};

// ─── Folder ─────────────────────────────────────────────────────────────────

export const FolderShape: React.FC<ShapeProps> = ({
  width,
  height,
  color = '#1a1f36',
  fillColor = '#fef9c3',
  strokeWidth = 2,
}) => {
  const tabWidth = width * 0.25;
  const tabHeight = height * 0.2;
  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <Path
        d={`M4,${tabHeight + 4} L${tabWidth + 4},${tabHeight + 4} L${tabWidth + 8},4 L${width - 4},4 L${width - 4},${height - 4} L4,${height - 4} Z`}
        fill={fillColor}
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
      />
    </Svg>
  );
};

// ─── Cloud ─────────────────────────────────────────────────────────────────

export const CloudShape: React.FC<ShapeProps> = ({
  width,
  height,
  color = '#1a1f36',
  fillColor = '#e0f2fe',
  strokeWidth = 2,
}) => {
  const cx = width / 2;
  const cy = height / 2;
  const r = Math.min(width, height) * 0.4;
  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <Path
        d={`M${cx - r * 0.6} ${height - 6} C${cx - r * 0.9} ${height - 6} ${cx - r} ${height - 10} ${cx - r} ${height - 16} 
           C${cx - r} ${height - 22} ${cx - r * 0.8} ${height - 26} ${cx - r * 0.5} ${height - 27} 
           C${cx - r * 0.6} ${height - 30} ${cx - r * 0.3} ${height - 34} ${cx} ${height - 34} 
           C${cx + r * 0.3} ${height - 34} ${cx + r * 0.5} ${height - 30} ${cx + r * 0.4} ${height - 27} 
           C${cx + r * 0.7} ${height - 26} ${cx + r * 0.9} ${height - 22} ${cx + r} ${height - 16} 
           C${cx + r} ${height - 10} ${cx + r * 0.8} ${height - 6} ${cx + r * 0.5} ${height - 6} Z`}
        fill={fillColor}
        stroke={color}
        strokeWidth={strokeWidth}
      />
    </Svg>
  );
};

// ─── Note (Standalone) ─────────────────────────────────────────────────────

export const NoteStandaloneShape: React.FC<ShapeProps> = ({
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

// ─── Actor ──────────────────────────────────────────────────────────────────

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

// ─── Connector/Arrow ───────────────────────────────────────────────────────

export const ConnectorArrowShape: React.FC<ShapeProps> = ({
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
        points={`${width - 8},${cy} ${width - 16},${cy - 5} ${width - 16},${cy + 5}`}
        fill={color}
      />
    </Svg>
  );
};

// ─── Rhombus (alias for Diamond) ──────────────────────────────────────────

export const RhombusShape: React.FC<ShapeProps> = DiamondShape;

// ─── Double Rectangle ──────────────────────────────────────────────────────

export const DoubleRectShape: React.FC<ShapeProps> = ({
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
      strokeWidth={1.5}
      rx={2}
    />
  </Svg>
);

// ─── Double Rhombus ─────────────────────────────────────────────────────────

export const DoubleRhombusShape: React.FC<ShapeProps> = ({
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
      <Polygon
        points={`${cx},4 ${width - 4},${cy} ${cx},${height - 4} 4,${cy}`}
        fill={fillColor}
        stroke={color}
        strokeWidth={strokeWidth}
      />
      <Polygon
        points={`${cx},8 ${width - 8},${cy} ${cx},${height - 8} 8,${cy}`}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
      />
    </Svg>
  );
};

// ─── Multi Oval ────────────────────────────────────────────────────────────

export const MultiOvalShape: React.FC<ShapeProps> = ({
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
        rx={width / 2 - 4}
        ry={height / 2 - 4}
        fill={fillColor}
        stroke={color}
        strokeWidth={strokeWidth}
      />
      <Ellipse
        cx={cx}
        cy={cy}
        rx={width / 2 - 8}
        ry={height / 2 - 8}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
      />
    </Svg>
  );
};

// ─── Line ──────────────────────────────────────────────────────────────────

export const LineShape: React.FC<ShapeProps> = ({
  width,
  height,
  color = '#1a1f36',
  strokeWidth = 2,
}) => (
  <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
    <Line
      x1={4}
      y1={height / 2}
      x2={width - 4}
      y2={height / 2}
      stroke={color}
      strokeWidth={strokeWidth}
    />
  </Svg>
);

// ─── Text Shape ─────────────────────────────────────────────────────────────

export const TextShape: React.FC<ShapeProps> = ({
  width,
  height,
  color = '#1a1f36',
}) => {
  const cx = width / 2;
  const cy = height / 2;
  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <Rect
        x={4}
        y={4}
        width={width - 8}
        height={height - 8}
        fill="none"
        stroke={color}
        strokeWidth={1}
        strokeDasharray="3,3"
        rx={2}
      />
    </Svg>
  );
};

// ─── Dashed Rectangle ──────────────────────────────────────────────────────

export const DashedRectShape: React.FC<ShapeProps> = ({
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
      strokeDasharray="6,4"
      rx={2}
    />
  </Svg>
);

// ─── Predefined Process ────────────────────────────────────────────────────

export const PredefinedShape: React.FC<ShapeProps> = ({
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
    <Line x1={10} y1={4} x2={10} y2={height - 4} stroke={color} strokeWidth={strokeWidth} />
    <Line x1={width - 10} y1={4} x2={width - 10} y2={height - 4} stroke={color} strokeWidth={strokeWidth} />
  </Svg>
);

// ─── FLOWCHART SHAPES ──────────────────────────────────────────────────────

// ─── Off-Page Connector (Pentagon pointing down) ──────────────────────────
export const PentagonShape: React.FC<ShapeProps> = ({
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
        points={`0,0 ${width},0 ${width},${height * 0.68} ${cx},${height} 0,${height * 0.68}`}
        fill={fillColor}
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
      />
    </Svg>
  );
};

// ─── Manual Input (Trapezoid) ──────────────────────────────────────────────
export const TrapezoidShape: React.FC<ShapeProps> = ({
  width,
  height,
  color = '#1a1f36',
  fillColor = '#ffffff',
  strokeWidth = 2,
}) => (
  <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
    <Polygon
      points={`0,${height * 0.25} ${width},0 ${width},${height} 0,${height}`}
      fill={fillColor}
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinejoin="round"
    />
  </Svg>
);

// ─── D-Shape (Delay - flat left, rounded right) ────────────────────────────
export const DShape: React.FC<ShapeProps> = ({
  width,
  height,
  color = '#1a1f36',
  fillColor = '#ffffff',
  strokeWidth = 2,
}) => (
  <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
    <Path
      d={`M0,0 L${width * 0.7},0 Q${width},${height * 0.5} ${width * 0.7},${height} L0,${height} Z`}
      fill={fillColor}
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinejoin="round"
    />
  </Svg>
);

// ─── Hexagon (Preparation) ──────────────────────────────────────────────────
export const HexagonShape: React.FC<ShapeProps> = ({
  width,
  height,
  color = '#1a1f36',
  fillColor = '#ffffff',
  strokeWidth = 2,
}) => {
  const cx = width / 2;
  const cy = height / 2;
  const hw = width / 2;
  const hh = height / 2;
  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <Polygon
        points={`${cx - hw},${cy} ${cx - hw * 0.5},${cy - hh} ${cx + hw * 0.5},${cy - hh} ${cx + hw},${cy} ${cx + hw * 0.5},${cy + hh} ${cx - hw * 0.5},${cy + hh}`}
        fill={fillColor}
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
      />
    </Svg>
  );
};

// ─── Display Symbol (curved sides) ─────────────────────────────────────────
export const DisplayShape: React.FC<ShapeProps> = ({
  width,
  height,
  color = '#1a1f36',
  fillColor = '#ffffff',
  strokeWidth = 2,
}) => (
  <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
    <Path
      d={`M${width * 0.15},0 L${width * 0.85},0 Q${width},0 ${width},${height * 0.25} L${width},${height * 0.75} Q${width},${height} ${width * 0.85},${height} L${width * 0.15},${height} Q0,${height * 0.5} ${width * 0.15},0 Z`}
      fill={fillColor}
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinejoin="round"
    />
  </Svg>
);

// ─── Annotation (open bracket with dashed connector) ──────────────────────
export const AnnotationShape: React.FC<ShapeProps> = ({
  width,
  height,
  color = '#1a1f36',
  strokeWidth = 2,
}) => {
  const cy = height / 2;
  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      {/* Open bracket */}
      <Path
        d={`M4,4 L10,4 L10,${height - 4} L4,${height - 4}`}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
      />
      {/* Dashed connector line */}
      <Line
        x1={10}
        y1={cy}
        x2={width - 4}
        y2={cy}
        stroke={color}
        strokeWidth={strokeWidth}
        strokeDasharray="4,4"
      />
    </Svg>
  );
};