// app/(tabs)/create.tsx — with focus fix when closing shapes panel

import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Platform,
  useWindowDimensions,
  Alert,
  SafeAreaView,
  StatusBar,
  ScrollView,
  Modal,
  Pressable,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Svg, Path, Rect, Circle } from 'react-native-svg';
import DiagramCanvas from '@/components/DiagramCanvas';
import ShapesPanel from '@/components/shapes/ShapesPanel';
import ShapesBottomPanel from '../../components/shapes/ShapesBottomPanel';
import { ICONS } from '../../constants/icons';
import { COLORS, SPACING } from '@/constants/theme';
import { IGRAPH_ID_STYLE_MAP } from '@/components/maxgraph-custom-shapes';

// ─── DRAW.IO STYLE ICONS ────────────────────────────────────────────────────

// Draw.io style Undo icon (curved arrow pointing left)
const UndoIcon = ({ color = '#4a5568' }: { color?: string }) => (
  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
    <Path
      d="M3 7V12H8"
      stroke={color}
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M3 12C3 16.9706 7.02944 21 12 21C16.9706 21 21 16.9706 21 12C21 7.02944 16.9706 3 12 3C9.043 3 6.44067 4.54204 4.9 6.8"
      stroke={color}
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

// Draw.io style Redo icon (curved arrow pointing right)
const RedoIcon = ({ color = '#4a5568' }: { color?: string }) => (
  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
    <Path
      d="M21 7V12H16"
      stroke={color}
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C14.957 3 17.5593 4.54204 19.1 6.8"
      stroke={color}
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

// Draw.io style Zoom In icon (magnifying glass with plus)
const ZoomInIcon = ({ color = '#4a5568' }: { color?: string }) => (
  <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
    <Circle cx="11" cy="11" r="7" stroke={color} strokeWidth={1.8} />
    <Path d="M16 16L21 21" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    <Path d="M11 8V14" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    <Path d="M8 11H14" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
  </Svg>
);

// Draw.io style Zoom Out icon (magnifying glass with minus)
const ZoomOutIcon = ({ color = '#4a5568' }: { color?: string }) => (
  <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
    <Circle cx="11" cy="11" r="7" stroke={color} strokeWidth={1.8} />
    <Path d="M16 16L21 21" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    <Path d="M8 11H14" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
  </Svg>
);

// Draw.io style Page icon
const PageIcon = ({ color = '#4a5568' }: { color?: string }) => (
  <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
    <Rect x="3" y="3" width="18" height="18" rx="2" stroke={color} strokeWidth={1.8} />
    <Path d="M8 8h8M8 12h6M8 16h4" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
  </Svg>
);

// Draw.io style Close icon for page tabs
const CloseTabIcon = ({ color = '#94a3b8' }: { color?: string }) => (
  <Svg width={12} height={12} viewBox="0 0 24 24" fill="none">
    <Path d="M18 6L6 18M6 6L18 18" stroke={color} strokeWidth={2} strokeLinecap="round" />
  </Svg>
);

// ─── Format Bar Icons ────────────────────────────────────────────────────────

const BoldIcon = ({ color = '#4a5568' }: { color?: string }) => (
  <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
    <Path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const ItalicIcon = ({ color = '#4a5568' }: { color?: string }) => (
  <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
    <Path d="M19 4h-9M14 20H5M15 4L9 20" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const UnderlineIcon = ({ color = '#4a5568' }: { color?: string }) => (
  <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
    <Path d="M6 4v6a6 6 0 0 0 12 0V4" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M4 20h16" stroke={color} strokeWidth={2} strokeLinecap="round" />
  </Svg>
);

const StrikeThroughIcon = ({ color = '#4a5568' }: { color?: string }) => (
  <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
    <Path d="M6 16h12M8 12h8M10 8h4" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const FontColorIcon = ({ color = '#4a5568' }: { color?: string }) => (
  <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
    <Path d="M4 20L12 4L20 20" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M8 14h8" stroke={color} strokeWidth={2} strokeLinecap="round" />
    <Circle cx="12" cy="18" r="2" fill={color} />
  </Svg>
);

// ─── SHAPE DIMENSIONS ─────────────────────────────────────────────────────────

const SHAPE_W = 120;
const SHAPE_H = 60;
const GRID = 10;

// ─── PAGE MANAGEMENT ─────────────────────────────────────────────────────────

interface Page {
  id: string;
  name: string;
  xml: string;
}

const generatePageId = () => `page_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;

// ─── MAIN COMPONENT ──────────────────────────────────────────────────────────

export default function CreateScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;

  const [diagramName, setDiagramName] = useState('Blank diagram');
  const [isGraphReady, setIsGraphReady] = useState(false);
  const [graphInstance, setGraphInstance] = useState<any>(null);
  const [diagramXml, setDiagramXml] = useState<string>('');
  const [showShapesPanel, setShowShapesPanel] = useState(false);
  const [isPanelVisible, setIsPanelVisible] = useState(true);
  const [activeTool, setActiveTool] = useState<'shapes' | 'text' | 'draw' | 'comment'>('shapes');
  const [activeUmlType, setActiveUmlType] = useState('Functional Decomposition Diagram');
  
  // ─── Zoom state ─────────────────────────────────────────────────────────────
  const [zoomLevel, setZoomLevel] = useState(100);
  const ZOOM_STEPS = [50, 75, 100, 125, 150, 200, 300, 400];
  
  // ─── Page state ─────────────────────────────────────────────────────────────
  const [pages, setPages] = useState<Page[]>([
    { id: generatePageId(), name: 'Page 1', xml: '' }
  ]);
  const [activePageId, setActivePageId] = useState<string>(pages[0].id);
  const [showPageModal, setShowPageModal] = useState(false);
  const [newPageName, setNewPageName] = useState('');
  const [renamePageId, setRenamePageId] = useState<string | null>(null);
  const [renamePageName, setRenamePageName] = useState('');
  
  // ─── Page XML cache ─────────────────────────────────────────────────────────
  const pageXmlCache = useRef<Map<string, string>>(new Map());
  
  // ─── Format Bar State ──────────────────────────────────────────────────────
  const [selectedFont, setSelectedFont] = useState('Inter');
  const [selectedFontSize, setSelectedFontSize] = useState('10');
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isUnderline, setIsUnderline] = useState(false);
  const [isStrikeThrough, setIsStrikeThrough] = useState(false);
  
  const getZoomIndex = (current: number): number => {
    let closest = 0;
    let minDiff = Infinity;
    ZOOM_STEPS.forEach((step, index) => {
      const diff = Math.abs(step - current);
      if (diff < minDiff) {
        minDiff = diff;
        closest = index;
      }
    });
    return closest;
  };

  const toolbarHeight = Platform.OS === 'ios' ? 68 : 56;

  // ─── Graph callbacks ────────────────────────────────────────────────────────

  const handleGraphReady = (graph: any) => {
    setGraphInstance(graph);
    setIsGraphReady(true);
    if (graph) {
      const scale = graph.getView().getScale();
      setZoomLevel(Math.round(scale * 100));
    }
  };

  const handleGraphChange = (xml: string) => {
    setDiagramXml(xml);
    // Cache the XML for the current page
    if (activePageId) {
      pageXmlCache.current.set(activePageId, xml);
    }
  };

  // ─── ⭐ Focus helper ─────────────────────────────────────────────────────────

  const focusGraph = useCallback(() => {
    if (graphInstance && graphInstance.container) {
      try {
        // Focus the container element directly
        const container = graphInstance.container;
        if (container && typeof container.focus === 'function') {
          container.focus();
          console.log('🎯 Graph container focused');
        }
      } catch (e) {
        console.warn('Could not focus graph:', e);
      }
    }
  }, [graphInstance]);

  // ─── Page management functions ─────────────────────────────────────────────

  const getPageXml = (pageId: string): string => {
    return pageXmlCache.current.get(pageId) || '';
  };

  const switchToPage = (pageId: string) => {
    if (pageId === activePageId) return;
    
    // Save current page XML
    if (activePageId && diagramXml) {
      pageXmlCache.current.set(activePageId, diagramXml);
    }
    
    // Switch to new page
    setActivePageId(pageId);
    const pageXml = pageXmlCache.current.get(pageId) || '';
    setDiagramXml(pageXml);
    
    // Load the page content into the graph
    if (graphInstance && pageXml) {
      try {
        // Clear the graph and load the saved XML
        const model = graphInstance.getModel();
        console.log(`📄 Switched to page: ${pageId}`);
      } catch (e) {
        console.error('Error loading page:', e);
      }
    }
    
    // ⭐ Focus the graph after switching pages
    setTimeout(focusGraph, 100);
  };

  const addNewPage = () => {
    const pageName = newPageName.trim() || `Page ${pages.length + 1}`;
    const newPage: Page = {
      id: generatePageId(),
      name: pageName,
      xml: '',
    };
    
    // Save current page before adding new one
    if (activePageId && diagramXml) {
      pageXmlCache.current.set(activePageId, diagramXml);
    }
    
    setPages([...pages, newPage]);
    setActivePageId(newPage.id);
    setDiagramXml('');
    if (graphInstance) {
      try {
        // Clear the graph for the new page
        const model = graphInstance.getModel();
        model.clear();
        graphInstance.clearSelection();
      } catch (e) {
        console.error('Error clearing graph for new page:', e);
      }
    }
    setNewPageName('');
    setShowPageModal(false);
    
    // ⭐ Focus the graph after adding a new page
    setTimeout(focusGraph, 100);
  };

  const renamePage = (pageId: string, newName: string) => {
    if (!newName.trim()) return;
    setPages(pages.map(p => 
      p.id === pageId ? { ...p, name: newName.trim() } : p
    ));
    setRenamePageId(null);
    setRenamePageName('');
  };

  const deletePage = (pageId: string) => {
    if (pages.length <= 1) {
      Alert.alert('Cannot Delete', 'You must have at least one page.');
      return;
    }
    
    Alert.alert(
      'Delete Page',
      'Are you sure you want to delete this page?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: () => {
            // Remove page from cache
            pageXmlCache.current.delete(pageId);
            
            const newPages = pages.filter(p => p.id !== pageId);
            setPages(newPages);
            
            if (activePageId === pageId) {
              // Switch to the first available page
              const newActiveId = newPages[0]?.id || '';
              setActivePageId(newActiveId);
              const xml = pageXmlCache.current.get(newActiveId) || '';
              setDiagramXml(xml);
            }
            
            // ⭐ Focus the graph after deleting a page
            setTimeout(focusGraph, 100);
          }
        }
      ]
    );
  };

  const duplicatePage = (pageId: string) => {
    const page = pages.find(p => p.id === pageId);
    if (!page) return;
    
    const newPage: Page = {
      id: generatePageId(),
      name: `${page.name} (Copy)`,
      xml: pageXmlCache.current.get(pageId) || '',
    };
    
    setPages([...pages, newPage]);
    setActivePageId(newPage.id);
    setDiagramXml(newPage.xml);
    
    // ⭐ Focus the graph after duplicating a page
    setTimeout(focusGraph, 100);
  };

  // ─── Zoom functions ────────────────────────────────────────────────────────

  const handleZoomIn = useCallback(() => {
    if (!graphInstance) return;
    try {
      const currentScale = graphInstance.getView().getScale();
      const currentPercent = Math.round(currentScale * 100);
      const idx = getZoomIndex(currentPercent);
      const nextIdx = Math.min(idx + 1, ZOOM_STEPS.length - 1);
      const targetPercent = ZOOM_STEPS[nextIdx];
      graphInstance.zoomTo(targetPercent / 100, true);
      setZoomLevel(targetPercent);
    } catch (e) {
      console.error('Zoom in error:', e);
    }
  }, [graphInstance]);

  const handleZoomOut = useCallback(() => {
    if (!graphInstance) return;
    try {
      const currentScale = graphInstance.getView().getScale();
      const currentPercent = Math.round(currentScale * 100);
      const idx = getZoomIndex(currentPercent);
      const nextIdx = Math.max(idx - 1, 0);
      const targetPercent = ZOOM_STEPS[nextIdx];
      graphInstance.zoomTo(targetPercent / 100, true);
      setZoomLevel(targetPercent);
    } catch (e) {
      console.error('Zoom out error:', e);
    }
  }, [graphInstance]);

  // ─── Add shape ─────────────────────────────────────────────────────────────

  const handleAddShape = (shapeId: string) => {
    if (!graphInstance) return;

    try {
      const graph = graphInstance;
      const view = graph.getView();
      const scale = view.getScale();
      const translate = view.getTranslate();

      const container = graph.container as HTMLElement | null;
      const containerW = container?.offsetWidth ?? 320;
      const containerH = container?.offsetHeight ?? 480;

      const centerX = (containerW / 2) / scale - translate.x;
      const centerY = (containerH / 2) / scale - translate.y;

      const x = Math.round((centerX - SHAPE_W / 2) / GRID) * GRID;
      const y = Math.round((centerY - SHAPE_H / 2) / GRID) * GRID;

      const styleKey = IGRAPH_ID_STYLE_MAP[shapeId] ?? 'igraph.rectangle';

      const styleObject = {
        shape: styleKey,
        fillColor: '#ffffff',
        strokeColor: '#1a1f36',
        strokeWidth: 2,
        fontColor: '#1a1f36',
        fontSize: 12,
        align: 'center' as const,
        verticalAlign: 'middle' as const,
        whiteSpace: 'wrap',
      };

      const cell = graph.insertVertex(
        null, null, '',
        x, y,
        SHAPE_W, SHAPE_H,
        styleObject,
      );

      graph.setSelectionCell(cell);
      console.log(`✅ Added "${shapeId}" as "${styleKey}" at (${x}, ${y})`);
      
      // ⭐ Focus the graph after adding a shape
      setTimeout(focusGraph, 50);
    } catch (e) {
      console.error('Error adding shape:', e);
    }
  };

  // ─── Toolbar actions ────────────────────────────────────────────────────────

  const handlePrint = () => {
    if (!diagramXml) { Alert.alert('Empty Diagram', 'Nothing to print.'); return; }
    Alert.alert('Print', 'Print functionality coming soon!');
  };

  const handleDownload = () => {
    if (!diagramXml) { Alert.alert('Empty Diagram', 'Nothing to download.'); return; }
    Alert.alert('Download', 'Download functionality coming soon!');
  };

  const handleUndo = () => {
    if (!graphInstance) return;
    try {
      const um = graphInstance.undoManager;
      if (um && um.canUndo()) {
        um.undo();
        const xml = graphInstance.getModel().getXml();
        setDiagramXml(xml);
        if (activePageId) {
          pageXmlCache.current.set(activePageId, xml);
        }
        // ⭐ Focus the graph after undo
        setTimeout(focusGraph, 50);
      }
    } catch (e) { console.error('Undo error:', e); }
  };

  const handleRedo = () => {
    if (!graphInstance) return;
    try {
      const um = graphInstance.undoManager;
      if (um && um.canRedo()) {
        um.redo();
        const xml = graphInstance.getModel().getXml();
        setDiagramXml(xml);
        if (activePageId) {
          pageXmlCache.current.set(activePageId, xml);
        }
        // ⭐ Focus the graph after redo
        setTimeout(focusGraph, 50);
      }
    } catch (e) { console.error('Redo error:', e); }
  };

  const toggleShapesPanel = () => {
    setShowShapesPanel(prev => !prev);
    if (activeTool !== 'shapes') setActiveTool('shapes');
    
    // ⭐ CRITICAL FIX: When closing the panel, focus the graph
    // When opening the panel, we might not want to steal focus
    if (showShapesPanel) {
      // We're about to close it - refocus the graph
      setTimeout(focusGraph, 100);
    }
  };

  // ─── ⭐ Effect to refocus graph when panel state changes ──────────────────

  useEffect(() => {
    // When the shapes panel is closed (showShapesPanel becomes false),
    // refocus the graph
    if (!showShapesPanel && isGraphReady) {
      setTimeout(focusGraph, 150);
    }
  }, [showShapesPanel, isGraphReady, focusGraph]);

  // ─── Format Bar Actions ────────────────────────────────────────────────────

  const toggleBold = () => setIsBold(!isBold);
  const toggleItalic = () => setIsItalic(!isItalic);
  const toggleUnderline = () => setIsUnderline(!isUnderline);
  const toggleStrikeThrough = () => setIsStrikeThrough(!isStrikeThrough);

  // ─── Page Tab Component ────────────────────────────────────────────────────

  const PageTab = ({ page, isActive }: { page: Page; isActive: boolean }) => {
    if (Platform.OS === 'web') {
      return (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '4px 10px',
            height: '100%',
            backgroundColor: isActive ? '#eef2ff' : 'transparent',
            borderRadius: '6px 6px 0 0',
            borderBottom: isActive ? '2px solid #4c6fff' : '2px solid transparent',
            transition: 'all 0.15s ease',
          }}
          onClick={() => switchToPage(page.id)}
        >
          <PageIcon color={isActive ? '#4c6fff' : '#64748b'} />
          <span
            style={{
              fontSize: '12px',
              fontWeight: isActive ? '600' : '500',
              color: isActive ? '#1a1f36' : '#64748b',
              maxWidth: '80px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {page.name}
          </span>
          {pages.length > 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                deletePage(page.id);
              }}
              style={{
                padding: '2px',
                borderRadius: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'transparent',
                border: 'none',
              }}
            >
              <CloseTabIcon color="#64748b" />
            </button>
          )}
        </div>
      );
    }

    return (
      <TouchableOpacity
        style={[styles.pageTab, isActive && styles.pageTabActive]}
        onPress={() => switchToPage(page.id)}
      >
        <PageIcon color={isActive ? '#4c6fff' : '#64748b'} />
        <Text style={[styles.pageTabText, isActive && styles.pageTabTextActive]} numberOfLines={1}>
          {page.name}
        </Text>
        {pages.length > 1 && (
          <TouchableOpacity style={styles.pageTabClose} onPress={() => deletePage(page.id)}>
            <CloseTabIcon color="#64748b" />
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  };

  // ─── MOBILE VIEW ─────────────────────────────────────────────────────────────

  if (!isDesktop) {
    return (
      <SafeAreaView style={styles.mobileContainer}>
        <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

        <View style={styles.mobileTopBar}>
          <TouchableOpacity onPress={() => router.back()} style={styles.mobileBackBtn}>
            <ICONS.Close color="#4a5568" />
          </TouchableOpacity>
          <Text style={styles.mobileTitle} numberOfLines={1}>
            {diagramName}
          </Text>
          <View style={styles.mobileTopBarRight}>
            <TouchableOpacity
              style={styles.mobileActionBtn}
              onPress={handlePrint}
              disabled={!isGraphReady}
            >
              <PrintIcon color={isGraphReady ? '#4a5568' : '#cbd5e1'} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.mobileActionBtn}
              onPress={handleDownload}
              disabled={!isGraphReady}
            >
              <DownloadIcon color={isGraphReady ? '#4a5568' : '#cbd5e1'} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.mobileCanvasContainer}>
          <DiagramCanvas
            key="diagram-canvas"
            onReady={handleGraphReady}
            onChange={handleGraphChange}
            umlType={activeUmlType}
          />
        </View>

        <View style={[styles.mobileBottomToolbar, { height: toolbarHeight }]}>
          <View style={styles.mobileBottomToolbarRow}>
            <View style={styles.mobileToolGroup}>
              <TouchableOpacity
                style={[styles.mobileBottomToolBtn, showShapesPanel && styles.mobileBottomToolBtnActive]}
                onPress={toggleShapesPanel}
              >
                <ICONS.Shapes color={showShapesPanel ? '#4c6fff' : '#64748b'} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.mobileBottomToolBtn, activeTool === 'text' && styles.mobileBottomToolBtnActive]}
                onPress={() => setActiveTool('text')}
              >
                <ICONS.Text color={activeTool === 'text' ? '#4c6fff' : '#64748b'} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.mobileBottomToolBtn, activeTool === 'draw' && styles.mobileBottomToolBtnActive]}
                onPress={() => setActiveTool('draw')}
              >
                <ICONS.Draw color={activeTool === 'draw' ? '#4c6fff' : '#64748b'} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.mobileBottomToolBtn, activeTool === 'comment' && styles.mobileBottomToolBtnActive]}
                onPress={() => setActiveTool('comment')}
              >
                <ICONS.Comment color={activeTool === 'comment' ? '#4c6fff' : '#64748b'} />
              </TouchableOpacity>
            </View>

            <View style={styles.mobileToolDivider} />

            <View style={styles.mobileToolGroup}>
              <TouchableOpacity
                style={styles.mobileBottomToolBtn}
                onPress={handleZoomOut}
                disabled={!isGraphReady}
              >
                <ZoomOutIcon color={isGraphReady ? '#4a5568' : '#cbd5e1'} />
              </TouchableOpacity>
              <Text style={styles.mobileZoomLabel}>{Math.round(zoomLevel)}%</Text>
              <TouchableOpacity
                style={styles.mobileBottomToolBtn}
                onPress={handleZoomIn}
                disabled={!isGraphReady}
              >
                <ZoomInIcon color={isGraphReady ? '#4a5568' : '#cbd5e1'} />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <ShapesBottomPanel
          visible={showShapesPanel}
          onClose={toggleShapesPanel}
          onSelectShape={handleAddShape}
          onUmlTypeChange={setActiveUmlType}
          isGraphReady={isGraphReady}
          toolbarHeight={toolbarHeight}
        />
      </SafeAreaView>
    );
  }

  // ─── DESKTOP VIEW ─────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.container}>

        {/* NAVBAR */}
        <View style={styles.navbar}>
          <View style={styles.navbarLeft}>
            <TouchableOpacity style={styles.navIconBtn} onPress={() => router.back()} activeOpacity={0.7}>
              <ICONS.Close color="#4a5568" />
            </TouchableOpacity>
            <TextInput
              style={[styles.titleInput, styles.titleInputDesktop]}
              value={diagramName}
              onChangeText={setDiagramName}
              placeholder="Diagram Name"
              placeholderTextColor="#94a3b8"
              maxLength={50}
            />
          </View>
          <View style={styles.navbarRight}>
            <TouchableOpacity
              style={[styles.navIconBtn, styles.navBtnPrimary, !isGraphReady && styles.navBtnDisabled]}
              onPress={handlePrint}
              activeOpacity={0.7}
              disabled={!isGraphReady}
            >
              <PrintIcon color={isGraphReady ? '#ffffff' : '#94a3b8'} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.navIconBtn, styles.navBtnPrimary, !isGraphReady && styles.navBtnDisabled]}
              onPress={handleDownload}
              activeOpacity={0.7}
              disabled={!isGraphReady}
            >
              <DownloadIcon color={isGraphReady ? '#ffffff' : '#94a3b8'} />
            </TouchableOpacity>
          </View>
        </View>

        {/* ─── FORMAT BAR ─── */}
        <View style={styles.formatBar}>
          <TouchableOpacity
            style={[styles.formatBtn, !isGraphReady && styles.formatBtnDisabled]}
            onPress={handleUndo}
            disabled={!isGraphReady}
            activeOpacity={0.7}
          >
            <UndoIcon color={isGraphReady ? '#4a5568' : '#cbd5e1'} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.formatBtn, !isGraphReady && styles.formatBtnDisabled]}
            onPress={handleRedo}
            disabled={!isGraphReady}
            activeOpacity={0.7}
          >
            <RedoIcon color={isGraphReady ? '#4a5568' : '#cbd5e1'} />
          </TouchableOpacity>

          <View style={styles.formatDivider} />

          {Platform.OS === 'web' ? (
            <>
              <select
                style={{
                  fontSize: '11px',
                  color: '#1a1f36',
                  backgroundColor: 'transparent',
                  border: 'none',
                  padding: '2px 4px',
                  borderRadius: '4px',
                  height: '28px',
                  minWidth: '40px',
                  maxWidth: '80px',
                  outline: 'none',
                  fontFamily: 'inherit',
                }}
                value={selectedFont}
                onChange={(e) => setSelectedFont(e.target.value)}
                disabled={!isGraphReady}
              >
                <option value="Inter">Inter</option>
                <option value="Arial">Arial</option>
                <option value="Helvetica">Helvetica</option>
                <option value="Georgia">Georgia</option>
                <option value="Times New Roman">Times New Roman</option>
                <option value="Courier New">Courier New</option>
                <option value="Verdana">Verdana</option>
              </select>

              <select
                style={{
                  fontSize: '11px',
                  color: '#1a1f36',
                  backgroundColor: 'transparent',
                  border: 'none',
                  padding: '2px 4px',
                  borderRadius: '4px',
                  height: '28px',
                  minWidth: '30px',
                  maxWidth: '50px',
                  outline: 'none',
                  fontFamily: 'inherit',
                }}
                value={selectedFontSize}
                onChange={(e) => setSelectedFontSize(e.target.value)}
                disabled={!isGraphReady}
              >
                <option value="8">8</option>
                <option value="10">10</option>
                <option value="12">12</option>
                <option value="14">14</option>
                <option value="16">16</option>
                <option value="18">18</option>
                <option value="20">20</option>
                <option value="24">24</option>
                <option value="28">28</option>
                <option value="32">32</option>
                <option value="36">36</option>
                <option value="48">48</option>
                <option value="72">72</option>
              </select>
            </>
          ) : (
            <>
              <Text style={styles.formatLabel}>Inter</Text>
              <Text style={styles.formatLabel}>{selectedFontSize}pt</Text>
            </>
          )}

          <View style={styles.formatDivider} />

          <TouchableOpacity
            style={[styles.formatBtn, isBold && styles.formatBtnActive]}
            onPress={toggleBold}
            disabled={!isGraphReady}
            activeOpacity={0.7}
          >
            <BoldIcon color={isBold ? '#4c6fff' : (isGraphReady ? '#4a5568' : '#cbd5e1')} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.formatBtn, isItalic && styles.formatBtnActive]}
            onPress={toggleItalic}
            disabled={!isGraphReady}
            activeOpacity={0.7}
          >
            <ItalicIcon color={isItalic ? '#4c6fff' : (isGraphReady ? '#4a5568' : '#cbd5e1')} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.formatBtn, isUnderline && styles.formatBtnActive]}
            onPress={toggleUnderline}
            disabled={!isGraphReady}
            activeOpacity={0.7}
          >
            <UnderlineIcon color={isUnderline ? '#4c6fff' : (isGraphReady ? '#4a5568' : '#cbd5e1')} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.formatBtn, isStrikeThrough && styles.formatBtnActive]}
            onPress={toggleStrikeThrough}
            disabled={!isGraphReady}
            activeOpacity={0.7}
          >
            <StrikeThroughIcon color={isStrikeThrough ? '#4c6fff' : (isGraphReady ? '#4a5568' : '#cbd5e1')} />
          </TouchableOpacity>

          <View style={styles.formatDivider} />

          <TouchableOpacity
            style={[styles.formatBtn, !isGraphReady && styles.formatBtnDisabled]}
            disabled={!isGraphReady}
            activeOpacity={0.7}
          >
            <FontColorIcon color={isGraphReady ? '#4a5568' : '#cbd5e1'} />
          </TouchableOpacity>
        </View>

        {/* BODY */}
        <View style={styles.body}>
          <View style={styles.canvasContainer}>
            <DiagramCanvas
              key="diagram-canvas"
              onReady={handleGraphReady}
              onChange={handleGraphChange}
              umlType={activeUmlType}
            />
          </View>

          <View style={styles.iconRail}>
            <TouchableOpacity
              style={[styles.railBtn, isPanelVisible && styles.railBtnActive]}
              onPress={() => {
                setIsPanelVisible(prev => !prev);
                // ⭐ When toggling panel visibility, refocus the graph
                setTimeout(focusGraph, 100);
              }}
              activeOpacity={0.7}
            >
              <ICONS.Shapes color={isPanelVisible ? '#ffffff' : '#4a5568'} />
            </TouchableOpacity>
          </View>

          {isPanelVisible && (
            <View style={styles.shapesPanelWrapper}>
              <ShapesPanel
                onSelectShape={handleAddShape}
                isGraphReady={isGraphReady}
              />
            </View>
          )}
        </View>

        {/* BOTTOM BAR */}
        <View style={styles.bottomBar}>
          <View style={styles.pageTabsRow}>
            {Platform.OS === 'web' ? (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  height: '100%',
                  overflowX: 'auto',
                  maxWidth: '300px',
                  gap: '2px',
                }}
              >
                {pages.map((page) => (
                  <PageTab key={page.id} page={page} isActive={activePageId === page.id} />
                ))}
              </div>
            ) : (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.pageTabsScroll}
                contentContainerStyle={styles.pageTabsContent}
              >
                {pages.map((page) => (
                  <PageTab key={page.id} page={page} isActive={activePageId === page.id} />
                ))}
              </ScrollView>
            )}
            
            <TouchableOpacity
              style={styles.pageTabAdd}
              onPress={() => setShowPageModal(true)}
              activeOpacity={0.7}
            >
              <Text style={styles.pageTabAddText}>+</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.zoomRow}>
            <TouchableOpacity
              style={styles.zoomBtn}
              onPress={handleZoomOut}
              disabled={!isGraphReady}
              activeOpacity={0.7}
            >
              <Text style={[styles.zoomBtnText, !isGraphReady && styles.zoomBtnDisabled]}>−</Text>
            </TouchableOpacity>
            <Text style={styles.zoomLabel}>{Math.round(zoomLevel)}%</Text>
            <TouchableOpacity
              style={styles.zoomBtn}
              onPress={handleZoomIn}
              disabled={!isGraphReady}
              activeOpacity={0.7}
            >
              <Text style={[styles.zoomBtnText, !isGraphReady && styles.zoomBtnDisabled]}>+</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ─── ADD PAGE MODAL ─────────────────────────────────────────────────── */}
        <Modal
          visible={showPageModal}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowPageModal(false)}
        >
          <Pressable
            style={styles.modalOverlay}
            onPress={() => setShowPageModal(false)}
          >
            <Pressable
              style={styles.modalContent}
              onPress={(e) => e.stopPropagation()}
            >
              <Text style={styles.modalTitle}>Add New Page</Text>
              <Text style={styles.modalSubtitle}>Enter a name for the new page</Text>
              
              <TextInput
                style={styles.modalInput}
                placeholder="Page name..."
                placeholderTextColor="#94a3b8"
                value={newPageName}
                onChangeText={setNewPageName}
                autoFocus
                onSubmitEditing={addNewPage}
                returnKeyType="done"
              />
              
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalCancelButton]}
                  onPress={() => {
                    setShowPageModal(false);
                    setNewPageName('');
                    // ⭐ Refocus graph after modal closes
                    setTimeout(focusGraph, 100);
                  }}
                >
                  <Text style={styles.modalCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalCreateButton]}
                  onPress={addNewPage}
                >
                  <Text style={styles.modalCreateText}>Create Page</Text>
                </TouchableOpacity>
              </View>
            </Pressable>
          </Pressable>
        </Modal>
      </View>
    </SafeAreaView>
  );
}

// ─── Print & Download Icons ──────────────────────────────────────────────────

const PrintIcon = ({ color = '#4a5568' }: { color?: string }) => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
    <Path d="M6 9V3H18V9" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M6 21H18V15H6V21Z" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M6 15H4C3.46957 15 2.96086 14.7893 2.58579 14.4142C2.21071 14.0391 2 13.5304 2 13V11C2 10.4696 2.21071 9.96086 2.58579 9.58579C2.96086 9.21071 3.46957 9 4 9H20C20.5304 9 21.0391 9.21071 21.4142 9.58579C21.7893 9.96086 22 10.4696 22 11V13C22 13.5304 21.7893 14.0391 21.4142 14.4142C21.0391 14.7893 20.5304 15 20 15H18" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M17 13H7" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
  </Svg>
);

const DownloadIcon = ({ color = '#4a5568' }: { color?: string }) => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
    <Path d="M21 15V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V15" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M7 10L12 15L17 10" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M12 15V3" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

// ─── STYLES ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8faff',
  },

  navbar: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    zIndex: 20,
  },
  navbarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  navbarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  navIconBtn: {
    width: 34,
    height: 34,
    borderRadius: 7,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  navBtnPrimary: {
    backgroundColor: '#4c6fff',
  },
  navBtnDisabled: {
    opacity: 0.45,
  },
  titleInput: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1a1f36',
    paddingVertical: 2,
    paddingHorizontal: 4,
    minWidth: 100,
  },
  titleInputDesktop: {
    fontSize: 16,
    minWidth: 180,
  },

  formatBar: {
    height: 40,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    gap: 4,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    zIndex: 19,
  },
  formatBtn: {
    width: 30,
    height: 30,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  formatBtnActive: {
    backgroundColor: '#eef2ff',
  },
  formatBtnDisabled: {
    opacity: 0.4,
  },
  formatDivider: {
    width: 1,
    height: 20,
    backgroundColor: '#e2e8f0',
    marginHorizontal: 4,
  },
  formatLabel: {
    fontSize: 11,
    color: '#4a5568',
    paddingHorizontal: 4,
    fontWeight: '500',
  },

  body: {
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
  },
  canvasContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#f0f2f5',
    zIndex: 1,
  },

  iconRail: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    width: 36,
    backgroundColor: '#ffffff',
    borderRightWidth: 1,
    borderRightColor: '#e2e8f0',
    alignItems: 'center',
    paddingTop: 8,
    gap: 4,
    zIndex: 5,
  },
  railBtn: {
    width: 28,
    height: 28,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  railBtnActive: {
    backgroundColor: '#4c6fff',
  },

  shapesPanelWrapper: {
    position: 'absolute',
    top: 0,
    left: 36,
    bottom: 0,
    zIndex: 4,
  },

  bottomBar: {
    height: 36,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    zIndex: 20,
  },
  pageTabsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
  },
  pageTabsScroll: {
    flex: 1,
  },
  pageTabsContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  pageTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    marginRight: 4,
  },
  pageTabActive: {
    backgroundColor: '#eef2ff',
  },
  pageTabText: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
    marginLeft: 4,
    maxWidth: 80,
  },
  pageTabTextActive: {
    color: '#1a1f36',
    fontWeight: '600',
  },
  pageTabClose: {
    padding: 2,
    marginLeft: 4,
  },
  pageTabAdd: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pageTabAddText: {
    fontSize: 16,
    color: '#64748b',
    lineHeight: 20,
  },
  zoomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  zoomBtn: {
    width: 24,
    height: 24,
    borderRadius: 5,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoomBtnText: {
    fontSize: 16,
    color: '#4a5568',
    lineHeight: 20,
    fontWeight: '600',
  },
  zoomBtnDisabled: {
    color: '#cbd5e1',
  },
  zoomLabel: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '500',
    minWidth: 32,
    textAlign: 'center',
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    width: 360,
    maxWidth: '90%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1f36',
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 16,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#1a1f36',
    backgroundColor: '#f8faff',
    marginBottom: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelButton: {
    backgroundColor: '#f1f5f9',
  },
  modalCancelText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
  },
  modalCreateButton: {
    backgroundColor: '#4c6fff',
  },
  modalCreateText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },

  mobileContainer: {
    flex: 1,
    backgroundColor: '#f8faff',
  },
  mobileTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#eef2f5',
  },
  mobileBackBtn: {
    padding: 4,
  },
  mobileTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: '600',
    color: '#1a1f36',
    textAlign: 'center',
  },
  mobileTopBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  mobileActionBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f1f5f9',
  },
  mobileCanvasContainer: {
    flex: 1,
    backgroundColor: '#f8faff',
  },
  mobileBottomToolbar: {
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#eef2f5',
    paddingHorizontal: 12,
    zIndex: 10,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  mobileBottomToolbarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: '100%',
  },
  mobileToolGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  mobileBottomToolBtn: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mobileBottomToolBtnActive: {
    backgroundColor: '#eef2ff',
  },
  mobileToolDivider: {
    width: 1,
    height: 28,
    backgroundColor: '#e2e8f0',
  },
  mobileZoomLabel: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '500',
    minWidth: 36,
    textAlign: 'center',
  },
});