import { useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import type { DriveStep } from 'driver.js';
import { startTour, consumePendingTour } from '../utils/onboardingTour';

// Auto-runs a tab's tour the first time that tab is focused (skips on native —
// see utils/onboardingTour.ts). `ready` lets a screen hold the tour off until
// its own data/skeleton has finished loading, so it isn't pointing at a
// placeholder.
//
// If a previous tour's "Got it" scheduled this tourId via
// scheduleTourOnNextFocus (continuing the tour chain into the next module),
// consumePendingTour forces it to start here even if it was already marked
// seen from an earlier, separate visit.
export function useOnboardingTour(tourId: string, steps: DriveStep[], ready: boolean = true) {
  useFocusEffect(
    useCallback(() => {
      if (!ready) return;
      const forced = consumePendingTour(tourId);
      startTour(tourId, steps, { force: forced });
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [ready, tourId])
  );
}
