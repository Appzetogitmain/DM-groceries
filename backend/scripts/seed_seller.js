import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Seller from '../app/models/seller.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const seedSeller = async () => {
  try {
    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) {
      throw new Error('MONGO_URI environment variable is not defined');
    }

    await mongoose.connect(mongoUri);
    console.log('✓ Connected to MongoDB');

    const email = 'seller@appzeto.com';
    const password = 'seller123456';

    const existingSeller = await Seller.findOne({ email });

    if (existingSeller) {
      existingSeller.password = password; // The pre-save hook will hash it
      existingSeller.isVerified = true;
      existingSeller.isActive = true;
      existingSeller.applicationStatus = 'approved';
      await existingSeller.save();
      console.log('✓ Seller updated successfully');
    } else {
      const seller = new Seller({
        name: 'Appzeto Seller',
        email,
        phone: '+919999999999',
        password,
        shopName: 'Appzeto Mart',
        isVerified: true,
        isActive: true,
        applicationStatus: 'approved',
        sellerType: 'individual',
        role: 'seller',
      });
      await seller.save();
      console.log('✓ Seller created successfully');
    }

    process.exit(0);
  } catch (error) {
    console.error('✗ Error seeding seller:', error);
    process.exit(1);
  }
};

seedSeller();
