// constants/shapes.ts
// Complete shape definitions with FDD shapes matching exact specifications

export interface ShapeDefinition {
  id: string;
  svgComponent: string;
  label: string;
  description?: string;
  width: number;
  height: number;
  category: 'UML' | 'SDLC';
}

export const DIAGRAM_TABS = [
  'Standard',
  'Functional Decomposition Diagram',
  'Flowchart',
  'Data Flow Diagram',
  'Entity Relationship Diagram',
  'Fishbone Diagram',
  'Schematic Diagram',
  'Use Case Diagram',
  'Activity Diagram',
  'Sequence Diagram',
  'Class Diagram',
];

export const DIAGRAM_SHAPES: Record<string, ShapeDefinition[]> = {

  // ═══════════════════════════════════════════════════════════════════════════
  // 0. STANDARD - General purpose shapes
  // ═══════════════════════════════════════════════════════════════════════════
  'Standard': [
    { id: 'rectangle', svgComponent: 'RectShape', label: 'Rectangle', description: 'Basic rectangle shape', width: 120, height: 60, category: 'UML' },
    { id: 'rounded-rectangle', svgComponent: 'RoundedRectShape', label: 'Rounded Rectangle', description: 'Rectangle with rounded corners', width: 120, height: 60, category: 'UML' },
    { id: 'circle', svgComponent: 'CircleShape', label: 'Circle', description: 'Perfect circle', width: 60, height: 60, category: 'UML' },
    { id: 'ellipse', svgComponent: 'EllipseShape', label: 'Ellipse', description: 'Oval shape', width: 120, height: 60, category: 'UML' },
    { id: 'diamond', svgComponent: 'DiamondShape', label: 'Diamond', description: 'Decision/diamond shape', width: 100, height: 80, category: 'UML' },
    { id: 'triangle', svgComponent: 'TriangleShape', label: 'Triangle', description: 'Triangle shape', width: 100, height: 80, category: 'UML' },
    { id: 'parallelogram', svgComponent: 'ParallelogramShape', label: 'Parallelogram', description: 'Slanted rectangle', width: 120, height: 60, category: 'UML' },
    { id: 'cylinder', svgComponent: 'CylinderShape', label: 'Cylinder', description: '3D cylinder / database', width: 100, height: 70, category: 'UML' },
    { id: 'document', svgComponent: 'DocumentShape', label: 'Document', description: 'Document/note shape', width: 100, height: 70, category: 'UML' },
    { id: 'folder', svgComponent: 'FolderShape', label: 'Folder', description: 'Folder shape', width: 120, height: 80, category: 'UML' },
    { id: 'cloud', svgComponent: 'CloudShape', label: 'Cloud', description: 'Cloud shape', width: 120, height: 70, category: 'UML' },
    { id: 'note', svgComponent: 'NoteStandaloneShape', label: 'Note', description: 'Sticky note shape', width: 100, height: 70, category: 'UML' },
    { id: 'actor', svgComponent: 'ActorShape', label: 'Actor', description: 'UML actor / user', width: 60, height: 80, category: 'UML' },
    { id: 'connector-arrow', svgComponent: 'ConnectorArrowShape', label: 'Connector', description: 'Line with arrow', width: 80, height: 40, category: 'UML' },
  ],

  // ═══════════════════════════════════════════════════════════════════════════
  // 1. FUNCTIONAL DECOMPOSITION DIAGRAM - EXACT SPECIFICATIONS
  // ═══════════════════════════════════════════════════════════════════════════
  'Functional Decomposition Diagram': [
    { 
      id: 'function', 
      svgComponent: 'FDD_FunctionShape', 
      label: 'Function', 
      description: 'Represents a primary function or sub-function.',
      width: 120, 
      height: 60, 
      category: 'UML' 
    },
    { 
      id: 'input', 
      svgComponent: 'FDD_InputShape', 
      label: 'Input', 
      description: 'Represents something that enters a function.',
      width: 80, 
      height: 50, 
      category: 'UML' 
    },
    { 
      id: 'output', 
      svgComponent: 'FDD_OutputShape', 
      label: 'Output', 
      description: 'Represents something that exits a function.',
      width: 80, 
      height: 50, 
      category: 'UML' 
    },
    { 
      id: 'control', 
      svgComponent: 'FDD_ControlShape', 
      label: 'Control', 
      description: 'Represents a control that governs a function.',
      width: 80, 
      height: 40, 
      category: 'UML' 
    },
    { 
      id: 'mechanism', 
      svgComponent: 'FDD_MechanismShape', 
      label: 'Mechanism', 
      description: 'Represents a resource that performs a function.',
      width: 80, 
      height: 40, 
      category: 'UML' 
    },
    { 
      id: 'fdd-interface', 
      svgComponent: 'FDD_InterfaceShape', 
      label: 'Interface', 
      description: 'Represents an interaction point with external environment.',
      width: 80, 
      height: 40, 
      category: 'UML' 
    },
    { 
      id: 'boundary', 
      svgComponent: 'FDD_BoundaryShape', 
      label: 'Boundary', 
      description: 'Defines the system scope.',
      width: 160, 
      height: 120, 
      category: 'UML' 
    },
    { 
      id: 'fdd-note', 
      svgComponent: 'FDD_NoteShape', 
      label: 'Note', 
      description: 'Used to add notes and assumptions.',
      width: 100, 
      height: 70, 
      category: 'UML' 
    },
    { 
      id: 'external-entity', 
      svgComponent: 'FDD_ExternalEntityShape', 
      label: 'External Entity', 
      description: 'Represents external system or person.',
      width: 100, 
      height: 60, 
      category: 'UML' 
    },
  ],

  // ═══════════════════════════════════════════════════════════════════════════
  // 2. FLOWCHART - COMPLETE WITH ALL 15 SHAPES
  // ═══════════════════════════════════════════════════════════════════════════
  'Flowchart': [
    { 
      id: 'terminator', 
      svgComponent: 'RoundedRectShape', 
      label: 'Terminator', 
      description: 'Start/End of process', 
      width: 100, 
      height: 50, 
      category: 'UML' 
    },
    { 
      id: 'process', 
      svgComponent: 'RectShape', 
      label: 'Process', 
      description: 'Processing step', 
      width: 120, 
      height: 60, 
      category: 'UML' 
    },
    { 
      id: 'io', 
      svgComponent: 'ParallelogramShape', 
      label: 'Input / Output', 
      description: 'Data input or output', 
      width: 120, 
      height: 60, 
      category: 'UML' 
    },
    { 
      id: 'decision', 
      svgComponent: 'DiamondShape', 
      label: 'Decision', 
      description: 'Branch point', 
      width: 100, 
      height: 80, 
      category: 'UML' 
    },
    { 
      id: 'on-page-connector', 
      svgComponent: 'CircleShape', 
      label: 'On-Page Connector', 
      description: 'Connection within the same page', 
      width: 40, 
      height: 40, 
      category: 'UML' 
    },
    { 
      id: 'off-page-connector', 
      svgComponent: 'PentagonShape', 
      label: 'Off-Page Connector', 
      description: 'Connection to another page', 
      width: 50, 
      height: 60, 
      category: 'UML' 
    },
    { 
      id: 'flow-line', 
      svgComponent: 'ConnectorArrowShape', 
      label: 'Flow Line', 
      description: 'Connector with arrow', 
      width: 80, 
      height: 40, 
      category: 'UML' 
    },
    { 
      id: 'document', 
      svgComponent: 'DocumentShape', 
      label: 'Document', 
      description: 'Printed document', 
      width: 100, 
      height: 70, 
      category: 'UML' 
    },
    { 
      id: 'database', 
      svgComponent: 'CylinderShape', 
      label: 'Database', 
      description: 'Data storage', 
      width: 100, 
      height: 70, 
      category: 'UML' 
    },
    { 
      id: 'predefined', 
      svgComponent: 'PredefinedShape', 
      label: 'Predefined Process', 
      description: 'Sub-process call', 
      width: 120, 
      height: 60, 
      category: 'UML' 
    },
    { 
      id: 'manual-input', 
      svgComponent: 'TrapezoidShape', 
      label: 'Manual Input', 
      description: 'Manual data entry', 
      width: 100, 
      height: 60, 
      category: 'UML' 
    },
    { 
      id: 'delay', 
      svgComponent: 'DShape', 
      label: 'Delay', 
      description: 'Waiting period', 
      width: 100, 
      height: 60, 
      category: 'UML' 
    },
    { 
      id: 'preparation', 
      svgComponent: 'HexagonShape', 
      label: 'Preparation', 
      description: 'Setup/initialization', 
      width: 100, 
      height: 80, 
      category: 'UML' 
    },
    { 
      id: 'display', 
      svgComponent: 'DisplayShape', 
      label: 'Display', 
      description: 'Show information', 
      width: 100, 
      height: 60, 
      category: 'UML' 
    },
    { 
      id: 'annotation', 
      svgComponent: 'AnnotationShape', 
      label: 'Annotation', 
      description: 'Comment/note', 
      width: 100, 
      height: 40, 
      category: 'UML' 
    },
  ],

  // ═══════════════════════════════════════════════════════════════════════════
  // 3. DATA FLOW DIAGRAM
  // ═══════════════════════════════════════════════════════════════════════════
  'Data Flow Diagram': [
    { id: 'dfd-external-entity', svgComponent: 'RectShape', label: 'External Entity', description: 'External system or user', width: 120, height: 60, category: 'UML' },
    { id: 'dfd-process', svgComponent: 'EllipseShape', label: 'Process', description: 'Data transformation', width: 100, height: 60, category: 'UML' },
    { id: 'data-store', svgComponent: 'CylinderShape', label: 'Data Store', description: 'Data repository', width: 100, height: 70, category: 'UML' },
    { id: 'data-flow', svgComponent: 'ConnectorArrowShape', label: 'Data Flow', description: 'Data movement', width: 80, height: 40, category: 'UML' },
  ],

  // ═══════════════════════════════════════════════════════════════════════════
  // 4. ENTITY RELATIONSHIP DIAGRAM
  // ═══════════════════════════════════════════════════════════════════════════
  'Entity Relationship Diagram': [
    { id: 'entity', svgComponent: 'EntityShape', label: 'Entity', description: 'Database table', width: 120, height: 60, category: 'UML' },
    { id: 'weak-entity', svgComponent: 'WeakEntityShape', label: 'Weak Entity', description: 'Dependent entity', width: 120, height: 60, category: 'UML' },
    { id: 'attribute', svgComponent: 'AttributeShape', label: 'Attribute', description: 'Entity property', width: 100, height: 50, category: 'UML' },
    { id: 'primary-key', svgComponent: 'PrimaryKeyShape', label: 'Primary Key', description: 'Unique identifier', width: 100, height: 50, category: 'UML' },
    { id: 'derived-attr', svgComponent: 'DerivedAttrShape', label: 'Derived Attr', description: 'Calculated attribute', width: 100, height: 50, category: 'UML' },
    { id: 'composite-attr', svgComponent: 'CompositeAttrShape', label: 'Composite Attr', description: 'Nested attribute', width: 100, height: 60, category: 'UML' },
    { id: 'multi-attr', svgComponent: 'MultiAttrShape', label: 'Multi-valued Attr', description: 'Multiple values', width: 100, height: 50, category: 'UML' },
    { id: 'relationship', svgComponent: 'RelationshipShape', label: 'Relationship', description: 'Entity relationship', width: 100, height: 80, category: 'UML' },
    { id: 'identifying-rel', svgComponent: 'IdentifyingRelShape', label: 'Identifying Rel.', description: 'Weak entity relationship', width: 100, height: 80, category: 'UML' },
    { id: 'cardinality', svgComponent: 'CardinalityShape', label: 'Cardinality', description: 'Chen notation', width: 40, height: 30, category: 'UML' },
    { id: 'crow-one', svgComponent: 'CrowOneShape', label: 'Exactly One', description: "Crow's Foot: 1", width: 60, height: 40, category: 'UML' },
    { id: 'crow-zero-one', svgComponent: 'CrowZeroOneShape', label: 'Zero or One', description: "Crow's Foot: 0..1", width: 60, height: 40, category: 'UML' },
    { id: 'crow-zero-many', svgComponent: 'CrowZeroManyShape', label: 'Zero or Many', description: "Crow's Foot: 0..*", width: 60, height: 40, category: 'UML' },
    { id: 'crow-one-many', svgComponent: 'CrowOneManyShape', label: 'One or Many', description: "Crow's Foot: 1..*", width: 60, height: 40, category: 'UML' },
    { id: 'crow-many', svgComponent: 'CrowManyShape', label: 'Many', description: "Crow's Foot: *", width: 60, height: 40, category: 'UML' },
    { id: 'total-participation', svgComponent: 'TotalParticipationShape', label: 'Total Participation', description: 'Double line', width: 40, height: 40, category: 'UML' },
    { id: 'partial-participation', svgComponent: 'PartialParticipationShape', label: 'Partial Participation', description: 'Single line', width: 40, height: 40, category: 'UML' },
    { id: 'erd-connector', svgComponent: 'ERDConnectorShape', label: 'Connector', description: 'Relationship line', width: 60, height: 20, category: 'UML' },
  ],

  // ═══════════════════════════════════════════════════════════════════════════
  // 5. FISHBONE DIAGRAM
  // ═══════════════════════════════════════════════════════════════════════════
  'Fishbone Diagram': [
    { id: 'effect', svgComponent: 'RectShape', label: 'Head (Effect)', description: 'Problem being analyzed', width: 140, height: 60, category: 'UML' },
    { id: 'spine', svgComponent: 'ConnectorArrowShape', label: 'Spine', description: 'Central backbone', width: 100, height: 30, category: 'UML' },
    { id: 'major-bone', svgComponent: 'ArrowDiagShape', label: 'Major Bone', description: 'Cause category', width: 80, height: 50, category: 'UML' },
    { id: 'sub-bone', svgComponent: 'ArrowSmallShape', label: 'Sub-Cause', description: 'Specific cause', width: 60, height: 40, category: 'UML' },
    { id: 'root-cause', svgComponent: 'TextShape', label: 'Root Cause', description: 'Final cause label', width: 80, height: 30, category: 'UML' },
  ],

  // ═══════════════════════════════════════════════════════════════════════════
  // 6. SCHEMATIC DIAGRAM
  // ═══════════════════════════════════════════════════════════════════════════
  'Schematic Diagram': [
    { id: 'resistor', svgComponent: 'ResistorShape', label: 'Resistor', description: 'Electrical resistance', width: 100, height: 40, category: 'UML' },
    { id: 'capacitor', svgComponent: 'CapacitorShape', label: 'Capacitor', description: 'Charge storage', width: 80, height: 50, category: 'UML' },
    { id: 'inductor', svgComponent: 'InductorShape', label: 'Inductor', description: 'Magnetic field storage', width: 100, height: 40, category: 'UML' },
    { id: 'voltage', svgComponent: 'VoltageShape', label: 'Voltage Source', description: 'Power supply', width: 80, height: 80, category: 'UML' },
    { id: 'ground', svgComponent: 'GroundShape', label: 'Ground', description: 'Reference point', width: 40, height: 50, category: 'UML' },
    { id: 'diode', svgComponent: 'DiodeShape', label: 'Diode', description: 'One-way current', width: 80, height: 50, category: 'UML' },
    { id: 'transistor', svgComponent: 'TransistorShape', label: 'Transistor', description: 'Semiconductor switch', width: 100, height: 80, category: 'UML' },
    { id: 'ic', svgComponent: 'ICShape', label: 'IC', description: 'Integrated circuit', width: 100, height: 80, category: 'UML' },
    { id: 'opamp', svgComponent: 'OpAmpShape', label: 'Op-Amp', description: 'Operational amplifier', width: 100, height: 70, category: 'UML' },
    { id: 'switch', svgComponent: 'SwitchShape', label: 'Switch', description: 'On/Off control', width: 80, height: 60, category: 'UML' },
    { id: 'fuse', svgComponent: 'FuseShape', label: 'Fuse', description: 'Overcurrent protection', width: 80, height: 40, category: 'UML' },
    { id: 'transformer', svgComponent: 'TransformerShape', label: 'Transformer', description: 'Voltage conversion', width: 100, height: 60, category: 'UML' },
  ],

  // ═══════════════════════════════════════════════════════════════════════════
  // 7. USE CASE DIAGRAM
  // ═══════════════════════════════════════════════════════════════════════════
  'Use Case Diagram': [
    { id: 'use-case', svgComponent: 'EllipseShape', label: 'Use Case', description: 'System functionality', width: 120, height: 60, category: 'UML' },
    { id: 'uc-actor', svgComponent: 'ActorShape', label: 'Actor', description: 'System user', width: 60, height: 80, category: 'UML' },
    { id: 'system-boundary', svgComponent: 'RectShape', label: 'System Boundary', description: 'System scope', width: 200, height: 150, category: 'UML' },
    { id: 'association', svgComponent: 'LineShape', label: 'Association', description: 'Communication', width: 80, height: 20, category: 'UML' },
    { id: 'include-rel', svgComponent: 'DashedArrowShape', label: 'Include', description: 'Mandatory behavior', width: 80, height: 40, category: 'UML' },
    { id: 'extend-rel', svgComponent: 'DashedArrowBackShape', label: 'Extend', description: 'Optional behavior', width: 80, height: 40, category: 'UML' },
    { id: 'generalization', svgComponent: 'TriangleArrowShape', label: 'Generalization', description: 'Inheritance', width: 80, height: 40, category: 'UML' },
  ],

  // ═══════════════════════════════════════════════════════════════════════════
  // 8. ACTIVITY DIAGRAM
  // ═══════════════════════════════════════════════════════════════════════════
  'Activity Diagram': [
    { id: 'start-node', svgComponent: 'InitialNodeShape', label: 'Start Node', description: 'Workflow start', width: 30, height: 30, category: 'UML' },
    { id: 'action', svgComponent: 'RoundedRectShape', label: 'Action', description: 'Activity step', width: 120, height: 60, category: 'UML' },
    { id: 'decision-node', svgComponent: 'DiamondShape', label: 'Decision', description: 'Branch point', width: 100, height: 80, category: 'UML' },
    { id: 'fork', svgComponent: 'ForkJoinShape', label: 'Fork', description: 'Parallel split', width: 80, height: 20, category: 'UML' },
    { id: 'join', svgComponent: 'ForkJoinShape', label: 'Join', description: 'Parallel sync', width: 80, height: 20, category: 'UML' },
    { id: 'end-node', svgComponent: 'FinalNodeShape', label: 'End Node', description: 'Workflow end', width: 40, height: 40, category: 'UML' },
    { id: 'flow-edge', svgComponent: 'ConnectorArrowShape', label: 'Flow Edge', description: 'Sequence flow', width: 80, height: 40, category: 'UML' },
    { id: 'swimlane', svgComponent: 'RectShape', label: 'Swimlane', description: 'Responsibility partition', width: 160, height: 120, category: 'UML' },
  ],

  // ═══════════════════════════════════════════════════════════════════════════
  // 9. SEQUENCE DIAGRAM
  // ═══════════════════════════════════════════════════════════════════════════
  'Sequence Diagram': [
    { id: 'seq-actor', svgComponent: 'ActorShape', label: 'Actor', description: 'Interaction initiator', width: 60, height: 80, category: 'UML' },
    { id: 'lifeline', svgComponent: 'LifelineShape', label: 'Lifeline', description: 'Object timeline', width: 100, height: 60, category: 'UML' },
    { id: 'activation', svgComponent: 'ActivationShape', label: 'Activation', description: 'Execution period', width: 20, height: 80, category: 'UML' },
    { id: 'sync-msg', svgComponent: 'FilledArrowShape', label: 'Sync Message', description: 'Blocking call', width: 80, height: 40, category: 'UML' },
    { id: 'async-msg', svgComponent: 'OpenArrowShape', label: 'Async Message', description: 'Non-blocking call', width: 80, height: 40, category: 'UML' },
    { id: 'return-msg', svgComponent: 'DashedArrowShape', label: 'Return', description: 'Response', width: 80, height: 40, category: 'UML' },
    { id: 'self-call', svgComponent: 'LoopArrowShape', label: 'Self-Call', description: 'Recursive call', width: 60, height: 60, category: 'UML' },
    { id: 'create-msg', svgComponent: 'CreateArrowShape', label: 'Create', description: 'Instantiation', width: 80, height: 40, category: 'UML' },
    { id: 'destruction', svgComponent: 'DestructionShape', label: 'Destruction', description: 'Object deletion', width: 30, height: 30, category: 'UML' },
    { id: 'combined-fragment', svgComponent: 'DashedRectShape', label: 'Combined Fragment', description: 'Control structure', width: 120, height: 80, category: 'UML' },
  ],

  // ═══════════════════════════════════════════════════════════════════════════
  // 10. CLASS DIAGRAM
  // ═══════════════════════════════════════════════════════════════════════════
  'Class Diagram': [
    { id: 'class-box', svgComponent: 'ClassBoxShape', label: 'Class', description: 'Class definition', width: 140, height: 90, category: 'UML' },
    { id: 'uml-interface', svgComponent: 'InterfaceShape', label: 'Interface', description: 'Contract definition', width: 140, height: 70, category: 'UML' },
    { id: 'abstract-class', svgComponent: 'AbstractClassShape', label: 'Abstract Class', description: 'Partial implementation', width: 140, height: 90, category: 'UML' },
    { id: 'association', svgComponent: 'LineShape', label: 'Association', description: 'Relationship', width: 80, height: 20, category: 'UML' },
    { id: 'inheritance', svgComponent: 'TriangleArrowShape', label: 'Inheritance', description: 'Is-a relationship', width: 80, height: 40, category: 'UML' },
    { id: 'aggregation', svgComponent: 'AggregationShape', label: 'Aggregation', description: 'Has-a (weak)', width: 80, height: 40, category: 'UML' },
    { id: 'composition', svgComponent: 'CompositionShape', label: 'Composition', description: 'Has-a (strong)', width: 80, height: 40, category: 'UML' },
    { id: 'dependency', svgComponent: 'DashedArrowShape', label: 'Dependency', description: 'Uses relationship', width: 80, height: 40, category: 'UML' },
    { id: 'multiplicity', svgComponent: 'MultiplicityShape', label: 'Multiplicity', description: 'Cardinality notation', width: 40, height: 20, category: 'UML' },
  ],
};

// ─── SHAPE ID TO STYLE MAP ──────────────────────────────────────────────────

export const SHAPE_STYLE_MAP: Record<string, string> = {
  // ─── Basic Shapes ────────────────────────────────────────────────────────
  'RectShape': 'rectangle',
  'RoundedRectShape': 'roundedRectangle',
  'CircleShape': 'circle',
  'EllipseShape': 'ellipse',
  'DiamondShape': 'diamond',
  'TriangleShape': 'triangle',
  'ParallelogramShape': 'parallelogram',
  'CylinderShape': 'cylinder3',
  'DocumentShape': 'document',
  'FolderShape': 'folder',
  'CloudShape': 'cloud',
  'NoteStandaloneShape': 'noteStandalone',
  'ActorShape': 'actor',
  'ConnectorArrowShape': 'connectorArrow',
  'DoubleRectShape': 'doubleRectangle',
  'DoubleRhombusShape': 'doubleRhombus',
  'MultiOvalShape': 'multiAttr',
  'LineShape': 'line',
  'TextShape': 'text',
  'DashedRectShape': 'dashedRect',
  'PredefinedShape': 'predefined',
  'RhombusShape': 'diamond',
  
  // ─── Flowchart Shapes ──────────────────────────────────────────────────
  'PentagonShape': 'pentagon',
  'TrapezoidShape': 'trapezoid',
  'DShape': 'dshape',
  'HexagonShape': 'hexagon',
  'DisplayShape': 'display',
  'AnnotationShape': 'annotation',
  
  // ─── UML Shapes ──────────────────────────────────────────────────────────
  'InitialNodeShape': 'initialNode',
  'FinalNodeShape': 'finalNode',
  'ForkJoinShape': 'forkJoin',
  'LifelineShape': 'lifeline',
  'ActivationShape': 'activationBox',
  'ClassBoxShape': 'classBox',
  'InterfaceShape': 'interface',
  'AbstractClassShape': 'abstractClass',
  
  // ─── ERD Shapes ──────────────────────────────────────────────────────────
  'EntityShape': 'entity',
  'WeakEntityShape': 'weakEntity',
  'AttributeShape': 'attribute',
  'PrimaryKeyShape': 'primaryKey',
  'DerivedAttrShape': 'derivedAttr',
  'CompositeAttrShape': 'compositeAttr',
  'MultiAttrShape': 'multiAttr',
  'RelationshipShape': 'relationship',
  'IdentifyingRelShape': 'identifyingRel',
  'CardinalityShape': 'cardinality',
  'CrowOneShape': 'crowOne',
  'CrowZeroOneShape': 'crowZeroOne',
  'CrowZeroManyShape': 'crowZeroMany',
  'CrowOneManyShape': 'crowOneMany',
  'CrowManyShape': 'crowMany',
  'TotalParticipationShape': 'totalParticipation',
  'PartialParticipationShape': 'partialParticipation',
  'ERDConnectorShape': 'erdConnector',
  
  // ─── Arrow Shapes ────────────────────────────────────────────────────────
  'ArrowShape': 'arrow',
  'ArrowDownShape': 'arrowDown',
  'ArrowRightShape': 'arrowRight',
  'FilledArrowShape': 'filledArrow',
  'OpenArrowShape': 'openArrow',
  'DashedArrowShape': 'dashedArrow',
  'DashedArrowBackShape': 'dashedArrowBack',
  'TriangleArrowShape': 'triangleArrow',
  'LoopArrowShape': 'loopArrow',
  'CreateArrowShape': 'createArrow',
  'DestructionShape': 'destruction',
  'AggregationShape': 'aggregation',
  'CompositionShape': 'composition',
  'MultiplicityShape': 'multiplicity',
  'ArrowDiagShape': 'arrowDiag',
  'ArrowSmallShape': 'arrowSmall',
  
  // ─── Schematic Shapes ────────────────────────────────────────────────────
  'ResistorShape': 'resistor',
  'CapacitorShape': 'capacitor',
  'InductorShape': 'inductor',
  'VoltageShape': 'voltage',
  'GroundShape': 'ground',
  'DiodeShape': 'diode',
  'TransistorShape': 'transistor',
  'ICShape': 'ic',
  'OpAmpShape': 'opamp',
  'SwitchShape': 'switch',
  'FuseShape': 'fuse',
  'TransformerShape': 'transformer',
  
  // ─── FDD Shapes ─────────────────────────────────────────────────────────
  'FDD_FunctionShape': 'roundedRectangle',
  'FDD_InputShape': 'rectangle',
  'FDD_OutputShape': 'rectangle',
  'FDD_ControlShape': 'line',
  'FDD_MechanismShape': 'dashedArrow',
  'FDD_InterfaceShape': 'line',
  'FDD_BoundaryShape': 'dashedRect',
  'FDD_NoteShape': 'noteStandalone',
  'FDD_ExternalEntityShape': 'ellipse',
  
  // ─── Default ─────────────────────────────────────────────────────────────
  'default': 'default',
};

// ════════════════════════════════════════════════════════════════════════════
// ⭐ CRITICAL: IGRAPH ID TO STYLE MAP - Maps shape IDs to canvas styles
// ════════════════════════════════════════════════════════════════════════════

export const IGRAPH_ID_STYLE_MAP: Record<string, string> = {
  // ─── FDD Shapes ──────────────────────────────────────────────────────────
  'function': 'igraph.fdd.function',
  'input': 'igraph.fdd.input',
  'output': 'igraph.fdd.output',
  'control': 'igraph.fdd.control',
  'mechanism': 'igraph.fdd.mechanism',
  'fdd-interface': 'igraph.fdd.interface',
  'boundary': 'igraph.fdd.boundary',
  'fdd-note': 'igraph.fdd.note',
  'external-entity': 'igraph.fdd.externalEntity',
  
  // ─── Standard ───────────────────────────────────────────────────────────
  'rectangle': 'igraph.rectangle',
  'rounded-rectangle': 'igraph.roundedRectangle',
  'circle': 'igraph.circle',
  'ellipse': 'igraph.ellipse',
  'diamond': 'igraph.diamond',
  'triangle': 'igraph.triangle',
  'parallelogram': 'igraph.parallelogram',
  'cylinder': 'igraph.cylinder',
  'document': 'igraph.document',
  'folder': 'igraph.folder',
  'cloud': 'igraph.cloud',
  'note': 'igraph.noteStandalone',
  'actor': 'igraph.actor',
  'connector-arrow': 'igraph.connectorArrow',

  // ─── Flowchart ──────────────────────────────────────────────────────────
  'terminator': 'igraph.roundedRectangle',
  'process': 'igraph.rectangle',
  'decision': 'igraph.diamond',
  'io': 'igraph.parallelogram',
  'on-page-connector': 'igraph.circle',
  'off-page-connector': 'igraph.pentagon',
  'flow-line': 'igraph.connectorArrow',
  'predefined': 'igraph.predefined',
  'database': 'igraph.cylinder',
  'manual-input': 'igraph.trapezoid',
  'delay': 'igraph.dshape',
  'preparation': 'igraph.hexagon',
  'display': 'igraph.display',
  'annotation': 'igraph.annotation',

  // ─── Data Flow ──────────────────────────────────────────────────────────
  'dfd-external-entity': 'igraph.rectangle',
  'dfd-process': 'igraph.ellipse',
  'data-store': 'igraph.cylinder',
  'data-flow': 'igraph.connectorArrow',

  // ─── ERD ────────────────────────────────────────────────────────────────
  'entity': 'igraph.entity',
  'weak-entity': 'igraph.weakEntity',
  'attribute': 'igraph.attribute',
  'primary-key': 'igraph.primaryKey',
  'derived-attr': 'igraph.derivedAttr',
  'composite-attr': 'igraph.compositeAttr',
  'multi-attr': 'igraph.multiAttr',
  'relationship': 'igraph.relationship',
  'identifying-rel': 'igraph.identifyingRel',
  'cardinality': 'igraph.cardinality',
  'crow-one': 'igraph.crowOne',
  'crow-zero-one': 'igraph.crowZeroOne',
  'crow-zero-many': 'igraph.crowZeroMany',
  'crow-one-many': 'igraph.crowOneMany',
  'crow-many': 'igraph.crowMany',
  'total-participation': 'igraph.totalParticipation',
  'partial-participation': 'igraph.partialParticipation',
  'erd-connector': 'igraph.erdConnector',

  // ─── Fishbone ────────────────────────────────────────────────────────────
  'effect': 'igraph.rectangle',
  'spine': 'igraph.connectorArrow',
  'major-bone': 'igraph.arrowDiag',
  'sub-bone': 'igraph.arrowSmall',
  'root-cause': 'igraph.text',

  // ─── Schematic ──────────────────────────────────────────────────────────
  'resistor': 'igraph.resistor',
  'capacitor': 'igraph.capacitor',
  'inductor': 'igraph.inductor',
  'voltage': 'igraph.voltage',
  'ground': 'igraph.ground',
  'diode': 'igraph.diode',
  'transistor': 'igraph.transistor',
  'ic': 'igraph.ic',
  'opamp': 'igraph.opamp',
  'switch': 'igraph.switch',
  'fuse': 'igraph.fuse',
  'transformer': 'igraph.transformer',

  // ─── Use Case ───────────────────────────────────────────────────────────
  'use-case': 'igraph.ellipse',
  'uc-actor': 'igraph.actor',
  'system-boundary': 'igraph.rectangle',
  'association': 'igraph.line',
  'include-rel': 'igraph.dashedArrow',
  'extend-rel': 'igraph.dashedArrowBack',
  'generalization': 'igraph.triangleArrow',

  // ─── Activity ───────────────────────────────────────────────────────────
  'start-node': 'igraph.initialNode',
  'action': 'igraph.roundedRectangle',
  'decision-node': 'igraph.diamond',
  'fork': 'igraph.forkJoin',
  'join': 'igraph.forkJoin',
  'end-node': 'igraph.finalNode',
  'flow-edge': 'igraph.connectorArrow',
  'swimlane': 'igraph.rectangle',

  // ─── Sequence ───────────────────────────────────────────────────────────
  'seq-actor': 'igraph.actor',
  'lifeline': 'igraph.lifeline',
  'activation': 'igraph.activation',
  'sync-msg': 'igraph.filledArrow',
  'async-msg': 'igraph.openArrow',
  'return-msg': 'igraph.dashedArrow',
  'self-call': 'igraph.loopArrow',
  'create-msg': 'igraph.createArrow',
  'destruction': 'igraph.destruction',
  'combined-fragment': 'igraph.dashedRect',

  // ─── Class ──────────────────────────────────────────────────────────────
  'class-box': 'igraph.classBox',
  'uml-interface': 'igraph.interface',
  'abstract-class': 'igraph.abstractClass',
  'inheritance': 'igraph.triangleArrow',
  'aggregation': 'igraph.aggregation',
  'composition': 'igraph.composition',
  'dependency': 'igraph.dashedArrow',
  'multiplicity': 'igraph.multiplicity',
};

// ════════════════════════════════════════════════════════════════════════════
// IGRAPH STYLE MAP - Maps SVG component names to canvas styles
// ════════════════════════════════════════════════════════════════════════════

export const IGRAPH_STYLE_MAP: Record<string, string> = {
  // ─── FDD Shapes ──────────────────────────────────────────────────────────
  'FDD_FunctionShape': 'igraph.fdd.function',
  'FDD_InputShape': 'igraph.fdd.input',
  'FDD_OutputShape': 'igraph.fdd.output',
  'FDD_ControlShape': 'igraph.fdd.control',
  'FDD_MechanismShape': 'igraph.fdd.mechanism',
  'FDD_InterfaceShape': 'igraph.fdd.interface',
  'FDD_BoundaryShape': 'igraph.fdd.boundary',
  'FDD_NoteShape': 'igraph.fdd.note',
  'FDD_ExternalEntityShape': 'igraph.fdd.externalEntity',

  // ─── Standard ───────────────────────────────────────────────────────────
  'RectShape': 'igraph.rectangle',
  'RoundedRectShape': 'igraph.roundedRectangle',
  'CircleShape': 'igraph.circle',
  'EllipseShape': 'igraph.ellipse',
  'DiamondShape': 'igraph.diamond',
  'TriangleShape': 'igraph.triangle',
  'ParallelogramShape': 'igraph.parallelogram',
  'CylinderShape': 'igraph.cylinder',
  'DocumentShape': 'igraph.document',
  'FolderShape': 'igraph.folder',
  'CloudShape': 'igraph.cloud',
  'NoteStandaloneShape': 'igraph.noteStandalone',
  'ActorShape': 'igraph.actor',
  'ConnectorArrowShape': 'igraph.connectorArrow',

  // ─── Flowchart Shapes ──────────────────────────────────────────────────
  'PentagonShape': 'igraph.pentagon',
  'TrapezoidShape': 'igraph.trapezoid',
  'DShape': 'igraph.dshape',
  'HexagonShape': 'igraph.hexagon',
  'DisplayShape': 'igraph.display',
  'AnnotationShape': 'igraph.annotation',

  // ─── Basic (legacy) ────────────────────────────────────────────────────
  'DoubleRectShape': 'igraph.doubleRectangle',
  'DoubleRhombusShape': 'igraph.doubleRhombus',
  'MultiOvalShape': 'igraph.multiOval',
  'LineShape': 'igraph.line',
  'TextShape': 'igraph.text',
  'DashedRectShape': 'igraph.dashedRect',
  'PredefinedShape': 'igraph.predefined',

  // ─── UML ────────────────────────────────────────────────────────────────
  'InitialNodeShape': 'igraph.initialNode',
  'FinalNodeShape': 'igraph.finalNode',
  'ForkJoinShape': 'igraph.forkJoin',
  'LifelineShape': 'igraph.lifeline',
  'ActivationShape': 'igraph.activation',
  'ClassBoxShape': 'igraph.classBox',
  'InterfaceShape': 'igraph.interface',
  'AbstractClassShape': 'igraph.abstractClass',

  // ─── ERD ────────────────────────────────────────────────────────────────
  'EntityShape': 'igraph.entity',
  'WeakEntityShape': 'igraph.weakEntity',
  'AttributeShape': 'igraph.attribute',
  'PrimaryKeyShape': 'igraph.primaryKey',
  'DerivedAttrShape': 'igraph.derivedAttr',
  'CompositeAttrShape': 'igraph.compositeAttr',
  'MultiAttrShape': 'igraph.multiAttr',
  'RelationshipShape': 'igraph.relationship',
  'IdentifyingRelShape': 'igraph.identifyingRel',
  'CardinalityShape': 'igraph.cardinality',
  'CrowOneShape': 'igraph.crowOne',
  'CrowZeroOneShape': 'igraph.crowZeroOne',
  'CrowZeroManyShape': 'igraph.crowZeroMany',
  'CrowOneManyShape': 'igraph.crowOneMany',
  'CrowManyShape': 'igraph.crowMany',
  'TotalParticipationShape': 'igraph.totalParticipation',
  'PartialParticipationShape': 'igraph.partialParticipation',
  'ERDConnectorShape': 'igraph.erdConnector',

  // ─── Arrows ─────────────────────────────────────────────────────────────
  'ArrowShape': 'igraph.arrow',
  'ArrowDownShape': 'igraph.arrowDown',
  'ArrowRightShape': 'igraph.arrowRight',
  'FilledArrowShape': 'igraph.filledArrow',
  'OpenArrowShape': 'igraph.openArrow',
  'DashedArrowShape': 'igraph.dashedArrow',
  'DashedArrowBackShape': 'igraph.dashedArrowBack',
  'TriangleArrowShape': 'igraph.triangleArrow',
  'LoopArrowShape': 'igraph.loopArrow',
  'CreateArrowShape': 'igraph.createArrow',
  'DestructionShape': 'igraph.destruction',
  'AggregationShape': 'igraph.aggregation',
  'CompositionShape': 'igraph.composition',
  'MultiplicityShape': 'igraph.multiplicity',
  'ArrowDiagShape': 'igraph.arrowDiag',
  'ArrowSmallShape': 'igraph.arrowSmall',

  // ─── Schematic ─────────────────────────────────────────────────────────
  'ResistorShape': 'igraph.resistor',
  'CapacitorShape': 'igraph.capacitor',
  'InductorShape': 'igraph.inductor',
  'VoltageShape': 'igraph.voltage',
  'GroundShape': 'igraph.ground',
  'DiodeShape': 'igraph.diode',
  'TransistorShape': 'igraph.transistor',
  'ICShape': 'igraph.ic',
  'OpAmpShape': 'igraph.opamp',
  'SwitchShape': 'igraph.switch',
  'FuseShape': 'igraph.fuse',
  'TransformerShape': 'igraph.transformer',
};

// ─── HELPER FUNCTIONS ────────────────────────────────────────────────────────

export const getShapesForDiagram = (diagramType: string): ShapeDefinition[] => {
  return DIAGRAM_SHAPES[diagramType] || [];
};

export const getAllShapeIds = (): string[] => {
  const ids = new Set<string>();
  Object.values(DIAGRAM_SHAPES).forEach(shapes => {
    shapes.forEach(shape => ids.add(shape.id));
  });
  return Array.from(ids);
};

export const getStyleForSvgComponent = (svgComponent: string): string => {
  return SHAPE_STYLE_MAP[svgComponent] || 'default';
};

export const getStyleForShapeId = (shapeId: string): string => {
  return IGRAPH_ID_STYLE_MAP[shapeId] || 'igraph.rectangle';
};