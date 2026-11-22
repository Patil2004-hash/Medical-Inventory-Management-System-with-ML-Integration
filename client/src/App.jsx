import React, { useEffect, useState } from 'react';
import axios from 'axios';

import Sidebar from './components/Sidebar';
import Header from './components/Header';
import LoginPage from './pages/LoginPage';
import OverviewPage from './pages/OverviewPage';
import InventoryPage from './pages/InventoryPage';
import SalesPage from './pages/SalesPage';
import CustomersPage from './pages/CustomersPage';
import PurchasesPage from './pages/PurchasesPage';
import ReportsPage from './pages/ReportsPage';
import IntelligencePage from './pages/IntelligencePage';
import AuditPage from './pages/AuditPage';
import TeamPage from './pages/TeamPage';

import { API, THEMES, money } from './utils/formatters';
import './styles.css';

export default function App() {
  const [session, setSession] = useState(() => JSON.parse(localStorage.getItem('mims-session') || 'null'));
  const [data, setData] = useState(null);
  const [page, setPage] = useState('Overview');
  const [search, setSearch] = useState('');
  const [notice, setNotice] = useState('');
  const [theme, setTheme] = useState(() => localStorage.getItem('mims-theme') || 'sage');
  const [notifications, setNotifications] = useState([]);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Sync axios auth header
  useEffect(() => {
    if (session) {
      axios.defaults.headers.common.Authorization = `Bearer ${session.token}`;
      refreshDashboard();
      fetchNotifications();
    }
  }, [session]);

  // Sync theme
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('mims-theme', theme);
  }, [theme]);

  async function refreshDashboard() {
    try {
      const response = await axios.get(`${API}/api/dashboard`);
      setData(response.data);
    } catch {
      setNotice('API unavailable. Make sure the Node API server is running on port 5000.');
    }
  }

  async function fetchNotifications() {
    try {
      const { data: rows } = await axios.get(`${API}/api/notifications`);
      setNotifications(rows);
    } catch {
      // silent fallback
    }
  }

  async function handleMarkNotificationRead(id) {
    try {
      await axios.patch(`${API}/api/notifications/${id}/read`);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    } catch {
      // silent fallback
    }
  }

  async function handleSignIn(credentials) {
    try {
      const { data: next } = await axios.post(`${API}/api/auth/login`, credentials);
      const saved = { ...next.user, token: next.token };
      localStorage.setItem('mims-session', JSON.stringify(saved));
      setSession(saved);
      setNotice('');
    } catch (error) {
      setNotice(error.response?.data?.message || 'Unable to connect to the backend server. Make sure node server/index.js is running.');
    }
  }

  function handleSignOut() {
    localStorage.removeItem('mims-session');
    delete axios.defaults.headers.common.Authorization;
    setSession(null);
    setData(null);
  }

  function handleCycleTheme() {
    const currentIndex = THEMES.indexOf(theme);
    const nextTheme = THEMES[(currentIndex + 1) % THEMES.length];
    setTheme(nextTheme);
  }

  async function handleThermalPrint() {
    const receipt = `MIMS PHARMACY\n${new Date().toLocaleString()}\nInventory value: ${money(data?.metrics?.inventoryValue)}\nRevenue: ${money(data?.metrics?.revenue)}\n`;
    if (!navigator.bluetooth) {
      window.print();
      return;
    }
    try {
      const device = await navigator.bluetooth.requestDevice({ acceptAllDevices: true });
      const server = await device.gatt.connect();
      const services = await server.getPrimaryServices();
      const characteristic = (await Promise.all(services.map((service) => service.getCharacteristics()))).flat().find((item) => item.properties.write || item.properties.writeWithoutResponse);
      if (!characteristic) throw new Error('No writable printer characteristic.');
      await characteristic.writeValue(new TextEncoder().encode(receipt));
      setNotice('Receipt sent to the Bluetooth thermal printer.');
    } catch (error) {
      if (error.name !== 'NotFoundError') setNotice('Bluetooth thermal print unavailable; launching browser print dialog.');
      window.print();
    }
  }

  if (!session) {
    return <LoginPage onSignIn={handleSignIn} notice={notice} />;
  }

  const medicines = data?.medicines || [];

  return (
    <div className="app">
      <Sidebar 
        page={page} 
        setPage={setPage} 
        session={session} 
        notificationsCount={notifications.filter(n => !n.read).length}
        onSignOut={handleSignOut} 
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
      />

      <main className="content">
        <Header 
          page={page} 
          user={session} 
          search={search} 
          setSearch={setSearch} 
          theme={theme} 
          onCycleTheme={handleCycleTheme} 
          onSelectTheme={setTheme}
          onThermalPrint={handleThermalPrint} 
          notifications={notifications}
          onMarkNotificationRead={handleMarkNotificationRead}
          onToggleMobileMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        />

        <div className="content-body">
          {notice && (

          <div className="notice flex-between">
            <span>{notice}</span>
            <button className="text-btn" onClick={() => setNotice('')}>Dismiss</button>
          </div>
        )}

        {page === 'Overview' && (
          <OverviewPage 
            data={data} 
            setPage={setPage} 
            userRole={session.role}
            onOpenStockAdjustment={() => setPage('Inventory')}
            onOpenNewSale={() => setPage('Sales')}
          />
        )}

        {page === 'Inventory' && (
          <InventoryPage 
            medicines={medicines} 
            search={search} 
            onRefresh={refreshDashboard} 
            setNotice={setNotice} 
            userRole={session.role}
          />
        )}

        {page === 'Sales' && (
          <SalesPage 
            sales={data?.sales} 
            medicines={medicines} 
            onRefresh={refreshDashboard} 
            setNotice={setNotice} 
          />
        )}

        {page === 'Customers' && (
          <CustomersPage
            session={session}
            setNotice={setNotice}
          />
        )}

        {page === 'Purchases' && (
          <PurchasesPage 
            medicines={medicines} 
            onRefresh={refreshDashboard} 
            setNotice={setNotice} 
            userRole={session.role}
          />
        )}

        {page === 'Reports' && (
          <ReportsPage 
            setNotice={setNotice} 
          />
        )}

        {page === 'Intelligence' && (
          <IntelligencePage 
            setNotice={setNotice} 
          />
        )}

        {page === 'Audit' && (session.role === 'Administrator' || session.role === 'Pharmacist') && (
          <AuditPage 
            setNotice={setNotice} 
          />
        )}
        {page === 'Audit' && session.role === 'Staff' && (
          <div className="panel" style={{ padding: '2rem', textAlign: 'center' }}>
            <h2>Access Restricted</h2>
            <p className="muted">Audit trail inspection is reserved for Administrators and Pharmacists.</p>
          </div>
        )}

        {page === 'Team' && session.role === 'Administrator' && (
          <TeamPage 
            currentUser={session} 
            setNotice={setNotice} 
          />
        )}
        {page === 'Team' && session.role !== 'Administrator' && (
          <div className="panel" style={{ padding: '2rem', textAlign: 'center' }}>
            <h2>Access Restricted</h2>
            <p className="muted">User management and role administration is restricted to Administrators.</p>
          </div>
        )}
        </div>
      </main>
    </div>
  );
}
