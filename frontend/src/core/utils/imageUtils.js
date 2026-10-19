const CLOUDINARY_REGEX = /res\.cloudinary\.com/i;
const CLOUDINARY_UPLOAD_SEGMENT_REGEX = /\/upload\/([^/]+)\//i;

/**
 * Appends Cloudinary optimisation transforms to a URL.
 * Safe to call on any URL — non-Cloudinary URLs are returned unchanged.
 */
export function applyCloudinaryTransform(url, params = "f_auto,q_auto,w_400,dpr_auto") {
  if (!url || !CLOUDINARY_REGEX.test(url)) return url;
  const match = url.match(CLOUDINARY_UPLOAD_SEGMENT_REGEX);
  if (!match) return url;

  const segmentAfterUpload = match[1] || "";
  const alreadyHasTransforms =
    segmentAfterUpload.includes(",") ||
    /^[a-z]{1,4}_[^/]+$/i.test(segmentAfterUpload);

  if (alreadyHasTransforms) return url;

  // Insert transform before the segment after `/upload/` (often `v123...`).
  return url.replace(CLOUDINARY_UPLOAD_SEGMENT_REGEX, `/upload/${params}/$1/`);
}

export function isCloudinaryUrl(url) {
  return !!url && CLOUDINARY_REGEX.test(url);
}

export function buildCloudinarySrcSet(
  url,
  entries,
  baseParams = "f_auto,q_auto,c_fill,g_auto",
) {
  if (!isCloudinaryUrl(url) || !Array.isArray(entries) || entries.length === 0)
    return undefined;

  return entries
    .map(({ w, h }) => {
      const params = [
        baseParams,
        typeof w === "number" ? `w_${w}` : null,
        typeof h === "number" ? `h_${h}` : null,
      ]
        .filter(Boolean)
        .join(",");

      const href = applyCloudinaryTransform(url, params) || url;
      const descriptor = typeof w === "number" ? `${w}w` : "";
      return descriptor ? `${href} ${descriptor}` : href;
    })
    .join(", ");
}

/**
 * Compresses an image (File or base64/dataURL) using an HTML5 Canvas.
 * Validates maximum input size (default: 5MB).
 * Resizes down to maxWidth x maxHeight (default: 800x800) preserving aspect ratio.
 * Encodes as JPEG at specified quality (default: 0.8).
 * Returns Promise<string> (compressed base64 Data URL).
 */
export async function compressImage(source, options = {}) {
  const {
    maxWidth = 800,
    maxHeight = 800,
    quality = 0.8,
    maxSizeBytes = 5 * 1024 * 1024, // 5MB
    mimeType = "image/jpeg",
  } = options;

  let dataUrl = "";
  let originalSize = 0;

  if (source instanceof File || source instanceof Blob) {
    originalSize = source.size;
    if (originalSize > maxSizeBytes) {
      throw new Error(`Image size must be up to ${(maxSizeBytes / (1024 * 1024)).toFixed(0)} MB`);
    }
    dataUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error("Failed to read image file"));
      reader.readAsDataURL(source);
    });
  } else if (typeof source === "string") {
    dataUrl = source;
    const base64Content = dataUrl.includes(",") ? dataUrl.split(",")[1] : dataUrl;
    originalSize = Math.round((base64Content.length * 3) / 4);
    if (originalSize > maxSizeBytes) {
      throw new Error(`Image size must be up to ${(maxSizeBytes / (1024 * 1024)).toFixed(0)} MB`);
    }
  } else {
    throw new Error("Unsupported image source");
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      try {
        let width = img.width;
        let height = img.height;

        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          return resolve(dataUrl);
        }

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(img, 0, 0, width, height);

        const compressedDataUrl = canvas.toDataURL(mimeType, quality);
        resolve(compressedDataUrl);
      } catch (err) {
        resolve(dataUrl);
      }
    };
    img.onerror = () => reject(new Error("Failed to load image for compression"));
    img.src = dataUrl;
  });
}

