import dotenv from 'dotenv';
dotenv.config();
import { buildMessage } from './app/utils/smsHelpers.js';
const msg = buildMessage('1234');
console.log('MSG_LENGTH:', msg.length);
console.log('MSG_CONTENT:', msg);
