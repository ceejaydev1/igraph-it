import { Platform } from 'react-native';
import { driver, type Config, type DriveStep, type Driver } from 'driver.js';
import 'driver.js/dist/driver.css';
import './tourTheme.css';
import { getCachedUserSync } from '../services/authService';

// driver.js is DOM-only — this whole module is a no-op on native (iOS/Android),
// where there's no document/window to attach a highlight overlay to. The app
// only ships onboarding tours on the web/PWA build.
const isWeb = () => Platform.OS === 'web' && typeof window !== 'undefined';

const SEEN_KEY_PREFIX = 'igraphit_tour_seen_';

// Scoped by account, not just tour — a shared computer (a school lab PC is
// exactly this) otherwise breaks onboarding entirely: student A finishes the
// tour, which marks it "seen" for that *browser*; student B then signs up
// for their own, genuinely new account on the same machine, and their tour
// silently never plays, because the seen-flag has no idea these are two
// different people. Falls back to a shared 'anon' bucket only if no user is
// cached yet (shouldn't normally happen — see getCachedUserSync's own
// comment), which just means that one edge case behaves like the old
// browser-only scoping instead of failing outright.
const seenKey = (tourId: string): string => {
  const uid = getCachedUserSync()?.uid || 'anon';
  return `${SEEN_KEY_PREFIX}${tourId}_${uid}`;
};

const readSeen = (tourId: string): boolean => {
  if (!isWeb()) return true;
  try {
    return window.localStorage.getItem(seenKey(tourId)) === 'true';
  } catch {
    // Storage can throw in locked-down/private-browsing contexts — treat as
    // "already seen" so a broken localStorage can't spam the tour every visit.
    return true;
  }
};

const writeSeen = (tourId: string) => {
  if (!isWeb()) return;
  try {
    window.localStorage.setItem(seenKey(tourId), 'true');
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
    window.localStorage.removeItem(seenKey(tourId));
  } catch {
    // Ignore.
  }
};

// Onboarding auto-plays only for someone who just created an account, never
// for a returning sign-in — a fresh browser/device otherwise looks identical
// to a brand-new signup (no tour-seen keys either way), which used to make
// the tour auto-start for existing users too. The two real "account just
// created" checkpoints (see verify-otp.tsx and the Google-signup branch of
// authService.googleAuth's callers) set this; the tour chain's own Finish
// step clears it, so it can't outlive one full run through.
const NEW_USER_KEY = 'igraphit_new_user_onboarding';

export const markNewUserForOnboarding = () => {
  if (!isWeb()) return;
  try {
    window.localStorage.setItem(NEW_USER_KEY, 'true');
  } catch {
    // Ignore — worst case this signup doesn't get the auto-played tour.
  }
};

export const clearNewUserOnboarding = () => {
  if (!isWeb()) return;
  try {
    window.localStorage.removeItem(NEW_USER_KEY);
  } catch {
    // Ignore.
  }
};

const isNewUserPendingOnboarding = (): boolean => {
  if (!isWeb()) return false;
  try {
    return window.localStorage.getItem(NEW_USER_KEY) === 'true';
  } catch {
    return false;
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

// destroy() ends a tour for two very different reasons, both of which route
// through the exact same onDestroyed callback below with no way to tell them
// apart on their own: (1) WE end it ourselves — replacing a stale instance
// right before starting a new one (below), or a chain hand-off step moving
// on to the next module's tour (tours.ts's nextModuleStep) — the "new user"
// onboarding moment is still very much in progress; or (2) the *user* ends
// it — clicking X/Escape/the overlay, or reaching the chain's real final
// Finish step — their onboarding moment is genuinely over. Only (2) should
// ever clear the new-user flag; clearing it on (1) too (an earlier version
// of this file did exactly that) wiped the flag the instant the *first*
// tour in the chain handed off to the second one, long before the user
// actually finished anything. destroyForHandoff marks case (1) so
// onDestroyed can tell the two apart.
let isHandoffDestroy = false;

export const destroyForHandoff = (driverInstance: Driver) => {
  isHandoffDestroy = true;
  driverInstance.destroy();
};

export const startTour = (tourId: string, steps: DriveStep[], options: StartTourOptions = {}) => {
  if (!isWeb() || steps.length === 0) return;
  // `force` is only ever passed by the tour chain's own hand-off (already
  // gated on the new-user flag being what started the chain in the first
  // place) and by the manual "Replay tour" button (which should always
  // work, new user or not) — so only the unforced, auto-play path needs
  // the new-user check.
  if (!options.force) {
    if (!isNewUserPendingOnboarding()) return;
    if (hasSeenTour(tourId)) return;
  }

  // Give the screen's own mount/focus effects a tick to finish rendering
  // before driver.js goes looking for the step elements in the DOM.
  requestAnimationFrame(() => {
    if (activeDriver) destroyForHandoff(activeDriver);

    const tourInstance = driver({
      ...THEME,
      steps,
      onDestroyed: () => {
        activeDriver = null;
        activeTourId = null;
        waitSignal = null;
        writeSeen(tourId);
        if (isHandoffDestroy) {
          // We ended this one ourselves to move on — the chain (or a fresh
          // replacement instance) continues, so the new-user flag stays put.
          isHandoffDestroy = false;
        } else {
          // A genuine end: the user closed it (X/Escape/overlay) or reached
          // the chain's real Finish step (finishStep in tours.ts calls plain
          // destroy(), not destroyForHandoff, specifically so it lands here).
          // Either way, nothing should auto-start again after this.
          clearNewUserOnboarding();
        }
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
