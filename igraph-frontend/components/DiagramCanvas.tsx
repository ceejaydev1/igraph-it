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
} from '@maxgraph/core';

import type {
  PanningHandler,
  ConnectionHandler,
  FitPlugin,
  CellStateStyle,
  AlignValue,
  VAlignValue,
  WhiteSpaceValue,
} from '@maxgraph/core';

import { registerAllCustomShapes, IGRAPH_ID_STYLE_MAP, IGRAPH_PERIMETERS } from './maxgraph-custom-shapes';
import { UniversalVertexHandler } from './maxgraph-universal-handler';

// ─── Constants ────────────────────────────────────────────────────────────────

const GRID_SIZE = 10;
const CANVAS_BG = '#f8faff';
const MINOR_COLOR = '#dde3ed';
const MAJOR_COLOR = '#bec8d9';
const MAJOR_EVERY = 5;
const BLACK = '#1a1f36';
const BLUE = '#4c6fff';

const DROP_W = 120;
const DROP_H = 60;
const NEW_SHAPE_SPACING = 160;

const SQUARE_DROP_SHAPES = new Set<string>([
  'igraph.circle',
  'igraph.ellipse',
  'igraph.diamond',
  'igraph.doubleRhombus',
  'igraph.multiOval',
  'igraph.hexagon',
  'igraph.pentagon',
  'igraph.umlUseCase',
  'igraph.umlDecision',
  'igraph.umlInitialNode',
  'igraph.initialNode',
  'igraph.finalNode',
  'igraph.umlActivityFinal',
  'igraph.umlFlowFinal',
  'igraph.dfdProcess',
  'igraph.dfdOnPage',
  'igraph.attribute',
  'igraph.primaryKey',
  'igraph.derivedAttr',
  'igraph.compositeAttr',
  'igraph.multiAttr',
  'igraph.erdAttribute',
  'igraph.erdMultivaluedAttribute',
  'igraph.erdDerivedAttribute',
  'igraph.relationship',
  'igraph.identifyingRel',
  'igraph.erdRelationship',
  'igraph.erdIdentifyingRelationship',
  'igraph.crowOne',
  'igraph.crowZeroOne',
]);

function getDropSize(styleKey: string): { w: number; h: number } {
  if (SQUARE_DROP_SHAPES.has(styleKey)) {
    return { w: 80, h: 80 };
  }
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

function getShapeStyle(styleKey: string): CellStateStyle {
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
      fillColor: 'transparent',
      strokeColor: BLACK,
      strokeWidth: 2,
    },
    'igraph.fdd.mechanism': {
      shape: 'igraph.fdd.mechanism',
      fillColor: 'transparent',
      strokeColor: BLACK,
      strokeWidth: 2,
    },
    'igraph.fdd.interface': {
      shape: 'igraph.fdd.interface',
      fillColor: 'transparent',
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
  };

  // Merge base with special style if it exists
  const special = specialStyles[styleKey] || {};
  const perimeter = IGRAPH_PERIMETERS[styleKey];
  return { ...base, ...special, ...(perimeter ? { perimeter } : {}) };
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

  const onReadyRef = useRef(onReady);
  const onChangeRef = useRef(onChange);
  const onSelectionChangeRef = useRef(onSelectionChange);
  const onZoomChangeRef = useRef(onZoomChange);

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
    const { w: dropW, h: dropH } = getDropSize(styleKey);

    const { x, y } = clientToGraphCoords(graph, e.clientX, e.clientY, graphDiv);

    const cx = Math.round((x - dropW / 2) / GRID_SIZE) * GRID_SIZE;
    const cy = Math.round((y - dropH / 2) / GRID_SIZE) * GRID_SIZE;

    try {
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

      const cell = graph.insertVertex(
        null,
        null,
        '',
        cx,
        cy,
        dropW,
        dropH,
        fullStyle,
      );

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

          const style = cell.getStyle();
          const styleObj = typeof style === 'string' ? {} : style;
          
          // Rotate the direction to match where the arrow is actually drawn
          // (rotated with the shape), not the shape's unrotated local axes.
          const rotatedDir = rotateVector(dir.dx, dir.dy, rotation);
          const newX = geo.x + rotatedDir.x * (geo.width / 2 + NEW_SHAPE_SPACING / scale);
          const newY = geo.y + rotatedDir.y * (geo.height / 2 + NEW_SHAPE_SPACING / scale);

          const roundedX = Math.round(newX / GRID_SIZE) * GRID_SIZE;
          const roundedY = Math.round(newY / GRID_SIZE) * GRID_SIZE;

          // Use the same style as the original cell
          const newShapeKey = styleObj.shape || 'igraph.rectangle';
          const newShapePerimeter = IGRAPH_PERIMETERS[newShapeKey];
          const shapeStyle: CellStateStyle = {
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

          const newCell = graph.insertVertex(
            null,
            null,
            '',
            roundedX,
            roundedY,
            geo.width,
            geo.height,
            shapeStyle,
          );

          const edgeStyle = {
            strokeColor: BLACK,
            strokeWidth: 2,
            edgeStyle: 'orthogonalEdgeStyle',
          };

          graph.insertEdge(
            null,
            null,
            '',
            cell,
            newCell,
            edgeStyle,
          );

          graph.clearSelection();
          setTimeout(() => {
            graph.setSelectionCell(newCell);
            handleSelectionChange();
            removeArrowButtons();
          }, 10);

          console.log(`✅ Created new shape ${dir.label} of selected cell`);
        });

        container.appendChild(div);
        arrowDivs.push(div);
      });

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

      graph.getSelectionModel().addListener(InternalEvent.CHANGE, () => {
        handleSelectionChange();
      });

      graph.addListener('click', () => {
        setTimeout(handleSelectionChange, 10);
      });

      graph.addListener('cellClick', () => {
        setTimeout(handleSelectionChange, 10);
      });

      const panningHandler = graph.getPlugin('PanningHandler') as PanningHandler | null;
      const fitPlugin = graph.getPlugin('FitPlugin') as FitPlugin | null;

      if (panningHandler) {
        panningHandler.useLeftButtonForPanning = false;
        panningHandler.ignoreCell = false;
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

      const touchDistance = (touches: TouchList) => {
        const dx = touches[0].clientX - touches[1].clientX;
        const dy = touches[0].clientY - touches[1].clientY;
        return Math.sqrt(dx * dx + dy * dy);
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

        const factor = touchDistance(e.touches) / pinchStartDistance;
        const newScale = Math.min(4, Math.max(0.1, pinchStartScale * factor));

        const rect = graphDiv.getBoundingClientRect();
        const midX = (e.touches[0].clientX + e.touches[1].clientX) / 2 - rect.left;
        const midY = (e.touches[0].clientY + e.touches[1].clientY) / 2 - rect.top;

        const view = graph.getView();
        const oldScale = view.getScale();
        const oldTranslate = view.getTranslate();

        // Graph-space point currently under the fingers' midpoint, and the
        // translate needed to keep that same point under it at the new scale.
        const graphX = midX / oldScale - oldTranslate.x;
        const graphY = midY / oldScale - oldTranslate.y;
        view.scaleAndTranslate(newScale, midX / newScale - graphX, midY / newScale - graphY);
      }, { passive: false });

      graphDiv.addEventListener('touchend', (e: TouchEvent) => {
        if (e.touches.length < 2) pinchStartDistance = 0;
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
          if (panningHandler) panningHandler.useLeftButtonForPanning = false;
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
      }, 150));

      repaintGrid();

      console.log('✅ maxGraph ready with BLACK edges + BLUE selection + click arrows');
      onReadyRef.current?.(graph);
      if (!destroyed) setLoading(false);

      return () => {
        destroyed = true;
        timers.forEach(clearTimeout);
        ro.disconnect();
        dropTarget.removeEventListener('dragover', onDragOver);
        dropTarget.removeEventListener('dragleave', onDragLeave);
        dropTarget.removeEventListener('drop', onDrop);
        graphDiv.removeEventListener('keydown', () => { });
        keyHandler.onDestroy();
        if (cleanupClickArrows) cleanupClickArrows();
        graph.destroy();
        graphRef.current = null;
      };
    } catch (err: any) {
      console.error('❌ maxGraph init error:', err);
      setError(err.message || 'Failed to load diagram editor');
      setLoading(false);
      return undefined;
    }
  }, [repaintGrid, resizeGridCanvas, handleDrop, registerShapeStyles, handleSelectionChange, setupHoverUI, setupClickArrows]);

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