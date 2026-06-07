// igraph-frontend/app/(tabs)/diagram/[id].tsx

import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  useWindowDimensions,
  Animated,
  StatusBar,
  TextInput,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Svg, Path, Circle, Rect, Polygon } from 'react-native-svg';
import { WebView } from 'react-native-webview';

// ─── Types ───────────────────────────────────────────────────────────────────

interface DiagramContent {
  id: number;
  title: string;
  type: 'UML' | 'SDLC';
  tagline: string;
  videoId: string;
  sections: {
    heading: string;
    body: string;
  }[];
  steps?: string[];
  keyPoints?: string[];
  imageAlt: string;
}

// ─── Content Data ─────────────────────────────────────────────────────────────

const LOREM_HEADING_1 = 'Lorem Ipsum Dolor Sit';
const LOREM_HEADING_2 = 'Consectetur Adipiscing Elit';
const LOREM_HEADING_3 = 'Sed Do Eiusmod Tempor';

const DIAGRAM_CONTENT: Record<number, DiagramContent> = {
  1: {
    id: 1,
    title: 'Functional Decomposition Diagram',
    type: 'UML',
    tagline: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
    videoId: 'dQw4w9WgXcQ',
    imageAlt: 'Functional Decomposition Diagram example',
    sections: [
      {
        heading: LOREM_HEADING_1,
        body: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.',
      },
      {
        heading: LOREM_HEADING_2,
        body: 'Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.',
      },
      {
        heading: LOREM_HEADING_3,
        body: 'Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo.',
      },
    ],
    steps: [
      'Lorem ipsum dolor sit amet',
      'Consectetur adipiscing elit',
      'Sed do eiusmod tempor incididunt',
      'Ut labore et dolore magna aliqua',
      'Ut enim ad minim veniam',
      'Quis nostrud exercitation ullamco',
    ],
    keyPoints: [
      'Lorem ipsum dolor sit amet, consectetur',
      'Sed do eiusmod tempor incididunt ut labore',
      'Ut enim ad minim veniam, quis nostrud',
      'Duis aute irure dolor in reprehenderit',
    ],
  },
  2: {
    id: 2,
    title: 'Flowchart',
    type: 'UML',
    tagline: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
    videoId: 'dQw4w9WgXcQ',
    imageAlt: 'Flowchart example',
    sections: [
      { heading: LOREM_HEADING_1, body: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.' },
      { heading: LOREM_HEADING_2, body: 'Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.' },
      { heading: LOREM_HEADING_3, body: 'Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo.' },
    ],
    steps: ['Lorem ipsum dolor sit amet', 'Consectetur adipiscing elit', 'Sed do eiusmod tempor incididunt', 'Ut labore et dolore magna aliqua', 'Ut enim ad minim veniam', 'Quis nostrud exercitation ullamco'],
    keyPoints: ['Lorem ipsum dolor sit amet, consectetur', 'Sed do eiusmod tempor incididunt ut labore', 'Ut enim ad minim veniam, quis nostrud', 'Duis aute irure dolor in reprehenderit', 'Excepteur sint occaecat cupidatat non'],
  },
  3: {
    id: 3,
    title: 'Data Flow Diagram',
    type: 'UML',
    tagline: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
    videoId: 'dQw4w9WgXcQ',
    imageAlt: 'Data Flow Diagram example',
    sections: [
      { heading: LOREM_HEADING_1, body: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.' },
      { heading: LOREM_HEADING_2, body: 'Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.' },
      { heading: LOREM_HEADING_3, body: 'Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo.' },
    ],
    steps: ['Lorem ipsum dolor sit amet', 'Consectetur adipiscing elit', 'Sed do eiusmod tempor incididunt', 'Ut labore et dolore magna aliqua', 'Ut enim ad minim veniam', 'Quis nostrud exercitation ullamco'],
    keyPoints: ['Lorem ipsum dolor sit amet, consectetur', 'Sed do eiusmod tempor incididunt ut labore', 'Ut enim ad minim veniam, quis nostrud', 'Duis aute irure dolor in reprehenderit'],
  },
  4: {
    id: 4,
    title: 'Entity Relationship Diagram',
    type: 'UML',
    tagline: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
    videoId: 'dQw4w9WgXcQ',
    imageAlt: 'Entity Relationship Diagram example',
    sections: [
      { heading: LOREM_HEADING_1, body: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.' },
      { heading: LOREM_HEADING_2, body: 'Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.' },
      { heading: LOREM_HEADING_3, body: 'Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo.' },
    ],
    steps: ['Lorem ipsum dolor sit amet', 'Consectetur adipiscing elit', 'Sed do eiusmod tempor incididunt', 'Ut labore et dolore magna aliqua', 'Ut enim ad minim veniam', 'Quis nostrud exercitation ullamco'],
    keyPoints: ['Lorem ipsum dolor sit amet, consectetur', 'Sed do eiusmod tempor incididunt ut labore', 'Ut enim ad minim veniam, quis nostrud', 'Duis aute irure dolor in reprehenderit', 'Excepteur sint occaecat cupidatat non'],
  },
  5: {
    id: 5,
    title: 'Fishbone Diagram',
    type: 'UML',
    tagline: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
    videoId: 'dQw4w9WgXcQ',
    imageAlt: 'Fishbone Diagram example',
    sections: [
      { heading: LOREM_HEADING_1, body: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.' },
      { heading: LOREM_HEADING_2, body: 'Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.' },
      { heading: LOREM_HEADING_3, body: 'Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo.' },
    ],
    steps: ['Lorem ipsum dolor sit amet', 'Consectetur adipiscing elit', 'Sed do eiusmod tempor incididunt', 'Ut labore et dolore magna aliqua', 'Ut enim ad minim veniam', 'Quis nostrud exercitation ullamco'],
    keyPoints: ['Lorem ipsum dolor sit amet, consectetur', 'Sed do eiusmod tempor incididunt ut labore', 'Ut enim ad minim veniam, quis nostrud', 'Duis aute irure dolor in reprehenderit'],
  },
  6: {
    id: 6,
    title: 'Schematic Diagram',
    type: 'UML',
    tagline: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
    videoId: 'dQw4w9WgXcQ',
    imageAlt: 'Schematic Diagram example',
    sections: [
      { heading: LOREM_HEADING_1, body: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.' },
      { heading: LOREM_HEADING_2, body: 'Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.' },
      { heading: LOREM_HEADING_3, body: 'Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo.' },
    ],
    steps: ['Lorem ipsum dolor sit amet', 'Consectetur adipiscing elit', 'Sed do eiusmod tempor incididunt', 'Ut labore et dolore magna aliqua', 'Ut enim ad minim veniam', 'Quis nostrud exercitation ullamco'],
    keyPoints: ['Lorem ipsum dolor sit amet, consectetur', 'Sed do eiusmod tempor incididunt ut labore', 'Ut enim ad minim veniam, quis nostrud', 'Duis aute irure dolor in reprehenderit'],
  },
  7: {
    id: 7,
    title: 'Use Case Diagram',
    type: 'UML',
    tagline: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
    videoId: 'dQw4w9WgXcQ',
    imageAlt: 'Use Case Diagram example',
    sections: [
      { heading: LOREM_HEADING_1, body: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.' },
      { heading: LOREM_HEADING_2, body: 'Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.' },
      { heading: LOREM_HEADING_3, body: 'Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo.' },
    ],
    steps: ['Lorem ipsum dolor sit amet', 'Consectetur adipiscing elit', 'Sed do eiusmod tempor incididunt', 'Ut labore et dolore magna aliqua', 'Ut enim ad minim veniam', 'Quis nostrud exercitation ullamco', 'Duis aute irure dolor in reprehenderit'],
    keyPoints: ['Lorem ipsum dolor sit amet, consectetur', 'Sed do eiusmod tempor incididunt ut labore', 'Ut enim ad minim veniam, quis nostrud', 'Duis aute irure dolor in reprehenderit', 'Excepteur sint occaecat cupidatat non'],
  },
  8: {
    id: 8,
    title: 'Activity Diagram - Library',
    type: 'UML',
    tagline: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
    videoId: 'dQw4w9WgXcQ',
    imageAlt: 'Activity Diagram example',
    sections: [
      { heading: LOREM_HEADING_1, body: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.' },
      { heading: LOREM_HEADING_2, body: 'Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.' },
      { heading: LOREM_HEADING_3, body: 'Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo.' },
    ],
    steps: ['Lorem ipsum dolor sit amet', 'Consectetur adipiscing elit', 'Sed do eiusmod tempor incididunt', 'Ut labore et dolore magna aliqua', 'Ut enim ad minim veniam', 'Quis nostrud exercitation ullamco'],
    keyPoints: ['Lorem ipsum dolor sit amet, consectetur', 'Sed do eiusmod tempor incididunt ut labore', 'Ut enim ad minim veniam, quis nostrud', 'Duis aute irure dolor in reprehenderit', 'Excepteur sint occaecat cupidatat non', 'Nemo enim ipsam voluptatem quia voluptas'],
  },
  9: {
    id: 9,
    title: 'Sequence Diagram',
    type: 'UML',
    tagline: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
    videoId: 'dQw4w9WgXcQ',
    imageAlt: 'Sequence Diagram example',
    sections: [
      { heading: LOREM_HEADING_1, body: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.' },
      { heading: LOREM_HEADING_2, body: 'Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.' },
      { heading: LOREM_HEADING_3, body: 'Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo.' },
    ],
    steps: ['Lorem ipsum dolor sit amet', 'Consectetur adipiscing elit', 'Sed do eiusmod tempor incididunt', 'Ut labore et dolore magna aliqua', 'Ut enim ad minim veniam', 'Quis nostrud exercitation ullamco'],
    keyPoints: ['Lorem ipsum dolor sit amet, consectetur', 'Sed do eiusmod tempor incididunt ut labore', 'Ut enim ad minim veniam, quis nostrud', 'Duis aute irure dolor in reprehenderit', 'Excepteur sint occaecat cupidatat non'],
  },
  10: {
    id: 10,
    title: 'Class Diagram',
    type: 'UML',
    tagline: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
    videoId: 'dQw4w9WgXcQ',
    imageAlt: 'Class Diagram example',
    sections: [
      { heading: LOREM_HEADING_1, body: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.' },
      { heading: LOREM_HEADING_2, body: 'Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.' },
      { heading: LOREM_HEADING_3, body: 'Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo.' },
    ],
    steps: ['Lorem ipsum dolor sit amet', 'Consectetur adipiscing elit', 'Sed do eiusmod tempor incididunt', 'Ut labore et dolore magna aliqua', 'Ut enim ad minim veniam', 'Quis nostrud exercitation ullamco'],
    keyPoints: ['Lorem ipsum dolor sit amet, consectetur', 'Sed do eiusmod tempor incididunt ut labore', 'Ut enim ad minim veniam, quis nostrud', 'Duis aute irure dolor in reprehenderit', 'Excepteur sint occaecat cupidatat non', '+Public, -Private, #Protected, ~Package'],
  },
  11: {
    id: 11,
    title: 'Waterfall Model',
    type: 'SDLC',
    tagline: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
    videoId: 'dQw4w9WgXcQ',
    imageAlt: 'Waterfall Model diagram',
    sections: [
      { heading: LOREM_HEADING_1, body: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.' },
      { heading: LOREM_HEADING_2, body: 'Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.' },
      { heading: LOREM_HEADING_3, body: 'Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo.' },
    ],
    steps: ['Lorem ipsum dolor sit amet', 'Consectetur adipiscing elit', 'Sed do eiusmod tempor incididunt', 'Ut labore et dolore magna aliqua', 'Ut enim ad minim veniam', 'Quis nostrud exercitation ullamco'],
    keyPoints: ['Lorem ipsum dolor sit amet, consectetur', 'Sed do eiusmod tempor incididunt ut labore', 'Ut enim ad minim veniam, quis nostrud', 'Duis aute irure dolor in reprehenderit', 'Excepteur sint occaecat cupidatat non'],
  },
  12: {
    id: 12,
    title: 'Big Bang Model',
    type: 'SDLC',
    tagline: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
    videoId: 'dQw4w9WgXcQ',
    imageAlt: 'Big Bang Model diagram',
    sections: [
      { heading: LOREM_HEADING_1, body: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.' },
      { heading: LOREM_HEADING_2, body: 'Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.' },
      { heading: LOREM_HEADING_3, body: 'Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo.' },
    ],
    steps: ['Lorem ipsum dolor sit amet', 'Consectetur adipiscing elit', 'Sed do eiusmod tempor incididunt', 'Ut labore et dolore magna aliqua', 'Ut enim ad minim veniam', 'Quis nostrud exercitation ullamco'],
    keyPoints: ['Lorem ipsum dolor sit amet, consectetur', 'Sed do eiusmod tempor incididunt ut labore', 'Ut enim ad minim veniam, quis nostrud', 'Duis aute irure dolor in reprehenderit', 'Excepteur sint occaecat cupidatat non'],
  },
  13: {
    id: 13,
    title: 'Prototype Model',
    type: 'SDLC',
    tagline: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
    videoId: 'dQw4w9WgXcQ',
    imageAlt: 'Prototype Model diagram',
    sections: [
      { heading: LOREM_HEADING_1, body: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.' },
      { heading: LOREM_HEADING_2, body: 'Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.' },
      { heading: LOREM_HEADING_3, body: 'Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo.' },
    ],
    steps: ['Lorem ipsum dolor sit amet', 'Consectetur adipiscing elit', 'Sed do eiusmod tempor incididunt', 'Ut labore et dolore magna aliqua', 'Ut enim ad minim veniam', 'Quis nostrud exercitation ullamco'],
    keyPoints: ['Lorem ipsum dolor sit amet, consectetur', 'Sed do eiusmod tempor incididunt ut labore', 'Ut enim ad minim veniam, quis nostrud', 'Duis aute irure dolor in reprehenderit'],
  },
  14: {
    id: 14,
    title: 'Agile Model',
    type: 'SDLC',
    tagline: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
    videoId: 'dQw4w9WgXcQ',
    imageAlt: 'Agile Model diagram',
    sections: [
      { heading: LOREM_HEADING_1, body: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.' },
      { heading: LOREM_HEADING_2, body: 'Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.' },
      { heading: LOREM_HEADING_3, body: 'Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo.' },
    ],
    steps: ['Lorem ipsum dolor sit amet', 'Consectetur adipiscing elit', 'Sed do eiusmod tempor incididunt', 'Ut labore et dolore magna aliqua', 'Ut enim ad minim veniam', 'Quis nostrud exercitation ullamco'],
    keyPoints: ['Lorem ipsum dolor sit amet, consectetur', 'Sed do eiusmod tempor incididunt ut labore', 'Ut enim ad minim veniam, quis nostrud', 'Duis aute irure dolor in reprehenderit', 'Excepteur sint occaecat cupidatat non'],
  },
  15: {
    id: 15,
    title: 'Iterative Model',
    type: 'SDLC',
    tagline: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
    videoId: 'dQw4w9WgXcQ',
    imageAlt: 'Iterative Model diagram',
    sections: [
      { heading: LOREM_HEADING_1, body: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.' },
      { heading: LOREM_HEADING_2, body: 'Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.' },
      { heading: LOREM_HEADING_3, body: 'Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo.' },
    ],
    steps: ['Lorem ipsum dolor sit amet', 'Consectetur adipiscing elit', 'Sed do eiusmod tempor incididunt', 'Ut labore et dolore magna aliqua', 'Ut enim ad minim veniam', 'Quis nostrud exercitation ullamco'],
    keyPoints: ['Lorem ipsum dolor sit amet, consectetur', 'Sed do eiusmod tempor incididunt ut labore', 'Ut enim ad minim veniam, quis nostrud', 'Duis aute irure dolor in reprehenderit'],
  },
  16: {
    id: 16,
    title: 'V Model',
    type: 'SDLC',
    tagline: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
    videoId: 'dQw4w9WgXcQ',
    imageAlt: 'V Model diagram',
    sections: [
      { heading: LOREM_HEADING_1, body: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.' },
      { heading: LOREM_HEADING_2, body: 'Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.' },
      { heading: LOREM_HEADING_3, body: 'Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo.' },
    ],
    steps: ['Lorem ipsum dolor sit amet', 'Consectetur adipiscing elit', 'Sed do eiusmod tempor incididunt', 'Ut labore et dolore magna aliqua', 'Ut enim ad minim veniam', 'Quis nostrud exercitation ullamco'],
    keyPoints: ['Lorem ipsum dolor sit amet, consectetur', 'Sed do eiusmod tempor incididunt ut labore', 'Ut enim ad minim veniam, quis nostrud', 'Duis aute irure dolor in reprehenderit', 'Excepteur sint occaecat cupidatat non'],
  },
  17: {
    id: 17,
    title: 'Rapid Application Development',
    type: 'SDLC',
    tagline: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
    videoId: 'dQw4w9WgXcQ',
    imageAlt: 'RAD Model diagram',
    sections: [
      { heading: LOREM_HEADING_1, body: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.' },
      { heading: LOREM_HEADING_2, body: 'Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.' },
      { heading: LOREM_HEADING_3, body: 'Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo.' },
    ],
    steps: ['Lorem ipsum dolor sit amet', 'Consectetur adipiscing elit', 'Sed do eiusmod tempor incididunt', 'Ut labore et dolore magna aliqua', 'Ut enim ad minim veniam', 'Quis nostrud exercitation ullamco'],
    keyPoints: ['Lorem ipsum dolor sit amet, consectetur', 'Sed do eiusmod tempor incididunt ut labore', 'Ut enim ad minim veniam, quis nostrud', 'Duis aute irure dolor in reprehenderit'],
  },
  18: {
    id: 18,
    title: 'Spiral Model',
    type: 'SDLC',
    tagline: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
    videoId: 'dQw4w9WgXcQ',
    imageAlt: 'Spiral Model diagram',
    sections: [
      { heading: LOREM_HEADING_1, body: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.' },
      { heading: LOREM_HEADING_2, body: 'Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.' },
      { heading: LOREM_HEADING_3, body: 'Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo.' },
    ],
    steps: ['Lorem ipsum dolor sit amet', 'Consectetur adipiscing elit', 'Sed do eiusmod tempor incididunt', 'Ut labore et dolore magna aliqua', 'Ut enim ad minim veniam', 'Quis nostrud exercitation ullamco'],
    keyPoints: ['Lorem ipsum dolor sit amet, consectetur', 'Sed do eiusmod tempor incididunt ut labore', 'Ut enim ad minim veniam, quis nostrud', 'Duis aute irure dolor in reprehenderit'],
  },
};

// ─── Colors ──────────────────────────────────────────────────────────────────

const TYPE_CONFIG = {
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

// ─── SVG Icons ────────────────────────────────────────────────────────────────

const BackIcon = ({ color }: { color: string }) => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
    <Path d="M19 12H5M5 12L12 19M5 12L12 5" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const PlayIcon = () => (
  <Svg width={28} height={28} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="12" r="10" fill="rgba(255,255,255,0.2)" />
    <Path d="M10 8L16 12L10 16V8Z" fill="#ffffff" />
  </Svg>
);

const CheckIcon = ({ color }: { color: string }) => (
  <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
    <Path d="M20 6L9 17L4 12" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

// ─── Video Player ─────────────────────────────────────────────────────────────

const VideoPlayer = ({ videoId, color }: { videoId: string; color: string }) => {
  const [playing, setPlaying] = useState(false);

  if (Platform.OS === 'web') {
    return (
      <View style={videoStyles.container}>
        {!playing ? (
          <TouchableOpacity
            style={[videoStyles.thumbnail, { backgroundColor: `${color}15` }]}
            onPress={() => setPlaying(true)}
            activeOpacity={0.9}
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
              src={`https://www.youtube.com/embed/${videoId}?autoplay=1`}
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
      {!playing ? (
        <TouchableOpacity
          style={[videoStyles.thumbnail, { backgroundColor: `${color}15` }]}
          onPress={() => setPlaying(true)}
          activeOpacity={0.9}
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
          source={{ uri: `https://www.youtube.com/embed/${videoId}?autoplay=1` }}
        />
      )}
    </View>
  );
};

const videoStyles = StyleSheet.create({
  container: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#1a1f36',
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

// ─── Section Card ─────────────────────────────────────────────────────────────

const SectionCard = ({ heading, body, color }: { heading: string; body: string; color: string }) => {
  return (
    <View style={[sectionStyles.card, { borderLeftColor: color }]}>
      <Text style={[sectionStyles.heading, { color }]}>{heading}</Text>
      <Text style={sectionStyles.body}>{body}</Text>
    </View>
  );
};

const sectionStyles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    borderLeftWidth: 4,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    borderTopWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#f0f2f8',
  },
  heading: {
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  body: {
    fontSize: 15,
    color: '#334155',
    lineHeight: 24,
  },
});

// ─── Steps List ───────────────────────────────────────────────────────────────

const StepsList = ({ steps, color }: { steps: string[]; color: string }) => (
  <View style={stepsStyles.container}>
    <Text style={[stepsStyles.title, { color }]}>Step-by-Step Process</Text>
    {steps.map((step, index) => (
      <View key={index} style={stepsStyles.stepRow}>
        <View style={[stepsStyles.stepNumber, { backgroundColor: color }]}>
          <Text style={stepsStyles.stepNumberText}>{index + 1}</Text>
        </View>
        <Text style={stepsStyles.stepText}>{step}</Text>
      </View>
    ))}
  </View>
);

const stepsStyles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#f0f2f8',
  },
  title: {
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 16,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    marginBottom: 12,
  },
  stepNumber: {
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
    marginTop: 1,
  },
  stepNumberText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffffff',
  },
  stepText: {
    flex: 1,
    fontSize: 15,
    color: '#334155',
    lineHeight: 24,
  },
});

// ─── Key Points ───────────────────────────────────────────────────────────────

const KeyPoints = ({ points, color }: { points: string[]; color: string }) => (
  <View style={keyStyles.container}>
    <Text style={[keyStyles.title, { color }]}>Key Points to Remember</Text>
    {points.map((point, index) => (
      <View key={index} style={keyStyles.row}>
        <View style={[keyStyles.icon, { backgroundColor: `${color}15` }]}>
          <CheckIcon color={color} />
        </View>
        <Text style={keyStyles.text}>{point}</Text>
      </View>
    ))}
  </View>
);

const keyStyles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#f0f2f8',
  },
  title: {
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 16,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 10,
  },
  icon: {
    width: 24,
    height: 24,
    borderRadius: 12,
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

// ─── SDLC Feedback Form ───────────────────────────────────────────────────────

const SDLCFeedbackForm = ({ color }: { color: string }) => {
  const [feedback, setFeedback] = useState('');

  const handleSubmit = () => {
    if (feedback.trim()) {
      Alert.alert(
        'Thank You!',
        'Your feedback has been submitted successfully.',
        [{ text: 'OK' }]
      );
      setFeedback('');
    } else {
      Alert.alert(
        'Empty Response',
        'Please write something about what you learned.',
        [{ text: 'OK' }]
      );
    }
  };

  return (
    <View style={feedbackStyles.container}>
      <Text style={[feedbackStyles.title, { color }]}>
        What did you learn in this SDLC?
      </Text>
      <TextInput
        style={[feedbackStyles.input, { borderColor: `${color}30` }]}
        placeholder="Share your learning experience..."
        placeholderTextColor="#94a3b8"
        multiline
        numberOfLines={4}
        value={feedback}
        onChangeText={setFeedback}
        textAlignVertical="top"
      />
      <TouchableOpacity
        style={[feedbackStyles.submitButton, { backgroundColor: color }]}
        onPress={handleSubmit}
        activeOpacity={0.8}
      >
        <Text style={feedbackStyles.submitButtonText}>Submit</Text>
      </TouchableOpacity>
    </View>
  );
};

const feedbackStyles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#f0f2f8',
    gap: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    fontSize: 15,
    color: '#334155',
    backgroundColor: '#f8faff',
    minHeight: 120,
  },
  submitButton: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: 0.5,
  },
});

// ─── Main DiagramDetail Screen ────────────────────────────────────────────────

export default function DiagramDetail() {
  const params = useLocalSearchParams();
  const rawId = params.id;
  const id = Array.isArray(rawId) ? rawId[0] : rawId;
  const router = useRouter();
  const { width } = useWindowDimensions();
  const scrollY = useRef(new Animated.Value(0)).current;

  const isDesktop = width >= 1024;
  const isTablet = width >= 768;

  const diagramId = parseInt(id ?? '1', 10);
  const content = DIAGRAM_CONTENT[diagramId];

  const colors = content ? TYPE_CONFIG[content.type] : TYPE_CONFIG.UML;

  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 80],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  const goToHome = () => {
    router.replace('/(tabs)');
  };

  if (!content) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Diagram not found.</Text>
        <TouchableOpacity onPress={goToHome} style={styles.backBtn}>
          <Text style={[styles.backBtnText, { color: colors.primary }]}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const VisualColumn = () => (
    <View style={[
      styles.visualColumn,
      isDesktop && styles.visualColumnDesktop,
    ]}>
      <View style={styles.videoWrap}>
        <Text style={[styles.sectionLabel, { color: colors.primary }]}>Video Tutorial</Text>
        <VideoPlayer videoId={content.videoId} color={colors.primary} />
      </View>
      {isDesktop && content.keyPoints && (
        <KeyPoints points={content.keyPoints} color={colors.primary} />
      )}
    </View>
  );

  const ContentColumn = () => (
    <View style={[
      styles.contentColumn,
      isDesktop && styles.contentColumnDesktop,
    ]}>
      {content.sections.map((section, i) => (
        <SectionCard
          key={i}
          heading={section.heading}
          body={section.body}
          color={colors.primary}
        />
      ))}
      {content.steps && (
        <StepsList steps={content.steps} color={colors.primary} />
      )}
      {!isDesktop && content.keyPoints && (
        <KeyPoints points={content.keyPoints} color={colors.primary} />
      )}
      {content.type === 'SDLC' && (
        <SDLCFeedbackForm color={colors.primary} />
      )}
    </View>
  );

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" />

      <Animated.View style={[styles.floatingBar, { opacity: headerOpacity, borderBottomColor: `${colors.primary}20` }]}>
        <TouchableOpacity onPress={goToHome} style={styles.floatingBackBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <BackIcon color={colors.primary} />
        </TouchableOpacity>
        <Text style={[styles.floatingTitle, { color: '#1a1f36' }]} numberOfLines={1}>{content.title}</Text>
      </Animated.View>

      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
        scrollEventThrottle={16}
        contentContainerStyle={[
          styles.scrollContent,
          isDesktop && styles.scrollContentDesktop,
        ]}
      >
        <View style={[styles.hero, { backgroundColor: colors.light }]}>
          <TouchableOpacity
            onPress={goToHome}
            style={styles.heroBackBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <BackIcon color={colors.primary} />
            <Text style={[styles.heroBackText, { color: colors.primary }]}>Back</Text>
          </TouchableOpacity>

          <View style={styles.heroContent}>
            <View style={styles.titleRow}>
              <Text style={[styles.heroTitle, isTablet && styles.heroTitleTablet, isDesktop && styles.heroTitleDesktop]}>
                {content.title}
              </Text>
            </View>
          </View>
        </View>

        <View style={[
          styles.body,
          isDesktop ? styles.bodyDesktop : styles.bodyMobile,
          isTablet && !isDesktop && styles.bodyTablet,
        ]}>
          <VisualColumn />
          <ContentColumn />
        </View>
      </Animated.ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#f8faff',
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
  floatingBackBtn: {
    padding: 4,
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
  heroBackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 24,
    alignSelf: 'flex-start',
  },
  heroBackText: {
    fontSize: 15,
    fontWeight: '600',
  },
  heroContent: {
    gap: 12,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 16,
    flexWrap: 'wrap',
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1a1f36',
    lineHeight: 36,
    letterSpacing: -0.5,
    flex: 1,
    minWidth: 200,
  },
  heroTitleTablet: {
    fontSize: 32,
    lineHeight: 40,
  },
  heroTitleDesktop: {
    fontSize: 36,
    lineHeight: 44,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 48,
  },
  scrollContentDesktop: {
    maxWidth: 1280,
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
  visualColumn: {
    gap: 20,
  },
  visualColumnDesktop: {
    width: 380,
    flexShrink: 0,
    position: 'sticky' as any,
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