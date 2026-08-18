import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
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
}

const NotesContext = createContext<NotesContextType | undefined>(undefined);

const STORAGE_KEY = '@igraph_saved_notes';

// Safely convert Firestore Timestamp / ISO string / Date to display string
const toDisplayTimestamp = (rawDate: any): string => {
  if (!rawDate) return new Date().toLocaleString();
  if (typeof rawDate === 'string') {
    const parsed = new Date(rawDate);
    return isNaN(parsed.getTime()) ? new Date().toLocaleString() : parsed.toLocaleString();
  }
  if (typeof rawDate === 'number') {
    const parsed = new Date(rawDate);
    return isNaN(parsed.getTime()) ? new Date().toLocaleString() : parsed.toLocaleString();
  }
  if (typeof rawDate.toDate === 'function') {
    // Firestore Timestamp
    return rawDate.toDate().toLocaleString();
  }
  const parsed = new Date(rawDate);
  return isNaN(parsed.getTime()) ? new Date().toLocaleString() : parsed.toLocaleString();
};

export const NotesProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [notes, setNotes] = useState<LearningNote[]>([]);

  // Load local notes first, then fetch from server if authenticated
  useEffect(() => {
    const loadNotes = async () => {
      try {
        const storedNotes = await AsyncStorage.getItem(STORAGE_KEY);
        if (storedNotes) {
          setNotes(JSON.parse(storedNotes));
        }

        // If signed in, fetch from backend to sync cross-device
        const signedIn = await authService.hasActiveSession();
        if (signedIn) {
          const result = await authService.authFetch(`${API_BASE_URL}/api/notes`);
          if (result.ok) {
            const data = await result.json();
            if (data.success && Array.isArray(data.data)) {
              // Format timestamps safely
              const formattedNotes = data.data.map((note: any) => ({
                ...note,
                timestamp: toDisplayTimestamp(note.createdAt || note.timestamp),
              }));
              setNotes(formattedNotes);
              await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(formattedNotes));
            }
          }
        }
      } catch (error) {
        console.warn('Failed to load notes:', error);
      }
    };

    loadNotes();
  }, []);

  // Persist to local storage whenever notes change
  useEffect(() => {
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(notes)).catch((e) =>
      console.warn('Failed to save notes locally:', e)
    );
  }, [notes]);

  const addNote = async (note: Omit<LearningNote, 'id' | 'timestamp'>) => {
    // Optimistic local update
    const newNote: LearningNote = {
      ...note,
      id: `local-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      timestamp: new Date().toLocaleString(),
    };
    setNotes((prev) => [newNote, ...prev]);

    // If authenticated, sync to backend
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
          // Replace the temporary local note with the server one
          setNotes((prev) =>
            prev.map((n) => {
              if (n.id === newNote.id) {
                return {
                  ...data.data,
                  timestamp: toDisplayTimestamp(data.data.createdAt || data.data.timestamp),
                };
              }
              return n;
            })
          );
        }
      } catch (error) {
        console.warn('Failed to sync note to server:', error);
        // Keep local note; it will be replaced on next sync
      }
    }
  };

  const removeNote = async (id: string) => {
    setNotes((prev) => prev.filter((note) => note.id !== id));

    // If authenticated and the note exists on server (id doesn't start with 'local-'), delete from backend
    if (!id.startsWith('local-')) {
      const signedIn = await authService.hasActiveSession();
      if (signedIn) {
        try {
          await authService.authFetch(`${API_BASE_URL}/api/notes/${id}`, {
            method: 'DELETE',
          });
        } catch (error) {
          console.warn('Failed to delete note on server:', error);
        }
      }
    }
  };

  return (
    <NotesContext.Provider value={{ notes, addNote, removeNote }}>
      {children}
    </NotesContext.Provider>
  );
};

export const useNotes = (): NotesContextType => {
  const context = useContext(NotesContext);
  if (!context) {
    throw new Error('useNotes must be used within a NotesProvider');
  }
  return context;
};