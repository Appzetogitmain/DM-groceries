import mongoose from 'mongoose';

const deliveryLeadSchema = new mongoose.Schema({
    requestType: {
        type: String,
        enum: ['register', 'info'],
        default: 'register'
    },
    fullName: { type: String, required: true, trim: true, maxlength: 80 },
    phone: { type: String, required: true, trim: true, maxlength: 15 },
    area: { type: String, trim: true, maxlength: 80, default: '' },
    vehicle: { type: String, trim: true, maxlength: 40, default: '' },
    drivingLicence: { type: String, trim: true, maxlength: 20, default: '' },
    workShift: { type: String, trim: true, maxlength: 80, default: '' },
    question: { type: String, trim: true, maxlength: 400, default: '' },
    status: {
        type: String,
        enum: ['new', 'contacted', 'onboarded', 'rejected'],
        default: 'new'
    },
    adminNotes: { type: String, trim: true, maxlength: 500, default: '' },
    nextFollowUp: { type: String, trim: true, maxlength: 80, default: '' },
    briefingChecklist: {
        howItWorks: { type: Boolean, default: false },
        payPerDelivery: { type: Boolean, default: false },
        dailyMinimum: { type: Boolean, default: false },
        timingsAndCash: { type: Boolean, default: false },
        documentsNeeded: { type: Boolean, default: false },
        driverApp: { type: Boolean, default: false }
    },
    handledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', default: null }
}, {
    timestamps: true
});

deliveryLeadSchema.index({ status: 1, createdAt: -1 });
deliveryLeadSchema.index({ phone: 1 });

const DeliveryLead = mongoose.model('DeliveryLead', deliveryLeadSchema);

export default DeliveryLead;

