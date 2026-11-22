import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { ClipboardList, ShieldCheck, Filter } from 'lucide-react';
import { API, formatDateTime } from '../utils/formatters';

export default function AuditPage({ setNotice }) {
  const [audit, setAudit] = useState([]);
  const [filterType, setFilterType] = useState('ALL');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAuditEvents();
  }, []);

  async function fetchAuditEvents() {
    try {
      const { data } = await axios.get(`${API}/api/audit-events`);
      setAudit(data);
    } catch {
      setNotice('Audit history unavailable or restricted access.');
    } finally {
      setLoading(false);
    }
  }

  const filteredEvents = audit.filter(event => 
    filterType === 'ALL' || event.type === filterType
  );

  return (
    <div className="audit-page">
      <section className="panel">
        <div className="panel-head">
          <div>
            <h2><ClipboardList size={18} /> Governance & Audit History</h2>
            <p className="muted">Immutable server-side event logs for compliance and accountability.</p>
          </div>
          <div className="button-group">
            <div className="filter-select-wrap">
              <Filter size={15} />
              <select value={filterType} onChange={(e) => setFilterType(e.target.value)}>
                <option value="ALL">All Event Types</option>
                <option value="stock.adjusted">Stock Adjustments</option>
                <option value="sale.created">Sales Created</option>
                <option value="purchase.created">PO Created</option>
                <option value="purchase.received">PO Received</option>
                <option value="user.status_changed">User Status Changed</option>
              </select>
            </div>
            <span className="pill">{filteredEvents.length} events</span>
          </div>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Event Type</th>
                <th>Entity</th>
                <th>Details</th>
                <th>Actor User ID</th>
                <th>Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {filteredEvents.map((event) => (
                <tr key={event.id}>
                  <td>
                    <span className="pill">
                      {event.type}
                    </span>
                  </td>
                  <td><b>{event.entity}</b> <small>ID: {event.entityId}</small></td>
                  <td>
                    <code className="json-details">
                      {JSON.stringify(event.details)}
                    </code>
                  </td>
                  <td><b>{event.userId}</b></td>
                  <td>{formatDateTime(event.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!filteredEvents.length && (
            <p className="empty">No audit history events found.</p>
          )}
        </div>
      </section>
    </div>
  );
}
