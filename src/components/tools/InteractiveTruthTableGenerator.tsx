/**
 * Interactive Truth Table Generator for Ternary Gates (互動式三進制真值表生成器)
 * Allows users to click input states (1, 0, -1) and calculate in real-time the T-NAND gate outputs
 * @license Apache-2.0
 */

import React, { useState } from 'react';
import { TritValue, BalancedTritValue, DisplayMode } from '../../types/ternary';
import { tNand, tNot, tAnd, tOr, tNor } from '../../lib/ternaryLogic';
import { TRIT_INFO, formatTrit } from '../../lib/taiXuanData';
import { TritBadge } from '../TritBadge';

interface InteractiveTruthTableGeneratorProps {
  mode: DisplayMode;
}

type GateType = 'TNAND' | 'TAND' | 'TOR' | 'TNOR' | 'TNOT';

export const InteractiveTruthTableGenerator: React.FC<InteractiveTruthTableGeneratorProps> = ({ mode }) => {
  const [selectedGate, setSelectedGate] = useState<GateType>('TNAND');
  // Internal values: 2 is 天 (+1), 1 is 地 (0), 0 is 人 (-1)
  const [pinA, setPinA] = useState<TritValue>(2); // Default 天 (+1)
  const [pinB, setPinB] = useState<TritValue>(1); // Default 地 (0)
  const [copiedFormat, setCopiedFormat] = useState<string | null>(null);

  // States in balanced notation: +1, 0, -1
  const balancedValues: BalancedTritValue[] = [1, 0, -1];
  const tritValues: TritValue[] = [2, 1, 0]; // Corresponds to +1, 0, -1

  // Compute gate output
  const computeGate = (gate: GateType, a: TritValue, b: TritValue): TritValue => {
    switch (gate) {
      case 'TNAND':
        return tNand(a, b);
      case 'TAND':
        return tAnd(a, b);
      case 'TOR':
        return tOr(a, b);
      case 'TNOR':
        return tNor(a, b);
      case 'TNOT':
        return tNot(a);
    }
  };

  const outputVal = computeGate(selectedGate, pinA, pinB);

  // Balanced values of pins
  const balA = TRIT_INFO[pinA].balancedVal;
  const balB = TRIT_INFO[pinB].balancedVal;
  const balOut = TRIT_INFO[outputVal].balancedVal;

  const gates: Array<{ type: GateType; name: string; formula: string; desc: string }> = [
    {
      type: 'TNAND',
      name: '太玄與非門 (T-NAND)',
      formula: 'OUT = -min(A, B)  [或 2 - min(A, B)]',
      desc: '元始通用門：先求兩輸入低位（min），再實施三態倒反',
    },
    {
      type: 'TAND',
      name: '太玄與門 (T-AND)',
      formula: 'OUT = min(A, B)',
      desc: '降取門：取兩輸入之中最小/保守態',
    },
    {
      type: 'TOR',
      name: '太玄或門 (T-OR)',
      formula: 'OUT = max(A, B)',
      desc: '升取門（德摩根律）：取兩輸入之中最大/崇陽態',
    },
    {
      type: 'TNOR',
      name: '太玄或非門 (T-NOR)',
      formula: 'OUT = -max(A, B)',
      desc: '升取之倒反門',
    },
    {
      type: 'TNOT',
      name: '太玄倒反門 (T-NOT)',
      formula: 'OUT = -A  [或 2 - A]',
      desc: '單爻倒反：+1 ↔ -1，0 自守不變',
    },
  ];

  const currentGateMeta = gates.find((g) => g.type === selectedGate) || gates[0];

  // Mathematical step-by-step breakdown text
  const getExplanation = () => {
    if (selectedGate === 'TNOT') {
      return `輸入 A = ${balA > 0 ? '+1' : balA} (${TRIT_INFO[pinA].name})。經 T-NOT 倒反後為 -(${balA > 0 ? '+1' : balA}) = ${balOut > 0 ? '+1' : balOut} (${TRIT_INFO[outputVal].name})。`;
    }
    const minBal = Math.min(balA, balB);
    const maxBal = Math.max(balA, balB);

    if (selectedGate === 'TNAND') {
      return `① 求最小值：min(${balA > 0 ? '+1' : balA}, ${balB > 0 ? '+1' : balB}) = ${minBal > 0 ? '+1' : minBal}；② 實施三值倒反：-(${minBal > 0 ? '+1' : minBal}) = ${balOut > 0 ? '+1' : balOut} (${TRIT_INFO[outputVal].name})。`;
    }
    if (selectedGate === 'TAND') {
      return `求最小值：min(${balA > 0 ? '+1' : balA}, ${balB > 0 ? '+1' : balB}) = ${balOut > 0 ? '+1' : balOut} (${TRIT_INFO[outputVal].name})。`;
    }
    if (selectedGate === 'TOR') {
      return `求最大值：max(${balA > 0 ? '+1' : balA}, ${balB > 0 ? '+1' : balB}) = ${maxBal > 0 ? '+1' : maxBal} (${TRIT_INFO[outputVal].name})。`;
    }
    return `① 求最大值：max(${balA > 0 ? '+1' : balA}, ${balB > 0 ? '+1' : balB}) = ${maxBal > 0 ? '+1' : maxBal}；② 實施倒反：-(${maxBal > 0 ? '+1' : maxBal}) = ${balOut > 0 ? '+1' : balOut} (${TRIT_INFO[outputVal].name})。`;
  };

  const handleCopyMarkdown = () => {
    let md = `| 輸入 A | 輸入 B | ${currentGateMeta.name} 輸出 |\n| :---: | :---: | :---: |\n`;
    tritValues.forEach((a) => {
      tritValues.forEach((b) => {
        const out = computeGate(selectedGate, a, b);
        const aStr = formatTrit(a, mode);
        const bStr = formatTrit(b, mode);
        const outStr = formatTrit(out, mode);
        md += `| ${aStr} | ${bStr} | ${outStr} |\n`;
      });
    });
    navigator.clipboard?.writeText(md);
    setCopiedFormat('md');
    setTimeout(() => setCopiedFormat(null), 1500);
  };

  const handleCopyCsv = () => {
    let csv = `InputA,InputB,Output\n`;
    tritValues.forEach((a) => {
      tritValues.forEach((b) => {
        const out = computeGate(selectedGate, a, b);
        csv += `${TRIT_INFO[a].balancedVal},${TRIT_INFO[b].balancedVal},${TRIT_INFO[out].balancedVal}\n`;
      });
    });
    navigator.clipboard?.writeText(csv);
    setCopiedFormat('csv');
    setTimeout(() => setCopiedFormat(null), 1500);
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <span className="text-xs font-mono-code text-sky-600 dark:text-sky-400 block mb-0.5">
            INTERACTIVE TERNARY TRUTH TABLE GENERATOR
          </span>
          <h3 className="text-lg font-bold font-serif-tc text-slate-900 dark:text-slate-100">
            互動式三進制真值表生成器
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            點選輸入狀態 (1, 0, -1) 或在 3×3 矩陣格點選，實時計算 T-NAND 門的真值傳導與步驟解析
          </p>
        </div>

        {/* Gate Selector Buttons */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl overflow-x-auto text-xs font-mono-code">
          {gates.map((g) => (
            <button
              key={g.type}
              type="button"
              onClick={() => setSelectedGate(g.type)}
              className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors ${
                selectedGate === g.type
                  ? 'bg-sky-600 text-white font-bold shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              {g.type}
            </button>
          ))}
        </div>
      </div>

      {/* Main Interactive Stage */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Interactive 3x3 Truth Table Matrix (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">
              {currentGateMeta.name} 互動真值矩陣表 (點擊任意單元格即時切換)
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopyMarkdown}
                className="text-[11px] font-mono-code px-2 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-600 dark:text-slate-300 transition-colors"
              >
                {copiedFormat === 'md' ? '已複製 MD ✓' : '複製 Markdown 表'}
              </button>
              <button
                type="button"
                onClick={handleCopyCsv}
                className="text-[11px] font-mono-code px-2 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-600 dark:text-slate-300 transition-colors"
              >
                {copiedFormat === 'csv' ? '已複製 CSV ✓' : '複製 CSV'}
              </button>
            </div>
          </div>

          {/* 3x3 Grid Matrix Table */}
          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
            <table className="w-full text-center border-collapse text-xs font-mono-code">
              <thead>
                <tr className="bg-slate-100/80 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800">
                  <th className="p-3 text-slate-500 font-medium">
                    輸入 B \ 輸入 A
                  </th>
                  {tritValues.map((a) => {
                    const infoA = TRIT_INFO[a];
                    const isColSelected = pinA === a;
                    return (
                      <th
                        key={a}
                        className={`p-3 transition-colors ${
                          isColSelected
                            ? 'bg-sky-100/70 dark:bg-sky-950/70 text-sky-900 dark:text-sky-200 font-bold border-b-2 border-sky-500'
                            : 'text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <div className="flex flex-col items-center gap-0.5">
                          <span className="font-serif-tc text-base">{infoA.symbol}</span>
                          <span>A: {infoA.balancedVal > 0 ? `+${infoA.balancedVal}` : infoA.balancedVal}</span>
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {tritValues.map((b) => {
                  const infoB = TRIT_INFO[b];
                  const isRowSelected = pinB === b && selectedGate !== 'TNOT';

                  return (
                    <tr
                      key={b}
                      className={isRowSelected ? 'bg-sky-50/50 dark:bg-sky-950/20' : ''}
                    >
                      <th
                        className={`p-3 text-center border-r border-slate-200 dark:border-slate-800 transition-colors ${
                          isRowSelected
                            ? 'bg-sky-100/70 dark:bg-sky-950/70 text-sky-900 dark:text-sky-200 font-bold'
                            : 'bg-slate-50/60 dark:bg-slate-800/40 text-slate-700 dark:text-slate-300 font-medium'
                        }`}
                      >
                        <div className="flex items-center justify-center gap-1.5">
                          <span className="font-serif-tc text-base">{infoB.symbol}</span>
                          <span>B: {infoB.balancedVal > 0 ? `+${infoB.balancedVal}` : infoB.balancedVal}</span>
                        </div>
                      </th>

                      {tritValues.map((a) => {
                        const cellOut = computeGate(selectedGate, a, b);
                        const isCellSelected = pinA === a && (selectedGate === 'TNOT' || pinB === b);
                        const outBal = TRIT_INFO[cellOut].balancedVal;

                        return (
                          <td
                            key={a}
                            onClick={() => {
                              setPinA(a);
                              setPinB(b);
                            }}
                            className={`p-3.5 cursor-pointer transition-all border-r border-slate-100 dark:border-slate-800 last:border-r-0 ${
                              isCellSelected
                                ? 'bg-sky-200/90 dark:bg-sky-900/80 ring-2 ring-sky-500 font-bold scale-[1.03] z-10'
                                : 'hover:bg-slate-100 dark:hover:bg-slate-800/60'
                            }`}
                          >
                            <div className="flex flex-col items-center gap-1">
                              <TritBadge val={cellOut} mode={mode} size="sm" />
                              <span className="text-[10px] text-slate-400">
                                {outBal > 0 ? `+${outBal}` : outBal}
                              </span>
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <p className="text-[11px] text-slate-400 leading-relaxed">
            提示：點擊矩陣中任何一個單元格，右側將即時高亮並展示其對應的數理推導與三進制運算步驟。
          </p>
        </div>

        {/* Right: Tactile 3-State Clickable Pins & Live Calculation (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="p-5 bg-slate-900 text-white rounded-2xl border border-slate-800 space-y-5 shadow-md">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <span className="text-xs font-semibold text-slate-200">
                三態引腳點擊控制器 (1, 0, -1)
              </span>
              <span className="text-xs font-mono-code text-amber-400">
                {currentGateMeta.type}
              </span>
            </div>

            {/* Input Pin A Tactile Selectors */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-slate-300 font-medium">輸入端 A (Pin A)</span>
                <span className="text-sky-400 font-mono-code">
                  當前：{balA > 0 ? `+${balA}` : balA} ({TRIT_INFO[pinA].name} ⚊)
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {balancedValues.map((val) => {
                  const mappedTrit = val === 1 ? 2 : val === 0 ? 1 : 0;
                  const isSelected = pinA === mappedTrit;
                  const info = TRIT_INFO[mappedTrit as TritValue];

                  return (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setPinA(mappedTrit as TritValue)}
                      className={`py-2 px-3 rounded-lg text-xs font-mono-code flex items-center justify-center gap-1.5 transition-all ${
                        isSelected
                          ? 'bg-sky-600 text-white font-bold ring-2 ring-sky-400 shadow-md scale-102'
                          : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      <span className="font-serif-tc text-base">{info.symbol}</span>
                      <span>{val > 0 ? `+${val}` : val}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Input Pin B Tactile Selectors (Hidden if TNOT) */}
            {selectedGate !== 'TNOT' && (
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-300 font-medium">輸入端 B (Pin B)</span>
                  <span className="text-sky-400 font-mono-code">
                    當前：{balB > 0 ? `+${balB}` : balB} ({TRIT_INFO[pinB].name} ⚋)
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {balancedValues.map((val) => {
                    const mappedTrit = val === 1 ? 2 : val === 0 ? 1 : 0;
                    const isSelected = pinB === mappedTrit;
                    const info = TRIT_INFO[mappedTrit as TritValue];

                    return (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setPinB(mappedTrit as TritValue)}
                        className={`py-2 px-3 rounded-lg text-xs font-mono-code flex items-center justify-center gap-1.5 transition-all ${
                          isSelected
                            ? 'bg-sky-600 text-white font-bold ring-2 ring-sky-400 shadow-md scale-102'
                            : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                        }`}
                      >
                        <span className="font-serif-tc text-base">{info.symbol}</span>
                        <span>{val > 0 ? `+${val}` : val}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Calculation Result Hero Card */}
            <div className="p-4 bg-slate-950/80 rounded-xl border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono-code text-slate-400">實時運算輸出 (Output)</span>
                <span className="text-xs font-mono-code text-emerald-400 font-bold">
                  {currentGateMeta.type}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <div className="text-base font-bold font-mono-code">
                  OUT = <span className="text-amber-400 text-lg">{balOut > 0 ? `+${balOut}` : balOut}</span>
                </div>
                <TritBadge val={outputVal} mode={mode} size="lg" />
              </div>

              <div className="pt-2 border-t border-slate-800/80 text-[11px] text-slate-300 font-mono-code leading-relaxed">
                <span className="text-sky-400 font-bold block mb-1">運算步驟推導：</span>
                {getExplanation()}
              </div>
            </div>

            <div className="text-[11px] text-slate-400 font-mono-code">
              公式：<span className="text-slate-200">{currentGateMeta.formula}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
