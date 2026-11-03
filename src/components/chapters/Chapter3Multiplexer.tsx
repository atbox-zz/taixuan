/**
 * Chapter 3: Multiplexer & Discrimination (三路多路選擇器與特徵鑑別：T-MUX, T-CYCLE, T-CONS)
 * @license Apache-2.0
 */

import React, { useState } from 'react';
import { TritValue, DisplayMode } from '../../types/ternary';
import { tMux, tCycle, tConsensus } from '../../lib/ternaryLogic';
import { TritSelector } from '../TritSelector';
import { TritBadge } from '../TritBadge';
import { formatTrit } from '../../lib/taiXuanData';
import confetti from 'canvas-confetti';

interface Chapter3Props {
  mode: DisplayMode;
}

export const Chapter3Multiplexer: React.FC<Chapter3Props> = ({ mode }) => {
  const [activeTab, setActiveTab] = useState<'TMUX' | 'TCYCLE' | 'TCONS'>('TMUX');

  // T-MUX states
  const [d0, setD0] = useState<TritValue>(0); // 人 channel
  const [d1, setD1] = useState<TritValue>(1); // 地 channel
  const [d2, setD2] = useState<TritValue>(2); // 天 channel
  const [sel, setSel] = useState<TritValue>(2); // Selector pin

  // T-Cycle state
  const [cycleIn, setCycleIn] = useState<TritValue>(0);

  // T-Consensus state
  const [consA, setConsA] = useState<TritValue>(2);
  const [consB, setConsB] = useState<TritValue>(2);

  const muxOutput = tMux(d0, d1, d2, sel);
  const cycleOutput = tCycle(cycleIn);
  const consOutput = tConsensus(consA, consB);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="border-b border-slate-200 dark:border-slate-800 pb-5">
        <div className="flex items-center gap-2 text-xs font-mono-code text-slate-500 mb-1">
          <span>CHAPTER 03</span>
          <span aria-hidden="true">·</span>
          <span>ROUTING & THREE-WAY MULTIPLEXER</span>
        </div>
        <h2 className="text-2xl font-bold font-serif-tc text-slate-900 dark:text-slate-100">
          特徵鑑別與三路選擇器：T-MUX 與循變門
        </h2>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400 max-w-3xl leading-relaxed">
          在計算機體系中，多路選擇器（Multiplexer）是信號路由與條件分支的心臟。在三進制架構中，
          <strong className="text-slate-900 dark:text-slate-200 font-mono-code mx-1">T-MUX</strong>
          擁有 3 條資料通道（人通道、地通道、天通道），由單一三值選擇端精確選通！配合太玄陽陰循變門（T-CYCLE），構成了控制總線的根本。
        </p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800/60 p-1.5 rounded-lg border border-slate-200 dark:border-slate-700/60 w-fit">
        <button
          type="button"
          onClick={() => setActiveTab('TMUX')}
          className={`px-4 py-1.5 text-xs font-medium rounded-md transition-all whitespace-nowrap ${
            activeTab === 'TMUX'
              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs font-semibold'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          1. 三路選擇器 (T-MUX 3:1)
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('TCYCLE')}
          className={`px-4 py-1.5 text-xs font-medium rounded-md transition-all whitespace-nowrap ${
            activeTab === 'TCYCLE'
              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs font-semibold'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          2. 三才循變門 (T-CYCLE ⟳)
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('TCONS')}
          className={`px-4 py-1.5 text-xs font-medium rounded-md transition-all whitespace-nowrap ${
            activeTab === 'TCONS'
              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs font-semibold'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          3. 同契判定門 (T-CONSENSUS)
        </button>
      </div>

      {/* Content based on Active Tab */}
      {activeTab === 'TMUX' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-5 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                三路資料輸入與選通引腳
              </span>
              <span className="text-xs font-mono-code text-sky-600 dark:text-sky-400">
                當前選通：通道 {sel === 0 ? '人 (D0)' : sel === 1 ? '地 (D1)' : '天 (D2)'}
              </span>
            </div>

            <div className="p-4 bg-sky-50/50 dark:bg-sky-950/20 border border-sky-100 dark:border-sky-900/50 rounded-lg">
              <TritSelector
                label="【選通端 S】 (Select Pin)"
                sublabel="決定哪條通道的信號被傳送至輸出"
                value={sel}
                onChange={setSel}
                mode={mode}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div
                className={`p-3 rounded-lg border transition-all ${
                  sel === 0
                    ? 'border-violet-400 bg-violet-50/60 dark:bg-violet-950/40'
                    : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900'
                }`}
              >
                <TritSelector
                  label="人通道 D0 (S=人)"
                  value={d0}
                  onChange={setD0}
                  mode={mode}
                  size="sm"
                />
              </div>

              <div
                className={`p-3 rounded-lg border transition-all ${
                  sel === 1
                    ? 'border-amber-400 bg-amber-50/60 dark:bg-amber-950/40'
                    : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900'
                }`}
              >
                <TritSelector
                  label="地通道 D1 (S=地)"
                  value={d1}
                  onChange={setD1}
                  mode={mode}
                  size="sm"
                />
              </div>

              <div
                className={`p-3 rounded-lg border transition-all ${
                  sel === 2
                    ? 'border-sky-400 bg-sky-50/60 dark:bg-sky-950/40'
                    : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900'
                }`}
              >
                <TritSelector
                  label="天通道 D2 (S=天)"
                  value={d2}
                  onChange={setD2}
                  mode={mode}
                  size="sm"
                />
              </div>
            </div>

            {/* Live output */}
            <div className="p-4 bg-slate-900 text-white rounded-xl flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-400 font-mono-code block">T-MUX 最終輸出端 OUT</span>
                <span className="text-sm font-semibold">
                  已選通通向總線之信號
                </span>
              </div>
              <TritBadge val={muxOutput} mode={mode} size="lg" />
            </div>
          </div>

          <div className="lg:col-span-5 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl p-5 text-xs space-y-4">
            <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">
              03. 三值多路選通架構原理
            </h3>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
              在二進制中，一個 2:1 MUX 需要 1 個 Select 位元。但在三進制中，1 個 Trit 擁有 3 種狀態，天然就能控制 <strong>3:1 多路選擇</strong>！
            </p>
            <div className="space-y-2 text-slate-600 dark:text-slate-400">
              <div className="p-2 bg-white dark:bg-slate-950 rounded border border-slate-200 dark:border-slate-800 font-mono-code">
                OUT = (S == 人) ? D0 : (S == 地) ? D1 : D2
              </div>
              <p>
                在後續的 4-Trit ALU 中，ALU 內部正是通過 T-MUX 樹來根據 Opcode 指令切換加法器結果、減法結果或三值邏輯結果。
              </p>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'TCYCLE' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-5 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                三才循變演進 (Cyclic Successor)
              </span>
              <span className="text-xs font-mono-code text-slate-500">人 → 地 → 天 → 人</span>
            </div>

            <TritSelector
              label="輸入三值信號"
              value={cycleIn}
              onChange={setCycleIn}
              mode={mode}
            />

            <div className="p-5 bg-slate-900 text-white rounded-xl flex items-center justify-around">
              <div className="text-center">
                <span className="text-xs text-slate-400 block mb-1">輸入爻態</span>
                <TritBadge val={cycleIn} mode={mode} size="lg" />
              </div>

              <div className="text-2xl text-amber-400 font-bold animate-spin font-mono-code">
                ↻
              </div>

              <div className="text-center">
                <span className="text-xs text-slate-400 block mb-1">循變輸出 (Cycle Out)</span>
                <TritBadge val={cycleOutput} mode={mode} size="lg" />
              </div>
            </div>
          </div>

          <div className="lg:col-span-5 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl p-5 text-xs space-y-3">
            <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">
              03. 揚雄太玄循變哲學
            </h3>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
              《太玄·玄數》：「天三、地三、人三，始於一而終於九，環而復始。」
              三進制循變運算使狀態如同春夏秋冬、陰陽消長般自動輪替，為三進制計數器與時序狀態機提供了不可或缺的推動力。
            </p>
          </div>
        </div>
      )}

      {activeTab === 'TCONS' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-5 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                太玄同契判定 (Equality Detector)
              </span>
              <span className="text-xs font-mono-code text-slate-500">同者為天，異者為人</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <TritSelector label="信號端 A" value={consA} onChange={setConsA} mode={mode} />
              <TritSelector label="信號端 B" value={consB} onChange={setConsB} mode={mode} />
            </div>

            <div className="p-4 bg-slate-900 text-white rounded-xl flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-400 font-mono-code block">判定結果</span>
                <span className="text-sm font-semibold">
                  {consA === consB ? '天地同和 (契合一體)' : '陰陽殊途 (不同才)'}
                </span>
              </div>
              <TritBadge val={consOutput} mode={mode} size="lg" />
            </div>
          </div>

          <div className="lg:col-span-5 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl p-5 text-xs space-y-3">
            <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">
              03. 同契與等值判定
            </h3>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
              當輸入 A 與 B 具有相同的電位（皆天、皆地或皆人）時，輸出為極陽純天（2 / +1）；否則為人（0 / -1）。
              這構成了三進制分支跳轉（Branch Equal）的核心。
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
