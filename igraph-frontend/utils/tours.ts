import type { DriveStep } from 'driver.js';
import { advanceWhenElementAppears, markTourWaiting, scheduleTourOnNextFocus, destroyForHandoff } from './onboardingTour';

// Bump the trailing version (e.g. -v5) if a tour's steps change enough that
// past users should see it again — startTour() only skips a tour once its
// exact id has been marked seen.

export const HOME_TOUR_ID = 'home-v4';
export const CREATE_TOUR_ID = 'create-v6';
export const REFERENCE_TOUR_ID = 'reference-v4';
export const ACCOUNT_TOUR_ID = 'account-v5';

// The card the Home tour opens to continue onto the Diagram Detail page —
// kept as a constant (rather than importing Home's local DIAGRAMS array)
// so Navbar's replay button can build the same steps without needing
// Home-screen-only state.
export const HOME_TOUR_EXAMPLE_DIAGRAM_ID = 1;

type TourCtx = {
  /** expo-router's useRouter() return value — loosely typed like other
   *  router props in this codebase (see ChangePasswordModal in userAccount.tsx). */
  router: any;
  /** Only meaningful for Create — its shape palette is a different UI on
   *  each layout (always-open desktop panel vs. a closed-by-default mobile
   *  bottom sheet), so the "add a shape" step's copy/behavior branches on it. */
  isDesktop?: boolean;
  /** Mobile-only: Diagram Type/Print/Download live behind a closed "..."
   *  overflow menu, and Download's own format list only opens from inside
   *  that menu — the tour drives both open itself (instead of just
   *  describing them from a closed toggle button) so each item can get its
   *  own highlighted step, same as desktop's always-visible buttons do. */
  openMobileMoreMenu?: () => void;
  openMobileDownloadFormats?: () => void;
  closeMobileDownloadFormats?: () => void;
};

// An un-anchored intro step (no `element`) renders as a plain centered
// popover instead of highlighting anything — the same technique used for
// the closing hand-off step below, and for the same reason: it can't be
// skipped by a missing/hidden target on some platform or screen.
const welcomeStep = (title: string, description: string): DriveStep => ({
  popover: { title, description },
});

// The navbar-orientation steps only ever appear in the Home tour — Create/
// Reference/Account assume you've already seen them. Desktop's top links
// and mobile's bottom dock are two different elements (only one of which
// exists on a given viewport), so both are listed; skipMissingElement
// quietly drops whichever one isn't there.
const NAVBAR_STEPS: DriveStep[] = [
  {
    element: '#tour-navbar-overview',
    popover: {
      title: 'Getting around',
      description: 'Use these tabs to jump between the Diagram Library, Create Diagram, Learning References, and your Account.',
    },
  },
  {
    element: '#tour-navbar-mobile-dock',
    popover: {
      title: 'Getting around',
      description: 'Use this bar to jump between the Diagram Library, Create Diagram, and Learning References. Your Account is up top.',
      side: 'top',
    },
  },
];

// Builds a tour's last step so clicking "Got it" doesn't just close the
// popover — it hands off straight into the next module's tour. No
// `element` here on purpose (same reasoning as welcomeStep) — the mobile
// Create screen hides the shared Navbar entirely, so a step anchored to a
// nav item would get skipped there and onDoneClick would never fire.
// scheduleTourOnNextFocus + the { force } consumed by useOnboardingTour is
// what makes the handoff continuous even if that next tour was already
// marked seen from an earlier, separate visit.
const nextModuleStep = (
  popover: { title: string; description: string },
  router: any,
  nextTourId: string,
  nextRoute: string
): DriveStep => ({
  popover: {
    ...popover,
    onDoneClick: (_el, _step, opts) => {
      // destroyForHandoff (not a plain destroy()) — this is the chain
      // continuing into the next module's tour, not the user's onboarding
      // moment ending, so it must not clear the new-user flag the rest of
      // the chain still depends on. See its own comment in onboardingTour.ts.
      destroyForHandoff(opts.driver);
      scheduleTourOnNextFocus(nextTourId);
      router.push(nextRoute);
    },
  },
});

// Account is the last stop in the Home → Create → Reference → Account loop —
// its last step reads "Finish" instead of "Got it" and just closes out back
// on the Diagram Library, rather than chaining into another tour.
const finishStep = (popover: { title: string; description: string }, router: any): DriveStep => ({
  popover: {
    ...popover,
    doneBtnText: 'Finish',
    onDoneClick: (_el, _step, opts) => {
      // destroy() synchronously fires startTour's onDestroyed (onboardingTour.ts),
      // which already clears the "just signed up" flag that's the only thing
      // letting the tour chain auto-play at all — reaching Finish (or closing
      // out early via X, same handler) means nothing should auto-start again
      // after this, no matter what else changes (tour version bumps, cleared
      // per-tour "seen" keys, etc).
      opts.driver.destroy();
      // navigate, not push — see savedDiagrams.tsx's handleBackPress for why
      // (avoids mounting a duplicate instance of the anchored (tabs) group).
      router.navigate('/(tabs)/home');
    },
  },
});

export function getHomeTourSteps({ router }: TourCtx): DriveStep[] {
  return [
    welcomeStep(
      'Welcome to iGraph IT 👋',
      "Let's take a quick look at your Diagram Library before you dive in."
    ),
    ...NAVBAR_STEPS,
    {
      element: '#tour-home-search',
      popover: {
        title: 'Find a diagram type',
        description: 'Search across all SDLC and UML diagram types by name.',
        side: 'bottom',
        align: 'start',
      },
    },
    {
      element: '#tour-home-tabs',
      popover: {
        title: 'Filter by category',
        description: 'Switch between All, SDLC, and UML to narrow the list down.',
        side: 'bottom',
      },
    },
    {
      element: '#tour-home-card-example',
      popover: {
        title: 'Explore a diagram type',
        description: "Each card shows the diagram's category at a glance. Click Next to open one and see what's inside.",
        side: 'bottom',
        // Custom next: this step hands off to a different screen entirely,
        // so the default "just move to the next step" behavior doesn't
        // apply — we navigate first, then advance once the detail page's
        // own step target has actually mounted. See advanceWhenElementAppears.
        onNextClick: () => {
          router.push(`/(tabs)/diagram/${HOME_TOUR_EXAMPLE_DIAGRAM_ID}`);
          advanceWhenElementAppears('#tour-detail-hero');
        },
      },
    },
    {
      element: '#tour-detail-hero',
      popover: {
        title: 'Diagram details',
        description: 'The name and a quick tagline for this diagram type.',
        side: 'bottom',
      },
    },
    {
      element: '#tour-detail-image',
      popover: {
        title: 'Preview',
        description: 'A sample of what this diagram type looks like once finished.',
        side: 'bottom',
      },
    },
    {
      element: '#tour-detail-video',
      popover: {
        title: 'Video tutorial',
        description: 'Watch a walkthrough of this diagram type in action.',
        side: 'left',
      },
    },
    {
      element: '#tour-detail-shapes-used',
      popover: {
        title: 'Shapes used',
        description: 'A rundown of the shapes this diagram type is built from.',
        side: 'top',
      },
    },
    nextModuleStep(
      {
        title: 'Ready to build one?',
        description: 'Click Got it to head to Create Diagram and start drawing.',
      },
      router,
      CREATE_TOUR_ID,
      '/(tabs)/create'
    ),
  ];
}

export function getCreateTourSteps({
  router,
  isDesktop = true,
  openMobileMoreMenu,
  openMobileDownloadFormats,
  closeMobileDownloadFormats,
}: TourCtx): DriveStep[] {
  // Branches by layout because the shape palette itself is different UI on
  // each: desktop's panel is open by default, so anchoring the step to it
  // and withholding the Next button (until a shape is actually added) works
  // — the stage cutout around the panel lets clicks reach the shape tiles.
  // Mobile's panel is closed by default and driver.js has no cutout at all
  // on an un-anchored step, so trying to gate the same way there just
  // blocks every tap (including the shape palette toggle itself) behind the
  // full-screen overlay. Mobile gets a plain instructional step instead —
  // anchored to the toggle (which does exist) with a normal Next button.
  const addShapeStep: DriveStep = isDesktop
    ? {
        element: '#tour-create-shapes-panel',
        popover: {
          title: 'Add a shape',
          description: 'Drop a shape onto the canvas to continue the tour.',
          side: 'right',
          // No "Next" button — this step only advances once a shape is
          // actually added (see resolveTourWait('create-shape-drop') in
          // create.tsx's handleAddShape), so the properties step below has
          // something real to point at.
          showButtons: ['previous', 'close'],
        },
        onHighlighted: () => markTourWaiting('create-shape-drop'),
      }
    : {
        element: '#tour-create-shapes',
        popover: {
          title: 'Add a shape',
          description: 'Tap here to open the shape palette, then tap a shape to add it to your canvas.',
          side: 'right',
        },
      };

  // New Diagram sits right beside the title on both layouts, so it keeps
  // its own always-visible step. Desktop keeps Diagram Type/Print/Download
  // visible separately too. Mobile collapses those three behind a single
  // overflow ("More") button — see create.tsx's mobileTopBarRight — so the
  // mobile branch below opens that menu itself (openMobileMoreMenu) and
  // gives each item its own step, same as desktop's separate buttons do,
  // instead of just describing them from the closed toggle.
  const newDiagramStep: DriveStep = {
    element: '#tour-create-new',
    popover: {
      title: 'Start a new diagram',
      description: 'Clears the canvas so you can start fresh.',
      side: 'bottom',
    },
  };

  const printDownloadSteps: DriveStep[] = isDesktop
    ? [
        {
          element: '#tour-create-print',
          popover: {
            title: 'Print',
            description: 'Send your diagram straight to a printer.',
            side: 'bottom',
          },
        },
        {
          element: '#tour-create-download',
          popover: {
            title: 'Download',
            description: 'Export your diagram as a PNG, SVG, JPG, or PDF.',
            side: 'bottom',
          },
        },
      ]
    : [
        {
          element: '#tour-create-more',
          popover: {
            title: 'More actions',
            description: "Change your diagram's type, print it, or download it as an image or PDF — all live here.",
            side: 'bottom',
            // Opens the overflow menu itself instead of waiting for a real
            // tap, then waits for its first item to mount before advancing
            // — same pattern as the Home tour's screen-to-screen hand-off
            // (advanceWhenElementAppears), just opening a menu instead of
            // navigating a route.
            onNextClick: () => {
              openMobileMoreMenu?.();
              advanceWhenElementAppears('#tour-create-moremenu-type');
            },
          },
        },
        {
          element: '#tour-create-moremenu-type',
          popover: {
            title: 'Diagram type',
            description: 'Change what kind of diagram this is — flowchart, ERD, sequence, and more.',
            side: 'left',
          },
        },
        {
          element: '#tour-create-moremenu-print',
          popover: {
            title: 'Print',
            description: 'Send your diagram straight to a printer.',
            side: 'left',
          },
        },
        {
          element: '#tour-create-moremenu-download',
          popover: {
            title: 'Download',
            description: 'Export your diagram as an image or document.',
            side: 'left',
            onNextClick: () => {
              openMobileDownloadFormats?.();
              advanceWhenElementAppears('#tour-create-download-formats');
            },
          },
        },
        {
          element: '#tour-create-download-formats',
          popover: {
            title: 'Choose a format',
            description: 'PNG and JPG for images, SVG to keep it scalable, or PDF for a document.',
            side: 'left',
          },
          // Fires moving either direction (Next or Back) — closes the format
          // list so it doesn't stay floating open over whatever step comes
          // next (Multiple pages on desktop; skipped on mobile, so really
          // just Save — see skipMissingElement in onboardingTour.ts's THEME).
          onDeselected: () => closeMobileDownloadFormats?.(),
        },
      ];

  return [
    welcomeStep(
      'Let’s build something',
      "Here's a quick walkthrough of the Create Diagram workspace."
    ),
    newDiagramStep,
    {
      element: '#tour-create-title',
      popover: {
        title: 'Name your diagram',
        description: 'Give it a name — your work saves as you go.',
        side: 'bottom',
      },
    },
    {
      element: '#tour-create-canvas',
      popover: {
        title: 'Your canvas',
        description: 'Tap or click shapes here to move, connect, and edit them.',
        side: 'top',
      },
    },
    {
      element: '#tour-create-issues',
      popover: {
        title: 'Diagram checks',
        description: 'We flag problems here as you go — like an empty diagram or a broken connection. Click it to see details.',
        side: 'bottom',
      },
    },
    {
      element: '#tour-create-shapes',
      popover: {
        title: 'Shape palette',
        description: 'This opens and closes the shape palette.',
        side: 'right',
      },
    },
    addShapeStep,
    {
      element: '#tour-create-properties',
      popover: {
        title: 'Shape properties',
        description: 'With a shape selected, adjust its color, text, size, and more here.',
        side: 'left',
      },
    },
    {
      element: '#tour-create-text',
      popover: {
        title: 'Text',
        description: "Add or edit a shape's text label.",
        side: 'top',
      },
    },
    {
      element: '#tour-create-style',
      popover: {
        title: 'Style',
        description: "Change a shape's color, line style, and more.",
        side: 'top',
      },
    },
    {
      element: '#tour-create-comment',
      popover: {
        title: 'Arrange',
        description: 'Align, arrange, and organize your shapes.',
        side: 'top',
      },
    },
    {
      element: '#tour-create-connectors',
      popover: {
        title: 'Connectors',
        description: 'View and manage the connector lines between shapes.',
        side: 'top',
      },
    },
    {
      element: '#tour-create-undo-redo',
      popover: {
        title: 'Undo & redo',
        description: 'Made a mistake? Step backward or forward through your changes.',
        side: 'bottom',
      },
    },
    {
      element: '#tour-create-zoom',
      popover: {
        title: 'Zoom controls',
        description: 'Zoom in for detail work, or out to see the whole diagram.',
        side: 'top',
      },
    },
    {
      element: '#tour-create-share',
      popover: {
        title: 'Share your diagram',
        description: 'Invite others to view or edit this diagram with you.',
        side: 'bottom',
      },
    },
    ...printDownloadSteps,
    {
      element: '#tour-create-pages',
      popover: {
        title: 'Multiple pages',
        description: 'Add extra pages to split a large diagram into sections.',
        side: 'top',
      },
    },
    {
      element: '#tour-create-save',
      popover: {
        title: 'Save your work',
        description: 'Save any time — or just keep working and let autosave cover you.',
        side: 'bottom',
      },
    },
    nextModuleStep(
      {
        title: 'Need a refresher?',
        description: 'Click Got it to head to Learning References for quick definitions of every diagram type.',
      },
      router,
      REFERENCE_TOUR_ID,
      '/(tabs)/reference'
    ),
  ];
}

export function getReferenceTourSteps({ router }: TourCtx): DriveStep[] {
  return [
    welcomeStep(
      'Learning References',
      "Quick definitions for every diagram type, whenever you need a refresher."
    ),
    {
      element: '#tour-reference-search',
      popover: {
        title: 'Search a term',
        description: 'Look up any UML, SDLC, or general system-analysis term.',
        side: 'bottom',
        align: 'start',
      },
    },
    {
      element: '#tour-reference-categories',
      popover: {
        title: 'Filter by category',
        description: 'Jump straight to UML, SDLC, or General Terms.',
        side: 'bottom',
      },
    },
    {
      element: '#tour-reference-list',
      popover: {
        title: 'Browse definitions',
        description: 'Tap a term to expand its definition in place.',
        side: 'top',
      },
    },
    nextModuleStep(
      {
        title: 'Manage your account',
        description: 'Click Got it to check out your profile, saved diagrams, and settings.',
      },
      router,
      ACCOUNT_TOUR_ID,
      '/(tabs)/userAccount'
    ),
  ];
}

export function getAccountTourSteps({ router }: TourCtx): DriveStep[] {
  return [
    welcomeStep(
      'Your Account',
      "Here's where you manage your profile, saved diagrams, and settings."
    ),
    {
      element: '#tour-account-profile',
      popover: {
        title: 'Your profile',
        description: 'Your name and email are shown here at a glance.',
        side: 'bottom',
      },
    },
    {
      element: '#tour-account-settings',
      popover: {
        title: 'Manage your account',
        description: 'Update your name or change your password from this section.',
        side: 'bottom',
      },
    },
    {
      element: '#tour-account-saved',
      popover: {
        title: 'Saved diagrams',
        description: 'Jump straight to everything you’ve saved.',
        side: 'bottom',
      },
    },
    {
      element: '#tour-account-privacy',
      popover: {
        title: 'Privacy & terms',
        description: 'Review how your data is handled and our terms of use.',
        side: 'bottom',
      },
    },
    {
      element: '#tour-account-about',
      popover: {
        title: 'About Us',
        description: 'Learn more about the team behind iGraph IT.',
        side: 'bottom',
      },
    },
    finishStep(
      {
        title: 'You’re all set!',
        description: 'Click Finish to head back to the Diagram Library and browse or start something new.',
      },
      router
    ),
  ];
}

