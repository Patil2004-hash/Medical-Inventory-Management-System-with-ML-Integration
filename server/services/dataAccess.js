import { isDbConnected, INITIAL_USERS, INITIAL_MEDICINES, INITIAL_NOTIFICATIONS, INITIAL_CUSTOMERS } from '../config/db.js';
import { UserModel } from '../models/User.js';
import { MedicineModel } from '../models/Medicine.js';
import { SaleModel } from '../models/Sale.js';
import { PurchaseModel } from '../models/Purchase.js';
import { StockAdjustmentModel } from '../models/StockAdjustment.js';
import { AuditEventModel } from '../models/AuditEvent.js';
import { NotificationModel } from '../models/Notification.js';
import { CustomerModel } from '../models/Customer.js';

const memoryStore = {
  users: JSON.parse(JSON.stringify(INITIAL_USERS)),
  medicines: JSON.parse(JSON.stringify(INITIAL_MEDICINES)),
  sales: [],
  purchases: [],
  adjustments: [],
  auditEvents: [],
  notifications: JSON.parse(JSON.stringify(INITIAL_NOTIFICATIONS)),
  customers: JSON.parse(JSON.stringify(INITIAL_CUSTOMERS || []))
};

export async function findUserByEmail(email) {
  const normEmail = String(email || '').toLowerCase();
  if (isDbConnected()) {
    const doc = await UserModel.findOne({ email: normEmail }).lean();
    if (doc) return doc;
  }
  return memoryStore.users.find(u => u.email.toLowerCase() === normEmail) || null;
}

export async function findUserById(id) {
  if (isDbConnected()) {
    const doc = await UserModel.findOne({ id }).lean();
    if (doc) return doc;
  }
  return memoryStore.users.find(u => u.id === id) || null;
}

export async function getAllUsers() {
  if (isDbConnected()) {
    return await UserModel.find({}, { password: 0 }).lean();
  }
  return memoryStore.users.map(({ password, ...u }) => u);
}

export async function updateUserStatus(id, active) {
  if (isDbConnected()) {
    const user = await UserModel.findOneAndUpdate({ id }, { active }, { new: true, select: '-password' }).lean();
    return user;
  }
  const user = memoryStore.users.find(u => u.id === id);
  if (user) {
    user.active = Boolean(active);
    const { password, ...clean } = user;
    return clean;
  }
  return null;
}

export async function getAllMedicines() {
  if (isDbConnected()) {
    return await MedicineModel.find({}).lean();
  }
  return memoryStore.medicines;
}

export async function findMedicineByIdOrName(query) {
  if (isDbConnected()) {
    const doc = await MedicineModel.findOne({
      $or: [{ id: query }, { name: query }]
    }).lean();
    if (doc) return doc;
  }
  return memoryStore.medicines.find(m => m.id === query || m.name === query) || null;
}

export async function updateMedicineStock(id, newStock) {
  if (isDbConnected()) {
    await MedicineModel.updateOne({ id }, { stock: newStock });
    return await MedicineModel.findOne({ id }).lean();
  }
  const medicine = memoryStore.medicines.find(m => m.id === id);
  if (medicine) {
    medicine.stock = newStock;
  }
  return medicine;
}

export async function getAllSales() {
  if (isDbConnected()) {
    return await SaleModel.find({}).sort({ createdAt: -1 }).lean();
  }
  return memoryStore.sales;
}

export async function saveSale(saleData) {
  if (isDbConnected()) {
    const created = await SaleModel.create(saleData);
    return created.toObject();
  }
  memoryStore.sales.unshift(saleData);
  return saleData;
}

export async function getAllPurchases() {
  if (isDbConnected()) {
    return await PurchaseModel.find({}).sort({ createdAt: -1 }).lean();
  }
  return memoryStore.purchases;
}

export async function findPurchaseByIdOrNumber(id) {
  if (isDbConnected()) {
    const doc = await PurchaseModel.findOne({
      $or: [{ id }, { purchaseNumber: id }]
    }).lean();
    if (doc) return doc;
  }
  return memoryStore.purchases.find(p => p.id === id || p.purchaseNumber === id) || null;
}

export async function savePurchase(purchaseData) {
  if (isDbConnected()) {
    const created = await PurchaseModel.create(purchaseData);
    return created.toObject();
  }
  memoryStore.purchases.unshift(purchaseData);
  return purchaseData;
}

export async function updatePurchaseReceived(id, receivedAt) {
  if (isDbConnected()) {
    await PurchaseModel.updateOne({ id }, { status: 'Received', receivedAt });
    return await PurchaseModel.findOne({ id }).lean();
  }
  const purchase = memoryStore.purchases.find(p => p.id === id || p.purchaseNumber === id);
  if (purchase) {
    purchase.status = 'Received';
    purchase.receivedAt = receivedAt;
  }
  return purchase;
}

export async function saveStockAdjustment(adjData) {
  if (isDbConnected()) {
    const created = await StockAdjustmentModel.create(adjData);
    return created.toObject();
  }
  memoryStore.adjustments.unshift(adjData);
  return adjData;
}

export async function getStockAdjustments() {
  if (isDbConnected()) {
    return await StockAdjustmentModel.find({}).sort({ createdAt: -1 }).limit(50).lean();
  }
  return memoryStore.adjustments.slice(0, 50);
}

export async function addAuditEvent(type, entity, entityId, details, userId) {
  const event = {
    id: `audit-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    type,
    entity,
    entityId,
    details,
    userId,
    createdAt: new Date().toISOString()
  };
  if (isDbConnected()) {
    await AuditEventModel.create(event);
  } else {
    memoryStore.auditEvents.unshift(event);
  }
  return event;
}

export async function getAuditEvents() {
  if (isDbConnected()) {
    return await AuditEventModel.find({}).sort({ createdAt: -1 }).limit(100).lean();
  }
  return memoryStore.auditEvents.slice(0, 100);
}

export async function getAllNotifications() {
  if (isDbConnected()) {
    return await NotificationModel.find({}).sort({ createdAt: -1 }).lean();
  }
  return memoryStore.notifications;
}

export async function markNotificationRead(id) {
  if (isDbConnected()) {
    const doc = await NotificationModel.findOneAndUpdate({ id }, { read: true }, { new: true }).lean();
    return doc;
  }
  const notif = memoryStore.notifications.find(n => n.id === id);
  if (notif) {
    notif.read = true;
  }
  return notif;
}

/* ---------------- Customers ---------------- */

export async function getAllCustomers(search = '') {
  if (isDbConnected()) {
    const filter = search
      ? { $or: [{ name: new RegExp(search, 'i') }, { phone: new RegExp(search, 'i') }, { email: new RegExp(search, 'i') }] }
      : {};
    return await CustomerModel.find(filter).sort({ createdAt: -1 }).lean();
  }
  const needle = String(search || '').toLowerCase();
  return memoryStore.customers
    .filter(c =>
      !needle ||
      c.name.toLowerCase().includes(needle) ||
      (c.phone || '').toLowerCase().includes(needle) ||
      (c.email || '').toLowerCase().includes(needle)
    )
    .slice()
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export async function findCustomerById(id) {
  if (isDbConnected()) {
    const doc = await CustomerModel.findOne({ id }).lean();
    if (doc) return doc;
  }
  return memoryStore.customers.find(c => c.id === id) || null;
}

export async function saveCustomer(customer) {
  if (isDbConnected()) {
    const created = await CustomerModel.create(customer);
    return created.toObject();
  }
  memoryStore.customers.unshift(customer);
  return customer;
}

export async function updateCustomer(id, updates) {
  if (isDbConnected()) {
    return await CustomerModel.findOneAndUpdate({ id }, updates, { new: true }).lean();
  }
  const customer = memoryStore.customers.find(c => c.id === id);
  if (customer) Object.assign(customer, updates);
  return customer || null;
}

export async function deleteCustomer(id) {
  if (isDbConnected()) {
    const result = await CustomerModel.deleteOne({ id });
    return result.deletedCount || 0;
  }
  const before = memoryStore.customers.length;
  memoryStore.customers = memoryStore.customers.filter(c => c.id !== id);
  return before - memoryStore.customers.length;
}