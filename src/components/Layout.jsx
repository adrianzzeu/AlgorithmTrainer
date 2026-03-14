import React from 'react';
import Navbar from './Navbar';
import Footer from './Footer';

export default function Layout({ children }) {
  return (
    <div className="app-shell min-h-screen flex flex-col text-slate-900 dark:text-slate-100 transition-colors duration-300">
      <Navbar />
      <main className="app-main flex-1">
        {children}
      </main>
      <Footer />
    </div>
  );
}
