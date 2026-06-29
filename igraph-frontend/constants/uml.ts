// constants/uml.ts

// ─── 10 UML DIAGRAM NAMES ────────────────────────────────────────────────────

export const UML_TABS = [
  'Functional Decomposition Diagram',
  'Flowchart',
  'Data Flow Diagram',
  'Entity Relationship Diagram',
  'Fishbone Diagram',
  'Schematic Diagram',
  'Use Case Diagram',
  'Activity Diagram',
  'Sequence Diagram',
  'Class Diagram',
];

// ─── SHAPE DATA - Each UML has Rectangle shape only ─────────────────────────

export const UML_SHAPES: Record<string, { id: string; icon: string; label: string }[]> = {
  'Functional Decomposition Diagram': [
    { id: 'rectangle', icon: '▭', label: 'Rectangle' },
  ],
  'Flowchart': [
    { id: 'rectangle', icon: '▭', label: 'Rectangle' },
  ],
  'Data Flow Diagram': [
    { id: 'rectangle', icon: '▭', label: 'Rectangle' },
  ],
  'Entity Relationship Diagram': [
    { id: 'rectangle', icon: '▭', label: 'Rectangle' },
  ],
  'Fishbone Diagram': [
    { id: 'rectangle', icon: '▭', label: 'Rectangle' },
  ],
  'Schematic Diagram': [
    { id: 'rectangle', icon: '▭', label: 'Rectangle' },
  ],
  'Use Case Diagram': [
    { id: 'rectangle', icon: '▭', label: 'Rectangle' },
  ],
  'Activity Diagram': [
    { id: 'rectangle', icon: '▭', label: 'Rectangle' },
  ],
  'Sequence Diagram': [
    { id: 'rectangle', icon: '▭', label: 'Rectangle' },
  ],
  'Class Diagram': [
    { id: 'rectangle', icon: '▭', label: 'Rectangle' },
  ],
};