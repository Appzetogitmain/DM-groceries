import ContactMessage from '../models/contactMessage.js';
import Admin from '../models/admin.js';
import { handleResponse } from '../utils/helper.js';
import getPagination from '../utils/pagination.js';
import { emitNotificationEvent } from '../modules/notifications/notification.emitter.js';
import { NOTIFICATION_EVENTS } from '../modules/notifications/notification.constants.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function getAdminIds() {
    try {
        const admins = await Admin.find().select("_id").lean();
        return (admins || []).map((a) => a?._id).filter(Boolean);
    } catch {
        return [];
    }
}

// POST /contact — public contact form
export const submitContactMessage = async (req, res) => {
    try {
        const body = req.body || {};
        const data = {
            name: String(body.name || '').trim().slice(0, 80),
            email: String(body.email || '').trim().slice(0, 120),
            phone: String(body.phone || '').replace(/[^\d+\s-]/g, '').trim().slice(0, 20),
            subject: String(body.subject || '').trim().slice(0, 120),
            message: String(body.message || '').trim().slice(0, 1000)
        };

        if (!data.name) return handleResponse(res, 400, 'Please enter your name');
        if (!data.email && !data.phone) {
            return handleResponse(res, 400, 'Please enter an email or phone number so we can reach you');
        }
        if (data.email && !EMAIL_RE.test(data.email)) {
            return handleResponse(res, 400, 'Please enter a valid email address');
        }
        if (data.message.length < 10) {
            return handleResponse(res, 400, 'Please write at least 10 characters');
        }

        const created = await ContactMessage.create(data);

        // Notify admins in real-time so the Customer Support red badge increments immediately
        try {
            const adminIds = await getAdminIds();
            emitNotificationEvent(NOTIFICATION_EVENTS.ADMIN_NEW_CONTACT_MESSAGE, {
                fromRole: "customer",
                adminIds,
                messageText: data.subject ? `New contact inquiry: ${data.subject}` : "New contact message received",
                data: {
                    id: created._id,
                    name: data.name,
                    email: data.email,
                    subject: data.subject,
                },
            });
        } catch {
            // Non-blocking
        }

        return handleResponse(res, 201, 'Thanks for reaching out! Our team will get back to you soon.');
    } catch (error) {
        return handleResponse(res, 500, error.message);
    }
};

// GET /admin/contact-messages
export const getContactMessages = async (req, res) => {
    try {
        const query = {};
        if (['new', 'resolved'].includes(req.query.status)) query.status = req.query.status;

        const { page, limit, skip } = getPagination(req, { defaultLimit: 25, maxLimit: 100 });
        const [items, total, newCount] = await Promise.all([
            ContactMessage.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
            ContactMessage.countDocuments(query),
            ContactMessage.countDocuments({ status: 'new' })
        ]);

        return handleResponse(res, 200, 'Messages fetched successfully', {
            items,
            newCount,
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit) || 1
        });
    } catch (error) {
        return handleResponse(res, 500, error.message);
    }
};

export const updateContactMessage = async (req, res) => {
    try {
        const { status } = req.body || {};
        if (!['new', 'resolved'].includes(status)) return handleResponse(res, 400, 'Invalid status');
        const item = await ContactMessage.findByIdAndUpdate(req.params.id, { status }, { new: true });
        if (!item) return handleResponse(res, 404, 'Message not found');

        try {
            const adminIds = await getAdminIds();
            emitNotificationEvent(NOTIFICATION_EVENTS.ADMIN_PENDING_COUNTS_CHANGED, {
                fromRole: "admin",
                adminIds,
                messageText: "Contact message status updated",
            });
        } catch {
            // Non-blocking
        }

        return handleResponse(res, 200, 'Message updated successfully', item);
    } catch (error) {
        return handleResponse(res, 500, error.message);
    }
};

export const deleteContactMessage = async (req, res) => {
    try {
        const item = await ContactMessage.findByIdAndDelete(req.params.id);
        if (!item) return handleResponse(res, 404, 'Message not found');

        try {
            const adminIds = await getAdminIds();
            emitNotificationEvent(NOTIFICATION_EVENTS.ADMIN_PENDING_COUNTS_CHANGED, {
                fromRole: "admin",
                adminIds,
                messageText: "Contact message deleted",
            });
        } catch {
            // Non-blocking
        }

        return handleResponse(res, 200, 'Message deleted successfully');
    } catch (error) {
        return handleResponse(res, 500, error.message);
    }
};
