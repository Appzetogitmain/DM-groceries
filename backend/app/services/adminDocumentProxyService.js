import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { v2 as cloudinary } from "cloudinary";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const UPLOADS_ROOT = path.resolve(__dirname, "../../uploads");

/**
 * Lets admins view uploaded documents (seller / delivery KYC).
 *
 * Cloudinary blocks public delivery of PDFs on many accounts ("Restrict
 * delivery of PDF and ZIP files"), so a plain https URL to a PDF answers 401.
 * We resolve a short-lived, signed download URL server-side and stream the file
 * back inline. Only this account's Cloudinary URLs are accepted (no open proxy).
 *
 * Also supports documents stored on local server disk storage (/uploads/documents/...).
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

/**
 * Parses a local-server document URL or relative path such as:
 *   http://localhost:5000/uploads/documents/delivery/filename.pdf
 *   or /uploads/documents/delivery/filename.pdf
 * Returns null when the URL does not contain /uploads/.
 */
function parseLocalServerUrl(rawUrl) {
  if (!rawUrl) return null;
  const str = String(rawUrl).trim();
  let pathname = "";
  let fullUrl = str;
  try {
    const url = new URL(str, "http://localhost:5000");
    pathname = url.pathname;
    fullUrl = url.toString();
  } catch {
    pathname = str;
  }
  if (!pathname.includes("/uploads/")) return null;
  const ext = pathname.split(".").pop()?.toLowerCase() || "";
  const fileName = pathname.split("/").pop() || "document";
  return { fetchUrl: fullUrl, pathname, ext, fileName };
}

export async function fetchDocumentForAdmin(rawUrl) {
  // --- Try Cloudinary first ---
  const parsed = parseCloudinaryUrl(rawUrl);
  if (parsed) {
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

  // --- Fallback: local server disk storage (e.g. /uploads/documents/delivery/...) ---
  const local = parseLocalServerUrl(rawUrl);
  if (local) {
    // 1. Try reading directly from local disk first
    const uploadIndex = local.pathname.indexOf("/uploads/");
    if (uploadIndex !== -1) {
      const relPath = local.pathname.slice(uploadIndex + "/uploads/".length);
      const diskPath = path.resolve(UPLOADS_ROOT, relPath);
      // Ensure safe path resolution within UPLOADS_ROOT
      if (diskPath.startsWith(UPLOADS_ROOT) && fs.existsSync(diskPath)) {
        const buffer = fs.readFileSync(diskPath);
        return {
          buffer,
          contentType: MIME_BY_EXT[local.ext] || "application/octet-stream",
          fileName: local.fileName,
        };
      }
    }

    // 2. If not on local disk, try fetching via HTTP
    try {
      const upstream = await fetch(local.fetchUrl);
      if (upstream.ok) {
        return {
          buffer: Buffer.from(await upstream.arrayBuffer()),
          contentType: MIME_BY_EXT[local.ext] || upstream.headers.get("content-type") || "application/octet-stream",
          fileName: local.fileName,
        };
      }
    } catch {
      // Fall through to error
    }

    const err = new Error("The document file could not be retrieved from server storage");
    err.statusCode = 502;
    throw err;
  }

  // --- Neither Cloudinary nor local server URL ---
  const err = new Error("Only documents stored on this platform can be viewed");
  err.statusCode = 400;
  throw err;
}
