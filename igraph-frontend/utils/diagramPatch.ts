import {
  Cell,
  Geometry,
  Point,
  GeometryChange,
  StyleChange,
  ValueChange,
  ChildChange,
  TerminalChange,
  VisibleChange,
  CollapseChange,
} from '@maxgraph/core';
import type { Graph } from '@maxgraph/core';
import { IGRAPH_PERIMETERS } from '@/components/maxgraph-custom-shapes';

// Converts maxGraph's own per-edit change objects (the same ones its
// UndoManager already stores) into a small, JSON-safe wire format, and
// applies an incoming patch list to a *different* client's live model via
// the model's public setters — instead of collaboration re-broadcasting the
// whole page's XML on every edit and every other client fully reimporting
// it. See the "Diff/Patch-Based Real-Time Collaboration Sync" plan for the
// full design rationale.

// ─── Wire format ────────────────────────────────────────────────────────────

interface WirePoint {
  x: number;
  y: number;
}

export interface WireGeometry {
  x: number;
  y: number;
  width: number;
  height: number;
  relative?: boolean;
  points?: WirePoint[] | null;
  sourcePoint?: WirePoint | null;
  targetPoint?: WirePoint | null;
  offset?: WirePoint | null;
}

export type DiagramPatch =
  | {
      type: 'add';
      id: string;
      parentId: string;
      index: number;
      vertex: boolean;
      edge: boolean;
      value: string | null;
      style: any;
      geometry: WireGeometry | null;
      sourceId: string | null;
      targetId: string | null;
      visible: boolean;
      collapsed: boolean;
    }
  | { type: 'remove'; id: string }
  | { type: 'move'; id: string; parentId: string; index: number }
  | { type: 'geometry'; id: string; geometry: WireGeometry | null }
  | { type: 'style'; id: string; style: any }
  | { type: 'value'; id: string; value: string | null }
  | { type: 'terminal'; id: string; source: boolean; terminalId: string | null }
  | { type: 'visible'; id: string; visible: boolean }
  | { type: 'collapse'; id: string; collapsed: boolean }
  // Escape hatch: a whole-page XML snapshot instead of incremental patches,
  // used when a transaction contains a change type this module doesn't
  // recognize (defensively — every edit this app's own code paths produce
  // maps to one of the types above) so an edit can never be silently
  // dropped, just fall back to today's full-reimport behavior for that one
  // flush. Always arrives alone in the patches array, never mixed with
  // other patch types.
  | { type: 'full'; xml: string };

// Identifies which cell+field a patch touches, so a sender-side buffer can
// collapse several intermediate updates (e.g. multiple geometry patches
// during one drag) down to just the latest value before flushing over the
// wire. Terminal patches are further split by which end they touch, since a
// 'terminal' patch for an edge's source and one for its target are
// unrelated changes that must never overwrite each other.
export function patchKey(patch: DiagramPatch): string {
  if (patch.type === 'full') return 'full';
  if (patch.type === 'terminal') return `${patch.id}:terminal:${patch.source ? 's' : 't'}`;
  return `${patch.id}:${patch.type}`;
}

// ─── Style sanitization ─────────────────────────────────────────────────────
// A cell's style is normally a plain JSON-safe object, but the shape-clone
// path (DiagramCanvas.tsx's directional-arrow clone) can bake an actual
// *function* into a cell's own `perimeter` key for shapes like triangle,
// fishbone-head, and parallelogram (IGRAPH_PERIMETERS maps those keys to
// makePolygonPerimeter(...) function values, not strings). JSON/socket.io
// serialization silently drops function-valued properties, which would
// silently break those shapes' edge-attachment outline on every other
// client. Round-trip it through a stable string key instead.

function sanitizeStyle(style: any): any {
  if (!style || typeof style !== 'object') return style;
  const out: any = {};
  for (const key of Object.keys(style)) {
    const value = style[key];
    if (typeof value === 'function') {
      if (key === 'perimeter') {
        const entry = Object.entries(IGRAPH_PERIMETERS).find(([, fn]) => fn === value);
        if (entry) {
          out.__perimeterKey = entry[0];
        }
        // No match found for a function-valued perimeter — drop it rather
        // than let socket.io silently swallow it further down the line.
        continue;
      }
      // Any other function-valued style key (none exist today, but nothing
      // stops one being added later) — same treatment: drop, don't crash.
      continue;
    }
    out[key] = value;
  }
  return out;
}

function desanitizeStyle(style: any): any {
  if (!style || typeof style !== 'object') return style;
  if (style.__perimeterKey) {
    const { __perimeterKey, ...rest } = style;
    const fn = IGRAPH_PERIMETERS[__perimeterKey];
    return fn ? { ...rest, perimeter: fn } : rest;
  }
  return style;
}

// ─── Geometry (de)serialization ─────────────────────────────────────────────

function serializePoint(p: any): WirePoint | null {
  return p ? { x: p.x, y: p.y } : null;
}

function serializeGeometry(geo: any): WireGeometry | null {
  if (!geo) return null;
  return {
    x: geo.x,
    y: geo.y,
    width: geo.width,
    height: geo.height,
    relative: geo.relative,
    points: Array.isArray(geo.points) ? geo.points.map((p: any) => serializePoint(p)) : null,
    sourcePoint: serializePoint(geo.sourcePoint),
    targetPoint: serializePoint(geo.targetPoint),
    offset: serializePoint(geo.offset),
  };
}

function deserializeGeometry(g: WireGeometry | null | undefined): Geometry | null {
  if (!g) return null;
  const geo = new Geometry(g.x, g.y, g.width, g.height);
  geo.relative = !!g.relative;
  geo.points = g.points ? g.points.map((p) => new Point(p.x, p.y)) : null;
  geo.sourcePoint = g.sourcePoint ? new Point(g.sourcePoint.x, g.sourcePoint.y) : null;
  geo.targetPoint = g.targetPoint ? new Point(g.targetPoint.x, g.targetPoint.y) : null;
  geo.offset = g.offset ? new Point(g.offset.x, g.offset.y) : null;
  return geo;
}

function valueToWire(value: any): string | null {
  if (value == null) return null;
  // Every insertVertex/insertEdge call in this app passes a plain string
  // label, and label edits read/write cell.getValue() as a string — this
  // app never gives cells XML-node values. String(...) is just a defensive
  // floor, not an expected conversion.
  return typeof value === 'string' ? value : String(value);
}

// ─── Sender: change objects → patches ───────────────────────────────────────
// By the time InternalEvent.CHANGE fires, every change object's execute()
// has already run once (GraphDataModel.execute() calls it before pushing the
// change onto the transaction), so each object's "current" field (not
// .previous) already holds the post-edit value — reading it off is the
// diff, no separate diffing pass needed.

export function changesToPatches(changes: any[], fallbackXml: string): DiagramPatch[] {
  const patches: DiagramPatch[] = [];

  for (const change of changes) {
    if (change instanceof ChildChange) {
      const cell: Cell = change.child;
      const newParent: Cell | null = change.parent;
      const oldParent: Cell | null = change.previous;

      if (!oldParent && newParent) {
        const geometry = cell.getGeometry();
        const source = cell.getTerminal(true);
        const target = cell.getTerminal(false);
        patches.push({
          type: 'add',
          id: cell.getId()!,
          parentId: newParent.getId()!,
          index: change.index,
          vertex: cell.isVertex(),
          edge: cell.isEdge(),
          value: valueToWire(cell.getValue()),
          style: sanitizeStyle(cell.getStyle()),
          geometry: serializeGeometry(geometry),
          sourceId: source ? source.getId() : null,
          targetId: target ? target.getId() : null,
          visible: cell.isVisible(),
          collapsed: cell.isCollapsed(),
        });
      } else if (oldParent && !newParent) {
        patches.push({ type: 'remove', id: cell.getId()! });
      } else if (oldParent && newParent) {
        patches.push({ type: 'move', id: cell.getId()!, parentId: newParent.getId()!, index: change.index });
      }
      continue;
    }

    if (change instanceof GeometryChange) {
      patches.push({ type: 'geometry', id: change.cell.getId()!, geometry: serializeGeometry(change.geometry) });
      continue;
    }
    if (change instanceof StyleChange) {
      patches.push({ type: 'style', id: change.cell.getId()!, style: sanitizeStyle(change.style) });
      continue;
    }
    if (change instanceof ValueChange) {
      patches.push({ type: 'value', id: change.cell.getId()!, value: valueToWire(change.value) });
      continue;
    }
    if (change instanceof TerminalChange) {
      const terminal: Cell | null = change.terminal;
      patches.push({
        type: 'terminal',
        id: change.cell.getId()!,
        source: change.source,
        terminalId: terminal ? terminal.getId() : null,
      });
      continue;
    }
    if (change instanceof VisibleChange) {
      patches.push({ type: 'visible', id: change.cell.getId()!, visible: change.visible });
      continue;
    }
    if (change instanceof CollapseChange) {
      patches.push({ type: 'collapse', id: change.cell.getId()!, collapsed: change.collapsed });
      continue;
    }

    // Unrecognized change type (RootChange/CurrentRootChange/SelectionChange
    // aren't real document edits; CellAttributeChange is confirmed unused by
    // this app's own code paths) — fall back to a full snapshot for this
    // flush rather than silently dropping whatever this change represents.
    return [{ type: 'full', xml: fallbackXml }];
  }

  return patches;
}

// ─── Receiver: patches → model mutations ────────────────────────────────────

export interface ApplyPatchesResult {
  // Set when a patch referenced a cell/parent id that doesn't resolve in the
  // local model — a sign this client missed an earlier patch and has
  // drifted out of sync. The caller should trigger a full resync when this
  // comes back true.
  driftDetected: boolean;
}

// 'full' patches are handled by the caller (they delegate to loadXml)
// before reaching this function — it only ever sees the incremental types.
export function applyPatches(graph: Graph, patches: DiagramPatch[]): ApplyPatchesResult {
  const model = graph.getDataModel();
  let driftDetected = false;

  graph.batchUpdate(() => {
    for (const patch of patches) {
      switch (patch.type) {
        case 'add': {
          if (model.getCell(patch.id)) break; // duplicate delivery — no-op
          const parent = model.getCell(patch.parentId);
          if (!parent) {
            driftDetected = true;
            break;
          }
          const cell = new Cell(patch.value, deserializeGeometry(patch.geometry), desanitizeStyle(patch.style));
          cell.setId(patch.id);
          cell.setVertex(patch.vertex);
          cell.setEdge(patch.edge);
          cell.setVisible(patch.visible);
          cell.setCollapsed(patch.collapsed);
          if (patch.sourceId) {
            const source = model.getCell(patch.sourceId);
            if (source) cell.setTerminal(source, true);
            else driftDetected = true;
          }
          if (patch.targetId) {
            const target = model.getCell(patch.targetId);
            if (target) cell.setTerminal(target, false);
            else driftDetected = true;
          }
          model.add(parent, cell, patch.index);
          break;
        }
        case 'remove': {
          const cell = model.getCell(patch.id);
          if (!cell) {
            driftDetected = true;
            break;
          }
          model.remove(cell);
          break;
        }
        case 'move': {
          const cell = model.getCell(patch.id);
          const parent = model.getCell(patch.parentId);
          if (!cell || !parent) {
            driftDetected = true;
            break;
          }
          model.add(parent, cell, patch.index);
          break;
        }
        case 'geometry': {
          const cell = model.getCell(patch.id);
          if (!cell) {
            driftDetected = true;
            break;
          }
          const geometry = deserializeGeometry(patch.geometry);
          if (geometry) model.setGeometry(cell, geometry);
          break;
        }
        case 'style': {
          const cell = model.getCell(patch.id);
          if (!cell) {
            driftDetected = true;
            break;
          }
          model.setStyle(cell, desanitizeStyle(patch.style));
          break;
        }
        case 'value': {
          const cell = model.getCell(patch.id);
          if (!cell) {
            driftDetected = true;
            break;
          }
          model.setValue(cell, patch.value);
          break;
        }
        case 'terminal': {
          const cell = model.getCell(patch.id);
          if (!cell) {
            driftDetected = true;
            break;
          }
          let terminal: Cell | null = null;
          if (patch.terminalId) {
            terminal = model.getCell(patch.terminalId);
            if (!terminal) {
              driftDetected = true;
              break;
            }
          }
          model.setTerminal(cell, terminal, patch.source);
          break;
        }
        case 'visible': {
          const cell = model.getCell(patch.id);
          if (!cell) {
            driftDetected = true;
            break;
          }
          model.setVisible(cell, patch.visible);
          break;
        }
        case 'collapse': {
          const cell = model.getCell(patch.id);
          if (!cell) {
            driftDetected = true;
            break;
          }
          model.setCollapsed(cell, patch.collapsed);
          break;
        }
        case 'full':
          // Handled by the caller before reaching here — ignore defensively
          // rather than assume it can never appear.
          break;
      }
    }
  });

  // Patches mutate existing Cell objects in place, so a locally-selected
  // cell keeps its object identity through a remote update automatically —
  // unlike loadXml's full model replace, no re-select-by-id dance is needed
  // here. The one thing that does need cleanup: a cell a 'remove' patch
  // just deleted staying in the selection as a now-dangling reference.
  const current = graph.getSelectionCells();
  const survivors = current.filter((c: Cell) => !!model.getCell(c.getId()!));
  if (survivors.length !== current.length) {
    graph.setSelectionCells(survivors);
  }

  return { driftDetected };
}
