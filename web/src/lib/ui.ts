// Shared control styles, so the same kind of control looks and behaves the same everywhere.
//
// The rules:
// - Anything with a border (outline buttons, pills, inputs, choice cards) hovers the same way:
//   the border goes from rule to ink and the fill from white to mist.
// - Solid buttons darken one step on hover and one more when pressed.
// - Colour changes take Tailwind's default 150ms. Nothing snaps and nothing is slower.
// - Disabled controls sit at half opacity and don't react to hover.
// - Focus is the global 3px outline (globals.css); components don't draw their own rings.
// - Corners: rounded-full for buttons and pills, rounded-xl for fields, rounded-2xl for tiles
//   and panels, rounded-3xl for large surfaces (hero, search bar, booking card).

const DISABLED = "disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50";
const BORDER_HOVER = "border border-rule bg-white transition-colors hover:border-ink hover:bg-mist";

// The main action on a page (book, search): optic yellow, darker on hover.
export const BTN_PRIMARY = `inline-flex items-center justify-center gap-2 rounded-full bg-ball font-extrabold text-ink transition-colors hover:bg-ball-hover active:bg-ball-press ${DISABLED}`;

// Secondary solid action (send the form, back home).
export const BTN_DARK = `inline-flex items-center justify-center gap-2 rounded-full bg-ink font-semibold text-white transition-colors hover:bg-ink-hover active:bg-ink ${DISABLED}`;

// Outlined button.
export const BTN_OUTLINE = `inline-flex items-center justify-center gap-2 rounded-full font-semibold active:bg-rule ${BORDER_HOVER} ${DISABLED}`;

// A quiet button with no border (remove a row, admin nav).
export const BTN_GHOST = `inline-flex items-center justify-center gap-2 rounded-full font-semibold text-ink-soft transition-colors hover:bg-mist hover:text-ink ${DISABLED}`;

// A pill you choose between (sport, date). Selected is solid ink: mark it with aria-pressed or aria-current.
export const PILL = `inline-flex items-center justify-center gap-2 rounded-full font-semibold ${BORDER_HOVER} aria-pressed:border-ink aria-pressed:bg-ink aria-pressed:text-white [&[aria-current]]:border-ink [&[aria-current]]:bg-ink [&[aria-current]]:text-white`;

// Text inputs, selects and textareas. The fill goes back to white while typing.
export const INPUT = `block w-full rounded-xl px-3.5 py-2.5 text-[1rem] placeholder:text-ink-soft/60 focus:bg-white aria-invalid:border-alert aria-invalid:hover:border-alert disabled:opacity-50 ${BORDER_HOVER}`;

// A checkbox or radio drawn as a card. Selected is mist with an ink ring; focus outlines the whole card.
export const CHOICE = `flex cursor-pointer items-start gap-2.5 rounded-xl px-3.5 py-2.5 has-checked:border-ink has-checked:bg-mist has-checked:shadow-[inset_0_0_0_1px_var(--color-ink)] has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ink ${BORDER_HOVER}`;

// A text link: a faint underline that turns solid on hover.
export const LINK =
  "font-semibold underline decoration-ink/35 decoration-[1.5px] underline-offset-4 transition-colors hover:decoration-ink";

// A quieter link (back links, "more" links): soft text that darkens.
export const LINK_QUIET = "font-semibold text-ink-soft transition-colors hover:text-ink";

// Small label chip on a photo.
export const CHIP = "rounded-full bg-white px-3 py-1 text-[0.8125rem] font-semibold";
