import type { Cell, Graph } from '@maxgraph/core';
import { DIAGRAM_SHAPES, IGRAPH_ID_STYLE_MAP } from '@/constants/shapes';

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

export type IssueSeverity = 'error' | 'warning';

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
// (panel click, drag-drop, the hover "add adjacent shape" arrows). Several ids
// intentionally render with the same style (Flowchart's 'process' and
// Standard's plain 'rectangle' are both igraph.rectangle), so the rendered
// style alone can't tell them apart — only this tag can.
const shapeRoles = new WeakMap<Cell, string>();

export function tagShapeRole(cell: Cell | null | undefined, shapeId: string | undefined | null): void {
  if (cell && shapeId) shapeRoles.set(cell, shapeId);
}

export function getShapeRole(cell: Cell): string | undefined {
  return shapeRoles.get(cell);
}

// ─── Palette membership ──────────────────────────────────────────────────────
// Any style used by "Standard" (general-purpose, fair game in any diagram) or
// "Flowchart" shapes is allowed on a Flowchart canvas; a style unique to some
// other category (an ERD crow's-foot, a UML lifeline, a schematic resistor...)
// is the "wrong shape" case.
const FLOWCHART_ALLOWED_STYLES = new Set<string>(
  [...DIAGRAM_SHAPES['Standard'], ...DIAGRAM_SHAPES['Flowchart']]
    .map((s) => IGRAPH_ID_STYLE_MAP[s.id])
    .filter(Boolean)
);

// ─── Shape roles by structural expectation ───────────────────────────────────
const BRANCHING_ROLES = new Set(['decision']);
// Shapes that represent a single jump point — a start/end, or a page
// connector — and so should only ever be entered OR exited, never both.
const SINGLE_JUNCTION_ROLES = new Set(['terminator', 'on-page-connector', 'off-page-connector']);
// Shapes that legitimately float free of the flow as commentary, not steps.
const FREE_FLOATING_ROLES = new Set(['annotation']);

function getCellStyleShape(cell: Cell): string | undefined {
  const style = cell.getStyle();
  if (!style || typeof style === 'string') return undefined;
  return (style as { shape?: string }).shape;
}

function junctionLabel(role: string): string {
  return role === 'terminator' ? 'Terminator' : 'Connector';
}

export function validateFlowchart(graph: Graph): FlowchartIssue[] {
  const issues: FlowchartIssue[] = [];
  const parent = graph.getDefaultParent();
  const vertices = graph.getChildVertices(parent);
  const edges = graph.getChildEdges(parent);

  // Vertices that passed the palette check — used by the graph-wide checks
  // below so a foreign shape's own connections don't also trigger those.
  const validVertices: Cell[] = [];
  let hasStartTerminator = false;
  let hasEndTerminator = false;

  for (const cell of vertices) {
    const role = getShapeRole(cell);
    const styleShape = getCellStyleShape(cell);

    if (styleShape && !FLOWCHART_ALLOWED_STYLES.has(styleShape)) {
      issues.push({
        cell,
        severity: 'error',
        message: "This shape isn't part of Flowchart notation — open the Shapes panel and pick one from the Flowchart section instead.",
      });
      continue; // a foreign shape's connections aren't worth grading further
    }
    validVertices.push(cell);

    const allEdges = cell.getEdges(false, false, true) ?? [];
    const hasSelfLoop = allEdges.some((e) => e.source === cell && e.target === cell);
    if (hasSelfLoop) {
      issues.push({ cell, severity: 'error', message: "A shape can't connect to itself — remove or redirect this connection." });
    }

    const incoming = cell.getEdges(true, false)?.length ?? 0;
    const outgoing = cell.getEdges(false, true)?.length ?? 0;

    if (role === 'terminator') {
      if (incoming === 0 && outgoing > 0) hasStartTerminator = true;
      if (outgoing === 0 && incoming > 0) hasEndTerminator = true;
    }

    if (incoming === 0 && outgoing === 0 && !FREE_FLOATING_ROLES.has(role ?? '')) {
      issues.push({ cell, severity: 'warning', message: "This shape isn't connected to the flow yet." });
      continue;
    }

    if (role && BRANCHING_ROLES.has(role) && outgoing < 2) {
      issues.push({
        cell,
        severity: 'warning',
        message: 'Decision shapes usually need two or more outgoing paths (e.g. Yes/No).',
      });
    }

    if (role && SINGLE_JUNCTION_ROLES.has(role) && incoming > 0 && outgoing > 0) {
      issues.push({
        cell,
        severity: 'warning',
        message: `${junctionLabel(role)} shapes should only be entered or exited, not both — use a Process shape for in-between steps.`,
      });
    }

    if (role && !BRANCHING_ROLES.has(role) && !SINGLE_JUNCTION_ROLES.has(role) && outgoing > 1) {
      issues.push({
        cell,
        severity: 'warning',
        message: 'Only Decision shapes should branch into multiple paths.',
      });
    }
  }

  // ── Graph-wide: every flow should have a clear start and end. Only once an
  // actual flow exists (2+ shapes, at least one connection) — an empty canvas
  // or a single freshly-dropped shape shouldn't be nagged about this yet.
  if (validVertices.length >= 2 && edges.length >= 1) {
    if (!hasStartTerminator) {
      issues.push({
        severity: 'warning',
        message: 'This flowchart has no starting point — add a Terminator shape with nothing feeding into it.',
      });
    }
    if (!hasEndTerminator) {
      issues.push({
        severity: 'warning',
        message: 'This flowchart has no ending point — add a Terminator shape with nothing leading out of it.',
      });
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

function buildAllowedStyles(categories: string[]): Set<string> {
  const styles = new Set<string>();
  categories.forEach((category) => {
    (DIAGRAM_SHAPES[category] ?? []).forEach((s) => {
      const style = IGRAPH_ID_STYLE_MAP[s.id];
      if (style) styles.add(style);
    });
  });
  return styles;
}

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
  // Palette membership: any style used by these DIAGRAM_SHAPES categories is
  // allowed on this canvas. Standard is general-purpose so it's included by
  // every diagram type, same as Flowchart does above.
  categories: string[];
  paletteName: string;

  // Roles allowed to sit with zero connections without a warning (notes,
  // boundaries/containers, floating labels, fragment frames...).
  freeFloatingRoles?: Set<string>;
  disconnectedMessage?: string;

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
  sinkRoles?: Set<string>;
  sinkMissingMessage?: string;

  checkDuplicateEdges?: boolean;
  duplicateMessage?: string;
  checkComponents?: boolean;
  componentMessage?: string;
}

function runStructuralChecks(
  graph: Graph,
  config: StructuralConfig,
): { issues: DiagramIssue[]; validVertices: Cell[]; edges: Cell[] } {
  const issues: DiagramIssue[] = [];
  const parent = graph.getDefaultParent();
  const vertices = graph.getChildVertices(parent);
  const edges = graph.getChildEdges(parent);
  const allowedStyles = buildAllowedStyles(config.categories);

  const validVertices: Cell[] = [];
  let hasSource = false;
  let hasSink = false;

  for (const cell of vertices) {
    const role = getShapeRole(cell);
    const styleShape = getCellStyleShape(cell);

    if (styleShape && !allowedStyles.has(styleShape)) {
      issues.push({
        cell,
        severity: 'error',
        message: `This shape isn't part of ${config.paletteName} notation — open the Shapes panel and pick one from the ${config.paletteName} section instead.`,
      });
      continue;
    }
    validVertices.push(cell);

    const isSelfLoop = (cell.getEdges(false, false, true) ?? []).some(
      (e) => e.source === cell && e.target === cell,
    );
    if (isSelfLoop && !(role && config.selfLoopExemptRoles?.has(role))) {
      issues.push({ cell, severity: 'error', message: "A shape can't connect to itself — remove or redirect this connection." });
    }

    const incoming = cell.getEdges(true, false)?.length ?? 0;
    const outgoing = cell.getEdges(false, true)?.length ?? 0;

    if (role && config.sourceRoles?.has(role) && incoming === 0 && outgoing > 0) hasSource = true;
    if (role && config.sinkRoles?.has(role) && outgoing === 0 && incoming > 0) hasSink = true;

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
    if (config.sourceRoles && !hasSource) {
      issues.push({ severity: 'warning', message: config.sourceMissingMessage ?? 'This diagram has no clear starting point.' });
    }
    if (config.sinkRoles && !hasSink) {
      issues.push({ severity: 'warning', message: config.sinkMissingMessage ?? 'This diagram has no clear ending point.' });
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

  return { issues, validVertices, edges };
}

// ─── Functional Decomposition Diagram ───────────────────────────────────────
// Functions decompose top-down into sub-functions: every function but the
// root should have exactly one parent. Controls/Mechanisms/Interfaces attach
// to a function to annotate it, they don't chain into each other.
export function validateFDD(graph: Graph): DiagramIssue[] {
  const { issues, validVertices } = runStructuralChecks(graph, {
    categories: ['Standard', 'Functional Decomposition Diagram'],
    paletteName: 'Functional Decomposition Diagram',
    freeFloatingRoles: new Set(['fdd-note', 'boundary']),
    disconnectedMessage: "This shape isn't connected to the decomposition tree yet.",
    checkDuplicateEdges: true,
    checkComponents: true,
    componentMessage: "This shape's branch isn't connected to the rest of the decomposition tree.",
  });

  for (const cell of validVertices) {
    const role = getShapeRole(cell);
    if (role !== 'function') continue;
    const incoming = cell.getEdges(true, false) ?? [];
    const parentFunctionEdges = incoming.filter((e) => {
      const other = e.source === cell ? e.target : e.source;
      return other && getShapeRole(other) === 'function';
    });
    if (parentFunctionEdges.length > 1) {
      issues.push({
        cell,
        severity: 'warning',
        message: 'This function is connected to more than one parent — decomposition should branch as a tree, not converge into a web.',
      });
    }
  }

  for (const cell of validVertices) {
    const role = getShapeRole(cell);
    if (role !== 'control' && role !== 'mechanism' && role !== 'fdd-interface') continue;
    const connectedToFunction = (cell.getEdges(true, true, false) ?? []).some((e) => {
      const other = e.source === cell ? e.target : e.source;
      return other && getShapeRole(other) === 'function';
    });
    if (!connectedToFunction) {
      issues.push({
        cell,
        severity: 'warning',
        message: 'This should attach to a Function shape — it annotates a function rather than standing on its own as a step.',
      });
    }
  }

  return issues;
}

// ─── Data Flow Diagram ──────────────────────────────────────────────────────
// Classic DFD rule (Gane/Sarson & Yourdon agree on this one): data can't jump
// straight from an External Entity to a Data Store, or entity-to-entity, or
// store-to-store — it always has to pass through a Process.
export function validateDFD(graph: Graph): DiagramIssue[] {
  const { issues, edges } = runStructuralChecks(graph, {
    categories: ['Standard', 'Data Flow Diagram'],
    paletteName: 'Data Flow Diagram',
    freeFloatingRoles: new Set(['dfd-note', 'dfd-boundary']),
    junctionRoles: new Set(['dfd-on-page', 'dfd-off-page']),
    junctionMessage: () => 'Connector shapes should only be entered or exited, not both — use a Process shape for in-between steps.',
    checkDuplicateEdges: true,
    checkComponents: true,
  });

  const isStore = (role?: string) => role === 'dfd-data-store' || role === 'dfd-data-store-gs';
  const isEntity = (role?: string) => role === 'dfd-external-entity';

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
  }

  return issues;
}

// ─── Entity Relationship Diagram ────────────────────────────────────────────
// Entities connect to each other only through a Relationship (diamond), never
// directly. Attributes belong to exactly one entity/relationship. Weak
// entities should hang off an Identifying Relationship, not a plain one.
export function validateERD(graph: Graph): DiagramIssue[] {
  const { issues, validVertices, edges } = runStructuralChecks(graph, {
    categories: ['Standard', 'Entity Relationship Diagram'],
    paletteName: 'Entity Relationship Diagram',
    checkDuplicateEdges: true,
    checkComponents: true,
  });

  const isEntity = (role?: string) => role === 'erd-entity' || role === 'erd-weak-entity';
  const isAttribute = (role?: string) =>
    role === 'erd-attribute' || role === 'erd-multivalued-attr' || role === 'erd-derived-attr';

  for (const edge of edges) {
    const { sourceRole, targetRole } = edgeRoles(edge);
    if (isEntity(sourceRole) && isEntity(targetRole)) {
      issues.push({
        cell: edge,
        severity: 'error',
        message: "Entities can't connect directly to each other — route the connection through a Relationship shape.",
      });
    }
  }

  for (const cell of validVertices) {
    const role = getShapeRole(cell);
    if (!isAttribute(role)) continue;
    const links = cell.getEdges(true, true, false) ?? [];
    if (links.length > 1) {
      issues.push({
        cell,
        severity: 'warning',
        message: 'This Attribute is linked to more than one shape — an attribute should belong to a single Entity or Relationship.',
      });
    }
  }

  for (const cell of validVertices) {
    if (getShapeRole(cell) !== 'erd-relationship' && getShapeRole(cell) !== 'erd-identifying-rel') continue;
    const linkedEntities = (cell.getEdges(true, true, false) ?? []).filter((e) => {
      const other = e.source === cell ? e.target : e.source;
      return other && isEntity(getShapeRole(other));
    });
    if (linkedEntities.length < 2) {
      issues.push({
        cell,
        severity: 'warning',
        message: 'A Relationship should connect two Entities (the same Entity twice for a recursive relationship).',
      });
    }
  }

  for (const cell of validVertices) {
    if (getShapeRole(cell) !== 'erd-weak-entity') continue;
    const linkedToIdentifying = (cell.getEdges(true, true, false) ?? []).some((e) => {
      const other = e.source === cell ? e.target : e.source;
      return other && getShapeRole(other) === 'erd-identifying-rel';
    });
    const linkedToPlainRelationship = (cell.getEdges(true, true, false) ?? []).some((e) => {
      const other = e.source === cell ? e.target : e.source;
      return other && getShapeRole(other) === 'erd-relationship';
    });
    if (!linkedToIdentifying && linkedToPlainRelationship) {
      issues.push({
        cell,
        severity: 'warning',
        message: 'Weak Entities should connect to their owner through an Identifying Relationship, not a plain Relationship.',
      });
    }
  }

  return issues;
}

// ─── Fishbone (Ishikawa) Diagram ────────────────────────────────────────────
// One effect box, causes branch off the spine, sub-causes branch off a cause
// — not straight off the spine/head themselves.
export function validateFishbone(graph: Graph): DiagramIssue[] {
  const { issues, validVertices } = runStructuralChecks(graph, {
    categories: ['Standard', 'Fishbone Diagram'],
    paletteName: 'Fishbone Diagram',
    freeFloatingRoles: new Set(['fishbone-note', 'fishbone-spine']),
    disconnectedMessage: "This shape isn't connected to the fishbone yet.",
  });

  const heads = validVertices.filter((c) => getShapeRole(c) === 'fishbone-head' || getShapeRole(c) === 'fishbone-problem');
  if (heads.length === 0 && validVertices.length > 1) {
    issues.push({ severity: 'warning', message: 'This fishbone diagram has no Fish Head or Effect Box yet — add one to anchor the diagram.' });
  } else if (heads.length > 1) {
    heads.slice(1).forEach((cell) => {
      issues.push({ cell, severity: 'warning', message: 'A fishbone diagram should only have one Fish Head or Effect Box.' });
    });
  }

  const mainCauseRoles = new Set(['fishbone-cause-top', 'fishbone-cause-bottom']);
  const subCauseRoles = new Set(['fishbone-sub-top', 'fishbone-sub-bottom']);

  for (const cell of validVertices) {
    const role = getShapeRole(cell);
    if (!role || (!subCauseRoles.has(role) && role !== 'fishbone-tertiary')) continue;
    const parentRoles = role === 'fishbone-tertiary' ? subCauseRoles : mainCauseRoles;
    const connectedToExpectedParent = (cell.getEdges(true, true, false) ?? []).some((e) => {
      const other = e.source === cell ? e.target : e.source;
      const otherRole = other ? getShapeRole(other) : undefined;
      return otherRole && parentRoles.has(otherRole);
    });
    if (!connectedToExpectedParent) {
      const expected = role === 'fishbone-tertiary' ? 'a Sub-Cause' : 'a Main Cause';
      issues.push({
        cell,
        severity: 'warning',
        message: `This should branch from ${expected}, not connect straight to the spine.`,
      });
    }
  }

  return issues;
}

// ─── Schematic (electrical) Diagram ─────────────────────────────────────────
// Every two-terminal component needs both terminals wired; a circuit needs a
// source and a ground. Parallel wiring (multiple wires between the same two
// points) is completely normal here, so duplicate-edge checking is skipped.
export function validateSchematic(graph: Graph): DiagramIssue[] {
  const { issues, validVertices } = runStructuralChecks(graph, {
    categories: ['Standard', 'Schematic Diagram'],
    paletteName: 'Schematic Diagram',
    freeFloatingRoles: new Set(['schematic-no-connection']),
    disconnectedMessage: "This component isn't wired into the circuit yet.",
  });

  const twoTerminalRoles = new Set([
    'schematic-battery', 'schematic-ac', 'schematic-resistor', 'schematic-variable-resistor',
    'schematic-capacitor', 'schematic-inductor', 'schematic-diode', 'schematic-led',
    'schematic-npn', 'schematic-switch', 'schematic-fuse',
  ]);

  for (const cell of validVertices) {
    const role = getShapeRole(cell);
    if (!role || !twoTerminalRoles.has(role)) continue;
    const linkCount = (cell.getEdges(true, true, false) ?? []).length;
    if (linkCount === 1) {
      issues.push({
        cell,
        severity: 'warning',
        message: 'This component only has one terminal wired — connect the other end too.',
      });
    }
  }

  if (validVertices.length > 1) {
    const hasSource = validVertices.some((c) => {
      const role = getShapeRole(c);
      return role === 'schematic-battery' || role === 'schematic-ac';
    });
    if (!hasSource) {
      issues.push({ severity: 'warning', message: 'This circuit has no power source — add a DC or AC Voltage Source.' });
    }
    const hasGround = validVertices.some((c) => getShapeRole(c) === 'schematic-ground');
    if (!hasGround) {
      issues.push({ severity: 'warning', message: 'This circuit has no ground reference — add a Ground shape to complete the return path.' });
    }
  }

  return issues;
}

// ─── Use Case Diagram ───────────────────────────────────────────────────────
export function validateUseCase(graph: Graph): DiagramIssue[] {
  const { issues, edges } = runStructuralChecks(graph, {
    categories: ['Standard', 'Use Case Diagram'],
    paletteName: 'Use Case Diagram',
    freeFloatingRoles: new Set(['uc-note', 'system-boundary']),
    checkDuplicateEdges: true,
  });

  for (const edge of edges) {
    const { sourceRole, targetRole } = edgeRoles(edge);
    if (!sourceRole || !targetRole) continue;
    const roles = [sourceRole, targetRole];

    if (roles[0] === 'uc-association' || roles[1] === 'uc-association') continue; // labels, not endpoints

    if (sourceRole === 'uc-actor' && targetRole === 'uc-actor') {
      issues.push({ cell: edge, severity: 'warning', message: 'This Association connects two Actors — associations should link an Actor to a Use Case instead.' });
    }

    if ((sourceRole === 'uc-include' || targetRole === 'uc-include' || sourceRole === 'uc-extend' || targetRole === 'uc-extend')
      && (sourceRole === 'uc-actor' || targetRole === 'uc-actor')) {
      issues.push({ cell: edge, severity: 'error', message: "Include and Extend relationships connect two Use Cases — an Actor can't be one of the endpoints." });
    }
  }

  return issues;
}

// ─── Activity Diagram ───────────────────────────────────────────────────────
export function validateActivity(graph: Graph): DiagramIssue[] {
  const { issues } = runStructuralChecks(graph, {
    categories: ['Standard', 'Activity Diagram'],
    paletteName: 'Activity Diagram',
    freeFloatingRoles: new Set(['act-note', 'act-constraint', 'act-swimlane']),
    branchingRoles: new Set(['act-decision']),
    branchingMessage: 'Decision shapes usually need two or more outgoing paths (e.g. guard conditions).',
    mergeRoles: new Set(['act-merge']),
    mergeMessage: 'Merge shapes usually combine two or more incoming paths back into one.',
    forkRoles: new Set(['act-fork']),
    forkMessage: 'Fork shapes usually split into two or more parallel paths.',
    junctionRoles: new Set(['act-initial-node', 'act-final-node', 'act-flow-final']),
    junctionMessage: (role) =>
      role === 'act-initial-node'
        ? 'An Initial Node should only be exited, never entered.'
        : 'A Final Node should only be entered, never exited.',
    sourceRoles: new Set(['act-initial-node']),
    sourceMissingMessage: 'This activity diagram has no Initial Node — add one with nothing feeding into it.',
    sinkRoles: new Set(['act-final-node', 'act-flow-final']),
    sinkMissingMessage: 'This activity diagram has no Final Node — add one with nothing leading out of it.',
    checkDuplicateEdges: true,
    checkComponents: true,
  });

  return issues;
}

// ─── Sequence Diagram ───────────────────────────────────────────────────────
// Self-messages (a lifeline calling its own method) are valid notation, so
// self-loops are exempted for actors/lifelines/activations. Repeated
// messages between the same two lifelines are also completely normal, so
// duplicate-edge checking is skipped.
export function validateSequence(graph: Graph): DiagramIssue[] {
  const { issues, validVertices } = runStructuralChecks(graph, {
    categories: ['Standard', 'Sequence Diagram'],
    paletteName: 'Sequence Diagram',
    freeFloatingRoles: new Set([
      'seq-note', 'seq-alt', 'seq-opt', 'seq-loop', 'seq-par', 'seq-break', 'seq-activation',
    ]),
    disconnectedMessage: "This actor or lifeline isn't part of any interaction yet.",
    selfLoopExemptRoles: new Set(['seq-actor', 'seq-lifeline', 'seq-activation']),
  });

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

  return issues;
}

// ─── Class Diagram ──────────────────────────────────────────────────────────
// Relationship edges should run between two Class shapes. Inheritance
// (Generalization) can't be self-referencing and can't form a cycle — both
// are structurally invalid, unlike a self-referencing association/
// aggregation/composition (a linked-list Node pointing at itself), which is
// completely normal and left alone.
export function validateClass(graph: Graph): DiagramIssue[] {
  const { issues, edges } = runStructuralChecks(graph, {
    categories: ['Standard', 'Class Diagram'],
    paletteName: 'Class Diagram',
    freeFloatingRoles: new Set(['class-note']),
    selfLoopExemptRoles: new Set(['class-box']),
    checkDuplicateEdges: true,
  });

  const relationshipRoles = new Set([
    'class-association', 'class-directed', 'class-aggregation',
    'class-composition', 'class-dependency', 'class-generalization',
  ]);

  const generalizationAdjacency = new Map<Cell, Cell[]>();

  for (const edge of edges) {
    const role = getShapeRole(edge);
    if (!role || !relationshipRoles.has(role)) continue;
    const { sourceCell, targetCell, sourceRole, targetRole } = edgeRoles(edge);
    if (!sourceCell || !targetCell) continue;

    if ((sourceRole && sourceRole !== 'class-box') || (targetRole && targetRole !== 'class-box')) {
      issues.push({
        cell: edge,
        severity: 'error',
        message: 'This relationship should connect two Classes.',
      });
      continue;
    }

    if (role === 'class-generalization') {
      if (sourceCell === targetCell) {
        issues.push({ cell: edge, severity: 'error', message: "A class can't inherit from itself." });
        continue;
      }
      const list = generalizationAdjacency.get(sourceCell) ?? [];
      list.push(targetCell);
      generalizationAdjacency.set(sourceCell, list);
    }
  }

  // Cycle check over the generalization (inheritance) subgraph only —
  // depth-first search with a recursion stack, standard cycle detection on a
  // directed graph.
  const visited = new Set<Cell>();
  const onStack = new Set<Cell>();

  const visit = (cell: Cell): boolean => {
    visited.add(cell);
    onStack.add(cell);
    for (const parentCell of generalizationAdjacency.get(cell) ?? []) {
      if (onStack.has(parentCell)) return true;
      if (!visited.has(parentCell) && visit(parentCell)) return true;
    }
    onStack.delete(cell);
    return false;
  };

  for (const cell of generalizationAdjacency.keys()) {
    if (visited.has(cell)) continue;
    if (visit(cell)) {
      issues.push({
        cell,
        severity: 'error',
        message: 'Circular inheritance detected — this chain of Generalization arrows loops back on itself.',
      });
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
    categories: ['Standard'],
    paletteName: 'Standard',
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
