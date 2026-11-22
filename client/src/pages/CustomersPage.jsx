import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { Users, UserPlus, Pencil, Trash2, Search, Phone, Mail, ShieldCheck, Building2 } from 'lucide-react';
import MetricCard from '../components/MetricCard';
import Modal from '../components/Modal';
import { API, formatDateTime } from '../utils/formatters';

const CUSTOMER_TYPES = ['Regular', 'Walk-in', 'Wholesale', 'Credit'];

const EMPTY_FORM = { name: '', phone: '', email: '', type: 'Regular', notes: '' };

function TypeBadge({ type }) {
  const key = (type || 'Regular').toLowerCase();
  return <span className={`cust-badge ${key}`}>{type}</span>;
}

export default function CustomersPage({ session, setNotice }) {
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchCustomers();
  }, []);

  async function fetchCustomers() {
    try {
      const { data } = await axios.get(`${API}/api/customers`);
      setCustomers(data);
    } catch {
      setNotice('Unable to load customers.');
    } finally {
      setLoading(false);
    }
  }

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return customers;
    return customers.filter(c =>
      c.name.toLowerCase().includes(needle) ||
      (c.phone || '').toLowerCase().includes(needle) ||
      (c.email || '').toLowerCase().includes(needle)
    );
  }, [customers, search]);

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  }

  function openEdit(customer) {
    setEditing(customer);
    setForm({
      name: customer.name || '',
      phone: customer.phone || '',
      email: customer.email || '',
      type: customer.type || 'Regular',
      notes: customer.notes || ''
    });
    setModalOpen(true);
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    try {
      if (editing) {
        await axios.patch(`${API}/api/customers/${editing.id}`, form);
        setNotice(`Customer ${form.name} updated.`);
      } else {
        await axios.post(`${API}/api/customers`, form);
        setNotice(`Customer ${form.name} created.`);
      }
      setModalOpen(false);
      fetchCustomers();
    } catch (err) {
      setNotice(err.response?.data?.message || 'Failed to save customer.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(customer) {
    const confirmed = window.confirm(`Remove ${customer.name} from the customer list?`);
    if (!confirmed) return;
    try {
      await axios.delete(`${API}/api/customers/${customer.id}`);
      setNotice(`${customer.name} removed.`);
      fetchCustomers();
    } catch (err) {
      setNotice(err.response?.data?.message || 'Failed to remove customer.');
    }
  }

  const wholesaleCount = customers.filter(c => c.type === 'Wholesale').length;
  const withContact = customers.filter(c => c.phone || c.email).length;

  return (
    <div className="customers-page">
      <section className="metrics">
        <MetricCard label="Total Customers" value={customers.length} icon={Users} />
        <MetricCard label="Wholesale Accounts" value={wholesaleCount} icon={Building2} />
        <MetricCard label="With Contact Details" value={withContact} icon={Phone} />
        <MetricCard label="Added By You" value={customers.filter(c => c.createdBy && c.createdBy === session?.id).length} icon={ShieldCheck} />
      </section>

      <section className="panel">
        <div className="panel-head">
          <div>
            <h2>Customer Directory</h2>
            <p className="muted">Registered customers available when billing a sale.</p>
          </div>
          <div className="button-group">
            <div className="search">
              <Search size={15} />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search customers..."
                aria-label="Search customers"
              />
            </div>
            <button className="primary" onClick={openCreate}>
              <UserPlus size={15} /> New Customer
            </button>
          </div>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Customer</th>
                <th>Contact</th>
                <th>Type</th>
                <th>Notes</th>
                <th>Added</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((customer) => (
                <tr key={customer.id}>
                  <td>
                    <div className="cust-name-cell">
                      <span className="cust-avatar">{customer.name.slice(0, 2).toUpperCase()}</span>
                      <div>
                        <b>{customer.name}</b>
                        <small>{customer.id}</small>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div className="cust-contact">
                      {customer.phone && <span><Phone size={12} /> {customer.phone}</span>}
                      {customer.email && <span><Mail size={12} /> {customer.email}</span>}
                      {!customer.phone && !customer.email && <span className="muted">—</span>}
                    </div>
                  </td>
                  <td><TypeBadge type={customer.type} /></td>
                  <td><small className="cust-notes">{customer.notes || '—'}</small></td>
                  <td>{formatDateTime(customer.createdAt)}</td>
                  <td>
                    <div className="row-actions">
                      <button className="icon-btn" onClick={() => openEdit(customer)} aria-label={`Edit ${customer.name}`}>
                        <Pencil size={15} />
                      </button>
                      <button className="icon-danger-btn" onClick={() => handleDelete(customer)} aria-label={`Remove ${customer.name}`}>
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {!loading && !filtered.length && (
            <p className="empty">
              {search ? 'No customers match your search.' : 'No customers yet. Create one to bill against it.'}
            </p>
          )}
          {loading && <p className="empty">Loading customers...</p>}
        </div>
      </section>

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? `Edit Customer — ${editing.name}` : 'Add New Customer'}
      >
        <form onSubmit={handleSave} className="form-grid">
          <label>
            Customer Name
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Ravi Deshmukh"
            />
          </label>

          <div className="form-grid two-col">
            <label>
              Phone
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="+91 98200 00000"
              />
            </label>

            <label>
              Customer Type
              <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                {CUSTOMER_TYPES.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </label>
          </div>

          <label>
            Email
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="customer@example.com"
            />
          </label>

          <label>
            Notes
            <textarea
              rows={3}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Preferences, allergies, billing notes..."
            />
          </label>

          <div className="modal-actions">
            <button type="button" className="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="primary" disabled={saving}>
              {saving ? 'Saving...' : editing ? 'Save Changes' : 'Create Customer'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}