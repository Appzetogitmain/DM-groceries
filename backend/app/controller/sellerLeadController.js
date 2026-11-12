import mongoose from 'mongoose';
import SellerLead from '../models/sellerLead.js';
import { handleResponse } from '../utils/helper.js';
import getPagination from '../utils/pagination.js';

const VALID_STATUSES = ['new', 'contacted', 'onboarded', 'rejected'];
const VALID_REQUEST_TYPES = ['register', 'info'];
const CHECKLIST_KEYS = [
    'howOrdersCome',
    'commission',
    'payoutTiming',
    'driversDeliver',
    'repeatDemand',
    'documentsNeeded'
];

const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// POST /seller-leads — public "Sell with us" ("Register now" or "I need more information")
export const submitSellerLead = async (req, res) => {
    try {
        const body = req.body || {};
        const phoneDigits = String(body.phone || '').replace(/\D/g, '').slice(0, 10);
        const requestType = body.requestType === 'info' ? 'info' : 'register';

        const data = {
            requestType,
            shopName: String(body.shopName || '').trim().slice(0, 100),
            ownerName: String(body.ownerName || '').trim().slice(0, 80),
            phone: phoneDigits,
            area: String(body.area || '').trim().slice(0, 80),
            categories: String(body.categories || '').trim().slice(0, 120),
            question: String(body.question || '').trim().slice(0, 400)
        };

        if (requestType === 'register' && !data.shopName) {
            return handleResponse(res, 400, 'Please enter your shop name');
        }
        if (!data.ownerName) return handleResponse(res, 400, 'Please enter your name');
        if (data.phone.length !== 10) {
            return handleResponse(res, 400, 'Please enter a valid 10-digit mobile number');
        }
        if (requestType === 'register' && !data.area) {
            return handleResponse(res, 400, 'Please enter your area');
        }

        if (requestType === 'register') {
            const existing = await SellerLead.findOne({
                phone: data.phone,
                requestType: 'register'
            })
                .select('_id')
                .lean();
            if (existing) {
                return handleResponse(
                    res,
                    409,
                    'A registration request with this phone number already exists. Our team will contact you shortly.'
                );
            }
        }

        const created = await SellerLead.create(data);

        return handleResponse(
            res,
            201,
            'Thank you! Our team will call or WhatsApp you within 24 hours.',
            { id: created._id }
        );
    } catch (error) {
        return handleResponse(res, 500, error.message);
    }
};

// GET /admin/seller-leads
export const getSellerLeads = async (req, res) => {
    try {
        const query = {};
        if (VALID_STATUSES.includes(req.query.status)) {
            query.status = req.query.status;
        }
        if (VALID_REQUEST_TYPES.includes(req.query.requestType)) {
            query.requestType = req.query.requestType;
        }

        const rawSearch = String(req.query.search || '').trim();
        if (rawSearch) {
            const rx = new RegExp(escapeRegex(rawSearch), 'i');
            query.$or = [
                { shopName: rx },
                { ownerName: rx },
                { phone: rx },
                { area: rx },
                { categories: rx },
                { question: rx }
            ];
        }

        const { page, limit, skip } = getPagination(req, { defaultLimit: 25, maxLimit: 100 });

        const [items, total, grouped] = await Promise.all([
            SellerLead.find(query)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            SellerLead.countDocuments(query),
            SellerLead.aggregate([
                { $group: { _id: '$status', count: { $sum: 1 } } }
            ])
        ]);

        const stats = { new: 0, contacted: 0, onboarded: 0, rejected: 0, all: 0 };
        for (const row of grouped) {
            if (row._id in stats) stats[row._id] = row.count;
            stats.all += row.count;
        }

        return handleResponse(res, 200, 'Seller leads fetched successfully', {
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

// PATCH /admin/seller-leads/:id
export const updateSellerLead = async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return handleResponse(res, 400, 'Invalid seller lead ID');
        }

        const existing = await SellerLead.findById(id).select('status').lean();
        if (!existing) return handleResponse(res, 404, 'Seller lead not found');

        const updates = {};
        if (req.body?.status !== undefined) {
            if (!VALID_STATUSES.includes(req.body.status)) {
                return handleResponse(res, 400, 'Invalid status value');
            }
            if (existing.status !== 'new' && req.body.status === 'new') {
                return handleResponse(res, 400, 'Cannot move a lead back to New once it has been processed');
            }
            if (existing.status === 'onboarded' && req.body.status === 'contacted') {
                return handleResponse(res, 400, 'Cannot move an onboarded lead back to Contacted');
            }
            updates.status = req.body.status;
        }
        if (req.body?.adminNotes !== undefined) {
            updates.adminNotes = String(req.body.adminNotes || '').trim().slice(0, 500);
        }
        if (req.body?.nextFollowUp !== undefined) {
            updates.nextFollowUp = String(req.body.nextFollowUp || '').trim().slice(0, 80);
        }
        if (req.body?.briefingChecklist && typeof req.body.briefingChecklist === 'object') {
            for (const key of CHECKLIST_KEYS) {
                if (req.body.briefingChecklist[key] !== undefined) {
                    updates[`briefingChecklist.${key}`] = Boolean(req.body.briefingChecklist[key]);
                }
            }
        }
        updates.handledBy = req.user?.id || req.user?._id || null;

        const updated = await SellerLead.findByIdAndUpdate(
            id,
            { $set: updates },
            { new: true, runValidators: true }
        ).lean();

        if (!updated) return handleResponse(res, 404, 'Seller lead not found');

        return handleResponse(res, 200, 'Seller lead updated', updated);
    } catch (error) {
        return handleResponse(res, 500, error.message);
    }
};

// DELETE /admin/seller-leads/:id
export const deleteSellerLead = async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return handleResponse(res, 400, 'Invalid seller lead ID');
        }

        const deleted = await SellerLead.findByIdAndDelete(id).lean();
        if (!deleted) return handleResponse(res, 404, 'Seller lead not found');

        return handleResponse(res, 200, 'Seller lead deleted');
    } catch (error) {
        return handleResponse(res, 500, error.message);
    }
};

