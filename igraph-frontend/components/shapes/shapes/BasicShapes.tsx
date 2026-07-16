import React from 'react';
import { Svg, Rect, Ellipse, Polygon, Circle, Line, Path } from 'react-native-svg';

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
      x={2}
      y={2}
      width={width - 4}
      height={height - 4}
      fill={fillColor}
      stroke={color}
      strokeWidth={strokeWidth}
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
      x={2}
      y={2}
      width={width - 4}
      height={height - 4}
      fill={fillColor}
      stroke={color}
      strokeWidth={strokeWidth}
      rx={Math.min(width, height) * 0.15}
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
        rx={width / 2 - 1}
        ry={height / 2 - 1}
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
        points={`${cx},2 ${width - 2},${cy} ${cx},${height - 2} 2,${cy}`}
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
        points={`${cx},2 ${width - 2},${height - 2} 2,${height - 2}`}
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
}) => {
  const offset = width * 0.18;
  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <Polygon
        points={`${offset},2 ${width - 2},2 ${width - offset},${height - 2} 2,${height - 2}`}
        fill={fillColor}
        stroke={color}
        strokeWidth={strokeWidth}
      />
    </Svg>
  );
};

// ─── Cylinder (Database) ──────────────────────────────────────────────────
// Mirrors CylinderShapeCanvas: straight sides + bottom arc (fillAndStroke),
// an elliptical top cap drawn over it, then the bottom arc re-stroked.

export const CylinderShape: React.FC<ShapeProps> = ({
  width,
  height,
  color = '#1a1f36',
  fillColor = '#ffffff',
  strokeWidth = 2,
}) => {
  const rx = (width - 4) / 2;
  const ry = 6;
  const cx = width / 2;
  const topCy = ry + 2;
  const botCy = height - ry - 2;
  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <Path
        d={`M2,${topCy} L2,${botCy} A${rx},${ry} 0 0,0 ${width - 2},${botCy} L${width - 2},${topCy} Z`}
        fill={fillColor}
        stroke={color}
        strokeWidth={strokeWidth}
      />
      <Ellipse
        cx={cx}
        cy={topCy}
        rx={rx}
        ry={ry}
        fill={fillColor}
        stroke={color}
        strokeWidth={strokeWidth}
      />
      <Path
        d={`M2,${botCy} A${rx},${ry} 0 0,0 ${width - 2},${botCy}`}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
      />
    </Svg>
  );
};

// ─── Document (paper shape with wavy bottom and text lines) ────────────────
// Mirrors DocumentShapeCanvas's two-bump curveTo wave exactly.

export const DocumentShape: React.FC<ShapeProps> = ({
  width,
  height,
  color = '#1a1f36',
  fillColor = '#ffffff',
  strokeWidth = 2,
}) => {
  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <Path
        d={`M0,0 L${width},0 L${width},${height * 0.8}
           C${width * 0.75},${height * 0.7} ${width * 0.6},${height * 0.9} ${width * 0.5},${height * 0.8}
           C${width * 0.4},${height * 0.7} ${width * 0.2},${height * 0.9} 0,${height * 0.8} Z`}
        fill={fillColor}
        stroke={color}
        strokeWidth={strokeWidth}
      />
      <Line
        x1={10}
        y1={12}
        x2={width - 10}
        y2={12}
        stroke={color}
        strokeWidth={1}
        opacity={0.3}
      />
      <Line
        x1={10}
        y1={20}
        x2={width - 10}
        y2={20}
        stroke={color}
        strokeWidth={1}
        opacity={0.3}
      />
    </Svg>
  );
};

// ─── Folder ─────────────────────────────────────────────────────────────────
// Canvas always fills #fef9c3 regardless of style, so the preview does too.

export const FolderShape: React.FC<ShapeProps> = ({
  width,
  height,
  color = '#1a1f36',
  strokeWidth = 2,
}) => {
  const tabWidth = width * 0.25;
  const tabHeight = height * 0.2;
  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <Path
        d={`M2,${tabHeight + 2} L${tabWidth + 2},${tabHeight + 2} L${tabWidth + 6},2 L${width - 2},2 L${width - 2},${height - 2} L2,${height - 2} Z`}
        fill="#fef9c3"
        stroke={color}
        strokeWidth={strokeWidth}
      />
    </Svg>
  );
};

// ─── Cloud ─────────────────────────────────────────────────────────────────
// Canvas always fills #e0f2fe regardless of style, so the preview does too.

export const CloudShape: React.FC<ShapeProps> = ({
  width,
  height,
  color = '#1a1f36',
  strokeWidth = 2,
}) => {
  const cx = width / 2;
  const r = Math.min(width, height) * 0.4;
  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <Path
        d={`M${cx - r * 0.6},${height - 6}
           A${r * 0.9},${r * 0.5} 0 0,1 ${cx - r},${height - 16}
           A${r * 0.8},${r * 0.4} 0 0,1 ${cx - r * 0.5},${height - 27}
           A${r * 0.6},${r * 0.3} 0 0,1 ${cx},${height - 34}
           A${r * 0.6},${r * 0.3} 0 0,1 ${cx + r * 0.4},${height - 27}
           A${r * 0.7},${r * 0.4} 0 0,1 ${cx + r},${height - 16}
           A${r * 0.8},${r * 0.4} 0 0,1 ${cx + r * 0.5},${height - 6} Z`}
        fill="#e0f2fe"
        stroke={color}
        strokeWidth={strokeWidth}
      />
    </Svg>
  );
};

// ─── Note (Standalone) ─────────────────────────────────────────────────────
// Canvas always fills #fef9c3 regardless of style, so the preview does too.

export const NoteStandaloneShape: React.FC<ShapeProps> = ({
  width,
  height,
  color = '#1a1f36',
  strokeWidth = 2,
}) => {
  const fold = Math.min(width, height) * 0.2;
  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <Path
        d={`M2,2 L${width - fold - 2},2 L${width - 2},${fold + 2} L${width - 2},${height - 2} L2,${height - 2} Z`}
        fill="#fef9c3"
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

// ─── Actor ──────────────────────────────────────────────────────────────────
// Mirrors ActorShapeCanvas's proportions (head radius scales with size,
// instead of a fixed pixel radius).

export const ActorShape: React.FC<ShapeProps> = ({
  width,
  height,
  color = '#1a1f36',
  strokeWidth = 2,
}) => {
  const cx = width / 2;
  const headR = Math.min(width, height) * 0.12;
  const headCY = headR + 4;
  const bodyTop = headCY + headR;
  const bodyBot = height * 0.72;
  const armY = bodyTop + (bodyBot - bodyTop) * 0.3;
  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <Circle cx={cx} cy={headCY} r={headR} fill="none" stroke={color} strokeWidth={strokeWidth} />
      <Line x1={cx} y1={bodyTop} x2={cx} y2={bodyBot} stroke={color} strokeWidth={strokeWidth} />
      <Line x1={width * 0.2} y1={armY} x2={width * 0.8} y2={armY} stroke={color} strokeWidth={strokeWidth} />
      <Line x1={cx} y1={bodyBot} x2={width * 0.2} y2={height - 4} stroke={color} strokeWidth={strokeWidth} />
      <Line x1={cx} y1={bodyBot} x2={width * 0.8} y2={height - 4} stroke={color} strokeWidth={strokeWidth} />
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
      <Line x1={2} y1={cy} x2={width - 10} y2={cy} stroke={color} strokeWidth={strokeWidth} />
      <Polygon
        points={`${width - 10},${cy - 5} ${width - 2},${cy} ${width - 10},${cy + 5}`}
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
      x={2}
      y={2}
      width={width - 4}
      height={height - 4}
      fill={fillColor}
      stroke={color}
      strokeWidth={strokeWidth}
    />
    <Rect
      x={6}
      y={6}
      width={width - 12}
      height={height - 12}
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
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
        points={`${cx},2 ${width - 2},${cy} ${cx},${height - 2} 2,${cy}`}
        fill={fillColor}
        stroke={color}
        strokeWidth={strokeWidth}
      />
      <Polygon
        points={`${cx},6 ${width - 6},${cy} ${cx},${height - 6} 6,${cy}`}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
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
        rx={width / 2 - 2}
        ry={height / 2 - 2}
        fill={fillColor}
        stroke={color}
        strokeWidth={strokeWidth}
      />
      <Ellipse
        cx={cx}
        cy={cy}
        rx={width / 2 - 6}
        ry={height / 2 - 6}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
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
      x1={2}
      y1={height / 2}
      x2={width - 2}
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
  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <Rect
        x={2}
        y={2}
        width={width - 4}
        height={height - 4}
        fill="none"
        stroke={color}
        strokeWidth={1}
        strokeDasharray="3,3"
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
      x={2}
      y={2}
      width={width - 4}
      height={height - 4}
      fill={fillColor}
      stroke={color}
      strokeWidth={strokeWidth}
      strokeDasharray="6,4"
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
}) => {
  const m = 8;
  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <Rect
        x={2}
        y={2}
        width={width - 4}
        height={height - 4}
        fill={fillColor}
        stroke={color}
        strokeWidth={strokeWidth}
      />
      <Line x1={m} y1={2} x2={m} y2={height - 2} stroke={color} strokeWidth={strokeWidth} />
      <Line x1={width - m} y1={2} x2={width - m} y2={height - 2} stroke={color} strokeWidth={strokeWidth} />
    </Svg>
  );
};

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
