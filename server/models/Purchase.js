import mongoose from 'mongoose';

const purchaseLineItemSchema = new mongoose.Schema({
  medicineId: String,
  name: String,
  quantity: Number,
  unitPrice: Number
}, { _id: false });

const purchaseSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  purchaseNumber: { type: String, required: true, unique: true },
  supplier: { type: String, required: true },
  total: { type: Number, required: true },
  items: { type: Number, required: true },
  lineItems: [purchaseLineItemSchema],
  status: { type: String, enum: ['Pending', 'Received'], default: 'Pending' },
  receivedAt: { type: String },
  createdAt: { type: String, default: () => new Date().toISOString() }
});

export const PurchaseModel = mongoose.models.Purchase || mongoose.model('Purchase', purchaseSchema);
