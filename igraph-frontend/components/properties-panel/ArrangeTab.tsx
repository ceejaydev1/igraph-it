import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Geometry } from '@maxgraph/core';
import { COLORS, SPACING } from '@/constants/theme';
import { applyStylePatch, getCommonGeoValue, getCommonStyleValue } from './PropertiesPanel';
import {
  CollapsibleSection,
  NumberStepper,
  ActionButton,
  InlineField,
} from './shared';

interface TabProps {
  graph: any;
  cells: any[];
}

/** Commits a geometry field change to every selected cell as one undoable edit. */
function applyGeoPatch(graph: any, cells: any[], patch: Partial<Record<'x' | 'y' | 'width' | 'height', number>>) {
  if (!graph || cells.length === 0) return;
  graph.batchUpdate(() => {
    cells.forEach((cell: any) => {
      const geo = cell.getGeometry?.();
      if (!geo) return;
      const next = geo.clone ? geo.clone() : new Geometry(geo.x, geo.y, geo.width, geo.height);
      if (patch.x !== undefined) next.x = patch.x;
      if (patch.y !== undefined) next.y = patch.y;
      if (patch.width !== undefined) next.width = patch.width;
      if (patch.height !== undefined) next.height = patch.height;
      graph.getDataModel().setGeometry(cell, next);
    });
  });
}

/** Moves each cell one step forward/backward in its parent's child order (z-index).
 *  Unlike orderCells(front/back) this only shifts by a single position. */
function reorderStep(graph: any, cells: any[], direction: 1 | -1) {
  if (!graph) return;
  const model = graph.getDataModel();
  model.beginUpdate();
  try {
    cells.forEach((cell: any) => {
      const parent = cell.getParent?.();
      if (!parent || !parent.getIndex) return;
      const childCount = parent.getChildCount ? parent.getChildCount() : 0;
      const index = parent.getIndex(cell);
      if (index === -1) return;
      const nextIndex = Math.max(0, Math.min(childCount - 1, index + direction));
      if (nextIndex !== index) {
        model.add(parent, cell, nextIndex);
      }
    });
  } finally {
    model.endUpdate();
  }
}

export default function ArrangeTab({ graph, cells }: TabProps) {
  const x = getCommonGeoValue(cells, 'x') as number | undefined;
  const y = getCommonGeoValue(cells, 'y') as number | undefined;
  const width = getCommonGeoValue(cells, 'width') as number | undefined;
  const height = getCommonGeoValue(cells, 'height') as number | undefined;
  const rotation = getCommonStyleValue(cells, 'rotation') as number | undefined;
  const flipH = getCommonStyleValue(cells, 'flipH') as number | undefined;
  const flipV = getCommonStyleValue(cells, 'flipV') as number | undefined;

  const handleWidthChange = (n: number) => applyGeoPatch(graph, cells, { width: n });
  const handleHeightChange = (n: number) => applyGeoPatch(graph, cells, { height: n });

  const patchStyle = (p: Record<string, any>) => applyStylePatch(graph, cells, p);

  const handleToFront = () => graph?.orderCells?.(false, cells);
  const handleToBack = () => graph?.orderCells?.(true, cells);
  const handleBringForward = () => reorderStep(graph, cells, 1);
  const handleSendBackward = () => reorderStep(graph, cells, -1);
  const handleFlipH = () => patchStyle({ flipH: flipH ? 0 : 1 });
  const handleFlipV = () => patchStyle({ flipV: flipV ? 0 : 1 });

  return (
    <View>
      {/* ─── Order actions ────────────────────────────────────────────── */}
      <View style={styles.btnRow}>
        <ActionButton label="To Front" onPress={handleToFront} />
        <ActionButton label="To Back" onPress={handleToBack} />
      </View>
      <View style={styles.btnRow}>
        <ActionButton label="Bring Forward" onPress={handleBringForward} />
        <ActionButton label="Send Backward" onPress={handleSendBackward} />
      </View>

      {/* ─── Size / Position ──────────────────────────────────────────── */}
      <CollapsibleSection title="Size / Position" defaultOpen>
        <View style={styles.sizeRow}>
          <View style={styles.pairItem}>
            <NumberStepper
              label="Width"
              labelColor={COLORS.primary}
              value={width}
              onChange={handleWidthChange}
              step={1}
              min={1}
              suffix="pt"
            />
          </View>
          <View style={styles.pairItem}>
            <NumberStepper
              label="Height"
              labelColor={COLORS.primary}
              value={height}
              onChange={handleHeightChange}
              step={1}
              min={1}
              suffix="pt"
            />
          </View>
        </View>

        <Text style={styles.subLabel}>Position</Text>
        <View style={styles.pairRow}>
          <View style={styles.pairItem}>
            <NumberStepper
              label="Left"
              labelColor={COLORS.primary}
              value={x}
              onChange={(n) => applyGeoPatch(graph, cells, { x: n })}
              step={1}
              suffix="pt"
            />
          </View>
          <View style={styles.pairItem}>
            <NumberStepper
              label="Top"
              labelColor={COLORS.primary}
              value={y}
              onChange={(n) => applyGeoPatch(graph, cells, { y: n })}
              step={1}
              suffix="pt"
            />
          </View>
        </View>
      </CollapsibleSection>

      {/* ─── Rotation (collapsed by default) ──────────────────────────── */}
      <CollapsibleSection title="Rotation" defaultOpen={false}>
        <InlineField label="Angle">
          <NumberStepper
            value={rotation ?? 0}
            onChange={(n) => patchStyle({ rotation: n })}
            step={1}
            min={-360}
            max={360}
            suffix="°"
          />
        </InlineField>
      </CollapsibleSection>

      {/* ─── Flip ──────────────────────────────────────────────────────── */}
      <CollapsibleSection title="Flip" defaultOpen>
        <View style={styles.btnRow}>
          <ActionButton label="Horizontal" active={flipH === 1} onPress={handleFlipH} />
          <ActionButton label="Vertical" active={flipV === 1} onPress={handleFlipV} />
        </View>
      </CollapsibleSection>
    </View>
  );
}

const styles = StyleSheet.create({
  btnRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  sizeRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: SPACING.sm,
  },
  subLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.gray800,
    marginBottom: SPACING.sm,
  },
  pairRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  pairItem: {
    flex: 1,
    minWidth: 0,
  },
});