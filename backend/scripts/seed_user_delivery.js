import mongoose from "mongoose";
import dotenv from "dotenv";
import Customer from "../app/models/customer.js";
import Delivery from "../app/models/delivery.js";

dotenv.config();

async function seed() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("Connected to DB.");

        const phone = "8982292201";
        const normalizedPhone = "+91" + phone;

        // 1. Seed Customer
        let customer = await Customer.findOne({ phone: normalizedPhone });
        const secret = process.env.OTP_HASH_SECRET || process.env.JWT_SECRET || "unsafe-dev-secret";
        const cryptoModule = await import("crypto");
        const otpHash = cryptoModule.default.createHmac("sha256", secret).update(`${normalizedPhone}:1234`).digest("hex");
        const otpExpiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);

        if (!customer) {
            customer = await Customer.create({
                name: "Test User",
                phone: normalizedPhone,
                isVerified: true,
                role: "user",
                isActive: true,
                otpHash,
                otpExpiresAt,
                otpFailedAttempts: 0
            });
            console.log("Created customer:", customer.phone);
        } else {
            customer.isVerified = true;
            customer.role = "user";
            customer.otpHash = otpHash;
            customer.otpExpiresAt = otpExpiresAt;
            customer.otpFailedAttempts = 0;
            customer.otpLockedUntil = null;
            await customer.save();
            console.log("Updated customer with OTP 1234:", customer.phone);
        }

        // 2. Seed Delivery Boy
        let delivery = await Delivery.findOne({ phone: phone });
        if (!delivery) {
            delivery = await Delivery.create({
                name: "Test Delivery Boy",
                phone: phone,
                isVerified: true,
                role: "delivery",
                vehicleType: "bike",
                isOnline: true
            });
            console.log("Created delivery boy:", delivery.phone);
        } else {
            delivery.isVerified = true;
            delivery.role = "delivery";
            await delivery.save();
            console.log("Updated delivery boy:", delivery.phone);
        }

        console.log("Seeding complete.");
        process.exit(0);
    } catch (err) {
        console.error("Seeding failed:", err);
        process.exit(1);
    }
}

seed();
