import mongoose from 'mongoose';
import Order from './app/models/order.js';

async function test() {
  await mongoose.connect(process.env.MONGO_URI);
  const startDate = "2026-08-31";
  const endDate = "2026-09-21";

  const range = {};
  if (startDate) {
    range.$gte = new Date(startDate);
  }
  if (endDate) {
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    range.$lte = end;
  }

  const query = { createdAt: range };
  console.log("Query:", query);
  
  const count = await Order.countDocuments(query);
  console.log("Count:", count);

  const allOrders = await Order.countDocuments({});
  console.log("Total Orders in DB:", allOrders);
  
  process.exit(0);
}

test();
