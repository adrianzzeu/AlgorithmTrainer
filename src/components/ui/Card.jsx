import React from 'react';

export default function Card({ title, icon: Icon, children, subtitle }) {
  const iconElement = Icon ? <Icon className="h-5 w-5" /> : null;

  return (
    <div className="surface-card rounded-[1.5rem] p-5 md:p-6">
      <div className="mb-5 flex items-start gap-3 border-b border-slate-200/70 pb-4 dark:border-slate-800">
        {iconElement ? (
          <div className="icon-frame rounded-2xl p-2.5">
            {iconElement}
          </div>
        ) : null}
        <div>
          <div className="text-base font-semibold text-slate-900 dark:text-slate-100 md:text-lg">{title}</div>
          {subtitle ? <div className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">{subtitle}</div> : null}
        </div>
      </div>
      {children}
    </div>
  );
}
