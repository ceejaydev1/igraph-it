import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, Animated, PanResponder } from 'react-native';
import { Svg, Path, Rect } from 'react-native-svg';
import EdgeConnectorControls from './properties-panel/EdgeConnectorControls';

const CloseIcon = ({ color = '#4a5568' }: { color?: string }) => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
    <Path d="M18 6L6 18M6 6L18 18" stroke={color} strokeWidth={2} strokeLinecap="round" />
  </Svg>
);

const HandleIcon = () => (
  <Svg width={36} height={4} viewBox="0 0 36 4">
    <Rect x="0" y="0" width="36" height="4" rx="2" fill="#d1d5db" />
  </Svg>
);

interface ConnectorsBottomPanelProps {
  visible: boolean;
  onClose: () => void;
  toolbarHeight: number;
  graph: any; // maxGraph Graph instance
}

// Fixed content height (handle + header + two title+tile-row sections) — no
// search/tabs/scrolling to size for, unlike ShapesBottomPanel.
const PANEL_HEIGHT = 216;
const dragCloseThreshold = 60;

export default function ConnectorsBottomPanel({ visible, onClose, toolbarHeight, graph }: ConnectorsBottomPanelProps) {
  const sheetHeightAnim = useRef(new Animated.Value(0)).current;
  const dragYAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    dragYAnim.setValue(0);
    Animated.spring(sheetHeightAnim, {
      toValue: visible ? PANEL_HEIGHT : 0,
      useNativeDriver: false,
      tension: 65,
      friction: 12,
    }).start();
  }, [visible]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dy) > 4,
      onPanResponderMove: (_, gesture) => {
        if (gesture.dy > 0) dragYAnim.setValue(gesture.dy);
      },
      onPanResponderRelease: (_, gesture) => {
        if (gesture.dy > dragCloseThreshold) {
          onClose();
        } else {
          Animated.spring(dragYAnim, { toValue: 0, useNativeDriver: false, tension: 65, friction: 12 }).start();
        }
      },
    })
  ).current;

  return (
    <Animated.View
      style={[
        styles.panel,
        {
          bottom: toolbarHeight,
          height: sheetHeightAnim,
          opacity: sheetHeightAnim.interpolate({ inputRange: [0, 40], outputRange: [0, 1], extrapolate: 'clamp' }),
          transform: [{ translateY: dragYAnim }],
        },
      ]}
      pointerEvents={visible ? 'auto' : 'none'}
    >
      <View style={styles.handleRow} {...panResponder.panHandlers}>
        <HandleIcon />
      </View>

      <View style={styles.header}>
        <Text style={styles.title}>Connectors & Waypoints</Text>
        <TouchableOpacity
          onPress={onClose}
          style={styles.closeBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <CloseIcon color="#4a5568" />
        </TouchableOpacity>
      </View>

      <View style={styles.body}>
        <EdgeConnectorControls graph={graph} variant="sheet" />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  panel: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 5,
    width: '100%',
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
      },
      android: {
        elevation: 10,
      },
      web: {
        boxShadow: '0 -4px 20px rgba(0,0,0,0.1)',
      },
    }),
  },
  handleRow: {
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 4,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1a1f36',
  },
  closeBtn: {
    padding: 4,
  },
  body: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
});
