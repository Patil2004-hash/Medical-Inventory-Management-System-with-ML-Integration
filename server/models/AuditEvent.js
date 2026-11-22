import mongoose from 'mongoose';

const auditEventSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  type: { type: String, required: true },
  entity: { type: String, required: true },
  entityId: { type: String, required: true },
  details: { type: mongoose.Schema.Types.Mixed },
  userId: { type: String, required: true },
  createdAt: { type: String, default: () => new Date().toISOString() }
});

export const AuditEventModel = mongoose.models.AuditEvent || mongoose.model('AuditEvent', auditEventSchema);
