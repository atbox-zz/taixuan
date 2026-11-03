/**
 * Real-time Multi-Radix & Tai Xuan Trit Converter (實時十進制/二進制與太玄三進制爻象轉換工具)
 * Synchronized live conversion between Decimal, Binary, Standard Trit, Balanced Trit, and Tai Xuan strokes
 * @license Apache-2.0
 */

import React, { useState } from 'react';
import { TritValue, DisplayMode } from '../../types/ternary';
import { TetragramVisualizer } from '../TetragramVisualizer';
import { TritBadge } from '../TritBadge';
import { TritSelector } from '../TritSelector';
import {
  fourTritsToStandardInt,
  fourTritsToBalancedInt,
  standardIntToFourTrits,
  findTetragramByTrits,
  TRIT_INFO,
} from '../../lib/taiXuanData';

interface TernaryConverterCalculatorProps {
  mode: DisplayMode;
}

export const TernaryConverterCalculator: React.FC<TernaryConverterCalculatorProps> = ({ mode }) => {
  // Current integer state (0 to 80 for 4-trit tetragrams)
  const [currentVal, setCurrentVal] = useState<number>(65);

  // Input string states to allow natural typing
  const [decText, setDecText] = useState<string>('65');
  const [binText, setBinText] = useState<string>('1000001'); // 65 in binary
  const [tritText, setTritText] = useState<string>('2102');  // 65 in base-3: 2*27 + 1*9 + 0*3 + 2*1 = 54+9+0+2 = 65

  const trits = standardIntToFourTrits(currentVal);
  const head = findTetragramByTrits(trits);
  const balVal = fourTritsToBalancedInt(trits);

  // Sync from Decimal
  const handleDecInput = (str: string) => {
    setDecText(str);
    const parsed = parseInt(str, 10);
    if (!isNaN(parsed) && parsed >= 0 && parsed <= 80) {
      setCurrentVal(parsed);
      setBinText(parsed.toString(2));
      const t = standardIntToFourTrits(parsed);
      setTritText(t.join(''));
    }
  };

  // Sync from Binary
  const handleBinInput = (str: string) => {
    // Only allow 0 and 1
    const clean = str.replace(/[^01]/g, '');
    setBinText(clean);
    if (clean.length > 0) {
      const parsed = parseInt(clean, 2);
      if (!isNaN(parsed) && parsed >= 0 && parsed <= 80) {
        setCurrentVal(parsed);
        setDecText(parsed.toString(10));
        const t = standardIntToFourTrits(parsed);
        setTritText(t.join(''));
      }
    }
  };

  // Sync from Standard Trit
  const handleTritInput = (str: string) => {
    // Only allow 0, 1, 2 up to 4 chars
    const clean = str.replace(/[^012]/g, '').slice(0, 4);
    setTritText(clean);
    if (clean.length > 0) {
      const parsed = parseInt(clean, 3);
      if (!isNaN(parsed) && parsed >= 0 && parsed <= 80) {
        setCurrentVal(parsed);
        setDecText(parsed.toString(10));
        setBinText(parsed.toString(2));
      }
    }
  };

  // Sync from 4-Trit selectors
  const handleTritsChange = (newTrits: [TritValue, TritValue, TritValue, TritValue]) => {
    const val = fourTritsToStandardInt(newTrits);
    setCurrentVal(val);
    setDecText(val.toString(10));
    setBinText(val.toString(2));
    setTritText(newTrits.join(''));
  };

  const presets = [
    { label: '冬至【中首 1】 (0)', val: 0 },
    { label: '春分【少首 13】 (12)', val: 12 },
    { label: '夏至【更首 25】 (24)', val: 24 },
    { label: '秋分【遇首 37】 (36)', val: 36 },
    { label: '二進制滿字節 (63: 111111₂)', val: 63 },
    { label: '太玄歸極【養首 81】 (80)', val: 80 },
  ];

  // Mathematical division steps breakdown for base-3
  const getDivisionSteps = (n: number) => {
    const steps: Array<{ dividend: number; quotient: number; remainder: number }> = [];
    let cur = n;
    if (cur === 0) {
      steps.push({ dividend: 0, quotient: 0, remainder: 0 });
      return steps;
    }
    while (cur > 0) {
      const q = Math.floor(cur / 3);
      const r = cur % 3;
      steps.push({ dividend: cur, quotient: q, remainder: r });
      cur = q;
    }
    return steps;
  };

  const divSteps = getDivisionSteps(currentVal);

  const tierNames = [
    { title: '方爻 (頂爻)', weight: 27, level: '第4爻' },
    { title: '州爻', weight: 9, level: '第3爻' },
    { title: '部爻', weight: 3, level: '第2爻' },
    { title: '家爻 (初爻)', weight: 1, level: '第1爻' },
  ];

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <span className="text-xs font-mono-code text-sky-600 dark:text-sky-400 block mb-0.5">
            REAL-TIME MULTI-RADIX & TAI XUAN TRIT CONVERTER
          </span>
          <h3 className="text-lg font-bold font-serif-tc text-slate-900 dark:text-slate-100">
            實時十進制 / 二進制與太玄三進制爻象轉換工具
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            輸入任意十進制數值或二進制碼，實時換算為太玄經三進制（Trit）、平衡三進制與四爻爻象
          </p>
        </div>
        <span className="text-xs font-mono-code text-slate-500">
          四爻定義域：0 ~ 80 (3⁴ = 81 首)
        </span>
      </div>

      {/* Preset Chips */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
        <span className="text-slate-400 font-mono-code shrink-0">典型首象速查：</span>
        {presets.map((p) => (
          <button
            key={p.label}
            type="button"
            onClick={() => handleDecInput(p.val.toString())}
            className="px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 whitespace-nowrap transition-colors"
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Synchronized Multi-Radix Inputs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Decimal Input */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <label htmlFor="dec-field" className="text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <span>🔟</span>
              <span>十進制 (Decimal Base-10)</span>
            </label>
            <span className="text-[11px] font-mono-code text-slate-400">0 ~ 80</span>
          </div>
          <input
            id="dec-field"
            type="number"
            min="0"
            max="80"
            value={decText}
            onChange={(e) => handleDecInput(e.target.value)}
            className="w-full text-xl font-bold font-mono-code px-3.5 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-sky-500"
            placeholder="輸入 0~80"
          />
        </div>

        {/* Binary Input */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <label htmlFor="bin-field" className="text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <span>💻</span>
              <span>二進制 (Binary Base-2)</span>
            </label>
            <span className="text-[11px] font-mono-code text-sky-600 dark:text-sky-400">{binText.length} bits</span>
          </div>
          <input
            id="bin-field"
            type="text"
            value={binText}
            onChange={(e) => handleBinInput(e.target.value)}
            className="w-full text-xl font-bold font-mono-code px-3.5 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-sky-600 dark:text-sky-400 tracking-wider focus:outline-hidden focus:ring-2 focus:ring-sky-500"
            placeholder="如 1000001"
          />
        </div>

        {/* Standard Trit Input */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <label htmlFor="trit-field" className="text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <span>𝌆</span>
              <span>太玄三進制 (Trit Base-3)</span>
            </label>
            <span className="text-[11px] font-mono-code text-emerald-600 dark:text-emerald-400">4 trits</span>
          </div>
          <input
            id="trit-field"
            type="text"
            value={tritText}
            onChange={(e) => handleTritInput(e.target.value)}
            className="w-full text-xl font-bold font-mono-code px-3.5 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-emerald-600 dark:text-emerald-400 tracking-widest focus:outline-hidden focus:ring-2 focus:ring-sky-500"
            placeholder="如 2102"
          />
        </div>
      </div>

      {/* Main Conversion Visualizer Split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Trit breakdown & 4-tier selectors (7 cols) */}
        <div className="lg:col-span-7 space-y-5">
          {/* Detailed Trit Breakdown Grid */}
          <div className="bg-slate-900 text-white p-5 rounded-2xl border border-slate-800 space-y-4 shadow-md">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <span className="text-xs font-semibold text-slate-300">
                四爻位權展開與爻象明細 (Trit-by-Trit Expansion)
              </span>
              <span className="text-xs font-mono-code text-amber-400 font-bold">
                【{head.name}首】第 {head.index} 首
              </span>
            </div>

            <div className="grid grid-cols-4 gap-2 text-center">
              {trits.map((val, idx) => {
                const info = TRIT_INFO[val];
                const tier = tierNames[idx];
                const bal = info.balancedVal;

                return (
                  <div
                    key={idx}
                    className="p-3 bg-slate-800/80 rounded-xl border border-slate-700 flex flex-col items-center justify-between gap-1.5"
                  >
                    <span className="text-[10px] font-mono-code text-slate-400">
                      {tier.title}
                    </span>
                    <span className="font-serif-tc text-2xl text-sky-300">
                      {info.symbol}
                    </span>
                    <span className="text-xs font-bold text-slate-200">
                      {info.name}爻
                    </span>
                    <div className="text-[10px] font-mono-code text-slate-400 border-t border-slate-700/60 pt-1 w-full">
                      <div>權重: ×{tier.weight}</div>
                      <div className="text-amber-400 font-semibold">{val} × {tier.weight} = {val * tier.weight}</div>
                      <div className="text-slate-400 text-[9px]">平衡: {bal > 0 ? `+${bal}` : bal}</div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Summation Formula Bar */}
            <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 text-xs font-mono-code text-slate-300 flex items-center justify-between flex-wrap gap-2">
              <span className="text-slate-400">多項式權重求和：</span>
              <span className="text-emerald-400 font-semibold">
                {trits[0]}×27 + {trits[1]}×9 + {trits[2]}×3 + {trits[3]}×1 = {currentVal}₁₀
              </span>
            </div>
          </div>

          {/* Interactive 4-Trit Tactical Selectors */}
          <div className="space-y-3">
            <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 block">
              手動微調四爻狀態（即時聯動十進制與二進制數值）
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <TritSelector
                label="四爻 方 (×27)"
                value={trits[0]}
                onChange={(v) => handleTritsChange([v, trits[1], trits[2], trits[3]])}
                mode={mode}
                size="sm"
              />
              <TritSelector
                label="三爻 州 (×9)"
                value={trits[1]}
                onChange={(v) => handleTritsChange([trits[0], v, trits[2], trits[3]])}
                mode={mode}
                size="sm"
              />
              <TritSelector
                label="二爻 部 (×3)"
                value={trits[2]}
                onChange={(v) => handleTritsChange([trits[0], trits[1], v, trits[3]])}
                mode={mode}
                size="sm"
              />
              <TritSelector
                label="初爻 家 (×1)"
                value={trits[3]}
                onChange={(v) => handleTritsChange([trits[0], trits[1], trits[2], v])}
                mode={mode}
                size="sm"
              />
            </div>
          </div>

          {/* Radix Division Breakdown Steps */}
          <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-900 dark:text-slate-100 pb-1 border-b border-slate-200 dark:border-slate-800">
              <span>三進制短除法生成軌跡 (Division-by-3 Trace)</span>
              <span className="font-mono-code text-[11px] text-slate-400">餘數逆序即為三進制碼</span>
            </div>
            <div className="space-y-1 font-mono-code text-xs text-slate-600 dark:text-slate-400">
              {divSteps.map((st, i) => (
                <div key={i} className="flex justify-between items-center py-0.5">
                  <span>
                    {st.dividend} ÷ 3 = {st.quotient}
                  </span>
                  <span className="text-sky-600 dark:text-sky-400 font-bold">
                    餘數 {st.remainder} ({TRIT_INFO[st.remainder as TritValue].name}爻 {TRIT_INFO[st.remainder as TritValue].symbol})
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Tetragram Visualizer & Solar Context (5 cols) */}
        <div className="lg:col-span-5 space-y-5">
          <TetragramVisualizer
            trits={trits}
            mode={mode}
            size="lg"
            showDetails={true}
            headOverride={head}
          />

          {/* Radix Comparison & Efficiency Card */}
          <div className="bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl p-5 text-xs space-y-3">
            <h4 className="font-bold text-slate-900 dark:text-slate-100 text-sm flex items-center justify-between">
              <span>資訊密度與進制效率對比</span>
              <span className="text-sky-600 dark:text-sky-400 font-mono-code text-xs">1 Trit ≈ 1.585 Bits</span>
            </h4>
            <div className="space-y-1.5 font-mono-code text-slate-600 dark:text-slate-400">
              <div className="flex justify-between">
                <span>二進制編碼：</span>
                <span className="text-slate-900 dark:text-slate-200 font-bold">{binText}₂ ({binText.length} 位元)</span>
              </div>
              <div className="flex justify-between">
                <span>標準三進制：</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-bold">{trits.join('')}₃ (4 爻態)</span>
              </div>
              <div className="flex justify-between">
                <span>平衡三進制：</span>
                <span className="text-sky-600 dark:text-sky-400 font-bold">
                  {trits.map((t) => (t === 2 ? '+' : t === 0 ? '-' : '0')).join('')} (數值: {balVal > 0 ? `+${balVal}` : balVal})
                </span>
              </div>
            </div>
            <p className="text-slate-500 text-[11px] leading-relaxed pt-1 border-t border-slate-200 dark:border-slate-800">
              三進制的數基效率接近自然常數 $e \approx 2.718$，相較於二進制可減少約 37% 的位元寬度，使得四爻即可完備覆蓋漢代太初曆 81 節序。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
