import { useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router';
import { ROLE_LABELS } from '@hausanna/shared';
import { Api } from '../api/endpoints.ts';
import { useAuth } from '../auth/AuthContext.tsx';
import { useApi } from '../lib/useApi.ts';
import { Button } from './ui.tsx';

interface NavItem {
  to: string;
  label: string;
  icon: string;
  adminOnly?: boolean;
  sub?: boolean;
  end?: boolean;
}

/** Öffentliche Seite: auf dem Server dieselbe Domain, lokal läuft sie auf eigenem Port */
const SITE_URL = import.meta.env.DEV ? 'http://localhost:5173/' : '/';

function SiteIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M3 12h18M12 3c2.5 2.7 3.8 5.7 3.8 9s-1.3 6.3-3.8 9c-2.5-2.7-3.8-5.7-3.8-9S9.5 5.7 12 3Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
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
  const { data: settings } = useApi(() => Api.settings());
  const logo = settings?.design.logo;

  return (
    <div className="shell">
      {open ? <div className="sidebar-backdrop" onClick={() => setOpen(false)} /> : null}
      <nav className={`sidebar ${open ? 'open' : ''}`} aria-label="Hauptmenü">
        <a
          className="brand"
          href={SITE_URL}
          target="_blank"
          rel="noreferrer"
          title="Webseite in neuem Tab öffnen"
        >
          <span className="brand-logo">
            {logo ? <img src={logo.url} alt={logo.alt || 'Haus Anna'} /> : <SiteIcon />}
          </span>
          <span className="brand-link">Webseite öffnen ↗</span>
        </a>
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
            <a
              href={SITE_URL}
              target="_blank"
              rel="noreferrer"
              className="btn btn-sm site-link"
              title="Webseite in neuem Tab öffnen"
            >
              <SiteIcon />
              Webseite
            </a>
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
