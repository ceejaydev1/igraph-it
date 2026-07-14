import React, { createContext, useContext, useState, useCallback, useRef } from 'react';

interface SaveContextType {
  onSave: (() => Promise<void>) | null;
  setSaveHandler: (handler: (() => Promise<void>) | null) => void;
  isSaving: boolean;
  setIsSaving: (saving: boolean) => void;
}

const SaveContext = createContext<SaveContextType>({
  onSave: null,
  setSaveHandler: () => {},
  isSaving: false,
  setIsSaving: () => {},
});

export const SaveProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [onSave, setOnSave] = useState<(() => Promise<void>) | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const saveHandlerRef = useRef<(() => Promise<void>) | null>(null);

  // ✅ FIXED: Only update the handler if it's actually different
  const setSaveHandler = useCallback((handler: (() => Promise<void>) | null) => {
    // Prevent unnecessary updates that could trigger re-renders
    if (saveHandlerRef.current === handler) return;
    saveHandlerRef.current = handler;
    setOnSave(handler);
  }, []);

  return (
    <SaveContext.Provider 
      value={{ 
        onSave: saveHandlerRef.current || null, 
        setSaveHandler, 
        isSaving, 
        setIsSaving 
      }}
    >
      {children}
    </SaveContext.Provider>
  );
};

export const useSave = () => useContext(SaveContext);