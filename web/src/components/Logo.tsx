import { useId } from "react";
import { WordmarkArt } from "./Wordmark";

// The "First Light" identity (brand/first-light): a court under a green horizon with the ball as the
// sun, on its own or locked up with the wordmark. Drawn inline so the colours come from the site's
// tokens. The shapes and the lockup measurements are the kit's; change them there, not here.

// The emblem's shapes in its 256 x 256 box. On dark surfaces (`reversed`) the land and court go
// white and the ball stays lime. The court lines and the ball's seam are cut out, so whatever is
// behind the emblem shows through them.
function EmblemArt({ reversed = false }: { reversed?: boolean }) {
  // several emblems can be on one page (header, footer, a hero), so each needs its own mask ids
  const id = useId();
  return (
    <>
      <defs>
        <mask id={`${id}court`} maskUnits="userSpaceOnUse" x="0" y="0" width="256" height="256">
          <rect width="256" height="256" fill="white" />
          <path d="M39 178L91 149M142 228L237 132M57 168L196.43 173M112.77 170L149 147" fill="none" stroke="black" strokeWidth="4" strokeLinejoin="round" />
          <path d="M91 145Q153.5 148 216 146M91 140V152M216 141V157" fill="none" stroke="black" strokeWidth="4.4" strokeLinecap="round" />
        </mask>
        <mask id={`${id}sun`} maskUnits="userSpaceOnUse" x="0" y="0" width="256" height="256">
          <rect width="256" height="256" fill="white" />
          <path d="M129 64C158 84 176 32 201 47" fill="none" stroke="black" strokeWidth="4.3" />
        </mask>
      </defs>
      <circle cx="165" cy="61" r="34" fill="var(--color-ball)" mask={`url(#${id}sun)`} />
      <path d="M26 117C68 86 108 87 149 99C178 108 205 109 230 119L230 128C163 113 89 118 28 137Z" fill={reversed ? "#ffffff" : "var(--color-garden)"} />
      <path
        d="M28 142C85 121 161 116 229 132C223 184 182 222 127 222C78 222 38 190 28 142Z"
        fill={reversed ? "#ffffff" : "var(--color-court)"}
        mask={`url(#${id}court)`}
      />
    </>
  );
}

type Props = { reversed?: boolean; className?: string };

// The emblem alone: where the name is already nearby. The kit's smallest size for it is 64px.
export function Emblem({ reversed, className }: Props) {
  return (
    <svg viewBox="0 0 256 256" role="img" aria-label="Court Trips" className={className}>
      <EmblemArt reversed={reversed} />
    </svg>
  );
}

// Emblem and wordmark together. "horizontal" (644 x 154) is for headers and wide spaces, no narrower
// than 200px; "stacked" (512 x 512) puts the wordmark under the emblem, no narrower than 140px.
// Both boxes carry the kit's clear space, so the artwork starts a little inside the edges.
export function Logo({ layout = "horizontal", reversed, className }: Props & { layout?: "horizontal" | "stacked" }) {
  const stacked = layout === "stacked";
  return (
    <svg viewBox={stacked ? "0 0 512 512" : "0 0 644 154"} role="img" aria-label="Court Trips" className={className}>
      <svg {...(stacked ? { x: 64, y: 12, width: 384, height: 384 } : { x: 0, y: 0, width: 154, height: 154 })} viewBox="0 0 256 256">
        <EmblemArt reversed={reversed} />
      </svg>
      <svg {...(stacked ? { x: 48, y: 378, width: 416, height: 85.8 } : { x: 174, y: 55, width: 455, height: 94 })} viewBox="0 99.21 1074.71 259.7">
        <WordmarkArt reversed={reversed} />
      </svg>
    </svg>
  );
}
