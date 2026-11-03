/**
 * Chapter 1: The Primordial Gate (太玄元始：T-NAND 與 T-NOT 門)
 * @license Apache-2.0
 */

import React, { useState } from 'react';
import { TritValue, DisplayMode } from '../../types/ternary';
import { tNand, tNot } from '../../lib/ternaryLogic';
import { TritSelector } from '../TritSelector';
import { TritBadge } from '../TritBadge';
import { TruthTableViewer } from '../TruthTableViewer';
import { CircuitCanvas } from '../CircuitCanvas';
import { TRIT_INFO, formatTrit } from '../../lib/taiXuanData';
import confetti from 'canvas-confetti';

interface Chapter1Props {
  mode: DisplayMode;
}

export const Chapter1Primitive: React.FC<Chapter1Props> = ({ mode }) => {
  const [inputA, setInputA] = useState<TritValue>(2); // Default 天
  const [inputB, setInputB] = useState<TritValue>(1); // Default 地
  const [gateMode, setGateMode] = useState<'TNAND' | 'TNOT'>('TNAND');
  const [testResult, setTestResult] = useState<string | null>(null);

  // Compute live output
  const output = gateMode === 'TNAND' ? tNand(inputA, inputB) : tNot(inputA);

  // 9 entries for T-NAND truth table
  const nandRows = [
    { inputs: [0, 0] as TritValue[], output: tNand(0, 0) },
    { inputs: [0, 1] as TritValue[], output: tNand(0, 1) },
    { inputs: [0, 2] as TritValue[], output: tNand(0, 2) },
    { inputs: [1, 0] as TritValue[], output: tNand(1, 0) },
    { inputs: [1, 1] as TritValue[], output: tNand(1, 1) },
    { inputs: [1, 2] as TritValue[], output: tNand(1, 2) },
    { inputs: [2, 0] as TritValue[], output: tNand(2, 0) },
    { inputs: [2, 1] as TritValue[], output: tNand(2, 1) },
    { inputs: [2, 2] as TritValue[], output: tNand(2, 2) },
  ];

  // 3 entries for T-NOT truth table
  const notRows = [
    { inputs: [0] as TritValue[], output: tNot(0) },
    { inputs: [1] as TritValue[], output: tNot(1) },
    { inputs: [2] as TritValue[], output: tNot(2) },
  ];

  const handleVerify = () => {
    // Check if T-NAND(A, A) === T-NOT(A) for all inputs
    const testCases: TritValue[] = [0, 1, 2];
    const pass = testCases.every((x) => tNand(x, x) === (2 - x));
    if (pass) {
      setTestResult('全部通過！證明 T-NAND(A, A) 嚴格完備地合成為 T-NOT(A) 倒反門。');
      confetti({ particleCount: 60, spread: 60, origin: { y: 0.6 } });
    }
  };

  return (
    <div className="space-y-8">
      {/* Editorial Header */}
      <div className="border-b border-slate-200 dark:border-slate-800 pb-5">
        <div className="flex items-center gap-2 text-xs font-mono-code text-slate-500 mb-1">
          <span>CHAPTER 01</span>
          <span aria-hidden="true">·</span>
          <span>THE PRIMORDIAL UNIVERSAL GATE</span>
        </div>
        <h2 className="text-2xl font-bold font-serif-tc text-slate-900 dark:text-slate-100">
          太玄元始：T-NAND 與 T-NOT 門
        </h2>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400 max-w-3xl leading-relaxed">
          揚雄《太玄經》云：「夫玄也，幽攡萬類而不見形者也。一玄策三才。」在二進制經典《Nand to Tetris》中，NAND 是構建整個計算機硬體的元始磚石。而在三進制太玄邏輯中，我們定義
          <strong className="text-slate-900 dark:text-slate-200 font-mono-code mx-1">T-NAND(A, B) = 2 - min(A, B)</strong>
          （平衡三進制中為 <span className="font-mono-code">-min(A, B)</span>）。由此單一元始門，便可推導出太玄完整符號體系！
        </p>
      </div>

      {/* Main Two-Zone Sandbox */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Zone: Interactive Circuit & Controls (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Mode Selector Tabs */}
          <div className="flex items-center justify-between bg-slate-100 dark:bg-slate-800/60 p-1.5 rounded-lg border border-slate-200 dark:border-slate-700/60">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setGateMode('TNAND')}
                className={`px-3.5 py-1.5 text-xs font-medium rounded-md transition-all whitespace-nowrap ${
                  gateMode === 'TNAND'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                1. 元始門 T-NAND (太玄與非)
              </button>
              <button
                type="button"
                onClick={() => setGateMode('TNOT')}
                className={`px-3.5 py-1.5 text-xs font-medium rounded-md transition-all whitespace-nowrap ${
                  gateMode === 'TNOT'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                2. 合成門 T-NOT (倒反非門)
              </button>
            </div>

            <button
              type="button"
              onClick={handleVerify}
              className="px-3 py-1 text-xs font-medium bg-sky-600 hover:bg-sky-500 text-white rounded-md shadow-xs transition-colors whitespace-nowrap"
            >
              執行自動合成驗證
            </button>
          </div>

          {/* Interactive Circuit Canvas */}
          <CircuitCanvas
            gateType={gateMode}
            inputs={gateMode === 'TNAND' ? { A: inputA, B: inputB } : { A: inputA }}
            outputs={{ OUT: output }}
            mode={mode}
            title={gateMode === 'TNAND' ? '太玄元始 T-NAND 門電路' : '由 T-NAND(A, A) 合成的 T-NOT 倒反門'}
          />

          {/* Interactive Input Pins */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                信號輸入引腳控制 (Input Pins)
              </span>
              <span className="text-xs text-slate-500 font-mono-code">點擊以變換三值電位</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <TritSelector
                label="輸入端 A (Pin A)"
                sublabel={TRIT_INFO[inputA].desc}
                value={inputA}
                onChange={setInputA}
                mode={mode}
              />

              {gateMode === 'TNAND' && (
                <TritSelector
                  label="輸入端 B (Pin B)"
                  sublabel={TRIT_INFO[inputB].desc}
                  value={inputB}
                  onChange={setInputB}
                  mode={mode}
                />
              )}
            </div>

            {/* Live Evaluation Box */}
            <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-lg flex items-center justify-between border border-slate-100 dark:border-slate-800">
              <div className="text-xs text-slate-600 dark:text-slate-400">
                當前運算式：
                <span className="font-mono-code text-slate-900 dark:text-slate-100 font-semibold ml-1">
                  {gateMode === 'TNAND'
                    ? `T-NAND(${formatTrit(inputA, mode)}, ${formatTrit(inputB, mode)}) = `
                    : `T-NOT(${formatTrit(inputA, mode)}) = `}
                </span>
              </div>
              <TritBadge val={output} mode={mode} size="lg" />
            </div>

            {testResult && (
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-lg text-xs text-emerald-800 dark:text-emerald-300 flex items-center justify-between">
                <span>{testResult}</span>
                <span className="font-mono-code font-bold">100% PASS</span>
              </div>
            )}
          </div>
        </div>

        {/* Right Zone: Truth Table & Philosophical Context (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {gateMode === 'TNAND' ? (
            <TruthTableViewer
              title="T-NAND 完備真值表 (3×3 = 9 種狀態)"
              inputLabels={['輸入 A', '輸入 B']}
              outputLabel="T-NAND 輸出"
              rows={nandRows}
              currentInputs={[inputA, inputB]}
              mode={mode}
            />
          ) : (
            <TruthTableViewer
              title="T-NOT 非門真值表 (3×1 = 3 種狀態)"
              inputLabels={['輸入 A']}
              outputLabel="T-NOT 輸出"
              rows={notRows}
              currentInputs={[inputA]}
              mode={mode}
            />
          )}

          {/* Principle Exploration Card */}
          <div className="bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl p-5 text-xs space-y-3">
            <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">
              01. 太玄與非之哲學演繹
            </h3>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
              天為純陽（2 / +1），地為居中（1 / 0），人為同和（0 / -1）。
              T-NAND 模擬的是萬物生化中的「降抑與倒反」：
            </p>
            <ul className="space-y-1.5 text-slate-600 dark:text-slate-400 list-disc list-inside">
              <li>
                若輸入皆為<strong>天</strong>（極陽），則亢龍有悔，物極必反，輸出為<strong>人</strong>（0 / -1）。
              </li>
              <li>
                若有任一端為<strong>人</strong>（同和 / 0），則天道包容，輸出皆昇華為<strong>天</strong>（2 / +1）。
              </li>
              <li>
                當把同一信號接進 T-NAND 兩端（A ⊼ A），天變成人，人變成天，中道之地自守不變，即成完美的<strong>太玄倒反門 (T-NOT)</strong>！
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
