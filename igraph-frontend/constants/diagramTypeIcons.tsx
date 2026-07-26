import React from 'react';
import { Svg, Path, Circle, Rect, Ellipse } from 'react-native-svg';

// Per-diagram-type glyphs, one per topic in home.tsx's DIAGRAMS / diagram/[id].tsx's
// DIAGRAM_CONTENT, keyed by title in DIAGRAM_ICON_MAP below. Shared so the Home grid
// and the diagram detail page render the same distinct icon for the same topic
// instead of each screen inventing its own generic placeholder.

export const GenericDiagramGlyph = ({ color }: { color: string }) => (
  <Svg width={38} height={38} viewBox="0 0 24 24" fill="none">
    <Rect x="3" y="3" width="8" height="8" rx="2" stroke={color} strokeWidth={1.6} />
    <Rect x="13" y="3" width="8" height="8" rx="2" stroke={color} strokeWidth={1.6} />
    <Rect x="8" y="13" width="8" height="8" rx="2" stroke={color} strokeWidth={1.6} />
    <Path d="M7 11V13M17 11V13M11 7H13" stroke={color} strokeWidth={1.6} strokeLinecap="round" />
  </Svg>
);

const FunctionalDecompositionGlyph = ({ color }: { color: string }) => (
  <Svg width={38} height={38} viewBox="0 0 24 24" fill="none">
    <Rect x="9" y="2" width="6" height="5" rx="1" stroke={color} strokeWidth={1.6} />
    <Rect x="2" y="15" width="6" height="5" rx="1" stroke={color} strokeWidth={1.6} />
    <Rect x="16" y="15" width="6" height="5" rx="1" stroke={color} strokeWidth={1.6} />
    <Path d="M12 7V11M12 11H5V15M12 11H19V15" stroke={color} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const FlowchartGlyph = ({ color }: { color: string }) => (
  <Svg width={38} height={38} viewBox="0 0 24 24" fill="none">
    <Rect x="8" y="2" width="8" height="5" rx="2.5" stroke={color} strokeWidth={1.6} />
    <Path d="M12 7V10" stroke={color} strokeWidth={1.6} />
    <Path d="M12 10L16 14L12 18L8 14Z" stroke={color} strokeWidth={1.6} strokeLinejoin="round" />
    <Path d="M12 18V21" stroke={color} strokeWidth={1.6} />
    <Circle cx="12" cy="21.5" r="1.3" fill={color} />
  </Svg>
);

const DataFlowGlyph = ({ color }: { color: string }) => (
  <Svg width={38} height={38} viewBox="0 0 24 24" fill="none">
    <Circle cx="7" cy="6" r="4" stroke={color} strokeWidth={1.6} />
    <Circle cx="17" cy="6" r="4" stroke={color} strokeWidth={1.6} />
    <Path d="M11 6H13" stroke={color} strokeWidth={1.6} />
    <Rect x="4" y="16" width="16" height="5" stroke={color} strokeWidth={1.6} />
    <Path d="M7 10V16M17 10V16" stroke={color} strokeWidth={1.6} />
  </Svg>
);

const EntityRelationshipGlyph = ({ color }: { color: string }) => (
  <Svg width={38} height={38} viewBox="0 0 24 24" fill="none">
    <Rect x="1" y="9" width="7" height="6" rx="1" stroke={color} strokeWidth={1.6} />
    <Rect x="16" y="9" width="7" height="6" rx="1" stroke={color} strokeWidth={1.6} />
    <Path d="M8 12H9.5L12 8L14.5 12L12 16L9.5 12" stroke={color} strokeWidth={1.6} strokeLinejoin="round" />
    <Path d="M14.5 12H16" stroke={color} strokeWidth={1.6} />
  </Svg>
);

const FishboneGlyph = ({ color }: { color: string }) => (
  <Svg width={38} height={38} viewBox="0 0 24 24" fill="none">
    <Path d="M2 12H19" stroke={color} strokeWidth={1.6} strokeLinecap="round" />
    <Path d="M19 12L15 8M19 12L15 16" stroke={color} strokeWidth={1.6} strokeLinecap="round" />
    <Path d="M6 12L3 7M9 12L6 7M13 12L10 7" stroke={color} strokeWidth={1.4} strokeLinecap="round" />
    <Path d="M6 12L3 17M9 12L6 17M13 12L10 17" stroke={color} strokeWidth={1.4} strokeLinecap="round" />
  </Svg>
);

const SchematicGlyph = ({ color }: { color: string }) => (
  <Svg width={38} height={38} viewBox="0 0 24 24" fill="none">
    <Path d="M2 6H8" stroke={color} strokeWidth={1.6} />
    <Path d="M8 6L10 3L12 9L14 3L16 6" stroke={color} strokeWidth={1.6} strokeLinejoin="round" />
    <Path d="M16 6H22" stroke={color} strokeWidth={1.6} />
    <Circle cx="2" cy="6" r="1.4" fill={color} />
    <Circle cx="22" cy="6" r="1.4" fill={color} />
    <Rect x="6" y="14" width="12" height="7" rx="1" stroke={color} strokeWidth={1.6} />
    <Path d="M9 14V11M15 14V11" stroke={color} strokeWidth={1.6} />
  </Svg>
);

const UseCaseGlyph = ({ color }: { color: string }) => (
  <Svg width={38} height={38} viewBox="0 0 24 24" fill="none">
    <Circle cx="4" cy="5" r="2" stroke={color} strokeWidth={1.6} />
    <Path d="M4 7V14M4 9H1M4 9H7M4 14L2 20M4 14L6 20" stroke={color} strokeWidth={1.6} strokeLinecap="round" />
    <Ellipse cx="16" cy="12" rx="6" ry="5" stroke={color} strokeWidth={1.6} />
  </Svg>
);

const ActivityGlyph = ({ color }: { color: string }) => (
  <Svg width={38} height={38} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="3" r="1.6" fill={color} />
    <Path d="M12 4.6V7" stroke={color} strokeWidth={1.6} />
    <Rect x="7" y="7" width="10" height="5" rx="2.5" stroke={color} strokeWidth={1.6} />
    <Path d="M12 12V14" stroke={color} strokeWidth={1.6} />
    <Path d="M5 14H19" stroke={color} strokeWidth={2.2} strokeLinecap="round" />
    <Path d="M8 14V17M16 14V17" stroke={color} strokeWidth={1.6} />
    <Circle cx="8" cy="19" r="1.6" stroke={color} strokeWidth={1.6} />
    <Circle cx="16" cy="19" r="1.6" stroke={color} strokeWidth={1.6} />
  </Svg>
);

const SequenceGlyph = ({ color }: { color: string }) => (
  <Svg width={38} height={38} viewBox="0 0 24 24" fill="none">
    <Path d="M5 6V22M19 6V22" stroke={color} strokeWidth={1.4} strokeDasharray="2,2" />
    <Rect x="2" y="2" width="6" height="4" rx="1" stroke={color} strokeWidth={1.6} />
    <Rect x="16" y="2" width="6" height="4" rx="1" stroke={color} strokeWidth={1.6} />
    <Path d="M5 11H18L15 9M18 11L15 13" stroke={color} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M19 17H6L9 15M6 17L9 19" stroke={color} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const ClassGlyph = ({ color }: { color: string }) => (
  <Svg width={38} height={38} viewBox="0 0 24 24" fill="none">
    <Rect x="4" y="2" width="16" height="20" rx="1.5" stroke={color} strokeWidth={1.6} />
    <Path d="M4 8H20M4 15H20" stroke={color} strokeWidth={1.6} />
    <Path d="M7 11.5H15M7 18.5H14" stroke={color} strokeWidth={1.4} strokeLinecap="round" opacity={0.7} />
  </Svg>
);

const WaterfallGlyph = ({ color }: { color: string }) => (
  <Svg width={38} height={38} viewBox="0 0 24 24" fill="none">
    <Path d="M2 4H8V8H14V12H20V16" stroke={color} strokeWidth={1.6} strokeLinejoin="round" fill="none" />
    <Path d="M20 16V20" stroke={color} strokeWidth={1.6} />
    <Path d="M17 17L20 20L23 17" stroke={color} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const BigBangGlyph = ({ color }: { color: string }) => (
  <Svg width={38} height={38} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="12" r="3.5" stroke={color} strokeWidth={1.6} />
    <Path
      d="M12 2V6M12 18V22M2 12H6M18 12H22M4.9 4.9L7.5 7.5M16.5 16.5L19.1 19.1M19.1 4.9L16.5 7.5M7.5 16.5L4.9 19.1"
      stroke={color}
      strokeWidth={1.6}
      strokeLinecap="round"
    />
  </Svg>
);

const PrototypeGlyph = ({ color }: { color: string }) => (
  <Svg width={38} height={38} viewBox="0 0 24 24" fill="none">
    <Rect x="8" y="8" width="8" height="8" rx="1.5" stroke={color} strokeWidth={1.6} strokeDasharray="2,2" />
    <Path d="M4 8A9 9 0 0 1 12 2" stroke={color} strokeWidth={1.6} strokeLinecap="round" />
    <Path d="M2 6L4 8L6.5 6.5" stroke={color} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M20 16A9 9 0 0 1 12 22" stroke={color} strokeWidth={1.6} strokeLinecap="round" />
    <Path d="M22 18L20 16L17.5 17.5" stroke={color} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const AgileGlyph = ({ color }: { color: string }) => (
  <Svg width={38} height={38} viewBox="0 0 24 24" fill="none">
    <Rect x="2" y="4" width="20" height="16" rx="2" stroke={color} strokeWidth={1.6} />
    <Path d="M9 4V20M16 4V20" stroke={color} strokeWidth={1.6} />
    <Rect x="4" y="7" width="3" height="4" rx="0.5" fill={color} opacity={0.25} />
    <Rect x="11" y="7" width="3" height="7" rx="0.5" fill={color} opacity={0.25} />
    <Rect x="18" y="7" width="2" height="3" rx="0.5" fill={color} opacity={0.25} />
  </Svg>
);

const IterativeGlyph = ({ color }: { color: string }) => (
  <Svg width={38} height={38} viewBox="0 0 24 24" fill="none">
    <Path d="M4 12a8 8 0 1 1 2.6 5.9" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    <Path d="M3 16.5L2.5 12L7 12.8" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const VModelGlyph = ({ color }: { color: string }) => (
  <Svg width={38} height={38} viewBox="0 0 24 24" fill="none">
    <Path d="M3 4L11 20L21 4" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" fill="none" />
    <Circle cx="3" cy="4" r="1.6" fill={color} />
    <Circle cx="21" cy="4" r="1.6" fill={color} />
    <Circle cx="11" cy="20" r="1.6" fill={color} />
    <Path d="M7 8L17 8" stroke={color} strokeWidth={1.2} strokeDasharray="1.5,1.5" opacity={0.6} />
  </Svg>
);

const RADGlyph = ({ color }: { color: string }) => (
  <Svg width={38} height={38} viewBox="0 0 24 24" fill="none">
    <Path d="M13 2L4 14H11L10 22L20 9H13L13 2Z" stroke={color} strokeWidth={1.6} strokeLinejoin="round" fill="none" />
  </Svg>
);

const SpiralGlyph = ({ color }: { color: string }) => (
  <Svg width={38} height={38} viewBox="0 0 24 24" fill="none">
    <Path
      d="M12 12C12 10.5 13 10 13.8 10.5C15 11.2 14.8 13.3 13 13.8C10.5 14.5 8.5 12 9.3 9.5C10.3 6.5 14 5.5 16.5 7.5C19.5 10 18.5 15 15 17C11 19.5 5.5 17.5 3.5 13"
      stroke={color}
      strokeWidth={1.6}
      strokeLinecap="round"
      fill="none"
    />
    <Circle cx="3.5" cy="13" r="1.3" fill={color} />
  </Svg>
);

// Maps each diagram title to its dedicated glyph so cards/hero images are visually
// distinguishable at a glance instead of repeating one generic icon.
export const DIAGRAM_ICON_MAP: Record<string, React.FC<{ color: string }>> = {
  'Functional Decomposition Diagram': FunctionalDecompositionGlyph,
  'Flowchart': FlowchartGlyph,
  'Data Flow Diagram': DataFlowGlyph,
  'Entity Relationship Diagram': EntityRelationshipGlyph,
  'Fishbone Diagram': FishboneGlyph,
  'Schematic Diagram': SchematicGlyph,
  'Use Case Diagram': UseCaseGlyph,
  'Activity Diagram': ActivityGlyph,
  'Sequence Diagram': SequenceGlyph,
  'Class Diagram': ClassGlyph,
  'Waterfall Model': WaterfallGlyph,
  'Big Bang Model': BigBangGlyph,
  'Prototype Model': PrototypeGlyph,
  'Agile Model': AgileGlyph,
  'Iterative Model': IterativeGlyph,
  'V Model': VModelGlyph,
  'Rapid Application Development': RADGlyph,
  'Spiral Model': SpiralGlyph,
};
