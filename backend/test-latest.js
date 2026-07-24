import mongoose from 'mongoose';
import { getOrderWithAccess } from './app/services/orderQueryService.js';
import Order from './app/models/order.js'; // Needed to register model

await mongoose.connect('mongodb+srv://dmgroceriesvegetables_db_user:Dm%40123@cluster0.lbxmrpo.mongodb.net/quickcom');

const db = mongoose.connection.db;
const delivery = await db.collection('deliveries').findOne();

try {
  // Get latest order with return requested
  const latestOrder = await Order.findOne({returnStatus: {$ne: 'none'}}).sort({createdAt: -1}).lean();
  if (latestOrder) {
    console.log(JSON.stringify({
      orderId: latestOrder.orderId,
      returnStatus: latestOrder.returnStatus,
      returnDeliveryCommission: latestOrder.returnDeliveryCommission,
      distanceSnapshot: latestOrder.distanceSnapshot,
      paymentBreakdown: latestOrder.paymentBreakdown
    }, null, 2));
  } else {
    console.log("No return orders found.");
  }
} catch (e) {
  console.log("Error:", e.message);
}
process.exit(0);
