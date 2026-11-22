import React, { useState, useRef, useEffect } from 'react';
import { Search, Bell, Check, Printer, Palette, Menu, ChevronDown } from 'lucide-react';

const THEME_OPTIONS = [
  { id: 'sage', label: 'Sage Emerald', color: '#2d765b', mode: 'Light' },
  { id: 'forest', label: 'Forest Botanical', color: '#2e6a57', mode: 'Light' },
  { id: 'ink', label: 'Nordic Ink', color: '#397b9b', mode: 'Light' },
  { id: 'azure', label: 'Azure Ocean', color: '#4b91c5', mode: 'Light' },
  { id: 'lavender', label: 'Lavender Royal', color: '#7668b2', mode: 'Light' },
  { id: 'rose', label: 'Velvet Rose', color: '#bd6378', mode: 'Light' },
  { id: 'amber', label: 'Golden Amber', color: '#bd8731', mode: 'Light' },
  { id: 'sunrise', label: 'Terracotta Sunrise', color: '#c66c49', mode: 'Light' },
  { id: 'olive', label: 'Warm Olive', color: '#788942', mode: 'Light' },
  { id: 'slate', label: 'Steel Slate', color: '#60758a', mode: 'Light' },
  { id: 'night', label: 'Emerald Night', color: '#71c5a7', mode: 'Dark' },
  { id: 'midnight', label: 'Midnight Navy', color: '#8ab3e8', mode: 'Dark' },
];

export default function Header({ 
  page, 
  user, 
  search, 
  setSearch, 
  theme, 
  onCycleTheme,
  onSelectTheme, 
  onThermalPrint,
  notifications,
  onMarkNotificationRead,
  onToggleMobileMenu
}) {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showThemes, setShowThemes] = useState(false);

  const themeDropdownRef = useRef(null);
  const notifDropdownRef = useRef(null);

  const unreadCount = notifications.filter(n => !n.read).length;
  const currentTheme = THEME_OPTIONS.find(t => t.id === theme) || THEME_OPTIONS[0];

  // Close dropdowns on click outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (themeDropdownRef.current && !themeDropdownRef.current.contains(event.target)) {
        setShowThemes(false);
      }
      if (notifDropdownRef.current && !notifDropdownRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function handlePickTheme(themeId) {
    if (onSelectTheme) {
      onSelectTheme(themeId);
    } else if (onCycleTheme) {
      onCycleTheme();
    }
    setShowThemes(false);
  }

  return (
    <header className="sticky-header">
      <div className="header-left">
        <button 
          className="mobile-menu-btn" 
          onClick={onToggleMobileMenu} 
          title="Open navigation menu"
          aria-label="Open menu"
        >
          <Menu size={22} />
        </button>
        <div>
          <p className="eyebrow">WORKSPACE / {page.toUpperCase()}</p>
          <h1>{page === 'Overview' ? `Good morning, ${user?.name?.split(' ')[0] || 'User'}.` : page}</h1>
        </div>
      </div>

      <div className="header-actions">
        <div className="search">
          <Search size={16} />
          <input 
            value={search} 
            onChange={(e) => setSearch(e.target.value)} 
            placeholder="Search medicines..." 
          />
        </div>

        {/* Theme Dropdown */}
        <div className="popover-container" ref={themeDropdownRef}>
          <button 
            type="button"
            className="secondary theme-trigger-btn" 
            onClick={() => {
              setShowThemes(!showThemes);
              setShowNotifications(false);
            }} 
            title="Choose Color Theme"
            aria-expanded={showThemes}
          >
            <span 
              className="theme-color-dot" 
              style={{ backgroundColor: currentTheme.color }} 
            />
            <Palette size={15} />
            <span className="btn-text">{currentTheme.label}</span>
            <ChevronDown size={14} className={`dropdown-arrow ${showThemes ? 'open' : ''}`} />
          </button>

          {showThemes && (
            <div className="theme-dropdown-menu">
              <div className="dropdown-header">
                <div>
                  <h4>Color Palette</h4>
                  <small className="muted">12 Themes (Light & Dark)</small>
                </div>
                <span className="pill">{currentTheme.mode}</span>
              </div>
              <div className="theme-grid-list">
                {THEME_OPTIONS.map((t) => {
                  const isSelected = t.id === theme;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      className={`theme-option-item ${isSelected ? 'active' : ''}`}
                      onClick={() => handlePickTheme(t.id)}
                    >
                      <span className="theme-swatch" style={{ backgroundColor: t.color }} />
                      <div className="theme-info">
                        <span className="theme-name">{t.label}</span>
                        <span className="theme-mode-badge">{t.mode}</span>
                      </div>
                      {isSelected && <Check size={14} className="theme-check" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Thermal Print Button */}
        <button className="secondary print-btn" onClick={onThermalPrint} title="Print thermal receipt">
          <Printer size={15} />
          <span className="btn-text">Thermal print</span>
        </button>

        {/* Notifications Popover */}
        <div className="popover-container" ref={notifDropdownRef}>
          <button 
            type="button"
            className={`secondary notification-bell ${unreadCount > 0 ? 'has-unread' : ''}`}
            onClick={() => {
              setShowNotifications(!showNotifications);
              setShowThemes(false);
            }}
            title="Notifications"
            aria-expanded={showNotifications}
          >
            <Bell size={15} />
            {unreadCount > 0 && <span className="badge">{unreadCount}</span>}
          </button>

          {showNotifications && (
            <div className="notifications-dropdown">
              <div className="dropdown-header">
                <h4>Notifications</h4>
                <span className="pill">{notifications.length} total</span>
              </div>
              <div className="dropdown-body">
                {notifications.length === 0 ? (
                  <p className="empty-notifications">No new notifications</p>
                ) : (
                  notifications.map((n) => (
                    <div key={n.id} className={`notification-item ${n.read ? 'read' : 'unread'}`}>
                      <div>
                        <strong>{n.title || n.message}</strong>
                        {n.detail && <p>{n.detail}</p>}
                      </div>
                      {!n.read && (
                        <button 
                          className="icon-btn" 
                          onClick={() => onMarkNotificationRead(n.id)}
                          title="Mark as read"
                        >
                          <Check size={14} />
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
