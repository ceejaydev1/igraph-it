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
  // Split out of `sections` on purpose — see ProsConsCard's comment — so
  // advantages/disadvantages get their own scannable two-list layout
  // instead of being blended into one prose paragraph like the other
  // sections.
  advantages?: string[];
  disadvantages?: string[];
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
    { name: 'Fork', description: 'A bar splitting one flow into several paths that run in parallel.', svgComponent: 'UMLForkShape' },
    { name: 'Join', description: 'A bar where multiple parallel paths synchronize back into a single flow.', svgComponent: 'UMLJoinShape' },
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

// Real, researched content (everything except the video, which stays the
// shared placeholder), sourced from Tutorialspoint's Waterfall write-up and
// the DEV Community/GitHub/ScienceDirect pieces on the Sashimi ("modified
// waterfall") model specifically; see the References list below for the
// same links.
const MODIFIED_WATERFALL_CONTENT: DiagramContent = {
  id: 12,
  title: 'Modified Waterfall Model',
  type: 'SDLC',
  tagline: "A Waterfall variant that lets adjacent phases overlap so problems surface before final testing, not after.",
  videoId: PLACEHOLDER_VIDEO_ID,
  imageAlt: 'Modified Waterfall Model diagram',
  placeholderImage: require('../../../assets/diagram library/Modified Waterfall.png'),
  sections: [
    {
      heading: 'What It Is',
      body: "The Modified Waterfall Model, also known as the Sashimi Model (named after the Japanese dish of overlapping sliced fish), is a variation of the classic Waterfall model that lets adjacent phases overlap and feed information back into one another, instead of requiring each phase to finish completely before the next begins. It keeps Waterfall's same five phases and overall structure, but loosens the strict hand-off between them so work can start earlier and issues can be caught sooner.",
    },
    {
      heading: 'When to Use It',
      body: "It works well for projects with reasonably well-understood requirements that still carry some complexity or uncertainty, where a team wants Waterfall's planning discipline but needs enough flexibility to react to problems as they're found. It's a poor fit for very small, fully-defined projects (plain Waterfall is simpler there) and for projects where requirements are expected to change significantly, which suit iterative or Agile approaches better.",
    },
  ],
  advantages: [
    'Overlapping phases let defects found during design or development be corrected right away instead of waiting for formal testing at the end.',
    'Running phases concurrently shortens the overall timeline and lowers cost compared to strict sequential Waterfall.',
    "Keeps most of Waterfall's structure and documentation discipline, so it stays easier to plan and manage than fully iterative models.",
    'A stable team that carries context across overlapping phases can get away with less formal hand-off documentation between stages.',
  ],
  disadvantages: [
    'Overlapping phases blur clear milestones, making it harder to measure exactly how much progress has been made.',
    'Parallel work across phases raises the risk of miscommunication and mismatched assumptions between teams.',
    'Still struggles to absorb major requirement changes once phases are underway, which is the same core limitation as classic Waterfall.',
    'Needs more coordination and communication overhead than a strictly sequential process.',
  ],
  steps: [
    'Requirements Gathering & Analysis: define what the system needs to do before design work begins.',
    'System Design: architecture and design start while requirements are still being finalized, using the overlap to adjust early.',
    'Implementation: coding begins on stable modules before the full design is signed off, instead of waiting for every design decision to lock.',
    'Verification & Testing: testing starts on completed modules while later modules are still being built.',
    'Deployment & Maintenance: release the system, support it, and feed lessons learned back wherever the process still allows it.',
  ],
  keyPoints: [
    'Also called the Sashimi Model, named after the Japanese dish of overlapping sliced fish, because the phases overlap the same way.',
    'Uses the same five phases as classic Waterfall, just without requiring each one to fully finish before the next starts.',
    'Its main purpose is catching defects earlier by feeding information back between overlapping phases.',
    'A middle ground between rigid Waterfall and fully iterative or Agile approaches.',
  ],
  references: [
    { label: 'SDLC Waterfall Model (Tutorialspoint)', url: 'https://www.tutorialspoint.com/sdlc/sdlc_waterfall_model.htm' },
    { label: 'Sashimi (Modified Waterfall) Model (DEV Community)', url: 'https://dev.to/aatmaj/sashimi-waterfall-model-of-development-574o' },
    { label: 'Waterfall Model Definition (TechTarget)', url: 'https://www.techtarget.com/searchsoftwarequality/definition/waterfall-model' },
    { label: 'Sashimi Waterfall Model of Development (GitHub)', url: 'https://github.com/WonderPro/Best-Programming-Principles/blob/main/Sashimi%20Waterfall%20model%20of%20development.md' },
    { label: 'Waterfall Model: An Overview (ScienceDirect)', url: 'https://www.sciencedirect.com/topics/computer-science/waterfall-model' },
  ],
};

// Real, researched content (everything except the video), sourced from
// Visual Paradigm, GeeksforGeeks, IBM Developer, Miro, and Creately's
// sequence-diagram guides; see the References list below for the same
// links.
const SEQUENCE_DIAGRAM_CONTENT: DiagramContent = {
  id: 9,
  title: 'Sequence Diagram',
  type: 'UML',
  tagline: 'Shows the order messages pass between objects over time, read top to bottom.',
  videoId: PLACEHOLDER_VIDEO_ID,
  imageAlt: 'Sequence Diagram example',
  sections: [
    {
      heading: 'What It Is',
      body: 'A UML Sequence Diagram is an interaction diagram that shows how objects communicate with each other over time. Each participant gets a vertical lifeline running down the page, and horizontal arrows between lifelines represent the messages exchanged, read from top to bottom in the order they occur.',
    },
    {
      heading: 'When to Use It',
      body: "It's the right choice when you need to work out the detailed logic of a single scenario or use case (how a login attempt actually flows between the UI, the server, and the database, for example) rather than the system's overall static structure. It's especially useful for planning a complex operation before writing code, or for documenting an existing one so the team shares the same understanding of how it behaves.",
    },
  ],
  advantages: [
    'Gives every stakeholder a shared, visual picture of how a scenario actually behaves, which speeds up troubleshooting and onboarding.',
    'Makes the exact order of messages and calls explicit, so timing and dependency issues are easier to spot before they become bugs.',
    'Works well for planning a complex operation before writing any code, catching logic gaps early.',
    'Reads intuitively top to bottom, so even people unfamiliar with UML notation can generally follow the flow.',
  ],
  disadvantages: [
    'Every new participant has to be added along the horizontal edge, so diagrams with many objects quickly run out of horizontal space.',
    "Doesn't capture the system's static structure, so you still need a class diagram or similar to see how objects relate outside this one scenario.",
    'Can get cluttered fast for scenarios with lots of branching or looping logic.',
    'Describes what happens in one specific flow, not precise rules for every possible behavior.',
  ],
  steps: [
    "Identify the scenario or use case you're modeling and the objects or actors involved.",
    "Place a lifeline across the top for each participant, in the order they'll be referenced.",
    'Draw horizontal arrows between lifelines for each message, top to bottom, in the order they actually occur.',
    'Add activation bars on lifelines to show when an object is actively processing a message.',
    'Mark any return messages, loops, or conditional branches to complete the flow.',
  ],
  keyPoints: [
    'Vertical lifelines represent participants; horizontal arrows represent the messages between them.',
    "Time flows top to bottom: the vertical axis is literally the sequence in 'sequence diagram'.",
    "Best for one specific scenario's detailed logic, not the system's overall structure.",
    'Complements a class diagram rather than replacing it: one shows behavior, the other shows structure.',
  ],
  references: [
    { label: 'What is Sequence Diagram? (Visual Paradigm)', url: 'https://www.visual-paradigm.com/guide/uml-unified-modeling-language/what-is-sequence-diagram/' },
    { label: 'Sequence Diagrams, Unified Modeling Language (GeeksforGeeks)', url: 'https://www.geeksforgeeks.org/system-design/unified-modeling-language-uml-sequence-diagrams/' },
    { label: 'Explore the UML Sequence Diagram (IBM Developer)', url: 'https://developer.ibm.com/articles/the-sequence-diagram/' },
    { label: 'What is a UML Sequence Diagram? Ultimate Guide (Miro)', url: 'https://miro.com/diagramming/what-is-a-uml-sequence-diagram/' },
    { label: 'Sequence Diagram Tutorial (Creately)', url: 'https://creately.com/guides/sequence-diagram-tutorial/' },
  ],
  shapesUsed: SHAPES_BY_TITLE['Sequence Diagram'] || [],
};

// Real, researched content (everything except the video), sourced from
// GeeksforGeeks, Visual Paradigm, IONOS, Educba, and Slickplan's class-diagram
// guides; see the References list below for the same links.
const CLASS_DIAGRAM_CONTENT: DiagramContent = {
  id: 10,
  title: 'Class Diagram',
  type: 'UML',
  tagline: "Maps a system's classes, attributes, and relationships into one static structural view.",
  videoId: PLACEHOLDER_VIDEO_ID,
  imageAlt: 'Class Diagram example',
  sections: [
    {
      heading: 'What It Is',
      body: "A UML Class Diagram is a structural diagram that maps out a system's classes, their attributes and operations, and the relationships between them. Unlike a sequence diagram, it shows what a system is made of rather than how it behaves over time. It's a static blueprint of the system's object-oriented structure.",
    },
    {
      heading: 'When to Use It',
      body: "It's most useful early in object-oriented design, for turning requirements into a concrete structure of classes and relationships before writing code, and later as living documentation of how the codebase is organized. It's less useful for explaining how a specific process unfolds step by step, since that's what a sequence or activity diagram is for.",
    },
  ],
  advantages: [
    'Simplifies the design of complex software by mapping it directly onto object-oriented concepts like classes and inheritance.',
    "Condenses an entire system's structure into a small number of diagrams, cutting down how much needs to be explained in prose.",
    "Gives a shared reference point for developers, architects, and other stakeholders discussing the system's design.",
    'Maps closely to actual object-oriented code, making it a practical guide for implementation, not just documentation.',
  ],
  disadvantages: [
    'Large or deeply nested systems can produce diagrams that are hard to document and keep up to date.',
    'The similarity between relationship types (association, aggregation, composition) can make diagrams genuinely confusing to read correctly.',
    'Shows structure only, so you still need another diagram type to capture how the system behaves over time.',
    "Can fall out of sync with the actual codebase if it isn't maintained alongside ongoing changes.",
  ],
  steps: [
    'Identify the classes from the requirements: nouns are usually potential classes, verbs are usually potential methods.',
    "List each class's key attributes and operations.",
    'Draw each class as a rectangle divided into name, attributes, and operations.',
    'Connect classes with the relationship that actually applies: association, aggregation, composition, or inheritance.',
    'Add multiplicity to each relationship to show how many instances relate to how many others.',
  ],
  keyPoints: [
    'A structural (static) diagram: it shows what the system is made of, not how it behaves over time.',
    'Each class box has three sections: name, attributes, and operations.',
    'Getting the relationship types right (association vs. aggregation vs. composition) matters more than it looks, since they mean different things.',
    'Maps closely enough to real code that it can double as a construction guide, not just a planning artifact.',
  ],
  references: [
    { label: 'UML Class Diagram (GeeksforGeeks)', url: 'https://www.geeksforgeeks.org/system-design/unified-modeling-language-uml-class-diagrams/' },
    { label: 'UML Class Diagram Tutorial (Visual Paradigm)', url: 'https://www.visual-paradigm.com/guide/uml-unified-modeling-language/uml-class-diagram-tutorial/' },
    { label: 'Create Class Diagrams with UML (IONOS)', url: 'https://www.ionos.com/digitalguide/websites/web-development/class-diagrams-with-uml/' },
    { label: 'Class Diagram: Types & Examples (Educba)', url: 'https://www.educba.com/class-diagram/' },
    { label: 'What Is a UML Diagram? (Slickplan)', url: 'https://slickplan.com/blog/how-to-make-a-uml-diagram' },
  ],
  shapesUsed: SHAPES_BY_TITLE['Class Diagram'] || [],
};

// Real, researched content (everything except the video), sourced from
// Tutorialspoint, GeeksforGeeks, Guru99, and TechTarget's Waterfall write
// ups, plus Lesson 9's Methodologies/Software Paradigms course slides. URLs
// verified directly. Written without hyphen or dash punctuation throughout.
const WATERFALL_CONTENT: DiagramContent = {
  id: 11,
  title: 'Waterfall Model',
  type: 'SDLC',
  tagline: 'The classic, linear approach to the SDLC. Each phase must fully finish before the next one begins.',
  videoId: PLACEHOLDER_VIDEO_ID,
  imageAlt: 'Waterfall Model diagram',
  placeholderImage: require('../../../assets/diagram library/sdlc_waterfall_model.jpg'),
  sections: [
    {
      heading: 'What It Is',
      body: "The Waterfall Model is widely considered the classic, original approach to the systems development life cycle. It describes a development method that is linear and sequential. The process is broken into distinct phases, Requirements Analysis, System Design, Implementation, Testing, and Deployment and Maintenance, and each one must be completed and reviewed in full before the next phase can begin, much like water flowing down a series of steps and never flowing back up.",
    },
    {
      heading: 'When to Use It',
      body: "Waterfall fits best when a project's requirements are clear, stable, and unlikely to change, the scope is well understood from the outset, and the technology involved is familiar to the team. It suits smaller, clearly defined projects with a fixed deliverable more than large or exploratory ones, since there is little room to revisit an earlier phase once later phases are already underway.",
    },
  ],
  advantages: [
    'Its structure is simple and easy to understand and manage, with clear deliverables and a review at the end of every phase.',
    'Milestones are clearly defined, which makes it straightforward to schedule work and track progress against a plan.',
    'Produces thorough documentation at each phase, which is useful for onboarding new team members or maintaining the system later.',
    'Works well for smaller projects with clearly understood, stable requirements from the start.',
  ],
  disadvantages: [
    'It does not accept the unexpected changes and revisions that become necessary with most projects, since work is only meant to flow in one direction.',
    'Working software is not produced until late in the life cycle, so requirement or design problems are often not discovered until testing.',
    'Going back to an earlier phase after later phases have started is costly and disruptive, sometimes requiring the whole project to restart.',
    'A poor fit for large, complex, or lengthy projects, where it is unrealistic to expect every requirement to be known in advance.',
  ],
  steps: [
    'Requirements Analysis. Gather and document everything the system needs to do before any design work begins.',
    'System Design. Translate the finalized requirements into a system architecture and detailed design.',
    'Implementation. Write and test the code according to the design specification.',
    'Verification and Testing. Test the completed system as a whole against the original requirements to catch defects.',
    'Deployment and Maintenance. Release the system to users, then maintain it and fix issues as they surface.',
  ],
  keyPoints: [
    'Considered the classic, original approach to the software development life cycle.',
    'Strictly linear and sequential. No phase begins until the one before it is fully complete.',
    'Best suited to small, clearly defined projects with requirements that are not expected to change.',
    'Its central weakness is inflexibility. It struggles to absorb changes once a phase has already passed.',
  ],
  references: [
    { label: 'SDLC Waterfall Model (Tutorialspoint)', url: 'https://www.tutorialspoint.com/sdlc/sdlc_waterfall_model.htm' },
    { label: 'Waterfall Model (GeeksforGeeks)', url: 'https://www.geeksforgeeks.org/software-engineering/waterfall-model/' },
    { label: 'What is Waterfall Model in SDLC? (Guru99)', url: 'https://www.guru99.com/what-is-sdlc-or-waterfall-model.html' },
    { label: 'Waterfall Model Definition (TechTarget)', url: 'https://www.techtarget.com/searchsoftwarequality/definition/waterfall-model' },
  ],
};

// Real, researched content (everything except the video), sourced from
// Tutorialspoint, GeeksforGeeks, and Javatpoint's Prototyping write ups,
// plus Lesson 9's Methodologies/Software Paradigms course slides. URLs
// verified directly. Written without hyphen or dash punctuation throughout.
const PROTOTYPE_CONTENT: DiagramContent = {
  id: 14,
  title: 'Prototype Model',
  type: 'SDLC',
  tagline: 'Builds a working mock up first, then refines it with user feedback until the real system takes shape.',
  videoId: PLACEHOLDER_VIDEO_ID,
  imageAlt: 'Prototype Model diagram',
  placeholderImage: require('../../../assets/diagram library/PROTOTYPE.jpg'),
  sections: [
    {
      heading: 'What It Is',
      body: 'The Prototyping Model is a systems development methodology in which a prototype, a scaled down, working sample of the intended system, is built, tested, and then reworked as necessary until an acceptable prototype is finally reached. Once users and developers agree the prototype captures what is needed, the complete system or product is developed from it, rather than trying to nail down every detail on paper in advance.',
    },
    {
      heading: 'When to Use It',
      body: 'It is most useful when requirements are unclear, still evolving, or hard for users to describe in the abstract. Seeing and interacting with something concrete makes it far easier for them to say what is right and what is missing. It is less suited to large, mission critical applications, where a prototype is structural shortcuts would be too costly to leave in the final build.',
    },
  ],
  advantages: [
    'May provide the proof of concept necessary to attract funding, by giving stakeholders something concrete to react to early on.',
    'Early visibility of the prototype gives users a clear idea of what the final system will look like well before it is finished.',
    'Encourages active participation among users and developers throughout the whole process, not just at the start and end.',
    'Tends to increase development speed and user satisfaction, since the system is shaped directly by ongoing feedback rather than guesswork.',
  ],
  disadvantages: [
    'Users can get too involved, continually requesting changes that stretch the project well past its original scope.',
    'The system is underlying structure can be damaged by the sheer number of changes made along the way, since the prototype was never designed to be the final architecture.',
    'Not suitable for large applications, where a prototype driven approach struggles to scale to the full complexity involved.',
    'Can create a false impression that the system is nearly finished, when the prototype may be missing performance, security, or reliability work not visible from the outside.',
  ],
  steps: [
    'Requirements Gathering. Collect just enough basic requirements to understand what the prototype needs to demonstrate.',
    'Quick Design. Sketch a preliminary design focused on what will be visible to the user, not the full system architecture.',
    'Build the Prototype. Construct a working, but incomplete, version of the system based on the quick design.',
    'User Evaluation. Let users interact with the prototype and gather their feedback on what works and what is missing.',
    'Refine or Finalize. Rework the prototype based on feedback, repeating the cycle until it is accepted, then build the full system from it.',
  ],
  keyPoints: [
    'A prototype is a working, but intentionally incomplete, sample of the system, not a finished product.',
    'Refinement continues in cycles until an acceptable prototype is reached, then the full system is built from it.',
    'Its biggest strength is turning abstract requirements into something concrete users can actually react to.',
    'Its biggest risk is scope creep, since easy access to the prototype invites a steady stream of change requests.',
  ],
  references: [
    { label: 'SDLC Software Prototype Model (Tutorialspoint)', url: 'https://www.tutorialspoint.com/sdlc/sdlc_software_prototyping.htm' },
    { label: 'Software Engineering | Prototyping Model (GeeksforGeeks)', url: 'https://www.geeksforgeeks.org/software-engineering/software-engineering-prototyping-model/' },
    { label: 'Prototype Model, Software Engineering (Javatpoint)', url: 'https://www.javatpoint.com/software-engineering-prototype-model' },
  ],
};

// Real, researched content (everything except the video), sourced from
// GeeksforGeeks, the Agile Alliance, and Visual Paradigm's Agile write ups, plus
// Lesson 9's Methodologies/Software Paradigms course slides. URLs verified
// directly. Written without hyphen or dash punctuation throughout.
const AGILE_CONTENT: DiagramContent = {
  id: 15,
  title: 'Agile Model',
  type: 'SDLC',
  tagline: 'A flexible, iterative approach built around adapting to changing requirements through continuous collaboration.',
  videoId: PLACEHOLDER_VIDEO_ID,
  imageAlt: 'Agile Model diagram',
  placeholderImage: require('../../../assets/diagram library/image.png'),
  sections: [
    {
      heading: 'What It Is',
      body: 'The Agile Model, also called Agile Modeling, is a lightweight, iterative approach to development that favors adapting to change over following a fixed plan. Instead of trying to nail down every requirement before work starts, an Agile project breaks work into small increments, often called sprints, each one producing a working piece of the system that is reviewed and adjusted before the next increment begins. This methodology is more flexible than traditional modeling methods, making it a better fit in a fast changing environment.',
    },
    {
      heading: 'When to Use It',
      body: 'Agile suits projects where requirements are expected to evolve, where users and stakeholders can stay closely involved throughout development, and where getting working software in front of people early matters more than delivering a complete, fully specified system on the first try. It is a weaker fit for projects with fixed, unchanging requirements, a hard contractual scope, or limited access to real users for ongoing feedback.',
    },
  ],
  advantages: [
    'Allows for changes and adjustments throughout the development process, making it well suited to projects with evolving requirements.',
    'Follows an iterative approach, so feedback happens regularly and the system improves continuously rather than only at the very end.',
    'Delivers working software early and often, giving stakeholders something real to evaluate instead of waiting for one big release.',
    'Close, ongoing collaboration between developers and users tends to catch misunderstandings early, before they become expensive to fix.',
  ],
  disadvantages: [
    "Without proper control, agile projects can suffer from scope creep, where the project's scope keeps expanding past the initial plan.",
    'Requires active, ongoing participation from team members, stakeholders, and customers, which can be demanding of everyone is time.',
    'Its lighter emphasis on documentation prepared in advance can make it harder for new team members to understand past decisions later on.',
    'Progress and final cost are harder to predict at the outset than in a plan driven model like Waterfall, since scope is expected to shift.',
  ],
  steps: [
    'Envision and Plan. Define the overall product vision and build a prioritized backlog of features to work through.',
    'Sprint Planning. Select a small batch of the highest priority work to complete in the upcoming iteration.',
    'Develop and Build. Design, build, and test that increment of working software during the sprint.',
    'Review with Stakeholders. Demonstrate the completed increment and gather feedback from users and stakeholders.',
    "Reflect and Adapt. Adjust the backlog and the team's process based on what was learned, then repeat with the next sprint.",
  ],
  keyPoints: [
    'Prioritizes responding to change over following a fixed plan set at the start.',
    'Work is delivered in small, frequent increments rather than one large release at the end.',
    'Depends on close, continuous collaboration between developers, users, and stakeholders.',
    'Trades predictability of scope and cost for flexibility and faster feedback.',
  ],
  references: [
    { label: 'Agile Development Models (GeeksforGeeks)', url: 'https://www.geeksforgeeks.org/software-engineering/software-engineering-agile-development-models/' },
    { label: 'What is Agile? Agile 101 (Agile Alliance)', url: 'https://agilealliance.org/agile101/' },
    { label: 'What is Agile Software Development? (Visual Paradigm)', url: 'https://www.visual-paradigm.com/guide/agile-software-development/what-is-agile-software-development/' },
  ],
};

// Real, researched content (everything except the video), sourced from
// Tutorialspoint, GeeksforGeeks, Guru99, and Scaler's RAD write ups,
// plus Lesson 9's Methodologies/Software Paradigms course slides. The four
// phase breakdown (Requirements Planning, User Design, Construction,
// Cutover) matches that lesson's slides directly. URLs verified directly.
// Written without hyphen or dash punctuation throughout.
const RAD_CONTENT: DiagramContent = {
  id: 18,
  title: 'Rapid Application Development',
  type: 'SDLC',
  tagline: 'Trades heavy planning done in advance for fast, iterative prototyping built through close user involvement.',
  videoId: PLACEHOLDER_VIDEO_ID,
  imageAlt: 'RAD Model diagram',
  placeholderImage: require('../../../assets/diagram library/RAD.png'),
  sections: [
    {
      heading: 'What It Is',
      body: 'Rapid Application Development, or RAD, is a systems development methodology that emphasizes speed of development through extensive user involvement in the rapid, iterative, and incremental construction of a series of functioning prototypes, which eventually evolve into the final system. Rather than spending long stretches on analysis and design before any building starts, RAD teams build, test, and refine working software in fast cycles, with users involved at every step.',
    },
    {
      heading: 'When to Use It',
      body: 'RAD works best on projects with a properly resourced, dedicated team, users who can commit real time to the process, and a scope that is modular enough to be broken into pieces that can be built and demonstrated quickly. It is a poor fit for projects that cannot be modularized this way, that have hard technical constraints requiring careful design done in advance, or where user availability for constant collaboration cannot be guaranteed.',
    },
  ],
  advantages: [
    'Speeds up development significantly compared to plan driven models, since working prototypes replace long analysis and design phases.',
    'Heavy user involvement throughout the process means the final system is more likely to actually match what users need.',
    'Iterating on working prototypes surfaces design problems early, while they are still cheap to fix.',
    'Modular construction lets different parts of the system be built and refined somewhat independently, in parallel.',
  ],
  disadvantages: [
    "Depends heavily on a strong, available team and highly committed users. Without both, the model's speed advantage breaks down.",
    "The push for speed can lead to shortcuts in architecture or documentation that cause problems later in the system's life.",
    'Less suited to large systems that are hard to break cleanly into independent, demonstrable modules.',
    'Tighter timelines can make it harder to manage scope and keep quality consistent across every module.',
  ],
  steps: [
    'Requirements Planning. Decide what functions the application should actually feature, working jointly with users.',
    'User Design. Work through the design aspects that matter most to users, together with users, refining it through prototypes.',
    'Construction. Further build out and enhance the designs created in the previous phase into working software.',
    'Cutover. Replace the old application with the newly built one, completing the transition to the finished system.',
  ],
  keyPoints: [
    'Prioritizes speed and heavy user involvement over extensive planning done in advance.',
    'Built around a series of working prototypes that evolve directly into the final system.',
    'Follows four core phases: Requirements Planning, User Design, Construction, and Cutover.',
    'Needs a strong, available team and committed users to actually deliver on its speed advantage.',
  ],
  references: [
    { label: 'SDLC RAD Model (Tutorialspoint)', url: 'https://www.tutorialspoint.com/sdlc/sdlc_rad_model.htm' },
    { label: 'Rapid Application Development Model, RAD (GeeksforGeeks)', url: 'https://www.geeksforgeeks.org/software-engineering/software-engineering-rapid-application-development-model-rad/' },
    { label: 'RAD Model in Software Engineering (Guru99)', url: 'https://www.guru99.com/what-is-rad-rapid-software-development-model-advantages-disadvantages.html' },
    { label: 'Rapid Application Development Model, RAD Model (Scaler)', url: 'https://www.scaler.com/topics/rad-model-in-software-engineering/' },
  ],
};

// Real, researched content (everything except the video), sourced from
// Tutorialspoint, GeeksforGeeks, TechTarget, and Educative's Spiral write
// ups, plus Lesson 9's Methodologies/Software Paradigms course slides. URLs
// verified directly. Written without hyphen or dash punctuation throughout.
const SPIRAL_CONTENT: DiagramContent = {
  id: 19,
  title: 'Spiral Model',
  type: 'SDLC',
  tagline: 'Combines Prototyping and Waterfall into repeating loops driven by risk, best suited to large, complex projects.',
  videoId: PLACEHOLDER_VIDEO_ID,
  imageAlt: 'Spiral Model diagram',
  placeholderImage: require('../../../assets/diagram library/spiral-model.jpg'),
  sections: [
    {
      heading: 'What It Is',
      body: 'The Spiral Model is an SDLC model used in information technology that combines the features of the Prototyping and Waterfall models. It shows the life cycle as a spiral, starting at the center and working its way outward, passing through the same set of activities, planning, risk analysis, engineering, and evaluation, again and again, until the project is complete. Each pass around the spiral produces a more refined version of the system than the loop before it.',
    },
    {
      heading: 'When to Use It',
      body: 'The Spiral Model is intended for large, expensive, and complicated projects where risk needs to be actively managed throughout development, not just assumed away at the start. It is overkill for small, simple, low risk projects, where its heavier risk analysis overhead costs more than it is worth.',
    },
  ],
  advantages: [
    'Easier to cope with the changes inherent to software development, since each loop revisits planning and design rather than locking them in early.',
    'Software engineers can start working on the project earlier than they could after a lengthy, exhaustive early design process.',
    'Its explicit risk analysis phase in every loop makes it well suited to catching problems in large, high risk projects before they become expensive.',
    "Combines Prototyping's flexibility with Waterfall's discipline, giving teams structure without losing the ability to adapt.",
  ],
  disadvantages: [
    'Estimating budget and time is harder to judge at the beginning of the project, since requirements evolve through the process rather than being fixed in advance.',
    'Its repeated risk analysis phases require specific expertise, adding cost and complexity that smaller teams may not have.',
    'Because it is intended for large, complex projects, it is excessive and inefficient for small or well understood ones.',
    'The looping structure can make overall progress harder to communicate to stakeholders expecting a simple linear timeline.',
  ],
  steps: [
    'Determine Objectives. Identify the goals, alternatives, and constraints for this loop of the spiral.',
    'Identify and Resolve Risks. Analyze the risks involved and work through strategies to resolve or mitigate them.',
    'Develop and Test. Build and verify the next version of the product for this loop, whether that is a prototype or a more complete release.',
    'Plan the Next Loop. Review progress with stakeholders and plan the next pass around the spiral.',
    'Repeat Until Complete. Continue looping through these same activities, refining the system each time, until it is ready for final release.',
  ],
  keyPoints: [
    "Combines the Prototyping Model's flexibility with the Waterfall Model's structured phases.",
    'Visualized as a spiral. The same activities repeat in loops, each one producing a more refined version of the system.',
    'Built around explicit, repeated risk analysis, which is what most distinguishes it from other models.',
    'Best suited to large, expensive, and complicated projects, not small or simple ones.',
  ],
  references: [
    { label: 'SDLC Spiral Model (Tutorialspoint)', url: 'https://www.tutorialspoint.com/sdlc/sdlc_spiral_model.htm' },
    { label: 'Spiral Model in Software Engineering (GeeksforGeeks)', url: 'https://www.geeksforgeeks.org/software-engineering/software-engineering-spiral-model/' },
    { label: 'What is the Spiral Model? (TechTarget)', url: 'https://www.techtarget.com/searchsoftwarequality/definition/spiral-model' },
    { label: 'What is Spiral Model in Software Engineering? (Educative)', url: 'https://www.educative.io/answers/what-is-spiral-model-in-software-engineering' },
  ],
};

// Real, researched content (everything except the video), sourced from
// GeeksforGeeks and Scaler's Big Bang write ups. URLs verified directly.
// Written without hyphen or dash punctuation throughout.
const BIG_BANG_CONTENT: DiagramContent = {
  id: 13,
  title: 'Big Bang Model',
  type: 'SDLC',
  tagline: 'Starts coding with little to no planning and lets the requirements take shape as the work happens.',
  videoId: PLACEHOLDER_VIDEO_ID,
  imageAlt: 'Big Bang Model diagram',
  placeholderImage: require('../../../assets/diagram library/bigbang2.png'),
  sections: [
    {
      heading: 'What It Is',
      body: 'The Big Bang Model is the simplest SDLC model, named after the Great Big Bang that led to the formation of galaxies, stars, and planets. There is almost no planning at the start. Instead, time, effort, and whatever resources are available are simply put into development, and the product takes shape gradually as customer requirements arrive.',
    },
    {
      heading: 'When to Use It',
      body: 'It works reasonably well for very small projects, side projects, or situations with only a handful of people involved, where requirements are not exact and are expected to keep changing anyway. Because there is essentially no planning involved, it is a poor choice for any project with real budget, deadline, or quality expectations, and it is widely considered unsuitable for large projects.',
    },
  ],
  advantages: [
    'Extremely simple to start. There is almost no planning overhead before development begins.',
    'Gives developers a great deal of flexibility, since there is no rigid process constraining how the work gets done.',
    'Well suited to very small projects, learning exercises, or situations where requirements genuinely are not known yet.',
    'Requires very little management structure, which keeps overhead low for a small, informal team.',
  ],
  disadvantages: [
    'Considered one of the least reliable SDLC models, since the lack of planning means the finished product can easily miss what the customer actually needed.',
    'Carries high risk and uncertainty, especially as a project grows in size or complexity.',
    'Can end up costing more time, effort, and resources than expected, since rework is common when there was no plan to begin with.',
    'Not suitable for large or long term projects, or for any project where requirements are already well understood.',
  ],
  steps: [
    'Idea Generation. Form a rough idea of what the product should do, without formal requirements documentation.',
    'Development. Start building immediately, adjusting direction as understanding of the requirements improves.',
    'Integration. Combine whatever modules or parts have been built into a working product.',
    'Testing and Release. Test the assembled product informally and release it, fixing defects as they are discovered.',
  ],
  keyPoints: [
    'The simplest SDLC model, requiring almost no planning before development starts.',
    'Named after the Great Big Bang, since development explodes outward from an idea rather than following defined phases.',
    'Best suited to very small projects or exercises with loose, changing requirements.',
    'Widely regarded as the riskiest SDLC model for anything beyond a small, informal project.',
  ],
  references: [
    { label: 'Overview of Big Bang Model (GeeksforGeeks)', url: 'https://www.geeksforgeeks.org/software-engineering/overview-of-big-bang-model/' },
    { label: 'Big Bang Model in Software Engineering (Scaler)', url: 'https://www.scaler.com/topics/software-engineering/big-bang-model-in-software-engineering/' },
  ],
};

// Real, researched content (everything except the video), sourced from
// Tutorialspoint, GeeksforGeeks, Scaler, and Tpoint Tech's Iterative write ups. URLs
// verified directly. Written without hyphen or dash punctuation throughout.
const ITERATIVE_CONTENT: DiagramContent = {
  id: 16,
  title: 'Iterative Model',
  type: 'SDLC',
  tagline: 'Builds the system in repeated cycles, starting with a small working version and expanding it each pass.',
  videoId: PLACEHOLDER_VIDEO_ID,
  imageAlt: 'Iterative Model diagram',
  placeholderImage: require('../../../assets/diagram library/sdlc_iterative_model.jpg'),
  sections: [
    {
      heading: 'What It Is',
      body: 'The Iterative Model develops a system through a series of repeated cycles, or iterations, rather than trying to fully specify everything in advance. Development begins with a simple implementation of a small set of the requirements, and each iteration reviews that version, adds new functionality, and refines the design, gradually evolving the system until the complete product is ready.',
    },
    {
      heading: 'When to Use It',
      body: 'It suits projects where the full set of requirements is not entirely clear at the start, but enough is known to begin building something small and useful. It works well when stakeholders want to see and react to working software early and often, and it is a weaker fit for projects with a small, completely fixed scope that would not benefit from repeated cycles.',
    },
  ],
  advantages: [
    'Produces a working version of the system early, so problems can be found and fixed well before the project ends.',
    'Makes it easier to manage risk, since each iteration is a smaller, more manageable piece of the overall project.',
    'Adapts well to changing or evolving requirements, since new functionality is added iteration by iteration.',
    'Gives stakeholders regular opportunities to review progress and provide feedback throughout development.',
  ],
  disadvantages: [
    'Requires more overall planning and management than a strictly linear model, since each iteration has to be scoped and tracked on its own.',
    'Total project cost and timeline can be harder to predict at the outset, since the full scope emerges gradually.',
    'Repeated design changes across iterations can put strain on the system is architecture if it was not planned with growth in mind.',
    'Frequent iterations mean more documentation and coordination overhead than a single pass through the process.',
  ],
  steps: [
    'Initial Planning. Identify a small, useful subset of the overall requirements to build first.',
    'Design and Development. Design, build, and test that subset as a working, if incomplete, version of the system.',
    'Evaluation. Review the current version with stakeholders and identify what to add or change next.',
    'Refine and Repeat. Fold that feedback into the next iteration, and continue the cycle until the system is complete.',
  ],
  keyPoints: [
    'Builds the system through repeated cycles, each one adding functionality to a working version.',
    'Does not require a full specification of requirements before development starts.',
    'Makes risk easier to manage, since problems surface early in small, working pieces rather than late in one large build.',
    'Well suited to projects where requirements are expected to become clearer as development proceeds.',
  ],
  references: [
    { label: 'SDLC Iterative Model (Tutorialspoint)', url: 'https://www.tutorialspoint.com/sdlc/sdlc_iterative_model.htm' },
    { label: 'Iterative Enhancement Model in Software Development (GeeksforGeeks)', url: 'https://www.geeksforgeeks.org/software-engineering/iterative-enhancement-model-in-software-development/' },
    { label: 'SDLC Iterative Model (Scaler)', url: 'https://www.scaler.com/topics/software-engineering/iterative-model-in-software-engineering/' },
    { label: 'Iterative Model in Software Engineering (Tpoint Tech)', url: 'https://www.tpointtech.com/software-engineering-iterative-model' },
  ],
};

// Real, researched content (everything except the video), sourced from
// Tutorialspoint, GeeksforGeeks, and Guru99's V Model write ups. URLs
// verified directly. Written without hyphen or dash punctuation throughout.
const V_MODEL_CONTENT: DiagramContent = {
  id: 17,
  title: 'V Model',
  type: 'SDLC',
  tagline: 'Pairs every development phase with a matching testing phase, shaped like the letter V.',
  videoId: PLACEHOLDER_VIDEO_ID,
  imageAlt: 'V Model diagram',
  placeholderImage: require('../../../assets/diagram library/sdlc_v_model.jpg'),
  sections: [
    {
      heading: 'What It Is',
      body: 'The V Model, also known as the Verification and Validation Model, is an extension of the Waterfall Model that pairs each development phase with a corresponding testing phase, planned in parallel with it. Drawn out, the process forms a V shape. The left side runs through verification phases such as requirements analysis and design, the right side runs through matching validation phases such as system and acceptance testing, and coding sits at the bottom, joining the two sides together.',
    },
    {
      heading: 'When to Use It',
      body: 'It fits projects where requirements are clear and well understood, quality and reliability matter a great deal, and there is enough time to plan detailed tests alongside every development phase. It is a poor fit for projects where requirements are still evolving, since, like Waterfall, it offers little room to go back and revise an earlier phase once testing has begun.',
    },
  ],
  advantages: [
    'Testing is planned from the very start of the project, since every development phase has its matching test phase defined alongside it.',
    'Defects tend to be caught earlier, since verification and validation happen throughout the process rather than only at the end.',
    'Its disciplined, well documented structure makes progress and quality easier to track against a plan.',
    'Works especially well for projects where reliability and correctness matter more than speed.',
  ],
  disadvantages: [
    "Shares Waterfall's rigidity, since it offers little flexibility to accommodate requirements that change once development is underway.",
    'Working software is not available until fairly late in the process, similar to the Waterfall Model.',
    'Requires significant time and effort spent on planning test cases early, before there is much working software to test against.',
    'A poor fit for projects with unclear, evolving, or high risk requirements.',
  ],
  steps: [
    'Requirements Analysis paired with Acceptance Testing planning. Define what the system must do, and plan how that will ultimately be validated with users.',
    'System Design paired with System Testing planning. Design the overall system, and plan the tests that will confirm it works as designed.',
    'Architecture Design paired with Integration Testing planning. Design how components fit together, and plan the tests that confirm they work correctly together.',
    'Module Design paired with Unit Testing planning. Design individual components in detail, and plan the tests for each one.',
    'Coding. Implement the system according to the completed designs, at the bottom point of the V.',
  ],
  keyPoints: [
    'Also called the Verification and Validation Model, since every phase on the design side has a matching test phase on the other side.',
    'An extension of the Waterfall Model that adds structured testing planning alongside every development phase.',
    'Testing is planned early and continuously, rather than being left until after coding is finished.',
    "Shares Waterfall's core weakness: limited flexibility once a phase has already passed.",
  ],
  references: [
    { label: 'SDLC V Model (Tutorialspoint)', url: 'https://www.tutorialspoint.com/sdlc/sdlc_v_model.htm' },
    { label: 'SDLC V Model (GeeksforGeeks)', url: 'https://www.geeksforgeeks.org/software-engineering/software-engineering-sdlc-v-model/' },
    { label: 'V Model in Software Testing (Guru99)', url: 'https://www.guru99.com/v-model-software-testing.html' },
  ],
};

// Real, researched content (everything except the video), sourced from
// Visual Paradigm's system analysis guide and GeeksforGeeks and Baeldung's
// decomposition write ups. URLs verified directly. Written without hyphen
// or dash punctuation throughout.
const FDD_CONTENT: DiagramContent = {
  id: 1,
  title: 'Functional Decomposition Diagram',
  type: 'UML',
  tagline: 'Breaks a system down into a hierarchy of functions and sub functions, showing what the system does at every level.',
  videoId: PLACEHOLDER_VIDEO_ID,
  imageAlt: 'Functional Decomposition Diagram example',
  sections: [
    {
      heading: 'What It Is',
      body: 'A Functional Decomposition Diagram, or FDD, is a structural diagram that breaks a system is overall function down into smaller and smaller sub functions, arranged in a hierarchy. Each box represents one function, and functions connect down to the more specific sub functions they are made up of, giving a top down picture of everything the system does without describing how it does it.',
    },
    {
      heading: 'When to Use It',
      body: 'It is most useful early in systems analysis, when a team needs to understand and organize everything a system is responsible for before designing how those responsibilities will actually be implemented. It is less useful once you need to show data moving through the system or the order operations happen in, since that is what a Data Flow Diagram or a Flowchart is for.',
    },
  ],
  advantages: [
    'Breaks a large, complex system down into smaller, more understandable pieces, one function at a time.',
    'Gives a clear, shared picture of everything a system must do, which is useful for scoping and planning a project.',
    'Simple notation that is easy for both technical and non technical stakeholders to read and discuss.',
    'Helps catch missing or duplicated functionality early, before design or coding decisions are made.',
  ],
  disadvantages: [
    'Shows what the system does, not how or in what order, so it needs to be paired with another diagram for behavior or data flow.',
    'Very large systems can produce a diagram with so many boxes that it becomes hard to read at a glance.',
    'Does not capture relationships between functions beyond the parent and child hierarchy, such as shared data or timing dependencies.',
    'Can go out of date quickly if the system is scope changes and the diagram is not actively maintained.',
  ],
  steps: [
    'Identify the top level function. Name the single overall purpose the system exists to fulfill.',
    'Break it into major sub functions. Split that top level function into the handful of major responsibilities that make it up.',
    'Continue decomposing. Break each sub function down further into smaller functions, as many levels deep as needed.',
    'Connect the hierarchy. Draw each function connected to the sub functions beneath it, forming a tree shape.',
    'Review for completeness. Check that every function a stakeholder expects the system to perform actually appears somewhere in the diagram.',
  ],
  keyPoints: [
    'Organized as a hierarchy or tree, from one top level function down to its smallest sub functions.',
    'Describes what the system does at every level, not how it does it or in what order.',
    'A useful early step in systems analysis, before moving on to data flow or process diagrams.',
    'Best kept for planning and scoping, since it does not capture data, timing, or control flow between functions.',
  ],
  references: [
    { label: 'A Guide to Functional Decomposition and Data Flow Diagrams (Visual Paradigm)', url: 'https://guides.visual-paradigm.com/unveiling-the-complexity-a-guide-to-functional-decomposition-and-data-flow-diagrams-in-system-analysis/' },
    { label: 'Functions Decomposition in Software Engineering (GeeksforGeeks)', url: 'https://www.geeksforgeeks.org/software-engineering/functions-decomposition-in-software-engineering/' },
    { label: 'What Is Functional Decomposition? (Baeldung on Computer Science)', url: 'https://www.baeldung.com/cs/functional-decomposition' },
  ],
  shapesUsed: SHAPES_BY_TITLE['Functional Decomposition Diagram'] || [],
};

// Real, researched content (everything except the video), sourced from
// GeeksforGeeks, SmartDraw, and Visual Paradigm's Flowchart write ups. URLs verified directly.
// Written without hyphen or dash punctuation throughout.
const FLOWCHART_CONTENT: DiagramContent = {
  id: 2,
  title: 'Flowchart',
  type: 'UML',
  tagline: 'Maps a process step by step using standardized shapes, following the order the steps actually happen in.',
  videoId: PLACEHOLDER_VIDEO_ID,
  imageAlt: 'Flowchart example',
  sections: [
    {
      heading: 'What It Is',
      body: 'A Flowchart is a diagram that represents a process, algorithm, or workflow using standardized shapes connected by arrows that show the order steps occur in. Ovals mark the start and end, rectangles represent individual process steps, diamonds represent decisions that branch the flow, and arrows tie everything together into a single, readable path from beginning to end.',
    },
    {
      heading: 'When to Use It',
      body: 'It works well any time you need to document or design a process, whether that is a piece of program logic, a business workflow, or a set of instructions for people to follow. It is especially useful for spotting bottlenecks, redundant steps, or missing decision points before a process is actually implemented.',
    },
  ],
  advantages: [
    'Uses simple, widely recognized symbols, so flowcharts are easy for almost anyone to read, not just technical audiences.',
    'Makes the logic of a process explicit, which helps catch gaps, dead ends, or missing decisions before implementation.',
    'Works for a huge range of use cases, from program logic to business processes to everyday instructions.',
    'Provides clear documentation that stays useful long after the process it describes was first designed.',
  ],
  disadvantages: [
    'Can become cluttered and hard to follow once a process has many decision points or exceptions to handle.',
    'Does not scale well to very large or complex systems, where a single flowchart would be far too large to read.',
    'Only shows the sequence of steps and decisions, not timing, data structures, or who is responsible for each step.',
    'Keeping a flowchart in sync with the actual process it documents takes ongoing maintenance.',
  ],
  steps: [
    'Define the start and end points. Mark where the process begins and where it can end, using the terminator symbol.',
    'List the steps in order. Identify each action the process takes, from start to finish.',
    'Add decision points. Insert diamonds wherever the process branches based on a condition.',
    'Connect everything with arrows. Draw arrows between shapes to show the exact order the process follows.',
    'Review the flow. Trace every path from start to end to confirm the logic is complete and correct.',
  ],
  keyPoints: [
    'Uses a small set of standardized shapes: ovals for start and end, rectangles for steps, and diamonds for decisions.',
    'Reads top to bottom or left to right, following the arrows in the order the process actually happens.',
    'One of the most widely understood diagram types, useful for both technical and non technical audiences.',
    'Best suited to processes simple enough to fit on one readable diagram.',
  ],
  references: [
    { label: 'Introduction to Flowcharts (GeeksforGeeks)', url: 'https://www.geeksforgeeks.org/dsa/an-introduction-to-flowcharts/' },
    { label: 'What is a Flowchart and its Types? (GeeksforGeeks)', url: 'https://www.geeksforgeeks.org/computer-science-fundamentals/what-is-a-flowchart-and-its-types/' },
    { label: 'Flowchart Symbols (SmartDraw)', url: 'https://www.smartdraw.com/flowchart/flowchart-symbols.htm' },
    { label: 'Flowchart Tutorial, with Symbols, Guide and Examples (Visual Paradigm)', url: 'https://www.visual-paradigm.com/tutorials/flowchart-tutorial/' },
  ],
  shapesUsed: SHAPES_BY_TITLE['Flowchart'] || [],
};

// Real, researched content (everything except the video), sourced from
// EdrawMax, SmartDraw, and Visual Paradigm's Data Flow Diagram write ups. URLs verified
// directly. Written without hyphen or dash punctuation throughout.
const DFD_CONTENT: DiagramContent = {
  id: 3,
  title: 'Data Flow Diagram',
  type: 'UML',
  tagline: 'Traces how data moves through a system, between processes, external entities, and data stores.',
  videoId: PLACEHOLDER_VIDEO_ID,
  imageAlt: 'Data Flow Diagram example',
  sections: [
    {
      heading: 'What It Is',
      body: 'A Data Flow Diagram, or DFD, shows how data moves through a system rather than the order operations happen in. Circles represent processes that transform data, arrows represent the data flowing between them, rectangles represent external entities such as users or other systems, and open ended shapes represent data stores where information is held at rest.',
    },
    {
      heading: 'When to Use It',
      body: 'It is most useful when the goal is to understand or document how information flows through a system, especially during analysis and design, before deciding how each process will actually be implemented. It is less suited to showing the order steps happen in or the decisions that control that order, which is what a flowchart or activity diagram is for.',
    },
  ],
  advantages: [
    'Gives a clear picture of exactly where data comes from, where it goes, and where it is stored.',
    'Can be drawn at multiple levels of detail, starting with a simple context diagram and expanding into more detailed levels as needed.',
    'Helps identify redundant or missing data flows early, before a system is built around a flawed design.',
    'Uses a small, consistent set of symbols that both technical and non technical stakeholders can learn quickly.',
  ],
  disadvantages: [
    'Does not show timing, control flow, or the order that processes actually run in.',
    'Large systems can require many levels of DFDs, which takes real effort to keep organized and consistent.',
    'Does not capture how a process actually implements its logic, only that data goes in and comes out.',
    'Different DFD notations, such as Yourdon and Gane and Sarson, use different symbols for the same concepts, which can cause confusion between teams.',
  ],
  steps: [
    'Identify external entities. List everyone and everything outside the system that sends or receives data.',
    'Identify the processes. List the major processes that transform data as it moves through the system.',
    'Identify data stores. List where the system holds data at rest between processes.',
    'Draw the data flows. Connect entities, processes, and data stores with arrows labeled with what data is actually moving.',
    'Decompose as needed. Break complex processes into their own, more detailed DFD if a single level gets too crowded.',
  ],
  keyPoints: [
    'Focuses entirely on data movement, not the sequence or timing of operations.',
    'Built from four basic elements: processes, data flows, data stores, and external entities.',
    'Can be leveled, starting from one high level context diagram and expanding into more detail as needed.',
    'Two common notations exist, Yourdon and Gane and Sarson, which use different shapes for the same ideas.',
  ],
  references: [
    { label: 'Understanding Symbols and Notations Used in DFDs (EdrawMax)', url: 'https://www.edrawmax.com/article/data-flow-diagram-symbols-and-meanings.html' },
    { label: 'Data Flow Diagram, Everything You Need to Know About DFD (SmartDraw)', url: 'https://www.smartdraw.com/data-flow-diagram/' },
    { label: 'How to Draw DFD with Multiple Context Levels (Visual Paradigm)', url: 'https://www.visual-paradigm.com/tutorials/leveled-dfd.jsp' },
  ],
  shapesUsed: SHAPES_BY_TITLE['Data Flow Diagram'] || [],
};

// Real, researched content (everything except the video), sourced from
// GeeksforGeeks' Entity Relationship Diagram write ups. URLs
// verified directly. Written without hyphen or dash punctuation throughout.
const ERD_CONTENT: DiagramContent = {
  id: 4,
  title: 'Entity Relationship Diagram',
  type: 'UML',
  tagline: 'Maps the entities in a system and the relationships between them, most often to design a database.',
  videoId: PLACEHOLDER_VIDEO_ID,
  imageAlt: 'Entity Relationship Diagram example',
  sections: [
    {
      heading: 'What It Is',
      body: 'An Entity Relationship Diagram, or ERD, models the entities in a system, such as Customer or Order, along with the attributes that describe them and the relationships between them. Rectangles represent entities, ovals represent their attributes, and diamonds describe how two entities relate, with cardinality markers showing how many records on each side can be involved in that relationship.',
    },
    {
      heading: 'When to Use It',
      body: 'It is most useful when designing or documenting a relational database, since it lays out exactly what tables are needed and how they relate before any database schema gets built. It is also useful for discussing data requirements with stakeholders who are not necessarily database specialists, since the notation maps closely to real world concepts like customers and orders.',
    },
  ],
  advantages: [
    'Gives a clear, visual map of a system is data before any database tables actually get created.',
    'Makes relationships between entities explicit, including how many records on each side can be involved.',
    'Provides a shared reference point between developers, database administrators, and business stakeholders.',
    'Catches structural problems, like missing relationships or duplicated data, early, while they are still cheap to fix.',
  ],
  disadvantages: [
    'Large systems with many entities can produce a diagram that is difficult to read as a single picture.',
    'Does not capture the actual data itself or the logic that operates on it, only the structure.',
    "Multiple ERD notations exist, such as Chen and Crow's Foot, so the same relationship can be drawn differently between teams.",
    'Can fall out of sync with the real database schema if it is not maintained alongside ongoing changes.',
  ],
  steps: [
    'Identify the entities. List the real world objects or concepts the system needs to track, such as Customer or Product.',
    "Identify the attributes. List the properties that describe each entity, such as a Customer's name and email.",
    'Identify the relationships. Determine how entities relate to each other, such as a Customer placing an Order.',
    'Define cardinality. Mark how many records on each side of a relationship can be involved, such as one to many.',
    'Review and refine. Check the diagram against real scenarios to confirm it captures the data correctly.',
  ],
  keyPoints: [
    'Built from three core elements: entities, their attributes, and the relationships between entities.',
    'Cardinality markers describe how many records on each side of a relationship can be involved, such as one to one or one to many.',
    'Most commonly used to design or document the structure of a relational database.',
    "Different notations, like Chen and Crow's Foot, represent the same relationships with different symbols.",
  ],
  references: [
    { label: 'Introduction of ER Model (GeeksforGeeks)', url: 'https://www.geeksforgeeks.org/dbms/introduction-of-er-model/' },
    { label: 'Steps to Draw an Entity Relationship Diagram (GeeksforGeeks)', url: 'https://www.geeksforgeeks.org/sql/how-to-draw-entity-relationship-diagrams/' },
    { label: 'Relationships in ER Model (GeeksforGeeks)', url: 'https://www.geeksforgeeks.org/dbms/relationships-in-er-model/' },
  ],
  shapesUsed: SHAPES_BY_TITLE['Entity Relationship Diagram'] || [],
};

// Real, researched content (everything except the video), sourced from
// ASQ and MindTools' Fishbone/Ishikawa write ups. URLs verified
// directly. Written without hyphen or dash punctuation throughout.
const FISHBONE_CONTENT: DiagramContent = {
  id: 5,
  title: 'Fishbone Diagram',
  type: 'UML',
  tagline: 'Traces a problem back to its possible root causes, organized into major categories along a central spine.',
  videoId: PLACEHOLDER_VIDEO_ID,
  imageAlt: 'Fishbone Diagram example',
  sections: [
    {
      heading: 'What It Is',
      body: 'A Fishbone Diagram, also called an Ishikawa Diagram or a cause and effect diagram, is a visual tool for exploring the possible causes of a specific problem. A central spine points to a box naming the problem, or effect, at the head, and diagonal bones branch off the spine, each one grouping a category of possible causes, with individual causes listed along each bone.',
    },
    {
      heading: 'When to Use It',
      body: 'It is most useful during root cause analysis, when a team is trying to understand why a particular problem keeps happening rather than jumping straight to a fix. It works especially well in a group brainstorming setting, since the categories give structure to the discussion and help make sure no obvious area of causes gets missed.',
    },
  ],
  advantages: [
    'Organizes brainstorming around a problem into clear categories, instead of a disorganized list of possible causes.',
    'Makes it easy to see, at a glance, how many possible causes fall into each category.',
    'Encourages a team to look beyond the first obvious explanation and consider causes across multiple categories.',
    'Simple enough to sketch quickly in a meeting, with no special tools required.',
  ],
  disadvantages: [
    'Only identifies possible causes. It does not by itself confirm which of them is actually responsible for the problem.',
    'Can end up with an uneven diagram if one category collects far more causes than the others.',
    'Does not show how different causes might interact with or depend on each other.',
    'Effectiveness depends heavily on how well the group doing the brainstorming actually understands the problem.',
  ],
  steps: [
    'Define the problem. Write the specific effect being investigated in the box at the head of the fish.',
    'Draw the spine. Draw the central line running from the problem box back toward where the causes will branch off.',
    'Add major categories. Draw diagonal bones off the spine for broad cause categories, such as People, Process, or Materials.',
    'Brainstorm causes. Add specific possible causes along each bone, under the category they belong to.',
    'Review and prioritize. Discuss which causes seem most likely, and plan how to confirm or rule each one out.',
  ],
  keyPoints: [
    'Also known as an Ishikawa Diagram, after Kaoru Ishikawa, who developed it for quality control work in the 1960s.',
    'Organizes possible causes into categories branching off a central spine that points to the problem.',
    'A brainstorming tool for identifying possible causes, not a method for confirming which one is correct.',
    'Common category sets include People, Process, Equipment, Materials, Environment, and Measurement.',
  ],
  references: [
    { label: 'What is a Fishbone Diagram? Ishikawa Cause and Effect Diagram (ASQ)', url: 'https://asq.org/quality-resources/fishbone' },
    { label: '7 Basic Quality Tools (ASQ)', url: 'https://asq.org/quality-resources/seven-basic-quality-tools' },
    { label: 'Cause and Effect Analysis (MindTools)', url: 'https://www.mindtools.com/a25caig/cause-and-effect-analysis/' },
  ],
  shapesUsed: SHAPES_BY_TITLE['Fishbone Diagram'] || [],
};

// Real, researched content (everything except the video), sourced from All
// About Circuits, Electronics Tutorials, and SparkFun's Schematic write
// ups. URLs verified directly. Written without hyphen or dash punctuation
// throughout.
const SCHEMATIC_CONTENT: DiagramContent = {
  id: 6,
  title: 'Schematic Diagram',
  type: 'UML',
  tagline: 'Represents an electrical circuit using standardized component symbols and the wires connecting them.',
  videoId: PLACEHOLDER_VIDEO_ID,
  imageAlt: 'Schematic Diagram example',
  sections: [
    {
      heading: 'What It Is',
      body: 'A Schematic Diagram represents an electrical or electronic circuit using standardized symbols for components, such as resistors, capacitors, and transistors, connected by lines representing wires. Unlike a photo or physical layout of a circuit, a schematic focuses purely on the electrical connections and behavior, so the same schematic can apply to circuits built in very different physical shapes.',
    },
    {
      heading: 'When to Use It',
      body: 'It is the standard way to design, document, or troubleshoot an electrical or electronic circuit, since it shows exactly how components are wired together and how current is meant to flow. It is used everywhere from teaching basic circuits to designing and debugging real hardware.',
    },
  ],
  advantages: [
    'Uses standardized symbols that are recognized across the electronics field, making schematics readable to anyone trained in them.',
    'Focuses purely on electrical connections, so a schematic stays valid regardless of how the physical circuit is actually laid out.',
    'Makes it much easier to trace current flow and diagnose a fault than trying to reason about a physical circuit directly.',
    'Provides a durable reference for building, testing, repairing, or modifying a circuit later.',
  ],
  disadvantages: [
    'Requires learning a specific set of symbols and conventions before a schematic can be read accurately.',
    'Large or complex circuits can produce schematics with a great many components and connections to trace.',
    'Does not show the physical size, placement, or layout of components on an actual board.',
    'A single misread or mislabeled connection can lead to real wiring mistakes when the circuit is actually built.',
  ],
  steps: [
    'Identify the components. List every component the circuit needs, such as resistors, capacitors, and power sources.',
    'Choose the correct symbols. Represent each component with its standardized schematic symbol.',
    'Plan the layout. Arrange the symbols so the overall flow of the circuit is easy to read, generally left to right.',
    'Draw the connections. Connect components with lines representing wires, marking any joins with a dot.',
    'Label values and connections. Add values, such as resistance or voltage, and label pins or terminals as needed.',
  ],
  keyPoints: [
    'Represents electrical connections and behavior, not the physical appearance or layout of a circuit.',
    'Built from standardized component symbols that are consistent across the electronics field.',
    'Connected wires are marked with a dot, while wires that simply cross without connecting are not.',
    'Used throughout a circuit is life, from initial design through troubleshooting and later modification.',
  ],
  references: [
    { label: 'Wires and Connections, Circuit Schematic Symbols (All About Circuits)', url: 'https://www.allaboutcircuits.com/textbook/reference/chpt-9/wires-and-connections/' },
    { label: 'Basic Electrical and Electronic Schematic Symbols (Electronics Tutorials)', url: 'https://www.electronics-tutorials.ws/resources/basic-schematic-symbols.html' },
    { label: 'How to Read a Schematic (SparkFun Learn)', url: 'https://learn.sparkfun.com/tutorials/how-to-read-a-schematic/all' },
  ],
  shapesUsed: SHAPES_BY_TITLE['Schematic Diagram'] || [],
};

// Real, researched content (everything except the video), sourced from
// Visual Paradigm and GeeksforGeeks' Use Case Diagram write ups. URLs verified
// directly. Written without hyphen or dash punctuation throughout.
const USE_CASE_CONTENT: DiagramContent = {
  id: 7,
  title: 'Use Case Diagram',
  type: 'UML',
  tagline: 'Shows the goals different actors accomplish with a system, without describing how those goals are carried out.',
  videoId: PLACEHOLDER_VIDEO_ID,
  imageAlt: 'Use Case Diagram example',
  sections: [
    {
      heading: 'What It Is',
      body: 'A Use Case Diagram is a UML behavioral diagram that shows the interactions between actors, people or external systems, and the use cases, or goals, they accomplish by interacting with the system. A system boundary frames what the system itself is responsible for, actors sit outside it, and lines connect each actor to the use cases they take part in.',
    },
    {
      heading: 'When to Use It',
      body: 'It is most useful early in requirements gathering, for capturing what a system needs to do from the perspective of the people and systems that will actually use it, without getting into implementation detail. It gives a quick, high level picture that is easy to discuss with stakeholders who are not necessarily technical.',
    },
  ],
  advantages: [
    'Captures functional requirements in a form that is easy for non technical stakeholders to understand and discuss.',
    'Keeps the focus on what the system needs to do for its users, rather than how it will be built internally.',
    'Makes the scope of a system, and who its various users are, explicit and easy to review.',
    'Provides a natural starting point for writing more detailed use case descriptions or user stories later.',
  ],
  disadvantages: [
    'Deliberately leaves out implementation detail, so it needs to be paired with other diagrams to describe actual behavior.',
    'Can oversimplify complex interactions, since a single line between an actor and a use case hides a lot of detail.',
    'Large systems can end up with so many use cases that the diagram becomes cluttered and hard to read.',
    'Does not show the order operations happen in, which is what a sequence or activity diagram is for.',
  ],
  steps: [
    'Identify the actors. List every person or external system that interacts with the system being modeled.',
    'Identify the use cases. List the specific goals each actor accomplishes by using the system.',
    'Draw the system boundary. Frame the use cases inside a boundary representing the system itself.',
    'Connect actors to use cases. Draw a line from each actor to every use case they take part in.',
    'Add include and extend relationships. Mark any use cases that always, or optionally, incorporate the steps of another.',
  ],
  keyPoints: [
    'A UML behavioral diagram focused on what a system does for its users, not how it does it.',
    'Built from three core elements: actors, use cases, and the system boundary that frames them.',
    'Include relationships mark steps a use case always performs, while extend relationships mark optional ones.',
    'A strong first step for gathering and communicating functional requirements with stakeholders.',
  ],
  references: [
    { label: 'What is Use Case Diagram? (Visual Paradigm)', url: 'https://www.visual-paradigm.com/guide/uml-unified-modeling-language/what-is-use-case-diagram/' },
    { label: 'Use Case Diagram, Unified Modeling Language (GeeksforGeeks)', url: 'https://www.geeksforgeeks.org/system-design/use-case-diagram/' },
    { label: 'Unified Modeling Language (UML) Diagrams (GeeksforGeeks)', url: 'https://www.geeksforgeeks.org/system-design/unified-modeling-language-uml-introduction/' },
  ],
  shapesUsed: SHAPES_BY_TITLE['Use Case Diagram'] || [],
};

// Real, researched content (everything except the video), sourced from
// Visual Paradigm and GeeksforGeeks' Activity Diagram write ups. URLs verified
// directly. Written without hyphen or dash punctuation throughout.
const ACTIVITY_CONTENT: DiagramContent = {
  id: 8,
  title: 'Activity Diagram',
  type: 'UML',
  tagline: 'Models the flow of actions in a process, including decisions, parallel paths, and where the flow ends.',
  videoId: PLACEHOLDER_VIDEO_ID,
  imageAlt: 'Activity Diagram example',
  sections: [
    {
      heading: 'What It Is',
      body: "A UML Activity Diagram models the flow of actions and decisions in a process or workflow, similar in spirit to a flowchart but built with UML's own notation. A filled circle marks where the flow starts, rounded rectangles represent individual actions, diamonds represent decisions, and bars represent forks and joins where the flow splits into parallel paths and comes back together.",
    },
    {
      heading: 'When to Use It',
      body: "It is most useful for modeling business processes or software logic that includes decisions, loops, or steps that happen in parallel, where a plain flowchart's notation starts to feel limited. Swimlanes make it especially useful for showing who is responsible for each step when multiple people or systems are involved in one process.",
    },
  ],
  advantages: [
    'Handles parallel and concurrent flows explicitly, through forks and joins, in a way a basic flowchart does not.',
    'Swimlanes make it easy to show which actor or system is responsible for each step in the process.',
    'Uses a consistent UML notation that fits naturally alongside other UML diagrams for the same system.',
    'Makes complex process logic, including decisions and loops, explicit and easier to review before implementation.',
  ],
  disadvantages: [
    'Its extra notation, such as forks, joins, and swimlanes, takes more effort to learn than a plain flowchart.',
    'Can become visually dense once a process includes many decisions, parallel paths, or swimlanes at once.',
    'Focuses on control flow and does not capture the underlying data structures involved.',
    'Best suited to workflows and business logic, and is a weaker fit for showing the detailed timing of messages between objects.',
  ],
  steps: [
    'Identify the process. Define the overall workflow or activity being modeled, and where it starts and ends.',
    'List the actions. Identify each individual action that makes up the process.',
    'Add decisions and branches. Insert diamonds wherever the flow depends on a condition.',
    'Add forks and joins as needed. Mark any points where the flow splits into parallel paths or synchronizes back together.',
    'Organize with swimlanes. Group actions by who or what is responsible for them, if more than one actor is involved.',
  ],
  keyPoints: [
    'A UML behavioral diagram for modeling the flow of actions, decisions, and parallel paths in a process.',
    'Uses a filled circle to mark the start and a ringed circle to mark where the entire activity ends.',
    'Forks split a flow into parallel paths, while joins bring those paths back together.',
    'Swimlanes divide the diagram by who or what is responsible for each action.',
  ],
  references: [
    { label: 'What is Activity Diagram? (Visual Paradigm)', url: 'https://www.visual-paradigm.com/guide/uml-unified-modeling-language/what-is-activity-diagram/' },
    { label: 'Activity Diagrams, Unified Modeling Language (GeeksforGeeks)', url: 'https://www.geeksforgeeks.org/system-design/unified-modeling-language-uml-activity-diagrams/' },
    { label: 'Short Note on Activity and Swimlane Diagram (GeeksforGeeks)', url: 'https://www.geeksforgeeks.org/software-engineering/short-note-on-activity-and-swimlane-diagram/' },
  ],
  shapesUsed: SHAPES_BY_TITLE['Activity Diagram'] || [],
};

const DIAGRAM_CONTENT: Record<number, DiagramContent> = {
  1: FDD_CONTENT,
  2: FLOWCHART_CONTENT,
  3: DFD_CONTENT,
  4: ERD_CONTENT,
  5: FISHBONE_CONTENT,
  6: SCHEMATIC_CONTENT,
  7: USE_CASE_CONTENT,
  8: ACTIVITY_CONTENT,
  9: SEQUENCE_DIAGRAM_CONTENT,
  10: CLASS_DIAGRAM_CONTENT,
  11: WATERFALL_CONTENT,
  12: MODIFIED_WATERFALL_CONTENT,
  13: BIG_BANG_CONTENT,
  14: PROTOTYPE_CONTENT,
  15: AGILE_CONTENT,
  16: ITERATIVE_CONTENT,
  17: V_MODEL_CONTENT,
  18: RAD_CONTENT,
  19: SPIRAL_CONTENT,
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

// "What It Is" marker — a plain info glyph, since that section is a
// definition.
const InfoIcon: React.FC<IconProps> = ({ color }) => (
  <Svg width={10} height={10} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="7.5" r="1.6" fill={color} />
    <Path d="M12 11V17.5" stroke={color} strokeWidth={2.4} strokeLinecap="round" />
  </Svg>
);

// "When to Use It" marker — a clock, since that section is about timing/
// context rather than a static fact.
const ClockIcon: React.FC<IconProps> = ({ color }) => (
  <Svg width={10} height={10} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="12" r="9" stroke={color} strokeWidth={2} />
    <Path d="M12 7.5V12L15.5 14.5" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

// ProsConsCard's own marker — a plus and a minus side by side, standing in
// for "advantages / disadvantages" more directly than a literal balance-
// scale glyph would render at this size (16px marker, 10px icon).
const PlusMinusIcon: React.FC<IconProps> = ({ color }) => (
  <Svg width={12} height={12} viewBox="0 0 24 24" fill="none">
    <Path d="M6 4V13M1.5 8.5H10.5" stroke={color} strokeWidth={2.4} strokeLinecap="round" />
    <Path d="M14 8.5H22.5" stroke={color} strokeWidth={2.4} strokeLinecap="round" />
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
//
// `label` (content.imageAlt) used to render as visible caption text under the
// icon, right below the page's own title — which already says the same
// thing. Now it's just an accessibility label on the box itself, same as
// the real <Image>'s accessibilityLabel prop once a diagram gets a real
// picture, so screen readers still get the description without sighted
// users seeing it echoed twice.
const DiagramPlaceholder: React.FC<DiagramPlaceholderProps> = ({ color, label, title }) => {
  const Icon = DIAGRAM_ICON_MAP[title] ?? GenericDiagramGlyph;
  return (
    <View style={placeholderStyles.container}>
      <View
        style={[placeholderStyles.imageBox, { backgroundColor: `${color}15`, borderColor: `${color}30` }]}
        accessibilityLabel={label}
        // @ts-ignore - accessibilityRole="img" renders as role="img" on web (react-native-web)
        accessibilityRole="image"
      >
        <Icon color={color} />
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
    // Same fix as heroImage below: a flat maxHeight fighting aspectRatio
    // left this stretching to the full hero width (up to ~1230px on
    // desktop) while staying pinned to a ~180px height, so the glyph and
    // caption inside read as small and lost in a wide, mostly empty band.
    // Capping the width instead lets height follow the aspect ratio
    // properly at any viewport size.
    width: '100%',
    maxWidth: 640,
    aspectRatio: 16 / 9,
    alignSelf: 'center',
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
// "What It Is" and "When to Use It" used to render that exact same node for
// both, despite being two different kinds of content (a definition vs. a
// timing/context cue) — this lookup gives each its own tiny glyph instead.
// Keyed by the exact heading text (all diagram types currently share
// DEFAULT_SECTIONS' two headings), with a plain dot as the fallback for any
// heading this map doesn't recognize, so a future/custom section heading
// still renders correctly instead of breaking.
const SECTION_ICON_BY_HEADING: Record<string, React.FC<IconProps>> = {
  'What It Is': InfoIcon,
  'When to Use It': ClockIcon,
};

interface SectionCardProps {
  heading: string;
  body: string;
  color: string;
}

const SectionCard: React.FC<SectionCardProps> = ({ heading, body, color }) => {
  const Icon = SECTION_ICON_BY_HEADING[heading];
  return (
    <View style={sectionStyles.card}>
      <View style={sectionStyles.markerRow}>
        <View style={[sectionStyles.node, { borderColor: color }]}>
          {Icon ? <Icon color={color} /> : <View style={[sectionStyles.nodeDot, { backgroundColor: color }]} />}
        </View>
        <Text style={[sectionStyles.heading, { color }]}>{heading}</Text>
      </View>
      <Text style={sectionStyles.body}>{body}</Text>
    </View>
  );
};

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

// ─── Pros & Cons Component ───────────────────────────────────────────────────
// Deliberately breaks from every other section's per-diagram-type accent
// color: "advantage" and "disadvantage" are universal, instantly-readable
// concepts (green = good, red = caution) regardless of which diagram type
// this is, so tinting both lists the same theme color would blur exactly the
// distinction this section exists to draw. The thin two-tone bar under the
// title is a small "weighing both sides" motif — it's the one visual thread
// tying the two otherwise-independent columns together, the same job the
// StepsList connector line does for sequential steps.
const PROS_COLOR = '#15803d';
const PROS_TINT = '#f0fdf4';
const PROS_BORDER = '#bbf7d0';
const CONS_COLOR = '#b91c1c';
const CONS_TINT = '#fef2f2';
const CONS_BORDER = '#fecaca';

interface ProsConsColumnProps {
  label: string;
  items: string[];
  tint: string;
  border: string;
  accent: string;
}

const ProsConsColumn: React.FC<ProsConsColumnProps> = ({ label, items, tint, border, accent }) => (
  <View style={prosConsStyles.column}>
    <View style={[prosConsStyles.pill, { backgroundColor: tint, borderColor: border }]}>
      <Text style={[prosConsStyles.pillLabel, { color: accent }]}>{label}</Text>
    </View>
    {items.map((item, index) => (
      <View key={index} style={prosConsStyles.row}>
        <View style={[prosConsStyles.dot, { backgroundColor: accent }]} />
        <Text style={prosConsStyles.text}>{item}</Text>
      </View>
    ))}
  </View>
);

interface ProsConsCardProps {
  advantages: string[];
  disadvantages: string[];
  color: string;
}

const ProsConsCard: React.FC<ProsConsCardProps> = ({ advantages, disadvantages, color }) => (
  <View style={prosConsStyles.card}>
    <View style={sectionStyles.markerRow}>
      <View style={[sectionStyles.node, { borderColor: color }]}>
        <PlusMinusIcon color={color} />
      </View>
      <Text style={[sectionStyles.heading, { color }]}>Advantages &amp; Disadvantages</Text>
    </View>
    <View style={prosConsStyles.balanceBar}>
      <View style={[prosConsStyles.balanceHalf, { backgroundColor: PROS_COLOR }]} />
      <View style={[prosConsStyles.balanceHalf, { backgroundColor: CONS_COLOR }]} />
    </View>
    {/* flexWrap, not a fixed isDesktop prop: reflows to stacked columns based
        on this card's own rendered width (it sits inside a narrower sidebar
        column even on desktop), rather than the full window width. */}
    <View style={prosConsStyles.columns}>
      <ProsConsColumn
        label="Advantages"
        items={advantages}
        tint={PROS_TINT}
        border={PROS_BORDER}
        accent={PROS_COLOR}
      />
      <ProsConsColumn
        label="Disadvantages"
        items={disadvantages}
        tint={CONS_TINT}
        border={CONS_BORDER}
        accent={CONS_COLOR}
      />
    </View>
  </View>
);

const prosConsStyles = StyleSheet.create({
  card: {
    ...cardShell,
  },
  balanceBar: {
    flexDirection: 'row',
    height: 3,
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 18,
  },
  balanceHalf: {
    flex: 1,
  },
  columns: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 20,
  },
  column: {
    flexGrow: 1,
    flexBasis: 220,
    minWidth: 220,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 999,
    borderWidth: 1,
    marginBottom: 12,
  },
  pillLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.2,
    textTransform: 'uppercase',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 12,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    flexShrink: 0,
    marginTop: 8,
  },
  text: {
    flex: 1,
    fontSize: 14,
    color: '#334155',
    lineHeight: 22,
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
  // alignItems: 'stretch' (the default — no override needed) is what makes
  // the connector line actually reach the next node: without it,
  // stepMarkerCol only grows to its own natural content height (the 24px
  // node plus the connector's 18px minHeight) instead of stretching to
  // match stepText's full height, so the connector's flex: 1 has nothing
  // left to grow into and stops short, leaving a visible gap before the
  // next number instead of one continuous line.
  stepRow: {
    flexDirection: 'row',
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
    <View style={sectionStyles.markerRow}>
      <View style={[sectionStyles.node, { borderColor: color }]}>
        <LinkIcon color={color} />
      </View>
      <Text style={[referencesStyles.title, { color }]}>References</Text>
    </View>
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

  // Real reference images (the SDLC model screenshots) each have their own
  // aspect ratio, and most don't come anywhere close to 16:9. Forcing that
  // fixed ratio on the container while resizeMode="contain" fit the actual
  // image inside it left tall, hard white letterboxed bars above and below
  // on narrow screens, since the box's own white background showed through
  // the empty space. Sizing the box to the image's real aspect ratio instead
  // means there's no empty space to letterbox — the box's shape always
  // matches the image's shape exactly.
  //
  // A local require() of an image resolves to { uri, width, height } on
  // Metro's web output (confirmed by inspecting content.placeholderImage
  // directly — Image.resolveAssetSource itself isn't available on
  // react-native-web, and its onLoad event doesn't reliably carry natural
  // dimensions here either), so the real width/height are just read
  // straight off the resolved source, no load event needed.
  const heroImageAspectRatio = (() => {
    const source = content?.placeholderImage;
    if (source && typeof source === 'object' && !Array.isArray(source) && source.width && source.height) {
      return source.width / source.height;
    }
    return 16 / 9;
  })();

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

  // Always navigate back to the home screen.
  //
  // navigate, not replace: replace still mounts a brand-new instance of the
  // persistently-anchored (tabs) group on top of the existing one instead of
  // resurfacing the existing Home screen already sitting there — repeatedly
  // browsing reference diagrams from Home (open one, back, open another...)
  // stacked one more duplicate (extra Navbar, extra everything) on every
  // round trip. navigate reuses the existing route instead — see
  // savedDiagrams.tsx's handleBackPress for the full explanation.
  const handleGoHome = () => {
    router.navigate('/(tabs)/home');
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

        {content.advantages && content.disadvantages && (
          <ProsConsCard
            advantages={content.advantages}
            disadvantages={content.disadvantages}
            color={colors.primary}
          />
        )}

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

        {content.advantages && content.disadvantages && (
          <ProsConsCard
            advantages={content.advantages}
            disadvantages={content.disadvantages}
            color={colors.primary}
          />
        )}

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
          // Extra clearance on mobile so the last card isn't hidden behind
          // the floating docked bottom navbar (Navbar.tsx's bottomNavCard,
          // ~80px tall including padding and shadow) — same pattern as
          // home.tsx and reference.tsx already use.
          { paddingBottom: isDesktop ? 48 : 120 },
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
                  // height: 'auto' is load-bearing, not decorative — RN Web's
                  // Image injects a raw pixel height from the source asset's
                  // own dimensions ahead of this style array (see its
                  // imageSizeStyle), so without an explicit override here,
                  // that fixed height wins over aspectRatio below and the
                  // box never actually changes shape from image to image.
                  style={[styles.heroImage, { aspectRatio: heroImageAspectRatio, height: 'auto' }]}
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
    maxWidth: 640,
    aspectRatio: 16 / 9,
    alignSelf: 'center',
    borderRadius: 8,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  scrollContent: {
    flexGrow: 1,
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