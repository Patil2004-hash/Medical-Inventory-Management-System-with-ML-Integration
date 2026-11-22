/** Receipt helpers: plain text, ESC/POS bytes, print + download windows. */

export function formatCurrency(value) {
  const n = Number(value || 0);
  return `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function padPair(left, right, width = 32) {
  const l = String(left);
  const r = String(right);
  const gap = Math.max(1, width - l.length - r.length);
  return l + ' '.repeat(gap) + r;
}

/** Human-readable receipt body (also used for the on-screen receipt). */
export function buildReceiptText(sale, options = {}) {
  const { storeName = 'MIMS Pharmacy', storeTagline = 'Lakeview Pharmacy', footer = 'Thank you for your purchase!' } = options;
  const lines = [];
  const date = sale.paidAt || sale.createdAt;
  const when = date ? new Date(date).toLocaleString('en-IN') : '';

  lines.push(storeName.toUpperCase());
  lines.push(storeTagline);
  lines.push('-'.repeat(32));
  lines.push(`Invoice: ${sale.invoiceNumber}`);
  lines.push(`Date   : ${when}`);
  lines.push(`Cust.  : ${sale.customer || 'Walk-in customer'}`);
  lines.push('-'.repeat(32));

  (sale.lineItems || []).forEach((item, index) => {
    const gross = item.quantity * item.unitPrice;
    lines.push(`${index + 1}. ${item.name}${item.discountPercent > 0 ? `  (${item.discountPercent}% off)` : ''}`);
    lines.push('   ' + padPair(`   ${item.quantity} x ${formatCurrency(item.unitPrice)}`, formatCurrency(item.lineTotal ?? gross)));
  });

  lines.push('-'.repeat(32));
  lines.push(padPair('Items', `${sale.items} unit(s)`));
  if (sale.discountTotal > 0) {
    lines.push(padPair('Subtotal', formatCurrency(sale.subtotal)));
    lines.push(padPair('Discount', `- ${formatCurrency(sale.discountTotal)}`));
  }
  lines.push(padPair('Payment', sale.paymentMethod || 'Cash'));
  if ((sale.paymentMethod || 'Cash') === 'Cash' && sale.amountPaid != null) {
    lines.push(padPair('Paid', formatCurrency(sale.amountPaid)));
    if (sale.changeDue > 0) lines.push(padPair('Change', formatCurrency(sale.changeDue)));
  }
  lines.push('-'.repeat(32));
  lines.push(padPair('TOTAL', formatCurrency(sale.total)));
  lines.push('');
  lines.push(footer);
  if (sale.servedBy) lines.push(`Served by: ${sale.servedBy}`);

  return lines.join('\n');
}

/** ESC/POS byte stream for 58mm thermal printers. */
export function buildEscPos(sale, options = {}) {
  const encoder = new TextEncoder();
  const chunks = [];
  const ESC = '\x1b';
  const GS = '\x1d';

  chunks.push(`${ESC}@`);                       // initialise
  chunks.push(`${ESC}a\x01`);                    // centre
  chunks.push(`${ESC}!\x10`);                    // bold, double height
  chunks.push(buildReceiptText(sale, options).split('\n')[0]);
  chunks.push(`${ESC}!\x00`);                    // normal
  chunks.push(`${ESC}a\x00`);                    // left align
  chunks.push(buildReceiptText(sale, options).split('\n').slice(1).join('\n'));
  chunks.push('\n\n\n\n');
  chunks.push(`${GS}V\x00`);                     // cut

  return encoder.encode(chunks.join(''));
}

/** Opens a clean print window (browser print / "Save as PDF"). */
export function openPrintWindow(html, title = 'Receipt') {
  const win = window.open('', '_blank', 'width=420,height=680');
  if (!win) return false;

  win.document.write(`<!doctype html><html><head><meta charset="utf-8" />
    <title>${title}</title>
    <style>
      @page { size: 80mm auto; margin: 4mm; }
      * { box-sizing: border-box; }
      body {
        font-family: 'Segoe UI', system-ui, sans-serif;
        font-size: 12px; color: #111; margin: 0; padding: 4px;
        width: 72mm;
      }
      h1 { font-size: 15px; text-align: center; margin: 0 0 2px; }
      .tag { text-align: center; font-size: 11px; color: #444; margin-bottom: 6px; }
      .meta { display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 4px; }
      hr { border: none; border-top: 1px dashed #999; margin: 6px 0; }
      table { width: 100%; border-collapse: collapse; }
      td { padding: 2px 0; font-size: 11px; vertical-align: top; }
      td.r { text-align: right; white-space: nowrap; }
      .total td { font-size: 14px; font-weight: 800; padding-top: 6px; }
      .foot { text-align: center; margin-top: 8px; font-size: 11px; }
      .muted { color: #555; }
    </style></head>
    <body>${html}</body></html>`);
  win.document.close();
  win.focus();
  setTimeout(() => { win.print(); }, 250);
  return true;
}

/** Screen-rendered receipt markup reused by the print window. */
export function receiptHtml(sale, options = {}) {
  const date = sale.paidAt || sale.createdAt;
  const when = date ? new Date(date).toLocaleString('en-IN') : '';
  const rows = (sale.lineItems || []).map((item, i) => `
    <tr>
      <td>${i + 1}. ${item.name}${item.discountPercent > 0 ? ` (${item.discountPercent}% off)` : ''}</td>
      <td class="r">${item.quantity} x ${formatCurrency(item.unitPrice)}</td>
      <td class="r">${formatCurrency(item.lineTotal ?? item.quantity * item.unitPrice)}</td>
    </tr>`).join('');

  const isCash = (sale.paymentMethod || 'Cash') === 'Cash';

  return `
    <h1>${options.storeName || 'MIMS Pharmacy'}</h1>
    <div class="tag">${options.storeTagline || 'Lakeview Pharmacy'}</div>
    <hr />
    <div class="meta"><span>Invoice</span><b>${sale.invoiceNumber}</b></div>
    <div class="meta"><span>Date</span><span>${when}</span></div>
    <div class="meta"><span>Customer</span><span>${sale.customer || 'Walk-in customer'}</span></div>
    <hr />
    <table>${rows}</table>
    <hr />
    <table>
      <tr><td>Total units</td><td class="r">${sale.items}</td></tr>
      ${sale.discountTotal > 0 ? `<tr><td>Subtotal</td><td class="r">${formatCurrency(sale.subtotal)}</td></tr><tr><td>Discount</td><td class="r">- ${formatCurrency(sale.discountTotal)}</td></tr>` : ''}
      <tr><td>Payment</td><td class="r">${sale.paymentMethod || 'Cash'}</td></tr>
      ${isCash ? `<tr><td>Amount paid</td><td class="r">${formatCurrency(sale.amountPaid)}</td></tr>` : ''}
      ${isCash && sale.changeDue > 0 ? `<tr><td>Change</td><td class="r">${formatCurrency(sale.changeDue)}</td></tr>` : ''}
      <tr class="total"><td>GRAND TOTAL</td><td class="r">${formatCurrency(sale.total)}</td></tr>
    </table>
    <div class="foot">${options.footer || 'Thank you for your purchase!'}<br /><span class="muted">${sale.id}</span></div>
  `;
}

export function downloadTextFile(filename, content) {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Print to a Bluetooth thermal printer when the browser supports Web Bluetooth. */
export async function printViaBluetooth(sale, options = {}) {
  if (!('bluetooth' in navigator)) {
    return { ok: false, reason: 'Web Bluetooth is not supported in this browser. Use the 58mm print option instead.' };
  }

  try {
    const device = await navigator.bluetooth.requestDevice({
      acceptAllDevices: true,
      optionalServices: ['0000ff00-0000-1000-8000-00805f9b34fb']
    });

    if (!device.gatt) return { ok: false, reason: 'Selected device does not expose Bluetooth GATT.' };

    const server = await device.gatt.connect();
    const services = await server.getPrimaryServices();
    let characteristic = null;

    for (const service of services) {
      const characteristics = await service.getCharacteristics();
      characteristic = characteristics.find(c =>
        c.properties.write || c.properties.writeWithoutResponse
      );
      if (characteristic) break;
    }

    if (!characteristic) return { ok: false, reason: 'No writable characteristic found on this printer.' };

    const data = buildEscPos(sale, options);
    // Chunked write — many thermal printers cap the payload size per call.
    const chunkSize = 180;
    for (let offset = 0; offset < data.length; offset += chunkSize) {
      const chunk = data.slice(offset, offset + chunkSize);
      if (characteristic.properties.writeWithoutResponse) {
        await characteristic.writeValueWithoutResponse(chunk);
      } else {
        await characteristic.writeValueWithResponse(chunk);
      }
    }

    return { ok: true, deviceName: device.name || 'Bluetooth printer' };
  } catch (err) {
    return { ok: false, reason: err?.message || 'Bluetooth printing failed.' };
  }
}