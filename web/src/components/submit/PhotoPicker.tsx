"use client";

import { useEffect, useRef, useState } from "react";
import { ErrorText, invalid } from "@/components/submit/fields";
import { MAX_PHOTOS, PHOTO_MAX_BYTES, PHOTO_MAX_PX, PHOTOS_MAX_TOTAL_BYTES } from "@/lib/submission-options";

export type PickedPhoto = { id: string; blob: Blob; preview: string; name: string };

// Shrinks a photo in the browser to at most PHOTO_MAX_PX on its longest side, as a JPEG under
// PHOTO_MAX_BYTES, so five of them fit in one request. Also applies the camera's rotation.
async function shrink(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  const scale = Math.min(1, PHOTO_MAX_PX / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("no canvas");
  ctx.fillStyle = "#fff"; // transparent PNGs get a white background, not black
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  for (const quality of [0.85, 0.75, 0.65, 0.55]) {
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", quality));
    if (blob && blob.size <= PHOTO_MAX_BYTES) return blob;
  }
  throw new Error("too large");
}

export function PhotoPicker({ photos, onChange, error }: { photos: PickedPhoto[]; onChange: (p: PickedPhoto[]) => void; error?: string }) {
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const latest = useRef(photos);
  useEffect(() => {
    latest.current = photos;
  });
  // free the previews' memory when the form goes away
  useEffect(() => () => latest.current.forEach((p) => URL.revokeObjectURL(p.preview)), []);

  async function add(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true);
    setProblem(null);
    const room = MAX_PHOTOS - photos.length;
    const picked = [...files].slice(0, room);
    const added: PickedPhoto[] = [];
    const failed: string[] = [];
    for (const file of picked) {
      try {
        const blob = await shrink(file);
        added.push({ id: crypto.randomUUID(), blob, preview: URL.createObjectURL(blob), name: file.name });
      } catch {
        failed.push(file.name);
      }
    }
    const next = [...photos, ...added];
    while (next.reduce((n, p) => n + p.blob.size, 0) > PHOTOS_MAX_TOTAL_BYTES) {
      const dropped = next.pop()!;
      URL.revokeObjectURL(dropped.preview);
      failed.push(dropped.name);
    }
    onChange(next);
    const notes = [];
    if (files.length > room) notes.push(`Only ${MAX_PHOTOS} photos fit, so we kept the first ${room > 0 ? room : 0} you picked.`);
    if (failed.length) notes.push(`Couldn't use ${failed.join(", ")}. JPEG or PNG photos work best.`);
    setProblem(notes.join(" ") || null);
    setBusy(false);
    if (input.current) input.current.value = "";
  }

  function remove(id: string) {
    const gone = photos.find((p) => p.id === id);
    if (gone) URL.revokeObjectURL(gone.preview);
    onChange(photos.filter((p) => p.id !== id));
  }

  return (
    <div>
      <label htmlFor="photos" className="block text-[0.9375rem] font-semibold">
        Photos <span className="font-normal text-ink-soft">(optional, up to {MAX_PHOTOS})</span>
      </label>
      <p className="mt-0.5 max-w-[60ch] text-[0.875rem] text-ink-soft">
        Courts, coaching, the place you stay. Landscape photos at least 1,200 pixels wide look best. The first one is the
        cover.
      </p>
      {photos.length > 0 && (
        <ul className="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-5">
          {photos.map((p, i) => (
            <li key={p.id} className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element -- local preview of a file that isn't uploaded yet */}
              <img src={p.preview} alt={`Photo ${i + 1}: ${p.name}`} className="aspect-[4/3] w-full rounded-xl object-cover" />
              {i === 0 && <span className="absolute top-2 left-2 rounded-full bg-white px-2 py-0.5 text-[0.75rem] font-bold">Cover</span>}
              <button
                type="button"
                onClick={() => remove(p.id)}
                aria-label={`Remove photo ${i + 1}`}
                className="absolute top-2 right-2 grid size-7 place-items-center rounded-full bg-white shadow hover:bg-mist"
              >
                <svg viewBox="0 0 12 12" className="size-2.5" aria-hidden="true">
                  <path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
              </button>
            </li>
          ))}
        </ul>
      )}
      {photos.length < MAX_PHOTOS && (
        <div className="mt-3">
          <input
            ref={input}
            id="photos"
            type="file"
            accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
            multiple
            disabled={busy}
            onChange={(e) => add(e.target.files)}
            className="block w-full text-[0.9375rem] file:mr-3 file:rounded-full file:border file:border-ink file:bg-white file:px-4 file:py-2 file:font-semibold hover:file:bg-mist"
            {...invalid("photos", error)}
          />
          {busy && <p className="mt-1.5 text-[0.875rem] text-ink-soft">Preparing photos…</p>}
        </div>
      )}
      {problem && <p className="mt-1.5 text-[0.875rem] text-ink-soft">{problem}</p>}
      <ErrorText name="photos" error={error} />
    </div>
  );
}
