// Shrinks a photo in the browser to at most `maxPx` on its longest side, as a JPEG under `maxBytes`,
// so uploads fit in a request (Vercel's cap is 4.5 MB). Also applies the camera's rotation.
export async function shrinkPhoto(file: File, maxPx: number, maxBytes: number): Promise<Blob> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  const scale = Math.min(1, maxPx / Math.max(bitmap.width, bitmap.height));
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
    if (blob && blob.size <= maxBytes) return blob;
  }
  throw new Error("too large");
}
