import express from 'express';
import {
    submitContactMessage,
    getContactMessages,
    updateContactMessage,
    deleteContactMessage
} from '../controller/contactController.js';
import { verifyToken, allowRoles, requirePermission } from '../middleware/authMiddleware.js';
import { createRateLimiter, byIp } from '../middleware/rateLimiter.js';

const submitLimiter = createRateLimiter({
    namespace: 'contact_submit',
    windowMs: 60 * 60 * 1000,
    max: 5,
    keyGenerator: byIp,
    message: 'Too many messages. Please try again later.'
});

// Mounted at /contact
export const publicContactRouter = express.Router();
publicContactRouter.post('/', submitLimiter, submitContactMessage);

// Mounted at /admin/contact-messages (uses the existing "support" permission section)
export const adminContactRouter = express.Router();
adminContactRouter.use(verifyToken, allowRoles('admin'));
adminContactRouter.get('/', requirePermission('support', 'view'), getContactMessages);
adminContactRouter.patch('/:id', requirePermission('support', 'create'), updateContactMessage);
adminContactRouter.delete('/:id', requirePermission('support', 'create'), deleteContactMessage);
