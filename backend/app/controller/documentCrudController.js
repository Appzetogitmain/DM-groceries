import MediaMetadata from '../models/mediaMetadata.js';
import { deleteFromCloudinary } from '../services/mediaService.js';
import handleResponse from '../utils/helper.js';
import logger from '../services/logger.js';

/**
 * GET /api/documents
 * List the authenticated user's own documents with optional filtering and pagination.
 */
export const listDocuments = async (req, res) => {
  try {
    const { entityType, entityId, status, page = 1, limit = 20 } = req.query;
    const filter = {
      uploadedBy: req.user.id,
      isDeleted: false,
    };
    if (entityType) filter.entityType = entityType;
    if (entityId) filter.entityId = entityId;
    if (status) filter.status = status;

    const skip = (Number(page) - 1) * Number(limit);
    const [docs, total] = await Promise.all([
      MediaMetadata.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      MediaMetadata.countDocuments(filter),
    ]);

    return handleResponse(res, 200, 'Documents fetched', {
      documents: docs,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    logger.error('listDocuments error', { message: error.message });
    return handleResponse(res, 500, error.message);
  }
};

/**
 * GET /api/documents/:id
 * Fetch a single document by ID (must belong to the authenticated user).
 */
export const getDocument = async (req, res) => {
  try {
    const doc = await MediaMetadata.findOne({
      _id: req.params.id,
      uploadedBy: req.user.id,
      isDeleted: false,
    }).lean();
    if (!doc) return handleResponse(res, 404, 'Document not found');
    return handleResponse(res, 200, 'Document fetched', doc);
  } catch (error) {
    logger.error('getDocument error', { message: error.message });
    return handleResponse(res, 500, error.message);
  }
};

/**
 * DELETE /api/documents/:id
 * Delete a document from Cloudinary and soft-delete in DB.
 */
export const deleteDocument = async (req, res) => {
  try {
    const doc = await MediaMetadata.findOne({
      _id: req.params.id,
      uploadedBy: req.user.id,
      isDeleted: false,
    });
    if (!doc) return handleResponse(res, 404, 'Document not found');

    // Delete from Cloudinary first (best-effort)
    if (doc.publicId || doc.objectKey) {
      try {
        const cloudResourceType =
          doc.resourceType === 'raw' ? 'raw' : 'image';
        await deleteFromCloudinary(
          doc.publicId || doc.objectKey,
          cloudResourceType
        );
      } catch (cloudErr) {
        logger.warn('Cloudinary delete failed, proceeding with DB soft delete', {
          message: cloudErr.message,
        });
      }
    }

    // Soft delete in DB
    doc.isDeleted = true;
    doc.deletedAt = new Date();
    doc.status = 'deleted';
    await doc.save();

    logger.info('Document deleted', { id: req.params.id, userId: req.user.id });
    return handleResponse(res, 200, 'Document deleted successfully');
  } catch (error) {
    logger.error('deleteDocument error', { message: error.message });
    return handleResponse(res, 500, error.message);
  }
};

/**
 * PATCH /api/documents/:id
 * Update mutable metadata fields: tags, entityId, entityType.
 */
export const updateDocument = async (req, res) => {
  try {
    const { tags, entityId, entityType } = req.body || {};
    const doc = await MediaMetadata.findOne({
      _id: req.params.id,
      uploadedBy: req.user.id,
      isDeleted: false,
    });
    if (!doc) return handleResponse(res, 404, 'Document not found');

    if (Array.isArray(tags)) doc.tags = tags;
    if (entityId) doc.entityId = entityId;
    if (entityType) doc.entityType = entityType;
    await doc.save();

    logger.info('Document updated', { id: req.params.id, userId: req.user.id });
    return handleResponse(res, 200, 'Document updated', doc);
  } catch (error) {
    logger.error('updateDocument error', { message: error.message });
    return handleResponse(res, 500, error.message);
  }
};
