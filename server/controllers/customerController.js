import {
  getAllCustomers,
  findCustomerById,
  saveCustomer,
  updateCustomer,
  deleteCustomer
} from '../services/dataAccess.js';
import { addAuditEvent } from '../services/dataAccess.js';

const CUSTOMER_TYPES = ['Walk-in', 'Regular', 'Wholesale', 'Credit'];

export async function getCustomers(req, res) {
  const search = String(req.query.search || '').trim();
  const customers = await getAllCustomers(search);
  res.json(customers);
}

export async function createCustomer(req, res) {
  const name = String(req.body.name || '').trim();
  if (!name) return res.status(400).json({ message: 'Customer name is required.' });

  const phone = String(req.body.phone || '').trim();
  const email = String(req.body.email || '').trim();
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ message: 'Enter a valid email address.' });
  }

  const requestedType = String(req.body.type || 'Regular');
  const type = CUSTOMER_TYPES.includes(requestedType) ? requestedType : 'Regular';

  const customer = {
    id: `cust-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name,
    phone,
    email,
    type,
    notes: String(req.body.notes || '').trim(),
    createdBy: req.user?.id || null,
    createdAt: new Date().toISOString()
  };

  const saved = await saveCustomer(customer);
  await addAuditEvent('customer.created', 'customer', saved.id, { name, type }, req.user?.id);
  res.status(201).json(saved);
}

export async function editCustomer(req, res) {
  const existing = await findCustomerById(req.params.id);
  if (!existing) return res.status(404).json({ message: 'Customer not found.' });

  const updates = {};
  if (req.body.name !== undefined) {
    const name = String(req.body.name).trim();
    if (!name) return res.status(400).json({ message: 'Customer name is required.' });
    updates.name = name;
  }
  if (req.body.phone !== undefined) updates.phone = String(req.body.phone).trim();
  if (req.body.email !== undefined) {
    const email = String(req.body.email).trim();
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ message: 'Enter a valid email address.' });
    }
    updates.email = email;
  }
  if (req.body.type !== undefined && CUSTOMER_TYPES.includes(String(req.body.type))) {
    updates.type = String(req.body.type);
  }
  if (req.body.notes !== undefined) updates.notes = String(req.body.notes).trim();

  const updated = await updateCustomer(req.params.id, updates);
  await addAuditEvent('customer.updated', 'customer', req.params.id, updates, req.user?.id);
  res.json(updated);
}

export async function removeCustomer(req, res) {
  const existing = await findCustomerById(req.params.id);
  if (!existing) return res.status(404).json({ message: 'Customer not found.' });

  const deleted = await deleteCustomer(req.params.id);
  await addAuditEvent('customer.deleted', 'customer', req.params.id, { name: existing.name }, req.user?.id);
  res.json({ deleted });
}