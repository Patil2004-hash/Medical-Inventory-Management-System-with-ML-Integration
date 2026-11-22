import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  title: { type: String, required: true },
  message: { type: String, required: true },
  type: { type: String, default: 'info' },
  read: { type: Boolean, default: false },
  createdAt: { type: String, default: () => new Date().toISOString() }
});

export const NotificationModel = mongoose.models.Notification || mongoose.model('Notification', notificationSchema);
