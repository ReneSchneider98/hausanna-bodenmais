import { useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router';
import { ROLE_LABELS } from '@hausanna/shared';
import { useAuth } from '../auth/AuthContext.tsx';
import { Button } from './ui.tsx';

interface NavItem {
  to: string;
  label: string;
  icon: string;
  adminOnly?: boolean;
  sub?: boolean;
  end?: boolean;
}

const NAV: (NavItem | 'sep')[] = [
  { to: '/', label: 'Dashboard', icon: '⌂', end: true },
  { to: '/kalender', label: 'Kalender', icon: '▦' },
  { to: '/buchungen', label: 'Buchungen', icon: '☰' },
  'sep',
  { to: '/unterkuenfte', label: 'Unterkünfte', icon: '⌂', end: true },
  { to: '/unterkuenfte/saisons', label: 'Saisons & Preise', icon: '', sub: true },
  { to: '/unterkuenfte/zusatzleistungen', label: 'Zusatzleistungen', icon: '', sub: true },
  { to: '/kanaele', label: 'Kanäle', icon: '⇄', adminOnly: true },
  'sep',
  { to: '/inhalte', label: 'Inhalte', icon: '✎' },
  { to: '/design', label: 'Design', icon: '✿' },
  { to: '/medien', label: 'Medien', icon: '▣' },
  'sep',
  { to: '/benutzer', label: 'Benutzer', icon: '☺', adminOnly: true },
];

export function Layout() {
  const { user, logout, isAdmin } = useAuth();
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const wide = location.pathname.startsWith('/kalender');

  return (
    <div className="shell">
      {open ? <div className="sidebar-backdrop" onClick={() => setOpen(false)} /> : null}
      <nav className={`sidebar ${open ? 'open' : ''}`} aria-label="Hauptmenü">
        <div className="brand">
          <strong>Haus Anna</strong>
          <span>Verwaltung</span>
        </div>
        {NAV.filter((n) => n === 'sep' || !n.adminOnly || isAdmin).map((n, i) =>
          n === 'sep' ? (
            <div className="nav-sep" key={`sep-${i}`} />
          ) : (
            <NavLink
              onClick={() => setOpen(false)}
              key={n.to}
              to={n.to}
              end={n.end}
              className={({ isActive }) =>
                `nav-link ${n.sub ? 'nav-sub' : ''} ${isActive ? 'active' : ''}`
              }
            >
              {n.sub ? null : (
                <span className="nav-icon" aria-hidden>
                  {n.icon}
                </span>
              )}
              {n.label}
            </NavLink>
          ),
        )}
        <div style={{ marginTop: 'auto', padding: '16px 12px 0' }}>
          <a href="/" target="_blank" rel="noreferrer" className="small">
            Webseite ansehen ↗
          </a>
        </div>
      </nav>
      <div className="main">
        <header className="topbar">
          <Button
            variant="ghost"
            className="menu-btn"
            aria-label="Menü öffnen"
            onClick={() => setOpen(true)}
          >
            ☰ Menü
          </Button>
          <span />
          <div className="user">
            <span className="user-name">
              <strong>{user?.name}</strong>{' '}
              <span className="muted small">· {user ? ROLE_LABELS[user.role] : ''}</span>
            </span>
            <Button size="sm" onClick={() => void logout()}>
              Abmelden
            </Button>
          </div>
        </header>
        <main className={`content ${wide ? 'content-wide' : ''}`}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
