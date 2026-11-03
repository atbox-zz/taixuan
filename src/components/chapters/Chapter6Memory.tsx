/**
 * Chapter 6: Ternary Storage & Memory (三進制時序與四爻寄存器：三穩態鎖存器)
 * @license Apache-2.0
 */

import React, { useState } from 'react';
import { TritValue, DisplayMode } from '../../types/ternary';
import { TritSelector } from '../TritSelector';
import { TritBadge } from '../TritBadge';
import { TetragramVisualizer } from '../TetragramVisualizer';
import { formatTrit, findTetragramByTrits } from '../../lib/taiXuanData';

interface Chapter6Props {
  mode: DisplayMode;
}

export const Chapter6Memory: React.FC<Chapter6Props> = ({ mode }) => {
  // 1-Trit Tri-stable latch state
  const [latchState, setLatchState] = useState<TritValue>(1); // Ground/Zero
  const [inputD, setInputD] = useState<TritValue>(2); // Data in
  const [writeEnable, setWriteEnable] = useState<boolean>(true);
  const [clockTick, setClockTick] = useState<number>(0);

  // 4-Trit Register State
  const [regTrits, setRegTrits] = useState<[TritValue, TritValue, TritValue, TritValue]>([1, 1, 1, 1]);
  const [inputRegTrits, setInputRegTrits] = useState<[TritValue, TritValue, TritValue, TritValue]>([2, 1, 0, 2]);

  const handlePulseClock = () => {
    setClockTick((c) => c + 1);
    if (writeEnable) {
      setLatchState(inputD);
      setRegTrits([...inputRegTrits]);
    }
  };

  const handleReset = () => {
    setLatchState(1);
    setRegTrits([1, 1, 1, 1]); // Reset to all 地 (Neutral Harmony)
  };

  const currentHead = findTetragramByTrits(regTrits);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="border-b border-slate-200 dark:border-slate-800 pb-5">
        <div className="flex items-center gap-2 text-xs font-mono-code text-slate-500 mb-1">
          <span>CHAPTER 06</span>
          <span aria-hidden="true">·</span>
          <span>TRI-STABLE MULTIVIBRATOR & 4-TRIT REGISTER</span>
        </div>
        <h2 className="text-2xl font-bold font-serif-tc text-slate-900 dark:text-slate-100">
          三進制記憶時序：三穩態鎖存器與四爻寄存器
        </h2>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400 max-w-3xl leading-relaxed">
          二進制以雙穩態觸發器（Bistable Flip-Flop）為基礎；而在三進制太玄物理中，以 3 個交叉耦合的 T-NAND 門構成
          <strong className="text-slate-900 dark:text-slate-200 font-mono-code mx-1">三穩態鎖存器 (Tri-Stable Latch)</strong>
          ，能穩定存儲「天、地、人」三種量子/電位態。由 4 個三穩態單元並聯即可構成存儲太玄 81 首的
          <strong>四爻主寄存器 (4-Trit Accumulator Register)</strong>！
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Tri-Stable Latch Principle & 4-Trit Register (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Clock & Control Toolbar */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handlePulseClock}
                className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-semibold shadow-xs transition-transform active:scale-95 flex items-center gap-1.5"
              >
                <span>⚡ 觸發時鐘上升沿 (Clock Pulse)</span>
              </button>

              <button
                type="button"
                onClick={handleReset}
                className="px-3 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-xs font-medium transition-colors"
              >
                復位 (Reset to 地)
              </button>
            </div>

            <div className="flex items-center gap-4 text-xs font-mono-code">
              <label className="flex items-center gap-2 cursor-pointer text-slate-700 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={writeEnable}
                  onChange={(e) => setWriteEnable(e.target.checked)}
                  className="rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                />
                <span>寫入致能 (Write Enable)</span>
              </label>

              <span className="text-slate-400">
                時鐘週期: <strong className="text-slate-900 dark:text-slate-100 tabular-nums">#{clockTick}</strong>
              </span>
            </div>
          </div>

          {/* 4-Trit Register Live Visualizer */}
          <div className="bg-slate-900 text-white border border-slate-800 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <span className="text-xs font-semibold text-slate-200">
                四爻主寄存器 (4-Trit Register / Accumulator)
              </span>
              <span className="text-xs font-mono-code text-amber-400">
                當前鎖存：【{currentHead.name}】首
              </span>
            </div>

            <div className="grid grid-cols-4 gap-3 text-center">
              {regTrits.map((val, idx) => {
                const names = ['方 (T3)', '州 (T2)', '部 (T1)', '家 (T0)'];
                return (
                  <div key={idx} className="p-3 bg-slate-800/90 rounded-lg border border-slate-700/80">
                    <span className="text-[11px] text-slate-400 block mb-2 font-mono-code">{names[idx]}</span>
                    <TritBadge val={val} mode={mode} size="md" />
                  </div>
                );
              })}
            </div>

            <p className="text-[11px] text-slate-400 pt-1 leading-relaxed">
              當「寫入致能」為開啟且「觸發時鐘」脈衝到達時，輸入總線的四爻信號將瞬間鎖存入寄存器，並在時鐘低電平期間持續穩定保持。
            </p>
          </div>

          {/* New Input Data Controls */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4 shadow-xs">
            <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 block">
              待寫入資料匯流排 (Data Bus In)
            </span>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <TritSelector
                label="方 (T3)"
                value={inputRegTrits[0]}
                onChange={(v) => setInputRegTrits([v, inputRegTrits[1], inputRegTrits[2], inputRegTrits[3]])}
                mode={mode}
                size="sm"
              />
              <TritSelector
                label="州 (T2)"
                value={inputRegTrits[1]}
                onChange={(v) => setInputRegTrits([inputRegTrits[0], v, inputRegTrits[2], inputRegTrits[3]])}
                mode={mode}
                size="sm"
              />
              <TritSelector
                label="部 (T1)"
                value={inputRegTrits[2]}
                onChange={(v) => setInputRegTrits([inputRegTrits[0], inputRegTrits[1], v, inputRegTrits[3]])}
                mode={mode}
                size="sm"
              />
              <TritSelector
                label="家 (T0)"
                value={inputRegTrits[3]}
                onChange={(v) => setInputRegTrits([inputRegTrits[0], inputRegTrits[1], inputRegTrits[2], v])}
                mode={mode}
                size="sm"
              />
            </div>
          </div>
        </div>

        {/* Right: Tetragram Stored & Philosophical Diagram (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <TetragramVisualizer trits={regTrits} mode={mode} size="lg" showDetails={true} />

          <div className="bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl p-5 text-xs space-y-3">
            <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">
              06. 三穩態自鎖哲理
            </h3>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
              在二進制觸發器中，兩個反相器相互咬合形成 0 與 1 的穩態；而在三進制中，三個 T-NAND 形成三相環形反饋：
            </p>
            <div className="p-2.5 bg-white dark:bg-slate-950 rounded border border-slate-200 dark:border-slate-800 font-mono-code text-[11px] text-amber-700 dark:text-amber-300">
              Q₁ = T-NAND(Q₂, Set₁)<br />
              Q₂ = T-NAND(Q₃, Set₂)<br />
              Q₃ = T-NAND(Q₁, Set₃)
            </div>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
              這種三相環形對稱結構在熱力學上形成了三個獨立的位能井，恰如太玄經中「天以三分，地以三策，人以三軌」的鼎足而立之勢。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
