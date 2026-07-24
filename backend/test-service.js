import mongoose from 'mongoose';
import { getOrderWithAccess } from './app/services/orderQueryService.js';
import Order from './app/models/order.js'; // Needed to register model

await mongoose.connect('mongodb+srv://dmgroceriesvegetables_db_user:Dm%40123@cluster0.lbxmrpo.mongodb.net/quickcom');

const db = mongoose.connection.db;
const delivery = await db.collection('deliveries').findOne();

try {
  const result = await getOrderWithAccess('ORD-01KY9DMQWQXA2ZEGJGM0ESEV01', delivery._id, 'delivery');
  console.log(JSON.stringify({
    returnDeliveryCommission: result.payload.returnDeliveryCommission,
    status: result.payload.status
  }, null, 2));
} catch (e) {
  console.log("Error:", e.message);
}
process.exit(0);
