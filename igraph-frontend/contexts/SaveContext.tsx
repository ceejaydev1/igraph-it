import React, { createContext, useContext, useState, useCallback, useRef } from 'react';

interface SaveContextType {
  onSave: (() => Promise<void>) | null;
  setSaveHandler: (handler: (() => Promise<void>) | null) => void;
  isSaving: boolean;
  setIsSaving: (saving: boolean) => void;
  // Flushes the active diagram's in-progress edits to this device's local
  // storage. Registered by create.tsx (see its pendingAutosaveFlushRef),
  // and awaited by anything that's about to navigate somewhere the create
  // screen won't survive — signing out replaces the whole (tabs) route
  // group with (auth), which unmounts create.tsx (and everything in it)
  // rather than just backgrounding it like an ordinary tab switch, so its
  // own focus-loss autosave can't be trusted to run first. Awaiting this
  // before that navigation closes that race outright, independent of
  // whatever React Navigation's blur/unmount ordering happens to do.
  onFlushDraft: (() => Promise<void>) | null;
  setFlushHandler: (handler: (() => Promise<void>) | null) => void;
}

const SaveContext = createContext<SaveContextType>({
  onSave: null,
  setSaveHandler: () => {},
  isSaving: false,
  setIsSaving: () => {},
  onFlushDraft: null,
  setFlushHandler: () => {},
});

export const SaveProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [onSave, setOnSave] = useState<(() => Promise<void>) | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const saveHandlerRef = useRef<(() => Promise<void>) | null>(null);
  const [onFlushDraft, setOnFlushDraft] = useState<(() => Promise<void>) | null>(null);
  const flushHandlerRef = useRef<(() => Promise<void>) | null>(null);

  // ✅ FIXED: Only update the handler if it's actually different
  const setSaveHandler = useCallback((handler: (() => Promise<void>) | null) => {
    // Prevent unnecessary updates that could trigger re-renders
    if (saveHandlerRef.current === handler) return;
    saveHandlerRef.current = handler;
    setOnSave(handler);
  }, []);

  const setFlushHandler = useCallback((handler: (() => Promise<void>) | null) => {
    if (flushHandlerRef.current === handler) return;
    flushHandlerRef.current = handler;
    setOnFlushDraft(handler);
  }, []);

  return (
    <SaveContext.Provider
      value={{
        onSave: saveHandlerRef.current || null,
        setSaveHandler,
        isSaving,
        setIsSaving,
        onFlushDraft: flushHandlerRef.current || null,
        setFlushHandler,
      }}
    >
      {children}
    </SaveContext.Provider>
  );
};

export const useSave = () => useContext(SaveContext);