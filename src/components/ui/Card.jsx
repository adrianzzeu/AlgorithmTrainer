import React from 'react';

export default function Card({ title, icon: Icon, children, subtitle }) {
  const iconElement = Icon ? <Icon className="h-5 w-5" /> : null;

  return (
    <div className="surface-card rounded-[1.75rem] p-5 md:p-6">
      <div className="mb-5 flex items-start gap-3">
        {iconElement ? (
          <div className="icon-frame rounded-2xl p-2.5 text-[var(--color-accent)]">
            {iconElement}
          </div>
        ) : null}
        <div>
          <div className="text-base font-semibold text-slate-900 dark:text-slate-100 md:text-lg">{title}</div>
          {subtitle ? <div className="mt-1 text-sm text-slate-500 dark:text-slate-400">{subtitle}</div> : null}
        </div>
      </div>
      {children}
    </div>
  );
}
