import React from 'react';
import { dynamicRoutes } from '../utils/routes';

export default function Footer() {
  const visibleRoutes = dynamicRoutes.filter((route) => !route.isHome);

  return (
    <footer className="footer-shell">
      <div className="page-frame">
        <div className="footer-panel flex flex-col gap-3 rounded-[1.5rem] px-5 py-4 text-sm text-slate-600 dark:text-slate-400 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="font-semibold text-slate-900 dark:text-slate-100">Booth Lab</div>
            <div className="mt-1 text-xs uppercase tracking-[0.2em] text-slate-500 dark:text-slate-500">
              Fixed-point, Booth, Radix-3, Radix-4
            </div>
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400">
            {visibleRoutes.length} study pages
          </div>
        </div>
      </div>
    </footer>
  );
}
