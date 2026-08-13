import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import jsPDF from 'jspdf';
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
  Animated,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import type { DiagramPrintPayload } from '../print';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Svg, Path, Rect, Circle } from 'react-native-svg';
import { SvgCanvas2D, ImageExport, Geometry, Point, CellHighlight } from '@maxgraph/core';
import DiagramCanvas, { DiagramCanvasHandle, getShapeStyle, insertUmlClassCell, insertDfdDataStoreCell, insertForkJoinStubs, findSequenceMessageEndpoints, sequenceMessageConnectionStyle, SEQUENCE_MESSAGE_SHAPE_IDS } from '@/components/DiagramCanvas';
import { DiagramPatch, patchKey } from '@/utils/diagramPatch';
import ShareModal, { Avatar, getAvatarColor } from '@/components/ShareModal';
import RequestAccessModal from '@/components/RequestAccessModal';
import ShapesPanel from '@/components/shapes/ShapesPanel';
import ShapesBottomPanel from '../../components/shapes/ShapesBottomPanel';
import ConnectorsBottomPanel from '../../components/ConnectorsBottomPanel';
import PropertiesPanel from '@/components/properties-panel/PropertiesPanel';
import QuickFormatBar from '@/components/properties-panel/QuickFormatBar';
import { ICONS } from '../../constants/icons';
import { COLORS, SPACING, RADIUS } from '@/constants/theme';
import { IGRAPH_ID_STYLE_MAP } from '@/components/maxgraph-custom-shapes';
import { getShapeDefinitionById, CONNECTOR_SHAPE_IDS, getCategoryForShapeId, DIAGRAM_TABS } from '@/constants/shapes';
import { tagShapeRole, getShapeRole, computeFddEntryPoint } from '@/utils/flowchartRules';
import * as authService from '../../services/authService';
import * as shareService from '../../services/diagramShareService';
import { joinDiagram, leaveDiagram, sendDiagramChange, sendCellSelect } from '../../services/collabSocketClient';
import { useSave } from '../../contexts/SaveContext';
import { useOnboardingTour } from '@/hooks/useOnboardingTour';
import { CREATE_TOUR_ID, getCreateTourSteps } from '@/utils/tours';
import { resolveTourWait } from '@/utils/onboardingTour';
import API_BASE_URL from '@/constants/api';

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

// SHARE ICON

const ShareIcon = ({ color = '#4a5568' }: { color?: string }) => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
    <Circle cx="18" cy="5" r="3" stroke={color} strokeWidth={1.8} />
    <Circle cx="6" cy="12" r="3" stroke={color} strokeWidth={1.8} />
    <Circle cx="18" cy="19" r="3" stroke={color} strokeWidth={1.8} />
    <Path d="M8.6 10.5L15.4 6.5M8.6 13.5L15.4 17.5" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
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
  nativeID,
}: {
  onSelectFormat: (format: 'png' | 'svg' | 'pdf' | 'jpg') => void;
  style?: any;
  align?: 'left' | 'right';
  nativeID?: string;
}) => {
  const formats = [
    { id: 'png', label: 'PNG', description: 'High quality, lossless', icon: '🖼️' },
    { id: 'svg', label: 'SVG', description: 'Vector, scalable', icon: '📐' },
    { id: 'pdf', label: 'PDF', description: 'Document format', icon: '📄' },
    { id: 'jpg', label: 'JPG', description: 'Smaller file size', icon: '🖼️' },
  ] as const;

  return (
    <View
      // @ts-ignore - nativeID renders as a DOM id on web (react-native-web); missing from ViewProps' types
      nativeID={nativeID}
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

// ─── AUTOSAVE INDICATOR ─────────────────────────────────────────────────────

const CloudSyncIcon = ({ color, checked }: { color: string; checked: boolean }) => (
  <Svg width={15} height={15} viewBox="0 0 24 24" fill="none">
    <Path
      d="M7 18a4.5 4.5 0 01-.4-8.98A5.5 5.5 0 0117 8.5a4 4 0 01-1 7.9H7z"
      stroke={color}
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      fill={checked ? color : 'none'}
      fillOpacity={checked ? 0.14 : 0}
    />
    {checked && (
      <Path d="M8.3 12.4L10.7 14.8L15.5 10" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" fill="none" />
    )}
  </Svg>
);

type SyncStatus = 'local' | 'syncing' | 'synced' | 'offline';

const SYNC_STATUS_META: Record<SyncStatus, { label: string; color: string }> = {
  // "only" is load-bearing here, not just phrasing — paired with a cloud
  // icon, a plain "Saved on device" read as if the cloud icon meant it was
  // already backed up. This makes the gap explicit: nothing has reached the
  // server yet.
  local: { label: 'Saved on device only', color: '#d97706' },
  syncing: { label: 'Saving…', color: '#4c6fff' },
  synced: { label: 'Saved', color: '#10b981' },
  offline: { label: 'Saved on device only', color: '#94a3b8' },
};

// Sits beside the diagram title so the user always knows whether their work
// is safe — amber while it's only on this device, a brief animated pulse
// while a background sync to the server is in flight, and a green check
// (with a satisfying little pop) once the server has actually confirmed it.
const AutosaveIndicator = ({ status }: { status: SyncStatus }) => {
  const pulse = useRef(new Animated.Value(1)).current;
  const pop = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (status !== 'syncing') {
      pulse.setValue(1);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 0.35, duration: 550, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 550, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [status, pulse]);

  useEffect(() => {
    if (status !== 'synced') return;
    pop.setValue(0.55);
    Animated.spring(pop, { toValue: 1, friction: 4, tension: 140, useNativeDriver: true }).start();
  }, [status, pop]);

  const meta = SYNC_STATUS_META[status];

  return (
    <View style={styles.autosaveIndicator}>
      <Animated.View style={{ opacity: pulse, transform: [{ scale: pop }] }}>
        <CloudSyncIcon color={meta.color} checked={status === 'synced'} />
      </Animated.View>
      <Text style={[styles.autosaveIndicatorLabel, { color: meta.color }]} numberOfLines={1}>
        {meta.label}
      </Text>
    </View>
  );
};

// Real-time "who else has this diagram open right now" indicator — the
// server already broadcasts this (collabSocketClient.js's 'presence' event,
// wired up as collabViewers below), it just never had anywhere to render
// until now. An overlapping avatar stack, same visual language as
// ShareModal's collaborator row (same Avatar component), capped at
// PRESENCE_STACK_MAX with a "+N" tile for the rest — an unbounded row would
// blow out the toolbar's width the moment more than a couple of people join.
//
// Each avatar gets a colored ring for its permission level rather than
// touching Avatar itself (that component's own fill color already encodes
// *who* someone is, by hashing their id — this is a separate signal, *what
// they can do here* — green for anyone who can actually edit, amber for the
// owner, gray for view-only) — same green SaveIcon already uses elsewhere
// in this toolbar for "editing", so it reads consistently.
const PRESENCE_STACK_MAX = 4;
const PRESENCE_RING_COLOR: Record<string, string> = {
  owner: '#f59e0b',
  edit_share: '#10b981',
  edit: '#10b981',
  view: '#94a3b8',
};

const PresenceStack = ({
  viewers,
  size = 28,
}: {
  viewers: { userId: string; userName: string; permission: string }[];
  size?: number;
}) => {
  const shown = viewers.slice(0, PRESENCE_STACK_MAX);
  const overflow = viewers.length - shown.length;
  const ringSize = size + 6;
  const overlap = -Math.round(ringSize * 0.35);

  return (
    <View style={styles.presenceStack}>
      {shown.map((v, i) => (
        <View
          key={v.userId}
          style={[
            styles.presenceRing,
            {
              width: ringSize,
              height: ringSize,
              borderRadius: ringSize / 2,
              borderColor: PRESENCE_RING_COLOR[v.permission] ?? PRESENCE_RING_COLOR.view,
            },
            i > 0 && { marginLeft: overlap },
          ]}
        >
          <Avatar name={v.userName} email={v.userId} size={size} />
        </View>
      ))}
      {overflow > 0 && (
        <View
          style={[
            styles.presenceOverflow,
            { width: ringSize, height: ringSize, borderRadius: ringSize / 2, marginLeft: overlap },
          ]}
        >
          <Text style={[styles.presenceOverflowText, { fontSize: size * 0.38 }]}>+{overflow}</Text>
        </View>
      )}
    </View>
  );
};

// The "(avatar) Name joined/left" toast itself — up to 3 avatars (same
// permission-ring color coding as PresenceStack, so the two visually agree)
// plus a name summary that reads naturally whether it's one person or a
// handful at once ("Alice joined" / "Alice and Bob joined" / "Alice, Bob
// and 2 others joined").
const PresenceToastBanner = ({
  toast,
}: {
  toast: { people: { userId: string; userName: string; permission: string }[]; action: 'joined' | 'left' };
}) => {
  const { people, action } = toast;
  const shown = people.slice(0, 3);
  const restCount = people.length - shown.length;
  const names =
    people.length <= 2
      ? shown.map((p) => p.userName).join(' and ')
      : `${shown.map((p) => p.userName).join(', ')} and ${restCount} other${restCount === 1 ? '' : 's'}`;

  return (
    <View style={styles.presenceToast} pointerEvents="none">
      <View style={styles.presenceToastAvatars}>
        {shown.map((p, i) => (
          <View
            key={p.userId}
            style={[
              styles.presenceRing,
              {
                width: 24,
                height: 24,
                borderRadius: 12,
                borderColor: PRESENCE_RING_COLOR[p.permission] ?? PRESENCE_RING_COLOR.view,
              },
              i > 0 && { marginLeft: -8 },
            ]}
          >
            <Avatar name={p.userName} email={p.userId} size={20} />
          </View>
        ))}
      </View>
      <Text style={styles.presenceToastText}>{names} {action}</Text>
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

// Printing always hands off to window.print()'s native dialog — the OS's
// own UI, not this page's, so it already lists every real printer installed
// on the machine with zero code here. Page size is fixed at Letter/portrait
// (see PAPER_SIZES.Letter below) since there's no in-page control for it
// anymore; the native dialog itself still lets the user override both.

// The owner never sees a badge — it's their own diagram, there's nothing to
// clarify. Collaborators do, so they always know at a glance what they can
// do here without having to go open Share to check.
const ACCESS_BADGE_LABEL: Record<string, string> = {
  edit_share: 'Edit and Share',
  edit: 'Edit Only',
  view: 'View Only',
};

export default function CreateScreen() {
  const router = useRouter();
  // openedAt is a one-off nonce savedDiagrams.tsx stamps onto every
  // "Continue" navigation (see confirmContinueDiagram there) — see
  // loadedOpenedAtRef below for why it exists.
  const { diagramId: routerDiagramId, share: shareToken, openedAt } = useLocalSearchParams<{ diagramId?: string; share?: string; openedAt?: string }>();
  // On web, a hard/full-page refresh of /create?diagramId=X can leave
  // useLocalSearchParams() reporting diagramId as undefined even though the
  // address bar still shows it — confirmed via the hydrate effect's own
  // debug log always reading `diagramId: undefined` in that case, right as
  // the router boots from scratch and its params state hasn't caught up to
  // the real URL yet. window.location.search is the browser's own source of
  // truth and isn't subject to that race, so it's the fallback here — native
  // has no `window` and gets its params from the navigator instead, so it
  // was never exposed to this. Without this, hydrate() silently took the
  // "no diagramId" branch (resume whatever local draft happens to be
  // pointed at) instead of fetching this specific diagram, which is what
  // made an opened diagram look like it had vanished on refresh.
  const diagramId = routerDiagramId || (
    Platform.OS === 'web' && typeof window !== 'undefined'
      ? new URLSearchParams(window.location.search).get('diagramId') ?? undefined
      : undefined
  );
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;

  // Opening a /create?share=<token> link (see ShareModal's "Copy link")
  // redeems the token — which is what actually grants standing access, not
  // just a one-time peek — then swaps straight to the normal ?diagramId=
  // flow so every existing load/hydrate/collab-join path handles the rest
  // exactly like any other diagram open.
  useEffect(() => {
    if (!shareToken) return;
    let cancelled = false;
    (async () => {
      try {
        const result = await shareService.redeemShareLink(shareToken);
        if (cancelled) return;
        if (result.success && result.data?.diagramId) {
          router.replace(`/create?diagramId=${result.data.diagramId}`);
        } else {
          Alert.alert('Link unavailable', result.message || 'This share link is invalid or has expired.');
          router.replace('/create');
        }
      } catch (e: any) {
        if (cancelled) return;
        Alert.alert('Link unavailable', e?.response?.data?.message || 'This share link is invalid or has expired.');
        router.replace('/create');
      }
    })();
    return () => { cancelled = true; };
  }, [shareToken]);

  const [diagramName, setDiagramName] = useState('Blank diagram');
  const [isGraphReady, setIsGraphReady] = useState(false);

  const [graphInstance, setGraphInstance] = useState<any>(null);
  // Resolved once the graph is ready; a late-arriving id (auth settling just
  // after sign-in) re-triggers the hydrate effect below for one more restore
  // attempt instead of leaving hasHydratedRef latched shut on a false start.
  const [authUserId, setAuthUserId] = useState<string | null>(null);
  const [diagramXml, setDiagramXml] = useState<string>('');
  const [showShapesPanel, setShowShapesPanel] = useState(false);
  const [isPanelVisible, setIsPanelVisible] = useState(true);
  // Desktop-only: mirrors PropertiesPanel's internal collapsed state so the
  // collapse toggle button can live up in the format bar (outside the
  // panel's own clipped container) instead of inline in its header.
  const [isPropertiesPanelCollapsed, setIsPropertiesPanelCollapsed] = useState(false);
  // Set while a connector/line shape was tapped (not dragged) from the Shapes
  // panel — instead of guessing where to attach it from viewport-center
  // (unreliable on mobile, which has no drag-and-drop), the next two shapes
  // the user taps become its source/target directly. See handleAddShape and
  // handleCanvasSelectionChange.
  const [pendingConnector, setPendingConnectorState] = useState<{ shapeId: string; sourceCell: any } | null>(null);
  // Mirrors pendingConnector, updated synchronously (state updates from
  // inside an event handler don't take effect until React re-renders).
  // handleCanvasSelectionChange needs the *current* value mid-callback:
  // graph.setSelectionCell(edge) at the end of a completed connection fires
  // the graph's own selection-change event synchronously, re-entering this
  // same handler before the setPendingConnector(null) a few lines above it
  // has actually propagated — reading the stale `pendingConnector` state
  // there still saw the old, non-null connector, so the re-entrant call
  // treated the edge it had just created as the "second shape" of a new
  // connection and inserted another edge onto it, which selected *that*
  // edge and re-entered again — an unbounded chain, each pass exporting a
  // larger and larger XML, that only stopped when the tab ran out of
  // memory and crashed. Every setPendingConnector call site below goes
  // through updatePendingConnector instead so the ref and state can never
  // disagree.
  const pendingConnectorRef = useRef<{ shapeId: string; sourceCell: any } | null>(null);
  // Highlights the locked-in source shape while tap-to-connect is waiting on
  // the second tap — the graph's own selection outline alone is too subtle
  // to read at a glance on a small mobile screen. Lazily created against
  // whichever graph is live, and torn down whenever the source changes so a
  // stale highlight never lingers on the wrong shape.
  const sourceHighlightRef = useRef<CellHighlight | null>(null);
  const updatePendingConnector = (next: { shapeId: string; sourceCell: any } | null) => {
    const prevSourceCell = pendingConnectorRef.current?.sourceCell ?? null;
    const nextSourceCell = next?.sourceCell ?? null;
    if (nextSourceCell !== prevSourceCell) {
      if (nextSourceCell && graphInstance) {
        if (!sourceHighlightRef.current) {
          sourceHighlightRef.current = new CellHighlight(graphInstance, '#4c6fff', 4);
        }
        sourceHighlightRef.current.highlight(graphInstance.view.getState(nextSourceCell));
      } else {
        sourceHighlightRef.current?.hide();
      }
    }
    pendingConnectorRef.current = next;
    setPendingConnectorState(next);
  };
  useEffect(() => {
    return () => { sourceHighlightRef.current?.destroy(); };
  }, []);
  // Mobile-only: Text/Draw/Comment double as direct entry points into the
  // Properties bottom sheet's Text/Style/Arrange tabs (those three buttons
  // had no real tool behind them before — just a visual active state — so
  // this gives them one instead of adding yet another icon to the row).
  const [showMobileProperties, setShowMobileProperties] = useState(false);
  const [mobilePropertiesTab, setMobilePropertiesTab] = useState<'style' | 'text' | 'arrange'>('style');
  // Mobile-only: shows a read-only overlay of every shape's connection
  // points + every edge's waypoints on the canvas while its sheet is open —
  // desktop can see these one cell at a time via hover, mobile can't.
  const [showConnectorsPanel, setShowConnectorsPanel] = useState(false);
  const [activeTool, setActiveTool] = useState<'shapes' | 'text' | 'draw' | 'arrange' | 'connectors'>('shapes');
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

  // ─── Autosave status indicator ───────────────────────────────────────────────
  // 'local' — persisted to this device's storage, not yet confirmed by the
  // server. 'syncing' — a background server sync is in flight right now.
  // 'synced' — the server has confirmed this exact content. 'offline' — the
  // last background sync attempt failed (no connection, signed out, etc.);
  // the local copy is still safe, it just hasn't reached the server yet.
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('local');
  // Set on every content change, cleared once that content is written to
  // AsyncStorage — read by the 5s local-autosave tick below so it only
  // actually writes when something changed since the last tick.
  const isDirtyRef = useRef(false);
  // Set on every content change, cleared once the SERVER confirms that exact
  // content — read by attemptBackgroundSync so it skips redundant network
  // round-trips when nothing has changed since the last successful sync.
  const hasUnsyncedServerChangesRef = useRef(false);

  // ─── Download state ──────────────────────────────────────────────────────────
  const [showDownloadDropdown, setShowDownloadDropdown] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  // Mobile-only overflow menu (New Diagram / Diagram Type / Print / Download)
  // — see mobileTopBarRight below.
  const [showMoreMenu, setShowMoreMenu] = useState(false);

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

  // ─── Diagram type state ──────────────────────────────────────────────────────
  // Explicit, always-available override for the diagram's declared type —
  // drives which validation ruleset applies (see umlType on DiagramCanvas).
  // detectDiagramTypeFromContent below already sets this automatically as
  // shapes are added/loaded, but picking a type here is a deliberate user
  // action, so it always wins over the automatic guess — covers the cases
  // detection can't (an all-Standard-shapes diagram, or the rare diagram
  // detection gets wrong) and old diagrams saved before either mechanism
  // existed.
  const [showTypeModal, setShowTypeModal] = useState(false);

  // ─── Share state ─────────────────────────────────────────────────────────────
  const [showShareModal, setShowShareModal] = useState(false);

  // Mobile tour steps for the overflow menu (Diagram Type/Print/Download) need
  // to actually open it — and open the Download format list beneath it — so
  // the tour can walk through items hidden behind a closed menu instead of
  // just describing them from the toggle button. Declared here (not up with
  // isDesktop/router above) because it depends on showMoreMenu/
  // showDownloadDropdown's setters, declared just above.
  const createTourSteps = useMemo(
    () => getCreateTourSteps({
      router,
      isDesktop,
      openMobileMoreMenu: () => setShowMoreMenu(true),
      openMobileDownloadFormats: () => {
        setShowMoreMenu(false);
        setShowDownloadDropdown(true);
      },
      closeMobileDownloadFormats: () => setShowDownloadDropdown(false),
    }),
    [router, isDesktop]
  );
  useOnboardingTour(CREATE_TOUR_ID, createTourSteps, isGraphReady);

  // ─── Print state ─────────────────────────────────────────────────────────────
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [printPreviewUrl, setPrintPreviewUrl] = useState<string | null>(null);
  // Pixel size of the canvas printPreviewUrl was rendered from — needed to
  // build a correctly-proportioned PDF page in executePrint (a data URL
  // string alone doesn't carry its own dimensions).
  const printCanvasSizeRef = useRef<{ width: number; height: number } | null>(null);
  const [isPreparingPrint, setIsPreparingPrint] = useState(false);
  // Optional name (top-left corner) and title (centered) overlaid on the
  // printed page — set via the "Edit" row in the print settings panel.
  const [printName, setPrintName] = useState('');
  const [printTitle, setPrintTitle] = useState('');
  // Is the Edit row's Name/Title panel open.
  const [isPrintEditOpen, setIsPrintEditOpen] = useState(false);
  const [printZoom, setPrintZoom] = useState(100);

  // ─── Zoom state ─────────────────────────────────────────────────────────────
  const [zoomLevel, setZoomLevel] = useState(100);
  const ZOOM_STEPS = [50, 75, 100, 125, 150, 200, 300, 400];

  // ─── Page state ─────────────────────────────────────────────────────────────
  const [pages, setPages] = useState<Page[]>([
    { id: generatePageId(), name: 'Page 1', xml: '' }
  ]);
  const [activePageId, setActivePageId] = useState<string>(pages[0].id);
  const [renamePageId, setRenamePageId] = useState<string | null>(null);
  const [renamePageName, setRenamePageName] = useState('');

  // ─── Page XML cache ─────────────────────────────────────────────────────────
  const pageXmlCache = useRef<Map<string, string>>(new Map());

  // ─── Persistence: continue-a-diagram / per-account local draft ──────────────
  const diagramCanvasRef = useRef<DiagramCanvasHandle>(null);
  // Diagram currently being edited; null = never-saved new diagram.
  const currentDiagramIdRef = useRef<string | null>(null);
  // Same value as currentDiagramIdRef, mirrored into state — plain effects
  // can't react to a ref changing, and the collaboration-room join/leave
  // effect below needs to fire exactly when this diagram gets its first real
  // id (right after the very first save) or changes to a different one.
  const [activeDiagramId, setActiveDiagramId] = useState<string | null>(null);
  // 'owner' for anything this account created; set from the backend's
  // accessLevel once an existing diagram is fetched (see hydrate() below).
  // Gates both the read-only canvas state and whether Save/rename are shown.
  const [myAccessLevel, setMyAccessLevel] = useState<'owner' | 'edit_share' | 'edit' | 'view'>('owner');
  const canEditDiagram = myAccessLevel === 'owner' || myAccessLevel === 'edit_share' || myAccessLevel === 'edit';
  // Plain 'edit' collaborators have nothing to do in the Share dialog (no
  // link, no collaborator management) and 'view' obviously can't share —
  // hiding the button for both avoids a dead-end click.
  const canShareDiagram = myAccessLevel === 'owner' || myAccessLevel === 'edit_share';
  // Whether *this* user already has an outstanding "Request Edit Access" —
  // set from the backend's getDiagram response, so it survives a reload
  // instead of resetting the moment the tab closes.
  const [hasPendingAccessRequest, setHasPendingAccessRequest] = useState(false);
  const [showRequestAccessModal, setShowRequestAccessModal] = useState(false);
  const setCurrentDiagramId = useCallback((id: string | null) => {
    currentDiagramIdRef.current = id;
    setActiveDiagramId(id);
  }, []);
  // Who else currently has this diagram open — driven by the collab-socket
  // 'presence' event (see the join effect further down).
  const [collabViewers, setCollabViewers] = useState<{ userId: string; userName: string; permission: string }[]>([]);
  // Mirrors collabViewers for handleSaveDiagram/attemptBackgroundSync, which
  // are useCallback-memoized on other deps and would otherwise close over a
  // stale (usually empty, pre-join) collabViewers from their first render.
  // Read by the 404-retry guard below: silently forking onto a brand-new
  // diagram id is fine for a solo stale-local-id case, but actively harmful
  // while other people are live-collaborating in the same room (see there).
  const collabViewersRef = useRef<{ userId: string; userName: string; permission: string }[]>([]);
  useEffect(() => {
    collabViewersRef.current = collabViewers;
  }, [collabViewers]);
  // Page ids deleted locally since the last successful save — sent alongside
  // the next save so the backend's page-merge (see diagramController.js)
  // knows to actually drop them server-side instead of a concurrent
  // collaborator's own save silently resurrecting them (merge otherwise has
  // no way to distinguish "this client just doesn't know about that page
  // yet" from "this client deleted that page on purpose").
  const deletedPageIdsRef = useRef<Set<string>>(new Set());
  // Ambient "(avatar) X joined"/"left" banner — set by the presence-diffing
  // logic in the join effect further down, auto-cleared by
  // presenceToastTimerRef. Keeps each person's permission (not just name) so
  // the toast's avatar ring can match PresenceStack's own color coding.
  const [presenceToast, setPresenceToast] = useState<{
    people: { userId: string; userName: string; permission: string }[];
    action: 'joined' | 'left';
  } | null>(null);
  const presenceToastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const collabSendTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Accumulates patches across every raw handleGraphChange call inside one
  // 200ms debounce window, keyed by `${id}:${type}` (terminal patches
  // further split by side) so a later patch for the same cell+field
  // overwrites the earlier one instead of both being sent — e.g. several
  // geometry updates during one drag collapse down to just the final
  // position. Map preserves insertion order on existing-key updates, so an
  // 'add' patch (always produced before any patch that mutates that same
  // cell, since you can't edit a cell before it exists) naturally stays
  // ordered ahead of them with no extra sort step. Cleared on every flush.
  const pendingPatchesRef = useRef<Map<string, DiagramPatch>>(new Map());
  // Last diagramId this instance has actually hydrated from the backend, so a
  // re-render doesn't re-fetch, but switching to a *different* diagramId does.
  const loadedDiagramIdRef = useRef<string | null>(null);
  // Last openedAt nonce this instance has actually hydrated for. This screen
  // deliberately never unmounts across tab switches (see the comment further
  // down), so re-opening the SAME diagram — e.g. rename it from Saved
  // Diagrams, then tap Continue on that same diagram again — kept this
  // effect's diagramId dependency completely unchanged, meaning it never
  // re-ran and the rename (or any other server-side change) never made it
  // back into this already-hydrated instance: the title and content just
  // silently stayed whatever they were before the round trip. openedAt is a
  // fresh value (see savedDiagrams.tsx's confirmContinueDiagram) on every
  // single "Continue" tap, even for the diagram already open here, so the
  // hydrate effect's guard below can tell "the user explicitly chose to
  // (re)open this diagram" apart from an incidental re-render with the same
  // params (e.g. isGraphReady flipping) — which must NOT re-fetch, or it'd
  // clobber whatever unsaved edit is currently in progress.
  const loadedOpenedAtRef = useRef<string | null>(null);
  // The graphInstance we last hydrated. Mobile viewports often report a
  // different width right after the initial render settles (browser chrome
  // collapsing, etc.), which flips create.tsx's isDesktop layout branch —
  // and since mobile/desktop are two separate JSX trees, that fully remounts
  // DiagramCanvas with a brand-new, blank graph. Tracking the instance (not
  // just isGraphReady/diagramId) lets hydration notice the swap and reload
  // into the replacement instead of leaving it blank.
  const hydratedGraphRef = useRef<any>(null);
  // Gates the autosave effect so the initial blank mount can't race ahead and
  // clobber a real draft before hydration (backend fetch or local draft) runs.
  const hasHydratedRef = useRef(false);
  // While true, handleGraphChange no-ops: hydration sets diagramXml/
  // pageXmlCache itself, and the maxGraph CHANGE listener fires synchronously
  // inside loadXml()'s import — without this guard it would capture the new
  // XML under the *previous* render's activePageId.
  const isHydratingRef = useRef(false);
  // Always points at a flush of the current draft (local save + background
  // server sync attempt). Called synchronously from the focus-loss handler
  // further down, so it must be a ref rather than a value captured by that
  // handler's own (deps-[]) closure.
  const pendingAutosaveFlushRef = useRef<() => void>(() => {});
  // Synchronous re-entrancy guard for Save: `isSaving` state doesn't flip
  // true until after an `await` (auth token lookup) runs, leaving a window
  // where rapid repeat clicks (e.g. because the no-op Alert.alert on web
  // gave no visible confirmation) all slip through and each create their own
  // new diagram before the first one's response ever sets currentDiagramIdRef.
  const isSavingRef = useRef(false);
  // The exact same race, one level up: attemptBackgroundSync has THREE
  // independent triggers that can each fire within the same short window —
  // the 5s setInterval tick, document.visibilitychange going 'hidden', and
  // the focus-loss/navigate-away flush — none of which coordinate with each
  // other. attemptBackgroundSync already checks isSavingRef (guards against
  // racing a *manual* Save), but nothing stopped it from racing its OWN
  // previous, still-in-flight call: two overlapping invocations both read
  // the same stale currentDiagramIdRef.current (null, for a diagram never
  // saved yet) before either's response comes back to set it, so both send
  // id: undefined and the server creates two separate diagram records for
  // what was really one save — the concrete mechanism behind the stray
  // duplicate "Blank diagram" entries in Saved Diagrams. Set synchronously
  // at the top of attemptBackgroundSync (before any await) and cleared in a
  // finally, same pattern as isSavingRef itself.
  const isBackgroundSyncingRef = useRef(false);

  // ─── SaveContext integration ──────────────────────────────────────────────
  const { setSaveHandler, setIsSaving: setContextIsSaving, setFlushHandler } = useSave();

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

  // Read inside the collab-socket effect's onRemoteChange handler below,
  // which only re-subscribes when activeDiagramId/isGraphReady change — a
  // plain closure over activePageId would go stale the moment the user
  // switched pages without also rejoining the room.
  const activePageIdRef = useRef(activePageId);
  useEffect(() => {
    activePageIdRef.current = activePageId;
  }, [activePageId]);

  // Patches don't self-heal a missed message the way full-page snapshots
  // used to (any later full snapshot from anyone would silently repair a
  // stale client) — so this is the safety net: re-fetch this diagram's
  // current state from the REST/Firestore source of truth and refresh
  // every page's cache from it. Three callers: a socket reconnect (see
  // collabSocketClient's onResyncNeeded below), a patch that referenced a
  // cell id this client doesn't have (driftDetected from applyPatches),
  // and a patch arriving for a page other than the one on screen (no live
  // graph model exists for a background page to apply patches into, so its
  // cache is refreshed from the server instead — see onRemoteChange below).
  //
  // Deliberately not a reuse of applyLoadedContent: that resets
  // pages/activePageId/diagramName wholesale, which is wrong mid-session if
  // the user has already navigated/renamed locally. This only ever touches
  // pageXmlCache, and — only when applyToActivePage is true — the live
  // canvas for whichever page is *currently* active, exactly like a normal
  // remote update (resetView:false, so it never yanks pan/zoom/selection).
  const resyncInFlightRef = useRef(false);
  const resyncQueuedRef = useRef(false);
  const resyncFromServer = async (opts?: { applyToActivePage?: boolean }) => {
    const applyToActivePage = opts?.applyToActivePage ?? true;
    if (resyncInFlightRef.current) {
      resyncQueuedRef.current = true;
      return;
    }
    const diagramId = currentDiagramIdRef.current;
    if (!diagramId) return;
    resyncInFlightRef.current = true;
    try {
      const API_URL = API_BASE_URL;
      const response = await authService.authFetch(`${API_URL}/api/diagrams/${diagramId}`);
      const result = await response.json();
      if (!result.success || !result.data) return;
      const content = result.data as { xml?: string; pages?: Page[] };
      const loadedPages: Page[] = content.pages && content.pages.length > 0
        ? content.pages
        : [];
      loadedPages.forEach((p) => pageXmlCache.current.set(p.id, p.xml || ''));
      if (loadedPages.length === 0 && content.xml && activePageIdRef.current) {
        pageXmlCache.current.set(activePageIdRef.current, content.xml);
      }

      if (applyToActivePage) {
        const activePage = activePageIdRef.current;
        const xml = activePage ? pageXmlCache.current.get(activePage) : undefined;
        if (xml) {
          isHydratingRef.current = true;
          diagramCanvasRef.current?.loadXml(xml, { resetView: false });
          diagramCanvasRef.current?.refresh();
          isHydratingRef.current = false;
          setDiagramXml(xml);
        }
      }
    } catch (e) {
      console.error('Resync from server failed:', e);
    } finally {
      resyncInFlightRef.current = false;
      if (resyncQueuedRef.current) {
        resyncQueuedRef.current = false;
        resyncFromServer(opts);
      }
    }
  };

  // ─── Real-time collaboration ────────────────────────────────────────────
  // Joins this diagram's room the moment it actually has a real id (a
  // never-saved new diagram has nothing to join yet — see setCurrentDiagramId)
  // and the graph exists to apply remote changes into. Only one diagram is
  // ever joined at a time; switching to a different one (or this diagram
  // getting its first id right after the very first save) tears down the old
  // room and joins the new one via this same effect re-running.
  //
  // Scope note: sync is per active page, not the whole multi-page document —
  // two people on different pages of the same diagram won't see each other's
  // edits until they're both on the same page. Covering every page at once
  // would mean broadcasting (and merging) all of them simultaneously, which
  // is a meaningfully bigger feature than what a share dialog needs.
  useEffect(() => {
    if (!activeDiagramId || !isGraphReady) return;
    let cancelled = false;

    // Populated below before any 'diagram-change' can arrive — used by
    // onRemoteChange to recognize (and drop) an echo of this same client's
    // own edit. The server's socket.to(room).emit already excludes the
    // sending *socket*, but not a second socket for the same user/tab (a
    // still-connected previous session that hasn't timed out yet, a second
    // tab, a reconnect after a drop) — either of those receiving its own
    // broadcast back and re-applying it via loadXml/handleGraphChange is
    // exactly the shape of an unbounded local<->remote ping-pong, each
    // round only growing the XML further. fromUserId already rides on
    // every 'diagram-change' payload (collabSocketClient.js) specifically
    // for this; it was simply never read here.
    let myUserId: string | null = null;
    authService.getCurrentUserId().then((uid) => {
      if (!cancelled) myUserId = uid;
    });

    // Diffs each presence update against the previous one to announce who
    // just joined/left — reset per room-join (a new Map each time this
    // effect re-runs), not persisted across switching diagrams. The first
    // presence update after joining is the *existing* roster, not people
    // "joining" — hasSeenInitialPresence skips announcing that one so
    // opening a diagram doesn't immediately claim everyone already there
    // just joined.
    const knownViewers = new Map<string, { userName: string; permission: string }>();
    let hasSeenInitialPresence = false;

    const showPresenceToast = (
      people: { userId: string; userName: string; permission: string }[],
      action: 'joined' | 'left',
    ) => {
      if (presenceToastTimerRef.current) clearTimeout(presenceToastTimerRef.current);
      setPresenceToast({ people, action });
      presenceToastTimerRef.current = setTimeout(() => setPresenceToast(null), 3000);
    };

    joinDiagram(activeDiagramId, {
      onRemoteChange: (patches: DiagramPatch[], pageId?: string | null, fromUserId?: string) => {
        if (cancelled || !patches || patches.length === 0) return;
        if (fromUserId && myUserId && fromUserId === myUserId) return;
        // A change tagged for a page other than the one on screen right now
        // must never touch the live canvas — applying it there is exactly
        // the "other collaborator's edit replaced/emptied my diagram" bug:
        // this client would apply a different page's patches onto whatever
        // it's actually looking at. Unlike the old full-snapshot design,
        // there's no live graph model for a background page to patch
        // against here (only a cached xml string, not a Cell tree) — so
        // instead of caching directly, refresh that page's cache from the
        // server. A brief round trip is a fine trade for a page that isn't
        // even being viewed right now. A missing pageId (older/other
        // senders) is treated as "current page", matching the single-page
        // behavior this had before multi-page tagging existed.
        if (pageId && pageId !== activePageIdRef.current) {
          resyncFromServer({ applyToActivePage: false });
          return;
        }
        isHydratingRef.current = true;
        // resetView: false — a collaborator's edit shouldn't yank this
        // viewer's own pan/zoom back to centered every time it arrives
        // (see loadXml's resetView doc comment in DiagramCanvas.tsx).
        const result = diagramCanvasRef.current?.applyPatches(patches);
        diagramCanvasRef.current?.refresh();
        isHydratingRef.current = false;
        if (result) {
          setDiagramXml(result.xml);
          const activePage = activePageIdRef.current;
          if (activePage) pageXmlCache.current.set(activePage, result.xml);
          // A patch referenced a cell this client doesn't have locally —
          // it's missed an earlier patch and drifted out of sync. Resync
          // from the server rather than let it silently stay wrong.
          if (result.driftDetected) resyncFromServer();
        }
      },
      onPresence: (viewers: { userId: string; userName: string; permission: string }[]) => {
        if (cancelled) return;
        // Excludes this same user's own socket — the presence roster is
        // meant to answer "who ELSE is here right now", the same way no
        // collaborative editor shows your own avatar back to you.
        const others = viewers.filter((v) => v.userId !== myUserId);

        if (hasSeenInitialPresence) {
          const currentIds = new Set(others.map((v) => v.userId));
          const joined = others.filter((v) => !knownViewers.has(v.userId));
          const left: { userId: string; userName: string; permission: string }[] = [];
          knownViewers.forEach((info, userId) => {
            if (!currentIds.has(userId)) left.push({ userId, ...info });
          });
          // Belt-and-suspenders alongside the server's own cell-select(null)
          // broadcast on disconnect/leave-diagram — cheap, and covers the
          // rare case that broadcast is missed (e.g. a hard connection drop
          // the server hasn't noticed yet, but presence already reflects).
          left.forEach((v) => diagramCanvasRef.current?.setRemoteSelection(v.userId, null, ''));

          if (joined.length && !left.length) {
            showPresenceToast(joined, 'joined');
          } else if (left.length && !joined.length) {
            showPresenceToast(left, 'left');
          }
        } else {
          hasSeenInitialPresence = true;
        }

        knownViewers.clear();
        others.forEach((v) => knownViewers.set(v.userId, { userName: v.userName, permission: v.permission }));
        setCollabViewers(others);
      },
      // Pushed the instant the owner changes this account's access level (or
      // approves its access request) — without this, a tab already open on
      // the diagram keeps its stale myAccessLevel (still gating the canvas
      // read-only, still hiding Share) until the user happens to reload.
      onPermissionChange: (permission: 'owner' | 'edit_share' | 'edit' | 'view') => {
        if (!cancelled) setMyAccessLevel(permission);
      },
      // Live "who's pointing at what" — a remote collaborator's own
      // selection, relayed by the server (see collabSocket.js's cell-select
      // handler). Colored by that same person's userId-hashed color, so it
      // visually matches their avatar in the toolbar/toast.
      onCellSelect: (cellId: string | null, fromUserId: string) => {
        if (cancelled || !fromUserId || fromUserId === myUserId) return;
        diagramCanvasRef.current?.setRemoteSelection(fromUserId, cellId, getAvatarColor(fromUserId));
      },
      // Fired on every socket reconnect after the first (see
      // collabSocketClient's hasConnectedOnce gating) — patches don't
      // self-heal a gap in missed messages the way full snapshots used to,
      // so a client that just reconnected needs an explicit resync rather
      // than silently sitting on whatever it had before the drop.
      onResyncNeeded: () => {
        if (!cancelled) resyncFromServer();
      },
    }).then((result) => {
      if (!cancelled && !result.ok) {
        console.warn('Could not join collaboration room:', result.message);
        // Previously silent (console-only) — a failed join means this tab
        // never sees anyone else's live edits at all (falls back to
        // whatever the initial REST load happened to have), which without
        // any visible explanation looks identical to "collaboration is
        // just broken." Covers the room being full (10 concurrent
        // collaborators) as well as any access/not-found edge case.
        notify('Live Collaboration Unavailable', result.message || 'Could not connect to real-time collaboration for this diagram. You can keep editing, but you may not see others\' changes right away.');
      }
    });

    return () => {
      cancelled = true;
      leaveDiagram();
      setCollabViewers([]);
      diagramCanvasRef.current?.clearAllRemoteSelections();
      if (presenceToastTimerRef.current) clearTimeout(presenceToastTimerRef.current);
      setPresenceToast(null);
    };
  }, [activeDiagramId, isGraphReady]);

  // Viewers get a read-only canvas — the real enforcement is always the
  // backend (save + socket permission checks), this is purely so they don't
  // try to drag a shape only to have any resulting save rejected.
  useEffect(() => {
    if (!isGraphReady) return;
    diagramCanvasRef.current?.setReadOnly(myAccessLevel === 'view');
  }, [myAccessLevel, isGraphReady]);

  // react-native-web's Modal portals to document.body rather than rendering
  // inside this screen's own container, so it ignores which screen React
  // Navigation actually has focused. Since this screen deliberately stays
  // mounted (frozen, not unmounted) when you navigate to another tab, any
  // Modal left open here — the network-error dialog or print — would
  // otherwise keep showing on top of whatever screen you go to next.
  // Dismiss them all as soon as this screen loses focus.
  useFocusEffect(
    useCallback(() => {
      // Regaining focus after a tab switch can leave the graph's SVG sized/
      // painted from whatever it measured while this screen was hidden (see
      // DiagramCanvasHandle.refresh's own comment) — the diagram data itself
      // was never touched, but it can render as if it vanished. Forcing a
      // repaint here costs nothing when everything was already fine.
      diagramCanvasRef.current?.refresh();

      return () => {
        setDialogState(null);
        setShowPrintModal(false);
        // The local autosave tick only runs every 5s. Switching tabs faster
        // than that (very easy to do) previously lost whatever was just
        // drawn, because this screen can end up rebuilt from scratch on
        // return (e.g. the mobile/desktop layout branch flipping) with
        // nothing but that draft to restore from. Firing the pending save
        // right as focus is lost — instead of waiting on the timer — closes
        // that window.
        pendingAutosaveFlushRef.current();
      };
    }, [])
  );

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

    // Remount restore: reload the saved local draft now that the graph
    // provably exists, instead of depending on the hydratedGraphRef/
    // isMidSessionRemount gating above, which can lose the race across two
    // effect passes referring to the same graph instance. Skipped when a
    // specific diagramId is requested — that case is already handled by the
    // backend fetch in the hydrate effect, and this pointer-based restore
    // would otherwise clobber it with the wrong diagram's content.
    if (!diagramId) {
      (async () => {
        try {
          const uid = await authService.getCurrentUserId();
          if (!uid) return;
          const pointerRaw = await AsyncStorage.getItem(activePointerKey(uid));
          const pointer = pointerRaw ? JSON.parse(pointerRaw) : { diagramId: null };
          const contentRaw = await AsyncStorage.getItem(draftKey(uid, pointer.diagramId));
          if (!contentRaw) return;

          const content = JSON.parse(contentRaw);
          const activeXml = content.pages?.[0]?.xml || content.xml || '';
          if (!activeXml || activeXml.length === 0) return;

          console.log('🔁 onReady restore — xmlLen:', activeXml.length);
          isHydratingRef.current = true;
          diagramCanvasRef.current?.loadXml(activeXml);
          diagramCanvasRef.current?.refresh();
          isHydratingRef.current = false;

          if (content.pages) {
            content.pages.forEach((p: any) => pageXmlCache.current.set(p.id, p.xml || ''));
            setPages(content.pages);
            setActivePageId(content.activePageId || content.pages[0].id);
          }
          setDiagramXml(activeXml);
          diagramXmlRef.current = activeXml;
          setCurrentDiagramId(pointer.diagramId || null);
          hasHydratedRef.current = true;
        } catch (e) {
          console.warn('onReady restore failed:', e);
        }
      })();
    }

    if (graph) {
      try {
        const scale = graph.getView().getScale();
        setZoomLevel(Math.round(scale * 100));
      } catch (e) {
        console.warn('Could not get scale:', e);
      }
    }
  };

  const handleGraphChange = (xml: string, patches: DiagramPatch[]) => {
    if (isHydratingRef.current) return;
    console.log('🔄 handleGraphChange — xmlLen:', xml?.length || 0, 'activePageId:', activePageId, 'hydrated:', hasHydratedRef.current);
    setDiagramXml(xml);
    // Captured now (the page this edit actually happened on), not read again
    // inside the debounced setTimeout below — the user can switch pages
    // during that 200ms window, and this change must stay tagged with the
    // page it came from either way. See onRemoteChange's matching pageId
    // guard for why: without it, this same mistake on the *receiving* end
    // is what let one collaborator's edit on page 2 silently overwrite
    // another collaborator's page 1 (the "diagram disappeared" bug).
    const pageIdAtChange = activePageId;
    if (pageIdAtChange) {
      pageXmlCache.current.set(pageIdAtChange, xml);
    }

    // Broadcast to any other live collaborators on this same diagram+page —
    // as a small patch list (what actually changed), not the whole page's
    // xml, so concurrent edits to different shapes no longer overwrite each
    // other on arrival. Buffered across every raw CHANGE event and only
    // flushed on the existing 200ms debounce, same cadence as before; a
    // 'full' patch (the changesToPatches escape hatch) always arrives alone
    // and replaces whatever's already buffered, since it supersedes any
    // more specific patch for the same edit.
    for (const patch of patches) {
      if (patch.type === 'full') {
        pendingPatchesRef.current.clear();
        pendingPatchesRef.current.set(patchKey(patch), patch);
        break;
      }
      pendingPatchesRef.current.set(patchKey(patch), patch);
    }

    if (canEditDiagram && currentDiagramIdRef.current) {
      const diagramId = currentDiagramIdRef.current;
      if (collabSendTimerRef.current) clearTimeout(collabSendTimerRef.current);
      collabSendTimerRef.current = setTimeout(() => {
        const toSend = Array.from(pendingPatchesRef.current.values());
        pendingPatchesRef.current.clear();
        if (toSend.length > 0) sendDiagramChange(diagramId, pageIdAtChange, toSend);
      }, 200);
    }
  };

  // ─── Persistence: continue a saved diagram / resume the local draft ────────

  const applyLoadedContent = (content: { name: string; xml: string; pages?: Page[]; activePageId?: string | null; type?: string }) => {
    pageXmlCache.current.clear();
    // Baseline restore of the diagram's own declared type on load — without
    // this, activeUmlType (which drives validation rules, see umlType passed
    // to DiagramCanvas) stayed at whatever it was left at from a previous
    // diagram/session instead of matching what's actually being opened.
    // Older local drafts saved before this field existed won't have it —
    // leaving activeUmlType untouched in that case is the safer fallback,
    // rather than resetting it to some arbitrary default. This gets
    // overridden below, once the content is actually loaded into the graph,
    // by whatever detectDiagramTypeFromContent finds — content stored before
    // that detector existed can have a stale/wrong type field, and this is
    // what self-corrects it the moment the diagram is opened.
    if (content.type) {
      setActiveUmlType(content.type);
    }
    const loadedPages: Page[] = content.pages && content.pages.length > 0
      ? content.pages
      : [{ id: generatePageId(), name: 'Page 1', xml: content.xml || '' }];
    loadedPages.forEach(p => pageXmlCache.current.set(p.id, p.xml || ''));
    const targetActiveId = content.activePageId && loadedPages.some(p => p.id === content.activePageId)
      ? content.activePageId
      : loadedPages[0].id;
    const activeXml = pageXmlCache.current.get(targetActiveId) || content.xml || '';
    const name = content.name || 'Blank diagram';

    setPages(loadedPages);
    setActivePageId(targetActiveId);
    setDiagramName(name);
    setDiagramXml(activeXml);

    isHydratingRef.current = true;
    diagramCanvasRef.current?.loadXml(activeXml);
    isHydratingRef.current = false;
    // loadXml() imports the model but doesn't reliably repaint (same class of
    // issue as the visibilitychange/focus-loss cases elsewhere in this file).
    diagramCanvasRef.current?.refresh();

    // Cross-checks the just-loaded content against what's actually drawn —
    // see detectDiagramTypeFromContent's own comment. Only overrides when a
    // confident, type-specific majority is found; a diagram built entirely
    // from Standard shapes (or one with no shapes yet) keeps whatever
    // content.type/setActiveUmlType above already set.
    if (graphInstance) {
      const detected = detectDiagramTypeFromContent(graphInstance);
      if (detected) {
        setActiveUmlType(detected);
      }
    }

    // Returned so callers can persist this exact snapshot to AsyncStorage
    // immediately (see hydrate()'s backend-load branch below) — reading
    // `pages`/`activePageId` state here instead wouldn't work, since the
    // setPages/setActivePageId calls above haven't committed yet.
    return { name, pages: loadedPages, activePageId: targetActiveId, type: content.type };
  };

  const draftKey = (uid: string, id: string | null) => `diagram_draft_${uid}_${id || 'new'}`;
  const activePointerKey = (uid: string) => `diagram_active_${uid}`;

  const persistDraft = async (uid: string, id: string | null) => {
    try {
      const content = {
        name: diagramNameRef.current,
        pages: pages.map(p => ({ id: p.id, name: p.name, xml: pageXmlCache.current.get(p.id) || '' })),
        activePageId,
        type: activeUmlType,
      };
      await AsyncStorage.setItem(draftKey(uid, id), JSON.stringify(content));
      await AsyncStorage.setItem(activePointerKey(uid), JSON.stringify({ diagramId: id }));
    } catch (e) {
      console.warn('Could not persist local draft:', e);
    }
  };

  // Last resort when hydrate()'s server fetch for a specific diagramId comes
  // back empty/failed/offline: check this device's own local draft for that
  // same id before giving up with an error toast and a blank canvas. A
  // diagram that's only ever made it to "Saved on device only" (syncStatus
  // 'local'/'offline' — the background sync hasn't confirmed it server-side
  // yet) genuinely doesn't exist there to fetch, so a hard refresh — which
  // re-requests this same diagramId from the server — used to read as the
  // diagram having vanished, even though its content was sitting right here
  // the whole time. Returns whether it actually found and applied something.
  const restoreFromLocalDraft = async (id: string): Promise<boolean> => {
    try {
      const uid = await authService.getCurrentUserId();
      if (!uid) return false;
      const contentRaw = await AsyncStorage.getItem(draftKey(uid, id));
      if (!contentRaw) return false;
      applyLoadedContent(JSON.parse(contentRaw));
      setMyAccessLevel('owner');
      setHasPendingAccessRequest(false);
      setCurrentDiagramId(id);
      return true;
    } catch (e) {
      console.warn('Could not restore local draft as a fallback:', e);
      return false;
    }
  };

  // Loads a specific saved diagram when arriving via "Continue" from Saved
  // Diagrams; otherwise resumes this account's last local draft so a shape
  // survives a tab switch (instance never unmounts, see Navbar's create-only
  // router.navigate) or a full logout/login (which does unmount everything).
  useEffect(() => {
    if (!isGraphReady || !graphInstance) return;
    let cancelled = false;

    console.log('🔍 hydrate effect — diagramId:', diagramId,
      'hasHydrated:', hasHydratedRef.current,
      'hydratedGraphRef:', hydratedGraphRef.current === graphInstance ? 'same' : 'different');

    // A different graph instance than last time means DiagramCanvas was
    // torn down and rebuilt (e.g. the mobile/desktop layout branch flipping
    // on a resize) and is now blank. Only a REAL first mount should fall
    // through to the backend/local-draft hydrate() below — a mid-session
    // remount (hydratedGraphRef.current already pointed at some earlier
    // instance) instead restores straight from `pages`/`activePageId`,
    // which are owned by this screen, not by DiagramCanvas, and so are
    // still sitting in memory with the real, current content regardless of
    // what just happened to the child component. Going through
    // AsyncStorage/the backend here instead — the previous behavior — can
    // race a save that's still in flight (the local autosave tick is only
    // every 5s) and come back with an older snapshot missing whatever was
    // just drawn: this is the actual bug behind "my shape disappeared after
    // switching tabs and back."
    // Only trust the cache-restore shortcut below if the *previous* instance
    // had actually finished a real hydrate (backend fetch or local draft) —
    // otherwise this remount is racing that still-in-flight first load (e.g.
    // useWindowDimensions() settling on a different width right after the
    // very first mount, flipping isDesktop before the ?diagramId= fetch has
    // resolved). pageXmlCache/diagramXmlRef are still empty at that point, so
    // "restoring" from them would silently load a blank canvas, mark
    // hydration as done, and lock loadedDiagramIdRef — permanently cancelling
    // the real fetch's continuation instead of ever retrying it.
    const wasFullyHydrated = hasHydratedRef.current;
    const isMidSessionRemount =
      hydratedGraphRef.current !== null && hydratedGraphRef.current !== graphInstance && wasFullyHydrated;
    if (hydratedGraphRef.current !== graphInstance) {
      hydratedGraphRef.current = graphInstance;
      loadedDiagramIdRef.current = null;
      hasHydratedRef.current = false;
    }

    if (isMidSessionRemount) {
      const xmlToRestore = pageXmlCache.current.get(activePageId) || diagramXmlRef.current || '';
      console.log('🔍 remount restore — cacheHas:', pageXmlCache.current.has(activePageId),
        'xmlLen:', xmlToRestore.length, 'graphReady:', !!(diagramCanvasRef.current));
      isHydratingRef.current = true;
      diagramCanvasRef.current?.loadXml(xmlToRestore);
      isHydratingRef.current = false;
      // loadXml() imports the model but doesn't reliably repaint on its own.
      diagramCanvasRef.current?.refresh();
      hasHydratedRef.current = true;
      loadedDiagramIdRef.current = diagramId || currentDiagramIdRef.current || null;
      loadedOpenedAtRef.current = openedAt || null;
      return;
    }

    const hydrate = async () => {
      if (diagramId && (diagramId !== loadedDiagramIdRef.current || openedAt !== loadedOpenedAtRef.current)) {
        loadedDiagramIdRef.current = diagramId;
        loadedOpenedAtRef.current = openedAt || null;
        // `cancelled` (below) flips true on EVERY cleanup — including a
        // harmless second invocation of this same effect for the exact same
        // diagramId (e.g. authUserId resolving moments after mount re-runs
        // it, well before this fetch's ~400-500ms round trip finishes). That
        // second run's own guard above correctly no-ops (the refs already
        // match), but its cleanup still cancels THIS still-in-flight call —
        // so when the real fetch came back with the correct diagram content,
        // it silently discarded it here instead of ever rendering it: the
        // "diagram fetched successfully but the canvas stays blank" bug.
        // Checking against the refs instead of the flag distinguishes "a
        // harmless re-run for the same target" (refs still match — safe to
        // proceed) from "a genuinely different diagram/open started since
        // I began" (refs now point elsewhere — this result really is stale
        // and must be discarded, same as `cancelled` originally intended).
        const targetDiagramId = diagramId;
        const targetOpenedAt = openedAt || null;
        const isStale = () =>
          loadedDiagramIdRef.current !== targetDiagramId || loadedOpenedAtRef.current !== targetOpenedAt;
        try {
          // savedDiagrams.tsx kicks this fetch off the moment its diagram
          // card is tapped, well before navigation lands here — reusing it
          // (instead of starting an identical fetch from scratch) is most of
          // where "immediately" comes from: the network round trip has
          // already been running during the "Continue?" confirmation modal
          // and the navigation itself, so it's often already finished.
          const prefetched = authService.takePrefetchedDiagram(diagramId);
          let result;
          if (prefetched) {
            result = await prefetched;
          } else {
            const API_URL = API_BASE_URL;
            const response = await authService.authFetch(`${API_URL}/api/diagrams/${diagramId}`);
            result = await response.json();
          }
          if (isStale()) return;
          if (result.success && result.data) {
            const loaded = applyLoadedContent(result.data);
            setMyAccessLevel(result.data.accessLevel || 'owner');
            setHasPendingAccessRequest(!!result.data.hasPendingAccessRequest);
            setCurrentDiagramId(diagramId);
            // Set this *before* the awaits below, not just in the `finally`.
            // applyLoadedContent's setState calls above get flushed by React
            // at our next `await`, which re-runs the autosave-debounce effect
            // (its deps — diagramXml/pages/etc. — just changed) — and that
            // effect no-ops unless hasHydratedRef.current is already true,
            // meaning it would otherwise skip arming pendingAutosaveFlushRef.
            // Leaving that unarmed defeats the focus-loss flush entirely: an
            // untouched, just-opened diagram would have no pending save to
            // flush when the user immediately switches tabs, and only this
            // block's own (slower) direct write below would still be racing
            // to finish in time.
            hasHydratedRef.current = true;

            // Persist this snapshot right away too, instead of relying only
            // on the 5s local-autosave tick or the focus-loss flush above
            // catching up. Navbar strips the
            // ?diagramId param on every subsequent visit to this tab (see
            // its create-only router.navigate), so if the user switches tabs
            // before either of those, the only way back to this diagram is
            // via the local draft below — and without this, that draft/
            // pointer wouldn't exist yet, so the canvas would come back blank.
            const uid = await authService.getCurrentUserId();
            if (uid && !isStale()) {
              try {
                await AsyncStorage.setItem(draftKey(uid, diagramId), JSON.stringify(loaded));
                await AsyncStorage.setItem(activePointerKey(uid), JSON.stringify({ diagramId }));
              } catch (e) {
                console.warn('Could not persist loaded diagram to local draft:', e);
              }
            }
          } else {
            const restored = await restoreFromLocalDraft(diagramId);
            if (!isStale() && !restored) {
              notify('Error', result.message || 'Could not load that diagram.');
            }
          }
        } catch (e) {
          console.error('Failed to load diagram:', e);
          const restored = await restoreFromLocalDraft(diagramId);
          if (!isStale() && !restored) {
            notify('Error', 'Could not load that diagram. Please check your connection.');
          }
        } finally {
          if (!isStale()) hasHydratedRef.current = true;
        }
        return;
      }

      if (!diagramId && !hasHydratedRef.current) {
        let uid: string | null = null;
        try {
          uid = await authService.getCurrentUserId();
          if (uid) {
            const pointerRaw = await AsyncStorage.getItem(activePointerKey(uid));
            const pointer = pointerRaw ? JSON.parse(pointerRaw) : { diagramId: null };
            const contentRaw = await AsyncStorage.getItem(draftKey(uid, pointer.diagramId));
            if (contentRaw) {
              applyLoadedContent(JSON.parse(contentRaw));
              setMyAccessLevel('owner');
              setHasPendingAccessRequest(false);
              setCurrentDiagramId(pointer.diagramId || null);
              loadedDiagramIdRef.current = pointer.diagramId || null;
            }
          }
        } catch (e) {
          console.warn('Could not restore local draft:', e);
        } finally {
          // Only latch when we actually had a uid. If auth wasn't ready yet
          // (uid null right after sign-in), leave the gate open so the retry
          // below can run once the id resolves.
          if (!cancelled && uid) hasHydratedRef.current = true;
        }
      }
    };

    hydrate();
    return () => { cancelled = true; };
  }, [isGraphReady, graphInstance, diagramId, openedAt, authUserId]);

  // Resolves the signed-in uid once the graph is ready. Right after a fresh
  // sign-in, authService.getCurrentUserId() inside the hydrate effect above
  // can still return null on its first pass — this re-checks independently
  // and, once it lands, feeds authUserId back into that effect's deps so a
  // late-arriving id gets a second, real hydrate attempt.
  useEffect(() => {
    if (!isGraphReady) return;
    let cancelled = false;
    authService.getCurrentUserId().then((uid) => {
      if (!cancelled) setAuthUserId(uid ?? null);
    });
    return () => { cancelled = true; };
  }, [isGraphReady, graphInstance]);

  // Marks pending changes dirty for both the local autosave tick below and
  // the background server sync — a plain effect rather than the timer
  // itself, so continuous editing without a pause still gets picked up by
  // the next tick instead of endlessly deferring (a fixed-delay debounce
  // that resets on every keystroke can go a long time without ever firing
  // while the user keeps typing).
  useEffect(() => {
    if (!hasHydratedRef.current) return;
    isDirtyRef.current = true;
    hasUnsyncedServerChangesRef.current = true;
  }, [diagramXml, pages, diagramName, activePageId]);

  // Writes the current draft to this device's storage — on a steady 5s
  // clock while there are unsaved changes, not just once after a pause, so
  // unsaved edits reliably survive a tab switch or a logout/login even
  // before the user explicitly hits Save.
  const flushLocalAutosave = useCallback(async () => {
    if (!isDirtyRef.current) return;
    isDirtyRef.current = false;
    const uid = await authService.getCurrentUserId();
    if (uid) await persistDraft(uid, currentDiagramIdRef.current);
    // The green "synced" state means the server has confirmed this *exact*
    // content — a fresh local-only save always means something has changed
    // since then, so it can only ever downgrade the indicator back to
    // "local", never leave a stale green checkmark showing while a sync
    // attempt is genuinely still in flight.
    setSyncStatus((prev) => (prev === 'syncing' ? prev : 'local'));
  }, []);

  // Sign-out flush: never early-returns on the dirty flag (the 5s tick may
  // have already cleared it), so the freshest refs always reach disk before
  // the screen is torn down.
  const forceFlushDraft = useCallback(async () => {
    isDirtyRef.current = false;
    const uid = await authService.getCurrentUserId();
    if (uid) await persistDraft(uid, currentDiagramIdRef.current);
  }, []);

  useEffect(() => {
    // Also reachable synchronously from the focus-loss handler below, so a
    // fast tab switch still gets a local save attempt (and kicks off a
    // background server sync) instead of only waiting for the next 5s tick.
    pendingAutosaveFlushRef.current = () => {
      flushLocalAutosave();
      attemptBackgroundSyncRef.current(true);
    };
    // Both the local-storage flush and the server sync run on this same 5s
    // clock, not just on tab-switch/focus-loss — a long, uninterrupted
    // editing session (the common case) used to only ever get the local
    // write, leaving the server copy (and therefore any live collaborator's
    // "confirmed" state, plus the ability to recover this work from another
    // device) stale until the user happened to switch away. Both calls
    // already no-op on their own when there's nothing new to send
    // (isDirtyRef for the local write, hasUnsyncedServerChangesRef for the
    // server one), so ticking every 5s regardless of activity costs nothing
    // extra while idle.
    const interval = setInterval(() => {
      flushLocalAutosave();
      attemptBackgroundSyncRef.current();
    }, 5000);
    return () => clearInterval(interval);
  }, [flushLocalAutosave]);

  // Registered with SaveContext so a screen this instance can't outlive
  // (e.g. userAccount.tsx, right before signing out) can await a real save
  // to local storage first — see onFlushDraft's own comment in
  // SaveContext.tsx for why that screen's own focus-loss autosave isn't
  // enough on its own for that specific navigation.
  useEffect(() => {
    setFlushHandler(forceFlushDraft);
    return () => setFlushHandler(null);
  }, [forceFlushDraft, setFlushHandler]);

  // Server sync trigger — the tab/window going to the background. Web-only
  // (document.visibilitychange); the other named trigger, leaving the
  // editor, is covered by the useFocusEffect cleanup further down, which
  // already calls pendingAutosaveFlushRef on every platform.
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;
    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        flushLocalAutosave();
        attemptBackgroundSyncRef.current(true);
      } else if (document.visibilityState === 'visible') {
        // Returning from another system/browser tab — RN focus never changed,
        // so useFocusEffect didn't fire. Force the same repaint it would have.
        diagramCanvasRef.current?.refresh();
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => document.removeEventListener('visibilitychange', onVisibilityChange);
  }, [flushLocalAutosave]);

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

    // This used to just console.log and stop — it updated diagramXml/
    // pageXmlCache bookkeeping but never actually told the live maxGraph
    // instance to load the target page's content, so the canvas kept
    // showing whatever the *previous* page had. Guarded by isHydratingRef
    // (same as applyLoadedContent) so the CHANGE listener this import fires
    // synchronously doesn't get captured by handleGraphChange under the
    // *old* activePageId closure and stomp the wrong page's cache entry.
    if (graphInstance) {
      isHydratingRef.current = true;
      try {
        if (pageXml) {
          diagramCanvasRef.current?.loadXml(pageXml);
        } else {
          // A blank page (e.g. just added, never drawn on) — nothing to
          // import, so clear the model directly instead, same as
          // addNewPage does for the page it just created.
          const model = graphInstance.getDataModel ? graphInstance.getDataModel() : graphInstance.model;
          model?.clear();
          graphInstance.clearSelection();
        }
      } catch (e) {
        console.error('Error loading page:', e);
      } finally {
        isHydratingRef.current = false;
      }
    }

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
            deletedPageIdsRef.current.add(pageId);

            const newPages = pages.filter(p => p.id !== pageId);
            setPages(newPages);

            if (activePageId === pageId) {
              const newActiveId = newPages[0]?.id || '';
              setActivePageId(newActiveId);
              const xml = pageXmlCache.current.get(newActiveId) || '';
              setDiagramXml(xml);

              // Same bug as switchToPage had: without this, deleting the
              // active page updates bookkeeping state but leaves the live
              // canvas showing the just-deleted page's content.
              if (graphInstance) {
                isHydratingRef.current = true;
                try {
                  if (xml) {
                    diagramCanvasRef.current?.loadXml(xml);
                  } else {
                    const model = graphInstance.getDataModel ? graphInstance.getDataModel() : graphInstance.model;
                    model?.clear();
                    graphInstance.clearSelection();
                  }
                } catch (e) {
                  console.error('Error loading page after delete:', e);
                } finally {
                  isHydratingRef.current = false;
                }
              }
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

    // Same missing-persist bug as the others below: flush whatever page is
    // currently active before switching away from it.
    if (activePageId && diagramXml) {
      pageXmlCache.current.set(activePageId, diagramXml);
    }

    const sourceXml = pageXmlCache.current.get(pageId) || '';
    const newPage: Page = {
      id: generatePageId(),
      name: `${page.name} (Copy)`,
      xml: sourceXml,
    };
    // Without this, switching away from the new copy and back would find
    // nothing cached for its id and come back blank, even though `pages`
    // still lists it as having xml (that field is only ever read at
    // creation time here — pageXmlCache is the real source of truth
    // everywhere else, same as switchToPage/addNewPage/deletePage).
    pageXmlCache.current.set(newPage.id, sourceXml);

    setPages([...pages, newPage]);
    setActivePageId(newPage.id);
    setDiagramXml(sourceXml);

    // And the same missing-load bug: reflect the copy on the live canvas
    // immediately instead of leaving it showing the previous page.
    if (graphInstance) {
      isHydratingRef.current = true;
      try {
        if (sourceXml) {
          diagramCanvasRef.current?.loadXml(sourceXml);
        } else {
          const model = graphInstance.getDataModel ? graphInstance.getDataModel() : graphInstance.model;
          model?.clear();
          graphInstance.clearSelection();
        }
      } catch (e) {
        console.error('Error loading duplicated page:', e);
      } finally {
        isHydratingRef.current = false;
      }
    }

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

  // The tap-picking half of the tap-to-connect flow (see the early return in
  // handleAddShape below): while pendingConnector is set, the graph's own
  // selection-change events — which fire on every tap/click regardless of
  // platform — are read as "the user just picked a shape" instead of normal
  // selection. Tapping empty canvas (cell null) cancels rather than leaving
  // the mode silently active with no visible way out besides the banner's
  // own Cancel button.
  const handleCanvasSelectionChange = (cell: any) => {
    // Broadcasts this selection to collaborators regardless of what the
    // rest of this handler does below (the mobile tap-to-connect flow) —
    // every user's local selection should update their live highlight
    // color on everyone else's canvas independent of that unrelated
    // gesture. No-ops server-side if this diagram was never saved/joined.
    if (currentDiagramIdRef.current) {
      sendCellSelect(currentDiagramIdRef.current, cell ? cell.getId() : null);
    }

    const current = pendingConnectorRef.current;
    if (!current) return;

    if (!cell) {
      updatePendingConnector(null);
      return;
    }
    // Edges are valid taps too, not just shapes — Fishbone's spine in
    // particular is a real connector now (see CONNECTOR_SHAPE_IDS in
    // constants/shapes.ts), and a Main Cause branching off it is exactly
    // the tap-to-connect flow this is for. graph.insertEdge below accepts
    // an edge as a terminal fine; the geometry math further down only
    // seeds an initial (immediately superseded) terminal point once a real
    // cell is set on both ends, so an edge's own less-meaningful x/y/width/
    // height there is harmless.

    if (!current.sourceCell) {
      updatePendingConnector({ ...current, sourceCell: cell });
      return;
    }
    if (cell === current.sourceCell) {
      // Tapping the source again undoes the pick instead of no-op'ing —
      // gives the user a way to correct a wrong first shape without
      // hitting Cancel and restarting from the toolbar.
      updatePendingConnector({ ...current, sourceCell: null });
      return;
    }

    const graph = graphInstance;
    if (!graph) { updatePendingConnector(null); return; }

    const styleKey = IGRAPH_ID_STYLE_MAP[current.shapeId] ?? 'igraph.rectangle';
    const styleObject = {
      ...getShapeStyle(styleKey),
      fontColor: '#1a1f36',
      fontSize: 12,
    };

    const sourceGeo = current.sourceCell.getGeometry();
    const targetGeo = cell.getGeometry();
    const startPoint = { x: sourceGeo.x + sourceGeo.width / 2, y: sourceGeo.y + sourceGeo.height / 2 };
    const endPoint = { x: targetGeo.x + targetGeo.width / 2, y: targetGeo.y + targetGeo.height / 2 };

    const edge = graph.insertEdge(null, null, '', current.sourceCell, cell, styleObject);
    const geometry = new Geometry(0, 0, 0, 0);
    geometry.setTerminalPoint(new Point(startPoint.x, startPoint.y), true);
    geometry.setTerminalPoint(new Point(endPoint.x, endPoint.y), false);
    graph.getDataModel().setGeometry(edge, geometry);
    tagShapeRole(edge, current.shapeId);

    // FDD hierarchy link (a plain Connector between two Function boxes,
    // not Control/Mechanism/Interface — those keep their normal straight
    // line since they mean something specific, not "parent of"): route it
    // as an org-chart elbow — down out of the parent's bottom, across,
    // into the child's top — instead of the default straight diagonal.
    // FDD has no connector of its own for a hierarchy link (see
    // isAttachmentEdge in validateFDD), so this is the only place such an
    // edge gets created; fixed top/bottom exit points are what make it
    // read as a tree branch rather than an arbitrary elbow.
    if (
      current.shapeId !== 'control' && current.shapeId !== 'mechanism' && current.shapeId !== 'fdd-interface' &&
      getShapeRole(current.sourceCell) === 'function' && getShapeRole(cell) === 'function'
    ) {
      const { exitX, exitY, entryX, entryY } = computeFddEntryPoint(sourceGeo, targetGeo);
      edge.setStyle({
        ...styleObject,
        edgeStyle: 'orthogonalEdgeStyle',
        exitX, exitY, exitPerimeter: false,
        entryX, entryY, entryPerimeter: false,
        rounded: false,
      });
    }

    // Flowchart's own connector (Flow Line): route it in right angles too,
    // the standard convention for a flowchart (straight diagonal lines
    // across a multi-branch flow read as clutter, especially once a loop
    // crosses back over other steps). Unlike the FDD case above, there's no
    // "stacked list vs. row" distinction here, and no fixed exit/entry
    // point — floating perimeter connections plus orthogonalEdgeStyle is
    // enough to get a clean step route between whichever two points on the
    // shapes are actually closest.
    if (current.shapeId === 'flow-line') {
      edge.setStyle({
        ...styleObject,
        edgeStyle: 'orthogonalEdgeStyle',
        rounded: false,
      });
    }

    // Synchronous, not just the state setter — graph.setSelectionCell below
    // fires the graph's own selection-change event immediately (same call
    // stack), re-entering this handler before React would otherwise have
    // applied the update. pendingConnectorRef.current is already null by
    // then, so that re-entrant call's guard above correctly stops it
    // instead of mistaking the edge just created for a new tap-to-connect
    // target (see updatePendingConnector's own comment for the failure
    // mode this prevents).
    updatePendingConnector(null);
    graph.setSelectionCell(edge);
    setTimeout(focusGraph, 50);
  };

  // Detects a diagram's real type from what's actually drawn on it, instead
  // of trusting a manually-set or possibly-stale stored field. Tallies each
  // vertex/edge's shape role (getShapeRole — the same session-tag-or-
  // persisted-style lookup the validators themselves already use, so this
  // stays consistent with how a shape's identity is resolved everywhere
  // else) against the category it belongs to (getCategoryForShapeId), and
  // returns whichever category has the most matches. 'Standard' shapes
  // (plain rectangles, ellipses, etc. — used across every diagram type) are
  // deliberately excluded from the tally so a Schematic diagram that
  // happens to include a couple of generic label boxes doesn't get diluted
  // toward "no clear type"; only diagram-specific shapes count. Returns null
  // when nothing type-specific is on the canvas yet (a brand-new diagram, or
  // one built entirely from Standard shapes) — callers should leave the
  // current type alone in that case rather than clearing it.
  const detectDiagramTypeFromContent = useCallback((graph: any): string | null => {
    const parent = graph.getDefaultParent();
    const cells = [...graph.getChildVertices(parent), ...graph.getChildEdges(parent)];
    const counts: Record<string, number> = {};
    for (const cell of cells) {
      const shapeId = getShapeRole(cell);
      if (!shapeId) continue;
      const category = getCategoryForShapeId(shapeId);
      if (!category || category === 'Standard') continue;
      counts[category] = (counts[category] || 0) + 1;
    }
    let bestCategory: string | null = null;
    let bestCount = 0;
    for (const [category, count] of Object.entries(counts)) {
      if (count > bestCount) {
        bestCount = count;
        bestCategory = category;
      }
    }
    return bestCategory;
  }, []);

  const handleAddShape = (shapeId: string) => {
    if (!graphInstance) return;

    // Connector/line shapes (other than Sequence Diagram messages, which
    // have their own lifeline-aware placement below) skip viewport-center
    // guessing entirely — the next two shapes the user taps become its
    // source/target directly. That guessing was unreliable whenever the two
    // shapes weren't positioned almost exactly where the center-placed
    // connector's default endpoints happened to reach, which is the only
    // way to place a connector at all on mobile (no drag-and-drop there).
    // See handleCanvasSelectionChange for the tap-picking half of this.
    if (CONNECTOR_SHAPE_IDS.has(shapeId) && !SEQUENCE_MESSAGE_SHAPE_IDS.has(shapeId)) {
      graphInstance.clearSelection();
      updatePendingConnector({ shapeId, sourceCell: null });
      return;
    }

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

      // Use the shape's own default width/height (constants/shapes.ts)
      // instead of a fixed 120x60 for every shape — otherwise an oval,
      // actor, or ERD attribute all land as the same generic box instead of
      // their intended proportions.
      const shapeDef = getShapeDefinitionById(shapeId);
      const w = shapeDef?.width ?? 120;
      const h = shapeDef?.height ?? 60;

      const x = Math.round((centerX - w / 2) / 10) * 10;
      const y = Math.round((centerY - h / 2) / 10) * 10;

      const styleKey = IGRAPH_ID_STYLE_MAP[shapeId] ?? 'igraph.rectangle';

      // Class Diagram's "Class" shape needs a container + 3 independently
      // editable compartments, not a single vertex — see insertUmlClassCell.
      let cell: any;
      if (shapeId === 'class-box') {
        cell = insertUmlClassCell(graph, x, y, w, h);
      } else if (shapeId === 'dfd-data-store' || shapeId === 'dfd-data-store-gs') {
        cell = insertDfdDataStoreCell(graph, x, y, w, h, shapeId === 'dfd-data-store-gs' ? 'gs' : 'yourdon');
      } else if (CONNECTOR_SHAPE_IDS.has(shapeId)) {
        // Only Sequence Diagram message arrows still reach here — every
        // other connector/line shape is handled by the tap-to-connect flow
        // (the early return for CONNECTOR_SHAPE_IDS at the top of this
        // function). A message arrow's far end should reach whichever
        // lifeline/activation is actually there, however far apart they
        // really are — not the arrow's own arbitrary default width. See
        // findSequenceMessageEndpoints in DiagramCanvas.tsx.
        const styleObject = {
          ...getShapeStyle(styleKey),
          fontColor: '#1a1f36',
          fontSize: 12,
        };

        const dropY = y + h / 2;
        // x above is this shape's top-left corner (centerX - w/2, see
        // above), not its center — findSequenceMessageEndpoints needs the
        // center to correctly decide which side of it counts as "source"
        // vs "target". Passing the raw left edge biased the search a full
        // half-width too far left, which for a shape this narrow (Sequence
        // messages default to 80px) was often enough to miss a target
        // sitting just to the right entirely.
        const found = findSequenceMessageEndpoints(graph, x + w / 2, dropY);
        const sourceCell = found.source;
        const targetCell = found.target;
        const sourceGeo = sourceCell?.getGeometry();
        const targetGeo = targetCell?.getGeometry();
        const startPoint = sourceGeo ? { x: sourceGeo.x + sourceGeo.width, y: dropY } : { x, y: dropY };
        const endPoint = targetGeo ? { x: targetGeo.x, y: dropY } : { x: x + w, y: dropY };
        Object.assign(styleObject, sequenceMessageConnectionStyle(sourceCell, targetCell, dropY));

        cell = graph.insertEdge(null, null, '', sourceCell, targetCell, styleObject);
        const geometry = new Geometry(0, 0, 0, 0);
        geometry.setTerminalPoint(new Point(startPoint.x, startPoint.y), true);
        geometry.setTerminalPoint(new Point(endPoint.x, endPoint.y), false);
        graph.getDataModel().setGeometry(cell, geometry);
      } else {
        // getShapeStyle carries each shape's real default fill (e.g. solid
        // black arrowheads/markers, FDD category colors) instead of forcing
        // every shape to a white fill regardless of what it's supposed to be.
        // Alignment defaults come first so a shape with its own label-
        // position override (e.g. igraph.umlLifeline's verticalAlign:
        // 'top', keeping the name inside its header box instead of centered
        // on the whole tall shape) wins instead of being clobbered here.
        const styleObject = {
          align: 'center' as const,
          verticalAlign: 'middle' as const,
          whiteSpace: 'wrap',
          ...getShapeStyle(styleKey),
          fontColor: '#1a1f36',
          fontSize: 12,
        };

        cell = graph.insertVertex(
          null, null, shapeDef?.defaultLabel ?? '',
          x, y,
          w, h,
          styleObject,
        );
      }
      tagShapeRole(cell, shapeId);

      // Re-detects the diagram's type from actual content on every shape
      // add — see detectDiagramTypeFromContent's own comment. This is what
      // gives a brand-new diagram a type at all (there's no other picker for
      // that), and keeps an existing diagram's type in step as it's built,
      // without the old bug where merely *browsing* the shapes panel (not
      // actually placing anything) could reclassify an already-built
      // diagram — dropping a shape is a real, deliberate content change,
      // which majority-vote detection can safely react to.
      const detectedType = detectDiagramTypeFromContent(graph);
      if (detectedType) {
        setActiveUmlType(detectedType);
      }

      // A Fork/Join bar needs its standard set of real, draggable stub
      // arrows wired up here too — this tap-to-add flow is a completely
      // separate insertion path from DiagramCanvas.tsx's handleDrop (no
      // drag-and-drop on mobile), so it never went through
      // insertForkJoinStubs on its own. Without this, a Fork/Join dropped
      // on mobile was just a bare bar with no arrows at all.
      if (shapeId === 'act-fork' || shapeId === 'act-join') {
        insertForkJoinStubs(graph, cell, shapeId);
      }

      graph.setSelectionCell(cell);
      console.log(`✅ Added "${shapeId}" as "${styleKey}" at (${x}, ${y})`);
      resolveTourWait('create-shape-drop');

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

  // Shared scratch canvas for measuring text width during raster export's
  // manual word-wrap below — cheaper than creating one per label.
  let wrapMeasureCanvas: HTMLCanvasElement | null = null;

  // On-canvas word wrap is just CSS (`word-wrap: break-word`) on the live
  // foreignObject <div> — see TextShape.updateSize in maxGraph. The raster
  // export path below disables foreignObject entirely (Safari/iOS taints the
  // canvas otherwise — see the forRaster comment further down), which means
  // labels fall back to plain SVG <text>. Plain SVG text has no wrapping of
  // its own, so a label that used to wrap onto 3 lines on-screen would
  // render as one long unbroken line spilling out of its shape in the PNG/
  // JPG/PDF export. This greedily breaks `text` into '\n'-joined lines that
  // fit `maxWidth` at the given font — SvgCanvas2D.plainText already knows
  // how to lay out '\n'-separated lines (it's how multi-line labels render
  // at all in the non-HTML path), it just never received any.
  function wrapPlainTextToWidth(text: string, maxWidth: number, fontSize: number, fontFamily: string): string {
    if (maxWidth <= 0) return text;
    if (!wrapMeasureCanvas) wrapMeasureCanvas = document.createElement('canvas');
    const ctx = wrapMeasureCanvas.getContext('2d');
    if (!ctx) return text;
    ctx.font = `${fontSize}px ${fontFamily || 'Helvetica'}`;

    return text
      .split('\n')
      .map((paragraph) => {
        const words = paragraph.split(' ');
        const lines: string[] = [];
        let current = '';
        for (const word of words) {
          const trial = current ? `${current} ${word}` : word;
          if (current && ctx.measureText(trial).width > maxWidth) {
            lines.push(current);
            current = word;
          } else {
            current = trial;
          }
        }
        if (current) lines.push(current);
        return lines.join('\n');
      })
      .join('\n');
  }

  // Only used for raster export (forRaster) — see wrapPlainTextToWidth above
  // for why plain SVG text otherwise overflows instead of wrapping.
  class WrappingSvgCanvas2D extends SvgCanvas2D {
    plainText(
      x: number, y: number, w: number, h: number, str: string,
      align: any, valign: any, wrap: boolean, overflow: any, clip: boolean,
      rotation?: number, dir?: string,
    ) {
      if (wrap && w > 0 && typeof str === 'string' && !str.includes('\n')) {
        str = wrapPlainTextToWidth(str, w, (this as any).state.fontSize, (this as any).state.fontFamily);
      }
      // @ts-ignore — base signature matches at runtime, just not exactly typed
      super.plainText(x, y, w, h, str, align, valign, wrap, overflow, clip, rotation, dir);
    }
  }

  // Saved-diagram card thumbnails pass this as buildDiagramSvgElement's
  // minSize so a diagram with only one or two small shapes doesn't get
  // snug-cropped right up to them (which made it fill/overflow the card,
  // looking "zoomed in" compared to the same diagram's spacious look on the
  // real canvas). Export/print/SVG-download deliberately don't use this —
  // those want the tight crop.
  const DIAGRAM_THUMBNAIL_MIN_SIZE = { width: 900, height: 600 };

  const buildDiagramSvgElement = (
    graph: any,
    options?: {
      forRaster?: boolean;
      minSize?: { width: number; height: number };
      gridBackground?: boolean;
    }
  ): SVGSVGElement => {
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
    let viewBoxX = bounds.x - rawPadding;
    let viewBoxY = bounds.y - rawPadding;
    let viewBoxWidth = bounds.width + rawPadding * 2;
    let viewBoxHeight = bounds.height + rawPadding * 2;

    // Thumbnail previews (see minSize callers) shouldn't snug-crop right up
    // to the shapes — a single small rectangle would then fill the entire
    // card, looking "zoomed in" compared to how spacious it actually looks
    // on the real canvas. Padding the viewBox out to at least minSize (in
    // the same raw/unscaled units, centered on the real content) keeps small
    // diagrams looking appropriately small, while a diagram already bigger
    // than minSize is left as the tight crop above.
    if (options?.minSize) {
      const rawMinWidth = options.minSize.width * viewScale;
      const rawMinHeight = options.minSize.height * viewScale;
      const targetAspect = rawMinWidth / rawMinHeight;

      let finalWidth = Math.max(viewBoxWidth, rawMinWidth);
      let finalHeight = Math.max(viewBoxHeight, rawMinHeight);

      // A diagram that's mostly one long thin stroke (e.g. a tall freehand
      // line) has a bounding box far more extreme than minSize's aspect —
      // only clamping each side to a minimum independently still left the
      // box arbitrarily tall/narrow in that case. That's what let such a
      // thumbnail render far taller than the fixed-height card and spill out
      // underneath it despite resizeMode="contain" — contain can't be
      // "wrong", but it also can't shrink an extreme aspect ratio down to
      // something that reads as a normal thumbnail. Growing the shorter side
      // to match minSize's own aspect keeps every thumbnail's proportions
      // sane regardless of the diagram's actual shape.
      const finalAspect = finalWidth / finalHeight;
      if (finalAspect > targetAspect) {
        finalHeight = finalWidth / targetAspect;
      } else if (finalAspect < targetAspect) {
        finalWidth = finalHeight * targetAspect;
      }

      viewBoxX -= (finalWidth - viewBoxWidth) / 2;
      viewBoxY -= (finalHeight - viewBoxHeight) / 2;
      viewBoxWidth = finalWidth;
      viewBoxHeight = finalHeight;
    }

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

    if (options?.gridBackground) {
      // Thumbnails only: match the live editor's own canvas background (see
      // paintGridOnCanvas/CANVAS_BG/MINOR_COLOR/MAJOR_COLOR in
      // DiagramCanvas.tsx) instead of plain white, so a saved-diagram card
      // reads as a snapshot of the canvas rather than a shape on blank paper.
      // Real exports/prints intentionally keep the plain white background.
      background.setAttribute('fill', '#f8faff');
      const defs = svgDoc.createElementNS('http://www.w3.org/2000/svg', 'defs');
      const pattern = svgDoc.createElementNS('http://www.w3.org/2000/svg', 'pattern');
      const patternId = 'thumbnail-grid';
      const minorSize = 10 * viewScale; // 10 mirrors GRID_SIZE in DiagramCanvas.tsx
      const majorSize = minorSize * 5; // mirrors MAJOR_EVERY in DiagramCanvas.tsx
      pattern.setAttribute('id', patternId);
      pattern.setAttribute('width', String(majorSize));
      pattern.setAttribute('height', String(majorSize));
      pattern.setAttribute('patternUnits', 'userSpaceOnUse');
      pattern.setAttribute('x', String(viewBoxX));
      pattern.setAttribute('y', String(viewBoxY));
      for (let i = 0; i < 5; i++) {
        const offset = i * minorSize;
        const isMajor = i === 0;
        const stroke = isMajor ? '#bec8d9' : '#dde3ed';
        const strokeWidth = isMajor ? '1' : '0.5';

        const vLine = svgDoc.createElementNS('http://www.w3.org/2000/svg', 'line');
        vLine.setAttribute('x1', String(offset));
        vLine.setAttribute('y1', '0');
        vLine.setAttribute('x2', String(offset));
        vLine.setAttribute('y2', String(majorSize));
        vLine.setAttribute('stroke', stroke);
        vLine.setAttribute('stroke-width', strokeWidth);
        pattern.appendChild(vLine);

        const hLine = svgDoc.createElementNS('http://www.w3.org/2000/svg', 'line');
        hLine.setAttribute('x1', '0');
        hLine.setAttribute('y1', String(offset));
        hLine.setAttribute('x2', String(majorSize));
        hLine.setAttribute('y2', String(offset));
        hLine.setAttribute('stroke', stroke);
        hLine.setAttribute('stroke-width', strokeWidth);
        pattern.appendChild(hLine);
      }
      defs.appendChild(pattern);
      root.appendChild(defs);

      const gridOverlay = svgDoc.createElementNS('http://www.w3.org/2000/svg', 'rect');
      gridOverlay.setAttribute('x', String(viewBoxX));
      gridOverlay.setAttribute('y', String(viewBoxY));
      gridOverlay.setAttribute('width', String(viewBoxWidth));
      gridOverlay.setAttribute('height', String(viewBoxHeight));
      gridOverlay.setAttribute('fill', `url(#${patternId})`);
      root.appendChild(background);
      root.appendChild(gridOverlay);
    } else {
      background.setAttribute('fill', '#ffffff');
      root.appendChild(background);
    }

    // Safari/WebKit (every browser on iOS, not just Safari itself) treats an
    // <img> loaded from an SVG containing <foreignObject> — which is how
    // maxGraph renders word-wrapped text labels by default — as tainting any
    // <canvas> it's drawn onto. canvas.toDataURL()/toBlob() then throws or
    // silently returns null. That's why PNG/JPG/PDF (all rasterized through a
    // canvas) failed on mobile while the direct SVG file download (no canvas
    // involved) kept working. Falling back to plain SVG <text> for the
    // raster path avoids foreignObject entirely, which is canvas-safe
    // everywhere — the SVG file download keeps foreignObject for nicer,
    // properly word-wrapped text since it never touches a canvas. That
    // fallback loses wrapping outright (see wrapPlainTextToWidth above), so
    // raster export uses the subclass that puts it back manually.
    const svgCanvas = options?.forRaster ? new WrappingSvgCanvas2D(root, true) : new SvgCanvas2D(root, true);
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

  const renderDiagramToCanvas = (
    graph: any,
    scale: number = 2,
    options?: { minSize?: { width: number; height: number }; gridBackground?: boolean; maxDimension?: number }
  ): Promise<HTMLCanvasElement> => {
    return new Promise((resolve, reject) => {
      try {
        const svg = buildDiagramSvgElement(graph, {
          forRaster: true,
          minSize: options?.minSize,
          gridBackground: options?.gridBackground,
        });
        const width = Number(svg.getAttribute('width')) || 800;
        const height = Number(svg.getAttribute('height')) || 600;

        // Mobile GPUs commonly cap canvas dimensions well below desktop
        // (often ~4096px per side). Exceeding that makes toBlob/toDataURL
        // silently return null/blank instead of throwing, which is why large
        // diagrams could fail to export as PNG/JPG/PDF only on phones.
        const MAX_CANVAS_DIMENSION = 4096;
        // maxDimension (thumbnail callers only) targets a fixed output size
        // regardless of the diagram's own size — without it, `scale` alone
        // means a diagram twice as big produces a thumbnail twice as big,
        // even though it's still rendered into the exact same ~150px-tall
        // card. A large diagram scaled by 0.5 could still be a multi-
        // megapixel PNG stored in Firestore and shipped on every list fetch
        // for something the user only ever sees at thumbnail size.
        const maxDimensionScale = options?.maxDimension
          ? Math.min(options.maxDimension / width, options.maxDimension / height)
          : Infinity;
        const effectiveScale = Math.min(
          scale,
          maxDimensionScale,
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

  // Real OS-level notification (shows in the phone's notification shade,
  // same as any native app) on top of the in-app toast above — only fires
  // if permission was already granted; requests it lazily on the first
  // successful export rather than on page load, since a permission prompt
  // fired unprompted on load is exactly the pattern browsers auto-suppress
  // ("this site has been blocked from asking again"). Native platforms and
  // browsers without Notification support (older iOS Safari, etc.) just
  // silently skip this — it's a nice-to-have, never something the actual
  // download should depend on or be blocked by.
  const notifyExportComplete = async (message: string) => {
    if (Platform.OS !== 'web' || typeof window === 'undefined' || !('Notification' in window)) return;
    try {
      let permission = Notification.permission;
      if (permission === 'default') {
        permission = await Notification.requestPermission();
      }
      if (permission === 'granted') {
        new Notification('iGraph IT', { body: message, icon: '/icon-192.png' });
      }
    } catch {
      // Best-effort only — never surface this as an error to the user.
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
    if (isHydratingRef.current || !diagramXmlRef.current) {
      console.log('⏭️ skipping save — hydrating or empty');
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

    // Check if user is authenticated
    console.log('🔑 Checking authentication...');
    const signedIn = await authService.hasActiveSession();
    console.log('🔑 Session:', signedIn ? 'Active' : 'None');

    if (!signedIn) {
      console.log('❌ Not signed in');
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
        const canvas = await renderDiagramToCanvas(graphInstance, 0.5, {
          minSize: DIAGRAM_THUMBNAIL_MIN_SIZE,
          gridBackground: true,
          // Caps the actual output resolution regardless of how big the
          // diagram itself is — this image is only ever shown at ~150px
          // tall in a list card (see cardPreview in savedDiagrams.tsx) and
          // is what gets stored in Firestore and re-sent on every diagram
          // list fetch, so a large diagram no longer means a proportionally
          // large (and proportionally expensive) thumbnail.
          maxDimension: 480,
        });
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
        // Pages this client deleted locally since its last successful save
        // — tells the backend's merge to actually drop them server-side
        // rather than treating their absence from `pages` above as "this
        // client just hasn't loaded that page" and keeping it (see
        // diagramController.js's saveDiagram merge).
        deletedPageIds: Array.from(deletedPageIdsRef.current),
        activePageId: activePageId
      };

      const API_URL = API_BASE_URL;
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
      let response = await authService.authFetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      console.log('📥 Response status:', response.status);

      // A 404 here means payload.id pointed at a diagram that no longer
      // exists server-side — e.g. it was deleted from another device/tab,
      // but this device's local draft cache still had the old id cached as
      // "the diagram to keep updating". Don't lose the user's work over a
      // dangling reference: retry once as a brand-new diagram instead of
      // surfacing a confusing "Diagram not found" error.
      //
      // Skipped while other people currently have this same diagram open
      // (collabViewersRef, driven by socket presence): silently forking
      // onto a new id here would save this user's edits to a document
      // nobody else is in the room for, while everyone else keeps editing
      // the original — their next save then has no idea this fork ever
      // happened. That's a second, worse version of the "diagram
      // disappeared" bug, self-inflicted by the save path instead of the
      // live-sync path. A genuinely deleted-while-collaborating diagram is
      // rare enough (and serious enough — the room itself is now editing
      // something that doesn't exist) that surfacing it plainly is better
      // than quietly working around it.
      if (response.status === 404 && payload.id && collabViewersRef.current.length === 0) {
        console.warn('⚠️ Referenced diagram id not found on server, retrying as a new diagram');
        setMyAccessLevel('owner');
        setHasPendingAccessRequest(false);
        setCurrentDiagramId(null);
        loadedDiagramIdRef.current = null;
        const { id: _staleId, ...retryPayload } = payload;
        response = await authService.authFetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(retryPayload)
        });
        console.log('📥 Retry response status:', response.status);
      } else if (response.status === 404 && payload.id) {
        notify('Diagram Not Found', 'This diagram no longer exists on the server, but other collaborators are still shown as present in it. Please refresh before continuing to avoid losing work.');
        return;
      }

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
        deletedPageIdsRef.current.clear();
        const savedId: string | undefined = result.data?.diagram?.id;
        if (savedId) {
          setCurrentDiagramId(savedId);
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

  // ─── Quiet background sync (autosave indicator) ──────────────────────────
  // Same save endpoint as handleSaveDiagram above, but this one runs on its
  // own — backgrounding the tab, leaving the editor — not from a user
  // click, so it must never interrupt them with a dialog or a sign-in
  // redirect. flushLocalAutosave already keeps their work safe on this
  // device regardless of whether this succeeds; this only decides whether
  // the indicator can turn green (server-confirmed) or stays at "saved on
  // this device" (offline, signed out, or nothing new to send).
  // Sends id: undefined when nothing's been saved yet, same as handleSaveDiagram
  // above — the backend creates a new record and the returned id is captured
  // below, so a diagram never worked on with the explicit Save button still
  // makes it to the server and survives sign-out/sign-in on another device.
  //
  // `urgent` (set by pendingAutosaveFlushRef and the visibilitychange-hidden
  // handler below, both firing right as the screen/tab is disappearing) marks
  // the request `keepalive: true`, which tells the browser to let it finish
  // even after the page is hidden or torn down — a plain fetch() has no such
  // guarantee, and mobile browsers in particular can suspend a backgrounded
  // tab's JS fast enough to kill an in-flight save before it reaches the
  // server. That's what let shapes added right before switching away/locking
  // the phone show "Saved" locally while never actually reaching the
  // database. Also skips the preview-image render on this path — keepalive
  // requests share a small (~64KB) total body budget across a browser, and
  // getting the real diagram content out the door matters far more here than
  // a fresh thumbnail (the next normal sync regenerates it anyway).
  const attemptBackgroundSync = useCallback(async (urgent: boolean = false) => {
    if (!graphInstance) return;
    if (isSavingRef.current) return; // a manual save is already in flight
    if (isBackgroundSyncingRef.current) return; // a previous background sync hasn't resolved yet
    if (!hasUnsyncedServerChangesRef.current) return; // nothing new since the last confirmed sync

    isBackgroundSyncingRef.current = true;
    try {
      const signedIn = await authService.hasActiveSession();
      if (!signedIn) return; // not signed in — the local copy is all there is to offer

      const xml = diagramXmlRef.current;
      const isEmptyXml = !xml ||
        xml.trim().length === 0 ||
        xml === '<mxGraphModel/>' ||
        xml === '<root/>' ||
        xml === '<mxGraphModel><root><mxCell id="0"/><mxCell id="1" parent="0"/></mxGraphModel>';
      if (isEmptyXml) return;

      setSyncStatus('syncing');
      try {
        let imageDataUrl = '';
        if (!urgent) {
          try {
            const canvas = await renderDiagramToCanvas(graphInstance, 0.5, {
              minSize: DIAGRAM_THUMBNAIL_MIN_SIZE,
              gridBackground: true,
              // Caps the actual output resolution regardless of how big the
              // diagram itself is — this image is only ever shown at ~150px
              // tall in a list card (see cardPreview in savedDiagrams.tsx) and
              // is what gets stored in Firestore and re-sent on every diagram
              // list fetch, so a large diagram no longer means a proportionally
              // large (and proportionally expensive) thumbnail.
              maxDimension: 480,
            });
            imageDataUrl = canvas.toDataURL('image/png');
          } catch {
            // Preview is optional — a failed render shouldn't block the sync.
          }
        }

        const payload = {
          id: currentDiagramIdRef.current || undefined,
          name: diagramNameRef.current || 'Untitled Diagram',
          xml,
          previewImage: imageDataUrl,
          type: activeUmlType || 'General',
          pages: pages.map(p => ({
            id: p.id,
            name: p.name,
            xml: pageXmlCache.current.get(p.id) || ''
          })),
          deletedPageIds: Array.from(deletedPageIdsRef.current),
          activePageId,
        };

        const API_URL = API_BASE_URL;
        const response = await authService.authFetch(`${API_URL}/api/diagrams/save`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          ...(urgent ? { keepalive: true } : {}),
        });
        if (!response.ok) throw new Error(`Server error: ${response.status}`);

        const result = await response.json();
        if (result.success) {
          deletedPageIdsRef.current.clear();
          const savedId: string | undefined = result.data?.diagram?.id;
          if (savedId) {
            setCurrentDiagramId(savedId);
            loadedDiagramIdRef.current = savedId;
            authService.getCurrentUserId().then((uid) => {
              if (uid) persistDraft(uid, savedId);
            });
          }
          hasUnsyncedServerChangesRef.current = false;
          setSyncStatus('synced');
        } else {
          setSyncStatus('offline');
        }
      } catch (e) {
        console.warn('Background sync to server failed (local copy is still safe):', e);
        setSyncStatus('offline');
      }
    } finally {
      isBackgroundSyncingRef.current = false;
    }
  }, [graphInstance, activeUmlType, pages, activePageId]);

  // Read by pendingAutosaveFlushRef and the visibility-change handler, both
  // of which are set up once (empty/near-empty deps) — this keeps them
  // calling whichever version of attemptBackgroundSync actually closes over
  // the current graphInstance/pages/etc., instead of a stale first render.
  const attemptBackgroundSyncRef = useRef(attemptBackgroundSync);
  useEffect(() => {
    attemptBackgroundSyncRef.current = attemptBackgroundSync;
  }, [attemptBackgroundSync]);

  // ─── Start a new, blank diagram ──────────────────────────────────────────
  // This screen deliberately never unmounts across tab switches (see
  // Navbar's create-only router.navigate) so in-progress work survives
  // accidentally tabbing away. But that also means nothing ever resets
  // currentDiagramIdRef on its own — every Save keeps updating whichever
  // diagram was last loaded/saved in this instance, with no way to detach
  // from it. This gives the user an explicit way to do that.
  const startNewDiagram = useCallback(() => {
    setMyAccessLevel('owner');
    setHasPendingAccessRequest(false);
    setCurrentDiagramId(null);
    loadedDiagramIdRef.current = null;
    pageXmlCache.current.clear();

    const freshPage = { id: generatePageId(), name: 'Page 1', xml: '' };
    setPages([freshPage]);
    setActivePageId(freshPage.id);
    setDiagramName('Blank diagram');
    diagramNameRef.current = 'Blank diagram';
    setDiagramXml('');
    diagramXmlRef.current = '';
    graphInstance?.getDataModel()?.clear();

    authService.getCurrentUserId().then((uid) => {
      if (uid) {
        AsyncStorage.setItem(activePointerKey(uid), JSON.stringify({ diagramId: null })).catch((e) => {
          console.warn('Could not reset active diagram pointer:', e);
        });
      }
    });
  }, [graphInstance]);

  const handleNewDiagram = useCallback(() => {
    const isEmpty = !diagramXmlRef.current || diagramXmlRef.current.trim().length === 0;
    if (isEmpty) {
      startNewDiagram();
      return;
    }
    confirmDialog(
      'Start New Diagram',
      'This clears the current diagram from this editor. Save it first if you want to keep it — otherwise unsaved changes will be lost.',
      'Start New',
      startNewDiagram
    );
  }, [startNewDiagram]);

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

    // Same validation rules that already drive the on-canvas badges and the
    // issues panel (see utils/flowchartRules.ts) — an exported file is a
    // snapshot someone else will read without the editor's own issues list
    // next to it, so a diagram with an unresolved error OR warning (just
    // not an info-level nudge, which is a style suggestion rather than a
    // correctness problem) shouldn't be exportable until it's addressed.
    const blockingIssues = (diagramCanvasRef.current?.getIssues() ?? []).filter(
      (issue) => issue.severity === 'error' || issue.severity === 'warning'
    );
    if (blockingIssues.length > 0) {
      const hasErrors = blockingIssues.some((issue) => issue.severity === 'error');
      const hasWarnings = blockingIssues.some((issue) => issue.severity === 'warning');
      const kind = hasErrors && hasWarnings ? 'errors and warnings' : hasErrors ? 'errors' : 'warnings';
      notify(
        `Fix ${kind} before exporting`,
        blockingIssues.length === 1
          ? blockingIssues[0].message
          : `This diagram has ${blockingIssues.length} issues that need fixing first: ${blockingIssues.map((i) => i.message).join(' ')}`
      );
      return;
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
        notifyExportComplete(`"${name}.svg" downloaded successfully.`);
        setIsDownloading(false);
        return;
      }

      const canvas = await renderDiagramToCanvas(graphInstance, format === 'jpg' ? 2 : 3);

      if (format === 'pdf') {
        // A real PDF file, generated client-side — no print dialog involved.
        // Page size matches the rendered canvas exactly (unit 'px' + an
        // explicit [width, height] format) so the diagram fills the one
        // page at full resolution instead of being scaled/cropped to fit a
        // fixed paper size.
        const pdf = new jsPDF({
          orientation: canvas.width >= canvas.height ? 'landscape' : 'portrait',
          unit: 'px',
          format: [canvas.width, canvas.height],
        });
        pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, canvas.width, canvas.height);
        downloadFile(pdf.output('blob'), `${name}.pdf`, 'application/pdf');
        notify('Success', 'PDF diagram downloaded successfully!');
        notifyExportComplete(`"${name}.pdf" downloaded successfully.`);
        setIsDownloading(false);
        return;
      }

      const mimeType = format === 'jpg' ? 'image/jpeg' : 'image/png';
      const extension = format === 'jpg' ? 'jpg' : 'png';

      canvas.toBlob((blob) => {
        if (blob) {
          downloadFile(blob, `${name}.${extension}`, mimeType);
          notify('Success', `${format.toUpperCase()} diagram downloaded successfully!`);
          notifyExportComplete(`"${name}.${extension}" downloaded successfully.`);
        } else {
          console.error('toBlob returned null', { width: canvas.width, height: canvas.height });
          notify('Error', 'Failed to generate image. The diagram may be too large to export from this device.');
        }
        setIsDownloading(false);
      }, mimeType, format === 'jpg' ? 0.92 : undefined);
    } catch (error) {
      console.error('Download error:', error);
      notify('Error', `Failed to download as ${format.toUpperCase()}: ${error instanceof Error ? error.message : 'please try again.'}`);
      setIsDownloading(false);
    }
  };

  // ─── Toolbar actions ────────────────────────────────────────────────────────

  const handleShare = useCallback(() => {
    if (!currentDiagramIdRef.current) {
      notify('Save first', 'Save this diagram before sharing it.');
      return;
    }
    setShowShareModal(true);
  }, []);

  const handlePrint = useCallback(() => {
    if (!graphInstance) {
      Alert.alert('No Diagram', 'Please create a diagram first.');
      return;
    }

    setIsPreparingPrint(true);

    renderDiagramToCanvas(graphInstance, 2)
      .then((canvas) => {
        const dataUrl = canvas.toDataURL('image/png');
        printCanvasSizeRef.current = { width: canvas.width, height: canvas.height };
        setPrintPreviewUrl(dataUrl);
        setIsPreparingPrint(false);
        setShowPrintModal(true);
      })
      .catch((error) => {
        console.error('Print error:', error);
        Alert.alert('Error', 'Failed to prepare diagram for printing.');
        setIsPreparingPrint(false);
      });
  }, [graphInstance]);

  // Ctrl+P / Cmd+P opens this diagram's own print screen instead of the
  // browser's native "print this webpage" dialog, which would otherwise just
  // screenshot whatever chrome/toolbars happen to be on screen.
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        handlePrint();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handlePrint]);

  // Hands off to the browser's native print dialog — the OS's own UI, not
  // anything this page renders — so its printer list is already accurate
  // and up to date with whatever's actually installed on the machine.
  //
  // This used to build a PDF (the same jsPDF path Download > PDF still uses)
  // and open that blob in a new tab, relying on a delayed printWindow.print()
  // to fire the system dialog once it loaded. On Android Chrome that blob
  // lands in Chrome's own built-in PDF viewer — a separate, semi-native
  // surface where a script-triggered .print() call from the opener routinely
  // does nothing, so the user just saw the PDF sitting there with no print
  // sheet. Handing the image off to app/print.tsx instead — a real page that
  // calls window.print() on itself from its own load event — is what
  // actually turns into the OS print dialog on every mobile browser that's
  // been tried. (Injecting print content into *this* live page and hiding
  // everything else — inline display:none, an iframe's own
  // contentWindow.print(), a full-viewport overlay, a scoped `@media print`
  // rule — was tried before that and failed for a different reason: Android
  // Chrome's print pipeline snapshots the DOM as it looked *before* those
  // late changes took effect. A dedicated route sidesteps that too, since it
  // loads already in its final, print-ready state.)
  const executePrint = () => {
    if (!printPreviewUrl) return;
    const size = printCanvasSizeRef.current;
    if (!size) return;

    // Close the modal before touching anything else — lets React's own
    // unmount of this modal's portal happen on its own, instead of
    // interleaving with the window.open() below.
    closePrintModal();

    const payload: DiagramPrintPayload = {
      image: printPreviewUrl,
      width: size.width,
      height: size.height,
      name: printName,
      title: printTitle,
    };

    // window.open() clones sessionStorage into the new tab, so this is
    // readable from app/print.tsx as soon as it mounts — see that file's own
    // comment on PRINT_PAYLOAD_KEY. A data-URL PNG is easily too big for a
    // URL/query string, which rules out passing it as a route param instead.
    sessionStorage.setItem('igraphit:print-payload', JSON.stringify(payload));

    const printWindow = window.open('/print', '_blank');
    if (!printWindow) {
      Alert.alert('Error', 'Could not open the print preview. Please allow pop-ups for this site and try again.');
    }
  };

  const closePrintModal = () => {
    setShowPrintModal(false);
    setIsPrintEditOpen(false);
  };

  const PRINT_ZOOM_STEPS = [50, 75, 100, 125, 150, 200];

  const handlePrintZoomIn = useCallback(() => {
    setPrintZoom((z) => {
      const idx = PRINT_ZOOM_STEPS.findIndex((s) => s >= z);
      const nextIdx = idx === -1 ? PRINT_ZOOM_STEPS.length - 1 : Math.min(idx + 1, PRINT_ZOOM_STEPS.length - 1);
      return PRINT_ZOOM_STEPS[nextIdx];
    });
  }, []);

  const handlePrintZoomOut = useCallback(() => {
    setPrintZoom((z) => {
      const idx = PRINT_ZOOM_STEPS.findIndex((s) => s >= z);
      const prevIdx = idx === -1 ? 0 : Math.max(idx - 1, 0);
      return PRINT_ZOOM_STEPS[prevIdx];
    });
  }, []);

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
    if (showMobileProperties) setShowMobileProperties(false);
    if (showConnectorsPanel) setShowConnectorsPanel(false);
    if (showShapesPanel) {
      setTimeout(focusGraph, 100);
    }
  };

  // Text/Draw/Arrange each open the Properties sheet on a specific tab.
  // Tapping the one that's already active closes it again (standard toggle-
  // button behavior); tapping a different one jumps straight to its tab.
  const openMobileProperties = (tool: 'text' | 'draw' | 'arrange', tab: 'text' | 'style' | 'arrange') => {
    if (showMobileProperties && activeTool === tool) {
      setShowMobileProperties(false);
      setTimeout(focusGraph, 100);
      return;
    }
    setActiveTool(tool);
    setMobilePropertiesTab(tab);
    setShowMobileProperties(true);
    if (showShapesPanel) setShowShapesPanel(false);
    if (showConnectorsPanel) setShowConnectorsPanel(false);
  };

  // Opens the read-only Connectors sheet, same toggle/mutual-exclusion
  // behavior as the buttons above (tapping it again closes it).
  const toggleConnectorsPanel = () => {
    setShowConnectorsPanel(prev => !prev);
    if (activeTool !== 'connectors') setActiveTool('connectors');
    if (showMobileProperties) setShowMobileProperties(false);
    if (showShapesPanel) setShowShapesPanel(false);
    if (showConnectorsPanel) {
      setTimeout(focusGraph, 100);
    }
  };

  useEffect(() => {
    if (!showShapesPanel && isGraphReady) {
      setTimeout(focusGraph, 150);
    }
  }, [showShapesPanel, isGraphReady, focusGraph]);

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

        {presenceToast && <PresenceToastBanner toast={presenceToast} />}

        {/* ─── TOP BAR ─────────────────────────────────────────────────────── */}
        <View style={styles.mobileTopBar}>
          <View style={styles.mobileTopBarLeft}>
            <TouchableOpacity
              style={styles.mobileTopBarBtn}
              onPress={() => router.navigate('/(tabs)/home')}
              activeOpacity={0.7}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <ICONS.Close color="#4a5568" />
            </TouchableOpacity>
            <TouchableOpacity
              // @ts-ignore - nativeID renders as a DOM id on web (react-native-web); missing from TouchableOpacityProps' types
              nativeID="tour-create-new"
              style={styles.mobileTopBarBtn}
              onPress={handleNewDiagram}
              activeOpacity={0.7}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <ICONS.NewDiagram color="#4a5568" />
            </TouchableOpacity>
          </View>

          <TextInput
            nativeID="tour-create-title"
            style={styles.mobileTitle}
            value={diagramName}
            onChangeText={setDiagramName}
            placeholder="Diagram Name"
            placeholderTextColor="#94a3b8"
            numberOfLines={1}
            maxLength={50}
          />
          {myAccessLevel !== 'owner' && (
            <View style={styles.accessBadge}>
              <Text style={styles.accessBadgeText} numberOfLines={1}>{ACCESS_BADGE_LABEL[myAccessLevel]}</Text>
            </View>
          )}

          <View style={styles.mobileTopBarRight}>
            {/* ─── PRESENCE (who else has this diagram open) ─────────────────── */}
            {collabViewers.length > 0 && <PresenceStack viewers={collabViewers} size={24} />}

            {/* ─── SHARE BUTTON ────────────────────────────────────────────── */}
            {canShareDiagram && (
            <TouchableOpacity
              // @ts-ignore - nativeID renders as a DOM id on web (react-native-web); missing from TouchableOpacityProps' types
              nativeID="tour-create-share"
              style={[styles.mobileTopBarBtn, !isGraphReady && styles.mobileTopBarBtnDisabled]}
              onPress={handleShare}
              disabled={!isGraphReady}
              activeOpacity={0.7}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <ShareIcon color={isGraphReady ? '#4a5568' : '#cbd5e1'} />
            </TouchableOpacity>
            )}

            {/* ─── SAVE BUTTON ─────────────────────────────────────────────── */}
            {canEditDiagram && (
            <TouchableOpacity
              // @ts-ignore - nativeID renders as a DOM id on web (react-native-web); missing from TouchableOpacityProps' types
              nativeID="tour-create-save"
              style={[styles.mobileTopBarBtn, !isGraphReady && styles.mobileTopBarBtnDisabled]}
              onPress={handleSaveDiagram}
              disabled={!isGraphReady || isSaving}
              activeOpacity={0.7}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              {isSaving ? (
                <View style={styles.saveSpinner} />
              ) : (
                <SaveIcon color={isGraphReady ? '#10b981' : '#cbd5e1'} />
              )}
            </TouchableOpacity>
            )}

            <TouchableOpacity
              // @ts-ignore - nativeID renders as a DOM id on web (react-native-web); missing from TouchableOpacityProps' types
              nativeID="tour-create-more"
              style={styles.mobileTopBarBtn}
              onPress={() => setShowMoreMenu((v) => !v)}
              activeOpacity={0.7}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <ICONS.More color="#4a5568" />
            </TouchableOpacity>
          </View>
        </View>

        {/* ─── CANVAS WITH FLOATING UNDO/REDO ────────────────────────────── */}
        <View nativeID="tour-create-canvas" style={styles.mobileCanvasContainer}>
          <DiagramCanvas
            key="diagram-canvas"
            ref={diagramCanvasRef}
            onReady={handleGraphReady}
            onChange={handleGraphChange}
            onZoomChange={setZoomLevel}
            onSelectionChange={handleCanvasSelectionChange}
            umlType={activeUmlType}
            isMobile
          />


          {pendingConnector && (
            <View style={styles.connectHintBanner} pointerEvents="box-none">
              <View style={styles.connectHintPill}>
                <Text style={styles.connectHintText}>
                  {pendingConnector.sourceCell ? 'Tap the second shape' : 'Tap the first shape'}
                </Text>
                <TouchableOpacity
                  onPress={() => updatePendingConnector(null)}
                  style={styles.connectHintCancelBtn}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <CloseTabIcon color="#ffffff" />
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Floating Undo/Redo buttons — hidden while any bottom sheet
              (Shapes/Properties/Connectors) is open. Each sheet always
              animates to its full EXPANDED_HEIGHT as soon as it opens (see
              ShapesBottomPanel's visible-effect), and on a landscape phone
              that height can reach up into this container's top:12 position,
              so the two would otherwise overlap. */}
          {!(showShapesPanel || showMobileProperties || showConnectorsPanel) && (
          <View nativeID="tour-create-undo-redo" style={styles.floatingUndoRedoContainer}>
            <TouchableOpacity
              style={[styles.floatingUndoRedoBtn, !isGraphReady && styles.floatingUndoRedoBtnDisabled]}
              onPress={handleUndo}
              disabled={!isGraphReady}
              activeOpacity={0.7}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <UndoIcon color={isGraphReady ? '#4a5568' : '#cbd5e1'} size={20} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.floatingUndoRedoBtn, !isGraphReady && styles.floatingUndoRedoBtnDisabled]}
              onPress={handleRedo}
              disabled={!isGraphReady}
              activeOpacity={0.7}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <RedoIcon color={isGraphReady ? '#4a5568' : '#cbd5e1'} size={20} />
            </TouchableOpacity>
          </View>
          )}

        </View>

        {/* ─── BOTTOM TOOLBAR ───────────────────────────────────────────── */}
        <View style={[styles.mobileBottomToolbar, { height: toolbarHeight }]}>
          <View style={styles.mobileBottomToolbarRow}>
            {canEditDiagram ? (
              <View style={styles.mobileToolGroup}>
                <TouchableOpacity
                  // @ts-ignore - nativeID renders as a DOM id on web (react-native-web); missing from TouchableOpacityProps' types
                  nativeID="tour-create-shapes"
                  style={[styles.mobileBottomToolBtn, showShapesPanel && styles.mobileBottomToolBtnActive]}
                  onPress={toggleShapesPanel}
                >
                  <ICONS.Shapes color={showShapesPanel ? '#4c6fff' : '#64748b'} />
                </TouchableOpacity>
                <TouchableOpacity
                  // @ts-ignore - nativeID renders as a DOM id on web (react-native-web); missing from TouchableOpacityProps' types
                  nativeID="tour-create-text"
                  style={[
                    styles.mobileBottomToolBtn,
                    showMobileProperties && activeTool === 'text' && styles.mobileBottomToolBtnActive,
                  ]}
                  onPress={() => openMobileProperties('text', 'text')}
                >
                  <ICONS.Text color={showMobileProperties && activeTool === 'text' ? '#4c6fff' : '#64748b'} />
                </TouchableOpacity>
                <TouchableOpacity
                  // @ts-ignore - nativeID renders as a DOM id on web (react-native-web); missing from TouchableOpacityProps' types
                  nativeID="tour-create-style"
                  style={[
                    styles.mobileBottomToolBtn,
                    showMobileProperties && activeTool === 'draw' && styles.mobileBottomToolBtnActive,
                  ]}
                  onPress={() => openMobileProperties('draw', 'style')}
                >
                  <ICONS.Draw color={showMobileProperties && activeTool === 'draw' ? '#4c6fff' : '#64748b'} />
                </TouchableOpacity>
                <TouchableOpacity
                  // @ts-ignore - nativeID renders as a DOM id on web (react-native-web); missing from TouchableOpacityProps' types
                  nativeID="tour-create-arrange"
                  style={[
                    styles.mobileBottomToolBtn,
                    showMobileProperties && activeTool === 'arrange' && styles.mobileBottomToolBtnActive,
                  ]}
                  onPress={() => openMobileProperties('arrange', 'arrange')}
                >
                  <ICONS.Arrange color={showMobileProperties && activeTool === 'arrange' ? '#4c6fff' : '#64748b'} />
                </TouchableOpacity>
                <TouchableOpacity
                  // @ts-ignore - nativeID renders as a DOM id on web (react-native-web); missing from TouchableOpacityProps' types
                  nativeID="tour-create-connectors"
                  style={[styles.mobileBottomToolBtn, showConnectorsPanel && styles.mobileBottomToolBtnActive]}
                  onPress={toggleConnectorsPanel}
                >
                  <ICONS.Connector color={showConnectorsPanel ? '#4c6fff' : '#64748b'} />
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.viewOnlyBanner}>
                <Text style={styles.viewOnlyBannerText} numberOfLines={1}>
                  {hasPendingAccessRequest ? 'Request sent' : "You don't have permission to edit"}
                </Text>
                {!hasPendingAccessRequest && (
                  <TouchableOpacity
                    style={styles.requestPermissionButton}
                    onPress={() => setShowRequestAccessModal(true)}
                  >
                    <Text style={styles.requestPermissionButtonText}>Request permission</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            <View style={styles.mobileToolDivider} />

            <View nativeID="tour-create-zoom" style={styles.mobileToolGroup}>
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
          isGraphReady={isGraphReady}
          toolbarHeight={toolbarHeight}
        />

        {/* Style/Text/Arrange bottom sheet — opened via Text/Draw/Comment
            above, each jumping straight to its matching tab (initialTab),
            not auto-popped-open on selection. Sits as a sibling of
            ShapesBottomPanel (not nested under the canvas), same docked-
            above-the-toolbar placement, so the two sheets behave and stack
            identically. forceOpen skips the component's internal
            collapsed-rail toggle since the toolbar tab is already that
            toggle. */}
        {graphInstance && (
          <PropertiesPanel
            graph={graphInstance}
            visible={showMobileProperties}
            forceOpen
            onRequestClose={() => setShowMobileProperties(false)}
            toolbarHeight={toolbarHeight}
            initialTab={mobilePropertiesTab}
          />
        )}

        <ConnectorsBottomPanel
          visible={showConnectorsPanel}
          onClose={toggleConnectorsPanel}
          toolbarHeight={toolbarHeight}
          graph={graphInstance}
        />

        {showMoreMenu && (
          <>
            <Pressable
              style={styles.dropdownOverlay}
              onPress={() => setShowMoreMenu(false)}
            />
            <View style={[styles.moreDropdown, { top: 60, right: 16 }]}>
              <TouchableOpacity
                // @ts-ignore - nativeID renders as a DOM id on web (react-native-web); missing from TouchableOpacityProps' types
                nativeID="tour-create-moremenu-type"
                style={styles.moreDropdownItem}
                onPress={() => {
                  setShowMoreMenu(false);
                  setShowTypeModal(true);
                }}
                activeOpacity={0.6}
                accessibilityLabel={`Diagram type: ${activeUmlType}. Tap to change.`}
              >
                <ICONS.Tag color="#4a5568" />
                <Text style={styles.moreDropdownLabel}>Diagram Type</Text>
              </TouchableOpacity>
              <TouchableOpacity
                // @ts-ignore - nativeID renders as a DOM id on web (react-native-web); missing from TouchableOpacityProps' types
                nativeID="tour-create-moremenu-print"
                style={[styles.moreDropdownItem, !isGraphReady && styles.moreDropdownItemDisabled]}
                onPress={() => {
                  if (!isGraphReady || isPreparingPrint) return;
                  setShowMoreMenu(false);
                  handlePrint();
                }}
                disabled={!isGraphReady || isPreparingPrint}
                activeOpacity={0.6}
              >
                <PrintIcon color={isGraphReady ? '#4a5568' : '#cbd5e1'} />
                <Text style={[styles.moreDropdownLabel, !isGraphReady && styles.moreDropdownLabelDisabled]}>Print</Text>
              </TouchableOpacity>
              <TouchableOpacity
                // @ts-ignore - nativeID renders as a DOM id on web (react-native-web); missing from TouchableOpacityProps' types
                nativeID="tour-create-moremenu-download"
                style={[styles.moreDropdownItem, styles.moreDropdownItemLast, !isGraphReady && styles.moreDropdownItemDisabled]}
                onPress={() => {
                  if (!isGraphReady || isDownloading) return;
                  setShowMoreMenu(false);
                  setShowDownloadDropdown(true);
                }}
                disabled={!isGraphReady || isDownloading}
                activeOpacity={0.6}
              >
                {isDownloading ? (
                  <View style={styles.downloadSpinner} />
                ) : (
                  <DownloadIcon color={isGraphReady ? '#4a5568' : '#cbd5e1'} />
                )}
                <Text style={[styles.moreDropdownLabel, !isGraphReady && styles.moreDropdownLabelDisabled]}>Download</Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        {showDownloadDropdown && (
          <>
            <Pressable
              style={styles.dropdownOverlay}
              onPress={() => setShowDownloadDropdown(false)}
            />
            <DownloadDropdown
              nativeID="tour-create-download-formats"
              onSelectFormat={handleDownload}
              style={{ top: 60, right: 16 }}
            />
          </>
        )}

        <PrintModal
          visible={showPrintModal}
          onClose={closePrintModal}
          onPrint={executePrint}
          previewUrl={printPreviewUrl}
          name={printName}
          onNameChange={setPrintName}
          title={printTitle}
          onTitleChange={setPrintTitle}
          isEditOpen={isPrintEditOpen}
          onEditOpenChange={setIsPrintEditOpen}
          zoom={printZoom}
          onZoomIn={handlePrintZoomIn}
          onZoomOut={handlePrintZoomOut}
        />
        <DiagramTypeModal
          visible={showTypeModal}
          currentType={activeUmlType}
          onSelect={setActiveUmlType}
          onClose={() => setShowTypeModal(false)}
        />
        <ShareModal
          visible={showShareModal}
          onClose={() => setShowShareModal(false)}
          diagramId={activeDiagramId}
          diagramName={diagramName}
        />
        {activeDiagramId && (
          <RequestAccessModal
            visible={showRequestAccessModal}
            onClose={() => setShowRequestAccessModal(false)}
            diagramId={activeDiagramId}
            onSent={() => setHasPendingAccessRequest(true)}
          />
        )}
        <AppDialog dialogState={dialogState} onDismiss={() => setDialogState(null)} />
      </SafeAreaView>
    );
  }

  // ─── DESKTOP VIEW ─────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {presenceToast && <PresenceToastBanner toast={presenceToast} />}

      <View style={styles.container}>
        <View style={styles.navbar}>
          <View style={styles.navbarLeft}>
            <TouchableOpacity style={styles.navIconBtn} onPress={() => router.navigate('/(tabs)/home')} activeOpacity={0.7}>
              <ICONS.Close color="#4a5568" />
            </TouchableOpacity>
            <TouchableOpacity
              // @ts-ignore - nativeID renders as a DOM id on web (react-native-web); missing from TouchableOpacityProps' types
              nativeID="tour-create-new"
              style={styles.navIconBtn}
              onPress={handleNewDiagram}
              activeOpacity={0.7}
            >
              <ICONS.NewDiagram color="#4a5568" />
            </TouchableOpacity>
            <TextInput
              nativeID="tour-create-title"
              style={[styles.titleInput, styles.titleInputDesktop]}
              value={diagramName}
              onChangeText={setDiagramName}
              placeholder="Diagram Name"
              placeholderTextColor="#94a3b8"
              maxLength={50}
            />
            <TouchableOpacity
              // @ts-ignore - nativeID renders as a DOM id on web (react-native-web); missing from TouchableOpacityProps' types
              nativeID="tour-create-type"
              style={styles.typeChipBtn}
              onPress={() => setShowTypeModal(true)}
              activeOpacity={0.7}
            >
              <ICONS.Tag color="#4a5568" />
              <Text style={styles.typeChipBtnText} numberOfLines={1}>{activeUmlType}</Text>
            </TouchableOpacity>
            {myAccessLevel !== 'owner' && (
              <View style={styles.accessBadge}>
                <Text style={styles.accessBadgeText}>{ACCESS_BADGE_LABEL[myAccessLevel]}</Text>
              </View>
            )}
            <View nativeID="tour-create-saved">
              <AutosaveIndicator status={syncStatus} />
            </View>
          </View>
          <View style={styles.navbarRight}>
            {/* ─── PRESENCE (who else has this diagram open) ─────────────────── */}
            {collabViewers.length > 0 && <PresenceStack viewers={collabViewers} size={28} />}

            {/* ─── SHARE BUTTON ────────────────────────────────────────────── */}
            {canShareDiagram && (
            <TouchableOpacity
              // @ts-ignore - nativeID renders as a DOM id on web (react-native-web); missing from TouchableOpacityProps' types
              nativeID="tour-create-share"
              style={[styles.navIconBtn, styles.navBtnPrimary, !isGraphReady && styles.navBtnDisabled]}
              onPress={handleShare}
              activeOpacity={0.7}
              disabled={!isGraphReady}
            >
              <ShareIcon color={isGraphReady ? '#ffffff' : '#94a3b8'} />
            </TouchableOpacity>
            )}

            {/* ─── SAVE BUTTON ─────────────────────────────────────────────── */}
            {canEditDiagram && (
            <TouchableOpacity
              // @ts-ignore - nativeID renders as a DOM id on web (react-native-web); missing from TouchableOpacityProps' types
              nativeID="tour-create-save"
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
            )}

            <TouchableOpacity
              // @ts-ignore - nativeID renders as a DOM id on web (react-native-web); missing from TouchableOpacityProps' types
              nativeID="tour-create-print"
              style={[styles.navIconBtn, styles.navBtnPrimary, !isGraphReady && styles.navBtnDisabled]}
              onPress={handlePrint}
              activeOpacity={0.7}
              disabled={!isGraphReady || isPreparingPrint}
            >
              <PrintIcon color={isGraphReady ? '#ffffff' : '#94a3b8'} />
            </TouchableOpacity>

            <TouchableOpacity
              // @ts-ignore - nativeID renders as a DOM id on web (react-native-web); missing from TouchableOpacityProps' types
              nativeID="tour-create-download"
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

        {/* ─── FORMAT BAR - UNDO/REDO + QUICK STYLE CONTROLS ─────────────── */}
        {canEditDiagram ? (
          <View nativeID="tour-create-undo-redo" style={styles.formatBar}>
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

            <View style={styles.formatBarDivider} />

            <QuickFormatBar graph={graphInstance} />
          </View>
        ) : (
          <View style={[styles.formatBar, styles.viewOnlyBannerDesktop]}>
            <Text style={styles.viewOnlyBannerText}>
              {hasPendingAccessRequest ? 'Request sent — waiting for the owner to respond.' : "You don't have permission to edit"}
            </Text>
            {!hasPendingAccessRequest && (
              <TouchableOpacity
                style={styles.requestPermissionButton}
                onPress={() => setShowRequestAccessModal(true)}
              >
                <Text style={styles.requestPermissionButtonText}>Request permission</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        <View style={styles.body}>
          <View nativeID="tour-create-canvas" style={styles.canvasContainer}>
            <DiagramCanvas
              key="diagram-canvas"
              ref={diagramCanvasRef}
              onReady={handleGraphReady}
              onChange={handleGraphChange}
              onZoomChange={setZoomLevel}
              onSelectionChange={handleCanvasSelectionChange}
              umlType={activeUmlType}
              // Width of styles.iconRail (always) plus ShapesPanel (only
              // while open) — both float on top of the canvas via
              // `position: absolute` rather than sharing space with it, so
              // DiagramCanvas has no other way to know part of its own
              // container is covered. Keep the 36/280 here in sync with
              // iconRail's width and shapesPanelWrapper's `left` below, and
              // ShapesPanel's own width, respectively.
              leftObstruction={canEditDiagram ? 36 + (isPanelVisible ? 280 : 0) : 0}
            />


            {pendingConnector && (
              <View style={styles.connectHintBanner} pointerEvents="box-none">
                <View style={styles.connectHintPill}>
                  <Text style={styles.connectHintText}>
                    {pendingConnector.sourceCell ? 'Click the second shape' : 'Click the first shape'}
                  </Text>
                  <TouchableOpacity
                    onPress={() => updatePendingConnector(null)}
                    style={styles.connectHintCancelBtn}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <CloseTabIcon color="#ffffff" />
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>

          {canEditDiagram && (
            <View style={styles.iconRail}>
              <TouchableOpacity
                // @ts-ignore - nativeID renders as a DOM id on web (react-native-web); missing from TouchableOpacityProps' types
                nativeID="tour-create-shapes"
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
          )}

          {canEditDiagram && isPanelVisible && (
            <View nativeID="tour-create-shapes-panel" style={styles.shapesPanelWrapper}>
              <ShapesPanel
                onSelectShape={handleAddShape}
                isGraphReady={isGraphReady}
                activeDiagramType={activeUmlType}
              />
            </View>
          )}

          {/* ─── PROPERTIES PANEL ─────────────────────────────────────────── */}
          {canEditDiagram && graphInstance && (
            <View nativeID="tour-create-properties" style={styles.propertiesPanelWrapper}>
              <PropertiesPanel
                graph={graphInstance}
                collapsed={isPropertiesPanelCollapsed}
                onCollapsedChange={setIsPropertiesPanelCollapsed}
              />
            </View>
          )}
        </View>

        {/* Properties panel collapse toggle — rendered here (a sibling of
            `body`, not nested inside it) so it isn't clipped by `body`'s
            overflow: 'hidden'. Anchored to line up with the panel's
            top-right corner just below, poking up into the format bar. */}
        {canEditDiagram && graphInstance && (
          <TouchableOpacity
            style={styles.propertiesToggleTab}
            onPress={() => setIsPropertiesPanelCollapsed((v) => !v)}
            activeOpacity={0.7}
          >
            <PropertiesToggleIcon collapsed={isPropertiesPanelCollapsed} />
          </TouchableOpacity>
        )}

        <View style={styles.bottomBar}>
          {/* A lone "Page 1" tab with nothing to switch to and no way to add
              another (that button was removed — see pageTabAdd's own history)
              is dead UI for every new diagram. Only a diagram that already
              had multiple pages from before that change still needs this row,
              to switch between and delete them. */}
          {pages.length > 1 && (
            <View nativeID="tour-create-pages" style={styles.pageTabsRow}>
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
            </View>
          )}

          <View nativeID="tour-create-zoom" style={styles.zoomRow}>
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

        <PrintModal
          visible={showPrintModal}
          onClose={closePrintModal}
          onPrint={executePrint}
          previewUrl={printPreviewUrl}
          name={printName}
          onNameChange={setPrintName}
          title={printTitle}
          onTitleChange={setPrintTitle}
          isEditOpen={isPrintEditOpen}
          onEditOpenChange={setIsPrintEditOpen}
          zoom={printZoom}
          onZoomIn={handlePrintZoomIn}
          onZoomOut={handlePrintZoomOut}
        />
        <DiagramTypeModal
          visible={showTypeModal}
          currentType={activeUmlType}
          onSelect={setActiveUmlType}
          onClose={() => setShowTypeModal(false)}
        />
        <ShareModal
          visible={showShareModal}
          onClose={() => setShowShareModal(false)}
          diagramId={activeDiagramId}
          diagramName={diagramName}
        />
        {activeDiagramId && (
          <RequestAccessModal
            visible={showRequestAccessModal}
            onClose={() => setShowRequestAccessModal(false)}
            diagramId={activeDiagramId}
            onSent={() => setHasPendingAccessRequest(true)}
          />
        )}
        <AppDialog dialogState={dialogState} onDismiss={() => setDialogState(null)} />
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

const BackArrowIcon = ({ color = '#ffffff' }: { color?: string }) => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
    <Path d="M19 12H5" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M12 19L5 12L12 5" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const EditPencilIcon = ({ color = '#6b7280' }: { color?: string }) => (
  <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
    <Path d="M12 20H21" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M16.5 3.5C16.8978 3.10218 17.4374 2.87868 18 2.87868C18.2786 2.87868 18.5544 2.93355 18.8118 3.04015C19.0692 3.14676 19.303 3.30301 19.5 3.5C19.697 3.69699 19.8532 3.93083 19.9598 4.18822C20.0665 4.44562 20.1213 4.72142 20.1213 5C20.1213 5.27857 20.0665 5.55438 19.9598 5.81177C19.8532 6.06916 19.697 6.30301 19.5 6.5L7 19L3 20L4 16L16.5 3.5Z" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
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

/** Double-chevron for the Properties panel's collapse toggle — points right
 *  (collapse) when the panel is open, left (expand) once it's collapsed. */
const PropertiesToggleIcon = ({ collapsed, color = '#4a5568' }: { collapsed: boolean; color?: string }) => (
  <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
    {collapsed ? (
      <>
        <Path d="M17 6l-6 6 6 6" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M11 6l-6 6 6 6" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      </>
    ) : (
      <>
        <Path d="M7 6l6 6-6 6" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M13 6l6 6-6 6" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      </>
    )}
  </Svg>
);

// ─── APP DIALOG ─────────────────────────────────────────────────────────────
// In-app replacement for react-native-web's no-op Alert.alert / the native
// browser chrome of window.alert (see notify()'s own comment in CreateScreen).
// Hoisted to module scope like DiagramTypeModal/PrintModal below rather than
// declared inline inside CreateScreen — an inline const there is a brand-new
// component identity on every CreateScreen re-render, so React unmounts and
// remounts this Modal (restarting its fade-in) on every UNRELATED re-render
// that happens to land while it's open — autosave ticks, collaboration
// presence updates, canvas onChange, etc. That's what made the download-
// success popup visibly flicker: nothing about dialogState itself was
// changing, just the component's identity.

interface AppDialogProps {
  dialogState: {
    title: string;
    message?: string;
    confirmText?: string;
    onConfirm?: () => void;
  } | null;
  onDismiss: () => void;
}

function AppDialog({ dialogState, onDismiss }: AppDialogProps) {
  if (!dialogState) return null;
  const { title, message, confirmText, onConfirm } = dialogState;

  return (
    <Modal
      visible
      transparent
      animationType="fade"
      onRequestClose={onDismiss}
    >
      <Pressable style={styles.modalOverlay} onPress={onDismiss}>
        <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
          <Text style={styles.modalTitle}>{title}</Text>
          {message ? <Text style={styles.modalSubtitle}>{message}</Text> : null}
          <View style={styles.modalButtons}>
            {onConfirm && (
              <TouchableOpacity
                style={[styles.modalButton, styles.modalCancelButton]}
                onPress={onDismiss}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.modalButton, styles.modalCreateButton]}
              onPress={() => {
                onDismiss();
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
}

// ─── DIAGRAM TYPE MODAL ─────────────────────────────────────────────────────
// Explicit picker for the diagram's declared type — see showTypeModal's own
// comment in CreateScreen for how this relates to detectDiagramTypeFromContent's
// automatic guess (this always wins when the user picks something here).

interface DiagramTypeModalProps {
  visible: boolean;
  currentType: string;
  onSelect: (type: string) => void;
  onClose: () => void;
}

function DiagramTypeModal({ visible, currentType, onSelect, onClose }: DiagramTypeModalProps) {
  if (!visible) return null;
  return (
    <Modal animationType="fade" transparent visible={visible} onRequestClose={onClose}>
      <Pressable style={typeModalStyles.overlay} onPress={onClose}>
        <Pressable style={typeModalStyles.container}>
          <View style={typeModalStyles.header}>
            <Text style={typeModalStyles.title}>Diagram Type</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <ICONS.Close color={COLORS.gray500} />
            </TouchableOpacity>
          </View>
          <Text style={typeModalStyles.subtitle}>
            Controls which validation rules apply to this diagram.
          </Text>
          <ScrollView style={typeModalStyles.list} showsVerticalScrollIndicator={false}>
            {DIAGRAM_TABS.map((type) => {
              const isActive = type === currentType;
              return (
                <TouchableOpacity
                  key={type}
                  style={[typeModalStyles.row, isActive && typeModalStyles.rowActive]}
                  onPress={() => {
                    onSelect(type);
                    onClose();
                  }}
                >
                  <Text style={[typeModalStyles.rowText, isActive && typeModalStyles.rowTextActive]}>
                    {type}
                  </Text>
                  {isActive && <Text style={typeModalStyles.check}>✓</Text>}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const typeModalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: COLORS.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
  },
  container: {
    width: '100%',
    maxWidth: 380,
    maxHeight: '80%',
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.xxl,
    padding: SPACING.xl,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.gray900,
  },
  subtitle: {
    fontSize: 13,
    color: COLORS.gray500,
    marginTop: SPACING.xs,
    marginBottom: SPACING.md,
  },
  list: {
    marginTop: SPACING.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.md,
  },
  rowActive: {
    backgroundColor: COLORS.primaryLight,
  },
  rowText: {
    fontSize: 14,
    color: COLORS.gray700,
  },
  rowTextActive: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  check: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primary,
  },
});

// ─── PRINT MODAL ────────────────────────────────────────────────────────────
//
// A real top-level component, not one defined inline inside CreateScreen's
// render body — a component defined inside another component's render body
// gets a new identity every render, so React tears down and rebuilds the
// whole print screen on every keystroke/click inside it instead of just
// updating it. Everything it needs comes in as props instead of closures.

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

// Max bounding box the preview page is scaled to fit inside at 100% zoom —
// the actual on-screen shape comes from the selected paper's real aspect
// ratio (see paperSizeToPreviewSize), so picking Legal vs A4 vs Statement
// visibly changes the preview instead of every size looking identical.
const PRINT_PREVIEW_MAX = { width: 460, height: 595 };

function paperSizeToPreviewSize(
  size: PaperSizeDef,
  orientation: 'portrait' | 'landscape',
  maxBox: { width: number; height: number } = PRINT_PREVIEW_MAX,
) {
  const toInches = (v: string) => v.endsWith('mm') ? Number.parseFloat(v) / 25.4 : Number.parseFloat(v);
  let w = toInches(size.width);
  let h = toInches(size.height);
  if (orientation === 'landscape') [w, h] = [h, w];
  const scale = Math.min(maxBox.width / w, maxBox.height / h);
  return { width: w * scale, height: h * scale };
}

interface PrintModalProps {
  visible: boolean;
  onClose: () => void;
  onPrint: () => void;
  previewUrl: string | null;

  name: string;
  onNameChange: (v: string) => void;
  title: string;
  onTitleChange: (v: string) => void;
  isEditOpen: boolean;
  onEditOpenChange: (open: boolean) => void;

  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
}

// Narrower than this and the desktop 3-column backstage (rail + 300px
// settings + preview) simply doesn't fit — see the mobile branch below.
const PRINT_MOBILE_BREAKPOINT = 700;

function PrintModal({
  visible, onClose, onPrint, previewUrl,
  name, onNameChange, title, onTitleChange,
  isEditOpen, onEditOpenChange,
  zoom, onZoomIn, onZoomOut,
}: PrintModalProps) {
  const { width: winWidth, height: winHeight } = useWindowDimensions();
  if (!visible) return null;

  const isMobile = winWidth < PRINT_MOBILE_BREAKPOINT;
  const previewMaxBox = isMobile
    ? { width: winWidth - 48, height: winHeight * 0.42 }
    : PRINT_PREVIEW_MAX;
  const base = paperSizeToPreviewSize(PAPER_SIZES.Letter, 'portrait', previewMaxBox);
  const pageSize = { width: base.width * (zoom / 100), height: base.height * (zoom / 100) };
  const hasEditText = !!(name.trim() || title.trim());

  const preview = (
    <View style={isMobile ? styles.printMobilePreviewArea : styles.printPreviewPanel}>
      <ScrollView contentContainerStyle={styles.printPreviewScrollContent}>
        <View style={[styles.printPreviewPage, pageSize]}>
          {name.trim() ? (
            <Text style={styles.printPreviewName} numberOfLines={1}>{name.trim()}</Text>
          ) : null}
          {title.trim() ? (
            <Text style={styles.printPreviewTitle} numberOfLines={1}>{title.trim()}</Text>
          ) : null}
          {previewUrl && Platform.OS === 'web' ? (
            <img
              src={previewUrl}
              style={{
                maxWidth: '100%',
                maxHeight: '100%',
                objectFit: 'contain',
              }}
            />
          ) : null}
        </View>
      </ScrollView>

      <View style={styles.printZoomRow}>
        <TouchableOpacity style={styles.zoomBtn} onPress={onZoomOut} activeOpacity={0.7}>
          <Text style={styles.zoomBtnText}>−</Text>
        </TouchableOpacity>
        <Text style={styles.zoomLabel}>{zoom}%</Text>
        <TouchableOpacity style={styles.zoomBtn} onPress={onZoomIn} activeOpacity={0.7}>
          <Text style={styles.zoomBtnText}>+</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  // Shared between the desktop 3-column layout and the mobile stacked one
  // below — only this one row now (Copies/Printer/Orientation/Paper size
  // were removed; printing always goes straight to the system dialog, which
  // already offers all of those itself).
  const editRow = (
    <>
      <TouchableOpacity
        style={styles.printSelectBox}
        onPress={() => onEditOpenChange(!isEditOpen)}
        activeOpacity={0.7}
      >
        <Text
          style={[styles.printSelectText, !hasEditText && styles.printSelectPlaceholder]}
          numberOfLines={1}
        >
          {[name.trim(), title.trim()].filter(Boolean).join(' · ') || 'Edit — add name or title'}
        </Text>
        <EditPencilIcon color="#6b7280" />
      </TouchableOpacity>
      {isEditOpen && (
        <View style={styles.printEditPanel}>
          <View style={styles.printEditField}>
            <Text style={styles.printEditFieldLabel}>Name (top-left corner)</Text>
            <TextInput
              autoFocus
              style={styles.printEditInput}
              placeholder="e.g. your name"
              placeholderTextColor="#94a3b8"
              value={name}
              onChangeText={onNameChange}
              returnKeyType="next"
            />
          </View>
          <View style={styles.printEditField}>
            <Text style={styles.printEditFieldLabel}>Title</Text>
            <TextInput
              style={styles.printEditInput}
              placeholder="e.g. diagram title"
              placeholderTextColor="#94a3b8"
              value={title}
              onChangeText={onTitleChange}
              onSubmitEditing={() => onEditOpenChange(false)}
              returnKeyType="done"
            />
          </View>
          <TouchableOpacity
            style={styles.printEditDoneButton}
            onPress={() => onEditOpenChange(false)}
            activeOpacity={0.7}
          >
            <Text style={styles.printEditDoneText}>Done</Text>
          </TouchableOpacity>
        </View>
      )}
    </>
  );

  if (isMobile) {
    // Word Mobile's print screen shape: a slim title bar (back + title only —
    // no crowded toolbar), the page preview given the most room since that's
    // what you're actually checking, a scrollable options list below it, and
    // one full-width Print button pinned to the bottom within thumb reach —
    // not a 300px settings rail, which has no room to exist on a phone.
    return (
      <Modal visible={visible} transparent={false} animationType="slide" onRequestClose={onClose}>
        <View style={styles.printMobileContainer}>
          <View style={styles.printMobileTopBar}>
            <TouchableOpacity onPress={onClose} activeOpacity={0.7} style={styles.printMobileBackButton}>
              <BackArrowIcon color="#1a1f36" />
            </TouchableOpacity>
            <Text style={styles.printMobileTopBarTitle}>Print</Text>
            <View style={styles.printMobileBackButton} />
          </View>

          {preview}

          <View style={styles.printMobileSettingsContent}>
            {editRow}
          </View>

          <View style={styles.printMobileBottomBar}>
            <TouchableOpacity style={styles.printMainButton} onPress={onPrint} activeOpacity={0.85}>
              <PrintIcon color="#ffffff" />
              <Text style={styles.printMainButtonText}>Print</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <Modal
      visible={visible}
      transparent={false}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.printBackstage}>
        {/* Thin rail — the only way out of this screen, same role as Word's
            backstage back arrow: no "click outside to dismiss" once this is
            full-screen, since there is no outside. */}
        <View style={styles.printBackRail}>
          <TouchableOpacity
            style={styles.printBackButton}
            onPress={onClose}
            activeOpacity={0.7}
          >
            <BackArrowIcon color="#ffffff" />
          </TouchableOpacity>
        </View>

        <View style={styles.printSettingsPanel}>
          <Text style={styles.printModalTitle}>Print</Text>

          {editRow}

          <TouchableOpacity
            style={styles.printMainButton}
            onPress={onPrint}
            activeOpacity={0.85}
          >
            <PrintIcon color="#ffffff" />
            <Text style={styles.printMainButtonText}>Print</Text>
          </TouchableOpacity>
        </View>

        {preview}
      </View>
    </Modal>
  );
}

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
  typeChipBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginLeft: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#eef2f6',
  },
  typeChipBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4a5568',
    // 260 comfortably fits the longest DIAGRAM_TABS name ("Functional
    // Decomposition Diagram", ~241px at this size) without truncating —
    // numberOfLines={1} below stays as a safety net for names longer than
    // that, not as the primary fit mechanism.
    maxWidth: 260,
  },
  autosaveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginLeft: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: '#f8fafc',
  },
  autosaveIndicatorLabel: {
    fontSize: 11,
    fontWeight: '600',
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
  accessBadge: {
    backgroundColor: '#eef2ff',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginLeft: 8,
  },
  accessBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4c6fff',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  presenceStack: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 10,
  },
  presenceOverflow: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#94a3b8',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  presenceOverflowText: {
    color: '#ffffff',
    fontWeight: '700',
  },
  presenceRing: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  presenceToast: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 54 : 12,
    alignSelf: 'center',
    zIndex: 1000,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1f36',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    ...Platform.select({
      web: { boxShadow: '0 4px 16px rgba(0,0,0,0.25)' } as any,
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
        elevation: 6,
      },
    }),
  },
  presenceToastAvatars: {
    flexDirection: 'row',
    marginRight: 8,
  },
  presenceToastText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
  },
  viewOnlyBannerDesktop: {
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  viewOnlyBanner: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
  },
  viewOnlyBannerText: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '500',
  },
  requestPermissionButton: {
    backgroundColor: '#1a1f36',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  requestPermissionButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 12,
  },
  formatBarDivider: {
    width: 1,
    height: 20,
    backgroundColor: '#e2e8f0',
    marginHorizontal: 4,
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
  // Tap-to-connect prompt, shown while pendingConnector is active.
  connectHintBanner: {
    position: 'absolute',
    top: 16,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 30,
  },
  connectHintPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#1a1f36',
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 16,
    ...(Platform.OS === 'web' ? { boxShadow: '0 4px 12px rgba(15,23,42,0.25)' } : {}),
  },
  connectHintText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
  },
  connectHintCancelBtn: {
    padding: 2,
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
  // Positioned as a sibling of `body` (see the comment at its call site) so
  // it isn't clipped by body's overflow: 'hidden'. `right: 12` matches the
  // Properties panel's own edge padding so it lines up with the panel just
  // below; `top`/`height` land its bottom edge flush with where the panel
  // starts (navbar 48+1 + format bar 40+1 = 90px down).
  propertiesToggleTab: {
    position: 'absolute',
    top: 70,
    right: 12,
    width: 28,
    height: 20,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderBottomWidth: 0,
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 25,
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
  zoomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    // Was relying on bottomBar's justifyContent: space-between to push this
    // to the right against pageTabsRow — worked fine as long as that row was
    // always rendered, but with it now conditionally hidden for a single-
    // page diagram, zoomRow became bottomBar's only child and space-between
    // has nothing left to push it away from, so it fell back to the left.
    // marginLeft: 'auto' pins it to the right on its own, regardless of
    // whether pageTabsRow is present.
    marginLeft: 'auto',
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
  // Mobile-only overflow menu (New Diagram / Diagram Type / Print /
  // Download) — same box chrome as downloadDropdown, but single-line
  // icon+label rows instead of icon+label+description, since these don't
  // need a second line of explanation.
  moreDropdown: {
    position: 'absolute',
    width: 180,
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
  moreDropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  moreDropdownItemLast: {
    borderBottomWidth: 0,
  },
  moreDropdownItemDisabled: {
    opacity: 0.6,
  },
  moreDropdownLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1a1f36',
  },
  moreDropdownLabelDisabled: {
    color: '#cbd5e1',
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
  // ─── PRINT — full-screen "backstage" view ───────────────────────────────────
  printBackstage: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#f5f5f5',
  },
  printBackRail: {
    width: 56,
    backgroundColor: '#16213e',
    alignItems: 'center',
    paddingTop: 18,
  },
  printBackButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  printSettingsPanel: {
    width: 300,
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 20,
    borderRightWidth: 1,
    borderRightColor: '#e2e8f0',
  },
  printModalTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 20,
  },
  printMainButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#4c6fff',
    borderRadius: 8,
    height: 64,
    marginBottom: 24,
  },
  printMainButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
  printSelectBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 38,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 6,
    paddingHorizontal: 12,
    backgroundColor: '#ffffff',
    marginBottom: 10,
  },
  printSelectText: {
    fontSize: 13,
    color: '#1a1a1a',
    flexShrink: 1,
  },
  printSelectPlaceholder: {
    color: '#94a3b8',
  },
  printSelectCaret: {
    fontSize: 11,
    color: '#6b7280',
  },
  printEditPanel: {
    flexDirection: 'column',
    gap: 10,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 12,
    marginTop: -4,
    marginBottom: 10,
  },
  printEditField: {
    gap: 5,
  },
  printEditFieldLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
  },
  printEditInput: {
    height: 32,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 0,
    fontSize: 13,
    lineHeight: 16,
    color: '#1a1a1a',
    backgroundColor: '#ffffff',
  },
  printEditDoneButton: {
    height: 32,
    paddingHorizontal: 14,
    borderRadius: 6,
    backgroundColor: '#4c6fff',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-end',
  },
  printEditDoneText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  printPreviewPanel: {
    flex: 1,
    position: 'relative',
    backgroundColor: '#e8e8e8',
  },
  printPreviewScrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  printPreviewPage: {
    position: 'relative',
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
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
  printPreviewName: {
    position: 'absolute',
    top: 12,
    left: 12,
    fontSize: 12,
    fontWeight: '600',
    color: '#1a1f36',
  },
  printPreviewTitle: {
    position: 'absolute',
    top: 12,
    left: 0,
    right: 0,
    fontSize: 15,
    fontWeight: '600',
    color: '#1a1f36',
    textAlign: 'center',
  },
  printZoomRow: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    ...(Platform.OS === 'web'
      ? { boxShadow: '0 4px 12px rgba(15, 23, 42, 0.18)' }
      : {
          shadowColor: '#0f172a',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.18,
          shadowRadius: 8,
          elevation: 6,
        }),
  },

  // ─── PRINT — mobile stacked layout (see PRINT_MOBILE_BREAKPOINT) ────────────
  printMobileContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  printMobileTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 52,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  printMobileBackButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  printMobileTopBarTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1f36',
  },
  printMobilePreviewArea: {
    position: 'relative',
    backgroundColor: '#e8e8e8',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  printMobileSettingsContent: {
    padding: 20,
    paddingBottom: 32,
  },
  printMobileBottomBar: {
    padding: 16,
    paddingBottom: Platform.OS === 'ios' ? 28 : 16,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    backgroundColor: '#ffffff',
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