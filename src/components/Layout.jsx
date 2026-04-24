import React from 'react';
import Navbar from './Navbar';
import Footer from './Footer';
import useExportMode from '../hooks/useExportMode';

export default function Layout({ children }) {
  const [isExportMode, toggleExportMode] = useExportMode();

  return (
    <div
      className={`app-shell min-h-screen flex flex-col text-slate-900 dark:text-slate-100 transition-colors duration-300 ${
        isExportMode ? 'app-shell-export' : ''
      }`}
    >
      <Navbar isExportMode={isExportMode} toggleExportMode={toggleExportMode} />
      <main className="app-main flex-1">
        {children}
      </main>
      <Footer />
    </div>
  );
}
