import React from 'react';

export default function ConversionCard({ title, inputLabel, registerLabel, conv }) {
  return (
    <div className="glass-card rounded-[1.25rem] p-4 border border-slate-200/60 dark:border-slate-700/60">
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm font-semibold text-slate-800 dark:text-slate-200">{title}</div>
        <div className="text-[11px] text-slate-500 dark:text-slate-400">{inputLabel}</div>
      </div>

      <div className="text-[11px] text-slate-500 dark:text-slate-400 mb-2">{registerLabel}</div>

      <div className="space-y-1.5 font-mono text-xs">
        <div className="flex justify-between gap-3">
          <span className="text-slate-500 dark:text-slate-400">SM</span>
          <span className="text-slate-800 dark:text-slate-200">{conv.sm}</span>
        </div>

        <div className="flex justify-between gap-3">
          <span className="text-slate-500 dark:text-slate-400">|x| full width</span>
          <span className="text-slate-800 dark:text-slate-200">{conv.positiveFull}</span>
        </div>

        {conv.inverted && (
          <div className="flex justify-between gap-3">
            <span className="text-slate-500 dark:text-slate-400">invert</span>
            <span className="text-slate-800 dark:text-slate-200">{conv.inverted}</span>
          </div>
        )}

        {conv.plusOne && (
          <div className="flex justify-between gap-3">
            <span className="text-slate-500 dark:text-slate-400">+ 1</span>
            <span className="text-slate-800 dark:text-slate-200">{conv.plusOne}</span>
          </div>
        )}

        <div className="flex justify-between gap-3 pt-2 border-t border-slate-200 dark:border-slate-700">
          <span className="text-accent font-semibold">C2</span>
          <span className="text-accent font-semibold">{conv.c2}</span>
        </div>
      </div>

      <div className="mt-3 text-[11px] leading-5 text-slate-500 dark:text-slate-400">{conv.rule}</div>
    </div>
  );
}
