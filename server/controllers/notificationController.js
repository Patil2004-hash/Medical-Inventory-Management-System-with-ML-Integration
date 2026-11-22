import {
  getAllNotifications,
  markNotificationRead as setNotificationRead
} from '../services/dataAccess.js';

export async function getNotifications(_req, res) {
  const notifications = await getAllNotifications();
  res.json(notifications);
}

export async function markNotificationRead(req, res) {
  const notification = await setNotificationRead(req.params.id);
  if (!notification) return res.status(404).json({ message: 'Notification not found.' });
  res.json(notification);
}
