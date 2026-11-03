/**
 * Chapter 5: The Tai Xuan 4-Trit ALU (太玄四爻算術邏輯運算單元)
 * @license Apache-2.0
 */

import React, { useState } from 'react';
import { TritValue, DisplayMode, AluOpcode } from '../../types/ternary';
import { executeAlu } from '../../lib/ternaryLogic';
import { TritSelector } from '../TritSelector';
import { TritBadge } from '../TritBadge';
import { TetragramVisualizer } from '../TetragramVisualizer';
import { CircuitCanvas } from '../CircuitCanvas';
import { AluDataFlowD3 } from '../AluDataFlowD3';
import { AluInstructionHeatmapD3 } from '../AluInstructionHeatmapD3';
import {
  fourTritsToStandardInt,
  fourTritsToBalancedInt,
  findTetragramByTrits,
  formatTrit,
} from '../../lib/taiXuanData';
import confetti from 'canvas-confetti';

interface Chapter5Props {
  mode: DisplayMode;
}

export const Chapter5Alu: React.FC<Chapter5Props> = ({ mode }) => {
  // 4-Trit Operands X and Y
  const [x, setX] = useState<[TritValue, TritValue, TritValue, TritValue]>([2, 2, 1, 0]); // 首 75 歛 / Value
  const [y, setY] = useState<[TritValue, TritValue, TritValue, TritValue]>([0, 2, 1, 1]); // Value
  const [opcode, setOpcode] = useState<AluOpcode>('ADD');
  const [viewMode, setViewMode] = useState<'d3' | 'heatmap' | 'schematic'>('d3');

  const aluResult = executeAlu(x, y, opcode);
  const resultHead = findTetragramByTrits(aluResult.out);
  const xHead = findTetragramByTrits(x);
  const yHead = findTetragramByTrits(y);

  const opcodes: Array<{
    code: AluOpcode;
    name: string;
    symbol: string;
    desc: string;
    category: 'arithmetic' | 'logic' | 'shift';
  }> = [
    { code: 'ADD', name: '加法 (ADD)', symbol: '+', desc: '四爻兩首逐位相加並傳導進位', category: 'arithmetic' },
    { code: 'SUB', name: '減法 (SUB)', symbol: '-', desc: '四爻求差（模 81 差額）', category: 'arithmetic' },
    { code: 'MIN', name: '降取 (T-AND)', symbol: '∧', desc: '逐爻求最小值 min(Xᵢ, Yᵢ)', category: 'logic' },
    { code: 'MAX', name: '升取 (T-OR)', symbol: '∨', desc: '逐爻求最大值 max(Xᵢ, Yᵢ)', category: 'logic' },
    { code: 'NEG', name: '倒反 (T-NOT)', symbol: '¬', desc: '逐爻倒反 2 - Xᵢ (天變人人變天)', category: 'logic' },
    { code: 'CYCLE', name: '循變 (CYCLE)', symbol: '⟳', desc: '逐爻三才演進 (Xᵢ + 1) mod 3', category: 'logic' },
    { code: 'SHL', name: '左移 (SHL)', symbol: '≪', desc: '四爻左移一級（相當於乘三）', category: 'shift' },
    { code: 'SHR', name: '右移 (SHR)', symbol: '≫', desc: '四爻右移一級（相當於除三）', category: 'shift' },
    { code: 'CMP', name: '比較 (CMP)', symbol: '≶', desc: '若 X>Y 則天，X=Y 則地，X<Y 則人', category: 'arithmetic' },
  ];

  const handleRunStressTest = () => {
    confetti({ particleCount: 70, spread: 70 });
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="border-b border-slate-200 dark:border-slate-800 pb-5">
        <div className="flex items-center gap-2 text-xs font-mono-code text-slate-500 mb-1">
          <span>CHAPTER 05</span>
          <span aria-hidden="true">·</span>
          <span>THE TAI XUAN 4-TRIT ALU</span>
        </div>
        <h2 className="text-2xl font-bold font-serif-tc text-slate-900 dark:text-slate-100">
          太玄算術邏輯單元 (Tai Xuan 4-Trit ALU)
        </h2>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400 max-w-3xl leading-relaxed">
          如同經典 Hack 計算機中的 Hack ALU，太玄 ALU 是整台三進制虛擬微機的運算中樞。它接收兩個四爻向量（被操作數 X 與操作數 Y）以及 1 個操作碼（Opcode），在單一時鐘週期內並行運算出結果首象，並即時產出四大狀態標誌位：
          <span className="text-sky-600 dark:text-sky-400 font-semibold"> 陽昇 (Positive)</span>、
          <span className="text-amber-600 dark:text-amber-400 font-semibold"> 地歸 (Zero)</span>、
          <span className="text-violet-600 dark:text-violet-400 font-semibold"> 人伏 (Negative)</span> 與
          <span className="text-rose-600 dark:text-rose-400 font-semibold"> 溢出 (Carry)</span>。
        </p>
      </div>

      {/* Opcode Selector Strip */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs space-y-2">
        <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-100 dark:border-slate-800">
          <span className="font-semibold text-slate-900 dark:text-slate-100">
            ALU 操作指令選擇碼 (Instruction Opcode)
          </span>
          <span className="text-slate-500 font-mono-code">
            當前操作：{opcodes.find((o) => o.code === opcode)?.desc}
          </span>
        </div>

        <div className="flex flex-wrap gap-2 pt-1">
          {opcodes.map((op) => {
            const isSelected = opcode === op.code;
            return (
              <button
                key={op.code}
                type="button"
                onClick={() => setOpcode(op.code)}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono-code transition-all flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-sky-600 text-white shadow-xs font-bold ring-2 ring-sky-300 dark:ring-sky-700'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                <span className="font-bold">{op.symbol}</span>
                <span>{op.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main ALU Interactive Workbench */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Operands Column (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Operand X */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                向量輸入 X (四爻：【{xHead.name}】第 {xHead.index} 首)
              </span>
              <span className="text-[11px] font-mono-code text-slate-500">
                標準: {fourTritsToStandardInt(x)} · 平衡: {fourTritsToBalancedInt(x)}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <TritSelector
                label="四爻 方 (T3: MSB)"
                value={x[0]}
                onChange={(v) => setX([v, x[1], x[2], x[3]])}
                mode={mode}
                size="sm"
              />
              <TritSelector
                label="三爻 州 (T2)"
                value={x[1]}
                onChange={(v) => setX([x[0], v, x[2], x[3]])}
                mode={mode}
                size="sm"
              />
              <TritSelector
                label="二爻 部 (T1)"
                value={x[2]}
                onChange={(v) => setX([x[0], x[1], v, x[3]])}
                mode={mode}
                size="sm"
              />
              <TritSelector
                label="初爻 家 (T0: LSB)"
                value={x[3]}
                onChange={(v) => setX([x[0], x[1], x[2], v])}
                mode={mode}
                size="sm"
              />
            </div>
          </div>

          {/* Operand Y */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                向量輸入 Y (四爻：【{yHead.name}】第 {yHead.index} 首)
              </span>
              <span className="text-[11px] font-mono-code text-slate-500">
                標準: {fourTritsToStandardInt(y)} · 平衡: {fourTritsToBalancedInt(y)}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <TritSelector
                label="四爻 方 (T3: MSB)"
                value={y[0]}
                onChange={(v) => setY([v, y[1], y[2], y[3]])}
                mode={mode}
                size="sm"
              />
              <TritSelector
                label="三爻 州 (T2)"
                value={y[1]}
                onChange={(v) => setY([y[0], v, y[2], y[3]])}
                mode={mode}
                size="sm"
              />
              <TritSelector
                label="二爻 部 (T1)"
                value={y[2]}
                onChange={(v) => setY([y[0], y[1], v, y[3]])}
                mode={mode}
                size="sm"
              />
              <TritSelector
                label="初爻 家 (T0: LSB)"
                value={y[3]}
                onChange={(v) => setY([y[0], y[1], y[2], v])}
                mode={mode}
                size="sm"
              />
            </div>
          </div>
        </div>

        {/* Center & Result Column (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Visualizer Mode Switcher */}
          <div className="flex items-center justify-between bg-slate-100 dark:bg-slate-800/60 p-1.5 rounded-xl border border-slate-200 dark:border-slate-700/60 flex-wrap gap-2">
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={() => setViewMode('d3')}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all whitespace-nowrap flex items-center gap-1.5 ${
                  viewMode === 'd3'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <span>📊</span>
                <span>D3.js 動態數據流向圖</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('heatmap')}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all whitespace-nowrap flex items-center gap-1.5 ${
                  viewMode === 'heatmap'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <span>🔥</span>
                <span>81首指令運算熱圖 (D3.js)</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('schematic')}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all whitespace-nowrap flex items-center gap-1.5 ${
                  viewMode === 'schematic'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <span>📐</span>
                <span>傳統晶片引腳拓撲</span>
              </button>
            </div>
            <span className="text-[11px] font-mono-code text-slate-500 dark:text-slate-400">
              當前操作碼: <strong className="text-sky-600 dark:text-sky-400">{opcode}</strong>
            </span>
          </div>

          {viewMode === 'd3' && (
            <AluDataFlowD3
              x={x}
              y={y}
              opcode={opcode}
              result={aluResult}
              mode={mode}
            />
          )}

          {viewMode === 'heatmap' && (
            <AluInstructionHeatmapD3
              x={x}
              y={y}
              opcode={opcode}
              onSelectX={(newX) => setX(newX)}
              mode={mode}
            />
          )}

          {viewMode === 'schematic' && (
            <CircuitCanvas
              gateType="TALU"
              inputs={{ A: x[0], B: y[0] }}
              outputs={{ OUT: aluResult.out[0] }}
              mode={mode}
              title={`太玄 4-Trit ALU 核心 · Opcode: ${opcode}`}
            />
          )}

          {/* Result Presentation Card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                ALU 運算輸出卦象 (Output Tetragram)
              </span>
              <span className="text-xs font-mono-code text-sky-600 dark:text-sky-400 font-bold">
                太玄首名：【{resultHead.name}】第 {resultHead.index} 首
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 items-center">
              <TetragramVisualizer
                trits={aluResult.out}
                mode={mode}
                size="md"
                showDetails={true}
                headOverride={resultHead}
              />

              {/* Status Flags Panel */}
              <div className="space-y-2.5">
                <span className="text-[11px] font-mono-code text-slate-400 block mb-1">
                  條件狀態標誌位 (Status Flags)
                </span>

                <div
                  className={`p-2.5 rounded-lg border flex items-center justify-between text-xs transition-colors ${
                    aluResult.isHeaven
                      ? 'bg-sky-50 dark:bg-sky-950/40 border-sky-300 dark:border-sky-800 text-sky-900 dark:text-sky-200 font-semibold'
                      : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 text-slate-500'
                  }`}
                >
                  <span>陽昇 (Positive / 天)</span>
                  <span className="font-mono-code">{aluResult.isHeaven ? '● 昇高' : '○ 否'}</span>
                </div>

                <div
                  className={`p-2.5 rounded-lg border flex items-center justify-between text-xs transition-colors ${
                    aluResult.isZero
                      ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200 font-semibold'
                      : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 text-slate-500'
                  }`}
                >
                  <span>地歸 (Zero / 地 / 和平)</span>
                  <span className="font-mono-code">{aluResult.isZero ? '● 歸中' : '○ 否'}</span>
                </div>

                <div
                  className={`p-2.5 rounded-lg border flex items-center justify-between text-xs transition-colors ${
                    aluResult.isHuman
                      ? 'bg-violet-50 dark:bg-violet-950/40 border-violet-300 dark:border-violet-800 text-violet-900 dark:text-violet-200 font-semibold'
                      : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 text-slate-500'
                  }`}
                >
                  <span>人伏 (Negative / 人)</span>
                  <span className="font-mono-code">{aluResult.isHuman ? '● 沉伏' : '○ 否'}</span>
                </div>

                <div
                  className={`p-2.5 rounded-lg border flex items-center justify-between text-xs transition-colors ${
                    aluResult.overflow
                      ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-200 font-semibold'
                      : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 text-slate-500'
                  }`}
                >
                  <span>溢出 (Carry / 溢)</span>
                  <span className="font-mono-code">{aluResult.overflow ? '▲ 溢位' : '○ 正常'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
