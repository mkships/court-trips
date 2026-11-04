"use server";

import { del, put } from "@vercel/blob";
import { after } from "next/server";
import { db } from "@/db";
import { submissions, type SubmissionPhoto } from "@/db/schema";
import { notifyNewSubmission } from "@/lib/notify";
import { fieldErrors, formToObject, submissionSchema, toRetreat, type FieldErrors } from "@/lib/submission";
import { MAX_PHOTOS, PHOTO_MAX_BYTES, PHOTOS_MAX_TOTAL_BYTES } from "@/lib/submission-options";
import { verifyTurnstile } from "@/lib/turnstile";

export type SubmitResult = { ok: true } | { ok: false; message: string; errors?: FieldErrors };

const TRY_AGAIN = "Something went wrong on our side and your listing wasn't saved. Please try again in a minute.";

// Width and height from a JPEG's frame header; null when the bytes aren't a JPEG.
// The browser re-encodes every photo as JPEG before upload, so anything else is refused.
function jpegSize(bytes: Uint8Array) {
  if (bytes[0] !== 0xff || bytes[1] !== 0xd8) return null;
  for (let i = 2; i + 9 < bytes.length; ) {
    if (bytes[i] !== 0xff) return null;
    const marker = bytes[i + 1];
    const length = (bytes[i + 2] << 8) | bytes[i + 3];
    // SOF0–SOF15, except DHT (C4), JPG (C8) and DAC (CC)
    if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker))
      return { height: (bytes[i + 5] << 8) | bytes[i + 6], width: (bytes[i + 7] << 8) | bytes[i + 8] };
    i += 2 + length;
  }
  return null;
}

async function readPhotos(form: FormData) {
  const files = form.getAll("photos").filter((f): f is File => f instanceof File && f.size > 0);
  if (files.length > MAX_PHOTOS) return { error: `Up to ${MAX_PHOTOS} photos, please` };
  if (files.reduce((n, f) => n + f.size, 0) > PHOTOS_MAX_TOTAL_BYTES) return { error: "Those photos are too large together; try fewer" };
  const photos: { bytes: Uint8Array; width: number; height: number }[] = [];
  for (const file of files) {
    // a little slack over the browser's target, which it can't always hit exactly
    if (file.size > PHOTO_MAX_BYTES * 1.25) return { error: "One of the photos is too large" };
    const bytes = new Uint8Array(await file.arrayBuffer());
    const size = jpegSize(bytes);
    if (!size) return { error: "One of the files isn't a photo we can use" };
    photos.push({ bytes, ...size });
  }
  return { photos };
}

export async function submitProgram(form: FormData): Promise<SubmitResult> {
  // a field people can't see; whatever fills it in is a bot, and gets no hint it was caught
  if (String(form.get("website") ?? "")) return { ok: true };

  if (!(await verifyTurnstile(form.get("cf-turnstile-response")?.toString() ?? null)))
    return { ok: false, message: "We couldn't confirm you're not a bot. Please complete the check and send it again." };

  const parsed = submissionSchema.safeParse(formToObject(form));
  const read = await readPhotos(form);
  if (!parsed.success || "error" in read) {
    const errors = parsed.success ? {} : fieldErrors(parsed.error);
    if ("error" in read) errors.photos = read.error;
    return { ok: false, message: "Some details need another look.", errors };
  }

  if (!db) {
    console.error("[submission] no DATABASE_URL; run `npx neon checkout dev` to save submissions locally");
    return { ok: false, message: TRY_AGAIN };
  }

  const id = crypto.randomUUID();
  const v = parsed.data;
  const data = toRetreat(v);
  const saved: SubmissionPhoto[] = [];
  try {
    if (read.photos.length && !process.env.BLOB_READ_WRITE_TOKEN && !process.env.VERCEL) {
      console.warn(`[submission] no BLOB_READ_WRITE_TOKEN, so ${read.photos.length} photos weren't stored`);
    } else {
      for (const [n, photo] of read.photos.entries()) {
        // unguessable names: unreviewed photos aren't linked from anywhere public
        const blob = await put(`submissions/${id}/${n}.jpg`, Buffer.from(photo.bytes), {
          access: "public",
          addRandomSuffix: true,
          contentType: "image/jpeg",
        });
        saved.push({ url: blob.url, pathname: blob.pathname, width: photo.width, height: photo.height });
      }
    }
    await db.insert(submissions).values({ id, submitterName: v.submitter_name, submitterEmail: v.submitter_email, data, photos: saved });
  } catch (error) {
    console.error("[submission] not saved:", error);
    if (saved.length) await del(saved.map((p) => p.url)).catch(() => {});
    return { ok: false, message: TRY_AGAIN };
  }

  // the visitor sees "thanks" straight away; the email goes once the response has been sent
  after(() =>
    notifyNewSubmission({ id, submitterName: v.submitter_name, submitterEmail: v.submitter_email, data, photoCount: saved.length }).catch(
      (error) => console.error("[submission] saved, but the email failed:", error),
    ),
  );
  return { ok: true };
}
