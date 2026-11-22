import mongoose from 'mongoose';

const saleLineItemSchema = new mongoose.Schema({
  medicineId: String,
  name: String,
  quantity: Number,
  unitPrice: Number,
  discountPercent: { type: Number, default: 0 },
  discountAmount: { type: Number, default: 0 },
  grossTotal: { type: Number, default: 0 },
  lineTotal: { type: Number, default: 0 }
}, { _id: false });

const saleSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  invoiceNumber: { type: String, required: true, unique: true },
  customer: { type: String, default: 'Walk-in customer' },
  customerId: { type: String, default: null },
  customerType: { type: String, default: null },
  total: { type: Number, required: true },
  subtotal: { type: Number, default: 0 },
  discountTotal: { type: Number, default: 0 },
  items: { type: Number, required: true },
  lineItems: [saleLineItemSchema],
  paymentMethod: { type: String, enum: ['Cash', 'UPI', 'Card'], default: 'Cash' },
  amountPaid: { type: Number, default: 0 },
  changeDue: { type: Number, default: 0 },
  paidAt: { type: String, default: null },
  createdBy: { type: String, default: null },
  createdAt: { type: String, default: () => new Date().toISOString() }
});

export const SaleModel = mongoose.models.Sale || mongoose.model('Sale', saleSchema);
