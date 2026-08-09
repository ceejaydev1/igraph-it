import type { Cell, Graph } from '@maxgraph/core';
import { isConnectorCell, getShapeIdFromStyle, getShapeDefinitionById } from '@/constants/shapes';
import { SCHEMATIC_PIN_DEFINITIONS } from '@/components/maxgraph-custom-shapes';

// Desktop-only diagram validation, checked against the live cell model on
// every change, for every diagram type the app supports (see validateDiagram
// / VALIDATORS at the bottom of this file). Two families of feedback: "wrong
// shape" (a shape that doesn't belong on this canvas) and "wrong connect" (a
// connection pattern this diagram type's notation doesn't allow) — plus a
// few graph-wide checks (missing start/end, disconnected groups, duplicate
// links) that aren't any single cell's fault.
//
// validateFlowchart (just below) was the original, one-off implementation.
// Every other diagram type's validator lives further down, built on the
// shared runStructuralChecks engine so the same rule shapes don't get
// hand-copied nine more times.

export type IssueSeverity = 'error' | 'warning' | 'info';

export interface FlowchartIssue {
  // Absent for graph-wide issues (e.g. "no start terminator") — those only
  // ever show up in the summary list, never as an on-canvas badge.
  cell?: Cell;
  severity: IssueSeverity;
  message: string;
}

// Every other validator below (Functional Decomposition, DFD, ERD, Fishbone,
// Schematic, Use Case, Activity, Sequence, Class, Standard) reports through
// this same shape — `FlowchartIssue` predates the other diagram types and
// callers already depend on that name, so it stays as the real type and this
// is just the generic name new code reaches for.
export type DiagramIssue = FlowchartIssue;

// ─── Shape-role tagging ──────────────────────────────────────────────────────
// Cells are tagged with the exact shape id (e.g. 'decision', 'terminator') the
// moment they're created — see tagShapeRole, called from every insertion path
// (panel click, drag-drop, the hover "add adjacent shape" arrows). This is the
// fast, unambiguous path for the current session; getShapeRole below falls
// back to reverse-mapping the cell's own persisted style once a cell no
// longer carries this tag (i.e. after a reload). That fallback is lossy where
// two ids intentionally render with the same style (Flowchart's 'process' and
// Standard's plain 'rectangle' are both igraph.rectangle) — see
// getShapeIdFromStyle in constants/shapes.ts for how those are resolved.
const shapeRoles = new WeakMap<Cell, string>();

export function tagShapeRole(cell: Cell | null | undefined, shapeId: string | undefined | null): void {
  if (cell && shapeId) shapeRoles.set(cell, shapeId);
}

export function getShapeRole(cell: Cell): string | undefined {
  // The WeakMap tag only exists for cells created in this session (panel
  // click, drag-drop, hover "add adjacent shape" — see tagShapeRole). Any
  // cell that survived a reload (page refresh, reopening a saved diagram,
  // a dev hot-reload) never got tagged, since ModelXmlSerializer.import
  // rebuilds cells straight from XML without going through those insertion
  // paths — see the identical note on isConnectorCell in constants/shapes.ts.
  // Falling back to the cell's own persisted style recovers the role in
  // that case; without it, every role-based check (start/end terminators,
  // decision branching, required labels...) silently goes blind after any
  // reload.
  return shapeRoles.get(cell) ?? getShapeIdFromStyle(cell);
}

// Shared by DiagramCanvas.tsx (drag-connect) and create.tsx (tap-to-connect)
// so a Functional Decomposition hierarchy link picks the same entry side
// however it was drawn. A child placed roughly straight below its parent —
// the case when several children are stacked in a column, e.g. sub-steps
// under one process — reads as an outline-style list, so it enters the
// parent's trunk from the side (left if the child sits to the right,
// right if to the left) rather than the top. A child offset well to the
// side (siblings spread out in a row) keeps the classic org-chart look,
// entering the top. "Roughly below" is judged by how much the two centers
// overlap horizontally relative to the parent's own width — comfortably
// wider than a same-column child's near-zero offset, comfortably narrower
// than a full sibling-column's spacing.
export function computeFddEntryPoint(
  sourceGeo: { x: number; y: number; width: number; height: number } | null | undefined,
  targetGeo: { x: number; y: number; width: number; height: number } | null | undefined,
): { exitX: number; exitY: number; entryX: number; entryY: number } {
  const rowStyle = { exitX: 0.5, exitY: 1, entryX: 0.5, entryY: 0 };
  if (!sourceGeo || !targetGeo) return rowStyle;
  const sourceCenterX = sourceGeo.x + sourceGeo.width / 2;
  const targetCenterX = targetGeo.x + targetGeo.width / 2;
  // A deliberately tight band (a third of the parent's own width, ~40px
  // for the usual 120px box) rather than a full box-width: a row of 3+
  // children centered under one parent inevitably puts the *middle*
  // child's center within a full box-width of the parent's — that's not
  // "stacked", it's just a centered row, and a looser band would wrongly
  // flip that one connector to the side while its siblings stay on top.
  const nearlyStacked = Math.abs(sourceCenterX - targetCenterX) < sourceGeo.width / 3;
  if (!nearlyStacked) return rowStyle;
  // Exiting from the same side as the entry (rather than the parent's
  // bottom-center, as the row style does) keeps the whole stack's trunk
  // running straight down one side with a short tick into each child —
  // exiting from bottom-center instead left the router adding a stray
  // extra jog around the parent's own box for whichever child sat closest
  // to it, since bottom-center and a same-column child's left edge aren't
  // actually aligned.
  const onRight = targetCenterX >= sourceCenterX;
  return { exitX: onRight ? 0 : 1, exitY: 1, entryX: onRight ? 0 : 1, entryY: 0.5 };
}

// ─── Shape roles by structural expectation ───────────────────────────────────
const BRANCHING_ROLES = new Set(['decision']);
// Shapes that represent a single jump point — a start/end, or a page
// connector — and so should only ever be entered OR exited, never both.
const SINGLE_JUNCTION_ROLES = new Set(['terminator', 'on-page-connector', 'off-page-connector']);
// The circled-X Merge shape: several flows converging into one (or,
// symmetrically, one splitting back out) is exactly what it's for, so it's
// exempt from the "only Decision shapes should branch" warning below —
// unlike Decision, though, it doesn't require 2+ outgoing paths, since its
// normal case is many-in/one-out.
const FLEXIBLE_FANOUT_ROLES = new Set(['merge-junction']);
// Shapes that legitimately float free of the flow as commentary, not steps.
const FREE_FLOATING_ROLES = new Set(['annotation']);

function junctionLabel(role: string): string {
  return role === 'terminator' ? 'Terminator' : 'Connector';
}

// ════════════════════════════════════════════════════════════════════════════
// ⭐ GLOBAL RULES (G1-G8) — apply to every diagram type, layered underneath
// each diagram's own per-type rules below. Where a per-diagram rule
// contradicts one of these (e.g. Flowchart treats a self-loop as a warning,
// not the generic error validateFlowchart used to hardcode), the per-diagram
// rule wins — these are just the shared, cheap, structural checks every
// validator would otherwise have to hand-roll identically.
// ════════════════════════════════════════════════════════════════════════════

// G1 — canvas must contain at least one non-annotation element. `count` is
// the number of vertices left after the caller filters out annotation
// roles (and anything already flagged as foreign-palette, so an empty
// canvas doesn't also get a confusing second message).
function checkEmptyCanvas(count: number): DiagramIssue[] {
  return count > 0 ? [] : [{ severity: 'error', message: 'This diagram is empty — add at least one shape.' }];
}

// G2 — every edge needs both ends attached to a real cell. A "dangling" end
// is a floating point left over from a not-yet-connected connector — see
// the magnet-attach insertion in DiagramCanvas.tsx's handleDrop/create.tsx's
// handleAddShape, which deliberately allows a freshly dropped connector to
// land with one or both ends unattached until the user drags them onto a
// shape (or the drop itself snapped one end on already).
// `oneEndExemptRoles`, when given, covers the different case of an edge
// whose *design*, not just its current state, has exactly one end that's
// never meant to attach to anything — Fishbone's spine (see its
// "head !== sourceCell"/attachSpineToHead comments in DiagramCanvas.tsx)
// always has a permanently-dangling tail on whichever end the Fish Head
// didn't claim, by design, forever. Only skips the "one end dangling"
// message for those roles; a role in this set with *both* ends still
// dangling (not wired to anything real at all yet) is still a genuine
// problem and still gets flagged.
function checkDanglingEdges(edges: Cell[], oneEndExemptRoles?: Set<string>): DiagramIssue[] {
  const issues: DiagramIssue[] = [];
  for (const edge of edges) {
    if (!edge.source || !edge.target) {
      const bothDangling = !edge.source && !edge.target;
      if (!bothDangling && oneEndExemptRoles?.has(getShapeRole(edge) ?? '')) continue;
      issues.push({
        cell: edge,
        severity: 'error',
        message: bothDangling
          ? "This connector isn't attached to anything yet — drag both ends onto a shape."
          : "This connector has one end that isn't attached to a shape yet — drag it onto one to complete the connection.",
      });
    }
  }
  return issues;
}

// A blank/whitespace-only label counts as "no label" for G4 — cell.getValue()
// is whatever text the user has typed into the shape.
function isBlankLabel(cell: Cell): boolean {
  const value = cell.getValue();
  return typeof value !== 'string' || value.trim().length === 0;
}

// G4 — a role that's expected to carry a meaningful name (a Process's label,
// an Entity's name...) shouldn't be left blank.
function checkEmptyLabels(cells: Cell[], labeledRoles: Set<string>): DiagramIssue[] {
  const issues: DiagramIssue[] = [];
  for (const cell of cells) {
    const role = getShapeRole(cell);
    if (!role || !labeledRoles.has(role)) continue;
    if (isBlankLabel(cell)) {
      issues.push({ cell, severity: 'warning', message: 'This shape has no label yet — give it a name.' });
    }
  }
  return issues;
}

// G6 — a Note/Annotation with no attaching edge is allowed but gets an
// info-level nudge, not a warning/error. Proximity-based "is it sitting near
// something" is deliberately not attempted — too fuzzy, too easy to
// false-positive on a note that's simply been dragged a little to one side.
function checkOrphanAnnotations(cells: Cell[], annotationRoles: Set<string>): DiagramIssue[] {
  const issues: DiagramIssue[] = [];
  for (const cell of cells) {
    const role = getShapeRole(cell);
    if (!role || !annotationRoles.has(role)) continue;
    const linked = (cell.getEdges(true, true, false) ?? []).length > 0;
    if (!linked) {
      issues.push({ cell, severity: 'info', message: "This note isn't attached to anything — connect it to the shape it's commenting on." });
    }
  }
  return issues;
}

// G7 — two cells of the same role sharing the same (non-empty, trimmed,
// case-insensitive) label are probably meant to be distinct identities.
// Severity defaults to warning; callers that model a hard identity
// constraint (Class names, ERD entity/attribute names, DFD process numbers)
// pass 'error' instead.
function checkDuplicateLabels(
  cells: Cell[],
  uniqueRoles: Set<string>,
  severity: IssueSeverity = 'warning',
  message = 'Another shape of the same kind already uses this name.',
): DiagramIssue[] {
  const issues: DiagramIssue[] = [];
  const seen = new Set<string>();
  for (const cell of cells) {
    const role = getShapeRole(cell);
    if (!role || !uniqueRoles.has(role)) continue;
    if (isBlankLabel(cell)) continue;
    const key = `${role}:${(cell.getValue() as string).trim().toLowerCase()}`;
    if (seen.has(key)) {
      issues.push({ cell, severity, message });
    } else {
      seen.add(key);
    }
  }
  return issues;
}

// Forward/backward reachability by following edges outward (source->target)
// or inward (target->source) from a set of starting cells — used for
// Flowchart FC6, Activity AC6, and Use Case UC5's "every X reaches a Y"
// checks. Deliberately edge-role-agnostic (follows every edge) since none of
// those diagrams distinguish "flow" edges from decorative ones once you're
// inside the flow/activity/use-case graph itself.
function reachableForward(startCells: Cell[]): Set<Cell> {
  const visited = new Set<Cell>(startCells);
  const queue = [...startCells];
  while (queue.length) {
    const current = queue.shift()!;
    for (const edge of current.getEdges(false, true, false) ?? []) {
      const target = edge.target;
      if (target && !visited.has(target)) {
        visited.add(target);
        queue.push(target);
      }
    }
  }
  return visited;
}

function reachableBackward(endCells: Cell[]): Set<Cell> {
  const visited = new Set<Cell>(endCells);
  const queue = [...endCells];
  while (queue.length) {
    const current = queue.shift()!;
    for (const edge of current.getEdges(true, false, false) ?? []) {
      const source = edge.source;
      if (source && !visited.has(source)) {
        visited.add(source);
        queue.push(source);
      }
    }
  }
  return visited;
}

// Directed-cycle detection via DFS + recursion stack over a caller-supplied
// adjacency map — generic so each diagram can build its own "what counts as
// a step in this chain" filtering (Class's inheritance edges, FDD's
// parent->child hierarchy, Use Case's include/extend/generalization edges)
// without re-implementing the traversal each time. Returns the cell at which
// each detected cycle was (re-)encountered, suitable as the issue's anchor.
function findCycleRoots(adjacency: Map<Cell, Cell[]>): Cell[] {
  const visited = new Set<Cell>();
  const onStack = new Set<Cell>();
  const cyclic: Cell[] = [];

  const visit = (cell: Cell): boolean => {
    visited.add(cell);
    onStack.add(cell);
    for (const next of adjacency.get(cell) ?? []) {
      if (onStack.has(next)) return true;
      if (!visited.has(next) && visit(next)) return true;
    }
    onStack.delete(cell);
    return false;
  };

  for (const cell of adjacency.keys()) {
    if (visited.has(cell)) continue;
    if (visit(cell)) cyclic.push(cell);
  }
  return cyclic;
}

// Plain geometry rectangle helpers — used for containment/overlap checks
// that are inherently spatial rather than graph-based (Use Case UC6's
// actor/use-case-vs-boundary placement, Sequence's combined-fragment
// nesting). Cell geometry (x/y/width/height) is always in the same shared
// model-space coordinate system regardless of diagram type, so plain
// rectangle math is enough — no need to read anything from the view/canvas.
interface GeoRect { x: number; y: number; width: number; height: number; }

function rectContains(outer: GeoRect, inner: GeoRect, margin = 0): boolean {
  return (
    inner.x >= outer.x - margin &&
    inner.y >= outer.y - margin &&
    inner.x + inner.width <= outer.x + outer.width + margin &&
    inner.y + inner.height <= outer.y + outer.height + margin
  );
}

function rectsOverlap(a: GeoRect, b: GeoRect): boolean {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

// Roles expected to carry a real name — everything process-like, plus the
// jump connectors (their label is also what pairs them up, see the FC7
// check below). Deliberately excludes Annotation (free-text by nature, not
// a "missing name" the way a blank Process step is).
const FLOWCHART_LABELED_ROLES = new Set([
  'terminator', 'process', 'io', 'decision', 'on-page-connector', 'off-page-connector',
  'document', 'database', 'predefined', 'manual-input', 'delay', 'preparation', 'display',
]);

export function validateFlowchart(graph: Graph): FlowchartIssue[] {
  const issues: FlowchartIssue[] = [];
  const parent = graph.getDefaultParent();
  const vertices = graph.getChildVertices(parent);
  const edges = graph.getChildEdges(parent);

  // G2 — dangling connector ends, checked independently of palette
  // membership below (a foreign shape with a dangling edge should still
  // report the dangling end).
  issues.push(...checkDanglingEdges(edges));

  // Vertices that passed the palette check — used by the graph-wide checks
  // below so a foreign shape's own connections don't also trigger those.
  const validVertices: Cell[] = [];
  const startTerminators: Cell[] = [];
  const endTerminators: Cell[] = [];
  const onPageByLabel = new Map<string, Cell[]>();
  const offPageByLabel = new Map<string, Cell[]>();

  for (const cell of vertices) {
    // Connector/line shapes (Connector, Flow Line, ...) represent the
    // connection itself, not a step in the flow — they're meant to be
    // dragged onto other shapes to link them, not to have their own
    // incoming/outgoing connections graded. Older diagrams can still have
    // these as plain vertices (see isConnectorCell), so skip them here
    // regardless of how they were created.
    if (isConnectorCell(cell)) continue;

    const role = getShapeRole(cell);

    // Shapes from any section of the Shapes panel are fair game on any
    // canvas — the panel lets you switch sections freely, so grading a
    // shape as "foreign" just because the panel is currently showing a
    // different section would punish that flexibility instead of the
    // student's actual choice.
    validVertices.push(cell);

    const allEdges = cell.getEdges(false, false, true) ?? [];
    const hasSelfLoop = allEdges.some((e) => e.source === cell && e.target === cell);
    if (hasSelfLoop) {
      // FC/2.13 — legal-but-suspicious, not invalid: downgraded from the
      // generic "can't connect to itself" error other diagram types use,
      // since a flowchart step retrying itself is unusual but not
      // impossible notation.
      issues.push({ cell, severity: 'warning', message: "This shape loops back to itself — make sure that's on purpose, not a mistake." });
    }

    const incoming = cell.getEdges(true, false)?.length ?? 0;
    const outgoing = cell.getEdges(false, true)?.length ?? 0;

    if (role === 'terminator') {
      if (incoming === 0 && outgoing > 0) startTerminators.push(cell);
      if (outgoing === 0 && incoming > 0) endTerminators.push(cell);
    }

    if (role === 'on-page-connector' || role === 'off-page-connector') {
      const label = isBlankLabel(cell) ? '' : (cell.getValue() as string).trim().toLowerCase();
      if (label) {
        const map = role === 'on-page-connector' ? onPageByLabel : offPageByLabel;
        const list = map.get(label) ?? [];
        list.push(cell);
        map.set(label, list);
      }
    }

    if (incoming === 0 && outgoing === 0 && !FREE_FLOATING_ROLES.has(role ?? '')) {
      issues.push({ cell, severity: 'warning', message: "This shape isn't connected to the flow yet." });
      continue;
    }

    // FC3/2.8 — a dead end: something feeds into this step but nothing
    // continues from it, and it isn't an End terminator (which is the one
    // legitimate place for a flow to stop). Distinct from the fully
    // disconnected case above (both in and out are 0).
    if (outgoing === 0 && incoming > 0 && role !== 'terminator') {
      issues.push({
        cell,
        severity: 'error',
        message: 'This is a dead end — nothing continues from here. Add an outgoing connection, or replace it with a Terminator if the flow is meant to end here.',
      });
    }

    if (role && BRANCHING_ROLES.has(role) && outgoing < 2) {
      issues.push({
        cell,
        severity: 'warning',
        message: 'Decision shapes usually need two or more outgoing paths (e.g. Yes/No).',
      });
    }

    // FC5/2.7 — every branch out of a Decision should say which condition
    // it's for (a Decision with unlabelled branches is legal but ambiguous).
    if (role === 'decision') {
      const outgoingEdges = cell.getEdges(false, true, false) ?? [];
      for (const edge of outgoingEdges) {
        if (isBlankLabel(edge)) {
          issues.push({ cell: edge, severity: 'warning', message: "Label this branch with its condition (e.g. Yes/No) so it's clear which path it is." });
        }
      }
    }

    if (role && SINGLE_JUNCTION_ROLES.has(role) && incoming > 0 && outgoing > 0) {
      issues.push({
        cell,
        severity: 'warning',
        message: `${junctionLabel(role)} shapes should only be entered or exited, not both — use a Process shape for in-between steps.`,
      });
    }

    if (role && !BRANCHING_ROLES.has(role) && !SINGLE_JUNCTION_ROLES.has(role) && !FLEXIBLE_FANOUT_ROLES.has(role) && outgoing > 1) {
      issues.push({
        cell,
        severity: 'warning',
        message: 'Only Decision shapes should branch into multiple paths.',
      });
    }
  }

  // G1 — empty diagram (annotations alone don't count as content).
  issues.push(...checkEmptyCanvas(validVertices.filter((c) => !FREE_FLOATING_ROLES.has(getShapeRole(c) ?? '')).length));
  // G4 — required names.
  issues.push(...checkEmptyLabels(validVertices, FLOWCHART_LABELED_ROLES));
  // G6 — orphaned annotations get an info nudge instead of being silently skipped.
  issues.push(...checkOrphanAnnotations(validVertices, FREE_FLOATING_ROLES));

  // FC7/2.14 — on/off-page connectors exist in matched labelled pairs; a
  // label used by exactly one connector has nowhere to jump to/from.
  const checkJumpPairs = (byLabel: Map<string, Cell[]>) => {
    byLabel.forEach((cells) => {
      if (cells.length === 1) {
        issues.push({ cell: cells[0], severity: 'error', message: "No other connector uses this label — a jump connector always needs a matching partner with the same label." });
      }
    });
  };
  checkJumpPairs(onPageByLabel);
  checkJumpPairs(offPageByLabel);

  // ── Graph-wide: every flow should have a clear start and end. Only once an
  // actual flow exists (2+ shapes, at least one connection) — an empty canvas
  // or a single freshly-dropped shape shouldn't be nagged about this yet.
  if (validVertices.length >= 2 && edges.length >= 1) {
    if (startTerminators.length === 0) {
      issues.push({
        severity: 'warning',
        message: 'This flowchart has no starting point — add a Terminator shape with nothing feeding into it.',
      });
    } else if (startTerminators.length > 1) {
      // 2.14 — flagged on every extra start past the first, so each one gets its own marker.
      startTerminators.slice(1).forEach((cell) => {
        issues.push({ cell, severity: 'warning', message: 'A flowchart usually has a single entry point — consider merging these into one Start.' });
      });
    }
    if (endTerminators.length === 0) {
      issues.push({
        severity: 'warning',
        message: 'This flowchart has no ending point — add a Terminator shape with nothing leading out of it.',
      });
    }

    // FC6/2.10-2.11 — reachability from Start and to End. Only meaningful
    // once at least one Start/End actually exists (otherwise every shape
    // would trivially fail and just repeat the two messages above).
    if (startTerminators.length > 0) {
      const reachable = reachableForward(startTerminators);
      for (const cell of validVertices) {
        if (!reachable.has(cell)) {
          issues.push({ cell, severity: 'warning', message: "This shape can't be reached from any Start — check the connections leading to it." });
        }
      }
    }
    if (endTerminators.length > 0) {
      const canReachEnd = reachableBackward(endTerminators);
      for (const cell of validVertices) {
        if (!canReachEnd.has(cell)) {
          issues.push({ cell, severity: 'warning', message: "This shape can't reach any End — it leads into a loop or dead branch with no way out." });
        }
      }
    }
  }

  // ── Graph-wide: duplicate connections between the same two shapes.
  const pairMap = new Map<Cell, Map<Cell, Cell[]>>();
  edges.forEach((edge) => {
    const { source, target } = edge;
    if (!source || !target || source === target) return;
    let inner = pairMap.get(source);
    if (!inner) {
      inner = new Map();
      pairMap.set(source, inner);
    }
    const list = inner.get(target) ?? [];
    list.push(edge);
    inner.set(target, list);
  });
  pairMap.forEach((inner) => {
    inner.forEach((edgeList) => {
      edgeList.slice(1).forEach((edge) => {
        issues.push({
          cell: edge,
          severity: 'warning',
          message: 'Duplicate connection — these two shapes are already linked by another line.',
        });
      });
    });
  });

  // ── Graph-wide: every shape should belong to one connected flow, not
  // scattered islands. A single isolated shape (no edges at all) is already
  // covered by the per-shape "not connected" check above — this only catches
  // groups of 2+ shapes that connect to each other but not to the rest.
  if (validVertices.length > 0) {
    const validSet = new Set(validVertices);
    const visited = new Set<Cell>();
    const components: Cell[][] = [];

    for (const start of validVertices) {
      if (visited.has(start)) continue;
      const component: Cell[] = [];
      const queue: Cell[] = [start];
      visited.add(start);
      while (queue.length) {
        const current = queue.shift()!;
        component.push(current);
        const neighborEdges = current.getEdges(true, true, false) ?? [];
        for (const edge of neighborEdges) {
          const other = edge.source === current ? edge.target : edge.source;
          if (!other || visited.has(other) || !validSet.has(other)) continue;
          visited.add(other);
          queue.push(other);
        }
      }
      components.push(component);
    }

    if (components.length > 1) {
      const largest = components.reduce((a, b) => (b.length > a.length ? b : a));
      components.forEach((component) => {
        if (component === largest) return;
        component.forEach((cell) => {
          if ((cell.getEdges(true, true, false)?.length ?? 0) > 0) {
            issues.push({
              cell,
              severity: 'warning',
              message: "This shape's group isn't connected to the rest of the flowchart.",
            });
          }
        });
      });
    }
  }

  return issues;
}

// ════════════════════════════════════════════════════════════════════════════
// ⭐ ALL OTHER DIAGRAM TYPES — shared structural rule engine
// ════════════════════════════════════════════════════════════════════════════
// validateFlowchart above is intentionally left untouched (it's the original,
// battle-tested one-off). Every other diagram type's notation rules follow
// the same shape — "wrong palette", "wrong connection", plus a few
// graph-wide checks — so instead of copy-pasting that ~180 lines nine more
// times, the common parts are pulled into a small config-driven engine below
// and each diagram type supplies a config plus whatever bespoke checks its
// notation needs that the generic engine can't express (ERD's "entities must
// go through a relationship diamond", Class's inheritance-cycle detection,
// DFD's "no entity-to-store shortcut", etc.).

interface EdgeRoles {
  sourceCell: Cell | null;
  targetCell: Cell | null;
  sourceRole?: string;
  targetRole?: string;
}

function edgeRoles(edge: Cell): EdgeRoles {
  const sourceCell = edge.source ?? null;
  const targetCell = edge.target ?? null;
  return {
    sourceCell,
    targetCell,
    sourceRole: sourceCell ? getShapeRole(sourceCell) : undefined,
    targetRole: targetCell ? getShapeRole(targetCell) : undefined,
  };
}

// Config for the parts of a diagram's rules that are just "shape by shape,
// same question every time" — one config per diagram type below.
interface StructuralConfig {
  // Roles allowed to sit with zero connections without a warning (notes,
  // boundaries/containers, floating labels, fragment frames...).
  freeFloatingRoles?: Set<string>;
  disconnectedMessage?: string;

  // G2 — roles with a permanently-by-design dangling end (see the matching
  // param on checkDanglingEdges above). A role in this set with *both* ends
  // still dangling is still flagged; only the expected one-end case is exempt.
  danglingOneEndExemptRoles?: Set<string>;

  // Roles where a self-loop is legitimate notation, not a mistake (e.g. a
  // sequence diagram's self-message, or a self-referencing class).
  selfLoopExemptRoles?: Set<string>;

  // Decision-like: needs 2+ outgoing paths.
  branchingRoles?: Set<string>;
  branchingMessage?: string;
  // Merge-like: needs 2+ incoming, exactly 1 outgoing.
  mergeRoles?: Set<string>;
  mergeMessage?: string;
  // Fork-like: exactly 1 incoming, needs 2+ outgoing.
  forkRoles?: Set<string>;
  forkMessage?: string;
  // Single-junction: should only ever be entered OR exited, never both.
  junctionRoles?: Set<string>;
  junctionMessage?: (role: string) => string;

  // Graph-wide "needs a clear start" / "needs a clear end", same idea as
  // Flowchart's start/end terminator check.
  sourceRoles?: Set<string>;
  sourceMissingMessage?: string;
  sourceMissingSeverity?: IssueSeverity;
  // If set, a second (or later) source cell is flagged with this message
  // instead of silently allowed — omit to allow multiple sources with no comment.
  sourceMultipleMessage?: string;
  sinkRoles?: Set<string>;
  sinkMissingMessage?: string;
  sinkMissingSeverity?: IssueSeverity;

  checkDuplicateEdges?: boolean;
  duplicateMessage?: string;
  checkComponents?: boolean;
  componentMessage?: string;

  // G4 — roles expected to carry a non-empty label.
  labeledRoles?: Set<string>;
  // G6 — Note/Constraint-like roles that get an info nudge (not a warning)
  // when they have no attaching edge at all.
  annotationRoles?: Set<string>;
  // G7 — roles where two cells sharing the same label are probably meant to
  // be distinct identities. Severity defaults to 'warning'; pass 'error' for
  // diagram types that treat the name as a hard identity (Class, ERD, DFD
  // process numbers).
  uniqueNameRoles?: Set<string>;
  uniqueNameSeverity?: IssueSeverity;
  uniqueNameMessage?: string;
}

function runStructuralChecks(
  graph: Graph,
  config: StructuralConfig,
): { issues: DiagramIssue[]; validVertices: Cell[]; edges: Cell[] } {
  const issues: DiagramIssue[] = [];
  const parent = graph.getDefaultParent();
  const vertices = graph.getChildVertices(parent);
  const edges = graph.getChildEdges(parent);
  // G2 — dangling connector ends, independent of palette membership below.
  issues.push(...checkDanglingEdges(edges, config.danglingOneEndExemptRoles));

  const validVertices: Cell[] = [];
  const sourceCells: Cell[] = [];
  const sinkCells: Cell[] = [];

  for (const cell of vertices) {
    // See the matching skip in validateFlowchart above — connector/line
    // shapes represent a connection, not a shape to grade.
    if (isConnectorCell(cell)) continue;

    const role = getShapeRole(cell);

    // Shapes from any section of the Shapes panel are fair game here too —
    // see the matching note in validateFlowchart above.
    validVertices.push(cell);

    const isSelfLoop = (cell.getEdges(false, false, true) ?? []).some(
      (e) => e.source === cell && e.target === cell,
    );
    if (isSelfLoop && !(role && config.selfLoopExemptRoles?.has(role))) {
      issues.push({ cell, severity: 'error', message: "A shape can't connect to itself — remove or redirect this connection." });
    }

    const incoming = cell.getEdges(true, false)?.length ?? 0;
    const outgoing = cell.getEdges(false, true)?.length ?? 0;

    if (role && config.sourceRoles?.has(role) && incoming === 0 && outgoing > 0) sourceCells.push(cell);
    if (role && config.sinkRoles?.has(role) && outgoing === 0 && incoming > 0) sinkCells.push(cell);

    if (incoming === 0 && outgoing === 0 && !(role && config.freeFloatingRoles?.has(role))) {
      issues.push({
        cell,
        severity: 'warning',
        message: config.disconnectedMessage ?? "This shape isn't connected to anything yet.",
      });
      continue;
    }

    if (role && config.branchingRoles?.has(role) && outgoing < 2) {
      issues.push({
        cell,
        severity: 'warning',
        message: config.branchingMessage ?? 'This shape usually needs two or more outgoing paths.',
      });
    }

    if (role && config.mergeRoles?.has(role)) {
      if (incoming < 2) {
        issues.push({
          cell,
          severity: 'warning',
          message: config.mergeMessage ?? 'This shape usually needs two or more incoming paths to merge.',
        });
      }
      if (outgoing > 1) {
        issues.push({
          cell,
          severity: 'warning',
          message: 'This shape branches into more than one outgoing path — it should rejoin the flow into a single path.',
        });
      }
    }

    if (role && config.forkRoles?.has(role)) {
      if (outgoing < 2) {
        issues.push({
          cell,
          severity: 'warning',
          message: config.forkMessage ?? 'This shape usually needs two or more outgoing parallel paths.',
        });
      }
      if (incoming > 1) {
        issues.push({
          cell,
          severity: 'warning',
          message: 'This shape has more than one incoming path — it should split from a single path.',
        });
      }
    }

    if (role && config.junctionRoles?.has(role) && incoming > 0 && outgoing > 0) {
      issues.push({
        cell,
        severity: 'warning',
        message: config.junctionMessage ? config.junctionMessage(role) : 'This shape should only be entered or exited, not both.',
      });
    }
  }

  if (validVertices.length >= 2 && edges.length >= 1) {
    if (config.sourceRoles && sourceCells.length === 0) {
      issues.push({ severity: config.sourceMissingSeverity ?? 'warning', message: config.sourceMissingMessage ?? 'This diagram has no clear starting point.' });
    } else if (config.sourceMultipleMessage && sourceCells.length > 1) {
      sourceCells.slice(1).forEach((cell) => {
        issues.push({ cell, severity: 'warning', message: config.sourceMultipleMessage! });
      });
    }
    if (config.sinkRoles && sinkCells.length === 0) {
      issues.push({ severity: config.sinkMissingSeverity ?? 'warning', message: config.sinkMissingMessage ?? 'This diagram has no clear ending point.' });
    }
  }

  if (config.checkDuplicateEdges) {
    const pairMap = new Map<Cell, Map<Cell, Cell[]>>();
    edges.forEach((edge) => {
      const { source, target } = edge;
      if (!source || !target || source === target) return;
      let inner = pairMap.get(source);
      if (!inner) {
        inner = new Map();
        pairMap.set(source, inner);
      }
      const list = inner.get(target) ?? [];
      list.push(edge);
      inner.set(target, list);
    });
    pairMap.forEach((inner) => {
      inner.forEach((edgeList) => {
        edgeList.slice(1).forEach((edge) => {
          issues.push({
            cell: edge,
            severity: 'warning',
            message: config.duplicateMessage ?? 'Duplicate connection — these two shapes are already linked by another line.',
          });
        });
      });
    });
  }

  if (config.checkComponents && validVertices.length > 0) {
    const validSet = new Set(validVertices);
    const visited = new Set<Cell>();
    const components: Cell[][] = [];

    for (const start of validVertices) {
      if (visited.has(start)) continue;
      const component: Cell[] = [];
      const queue: Cell[] = [start];
      visited.add(start);
      while (queue.length) {
        const current = queue.shift()!;
        component.push(current);
        const neighborEdges = current.getEdges(true, true, false) ?? [];
        for (const edge of neighborEdges) {
          const other = edge.source === current ? edge.target : edge.source;
          if (!other || visited.has(other) || !validSet.has(other)) continue;
          visited.add(other);
          queue.push(other);
        }
      }
      components.push(component);
    }

    if (components.length > 1) {
      const largest = components.reduce((a, b) => (b.length > a.length ? b : a));
      components.forEach((component) => {
        if (component === largest) return;
        component.forEach((cell) => {
          if ((cell.getEdges(true, true, false)?.length ?? 0) > 0) {
            issues.push({
              cell,
              severity: 'warning',
              message: config.componentMessage ?? "This shape's group isn't connected to the rest of the diagram.",
            });
          }
        });
      });
    }
  }

  // G1 — empty diagram (annotations alone don't count as content).
  const annotationRoles = config.annotationRoles ?? new Set<string>();
  const meaningfulCount = validVertices.filter((c) => !annotationRoles.has(getShapeRole(c) ?? '')).length;
  issues.push(...checkEmptyCanvas(meaningfulCount));

  // G4 — required names.
  if (config.labeledRoles) issues.push(...checkEmptyLabels(validVertices, config.labeledRoles));

  // G6 — orphaned annotations get an info nudge instead of no message at all.
  if (config.annotationRoles) issues.push(...checkOrphanAnnotations(validVertices, config.annotationRoles));

  // G7 — duplicate identity within a role.
  if (config.uniqueNameRoles) {
    issues.push(...checkDuplicateLabels(
      validVertices,
      config.uniqueNameRoles,
      config.uniqueNameSeverity ?? 'warning',
      config.uniqueNameMessage,
    ));
  }

  return { issues, validVertices, edges };
}

// ─── Functional Decomposition Diagram ───────────────────────────────────────
// Functions decompose top-down into sub-functions: every function but the
// root should have exactly one parent. Controls/Mechanisms/Interfaces attach
// to a function to annotate it, they don't chain into each other.
export function validateFDD(graph: Graph): DiagramIssue[] {
  const { issues, validVertices, edges } = runStructuralChecks(graph, {
    freeFloatingRoles: new Set(['fdd-note', 'boundary']),
    annotationRoles: new Set(['fdd-note']),
    labeledRoles: new Set(['function', 'external-entity']),
    uniqueNameRoles: new Set(['function']),
    uniqueNameMessage: 'Another function already uses this name — sibling functions should be distinct.',
    disconnectedMessage: "This shape isn't connected to the decomposition tree yet.",
    checkDuplicateEdges: true,
    checkComponents: true,
    componentMessage: "This shape's branch isn't connected to the rest of the decomposition tree.",
  });

  const functions = validVertices.filter((c) => getShapeRole(c) === 'function');
  const boundaries = validVertices.filter((c) => getShapeRole(c) === 'boundary');
  const externalEntities = validVertices.filter((c) => getShapeRole(c) === 'external-entity');

  // Control/Mechanism/Interface are edges (see CONNECTOR_SHAPE_IDS in
  // constants/shapes.ts), not vertices — a hierarchy (parent->child) link
  // is any OTHER edge touching a Function. Convention: an edge's own
  // source is the parent, its target the child, matching how every other
  // "connect two shapes" path in this app already treats source/target
  // (see createShapeInDirection in DiagramCanvas.tsx).
  const isAttachmentEdge = (edge: Cell) => {
    const role = getShapeRole(edge);
    return role === 'control' || role === 'mechanism' || role === 'fdd-interface';
  };

  const parentsOf = new Map<Cell, Cell[]>(); // function -> its parent function(s)
  const childrenOf = new Map<Cell, Cell[]>(); // function -> its child function(s)

  for (const fn of functions) {
    const parents = (fn.getEdges(true, false, false) ?? [])
      .filter((e) => !isAttachmentEdge(e))
      .map((e) => e.source)
      .filter((c): c is Cell => !!c && getShapeRole(c) === 'function');
    if (parents.length > 0) parentsOf.set(fn, parents);
    parents.forEach((p) => {
      const list = childrenOf.get(p) ?? [];
      list.push(fn);
      childrenOf.set(p, list);
    });

    // F2/1.2 — a tree allows at most one parent per function.
    if (parents.length > 1) {
      issues.push({ cell: fn, severity: 'error', message: 'This function has more than one parent — a decomposition diagram branches like a tree, so each function should have only one parent.' });
    }
  }

  // F4/1.3 — cycle detection over the parent->child hierarchy.
  findCycleRoots(childrenOf).forEach((cell) => {
    issues.push({ cell, severity: 'error', message: 'Circular decomposition detected — this chain of functions loops back on itself.' });
  });

  // F3/1.4/1.5 — exactly one root (a function with no parent) is expected.
  const roots = functions.filter((fn) => (parentsOf.get(fn) ?? []).length === 0);
  if (functions.length > 0 && roots.length === 0) {
    issues.push({ severity: 'error', message: 'No top-level function found — every function has a parent, which usually means there\'s a loop somewhere in the chain.' });
  } else if (roots.length > 1) {
    roots.slice(1).forEach((cell) => {
      issues.push({ cell, severity: 'warning', message: "More than one top-level function found — that's fine only if this diagram covers more than one system." });
    });
  }

  // F5/1.6 — a non-leaf function with exactly one child adds no real
  // decomposition; leaf functions (0 children) are completely fine.
  for (const fn of functions) {
    if ((childrenOf.get(fn) ?? []).length === 1) {
      issues.push({ cell: fn, severity: 'warning', message: 'This function has only one child — breaking it into just one part doesn\'t add anything. Merge it back in, or add another sibling function.' });
    }
  }

  // F7/1.9 — Control/Mechanism must attach to a Function (Interface's own
  // connectivity is already covered by G2's dangling-edge check above,
  // since it can legitimately touch an External Entity instead).
  for (const edge of edges) {
    const role = getShapeRole(edge);
    if (role !== 'control' && role !== 'mechanism') continue;
    const touchesFunction = (edge.source && getShapeRole(edge.source) === 'function')
      || (edge.target && getShapeRole(edge.target) === 'function');
    if (!touchesFunction) {
      issues.push({ cell: edge, severity: 'error', message: "Connect this to a Function shape — a Control or Mechanism always belongs to a function, it can't stand on its own." });
    }
  }

  // F6/1.8 — an External Entity can't be treated as a hierarchy node (a
  // child in the decomposition tree); it may only attach via a Control/
  // Mechanism/Interface annotation.
  for (const ee of externalEntities) {
    const treatedAsHierarchyNode = (ee.getEdges(true, true, false) ?? []).some((e) => {
      if (isAttachmentEdge(e)) return false;
      const other = e.source === ee ? e.target : e.source;
      return other && getShapeRole(other) === 'function';
    });
    if (treatedAsHierarchyNode) {
      issues.push({ cell: ee, severity: 'error', message: "An External Entity is outside the system, so it can't be a step in the decomposition tree — connect it through an Interface instead." });
    }
  }

  // 1.11 — an empty Boundary (no functions inside its bounds).
  for (const boundary of boundaries) {
    const bGeo = boundary.getGeometry();
    if (!bGeo) continue;
    const hasFunctionInside = functions.some((fn) => {
      const fGeo = fn.getGeometry();
      return fGeo && rectContains(bGeo, fGeo, 4);
    });
    if (!hasFunctionInside) {
      issues.push({ cell: boundary, severity: 'warning', message: 'This Boundary has no functions inside it yet.' });
    }
  }

  return issues;
}

// ─── Data Flow Diagram ──────────────────────────────────────────────────────
// Classic DFD rule (Gane/Sarson & Yourdon agree on this one): data can't jump
// straight from an External Entity to a Data Store, or entity-to-entity, or
// store-to-store — it always has to pass through a Process.
export function validateDFD(graph: Graph): DiagramIssue[] {
  // 3.7 (a process's outputs can't be derived from its inputs — "grey
  // hole") and 3.15/3.16 (context/level-0-specific rules) aren't checked:
  // both need information this tool doesn't model — the actual data
  // carried by a flow, and which "level" (context vs. detail) a given
  // canvas represents. Everything else in the DFD section is implemented.
  const { issues, validVertices, edges } = runStructuralChecks(graph, {
    freeFloatingRoles: new Set(['dfd-note', 'dfd-boundary']),
    annotationRoles: new Set(['dfd-note']),
    labeledRoles: new Set(['dfd-process', 'dfd-data-store', 'dfd-data-store-gs', 'dfd-external-entity']),
    uniqueNameRoles: new Set(['dfd-process']),
    uniqueNameMessage: 'Another Process already uses this number/name — process numbers should be unique.',
    junctionRoles: new Set(['dfd-on-page', 'dfd-off-page']),
    junctionMessage: () => 'Connector shapes should only be entered or exited, not both — use a Process shape for in-between steps.',
    checkDuplicateEdges: true,
    checkComponents: true,
  });

  const isStore = (role?: string) => role === 'dfd-data-store' || role === 'dfd-data-store-gs';
  const isEntity = (role?: string) => role === 'dfd-external-entity';
  const isFlow = (role?: string) => role === 'dfd-data-flow' || role === 'dfd-bidirectional';

  for (const edge of edges) {
    const { sourceRole, targetRole } = edgeRoles(edge);
    if (!sourceRole || !targetRole) continue;
    if (isEntity(sourceRole) && isEntity(targetRole)) {
      issues.push({ cell: edge, severity: 'error', message: 'Data can\'t flow directly between two External Entities — route it through a Process.' });
    } else if (isStore(sourceRole) && isStore(targetRole)) {
      issues.push({ cell: edge, severity: 'error', message: 'Data can\'t flow directly between two Data Stores — route it through a Process.' });
    } else if ((isEntity(sourceRole) && isStore(targetRole)) || (isStore(sourceRole) && isEntity(targetRole))) {
      issues.push({ cell: edge, severity: 'error', message: 'Data can\'t flow directly between an External Entity and a Data Store — route it through a Process.' });
    }

    // DFD4/3.11 — every flow should say what data it's carrying.
    if (isFlow(getShapeRole(edge)) && isBlankLabel(edge)) {
      issues.push({ cell: edge, severity: 'warning', message: 'Label this data flow with the data it carries.' });
    }
  }

  // DFD1/3.5-3.6 — a Process is a "black hole" with input but no output, or
  // a "miracle" with output but no input. Both are hard errors: either way
  // the data can't have come from/gone anywhere.
  for (const cell of validVertices) {
    if (getShapeRole(cell) !== 'dfd-process') continue;
    const incoming = cell.getEdges(true, false, false)?.length ?? 0;
    const outgoing = cell.getEdges(false, true, false)?.length ?? 0;
    if (incoming > 0 && outgoing === 0) {
      issues.push({ cell, severity: 'error', message: 'This process receives data but never sends any out — it\'s called a "black hole": data goes in and never comes back out.' });
    } else if (outgoing > 0 && incoming === 0) {
      issues.push({ cell, severity: 'error', message: 'This process sends out data but never receives any — it\'s called a "miracle": data appears from nowhere.' });
    }
  }

  // DFD2/3.8-3.9 — a Data Store should be both written to and read from.
  for (const cell of validVertices) {
    if (!isStore(getShapeRole(cell))) continue;
    const incoming = cell.getEdges(true, false, false)?.length ?? 0;
    const outgoing = cell.getEdges(false, true, false)?.length ?? 0;
    if (outgoing > 0 && incoming === 0) {
      issues.push({ cell, severity: 'warning', message: 'This Data Store is never written to — where does its data come from?' });
    } else if (incoming > 0 && outgoing === 0) {
      issues.push({ cell, severity: 'warning', message: 'This Data Store is never read from — its data is never used.' });
    }
  }

  return issues;
}

// ─── Entity Relationship Diagram ────────────────────────────────────────────
// Entities connect to each other only through a Relationship (diamond), never
// directly. Attributes belong to exactly one entity/relationship. Weak
// entities should hang off an Identifying Relationship, not a plain one.
// Finds whichever edge's midpoint sits closest to `cell` — used to associate
// a small standalone Cardinality marker (a vertex, not a real edge label in
// this palette) with the entity<->relationship leg it's meant to annotate.
// Purely a geometric heuristic since there's no structural link between a
// cardinality marker and "its" edge; a marker further than the threshold
// from every edge is treated as unclaimed.
function nearestEdge(cell: Cell, edges: Cell[], threshold = 80): Cell | null {
  const geo = cell.getGeometry();
  if (!geo) return null;
  const cx = geo.x + geo.width / 2;
  const cy = geo.y + geo.height / 2;
  let best: Cell | null = null;
  let bestDistance = Infinity;
  for (const edge of edges) {
    const sGeo = edge.source?.getGeometry();
    const tGeo = edge.target?.getGeometry();
    if (!sGeo || !tGeo) continue;
    const mx = (sGeo.x + sGeo.width / 2 + tGeo.x + tGeo.width / 2) / 2;
    const my = (sGeo.y + sGeo.height / 2 + tGeo.y + tGeo.height / 2) / 2;
    const distance = Math.hypot(cx - mx, cy - my);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = edge;
    }
  }
  return bestDistance <= threshold ? best : null;
}

export function validateERD(graph: Graph): DiagramIssue[] {
  // 4.10 (strong entity with no key attribute) and 4.12 (derived attribute
  // not actually derivable) aren't checked: the ERD palette has no distinct
  // "primary key" attribute shape to tell a key apart from a regular one,
  // and derivability is a semantic judgment this tool has no way to make.
  const { issues, validVertices, edges } = runStructuralChecks(graph, {
    labeledRoles: new Set(['erd-entity', 'erd-weak-entity', 'erd-attribute', 'erd-multivalued-attr', 'erd-derived-attr']),
    uniqueNameRoles: new Set(['erd-entity', 'erd-weak-entity']),
    uniqueNameSeverity: 'error',
    uniqueNameMessage: 'Another entity already uses this name — entity names must be unique.',
    checkDuplicateEdges: true,
    checkComponents: true,
  });

  const isEntity = (role?: string) => role === 'erd-entity' || role === 'erd-weak-entity';
  const isRelationship = (role?: string) => role === 'erd-relationship' || role === 'erd-identifying-rel';
  const isAttribute = (role?: string) =>
    role === 'erd-attribute' || role === 'erd-multivalued-attr' || role === 'erd-derived-attr';
  const isCardinality = (role?: string) =>
    !!role && role.startsWith('erd-cardinality-');

  const entityRelationshipEdges: Cell[] = [];

  for (const edge of edges) {
    const { sourceRole, targetRole } = edgeRoles(edge);

    // 4.1 — entities may only connect via a Relationship.
    if (isEntity(sourceRole) && isEntity(targetRole)) {
      issues.push({ cell: edge, severity: 'error', message: "Entities can't connect directly to each other — route the connection through a Relationship shape." });
    }

    // 4.3 — a Relationship diamond can't connect to another Relationship.
    if (isRelationship(sourceRole) && isRelationship(targetRole)) {
      issues.push({ cell: edge, severity: 'error', message: "Relationships can't connect to each other — a Relationship links Entities." });
    }

    if ((isEntity(sourceRole) && isRelationship(targetRole)) || (isRelationship(sourceRole) && isEntity(targetRole))) {
      entityRelationshipEdges.push(edge);
    }

    // 4.7 (edge-form cardinality misuse) — a cardinality marker is now a
    // real connector (see CONNECTOR_SHAPE_IDS), so one dragged straight onto
    // an attribute link never lands in entityRelationshipEdges above (an
    // attribute is neither an Entity nor a Relationship) and was falling
    // through every check below unflagged — only the legacy free-floating-
    // vertex form of this same marker had the equivalent guard (see the
    // cardinalityVertices loop further down).
    if (isCardinality(getShapeRole(edge)) && (isAttribute(sourceRole) || isAttribute(targetRole))) {
      issues.push({ cell: edge, severity: 'error', message: 'Cardinality markers belong on the line between an Entity and a Relationship, not on an attribute line.' });
    }
  }

  for (const cell of validVertices) {
    const role = getShapeRole(cell);

    if (isAttribute(role)) {
      const links = cell.getEdges(true, true, false) ?? [];
      // 4.4 / 4.5 — an attribute must belong to exactly one owner.
      if (links.length === 0) {
        issues.push({ cell, severity: 'error', message: 'This Attribute has no owner — connect it to the Entity or Relationship it belongs to.' });
      } else if (links.length > 1) {
        issues.push({ cell, severity: 'error', message: 'This Attribute is linked to more than one shape — an attribute belongs to a single Entity or Relationship.' });
      }
    }

    if (isRelationship(role)) {
      const linkedEntities = (cell.getEdges(true, true, false) ?? []).filter((e) => {
        const other = e.source === cell ? e.target : e.source;
        return other && isEntity(getShapeRole(other));
      });
      // 4.2 — a relationship needs at least two entity legs (the same
      // entity twice, for a recursive relationship, still counts as two).
      if (linkedEntities.length < 2) {
        issues.push({ cell, severity: 'error', message: 'A Relationship needs to connect to at least two Entities (the same Entity twice is fine for a relationship that loops back to itself).' });
      }
    }

    if (role === 'erd-weak-entity') {
      // 4.6 — a weak entity must be identified through an Identifying
      // Relationship specifically, not just any relationship.
      const linkedToIdentifying = (cell.getEdges(true, true, false) ?? []).some((e) => {
        const other = e.source === cell ? e.target : e.source;
        return other && getShapeRole(other) === 'erd-identifying-rel';
      });
      if (!linkedToIdentifying) {
        issues.push({ cell, severity: 'error', message: 'A Weak Entity must connect to its owner through an Identifying Relationship.' });
      }
    }

    // 4.9 — an entity with zero attributes carries no data.
    if (isEntity(role)) {
      const hasAttribute = (cell.getEdges(true, true, false) ?? []).some((e) => {
        const other = e.source === cell ? e.target : e.source;
        return other && isAttribute(getShapeRole(other));
      });
      if (!hasAttribute) {
        issues.push({ cell, severity: 'warning', message: 'This Entity has no attributes yet.' });
      }
    }
  }

  // 4.7 / 4.8 — cardinality markers belong on entity<->relationship legs,
  // not on attribute links, and every leg should carry one. Cardinality
  // markers are real edges now (see CONNECTOR_SHAPE_IDS in
  // constants/shapes.ts) — dropped straight onto/between an entity and a
  // relationship, the marker itself *is* that leg's connector, so it
  // satisfies 4.8 the instant it links the two. Diagrams saved before that
  // change still have cardinality as a small free-floating vertex placed
  // near a separate connecting edge — nearestEdge's proximity heuristic
  // keeps recognizing those exactly as it always did.
  const claimedEdges = new Set<Cell>();
  for (const edge of entityRelationshipEdges) {
    if (isCardinality(getShapeRole(edge))) claimedEdges.add(edge);
  }

  const cardinalityVertices = validVertices.filter((c) => isCardinality(getShapeRole(c)));
  for (const marker of cardinalityVertices) {
    const edge = nearestEdge(marker, edges);
    if (!edge) continue;
    const { sourceRole, targetRole } = edgeRoles(edge);
    if (isAttribute(sourceRole) || isAttribute(targetRole)) {
      issues.push({ cell: marker, severity: 'error', message: 'Cardinality markers belong on the line between an Entity and a Relationship, not on an attribute line.' });
    } else {
      claimedEdges.add(edge);
    }
  }
  for (const edge of entityRelationshipEdges) {
    if (!claimedEdges.has(edge)) {
      issues.push({ cell: edge, severity: 'warning', message: 'This connection has no cardinality marker yet — add one to show how many (1, N, M).' });
    }
  }

  // 4.14 — duplicate attribute names, scoped per-owner (the same attribute
  // name on two different entities is completely normal; only a repeat
  // under the same owner is a conflict).
  const attributesByOwner = new Map<Cell, Cell[]>();
  for (const cell of validVertices) {
    if (!isAttribute(getShapeRole(cell))) continue;
    const owner = (cell.getEdges(true, true, false) ?? [])
      .map((e) => (e.source === cell ? e.target : e.source))
      .find((other): other is Cell => !!other && (isEntity(getShapeRole(other)) || isRelationship(getShapeRole(other))));
    if (!owner) continue;
    const list = attributesByOwner.get(owner) ?? [];
    list.push(cell);
    attributesByOwner.set(owner, list);
  }
  attributesByOwner.forEach((attrs) => {
    const seen = new Set<string>();
    for (const attr of attrs) {
      if (isBlankLabel(attr)) continue;
      const key = (attr.getValue() as string).trim().toLowerCase();
      if (seen.has(key)) {
        issues.push({ cell: attr, severity: 'error', message: 'Another attribute on this same owner already uses this name.' });
      } else {
        seen.add(key);
      }
    }
  });

  return issues;
}

// ─── Fishbone (Ishikawa) Diagram ────────────────────────────────────────────
// One effect box, causes branch off the spine, sub-causes branch off a cause
// — not straight off the spine/head themselves.
export function validateFishbone(graph: Graph): DiagramIssue[] {
  const mainCauseRoles = new Set(['fishbone-cause-top', 'fishbone-cause-bottom']);
  const subCauseRoles = new Set(['fishbone-sub-top', 'fishbone-sub-bottom']);
  const causeRoles = new Set([...mainCauseRoles, ...subCauseRoles, 'fishbone-tertiary']);

  // Cause shapes are real edges now (see CONNECTOR_SHAPE_IDS in
  // constants/shapes.ts) — dragged directly onto the spine/their parent
  // cause like any other connector instead of sitting as a fixed-angle
  // floating box a separate connector had to be drawn onto to count as
  // "attached". runStructuralChecks' validVertices only ever holds real
  // vertices (it skips isConnectorCell cells entirely), so every check
  // below that used to read a cause *vertex*'s own edges now reads the
  // cause *edge*'s own source/target roles directly instead — same
  // structural question ("is this attached to the right kind of parent"),
  // just answered the way an edge answers it rather than a vertex.
  const { issues, validVertices, edges } = runStructuralChecks(graph, {
    freeFloatingRoles: new Set(['fishbone-note', 'fishbone-spine']),
    annotationRoles: new Set(['fishbone-note']),
    labeledRoles: new Set(['fishbone-head', 'fishbone-problem', 'fishbone-category']),
    // The spine's tail end (whichever of source/target the Fish Head didn't
    // claim) is permanently dangling by design — see checkDanglingEdges'
    // matching comment and attachSpineToHead in DiagramCanvas.tsx. Without
    // this, G2 flagged every single fishbone spine as broken forever, with
    // no way to actually resolve it (there's nothing to drag onto that end).
    danglingOneEndExemptRoles: new Set(['fishbone-spine']),
    disconnectedMessage: "This shape isn't connected to the fishbone yet.",
  });

  const causeEdges = edges.filter((e) => causeRoles.has(getShapeRole(e) ?? ''));

  // The spine is a real edge now too (see CONNECTOR_SHAPE_IDS) — checked
  // across both validVertices and edges so an older saved diagram that
  // still has it as a plain vertex keeps validating exactly as before.
  const spines = [...validVertices, ...edges].filter((c) => getShapeRole(c) === 'fishbone-spine');
  // 5.1/5.2 — exactly one spine expected.
  if ((validVertices.length > 0 || edges.length > 0) && spines.length === 0) {
    issues.push({ severity: 'error', message: 'This fishbone diagram has no spine yet — add one to anchor the cause branches.' });
  } else if (spines.length > 1) {
    spines.slice(1).forEach((cell) => {
      issues.push({ cell, severity: 'warning', message: 'A fishbone diagram should only have one spine.' });
    });
  }

  const heads = validVertices.filter((c) => getShapeRole(c) === 'fishbone-head' || getShapeRole(c) === 'fishbone-problem');
  // 5.3 — no effect/fish head at all.
  if (validVertices.length > 0 && heads.length === 0) {
    issues.push({ severity: 'error', message: 'This fishbone diagram has no Fish Head or Effect Box yet — the problem statement is missing.' });
  } else if (heads.length > 1) {
    heads.slice(1).forEach((cell) => {
      issues.push({ cell, severity: 'warning', message: 'A fishbone diagram should only have one Fish Head or Effect Box.' });
    });
  }
  // 5.9 — the effect exists but nothing feeds into it yet. Checking
  // head.getEdges() alone stopped meaning that the moment the spine became
  // a real edge in its own right: the spine's own connection to the head
  // always satisfies "head has an edge", regardless of whether any Main
  // Cause is actually attached to that spine — so this used to always pass
  // once a spine existed, even on a diagram with zero causes anywhere.
  // Checks the actual causal chain instead: is any cause edge attached to
  // any spine at all.
  const anyCauseOnSpine = causeEdges.some((e) => {
    const { sourceRole, targetRole } = edgeRoles(e);
    return sourceRole === 'fishbone-spine' || targetRole === 'fishbone-spine';
  });
  heads.forEach((head) => {
    const headEdges = head.getEdges(true, true, false) ?? [];
    if (headEdges.length === 0 || !anyCauseOnSpine) {
      issues.push({ cell: head, severity: 'warning', message: 'No causes lead into this effect yet — no analysis has been added.' });
    }
  });

  // 5.5 — a Main Cause must attach to the spine. Dangling ends (neither
  // terminal a real cell) are already reported separately by G2's
  // checkDanglingEdges inside runStructuralChecks above, so this only
  // needs to ask "is the spine one of this cause's two real endpoints".
  for (const edge of causeEdges) {
    const role = getShapeRole(edge);
    if (!role || !mainCauseRoles.has(role)) continue;
    const { sourceRole, targetRole } = edgeRoles(edge);
    const attachedToSpine = sourceRole === 'fishbone-spine' || targetRole === 'fishbone-spine';
    if (!attachedToSpine) {
      issues.push({ cell: edge, severity: 'error', message: 'This Main Cause should branch from the spine.' });
    }
  }

  // 5.6/5.7/5.8 — sub-causes branch from a Main Cause, tertiary causes
  // branch from a Sub-Cause; a cause attached straight to the spine (or to
  // nothing at all) is wrong at any level.
  for (const edge of causeEdges) {
    const role = getShapeRole(edge);
    if (!role || (!subCauseRoles.has(role) && role !== 'fishbone-tertiary')) continue;
    const parentRoles = role === 'fishbone-tertiary' ? subCauseRoles : mainCauseRoles;
    const { sourceCell, targetCell, sourceRole, targetRole } = edgeRoles(edge);
    const connectedToExpectedParent = (!!sourceRole && parentRoles.has(sourceRole)) || (!!targetRole && parentRoles.has(targetRole));
    if (!connectedToExpectedParent) {
      const expected = role === 'fishbone-tertiary' ? 'a Sub-Cause' : 'a Main Cause';
      if (!sourceCell && !targetCell) {
        issues.push({ cell: edge, severity: 'error', message: `This cause isn't connected to anything — every cause should branch from ${expected}.` });
      } else {
        // Whichever end is actually a real cell is what this is wrongly
        // attached to — used to be hardcoded as "the spine" regardless,
        // which was just false whenever the real culprit was something
        // else entirely (a Category Box, the Fish Head, another cause).
        const wrongRole = (sourceCell ? sourceRole : targetRole) ?? undefined;
        const wrongLabel = (wrongRole && getShapeDefinitionById(wrongRole)?.label) || 'this';
        issues.push({ cell: edge, severity: 'warning', message: `This should branch from ${expected}, not attach directly to ${wrongLabel}.` });
      }
    }
  }

  // 5.10 — categories populated on only one side of the spine (info-level
  // style hint, not a real error). Compares the *-top vs *-bottom role
  // families rather than geometry, since "top"/"bottom" is already baked
  // into the shape choice itself.
  const topRoles = new Set(['fishbone-cause-top', 'fishbone-sub-top']);
  const bottomRoles = new Set(['fishbone-cause-bottom', 'fishbone-sub-bottom']);
  const hasTop = causeEdges.some((e) => topRoles.has(getShapeRole(e) ?? ''));
  const hasBottom = causeEdges.some((e) => bottomRoles.has(getShapeRole(e) ?? ''));
  if (hasTop !== hasBottom && (hasTop || hasBottom)) {
    issues.push({ severity: 'info', message: 'Only one side of the spine has causes on it — consider balancing categories across both sides.' });
  }

  return issues;
}

// ─── Schematic (electrical) Diagram ─────────────────────────────────────────
// Every two-terminal component needs both terminals wired; a circuit needs a
// source and a ground. Parallel wiring (multiple wires between the same two
// points) is completely normal here, so duplicate-edge checking is skipped.
// p1->p2 and p3->p4 as line SEGMENTS (not infinite lines) — used by
// Schematic's crossing-without-a-junction check (6.9). Intersections at/near
// either segment's own endpoints are excluded (t/u near 0 or 1): that's just
// two wires sharing a terminal, completely normal, not a crossing.
function segmentIntersection(
  p1: { x: number; y: number }, p2: { x: number; y: number },
  p3: { x: number; y: number }, p4: { x: number; y: number },
): { x: number; y: number } | null {
  const d1x = p2.x - p1.x, d1y = p2.y - p1.y;
  const d2x = p4.x - p3.x, d2y = p4.y - p3.y;
  const denom = d1x * d2y - d1y * d2x;
  if (Math.abs(denom) < 1e-9) return null;
  const t = ((p3.x - p1.x) * d2y - (p3.y - p1.y) * d2x) / denom;
  const u = ((p3.x - p1.x) * d1y - (p3.y - p1.y) * d1x) / denom;
  const margin = 0.02;
  if (t <= margin || t >= 1 - margin || u <= margin || u >= 1 - margin) return null;
  return { x: p1.x + t * d1x, y: p1.y + t * d1y };
}

function cellCenter(cell: Cell): { x: number; y: number } | null {
  const geo = cell.getGeometry();
  return geo ? { x: geo.x + geo.width / 2, y: geo.y + geo.height / 2 } : null;
}

export function validateSchematic(graph: Graph): DiagramIssue[] {
  // 6.7 (diode/LED polarity vs. current direction) and 6.8 (whether the
  // only conduction path happens to be blocked) aren't checked — both need
  // an actual circuit simulation (direction of current flow through the
  // whole network), which is well beyond a structural/graph check.
  const { issues, validVertices, edges } = runStructuralChecks(graph, {
    freeFloatingRoles: new Set(['schematic-no-connection']),
    disconnectedMessage: "This component isn't wired into the circuit yet.",
  });

  const twoTerminalRoles = new Set([
    'schematic-battery', 'schematic-ac', 'schematic-resistor', 'schematic-variable-resistor',
    'schematic-capacitor', 'schematic-inductor', 'schematic-diode', 'schematic-led',
    'schematic-switch', 'schematic-fuse',
  ]);
  const sourceRoles = new Set(['schematic-battery', 'schematic-ac']);

  // SC1/6.1 — every terminal must be wired, and SC6/6.6 — NPN needs Base,
  // Collector, and Emitter individually. Each wire drawn since pin-accurate
  // wiring was added (see applySchematicPinSnap in DiagramCanvas.tsx) knows
  // exactly which named lead it's on, stamped onto the edge's own style as
  // schematicSourcePin/schematicTargetPin — a real persisted key, not
  // shape-role tagging's in-memory WeakMap (getShapeRole above), so it
  // survives a reload. That lets "is every terminal wired" catch what the
  // old proxy couldn't: two wires both landing on the same lead, leaving
  // another one bare, which "at least N wires touch this component" alone
  // can't tell apart from every lead being covered. A component with any
  // untagged wire (drawn before this feature existed, or a self-loop) falls
  // back to the original link-count proxy instead of guessing.
  for (const cell of validVertices) {
    const role = getShapeRole(cell);
    if (!role) continue;
    const pins = SCHEMATIC_PIN_DEFINITIONS[role];
    const cellEdges = cell.getEdges(true, true, false) ?? [];
    const linkCount = cellEdges.length;

    if (pins && pins.length > 1 && linkCount > 0) {
      const wiredPinIds = new Set<string>();
      let everyEdgeTagged = true;
      for (const edge of cellEdges) {
        const style = edge.getStyle();
        const styleObj = (typeof style === 'object' && style !== null ? style : {}) as Record<string, unknown>;
        const pinId = edge.getTerminal(true) === cell ? styleObj.schematicSourcePin : styleObj.schematicTargetPin;
        if (typeof pinId === 'string') {
          wiredPinIds.add(pinId);
        } else {
          everyEdgeTagged = false;
        }
      }

      if (everyEdgeTagged) {
        const unwired = pins.filter((pin) => !wiredPinIds.has(pin.id));
        if (unwired.length > 0) {
          const names = unwired.length === 1
            ? unwired[0].label
            : `${unwired.slice(0, -1).map((pin) => pin.label).join(', ')} and ${unwired[unwired.length - 1].label}`;
          const verb = unwired.length === 1 ? "isn't" : "aren't";
          const noun = role === 'schematic-npn' ? 'transistor' : 'component';
          const severity: IssueSeverity = role === 'schematic-npn' ? 'warning' : 'error';
          issues.push({ cell, severity, message: `This ${noun}'s ${names} ${verb} wired yet.` });
        }
        continue;
      }
    }

    if (twoTerminalRoles.has(role) && linkCount === 1) {
      issues.push({ cell, severity: 'error', message: 'This component only has one terminal wired — connect the other end too.' });
    }
    if (role === 'schematic-npn' && linkCount > 0 && linkCount < 3) {
      issues.push({ cell, severity: 'warning', message: 'This transistor has an unconnected terminal — Base, Collector, and Emitter should all be wired.' });
    }
  }

  const sources = validVertices.filter((c) => sourceRoles.has(getShapeRole(c) ?? ''));
  const grounds = validVertices.filter((c) => getShapeRole(c) === 'schematic-ground');

  if (validVertices.length > 1) {
    // SC3/6.3 — no source at all.
    if (sources.length === 0) {
      issues.push({ severity: 'warning', message: 'This circuit has no power source — add a DC or AC Voltage Source.' });
    } else {
      // SC2/6.2 — a source needs to sit on a closed loop, or current has
      // nowhere to flow. This model has one node per component (not per
      // pin), so "on a loop" reduces to "on some undirected cycle in the
      // wiring graph" — a source with only tree-shaped (branch, no cycle)
      // wiring around it can't complete a circuit.
      const adjacency = new Map<Cell, Cell[]>();
      const addAdjacency = (a: Cell, b: Cell) => {
        const list = adjacency.get(a) ?? [];
        list.push(b);
        adjacency.set(a, list);
      };
      for (const edge of edges) {
        if (!edge.source || !edge.target || edge.source === edge.target) continue;
        if (!validVertices.includes(edge.source) || !validVertices.includes(edge.target)) continue;
        addAdjacency(edge.source, edge.target);
        addAdjacency(edge.target, edge.source);
      }
      const cyclicCells = new Set<Cell>();
      const visited = new Set<Cell>();
      const dfs = (cell: Cell, parent: Cell | null, stack: Cell[]) => {
        visited.add(cell);
        stack.push(cell);
        for (const next of adjacency.get(cell) ?? []) {
          if (next === parent) continue;
          const idx = stack.indexOf(next);
          if (idx !== -1) {
            stack.slice(idx).forEach((c) => cyclicCells.add(c));
          } else if (!visited.has(next)) {
            dfs(next, cell, stack);
          }
        }
        stack.pop();
      };
      for (const cell of validVertices) {
        if (!visited.has(cell)) dfs(cell, null, []);
      }
      sources.forEach((source) => {
        if (!cyclicCells.has(source)) {
          issues.push({ cell: source, severity: 'error', message: "This source isn't part of a closed loop — no current can flow." });
        }
      });
    }

    // SC4/6.4 — no ground reference.
    if (grounds.length === 0) {
      issues.push({ severity: 'warning', message: 'This circuit has no ground reference — add a Ground shape to complete the return path.' });
    } else if (grounds.length > 1) {
      // 6.12 — informational only; multiple grounds are electrically fine (one net).
      issues.push({ severity: 'info', message: 'This circuit has more than one Ground — they\'re treated as the same reference net.' });
    }
  }

  // SC5/6.5 — a source shorted by a bare wire across its own two terminals
  // is, in this one-cell-per-component model, exactly a self-loop on the
  // source — already caught by the generic self-loop check above (Schematic
  // doesn't exempt any role from it), so nothing further is needed here.

  // 6.9 — wires crossing with neither a Wire Connection (joined) nor a No
  // Connection (crossing) marker at the crossing point is ambiguous.
  const junctionMarkers = validVertices.filter((c) => {
    const role = getShapeRole(c);
    return role === 'schematic-connection' || role === 'schematic-no-connection';
  });
  const flaggedCrossings = new Set<string>();
  for (let i = 0; i < edges.length; i++) {
    for (let j = i + 1; j < edges.length; j++) {
      const a = edges[i];
      const b = edges[j];
      if (!a.source || !a.target || !b.source || !b.target) continue;
      if ([a.source, a.target].some((c) => c === b.source || c === b.target)) continue; // sharing a terminal isn't a crossing
      const p1 = cellCenter(a.source);
      const p2 = cellCenter(a.target);
      const p3 = cellCenter(b.source);
      const p4 = cellCenter(b.target);
      if (!p1 || !p2 || !p3 || !p4) continue;
      const hit = segmentIntersection(p1, p2, p3, p4);
      if (!hit) continue;
      const key = `${Math.round(hit.x)}:${Math.round(hit.y)}`;
      if (flaggedCrossings.has(key)) continue;
      const hasMarker = junctionMarkers.some((m) => {
        const c = cellCenter(m);
        return c && Math.hypot(c.x - hit.x, c.y - hit.y) <= 20;
      });
      if (!hasMarker) {
        flaggedCrossings.add(key);
        issues.push({ cell: a, severity: 'warning', message: 'These wires cross with no Wire Connection or No Connection marker — mark whether they join or just cross.' });
      }
    }
  }

  // 6.10 — two components sitting close enough to visually touch with no
  // wire actually drawn between them reads as an implicit (and ambiguous)
  // connection.
  for (let i = 0; i < validVertices.length; i++) {
    for (let j = i + 1; j < validVertices.length; j++) {
      const a = validVertices[i];
      const b = validVertices[j];
      const aGeo = a.getGeometry();
      const bGeo = b.getGeometry();
      if (!aGeo || !bGeo || !rectsOverlap(aGeo, bGeo)) continue;
      const alreadyWired = (a.getEdges(true, true, false) ?? []).some((e) => e.source === b || e.target === b);
      if (!alreadyWired) {
        issues.push({ cell: a, severity: 'warning', message: 'This component overlaps another with no wire between them — an implicit connection like this is ambiguous.' });
      }
    }
  }

  return issues;
}

// ─── Use Case Diagram ───────────────────────────────────────────────────────
export function validateUseCase(graph: Graph): DiagramIssue[] {
  const { issues, validVertices, edges } = runStructuralChecks(graph, {
    freeFloatingRoles: new Set(['uc-note', 'system-boundary']),
    annotationRoles: new Set(['uc-note']),
    labeledRoles: new Set(['uc-actor', 'use-case']),
    uniqueNameRoles: new Set(['use-case']),
    uniqueNameMessage: 'Another use case already uses this name.',
    checkDuplicateEdges: true,
  });

  const isActor = (role?: string) => role === 'uc-actor';
  const isUseCase = (role?: string) => role === 'use-case';

  // Note: earlier code here compared sourceRole/targetRole (the roles of
  // the CONNECTED cells) against 'uc-association' etc — that only ever
  // matched when Association/Include/Extend were themselves vertices sitting
  // between two shapes. They're real edges now (see CONNECTOR_SHAPE_IDS), so
  // the relationship kind has to come from the edge's own role instead.
  const includeExtendAdjacency = new Map<Cell, Cell[]>();
  const generalizationAdjacency = new Map<Cell, Cell[]>();

  for (const edge of edges) {
    const edgeRole = getShapeRole(edge);
    const { sourceCell, targetCell, sourceRole, targetRole } = edgeRoles(edge);
    if (!sourceCell || !targetCell) continue;

    if (edgeRole === 'uc-association') {
      // UC2 — Association connects Actor <-> Use Case only.
      if (isActor(sourceRole) && isActor(targetRole)) {
        issues.push({ cell: edge, severity: 'error', message: 'This Association connects two Actors — associations link an Actor to a Use Case instead.' });
      } else if (isUseCase(sourceRole) && isUseCase(targetRole)) {
        issues.push({ cell: edge, severity: 'error', message: 'This Association connects two Use Cases — use Include or Extend instead.' });
      } else if (!((isActor(sourceRole) && isUseCase(targetRole)) || (isUseCase(sourceRole) && isActor(targetRole)))) {
        issues.push({ cell: edge, severity: 'error', message: 'This Association should connect an Actor to a Use Case.' });
      }
    } else if (edgeRole === 'uc-include' || edgeRole === 'uc-extend') {
      // UC3 — Include/Extend connect Use Case -> Use Case only.
      if (isActor(sourceRole) || isActor(targetRole)) {
        issues.push({ cell: edge, severity: 'error', message: "Include and Extend relationships connect two Use Cases — an Actor can't be one of the endpoints." });
      } else {
        const list = includeExtendAdjacency.get(sourceCell) ?? [];
        list.push(targetCell);
        includeExtendAdjacency.set(sourceCell, list);
      }
    } else if (edgeRole === 'uc-generalization') {
      // UC4 — Generalization is between like kinds only (actor-actor or use case-use case).
      if (sourceCell === targetCell) {
        issues.push({ cell: edge, severity: 'error', message: "A use case or actor can't generalize itself." });
      } else if (!((isActor(sourceRole) && isActor(targetRole)) || (isUseCase(sourceRole) && isUseCase(targetRole)))) {
        issues.push({ cell: edge, severity: 'error', message: 'Generalization must connect two Actors or two Use Cases, not a mix.' });
      } else {
        const list = generalizationAdjacency.get(sourceCell) ?? [];
        list.push(targetCell);
        generalizationAdjacency.set(sourceCell, list);
      }
    }
  }

  // UC7 — no cycles in either chain.
  findCycleRoots(includeExtendAdjacency).forEach((cell) => {
    issues.push({ cell, severity: 'error', message: 'Circular Include/Extend detected — this chain of use cases loops back on itself.' });
  });
  findCycleRoots(generalizationAdjacency).forEach((cell) => {
    issues.push({ cell, severity: 'error', message: 'Circular Generalization detected — this chain loops back on itself.' });
  });

  const actors = validVertices.filter((c) => isActor(getShapeRole(c)));
  const useCases = validVertices.filter((c) => isUseCase(getShapeRole(c)));
  const boundaries = validVertices.filter((c) => getShapeRole(c) === 'system-boundary');

  // UC1 — at least one actor (soft) and one use case (hard).
  if (validVertices.length > 0 && actors.length === 0) {
    issues.push({ severity: 'warning', message: 'This use case diagram has no actor yet.' });
  }
  if (validVertices.length > 0 && useCases.length === 0) {
    issues.push({ severity: 'error', message: 'This use case diagram has no use case yet — nothing for the system to do.' });
  }

  // UC5/7.7 — every use case should reach an Actor, directly or through a
  // chain of Include/Extend/Association edges (undirected — association
  // has no inherent direction, and either end of include/extend can be
  // "closer" to the actor depending on how it was drawn).
  if (actors.length > 0) {
    const visited = new Set<Cell>(actors);
    const queue: Cell[] = [...actors];
    while (queue.length) {
      const current = queue.shift()!;
      for (const e of current.getEdges(true, true, false) ?? []) {
        const other = e.source === current ? e.target : e.source;
        if (other && !visited.has(other)) {
          visited.add(other);
          queue.push(other);
        }
      }
    }
    useCases.forEach((uc) => {
      if (!visited.has(uc)) {
        issues.push({ cell: uc, severity: 'warning', message: "This use case isn't reachable from any Actor — who triggers it?" });
      }
    });
  }

  // UC6/7.9-7.10 — actors sit outside the System Boundary, use cases inside it.
  boundaries.forEach((boundary) => {
    const bGeo = boundary.getGeometry();
    if (!bGeo) return;
    actors.forEach((actor) => {
      const aGeo = actor.getGeometry();
      if (aGeo && rectContains(bGeo, aGeo, -4)) {
        issues.push({ cell: actor, severity: 'warning', message: 'Actors should sit outside the System Boundary.' });
      }
    });
    useCases.forEach((uc) => {
      const ucGeo = uc.getGeometry();
      if (ucGeo && !rectContains(bGeo, ucGeo, 4)) {
        issues.push({ cell: uc, severity: 'warning', message: 'Use cases should sit inside the System Boundary.' });
      }
    });
  });

  return issues;
}

// ─── Activity Diagram ───────────────────────────────────────────────────────
export function validateActivity(graph: Graph): DiagramIssue[] {
  // 8.13 (Object Flow between two pure-control nodes) isn't checked — this
  // palette has no distinct "object/pin" node to tell an object flow's
  // real endpoints apart from a control node's.
  const freeFloatingRoles = new Set(['act-note', 'act-constraint', 'act-swimlane']);
  const { issues, validVertices } = runStructuralChecks(graph, {
    freeFloatingRoles,
    annotationRoles: new Set(['act-note', 'act-constraint']),
    labeledRoles: new Set(['act-activity']),
    branchingRoles: new Set(['act-decision']),
    branchingMessage: 'Decision shapes usually need two or more outgoing paths (e.g. guard conditions).',
    mergeRoles: new Set(['act-join']),
    mergeMessage: 'Join shapes usually combine two or more incoming parallel paths back into one.',
    forkRoles: new Set(['act-fork']),
    forkMessage: 'Fork shapes usually split into two or more parallel paths.',
    junctionRoles: new Set(['act-initial-node', 'act-final-node', 'act-flow-final']),
    junctionMessage: (role) =>
      role === 'act-initial-node'
        ? 'An Initial Node should only be exited, never entered.'
        : 'A Final Node should only be entered, never exited.',
    sourceRoles: new Set(['act-initial-node']),
    sourceMissingMessage: 'This activity diagram has no Initial Node — add one with nothing feeding into it.',
    sourceMissingSeverity: 'error',
    sourceMultipleMessage: 'An activity diagram usually has a single entry point per partition — consider merging these into one Initial Node.',
    sinkRoles: new Set(['act-final-node', 'act-flow-final']),
    sinkMissingMessage: 'This activity diagram has no Final Node — add one with nothing leading out of it.',
    checkDuplicateEdges: true,
    checkComponents: true,
  });

  // 8.9 — every branch out of a Decision should carry its guard condition.
  for (const cell of validVertices) {
    if (getShapeRole(cell) !== 'act-decision') continue;
    for (const edge of cell.getEdges(false, true, false) ?? []) {
      if (isBlankLabel(edge)) {
        issues.push({ cell: edge, severity: 'warning', message: 'Label this branch with its guard condition (e.g. [approved]).' });
      }
    }
  }

  // AC6/8.12 — reachability from Initial Node and to a Final Node. Notes,
  // Constraints and Swimlane lanes (freeFloatingRoles) are annotations/
  // partitions, not control-flow steps — they're deliberately exempt from
  // even having to be *connected* at all (see freeFloatingRoles above), so
  // an unconnected one trivially can't be "reached" either. Without this
  // exclusion, every ordinary unattached Note or Swimlane lane in a diagram
  // that already has an Initial/Final Node — which is nearly always — got
  // flagged here too, on top of (or instead of) the actually-relevant
  // orphaned-annotation nudge from runStructuralChecks.
  const initials = validVertices.filter((c) => getShapeRole(c) === 'act-initial-node');
  const finals = validVertices.filter((c) => {
    const role = getShapeRole(c);
    return role === 'act-final-node' || role === 'act-flow-final';
  });
  if (initials.length > 0) {
    const reachable = reachableForward(initials);
    validVertices.forEach((cell) => {
      const role = getShapeRole(cell);
      if (role && freeFloatingRoles.has(role)) return;
      if (!reachable.has(cell)) {
        issues.push({ cell, severity: 'warning', message: "This can't be reached from the Initial Node — check the connections leading to it." });
      }
    });
  }
  if (finals.length > 0) {
    const canReachFinal = reachableBackward(finals);
    validVertices.forEach((cell) => {
      const role = getShapeRole(cell);
      if (role && freeFloatingRoles.has(role)) return;
      if (!canReachFinal.has(cell)) {
        issues.push({ cell, severity: 'warning', message: "This can't reach any Final Node — it leads into a loop or dead branch with no way out." });
      }
    });
  }

  // AC7/8.11 — a Fork bar (in=1, out>=2) should be balanced by a Join bar
  // (in>=2, out=1) downstream. Both share the exact same synchronization-bar
  // shape in real UML notation, so this reads each qualifying cell's own
  // in/out degree rather than trusting its role alone to say which one it's
  // acting as — a bar tagged 'act-join' that actually has fork-shaped
  // degree (e.g. reused/dragged from the wrong palette entry) still counts
  // toward whichever side its wiring actually matches. "Balance" is
  // approximated as "at least as many join-pattern bars as fork-pattern
  // bars", not a full path-matched pairing.
  const forkJoinCells = validVertices.filter((c) => {
    const role = getShapeRole(c);
    return role === 'act-fork' || role === 'act-join';
  });
  const forkPattern: Cell[] = [];
  let joinPatternCount = 0;
  for (const cell of forkJoinCells) {
    const incoming = cell.getEdges(true, false, false)?.length ?? 0;
    const outgoing = cell.getEdges(false, true, false)?.length ?? 0;
    if (incoming <= 1 && outgoing >= 2) forkPattern.push(cell);
    else if (incoming >= 2 && outgoing <= 1) joinPatternCount += 1;
  }
  if (forkPattern.length > joinPatternCount) {
    forkPattern.slice(joinPatternCount).forEach((cell) => {
      issues.push({ cell, severity: 'warning', message: 'This Fork has no matching Join — the parallel paths it starts never reconverge.' });
    });
  }

  return issues;
}

// ─── Sequence Diagram ───────────────────────────────────────────────────────
// Self-messages (a lifeline calling its own method) are valid notation, so
// self-loops are exempted for actors/lifelines/activations. Repeated
// messages between the same two lifelines are also completely normal, so
// duplicate-edge checking is skipped.
function edgeYPosition(edge: Cell): number | null {
  const sGeo = edge.source?.getGeometry();
  const tGeo = edge.target?.getGeometry();
  if (sGeo && tGeo) return (sGeo.y + sGeo.height / 2 + tGeo.y + tGeo.height / 2) / 2;
  const geo = edge.getGeometry();
  return geo ? geo.y : null;
}

const SEQUENCE_FRAGMENT_ROLES = new Set(['seq-alt', 'seq-opt', 'seq-loop', 'seq-par', 'seq-break']);

export function validateSequence(graph: Graph): DiagramIssue[] {
  // 9.9 (ALT needs >=2 operands) isn't checked — this palette models each
  // combined fragment as one undivided box, with no separate shape for its
  // operand sections, so there's no way to count them structurally. 9.13
  // (general message time-ordering) is also skipped beyond the specific,
  // well-defined Destroy-ordering case below — "out of order" in general is
  // too fuzzy to check reliably from geometry alone.
  const { issues, validVertices, edges } = runStructuralChecks(graph, {
    freeFloatingRoles: new Set([
      'seq-note', 'seq-alt', 'seq-opt', 'seq-loop', 'seq-par', 'seq-break', 'seq-activation',
    ]),
    annotationRoles: new Set(['seq-note']),
    labeledRoles: new Set(['seq-actor', 'seq-lifeline', 'seq-loop']),
    disconnectedMessage: "This actor or lifeline isn't part of any interaction yet.",
    selfLoopExemptRoles: new Set(['seq-actor', 'seq-lifeline', 'seq-activation']),
  });

  const lifelines = validVertices.filter((c) => {
    const role = getShapeRole(c);
    return role === 'seq-actor' || role === 'seq-lifeline';
  });
  const messageRoles = new Set(['seq-sync-msg', 'seq-async-msg', 'seq-return-msg']);
  const messages = edges.filter((e) => messageRoles.has(getShapeRole(e) ?? ''));

  // SQ1/9.1-9.2 — needs at least one lifeline, and (softly) at least one message.
  if (validVertices.length > 0 && lifelines.length === 0) {
    issues.push({ severity: 'error', message: 'This sequence diagram has no lifeline yet — nothing to exchange messages.' });
  } else if (lifelines.length > 0 && messages.length === 0) {
    issues.push({ severity: 'warning', message: 'Lifelines exist but no messages have been added yet.' });
  }

  // SQ5/9.7 — an Activation bar should sit on a lifeline (its X range
  // overlaps the lifeline's, and it's vertically within the lifeline's span).
  const activations = validVertices.filter((c) => getShapeRole(c) === 'seq-activation');
  for (const activation of activations) {
    const aGeo = activation.getGeometry();
    if (!aGeo) continue;
    const onALifeline = lifelines.some((ll) => {
      const llGeo = ll.getGeometry();
      if (!llGeo) return false;
      const xOverlap = aGeo.x < llGeo.x + llGeo.width && aGeo.x + aGeo.width > llGeo.x;
      const yWithin = aGeo.y >= llGeo.y - 4 && aGeo.y + aGeo.height <= llGeo.y + llGeo.height + 4;
      return xOverlap && yWithin;
    });
    if (!onALifeline) {
      issues.push({ cell: activation, severity: 'error', message: 'This Activation bar should sit on a lifeline.' });
    }
  }

  // SQ3/9.4 — no message may target a lifeline below its own Destroy marker.
  for (const lifeline of lifelines) {
    const destroy = (lifeline.getEdges(true, true, false) ?? [])
      .map((e) => (e.source === lifeline ? e.target : e.source))
      .find((c): c is Cell => !!c && getShapeRole(c) === 'seq-destroy');
    if (!destroy) continue;
    const destroyGeo = destroy.getGeometry();
    if (!destroyGeo) continue;
    const destroyY = destroyGeo.y;

    for (const msg of messages) {
      if (msg.target !== lifeline && msg.source !== lifeline) continue;
      const y = edgeYPosition(msg);
      if (y !== null && y > destroyY + 4) {
        issues.push({ cell: msg, severity: 'error', message: 'This message targets a lifeline below its Destroy marker — the object no longer exists at this point.' });
      }
    }
  }

  // SQ4/9.6 — a Return should match a preceding Sync call between the same
  // two lifelines.
  for (const ret of messages) {
    if (getShapeRole(ret) !== 'seq-return-msg') continue;
    const retY = edgeYPosition(ret);
    const matched = messages.some((sync) => {
      if (getShapeRole(sync) !== 'seq-sync-msg') return false;
      const samePair = (sync.source === ret.source && sync.target === ret.target)
        || (sync.source === ret.target && sync.target === ret.source);
      if (!samePair) return false;
      const syncY = edgeYPosition(sync);
      return retY === null || syncY === null || syncY <= retY;
    });
    if (!matched) {
      issues.push({ cell: ret, severity: 'warning', message: "This Return doesn't match a preceding Sync Message between the same two lifelines." });
    }
  }

  // 9.8/9.10 — combined fragments should enclose at least one message, and
  // should nest cleanly rather than partially overlap each other.
  const fragments = validVertices.filter((c) => SEQUENCE_FRAGMENT_ROLES.has(getShapeRole(c) ?? ''));
  for (const fragment of fragments) {
    const fGeo = fragment.getGeometry();
    if (!fGeo) continue;
    const encloses = messages.some((msg) => {
      const y = edgeYPosition(msg);
      return y !== null && y >= fGeo.y && y <= fGeo.y + fGeo.height;
    });
    if (!encloses) {
      issues.push({ cell: fragment, severity: 'warning', message: 'This fragment encloses no messages yet.' });
    }
  }
  for (let i = 0; i < fragments.length; i++) {
    for (let j = i + 1; j < fragments.length; j++) {
      const a = fragments[i].getGeometry();
      const b = fragments[j].getGeometry();
      if (!a || !b) continue;
      if (rectsOverlap(a, b) && !rectContains(a, b) && !rectContains(b, a)) {
        issues.push({ cell: fragments[i], severity: 'error', message: 'This fragment partially overlaps another — combined fragments must nest cleanly, not cross.' });
      }
    }
  }

  for (const cell of validVertices) {
    if (getShapeRole(cell) !== 'seq-destroy') continue;
    const incoming = cell.getEdges(true, false)?.length ?? 0;
    const outgoing = cell.getEdges(false, true)?.length ?? 0;
    if (outgoing > 0) {
      issues.push({ cell, severity: 'warning', message: 'A Destroy marker should be the end of a lifeline — nothing should lead out of it.' });
    }
    if (incoming === 0) {
      issues.push({ cell, severity: 'warning', message: 'This Destroy marker has no incoming message yet — nothing is being destroyed.' });
    }
  }

  // The generic G3 disconnected-check above (disconnectedMessage, in
  // runStructuralChecks) only ever looks at a cell's *own* edges — but every
  // message here actually attaches to whichever timeline shape occupies
  // that row, which for an active lifeline is its Activation bar, a
  // separate cell (see findSequenceMessageEndpoints in DiagramCanvas.tsx),
  // never the Actor/Lifeline header itself. A perfectly wired-up Actor —
  // messages flowing through its Activation bar exactly as intended — still
  // has zero edges of its own, so G3 flagged it as "not part of any
  // interaction" even in the middle of one. Drops that specific false
  // positive: an Actor/Lifeline counts as connected here if any Activation
  // bar sitting on it (same x-overlap/y-within test as SQ5 above) has a
  // message of its own.
  return issues.filter((issue) => {
    if (!issue.cell || issue.message !== "This actor or lifeline isn't part of any interaction yet.") return true;
    const llGeo = issue.cell.getGeometry();
    if (!llGeo) return true;
    const wiredViaActivation = activations.some((a) => {
      const aGeo = a.getGeometry();
      if (!aGeo) return false;
      const xOverlap = aGeo.x < llGeo.x + llGeo.width && aGeo.x + aGeo.width > llGeo.x;
      const yWithin = aGeo.y >= llGeo.y - 4 && aGeo.y + aGeo.height <= llGeo.y + llGeo.height + 4;
      return xOverlap && yWithin && (a.getEdges(true, true, false) ?? []).length > 0;
    });
    return !wiredViaActivation;
  });
}

// ─── Class Diagram ──────────────────────────────────────────────────────────
// Relationship edges should run between two Class shapes. Inheritance
// (Generalization) can't be self-referencing and can't form a cycle — both
// are structurally invalid, unlike a self-referencing association/
// aggregation/composition (a linked-list Node pointing at itself), which is
// completely normal and left alone.
// Finds the nearest edge ENDPOINT (source or target center, not the
// midpoint) to `cell` — used to associate a small standalone Multiplicity
// marker with the specific end of the association/aggregation/composition/
// generalization/dependency line it annotates. Same geometric-heuristic
// caveat as nearestEdge above: there's no structural link, only proximity.
function nearestEdgeEnd(cell: Cell, edges: Cell[], threshold = 60): { edge: Cell; end: 'source' | 'target' } | null {
  const geo = cell.getGeometry();
  if (!geo) return null;
  const cx = geo.x + geo.width / 2;
  const cy = geo.y + geo.height / 2;
  let best: { edge: Cell; end: 'source' | 'target' } | null = null;
  let bestDistance = Infinity;
  for (const edge of edges) {
    const sGeo = edge.source?.getGeometry();
    const tGeo = edge.target?.getGeometry();
    if (!sGeo || !tGeo) continue;
    const sx = sGeo.x + sGeo.width / 2, sy = sGeo.y + sGeo.height / 2;
    const tx = tGeo.x + tGeo.width / 2, ty = tGeo.y + tGeo.height / 2;
    const dSource = Math.hypot(cx - sx, cy - sy);
    const dTarget = Math.hypot(cx - tx, cy - ty);
    if (dSource < bestDistance) { bestDistance = dSource; best = { edge, end: 'source' }; }
    if (dTarget < bestDistance) { bestDistance = dTarget; best = { edge, end: 'target' }; }
  }
  return bestDistance <= threshold ? best : null;
}

// A Class shape (class-box) is a container: its own value is always blank —
// the displayed name lives in its topmost child compartment (see
// insertUmlClassCell in DiagramCanvas.tsx, which stacks name/attrs/methods
// top-to-bottom by y). Reading cell.getValue() directly on the container
// itself (what the generic labeledRoles/uniqueNameRoles checks do) would
// therefore always see it as blank — hence the bespoke name/compartment
// readers below instead of reusing checkEmptyLabels/checkDuplicateLabels
// for classes specifically.
function classCompartments(classBox: Cell): [Cell | null, Cell | null, Cell | null] {
  const children = (classBox.getChildCells(true, false) ?? [])
    .slice()
    .sort((a, b) => (a.getGeometry()?.y ?? 0) - (b.getGeometry()?.y ?? 0));
  return [children[0] ?? null, children[1] ?? null, children[2] ?? null];
}

function isBlankCompartment(cell: Cell | null): boolean {
  if (!cell) return true;
  const value = cell.getValue();
  return typeof value !== 'string' || value.trim().length === 0;
}

export function validateClass(graph: Graph): DiagramIssue[] {
  const { issues, validVertices, edges } = runStructuralChecks(graph, {
    freeFloatingRoles: new Set(['class-note']),
    annotationRoles: new Set(['class-note']),
    selfLoopExemptRoles: new Set(['class-box']),
    checkDuplicateEdges: true,
  });

  const relationshipRoles = new Set([
    'class-association', 'class-directed', 'class-aggregation',
    'class-composition', 'class-dependency', 'class-generalization', 'class-realization',
  ]);
  const multiplicityRoles = new Set([
    'class-multiplicity-1', 'class-multiplicity-01', 'class-multiplicity-many',
    'class-multiplicity-1many', 'class-multiplicity-range', 'class-multiplicity-n',
  ]);
  const singularMultiplicityRoles = new Set(['class-multiplicity-1', 'class-multiplicity-01']);
  const multiplicityBearingRoles = new Set(['class-association', 'class-directed', 'class-aggregation', 'class-composition']);

  const generalizationAdjacency = new Map<Cell, Cell[]>();
  const compositionAdjacency = new Map<Cell, Cell[]>(); // whole -> part
  const compositionWholesByPart = new Map<Cell, Set<Cell>>();
  const relationshipPairs = new Map<string, Set<string>>(); // "classA|classB" -> roles seen between them

  for (const edge of edges) {
    const role = getShapeRole(edge);
    if (!role || !relationshipRoles.has(role)) continue;
    const { sourceCell, targetCell, sourceRole, targetRole } = edgeRoles(edge);
    if (!sourceCell || !targetCell) continue;

    // CL2/10.2 — every relationship endpoint should land on a Class.
    if ((sourceRole && sourceRole !== 'class-box') || (targetRole && targetRole !== 'class-box')) {
      issues.push({ cell: edge, severity: 'error', message: 'This relationship should connect two Classes.' });
      continue;
    }

    const pairKey = [sourceCell.getId(), targetCell.getId()].sort().join('|');
    const seenRoles = relationshipPairs.get(pairKey) ?? new Set<string>();
    seenRoles.add(role);
    relationshipPairs.set(pairKey, seenRoles);

    if (role === 'class-generalization') {
      // CL3/10.3-10.4 — no self-inheritance, no inheritance cycles.
      if (sourceCell === targetCell) {
        issues.push({ cell: edge, severity: 'error', message: "A class can't inherit from itself." });
        continue;
      }
      const list = generalizationAdjacency.get(sourceCell) ?? [];
      list.push(targetCell);
      generalizationAdjacency.set(sourceCell, list);
    }

    // Realization is its own hierarchy dimension (interface implementation,
    // not class inheritance) — kept out of generalizationAdjacency/cycle
    // detection above so a class implementing an interface never gets
    // conflated with — or falsely flags — an unrelated inheritance chain.
    // Self-implementation is still nonsensical the same way self-inheritance
    // is, so that one check carries over.
    if (role === 'class-realization' && sourceCell === targetCell) {
      issues.push({ cell: edge, severity: 'error', message: "A class can't implement itself." });
      continue;
    }

    if (role === 'class-composition') {
      // Diamond sits at the edge's source end (see
      // ConnectorArrowShapeCanvas-style paintEdgeShape overrides for
      // UMLCompositionShapeCanvas) — source is the whole, target the part.
      const list = compositionAdjacency.get(sourceCell) ?? [];
      list.push(targetCell);
      compositionAdjacency.set(sourceCell, list);

      const wholes = compositionWholesByPart.get(targetCell) ?? new Set<Cell>();
      wholes.add(sourceCell);
      compositionWholesByPart.set(targetCell, wholes);
    }
  }

  // CL3/10.4 — cycle detection over the generalization (inheritance) subgraph.
  findCycleRoots(generalizationAdjacency).forEach((cell) => {
    issues.push({ cell, severity: 'error', message: 'Circular inheritance detected — this chain of Generalization arrows loops back on itself.' });
  });

  // 10.9 — circular ownership (A owns B owns A) over the composition subgraph.
  findCycleRoots(compositionAdjacency).forEach((cell) => {
    issues.push({ cell, severity: 'error', message: 'Circular composition detected — ownership loops back on itself.' });
  });

  // 10.7 — composition implies exclusive ownership: a part belongs to one whole.
  compositionWholesByPart.forEach((wholes, part) => {
    if (wholes.size > 1) {
      issues.push({ cell: part, severity: 'warning', message: 'This class is a composed part of more than one whole — composition means a part can only belong to one whole at a time.' });
    }
  });

  // 10.13 — the same pair of classes linked by both a Generalization and an
  // Association-family relationship is possibly redundant (info only).
  relationshipPairs.forEach((roles) => {
    if (roles.has('class-generalization') && [...roles].some((r) => r !== 'class-generalization')) {
      issues.push({ severity: 'info', message: "These two classes are connected by both an inheritance arrow and another relationship — that's probably redundant, check if you need both." });
    }
  });

  // 10.5/10.6/10.8/10.11 — multiplicity markers belong on association/
  // aggregation/composition/directed-association ends, never on a
  // generalization or dependency; a composition's whole-side end should be
  // 1 or 0..1 (a part belongs to exactly one whole).
  const claimedEnds = new Set<string>();
  const multiplicityCells = validVertices.filter((c) => multiplicityRoles.has(getShapeRole(c) ?? ''));
  for (const marker of multiplicityCells) {
    const hit = nearestEdgeEnd(marker, edges);
    if (!hit) continue;
    const role = getShapeRole(hit.edge);
    if (role === 'class-generalization') {
      issues.push({ cell: marker, severity: 'error', message: 'Generalization has no multiplicity — remove this marker.' });
      continue;
    }
    if (role === 'class-dependency') {
      issues.push({ cell: marker, severity: 'error', message: 'Dependency has no multiplicity — remove this marker.' });
      continue;
    }
    if (role === 'class-realization') {
      issues.push({ cell: marker, severity: 'error', message: 'Realization has no multiplicity — remove this marker.' });
      continue;
    }
    claimedEnds.add(`${hit.edge.getId()}:${hit.end}`);
    if (role === 'class-composition' && hit.end === 'source' && !singularMultiplicityRoles.has(getShapeRole(marker) ?? '')) {
      issues.push({ cell: marker, severity: 'error', message: "A Composition's whole-side multiplicity must be 1 or 0..1 — a part belongs to exactly one whole." });
    }
  }
  for (const edge of edges) {
    const role = getShapeRole(edge);
    if (!role || !multiplicityBearingRoles.has(role)) continue;
    const hasEither = claimedEnds.has(`${edge.getId()}:source`) || claimedEnds.has(`${edge.getId()}:target`);
    if (!hasEither) {
      issues.push({ cell: edge, severity: 'info', message: 'Consider specifying multiplicity on this relationship.' });
    }
  }

  // CL1/CL6/10.1/10.10/10.12 — class-level checks. Names live in the
  // topmost child compartment, not the container's own value (see
  // classCompartments above), so these can't use the generic labeledRoles/
  // uniqueNameRoles config paths.
  const classBoxes = validVertices.filter((c) => getShapeRole(c) === 'class-box');
  if (validVertices.length > 0 && classBoxes.length === 0) {
    issues.push({ severity: 'error', message: 'This diagram has no class yet.' });
  }
  const seenNames = new Set<string>();
  for (const cls of classBoxes) {
    const [nameCell, attrsCell, methodsCell] = classCompartments(cls);
    const name = (typeof nameCell?.getValue() === 'string' ? (nameCell!.getValue() as string) : '').trim();
    if (!name) {
      issues.push({ cell: cls, severity: 'warning', message: 'This class has no name yet.' });
    } else {
      const key = name.toLowerCase();
      if (seenNames.has(key)) {
        issues.push({ cell: cls, severity: 'error', message: 'Another class already uses this name — class names must be unique.' });
      } else {
        seenNames.add(key);
      }
    }

    const hasRelationship = (cls.getEdges(true, true, false) ?? []).length > 0;
    if (isBlankCompartment(attrsCell) && isBlankCompartment(methodsCell) && !hasRelationship) {
      issues.push({ cell: cls, severity: 'warning', message: 'This class has nothing in it yet — no attributes, methods, or relationships to other classes.' });
    }
  }

  return issues;
}

// ─── Standard ────────────────────────────────────────────────────────────────
// No notation of its own (it's the general-purpose palette used inside every
// other diagram type too), so only the universal sanity checks apply: no
// self-loops, no exact duplicate connections.
export function validateStandard(graph: Graph): DiagramIssue[] {
  const { issues } = runStructuralChecks(graph, {
    checkDuplicateEdges: true,
  });
  return issues;
}

// ─── Dispatcher ──────────────────────────────────────────────────────────────
// umlType/activeUmlType is always one of the DIAGRAM_TABS strings (see
// constants/shapes.ts) — matched case-insensitively here since callers pass
// it straight through from state without normalizing.
const VALIDATORS: Record<string, (graph: Graph) => DiagramIssue[]> = {
  'standard': validateStandard,
  'functional decomposition diagram': validateFDD,
  'flowchart': validateFlowchart,
  'data flow diagram': validateDFD,
  'entity relationship diagram': validateERD,
  'fishbone diagram': validateFishbone,
  'schematic diagram': validateSchematic,
  'use case diagram': validateUseCase,
  'activity diagram': validateActivity,
  'sequence diagram': validateSequence,
  'class diagram': validateClass,
};

export function validateDiagram(graph: Graph, diagramType: string | null | undefined): DiagramIssue[] {
  const validator = VALIDATORS[(diagramType ?? '').trim().toLowerCase()];
  return validator ? validator(graph) : [];
}
