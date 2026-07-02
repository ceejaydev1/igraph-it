// components/DiagramCanvas.tsx — FULL UPDATED CODE with draw.io-style selection

import React, { useEffect, useRef, useCallback, useState } from 'react';
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

// ── Import custom shape registration ────────────────────────────────────
import { registerAllCustomShapes, IGRAPH_ID_STYLE_MAP } from './maxgraph-custom-shapes';
// ── Import Universal Vertex Handler ─────────────────────────────────────
import { UniversalVertexHandler } from './maxgraph-universal-handler';

// ─── Constants ────────────────────────────────────────────────────────────────

const GRID_SIZE   = 10;
const CANVAS_BG   = '#f8faff';
const MINOR_COLOR = '#dde3ed';
const MAJOR_COLOR = '#bec8d9';
const MAJOR_EVERY = 5;

const DROP_W = 120;
const DROP_H = 60;

// ─────────────────────────────────────────────────────────────────────────
// Shapes whose selection box must be a square, not a 120×60 rectangle.
// A circle/diamond/etc. drawn inside a wide rectangle only fills the short
// dimension, leaving visible "extra" selection box on the sides — this is
// what fixes that, matching draw.io's default drop sizes per shape type.
// ─────────────────────────────────────────────────────────────────────────
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

// ════════════════════════════════════════════════════════════════════════════
// ⭐ INJECT HANDLE STYLES - Ensures blue handles override maxGraph defaults
// ════════════════════════════════════════════════════════════════════════════

const injectHandleStyles = () => {
  if (typeof document === 'undefined') return;
  
  const styleId = 'igraph-handle-styles';
  if (document.getElementById(styleId)) return;
  
  const style = document.createElement('style');
  style.id = styleId;
  style.textContent = `
    /* Force blue handles - using correct maxGraph class names */
    .mxHandle,
    .mxHandle div,
    div.mxHandle {
      background-color: #4c6fff !important;
      border-color: #4c6fff !important;
      border-radius: 50% !important;
      width: 8px !important;
      height: 8px !important;
      border: 1.5px solid #4c6fff !important;
      background: #ffffff !important;
      box-sizing: border-box !important;
      position: absolute !important;
      box-shadow: none !important;
      margin: 0 !important;
      padding: 0 !important;
    }
    
    /* Position handles at exact shape boundaries */
    .mxHandleNorth,
    div.mxHandleNorth {
      top: -4px !important;
      left: 50% !important;
      margin-left: -4px !important;
      margin-top: 0 !important;
    }
    .mxHandleSouth,
    div.mxHandleSouth {
      bottom: -4px !important;
      left: 50% !important;
      margin-left: -4px !important;
      margin-top: 0 !important;
    }
    .mxHandleEast,
    div.mxHandleEast {
      right: -4px !important;
      top: 50% !important;
      margin-top: -4px !important;
      margin-left: 0 !important;
    }
    .mxHandleWest,
    div.mxHandleWest {
      left: -4px !important;
      top: 50% !important;
      margin-top: -4px !important;
      margin-left: 0 !important;
    }
    .mxHandleNorthEast,
    div.mxHandleNorthEast {
      top: -4px !important;
      right: -4px !important;
    }
    .mxHandleNorthWest,
    div.mxHandleNorthWest {
      top: -4px !important;
      left: -4px !important;
    }
    .mxHandleSouthEast,
    div.mxHandleSouthEast {
      bottom: -4px !important;
      right: -4px !important;
    }
    .mxHandleSouthWest,
    div.mxHandleSouthWest {
      bottom: -4px !important;
      left: -4px !important;
    }
    
    /* Selection border - dashed like draw.io */
    .mxSelectionBorder {
      border-color: #4c6fff !important;
      border-style: dashed !important;
      border-width: 1.5px !important;
    }
    
    /* Rubber band */
    .mxRubberband {
      border-color: #4c6fff !important;
      background: rgba(76, 111, 255, 0.1) !important;
      border-style: solid !important;
      border-width: 1px !important;
    }
  `;
  document.head.appendChild(style);
  console.log('🎨 Injected draw.io-style handle styles');
};

// Inject styles immediately
if (Platform.OS === 'web') {
  injectHandleStyles();
}

// ════════════════════════════════════════════════════════════════════════════
// ⭐ CRITICAL: Configure selection handles BEFORE any Graph is created
// ════════════════════════════════════════════════════════════════════════════

// Set handle colors to blue (#4c6fff)
HandleConfig.fillColor = '#4c6fff';
HandleConfig.strokeColor = '#4c6fff';
HandleConfig.size = 8;

// Configure vertex selection styling - dashed like draw.io
VertexHandlerConfig.selectionColor = '#4c6fff';
VertexHandlerConfig.selectionDashed = true;
VertexHandlerConfig.selectionStrokeWidth = 1.5;

// Configure edge selection styling
EdgeHandlerConfig.selectionColor = '#4c6fff';
EdgeHandlerConfig.selectionDashed = true;
EdgeHandlerConfig.selectionStrokeWidth = 1.5;

console.log('🎨 Selection handle config set to draw.io style (dashed, blue, circular handles)');

// ════════════════════════════════════════════════════════════════════════════
// ⭐ Register shapes BEFORE any Graph is created
// ════════════════════════════════════════════════════════════════════════════
if (Platform.OS === 'web') {
  registerAllCustomShapes();
  console.log('✅ All custom shapes registered with maxGraph');
}

// ─── Grid painter ─────────────────────────────────────────────────────────────

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
  const offsetX   = ((tx.x % majorSize) + majorSize) % majorSize;
  const offsetY   = ((tx.y % majorSize) + majorSize) % majorSize;

  ctx.beginPath();
  ctx.strokeStyle = MINOR_COLOR;
  ctx.lineWidth   = 0.5;
  for (let x = offsetX; x <= W; x += minorSize) { ctx.moveTo(x, 0); ctx.lineTo(x, H); }
  for (let y = offsetY; y <= H; y += minorSize) { ctx.moveTo(0, y); ctx.lineTo(W, y); }
  ctx.stroke();

  ctx.beginPath();
  ctx.strokeStyle = MAJOR_COLOR;
  ctx.lineWidth   = 1;
  for (let x = offsetX; x <= W; x += minorSize) {
    if (Math.round((x - offsetX) / minorSize) % MAJOR_EVERY === 0) {
      ctx.moveTo(x, 0); ctx.lineTo(x, H);
    }
  }
  for (let y = offsetY; y <= H; y += minorSize) {
    if (Math.round((y - offsetY) / minorSize) % MAJOR_EVERY === 0) {
      ctx.moveTo(0, y); ctx.lineTo(W, y);
    }
  }
  ctx.stroke();
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function clientToGraphCoords(
  graph: Graph,
  clientX: number,
  clientY: number,
  containerEl: HTMLElement,
): { x: number; y: number } {
  const rect      = containerEl.getBoundingClientRect();
  const scale     = graph.getView().getScale();
  const translate = graph.getView().getTranslate();

  const x = (clientX - rect.left) / scale - translate.x;
  const y = (clientY - rect.top)  / scale - translate.y;

  return { x, y };
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface DiagramCanvasProps {
  onReady?: (graph: any) => void;
  onChange?: (xml: string) => void;
  onSelectionChange?: (cell: any) => void;
  umlType?: string;
}

// ─── WebCanvas ────────────────────────────────────────────────────────────────

const WebCanvas = ({ onReady, onChange, onSelectionChange, umlType = 'flowchart' }: DiagramCanvasProps) => {
  const wrapperRef    = useRef<HTMLDivElement>(null);
  const gridCanvasRef = useRef<HTMLCanvasElement>(null);
  const graphDivRef   = useRef<HTMLDivElement>(null);
  const graphRef      = useRef<Graph | null>(null);

  const [isDragOver, setIsDragOver] = useState(false);
  const [error,      setError]      = useState<string | null>(null);
  const [loading,    setLoading]    = useState(true);
  const [selectedCell, setSelectedCell] = useState<any>(null);

  const onReadyRef  = useRef(onReady);
  const onChangeRef = useRef(onChange);
  const onSelectionChangeRef = useRef(onSelectionChange);
  
  useEffect(() => { onReadyRef.current  = onReady;  }, [onReady]);
  useEffect(() => { onChangeRef.current = onChange; }, [onChange]);
  useEffect(() => { onSelectionChangeRef.current = onSelectionChange; }, [onSelectionChange]);

  const resizeGridCanvas = useCallback(() => {
    const wrapper = wrapperRef.current;
    const gc      = gridCanvasRef.current;
    if (!wrapper || !gc) return;
    gc.width  = wrapper.offsetWidth;
    gc.height = wrapper.offsetHeight;
  }, []);

  const repaintGrid = useCallback(() => {
    const gc    = gridCanvasRef.current;
    const graph = graphRef.current;
    if (!gc || !graph) return;
    paintGridOnCanvas(gc, graph.getView().getScale(), graph.getView().getTranslate());
  }, []);

  // ─── Selection change handler ──────────────────────────────────────────────

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

  // ─── Register stylesheet entries ────────────────────────────────────────────
  const registerShapeStyles = useCallback((graph: Graph) => {
    const stylesheet = graph.getStylesheet();

    const base: CellStateStyle = {
      fillColor:     '#ffffff',
      strokeColor:   '#1a1f36',
      strokeWidth:   2,
      fontColor:     '#1a1f36',
      fontSize:      12,
      align:         'center' as AlignValue,
      verticalAlign: 'middle' as VAlignValue,
    };

    const styles: Record<string, CellStateStyle> = {
      // ─── FDD Shapes ──────────────────────────────────────────────────────
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
        strokeColor: '#000000',
        strokeWidth: 2,
      },
      'igraph.fdd.mechanism': { 
        ...base, 
        shape: 'igraph.fdd.mechanism',
        strokeColor: '#000000',
        strokeWidth: 2,
      },
      'igraph.fdd.interface': { 
        ...base, 
        shape: 'igraph.fdd.interface',
        strokeColor: '#000000',
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
      
      // ─── DFD Shapes ──────────────────────────────────────────────────────
      'igraph.dfdProcess': { 
        ...base, 
        shape: 'igraph.dfdProcess',
        fillColor: '#ffffff',
        strokeColor: '#1a1f36',
        strokeWidth: 2,
      },
      'igraph.dfdDataFlow': { 
        ...base, 
        shape: 'igraph.dfdDataFlow',
        fillColor: 'transparent',
        strokeColor: '#1a1f36',
        strokeWidth: 2,
      },
      'igraph.dfdDataStore': { 
        ...base, 
        shape: 'igraph.dfdDataStore',
        fillColor: 'transparent',
        strokeColor: '#1a1f36',
        strokeWidth: 2,
      },
      'igraph.dfdDataStoreGS': { 
        ...base, 
        shape: 'igraph.dfdDataStoreGS',
        fillColor: '#ffffff',
        strokeColor: '#1a1f36',
        strokeWidth: 2,
      },
      'igraph.dfdExternalEntity': { 
        ...base, 
        shape: 'igraph.dfdExternalEntity',
        fillColor: '#ffffff',
        strokeColor: '#1a1f36',
        strokeWidth: 2,
      },
      'igraph.dfdBidirectional': { 
        ...base, 
        shape: 'igraph.dfdBidirectional',
        fillColor: 'transparent',
        strokeColor: '#1a1f36',
        strokeWidth: 2,
      },
      'igraph.dfdBoundary': { 
        ...base, 
        shape: 'igraph.dfdBoundary',
        fillColor: 'transparent',
        strokeColor: '#1a1f36',
        strokeWidth: 2,
      },
      'igraph.dfdNote': { 
        ...base, 
        shape: 'igraph.dfdNote',
        fillColor: '#fef9c3',
        strokeColor: '#1a1f36',
        strokeWidth: 2,
      },
      'igraph.dfdOnPage': { 
        ...base, 
        shape: 'igraph.dfdOnPage',
        fillColor: '#ffffff',
        strokeColor: '#1a1f36',
        strokeWidth: 2,
      },
      'igraph.dfdOffPage': { 
        ...base, 
        shape: 'igraph.dfdOffPage',
        fillColor: '#ffffff',
        strokeColor: '#1a1f36',
        strokeWidth: 2,
      },

      // ─── Fishbone Shapes ──────────────────────────────────────────────
      'igraph.fishboneSpine': { 
        ...base, 
        shape: 'igraph.fishboneSpine',
        fillColor: 'transparent',
        strokeColor: '#1a1f36',
        strokeWidth: 2,
      },
      'igraph.fishboneHead': { 
        ...base, 
        shape: 'igraph.fishboneHead',
        fillColor: '#ffffff',
        strokeColor: '#1a1f36',
        strokeWidth: 2,
      },
      'igraph.fishboneProblem': { 
        ...base, 
        shape: 'igraph.fishboneProblem',
        fillColor: 'transparent',
        strokeColor: '#1a1f36',
        strokeWidth: 2,
      },
      'igraph.fishboneCauseTop': { 
        ...base, 
        shape: 'igraph.fishboneCauseTop',
        fillColor: 'transparent',
        strokeColor: '#1a1f36',
        strokeWidth: 2,
      },
      'igraph.fishboneCauseBottom': { 
        ...base, 
        shape: 'igraph.fishboneCauseBottom',
        fillColor: 'transparent',
        strokeColor: '#1a1f36',
        strokeWidth: 2,
      },
      'igraph.fishboneSubCauseTop': { 
        ...base, 
        shape: 'igraph.fishboneSubCauseTop',
        fillColor: 'transparent',
        strokeColor: '#1a1f36',
        strokeWidth: 2,
      },
      'igraph.fishboneSubCauseBottom': { 
        ...base, 
        shape: 'igraph.fishboneSubCauseBottom',
        fillColor: 'transparent',
        strokeColor: '#1a1f36',
        strokeWidth: 2,
      },
      'igraph.fishboneTertiary': { 
        ...base, 
        shape: 'igraph.fishboneTertiary',
        fillColor: 'transparent',
        strokeColor: '#1a1f36',
        strokeWidth: 1.5,
      },
      'igraph.fishboneArrow': { 
        ...base, 
        shape: 'igraph.fishboneArrow',
        fillColor: '#1a1f36',
        strokeColor: '#1a1f36',
        strokeWidth: 2,
      },
      'igraph.fishboneDashedArrow': { 
        ...base, 
        shape: 'igraph.fishboneDashedArrow',
        fillColor: '#1a1f36',
        strokeColor: '#1a1f36',
        strokeWidth: 2,
      },
      'igraph.fishboneCategory': { 
        ...base, 
        shape: 'igraph.fishboneCategory',
        fillColor: '#ffffff',
        strokeColor: '#1a1f36',
        strokeWidth: 2,
      },
      'igraph.fishboneBubble': { 
        ...base, 
        shape: 'igraph.fishboneBubble',
        fillColor: '#ffffff',
        strokeColor: '#1a1f36',
        strokeWidth: 2,
      },
      'igraph.fishboneNote': { 
        ...base, 
        shape: 'igraph.fishboneNote',
        fillColor: '#fef9c3',
        strokeColor: '#1a1f36',
        strokeWidth: 2,
      },

      // ─── Schematic Shapes ──────────────────────────────────────────────
      'igraph.schematicBattery': { 
        ...base, 
        shape: 'igraph.schematicBattery',
        fillColor: 'transparent',
        strokeColor: '#1a1f36',
        strokeWidth: 2,
      },
      'igraph.schematicAC': { 
        ...base, 
        shape: 'igraph.schematicAC',
        fillColor: 'transparent',
        strokeColor: '#1a1f36',
        strokeWidth: 2,
      },
      'igraph.schematicGround': { 
        ...base, 
        shape: 'igraph.schematicGround',
        fillColor: 'transparent',
        strokeColor: '#1a1f36',
        strokeWidth: 2,
      },
      'igraph.schematicResistor': { 
        ...base, 
        shape: 'igraph.schematicResistor',
        fillColor: 'transparent',
        strokeColor: '#1a1f36',
        strokeWidth: 2,
      },
      'igraph.schematicVariableResistor': { 
        ...base, 
        shape: 'igraph.schematicVariableResistor',
        fillColor: 'transparent',
        strokeColor: '#1a1f36',
        strokeWidth: 2,
      },
      'igraph.schematicCapacitor': { 
        ...base, 
        shape: 'igraph.schematicCapacitor',
        fillColor: 'transparent',
        strokeColor: '#1a1f36',
        strokeWidth: 2,
      },
      'igraph.schematicInductor': { 
        ...base, 
        shape: 'igraph.schematicInductor',
        fillColor: 'transparent',
        strokeColor: '#1a1f36',
        strokeWidth: 2,
      },
      'igraph.schematicDiode': { 
        ...base, 
        shape: 'igraph.schematicDiode',
        fillColor: '#ffffff',
        strokeColor: '#1a1f36',
        strokeWidth: 2,
      },
      'igraph.schematicLED': { 
        ...base, 
        shape: 'igraph.schematicLED',
        fillColor: '#ffffff',
        strokeColor: '#1a1f36',
        strokeWidth: 2,
      },
      'igraph.schematicNPN': { 
        ...base, 
        shape: 'igraph.schematicNPN',
        fillColor: 'transparent',
        strokeColor: '#1a1f36',
        strokeWidth: 2,
      },
      'igraph.schematicSwitch': { 
        ...base, 
        shape: 'igraph.schematicSwitch',
        fillColor: 'transparent',
        strokeColor: '#1a1f36',
        strokeWidth: 2,
      },
      'igraph.schematicFuse': { 
        ...base, 
        shape: 'igraph.schematicFuse',
        fillColor: '#ffffff',
        strokeColor: '#1a1f36',
        strokeWidth: 2,
      },
      'igraph.schematicConnection': { 
        ...base, 
        shape: 'igraph.schematicConnection',
        fillColor: '#1a1f36',
        strokeColor: '#1a1f36',
        strokeWidth: 2,
      },
      'igraph.schematicNoConnection': { 
        ...base, 
        shape: 'igraph.schematicNoConnection',
        fillColor: 'transparent',
        strokeColor: '#1a1f36',
        strokeWidth: 2,
      },

      // ─── Use Case Shapes ──────────────────────────────────────────────
      'igraph.umlInclude': { 
        ...base, 
        shape: 'igraph.umlInclude',
        fillColor: '#1a1f36',
        strokeColor: '#1a1f36',
        strokeWidth: 2,
      },
      'igraph.umlExtend': { 
        ...base, 
        shape: 'igraph.umlExtend',
        fillColor: '#1a1f36',
        strokeColor: '#1a1f36',
        strokeWidth: 2,
      },

      // ─── Activity Shapes ──────────────────────────────────────────────
      'igraph.umlInitialNode': { 
        ...base, 
        shape: 'igraph.umlInitialNode',
        fillColor: '#1a1f36',
        strokeColor: '#1a1f36',
        strokeWidth: 2,
      },
      'igraph.umlMerge': { 
        ...base, 
        shape: 'igraph.umlMerge',
        fillColor: '#1a1f36',
        strokeColor: '#1a1f36',
        strokeWidth: 2,
      },
      'igraph.umlFork': { 
        ...base, 
        shape: 'igraph.umlFork',
        fillColor: '#1a1f36',
        strokeColor: '#1a1f36',
        strokeWidth: 2,
      },
      'igraph.umlControlFlow': { 
        ...base, 
        shape: 'igraph.umlControlFlow',
        fillColor: '#1a1f36',
        strokeColor: '#1a1f36',
        strokeWidth: 2,
      },
      'igraph.umlObjectFlow': { 
        ...base, 
        shape: 'igraph.umlObjectFlow',
        fillColor: '#1a1f36',
        strokeColor: '#1a1f36',
        strokeWidth: 2,
      },
      'igraph.umlActivityFinal': { 
        ...base, 
        shape: 'igraph.umlActivityFinal',
        fillColor: '#1a1f36',
        strokeColor: '#1a1f36',
        strokeWidth: 2,
      },
      'igraph.umlFlowFinal': { 
        ...base, 
        shape: 'igraph.umlFlowFinal',
        fillColor: 'transparent',
        strokeColor: '#1a1f36',
        strokeWidth: 2,
      },

      // ─── Sequence Shapes ──────────────────────────────────────────────
      'igraph.umlSyncMsg': { 
        ...base, 
        shape: 'igraph.umlSyncMsg',
        fillColor: '#1a1f36',
        strokeColor: '#1a1f36',
        strokeWidth: 2,
      },
      'igraph.umlAsyncMsg': { 
        ...base, 
        shape: 'igraph.umlAsyncMsg',
        fillColor: 'transparent',
        strokeColor: '#1a1f36',
        strokeWidth: 2,
      },

      // ─── Class Shapes ──────────────────────────────────────────────────
      'igraph.umlComposition': { 
        ...base, 
        shape: 'igraph.umlComposition',
        fillColor: '#1a1f36',
        strokeColor: '#1a1f36',
        strokeWidth: 2,
      },

      // ─── Standard Shapes ─────────────────────────────────────────────────
      'igraph.rectangle':        { ...base, shape: 'igraph.rectangle' },
      'igraph.roundedRectangle': { ...base, shape: 'igraph.roundedRectangle' },
      'igraph.ellipse':          { ...base, shape: 'igraph.ellipse' },
      'igraph.diamond':          { ...base, shape: 'igraph.diamond' },
      'igraph.triangle':         { ...base, shape: 'igraph.triangle' },
      'igraph.parallelogram':    { ...base, shape: 'igraph.parallelogram' },
      'igraph.cylinder':         { ...base, shape: 'igraph.cylinder' },
      'igraph.note':             { ...base, shape: 'igraph.note', fillColor: '#fef9c3' },
      'igraph.cloud':            { ...base, shape: 'igraph.cloud', fillColor: '#e0f2fe' },
      'igraph.doubleRectangle':  { ...base, shape: 'igraph.doubleRectangle' },
      'igraph.doubleRhombus':    { ...base, shape: 'igraph.doubleRhombus' },
      'igraph.multiOval':        { ...base, shape: 'igraph.multiOval' },
      'igraph.line':             { ...base, shape: 'igraph.line' },
      'igraph.text':             { ...base, shape: 'igraph.text' },
      'igraph.dashedRect':       { ...base, shape: 'igraph.dashedRect' },
      'igraph.predefined':       { ...base, shape: 'igraph.predefined' },
      'igraph.actor':         { ...base, shape: 'igraph.actor' },
      'igraph.initialNode':   { ...base, shape: 'igraph.initialNode', fillColor: '#1a1f36', strokeColor: '#1a1f36' },
      'igraph.finalNode':     { ...base, shape: 'igraph.finalNode' },
      'igraph.forkJoin':      { ...base, shape: 'igraph.forkJoin', fillColor: '#1a1f36', strokeColor: '#1a1f36' },
      'igraph.lifeline':      { ...base, shape: 'igraph.lifeline' },
      'igraph.activation':    { ...base, shape: 'igraph.activation' },
      'igraph.classBox':      { ...base, shape: 'igraph.classBox' },
      'igraph.interface':     { ...base, shape: 'igraph.interface' },
      'igraph.abstractClass': { ...base, shape: 'igraph.abstractClass' },
      'igraph.entity':               { ...base, shape: 'igraph.entity' },
      'igraph.weakEntity':           { ...base, shape: 'igraph.weakEntity' },
      'igraph.attribute':            { ...base, shape: 'igraph.attribute' },
      'igraph.primaryKey':           { ...base, shape: 'igraph.primaryKey' },
      'igraph.derivedAttr':          { ...base, shape: 'igraph.derivedAttr' },
      'igraph.compositeAttr':        { ...base, shape: 'igraph.compositeAttr' },
      'igraph.multiAttr':            { ...base, shape: 'igraph.multiAttr' },
      'igraph.relationship':         { ...base, shape: 'igraph.relationship' },
      'igraph.identifyingRel':       { ...base, shape: 'igraph.identifyingRel' },
      'igraph.cardinality':          { ...base, shape: 'igraph.cardinality' },
      'igraph.crowOne':              { ...base, shape: 'igraph.crowOne' },
      'igraph.crowZeroOne':          { ...base, shape: 'igraph.crowZeroOne' },
      'igraph.crowZeroMany':         { ...base, shape: 'igraph.crowZeroMany' },
      'igraph.crowOneMany':          { ...base, shape: 'igraph.crowOneMany' },
      'igraph.crowMany':             { ...base, shape: 'igraph.crowMany' },
      'igraph.totalParticipation':   { ...base, shape: 'igraph.totalParticipation' },
      'igraph.partialParticipation': { ...base, shape: 'igraph.partialParticipation' },
      'igraph.erdConnector':         { ...base, shape: 'igraph.erdConnector' },
      'igraph.arrow':           { ...base, shape: 'igraph.arrow' },
      'igraph.arrowDown':       { ...base, shape: 'igraph.arrowDown' },
      'igraph.arrowRight':      { ...base, shape: 'igraph.arrowRight' },
      'igraph.filledArrow':     { ...base, shape: 'igraph.filledArrow' },
      'igraph.openArrow':       { ...base, shape: 'igraph.openArrow' },
      'igraph.dashedArrow':     { ...base, shape: 'igraph.dashedArrow' },
      'igraph.dashedArrowBack': { ...base, shape: 'igraph.dashedArrowBack' },
      'igraph.triangleArrow':   { ...base, shape: 'igraph.triangleArrow' },
      'igraph.loopArrow':       { ...base, shape: 'igraph.loopArrow' },
      'igraph.createArrow':     { ...base, shape: 'igraph.createArrow' },
      'igraph.destruction':     { ...base, shape: 'igraph.destruction' },
      'igraph.aggregation':     { ...base, shape: 'igraph.aggregation' },
      'igraph.composition':     { ...base, shape: 'igraph.composition', fillColor: '#1a1f36' },
      'igraph.multiplicity':    { ...base, shape: 'igraph.multiplicity' },
      'igraph.arrowDiag':       { ...base, shape: 'igraph.arrowDiag' },
      'igraph.arrowSmall':      { ...base, shape: 'igraph.arrowSmall' },
      'igraph.resistor':    { ...base, shape: 'igraph.resistor' },
      'igraph.capacitor':   { ...base, shape: 'igraph.capacitor' },
      'igraph.inductor':    { ...base, shape: 'igraph.inductor' },
      'igraph.voltage':     { ...base, shape: 'igraph.voltage' },
      'igraph.ground':      { ...base, shape: 'igraph.ground' },
      'igraph.diode':       { ...base, shape: 'igraph.diode' },
      'igraph.transistor':  { ...base, shape: 'igraph.transistor' },
      'igraph.ic':          { ...base, shape: 'igraph.ic' },
      'igraph.opamp':       { ...base, shape: 'igraph.opamp' },
      'igraph.switch':      { ...base, shape: 'igraph.switch' },
      'igraph.fuse':        { ...base, shape: 'igraph.fuse' },
      'igraph.transformer': { ...base, shape: 'igraph.transformer' },
      'igraph.pentagon':    { ...base, shape: 'igraph.pentagon' },
      'igraph.trapezoid':   { ...base, shape: 'igraph.trapezoid' },
      'igraph.dshape':      { ...base, shape: 'igraph.dshape' },
      'igraph.hexagon':     { ...base, shape: 'igraph.hexagon' },
      'igraph.display':     { ...base, shape: 'igraph.display' },
      'igraph.annotation':  { ...base, shape: 'igraph.annotation' },
      'igraph.ucActor':         { ...base, shape: 'igraph.ucActor' },
      'igraph.umlUseCase':      { ...base, shape: 'igraph.umlUseCase' },
      'igraph.umlSystemBoundary': { ...base, shape: 'igraph.umlSystemBoundary' },
      'igraph.umlAssociation':  { ...base, shape: 'igraph.umlAssociation' },
      'igraph.umlGeneralization': { ...base, shape: 'igraph.umlGeneralization' },
      'igraph.umlNote':         { ...base, shape: 'igraph.umlNote', fillColor: '#fef9c3' },
      'igraph.umlNoteConnector': { ...base, shape: 'igraph.umlNoteConnector' },
      'igraph.umlIncludeLabel': { ...base, shape: 'igraph.umlIncludeLabel' },
      'igraph.umlExtendLabel':  { ...base, shape: 'igraph.umlExtendLabel' },
      'igraph.umlActivity':     { ...base, shape: 'igraph.umlActivity' },
      'igraph.umlDecision':     { ...base, shape: 'igraph.umlDecision' },
      'igraph.umlSwimlane':     { ...base, shape: 'igraph.umlSwimlane' },
      'igraph.umlConstraint':   { ...base, shape: 'igraph.umlConstraint' },
      'igraph.umlLifeline':     { ...base, shape: 'igraph.umlLifeline' },
      'igraph.umlActivation':   { ...base, shape: 'igraph.umlActivation' },
      'igraph.umlDestroy':      { ...base, shape: 'igraph.umlDestroy' },
      'igraph.umlReturnMsg':    { ...base, shape: 'igraph.umlReturnMsg' },
      'igraph.umlAlt':          { ...base, shape: 'igraph.umlAlt' },
      'igraph.umlOpt':          { ...base, shape: 'igraph.umlOpt' },
      'igraph.umlLoop':         { ...base, shape: 'igraph.umlLoop' },
      'igraph.umlPar':          { ...base, shape: 'igraph.umlPar' },
      'igraph.umlBreak':        { ...base, shape: 'igraph.umlBreak' },
      'igraph.umlClass':        { ...base, shape: 'igraph.umlClass' },
      'igraph.umlDirectedAssociation': { ...base, shape: 'igraph.umlDirectedAssociation' },
      'igraph.umlAggregation':  { ...base, shape: 'igraph.umlAggregation' },
      'igraph.umlDependency':   { ...base, shape: 'igraph.umlDependency' },
      'igraph.umlMultiplicity1': { ...base, shape: 'igraph.umlMultiplicity1' },
      'igraph.umlMultiplicity01': { ...base, shape: 'igraph.umlMultiplicity01' },
      'igraph.umlMultiplicityMany': { ...base, shape: 'igraph.umlMultiplicityMany' },
      'igraph.umlMultiplicity1Many': { ...base, shape: 'igraph.umlMultiplicity1Many' },
      'igraph.umlMultiplicityRange': { ...base, shape: 'igraph.umlMultiplicityRange' },
      'igraph.umlMultiplicityN': { ...base, shape: 'igraph.umlMultiplicityN' },
      'igraph.erdEntity':       { ...base, shape: 'igraph.erdEntity' },
      'igraph.erdWeakEntity':   { ...base, shape: 'igraph.erdWeakEntity' },
      'igraph.erdRelationship': { ...base, shape: 'igraph.erdRelationship' },
      'igraph.erdIdentifyingRelationship': { ...base, shape: 'igraph.erdIdentifyingRelationship' },
      'igraph.erdAttribute':    { ...base, shape: 'igraph.erdAttribute' },
      'igraph.erdMultivaluedAttribute': { ...base, shape: 'igraph.erdMultivaluedAttribute' },
      'igraph.erdDerivedAttribute': { ...base, shape: 'igraph.erdDerivedAttribute' },
      'igraph.erdCardinality11': { ...base, shape: 'igraph.erdCardinality11' },
      'igraph.erdCardinality1N': { ...base, shape: 'igraph.erdCardinality1N' },
      'igraph.erdCardinalityN1': { ...base, shape: 'igraph.erdCardinalityN1' },
      'igraph.erdCardinalityMN': { ...base, shape: 'igraph.erdCardinalityMN' },
    };

    Object.entries(styles).forEach(([key, style]) => {
      stylesheet.putCellStyle(key, style);
    });

    console.log('✅ Registered igraph stylesheet entries');
  }, []);

  // ═════════════════════════════════════════════════════════════════════════
  // ⭐ FIXED DROP HANDLER - Uses square dimensions for circular shapes
  // ═════════════════════════════════════════════════════════════════════════

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
      const styleObject: CellStateStyle = {
        shape: styleKey,
        fillColor: '#ffffff',
        strokeColor: '#1a1f36',
        strokeWidth: 2,
        fontColor: '#1a1f36',
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
        styleObject,
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

  // ─── Init Graph ─────────────────────────────────────────────────────────────

  const initGraph = useCallback(() => {
    const graphDiv = graphDivRef.current;
    const gc       = gridCanvasRef.current;
    const wrapper  = wrapperRef.current;
    if (!graphDiv || !gc || !wrapper) return undefined;

    setError(null);
    setLoading(true);

    let destroyed = false;
    const timers: ReturnType<typeof setTimeout>[] = [];

    try {
      console.log('🔄 Initializing maxGraph...');

      gc.width  = wrapper.offsetWidth;
      gc.height = wrapper.offsetHeight;

      const ro = new ResizeObserver(() => { resizeGridCanvas(); repaintGrid(); });
      ro.observe(wrapper);

      InternalEvent.disableContextMenu(graphDiv);

      graphDiv.style.position   = 'absolute';
      graphDiv.style.overflow   = 'hidden';
      graphDiv.style.width      = '100%';
      graphDiv.style.height     = '100%';
      graphDiv.style.cursor     = 'default';
      graphDiv.style.userSelect = 'none';

      // 1. CREATE THE GRAPH
      const graph = new Graph(graphDiv);
      graphRef.current = graph;

      // ═════════════════════════════════════════════════════════════════════════
      // ⭐ 2. BIND UNIVERSAL VERTEX HANDLER - Draw.io style selection!
      // ═════════════════════════════════════════════════════════════════════════
      graph.createVertexHandler = (state: CellState) => {
        return new UniversalVertexHandler(state);
      };
      console.log('✅ Universal Vertex Handler bound to graph (draw.io style)');

      // 3. REGISTER STYLES
      registerShapeStyles(graph);

      // 4. CONFIGURE THE GRAPH
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

      // 5. SELECTION CHANGE LISTENER
      graph.getSelectionModel().addListener(InternalEvent.CHANGE, () => {
        handleSelectionChange();
      });

      graph.addListener('click', () => {
        setTimeout(handleSelectionChange, 10);
      });

      graph.addListener('cellClick', () => {
        setTimeout(handleSelectionChange, 10);
      });

      // 6. PLUGINS
      const panningHandler    = graph.getPlugin('PanningHandler')    as PanningHandler    | null;
      const connectionHandler = graph.getPlugin('ConnectionHandler') as ConnectionHandler | null;
      const fitPlugin         = graph.getPlugin('FitPlugin')         as FitPlugin         | null;

      if (panningHandler) {
        panningHandler.useLeftButtonForPanning = false;
        panningHandler.ignoreCell = false;
      }

      if (connectionHandler) {
        connectionHandler.outlineConnect     = true;
        connectionHandler.insertBeforeSource = false;
      }

      new RubberBandHandler(graph);

      // Undo
      const undoManager  = new UndoManager();
      const undoListener = (_: any, evt: any) =>
        undoManager.undoableEditHappened(evt.getProperty('edit'));
      graph.getDataModel().addListener(InternalEvent.UNDO, undoListener);
      graph.getView().addListener(InternalEvent.UNDO, undoListener);
      (graph as any).undoManager = undoManager;

      // Keyboard
      const keyHandler = new KeyHandler(graph);
      keyHandler.bindKey(46, () => graph.removeCells());
      keyHandler.bindKey(8,  () => graph.removeCells());
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
      keyHandler.bindKey(39, () => nudge(GRID_SIZE,  0));
      keyHandler.bindKey(40, () => nudge(0,  GRID_SIZE));

      // Scroll-to-zoom
      InternalEvent.addMouseWheelListener((evt: Event, up: boolean) => {
        const e = evt as WheelEvent;
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          const s = graph.getView().getScale();
          graph.zoomTo(Math.min(4, Math.max(0.1, s * (up ? 1.1 : 0.9))), true);
        }
      }, graphDiv);

      // Space-hold panning
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

      // Grid repaint
      graph.getView().addListener('scale',             () => repaintGrid());
      graph.getView().addListener('translate',         () => repaintGrid());
      graph.getView().addListener('scaleAndTranslate', () => repaintGrid());

      // onChange
      graph.getDataModel().addListener(InternalEvent.CHANGE, () => {
        try {
          const xml = new ModelXmlSerializer(graph.getDataModel()).export();
          onChangeRef.current?.(xml);
        } catch (_) {}
      });

      // Drag-and-drop
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

      dropTarget.addEventListener('dragover',  onDragOver);
      dropTarget.addEventListener('dragleave', onDragLeave);
      dropTarget.addEventListener('drop',      onDrop);

      graphDiv.addEventListener('keydown', (e: KeyboardEvent) => {
        if (e.key === 'Enter') {
          e.stopPropagation();
        }
      });

      // Fit and focus
      timers.push(setTimeout(() => {
        if (destroyed) return;
        fitPlugin?.fit();
        repaintGrid();
        graphDiv.focus();
        setTimeout(handleSelectionChange, 100);
      }, 150));

      repaintGrid();

      console.log('✅ maxGraph ready with draw.io-style selection');
      onReadyRef.current?.(graph);
      if (!destroyed) setLoading(false);

      return () => {
        destroyed = true;
        timers.forEach(clearTimeout);
        ro.disconnect();
        dropTarget.removeEventListener('dragover',  onDragOver);
        dropTarget.removeEventListener('dragleave', onDragLeave);
        dropTarget.removeEventListener('drop',      onDrop);
        graphDiv.removeEventListener('keydown', () => {});
        keyHandler.onDestroy();
        graph.destroy();
        graphRef.current = null;
      };
    } catch (err: any) {
      console.error('❌ maxGraph init error:', err);
      setError(err.message || 'Failed to load diagram editor');
      setLoading(false);
      return undefined;
    }
  }, [repaintGrid, resizeGridCanvas, handleDrop, registerShapeStyles, handleSelectionChange]);

  useEffect(() => {
    const cleanup = initGraph();
    return () => cleanup?.();
  }, [initGraph]);

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div
      ref={wrapperRef}
      style={{ position: 'relative', width: '100%', height: '100%' }}
    >
      <canvas
        ref={gridCanvasRef}
        style={{
          position:      'absolute',
          inset:         0,
          width:         '100%',
          height:        '100%',
          zIndex:        0,
          display:       'block',
          pointerEvents: 'none',
        }}
      />

      <div
        ref={graphDivRef}
        tabIndex={0}
        style={{
          position: 'absolute',
          inset:    0,
          zIndex:   1,
          outline:  'none',
        }}
      />

      {isDragOver && (
        <div
          style={{
            position:        'absolute',
            inset:           0,
            zIndex:          3,
            pointerEvents:   'none',
            border:          '2px dashed #4c6fff',
            borderRadius:    4,
            backgroundColor: 'rgba(76, 111, 255, 0.04)',
            boxSizing:       'border-box',
            transition:      'opacity 0.1s',
          }}
        />
      )}

      {error && (
        <div style={{
          position:        'absolute',
          inset:           0,
          zIndex:          4,
          display:         'flex',
          flexDirection:   'column',
          justifyContent:  'center',
          alignItems:      'center',
          backgroundColor: CANVAS_BG,
          padding:         20,
          fontFamily:      'system-ui, sans-serif',
        }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
          <h3 style={{ margin: 0, color: '#1e293b' }}>Diagram Editor Error</h3>
          <p style={{ color: '#64748b', textAlign: 'center', maxWidth: 500 }}>{error}</p>
        </div>
      )}

      {!error && loading && (
        <div style={{
          position:        'absolute',
          inset:           0,
          zIndex:          4,
          display:         'flex',
          flexDirection:   'column',
          justifyContent:  'center',
          alignItems:      'center',
          backgroundColor: CANVAS_BG,
        }}>
          <div style={{
            width:        40,
            height:       40,
            border:       '4px solid #e2e8f0',
            borderTop:    '4px solid #4c6fff',
            borderRadius: '50%',
            animation:    'igraph-spin 0.8s linear infinite',
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
};

// ─── Main Component ──────────────────────────────────────────────────────────

export default function DiagramCanvas({ onReady, onChange, onSelectionChange, umlType }: DiagramCanvasProps) {
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
      <WebCanvas onReady={onReady} onChange={onChange} onSelectionChange={onSelectionChange} umlType={umlType} />
    </View>
  );
}

const styles = StyleSheet.create({
  container:         { flex: 1, backgroundColor: CANVAS_BG },
  nativeNotice:      { flex: 1, backgroundColor: CANVAS_BG, justifyContent: 'center', alignItems: 'center', padding: 20 },
  nativeNoticeTitle: { fontSize: 20, fontWeight: '700', color: '#1e293b', marginBottom: 6 },
  nativeNoticeText:  { fontSize: 14, color: '#64748b', textAlign: 'center' },
});