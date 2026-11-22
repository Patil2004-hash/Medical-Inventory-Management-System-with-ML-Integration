import {
  getAllSales,
  findMedicineByIdOrName,
  updateMedicineStock,
  saveSale,
  addAuditEvent,
  findCustomerById
} from '../services/dataAccess.js';
import { validPositiveQuantity } from '../middleware/auth.js';

const PAYMENT_METHODS = ['Cash', 'UPI', 'Card'];

export async function getSales(_req, res) {
  const sales = await getAllSales();
  res.json(sales);
}

export async function createSale(req, res) {
  const requestedLines = Array.isArray(req.body.lineItems) ? req.body.lineItems : [];
  if (!requestedLines.length || requestedLines.some((line) => !validPositiveQuantity(line.quantity))) {
    return res.status(400).json({ message: 'At least one line item with a positive quantity is required.' });
  }

  const round2 = (value) => Math.round(Number(value || 0) * 100) / 100;

  // Validate discount percentages before touching stock.
  for (const [index, line] of requestedLines.entries()) {
    const discountPercent = Number(line.discountPercent ?? 0);
    if (!Number.isFinite(discountPercent) || discountPercent < 0 || discountPercent > 100) {
      return res.status(400).json({
        message: `Line ${index + 1}: discount must be between 0 and 100 percent.`
      });
    }
  }

  // Resolve medicines, check stock, and price each line from the database (source of truth).
  const pricedLines = [];
  for (const [index, line] of requestedLines.entries()) {
    const targetQuery = line.medicineId || line.name;
    const medicine = await findMedicineByIdOrName(targetQuery);
    if (!medicine) return res.status(404).json({ message: `Medicine not found: ${line.name || line.medicineId}.` });

    const quantity = Number(line.quantity);
    if (medicine.stock < quantity) {
      return res.status(409).json({ message: `${medicine.name} has insufficient stock.` });
    }

    const unitPrice = round2(medicine.price ?? line.unitPrice ?? 0);
    const discountPercent = round2(line.discountPercent ?? 0);
    const grossTotal = round2(unitPrice * quantity);
    const discountAmount = round2(grossTotal * discountPercent) / 100;
    const lineTotal = round2(grossTotal - discountAmount);

    pricedLines.push({
      medicineId: medicine.id,
      name: medicine.name,
      quantity,
      unitPrice,
      discountPercent,
      discountAmount: round2(discountAmount),
      grossTotal,
      lineTotal,
      stock: medicine.stock
    });
  }

  const subtotal = round2(pricedLines.reduce((sum, l) => sum + l.grossTotal, 0));
  const discountTotal = round2(pricedLines.reduce((sum, l) => sum + l.discountAmount, 0));
  const total = round2(subtotal - discountTotal);
  const totalUnits = pricedLines.reduce((sum, l) => sum + l.quantity, 0);

  // Deduct stock only after every line validated.
  for (const line of pricedLines) {
    await updateMedicineStock(line.medicineId, line.stock - line.quantity);
  }

  // Resolve the customer: either a saved customer record or a walk-in.
  let customerName = String(req.body.customer || '').trim() || 'Walk-in customer';
  let customerId = null;
  let customerType = null;

  if (req.body.customerId) {
    const customer = await findCustomerById(String(req.body.customerId));
    if (!customer) return res.status(404).json({ message: 'Selected customer not found.' });
    customerId = customer.id;
    customerName = customer.name;
    customerType = customer.type;
  }

  const paymentMethod = PAYMENT_METHODS.includes(String(req.body.paymentMethod))
    ? String(req.body.paymentMethod)
    : 'Cash';

  const amountPaid = round2(req.body.amountPaid ?? total);

  if (amountPaid < total) {
    return res.status(400).json({
      message: `Amount paid (${amountPaid}) is less than the bill total (${total}).`
    });
  }

  const sale = {
    id: `sale-${Date.now()}`,
    invoiceNumber: `INV-${Date.now().toString().slice(-6)}`,
    customer: customerName,
    customerId,
    customerType,
    total,
    subtotal,
    discountTotal,
    amountPaid,
    changeDue: round2(amountPaid - total),
    paymentMethod,
    paidAt: new Date().toISOString(),
    createdBy: req.user?.id || null,
    items: totalUnits,
    lineItems: pricedLines,
    createdAt: new Date().toISOString()
  };

  const savedSale = await saveSale(sale);
  await addAuditEvent('sale.created', 'sale', sale.id, {
    invoiceNumber: sale.invoiceNumber,
    subtotal: sale.subtotal,
    discountTotal: sale.discountTotal,
    total: sale.total,
    items: sale.items,
    paymentMethod: sale.paymentMethod
  }, req.user?.id);

  res.status(201).json(savedSale);
}
