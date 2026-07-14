import { Graph, CellState, HandleConfig } from '@maxgraph/core';
import { UniversalVertexHandler } from './maxgraph-universal-handler';

/**
 * Initializes the graph with draw.io-style selection behavior including rotate handle
 */
export function initializeGraphWithDrawIOSelection(graph: Graph): Graph {
  // 1. Route every shape through our custom handler with rotate support
  graph.createVertexHandler = (state: CellState) => {
    return new UniversalVertexHandler(state);
  };

  // 2. Set global handle configuration
  HandleConfig.fillColor = '#4c6fff';
  HandleConfig.strokeColor = '#4c6fff';
  HandleConfig.size = 8;

  console.log('✅ Draw.io-style selection with rotate handle initialized');
  return graph;
}