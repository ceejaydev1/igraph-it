// components/maxgraph-setup.ts

import { Graph, CellState, HandleConfig } from '@maxgraph/core';
import { UniversalVertexHandler } from './maxgraph-universal-handler';

/**
 * Initializes the graph with draw.io-style selection behavior
 * Does NOT change shape dimensions - only selection rendering
 */
export function initializeGraphWithDrawIOSelection(graph: Graph): Graph {
  // 1. Route every shape through our custom draw.io selection handler
  graph.createVertexHandler = (state: CellState) => {
    return new UniversalVertexHandler(state);
  };

  // 2. Set global handle configuration
  HandleConfig.fillColor = '#4c6fff';
  HandleConfig.strokeColor = '#4c6fff';
  HandleConfig.size = 8;

  console.log('✅ Draw.io-style selection initialized');
  return graph;
}