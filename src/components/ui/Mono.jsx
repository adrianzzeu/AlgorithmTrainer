import React from 'react';

function classNames(...parts) {
    return parts.filter(Boolean).join(" ");
}

export default function Mono({ children, big = false, color = "text-slate-800 dark:text-slate-100" }) {
    return (
        <div
            className={classNames(
                "rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-950/50 px-3 py-2 font-mono tracking-wider shadow-sm",
                big ? "text-lg" : "text-sm",
                color
            )}
        >
            {children}
        </div>
    );
}
