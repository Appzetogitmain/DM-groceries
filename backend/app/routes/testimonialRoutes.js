import express from 'express';
import {
    getPublicTestimonials,
    submitTestimonial,
    getAdminTestimonials,
    createTestimonial,
    updateTestimonial,
    deleteTestimonial
} from '../controller/testimonialController.js';
import { verifyToken, allowRoles, optionalVerifyToken, requirePermission } from '../middleware/authMiddleware.js';
import { createRateLimiter, byIp } from '../middleware/rateLimiter.js';

const submitLimiter = createRateLimiter({
    namespace: 'testimonial_submit',
    windowMs: 60 * 60 * 1000,
    max: 5,
    keyGenerator: byIp,
    message: 'Too many submissions. Please try again later.'
});

// Mounted at /testimonials
export const publicTestimonialRouter = express.Router();
publicTestimonialRouter.get('/', getPublicTestimonials);
publicTestimonialRouter.post('/', optionalVerifyToken, submitLimiter, submitTestimonial);

// Mounted at /admin/testimonials
export const adminTestimonialRouter = express.Router();
adminTestimonialRouter.use(verifyToken, allowRoles('admin'));
adminTestimonialRouter.get('/', requirePermission('testimonials', 'view'), getAdminTestimonials);
adminTestimonialRouter.post('/', requirePermission('testimonials', 'create'), createTestimonial);
adminTestimonialRouter.put('/:id', requirePermission('testimonials', 'create'), updateTestimonial);
adminTestimonialRouter.delete('/:id', requirePermission('testimonials', 'delete'), deleteTestimonial);
