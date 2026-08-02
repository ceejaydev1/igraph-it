import React from 'react';
import { Svg, Rect, Ellipse, Polygon, Line, Path, Circle } from 'react-native-svg';

interface ShapeProps {
  width: number;
  height: number;
  color?: string;
  fillColor?: string;
  strokeWidth?: number;
}

// ─── 1. Initial Node ──────────────────────────────────────────────────────

export const UMLInitialNodeShape: React.FC<ShapeProps> = ({
  width,
  height,
  color = '#1a1f36',
}) => {
  const cx = width / 2;
  const cy = height / 2;
  const r = Math.min(width, height) / 2 - 2;
  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <Circle cx={cx} cy={cy} r={r} fill={color} />
    </Svg>
  );
};

// ─── 2. Action/Activity ──────────────────────────────────────────────────

export const UMLActivityShape: React.FC<ShapeProps> = ({
  width,
  height,
  color = '#1a1f36',
  fillColor = '#ffffff',
  strokeWidth = 2,
}) => {
  const r = Math.min(width, height) * 0.15;
  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <Rect x={2} y={2} width={width - 4} height={height - 4} fill={fillColor} stroke={color} strokeWidth={strokeWidth} rx={r} />
    </Svg>
  );
};

// ─── 3. Decision Node ─────────────────────────────────────────────────────

export const UMLDecisionShape: React.FC<ShapeProps> = ({
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

// Small perpendicular arrow stubs that make the Fork/Join bar read as
// directional at a glance, matching the reference notation chart — one per
// fraction in `inFracs` entering the top edge, one per fraction in
// `outFracs` leaving the bottom, both positioned as a fraction of the bar's
// own width so they stay evenly spread whatever width this preview renders
// at (the palette icon and the canvas shape use very different sizes for
// the same component — see maxgraph-custom-shapes.ts's UMLForkShapeCanvas
// for that version, which this mirrors). `margin` is the vertical room
// available above/below the bar to draw into.
function forkJoinStubs(
  width: number, barTop: number, barBottom: number, margin: number,
  inFracs: number[], outFracs: number[], color: string,
): React.ReactNode[] {
  if (margin < 6) return [];
  const stubLen = Math.min(margin - 2, margin * 0.7);
  const arrowDepth = Math.min(5, stubLen * 0.5);
  const arrowHalf = Math.max(2, arrowDepth * 0.5);
  const elements: React.ReactNode[] = [];

  inFracs.forEach((frac, i) => {
    const cx = width * frac;
    const baseY = barTop - arrowDepth;
    elements.push(
      <Line key={`in-line-${i}`} x1={cx} y1={barTop - stubLen} x2={cx} y2={baseY} stroke={color} strokeWidth={1.5} />,
      <Polygon key={`in-arrow-${i}`} points={`${cx},${barTop} ${cx - arrowHalf},${baseY} ${cx + arrowHalf},${baseY}`} fill={color} />,
    );
  });

  outFracs.forEach((frac, i) => {
    const cx = width * frac;
    const baseY = barBottom + arrowDepth;
    elements.push(
      <Line key={`out-line-${i}`} x1={cx} y1={barBottom} x2={cx} y2={baseY} stroke={color} strokeWidth={1.5} />,
      <Polygon key={`out-arrow-${i}`} points={`${cx},${barBottom + stubLen} ${cx - arrowHalf},${baseY} ${cx + arrowHalf},${baseY}`} fill={color} />,
    );
  });

  return elements;
}

// ─── 4. Fork Node ─────────────────────────────────────────────────────────

export const UMLForkShape: React.FC<ShapeProps> = ({
  width,
  height,
  color = '#1a1f36',
}) => {
  const bar = Math.min(height, 10);
  const y = (height - bar) / 2;
  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <Rect x={2} y={y} width={width - 4} height={bar} fill={color} />
      {forkJoinStubs(width, y, y + bar, y, [0.5], [0.25, 0.75], color)}
    </Svg>
  );
};

// ─── 5. Join Node ─────────────────────────────────────────────────────────
// Same synchronization-bar glyph as Fork just above — UML reuses one shape
// for both, distinguished only by flow direction (many-in/one-out here).

export const UMLJoinShape: React.FC<ShapeProps> = ({
  width,
  height,
  color = '#1a1f36',
}) => {
  const bar = Math.min(height, 10);
  const y = (height - bar) / 2;
  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <Rect x={2} y={y} width={width - 4} height={bar} fill={color} />
      {forkJoinStubs(width, y, y + bar, y, [0.25, 0.75], [0.5], color)}
    </Svg>
  );
};

// ─── 6. Control Flow ──────────────────────────────────────────────────────

export const UMLControlFlowShape: React.FC<ShapeProps> = ({
  width,
  height,
  color = '#1a1f36',
  strokeWidth = 2,
}) => {
  const cy = height / 2;
  const arrow = 10;
  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <Line x1={2} y1={cy} x2={width - arrow - 2} y2={cy} stroke={color} strokeWidth={strokeWidth} />
      <Polygon
        points={`${width - 2},${cy} ${width - arrow - 2},${cy - 5} ${width - arrow - 2},${cy + 5}`}
        fill={color}
      />
    </Svg>
  );
};

// ─── 7. Object Flow ───────────────────────────────────────────────────────

export const UMLObjectFlowShape: React.FC<ShapeProps> = ({
  width,
  height,
  color = '#1a1f36',
  strokeWidth = 2,
}) => {
  const cy = height / 2;
  const arrow = 10;
  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <Line
        x1={2}
        y1={cy}
        x2={width - arrow - 2}
        y2={cy}
        stroke={color}
        strokeWidth={strokeWidth}
        strokeDasharray="6,4"
      />
      <Polygon
        points={`${width - 2},${cy} ${width - arrow - 2},${cy - 5} ${width - arrow - 2},${cy + 5}`}
        fill={color}
      />
    </Svg>
  );
};

// ─── 8. Swimlane ──────────────────────────────────────────────────────────

export const UMLSwimlaneShape: React.FC<ShapeProps> = ({
  width,
  height,
  color = '#1a1f36',
  fillColor = '#ffffff',
  strokeWidth = 2,
}) => {
  const header = Math.min(40, height * 0.2);
  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <Rect x={2} y={2} width={width - 4} height={height - 4} fill={fillColor} stroke={color} strokeWidth={strokeWidth} />
      <Line x1={2} y1={header + 2} x2={width - 2} y2={header + 2} stroke={color} strokeWidth={strokeWidth} />
    </Svg>
  );
};

// ─── 9. Activity Final ────────────────────────────────────────────────────

export const UMLActivityFinalShape: React.FC<ShapeProps> = ({
  width,
  height,
  color = '#1a1f36',
  strokeWidth = 2,
}) => {
  const cx = width / 2;
  const cy = height / 2;
  const r = Math.min(width, height) / 2 - 2;
  const inner = r * 0.5;
  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <Circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth={strokeWidth} />
      <Circle cx={cx} cy={cy} r={inner} fill={color} />
    </Svg>
  );
};

// ─── 10. Flow Final ───────────────────────────────────────────────────────

export const UMLFlowFinalShape: React.FC<ShapeProps> = ({
  width,
  height,
  color = '#1a1f36',
  strokeWidth = 2,
}) => {
  const cx = width / 2;
  const cy = height / 2;
  const r = Math.min(width, height) / 2 - 2;
  const p = r * 0.5;
  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <Circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth={strokeWidth} />
      <Line x1={cx - p} y1={cy - p} x2={cx + p} y2={cy + p} stroke={color} strokeWidth={strokeWidth} />
      <Line x1={cx + p} y1={cy - p} x2={cx - p} y2={cy + p} stroke={color} strokeWidth={strokeWidth} />
    </Svg>
  );
};

// ─── 11. Constraint ───────────────────────────────────────────────────────

export const UMLConstraintShape: React.FC<ShapeProps> = ({
  width,
  height,
  color = '#1a1f36',
  strokeWidth = 2,
}) => {
  const r = Math.min(width, height) * 0.12;
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
        strokeDasharray="6,4"
        rx={r}
      />
    </Svg>
  );
};
