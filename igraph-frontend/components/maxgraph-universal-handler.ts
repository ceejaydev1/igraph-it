import {
  VertexHandler,
  VertexHandlerConfig,
  VertexHandle,
  HandleConfig,
  Rectangle,
  Point,
  Shape,
  RectangleShape,
  EllipseShape,
  ImageShape,
  type CellState,
  type CellHandle,
  type CellStateStyle,
  type InternalMouseEvent,
} from '@maxgraph/core';
import { isConnectorCell } from '../constants/shapes';

// bendDx/bendDy — the single bend point's offset from the shape's own center,
// in local (unrotated) coordinates. A plain style property (not a real,
// TS-typed CellStateStyle key), read the same way the paint functions in
// maxgraph-custom-shapes.ts read it, so the live-dragged handle position and
// the actually-painted bend point never disagree.
function getBend(state: CellState): { dx: number; dy: number } {
  const s = state.style as Record<string, unknown> | undefined;
  return {
    dx: typeof s?.bendDx === 'number' ? (s.bendDx as number) : 0,
    dy: typeof s?.bendDy === 'number' ? (s.bendDy as number) : 0,
  };
}

// Indices into VertexHandler's 8 box-resize sizers (NW, N, NE, W, E, SW, S,
// SE — see the redrawHandles JSDoc in maxGraph's own VertexHandler.js, which
// documents exactly this hide-by-index pattern). W (3) and E (4) sit at the
// true left/right ends of the bounds — for a line-shaped vertex those two
// alone already behave like dragging a real edge's endpoints, since the
// shape's own paint function draws the line across the full bounds width.
// The other 6 (corners + N/S) only make sense for resizing a box.
const NON_ENDPOINT_SIZER_INDICES = [0, 1, 2, 5, 6, 7];

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
 * The 3rd ("bend") dot for connector/line shapes — draggable, and bends the
 * line at that point, matching draw.io's edge midpoint handle. Live-previews
 * by writing straight into this.state.style (redraw() re-applies that to
 * the shape and repaints on every drag frame); the model only gets a single
 * committed change in execute(), on mouse-up, so undo sees one step per
 * drag rather than one per frame.
 */
class ConnectorBendHandle extends VertexHandle {
  constructor(state: CellState) {
    super(state, 'crosshair');
  }

  getPosition(bounds: Rectangle): Point {
    const { dx, dy } = getBend(this.state);
    return new Point(bounds.x + bounds.width / 2 + dx, bounds.y + bounds.height / 2 + dy);
  }

  setPosition(bounds: Rectangle, pt: Point, _me: InternalMouseEvent): void {
    const cx = bounds.x + bounds.width / 2;
    const cy = bounds.y + bounds.height / 2;
    this.state.style = { ...this.state.style, bendDx: pt.x - cx, bendDy: pt.y - cy } as CellStateStyle;
  }

  execute(_me: InternalMouseEvent): void {
    const { dx, dy } = getBend(this.state);
    // keyof CellStateStyle-typed at compile time; bendDx/bendDy aren't real
    // declared keys, so this needs the same cast — matches the pattern used
    // to set them here in the first place, in setPosition above.
    this.graph.setCellStyles('bendDx' as keyof CellStateStyle, dx as CellStateStyle[keyof CellStateStyle], [this.state.cell]);
    this.graph.setCellStyles('bendDy' as keyof CellStateStyle, dy as CellStateStyle[keyof CellStateStyle], [this.state.cell]);
  }

  createShape(): Shape {
    const size = HandleConfig.size;
    const shape = new EllipseShape(new Rectangle(0, 0, size, size), HANDLE_FILL, HANDLE_STROKE, HANDLE_STROKE_WIDTH);
    shape.isDashed = false;
    return shape;
  }
}

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
   * VertexHandler.rotationEnabled property (maxGraph >= 0.12.0). Off for
   * connector/line shapes — rotating a shape whose own endpoints are
   * already freely draggable (and can bend) doesn't add anything real
   * draw.io edges don't already give you by just dragging the ends, and it
   * clutters the corner right next to the two dots that actually matter.
   */
  isRotationEnabled(): boolean {
    return !isConnectorCell(this.state?.cell);
  }

  /**
   * For connector/line-style shapes (isConnectorCell — Standard's
   * Connector, FDD's Control/Mechanism/Interface, Flowchart's Flow Line),
   * hide every box-resize handle except the two true endpoints (W/E), so
   * selecting one shows 2 draggable end-dots instead of 8 handles meant for
   * resizing a rectangle. The shape's paint function already draws the line
   * across the full bounds width, so dragging W or E — which moves that
   * edge of the bounds — reads exactly like dragging a real edge's endpoint.
   */
  redrawHandles(): void {
    super.redrawHandles();

    const cell = this.state?.cell;
    if (!isConnectorCell(cell)) return;
    if (!this.sizers || this.sizers.length <= 7) return;

    NON_ENDPOINT_SIZER_INDICES.forEach((i) => {
      const node = this.sizers[i]?.node;
      if (node) node.style.display = 'none';
    });
  }

  /**
   * Adds the bend dot for connector/line shapes, alongside the 2 endpoint
   * handles redrawHandles() leaves visible above — 3 dots total, always
   * (no extra dots once bent).
   */
  createCustomHandles(): CellHandle[] {
    const cell = this.state?.cell;
    if (isConnectorCell(cell)) {
      return [new ConnectorBendHandle(this.state)];
    }
    return [];
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
   * Create the selection shape (draw.io style). Connector/line shapes get
   * no visible box at all — real draw.io edges don't draw a bounding
   * rectangle around a selected line either, just the handles; a dashed box
   * around a *bent* line's original (now stale) bounding box would visibly
   * mismatch the shape it's supposedly outlining.
   */
  createSelectionShape(bounds: Rectangle): Shape {
    const isConnector = isConnectorCell(this.state?.cell);
    const shape = new RectangleShape(
      bounds,
      'none',                          // no fill
      isConnector ? 'none' : '#4c6fff', // no stroke either, for connectors
      1.5,
    );
    shape.isDashed = !isConnector;
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