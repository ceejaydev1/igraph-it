import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

import {
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

  // FDD Shapes
  FDD_FunctionShape,
  FDD_InputShape,
  FDD_OutputShape,
  FDD_ControlShape,
  FDD_MechanismShape,
  FDD_InterfaceShape,
  FDD_BoundaryShape,
  FDD_NoteShape,
  FDD_ExternalEntityShape,

  // Flowchart Shapes
  PentagonShape,
  MergeJunctionShape,
  TrapezoidShape,
  DShape,
  HexagonShape,
  DisplayShape,
  AnnotationShape,

  // DFD Shapes
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

  // ERD Shapes
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

  // Fishbone Shapes
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

  // Schematic Shapes
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

  // Use Case Shapes
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

  // Activity Shapes
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

  // Sequence Shapes
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

  // Class Shapes
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
} from './shapes';

export interface ShapeIconProps {
  name: string;
  width?: number;
  height?: number;
  color?: string;
  fillColor?: string;
  strokeWidth?: number;
}

const DEFAULT_SIZE = 48;

/**
 * Maps the shape name from constants/shapes.ts
 * to the actual React Native shape component.
 */
const componentMap: Record<string, React.ComponentType<any>> = {
  // ─────────────────────────────────────────────────────────────
  // STANDARD SHAPES
  // ─────────────────────────────────────────────────────────────
  RectShape: RectShape,
  RoundedRectShape: RoundedRectShape,
  CircleShape: CircleShape,
  EllipseShape: EllipseShape,
  DiamondShape: DiamondShape,
  TriangleShape: TriangleShape,
  ParallelogramShape: ParallelogramShape,
  CylinderShape: CylinderShape,
  DocumentShape: DocumentShape,
  FolderShape: FolderShape,
  CloudShape: CloudShape,
  NoteStandaloneShape: NoteStandaloneShape,
  ActorShape: ActorShape,
  ConnectorArrowShape: ConnectorArrowShape,

  // ─────────────────────────────────────────────────────────────
  // BASIC / LEGACY SHAPES
  // ─────────────────────────────────────────────────────────────
  DoubleRectShape: DoubleRectShape,
  DoubleRhombusShape: DoubleRhombusShape,
  MultiOvalShape: MultiOvalShape,
  LineShape: LineShape,

  // IMPORTANT:
  // This allows the Standard > Text item to render TextShape.
  TextShape: TextShape,

  DashedRectShape: DashedRectShape,
  PredefinedShape: PredefinedShape,

  // Alias
  RhombusShape: DiamondShape,

  // ─────────────────────────────────────────────────────────────
  // FDD SHAPES
  // ─────────────────────────────────────────────────────────────
  FDD_FunctionShape: FDD_FunctionShape,
  FDD_InputShape: FDD_InputShape,
  FDD_OutputShape: FDD_OutputShape,
  FDD_ControlShape: FDD_ControlShape,
  FDD_MechanismShape: FDD_MechanismShape,
  FDD_InterfaceShape: FDD_InterfaceShape,
  FDD_BoundaryShape: FDD_BoundaryShape,
  FDD_NoteShape: FDD_NoteShape,
  FDD_ExternalEntityShape: FDD_ExternalEntityShape,

  // ─────────────────────────────────────────────────────────────
  // FLOWCHART SHAPES
  // ─────────────────────────────────────────────────────────────
  PentagonShape: PentagonShape,
  MergeJunctionShape: MergeJunctionShape,
  TrapezoidShape: TrapezoidShape,
  DShape: DShape,
  HexagonShape: HexagonShape,
  DisplayShape: DisplayShape,
  AnnotationShape: AnnotationShape,

  // ─────────────────────────────────────────────────────────────
  // DFD SHAPES
  // ─────────────────────────────────────────────────────────────
  DFDProcessShape: DFDProcessShape,
  DFDDataFlowShape: DFDDataFlowShape,
  DFDDataStoreShape: DFDDataStoreShape,
  DFDDataStoreGSShape: DFDDataStoreGSShape,
  DFDExternalEntityShape: DFDExternalEntityShape,
  DFDBidirectionalShape: DFDBidirectionalShape,
  DFDBoundaryShape: DFDBoundaryShape,
  DFDNoteShape: DFDNoteShape,
  DFDOnPageShape: DFDOnPageShape,
  DFDOffPageShape: DFDOffPageShape,

  // ─────────────────────────────────────────────────────────────
  // ERD SHAPES
  // ─────────────────────────────────────────────────────────────
  ERDEntityShape: ERDEntityShape,
  ERDWeakEntityShape: ERDWeakEntityShape,
  ERDRelationshipShape: ERDRelationshipShape,
  ERDIdentifyingRelShape: ERDIdentifyingRelShape,
  ERDAttributeShape: ERDAttributeShape,
  ERDMultivaluedAttrShape: ERDMultivaluedAttrShape,
  ERDDerivedAttrShape: ERDDerivedAttrShape,
  ERDCardinality11Shape: ERDCardinality11Shape,
  ERDCardinality1NShape: ERDCardinality1NShape,
  ERDCardinalityN1Shape: ERDCardinalityN1Shape,
  ERDCardinalityMNShape: ERDCardinalityMNShape,
  ERDConnectorShape: ERDConnectorShape,

  // ─────────────────────────────────────────────────────────────
  // FISHBONE SHAPES
  // ─────────────────────────────────────────────────────────────
  FishboneSpineShape: FishboneSpineShape,
  FishboneHeadShape: FishboneHeadShape,
  FishboneProblemShape: FishboneProblemShape,
  FishboneCauseTopShape: FishboneCauseTopShape,
  FishboneCauseBottomShape: FishboneCauseBottomShape,
  FishboneSubCauseTopShape: FishboneSubCauseTopShape,
  FishboneSubCauseBottomShape: FishboneSubCauseBottomShape,
  FishboneTertiaryShape: FishboneTertiaryShape,
  FishboneArrowShape: FishboneArrowShape,
  FishboneDashedArrowShape: FishboneDashedArrowShape,
  FishboneCategoryShape: FishboneCategoryShape,
  FishboneBubbleShape: FishboneBubbleShape,
  FishboneNoteShape: FishboneNoteShape,

  // ─────────────────────────────────────────────────────────────
  // SCHEMATIC SHAPES
  // ─────────────────────────────────────────────────────────────
  SchematicBatteryShape: SchematicBatteryShape,
  SchematicACShape: SchematicACShape,
  SchematicGroundShape: SchematicGroundShape,
  SchematicResistorShape: SchematicResistorShape,
  SchematicVariableResistorShape: SchematicVariableResistorShape,
  SchematicCapacitorShape: SchematicCapacitorShape,
  SchematicInductorShape: SchematicInductorShape,
  SchematicDiodeShape: SchematicDiodeShape,
  SchematicLEDShape: SchematicLEDShape,
  SchematicNPNShape: SchematicNPNShape,
  SchematicSwitchShape: SchematicSwitchShape,
  SchematicFuseShape: SchematicFuseShape,
  SchematicConnectionShape: SchematicConnectionShape,
  SchematicNoConnectionShape: SchematicNoConnectionShape,

  // ─────────────────────────────────────────────────────────────
  // USE CASE SHAPES
  // ─────────────────────────────────────────────────────────────
  UMLActorShape: UMLActorShape,
  UMLUseCaseShape: UMLUseCaseShape,
  UMLSystemBoundaryShape: UMLSystemBoundaryShape,
  UMLAssociationShape: UMLAssociationShape,
  UMLIncludeShape: UMLIncludeShape,
  UMLExtendShape: UMLExtendShape,
  UMLGeneralizationShape: UMLGeneralizationShape,
  UMLNoteShape: UMLNoteShape,
  UMLNoteConnectorShape: UMLNoteConnectorShape,
  UMLIncludeLabelShape: UMLIncludeLabelShape,
  UMLExtendLabelShape: UMLExtendLabelShape,

  // ─────────────────────────────────────────────────────────────
  // ACTIVITY SHAPES
  // ─────────────────────────────────────────────────────────────
  UMLInitialNodeShape: UMLInitialNodeShape,
  UMLActivityShape: UMLActivityShape,
  UMLDecisionShape: UMLDecisionShape,
  UMLForkShape: UMLForkShape,
  UMLJoinShape: UMLJoinShape,
  UMLControlFlowShape: UMLControlFlowShape,
  UMLObjectFlowShape: UMLObjectFlowShape,
  UMLSwimlaneShape: UMLSwimlaneShape,
  UMLActivityFinalShape: UMLActivityFinalShape,
  UMLFlowFinalShape: UMLFlowFinalShape,
  UMLConstraintShape: UMLConstraintShape,

  // ─────────────────────────────────────────────────────────────
  // SEQUENCE SHAPES
  // ─────────────────────────────────────────────────────────────
  UMLLifelineShape: UMLLifelineShape,
  UMLActivationShape: UMLActivationShape,
  UMLDestroyShape: UMLDestroyShape,
  UMLSyncMsgShape: UMLSyncMsgShape,
  UMLAsyncMsgShape: UMLAsyncMsgShape,
  UMLReturnMsgShape: UMLReturnMsgShape,
  UMLAltShape: UMLAltShape,
  UMLOptShape: UMLOptShape,
  UMLLoopShape: UMLLoopShape,
  UMLParShape: UMLParShape,
  UMLBreakShape: UMLBreakShape,

  // ─────────────────────────────────────────────────────────────
  // CLASS SHAPES
  // ─────────────────────────────────────────────────────────────
  UMLClassShape: UMLClassShape,
  UMLDirectedAssociationShape: UMLDirectedAssociationShape,
  UMLAggregationShape: UMLAggregationShape,
  UMLCompositionShape: UMLCompositionShape,
  UMLDependencyShape: UMLDependencyShape,
  UMLRealizationShape: UMLRealizationShape,
  UMLMultiplicity1Shape: UMLMultiplicity1Shape,
  UMLMultiplicity01Shape: UMLMultiplicity01Shape,
  UMLMultiplicityManyShape: UMLMultiplicityManyShape,
  UMLMultiplicity1ManyShape: UMLMultiplicity1ManyShape,
  UMLMultiplicityRangeShape: UMLMultiplicityRangeShape,
  UMLMultiplicityNShape: UMLMultiplicityNShape,
};

export const ShapeIcon: React.FC<ShapeIconProps> = ({
  name,
  width = DEFAULT_SIZE,
  height = DEFAULT_SIZE * 0.6,
  color = '#1a1f36',
  fillColor = '#ffffff',
  strokeWidth = 2,
}) => {
  const ShapeComponent = componentMap[name];

  // Unknown shape protection
  if (!ShapeComponent) {
    console.warn(`⚠️ ShapeIcon: Shape not found: ${name}`);

    return (
      <View
        style={[
          styles.fallback,
          {
            width,
            height,
          },
        ]}
      >
        <Text
          style={[
            styles.fallbackText,
            {
              color,
            },
          ]}
          numberOfLines={1}
        >
          {name ? name.substring(0, 6) : '?'}
        </Text>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.iconContainer,
        {
          width,
          height,
        },
      ]}
    >
      <ShapeComponent
        width={width}
        height={height}
        color={color}
        fillColor={fillColor}
        strokeWidth={strokeWidth}
      />
    </View>
  );
};

export const ShapePreview: React.FC<{
  name: string;
  label?: string;
  width?: number;
  height?: number;
  color?: string;
  fillColor?: string;
  strokeWidth?: number;
  selected?: boolean;
  showLabel?: boolean;
}> = ({
  name,
  label,
  width = 48,
  height = 32,
  color = '#1a1f36',
  fillColor = '#ffffff',
  strokeWidth = 2,
  selected = false,
  showLabel = true,
}) => {
  return (
    <View
      style={[
        styles.previewContainer,
        selected && styles.previewSelected,
      ]}
    >
      <ShapeIcon
        name={name}
        width={width}
        height={height}
        color={selected ? '#4c6fff' : color}
        fillColor={fillColor}
        strokeWidth={strokeWidth}
      />

      {showLabel && label && (
        <Text
          style={[
            styles.previewLabel,
            selected && styles.previewLabelSelected,
          ]}
          numberOfLines={1}
        >
          {label}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },

  previewContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 4,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: 'transparent',
    backgroundColor: 'transparent',
    width: '100%',
  },

  previewSelected: {
    borderColor: '#4c6fff',
    backgroundColor: '#eef2ff',
  },

  previewLabel: {
    fontSize: 8,
    color: '#64748b',
    fontWeight: '500',
    textAlign: 'center',
    marginTop: 2,
    lineHeight: 10,
    maxWidth: '100%',
  },

  previewLabelSelected: {
    color: '#4c6fff',
    fontWeight: '600',
  },

  fallback: {
    backgroundColor: '#f1f5f9',
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderStyle: 'dashed',
    padding: 4,
  },

  fallbackText: {
    fontSize: 8,
    fontWeight: '500',
    color: '#64748b',
  },
});

export default ShapeIcon;