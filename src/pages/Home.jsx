import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Binary, BookOpenCheck, Cpu } from 'lucide-react';
import { dynamicRoutes } from '../utils/routes';

const ICONS = {
  LearnBasics: BookOpenCheck,
  BoothDefault: Binary,
  BoothRadix3: Binary,
  BoothRadix4: Cpu,
  BoothRadix8: Cpu,
  SRTDivision: Cpu,
};

export default function Home() {
  const studyRoutes = dynamicRoutes.filter((route) => !route.isHome);
  const learnRoute = dynamicRoutes.find((route) => route.fileName === 'LearnBasics');
  const boothRoute = dynamicRoutes.find((route) => route.fileName === 'BoothDefault');

  return (
    <div className="home-stage">
      <div className="page-frame py-8 md:py-10">
        <section className="surface-card surface-card--hero animate-fade-in-up rounded-[2rem] p-6 md:p-8">
          <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
            <div>
              <div className="kicker mb-4 inline-flex items-center rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em]">
                Digital Computers Lab
              </div>
              <h1 className="max-w-3xl text-4xl font-bold tracking-tight text-slate-900 dark:text-slate-50 md:text-6xl">
                Booth algorithms, without the clutter.
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-8 text-slate-600 dark:text-slate-300 md:text-lg">
                Start with basics, then use the tables.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                {learnRoute && (
                  <Link to={learnRoute.path} className="cta-button cta-button-primary">
                    Basics
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                )}
                {boothRoute && (
                  <Link to={boothRoute.path} className="cta-button cta-button-secondary">
                    Booth Default
                  </Link>
                )}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
              <div className="metric-card">
                <div className="metric-label">Pages</div>
                <div className="metric-value">{studyRoutes.length}</div>
                <div className="metric-copy">All labs in one place.</div>
              </div>
              <div className="metric-card">
                <div className="metric-label">Focus</div>
                <div className="metric-value">Tables</div>
                <div className="metric-copy">Clear table work.</div>
              </div>
              <div className="metric-card">
                <div className="metric-label">Modes</div>
                <div className="metric-value">2</div>
                <div className="metric-copy">Integer and fixed-point work stay available.</div>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-10">
          <div className="mb-5 flex items-end justify-between gap-4">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                Study Pages
              </div>
              <h2 className="mt-2 text-2xl font-bold text-slate-900 dark:text-slate-50 md:text-3xl">
                Open a lab
              </h2>
            </div>
          </div>

          <div className="stagger-enter grid gap-4 lg:grid-cols-3">
            {studyRoutes.map((route) => {
              const Icon = ICONS[route.fileName] ?? Binary;

              return (
                <Link key={route.path} to={route.path} className="route-card surface-card surface-card--interactive">
                  <div className="route-card-top">
                    <span className="route-badge">{route.badge}</span>
                    <span className="route-icon">
                      <Icon className="h-5 w-5" />
                    </span>
                  </div>
                  <div className="mt-6">
                    <h3 className="text-xl font-bold text-slate-900 dark:text-slate-50">{route.name}</h3>
                    <p className="mt-3 text-sm leading-7 text-slate-600 dark:text-slate-300">
                      {route.description}
                    </p>
                  </div>
                  <div className="route-card-footer">
                    <span>Open</span>
                    <ArrowRight className="h-4 w-4" />
                  </div>
                </Link>
              );
            })}
          </div>

          {studyRoutes.length === 0 && (
            <div className="surface-card mt-4 rounded-[1.5rem] border-dashed p-6 text-center text-slate-500 dark:text-slate-400">
              No pages found in `src/pages`.
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
