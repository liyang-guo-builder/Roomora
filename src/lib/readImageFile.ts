"use client";

/**
 * Read a chosen image File into a downscaled JPEG data URI (client-side).
 * Phone photos are often 5-12 MB; sending them raw blows past the serverless
 * request-body limit and slows generation. We downscale to a sane max edge and
 * re-encode as JPEG, which keeps uploads small and fast. EXIF orientation is
 * honored so portrait phone photos don't come out rotated.
 */
const MAX_EDGE = 1536;
const QUALITY = 0.85;

function rawRead(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error ?? new Error("read_failed"));
    reader.readAsDataURL(file);
  });
}

export async function readImageFile(file: File): Promise<string> {
  try {
    const bitmap = await createImageBitmap(file, {
      imageOrientation: "from-image",
    } as ImageBitmapOptions);
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
    const w = Math.max(1, Math.round(bitmap.width * scale));
    const h = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("no_canvas_ctx");
    ctx.drawImage(bitmap, 0, 0, w, h);
    bitmap.close?.();
    return canvas.toDataURL("image/jpeg", QUALITY);
  } catch {
    // Fallback: only for already-small files (downscale unavailable).
    return rawRead(file);
  }
}
