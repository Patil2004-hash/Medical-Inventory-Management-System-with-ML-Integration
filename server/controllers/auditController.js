import { getAuditEvents as fetchAuditEvents } from '../services/dataAccess.js';

export async function getAuditEvents(_req, res) {
  const events = await fetchAuditEvents();
  res.json(events);
}
