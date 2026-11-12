import mongoose from 'mongoose';
import DeliveryLead from '../models/deliveryLead.js';
import { handleResponse } from '../utils/helper.js';
import getPagination from '../utils/pagination.js';

const VALID_STATUSES = ['new', 'contacted', 'onboarded', 'rejected'];
const VALID_REQUEST_TYPES = ['register', 'info'];
const CHECKLIST_KEYS = [
    'howItWorks',
    'payPerDelivery',
    'dailyMinimum',
    'timingsAndCash',
    'documentsNeeded',
    'driverApp'
];

const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// POST /delivery-leads — public "Deliver with us" ("Register now" or "I need more information")
export const submitDeliveryLead = async (req, res) => {
    try {
        const body = req.body || {};
        const phoneDigits = String(body.phone || '').replace(/\D/g, '').slice(0, 10);
        const requestType = body.requestType === 'info' ? 'info' : 'register';

        const data = {
            requestType,
            fullName: String(body.fullName || '').trim().slice(0, 80),
            phone: phoneDigits,
            area: String(body.area || '').trim().slice(0, 80),
            vehicle: String(body.vehicle || '').trim().slice(0, 40),
            drivingLicence: String(body.drivingLicence || '').trim().slice(0, 20),
            workShift: String(body.workShift || '').trim().slice(0, 80),
            question: String(body.question || '').trim().slice(0, 400)
        };

        if (!data.fullName) return handleResponse(res, 400, 'Please enter your full name');
        if (data.phone.length !== 10) {
            return handleResponse(res, 400, 'Please enter a valid 10-digit mobile number');
        }
        if (requestType === 'register') {
            if (!data.area) return handleResponse(res, 400, 'Please enter your area');
            if (!data.vehicle) return handleResponse(res, 400, 'Please enter your vehicle type');
            if (!data.drivingLicence) {
                return handleResponse(res, 400, 'Please specify if you have a driving licence');
            }

            const existing = await DeliveryLead.findOne({
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

        const created = await DeliveryLead.create(data);

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

// GET /admin/delivery-leads
export const getDeliveryLeads = async (req, res) => {
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
                { fullName: rx },
                { phone: rx },
                { area: rx },
                { vehicle: rx },
                { workShift: rx },
                { question: rx }
            ];
        }

        const { page, limit, skip } = getPagination(req, { defaultLimit: 25, maxLimit: 100 });

        const [items, total, grouped] = await Promise.all([
            DeliveryLead.find(query)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            DeliveryLead.countDocuments(query),
            DeliveryLead.aggregate([
                { $group: { _id: '$status', count: { $sum: 1 } } }
            ])
        ]);

        const stats = { new: 0, contacted: 0, onboarded: 0, rejected: 0, all: 0 };
        for (const row of grouped) {
            if (row._id in stats) stats[row._id] = row.count;
            stats.all += row.count;
        }

        return handleResponse(res, 200, 'Delivery leads fetched successfully', {
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

// PATCH /admin/delivery-leads/:id
export const updateDeliveryLead = async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return handleResponse(res, 400, 'Invalid delivery lead ID');
        }

        const existing = await DeliveryLead.findById(id).select('status').lean();
        if (!existing) return handleResponse(res, 404, 'Delivery lead not found');

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

        const updated = await DeliveryLead.findByIdAndUpdate(
            id,
            { $set: updates },
            { new: true, runValidators: true }
        ).lean();

        if (!updated) return handleResponse(res, 404, 'Delivery lead not found');

        return handleResponse(res, 200, 'Delivery lead updated', updated);
    } catch (error) {
        return handleResponse(res, 500, error.message);
    }
};

// DELETE /admin/delivery-leads/:id
export const deleteDeliveryLead = async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return handleResponse(res, 400, 'Invalid delivery lead ID');
        }

        const deleted = await DeliveryLead.findByIdAndDelete(id).lean();
        if (!deleted) return handleResponse(res, 404, 'Delivery lead not found');

        return handleResponse(res, 200, 'Delivery lead deleted');
    } catch (error) {
        return handleResponse(res, 500, error.message);
    }
};

