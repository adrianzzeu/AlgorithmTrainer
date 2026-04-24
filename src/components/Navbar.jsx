import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Binary, Cpu, Home, Menu as MenuIcon, Moon, Sun, X } from 'lucide-react';
import { dynamicRoutes } from '../utils/routes';
import useDarkMode from '../hooks/useDarkMode';

const ROUTE_ICONS = {
  Home,
  LearnBasics: Binary,
  BoothDefault: Cpu,
  BoothRadix3: Cpu,
  BoothRadix4: Cpu,
  BoothRadix8: Cpu,
  SRTDivision: Cpu,
  SRT4Division: Cpu,
};

export default function Navbar({ isExportMode = false, toggleExportMode }) {
  const location = useLocation();
  const [theme, toggleTheme] = useDarkMode();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navRoutes = dynamicRoutes;
  const isRouteActive = (route) => location.pathname === route.path;
  const closeMobileMenu = () => setMobileOpen(false);

  return (
    <nav className="nav-shell glass-surface">
      <div className="page-frame py-4">
        <div className="nav-panel flex items-center justify-between gap-3 px-4 py-3 md:px-5">
          <Link
            to="/"
            className="nav-brand group flex min-w-0 items-center gap-3"
            onClick={closeMobileMenu}
          >
            <div className="nav-brand-mark">
              <img
                src="/mustang-logo.svg"
                alt="Mustang"
                className="h-8 w-auto transition-transform duration-200 group-hover:scale-105"
              />
            </div>
            <div className="min-w-0">
              <div className="nav-kicker">Digital Computers</div>
              <div className="truncate text-sm font-semibold tracking-tight text-slate-900 dark:text-white sm:text-base">
                Booth Lab
              </div>
            </div>
          </Link>

          <div className="hidden flex-1 items-center justify-center gap-2 lg:flex">
            {navRoutes.map((route) => (
              <Link
                key={route.path}
                to={route.path}
                className={`nav-link ${isRouteActive(route) ? 'nav-link-active' : ''}`}
              >
                {route.navName}
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={toggleExportMode}
              className={`export-toggle ${isExportMode ? 'export-toggle-active' : ''}`}
              aria-label="Toggle export mode"
            >
              <span className="hidden sm:inline">{isExportMode ? 'Exit Export' : 'Export'}</span>
              <span className="sm:hidden">{isExportMode ? 'Exit' : 'Exp'}</span>
            </button>

            <button
              onClick={toggleTheme}
              className="theme-toggle"
              aria-label="Toggle color theme"
            >
              {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>

            <button
              onClick={() => setMobileOpen((open) => !open)}
              className="mobile-toggle lg:hidden"
              aria-label="Toggle navigation menu"
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <MenuIcon className="h-5 w-5" />}
            </button>
          </div>
        </div>

        <div
          className={`overflow-hidden transition-all duration-200 ease-out lg:hidden ${
            mobileOpen ? 'max-h-[40rem] pt-3 opacity-100' : 'max-h-0 opacity-0'
          }`}
        >
          <div className="nav-mobile-grid grid gap-2 px-1 pt-3">
            <button
              onClick={() => {
                toggleExportMode();
                closeMobileMenu();
              }}
              className={`nav-mobile-item text-left ${isExportMode ? 'nav-mobile-item-active' : ''}`}
            >
              <div className="flex items-start gap-3">
                <span className="nav-icon-chip mt-0.5">
                  <Cpu className="h-4 w-4" />
                </span>
                <div>
                  <div className="font-semibold text-slate-900 dark:text-slate-100">
                    {isExportMode ? 'Exit Export Mode' : 'Enter Export Mode'}
                  </div>
                  <div className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                    Widen the algorithm pages and make the table view easier to export.
                  </div>
                </div>
              </div>
            </button>

            {navRoutes.map((route) => {
              const Icon = ROUTE_ICONS[route.fileName] ?? Binary;

              return (
                <Link
                  key={route.path}
                  to={route.path}
                  onClick={closeMobileMenu}
                  className={`nav-mobile-item ${isRouteActive(route) ? 'nav-mobile-item-active' : ''}`}
                >
                  <div className="flex items-start gap-3">
                    <span className="nav-icon-chip mt-0.5">
                      <Icon className="h-4 w-4" />
                    </span>
                    <div>
                      <div className="font-semibold text-slate-900 dark:text-slate-100">{route.name}</div>
                      <div className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                        {route.description}
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
}
