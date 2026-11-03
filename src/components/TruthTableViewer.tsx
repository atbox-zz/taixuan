/**
 * Interactive Truth Table Component for Ternary Gates
 * @license Apache-2.0
 */

import React from 'react';
import { TritValue, DisplayMode } from '../types/ternary';
import { TritBadge } from './TritBadge';
import { formatTrit } from '../lib/taiXuanData';

interface TruthTableRow {
  inputs: TritValue[];
  output: TritValue;
  label?: string;
}

interface TruthTableViewerProps {
  title: string;
  inputLabels: string[];
  outputLabel: string;
  rows: TruthTableRow[];
  currentInputs?: TritValue[];
  mode?: DisplayMode;
}

export const TruthTableViewer: React.FC<TruthTableViewerProps> = ({
  title,
  inputLabels,
  outputLabel,
  rows,
  currentInputs,
  mode = 'taixuan',
}) => {
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs">
      <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
        <h4 className="text-xs font-semibold text-slate-800 dark:text-slate-200">{title}</h4>
        <span className="text-[11px] text-slate-500 font-mono-code">{rows.length} 種狀態真值組合</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs tabular-nums">
          <thead className="bg-slate-100/70 dark:bg-slate-800/40 text-slate-600 dark:text-slate-400 font-medium border-b border-slate-200 dark:border-slate-800">
            <tr>
              {inputLabels.map((lbl, idx) => (
                <th key={idx} className="px-3 py-2 text-center">
                  {lbl}
                </th>
              ))}
              <th className="px-3 py-2 text-center font-bold text-slate-900 dark:text-slate-100 border-l border-slate-200 dark:border-slate-800">
                {outputLabel}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {rows.map((row, rIdx) => {
              const isActive =
                currentInputs &&
                currentInputs.length === row.inputs.length &&
                currentInputs.every((v, i) => v === row.inputs[i]);

              return (
                <tr
                  key={rIdx}
                  className={`transition-colors ${
                    isActive
                      ? 'bg-sky-50/80 dark:bg-sky-950/40 ring-1 ring-sky-300 dark:ring-sky-700 font-semibold'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800/30'
                  }`}
                >
                  {row.inputs.map((inVal, inIdx) => (
                    <td key={inIdx} className="px-3 py-1.5 text-center">
                      <TritBadge val={inVal} mode={mode} size="sm" />
                    </td>
                  ))}
                  <td className="px-3 py-1.5 text-center border-l border-slate-200 dark:border-slate-800">
                    <TritBadge val={row.output} mode={mode} size="sm" />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
