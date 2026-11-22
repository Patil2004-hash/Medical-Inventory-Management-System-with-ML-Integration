import mongoose from 'mongoose';

const stockAdjustmentSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  medicineId: { type: String, required: true },
  medicineName: { type: String, required: true },
  delta: { type: Number, required: true },
  reason: { type: String, required: true },
  resultingStock: { type: Number, required: true },
  adjustedBy: { type: String, required: true },
  createdAt: { type: String, default: () => new Date().toISOString() }
});

export const StockAdjustmentModel = mongoose.models.StockAdjustment || mongoose.model('StockAdjustment', stockAdjustmentSchema);
