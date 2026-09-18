import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config({ path: '.env' });

import Seller from './app/models/seller.js';
import Order from './app/models/order.js';
import { emitNotificationEvent } from './app/modules/notifications/notification.emitter.js';

mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(async () => {
    try {
      const order = await Order.findOne({ seller: { $exists: true } }).sort({ createdAt: -1 });
      if (!order) {
        console.log('No order found with a seller');
        process.exit(1);
      }
      
      const sellerId = order.seller;
      console.log('Found an order with seller ID:', sellerId.toString());
      
      emitNotificationEvent('RETURN_REQUESTED', {
        sellerId: sellerId,
        orderId: order.orderId || 'TEST-RET-001',
        data: {
          reason: 'Defective Product',
          reasonDetail: 'Test reason detail'
        }
      });
      
      setTimeout(() => {
        console.log('Notification emitted successfully to seller:', sellerId.toString());
        process.exit(0);
      }, 3000);
    } catch (err) {
      console.error(err);
      process.exit(1);
    }
  });
