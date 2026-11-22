import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { ShoppingCart, Plus, CheckCircle, Clock, Trash2, PackageCheck } from 'lucide-react';
import MetricCard from '../components/MetricCard';
import Modal from '../components/Modal';
import { API, money, formatDateTime } from '../utils/formatters';

export default function PurchasesPage({ medicines, onRefresh, setNotice, userRole }) {
  const [purchases, setPurchases] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [supplier, setSupplier] = useState('');
  const [lineItems, setLineItems] = useState([
    { medicineId: '', name: '', quantity: 10, unitPrice: 5 }
  ]);
  const [submitting, setSubmitting] = useState(false);
  const [receivingId, setReceivingId] = useState(null);

  const canManage = userRole === 'Administrator' || userRole === 'Pharmacist';

  useEffect(() => {
    fetchPurchases();
  }, []);

  async function fetchPurchases() {
    try {
      const { data } = await axios.get(`${API}/api/purchases`);
      setPurchases(data);
    } catch {
      setNotice('Unable to load purchase orders.');
    }
  }

  function handleAddLine() {
    setLineItems([...lineItems, { medicineId: '', name: '', quantity: 10, unitPrice: 5 }]);
  }

  function handleRemoveLine(index) {
    if (lineItems.length === 1) return;
    setLineItems(lineItems.filter((_, i) => i !== index));
  }

  function handleMedicineChange(index, medicineId) {
    const med = medicines.find((m) => m.id === medicineId || m.name === medicineId);
    const updated = [...lineItems];
    if (med) {
      updated[index] = {
        ...updated[index],
        medicineId: med.id,
        name: med.name,
        unitPrice: med.price || 5
      };
    } else {
      updated[index] = { ...updated[index], medicineId: '', name: '', unitPrice: 5 };
    }
    setLineItems(updated);
  }

  function handleQuantityChange(index, qty) {
    const updated = [...lineItems];
    updated[index].quantity = Math.max(1, Number(qty) || 1);
    setLineItems(updated);
  }

  function handlePriceChange(index, price) {
    const updated = [...lineItems];
    updated[index].unitPrice = Math.max(0, Number(price) || 0);
    setLineItems(updated);
  }

  const grandTotal = lineItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
  const totalItemsCount = lineItems.reduce((sum, item) => sum + item.quantity, 0);

  async function handleCreatePurchase(e) {
    e.preventDefault();
    if (!supplier.trim()) {
      setNotice('Supplier name is required.');
      return;
    }
    if (!lineItems.length || lineItems.some(item => !item.name)) {
      setNotice('Please select a valid medicine for all line items.');
      return;
    }

    setSubmitting(true);
    try {
      await axios.post(`${API}/api/purchases`, {
        supplier: supplier.trim(),
        total: grandTotal,
        items: totalItemsCount,
        lineItems: lineItems.map(item => ({
          medicineId: item.medicineId,
          name: item.name,
          quantity: item.quantity,
          unitPrice: item.unitPrice
        }))
      });

      setNotice(`Purchase order submitted for ${supplier}.`);
      setShowCreateModal(false);
      setSupplier('');
      setLineItems([{ medicineId: '', name: '', quantity: 10, unitPrice: 5 }]);
      fetchPurchases();
      onRefresh();
    } catch (err) {
      setNotice(err.response?.data?.message || 'Failed to create purchase order.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleReceivePurchase(id) {
    setReceivingId(id);
    try {
      const { data } = await axios.patch(`${API}/api/purchases/${id}/receive`);
      if (data.alreadyReceived) {
        setNotice('This purchase order was already received.');
      } else {
        setNotice('Purchase order received into inventory successfully.');
      }
      fetchPurchases();
      onRefresh();
    } catch (err) {
      setNotice(err.response?.data?.message || 'Failed to receive purchase order.');
    } finally {
      setReceivingId(null);
    }
  }

  const pendingCount = purchases.filter(p => p.status === 'Pending').length;
  const receivedCount = purchases.filter(p => p.status === 'Received').length;
  const totalSpend = purchases.reduce((sum, p) => sum + (p.total || 0), 0);

  return (
    <div className="purchases-page">
      <section className="metrics">
        <MetricCard 
          label="Purchase Orders" 
          value={purchases.length} 
          icon={ShoppingCart} 
        />
        <MetricCard 
          label="Pending Arrival" 
          value={pendingCount} 
          icon={Clock} 
        />
        <MetricCard 
          label="Received & Stocked" 
          value={receivedCount} 
          icon={CheckCircle} 
        />
        <MetricCard 
          label="Total Purchase Value" 
          value={money(totalSpend)} 
          icon={ShoppingCart} 
        />
      </section>

      <section className="panel">
        <div className="panel-head">
          <div>
            <h2>Purchasing & Supplier Register</h2>
            <p className="muted">Purchase orders, supplier contracts, and inventory receiving.</p>
          </div>
          {canManage && (
            <button className="primary" onClick={() => setShowCreateModal(true)}>
              <Plus size={15} /> New Purchase Order
            </button>
          )}
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>PO Number</th>
                <th>Supplier</th>
                <th>Units</th>
                <th>Line items</th>
                <th>Total value</th>
                <th>Status</th>
                <th>Date</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {purchases.map((po) => (
                <tr key={po.id}>
                  <td><b>{po.purchaseNumber}</b></td>
                  <td>{po.supplier}</td>
                  <td>{po.items} items</td>
                  <td>
                    <small>
                      {(po.lineItems || []).map(li => `${li.name} (+${li.quantity})`).join(', ')}
                    </small>
                  </td>
                  <td><b>{money(po.total)}</b></td>
                  <td>
                    <span className={`pill ${po.status === 'Received' ? '' : 'low-stock'}`}>
                      {po.status}
                    </span>
                  </td>
                  <td>{formatDateTime(po.createdAt || po.receivedAt)}</td>
                  <td>
                    {po.status === 'Pending' && canManage ? (
                      <button 
                        className="secondary" 
                        disabled={receivingId === po.id}
                        onClick={() => handleReceivePurchase(po.id)}
                      >
                        <PackageCheck size={14} />
                        {receivingId === po.id ? 'Receiving...' : 'Receive into Stock'}
                      </button>
                    ) : (
                      <span className="muted-text">
                        {po.status === 'Received' ? 'Stock Updated' : 'View Only'}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!purchases.length && <p className="empty">No purchase orders recorded yet.</p>}
        </div>
      </section>

      <Modal 
        isOpen={showCreateModal} 
        onClose={() => setShowCreateModal(false)} 
        title="Create Purchase Order"
        className="purchase-modal"
      >
        <form onSubmit={handleCreatePurchase} className="form-grid">
          <label>
            Supplier / Vendor Name
            <input 
              type="text" 
              required 
              placeholder="e.g. Apex Pharma Wholesalers"
              value={supplier} 
              onChange={(e) => setSupplier(e.target.value)} 
            />
          </label>

          <div className="line-items-section">
            <label className="section-label">Order Line Items</label>
            <div className="purchase-line-item-header" aria-hidden="true">
              <span>Medicine</span>
              <span>Quantity</span>
              <span>Unit Cost</span>
              <span>Amount</span>
              {lineItems.length > 1 && <span />}
            </div>
            {lineItems.map((item, idx) => (
              <div key={idx} className="purchase-line-item-row">
                <div className="purchase-medicine">
                  <select 
                    required 
                    value={item.medicineId || item.name} 
                    onChange={(e) => handleMedicineChange(idx, e.target.value)}
                  >
                    <option value="">-- Select medicine --</option>
                    {medicines.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} (Current Stock: {m.stock})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <input 
                    type="number" 
                    min="1" 
                    required 
                    placeholder="Qty"
                    aria-label={`Quantity for line ${idx + 1}`}
                    value={item.quantity} 
                    onChange={(e) => handleQuantityChange(idx, e.target.value)} 
                  />
                </div>

                <div>
                  <input 
                    type="number" 
                    step="0.1" 
                    min="0" 
                    required 
                    placeholder="Unit cost"
                    aria-label={`Unit cost for line ${idx + 1}`}
                    value={item.unitPrice} 
                    onChange={(e) => handlePriceChange(idx, e.target.value)} 
                  />
                </div>

                <strong className="purchase-line-total">
                  {money(item.quantity * item.unitPrice)}
                </strong>

                {lineItems.length > 1 && (
                  <button 
                    type="button" 
                    className="icon-danger-btn" 
                    onClick={() => handleRemoveLine(idx)}
                    aria-label={`Remove line ${idx + 1}`}
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            ))}

            <button type="button" className="secondary add-line-btn" onClick={handleAddLine}>
              <Plus size={14} /> Add Purchase Item
            </button>
          </div>

          <div className="sale-summary">
            <div>
              <span>Total Units to Receive:</span>
              <strong>{totalItemsCount} units</strong>
            </div>
            <div>
              <span>PO Total Cost:</span>
              <strong className="grand-total">{money(grandTotal)}</strong>
            </div>
          </div>

          <div className="modal-actions">
            <button type="button" className="secondary" onClick={() => setShowCreateModal(false)}>
              Cancel
            </button>
            <button type="submit" className="primary" disabled={submitting}>
              {submitting ? 'Submitting PO...' : 'Create Purchase Order'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
