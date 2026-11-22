import React from 'react';

export default function MetricCard({ label, value, icon: Icon, subtext, trend }) {
  return (
    <article className="metric-card">
      <div className="metric-top">
        <span className="metric-label">{label}</span>
        {Icon && (
          <div className="metric-icon-badge">
            <Icon size={18} />
          </div>
        )}
      </div>
      <div className="metric-bottom">
        <strong className="metric-value">{value}</strong>
        {subtext && <span className="metric-subtext">{subtext}</span>}
      </div>
    </article>
  );
}
