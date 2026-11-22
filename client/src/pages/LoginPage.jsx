import React, { useState } from 'react';
import { ShieldCheck, UserCheck, Users, Package, Lock, Mail, ArrowRight, Eye, EyeOff } from 'lucide-react';

export default function LoginPage({ onSignIn, notice }) {
  const [login, setLogin] = useState({
    email: 'admin@mims.local',
    password: 'dddd'
  });

  const [showPassword, setShowPassword] = useState(false);

  const demoAccounts = [
    {
      role: 'Administrator',
      name: 'Alex Smith',
      email: 'admin@mims.local',
      desc: 'Full platform access',
      icon: ShieldCheck
    },
    {
      role: 'Pharmacist',
      name: 'Sarah Connor',
      email: 'pharmacist@mims.local',
      desc: 'Stock, purchasing & audit',
      icon: UserCheck
    },
    {
      role: 'Staff',
      name: 'John Miller',
      email: 'staff@mims.local',
      desc: 'Sales, billing & read-only stock',
      icon: Users
    }
  ];

  function handleSubmit(event) {
    event.preventDefault();
    onSignIn(login);
  }

  function handleSelectRole(account) {
    setLogin({
      email: account.email,
      password: 'dddd'
    });
  }

  return (
    <main className="login">
      <aside className="login-aside">
        <div className="login-brand">
          <span className="login-mark">M</span>
          <b>MIMS</b>
        </div>
        <p className="login-eyebrow">MEDICAL OPERATIONS</p>
        <h1 className="login-hero">Run the pharmacy with clarity.</h1>
        <p className="login-sub">
          A focused workspace for inventory, purchasing, sales, and stock decisions with role-based access control.
        </p>
        <ul className="login-features">
          <li><Package size={16} /> Real-time inventory &amp; expiry tracking</li>
          <li><ShieldCheck size={16} /> Role-based access control</li>
          <li><UserCheck size={16} /> Sales, billing &amp; audit trail</li>
        </ul>
        <div className="login-aside-foot">
          <span><Lock size={13} /> Encrypted session</span>
          <span>JWT auth</span>
        </div>
      </aside>

      <section className="login-panel">
        <div className="login-card">
        <div className="login-mini-brand">
          <span className="login-mark">M</span>
          <b>MIMS</b>
        </div>
        <div className="login-panel-head">
          <h2>Welcome back</h2>
          <p className="muted">Sign in to your pharmacy workspace.</p>
        </div>
        <div className="login-roles">
          <p className="login-roles-label">SELECT DEMO ROLE:</p>
          <div className="login-role-grid">
            {demoAccounts.map((acc) => {
              const active = login.email === acc.email;
              return (
                <button
                  key={acc.email}
                  type="button"
                  onClick={() => handleSelectRole(acc)}
                  aria-pressed={active}
                  className={active ? 'login-role active' : 'login-role'}
                >
                  <span className="login-role-icon"><acc.icon size={17} /></span>
                  <span className="login-role-body">
                    <span className="login-role-title">{acc.role} <small>{acc.name}</small></span>
                    <span className="login-role-desc">{acc.desc}</span>
                  </span>
                  <span className="login-role-check" aria-hidden="true" />
                </button>
              );
            })}
          </div>
          <p className="login-hint">Credentials are filled automatically — or type your own below.</p>
        </div>

        <div className="login-divider"><span>Sign in</span></div>

        <form onSubmit={handleSubmit} className="login-form">
          <label>
            Email
            <span className="login-field">
              <Mail size={16} />
              <input
                type="email"
                required
                placeholder='Enter your email id'
                onChange={(e) => setLogin({ ...login, email: e.target.value })}
              />
            </span>
          </label>

          <label>
            Password
            <span className="login-field">
              <Lock size={16} />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                placeholder='*****************'
                onChange={(e) => setLogin({ ...login, password: e.target.value })}
              />
              <button
                type="button"
                className="login-eye"
                onClick={() => setShowPassword(v => !v)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                aria-pressed={showPassword}
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </span>
          </label>

          <button className="primary login-submit" type="submit">
            Sign in as {demoAccounts.find(a => a.email === login.email)?.role || 'User'}
            <ArrowRight size={16} />
          </button>
        </form>

        {notice && <p className="error">{notice}</p>}

        <p className="login-card-foot">
          <ShieldCheck size={13} /> Access is scoped by role and every action is audit-logged.
        </p>
        </div>
      </section>
    </main>
  );
}