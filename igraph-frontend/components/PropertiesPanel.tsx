// components/PropertiesPanel.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Platform,
  Animated,
} from 'react-native';
import { Svg, Path, Circle, Rect } from 'react-native-svg';

// ─── Icons ──────────────────────────────────────────────────────────────────

const ChevronIcon = ({ expanded, color = '#64748b' }: { expanded: boolean; color?: string }) => (
  <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
    <Path
      d={expanded ? "M6 9L12 15L18 9" : "M9 6L15 12L9 18"}
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const CloseIcon = ({ color = '#94a3b8' }: { color?: string }) => (
  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
    <Path d="M18 6L6 18M6 6L18 18" stroke={color} strokeWidth={2} strokeLinecap="round" />
  </Svg>
);

const ColorIcon = () => (
  <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="12" r="10" stroke="#64748b" strokeWidth={1.5} />
    <Path d="M12 2L12 22M2 12L22 12M4.93 4.93L19.07 19.07M4.93 19.07L19.07 4.93" stroke="#64748b" strokeWidth={1.5} opacity={0.3} />
  </Svg>
);

const TextIcon = () => (
  <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
    <Path d="M4 7V5H20V7" stroke="#64748b" strokeWidth={1.8} strokeLinecap="round" />
    <Path d="M12 5V19M12 19H9M12 19H15" stroke="#64748b" strokeWidth={1.8} strokeLinecap="round" />
  </Svg>
);

const SizeIcon = () => (
  <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
    <Rect x="3" y="3" width="18" height="18" rx="2" stroke="#64748b" strokeWidth={1.5} />
    <Path d="M3 8H21M3 16H21M8 3V21M16 3V21" stroke="#64748b" strokeWidth={1.5} opacity={0.3} />
  </Svg>
);

// ─── Color Presets ──────────────────────────────────────────────────────────

const COLOR_PRESETS = [
  '#ffffff', '#f1f5f9', '#e2e8f0', '#cbd5e1', '#94a3b8', '#64748b',
  '#4c6fff', '#3b82f6', '#06b6d4', '#10b981', '#22c55e', '#eab308',
  '#f59e0b', '#f97316', '#ef4444', '#ec4899', '#8b5cf6', '#6366f1',
  '#f8fafc', '#f0f4ff', '#ecfdf5', '#fff7ed', '#fef2f2', '#f5f3ff',
];

// ─── Property Section ──────────────────────────────────────────────────────

interface PropertySectionProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  defaultExpanded?: boolean;
}

const PropertySection: React.FC<PropertySectionProps> = ({
  title,
  icon,
  children,
  defaultExpanded = true,
}) => {
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <View style={styles.section}>
      <TouchableOpacity
        style={styles.sectionHeader}
        onPress={() => setExpanded(!expanded)}
        activeOpacity={0.7}
      >
        <View style={styles.sectionHeaderLeft}>
          {icon}
          <Text style={styles.sectionTitle}>{title}</Text>
        </View>
        <ChevronIcon expanded={expanded} color="#94a3b8" />
      </TouchableOpacity>
      {expanded && (
        <View style={styles.sectionContent}>
          {children}
        </View>
      )}
    </View>
  );
};

// ─── Props ──────────────────────────────────────────────────────────────────

interface PropertiesPanelProps {
  visible: boolean;
  selectedCell: any;
  onPropertyChange: (property: string, value: any) => void;
  onClose: () => void;
  isGraphReady: boolean;
  width?: number;
}

// ─── Main Component ─────────────────────────────────────────────────────────

export default function PropertiesPanel({
  visible,
  selectedCell,
  onPropertyChange,
  onClose,
  isGraphReady,
  width = 280,
}: PropertiesPanelProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [localValues, setLocalValues] = useState({
    text: '',
    fillColor: '#ffffff',
    strokeColor: '#1a1f36',
    strokeWidth: 2,
    fontSize: 12,
    x: 0,
    y: 0,
    width: 120,
    height: 60,
    opacity: 100,
  });

  // ─── Update local values when selected cell changes ──────────────────────

  useEffect(() => {
    if (selectedCell) {
      const style = selectedCell.getStyle ? selectedCell.getStyle() : {};
      const geometry = selectedCell.getGeometry ? selectedCell.getGeometry() : {};
      
      // Parse style if it's a string
      let parsedStyle = style;
      if (typeof style === 'string') {
        try {
          const parsed: Record<string, string> = {};
          style.split(';').forEach((part: string) => {
            const [key, val] = part.split('=');
            if (key && val !== undefined) {
              parsed[key] = val;
            }
          });
          parsedStyle = parsed;
        } catch (e) {
          parsedStyle = {};
        }
      }
      
      setLocalValues({
        text: selectedCell.getValue ? selectedCell.getValue() || '' : '',
        fillColor: parsedStyle.fillColor || '#ffffff',
        strokeColor: parsedStyle.strokeColor || '#1a1f36',
        strokeWidth: parsedStyle.strokeWidth || 2,
        fontSize: parsedStyle.fontSize || 12,
        x: geometry.x || 0,
        y: geometry.y || 0,
        width: geometry.width || 120,
        height: geometry.height || 60,
        opacity: parsedStyle.opacity !== undefined ? Math.round(parsedStyle.opacity * 100) : 100,
      });
    }
  }, [selectedCell]);

  // ─── Handlers ─────────────────────────────────────────────────────────────

  const handleTextChange = (text: string) => {
    setLocalValues(prev => ({ ...prev, text }));
    onPropertyChange('value', text);
  };

  const handleColorChange = (property: 'fillColor' | 'strokeColor', color: string) => {
    setLocalValues(prev => ({ ...prev, [property]: color }));
    onPropertyChange(property, color);
  };

  const handleNumberChange = (property: string, value: string) => {
    const numValue = parseFloat(value);
    if (!isNaN(numValue) && numValue >= 0) {
      setLocalValues(prev => ({ ...prev, [property]: numValue }));
      if (property === 'strokeWidth' || property === 'fontSize' || property === 'opacity') {
        onPropertyChange(property, property === 'opacity' ? numValue / 100 : numValue);
      } else {
        onPropertyChange(property, numValue);
      }
    }
  };

  // ─── Render ──────────────────────────────────────────────────────────────

  if (!visible || !selectedCell) {
    return null;
  }

  const panelWidth = isCollapsed ? 36 : width;

  return (
    <View style={[styles.container, { width: panelWidth }]}>
      {/* Header */}
      <View style={styles.header}>
        {!isCollapsed && (
          <>
            <Text style={styles.headerTitle}>Properties</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <CloseIcon color="#94a3b8" />
            </TouchableOpacity>
          </>
        )}
        <TouchableOpacity
          style={[styles.collapseBtn, isCollapsed && styles.collapseBtnActive]}
          onPress={() => setIsCollapsed(!isCollapsed)}
        >
          <ChevronIcon expanded={!isCollapsed} color={isCollapsed ? '#4c6fff' : '#64748b'} />
        </TouchableOpacity>
      </View>

      {!isCollapsed && (
        <ScrollView
          style={styles.scroll}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Cell Info */}
          <View style={styles.cellInfo}>
            <Text style={styles.cellType}>
              {selectedCell.isVertex ? 'Shape' : selectedCell.isEdge ? 'Connector' : 'Cell'}
            </Text>
            <Text style={styles.cellId}>ID: {selectedCell.id || 'N/A'}</Text>
          </View>

          {/* Text Section */}
          <PropertySection title="Text" icon={<TextIcon />}>
            <TextInput
              style={[
                styles.textInput,
                Platform.OS === 'web' && { outline: 'none' }
              ]}
              value={localValues.text}
              onChangeText={handleTextChange}
              placeholder="Enter text..."
              placeholderTextColor="#94a3b8"
              multiline
              numberOfLines={2}
            />
            <View style={styles.propertyRow}>
              <Text style={styles.propertyLabel}>Font Size</Text>
              <TextInput
                style={[
                  styles.numberInput,
                  { width: 60 },
                  Platform.OS === 'web' && { outline: 'none' }
                ]}
                value={String(localValues.fontSize)}
                onChangeText={(v) => handleNumberChange('fontSize', v)}
                keyboardType="numeric"
                selectTextOnFocus
              />
            </View>
          </PropertySection>

          {/* Fill Color Section */}
          <PropertySection title="Fill Color" icon={<ColorIcon />}>
            <View style={styles.colorGrid}>
              {COLOR_PRESETS.map((color) => (
                <TouchableOpacity
                  key={color}
                  style={[
                    styles.colorSwatch,
                    { backgroundColor: color },
                    localValues.fillColor === color && styles.colorSwatchActive,
                    color === '#ffffff' && styles.colorSwatchWhite,
                  ]}
                  onPress={() => handleColorChange('fillColor', color)}
                />
              ))}
            </View>
          </PropertySection>

          {/* Stroke Section */}
          <PropertySection title="Stroke" icon={<ColorIcon />}>
            <View style={styles.propertyRow}>
              <Text style={styles.propertyLabel}>Color</Text>
              <View style={styles.strokeColorRow}>
                {['#1a1f36', '#ef4444', '#4c6fff', '#10b981', '#eab308', '#8b5cf6'].map((color) => (
                  <TouchableOpacity
                    key={color}
                    style={[
                      styles.colorSwatchSmall,
                      { backgroundColor: color },
                      localValues.strokeColor === color && styles.colorSwatchActive,
                    ]}
                    onPress={() => handleColorChange('strokeColor', color)}
                  />
                ))}
              </View>
            </View>
            <View style={styles.propertyRow}>
              <Text style={styles.propertyLabel}>Width</Text>
              <TextInput
                style={[
                  styles.numberInput,
                  { width: 60 },
                  Platform.OS === 'web' && { outline: 'none' }
                ]}
                value={String(localValues.strokeWidth)}
                onChangeText={(v) => handleNumberChange('strokeWidth', v)}
                keyboardType="numeric"
                selectTextOnFocus
              />
            </View>
          </PropertySection>

          {/* Size & Position Section */}
          <PropertySection title="Size & Position" icon={<SizeIcon />}>
            <View style={styles.propertyRow}>
              <Text style={styles.propertyLabel}>X</Text>
              <TextInput
                style={[
                  styles.numberInput,
                  { width: 60 },
                  Platform.OS === 'web' && { outline: 'none' }
                ]}
                value={String(Math.round(localValues.x))}
                onChangeText={(v) => handleNumberChange('x', v)}
                keyboardType="numeric"
                selectTextOnFocus
              />
              <Text style={[styles.propertyLabel, { marginLeft: 12 }]}>Y</Text>
              <TextInput
                style={[
                  styles.numberInput,
                  { width: 60 },
                  Platform.OS === 'web' && { outline: 'none' }
                ]}
                value={String(Math.round(localValues.y))}
                onChangeText={(v) => handleNumberChange('y', v)}
                keyboardType="numeric"
                selectTextOnFocus
              />
            </View>
            <View style={styles.propertyRow}>
              <Text style={styles.propertyLabel}>W</Text>
              <TextInput
                style={[
                  styles.numberInput,
                  { width: 60 },
                  Platform.OS === 'web' && { outline: 'none' }
                ]}
                value={String(Math.round(localValues.width))}
                onChangeText={(v) => handleNumberChange('width', v)}
                keyboardType="numeric"
                selectTextOnFocus
              />
              <Text style={[styles.propertyLabel, { marginLeft: 12 }]}>H</Text>
              <TextInput
                style={[
                  styles.numberInput,
                  { width: 60 },
                  Platform.OS === 'web' && { outline: 'none' }
                ]}
                value={String(Math.round(localValues.height))}
                onChangeText={(v) => handleNumberChange('height', v)}
                keyboardType="numeric"
                selectTextOnFocus
              />
            </View>
          </PropertySection>

          {/* Opacity Section */}
          <PropertySection title="Opacity" icon={<ColorIcon />}>
            <View style={styles.propertyRow}>
              <Text style={styles.propertyLabel}>{localValues.opacity}%</Text>
              <TextInput
                style={[
                  styles.numberInput,
                  { width: 60 },
                  Platform.OS === 'web' && { outline: 'none' }
                ]}
                value={String(localValues.opacity)}
                onChangeText={(v) => handleNumberChange('opacity', v)}
                keyboardType="numeric"
                selectTextOnFocus
              />
            </View>
            <View style={styles.sliderTrack}>
              <View style={[styles.sliderFill, { width: `${localValues.opacity}%`, backgroundColor: '#4c6fff' }]} />
            </View>
          </PropertySection>
        </ScrollView>
      )}
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
    borderLeftWidth: 1,
    borderLeftColor: '#e2e8f0',
    height: '100%',
    ...Platform.select({
      web: {
        boxShadow: '-2px 0 12px rgba(0,0,0,0.06)',
      },
    }),
  },
  header: {
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    flexShrink: 0,
  },
  headerTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1a1f36',
    flex: 1,
  },
  closeBtn: {
    padding: 4,
    marginRight: 4,
  },
  collapseBtn: {
    width: 28,
    height: 28,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({ web: { cursor: 'pointer' } }),
  },
  collapseBtnActive: {
    backgroundColor: '#eef2ff',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  cellInfo: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  cellType: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1a1f36',
  },
  cellId: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 2,
  },
  section: {
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    ...Platform.select({ web: { cursor: 'pointer' } }),
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '500',
    color: '#1a1f36',
  },
  sectionContent: {
    paddingHorizontal: 12,
    paddingBottom: 12,
    gap: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 13,
    color: '#1a1f36',
    minHeight: 40,
  },
  propertyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  propertyLabel: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
    minWidth: 20,
  },
  numberInput: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    fontSize: 12,
    color: '#1a1f36',
    textAlign: 'center',
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  colorSwatch: {
    width: 28,
    height: 28,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    ...Platform.select({ web: { cursor: 'pointer' } }),
  },
  colorSwatchWhite: {
    borderColor: '#cbd5e1',
  },
  colorSwatchActive: {
    borderColor: '#4c6fff',
    borderWidth: 2.5,
    ...Platform.select({
      web: {
        boxShadow: '0 0 0 2px #ffffff, 0 0 0 4px #4c6fff',
      },
    }),
  },
  colorSwatchSmall: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    ...Platform.select({ web: { cursor: 'pointer' } }),
  },
  strokeColorRow: {
    flexDirection: 'row',
    gap: 4,
    flex: 1,
  },
  sliderTrack: {
    height: 4,
    backgroundColor: '#e2e8f0',
    borderRadius: 2,
    overflow: 'hidden',
    marginTop: 4,
  },
  sliderFill: {
    height: '100%',
    borderRadius: 2,
  },
});