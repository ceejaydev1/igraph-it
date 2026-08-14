import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Pressable,
  StyleSheet,
  LayoutAnimation,
  Platform,
  UIManager,
  useWindowDimensions,
  Keyboard,
  Animated,
  Easing,
} from 'react-native';
import { Svg, Path, Circle } from 'react-native-svg';
import { useRouter } from 'expo-router';
import { useOnboardingTour } from '../../hooks/useOnboardingTour';
import { REFERENCE_TOUR_ID, getReferenceTourSteps } from '../../utils/tours';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// ── Icons (same style as Home screen's search bar) ──────
const SearchIcon = () => (
  <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
    <Path
      d="M21 21L16.65 16.65M19 11C19 15.4183 15.4183 19 11 19C6.58172 19 3 15.4183 3 11C3 6.58172 6.58172 3 11 3C15.4183 3 19 6.58172 19 11Z"
      stroke="#ffffff"
      strokeWidth={2}
      strokeLinecap="round"
    />
  </Svg>
);

const ClearIcon = () => (
  <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="12" r="10" stroke="#8896b3" strokeWidth={1.5} />
    <Path d="M15 9L9 15M9 9L15 15" stroke="#8896b3" strokeWidth={1.8} strokeLinecap="round" />
  </Svg>
);

const EmptySearchIcon = () => (
  <Svg width={64} height={64} viewBox="0 0 24 24" fill="none">
    <Path
      d="M21 21L16.65 16.65M19 11C19 15.4183 15.4183 19 11 19C6.58172 19 3 15.4183 3 11C3 6.58172 6.58172 3 11 3C15.4183 3 19 6.58172 19 11Z"
      stroke="#cbd5e1"
      strokeWidth={1.5}
    />
  </Svg>
);

// No default color — every call site passes colors.primary explicitly, and a
// silent fallback here would just mask the day a call site forgets to.
// Always points down — ReferenceCard spins it with Animated on expand/collapse
// rather than swapping a second up/down path, the same idiom ShapesPanel.tsx
// already uses for its own category-expand arrow.
const ChevronIcon = ({ color }: { color: string }) => (
  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
    <Path
      d="M6 9L12 15L18 9"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const DotGrid = () => {
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

// ── Types ──────────────────────────────────────────────
type Category = 'All' | 'UML' | 'SDLC' | 'General Terms';

interface ReferenceTerm {
  id: string;
  term: string;
  category: Exclude<Category, 'All'>;
  definition: string;
}

// ── Data ──────────────────────────────────────────────
// Every UML and SDLC term below is the exact same real, researched term
// used in the Diagram Library (app/(tabs)/diagram/[id].tsx's DIAGRAM_CONTENT
// and SHAPES_BY_TITLE), with definitions condensed from that same content so
// the two screens never drift out of sync on what a term actually means.
// 10 UML diagram types + 9 SDLC models + 38 SDLC phases/steps (deduplicated
// across all 9 SDLC models' step lists) + 108 UML notation elements
// (deduplicated across all 10 UML diagram types' shape catalogs) + 3
// General Terms (verified to genuinely appear in both UML and SDLC content)
// = 168 topics.
const REFERENCE_DATA: ReferenceTerm[] = [
  // UML (10) — matches DIAGRAM_CONTENT ids 1 through 10
  {
    id: 'uml-1',
    term: 'Functional Decomposition Diagram',
    category: 'UML',
    definition:
      "A structural diagram, often abbreviated FDD, that breaks a system's overall function down into a hierarchy of smaller and smaller sub functions, showing what the system does at every level without describing how it does it.",
  },
  {
    id: 'uml-2',
    term: 'Flowchart',
    category: 'UML',
    definition:
      'A diagram that represents a process, algorithm, or workflow using standardized shapes, such as ovals for start and end, rectangles for steps, and diamonds for decisions, connected by arrows that show the order steps occur in.',
  },
  {
    id: 'uml-3',
    term: 'Data Flow Diagram',
    category: 'UML',
    definition:
      'A diagram, often abbreviated DFD, that shows how data moves through a system between processes, external entities, and data stores, rather than the order operations happen in.',
  },
  {
    id: 'uml-4',
    term: 'Entity Relationship Diagram',
    category: 'UML',
    definition:
      'A diagram, often abbreviated ERD, that models the entities in a system, their attributes, and the relationships between them, most often used to design a relational database.',
  },
  {
    id: 'uml-5',
    term: 'Fishbone Diagram',
    category: 'UML',
    definition:
      'Also called an Ishikawa Diagram or a cause and effect diagram, a visual tool that traces a problem back to its possible root causes, organized into major categories along a central spine.',
  },
  {
    id: 'uml-6',
    term: 'Schematic Diagram',
    category: 'UML',
    definition:
      'A diagram that represents an electrical or electronic circuit using standardized component symbols connected by lines representing wires, focusing on electrical connections rather than physical layout.',
  },
  {
    id: 'uml-7',
    term: 'Use Case Diagram',
    category: 'UML',
    definition:
      'A UML behavioral diagram that shows the goals, or use cases, different actors accomplish by interacting with a system, without describing how those goals are carried out.',
  },
  {
    id: 'uml-8',
    term: 'Activity Diagram',
    category: 'UML',
    definition:
      'A UML behavioral diagram that models the flow of actions and decisions in a process or workflow, including parallel paths through forks and joins.',
  },
  {
    id: 'uml-9',
    term: 'Sequence Diagram',
    category: 'UML',
    definition:
      'A UML interaction diagram that shows the order messages pass between objects over time, with each participant on a vertical lifeline read from top to bottom.',
  },
  {
    id: 'uml-10',
    term: 'Class Diagram',
    category: 'UML',
    definition:
      "A UML structural diagram that maps a system's classes, their attributes and operations, and the relationships between them into one static view.",
  },

  // SDLC (9) — matches DIAGRAM_CONTENT ids 11 through 19
  {
    id: 'sdlc-1',
    term: 'Waterfall Model',
    category: 'SDLC',
    definition:
      'The classic, linear approach to the SDLC, where the process is broken into distinct phases, such as Requirements Analysis and System Design, that must each be completed and reviewed in full before the next one begins.',
  },
  {
    id: 'sdlc-2',
    term: 'Modified Waterfall Model',
    category: 'SDLC',
    definition:
      'Also called the Sashimi Model, a variation of Waterfall that lets adjacent phases overlap and feed information back into one another so problems surface before final testing.',
  },
  {
    id: 'sdlc-3',
    term: 'Big Bang Model',
    category: 'SDLC',
    definition:
      'The simplest SDLC model, involving almost no planning at the start. Time, effort, and resources are simply put into development, and the product takes shape as requirements arrive.',
  },
  {
    id: 'sdlc-4',
    term: 'Prototype Model',
    category: 'SDLC',
    definition:
      'A systems development methodology in which a working, scaled down sample of the intended system is built, tested, and reworked until an acceptable prototype is reached, then the full system is developed from it.',
  },
  {
    id: 'sdlc-5',
    term: 'Agile Model',
    category: 'SDLC',
    definition:
      'Also called Agile Modeling, a lightweight, iterative approach that favors adapting to change over following a fixed plan, delivering work in small increments called sprints.',
  },
  {
    id: 'sdlc-6',
    term: 'Iterative Model',
    category: 'SDLC',
    definition:
      'An SDLC model that develops a system through repeated cycles, starting with a simple implementation of a small set of requirements and expanding it each pass.',
  },
  {
    id: 'sdlc-7',
    term: 'V Model',
    category: 'SDLC',
    definition:
      'Also called the Verification and Validation Model, an extension of Waterfall that pairs every development phase with a corresponding testing phase, forming a V shape when drawn out.',
  },
  {
    id: 'sdlc-8',
    term: 'Rapid Application Development',
    category: 'SDLC',
    definition:
      'Often abbreviated RAD, a methodology that emphasizes speed of development through extensive user involvement in building a series of functioning prototypes that evolve into the final system.',
  },
  {
    id: 'sdlc-9',
    term: 'Spiral Model',
    category: 'SDLC',
    definition:
      'An SDLC model that combines the features of the Prototyping and Waterfall models, showing the life cycle as a spiral that repeats planning, risk analysis, engineering, and evaluation until the project is complete.',
  },

  // SDLC Phases and Steps (38) — every distinct phase/step name used across
  // all 9 SDLC models' `steps` arrays in the Diagram Library (diagram/[id].tsx),
  // definitions condensed from that same content. Deduplicated only where the
  // exact phase name is identical across models (e.g. "System Design" is
  // shared word for word by Waterfall and Modified Waterfall); every other
  // step keeps its own entry since its wording genuinely differs by model.
  {
    id: 'step-requirements-analysis',
    term: 'Requirements Analysis',
    category: 'SDLC',
    definition: 'Gather and document everything the system needs to do before any design work begins. The first phase of the Waterfall Model.',
  },
  {
    id: 'step-system-design',
    term: 'System Design',
    category: 'SDLC',
    definition: 'Translate the requirements into a system architecture and detailed design. A phase shared by the Waterfall and Modified Waterfall Models.',
  },
  {
    id: 'step-implementation',
    term: 'Implementation',
    category: 'SDLC',
    definition: 'Write and test the code according to the design specification. A phase shared by the Waterfall and Modified Waterfall Models.',
  },
  {
    id: 'step-verification-testing',
    term: 'Verification and Testing',
    category: 'SDLC',
    definition: 'Test the completed system, or completed modules, against the original requirements to catch defects. A phase shared by the Waterfall and Modified Waterfall Models.',
  },
  {
    id: 'step-deployment-maintenance',
    term: 'Deployment and Maintenance',
    category: 'SDLC',
    definition: 'Release the system to users, then maintain it and fix issues as they surface. The final phase of the Waterfall and Modified Waterfall Models.',
  },
  {
    id: 'step-requirements-gathering-analysis',
    term: 'Requirements Gathering and Analysis',
    category: 'SDLC',
    definition: 'Define what the system needs to do before design work begins, while allowing the next phase to start before this one is fully signed off. The first phase of the Modified Waterfall (Sashimi) Model.',
  },
  {
    id: 'step-idea-generation',
    term: 'Idea Generation',
    category: 'SDLC',
    definition: 'Form a rough idea of what the product should do, without formal requirements documentation. The first step of the Big Bang Model.',
  },
  {
    id: 'step-development',
    term: 'Development',
    category: 'SDLC',
    definition: 'Start building immediately, adjusting direction as understanding of the requirements improves. A step in the Big Bang Model.',
  },
  {
    id: 'step-integration',
    term: 'Integration',
    category: 'SDLC',
    definition: 'Combine whatever modules or parts have been built into a working product. A step in the Big Bang Model.',
  },
  {
    id: 'step-testing-release',
    term: 'Testing and Release',
    category: 'SDLC',
    definition: 'Test the assembled product informally and release it, fixing defects as they are discovered. The final step of the Big Bang Model.',
  },
  {
    id: 'step-requirements-gathering',
    term: 'Requirements Gathering',
    category: 'SDLC',
    definition: 'Collect just enough basic requirements to understand what the prototype needs to demonstrate. The first step of the Prototype Model.',
  },
  {
    id: 'step-quick-design',
    term: 'Quick Design',
    category: 'SDLC',
    definition: 'Sketch a preliminary design focused on what will be visible to the user, not the full system architecture. A step in the Prototype Model.',
  },
  {
    id: 'step-build-prototype',
    term: 'Build the Prototype',
    category: 'SDLC',
    definition: 'Construct a working, but incomplete, version of the system based on the quick design. A step in the Prototype Model.',
  },
  {
    id: 'step-user-evaluation',
    term: 'User Evaluation',
    category: 'SDLC',
    definition: 'Let users interact with the prototype and gather their feedback on what works and what is missing. A step in the Prototype Model.',
  },
  {
    id: 'step-refine-finalize',
    term: 'Refine or Finalize',
    category: 'SDLC',
    definition: 'Rework the prototype based on feedback, repeating the cycle until it is accepted, then build the full system from it. The final step of the Prototype Model.',
  },
  {
    id: 'step-envision-plan',
    term: 'Envision and Plan',
    category: 'SDLC',
    definition: 'Define the overall product vision and build a prioritized backlog of features to work through. The first step of the Agile Model.',
  },
  {
    id: 'step-sprint-planning',
    term: 'Sprint Planning',
    category: 'SDLC',
    definition: 'Select a small batch of the highest priority work to complete in the upcoming iteration. A step in the Agile Model.',
  },
  {
    id: 'step-develop-build',
    term: 'Develop and Build',
    category: 'SDLC',
    definition: 'Design, build, and test one increment of working software during a sprint. A step in the Agile Model.',
  },
  {
    id: 'step-review-stakeholders',
    term: 'Review with Stakeholders',
    category: 'SDLC',
    definition: 'Demonstrate a completed increment and gather feedback from users and stakeholders. A step in the Agile Model.',
  },
  {
    id: 'step-reflect-adapt',
    term: 'Reflect and Adapt',
    category: 'SDLC',
    definition: "Adjust the backlog and the team's process based on what was learned, then repeat with the next sprint. The final step of each cycle in the Agile Model.",
  },
  {
    id: 'step-initial-planning',
    term: 'Initial Planning',
    category: 'SDLC',
    definition: 'Identify a small, useful subset of the overall requirements to build first. The first step of the Iterative Model.',
  },
  {
    id: 'step-design-development',
    term: 'Design and Development',
    category: 'SDLC',
    definition: 'Design, build, and test a subset of requirements as a working, if incomplete, version of the system. A step in the Iterative Model.',
  },
  {
    id: 'step-evaluation',
    term: 'Evaluation',
    category: 'SDLC',
    definition: 'Review the current version of the system with stakeholders and identify what to add or change next. A step in the Iterative Model.',
  },
  {
    id: 'step-refine-repeat',
    term: 'Refine and Repeat',
    category: 'SDLC',
    definition: 'Fold stakeholder feedback into the next iteration, and continue the cycle until the system is complete. The final step of each cycle in the Iterative Model.',
  },
  {
    id: 'step-vmodel-requirements-acceptance',
    term: 'Requirements Analysis / Acceptance Testing',
    category: 'SDLC',
    definition: 'Define what the system must do, and plan how that will ultimately be validated with users. The first phase pair of the V Model.',
  },
  {
    id: 'step-vmodel-system-design-testing',
    term: 'System Design / System Testing',
    category: 'SDLC',
    definition: 'Design the overall system, and plan the tests that will confirm it works as designed. A phase pair in the V Model.',
  },
  {
    id: 'step-vmodel-architecture-integration',
    term: 'Architecture Design / Integration Testing',
    category: 'SDLC',
    definition: 'Design how components fit together, and plan the tests that confirm they work correctly together. A phase pair in the V Model.',
  },
  {
    id: 'step-vmodel-module-unit',
    term: 'Module Design / Unit Testing',
    category: 'SDLC',
    definition: 'Design individual components in detail, and plan the tests for each one. A phase pair in the V Model.',
  },
  {
    id: 'step-coding',
    term: 'Coding',
    category: 'SDLC',
    definition: 'Implement the system according to the completed designs, at the bottom point of the V Model.',
  },
  {
    id: 'step-requirements-planning',
    term: 'Requirements Planning',
    category: 'SDLC',
    definition: 'Decide what functions the application should actually feature, working jointly with users. The first phase of Rapid Application Development.',
  },
  {
    id: 'step-user-design',
    term: 'User Design',
    category: 'SDLC',
    definition: 'Work through the design aspects that matter most to users, together with users, refining it through prototypes. A phase in Rapid Application Development.',
  },
  {
    id: 'step-construction',
    term: 'Construction',
    category: 'SDLC',
    definition: 'Further build out and enhance the designs created in the User Design phase into working software. A phase in Rapid Application Development.',
  },
  {
    id: 'step-cutover',
    term: 'Cutover',
    category: 'SDLC',
    definition: 'Replace the old application with the newly built one, completing the transition to the finished system. The final phase of Rapid Application Development.',
  },
  {
    id: 'step-determine-objectives',
    term: 'Determine Objectives',
    category: 'SDLC',
    definition: 'Identify the goals, alternatives, and constraints for a loop of the spiral. The first activity in each loop of the Spiral Model.',
  },
  {
    id: 'step-identify-resolve-risks',
    term: 'Identify and Resolve Risks',
    category: 'SDLC',
    definition: 'Analyze the risks involved and work through strategies to resolve or mitigate them. An activity in each loop of the Spiral Model.',
  },
  {
    id: 'step-develop-test',
    term: 'Develop and Test',
    category: 'SDLC',
    definition: 'Build and verify the next version of the product for a loop of the spiral, whether that is a prototype or a more complete release. An activity in each loop of the Spiral Model.',
  },
  {
    id: 'step-plan-next-loop',
    term: 'Plan the Next Loop',
    category: 'SDLC',
    definition: 'Review progress with stakeholders and plan the next pass around the spiral. An activity in each loop of the Spiral Model.',
  },
  {
    id: 'step-repeat-until-complete',
    term: 'Repeat Until Complete',
    category: 'SDLC',
    definition: "Continue looping through the same activities, refining the system each time, until it's ready for final release. How the Spiral Model's loops conclude.",
  },

  // UML Notation Elements (108) — every distinct shape/element name used
  // across the Diagram Library's SHAPES_BY_TITLE catalog (diagram/[id].tsx),
  // definitions taken verbatim from that same source so this glossary and
  // the diagram detail pages never disagree on what a shape means. Where a
  // name is reused by more than one diagram type with the exact same
  // meaning (e.g. "Note", "On-Page Connector"), it appears once here. Where
  // the same name means something genuinely different per diagram type
  // (e.g. "Process" in a Flowchart vs. a Data Flow Diagram), the term name
  // is qualified with its diagram type so both stay accurate.
  {
    id: 'shape-fdd-function',
    term: 'Function',
    category: 'UML',
    definition: 'A rounded box naming one function or sub function the system performs. Used in Functional Decomposition Diagrams.',
  },
  {
    id: 'shape-fdd-control',
    term: 'Control',
    category: 'UML',
    definition: 'An arrow entering the top of a function, showing the rule or condition that governs how it runs. Used in Functional Decomposition Diagrams.',
  },
  {
    id: 'shape-fdd-mechanism',
    term: 'Mechanism',
    category: 'UML',
    definition: 'An arrow entering the bottom of a function, showing the resource that actually carries it out. Used in Functional Decomposition Diagrams.',
  },
  {
    id: 'shape-fdd-interface',
    term: 'Interface',
    category: 'UML',
    definition: 'A line marking a point where a function exchanges information with something outside it. Used in Functional Decomposition Diagrams.',
  },
  {
    id: 'shape-fdd-boundary',
    term: 'Boundary',
    category: 'UML',
    definition: 'A dashed rectangle marking what falls inside the system being modeled. Used in Functional Decomposition Diagrams.',
  },
  {
    id: 'shape-fdd-note',
    term: 'Note (Functional Decomposition Diagram)',
    category: 'UML',
    definition: 'A folded corner box for adding notes and assumptions alongside a Functional Decomposition Diagram.',
  },
  {
    id: 'shape-fdd-external-entity',
    term: 'External Entity (Functional Decomposition Diagram)',
    category: 'UML',
    definition: 'An oval representing a system or person outside the boundary that a function interacts with.',
  },
  {
    id: 'shape-flow-terminator',
    term: 'Terminator',
    category: 'UML',
    definition: 'A rounded shape marking where a process begins or ends. Used in Flowcharts.',
  },
  {
    id: 'shape-flow-process',
    term: 'Process (Flowchart)',
    category: 'UML',
    definition: 'A rectangle representing one processing step or action.',
  },
  {
    id: 'shape-flow-io',
    term: 'Input / Output',
    category: 'UML',
    definition: 'A parallelogram marking data going into or coming out of a process. Used in Flowcharts.',
  },
  {
    id: 'shape-decision',
    term: 'Decision',
    category: 'UML',
    definition: 'A diamond that branches the flow based on a condition. In a Flowchart it typically poses a yes or no question; in a UML Activity Diagram it branches based on whatever condition applies.',
  },
  {
    id: 'shape-on-page-connector',
    term: 'On-Page Connector',
    category: 'UML',
    definition: 'A small circle linking flow that continues elsewhere on the same page. Used in Flowcharts and Data Flow Diagrams.',
  },
  {
    id: 'shape-off-page-connector',
    term: 'Off-Page Connector',
    category: 'UML',
    definition: 'A pentagon marking where the flow continues on a different page. Used in Flowcharts and Data Flow Diagrams.',
  },
  {
    id: 'shape-merge-junction',
    term: 'Merge',
    category: 'UML',
    definition: 'A small point where two or more flow lines converge back into one. Used in Flowcharts.',
  },
  {
    id: 'shape-flow-line',
    term: 'Flow Line',
    category: 'UML',
    definition: 'An arrow showing the order the steps of a Flowchart execute in.',
  },
  {
    id: 'shape-flow-document',
    term: 'Document',
    category: 'UML',
    definition: 'A shape representing a single printed document produced by a step. Used in Flowcharts.',
  },
  {
    id: 'shape-flow-database',
    term: 'Database',
    category: 'UML',
    definition: 'A cylinder representing a place data is stored. Used in Flowcharts.',
  },
  {
    id: 'shape-flow-predefined',
    term: 'Predefined Process',
    category: 'UML',
    definition: 'A rectangle representing a call out to a separate, already defined sub process. Used in Flowcharts.',
  },
  {
    id: 'shape-flow-manual-input',
    term: 'Manual Input',
    category: 'UML',
    definition: 'A shape marking a step where data is typed or entered by hand. Used in Flowcharts.',
  },
  {
    id: 'shape-flow-delay',
    term: 'Delay',
    category: 'UML',
    definition: 'A shape marking a deliberate pause or waiting period before the flow continues. Used in Flowcharts.',
  },
  {
    id: 'shape-flow-preparation',
    term: 'Preparation',
    category: 'UML',
    definition: 'A hexagon marking a setup or initialization step that runs before the main process. Used in Flowcharts.',
  },
  {
    id: 'shape-flow-display',
    term: 'Display',
    category: 'UML',
    definition: 'A shape representing information being shown to a user, for example on a screen. Used in Flowcharts.',
  },
  {
    id: 'shape-flow-annotation',
    term: 'Annotation',
    category: 'UML',
    definition: 'A bracket style note attached to a step to explain it further. Used in Flowcharts.',
  },
  {
    id: 'shape-dfd-process',
    term: 'Process (Data Flow Diagram)',
    category: 'UML',
    definition: 'A circle representing a step that transforms incoming data into outgoing data.',
  },
  {
    id: 'shape-dfd-data-flow',
    term: 'Data Flow',
    category: 'UML',
    definition: 'An arrow showing data moving between entities, processes, and stores. Used in Data Flow Diagrams.',
  },
  {
    id: 'shape-dfd-data-store-yourdon',
    term: 'Data Store (Yourdon)',
    category: 'UML',
    definition: 'Two parallel lines representing a place where data is held at rest, the Yourdon notation for a Data Flow Diagram.',
  },
  {
    id: 'shape-dfd-data-store-gane',
    term: 'Data Store (Gane and Sarson)',
    category: 'UML',
    definition: 'A rectangle with a side line, the Gane and Sarson notation for a place data is held at rest in a Data Flow Diagram.',
  },
  {
    id: 'shape-dfd-external-entity',
    term: 'External Entity (Data Flow Diagram)',
    category: 'UML',
    definition: 'A rectangle representing a source or destination outside the system, like a user or another system.',
  },
  {
    id: 'shape-dfd-bidirectional',
    term: 'Bidirectional Flow',
    category: 'UML',
    definition: 'An arrow with heads on both ends, showing data moving in both directions at once. Used in Data Flow Diagrams.',
  },
  {
    id: 'shape-dfd-system-boundary',
    term: 'System Boundary (Data Flow Diagram)',
    category: 'UML',
    definition: 'A dashed rectangle marking what falls inside the system being modeled.',
  },
  {
    id: 'shape-note',
    term: 'Note',
    category: 'UML',
    definition: 'A box for attaching a comment or clarification to a diagram. Used in Data Flow Diagrams, Fishbone Diagrams, Use Case Diagrams, Activity Diagrams, Sequence Diagrams, and Class Diagrams.',
  },
  {
    id: 'shape-erd-entity',
    term: 'Entity',
    category: 'UML',
    definition: 'A rectangle representing a table or object type, like Customer or Order. Used in Entity Relationship Diagrams.',
  },
  {
    id: 'shape-erd-weak-entity',
    term: 'Weak Entity',
    category: 'UML',
    definition: "An entity that can't be uniquely identified without the entity it depends on. Used in Entity Relationship Diagrams.",
  },
  {
    id: 'shape-erd-relationship',
    term: 'Relationship',
    category: 'UML',
    definition: 'A diamond describing how two entities interact, like "places" or "contains". Used in Entity Relationship Diagrams.',
  },
  {
    id: 'shape-erd-identifying-rel',
    term: 'Identifying Relationship',
    category: 'UML',
    definition: 'A double diamond linking a weak entity to the stronger entity it depends on. Used in Entity Relationship Diagrams.',
  },
  {
    id: 'shape-erd-attribute',
    term: 'Attribute',
    category: 'UML',
    definition: 'An oval naming a single property that belongs to an entity. Used in Entity Relationship Diagrams.',
  },
  {
    id: 'shape-erd-multivalued-attr',
    term: 'Multivalued Attribute',
    category: 'UML',
    definition: 'A double oval marking an attribute that can hold more than one value at once. Used in Entity Relationship Diagrams.',
  },
  {
    id: 'shape-erd-derived-attr',
    term: 'Derived Attribute',
    category: 'UML',
    definition: "A dashed oval marking an attribute that's calculated from other attributes rather than stored directly. Used in Entity Relationship Diagrams.",
  },
  {
    id: 'shape-erd-card-11',
    term: 'Cardinality (1:1)',
    category: 'UML',
    definition: 'Marks a relationship where each record on one side matches exactly one record on the other. Used in Entity Relationship Diagrams.',
  },
  {
    id: 'shape-erd-card-1n',
    term: 'Cardinality (1:N)',
    category: 'UML',
    definition: 'Marks a relationship where one record on one side can match many records on the other. Used in Entity Relationship Diagrams.',
  },
  {
    id: 'shape-erd-card-n1',
    term: 'Cardinality (N:1)',
    category: 'UML',
    definition: 'Marks a relationship where many records on one side match a single record on the other. Used in Entity Relationship Diagrams.',
  },
  {
    id: 'shape-erd-card-mn',
    term: 'Cardinality (M:N)',
    category: 'UML',
    definition: 'Marks a relationship where many records on each side can match many records on the other. Used in Entity Relationship Diagrams.',
  },
  {
    id: 'shape-erd-connector',
    term: 'Connector (Entity Relationship Diagram)',
    category: 'UML',
    definition: 'A line joining entities, attributes, and relationships together.',
  },
  {
    id: 'shape-fishbone-spine',
    term: 'Spine',
    category: 'UML',
    definition: 'The main arrow running to the effect box of a Fishbone Diagram, forming the backbone the rest of the diagram branches off of.',
  },
  {
    id: 'shape-fishbone-head',
    term: 'Fish Head',
    category: 'UML',
    definition: 'The pointed shape at the head of a Fishbone Diagram spine, naming the problem or effect being investigated.',
  },
  {
    id: 'shape-fishbone-effect-box',
    term: 'Effect Box',
    category: 'UML',
    definition: 'The box naming the specific problem being analyzed in a Fishbone Diagram.',
  },
  {
    id: 'shape-fishbone-main-cause',
    term: 'Main Cause',
    category: 'UML',
    definition: 'A diagonal branch off the spine of a Fishbone Diagram, above or below it, representing one major cause category.',
  },
  {
    id: 'shape-fishbone-cause-arrow',
    term: 'Cause Arrow',
    category: 'UML',
    definition: 'An arrow linking a cause label to the bone it belongs to in a Fishbone Diagram.',
  },
  {
    id: 'shape-fishbone-possible-cause',
    term: 'Possible Cause',
    category: 'UML',
    definition: "A dashed arrow linking a cause that's suspected but not yet confirmed. Used in Fishbone Diagrams.",
  },
  {
    id: 'shape-fishbone-category-box',
    term: 'Category Box',
    category: 'UML',
    definition: 'A small box labeling a cause category, like "People" or "Process". Used in Fishbone Diagrams.',
  },
  {
    id: 'shape-fishbone-cause-bubble',
    term: 'Cause Bubble',
    category: 'UML',
    definition: 'An oval calling out a specific cause or reason in a Fishbone Diagram.',
  },
  {
    id: 'shape-schem-dc',
    term: 'DC Voltage Source',
    category: 'UML',
    definition: 'Represents a battery supplying a constant voltage to a circuit. Used in Schematic Diagrams.',
  },
  {
    id: 'shape-schem-ac',
    term: 'AC Voltage Source',
    category: 'UML',
    definition: 'Represents a source supplying alternating current to a circuit. Used in Schematic Diagrams.',
  },
  {
    id: 'shape-schem-ground',
    term: 'Ground',
    category: 'UML',
    definition: "Marks a circuit's reference, zero voltage point. Used in Schematic Diagrams.",
  },
  {
    id: 'shape-schem-resistor',
    term: 'Resistor',
    category: 'UML',
    definition: 'Represents a component that resists and limits the flow of current. Used in Schematic Diagrams.',
  },
  {
    id: 'shape-schem-var-resistor',
    term: 'Variable Resistor',
    category: 'UML',
    definition: 'Represents a resistor whose resistance can be adjusted. Used in Schematic Diagrams.',
  },
  {
    id: 'shape-schem-capacitor',
    term: 'Capacitor',
    category: 'UML',
    definition: 'Represents a component that stores electrical charge. Used in Schematic Diagrams.',
  },
  {
    id: 'shape-schem-inductor',
    term: 'Inductor',
    category: 'UML',
    definition: 'Represents a coil that stores energy in a magnetic field. Used in Schematic Diagrams.',
  },
  {
    id: 'shape-schem-diode',
    term: 'Diode',
    category: 'UML',
    definition: 'Represents a component that only lets current flow in one direction. Used in Schematic Diagrams.',
  },
  {
    id: 'shape-schem-led',
    term: 'LED',
    category: 'UML',
    definition: 'Represents a diode that emits light when current passes through it. Used in Schematic Diagrams.',
  },
  {
    id: 'shape-schem-npn',
    term: 'NPN Transistor',
    category: 'UML',
    definition: 'Represents a transistor used to switch or amplify current in a circuit. Used in Schematic Diagrams.',
  },
  {
    id: 'shape-schem-switch',
    term: 'Switch',
    category: 'UML',
    definition: 'Represents a control that opens or closes a circuit. Used in Schematic Diagrams.',
  },
  {
    id: 'shape-schem-fuse',
    term: 'Fuse',
    category: 'UML',
    definition: 'Represents a safety component that breaks a circuit if current gets too high. Used in Schematic Diagrams.',
  },
  {
    id: 'shape-schem-wire-connection',
    term: 'Wire Connection',
    category: 'UML',
    definition: 'Marks a point where two crossing wires are actually joined together. Used in Schematic Diagrams.',
  },
  {
    id: 'shape-schem-no-connection',
    term: 'No Connection',
    category: 'UML',
    definition: 'Marks two wires that cross paths on a Schematic Diagram without electrically connecting.',
  },
  {
    id: 'shape-actor',
    term: 'Actor',
    category: 'UML',
    definition: 'A stick figure representing a person or external system taking part in a diagram. In a Use Case Diagram, someone interacting with the system; in a Sequence Diagram, whoever starts the interaction, with its own lifeline running down the diagram.',
  },
  {
    id: 'shape-usecase-usecase',
    term: 'Use Case (element)',
    category: 'UML',
    definition: 'An oval naming a single goal a user accomplishes with the system. The individual notation element inside a Use Case Diagram.',
  },
  {
    id: 'shape-usecase-boundary',
    term: 'System Boundary (Use Case Diagram)',
    category: 'UML',
    definition: 'A frame separating what the system does from the actors around it.',
  },
  {
    id: 'shape-usecase-database',
    term: 'Database (Use Case Diagram)',
    category: 'UML',
    definition: 'A cylinder representing data storage a use case reads from or writes to.',
  },
  {
    id: 'shape-usecase-association',
    term: 'Association (Use Case Diagram)',
    category: 'UML',
    definition: 'A line connecting an actor to the use cases it takes part in.',
  },
  {
    id: 'shape-usecase-include',
    term: 'Include',
    category: 'UML',
    definition: 'A dashed arrow showing a use case that always runs the steps of another use case.',
  },
  {
    id: 'shape-usecase-extend',
    term: 'Extend',
    category: 'UML',
    definition: 'A dashed arrow showing a use case that optionally adds extra steps to another.',
  },
  {
    id: 'shape-usecase-generalization',
    term: 'Generalization (Use Case Diagram)',
    category: 'UML',
    definition: 'An arrow showing one actor or use case is a specialized version of another.',
  },
  {
    id: 'shape-note-connector',
    term: 'Note Connector',
    category: 'UML',
    definition: 'A line linking a note to the element it explains. Used in Use Case Diagrams and Class Diagrams.',
  },
  {
    id: 'shape-usecase-include-label',
    term: 'Include Label',
    category: 'UML',
    definition: 'The «include» text tag placed on an Include relationship in a Use Case Diagram.',
  },
  {
    id: 'shape-usecase-extend-label',
    term: 'Extend Label',
    category: 'UML',
    definition: 'The «extend» text tag placed on an Extend relationship in a Use Case Diagram.',
  },
  {
    id: 'shape-activity-initial',
    term: 'Initial Node',
    category: 'UML',
    definition: 'A filled circle marking where an Activity Diagram flow begins.',
  },
  {
    id: 'shape-activity-action',
    term: 'Action',
    category: 'UML',
    definition: 'A rounded rectangle for one action being carried out in an Activity Diagram.',
  },
  {
    id: 'shape-activity-fork',
    term: 'Fork',
    category: 'UML',
    definition: 'A bar splitting one flow into several paths that run in parallel. Used in Activity Diagrams.',
  },
  {
    id: 'shape-activity-join',
    term: 'Join',
    category: 'UML',
    definition: 'A bar where multiple parallel paths synchronize back into a single flow. Used in Activity Diagrams.',
  },
  {
    id: 'shape-activity-control-flow',
    term: 'Control Flow',
    category: 'UML',
    definition: 'An arrow showing the order activities execute in. Used in Activity Diagrams.',
  },
  {
    id: 'shape-activity-object-flow',
    term: 'Object Flow',
    category: 'UML',
    definition: 'A dashed arrow showing an object passing from one activity to another.',
  },
  {
    id: 'shape-activity-swimlane',
    term: 'Swimlane',
    category: 'UML',
    definition: "A frame dividing an Activity Diagram into columns by who's responsible for each activity.",
  },
  {
    id: 'shape-activity-final',
    term: 'Activity Final',
    category: 'UML',
    definition: 'A ringed circle marking where an entire Activity Diagram flow ends.',
  },
  {
    id: 'shape-activity-flow-final',
    term: 'Flow Final',
    category: 'UML',
    definition: 'A circle marking where one branch of an Activity Diagram flow ends, without ending the whole activity.',
  },
  {
    id: 'shape-activity-constraint',
    term: 'Constraint',
    category: 'UML',
    definition: 'A dashed note attaching a rule or condition the flow must satisfy. Used in Activity Diagrams.',
  },
  {
    id: 'shape-seq-lifeline',
    term: 'Lifeline',
    category: 'UML',
    definition: 'A dashed vertical line tracking one participant through time, top to bottom, in a Sequence Diagram.',
  },
  {
    id: 'shape-seq-activation',
    term: 'Activation',
    category: 'UML',
    definition: 'A thin bar on a lifeline showing when that participant is actively processing. Used in Sequence Diagrams.',
  },
  {
    id: 'shape-seq-destroy',
    term: 'Destroy',
    category: 'UML',
    definition: 'An X marking the point where an object is destroyed and its lifeline ends. Used in Sequence Diagrams.',
  },
  {
    id: 'shape-seq-sync',
    term: 'Sync Message',
    category: 'UML',
    definition: 'A solid arrow for a call that waits for a response before the sender continues. Used in Sequence Diagrams.',
  },
  {
    id: 'shape-seq-async',
    term: 'Async Message',
    category: 'UML',
    definition: 'An arrow for a call that continues immediately without waiting for a response. Used in Sequence Diagrams.',
  },
  {
    id: 'shape-seq-return',
    term: 'Return',
    category: 'UML',
    definition: 'A dashed arrow showing a reply heading back to whoever made the call. Used in Sequence Diagrams.',
  },
  {
    id: 'shape-seq-alt',
    term: 'ALT Fragment',
    category: 'UML',
    definition: 'A frame showing alternative paths, where only one branch runs depending on a condition. Used in Sequence Diagrams.',
  },
  {
    id: 'shape-seq-opt',
    term: 'OPT Fragment',
    category: 'UML',
    definition: 'A frame showing a section that only runs if a condition is met. Used in Sequence Diagrams.',
  },
  {
    id: 'shape-seq-loop',
    term: 'LOOP Fragment',
    category: 'UML',
    definition: 'A frame showing a section that repeats for as long as a condition holds. Used in Sequence Diagrams.',
  },
  {
    id: 'shape-seq-par',
    term: 'PAR Fragment',
    category: 'UML',
    definition: 'A frame showing sections that all run at the same time. Used in Sequence Diagrams.',
  },
  {
    id: 'shape-seq-break',
    term: 'BREAK Fragment',
    category: 'UML',
    definition: 'A frame showing a section that, once triggered, skips the rest of the interaction. Used in Sequence Diagrams.',
  },
  {
    id: 'shape-class-class',
    term: 'Class (element)',
    category: 'UML',
    definition: 'A rectangle split into name, attributes, and methods, the blueprint for an object in a Class Diagram.',
  },
  {
    id: 'shape-class-association',
    term: 'Association (Class Diagram)',
    category: 'UML',
    definition: 'A plain line showing two classes are related, without implying direction.',
  },
  {
    id: 'shape-class-directed-association',
    term: 'Directed Association',
    category: 'UML',
    definition: 'An arrow showing a relationship that only one of the two classes is aware of. Used in Class Diagrams.',
  },
  {
    id: 'shape-class-aggregation',
    term: 'Aggregation',
    category: 'UML',
    definition: 'A hollow diamond for a "has a" relationship where the part can outlive the whole. Used in Class Diagrams.',
  },
  {
    id: 'shape-class-composition',
    term: 'Composition',
    category: 'UML',
    definition: 'A filled diamond for a stronger "owns a" bond, where the part is destroyed along with the whole. Used in Class Diagrams.',
  },
  {
    id: 'shape-class-dependency',
    term: 'Dependency',
    category: 'UML',
    definition: 'A dashed arrow showing one class relies on another without holding a lasting reference to it. Used in Class Diagrams.',
  },
  {
    id: 'shape-class-generalization',
    term: 'Generalization (Class Diagram)',
    category: 'UML',
    definition: 'A hollow triangle arrow pointing from a subclass up to its parent class.',
  },
  {
    id: 'shape-class-realization',
    term: 'Realization',
    category: 'UML',
    definition: 'A dashed arrow with a hollow triangle head, showing a class implementing the behavior an interface promises. Used in Class Diagrams.',
  },
  {
    id: 'shape-class-mult-1',
    term: 'Multiplicity: Exactly One',
    category: 'UML',
    definition: 'Marks a multiplicity of exactly one in a Class Diagram relationship.',
  },
  {
    id: 'shape-class-mult-01',
    term: 'Multiplicity: Zero or One',
    category: 'UML',
    definition: 'Marks a multiplicity of zero or one, meaning the relationship is optional, in a Class Diagram.',
  },
  {
    id: 'shape-class-mult-many',
    term: 'Multiplicity: Zero or More',
    category: 'UML',
    definition: 'Marks a multiplicity of zero or more, any number at all including none, in a Class Diagram.',
  },
  {
    id: 'shape-class-mult-1many',
    term: 'Multiplicity: One or More',
    category: 'UML',
    definition: 'Marks a multiplicity of one or more, at least one is required, in a Class Diagram.',
  },
  {
    id: 'shape-class-mult-range',
    term: 'Multiplicity: Range',
    category: 'UML',
    definition: 'Marks a multiplicity bounded between a minimum and maximum count in a Class Diagram.',
  },
  {
    id: 'shape-class-mult-n',
    term: 'Multiplicity: Exactly N',
    category: 'UML',
    definition: 'Marks a multiplicity of exactly some fixed number, n, in a Class Diagram.',
  },

  // General Terms (3) — concepts that genuinely show up in both a UML
  // entry's content and an SDLC entry's content in the Diagram Library
  // (verified by grep across diagram/[id].tsx), not invented separately.
  // "Requirements Analysis" and "System Design" (the old placeholders here)
  // were removed since they're already covered for real under SDLC (see
  // step-requirements-analysis and step-system-design above).
  {
    id: 'gen-requirements',
    term: 'Requirements',
    category: 'General Terms',
    definition:
      'What a system needs to do, gathered and analyzed early in a project. Several SDLC models build an explicit phase around this: Waterfall opens with Requirements Analysis, RAD with Requirements Planning, Prototype and Big Bang with lighter requirements gathering. In UML, a Use Case Diagram is specifically used to capture functional requirements by showing the goals different actors accomplish with a system.',
  },
  {
    id: 'gen-structure',
    term: 'Structure',
    category: 'General Terms',
    definition:
      "What a system is made of, as opposed to how it behaves over time or in what order things happen. In UML, structural diagrams such as the Class Diagram, Functional Decomposition Diagram, and Entity Relationship Diagram map out a system's structure directly. In SDLC, a model's own structure, its sequence and discipline of phases, is part of what distinguishes something like the Modified Waterfall Model from strict Waterfall.",
  },
  {
    id: 'gen-documentation',
    term: 'Documentation',
    category: 'General Terms',
    definition:
      "Written records that capture a system's design, requirements, or process. UML diagrams such as the Class Diagram and Flowchart double as living documentation of a system's structure or logic. In SDLC, models such as Waterfall produce thorough documentation at every phase, while lighter weight models like Agile deliberately trade off some upfront documentation for speed and flexibility.",
  },
];

const CATEGORIES: Category[] = ['All', 'UML', 'SDLC', 'General Terms'];

// Mirrors Home screen's TYPE_COLORS so the same category reads as the same color across screens.
const CATEGORY_COLORS: Record<Exclude<Category, 'All'>, { primary: string; light: string }> = {
  UML: { primary: '#4c6fff', light: '#eef2ff' },
  SDLC: { primary: '#10b981', light: '#ecfdf5' },
  'General Terms': { primary: '#8b5cf6', light: '#f5f3ff' },
};

// ── Term card ──────────────────────────────────────────
const ReferenceCard = ({
  item,
  index,
  isExpanded,
  onToggle,
}: {
  item: ReferenceTerm;
  index: number;
  isExpanded: boolean;
  onToggle: () => void;
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const colors = CATEGORY_COLORS[item.category];

  // Entrance: fades/slides in once per mount, staggered by list position —
  // capped at 10 so a long filtered list doesn't leave the last cards
  // waiting a second before they're even visible.
  const mountAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(mountAnim, {
      toValue: 1,
      duration: 320,
      delay: Math.min(index, 10) * 35,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
    // Runs once per mount only — re-fires naturally if filtering unmounts
    // and later remounts this card, which reads as a nice "it's back" cue.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Chevron spin — same rotate-a-down-arrow idiom as ShapesPanel.tsx's own
  // category-expand arrow, so both screens share one interaction language.
  const chevronSpin = useRef(new Animated.Value(isExpanded ? 1 : 0)).current;
  useEffect(() => {
    Animated.timing(chevronSpin, {
      toValue: isExpanded ? 1 : 0,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [isExpanded]);
  const chevronRotate = chevronSpin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] });

  // Tactile press feedback, same spring values as the diagram detail page's
  // Shapes Used badges — a light touch since these cards are already large
  // tap targets, not the primary signal (hover/pressed opacity still carry that).
  const pressScale = useRef(new Animated.Value(1)).current;
  const handlePressIn = () => {
    Animated.spring(pressScale, { toValue: 0.985, useNativeDriver: true, speed: 30, bounciness: 4 }).start();
  };
  const handlePressOut = () => {
    Animated.spring(pressScale, { toValue: 1, useNativeDriver: true, speed: 20, bounciness: 6 }).start();
  };

  return (
    <Animated.View
      style={{
        opacity: mountAnim,
        transform: [
          { translateY: mountAnim.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) },
          { scale: pressScale },
        ],
      }}
    >
      <Pressable
        onPress={onToggle}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={({ pressed }) => [
          styles.card,
          isHovered && styles.cardHovered,
          pressed && styles.cardPressed,
        ]}
        accessibilityRole="button"
        accessibilityLabel={`${item.term}, ${item.category}`}
        accessibilityHint={isExpanded ? 'Collapses the definition' : 'Expands the definition'}
        accessibilityState={{ expanded: isExpanded }}
        // @ts-ignore - React Native Web specific props
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <View style={styles.cardHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTerm}>{item.term}</Text>
            <View style={[styles.categoryBadge, { backgroundColor: colors.light }]}>
              <Text style={[styles.categoryBadgeText, { color: colors.primary }]}>
                {item.category}
              </Text>
            </View>
          </View>
          <Animated.View style={{ transform: [{ rotate: chevronRotate }] }}>
            <ChevronIcon color={colors.primary} />
          </Animated.View>
        </View>
        {isExpanded && (
          <>
            <View style={styles.cardDivider} />
            <Text style={styles.cardDefinition}>{item.definition}</Text>
          </>
        )}
      </Pressable>
    </Animated.View>
  );
};

// ── Component ──────────────────────────────────────────
export default function LearningReference() {
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<Category>('All');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const inputRef = useRef<TextInput>(null);
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;
  const router = useRouter();

  // The list was a single centered column capped at 720px wide no matter
  // how wide the viewport got — fine when there were only a couple dozen
  // terms, but with 168 real terms now in REFERENCE_DATA it turned desktop
  // into a lot of scrolling past unused space on both sides. Same
  // column-count-then-derive-card-width approach as home.tsx's diagram
  // grid, just without that screen's FlatList/virtualization since this
  // list's cards are variable-height (accordion expand) and a plain
  // wrapping flexbox handles that more simply.
  const GRID_GAP = 12;
  const numColumns = width >= 1440 ? 3 : width >= 768 ? 2 : 1;
  const gridMaxWidth = numColumns === 3 ? 1200 : numColumns === 2 ? 860 : 720;
  const gridPadding = 16;
  const availableGridWidth = Math.min(width, gridMaxWidth) - gridPadding * 2;
  const cardWidth =
    numColumns === 1 ? '100%' : (availableGridWidth - GRID_GAP * (numColumns - 1)) / numColumns;

  const referenceTourSteps = useMemo(() => getReferenceTourSteps({ router }), [router]);
  useOnboardingTour(REFERENCE_TOUR_ID, referenceTourSteps);

  const filteredTerms = useMemo(() => {
    const query = search.trim().toLowerCase();
    return REFERENCE_DATA.filter((item) => {
      const matchesCategory = activeCategory === 'All' || item.category === activeCategory;
      // Matches the definition too, not just the term name — someone
      // searching a concept they half-remember ("iterative", "sprint")
      // shouldn't have to already know the exact term title to find it.
      const matchesSearch =
        item.term.toLowerCase().includes(query) || item.definition.toLowerCase().includes(query);
      return matchesCategory && matchesSearch;
    });
  }, [search, activeCategory]);

  const toggleExpand = (id: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const handleClearSearch = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setSearch('');
    if (Platform.OS === 'web') inputRef.current?.focus();
  };

  // Live filtering already does the actual search on every keystroke — this
  // just confirms the action (dismisses the keyboard) so "Search" on the
  // keyboard/the button isn't a dead end. Matches Home screen's identical
  // handleSearchSubmit, which this search bar was copied from.
  const handleSearchSubmit = () => {
    Keyboard.dismiss();
  };

  return (
    <View style={styles.container}>
      <DotGrid />

      {/* Header — centered */}
      <View style={styles.headerSection}>
        {/* Search Bar — same pattern as Home screen */}
        <View nativeID="tour-reference-search" style={styles.searchBarContainer}>
          <View style={styles.searchBar}>
            <TextInput
              ref={inputRef}
              style={styles.searchInput}
              placeholder="Search a term (e.g. Class Diagram)"
              placeholderTextColor="#94a3b8"
              value={search}
              onChangeText={setSearch}
              autoCapitalize="none"
              returnKeyType="search"
              onSubmitEditing={handleSearchSubmit}
              accessibilityLabel="Search reference terms"
            />
            {search.length > 0 && (
              <Pressable
                onPress={handleClearSearch}
                style={({ pressed }) => [styles.clearButton, pressed && styles.clearButtonPressed]}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityRole="button"
                accessibilityLabel="Clear search"
              >
                <ClearIcon />
              </Pressable>
            )}
            <Pressable
              style={({ pressed }) => [styles.searchButton, pressed && styles.searchButtonPressed]}
              onPress={handleSearchSubmit}
              accessibilityRole="button"
              accessibilityLabel="Search"
            >
              <SearchIcon />
            </Pressable>
          </View>
        </View>

        {/* Category Filter Tabs — centered, wraps instead of horizontal scroll */}
        <View nativeID="tour-reference-categories" style={styles.tabsRow}>
          {CATEGORIES.map((cat) => {
            const isActive = activeCategory === cat;
            return (
              <Pressable
                key={cat}
                onPress={() => setActiveCategory(cat)}
                style={[styles.categoryChip, isActive && styles.categoryChipActive]}
                accessibilityRole="tab"
                accessibilityLabel={`${cat} category`}
                accessibilityState={{ selected: isActive }}
              >
                <Text style={[styles.categoryChipText, isActive && styles.categoryChipTextActive]}>
                  {cat}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {search.length > 0 && (
          <View style={styles.searchInfo}>
            <Text style={styles.searchInfoText}>
              Found {filteredTerms.length} result{filteredTerms.length !== 1 ? 's' : ''} for "{search}"
            </Text>
          </View>
        )}
      </View>

      {/* Term List — centered column */}
      <ScrollView
        style={styles.list}
        contentContainerStyle={[
          styles.listContent,
          // Extra clearance on mobile/tablet so the last card isn't hidden
          // behind the floating docked bottom navbar (Navbar.tsx).
          { paddingBottom: isDesktop ? 32 : 120 },
        ]}
      >
        <View
          nativeID="tour-reference-list"
          style={[
            styles.listInner,
            {
              maxWidth: gridMaxWidth,
              paddingHorizontal: gridPadding,
              flexDirection: numColumns === 1 ? 'column' : 'row',
              flexWrap: numColumns === 1 ? 'nowrap' : 'wrap',
              gap: GRID_GAP,
            },
          ]}
        >
          {filteredTerms.length === 0 ? (
            <View style={[styles.emptyState, { width: '100%' }]}>
              <EmptySearchIcon />
              <Text style={styles.emptyStateTitle}>No matching terms found</Text>
              <Text style={styles.emptyText}>Try adjusting your search or category</Text>
            </View>
          ) : (
            filteredTerms.map((item, index) => (
              <View key={item.id} style={{ width: cardWidth }}>
                <ReferenceCard
                  item={item}
                  index={index}
                  isExpanded={expandedId === item.id}
                  onToggle={() => toggleExpand(item.id)}
                />
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
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

  // Header — everything centered, same as Home screen's headerSection
  headerSection: {
    paddingTop: Platform.OS === 'ios' ? 50 : 16,
    paddingHorizontal: 16,
    paddingBottom: 12,
    alignItems: 'center',
  },

  // Search bar — copied from Home screen (centered, max width 640, search button)
  searchBarContainer: {
    alignSelf: 'center',
    width: '100%',
    maxWidth: 640,
    marginBottom: 16,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 10,
    width: '100%',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#0f172a',
    paddingVertical: 8,
    ...Platform.select({
      web: { outlineStyle: 'none' as any },
    }),
  },
  clearButton: {
    padding: 4,
    borderRadius: 4,
  },
  clearButtonPressed: {
    backgroundColor: '#f1f5f9',
  },
  searchButton: {
    backgroundColor: '#3b5bdb',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchButtonPressed: {
    backgroundColor: '#2f4bc0',
  },
  searchInfo: {
    marginTop: 4,
    paddingHorizontal: 16,
    paddingVertical: 6,
    backgroundColor: '#eef2ff',
    borderRadius: 20,
  },
  searchInfoText: {
    fontSize: 12,
    color: '#3b5bdb',
    fontWeight: '500',
  },

  // Category tabs — centered, wraps on small widths
  tabsRow: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  categoryChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
  },
  categoryChipActive: {
    backgroundColor: '#3b5bdb',
    elevation: 3,
    shadowColor: '#3b5bdb',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  categoryChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  categoryChipTextActive: {
    color: '#ffffff',
  },

  // Term list — centered column, capped width like the desktop grid
  list: {
    flex: 1,
  },
  listContent: {
    flexGrow: 1,
    alignItems: 'center',
    paddingBottom: 32,
  },
  listInner: {
    // maxWidth, paddingHorizontal, flexDirection/flexWrap, and gap are all
    // supplied inline above, computed from the current column count.
    width: '100%',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  cardHovered: {
    borderColor: '#c7d2fe',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 3,
  },
  cardPressed: {
    opacity: 0.92,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  cardTerm: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1a1f36',
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginTop: 6,
  },
  categoryBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  cardDivider: {
    height: 1,
    backgroundColor: '#e2e8f0',
    marginTop: 12,
  },
  cardDefinition: {
    marginTop: 12,
    fontSize: 13,
    lineHeight: 19,
    color: '#475569',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
    gap: 6,
  },
  emptyStateTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1f36',
    marginTop: 12,
  },
  emptyText: {
    fontSize: 13,
    color: '#94a3b8',
  },
});