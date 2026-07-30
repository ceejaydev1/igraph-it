import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  useWindowDimensions,
  Animated,
  StatusBar,
  TextInput,
  Alert,
  Image,
  Linking,
  Easing,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Svg, Path, Circle } from 'react-native-svg';
import { WebView } from 'react-native-webview';
import { DIAGRAM_ICON_MAP, GenericDiagramGlyph } from '../../../constants/diagramTypeIcons';
import { ShapeIcon } from '../../../components/shapes/ShapeIcon';
import * as authService from '../../../services/authService';
import API_BASE_URL from '../../../constants/api';


// ─── Types ───────────────────────────────────────────────────────────────────

interface DiagramSection {
  heading: string;
  body: string;
}

import { ImageSourcePropType } from 'react-native';

interface DiagramContent {
  id: number;
  title: string;
  type: 'UML' | 'SDLC';
  tagline: string;
  videoId: string;
  sections: DiagramSection[];
  steps?: string[];
  keyPoints?: string[];
  references?: ReferenceLink[];
  shapesUsed?: ShapeUsed[];
  imageAlt: string;
  placeholderImage?: ImageSourcePropType;
}

interface ReferenceLink {
  label: string;
  url: string;
}

interface ShapeUsed {
  name: string;
  description: string;
  // Matches a key in components/shapes/ShapeIcon.tsx's componentMap — the
  // exact same shape component the editor's real drag-and-drop shape panel
  // renders (constants/shapes.ts's ShapeDefinition.svgComponent), so this
  // reference panel shows the identical icon rather than a lookalike redraw.
  svgComponent: string;
}

interface TypeConfig {
  primary: string;
  light: string;
  gradient: readonly [string, string];
  accent: string;
}

// ─── Content Data ─────────────────────────────────────────────────────────────

const LOREM_SHORT = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.';
const LOREM_BODY = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.';
const LOREM_BODY_2 = 'Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.';
const LOREM_BODY_3 = 'Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo.';

const DEFAULT_SECTIONS: DiagramSection[] = [
  { heading: 'What It Is', body: LOREM_BODY },
  { heading: 'When to Use It', body: LOREM_BODY_2 },
  { heading: 'Pros and Cons', body: LOREM_BODY_3 },
];

const DEFAULT_STEPS = [
  'Lorem ipsum dolor sit amet',
  'Consectetur adipiscing elit',
  'Sed do eiusmod tempor incididunt',
  'Ut labore et dolore magna aliqua',
  'Ut enim ad minim veniam',
  'Quis nostrud exercitation ullamco',
];

const DEFAULT_KEY_POINTS = [
  'Lorem ipsum dolor sit amet, consectetur',
  'Sed do eiusmod tempor incididunt ut labore',
  'Ut enim ad minim veniam, quis nostrud',
  'Duis aute irure dolor in reprehenderit',
];

const DEFAULT_REFERENCES: ReferenceLink[] = [
  { label: 'Wikipedia Overview', url: 'https://en.wikipedia.org/wiki/Software_development_process' },
  { label: 'Further Reading', url: 'https://example.com/further-reading' },
  { label: 'Related Case Study', url: 'https://example.com/case-study' },
];

// Keyed by the exact title strings used in DIAGRAM_CONTENT below — each UML
// diagram type gets the notation it actually draws with, not a generic set.
// Names AND svgComponent values match constants/shapes.ts's DIAGRAM_SHAPES
// one-for-one, so this reference panel renders the identical icon the
// editor's real drag-and-drop shape panel uses (via ShapeIcon below) and can
// never visually drift from it. Descriptions here explain what each shape
// DOES/means rather than reusing that file's terse editor-tooltip text.
const SHAPES_BY_TITLE: Record<string, ShapeUsed[]> = {
  'Functional Decomposition Diagram': [
    { name: 'Function', description: 'A rounded box naming one function or sub-function the system performs.', svgComponent: 'FDD_FunctionShape' },
    { name: 'Control', description: 'An arrow entering the top of a function, showing the rule or condition that governs how it runs.', svgComponent: 'FDD_ControlShape' },
    { name: 'Mechanism', description: 'An arrow entering the bottom of a function, showing the resource that actually carries it out.', svgComponent: 'FDD_MechanismShape' },
    { name: 'Interface', description: 'A line marking a point where a function exchanges information with something outside it.', svgComponent: 'FDD_InterfaceShape' },
    { name: 'Boundary', description: 'A dashed rectangle marking what falls inside the system being modeled.', svgComponent: 'FDD_BoundaryShape' },
    { name: 'Note', description: 'A folded-corner box for adding notes and assumptions alongside the diagram.', svgComponent: 'FDD_NoteShape' },
    { name: 'External Entity', description: 'An oval representing a system or person outside the boundary that a function interacts with.', svgComponent: 'FDD_ExternalEntityShape' },
  ],
  'Flowchart': [
    { name: 'Terminator', description: 'A rounded shape marking where the process begins or ends.', svgComponent: 'EllipseShape' },
    { name: 'Process', description: 'A rectangle representing one processing step or action.', svgComponent: 'RectShape' },
    { name: 'Input / Output', description: 'A parallelogram marking data going into or coming out of the process.', svgComponent: 'ParallelogramShape' },
    { name: 'Decision', description: 'A diamond posing a yes/no question that branches the flow.', svgComponent: 'DiamondShape' },
    { name: 'On-Page Connector', description: 'A small circle linking flow that continues elsewhere on the same page.', svgComponent: 'CircleShape' },
    { name: 'Off-Page Connector', description: 'A pentagon marking where the flow continues on a different page.', svgComponent: 'PentagonShape' },
    { name: 'Flow Line', description: 'An arrow showing the order the steps execute in.', svgComponent: 'ConnectorArrowShape' },
    { name: 'Document', description: 'A shape representing a single printed document produced by a step.', svgComponent: 'DocumentShape' },
    { name: 'Database', description: 'A cylinder representing a place data is stored.', svgComponent: 'CylinderShape' },
    { name: 'Predefined Process', description: 'A rectangle representing a call out to a separate, already-defined sub-process.', svgComponent: 'PredefinedShape' },
    { name: 'Manual Input', description: 'A shape marking a step where data is typed or entered by hand.', svgComponent: 'TrapezoidShape' },
    { name: 'Delay', description: 'A shape marking a deliberate pause or waiting period before the flow continues.', svgComponent: 'DShape' },
    { name: 'Preparation', description: 'A hexagon marking a setup or initialization step that runs before the main process.', svgComponent: 'HexagonShape' },
    { name: 'Display', description: 'A shape representing information being shown to a user, e.g. on a screen.', svgComponent: 'DisplayShape' },
    { name: 'Annotation', description: 'A bracket-style note attached to a step to explain it further.', svgComponent: 'AnnotationShape' },
  ],
  'Data Flow Diagram': [
    { name: 'Process', description: 'A circle representing a step that transforms incoming data into outgoing data.', svgComponent: 'DFDProcessShape' },
    { name: 'Data Flow', description: 'An arrow showing data moving between entities, processes, and stores.', svgComponent: 'DFDDataFlowShape' },
    { name: 'Data Store (Yourdon)', description: 'Two parallel lines representing a place where data is held at rest.', svgComponent: 'DFDDataStoreShape' },
    { name: 'Data Store (Gane)', description: 'A rectangle with a side line, the Gane-Sarson version of a place data is held at rest.', svgComponent: 'DFDDataStoreGSShape' },
    { name: 'External Entity', description: 'A rectangle representing a source or destination outside the system, like a user or another system.', svgComponent: 'DFDExternalEntityShape' },
    { name: 'Bidirectional Flow', description: 'An arrow with heads on both ends, showing data moving in both directions at once.', svgComponent: 'DFDBidirectionalShape' },
    { name: 'System Boundary', description: 'A dashed rectangle marking what falls inside the system being modeled.', svgComponent: 'DFDBoundaryShape' },
    { name: 'Note', description: 'A box for attaching a comment or clarification to the diagram.', svgComponent: 'DFDNoteShape' },
    { name: 'On-Page Connector', description: 'A small circle linking flow that continues elsewhere on the same page.', svgComponent: 'DFDOnPageShape' },
    { name: 'Off-Page Connector', description: 'A pentagon marking where the flow continues on a different page.', svgComponent: 'DFDOffPageShape' },
  ],
  'Entity Relationship Diagram': [
    { name: 'Entity', description: 'A rectangle representing a table or object type, like Customer or Order.', svgComponent: 'ERDEntityShape' },
    { name: 'Weak Entity', description: 'An entity that can’t be uniquely identified without the entity it depends on.', svgComponent: 'ERDWeakEntityShape' },
    { name: 'Relationship', description: 'A diamond describing how two entities interact, like "places" or "contains".', svgComponent: 'ERDRelationshipShape' },
    { name: 'Identifying Rel.', description: 'A double diamond linking a weak entity to the stronger entity it depends on.', svgComponent: 'ERDIdentifyingRelShape' },
    { name: 'Attribute', description: 'An oval naming a single property that belongs to an entity.', svgComponent: 'ERDAttributeShape' },
    { name: 'Multivalued Attr', description: 'A double oval marking an attribute that can hold more than one value at once.', svgComponent: 'ERDMultivaluedAttrShape' },
    { name: 'Derived Attr', description: 'A dashed oval marking an attribute that’s calculated from other attributes rather than stored directly.', svgComponent: 'ERDDerivedAttrShape' },
    { name: 'Cardinality 1:1', description: 'Marks a relationship where each record on one side matches exactly one record on the other.', svgComponent: 'ERDCardinality11Shape' },
    { name: 'Cardinality 1:N', description: 'Marks a relationship where one record on one side can match many records on the other.', svgComponent: 'ERDCardinality1NShape' },
    { name: 'Cardinality N:1', description: 'Marks a relationship where many records on one side match a single record on the other.', svgComponent: 'ERDCardinalityN1Shape' },
    { name: 'Cardinality M:N', description: 'Marks a relationship where many records on each side can match many records on the other.', svgComponent: 'ERDCardinalityMNShape' },
    { name: 'Connector', description: 'A line joining entities, attributes, and relationships together.', svgComponent: 'ERDConnectorShape' },
  ],
  'Fishbone Diagram': [
    { name: 'Spine', description: 'The main arrow running to the effect box, forming the backbone the rest of the diagram branches off of.', svgComponent: 'FishboneSpineShape' },
    { name: 'Fish Head', description: 'The pointed shape at the head of the spine naming the problem or effect being investigated.', svgComponent: 'FishboneHeadShape' },
    { name: 'Effect Box', description: 'The box naming the specific problem being analyzed.', svgComponent: 'FishboneProblemShape' },
    { name: 'Main Cause (Top)', description: 'A diagonal branch above the spine representing one major cause category.', svgComponent: 'FishboneCauseTopShape' },
    { name: 'Main Cause (Bottom)', description: 'A diagonal branch below the spine representing one major cause category.', svgComponent: 'FishboneCauseBottomShape' },
    { name: 'Sub-Cause (Top)', description: 'A smaller branch off a main cause above the spine, naming one specific contributing factor.', svgComponent: 'FishboneSubCauseTopShape' },
    { name: 'Sub-Cause (Bottom)', description: 'A smaller branch off a main cause below the spine, naming one specific contributing factor.', svgComponent: 'FishboneSubCauseBottomShape' },
    { name: 'Tertiary Cause', description: 'A branch off a sub-cause, going one level deeper into what’s contributing to the problem.', svgComponent: 'FishboneTertiaryShape' },
    { name: 'Cause Arrow', description: 'An arrow linking a cause label to the bone it belongs to.', svgComponent: 'FishboneArrowShape' },
    { name: 'Possible Cause', description: 'A dashed arrow linking a cause that’s suspected but not yet confirmed.', svgComponent: 'FishboneDashedArrowShape' },
    { name: 'Category Box', description: 'A small box labeling a cause category, like "People" or "Process".', svgComponent: 'FishboneCategoryShape' },
    { name: 'Cause Bubble', description: 'An oval calling out a specific cause or reason.', svgComponent: 'FishboneBubbleShape' },
    { name: 'Note', description: 'A box for attaching a comment or clarification to the diagram.', svgComponent: 'FishboneNoteShape' },
  ],
  'Schematic Diagram': [
    { name: 'DC Voltage Source', description: 'Represents a battery supplying a constant voltage to the circuit.', svgComponent: 'SchematicBatteryShape' },
    { name: 'AC Voltage Source', description: 'Represents a source supplying alternating current to the circuit.', svgComponent: 'SchematicACShape' },
    { name: 'Ground', description: 'Marks the circuit’s reference, zero-voltage point.', svgComponent: 'SchematicGroundShape' },
    { name: 'Resistor', description: 'Represents a component that resists and limits the flow of current.', svgComponent: 'SchematicResistorShape' },
    { name: 'Variable Resistor', description: 'Represents a resistor whose resistance can be adjusted.', svgComponent: 'SchematicVariableResistorShape' },
    { name: 'Capacitor', description: 'Represents a component that stores electrical charge.', svgComponent: 'SchematicCapacitorShape' },
    { name: 'Inductor', description: 'Represents a coil that stores energy in a magnetic field.', svgComponent: 'SchematicInductorShape' },
    { name: 'Diode', description: 'Represents a component that only lets current flow in one direction.', svgComponent: 'SchematicDiodeShape' },
    { name: 'LED', description: 'Represents a diode that emits light when current passes through it.', svgComponent: 'SchematicLEDShape' },
    { name: 'NPN Transistor', description: 'Represents a transistor used to switch or amplify current in the circuit.', svgComponent: 'SchematicNPNShape' },
    { name: 'Switch', description: 'Represents a control that opens or closes the circuit.', svgComponent: 'SchematicSwitchShape' },
    { name: 'Fuse', description: 'Represents a safety component that breaks the circuit if current gets too high.', svgComponent: 'SchematicFuseShape' },
    { name: 'Wire Connection', description: 'Marks a point where two crossing wires are actually joined together.', svgComponent: 'SchematicConnectionShape' },
    { name: 'No Connection', description: 'Marks two wires that cross paths on the diagram without electrically connecting.', svgComponent: 'SchematicNoConnectionShape' },
  ],
  'Use Case Diagram': [
    { name: 'Actor', description: 'A stick figure representing a person or external system interacting with the model.', svgComponent: 'UMLActorShape' },
    { name: 'Use Case', description: 'An oval naming a single goal a user accomplishes with the system.', svgComponent: 'UMLUseCaseShape' },
    { name: 'System Boundary', description: 'A frame separating what the system does from the actors around it.', svgComponent: 'UMLSystemBoundaryShape' },
    { name: 'Association', description: 'A line connecting an actor to the use cases it takes part in.', svgComponent: 'UMLAssociationShape' },
    { name: 'Include', description: 'A dashed arrow showing a use case that always runs the steps of another use case.', svgComponent: 'UMLIncludeShape' },
    { name: 'Extend', description: 'A dashed arrow showing a use case that optionally adds extra steps to another.', svgComponent: 'UMLExtendShape' },
    { name: 'Generalization', description: 'An arrow showing one actor or use case is a specialized version of another.', svgComponent: 'UMLGeneralizationShape' },
    { name: 'Note', description: 'A box for attaching a comment or clarification to the diagram.', svgComponent: 'UMLNoteShape' },
    { name: 'Note Connector', description: 'A line linking a note to the element it explains.', svgComponent: 'UMLNoteConnectorShape' },
    { name: 'Include Label', description: 'The «include» text tag placed on an Include relationship.', svgComponent: 'UMLIncludeLabelShape' },
    { name: 'Extend Label', description: 'The «extend» text tag placed on an Extend relationship.', svgComponent: 'UMLExtendLabelShape' },
  ],
  'Activity Diagram': [
    { name: 'Initial Node', description: 'A filled circle marking where the activity flow begins.', svgComponent: 'UMLInitialNodeShape' },
    { name: 'Action', description: 'A rounded rectangle for one action being carried out.', svgComponent: 'UMLActivityShape' },
    { name: 'Decision', description: 'A diamond branching the flow based on a condition.', svgComponent: 'UMLDecisionShape' },
    { name: 'Merge', description: 'A bar where multiple incoming flows converge back into a single path.', svgComponent: 'UMLMergeShape' },
    { name: 'Fork', description: 'A bar splitting one flow into several paths that run in parallel.', svgComponent: 'UMLForkShape' },
    { name: 'Control Flow', description: 'An arrow showing the order activities execute in.', svgComponent: 'UMLControlFlowShape' },
    { name: 'Object Flow', description: 'A dashed arrow showing an object passing from one activity to another.', svgComponent: 'UMLObjectFlowShape' },
    { name: 'Swimlane', description: 'A frame dividing the diagram into columns by who’s responsible for each activity.', svgComponent: 'UMLSwimlaneShape' },
    { name: 'Activity Final', description: 'A ringed circle marking where the entire activity flow ends.', svgComponent: 'UMLActivityFinalShape' },
    { name: 'Flow Final', description: 'A circle marking where one branch of the flow ends, without ending the whole activity.', svgComponent: 'UMLFlowFinalShape' },
    { name: 'Note', description: 'A box for attaching a comment or clarification to the diagram.', svgComponent: 'UMLNoteShape' },
    { name: 'Constraint', description: 'A dashed note attaching a rule or condition the flow must satisfy.', svgComponent: 'UMLConstraintShape' },
  ],
  'Sequence Diagram': [
    { name: 'Actor', description: 'A stick figure representing whoever starts the interaction, with its own lifeline running down the diagram.', svgComponent: 'UMLActorShape' },
    { name: 'Lifeline', description: 'A dashed vertical line tracking one participant through time, top to bottom.', svgComponent: 'UMLLifelineShape' },
    { name: 'Activation', description: 'A thin bar on a lifeline showing when that participant is actively processing.', svgComponent: 'UMLActivationShape' },
    { name: 'Destroy', description: 'An X marking the point where an object is destroyed and its lifeline ends.', svgComponent: 'UMLDestroyShape' },
    { name: 'Sync Message', description: 'A solid arrow for a call that waits for a response before the sender continues.', svgComponent: 'UMLSyncMsgShape' },
    { name: 'Async Message', description: 'An arrow for a call that continues immediately without waiting for a response.', svgComponent: 'UMLAsyncMsgShape' },
    { name: 'Return', description: 'A dashed arrow showing a reply heading back to whoever made the call.', svgComponent: 'UMLReturnMsgShape' },
    { name: 'ALT Fragment', description: 'A frame showing alternative paths, where only one branch runs depending on a condition.', svgComponent: 'UMLAltShape' },
    { name: 'OPT Fragment', description: 'A frame showing a section that only runs if a condition is met.', svgComponent: 'UMLOptShape' },
    { name: 'LOOP Fragment', description: 'A frame showing a section that repeats for as long as a condition holds.', svgComponent: 'UMLLoopShape' },
    { name: 'PAR Fragment', description: 'A frame showing sections that all run at the same time.', svgComponent: 'UMLParShape' },
    { name: 'BREAK Fragment', description: 'A frame showing a section that, once triggered, skips the rest of the interaction.', svgComponent: 'UMLBreakShape' },
    { name: 'Note', description: 'A box for attaching a comment or clarification to the diagram.', svgComponent: 'UMLNoteShape' },
  ],
  'Class Diagram': [
    { name: 'Class', description: 'A rectangle split into name, attributes, and methods — the blueprint for an object.', svgComponent: 'UMLClassShape' },
    { name: 'Association', description: 'A plain line showing two classes are related, without implying direction.', svgComponent: 'UMLAssociationShape' },
    { name: 'Directed Association', description: 'An arrow showing a relationship that only one of the two classes is aware of.', svgComponent: 'UMLDirectedAssociationShape' },
    { name: 'Aggregation', description: 'A hollow diamond for a "has-a" relationship where the part can outlive the whole.', svgComponent: 'UMLAggregationShape' },
    { name: 'Composition', description: 'A filled diamond for a stronger "owns-a" bond — the part is destroyed along with the whole.', svgComponent: 'UMLCompositionShape' },
    { name: 'Dependency', description: 'A dashed arrow showing one class relies on another without holding a lasting reference to it.', svgComponent: 'UMLDependencyShape' },
    { name: 'Generalization', description: 'A hollow triangle arrow pointing from a subclass up to its parent class.', svgComponent: 'UMLGeneralizationShape' },
    { name: 'Note', description: 'A box for attaching a comment or clarification to the diagram.', svgComponent: 'UMLNoteShape' },
    { name: 'Note Connector', description: 'A line linking a note to the class it explains.', svgComponent: 'UMLNoteConnectorShape' },
    { name: 'Exactly One', description: 'Marks a multiplicity of exactly one.', svgComponent: 'UMLMultiplicity1Shape' },
    { name: 'Zero or One', description: 'Marks a multiplicity of zero or one — the relationship is optional.', svgComponent: 'UMLMultiplicity01Shape' },
    { name: 'Zero or More', description: 'Marks a multiplicity of zero or more — any number at all, including none.', svgComponent: 'UMLMultiplicityManyShape' },
    { name: 'One or More', description: 'Marks a multiplicity of one or more — at least one is required.', svgComponent: 'UMLMultiplicity1ManyShape' },
    { name: 'Range', description: 'Marks a multiplicity bounded between a minimum and maximum count.', svgComponent: 'UMLMultiplicityRangeShape' },
    { name: 'Exactly n', description: 'Marks a multiplicity of exactly some fixed number, n.', svgComponent: 'UMLMultiplicityNShape' },
  ],
};

const PLACEHOLDER_VIDEO_ID = 'dQw4w9WgXcQ';

const createUMLDiagram = (id: number, title: string, imageAlt: string): DiagramContent => ({
  id,
  title,
  type: 'UML',
  tagline: LOREM_SHORT,
  videoId: PLACEHOLDER_VIDEO_ID,
  imageAlt,
  sections: DEFAULT_SECTIONS,
  steps: DEFAULT_STEPS,
  keyPoints: DEFAULT_KEY_POINTS,
  references: DEFAULT_REFERENCES,
  shapesUsed: SHAPES_BY_TITLE[title] || [],
});

const createSDLCDiagram = (id: number, title: string, imageAlt: string): DiagramContent => ({
  id,
  title,
  type: 'SDLC',
  tagline: LOREM_SHORT,
  videoId: PLACEHOLDER_VIDEO_ID,
  imageAlt,
  sections: DEFAULT_SECTIONS,
  steps: DEFAULT_STEPS,
  keyPoints: DEFAULT_KEY_POINTS,
  references: DEFAULT_REFERENCES,
});

const DIAGRAM_CONTENT: Record<number, DiagramContent> = {
  1: createUMLDiagram(1, 'Functional Decomposition Diagram', 'Functional Decomposition Diagram example'),
  2: createUMLDiagram(2, 'Flowchart', 'Flowchart example'),
  3: createUMLDiagram(3, 'Data Flow Diagram', 'Data Flow Diagram example'),
  4: createUMLDiagram(4, 'Entity Relationship Diagram', 'Entity Relationship Diagram example'),
  5: createUMLDiagram(5, 'Fishbone Diagram', 'Fishbone Diagram example'),
  6: createUMLDiagram(6, 'Schematic Diagram', 'Schematic Diagram example'),
  7: createUMLDiagram(7, 'Use Case Diagram', 'Use Case Diagram example'),
  8: createUMLDiagram(8, 'Activity Diagram', 'Activity Diagram example'),
  9: createUMLDiagram(9, 'Sequence Diagram', 'Sequence Diagram example'),
  10: createUMLDiagram(10, 'Class Diagram', 'Class Diagram example'),
  11: createSDLCDiagram(11, 'Waterfall Model', 'Waterfall Model diagram'),
  12: createSDLCDiagram(12, 'Modified Waterfall Model', 'Modified Waterfall Model diagram'),
  13: createSDLCDiagram(13, 'Big Bang Model', 'Big Bang Model diagram'),
  14: createSDLCDiagram(14, 'Prototype Model', 'Prototype Model diagram'),
  15: createSDLCDiagram(15, 'Agile Model', 'Agile Model diagram'),
  16: createSDLCDiagram(16, 'Iterative Model', 'Iterative Model diagram'),
  17: createSDLCDiagram(17, 'V Model', 'V Model diagram'),
  18: createSDLCDiagram(18, 'Rapid Application Development', 'RAD Model diagram'),
  19: createSDLCDiagram(19, 'Spiral Model', 'Spiral Model diagram'),
};

// ─── Color Configuration ─────────────────────────────────────────────────────

const TYPE_CONFIG: Record<'UML' | 'SDLC', TypeConfig> = {
  UML: {
    primary: '#4c6fff',
    light: '#eef2ff',
    gradient: ['#4c6fff', '#6b85ff'],
    accent: '#3a5be8',
  },
  SDLC: {
    primary: '#10b981',
    light: '#ecfdf5',
    gradient: ['#10b981', '#34d399'],
    accent: '#059669',
  },
} as const;

// ─── Responsive Breakpoints ──────────────────────────────────────────────────

const BREAKPOINTS = {
  tablet: 768,
  desktop: 1024,
  maxContentWidth: 1280,
} as const;

// ─── SVG Icons ────────────────────────────────────────────────────────────────

interface IconProps {
  color: string;
}

const BackIcon: React.FC = () => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
    <Path
      d="M15 18l-6-6 6-6"
      stroke="#1E293B"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

// Shared by the hero and the floating-header back buttons — same look, same
// hover behavior, defined once so the two can't silently drift apart. Home/
// Reference/Saved Diagrams all give their clickable cards a hover state on
// web; this page previously gave none of its buttons one.
interface BackButtonProps {
  onPress: () => void;
  style?: any;
}

const BackButton: React.FC<BackButtonProps> = ({ onPress, style }) => {
  const [isHovered, setIsHovered] = useState(false);
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.backButtonBase, isHovered && styles.backButtonHovered, style]}
      activeOpacity={0.6}
      accessibilityLabel="Go back to home"
      accessibilityRole="button"
      // @ts-ignore - React Native Web specific props
      onMouseEnter={() => setIsHovered(true)}
      // @ts-ignore
      onMouseLeave={() => setIsHovered(false)}
    >
      <BackIcon />
    </TouchableOpacity>
  );
};

// Same subtle dot texture used on Home/Reference/Saved Diagrams — this was
// the one main screen missing it, which made it read flatter than its own
// siblings despite being the screen users spend the most time on.
const DotGrid: React.FC = () => {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const DOT_SPACING = 32;
  const DOT_SIZE = 1.4;

  return (
    <View style={styles.dotGridContainer} pointerEvents="none">
      <Svg width={screenWidth} height={screenHeight}>
        {Array.from({ length: Math.ceil(screenHeight / DOT_SPACING) }).map((_, row) =>
          Array.from({ length: Math.ceil(screenWidth / DOT_SPACING) }).map((_, col) => (
            <Circle
              key={`${row}-${col}`}
              cx={col * DOT_SPACING}
              cy={row * DOT_SPACING}
              r={DOT_SIZE}
              fill="#4c6fff"
              opacity={0.12}
            />
          ))
        )}
      </Svg>
    </View>
  );
};

const PlayIcon: React.FC = () => (
  <Svg width={28} height={28} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="12" r="10" fill="rgba(255,255,255,0.2)" />
    <Path d="M10 8L16 12L10 16V8Z" fill="#ffffff" />
  </Svg>
);

const CheckIcon: React.FC<IconProps> = ({ color }) => (
  <Svg width={12} height={12} viewBox="0 0 24 24" fill="none">
    <Path
      d="M20 6L9 17L4 12"
      stroke={color}
      strokeWidth={3}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const LinkIcon: React.FC<IconProps> = ({ color }) => (
  <Svg width={12} height={12} viewBox="0 0 24 24" fill="none">
    <Path
      d="M9 15L15 9M10 6L11 5C12.6569 3.34315 15.3431 3.34315 17 5C18.6569 6.65685 18.6569 9.34315 17 11L16 12M14 18L13 19C11.3431 20.6569 8.65685 20.6569 7 19C5.34315 17.3431 5.34315 14.6569 7 13L8 12"
      stroke={color}
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

// ─── Diagram Placeholder Component ──────────────────────────────────────────

interface DiagramPlaceholderProps {
  color: string;
  label: string;
  title: string;
}

// Dashed border + tint keep this reading as "placeholder, not final artwork" — but the
// glyph inside is the same per-type icon used on the Home grid, so it's a placeholder
// specific to this diagram rather than the generic "image failed to load" convention.
const DiagramPlaceholder: React.FC<DiagramPlaceholderProps> = ({ color, label, title }) => {
  const Icon = DIAGRAM_ICON_MAP[title] ?? GenericDiagramGlyph;
  return (
    <View style={placeholderStyles.container}>
      <View style={[placeholderStyles.imageBox, { backgroundColor: `${color}15`, borderColor: `${color}30` }]}>
        <Icon color={color} />
        <Text style={[placeholderStyles.text, { color }]} numberOfLines={2}>{label}</Text>
      </View>
    </View>
  );
};

const placeholderStyles = StyleSheet.create({
  container: {
    width: '100%',
    flexShrink: 0,
  },
  imageBox: {
    width: '100%',
    maxHeight: 180,
    aspectRatio: 16 / 9,
    borderRadius: 8,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    padding: 8,
  },
  text: {
    fontSize: 10,
    fontWeight: '500',
    textAlign: 'center',
    opacity: 0.8,
  },
});

// ─── Video Player Component ──────────────────────────────────────────────────

interface VideoPlayerProps {
  videoId: string;
  color: string;
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({ videoId, color }) => {
  const [isPlaying, setIsPlaying] = useState(false);

  const handlePlay = () => setIsPlaying(true);

  const embedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=1`;

  if (Platform.OS === 'web') {
    return (
      <View style={videoStyles.container}>
        {!isPlaying ? (
          <TouchableOpacity
            style={[videoStyles.thumbnail, { backgroundColor: `${color}15` }]}
            onPress={handlePlay}
            activeOpacity={0.9}
            accessibilityLabel="Play tutorial video"
            accessibilityRole="button"
          >
            <View style={[videoStyles.playButton, { backgroundColor: color }]}>
              <PlayIcon />
            </View>
            <Text style={[videoStyles.thumbnailText, { color }]}>Watch Tutorial</Text>
          </TouchableOpacity>
        ) : (
          <View style={videoStyles.iframeContainer}>
            <iframe
              width="100%"
              height="100%"
              src={embedUrl}
              title="Tutorial Video"
              frameBorder="0"
              allow="autoplay; encrypted-media"
              allowFullScreen
              style={{ borderRadius: 12 }}
            />
          </View>
        )}
      </View>
    );
  }

  return (
    <View style={videoStyles.container}>
      {!isPlaying ? (
        <TouchableOpacity
          style={[videoStyles.thumbnail, { backgroundColor: `${color}15` }]}
          onPress={handlePlay}
          activeOpacity={0.9}
          accessibilityLabel="Play tutorial video"
          accessibilityRole="button"
        >
          <View style={[videoStyles.playButton, { backgroundColor: color }]}>
            <PlayIcon />
          </View>
          <Text style={[videoStyles.thumbnailText, { color }]}>Watch Tutorial</Text>
        </TouchableOpacity>
      ) : (
        <WebView
          style={videoStyles.webview}
          javaScriptEnabled
          source={{ uri: embedUrl }}
        />
      )}
    </View>
  );
};

// Placeholder video ID shared by every entry in DIAGRAM_CONTENT until real tutorial
// videos are recorded — routes here instead of embedding a real (if unrelated) video.
const VideoOffIcon: React.FC<IconProps> = ({ color }) => (
  <Svg width={28} height={28} viewBox="0 0 24 24" fill="none">
    <Path
      d="M15 10l5-3v10l-5-3M4 6h9a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V8a2 2 0 012-2z"
      stroke={color}
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const VideoComingSoon: React.FC<{ color: string }> = ({ color }) => (
  <View style={[videoStyles.container, videoStyles.comingSoon, { backgroundColor: `${color}15`, borderColor: `${color}30` }]}>
    <VideoOffIcon color={color} />
    <Text style={[videoStyles.thumbnailText, { color }]}>Tutorial video coming soon</Text>
  </View>
);

const videoStyles = StyleSheet.create({
  container: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#1a1f36',
  },
  comingSoon: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
  },
  thumbnail: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  playButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  thumbnailText: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  iframeContainer: {
    flex: 1,
  },
  webview: {
    flex: 1,
  },
});

// ─── Shared Card Shell ────────────────────────────────────────────────────────
// One quiet container recipe reused underneath every content block below, so
// the *content type* (section / step / key point) is what visually differs —
// not three copies of the same "white card + shadow" box.

const cardShell = {
  backgroundColor: '#ffffff',
  borderRadius: 12,
  padding: 20,
  marginBottom: 16,
  borderWidth: 1,
  borderColor: '#eef1f6',
  shadowColor: '#0F172A',
  shadowOffset: { width: 0, height: 1 },
  shadowOpacity: 0.03,
  shadowRadius: 6,
  elevation: 1,
} as const;

// ─── Section Card Component ──────────────────────────────────────────────────
// Marker is a small square "node" rather than a full-height colored bar —
// a nod to the diagram nodes this app is actually about, used with restraint.

interface SectionCardProps {
  heading: string;
  body: string;
  color: string;
}

const SectionCard: React.FC<SectionCardProps> = ({ heading, body, color }) => (
  <View style={sectionStyles.card}>
    <View style={sectionStyles.markerRow}>
      <View style={[sectionStyles.node, { borderColor: color }]}>
        <View style={[sectionStyles.nodeDot, { backgroundColor: color }]} />
      </View>
      <Text style={[sectionStyles.heading, { color }]}>{heading}</Text>
    </View>
    <Text style={sectionStyles.body}>{body}</Text>
  </View>
);

const sectionStyles = StyleSheet.create({
  card: {
    ...cardShell,
  },
  markerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  node: {
    width: 16,
    height: 16,
    borderRadius: 4,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  nodeDot: {
    width: 6,
    height: 6,
    borderRadius: 1.5,
  },
  heading: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.2,
    textTransform: 'uppercase',
  },
  body: {
    fontSize: 15,
    color: '#334155',
    lineHeight: 24,
  },
});

// ─── Steps List Component ────────────────────────────────────────────────────
// Same node motif as SectionCard, but chained with a connecting line — since
// steps are genuinely sequential, the line is information, not decoration.

interface StepsListProps {
  steps: string[];
  color: string;
}

const StepsList: React.FC<StepsListProps> = ({ steps, color }) => (
  <View style={stepsStyles.container}>
    <Text style={[stepsStyles.title, { color }]}>Step-by-Step Process</Text>
    {steps.map((step, index) => (
      <View key={index} style={stepsStyles.stepRow}>
        <View style={stepsStyles.stepMarkerCol}>
          <View style={[stepsStyles.stepNode, { borderColor: color }]}>
            <Text style={[stepsStyles.stepNumberText, { color }]}>{index + 1}</Text>
          </View>
          {index < steps.length - 1 && (
            <View style={[stepsStyles.connector, { backgroundColor: `${color}30` }]} />
          )}
        </View>
        <Text style={stepsStyles.stepText}>{step}</Text>
      </View>
    ))}
  </View>
);

const stepsStyles = StyleSheet.create({
  container: {
    ...cardShell,
  },
  title: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.2,
    textTransform: 'uppercase',
    marginBottom: 18,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
  },
  stepMarkerCol: {
    alignItems: 'center',
    flexShrink: 0,
  },
  stepNode: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  connector: {
    width: 1.5,
    flex: 1,
    minHeight: 18,
    marginVertical: 4,
  },
  stepNumberText: {
    fontSize: 11,
    fontWeight: '700',
  },
  stepText: {
    flex: 1,
    fontSize: 15,
    color: '#334155',
    lineHeight: 24,
    paddingBottom: 18,
  },
});

// ─── Key Points Component ────────────────────────────────────────────────────
// Deliberately the odd one out: no node/sequence marker, because these points
// aren't ordered. A plain hairline check keeps it visually distinct from the
// sequential blocks above instead of repeating their motif by default.

interface KeyPointsProps {
  points: string[];
  color: string;
}

const KeyPoints: React.FC<KeyPointsProps> = ({ points, color }) => (
  <View style={keyPointsStyles.container}>
    <Text style={[keyPointsStyles.title, { color }]}>Key Points to Remember</Text>
    {points.map((point, index) => (
      <View key={index} style={keyPointsStyles.row}>
        <View style={[keyPointsStyles.icon, { borderColor: color }]}>
          <CheckIcon color={color} />
        </View>
        <Text style={keyPointsStyles.text}>{point}</Text>
      </View>
    ))}
  </View>
);

const keyPointsStyles = StyleSheet.create({
  container: {
    ...cardShell,
  },
  title: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.2,
    textTransform: 'uppercase',
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 12,
  },
  icon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
    marginTop: 1,
  },
  text: {
    flex: 1,
    fontSize: 15,
    color: '#334155',
    lineHeight: 24,
  },
});

// ─── References Component ───────────────────────────────────────────────────
// Rows are pressable rather than plain text since these are meant to be
// followed, not just read — tapping opens the link in the device browser.

interface ReferencesProps {
  links: ReferenceLink[];
  color: string;
}

const References: React.FC<ReferencesProps> = ({ links, color }) => (
  <View style={referencesStyles.container}>
    <Text style={[referencesStyles.title, { color }]}>References</Text>
    {links.map((link, index) => (
      <TouchableOpacity
        key={index}
        style={referencesStyles.row}
        onPress={() => Linking.openURL(link.url)}
        activeOpacity={0.6}
      >
        <View style={[referencesStyles.icon, { borderColor: color }]}>
          <LinkIcon color={color} />
        </View>
        <Text style={[referencesStyles.text, { color }]} numberOfLines={1}>
          {link.label}
        </Text>
      </TouchableOpacity>
    ))}
  </View>
);

const referencesStyles = StyleSheet.create({
  container: {
    ...cardShell,
  },
  title: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.2,
    textTransform: 'uppercase',
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  icon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  text: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
});

// ─── Shapes Used Component (UML diagrams only) ──────────────────────────────
// A gallery-and-detail pattern rather than an accordion per shape: badges
// stagger in on mount, a tap bounces that badge and crossfades the shared
// detail pane below rather than pushing the grid around — keeps the tap
// target small while the payoff (reading what the shape means) stays legible.

interface ShapesUsedProps {
  shapes: ShapeUsed[];
  color: string;
  lightColor: string;
}

const ShapesUsed: React.FC<ShapesUsedProps> = ({ shapes, color, lightColor }) => {
  const [selected, setSelected] = useState(0);
  const detailOpacity = useRef(new Animated.Value(1)).current;
  const detailTranslate = useRef(new Animated.Value(0)).current;
  const badgeAnims = useRef(shapes.map(() => new Animated.Value(0))).current;
  const pressAnims = useRef(shapes.map(() => new Animated.Value(1))).current;

  useEffect(() => {
    Animated.stagger(
      55,
      badgeAnims.map((v) =>
        Animated.timing(v, {
          toValue: 1,
          duration: 380,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        })
      )
    ).start();
    // Runs once on mount only — badgeAnims is a stable ref array.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectShape = (index: number) => {
    if (index === selected) return;
    Animated.timing(detailOpacity, {
      toValue: 0,
      duration: 110,
      useNativeDriver: true,
    }).start(() => {
      setSelected(index);
      detailTranslate.setValue(8);
      Animated.parallel([
        Animated.timing(detailOpacity, {
          toValue: 1,
          duration: 220,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(detailTranslate, {
          toValue: 0,
          duration: 220,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();
    });
  };

  const pressIn = (index: number) => {
    Animated.spring(pressAnims[index], {
      toValue: 0.88,
      useNativeDriver: true,
      speed: 30,
      bounciness: 6,
    }).start();
  };

  const pressOut = (index: number) => {
    Animated.spring(pressAnims[index], {
      toValue: 1,
      useNativeDriver: true,
      speed: 20,
      bounciness: 8,
    }).start();
  };

  const active = shapes[selected];

  return (
    <View style={shapesUsedStyles.container}>
      <Text style={[shapesUsedStyles.title, { color }]}>Shapes Used</Text>
      <Text style={shapesUsedStyles.subtitle}>Tap a shape to see what it means</Text>

      <View style={shapesUsedStyles.grid}>
        {shapes.map((shape, index) => {
          const isActive = index === selected;
          return (
            <Animated.View
              key={shape.name}
              style={{
                opacity: badgeAnims[index],
                transform: [
                  {
                    translateY: badgeAnims[index].interpolate({
                      inputRange: [0, 1],
                      outputRange: [14, 0],
                    }),
                  },
                  {
                    scale: badgeAnims[index].interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.85, 1],
                    }),
                  },
                ],
              }}
            >
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => selectShape(index)}
                onPressIn={() => pressIn(index)}
                onPressOut={() => pressOut(index)}
                style={shapesUsedStyles.tile}
              >
                <Animated.View
                  style={[
                    shapesUsedStyles.badge,
                    {
                      backgroundColor: isActive ? color : lightColor,
                      borderColor: color,
                      transform: [{ scale: pressAnims[index] }],
                    },
                  ]}
                >
                  <ShapeIcon
                    name={shape.svgComponent}
                    width={34}
                    height={22}
                    color={isActive ? '#ffffff' : color}
                    fillColor={isActive ? color : '#ffffff'}
                  />
                </Animated.View>
                <Text
                  style={[
                    shapesUsedStyles.tileLabel,
                    isActive && { color, fontWeight: '700' },
                  ]}
                  numberOfLines={1}
                >
                  {shape.name}
                </Text>
              </TouchableOpacity>
            </Animated.View>
          );
        })}
      </View>

      <Animated.View
        style={[
          shapesUsedStyles.detail,
          {
            borderColor: `${color}30`,
            backgroundColor: lightColor,
            opacity: detailOpacity,
            transform: [{ translateY: detailTranslate }],
          },
        ]}
      >
        <View style={[shapesUsedStyles.detailIcon, { borderColor: color }]}>
          <ShapeIcon name={active.svgComponent} width={28} height={18} color={color} fillColor="#ffffff" />
        </View>
        <View style={shapesUsedStyles.detailTextWrap}>
          <Text style={[shapesUsedStyles.detailName, { color }]}>{active.name}</Text>
          <Text style={shapesUsedStyles.detailDescription}>{active.description}</Text>
        </View>
      </Animated.View>
    </View>
  );
};

const shapesUsedStyles = StyleSheet.create({
  container: {
    ...cardShell,
  },
  title: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.2,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: '#94a3b8',
    marginBottom: 18,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 14,
    marginBottom: 20,
  },
  tile: {
    alignItems: 'center',
    width: 74,
  },
  badge: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  tileLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
    textAlign: 'center',
  },
  detail: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
  },
  detailIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1.5,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  detailTextWrap: {
    flex: 1,
  },
  detailName: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  detailDescription: {
    fontSize: 14,
    color: '#334155',
    lineHeight: 21,
  },
});

// ─── Learning Feedback Form Component (both UML and SDLC diagrams) ──────────

interface FeedbackFormProps {
  color: string;
  diagramType: 'UML' | 'SDLC';
  diagramId: number;
  diagramTitle: string;
}

// Matches the backend's MAX_MESSAGE_LENGTH (feedbackController.js) — enforced
// here too via TextInput's maxLength so the counter and the actual cap the
// server will accept never disagree.
const MAX_FEEDBACK_LENGTH = 2000;
// Counter turns warning-colored once there's this little room left, so it
// reads as "you're about to hit the limit" rather than only announcing it
// after the fact.
const FEEDBACK_LENGTH_WARNING_THRESHOLD = 200;

const LearningFeedbackForm: React.FC<FeedbackFormProps> = ({ color, diagramType, diagramId, diagramTitle }) => {
  const [feedback, setFeedback] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Persistent inline confirmation (separate from the Alert popup) so the
  // "yes, this actually went through" reassurance is still visible after the
  // user dismisses the alert and keeps scrolling — not just a one-off popup.
  const [justSubmitted, setJustSubmitted] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const handleChangeText = (text: string) => {
    setFeedback(text);
    if (justSubmitted) setJustSubmitted(false); // writing new feedback retires the old confirmation
  };

  const handleSubmit = async () => {
    if (isSubmitting) return;

    if (!feedback.trim()) {
      Alert.alert(
        'Empty Response',
        'Please write something about what you learned.',
        [{ text: 'OK' }]
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const API_URL = API_BASE_URL || 'https://igraph-backend.onrender.com';
      const response = await authService.authFetch(`${API_URL}/api/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          diagramId,
          diagramTitle,
          diagramType,
          message: feedback,
        }),
      });

      const result = await response.json().catch(() => null);

      if (!response.ok || !result?.success) {
        Alert.alert(
          'Couldn’t Submit Feedback',
          result?.message || 'Something went wrong on our end. Please try again.',
          [{ text: 'OK' }]
        );
        return; // keep what they wrote — don't make them retype it
      }

      Alert.alert(
        'Thank You!',
        'Your feedback has been submitted successfully.',
        [{ text: 'OK' }]
      );
      setFeedback('');
      setJustSubmitted(true);
    } catch (error: any) {
      Alert.alert(
        'Network Error',
        'Could not reach the server. Please check your connection and try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const question = diagramType === 'SDLC' ? 'What did you learn in this SDLC?' : 'What did you learn in this diagram?';
  const charsRemaining = MAX_FEEDBACK_LENGTH - feedback.length;
  const isNearLimit = charsRemaining <= FEEDBACK_LENGTH_WARNING_THRESHOLD;

  return (
    <View style={feedbackStyles.container}>
      <Text style={[feedbackStyles.title, { color }]}>
        {question}
      </Text>
      <TextInput
        style={[feedbackStyles.input, { borderColor: '#e2e8f0' }]}
        placeholder="Share your learning experience..."
        placeholderTextColor="#94a3b8"
        multiline
        numberOfLines={4}
        value={feedback}
        onChangeText={handleChangeText}
        textAlignVertical="top"
        editable={!isSubmitting}
        maxLength={MAX_FEEDBACK_LENGTH}
      />
      <Text
        style={[
          feedbackStyles.charCount,
          isNearLimit && feedbackStyles.charCountWarning,
        ]}
      >
        {feedback.length} / {MAX_FEEDBACK_LENGTH}
      </Text>
      <TouchableOpacity
        style={[
          feedbackStyles.submitButton,
          { backgroundColor: color },
          isHovered && feedbackStyles.submitButtonHovered,
          isSubmitting && feedbackStyles.submitButtonDisabled,
        ]}
        onPress={handleSubmit}
        activeOpacity={0.8}
        disabled={isSubmitting}
        // @ts-ignore - React Native Web specific props
        onMouseEnter={() => setIsHovered(true)}
        // @ts-ignore
        onMouseLeave={() => setIsHovered(false)}
      >
        <Text style={feedbackStyles.submitButtonText}>{isSubmitting ? 'Submitting…' : 'Submit'}</Text>
      </TouchableOpacity>
      {justSubmitted && (
        <View style={feedbackStyles.successRow}>
          <View style={[feedbackStyles.successIcon, { borderColor: color, backgroundColor: `${color}15` }]}>
            <CheckIcon color={color} />
          </View>
          <Text style={[feedbackStyles.successText, { color }]}>Feedback submitted — thank you!</Text>
        </View>
      )}
    </View>
  );
};

const feedbackStyles = StyleSheet.create({
  container: {
    ...cardShell,
    gap: 16,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.1,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 16,
    fontSize: 15,
    color: '#334155',
    backgroundColor: '#f8faff',
    minHeight: 120,
  },
  // Pulled up against the input (negative margin fights the container's
  // gap:16) so it reads as "belongs to the field above it", not as its own
  // separate row — the same tight relationship a native char-counter has.
  charCount: {
    marginTop: -8,
    alignSelf: 'flex-end',
    fontSize: 12,
    color: '#94a3b8',
  },
  charCountWarning: {
    color: '#ef4444',
    fontWeight: '600',
  },
  submitButton: {
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      web: { transitionProperty: 'opacity, box-shadow', transitionDuration: '150ms' },
    }),
  },
  // Same opacity-dim language as ReferenceCard's/SavedDiagramCard's pressed
  // state — works with any of the per-diagram-type colors without needing a
  // hand-tuned shade per color.
  submitButtonHovered: {
    opacity: 0.92,
    ...Platform.select({
      web: { boxShadow: '0 4px 12px rgba(15, 23, 42, 0.15)' },
    }),
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: 0.3,
  },
  successRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  successIcon: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  successText: {
    fontSize: 14,
    fontWeight: '600',
  },
});

// ─── Helper Hook: useDiagramParams ───────────────────────────────────────────

const useDiagramParams = () => {
  const params = useLocalSearchParams();
  const rawId = params.id;
  return Array.isArray(rawId) ? rawId[0] : rawId;
};

// ─── Main Screen Component ───────────────────────────────────────────────────

const DiagramDetail: React.FC = () => {
  const id = useDiagramParams();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const scrollY = useRef(new Animated.Value(0)).current;

  const isDesktop = width >= BREAKPOINTS.desktop;
  const isTablet = width >= BREAKPOINTS.tablet;

  const diagramId = parseInt(id ?? '1', 10);
  const content = DIAGRAM_CONTENT[diagramId];
  const colors = content ? TYPE_CONFIG[content.type] : TYPE_CONFIG.UML;
  const hasRealVideo = content ? content.videoId !== PLACEHOLDER_VIDEO_ID : false;

  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 80],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });
  // Paired with the opacity fade so the header settles into place rather
  // than just materializing — a small slide-down reads as more deliberate
  // than opacity alone.
  const headerTranslateY = scrollY.interpolate({
    inputRange: [0, 80],
    outputRange: [-8, 0],
    extrapolate: 'clamp',
  });

  // The floating header fades in via opacity, but opacity alone doesn't stop
  // touches in React Native — while invisible (scrollY < 80) it still sits on
  // top of the hero back button and swallows taps. Track visibility in state
  // so we can set pointerEvents="none" until it's actually shown.
  const [isHeaderVisible, setIsHeaderVisible] = useState(false);

  useEffect(() => {
    const listenerId = scrollY.addListener(({ value }) => {
      setIsHeaderVisible((prev) => {
        const next = value >= 80;
        return prev === next ? prev : next;
      });
    });
    return () => scrollY.removeListener(listenerId);
  }, [scrollY]);

  // Always navigate back to the home screen
  const handleGoHome = () => {
    router.replace('/(tabs)/home');
  };

  const handleScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
    { useNativeDriver: true }
  );

  if (!content) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Diagram not found.</Text>
        <TouchableOpacity onPress={handleGoHome} style={styles.backBtn}>
          <Text style={[styles.backBtnText, { color: colors.primary }]}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Desktop: sticky sidebar with just the video (NO diagram preview). Key Points and
  // the feedback form live in the main column below, in the same order as mobile —
  // see renderDesktopContent — since "Key Points to Remember" reads as a recap of
  // what was just read, not a preview to show before the sections.
  const renderDesktopSidebar = () => {
    if (!isDesktop) return null;

    return (
      <View style={[styles.sidebar, styles.sidebarDesktop]}>
        <View nativeID="tour-detail-video" style={styles.videoWrap}>
          <Text style={[styles.sectionLabel, { color: colors.primary }]}>Video Tutorial</Text>
          {hasRealVideo ? (
            <VideoPlayer videoId={content.videoId} color={colors.primary} />
          ) : (
            <VideoComingSoon color={colors.primary} />
          )}
        </View>
      </View>
    );
  };

  // Desktop: main content column — same order as mobile (Sections, Shapes
  // Used, Steps, Key Points, Feedback, References) so the two layouts tell
  // the same story, not just the same words.
  const renderDesktopContent = () => {
    if (!isDesktop) return null;

    return (
      <View style={styles.contentColumnDesktop}>
        {content.sections.map((section, i) => (
          <SectionCard
            key={`section-${i}`}
            heading={section.heading}
            body={section.body}
            color={colors.primary}
          />
        ))}

        {content.shapesUsed && content.shapesUsed.length > 0 && (
          <View nativeID="tour-detail-shapes-used">
            <ShapesUsed
              // This screen persists across diagram navigation (see comment
              // near startNewDiagram) rather than unmounting, but ShapesUsed
              // caches its per-shape Animated.Value arrays in a useRef that
              // only ever sizes itself once. Keying on the diagram id forces a
              // real remount whenever the diagram (and its shape count/order)
              // changes, instead of reusing stale arrays sized for a different
              // diagram's shape list and indexing past their end.
              key={content.id}
              shapes={content.shapesUsed}
              color={colors.primary}
              lightColor={colors.light}
            />
          </View>
        )}

        {content.steps && (
          <StepsList steps={content.steps} color={colors.primary} />
        )}

        {content.keyPoints && (
          <KeyPoints points={content.keyPoints} color={colors.primary} />
        )}

        <LearningFeedbackForm
          color={colors.primary}
          diagramType={content.type}
          diagramId={content.id}
          diagramTitle={content.title}
        />

        {content.references && content.references.length > 0 && (
          <References links={content.references} color={colors.primary} />
        )}
      </View>
    );
  };

  // Mobile/Tablet: single column layout
  const renderMobileContent = () => {
    if (isDesktop) return null;

    return (
      <View style={styles.contentColumn}>
        {content.sections.map((section, i) => (
          <SectionCard
            key={`section-${i}`}
            heading={section.heading}
            body={section.body}
            color={colors.primary}
          />
        ))}

        {content.shapesUsed && content.shapesUsed.length > 0 && (
          <View nativeID="tour-detail-shapes-used">
            <ShapesUsed
              // This screen persists across diagram navigation (see comment
              // near startNewDiagram) rather than unmounting, but ShapesUsed
              // caches its per-shape Animated.Value arrays in a useRef that
              // only ever sizes itself once. Keying on the diagram id forces a
              // real remount whenever the diagram (and its shape count/order)
              // changes, instead of reusing stale arrays sized for a different
              // diagram's shape list and indexing past their end.
              key={content.id}
              shapes={content.shapesUsed}
              color={colors.primary}
              lightColor={colors.light}
            />
          </View>
        )}

        {content.steps && (
          <StepsList steps={content.steps} color={colors.primary} />
        )}

        {content.keyPoints && (
          <KeyPoints points={content.keyPoints} color={colors.primary} />
        )}

        <LearningFeedbackForm
          color={colors.primary}
          diagramType={content.type}
          diagramId={content.id}
          diagramTitle={content.title}
        />

        {content.references && content.references.length > 0 && (
          <References links={content.references} color={colors.primary} />
        )}
      </View>
    );
  };

  return (
    <View style={styles.root}>
      <DotGrid />
      <StatusBar barStyle="dark-content" />

      <Animated.View
        pointerEvents={isHeaderVisible ? 'auto' : 'none'}
        style={[
          styles.floatingBar,
          {
            opacity: headerOpacity,
            borderBottomColor: `${colors.primary}20`,
            transform: [{ translateY: headerTranslateY }],
          },
        ]}>
        <BackButton onPress={handleGoHome} />
        <Text
          style={[styles.floatingTitle, { color: '#1a1f36' }]}
          numberOfLines={1}
        >
          {content.title}
        </Text>
      </Animated.View>

      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        contentContainerStyle={[
          styles.scrollContent,
          isDesktop && styles.scrollContentDesktop,
        ]}
      >
        {/* Hero Section with Title, Tagline, Diagram, and Video */}
        <View nativeID="tour-detail-hero" style={[styles.hero, { backgroundColor: colors.light }]}>
          <BackButton onPress={handleGoHome} style={styles.heroBackBtnPosition} />

          <View style={styles.heroContent}>
            <View style={styles.titleStack}>
              <Text style={[
                styles.heroTitle,
                isTablet && styles.heroTitleTablet,
                isDesktop && styles.heroTitleDesktop,
              ]}>
                {content.title}
              </Text>
              <Text style={styles.heroTagline}>{content.tagline}</Text>
            </View>
            
            {/* Diagram preview — only once in hero */}
            <View nativeID="tour-detail-image">
              {content.placeholderImage ? (
                <Image
                  source={content.placeholderImage}
                  style={styles.heroImage}
                  accessibilityLabel={content.imageAlt}
                  resizeMode="contain"
                />
              ) : (
                <DiagramPlaceholder color={colors.primary} label={content.imageAlt} title={content.title} />
              )}
            </View>

            {/* Video directly below diagram on mobile/tablet only */}
            {!isDesktop && (
              <View nativeID="tour-detail-video" style={styles.videoWrap}>
                <Text style={[styles.sectionLabel, { color: colors.primary }]}>Video Tutorial</Text>
                {hasRealVideo ? (
                  <VideoPlayer videoId={content.videoId} color={colors.primary} />
                ) : (
                  <VideoComingSoon color={colors.primary} />
                )}
              </View>
            )}
          </View>
        </View>

        {/* Body Section */}
        <View style={[
          styles.body,
          isDesktop ? styles.bodyDesktop : styles.bodyMobile,
          isTablet && !isDesktop && styles.bodyTablet,
        ]}>
          {renderDesktopSidebar()}
          {renderMobileContent()}
          {renderDesktopContent()}
        </View>
      </Animated.ScrollView>
    </View>
  );
};

export default DiagramDetail;

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#f8faff',
  },
  dotGridContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
  },
  floatingBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 52 : 12,
    paddingBottom: 12,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(248, 250, 255, 0.96)',
    borderBottomWidth: 1,
    gap: 10,
    ...Platform.select({
      web: { backdropFilter: 'blur(12px)' },
    }),
  },
  // Shared visual recipe for both back buttons (BackButton component) — one
  // definition instead of two identical copies that could silently drift.
  backButtonBase: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F1F5F9',
    ...Platform.select({
      ios: {
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
      },
      android: {
        elevation: 1,
      },
      web: {
        transitionProperty: 'border-color, box-shadow',
        transitionDuration: '150ms',
      },
    }),
  },
  // Same border-tint + lifted shadow language as ReferenceCard's/
  // SavedDiagramCard's hover state, so hovering feels like the same system.
  backButtonHovered: {
    borderColor: '#c7d2fe',
    ...Platform.select({
      web: { boxShadow: '0 2px 8px rgba(15, 23, 42, 0.1)' },
    }),
  },
  floatingTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: '#1a1f36',
  },
  hero: {
    paddingTop: Platform.OS === 'ios' ? 60 : 24,
    paddingBottom: 28,
    paddingHorizontal: 24,
  },
  heroBackBtnPosition: {
    marginBottom: 24,
    alignSelf: 'flex-start',
  },
  heroContent: {
    gap: 24,
  },
  titleStack: {
    gap: 8,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1a1f36',
    lineHeight: 36,
    letterSpacing: -0.5,
  },
  heroTitleTablet: {
    fontSize: 32,
    lineHeight: 40,
  },
  heroTitleDesktop: {
    fontSize: 36,
    lineHeight: 44,
  },
  heroTagline: {
    fontSize: 15,
    color: '#64748b',
    lineHeight: 22,
  },
  heroImage: {
    width: '100%',
    maxHeight: 180,
    borderRadius: 8,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 48,
  },
  scrollContentDesktop: {
    maxWidth: BREAKPOINTS.maxContentWidth,
    alignSelf: 'center',
    width: '100%',
  },
  body: {
    padding: 16,
  },
  bodyMobile: {
    flexDirection: 'column',
    gap: 0,
  },
  bodyTablet: {
    paddingHorizontal: 24,
  },
  bodyDesktop: {
    flexDirection: 'row',
    gap: 32,
    paddingHorizontal: 32,
    paddingTop: 24,
    alignItems: 'flex-start',
  },
  sidebar: {
    gap: 20,
  },
  sidebarDesktop: {
    width: 380,
    flexShrink: 0,
    position: Platform.OS === 'web' ? 'sticky' : 'relative',
    top: 90,
    alignSelf: 'flex-start',
  },
  contentColumn: {
    gap: 0,
  },
  contentColumnDesktop: {
    flex: 1,
  },
  videoWrap: {
    gap: 12,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    backgroundColor: '#f8faff',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#475569',
    fontWeight: '500',
  },
  backBtn: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#eef2ff',
  },
  backBtnText: {
    fontSize: 15,
    fontWeight: '600',
  },
});