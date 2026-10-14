import Admin from "../../models/admin.js";
import handleResponse from "../../utils/helper.js";
import { fetchDocumentForAdmin } from "../../services/adminDocumentProxyService.js";

// Admins who may review applicant documents: super admin, or view access on sellers / delivery.
async function canViewApplicantDocuments(adminId) {
  const admin = await Admin.findById(adminId).select("adminType permissions isActive").lean();
  if (!admin || admin.isActive === false) return false;
  if (admin.adminType === "super_admin") return true;

  const perms = admin.permissions || {};
  const read = (section) => (perms instanceof Map ? perms.get(section) : perms[section]) || [];
  return ["sellers", "delivery"].some((section) => read(section).includes("view"));
}

// GET /admin/documents/view?url=<document url>
export const viewDocument = async (req, res) => {
  try {
    if (!(await canViewApplicantDocuments(req.user.id))) {
      return handleResponse(res, 403, "You do not have permission to view documents");
    }

    const { buffer, contentType, fileName } = await fetchDocumentForAdmin(req.query.url);

    res.setHeader("Content-Type", contentType);
    res.setHeader("Content-Length", buffer.length);
    res.setHeader("Content-Disposition", `inline; filename="${fileName.replace(/"/g, "")}"`);
    res.setHeader("Cache-Control", "private, no-store");
    return res.status(200).send(buffer);
  } catch (error) {
    return handleResponse(res, error.statusCode || 500, error.message);
  }
};
