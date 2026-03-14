import React from 'react';

export default function Step({ n, title, children }) {
    return (
        <div className="flex gap-3">
            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-white shadow-md dark:bg-slate-100 dark:text-slate-900">
                {n}
            </div>
            <div>
                <div className="font-semibold text-slate-900 dark:text-slate-100">{title}</div>
                <div className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-400">{children}</div>
            </div>
        </div>
    );
}
