import express from 'express';
import {
    submitSellerLead,
    getSellerLeads,
    updateSellerLead,
    deleteSellerLead
} from '../controller/sellerLeadController.js';
import { verifyToken, allowRoles, requirePermission } from '../middleware/authMiddleware.js';
import { createRateLimiter, byIp } from '../middleware/rateLimiter.js';

const submitLimiter = createRateLimiter({
    namespace: 'seller_lead_submit',
    windowMs: 60 * 60 * 1000,
    max: 5,
    keyGenerator: byIp,
    message: 'Too many requests. Please try again later.'
});

// Mounted at /seller-leads
export const publicSellerLeadRouter = express.Router();
publicSellerLeadRouter.post('/', submitLimiter, submitSellerLead);

// Mounted at /admin/seller-leads
export const adminSellerLeadRouter = express.Router();
adminSellerLeadRouter.use(verifyToken, allowRoles('admin'));
adminSellerLeadRouter.get('/', requirePermission('sellers', 'view'), getSellerLeads);
adminSellerLeadRouter.patch('/:id', requirePermission('sellers', 'create'), updateSellerLead);
adminSellerLeadRouter.delete('/:id', requirePermission('sellers', 'create'), deleteSellerLead);

