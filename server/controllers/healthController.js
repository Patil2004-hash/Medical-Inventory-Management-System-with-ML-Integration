import { isDbConnected } from '../config/db.js';

export function getHealth(_req, res) {
  const dbStatus = isDbConnected() ? 'mongodb-connected' : 'demo-mode';
  res.json({ status: 'ok', database: dbStatus, service: 'mims-api' });
}
