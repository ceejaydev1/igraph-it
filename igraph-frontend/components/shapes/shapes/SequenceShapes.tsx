import React from 'react';
import { Svg, Rect, Line, Polygon, Path, Text as SvgText } from 'react-native-svg';

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
      <Rect x={width * 0.1} y={2} width={width * 0.8} height={header} fill={fillColor} stroke={color} strokeWidth={strokeWidth} />
      <Line x1={cx} y1={header + 2} x2={cx} y2={height - 2} stroke={color} strokeWidth={1.5} strokeDasharray="6,4" />
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
      <Rect x={x} y={2} width={barW} height={height - 4} fill={fillColor} stroke={color} strokeWidth={strokeWidth} />
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
      <Line x1={2} y1={cy} x2={width - arrow - 2} y2={cy} stroke={color} strokeWidth={strokeWidth} />
      <Polygon
        points={`${width - 2},${cy} ${width - arrow - 2},${cy - 6} ${width - arrow - 2},${cy + 6}`}
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
      <Line x1={2} y1={cy} x2={width - arrow - 2} y2={cy} stroke={color} strokeWidth={strokeWidth} />
      <Polygon
        points={`${width - 2},${cy} ${width - arrow - 2},${cy - 6} ${width - arrow - 2},${cy + 6}`}
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
        x1={2 + arrow}
        y1={cy}
        x2={width - 2}
        y2={cy}
        stroke={color}
        strokeWidth={strokeWidth}
        strokeDasharray="6,4"
      />
      <Polygon
        points={`2,${cy} ${2 + arrow},${cy - 6} ${2 + arrow},${cy + 6}`}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
      />
    </Svg>
  );
};

// Shared frame for the alt/opt/loop/par/break combined-fragment shapes:
// an unfilled rect with a small pentagon "tag" in the top-left corner
// holding the operator label - matches each *ShapeCanvas exactly (fixed
// pixel tag size 20/35, not proportional to width/height) at normal canvas
// sizes. But the shapes panel renders these at a much shorter height
// (~26-32px) than that fixed 35px tag, which the viewBox then clips at the
// bottom — so the tag geometry is capped to whatever height is actually
// available, only kicking in below the 35+4px it needs, leaving on-canvas
// rendering (height comfortably above that) pixel-identical to before.
const FragmentFrame: React.FC<ShapeProps & { label: string; tagWidth: number; textX: number; dashedDivider?: boolean }> = ({
  width,
  height,
  color = '#1a1f36',
  strokeWidth = 2,
  label,
  tagWidth,
  textX,
  dashedDivider,
}) => {
  const tagH = Math.min(35, height - 4);
  const cutY = (tagH * 20) / 35;
  const textY = (tagH * 22) / 35;
  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <Rect x={2} y={2} width={width - 4} height={height - 4} fill="none" stroke={color} strokeWidth={strokeWidth} />
      <Path
        d={`M2,2 L${tagWidth},2 L${tagWidth + 8},${cutY} L${tagWidth + 8},${tagH} L2,${tagH} L2,2`}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
      />
      <SvgText x={textX} y={textY} fontSize={10} fill={color} textAnchor="middle">{label}</SvgText>
      {dashedDivider && (
        <Line x1={2} y1={height / 2} x2={width - 2} y2={height / 2} stroke={color} strokeWidth={strokeWidth} strokeDasharray="6,4" />
      )}
    </Svg>
  );
};

// ─── 7. ALT Fragment ─────────────────────────────────────────────────────

export const UMLAltShape: React.FC<ShapeProps> = (props) => (
  <FragmentFrame {...props} label="alt" tagWidth={30} textX={16} dashedDivider />
);

// ─── 8. OPT Fragment ─────────────────────────────────────────────────────

export const UMLOptShape: React.FC<ShapeProps> = (props) => (
  <FragmentFrame {...props} label="opt" tagWidth={30} textX={16} />
);

// ─── 9. LOOP Fragment ────────────────────────────────────────────────────

export const UMLLoopShape: React.FC<ShapeProps> = (props) => (
  <FragmentFrame {...props} label="loop" tagWidth={35} textX={20} />
);

// ─── 10. PAR Fragment ─────────────────────────────────────────────────────

export const UMLParShape: React.FC<ShapeProps> = (props) => (
  <FragmentFrame {...props} label="par" tagWidth={30} textX={16} dashedDivider />
);

// ─── 11. BREAK Fragment ──────────────────────────────────────────────────

export const UMLBreakShape: React.FC<ShapeProps> = (props) => (
  <FragmentFrame {...props} label="break" tagWidth={38} textX={22} />
);
