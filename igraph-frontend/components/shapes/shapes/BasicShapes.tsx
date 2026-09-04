
import React from 'react';
import {
  Svg,
  Rect,
  Ellipse,
  Polygon,
  Circle,
  Line,
  Path,
  Text as SvgText,
} from 'react-native-svg';

interface ShapeProps {
  width: number;
  height: number;
  color?: string;
  fillColor?: string;
  strokeWidth?: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// RECTANGLE
// ─────────────────────────────────────────────────────────────────────────────

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
      width={Math.max(0, width - 4)}
      height={Math.max(0, height - 4)}
      fill={fillColor}
      stroke={color}
      strokeWidth={strokeWidth}
    />
  </Svg>
);

// ─────────────────────────────────────────────────────────────────────────────
// ROUNDED RECTANGLE
// ─────────────────────────────────────────────────────────────────────────────

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
      width={Math.max(0, width - 4)}
      height={Math.max(0, height - 4)}
      fill={fillColor}
      stroke={color}
      strokeWidth={strokeWidth}
      rx={Math.min(width, height) * 0.15}
    />
  </Svg>
);

// ─────────────────────────────────────────────────────────────────────────────
// CIRCLE
// ─────────────────────────────────────────────────────────────────────────────

export const CircleShape: React.FC<ShapeProps> = ({
  width,
  height,
  color = '#1a1f36',
  fillColor = '#ffffff',
  strokeWidth = 2,
}) => {
  const cx = width / 2;
  const cy = height / 2;
  const r = Math.max(0, Math.min(width, height) / 2 - 4);

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

// ─────────────────────────────────────────────────────────────────────────────
// ELLIPSE
// ─────────────────────────────────────────────────────────────────────────────

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
        rx={Math.max(0, width / 2 - 1)}
        ry={Math.max(0, height / 2 - 1)}
        fill={fillColor}
        stroke={color}
        strokeWidth={strokeWidth}
      />
    </Svg>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// DIAMOND / RHOMBUS
// ─────────────────────────────────────────────────────────────────────────────

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

// ─────────────────────────────────────────────────────────────────────────────
// TRIANGLE
// ─────────────────────────────────────────────────────────────────────────────

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

// ─────────────────────────────────────────────────────────────────────────────
// PARALLELOGRAM
// ─────────────────────────────────────────────────────────────────────────────

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

// ─────────────────────────────────────────────────────────────────────────────
// CYLINDER / DATABASE
// ─────────────────────────────────────────────────────────────────────────────

export const CylinderShape: React.FC<ShapeProps> = ({
  width,
  height,
  color = '#1a1f36',
  fillColor = '#ffffff',
  strokeWidth = 2,
}) => {
  const rx = Math.max(1, (width - 4) / 2);
  const ry = Math.min(6, height * 0.22);

  const cx = width / 2;
  const topCy = ry + 2;
  const botCy = height - ry - 2;

  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <Path
        d={`
          M2,${topCy}
          L2,${botCy}
          A${rx},${ry} 0 0,0 ${width - 2},${botCy}
          L${width - 2},${topCy}
          Z
        `}
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

// ─────────────────────────────────────────────────────────────────────────────
// DOCUMENT
// ─────────────────────────────────────────────────────────────────────────────

export const DocumentShape: React.FC<ShapeProps> = ({
  width,
  height,
  color = '#1a1f36',
  fillColor = '#ffffff',
  strokeWidth = 2,
}) => (
  <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
    <Path
      d={`
        M0,0
        L${width},0
        L${width},${height * 0.8}
        C${width * 0.75},${height * 0.7}
         ${width * 0.6},${height * 0.9}
         ${width * 0.5},${height * 0.8}
        C${width * 0.4},${height * 0.7}
         ${width * 0.2},${height * 0.9}
         0,${height * 0.8}
        Z
      `}
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

// ─────────────────────────────────────────────────────────────────────────────
// FOLDER
// ─────────────────────────────────────────────────────────────────────────────

export const FolderShape: React.FC<ShapeProps> = ({
  width,
  height,
  color = '#1a1f36',
  fillColor = '#ffffff',
  strokeWidth = 2,
}) => {
  const tabWidth = width * 0.25;
  const tabHeight = height * 0.2;

  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <Path
        d={`
          M2,${tabHeight + 2}
          L${tabWidth + 2},${tabHeight + 2}
          L${tabWidth + 6},2
          L${width - 2},2
          L${width - 2},${height - 2}
          L2,${height - 2}
          Z
        `}
        fill={fillColor}
        stroke={color}
        strokeWidth={strokeWidth}
      />
    </Svg>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// CLOUD
// ─────────────────────────────────────────────────────────────────────────────

export const CloudShape: React.FC<ShapeProps> = ({
  width,
  height,
  color = '#1a1f36',
  fillColor = '#ffffff',
  strokeWidth = 2,
}) => {
  const sx = width / 24;
  const sy = height / 24;

  const p0x = 7 * sx;
  const p0y = 18 * sy;

  const p1x = 7.58 * sx;
  const p1y = 10.04 * sy;

  const p2x = 18.3 * sx;
  const p2y = 9.2 * sy;

  const p3x = 18 * sx;
  const p3y = 18 * sy;

  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <Path
        d={`
          M${p0x},${p0y}
          A${4 * sx},${4 * sy} 0 1,1 ${p1x},${p1y}
          A${5.5 * sx},${5.5 * sy} 0 0,1 ${p2x},${p2y}
          A${3.8 * sx},${3.8 * sy} 0 1,1 ${p3x},${p3y}
          H${p0x}
          Z
        `}
        fill={fillColor}
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// NOTE
// ─────────────────────────────────────────────────────────────────────────────

export const NoteStandaloneShape: React.FC<ShapeProps> = ({
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
        d={`
          M2,2
          L${width - fold - 2},2
          L${width - 2},${fold + 2}
          L${width - 2},${height - 2}
          L2,${height - 2}
          Z
        `}
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

// ─────────────────────────────────────────────────────────────────────────────
// ACTOR
// ─────────────────────────────────────────────────────────────────────────────

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
      <Circle
        cx={cx}
        cy={headCY}
        r={headR}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
      />

      <Line
        x1={cx}
        y1={bodyTop}
        x2={cx}
        y2={bodyBot}
        stroke={color}
        strokeWidth={strokeWidth}
      />

      <Line
        x1={width * 0.2}
        y1={armY}
        x2={width * 0.8}
        y2={armY}
        stroke={color}
        strokeWidth={strokeWidth}
      />

      <Line
        x1={cx}
        y1={bodyBot}
        x2={width * 0.2}
        y2={height - 4}
        stroke={color}
        strokeWidth={strokeWidth}
      />

      <Line
        x1={cx}
        y1={bodyBot}
        x2={width * 0.8}
        y2={height - 4}
        stroke={color}
        strokeWidth={strokeWidth}
      />
    </Svg>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// CONNECTOR / ARROW
// ─────────────────────────────────────────────────────────────────────────────

export const ConnectorArrowShape: React.FC<ShapeProps> = ({
  width,
  height,
  color = '#1a1f36',
  strokeWidth = 2,
}) => {
  const cy = height / 2;

  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <Line
        x1={2}
        y1={cy}
        x2={width - 10}
        y2={cy}
        stroke={color}
        strokeWidth={strokeWidth}
      />

      <Polygon
        points={`
          ${width - 10},${cy - 5}
          ${width - 2},${cy}
          ${width - 10},${cy + 5}
        `}
        fill={color}
      />
    </Svg>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// RHOMBUS ALIAS
// ─────────────────────────────────────────────────────────────────────────────

export const RhombusShape: React.FC<ShapeProps> = DiamondShape;

// ─────────────────────────────────────────────────────────────────────────────
// DOUBLE RECTANGLE
// ─────────────────────────────────────────────────────────────────────────────

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
      width={Math.max(0, width - 4)}
      height={Math.max(0, height - 4)}
      fill={fillColor}
      stroke={color}
      strokeWidth={strokeWidth}
    />

    <Rect
      x={6}
      y={6}
      width={Math.max(0, width - 12)}
      height={Math.max(0, height - 12)}
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
    />
  </Svg>
);

// ─────────────────────────────────────────────────────────────────────────────
// DOUBLE RHOMBUS
// ─────────────────────────────────────────────────────────────────────────────

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

// ─────────────────────────────────────────────────────────────────────────────
// MULTI OVAL
// ─────────────────────────────────────────────────────────────────────────────

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
        rx={Math.max(0, width / 2 - 2)}
        ry={Math.max(0, height / 2 - 2)}
        fill={fillColor}
        stroke={color}
        strokeWidth={strokeWidth}
      />

      <Ellipse
        cx={cx}
        cy={cy}
        rx={Math.max(0, width / 2 - 6)}
        ry={Math.max(0, height / 2 - 6)}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
      />
    </Svg>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// LINE
// ─────────────────────────────────────────────────────────────────────────────

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

// ─────────────────────────────────────────────────────────────────────────────
// TEXT
// ─────────────────────────────────────────────────────────────────────────────
//
// This is the visual icon used by:
// Standard → Text
//
// IMPORTANT:
// This component only controls the ICON shown in the shape panel.
// It does NOT create the text cell on the canvas.
// The actual canvas text creation is handled separately in DiagramCanvas/
// MaxGraph event handling.
//

export const TextShape: React.FC<ShapeProps> = ({
  width,
  height,
  color = '#1a1f36',
}) => {
  const fontSize = Math.max(10, Math.min(width, height) * 0.5);

  const cx = width / 2;
  const cy = height / 2;

  return (
    <Svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
    >
      <Rect
        x={2}
        y={2}
        width={Math.max(0, width - 4)}
        height={Math.max(0, height - 4)}
        fill="none"
        stroke={color}
        strokeWidth={1}
        strokeDasharray="3,3"
        rx={3}
      />

      <SvgText
        x={cx}
        y={cy + fontSize * 0.35}
        fontSize={fontSize}
        fill={color}
        textAnchor="middle"
        fontWeight="bold"
      >
        T
      </SvgText>
    </Svg>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// DASHED RECTANGLE
// ─────────────────────────────────────────────────────────────────────────────

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
      width={Math.max(0, width - 4)}
      height={Math.max(0, height - 4)}
      fill={fillColor}
      stroke={color}
      strokeWidth={strokeWidth}
      strokeDasharray="6,4"
    />
  </Svg>
);

// ─────────────────────────────────────────────────────────────────────────────
// PREDEFINED PROCESS
// ─────────────────────────────────────────────────────────────────────────────

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
        width={Math.max(0, width - 4)}
        height={Math.max(0, height - 4)}
        fill={fillColor}
        stroke={color}
        strokeWidth={strokeWidth}
      />

      <Line
        x1={m}
        y1={2}
        x2={m}
        y2={height - 2}
        stroke={color}
        strokeWidth={strokeWidth}
      />

      <Line
        x1={width - m}
        y1={2}
        x2={width - m}
        y2={height - 2}
        stroke={color}
        strokeWidth={strokeWidth}
      />
    </Svg>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// FLOWCHART — OFF-PAGE CONNECTOR
// ─────────────────────────────────────────────────────────────────────────────

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
        points={`
          0,0
          ${width},0
          ${width},${height * 0.68}
          ${cx},${height}
          0,${height * 0.68}
        `}
        fill={fillColor}
        stroke={color}
        strokeWidth={strokeWidth}
      />
    </Svg>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// FLOWCHART — MERGE / JUNCTION
// ─────────────────────────────────────────────────────────────────────────────

export const MergeJunctionShape: React.FC<ShapeProps> = ({
  width,
  height,
  color = '#1a1f36',
  fillColor = '#ffffff',
  strokeWidth = 2,
}) => {
  const size = Math.min(width, height);

  const ox = (width - size) / 2;
  const oy = (height - size) / 2;

  const cx = width / 2;
  const cy = height / 2;

  const r = Math.max(0, size / 2 - 4);

  const inset = ox + size * 0.28;
  const insetY = oy + size * 0.28;

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

      <Line
        x1={inset}
        y1={insetY}
        x2={width - inset}
        y2={height - insetY}
        stroke={color}
        strokeWidth={strokeWidth}
      />

      <Line
        x1={width - inset}
        y1={insetY}
        x2={inset}
        y2={height - insetY}
        stroke={color}
        strokeWidth={strokeWidth}
      />
    </Svg>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// FLOWCHART — MANUAL INPUT
// ─────────────────────────────────────────────────────────────────────────────

export const TrapezoidShape: React.FC<ShapeProps> = ({
  width,
  height,
  color = '#1a1f36',
  fillColor = '#ffffff',
  strokeWidth = 2,
}) => (
  <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
    <Polygon
      points={`
        0,${height * 0.25}
        ${width},0
        ${width},${height}
        0,${height}
      `}
      fill={fillColor}
      stroke={color}
      strokeWidth={strokeWidth}
    />
  </Svg>
);

// ─────────────────────────────────────────────────────────────────────────────
// FLOWCHART — DELAY
// ─────────────────────────────────────────────────────────────────────────────

export const DShape: React.FC<ShapeProps> = ({
  width,
  height,
  color = '#1a1f36',
  fillColor = '#ffffff',
  strokeWidth = 2,
}) => (
  <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
    <Path
      d={`
        M0,0
        L${width * 0.7},0
        Q${width},${height * 0.5} ${width * 0.7},${height}
        L0,${height}
        Z
      `}
      fill={fillColor}
      stroke={color}
      strokeWidth={strokeWidth}
    />
  </Svg>
);

// ─────────────────────────────────────────────────────────────────────────────
// FLOWCHART — HEXAGON / PREPARATION
// ─────────────────────────────────────────────────────────────────────────────

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
        points={`
          ${cx - hw},${cy}
          ${cx - hw * 0.5},${cy - hh}
          ${cx + hw * 0.5},${cy - hh}
          ${cx + hw},${cy}
          ${cx + hw * 0.5},${cy + hh}
          ${cx - hw * 0.5},${cy + hh}
        `}
        fill={fillColor}
        stroke={color}
        strokeWidth={strokeWidth}
      />
    </Svg>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// FLOWCHART — DISPLAY
// ─────────────────────────────────────────────────────────────────────────────

export const DisplayShape: React.FC<ShapeProps> = ({
  width,
  height,
  color = '#1a1f36',
  fillColor = '#ffffff',
  strokeWidth = 2,
}) => (
  <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
    <Path
      d={`
        M${width * 0.15},0
        L${width * 0.85},0
        Q${width},0 ${width},${height * 0.25}
        L${width},${height * 0.75}
        Q${width},${height} ${width * 0.85},${height}
        L${width * 0.15},${height}
        Q0,${height * 0.5} ${width * 0.15},0
        Z
      `}
      fill={fillColor}
      stroke={color}
      strokeWidth={strokeWidth}
    />
  </Svg>
);

// ─────────────────────────────────────────────────────────────────────────────
// FLOWCHART — ANNOTATION
// ─────────────────────────────────────────────────────────────────────────────

export const AnnotationShape: React.FC<ShapeProps> = ({
  width,
  height,
  color = '#1a1f36',
  strokeWidth = 2,
}) => {
  const cy = height / 2;

  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <Path
        d={`
          M4,4
          L10,4
          L10,${height - 4}
          L4,${height - 4}
        `}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
      />

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