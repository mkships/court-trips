"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, type KeyboardEvent } from "react";
import { addPhoto, makeCoverPhoto, type PhotoOwner } from "@/app/admin/(panel)/actions";
import { INPUT } from "@/components/submit/fields";
import { shrinkPhoto } from "@/lib/shrink-photo";
import { BTN_OUTLINE } from "@/lib/ui";

// Uploads are shrunk in the browser first, so a phone photo fits in one request; the server then
// makes the site's sizes (src/lib/photo-store.mjs keeps at most 1800px anyway).
const UPLOAD_MAX_PX = 1800;
const UPLOAD_MAX_BYTES = 3 * 1024 * 1024;

export const PHOTOS_INTRO = "The first is the cover. New photos are added straight away; tick any to take off when you save.";

// A listing's photos inside its editor's form. Removing rides along with Save (the remove_photo
// checkboxes); adding and choosing the cover happen at once, and leave what's typed elsewhere alone.
export function PhotoManager({ owner, id, photos }: { owner: PhotoOwner; id: string; photos: { id: number; url: string }[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [notes, setNotes] = useState<{ ok: boolean; text: string }[]>([]);
  const fileInput = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState("");

  async function run(label: string, work: () => Promise<{ ok: boolean; text: string }[]>) {
    setBusy(label);
    setNotes([]);
    try {
      setNotes(await work());
    } catch {
      setNotes([{ ok: false, text: "Something went wrong. Check your connection and try again." }]);
    }
    setBusy(null);
    router.refresh();
  }

  function addFiles(files: FileList | null) {
    if (!files?.length) return;
    const picked = [...files];
    run("Adding photos…", async () => {
      const out: { ok: boolean; text: string }[] = [];
      let added = 0;
      for (const [i, file] of picked.entries()) {
        setBusy(`Adding photo ${i + 1} of ${picked.length}…`);
        let blob: Blob;
        try {
          blob = await shrinkPhoto(file, UPLOAD_MAX_PX, UPLOAD_MAX_BYTES);
        } catch {
          out.push({ ok: false, text: `${file.name}: couldn't read it. JPEG, PNG or WebP photos work best.` });
          continue;
        }
        const form = new FormData();
        form.set("file", blob, "photo.jpg");
        const result = await addPhoto(owner, id, form);
        if (result.ok) added++;
        else out.push({ ok: false, text: `${file.name}: ${result.message}` });
      }
      if (added) out.unshift({ ok: true, text: added === 1 ? "1 photo added." : `${added} photos added.` });
      if (fileInput.current) fileInput.current.value = "";
      return out;
    });
  }

  function addUrl() {
    const address = url.trim();
    if (!address) return;
    run("Fetching the photo…", async () => {
      const form = new FormData();
      form.set("url", address);
      const result = await addPhoto(owner, id, form);
      if (result.ok) setUrl("");
      return [{ ok: result.ok, text: result.ok ? "1 photo added." : result.message }];
    });
  }

  function makeCover(photoId: number) {
    run("Changing the cover…", async () => {
      const result = await makeCoverPhoto(owner, id, photoId);
      return [{ ok: result.ok, text: result.message }];
    });
  }

  // Enter in the address box adds the photo instead of saving the whole listing
  function onUrlKey(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== "Enter") return;
    event.preventDefault();
    addUrl();
  }

  return (
    <div className="grid gap-6" aria-busy={busy != null}>
      {photos.length === 0 ? (
        <p className="text-ink-soft">No photos yet.</p>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
          {photos.map((ph, i) => (
            <li key={ph.id}>
              <div className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element -- admin thumbnails, any source */}
                <img src={ph.url} alt={`Photo ${i + 1}`} className="aspect-[4/3] w-full rounded-xl bg-rule object-cover" />
                {i === 0 && <span className="absolute top-2 left-2 rounded-full bg-white px-2 py-0.5 text-[0.75rem] font-bold">Cover</span>}
              </div>
              <div className="mt-1.5 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-[0.875rem]">
                <label className="flex cursor-pointer items-center gap-2">
                  <input type="checkbox" name="remove_photo" value={ph.id} className="size-4 accent-ink" />
                  Remove
                </label>
                {i > 0 && (
                  <button
                    type="button"
                    disabled={busy != null}
                    onClick={() => makeCover(ph.id)}
                    className="font-semibold text-ink-soft underline decoration-ink/35 decoration-[1.5px] underline-offset-4 transition-colors hover:text-ink hover:decoration-ink disabled:opacity-50"
                  >
                    Make cover
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="grid gap-4 rounded-2xl border border-rule p-4 sm:grid-cols-2">
        <div>
          <label htmlFor="add-photo-files" className="block text-[0.9375rem] font-semibold">
            Upload photos
          </label>
          <p className="mt-0.5 text-[0.875rem] text-ink-soft">Landscape, at least 600 pixels wide. Pick several at once.</p>
          {/* no name: these go up on their own, not with the listing's Save */}
          <input
            ref={fileInput}
            id="add-photo-files"
            type="file"
            accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
            multiple
            disabled={busy != null}
            onChange={(e) => addFiles(e.target.files)}
            className="mt-2 block w-full text-[0.9375rem] file:mr-3 file:rounded-full file:border file:border-rule file:bg-white file:px-4 file:py-2 file:font-semibold file:transition-colors hover:file:border-ink hover:file:bg-mist"
          />
        </div>
        <div>
          <label htmlFor="add-photo-url" className="block text-[0.9375rem] font-semibold">
            Or paste a photo&apos;s address
          </label>
          <p className="mt-0.5 text-[0.875rem] text-ink-soft">The image itself (right-click, Copy image address), not the page it&apos;s on.</p>
          <div className="mt-2 flex gap-2">
            <input
              id="add-photo-url"
              type="url"
              inputMode="url"
              placeholder="https://…"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={onUrlKey}
              disabled={busy != null}
              className={INPUT}
            />
            <button type="button" onClick={addUrl} disabled={busy != null || !url.trim()} className={`shrink-0 px-4 py-2 text-[0.9375rem] ${BTN_OUTLINE}`}>
              Add
            </button>
          </div>
        </div>
        <div role="status" className="text-[0.875rem] sm:col-span-2 empty:hidden">
          {busy && <p className="text-ink-soft">{busy}</p>}
          {notes.map((n, i) => (
            <p key={i} className={n.ok ? "font-semibold text-ok-ink" : "text-alert"}>
              {n.text}
            </p>
          ))}
        </div>
      </div>
    </div>
  );
}
