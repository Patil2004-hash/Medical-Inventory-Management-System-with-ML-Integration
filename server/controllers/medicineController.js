import {
  getAllMedicines,
  findMedicineByIdOrName,
  updateMedicineStock,
  saveStockAdjustment,
  getStockAdjustments as fetchStockAdjustments,
  addAuditEvent
} from '../services/dataAccess.js';
import { publicMedicine } from '../middleware/auth.js';

export async function getMedicines(req, res) {
  const search = String(req.query.search || '').toLowerCase();
  const medicines = await getAllMedicines();
  const filtered = medicines.filter((item) =>
    item.name.toLowerCase().includes(search) || item.sku?.toLowerCase().includes(search)
  );
  res.json(filtered.map(publicMedicine));
}

export async function adjustStock(req, res) {
  const targetQuery = req.body.medicineId || req.body.name;
  const medicine = await findMedicineByIdOrName(targetQuery);
  const delta = Number(req.body.delta);
  const reason = String(req.body.reason || '').trim();

  if (!medicine) return res.status(404).json({ message: 'Medicine not found.' });
  if (!Number.isFinite(delta)) return res.status(400).json({ message: 'A numeric stock delta is required.' });
  if (!reason) return res.status(400).json({ message: 'An adjustment reason is required.' });

  const resultingStock = Math.max(0, medicine.stock + delta);
  const updatedMed = await updateMedicineStock(medicine.id, resultingStock);

  const audit = {
    id: `adj-${Date.now()}`,
    medicineId: medicine.id,
    medicineName: medicine.name,
    delta,
    reason,
    resultingStock,
    adjustedBy: req.user.id,
    createdAt: new Date().toISOString()
  };

  await saveStockAdjustment(audit);
  await addAuditEvent('stock.adjusted', 'medicine', medicine.id, { delta, reason, resultingStock }, req.user.id);

  res.json({ medicine: publicMedicine(updatedMed), ...audit });
}

export async function getStockAdjustments(_req, res) {
  const adjustments = await fetchStockAdjustments();
  res.json(adjustments);
}
