import { Platform } from 'react-native';
import { driver, type Config, type DriveStep, type Driver } from 'driver.js';
import 'driver.js/dist/driver.css';
import './tourTheme.css';

// driver.js is DOM-only — this whole module is a no-op on native (iOS/Android),
// where there's no document/window to attach a highlight overlay to. The app
// only ships onboarding tours on the web/PWA build.
const isWeb = () => Platform.OS === 'web' && typeof window !== 'undefined';

const SEEN_KEY_PREFIX = 'igraphit_tour_seen_';

const readSeen = (tourId: string): boolean => {
  if (!isWeb()) return true;
  try {
    return window.localStorage.getItem(SEEN_KEY_PREFIX + tourId) === 'true';
  } catch {
    // Storage can throw in locked-down/private-browsing contexts — treat as
    // "already seen" so a broken localStorage can't spam the tour every visit.
    return true;
  }
};

const writeSeen = (tourId: string) => {
  if (!isWeb()) return;
  try {
    window.localStorage.setItem(SEEN_KEY_PREFIX + tourId, 'true');
  } catch {
    // Ignore — worst case the tour replays next visit.
  }
};

export const hasSeenTour = (tourId: string): boolean => readSeen(tourId);

// Lets a user re-run a tour on demand (e.g. a "Replay tour" button) instead
// of only ever seeing it once.
export const resetTour = (tourId: string) => {
  if (!isWeb()) return;
  try {
    window.localStorage.removeItem(SEEN_KEY_PREFIX + tourId);
  } catch {
    // Ignore.
  }
};

// Shared look/feel so every tab's tour reads as one product, not four
// separately-configured popovers.
const THEME: Config = {
  animate: true,
  smoothScroll: true,
  overlayColor: '#0f172a',
  overlayOpacity: 0.55,
  stagePadding: 6,
  stageRadius: 12,
  popoverClass: 'igraphit-tour-popover',
  showProgress: true,
  nextBtnText: 'Next →',
  prevBtnText: '← Back',
  doneBtnText: 'Got it',
  // A step whose target hasn't mounted yet (e.g. a conditionally-rendered
  // toolbar button) is skipped rather than left dangling on a missing element.
  skipMissingElement: true,
};

type StartTourOptions = {
  /** Replay even if this tour was already marked seen. */
  force?: boolean;
};

// Only one tour ever runs at a time, so a handful of module-level refs are
// enough to let a step reach "the tour that's currently running" without
// every screen having to pass a Driver instance around.
let activeDriver: Driver | null = null;
let activeTourId: string | null = null;
let waitSignal: string | null = null;
let pendingTourId: string | null = null;

export const startTour = (tourId: string, steps: DriveStep[], options: StartTourOptions = {}) => {
  if (!isWeb() || steps.length === 0) return;
  if (!options.force && hasSeenTour(tourId)) return;

  // Give the screen's own mount/focus effects a tick to finish rendering
  // before driver.js goes looking for the step elements in the DOM.
  requestAnimationFrame(() => {
    activeDriver?.destroy();

    const tourInstance = driver({
      ...THEME,
      steps,
      onDestroyed: () => {
        activeDriver = null;
        activeTourId = null;
        waitSignal = null;
        writeSeen(tourId);
      },
    });
    activeDriver = tourInstance;
    activeTourId = tourId;
    tourInstance.drive();
  });
};

// A step can call this (typically from its `onHighlighted` hook) to say
// "don't advance on the Next click — wait for this specific real action
// instead." Pair it with a `showButtons` config that omits 'next' so the
// user can't just click past it.
export const markTourWaiting = (signal: string) => {
  waitSignal = signal;
};

// Called from wherever that real action actually happens (e.g. a shape
// successfully dropped on the canvas). No-ops harmlessly if no tour is
// waiting on this exact signal — callers don't need to check tour state
// themselves before calling it.
export const resolveTourWait = (signal: string) => {
  if (waitSignal === signal && activeDriver) {
    waitSignal = null;
    activeDriver.moveNext();
  }
};

// A tour finishing on one tab can hand off straight into the next tab's
// tour ("Got it" → next module, continuously) rather than stopping just
// because that next tour was already marked seen from an earlier visit.
// Call this right before navigating away; useOnboardingTour checks it (and
// clears it) the next time that target tour's screen gains focus.
export const scheduleTourOnNextFocus = (tourId: string) => {
  pendingTourId = tourId;
};

export const consumePendingTour = (tourId: string): boolean => {
  if (pendingTourId === tourId) {
    pendingTourId = null;
    return true;
  }
  return false;
};

// For steps whose `onNextClick` navigates to a different route (a real
// screen change, not just scrolling the same page into view) — polls for
// the next step's target to mount, then advances the still-running Driver
// instance. Gives up quietly after `timeoutMs` rather than hanging forever
// if the navigation didn't land where expected.
export const advanceWhenElementAppears = (selector: string, timeoutMs = 4000) => {
  if (!isWeb() || !activeDriver) return;
  const driverRef = activeDriver;
  const start = Date.now();
  const poll = () => {
    if (driverRef !== activeDriver) return; // a different tour took over meanwhile
    if (document.querySelector(selector)) {
      driverRef.moveNext();
      return;
    }
    if (Date.now() - start > timeoutMs) return;
    requestAnimationFrame(poll);
  };
  requestAnimationFrame(poll);
};
