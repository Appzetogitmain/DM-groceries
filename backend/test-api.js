import axios from 'axios';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';

await mongoose.connect('mongodb+srv://dmgroceriesvegetables_db_user:Dm%40123@cluster0.lbxmrpo.mongodb.net/quickcom');

const db = mongoose.connection.db;
const delivery = await db.collection('deliveries').findOne();

const token = jwt.sign(
  { id: delivery._id, role: 'delivery' },
  'dm_groceries_super_secret_jwt_key_2026',
  { expiresIn: '30d' }
);

try {
  const res = await axios.get('http://localhost:7000/api/orders/details/ORD-01KY9DMQWQXA2ZEGJGM0ESEV01', {
    headers: { Authorization: `Bearer ${token}` }
  });
  console.log(JSON.stringify({
    returnDeliveryCommission: res.data.result.returnDeliveryCommission,
    status: res.data.result.status
  }, null, 2));
} catch (e) {
  console.log("Error:", e.response?.data || e.message);
}
process.exit(0);
