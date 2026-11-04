// Photos are stored as "/photos/<slug>/<n>-<hash>.jpg". In production they're served from
// Vercel Blob (NEXT_PUBLIC_PHOTO_BASE_URL, printed by `npm run photos:upload`); without it,
// e.g. in local development, they come from public/photos.
const BASE = process.env.NEXT_PUBLIC_PHOTO_BASE_URL?.trim().replace(/\/$/, "") ?? "";

// Photos from operator submissions are already full Blob URLs and are used as they are.
export const photoUrl = (path: string) => (/^https?:\/\//.test(path) ? path : `${BASE}${path}`);
