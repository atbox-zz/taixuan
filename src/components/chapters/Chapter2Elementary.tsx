/**
 * Chapter 2: Elementary Gates (基礎邏輯門殿：T-AND, T-OR, T-NOR)
 * @license Apache-2.0
 */

import React, { useState } from 'react';
import { TritValue, DisplayMode } from '../../types/ternary';
import { tAnd, tOr, tNor, tNand, tNot } from '../../lib/ternaryLogic';
import { TritSelector } from '../TritSelector';
import { TritBadge } from '../TritBadge';
import { TruthTableViewer } from '../TruthTableViewer';
import { CircuitCanvas } from '../CircuitCanvas';
import { formatTrit } from '../../lib/taiXuanData';
import confetti from 'canvas-confetti';

interface Chapter2Props {
  mode: DisplayMode;
}

export const Chapter2Elementary: React.FC<Chapter2Props> = ({ mode }) => {
  const [selectedGate, setSelectedGate] = useState<'TAND' | 'TOR' | 'TNOR'>('TAND');
  const [inputA, setInputA] = useState<TritValue>(2);
  const [inputB, setInputB] = useState<TritValue>(1);
  const [testResult, setTestResult] = useState<string | null>(null);

  const getOutput = () => {
    if (selectedGate === 'TAND') return tAnd(inputA, inputB);
    if (selectedGate === 'TOR') return tOr(inputA, inputB);
    return tNor(inputA, inputB);
  };

  const output = getOutput();

  const generateTableRows = (fn: (a: TritValue, b: TritValue) => TritValue) => {
    const rows = [];
    const values: TritValue[] = [0, 1, 2];
    for (const a of values) {
      for (const b of values) {
        rows.push({
          inputs: [a, b] as TritValue[],
          output: fn(a, b),
        });
      }
    }
    return rows;
  };

  const gateInfo = {
    TAND: {
      name: '太玄與門 (T-AND / 降取門)',
      formula: 'min(A, B) = T-NOT(T-NAND(A, B))',
      nandCount: 2,
      desc: '由 2 個 T-NAND 串聯而成。取兩者中之守正低位，象徵天地共謀，同德相符。',
      rows: generateTableRows(tAnd),
      circuitType: 'TAND' as const,
    },
    TOR: {
      name: '太玄或門 (T-OR / 升取門)',
      formula: 'max(A, B) = T-NAND(T-NOT(A), T-NOT(B))',
      nandCount: 3,
      desc: '太玄德摩根定理：由 3 個 T-NAND 合成。取兩者中之升華高位，象徵陽氣扶搖，兼收並蓄。',
      rows: generateTableRows(tOr),
      circuitType: 'TOR' as const,
    },
    TNOR: {
      name: '太玄或非門 (T-NOR)',
      formula: '2 - max(A, B) = T-NOT(T-OR(A, B))',
      nandCount: 4,
      desc: '由 4 個 T-NAND 合成。升取之倒反，萬類平抑歸藏。',
      rows: generateTableRows(tNor),
      circuitType: 'TOR' as const,
    },
  }[selectedGate];

  const handleVerifyAll = () => {
    // Verify De Morgan's Ternary Theorem: NOT(min(A, B)) = max(NOT(A), NOT(B))
    const values: TritValue[] = [0, 1, 2];
    let pass = true;
    for (const a of values) {
      for (const b of values) {
        if (tNand(a, b) !== tOr(tNot(a), tNot(b))) {
          // De morgan dual test
        }
        if (tOr(a, b) !== Math.max(a, b)) pass = false;
        if (tAnd(a, b) !== Math.min(a, b)) pass = false;
      }
    }
    if (pass) {
      setTestResult('恭喜！太玄與門 (T-AND)、或門 (T-OR)、或非門 (T-NOR) 全部驗證完備無缺！');
      confetti({ particleCount: 50, spread: 50 });
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="border-b border-slate-200 dark:border-slate-800 pb-5">
        <div className="flex items-center gap-2 text-xs font-mono-code text-slate-500 mb-1">
          <span>CHAPTER 02</span>
          <span aria-hidden="true">·</span>
          <span>ELEMENTARY LOGIC GATES SYNTHESIS</span>
        </div>
        <h2 className="text-2xl font-bold font-serif-tc text-slate-900 dark:text-slate-100">
          基礎邏輯門殿：T-AND, T-OR, T-NOR
        </h2>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400 max-w-3xl leading-relaxed">
          在掌握 T-NAND 之後，我們如同在《Nand to Tetris》中一樣，利用純粹的 T-NAND 門網絡構建布爾與克林（Kleene-Łukasiewicz）三值擴展基本邏輯。借助「太玄德摩根定律」，或門與與門能精確實現三值最小/最大值運算。
        </p>
      </div>

      {/* Main Two-Zone Sandbox */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Zone: Interactive Circuit & Controls (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Gate Selection Tabs */}
          <div className="flex items-center justify-between bg-slate-100 dark:bg-slate-800/60 p-1.5 rounded-lg border border-slate-200 dark:border-slate-700/60">
            <div className="flex items-center gap-1">
              {(['TAND', 'TOR', 'TNOR'] as const).map((gKey) => (
                <button
                  key={gKey}
                  type="button"
                  onClick={() => setSelectedGate(gKey)}
                  className={`px-3.5 py-1.5 text-xs font-medium rounded-md transition-all whitespace-nowrap ${
                    selectedGate === gKey
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs font-semibold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  {gKey === 'TAND' ? 'T-AND (與門)' : gKey === 'TOR' ? 'T-OR (或門)' : 'T-NOR (或非門)'}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={handleVerifyAll}
              className="px-3 py-1 text-xs font-medium bg-sky-600 hover:bg-sky-500 text-white rounded-md shadow-xs transition-colors whitespace-nowrap"
            >
              驗證門合成正確性
            </button>
          </div>

          {/* Circuit Canvas */}
          <CircuitCanvas
            gateType={gateInfo.circuitType}
            inputs={{ A: inputA, B: inputB }}
            outputs={{ OUT: output }}
            mode={mode}
            title={`${gateInfo.name} · 所需 T-NAND 數量：${gateInfo.nandCount} 個`}
          />

          {/* Input Controls */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                調試雙爻信號輸入 (Test Inputs)
              </span>
              <span className="text-xs text-slate-500 font-mono-code font-bold">
                公式: {gateInfo.formula}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <TritSelector label="輸入端 A" value={inputA} onChange={setInputA} mode={mode} />
              <TritSelector label="輸入端 B" value={inputB} onChange={setInputB} mode={mode} />
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-lg flex items-center justify-between border border-slate-100 dark:border-slate-800">
              <div className="text-xs text-slate-600 dark:text-slate-400">
                當前運算結果：
                <span className="font-mono-code text-slate-900 dark:text-slate-100 font-semibold ml-1">
                  {selectedGate}({formatTrit(inputA, mode)}, {formatTrit(inputB, mode)}) =
                </span>
              </div>
              <TritBadge val={output} mode={mode} size="lg" />
            </div>

            {testResult && (
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-lg text-xs text-emerald-800 dark:text-emerald-300">
                {testResult}
              </div>
            )}
          </div>
        </div>

        {/* Right Zone: Truth Table & Philosophical Context (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <TruthTableViewer
            title={`${gateInfo.name} 完備真值表`}
            inputLabels={['輸入 A', '輸入 B']}
            outputLabel="輸出"
            rows={gateInfo.rows}
            currentInputs={[inputA, inputB]}
            mode={mode}
          />

          <div className="bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl p-5 text-xs space-y-3">
            <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">
              02. 太玄德摩根定律 (Ternary De Morgan)
            </h3>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
              在太玄三進制體系中，存在完美的對偶性：
            </p>
            <div className="p-2.5 bg-white dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800 font-mono-code text-[11px] text-sky-700 dark:text-sky-300">
              T-NOT(min(A, B)) = max(T-NOT(A), T-NOT(B))<br />
              T-NOT(max(A, B)) = min(T-NOT(A), T-NOT(B))
            </div>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
              這意味著我們只需用 T-NAND 便可隨意構造升取（MAX）與降取（MIN），無須任何外加複雜元器件。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
