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
        if (!customer) {
            customer = await Customer.create({
                name: "Test User",
                phone: normalizedPhone,
                isVerified: true,
                role: "user",
                isActive: true
            });
            console.log("Created customer:", customer.phone);
        } else {
            customer.isVerified = true;
            customer.role = "user";
            await customer.save();
            console.log("Updated customer:", customer.phone);
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
