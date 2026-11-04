import dns from 'dns';
dns.setServers(['8.8.8.8', '1.1.1.1']);

import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Admin from '../app/models/admin.js';

dotenv.config();

const email = 'dmgroceries.vegetables@gmail.com';
const password = 'DMgro!@#123';
const name = 'DM Groceries Admin';

async function seedAdmin() {
  try {
    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) {
      throw new Error('MONGO_URI is not defined in environment variables');
    }

    console.log('Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('Successfully connected to MongoDB.');

    let admin = await Admin.findOne({ email }).select('+password');

    if (admin) {
      console.log(`Admin found with email: ${email}. Updating credentials...`);
      admin.name = admin.name || name;
      admin.password = password;
      admin.role = 'admin';
      admin.adminType = 'super_admin';
      admin.isVerified = true;
      admin.isActive = true;
      await admin.save();
      console.log('Admin updated successfully.');
    } else {
      console.log(`Creating new admin with email: ${email}...`);
      admin = await Admin.create({
        name,
        email,
        password,
        role: 'admin',
        adminType: 'super_admin',
        isVerified: true,
        isActive: true,
      });
      console.log('Admin created successfully.');
    }

    // Verify password match
    const verifyDoc = await Admin.findOne({ email }).select('+password');
    const isMatch = await verifyDoc.comparePassword(password);

    if (isMatch) {
      console.log('\n========================================');
      console.log('✅ Admin credentials seeded and verified!');
      console.log('========================================');
      console.log(`Email:      ${verifyDoc.email}`);
      console.log(`Password:   ${password}`);
      console.log(`Name:       ${verifyDoc.name}`);
      console.log(`Role:       ${verifyDoc.role}`);
      console.log(`Admin Type: ${verifyDoc.adminType}`);
      console.log(`Active:     ${verifyDoc.isActive}`);
      console.log(`Verified:   ${verifyDoc.isVerified}`);
      console.log('========================================');
    } else {
      console.error('\n❌ Password verification failed!');
      process.exitCode = 1;
    }

    await mongoose.disconnect();
    console.log('Database connection closed.');
  } catch (error) {
    console.error('Error seeding admin:', error);
    process.exit(1);
  }
}

seedAdmin();
