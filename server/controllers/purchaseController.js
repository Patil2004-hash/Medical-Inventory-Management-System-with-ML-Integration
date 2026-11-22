import {
  getAllPurchases,
  savePurchase,
  findPurchaseByIdOrNumber,
  findMedicineByIdOrName,
  updateMedicineStock,
  updatePurchaseReceived,
  addAuditEvent
} from '../services/dataAccess.js';
import { validPositiveQuantity } from '../middleware/auth.js';

export async function getPurchases(_req, res) {
  const purchases = await getAllPurchases();
  res.json(purchases);
}

export async function createPurchase(req, res) {
  const supplier = String(req.body.supplier || '').trim();
  const lineItems = Array.isArray(req.body.lineItems) ? req.body.lineItems : [];

  if (!supplier) return res.status(400).json({ message: 'A supplier is required.' });
  if (!lineItems.length || lineItems.some((line) => !validPositiveQuantity(line.quantity))) {
    return res.status(400).json({ message: 'A purchase requires positive line-item quantities.' });
  }

  const purchase = {
    id: `purchase-${Date.now()}`,
    purchaseNumber: `PO-${Date.now().toString().slice(-6)}`,
    supplier,
    total: Number(req.body.total || 0),
    items: Number(req.body.items || lineItems.length),
    lineItems,
    status: 'Pending',
    createdAt: new Date().toISOString()
  };

  const savedPurchase = await savePurchase(purchase);
  await addAuditEvent('purchase.created', 'purchase', purchase.id, { purchaseNumber: purchase.purchaseNumber, supplier, items: purchase.items }, req.user.id);

  res.status(201).json(savedPurchase);
}

export async function receivePurchase(req, res) {
  const purchase = await findPurchaseByIdOrNumber(req.params.id);
  if (!purchase) return res.status(404).json({ message: 'Purchase order not found.' });

  if (purchase.status === 'Received') {
    return res.json({ purchase, alreadyReceived: true });
  }

  // Verify all line item medicines exist
  for (const line of purchase.lineItems || []) {
    const targetQuery = line.medicineId || line.name;
    const medicine = await findMedicineByIdOrName(targetQuery);
    if (!medicine) {
      return res.status(404).json({ message: `Medicine not found: ${line.name || line.medicineId}.` });
    }
  }

  // Increment stock into inventory
  for (const line of purchase.lineItems || []) {
    const targetQuery = line.medicineId || line.name;
    const medicine = await findMedicineByIdOrName(targetQuery);
    await updateMedicineStock(medicine.id, medicine.stock + Number(line.quantity));
  }

  const receivedAt = new Date().toISOString();
  const updatedPurchase = await updatePurchaseReceived(purchase.id, receivedAt);
  await addAuditEvent('purchase.received', 'purchase', purchase.id, { purchaseNumber: purchase.purchaseNumber, items: purchase.items }, req.user.id);

  res.json({ purchase: updatedPurchase, alreadyReceived: false });
}
