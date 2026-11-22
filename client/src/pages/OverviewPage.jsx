import React from 'react';
import { Package, ReceiptText, AlertTriangle, ShieldCheck, Plus, ShoppingCart } from 'lucide-react';
import MetricCard from '../components/MetricCard';
import { money } from '../utils/formatters';

export default function OverviewPage({ data, setPage, userRole, onOpenStockAdjustment, onOpenNewSale }) {
  const canAdjust = userRole === 'Administrator' || userRole === 'Pharmacist';
  const medicines = data?.medicines || [];
  const lowStockItems = medicines.filter((item) => item.stock <= item.reorderLevel);
  const alerts = data?.alerts || [];

  return (
    <div className="overview-page">
      <section className="metrics">
        <MetricCard 
          label="Inventory value" 
          value={money(data?.metrics?.inventoryValue)} 
          icon={Package} 
        />
        <MetricCard 
          label="Revenue" 
          value={money(data?.metrics?.revenue)} 
          icon={ReceiptText} 
        />
        <MetricCard 
          label="Low stock items" 
          value={data?.metrics?.lowStock || 0} 
          icon={AlertTriangle} 
        />
        <MetricCard 
          label="Expiring soon" 
          value={data?.metrics?.expiring || 0} 
          icon={ShieldCheck} 
        />
      </section>

      <div className="overview-grid">
        <section className="panel main-panel">
          <div className="panel-head">
            <div>
              <h2>Inventory pulse</h2>
              <p className="muted">Stock requiring attention and operational focus.</p>
            </div>
            <div className="button-group">
              <button className="secondary" onClick={() => setPage('Inventory')}>
                View all inventory
              </button>
            </div>
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Medicine</th>
                  <th>Category</th>
                  <th>Stock</th>
                  <th>Expiry</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {medicines.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <b>{item.name}</b>
                      <small>{item.sku} · {item.unit}</small>
                    </td>
                    <td>{item.category}</td>
                    <td><b>{item.stock}</b></td>
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
            {!medicines.length && <p className="empty">No inventory records available.</p>}
          </div>
        </section>

        <section className="panel side-panel">
          <div className="panel-head">
            <div>
              <h2>Operational alerts</h2>
              <p className="muted">System health & reorder notices.</p>
            </div>
          </div>

          <div className="alerts-list">
            {alerts.length > 0 ? (
              alerts.map((alert) => (
                <div key={alert.id} className={`alert-card ${alert.type}`}>
                  <AlertTriangle size={16} />
                  <div>
                    <strong>{alert.title}</strong>
                    <p>{alert.detail}</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="empty">All stock levels are optimal.</p>
            )}
          </div>

          <div className="quick-actions-box">
            <h3>Quick Actions</h3>
            <div className="actions-grid">
              <button className="primary" onClick={onOpenNewSale}>
                <Plus size={15} /> New Sale
              </button>
              {canAdjust && (
                <button className="secondary" onClick={onOpenStockAdjustment}>
                  Adjust Stock
                </button>
              )}
              <button className="secondary" onClick={() => setPage('Purchases')}>
                <ShoppingCart size={15} /> Purchases
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
