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
import { useRouter, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Svg, Path, Rect, Circle } from 'react-native-svg';
import { SvgCanvas2D, ImageExport } from '@maxgraph/core';
import DiagramCanvas, { DiagramCanvasHandle } from '@/components/DiagramCanvas';
import ShapesPanel from '@/components/shapes/ShapesPanel';
import ShapesBottomPanel from '../../components/shapes/ShapesBottomPanel';
import PropertiesPanel from '@/components/properties-panel/PropertiesPanel';
import { ICONS } from '../../constants/icons';
import { COLORS, SPACING } from '@/constants/theme';
import { IGRAPH_ID_STYLE_MAP } from '@/components/maxgraph-custom-shapes';
import * as authService from '../../services/authService';
import { useSave } from '../../contexts/SaveContext';

const UndoIcon = ({ color = '#4a5568', size = 20 }: { color?: string; size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
    <Path d="M9.41 7H15a7 7 0 110 14h-1v-2h1a5 5 0 000-10H9.41l2.3 2.29L10.29 13 5 7.71 10.29 2.4l1.42 1.42L9.41 7z"/>
  </Svg>
);

const RedoIcon = ({ color = '#4a5568', size = 20 }: { color?: string; size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
    <Path d="M14.59 7H9a7 7 0 100 14h1v-2H9a5 5 0 010-10h5.59l-2.3 2.29L13.71 13 19 7.71 13.71 2.4l-1.42 1.42L14.59 7z"/>
  </Svg>
);

//SAVE ICON 

const SaveIcon = ({ color = '#4a5568' }: { color?: string }) => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
    <Path
      d="M19 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.21071 3.96086 4.46957 3 5 3H16L21 8V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21Z"
      stroke={color}
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M17 21V13H7V21"
      stroke={color}
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M7 3V8H15"
      stroke={color}
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

// ─── ZOOM ICONS ──────────────────────────────────────────────────────────────

const ZoomInIcon = ({ color = '#4a5568' }: { color?: string }) => (
  <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
    <Circle cx="11" cy="11" r="7" stroke={color} strokeWidth={1.8} />
    <Path d="M16 16L21 21" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    <Path d="M11 8V14" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    <Path d="M8 11H14" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
  </Svg>
);

const ZoomOutIcon = ({ color = '#4a5568' }: { color?: string }) => (
  <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
    <Circle cx="11" cy="11" r="7" stroke={color} strokeWidth={1.8} />
    <Path d="M16 16L21 21" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    <Path d="M8 11H14" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
  </Svg>
);

// ─── DOWNLOAD DROPDOWN ──────────────────────────────────────────────────────

const DownloadDropdown = ({
  onSelectFormat,
  style,
  align = 'right',
}: {
  onSelectFormat: (format: 'png' | 'svg' | 'pdf' | 'jpg') => void;
  style?: any;
  align?: 'left' | 'right';
}) => {
  const formats = [
    { id: 'png', label: 'PNG', description: 'High quality, lossless', icon: '🖼️' },
    { id: 'svg', label: 'SVG', description: 'Vector, scalable', icon: '📐' },
    { id: 'pdf', label: 'PDF', description: 'Document format', icon: '📄' },
    { id: 'jpg', label: 'JPG', description: 'Smaller file size', icon: '🖼️' },
  ] as const;

  return (
    <View
      style={[
        styles.downloadDropdown,
        align === 'left' ? { left: 0 } : { right: 0 },
        style,
      ]}
    >
      {formats.map((format, index) => (
        <TouchableOpacity
          key={format.id}
          style={[
            styles.downloadDropdownItem,
            index === formats.length - 1 && styles.downloadDropdownItemLast,
          ]}
          onPress={() => onSelectFormat(format.id)}
          activeOpacity={0.6}
        >
          <Text style={styles.downloadDropdownIcon}>{format.icon}</Text>
          <View style={styles.downloadDropdownTextWrap}>
            <Text style={styles.downloadDropdownLabel}>{format.label}</Text>
            <Text style={styles.downloadDropdownDescription}>{format.description}</Text>
          </View>
        </TouchableOpacity>
      ))}
    </View>
  );
};

// ─── MAIN COMPONENT ──────────────────────────────────────────────────────────

interface Page {
  id: string;
  name: string;
  xml: string;
}

const generatePageId = () => `page_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;

export default function CreateScreen() {
  const router = useRouter();
  const { diagramId } = useLocalSearchParams<{ diagramId?: string }>();
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

  // ─── ✅ FIX: Use ref to store diagramXml without causing re-renders ───────
  const diagramXmlRef = useRef<string>('');
  // Same idea for the name: reading it via ref keeps handleSaveDiagram's
  // identity stable while typing, so it isn't recreated (and re-registered
  // with SaveContext) on every keystroke — typing the name should never by
  // itself cause anything save-related to run; only clicking Save should.
  const diagramNameRef = useRef<string>('Blank diagram');

  // ─── Save state ──────────────────────────────────────────────────────────────
  const [isSaving, setIsSaving] = useState(false);

  // ─── Download state ──────────────────────────────────────────────────────────
  const [showDownloadDropdown, setShowDownloadDropdown] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  // ─── In-app alert/confirm dialog (web) ───────────────────────────────────────
  // react-native-web's Alert.alert is a no-op, and window.alert/confirm work
  // but show a distracting native browser chrome ("localhost says..."). This
  // renders a plain in-app modal instead, matching the app's own style.
  const [dialogState, setDialogState] = useState<{
    title: string;
    message?: string;
    confirmText?: string;
    onConfirm?: () => void;
  } | null>(null);

  // ─── Print state ─────────────────────────────────────────────────────────────
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [printPreviewUrl, setPrintPreviewUrl] = useState<string | null>(null);
  const [printCopies, setPrintCopies] = useState('1');
  const [printPageRange, setPrintPageRange] = useState('');
  const [printOrientation, setPrintOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const [printPaperSize, setPrintPaperSize] = useState<string>('Letter');
  const [showPaperSizeDropdown, setShowPaperSizeDropdown] = useState(false);
  const [showOrientationDropdown, setShowOrientationDropdown] = useState(false);
  const [isPreparingPrint, setIsPreparingPrint] = useState(false);

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

  // ─── Persistence: continue-a-diagram / per-account local draft ──────────────
  const diagramCanvasRef = useRef<DiagramCanvasHandle>(null);
  // Diagram currently being edited; null = never-saved new diagram.
  const currentDiagramIdRef = useRef<string | null>(null);
  // Last diagramId this instance has actually hydrated from the backend, so a
  // re-render doesn't re-fetch, but switching to a *different* diagramId does.
  const loadedDiagramIdRef = useRef<string | null>(null);
  // Gates the autosave effect so the initial blank mount can't race ahead and
  // clobber a real draft before hydration (backend fetch or local draft) runs.
  const hasHydratedRef = useRef(false);
  // While true, handleGraphChange no-ops: hydration sets diagramXml/
  // pageXmlCache itself, and the maxGraph CHANGE listener fires synchronously
  // inside loadXml()'s import — without this guard it would capture the new
  // XML under the *previous* render's activePageId.
  const isHydratingRef = useRef(false);
  const autosaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Synchronous re-entrancy guard for Save: `isSaving` state doesn't flip
  // true until after an `await` (auth token lookup) runs, leaving a window
  // where rapid repeat clicks (e.g. because the no-op Alert.alert on web
  // gave no visible confirmation) all slip through and each create their own
  // new diagram before the first one's response ever sets currentDiagramIdRef.
  const isSavingRef = useRef(false);

  // ─── SaveContext integration ──────────────────────────────────────────────
  const { setSaveHandler, setIsSaving: setContextIsSaving } = useSave();

  // ─── Debug: Log when component mounts ──────────────────────────────────────
  useEffect(() => {
    console.log('🔍 create.tsx mounted, setSaveHandler available:', !!setSaveHandler);
  }, [setSaveHandler]);

  // ─── ✅ FIX: Update ref whenever diagramXml changes ──────────────────────
  useEffect(() => {
    diagramXmlRef.current = diagramXml;
  }, [diagramXml]);

  useEffect(() => {
    diagramNameRef.current = diagramName;
  }, [diagramName]);

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
    console.log('🟢 Graph ready, setting graphInstance');
    setGraphInstance(graph);
    setIsGraphReady(true);
    if (graph) {
      try {
        const scale = graph.getView().getScale();
        setZoomLevel(Math.round(scale * 100));
      } catch (e) {
        console.warn('Could not get scale:', e);
      }
    }
  };

  const handleGraphChange = (xml: string) => {
    if (isHydratingRef.current) return;
    console.log('🔄 Graph changed, XML length:', xml?.length || 0);
    setDiagramXml(xml);
    if (activePageId) {
      pageXmlCache.current.set(activePageId, xml);
    }
  };

  // ─── Persistence: continue a saved diagram / resume the local draft ────────

  const applyLoadedContent = (content: { name: string; xml: string; pages?: Page[]; activePageId?: string | null }) => {
    pageXmlCache.current.clear();
    const loadedPages: Page[] = content.pages && content.pages.length > 0
      ? content.pages
      : [{ id: generatePageId(), name: 'Page 1', xml: content.xml || '' }];
    loadedPages.forEach(p => pageXmlCache.current.set(p.id, p.xml || ''));
    const targetActiveId = content.activePageId && loadedPages.some(p => p.id === content.activePageId)
      ? content.activePageId
      : loadedPages[0].id;
    const activeXml = pageXmlCache.current.get(targetActiveId) || content.xml || '';

    setPages(loadedPages);
    setActivePageId(targetActiveId);
    setDiagramName(content.name || 'Blank diagram');
    setDiagramXml(activeXml);

    isHydratingRef.current = true;
    diagramCanvasRef.current?.loadXml(activeXml);
    isHydratingRef.current = false;
  };

  const draftKey = (uid: string, id: string | null) => `diagram_draft_${uid}_${id || 'new'}`;
  const activePointerKey = (uid: string) => `diagram_active_${uid}`;

  const persistDraft = async (uid: string, id: string | null) => {
    try {
      const content = {
        name: diagramNameRef.current,
        pages: pages.map(p => ({ id: p.id, name: p.name, xml: pageXmlCache.current.get(p.id) || '' })),
        activePageId,
      };
      await AsyncStorage.setItem(draftKey(uid, id), JSON.stringify(content));
      await AsyncStorage.setItem(activePointerKey(uid), JSON.stringify({ diagramId: id }));
    } catch (e) {
      console.warn('Could not persist local draft:', e);
    }
  };

  // Loads a specific saved diagram when arriving via "Continue" from Saved
  // Diagrams; otherwise resumes this account's last local draft so a shape
  // survives a tab switch (instance never unmounts, see Navbar's create-only
  // router.navigate) or a full logout/login (which does unmount everything).
  useEffect(() => {
    if (!isGraphReady) return;
    let cancelled = false;

    const hydrate = async () => {
      if (diagramId && diagramId !== loadedDiagramIdRef.current) {
        loadedDiagramIdRef.current = diagramId;
        try {
          const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://igraph-backend.onrender.com';
          const response = await authService.authFetch(`${API_URL}/api/diagrams/${diagramId}`);
          const result = await response.json();
          if (cancelled) return;
          if (result.success && result.data) {
            applyLoadedContent(result.data);
            currentDiagramIdRef.current = diagramId;
          } else {
            notify('Error', result.message || 'Could not load that diagram.');
          }
        } catch (e) {
          console.error('Failed to load diagram:', e);
          notify('Error', 'Could not load that diagram. Please check your connection.');
        } finally {
          if (!cancelled) hasHydratedRef.current = true;
        }
        return;
      }

      if (!diagramId && !hasHydratedRef.current) {
        try {
          const uid = await authService.getCurrentUserId();
          if (uid) {
            const pointerRaw = await AsyncStorage.getItem(activePointerKey(uid));
            const pointer = pointerRaw ? JSON.parse(pointerRaw) : { diagramId: null };
            const contentRaw = await AsyncStorage.getItem(draftKey(uid, pointer.diagramId));
            if (contentRaw && !cancelled) {
              applyLoadedContent(JSON.parse(contentRaw));
              currentDiagramIdRef.current = pointer.diagramId || null;
              loadedDiagramIdRef.current = pointer.diagramId || null;
            }
          }
        } catch (e) {
          console.warn('Could not restore local draft:', e);
        } finally {
          if (!cancelled) hasHydratedRef.current = true;
        }
      }
    };

    hydrate();
    return () => { cancelled = true; };
  }, [isGraphReady, diagramId]);

  // Debounced per-account autosave so unsaved edits survive a tab switch or
  // a logout/login even before the user explicitly hits Save.
  useEffect(() => {
    if (!hasHydratedRef.current) return;
    if (autosaveTimeoutRef.current) clearTimeout(autosaveTimeoutRef.current);
    autosaveTimeoutRef.current = setTimeout(() => {
      authService.getCurrentUserId().then((uid) => {
        if (uid) persistDraft(uid, currentDiagramIdRef.current);
      });
    }, 800);
    return () => {
      if (autosaveTimeoutRef.current) clearTimeout(autosaveTimeoutRef.current);
    };
  }, [diagramXml, pages, diagramName, activePageId]);

  // ─── Focus helper ─────────────────────────────────────────────────────────

  const focusGraph = useCallback(() => {
    if (graphInstance && graphInstance.container) {
      try {
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

    if (activePageId && diagramXml) {
      pageXmlCache.current.set(activePageId, diagramXml);
    }

    setActivePageId(pageId);
    const pageXml = pageXmlCache.current.get(pageId) || '';
    setDiagramXml(pageXml);

    if (graphInstance && pageXml) {
      try {
        console.log(`📄 Switched to page: ${pageId}`);
      } catch (e) {
        console.error('Error loading page:', e);
      }
    }

    setTimeout(focusGraph, 100);
  };

  const addNewPage = () => {
    const pageName = newPageName.trim() || `Page ${pages.length + 1}`;
    const newPage: Page = {
      id: generatePageId(),
      name: pageName,
      xml: '',
    };

    if (activePageId && diagramXml) {
      pageXmlCache.current.set(activePageId, diagramXml);
    }

    setPages([...pages, newPage]);
    setActivePageId(newPage.id);
    setDiagramXml('');
    if (graphInstance) {
      try {
        const model = graphInstance.getDataModel ? graphInstance.getDataModel() : graphInstance.model;
        if (model) {
          model.clear();
          graphInstance.clearSelection();
        }
      } catch (e) {
        console.error('Error clearing graph for new page:', e);
      }
    }
    setNewPageName('');
    setShowPageModal(false);

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
            pageXmlCache.current.delete(pageId);

            const newPages = pages.filter(p => p.id !== pageId);
            setPages(newPages);

            if (activePageId === pageId) {
              const newActiveId = newPages[0]?.id || '';
              setActivePageId(newActiveId);
              const xml = pageXmlCache.current.get(newActiveId) || '';
              setDiagramXml(xml);
            }

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

      const x = Math.round((centerX - 120 / 2) / 10) * 10;
      const y = Math.round((centerY - 60 / 2) / 10) * 10;

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
        120, 60,
        styleObject,
      );

      graph.setSelectionCell(cell);
      console.log(`✅ Added "${shapeId}" as "${styleKey}" at (${x}, ${y})`);

      setTimeout(focusGraph, 50);
    } catch (e) {
      console.error('Error adding shape:', e);
    }
  };

  // ─── EXPORT FUNCTIONS ──────────────────────────────────────────────────────
  //
  // Previously these scraped the live, interactive DOM (container.querySelectorAll
  // ('svg')) and rasterized whatever was currently visible. That broke in two
  // ways: (1) the container passed in was graph.container, which only has the
  // grid background *canvas* as a sibling (not a descendant), so it was never
  // found; and (2) mxGraph/maxGraph's on-screen SVG is sized/positioned to the
  // current scroll+zoom viewport, not the full diagram — so exporting captured
  // whatever tiny/blank slice happened to be scrolled into view, not the actual
  // drawing. Building the SVG straight from the graph model (via maxGraph's own
  // ImageExport + SvgCanvas2D, sized from graph.getGraphBounds()) always
  // captures the full diagram content, regardless of current pan/zoom.

  const buildDiagramSvgElement = (graph: any, options?: { forRaster?: boolean }): SVGSVGElement => {
    // graph.getGraphBounds() is in "view" pixels — it already includes
    // whatever zoom level the editor happens to be at (e.g. 200% because the
    // user zoomed in to place a shape precisely). Exporting those raw pixels
    // 1:1 made the download look "zoomed in" and inconsistent from one save
    // to the next. Dividing out the current view scale normalizes the export
    // back to the diagram's actual size every time, regardless of zoom.
    const bounds = graph.getGraphBounds();
    const viewScale = graph.getView().getScale() || 1;
    const padding = 20;

    // viewBox stays in raw view-pixel units (matching what ImageExport will
    // actually draw), with padding added in that same raw space.
    const rawPadding = padding * viewScale;
    const viewBoxX = bounds.x - rawPadding;
    const viewBoxY = bounds.y - rawPadding;
    const viewBoxWidth = bounds.width + rawPadding * 2;
    const viewBoxHeight = bounds.height + rawPadding * 2;

    // width/height (the actual output size) are normalized back to 1:1 scale.
    // Mapping the raw viewBox into this smaller/larger box is what undoes the
    // zoom — and SVG's default preserveAspectRatio ("xMidYMid meet") centers
    // the content besides, as a safety net if the box isn't an exact multiple.
    const width = Math.max(1, Math.ceil(viewBoxWidth / viewScale));
    const height = Math.max(1, Math.ceil(viewBoxHeight / viewScale));

    const svgDoc = document.implementation.createDocument('http://www.w3.org/2000/svg', 'svg', null);
    const root = svgDoc.documentElement as unknown as SVGSVGElement;
    root.setAttribute('width', String(width));
    root.setAttribute('height', String(height));
    root.setAttribute('viewBox', `${viewBoxX} ${viewBoxY} ${viewBoxWidth} ${viewBoxHeight}`);
    root.setAttribute('version', '1.1');
    root.setAttributeNS('http://www.w3.org/2000/xmlns/', 'xmlns:xlink', 'http://www.w3.org/1999/xlink');

    const background = svgDoc.createElementNS('http://www.w3.org/2000/svg', 'rect');
    background.setAttribute('x', String(viewBoxX));
    background.setAttribute('y', String(viewBoxY));
    background.setAttribute('width', String(viewBoxWidth));
    background.setAttribute('height', String(viewBoxHeight));
    background.setAttribute('fill', '#ffffff');
    root.appendChild(background);

    const svgCanvas = new SvgCanvas2D(root, true);
    // Safari/WebKit (every browser on iOS, not just Safari itself) treats an
    // <img> loaded from an SVG containing <foreignObject> — which is how
    // maxGraph renders word-wrapped text labels by default — as tainting any
    // <canvas> it's drawn onto. canvas.toDataURL()/toBlob() then throws or
    // silently returns null. That's why PNG/JPG/PDF (all rasterized through a
    // canvas) failed on mobile while the direct SVG file download (no canvas
    // involved) kept working. Falling back to plain SVG <text> for the
    // raster path avoids foreignObject entirely, which is canvas-safe
    // everywhere — the SVG file download keeps foreignObject for nicer,
    // properly word-wrapped text since it never touches a canvas.
    if (options?.forRaster) {
      svgCanvas.foEnabled = false;
    }
    const imageExport = new ImageExport();
    const rootState = graph.getView().getState(graph.getDataModel().getRoot());
    imageExport.drawState(rootState, svgCanvas);

    return root;
  };

  const exportToSVG = (graph: any): string => {
    const svg = buildDiagramSvgElement(graph);
    const svgData = new XMLSerializer().serializeToString(svg);
    return `<?xml version="1.0" encoding="UTF-8"?>\n<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">\n${svgData}`;
  };

  const renderDiagramToCanvas = (graph: any, scale: number = 2): Promise<HTMLCanvasElement> => {
    return new Promise((resolve, reject) => {
      try {
        const svg = buildDiagramSvgElement(graph, { forRaster: true });
        const width = Number(svg.getAttribute('width')) || 800;
        const height = Number(svg.getAttribute('height')) || 600;

        // Mobile GPUs commonly cap canvas dimensions well below desktop
        // (often ~4096px per side). Exceeding that makes toBlob/toDataURL
        // silently return null/blank instead of throwing, which is why large
        // diagrams could fail to export as PNG/JPG/PDF only on phones.
        const MAX_CANVAS_DIMENSION = 4096;
        const effectiveScale = Math.min(
          scale,
          MAX_CANVAS_DIMENSION / width,
          MAX_CANVAS_DIMENSION / height
        );

        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(width * effectiveScale));
        canvas.height = Math.max(1, Math.round(height * effectiveScale));

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Could not create canvas context'));
          return;
        }

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const svgData = new XMLSerializer().serializeToString(svg);
        const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(svgBlob);

        const img = new Image();
        img.onload = () => {
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          URL.revokeObjectURL(url);
          resolve(canvas);
        };
        img.onerror = () => {
          URL.revokeObjectURL(url);
          reject(new Error('Could not render diagram to an image'));
        };
        img.src = url;
      } catch (err) {
        reject(err as Error);
      }
    });
  };

  // react-native-web's Alert.alert is a no-op, so on web any download/save
  // success/failure message was silently swallowed — making broken exports
  // look like clicking the button did nothing at all. window.alert works but
  // shows the browser's native "localhost says..." chrome; this shows an
  // in-app modal instead (see dialogState above).
  const notify = (title: string, message?: string) => {
    if (Platform.OS === 'web') {
      setDialogState({ title, message });
    } else {
      Alert.alert(title, message);
    }
  };

  const confirmDialog = (title: string, message: string, confirmText: string, onConfirm: () => void) => {
    if (Platform.OS === 'web') {
      setDialogState({ title, message, confirmText, onConfirm });
    } else {
      Alert.alert(title, message, [
        { text: 'Cancel', style: 'cancel' },
        { text: confirmText, onPress: onConfirm },
      ]);
    }
  };

  const downloadFile = (data: string | Blob, filename: string, mimeType: string) => {
    const blob = typeof data === 'string' ? new Blob([data], { type: mimeType }) : data;
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = filename;
    link.href = url;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  // ─── ✅ FIXED: SAVE FUNCTION - Uses ref for XML, stable dependencies ──────

  const handleSaveDiagram = useCallback(async () => {
    console.log('🟢 SAVE BUTTON CLICKED - handleSaveDiagram called');

    if (isSavingRef.current) {
      console.log('⏳ Save already in progress, ignoring duplicate click');
      return;
    }
    // Set synchronously, before any `await`, so a rapid second click (which
    // JS will only ever process after this call either returns or hits its
    // first await) is guaranteed to see this and bail out above.
    isSavingRef.current = true;

    if (!graphInstance) {
      console.log('❌ No graphInstance');
      isSavingRef.current = false;
      return;
    }

    const container = graphInstance.container;
    if (!container) {
      console.log('❌ No container');
      notify('Error', 'Could not access diagram canvas.');
      isSavingRef.current = false;
      return;
    }

    // Check if user is authenticated
    console.log('🔑 Checking authentication...');
    const token = await authService.getAccessToken();
    console.log('🔑 Token:', token ? `Present (${token.substring(0, 20)}...)` : 'MISSING');

    if (!token) {
      console.log('❌ No token found');
      isSavingRef.current = false;
      confirmDialog('Sign In Required', 'Please sign in to save your diagram.', 'Sign In', () => {
        router.push('/(auth)/signin');
      });
      return;
    }

    console.log('📤 Starting save process...');
    setIsSaving(true);
    setContextIsSaving(true);

    try {
      // ✅ FIX: Use the ref instead of state to prevent recreating the function
      const xml = diagramXmlRef.current;
      
      console.log('📄 XML length:', xml?.length || 0);
      console.log('📄 XML preview:', xml?.substring(0, 200) || 'EMPTY');

      // Check if the diagram has actual content
      const isEmptyXml = !xml || 
        xml.trim().length === 0 || 
        xml === '<mxGraphModel/>' || 
        xml === '<root/>' ||
        xml === '<mxGraphModel><root><mxCell id="0"/><mxCell id="1" parent="0"/></mxGraphModel>';
      
      if (isEmptyXml) {
        console.log('❌ Empty diagram content - no shapes added yet');
        return;
      }

      // Generate a preview image
      console.log('🖼️ Generating preview image...');
      let imageDataUrl = '';
      try {
        const canvas = await renderDiagramToCanvas(graphInstance, 0.5);
        imageDataUrl = canvas.toDataURL('image/png');
        console.log('🖼️ Preview generated, size:', (imageDataUrl.length / 1024).toFixed(1), 'KB');
      } catch (renderError) {
        console.warn('⚠️ Could not generate preview image:', renderError);
        // Continue without preview - it's optional
      }

      // Prepare the save payload. Including the current diagram's id (when
      // continuing/re-saving one) tells the backend to update that document
      // in place instead of creating a duplicate.
      const payload = {
        id: currentDiagramIdRef.current || undefined,
        name: diagramNameRef.current || 'Untitled Diagram',
        xml: xml,
        previewImage: imageDataUrl,
        type: activeUmlType || 'General',
        pages: pages.map(p => ({
          id: p.id,
          name: p.name,
          xml: pageXmlCache.current.get(p.id) || ''
        })),
        activePageId: activePageId
      };

      const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://igraph-backend.onrender.com';
      const url = `${API_URL}/api/diagrams/save`;
      
      console.log(`📤 Sending POST to: ${url}`);
      console.log('📤 Payload:', { 
        name: payload.name, 
        type: payload.type, 
        xmlLength: payload.xml.length,
        pagesCount: payload.pages.length,
        hasPreview: !!payload.previewImage
      });

      // Send to backend
      const response = await authService.authFetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      console.log('📥 Response status:', response.status);
      
      // Check if response is OK before parsing JSON
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Server error response:', errorText);
        throw new Error(`Server error: ${response.status} - ${errorText || response.statusText}`);
      }
      
      const result = await response.json();
      console.log('📥 Response data:', result);

      if (result.success) {
        console.log('✅ Diagram saved successfully!');
        const savedId: string | undefined = result.data?.diagram?.id;
        if (savedId) {
          currentDiagramIdRef.current = savedId;
          loadedDiagramIdRef.current = savedId;
          authService.getCurrentUserId().then((uid) => {
            if (uid) persistDraft(uid, savedId);
          });
        }
      } else {
        console.log('❌ Save failed:', result.message);
        notify('Error', result.message || 'Failed to save diagram. Please try again.');
      }
    } catch (error: any) {
      console.error('❌ Save diagram error:', error);
      console.error('❌ Error stack:', error.stack);

      if (error.message?.includes('Network') || error.message?.includes('fetch') || error.message?.includes('Failed to fetch')) {
        notify('Network Error', 'Could not connect to server. Please check your internet connection and make sure the backend is running.');
      } else if (error.message?.includes('JSON')) {
        notify('Server Error', 'The server returned an invalid response. Please try again.');
      } else {
        notify('Error', error.message || 'Failed to save diagram. Please try again.');
      }
    } finally {
      console.log('🔚 Save process finished');
      isSavingRef.current = false;
      setIsSaving(false);
      setContextIsSaving(false);
    }
  }, [graphInstance, activeUmlType, pages, activePageId, router, setContextIsSaving]);

  // ─── ✅ FIXED: Register save handler with context - Stable registration ──

  // Use ref to track the current handler to prevent re-registration loops
  const saveHandlerRef = useRef<(() => Promise<void>) | null>(null);

  // Register save handler with context
  useEffect(() => {
    console.log('🔄 Registering save handler...');
    const handler = handleSaveDiagram;
    
    // Only register if the handler has changed
    if (saveHandlerRef.current !== handler) {
      saveHandlerRef.current = handler;
      setSaveHandler(handler);
    }
    
    return () => {
      // Only unregister if we're the ones who registered
      if (saveHandlerRef.current === handler) {
        console.log('🔄 Unregistering save handler');
        saveHandlerRef.current = null;
        setSaveHandler(null);
      }
    };
  }, [handleSaveDiagram, setSaveHandler]);

  // ─── Sync saving state with context ──────────────────────────────────────

  useEffect(() => {
    setContextIsSaving(isSaving);
  }, [isSaving, setContextIsSaving]);

  // ─── DOWNLOAD HANDLER ─────────────────────────────────────────────────────

  const handleDownload = async (format: 'png' | 'svg' | 'pdf' | 'jpg') => {
    setShowDownloadDropdown(false);

    if (!graphInstance) {
      return;
    }

    // Mobile browsers only allow window.open() when it's still in the same
    // synchronous tick as the user's tap — once an `await` runs first, they
    // silently block it as a popup (desktop is more lenient, which is why PDF
    // export previously only worked there). Opening the window right here,
    // before any await, keeps it inside that trusted click context; we fill
    // in the real content once rendering finishes below.
    let printWindow: Window | null = null;
    if (format === 'pdf') {
      printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(
          '<html><body style="margin:0;display:flex;align-items:center;justify-content:center;min-height:100vh;font-family:system-ui,sans-serif;color:#64748b;">Preparing your diagram…</body></html>'
        );
        printWindow.document.close();
      }
    }

    setIsDownloading(true);

    try {
      const name = diagramName || 'diagram';

      if (format === 'svg') {
        const svgContent = exportToSVG(graphInstance);
        if (!svgContent) {
          notify('Error', 'Could not export SVG. The diagram may be empty.');
          setIsDownloading(false);
          return;
        }
        downloadFile(svgContent, `${name}.svg`, 'image/svg+xml;charset=utf-8');
        notify('Success', 'SVG diagram downloaded successfully!');
        setIsDownloading(false);
        return;
      }

      const canvas = await renderDiagramToCanvas(graphInstance, format === 'jpg' ? 2 : 3);

      if (format === 'pdf') {
        const dataUrl = canvas.toDataURL('image/png');
        const pdfHtml = `
          <html>
            <head>
              <title>${name}</title>
              <style>
                body { margin: 0; padding: 20px; display: flex; justify-content: center; align-items: center; min-height: 100vh; background: white; font-family: system-ui, sans-serif; }
                .container { text-align: center; }
                h1 { font-size: 18px; color: #333; margin-bottom: 20px; }
                img { max-width: 100%; max-height: 90vh; object-fit: contain; border: 1px solid #e2e8f0; border-radius: 8px; }
                @media print {
                  body { padding: 0; }
                  h1 { display: none; }
                  img { border: none; max-height: 100vh; }
                }
              </style>
            </head>
            <body>
              <div class="container">
                <h1>${name}</h1>
                <img src="${dataUrl}" alt="Diagram" />
                <script>
                  window.onload = function() {
                    setTimeout(function() {
                      window.print();
                    }, 800);
                  };
                <\/script>
              </div>
            </body>
          </html>
        `;

        if (printWindow) {
          printWindow.document.open();
          printWindow.document.write(pdfHtml);
          printWindow.document.close();
        } else {
          // Popup was blocked (or unsupported) even for the synchronous open
          // attempt above — fall back to a direct file download instead.
          downloadFile(pdfHtml, `${name}.pdf.html`, 'text/html');
          notify(
            'PDF Export',
            'The PDF dialog will open. Please select "Save as PDF" in the print dialog.'
          );
        }
        setIsDownloading(false);
        return;
      }

      const mimeType = format === 'jpg' ? 'image/jpeg' : 'image/png';
      const extension = format === 'jpg' ? 'jpg' : 'png';

      canvas.toBlob((blob) => {
        if (blob) {
          downloadFile(blob, `${name}.${extension}`, mimeType);
          notify('Success', `${format.toUpperCase()} diagram downloaded successfully!`);
        } else {
          console.error('toBlob returned null', { width: canvas.width, height: canvas.height });
          notify('Error', 'Failed to generate image. The diagram may be too large to export from this device.');
        }
        setIsDownloading(false);
      }, mimeType, format === 'jpg' ? 0.92 : undefined);
    } catch (error) {
      console.error('Download error:', error);
      if (printWindow) {
        try { printWindow.close(); } catch {}
      }
      notify('Error', `Failed to download as ${format.toUpperCase()}: ${error instanceof Error ? error.message : 'please try again.'}`);
      setIsDownloading(false);
    }
  };

  // ─── Toolbar actions ────────────────────────────────────────────────────────

  const handlePrint = () => {
    if (!graphInstance) {
      Alert.alert('No Diagram', 'Please create a diagram first.');
      return;
    }

    setIsPreparingPrint(true);

    renderDiagramToCanvas(graphInstance, 2)
      .then((canvas) => {
        const dataUrl = canvas.toDataURL('image/png');
        setPrintPreviewUrl(dataUrl);
        setIsPreparingPrint(false);
        setShowPrintModal(true);
      })
      .catch((error) => {
        console.error('Print error:', error);
        Alert.alert('Error', 'Failed to prepare diagram for printing.');
        setIsPreparingPrint(false);
      });
  };

  const executePrint = () => {
    if (!printPreviewUrl) return;

    const size = PAPER_SIZES[printPaperSize] || PAPER_SIZES.Letter;
    const pageSizeCss = printOrientation === 'landscape'
      ? `${size.height} ${size.width}`
      : `${size.width} ${size.height}`;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>${diagramName || 'Diagram'}</title>
            <style>
              @page { size: ${pageSizeCss}; margin: 0.4in; }
              body { margin: 0; display: flex; justify-content: center; align-items: center; min-height: 100vh; background: white; }
              img { max-width: 100%; max-height: 100vh; object-fit: contain; }
              @media print {
                body { margin: 0; }
                img { max-width: 100%; max-height: 100vh; }
              }
            </style>
          </head>
          <body>
            <img src="${printPreviewUrl}" alt="Diagram" />
            <script>
              window.onload = function() {
                setTimeout(function() {
                  window.print();
                }, 500);
              };
            <\/script>
          </body>
        </html>
      `);
      printWindow.document.close();
    } else {
      Alert.alert('Error', 'Could not open the print window. Please check your pop-up blocker.');
    }

    setShowPrintModal(false);
    setShowPaperSizeDropdown(false);
    setShowOrientationDropdown(false);
  };

  const handleUndo = () => {
    if (!graphInstance) return;
    try {
      const um = graphInstance.undoManager;
      if (um && um.canUndo()) {
        um.undo();
        setTimeout(focusGraph, 50);
      }
    } catch (e) { 
      console.error('Undo error:', e); 
    }
  };

  const handleRedo = () => {
    if (!graphInstance) return;
    try {
      const um = graphInstance.undoManager;
      if (um && um.canRedo()) {
        um.redo();
        setTimeout(focusGraph, 50);
      }
    } catch (e) { 
      console.error('Redo error:', e); 
    }
  };

  const toggleShapesPanel = () => {
    setShowShapesPanel(prev => !prev);
    if (activeTool !== 'shapes') setActiveTool('shapes');
    if (showShapesPanel) {
      setTimeout(focusGraph, 100);
    }
  };

  useEffect(() => {
    if (!showShapesPanel && isGraphReady) {
      setTimeout(focusGraph, 150);
    }
  }, [showShapesPanel, isGraphReady, focusGraph]);

  interface PaperSizeDef {
    label: string;
    width: string;
    height: string;
  }

  const PAPER_SIZES: Record<string, PaperSizeDef> = {
    Letter: { label: 'Letter', width: '8.5in', height: '11in' },
    Legal: { label: 'Legal', width: '8.5in', height: '14in' },
    Tabloid: { label: 'Tabloid', width: '11in', height: '17in' },
    Executive: { label: 'Executive', width: '7.25in', height: '10.5in' },
    Statement: { label: 'Statement', width: '5.5in', height: '8.5in' },
    A3: { label: 'A3', width: '297mm', height: '420mm' },
    A4: { label: 'A4', width: '210mm', height: '297mm' },
    A5: { label: 'A5', width: '148mm', height: '210mm' },
    A6: { label: 'A6', width: '105mm', height: '148mm' },
    B4: { label: 'B4 (JIS)', width: '257mm', height: '364mm' },
    B5: { label: 'B5 (JIS)', width: '182mm', height: '257mm' },
  };

  const AppDialog = () => {
    if (!dialogState) return null;
    const { title, message, confirmText, onConfirm } = dialogState;

    return (
      <Modal
        visible
        transparent
        animationType="fade"
        onRequestClose={() => setDialogState(null)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setDialogState(null)}>
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalTitle}>{title}</Text>
            {message ? <Text style={styles.modalSubtitle}>{message}</Text> : null}
            <View style={styles.modalButtons}>
              {onConfirm && (
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalCancelButton]}
                  onPress={() => setDialogState(null)}
                >
                  <Text style={styles.modalCancelText}>Cancel</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[styles.modalButton, styles.modalCreateButton]}
                onPress={() => {
                  setDialogState(null);
                  onConfirm?.();
                }}
              >
                <Text style={styles.modalCreateText}>{confirmText || 'OK'}</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    );
  };

  const PrintModal = () => {
    if (!showPrintModal) return null;

    const paperKeys = Object.keys(PAPER_SIZES);

    return (
      <Modal
        visible={showPrintModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowPrintModal(false)}
      >
        <Pressable
          style={styles.printModalOverlay}
          onPress={() => {
            setShowPrintModal(false);
            setShowPaperSizeDropdown(false);
            setShowOrientationDropdown(false);
          }}
        >
          <Pressable style={styles.printModalContainer} onPress={(e) => e.stopPropagation()}>
            <View style={styles.printSettingsPanel}>
              <Text style={styles.printModalTitle}>Print</Text>

              <TouchableOpacity
                style={styles.printMainButton}
                onPress={executePrint}
                activeOpacity={0.85}
              >
                <PrintIcon color="#ffffff" />
                <Text style={styles.printMainButtonText}>Print</Text>
              </TouchableOpacity>

              <View style={styles.printCopiesRow}>
                <Text style={styles.printFieldLabel}>Copies:</Text>
                <TextInput
                  style={styles.printCopiesInput}
                  value={printCopies}
                  onChangeText={(t) => setPrintCopies(t.replace(/[^0-9]/g, ''))}
                  keyboardType="numeric"
                />
              </View>

              <Text style={styles.printSectionLabel}>Printer</Text>
              <View style={styles.printSelectBox}>
                <Text style={styles.printSelectText}>Save as PDF</Text>
              </View>

              <Text style={styles.printSectionLabel}>Settings</Text>

              <View style={styles.printPagesRow}>
                <Text style={styles.printFieldLabel}>Pages:</Text>
                <TextInput
                  style={styles.printPagesInput}
                  placeholder="All"
                  placeholderTextColor="#94a3b8"
                  value={printPageRange}
                  onChangeText={setPrintPageRange}
                />
              </View>

              <View style={{ position: 'relative' }}>
                <TouchableOpacity
                  style={styles.printSelectBox}
                  onPress={() => {
                    setShowOrientationDropdown(prev => !prev);
                    setShowPaperSizeDropdown(false);
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.printSelectText}>
                    {printOrientation === 'portrait' ? 'Portrait Orientation' : 'Landscape Orientation'}
                  </Text>
                  <Text style={styles.printSelectCaret}>▾</Text>
                </TouchableOpacity>
                {showOrientationDropdown && (
                  <View style={styles.printOptionsList}>
                    {(['portrait', 'landscape'] as const).map((opt) => (
                      <TouchableOpacity
                        key={opt}
                        style={styles.printOptionItem}
                        onPress={() => {
                          setPrintOrientation(opt);
                          setShowOrientationDropdown(false);
                        }}
                      >
                        <Text style={styles.printOptionText}>
                          {opt === 'portrait' ? 'Portrait Orientation' : 'Landscape Orientation'}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>

              <View style={{ position: 'relative' }}>
                <TouchableOpacity
                  style={styles.printSelectBox}
                  onPress={() => {
                    setShowPaperSizeDropdown(prev => !prev);
                    setShowOrientationDropdown(false);
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.printSelectText}>{PAPER_SIZES[printPaperSize].label}</Text>
                  <Text style={styles.printSelectCaret}>▾</Text>
                </TouchableOpacity>
                {showPaperSizeDropdown && (
                  <View style={[styles.printOptionsList, styles.printOptionsListScrollable]}>
                    <ScrollView style={{ maxHeight: 220 }}>
                      {paperKeys.map((key) => (
                        <TouchableOpacity
                          key={key}
                          style={styles.printOptionItem}
                          onPress={() => {
                            setPrintPaperSize(key);
                            setShowPaperSizeDropdown(false);
                          }}
                        >
                          <Text style={styles.printOptionText}>{PAPER_SIZES[key].label}</Text>
                          <Text style={styles.printOptionSubText}>
                            {PAPER_SIZES[key].width} × {PAPER_SIZES[key].height}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}
              </View>

              <TouchableOpacity
                style={styles.printCancelButton}
                onPress={() => {
                  setShowPrintModal(false);
                  setShowPaperSizeDropdown(false);
                  setShowOrientationDropdown(false);
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.printCancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.printPreviewPanel}>
              <ScrollView contentContainerStyle={styles.printPreviewScrollContent}>
                <View
                  style={[
                    styles.printPreviewPage,
                    printOrientation === 'landscape' && styles.printPreviewPageLandscape,
                  ]}
                >
                  {printPreviewUrl && Platform.OS === 'web' ? (
                    <img
                      src={printPreviewUrl}
                      style={{
                        maxWidth: '100%',
                        maxHeight: '100%',
                        objectFit: 'contain',
                      }}
                    />
                  ) : null}
                </View>
              </ScrollView>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    );
  };

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

        {/* ─── TOP BAR ─────────────────────────────────────────────────────── */}
        <View style={styles.mobileTopBar}>
          <View style={styles.mobileTopBarLeft}>
            <TouchableOpacity
              style={styles.mobileTopBarBtn}
              onPress={() => router.back()}
              activeOpacity={0.7}
            >
              <ICONS.Close color="#4a5568" />
            </TouchableOpacity>
          </View>

          <TextInput
            style={styles.mobileTitle}
            value={diagramName}
            onChangeText={setDiagramName}
            placeholder="Diagram Name"
            placeholderTextColor="#94a3b8"
            numberOfLines={1}
            maxLength={50}
          />

          <View style={styles.mobileTopBarRight}>
            {/* ─── SAVE BUTTON ─────────────────────────────────────────────── */}
            <TouchableOpacity
              style={[styles.mobileTopBarBtn, !isGraphReady && styles.mobileTopBarBtnDisabled]}
              onPress={handleSaveDiagram}
              disabled={!isGraphReady || isSaving}
              activeOpacity={0.7}
            >
              {isSaving ? (
                <View style={styles.saveSpinner} />
              ) : (
                <SaveIcon color={isGraphReady ? '#10b981' : '#cbd5e1'} />
              )}
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.mobileTopBarBtn, !isGraphReady && styles.mobileTopBarBtnDisabled]}
              onPress={handlePrint}
              disabled={!isGraphReady || isPreparingPrint}
              activeOpacity={0.7}
            >
              <PrintIcon color={isGraphReady ? '#4a5568' : '#cbd5e1'} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.mobileTopBarBtn, !isGraphReady && styles.mobileTopBarBtnDisabled]}
              onPress={() => setShowDownloadDropdown(prev => !prev)}
              disabled={!isGraphReady || isDownloading}
              activeOpacity={0.7}
            >
              {isDownloading ? (
                <View style={styles.downloadSpinner} />
              ) : (
                <DownloadIcon color={isGraphReady ? '#4a5568' : '#cbd5e1'} />
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* ─── CANVAS WITH FLOATING UNDO/REDO ────────────────────────────── */}
        <View style={styles.mobileCanvasContainer}>
          <DiagramCanvas
            key="diagram-canvas"
            ref={diagramCanvasRef}
            onReady={handleGraphReady}
            onChange={handleGraphChange}
            umlType={activeUmlType}
          />

          {/* Floating Undo/Redo buttons */}
          <View style={styles.floatingUndoRedoContainer}>
            <TouchableOpacity
              style={[styles.floatingUndoRedoBtn, !isGraphReady && styles.floatingUndoRedoBtnDisabled]}
              onPress={handleUndo}
              disabled={!isGraphReady}
              activeOpacity={0.7}
            >
              <UndoIcon color={isGraphReady ? '#4a5568' : '#cbd5e1'} size={20} />
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.floatingUndoRedoBtn, !isGraphReady && styles.floatingUndoRedoBtnDisabled]}
              onPress={handleRedo}
              disabled={!isGraphReady}
              activeOpacity={0.7}
            >
              <RedoIcon color={isGraphReady ? '#4a5568' : '#cbd5e1'} size={20} />
            </TouchableOpacity>
          </View>
        </View>

        {/* ─── BOTTOM TOOLBAR ───────────────────────────────────────────── */}
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
                style={[styles.mobileBottomToolBtn, !isGraphReady && styles.mobileTopBarBtnDisabled]}
                onPress={handleZoomOut}
                disabled={!isGraphReady}
              >
                <ZoomOutIcon color={isGraphReady ? '#4a5568' : '#cbd5e1'} />
              </TouchableOpacity>
              <Text style={styles.mobileZoomLabel}>{Math.round(zoomLevel)}%</Text>
              <TouchableOpacity
                style={[styles.mobileBottomToolBtn, !isGraphReady && styles.mobileTopBarBtnDisabled]}
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

        {showDownloadDropdown && (
          <>
            <Pressable
              style={styles.dropdownOverlay}
              onPress={() => setShowDownloadDropdown(false)}
            />
            <DownloadDropdown
              onSelectFormat={handleDownload}
              style={{ top: 60, right: 16 }}
            />
          </>
        )}

        <PrintModal />
        <AppDialog />
      </SafeAreaView>
    );
  }

  // ─── DESKTOP VIEW ─────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.container}>
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
            {/* ─── SAVE BUTTON ─────────────────────────────────────────────── */}
            <TouchableOpacity
              style={[styles.navIconBtn, styles.navBtnSuccess, !isGraphReady && styles.navBtnDisabled]}
              onPress={handleSaveDiagram}
              activeOpacity={0.7}
              disabled={!isGraphReady || isSaving}
            >
              {isSaving ? (
                <View style={styles.saveSpinnerSmall} />
              ) : (
                <SaveIcon color={isGraphReady ? '#ffffff' : '#94a3b8'} />
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.navIconBtn, styles.navBtnPrimary, !isGraphReady && styles.navBtnDisabled]}
              onPress={handlePrint}
              activeOpacity={0.7}
              disabled={!isGraphReady || isPreparingPrint}
            >
              <PrintIcon color={isGraphReady ? '#ffffff' : '#94a3b8'} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.navIconBtn, styles.navBtnPrimary, !isGraphReady && styles.navBtnDisabled]}
              onPress={() => setShowDownloadDropdown(prev => !prev)}
              activeOpacity={0.7}
              disabled={!isGraphReady || isDownloading}
            >
              {isDownloading ? (
                <View style={styles.downloadSpinnerSmall} />
              ) : (
                <DownloadIcon color={isGraphReady ? '#ffffff' : '#94a3b8'} />
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* ─── FORMAT BAR - UNDO/REDO ONLY ───────────────────────────────── */}
        <View style={styles.formatBar}>
          <TouchableOpacity
            style={[styles.formatBtn, !isGraphReady && styles.formatBtnDisabled]}
            onPress={handleUndo}
            disabled={!isGraphReady}
            activeOpacity={0.7}
          >
            <UndoIcon color={isGraphReady ? '#4a5568' : '#cbd5e1'} size={18} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.formatBtn, !isGraphReady && styles.formatBtnDisabled]}
            onPress={handleRedo}
            disabled={!isGraphReady}
            activeOpacity={0.7}
          >
            <RedoIcon color={isGraphReady ? '#4a5568' : '#cbd5e1'} size={18} />
          </TouchableOpacity>
        </View>

        <View style={styles.body}>
          <View style={styles.canvasContainer}>
            <DiagramCanvas
              key="diagram-canvas"
              ref={diagramCanvasRef}
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

          {/* ─── PROPERTIES PANEL ─────────────────────────────────────────── */}
          {graphInstance && (
            <View style={styles.propertiesPanelWrapper}>
              <PropertiesPanel graph={graphInstance} />
            </View>
          )}
        </View>

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

        {showDownloadDropdown && (
          <>
            <Pressable
              style={styles.dropdownOverlay}
              onPress={() => setShowDownloadDropdown(false)}
            />
            <DownloadDropdown
              onSelectFormat={handleDownload}
              style={{ top: 52, right: 12 }}
            />
          </>
        )}

        <PrintModal />
        <AppDialog />
      </View>
    </SafeAreaView>
  );
}

// ─── ICONS ────────────────────────────────────────────────────────────────────

const PrintIcon = ({ color = '#4a5568' }: { color?: string }) => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
    <Path d="M6 9V3H18V9" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M6 21H18V15H6V21Z" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M6 15H4C3.46957 15 3.96086 14.7893 3.58579 14.4142C3.21071 14.0391 3 13.5304 3 13V11C3 10.4696 3.21071 9.96086 3.58579 9.58579C3.96086 9.21071 4.46957 9 4 9H20C20.5304 9 21.0391 9.21071 21.4142 9.58579C21.7893 9.96086 22 10.4696 22 11V13C22 13.5304 21.7893 14.0391 21.4142 14.4142C21.0391 14.7893 20.5304 15 20 15H18" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
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

const PageIcon = ({ color = '#4a5568' }: { color?: string }) => (
  <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
    <Rect x="3" y="3" width="18" height="18" rx="2" stroke={color} strokeWidth={1.8} />
    <Path d="M8 8h8M8 12h6M8 16h4" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
  </Svg>
);

const CloseTabIcon = ({ color = '#94a3b8' }: { color?: string }) => (
  <Svg width={12} height={12} viewBox="0 0 24 24" fill="none">
    <Path d="M18 6L6 18M6 6L18 18" stroke={color} strokeWidth={2} strokeLinecap="round" />
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  navBtnPrimary: {
    backgroundColor: '#4c6fff',
  },
  navBtnSuccess: {
    backgroundColor: '#10b981',
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
  propertiesPanelWrapper: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    zIndex: 6,
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
  dropdownOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 998,
  },
  downloadDropdown: {
    position: 'absolute',
    width: 200,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingVertical: 6,
    zIndex: 999,
    ...(Platform.OS === 'web'
      ? { boxShadow: '0 8px 24px rgba(15, 23, 42, 0.12)' }
      : {
          shadowColor: '#0f172a',
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.12,
          shadowRadius: 16,
          elevation: 8,
        }),
  },
  downloadDropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  downloadDropdownItemLast: {
    borderBottomWidth: 0,
  },
  downloadDropdownIcon: {
    fontSize: 18,
  },
  downloadDropdownTextWrap: {
    flex: 1,
  },
  downloadDropdownLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1a1f36',
  },
  downloadDropdownDescription: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 1,
  },
  downloadSpinner: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#4c6fff',
    borderTopColor: 'transparent',
  },
  saveSpinner: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#10b981',
    borderTopColor: 'transparent',
  },
  downloadSpinnerSmall: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#ffffff',
    borderTopColor: 'transparent',
  },
  saveSpinnerSmall: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#ffffff',
    borderTopColor: 'transparent',
  },
  printModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  printModalContainer: {
    flexDirection: 'row',
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    overflow: 'hidden',
    width: 860,
    maxWidth: '95%',
    height: 620,
    maxHeight: '90%',
    ...(Platform.OS === 'web'
      ? { boxShadow: '0 20px 60px rgba(15, 23, 42, 0.35)' }
      : {
          shadowColor: '#0f172a',
          shadowOffset: { width: 0, height: 10 },
          shadowOpacity: 0.3,
          shadowRadius: 24,
          elevation: 12,
        }),
  },
  printSettingsPanel: {
    width: 260,
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
  },
  printModalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 16,
  },
  printMainButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#4c6fff',
    borderRadius: 8,
    height: 90,
    marginBottom: 16,
  },
  printMainButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  printCopiesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  printFieldLabel: {
    fontSize: 13,
    color: '#1a1a1a',
    fontWeight: '400',
  },
  printCopiesInput: {
    width: 56,
    height: 28,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 4,
    paddingHorizontal: 8,
    fontSize: 13,
    color: '#1a1a1a',
    backgroundColor: '#ffffff',
    textAlign: 'left',
  },
  printSectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  printSelectBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 34,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 6,
    paddingHorizontal: 10,
    backgroundColor: '#ffffff',
    marginBottom: 10,
  },
  printSelectText: {
    fontSize: 13,
    color: '#1a1a1a',
  },
  printSelectCaret: {
    fontSize: 11,
    color: '#6b7280',
  },
  printPagesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  printPagesInput: {
    flex: 1,
    height: 34,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 6,
    paddingHorizontal: 10,
    fontSize: 13,
    color: '#1a1a1a',
    backgroundColor: '#ffffff',
  },
  printOptionsList: {
    position: 'absolute',
    top: 36,
    left: 0,
    right: 0,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    zIndex: 50,
    ...(Platform.OS === 'web'
      ? { boxShadow: '0 8px 20px rgba(15, 23, 42, 0.15)' }
      : {
          shadowColor: '#0f172a',
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.15,
          shadowRadius: 14,
          elevation: 10,
        }),
  },
  printOptionsListScrollable: {
    maxHeight: 220,
  },
  printOptionItem: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  printOptionText: {
    fontSize: 13,
    color: '#1a1a1a',
  },
  printOptionSubText: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 1,
  },
  printCancelButton: {
    marginTop: 'auto',
    alignSelf: 'flex-start',
  },
  printCancelButtonText: {
    fontSize: 13,
    color: '#4c6fff',
    fontWeight: '600',
  },
  printPreviewPanel: {
    flex: 1,
    backgroundColor: '#e8e8e8',
  },
  printPreviewScrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  printPreviewPage: {
    width: 380,
    height: 492,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    ...(Platform.OS === 'web'
      ? { boxShadow: '0 4px 16px rgba(15, 23, 42, 0.15)' }
      : {
          shadowColor: '#0f172a',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.15,
          shadowRadius: 10,
          elevation: 4,
        }),
  },
  printPreviewPageLandscape: {
    width: 492,
    height: 380,
  },

  // ─── MOBILE STYLES ─────────────────────────────────────────────────────────
  mobileContainer: {
    flex: 1,
    backgroundColor: '#f8faff',
  },
  mobileTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#eef2f5',
    gap: 6,
    minHeight: 50,
  },
  mobileTopBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexShrink: 0, // ✅ FIX: never let the back button get squeezed
  },
  mobileTopBarBtn: {
    width: 34,
    height: 34,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#eef2f6',
    flexShrink: 0, // ✅ FIX: fixed-size icon buttons must never shrink to 0 width
  },
  mobileTopBarBtnDisabled: {
    opacity: 0.4,
  },
  mobileTitle: {
    flex: 1,
    minWidth: 0, // ✅ FIX: THE ACTUAL BUG. On web, flex items default to
                 // min-width: auto, so this TextInput refused to shrink below
                 // its text content width and pushed the Save/Print/Download
                 // buttons (mobileTopBarRight) off the visible row on narrow
                 // phones — Download, being last, disappeared first.
    fontSize: 15,
    fontWeight: '600',
    color: '#1a1f36',
    textAlign: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    backgroundColor: 'transparent',
  },
  mobileTopBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexShrink: 0, // ✅ FIX: never let this button group get squeezed to 0
  },
  mobileCanvasContainer: {
    flex: 1,
    backgroundColor: '#f8faff',
  },

  // ─── FLOATING UNDO/REDO BUTTONS ────────────────────────────────────────────
  floatingUndoRedoContainer: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    gap: 8,
    zIndex: 10,
  },
  floatingUndoRedoBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    ...(Platform.OS === 'web'
      ? { boxShadow: '0 2px 8px rgba(15, 23, 42, 0.12)' }
      : {
          shadowColor: '#0f172a',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.12,
          shadowRadius: 6,
          elevation: 4,
        }),
  },
  floatingUndoRedoBtnDisabled: {
    opacity: 0.4,
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