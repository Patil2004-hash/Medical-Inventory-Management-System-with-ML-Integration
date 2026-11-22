import React, { useState } from 'react';
import {
  X, Printer, Bluetooth, FileDown, ReceiptText, CheckCircle2, Banknote, Smartphone, CreditCard
} from 'lucide-react';
import {
  formatCurrency, buildReceiptText, receiptHtml, openPrintWindow, printViaBluetooth, downloadTextFile
} from '../utils/receipt';

const PAYMENT_ICONS = {
  Cash: Banknote,
  UPI: Smartphone,
  Card: CreditCard
};

export default function ReceiptModal({ sale, onClose }) {
  const [busy, setBusy] = useState('');
  const [toast, setToast] = useState(null);

  if (!sale) return null;

  const PayIcon = PAYMENT_ICONS[sale.paymentMethod] || Banknote;
  const isCash = sale.paymentMethod === 'Cash';

  function handlePrint() {
    setBusy('print');
    const opened = openPrintWindow(receiptHtml(sale), `Receipt ${sale.invoiceNumber}`);
    setBusy('');
    setToast(opened
      ? { type: 'ok', text: 'Print dialog opened — choose a printer or “Save as PDF”.' }
      : { type: 'err', text: 'Pop-up blocked. Allow pop-ups for this site to print.' });
  }

  async function handleThermal() {
    setBusy('bt');
    const result = await printViaBluetooth(sale);
    setBusy('');
    setToast(result.ok
      ? { type: 'ok', text: `Receipt sent to ${result.deviceName}.` }
      : { type: 'err', text: result.reason });
  }

  function handleDownload() {
    setBusy('dl');
    downloadTextFile(`${sale.invoiceNumber}.txt`, buildReceiptText(sale));
    setBusy('');
    setToast({ type: 'ok', text: 'Receipt downloaded as a text file.' });
  }

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Sale receipt">
      <div className="modal-container receipt-modal">
        <div className="modal-header">
          <div className="receipt-title">
            <span className="receipt-done"><CheckCircle2 size={18} /></span>
            <div>
              <h3>Payment Successful</h3>
              <small>{sale.invoiceNumber} · saved to sales history</small>
            </div>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Close receipt">
            <X size={18} />
          </button>
        </div>

        <div className="receipt-paper">
          <div className="receipt-store">MIMS Pharmacy</div>
          <div className="receipt-store-sub">Lakeview Pharmacy</div>

          <div className="receipt-meta">
            <div><span>Invoice</span><b>{sale.invoiceNumber}</b></div>
            <div><span>Date</span><b>{new Date(sale.paidAt || sale.createdAt).toLocaleString('en-IN')}</b></div>
            <div><span>Customer</span><b>{sale.customer || 'Walk-in customer'}</b></div>
          </div>

          <table className="receipt-table">
            <thead>
              <tr><th>Item</th><th>Qty × Price</th><th>Amount</th></tr>
            </thead>
            <tbody>
              {(sale.lineItems || []).map((item, i) => (
                <tr key={i}>
                  <td>
                    {item.name}
                    {item.discountPercent > 0 && <em className="receipt-disc">{item.discountPercent}% off</em>}
                  </td>
                  <td className="r">{item.quantity} × {formatCurrency(item.unitPrice)}</td>
                  <td className="r"><b>{formatCurrency(item.lineTotal ?? item.quantity * item.unitPrice)}</b></td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="receipt-totals">
            <div className="row"><span>Total units</span><b>{sale.items}</b></div>
            {sale.discountTotal > 0 && (
              <>
                <div className="row"><span>Subtotal</span><b>{formatCurrency(sale.subtotal)}</b></div>
                <div className="row discount"><span>Discount</span><b>− {formatCurrency(sale.discountTotal)}</b></div>
              </>
            )}
            <div className="row"><span><PayIcon size={13} /> {sale.paymentMethod}</span><b>{formatCurrency(sale.amountPaid ?? sale.total)}</b></div>
            {isCash && sale.changeDue > 0 && (
              <div className="row change"><span>Change due</span><b>{formatCurrency(sale.changeDue)}</b></div>
            )}
            <div className="row grand"><span>Grand Total</span><b>{formatCurrency(sale.total)}</b></div>
          </div>

          <p className="receipt-thanks">Thank you for your purchase!</p>
        </div>

        {toast && <div className={`receipt-toast ${toast.type}`}>{toast.text}</div>}

        <div className="receipt-actions">
          <button className="primary" onClick={handlePrint} disabled={busy}>
            <Printer size={15} /> Print / Save PDF
          </button>
          <button className="secondary" onClick={handleThermal} disabled={busy}>
            <Bluetooth size={15} /> {busy === 'bt' ? 'Connecting...' : 'Thermal Printer'}
          </button>
          <button className="secondary" onClick={handleDownload} disabled={busy}>
            <FileDown size={15} /> Download
          </button>
          <button className="text-btn" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}