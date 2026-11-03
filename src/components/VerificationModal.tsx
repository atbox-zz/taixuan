/**
 * Verification Modal: Comprehensive Test Suite for all synthesized gates and ALU
 * @license Apache-2.0
 */

import React, { useState } from 'react';
import { runGateVerificationSuite } from '../lib/ternaryLogic';
import { GateVerification } from '../types/ternary';
import confetti from 'canvas-confetti';

interface VerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const VerificationModal: React.FC<VerificationModalProps> = ({ isOpen, onClose }) => {
  const [results, setResults] = useState<GateVerification[]>([]);
  const [isRunning, setIsRunning] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleRunAll = () => {
    setIsRunning(true);
    setTimeout(() => {
      const res = runGateVerificationSuite();
      setResults(res);
      setIsRunning(false);
      const allPassed = res.every((r) => r.passed);
      if (allPassed) {
        confetti({ particleCount: 80, spread: 70, origin: { y: 0.5 } });
      }
    }, 400);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto shadow-2xl p-6 sm:p-8 space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
          <div>
            <span className="text-xs font-mono-code text-sky-600 dark:text-sky-400 block mb-1">
              FORMAL LOGIC VERIFICATION SUITE
            </span>
            <h3 className="text-xl font-bold font-serif-tc text-slate-900 dark:text-slate-100">
              太玄邏輯門與運算單元自動驗證套件
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            ✕
          </button>
        </div>

        <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
          如同《Nand to Tetris》中的 HardwareSimulator 測試腳本（.tst 與 .cmp 文件），本套件對系統中由 T-NAND 逐層合成的 T-NOT、T-AND、T-OR、半加器、全加器及 4-Trit ALU 進行全量窮舉測試。
        </p>

        <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
          <div>
            <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 block">
              自動化測試向量執行
            </span>
            <span className="text-[11px] text-slate-500 font-mono-code">
              共計涵蓋數百組真值邊界測試向量
            </span>
          </div>

          <button
            type="button"
            onClick={handleRunAll}
            disabled={isRunning}
            className="px-4 py-2 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors flex items-center gap-1.5"
          >
            <span>{isRunning ? '⏳ 測試進行中...' : '▶ 執行全量測試 (Run All Tests)'}</span>
          </button>
        </div>

        {/* Results List */}
        <div className="space-y-3">
          {results.length === 0 ? (
            <div className="text-center py-8 text-xs text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
              尚未運行測試。點擊上方按鈕開始全量自動驗證。
            </div>
          ) : (
            results.map((res) => (
              <div
                key={res.id}
                className="p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800 flex items-start justify-between gap-4"
              >
                <div className="space-y-1 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                      {res.name}
                    </span>
                    <span className="text-[10px] font-mono-code text-slate-400">
                      ({res.passedTests} / {res.totalTests} 項通過)
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-normal">
                    {res.details}
                  </p>
                </div>

                <span
                  className={`px-2.5 py-1 rounded text-xs font-mono-code font-bold whitespace-nowrap ${
                    res.passed
                      ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300'
                      : 'bg-rose-100 text-rose-800'
                  }`}
                >
                  {res.passed ? '✓ PASSED' : '✗ FAILED'}
                </span>
              </div>
            ))
          )}
        </div>

        <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            完成
          </button>
        </div>
      </div>
    </div>
  );
};
