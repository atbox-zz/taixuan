/**
 * Trit interactive selector control
 * 3-way tactile selector for 人(0/-1), 地(1/0), 天(2/+1)
 * @license Apache-2.0
 */

import React from 'react';
import { TritValue, DisplayMode } from '../types/ternary';
import { TRIT_INFO } from '../lib/taiXuanData';

interface TritSelectorProps {
  label?: string;
  sublabel?: string;
  value: TritValue;
  onChange: (val: TritValue) => void;
  mode?: DisplayMode;
  size?: 'sm' | 'md';
}

export const TritSelector: React.FC<TritSelectorProps> = ({
  label,
  sublabel,
  value,
  onChange,
  mode = 'taixuan',
  size = 'md',
}) => {
  const options: TritValue[] = [0, 1, 2]; // 人, 地, 天

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
          <span className="font-medium text-slate-800 dark:text-slate-200">{label}</span>
          {sublabel && <span className="text-[11px] text-slate-500 dark:text-slate-500">{sublabel}</span>}
        </div>
      )}
      <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800/80 rounded-lg border border-slate-200 dark:border-slate-700/60">
        {options.map((opt) => {
          const info = TRIT_INFO[opt];
          const isSelected = value === opt;

          let labelText = info.name;
          if (mode === 'balanced') {
            labelText = info.balancedVal === 1 ? '+1' : info.balancedVal === -1 ? '-1' : '0';
          } else if (mode === 'standard') {
            labelText = opt.toString();
          }

          return (
            <button
              key={opt}
              type="button"
              onClick={() => onChange(opt)}
              className={`flex-1 flex items-center justify-center gap-1.5 rounded-md transition-all font-mono-code ${
                size === 'sm' ? 'py-1 px-2 text-xs' : 'py-1.5 px-3 text-sm'
              } ${
                isSelected
                  ? 'bg-white dark:bg-slate-900 shadow-sm font-semibold text-slate-900 dark:text-slate-100 ring-1 ring-slate-300 dark:ring-slate-600'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <span className="font-serif-tc text-base leading-none select-none" aria-hidden="true">
                {info.symbol}
              </span>
              <span>{labelText}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
