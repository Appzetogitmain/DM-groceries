import mongoose from 'mongoose';

const testimonialSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true, maxlength: 80 },
    city: { type: String, trim: true, maxlength: 80, default: '' },
    rating: { type: Number, min: 1, max: 5, default: 5 },
    message: { type: String, required: true, trim: true, maxlength: 500 },
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending'
    },
    // 'user' = submitted from the landing page, 'admin' = created in the admin panel
    source: { type: String, enum: ['user', 'admin'], default: 'user' },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    displayOrder: { type: Number, default: 0 },
    reviewedAt: { type: Date, default: null }
}, {
    timestamps: true
});

testimonialSchema.index({ status: 1, displayOrder: 1, createdAt: -1 });

const Testimonial = mongoose.model('Testimonial', testimonialSchema);

export default Testimonial;
