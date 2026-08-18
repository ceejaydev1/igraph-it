import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Pressable,
  Platform,
  TextInput,
  Keyboard,
  Animated,
  useWindowDimensions,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Svg, Path, Rect, Circle, Defs, Pattern } from 'react-native-svg';
import { useNotes, LearningNote } from '../../contexts/NotesContext';

// ─── Design tokens (matching savedDiagrams.tsx) ─────────────────────────────

const COLORS = {
  primary: '#4c6fff',
  primaryDark: '#3b4fcc',
  primaryLight: '#eef2ff',
  success: '#10b981',
  successLight: '#ecfdf5',
  gray50: '#f8fafc',
  gray100: '#f1f5f9',
  gray200: '#e2e8f0',
  gray300: '#cbd5e1',
  gray400: '#94a3b8',
  gray500: '#64748b',
  gray600: '#475569',
  gray700: '#334155',
  gray800: '#1e293b',
  gray900: '#0f172a',
  white: '#ffffff',
  danger: '#ef4444',
  dangerLight: '#fef2f2',
  border: '#E8ECF1',
  borderLight: '#F1F5F9',
  shadow: '#0F172A',
  background: '#f8faff',
  // Hover accent — same indigo used by reference.tsx's cardHovered border.
  hoverBorder: '#c7d2fe',
};

const SPACING = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, xxxl: 32 };
const RADIUS = { sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, full: 999 };

const SHADOWS = {
  sm: {
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  md: {
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
};

// Undo window before a soft-deleted note is actually removed.
const UNDO_WINDOW_MS = 5000;

// Maximum characters before showing "See More" button
const MAX_NOTE_PREVIEW_LENGTH = 150;

// ─── Icons ──────────────────────────────────────────────────────────────────

const BackIcon = () => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
    <Path d="M15 18l-6-6 6-6" stroke={COLORS.gray900} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const EmptyNotesIcon = () => (
  <Svg width={80} height={80} viewBox="0 0 24 24" fill="none">
    <Rect x="3" y="3" width="18" height="18" rx="2" stroke="#cbd5e1" strokeWidth={1.5} />
    <Path d="M8 8h8M8 12h6M8 16h4" stroke="#cbd5e1" strokeWidth={1.5} strokeLinecap="round" />
  </Svg>
);

const TrashIcon = () => (
  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
    <Path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" stroke={COLORS.danger} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const CloseIcon = ({ color = COLORS.gray400 }: { color?: string }) => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
    <Path d="M18 6L6 18M6 6L18 18" stroke={color} strokeWidth={2} strokeLinecap="round" />
  </Svg>
);

const WarningIcon = () => (
  <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
    <Path d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" stroke={COLORS.danger} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const ChevronIcon = ({ color = COLORS.gray300 }: { color?: string }) => (
  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
    <Path d="M9 6l6 6-6 6" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

// Exact copies of Home's search-bar icons, so the two bars render identically.
const SearchSubmitIcon = () => (
  <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
    <Path
      d="M21 21L16.65 16.65M19 11C19 15.4183 15.4183 19 11 19C6.58172 19 3 15.4183 3 11C3 6.58172 6.58172 3 11 3C15.4183 3 19 6.58172 19 11Z"
      stroke="#ffffff"
      strokeWidth={2}
      strokeLinecap="round"
    />
  </Svg>
);

const SearchClearIcon = () => (
  <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="12" r="10" stroke="#8896b3" strokeWidth={1.5} />
    <Path d="M15 9L9 15M9 9L15 15" stroke="#8896b3" strokeWidth={1.8} strokeLinecap="round" />
  </Svg>
);

const DOT_SPACING = 32;
const DOT_SIZE = 1.4;

const DotGrid = () => {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const roundedWidth = Math.ceil(screenWidth / 50) * 50;
  const roundedHeight = Math.ceil(screenHeight / 50) * 50;
  const patternId = useMemo(() => 'dot-grid-pattern', []);

  return (
    <View style={styles.dotGridContainer} pointerEvents="none">
      <Svg width={roundedWidth} height={roundedHeight}>
        <Defs>
          <Pattern id={patternId} x={0} y={0} width={DOT_SPACING} height={DOT_SPACING} patternUnits="userSpaceOnUse">
            <Circle cx={DOT_SPACING / 2} cy={DOT_SPACING / 2} r={DOT_SIZE} fill={COLORS.primary} opacity={0.12} />
          </Pattern>
        </Defs>
        <Rect x={0} y={0} width={roundedWidth} height={roundedHeight} fill={`url(#${patternId})`} />
      </Svg>
    </View>
  );
};

// ─── Skeleton Loading ───────────────────────────────────────────────────────

const SkeletonCard = () => {
  const pulse = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.4, duration: 700, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  return (
    <Animated.View style={[styles.noteCard, { opacity: pulse }]}>
      <View style={styles.skeletonLineWide} />
      <View style={[styles.skeletonLine, { width: '90%' }]} />
      <View style={[styles.skeletonLine, { width: '70%' }]} />
      <View style={styles.skeletonLineTiny} />
    </Animated.View>
  );
};

const SkeletonList = () => (
  <View style={styles.notesList} accessibilityLabel="Loading saved notes">
    <SkeletonCard />
    <SkeletonCard />
    <SkeletonCard />
  </View>
);

// ─── Note Card ──────────────────────────────────────────────────────────────

const NoteCard = ({
  note,
  canOpen,
  onOpen,
  onDelete,
  isDeleting,
}: {
  note: LearningNote;
  canOpen: boolean;
  onOpen: () => void;
  onDelete: () => void;
  isDeleting?: boolean;
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const isLongText = note.text.length > MAX_NOTE_PREVIEW_LENGTH;
  const displayText = isExpanded || !isLongText
    ? note.text
    : `${note.text.slice(0, MAX_NOTE_PREVIEW_LENGTH)}...`;

  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <Pressable
      onPress={canOpen ? onOpen : undefined}
      style={({ pressed }) => [
        styles.noteCard,
        isHovered && styles.noteCardHovered,
        pressed && canOpen && styles.noteCardPressed,
      ]}
      accessibilityRole={canOpen ? 'button' : undefined}
      accessibilityLabel={canOpen ? `Open diagram: ${note.diagramTitle}` : undefined}
      // @ts-ignore - React Native Web specific props
      onMouseEnter={() => setIsHovered(true)}
      // @ts-ignore - React Native Web specific props
      onMouseLeave={() => setIsHovered(false)}
    >
      <View style={styles.noteHeader}>
        <Text style={styles.noteTimestamp}>{note.timestamp}</Text>
        <View style={styles.noteHeaderActions}>
          <TouchableOpacity
            onPress={onDelete}
            style={styles.deleteButton}
            accessibilityRole="button"
            accessibilityLabel="Delete note"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            disabled={isDeleting}
          >
            {isDeleting ? (
              <ActivityIndicator size="small" color={COLORS.danger} />
            ) : (
              <TrashIcon />
            )}
          </TouchableOpacity>
          {canOpen && <ChevronIcon />}
        </View>
      </View>

      <Text style={styles.noteText}>{displayText}</Text>

      {isLongText && (
        <TouchableOpacity
          onPress={toggleExpand}
          style={styles.seeMoreButton}
          accessibilityRole="button"
          accessibilityLabel={isExpanded ? "See less" : "See more"}
        >
          <Text style={styles.seeMoreText}>
            {isExpanded ? 'See Less' : 'See More'}
          </Text>
        </TouchableOpacity>
      )}
    </Pressable>
  );
};

// ─── Delete Confirmation Modal ──────────────────────────────────────────────

const ConfirmDeleteModal = ({
  visible,
  onClose,
  onConfirm,
  noteText,
  isLoading,
}: {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
  noteText: string;
  isLoading?: boolean;
}) => {
  const preview = noteText.length > 120 ? `${noteText.slice(0, 120)}…` : noteText;

  return (
    <Modal animationType="fade" transparent visible={visible} onRequestClose={onClose}>
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <Pressable style={styles.modalContainer} onPress={(e) => e.stopPropagation()} accessibilityViewIsModal>
          <View style={styles.modalHeader}>
            <View style={styles.modalTitleRow}>
              <View style={styles.warningIconWrap}>
                <WarningIcon />
              </View>
              <Text style={styles.modalTitle}>Delete Note</Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={styles.modalCloseBtn}
              accessibilityRole="button"
              accessibilityLabel="Close dialog"
              disabled={isLoading}
            >
              <CloseIcon />
            </TouchableOpacity>
          </View>

          <Text style={styles.modalSubtitle}>You can undo this right after deleting.</Text>

          {!!preview && (
            <View style={styles.modalPreviewBox}>
              <Text style={styles.modalPreviewText} numberOfLines={3}>
                {preview}
              </Text>
            </View>
          )}

          <View style={styles.modalButtons}>
            <TouchableOpacity
              style={[styles.modalButton, styles.modalCancelButton]}
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Cancel deletion"
              disabled={isLoading}
            >
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalButton, styles.modalDeleteButton, isLoading && styles.modalButtonDisabled]}
              onPress={onConfirm}
              accessibilityRole="button"
              accessibilityLabel="Confirm deletion"
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color={COLORS.white} size="small" />
              ) : (
                <Text style={styles.modalDeleteText}>Delete</Text>
              )}
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

// ─── Toast (supports an optional Undo action) ──────────────────────────────

type ToastState = { message: string; type: 'success' | 'error'; onUndo?: () => void } | null;

const Toast = ({ toast, onHide, bottomOffset }: { toast: ToastState; onHide: () => void; bottomOffset?: number }) => {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    if (toast) {
      timerRef.current = setTimeout(() => {
        onHide();
        timerRef.current = null;
      }, UNDO_WINDOW_MS);
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [toast, onHide]);

  if (!toast) return null;

  return (
    <View
      style={[
        styles.toast,
        { bottom: bottomOffset ?? SPACING.xxxl },
        toast.type === 'error' ? styles.toastError : styles.toastSuccess,
      ]}
      accessibilityLiveRegion="polite"
      accessibilityRole="alert"
    >
      <Text style={styles.toastText}>{toast.message}</Text>
      {toast.onUndo && (
        <TouchableOpacity
          onPress={toast.onUndo}
          style={styles.toastUndoBtn}
          accessibilityRole="button"
          accessibilityLabel="Undo delete"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.toastUndoText}>UNDO</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

// ─── Main Screen ────────────────────────────────────────────────────────────

export default function SavedNotes() {
  const { notes, removeNoteLocal, deleteNoteServer, restoreNote, isLoading, refreshNotes } = useNotes() as {
    notes: LearningNote[];
    removeNoteLocal: (id: string) => void;
    deleteNoteServer: (id: string) => Promise<void>;
    restoreNote: (note: LearningNote) => void;
    isLoading?: boolean;
    refreshNotes: () => Promise<void>;
  };
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  useFocusEffect(
    useCallback(() => {
      refreshNotes();
    }, [refreshNotes])
  );

  const [noteToDelete, setNoteToDelete] = useState<LearningNote | null>(null);
  const [toast, setToast] = useState<ToastState>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [pendingDeleteIds, setPendingDeleteIds] = useState<string[]>([]);
  const pendingDeleteSetRef = useRef<Set<string>>(new Set());
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const isDesktop = width >= 1024;
  const isMobile = width < 768;

  useEffect(() => {
    return () => {
      timersRef.current.forEach((timer, id) => {
        clearTimeout(timer);
        deleteNoteServer(id);
      });
      timersRef.current.clear();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success', onUndo?: () => void) => {
    setToast({ message, type, onUndo });
  }, []);

  const handleBack = useCallback(() => {
    router.navigate('/(tabs)/userAccount');
  }, [router]);

  const handleOpenNote = useCallback(
    (note: LearningNote) => {
      const diagramId = (note as any).diagramId;
      if (!diagramId) return;
      router.navigate(`/(tabs)/diagram/${diagramId}` as any);
    },
    [router]
  );

  const openDeleteModal = useCallback((note: LearningNote) => {
    if (deletingId === note.id) {
      console.log('⏳ Delete already in progress for this note');
      return;
    }
    setNoteToDelete(note);
  }, [deletingId]);

  const closeDeleteModal = useCallback(() => {
    setNoteToDelete(null);
  }, []);

  const confirmDelete = useCallback(() => {
    if (!noteToDelete) return;
    const id = noteToDelete.id;
    const note = noteToDelete;

    setDeletingId(id);

    // Remove from the visible list immediately.
    removeNoteLocal(id);

    // Shield: keeps the note out of `visibleNotes` even if something
    // (e.g. the focus-triggered refreshNotes()) refetches the note list
    // from the server before the server-side delete below has happened.
    pendingDeleteSetRef.current.add(id);
    setPendingDeleteIds(Array.from(pendingDeleteSetRef.current));

    setNoteToDelete(null);

    const timer = setTimeout(async () => {
      timersRef.current.delete(id);
      try {
        // Delete on the server only after the undo window has passed.
        await deleteNoteServer(id);

        // BUGFIX: re-assert the local removal. If a background refetch
        // (e.g. useFocusEffect's refreshNotes()) landed during the undo
        // window — before the server actually had the note deleted —
        // it would have silently put the note BACK into `notes`, hidden
        // only by the shield above. The instant we drop that shield
        // below, that stale copy would flash back on screen for a frame
        // before the next refetch corrected it. Explicitly removing it
        // again here closes that gap for good, regardless of what any
        // interim refetch did.
        removeNoteLocal(id);
      } catch (err) {
        console.log(`⚠️ Failed to delete note ${id} on server`, err);
        // Don't leave the note stuck invisible behind the shield forever —
        // put it back and tell the user.
        restoreNote(note);
        showToast('Failed to delete note. Please try again.', 'error');
      } finally {
        // Only drop the shield once we've settled on a final state
        // (confirmed deleted, or restored above), never before.
        pendingDeleteSetRef.current.delete(id);
        setPendingDeleteIds(Array.from(pendingDeleteSetRef.current));
        setDeletingId(null);
      }
    }, UNDO_WINDOW_MS);

    timersRef.current.set(id, timer);

    showToast('Note deleted.', 'success', () => {
      const pending = timersRef.current.get(id);
      if (pending) {
        clearTimeout(pending);
        timersRef.current.delete(id);
      }
      pendingDeleteSetRef.current.delete(id);
      setPendingDeleteIds(Array.from(pendingDeleteSetRef.current));
      setDeletingId(null);
      restoreNote(note);
      console.log(`✅ Note ${id} restored via undo`);
      setToast(null);
    });
  }, [noteToDelete, removeNoteLocal, deleteNoteServer, restoreNote, showToast]);

  const visibleNotes = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return notes.filter((note) => {
      if (pendingDeleteSetRef.current.has(note.id)) return false;
      if (!query) return true;
      return (
        note.diagramTitle.toLowerCase().includes(query) ||
        note.text.toLowerCase().includes(query)
      );
    });
  }, [notes, pendingDeleteIds, searchQuery]);

  const groupedNotes = useMemo(() => {
    const map = new Map<string, LearningNote[]>();
    visibleNotes.forEach((note) => {
      const group = map.get(note.diagramTitle) ?? [];
      group.push(note);
      map.set(note.diagramTitle, group);
    });
    return Array.from(map.entries()).map(([title, items]) => ({ title, items }));
  }, [visibleNotes]);

  const hasAnyNotes = notes.some((note) => !pendingDeleteSetRef.current.has(note.id));

  const isShowingEmptyState = !isLoading && (!hasAnyNotes || groupedNotes.length === 0);

  const hideToast = useCallback(() => {
    setToast(null);
  }, []);

  return (
    <View style={styles.container}>
      <DotGrid />

      <View style={[styles.header, { paddingTop: insets.top + SPACING.sm }]}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton} activeOpacity={0.6}>
          <BackIcon />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Saved Notes</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingBottom: isMobile ? 120 : isDesktop ? 48 : 90,
            maxWidth: isDesktop ? 800 : '100%',
            alignSelf: isDesktop ? 'center' : 'stretch',
            width: '100%',
          },
          isShowingEmptyState && styles.emptyScrollContent,
        ]}
      >
        {isLoading ? (
          <SkeletonList />
        ) : !hasAnyNotes ? (
          <View style={styles.emptyState}>
            <EmptyNotesIcon />
            <Text style={styles.emptyTitle}>No saved notes yet</Text>
            <Text style={styles.emptySubtext}>
              Submit notes on any SDLC and UML diagram in diagram library and it will appear here automatically.
            </Text>
          </View>
        ) : (
          <>
            <View style={styles.searchBarContainer}>
              <View style={styles.searchBar}>
                <TextInput
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholder="Search notes or diagrams"
                  placeholderTextColor="#94a3b8"
                  style={styles.searchInput}
                  onSubmitEditing={() => Keyboard.dismiss()}
                  autoCapitalize="none"
                  returnKeyType="search"
                />
                {searchQuery.length > 0 && (
                  <Pressable
                    onPress={() => setSearchQuery('')}
                    style={({ pressed }) => [
                      styles.clearButton,
                      pressed && styles.clearButtonPressed,
                    ]}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <SearchClearIcon />
                  </Pressable>
                )}
                <Pressable
                  style={({ pressed }) => [
                    styles.searchButton,
                    pressed && styles.searchButtonPressed,
                  ]}
                  onPress={() => Keyboard.dismiss()}
                >
                  <SearchSubmitIcon />
                </Pressable>
              </View>
            </View>

            {groupedNotes.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyTitle}>No matches</Text>
                <Text style={styles.emptySubtext}>Try a different search term.</Text>
              </View>
            ) : (
              groupedNotes.map((group) => (
                <View key={group.title} style={styles.groupSection}>
                  <View style={styles.groupHeader}>
                    <Text style={styles.groupTitle} numberOfLines={1}>
                      {group.title}
                    </Text>
                    <Text style={styles.groupCount}>{group.items.length}</Text>
                  </View>

                  <View style={styles.notesList}>
                    {group.items.map((note) => {
                      const canOpen = !!(note as any).diagramId;
                      return (
                        <NoteCard
                          key={note.id}
                          note={note}
                          canOpen={canOpen}
                          onOpen={() => handleOpenNote(note)}
                          onDelete={() => openDeleteModal(note)}
                          isDeleting={deletingId === note.id}
                        />
                      );
                    })}
                  </View>
                </View>
              ))
            )}
          </>
        )}
      </ScrollView>

      <ConfirmDeleteModal
        visible={!!noteToDelete}
        onClose={closeDeleteModal}
        onConfirm={confirmDelete}
        noteText={noteToDelete?.text || ''}
        isLoading={!!noteToDelete && deletingId === noteToDelete.id}
      />

      <Toast
        toast={toast}
        onHide={hideToast}
        bottomOffset={isMobile ? insets.bottom + 96 : SPACING.xxxl}
      />
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  dotGridContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.xl,
    paddingBottom: SPACING.sm,
    backgroundColor: COLORS.background,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    ...SHADOWS.sm,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.gray900,
    letterSpacing: -0.3,
  },
  headerSpacer: {
    width: 36,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.md,
  },
  emptyScrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  searchBarContainer: {
    alignSelf: 'center',
    marginBottom: 16,
    width: '100%',
    maxWidth: 640,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 10,
    width: '100%',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#0f172a',
    paddingVertical: 8,
    ...Platform.select({
      web: {
        outlineStyle: 'none',
      },
    }),
  },
  clearButton: {
    padding: 4,
    borderRadius: 4,
  },
  clearButtonPressed: {
    backgroundColor: '#f1f5f9',
  },
  searchButton: {
    backgroundColor: '#4c6fff',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchButtonPressed: {
    backgroundColor: '#3b5de7',
  },
  groupSection: {
    marginBottom: SPACING.xl,
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.sm,
    paddingHorizontal: SPACING.xs,
  },
  groupTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.gray500,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    flex: 1,
    marginRight: SPACING.sm,
  },
  groupCount: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.gray400,
    backgroundColor: COLORS.gray100,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: RADIUS.full,
    overflow: 'hidden',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.xxxl,
    paddingVertical: SPACING.xxxl * 2,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.gray900,
    marginTop: SPACING.lg,
    marginBottom: SPACING.sm,
  },
  emptySubtext: {
    fontSize: 14,
    color: COLORS.gray400,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 280,
  },
  notesList: {
    gap: SPACING.md,
  },
  noteCard: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: 'transparent',
    ...SHADOWS.sm,
  },
  noteCardHovered: {
    borderColor: COLORS.hoverBorder,
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 3,
  },
  noteCardPressed: {
    opacity: 0.92,
  },
  noteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  noteHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  deleteButton: {
    width: 34,
    height: 34,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: `${COLORS.danger}40`,
    ...SHADOWS.sm,
  },
  noteText: {
    fontSize: 15,
    color: COLORS.gray700,
    lineHeight: 22,
  },
  noteTimestamp: {
    fontSize: 12,
    color: COLORS.gray400,
    fontWeight: '500',
  },
  seeMoreButton: {
    marginTop: SPACING.sm,
    alignSelf: 'flex-start',
    paddingVertical: SPACING.xs,
  },
  seeMoreText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.primary,
    letterSpacing: 0.2,
  },
  skeletonLineWide: {
    height: 16,
    width: '50%',
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.gray200,
    marginBottom: SPACING.md,
  },
  skeletonLine: {
    height: 12,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.gray100,
    marginBottom: SPACING.sm,
  },
  skeletonLineTiny: {
    height: 10,
    width: '30%',
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.gray100,
    marginTop: SPACING.sm,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
  },
  modalContainer: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.xxl,
    padding: SPACING.xxl,
    width: '100%',
    maxWidth: 400,
    ...Platform.select({
      ios: {
        shadowColor: COLORS.shadow,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 24,
      },
      android: {
        elevation: 12,
      },
    }),
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.xs,
  },
  modalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  warningIconWrap: {
    width: 32,
    height: 32,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.dangerLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.gray900,
  },
  modalCloseBtn: {
    padding: SPACING.xs,
  },
  modalSubtitle: {
    fontSize: 14,
    color: COLORS.gray600,
    marginBottom: SPACING.md,
    lineHeight: 20,
  },
  modalPreviewBox: {
    backgroundColor: COLORS.gray50,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
  },
  modalPreviewText: {
    fontSize: 13,
    color: COLORS.gray600,
    lineHeight: 19,
    fontStyle: 'italic',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginTop: SPACING.sm,
  },
  modalButton: {
    flex: 1,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  modalCancelButton: {
    backgroundColor: COLORS.gray100,
  },
  modalCancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.gray600,
  },
  modalDeleteButton: {
    backgroundColor: COLORS.danger,
  },
  modalDeleteText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.white,
  },
  modalButtonDisabled: {
    opacity: 0.6,
  },
  toast: {
    position: 'absolute',
    bottom: SPACING.xxxl,
    left: SPACING.xl,
    right: SPACING.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    ...Platform.select({
      ios: {
        shadowColor: COLORS.shadow,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 12,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  toastSuccess: {
    backgroundColor: COLORS.primary,
  },
  toastError: {
    backgroundColor: COLORS.danger,
  },
  toastText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  toastUndoBtn: {
    marginLeft: SPACING.md,
  },
  toastUndoText: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
});