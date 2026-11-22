import mongoose from 'mongoose';

const batchSchema = new mongoose.Schema({
  batch: String,
  quantity: Number,
  expiryDate: String
}, { _id: false });

const medicineSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  category: { type: String, required: true },
  sku: { type: String, required: true, unique: true },
  stock: { type: Number, required: true, min: 0 },
  reorderLevel: { type: Number, required: true, min: 0 },
  unit: { type: String, required: true },
  price: { type: Number, required: true, min: 0 },
  expiryDate: { type: String },
  status: { type: String, enum: ['In stock', 'Low stock', 'Critical'] },
  batches: [batchSchema]
}, { timestamps: true });

export const MedicineModel = mongoose.models.Medicine || mongoose.model('Medicine', medicineSchema);
