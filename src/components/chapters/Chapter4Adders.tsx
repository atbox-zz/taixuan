/**
 * Chapter 4: Ternary Adders (三進制算術加法體系：半加器、全加器與四爻首加法器)
 * @license Apache-2.0
 */

import React, { useState } from 'react';
import { TritValue, DisplayMode } from '../../types/ternary';
import { tHalfAdder, tFullAdder, tFourTritAdder } from '../../lib/ternaryLogic';
import { TritSelector } from '../TritSelector';
import { TritBadge } from '../TritBadge';
import { CircuitCanvas } from '../CircuitCanvas';
import { TetragramVisualizer } from '../TetragramVisualizer';
import {
  fourTritsToStandardInt,
  fourTritsToBalancedInt,
  standardIntToFourTrits,
  formatTrit,
  TAI_XUAN_HEADS,
} from '../../lib/taiXuanData';
import confetti from 'canvas-confetti';

interface Chapter4Props {
  mode: DisplayMode;
}

export const Chapter4Adders: React.FC<Chapter4Props> = ({ mode }) => {
  const [activeTab, setActiveTab] = useState<'THA' | 'TFA' | 'FOUR_TRIT'>('FOUR_TRIT');

  // Half adder state
  const [haA, setHaA] = useState<TritValue>(2);
  const [haB, setHaB] = useState<TritValue>(2);
  const haRes = tHalfAdder(haA, haB);

  // Full adder state
  const [faA, setFaA] = useState<TritValue>(2);
  const [faB, setFaB] = useState<TritValue>(1);
  const [faCin, setFaCin] = useState<TritValue>(1);
  const faRes = tFullAdder(faA, faB, faCin);

  // 4-Trit adder state: X and Y (Tier 3 down to Tier 0)
  // Default X = [2, 1, 0, 2], Y = [1, 2, 1, 1]
  const [fourX, setFourX] = useState<[TritValue, TritValue, TritValue, TritValue]>([2, 1, 0, 2]);
  const [fourY, setFourY] = useState<[TritValue, TritValue, TritValue, TritValue]>([1, 2, 1, 1]);
  const fourRes = tFourTritAdder(fourX, fourY, 0);

  const handleVerifyAdder = () => {
    confetti({ particleCount: 60, spread: 60 });
  };

  const xValDec = fourTritsToStandardInt(fourX);
  const yValDec = fourTritsToStandardInt(fourY);
  const sumValDec = fourTritsToStandardInt(fourRes.sum);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="border-b border-slate-200 dark:border-slate-800 pb-5">
        <div className="flex items-center gap-2 text-xs font-mono-code text-slate-500 mb-1">
          <span>CHAPTER 04</span>
          <span aria-hidden="true">·</span>
          <span>TERNARY ARITHMETIC & 4-TRIT ADDER</span>
        </div>
        <h2 className="text-2xl font-bold font-serif-tc text-slate-900 dark:text-slate-100">
          三進制算術加法體系：半加器、全加器與四爻首加法器
        </h2>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400 max-w-3xl leading-relaxed">
          高德納（Donald Knuth）在《計算機程序設計藝術》中曾盛讚：「平衡三進制也許是所有進位記數法中最為優美對稱的。」
          在太玄體系中，四爻即可涵蓋 81 首（$3^4 = 81$）。當我們由 T-NAND 構建出半加器與全加器後，級聯 4 級即可獲得完整的
          <strong className="text-slate-900 dark:text-slate-200 font-mono-code mx-1">太玄四爻首加法器</strong>！
        </p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800/60 p-1.5 rounded-lg border border-slate-200 dark:border-slate-700/60 w-fit">
        <button
          type="button"
          onClick={() => setActiveTab('FOUR_TRIT')}
          className={`px-4 py-1.5 text-xs font-medium rounded-md transition-all whitespace-nowrap ${
            activeTab === 'FOUR_TRIT'
              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs font-semibold'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          太玄四爻首加法器 (4-Trit Adder)
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('THA')}
          className={`px-4 py-1.5 text-xs font-medium rounded-md transition-all whitespace-nowrap ${
            activeTab === 'THA'
              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs font-semibold'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          太玄半加器 (T-HA)
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('TFA')}
          className={`px-4 py-1.5 text-xs font-medium rounded-md transition-all whitespace-nowrap ${
            activeTab === 'TFA'
              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs font-semibold'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          太玄全加器 (T-FA)
        </button>
      </div>

      {/* Chapter View: 4-Trit Adder */}
      {activeTab === 'FOUR_TRIT' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            {/* Input Operand X */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4 shadow-xs">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 block">
                    被加數 X (四爻首)
                  </span>
                  <span className="text-[11px] text-slate-500 font-mono-code">
                    十進制值：{xValDec}
                  </span>
                </div>
                <TetragramVisualizer trits={fourX} mode={mode} size="sm" showDetails={false} />
              </div>

              <div className="space-y-3">
                <TritSelector
                  label="第4爻 方 (MSB: 權重 27)"
                  value={fourX[0]}
                  onChange={(v) => setFourX([v, fourX[1], fourX[2], fourX[3]])}
                  mode={mode}
                  size="sm"
                />
                <TritSelector
                  label="第3爻 州 (權重 9)"
                  value={fourX[1]}
                  onChange={(v) => setFourX([fourX[0], v, fourX[2], fourX[3]])}
                  mode={mode}
                  size="sm"
                />
                <TritSelector
                  label="第2爻 部 (權重 3)"
                  value={fourX[2]}
                  onChange={(v) => setFourX([fourX[0], fourX[1], v, fourX[3]])}
                  mode={mode}
                  size="sm"
                />
                <TritSelector
                  label="第1爻 家 (LSB: 權重 1)"
                  value={fourX[3]}
                  onChange={(v) => setFourX([fourX[0], fourX[1], fourX[2], v])}
                  mode={mode}
                  size="sm"
                />
              </div>
            </div>

            {/* Input Operand Y */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4 shadow-xs">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 block">
                    加數 Y (四爻首)
                  </span>
                  <span className="text-[11px] text-slate-500 font-mono-code">
                    十進制值：{yValDec}
                  </span>
                </div>
                <TetragramVisualizer trits={fourY} mode={mode} size="sm" showDetails={false} />
              </div>

              <div className="space-y-3">
                <TritSelector
                  label="第4爻 方 (MSB: 權重 27)"
                  value={fourY[0]}
                  onChange={(v) => setFourY([v, fourY[1], fourY[2], fourY[3]])}
                  mode={mode}
                  size="sm"
                />
                <TritSelector
                  label="第3爻 州 (權重 9)"
                  value={fourY[1]}
                  onChange={(v) => setFourY([fourY[0], v, fourY[2], fourY[3]])}
                  mode={mode}
                  size="sm"
                />
                <TritSelector
                  label="第2爻 部 (權重 3)"
                  value={fourY[2]}
                  onChange={(v) => setFourY([fourY[0], fourY[1], v, fourY[3]])}
                  mode={mode}
                  size="sm"
                />
                <TritSelector
                  label="第1爻 家 (LSB: 權重 1)"
                  value={fourY[3]}
                  onChange={(v) => setFourY([fourY[0], fourY[1], fourY[2], v])}
                  mode={mode}
                  size="sm"
                />
              </div>
            </div>

            {/* Output Sum Result & Tetragram Display */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4 shadow-xs">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                  相加之和 (Sum Tetragram)
                </span>
                <span className="text-xs font-mono-code text-emerald-600 dark:text-emerald-400 font-bold">
                  進位: {formatTrit(fourRes.carryOut, mode)}
                </span>
              </div>

              <TetragramVisualizer trits={fourRes.sum} mode={mode} size="md" showDetails={true} />

              <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-lg text-xs space-y-2">
                <div className="flex justify-between font-mono-code">
                  <span className="text-slate-500">數學驗證：</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {xValDec} + {yValDec} = {xValDec + yValDec}
                  </span>
                </div>
                <div className="flex justify-between font-mono-code">
                  <span className="text-slate-500">模 81 四爻和：</span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                    {sumValDec} {fourRes.carryOut > 0 ? `(+ 81×${fourRes.carryOut})` : ''}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Ripple Carry Pipeline Explanation */}
          <div className="bg-slate-900 text-white rounded-xl p-5 border border-slate-800">
            <h4 className="text-xs font-semibold text-slate-300 mb-3">
              四爻逐級進位波紋傳導路徑 (Ripple Carry Pipeline)
            </h4>
            <div className="grid grid-cols-4 gap-2 text-center text-xs font-mono-code">
              <div className="p-3 bg-slate-800/80 rounded-lg border border-slate-700">
                <span className="text-slate-400 text-[10px] block mb-1">初爻 家 (T0)</span>
                <div className="text-sky-400 font-bold">
                  {formatTrit(fourX[3], mode)} + {formatTrit(fourY[3], mode)}
                </div>
                <div className="text-[11px] text-slate-300 mt-1">
                  和: {formatTrit(fourRes.sum[3], mode)}
                </div>
              </div>

              <div className="p-3 bg-slate-800/80 rounded-lg border border-slate-700">
                <span className="text-slate-400 text-[10px] block mb-1">二爻 部 (T1)</span>
                <div className="text-sky-400 font-bold">
                  {formatTrit(fourX[2], mode)} + {formatTrit(fourY[2], mode)}
                </div>
                <div className="text-[11px] text-slate-300 mt-1">
                  和: {formatTrit(fourRes.sum[2], mode)}
                </div>
              </div>

              <div className="p-3 bg-slate-800/80 rounded-lg border border-slate-700">
                <span className="text-slate-400 text-[10px] block mb-1">三爻 州 (T2)</span>
                <div className="text-sky-400 font-bold">
                  {formatTrit(fourX[1], mode)} + {formatTrit(fourY[1], mode)}
                </div>
                <div className="text-[11px] text-slate-300 mt-1">
                  和: {formatTrit(fourRes.sum[1], mode)}
                </div>
              </div>

              <div className="p-3 bg-slate-800/80 rounded-lg border border-slate-700">
                <span className="text-slate-400 text-[10px] block mb-1">四爻 方 (T3: 頂爻)</span>
                <div className="text-sky-400 font-bold">
                  {formatTrit(fourX[0], mode)} + {formatTrit(fourY[0], mode)}
                </div>
                <div className="text-[11px] text-slate-300 mt-1">
                  和: {formatTrit(fourRes.sum[0], mode)}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Half Adder View */}
      {activeTab === 'THA' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-7 space-y-6">
            <CircuitCanvas
              gateType="THA"
              inputs={{ A: haA, B: haB }}
              outputs={{ SUM: haRes.sum, CARRY: haRes.carry }}
              mode={mode}
              title="太玄半加器 (Ternary Half Adder)"
            />

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <TritSelector label="加數 A" value={haA} onChange={setHaA} mode={mode} />
                <TritSelector label="加數 B" value={haB} onChange={setHaB} mode={mode} />
              </div>

              <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-lg flex items-center justify-around border border-slate-100 dark:border-slate-800">
                <div className="text-center">
                  <span className="text-xs text-slate-500 block mb-1">本位和 (Sum)</span>
                  <TritBadge val={haRes.sum} mode={mode} size="lg" />
                </div>
                <div className="text-center">
                  <span className="text-xs text-slate-500 block mb-1">進位 (Carry)</span>
                  <TritBadge val={haRes.carry} mode={mode} size="lg" />
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-5 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl p-5 text-xs space-y-4">
            <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">
              04. 三進制半加律
            </h3>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
              三進制加法中，逢三進一：
            </p>
            <ul className="space-y-1 text-slate-600 dark:text-slate-400 font-mono-code">
              <li>1 + 1 = 2 (地+地=天, 進位0)</li>
              <li>2 + 1 = 3 = (1, 0)₃ (天+地=人, 進位地)</li>
              <li>2 + 2 = 4 = (1, 1)₃ (天+天=地, 進位地)</li>
            </ul>
          </div>
        </div>
      )}

      {/* Full Adder View */}
      {activeTab === 'TFA' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                太玄全加器 (T-FA) 三端輸入調試
              </span>
              <span className="text-xs font-mono-code text-slate-500">
                A + B + Cin = Sum + Cout × 3
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <TritSelector label="輸入 A" value={faA} onChange={setFaA} mode={mode} size="sm" />
              <TritSelector label="輸入 B" value={faB} onChange={setFaB} mode={mode} size="sm" />
              <TritSelector label="低位進位 Cin" value={faCin} onChange={setFaCin} mode={mode} size="sm" />
            </div>

            <div className="p-4 bg-slate-900 text-white rounded-xl flex items-center justify-around">
              <div className="text-center">
                <span className="text-xs text-slate-400 block mb-1">全加和 (Sum)</span>
                <TritBadge val={faRes.sum} mode={mode} size="lg" />
              </div>
              <div className="text-center">
                <span className="text-xs text-slate-400 block mb-1">輸出進位 (Cout)</span>
                <TritBadge val={faRes.carryOut} mode={mode} size="lg" />
              </div>
            </div>
          </div>

          <div className="lg:col-span-5 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl p-5 text-xs space-y-3">
            <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">
              04. 全加器之於級聯架構
            </h3>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
              全加器由兩個半加器與一個進位合成網絡構成。它的核心作用是承接來自低一爻（如家級）的進位，並向高一爻（如部級）傳遞，從而使四爻運算能夠嚴絲合縫地運轉。
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
