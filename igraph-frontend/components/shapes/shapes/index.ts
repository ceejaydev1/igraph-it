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
  PentagonShape,
  MergeJunctionShape,
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

// ─── DFD Shapes ────────────────────────────────────────────────────────────
export {
  DFDProcessShape,
  DFDDataFlowShape,
  DFDDataStoreShape,
  DFDDataStoreGSShape,
  DFDExternalEntityShape,
  DFDBidirectionalShape,
  DFDBoundaryShape,
  DFDNoteShape,
  DFDOnPageShape,
  DFDOffPageShape,
} from './DFDShapes';

// ─── ERD Shapes ────────────────────────────────────────────────────────────
export {
  ERDEntityShape,
  ERDWeakEntityShape,
  ERDRelationshipShape,
  ERDIdentifyingRelShape,
  ERDAttributeShape,
  ERDMultivaluedAttrShape,
  ERDDerivedAttrShape,
  ERDCardinality11Shape,
  ERDCardinality1NShape,
  ERDCardinalityN1Shape,
  ERDCardinalityMNShape,
  ERDConnectorShape,
} from './ERDShapes';

// ─── Fishbone Shapes ───────────────────────────────────────────────────────
export {
  FishboneSpineShape,
  FishboneHeadShape,
  FishboneProblemShape,
  FishboneCauseTopShape,
  FishboneCauseBottomShape,
  FishboneSubCauseTopShape,
  FishboneSubCauseBottomShape,
  FishboneTertiaryShape,
  FishboneArrowShape,
  FishboneDashedArrowShape,
  FishboneCategoryShape,
  FishboneBubbleShape,
  FishboneNoteShape,
} from './FishboneShapes';

// ─── Schematic Shapes ──────────────────────────────────────────────────────
export {
  SchematicBatteryShape,
  SchematicACShape,
  SchematicGroundShape,
  SchematicResistorShape,
  SchematicVariableResistorShape,
  SchematicCapacitorShape,
  SchematicInductorShape,
  SchematicDiodeShape,
  SchematicLEDShape,
  SchematicNPNShape,
  SchematicSwitchShape,
  SchematicFuseShape,
  SchematicConnectionShape,
  SchematicNoConnectionShape,
} from './SchematicShapes';

// ─── Use Case Shapes ──────────────────────────────────────────────────────
export {
  UMLActorShape,
  UMLUseCaseShape,
  UMLSystemBoundaryShape,
  UMLAssociationShape,
  UMLIncludeShape,
  UMLExtendShape,
  UMLGeneralizationShape,
  UMLNoteShape,
  UMLNoteConnectorShape,
  UMLIncludeLabelShape,
  UMLExtendLabelShape,
} from './UseCaseShapes';

// ─── Activity Shapes ──────────────────────────────────────────────────────
export {
  UMLInitialNodeShape,
  UMLActivityShape,
  UMLDecisionShape,
  UMLForkShape,
  UMLJoinShape,
  UMLControlFlowShape,
  UMLObjectFlowShape,
  UMLSwimlaneShape,
  UMLActivityFinalShape,
  UMLFlowFinalShape,
  UMLConstraintShape,
} from './ActivityShapes';

// ─── Sequence Shapes ──────────────────────────────────────────────────────
export {
  UMLLifelineShape,
  UMLActivationShape,
  UMLDestroyShape,
  UMLSyncMsgShape,
  UMLAsyncMsgShape,
  UMLReturnMsgShape,
  UMLAltShape,
  UMLOptShape,
  UMLLoopShape,
  UMLParShape,
  UMLBreakShape,
} from './SequenceShapes';

// ─── Class Shapes ──────────────────────────────────────────────────────────
export {
  UMLClassShape,
  UMLDirectedAssociationShape,
  UMLAggregationShape,
  UMLCompositionShape,
  UMLDependencyShape,
  UMLRealizationShape,
  UMLMultiplicity1Shape,
  UMLMultiplicity01Shape,
  UMLMultiplicityManyShape,
  UMLMultiplicity1ManyShape,
  UMLMultiplicityRangeShape,
  UMLMultiplicityNShape,
} from './ClassShapes';
