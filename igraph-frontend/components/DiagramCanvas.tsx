import React, { useEffect, useRef, useCallback, useState, forwardRef, useImperativeHandle } from 'react';
import { View, StyleSheet, Platform, Text } from 'react-native';
import './maxgraph-common.css';

import {
  Graph,
  InternalEvent,
  RubberBandHandler,
  KeyHandler,
  UndoManager,
  ModelXmlSerializer,
  HandleConfig,
  VertexHandlerConfig,
  EdgeHandlerConfig,
  CellState,
  CellOverlay,
  ImageBox,
  Geometry,
  Point,
  Clipboard,
  registerDefaultPerimeters,
  registerDefaultEdgeStyles,
  registerDefaultEdgeMarkers,
} from '@maxgraph/core';

import type {
  PanningHandler,
  ConnectionHandler,
  FitPlugin,
  CellStateStyle,
  AlignValue,
  VAlignValue,
  WhiteSpaceValue,
  Cell,
} from '@maxgraph/core';

import {
  registerAllCustomShapes,
  IGRAPH_ID_STYLE_MAP,
  IGRAPH_PERIMETERS,
  isUmlClassContainerCell,
  isUmlClassCompartmentCell,
  isDfdDataStoreContainerCell,
  isDfdDataStoreCompartmentCell,
  isUmlLifelineCell,
} from './maxgraph-custom-shapes';
import { UniversalVertexHandler } from './maxgraph-universal-handler';
import { getShapeDefinitionById, getShapesForDiagram, DIAGRAM_SHAPES, ShapeDefinition, isConnectorCell, CONNECTOR_SHAPE_IDS } from '@/constants/shapes';
import { ShapePreview } from '@/components/shapes/ShapeIcon';
import { tagShapeRole, getShapeRole, validateDiagram, FlowchartIssue, IssueSeverity } from '@/utils/flowchartRules';

// ─── Constants ────────────────────────────────────────────────────────────────

const GRID_SIZE = 10;
const CANVAS_BG = '#f8faff';
const MINOR_COLOR = '#dde3ed';
const MAJOR_COLOR = '#bec8d9';
const MAJOR_EVERY = 5;
const BLACK = '#1a1f36';
const BLUE = '#4c6fff';

// Small badge icons for flowchart-validation cell overlays — inlined as data
// URIs so no image asset is needed for a first-pass feature.
const FLOWCHART_ERROR_ICON =
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='18' height='18' viewBox='0 0 18 18'><circle cx='9' cy='9' r='8' fill='%23ef4444' stroke='white' stroke-width='1.25'/><rect x='8.1' y='4.5' width='1.8' height='6' rx='0.9' fill='white'/><circle cx='9' cy='13' r='1.1' fill='white'/></svg>";
const FLOWCHART_WARNING_ICON =
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='18' height='18' viewBox='0 0 18 18'><path d='M9 1.6L17 15.5H1Z' fill='%23f59e0b' stroke='white' stroke-width='1.25' stroke-linejoin='round'/><rect x='8.1' y='7' width='1.8' height='4.4' rx='0.9' fill='white'/><circle cx='9' cy='13' r='1.05' fill='white'/></svg>";
const FLOWCHART_INFO_ICON =
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='18' height='18' viewBox='0 0 18 18'><circle cx='9' cy='9' r='8' fill='%233b82f6' stroke='white' stroke-width='1.25'/><circle cx='9' cy='5.6' r='1.15' fill='white'/><rect x='8.1' y='8.2' width='1.8' height='5.4' rx='0.9' fill='white'/></svg>";

const severityColor = (severity: IssueSeverity): string =>
  severity === 'error' ? '#ef4444' : severity === 'warning' ? '#f59e0b' : '#3b82f6';

/** Small inline severity glyph for the summary pill/issue list — same shape
 *  language as the cell-overlay icons above (circle=error/info, triangle=
 *  warning) so the two places an issue shows up read as one visual system,
 *  instead of the raw ❌/⚠️ emoji this used to render (inconsistent across
 *  platforms/fonts and the main thing that made this feel unpolished). */
function SeverityIcon({ severity, size = 14 }: { severity: IssueSeverity; size?: number }) {
  const color = severityColor(severity);
  if (severity === 'warning') {
    return (
      <svg width={size} height={size} viewBox="0 0 18 18" fill="none">
        <path d="M9 1.6L17 15.5H1Z" fill={color} />
        <rect x="8.1" y="7" width="1.8" height="4.4" rx="0.9" fill="#fff" />
        <circle cx="9" cy="13" r="1.05" fill="#fff" />
      </svg>
    );
  }
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" fill="none">
      <circle cx="9" cy="9" r="8" fill={color} />
      {severity === 'info' ? (
        <>
          <circle cx="9" cy="5.6" r="1.15" fill="#fff" />
          <rect x="8.1" y="8.2" width="1.8" height="5.4" rx="0.9" fill="#fff" />
        </>
      ) : (
        <>
          <rect x="8.1" y="4.5" width="1.8" height="6" rx="0.9" fill="#fff" />
          <circle cx="9" cy="13" r="1.1" fill="#fff" />
        </>
      )}
    </svg>
  );
}

const DROP_W = 120;
const DROP_H = 60;
const NEW_SHAPE_SPACING = 160;

// isConnectorCell (constants/shapes.ts) is shared with
// maxgraph-universal-handler.ts, which uses it to give these shapes 3
// endpoint/move handles instead of the usual 8 box-resize handles. It reads
// the cell's own persisted style rather than the shapeId tag stamped on at
// creation time (see tagShapeRole below), so it still works after a reload —
// the tag lives in an in-memory WeakMap that a fresh page load never refills.

// Drop size comes from the shape's own definition (constants/shapes.ts) so
// its real proportions survive onto the canvas — an oval stays an oval, an
// actor stays tall/narrow, etc. Previously this forced a fixed set of
// "square" shapes to 80x80 regardless of their intended aspect ratio, which
// is what turned ellipses/use-cases/ERD ovals into circles on drop.
function getDropSize(shapeId: string): { w: number; h: number } {
  const def = getShapeDefinitionById(shapeId);
  if (def) return { w: def.width, h: def.height };
  return { w: DROP_W, h: DROP_H };
}

HandleConfig.fillColor = BLUE;
HandleConfig.strokeColor = BLUE;
HandleConfig.size = 8;

VertexHandlerConfig.selectionColor = BLUE;
VertexHandlerConfig.selectionDashed = true;
VertexHandlerConfig.selectionStrokeWidth = 1.5;

EdgeHandlerConfig.selectionColor = BLUE;
EdgeHandlerConfig.selectionDashed = true;
EdgeHandlerConfig.selectionStrokeWidth = 1.5;

console.log('🎨 All configs set to BLUE (#4c6fff)');

if (Platform.OS === 'web') {
  // maxGraph's own built-in perimeters/edge-styles/edge-markers are opt-in —
  // importing @maxgraph/core does NOT register them, despite IGRAPH_PERIMETERS
  // (maxgraph-custom-shapes.ts) and every edgeStyle: 'orthogonalEdgeStyle'
  // etc. throughout this app referencing them by name. Without this, every
  // one of those string names fails to resolve (GraphView.getPerimeterFunction
  // falls through to null), which for a perimeter means the affected shape's
  // edges connect at its dead-center instead of clipping to its actual
  // outline — invisible for a rectangle (bounding box = its own shape) but
  // very visibly wrong for anything else (ellipse, diamond/rhombus, hexagon,
  // triangle), where a manually-dragged connection can look like it's
  // landing at a fixed, wrong point instead of tracking the target's
  // direction. Must run before registerAllCustomShapes() assigns any style
  // that references these names.
  registerDefaultPerimeters();
  registerDefaultEdgeStyles();
  registerDefaultEdgeMarkers();
  registerAllCustomShapes();
  console.log('✅ All custom shapes registered with maxGraph');
}

function paintGridOnCanvas(
  canvas: HTMLCanvasElement,
  scale: number,
  tx: { x: number; y: number },
) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const W = canvas.width;
  const H = canvas.height;
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = CANVAS_BG;
  ctx.fillRect(0, 0, W, H);

  const minorSize = GRID_SIZE * scale;
  const majorSize = minorSize * MAJOR_EVERY;
  const offsetX = ((tx.x % majorSize) + majorSize) % majorSize;
  const offsetY = ((tx.y % majorSize) + majorSize) % majorSize;

  ctx.beginPath();
  ctx.strokeStyle = MINOR_COLOR;
  ctx.lineWidth = 0.5;
  for (let x = offsetX; x <= W; x += minorSize) {
    ctx.moveTo(x, 0);
    ctx.lineTo(x, H);
  }
  for (let y = offsetY; y <= H; y += minorSize) {
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
  }
  ctx.stroke();

  ctx.beginPath();
  ctx.strokeStyle = MAJOR_COLOR;
  ctx.lineWidth = 1;
  for (let x = offsetX; x <= W; x += minorSize) {
    if (Math.round((x - offsetX) / minorSize) % MAJOR_EVERY === 0) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, H);
    }
  }
  for (let y = offsetY; y <= H; y += minorSize) {
    if (Math.round((y - offsetY) / minorSize) % MAJOR_EVERY === 0) {
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
    }
  }
  ctx.stroke();
}

// CellState bounds (state.x/y/width/height) are always the shape's
// unrotated axis-aligned bounds — rotation is applied only as a visual
// transform at render time. Anything positioned relative to those bounds
// (directional arrows, connection points) must rotate the offset vector
// itself by the cell's rotation to end up in the right place on screen.
function rotateVector(dx: number, dy: number, rotationDeg: number): { x: number; y: number } {
  if (!rotationDeg) return { x: dx, y: dy };
  const rad = (rotationDeg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  return { x: dx * cos - dy * sin, y: dx * sin + dy * cos };
}

function clientToGraphCoords(
  graph: Graph,
  clientX: number,
  clientY: number,
  containerEl: HTMLElement,
): { x: number; y: number } {
  const rect = containerEl.getBoundingClientRect();
  const scale = graph.getView().getScale();
  const translate = graph.getView().getTranslate();

  const x = (clientX - rect.left) / scale - translate.x;
  const y = (clientY - rect.top) / scale - translate.y;

  return { x, y };
}

// Model-space (not screen-space) distance in graph units within which a
// connector's dropped endpoint "magnet-snaps" onto a nearby shape — chosen
// close enough that a deliberate drop lands, not so wide that an unrelated
// shape two grid squares away gets attached by accident. Exported so
// create.tsx's handleAddShape (tap-to-add, used by the mobile Shapes sheet)
// applies the exact same snap radius as this file's own handleDrop
// (desktop drag-and-drop) — one connector-attach behavior, not two that can
// quietly drift apart. Widened from 24: that was tight enough that a
// perfectly reasonable drop next to another shape (not exactly centered on
// it) still missed the snap and landed dangling.
export const CONNECTOR_SNAP_DISTANCE = 40;

// Finds the vertex nearest a point, for magnet-attaching a freshly-dropped
// connector's endpoint (see handleDrop below and create.tsx's
// handleAddShape). Deliberately works in model coordinates (each vertex's
// own geometry) rather than converting to view/screen pixels via
// graph.getCellAt — that would need re-deriving from the current scale/pan,
// while comparing against geometry directly is correct at any zoom level
// and doesn't depend on what's currently scrolled into view. Distance to a
// cell is 0 when the point already lands inside its bounds, so a drop
// directly on top of a shape always attaches, not just a near-miss.
export function findNearbyVertex(graph: Graph, x: number, y: number, threshold: number): any {
  const parent = graph.getDefaultParent();
  const vertices = graph.getChildVertices(parent);
  let best: any = null;
  let bestDistance = Infinity;

  for (const cell of vertices) {
    const geo = cell.getGeometry();
    if (!geo) continue;
    const dx = Math.max(geo.x - x, 0, x - (geo.x + geo.width));
    const dy = Math.max(geo.y - y, 0, y - (geo.y + geo.height));
    const distance = Math.hypot(dx, dy);
    if (distance <= threshold && distance < bestDistance) {
      best = cell;
      bestDistance = distance;
    }
  }

  return best;
}

// Finds whichever shape sits immediately to one side of the drop point
// along a single axis — "immediately" meaning its span on the OTHER axis
// actually brackets the drop point (so a shape that's merely somewhere off
// to that side, but not in the same row/column, doesn't count), and closest
// among those. Distance-unbounded on purpose: unlike findNearbyVertex's
// small fixed snap radius, this is how two shapes that are simply "next to
// each other" get found regardless of exactly how far apart they are.
function findBracketingVertex(
  vertices: any[],
  centerX: number,
  centerY: number,
  direction: 'left' | 'right' | 'up' | 'down',
): any {
  let best: any = null;
  let bestGap = Infinity;
  for (const cell of vertices) {
    if (isConnectorCell(cell)) continue;
    const geo = cell.getGeometry();
    if (!geo) continue;

    if (direction === 'left' || direction === 'right') {
      if (centerY < geo.y || centerY > geo.y + geo.height) continue;
      const gap = direction === 'left' ? centerX - (geo.x + geo.width) : geo.x - centerX;
      if (gap >= 0 && gap < bestGap) { bestGap = gap; best = cell; }
    } else {
      if (centerX < geo.x || centerX > geo.x + geo.width) continue;
      const gap = direction === 'up' ? centerY - (geo.y + geo.height) : geo.y - centerY;
      if (gap >= 0 && gap < bestGap) { bestGap = gap; best = cell; }
    }
  }
  return best;
}

// A dropped connector's two endpoints should attach to whichever pair of
// shapes it actually landed between — side by side "(shape) (shape)", or
// stacked "(shape) / (shape)" — regardless of exactly how far apart those
// shapes are. Previously this only ever projected a fixed-length line
// (the connector's own default width) out from the drop's center and
// snapped whichever end happened to land within a small fixed radius of a
// shape — so it only worked when the two shapes happened to be spaced
// almost exactly that far apart; any other spacing left the connector
// dangling on one or both ends (an on-canvas error badge, not just a
// cosmetic miss). This instead looks outward in all 4 directions for the
// shape that actually brackets the drop point in each, and connects
// whichever axis found a complete pair (horizontal wins on tie, matching
// the original left-right default). Falls back to the old fixed-length
// floating segment, still with its small magnet-snap radius, only when
// neither axis finds two shapes to bridge.
export function findConnectorDropEndpoints(
  graph: Graph,
  centerX: number,
  centerY: number,
  reach: number,
): {
  startPoint: { x: number; y: number };
  endPoint: { x: number; y: number };
  sourceCell: any;
  targetCell: any;
} {
  const vertices = graph.getChildVertices(graph.getDefaultParent());

  const leftCell = findBracketingVertex(vertices, centerX, centerY, 'left');
  const rightCell = findBracketingVertex(vertices, centerX, centerY, 'right');
  if (leftCell && rightCell) {
    const lGeo = leftCell.getGeometry();
    const rGeo = rightCell.getGeometry();
    return {
      startPoint: { x: lGeo.x + lGeo.width, y: centerY },
      endPoint: { x: rGeo.x, y: centerY },
      sourceCell: leftCell,
      targetCell: rightCell,
    };
  }

  const upCell = findBracketingVertex(vertices, centerX, centerY, 'up');
  const downCell = findBracketingVertex(vertices, centerX, centerY, 'down');
  if (upCell && downCell) {
    const uGeo = upCell.getGeometry();
    const dGeo = downCell.getGeometry();
    return {
      startPoint: { x: centerX, y: uGeo.y + uGeo.height },
      endPoint: { x: centerX, y: dGeo.y },
      sourceCell: upCell,
      targetCell: downCell,
    };
  }

  const half = reach / 2;
  const hStart = { x: centerX - half, y: centerY };
  const hEnd = { x: centerX + half, y: centerY };
  // Falls back to the nearest EDGE (findEdgeNearPoint, below) when no
  // vertex is close enough — needed now that some "attach to" targets are
  // themselves connectors rather than boxes (Fishbone's spine in
  // particular: a Main Cause is meant to branch off it, same as before it
  // was converted to a real edge, but findNearbyVertex alone can never
  // find it since it only ever looks at graph.getChildVertices).
  const hSource = findNearbyVertex(graph, hStart.x, hStart.y, CONNECTOR_SNAP_DISTANCE)
    ?? findEdgeNearPoint(graph, hStart.x, hStart.y, CONNECTOR_SNAP_DISTANCE);
  const hTargetCandidate = findNearbyVertex(graph, hEnd.x, hEnd.y, CONNECTOR_SNAP_DISTANCE)
    ?? findEdgeNearPoint(graph, hEnd.x, hEnd.y, CONNECTOR_SNAP_DISTANCE);
  const hTarget = hTargetCandidate && hTargetCandidate !== hSource ? hTargetCandidate : null;
  return { startPoint: hStart, endPoint: hEnd, sourceCell: hSource, targetCell: hTarget };
}

// An edge's two real endpoints in model space — its terminal cell's center
// if it has one attached, otherwise the edge's own floating terminal point
// (for a dangling end). Shared by findEdgeNearPoint below and handleDrop's
// relationship-split centering, so both agree on what "this edge's line"
// actually is.
function edgeEndpoint(edge: any, isSource: boolean): { x: number; y: number } | null {
  const terminal = edge.getTerminal(isSource);
  const geo = terminal?.getGeometry();
  if (geo) return { x: geo.x + geo.width / 2, y: geo.y + geo.height / 2 };
  const pt = edge.getGeometry()?.getTerminalPoint(isSource);
  return pt ? { x: pt.x, y: pt.y } : null;
}

function distanceToSegment(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const dx = bx - ax;
  const dy = by - ay;
  const lenSq = dx * dx + dy * dy;
  const t = lenSq === 0 ? 0 : Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lenSq));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

// Finds the edge whose line passes nearest a point, for "was a shape
// dropped onto this connector" checks (see the relationship-split branch
// in handleDrop). graph.getCellAt's own edge hit-test only counts a drop
// that lands within a couple of pixels of the actual stroke — reasonable
// for a mouse click, but a much tighter target than a drag-and-drop of a
// whole shape ever reliably lands on, so relying on it alone made the
// split silently never trigger on an ordinary, only-roughly-on-the-line
// drop. This instead measures straight-line distance to the edge's own
// two endpoints (real cell or floating terminal point either way — see
// edgeEndpoint), same generous-tolerance approach validateERD's nearestEdge
// already uses for matching a cardinality marker to its edge.
// `roles`, when given, restricts the search to edges of just those shape
// roles (see the Fishbone Main Cause branch in handleDrop, which must only
// ever find the spine — never any other nearby connector).
export function findEdgeNearPoint(graph: Graph, x: number, y: number, threshold: number, roles?: Set<string>): any {
  let best: any = null;
  let bestDistance = Infinity;
  for (const edge of graph.getChildEdges(graph.getDefaultParent())) {
    if (roles && !roles.has(getShapeRole(edge) ?? '')) continue;
    const a = edgeEndpoint(edge, true);
    const b = edgeEndpoint(edge, false);
    if (!a || !b) continue;
    const distance = distanceToSegment(x, y, a.x, a.y, b.x, b.y);
    if (distance <= threshold && distance < bestDistance) {
      best = edge;
      bestDistance = distance;
    }
  }
  return best;
}

// Fishbone's spine is meant to attach to the one Fish Head/Effect Box in
// the diagram no matter how far away it was dropped — there's only ever
// one, so unlike an ordinary connector snap (small fixed radius, meant to
// disambiguate between several nearby candidates) there's nothing to
// disambiguate here. Used by handleDrop below both when the spine itself
// is dropped (finds the head) and when the head is dropped after the
// spine already exists (finds the spine) — see findDanglingEdgeByRole.
function findVertexByRole(graph: Graph, roles: Set<string>): any {
  for (const cell of graph.getChildVertices(graph.getDefaultParent())) {
    const role = getShapeRole(cell);
    if (role && roles.has(role)) return cell;
  }
  return null;
}

// The other half of findVertexByRole above — finds an edge of one of the
// given roles that still has at least one unattached end, and which end.
function findDanglingEdgeByRole(
  graph: Graph,
  roles: Set<string>,
): { edge: any; isSource: boolean } | null {
  for (const edge of graph.getChildEdges(graph.getDefaultParent())) {
    const role = getShapeRole(edge);
    if (!role || !roles.has(role)) continue;
    if (!edge.source) return { edge, isSource: true };
    if (!edge.target) return { edge, isSource: false };
  }
  return null;
}

// Sequence Diagram message arrows (Sync/Async/Return) are meant to span
// however far apart the two participants actually are — not the connector
// shape's own arbitrary default width. The generic connector-drop snap
// above places the far end at a fixed offset from the drop point, so it
// only reaches the other lifeline/activation by coincidence; if the two
// participants are spaced any differently than that default width, the far
// end lands short (or past) the target and never actually connects (looks
// exactly like the arrowhead stopping in mid-air before the activation
// bar). This instead looks at what's actually there: every lifeline/actor/
// activation whose vertical span covers the drop point's height, and picks
// whichever one sits immediately to the left and right of the drop point,
// however far apart they really are.
const SEQUENCE_TIMELINE_STYLES = new Set([
  'igraph.umlLifeline',
  'igraph.umlActivation',
  'igraph.seqActor',
  'igraph.ucActor',
]);

export const SEQUENCE_MESSAGE_SHAPE_IDS = new Set(['seq-sync-msg', 'seq-async-msg', 'seq-return-msg']);

// Fishbone's cause connectors read as a "bone" specifically because of
// their diagonal angle (see their shapes-panel preview icons) — used below
// in handleDrop to keep that angle for a drop with nothing nearby to
// attach to, instead of findConnectorDropEndpoints' generic horizontal
// fallback flattening it out.
const FISHBONE_DIAGONAL_UP = new Set(['fishbone-cause-top', 'fishbone-sub-top', 'fishbone-tertiary']);
const FISHBONE_DIAGONAL_DOWN = new Set(['fishbone-cause-bottom', 'fishbone-sub-bottom']);
// A Main Cause branches off the spine specifically (validateFishbone's
// 5.5) — never straight onto the Fish Head or any other nearby shape, even
// if one happens to be closer to the drop point. The generic connector
// search (bracketing, then nearby-vertex/edge fallback) doesn't know that
// distinction, so these two get their own spine-only search in handleDrop
// instead of the shared one every other connector uses.
const FISHBONE_MAIN_CAUSE_IDS = new Set(['fishbone-cause-top', 'fishbone-cause-bottom']);

function getCellStyleShapeName(cell: any): string | undefined {
  const style = cell?.getStyle?.();
  return typeof style === 'object' ? style?.shape : undefined;
}

// A message connected to both a source and target cell with no fixed
// entry/exit point uses maxGraph's "floating" routing, which recomputes the
// connection point from the shapes' relative positions on every redraw —
// not from wherever the user actually dropped/dragged the arrow. Against
// two tall lifeline/activation bars that rarely share the same vertical
// center, that recompute visibly snaps the message to a different height
// than the one it was just placed at. Pinning exitY/entryY (fractions of
// the connected cell's own height) to the actual drop height fixes the
// connection to that exact spot instead, the same way dragging an edge
// endpoint onto one of a shape's own fixed connection points would.
export function sequenceMessageConnectionStyle(
  sourceCell: any,
  targetCell: any,
  dropY: number,
): Partial<CellStateStyle> {
  const style: Partial<CellStateStyle> & Record<string, unknown> = {};
  const sourceGeo = sourceCell?.getGeometry();
  if (sourceGeo && sourceGeo.height > 0) {
    style.exitX = 1;
    style.exitY = Math.min(1, Math.max(0, (dropY - sourceGeo.y) / sourceGeo.height));
    style.exitDx = 0;
    style.exitDy = 0;
  }
  const targetGeo = targetCell?.getGeometry();
  if (targetGeo && targetGeo.height > 0) {
    style.entryX = 0;
    style.entryY = Math.min(1, Math.max(0, (dropY - targetGeo.y) / targetGeo.height));
    style.entryDx = 0;
    style.entryDy = 0;
  }
  return style;
}

export function findSequenceMessageEndpoints(
  graph: Graph,
  dropX: number,
  dropY: number,
): { source: any; target: any } {
  const parent = graph.getDefaultParent();
  const candidates = graph
    .getChildVertices(parent)
    .filter((cell: any) => {
      const shape = getCellStyleShapeName(cell);
      if (!shape || !SEQUENCE_TIMELINE_STYLES.has(shape)) return false;
      const geo = cell.getGeometry();
      return !!geo && dropY >= geo.y && dropY <= geo.y + geo.height;
    })
    .sort((a: any, b: any) => (a.getGeometry()?.x ?? 0) - (b.getGeometry()?.x ?? 0));

  let source: any = null;
  let target: any = null;
  for (const cell of candidates) {
    const geo = cell.getGeometry();
    if (!geo) continue;
    const center = geo.x + geo.width / 2;
    if (center <= dropX) {
      source = cell;
    } else {
      target = cell;
      break;
    }
  }
  return { source, target };
}

interface DiagramCanvasProps {
  onReady?: (graph: any) => void;
  onChange?: (xml: string) => void;
  onSelectionChange?: (cell: any) => void;
  onZoomChange?: (scalePercent: number) => void;
  umlType?: string;
  /** Shows a floating delete (trash) button at the top-right corner of the
   *  selected shape — mobile has no Delete key, unlike desktop, so touch
   *  users otherwise have no way to remove a shape at all. */
  isMobile?: boolean;
}

export interface DiagramCanvasHandle {
  loadXml: (xml: string) => void;
  // Forces the graph's SVG to re-measure/repaint itself. React Navigation
  // hides this screen's whole subtree (rather than unmounting it) while
  // another tab is active. maxGraph sizes its SVG from the container's DOM
  // dimensions at the moment it last drew — dimensions a hidden container
  // can report as stale/zero. Nothing here rebuilds the diagram from data
  // (the model was never touched), it just re-triggers that measurement so
  // the existing content actually gets painted again once visible.
  refresh: () => void;
  // Gates local interaction for a "view" or "comment" collaborator — the
  // real enforcement is always the backend's save/socket permission checks
  // (this can't be trusted as a security boundary, it's just UX), but a
  // viewer's canvas shouldn't even let them try to drag/edit a shape that
  // any resulting save would just get rejected for anyway.
  setReadOnly: (readOnly: boolean) => void;
}

// ════════════════════════════════════════════════════════════════════════════
// ⭐ SHAPE STYLE DEFINITIONS - Match the panel previews exactly
// ════════════════════════════════════════════════════════════════════════════

export function getShapeStyle(styleKey: string): CellStateStyle {
  // Base style with default values
  const base: CellStateStyle = {
    shape: styleKey,
    fillColor: '#ffffff',
    strokeColor: BLACK,
    strokeWidth: 2,
    fontColor: BLACK,
    fontSize: 12,
    align: 'center' as AlignValue,
    verticalAlign: 'middle' as VAlignValue,
    whiteSpace: 'wrap' as WhiteSpaceValue,
  };

  // Special styles for specific shapes (match what's in maxgraph-custom-shapes.ts)
  const specialStyles: Record<string, Partial<CellStateStyle>> = {
    // The name label belongs inside the small header box at the top of the
    // shape (see UMLLifelineShapeCanvas), not centered on the whole tall
    // dashed lifeline below it — base's align:center/verticalAlign:middle
    // would otherwise land the text in the middle of the dashed line.
    // header there is a fixed 30px regardless of the cell's own height, so
    // a fixed spacingTop here reliably lands inside it too.
    'igraph.umlLifeline': {
      shape: 'igraph.umlLifeline',
      fillColor: '#ffffff',
      strokeColor: BLACK,
      strokeWidth: 2,
      verticalAlign: 'top' as VAlignValue,
      align: 'center' as AlignValue,
      spacingTop: 6,
    },
    // Same reasoning as umlLifeline just above: the name belongs just below
    // the stick figure's fixed-height header (see UMLSeqActorShapeCanvas),
    // not centered on the whole tall shape where the dashed lifeline runs.
    'igraph.seqActor': {
      shape: 'igraph.seqActor',
      fillColor: 'transparent',
      strokeColor: BLACK,
      strokeWidth: 2,
      verticalAlign: 'top' as VAlignValue,
      align: 'center' as AlignValue,
      spacingTop: 68,
    },
    // ERD Shapes
    'igraph.erdRelationship': {
      shape: 'igraph.erdRelationship',
      fillColor: '#ffffff',
      strokeColor: BLACK,
      strokeWidth: 2,
    },
    'igraph.erdIdentifyingRelationship': {
      shape: 'igraph.erdIdentifyingRelationship',
      fillColor: '#ffffff',
      strokeColor: BLACK,
      strokeWidth: 2,
    },
    'igraph.erdAttribute': {
      shape: 'igraph.erdAttribute',
      fillColor: '#ffffff',
      strokeColor: BLACK,
      strokeWidth: 2,
    },
    'igraph.erdMultivaluedAttribute': {
      shape: 'igraph.erdMultivaluedAttribute',
      fillColor: '#ffffff',
      strokeColor: BLACK,
      strokeWidth: 2,
    },
    'igraph.erdDerivedAttribute': {
      shape: 'igraph.erdDerivedAttribute',
      fillColor: '#ffffff',
      strokeColor: BLACK,
      strokeWidth: 2,
    },
    'igraph.erdEntity': {
      shape: 'igraph.erdEntity',
      fillColor: '#ffffff',
      strokeColor: BLACK,
      strokeWidth: 2,
    },
    'igraph.erdWeakEntity': {
      shape: 'igraph.erdWeakEntity',
      fillColor: '#ffffff',
      strokeColor: BLACK,
      strokeWidth: 2,
    },

    // Fishbone Shapes
    'igraph.fishboneArrow': {
      shape: 'igraph.fishboneArrow',
      fillColor: BLACK,
      strokeColor: BLACK,
      strokeWidth: 2,
    },
    'igraph.fishboneDashedArrow': {
      shape: 'igraph.fishboneDashedArrow',
      fillColor: BLACK,
      strokeColor: BLACK,
      strokeWidth: 2,
    },
    'igraph.fishboneSpine': {
      shape: 'igraph.fishboneSpine',
      fillColor: 'transparent',
      strokeColor: BLACK,
      strokeWidth: 2,
    },
    // FishboneHeadShapeCanvas draws a right-pointing triangle whose flat
    // edge sits at the horizontal center of its own bounding box (the left
    // half of the box is empty) — centering the label on the box the
    // normal way puts its anchor right at that flat edge, spilling most of
    // the text out into the empty left half instead of inside the visible
    // triangle. spacingLeft/spacingRight instead center it within roughly
    // where the triangle is actually wide enough to hold text (past the
    // flat edge, short of the point), tuned for this shape's own default
    // 160-wide box (see 'fishbone-head' in constants/shapes.ts).
    'igraph.fishboneHead': {
      shape: 'igraph.fishboneHead',
      fillColor: '#ffffff',
      strokeColor: BLACK,
      strokeWidth: 2,
      align: 'center' as AlignValue,
      verticalAlign: 'middle' as VAlignValue,
      spacingLeft: 70,
      spacingRight: 20,
    },
    'igraph.fishboneProblem': {
      shape: 'igraph.fishboneProblem',
      fillColor: 'transparent',
      strokeColor: BLACK,
      strokeWidth: 2,
    },
    'igraph.fishboneCategory': {
      shape: 'igraph.fishboneCategory',
      fillColor: '#ffffff',
      strokeColor: BLACK,
      strokeWidth: 2,
    },
    'igraph.fishboneBubble': {
      shape: 'igraph.fishboneBubble',
      fillColor: '#ffffff',
      strokeColor: BLACK,
      strokeWidth: 2,
    },
    'igraph.fishboneNote': {
      shape: 'igraph.fishboneNote',
      fillColor: '#fef9c3',
      strokeColor: BLACK,
      strokeWidth: 2,
    },

    // Use Case Shapes
    'igraph.umlUseCase': {
      shape: 'igraph.umlUseCase',
      fillColor: '#ffffff',
      strokeColor: BLACK,
      strokeWidth: 2,
    },
    'igraph.ucActor': {
      shape: 'igraph.ucActor',
      fillColor: 'transparent',
      strokeColor: BLACK,
      strokeWidth: 2,
    },
    // Title sits at the top of the frame (standard UML system-boundary
    // notation), not centered where the use cases inside it go.
    'igraph.umlSystemBoundary': {
      shape: 'igraph.umlSystemBoundary',
      fillColor: 'transparent',
      strokeColor: BLACK,
      strokeWidth: 2,
      verticalAlign: 'top' as VAlignValue,
      align: 'center' as AlignValue,
      fontStyle: 1,
      spacingTop: 10,
    },
    'igraph.umlAssociation': {
      shape: 'igraph.umlAssociation',
      fillColor: 'transparent',
      strokeColor: BLACK,
      strokeWidth: 2,
    },
    'igraph.umlNote': {
      shape: 'igraph.umlNote',
      fillColor: '#fef9c3',
      strokeColor: BLACK,
      strokeWidth: 2,
    },

    // Standard Shapes
'igraph.ellipse': {
  shape: 'igraph.ellipse',
  fillColor: '#ffffff',
  strokeColor: BLACK,
  strokeWidth: 2,
},
    'igraph.noteStandalone': {
      shape: 'igraph.noteStandalone',
      fillColor: '#fef9c3',
      strokeColor: BLACK,
      strokeWidth: 2,
    },
    'igraph.actor': {
      shape: 'igraph.actor',
      fillColor: 'transparent',
      strokeColor: BLACK,
      strokeWidth: 2,
    },
    'igraph.hexagon': {
      shape: 'igraph.hexagon',
      fillColor: '#ffffff',
      strokeColor: BLACK,
      strokeWidth: 2,
    },

    // Activity Shapes
    'igraph.umlActivity': {
      shape: 'igraph.umlActivity',
      fillColor: '#ffffff',
      strokeColor: BLACK,
      strokeWidth: 2,
    },
    'igraph.umlDecision': {
      shape: 'igraph.umlDecision',
      fillColor: '#ffffff',
      strokeColor: BLACK,
      strokeWidth: 2,
    },
    'igraph.umlInitialNode': {
      shape: 'igraph.umlInitialNode',
      fillColor: BLACK,
      strokeColor: BLACK,
      strokeWidth: 0,
    },
    'igraph.umlMerge': {
      shape: 'igraph.umlMerge',
      fillColor: BLACK,
      strokeColor: BLACK,
      strokeWidth: 0,
    },
    'igraph.umlFork': {
      shape: 'igraph.umlFork',
      fillColor: BLACK,
      strokeColor: BLACK,
      strokeWidth: 0,
    },

    // DFD Shapes
    'igraph.dfdProcess': {
      shape: 'igraph.dfdProcess',
      fillColor: '#ffffff',
      strokeColor: BLACK,
      strokeWidth: 2,
    },
    'igraph.dfdDataFlow': {
      shape: 'igraph.dfdDataFlow',
      fillColor: 'transparent',
      strokeColor: BLACK,
      strokeWidth: 2,
    },
    'igraph.dfdDataStore': {
      shape: 'igraph.dfdDataStore',
      fillColor: 'transparent',
      strokeColor: BLACK,
      strokeWidth: 2,
    },
    'igraph.dfdExternalEntity': {
      shape: 'igraph.dfdExternalEntity',
      fillColor: '#ffffff',
      strokeColor: BLACK,
      strokeWidth: 2,
    },
    'igraph.dfdNote': {
      shape: 'igraph.dfdNote',
      fillColor: '#fef9c3',
      strokeColor: BLACK,
      strokeWidth: 2,
    },

    // FDD Shapes
    'igraph.fdd.function': {
      shape: 'igraph.fdd.function',
      fillColor: '#DCEAF7',
      strokeColor: '#4A78A8',
      strokeWidth: 2,
    },
    'igraph.fdd.input': {
      shape: 'igraph.fdd.input',
      fillColor: '#DCEFD2',
      strokeColor: '#5A9E4B',
      strokeWidth: 2,
    },
    'igraph.fdd.output': {
      shape: 'igraph.fdd.output',
      fillColor: '#FBE8B8',
      strokeColor: '#F39C12',
      strokeWidth: 2,
    },
    'igraph.fdd.control': {
      shape: 'igraph.fdd.control',
      fillColor: BLACK,
      strokeColor: BLACK,
      strokeWidth: 2,
    },
    'igraph.fdd.mechanism': {
      shape: 'igraph.fdd.mechanism',
      fillColor: BLACK,
      strokeColor: BLACK,
      strokeWidth: 2,
    },
    'igraph.fdd.interface': {
      shape: 'igraph.fdd.interface',
      fillColor: BLACK,
      strokeColor: BLACK,
      strokeWidth: 2,
    },
    'igraph.fdd.boundary': {
      shape: 'igraph.fdd.boundary',
      fillColor: 'transparent',
      strokeColor: '#666666',
      strokeWidth: 2,
    },
    'igraph.fdd.note': {
      shape: 'igraph.fdd.note',
      fillColor: '#FFF4CC',
      strokeColor: '#B7950B',
      strokeWidth: 2,
    },
    'igraph.fdd.externalEntity': {
      shape: 'igraph.fdd.externalEntity',
      fillColor: '#F4F4F4',
      strokeColor: '#8E8E8E',
      strokeWidth: 2,
    },

    // Solid-black arrowheads/markers — these shapes ARE the black triangle/
    // dot/diamond (not an outline with a separate fill), so without an
    // explicit fillColor here they fall through to base's white fill and
    // become invisible against the canvas background.
    'igraph.connectorArrow': {
      shape: 'igraph.connectorArrow',
      fillColor: BLACK,
      strokeColor: BLACK,
      strokeWidth: 2,
    },
    'igraph.umlInclude': {
      shape: 'igraph.umlInclude',
      fillColor: BLACK,
      strokeColor: BLACK,
      strokeWidth: 2,
    },
    'igraph.umlExtend': {
      shape: 'igraph.umlExtend',
      fillColor: BLACK,
      strokeColor: BLACK,
      strokeWidth: 2,
    },
    'igraph.umlControlFlow': {
      shape: 'igraph.umlControlFlow',
      fillColor: BLACK,
      strokeColor: BLACK,
      strokeWidth: 2,
    },
    'igraph.umlObjectFlow': {
      shape: 'igraph.umlObjectFlow',
      fillColor: BLACK,
      strokeColor: BLACK,
      strokeWidth: 2,
    },
    'igraph.umlActivityFinal': {
      shape: 'igraph.umlActivityFinal',
      fillColor: BLACK,
      strokeColor: BLACK,
      strokeWidth: 2,
    },
    'igraph.umlSyncMsg': {
      shape: 'igraph.umlSyncMsg',
      fillColor: BLACK,
      strokeColor: BLACK,
      strokeWidth: 2,
    },
    'igraph.umlComposition': {
      shape: 'igraph.umlComposition',
      fillColor: BLACK,
      strokeColor: BLACK,
      strokeWidth: 2,
    },
    // Aggregation's diamond is intentionally hollow (unlike composition's
    // solid one) — explicit here so it doesn't drift if composition's entry
    // above is ever copy-edited.
    'igraph.umlAggregation': {
      shape: 'igraph.umlAggregation',
      fillColor: '#ffffff',
      strokeColor: BLACK,
      strokeWidth: 2,
    },
  };

  // Merge base with special style if it exists
  const special = specialStyles[styleKey] || {};
  const perimeter = IGRAPH_PERIMETERS[styleKey];
  return { ...base, ...special, ...(perimeter ? { perimeter } : {}) };
}

// ════════════════════════════════════════════════════════════════════════════
// ⭐ UML CLASS SHAPE — container + 3 independently-editable compartments
// ════════════════════════════════════════════════════════════════════════════
//
// A plain single-cell box (the older igraph.umlClass) can only carry one
// label for the whole box, so "class name" / "attributes" / "methods" had
// to share one text blob. This instead builds a real parent/child cell
// tree: an outer igraph.umlClassContainer (draws just the border) holding
// three compartment children, each an ordinary vertex — so each is
// independently double-click-editable exactly like any other shape, for
// free. The two divider lines are just the name/attributes compartments'
// own bottom edges (igraph.classCompartmentDivider), so they track each
// compartment's real, independently-growable height instead of a fixed
// 0.3/0.65 split. See the CellEditorHandler override and the
// LABEL_CHANGED/CELLS_RESIZED listeners below for the growing behavior.
const CLASS_NAME_RATIO = 0.3;
const CLASS_ATTRS_RATIO = 0.35;

export function insertUmlClassCell(graph: Graph, x: number, y: number, w: number, h: number) {
  const nameH = Math.round(h * CLASS_NAME_RATIO);
  const attrH = Math.round(h * CLASS_ATTRS_RATIO);
  const methodH = Math.max(20, h - nameH - attrH);

  const container = graph.insertVertex(null, null, '', x, y, w, nameH + attrH + methodH, {
    shape: 'igraph.umlClassContainer',
    fillColor: '#ffffff',
    strokeColor: BLACK,
    strokeWidth: 2,
  });

  const nameCell = graph.insertVertex(container, null, 'ClassName', 0, 0, w, nameH, {
    shape: 'igraph.classCompartmentDivider',
    strokeColor: BLACK,
    strokeWidth: 2,
    fontColor: BLACK,
    fontSize: 12,
    fontStyle: 1,
    align: 'center' as AlignValue,
    verticalAlign: 'middle' as VAlignValue,
    whiteSpace: 'wrap' as WhiteSpaceValue,
    movable: false,
    resizable: false,
  });
  const attrCell = graph.insertVertex(container, null, '', 0, nameH, w, attrH, {
    shape: 'igraph.classCompartmentDivider',
    strokeColor: BLACK,
    strokeWidth: 2,
    fontColor: BLACK,
    fontSize: 12,
    align: 'left' as AlignValue,
    verticalAlign: 'middle' as VAlignValue,
    whiteSpace: 'wrap' as WhiteSpaceValue,
    spacingLeft: 8,
    movable: false,
    resizable: false,
  });
  const methodCell = graph.insertVertex(container, null, '', 0, nameH + attrH, w, methodH, {
    shape: 'igraph.classCompartmentPlain',
    strokeColor: BLACK,
    strokeWidth: 2,
    fontColor: BLACK,
    fontSize: 12,
    align: 'left' as AlignValue,
    verticalAlign: 'middle' as VAlignValue,
    whiteSpace: 'wrap' as WhiteSpaceValue,
    spacingLeft: 8,
    movable: false,
    resizable: false,
  });

  [nameCell, attrCell, methodCell].forEach((c) => c.setConnectable(false));

  return container;
}

const CLASS_COMPARTMENT_LINE_HEIGHT = 17;
const CLASS_COMPARTMENT_V_PADDING = 12;

// Runs both live (on every keystroke while a compartment is mid-edit — see
// the CellEditorHandler.resize patch below, so pressing Enter grows the box
// immediately instead of waiting for the edit to commit) and once more on
// commit (see the LABEL_CHANGED listener below, as a catch-all for any edit
// path that doesn't go through the patched resize, e.g. a pasted multi-line
// value). `liveValue` carries the textarea's in-progress text during an
// active edit, since the cell's own value doesn't update until commit —
// omit it to fall back to the committed value.
// Grows/shrinks just the edited compartment to fit its line count, shifts
// every compartment below it down/up by the same delta, and grows/shrinks
// the container by that delta too — the other compartments' own heights
// are left untouched, per the chosen behavior.
function resizeClassCompartmentToFitText(graph: Graph, cell: any, liveValue?: string) {
  const container = cell.getParent();
  const geo = cell.getGeometry();
  if (!container || !geo) return;
  const containerGeo = container.getGeometry();
  if (!containerGeo) return;

  const value = liveValue ?? (cell.getValue() as string) ?? '';
  const lineCount = Math.max(1, value.split('\n').length);
  const desired = lineCount * CLASS_COMPARTMENT_LINE_HEIGHT + CLASS_COMPARTMENT_V_PADDING;
  const delta = desired - geo.height;
  if (Math.abs(delta) < 1) return;

  const siblings = graph
    .getChildCells(container, true, false)
    .filter((c: any) => isUmlClassCompartmentCell(c))
    .sort((a: any, b: any) => (a.getGeometry()?.y ?? 0) - (b.getGeometry()?.y ?? 0));

  graph.batchUpdate(() => {
    const model = graph.getDataModel();

    const newGeo = geo.clone();
    newGeo.height = desired;
    model.setGeometry(cell, newGeo);

    let below = false;
    siblings.forEach((sib: any) => {
      if (sib === cell) {
        below = true;
        return;
      }
      if (!below) return;
      const sGeo = sib.getGeometry()!.clone();
      sGeo.y += delta;
      model.setGeometry(sib, sGeo);
    });

    const newContainerGeo = containerGeo.clone();
    newContainerGeo.height += delta;
    model.setGeometry(container, newContainerGeo);
  });
}

// Runs when the user drag-resizes a class container's own handles.
// Compartments are `resizable: false` (no handles of their own), so
// without this they'd silently stay their old width/proportions and
// visibly stop matching the container. Keeps all 3 compartments spanning
// the container's new width, and rescales their heights proportionally so
// they still exactly tile its new height.
function syncClassCompartmentsToContainer(graph: Graph, container: any) {
  const containerGeo = container.getGeometry();
  if (!containerGeo) return;

  const children = graph
    .getChildCells(container, true, false)
    .filter((c: any) => isUmlClassCompartmentCell(c))
    .sort((a: any, b: any) => (a.getGeometry()?.y ?? 0) - (b.getGeometry()?.y ?? 0));
  if (children.length === 0) return;

  const oldTotalHeight = children.reduce((sum: number, c: any) => sum + (c.getGeometry()?.height ?? 0), 0);
  if (oldTotalHeight <= 0) return;
  const scale = containerGeo.height / oldTotalHeight;

  graph.batchUpdate(() => {
    const model = graph.getDataModel();
    let cursorY = 0;
    children.forEach((c: any) => {
      const geo = c.getGeometry()!.clone();
      geo.width = containerGeo.width;
      geo.height = Math.max(20, Math.round(geo.height * scale));
      geo.x = 0;
      geo.y = cursorY;
      model.setGeometry(c, geo);
      cursorY += geo.height;
    });
  });
}

// ════════════════════════════════════════════════════════════════════════════
// ⭐ DFD DATA STORE SHAPE — container + 2 independently-editable compartments
// ════════════════════════════════════════════════════════════════════════════
//
// Same trick as insertUmlClassCell above: a single-cell data store can only
// carry one label for the whole shape, but the real notation has an ID box
// and a Name box. This builds a container (just the Yourdon/Gane-Sarson
// outline) holding 2 ordinary vertex children — so each is independently
// double-click-editable for free, side by side instead of stacked.
const DFD_DATA_STORE_ID_RATIO = 0.28;

export function insertDfdDataStoreCell(
  graph: Graph,
  x: number,
  y: number,
  w: number,
  h: number,
  variant: 'yourdon' | 'gs' = 'yourdon',
) {
  const idW = Math.round(w * DFD_DATA_STORE_ID_RATIO);
  const nameW = Math.max(20, w - idW);

  const container = graph.insertVertex(null, null, '', x, y, w, h, {
    shape: variant === 'gs' ? 'igraph.dfdDataStoreGSContainer' : 'igraph.dfdDataStoreContainer',
    fillColor: '#ffffff',
    strokeColor: BLACK,
    strokeWidth: 2,
  });

  const idCell = graph.insertVertex(container, null, '', 0, 0, idW, h, {
    shape: 'igraph.dfdCompartmentDivider',
    strokeColor: BLACK,
    strokeWidth: 2,
    fontColor: BLACK,
    fontSize: 12,
    align: 'center' as AlignValue,
    verticalAlign: 'middle' as VAlignValue,
    whiteSpace: 'wrap' as WhiteSpaceValue,
    movable: false,
    resizable: false,
  });
  const nameCell = graph.insertVertex(container, null, '', idW, 0, nameW, h, {
    shape: 'igraph.dfdCompartmentPlain',
    strokeColor: BLACK,
    strokeWidth: 2,
    fontColor: BLACK,
    fontSize: 12,
    align: 'center' as AlignValue,
    verticalAlign: 'middle' as VAlignValue,
    whiteSpace: 'wrap' as WhiteSpaceValue,
    spacingLeft: 6,
    movable: false,
    resizable: false,
  });

  [idCell, nameCell].forEach((c) => c.setConnectable(false));

  return container;
}

// Runs when the user drag-resizes a data store container's own handles.
// Compartments are `resizable: false`, so without this they'd keep their old
// width/proportions and stop tiling the container. Keeps both compartments
// spanning the container's new height, rescaling their widths
// proportionally so they still exactly tile its new width side by side.
function syncDfdDataStoreCompartmentsToContainer(graph: Graph, container: any) {
  const containerGeo = container.getGeometry();
  if (!containerGeo) return;

  const children = graph
    .getChildCells(container, true, false)
    .filter((c: any) => isDfdDataStoreCompartmentCell(c))
    .sort((a: any, b: any) => (a.getGeometry()?.x ?? 0) - (b.getGeometry()?.x ?? 0));
  if (children.length === 0) return;

  const oldTotalWidth = children.reduce((sum: number, c: any) => sum + (c.getGeometry()?.width ?? 0), 0);
  if (oldTotalWidth <= 0) return;
  const scale = containerGeo.width / oldTotalWidth;

  graph.batchUpdate(() => {
    const model = graph.getDataModel();
    let cursorX = 0;
    children.forEach((c: any) => {
      const geo = c.getGeometry()!.clone();
      geo.height = containerGeo.height;
      geo.width = Math.max(20, Math.round(geo.width * scale));
      geo.x = cursorX;
      geo.y = 0;
      model.setGeometry(c, geo);
      cursorX += geo.width;
    });
  });
}

// ════════════════════════════════════════════════════════════════════════════
// ⭐ SEQUENCE LIFELINE — growable object-name header
// ════════════════════════════════════════════════════════════════════════════
//
// The lifeline's name header used to be a hardcoded 30px regardless of how
// long the object's name was, so a long name either overflowed the box or
// got clipped. Runs on every label edit: estimates how many wrapped lines
// the new name needs at the header's actual width, and if that's taller
// than the header's current height, grows just the header (via a
// per-cell `headerHeight` style override UMLLifelineShapeCanvas reads) and
// the total cell height by the same delta — so the dashed lifeline below
// keeps its own length instead of being eaten by the header's growth.
const LIFELINE_MIN_HEADER = 30;
const LIFELINE_LINE_HEIGHT = 16;
const LIFELINE_V_PADDING = 10;
const LIFELINE_AVG_CHAR_WIDTH = 7;

function estimateLifelineHeaderHeight(value: string, headerWidth: number): number {
  const usableWidth = Math.max(20, headerWidth - 12);
  const charsPerLine = Math.max(4, Math.floor(usableWidth / LIFELINE_AVG_CHAR_WIDTH));
  const lines = value
    .split('\n')
    .reduce((sum, line) => sum + Math.max(1, Math.ceil(line.length / charsPerLine)), 0);
  return Math.max(LIFELINE_MIN_HEADER, lines * LIFELINE_LINE_HEIGHT + LIFELINE_V_PADDING);
}

// Finds which compartment child a point (in graph coordinates) actually
// falls into, given the axis the container stacks its compartments along
// ('y' for Class's name/attributes/methods, 'x' for the Data Store's
// ID/Name). Used to redirect a double-click that maxGraph resolved to the
// *container* cell (its shape node can end up on top of a child's at the
// exact tile boundary, or after certain redraw orders) to the actual
// compartment the user clicked on, instead of silently editing the
// container's own (invisible, never-shown) label.
function findCompartmentAtPoint(
  graph: Graph,
  container: any,
  graphX: number,
  graphY: number,
  axis: 'x' | 'y',
  isCompartment: (cell: any) => boolean,
): any {
  const containerGeo = container.getGeometry();
  if (!containerGeo) return null;

  const children = graph
    .getChildCells(container, true, false)
    .filter((c: any) => isCompartment(c))
    .sort((a: any, b: any) => (a.getGeometry()?.[axis] ?? 0) - (b.getGeometry()?.[axis] ?? 0));
  if (children.length === 0) return null;

  const local = axis === 'y' ? graphY - containerGeo.y : graphX - containerGeo.x;
  const hit = children.find((c: any) => {
    const g = c.getGeometry();
    if (!g) return false;
    const start = g[axis];
    const size = axis === 'y' ? g.height : g.width;
    return local >= start && local < start + size;
  });
  return hit ?? children[children.length - 1];
}

function resizeLifelineHeaderToFitText(graph: Graph, cell: any, liveValue?: string) {
  const geo = cell.getGeometry();
  const style = cell.getStyle();
  if (!geo || typeof style !== 'object') return;

  const currentHeader = typeof style.headerHeight === 'number' ? style.headerHeight : LIFELINE_MIN_HEADER;
  const value = liveValue ?? (cell.getValue() as string) ?? '';
  const desired = estimateLifelineHeaderHeight(value, geo.width * 0.8);
  const delta = desired - currentHeader;
  if (Math.abs(delta) < 1) return;

  graph.batchUpdate(() => {
    const model = graph.getDataModel();
    model.setStyle(cell, { ...style, headerHeight: desired });
    const newGeo = geo.clone();
    newGeo.height += delta;
    model.setGeometry(cell, newGeo);
  });
}

// ════════════════════════════════════════════════════════════════════════════
// ⭐ MAIN WEBCANVAS COMPONENT
// ════════════════════════════════════════════════════════════════════════════

const WebCanvas = forwardRef<DiagramCanvasHandle, DiagramCanvasProps>(({ onReady, onChange, onSelectionChange, onZoomChange, umlType = 'flowchart', isMobile = false }, ref) => {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const gridCanvasRef = useRef<HTMLCanvasElement>(null);
  const graphDivRef = useRef<HTMLDivElement>(null);
  const graphRef = useRef<Graph | null>(null);
  // Mobile's own label-editing overlay (see openMobileEditor below) — a
  // single always-mounted <textarea>, hidden until needed and repositioned/
  // refocused imperatively rather than conditionally rendered, so focusing
  // it stays inside the same synchronous call stack as the double-tap that
  // opened it (a React state update + re-render in between would break the
  // "trusted user gesture" requirement mobile browsers have for raising the
  // on-screen keyboard).
  const mobileEditorRef = useRef<HTMLTextAreaElement | null>(null);
  const mobileEditingCellRef = useRef<any | null>(null);

  const [isDragOver, setIsDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedCell, setSelectedCell] = useState<any>(null);
  const [flowchartIssues, setFlowchartIssues] = useState<FlowchartIssue[]>([]);
  // Defaults open (not collapsed behind a click) so the actual "what's wrong"
  // messages are visible the moment an issue appears, not just a bare count.
  const [showIssuesList, setShowIssuesList] = useState(true);
  // Tapping/clicking a validation badge (see runFlowchartValidation) shows
  // its message in this popup instead of relying only on the native
  // hover tooltip — hover has no equivalent on touch, so mobile needs an
  // explicit show/dismiss path. Positioned relative to graphDivRef's own
  // container, same coordinate space as the shape picker below.
  const [issuePopup, setIssuePopup] = useState<{ x: number; y: number; message: string } | null>(null);

  // Draw.io-style picker: clicking a directional arrow opens a grid of shapes
  // instead of immediately cloning the source shape, so the user chooses what
  // connects next. x/y are in the same coordinate space as graphDivRef (the
  // arrow buttons' own container), so the popup can share their positioning.
  const [shapePicker, setShapePicker] = useState<{
    x: number;
    y: number;
    sourceCell: any;
    dir: { dx: number; dy: number };
    rotation: number;
    geo: { x: number; y: number; width: number; height: number };
    scale: number;
  } | null>(null);


  const onReadyRef = useRef(onReady);
  const onChangeRef = useRef(onChange);
  const onSelectionChangeRef = useRef(onSelectionChange);
  const onZoomChangeRef = useRef(onZoomChange);
  const validationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { onReadyRef.current = onReady; }, [onReady]);
  useEffect(() => { onChangeRef.current = onChange; }, [onChange]);
  useEffect(() => { onSelectionChangeRef.current = onSelectionChange; }, [onSelectionChange]);
  useEffect(() => { onZoomChangeRef.current = onZoomChange; }, [onZoomChange]);

  useImperativeHandle(ref, () => ({
    loadXml: (xml: string) => {
      const graph = graphRef.current;
      if (!graph || !xml) return;
      try {
        new ModelXmlSerializer(graph.getDataModel()).import(xml);
        graph.clearSelection();

        // Deferred one frame on purpose: fitCenter()/center() below read
        // graph.container.clientWidth/clientHeight, and on this direct-load
        // path (fresh navigation straight to /create?diagramId=...) that can
        // still report a stale/too-small size the instant the model import
        // finishes — the container is present but the surrounding flex
        // layout (shapes panel, properties panel) hasn't necessarily finished
        // settling yet. That produced e.g. a fit computed against a near-
        // content-sized box, landing on ~100% instead of the real fit scale.
        // Reading the size from inside requestAnimationFrame guarantees a
        // layout pass has actually run first.
        requestAnimationFrame(() => {
          if (graphRef.current !== graph) return; // torn down/replaced before this fired
          if (isMobile) {
            // A diagram authored on desktop can have been left zoomed/panned
            // anywhere — FitPlugin's zoom-to-fit would then open it at
            // whatever arbitrary scale makes it fit, varying by diagram size.
            // Mobile should instead always open the same way a blank canvas
            // does: 100% zoom, diagram centered in the viewport.
            graph.getView().setScale(1);
            graph.center(true, true);
          } else {
            // fit() (used pre-existing elsewhere) only aligns the diagram's
            // top-left near the container's border — it was never centering
            // horizontally/vertically, so a diagram authored on mobile (or
            // panned off to a corner) opened on desktop looking off-center.
            // fitCenter() does the same fit-to-container scaling but actually
            // centers the result, matching mobile's now-centered open.
            (graph.getPlugin('FitPlugin') as FitPlugin | null)?.fitCenter();
          }
        });
      } catch (e) {
        console.error('Failed to load diagram XML:', e);
      }
    },
    refresh: () => {
      const graph = graphRef.current;
      if (!graph) return;
      try {
        // A frozen/hidden tab collapses its container to 0×0 (display:none),
        // and maxGraph only re-measures its own container on an explicit
        // sizeDidChange() call — nothing here does that automatically once
        // the tab becomes visible again. Without it, the graph's own SVG can
        // stay stuck at whatever (possibly zero) size it last measured while
        // hidden, so every shape is still there in the model but invisible —
        // exactly what "my shape disappeared after switching tabs" looks
        // like. view.revalidate() alone (the previous version of this
        // method) only reprocesses already-invalidated cell states; it
        // doesn't force that container re-measurement the way sizeDidChange
        // does.
        (graph as any).sizeDidChange();
        graph.getView().revalidate();
        resizeGridCanvas();
        repaintGrid();
      } catch (e) {
        console.error('Failed to refresh diagram view:', e);
      }
    },
    setReadOnly: (readOnly: boolean) => {
      const graph = graphRef.current;
      if (!graph) return;
      graph.setEnabled(!readOnly);
    },
    // Deps stay [] (matching the original loadXml-only handle): resizeGridCanvas/
    // repaintGrid are declared further down this component and would be a
    // TDZ ReferenceError if referenced directly in this array (it's evaluated
    // eagerly, unlike the factory body above, which only runs later via
    // closure once they exist).
  }), []);

  const resizeGridCanvas = useCallback(() => {
    const wrapper = wrapperRef.current;
    const gc = gridCanvasRef.current;
    if (!wrapper || !gc) return;
    gc.width = wrapper.offsetWidth;
    gc.height = wrapper.offsetHeight;
  }, []);

  const repaintGrid = useCallback(() => {
    const gc = gridCanvasRef.current;
    const graph = graphRef.current;
    if (!gc || !graph) return;
    paintGridOnCanvas(gc, graph.getView().getScale(), graph.getView().getTranslate());
  }, []);

  const handleSelectionChange = useCallback(() => {
    const graph = graphRef.current;
    if (!graph) return;

    try {
      const selection = graph.getSelectionCells();
      const selectedCell = selection.length === 1 ? selection[0] : null;
      setSelectedCell(selectedCell);

      if (onSelectionChangeRef.current) {
        onSelectionChangeRef.current(selectedCell);
      }
    } catch (error) {
      console.error('Selection change error:', error);
    }
  }, []);

  // ─── Mobile label editor (custom overlay, not maxGraph's CellEditorHandler) ──
  // Hides the textarea and, unless cancelled, writes its value back onto the
  // cell being edited. Reads mobileEditingCellRef rather than taking the cell
  // as a parameter so blur/Escape/Enter can all call this the same way
  // without each needing to know which cell is active.
  const commitMobileEdit = useCallback((cancel: boolean) => {
    const graph = graphRef.current;
    const textarea = mobileEditorRef.current;
    const cell = mobileEditingCellRef.current;
    if (!textarea) return;

    textarea.style.display = 'none';
    mobileEditingCellRef.current = null;

    if (!cancel && graph && cell) {
      graph.getDataModel().setValue(cell, textarea.value);
    }
    graphDivRef.current?.focus();
  }, []);

  // Positions the overlay textarea over `cell`'s current on-screen bounds and
  // focuses it. Must be called synchronously from within the same touch/click
  // event handler that triggered editing (see the DOUBLE_CLICK listener in
  // initGraph) — deferring even to a microtask would make the mobile browser
  // treat the resulting focus() as un-trusted and refuse to raise the
  // keyboard, which is exactly the bug this whole overlay exists to avoid.
  const openMobileEditor = useCallback((cell: any) => {
    const graph = graphRef.current;
    const textarea = mobileEditorRef.current;
    if (!graph || !textarea) return;

    const view = graph.getView();
    const state = view.getState(cell);
    if (!state) return;

    // If a different cell was already being edited (shouldn't normally
    // happen — blur commits it first — but guards against a stray call).
    if (mobileEditingCellRef.current && mobileEditingCellRef.current !== cell) {
      commitMobileEdit(false);
    }

    const isEdge = typeof cell.isEdge === 'function' && cell.isEdge();
    let boxX: number;
    let boxY: number;
    let boxW: number;
    let boxH: number;
    if (isEdge) {
      // Edges have no fixed "body" to size a box from — anchor on the
      // label's existing rendered position if there's already a label,
      // otherwise the edge's default label anchor (its midpoint).
      const minW = 70;
      const minH = 26;
      const bbox = (state as any).text?.boundingBox;
      if (bbox) {
        boxX = bbox.x;
        boxY = bbox.y;
        boxW = Math.max(minW, bbox.width);
        boxH = Math.max(minH, bbox.height);
      } else {
        const cx = state.absoluteOffset?.x ?? state.x + state.width / 2;
        const cy = state.absoluteOffset?.y ?? state.y + state.height / 2;
        boxX = cx - minW / 2;
        boxY = cy - minH / 2;
        boxW = minW;
        boxH = minH;
      }
    } else {
      boxX = state.x;
      boxY = state.y;
      boxW = state.width;
      boxH = state.height;
    }

    const value = cell.getValue();
    const style = state.style ?? {};
    const scale = view.getScale();

    mobileEditingCellRef.current = cell;
    textarea.value = typeof value === 'string' ? value : '';
    textarea.style.left = `${boxX}px`;
    textarea.style.top = `${boxY}px`;
    textarea.style.width = `${boxW}px`;
    textarea.style.height = `${boxH}px`;
    textarea.style.fontSize = `${Math.max(10, (style.fontSize ?? 12) * scale)}px`;
    textarea.style.color = (style.fontColor as string) ?? '#1a1f36';
    textarea.style.textAlign = (style.align as string) ?? 'center';
    textarea.style.display = 'block';

    textarea.focus();
    textarea.select();
  }, [commitMobileEdit]);

  // Dismissing the shape picker without picking anything should behave like
  // clicking empty canvas — the source shape's selection outline/handles go
  // away too, instead of staying selected with nothing left to act on them.
  const dismissShapePicker = useCallback(() => {
    setShapePicker(null);
    graphRef.current?.clearSelection();
    handleSelectionChange();
  }, [handleSelectionChange]);

  useEffect(() => {
    if (!shapePicker) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') dismissShapePicker();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [shapePicker, dismissShapePicker]);

  const registerShapeStyles = useCallback((graph: Graph) => {
    const stylesheet = graph.getStylesheet();

    const base: CellStateStyle = {
      fillColor: '#ffffff',
      strokeColor: BLACK,
      strokeWidth: 2,
      fontColor: BLACK,
      fontSize: 12,
      align: 'center' as AlignValue,
      verticalAlign: 'middle' as VAlignValue,
    };

    const styles: Record<string, CellStateStyle> = {
      'igraph.fdd.function': {
        ...base,
        shape: 'igraph.fdd.function',
        fillColor: '#DCEAF7',
        strokeColor: '#4A78A8',
        strokeWidth: 2,
      },
      'igraph.fdd.input': {
        ...base,
        shape: 'igraph.fdd.input',
        fillColor: '#DCEFD2',
        strokeColor: '#5A9E4B',
        strokeWidth: 2,
      },
      'igraph.fdd.output': {
        ...base,
        shape: 'igraph.fdd.output',
        fillColor: '#FBE8B8',
        strokeColor: '#F39C12',
        strokeWidth: 2,
      },
      'igraph.fdd.control': {
        ...base,
        shape: 'igraph.fdd.control',
        strokeColor: BLACK,
        strokeWidth: 2,
      },
      'igraph.fdd.mechanism': {
        ...base,
        shape: 'igraph.fdd.mechanism',
        strokeColor: BLACK,
        strokeWidth: 2,
      },
      'igraph.fdd.interface': {
        ...base,
        shape: 'igraph.fdd.interface',
        strokeColor: BLACK,
        strokeWidth: 2,
      },
      'igraph.fdd.boundary': {
        ...base,
        shape: 'igraph.fdd.boundary',
        fillColor: 'transparent',
        strokeColor: '#666666',
        strokeWidth: 2,
      },
      'igraph.fdd.note': {
        ...base,
        shape: 'igraph.fdd.note',
        fillColor: '#FFF4CC',
        strokeColor: '#B7950B',
        strokeWidth: 2,
      },
      'igraph.fdd.externalEntity': {
        ...base,
        shape: 'igraph.fdd.externalEntity',
        fillColor: '#F4F4F4',
        strokeColor: '#8E8E8E',
        strokeWidth: 2,
      },
      'igraph.dfdProcess': {
        ...base,
        shape: 'igraph.dfdProcess',
        fillColor: '#ffffff',
        strokeColor: BLACK,
        strokeWidth: 2,
      },
      'igraph.dfdDataFlow': {
        ...base,
        shape: 'igraph.dfdDataFlow',
        fillColor: 'transparent',
        strokeColor: BLACK,
        strokeWidth: 2,
      },
      'igraph.dfdDataStore': {
        ...base,
        shape: 'igraph.dfdDataStore',
        fillColor: 'transparent',
        strokeColor: BLACK,
        strokeWidth: 2,
      },
      'igraph.dfdDataStoreGS': {
        ...base,
        shape: 'igraph.dfdDataStoreGS',
        fillColor: '#ffffff',
        strokeColor: BLACK,
        strokeWidth: 2,
      },
      'igraph.dfdExternalEntity': {
        ...base,
        shape: 'igraph.dfdExternalEntity',
        fillColor: '#ffffff',
        strokeColor: BLACK,
        strokeWidth: 2,
      },
      'igraph.dfdBidirectional': {
        ...base,
        shape: 'igraph.dfdBidirectional',
        fillColor: 'transparent',
        strokeColor: BLACK,
        strokeWidth: 2,
      },
      'igraph.dfdBoundary': {
        ...base,
        shape: 'igraph.dfdBoundary',
        fillColor: 'transparent',
        strokeColor: BLACK,
        strokeWidth: 2,
      },
      'igraph.dfdNote': {
        ...base,
        shape: 'igraph.dfdNote',
        fillColor: '#fef9c3',
        strokeColor: BLACK,
        strokeWidth: 2,
      },
      'igraph.dfdOnPage': {
        ...base,
        shape: 'igraph.dfdOnPage',
        fillColor: '#ffffff',
        strokeColor: BLACK,
        strokeWidth: 2,
      },
      'igraph.dfdOffPage': {
        ...base,
        shape: 'igraph.dfdOffPage',
        fillColor: '#ffffff',
        strokeColor: BLACK,
        strokeWidth: 2,
      },
      'igraph.fishboneSpine': {
        ...base,
        shape: 'igraph.fishboneSpine',
        fillColor: 'transparent',
        strokeColor: BLACK,
        strokeWidth: 2,
      },
      // See the matching entry in getShapeStyle's specialStyles above for
      // why this needs spacingLeft/spacingRight — the triangle's flat edge
      // sits at the box's horizontal center, so a plain centered label
      // spills into the empty left half instead of landing inside it.
      'igraph.fishboneHead': {
        ...base,
        shape: 'igraph.fishboneHead',
        fillColor: '#ffffff',
        strokeColor: BLACK,
        strokeWidth: 2,
        spacingLeft: 70,
        spacingRight: 20,
      },
      'igraph.fishboneProblem': {
        ...base,
        shape: 'igraph.fishboneProblem',
        fillColor: 'transparent',
        strokeColor: BLACK,
        strokeWidth: 2,
      },
      'igraph.fishboneCauseTop': {
        ...base,
        shape: 'igraph.fishboneCauseTop',
        fillColor: 'transparent',
        strokeColor: BLACK,
        strokeWidth: 2,
      },
      'igraph.fishboneCauseBottom': {
        ...base,
        shape: 'igraph.fishboneCauseBottom',
        fillColor: 'transparent',
        strokeColor: BLACK,
        strokeWidth: 2,
      },
      'igraph.fishboneSubCauseTop': {
        ...base,
        shape: 'igraph.fishboneSubCauseTop',
        fillColor: 'transparent',
        strokeColor: BLACK,
        strokeWidth: 2,
      },
      'igraph.fishboneSubCauseBottom': {
        ...base,
        shape: 'igraph.fishboneSubCauseBottom',
        fillColor: 'transparent',
        strokeColor: BLACK,
        strokeWidth: 2,
      },
      'igraph.fishboneTertiary': {
        ...base,
        shape: 'igraph.fishboneTertiary',
        fillColor: 'transparent',
        strokeColor: BLACK,
        strokeWidth: 1.5,
      },
      'igraph.fishboneArrow': {
        ...base,
        shape: 'igraph.fishboneArrow',
        fillColor: BLACK,
        strokeColor: BLACK,
        strokeWidth: 2,
      },
      'igraph.fishboneDashedArrow': {
        ...base,
        shape: 'igraph.fishboneDashedArrow',
        fillColor: BLACK,
        strokeColor: BLACK,
        strokeWidth: 2,
      },
      'igraph.fishboneCategory': {
        ...base,
        shape: 'igraph.fishboneCategory',
        fillColor: '#ffffff',
        strokeColor: BLACK,
        strokeWidth: 2,
      },
      'igraph.fishboneBubble': {
        ...base,
        shape: 'igraph.fishboneBubble',
        fillColor: '#ffffff',
        strokeColor: BLACK,
        strokeWidth: 2,
      },
      'igraph.fishboneNote': {
        ...base,
        shape: 'igraph.fishboneNote',
        fillColor: '#fef9c3',
        strokeColor: BLACK,
        strokeWidth: 2,
      },
      'igraph.schematicBattery': {
        ...base,
        shape: 'igraph.schematicBattery',
        fillColor: 'transparent',
        strokeColor: BLACK,
        strokeWidth: 2,
      },
      'igraph.schematicAC': {
        ...base,
        shape: 'igraph.schematicAC',
        fillColor: 'transparent',
        strokeColor: BLACK,
        strokeWidth: 2,
      },
      'igraph.schematicGround': {
        ...base,
        shape: 'igraph.schematicGround',
        fillColor: 'transparent',
        strokeColor: BLACK,
        strokeWidth: 2,
      },
      'igraph.schematicResistor': {
        ...base,
        shape: 'igraph.schematicResistor',
        fillColor: 'transparent',
        strokeColor: BLACK,
        strokeWidth: 2,
      },
      'igraph.schematicVariableResistor': {
        ...base,
        shape: 'igraph.schematicVariableResistor',
        fillColor: 'transparent',
        strokeColor: BLACK,
        strokeWidth: 2,
      },
      'igraph.schematicCapacitor': {
        ...base,
        shape: 'igraph.schematicCapacitor',
        fillColor: 'transparent',
        strokeColor: BLACK,
        strokeWidth: 2,
      },
      'igraph.schematicInductor': {
        ...base,
        shape: 'igraph.schematicInductor',
        fillColor: 'transparent',
        strokeColor: BLACK,
        strokeWidth: 2,
      },
      'igraph.schematicDiode': {
        ...base,
        shape: 'igraph.schematicDiode',
        fillColor: '#ffffff',
        strokeColor: BLACK,
        strokeWidth: 2,
      },
      'igraph.schematicLED': {
        ...base,
        shape: 'igraph.schematicLED',
        fillColor: '#ffffff',
        strokeColor: BLACK,
        strokeWidth: 2,
      },
      'igraph.schematicNPN': {
        ...base,
        shape: 'igraph.schematicNPN',
        fillColor: 'transparent',
        strokeColor: BLACK,
        strokeWidth: 2,
      },
      'igraph.schematicSwitch': {
        ...base,
        shape: 'igraph.schematicSwitch',
        fillColor: 'transparent',
        strokeColor: BLACK,
        strokeWidth: 2,
      },
      'igraph.schematicFuse': {
        ...base,
        shape: 'igraph.schematicFuse',
        fillColor: '#ffffff',
        strokeColor: BLACK,
        strokeWidth: 2,
      },
      'igraph.schematicConnection': {
        ...base,
        shape: 'igraph.schematicConnection',
        fillColor: BLACK,
        strokeColor: BLACK,
        strokeWidth: 2,
      },
      'igraph.schematicNoConnection': {
        ...base,
        shape: 'igraph.schematicNoConnection',
        fillColor: 'transparent',
        strokeColor: BLACK,
        strokeWidth: 2,
      },
      'igraph.umlInclude': {
        ...base,
        shape: 'igraph.umlInclude',
        fillColor: BLACK,
        strokeColor: BLACK,
        strokeWidth: 2,
      },
      'igraph.umlExtend': {
        ...base,
        shape: 'igraph.umlExtend',
        fillColor: BLACK,
        strokeColor: BLACK,
        strokeWidth: 2,
      },
      'igraph.umlInitialNode': {
        ...base,
        shape: 'igraph.umlInitialNode',
        fillColor: BLACK,
        strokeColor: BLACK,
        strokeWidth: 2,
      },
      'igraph.umlMerge': {
        ...base,
        shape: 'igraph.umlMerge',
        fillColor: BLACK,
        strokeColor: BLACK,
        strokeWidth: 2,
      },
      'igraph.umlFork': {
        ...base,
        shape: 'igraph.umlFork',
        fillColor: BLACK,
        strokeColor: BLACK,
        strokeWidth: 2,
      },
      'igraph.umlControlFlow': {
        ...base,
        shape: 'igraph.umlControlFlow',
        fillColor: BLACK,
        strokeColor: BLACK,
        strokeWidth: 2,
      },
      'igraph.umlObjectFlow': {
        ...base,
        shape: 'igraph.umlObjectFlow',
        fillColor: BLACK,
        strokeColor: BLACK,
        strokeWidth: 2,
      },
      'igraph.umlActivityFinal': {
        ...base,
        shape: 'igraph.umlActivityFinal',
        fillColor: BLACK,
        strokeColor: BLACK,
        strokeWidth: 2,
      },
      'igraph.umlFlowFinal': {
        ...base,
        shape: 'igraph.umlFlowFinal',
        fillColor: 'transparent',
        strokeColor: BLACK,
        strokeWidth: 2,
      },
      'igraph.umlSyncMsg': {
        ...base,
        shape: 'igraph.umlSyncMsg',
        fillColor: BLACK,
        strokeColor: BLACK,
        strokeWidth: 2,
      },
      'igraph.umlAsyncMsg': {
        ...base,
        shape: 'igraph.umlAsyncMsg',
        fillColor: 'transparent',
        strokeColor: BLACK,
        strokeWidth: 2,
      },
      'igraph.umlComposition': {
        ...base,
        shape: 'igraph.umlComposition',
        fillColor: BLACK,
        strokeColor: BLACK,
        strokeWidth: 2,
      },
      'igraph.rectangle': { ...base, shape: 'igraph.rectangle' },
      'igraph.roundedRectangle': { ...base, shape: 'igraph.roundedRectangle' },
      'igraph.ellipse': { ...base, shape: 'igraph.ellipse' },
      'igraph.diamond': { ...base, shape: 'igraph.diamond' },
      'igraph.triangle': { ...base, shape: 'igraph.triangle' },
      'igraph.parallelogram': { ...base, shape: 'igraph.parallelogram' },
      'igraph.cylinder': { ...base, shape: 'igraph.cylinder' },
      'igraph.note': { ...base, shape: 'igraph.note', fillColor: '#fef9c3' },
      'igraph.cloud': { ...base, shape: 'igraph.cloud', fillColor: '#e0f2fe' },
      'igraph.doubleRectangle': { ...base, shape: 'igraph.doubleRectangle' },
      'igraph.doubleRhombus': { ...base, shape: 'igraph.doubleRhombus' },
      'igraph.multiOval': { ...base, shape: 'igraph.multiOval' },
      'igraph.line': { ...base, shape: 'igraph.line' },
      'igraph.text': { ...base, shape: 'igraph.text' },
      'igraph.dashedRect': { ...base, shape: 'igraph.dashedRect' },
      'igraph.predefined': { ...base, shape: 'igraph.predefined' },
      'igraph.actor': { ...base, shape: 'igraph.actor' },
      'igraph.initialNode': { ...base, shape: 'igraph.initialNode', fillColor: BLACK, strokeColor: BLACK },
      'igraph.finalNode': { ...base, shape: 'igraph.finalNode' },
      'igraph.forkJoin': { ...base, shape: 'igraph.forkJoin', fillColor: BLACK, strokeColor: BLACK },
      'igraph.lifeline': { ...base, shape: 'igraph.lifeline' },
      'igraph.activation': { ...base, shape: 'igraph.activation' },
      'igraph.classBox': { ...base, shape: 'igraph.classBox' },
      'igraph.interface': { ...base, shape: 'igraph.interface' },
      'igraph.abstractClass': { ...base, shape: 'igraph.abstractClass' },
      'igraph.entity': { ...base, shape: 'igraph.entity' },
      'igraph.weakEntity': { ...base, shape: 'igraph.weakEntity' },
      'igraph.attribute': { ...base, shape: 'igraph.attribute' },
      'igraph.primaryKey': { ...base, shape: 'igraph.primaryKey' },
      'igraph.derivedAttr': { ...base, shape: 'igraph.derivedAttr' },
      'igraph.compositeAttr': { ...base, shape: 'igraph.compositeAttr' },
      'igraph.multiAttr': { ...base, shape: 'igraph.multiAttr' },
      'igraph.relationship': { ...base, shape: 'igraph.relationship' },
      'igraph.identifyingRel': { ...base, shape: 'igraph.identifyingRel' },
      'igraph.cardinality': { ...base, shape: 'igraph.cardinality' },
      'igraph.crowOne': { ...base, shape: 'igraph.crowOne' },
      'igraph.crowZeroOne': { ...base, shape: 'igraph.crowZeroOne' },
      'igraph.crowZeroMany': { ...base, shape: 'igraph.crowZeroMany' },
      'igraph.crowOneMany': { ...base, shape: 'igraph.crowOneMany' },
      'igraph.crowMany': { ...base, shape: 'igraph.crowMany' },
      'igraph.totalParticipation': { ...base, shape: 'igraph.totalParticipation' },
      'igraph.partialParticipation': { ...base, shape: 'igraph.partialParticipation' },
      'igraph.erdConnector': { ...base, shape: 'igraph.erdConnector' },
      'igraph.arrow': { ...base, shape: 'igraph.arrow' },
      'igraph.arrowDown': { ...base, shape: 'igraph.arrowDown' },
      'igraph.arrowRight': { ...base, shape: 'igraph.arrowRight' },
      'igraph.filledArrow': { ...base, shape: 'igraph.filledArrow' },
      'igraph.openArrow': { ...base, shape: 'igraph.openArrow' },
      'igraph.dashedArrow': { ...base, shape: 'igraph.dashedArrow' },
      'igraph.dashedArrowBack': { ...base, shape: 'igraph.dashedArrowBack' },
      'igraph.triangleArrow': { ...base, shape: 'igraph.triangleArrow' },
      'igraph.loopArrow': { ...base, shape: 'igraph.loopArrow' },
      'igraph.createArrow': { ...base, shape: 'igraph.createArrow' },
      'igraph.destruction': { ...base, shape: 'igraph.destruction' },
      'igraph.aggregation': { ...base, shape: 'igraph.aggregation' },
      'igraph.composition': { ...base, shape: 'igraph.composition', fillColor: BLACK },
      'igraph.multiplicity': { ...base, shape: 'igraph.multiplicity' },
      'igraph.arrowDiag': { ...base, shape: 'igraph.arrowDiag' },
      'igraph.arrowSmall': { ...base, shape: 'igraph.arrowSmall' },
      'igraph.resistor': { ...base, shape: 'igraph.resistor' },
      'igraph.capacitor': { ...base, shape: 'igraph.capacitor' },
      'igraph.inductor': { ...base, shape: 'igraph.inductor' },
      'igraph.voltage': { ...base, shape: 'igraph.voltage' },
      'igraph.ground': { ...base, shape: 'igraph.ground' },
      'igraph.diode': { ...base, shape: 'igraph.diode' },
      'igraph.transistor': { ...base, shape: 'igraph.transistor' },
      'igraph.ic': { ...base, shape: 'igraph.ic' },
      'igraph.opamp': { ...base, shape: 'igraph.opamp' },
      'igraph.switch': { ...base, shape: 'igraph.switch' },
      'igraph.fuse': { ...base, shape: 'igraph.fuse' },
      'igraph.transformer': { ...base, shape: 'igraph.transformer' },
      'igraph.pentagon': { ...base, shape: 'igraph.pentagon' },
      'igraph.trapezoid': { ...base, shape: 'igraph.trapezoid' },
      'igraph.dshape': { ...base, shape: 'igraph.dshape' },
      'igraph.hexagon': { ...base, shape: 'igraph.hexagon' },
      'igraph.display': { ...base, shape: 'igraph.display' },
      'igraph.annotation': { ...base, shape: 'igraph.annotation' },
      'igraph.ucActor': { ...base, shape: 'igraph.ucActor' },
      'igraph.seqActor': { ...base, shape: 'igraph.seqActor' },
      'igraph.umlUseCase': { ...base, shape: 'igraph.umlUseCase' },
      'igraph.umlSystemBoundary': { ...base, shape: 'igraph.umlSystemBoundary' },
      'igraph.umlAssociation': { ...base, shape: 'igraph.umlAssociation' },
      'igraph.umlGeneralization': { ...base, shape: 'igraph.umlGeneralization' },
      'igraph.umlNote': { ...base, shape: 'igraph.umlNote', fillColor: '#fef9c3' },
      'igraph.umlNoteConnector': { ...base, shape: 'igraph.umlNoteConnector' },
      'igraph.umlIncludeLabel': { ...base, shape: 'igraph.umlIncludeLabel' },
      'igraph.umlExtendLabel': { ...base, shape: 'igraph.umlExtendLabel' },
      'igraph.umlActivity': { ...base, shape: 'igraph.umlActivity' },
      'igraph.umlDecision': { ...base, shape: 'igraph.umlDecision' },
      'igraph.umlSwimlane': { ...base, shape: 'igraph.umlSwimlane' },
      'igraph.umlConstraint': { ...base, shape: 'igraph.umlConstraint' },
      'igraph.umlLifeline': { ...base, shape: 'igraph.umlLifeline' },
      'igraph.umlActivation': { ...base, shape: 'igraph.umlActivation' },
      'igraph.umlDestroy': { ...base, shape: 'igraph.umlDestroy' },
      'igraph.umlReturnMsg': { ...base, shape: 'igraph.umlReturnMsg' },
      'igraph.umlAlt': { ...base, shape: 'igraph.umlAlt' },
      'igraph.umlOpt': { ...base, shape: 'igraph.umlOpt' },
      'igraph.umlLoop': { ...base, shape: 'igraph.umlLoop' },
      'igraph.umlPar': { ...base, shape: 'igraph.umlPar' },
      'igraph.umlBreak': { ...base, shape: 'igraph.umlBreak' },
      'igraph.umlClass': { ...base, shape: 'igraph.umlClass' },
      'igraph.umlDirectedAssociation': { ...base, shape: 'igraph.umlDirectedAssociation' },
      'igraph.umlAggregation': { ...base, shape: 'igraph.umlAggregation' },
      'igraph.umlDependency': { ...base, shape: 'igraph.umlDependency' },
      'igraph.umlMultiplicity1': { ...base, shape: 'igraph.umlMultiplicity1' },
      'igraph.umlMultiplicity01': { ...base, shape: 'igraph.umlMultiplicity01' },
      'igraph.umlMultiplicityMany': { ...base, shape: 'igraph.umlMultiplicityMany' },
      'igraph.umlMultiplicity1Many': { ...base, shape: 'igraph.umlMultiplicity1Many' },
      'igraph.umlMultiplicityRange': { ...base, shape: 'igraph.umlMultiplicityRange' },
      'igraph.umlMultiplicityN': { ...base, shape: 'igraph.umlMultiplicityN' },
      'igraph.erdEntity': { ...base, shape: 'igraph.erdEntity' },
      'igraph.erdWeakEntity': { ...base, shape: 'igraph.erdWeakEntity' },
      'igraph.erdRelationship': { ...base, shape: 'igraph.erdRelationship' },
      'igraph.erdIdentifyingRelationship': { ...base, shape: 'igraph.erdIdentifyingRelationship' },
      'igraph.erdAttribute': { ...base, shape: 'igraph.erdAttribute' },
      'igraph.erdMultivaluedAttribute': { ...base, shape: 'igraph.erdMultivaluedAttribute' },
      'igraph.erdDerivedAttribute': { ...base, shape: 'igraph.erdDerivedAttribute' },
      'igraph.erdCardinality11': { ...base, shape: 'igraph.erdCardinality11' },
      'igraph.erdCardinality1N': { ...base, shape: 'igraph.erdCardinality1N' },
      'igraph.erdCardinalityN1': { ...base, shape: 'igraph.erdCardinalityN1' },
      'igraph.erdCardinalityMN': { ...base, shape: 'igraph.erdCardinalityMN' },
    };

    Object.entries(IGRAPH_PERIMETERS).forEach(([key, perimeter]) => {
      if (styles[key]) {
        styles[key] = { ...styles[key], perimeter };
      }
    });

    Object.entries(styles).forEach(([key, style]) => {
      stylesheet.putCellStyle(key, style);
    });

    console.log('✅ Registered igraph stylesheet entries');
  }, []);

  // ════════════════════════════════════════════════════════════════════════════
  // ⭐ DIAGRAM VALIDATION (every diagram type, desktop AND mobile — see
  // utils/flowchartRules.ts for the full per-type rule set)
  // ════════════════════════════════════════════════════════════════════════════

  const runFlowchartValidation = useCallback(() => {
    const graph = graphRef.current;
    if (!graph) return;

    const issues = validateDiagram(graph, umlType);

    // Badge only — no colored outline around the shape itself. The badge's
    // own message shows on hover via the native tooltip (graph.setTooltips
    // is enabled in initGraph) on desktop; a tap/click on the badge also
    // fires the CLICK listener below, which shows the same message in
    // issuePopup — the only way to see it on touch, where there's no hover.
    graph.clearCellOverlays(null);
    issues.forEach((issue) => {
      // Graph-wide issues (e.g. "no start terminator") aren't any one cell's
      // fault — they only ever appear in the summary list, not as a badge.
      if (!issue.cell) return;
      const icon = new ImageBox(
        issue.severity === 'error'
          ? FLOWCHART_ERROR_ICON
          : issue.severity === 'warning'
            ? FLOWCHART_WARNING_ICON
            : FLOWCHART_INFO_ICON,
        18,
        18,
      );
      const overlay = new CellOverlay(icon, issue.message, 'right', 'top');
      overlay.addListener(InternalEvent.CLICK, (_sender: unknown, evt: { getProperty: (key: string) => unknown; consume: () => void }) => {
        const rawEvent = evt.getProperty('event') as MouseEvent | TouchEvent | undefined;
        const point = rawEvent && 'changedTouches' in rawEvent && rawEvent.changedTouches.length
          ? rawEvent.changedTouches[0]
          : (rawEvent as MouseEvent | undefined);
        const containerEl = graphDivRef.current;
        if (point && containerEl) {
          const rect = containerEl.getBoundingClientRect();
          setIssuePopup({ x: point.clientX - rect.left, y: point.clientY - rect.top, message: issue.message });
        } else {
          setIssuePopup({ x: 0, y: 0, message: issue.message });
        }
        evt.consume();
      });
      graph.addCellOverlay(issue.cell, overlay);
    });

    setFlowchartIssues(issues);
  }, [umlType]);

  // Called from the model CHANGE listener inside initGraph, which is set up once
  // and shouldn't be torn down/rebuilt just because umlType changed — so it reads
  // the latest validator through a ref rather than being an initGraph dependency.
  const runFlowchartValidationRef = useRef(runFlowchartValidation);
  useEffect(() => { runFlowchartValidationRef.current = runFlowchartValidation; }, [runFlowchartValidation]);

  // Re-run immediately (not just on the next model change) when the active
  // diagram type or desktop/mobile switches — e.g. leaving the Flowchart tab
  // should clear its overlays/banner right away, not wait for the next edit.
  useEffect(() => {
    runFlowchartValidation();
  }, [runFlowchartValidation]);

  // ════════════════════════════════════════════════════════════════════════════
  // ⭐ FIXED: Handle drop with proper shape styles
  // ════════════════════════════════════════════════════════════════════════════

  const handleDrop = useCallback((e: DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    const shapeId = e.dataTransfer?.getData('application/igraphit-shape');
    const graph = graphRef.current;
    const graphDiv = graphDivRef.current;
    if (!shapeId || !graph || !graphDiv) return;

    const styleKey = IGRAPH_ID_STYLE_MAP[shapeId] ?? 'igraph.rectangle';
    const { w: dropW, h: dropH } = getDropSize(shapeId);

    const { x, y } = clientToGraphCoords(graph, e.clientX, e.clientY, graphDiv);

    const cx = Math.round((x - dropW / 2) / GRID_SIZE) * GRID_SIZE;
    const cy = Math.round((y - dropH / 2) / GRID_SIZE) * GRID_SIZE;

    try {
      // Where the dropped cell actually ends up — cx/cy (the raw cursor
      // position) for everything except a relationship-split, which
      // recenters onto the edge it just split (see centeredX/centeredY
      // below). Anything below that needs "where the shape actually is"
      // — currently just the magnet-attach check — must read this, not
      // cx/cy directly, or it searches around the wrong point.
      let finalX = cx;
      let finalY = cy;

      // Class Diagram's "Class" shape needs a container + 3 independently
      // editable compartments, not a single vertex — see insertUmlClassCell.
      let cell: any;
      if (shapeId === 'class-box') {
        cell = insertUmlClassCell(graph, cx, cy, dropW, dropH);
      } else if (shapeId === 'dfd-data-store' || shapeId === 'dfd-data-store-gs') {
        cell = insertDfdDataStoreCell(graph, cx, cy, dropW, dropH, shapeId === 'dfd-data-store-gs' ? 'gs' : 'yourdon');
      } else if (CONNECTOR_SHAPE_IDS.has(shapeId)) {
        // Connector/line shapes represent a connection, not a box — insert
        // as a real edge so the user can drag either end onto a shape and
        // have maxGraph actually connect them, same as any other edge. If
        // an end lands on or near an existing shape at drop time, attach it
        // immediately (magnet-style) instead of leaving it floating (see
        // findConnectorDropEndpoints above) — same as the matching branch in
        // create.tsx's handleAddShape and ConnectorArrowShapeCanvas.paintEdgeShape.
        const styleObject: CellStateStyle = {
          ...getShapeStyle(styleKey),
          fontColor: BLACK,
          fontSize: 12,
          labelBackgroundColor: CANVAS_BG,
        };

        let sourceCell: any;
        let targetCell: any;
        let startPoint: { x: number; y: number };
        let endPoint: { x: number; y: number };

        if (FISHBONE_MAIN_CAUSE_IDS.has(shapeId)) {
          // A Main Cause must branch off the spine specifically
          // (validateFishbone's 5.5) — the generic connector search below
          // would happily bracket/snap it onto whatever's nearest (the
          // Fish Head in particular, if dropped anywhere close to it),
          // which counts as "attached" structurally but is the wrong
          // parent. Searches only for the spine, never anything else, so a
          // Main Cause can only ever end up attached to it or fully
          // floating — never straight onto another shape.
          const centerX = cx + dropW / 2;
          const centerY = cy + dropH / 2;
          const dy = FISHBONE_DIAGONAL_UP.has(shapeId) ? -dropH : dropH;
          const spine = findEdgeNearPoint(graph, centerX, centerY, CONNECTOR_SNAP_DISTANCE, new Set(['fishbone-spine']));
          if (spine) {
            sourceCell = spine;
            targetCell = null;
            startPoint = { x: centerX, y: centerY };
            endPoint = { x: centerX + dropW, y: centerY + dy };
          } else {
            sourceCell = null;
            targetCell = null;
            startPoint = { x: centerX - dropW / 2, y: centerY - dy / 2 };
            endPoint = { x: centerX + dropW / 2, y: centerY + dy / 2 };
          }
        } else if (SEQUENCE_MESSAGE_SHAPE_IDS.has(shapeId)) {
          const dropY = cy + dropH / 2;
          const found = findSequenceMessageEndpoints(graph, x, dropY);
          sourceCell = found.source;
          targetCell = found.target;
          const sourceGeo = sourceCell?.getGeometry();
          const targetGeo = targetCell?.getGeometry();
          startPoint = sourceGeo ? { x: sourceGeo.x + sourceGeo.width, y: dropY } : { x: cx, y: dropY };
          endPoint = targetGeo ? { x: targetGeo.x, y: dropY } : { x: cx + dropW, y: dropY };
          Object.assign(styleObject, sequenceMessageConnectionStyle(sourceCell, targetCell, dropY));
        } else {
          const centerX = cx + dropW / 2;
          const centerY = cy + dropH / 2;
          const found = findConnectorDropEndpoints(graph, centerX, centerY, dropW);
          startPoint = found.startPoint;
          endPoint = found.endPoint;
          sourceCell = found.sourceCell;
          targetCell = found.targetCell;

          // A Main/Sub/Tertiary Cause dropped roughly on the spine finds
          // it as one real endpoint (almost always sourceCell — the spine
          // spans the whole horizontal probe below, so the left probe
          // point claims it first) with the other end left at the generic
          // horizontal fallback point — a flat line with one tip pinned to
          // the spine, not the diagonal "bone" every reference fishbone
          // diagram actually has. start is the spine-proximal end and end
          // is the outer/label end in both the fully-unattached case below
          // and the shape's own original (pre-connector) diagonal — see
          // FishboneCauseTopShapeCanvas's paintBackground in
          // maxgraph-custom-shapes.ts — so a partial attachment just needs
          // its still-dangling end pushed out to match that same diagonal,
          // anchored on whichever end is real instead of on the drop
          // center. Two real endpoints (bracketed between two actual
          // shapes) is left alone — trust that real geometry over forcing
          // an angle.
          const isDiagonalUp = FISHBONE_DIAGONAL_UP.has(shapeId);
          const isDiagonalDown = FISHBONE_DIAGONAL_DOWN.has(shapeId);
          if (isDiagonalUp || isDiagonalDown) {
            const dy = isDiagonalUp ? -dropH : dropH;
            if (!sourceCell && !targetCell) {
              startPoint = { x: centerX - dropW / 2, y: centerY - dy / 2 };
              endPoint = { x: centerX + dropW / 2, y: centerY + dy / 2 };
            } else if (sourceCell && !targetCell) {
              endPoint = { x: startPoint.x + dropW, y: startPoint.y + dy };
            } else if (!sourceCell && targetCell) {
              startPoint = { x: endPoint.x - dropW, y: endPoint.y - dy };
            }
          }

          // The spine's whole job is to reach the one Fish Head/Effect Box
          // in the diagram — unlike an ordinary connector's small fixed
          // snap radius (meant to pick the right one among several nearby
          // shapes), there's only ever one of these, so it should attach
          // no matter how far away it actually is. Only steps in when the
          // normal search above didn't already find something on the
          // right end — a real nearby/bracketed attachment always wins.
          // head !== sourceCell matters: dropped close enough to the head
          // that the generic search's left AND right probe points both
          // land on it, sourceCell already *is* the head (see the
          // exitX/exitY case below) — without this check this fallback
          // would then also assign the *same* head to targetCell, wiring
          // both ends of the edge to one identical cell. That degenerate
          // edge (not just a crooked line — an edge with no real "next"
          // direction between its two ends at all, since both are the
          // same shape) is what actually produced the artifact at the tip.
          if (shapeId === 'fishbone-spine' && !targetCell) {
            const head = findVertexByRole(graph, new Set(['fishbone-head', 'fishbone-problem']));
            if (head && head !== sourceCell) {
              targetCell = head;
              const headGeo = head.getGeometry();
              if (headGeo) endPoint = { x: headGeo.x, y: headGeo.y + headGeo.height / 2 };
            } else if (head && head === sourceCell) {
              // Give the still-dangling far end a clean, well-clear-of-the-
              // head point instead of leaving it at the original hEnd
              // probe point (which, dropped this close, could land inside
              // or barely past the head's own bounds) — reads the same as
              // a normal "dropped far away" spine once dragged/left alone.
              const headGeo = head.getGeometry();
              if (headGeo) {
                endPoint = { x: headGeo.x - Math.max(dropW, 120), y: headGeo.y + headGeo.height / 2 };
              }
            }
          }

          // The Fish Head's flat edge — where the spine should always meet
          // it — sits exactly at the horizontal center of its own bounding
          // box (see FishboneHeadShapeCanvas's paintBackground and its
          // 'igraph.fishboneHead' entry in IGRAPH_PERIMETERS), not spread
          // across the full left side the way a plain rectangle's edge is.
          // The normal *dynamic* floating-perimeter calculation only lands
          // exactly there when the spine's other end happens to be level
          // with the head's vertical center — anything even slightly off
          // instead resolves onto one of the triangle's slanted edges,
          // which is what actually produced a crooked, not-quite-
          // horizontal connection (and, when dropped close enough that
          // *both* the generic search's left and right probe points land
          // on the head at once — hSource claims it and the duplicate
          // hTarget candidate gets dropped, so it ends up as sourceCell,
          // not targetCell — a genuinely degenerate near-zero-length
          // "next" direction, which is what produced the thin sliver
          // artifact instead of a merely-crooked line). A fixed entry/exit
          // point at that exact spot (entryPerimeter/exitPerimeter:false
          // skips the dynamic calculation entirely) makes the attachment
          // deterministic no matter where the spine's other end is, or
          // which end the head ended up on. Scoped to 'fishbone-head'
          // specifically — Effect Box is a plain rectangle, where
          // (0.5, 0.5) would be its *interior* center, not a boundary point.
          if (shapeId === 'fishbone-spine' && targetCell && getShapeRole(targetCell) === 'fishbone-head') {
            styleObject.entryX = 0.5;
            styleObject.entryY = 0.5;
            styleObject.entryPerimeter = false;
          } else if (shapeId === 'fishbone-spine' && sourceCell && getShapeRole(sourceCell) === 'fishbone-head') {
            styleObject.exitX = 0.5;
            styleObject.exitY = 0.5;
            styleObject.exitPerimeter = false;
          }
        }

        cell = graph.insertEdge(null, null, '', sourceCell, targetCell, styleObject);
        const geometry = new Geometry(0, 0, 0, 0);
        geometry.setTerminalPoint(new Point(startPoint.x, startPoint.y), true);
        geometry.setTerminalPoint(new Point(endPoint.x, endPoint.y), false);
        graph.getDataModel().setGeometry(cell, geometry);
      } else {
        // ⭐ CRITICAL FIX: Use getShapeStyle to get the proper style
        const styleObject = getShapeStyle(styleKey);

        // Add text properties. Defaults come first so a shape with its own
        // label-position override (e.g. igraph.umlLifeline's verticalAlign:
        // 'top', to keep the name inside its header box instead of centered
        // on the whole tall shape) wins instead of being clobbered here.
        const fullStyle: CellStateStyle = {
          align: 'center' as AlignValue,
          verticalAlign: 'middle' as VAlignValue,
          whiteSpace: 'wrap' as WhiteSpaceValue,
          ...styleObject,
          fontColor: BLACK,
          fontSize: 12,
        };

        const label = getShapeDefinitionById(shapeId)?.defaultLabel ?? '';

        // ERD's Relationship / Identifying Relationship diamonds are meant
        // to sit *in* the line between two entities, not just visually on
        // top of it — dropped straight onto an existing connector, this
        // used to insert a free-floating vertex that only overlapped the
        // edge, obscuring it and making the entities look disconnected even
        // though the original edge underneath was untouched. Splitting the
        // edge for real (entity -> relationship -> entity, replacing the
        // single edge with two) is what actually wires the diamond into
        // the connection.
        const edgeCell = (shapeId === 'erd-relationship' || shapeId === 'erd-identifying-rel')
          ? findEdgeNearPoint(graph, x, y, CONNECTOR_SNAP_DISTANCE)
          : null;

        if (edgeCell && typeof edgeCell.isEdge === 'function' && edgeCell.isEdge()) {
          const source = edgeCell.getTerminal(true);
          const target = edgeCell.getTerminal(false);
          const edgeStyle = edgeCell.getStyle();
          // Cardinality connectors (see CONNECTOR_SHAPE_IDS) are tagged
          // with their own shapeId (e.g. 'erd-cardinality-mn') — reused on
          // both halves below so each still reads as "a cardinality
          // marker" for validateERD's 4.8 check instead of falling back to
          // an untagged, unrecognized edge until the next reload.
          const edgeRole = getShapeRole(edgeCell);
          // A cardinality connector splitting here used to show both of
          // its symbols (e.g. "1" and "N") again on *each* half — cloning
          // its whole style did that literally. cardinalitySide (read by
          // paintCardinalityEdge via cardinalityLabels in
          // maxgraph-custom-shapes.ts) tells each half which one symbol is
          // actually its: 'start' for the half whose source is the real
          // entity (Entity -1-> Relationship), 'end' for the half whose
          // target is (Relationship -N-> Entity) — same pattern as bendDx/
          // bendDy in maxgraph-universal-handler.ts for a style key that
          // isn't part of CellStateStyle's real type. A no-op on every
          // other connector shape, which never reads this key.
          const styleIsObject = typeof edgeStyle === 'object' && edgeStyle !== null;
          const leftEdgeStyle = (styleIsObject ? { ...edgeStyle, cardinalitySide: 'start' } : edgeStyle) as CellStateStyle;
          const rightEdgeStyle = (styleIsObject ? { ...edgeStyle, cardinalitySide: 'end' } : edgeStyle) as CellStateStyle;

          // Center the diamond on the straight line between the edge's two
          // actual endpoints — "entity -<>- entity" — instead of wherever
          // the cursor happened to land, so both resulting legs stay
          // equal-length and collinear instead of kinking to one side.
          // edgeEndpoint (above) falls back to the edge's own floating
          // terminal point on whichever end isn't a real attached cell yet,
          // rather than only centering when *both* ends are — a cardinality
          // connector with one end still dangling (not yet dragged onto a
          // second entity) is exactly the case that used to fall through to
          // the raw cursor position and land off-line.
          const startPoint = edgeEndpoint(edgeCell, true);
          const endPoint = edgeEndpoint(edgeCell, false);
          const midX = startPoint && endPoint ? (startPoint.x + endPoint.x) / 2 : cx + dropW / 2;
          const midY = startPoint && endPoint ? (startPoint.y + endPoint.y) / 2 : cy + dropH / 2;
          const centeredX = Math.round((midX - dropW / 2) / GRID_SIZE) * GRID_SIZE;
          const centeredY = Math.round((midY - dropH / 2) / GRID_SIZE) * GRID_SIZE;
          finalX = centeredX;
          finalY = centeredY;

          graph.batchUpdate(() => {
            cell = graph.insertVertex(null, null, label, centeredX, centeredY, dropW, dropH, fullStyle);
            graph.removeCells([edgeCell]);

            // Always recreate both halves, even where the original edge
            // wasn't actually attached to anything on that side (source/
            // target null — e.g. a cardinality dropped on empty canvas
            // with no entity nearby to snap onto yet). Skipping the
            // insertEdge call there — the previous behavior — deleted the
            // edge and never replaced it, so the whole cardinality marker
            // just vanished the instant a relationship landed on it
            // instead of ending up split. A floating end keeps exactly the
            // dangling look the original had; startPoint/endPoint (above)
            // are its remembered position either way.
            const leftEdge = graph.insertEdge(null, null, '', source, cell, leftEdgeStyle);
            if (!source && startPoint) {
              const leftGeo = new Geometry(0, 0, 0, 0);
              leftGeo.setTerminalPoint(new Point(startPoint.x, startPoint.y), true);
              graph.getDataModel().setGeometry(leftEdge, leftGeo);
            }
            tagShapeRole(leftEdge, edgeRole);

            const rightEdge = graph.insertEdge(null, null, '', cell, target, rightEdgeStyle);
            if (!target && endPoint) {
              const rightGeo = new Geometry(0, 0, 0, 0);
              rightGeo.setTerminalPoint(new Point(endPoint.x, endPoint.y), false);
              graph.getDataModel().setGeometry(rightEdge, rightGeo);
            }
            tagShapeRole(rightEdge, edgeRole);
          });
        } else {
          cell = graph.insertVertex(null, null, label, cx, cy, dropW, dropH, fullStyle);
        }
      }
      tagShapeRole(cell, shapeId);

      // The reverse order from the spine's own special-case above — a Fish
      // Head/Effect Box dropped after the spine already exists (dangling,
      // waiting for it) attaches no matter how far away it lands, same
      // reasoning: there's only ever one spine to find.
      if ((shapeId === 'fishbone-head' || shapeId === 'fishbone-problem') && cell) {
        const danglingSpine = findDanglingEdgeByRole(graph, new Set(['fishbone-spine']));
        if (danglingSpine) {
          graph.getDataModel().setTerminal(danglingSpine.edge, cell, danglingSpine.isSource);
          // Same fixed-point reasoning as the spine's own drop-time
          // special case above (see the entryX/entryY comment there) —
          // pins the connection to the flat edge's exact midpoint instead
          // of leaving it to the dynamic floating-perimeter calculation,
          // which is only guaranteed to land there when the spine's other
          // end happens to be level with this cell's vertical center.
          // Scoped to 'fishbone-head' only — Effect Box is a plain
          // rectangle, where (0.5, 0.5) would be its interior center, not
          // a boundary point.
          if (shapeId === 'fishbone-head') {
            const edgeStyle = danglingSpine.edge.getStyle();
            const base = typeof edgeStyle === 'object' && edgeStyle !== null ? edgeStyle : {};
            const fixedPoint = danglingSpine.isSource
              ? { exitX: 0.5, exitY: 0.5, exitPerimeter: false }
              : { entryX: 0.5, entryY: 0.5, entryPerimeter: false };
            graph.getDataModel().setStyle(danglingSpine.edge, { ...base, ...fixedPoint } as CellStateStyle);
          }
        }
      }

      // A shape dropped near an existing connector's loose end should
      // attach to it automatically — the mirror of the magnet-snap a
      // freshly-dropped connector's own ends already get (see
      // findConnectorDropEndpoints above): there the connector is new and
      // the shape's already on the canvas, here it's the other way
      // around. Deliberately not gated on the shape landing with zero
      // connections of its own — an ERD Relationship in particular can
      // come out of the split branch above already holding one leg and
      // still have a second, independently-dropped cardinality sitting
      // dangling right next to it (e.g. placed before its far entity
      // existed), which should attach here too. Checks every dangling
      // edge within range, not just the first, so more than one loose end
      // near the drop gets picked up in the same drop.
      if (cell && typeof cell.isVertex === 'function' && cell.isVertex()) {
        const anchorX = finalX + dropW / 2;
        const anchorY = finalY + dropH / 2;
        for (const edge of graph.getChildEdges(graph.getDefaultParent())) {
          if (edge.source && edge.target) continue;
          const geo = edge.getGeometry();
          if (!edge.source) {
            const p = geo?.getTerminalPoint(true);
            if (p && Math.hypot(p.x - anchorX, p.y - anchorY) <= CONNECTOR_SNAP_DISTANCE) {
              graph.getDataModel().setTerminal(edge, cell, true);
              continue;
            }
          }
          if (!edge.target) {
            const p = geo?.getTerminalPoint(false);
            if (p && Math.hypot(p.x - anchorX, p.y - anchorY) <= CONNECTOR_SNAP_DISTANCE) {
              graph.getDataModel().setTerminal(edge, cell, false);
            }
          }
        }
      }

      graph.clearSelection();
      setTimeout(() => {
        graph.setSelectionCell(cell);
        handleSelectionChange();
      }, 10);

      console.log(`✅ Dropped "${shapeId}" as "${styleKey}" at (${cx}, ${cy}) with size ${dropW}x${dropH}`);
    } catch (err) {
      console.error('Drop error:', err);
    }
  }, [handleSelectionChange]);

  // ════════════════════════════════════════════════════════════════════════════
  // ⭐ Create a new shape adjacent to `sourceCell`, connected by an edge.
  // With no shapeId, clones the source's own style/size (used when there's
  // nothing to pick from). With a shapeId, uses that shape's own default
  // style/size instead — so choosing "Decision" from the picker gets a real
  // diamond, not the source shape's box stretched into one.
  // ════════════════════════════════════════════════════════════════════════════

  const createShapeInDirection = useCallback((
    sourceCell: any,
    dir: { dx: number; dy: number },
    rotation: number,
    geo: { x: number; y: number; width: number; height: number },
    scale: number,
    shapeId?: string,
  ) => {
    const graph = graphRef.current;
    if (!graph) return;

    const { w: newW, h: newH } = shapeId ? getDropSize(shapeId) : { w: geo.width, h: geo.height };

    const sourceCenterX = geo.x + geo.width / 2;
    const sourceCenterY = geo.y + geo.height / 2;
    const halfSourceExtent = dir.dx !== 0 ? geo.width / 2 : geo.height / 2;
    const halfNewExtent = dir.dx !== 0 ? newW / 2 : newH / 2;
    const gap = NEW_SHAPE_SPACING / scale;
    const distance = halfSourceExtent + gap + halfNewExtent;

    const rotatedOffset = rotateVector(dir.dx * distance, dir.dy * distance, rotation);
    const roundedX = Math.round((sourceCenterX + rotatedOffset.x - newW / 2) / GRID_SIZE) * GRID_SIZE;
    const roundedY = Math.round((sourceCenterY + rotatedOffset.y - newH / 2) / GRID_SIZE) * GRID_SIZE;

    let newCell: any;
    if (shapeId === 'class-box' || (!shapeId && isUmlClassContainerCell(sourceCell))) {
      newCell = insertUmlClassCell(graph, roundedX, roundedY, newW, newH);
    } else if (
      shapeId === 'dfd-data-store' || shapeId === 'dfd-data-store-gs' ||
      (!shapeId && isDfdDataStoreContainerCell(sourceCell))
    ) {
      const sourceStyle = !shapeId ? sourceCell.getStyle() : undefined;
      const isGS = shapeId === 'dfd-data-store-gs' ||
        (!shapeId && typeof sourceStyle === 'object' && sourceStyle?.shape === 'igraph.dfdDataStoreGSContainer');
      newCell = insertDfdDataStoreCell(graph, roundedX, roundedY, newW, newH, isGS ? 'gs' : 'yourdon');
    } else {
      let shapeStyle: CellStateStyle;
      if (shapeId) {
        const styleKey = IGRAPH_ID_STYLE_MAP[shapeId] ?? 'igraph.rectangle';
        // Alignment defaults come first so a shape with its own label-
        // position override (e.g. igraph.umlLifeline's verticalAlign:
        // 'top') wins instead of being clobbered here.
        shapeStyle = {
          align: 'center' as AlignValue,
          verticalAlign: 'middle' as VAlignValue,
          whiteSpace: 'wrap' as WhiteSpaceValue,
          ...getShapeStyle(styleKey),
          fontColor: BLACK,
          fontSize: 12,
        };
      } else {
        // Legacy "clone" path — keep the source cell's own style (its chosen
        // colors included), just applied to a freshly created cell.
        const sourceStyle = sourceCell.getStyle();
        const styleObj = typeof sourceStyle === 'string' ? {} : (sourceStyle ?? {});
        const newShapeKey = styleObj.shape || 'igraph.rectangle';
        const newShapePerimeter = IGRAPH_PERIMETERS[newShapeKey];
        shapeStyle = {
          shape: newShapeKey,
          fillColor: styleObj.fillColor || '#ffffff',
          strokeColor: styleObj.strokeColor || BLACK,
          strokeWidth: styleObj.strokeWidth || 2,
          fontColor: styleObj.fontColor || BLACK,
          fontSize: styleObj.fontSize || 12,
          align: (styleObj.align as AlignValue) || 'center',
          verticalAlign: (styleObj.verticalAlign as VAlignValue) || 'middle',
          whiteSpace: (styleObj.whiteSpace as WhiteSpaceValue) || 'wrap',
          ...(newShapePerimeter ? { perimeter: newShapePerimeter } : {}),
        };
      }

      newCell = graph.insertVertex(null, null, '', roundedX, roundedY, newW, newH, shapeStyle);
    }
    tagShapeRole(newCell, shapeId ?? getShapeRole(sourceCell));

    const edgeStyle = {
      strokeColor: BLACK,
      strokeWidth: 2,
      edgeStyle: 'orthogonalEdgeStyle',
      fontColor: BLACK,
      labelBackgroundColor: CANVAS_BG,
    };
    graph.insertEdge(null, null, '', sourceCell, newCell, edgeStyle);

    graph.clearSelection();
    setTimeout(() => {
      graph.setSelectionCell(newCell);
      handleSelectionChange();
    }, 10);
  }, [handleSelectionChange]);

  // ════════════════════════════════════════════════════════════════════════════
  // ⭐ DRAW.IO STYLE: CLICK ARROWS (Top, Bottom, Left, Right)
  // ════════════════════════════════════════════════════════════════════════════

  const setupClickArrows = useCallback((graph: Graph) => {
    const container = graph.container;
    if (!container) return;

    let arrowDivs: HTMLDivElement[] = [];
    let currentArrowCell: any = null;

    function createArrowSVG(direction: 'up' | 'down' | 'left' | 'right', size: number = 16, rotation: number = 0): string {
      const half = size / 2;
      let points: string;

      switch (direction) {
        case 'up':
          points = `${half},2 ${size - 2},${size - 2} 2,${size - 2}`;
          break;
        case 'down':
          points = `${half},${size - 2} ${size - 2},2 2,2`;
          break;
        case 'left':
          points = `2,${half} ${size - 2},${size - 2} ${size - 2},2`;
          break;
        case 'right':
          points = `${size - 2},${half} 2,2 2,${size - 2}`;
          break;
      }

      const rotateStyle = rotation ? ` style="transform: rotate(${rotation}deg)"` : '';
      return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"${rotateStyle}><polygon points="${points}" fill="currentColor"/></svg>`;
    }

    function createArrowButtons(cell: any) {
      arrowDivs.forEach(div => div.remove());
      arrowDivs = [];

      const geo = cell.getGeometry();
      if (!geo) return;

      // Connector/line shapes get their own endpoint + midpoint drag handles
      // (see UniversalVertexHandler) instead of these "add adjacent shape"
      // arrows — for a thin line, up/down/left/right branching doesn't read
      // the same way it does for a box, and the two UIs would otherwise
      // visually collide right on top of each other.
      const isConnector = isConnectorCell(cell);

      const view = graph.getView();
      const scale = view.getScale();

      // Use maxGraph's own rendered bounds (already scaled/translated, and
      // reflecting whatever the shape's paint function actually drew) rather
      // than re-deriving them from geometry + scale/translate by hand — for
      // some shapes that manual math didn't match the true painted size.
      const state = view.getState(cell);
      if (!state) return;

      const cx = state.x + state.width / 2;
      const cy = state.y + state.height / 2;
      const w = state.width;
      const h = state.height;
      const rotation = state.style?.rotation ?? 0;

      const spacing = 14;
      const arrowSize = 14;
      const restColor = '#a8c5ff';
      const hoverColor = '#4c6fff';

      const directions: { dx: number; dy: number; label: 'up' | 'down' | 'left' | 'right' }[] = [
        { dx: 0, dy: -1, label: 'up' },
        { dx: 0, dy: 1, label: 'down' },
        { dx: -1, dy: 0, label: 'left' },
        { dx: 1, dy: 0, label: 'right' },
      ];

      if (!isConnector) {
        directions.forEach((dir) => {
          const div = document.createElement('div');
          const offset = rotateVector(dir.dx * (w / 2 + spacing), dir.dy * (h / 2 + spacing), rotation);
          const x = cx + offset.x;
          const y = cy + offset.y;

          div.style.position = 'absolute';
          div.style.left = (x - arrowSize / 2) + 'px';
          div.style.top = (y - arrowSize / 2) + 'px';
          div.style.width = arrowSize + 'px';
          div.style.height = arrowSize + 'px';
          div.style.cursor = 'pointer';
          div.style.pointerEvents = 'all';
          div.style.zIndex = '10';
          div.style.display = 'flex';
          div.style.alignItems = 'center';
          div.style.justifyContent = 'center';
          div.style.color = restColor;
          div.style.transition = 'color 0.15s ease, transform 0.15s ease';
          div.style.userSelect = 'none';

          div.innerHTML = createArrowSVG(dir.label, arrowSize, rotation);

          div.addEventListener('mouseenter', () => {
            div.style.color = hoverColor;
            div.style.transform = 'scale(1.25)';
          });
          div.addEventListener('mouseleave', () => {
            div.style.color = restColor;
            div.style.transform = 'scale(1)';
          });

          div.addEventListener('click', (e) => {
            e.stopPropagation();
            e.preventDefault();

            // Draw.io-style: don't create anything yet — open a picker of
            // shapes the user can choose to connect next. x/y anchor the
            // popup at the same spot as the arrow itself. setShapePicker has a
            // stable identity (a useState setter), so it's safe to reach for
            // here without adding it to setupClickArrows's own dependencies.
            setShapePicker({
              x,
              y,
              sourceCell: cell,
              dir: { dx: dir.dx, dy: dir.dy },
              rotation,
              geo: { x: geo.x, y: geo.y, width: geo.width, height: geo.height },
              scale,
            });
            removeArrowButtons();
          });

          container.appendChild(div);
          arrowDivs.push(div);
        });
      }

      // Mobile-only: a floating delete button pinned diagonally past the
      // shape's top-left corner. Desktop has the physical Delete/Backspace
      // key for this; mobile has no keyboard at all, so without this a
      // touch user could select a shape but never remove it.
      // Top-right is already crowded (the rotation handle sits diagonally
      // past that exact corner — see getRotationHandlePosition in
      // maxgraph-universal-handler.ts), and every corner/edge-midpoint has
      // a resize dot sitting right on it, so this needs real outward
      // clearance, not just a different corner.
      if (isMobile) {
        const delSize = 22;
        const delOffset = 16;
        const delDiv = document.createElement('div');
        const cornerOffset = rotateVector(-(w / 2 + delOffset), -(h / 2 + delOffset), rotation);
        const dx = cx + cornerOffset.x;
        const dy = cy + cornerOffset.y;

        delDiv.style.position = 'absolute';
        delDiv.style.left = (dx - delSize / 2) + 'px';
        delDiv.style.top = (dy - delSize / 2) + 'px';
        delDiv.style.width = delSize + 'px';
        delDiv.style.height = delSize + 'px';
        delDiv.style.borderRadius = '50%';
        delDiv.style.backgroundColor = '#ef4444';
        delDiv.style.display = 'flex';
        delDiv.style.alignItems = 'center';
        delDiv.style.justifyContent = 'center';
        delDiv.style.cursor = 'pointer';
        delDiv.style.pointerEvents = 'all';
        delDiv.style.zIndex = '11';
        delDiv.style.boxShadow = '0 2px 6px rgba(0,0,0,0.3)';
        delDiv.style.userSelect = 'none';
        delDiv.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6h14z" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';

        delDiv.addEventListener('click', (e) => {
          e.stopPropagation();
          e.preventDefault();
          graph.removeCells([cell]);
          removeArrowButtons();
        });

        container.appendChild(delDiv);
        arrowDivs.push(delDiv);
      }
    }

    function removeArrowButtons() {
      arrowDivs.forEach(div => div.remove());
      arrowDivs = [];
      currentArrowCell = null;
    }

    const selectionHandler = () => {
      const selection = graph.getSelectionCells();
      const selected = selection.length === 1 ? selection[0] : null;

      // Connector/line cells are real edges now (see handleAddShape/
      // handleDrop), so this used to be vertex-only and silently skipped
      // them — on mobile (no physical Delete key) that meant a selected
      // connector had no way to be removed at all, since createArrowButtons
      // is what renders the floating trash button below. It already skips
      // the directional "add adjacent shape" arrows for connector-styled
      // cells via isConnectorCell, so allowing edges through here only adds
      // the delete button, not those arrows.
      if (selected && ((selected.isVertex && selected.isVertex()) || (selected.isEdge && selected.isEdge()))) {
        if (currentArrowCell !== selected) {
          removeArrowButtons();
          currentArrowCell = selected;
          setTimeout(() => {
            if (currentArrowCell === selected) {
              createArrowButtons(selected);
            }
          }, 50);
        }
      } else {
        removeArrowButtons();
      }
    };

    graph.getSelectionModel().addListener(InternalEvent.CHANGE, selectionHandler);

    // Moving/resizing the selected shape doesn't change *which* cell is
    // selected, so selectionHandler above never re-fires and the arrows were
    // left stuck at the shape's old position. Re-derive their position from
    // the (now-updated) geometry whenever the model changes.
    //
    // The CHANGE event fires before the view has revalidated/repainted the
    // new bounds, so reading view.getState(cell) synchronously here still
    // returns the pre-resize size — arrows would end up positioned as if
    // the shape were still its old (e.g. shorter) size. Defer a tick so the
    // view's own state update has run first.
    const geometryChangeHandler = () => {
      if (currentArrowCell) {
        const cell = currentArrowCell;
        setTimeout(() => {
          if (currentArrowCell === cell) {
            createArrowButtons(cell);
          }
        }, 0);
      }
    };

    graph.getDataModel().addListener(InternalEvent.CHANGE, geometryChangeHandler);

    const clickOutsideHandler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.mxCell') && !target.closest('.mxRubberband')) {
        removeArrowButtons();
      }
    };

    return () => {
      graph.getSelectionModel().removeListener(selectionHandler);
      graph.getDataModel().removeListener(geometryChangeHandler);
      removeArrowButtons();
    };

  }, [handleSelectionChange, isMobile]);

  // ════════════════════════════════════════════════════════════════════════════
  // ⭐ DRAW.IO STYLE: HOVER CONNECTION POINTS
  // ════════════════════════════════════════════════════════════════════════════

  const setupHoverUI = useCallback((graph: Graph) => {
    const container = graph.container;
    if (!container) return;

    let connectionPointsDivs: HTMLDivElement[] = [];
    let hoverArrowDivs: HTMLDivElement[] = [];
    let currentHoveredCell: any = null;
    let hoverTimeout: ReturnType<typeof setTimeout> | null = null;
    let lastHoveredCell: any = null;

    function createConnectionPoints(cell: any) {
      connectionPointsDivs.forEach(div => div.remove());
      connectionPointsDivs = [];

      const geo = cell.getGeometry();
      if (!geo) return;

      const view = graph.getView();

      // Same fix as createArrowButtons/createHoverArrows: use maxGraph's own
      // rendered bounds rather than manually re-deriving them from geometry
      // + scale/translate, which didn't match the true painted size for some
      // shapes.
      const state = view.getState(cell);
      if (!state) return;

      const w = state.width;
      const h = state.height;
      const cx = state.x + w / 2;
      const cy = state.y + h / 2;
      const rotation = state.style?.rotation ?? 0;

      const offsets = [
        { x: 0, y: -h / 2 },
        { x: 0, y: h / 2 },
        { x: -w / 2, y: 0 },
        { x: w / 2, y: 0 },
        { x: -w / 2, y: -h / 2 },
        { x: w / 2, y: -h / 2 },
        { x: -w / 2, y: h / 2 },
        { x: w / 2, y: h / 2 },
      ];

      const points = offsets.map((o) => {
        const r = rotateVector(o.x, o.y, rotation);
        return { x: cx + r.x, y: cy + r.y };
      });

      points.forEach((pt) => {
        const div = document.createElement('div');
        div.style.position = 'absolute';
        div.style.left = (pt.x - 6) + 'px';
        div.style.top = (pt.y - 6) + 'px';
        div.style.width = '12px';
        div.style.height = '12px';
        div.style.cursor = 'crosshair';
        div.style.pointerEvents = 'all';
        div.style.zIndex = '10';
        div.style.display = 'flex';
        div.style.alignItems = 'center';
        div.style.justifyContent = 'center';

        div.innerHTML = `
          <svg width="10" height="10" viewBox="0 0 10 10">
            <line x1="1" y1="1" x2="9" y2="9" stroke="${BLUE}" stroke-width="1.5" stroke-linecap="round"/>
            <line x1="9" y1="1" x2="1" y2="9" stroke="${BLUE}" stroke-width="1.5" stroke-linecap="round"/>
            <circle cx="5" cy="5" r="1.5" fill="${BLUE}" opacity="0.6"/>
          </svg>
        `;

        div.addEventListener('mouseenter', () => {
          div.style.transform = 'scale(1.3)';
          div.style.transition = 'transform 0.1s ease';
        });
        div.addEventListener('mouseleave', () => {
          div.style.transform = 'scale(1)';
        });

        container.appendChild(div);
        connectionPointsDivs.push(div);
      });
    }

    function createHoverArrows(cell: any) {
      hoverArrowDivs.forEach(div => div.remove());
      hoverArrowDivs = [];

      const geo = cell.getGeometry();
      if (!geo) return;

      // Connector/line shapes don't get "add adjacent shape" arrows at all
      // (see the matching check in createArrowButtons) — no hover preview
      // for a UI that isn't there once selected.
      if (isConnectorCell(cell)) return;

      const view = graph.getView();

      // Same fix as createArrowButtons: use maxGraph's own rendered bounds
      // rather than manually re-deriving them from geometry + scale/translate.
      const state = view.getState(cell);
      if (!state) return;

      const cx = state.x + state.width / 2;
      const cy = state.y + state.height / 2;
      const w = state.width;
      const h = state.height;
      const rotation = state.style?.rotation ?? 0;

      const spacing = 18;
      const arrowSize = 10;

      const directions = [
        { dx: 0, dy: -1, angle: 0 },
        { dx: 0, dy: 1, angle: 180 },
        { dx: -1, dy: 0, angle: -90 },
        { dx: 1, dy: 0, angle: 90 },
      ];

      directions.forEach((dir) => {
        const div = document.createElement('div');
        const offset = rotateVector(dir.dx * (w / 2 + spacing), dir.dy * (h / 2 + spacing), rotation);
        const x = cx + offset.x;
        const y = cy + offset.y;

        div.style.position = 'absolute';
        div.style.left = (x - arrowSize / 2) + 'px';
        div.style.top = (y - arrowSize / 2) + 'px';
        div.style.width = arrowSize + 'px';
        div.style.height = arrowSize + 'px';
        div.style.cursor = 'pointer';
        div.style.pointerEvents = 'all';
        div.style.zIndex = '10';
        div.style.display = 'flex';
        div.style.alignItems = 'center';
        div.style.justifyContent = 'center';
        div.style.opacity = '0.5';
        div.style.transition = 'opacity 0.15s ease, transform 0.15s ease';

        div.innerHTML = `
          <svg width="${arrowSize}" height="${arrowSize}" viewBox="0 0 12 12" style="transform: rotate(${dir.angle + rotation}deg)">
            <polygon points="2,6 10,2 10,10" fill="${BLUE}"/>
          </svg>
        `;

        div.addEventListener('mouseenter', () => {
          div.style.opacity = '1';
          div.style.transform = 'scale(1.3)';
        });
        div.addEventListener('mouseleave', () => {
          div.style.opacity = '0.5';
          div.style.transform = 'scale(1)';
        });

        container.appendChild(div);
        hoverArrowDivs.push(div);
      });
    }

    function showHoverUI(cell: any) {
      if (!cell || !cell.isVertex()) return;
      if (currentHoveredCell === cell) return;

      hideHoverUI();
      currentHoveredCell = cell;
      createConnectionPoints(cell);
      createHoverArrows(cell);
    }

    function hideHoverUI() {
      connectionPointsDivs.forEach(div => div.remove());
      connectionPointsDivs = [];
      hoverArrowDivs.forEach(div => div.remove());
      hoverArrowDivs = [];
      currentHoveredCell = null;
    }

    function findCellUnderMouse(mx: number, my: number): any {
      const root = graph.getDataModel().getRoot();
      const allCells: any[] = [];

      function collectCells(cell: any) {
        if (!cell) return;
        allCells.push(cell);
        const children = graph.getChildCells(cell, true, true);
        if (children && children.length > 0) {
          children.forEach((child: any) => collectCells(child));
        }
      }

      collectCells(root);

      for (const cell of allCells) {
        if (cell.isVertex && cell.isVertex()) {
          const geo = cell.getGeometry();
          if (geo) {
            const view = graph.getView();
            const scale = view.getScale();
            const translate = view.getTranslate();

            const cx = (geo.x + translate.x) * scale;
            const cy = (geo.y + translate.y) * scale;
            const cw = geo.width * scale;
            const ch = geo.height * scale;

            if (mx >= cx && mx <= cx + cw && my >= cy && my <= cy + ch) {
              return cell;
            }
          }
        }
      }
      return null;
    }

    container.addEventListener('mousemove', (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;

      const foundCell = findCellUnderMouse(mx, my);

      if (foundCell) {
        if (hoverTimeout) {
          clearTimeout(hoverTimeout);
          hoverTimeout = null;
        }
        if (foundCell !== lastHoveredCell) {
          lastHoveredCell = foundCell;
          showHoverUI(foundCell);
        }
      } else {
        if (!hoverTimeout) {
          hoverTimeout = setTimeout(() => {
            hideHoverUI();
            lastHoveredCell = null;
            hoverTimeout = null;
          }, 150);
        }
      }
    });

    container.addEventListener('mouseleave', () => {
      if (hoverTimeout) {
        clearTimeout(hoverTimeout);
        hoverTimeout = null;
      }
      hideHoverUI();
      lastHoveredCell = null;
    });

    console.log('✅ Draw.io style hover UI enabled');
  }, []);

  // ─── INIT GRAPH ────────────────────────────────────────────────────────────

  const initGraph = useCallback(() => {
    const graphDiv = graphDivRef.current;
    const gc = gridCanvasRef.current;
    const wrapper = wrapperRef.current;
    if (!graphDiv || !gc || !wrapper) return undefined;

    setError(null);
    setLoading(true);

    let destroyed = false;
    const timers: ReturnType<typeof setTimeout>[] = [];
    let cleanupClickArrows: (() => void) | undefined;

    try {
      console.log('🔄 Initializing maxGraph...');

      gc.width = wrapper.offsetWidth;
      gc.height = wrapper.offsetHeight;

      // Native ResizeObserver, not the focus-event timing DiagramCanvasHandle.
      // refresh() used to rely on alone — it's the browser telling us the
      // container's real post-layout size, guaranteed to fire exactly when
      // a hidden (display:none, 0×0) tab becomes visible again and settles
      // to its real size, however many reflow passes that actually takes.
      // Calling the graph's own sizeDidChange() here (not just resizing the
      // grid background canvas) is what makes the graph re-measure its
      // container and actually redraw at the right size — without it, a
      // shape dropped before switching away can come back looking like it
      // vanished, when it was only ever the SVG still sized/painted for the
      // container's collapsed dimensions.
      const ro = new ResizeObserver(() => {
        resizeGridCanvas();
        repaintGrid();
        // Skipped while a label is being edited: on mobile, the on-screen
        // keyboard opening shrinks the viewport, which fires this same
        // ResizeObserver. sizeDidChange() re-measures and rebuilds the
        // graph's cell view states — and maxGraph's own CellEditorHandler
        // has its own `window: 'resize'` listener that checks whether the
        // editing cell still has a valid state, closing the editor if not.
        // If our rebuild here ran first and momentarily left that state
        // null, the editor saw that and immediately called stopEditing() —
        // which is why the keyboard popped up and vanished right after
        // double-tapping a shape. The container's real resize once editing
        // ends will still fire this observer again, so nothing is lost by
        // waiting.
        const graph = graphRef.current as any;
        if (graph?.isEditing?.()) return;
        if (wrapper.offsetWidth > 0 && wrapper.offsetHeight > 0) {
          graph?.sizeDidChange();
        }
      });
      ro.observe(wrapper);

      InternalEvent.disableContextMenu(graphDiv);

      graphDiv.style.position = 'absolute';
      graphDiv.style.overflow = 'hidden';
      graphDiv.style.width = '100%';
      graphDiv.style.height = '100%';
      graphDiv.style.cursor = 'default';
      graphDiv.style.userSelect = 'none';
      // Stops the browser from treating a two-finger pinch as native page
      // zoom (which would otherwise race our own pinch handling below).
      graphDiv.style.touchAction = 'none';

      const graph = new Graph(graphDiv);
      graphRef.current = graph;

      // Off by default in maxGraph (TooltipHandler.enabled starts false) —
      // needed so hovering a validation badge (see runFlowchartValidation)
      // actually shows its message via the native tooltip. Only fires for
      // real mouse hover (TooltipHandler ignores touch events by design),
      // which is why the badge's CLICK listener also shows the same
      // message in issuePopup — that's the path touch/mobile actually uses.
      graph.setTooltips(true);

      const defaultEdgeStyle = graph.getStylesheet().getDefaultEdgeStyle();
      defaultEdgeStyle.strokeColor = BLACK;
      defaultEdgeStyle.strokeWidth = 2;
      // Opaque label background so a label sits "in-line" on the connector
      // (the stroke appears to break around the text, e.g. "---- Yes ---->")
      // instead of the text floating over an unbroken line.
      defaultEdgeStyle.fontColor = BLACK;
      defaultEdgeStyle.labelBackgroundColor = CANVAS_BG;

      const stylesheet = graph.getStylesheet();
      const edgeStyleNames = ['defaultEdge', 'edgeStyle', 'roundedEdge', 'orthogonalEdge', 'entityRelation', 'arrow', 'connector'];
      edgeStyleNames.forEach(styleName => {
        const style = stylesheet.styles.get(styleName);
        if (style) {
          style.strokeColor = BLACK;
          style.fontColor = BLACK;
          style.labelBackgroundColor = CANVAS_BG;
          stylesheet.styles.set(styleName, style);
        }
      });

      console.log('⚫ Default edge style set to BLACK');

      const connectionHandler = graph.getPlugin('ConnectionHandler') as ConnectionHandler | null;

      if (connectionHandler) {
        // @ts-ignore
        const constraintHandler = connectionHandler.constraintHandler;
        if (constraintHandler) {
          constraintHandler.highlightColor = BLUE;
        }
        if (connectionHandler.marker) {
          connectionHandler.marker.validColor = BLUE;
        }
        // @ts-ignore
        connectionHandler.highlightColor = BLUE;
      }

      const styleElement = document.createElement('style');
      styleElement.id = 'igraph-force-blue';
      styleElement.textContent = `
        .mxCellHighlight {
          stroke: ${BLUE} !important;
          fill: rgba(76, 111, 255, 0.08) !important;
        }
        .mxRubberband {
          position: absolute !important;
          overflow: hidden !important;
          border-color: ${BLUE} !important;
          background: rgba(76, 111, 255, 0.1) !important;
        }
        .mxConnectionPoint {
          background: ${BLUE} !important;
          border-color: ${BLUE} !important;
        }
        .mxHandle {
          background: #ffffff !important;
          border: 1.5px solid ${BLUE} !important;
        }
        .mxHandle:hover {
          background: ${BLUE} !important;
        }
        .mxCell {
          stroke: ${BLACK} !important;
        }
        .mxEdge {
          stroke: ${BLACK} !important;
        }
        .mxEdgeSelection {
          stroke: ${BLUE} !important;
        }
      `;
      document.head.appendChild(styleElement);
      console.log('🔵 Force blue CSS injected with black edges');

      graph.createVertexHandler = (state: CellState) => {
        return new UniversalVertexHandler(state);
      };
      console.log('✅ Universal Vertex Handler bound to graph');

      registerShapeStyles(graph);

      graph.setGridEnabled(true);
      graph.setGridSize(GRID_SIZE);
      graph.setConnectable(true);
      // A dangling (one- or both-ends-unattached) edge is already a core,
      // intentional state throughout this app — a connector dropped with
      // no shape nearby to snap onto, or half of a relationship split
      // whose far side isn't wired up yet, both create one on purpose (see
      // handleDrop below). `false` here didn't stop any of that — it only
      // blocked the *interactive* version of the same thing: EdgeHandler
      // silently discards the whole drag (no model update, no error
      // shown — see its mouseUp) if you drag an end onto empty canvas
      // instead of another shape, which is exactly how you'd manually
      // stretch a still-dangling cardinality leg longer. That's the
      // "drags but snaps back" behavior — nothing was actually broken,
      // this flag was just disallowing something the app depends on.
      graph.setAllowDanglingEdges(true);
      graph.setDisconnectOnMove(false);
      graph.setMultigraph(false);
      graph.setTooltips(true);
      graph.setAutoSizeCells(false);
      graph.setEnterStopsCellEditing(true);
      graph.setHtmlLabels(true);
      graph.setCellsMovable(true);
      graph.setCellsSelectable(true);
      graph.setCellsResizable(true);
      graph.setCellsEditable(true);
      graph.setCellsDeletable(true);
      graph.setPanning(true);

      // ─── UML Class compartments / Sequence Lifeline ────────────────────
      // Enter normally commits/stops editing everywhere (setEnterStopsCell
      // Editing above) so a shape's whole label stays a quick single line.
      // A class compartment (name/attributes/methods) or a lifeline's
      // object-name header legitimately needs multiple lines (one attribute
      // per line; a long object/class name that wraps), so Enter there
      // should insert a newline instead — overriding isStopEditingEvent to
      // return false for Enter on those cells lets the keystroke fall
      // through to the editor's native (browser) newline behavior untouched.
      const cellEditorHandler = graph.getPlugin('CellEditorHandler') as any;
      if (cellEditorHandler) {
        const defaultIsStopEditingEvent = cellEditorHandler.isStopEditingEvent.bind(cellEditorHandler);
        cellEditorHandler.isStopEditingEvent = (evt: KeyboardEvent) => {
          const editingCell = cellEditorHandler.getEditingCell?.();
          if (
            editingCell &&
            (isUmlClassCompartmentCell(editingCell) || isUmlLifelineCell(editingCell)) &&
            evt.keyCode === 13 &&
            !evt.ctrlKey &&
            !evt.shiftKey
          ) {
            return false;
          }
          return defaultIsStopEditingEvent(evt);
        };

        // CellEditorHandler already calls resize() on every keystroke on its
        // own (autoSize, default true — see its installListeners) to keep
        // the floating textarea's own size matched to its content. Growing
        // the underlying CELL happens here too, piggybacking on that same
        // per-keystroke call, so pressing Enter inside a compartment (or the
        // Lifeline's name) grows the box live, right as the newline lands,
        // instead of only once the edit commits. The cell's own value isn't
        // updated yet mid-edit — getCurrentValue reads the textarea's actual
        // in-progress text instead.
        const defaultResize = cellEditorHandler.resize.bind(cellEditorHandler);
        cellEditorHandler.resize = (...args: unknown[]) => {
          const editingCell = cellEditorHandler.getEditingCell?.();
          if (editingCell) {
            const state = graph.getView().getState(editingCell);
            const liveValue = state ? cellEditorHandler.getCurrentValue(state) : undefined;
            if (typeof liveValue === 'string') {
              if (isUmlClassCompartmentCell(editingCell)) {
                resizeClassCompartmentToFitText(graph, editingCell, liveValue);
              } else if (isUmlLifelineCell(editingCell)) {
                resizeLifelineHeaderToFitText(graph, editingCell, liveValue);
              }
            }
          }
          return defaultResize(...args);
        };
      }

      // Once an edit commits, grow/shrink that compartment (and the
      // container) to fit its new line count.
      graph.addListener(InternalEvent.LABEL_CHANGED, (_sender: any, evt: any) => {
        const cell = evt.getProperty('cell');
        if (cell && isUmlClassCompartmentCell(cell)) {
          resizeClassCompartmentToFitText(graph, cell);
        }
        if (cell && isUmlLifelineCell(cell)) {
          resizeLifelineHeaderToFitText(graph, cell);
        }
      });

      // Dragging a class container's own resize handle needs its
      // (non-resizable) compartments kept in sync with the new bounds.
      graph.addListener(InternalEvent.CELLS_RESIZED, (_sender: any, evt: any) => {
        const resized = evt.getProperty('cells') as any[] | undefined;
        resized?.forEach((cell) => {
          if (isUmlClassContainerCell(cell)) syncClassCompartmentsToContainer(graph, cell);
          if (isDfdDataStoreContainerCell(cell)) syncDfdDataStoreCompartmentsToContainer(graph, cell);
        });
      });

      // A double-click/tap that lands exactly on a compartment tile boundary
      // (or otherwise resolves to the container instead of the compartment
      // under the cursor) would silently start editing the container's own
      // label — which has no visible box/text style, so it looks like the
      // click just did nothing. Redirect to whichever compartment the point
      // actually falls in, on both platforms, before deciding what to edit.
      graph.addListener(InternalEvent.DOUBLE_CLICK, (_sender: any, evt: any) => {
        const cell = evt.getProperty('cell');
        if (!cell) return;

        let targetCell = cell;
        let axis: 'x' | 'y' | null = null;
        let isCompartment: ((c: any) => boolean) | null = null;
        if (isUmlClassContainerCell(cell)) {
          axis = 'y';
          isCompartment = isUmlClassCompartmentCell;
        } else if (isDfdDataStoreContainerCell(cell)) {
          axis = 'x';
          isCompartment = isDfdDataStoreCompartmentCell;
        }

        const rawEvent = evt.getProperty('event') as MouseEvent | TouchEvent | undefined;
        const point = rawEvent && 'changedTouches' in rawEvent && rawEvent.changedTouches.length
          ? rawEvent.changedTouches[0]
          : (rawEvent as MouseEvent | undefined);

        if (axis && isCompartment) {
          const containerEl = graphDivRef.current;
          if (!point || !containerEl) return;
          const { x, y } = clientToGraphCoords(graph, point.clientX, point.clientY, containerEl);
          const found = findCompartmentAtPoint(graph, cell, x, y, axis, isCompartment);
          if (!found) return;
          targetCell = found;
        }

        // Mobile: skip maxGraph's own CellEditorHandler entirely in favor of
        // our own overlay (openMobileEditor) — its resize/focus wiring
        // fights the on-screen keyboard opening (which resizes the
        // viewport), which is what made the keyboard flash and vanish
        // immediately after double-tapping a shape. Lucidchart and draw.io
        // sidestep the same class of bug the same way: a custom positioned
        // input focused synchronously in the touch handler, instead of the
        // graph library's built-in editor.
        if (isMobile) {
          evt.consume();
          openMobileEditor(targetCell);
          return;
        }

        // Desktop only needs to actually intervene for the compartment
        // redirect above — everything else falls through to maxGraph's own
        // default dblClick handling (event left unconsumed), which calls
        // startEditingAtCell(cell) itself.
        if (targetCell !== cell) {
          evt.consume();
          graph.startEditingAtCell(targetCell, rawEvent instanceof MouseEvent ? rawEvent : undefined);
        }
      });

      graph.getSelectionModel().addListener(InternalEvent.CHANGE, () => {
        handleSelectionChange();
      });

      // maxGraph's KeyHandler only reacts to a keystroke when the currently
      // focused DOM element is inside graph.container (or the graph is
      // editing a label) — see isGraphEvent in KeyHandler. Selecting a shape
      // doesn't move browser focus on its own, so if focus was last on the
      // toolbar, a text input, the color picker, etc., clicking a shape
      // would select it but Backspace/Delete would silently do nothing
      // until something explicitly refocused the canvas. Reclaiming focus
      // on every click keeps Delete/Backspace/arrow-nudge working right
      // after you click a shape, regardless of what had focus before.
      //
      // Skipped while the graph is editing a label: a double-tap on mobile
      // starts editing (focusing the label's own input, which is what pops
      // the on-screen keyboard) and also fires this same 'click'/'cellClick'
      // event a beat later — stealing focus back to graphDiv closed the
      // editor's input immediately, so the keyboard appeared and vanished
      // almost instantly instead of staying up to type in.
      graph.addListener('click', () => {
        if (graph.isEditing()) return;
        graphDiv.focus();
        setTimeout(handleSelectionChange, 10);
      });

      graph.addListener('cellClick', () => {
        if (graph.isEditing()) return;
        graphDiv.focus();
        setTimeout(handleSelectionChange, 10);
      });

      const panningHandler = graph.getPlugin('PanningHandler') as PanningHandler | null;
      const fitPlugin = graph.getPlugin('FitPlugin') as FitPlugin | null;

      if (panningHandler) {
        // Desktop only gets panning via held-spacebar (below) — there's no
        // keyboard on mobile, so a single-finger drag on empty canvas is
        // mobile's only way to pan/scroll at all, and needs to be on by
        // default there instead of gated behind a key that doesn't exist.
        panningHandler.useLeftButtonForPanning = isMobile;
        panningHandler.ignoreCell = false;
        // maxGraph has two built-in two-finger behaviors that were fighting
        // our own RAF-driven pinch-to-zoom below over the same view scale/
        // translate on every pinch, producing the jumpy/jittery zoom:
        //  1. isForcePanningEvent force-starts a pan on ANY multi-touch
        //     mousedown (see PanningHandler.forcePanningHandler) regardless
        //     of ignoreCell — a "two-finger drag pans" shortcut we never
        //     asked for.
        //  2. pinchEnabled (default true) drives PanningHandler's own zoom
        //     off Safari's native gesturestart/gesturechange events, which
        //     fire in parallel with the touchmove events our pinch handler
        //     already reads.
        // Our pinch handler is the single source of truth for a two-finger
        // touch, so both of maxGraph's are switched off here.
        panningHandler.isForcePanningEvent = () => false;
        panningHandler.setPinchEnabled(false);
      }

      new RubberBandHandler(graph);

      const undoManager = new UndoManager();
      const undoListener = (_: any, evt: any) =>
        undoManager.undoableEditHappened(evt.getProperty('edit'));
      graph.getDataModel().addListener(InternalEvent.UNDO, undoListener);
      graph.getView().addListener(InternalEvent.UNDO, undoListener);
      (graph as any).undoManager = undoManager;

      const keyHandler = new KeyHandler(graph);
      keyHandler.bindKey(46, () => graph.removeCells());
      keyHandler.bindKey(8, () => graph.removeCells());
      keyHandler.bindKey(13, () => graph.removeCells());
      keyHandler.bindControlKey(90, () => undoManager.undo());
      keyHandler.bindControlKey(89, () => undoManager.redo());
      keyHandler.bindControlShiftKey(90, () => undoManager.redo());
      keyHandler.bindControlKey(65, () => graph.selectAll(undefined, true));
      keyHandler.bindKey(27, () => graph.clearSelection());

      // Ctrl+C / Ctrl+V — duplicate the selected shape(s). A Class shape or
      // Data Store is really a container cell plus its compartment children
      // (see insertUmlClassCell/insertDfdDataStoreCell above); if the user's
      // selection happens to be one of those compartments rather than the
      // container itself (clicking a compartment selects it individually,
      // same as any other cell), copy its container instead — otherwise
      // Ctrl+C/Ctrl+V on a Class shape would paste just one lone label box
      // instead of duplicating the whole shape.
      keyHandler.bindControlKey(67, () => {
        const selected = graph.getSelectionCells();
        if (!selected.length) return;
        const targets = new Set<any>();
        selected.forEach((cell: any) => {
          const isCompartment = isUmlClassCompartmentCell(cell) || isDfdDataStoreCompartmentCell(cell);
          targets.add(isCompartment ? cell.getParent() : cell);
        });
        Clipboard.copy(graph, Array.from(targets));
      });
      keyHandler.bindControlKey(86, () => {
        Clipboard.paste(graph);
      });

      const nudge = (dx: number, dy: number) => {
        const cells = graph.getSelectionCells();
        if (cells.length) graph.moveCells(cells, dx, dy);
      };
      keyHandler.bindKey(37, () => nudge(-GRID_SIZE, 0));
      keyHandler.bindKey(38, () => nudge(0, -GRID_SIZE));
      keyHandler.bindKey(39, () => nudge(GRID_SIZE, 0));
      keyHandler.bindKey(40, () => nudge(0, GRID_SIZE));

      InternalEvent.addMouseWheelListener((evt: Event, up: boolean) => {
        const e = evt as WheelEvent;
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          const s = graph.getView().getScale();
          graph.zoomTo(Math.min(4, Math.max(0.1, s * (up ? 1.1 : 0.9))), true);
        }
      }, graphDiv);

      // ─── Pinch-to-zoom (mobile) ──────────────────────────────────────────
      // Two-finger pinch snaps through the same fixed zoom levels as the
      // +/- buttons in app/(tabs)/create.tsx (one step per gesture), instead
      // of scaling continuously to whatever the raw finger-distance ratio
      // says — free-scaling with two fingers felt fiddly/imprecise to nail a
      // specific zoom level. Each step re-centers the view via
      // graph.zoomTo(scale, true), the same call the buttons make, rather
      // than anchoring under the fingers. A single finger is left alone so
      // maxGraph's own touch-as-mouse handling still drives panning/
      // selection/move.
      const PINCH_ZOOM_STEPS = [50, 75, 100, 125, 150, 200, 300, 400];
      const nearestZoomStepIndex = (percent: number): number => {
        let closest = 0;
        let minDiff = Infinity;
        PINCH_ZOOM_STEPS.forEach((step, index) => {
          const diff = Math.abs(step - percent);
          if (diff < minDiff) {
            minDiff = diff;
            closest = index;
          }
        });
        return closest;
      };
      // A pinch has to change finger distance by this fraction before it
      // counts as "one zoom step" — small enough to feel responsive, large
      // enough that finger tremor alone doesn't trigger a step.
      const PINCH_STEP_RATIO = 1.2;

      let pinchBaseDistance = 0;
      let pinchStepIndex = 0;
      // Raw touchmove fires far more often than the screen can usefully
      // repaint at. Coalescing to one applied update per animation frame
      // keeps that pileup from queuing up multiple zoom steps at once: at
      // most 60 checks/sec no matter how many touchmoves land in between,
      // each one using the latest finger positions rather than every
      // intermediate jitter.
      let pendingPinchTouches: TouchList | null = null;
      let pinchRafId: number | null = null;

      const touchDistance = (touches: TouchList) => {
        const dx = touches[0].clientX - touches[1].clientX;
        const dy = touches[0].clientY - touches[1].clientY;
        return Math.sqrt(dx * dx + dy * dy);
      };

      const applyPinchFrame = () => {
        pinchRafId = null;
        const touches = pendingPinchTouches;
        if (!touches || touches.length !== 2 || pinchBaseDistance <= 0) return;

        const distance = touchDistance(touches);
        const ratio = distance / pinchBaseDistance;

        if (ratio >= PINCH_STEP_RATIO && pinchStepIndex < PINCH_ZOOM_STEPS.length - 1) {
          pinchStepIndex += 1;
          graph.zoomTo(PINCH_ZOOM_STEPS[pinchStepIndex] / 100, true);
          pinchBaseDistance = distance;
        } else if (ratio <= 1 / PINCH_STEP_RATIO && pinchStepIndex > 0) {
          pinchStepIndex -= 1;
          graph.zoomTo(PINCH_ZOOM_STEPS[pinchStepIndex] / 100, true);
          pinchBaseDistance = distance;
        }
      };

      const onPinchTouchStart = (e: TouchEvent) => {
        if (e.touches.length === 2) {
          // The first finger landing (just before the second joins to make
          // this a pinch) already started PanningHandler's own single-
          // finger pan — useLeftButtonForPanning is on for mobile (above),
          // so that's normal single-finger scrolling. It doesn't stop on
          // its own just because a second finger arrived: mobile browsers
          // keep synthesizing mouse-move from that first touch point
          // independently of the touchmove listener below (preventDefault
          // there doesn't reach an already-active mousedown→mousemove
          // chain), so the view kept panning *while* also being zoomed —
          // the jumpy/jittery feel this is fixing. reset() forcibly ends
          // that pan the instant the pinch actually starts, leaving this
          // handler as the two-finger gesture's only driver, same as the
          // isForcePanningEvent/pinchEnabled guards above already make it
          // for maxGraph's own built-in pinch handling.
          panningHandler?.reset();
          pinchBaseDistance = touchDistance(e.touches);
          pinchStepIndex = nearestZoomStepIndex(Math.round(graph.getView().getScale() * 100));
        }
      };
      const onPinchTouchMove = (e: TouchEvent) => {
        if (e.touches.length !== 2 || pinchBaseDistance <= 0) return;
        e.preventDefault();
        pendingPinchTouches = e.touches;
        if (pinchRafId === null) {
          pinchRafId = requestAnimationFrame(applyPinchFrame);
        }
      };
      const onPinchTouchEnd = (e: TouchEvent) => {
        if (e.touches.length < 2) {
          pinchBaseDistance = 0;
          pendingPinchTouches = null;
          if (pinchRafId !== null) {
            cancelAnimationFrame(pinchRafId);
            pinchRafId = null;
          }
        }
      };
      graphDiv.addEventListener('touchstart', onPinchTouchStart, { passive: true });
      graphDiv.addEventListener('touchmove', onPinchTouchMove, { passive: false });
      graphDiv.addEventListener('touchend', onPinchTouchEnd, { passive: true });

      let spaceDown = false;
      const onSpaceKeyDown = (e: KeyboardEvent) => {
        if (e.code === 'Space' && !spaceDown) {
          spaceDown = true;
          if (panningHandler) panningHandler.useLeftButtonForPanning = true;
          graphDiv.style.cursor = 'grab';
        }
      };
      const onSpaceKeyUp = (e: KeyboardEvent) => {
        if (e.code === 'Space') {
          spaceDown = false;
          // Releasing space returns to this platform's baseline, not
          // unconditionally off — mobile's baseline is "always on" (set above).
          if (panningHandler) panningHandler.useLeftButtonForPanning = isMobile;
          graphDiv.style.cursor = 'default';
        }
      };
      graphDiv.addEventListener('keydown', onSpaceKeyDown);
      graphDiv.addEventListener('keyup', onSpaceKeyUp);

      const reportZoom = () => onZoomChangeRef.current?.(Math.round(graph.getView().getScale() * 100));
      graph.getView().addListener('scale', () => { repaintGrid(); reportZoom(); });
      graph.getView().addListener('translate', () => repaintGrid());
      graph.getView().addListener('scaleAndTranslate', () => { repaintGrid(); reportZoom(); });

      graph.getDataModel().addListener(InternalEvent.CHANGE, () => {
        try {
          const xml = new ModelXmlSerializer(graph.getDataModel()).export();
          onChangeRef.current?.(xml);
        } catch (_) { }

        // Debounced so a drag/resize (many CHANGE events in a row) doesn't
        // re-run validation and rebuild every overlay on each intermediate frame.
        if (validationTimerRef.current) clearTimeout(validationTimerRef.current);
        validationTimerRef.current = setTimeout(() => runFlowchartValidationRef.current?.(), 150);
      });

      const dropTarget = wrapper;

      const onDragOver = (e: DragEvent) => {
        if (!e.dataTransfer?.types.includes('application/igraphit-shape')) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
        setIsDragOver(true);
      };

      const onDragLeave = (e: DragEvent) => {
        if (!dropTarget.contains(e.relatedTarget as Node)) {
          setIsDragOver(false);
        }
      };

      const onDrop = (e: DragEvent) => handleDrop(e);

      dropTarget.addEventListener('dragover', onDragOver);
      dropTarget.addEventListener('dragleave', onDragLeave);
      dropTarget.addEventListener('drop', onDrop);

      const onEnterKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Enter') {
          e.stopPropagation();
        }
      };
      graphDiv.addEventListener('keydown', onEnterKeyDown);

      setupHoverUI(graph);

      cleanupClickArrows = setupClickArrows(graph);

      timers.push(setTimeout(() => {
        if (destroyed) return;
        fitPlugin?.fit();
        repaintGrid();
        graphDiv.focus();
        setTimeout(handleSelectionChange, 100);
        runFlowchartValidationRef.current?.();
      }, 150));

      repaintGrid();

      console.log('✅ maxGraph ready with BLACK edges + BLUE selection + click arrows');
      onReadyRef.current?.(graph);
      if (!destroyed) setLoading(false);

      return () => {
        destroyed = true;
        timers.forEach(clearTimeout);
        if (validationTimerRef.current) clearTimeout(validationTimerRef.current);
        ro.disconnect();
        dropTarget.removeEventListener('dragover', onDragOver);
        dropTarget.removeEventListener('dragleave', onDragLeave);
        dropTarget.removeEventListener('drop', onDrop);
        // These were previously never removed (the old code here even passed
        // a brand-new anonymous function to removeEventListener, which can
        // never match the original listener — a silent no-op). Since
        // graphDiv/wrapper are the same persistent DOM nodes across every
        // initGraph re-run (only this effect's body re-executes, not the
        // JSX), any leftover listener here stacked a duplicate on top of the
        // next run's — each pinch gesture then drove every stacked pinch
        // handler at once, each computing scale from its own stale
        // pinchBaseDistance/pinchStepIndex closure and fighting over the
        // same graph.zoomTo() calls. That's what produced the runaway/
        // erratic zoom (shape ballooning and jumping to a random position on
        // a normal two-finger pinch).
        graphDiv.removeEventListener('touchstart', onPinchTouchStart);
        graphDiv.removeEventListener('touchmove', onPinchTouchMove);
        graphDiv.removeEventListener('touchend', onPinchTouchEnd);
        graphDiv.removeEventListener('keydown', onSpaceKeyDown);
        graphDiv.removeEventListener('keyup', onSpaceKeyUp);
        graphDiv.removeEventListener('keydown', onEnterKeyDown);
        keyHandler.onDestroy();
        if (cleanupClickArrows) cleanupClickArrows();
        if (pinchRafId !== null) cancelAnimationFrame(pinchRafId);
        graph.destroy();
        graphRef.current = null;
        setFlowchartIssues([]);
      };
    } catch (err: any) {
      console.error('❌ maxGraph init error:', err);
      setError(err.message || 'Failed to load diagram editor');
      setLoading(false);
      return undefined;
    }
  }, [repaintGrid, resizeGridCanvas, handleDrop, registerShapeStyles, handleSelectionChange, setupHoverUI, setupClickArrows, isMobile, openMobileEditor]);

  useEffect(() => {
    const cleanup = initGraph();
    return () => cleanup?.();
  }, [initGraph]);

  return (
    <div
      ref={wrapperRef}
      style={{ position: 'relative', width: '100%', height: '100%' }}
    >
      <canvas
        ref={gridCanvasRef}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          zIndex: 0,
          display: 'block',
          pointerEvents: 'none',
        }}
      />

      <div
        ref={graphDivRef}
        tabIndex={0}
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 1,
          outline: 'none',
        }}
      />

      {/* Mobile's label-editing overlay — see openMobileEditor/commitMobileEdit
          above. Always mounted (never conditionally rendered) so it can be
          focused synchronously from the DOUBLE_CLICK handler; hidden via
          direct style mutation instead of an isEditing-gated render. */}
      <textarea
        ref={mobileEditorRef}
        style={{
          position: 'absolute',
          display: 'none',
          zIndex: 5,
          resize: 'none',
          boxSizing: 'border-box',
          border: `2px solid ${BLUE}`,
          borderRadius: 4,
          padding: '2px 4px',
          margin: 0,
          background: '#ffffff',
          fontFamily: 'inherit',
          lineHeight: 1.2,
          outline: 'none',
        }}
        onBlur={() => commitMobileEdit(false)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            e.preventDefault();
            commitMobileEdit(true);
          } else if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            commitMobileEdit(false);
          }
        }}
      />

      {isDragOver && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 3,
            pointerEvents: 'none',
            border: `2px dashed ${BLUE}`,
            borderRadius: 4,
            backgroundColor: 'rgba(76, 111, 255, 0.04)',
            boxSizing: 'border-box',
            transition: 'opacity 0.1s',
          }}
        />
      )}

      {error && (
        <div style={{
          position: 'absolute',
          inset: 0,
          zIndex: 4,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: CANVAS_BG,
          padding: 20,
          fontFamily: 'system-ui, sans-serif',
        }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
          <h3 style={{ margin: 0, color: '#1e293b' }}>Diagram Editor Error</h3>
          <p style={{ color: '#64748b', textAlign: 'center', maxWidth: 500 }}>{error}</p>
        </div>
      )}

      {!error && loading && (
        <div style={{
          position: 'absolute',
          inset: 0,
          zIndex: 4,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: CANVAS_BG,
        }}>
          <div style={{
            width: 40,
            height: 40,
            border: '4px solid #e2e8f0',
            borderTop: `4px solid ${BLUE}`,
            borderRadius: '50%',
            animation: 'igraph-spin 0.8s linear infinite',
          }} />
          <p style={{ color: '#64748b', marginTop: 16 }}>Loading Diagram Editor...</p>
          <style>{`
            @keyframes igraph-spin {
              0%   { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      )}

      {!error && !loading && flowchartIssues.length > 0 && (() => {
        const errorCount = flowchartIssues.filter((i) => i.severity === 'error').length;
        const warningCount = flowchartIssues.filter((i) => i.severity === 'warning').length;
        const infoCount = flowchartIssues.length - errorCount - warningCount;
        const counts: { severity: IssueSeverity; count: number }[] = [
          { severity: 'error', count: errorCount },
          { severity: 'warning', count: warningCount },
          { severity: 'info', count: infoCount },
        ].filter((c) => c.count > 0);
        return (
          // Top-center, not a corner — the right edge is where the Properties
          // panel docks (and the left edge is where the Shapes panel opens), so
          // either corner gets covered by them. Center stays clear of both.
          <div id="tour-create-issues" style={{
            position: 'absolute',
            top: 12,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 5,
            fontFamily: 'system-ui, sans-serif',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}>
            <div
              onClick={() => setShowIssuesList((prev) => !prev)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                backgroundColor: '#ffffff',
                border: '1px solid #e6eaf2',
                borderRadius: 999,
                padding: '7px 10px 7px 14px',
                boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04), 0 6px 16px rgba(15, 23, 42, 0.08)',
                cursor: 'pointer',
                userSelect: 'none',
              }}
            >
              {counts.map(({ severity, count }, idx) => (
                <div key={severity} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  {idx > 0 && <div style={{ width: 1, height: 14, background: '#e6eaf2' }} />}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <SeverityIcon severity={severity} size={14} />
                    <span style={{ fontSize: 12.5, fontWeight: 700, color: '#334155', fontVariantNumeric: 'tabular-nums' }}>
                      {count}
                    </span>
                  </div>
                </div>
              ))}
              <svg
                width={10} height={10} viewBox="0 0 10 10" fill="none"
                style={{ transform: showIssuesList ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s ease' }}
              >
                <path d="M1.5 3.5L5 7L8.5 3.5" stroke="#94a3b8" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>

            {showIssuesList && (
              <div style={{
                marginTop: 8,
                width: 320,
                maxHeight: 260,
                overflowY: 'auto',
                backgroundColor: '#ffffff',
                border: '1px solid #e6eaf2',
                borderRadius: 12,
                boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04), 0 12px 28px rgba(15, 23, 42, 0.12)',
                padding: 6,
              }}>
                {flowchartIssues.map((issue, i) => (
                  <div
                    key={i}
                    onClick={() => {
                      if (!issue.cell) return;
                      graphRef.current?.setSelectionCell(issue.cell);
                      graphRef.current?.scrollCellToVisible(issue.cell);
                    }}
                    onMouseEnter={(e) => { if (issue.cell) e.currentTarget.style.backgroundColor = '#f8fafc'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 9,
                      padding: '8px 10px',
                      borderRadius: 8,
                      cursor: issue.cell ? 'pointer' : 'default',
                      transition: 'background-color 0.1s ease',
                    }}
                  >
                    <div style={{ marginTop: 1, flexShrink: 0 }}>
                      <SeverityIcon severity={issue.severity} size={15} />
                    </div>
                    <span style={{ fontSize: 12.5, color: '#334155', lineHeight: 1.45 }}>{issue.message}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })()}

      {issuePopup && (
        <>
          {/* Backdrop — dismisses the popup on an outside tap/click, same
              pattern as the shape picker below. */}
          <div
            onClick={() => setIssuePopup(null)}
            style={{ position: 'absolute', inset: 0, zIndex: 9 }}
          />
          <div
            style={{
              position: 'absolute',
              left: issuePopup.x,
              top: issuePopup.y,
              transform: 'translate(-50%, calc(-100% - 10px))',
              zIndex: 10,
              maxWidth: 240,
              backgroundColor: '#1e293b',
              color: '#ffffff',
              fontSize: 12,
              lineHeight: 1.4,
              padding: '8px 10px',
              borderRadius: 8,
              boxShadow: '0 4px 16px rgba(15, 23, 42, 0.25)',
              fontFamily: 'system-ui, sans-serif',
              pointerEvents: 'none',
            }}
          >
            {issuePopup.message}
          </div>
        </>
      )}

      {shapePicker && (() => {
        const pickerShapes = getShapesForDiagram(umlType).length
          ? getShapesForDiagram(umlType)
          : DIAGRAM_SHAPES['Standard'];
        // 34px is the smallest these shape components render crisply at —
        // ShapesPanel's own icons are 40-48px; going much below ~34 (as a
        // first pass here did, at 22px) makes thin curved strokes (ellipse,
        // diamond) look aliased/blurry rather than compact.
        const cellSize = 34;
        const popupWidth = cellSize * 4 + 8 * 2 + 2 * 3; // 4 cols + padding + gaps
        return (
          <>
            {/* Backdrop — closes the picker on an outside click without
                creating anything, same as dismissing draw.io's grid. */}
            <div
              onClick={dismissShapePicker}
              style={{ position: 'absolute', inset: 0, zIndex: 8 }}
            />
            <div
              style={{
                position: 'absolute',
                left: Math.max(8, shapePicker.x - popupWidth / 2),
                top: shapePicker.y + 12,
                width: popupWidth,
                zIndex: 9,
                backgroundColor: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: 8,
                boxShadow: '0 8px 24px rgba(15, 23, 42, 0.16)',
                padding: 8,
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: 2,
              }}
            >
              {pickerShapes.map((shape: ShapeDefinition) => (
                <div
                  key={shape.id}
                  title={shape.label}
                  onClick={() => {
                    createShapeInDirection(
                      shapePicker.sourceCell,
                      shapePicker.dir,
                      shapePicker.rotation,
                      shapePicker.geo,
                      shapePicker.scale,
                      shape.id,
                    );
                    setShapePicker(null);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: cellSize,
                    height: cellSize,
                    borderRadius: 5,
                    cursor: 'pointer',
                  }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.backgroundColor = '#eef2ff'; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.backgroundColor = 'transparent'; }}
                >
                  <ShapePreview name={shape.svgComponent} showLabel={false} width={26} height={17} strokeWidth={1.3} />
                </div>
              ))}
            </div>
          </>
        );
      })()}
    </div>
  );
});

const DiagramCanvas = forwardRef<DiagramCanvasHandle, DiagramCanvasProps>(({ onReady, onChange, onSelectionChange, onZoomChange, umlType, isMobile }, ref) => {
  if (Platform.OS !== 'web') {
    return (
      <View style={styles.nativeNotice}>
        <Text style={styles.nativeNoticeTitle}>📐 Diagram Editor</Text>
        <Text style={styles.nativeNoticeText}>Available on the web version.</Text>
      </View>
    );
  }
  return (
    <View style={styles.container}>
      <WebCanvas ref={ref} onReady={onReady} onChange={onChange} onSelectionChange={onSelectionChange} onZoomChange={onZoomChange} umlType={umlType} isMobile={isMobile} />
    </View>
  );
});

export default DiagramCanvas;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: CANVAS_BG },
  nativeNotice: { flex: 1, backgroundColor: CANVAS_BG, justifyContent: 'center', alignItems: 'center', padding: 20 },
  nativeNoticeTitle: { fontSize: 20, fontWeight: '700', color: '#1e293b', marginBottom: 6 },
  nativeNoticeText: { fontSize: 14, color: '#64748b', textAlign: 'center' },
});