import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

// Paired with hooks/usePullToRefreshWeb.ts — renders as the first item
// inside the scroll content, growing from 0 height as the user drags down
// so it reads as "pulling reveals a spinner" the same way native
// RefreshControl does, without needing to transform/offset the list itself.
export function PullToRefreshIndicator({
  pullDistance,
  refreshing,
  tintColor = '#4c6fff',
}: {
  pullDistance: number;
  refreshing: boolean;
  tintColor?: string;
}) {
  const height = refreshing ? 44 : pullDistance;
  if (height <= 0) return null;

  return (
    <View style={[styles.container, { height }]}>
      <ActivityIndicator size="small" color={tintColor} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
});
