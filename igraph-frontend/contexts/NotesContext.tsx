import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as authService from '../services/authService';
import API_BASE_URL from '../constants/api';

export interface LearningNote {
  id: string;
  text: string;
  timestamp: string;
  diagramId: number;
  diagramTitle: string;
  diagramType: 'UML' | 'SDLC';
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

const toDisplayTimestamp = (rawDate: any): string => {
  if (!rawDate) return new Date().toLocaleString();

  if (typeof rawDate === 'object' && typeof rawDate.toDate === 'function') {
    return rawDate.toDate().toLocaleString();
  }
  if (typeof rawDate === 'object' && typeof rawDate.seconds === 'number') {
    return new Date(rawDate.seconds * 1000).toLocaleString();
  }

  if (typeof rawDate === 'string') {
    const parsed = new Date(rawDate);
    return isNaN(parsed.getTime()) ? new Date().toLocaleString() : parsed.toLocaleString();
  }

  if (typeof rawDate === 'number') {
    const ms = rawDate < 10_000_000_000 ? rawDate * 1000 : rawDate;
    const parsed = new Date(ms);
    return isNaN(parsed.getTime()) ? new Date().toLocaleString() : parsed.toLocaleString();
  }

  const parsed = new Date(rawDate);
  return isNaN(parsed.getTime()) ? new Date().toLocaleString() : parsed.toLocaleString();
};

export const NotesProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [notes, setNotes] = useState<LearningNote[]>([]);

  // FIX: stable reference via useCallback([]) — this is what stops the
  // infinite refetch loop that was making the timestamp look "live".
  const fetchServerNotes = useCallback(async () => {
    const signedIn = await authService.hasActiveSession();
    if (!signedIn) return;
    const result = await authService.authFetch(`${API_BASE_URL}/api/notes`);
    if (result.ok) {
      const data = await result.json();
      if (data.success && Array.isArray(data.data)) {
        // console.log('raw note from server:', data.data[0]);
        const formattedNotes = ensureUniqueIds(
          data.data.map((note: any) => ({
            ...note,
            timestamp: toDisplayTimestamp(resolveRawDate(note)),
          }))
        );
        setNotes(formattedNotes);
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(formattedNotes));
      }
    }
  }, []);

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
    const newNote: LearningNote = {
      ...note,
      id: `local-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      timestamp: new Date().toLocaleString(),
    };
    setNotes((prev) => [newNote, ...prev]);

    const signedIn = await authService.hasActiveSession();
    if (signedIn) {
      try {
        const response = await authService.authFetch(`${API_BASE_URL}/api/notes`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(note),
        });
        const data = await response.json();
        if (data.success && data.data) {
          setNotes((prev) =>
            prev.map((n) => {
              if (n.id === newNote.id) {
                return {
                  ...data.data,
                  timestamp: toDisplayTimestamp(resolveRawDate(data.data)),
                };
              }
              return n;
            })
          );
        }
      } catch (error) {
        console.warn('Failed to sync note to server:', error);
      }
    }
  }, []);

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