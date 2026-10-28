import express from 'express';
import { verifyToken } from '../middleware/authMiddleware.js';
import {
  listDocuments,
  getDocument,
  deleteDocument,
  updateDocument,
} from '../controller/documentCrudController.js';

const router = express.Router();

// All routes require authentication
router.get('/', verifyToken, listDocuments);           // GET /api/documents
router.get('/:id', verifyToken, getDocument);          // GET /api/documents/:id
router.patch('/:id', verifyToken, updateDocument);     // PATCH /api/documents/:id
router.delete('/:id', verifyToken, deleteDocument);    // DELETE /api/documents/:id

export default router;
