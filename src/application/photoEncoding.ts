import { PHOTO_JPEG_QUALITY, PHOTO_MAX_EDGE_PX } from "../domain/body/types";

/**
 * REVIEW-001 Phase 1a: every progress photo, taken or imported, is decoded
 * and redrawn through a canvas before it is stored. Only pixels survive the
 * redraw: EXIF location, device and any other metadata in the original file
 * never reach storage or a backup. The camera's orientation tag is applied
 * while decoding, so the stored image is upright without needing that tag.
 * Larger images are scaled to PHOTO_MAX_EDGE_PX on the long edge, which also
 * bounds backup size. The browser's own decoder and canvas — no image library.
 */
export interface EncodedPhoto {
  image: Blob;
  width: number;
  height: number;
}

export async function reencodePhoto(file: Blob): Promise<EncodedPhoto> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    throw new Error("PHOTO_UNREADABLE: That file couldn't be read as a photo.");
  }
  try {
    const scale = Math.min(1, PHOTO_MAX_EDGE_PX / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("PHOTO_ENCODE_FAILED: This browser couldn't prepare the photo.");
    context.drawImage(bitmap, 0, 0, width, height);
    const image = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", PHOTO_JPEG_QUALITY));
    if (!image) throw new Error("PHOTO_ENCODE_FAILED: This browser couldn't prepare the photo.");
    return { image, width, height };
  } finally {
    bitmap.close();
  }
}
