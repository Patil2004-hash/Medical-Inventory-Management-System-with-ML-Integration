import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['Administrator', 'Pharmacist', 'Staff'], default: 'Staff' },
  active: { type: Boolean, default: true },
  lastActive: { type: String, default: 'Just now' }
}, { timestamps: true });

export const UserModel = mongoose.models.User || mongoose.model('User', userSchema);
