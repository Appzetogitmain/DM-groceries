import { v2 as cloudinary } from "cloudinary";

/**
 * Lets admins view uploaded documents (seller / delivery KYC).
 *
 * Cloudinary blocks public delivery of PDFs on many accounts ("Restrict
 * delivery of PDF and ZIP files"), so a plain https URL to a PDF answers 401.
 * We resolve a short-lived, signed download URL server-side and stream the file
 * back inline. Only this account's Cloudinary URLs are accepted (no open proxy).
 */

const MIME_BY_EXT = {
  pdf: "application/pdf",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  gif: "image/gif",
};

function configureCloudinary() {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
}

/**
 * Parses https://res.cloudinary.com/<cloud>/<resource_type>/<type>/[v123/]<public_id>.<ext>
 * Returns null when the URL is not one of this account's Cloudinary assets.
 */
export function parseCloudinaryUrl(rawUrl) {
  let url;
  try {
    url = new URL(String(rawUrl || "").trim());
  } catch {
    return null;
  }

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  if (url.protocol !== "https:" || url.hostname !== "res.cloudinary.com" || !cloudName) {
    return null;
  }

  const parts = url.pathname.split("/").filter(Boolean).map(decodeURIComponent);
  if (parts[0] !== cloudName || parts.length < 4) return null;

  const [, resourceType, type, ...rest] = parts;
  if (!["image", "raw", "video"].includes(resourceType)) return null;

  if (/^v\d+$/.test(rest[0])) rest.shift();
  const last = rest.pop();
  if (!last) return null;

  const dot = last.lastIndexOf(".");
  const hasExt = dot > 0;
  const ext = hasExt ? last.slice(dot + 1).toLowerCase() : "";
  // Raw assets keep their extension as part of the public id.
  const lastId = resourceType === "raw" || !hasExt ? last : last.slice(0, dot);

  return {
    resourceType,
    type,
    publicId: [...rest, lastId].join("/"),
    ext,
    originalUrl: url.toString(),
  };
}

export async function fetchDocumentForAdmin(rawUrl) {
  const parsed = parseCloudinaryUrl(rawUrl);
  if (!parsed) {
    const err = new Error("Only documents stored on this platform can be viewed");
    err.statusCode = 400;
    throw err;
  }

  configureCloudinary();

  // Public images are fetched as-is. Everything else (PDFs) goes through a
  // signed API download that is not subject to the PDF delivery restriction.
  const needsSignedDownload = parsed.ext === "pdf" || parsed.resourceType === "raw";
  const fetchUrl = needsSignedDownload
    ? cloudinary.utils.private_download_url(
        parsed.publicId,
        parsed.resourceType === "raw" ? undefined : parsed.ext,
        {
          resource_type: parsed.resourceType,
          type: parsed.type,
          expires_at: Math.floor(Date.now() / 1000) + 300,
        },
      )
    : parsed.originalUrl;

  const upstream = await fetch(fetchUrl);
  if (!upstream.ok) {
    const err = new Error("The document could not be retrieved from storage");
    err.statusCode = 502;
    throw err;
  }

  return {
    buffer: Buffer.from(await upstream.arrayBuffer()),
    contentType: MIME_BY_EXT[parsed.ext] || upstream.headers.get("content-type") || "application/octet-stream",
    fileName: `${parsed.publicId.split("/").pop()}${parsed.ext ? `.${parsed.ext}` : ""}`,
  };
}
