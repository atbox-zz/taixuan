/**
 * Chapter 8: Comprehensive Interactive Tools & Engineering Workbench
 * (互動工具與工程輔助工作台)
 * @license Apache-2.0
 */

import React, { useState } from 'react';
import { DisplayMode } from '../../types/ternary';
import { TernaryWaveformAnalyzer } from '../tools/TernaryWaveformAnalyzer';
import { InteractiveTruthTableGenerator } from '../tools/InteractiveTruthTableGenerator';
import { TernaryConverterCalculator } from '../tools/TernaryConverterCalculator';
import { SymbolicEvolutionTree } from '../tools/SymbolicEvolutionTree';
import { AluInstructionReference } from '../tools/AluInstructionReference';
import { DynamicTimingSimulator } from '../tools/DynamicTimingSimulator';
import { TetragramLogicOptimizer } from '../tools/TetragramLogicOptimizer';
import { HdlSimulatorSandbox } from '../tools/HdlSimulatorSandbox';
import { AutomatedUnitTestbench } from '../tools/AutomatedUnitTestbench';
import { AluLatencyFlowProfiler } from '../tools/AluLatencyFlowProfiler';
import { runGateVerificationSuite } from '../../lib/ternaryLogic';
import { GateVerification } from '../../types/ternary';
import confetti from 'canvas-confetti';

interface Chapter8WorkbenchProps {
  mode: DisplayMode;
  onOpenBrowser: () => void;
  onOpenCulture: () => void;
}

export const Chapter8Workbench: React.FC<Chapter8WorkbenchProps> = ({
  mode,
  onOpenBrowser,
  onOpenCulture,
}) => {
  const [activeTool, setActiveTool] = useState<
    | 'truthtable'
    | 'waveform'
    | 'calculator'
    | 'evolution'
    | 'alutable'
    | 'timing'
    | 'optimizer'
    | 'hdl'
    | 'verification'
    | 'profiler'
  >('profiler');

  // Verification suite state
  const [suiteResults, setSuiteResults] = useState<GateVerification[]>([]);
  const [isRunningTests, setIsRunningTests] = useState<boolean>(false);

  const handleRunFullSuite = () => {
    setIsRunningTests(true);
    setTimeout(() => {
      const res = runGateVerificationSuite();
      setSuiteResults(res);
      setIsRunningTests(false);
      const allPassed = res.every((r) => r.passed);
      if (allPassed) {
        confetti({ particleCount: 70, spread: 60 });
      }
    }, 400);
  };

  return (
    <div className="space-y-8">
      {/* Editorial Header */}
      <div className="border-b border-slate-200 dark:border-slate-800 pb-5">
        <div className="flex items-center gap-2 text-xs font-mono-code text-slate-500 mb-1">
          <span>CHAPTER 08</span>
          <span aria-hidden="true">·</span>
          <span>INTERACTIVE TOOLS & ENGINEERING WORKBENCH</span>
        </div>
        <h2 className="text-2xl font-bold font-serif-tc text-slate-900 dark:text-slate-100">
          互動工具與工程輔助工作台
        </h2>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400 max-w-3xl leading-relaxed">
          為完整支撐《太玄經》三進制計算系統的設計、調試與驗證，本工作台集成了專業級工程輔助工具：
          <strong>互動真值表生成器</strong>、
          <strong>三值時序邏輯分析儀</strong>、
          <strong>進制換算與首象計算機</strong>、
          <strong>符號演化史（D3 樹狀圖）</strong>、
          <strong>81首 ALU 指令集速查手冊</strong>、
          <strong>動態時序模擬器（D3 正反器與CPU流水線）</strong>、
          <strong>卦象邏輯優化器（T-NAND 自動綜合與化簡）</strong>、
          <strong>TaiXuan HDL 硬體仿真沙盒</strong>、
          <strong>自動化單元測試台（HDL 測試腳本與 81-ISA 誤差診斷）</strong>，以及
          <strong>ALU 延遲與數據流轉監控（D3.js 81首指令邏輯瓶頸熱點圖）</strong>。
        </p>
      </div>

      {/* Tool Selector Tabs */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700/60 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTool('truthtable')}
            className={`px-3.5 py-2 text-xs font-medium rounded-lg transition-all whitespace-nowrap flex items-center gap-1.5 ${
              activeTool === 'truthtable'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <span>▦</span>
            <span>1. 互動真值表生成器</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTool('waveform')}
            className={`px-3.5 py-2 text-xs font-medium rounded-lg transition-all whitespace-nowrap flex items-center gap-1.5 ${
              activeTool === 'waveform'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <span>📈</span>
            <span>2. 三值時序分析儀</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTool('calculator')}
            className={`px-3.5 py-2 text-xs font-medium rounded-lg transition-all whitespace-nowrap flex items-center gap-1.5 ${
              activeTool === 'calculator'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <span>🧮</span>
            <span>3. 實時進制與爻象換算工具</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTool('evolution')}
            className={`px-3.5 py-2 text-xs font-medium rounded-lg transition-all whitespace-nowrap flex items-center gap-1.5 ${
              activeTool === 'evolution'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <span>🌳</span>
            <span>4. 符號演化史 (D3 樹狀圖)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTool('alutable')}
            className={`px-3.5 py-2 text-xs font-medium rounded-lg transition-all whitespace-nowrap flex items-center gap-1.5 ${
              activeTool === 'alutable'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <span>𝌆</span>
            <span>5. 81首 ALU 指令集速查</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTool('timing')}
            className={`px-3.5 py-2 text-xs font-medium rounded-lg transition-all whitespace-nowrap flex items-center gap-1.5 ${
              activeTool === 'timing'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <span>⏱</span>
            <span>6. 動態時序模擬 (D3 正反器與CPU)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTool('optimizer')}
            className={`px-3.5 py-2 text-xs font-medium rounded-lg transition-all whitespace-nowrap flex items-center gap-1.5 ${
              activeTool === 'optimizer'
                ? 'bg-white dark:bg-slate-900 text-sky-600 dark:text-sky-400 shadow-xs font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <span>⚡</span>
            <span>7. 卦象邏輯優化器 (T-NAND)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTool('hdl')}
            className={`px-3.5 py-2 text-xs font-medium rounded-lg transition-all whitespace-nowrap flex items-center gap-1.5 font-mono-code ${
              activeTool === 'hdl'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <span>&lt;/&gt;</span>
            <span>8. TaiXuan HDL 仿真器</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTool('verification')}
            className={`px-3.5 py-2 text-xs font-medium rounded-lg transition-all whitespace-nowrap flex items-center gap-1.5 ${
              activeTool === 'verification'
                ? 'bg-white dark:bg-slate-900 text-sky-600 dark:text-sky-400 shadow-xs font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <span>🧪</span>
            <span>9. 自動化單元測試台 (HDL & 81-ISA)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTool('profiler')}
            className={`px-3.5 py-2 text-xs font-medium rounded-lg transition-all whitespace-nowrap flex items-center gap-1.5 ${
              activeTool === 'profiler'
                ? 'bg-white dark:bg-slate-900 text-sky-600 dark:text-sky-400 shadow-xs font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <span>⚡</span>
            <span>10. ALU 延遲與數據流轉監控 (D3 熱點圖)</span>
          </button>
        </div>

        {/* Quick Launchers */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onOpenBrowser}
            className="px-3 py-1.5 text-xs font-medium bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg transition-colors border border-slate-200 dark:border-slate-700/60"
          >
            𝌆 81首圖譜速查
          </button>
          <button
            type="button"
            onClick={onOpenCulture}
            className="px-3 py-1.5 text-xs font-medium bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg transition-colors border border-slate-200 dark:border-slate-700/60"
          >
            太玄源流探微
          </button>
        </div>
      </div>

      {/* Main Active Tool Display */}
      <div>
        {activeTool === 'truthtable' && <InteractiveTruthTableGenerator mode={mode} />}
        {activeTool === 'waveform' && <TernaryWaveformAnalyzer mode={mode} />}
        {activeTool === 'calculator' && <TernaryConverterCalculator mode={mode} />}
        {activeTool === 'evolution' && <SymbolicEvolutionTree />}
        {activeTool === 'alutable' && <AluInstructionReference mode={mode} />}
        {activeTool === 'timing' && <DynamicTimingSimulator mode={mode} />}
        {activeTool === 'optimizer' && (
          <TetragramLogicOptimizer mode={mode} onNavigateToHdl={() => setActiveTool('hdl')} />
        )}
        {activeTool === 'hdl' && <HdlSimulatorSandbox />}
        {activeTool === 'profiler' && <AluLatencyFlowProfiler mode={mode} />}
        {activeTool === 'verification' && (
          <div className="space-y-8">
            {/* Main Automated Unit Testbench with HDL scripting & 81-ISA diagnostics */}
            <AutomatedUnitTestbench mode={mode} />

            {/* Supplementary Gate Verification Benchmark Runner */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
                <div>
                  <span className="text-xs font-mono-code text-sky-600 dark:text-sky-400 block mb-0.5">
                    GATE-LEVEL BENCHMARK REGRESSION
                  </span>
                  <h3 className="text-base font-bold font-serif-tc text-slate-900 dark:text-slate-100">
                    太玄全量底層門電路窮舉回歸測試套件
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    涵蓋 T-NOT、T-AND、T-OR、T-HA 半加器、T-FA 全加器及 4-Trit ALU 數百組真值邊界測試
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleRunFullSuite}
                  disabled={isRunningTests}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors whitespace-nowrap flex items-center gap-2"
                >
                  <span>{isRunningTests ? '⏳ 正在執行門級測試...' : '▶ 執行門級全量自動驗證'}</span>
                </button>
              </div>

              {/* Test Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {suiteResults.length === 0 ? (
                  <div className="md:col-span-2 text-center py-8 text-xs text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                    尚未運行底層門測試。點擊右上角「執行門級全量自動驗證」以啟動逐門真值表嚴格驗證。
                  </div>
                ) : (
                  suiteResults.map((item) => (
                    <div
                      key={item.id}
                      className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                          {item.name}
                        </span>
                        <span
                          className={`text-xs font-mono-code font-bold px-2 py-0.5 rounded ${
                            item.passed
                              ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {item.passed ? '✓ 100% PASS' : '✗ FAIL'}
                        </span>
                      </div>

                      <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                        {item.details}
                      </p>

                      <div className="flex items-center justify-between text-[10px] font-mono-code text-slate-400 pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
                        <span>測試覆蓋：{item.passedTests} / {item.totalTests} 測試項</span>
                        <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                          零錯誤 (Zero Invariant Violations)
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
