import { useCallback } from 'react';
import { Platform } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

export function usePageTitle(pageName: string) {
  useFocusEffect(
    useCallback(() => {
      if (Platform.OS === 'web') {
        document.title = `${pageName} | iGraph IT`;
      }
    }, [pageName])
  );
}