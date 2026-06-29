// components/shapes/ShapeIcon.tsx - Add FDD shapes to componentMap

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

// Import all shape components
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
  // New Flowchart Shapes
  PentagonShape,
  TrapezoidShape,
  DShape,
  HexagonShape,
  DisplayShape,
  AnnotationShape,
  // UML
  ActorShape as UMLActorShape,
  InitialNodeShape,
  FinalNodeShape,
  ForkJoinShape,
  LifelineShape,
  ActivationShape,
  ClassBoxShape,
  InterfaceShape,
  AbstractClassShape,
  // ERD
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
  // Arrows
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
  // Schematic
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
} from './shapes';

export interface ShapeIconProps {
  name: string;
  width?: number;
  height?: number;
  color?: string;
  fillColor?: string;
  strokeWidth?: number;
  showLabel?: boolean;
  label?: string;
}

const DEFAULT_SIZE = 48;

// ✅ Component map - each shape name maps to its component
const componentMap: Record<string, React.ComponentType<any>> = {
  // ─── Standard Shapes ────────────────────────────────────────────────────
  'RectShape': RectShape,
  'RoundedRectShape': RoundedRectShape,
  'CircleShape': CircleShape,
  'EllipseShape': EllipseShape,
  'DiamondShape': DiamondShape,
  'TriangleShape': TriangleShape,
  'ParallelogramShape': ParallelogramShape,
  'CylinderShape': CylinderShape,
  'DocumentShape': DocumentShape,
  'FolderShape': FolderShape,
  'CloudShape': CloudShape,
  'NoteStandaloneShape': NoteStandaloneShape,
  'ActorShape': ActorShape,
  'ConnectorArrowShape': ConnectorArrowShape,
  
  // ─── Basic Shapes (legacy) ─────────────────────────────────────────────
  'DoubleRectShape': DoubleRectShape,
  'DoubleRhombusShape': DoubleRhombusShape,
  'MultiOvalShape': MultiOvalShape,
  'LineShape': LineShape,
  'TextShape': TextShape,
  'DashedRectShape': DashedRectShape,
  'PredefinedShape': PredefinedShape,
  'RhombusShape': DiamondShape,
  
  // ─── FDD Shapes ────────────────────────────────────────────────────────
  'FDD_FunctionShape': FDD_FunctionShape,
  'FDD_InputShape': FDD_InputShape,
  'FDD_OutputShape': FDD_OutputShape,
  'FDD_ControlShape': FDD_ControlShape,
  'FDD_MechanismShape': FDD_MechanismShape,
  'FDD_InterfaceShape': FDD_InterfaceShape,
  'FDD_BoundaryShape': FDD_BoundaryShape,
  'FDD_NoteShape': FDD_NoteShape,
  'FDD_ExternalEntityShape': FDD_ExternalEntityShape,
  
  // ─── Flowchart Shapes ──────────────────────────────────────────────────
  'PentagonShape': PentagonShape,
  'TrapezoidShape': TrapezoidShape,
  'DShape': DShape,
  'HexagonShape': HexagonShape,
  'DisplayShape': DisplayShape,
  'AnnotationShape': AnnotationShape,
  
  // ─── UML ────────────────────────────────────────────────────────────────
  'UMLActorShape': UMLActorShape,
  'InitialNodeShape': InitialNodeShape,
  'FinalNodeShape': FinalNodeShape,
  'ForkJoinShape': ForkJoinShape,
  'LifelineShape': LifelineShape,
  'ActivationShape': ActivationShape,
  'ClassBoxShape': ClassBoxShape,
  'InterfaceShape': InterfaceShape,
  'AbstractClassShape': AbstractClassShape,
  
  // ─── ERD ────────────────────────────────────────────────────────────────
  'EntityShape': EntityShape,
  'WeakEntityShape': WeakEntityShape,
  'AttributeShape': AttributeShape,
  'PrimaryKeyShape': PrimaryKeyShape,
  'DerivedAttrShape': DerivedAttrShape,
  'CompositeAttrShape': CompositeAttrShape,
  'MultiAttrShape': MultiAttrShape,
  'RelationshipShape': RelationshipShape,
  'IdentifyingRelShape': IdentifyingRelShape,
  'CardinalityShape': CardinalityShape,
  'CrowOneShape': CrowOneShape,
  'CrowZeroOneShape': CrowZeroOneShape,
  'CrowZeroManyShape': CrowZeroManyShape,
  'CrowOneManyShape': CrowOneManyShape,
  'CrowManyShape': CrowManyShape,
  'TotalParticipationShape': TotalParticipationShape,
  'PartialParticipationShape': PartialParticipationShape,
  'ERDConnectorShape': ERDConnectorShape,
  
  // ─── Arrows ─────────────────────────────────────────────────────────────
  'ArrowShape': ArrowShape,
  'ArrowDownShape': ArrowDownShape,
  'ArrowRightShape': ArrowRightShape,
  'FilledArrowShape': FilledArrowShape,
  'OpenArrowShape': OpenArrowShape,
  'DashedArrowShape': DashedArrowShape,
  'DashedArrowBackShape': DashedArrowBackShape,
  'TriangleArrowShape': TriangleArrowShape,
  'LoopArrowShape': LoopArrowShape,
  'CreateArrowShape': CreateArrowShape,
  'DestructionShape': DestructionShape,
  'AggregationShape': AggregationShape,
  'CompositionShape': CompositionShape,
  'MultiplicityShape': MultiplicityShape,
  'ArrowDiagShape': ArrowDiagShape,
  'ArrowSmallShape': ArrowSmallShape,
  
  // ─── Schematic ──────────────────────────────────────────────────────────
  'ResistorShape': ResistorShape,
  'CapacitorShape': CapacitorShape,
  'InductorShape': InductorShape,
  'VoltageShape': VoltageShape,
  'GroundShape': GroundShape,
  'DiodeShape': DiodeShape,
  'TransistorShape': TransistorShape,
  'ICShape': ICShape,
  'OpAmpShape': OpAmpShape,
  'SwitchShape': SwitchShape,
  'FuseShape': FuseShape,
  'TransformerShape': TransformerShape,
};

export const ShapeIcon: React.FC<ShapeIconProps> = ({
  name,
  width = DEFAULT_SIZE,
  height = DEFAULT_SIZE * 0.6,
  color = '#1a1f36',
  fillColor = '#ffffff',
  strokeWidth = 2,
  showLabel = false,
  label = '',
}) => {
  const ShapeComponent = componentMap[name];

  if (!ShapeComponent) {
    console.warn(`⚠️ Shape not found: ${name}`);
    return (
      <View style={[styles.fallback, { width, height }]}>
        <Text style={[styles.fallbackText, { color }]}>
          {label || name.substring(0, 6)}
        </Text>
      </View>
    );
  }

  return (
    <View style={{ width, height }}>
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
  label: string;
  width?: number;
  height?: number;
  color?: string;
  fillColor?: string;
  strokeWidth?: number;
  selected?: boolean;
}> = ({
  name,
  label,
  width = 48,
  height = 32,
  color = '#1a1f36',
  fillColor = '#ffffff',
  strokeWidth = 2,
  selected = false,
}) => {
  return (
    <View style={[styles.previewContainer, selected && styles.previewSelected]}>
      <ShapeIcon
        name={name}
        width={width}
        height={height}
        color={selected ? '#4c6fff' : color}
        fillColor={fillColor}
        strokeWidth={strokeWidth}
      />
      <Text 
        style={[styles.previewLabel, selected && styles.previewLabelSelected]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
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