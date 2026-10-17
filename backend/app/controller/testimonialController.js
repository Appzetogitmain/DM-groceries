import Testimonial from '../models/testimonial.js';
import { handleResponse } from '../utils/helper.js';
import getPagination from '../utils/pagination.js';
import { buildSearchRegex } from '../utils/regex.js';

const PUBLIC_FIELDS = 'name city rating message createdAt';
const STATUSES = ['pending', 'approved', 'rejected'];

const cleanInput = (body = {}) => {
    const rating = Math.round(Number(body.rating));
    return {
        name: String(body.name || '').trim().slice(0, 80),
        city: String(body.city || '').trim().slice(0, 80),
        message: String(body.message || '').trim().slice(0, 500),
        rating: Number.isFinite(rating) ? Math.min(5, Math.max(1, rating)) : 5
    };
};

/* ---------- Public ---------- */

// GET /testimonials — approved testimonials shown on the landing page
export const getPublicTestimonials = async (req, res) => {
    try {
        const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 12, 1), 50);
        const items = await Testimonial.find({ status: 'approved' })
            .select(PUBLIC_FIELDS)
            .sort({ displayOrder: 1, createdAt: -1 })
            .limit(limit)
            .lean();
        return handleResponse(res, 200, 'Testimonials fetched successfully', { items });
    } catch (error) {
        return handleResponse(res, 500, error.message);
    }
};

// POST /testimonials — a visitor submits a testimonial; it stays pending until an admin approves it
export const submitTestimonial = async (req, res) => {
    try {
        const data = cleanInput(req.body);
        if (!data.name) return handleResponse(res, 400, 'Please enter your name');
        if (data.message.length < 10) {
            return handleResponse(res, 400, 'Please write at least 10 characters');
        }

        const testimonial = await Testimonial.create({
            ...data,
            status: 'pending',
            source: 'user',
            userId: req.user?.role === 'customer' ? req.user.id : null
        });

        return handleResponse(
            res,
            201,
            'Thank you! Your testimonial was submitted and will appear once approved.',
            { _id: testimonial._id }
        );
    } catch (error) {
        return handleResponse(res, 500, error.message);
    }
};

/* ---------- Admin ---------- */

export const getAdminTestimonials = async (req, res) => {
    try {
        const { status, search } = req.query;
        const query = {};
        if (STATUSES.includes(status)) query.status = status;
        if (search && search.trim()) {
            const safe = buildSearchRegex(search.trim(), { anchored: false });
            query.$or = [{ name: safe }, { city: safe }, { message: safe }];
        }

        const { page, limit, skip } = getPagination(req, { defaultLimit: 20, maxLimit: 100 });

        const [items, total, counts] = await Promise.all([
            Testimonial.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
            Testimonial.countDocuments(query),
            Testimonial.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }])
        ]);

        const stats = { pending: 0, approved: 0, rejected: 0 };
        counts.forEach((c) => { if (c._id in stats) stats[c._id] = c.count; });

        return handleResponse(res, 200, 'Testimonials fetched successfully', {
            items,
            stats,
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit) || 1
        });
    } catch (error) {
        return handleResponse(res, 500, error.message);
    }
};

// Admin can add a testimonial directly (approved by default)
export const createTestimonial = async (req, res) => {
    try {
        const data = cleanInput(req.body);
        if (!data.name || !data.message) {
            return handleResponse(res, 400, 'Name and message are required');
        }
        const status = STATUSES.includes(req.body.status) ? req.body.status : 'approved';
        const testimonial = await Testimonial.create({
            ...data,
            status,
            source: 'admin',
            displayOrder: Number(req.body.displayOrder) || 0,
            reviewedAt: new Date()
        });
        return handleResponse(res, 201, 'Testimonial created successfully', testimonial);
    } catch (error) {
        return handleResponse(res, 500, error.message);
    }
};

export const updateTestimonial = async (req, res) => {
    try {
        const body = req.body || {};
        const data = cleanInput(body);
        const update = {};

        if (body.name !== undefined) update.name = data.name;
        if (body.city !== undefined) update.city = data.city;
        if (body.message !== undefined) update.message = data.message;
        if (body.rating !== undefined) update.rating = data.rating;
        if (update.name === '' || update.message === '') {
            return handleResponse(res, 400, 'Name and message cannot be empty');
        }
        if (body.displayOrder !== undefined) update.displayOrder = Number(body.displayOrder) || 0;
        if (body.status !== undefined) {
            if (!STATUSES.includes(body.status)) return handleResponse(res, 400, 'Invalid status');
            update.status = body.status;
            update.reviewedAt = new Date();
        }

        const testimonial = await Testimonial.findByIdAndUpdate(req.params.id, update, { new: true });
        if (!testimonial) return handleResponse(res, 404, 'Testimonial not found');
        return handleResponse(res, 200, 'Testimonial updated successfully', testimonial);
    } catch (error) {
        return handleResponse(res, 500, error.message);
    }
};

export const deleteTestimonial = async (req, res) => {
    try {
        const testimonial = await Testimonial.findByIdAndDelete(req.params.id);
        if (!testimonial) return handleResponse(res, 404, 'Testimonial not found');
        return handleResponse(res, 200, 'Testimonial deleted successfully');
    } catch (error) {
        return handleResponse(res, 500, error.message);
    }
};
