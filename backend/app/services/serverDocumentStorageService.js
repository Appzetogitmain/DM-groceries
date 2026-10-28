import fs from "fs";
import path from "path";
import crypto from "crypto";
import multer from "multer";
import { fileURLToPath } from "url";
import logger from "./logger.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Base directory for local uploads
export const UPLOADS_ROOT = path.resolve(__dirname, "../../uploads");
export const DOCUMENTS_ROOT = path.resolve(UPLOADS_ROOT, "documents");

export const DOCUMENT_SUBFOLDERS = {
  DELIVERY: path.join(DOCUMENTS_ROOT, "delivery"),
  SELLER: path.join(DOCUMENTS_ROOT, "seller"),
  GENERAL: path.join(DOCUMENTS_ROOT, "general"),
};

// Ensure directories exist synchronously at module load
for (const dir of [UPLOADS_ROOT, DOCUMENTS_ROOT, ...Object.values(DOCUMENT_SUBFOLDERS)]) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// Allowed MIME types for documents (PDFs and common image scans)
export const ALLOWED_DOCUMENT_MIME_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/jpg",
]);

export const MAX_DOCUMENT_FILE_SIZE = 15 * 1024 * 1024; // 15 MB

/**
 * Filter to only allow PDFs and image documents.
 */
function documentFileFilter(_req, file, cb) {
  const mime = String(file.mimetype || "").toLowerCase().trim();
  const ext = path.extname(file.originalname || "").toLowerCase();

  const isPdf = mime === "application/pdf" || ext === ".pdf";
  const isImage = mime.startsWith("image/") || [".jpg", ".jpeg", ".png", ".webp"].includes(ext);

  if (isPdf || isImage) {
    return cb(null, true);
  }

  const error = new Error("Invalid document format. Only PDF and image files (JPG, PNG, WEBP) are allowed.");
  error.statusCode = 400;
  return cb(error, false);
}

/**
 * Creates a Multer upload instance configured for disk storage in a specific subfolder.
 *
 * @param {"delivery" | "seller" | "general"} subfolderType
 */
export function createDocumentUploader(subfolderType = "general") {
  const targetDir = DOCUMENT_SUBFOLDERS[subfolderType.toUpperCase()] || DOCUMENT_SUBFOLDERS.GENERAL;

  const storage = multer.diskStorage({
    destination: (_req, _file, cb) => {
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }
      cb(null, targetDir);
    },
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname || "").toLowerCase() || ".pdf";
      const randomHex = crypto.randomBytes(8).toString("hex");
      const baseName = path
        .basename(file.originalname || "document", ext)
        .replace(/[^a-zA-Z0-9_-]/g, "_")
        .slice(0, 30);
      const filename = `${Date.now()}-${randomHex}-${baseName}${ext}`;
      cb(null, filename);
    },
  });

  return multer({
    storage,
    fileFilter: documentFileFilter,
    limits: {
      fileSize: MAX_DOCUMENT_FILE_SIZE,
    },
  });
}

/**
 * Formats full or relative URL for a saved document file.
 */
export function buildDocumentUrl(req, relativeOrLocalPath) {
  if (!relativeOrLocalPath) return "";

  // Normalize slashes
  const normalized = String(relativeOrLocalPath).replace(/\\/g, "/");
  const uploadIndex = normalized.indexOf("/uploads/");
  const relativeUploadPath = uploadIndex !== -1 ? normalized.slice(uploadIndex) : normalized;

  // If already a full http(s) URL
  if (/^https?:\/\//i.test(normalized)) {
    return normalized;
  }

  const baseOrigin =
    process.env.APP_BASE_URL ||
    (req ? `${req.protocol}://${req.get("host")}` : `http://localhost:${process.env.PORT || 5000}`);

  return `${baseOrigin.replace(/\/+$/, "")}${relativeUploadPath.startsWith("/") ? "" : "/"}${relativeUploadPath}`;
}

/**
 * Deletes a document file from the server disk.
 *
 * Accepts full URLs (e.g., http://localhost:5000/uploads/documents/...)
 * or relative paths (e.g., /uploads/documents/delivery/file.pdf).
 *
 * Prevents path traversal outside of UPLOADS_ROOT.
 *
 * @param {string} fileUrlOrPath
 * @returns {Promise<boolean>} true if deleted or safely skipped, false on unexpected error
 */
export async function deleteServerDocumentFile(fileUrlOrPath) {
  if (!fileUrlOrPath || typeof fileUrlOrPath !== "string") {
    return false;
  }

  try {
    let cleanPath = fileUrlOrPath.trim();

    // If it's a URL, extract pathname
    if (/^https?:\/\//i.test(cleanPath)) {
      try {
        const parsed = new URL(cleanPath);
        cleanPath = decodeURIComponent(parsed.pathname);
      } catch {
        // Continue with raw string
      }
    }

    // Must target /uploads/
    const uploadIndex = cleanPath.indexOf("/uploads/");
    if (uploadIndex === -1 && !cleanPath.startsWith("uploads/")) {
      // Not a local upload file (might be external URL like old Cloudinary)
      return false;
    }

    const relativePath = uploadIndex !== -1 ? cleanPath.slice(uploadIndex) : `/${cleanPath}`;
    const resolvedPath = path.resolve(UPLOADS_ROOT, `.${relativePath.replace(/^\/uploads/, "")}`);

    // Security check: ensure path does not traverse outside UPLOADS_ROOT
    if (!resolvedPath.startsWith(UPLOADS_ROOT)) {
      logger.warn("Security alert: Attempted path traversal in deleteServerDocumentFile", {
        fileUrlOrPath,
        resolvedPath,
      });
      return false;
    }

    // Check if file exists on disk
    if (fs.existsSync(resolvedPath)) {
      await fs.promises.unlink(resolvedPath);
      logger.info("Successfully deleted server document file", { resolvedPath });
      return true;
    } else {
      logger.debug("Server document file did not exist on disk, skipped unlink", { resolvedPath });
      return true;
    }
  } catch (error) {
    logger.error("Failed to delete server document file", {
      fileUrlOrPath,
      message: error.message,
    });
    return false;
  }
}

export default {
  UPLOADS_ROOT,
  DOCUMENTS_ROOT,
  DOCUMENT_SUBFOLDERS,
  ALLOWED_DOCUMENT_MIME_TYPES,
  MAX_DOCUMENT_FILE_SIZE,
  createDocumentUploader,
  buildDocumentUrl,
  deleteServerDocumentFile,
};
