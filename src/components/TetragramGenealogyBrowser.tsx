/**
 * Tetragram Genealogy Browser for Tai Xuan 81-Microcomputer
 * (八十一首微機模擬器 · 卦象譜系瀏覽器)
 * Allows users to inspect and click any of the 81 Tetragram heads,
 * directly loading the corresponding Memory distribution state and ALU register configurations.
 * @license Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { TritValue, DisplayMode, AluOpcode, TetragramHead } from '../types/ternary';
import {
  TAI_XUAN_HEADS,
  TRIT_INFO,
  fourTritsToStandardInt,
  fourTritsToBalancedInt,
  formatTrit,
  standardIntToFourTrits,
} from '../lib/taiXuanData';
import { executeAlu } from '../lib/ternaryLogic';
import { TritBadge } from './TritBadge';
import { TetragramVisualizer } from './TetragramVisualizer';
import {
  Search,
  Cpu,
  Database,
  ArrowRight,
  Zap,
  Sliders,
  CheckCircle2,
  Layers,
  ChevronRight,
  Activity,
  Copy,
  Sparkles,
} from 'lucide-react';
import confetti from 'canvas-confetti';

export interface TetragramGenealogyBrowserProps {
  mode: DisplayMode;
  currentHeadIndex: number;
  currentAcc: [TritValue, TritValue, TritValue, TritValue];
  onLoadInstructionState: (params: {
    headIndex: number;
    head: TetragramHead;
    opcode: AluOpcode;
    mnemonic: string;
    immediate: [TritValue, TritValue, TritValue, TritValue];
    accOverride: [TritValue, TritValue, TritValue, TritValue];
    address: number;
  }) => void;
  onStepCpuWithState?: () => void;
}

// Memory segment types
type MemorySegment = 'code' | 'data' | 'stack';

interface MemoryCell {
  address: number;
  hexAddr: string;
  segment: MemorySegment;
  segmentLabel: string;
  headIndex: number;
  trits: [TritValue, TritValue, TritValue, TritValue];
  decimalVal: number;
  label: string;
}

export const TetragramGenealogyBrowser: React.FC<TetragramGenealogyBrowserProps> = ({
  mode,
  currentHeadIndex,
  currentAcc,
  onLoadInstructionState,
  onStepCpuWithState,
}) => {
  // Selected head inside the genealogy browser (defaults to currentHeadIndex or 1)
  const [selectedHeadIdx, setSelectedHeadIdx] = useState<number>(currentHeadIndex || 1);

  // Filters
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedFang, setSelectedFang] = useState<'all' | 2 | 1 | 0>('all'); // 方 (Tier 3: 2=天, 1=地, 0=人)
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'arithmetic' | 'logic' | 'control'>('all');

  // Active view tab inside the browser
  const [activeInspectorTab, setActiveInspectorTab] = useState<'registers' | 'memory' | 'pipeline'>('registers');

  // Confirmation feedback toast
  const [loadedToast, setLoadedToast] = useState<string | null>(null);

  // Get active selected head object
  const activeHead = useMemo(() => {
    return TAI_XUAN_HEADS[selectedHeadIdx - 1] || TAI_XUAN_HEADS[0];
  }, [selectedHeadIdx]);

  // Derive ISA specification for the selected head
  const isaSpec = useMemo(() => {
    const [t3, t2, t1, t0] = activeHead.trits;
    let opcode: AluOpcode = 'ADD';
    let mnemonic = `ADD.R${t0}`;
    let category: 'arithmetic' | 'logic' | 'control' = 'arithmetic';
    let categoryName = '算術運算族';
    let description = '';

    const regName = `R${t0}`;
    const flagCond = t1 === 2 ? '.POS' : t1 === 1 ? '.ZERO' : '.NEG';

    if (t3 === 2) {
      category = 'arithmetic';
      categoryName = '算術運算族 (Arithmetic)';
      if (t2 === 2) {
        opcode = 'ADD';
        mnemonic = `ADD.${regName}${flagCond}`;
        description = `四爻並行加法：Acc = Acc + Imm，高位進位寫入 Carry 旗標。`;
      } else if (t2 === 1) {
        opcode = 'SUB';
        mnemonic = `SUB.${regName}${flagCond}`;
        description = `四爻模81求差：Acc = Acc - Imm，借位寫入溢出標誌。`;
      } else {
        opcode = 'ADD';
        mnemonic = `ACC.${regName}${flagCond}`;
        description = `加權累加器步進：基於三進制權重進行累加。`;
      }
    } else if (t3 === 1) {
      category = 'logic';
      categoryName = '邏輯位移族 (Logic & Shift)';
      if (t2 === 2) {
        opcode = 'MAX';
        mnemonic = `MAX.${regName}${flagCond}`;
        description = `逐爻升取 (T-OR / T-MAX)：保留各爻中較高電位之爻象。`;
      } else if (t2 === 1) {
        opcode = 'MIN';
        mnemonic = `MIN.${regName}${flagCond}`;
        description = `逐爻降取 (T-AND / T-MIN)：保留各爻中較低電位之爻象。`;
      } else {
        if (t1 === 2) {
          opcode = 'NEG';
          mnemonic = `NOT.${regName}`;
          description = `逐爻倒反 (T-NOT)：天變人、人變天、地自守。`;
        } else if (t1 === 1) {
          opcode = 'CYCLE';
          mnemonic = `CYCL.${regName}`;
          description = `三才順向流轉 (CYCLE)：(X + 1) mod 3 循變。`;
        } else {
          opcode = 'SHL';
          mnemonic = `SHL.${regName}`;
          description = `四爻左移階梯運算：左移乘三，低位補地(1)。`;
        }
      }
    } else {
      category = 'control';
      categoryName = '系統控制族 (Control & CMP)';
      if (t2 === 2) {
        opcode = 'CMP';
        mnemonic = `CMP.${regName}${flagCond}`;
        description = `三態數值比較：若 X>Y 賦天(2)，X=Y 賦地(1)，X<Y 賦人(0)。`;
      } else if (t2 === 1) {
        opcode = 'CYCLE';
        mnemonic = `SYS.CYC`;
        description = `系統微指令：觸發處理器時鐘週期相移。`;
      } else {
        opcode = 'CMP';
        mnemonic = `SYS.CMP`;
        description = `狀態比較與中斷檢驗指令。`;
      }
    }

    // Operand configurations:
    // Reg X (Primary Operand / Acc override): The 4 trits of the selected head
    const regX = activeHead.trits;

    // Reg Y (Secondary Operand / Imm): Derived complementary immediate vector
    const regY: [TritValue, TritValue, TritValue, TritValue] = [
      ((t3 + 1) % 3) as TritValue,
      t2,
      ((t1 + 2) % 3) as TritValue,
      t0,
    ];

    // Compute ALU result immediately
    const aluRes = executeAlu(regX, regY, opcode);
    const resultDec = fourTritsToStandardInt(aluRes.out);
    const resultHead = TAI_XUAN_HEADS[resultDec] || TAI_XUAN_HEADS[0];

    return {
      opcode,
      mnemonic,
      category,
      categoryName,
      description,
      regX,
      regY,
      aluRes,
      resultHead,
      address: activeHead.index - 1,
    };
  }, [activeHead]);

  // Generate 81-word Memory Distribution Map
  const memoryMap: MemoryCell[] = useMemo(() => {
    return Array.from({ length: 81 }, (_, addr) => {
      let segment: MemorySegment = 'code';
      let segmentLabel = '代碼段 (ROM Code)';

      if (addr >= 64) {
        segment = 'stack';
        segmentLabel = '堆疊段 (Stack Frame)';
      } else if (addr >= 32) {
        segment = 'data';
        segmentLabel = '數據段 (RAM Data)';
      }

      const hexAddr = `@0x${addr.toString(16).toUpperCase().padStart(2, '0')}`;
      const trits = standardIntToFourTrits(addr);
      const headObj = TAI_XUAN_HEADS[addr] || TAI_XUAN_HEADS[0];

      return {
        address: addr,
        hexAddr,
        segment,
        segmentLabel,
        headIndex: addr + 1,
        trits,
        decimalVal: addr,
        label: `首${addr + 1}【${headObj.name}】`,
      };
    });
  }, []);

  // Filtered head catalog for the 81-genealogy grid
  const filteredHeads = useMemo(() => {
    return TAI_XUAN_HEADS.filter((h) => {
      // Filter by Fang (Tier 3)
      if (selectedFang !== 'all' && h.trits[0] !== selectedFang) {
        return false;
      }

      // Filter by category
      if (selectedCategory !== 'all') {
        const t3 = h.trits[0];
        const cat = t3 === 2 ? 'arithmetic' : t3 === 1 ? 'logic' : 'control';
        if (cat !== selectedCategory) return false;
      }

      // Filter by search query
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase().trim();
        const matchesName = h.name.includes(q);
        const matchesPinyin = h.pinyin.toLowerCase().includes(q);
        const matchesMeaning = h.meaning.toLowerCase().includes(q);
        const matchesIndex = String(h.index) === q;
        const matchesSolar = h.solarDate.includes(q);
        if (!matchesName && !matchesPinyin && !matchesMeaning && !matchesIndex && !matchesSolar) {
          return false;
        }
      }

      return true;
    });
  }, [selectedFang, selectedCategory, searchTerm]);

  // Handle loading this head's configuration into the CPU
  const handleLoadState = () => {
    onLoadInstructionState({
      headIndex: activeHead.index,
      head: activeHead,
      opcode: isaSpec.opcode,
      mnemonic: isaSpec.mnemonic,
      immediate: isaSpec.regY,
      accOverride: isaSpec.regX,
      address: isaSpec.address,
    });

    setLoadedToast(`已將【${activeHead.name}】首載入微機累加器與暫存器！`);
    confetti({ particleCount: 35, spread: 50, origin: { y: 0.8 } });
    setTimeout(() => setLoadedToast(null), 2500);
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-6">
      {/* Title & Banner Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded bg-sky-100 dark:bg-sky-950/80 text-sky-700 dark:text-sky-300 font-mono-code font-bold text-xs">
              MICRO-ISA GENEALOGY BROWSER
            </span>
            <span className="text-xs text-slate-400 font-mono-code">3⁴ = 81 全象譜系</span>
          </div>
          <h3 className="text-xl font-bold font-serif-tc text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <span>八十一首卦象譜系瀏覽器</span>
            <span className="text-base font-normal text-slate-500 font-mono-code">
              (Tetragram Memory & Register Configurator)
            </span>
          </h3>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 max-w-3xl leading-relaxed">
            點擊任一首卦，即可實時加載該首在太玄微機中對應的
            <strong>內存地址映射分佈（Memory Layout）</strong>與
            <strong>ALU 暫存器配置（Register File & Datapath）</strong>，並一鍵注入微機流水線中執行。
          </p>
        </div>

        {/* Global Action: Load current selected head */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleLoadState}
            className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center gap-2"
          >
            <Zap className="w-4 h-4 fill-current text-sky-200" />
            <span>載入當前首象至微機</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-200 dark:border-slate-700/60 text-xs">
        {/* Search input */}
        <div className="relative flex-1 max-w-xs">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="搜尋首名、序號、拼音或指令..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs focus:outline-hidden focus:ring-2 focus:ring-sky-500 text-slate-900 dark:text-slate-100"
          />
        </div>

        {/* Filter Pills: 方 (Realm) */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-slate-500 text-[11px] font-semibold">三方譜系:</span>
          <button
            type="button"
            onClick={() => setSelectedFang('all')}
            className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
              selectedFang === 'all'
                ? 'bg-white dark:bg-slate-900 text-sky-600 dark:text-sky-400 font-bold shadow-2xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            全量 (81)
          </button>
          <button
            type="button"
            onClick={() => setSelectedFang(2)}
            className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all flex items-center gap-1 ${
              selectedFang === 2
                ? 'bg-sky-600 text-white font-bold shadow-2xs'
                : 'text-sky-700 dark:text-sky-300 hover:bg-sky-50 dark:hover:bg-sky-950/50'
            }`}
          >
            <span>⚊ 第一方·天 (1~27)</span>
          </button>
          <button
            type="button"
            onClick={() => setSelectedFang(1)}
            className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all flex items-center gap-1 ${
              selectedFang === 1
                ? 'bg-amber-600 text-white font-bold shadow-2xs'
                : 'text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/50'
            }`}
          >
            <span>⚋ 第二方·地 (28~54)</span>
          </button>
          <button
            type="button"
            onClick={() => setSelectedFang(0)}
            className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all flex items-center gap-1 ${
              selectedFang === 0
                ? 'bg-violet-600 text-white font-bold shadow-2xs'
                : 'text-violet-700 dark:text-violet-300 hover:bg-violet-50 dark:hover:bg-violet-950/50'
            }`}
          >
            <span>𝌀 第三方·人 (55~81)</span>
          </button>
        </div>

        {/* Filter Pills: Category */}
        <div className="flex items-center gap-1.5">
          <span className="text-slate-500 text-[11px] font-semibold">運算族:</span>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value as any)}
            className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-200 focus:outline-hidden"
          >
            <option value="all">全部指令族</option>
            <option value="arithmetic">算術運算 (ADD/SUB/ACC)</option>
            <option value="logic">邏輯位移 (MAX/MIN/NOT/CYC)</option>
            <option value="control">系統控制 (CMP/MOV)</option>
          </select>
        </div>
      </div>

      {/* Main Dual Grid: Left 81-Genealogy Catalog (5 cols), Right State Inspector (7 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: 81-Tetragram Genealogy Grid (5 cols) */}
        <div className="lg:col-span-5 bg-slate-50 dark:bg-slate-800/40 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-700/60 text-xs">
            <span className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5 font-serif-tc">
              <span>八十一首譜系選擇器</span>
              <span className="text-[11px] font-mono-code font-normal text-slate-500">
                ({filteredHeads.length} 首)
              </span>
            </span>
            <span className="text-[10px] text-slate-400">點擊任意卦象即時載入配置</span>
          </div>

          {/* 81-Tetragram Scrollable Grid */}
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 max-h-[520px] overflow-y-auto pr-1">
            {filteredHeads.map((head) => {
              const isSelected = selectedHeadIdx === head.index;
              const fangVal = head.trits[0];
              const fangColor =
                fangVal === 2
                  ? 'border-sky-300 dark:border-sky-700/80'
                  : fangVal === 1
                  ? 'border-amber-300 dark:border-amber-700/80'
                  : 'border-violet-300 dark:border-violet-700/80';

              return (
                <button
                  key={head.index}
                  type="button"
                  onClick={() => setSelectedHeadIdx(head.index)}
                  className={`p-2 rounded-xl text-center transition-all flex flex-col items-center justify-between border ${
                    isSelected
                      ? 'bg-sky-600 text-white font-bold ring-2 ring-sky-500/30 shadow-md scale-[1.02]'
                      : `bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:border-sky-400 dark:hover:border-sky-600 ${fangColor}`
                  }`}
                >
                  <div className="text-[10px] font-mono-code opacity-75">#{head.index}</div>
                  <div className="text-xl leading-none my-1 select-none">{head.unicodeChar}</div>
                  <div className="text-xs font-bold font-serif-tc truncate max-w-full">
                    {head.name}
                  </div>
                  <div className="text-[9px] font-mono-code opacity-60 truncate">
                    {head.trits.join('')}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Column: Active State & Configurator Inspector (7 cols) */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-5">
          {/* Selected Head Overview Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-gradient-to-r from-slate-900 via-sky-950 to-slate-900 text-white border border-sky-900/60 shadow-md">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-slate-800/90 border border-sky-500/40 flex items-center justify-center text-3xl select-none text-sky-200 shadow-inner">
                {activeHead.unicodeChar}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold font-serif-tc text-sky-100">
                    首 {activeHead.index}【{activeHead.name}】
                  </span>
                  <span className="text-xs font-mono-code text-slate-400">({activeHead.pinyin})</span>
                  <span className="text-[10px] font-mono-code px-2 py-0.5 rounded bg-sky-500/20 text-sky-300 font-semibold border border-sky-400/30">
                    {isaSpec.mnemonic}
                  </span>
                </div>
                <div className="text-xs text-slate-300 mt-1 line-clamp-1">
                  義理：{activeHead.meaning} · 歷法：{activeHead.solarDate}
                </div>
                <div className="text-[11px] text-amber-300/90 font-mono-code mt-0.5">
                  四爻向量：[{activeHead.trits.map((t) => formatTrit(t, mode)).join(', ')}] (十進制:{' '}
                  {activeHead.index - 1})
                </div>
              </div>
            </div>

            <div className="flex sm:flex-col items-center sm:items-end justify-between gap-2 border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-800">
              <span className="text-[10px] text-slate-400 font-mono-code">映射內存地址</span>
              <span className="text-sm font-bold font-mono-code text-amber-400">
                @0x{(activeHead.index - 1).toString(16).toUpperCase().padStart(2, '0')}
              </span>
            </div>
          </div>

          {/* Inspector Segmented Tabs */}
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveInspectorTab('registers')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
                  activeInspectorTab === 'registers'
                    ? 'bg-sky-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <Cpu className="w-3.5 h-3.5" />
                <span>1. ALU 暫存器配置 (Register File)</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveInspectorTab('memory')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
                  activeInspectorTab === 'memory'
                    ? 'bg-sky-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <Database className="w-3.5 h-3.5" />
                <span>2. 內存分佈狀態 (Memory Layout)</span>
              </button>
            </div>

            <span className="text-[11px] font-mono-code text-slate-400 hidden sm:inline">
              指令族：{isaSpec.categoryName}
            </span>
          </div>

          {/* Tab 1: ALU Register Configuration & Datapath preview */}
          {activeInspectorTab === 'registers' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Register X Card (Primary Operand / Acc) */}
                <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold font-mono-code text-sky-600 dark:text-sky-400">
                      暫存器 X (Primary Acc)
                    </span>
                    <span className="text-[10px] font-mono-code text-slate-400">4-Trit 累加器初值</span>
                  </div>
                  <div className="flex items-center gap-2 py-1">
                    {isaSpec.regX.map((t, idx) => (
                      <div key={idx} className="flex-1 text-center">
                        <TritBadge val={t} mode={mode} size="sm" />
                      </div>
                    ))}
                  </div>
                  <div className="text-[11px] font-mono-code text-slate-500 flex justify-between pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
                    <span>向量: [{isaSpec.regX.join('')}]</span>
                    <span>十進制: {fourTritsToStandardInt(isaSpec.regX)}</span>
                  </div>
                </div>

                {/* Register Y Card (Immediate / Secondary Operand) */}
                <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold font-mono-code text-amber-600 dark:text-amber-400">
                      暫存器 Y (Immediate / Imm)
                    </span>
                    <span className="text-[10px] font-mono-code text-slate-400">對偶微指令操作數</span>
                  </div>
                  <div className="flex items-center gap-2 py-1">
                    {isaSpec.regY.map((t, idx) => (
                      <div key={idx} className="flex-1 text-center">
                        <TritBadge val={t} mode={mode} size="sm" />
                      </div>
                    ))}
                  </div>
                  <div className="text-[11px] font-mono-code text-slate-500 flex justify-between pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
                    <span>向量: [{isaSpec.regY.join('')}]</span>
                    <span>十進制: {fourTritsToStandardInt(isaSpec.regY)}</span>
                  </div>
                </div>
              </div>

              {/* ALU Operation & Result Datapath Box */}
              <div className="p-4 bg-slate-900 text-white rounded-xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-800">
                  <span className="font-semibold text-slate-300">
                    ALU 核心運算模擬通路 (Simulation Datapath)
                  </span>
                  <span className="font-mono-code text-sky-400 font-bold">
                    Opcode: {isaSpec.opcode}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-3 text-xs font-mono-code">
                  <div className="text-center p-2 bg-slate-800/80 rounded-lg flex-1">
                    <div className="text-[10px] text-slate-400">Reg X</div>
                    <div className="font-bold text-sky-300 mt-0.5">[{isaSpec.regX.join('')}]</div>
                  </div>
                  <div className="text-amber-400 font-bold text-base">⊛</div>
                  <div className="text-center p-2 bg-slate-800/80 rounded-lg flex-1">
                    <div className="text-[10px] text-slate-400">Reg Y (Imm)</div>
                    <div className="font-bold text-amber-300 mt-0.5">[{isaSpec.regY.join('')}]</div>
                  </div>
                  <div className="text-slate-400 font-bold text-base">➔</div>
                  <div className="text-center p-2 bg-slate-800/80 rounded-lg flex-1 border border-emerald-500/40">
                    <div className="text-[10px] text-emerald-400">運算結果 (Result)</div>
                    <div className="font-bold text-emerald-300 mt-0.5">
                      [{isaSpec.aluRes.out.join('')}]
                    </div>
                  </div>
                </div>

                {/* Flags and Result Tetragram */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-slate-800 text-[11px] font-mono-code">
                  <div className="text-slate-300">
                    運算後歸首：
                    <strong className="text-emerald-400 font-serif-tc text-xs">
                      {isaSpec.resultHead.unicodeChar} 首{isaSpec.resultHead.index}【
                      {isaSpec.resultHead.name}】
                    </strong>
                  </div>

                  {/* CPU Flags */}
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        isaSpec.aluRes.isZero
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                          : 'text-slate-500'
                      }`}
                    >
                      Z (地歸)
                    </span>
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        isaSpec.aluRes.isHeaven
                          ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                          : 'text-slate-500'
                      }`}
                    >
                      H (陽亢)
                    </span>
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        isaSpec.aluRes.isHuman
                          ? 'bg-violet-500/20 text-violet-300 border border-violet-500/40'
                          : 'text-slate-500'
                      }`}
                    >
                      L (陰伏)
                    </span>
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        isaSpec.aluRes.carry > 0
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                          : 'text-slate-500'
                      }`}
                    >
                      C (進位:{isaSpec.aluRes.carry})
                    </span>
                  </div>
                </div>
              </div>

              <p className="text-xs text-slate-500 leading-relaxed italic">
                指令說明：{isaSpec.description}
              </p>
            </div>
          )}

          {/* Tab 2: Memory Layout Distribution (81-Word RAM map) */}
          {activeInspectorTab === 'memory' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs">
                <div>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    太玄 81 字微機內存空間拓撲 (0x00 ~ 0x50)
                  </span>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    當前首卦映射於內存地址：
                    <strong className="text-amber-600 dark:text-amber-400 font-mono-code">
                      @0x{(activeHead.index - 1).toString(16).toUpperCase().padStart(2, '0')}
                    </strong>{' '}
                    (Address {activeHead.index - 1})
                  </p>
                </div>

                <div className="flex items-center gap-3 text-[10px] font-mono-code">
                  <div className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-sm bg-sky-500"></span>
                    <span>代碼段 (0~31)</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-sm bg-amber-500"></span>
                    <span>數據段 (32~63)</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-sm bg-violet-500"></span>
                    <span>堆疊段 (64~80)</span>
                  </div>
                </div>
              </div>

              {/* 81-Cell Memory Matrix */}
              <div className="grid grid-cols-9 gap-1 p-2 bg-slate-950 rounded-xl border border-slate-800 text-center font-mono-code text-[10px]">
                {memoryMap.map((cell) => {
                  const isTarget = cell.address === activeHead.index - 1;
                  const isCurrentPc = cell.address === currentHeadIndex - 1;

                  let segBg = 'bg-sky-950/60 text-sky-300 border-sky-800/40';
                  if (cell.segment === 'data') {
                    segBg = 'bg-amber-950/60 text-amber-300 border-amber-800/40';
                  } else if (cell.segment === 'stack') {
                    segBg = 'bg-violet-950/60 text-violet-300 border-violet-800/40';
                  }

                  return (
                    <button
                      key={cell.address}
                      type="button"
                      onClick={() => setSelectedHeadIdx(cell.headIndex)}
                      title={`${cell.hexAddr} | ${cell.label} (${cell.segmentLabel})`}
                      className={`p-1 rounded transition-all border ${segBg} ${
                        isTarget
                          ? 'ring-2 ring-amber-400 bg-amber-500 text-slate-950 font-bold scale-110 z-10 shadow-lg'
                          : isCurrentPc
                          ? 'ring-1 ring-emerald-400 border-emerald-400 font-bold'
                          : 'hover:brightness-125'
                      }`}
                    >
                      <div>{cell.address}</div>
                      <div className="text-[8px] opacity-75">{cell.trits.join('')}</div>
                    </button>
                  );
                })}
              </div>

              {/* Detail Card of the Selected Memory Cell */}
              <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs font-mono-code">
                <div>
                  <div className="text-slate-500 text-[11px]">選定內存字 (Selected Word)</div>
                  <div className="font-bold text-slate-900 dark:text-slate-100 text-sm mt-0.5">
                    @0x{(activeHead.index - 1).toString(16).toUpperCase().padStart(2, '0')} : [
                    {activeHead.trits.join('')}] (首 {activeHead.index}【{activeHead.name}】)
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-slate-500 text-[11px]">段位屬性</div>
                  <div className="font-semibold text-sky-600 dark:text-sky-400 text-xs">
                    {activeHead.index - 1 < 32
                      ? '程式指令段 (ROM Code)'
                      : activeHead.index - 1 < 64
                      ? '通用數據段 (RAM Data)'
                      : '堆疊幀緩衝 (Stack Buffer)'}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Action Bar */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-200 dark:border-slate-800">
            <div className="text-xs text-slate-500">
              {loadedToast ? (
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1.5 animate-in fade-in">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <span>{loadedToast}</span>
                </span>
              ) : (
                <span>點擊「立即載入」將直接重構微機當前 PC、累加器與操作碼</span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleLoadState}
                className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-2"
              >
                <Zap className="w-3.5 h-3.5 fill-current" />
                <span>立即載入該首狀態</span>
              </button>

              {onStepCpuWithState && (
                <button
                  type="button"
                  onClick={() => {
                    handleLoadState();
                    setTimeout(() => onStepCpuWithState(), 100);
                  }}
                  className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5"
                >
                  <span>載入並單步執行</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
