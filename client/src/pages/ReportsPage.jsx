import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Boxes, Package, ReceiptText, Download, AlertTriangle } from 'lucide-react';
import MetricCard from '../components/MetricCard';
import { API, money } from '../utils/formatters';

export default function ReportsPage({ setNotice }) {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReport();
  }, []);

  async function fetchReport() {
    try {
      const { data } = await axios.get(`${API}/api/reports/summary`);
      setReport(data);
    } catch {
      setNotice('Unable to load operational report summary.');
    } finally {
      setLoading(false);
    }
  }

  function downloadReportFile() {
    if (!report) return;
    const content = [
      `MIMS PHARMACY OPERATIONS REPORT`,
      `Generated At: ${new Date().toLocaleString()}`,
      `----------------------------------------`,
      `Total Inventory Units : ${report.inventoryUnits || 0}`,
      `Total Inventory Value : ${money(report.inventoryValue)}`,
      `Sales Recorded Count  : ${report.salesCount || 0}`,
      `Total Sales Revenue   : ${money(report.revenue)}`,
      `Low Stock Items Count : ${report.lowStock?.length || 0}`,
      `----------------------------------------`,
      `LOW STOCK INVENTORY SUMMARY:`,
      ...(report.lowStock || []).map(item => `- ${item.name} (SKU: ${item.sku}) | Stock: ${item.stock} ${item.unit} | Reorder Level: ${item.reorderLevel}`)
    ].join('\n');

    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([content], { type: 'text/plain' }));
    link.download = `mims-operations-report-${new Date().toISOString().slice(0, 10)}.txt`;
    link.click();
    URL.revokeObjectURL(link.href);
    setNotice('Operations report downloaded.');
  }

  if (loading) {
    return <div className="loading-state">Loading operational analytics...</div>;
  }

  return (
    <div className="reports-page">
      <section className="metrics">
        <MetricCard 
          label="Inventory Units" 
          value={report?.inventoryUnits || 0} 
          icon={Boxes} 
        />
        <MetricCard 
          label="Inventory Value" 
          value={money(report?.inventoryValue)} 
          icon={Package} 
        />
        <MetricCard 
          label="Sales Recorded" 
          value={report?.salesCount || 0} 
          icon={ReceiptText} 
        />
        <MetricCard 
          label="Revenue Total" 
          value={money(report?.revenue)} 
          icon={ReceiptText} 
        />
      </section>

      <section className="panel">
        <div className="panel-head">
          <div>
            <h2>Operations Summary & Export</h2>
            <p className="muted">Comprehensive stock balance and financial reporting.</p>
          </div>
          <button className="primary" onClick={downloadReportFile}>
            <Download size={15} /> Download Operations Report
          </button>
        </div>

        <div className="report-sections">
          <div className="report-card">
            <h3><AlertTriangle size={16} /> Low Stock & Reorder Breakdown</h3>
            <p className="muted">Medicines below configured reorder points needing immediate purchase POs.</p>

            <div className="table-wrap margin-top">
              <table>
                <thead>
                  <tr>
                    <th>Medicine</th>
                    <th>Current Stock</th>
                    <th>Reorder Level</th>
                    <th>Deficit / Needed</th>
                  </tr>
                </thead>
                <tbody>
                  {(report?.lowStock || []).map((item) => (
                    <tr key={item.id}>
                      <td><b>{item.name}</b> <small>{item.sku}</small></td>
                      <td><b>{item.stock}</b> {item.unit}</td>
                      <td>{item.reorderLevel}</td>
                      <td>
                        <span className="pill critical">
                          Need +{Math.max(0, item.reorderLevel - item.stock)} {item.unit}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {(!report?.lowStock || report.lowStock.length === 0) && (
                <p className="empty">All inventory levels are currently above reorder limits.</p>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
