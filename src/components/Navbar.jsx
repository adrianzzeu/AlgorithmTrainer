import React, { Fragment, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, Transition } from '@headlessui/react';
import {
  Binary,
  ChevronDown,
  Menu as MenuIcon,
  Moon,
  Sparkles,
  Sun,
  X,
} from 'lucide-react';
import { dynamicRoutes } from '../utils/routes';
import useDarkMode from '../hooks/useDarkMode';

export default function Navbar() {
  const location = useLocation();
  const [theme, toggleTheme] = useDarkMode();
  const [mobileOpen, setMobileOpen] = useState(false);

  const homeRoute = dynamicRoutes.find((route) => route.isHome);
  const learnRoute = dynamicRoutes.find((route) => route.group === 'foundation');
  const algorithmRoutes = dynamicRoutes.filter((route) => route.group === 'algorithm');
  const utilityRoutes = [homeRoute, learnRoute].filter(Boolean);

  const isRouteActive = (route) => location.pathname === route.path;
  const closeMobileMenu = () => setMobileOpen(false);

  return (
    <nav className="nav-shell glass-surface sticky top-0 z-50 transition-all duration-300">
      <div className="page-frame py-4">
        <div className="nav-panel flex items-center justify-between gap-4 rounded-[1.6rem] px-4 py-3 md:px-5">
          <Link to="/" className="nav-brand group flex min-w-0 items-center gap-3 shrink-0" onClick={closeMobileMenu}>
            <div className="nav-brand-mark">
              <img
                src="/mustang-logo.svg"
                alt="Mustang"
                className="relative h-9 w-auto transition-transform duration-300 group-hover:scale-110"
              />
            </div>
            <div className="min-w-0">
              <div className="nav-kicker">Digital Computers</div>
              <div className="text-sm font-semibold tracking-tight text-slate-900 dark:text-white sm:text-base">
                Algorithm Training Studio
              </div>
            </div>
          </Link>

          <div className="hidden items-center gap-2 lg:flex">
            {utilityRoutes.map((route) => (
              <Link
                key={route.path}
                to={route.path}
                className={`nav-link ${isRouteActive(route) ? 'nav-link-active' : ''}`}
              >
                {route.navName}
              </Link>
            ))}

            {algorithmRoutes.length > 0 && (
              <Menu as="div" className="relative inline-block text-left">
                <Menu.Button
                  className={`nav-link inline-flex items-center gap-2 ${
                    algorithmRoutes.some(isRouteActive) ? 'nav-link-active' : ''
                  }`}
                >
                  Algorithm Labs
                  <ChevronDown className="h-4 w-4 text-slate-400 transition-transform ui-open:rotate-180" />
                </Menu.Button>

                <Transition
                  as={Fragment}
                  enter="transition ease-out duration-150"
                  enterFrom="transform opacity-0 scale-95 -translate-y-1"
                  enterTo="transform opacity-100 scale-100 translate-y-0"
                  leave="transition ease-in duration-100"
                  leaveFrom="transform opacity-100 scale-100"
                  leaveTo="transform opacity-0 scale-95"
                >
                  <Menu.Items className="nav-dropdown absolute right-0 mt-3 w-[20rem] origin-top-right rounded-[1.4rem] p-2 shadow-2xl focus:outline-none">
                    <div className="px-3 pb-2 pt-1 text-xs font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
                      Choose a walkthrough
                    </div>
                    {algorithmRoutes.map((route) => (
                      <Menu.Item key={route.path}>
                        {({ active }) => (
                          <Link
                            to={route.path}
                            className={`nav-dropdown-item ${active ? 'nav-dropdown-item-hover' : ''} ${
                              isRouteActive(route) ? 'nav-dropdown-item-active' : ''
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              <span className="nav-icon-chip mt-0.5">
                                <Binary className="h-4 w-4" />
                              </span>
                              <div>
                                <div className="font-semibold text-slate-900 dark:text-slate-100">
                                  {route.name}
                                </div>
                                <div className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                                  {route.description}
                                </div>
                              </div>
                            </div>
                          </Link>
                        )}
                      </Menu.Item>
                    ))}
                  </Menu.Items>
                </Transition>
              </Menu>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={toggleTheme}
              className="theme-toggle"
              aria-label="Toggle color theme"
            >
              {theme === 'dark' ? (
                <Sun className="h-5 w-5 transition-transform duration-300 hover:rotate-45" />
              ) : (
                <Moon className="h-5 w-5 transition-transform duration-300 hover:-rotate-12" />
              )}
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
          className={`lg:hidden overflow-hidden transition-all duration-300 ease-in-out ${
            mobileOpen ? 'max-h-[40rem] pt-3 opacity-100' : 'max-h-0 opacity-0'
          }`}
        >
          <div className="nav-mobile-grid border-t border-slate-200/70 px-1 pb-2 pt-4 dark:border-slate-700/70">
            <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
              Study paths
            </div>
            {utilityRoutes.map((route) => (
              <Link
                key={route.path}
                to={route.path}
                onClick={closeMobileMenu}
                className={`nav-mobile-item ${isRouteActive(route) ? 'nav-mobile-item-active' : ''}`}
              >
                <div>
                  <div className="font-semibold text-slate-900 dark:text-slate-100">{route.name}</div>
                  <div className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                    {route.description}
                  </div>
                </div>
              </Link>
            ))}

            <div className="pt-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
              Algorithm labs
            </div>
            {algorithmRoutes.map((route) => (
              <Link
                key={route.path}
                to={route.path}
                onClick={closeMobileMenu}
                className={`nav-mobile-item ${isRouteActive(route) ? 'nav-mobile-item-active' : ''}`}
              >
                <div className="flex items-start gap-3">
                  <span className="nav-icon-chip mt-0.5">
                    <Sparkles className="h-4 w-4" />
                  </span>
                  <div>
                    <div className="font-semibold text-slate-900 dark:text-slate-100">{route.name}</div>
                    <div className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                      {route.description}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </nav>
  );
}
