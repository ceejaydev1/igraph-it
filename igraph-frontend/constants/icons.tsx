import React from 'react';
import { Svg, Path, Rect, Circle } from 'react-native-svg';

export const ICONS = {
  Close: ({ color = '#4a5568' }: { color?: string }) => (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Path d="M18 6L6 18M6 6L18 18" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  ),

  Shapes: ({ color = '#4a5568' }: { color?: string }) => (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Rect x="3" y="3" width="7" height="7" rx="1.5" stroke={color} strokeWidth={1.8} />
      <Rect x="14" y="3" width="7" height="7" rx="1.5" stroke={color} strokeWidth={1.8} />
      <Rect x="8.5" y="14" width="7" height="7" rx="1.5" stroke={color} strokeWidth={1.8} />
    </Svg>
  ),

  Text: ({ color = '#4a5568' }: { color?: string }) => (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Path d="M4 7V5H20V7" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M12 5V19M12 19H9M12 19H15" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  ),

  Draw: ({ color = '#4a5568' }: { color?: string }) => (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Path d="M12 19L21 5L17 3L5 16L4 20L8 19L12 19Z" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M17 8L14 5" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  ),

  Connector: ({ color = '#4a5568' }: { color?: string }) => (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Circle cx="5" cy="6" r="2.5" stroke={color} strokeWidth={1.8} />
      <Circle cx="19" cy="18" r="2.5" stroke={color} strokeWidth={1.8} />
      <Path d="M7 8L10.5 10.8M13.5 13.2L17 16" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
      <Circle cx="12" cy="12" r="1.6" fill={color} />
    </Svg>
  ),

  // Rectangle with corner alignment brackets — the standard "position/size/
  // arrange" convention (a transform/selection frame), matching the actual
  // tab this opens: Position (X/Y), Size (W/H), and alignment controls.
  Arrange: ({ color = '#4a5568' }: { color?: string }) => (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Rect x="7" y="7" width="10" height="10" rx="1" stroke={color} strokeWidth={1.8} />
      <Path d="M3 7V3H7" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M21 7V3H17" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M3 17V21H7" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M21 17V21H17" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  ),

  Undo: ({ color = '#4a5568' }: { color?: string }) => (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path d="M3 7V12H8" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M3 12C3 16.9706 7.02944 21 12 21C16.9706 21 21 16.9706 21 12C21 7.02944 16.9706 3 12 3C9.043 3 6.44067 4.54204 4.9 6.8" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  ),

  Redo: ({ color = '#4a5568' }: { color?: string }) => (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path d="M21 7V12H16" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C14.957 3 17.5593 4.54204 19.1 6.8" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  ),

  More: ({ color = '#4a5568' }: { color?: string }) => (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="5" r="2" stroke={color} strokeWidth={1.8} />
      <Circle cx="12" cy="12" r="2" stroke={color} strokeWidth={1.8} />
      <Circle cx="12" cy="19" r="2" stroke={color} strokeWidth={1.8} />
    </Svg>
  ),

  Tag: ({ color = '#4a5568' }: { color?: string }) => (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Path d="M12.59 2.59a2 2 0 0 0-1.42-.59H4a2 2 0 0 0-2 2v7.17a2 2 0 0 0 .59 1.42l9 9a2 2 0 0 0 2.82 0l7.17-7.17a2 2 0 0 0 0-2.82z" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
      <Circle cx="7.5" cy="7.5" r="1.5" stroke={color} strokeWidth={1.8} />
    </Svg>
  ),

  NewDiagram: ({ color = '#4a5568' }: { color?: string }) => (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Path d="M13 3H7C5.89543 3 5 3.89543 5 5V19C5 20.1046 5.89543 21 7 21H17C18.1046 21 19 20.1046 19 19V9L13 3Z" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M13 3V9H19" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M12 12V17M9.5 14.5H14.5" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  ),

  Handle: () => (
    <Svg width={36} height={4} viewBox="0 0 36 4">
      <Rect x="0" y="0" width="36" height="4" rx="2" fill="#d1d5db" />
    </Svg>
  ),
};