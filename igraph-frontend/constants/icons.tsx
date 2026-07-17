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

  Comment: ({ color = '#4a5568' }: { color?: string }) => (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Path d="M21 15C21 15.5304 20.7893 16.0391 20.4142 16.4142C20.0391 16.7893 19.5304 17 19 17H7L3 21V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H19C19.5304 3 20.0391 3.21071 20.4142 3.58579C20.7893 3.96086 21 4.46957 21 5V15Z" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
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