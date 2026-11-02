import React, { createContext, useContext, useState, useRef, useEffect, useCallback, useMemo, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as authService from '../services/authService';
import API_BASE_URL from '../constants/api';

export interface LearningNote {
  id: string;
  text: string;
  timestamp: string;
  // ISO instant captured the moment the note was actually created, sent to
  // the server so every device can agree on the same source of truth
  // instead of each device fabricating its own "now" on fetch.
  createdAt?: string;
  diagramId: number;
  diagramTitle: string;
  diagramType: 'UML' | 'SDLC';
  synced?: boolean;
}

interface NotesContextType {
  notes: LearningNote[];
  addNote: (note: Omit<LearningNote, 'id' | 'timestamp'>) => void;
  removeNote: (id: string) => void;
  removeNoteLocal: (id: string) => void;
  deleteNoteServer: (id: string) => Promise<void>;
  restoreNote: (note: LearningNote) => void;
  refreshNotes: () => Promise<void>;
}

const NotesContext = createContext<NotesContextType | undefined>(undefined);

const STORAGE_KEY = '@igraph_saved_notes';

// All devices format in this fixed zone/locale, so the SAME underlying
// instant reads as the SAME string everywhere — a phone in one timezone and
// a browser in another will no longer disagree about what time a note was
// created. Change this if your users are mostly in a different region.
const DISPLAY_TIME_ZONE = 'Asia/Manila';

const formatFixed = (date: Date): string =>
  new Intl.DateTimeFormat('en-US', {
    timeZone: DISPLAY_TIME_ZONE,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(date);

const ensureUniqueIds = (rawNotes: any[]): LearningNote[] => {
  const seen = new Set<string>();
  const result: LearningNote[] = [];
  for (const raw of rawNotes) {
    const base =
      typeof raw.id === 'string' && raw.id
        ? raw.id
        : `note-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    let id = base;
    let counter = 1;
    while (seen.has(id)) {
      id = `${base}-${counter++}`;
    }
    seen.add(id);
    result.push({ ...raw, id });
  }
  return result;
};

const resolveRawDate = (note: any): any =>
  note?.createdAt ??
  note?.created_at ??
  note?.dateCreated ??
  note?.date_created ??
  note?.savedAt ??
  note?.saved_at ??
  note?.timestamp ??
  note?.updatedAt ??
  note?.updated_at ??
  null;

const parseToDate = (rawDate: any): Date | null => {
  if (!rawDate) return null;

  if (typeof rawDate === 'object' && typeof rawDate.toDate === 'function') {
    return rawDate.toDate();
  }
  if (typeof rawDate === 'object' && typeof rawDate.seconds === 'number') {
    return new Date(rawDate.seconds * 1000);
  }
  if (typeof rawDate === 'number') {
    const ms = rawDate < 10_000_000_000 ? rawDate * 1000 : rawDate;
    const parsed = new Date(ms);
    return isNaN(parsed.getTime()) ? null : parsed;
  }

  const parsed = new Date(rawDate);
  return isNaN(parsed.getTime()) ? null : parsed;
};

// BUGFIX: this used to unconditionally fall back to `new Date().toLocaleString()`
// whenever the server note had no resolvable/parseable date — which, combined
// with fetchServerNotes() running on every screen focus, meant the displayed
// "created" time silently advanced to "now" (in THIS device's own locale and
// timezone) on every single refresh. That's why the same note showed a
// different, ever-changing time on different devices/browsers: each one was
// independently stamping its own current moment, not reading a real creation
// time at all.
//
// Now this only ever returns a real, resolved date — formatted identically
// everywhere via formatFixed. It never fabricates "now". Callers decide what
// to show when there's genuinely nothing to resolve (see fetchServerNotes).
const toDisplayTimestamp = (rawDate: any): string | null => {
  const parsed = parseToDate(rawDate);
  return parsed ? formatFixed(parsed) : null;
};

export const NotesProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [notes, setNotes] = useState<LearningNote[]>([]);
  const notesRef = useRef<LearningNote[]>([]);
  useEffect(() => {
    notesRef.current = notes;
  }, [notes]);

  // FIX: stable reference via useCallback([]) — this is what stops the
  // infinite refetch loop that was making the timestamp look "live".
  const syncNote = useCallback(async (
    localId: string,
    payload: Omit<LearningNote, 'id' | 'timestamp' | 'synced'>
  ) => {
    const signedIn = await authService.hasActiveSession();
    if (!signedIn) {
      console.warn(`Note ${localId} not synced: no active session`);
      return;
    }
    try {
      const response = await authService.authFetch(`${API_BASE_URL}/api/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error(`Server responded ${response.status}`);
      const data = await response.json();
      if (data.success && data.data) {
        setNotes((prev) =>
          prev.map((n) =>
            n.id === localId
              ? {
                  ...data.data,
                  // We already have a correct, locally-captured creation
                  // time for this note (set in addNote below) — only
                  // override it if the server actually gives us a real,
                  // resolvable date of its own. Never fall back to "now"
                  // here; n.timestamp is already trustworthy.
                  timestamp: toDisplayTimestamp(resolveRawDate(data.data)) ?? n.timestamp,
                  createdAt: data.data?.createdAt ?? n.createdAt,
                  synced: true,
                }
              : n
          )
        );
      } else {
        throw new Error('Server returned success:false');
      }
    } catch (error) {
      console.warn(`Failed to sync note ${localId} to server:`, error);
    }
  }, []);

  const fetchServerNotes = useCallback(async () => {
    const signedIn = await authService.hasActiveSession();
    if (!signedIn) return;

    // Retry any note that never made it to the server BEFORE we
    // overwrite `notes` with the server's list below — otherwise
    // an unsynced note gets wiped out here instead of retried.
    const unsynced = notesRef.current.filter((n) => n.id.startsWith('local-'));
    for (const n of unsynced) {
      await syncNote(n.id, {
        text: n.text,
        diagramId: n.diagramId,
        diagramTitle: n.diagramTitle,
        diagramType: n.diagramType,
        createdAt: n.createdAt,
      });
    }

    // Snapshot of what we already had for each note id. If the server's
    // payload for a note doesn't carry a usable date (backend hasn't been
    // updated to return `createdAt` yet), we keep the value we already
    // know rather than ever guessing "now".
    const previousById = new Map(notesRef.current.map((n) => [n.id, n]));

    const result = await authService.authFetch(`${API_BASE_URL}/api/notes`);
    if (result.ok) {
      const data = await result.json();
      if (data.success && Array.isArray(data.data)) {
        const formattedNotes = ensureUniqueIds(
          data.data.map((note: any) => {
            const previous = previousById.get(note.id);
            const resolvedTimestamp = toDisplayTimestamp(resolveRawDate(note));
            if (!resolvedTimestamp && !previous) {
              // Truly first time we've ever seen this note and the server
              // sent no usable date at all — nothing to fall back to. This
              // means the backend response for this note is missing a
              // createdAt/created_at field; that's the real fix needed.
              console.warn(
                `Note ${note.id}: server sent no resolvable creation date; backend needs to return createdAt.`
              );
            }
            return {
              ...note,
              timestamp: resolvedTimestamp ?? previous?.timestamp ?? formatFixed(new Date()),
              createdAt: note.createdAt ?? previous?.createdAt,
              synced: true,
            };
          })
        );
        setNotes(formattedNotes);
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(formattedNotes));
      }
    }
  }, [syncNote]);

  useEffect(() => {
    const loadNotes = async () => {
      try {
        const storedNotes = await AsyncStorage.getItem(STORAGE_KEY);
        if (storedNotes) {
          setNotes(ensureUniqueIds(JSON.parse(storedNotes)));
        }
        await fetchServerNotes();
      } catch (error) {
        console.warn('Failed to load notes:', error);
      }
    };

    loadNotes();
  }, [fetchServerNotes]);

  useEffect(() => {
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(notes)).catch((e) =>
      console.warn('Failed to save notes locally:', e)
    );
  }, [notes]);

  const addNote = useCallback(async (note: Omit<LearningNote, 'id' | 'timestamp'>) => {
    const localId = `local-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    // This is the ONE place "now" is actually correct — the note really is
    // being created at this instant. Capture it as a real ISO instant and
    // send it to the server, so every other device reads this same value
    // back instead of fabricating their own.
    const createdAtIso = new Date().toISOString();
    const newNote: LearningNote = {
      ...note,
      id: localId,
      timestamp: formatFixed(new Date(createdAtIso)),
      createdAt: createdAtIso,
      synced: false,
    };
    setNotes((prev) => [newNote, ...prev]);
    await syncNote(localId, { ...note, createdAt: createdAtIso });
  }, [syncNote]);

  const removeNoteLocal = useCallback((id: string) => {
    setNotes((prev) => prev.filter((note) => note.id !== id));
  }, []);

  const deleteNoteServer = useCallback(async (id: string) => {
    if (id.startsWith('local-')) return;
    const signedIn = await authService.hasActiveSession();
    if (!signedIn) return;
    try {
      await authService.authFetch(`${API_BASE_URL}/api/notes/${id}`, {
        method: 'DELETE',
      });
    } catch (error) {
      console.warn('Failed to delete note on server:', error);
    }
  }, []);

  const removeNote = useCallback(async (id: string) => {
    removeNoteLocal(id);
    await deleteNoteServer(id);
  }, [removeNoteLocal, deleteNoteServer]);

  const restoreNote = useCallback((note: LearningNote) => {
    setNotes((prev) => {
      if (prev.some((n) => n.id === note.id)) return prev;
      return [note, ...prev];
    });
  }, []);

  const refreshNotes = useCallback(async () => {
    try {
      await fetchServerNotes();
    } catch (error) {
      console.warn('Failed to refresh notes:', error);
    }
  }, [fetchServerNotes]);

  // FIX: memoized context value — the last piece needed so consumers only
  // re-render when something they actually use has changed.
  const value = useMemo(
    () => ({
      notes,
      addNote,
      removeNote,
      removeNoteLocal,
      deleteNoteServer,
      restoreNote,
      refreshNotes,
    }),
    [notes, addNote, removeNote, removeNoteLocal, deleteNoteServer, restoreNote, refreshNotes]
  );

  return <NotesContext.Provider value={value}>{children}</NotesContext.Provider>;
};

export const useNotes = (): NotesContextType => {
  const context = useContext(NotesContext);
  if (!context) {
    throw new Error('useNotes must be used within a NotesProvider');
  }
  return context;
};