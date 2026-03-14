import React from 'react';
import { dynamicRoutes } from '../utils/routes';

export default function Footer() {
  const visibleRoutes = dynamicRoutes.filter((route) => !route.isHome);

  return (
    <footer className="footer-shell">
      <div className="page-frame">
        <div className="footer-panel flex flex-col gap-3 rounded-[1.75rem] px-5 py-5 text-sm text-slate-600 dark:text-slate-400 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="font-semibold text-slate-900 dark:text-slate-100">DC Algorithm Training Studio</div>
            <div className="mt-1 text-xs uppercase tracking-[0.24em] text-slate-500 dark:text-slate-500">
              Foundations, Booth walkthroughs, and fixed-point practice
            </div>
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400">
            {visibleRoutes.length} interactive labs available
          </div>
        </div>
      </div>
    </footer>
  );
}
