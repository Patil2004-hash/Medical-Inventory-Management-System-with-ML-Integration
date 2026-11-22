import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { ReceiptText, Plus, ShoppingCart, Trash2, CheckCircle2, Search, UserRound, X, Banknote, Smartphone, CreditCard } from 'lucide-react';
import MetricCard from '../components/MetricCard';
import Modal from '../components/Modal';
import ReceiptModal from '../components/ReceiptModal';
import { API, money, formatDateTime } from '../utils/formatters';

const PAYMENT_METHODS = [
  { key: 'Cash', icon: Banknote, hint: 'Cash tendered & change' },
  { key: 'UPI', icon: Smartphone, hint: 'Collect via UPI app' },
  { key: 'Card', icon: CreditCard, hint: 'Swipe or chip' }
];

export default function SalesPage({ sales: initialSales, medicines, onRefresh, setNotice }) {
  function TypePill({ type }) {
    const key = (type || 'Regular').toLowerCase();
    return <span className={`cust-badge ${key}`}>{type}</span>;
  }
  const [sales, setSales] = useState(initialSales || []);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [customer, setCustomer] = useState('Walk-in customer');
  const [customers, setCustomers] = useState([]);
  const [customerId, setCustomerId] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustomerPicker, setShowCustomerPicker] = useState(false);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [quickCustomer, setQuickCustomer] = useState({ name: '', phone: '' });
  const [savingCustomer, setSavingCustomer] = useState(false);
  const [step, setStep] = useState('items');
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [amountPaid, setAmountPaid] = useState('');
  const [completedSale, setCompletedSale] = useState(null);
  const [historyReceipt, setHistoryReceipt] = useState(null);
  const [medSearch, setMedSearch] = useState({});
  const [lineItems, setLineItems] = useState([
    { medicineId: '', name: '', quantity: 1, unitPrice: 0 }
  ]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchSales();
    fetchCustomers();
  }, []);

  async function fetchCustomers() {
    try {
      const { data } = await axios.get(`${API}/api/customers`);
      setCustomers(data);
    } catch {
      /* customer list is optional for checkout */
    }
  }

  function selectCustomer(record) {
    setCustomerId(record.id);
    setCustomer(record.name);
    setCustomerSearch('');
    setShowCustomerPicker(false);
  }

  function selectWalkIn() {
    setCustomerId('');
    setCustomer('Walk-in customer');
    setCustomerSearch('');
    setShowCustomerPicker(false);
  }

  async function handleQuickAddCustomer(e) {
    e.preventDefault();
    const name = quickCustomer.name.trim();
    if (!name) return;

    setSavingCustomer(true);
    try {
      const { data } = await axios.post(`${API}/api/customers`, {
        name,
        phone: quickCustomer.phone.trim(),
        type: 'Regular'
      });
      setCustomers(prev => [data, ...prev]);
      selectCustomer(data);
      setQuickCustomer({ name: '', phone: '' });
      setShowQuickAdd(false);
      setNotice(`Customer ${name} created.`);
    } catch (err) {
      setNotice(err.response?.data?.message || 'Failed to create customer.');
    } finally {
      setSavingCustomer(false);
    }
  }

  const filteredCustomers = customerSearch.trim()
    ? customers.filter(c =>
        c.name.toLowerCase().includes(customerSearch.trim().toLowerCase()) ||
        (c.phone || '').toLowerCase().includes(customerSearch.trim().toLowerCase())
      )
    : customers;

  async function fetchSales() {
    try {
      const { data } = await axios.get(`${API}/api/sales`);
      setSales(data);
    } catch {
      setNotice('Unable to load sales history.');
    }
  }

  function handleAddLine() {
    setLineItems([...lineItems, { medicineId: '', name: '', quantity: 1, unitPrice: 0 }]);
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
        unitPrice: med.price,
        stock: med.stock
      };
    } else {
      updated[index] = { ...updated[index], medicineId: '', name: '', unitPrice: 0, stock: 0 };
    }
    setLineItems(updated);
  }

  function handleQuantityChange(index, qty) {
    const updated = [...lineItems];
    updated[index].quantity = Math.max(1, Number(qty) || 1);
    setLineItems(updated);
  }

  function handleDiscountChange(index, value) {
    const updated = [...lineItems];
    const raw = Number(value);
    updated[index].discountPercent = Number.isFinite(raw) ? Math.min(100, Math.max(0, raw)) : 0;
    setLineItems(updated);
  }

  const round2 = (value) => Math.round((Number(value) || 0) * 100) / 100;

  function lineTotals(item) {
    const gross = (item.quantity || 0) * (item.unitPrice || 0);
    const discount = round2(gross * (item.discountPercent || 0)) / 100;
    return { gross: round2(gross), discount: round2(discount), net: round2(gross - discount) };
  }

  const grandTotal = lineItems.reduce((sum, item) => sum + lineTotals(item).net, 0);
  const subtotalTotal = lineItems.reduce((sum, item) => sum + lineTotals(item).gross, 0);
  const discountTotal = round2(subtotalTotal - grandTotal);
  const totalItemsCount = lineItems.reduce((sum, item) => sum + item.quantity, 0);

  function filterMedicines(needle) {
    const term = String(needle || '').trim().toLowerCase();
    if (!term) return medicines;
    return medicines.filter(m =>
      m.name.toLowerCase().includes(term) ||
      (m.sku || '').toLowerCase().includes(term) ||
      (m.category || '').toLowerCase().includes(term)
    );
  }

  function handleProceedToPayment(e) {
    e.preventDefault();
    if (!lineItems.length || lineItems.some(item => !item.name)) {
      setNotice('Please select a valid medicine for all line items.');
      return;
    }
    for (const line of lineItems) {
      const med = medicines.find(m => m.id === line.medicineId || m.name === line.name);
      if (med && med.stock < line.quantity) {
        setNotice(`Insufficient stock for ${line.name}. Available: ${med.stock}`);
        return;
      }
    }
    setPaymentMethod('Cash');
    setAmountPaid(String(grandTotal));
    setStep('payment');
  }

  async function handleConfirmPayment(e) {
    e.preventDefault();

    const paid = Number(amountPaid);
    if (paymentMethod === 'Cash' && (!Number.isFinite(paid) || paid < grandTotal)) {
      setNotice('Amount received must be at least the grand total.');
      return;
    }

    setSubmitting(true);
    try {
      const { data } = await axios.post(`${API}/api/sales`, {
        customerId: customerId || undefined,
        customer: customer || 'Walk-in customer',
        total: grandTotal,
        items: totalItemsCount,
        paymentMethod,
        amountPaid: paymentMethod === 'Cash' ? paid : grandTotal,
        lineItems: lineItems.map(item => ({
          medicineId: item.medicineId,
          name: item.name,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          discountPercent: item.discountPercent || 0
        }))
      });

      const saved = data;
      setSales(prev => [saved, ...prev]);
      setCompletedSale(saved);
      setStep('receipt');
      setNotice(`Sale ${saved.invoiceNumber} completed.`);

      setCustomer('Walk-in customer');
      setCustomerId('');
      setCustomerSearch('');
      setLineItems([{ medicineId: '', name: '', quantity: 1, unitPrice: 0 }]);
      setMedSearch({});
      onRefresh();
      fetchSales();
    } catch (err) {
      setNotice(err.response?.data?.message || 'Failed to process sale.');
    } finally {
      setSubmitting(false);
    }
  }

  function closeSaleFlow() {
    setShowCreateModal(false);
    setStep('items');
    setCompletedSale(null);
  }

  const totalRevenue = sales.reduce((sum, s) => sum + (s.total || 0), 0);
  const avgTicket = sales.length ? totalRevenue / sales.length : 0;

  return (
    <div className="sales-page">
      <section className="metrics">
        <MetricCard 
          label="Total Revenue" 
          value={money(totalRevenue)} 
          icon={ReceiptText} 
        />
        <MetricCard 
          label="Transactions" 
          value={sales.length} 
          icon={ShoppingCart} 
        />
        <MetricCard 
          label="Avg Ticket Size" 
          value={money(avgTicket)} 
          icon={ReceiptText} 
        />
        <MetricCard 
          label="Total Items Sold" 
          value={sales.reduce((sum, s) => sum + (s.items || 0), 0)} 
          icon={CheckCircle2} 
        />
      </section>

      <section className="panel">
        <div className="panel-head">
          <div>
            <h2>Sales & Billing Register</h2>
            <p className="muted">Recorded sales transactions and customer billing.</p>
          </div>
          <button className="primary" onClick={() => setShowCreateModal(true)}>
            <Plus size={15} /> Create Sale
          </button>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Invoice #</th>
                <th>Customer</th>
                <th>Line items details</th>
                <th>Total amount</th>
                <th>Payment</th>
                <th>Date & Time</th>
                <th>Receipt</th>
              </tr>
            </thead>
            <tbody>
              {sales.map((sale) => (
                <tr key={sale.id}>
                  <td><b>{sale.invoiceNumber}</b></td>
                  <td>
                    <div className="sale-customer">
                      <span>{sale.customer}</span>
                      {sale.customerId && <TypePill type={sale.customerType} />}
                    </div>
                  </td>
                  <td>
                    <div className="sale-items">
                      <small title={(sale.lineItems || []).map(li => `${li.name} (x${li.quantity})`).join(', ')}>
                        {(sale.lineItems || []).map(li => `${li.name} (x${li.quantity})`).join(', ') || 'Standard pharmacy sale'}
                      </small>
                      <em>{sale.items} item(s)</em>
                    </div>
                  </td>
                  <td><b>{money(sale.total)}</b></td>
                  <td>
                    <span className={`pay-badge ${(sale.paymentMethod || 'Cash').toLowerCase()}`}>
                      {sale.paymentMethod || 'Cash'}
                    </span>
                  </td>
                  <td>{formatDateTime(sale.createdAt)}</td>
                  <td>
                    <button className="icon-btn" onClick={() => setHistoryReceipt(sale)} aria-label={`View receipt for ${sale.invoiceNumber}`} title="View receipt">
                      <ReceiptText size={15} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!sales.length && <p className="empty">No sales transactions recorded yet.</p>}
        </div>
      </section>

      <Modal 
        isOpen={showCreateModal && step !== 'receipt'} 
        onClose={() => setShowCreateModal(false)} 
        title={step === 'payment' ? 'Collect Payment' : 'Create New Pharmacy Sale'}
      >
        <form onSubmit={step === 'items' ? handleProceedToPayment : handleConfirmPayment} className="form-grid">
          {step === 'items' && (
          <>
          <div className="customer-picker">
            <label className="section-label">Customer</label>

            <div className="customer-picker-control">
              <span className="customer-picker-icon"><UserRound size={15} /></span>
              <input
                type="text"
                value={showCustomerPicker ? customerSearch : customer}
                onFocus={() => { setShowCustomerPicker(true); setCustomerSearch(''); }}
                onChange={(e) => {
                  setShowCustomerPicker(true);
                  setCustomerSearch(e.target.value);
                }}
                placeholder="Search customers or leave blank for walk-in..."
                aria-label="Customer"
              />
              {customerId && !showCustomerPicker && (
                <button
                  type="button"
                  className="customer-clear"
                  onClick={selectWalkIn}
                  aria-label="Clear customer"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {customerId && !showCustomerPicker && (
              <span className="customer-tag">
                Linked to customer record
                <em>{customers.find(c => c.id === customerId)?.type || 'Regular'}</em>
              </span>
            )}

            {showCustomerPicker && (
              <div className="customer-dropdown">
                <button type="button" className="customer-option walkin" onClick={selectWalkIn}>
                  <span className="cust-avatar ghost">WI</span>
                  <div>
                    <b>Walk-in customer</b>
                    <small>No customer record linked</small>
                  </div>
                </button>

                {filteredCustomers.map(c => (
                  <button key={c.id} type="button" className="customer-option" onClick={() => selectCustomer(c)}>
                    <span className="cust-avatar">{c.name.slice(0, 2).toUpperCase()}</span>
                    <div>
                      <b>{c.name}</b>
                      <small>{c.phone || c.email || c.type}</small>
                    </div>
                  </button>
                ))}

                {!filteredCustomers.length && !customerSearch.trim() && (
                  <p className="empty">No customers saved yet.</p>
                )}

                <button
                  type="button"
                  className="customer-add-inline"
                  onClick={() => { setShowQuickAdd(true); setShowCustomerPicker(false); }}
                >
                  <Plus size={14} /> Create new customer
                </button>
              </div>
            )}

            {showQuickAdd && (
              <div className="customer-quick-add">
                <input
                  type="text"
                  autoFocus
                  placeholder="Customer name"
                  value={quickCustomer.name}
                  onChange={(e) => setQuickCustomer({ ...quickCustomer, name: e.target.value })}
                  aria-label="New customer name"
                />
                <input
                  type="tel"
                  placeholder="Phone (optional)"
                  value={quickCustomer.phone}
                  onChange={(e) => setQuickCustomer({ ...quickCustomer, phone: e.target.value })}
                  aria-label="New customer phone"
                />
                <button type="button" className="secondary" onClick={() => setShowQuickAdd(false)}>
                  Cancel
                </button>
                <button
                  type="button"
                  className="primary"
                  disabled={savingCustomer || !quickCustomer.name.trim()}
                  onClick={handleQuickAddCustomer}
                >
                  {savingCustomer ? 'Saving...' : 'Save'}
                </button>
              </div>
            )}
          </div>

          <div className="line-items-section">
            <label className="section-label">Order Line Items</label>

            <div className="line-item-header" aria-hidden="true">
              <span>Medicine</span>
              <span className="line-h-qty">Quantity</span>
              <span className="line-h-disc">Discount</span>
              <span className="line-h-total">Amount</span>
            </div>

            {lineItems.map((item, idx) => (
              <div key={idx} className="line-item-row">
                <div className="flex-2">
                  <div className="med-picker">
                    <div className="med-picker-control">
                      <Search size={15} className="med-picker-icon" />
                      <input
                        type="text"
                        value={medSearch[idx] ?? (item.name || '')}
                        onFocus={() => setMedSearch({ ...medSearch, [idx]: '' })}
                        onChange={(e) => setMedSearch({ ...medSearch, [idx]: e.target.value })}
                        placeholder="Search medicine, SKU or category..."
                        aria-label={`Medicine for line ${idx + 1}`}
                      />
                      {item.name && (
                        <button
                          type="button"
                          className="customer-clear"
                          onClick={() => {
                            setMedSearch({ ...medSearch, [idx]: '' });
                            handleMedicineChange(idx, '');
                          }}
                          aria-label="Clear medicine"
                        >
                          <X size={14} />
                        </button>
                      )}
                    </div>

                    {(medSearch[idx] !== undefined) && (
                      <div className="med-dropdown">
                        {filterMedicines(medSearch[idx]).slice(0, 40).map(m => (
                          <button
                            key={m.id}
                            type="button"
                            className="med-option"
                            disabled={m.stock <= 0}
                            onClick={() => {
                              handleMedicineChange(idx, m.id);
                              setMedSearch({ ...medSearch, [idx]: undefined });
                            }}
                          >
                            <div>
                              <b>{m.name}</b>
                              <small>{m.sku} · {m.category}</small>
                            </div>
                            <div className="med-option-right">
                              <span>{money(m.price)}</span>
                              <em className={m.stock <= 0 ? 'out' : m.stock <= (m.reorderLevel || 0) ? 'low' : ''}>
                                {m.stock <= 0 ? 'Out of stock' : `${m.stock} ${m.unit || ''}`}
                              </em>
                            </div>
                          </button>
                        ))}
                        {!filterMedicines(medSearch[idx]).length && (
                          <p className="empty">No medicine matches “{medSearch[idx]}”.</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>

<div className="flex-1">
                  <input
                    type="number"
                    min="1"
                    required
                    value={item.quantity}
                    onChange={(e) => handleQuantityChange(idx, e.target.value)}
                    placeholder="Qty"
                    aria-label={`Quantity for line ${idx + 1}`}
                  />
                </div>

                <div className="flex-1 discount-input">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="1"
                    value={item.discountPercent ?? 0}
                    onChange={(e) => handleDiscountChange(idx, e.target.value)}
                    placeholder="Disc %"
                    aria-label={`Discount percent for line ${idx + 1}`}
                  />
                  <span>%</span>
                </div>

                <div className="line-price">
                  {lineTotals(item).discount > 0 && (
                    <del className="line-gross">{money(lineTotals(item).gross)}</del>
                  )}
                  <span>{money(lineTotals(item).net)}</span>
                </div>

                {lineItems.length > 1 && (
                  <button 
                    type="button" 
                    className="icon-danger-btn" 
                    onClick={() => handleRemoveLine(idx)}
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            ))}

            <button type="button" className="secondary add-line-btn" onClick={handleAddLine}>
              <Plus size={14} /> Add Line Item
            </button>
          </div>

<div className="sale-summary">
            <div>
              <span>Items Total:</span>
              <strong>{totalItemsCount} units</strong>
            </div>
            {discountTotal > 0 && (
              <>
                <div>
                  <span>Subtotal:</span>
                  <strong>{money(subtotalTotal)}</strong>
                </div>
                <div className="summary-discount">
                  <span>Discount:</span>
                  <strong>− {money(discountTotal)}</strong>
                </div>
              </>
            )}
            <div>
              <span>Grand Total:</span>
              <strong className="grand-total">{money(grandTotal)}</strong>
            </div>
          </div>
          </>
          )}

            {step === 'payment' && (
              <div className="payment-step">
                <p className="section-label">Payment Method</p>
                <div className="payment-methods">
                  {PAYMENT_METHODS.map(({ key, icon: Icon, hint }) => (
                    <button
                      key={key}
                      type="button"
                      className={paymentMethod === key ? 'payment-method active' : 'payment-method'}
                      onClick={() => {
                        setPaymentMethod(key);
                        setAmountPaid(String(grandTotal));
                      }}
                    >
                      <Icon size={18} />
                      <b>{key}</b>
                      <small>{hint}</small>
                    </button>
                  ))}
                </div>

                {paymentMethod === 'Cash' ? (
                  <div className="cash-block">
                    <label>
                      Amount Received
                      <input
                        type="number"
                        min={grandTotal}
                        step="0.01"
                        value={amountPaid}
                        onChange={(e) => setAmountPaid(e.target.value)}
                        aria-label="Amount received"
                      />
                    </label>

                    <div className="quick-cash">
                      {[grandTotal, Math.ceil(grandTotal / 100) * 100, Math.ceil(grandTotal / 500) * 500, Math.ceil(grandTotal / 1000) * 1000]
                        .filter((v, i, arr) => v >= grandTotal && arr.indexOf(v) === i)
                        .slice(0, 4)
                        .map(v => (
                          <button key={v} type="button" className="chip" onClick={() => setAmountPaid(String(v))}>
                            {money(v)}
                          </button>
                        ))}
                    </div>

                    <div className={`change-block ${Number(amountPaid) >= grandTotal ? 'ok' : ''}`}>
                      <span>Change to return</span>
                      <b>{money(Math.max(0, (Number(amountPaid) || 0) - grandTotal))}</b>
                    </div>
                  </div>
                ) : (
                  <div className="cash-block">
                    <div className="change-block ok">
                      <span>Amount charged ({paymentMethod})</span>
                      <b>{money(grandTotal)}</b>
                    </div>
                    <p className="payment-hint">
                      {paymentMethod === 'UPI'
                        ? 'Ask the customer to scan the pharmacy UPI QR and confirm, then press Confirm Payment.'
                        : 'Insert or tap the card on the terminal, then press Confirm Payment.'}
                    </p>
                  </div>
                )}
              </div>
            )}

            <div className="sale-steps" aria-hidden="true">
              <span className={step === 'items' ? 'active' : 'done'}>1 · Items</span>
              <i />
              <span className={step === 'payment' ? 'active' : ''}>2 · Payment</span>
              <i />
              <span>3 · Receipt</span>
            </div>

            <div className="modal-actions">
              {step === 'items' ? (
                <>
                  <button type="button" className="secondary" onClick={() => setShowCreateModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="primary" disabled={grandTotal <= 0}>
                    Proceed to Payment ({money(grandTotal)})
                  </button>
                </>
              ) : (
                <>
                  <button type="button" className="secondary" onClick={() => setStep('items')}>
                    Back
                  </button>
                  <button type="submit" className="primary" disabled={submitting}>
                    {submitting ? 'Processing...' : `Confirm Payment (${money(grandTotal)})`}
                  </button>
                </>
              )}
            </div>
          </form>
      </Modal>

      {step === 'receipt' && completedSale && (
        <ReceiptModal sale={completedSale} onClose={closeSaleFlow} />
      )}

      {historyReceipt && (
        <ReceiptModal sale={historyReceipt} onClose={() => setHistoryReceipt(null)} />
      )}
    </div>
  );
}
