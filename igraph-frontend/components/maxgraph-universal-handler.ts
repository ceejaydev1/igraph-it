// components/maxgraph-universal-handler.ts
//
// Draw.io selection behavior, matched exactly:
//  1. Selection outline = dashed rectangle sized to the vertex's actual
//     bounding box (no per-shape geometry tracing).
//  2. Resize handles = small circles (white fill, blue border) positioned
//     at the corners/edge-midpoints of that same bounding box.
//
// Handle shape must be overridden at the Shape level (createSizerShape),
// not via CSS — maxGraph renders handles as SVG shapes, so `.mxHandle`
// CSS rules never actually apply to them.

import {
  VertexHandler,
  Rectangle,
  Shape,
  RectangleShape,
  EllipseShape,
} from '@maxgraph/core';

const HANDLE_FILL = '#ffffff';
const HANDLE_STROKE = '#4c6fff';
const HANDLE_STROKE_WIDTH = 1.5;

/**
 * UniversalVertexHandler — draw.io-style selection for every shape.
 */
export class UniversalVertexHandler extends VertexHandler {
  /**
   * Always a simple rectangle outline sized to the exact vertex bounds —
   * this is what draw.io does for every shape type, so it can never
   * "mismatch" the handle positions (which are also bounds-based).
   */
  createSelectionShape(bounds: Rectangle): Shape {
    const shape = new RectangleShape(
      bounds,
      'none',      // no fill
      HANDLE_STROKE,
      1.5,
    );
    shape.isDashed = true;
    return shape;
  }

  /**
   * Draw every resize handle (corners + edge midpoints) as a small circle
   * with a white fill and blue border — matching draw.io's round dots
   * instead of maxGraph's default solid rectangle handles.
   */
  createSizerShape(bounds: Rectangle, index: number, fillColor?: string): Shape {
    const shape = new EllipseShape(
      bounds,
      fillColor ?? HANDLE_FILL,
      HANDLE_STROKE,
      HANDLE_STROKE_WIDTH,
    );
    shape.isDashed = false;
    return shape;
  }
}