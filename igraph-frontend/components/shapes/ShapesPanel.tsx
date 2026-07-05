// components/shapes/ShapesPanel.tsx — With hover tooltips for shape names

import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Platform,
  TextInput,
  LayoutAnimation,
  UIManager,
  useWindowDimensions,
  Animated,
} from 'react-native';
import { DIAGRAM_TABS, DIAGRAM_SHAPES, ShapeDefinition } from '@/constants/shapes';
import { ShapePreview } from './ShapeIcon';
import { Svg, Path, Circle } from 'react-native-svg';
import * as shapeComponents from './shapes';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// ─── Icons ────────────────────────────────────────────────────────────────────

const SearchIcon = ({ color = '#94a3b8' }: { color?: string }) => (
  <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
    <Path
      d="M21 21L15 15M17 9C17 13.4183 13.4183 17 9 17C4.58172 17 1 13.4183 1 9C1 4.58172 4.58172 1 9 1C13.4183 1 17 4.58172 17 9Z"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const ClearIcon = () => (
  <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="12" r="10" stroke="#94a3b8" strokeWidth={1.5} />
    <Path d="M15 9L9 15M9 9L15 15" stroke="#94a3b8" strokeWidth={1.8} strokeLinecap="round" />
  </Svg>
);

// ─── Animated Arrow Icon ─────────────────────────────────────────────────────

const AnimatedArrow = ({ expanded, color }: { expanded: boolean; color: string }) => {
  const spinValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(spinValue, {
      toValue: expanded ? 1 : 0,
      duration: 250,
      useNativeDriver: true,
    }).start();
  }, [expanded]);

  const spin = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  return (
    <Animated.View style={{ transform: [{ rotate: spin }] }}>
      <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
        <Path
          d="M6 9L12 15L18 9"
          stroke={color}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    </Animated.View>
  );
};

// ─── Helper to get shape component ──────────────────────────────────────────

const getShapeComponent = (svgComponentName: string): React.ComponentType<any> | null => {
  const componentMap: Record<string, React.ComponentType<any>> = {
    // ─── Standard Shapes ────────────────────────────────────────────────────
    'RectShape': shapeComponents.RectShape,
    'RoundedRectShape': shapeComponents.RoundedRectShape,
    'CircleShape': shapeComponents.CircleShape,
    'EllipseShape': shapeComponents.EllipseShape,
    'DiamondShape': shapeComponents.DiamondShape,
    'TriangleShape': shapeComponents.TriangleShape,
    'ParallelogramShape': shapeComponents.ParallelogramShape,
    'CylinderShape': shapeComponents.CylinderShape,
    'DocumentShape': shapeComponents.DocumentShape,
    'FolderShape': shapeComponents.FolderShape,
    'CloudShape': shapeComponents.CloudShape,
    'NoteStandaloneShape': shapeComponents.NoteStandaloneShape,
    'ActorShape': shapeComponents.ActorShape,
    'ConnectorArrowShape': shapeComponents.ConnectorArrowShape,
    
    // ─── Basic Shapes (legacy) ─────────────────────────────────────────────
    'DoubleRectShape': shapeComponents.DoubleRectShape,
    'DoubleRhombusShape': shapeComponents.DoubleRhombusShape,
    'MultiOvalShape': shapeComponents.MultiOvalShape,
    'LineShape': shapeComponents.LineShape,
    'TextShape': shapeComponents.TextShape,
    'DashedRectShape': shapeComponents.DashedRectShape,
    'PredefinedShape': shapeComponents.PredefinedShape,
    
    // ─── FDD Shapes ────────────────────────────────────────────────────────
    'FDD_FunctionShape': shapeComponents.FDD_FunctionShape,
    'FDD_InputShape': shapeComponents.FDD_InputShape,
    'FDD_OutputShape': shapeComponents.FDD_OutputShape,
    'FDD_ControlShape': shapeComponents.FDD_ControlShape,
    'FDD_MechanismShape': shapeComponents.FDD_MechanismShape,
    'FDD_InterfaceShape': shapeComponents.FDD_InterfaceShape,
    'FDD_BoundaryShape': shapeComponents.FDD_BoundaryShape,
    'FDD_NoteShape': shapeComponents.FDD_NoteShape,
    'FDD_ExternalEntityShape': shapeComponents.FDD_ExternalEntityShape,
    
    // ─── Flowchart Shapes ──────────────────────────────────────────────────
    'PentagonShape': shapeComponents.PentagonShape,
    'TrapezoidShape': shapeComponents.TrapezoidShape,
    'DShape': shapeComponents.DShape,
    'HexagonShape': shapeComponents.HexagonShape,
    'DisplayShape': shapeComponents.DisplayShape,
    'AnnotationShape': shapeComponents.AnnotationShape,
    
    // ─── DFD Shapes ────────────────────────────────────────────────────────
    'DFDProcessShape': shapeComponents.DFDProcessShape,
    'DFDDataFlowShape': shapeComponents.DFDDataFlowShape,
    'DFDDataStoreShape': shapeComponents.DFDDataStoreShape,
    'DFDDataStoreGSShape': shapeComponents.DFDDataStoreGSShape,
    'DFDExternalEntityShape': shapeComponents.DFDExternalEntityShape,
    'DFDBidirectionalShape': shapeComponents.DFDBidirectionalShape,
    'DFDBoundaryShape': shapeComponents.DFDBoundaryShape,
    'DFDNoteShape': shapeComponents.DFDNoteShape,
    'DFDOnPageShape': shapeComponents.DFDOnPageShape,
    'DFDOffPageShape': shapeComponents.DFDOffPageShape,
    
    // ─── ERD Shapes ────────────────────────────────────────────────────────
    'ERDEntityShape': shapeComponents.ERDEntityShape,
    'ERDWeakEntityShape': shapeComponents.ERDWeakEntityShape,
    'ERDRelationshipShape': shapeComponents.ERDRelationshipShape,
    'ERDIdentifyingRelShape': shapeComponents.ERDIdentifyingRelShape,
    'ERDAttributeShape': shapeComponents.ERDAttributeShape,
    'ERDMultivaluedAttrShape': shapeComponents.ERDMultivaluedAttrShape,
    'ERDDerivedAttrShape': shapeComponents.ERDDerivedAttrShape,
    'ERDCardinality11Shape': shapeComponents.ERDCardinality11Shape,
    'ERDCardinality1NShape': shapeComponents.ERDCardinality1NShape,
    'ERDCardinalityN1Shape': shapeComponents.ERDCardinalityN1Shape,
    'ERDCardinalityMNShape': shapeComponents.ERDCardinalityMNShape,
    'ERDConnectorShape': shapeComponents.ERDConnectorShape,
    
    // ─── Fishbone Shapes ──────────────────────────────────────────────────
    'FishboneSpineShape': shapeComponents.FishboneSpineShape,
    'FishboneHeadShape': shapeComponents.FishboneHeadShape,
    'FishboneProblemShape': shapeComponents.FishboneProblemShape,
    'FishboneCauseTopShape': shapeComponents.FishboneCauseTopShape,
    'FishboneCauseBottomShape': shapeComponents.FishboneCauseBottomShape,
    'FishboneSubCauseTopShape': shapeComponents.FishboneSubCauseTopShape,
    'FishboneSubCauseBottomShape': shapeComponents.FishboneSubCauseBottomShape,
    'FishboneTertiaryShape': shapeComponents.FishboneTertiaryShape,
    'FishboneArrowShape': shapeComponents.FishboneArrowShape,
    'FishboneDashedArrowShape': shapeComponents.FishboneDashedArrowShape,
    'FishboneCategoryShape': shapeComponents.FishboneCategoryShape,
    'FishboneBubbleShape': shapeComponents.FishboneBubbleShape,
    'FishboneNoteShape': shapeComponents.FishboneNoteShape,
    
    // ─── Schematic Shapes ──────────────────────────────────────────────────
    'SchematicBatteryShape': shapeComponents.SchematicBatteryShape,
    'SchematicACShape': shapeComponents.SchematicACShape,
    'SchematicGroundShape': shapeComponents.SchematicGroundShape,
    'SchematicResistorShape': shapeComponents.SchematicResistorShape,
    'SchematicVariableResistorShape': shapeComponents.SchematicVariableResistorShape,
    'SchematicCapacitorShape': shapeComponents.SchematicCapacitorShape,
    'SchematicInductorShape': shapeComponents.SchematicInductorShape,
    'SchematicDiodeShape': shapeComponents.SchematicDiodeShape,
    'SchematicLEDShape': shapeComponents.SchematicLEDShape,
    'SchematicNPNShape': shapeComponents.SchematicNPNShape,
    'SchematicSwitchShape': shapeComponents.SchematicSwitchShape,
    'SchematicFuseShape': shapeComponents.SchematicFuseShape,
    'SchematicConnectionShape': shapeComponents.SchematicConnectionShape,
    'SchematicNoConnectionShape': shapeComponents.SchematicNoConnectionShape,
    
    // ─── Use Case Shapes ──────────────────────────────────────────────────
    'UMLActorShape': shapeComponents.UMLActorShape,
    'UMLUseCaseShape': shapeComponents.UMLUseCaseShape,
    'UMLSystemBoundaryShape': shapeComponents.UMLSystemBoundaryShape,
    'UMLAssociationShape': shapeComponents.UMLAssociationShape,
    'UMLIncludeShape': shapeComponents.UMLIncludeShape,
    'UMLExtendShape': shapeComponents.UMLExtendShape,
    'UMLGeneralizationShape': shapeComponents.UMLGeneralizationShape,
    'UMLNoteShape': shapeComponents.UMLNoteShape,
    'UMLNoteConnectorShape': shapeComponents.UMLNoteConnectorShape,
    'UMLIncludeLabelShape': shapeComponents.UMLIncludeLabelShape,
    'UMLExtendLabelShape': shapeComponents.UMLExtendLabelShape,
    
    // ─── Activity Shapes ──────────────────────────────────────────────────
    'UMLInitialNodeShape': shapeComponents.UMLInitialNodeShape,
    'UMLActivityShape': shapeComponents.UMLActivityShape,
    'UMLDecisionShape': shapeComponents.UMLDecisionShape,
    'UMLMergeShape': shapeComponents.UMLMergeShape,
    'UMLForkShape': shapeComponents.UMLForkShape,
    'UMLControlFlowShape': shapeComponents.UMLControlFlowShape,
    'UMLObjectFlowShape': shapeComponents.UMLObjectFlowShape,
    'UMLSwimlaneShape': shapeComponents.UMLSwimlaneShape,
    'UMLActivityFinalShape': shapeComponents.UMLActivityFinalShape,
    'UMLFlowFinalShape': shapeComponents.UMLFlowFinalShape,
    'UMLConstraintShape': shapeComponents.UMLConstraintShape,
    
    // ─── Sequence Shapes ──────────────────────────────────────────────────
    'UMLLifelineShape': shapeComponents.UMLLifelineShape,
    'UMLActivationShape': shapeComponents.UMLActivationShape,
    'UMLDestroyShape': shapeComponents.UMLDestroyShape,
    'UMLSyncMsgShape': shapeComponents.UMLSyncMsgShape,
    'UMLAsyncMsgShape': shapeComponents.UMLAsyncMsgShape,
    'UMLReturnMsgShape': shapeComponents.UMLReturnMsgShape,
    'UMLAltShape': shapeComponents.UMLAltShape,
    'UMLOptShape': shapeComponents.UMLOptShape,
    'UMLLoopShape': shapeComponents.UMLLoopShape,
    'UMLParShape': shapeComponents.UMLParShape,
    'UMLBreakShape': shapeComponents.UMLBreakShape,
    
    // ─── Class Shapes ──────────────────────────────────────────────────────
    'UMLClassShape': shapeComponents.UMLClassShape,
    'UMLDirectedAssociationShape': shapeComponents.UMLDirectedAssociationShape,
    'UMLAggregationShape': shapeComponents.UMLAggregationShape,
    'UMLCompositionShape': shapeComponents.UMLCompositionShape,
    'UMLDependencyShape': shapeComponents.UMLDependencyShape,
    'UMLMultiplicity1Shape': shapeComponents.UMLMultiplicity1Shape,
    'UMLMultiplicity01Shape': shapeComponents.UMLMultiplicity01Shape,
    'UMLMultiplicityManyShape': shapeComponents.UMLMultiplicityManyShape,
    'UMLMultiplicity1ManyShape': shapeComponents.UMLMultiplicity1ManyShape,
    'UMLMultiplicityRangeShape': shapeComponents.UMLMultiplicityRangeShape,
    'UMLMultiplicityNShape': shapeComponents.UMLMultiplicityNShape,
  };

  return componentMap[svgComponentName] || null;
};

// ─── Drag Ghost Component ────────────────────────────────────────────────────

const DragGhost = ({ 
  shape, 
  x, 
  y 
}: { 
  shape: ShapeDefinition; 
  x: number; 
  y: number;
}) => {
  const ShapeComponent = getShapeComponent(shape.svgComponent);
  
  if (!ShapeComponent) {
    return (
      <div
        style={{
          position: 'fixed',
          left: x - 30,
          top: y - 18,
          width: 60,
          height: 36,
          backgroundColor: '#4c6fff',
          borderRadius: 6,
          pointerEvents: 'none',
          opacity: 0.85,
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          zIndex: 9999,
        }}
      />
    );
  }

  return (
    <div
      style={{
        position: 'fixed',
        left: x - 50,
        top: y - 30,
        width: 100,
        height: 60,
        pointerEvents: 'none',
        opacity: 0.85,
        zIndex: 9999,
        filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.15))',
      }}
    >
      <ShapeComponent
        width={100}
        height={60}
        color="#4c6fff"
        fillColor="#eef2ff"
        strokeWidth={2}
      />
    </div>
  );
};

interface ShapesPanelProps {
  onSelectShape: (shapeId: string, shapeData?: ShapeDefinition) => void;
  isGraphReady: boolean;
  activeDiagramType?: string;
  onDiagramTypeChange?: (type: string) => void;
}

export default function ShapesPanel({
  onSelectShape,
  isGraphReady,
  activeDiagramType = 'Standard',
  onDiagramTypeChange,
}: ShapesPanelProps) {
  const { width: windowWidth } = useWindowDimensions();
  const isDesktop = windowWidth >= 768;

  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCategory, setExpandedCategory] = useState<string>(activeDiagramType || 'Standard');
  const [selectedShape, setSelectedShape] = useState<string | null>(null);
  const [hoveredShape, setHoveredShape] = useState<string | null>(null);
  
  // ─── Drag ghost state ───────────────────────────────────────────────────────
  const [dragGhost, setDragGhost] = useState<{ shape: ShapeDefinition; x: number; y: number } | null>(null);
  const dragTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isMobile = !isDesktop;

  // Sync expandedCategory with activeDiagramType prop
  useEffect(() => {
    if (activeDiagramType && activeDiagramType !== expandedCategory) {
      setExpandedCategory(activeDiagramType);
    }
  }, [activeDiagramType]);

  // ─── Filter shapes ─────────────────────────────────────────────────────────

  const filteredData = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();

    if (!query) {
      return DIAGRAM_TABS.map((category) => ({
        category,
        shapes: DIAGRAM_SHAPES[category] || [],
        match: true,
        isActive: category === activeDiagramType,
      }));
    }

    return DIAGRAM_TABS
      .map((category) => {
        const shapes = (DIAGRAM_SHAPES[category] || []).filter(
          (shape) =>
            shape.label.toLowerCase().includes(query) ||
            shape.id.toLowerCase().includes(query) ||
            shape.description?.toLowerCase().includes(query)
        );
        const categoryMatch = category.toLowerCase().includes(query);
        return {
          category,
          shapes,
          match: categoryMatch || shapes.length > 0,
          isActive: category === activeDiagramType,
        };
      })
      .filter((item) => item.match);
  }, [searchQuery, activeDiagramType]);

  // ─── Shape selection ──────────────────────────────────────────────────────

  const handleShapeSelect = useCallback((shape: ShapeDefinition) => {
    setSelectedShape(shape.id);
    onSelectShape(shape.id, shape);
    setTimeout(() => setSelectedShape(null), 300);
  }, [onSelectShape]);

  // ─── Category toggle ──────────────────────────────────────────────────────

  const toggleCategory = useCallback((category: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedCategory(expandedCategory === category ? '' : category);
    if (onDiagramTypeChange && expandedCategory !== category) {
      onDiagramTypeChange(category);
    }
  }, [expandedCategory, onDiagramTypeChange]);

  // ─── Clear search ─────────────────────────────────────────────────────────

  const clearSearch = useCallback(() => {
    setSearchQuery('');
  }, []);

  // ─── Drag handlers ─────────────────────────────────────────────────────────

  const handleDragStart = useCallback((e: React.DragEvent, shape: ShapeDefinition) => {
    if (!isGraphReady) {
      e.preventDefault();
      return;
    }

    e.dataTransfer.setData('application/igraphit-shape', shape.id);
    e.dataTransfer.effectAllowed = 'copy';

    const ghostX = e.clientX;
    const ghostY = e.clientY;

    setDragGhost({ shape, x: ghostX, y: ghostY });

    if (dragTimeoutRef.current) {
      clearTimeout(dragTimeoutRef.current);
    }

    dragTimeoutRef.current = setTimeout(() => {
      setDragGhost(null);
    }, 3000);
  }, [isGraphReady]);

  const handleDrag = useCallback((e: React.DragEvent) => {
    if (dragGhost) {
      setDragGhost({
        ...dragGhost,
        x: e.clientX,
        y: e.clientY,
      });
    }
  }, [dragGhost]);

  const handleDragEnd = useCallback(() => {
    setDragGhost(null);
    if (dragTimeoutRef.current) {
      clearTimeout(dragTimeoutRef.current);
      dragTimeoutRef.current = null;
    }
  }, []);

  // ─── Render ────────────────────────────────────────────────────────────────

  const tileSize = isMobile ? 64 : 72;
  const iconWidth = isMobile ? 40 : 48;
  const iconHeight = isMobile ? 26 : 32;

  // ⭐ Colors for active state - BLUE
  const activeColor = '#4c6fff';
  const activeBgColor = '#eef2ff';

  // ─── Tooltip component for web ─────────────────────────────────────────────
  const ShapeTooltip = ({ label, isVisible, x, y }: { label: string; isVisible: boolean; x: number; y: number }) => {
    if (!isVisible || !label) return null;
    
    return (
      <div
        style={{
          position: 'fixed',
          left: x,
          top: y - 30,
          transform: 'translateX(-50%)',
          backgroundColor: '#1a1f36',
          color: '#ffffff',
          padding: '4px 10px',
          borderRadius: '6px',
          fontSize: '11px',
          fontWeight: '500',
          pointerEvents: 'none',
          zIndex: 1000,
          whiteSpace: 'nowrap',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          opacity: 1,
          transition: 'opacity 0.15s ease',
        }}
      >
        {label}
        <div
          style={{
            position: 'absolute',
            bottom: -6,
            left: '50%',
            transform: 'translateX(-50%)',
            width: 0,
            height: 0,
            borderLeft: '6px solid transparent',
            borderRight: '6px solid transparent',
            borderTop: '6px solid #1a1f36',
          }}
        />
      </div>
    );
  };

  return (
    <View style={[styles.panel, isDesktop && styles.panelDesktop]}>
      {/* Drag Ghost */}
      {dragGhost && (
        <DragGhost shape={dragGhost.shape} x={dragGhost.x} y={dragGhost.y} />
      )}

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Shapes</Text>
        {isGraphReady && (
          <Text style={styles.headerHint}>Drag to canvas</Text>
        )}
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputWrapper}>
          <SearchIcon color="#94a3b8" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search shapes..."
            placeholderTextColor="#94a3b8"
            value={searchQuery}
            onChangeText={setSearchQuery}
            clearButtonMode="while-editing"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={clearSearch} style={styles.clearBtn}>
              <ClearIcon />
            </TouchableOpacity>
          )}
        </View>
        {searchQuery.length > 0 && (
          <Text style={styles.searchResults}>
            {filteredData.reduce((acc, item) => acc + item.shapes.length, 0)} results
          </Text>
        )}
      </View>

      {/* Shapes List */}
      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={true}
        persistentScrollbar={true}
        indicatorStyle="black"
        contentContainerStyle={styles.scrollContent}
      >
        {filteredData.map(({ category, shapes, isActive }) => {
          const isExpanded = expandedCategory === category || searchQuery.length > 0;
          const hasShapes = shapes.length > 0;

          if (!hasShapes && searchQuery.length > 0) return null;

          return (
            <View key={category} style={styles.categoryContainer}>
              <TouchableOpacity
                style={[
                  styles.categoryHeader,
                  isActive && styles.categoryHeaderActive,
                  isDesktop && styles.categoryHeaderDesktop,
                ]}
                onPress={() => toggleCategory(category)}
                activeOpacity={0.7}
              >
                <View style={styles.categoryHeaderLeft}>
                  <View style={[styles.categoryDot, isActive && styles.categoryDotActive]} />
                  <Text style={[styles.categoryTitle, isActive && styles.categoryTitleActive]}>
                    {category === 'Standard' ? '⭐ Standard' : category}
                  </Text>
                </View>
                {searchQuery.length === 0 && (
                  <AnimatedArrow 
                    expanded={isExpanded} 
                    color={isActive ? activeColor : '#94a3b8'} 
                  />
                )}
              </TouchableOpacity>

              {(isExpanded || searchQuery.length > 0) && (
                <View style={styles.grid}>
                  {shapes.map((shape) => {
                    const isSelected = selectedShape === shape.id;
                    const isHovered = hoveredShape === shape.id;

                    if (Platform.OS === 'web') {
                      return (
                        <div
                          key={shape.id + category}
                          draggable={isGraphReady}
                          onDragStart={(e) => handleDragStart(e, shape)}
                          onDrag={handleDrag}
                          onDragEnd={handleDragEnd}
                          onClick={() => handleShapeSelect(shape)}
                          onMouseEnter={(e) => {
                            setHoveredShape(shape.id);
                          }}
                          onMouseLeave={() => {
                            setHoveredShape(null);
                          }}
                          style={{
                            width: tileSize,
                            height: tileSize + 20,
                            borderRadius: 10,
                            backgroundColor: isSelected ? activeBgColor : 'transparent',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 4,
                            cursor: isGraphReady ? 'grab' : 'not-allowed',
                            opacity: isGraphReady ? 1 : 0.4,
                            userSelect: 'none',
                            transition: 'all 0.15s ease',
                            transform: isSelected ? 'scale(0.95)' : 'scale(1)',
                            position: 'relative',
                          }}
                        >
                          <ShapePreview
                            name={shape.svgComponent}
                            width={iconWidth}
                            height={iconHeight}
                            selected={isSelected}
                            showLabel={false}
                          />
                          {/* Tooltip on hover */}
                          {isHovered && (
                            <div
                              style={{
                                position: 'absolute',
                                bottom: -8,
                                left: '50%',
                                transform: 'translateX(-50%) translateY(100%)',
                                backgroundColor: '#1a1f36',
                                color: '#ffffff',
                                padding: '4px 10px',
                                borderRadius: '6px',
                                fontSize: '11px',
                                fontWeight: '500',
                                pointerEvents: 'none',
                                zIndex: 1000,
                                whiteSpace: 'nowrap',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                              }}
                            >
                              {shape.label}
                              <div
                                style={{
                                  position: 'absolute',
                                  top: -6,
                                  left: '50%',
                                  transform: 'translateX(-50%)',
                                  width: 0,
                                  height: 0,
                                  borderLeft: '6px solid transparent',
                                  borderRight: '6px solid transparent',
                                  borderBottom: '6px solid #1a1f36',
                                }}
                              />
                            </div>
                          )}
                        </div>
                      );
                    }

                    return (
                      <TouchableOpacity
                        key={shape.id + category}
                        style={[
                          styles.tile,
                          isSelected && styles.tileSelected,
                          !isGraphReady && styles.tileDisabled,
                          { width: tileSize, height: tileSize + 20 },
                        ]}
                        onPress={() => handleShapeSelect(shape)}
                        activeOpacity={0.7}
                        disabled={!isGraphReady}
                      >
                        <ShapePreview
                          name={shape.svgComponent}
                          width={iconWidth}
                          height={iconHeight}
                          selected={isSelected}
                          showLabel={false}
                        />
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </View>
          );
        })}

        {searchQuery.length > 0 && filteredData.every((item) => item.shapes.length === 0) && (
          <View style={styles.noResults}>
            <Text style={styles.noResultsText}>No shapes found</Text>
            <Text style={styles.noResultsSubtext}>Try a different search term</Text>
          </View>
        )}
      </ScrollView>

      {/* Footer */}
      {isDesktop && (
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            {isGraphReady ? 'Drop shapes onto canvas' : 'Loading editor...'}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    backgroundColor: '#ffffff',
    flexDirection: 'column',
    height: '100%',
    ...Platform.select({
      web: {
        borderRightWidth: 1,
        borderRightColor: '#e2e8f0',
        boxShadow: '2px 0 8px rgba(0,0,0,0.06)',
      },
    }),
  },
  panelDesktop: {
    width: 280,
  },

  header: {
    height: 44,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1a1f36',
  },
  headerHint: {
    fontSize: 10,
    color: '#94a3b8',
    fontStyle: 'italic',
  },

  searchContainer: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 36,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#1a1f36',
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  clearBtn: {
    padding: 4,
  },
  searchResults: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 6,
    paddingHorizontal: 4,
  },

  scroll: {
    flex: 1,
    ...Platform.select({
      web: {
        scrollbarWidth: 'thin',
        scrollbarColor: '#cbd5e1 transparent',
      },
    }),
  },
  scrollContent: {
    paddingBottom: 20,
  },

  categoryContainer: {
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },

  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    ...Platform.select({ web: { cursor: 'pointer' } }),
  },
  categoryHeaderDesktop: {
    paddingVertical: 10,
  },
  categoryHeaderActive: {
    backgroundColor: '#eef2ff',
  },

  categoryHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  categoryDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#cbd5e1',
  },
  categoryDotActive: {
    backgroundColor: '#4c6fff',
  },

  categoryTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1a1f36',
  },
  categoryTitleActive: {
    color: '#4c6fff',
  },

  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 10,
    gap: 8,
    paddingBottom: 12,
  },

  tile: {
    borderRadius: 10,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    ...Platform.select({
      web: {
        cursor: 'pointer',
        transition: 'all 0.15s ease',
      },
    }),
  },
  tileSelected: {
    backgroundColor: '#eef2ff',
    transform: [{ scale: 0.95 }],
  },
  tileDisabled: {
    opacity: 0.4,
  },

  noResults: {
    padding: 24,
    alignItems: 'center',
  },
  noResultsText: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
  },
  noResultsSubtext: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 4,
  },

  footer: {
    height: 32,
    paddingHorizontal: 14,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 11,
    color: '#94a3b8',
  },
});

// ─── Web scrollbar styles ──────────────────────────────────────────────────

if (Platform.OS === 'web') {
  const style = document.createElement('style');
  style.textContent = `
    .shapes-panel-scroll::-webkit-scrollbar {
      width: 6px;
    }
    .shapes-panel-scroll::-webkit-scrollbar-track {
      background: transparent;
    }
    .shapes-panel-scroll::-webkit-scrollbar-thumb {
      background: #cbd5e1;
      border-radius: 3px;
    }
    .shapes-panel-scroll::-webkit-scrollbar-thumb:hover {
      background: #94a3b8;
    }
  `;
  document.head.appendChild(style);
}