// Shared control styles, so the same kind of control looks and hovers the same everywhere.

// The main action on a page (book, search): optic yellow, darker on hover.
export const BTN_PRIMARY =
  "inline-flex items-center justify-center gap-2 rounded-full bg-ball font-extrabold text-ink transition-colors hover:bg-ball-hover active:bg-ball-press";

// Secondary solid action (send the form, back home).
export const BTN_DARK =
  "inline-flex items-center justify-center gap-2 rounded-full bg-ink font-semibold text-white transition-colors hover:bg-ink-hover disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-ink";

// Outlined button or pill: the border darkens and the fill greys on hover.
export const BTN_OUTLINE =
  "inline-flex items-center justify-center gap-2 rounded-full border border-rule bg-white font-semibold transition-colors hover:border-ink hover:bg-mist";

// A text link: a faint underline that turns solid on hover.
export const LINK =
  "font-semibold underline decoration-ink/35 decoration-[1.5px] underline-offset-4 transition-colors hover:decoration-ink";
