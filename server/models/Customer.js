import mongoose from 'mongoose';

const customerSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  phone: { type: String, default: '' },
  email: { type: String, default: '' },
  type: { type: String, enum: ['Walk-in', 'Regular', 'Wholesale', 'Credit'], default: 'Regular' },
  notes: { type: String, default: '' },
  createdBy: { type: String, default: null },
  createdAt: { type: String, default: () => new Date().toISOString() }
});

export const CustomerModel =
  mongoose.models.Customer || mongoose.model('Customer', customerSchema);