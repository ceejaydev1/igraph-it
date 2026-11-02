import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
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
  AccessibilityInfo,
} from 'react-native';
import { Svg, Path, Circle, Defs, Pattern, Rect } from 'react-native-svg';
import { useRouter } from 'expo-router';
import { useOnboardingTour } from '../../hooks/useOnboardingTour';
import { REFERENCE_TOUR_ID, getReferenceTourSteps } from '../../utils/tours';
import { usePageTitle } from '../../utils/usePageTitle';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// ── Design tokens (shared with the Home screen) ─────────
const COLORS = {
  brand: '#4c6fff',
  brandStrong: '#3b5bdb',
  title: '#1a1f36',
  ink: '#0f172a',
  body: '#475569',
  bodyStrong: '#334155', // definition text: more contrast at small sizes
  muted: '#64748b', // placeholders, icons, helper text (AA on white)
  border: '#e2e8f0',
  page: '#f8fafc',
};

// ── Accessibility helpers ───────────────────────────────
// Focus rings should show for keyboard users, not after a mouse click.
let keyboardNavigation = false;
if (Platform.OS === 'web' && typeof window !== 'undefined') {
  window.addEventListener('keydown', (e) => { if (e.key === 'Tab') keyboardNavigation = true; }, true);
  window.addEventListener('pointerdown', () => { keyboardNavigation = false; }, true);
}

const webFocusRing: any =
  Platform.OS === 'web'
    ? { outlineWidth: 2, outlineStyle: 'solid', outlineColor: COLORS.brand, outlineOffset: 2 }
    : null;

const useKeyboardFocus = () => {
  const [kbFocus, setKbFocus] = useState(false);
  return {
    kbFocus,
    focusProps: {
      onFocus: () => setKbFocus(Platform.OS === 'web' && keyboardNavigation),
      onBlur: () => setKbFocus(false),
    },
  };
};

const useReduceMotion = (): boolean => {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((value) => { if (mounted) setReduce(value); })
      .catch(() => {});
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduce);
    return () => {
      mounted = false;
      sub?.remove?.();
    };
  }, []);
  return reduce;
};

// ── Icons ───────────────────────────────────────────────
const SearchIcon = () => (
  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
    <Path
      d="M21 21L16.65 16.65M19 11C19 15.4183 15.4183 19 11 19C6.58172 19 3 15.4183 3 11C3 6.58172 6.58172 3 11 3C15.4183 3 19 6.58172 19 11Z"
      stroke={COLORS.muted}
      strokeWidth={2}
      strokeLinecap="round"
    />
  </Svg>
);

const ClearIcon = () => (
  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="12" r="10" stroke={COLORS.muted} strokeWidth={1.5} />
    <Path d="M15 9L9 15M9 9L15 15" stroke={COLORS.muted} strokeWidth={1.8} strokeLinecap="round" />
  </Svg>
);

const EmptySearchIcon = () => (
  <Svg width={52} height={52} viewBox="0 0 24 24" fill="none">
    <Path
      d="M21 21L16.65 16.65M19 11C19 15.4183 15.4183 19 11 19C6.58172 19 3 15.4183 3 11C3 6.58172 6.58172 3 11 3C15.4183 3 19 6.58172 19 11Z"
      stroke={COLORS.brand}
      strokeWidth={1.5}
      strokeLinecap="round"
      opacity={0.55}
    />
  </Svg>
);

// No default color — every call site passes a color explicitly, and a
// silent fallback here would just mask the day a call site forgets to.
// Always points down — ReferenceCard spins it with Animated on expand/collapse
// rather than swapping a second up/down path, the same idiom ShapesPanel.tsx
// already uses for its own category-expand arrow.
const ChevronIcon = ({ color, size = 16 }: { color: string; size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M6 9L12 15L18 9"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const DOT_SPACING = 32;
const DOT_SIZE = 1.4;

const webDots: any =
  Platform.OS === 'web'
    ? {
        backgroundImage: 'radial-gradient(circle, rgba(76, 111, 255, 0.14) 1.4px, transparent 1.6px)',
        backgroundSize: `${DOT_SPACING}px ${DOT_SPACING}px`,
      }
    : null;

const DotGrid = React.memo(function DotGrid() {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();

  // On the web a single CSS gradient draws the dots.
  if (Platform.OS === 'web') {
    return <View style={[styles.dotGridContainer, webDots]} pointerEvents="none" />;
  }

  // On native, one <Pattern> tile repeated by a single <Rect> replaces what
  // used to be a <Circle> per dot (about 1,700 nodes on a full viewport).
  return (
    <View style={styles.dotGridContainer} pointerEvents="none">
      <Svg width={screenWidth} height={screenHeight}>
        <Defs>
          <Pattern id="reference-dots" width={DOT_SPACING} height={DOT_SPACING} patternUnits="userSpaceOnUse">
            <Circle cx={DOT_SPACING / 2} cy={DOT_SPACING / 2} r={DOT_SIZE} fill={COLORS.brand} opacity={0.12} />
          </Pattern>
        </Defs>
        <Rect width={screenWidth} height={screenHeight} fill="url(#reference-dots)" />
      </Svg>
    </View>
  );
});

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

// "General Terms" is long for a segmented control that has to fit a phone, so
// the tab says "General"; the screen-reader label still says the full name.
const TAB_LABEL: Record<Category, string> = {
  All: 'All',
  UML: 'UML',
  SDLC: 'SDLC',
  'General Terms': 'General',
};

// Mirrors Home screen's TYPE_COLORS so the same category reads as the same
// color across screens. `strong` is the darker shade used for text so it
// clears WCAG AA on white and on the light tint; `paper` is the faint tint
// behind an opened definition.
const CATEGORY_COLORS: Record<
  Exclude<Category, 'All'>,
  { primary: string; strong: string; light: string; paper: string }
> = {
  UML: { primary: '#4c6fff', strong: '#3b5bdb', light: '#eef2ff', paper: '#f5f8ff' },
  SDLC: { primary: '#10b981', strong: '#047857', light: '#ecfdf5', paper: '#f3fbf7' },
  'General Terms': { primary: '#8b5cf6', strong: '#6d28d9', light: '#f5f3ff', paper: '#f8f6ff' },
};

// ── Sections ───────────────────────────────────────────
// The terms are four different kinds of thing (diagram types, the symbols
// drawn inside them, development models, and the phases those models are made
// of), so the list is grouped instead of one flat run. A term's group comes
// from its id prefix, which keeps the data above untouched.
type GroupKey = 'uml-types' | 'uml-notation' | 'sdlc-models' | 'sdlc-phases' | 'general';

const GROUPS: {
  key: GroupKey;
  category: Exclude<Category, 'All'>;
  title: string;
  blurb: string;
}[] = [
  { key: 'uml-types', category: 'UML', title: 'UML diagram types', blurb: 'The diagrams in the library.' },
  { key: 'uml-notation', category: 'UML', title: 'UML notation elements', blurb: 'Shapes, symbols and connectors used inside the diagrams.' },
  { key: 'sdlc-models', category: 'SDLC', title: 'SDLC models', blurb: 'The development models in the library.' },
  { key: 'sdlc-phases', category: 'SDLC', title: 'SDLC phases and steps', blurb: 'The stages the models are built from.' },
  { key: 'general', category: 'General Terms', title: 'General terms', blurb: 'Ideas that show up in both UML and SDLC.' },
];

const groupOf = (id: string): GroupKey =>
  id.startsWith('uml-') ? 'uml-types'
  : id.startsWith('sdlc-') ? 'sdlc-models'
  : id.startsWith('step-') ? 'sdlc-phases'
  : id.startsWith('shape-') ? 'uml-notation'
  : 'general';

// ── Search ─────────────────────────────────────────────
// Searches the term AND its definition, every word must match (any order).
// A match in the term itself ranks above a match only in the definition, so
// "class" still lists the Class Diagram first. Lower-cased once, up here.
const SEARCH_INDEX = new Map<string, { term: string; full: string }>(
  REFERENCE_DATA.map((t) => [
    t.id,
    { term: t.term.toLowerCase(), full: `${t.term} ${t.category} ${t.definition}`.toLowerCase() },
  ])
);

// 0 = matches in the term, 1 = matches in the definition, null = no match.
const searchScore = (item: ReferenceTerm, tokens: string[]): number | null => {
  if (tokens.length === 0) return 0;
  const idx = SEARCH_INDEX.get(item.id);
  if (!idx) return null;
  if (tokens.every((t) => idx.term.includes(t))) return 0;
  if (tokens.every((t) => idx.full.includes(t))) return 1;
  return null;
};

const SUGGESTED_SEARCHES = ['Actor', 'Waterfall', 'Testing'];

// ── Term card ──────────────────────────────────────────
// Flat and bordered at rest. Collapsed, it shows a two-line preview of the
// definition so the list can be scanned without opening anything. A cut-off
// preview always carries a "Show more" label with a chevron, so the truncation
// is never ambiguous; opened, the full definition sits in a block ruled with
// the category colour.
//
// Definitions short enough to fit the preview have nothing to reveal, so they
// are shown in full and the card is not interactive.
const PREVIEW_LINES = 2;
const EXPANDABLE_MIN_LENGTH = 80;

const ReferenceCard = React.memo(({
  item,
  isExpanded,
  onToggle,
  reduceMotion,
}: {
  item: ReferenceTerm;
  isExpanded: boolean;
  onToggle: (id: string) => void;
  reduceMotion: boolean;
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const { kbFocus, focusProps } = useKeyboardFocus();
  const colors = CATEGORY_COLORS[item.category];
  const canExpand = item.definition.length > EXPANDABLE_MIN_LENGTH;
  const open = canExpand && isExpanded;
  const engaged = canExpand && (isHovered || kbFocus);

  // One value drives the lift, the tinted shadow and the border on hover or
  // keyboard focus, same idea as Home screen's DiagramCard.
  const lift = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(lift, {
      toValue: engaged ? 1 : 0,
      duration: reduceMotion ? 0 : 160,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [engaged, reduceMotion, lift]);

  const translateY = lift.interpolate({ inputRange: [0, 1], outputRange: [0, reduceMotion ? 0 : -2] });
  const shadowOpacity = lift.interpolate({ inputRange: [0, 1], outputRange: [0, 0.14] });
  const hoverBorder = lift.interpolate({
    inputRange: [0, 1],
    outputRange: [COLORS.border, `${colors.primary}99`],
  });

  // Chevron spin — same rotate-a-down-arrow idiom as ShapesPanel.tsx's own
  // category-expand arrow, so both screens share one interaction language.
  const chevronSpin = useRef(new Animated.Value(open ? 1 : 0)).current;
  useEffect(() => {
    Animated.timing(chevronSpin, {
      toValue: open ? 1 : 0,
      duration: reduceMotion ? 0 : 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [open, reduceMotion, chevronSpin]);
  const chevronRotate = chevronSpin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] });

  return (
    <Pressable
      onPress={() => onToggle(item.id)}
      disabled={!canExpand}
      style={({ pressed }) => [
        styles.cardTouchable,
        pressed && canExpand && styles.cardPressed,
        kbFocus && webFocusRing,
      ]}
      accessibilityRole={canExpand ? 'button' : undefined}
      accessibilityLabel={
        canExpand
          ? `${item.term}, ${item.category}`
          : `${item.term}, ${item.category}. ${item.definition}`
      }
      accessibilityHint={canExpand ? (open ? 'Collapses the definition' : 'Expands the definition') : undefined}
      accessibilityState={canExpand ? { expanded: open } : undefined}
      {...focusProps}
      // @ts-ignore - React Native Web specific props
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Animated.View
        style={[
          styles.card,
          {
            transform: [{ translateY }],
            shadowColor: colors.primary,
            shadowOpacity,
            borderColor: open ? `${colors.primary}99` : hoverBorder,
          },
        ]}
      >
        <Text style={styles.cardTerm}>{item.term}</Text>

        {open ? (
          <View style={[styles.definitionBlock, { backgroundColor: colors.paper }]}>
            <Text style={styles.definitionText}>{item.definition}</Text>
          </View>
        ) : (
          <Text style={styles.cardPreview} numberOfLines={canExpand ? PREVIEW_LINES : undefined}>
            {item.definition}
          </Text>
        )}

        <View style={styles.cardFooterRow}>
          <View style={[styles.categoryBadge, { backgroundColor: colors.light }]}>
            <Text style={[styles.categoryBadgeText, { color: colors.strong }]}>{item.category}</Text>
          </View>

          {canExpand ? (
            <View style={styles.expandHint} accessible={false}>
              <Text style={[styles.expandHintText, { color: colors.strong }]}>
                {open ? 'Show less' : 'Show more'}
              </Text>
              <Animated.View style={{ transform: [{ rotate: chevronRotate }] }}>
                <ChevronIcon color={colors.strong} />
              </Animated.View>
            </View>
          ) : null}
        </View>
      </Animated.View>
    </Pressable>
  );
});

// ── Category tab ───────────────────────────────────────
const CategoryTab = React.memo(({
  category,
  count,
  isActive,
  stretch,
  onPress,
}: {
  category: Category;
  count: number;
  isActive: boolean;
  stretch: boolean;
  onPress: (c: Category) => void;
}) => {
  const { kbFocus, focusProps } = useKeyboardFocus();

  return (
    <Pressable
      onPress={() => onPress(category)}
      style={({ pressed }) => [
        styles.tab,
        stretch && styles.tabStretch,
        isActive && styles.tabActive,
        pressed && !isActive && styles.tabPressed,
        kbFocus && webFocusRing,
      ]}
      accessibilityRole="tab"
      accessibilityLabel={`${category}, ${count} ${count === 1 ? 'term' : 'terms'}`}
      accessibilityState={{ selected: isActive }}
      {...focusProps}
    >
      <Text
        style={[styles.tabText, stretch && styles.tabTextCompact, isActive && styles.tabTextActive]}
        numberOfLines={1}
      >
        {TAB_LABEL[category]}
      </Text>
      <View style={[styles.tabBadge, stretch && styles.tabBadgeCompact, isActive && styles.tabBadgeActive]}>
        <Text style={[styles.tabBadgeText, stretch && styles.tabBadgeTextCompact, isActive && styles.tabBadgeTextActive]}>
          {count}
        </Text>
      </View>
    </Pressable>
  );
});

const SuggestionChip = ({ label, onPress }: { label: string; onPress: () => void }) => {
  const { kbFocus, focusProps } = useKeyboardFocus();

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Search for ${label}`}
      {...focusProps}
      style={({ pressed }) => [
        styles.chip,
        pressed && styles.chipPressed,
        kbFocus && webFocusRing,
      ]}
    >
      <Text style={styles.chipText}>{label}</Text>
    </Pressable>
  );
};

// ── Component ──────────────────────────────────────────
export default function LearningReference() {
  usePageTitle('Reference');
  const [search, setSearch] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [activeCategory, setActiveCategory] = useState<Category>('All');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const inputRef = useRef<TextInput>(null);
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;
  const router = useRouter();
  const reduceMotion = useReduceMotion();
  const clearFocus = useKeyboardFocus();
  const resetFocus = useKeyboardFocus();

  // Column count, then card width derived from it, same approach as Home
  // screen's grid. Cards here are variable height (they expand), so each
  // column below is its own stack: opening one card pushes down only the
  // cards under it in that column, instead of stretching its whole row.
  const GRID_GAP = 12;
  const numColumns = width >= 1440 ? 3 : width >= 768 ? 2 : 1;
  const gridMaxWidth = numColumns === 3 ? 1200 : numColumns === 2 ? 860 : 720;
  const gridPadding = width >= 768 ? 24 : 16;
  const frameStyle = { maxWidth: gridMaxWidth, paddingHorizontal: gridPadding };

  const referenceTourSteps = useMemo(() => getReferenceTourSteps({ router }), [router]);
  useOnboardingTour(REFERENCE_TOUR_ID, referenceTourSteps);

  const tokens = useMemo(() => search.trim().toLowerCase().split(/\s+/).filter(Boolean), [search]);

  // Per-category counts for the tabs, from the search alone (the same way
  // Home screen counts), so each tab shows what it would list.
  const tabCounts = useMemo(() => {
    const counts: Record<Category, number> = { All: 0, UML: 0, SDLC: 0, 'General Terms': 0 };
    REFERENCE_DATA.forEach((item) => {
      if (searchScore(item, tokens) !== null) {
        counts.All++;
        counts[item.category]++;
      }
    });
    return counts;
  }, [tokens]);

  const sections = useMemo(() => {
    const buckets = new Map<GroupKey, { item: ReferenceTerm; score: number; order: number }[]>();
    REFERENCE_DATA.forEach((item, order) => {
      if (activeCategory !== 'All' && item.category !== activeCategory) return;
      const score = searchScore(item, tokens);
      if (score === null) return;
      const key = groupOf(item.id);
      const list = buckets.get(key) ?? [];
      list.push({ item, score, order });
      buckets.set(key, list);
    });
    return GROUPS.map((group) => ({
      group,
      items: (buckets.get(group.key) ?? [])
        .sort((a, b) => a.score - b.score || a.order - b.order)
        .map((entry) => entry.item),
    })).filter((section) => section.items.length > 0);
  }, [tokens, activeCategory]);

  const total = sections.reduce((sum, s) => sum + s.items.length, 0);

  const animateLayout = useCallback(() => {
    if (!reduceMotion) LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
  }, [reduceMotion]);

  const toggleExpand = useCallback((id: string) => {
    animateLayout();
    setExpandedId((prev) => (prev === id ? null : id));
  }, [animateLayout]);

  const handleCategoryChange = useCallback((cat: Category) => {
    animateLayout();
    setActiveCategory(cat);
  }, [animateLayout]);

  const handleClearSearch = useCallback(() => {
    animateLayout();
    setSearch('');
    if (Platform.OS === 'web') inputRef.current?.focus();
  }, [animateLayout]);

  const handleResetFilters = useCallback(() => {
    animateLayout();
    setSearch('');
    setActiveCategory('All');
  }, [animateLayout]);

  const handleSuggestion = useCallback((term: string) => {
    animateLayout();
    setActiveCategory('All');
    setSearch(term.toLowerCase());
  }, [animateLayout]);

  // Search is live (it filters as you type), so Enter only needs to close the
  // keyboard. There is no separate search button.
  const handleSearchSubmit = useCallback(() => {
    Keyboard.dismiss();
  }, []);

  // Web: press "/" anywhere outside a text field to jump to search.
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== '/' || e.metaKey || e.ctrlKey || e.altKey) return;
      const el = document.activeElement as HTMLElement | null;
      const tag = el?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || el?.isContentEditable) return;
      e.preventDefault();
      inputRef.current?.focus();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const trimmedQuery = search.trim();
  const resultText = trimmedQuery
    ? `${total} ${total === 1 ? 'result' : 'results'} for “${trimmedQuery}”`
    : `${total} ${total === 1 ? 'term' : 'terms'}`;

  const showSlashHint = Platform.OS === 'web' && isDesktop && !isSearchFocused && search.length === 0;

  // Section header, then its cards, as flat siblings so the header can be a
  // sticky child of the ScrollView (stickyHeaderIndices below): scrolling
  // through a long section always shows which one you are in.
  const listChildren: React.ReactElement[] = sections.flatMap(({ group, items }) => {
    const colors = CATEGORY_COLORS[group.category];
    // Cards are laid out in independent column stacks. When the last row
    // would be incomplete (10 cards in 3 columns leaves one alone), the
    // leftover cards are pulled out into a final row that shares the full
    // width instead, so there is no empty slot. Short result sets (no more
    // than one row) keep the plain column layout.
    const leftover = items.length > numColumns ? items.length % numColumns : 0;
    const body = leftover ? items.slice(0, items.length - leftover) : items;
    const tail = leftover ? items.slice(items.length - leftover) : [];
    const columns: ReferenceTerm[][] = Array.from({ length: numColumns }, () => []);
    body.forEach((item, i) => columns[i % numColumns].push(item));

    const renderCard = (item: ReferenceTerm) => (
      <ReferenceCard
        key={item.id}
        item={item}
        isExpanded={expandedId === item.id}
        onToggle={toggleExpand}
        reduceMotion={reduceMotion}
      />
    );

    return [
      <View key={`h-${group.key}`} style={styles.sectionBar}>
        <View style={[styles.frame, frameStyle, styles.sectionRow]}>
          <View style={[styles.sectionDot, { backgroundColor: colors.primary }]} />
          <Text accessibilityRole="header" style={styles.sectionTitle}>
            {group.title}
          </Text>
          {width >= 768 ? (
            <Text style={styles.sectionBlurb} numberOfLines={1}>
              {group.blurb}
            </Text>
          ) : null}
          <Text style={styles.sectionCount}>{items.length}</Text>
        </View>
      </View>,
      <View key={`g-${group.key}`} style={[styles.frame, frameStyle, styles.gridSection]}>
        <View style={styles.gridColumnsRow}>
          {columns.map((column, ci) => (
            <View key={ci} style={styles.gridColumn}>
              {column.map(renderCard)}
            </View>
          ))}
        </View>
        {tail.length > 0 ? (
          <View style={styles.tailRow}>
            {tail.map((item) => (
              <View key={item.id} style={styles.tailCell}>
                {renderCard(item)}
              </View>
            ))}
          </View>
        ) : null}
      </View>,
    ];
  });

  return (
    <View style={styles.container}>
      <DotGrid />

      {/* Toolbar: stays pinned above the list, since there are far too many
          terms to scroll back up for every new search. */}
      <View style={styles.headerSection}>
        <View style={[styles.frame, frameStyle]}>
          <View style={[styles.toolbar, isDesktop && styles.toolbarDesktop]}>
            <View
              nativeID="tour-reference-search"
              accessibilityRole="search"
              style={[styles.searchBarContainer, isDesktop && styles.searchBarContainerDesktop]}
            >
              <View style={[styles.searchBar, isSearchFocused && styles.searchBarFocused]}>
                <SearchIcon />
                <TextInput
                  ref={inputRef}
                  style={styles.searchInput}
                  placeholder="Search terms or definitions, like “Class Diagram”"
                  placeholderTextColor={COLORS.muted}
                  value={search}
                  onChangeText={setSearch}
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="search"
                  onSubmitEditing={handleSearchSubmit}
                  onFocus={() => setIsSearchFocused(true)}
                  onBlur={() => setIsSearchFocused(false)}
                  accessibilityLabel="Search reference terms and definitions"
                />
                {search.length > 0 ? (
                  <Pressable
                    onPress={handleClearSearch}
                    style={({ pressed }) => [
                      styles.clearButton,
                      pressed && styles.clearButtonPressed,
                      clearFocus.kbFocus && webFocusRing,
                    ]}
                    hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                    accessibilityRole="button"
                    accessibilityLabel="Clear search"
                    {...clearFocus.focusProps}
                  >
                    <ClearIcon />
                  </Pressable>
                ) : showSlashHint ? (
                  <View style={styles.kbd} accessible={false}>
                    <Text style={styles.kbdText}>/</Text>
                  </View>
                ) : null}
              </View>
            </View>

            <View
              nativeID="tour-reference-categories"
              accessibilityRole="tablist"
              style={[styles.tabsRow, !isDesktop && styles.tabsRowStretch]}
            >
              {CATEGORIES.map((cat) => (
                <CategoryTab
                  key={cat}
                  category={cat}
                  count={tabCounts[cat]}
                  isActive={activeCategory === cat}
                  stretch={!isDesktop}
                  onPress={handleCategoryChange}
                />
              ))}
            </View>
          </View>

          <Text style={styles.resultCount} accessibilityLiveRegion="polite" numberOfLines={1}>
            {resultText}
          </Text>
        </View>
      </View>

      <ScrollView
        nativeID="tour-reference-list"
        style={styles.list}
        contentContainerStyle={[
          styles.listContent,
          // Extra clearance on mobile/tablet so the last card isn't hidden
          // behind the floating docked bottom navbar (Navbar.tsx).
          { paddingBottom: isDesktop ? 32 : 120 },
        ]}
        stickyHeaderIndices={sections.map((_, i) => i * 2)}
        keyboardShouldPersistTaps="handled"
      >
        {listChildren.length > 0 ? (
          listChildren
        ) : (
          <View key="empty" style={styles.emptyState}>
            <View style={styles.emptyIconWrap}>
              <EmptySearchIcon />
            </View>
            <Text style={styles.emptyStateTitle}>No matching terms</Text>
            <Text style={styles.emptyText}>Try a term or a topic instead, or clear your filters.</Text>
            <View style={styles.chipsRow}>
              {SUGGESTED_SEARCHES.map((term) => (
                <SuggestionChip key={term} label={term} onPress={() => handleSuggestion(term)} />
              ))}
            </View>
            <Pressable
              onPress={handleResetFilters}
              accessibilityRole="button"
              accessibilityLabel="Reset search and filters"
              {...resetFocus.focusProps}
              style={({ pressed }) => [
                styles.emptyButton,
                pressed && styles.emptyButtonPressed,
                resetFocus.kbFocus && webFocusRing,
              ]}
            >
              <Text style={styles.emptyButtonText}>Reset search and filters</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.page,
  },
  dotGridContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
  },

  // Centers a block and caps its width; each caller adds maxWidth/padding.
  frame: {
    width: '100%',
    alignSelf: 'center',
  },

  // Toolbar — left-aligned to the grid edge, like Home screen's
  headerSection: {
    paddingTop: Platform.OS === 'ios' ? 50 : 16,
    paddingBottom: 6,
  },
  toolbar: {
    gap: 12,
  },
  toolbarDesktop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
  },
  searchBarContainer: {
    width: '100%',
  },
  searchBarContainerDesktop: {
    width: 'auto',
    flex: 1,
    maxWidth: 560,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    minHeight: 50,
    paddingLeft: 14,
    paddingRight: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 10,
    width: '100%',
  },
  // Focused: the neutral hairline becomes the brand blue, with a faint
  // matching glow (same as Home screen).
  searchBarFocused: {
    borderColor: COLORS.brand,
    shadowColor: COLORS.brand,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
    ...Platform.select({
      web: { boxShadow: '0 0 0 3px rgba(76, 111, 255, 0.16)' },
    }),
  },
  searchInput: {
    flex: 1,
    minWidth: 0,
    fontSize: 16, // 16px stops iOS Safari zooming on focus
    color: COLORS.ink,
    paddingVertical: 8,
    ...Platform.select({
      web: { outlineStyle: 'none' as any },
    }),
  },
  clearButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearButtonPressed: {
    backgroundColor: '#f1f5f9',
  },
  kbd: {
    minWidth: 24,
    height: 24,
    paddingHorizontal: 7,
    marginRight: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.page,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kbdText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.muted,
  },
  resultCount: {
    marginTop: 12,
    fontSize: 13,
    lineHeight: 18,
    color: COLORS.muted,
    fontWeight: '500',
  },

  // Category tabs — separate pills (classic style)
  tabsRow: {
    flexDirection: 'row',
    alignSelf: 'flex-start',
    gap: 8,
    flexWrap: 'nowrap', // always a single row
  },
  tabsRowStretch: {
    alignSelf: 'stretch',
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minHeight: 38,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
  },
  // On a phone the four tabs share the row by content width, with tighter
  // padding so "General" and its count still fit.
  tabStretch: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
    minWidth: 0,
    paddingHorizontal: 4,
    gap: 4,
  },
  tabActive: {
    backgroundColor: '#4c6fff',
    elevation: 3,
    shadowColor: '#4c6fff',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  tabPressed: {
    backgroundColor: '#e2e8f0',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  tabTextActive: {
    color: '#ffffff',
  },
  tabTextCompact: {
    fontSize: 12,
    flexShrink: 1,
  },
  tabBadge: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 22,
    alignItems: 'center',
  },
  tabBadgeActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  tabBadgeCompact: {
    paddingHorizontal: 4,
    minWidth: 18,
  },
  tabBadgeTextCompact: {
    fontSize: 10,
  },
  tabBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4c6fff',
  },
  tabBadgeTextActive: {
    color: '#ffffff',
  },

  // Term list
  list: {
    flex: 1,
  },
  // No alignItems: 'center' here. It made the sticky section header shrink to
  // its content and float in the middle; children stretch instead, and the
  // grid blocks centre themselves with `frame`.
  listContent: {
    flexGrow: 1,
  },

  // Sticky section header — an (almost) opaque bar so cards scrolling
  // underneath don't show through the text.
  sectionBar: {
    width: '100%',
    alignSelf: 'stretch',
    backgroundColor: 'rgba(248, 250, 252, 0.97)',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
  },
  sectionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.title,
    letterSpacing: -0.2,
  },
  sectionBlurb: {
    flex: 1,
    minWidth: 0,
    fontSize: 13,
    color: COLORS.muted,
  },
  sectionCount: {
    marginLeft: 'auto',
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.muted,
    ...Platform.select({
      web: { fontVariant: ['tabular-nums'] as any },
    }),
  },
  gridSection: {
    gap: 12,
    paddingTop: 14,
    paddingBottom: 20,
  },
  gridColumnsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  // Final, shared-width row for cards that would otherwise sit alone.
  tailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  tailCell: {
    flex: 1,
    minWidth: 0,
  },
  gridColumn: {
    flex: 1,
    minWidth: 0,
    gap: 12,
  },

  // Card — flat and bordered at rest; the tinted shadow only appears on
  // hover or keyboard focus (see the lift value in ReferenceCard).
  cardTouchable: {
    borderRadius: 14,
  },
  cardPressed: {
    opacity: 0.94,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 14,
  },
  cardTerm: {
    fontSize: 15,
    lineHeight: 21,
    fontWeight: '700',
    color: COLORS.title,
    letterSpacing: -0.1,
  },
  cardPreview: {
    marginTop: 6,
    fontSize: 14,
    lineHeight: 20,
    color: COLORS.bodyStrong,
  },
  // The opened definition: ruled with the category colour on the left and
  // set on that category's paper tint.
  definitionBlock: {
    marginTop: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  definitionText: {
    fontSize: 14,
    lineHeight: 21,
    color: COLORS.bodyStrong,
  },
  cardFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginTop: 12,
  },
  expandHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  expandHintText: {
    fontSize: 13,
    fontWeight: '600',
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 6,
  },
  categoryBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.2,
  },

  // Empty state
  emptyState: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 48,
    paddingHorizontal: 32,
  },
  emptyIconWrap: {
    width: 104,
    height: 104,
    borderRadius: 52,
    backgroundColor: '#eef2ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.3,
    color: COLORS.ink,
    marginTop: 20,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    lineHeight: 20,
    color: COLORS.body,
    textAlign: 'center',
    maxWidth: 320,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginTop: 20,
  },
  chip: {
    minHeight: 40,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipPressed: {
    backgroundColor: '#eef2ff',
  },
  chipText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.body,
  },
  emptyButton: {
    marginTop: 12,
    minHeight: 44,
    paddingHorizontal: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyButtonPressed: {
    backgroundColor: '#e0e7ff',
  },
  emptyButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.brandStrong,
  },
});