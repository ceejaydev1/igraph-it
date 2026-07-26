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
  CellHighlight,
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
} from './maxgraph-custom-shapes';
import { UniversalVertexHandler } from './maxgraph-universal-handler';
import { getShapeDefinitionById, getShapesForDiagram, DIAGRAM_SHAPES, ShapeDefinition, isConnectorCell } from '@/constants/shapes';
import { ShapePreview } from '@/components/shapes/ShapeIcon';
import { tagShapeRole, getShapeRole, validateDiagram, FlowchartIssue } from '@/utils/flowchartRules';

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
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 16 16'><circle cx='8' cy='8' r='8' fill='%23ef4444'/><rect x='7' y='3' width='2' height='6' rx='1' fill='white'/><rect x='7' y='11' width='2' height='2' rx='1' fill='white'/></svg>";
const FLOWCHART_WARNING_ICON =
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 16 16'><path d='M8 1L15 14H1Z' fill='%23f59e0b'/><rect x='7' y='6' width='2' height='4' rx='1' fill='white'/><rect x='7' y='11' width='2' height='2' rx='1' fill='white'/></svg>";
// Same red/yellow used above for the outline CellHighlight draws around a
// flagged shape — one visual language for "this cell has an issue."
const FLOWCHART_ERROR_COLOR = '#ef4444';
const FLOWCHART_WARNING_COLOR = '#f59e0b';

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
    'igraph.fishboneHead': {
      shape: 'igraph.fishboneHead',
      fillColor: '#ffffff',
      strokeColor: BLACK,
      strokeWidth: 2,
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
    'igraph.umlSystemBoundary': {
      shape: 'igraph.umlSystemBoundary',
      fillColor: 'transparent',
      strokeColor: BLACK,
      strokeWidth: 2,
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

// Runs when a compartment's edit is committed (see the CellEditorHandler
// override below for why Enter reaches here as a newline instead of
// stopping the edit). Grows/shrinks just the edited compartment to fit its
// line count, shifts every compartment below it down/up by the same delta,
// and grows/shrinks the container by that delta too — the other
// compartments' own heights are left untouched, per the chosen behavior.
function resizeClassCompartmentToFitText(graph: Graph, cell: any) {
  const container = cell.getParent();
  const geo = cell.getGeometry();
  if (!container || !geo) return;
  const containerGeo = container.getGeometry();
  if (!containerGeo) return;

  const value = (cell.getValue() as string) ?? '';
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
// ⭐ MAIN WEBCANVAS COMPONENT
// ════════════════════════════════════════════════════════════════════════════

const WebCanvas = forwardRef<DiagramCanvasHandle, DiagramCanvasProps>(({ onReady, onChange, onSelectionChange, onZoomChange, umlType = 'flowchart', isMobile = false }, ref) => {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const gridCanvasRef = useRef<HTMLCanvasElement>(null);
  const graphDivRef = useRef<HTMLDivElement>(null);
  const graphRef = useRef<Graph | null>(null);

  const [isDragOver, setIsDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedCell, setSelectedCell] = useState<any>(null);
  const [flowchartIssues, setFlowchartIssues] = useState<FlowchartIssue[]>([]);
  // Defaults open (not collapsed behind a click) so the actual "what's wrong"
  // messages are visible the moment an issue appears, not just a bare count.
  const [showIssuesList, setShowIssuesList] = useState(true);
  // One CellHighlight shape per flagged cell — a colored outline around the
  // shape itself (red for error, yellow for warning), separate from the
  // small corner-badge overlay. Rebuilt on every validation pass; torn down
  // on unmount in initGraph's cleanup below.
  const issueHighlightsRef = useRef<CellHighlight[]>([]);

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
        (graph.getPlugin('FitPlugin') as FitPlugin | null)?.fit();
      } catch (e) {
        console.error('Failed to load diagram XML:', e);
      }
    },
    refresh: () => {
      const graph = graphRef.current;
      if (!graph) return;
      try {
        graph.getView().revalidate();
        resizeGridCanvas();
        repaintGrid();
      } catch (e) {
        console.error('Failed to refresh diagram view:', e);
      }
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
      'igraph.fishboneHead': {
        ...base,
        shape: 'igraph.fishboneHead',
        fillColor: '#ffffff',
        strokeColor: BLACK,
        strokeWidth: 2,
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
  // ⭐ DIAGRAM VALIDATION (every diagram type, desktop only — see
  // utils/flowchartRules.ts for the full per-type rule set)
  // ════════════════════════════════════════════════════════════════════════════

  const clearIssueHighlights = useCallback(() => {
    issueHighlightsRef.current.forEach((h) => h.destroy());
    issueHighlightsRef.current = [];
  }, []);

  const runFlowchartValidation = useCallback(() => {
    const graph = graphRef.current;
    if (!graph) return;

    if (isMobile) {
      graph.clearCellOverlays(null);
      clearIssueHighlights();
      setFlowchartIssues((prev) => (prev.length ? [] : prev));
      return;
    }

    const issues = validateDiagram(graph, umlType);

    graph.clearCellOverlays(null);
    issues.forEach((issue) => {
      // Graph-wide issues (e.g. "no start terminator") aren't any one cell's
      // fault — they only ever appear in the summary list, not as a badge.
      if (!issue.cell) return;
      const icon = new ImageBox(
        issue.severity === 'error' ? FLOWCHART_ERROR_ICON : FLOWCHART_WARNING_ICON,
        16,
        16,
      );
      graph.addCellOverlay(issue.cell, new CellOverlay(icon, issue.message, 'right', 'top'));
    });

    // Colored outline per flagged cell — red wins over yellow when a shape
    // has both an error and a warning, since the harder rule is the more
    // important one to fix first. Skipped for real edges and for
    // connector/line shapes dropped from the Shapes panel (Connector, Flow
    // Line, Control, Mechanism, Interface) — an outline drawn along a thin
    // line looks like a rendering glitch rather than a flagged shape; the
    // corner-badge overlay above still covers those.
    clearIssueHighlights();
    const worstSeverityByCell = new Map<Cell, FlowchartIssue['severity']>();
    issues.forEach((issue) => {
      if (!issue.cell) return;
      if (issue.cell.isEdge() || isConnectorCell(issue.cell)) return;
      const existing = worstSeverityByCell.get(issue.cell);
      if (existing !== 'error') worstSeverityByCell.set(issue.cell, issue.severity);
    });
    worstSeverityByCell.forEach((severity, cell) => {
      const state = graph.getView().getState(cell);
      if (!state) return;
      const highlight = new CellHighlight(
        graph,
        severity === 'error' ? FLOWCHART_ERROR_COLOR : FLOWCHART_WARNING_COLOR,
        3,
      );
      highlight.highlight(state);
      issueHighlightsRef.current.push(highlight);
    });

    setFlowchartIssues(issues);
  }, [umlType, isMobile, clearIssueHighlights]);

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
      // Class Diagram's "Class" shape needs a container + 3 independently
      // editable compartments, not a single vertex — see insertUmlClassCell.
      let cell: any;
      if (shapeId === 'class-box') {
        cell = insertUmlClassCell(graph, cx, cy, dropW, dropH);
      } else {
        // ⭐ CRITICAL FIX: Use getShapeStyle to get the proper style
        const styleObject = getShapeStyle(styleKey);

        // Add text properties
        const fullStyle: CellStateStyle = {
          ...styleObject,
          fontColor: BLACK,
          fontSize: 12,
          align: 'center' as AlignValue,
          verticalAlign: 'middle' as VAlignValue,
          whiteSpace: 'wrap' as WhiteSpaceValue,
        };

        cell = graph.insertVertex(
          null,
          null,
          '',
          cx,
          cy,
          dropW,
          dropH,
          fullStyle,
        );
      }
      tagShapeRole(cell, shapeId);

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
    } else {
      let shapeStyle: CellStateStyle;
      if (shapeId) {
        const styleKey = IGRAPH_ID_STYLE_MAP[shapeId] ?? 'igraph.rectangle';
        shapeStyle = {
          ...getShapeStyle(styleKey),
          fontColor: BLACK,
          fontSize: 12,
          align: 'center' as AlignValue,
          verticalAlign: 'middle' as VAlignValue,
          whiteSpace: 'wrap' as WhiteSpaceValue,
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

      if (selected && selected.isVertex && selected.isVertex()) {
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

      const ro = new ResizeObserver(() => { resizeGridCanvas(); repaintGrid(); });
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

      const defaultEdgeStyle = graph.getStylesheet().getDefaultEdgeStyle();
      defaultEdgeStyle.strokeColor = BLACK;
      defaultEdgeStyle.strokeWidth = 2;

      const stylesheet = graph.getStylesheet();
      const edgeStyleNames = ['defaultEdge', 'edgeStyle', 'roundedEdge', 'orthogonalEdge', 'entityRelation', 'arrow', 'connector'];
      edgeStyleNames.forEach(styleName => {
        const style = stylesheet.styles.get(styleName);
        if (style) {
          style.strokeColor = BLACK;
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
      graph.setAllowDanglingEdges(false);
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

      // ─── UML Class compartments ────────────────────────────────────────
      // Enter normally commits/stops editing everywhere (setEnterStopsCell
      // Editing above) so a shape's whole label stays a quick single line.
      // A class compartment (name/attributes/methods) legitimately needs
      // multiple lines (e.g. one attribute per line), so Enter there should
      // insert a newline instead — overriding isStopEditingEvent to return
      // false for Enter on those cells lets the keystroke fall through to
      // the editor's native (browser) newline behavior untouched.
      const cellEditorHandler = graph.getPlugin('CellEditorHandler') as any;
      if (cellEditorHandler) {
        const defaultIsStopEditingEvent = cellEditorHandler.isStopEditingEvent.bind(cellEditorHandler);
        cellEditorHandler.isStopEditingEvent = (evt: KeyboardEvent) => {
          const editingCell = cellEditorHandler.getEditingCell?.();
          if (
            editingCell &&
            isUmlClassCompartmentCell(editingCell) &&
            evt.keyCode === 13 &&
            !evt.ctrlKey &&
            !evt.shiftKey
          ) {
            return false;
          }
          return defaultIsStopEditingEvent(evt);
        };
      }

      // Once an edit commits, grow/shrink that compartment (and the
      // container) to fit its new line count.
      graph.addListener(InternalEvent.LABEL_CHANGED, (_sender: any, evt: any) => {
        const cell = evt.getProperty('cell');
        if (cell && isUmlClassCompartmentCell(cell)) {
          resizeClassCompartmentToFitText(graph, cell);
        }
      });

      // Dragging a class container's own resize handle needs its
      // (non-resizable) compartments kept in sync with the new bounds.
      graph.addListener(InternalEvent.CELLS_RESIZED, (_sender: any, evt: any) => {
        const resized = evt.getProperty('cells') as any[] | undefined;
        resized?.forEach((cell) => {
          if (isUmlClassContainerCell(cell)) syncClassCompartmentsToContainer(graph, cell);
        });
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
      graph.addListener('click', () => {
        graphDiv.focus();
        setTimeout(handleSelectionChange, 10);
      });

      graph.addListener('cellClick', () => {
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
      // Two-finger pinch zooms around the midpoint between the fingers,
      // keeping whatever's under them fixed on screen (same math as
      // scroll-to-cursor zoom, just driven by touch distance instead of a
      // wheel delta). A single finger is left alone so maxGraph's own
      // touch-as-mouse handling still drives panning/selection/move.
      let pinchStartDistance = 0;
      let pinchStartScale = 1;
      // Raw touchmove fires far more often than the screen can usefully
      // repaint at, and every one of those events was synchronously calling
      // scaleAndTranslate (each triggering a full grid repaint + React zoom-
      // label state update) — that pileup, plus zero smoothing of finger-
      // tremor noise in the raw distance ratio, is what made pinch feel
      // dizzying/jumpy compared to the desktop wheel path (which only gets
      // one coarse step per wheel tick). Coalescing to one applied update per
      // animation frame fixes both: at most 60 view updates/sec no matter how
      // many touchmoves land in between, and each one uses the latest finger
      // positions rather than every intermediate jitter.
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
        if (!touches || touches.length !== 2 || pinchStartDistance <= 0) return;

        const factor = touchDistance(touches) / pinchStartDistance;
        const newScale = Math.min(4, Math.max(0.1, pinchStartScale * factor));

        const rect = graphDiv.getBoundingClientRect();
        const midX = (touches[0].clientX + touches[1].clientX) / 2 - rect.left;
        const midY = (touches[0].clientY + touches[1].clientY) / 2 - rect.top;

        const view = graph.getView();
        const oldScale = view.getScale();
        const oldTranslate = view.getTranslate();

        // Graph-space point currently under the fingers' midpoint, and the
        // translate needed to keep that same point under it at the new scale.
        const graphX = midX / oldScale - oldTranslate.x;
        const graphY = midY / oldScale - oldTranslate.y;
        view.scaleAndTranslate(newScale, midX / newScale - graphX, midY / newScale - graphY);
      };

      graphDiv.addEventListener('touchstart', (e: TouchEvent) => {
        if (e.touches.length === 2) {
          pinchStartDistance = touchDistance(e.touches);
          pinchStartScale = graph.getView().getScale();
        }
      }, { passive: true });

      graphDiv.addEventListener('touchmove', (e: TouchEvent) => {
        if (e.touches.length !== 2 || pinchStartDistance <= 0) return;
        e.preventDefault();
        pendingPinchTouches = e.touches;
        if (pinchRafId === null) {
          pinchRafId = requestAnimationFrame(applyPinchFrame);
        }
      }, { passive: false });

      graphDiv.addEventListener('touchend', (e: TouchEvent) => {
        if (e.touches.length < 2) {
          pinchStartDistance = 0;
          pendingPinchTouches = null;
          if (pinchRafId !== null) {
            cancelAnimationFrame(pinchRafId);
            pinchRafId = null;
          }
        }
      }, { passive: true });

      let spaceDown = false;
      graphDiv.addEventListener('keydown', (e: KeyboardEvent) => {
        if (e.code === 'Space' && !spaceDown) {
          spaceDown = true;
          if (panningHandler) panningHandler.useLeftButtonForPanning = true;
          graphDiv.style.cursor = 'grab';
        }
      });
      graphDiv.addEventListener('keyup', (e: KeyboardEvent) => {
        if (e.code === 'Space') {
          spaceDown = false;
          // Releasing space returns to this platform's baseline, not
          // unconditionally off — mobile's baseline is "always on" (set above).
          if (panningHandler) panningHandler.useLeftButtonForPanning = isMobile;
          graphDiv.style.cursor = 'default';
        }
      });

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

      graphDiv.addEventListener('keydown', (e: KeyboardEvent) => {
        if (e.key === 'Enter') {
          e.stopPropagation();
        }
      });

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
        graphDiv.removeEventListener('keydown', () => { });
        keyHandler.onDestroy();
        if (cleanupClickArrows) cleanupClickArrows();
        if (pinchRafId !== null) cancelAnimationFrame(pinchRafId);
        issueHighlightsRef.current.forEach((h) => h.destroy());
        issueHighlightsRef.current = [];
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
  }, [repaintGrid, resizeGridCanvas, handleDrop, registerShapeStyles, handleSelectionChange, setupHoverUI, setupClickArrows, isMobile]);

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

      {!isMobile && !error && !loading && flowchartIssues.length > 0 && (() => {
        const errorCount = flowchartIssues.filter((i) => i.severity === 'error').length;
        const warningCount = flowchartIssues.length - errorCount;
        return (
          // Top-center, not a corner — the right edge is where the Properties
          // panel docks (and the left edge is where the Shapes panel opens), so
          // either corner gets covered by them. Center stays clear of both.
          <div style={{
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
                gap: 8,
                backgroundColor: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: 20,
                padding: '6px 12px',
                boxShadow: '0 2px 8px rgba(15, 23, 42, 0.08)',
                cursor: 'pointer',
                userSelect: 'none',
              }}
            >
              {errorCount > 0 && (
                <span style={{ fontSize: 12, fontWeight: 700, color: '#ef4444' }}>❌ {errorCount}</span>
              )}
              {warningCount > 0 && (
                <span style={{ fontSize: 12, fontWeight: 700, color: '#f59e0b' }}>⚠️ {warningCount}</span>
              )}
              <span style={{ fontSize: 11, color: '#94a3b8' }}>{showIssuesList ? '▲' : '▼'}</span>
            </div>

            {showIssuesList && (
              <div style={{
                marginTop: 6,
                maxWidth: 320,
                maxHeight: 260,
                overflowY: 'auto',
                backgroundColor: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: 10,
                boxShadow: '0 4px 16px rgba(15, 23, 42, 0.1)',
                padding: 8,
              }}>
                {flowchartIssues.map((issue, i) => (
                  <div
                    key={i}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 8,
                      padding: '6px 8px',
                      borderRadius: 6,
                      cursor: issue.cell ? 'pointer' : 'default',
                    }}
                    onClick={() => {
                      if (!issue.cell) return;
                      graphRef.current?.setSelectionCell(issue.cell);
                      graphRef.current?.scrollCellToVisible(issue.cell);
                    }}
                  >
                    <span style={{ fontSize: 13, marginTop: 1 }}>{issue.severity === 'error' ? '❌' : '⚠️'}</span>
                    <span style={{ fontSize: 12, color: '#334155', lineHeight: 1.4 }}>{issue.message}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })()}

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