import mongoose from 'mongoose';

const sellerLeadSchema = new mongoose.Schema({
    requestType: {
        type: String,
        enum: ['register', 'info'],
        default: 'register'
    },
    shopName: { type: String, trim: true, maxlength: 100, default: '' },
    ownerName: { type: String, required: true, trim: true, maxlength: 80 },
    phone: { type: String, required: true, trim: true, maxlength: 15 },
    area: { type: String, trim: true, maxlength: 80, default: '' },
    categories: { type: String, trim: true, maxlength: 120, default: '' },
    question: { type: String, trim: true, maxlength: 400, default: '' },
    status: {
        type: String,
        enum: ['new', 'contacted', 'onboarded', 'rejected'],
        default: 'new'
    },
    adminNotes: { type: String, trim: true, maxlength: 500, default: '' },
    nextFollowUp: { type: String, trim: true, maxlength: 80, default: '' },
    briefingChecklist: {
        howOrdersCome: { type: Boolean, default: false },
        commission: { type: Boolean, default: false },
        payoutTiming: { type: Boolean, default: false },
        driversDeliver: { type: Boolean, default: false },
        repeatDemand: { type: Boolean, default: false },
        documentsNeeded: { type: Boolean, default: false }
    },
    handledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', default: null }
}, {
    timestamps: true
});

sellerLeadSchema.index({ status: 1, createdAt: -1 });
sellerLeadSchema.index({ phone: 1 });

const SellerLead = mongoose.model('SellerLead', sellerLeadSchema);

export default SellerLead;

