// app/(tabs)/create.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function CreateDiagram() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Learning References</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8faff',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1a1f36',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#64748b',
  },
});