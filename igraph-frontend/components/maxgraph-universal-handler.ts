// components/maxgraph-universal-handler.ts

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
      '#4c6fff',   // BLUE stroke
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
      fillColor ?? '#ffffff',
      '#4c6fff',   // BLUE stroke
      1.5,
    );
    shape.isDashed = false;
    return shape;
  }
}