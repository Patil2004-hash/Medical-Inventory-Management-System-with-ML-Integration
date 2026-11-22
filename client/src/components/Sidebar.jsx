import React from 'react';
import { 
  Boxes, 
  Package, 
  ReceiptText, 
  ShoppingCart, 
  ClipboardList, 
  BrainCircuit, 
  Users, 
  UserRound,
  ShieldCheck, 
  LogOut,
  X
} from 'lucide-react';

export default function Sidebar({ page, setPage, session, notificationsCount, onSignOut, isOpen, onClose }) {
  const navItems = [
    ['Overview', Boxes],
    ['Inventory', Package],
    ['Sales', ReceiptText],
    ['Customers', UserRound],
    ['Purchases', ShoppingCart],
    ['Reports', ClipboardList],
    ['Intelligence', BrainCircuit],
    ...(session?.role === 'Administrator' || session?.role === 'Pharmacist' ? [['Audit', ClipboardList]] : []),
    ...(session?.role === 'Administrator' ? [['Team', Users]] : [])
  ];

  function handleSelectPage(label) {
    setPage(label);
    if (onClose) onClose();
  }

  return (
    <>
      {isOpen && <div className="sidebar-backdrop" onClick={onClose} />}
      <aside className={isOpen ? 'mobile-open' : ''}>
        <div className="brand-row">
          <div className="brand">
            <span>M</span>
            <b>MIMS</b>
          </div>
          <button className="mobile-close-btn" onClick={onClose} aria-label="Close menu">
            <X size={20} />
          </button>
        </div>
        
        <p className="eyebrow">LAKEVIEW PHARMACY</p>
        
        <nav>
          {navItems.map(([label, Icon]) => (
            <button 
              key={label}
              className={page === label ? 'active' : ''} 
              onClick={() => handleSelectPage(label)}
            >
              <Icon size={17} />
              {label}
            </button>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="role">
            <ShieldCheck size={16} />
            <span>
              {session?.role || 'User'}
              <small>
                {notificationsCount ? `${notificationsCount} notification${notificationsCount > 1 ? 's' : ''}` : 'Signed in'}
              </small>
            </span>
          </div>
          <button onClick={onSignOut}>
            <LogOut size={16} />
            Sign out
          </button>
        </div>
      </aside>
    </>
  );
}
