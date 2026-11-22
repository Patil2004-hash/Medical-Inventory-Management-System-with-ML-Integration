import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Package, Plus, Sliders, AlertTriangle, ShieldCheck, History } from 'lucide-react';
import MetricCard from '../components/MetricCard';
import Modal from '../components/Modal';
import { API, money } from '../utils/formatters';

export default function InventoryPage({ medicines, search, onRefresh, setNotice, userRole }) {
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [selectedMedicine, setSelectedMedicine] = useState('');
  const [delta, setDelta] = useState('');
  const [reason, setReason] = useState('');
  const [adjustments, setAdjustments] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (showHistory) {
      axios.get(`${API}/api/medicines/stock-adjustments`)
        .then(({ data }) => setAdjustments(data))
        .catch(() => setNotice('Unable to load adjustment logs.'));
    }
  }, [showHistory, setNotice]);

  const filteredMedicines = (medicines || []).filter((item) =>
    `${item.name} ${item.sku} ${item.category}`.toLowerCase().includes(search.toLowerCase())
  );

  const canAdjust = userRole === 'Administrator' || userRole === 'Pharmacist';

  async function handleStockAdjustment(e) {
    e.preventDefault();
    if (!selectedMedicine || !delta || !reason.trim()) {
      setNotice('Please fill in medicine, quantity change, and reason.');
      return;
    }
    setSubmitting(true);
    try {
      await axios.post(`${API}/api/medicines/stock-adjustment`, {
        name: selectedMedicine,
        delta: Number(delta),
        reason
      });
      setNotice(`Stock adjustment recorded for ${selectedMedicine}.`);
      setShowAdjustModal(false);
      setSelectedMedicine('');
      setDelta('');
      setReason('');
      onRefresh();
      if (showHistory) {
        const { data } = await axios.get(`${API}/api/medicines/stock-adjustments`);
        setAdjustments(data);
      }
    } catch (err) {
      setNotice(err.response?.data?.message || 'Failed to adjust stock.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="inventory-page">
      <section className="metrics">
        <MetricCard 
          label="Total SKU count" 
          value={medicines.length} 
          icon={Package} 
        />
        <MetricCard 
          label="Total stock units" 
          value={medicines.reduce((sum, item) => sum + item.stock, 0)} 
          icon={Package} 
        />
        <MetricCard 
          label="Low stock count" 
          value={medicines.filter(m => m.stock <= m.reorderLevel).length} 
          icon={AlertTriangle} 
        />
        <MetricCard 
          label="Total valuation" 
          value={money(medicines.reduce((sum, item) => sum + (item.stock * item.price), 0))} 
          icon={ShieldCheck} 
        />
      </section>

      <section className="panel">
        <div className="panel-head">
          <div>
            <h2>Medicine Register</h2>
            <p className="muted">Live inventory balances and reorder points.</p>
          </div>
          <div className="button-group">
            <button className="secondary" onClick={() => setShowHistory(!showHistory)}>
              <History size={15} />
              {showHistory ? 'Hide history' : 'Adjustment history'}
            </button>
            {canAdjust && (
              <button className="primary" onClick={() => setShowAdjustModal(true)}>
                <Sliders size={15} /> Adjust Stock
              </button>
            )}
          </div>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Medicine & SKU</th>
                <th>Category</th>
                <th>Stock level</th>
                <th>Reorder point</th>
                <th>Unit price</th>
                <th>Expiry date</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredMedicines.map((item) => (
                <tr key={item.id}>
                  <td>
                    <b>{item.name}</b>
                    <small>{item.sku} · {item.unit}</small>
                  </td>
                  <td>{item.category}</td>
                  <td><b>{item.stock}</b></td>
                  <td>{item.reorderLevel}</td>
                  <td>{money(item.price)}</td>
                  <td>{item.expiryDate}</td>
                  <td>
                    <span className={`pill ${(item.status || '').toLowerCase().replace(' ', '-')}`}>
                      {item.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!filteredMedicines.length && (
            <p className="empty">No medicine records match your filter.</p>
          )}
        </div>
      </section>

      {showHistory && (
        <section className="panel margin-top">
          <div className="panel-head">
            <div>
              <h2>Recent Stock Adjustments</h2>
              <p className="muted">Audit trail of stock manual adjustments.</p>
            </div>
            <span className="pill">{adjustments.length} records</span>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Medicine</th>
                  <th>Delta</th>
                  <th>Resulting stock</th>
                  <th>Reason</th>
                  <th>Adjusted by</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {adjustments.map((adj) => (
                  <tr key={adj.id}>
                    <td><b>{adj.medicineName}</b></td>
                    <td>
                      <span className={`pill ${adj.delta > 0 ? '' : 'critical'}`}>
                        {adj.delta > 0 ? `+${adj.delta}` : adj.delta}
                      </span>
                    </td>
                    <td><b>{adj.resultingStock}</b></td>
                    <td>{adj.reason}</td>
                    <td>{adj.adjustedBy}</td>
                    <td>{new Date(adj.createdAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!adjustments.length && <p className="empty">No adjustment history found.</p>}
          </div>
        </section>
      )}

      <Modal 
        isOpen={showAdjustModal} 
        onClose={() => setShowAdjustModal(false)} 
        title="Record Stock Adjustment"
      >
        <form onSubmit={handleStockAdjustment} className="form-grid">
          <label>
            Select Medicine
            <select 
              required 
              value={selectedMedicine} 
              onChange={(e) => setSelectedMedicine(e.target.value)}
            >
              <option value="">-- Choose medicine --</option>
              {medicines.map((m) => (
                <option key={m.id} value={m.name}>
                  {m.name} (Current: {m.stock})
                </option>
              ))}
            </select>
          </label>

          <label>
            Quantity Change (Delta)
            <small className="field-hint">Use positive number to add stock, negative to subtract (e.g. +10 or -5)</small>
            <input 
              type="number" 
              required 
              placeholder="e.g. 15 or -5"
              value={delta} 
              onChange={(e) => setDelta(e.target.value)} 
            />
          </label>

          <label>
            Reason for Adjustment
            <input 
              type="text" 
              required 
              placeholder="e.g. Stock audit variance, damaged goods"
              value={reason} 
              onChange={(e) => setReason(e.target.value)} 
            />
          </label>

          <div className="modal-actions">
            <button type="button" className="secondary" onClick={() => setShowAdjustModal(false)}>
              Cancel
            </button>
            <button type="submit" className="primary" disabled={submitting}>
              {submitting ? 'Recording...' : 'Submit Adjustment'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
