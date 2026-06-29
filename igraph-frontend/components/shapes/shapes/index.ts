// components/shapes/shapes/index.ts
// Export all shape components

// ─── Basic Shapes ──────────────────────────────────────────────────────────
export {
  RectShape,
  RoundedRectShape,
  CircleShape,
  EllipseShape,
  DiamondShape,
  TriangleShape,
  ParallelogramShape,
  CylinderShape,
  DocumentShape,
  FolderShape,
  CloudShape,
  NoteStandaloneShape,
  ActorShape,
  ConnectorArrowShape,
  DoubleRectShape,
  DoubleRhombusShape,
  MultiOvalShape,
  LineShape,
  TextShape,
  DashedRectShape,
  PredefinedShape,
  RhombusShape,
  // New Flowchart Shapes
  PentagonShape,
  TrapezoidShape,
  DShape,
  HexagonShape,
  DisplayShape,
  AnnotationShape,
} from './BasicShapes';

// ─── FDD Shapes ────────────────────────────────────────────────────────────
export {
  FDD_FunctionShape,
  FDD_InputShape,
  FDD_OutputShape,
  FDD_ControlShape,
  FDD_MechanismShape,
  FDD_InterfaceShape,
  FDD_BoundaryShape,
  FDD_NoteShape,
  FDD_ExternalEntityShape,
} from './FDDShapes';

// ─── UML Shapes ────────────────────────────────────────────────────────────
export {
  ActorShape as UMLActorShape,
  InitialNodeShape,
  FinalNodeShape,
  ForkJoinShape,
  LifelineShape,
  ActivationShape,
  ClassBoxShape,
  InterfaceShape,
  AbstractClassShape,
} from './UMLShapes';

// ─── ERD Shapes ────────────────────────────────────────────────────────────
export {
  EntityShape,
  WeakEntityShape,
  AttributeShape,
  PrimaryKeyShape,
  DerivedAttrShape,
  CompositeAttrShape,
  MultiAttrShape,
  RelationshipShape,
  IdentifyingRelShape,
  CardinalityShape,
  CrowOneShape,
  CrowZeroOneShape,
  CrowZeroManyShape,
  CrowOneManyShape,
  CrowManyShape,
  TotalParticipationShape,
  PartialParticipationShape,
  ERDConnectorShape,
} from './ERDShapes';

// ─── Schematic Shapes ──────────────────────────────────────────────────────
export {
  ResistorShape,
  CapacitorShape,
  InductorShape,
  VoltageShape,
  GroundShape,
  DiodeShape,
  TransistorShape,
  ICShape,
  OpAmpShape,
  SwitchShape,
  FuseShape,
  TransformerShape,
} from './SchematicShapes';

// ─── Arrow Shapes ──────────────────────────────────────────────────────────
export {
  ArrowShape,
  ArrowDownShape,
  ArrowRightShape,
  FilledArrowShape,
  OpenArrowShape,
  DashedArrowShape,
  DashedArrowBackShape,
  TriangleArrowShape,
  LoopArrowShape,
  CreateArrowShape,
  DestructionShape,
  AggregationShape,
  CompositionShape,
  MultiplicityShape,
  ArrowDiagShape,
  ArrowSmallShape,
} from './ArrowShapes';