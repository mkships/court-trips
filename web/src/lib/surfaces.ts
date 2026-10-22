import type { Sport } from "@/lib/sports";

// Court colours and real dimensions per sport. Kept out of Court.tsx (a client
// component) so server components can read the values too.

export const SURFACES: Record<Sport, { court: string; surround: string }> = {
  tennis: { court: "#2d5d8c", surround: "#3a6e52" },
  pickleball: { court: "#3d7a5e", surround: "#1f456a" },
  padel: { court: "#2662a6", surround: "#182c48" },
};

export const DIMENSIONS: Record<Sport, string> = {
  tennis: "23.77 × 10.97 m",
  pickleball: "13.41 × 6.10 m",
  padel: "20 × 10 m",
};
