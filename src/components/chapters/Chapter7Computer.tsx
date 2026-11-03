/**
 * Chapter 7: The Tai Xuan 81-Tetragram Micro-Computer (太玄八十一首微機虛擬機)
 * The complete computing system: PC, ROM, ALU, Accumulator, and 81 Tetragram Programs
 * @license Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { TritValue, DisplayMode, AluOpcode } from '../../types/ternary';
import { executeAlu } from '../../lib/ternaryLogic';
import { TetragramVisualizer } from '../TetragramVisualizer';
import { TritBadge } from '../TritBadge';
import { TetragramGenealogyBrowser } from '../TetragramGenealogyBrowser';
import {
  TAI_XUAN_HEADS,
  fourTritsToStandardInt,
  standardIntToFourTrits,
  formatTrit,
} from '../../lib/taiXuanData';
import { Cpu, Layers, Database, Sparkles, ArrowRight, Tv, Code, Flame, Gamepad2 } from 'lucide-react';
import confetti from 'canvas-confetti';
import { TernaryVramDisplay } from '../TernaryVramDisplay';
import { TaiXuanAssembler } from './TaiXuanAssembler';
import { AssembledInstruction } from '../../lib/taixuanAssembler';
import { TaiXuanTetrisCapstone } from './TaiXuanTetrisCapstone';

interface Chapter7Props {
  mode: DisplayMode;
}

interface Instruction {
  address: number;
  label?: string;
  headIndex: number; // 1..81
  opcode: AluOpcode;
  immediate: [TritValue, TritValue, TritValue, TritValue];
  comment: string;
}

export const Chapter7Computer: React.FC<Chapter7Props> = ({ mode }) => {
  // Programs
  const PROGRAMS: Record<string, { title: string; desc: string; code: Instruction[] }> = {
    fibonacci: {
      title: '太玄三進制斐波那契數列 (Ternary Fibonacci)',
      desc: '在四爻空間內計算斐波那契演化：Fₙ₊₁ = (Fₙ + Fₙ₋₁) mod 81，觀察首象輪轉。',
      code: [
        { address: 0, label: 'INIT', headIndex: 1, opcode: 'ADD', immediate: [0, 0, 0, 1], comment: '載入種子 1 (家爻為地)' },
        { address: 1, label: 'STEP1', headIndex: 2, opcode: 'ADD', immediate: [0, 0, 0, 2], comment: '累加次項 F₁ = 2' },
        { address: 2, label: 'STEP2', headIndex: 3, opcode: 'ADD', immediate: [0, 0, 1, 0], comment: '兩首共合，產生新首' },
        { address: 3, label: 'STEP3', headIndex: 5, opcode: 'ADD', immediate: [0, 0, 1, 2], comment: '斐波那契階躍' },
        { address: 4, label: 'STEP4', headIndex: 8, opcode: 'CYCLE', immediate: [0, 0, 2, 2], comment: '太玄三才循變' },
        { address: 5, label: 'LOOP', headIndex: 13, opcode: 'MAX', immediate: [0, 1, 1, 1], comment: '升取調和，循環往復' },
      ],
    },
    calendar: {
      title: '八十一首歲時曆法巡曆 (81 Solar Term Stepper)',
      desc: '從冬至初日【中首】出發，每步前進一首，巡歷大寒、立春、清明至終首【養】。',
      code: Array.from({ length: 9 }, (_, i) => ({
        address: i,
        headIndex: i + 1,
        opcode: 'ADD' as AluOpcode,
        immediate: standardIntToFourTrits(i + 1),
        comment: `紀曆流轉：第 ${i + 1} 首【${TAI_XUAN_HEADS[i].name}】· ${TAI_XUAN_HEADS[i].solarDate}`,
      })),
    },
    harmony: {
      title: '天地人三元平衡求解器 (Equilibrium Convergence)',
      desc: '利用 ALU 的 MIN、MAX 與 NEG 指令，快速將偏亢之數收斂至中道（首 1 中）。',
      code: [
        { address: 0, label: 'START', headIndex: 81, opcode: 'NEG', immediate: [2, 2, 2, 2], comment: '極陽亢逆，實施倒反 (T-NOT)' },
        { address: 1, label: 'BAL1', headIndex: 41, opcode: 'CYCLE', immediate: [1, 2, 1, 2], comment: '三才流轉，化除乖阻' },
        { address: 2, label: 'BAL2', headIndex: 21, opcode: 'MIN', immediate: [1, 1, 2, 2], comment: '降取太和，納入正軌' },
        { address: 3, label: 'EQUIL', headIndex: 1, opcode: 'ADD', immediate: [1, 1, 1, 1], comment: '復歸於黃中通理【中首】' },
      ],
    },
  };

  const [customProgram, setCustomProgram] = useState<{
    title: string;
    desc: string;
    code: Instruction[];
  } | null>(null);

  const [selectedProgramKey, setSelectedProgramKey] = useState<string>('fibonacci');

  const allPrograms: Record<string, { title: string; desc: string; code: Instruction[] }> = {
    ...PROGRAMS,
    ...(customProgram ? { custom: customProgram } : {}),
  };
  const program = allPrograms[selectedProgramKey] || PROGRAMS.fibonacci;

  // View Mode: 'pipeline', 'genealogy', 'vram', 'assembler', or 'tetris' (Stage A Capstone)
  const [activeViewMode, setActiveViewMode] = useState<'pipeline' | 'genealogy' | 'vram' | 'assembler' | 'tetris'>('pipeline');

  // CPU Registers
  const [pc, setPc] = useState<number>(0);
  const [acc, setAcc] = useState<[TritValue, TritValue, TritValue, TritValue]>([1, 1, 1, 1]); // Accumulator (starts at 地地地地)
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [clockCount, setClockCount] = useState<number>(0);
  const [executionLog, setExecutionLog] = useState<string[]>([]);

  const intervalRef = useRef<number | null>(null);

  const stepExecution = () => {
    const currentInstr = program.code[pc];
    if (!currentInstr) {
      setPc(0);
      return;
    }

    // Execute ALU operation: Acc = ALU(Acc, immediate, opcode)
    const aluRes = executeAlu(acc, currentInstr.immediate, currentInstr.opcode);
    const resultHead = TAI_XUAN_HEADS[fourTritsToStandardInt(aluRes.out)] || TAI_XUAN_HEADS[0];

    setAcc(aluRes.out);
    setClockCount((c) => c + 1);

    const logEntry = `[時鐘 #${clockCount + 1}] PC=${pc} | 指令: ${currentInstr.opcode} | 運算後首象: 【${resultHead.name}】第${resultHead.index}首 (${resultHead.solarDate})`;
    setExecutionLog((prev) => [logEntry, ...prev.slice(0, 9)]);

    // Advance PC
    const nextPc = (pc + 1) % program.code.length;
    setPc(nextPc);

    if (nextPc === 0 && selectedProgramKey === 'harmony') {
      confetti({ particleCount: 40, spread: 50 });
    }
  };

  const handleLoadFromGenealogy = (params: {
    headIndex: number;
    head: (typeof TAI_XUAN_HEADS)[0];
    opcode: AluOpcode;
    mnemonic: string;
    immediate: [TritValue, TritValue, TritValue, TritValue];
    accOverride: [TritValue, TritValue, TritValue, TritValue];
    address: number;
  }) => {
    setAcc(params.accOverride);
    setPc(params.address % (program.code.length || 1));
    setClockCount((c) => c + 1);
    const logEntry = `[譜系載入] 首象【${params.head.name}】第${params.head.index}首：已配置 ALU 暫存器 X=[${params.accOverride.join('')}], Opcode=${params.opcode}, 內存地址=@0x${params.address.toString(16).toUpperCase().padStart(2, '0')}`;
    setExecutionLog((prev) => [logEntry, ...prev.slice(0, 9)]);
  };

  const handleBurnToRom = (
    instructions: AssembledInstruction[],
    title: string,
    desc: string
  ) => {
    const code: Instruction[] = instructions.map((i) => ({
      address: i.address,
      label: i.label,
      headIndex: i.headIndex,
      opcode: i.opcode,
      immediate: i.immediate,
      comment: i.comment,
    }));
    setCustomProgram({ title, desc, code });
    setSelectedProgramKey('custom');
    setPc(0);
    setIsRunning(false);
    const logEntry = `[ROM 燒錄成功] 已加載 ${instructions.length} 條太玄機器指令！點擊「自動運行」或「單步時鐘」即可在流水線中執行。`;
    setExecutionLog((prev) => [logEntry, ...prev.slice(0, 9)]);
  };

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = window.setInterval(() => {
        stepExecution();
      }, 900);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunning, pc, acc, clockCount, selectedProgramKey]);

  const handleReset = () => {
    setIsRunning(false);
    setPc(0);
    setAcc([1, 1, 1, 1]);
    setClockCount(0);
    setExecutionLog([]);
  };

  const currentInstr = program.code[pc] || program.code[0];
  const accHead = TAI_XUAN_HEADS[fourTritsToStandardInt(acc)] || TAI_XUAN_HEADS[0];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="border-b border-slate-200 dark:border-slate-800 pb-5">
        <div className="flex items-center gap-2 text-xs font-mono-code text-slate-500 mb-1">
          <span>CHAPTER 07</span>
          <span aria-hidden="true">·</span>
          <span>THE 81-TETRAGRAM COMPLETE COMPUTER ARCHITECTURE</span>
        </div>
        <h2 className="text-2xl font-bold font-serif-tc text-slate-900 dark:text-slate-100">
          太玄八十一首微機虛擬機 (Tai Xuan Micro-Machine)
        </h2>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400 max-w-3xl leading-relaxed">
          如同《Nand to Tetris》最終構建出完整的 Hack 計算機系統，我們將元始 T-NAND 門逐層升華為加法器、4-Trit ALU、三穩態寄存器與指令譯碼器，終成
          <strong className="text-slate-900 dark:text-slate-200 font-serif-tc mx-1">「太玄微機」</strong>。
          在此，81 首既是歷法宇宙的象徵，也是一條條真實執行、驅動四爻累加器的微指令！配備專用
          <strong>「卦象譜系瀏覽器」</strong>，可點擊任意首卦直接載入內存分佈與暫存器配置。
        </p>
      </div>

      {/* Primary Sub-Navigation View Mode Switcher */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700/60 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveViewMode('pipeline')}
            className={`px-4 py-2 text-xs font-medium rounded-lg transition-all flex items-center gap-2 whitespace-nowrap ${
              activeViewMode === 'pipeline'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Cpu className="w-4 h-4 text-sky-600 dark:text-sky-400" />
            <span>1. 微機流水線主控台 (Architecture & Datapath)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveViewMode('genealogy')}
            className={`px-4 py-2 text-xs font-medium rounded-lg transition-all flex items-center gap-2 whitespace-nowrap ${
              activeViewMode === 'genealogy'
                ? 'bg-white dark:bg-slate-900 text-sky-600 dark:text-sky-400 shadow-xs font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <span className="text-amber-500 font-serif text-sm">𝌆</span>
            <span>2. 卦象譜系瀏覽器 (Genealogy & Memory / Register)</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-sky-100 dark:bg-sky-950/80 text-sky-700 dark:text-sky-300 font-mono-code font-bold">
              81首
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveViewMode('vram')}
            className={`px-4 py-2 text-xs font-medium rounded-lg transition-all flex items-center gap-2 whitespace-nowrap ${
              activeViewMode === 'vram'
                ? 'bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 shadow-xs font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Tv className="w-4 h-4 text-amber-500" />
            <span>3. 顯存與鍵盤終端 (VRAM Screen & Keyboard I/O)</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 font-mono-code font-bold">
              I/O 實時
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveViewMode('assembler')}
            className={`px-4 py-2 text-xs font-medium rounded-lg transition-all flex items-center gap-2 whitespace-nowrap ${
              activeViewMode === 'assembler'
                ? 'bg-white dark:bg-slate-900 text-purple-600 dark:text-purple-400 shadow-xs font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Code className="w-4 h-4 text-purple-500" />
            <span>4. 符號彙編與 ROM 燒錄 (Symbolic Assembler)</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 font-mono-code font-bold">
              IDE
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveViewMode('tetris')}
            className={`px-4 py-2 text-xs font-medium rounded-lg transition-all flex items-center gap-2 whitespace-nowrap ${
              activeViewMode === 'tetris'
                ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-xs font-bold'
                : 'text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 font-semibold'
            }`}
          >
            <Gamepad2 className="w-4 h-4 text-amber-500" />
            <span>5. 終章巨獻·太玄三象方塊 (Stage A: Capstone Tetris)</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 font-mono-code font-extrabold shadow-2xs animate-pulse">
              Stage A
            </span>
          </button>
        </div>

        {/* Quick status pill */}
        <div className="flex items-center gap-2 text-xs font-mono-code text-slate-500">
          <span>當前累加器首象:</span>
          <span className="font-bold text-slate-800 dark:text-slate-200 font-serif-tc">
            {accHead.unicodeChar} 首{accHead.index}【{accHead.name}】
          </span>
        </div>
      </div>

      {/* View 1: Architecture & Datapath Pipeline */}
      {activeViewMode === 'pipeline' && (
        <div className="space-y-6">
          {/* Genealogy Quick Jump Banner in Datapath View */}
          <div className="bg-gradient-to-r from-sky-50 via-indigo-50 to-amber-50 dark:from-sky-950/40 dark:via-indigo-950/30 dark:to-amber-950/30 border border-sky-200/60 dark:border-sky-800/60 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5">
              <span className="text-xl select-none text-sky-600 dark:text-sky-400 font-serif">𝌆</span>
              <div>
                <span className="font-bold text-slate-800 dark:text-slate-200 font-serif-tc text-xs">
                  微機當前累加器首象：【{accHead.name}】第 {accHead.index} 首 ({accHead.unicodeChar})
                </span>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  點擊切換至「卦象譜系瀏覽器」，可自由點閱 81 首直接載入內存分佈與暫存器配置
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 self-start sm:self-center">
              <button
                type="button"
                onClick={() => setActiveViewMode('genealogy')}
                className="px-3 py-1.5 bg-white dark:bg-slate-900 border border-sky-300 dark:border-sky-700 rounded-lg text-xs font-semibold text-sky-700 dark:text-sky-300 hover:bg-sky-50 dark:hover:bg-sky-950/60 transition-colors flex items-center gap-1.5 whitespace-nowrap shadow-2xs"
              >
                <span>卦象譜系瀏覽器</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setActiveViewMode('vram')}
                className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-white rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 whitespace-nowrap shadow-2xs"
              >
                <Tv className="w-3.5 h-3.5" />
                <span>顯存與鍵盤</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveViewMode('assembler')}
                className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 whitespace-nowrap shadow-2xs"
              >
                <Code className="w-3.5 h-3.5" />
                <span>太玄彙編器</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveViewMode('tetris')}
                className="px-3 py-1.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap shadow-xs"
              >
                <Gamepad2 className="w-3.5 h-3.5" />
                <span>太玄方塊 (Stage A)</span>
              </button>
            </div>
          </div>

          {/* Program Chooser & CPU Control Bar */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs flex items-center justify-between flex-wrap gap-4">
            {/* Program Segmented Buttons */}
            <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-lg">
              {Object.entries(allPrograms).map(([key, p]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    setSelectedProgramKey(key);
                    handleReset();
                  }}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all whitespace-nowrap flex items-center gap-1.5 ${
                    selectedProgramKey === key
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs font-semibold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  {key === 'custom' && <Flame className="w-3 h-3 text-amber-500 fill-amber-500" />}
                  <span>{key === 'custom' ? '【ROM燒錄】' : p.title.split(' ')[0]}</span>
                </button>
              ))}
            </div>

            {/* Playback Controls */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setIsRunning(!isRunning)}
                className={`px-4 py-2 rounded-lg text-xs font-semibold shadow-xs transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                  isRunning
                    ? 'bg-amber-600 hover:bg-amber-500 text-white'
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                }`}
              >
                <span>{isRunning ? '⏸ 暫停執行 (Pause)' : '▶ 自動運行 (Run Machine)'}</span>
              </button>

              <button
                type="button"
                onClick={stepExecution}
                disabled={isRunning}
                className="px-3.5 py-2 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white rounded-lg text-xs font-medium shadow-xs transition-colors whitespace-nowrap"
              >
                單步時鐘 (Step)
              </button>

              <button
                type="button"
                onClick={handleReset}
                className="px-3 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-xs font-medium transition-colors whitespace-nowrap"
              >
                復位 (Reset)
              </button>
            </div>
          </div>

          {/* Main Hardware Architecture Diagram & Pipeline */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* ROM / Instruction Memory (4 cols) */}
            <div className="lg:col-span-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                  太玄指令儲存器 (ROM)
                </span>
                <span className="text-[11px] font-mono-code text-slate-400">
                  PC: <strong className="text-sky-600 dark:text-sky-400">#{pc}</strong>
                </span>
              </div>

              <div className="space-y-1.5 max-h-96 overflow-y-auto">
                {program.code.map((instr, idx) => {
                  const isCurrent = idx === pc;
                  const head = TAI_XUAN_HEADS[instr.headIndex - 1] || TAI_XUAN_HEADS[0];

                  return (
                    <div
                      key={idx}
                      className={`p-2.5 rounded-lg border text-xs transition-colors font-mono-code flex items-center justify-between ${
                        isCurrent
                          ? 'bg-sky-50 dark:bg-sky-950/60 border-sky-400 dark:border-sky-700 text-sky-950 dark:text-sky-100 shadow-xs ring-1 ring-sky-300 dark:ring-sky-600'
                          : 'bg-slate-50/60 dark:bg-slate-800/30 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-5 text-slate-400 text-[10px]">@{idx}</span>
                        <span className="font-bold text-slate-900 dark:text-slate-100 font-serif-tc">
                          【{head.name}】
                        </span>
                        <span className="text-sky-600 dark:text-sky-400 font-bold">{instr.opcode}</span>
                      </div>
                      <span className="text-[10px] text-slate-400 line-clamp-1 max-w-[120px]">
                        {instr.comment}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* CPU Execution Engine & Datapath (8 cols) */}
            <div className="lg:col-span-8 space-y-6">
              {/* Datapath Diagram Card */}
              <div className="bg-slate-900 text-white border border-slate-800 rounded-xl p-5 space-y-4 shadow-md">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <span className="text-xs font-semibold text-slate-300">
                    微機流水線資料通路 (Micro-Architecture Datapath)
                  </span>
                  <span className="text-xs font-mono-code text-amber-400">
                    時鐘脈衝週期：#{clockCount}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-center">
                  {/* Box 1: Program Counter & Decoder */}
                  <div className="p-3 bg-slate-800/90 rounded-xl border border-slate-700 space-y-2">
                    <span className="text-[10px] text-slate-400 font-mono-code block">1. 程式計數器 & 譯碼器</span>
                    <div className="text-base font-bold font-serif-tc text-sky-400 truncate">
                      PC: {pc} ➔ 【{TAI_XUAN_HEADS[currentInstr.headIndex - 1]?.name}】
                    </div>
                    <div className="text-xs font-mono-code text-slate-300">
                      指令解譯: <strong className="text-amber-300">{currentInstr.opcode}</strong>
                    </div>
                  </div>

                  {/* Box 2: 4-Trit ALU Engine */}
                  <div className="p-3 bg-slate-800/90 rounded-xl border border-slate-700 space-y-2">
                    <span className="text-[10px] text-slate-400 font-mono-code block">2. 太玄 4-Trit ALU 核心</span>
                    <div className="text-base font-bold text-emerald-400 font-mono-code">
                      Acc ⊛ Immediate
                    </div>
                    <div className="text-xs text-slate-300 font-mono-code truncate">
                      操作：{currentInstr.opcode}
                    </div>
                  </div>

                  {/* Box 3: Accumulator Register */}
                  <div className="p-3 bg-slate-800/90 rounded-xl border border-slate-700 space-y-2">
                    <span className="text-[10px] text-slate-400 font-mono-code block">3. 四爻累加器 (Acc)</span>
                    <div className="text-base font-bold font-serif-tc text-amber-400 truncate">
                      【{accHead.name}】首 (值:{fourTritsToStandardInt(acc)})
                    </div>
                    <div className="text-xs font-mono-code text-slate-300">
                      第 {accHead.index} 首 · 81首態
                    </div>
                  </div>

                  {/* Box 4: I/O Peripherals (VRAM & KBD) */}
                  <div
                    onClick={() => setActiveViewMode('vram')}
                    className="p-3 bg-slate-800/90 hover:bg-slate-800 rounded-xl border border-slate-700 hover:border-amber-500/60 space-y-2 cursor-pointer transition-colors group"
                    title="點擊進入 VRAM 顯存終端與鍵盤控制器"
                  >
                    <div className="text-[10px] text-slate-400 font-mono-code flex items-center justify-between">
                      <span>4. 外設顯存與鍵盤 (I/O)</span>
                      <span className="text-amber-400 group-hover:underline text-[10px]">進入 ➔</span>
                    </div>
                    <div className="text-base font-bold font-serif-tc text-amber-300 flex items-center gap-1.5 truncate">
                      <Tv className="w-4 h-4 text-amber-400 shrink-0" />
                      <span>9×9 點陣顯存</span>
                    </div>
                    <div className="text-xs font-mono-code text-slate-300">
                      映射: <strong className="text-emerald-400">@0x4F KBD</strong>
                    </div>
                  </div>
                </div>
              </div>

              {/* Accumulator Visual Display & Execution Logs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 items-start">
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs">
                  <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 block mb-3">
                    累加器當前首象 (Accumulator Tetragram)
                  </span>
                  <TetragramVisualizer trits={acc} mode={mode} size="md" showDetails={true} />
                </div>

                {/* Execution Trace Console */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs space-y-2">
                  <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 block pb-1 border-b border-slate-100 dark:border-slate-800">
                    時序執行蹤跡日誌 (Trace Console)
                  </span>
                  <div className="h-60 overflow-y-auto space-y-1.5 font-mono-code text-[11px] text-slate-600 dark:text-slate-400 pr-1">
                    {executionLog.length === 0 ? (
                      <div className="text-slate-400 py-6 text-center italic">
                        點擊「自動運行」或「單步時鐘」開始執行太玄程式
                      </div>
                    ) : (
                      executionLog.map((log, i) => (
                        <div key={i} className="p-1.5 bg-slate-50 dark:bg-slate-800/40 rounded border border-slate-100 dark:border-slate-800">
                          {log}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* View 2: Tetragram Genealogy Browser (Genealogy, Memory Layout & Register Configurator) */}
      {activeViewMode === 'genealogy' && (
        <TetragramGenealogyBrowser
          mode={mode}
          currentHeadIndex={accHead.index}
          currentAcc={acc}
          onLoadInstructionState={handleLoadFromGenealogy}
          onStepCpuWithState={() => {
            stepExecution();
            setActiveViewMode('pipeline');
          }}
        />
      )}

      {/* View 3: Ternary VRAM Screen & Keyboard I/O Controller */}
      {activeViewMode === 'vram' && (
        <TernaryVramDisplay mode={mode} />
      )}

      {/* View 4: Tai Xuan Symbolic Assembler & ROM Burner */}
      {activeViewMode === 'assembler' && (
        <TaiXuanAssembler
          mode={mode}
          onBurnToRom={handleBurnToRom}
          onSwitchToPipeline={() => setActiveViewMode('pipeline')}
        />
      )}

      {/* View 5: Stage A Capstone — Tai Xuan Ternary Tetris Game Engine */}
      {activeViewMode === 'tetris' && (
        <TaiXuanTetrisCapstone
          mode={mode}
          onOpenAssembler={() => setActiveViewMode('assembler')}
          onOpenGenealogy={() => setActiveViewMode('genealogy')}
        />
      )}
    </div>
  );
};
