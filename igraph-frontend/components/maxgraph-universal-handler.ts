// components/maxgraph-universal-handler.ts

import {
  VertexHandler,
  VertexHandlerConfig,
  Rectangle,
  Point,
  Shape,
  RectangleShape,
  EllipseShape,
  ImageShape,
  type CellState,
} from '@maxgraph/core';

const HANDLE_FILL = '#ffffff';
const HANDLE_STROKE = '#4c6fff';
const HANDLE_STROKE_WIDTH = 1.5;
const ROTATE_HANDLE_OFFSET = 8; // px, diagonal distance past the top-right corner

// ─── Rotation handle icon ───────────────────────────────────────────────────
// Same icon as Lucide's "rotate-cw", rendered in the handle's blue accent
// color and encoded as a data URI so ImageShape can draw it directly.
const ROTATE_ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${HANDLE_STROKE}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 2v6h-6"/><path d="M21 8a9 9 0 1 0 2.64 6.36"/></svg>`;
const ROTATE_ICON_DATA_URI = `data:image/svg+xml,${encodeURIComponent(ROTATE_ICON_SVG)}`;
const ROTATE_ICON_SIZE = 16; // px — bigger than the resize dots so it reads as an icon

// ─── Enable maxGraph's built-in rotation handle globally ───────────────────
// maxGraph is the TypeScript successor of mxGraph — the same engine draw.io
// runs on — so this handle is the actual draw.io rotate logic: same drag
// math, same 15° shift-snap, same touch handling through the graph's own
// unified mouse/touch pipeline (the pipeline your resize handles already
// use fine on mobile). There is no need to hand-roll DOM elements or
// touch listeners for this anymore.
VertexHandlerConfig.rotationEnabled = true;

/**
 * UniversalVertexHandler — draw.io-style selection handles.
 * Rotation is delegated entirely to VertexHandler's native implementation;
 * this class only customizes the visual appearance of the selection
 * rectangle and the sizer/rotation handle shapes.
 */
export class UniversalVertexHandler extends VertexHandler {
  constructor(state: CellState) {
    super(state);
  }

  /**
   * Belt-and-suspenders: force rotation on for this handler instance even
   * if VertexHandlerConfig.rotationEnabled gets flipped elsewhere/later.
   * This is the documented per-instance override for the removed
   * VertexHandler.rotationEnabled property (maxGraph >= 0.12.0).
   */
  isRotationEnabled(): boolean {
    return true;
  }

  /**
   * Position the rotation handle above the top-right corner instead of
   * the library's default top-center placement. `this.bounds` is the
   * current selection bounds the base class already computed (accounting
   * for scale/rotation), so we just offset from its top-right corner.
   */
  getRotationHandlePosition(): Point {
    const b = this.bounds;
    return new Point(b.x + b.width + ROTATE_HANDLE_OFFSET, b.y - ROTATE_HANDLE_OFFSET);
  }

  /**
   * Create the selection shape (draw.io style)
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
   * Create resize/rotation handles (draw.io style).
   * Called by the base class for every handle it manages. Resize handles
   * use non-negative indices (0-7); the rotation handle (and any custom/
   * virtual handles) use negative indices — that convention is stable
   * across the whole mxGraph/maxGraph/draw.io family, so checking the
   * sign here is safer than depending on one specific named constant.
   */
  createSizerShape(bounds: Rectangle, index: number, fillColor?: string): Shape {
    if (index < 0) {
      // Rotation handle — render the custom icon instead of a plain dot,
      // enlarged a bit and centered on the same point the base class chose.
      const cx = bounds.x + bounds.width / 2;
      const cy = bounds.y + bounds.height / 2;
      const iconBounds = new Rectangle(
        cx - ROTATE_ICON_SIZE / 2,
        cy - ROTATE_ICON_SIZE / 2,
        ROTATE_ICON_SIZE,
        ROTATE_ICON_SIZE,
      );
      const shape = new ImageShape(iconBounds, ROTATE_ICON_DATA_URI);
      shape.preserveImageAspect = true;
      return shape;
    }

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