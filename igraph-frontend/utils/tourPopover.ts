import type { Config } from 'driver.js';

// driver.js only knows how to render a title, a description and two buttons.
// Everything else the onboarding shows — the welcome hero, the module
// banners, the "step 2 of 4" eyebrow, the closing check — is added here, on
// top of the popover driver.js already built, from the single
// onPopoverRender hook (wired up in onboardingTour.ts's THEME).
//
// Every string below is static markup owned by this file, never user data,
// so assigning it through innerHTML is safe.

type PopoverDOM = Parameters<NonNullable<Config['onPopoverRender']>>[0];

// The order the tour chain runs in (Home → Create → Reference → Account).
// `key` matches the first segment of each tour id in tours.ts ('home-v4',
// 'create-v6', ...), so a version bump there never needs a change here.
export const TOUR_MODULES = [
  { key: 'home', label: 'Library', blurb: 'Browse every diagram type' },
  { key: 'create', label: 'Create', blurb: 'Build on the canvas' },
  { key: 'reference', label: 'Reference', blurb: 'Look up any term' },
  { key: 'account', label: 'Account', blurb: 'Profile and saved work' },
] as const;

export const moduleIndexOf = (tourId: string | null): number =>
  tourId ? TOUR_MODULES.findIndex((m) => tourId.startsWith(`${m.key}-`)) : -1;

// driver.js builds its popover DOM once and reuses it for every step, so
// anything we add has to be removed again before the next step renders.
const EXTRA_ATTR = 'data-tour-extra';

const make = (tag: string, className: string, html = ''): HTMLElement => {
  const node = document.createElement(tag);
  node.className = className;
  node.setAttribute(EXTRA_ATTR, 'true');
  if (html) node.innerHTML = html;
  return node;
};

const pad = (n: number) => String(n).padStart(2, '0');

// A tiny diagram that draws itself: class box → decision → terminator. Line
// art on purpose — it is the product's own subject, and it needs no image
// asset. Timing lives in tourTheme.css (.s = shape, .l = line, .h = head).
const HERO_ART = `
<svg class="tour-hero-art" viewBox="0 0 320 112" fill="none" aria-hidden="true" focusable="false">
  <g class="s s1"><rect x="16" y="30" width="72" height="52" rx="6"/><path d="M16 47h72M16 64h72"/></g>
  <path class="l l1" pathLength="1" d="M88 56H122"/>
  <path class="h h1" d="M117 51l5 5-5 5"/>
  <g class="s s2"><path d="M160 22l38 34-38 34-38-34z"/></g>
  <path class="l l2" pathLength="1" d="M198 56H232"/>
  <path class="h h2" d="M227 51l5 5-5 5"/>
  <g class="s s3"><rect x="232" y="34" width="72" height="44" rx="22"/></g>
</svg>`;

const DONE_ART = `
<svg class="tour-done-art" viewBox="0 0 72 72" fill="none" aria-hidden="true" focusable="false">
  <circle class="d-disc" cx="36" cy="36" r="28"/>
  <path class="d-check" pathLength="1" d="M24 37l8 8 16-18"/>
</svg>`;

const band = (index: number, eyebrow: string, label: string) =>
  make(
    'div',
    'tour-band',
    `<span class="tour-band-num">${pad(index + 1)}</span>
     <span class="tour-band-text">
       <span class="tour-band-eyebrow">${eyebrow}</span>
       <span class="tour-band-label">${label}</span>
     </span>`
  );

const renderWelcome = (popover: PopoverDOM, skip: () => void) => {
  popover.title.before(make('div', 'tour-hero', HERO_ART));

  const items = TOUR_MODULES.map(
    (m, i) =>
      `<li class="tour-map-item">
         <span class="tour-map-num">${pad(i + 1)}</span>
         <span class="tour-map-text"><strong>${m.label}</strong><span>${m.blurb}</span></span>
       </li>`
  ).join('');
  popover.footer.before(make('ol', 'tour-map', items));

  // The welcome card is the one place a user can decline the whole tour up
  // front, so it gets an explicit, labelled way out instead of only an "X".
  const skipBtn = make('button', 'tour-skip', 'Skip tour') as HTMLButtonElement;
  skipBtn.type = 'button';
  skipBtn.addEventListener('click', skip);
  popover.footer.prepend(skipBtn);
};

export const decoratePopover = (
  popover: PopoverDOM,
  tourId: string | null,
  skip: () => void
) => {
  if (typeof document === 'undefined') return;

  // A step's own popoverClass (welcome / intro / handoff / finish) replaces
  // the tour-wide one from THEME instead of adding to it, so those steps lost
  // `igraphit-tour-popover` — the class every rule in tourTheme.css hangs
  // off — and rendered completely unstyled. Re-adding it here, on every
  // render, keeps the theme applied regardless of which step is showing.
  popover.wrapper.classList.add('igraphit-tour-popover');

  popover.wrapper.querySelectorAll(`[${EXTRA_ATTR}]`).forEach((node) => node.remove());

  const cls = popover.wrapper.classList;
  const idx = moduleIndexOf(tourId);

  if (cls.contains('igraphit-tour-welcome')) {
    renderWelcome(popover, skip);
    return;
  }

  if (cls.contains('igraphit-tour-finish')) {
    popover.title.before(make('div', 'tour-hero tour-hero--done', DONE_ART));
    return;
  }

  if (cls.contains('igraphit-tour-intro') && idx >= 0) {
    popover.title.before(
      band(idx, `Module ${idx + 1} of ${TOUR_MODULES.length}`, TOUR_MODULES[idx].label)
    );
    return;
  }

  if (cls.contains('igraphit-tour-handoff') && idx >= 0 && idx < TOUR_MODULES.length - 1) {
    popover.title.before(band(idx + 1, 'Up next', TOUR_MODULES[idx + 1].label));
    return;
  }

  // Every ordinary step: a four-segment tracker showing where in the whole
  // tour the user is, so a 20-step Create module doesn't feel endless.
  if (idx >= 0) {
    const segments = TOUR_MODULES.map(
      (_, i) => `<i class="${i === idx ? 'is-current' : i < idx ? 'is-done' : ''}"></i>`
    ).join('');
    popover.title.before(
      make(
        'div',
        'tour-eyebrow',
        `<span class="tour-eyebrow-dots" aria-hidden="true">${segments}</span>
         <span class="tour-eyebrow-label">${TOUR_MODULES[idx].label}</span>`
      )
    );
  }
};