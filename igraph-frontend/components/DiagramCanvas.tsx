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
  CellHighlight,
  ImageBox,
  Geometry,
  Point,
  Clipboard,
  PanningHandler,
  getDefaultPlugins,
  registerDefaultPerimeters,
  registerDefaultEdgeStyles,
  registerDefaultEdgeMarkers,
} from '@maxgraph/core';

import type {
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
  SCHEMATIC_PIN_DEFINITIONS,
  SchematicPin,
} from './maxgraph-custom-shapes';
import { UniversalVertexHandler, AxisLockedPanningHandler } from './maxgraph-universal-handler';
import { getShapeDefinitionById, getShapesForDiagram, DIAGRAM_SHAPES, ShapeDefinition, isConnectorCell, CONNECTOR_SHAPE_IDS } from '@/constants/shapes';
import { ShapePreview } from '@/components/shapes/ShapeIcon';
import { tagShapeRole, getShapeRole, validateDiagram, FlowchartIssue, IssueSeverity } from '@/utils/flowchartRules';
import { changesToPatches, applyPatches as applyPatchesToModel, DiagramPatch } from '@/utils/diagramPatch';

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
// A connector endpoint's hit-test radius is roughly (this size / 2) + the
// handler's own tolerance — EdgeHandler.tolerance (widened to 20 below, see
// its own comment) only ever applies to touch/pen input; maxGraph hardcodes
// a genuine mouse event's tolerance to a flat 1px regardless. At size 8 that
// left mouse users a real grab radius of only ~5px around the handle's
// center — confirmed directly (via an automated drag test against the live
// app) to be the actual reason a repositioning drag could fail to start at
// all: missing the handle by a handful of pixels doesn't begin a drag, it's
// simply a no-op click, which reads as "the connector won't move" even
// though the position/repaint logic itself was never actually exercised.
// 12 widens that to a still-modest ~7px without the handles looking
// oversized.
HandleConfig.size = 12;

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

  // canvas.width/height are the device-pixel backing store (set in
  // resizeGridCanvas as CSS size * devicePixelRatio, for sharp lines on
  // high-DPR mobile screens — see comment there). Resetting the transform
  // to that same scale lets everything below keep drawing in CSS-pixel
  // coordinates, matching `scale`/`tx`, which come from the graph view and
  // know nothing about device pixels.
  const dpr = window.devicePixelRatio || 1;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const W = canvas.width / dpr;
  const H = canvas.height / dpr;
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
export function findNearbyVertex(graph: Graph, x: number, y: number, threshold: number, exclude?: any): any {
  const parent = graph.getDefaultParent();
  const vertices = graph.getChildVertices(parent);
  let best: any = null;
  let bestDistance = Infinity;

  for (const cell of vertices) {
    if (exclude && cell === exclude) continue;
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

// A dropped connector always lands as a plain floating segment of its own
// default length (`reach`), centered on the drop point — no longer reaching
// out to whichever shapes happen to flank it, however far away those were.
// That "bracket whichever pair of shapes it landed between" search used to
// live here (findBracketingVertex, since removed): it made a palette-
// dropped connector snap onto shapes that could be well outside the user's
// intended drop radius, purely because they were the nearest thing in the
// same row/column — a connector could jump onto shapes the user never
// meant to touch just by being dropped in roughly the right lane, with no
// way to tell beforehand which pair it would pick. Attaching is now always
// an explicit, deliberate act: drag an end onto a shape (or another
// connector) yourself — see the ConnectionHandler/EdgeHandler smooth-
// connect highlighting further down for that gesture. The only automatic
// snap left here is the small, close-range magnet below (still
// CONNECTOR_SNAP_DISTANCE, same as every other "dropped right on top of
// it" case in this file) — a connector dropped directly on or touching a
// shape/connector still attaches immediately, same as it always has.
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

// The interactive CELL_CONNECTED catch-all further down (initGraph) pins a
// fixed exitX/exitY (or entryX/entryY) fraction the instant a user drags an
// edge end onto a real cell — but every *automatic* attach path in this
// file (a palette-dropped connector auto-snapping onto whatever it landed
// near in handleDrop, a dangling connector's end catching a nearby vertex
// once something drags close enough in attachDanglingEdgeEnds/
// attachVertexToDanglingEdges) wires the terminal directly via
// model.setTerminal or insertEdge(source, target, ...) — neither of which
// fires CELL_CONNECTED — so none of them ever get pinned. Left floating, a
// vertex target still tracks the two shapes' relative positions closely
// enough not to matter most of the time, but an EDGE target (a connector
// auto-attached to another connector) hardcodes the exact MIDPOINT of that
// target on every single redraw, no matter where it actually landed — the
// "jumps to another position" bug — and, having no fixed point to begin
// with, can never be dragged anywhere else afterward either, since nothing
// is there to slide — the matching "locks in one position" bug. Mirrors
// the exact fraction math the interactive fix uses, just against
// model-space geometry/endpoints (this runs synchronously at attach time,
// against a cell that may not have a CellState yet, not from a live one)
// so every attach path — drag or automatic — ends up in the identical,
// re-draggable pinned state.
function pinnedEdgeEndStyle(target: any, point: { x: number; y: number }, isSource: boolean): Record<string, unknown> {
  if (typeof target?.isEdge === 'function' && target.isEdge()) {
    // A connector target: exitX/entryX means PATH-LENGTH fraction here (see
    // the getConnectionPoint override in initGraph and pointAtPathFraction/
    // closestFractionOnPath's own comment) — the bounding-box fraction
    // vertices use doesn't generally land back on a diagonal or bent
    // target's actual line at all. Built from the target's own model-space
    // endpoints plus any waypoints (geo.points) it has — the fullest
    // polyline available synchronously here, before this target necessarily
    // has a live CellState/absolutePoints to read instead.
    const a = edgeEndpoint(target, true);
    const b = edgeEndpoint(target, false);
    if (!a || !b) return {};
    const bends: { x: number; y: number }[] = target.getGeometry?.()?.points ?? [];
    const path = [a, ...bends, b];
    const f = closestFractionOnPath(path, point.x, point.y);
    return isSource
      ? { exitX: f, exitY: 0.5, exitPerimeter: false, igraphAutoPinSource: true }
      : { entryX: f, entryY: 0.5, entryPerimeter: false, igraphAutoPinTarget: true };
  }
  const geo = target?.getGeometry?.();
  if (!geo) return {};
  const { x: bx, y: by, width: bw, height: bh } = geo;
  const fx = bw > 0 ? Math.min(1, Math.max(0, (point.x - bx) / bw)) : 0.5;
  const fy = bh > 0 ? Math.min(1, Math.max(0, (point.y - by) / bh)) : 0.5;
  return isSource
    ? { exitX: fx, exitY: fy, exitPerimeter: false, igraphAutoPinSource: true }
    : { entryX: fx, entryY: fy, entryPerimeter: false, igraphAutoPinTarget: true };
}

// Every igraphAutoPinSource/Target marker above is written as a real JS
// boolean `true` — correct in the live session it was set in. But this
// app's save/load round-trip (ModelXmlSerializer, the same one loadXml and
// the backend save use) serializes a style object generically, attribute
// by attribute, with no per-key type information — a boolean has no
// native XML attribute representation, so it comes back parsed as the
// NUMBER 1 (confirmed directly against ModelXmlSerializer: export writes
// igraphAutoPinTarget="1", import reads it back as 1, not true), the exact
// same "0/1 stands in for a bool" convention maxGraph's own style keys
// (e.g. entryPerimeter) already rely on — and maxGraph's own code reads
// those loosely (`edge.style.exitPerimeter || false`), never with strict
// equality. Every check against this marker up to now used `=== true` /
// `!== true`, which silently stops recognizing its OWN marker the instant
// a diagram round-trips through a save and reload: 1 !== true, so a
// connector this app itself pinned reads as "not ours" afterward — the
// concrete mechanism behind "opening the diagram again fixes it, but only
// until the next save/reload" and "the interactive re-pin refuses to
// update it" (the CELL_CONNECTED catch-all's fixedByOther treats a
// corrupted `1` as someone ELSE's deliberate fixed point and backs off).
function isAutoPinnedFlag(value: unknown): boolean {
  return value === true || value === 1 || value === '1';
}

// Whether this cell is an edge with at least one auto-pinned end (see
// pinnedEdgeEndStyle/isAutoPinnedFlag above) — the marker that means
// "attached to another shape or connector via this app's own catch-all,
// not floating and not one of the dedicated cases (Main Cause/spine,
// Sequence messages, Fork/Join stubs) that already have their own
// specific slide function." Used below to give exactly this case its own
// dedicated drag behavior instead of maxGraph's generic one.
function isAutoPinnedEdge(cell: any): boolean {
  if (!cell || typeof cell.isEdge !== 'function' || !cell.isEdge()) return false;
  const style = cell.getStyle();
  const base = (typeof style === 'object' && style !== null ? style : {}) as Record<string, unknown>;
  return isAutoPinnedFlag(base.igraphAutoPinSource) || isAutoPinnedFlag(base.igraphAutoPinTarget);
}

// Every OTHER "dedicated" pinned-edge case (Fishbone Main Cause/spine,
// Sequence Sync/Async/Return messages, Fork/Join stubs) has its own slide
// function below for the exact same reason isAutoPinnedEdge's does — a
// fixed exit/entry fraction that plain translateCell never touches — and
// each one's own comment already documents the identical symptom this
// causes: dragging renders a mismatched ghost the whole gesture, then
// snaps/desyncs at mouseup (confirmed on video for a Sequence Return
// message specifically: its exitY and entryY desynced mid-drag, leaving it
// rendered as a diagonal kink flagged by validation, instead of the level
// line every message should be). isAutoPinnedEdge's own dedicated body-drag
// fix (see the SelectionHandler wrap in initGraph) only recognized ITS OWN
// marker, so none of these dedicated cases got the same live, WYSIWYG
// dragging — they were still left on maxGraph's generic, mismatched ghost
// path. hasDedicatedEdgeSlide/runDedicatedEdgeSlide generalize that same
// fix to every one of these, mirroring the exact dispatch runAutoAttachOnMove
// below already uses for the MOVE_CELLS/mouseup-only version of the same
// slide.
function hasDedicatedEdgeSlide(cell: any): boolean {
  if (!cell || typeof cell.isEdge !== 'function' || !cell.isEdge()) return false;
  const role = getShapeRole(cell);
  if (cell.source && role && FISHBONE_MAIN_CAUSE_IDS.has(role)) return true;
  if (role && SEQUENCE_MESSAGE_SHAPE_IDS.has(role)) return true;
  if (role === 'act-control-flow') return true;
  return isAutoPinnedEdge(cell);
}

function runDedicatedEdgeSlide(graph: Graph, cell: any, dx: number, dy: number) {
  const role = getShapeRole(cell);
  if (cell.source && role && FISHBONE_MAIN_CAUSE_IDS.has(role)) {
    slideMainCauseAlongSpine(graph, cell, dx);
  }
  if (role && SEQUENCE_MESSAGE_SHAPE_IDS.has(role)) {
    slideSequenceMessageAlongTimelines(graph, cell, dy);
  }
  if (role === 'act-control-flow') {
    slideForkJoinStubAlongBar(graph, cell, dx);
  }
  slideAutoPinnedEdgeEnd(graph, cell, dx, dy);
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
// ever find the spine — never any other nearby connector). `excludeEdge`,
// when given, skips that one candidate — every existing call site searches
// from a point that can never coincide with its own line (a fresh drop, or
// another cell's position), so it's optional and defaults to no exclusion;
// but a search from an edge's OWN still-dangling terminal point (see
// attachDanglingEdgeEnds) needs it, the exact same hazard findHostWireFor
// Junction's own comment already documents — that point IS one of the
// edge's own two endpoints, which would otherwise always "win" at distance 0.
export function findEdgeNearPoint(graph: Graph, x: number, y: number, threshold: number, roles?: Set<string>, excludeEdge?: any): any {
  let best: any = null;
  let bestDistance = Infinity;
  for (const edge of graph.getChildEdges(graph.getDefaultParent())) {
    if (edge === excludeEdge) continue;
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

// ─── Schematic pin-accurate wiring ───────────────────────────────────────────
// A Schematic component's real connection points are its drawn leads (see
// SCHEMATIC_PIN_DEFINITIONS in maxgraph-custom-shapes.ts), not anywhere on
// its bounding box — the same "fixed point, not floating perimeter" idea
// Fishbone's spine attachment already uses below (attachMainCauseToSpine),
// just table-driven instead of hand-derived per shape. Which pin is
// "nearest" is judged by the wire's OTHER end (aim), not a raw drop pixel —
// the CELL_CONNECTED event this feeds (see initGraph) doesn't carry the
// original mouse position, and aiming by the far end matches how a real
// schematic tool's snapping feels anyway: drag toward a resistor's left
// side and you land on its left lead regardless of the exact pixel.
//
// `avoid` (already-used pin ids on this same part, from its other wires —
// see usedSchematicPinIds) is checked first and, whenever it doesn't cover
// every pin, filters them out of the running entirely, only falling back
// to geometry among what's left. Without this, closing a loop back around
// through a third part (e.g. Battery -> Resistor -> Ground -> Battery)
// reliably starves one real lead on each of Battery and Resistor: once the
// first wire claims each one's *facing* lead, the wire closing the loop is
// aiming at Ground — a single point that, by straight-line distance alone,
// reads as "still closer to that same already-used lead" on both ends
// (Ground can't simultaneously read as being further left than Battery's
// leftmost point and further right than Resistor's rightmost point — the
// two remaining leads are each the outermost point of the whole layout).
// Geometry alone can never resolve that; "don't reuse a lead that's still
// free" does, and matches what a real user obviously wants anyway.
function nearestSchematicPin(
  role: string,
  geo: { x: number; y: number; width: number; height: number },
  aim: { x: number; y: number } | null,
  avoid?: Set<string>,
): SchematicPin | null {
  const pins = SCHEMATIC_PIN_DEFINITIONS[role];
  if (!pins || pins.length === 0) return null;
  const candidates = avoid && pins.some((p) => !avoid.has(p.id)) ? pins.filter((p) => !avoid.has(p.id)) : pins;
  if (!aim || candidates.length === 1) return candidates[0];
  let best = candidates[0];
  let bestDistance = Infinity;
  for (const pin of candidates) {
    const px = geo.x + pin.x * geo.width;
    const py = geo.y + pin.y * geo.height;
    const distance = Math.hypot(px - aim.x, py - aim.y);
    if (distance < bestDistance) {
      best = pin;
      bestDistance = distance;
    }
  }
  return best;
}

// Which of `terminal`'s own pins its other wires (every edge but this one)
// already occupy — see nearestSchematicPin's `avoid` param.
function usedSchematicPinIds(terminal: any, excludeEdge: any): Set<string> {
  const used = new Set<string>();
  const edges = terminal.getEdges?.(true, true, false) ?? [];
  for (const other of edges) {
    if (other === excludeEdge) continue;
    const style = other.getStyle();
    const styleObj = (typeof style === 'object' && style !== null ? style : {}) as Record<string, unknown>;
    const pinId = other.getTerminal(true) === terminal ? styleObj.schematicSourcePin : styleObj.schematicTargetPin;
    if (typeof pinId === 'string') used.add(pinId);
  }
  return used;
}

// Snaps one end of a schematic wire to its nearest real lead: pins the
// connection to that lead's exact fraction (exitX/exitY or entryX/entryY +
// perimeter:false — same mechanism as the Fish Head fixed-point attach
// further down) and stamps which pin it is onto the edge's own persisted
// style, schematicSourcePin/schematicTargetPin — the same "extra identity
// riding on a real style key" trick as ERD's cardinalitySide (see the
// relationship split in handleDrop). Unlike shape-role tagging (an
// in-memory WeakMap — see getShapeRole in flowchartRules.ts), a persisted
// style key survives a reload, which is what makes validateSchematic able
// to name a specific unwired pin instead of just counting wires. No-ops
// when `terminal` isn't a recognized schematic part (e.g. every other
// diagram type), so this is safe to call unconditionally.
function applySchematicPinSnap(graph: Graph, edge: any, terminal: any, isSource: boolean): void {
  const role = terminal && typeof terminal.isVertex === 'function' && terminal.isVertex() ? getShapeRole(terminal) : undefined;
  if (!role || !SCHEMATIC_PIN_DEFINITIONS[role]) return;
  const geo = terminal.getGeometry();
  if (!geo) return;
  const aim = edgeEndpoint(edge, !isSource);
  const avoid = usedSchematicPinIds(terminal, edge);
  const pin = nearestSchematicPin(role, geo, aim, avoid);
  if (!pin) return;
  const currentStyle = edge.getStyle();
  const base = (typeof currentStyle === 'object' && currentStyle !== null ? currentStyle : {}) as CellStateStyle;
  const fixedPoint = isSource
    ? { exitX: pin.x, exitY: pin.y, exitPerimeter: false }
    : { entryX: pin.x, entryY: pin.y, entryPerimeter: false };
  const pinKey = isSource ? 'schematicSourcePin' : 'schematicTargetPin';
  graph.getDataModel().setStyle(edge, {
    ...base,
    ...fixedPoint,
    edgeStyle: 'orthogonalEdgeStyle',
    [pinKey]: pin.id,
  } as CellStateStyle);
}

// The point on segment a->b closest to (px, py) — the same projection
// distanceToSegment (above) already computes internally, exposed here as a
// point instead of just a distance, for placing a junction vertex ON a
// wire's line rather than merely measuring how close a drop landed to it.
function closestPointOnSegment(
  px: number, py: number, ax: number, ay: number, bx: number, by: number,
): { x: number; y: number } {
  const dx = bx - ax;
  const dy = by - ay;
  const lenSq = dx * dx + dy * dy;
  const t = lenSq === 0 ? 0 : Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lenSq));
  return { x: ax + t * dx, y: ay + t * dy };
}

// ─── Path-length-fraction points on a target CONNECTOR ─────────────────────
// maxGraph's own exitX/exitY (see getConnectionConstraint/getConnectionPoint
// in @maxgraph/core's ConnectionsMixin) are BOUNDING-BOX fractions — correct
// and exactly what you want for a vertex target (a rectangle's own corners
// ARE its bounding box), but wrong for an EDGE target: a bounding-box
// fraction of a diagonal or bent connector's box doesn't generally land
// back on the connector's actual drawn line at all, only ever coincidentally
// for a perfectly horizontal/vertical one. draw.io/mxGraph's own answer to
// "a point that lives on a specific edge" — used there only for edge
// LABELS, via getPoint/getRelativePoint in mxGraphView.js, never for
// connector endpoints, since draw.io leaves connectableEdges permanently
// false and never needs this for endpoints at all — is a fraction of PATH
// LENGTH along that edge's actual rendered segments, not its box. That's
// what these two mirror, reused here for the thing draw.io doesn't
// attempt: a connector endpoint that lives on another connector, staying
// correct however bent or reoriented the target is, since it's derived
// from the real polyline instead of a shape that may not even contain it.
// Both operate on absolutePoints — already-computed, view-space (scaled +
// translated) points — so the fraction itself is scale/pan-independent,
// the same property exitX/exitY have for a vertex.

// Renders a stored path-fraction (0=start, 1=end) back into a point, by
// walking absolutePoints and accumulating segment lengths until `fraction`
// of the total is covered. The inverse of closestFractionOnPath below.
function pointAtPathFraction(points: { x: number; y: number }[], fraction: number): { x: number; y: number } | null {
  if (points.length < 2) return points[0] ?? null;
  const clamped = Math.max(0, Math.min(1, fraction));
  const segLengths: number[] = [];
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    const len = Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y);
    segLengths.push(len);
    total += len;
  }
  if (total === 0) return points[0];
  let target = clamped * total;
  for (let i = 0; i < segLengths.length; i++) {
    if (target <= segLengths[i] || i === segLengths.length - 1) {
      const t = segLengths[i] === 0 ? 0 : Math.max(0, Math.min(1, target / segLengths[i]));
      const a = points[i];
      const b = points[i + 1];
      return { x: a.x + t * (b.x - a.x), y: a.y + t * (b.y - a.y) };
    }
    target -= segLengths[i];
  }
  return points[points.length - 1];
}

// Finds where (px, py) actually lands on a target edge's polyline — the
// closest point on any of its segments — and expresses that as a fraction
// of the path's total length, for storing in exitX/entryX (see
// pinnedEdgeEndStyle and the CELL_CONNECTED catch-all, both of which use
// this instead of the plain bounding-box fraction specifically when the
// target is an edge).
function closestFractionOnPath(points: { x: number; y: number }[], px: number, py: number): number {
  if (points.length < 2) return 0.5;
  const segLengths: number[] = [];
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    const len = Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y);
    segLengths.push(len);
    total += len;
  }
  if (total === 0) return 0.5;
  let bestDist = Infinity;
  let bestLenAlong = 0;
  let cumulative = 0;
  for (let i = 0; i < segLengths.length; i++) {
    const a = points[i];
    const b = points[i + 1];
    const closest = closestPointOnSegment(px, py, a.x, a.y, b.x, b.y);
    const dist = Math.hypot(px - closest.x, py - closest.y);
    if (dist < bestDist) {
      bestDist = dist;
      const segLen = segLengths[i];
      const t = segLen === 0 ? 0 : Math.hypot(closest.x - a.x, closest.y - a.y) / segLen;
      bestLenAlong = cumulative + t * segLen;
    }
    cumulative += segLengths[i];
  }
  return Math.max(0, Math.min(1, bestLenAlong / total));
}

// Finds a wire for a new wire's still-dangling end to branch into — the
// auto-junction half of "a true T-junction auto-places a Wire Connection
// dot." Deliberately excludes any candidate whose own endpoint is within
// `threshold` of `point`: that's just two wires sharing a terminal (e.g.
// both landing on the same component lead), not a real crossing — the same
// distinction validateSchematic's own 6.9 crossing check draws (see
// segmentIntersection's margin exclusion in flowchartRules.ts). Unlike
// findEdgeNearPoint above, this always excludes `excludeEdge` itself —
// without that, a still-dangling end is literally one of its own edge's two
// endpoints, which would always "win" the search at distance 0.
function findHostWireForJunction(
  graph: Graph, excludeEdge: any, point: { x: number; y: number }, threshold: number,
): any {
  let best: any = null;
  let bestDistance = Infinity;
  for (const candidate of graph.getChildEdges(graph.getDefaultParent())) {
    if (candidate === excludeEdge) continue;
    const a = edgeEndpoint(candidate, true);
    const b = edgeEndpoint(candidate, false);
    if (!a || !b) continue;
    if (Math.hypot(point.x - a.x, point.y - a.y) <= threshold) continue;
    if (Math.hypot(point.x - b.x, point.y - b.y) <= threshold) continue;
    const distance = distanceToSegment(point.x, point.y, a.x, a.y, b.x, b.y);
    if (distance <= threshold && distance < bestDistance) {
      best = candidate;
      bestDistance = distance;
    }
  }
  return best;
}

// Creates a real Wire Connection junction vertex at (x, y) — used only by
// the automatic T-junction path (attemptSchematicAutoJunction below); a
// manually-dropped Wire Connection goes through handleDrop's own insertion
// instead. Mirrors handleDrop's own shape-insertion (styleKey + drop size
// from the same IGRAPH_ID_STYLE_MAP/getDropSize this app already uses for
// every palette drop) so an auto-placed dot looks and behaves exactly like
// one the user placed by hand.
function insertSchematicJunction(graph: Graph, x: number, y: number): any {
  const styleKey = IGRAPH_ID_STYLE_MAP['schematic-connection'] ?? 'igraph.schematicConnection';
  const { w, h } = getDropSize('schematic-connection');
  const fullStyle: CellStateStyle = {
    align: 'center' as AlignValue,
    verticalAlign: 'middle' as VAlignValue,
    whiteSpace: 'wrap' as WhiteSpaceValue,
    ...getShapeStyle(styleKey),
    fontColor: BLACK,
    fontSize: 12,
  };
  const cx = Math.round((x - w / 2) / GRID_SIZE) * GRID_SIZE;
  const cy = Math.round((y - h / 2) / GRID_SIZE) * GRID_SIZE;
  const vertex = graph.insertVertex(null, null, '', cx, cy, w, h, fullStyle);
  tagShapeRole(vertex, 'schematic-connection');
  return vertex;
}

// Splits `hostEdge` into two real wires around `junction` — same
// source -> X -> target transformation as the ERD relationship split in
// handleDrop (Entity -> Relationship -> Entity), reused here for both the
// automatic T-junction path and a manually-dropped Wire Connection landing
// on an existing wire (see the broadened split condition in handleDrop).
// Each half keeps whichever original pin data belongs to its own far end
// (the source half's exitX/exitY, the target half's entryX/entryY) via the
// `...base` spread, but the end that now faces the junction instead of the
// wire's original far end is repinned to the junction's own single
// 'joint' point — left as the original edge's stale entryX/entryY (meant
// for whatever the far end used to be) would land the wire off the
// junction's actual center.
function splitSchematicWireAtJunction(graph: Graph, hostEdge: any, junction: any): void {
  const source = hostEdge.getTerminal(true);
  const target = hostEdge.getTerminal(false);
  const startPoint = edgeEndpoint(hostEdge, true);
  const endPoint = edgeEndpoint(hostEdge, false);
  const hostStyle = hostEdge.getStyle();
  const base = (typeof hostStyle === 'object' && hostStyle !== null ? hostStyle : {}) as CellStateStyle;
  const junctionPin = SCHEMATIC_PIN_DEFINITIONS['schematic-connection'][0];

  graph.batchUpdate(() => {
    graph.removeCells([hostEdge]);

    // Cast (rather than annotate the literal as CellStateStyle directly) so
    // TS's excess-property check doesn't reject schematicTargetPin — same
    // trick ERD's cardinalitySide already uses two-way through this file.
    const leftStyle = {
      ...base,
      entryX: junctionPin.x,
      entryY: junctionPin.y,
      entryPerimeter: false,
      edgeStyle: 'orthogonalEdgeStyle',
      schematicTargetPin: junctionPin.id,
    } as CellStateStyle;
    const leftEdge = graph.insertEdge(null, null, '', source, junction, leftStyle);
    if (!source && startPoint) {
      const leftGeo = new Geometry(0, 0, 0, 0);
      leftGeo.setTerminalPoint(new Point(startPoint.x, startPoint.y), true);
      graph.getDataModel().setGeometry(leftEdge, leftGeo);
    }

    const rightStyle = {
      ...base,
      exitX: junctionPin.x,
      exitY: junctionPin.y,
      exitPerimeter: false,
      edgeStyle: 'orthogonalEdgeStyle',
      schematicSourcePin: junctionPin.id,
    } as CellStateStyle;
    const rightEdge = graph.insertEdge(null, null, '', junction, target, rightStyle);
    if (!target && endPoint) {
      const rightGeo = new Geometry(0, 0, 0, 0);
      rightGeo.setTerminalPoint(new Point(endPoint.x, endPoint.y), false);
      graph.getDataModel().setGeometry(rightEdge, rightGeo);
    }
  });
}

// The auto-junction entry point, called from the CELL_CONNECTED listener in
// initGraph once `edge` has at least one end resolved to a real schematic
// component. Checked direction-agnostically on every firing (rather than
// once per gesture) so it doesn't depend on the exact order maxGraph
// resolves a new edge's two ends in: covers both "drawn from a component,
// dropped onto a wire" (a still-dangling end landing near another wire's
// line) and "drawn from a wire, dropped onto a component" (maxGraph's own
// connectableEdges already let that end's terminal literally BE the other
// wire — see graph.setConnectableEdges(true) in initGraph — this just
// converts that raw edge-to-edge attachment into a real, visible dot
// instead of leaving it as an invisible floating tee).
function attemptSchematicAutoJunction(graph: Graph, edge: any): void {
  for (const isSource of [true, false]) {
    const terminal = edge.getTerminal(isSource);
    if (terminal && typeof terminal.isEdge === 'function' && terminal.isEdge()) {
      const aim = edgeEndpoint(edge, !isSource);
      const a = edgeEndpoint(terminal, true);
      const b = edgeEndpoint(terminal, false);
      if (!aim || !a || !b) continue;
      const point = closestPointOnSegment(aim.x, aim.y, a.x, a.y, b.x, b.y);
      const junction = insertSchematicJunction(graph, point.x, point.y);
      splitSchematicWireAtJunction(graph, terminal, junction);
      graph.getDataModel().setTerminal(edge, junction, isSource);
      continue;
    }
    if (terminal) continue;
    const point = edge.getGeometry()?.getTerminalPoint(isSource);
    if (!point) continue;
    const host = findHostWireForJunction(graph, edge, point, CONNECTOR_SNAP_DISTANCE);
    if (!host) continue;
    const junction = insertSchematicJunction(graph, point.x, point.y);
    splitSchematicWireAtJunction(graph, host, junction);
    graph.getDataModel().setTerminal(edge, junction, isSource);
  }
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
// fallback flattening it out. UP = "/" (bottom-left to top-right), DOWN =
// "\" (top-left to bottom-right) — Main Cause (Top) sits above the spine
// so it angles *down* toward it ("\", DOWN), Main Cause (Bottom) sits
// below so it angles *up* toward it ("/", UP) — see the matching comment
// on FishboneCauseTopShapeCanvas in maxgraph-custom-shapes.ts.
const FISHBONE_DIAGONAL_UP = new Set(['fishbone-cause-bottom', 'fishbone-sub-top', 'fishbone-tertiary']);
const FISHBONE_DIAGONAL_DOWN = new Set(['fishbone-cause-top', 'fishbone-sub-bottom']);
// A Main Cause branches off the spine specifically (validateFishbone's
// 5.5) — never straight onto the Fish Head or any other nearby shape, even
// if one happens to be closer to the drop point. The generic connector
// search (bracketing, then nearby-vertex/edge fallback) doesn't know that
// distinction, so these two get their own spine-only search in handleDrop
// instead of the shared one every other connector uses.
const FISHBONE_MAIN_CAUSE_IDS = new Set(['fishbone-cause-top', 'fishbone-cause-bottom']);

// Same "must branch off its specific parent, never anything else" rule as
// FISHBONE_MAIN_CAUSE_IDS above, extended to the legacy Sub-Cause/Tertiary
// Cause roles (removed from the palette — see "Remove Sub-Cause and
// Tertiary Cause from the Fishbone palette/reference" — but still
// rendered/validated in any diagram saved before that). Used below to keep
// the auto-attach-on-move logic from ever wiring one of these straight onto
// an arbitrary nearby vertex on its parent-facing end.
const RESTRICTED_SOURCE_CAUSE_ROLES = new Set([
  ...FISHBONE_MAIN_CAUSE_IDS,
  'fishbone-sub-top',
  'fishbone-sub-bottom',
  'fishbone-tertiary',
]);

// ─── Attach-on-move ──────────────────────────────────────────────────────
// handleDrop's magnet-snap (a shape/connector landing near something it
// should attach to gets attached immediately, see the blocks below it)
// only ever ran at the moment a shape was first dropped from the palette —
// once something was already on the canvas, dragging it near a dangling
// connector end (a Category Box sliding over toward its Main Cause's still
// -loose end, a Main Cause dragged along until it's close enough to the
// spine, an ordinary connector's dangling end dragged onto a shape) did
// nothing at all: the two stayed visually close but structurally
// unattached. These mirror that same snap logic and are re-run after every
// move via the MOVE_CELLS listener in the graph-setup effect below, so
// attaching isn't a one-shot, drop-only affair.

// The mirror of handleDrop's Main Cause branch (see FISHBONE_MAIN_CAUSE_IDS
// above): re-finds the spine near this edge's still-dangling source point
// and, if close enough, attaches to it with the same fixed exitX pinning
// (see the matching comment in handleDrop on why a plain floating
// attachment isn't enough for a line connecting to another line).
function attachMainCauseToSpine(graph: Graph, edge: any, point: { x: number; y: number }) {
  const spine = findEdgeNearPoint(graph, point.x, point.y, CONNECTOR_SNAP_DISTANCE, new Set(['fishbone-spine']));
  if (!spine) return;
  graph.getDataModel().setTerminal(edge, spine, true);
  const spineState = graph.getView().getState(spine);
  if (spineState) {
    const spineX = Math.max(spineState.x, Math.min(spineState.x + spineState.width, point.x));
    const exitX = spineState.width > 0 ? (spineX - spineState.x) / spineState.width : 0.5;
    const style = edge.getStyle();
    const base = typeof style === 'object' && style !== null ? style : {};
    graph.getDataModel().setStyle(edge, { ...base, exitX, exitY: 0.5, exitPerimeter: false } as CellStateStyle);
  }
}

// A moved edge's own dangling end(s) snapping onto whatever vertex is now
// nearby — the reverse direction of attachVertexToDanglingEdges below, for
// when it's the connector itself (rather than the shape) that just moved.
// Excludes the edge's OWN other-side terminal from the search: without
// that, a half-attached edge whose dangling end is nudged/dragged back
// toward the very shape it's already attached to on the other side would
// happily "attach" to that same shape a second time, producing a source
// -> itself self-loop out of nowhere (flagged by validation as "A shape
// can't connect to itself", but the real bug is this silently creating one
// in response to an ordinary nudge). A Fork/Join stub is exactly this
// shape — one end pinned to the bar, the other genuinely dangling only
// CONNECTOR_SNAP_DISTANCE away to start with, so even a couple of nudge
// keystrokes toward the bar could cross back into its own snap radius.
// Sets the terminal AND, same as pinnedEdgeEndStyle's own comment explains,
// the fixed exitX/entryX fraction it would have gotten from an interactive
// drag — a raw setTerminal alone leaves this snap in maxGraph's floating
// mode, which for another connector as the target hardcodes its exact
// midpoint on every redraw regardless of where this end actually landed.
function attachEdgeTerminalPinned(graph: Graph, edge: any, target: any, point: { x: number; y: number }, isSource: boolean) {
  graph.getDataModel().setTerminal(edge, target, isSource);
  const style = edge.getStyle();
  const base = (typeof style === 'object' && style !== null ? style : {}) as Record<string, unknown>;
  graph.getDataModel().setStyle(edge, { ...base, ...pinnedEdgeEndStyle(target, point, isSource) } as CellStateStyle);
}

function attachDanglingEdgeEnds(graph: Graph, edge: any) {
  if (edge.source && edge.target) return;
  const role = getShapeRole(edge);
  const geo = edge.getGeometry();
  if (!geo) return;

  if (!edge.source) {
    const p = geo.getTerminalPoint(true);
    if (p) {
      if (role && FISHBONE_MAIN_CAUSE_IDS.has(role)) {
        attachMainCauseToSpine(graph, edge, p);
      } else if (!role || !RESTRICTED_SOURCE_CAUSE_ROLES.has(role)) {
        // Falls back to the nearest EDGE (same as findConnectorDropEndpoints'
        // own fallback and handleDrop's magnet-snap) when no vertex is close
        // enough — dragging a still-dangling connector near ANOTHER
        // connector should snap onto it exactly the same way dragging it
        // near a shape already does; a vertex target isn't a special case
        // here, just the more common one.
        const target = findNearbyVertex(graph, p.x, p.y, CONNECTOR_SNAP_DISTANCE, edge.target)
          ?? findEdgeNearPoint(graph, p.x, p.y, CONNECTOR_SNAP_DISTANCE, undefined, edge);
        if (target) attachEdgeTerminalPinned(graph, edge, target, p, true);
      }
    }
  }
  if (!edge.target) {
    const p = geo.getTerminalPoint(false);
    if (p) {
      const target = findNearbyVertex(graph, p.x, p.y, CONNECTOR_SNAP_DISTANCE, edge.source)
        ?? findEdgeNearPoint(graph, p.x, p.y, CONNECTOR_SNAP_DISTANCE, undefined, edge);
      if (target) attachEdgeTerminalPinned(graph, edge, target, p, false);
    }
  }
}

// A moved vertex snapping onto any dangling edge end that's now close
// enough — same generic "shape dropped near a loose connector end" match
// as handleDrop's own post-insert block, just re-run on every move instead
// of once at drop time. Skips a dangling end that belongs to a restricted
// cause role (see RESTRICTED_SOURCE_CAUSE_ROLES) on its parent-facing
// side — that one may only ever attach via attachMainCauseToSpine, never
// to an arbitrary nearby vertex.
function attachVertexToDanglingEdges(graph: Graph, vertex: any) {
  const geo = vertex.getGeometry();
  if (!geo) return;
  const anchorX = geo.x + geo.width / 2;
  const anchorY = geo.y + geo.height / 2;
  for (const edge of graph.getChildEdges(graph.getDefaultParent())) {
    if (edge.source && edge.target) continue;
    const role = getShapeRole(edge);
    const edgeGeo = edge.getGeometry();
    if (!edge.source && (!role || !RESTRICTED_SOURCE_CAUSE_ROLES.has(role))) {
      const p = edgeGeo?.getTerminalPoint(true);
      if (p && Math.hypot(p.x - anchorX, p.y - anchorY) <= CONNECTOR_SNAP_DISTANCE) {
        attachEdgeTerminalPinned(graph, edge, vertex, p, true);
        continue;
      }
    }
    if (!edge.target) {
      const p = edgeGeo?.getTerminalPoint(false);
      if (p && Math.hypot(p.x - anchorX, p.y - anchorY) <= CONNECTOR_SNAP_DISTANCE) {
        attachEdgeTerminalPinned(graph, edge, vertex, p, false);
      }
    }
  }
}

// Runs on the FDD CELL_CONNECTED listener further down for every connect
// (or reconnect) of a plain Connector between two Function boxes — applies
// only the org-chart *routing* (orthogonalEdgeStyle, square corners), never
// WHERE the ends attach. That's deliberate: this used to also compute a
// "canonical" entry/exit point from the two boxes' geometry and reapply it
// on every single reconnect — including a redrag the user just did on
// purpose — which is what made every FDD link feel permanently locked to
// one spot. The CELL_CONNECTED catch-all fix further down already updates
// an edge's fixed point to wherever it was actually just dropped, and lets
// it be re-dragged again later — the same accurate, drag-respecting
// behavior every other connector in this app gets. This listener firing
// for that exact same connect and unconditionally overwriting the position
// right back to its own computed value undid that the instant it landed.
// Position is now entirely the catch-all's job here too. edgeStyle/rounded
// are harmless/idempotent to reapply on every connect — they're the routing
// shape, not a position, and stay correct regardless of which exact point
// the ends end up pinned to.
function applyFddEntryStyle(graph: Graph, edge: any): void {
  if (!edge) return;
  const source = edge.getTerminal(true);
  const target = edge.getTerminal(false);
  const isFunctionVertex = (c: any) => !!c && typeof c.isVertex === 'function' && c.isVertex() && getShapeRole(c) === 'function';
  if (!isFunctionVertex(source) || !isFunctionVertex(target)) return;
  const edgeRole = getShapeRole(edge);
  if (edgeRole === 'control' || edgeRole === 'mechanism' || edgeRole === 'fdd-interface') return;
  const currentStyle = edge.getStyle();
  const base = typeof currentStyle === 'object' && currentStyle !== null ? currentStyle : {};
  graph.batchUpdate(() => {
    edge.setStyle({ ...base, edgeStyle: 'orthogonalEdgeStyle', rounded: false } as CellStateStyle);
    // See the matching comment on the CELL_CONNECTED catch-all fix further
    // down for why this is revalidate() rather than the narrower
    // graph.refresh(edge) it used to be.
    graph.getView().revalidate();
  });
}

// The mirror of handleDrop's own spine<->head special case: attaches
// regardless of distance since there's only ever one of each, so any move
// that leaves one of them still dangling with the other already present
// (either one could have just been dragged away and back) reconnects them.
//
// The spine's tail end (whichever of source/target the head *didn't* claim
// at drop time) is permanently, intentionally dangling — see the
// "head !== sourceCell" guard and comment in handleDrop above, there since
// the spine is meant to extend past the head with nothing at that far end
// at all. findDanglingEdgeByRole has no way to tell that apart from a
// genuinely-still-unattached end, so without re-checking here too, this
// used to fire on *every single move of anything* once a spine+head both
// existed — re-wiring that permanent tail straight onto the head, which was
// already the spine's other end. That made the spine's source and target
// the same cell: a zero-length degenerate edge, which renders as nothing —
// the "moving a Category Box makes the spine disappear" symptom, even
// though the Category Box move itself had nothing to do with the spine.
function attachSpineToHead(graph: Graph) {
  const dangling = findDanglingEdgeByRole(graph, new Set(['fishbone-spine']));
  if (!dangling) return;
  const otherEnd = dangling.edge.getTerminal(!dangling.isSource);
  const head = findVertexByRole(graph, new Set(['fishbone-head', 'fishbone-problem']));
  if (!head || head === otherEnd) return;
  graph.getDataModel().setTerminal(dangling.edge, head, dangling.isSource);
  if (getShapeRole(head) === 'fishbone-head') {
    const style = dangling.edge.getStyle();
    const base = typeof style === 'object' && style !== null ? style : {};
    const fixedPoint = dangling.isSource
      ? { exitX: 0.5, exitY: 0.5, exitPerimeter: false }
      : { entryX: 0.5, entryY: 0.5, entryPerimeter: false };
    graph.getDataModel().setStyle(dangling.edge, { ...base, ...fixedPoint } as CellStateStyle);
  }
}

// A Main Cause already attached to the spine used to be frozen at whatever
// point along it it first landed on — dragging the shape only ever moved its
// still-floating outer/label end (translateCell moves an edge's own
// terminalPoint, but a *real* terminal like the spine renders from
// exitX/exitY + the spine's own geometry instead, which translate() never
// touches), so there was no way to slide it left/right along the spine
// afterward short of grabbing the exact pixel-sized connection handle. This
// shifts exitX by the same dx every other moved shape gets, so the whole
// diagonal — anchor included — actually slides as one piece, anywhere along
// the spine's full length (clamped to its two ends). exitY is left at 0.5
// (the spine's vertical center) always — that's what keeps a Top cause
// above and a Bottom cause below, and moving along the spine is purely
// horizontal.
function slideMainCauseAlongSpine(graph: Graph, edge: any, dx: number) {
  if (dx === 0) return;
  const spine = edge.getTerminal(true);
  if (!spine || getShapeRole(spine) !== 'fishbone-spine') return;
  const spineState = graph.getView().getState(spine);
  if (!spineState || spineState.width <= 0) return;
  const style = edge.getStyle();
  const base = typeof style === 'object' && style !== null ? style : {};
  const currentExitX = typeof base.exitX === 'number' ? base.exitX : 0.5;
  const scale = graph.getView().getScale();
  const currentAbsX = spineState.x + currentExitX * spineState.width;
  const newAbsX = Math.max(spineState.x, Math.min(spineState.x + spineState.width, currentAbsX + dx * scale));
  const newExitX = (newAbsX - spineState.x) / spineState.width;
  graph.getDataModel().setStyle(edge, { ...base, exitX: newExitX, exitY: 0.5, exitPerimeter: false } as CellStateStyle);
}

// graph.getView().revalidate() (invalidate() + validate(), both exhaustive —
// every CellState in the tree gets marked invalid and its geometry
// recomputed) is what every "pin a fixed exitX/exitY/entryX/entryY fraction
// via a plain setStyle" fix in this file (the CELL_CONNECTED catch-all,
// slideAutoPinnedEdgeEnd, slideSequenceMessageAlongTimelines, slideMainCause
// AlongSpine, slideForkJoinStubAlongBar) already calls afterward, on the
// belief that it forces the line to actually repaint. It reliably updates
// the STATE's geometry (state.absolutePoints) — but CellRenderer.redrawShape
// only repaints the actual SHAPE (the visible SVG) when it decides the
// state "is invalid" for THAT shape specifically (isShapeInvalid: compares
// the shape's own currently-painted state.shape.points against the state's
// freshly-recomputed absolutePoints) OR when told to unconditionally via
// force=true. That comparison is exactly where this class of bug survives
// revalidate(): confirmed live (a connector reconnected onto another
// connector, and a Sequence message body-dragged along its timelines, both
// end up with the CORRECT exitX/exitY saved into the model — reopening the
// diagram, which rebuilds every Shape from scratch via loadXml, always
// renders it right — yet the SAME already-open canvas keeps showing the
// stale line, no matter how many times revalidate() runs). Whatever the
// exact reason isShapeInvalid's comparison keeps missing the change for
// this specific case, forcing it here — instead of continuing to trust the
// heuristic — is what actually guarantees the visible line matches the
// model on every single call, with no dependency on that comparison at all.
function forceEdgeRepaint(graph: Graph, edge: any): void {
  const state = graph.getView().getState(edge);
  if (state) graph.cellRenderer.redraw(state, true);
}

// The Sequence-diagram counterpart of slideMainCauseAlongSpine above, for
// the exact same underlying reason: a Sync/Async/Return message with both
// (or either) end pinned to a fixed exitY/entryY fraction (see
// sequenceMessageConnectionStyle/applySequenceEndpointStyle) renders from
// that fraction + its connected timeline's own geometry, which
// translateCell never touches — so dragging an already-connected message
// either didn't visually move at all, or (worse) moving it any other way
// than grabbing both tiny connection handles in perfect sync desynced
// exitY from entryY, leaving the message rendering as a diagonal kink
// instead of the clean horizontal line every message should be. This
// shifts exitY and entryY together by the same vertical distance the move
// covered, on whichever ends are actually attached, so the whole message
// slides up/down as one level line — the same "grab it anywhere and it
// just slides" behavior every other shape already has.
function slideSequenceMessageAlongTimelines(graph: Graph, edge: any, dy: number) {
  if (dy === 0) return;
  const role = getShapeRole(edge);
  if (!role || !SEQUENCE_MESSAGE_SHAPE_IDS.has(role)) return;
  const source = edge.getTerminal(true);
  const target = edge.getTerminal(false);
  if (!source && !target) return;
  const style = edge.getStyle();
  const base = (typeof style === 'object' && style !== null ? style : {}) as CellStateStyle & Record<string, unknown>;
  const scale = graph.getView().getScale();
  const patch: Record<string, unknown> = {};

  const slide = (cell: any, key: 'exitY' | 'entryY') => {
    const state = graph.getView().getState(cell);
    if (!state || state.height <= 0) return;
    const current = typeof base[key] === 'number' ? (base[key] as number) : 0.5;
    const currentAbsY = state.y + current * state.height;
    const newAbsY = Math.max(state.y, Math.min(state.y + state.height, currentAbsY + dy * scale));
    patch[key] = (newAbsY - state.y) / state.height;
  };

  if (source) {
    slide(source, 'exitY');
    patch.exitX = 1;
    patch.exitDx = 0;
    patch.exitDy = 0;
  }
  if (target) {
    slide(target, 'entryY');
    patch.entryX = 0;
    patch.entryDx = 0;
    patch.entryDy = 0;
  }
  if (Object.keys(patch).length) {
    graph.getDataModel().setStyle(edge, { ...base, ...patch } as CellStateStyle);
  }
}

// The Fork/Join counterpart of slideMainCauseAlongSpine above, for the exact
// same underlying reason: a stub's bar-side end renders from its own exitX/
// entryX fraction + the bar's current geometry, which translateCell (nudge's
// own mechanism) never touches — only the still-dangling far end has a real
// stored point for a nudge/drag to actually shift. Left alone, moving the
// dangling end pivots the line around the fixed bar attachment instead of
// sliding the whole arrow sideways as one piece — the "pins to the bar but
// won't move with it" bug. This shifts that fraction by the same horizontal
// distance the move covered, so the bar-side end tracks along with it,
// clamped to the bar's own two ends. Only applies while the far end is
// still genuinely dangling — once it's attached to a real shape, this is an
// ordinary two-shape connection and shouldn't keep sliding along the bar.
function slideForkJoinStubAlongBar(graph: Graph, edge: any, dx: number) {
  if (dx === 0) return;
  const source = edge.getTerminal(true);
  const target = edge.getTerminal(false);
  const isBar = (c: any) => !!c && (getShapeRole(c) === 'act-fork' || getShapeRole(c) === 'act-join');

  let bar: any;
  let key: 'exitX' | 'entryX';
  if (isBar(source) && !target) {
    bar = source;
    key = 'exitX';
  } else if (isBar(target) && !source) {
    bar = target;
    key = 'entryX';
  } else {
    return;
  }

  const barState = graph.getView().getState(bar);
  if (!barState || barState.width <= 0) return;
  const style = edge.getStyle();
  const base = (typeof style === 'object' && style !== null ? style : {}) as Record<string, unknown>;
  const currentFrac = typeof base[key] === 'number' ? (base[key] as number) : 0.5;
  const scale = graph.getView().getScale();
  const currentAbsX = barState.x + currentFrac * barState.width;
  const newAbsX = Math.max(barState.x, Math.min(barState.x + barState.width, currentAbsX + dx * scale));
  const newFrac = (newAbsX - barState.x) / barState.width;
  graph.getDataModel().setStyle(edge, { ...base, [key]: newFrac } as CellStateStyle);
}

// The generic counterpart of slideMainCauseAlongSpine/slideForkJoinStubAlong
// Bar above, for the exact same underlying reason, generalized to ANY
// connector attached to another connector rather than one specific diagram's
// named shapes — see the CELL_CONNECTED catch-all fix's igraphAutoPinSource/
// igraphAutoPinTarget markers. A connector-to-connector attachment is pinned
// via a fixed exitX/entryX fraction of the *target* connector's own bounds,
// same mechanism as a fixed point on a vertex — and translateCell (plain
// dragging) never touches that fraction, only the edge's own waypoints/
// offset. Left alone, dragging an already-attached connector's body did
// nothing visible: it recomputed straight back to the same fraction × the
// same (unmoved) target bounds, reading as "locked in place" the instant it
// first attached. Only acts on an end THIS app's own catch-all pinned (the
// igraphAutoPin* marker) — a dedicated case like Main Cause/spine already
// has its own specific slide function above and never sets that marker, so
// this doesn't double-handle (or fight) those.
function slideAutoPinnedEdgeEnd(graph: Graph, edge: any, dx: number, dy: number) {
  if (dx === 0 && dy === 0) return;
  const style = edge.getStyle();
  const base = (typeof style === 'object' && style !== null ? style : {}) as Record<string, unknown>;
  const scale = graph.getView().getScale();
  const patch: Record<string, unknown> = {};

  const slideEnd = (isSource: boolean) => {
    if (!isAutoPinnedFlag(base[isSource ? 'igraphAutoPinSource' : 'igraphAutoPinTarget'])) return;
    const terminal = edge.getTerminal(isSource);
    if (!terminal) return;
    const state = graph.getView().getState(terminal);
    if (!state) return;
    const xKey = isSource ? 'exitX' : 'entryX';
    const yKey = isSource ? 'exitY' : 'entryY';
    const currentX = typeof base[xKey] === 'number' ? (base[xKey] as number) : 0.5;
    if (typeof terminal.isEdge === 'function' && terminal.isEdge() && Array.isArray(state.absolutePoints) && state.absolutePoints.length >= 2) {
      // A connector target: xKey is a PATH-LENGTH fraction (see
      // pinnedEdgeEndStyle/getConnectionPoint's own comment), so "slide by
      // (dx, dy)" means moving the CURRENT point on that path by the drag
      // delta, then re-projecting onto the path to find the new nearest
      // fraction — free movement in any direction that still always
      // resolves back onto the line, rather than only ever responding to
      // whichever single axis the target's bounding box happened to be
      // wide/tall in.
      const points = state.absolutePoints.filter((p) => p != null) as { x: number; y: number }[];
      const current = pointAtPathFraction(points, currentX);
      if (!current) return;
      const moved = { x: current.x + dx * scale, y: current.y + dy * scale };
      patch[xKey] = closestFractionOnPath(points, moved.x, moved.y);
      return;
    }
    if (state.width <= 0 && state.height <= 0) return;
    const currentY = typeof base[yKey] === 'number' ? (base[yKey] as number) : 0.5;
    if (state.width > 0) {
      const currentAbsX = state.x + currentX * state.width;
      const newAbsX = Math.max(state.x, Math.min(state.x + state.width, currentAbsX + dx * scale));
      patch[xKey] = (newAbsX - state.x) / state.width;
    }
    if (state.height > 0) {
      const currentAbsY = state.y + currentY * state.height;
      const newAbsY = Math.max(state.y, Math.min(state.y + state.height, currentAbsY + dy * scale));
      patch[yKey] = (newAbsY - state.y) / state.height;
    }
  };

  slideEnd(true);
  slideEnd(false);
  if (Object.keys(patch).length) {
    graph.getDataModel().setStyle(edge, { ...base, ...patch } as CellStateStyle);
  }
}

// Entry point for the MOVE_CELLS listener below — re-runs the same
// magnet-attach checks handleDrop does, scoped to just the cells that
// actually moved (plus the always-cheap spine/head check, since either one
// moving can reconnect the other), slides any already-attached Main Cause
// along the spine by the same horizontal distance the move covered, and
// slides any already-attached Sequence message along its timeline(s) by
// the same vertical distance.
export function runAutoAttachOnMove(graph: Graph, movedCells: any[], dx = 0, dy = 0) {
  // Every edge a slide helper below actually repositions (a plain setStyle
  // on a fixed exitX/entryX fraction, not a geometry change) needs an
  // explicit forced repaint after — see forceEdgeRepaint's own comment for
  // why graph.getView().revalidate() alone isn't reliable for this specific
  // "style-only pin change" case, confirmed live for both this MOVE_CELLS
  // path (dragging a connector's own body) and the CELL_CONNECTED one
  // (dragging an endpoint onto a new target). Collected here rather than
  // called inline in each branch so a cell handled by more than one slide
  // path in the same pass — never happens today, but nothing prevents it —
  // still only gets force-repainted once.
  const slidEdges = new Set<any>();
  graph.batchUpdate(() => {
    for (const cell of movedCells) {
      if (!cell) continue;
      if (typeof cell.isVertex === 'function' && cell.isVertex()) {
        attachVertexToDanglingEdges(graph, cell);
        attachDanglingSequenceMessages(graph, cell);
        // Dragging a Fork/Join bar to a new spot leaves any still-dangling
        // stub arrow behind at its old absolute position (see
        // realignForkJoinStubs) — same fix as CELLS_RESIZED's, just for a
        // move instead of a resize.
        const barRole = getShapeRole(cell);
        if (barRole === 'act-fork' || barRole === 'act-join') {
          realignForkJoinStubs(graph, cell);
        }
      } else if (typeof cell.isEdge === 'function' && cell.isEdge()) {
        const role = getShapeRole(cell);
        if (cell.source && role && FISHBONE_MAIN_CAUSE_IDS.has(role)) {
          slideMainCauseAlongSpine(graph, cell, dx);
          slidEdges.add(cell);
        }
        if (role && SEQUENCE_MESSAGE_SHAPE_IDS.has(role)) {
          slideSequenceMessageAlongTimelines(graph, cell, dy);
          slidEdges.add(cell);
        }
        if (role === 'act-control-flow') {
          slideForkJoinStubAlongBar(graph, cell, dx);
          slidEdges.add(cell);
        }
        slideAutoPinnedEdgeEnd(graph, cell, dx, dy);
        slidEdges.add(cell);
        attachDanglingEdgeEnds(graph, cell);
      }
    }
    attachSpineToHead(graph);
  });
  graph.getView().revalidate();
  for (const edge of slidEdges) forceEdgeRepaint(graph, edge);
}

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
  // Sequence Diagram convention: a message's label sits just above its
  // (near-horizontal) line, not centered directly on top of it — the
  // default maxGraph edge label position, which visually collided with the
  // line/arrowhead. verticalLabelPosition moves the label bounds above the
  // edge's own anchor point; verticalAlign then sits the text against the
  // bottom of those bounds, so it lands snug just above the line rather
  // than floating further up. Every call site for these three message
  // types (Sync/Async/Return) always goes through this one function, drop
  // or otherwise, so setting it unconditionally here covers all of them.
  const style: Partial<CellStateStyle> & Record<string, unknown> = {
    verticalLabelPosition: 'top',
    verticalAlign: 'bottom',
  };
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
  // A strict containment test (dropY has to fall exactly within this
  // candidate's own y..y+height) silently dropped the far side into
  // "not found" whenever the two participants' Activation bars/Lifelines
  // weren't pixel-perfectly matched in height/start — completely normal
  // when each was independently placed — even on a drop that visually
  // reads as an obvious "between the two of them". Same
  // CONNECTOR_SNAP_DISTANCE tolerance every other magnet-attach in this
  // file already uses, applied here to the vertical containment check.
  const candidates = graph
    .getChildVertices(parent)
    .filter((cell: any) => {
      const shape = getCellStyleShapeName(cell);
      if (!shape || !SEQUENCE_TIMELINE_STYLES.has(shape)) return false;
      const geo = cell.getGeometry();
      return !!geo
        && dropY >= geo.y - CONNECTOR_SNAP_DISTANCE
        && dropY <= geo.y + geo.height + CONNECTOR_SNAP_DISTANCE;
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

// findSequenceMessageEndpoints above only ever runs once, at the moment a
// Sync/Async/Return message is first dropped — a perfectly normal sequence-
// diagram workflow is to lay out participants and Activation bars first,
// wire messages between them, then stretch an Activation bar taller
// afterward to actually match how long the interaction runs. That resize
// (or a plain move) never revisited any message that was dropped just past
// the bar's shorter reach at the time, leaving it permanently dangling —
// the "dropped between two Activations but it didn't connect" symptom.
// This is the Sequence-diagram-specific counterpart to
// attachVertexToDanglingEdges above: that one's a euclidean
// distance-from-center test, which is the wrong shape of test entirely for
// a tall, narrow bar (a message dangling near one end of a 400px-tall
// Activation can easily be 150+px from its *center*, well outside
// CONNECTOR_SNAP_DISTANCE) — this instead reuses the same "does the
// message's Y fall within this timeline shape's span" test
// findSequenceMessageEndpoints already uses at drop time.
function attachDanglingSequenceMessages(graph: Graph, timelineCell: any) {
  const shape = getCellStyleShapeName(timelineCell);
  if (!shape || !SEQUENCE_TIMELINE_STYLES.has(shape)) return;
  const geo = timelineCell.getGeometry();
  if (!geo) return;
  for (const edge of graph.getChildEdges(graph.getDefaultParent())) {
    if (edge.source && edge.target) continue;
    const role = getShapeRole(edge);
    if (!role || !SEQUENCE_MESSAGE_SHAPE_IDS.has(role)) continue;
    const edgeGeo = edge.getGeometry();
    if (!edgeGeo) continue;
    if (!edge.source && timelineCell !== edge.target) {
      const p = edgeGeo.getTerminalPoint(true);
      if (p && p.y >= geo.y && p.y <= geo.y + geo.height) {
        graph.getDataModel().setTerminal(edge, timelineCell, true);
        applySequenceEndpointStyle(graph, edge, timelineCell, true, p.y);
        continue;
      }
    }
    if (!edge.target && timelineCell !== edge.source) {
      const p = edgeGeo.getTerminalPoint(false);
      if (p && p.y >= geo.y && p.y <= geo.y + geo.height) {
        graph.getDataModel().setTerminal(edge, timelineCell, false);
        applySequenceEndpointStyle(graph, edge, timelineCell, false, p.y);
      }
    }
  }
}

// The reattach-time equivalent of sequenceMessageConnectionStyle above —
// that one computes both ends at once from a fresh drop point, this patches
// just the one end that's newly attaching, at whatever height it was
// already dangling at.
function applySequenceEndpointStyle(graph: Graph, edge: any, cell: any, isSource: boolean, y: number) {
  const geo = cell.getGeometry();
  if (!geo || geo.height <= 0) return;
  const style = edge.getStyle();
  const base = typeof style === 'object' && style !== null ? style : {};
  const fraction = Math.min(1, Math.max(0, (y - geo.y) / geo.height));
  const patch = isSource
    ? { exitX: 1, exitY: fraction, exitDx: 0, exitDy: 0 }
    : { entryX: 0, entryY: fraction, entryDx: 0, entryDy: 0 };
  graph.getDataModel().setStyle(edge, { ...base, ...patch } as CellStateStyle);
}

interface DiagramCanvasProps {
  onReady?: (graph: any) => void;
  onChange?: (xml: string, patches: DiagramPatch[]) => void;
  onSelectionChange?: (cell: any) => void;
  onZoomChange?: (scalePercent: number) => void;
  umlType?: string;
  /** Shows a floating delete (trash) button at the top-right corner of the
   *  selected shape — mobile has no Delete key, unlike desktop, so touch
   *  users otherwise have no way to remove a shape at all. */
  isMobile?: boolean;
  /** Pixels of the graph container's own left edge that are actually
   *  covered by a floating panel (create.tsx's icon rail + ShapesPanel,
   *  both `position: absolute` on top of the canvas, not a flex sibling
   *  that would shrink it) — see loadXmlImpl's desktop re-center branch for
   *  why this matters: the graph container's clientWidth includes that
   *  covered strip, so centering against the full width can land a
   *  freshly-opened diagram partly or fully underneath the panel. */
  leftObstruction?: number;
}

export interface DiagramCanvasHandle {
  // resetView (default true) re-centers/re-fits the camera after loading —
  // right for a fresh open/page-switch/undo, wrong for a live collaborative
  // update, where the viewer's own pan/zoom should never jump just because
  // someone else edited (see onRemoteChange's call site in create.tsx).
  loadXml: (xml: string, options?: { resetView?: boolean }) => void;
  // Applies a small collaboration patch list in place (via the model's own
  // public setters) instead of a full loadXml reimport — see
  // utils/diagramPatch.ts. A 'full' patch (the escape hatch for an
  // unrecognized edit type) is handled internally by delegating to loadXml
  // with resetView:false, same as a normal remote update. Returns the
  // freshly re-exported xml (so the caller can keep pageXmlCache/autosave
  // fed exactly as it does for a received full snapshot today) and whether
  // any patch referenced a cell that doesn't exist locally — a sign this
  // client has drifted and needs a full resync. Null only if the graph
  // isn't ready yet.
  applyPatches: (patches: DiagramPatch[]) => { xml: string; driftDetected: boolean } | null;
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
  // Live collaboration presence: highlights whichever shape a remote
  // collaborator (identified by userId) currently has selected, in that
  // person's own color — see app/(tabs)/create.tsx's cell-select wiring.
  // cellId null clears that user's highlight (they deselected/left).
  setRemoteSelection: (userId: string, cellId: string | null, color: string) => void;
  // Clears every remote highlight at once — used when leaving/switching
  // diagrams, so a stale highlight from the old room can't linger into the
  // next one.
  clearAllRemoteSelections: () => void;
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
    // Same reasoning as umlLifeline just above: each lane's name belongs
    // inside its own header band (see UMLSwimlaneShapeCanvas's `header`,
    // capped at 40px) at the top of the lane, not centered on the whole
    // tall body below it.
    'igraph.umlSwimlane': {
      shape: 'igraph.umlSwimlane',
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
    'igraph.umlFork': {
      shape: 'igraph.umlFork',
      fillColor: BLACK,
      strokeColor: BLACK,
      strokeWidth: 0,
    },
    'igraph.umlJoin': {
      shape: 'igraph.umlJoin',
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

// ─── Activity Diagram Swimlane lanes ───────────────────────────────────────
// A real Activity Diagram swimlane is a set of adjoining lanes sharing one
// continuous header row — not independent boxes wired together by a
// connector (every professional tool — draw.io's Pool/Lane, Visio's cross-
// functional flowchart, Lucidchart's swimlane — models it that way: lanes
// are contiguous by construction, and adding one is a structural insert,
// never a "draw an edge to the next box" action). This models each lane as
// its own top-level vertex — the same flat, role-tagged-siblings approach
// Fishbone's cause boxes and ERD's split cardinality already use elsewhere
// in this file — rather than true maxGraph parent/child containment like
// insertUmlClassCell just above (that one needs real containment so each
// compartment can resize independently; lanes only ever need to stay
// flush, which plain geometry math handles fine). A shared `swimlaneGroup`
// id in each lane's style is what ties them together.
//
// Both entry points that can add a lane — handleDrop's drag-and-drop
// magnet-attach and createShapeInDirection's click-arrow — funnel through
// insertSwimlaneLane, so a new lane always lands flush against its
// neighbor (zero gap, matching height, no connecting edge) instead of the
// generic "new shape + connector" treatment every other shape gets.

function getSwimlaneGroupId(cell: any): string | undefined {
  const style = cell?.getStyle?.();
  return typeof style === 'object' && style !== null
    ? ((style as Record<string, unknown>).swimlaneGroup as string | undefined)
    : undefined;
}

// Lazy-init: a lane created before this feature (or a lone first lane with
// nothing to group with yet) has no id until the moment it actually needs
// one — the first time a second lane attaches to it.
function ensureSwimlaneGroupId(graph: Graph, cell: any): string {
  const existing = getSwimlaneGroupId(cell);
  if (existing) return existing;
  const id = `swimlane-${Date.now()}-${Math.round(Math.random() * 1e6)}`;
  const style = cell.getStyle();
  const base = (typeof style === 'object' && style !== null ? style : {}) as Record<string, unknown>;
  graph.getDataModel().setStyle(cell, { ...base, swimlaneGroup: id } as CellStateStyle);
  return id;
}

// Repositions every lane in `orderedLanes` (already sorted in the desired
// left-to-right order) flush against each other, anchored at wherever the
// first one already sits — so inserting or reordering a lane only ever
// closes gaps, never shifts the group's overall position on the canvas.
function restackSwimlaneGroup(graph: Graph, orderedLanes: any[]) {
  const model = graph.getDataModel();
  let x = orderedLanes[0]?.getGeometry()?.x ?? 0;
  orderedLanes.forEach((lane) => {
    const geo = lane.getGeometry();
    if (!geo) return;
    if (geo.x !== x) {
      const newGeo = geo.clone();
      newGeo.x = x;
      model.setGeometry(lane, newGeo);
    }
    x += geo.width;
  });
}

// Inserts a new lane immediately beside `neighborLane` (on `side`), matching
// its height and width, tags it into the same group, and restacks the whole
// group so every lane stays contiguous — never a floating standalone box,
// never a connector between lanes. Used by both handleDrop (drag a fresh
// Swimlane next to an existing one) and createShapeInDirection (click a
// lane's own left/right arrow).
function insertSwimlaneLane(graph: Graph, neighborLane: any, side: 'left' | 'right'): any {
  let newLane: any;
  graph.batchUpdate(() => {
    const groupId = ensureSwimlaneGroupId(graph, neighborLane);
    const geo = neighborLane.getGeometry();
    const style = neighborLane.getStyle();
    const base = (typeof style === 'object' && style !== null ? style : {}) as Record<string, unknown>;
    newLane = graph.insertVertex(null, null, '', geo.x, geo.y, geo.width, geo.height, {
      ...base,
      swimlaneGroup: groupId,
    } as CellStateStyle);
    tagShapeRole(newLane, 'act-swimlane');

    const siblings = graph
      .getChildVertices(graph.getDefaultParent())
      .filter((c: any) => c !== newLane && getShapeRole(c) === 'act-swimlane' && getSwimlaneGroupId(c) === groupId)
      .sort((a: any, b: any) => (a.getGeometry()?.x ?? 0) - (b.getGeometry()?.x ?? 0));
    const neighborIndex = siblings.indexOf(neighborLane);
    siblings.splice(side === 'right' ? neighborIndex + 1 : neighborIndex, 0, newLane);
    restackSwimlaneGroup(graph, siblings);
  });
  return newLane;
}

// The drag-and-drop counterpart of createShapeInDirection's click-arrow
// entry point: a fresh Swimlane dropped close to an existing lane's left or
// right edge attaches as another lane in that group instead of landing as
// an unrelated floating box a few pixels away. Also requires the drop point
// to fall within the lane's own vertical span (+ threshold) — lanes only
// ever grow sideways, so a drop that's horizontally close but far above or
// below the lane shouldn't misfire.
function findNearestSwimlaneNeighbor(
  graph: Graph, x: number, y: number, threshold: number,
): { lane: any; side: 'left' | 'right' } | null {
  let best: { lane: any; side: 'left' | 'right' } | null = null;
  let bestDistance = Infinity;
  for (const cell of graph.getChildVertices(graph.getDefaultParent())) {
    if (getShapeRole(cell) !== 'act-swimlane') continue;
    const geo = cell.getGeometry();
    if (!geo) continue;
    if (y < geo.y - threshold || y > geo.y + geo.height + threshold) continue;
    const distLeft = Math.abs(x - geo.x);
    if (distLeft <= threshold && distLeft < bestDistance) {
      bestDistance = distLeft;
      best = { lane: cell, side: 'left' };
    }
    const distRight = Math.abs(x - (geo.x + geo.width));
    if (distRight <= threshold && distRight < bestDistance) {
      bestDistance = distRight;
      best = { lane: cell, side: 'right' };
    }
  }
  return best;
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

// A Fork/Join bar's "arrow" needs to be a real, draggable, extendable
// connector — not paint — so a user can actually move it or stretch it to
// reach a real target, same as any other connector in this app. This wires
// up the bar's standard starting set (Fork: 1 in/2 out, Join: 2 in/1 out,
// matching the reference notation) as real Control Flow edges: one end
// pinned to the bar at a fixed fraction of its length (so it tracks the bar
// if it's later lengthened — the interactive equivalent of the universal
// floating-connection-pin fix in initGraph's CELL_CONNECTED listener, which
// only fires for an interactive drag-connect; this pins the same way by
// hand since these are created programmatically, not dragged), the other
// end left dangling a fixed distance away for the user to grab and drag
// onto whatever it should actually lead to/from — same pattern as a
// Fishbone cause's line starting dangling until dropped near the spine.
// Doing this at creation time also means a fresh Fork/Join immediately
// satisfies its own "needs 2+ outgoing"/"needs 2+ incoming" validation
// instead of nagging until the user draws the exact same arrows by hand.
// Shared by handleDrop (dragged from the palette) and createShapeInDirection
// (added via a lane's own click-arrow), so a bar looks and behaves
// identically regardless of which way it was created.
const FORK_JOIN_STUB_LENGTH = 40;

export function insertForkJoinStubs(graph: Graph, bar: any, shapeId: 'act-fork' | 'act-join') {
  const geo = bar.getGeometry();
  if (!geo || geo.height <= 0) return;

  const barThickness = Math.min(geo.height, 10);
  const topFrac = (geo.height - barThickness) / 2 / geo.height;
  const bottomFrac = ((geo.height - barThickness) / 2 + barThickness) / geo.height;
  const inFracs = shapeId === 'act-join' ? [0.25, 0.75] : [0.5];
  const outFracs = shapeId === 'act-join' ? [0.5] : [0.25, 0.75];

  const styleKey = IGRAPH_ID_STYLE_MAP['act-control-flow'] ?? 'igraph.umlControlFlow';
  const baseStyle: CellStateStyle = {
    ...getShapeStyle(styleKey),
    fontColor: BLACK,
    fontSize: 12,
    labelBackgroundColor: CANVAS_BG,
  };

  graph.batchUpdate(() => {
    inFracs.forEach((frac) => {
      const sx = geo.x + geo.width * frac;
      const style: CellStateStyle = { ...baseStyle, entryX: frac, entryY: topFrac, entryPerimeter: false };
      const edge = graph.insertEdge(null, null, '', null, bar, style);
      const geometry = new Geometry(0, 0, 0, 0);
      geometry.setTerminalPoint(new Point(sx, geo.y - FORK_JOIN_STUB_LENGTH), true);
      graph.getDataModel().setGeometry(edge, geometry);
      tagShapeRole(edge, 'act-control-flow');
    });

    outFracs.forEach((frac) => {
      const sx = geo.x + geo.width * frac;
      const style: CellStateStyle = { ...baseStyle, exitX: frac, exitY: bottomFrac, exitPerimeter: false };
      const edge = graph.insertEdge(null, null, '', bar, null, style);
      const geometry = new Geometry(0, 0, 0, 0);
      geometry.setTerminalPoint(new Point(sx, geo.y + geo.height + FORK_JOIN_STUB_LENGTH), false);
      graph.getDataModel().setGeometry(edge, geometry);
      tagShapeRole(edge, 'act-control-flow');
    });
  });
}

// insertForkJoinStubs above pins the attached end to a fraction of the
// bar's width, so it already tracks a resize — but the *dangling* end was
// set to a fixed absolute point at creation time, which nothing kept in
// sync. Left alone, lengthening or moving the bar slides the attached end
// along with it while the dangling end stays exactly where it started,
// turning what should be a straight up/down stub into an increasingly
// diagonal line. Re-run after any move or resize of a Fork/Join bar (see
// the MOVE_CELLS/CELLS_RESIZED listeners in initGraph) to re-anchor each
// still-dangling stub directly above/below its current attach point again.
// Only touches a stub whose far end is *still* dangling — one the user has
// already dragged onto a real shape is a real connection now, governed by
// its own entry/exit fraction on that shape, not this bar's geometry.
function realignForkJoinStubs(graph: Graph, bar: any) {
  const geo = bar.getGeometry();
  if (!geo) return;
  const edges = bar.getEdges(true, true, false) ?? [];
  if (!edges.length) return;

  const barThickness = Math.min(geo.height, 10);
  const barTop = geo.y + (geo.height - barThickness) / 2;
  const barBottom = barTop + barThickness;

  graph.batchUpdate(() => {
    edges.forEach((edge: any) => {
      const style = edge.getStyle();
      if (typeof style !== 'object' || style === null) return;

      if (edge.getTerminal(true) === bar) {
        if (edge.getTerminal(false)) return; // far end already attached to something real
        const frac = (style as Record<string, unknown>).exitX;
        if (typeof frac !== 'number') return;
        const geometry = new Geometry(0, 0, 0, 0);
        geometry.setTerminalPoint(new Point(geo.x + geo.width * frac, barBottom + FORK_JOIN_STUB_LENGTH), false);
        graph.getDataModel().setGeometry(edge, geometry);
      } else if (edge.getTerminal(false) === bar) {
        if (edge.getTerminal(true)) return;
        const frac = (style as Record<string, unknown>).entryX;
        if (typeof frac !== 'number') return;
        const geometry = new Geometry(0, 0, 0, 0);
        geometry.setTerminalPoint(new Point(geo.x + geo.width * frac, barTop - FORK_JOIN_STUB_LENGTH), true);
        graph.getDataModel().setGeometry(edge, geometry);
      }
    });
  });
}

// Same fit-then-center math as FitPlugin.fitCenter() (maxGraph core), except
// the scale and the centering point are both computed against the strip of
// the container that's actually visible — container.clientWidth minus
// `leftObstruction` — instead of the full container. fitCenter() has no way
// to know the icon rail + ShapesPanel are floating on top of the canvas
// (they're `position: absolute`, not a flex sibling that shrinks
// container.clientWidth), so it centers the diagram in the full width, which
// can land it partly or fully underneath the panel. Left-only because that's
// the one persistent obstruction on a fresh open — the properties panel
// (right side) only renders once something is selected, which nothing is
// yet at this point.
// Returns false when the container/bounds weren't actually measurable yet
// (e.g. a hard page refresh has far more competing work in that first
// frame — maxGraph booting, stylesheet registration, etc. — than a normal
// in-app navigation does, so one requestAnimationFrame isn't always enough
// there even though it is for a warm open) — the caller retries on a later
// frame instead of silently applying a scale/translate computed from a
// zero-sized container, which would leave the diagram scaled to ~0 or
// translated off-screen instead of merely "not centered."
// margin default bumped from fitCenter()'s own 2px to 24px — at typical fit
// scale that's invisible, but for a small diagram in a large container (the
// common case right after creating one) fitCenter can zoom in aggressively
// enough that a 2px margin leaves almost no slack against leftObstruction,
// visibly clipping content flush against the panel's edge (confirmed via a
// direct repro: a 2-shape diagram fit to ~300%, only ~4px of margin left —
// enough for a shape's edge/label to land right at, or a hair behind, the
// panel boundary).
function fitCenterAvoidingLeftPanel(graph: Graph, leftObstruction: number, margin = 40): boolean {
  try {
    // maxGraph registers every other built-in plugin's pluginId as its exact
    // class name ('CellEditorHandler', 'PanningHandler', etc.) — FitPlugin is
    // the one exception, registered as the short string 'fit' instead of
    // 'FitPlugin' (confirmed directly in @maxgraph/core's own source). Lookups
    // using the class-name string here always silently returned null, so this
    // whole function's "smart" branch never actually ran — it fell straight
    // through to the plain fitCenter() no-op path below on every call.
    const fitPlugin = graph.getPlugin('fit') as FitPlugin | null;
    const container = graph.container;
    if (!container || container.clientWidth <= 0 || container.clientHeight <= 0) return false;
    // No plugin, nothing to size the max scale from — retry rather than
    // guess (a missing plugin one frame after mount can still resolve).
    if (!fitPlugin) return false;

    // leftObstruction === 0 (panel closed, or view-only with no rail) isn't
    // special-cased to plain fitCenter() — that library call has no scale
    // cap of its own (see the comment below), and the math here already
    // degrades to an ordinary full-width center when there's nothing to
    // avoid, so there's no need for two code paths.
    const view = graph.getView();
    const visibleWidth = container.clientWidth - leftObstruction - 2 * margin;
    const clientHeight = container.clientHeight - 2 * margin;
    const bounds = graph.getGraphBounds();
    if (!(bounds.width > 0 && bounds.height > 0)) return false;

    const originalScale = view.scale;
    const width = bounds.width / originalScale;
    const height = bounds.height / originalScale;

    // Capped at 1 (100%) on top of fitPlugin.maxFitScale (which defaults to
    // 8, i.e. 800% — sized for shrinking an oversized diagram down to fit,
    // not for a small one). Without the cap, a diagram with little content
    // relative to the container — the common case right after adding just a
    // shape or two — reads "fit the available space" literally and zooms
    // in aggressively (confirmed live: a single shape opened at 800%).
    // Real draw.io's own "Fit Page" only ever shrinks an oversized page,
    // never inflates a small one past its actual size.
    let newScale = Math.min(1, fitPlugin.maxFitScale ?? Infinity, visibleWidth / width, clientHeight / height);
    if (!Number.isFinite(newScale) || newScale <= 0) newScale = originalScale;

    // Same shape as fitCenter()'s own translateX/Y, but the horizontal margin
    // is split around the VISIBLE strip (leftObstruction..containerWidth), not
    // the full container — the diagram lands centered between the panel's
    // right edge and the container's right edge, not centered as if the panel
    // weren't there.
    const translateX = Math.floor(
      view.translate.x +
        (leftObstruction + (container.clientWidth - leftObstruction - width * newScale) / 2) / newScale -
        (bounds.x ?? 0) / originalScale
    );
    const translateY = Math.floor(
      view.translate.y + (container.clientHeight - height * newScale) / (2 * newScale) - (bounds.y ?? 0) / originalScale
    );

    newScale = Number(newScale.toFixed(2));
    view.scaleAndTranslate(newScale, translateX, translateY);
    return true;
  } catch (e) {
    // Never let a centering bug leave the diagram invisible — falling back
    // to the model import already done above (whatever position/scale it
    // happened to land at) is strictly better than throwing here and
    // aborting mid-load.
    console.warn('fitCenterAvoidingLeftPanel threw, leaving default view:', e);
    return true; // don't retry — a genuine error won't resolve itself on a later frame
  }
}

// ════════════════════════════════════════════════════════════════════════════
// ⭐ MAIN WEBCANVAS COMPONENT
// ════════════════════════════════════════════════════════════════════════════

const WebCanvas = forwardRef<DiagramCanvasHandle, DiagramCanvasProps>(({ onReady, onChange, onSelectionChange, onZoomChange, umlType = 'flowchart', isMobile = false, leftObstruction = 0 }, ref) => {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const gridCanvasRef = useRef<HTMLCanvasElement>(null);
  const graphDivRef = useRef<HTMLDivElement>(null);
  const graphRef = useRef<Graph | null>(null);
  // One CellHighlight per remote collaborator currently shown (userId ->
  // instance) — see setRemoteSelection/clearAllRemoteSelections below.
  const remoteHighlightsRef = useRef<Map<string, InstanceType<typeof CellHighlight>>>(new Map());
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

  // Shared by the loadXml and applyPatches imperative-handle methods below —
  // applyPatches's 'full' patch (the escape hatch for an edit type
  // changesToPatches doesn't recognize) needs to fall back to exactly this
  // same path, not a re-implementation of it.
  const loadXmlImpl = (xml: string, options?: { resetView?: boolean }) => {
      const graph = graphRef.current;
      if (!graph || !xml) return;
      const resetView = options?.resetView ?? true;
      try {
        // Captured by id (a plain string), not by keeping the Cell objects
        // themselves — those are about to become stale, see below. Only
        // worth doing for a live remote update (resetView: false); a fresh
        // load/page-switch has no prior selection worth restoring.
        const selectedIdsBeforeImport = !resetView
          ? graph.getSelectionCells().map((cell: any) => cell.getId())
          : null;

        new ModelXmlSerializer(graph.getDataModel()).import(xml);
        // Always cleared first, including on a live collaborative update —
        // this isn't just cosmetic. import() above builds an entirely new
        // Cell tree (ModelCodec.decodeRoot) and swaps it in via
        // model.setRoot(), so a selection left pointing at a cell from the
        // *old* tree would be a dangling reference: GraphSelectionModel
        // just holds raw Cell objects compared by identity, with no
        // listener that revalidates them against a replaced model.
        graph.clearSelection();

        // Re-select by id looked up in the *new* model, not by reusing the
        // pre-import Cell references (same staleness problem as above). A
        // shape the remote edit deleted just won't resolve to a cell here
        // and stays deselected, which is the correct outcome for it.
        if (selectedIdsBeforeImport && selectedIdsBeforeImport.length > 0) {
          const model = graph.getDataModel();
          const restored = selectedIdsBeforeImport
            .map((id: string) => model.getCell(id))
            .filter((cell: Cell | null): cell is Cell => cell != null);
          if (restored.length > 0) graph.setSelectionCells(restored);
        }

        if (!resetView) return;

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
        //
        // One frame covers a normal in-app navigation, but not always a hard
        // page refresh — that path has far more competing first-frame work
        // (the whole app booting, maxGraph initializing, stylesheets
        // registering) than a warm open does, so the container/graph bounds
        // can still be unmeasurable a frame later. attemptCenter retries a
        // few more frames before giving up, rather than either applying a
        // center computed from a zero-sized box (scaling the diagram to
        // ~nothing / translating it off-screen) or never centering at all —
        // both of which read as "the diagram disappeared."
        let centeringAttemptsLeft = 5;
        const attemptCenter = () => {
          if (graphRef.current !== graph) return; // torn down/replaced before this fired
          if (isMobile) {
            // A diagram authored on desktop can have been left zoomed/panned
            // anywhere — FitPlugin's zoom-to-fit would then open it at
            // whatever arbitrary scale makes it fit, varying by diagram size.
            // Mobile should instead always open the same way a blank canvas
            // does: 100% zoom, diagram centered in the viewport.
            graph.getView().setScale(1);
            graph.center(true, true);
            return;
          }
          // fit() (used pre-existing elsewhere) only aligns the diagram's
          // top-left near the container's border — it was never centering
          // horizontally/vertically, so a diagram authored on mobile (or
          // panned off to a corner) opened on desktop looking off-center.
          // fitCenterAvoidingLeftPanel does the same fit-to-container
          // scaling as fitCenter(), but centered against the strip that's
          // actually visible past the ShapesPanel (see its own comment) —
          // plain fitCenter() would center against the full container and
          // could land the diagram partly hidden underneath that panel.
          const centered = fitCenterAvoidingLeftPanel(graph, leftObstruction);
          if (!centered) {
            if (centeringAttemptsLeft > 0) {
              centeringAttemptsLeft -= 1;
              requestAnimationFrame(attemptCenter);
            } else {
              console.warn('fitCenterAvoidingLeftPanel: gave up after retries, diagram left at import-time position/scale');
            }
          }
        };
        requestAnimationFrame(attemptCenter);
      } catch (e) {
        console.error('Failed to load diagram XML:', e);
      }
  };

  useImperativeHandle(ref, () => ({
    loadXml: (xml: string, options?: { resetView?: boolean }) => loadXmlImpl(xml, options),
    applyPatches: (patches: DiagramPatch[]) => {
      const graph = graphRef.current;
      if (!graph) return null;
      try {
        const fullPatch = patches.find((p) => p.type === 'full') as { type: 'full'; xml: string } | undefined;
        if (fullPatch) {
          // Escape hatch: delegate to exactly the same path a normal
          // remote update already uses. 'full' always arrives alone (see
          // changesToPatches), so the rest of `patches` is ignored.
          loadXmlImpl(fullPatch.xml, { resetView: false });
          const xml = new ModelXmlSerializer(graph.getDataModel()).export();
          return { xml, driftDetected: false };
        }

        const { driftDetected } = applyPatchesToModel(graph, patches);
        const xml = new ModelXmlSerializer(graph.getDataModel()).export();
        return { xml, driftDetected };
      } catch (e) {
        console.error('Failed to apply diagram patches:', e);
        return null;
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
    setRemoteSelection: (userId: string, cellId: string | null, color: string) => {
      const graph = graphRef.current;
      if (!graph) return;
      const highlights = remoteHighlightsRef.current;
      let highlight = highlights.get(userId);

      if (!cellId) {
        highlight?.hide();
        return;
      }

      const cell = graph.getDataModel().getCell(cellId);
      const state = cell ? graph.getView().getState(cell) : null;
      if (!state) {
        // Cell not found (deleted, or not yet loaded on this client) — hide
        // rather than leave a stale highlight from wherever it last was.
        highlight?.hide();
        return;
      }

      if (!highlight) {
        highlight = new CellHighlight(graph, color, 3);
        highlights.set(userId, highlight);
      } else {
        highlight.setHighlightColor(color);
      }
      highlight.highlight(state);
    },
    clearAllRemoteSelections: () => {
      remoteHighlightsRef.current.forEach((highlight) => {
        highlight.hide();
        highlight.destroy();
      });
      remoteHighlightsRef.current.clear();
    },
    // resizeGridCanvas/repaintGrid stay out of this array on purpose: they're
    // declared further down this component and would be a TDZ ReferenceError
    // if referenced directly here (this array is evaluated eagerly, unlike
    // the factory body above, which only runs later via closure once they
    // exist).
    //
    // isMobile IS included, though — loadXml (exposed above) branches on it
    // to decide how to re-center a freshly-loaded diagram (mobile: forced
    // 100% + center; desktop: fitCenterAvoidingLeftPanel — see loadXmlImpl).
    // With an empty array this factory only ever runs once, at mount, so the
    // exposed loadXml stayed permanently bound to whatever isMobile happened
    // to read on that very first render — the same class of race documented
    // in create.tsx's hydrate effect ("useWindowDimensions() settling on a
    // different width right after the very first mount, flipping
    // isDesktop"). A diagram opened right as that settles could get
    // re-centered using the wrong branch and never correct itself for the
    // rest of the session, which is what made a diagram authored on one
    // device look off-center when opened on the other.
    //
    // leftObstruction is included for the same reason: it feeds directly
    // into that desktop branch's centering math (see
    // fitCenterAvoidingLeftPanel), so a stale value here would silently
    // center against a panel width that's no longer accurate.
  }), [isMobile, leftObstruction]);

  const resizeGridCanvas = useCallback(() => {
    const wrapper = wrapperRef.current;
    const gc = gridCanvasRef.current;
    if (!wrapper || !gc) return;
    // Backing store sized in device pixels, not CSS pixels — the element
    // itself stays CSS-sized via its width:100%/height:100% style. Without
    // the devicePixelRatio factor, this canvas' bitmap is only ever 1
    // pixel per CSS pixel, and the browser has to upscale it to cover a
    // typical mobile screen's 2x/3x physical pixels, blurring the thin
    // grid lines. paintGridOnCanvas compensates with a matching ctx scale.
    const dpr = window.devicePixelRatio || 1;
    gc.width = Math.round(wrapper.offsetWidth * dpr);
    gc.height = Math.round(wrapper.offsetHeight * dpr);
  }, []);

  const repaintGrid = useCallback(() => {
    const gc = gridCanvasRef.current;
    const graph = graphRef.current;
    if (!gc || !graph) return;
    paintGridOnCanvas(gc, graph.getView().getScale(), graph.getView().getTranslate());
  }, []);

  // undefined (not null) so the very first call — an empty selection on
  // mount — still counts as "changed" and gets reported once.
  const lastReportedSelectedCellRef = useRef<any>(undefined);
  const lastReportedAtRef = useRef(0);
  const handleSelectionChange = useCallback(() => {
    const graph = graphRef.current;
    if (!graph) return;

    try {
      const selection = graph.getSelectionCells();
      const selectedCell = selection.length === 1 ? selection[0] : null;
      setSelectedCell(selectedCell);

      // A single click on a cell reliably produces two calls into this
      // function: the immediate one from graph.getSelectionModel()'s own
      // CHANGE event, and a second one carrying the identical cell roughly
      // 200ms later (measured directly — 204ms and 219ms across two
      // separate clicks). onSelectionChange callers (e.g. create.tsx's
      // tap-to-connect "tap the source again to undo" logic) treat "the
      // same cell reported twice" as a deliberate second tap, so without
      // deduping, a single click picks a shape and immediately un-picks it
      // again before the user's next real tap ever lands.
      //
      // Gated on a time window, not a permanent "same cell" block — a
      // genuine second click on an already-selected cell (the real "tap
      // again to undo" gesture) reports that same cell too, just separated
      // by however long the user actually took, not milliseconds. 300ms
      // comfortably clears the measured ~200-220ms redundant-refire gap
      // while still being far shorter than any realistic deliberate second
      // click.
      const now = Date.now();
      const isRedundantRefire = selectedCell === lastReportedSelectedCellRef.current && now - lastReportedAtRef.current < 300;
      lastReportedSelectedCellRef.current = selectedCell;
      lastReportedAtRef.current = now;
      if (isRedundantRefire) return;

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
      'igraph.umlFork': {
        ...base,
        shape: 'igraph.umlFork',
        fillColor: BLACK,
        strokeColor: BLACK,
        strokeWidth: 2,
      },
      'igraph.umlJoin': {
        ...base,
        shape: 'igraph.umlJoin',
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
      'igraph.umlRealization': { ...base, shape: 'igraph.umlRealization' },
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
          // Which side of the spine this shape sits on (top/bottom) and
          // which way its line slants ("\" vs "/") are two different
          // things — Top is always above the spine no matter which way it
          // slants, matching the reference layout where every top-row
          // category box sits above with its line angling down-and-right
          // to reach the spine, and every bottom-row box sits below
          // angling up-and-right. The outer/label end is always on the
          // *left* (matching that same reference — a box's line runs
          // down-or-up *and rightward* to reach the spine, not leftward),
          // with vertical side alone deciding whether that makes it "\"
          // (Top: outer above-left, spine below-right) or "/" (Bottom:
          // outer below-left, spine above-right) — see the matching
          // comment on FishboneCauseTopShapeCanvas in
          // maxgraph-custom-shapes.ts.
          const centerX = cx + dropW / 2;
          const centerY = cy + dropH / 2;
          const outerIsAbove = shapeId === 'fishbone-cause-top';
          const outerDy = outerIsAbove ? -dropH : dropH;
          // The point that actually needs to be near the spine is this
          // shape's spine-side corner — where the diagonal's tip visually
          // touches it — not the drop's raw center. Those two points are
          // sqrt((dropW/2)² + (dropH/2)²) apart (~64px at this shape's
          // default size), well outside CONNECTOR_SNAP_DISTANCE (40px).
          // Searching from centerX/centerY meant a user who drags until
          // the diagonal visually touches the spine was always placing
          // the *search* origin outside the snap radius, so the search
          // came up empty every time — landing in the "nothing found"
          // branch below, whose fallback math happens to place this exact
          // same corner right where the user was aiming, so it *looked*
          // attached (sourceCell stayed null the whole time).
          const spineSideX = centerX + dropW / 2;
          const spineSideY = centerY - outerDy / 2;
          const spine = findEdgeNearPoint(graph, spineSideX, spineSideY, CONNECTOR_SNAP_DISTANCE, new Set(['fishbone-spine']));
          if (spine) {
            // The spine is a *line*, not a point-like vertex — once
            // sourceCell is a real cell, maxGraph's floating-perimeter
            // calculation recomputes the actual attachment point on every
            // render from the ray toward the *other* end (the outer/label
            // point below), completely ignoring whatever startPoint says
            // here. Anchoring the outer point dropW/dropH away from an
            // *assumed* attachment point that the render then moves
            // elsewhere is what produced two causes each ending up nearly
            // vertical, barely offset sideways at all, instead of the
            // intended diagonal — the render kept dragging the spine-side
            // point back under wherever the outer point actually was.
            // Fixed here instead: exitX pins the spine attachment to a
            // specific point along its own current rendered length (using
            // the drop position), bypassing that recalculation entirely,
            // so the outer point's offset from it is the one actually
            // rendered.
            sourceCell = spine;
            targetCell = null;
            const spineState = graph.getView().getState(spine);
            const spineX = spineState
              ? Math.max(spineState.x, Math.min(spineState.x + spineState.width, spineSideX))
              : spineSideX;
            const spineY = spineState ? spineState.y + spineState.height / 2 : spineSideY;
            const exitX = spineState && spineState.width > 0 ? (spineX - spineState.x) / spineState.width : 0.5;
            styleObject.exitX = exitX;
            styleObject.exitY = 0.5;
            styleObject.exitPerimeter = false;
            startPoint = { x: spineX, y: spineY };
            endPoint = { x: spineX - dropW, y: spineY + outerDy };
          } else {
            sourceCell = null;
            targetCell = null;
            startPoint = { x: spineSideX, y: spineSideY };
            endPoint = { x: centerX - dropW / 2, y: centerY + outerDy / 2 };
          }
        } else if (SEQUENCE_MESSAGE_SHAPE_IDS.has(shapeId)) {
          const dropY = cy + dropH / 2;
          // cx/cy are the grid-snapped "intended top-left" this shape
          // actually lands at (see cx/cy above) — cx + dropW/2 is the
          // matching intended center every other connector-drop branch in
          // this function searches from (FISHBONE_MAIN_CAUSE_IDS's
          // centerX, the generic branch's centerX below). This used to
          // search from the raw, un-snapped cursor position instead, which
          // in the ordinary case is close enough not to matter, but for a
          // search this position-sensitive (see the tolerance comment in
          // findSequenceMessageEndpoints) it should agree with where the
          // shape is actually going to render, not wherever the pointer
          // happened to be mid-gesture.
          const dropX = cx + dropW / 2;
          const found = findSequenceMessageEndpoints(graph, dropX, dropY);
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

        // insertEdge below wires sourceCell/targetCell in as real terminals
        // directly — unlike an interactive drag-to-connect, that never
        // fires CELL_CONNECTED, so the CELL_CONNECTED catch-all fix further
        // down (initGraph) never runs for it and this end is left in
        // maxGraph's floating mode. Fine against a vertex (floating still
        // tracks it closely enough), but landing on another connector
        // (sourceCell/targetCell came from findConnectorDropEndpoints'
        // findEdgeNearPoint fallback — this is exactly how a connector
        // dropped onto/near another connector attaches) floats to that
        // target's exact midpoint on every redraw no matter where it was
        // actually dropped, and can never be dragged anywhere else
        // afterward either — see pinnedEdgeEndStyle's own comment. Skips
        // whichever end the fishbone-head special case just above already
        // pinned deliberately.
        if (sourceCell && styleObject.exitX === undefined) {
          Object.assign(styleObject, pinnedEdgeEndStyle(sourceCell, startPoint, true));
        }
        if (targetCell && styleObject.entryX === undefined) {
          Object.assign(styleObject, pinnedEdgeEndStyle(targetCell, endPoint, false));
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
        // the connection. A manually-dropped Schematic Wire Connection dot
        // needs the exact same treatment (a real junction, not a decal —
        // see splitSchematicWireAtJunction/attemptSchematicAutoJunction,
        // which auto-place the same dot for an interactively-drawn
        // T-junction) — 'schematic-no-connection' is deliberately excluded,
        // it means "these do not connect" and stays a purely visual marker.
        const isSchematicJunctionDrop = shapeId === 'schematic-connection';
        const edgeCell = (shapeId === 'erd-relationship' || shapeId === 'erd-identifying-rel' || isSchematicJunctionDrop)
          ? findEdgeNearPoint(graph, x, y, CONNECTOR_SNAP_DISTANCE)
          : null;

        if (isSchematicJunctionDrop && edgeCell && typeof edgeCell.isEdge === 'function' && edgeCell.isEdge()) {
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
            splitSchematicWireAtJunction(graph, edgeCell, cell);
          });
        } else if (edgeCell && typeof edgeCell.isEdge === 'function' && edgeCell.isEdge()) {
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
        } else if (shapeId === 'act-swimlane') {
          const neighbor = findNearestSwimlaneNeighbor(graph, x, y, CONNECTOR_SNAP_DISTANCE);
          if (neighbor) {
            cell = insertSwimlaneLane(graph, neighbor.lane, neighbor.side);
            const newGeo = cell.getGeometry();
            if (newGeo) { finalX = newGeo.x; finalY = newGeo.y; }
          } else {
            cell = graph.insertVertex(null, null, label, cx, cy, dropW, dropH, fullStyle);
          }
        } else {
          cell = graph.insertVertex(null, null, label, cx, cy, dropW, dropH, fullStyle);
        }
      }
      tagShapeRole(cell, shapeId);

      if ((shapeId === 'act-fork' || shapeId === 'act-join') && cell) {
        insertForkJoinStubs(graph, cell, shapeId);
      }

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
              // A freshly-dropped Schematic part landing on a dangling
              // wire's end should snap to its nearest real lead, same as
              // an interactively-drawn connection does (see
              // applySchematicPinSnap and the CELL_CONNECTED listener
              // above) — otherwise this magnet-attach would leave it on
              // the default floating/perimeter connection, anywhere on
              // the part's body.
              applySchematicPinSnap(graph, edge, cell, true);
              continue;
            }
          }
          if (!edge.target) {
            const p = geo?.getTerminalPoint(false);
            if (p && Math.hypot(p.x - anchorX, p.y - anchorY) <= CONNECTOR_SNAP_DISTANCE) {
              graph.getDataModel().setTerminal(edge, cell, false);
              applySchematicPinSnap(graph, edge, cell, false);
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

    // A Swimlane lane extends its group instead of spawning an independent
    // box + connector (see insertSwimlaneLane above) — scoped to left/right
    // only, since lanes only ever grow sideways; clicking up/down on a lane
    // falls through to the ordinary "add adjacent shape" behavior below
    // (e.g. dropping an Activity node below it, genuinely connected by an
    // edge).
    if (dir.dx !== 0 && (shapeId === 'act-swimlane' || (!shapeId && getShapeRole(sourceCell) === 'act-swimlane'))) {
      const newLane = insertSwimlaneLane(graph, sourceCell, dir.dx > 0 ? 'right' : 'left');
      graph.clearSelection();
      setTimeout(() => {
        graph.setSelectionCell(newLane);
        handleSelectionChange();
      }, 10);
      return;
    }

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

    // A Fork/Join bar gets its own standard set of real, draggable stub
    // arrows (see insertForkJoinStubs) instead of the generic single
    // connector below — matching handleDrop's drag-and-drop path, so a
    // fresh bar looks and behaves identically no matter which way it was
    // created, and already satisfies its own "needs 2+ outgoing"/"needs 2+
    // incoming" validation on arrival instead of nagging until the user
    // manually draws the same arrows by hand.
    if (shapeId === 'act-fork' || shapeId === 'act-join') {
      insertForkJoinStubs(graph, newCell, shapeId);
      graph.clearSelection();
      setTimeout(() => {
        graph.setSelectionCell(newCell);
        handleSelectionChange();
      }, 10);
      return;
    }

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

            // A Swimlane's left/right arrow has exactly one meaning — add
            // another lane — so unlike every other shape, there's nothing
            // to pick from a grid for. Goes straight to insertSwimlaneLane
            // instead of opening the generic shape picker below.
            if ((dir.label === 'left' || dir.label === 'right') && getShapeRole(cell) === 'act-swimlane') {
              const newLane = insertSwimlaneLane(graph, cell, dir.label === 'right' ? 'right' : 'left');
              removeArrowButtons();
              graph.clearSelection();
              setTimeout(() => {
                graph.setSelectionCell(newLane);
                handleSelectionChange();
              }, 10);
              return;
            }

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
          graph.removeCells([cell], false);
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

      // Mobile browsers collapse/reveal their address bar as the page
      // scrolls — a routine, near-constant event that shrinks/grows the
      // *visible viewport* by a few dozen pixels, with the container's
      // actual layout width completely untouched. Height-only, that's
      // indistinguishable from a resize this observer genuinely needs to
      // react to (e.g. the on-screen keyboard opening, handled separately
      // below) unless something also looks at *how much* it changed and
      // whether width moved too. Tracked here so the observer below can
      // tell "address bar toggled" (width same, height jitters by roughly
      // its own height) apart from a real resize/rotation (width changes,
      // or a much bigger height jump).
      let lastWrapperWidth = wrapper.offsetWidth;
      let lastWrapperHeight = wrapper.offsetHeight;
      const ADDRESS_BAR_HEIGHT_THRESHOLD = 120;

      // Belt-and-suspenders on top of the height-delta heuristic above:
      // rather than guessing whether a given resize is small enough to be
      // "just the address bar", defer reacting to ANY resize at all for as
      // long as a pan gesture is actively in progress — re-measuring the
      // graph mid-gesture is what visibly disrupts the user, regardless of
      // how big the resize turns out to be. Set by the PanningHandler PAN_
      // START/PAN_END listeners further down (after panningHandler exists);
      // sizeDidChange() still runs once the gesture ends if a resize came
      // in during it, so nothing is permanently lost, only postponed to a
      // moment that won't visibly yank the canvas out from under a drag.
      let isPanningActive = false;
      let pendingResizeAfterPan = false;

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

        const w = wrapper.offsetWidth;
        const h = wrapper.offsetHeight;
        const widthChanged = w !== lastWrapperWidth;
        const heightDelta = Math.abs(h - lastWrapperHeight);
        lastWrapperWidth = w;
        lastWrapperHeight = h;

        // Actively panning — hold off entirely and let the PAN_END
        // listener below apply this once the gesture finishes.
        if (isPanningActive) {
          pendingResizeAfterPan = true;
          return;
        }

        // Re-measuring the graph against the container's new bounds shifts
        // how much of the canvas is actually visible — on a phone, doing
        // that on nearly every scroll (address bar toggling) read as the
        // diagram itself jumping around. Skip it for a height-only blip
        // roughly the size of a mobile browser chrome bar; a real resize
        // still gets through (width changed, or the jump is too big to be
        // just the address bar).
        if (!widthChanged && heightDelta > 0 && heightDelta <= ADDRESS_BAR_HEIGHT_THRESHOLD) {
          return;
        }

        if (w > 0 && h > 0) {
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

      // Swaps in AxisLockedPanningHandler for the default PanningHandler —
      // everything else about the graph's default plugin set (selection,
      // connection, tooltips, fit, etc.) stays exactly as maxGraph ships it.
      const plugins = getDefaultPlugins().map((p) => (p === PanningHandler ? AxisLockedPanningHandler : p));
      const graph = new Graph(graphDiv, undefined, plugins);
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

        // The actual root cause of the "reposition a connector attached to
        // another connector and it locks" bug: ConnectionHandler (draws a
        // BRAND NEW edge by dragging from any connectable cell's body) and
        // the dedicated body-drag system above (bodyDragEdge, for
        // repositioning an EXISTING selected edge) both want the exact same
        // gesture — mousedown on an edge's body — and ConnectionHandler
        // reaches it first (it's consulted by its own marker's mouseMove/
        // getCell on every hover, which is what actually decides isStartEvent
        // below; confirmed live by tracing every InternalMouseEvent.consume()
        // call during a real drag — it was ConnectionHandler.mouseDown/
        // mouseMove consuming the event on every tick, not EdgeHandler or
        // this file's own bodyDragEdge listener, which never even saw an
        // unconsumed event). setConnectableEdges(true) (below) is what makes
        // an edge a valid ConnectionHandler source at all — needed for
        // genuinely drawing a new connector onto/from another connector
        // elsewhere in this app, but as an unwanted side effect it means
        // clicking the BODY of an already-selected dedicated-slide edge (an
        // auto-pinned connector, a Sequence message, Fishbone Main Cause, or
        // Fork/Join stub) started a brand-new floating edge-in-progress
        // instead — the dashed line that DID visibly follow the cursor (so
        // it looked like the drag was "working"), while the ORIGINAL
        // connector was untouched underneath the entire time, only to be
        // left with a dangling end once that in-progress edge — created via
        // EdgeState/createEdgeState off the ORIGINAL edge's terminals or
        // waypoints — got abandoned/finalized wrong on mouseup with no valid
        // target under the cursor. isValidSource false for exactly these
        // cells stops ConnectionHandler's marker (see its getCell override)
        // from ever treating them as a legitimate "start a new connection
        // here" source, so isStartEvent never fires and the event is never
        // consumed — letting it fall through to the dedicated bodyDragEdge
        // listener (or EdgeHandler's own endpoint drag, unaffected by this)
        // exactly as intended. Every other connectable cell — vertices,
        // and any edge that ISN'T one of these dedicated-slide cases — is
        // completely unaffected, so drawing a genuine new connector by
        // dragging from a shape or an ordinary connector still works as
        // before.
        const defaultIsValidSource = connectionHandler.isValidSource.bind(connectionHandler);
        connectionHandler.isValidSource = (cell: any, me: any) => {
          if (cell && typeof cell.isEdge === 'function' && cell.isEdge() && hasDedicatedEdgeSlide(cell)) {
            return false;
          }
          return defaultIsValidSource(cell, me);
        };
      }

      // draw.io/mxGraph's own getConnectionPoint (ConnectionsMixin) computes
      // a fixed exitX/entryX point as a fraction of the target's BOUNDING
      // BOX — correct for a vertex, but never actually reused for connector
      // endpoints in draw.io, because it leaves connectableEdges false
      // permanently and never needs one. This app enables it (Fishbone's
      // spine, ERD cardinality splits, schematic auto-junctions, and any
      // plain connector genuinely need one connector to attach to another),
      // so it inherited a problem draw.io's own codebase never has to solve
      // — and using the vertex-shaped bounding-box formula for it is why a
      // pin on anything but a perfectly horizontal/vertical target line
      // could drift off the line entirely. Overriding here, scoped to
      // exactly the case draw.io itself never hits (terminal is an EDGE),
      // reinterprets exitX/entryX as a fraction of the target's actual
      // PATH LENGTH instead — pointAtPathFraction/closestFractionOnPath
      // mirror the identical technique mxGraphView.js's getPoint/
      // getRelativePoint already use there, just for edge LABEL placement,
      // never for a connector's own endpoint. A vertex terminal falls
      // straight through to the default, completely unaffected.
      const defaultGetConnectionPoint = graph.getConnectionPoint.bind(graph);
      graph.getConnectionPoint = (vertexState: any, constraint: any, round = true) => {
        const terminalCell = vertexState?.cell;
        if (
          terminalCell &&
          typeof terminalCell.isEdge === 'function' &&
          terminalCell.isEdge() &&
          constraint?.point &&
          Array.isArray(vertexState.absolutePoints) &&
          vertexState.absolutePoints.length >= 2
        ) {
          const pt = pointAtPathFraction(
            vertexState.absolutePoints.filter((p: any) => p != null) as { x: number; y: number }[],
            constraint.point.x,
          );
          if (pt) return new Point(round ? Math.round(pt.x) : pt.x, round ? Math.round(pt.y) : pt.y);
        }
        return defaultGetConnectionPoint(vertexState, constraint, round);
      };

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
        /* Draw.io-style "snapped in" feedback (see showConnectSnapPulse
           below): a brief expanding ring at whichever point a connector's
           end just attached to — a shape's edge or another connector's
           line alike, since the CELL_CONNECTED catch-all that triggers
           this already treats both the same way. Pure animation-only
           overlay in the view's overlay pane; never touches the actual
           connector geometry, so it can't desync from the WYSIWYG pinning
           logic that computes where the ring is drawn. */
        @keyframes igraph-snap-pulse {
          0% { r: 3; stroke-opacity: 0.9; }
          100% { r: 16; stroke-opacity: 0; }
        }
        .igraph-snap-pulse-ring {
          pointer-events: none;
          fill: none;
          stroke: ${BLUE};
          stroke-width: 2px;
          animation: igraph-snap-pulse 260ms ease-out forwards;
        }
      `;
      document.head.appendChild(styleElement);
      console.log('🔵 Force blue CSS injected with black edges');

      // A connector's end landing on a valid target — a shape or another
      // connector, see the unified CELL_CONNECTED handler further down —
      // used to give no feedback at all beyond the line itself jumping to
      // its final pinned position, unlike draw.io's small "connected" pulse
      // at the drop point. cx/cy are already view-space (the same
      // previewPoint/dropPoint coordinates the pinning fix itself computes
      // from), matching the overlay pane's own coordinate space directly —
      // no separate scale/translate conversion needed. Self-removing
      // (animationend, with a setTimeout fallback in case the animation
      // never fires — e.g. a tab switched away mid-pulse) so nothing here
      // can leak nodes into the overlay pane over a long session.
      const showConnectSnapPulse = (cx: number, cy: number) => {
        const overlayPane = graph.getView().getOverlayPane();
        if (!overlayPane) return;
        const ring = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        ring.setAttribute('cx', String(cx));
        ring.setAttribute('cy', String(cy));
        ring.setAttribute('r', '3');
        ring.setAttribute('class', 'igraph-snap-pulse-ring');
        overlayPane.appendChild(ring);
        const remove = () => ring.parentNode?.removeChild(ring);
        ring.addEventListener('animationend', remove, { once: true });
        setTimeout(remove, 400);
      };

      graph.createVertexHandler = (state: CellState) => {
        return new UniversalVertexHandler(state);
      };
      console.log('✅ Universal Vertex Handler bound to graph');

      // EdgeHandler's own endpoint/bend handles hit-test touch input via a
      // dedicated `tolerance` field (getHandleForEvent) that's completely
      // separate from graph.setEventTolerance below and defaults to 0 — for
      // a genuine mouse it's irrelevant (mouse hit-testing there is hardcoded
      // to 1px, unaffected by this field), but for touch/pen input a 0px
      // radius means a finger has to land exactly on the small handle dot to
      // grab it at all. Missing by even a couple of pixels means the touch
      // isn't recognized as "grabbing the connector's endpoint" — it falls
      // through to the graph background instead, which on mobile starts a
      // full-canvas pan (panningHandler.useLeftButtonForPanning is on for
      // mobile below), reading as "the whole diagram jumps/moves" when the
      // user only meant to drag the connector's end. Widening it gives a
      // real, finger-sized grab radius around every connector handle.
      // Tracks the pointer's last known position in the same view-space
      // coordinates as CellState bounds (absolutePoints, state.x/y/width/
      // height) — a fallback for the CELL_CONNECTED catch-all fix below,
      // used only when no live connector-drag preview point was captured
      // (e.g. a connect that didn't go through EdgeHandler at all).
      let lastPointerGraphPoint: { x: number; y: number } | null = null;
      graph.addMouseListener({
        mouseDown: () => {},
        mouseMove: (_sender: any, me: any) => {
          lastPointerGraphPoint = { x: me.getGraphX(), y: me.getGraphY() };
        },
        mouseUp: (_sender: any, me: any) => {
          lastPointerGraphPoint = { x: me.getGraphX(), y: me.getGraphY() };
        },
      });

      // Every redraw of the dashed drag preview (EdgeHandler.mouseMove ->
      // updatePreviewState) already resolves exactly where this end would
      // land — snapped to a fixed connection point if the pointer is near
      // one, perimeter-clipped to the target's boundary if hovering its
      // body, or following the raw pointer if nothing's under it yet — and
      // that computed point is what's actually drawn as the dashed line.
      // The bug the user is hitting: the CELL_CONNECTED catch-all fix below
      // used to freeze the final position from a value computed AFTER
      // connecting (either the raw drop pixel or a fresh post-connect
      // perimeter recompute), not from what the dashed line displayed a
      // moment earlier — so for a "floating" drop onto a shape's interior
      // (dashed line shows the perimeter crossing point, which can be well
      // away from the actual cursor when the shape is large), the final
      // pin could land somewhere the dashed preview never actually showed.
      // Capturing the handler's own abspoints on every preview tick and
      // using that snapshot to pin means the connector always ends up
      // exactly where the dashed line last showed it — true WYSIWYG.
      let lastConnectorPreviewPoint: { x: number; y: number } | null = null;
      const defaultCreateEdgeHandler = graph.createEdgeHandler.bind(graph);
      graph.createEdgeHandler = (state: CellState, edgeStyle: any) => {
        const handler = defaultCreateEdgeHandler(state, edgeStyle);
        handler.tolerance = 20;
        // A "virtual bend" is EdgeHandler's own always-on hotspot at the
        // midpoint of every segment, letting a drag there insert a new
        // waypoint — sensible for an ordinary edge, but never for one of
        // the dedicated-slide cases above (hasDedicatedEdgeSlide): an
        // arbitrary kink makes no sense on a connector that's meant to stay
        // a straight line sliding along whatever it's pinned to. Left
        // enabled, that hotspot (hit-tested within `tolerance` — the 20px
        // just set above, specifically for touch) competes directly with
        // the dedicated body-drag listener below for exactly the cases
        // that listener exists to handle: dragging near a short Sequence
        // message's own midpoint, once it's already selected, could land
        // on this hotspot instead and silently start adding a waypoint —
        // confirmed directly by an automated drag test landing exactly
        // there. Disabling it here for these specific edges removes the
        // competing target entirely rather than trying to arbitrate
        // between the two on every event.
        handler.isAddVirtualBendEvent = () => !hasDedicatedEdgeSlide(state.cell);
        // The SAME widened handle (12px, HandleConfig.size at the top of
        // this file) that makes an endpoint reliably grabbable also means
        // a body-drag started just a few px from an already-attached
        // endpoint can land ON that handle instead — confirmed directly:
        // SelectionCellsHandler dispatches to this (already-active, since
        // the cell is already selected) EdgeHandler before either the
        // dedicated body-drag listener or SelectionHandler ever sees the
        // event, exactly the same collision isAddVirtualBendEvent above
        // already fixed for the midpoint hotspot. Landing there starts a
        // genuine endpoint-reconnect drag — legitimate on its own — but if
        // it doesn't end up over a valid new target, maxGraph's default
        // doesn't revert, it DISCONNECTS that end (isAllowDanglingEdges is
        // on app-wide, for the cases that genuinely need it). For a
        // dedicated-slide edge that's much worse than a no-op: the OTHER
        // end is still pinned, so hasDedicatedEdgeSlide keeps claiming
        // every future click on this cell for the dedicated listener —
        // meaning the newly-dangling end can never be moved by ANY
        // gesture again. That's the exact mechanism behind "one end
        // attached to a shape moves fine, the other doesn't" (confirmed
        // against a live maxGraph instance: an accidental handle-grab on
        // the shape-attached end silently dropped its terminal, and
        // nothing thereafter could move that end again). Capturing the
        // terminal/style this end actually had the instant the drag
        // started and restoring both if it comes back disconnected undoes
        // only that accidental case — a real, successful reconnect
        // elsewhere in the same gesture leaves a non-null terminal, so
        // this is a no-op then.
        let dragStartTerminalInfo: { isSource: boolean; terminal: any; style: Record<string, unknown> } | null = null;
        const defaultHandlerMouseDown = handler.mouseDown.bind(handler);
        handler.mouseDown = (sender: any, me: any) => {
          lastConnectorPreviewPoint = null;
          dragStartTerminalInfo = null;
          defaultHandlerMouseDown(sender, me);
          if ((handler.isSource || handler.isTarget) && hasDedicatedEdgeSlide(state.cell)) {
            const isSource = handler.isSource;
            const terminal = state.cell.getTerminal(isSource);
            if (terminal) {
              const style = state.cell.getStyle();
              dragStartTerminalInfo = {
                isSource,
                terminal,
                style: (typeof style === 'object' && style !== null ? { ...style } : {}) as Record<string, unknown>,
              };
            }
          }
        };
        const defaultHandlerMouseMove = handler.mouseMove.bind(handler);
        handler.mouseMove = (sender: any, me: any) => {
          defaultHandlerMouseMove(sender, me);
          if (handler.isSource || handler.isTarget) {
            const points = handler.abspoints;
            const pt = handler.isSource ? points?.[0] : points?.[points.length - 1];
            if (pt) lastConnectorPreviewPoint = { x: pt.x, y: pt.y };
          }
        };
        const defaultHandlerMouseUp = handler.mouseUp.bind(handler);
        handler.mouseUp = (sender: any, me: any) => {
          const info = dragStartTerminalInfo;
          dragStartTerminalInfo = null;
          defaultHandlerMouseUp(sender, me);
          if (info && !state.cell.getTerminal(info.isSource)) {
            graph.batchUpdate(() => {
              graph.getDataModel().setTerminal(state.cell, info.terminal, info.isSource);
              graph.getDataModel().setStyle(state.cell, info.style as CellStateStyle);
            });
            graph.getView().revalidate();
          }
        };
        return handler;
      };

      // ─── Body-drag of a dedicated-slide connector: dedicated, WYSIWYG logic ──
      // SelectionHandler (maxGraph's generic single/multi-cell drag handler)
      // shows a ghost preview that's always a literal, unconstrained
      // translate of the selection's bounding box — correct for an ordinary
      // shape, but every "dedicated slide" edge case (see
      // hasDedicatedEdgeSlide: an edge auto-pinned to another cell, a
      // Fishbone Main Cause on the spine, a Sequence Sync/Async/Return
      // message, a Fork/Join stub) can only ever actually reposition by
      // sliding a fixed fraction along whatever it's pinned to
      // (runDedicatedEdgeSlide) — a fundamentally different, CONSTRAINED
      // result that the generic ghost knows nothing about. The ghost tracks
      // the cursor for the whole gesture; the real change only ever lands
      // once, at mouseup, via the MOVE_CELLS listener further down — wherever
      // the constrained slide actually resolves to, which generally isn't
      // where the ghost was just shown. That mismatch is exactly the "I can
      // move it but it doesn't land where I dragged it" complaint, and it's
      // structural, not a rounding bug — no amount of adjusting the slide
      // math fixes a disagreement with a completely different preview
      // mechanism. For a Sequence message specifically it's worse than a
      // mismatch: dragging anywhere other than perfectly in sync desyncs
      // exitY from entryY, rendering the message as a diagonal kink instead
      // of a level line (confirmed on video, flagged by validation).
      //
      // Fixed by giving a single selected dedicated-slide edge its own
      // drag path instead of SelectionHandler's generic one. Multi-selection
      // is deliberately left untouched (see the selectionCount <= 1 guards
      // below) — dragging a group that happens to include one of these edges
      // still moves everything together the ordinary way, via the same
      // MOVE_CELLS/runDedicatedEdgeSlide path this already used (confirmed
      // against a live maxGraph instance: a multi-selected vertex + pinned
      // edge dragged together still lands correctly through that mechanism
      // alone). Only the single-cell case — where the mismatch actually
      // happens — is redirected here.
      const selectionHandler = graph.getPlugin('SelectionHandler') as any;
      if (selectionHandler) {
        const defaultSelectionHandlerMouseDown = selectionHandler.mouseDown.bind(selectionHandler);
        selectionHandler.mouseDown = (sender: any, me: any) => {
          const cell = me.getCell();
          if (!me.isConsumed() && graph.isEnabled() && graph.getSelectionCount() <= 1 && hasDedicatedEdgeSlide(cell)) {
            // Same selection side effect SelectionHandler's own mouseDown
            // would have produced for a plain click — just without also
            // starting its mismatched ghost-drag. The dedicated mouseDown
            // below takes over the actual dragging.
            graph.selectCellForEvent(cell, me.getEvent());
            return;
          }
          defaultSelectionHandlerMouseDown(sender, me);
        };
      }
      let bodyDragEdge: any = null;
      let bodyDragLastPoint: { x: number; y: number } | null = null;
      graph.addMouseListener({
        mouseDown: (_sender: any, me: any) => {
          if (me.isConsumed()) return;
          const cell = me.getCell();
          if (!hasDedicatedEdgeSlide(cell) || graph.getSelectionCount() > 1) return;
          // A label sits on the same edge and has its own, separate,
          // already-correct drag (EdgeHandler's own moveLabel, triggered by
          // its LABEL_HANDLE hit-test) — only take over a click that lands
          // on the actual line, not its text.
          const state = me.getState();
          const labelBounds = (state?.text as any)?.bounds;
          if (labelBounds) {
            const x = me.getGraphX();
            const y = me.getGraphY();
            if (
              x >= labelBounds.x && x <= labelBounds.x + labelBounds.width &&
              y >= labelBounds.y && y <= labelBounds.y + labelBounds.height
            ) {
              return;
            }
          }
          bodyDragEdge = cell;
          bodyDragLastPoint = { x: me.getGraphX(), y: me.getGraphY() };
        },
        mouseMove: (_sender: any, me: any) => {
          if (!bodyDragEdge || !bodyDragLastPoint) return;
          const x = me.getGraphX();
          const y = me.getGraphY();
          const viewDx = x - bodyDragLastPoint.x;
          const viewDy = y - bodyDragLastPoint.y;
          bodyDragLastPoint = { x, y };
          if (viewDx === 0 && viewDy === 0) return;
          // The dedicated slide functions expect a MODEL-space delta (they
          // scale up internally to compare against view-space CellState
          // bounds) — me.getGraphX()/Y() are already view-space (scaled+
          // translated), so dividing out the current scale here is what
          // keeps this correct at any zoom level, not just 100%.
          const scale = graph.getView().getScale() || 1;
          graph.batchUpdate(() => {
            runDedicatedEdgeSlide(graph, bodyDragEdge, viewDx / scale, viewDy / scale);
          });
          graph.getView().revalidate();
          // See forceEdgeRepaint's own comment — revalidate() alone
          // reliably updates this edge's computed geometry but not always
          // its actual on-screen line, for this same "style-only pin
          // change" case. Called on every drag tick (not just at mouseup)
          // so the live drag is genuinely WYSIWYG, not just correct once
          // released.
          forceEdgeRepaint(graph, bodyDragEdge);
          me.consume();
        },
        mouseUp: (_sender: any, me: any) => {
          if (!bodyDragEdge) return;
          bodyDragEdge = null;
          bodyDragLastPoint = null;
          me.consume();
        },
      });

      registerShapeStyles(graph);

      graph.setGridEnabled(true);
      graph.setGridSize(GRID_SIZE);
      // isGridEnabledEvent is the actual gate every interactive handler
      // (VertexHandler moving/resizing a shape, EdgeHandler dragging a
      // connector's endpoint or waypoint, ConnectionHandler drawing a new
      // one) checks before calling graph.snap() on the LIVE drag preview —
      // maxGraph's own default is `!isAltDown(evt)`, i.e. "always snap
      // unless Alt is held". Alt has no touch equivalent, so on mobile this
      // was unconditionally true for every single move/touchmove tick,
      // rounding the preview position to the nearest 10px (GRID_SIZE) step
      // on every tick — that discrete step-to-step jump, not a real
      // performance issue, is what reads as "jumping"/not smooth while
      // dragging, for a moved shape and a dragged connector alike. This
      // only governs the *interactive drag* gesture; a freshly-dropped
      // shape's placement (handleAddShape) rounds its own coordinates
      // separately and keeps doing so, so new shapes still land cleanly —
      // only repositioning/resizing an existing one, or dragging a
      // connector, becomes a smooth 1:1 follow instead of a stepped snap.
      graph.isGridEnabledEvent = () => false;
      graph.setConnectable(true);
      // maxGraph's default hit-tolerance for picking a cell under the
      // pointer is 4px (Graph.tolerance, see getEventTolerance/intersects) —
      // fine for a filled vertex, which has real area to land on, but an
      // edge is a zero-width line, so ConnectionHandler/EdgeHandler/
      // ConstraintHandler (all of which route their target hit-testing
      // through this same value) only recognize a drop as "onto that
      // connector" within 4 physical pixels of its actual path. That's the
      // main reason attaching one connector's end to another connector
      // feels fiddly across every diagram type here, not just schematics
      // (which already get a separate, generous app-level snap via
      // CONNECTOR_SNAP_DISTANCE for palette-drop/auto-junction, but that
      // doesn't cover this interactive drag-onto-an-edge path). Widening it
      // gives every connector a real, comfortable hit margin along its
      // whole length.
      graph.setEventTolerance(12);
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
      // Several connectors here are themselves valid attachment targets for
      // *other* connectors — Fishbone's spine (a Main Cause branches off
      // it, see handleDrop's FISHBONE_MAIN_CAUSE_IDS branch and validate
      // Fishbone's 5.5), ERD relationships taking a split cardinality, etc.
      // `setTerminal` at drop time wires that up fine since it bypasses
      // interactive validation entirely, but connectableEdges defaults to
      // false, so EdgeHandler's own isValidSource/isValidTarget check
      // (used whenever the user drags an already-connected end, e.g.
      // sliding a Main Cause along the spine) never treats the spine as
      // valid — it silently disconnects instead, turning the drag into a
      // dangling edge and immediately failing the "must branch from the
      // spine" check. Without this, any edge-to-edge attachment made at
      // drop time was one interactive drag away from silently breaking.
      graph.setConnectableEdges(true);
      graph.setDisconnectOnMove(false);
      // `false` here makes maxGraph's own interactive connection validation
      // (EdgeHandler/ConnectionHandler's mouseUp, via getEdgeValidationError)
      // silently reject dragging an edge's end onto a cell pair that already
      // has *any* edge between them — surfaced to the user as a blank
      // `window.alert()` (this app never registered an i18n string for
      // maxGraph's "already connected" resource key, so the popup shows no
      // text) and the drag is discarded, leaving that end right back where
      // it started. That's fatal for a Sequence Diagram in particular —
      // two lifelines routinely exchange several messages back and forth —
      // but is exactly the same restriction for a second ERD relationship
      // between the same two entities, a second Flowchart arrow between the
      // same two steps, etc. `true` allows what every one of these diagram
      // types actually needs: as many distinct connectors between the same
      // two shapes as the notation calls for.
      graph.setMultigraph(true);
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

      // Schematic wiring: unlike Fishbone's spine or ERD's relationship
      // split (both applied only at palette-drop time in handleDrop), a
      // schematic wire is drawn the ordinary way — dragging between two
      // already-placed shapes — so there was previously no hook at all for
      // "a wire was just interactively connected/reconnected." CELL_CONNECTED
      // is graph-level (fired by the cellConnected mixin both ConnectionHandler's
      // new-drag and EdgeHandler's reconnect-drag ultimately call through),
      // unlike ConnectionHandler's own CONNECT event, which only covers the
      // former — see applySchematicPinSnap's own comment for why.
      graph.addListener(InternalEvent.CELL_CONNECTED, (_sender: any, evt: any) => {
        const edge = evt.getProperty('edge');
        const terminal = evt.getProperty('terminal');
        const source = !!evt.getProperty('source');
        if (!edge || !terminal) return;
        const role = typeof terminal.isVertex === 'function' && terminal.isVertex() ? getShapeRole(terminal) : undefined;
        if (!role || !SCHEMATIC_PIN_DEFINITIONS[role]) return;
        graph.batchUpdate(() => {
          applySchematicPinSnap(graph, edge, terminal, source);
          // For a brand-new edge, this end's own CELL_CONNECTED can fire
          // before the far end exists yet (dragging a wire out of a
          // component fires source's cellConnected while the target is
          // still mid-drag) — applySchematicPinSnap's "aim" is the other
          // end's position, so with no far end yet it has nothing to aim
          // at and falls back to this part's first pin, regardless of
          // which way the wire is actually headed. Once the far end IS a
          // real schematic part too, re-snapping it here (now that its own
          // aim — this end — genuinely exists) gives it a real shot at
          // picking the geometrically nearest pin instead of being stuck
          // on that fallback.
          const otherTerminal = edge.getTerminal(!source);
          if (otherTerminal && typeof otherTerminal.isVertex === 'function' && otherTerminal.isVertex()) {
            applySchematicPinSnap(graph, edge, otherTerminal, !source);
          }
          attemptSchematicAutoJunction(graph, edge);
        });
      });

      // FDD hierarchy links: a plain Connector drawn between two Function
      // boxes (i.e. NOT Control/Mechanism/Interface, which mean something
      // specific — see isAttachmentEdge in validateFDD) is how this app's
      // palette represents a parent->child decomposition link, since FDD
      // has no connector of its own for it. Left as a straight line it cuts
      // diagonally across the tree; real functional-decomposition figures
      // route it as an org-chart elbow instead. orthogonalEdgeStyle
      // reproduces that; see applyFddEntryStyle's own comment for why it no
      // longer also picks a fixed entry/exit point here — that's the
      // CELL_CONNECTED catch-all fix's job now, same as every other
      // connector type.
      graph.addListener(InternalEvent.CELL_CONNECTED, (_sender: any, evt: any) => {
        applyFddEntryStyle(graph, evt.getProperty('edge'));
      });

      // Flowchart's own connector (Flow Line), drawn by dragging rather than
      // tap-to-connect: same orthogonal routing as the tap-to-connect path
      // in create.tsx's handleCanvasSelectionChange, so a Flow Line looks
      // identical regardless of which way it was drawn.
      graph.addListener(InternalEvent.CELL_CONNECTED, (_sender: any, evt: any) => {
        const edge = evt.getProperty('edge');
        if (!edge || getShapeRole(edge) !== 'flow-line') return;
        const currentStyle = edge.getStyle();
        const base = typeof currentStyle === 'object' && currentStyle !== null ? currentStyle : {};
        graph.batchUpdate(() => {
          edge.setStyle({ ...base, edgeStyle: 'orthogonalEdgeStyle', rounded: false } as CellStateStyle);
          // See the matching comment on the CELL_CONNECTED catch-all fix
          // below for why this is revalidate() rather than the narrower
          // graph.refresh(edge) it used to be.
          graph.getView().revalidate();
        });
      });

      // Catch-all connector-accuracy fix: a "floating" connection (the
      // maxGraph default whenever a drag lands on a vertex without hitting
      // one of its few explicit highlighted connection points) doesn't
      // remember where it was actually attached — it recomputes which point
      // on the target's perimeter the line touches from scratch on every
      // redraw, purely from the two shapes' current relative positions. That
      // reads as exactly the "endpoint jumps" / "lands in the wrong spot"
      // complaint: the very first render after a drag can already differ
      // from the actual drop pixel, and it visibly slides to a different
      // spot the moment either connected shape moves again. Every
      // diagram-specific listener above already pins an explicit
      // entry/exit fraction for the connections it cares about (schematic
      // pins, FDD's org-chart entry, Sequence messages via
      // sequenceMessageConnectionStyle, etc.) — this is the fallback for
      // everything else (Flow Line, UML/ERD/DFD associations, the generic
      // Connector shape...): once an edge's end lands on a real vertex with
      // no fixed point already set, freeze it at exactly the fraction of
      // that vertex's bounds it's currently rendered at, so it stays put
      // instead of drifting. Deferred a tick (queueMicrotask) so the view
      // has already run its own natural post-connect validate first —
      // reading state.absolutePoints synchronously here, still mid the
      // connect's own batchUpdate, would see stale pre-connect geometry.
      //
      // "Currently rendered at" used to mean maxGraph's own recomputed
      // floating-perimeter point (edgeState.absolutePoints), read AFTER
      // connecting — but that recompute can differ from whatever the dashed
      // drag preview showed a moment earlier (same math, different inputs:
      // the preview clones the edge state and floats it live off the
      // pointer, the post-connect render is the real edge settling fresh),
      // so pinning to it could freeze the connector somewhere the user
      // never actually saw it land — the "dashed line wasn't accurate"
      // complaint. lastConnectorPreviewPoint (EdgeHandler's own abspoints,
      // sampled on every preview redraw above) is exactly the point the
      // dashed line was last drawn at, so pinning to that guarantees the
      // final position always matches what was previewed. Falls back to
      // the raw pointer position, then the post-connect recompute, only for
      // connects that didn't go through an interactive EdgeHandler drag.
      //
      // Also covers a connector's end landing on ANOTHER connector (this app
      // deliberately allows that — setConnectableEdges(true) above, used by
      // e.g. Fishbone's Main Cause branching off the spine, ERD's cardinality
      // split, or just one Flowchart arrow pointing at another). Previously
      // restricted to terminal.isVertex() only, so an edge-to-edge connect
      // got NO pinning at all: maxGraph's floating fallback for an edge
      // terminal (GraphView.getPoint, given no explicit geometry) doesn't
      // even try to track the drop point — it hardcodes the target edge's
      // exact MIDPOINT every time, unconditionally. That's the "jumping to
      // another position" bug: wherever you actually dropped it, the very
      // next redraw recenters it dead-center on the target connector. The
      // same bounds-fraction math already used for a vertex target
      // (getConnectionPoint/getPerimeterBounds) works identically against an
      // edge's own bounding box, so no separate branch is needed here —
      // exitX/entryX and a target's CellState mean the same thing either way.
      graph.addListener(InternalEvent.CELL_CONNECTED, (_sender: any, evt: any) => {
        const edge = evt.getProperty('edge');
        const terminal = evt.getProperty('terminal');
        const source = !!evt.getProperty('source');
        if (!edge || !terminal || typeof terminal.isVertex !== 'function') return;
        const previewPoint = lastConnectorPreviewPoint;
        const dropPoint = lastPointerGraphPoint;
        queueMicrotask(() => {
          if (!graph.getDataModel().contains(edge) || edge.getTerminal(source) !== terminal) return;
          const currentStyle = edge.getStyle();
          const base = (typeof currentStyle === 'object' && currentStyle !== null ? currentStyle : {}) as Record<string, unknown>;
          // igraphAutoPinSource/Target marks a fixed point THIS catch-all set
          // on a previous connect — distinct from one a dedicated listener
          // above (schematic pins, FDD's entry point, sequence messages) set
          // deliberately. Without that distinction, re-dragging the same end
          // to a new spot looked "locked": exitX from the first attach was
          // already non-undefined by the time this same catch-all ran again
          // on the second connect, so it kept skipping and the position never
          // updated past wherever it first landed. Only skip for a fixed
          // point that ISN'T our own — those are the ones with a real reason
          // to be left alone.
          //
          // `!= null` (not `!== undefined`) is deliberate: EdgeHandler's own
          // connect() (see maxGraph's ConnectionsMixin.setConnectionConstraint)
          // runs on EVERY interactive connect/reconnect, and since this app
          // never defines any ConstraintHandler constraints
          // (getAllConnectionConstraints has nothing to return for a custom
          // Shape), its constraint.point is always null — which takes the
          // "clear" branch there, setting exitX/entryX to the literal value
          // `null` (not removing the key). `null !== undefined` is `true`,
          // so the strict check misread maxGraph's own routine reset as "a
          // real fixed point already exists" on every single connect, not
          // just re-drags — permanently refusing to ever pin this end. A
          // vertex target survives that fine (its floating-perimeter
          // fallback already tracks the drop correctly with no pin at all),
          // which is why "connector onto a shape" looked fine — but an edge
          // target's floating fallback hardcodes the target's exact midpoint
          // (see this function's own opening comment), so with the pin
          // never actually landing, a connector reconnected onto another
          // connector snapped back to that midpoint on every single release,
          // live-drag preview notwithstanding — the "locked, can't
          // reposition" bug. `!= null` treats maxGraph's own null-clear the
          // same as a genuinely absent key (proceed to compute our own fix),
          // while still correctly leaving alone a real NUMBER a dedicated
          // case (schematic pins, FDD, sequence messages, Fishbone) set on
          // purpose.
          const autoPinFlag = source ? 'igraphAutoPinSource' : 'igraphAutoPinTarget';
          const hasFixedPoint = source ? base.exitX != null : base.entryX != null;
          const fixedByOther = hasFixedPoint && !isAutoPinnedFlag(base[autoPinFlag]);
          if (fixedByOther) return;
          const targetState = graph.getView().getState(terminal);
          // A vertex always has real area, but a straight (perfectly
          // horizontal or vertical) connector's own bounding box is exactly
          // 0 in one dimension — the common case for a target connector, not
          // an edge case. Only bail when BOTH dimensions are 0 (a fully
          // collapsed/zero-length edge, nothing meaningful to pin against);
          // a single 0 dimension still has a perfectly well-defined fraction
          // along its other axis, and doesn't matter along the zero one
          // (every fraction resolves to the same single-point coordinate
          // there — see getConnectionPoint's own bounds.width/height math).
          if (!targetState || (targetState.width <= 0 && targetState.height <= 0)) return;
          // previewPoint (EdgeHandler's own abspoints) is preferred over the
          // raw pointer for a VERTEX target because a big shape's floating
          // perimeter clips the drop to its boundary — the raw cursor can be
          // well inside the shape's interior while the dashed line (and the
          // actual connection) sits at the edge, so previewPoint is what's
          // actually accurate there. An EDGE target has no interior to clip
          // into — you can only be hovering within a few px of its thin
          // line to register as a valid target at all — so that reasoning
          // doesn't apply, and empirically (confirmed against a screen
          // recording of a real drag) abspoints for an edge-target preview
          // doesn't reliably track the same point the dashed line visually
          // showed: a re-drag along an already-attached target connector
          // would visibly preview moving to the new cursor position, then
          // settle back near its old spot once released. The raw pointer
          // position is unambiguous in this case and matches what was
          // actually shown, so it's preferred first for an edge target.
          const isEdgeTarget = typeof terminal.isEdge === 'function' && terminal.isEdge();
          let pt: { x: number; y: number } | undefined = (isEdgeTarget ? dropPoint ?? previewPoint : previewPoint ?? dropPoint) ?? undefined;
          if (!pt) {
            const edgeState = graph.getView().getState(edge);
            const points = edgeState?.absolutePoints;
            pt = (source ? points?.[0] : points?.[points.length - 1]) ?? undefined;
          }
          if (!pt) return;
          // An edge target's fraction means PATH LENGTH along its actual
          // rendered polyline (absolutePoints, bends included) — see
          // getConnectionPoint's override and pointAtPathFraction/
          // closestFractionOnPath's own comment for why the bounding-box
          // fraction every vertex target uses doesn't work for a target
          // that might not even be axis-aligned. entryY/exitY stays at 0.5,
          // unused for an edge target (the override only reads .x).
          const fx = isEdgeTarget && Array.isArray(targetState.absolutePoints) && targetState.absolutePoints.length >= 2
            ? closestFractionOnPath(targetState.absolutePoints.filter((p) => p != null) as { x: number; y: number }[], pt.x, pt.y)
            : targetState.width > 0 ? Math.min(1, Math.max(0, (pt.x - targetState.x) / targetState.width)) : 0.5;
          const fy = isEdgeTarget
            ? 0.5
            : targetState.height > 0 ? Math.min(1, Math.max(0, (pt.y - targetState.y) / targetState.height)) : 0.5;
          graph.batchUpdate(() => {
            // graph.getDataModel().setStyle (NOT edge.setStyle, which was
            // here before) — edge.setStyle mutates the Cell directly and
            // skips the data model's own change-tracking entirely, so it
            // never fires the model's CHANGE event. That event is what
            // both the view's own automatic revalidation AND
            // SelectionCellsHandler (which keeps this edge's own selection
            // handles — its endpoint/bend dots — in sync with its actual
            // rendered position) listen for. Skipping it is why the
            // explicit revalidate() below was needed at all — it forced
            // the LINE to repaint, but never told the active handler to
            // re-sync its handles, which is exactly the kind of mismatch
            // that makes a *second* drag land somewhere other than where
            // it looked like it was grabbed. Routing through the model
            // properly fixes both the same way, in the correct order.
            graph.getDataModel().setStyle(edge, {
              ...base,
              ...(source
                ? { exitX: fx, exitY: fy, exitPerimeter: false, igraphAutoPinSource: true }
                : { entryX: fx, entryY: fy, entryPerimeter: false, igraphAutoPinTarget: true }),
            } as CellStateStyle);
            // Belt-and-suspenders on top of the model's own automatic
            // revalidation — cheap enough for a one-off user action.
            graph.getView().revalidate();
          });
          // See forceEdgeRepaint's own comment — confirmed live that
          // revalidate() alone leaves the on-screen line stuck at its
          // pre-drag position even though the model (and every subsequent
          // save/reload) already has the correct exitX/exitY: reopening the
          // same diagram always rendered it right, only the already-open
          // canvas didn't.
          forceEdgeRepaint(graph, edge);
          showConnectSnapPulse(pt.x, pt.y);
        });
      });

      // Dragging a class container's own resize handle needs its
      // (non-resizable) compartments kept in sync with the new bounds.
      graph.addListener(InternalEvent.CELLS_RESIZED, (_sender: any, evt: any) => {
        const resized = evt.getProperty('cells') as any[] | undefined;
        resized?.forEach((cell) => {
          if (isUmlClassContainerCell(cell)) syncClassCompartmentsToContainer(graph, cell);
          if (isDfdDataStoreContainerCell(cell)) syncDfdDataStoreCompartmentsToContainer(graph, cell);
          // Stretching an Activation/Lifeline bar taller to match how long
          // an interaction actually runs is normal sequence-diagram
          // workflow — see attachDanglingSequenceMessages — and unlike a
          // move, a resize never went through runAutoAttachOnMove at all.
          attachDanglingSequenceMessages(graph, cell);
          // Widening/narrowing one lane by its own resize handle would
          // otherwise open a gap or overlap with its neighbors — restack
          // the whole group (preserving this lane's new width, only
          // repositioning x) so every lane stays flush, the same guarantee
          // insertSwimlaneLane gives a freshly-added one.
          if (getShapeRole(cell) === 'act-swimlane') {
            const groupId = getSwimlaneGroupId(cell);
            if (groupId) {
              const group = graph
                .getChildVertices(graph.getDefaultParent())
                .filter((c: any) => getShapeRole(c) === 'act-swimlane' && getSwimlaneGroupId(c) === groupId)
                .sort((a: any, b: any) => (a.getGeometry()?.x ?? 0) - (b.getGeometry()?.x ?? 0));
              graph.batchUpdate(() => restackSwimlaneGroup(graph, group));
            }
          }
          // Lengthening a Fork/Join bar by its own resize handle slides its
          // attached stub ends along with it (they're pinned to a fraction
          // of the bar's width) — re-anchor any still-dangling far end so
          // the stub stays a straight perpendicular line instead of going
          // diagonal (see realignForkJoinStubs).
          const role = getShapeRole(cell);
          if (role === 'act-fork' || role === 'act-join') {
            realignForkJoinStubs(graph, cell);
          }
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

        // Feeds the ResizeObserver's pan-deferral above (see
        // isPanningActive/pendingResizeAfterPan): a container resize that
        // lands mid-drag is what actually visibly yanks the canvas, so
        // sizeDidChange() gets held off for the gesture's whole duration
        // and applied once, right as it ends, instead of possibly several
        // times mid-drag.
        panningHandler.addListener(InternalEvent.PAN_START, () => {
          isPanningActive = true;
        });
        panningHandler.addListener(InternalEvent.PAN_END, () => {
          isPanningActive = false;
          if (!pendingResizeAfterPan) return;
          pendingResizeAfterPan = false;
          const g = graphRef.current as any;
          if (g && wrapper.offsetWidth > 0 && wrapper.offsetHeight > 0) {
            g.sizeDidChange();
          }
        });
      }

      new RubberBandHandler(graph);

      // Rubber-band edge auto-scroll — Lucidchart/Figma-style: dragging a
      // selection box near (or past) the canvas edge keeps panning toward
      // that edge for as long as the cursor stays there, even without
      // further mouse movement, so shapes currently off-screen can be
      // selected without letting go and panning manually first.
      //
      // Deliberately NOT using maxGraph's own PanningManager (which is what
      // a raw drag-pan and would normally drive this) — that pans via a
      // temporary CSS transform on the SVG canvas (graph.panGraph) and only
      // commits the real view.translate once the gesture ends, so the grid
      // background (which repaints off view.translate/scale change events)
      // would visibly lag behind the live-panning content for the whole
      // autoscroll. Calling view.setTranslate() directly every frame instead
      // commits immediately, so the existing 'translate' listener (see
      // scheduleGridRepaint below) keeps the grid glued to the content just
      // like it already does for every other kind of pan. The rubber-band
      // box itself doesn't need any special handling either way — its own
      // position is anchored to raw cursor/container pixel coordinates, not
      // to view.translate, so it isn't affected by which technique pans the
      // content underneath it.
      const RUBBERBAND_EDGE_ZONE = 48; // px from the edge where autoscroll kicks in
      const RUBBERBAND_MAX_SPEED = 18; // screen px/frame at (or past) the edge
      let rubberbandAutoScrollRaf: number | null = null;
      let lastRubberbandClientX = 0;
      let lastRubberbandClientY = 0;

      // 0 once `distanceFromEdge` clears the zone; ramps up to MAX_SPEED as
      // it approaches 0, and stays capped at MAX_SPEED for any negative
      // distance (cursor already dragged past the edge, e.g. into the
      // shapes/properties panel or off the browser window entirely).
      const rubberbandEdgeSpeed = (distanceFromEdge: number): number => {
        if (distanceFromEdge >= RUBBERBAND_EDGE_ZONE) return 0;
        const t = 1 - Math.max(0, distanceFromEdge) / RUBBERBAND_EDGE_ZONE;
        return t * RUBBERBAND_MAX_SPEED;
      };

      const rubberbandAutoScrollTick = () => {
        const g = graphRef.current;
        const gd = graphDivRef.current;
        if (!g || !gd || !gd.querySelector('.mxRubberband')) {
          rubberbandAutoScrollRaf = null;
          return;
        }
        const rect = gd.getBoundingClientRect();
        const relX = lastRubberbandClientX - rect.left;
        const relY = lastRubberbandClientY - rect.top;

        // Positive screenDx/Dy = content should shift right/down on screen
        // (revealing more off-screen content to the left/top) — matches
        // view.translate's own sign convention directly (screen = (model +
        // translate) * scale), so no extra inversion needed below.
        const screenDx = rubberbandEdgeSpeed(relX) - rubberbandEdgeSpeed(rect.width - relX);
        const screenDy = rubberbandEdgeSpeed(relY) - rubberbandEdgeSpeed(rect.height - relY);

        if (screenDx !== 0 || screenDy !== 0) {
          const view = g.getView();
          const t = view.getTranslate();
          const scale = view.getScale();
          view.setTranslate(t.x + screenDx / scale, t.y + screenDy / scale);
        }

        rubberbandAutoScrollRaf = requestAnimationFrame(rubberbandAutoScrollTick);
      };

      const onRubberbandMouseMove = (e: MouseEvent) => {
        lastRubberbandClientX = e.clientX;
        lastRubberbandClientY = e.clientY;
        if (rubberbandAutoScrollRaf === null && graphDivRef.current?.querySelector('.mxRubberband')) {
          rubberbandAutoScrollRaf = requestAnimationFrame(rubberbandAutoScrollTick);
        }
      };
      // window, not graphDiv — a rubber-band drag routinely continues past
      // the canvas's own edge (that's the whole point), and only window-
      // level mousemove keeps firing once the cursor leaves graphDiv's
      // bounds.
      window.addEventListener('mousemove', onRubberbandMouseMove);

      const undoManager = new UndoManager();
      const undoListener = (_: any, evt: any) =>
        undoManager.undoableEditHappened(evt.getProperty('edit'));
      graph.getDataModel().addListener(InternalEvent.UNDO, undoListener);
      graph.getView().addListener(InternalEvent.UNDO, undoListener);
      (graph as any).undoManager = undoManager;

      // Default createId() is a plain sequential counter seeded by scanning
      // existing numeric ids on load — every collaborator's tab hydrates
      // from the same server XML, so two people each creating a new shape
      // in the same short window would deterministically compute the same
      // next id on their independent local models. Only matters for
      // newly-created cells (createId() only fires when a cell has none
      // yet), so existing saved diagrams and their numeric-string ids are
      // unaffected. Same collision-avoidance shape as create.tsx's own
      // generatePageId.
      graph.getDataModel().createId = () =>
        `c${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

      const keyHandler = new KeyHandler(graph);
      // includeEdges=false — deleting a shape shouldn't take its connectors
      // with it. A dangling edge is already a normal, expected state across
      // every diagram type here (see setAllowDanglingEdges above and G2's
      // checkDanglingEdges in flowchartRules.ts, which flags exactly this),
      // so removing e.g. a Category Box now leaves its Main Cause line
      // behind as a dangling edge the user can reattach or clean up,
      // instead of silently vanishing along with the box.
      keyHandler.bindKey(46, () => graph.removeCells(null, false));
      keyHandler.bindKey(8, () => graph.removeCells(null, false));
      keyHandler.bindKey(13, () => graph.removeCells(null, false));
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

      const NUDGE_STEP = 1;
      const nudge = (dx: number, dy: number) => {
        const cells = graph.getSelectionCells();
        if (cells.length) graph.moveCells(cells, dx, dy);
      };
      keyHandler.bindKey(37, () => nudge(-NUDGE_STEP, 0));
      keyHandler.bindKey(38, () => nudge(0, -NUDGE_STEP));
      keyHandler.bindKey(39, () => nudge(NUDGE_STEP, 0));
      keyHandler.bindKey(40, () => nudge(0, NUDGE_STEP));

      // Magnet-attach isn't just a drop-time thing — see runAutoAttachOnMove
      // above. MOVE_CELLS fires for every move regardless of source
      // (interactive drag via GraphHandler, the nudge keys just above,
      // programmatic moveCells elsewhere), so dragging a Category Box onto
      // its Main Cause's dangling end, or a Main Cause until it's close
      // enough to the spine, attaches right then — the same as it would
      // have if it'd landed there on the original drop. dx/dy are also
      // forwarded so an already-attached Main Cause slides along the spine
      // (slideMainCauseAlongSpine) and an already-attached Sequence message
      // slides along its timeline(s) (slideSequenceMessageAlongTimelines),
      // instead of staying pinned at their original attach point.
      graph.addListener(InternalEvent.MOVE_CELLS, (_sender: any, evt: any) => {
        const cells = evt.getProperty('cells') as any[] | undefined;
        const dx = (evt.getProperty('dx') as number | undefined) ?? 0;
        const dy = (evt.getProperty('dy') as number | undefined) ?? 0;
        if (cells && cells.length) runAutoAttachOnMove(graph, cells, dx, dy);
      });

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

      // Raw view 'translate' events fire once per pointermove tick during a
      // pan (PanningHandler drives panning by continuously translating the
      // view in JS, not native browser scrolling) — far more often than the
      // screen can usefully repaint, same reasoning the pinch-zoom rAF
      // coalescing above already uses. repaintGrid does a full clear+redraw
      // of every grid line across the visible canvas, so calling it
      // synchronously on every one of those ticks could fall behind the
      // (much cheaper) SVG content translating right alongside it — the
      // grid visibly drifting a frame or two behind the actual diagram
      // mid-pan is exactly the kind of layered-motion mismatch that reads
      // as dizzying. Coalescing to one repaint per animation frame keeps
      // the grid glued to the content no matter how fast the raw events
      // arrive.
      let gridRepaintRafId: number | null = null;
      const scheduleGridRepaint = () => {
        if (gridRepaintRafId !== null) return;
        gridRepaintRafId = requestAnimationFrame(() => {
          gridRepaintRafId = null;
          repaintGrid();
        });
      };
      graph.getView().addListener('scale', () => { scheduleGridRepaint(); reportZoom(); });
      graph.getView().addListener('translate', () => scheduleGridRepaint());
      graph.getView().addListener('scaleAndTranslate', () => { scheduleGridRepaint(); reportZoom(); });

      graph.getDataModel().addListener(InternalEvent.CHANGE, (_sender: any, evt: any) => {
        try {
          const xml = new ModelXmlSerializer(graph.getDataModel()).export();
          // evt.getProperty('changes') is the same array of atomic change
          // objects (GeometryChange/StyleChange/ChildChange/...) the
          // UndoManager above already stores for this transaction — reused
          // here as the basis for a small collaboration patch instead of
          // re-broadcasting the whole page's xml on every edit. xml is
          // still passed through as changesToPatches's fallback: an
          // unrecognized change type degrades to one full-snapshot patch
          // for this flush rather than silently dropping the edit.
          const changes = evt?.getProperty ? evt.getProperty('changes') : null;
          const patches = changesToPatches(Array.isArray(changes) ? changes : [], xml);
          onChangeRef.current?.(xml, patches);
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
        if (gridRepaintRafId !== null) cancelAnimationFrame(gridRepaintRafId);
        window.removeEventListener('mousemove', onRubberbandMouseMove);
        if (rubberbandAutoScrollRaf !== null) cancelAnimationFrame(rubberbandAutoScrollRaf);
        remoteHighlightsRef.current.forEach((highlight) => highlight.destroy());
        remoteHighlightsRef.current.clear();
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
          // Transparent, not a solid fill — a filled rectangle sitting on
          // top of a non-rectangular shape (circle, diamond, etc.) read as
          // a stray rectangle appearing over the shape while typing. The
          // blue border still marks the editable bounds; the shape's own
          // fill now shows through underneath instead of being covered.
          background: 'transparent',
          fontFamily: 'inherit',
          lineHeight: 1.2,
          outline: 'none',
        }}
        onBlur={() => commitMobileEdit(false)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            e.preventDefault();
            commitMobileEdit(true);
          }
          // Plain Enter is intentionally left alone here — same as desktop's
          // editor (see the CellEditorHandler.resize patch's own comment on
          // "pressing Enter grows the box"), it inserts a line break like an
          // ordinary multi-line field. Committing already happens on blur
          // (tapping away, or the mobile keyboard's own dismiss/done key),
          // so there's no need for Enter to double as a submit.
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

const DiagramCanvas = forwardRef<DiagramCanvasHandle, DiagramCanvasProps>(({ onReady, onChange, onSelectionChange, onZoomChange, umlType, isMobile, leftObstruction }, ref) => {
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
      <WebCanvas ref={ref} onReady={onReady} onChange={onChange} onSelectionChange={onSelectionChange} onZoomChange={onZoomChange} umlType={umlType} isMobile={isMobile} leftObstruction={leftObstruction} />
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