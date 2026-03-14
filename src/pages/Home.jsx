import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Binary, BookOpenCheck, Cpu, Sparkles } from 'lucide-react';
import { dynamicRoutes } from '../utils/routes';

const ICONS = {
  LearnBasics: BookOpenCheck,
  BoothDefault: Binary,
  BoothRadix3: Binary,
  BoothRadix4: Cpu,
};

export default function Home() {
  const learnRoute = dynamicRoutes.find((route) => route.fileName === 'LearnBasics');
  const algorithmRoutes = dynamicRoutes.filter((route) => route.group === 'algorithm');
  const studyRoutes = dynamicRoutes.filter((route) => !route.isHome);
  const featuredRoute = algorithmRoutes[0];

  return (
    <div className="home-stage">
      <div className="page-frame py-8 md:py-10">
        <section className="surface-card surface-card--hero animate-fade-in-up overflow-hidden rounded-[2rem] p-6 md:p-8">
          <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
            <div>
              <div className="kicker mb-4 inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em]">
                <Sparkles className="h-4 w-4" />
                Interactive study workspace
              </div>
              <h1 className="max-w-3xl text-4xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50 md:text-6xl">
                Learn the Booth flow without losing the hardware intuition.
              </h1>
              <p className="mt-5 max-w-3xl text-base leading-8 text-slate-600 dark:text-slate-300 md:text-lg">
                This project now opens like a guided studio: start with representation basics,
                then move into the standard Booth, Radix-3, and Radix-4 algorithm labs with
                the step tables, truth tables, and practice flow preserved.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                {learnRoute && (
                  <Link to={learnRoute.path} className="cta-button cta-button-primary">
                    Start with basics
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                )}
                {featuredRoute && (
                  <Link to={featuredRoute.path} className="cta-button cta-button-secondary">
                    Jump to {featuredRoute.navName}
                  </Link>
                )}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
              <div className="metric-card">
                <div className="metric-label">Labs</div>
                <div className="metric-value">{studyRoutes.length}</div>
                <div className="metric-copy">Foundations plus step-by-step algorithm walkthroughs.</div>
              </div>
              <div className="metric-card">
                <div className="metric-label">Modes</div>
                <div className="metric-value">2</div>
                <div className="metric-copy">Integer and fixed-point workflows stay side by side.</div>
              </div>
              <div className="metric-card">
                <div className="metric-label">Focus</div>
                <div className="metric-value">Hands-on</div>
                <div className="metric-copy">Study the table, inspect the registers, then practice the next move.</div>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-10">
          <div className="mb-4">
            <div className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
              Pick a track
            </div>
            <h2 className="mt-2 text-2xl font-bold text-slate-900 dark:text-slate-50 md:text-3xl">
              Study from representation to execution
            </h2>
          </div>

          <div className="stagger-enter grid gap-4 lg:grid-cols-3">
            {studyRoutes.map((route) => {
              const Icon = ICONS[route.fileName] ?? Sparkles;

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
                    <span>Open lab</span>
                    <ArrowRight className="h-4 w-4" />
                  </div>
                </Link>
              );
            })}
          </div>

          {studyRoutes.length === 0 && (
            <div className="surface-card mt-4 rounded-[1.5rem] border-dashed p-6 text-center text-slate-500 dark:text-slate-400">
              No learning pages were found in `src/pages`.
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
