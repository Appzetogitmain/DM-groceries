import express from 'express';
import {
    submitDeliveryLead,
    getDeliveryLeads,
    updateDeliveryLead,
    deleteDeliveryLead
} from '../controller/deliveryLeadController.js';
import { verifyToken, allowRoles, requirePermission } from '../middleware/authMiddleware.js';
import { createRateLimiter, byIp } from '../middleware/rateLimiter.js';

const submitLimiter = createRateLimiter({
    namespace: 'delivery_lead_submit',
    windowMs: 60 * 60 * 1000,
    max: 5,
    keyGenerator: byIp,
    message: 'Too many requests. Please try again later.'
});

// Mounted at /delivery-leads
export const publicDeliveryLeadRouter = express.Router();
publicDeliveryLeadRouter.post('/', submitLimiter, submitDeliveryLead);

// Mounted at /admin/delivery-leads
export const adminDeliveryLeadRouter = express.Router();
adminDeliveryLeadRouter.use(verifyToken, allowRoles('admin'));
adminDeliveryLeadRouter.get('/', requirePermission('delivery', 'view'), getDeliveryLeads);
adminDeliveryLeadRouter.patch('/:id', requirePermission('delivery', 'create'), updateDeliveryLead);
adminDeliveryLeadRouter.delete('/:id', requirePermission('delivery', 'create'), deleteDeliveryLead);

