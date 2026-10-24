import { useEffect, useId, useRef, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router';
import type { PublicSite } from '../lib/types';
import { ChevronDown, CloseIcon, MenuIcon } from './Icons';

/** Hover-Öffnen nur am Desktop mit Maus (mobil öffnet ein Tipp) */
const desktopHover = () =>
  typeof window !== 'undefined' &&
  window.matchMedia('(hover: hover) and (min-width: 981px)').matches;

/** Kopfzeile mit Logo, Menü (Dropdown für Unterkünfte) und Hamburger-Menü auf kleinen Bildschirmen. */
export function Header({ site }: { site: PublicSite }) {
  const [openPath, setOpenPath] = useState<string | null>(null);
  const [dropdownPath, setDropdownPath] = useState<string | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();
  const menuId = useId();
  const dropdownRef = useRef<HTMLLIElement>(null);
  const logo = site.settings.design.logo;
  const accActive = site.accommodations.some((a) => location.pathname.startsWith(`/${a.slug}/`));
  // Menüs gelten nur für die Seite, auf der sie geöffnet wurden → schließen automatisch beim Seitenwechsel
  const open = openPath === location.pathname;
  const dropdown = dropdownPath === location.pathname;
  const setOpen = (fn: (o: boolean) => boolean) => setOpenPath(fn(open) ? location.pathname : null);
  const setDropdown = (v: boolean | ((d: boolean) => boolean)) => {
    const next = typeof v === 'function' ? v(dropdown) : v;
    setDropdownPath(next ? location.pathname : null);
  };

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (!dropdown) return;
    const onDown = (e: MouseEvent | FocusEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node))
        setDropdownPath(null);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setDropdownPath(null);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('focusin', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('focusin', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [dropdown]);

  const menuPages = [...site.menuPages];
  // Reihenfolge wie bisher: Service, Ausflugstipps, Kontakt (Kontakt immer zuletzt)
  menuPages.sort((a, b) => Number(a.slug === 'kontakt') - Number(b.slug === 'kontakt'));

  return (
    <header className={`site-header${scrolled ? ' is-scrolled' : ''}`}>
      <div className="site-header__row">
        <Link to="/" className="site-header__logo" aria-label="Haus Anna Bodenmais – Startseite">
          {logo ? (
            <img src={logo.url} alt={logo.alt || 'Haus Anna Bodenmais'} width={190} height={70} />
          ) : (
            <span className="site-header__logo-text">Haus Anna</span>
          )}
        </Link>
        <button
          type="button"
          className="site-header__burger"
          aria-expanded={open}
          aria-controls={menuId}
          aria-label={open ? 'Menü schließen' : 'Menü öffnen'}
          onClick={() => setOpen((o) => !o)}
        >
          {open ? <CloseIcon size={30} /> : <MenuIcon size={32} />}
        </button>
        <nav id={menuId} className={`site-nav${open ? ' is-open' : ''}`} aria-label="Hauptmenü">
          <ul className="site-nav__list">
            <li>
              <NavLink to="/" end className="site-nav__link">
                Startseite
              </NavLink>
            </li>
            <li
              ref={dropdownRef}
              className={`site-nav__has-sub${dropdown ? ' is-open' : ''}`}
              onMouseEnter={() => desktopHover() && setDropdown(true)}
              onMouseLeave={() => desktopHover() && setDropdown(false)}
            >
              <button
                type="button"
                className={`site-nav__link site-nav__toggle${accActive ? ' active' : ''}`}
                aria-expanded={dropdown}
                aria-haspopup="true"
                onClick={() => setDropdown((d) => !d)}
              >
                Apartments und Ferienwohnungen <ChevronDown className="site-nav__chevron" />
              </button>
              <ul className="site-nav__sub">
                {site.accommodations.map((a) => (
                  <li key={a.id}>
                    <NavLink to={`/${a.slug}/`} className="site-nav__sublink">
                      {a.menuLabel ? `${a.name}: ${a.menuLabel}` : a.name}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </li>
            {menuPages.map((p) => (
              <li key={p.slug}>
                <NavLink to={`/${p.slug}/`} className="site-nav__link">
                  {p.title}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </header>
  );
}
