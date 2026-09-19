import mongoose from 'mongoose';
import dotenv from 'dotenv';
import MilestoneCampaign from './app/models/milestoneCampaign.js';
import connectDB from './app/dbConfig/dbConfig.js';

dotenv.config();

const createCampaign = async () => {
    try {
        await connectDB();
        
        // Check if exists
        const existing = await MilestoneCampaign.findOne({ name: 'First 5 Orders' });
        if (existing) {
            console.log('Campaign already exists');
            process.exit(0);
        }

        const campaign = await MilestoneCampaign.create({
            name: 'First 5 Orders',
            triggerType: 'total_orders',
            targetValue: 5,
            rewardType: 'percentage_discount',
            couponConfig: {
                discountValue: 20,
                maxDiscount: 100,
                minOrderValue: 500,
                validityDays: 30
            },
            status: 'active'
        });

        console.log('Campaign created:', campaign.name);
        process.exit(0);
    } catch (error) {
        console.error('Error creating campaign:', error);
        process.exit(1);
    }
};

createCampaign();
