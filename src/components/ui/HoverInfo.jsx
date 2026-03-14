import React from 'react';
import { Info } from 'lucide-react';

export default function HoverInfo({ title, children, align = "left" }) {
    return (
        <div className="relative inline-flex items-center group">
            <Info className="w-4 h-4 text-slate-400 transition-colors hover:text-[var(--color-accent)] cursor-help" />
            <div
                className={`absolute top-7 z-50 hidden group-hover:block w-[28rem] max-w-[90vw] rounded-[1.25rem] border border-slate-200 dark:border-slate-700 bg-white/95 dark:bg-slate-900/95 p-4 shadow-2xl text-left backdrop-blur ${align === "right" ? "right-0" : "left-0"
                    }`}
            >
                <div className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-2">{title}</div>
                <div className="text-xs text-slate-600 dark:text-slate-400 leading-6">{children}</div>
            </div>
        </div>
    );
}
