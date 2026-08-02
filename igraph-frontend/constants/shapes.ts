export interface ShapeDefinition {
  id: string;
  svgComponent: string;
  label: string;
  description?: string;
  width: number;
  height: number;
  category: 'UML' | 'SDLC';
  // Pre-filled cell text on drop/insert (e.g. System Boundary's "App") —
  // most shapes omit this and start blank, same as before.
  defaultLabel?: string;
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
  // 1. FUNCTIONAL DECOMPOSITION DIAGRAM
  // ═══════════════════════════════════════════════════════════════════════════
  'Functional Decomposition Diagram': [
    { id: 'function', svgComponent: 'FDD_FunctionShape', label: 'Function', description: 'Represents a primary function or sub-function.', width: 120, height: 60, category: 'UML' },
    { id: 'control', svgComponent: 'FDD_ControlShape', label: 'Control', description: 'Represents a control that governs a function.', width: 80, height: 40, category: 'UML' },
    { id: 'mechanism', svgComponent: 'FDD_MechanismShape', label: 'Mechanism', description: 'Represents a resource that performs a function.', width: 80, height: 40, category: 'UML' },
    { id: 'fdd-interface', svgComponent: 'FDD_InterfaceShape', label: 'Interface', description: 'Represents an interaction point with external environment.', width: 80, height: 40, category: 'UML' },
    { id: 'boundary', svgComponent: 'FDD_BoundaryShape', label: 'Boundary', description: 'Defines the system scope.', width: 160, height: 120, category: 'UML' },
    { id: 'fdd-note', svgComponent: 'FDD_NoteShape', label: 'Note', description: 'Used to add notes and assumptions.', width: 100, height: 70, category: 'UML' },
    { id: 'external-entity', svgComponent: 'FDD_ExternalEntityShape', label: 'External Entity', description: 'Represents external system or person.', width: 100, height: 60, category: 'UML' },
  ],

  // ═══════════════════════════════════════════════════════════════════════════
  // 2. FLOWCHART
  // ═══════════════════════════════════════════════════════════════════════════
  'Flowchart': [
    { id: 'terminator', svgComponent: 'EllipseShape', label: 'Terminator', description: 'Start/End of process', width: 100, height: 50, category: 'UML' },
    { id: 'process', svgComponent: 'RectShape', label: 'Process', description: 'Processing step', width: 120, height: 60, category: 'UML' },
    { id: 'io', svgComponent: 'ParallelogramShape', label: 'Input / Output', description: 'Data input or output', width: 120, height: 60, category: 'UML' },
    { id: 'decision', svgComponent: 'DiamondShape', label: 'Decision', description: 'Branch point', width: 100, height: 80, category: 'UML' },
    { id: 'on-page-connector', svgComponent: 'CircleShape', label: 'On-Page Connector', description: 'Connection within the same page', width: 40, height: 40, category: 'UML' },
    { id: 'off-page-connector', svgComponent: 'PentagonShape', label: 'Off-Page Connector', description: 'Connection to another page', width: 50, height: 60, category: 'UML' },
    { id: 'merge-junction', svgComponent: 'MergeJunctionShape', label: 'Merge', description: 'Point where two or more flows converge into one.', width: 40, height: 40, category: 'UML' },
    { id: 'flow-line', svgComponent: 'ConnectorArrowShape', label: 'Flow Line', description: 'Connector with arrow', width: 80, height: 40, category: 'UML' },
    { id: 'document', svgComponent: 'DocumentShape', label: 'Document', description: 'Printed document', width: 100, height: 70, category: 'UML' },
    { id: 'database', svgComponent: 'CylinderShape', label: 'Database', description: 'Data storage', width: 100, height: 70, category: 'UML' },
    { id: 'predefined', svgComponent: 'PredefinedShape', label: 'Predefined Process', description: 'Sub-process call', width: 120, height: 60, category: 'UML' },
    { id: 'manual-input', svgComponent: 'TrapezoidShape', label: 'Manual Input', description: 'Manual data entry', width: 100, height: 60, category: 'UML' },
    { id: 'delay', svgComponent: 'DShape', label: 'Delay', description: 'Waiting period', width: 100, height: 60, category: 'UML' },
    { id: 'preparation', svgComponent: 'HexagonShape', label: 'Preparation', description: 'Setup/initialization', width: 100, height: 80, category: 'UML' },
    { id: 'display', svgComponent: 'DisplayShape', label: 'Display', description: 'Show information', width: 100, height: 60, category: 'UML' },
    { id: 'annotation', svgComponent: 'AnnotationShape', label: 'Annotation', description: 'Comment/note', width: 100, height: 40, category: 'UML' },
  ],

  // ═══════════════════════════════════════════════════════════════════════════
  // 3. DATA FLOW DIAGRAM
  // ═══════════════════════════════════════════════════════════════════════════
  'Data Flow Diagram': [
    { id: 'dfd-process', svgComponent: 'DFDProcessShape', label: 'Process', description: 'Data transformation (circle)', width: 80, height: 80, category: 'UML' },
    { id: 'dfd-data-flow', svgComponent: 'DFDDataFlowShape', label: 'Data Flow', description: 'Data movement (arrow)', width: 80, height: 40, category: 'UML' },
    { id: 'dfd-data-store', svgComponent: 'DFDDataStoreShape', label: 'Data Store (Yourdon)', description: 'Data repository (parallel lines)', width: 100, height: 60, category: 'UML' },
    { id: 'dfd-data-store-gs', svgComponent: 'DFDDataStoreGSShape', label: 'Data Store (Gane)', description: 'Data repository (rectangle with side line)', width: 100, height: 60, category: 'UML' },
    { id: 'dfd-external-entity', svgComponent: 'DFDExternalEntityShape', label: 'External Entity', description: 'External system or user', width: 120, height: 60, category: 'UML' },
    { id: 'dfd-bidirectional', svgComponent: 'DFDBidirectionalShape', label: 'Bidirectional Flow', description: 'Two-way data flow', width: 80, height: 40, category: 'UML' },
    { id: 'dfd-boundary', svgComponent: 'DFDBoundaryShape', label: 'System Boundary', description: 'System scope (dashed rectangle)', width: 200, height: 150, category: 'UML' },
    { id: 'dfd-note', svgComponent: 'DFDNoteShape', label: 'Note', description: 'Comment/note', width: 100, height: 70, category: 'UML' },
    { id: 'dfd-on-page', svgComponent: 'DFDOnPageShape', label: 'On-Page Connector', description: 'Connection on same page', width: 40, height: 40, category: 'UML' },
    { id: 'dfd-off-page', svgComponent: 'DFDOffPageShape', label: 'Off-Page Connector', description: 'Connection to another page', width: 50, height: 60, category: 'UML' },
  ],

  // ═══════════════════════════════════════════════════════════════════════════
  // 4. ENTITY RELATIONSHIP DIAGRAM
  // ═══════════════════════════════════════════════════════════════════════════
  'Entity Relationship Diagram': [
    { id: 'erd-entity', svgComponent: 'ERDEntityShape', label: 'Entity', description: 'Database table', width: 120, height: 60, category: 'UML' },
    { id: 'erd-weak-entity', svgComponent: 'ERDWeakEntityShape', label: 'Weak Entity', description: 'Dependent entity', width: 120, height: 60, category: 'UML' },
    { id: 'erd-relationship', svgComponent: 'ERDRelationshipShape', label: 'Relationship', description: 'Entity relationship (diamond)', width: 100, height: 80, category: 'UML' },
    { id: 'erd-identifying-rel', svgComponent: 'ERDIdentifyingRelShape', label: 'Identifying Rel.', description: 'Weak entity relationship (double diamond)', width: 100, height: 80, category: 'UML' },
    { id: 'erd-attribute', svgComponent: 'ERDAttributeShape', label: 'Attribute', description: 'Entity property', width: 100, height: 50, category: 'UML' },
    { id: 'erd-multivalued-attr', svgComponent: 'ERDMultivaluedAttrShape', label: 'Multivalued Attr', description: 'Multiple values (double oval)', width: 100, height: 50, category: 'UML' },
    { id: 'erd-derived-attr', svgComponent: 'ERDDerivedAttrShape', label: 'Derived Attr', description: 'Calculated attribute (dashed oval)', width: 100, height: 50, category: 'UML' },
    { id: 'erd-cardinality-11', svgComponent: 'ERDCardinality11Shape', label: 'Cardinality 1:1', description: 'One to one', width: 240, height: 40, category: 'UML' },
    { id: 'erd-cardinality-1n', svgComponent: 'ERDCardinality1NShape', label: 'Cardinality 1:N', description: 'One to many', width: 240, height: 40, category: 'UML' },
    { id: 'erd-cardinality-n1', svgComponent: 'ERDCardinalityN1Shape', label: 'Cardinality N:1', description: 'Many to one', width: 240, height: 40, category: 'UML' },
    { id: 'erd-cardinality-mn', svgComponent: 'ERDCardinalityMNShape', label: 'Cardinality M:N', description: 'Many to many', width: 240, height: 40, category: 'UML' },
    { id: 'erd-connector', svgComponent: 'ERDConnectorShape', label: 'Connector', description: 'Relationship line', width: 60, height: 20, category: 'UML' },
  ],

  // ═══════════════════════════════════════════════════════════════════════════
  // 5. FISHBONE DIAGRAM
  // ═══════════════════════════════════════════════════════════════════════════
  'Fishbone Diagram': [
    { id: 'fishbone-spine', svgComponent: 'FishboneSpineShape', label: 'Spine', description: 'Central backbone', width: 120, height: 20, category: 'UML' },
    { id: 'fishbone-head', svgComponent: 'FishboneHeadShape', label: 'Fish Head', description: 'Problem/Effect', width: 160, height: 130, category: 'UML' },
    { id: 'fishbone-problem', svgComponent: 'FishboneProblemShape', label: 'Effect Box', description: 'Problem being analyzed', width: 140, height: 60, category: 'UML' },
    { id: 'fishbone-cause-top', svgComponent: 'FishboneCauseTopShape', label: 'Main Cause (Top)', description: 'Cause category above spine', width: 100, height: 80, category: 'UML' },
    { id: 'fishbone-cause-bottom', svgComponent: 'FishboneCauseBottomShape', label: 'Main Cause (Bottom)', description: 'Cause category below spine', width: 100, height: 80, category: 'UML' },
    { id: 'fishbone-arrow', svgComponent: 'FishboneArrowShape', label: 'Cause Arrow', description: 'Cause link arrow', width: 90, height: 45, category: 'UML' },
    { id: 'fishbone-dashed-arrow', svgComponent: 'FishboneDashedArrowShape', label: 'Possible Cause', description: 'Possible cause link', width: 90, height: 45, category: 'UML' },
    { id: 'fishbone-category', svgComponent: 'FishboneCategoryShape', label: 'Category Box', description: 'Category label', width: 80, height: 40, category: 'UML' },
    { id: 'fishbone-bubble', svgComponent: 'FishboneBubbleShape', label: 'Cause Bubble', description: 'Cause/Reason bubble', width: 60, height: 40, category: 'UML' },
    { id: 'fishbone-note', svgComponent: 'FishboneNoteShape', label: 'Note', description: 'Comment/note', width: 100, height: 70, category: 'UML' },
  ],

  // ═══════════════════════════════════════════════════════════════════════════
  // 6. SCHEMATIC DIAGRAM
  // ═══════════════════════════════════════════════════════════════════════════
  'Schematic Diagram': [
    { id: 'schematic-battery', svgComponent: 'SchematicBatteryShape', label: 'DC Voltage Source', description: 'Battery', width: 80, height: 60, category: 'UML' },
    { id: 'schematic-ac', svgComponent: 'SchematicACShape', label: 'AC Voltage Source', description: 'AC source', width: 80, height: 60, category: 'UML' },
    { id: 'schematic-ground', svgComponent: 'SchematicGroundShape', label: 'Ground', description: 'Reference point', width: 40, height: 50, category: 'UML' },
    { id: 'schematic-resistor', svgComponent: 'SchematicResistorShape', label: 'Resistor', description: 'Electrical resistance', width: 100, height: 40, category: 'UML' },
    { id: 'schematic-variable-resistor', svgComponent: 'SchematicVariableResistorShape', label: 'Variable Resistor', description: 'Variable resistance', width: 100, height: 50, category: 'UML' },
    { id: 'schematic-capacitor', svgComponent: 'SchematicCapacitorShape', label: 'Capacitor', description: 'Charge storage', width: 80, height: 50, category: 'UML' },
    { id: 'schematic-inductor', svgComponent: 'SchematicInductorShape', label: 'Inductor', description: 'Magnetic field storage', width: 100, height: 40, category: 'UML' },
    { id: 'schematic-diode', svgComponent: 'SchematicDiodeShape', label: 'Diode', description: 'One-way current', width: 80, height: 50, category: 'UML' },
    { id: 'schematic-led', svgComponent: 'SchematicLEDShape', label: 'LED', description: 'Light emitting diode', width: 80, height: 50, category: 'UML' },
    { id: 'schematic-npn', svgComponent: 'SchematicNPNShape', label: 'NPN Transistor', description: 'NPN transistor', width: 100, height: 80, category: 'UML' },
    { id: 'schematic-switch', svgComponent: 'SchematicSwitchShape', label: 'Switch', description: 'On/Off control', width: 80, height: 60, category: 'UML' },
    { id: 'schematic-fuse', svgComponent: 'SchematicFuseShape', label: 'Fuse', description: 'Overcurrent protection', width: 80, height: 40, category: 'UML' },
    { id: 'schematic-connection', svgComponent: 'SchematicConnectionShape', label: 'Wire Connection', description: 'Connected wires', width: 60, height: 40, category: 'UML' },
    { id: 'schematic-no-connection', svgComponent: 'SchematicNoConnectionShape', label: 'No Connection', description: 'Unconnected wires', width: 60, height: 40, category: 'UML' },
  ],

  // ═══════════════════════════════════════════════════════════════════════════
  // 7. USE CASE DIAGRAM
  // ═══════════════════════════════════════════════════════════════════════════
  'Use Case Diagram': [
    { id: 'uc-actor', svgComponent: 'UMLActorShape', label: 'Actor', description: 'System user', width: 60, height: 80, category: 'UML' },
    { id: 'use-case', svgComponent: 'UMLUseCaseShape', label: 'Use Case', description: 'System functionality', width: 120, height: 60, category: 'UML' },
    { id: 'system-boundary', svgComponent: 'UMLSystemBoundaryShape', label: 'System Boundary', description: 'System scope', width: 340, height: 280, category: 'UML', defaultLabel: 'App' },
    { id: 'uc-association', svgComponent: 'UMLAssociationShape', label: 'Association', description: 'Communication', width: 80, height: 20, category: 'UML' },
    { id: 'uc-include', svgComponent: 'UMLIncludeShape', label: 'Include', description: 'Mandatory behavior', width: 80, height: 40, category: 'UML' },
    { id: 'uc-extend', svgComponent: 'UMLExtendShape', label: 'Extend', description: 'Optional behavior', width: 80, height: 40, category: 'UML' },
    { id: 'uc-generalization', svgComponent: 'UMLGeneralizationShape', label: 'Generalization', description: 'Inheritance', width: 80, height: 40, category: 'UML' },
    { id: 'uc-note', svgComponent: 'UMLNoteShape', label: 'Note', description: 'Comment/note', width: 100, height: 70, category: 'UML' },
    { id: 'uc-note-connector', svgComponent: 'UMLNoteConnectorShape', label: 'Note Connector', description: 'Note connection', width: 80, height: 20, category: 'UML' },
    { id: 'uc-include-label', svgComponent: 'UMLIncludeLabelShape', label: 'Include Label', description: '«include» text', width: 60, height: 20, category: 'UML' },
    { id: 'uc-extend-label', svgComponent: 'UMLExtendLabelShape', label: 'Extend Label', description: '«extend» text', width: 60, height: 20, category: 'UML' },
  ],

  // ═══════════════════════════════════════════════════════════════════════════
  // 8. ACTIVITY DIAGRAM
  // ═══════════════════════════════════════════════════════════════════════════
  'Activity Diagram': [
    { id: 'act-initial-node', svgComponent: 'UMLInitialNodeShape', label: 'Initial Node', description: 'Workflow start', width: 30, height: 30, category: 'UML' },
    { id: 'act-activity', svgComponent: 'UMLActivityShape', label: 'Action', description: 'Activity step', width: 120, height: 60, category: 'UML' },
    { id: 'act-decision', svgComponent: 'UMLDecisionShape', label: 'Decision', description: 'Branch point', width: 100, height: 80, category: 'UML' },
    { id: 'act-fork', svgComponent: 'UMLForkShape', label: 'Fork', description: 'Parallel split', width: 60, height: 50, category: 'UML' },
    { id: 'act-join', svgComponent: 'UMLJoinShape', label: 'Join', description: 'Parallel synchronization', width: 60, height: 50, category: 'UML' },
    { id: 'act-control-flow', svgComponent: 'UMLControlFlowShape', label: 'Control Flow', description: 'Sequence flow', width: 80, height: 40, category: 'UML' },
    { id: 'act-object-flow', svgComponent: 'UMLObjectFlowShape', label: 'Object Flow', description: 'Object flow (dashed)', width: 80, height: 40, category: 'UML' },
    { id: 'act-swimlane', svgComponent: 'UMLSwimlaneShape', label: 'Swimlane', description: 'Responsibility partition', width: 160, height: 120, category: 'UML' },
    { id: 'act-final-node', svgComponent: 'UMLActivityFinalShape', label: 'Activity Final', description: 'Workflow end', width: 40, height: 40, category: 'UML' },
    { id: 'act-flow-final', svgComponent: 'UMLFlowFinalShape', label: 'Flow Final', description: 'Flow end', width: 30, height: 30, category: 'UML' },
    { id: 'act-note', svgComponent: 'UMLNoteShape', label: 'Note', description: 'Comment/note', width: 100, height: 70, category: 'UML' },
    { id: 'act-constraint', svgComponent: 'UMLConstraintShape', label: 'Constraint', description: 'Constraint annotation', width: 120, height: 40, category: 'UML' },
  ],

  // ═══════════════════════════════════════════════════════════════════════════
  // 9. SEQUENCE DIAGRAM
  // ═══════════════════════════════════════════════════════════════════════════
  'Sequence Diagram': [
    { id: 'seq-actor', svgComponent: 'UMLActorShape', label: 'Actor', description: 'Interaction initiator, with its own lifeline', width: 70, height: 200, category: 'UML', defaultLabel: 'Actor' },
    { id: 'seq-lifeline', svgComponent: 'UMLLifelineShape', label: 'Lifeline', description: 'Object timeline', width: 100, height: 200, category: 'UML' },
    { id: 'seq-activation', svgComponent: 'UMLActivationShape', label: 'Activation', description: 'Execution period', width: 16, height: 160, category: 'UML' },
    { id: 'seq-destroy', svgComponent: 'UMLDestroyShape', label: 'Destroy', description: 'Object deletion (X)', width: 30, height: 30, category: 'UML' },
    { id: 'seq-sync-msg', svgComponent: 'UMLSyncMsgShape', label: 'Sync Message', description: 'Blocking call', width: 80, height: 40, category: 'UML' },
    { id: 'seq-async-msg', svgComponent: 'UMLAsyncMsgShape', label: 'Async Message', description: 'Non-blocking call', width: 80, height: 40, category: 'UML' },
    { id: 'seq-return-msg', svgComponent: 'UMLReturnMsgShape', label: 'Return', description: 'Response', width: 80, height: 40, category: 'UML' },
    { id: 'seq-alt', svgComponent: 'UMLAltShape', label: 'ALT Fragment', description: 'Alternative', width: 160, height: 120, category: 'UML' },
    { id: 'seq-opt', svgComponent: 'UMLOptShape', label: 'OPT Fragment', description: 'Optional', width: 160, height: 100, category: 'UML' },
    { id: 'seq-loop', svgComponent: 'UMLLoopShape', label: 'LOOP Fragment', description: 'Loop', width: 160, height: 100, category: 'UML' },
    { id: 'seq-par', svgComponent: 'UMLParShape', label: 'PAR Fragment', description: 'Parallel', width: 160, height: 120, category: 'UML' },
    { id: 'seq-break', svgComponent: 'UMLBreakShape', label: 'BREAK Fragment', description: 'Break', width: 160, height: 100, category: 'UML' },
    { id: 'seq-note', svgComponent: 'UMLNoteShape', label: 'Note', description: 'Comment/note', width: 100, height: 70, category: 'UML' },
  ],

  // ═══════════════════════════════════════════════════════════════════════════
  // 10. CLASS DIAGRAM
  // ═══════════════════════════════════════════════════════════════════════════
  'Class Diagram': [
    { id: 'class-box', svgComponent: 'UMLClassShape', label: 'Class', description: 'Class definition', width: 140, height: 90, category: 'UML' },
    { id: 'class-association', svgComponent: 'UMLAssociationShape', label: 'Association', description: 'Relationship', width: 80, height: 20, category: 'UML' },
    { id: 'class-directed', svgComponent: 'UMLDirectedAssociationShape', label: 'Directed Association', description: 'Directed relationship', width: 80, height: 40, category: 'UML' },
    { id: 'class-aggregation', svgComponent: 'UMLAggregationShape', label: 'Aggregation', description: 'Has-a (weak)', width: 80, height: 40, category: 'UML' },
    { id: 'class-composition', svgComponent: 'UMLCompositionShape', label: 'Composition', description: 'Has-a (strong)', width: 80, height: 40, category: 'UML' },
    { id: 'class-dependency', svgComponent: 'UMLDependencyShape', label: 'Dependency', description: 'Uses relationship', width: 80, height: 40, category: 'UML' },
    { id: 'class-generalization', svgComponent: 'UMLGeneralizationShape', label: 'Generalization', description: 'Inheritance', width: 80, height: 40, category: 'UML' },
    { id: 'class-note', svgComponent: 'UMLNoteShape', label: 'Note', description: 'Comment/note', width: 100, height: 70, category: 'UML' },
    { id: 'class-note-connector', svgComponent: 'UMLNoteConnectorShape', label: 'Note Connector', description: 'Note connection', width: 80, height: 20, category: 'UML' },
    { id: 'class-multiplicity-1', svgComponent: 'UMLMultiplicity1Shape', label: 'Exactly One', description: '1', width: 30, height: 20, category: 'UML' },
    { id: 'class-multiplicity-01', svgComponent: 'UMLMultiplicity01Shape', label: 'Zero or One', description: '0..1', width: 40, height: 20, category: 'UML' },
    { id: 'class-multiplicity-many', svgComponent: 'UMLMultiplicityManyShape', label: 'Zero or More', description: '*', width: 30, height: 20, category: 'UML' },
    { id: 'class-multiplicity-1many', svgComponent: 'UMLMultiplicity1ManyShape', label: 'One or More', description: '1..*', width: 40, height: 20, category: 'UML' },
    { id: 'class-multiplicity-range', svgComponent: 'UMLMultiplicityRangeShape', label: 'Range', description: 'n..m', width: 40, height: 20, category: 'UML' },
    { id: 'class-multiplicity-n', svgComponent: 'UMLMultiplicityNShape', label: 'Exactly n', description: 'n', width: 30, height: 20, category: 'UML' },
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
  
  // ─── DFD Shapes ──────────────────────────────────────────────────────────
  'DFDProcessShape': 'ellipse',
  'DFDDataFlowShape': 'arrow',
  'DFDDataStoreShape': 'rectangle',
  'DFDDataStoreGSShape': 'rectangle',
  'DFDExternalEntityShape': 'rectangle',
  'DFDBidirectionalShape': 'arrow',
  'DFDBoundaryShape': 'dashedRect',
  'DFDNoteShape': 'noteStandalone',
  'DFDOnPageShape': 'circle',
  'DFDOffPageShape': 'pentagon',
  
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
  
  // ─── ERD Additional Shapes ──────────────────────────────────────────────
  'ERDEntityShape': 'entity',
  'ERDWeakEntityShape': 'weakEntity',
  'ERDRelationshipShape': 'relationship',
  'ERDIdentifyingRelShape': 'identifyingRel',
  'ERDAttributeShape': 'attribute',
  'ERDMultivaluedAttrShape': 'multiAttr',
  'ERDDerivedAttrShape': 'derivedAttr',
  'ERDCardinality11Shape': 'text',
  'ERDCardinality1NShape': 'text',
  'ERDCardinalityN1Shape': 'text',
  'ERDCardinalityMNShape': 'text',
  
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
  
  // ─── Fishbone Shapes ─────────────────────────────────────────────────────
  'FishboneSpineShape': 'line',
  'FishboneHeadShape': 'triangle',
  'FishboneProblemShape': 'dashedRect',
  'FishboneCauseTopShape': 'line',
  'FishboneCauseBottomShape': 'line',
  'FishboneSubCauseTopShape': 'line',
  'FishboneSubCauseBottomShape': 'line',
  'FishboneTertiaryShape': 'line',
  'FishboneArrowShape': 'arrow',
  'FishboneDashedArrowShape': 'dashedArrow',
  'FishboneCategoryShape': 'rectangle',
  'FishboneBubbleShape': 'ellipse',
  'FishboneNoteShape': 'noteStandalone',
  
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
  
  // ─── Use Case Shapes ─────────────────────────────────────────────────────
  'UMLActorShape': 'actor',
  'UMLUseCaseShape': 'ellipse',
  'UMLSystemBoundaryShape': 'rectangle',
  'UMLAssociationShape': 'line',
  'UMLIncludeShape': 'dashedArrow',
  'UMLExtendShape': 'dashedArrowBack',
  'UMLGeneralizationShape': 'triangleArrow',
  'UMLNoteShape': 'noteStandalone',
  'UMLNoteConnectorShape': 'dashedLine',
  'UMLIncludeLabelShape': 'text',
  'UMLExtendLabelShape': 'text',
  
  // ─── Activity Shapes ────────────────────────────────────────────────────
  'UMLInitialNodeShape': 'initialNode',
  'UMLActivityShape': 'roundedRectangle',
  'UMLDecisionShape': 'diamond',
  'UMLForkShape': 'forkJoin',
  'UMLJoinShape': 'forkJoin',
  'UMLControlFlowShape': 'arrow',
  'UMLObjectFlowShape': 'dashedArrow',
  'UMLSwimlaneShape': 'rectangle',
  'UMLActivityFinalShape': 'finalNode',
  'UMLFlowFinalShape': 'destruction',
  'UMLConstraintShape': 'dashedRect',
  
  // ─── Sequence Shapes ────────────────────────────────────────────────────
  'UMLLifelineShape': 'lifeline',
  'UMLActivationShape': 'activation',
  'UMLDestroyShape': 'destruction',
  'UMLSyncMsgShape': 'filledArrow',
  'UMLAsyncMsgShape': 'openArrow',
  'UMLReturnMsgShape': 'dashedArrow',
  'UMLAltShape': 'dashedRect',
  'UMLOptShape': 'dashedRect',
  'UMLLoopShape': 'dashedRect',
  'UMLParShape': 'dashedRect',
  'UMLBreakShape': 'dashedRect',
  
  // ─── Class Shapes ──────────────────────────────────────────────────────
  'UMLClassShape': 'classBox',
  'UMLDirectedAssociationShape': 'arrow',
  'UMLAggregationShape': 'aggregation',
  'UMLCompositionShape': 'composition',
  'UMLDependencyShape': 'dashedArrow',
  'UMLMultiplicity1Shape': 'text',
  'UMLMultiplicity01Shape': 'text',
  'UMLMultiplicityManyShape': 'text',
  'UMLMultiplicity1ManyShape': 'text',
  'UMLMultiplicityRangeShape': 'text',
  'UMLMultiplicityNShape': 'text',
  
  // ─── Default ─────────────────────────────────────────────────────────────
  'default': 'default',
};

// ─── IGRAPH ID TO STYLE MAP ──────────────────────────────────────────────────

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
  // 'terminator' must stay 'igraph.ellipse' — matching its EllipseShape
  // definition above and the *other* copy of this exact map in
  // components/maxgraph-custom-shapes.ts, which is the one DiagramCanvas.tsx
  // actually imports and uses to style newly-created cells. This file's copy
  // had drifted to 'igraph.roundedRectangle', which meant every Terminator a
  // user actually drops on the canvas never matched what this map thought
  // its style was — breaking isConnectorCell/getShapeIdFromStyle's reverse
  // lookup (both defined in this file) for every Start/End shape.
  'terminator': 'igraph.ellipse',
  'process': 'igraph.rectangle',
  'decision': 'igraph.diamond',
  'io': 'igraph.parallelogram',
  'on-page-connector': 'igraph.circle',
  'off-page-connector': 'igraph.pentagon',
  'merge-junction': 'igraph.mergeJunction',
  'flow-line': 'igraph.connectorArrow',
  'predefined': 'igraph.predefined',
  'database': 'igraph.cylinder',
  'manual-input': 'igraph.trapezoid',
  'delay': 'igraph.dshape',
  'preparation': 'igraph.hexagon',
  'display': 'igraph.display',
  'annotation': 'igraph.annotation',

  // ─── DFD ────────────────────────────────────────────────────────────────
  'dfd-process': 'igraph.dfdProcess',
  'dfd-data-flow': 'igraph.dfdDataFlow',
  'dfd-data-store': 'igraph.dfdDataStore',
  'dfd-data-store-gs': 'igraph.dfdDataStoreGS',
  'dfd-external-entity': 'igraph.dfdExternalEntity',
  'dfd-bidirectional': 'igraph.dfdBidirectional',
  'dfd-boundary': 'igraph.dfdBoundary',
  'dfd-note': 'igraph.dfdNote',
  'dfd-on-page': 'igraph.dfdOnPage',
  'dfd-off-page': 'igraph.dfdOffPage',

  // ─── ERD ────────────────────────────────────────────────────────────────
  'erd-entity': 'igraph.erdEntity',
  'erd-weak-entity': 'igraph.erdWeakEntity',
  'erd-relationship': 'igraph.erdRelationship',
  'erd-identifying-rel': 'igraph.erdIdentifyingRelationship',
  'erd-attribute': 'igraph.erdAttribute',
  'erd-multivalued-attr': 'igraph.erdMultivaluedAttribute',
  'erd-derived-attr': 'igraph.erdDerivedAttribute',
  'erd-cardinality-11': 'igraph.erdCardinality11',
  'erd-cardinality-1n': 'igraph.erdCardinality1N',
  'erd-cardinality-n1': 'igraph.erdCardinalityN1',
  'erd-cardinality-mn': 'igraph.erdCardinalityMN',
  'erd-connector': 'igraph.erdConnector',

  // ─── Fishbone ────────────────────────────────────────────────────────────
  'fishbone-spine': 'igraph.fishboneSpine',
  'fishbone-head': 'igraph.fishboneHead',
  'fishbone-problem': 'igraph.fishboneProblem',
  'fishbone-cause-top': 'igraph.fishboneCauseTop',
  'fishbone-cause-bottom': 'igraph.fishboneCauseBottom',
  'fishbone-sub-top': 'igraph.fishboneSubCauseTop',
  'fishbone-sub-bottom': 'igraph.fishboneSubCauseBottom',
  'fishbone-tertiary': 'igraph.fishboneTertiary',
  'fishbone-arrow': 'igraph.fishboneArrow',
  'fishbone-dashed-arrow': 'igraph.fishboneDashedArrow',
  'fishbone-category': 'igraph.fishboneCategory',
  'fishbone-bubble': 'igraph.fishboneBubble',
  'fishbone-note': 'igraph.fishboneNote',

  // ─── Schematic ──────────────────────────────────────────────────────────
  'schematic-battery': 'igraph.schematicBattery',
  'schematic-ac': 'igraph.schematicAC',
  'schematic-ground': 'igraph.schematicGround',
  'schematic-resistor': 'igraph.schematicResistor',
  'schematic-variable-resistor': 'igraph.schematicVariableResistor',
  'schematic-capacitor': 'igraph.schematicCapacitor',
  'schematic-inductor': 'igraph.schematicInductor',
  'schematic-diode': 'igraph.schematicDiode',
  'schematic-led': 'igraph.schematicLED',
  'schematic-npn': 'igraph.schematicNPN',
  'schematic-switch': 'igraph.schematicSwitch',
  'schematic-fuse': 'igraph.schematicFuse',
  'schematic-connection': 'igraph.schematicConnection',
  'schematic-no-connection': 'igraph.schematicNoConnection',

  // ─── Use Case ───────────────────────────────────────────────────────────
  'uc-actor': 'igraph.ucActor',
  'use-case': 'igraph.umlUseCase',
  'system-boundary': 'igraph.umlSystemBoundary',
  'uc-association': 'igraph.umlAssociation',
  'uc-include': 'igraph.umlInclude',
  'uc-extend': 'igraph.umlExtend',
  'uc-generalization': 'igraph.umlGeneralization',
  'uc-note': 'igraph.umlNote',
  'uc-note-connector': 'igraph.umlNoteConnector',
  'uc-include-label': 'igraph.umlIncludeLabel',
  'uc-extend-label': 'igraph.umlExtendLabel',

  // ─── Activity ───────────────────────────────────────────────────────────
  'act-initial-node': 'igraph.umlInitialNode',
  'act-activity': 'igraph.umlActivity',
  'act-decision': 'igraph.umlDecision',
  'act-fork': 'igraph.umlFork',
  'act-join': 'igraph.umlJoin',
  'act-control-flow': 'igraph.umlControlFlow',
  'act-object-flow': 'igraph.umlObjectFlow',
  'act-swimlane': 'igraph.umlSwimlane',
  'act-final-node': 'igraph.umlActivityFinal',
  'act-flow-final': 'igraph.umlFlowFinal',
  'act-note': 'igraph.umlNote',
  'act-constraint': 'igraph.umlConstraint',

  // ─── Sequence ───────────────────────────────────────────────────────────
  'seq-actor': 'igraph.seqActor',
  'seq-lifeline': 'igraph.umlLifeline',
  'seq-activation': 'igraph.umlActivation',
  'seq-destroy': 'igraph.umlDestroy',
  'seq-sync-msg': 'igraph.umlSyncMsg',
  'seq-async-msg': 'igraph.umlAsyncMsg',
  'seq-return-msg': 'igraph.umlReturnMsg',
  'seq-alt': 'igraph.umlAlt',
  'seq-opt': 'igraph.umlOpt',
  'seq-loop': 'igraph.umlLoop',
  'seq-par': 'igraph.umlPar',
  'seq-break': 'igraph.umlBreak',
  'seq-note': 'igraph.umlNote',

  // ─── Class ──────────────────────────────────────────────────────────────
  'class-box': 'igraph.umlClassContainer',
  'class-association': 'igraph.umlAssociation',
  'class-directed': 'igraph.umlDirectedAssociation',
  'class-aggregation': 'igraph.umlAggregation',
  'class-composition': 'igraph.umlComposition',
  'class-dependency': 'igraph.umlDependency',
  'class-generalization': 'igraph.umlGeneralization',
  'class-note': 'igraph.umlNote',
  'class-note-connector': 'igraph.umlNoteConnector',
  'class-multiplicity-1': 'igraph.umlMultiplicity1',
  'class-multiplicity-01': 'igraph.umlMultiplicity01',
  'class-multiplicity-many': 'igraph.umlMultiplicityMany',
  'class-multiplicity-1many': 'igraph.umlMultiplicity1Many',
  'class-multiplicity-range': 'igraph.umlMultiplicityRange',
  'class-multiplicity-n': 'igraph.umlMultiplicityN',
};

// ─── IGRAPH STYLE MAP ──────────────────────────────────────────────────────

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

  // ─── DFD Shapes ──────────────────────────────────────────────────────────
  'DFDProcessShape': 'igraph.dfdProcess',
  'DFDDataFlowShape': 'igraph.dfdDataFlow',
  'DFDDataStoreShape': 'igraph.dfdDataStore',
  'DFDDataStoreGSShape': 'igraph.dfdDataStoreGS',
  'DFDExternalEntityShape': 'igraph.dfdExternalEntity',
  'DFDBidirectionalShape': 'igraph.dfdBidirectional',
  'DFDBoundaryShape': 'igraph.dfdBoundary',
  'DFDNoteShape': 'igraph.dfdNote',
  'DFDOnPageShape': 'igraph.dfdOnPage',
  'DFDOffPageShape': 'igraph.dfdOffPage',

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

  // ─── ERD Additional ──────────────────────────────────────────────────────
  'ERDEntityShape': 'igraph.erdEntity',
  'ERDWeakEntityShape': 'igraph.erdWeakEntity',
  'ERDRelationshipShape': 'igraph.erdRelationship',
  'ERDIdentifyingRelShape': 'igraph.erdIdentifyingRelationship',
  'ERDAttributeShape': 'igraph.erdAttribute',
  'ERDMultivaluedAttrShape': 'igraph.erdMultivaluedAttribute',
  'ERDDerivedAttrShape': 'igraph.erdDerivedAttribute',
  'ERDCardinality11Shape': 'igraph.erdCardinality11',
  'ERDCardinality1NShape': 'igraph.erdCardinality1N',
  'ERDCardinalityN1Shape': 'igraph.erdCardinalityN1',
  'ERDCardinalityMNShape': 'igraph.erdCardinalityMN',

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

  // ─── Fishbone ──────────────────────────────────────────────────────────
  'FishboneSpineShape': 'igraph.fishboneSpine',
  'FishboneHeadShape': 'igraph.fishboneHead',
  'FishboneProblemShape': 'igraph.fishboneProblem',
  'FishboneCauseTopShape': 'igraph.fishboneCauseTop',
  'FishboneCauseBottomShape': 'igraph.fishboneCauseBottom',
  'FishboneSubCauseTopShape': 'igraph.fishboneSubCauseTop',
  'FishboneSubCauseBottomShape': 'igraph.fishboneSubCauseBottom',
  'FishboneTertiaryShape': 'igraph.fishboneTertiary',
  'FishboneArrowShape': 'igraph.fishboneArrow',
  'FishboneDashedArrowShape': 'igraph.fishboneDashedArrow',
  'FishboneCategoryShape': 'igraph.fishboneCategory',
  'FishboneBubbleShape': 'igraph.fishboneBubble',
  'FishboneNoteShape': 'igraph.fishboneNote',

  // ─── Use Case ──────────────────────────────────────────────────────────
  'UMLActorShape': 'igraph.ucActor',
  'UMLUseCaseShape': 'igraph.umlUseCase',
  'UMLSystemBoundaryShape': 'igraph.umlSystemBoundary',
  'UMLAssociationShape': 'igraph.umlAssociation',
  'UMLIncludeShape': 'igraph.umlInclude',
  'UMLExtendShape': 'igraph.umlExtend',
  'UMLGeneralizationShape': 'igraph.umlGeneralization',
  'UMLNoteShape': 'igraph.umlNote',
  'UMLNoteConnectorShape': 'igraph.umlNoteConnector',
  'UMLIncludeLabelShape': 'igraph.umlIncludeLabel',
  'UMLExtendLabelShape': 'igraph.umlExtendLabel',

  // ─── Activity ──────────────────────────────────────────────────────────
  'UMLInitialNodeShape': 'igraph.umlInitialNode',
  'UMLActivityShape': 'igraph.umlActivity',
  'UMLDecisionShape': 'igraph.umlDecision',
  'UMLForkShape': 'igraph.umlFork',
  'UMLJoinShape': 'igraph.umlJoin',
  'UMLControlFlowShape': 'igraph.umlControlFlow',
  'UMLObjectFlowShape': 'igraph.umlObjectFlow',
  'UMLSwimlaneShape': 'igraph.umlSwimlane',
  'UMLActivityFinalShape': 'igraph.umlActivityFinal',
  'UMLFlowFinalShape': 'igraph.umlFlowFinal',
  'UMLConstraintShape': 'igraph.umlConstraint',

  // ─── Sequence ──────────────────────────────────────────────────────────
  'UMLLifelineShape': 'igraph.umlLifeline',
  'UMLActivationShape': 'igraph.umlActivation',
  'UMLDestroyShape': 'igraph.umlDestroy',
  'UMLSyncMsgShape': 'igraph.umlSyncMsg',
  'UMLAsyncMsgShape': 'igraph.umlAsyncMsg',
  'UMLReturnMsgShape': 'igraph.umlReturnMsg',
  'UMLAltShape': 'igraph.umlAlt',
  'UMLOptShape': 'igraph.umlOpt',
  'UMLLoopShape': 'igraph.umlLoop',
  'UMLParShape': 'igraph.umlPar',
  'UMLBreakShape': 'igraph.umlBreak',

  // ─── Class ──────────────────────────────────────────────────────────────
  'UMLClassShape': 'igraph.umlClass',
  'UMLDirectedAssociationShape': 'igraph.umlDirectedAssociation',
  'UMLAggregationShape': 'igraph.umlAggregation',
  'UMLCompositionShape': 'igraph.umlComposition',
  'UMLDependencyShape': 'igraph.umlDependency',
  'UMLMultiplicity1Shape': 'igraph.umlMultiplicity1',
  'UMLMultiplicity01Shape': 'igraph.umlMultiplicity01',
  'UMLMultiplicityManyShape': 'igraph.umlMultiplicityMany',
  'UMLMultiplicity1ManyShape': 'igraph.umlMultiplicity1Many',
  'UMLMultiplicityRangeShape': 'igraph.umlMultiplicityRange',
  'UMLMultiplicityNShape': 'igraph.umlMultiplicityN',
};

// Shapes that are really "a line between two other shapes" rather than a
// box/circle/etc — inserted as real (initially floating) maxGraph edges
// instead of vertices (see handleAddShape in create.tsx and handleDrop in
// DiagramCanvas.tsx), so the user can drag either end onto a shape and have
// maxGraph actually connect them, with a magnet-style snap-to-nearby-shape
// on drop (findNearbyVertex in DiagramCanvas.tsx). Every one of these has a
// matching paintEdgeShape override in maxgraph-custom-shapes.ts so it still
// renders its own arrowhead/diamond/dashed style once it's an edge.
//
// Deliberately excludes Schematic's Wire Connection / No Connection — those
// are small fixed junction-dot/crossing glyphs meant to sit at a single
// point on a wire, not a stretchable line between two shapes, even though
// their paint function happens to draw a short line.
export const CONNECTOR_SHAPE_IDS = new Set([
  // Standard / Flowchart
  'connector-arrow', 'flow-line',
  // Functional Decomposition Diagram
  'control', 'mechanism', 'fdd-interface',
  // Data Flow Diagram
  'dfd-data-flow', 'dfd-bidirectional',
  // Entity Relationship Diagram
  'erd-connector', 'erd-cardinality-11', 'erd-cardinality-1n', 'erd-cardinality-n1', 'erd-cardinality-mn',
  // Fishbone Diagram
  'fishbone-spine', 'fishbone-arrow', 'fishbone-dashed-arrow',
  'fishbone-cause-top', 'fishbone-cause-bottom', 'fishbone-sub-top', 'fishbone-sub-bottom', 'fishbone-tertiary',
  // Use Case Diagram
  'uc-association', 'uc-include', 'uc-extend', 'uc-generalization', 'uc-note-connector',
  // Activity Diagram
  'act-control-flow', 'act-object-flow',
  // Sequence Diagram
  'seq-sync-msg', 'seq-async-msg', 'seq-return-msg',
  // Class Diagram
  'class-association', 'class-directed', 'class-aggregation', 'class-composition',
  'class-dependency', 'class-generalization', 'class-note-connector',
]);

// The style keys those ids render as (via IGRAPH_ID_STYLE_MAP below), so a
// cell can be recognized as a connector shape from its own persisted style —
// not from the shapeId tag DiagramCanvas.tsx/create.tsx stamp on at creation
// time, which lives in an in-memory WeakMap and is gone the moment a cell
// survives a reload (page refresh, a saved diagram being reopened, even a
// dev hot-reload): none of those round-trip the tag, but style.shape is a
// real maxGraph style property that's always in the saved/loaded XML.
// Several ids intentionally share one style/class (e.g. 'uc-generalization'
// and 'class-generalization' both render as igraph.umlGeneralization), which
// this Set naturally collapses to one entry — that's fine, they're meant to
// be recognized identically.
export const CONNECTOR_STYLE_KEYS = new Set(
  [...CONNECTOR_SHAPE_IDS].map((id) => IGRAPH_ID_STYLE_MAP[id]).filter(Boolean)
);

export function isConnectorCell(cell: { getStyle?: () => any } | null | undefined): boolean {
  if (!cell?.getStyle) return false;
  const style = cell.getStyle();
  const shapeKey = typeof style === 'string' ? undefined : style?.shape;
  return !!shapeKey && CONNECTOR_STYLE_KEYS.has(shapeKey);
}

// Reverse of IGRAPH_ID_STYLE_MAP, for the same reload problem described
// above but for shape *role* lookups (flowchartRules.ts's getShapeRole)
// rather than just "is this a connector". Object.entries walks the map in
// declaration order, so where two ids intentionally share a style (Standard's
// 'rectangle' and Flowchart's 'process' both render as igraph.rectangle,
// 'rounded-rectangle'/'terminator' both render as igraph.roundedRectangle,
// etc.), whichever id is declared later wins — every diagram-specific
// section is declared after Standard, so a diagram-specific role (Process,
// Terminator, Decision...) is recovered in preference to the generic
// Standard shape it collides with, which is overwhelmingly the more common
// real case.
const STYLE_TO_IGRAPH_ID: Record<string, string> = {};
for (const [id, styleShape] of Object.entries(IGRAPH_ID_STYLE_MAP)) {
  STYLE_TO_IGRAPH_ID[styleShape] = id;
}

export function getShapeIdFromStyle(cell: { getStyle?: () => any } | null | undefined): string | undefined {
  if (!cell?.getStyle) return undefined;
  const style = cell.getStyle();
  const shapeKey = typeof style === 'string' ? undefined : style?.shape;
  return shapeKey ? STYLE_TO_IGRAPH_ID[shapeKey] : undefined;
}

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

// Looks up a shape's own default width/height (and full definition) by id,
// regardless of which category it lives under. Used when inserting a shape
// onto the canvas so its drop size matches its actual proportions (an oval
// stays oval, a stick-figure actor stays tall/narrow) instead of forcing
// every shape to the same box or a one-size-fits-all square.
export const getShapeDefinitionById = (shapeId: string): ShapeDefinition | undefined => {
  for (const shapes of Object.values(DIAGRAM_SHAPES)) {
    const found = shapes.find((s) => s.id === shapeId);
    if (found) return found;
  }
  return undefined;
};

export const getStyleForSvgComponent = (svgComponent: string): string => {
  return SHAPE_STYLE_MAP[svgComponent] || 'default';
};

export const getStyleForShapeId = (shapeId: string): string => {
  return IGRAPH_ID_STYLE_MAP[shapeId] || 'igraph.rectangle';
};