import React from 'react';
import { Info } from 'lucide-react';

export default function HoverInfo({ title, children, align = "left" }) {
    return (
        <div className="hover-info relative inline-flex items-center group">
            <Info className="h-4 w-4 cursor-help text-slate-400 transition-colors hover:text-[var(--accent)]" />
            <div
                className={`hover-info-panel absolute top-7 hidden w-[28rem] max-w-[90vw] rounded-[1.25rem] border border-slate-200 bg-white/95 p-4 text-left shadow-2xl backdrop-blur group-hover:block dark:border-slate-700 dark:bg-slate-900/95 ${align === "right" ? "right-0" : "left-0"
                    }`}
            >
                <div className="mb-2 text-sm font-semibold text-slate-800 dark:text-slate-200">{title}</div>
                <div className="text-xs text-slate-600 dark:text-slate-400 leading-6">{children}</div>
            </div>
        </div>
    );
}
