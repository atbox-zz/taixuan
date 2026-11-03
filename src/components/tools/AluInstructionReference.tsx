/**
 * ALU Instruction Set Quick Reference (81首 ALU 指令集速查)
 * Comprehensive reference table and interactive workbench tool
 * listing all 81 Tetragram symbols, ternary trit input vectors, and ALU micro-operation semantics.
 * @license Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import {
  TritValue,
  DisplayMode,
  TetragramHead,
} from '../../types/ternary';
import {
  TAI_XUAN_HEADS,
  TRIT_INFO,
  fourTritsToStandardInt,
  fourTritsToBalancedInt,
  formatTrit,
} from '../../lib/taiXuanData';
import { executeAlu } from '../../lib/ternaryLogic';
import { TetragramVisualizer } from '../TetragramVisualizer';
import { TritBadge } from '../TritBadge';

interface AluInstructionReferenceProps {
  mode: DisplayMode;
}

export interface AluInstructionItem extends TetragramHead {
  mnemonic: string;
  category: 'arithmetic' | 'logic' | 'control';
  categoryLabel: string;
  functionalDesc: string;
  stdVal: number;
  balVal: number;
  ternaryStr: string;
  balancedStr: string;
  taixuanStr: string;
}

// Generate complete 81 ALU instruction definitions deterministically
function buildAluInstructionCatalog(): AluInstructionItem[] {
  return TAI_XUAN_HEADS.map((head) => {
    const [t3, t2, t1, t0] = head.trits;
    const stdVal = fourTritsToStandardInt(head.trits);
    const balVal = fourTritsToBalancedInt(head.trits);

    // Trit string representations
    const ternaryStr = `${t3}${t2}${t1}${t0}`;
    const balSymbols = ['-', '0', '+']; // -1->0, 0->1, 1->2
    const balancedStr = `${balSymbols[TRIT_INFO[t3].balancedVal + 1]}${balSymbols[TRIT_INFO[t2].balancedVal + 1]}${balSymbols[TRIT_INFO[t1].balancedVal + 1]}${balSymbols[TRIT_INFO[t0].balancedVal + 1]}`;
    const taixuanStr = `${TRIT_INFO[t3].name}${TRIT_INFO[t2].name}${TRIT_INFO[t1].name}${TRIT_INFO[t0].name}`;

    // Determine category and mnemonic based on 4 trits:
    // t3 (方): 2=Arithmetic, 1=Logic/Shift, 0=Control/System
    let category: 'arithmetic' | 'logic' | 'control' = 'control';
    let categoryLabel = '控制與系統族';
    let mnemonic = '';
    let functionalDesc = '';

    const regName = `R${t0}`;
    const flagCond = t1 === 2 ? '.POS' : t1 === 1 ? '.ZERO' : '.NEG';

    if (t3 === 2) {
      category = 'arithmetic';
      categoryLabel = '算術運算族';
      if (t2 === 2) {
        mnemonic = `ADD.${regName}${flagCond}`;
        functionalDesc = `四爻並行加法運算，結果寫入 ${regName}，條件標誌位偏向 ${t1 === 2 ? '陽溢' : t1 === 1 ? '地歸' : '人伏'}`;
      } else if (t2 === 1) {
        mnemonic = `SUB.${regName}${flagCond}`;
        functionalDesc = `四爻模81求差運算，差額寫入 ${regName}，更新溢出借位旗標`;
      } else {
        mnemonic = `ACC.${regName}${flagCond}`;
        functionalDesc = `累加器微步運算，基於權重 27/9/3/1 進行加權累積至 ${regName}`;
      }
    } else if (t3 === 1) {
      category = 'logic';
      categoryLabel = '邏輯位移族';
      if (t2 === 2) {
        mnemonic = `MAX.${regName}${flagCond}`;
        functionalDesc = `逐爻升取最大值 (T-OR) 運算，保留較高電位之爻象至 ${regName}`;
      } else if (t2 === 1) {
        mnemonic = `MIN.${regName}${flagCond}`;
        functionalDesc = `逐爻降取最小值 (T-AND) 運算，保留較低電位之爻象至 ${regName}`;
      } else {
        if (t1 === 2) {
          mnemonic = `TNOT.${regName}`;
          functionalDesc = `逐爻倒反 (T-NOT) 運算：天變人、人變天、地位保持，輸出存入 ${regName}`;
        } else if (t1 === 1) {
          mnemonic = `CYCL.${regName}`;
          functionalDesc = `三才順向流轉 (CYCLE) 運算：(Xᵢ + 1) mod 3 循變`;
        } else {
          mnemonic = `SHFT.${regName}`;
          functionalDesc = `四爻位移運算：左移乘三或右移除三階梯運算`;
        }
      }
    } else {
      category = 'control';
      categoryLabel = '控制與系統族';
      if (t2 === 2) {
        mnemonic = `CMP.${regName}${flagCond}`;
        functionalDesc = `三態比較運算：若 X>Y 賦天，X=Y 賦地，X<Y 賦人，結果存於 ${regName}`;
      } else if (t2 === 1) {
        mnemonic = `MOV.${regName}${flagCond}`;
        functionalDesc = `四爻數據傳輸：將總線向量無損載入 ${regName} 暫存單元`;
      } else {
        if (head.index === 1) {
          mnemonic = 'NOP.IDLE';
          functionalDesc = '元首空操作：三才合一，時鐘無負載循環，保持當前微機狀態';
        } else if (head.index === 81) {
          mnemonic = 'HALT.SYNC';
          functionalDesc = '終極同步停機：四爻純陽圓滿，等待外部中斷信號 (Interrupt Wakeup)';
        } else {
          mnemonic = `SYS.${regName}${flagCond}`;
          functionalDesc = `系統調度與屏障控制：執行第 ${head.index} 首之微程序同步`;
        }
      }
    }

    return {
      ...head,
      mnemonic,
      category,
      categoryLabel,
      functionalDesc,
      stdVal,
      balVal,
      ternaryStr,
      balancedStr,
      taixuanStr,
    };
  });
}

export const AluInstructionReference: React.FC<AluInstructionReferenceProps> = ({ mode }) => {
  const instructions = useMemo(() => buildAluInstructionCatalog(), []);

  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'arithmetic' | 'logic' | 'control'>('all');
  const [tier3Filter, setTier3Filter] = useState<'all' | 2 | 1 | 0>('all');
  const [viewLayout, setViewLayout] = useState<'table' | 'grid'>('table');
  const [selectedItem, setSelectedItem] = useState<AluInstructionItem>(instructions[0]);
  const [copiedType, setCopiedType] = useState<string | null>(null);

  // Quick ALU simulation with selected instruction vector as Operand X
  const [testOperandY, setTestOperandY] = useState<[TritValue, TritValue, TritValue, TritValue]>([1, 1, 1, 1]);
  const [testOpcode, setTestOpcode] = useState<'ADD' | 'SUB' | 'MIN' | 'MAX'>('ADD');

  const simResult = useMemo(() => {
    return executeAlu(selectedItem.trits, testOperandY, testOpcode);
  }, [selectedItem, testOperandY, testOpcode]);

  // Filter instructions based on search and buttons
  const filteredList = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return instructions.filter((item) => {
      // Category filter
      if (selectedCategory !== 'all' && item.category !== selectedCategory) return false;
      // Tier 3 filter
      if (tier3Filter !== 'all' && item.trits[0] !== tier3Filter) return false;
      // Search term
      if (!q) return true;
      return (
        item.name.toLowerCase().includes(q) ||
        item.pinyin.toLowerCase().includes(q) ||
        item.mnemonic.toLowerCase().includes(q) ||
        item.ternaryStr.includes(q) ||
        item.balancedStr.includes(q) ||
        item.taixuanStr.includes(q) ||
        item.index.toString() === q ||
        item.meaning.toLowerCase().includes(q)
      );
    });
  }, [instructions, searchTerm, selectedCategory, tier3Filter]);

  const handleCopy = (text: string, type: string) => {
    try {
      navigator.clipboard?.writeText(text);
      setCopiedType(type);
      setTimeout(() => setCopiedType(null), 1400);
    } catch {
      // ignore
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-6">
      {/* Editorial Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono-code text-sky-600 dark:text-sky-400">
              ALU INSTRUCTION SET ARCHITECTURE (ISA)
            </span>
            <span className="text-slate-300 dark:text-slate-700">·</span>
            <span className="text-xs font-mono-code text-slate-500">81首全域映射</span>
          </div>
          <h3 className="text-xl font-bold font-serif-tc text-slate-900 dark:text-slate-100 mt-1">
            太玄四爻 ALU 81首指令集速查手冊
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-2xl leading-relaxed">
            在太玄三進制微處理架構中，四爻位元空間（$3^4 = 81$）同時映射為 ALU 操作碼、微指令跳轉與常數向量。
            本速查手冊完整列出八十一首之爻位輸入、標準/平衡編碼及對應微操作語意，供工程調試與仿真實驗快速比對。
          </p>
        </div>

        {/* View Switcher & Counter */}
        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <span className="text-xs font-mono-code text-slate-400 block">指令覆蓋率</span>
            <span className="text-sm font-bold font-mono-code text-sky-600 dark:text-sky-400">
              {filteredList.length} / 81 首
            </span>
          </div>

          <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={() => setViewLayout('table')}
              className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-all ${
                viewLayout === 'table'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              條目列表 (Table)
            </button>
            <button
              type="button"
              onClick={() => setViewLayout('grid')}
              className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-all ${
                viewLayout === 'grid'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              象數矩陣 (Grid)
            </button>
          </div>
        </div>
      </div>

      {/* Control Bar: Search + Filter Tabs */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 bg-slate-50 dark:bg-slate-800/40 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800">
        {/* Search Input */}
        <div className="relative flex-1">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="搜尋首名 (如: 中、斂)、序號 (#75)、助記符 (ADD)、或位元 (2210 / ++0-)..."
            className="w-full text-xs px-3.5 py-2 pl-9 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-sky-500 font-mono-code"
          />
          <span className="absolute left-3 top-2.5 text-xs text-slate-400">🔍</span>
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="absolute right-2.5 top-2 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 px-1.5 py-0.5"
            >
              ✕
            </button>
          )}
        </div>

        {/* Category Filters */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[11px] font-mono-code text-slate-400 mr-1 hidden sm:inline">指令類別:</span>
          <button
            type="button"
            onClick={() => setSelectedCategory('all')}
            className={`px-2.5 py-1.5 text-xs rounded-lg transition-colors font-medium ${
              selectedCategory === 'all'
                ? 'bg-sky-600 text-white font-semibold'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            全部 (81)
          </button>
          <button
            type="button"
            onClick={() => setSelectedCategory('arithmetic')}
            className={`px-2.5 py-1.5 text-xs rounded-lg transition-colors font-medium flex items-center gap-1 ${
              selectedCategory === 'arithmetic'
                ? 'bg-sky-600 text-white font-semibold'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <span className="text-sky-500">➕</span> 算術運算 (27)
          </button>
          <button
            type="button"
            onClick={() => setSelectedCategory('logic')}
            className={`px-2.5 py-1.5 text-xs rounded-lg transition-colors font-medium flex items-center gap-1 ${
              selectedCategory === 'logic'
                ? 'bg-amber-600 text-white font-semibold'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <span className="text-amber-500">⋀</span> 邏輯位移 (27)
          </button>
          <button
            type="button"
            onClick={() => setSelectedCategory('control')}
            className={`px-2.5 py-1.5 text-xs rounded-lg transition-colors font-medium flex items-center gap-1 ${
              selectedCategory === 'control'
                ? 'bg-violet-600 text-white font-semibold'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <span className="text-violet-500">≶</span> 控制系統 (27)
          </button>
        </div>

        {/* Tier 3 (方) Filter */}
        <div className="flex items-center gap-1.5 border-t lg:border-t-0 lg:border-l border-slate-200 dark:border-slate-700 pt-2 lg:pt-0 lg:pl-3">
          <span className="text-[11px] font-mono-code text-slate-400 mr-1">頂爻(方):</span>
          <button
            type="button"
            onClick={() => setTier3Filter('all')}
            className={`px-2 py-1 text-xs rounded-md ${
              tier3Filter === 'all'
                ? 'bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-900 font-bold'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
            }`}
          >
            全
          </button>
          <button
            type="button"
            onClick={() => setTier3Filter(2)}
            className={`px-2 py-1 text-xs rounded-md ${
              tier3Filter === 2
                ? 'bg-sky-600 text-white font-bold'
                : 'bg-white dark:bg-slate-900 text-sky-600 dark:text-sky-400 border border-slate-200 dark:border-slate-700'
            }`}
            title="天 (2 / +1)"
          >
            天 ⚊
          </button>
          <button
            type="button"
            onClick={() => setTier3Filter(1)}
            className={`px-2 py-1 text-xs rounded-md ${
              tier3Filter === 1
                ? 'bg-amber-600 text-white font-bold'
                : 'bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 border border-slate-200 dark:border-slate-700'
            }`}
            title="地 (1 / 0)"
          >
            地 ⚋
          </button>
          <button
            type="button"
            onClick={() => setTier3Filter(0)}
            className={`px-2 py-1 text-xs rounded-md ${
              tier3Filter === 0
                ? 'bg-violet-600 text-white font-bold'
                : 'bg-white dark:bg-slate-900 text-violet-600 dark:text-violet-400 border border-slate-200 dark:border-slate-700'
            }`}
            title="人 (0 / -1)"
          >
            人 𝌀
          </button>
        </div>
      </div>

      {/* Main Split Layout: Left Table/Grid (7.5 cols) + Right Detail Inspector (4.5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Side: Table or Grid */}
        <div className="lg:col-span-8 space-y-4">
          {viewLayout === 'table' ? (
            /* Table View */
            <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl max-h-[600px] overflow-y-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-slate-100 dark:bg-slate-800/90 text-slate-700 dark:text-slate-300 font-mono-code sticky top-0 z-10 border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="py-2.5 px-3">#序號</th>
                    <th className="py-2.5 px-3">首名</th>
                    <th className="py-2.5 px-3">爻象 (方·州·部·家)</th>
                    <th className="py-2.5 px-2.5">標準[3]</th>
                    <th className="py-2.5 px-2.5">平衡[±]</th>
                    <th className="py-2.5 px-2.5">十進制</th>
                    <th className="py-2.5 px-3">ALU 助記指令</th>
                    <th className="py-2.5 px-3">類別</th>
                    <th className="py-2.5 px-3 text-right">選擇</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 font-mono-code">
                  {filteredList.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-slate-400 text-xs">
                        無符合條件之八十一首指令，請調整搜尋關鍵字或分類篩選。
                      </td>
                    </tr>
                  ) : (
                    filteredList.map((item) => {
                      const isSelected = selectedItem.index === item.index;
                      const [t3, t2, t1, t0] = item.trits;

                      return (
                        <tr
                          key={item.index}
                          onClick={() => setSelectedItem(item)}
                          className={`cursor-pointer transition-colors ${
                            isSelected
                              ? 'bg-sky-50/90 dark:bg-sky-950/40 text-sky-900 dark:text-sky-200 font-medium'
                              : 'hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          <td className="py-2.5 px-3 font-semibold text-slate-400">
                            #{item.index.toString().padStart(2, '0')}
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="font-serif-tc text-sm font-bold text-slate-900 dark:text-slate-100 mr-1.5">
                              {item.name}
                            </span>
                            <span className="text-[13px] text-sky-600 dark:text-sky-400 font-serif" aria-hidden="true">
                              {item.unicodeChar}
                            </span>
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="flex items-center gap-1 font-serif-tc text-[11px]">
                              <span
                                className={`px-1 py-0.2 rounded ${
                                  t3 === 2
                                    ? 'text-sky-600 font-bold'
                                    : t3 === 1
                                    ? 'text-amber-600'
                                    : 'text-violet-600'
                                }`}
                                title="方 (Tier 3)"
                              >
                                {TRIT_INFO[t3].name}
                              </span>
                              <span className="text-slate-300 dark:text-slate-700">·</span>
                              <span
                                className={`px-1 py-0.2 rounded ${
                                  t2 === 2
                                    ? 'text-sky-600 font-bold'
                                    : t2 === 1
                                    ? 'text-amber-600'
                                    : 'text-violet-600'
                                }`}
                                title="州 (Tier 2)"
                              >
                                {TRIT_INFO[t2].name}
                              </span>
                              <span className="text-slate-300 dark:text-slate-700">·</span>
                              <span
                                className={`px-1 py-0.2 rounded ${
                                  t1 === 2
                                    ? 'text-sky-600 font-bold'
                                    : t1 === 1
                                    ? 'text-amber-600'
                                    : 'text-violet-600'
                                }`}
                                title="部 (Tier 1)"
                              >
                                {TRIT_INFO[t1].name}
                              </span>
                              <span className="text-slate-300 dark:text-slate-700">·</span>
                              <span
                                className={`px-1 py-0.2 rounded ${
                                  t0 === 2
                                    ? 'text-sky-600 font-bold'
                                    : t0 === 1
                                    ? 'text-amber-600'
                                    : 'text-violet-600'
                                }`}
                                title="家 (Tier 0)"
                              >
                                {TRIT_INFO[t0].name}
                              </span>
                            </div>
                          </td>
                          <td className="py-2.5 px-2.5 text-sky-700 dark:text-sky-300 font-bold tracking-wider">
                            {item.ternaryStr}
                          </td>
                          <td className="py-2.5 px-2.5 text-amber-700 dark:text-amber-300 font-bold tracking-widest">
                            {item.balancedStr}
                          </td>
                          <td className="py-2.5 px-2.5 text-slate-500">
                            {item.stdVal} <span className="text-[10px] text-slate-400">({item.balVal >= 0 ? `+${item.balVal}` : item.balVal})</span>
                          </td>
                          <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-slate-100">
                            {item.mnemonic}
                          </td>
                          <td className="py-2.5 px-3">
                            <span
                              className={`text-[10px] px-2 py-0.5 rounded font-sans ${
                                item.category === 'arithmetic'
                                  ? 'bg-sky-100 dark:bg-sky-950/60 text-sky-800 dark:text-sky-300'
                                  : item.category === 'logic'
                                  ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300'
                                  : 'bg-violet-100 dark:bg-violet-950/60 text-violet-800 dark:text-violet-300'
                              }`}
                            >
                              {item.category === 'arithmetic' ? '算術' : item.category === 'logic' ? '邏輯' : '控制'}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedItem(item);
                              }}
                              className={`text-[11px] px-2 py-0.5 rounded transition-colors ${
                                isSelected
                                  ? 'bg-sky-600 text-white font-bold'
                                  : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600'
                              }`}
                            >
                              {isSelected ? '檢視中' : '選擇'}
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            /* Grid View */
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-h-[600px] overflow-y-auto p-1">
              {filteredList.map((item) => {
                const isSelected = selectedItem.index === item.index;
                return (
                  <button
                    key={item.index}
                    type="button"
                    onClick={() => setSelectedItem(item)}
                    className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between ${
                      isSelected
                        ? 'bg-sky-50 dark:bg-sky-950/40 border-sky-500 ring-2 ring-sky-500/30'
                        : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="text-[10px] font-mono-code text-slate-400">
                        #{item.index.toString().padStart(2, '0')}
                      </span>
                      <span
                        className={`text-[9px] px-1.5 py-0.5 rounded font-mono-code ${
                          item.category === 'arithmetic'
                            ? 'bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300'
                            : item.category === 'logic'
                            ? 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300'
                            : 'bg-violet-100 dark:bg-violet-950 text-violet-700 dark:text-violet-300'
                        }`}
                      >
                        {item.mnemonic.split('.')[0]}
                      </span>
                    </div>

                    <div className="flex items-center gap-2.5 my-2">
                      <span className="text-2xl font-serif text-sky-600 dark:text-sky-400">
                        {item.unicodeChar}
                      </span>
                      <div>
                        <div className="text-sm font-bold font-serif-tc text-slate-900 dark:text-slate-100">
                          {item.name}
                        </div>
                        <div className="text-[10px] font-mono-code text-slate-400">
                          {item.pinyin}
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-200/80 dark:border-slate-700/80 flex items-center justify-between text-[11px] font-mono-code">
                      <span className="text-sky-600 dark:text-sky-400 font-bold">{item.ternaryStr}</span>
                      <span className="text-slate-400">Val: {item.stdVal}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* Quick Export / Clipboard Help */}
          <div className="flex items-center justify-between flex-wrap gap-2 text-xs text-slate-500 pt-1 px-1">
            <span>
              💡 提示：點擊任一指令行，右側工作區即時展開四爻層級剖析、HDL 常數表達式及 ALU 模擬運算。
            </span>
            <button
              type="button"
              onClick={() => {
                const csvHeader = 'Index,Name,T3,T2,T1,T0,Standard3,Balanced,DecStd,DecBal,Mnemonic,Category,Meaning\n';
                const rows = instructions
                  .map(
                    (i) =>
                      `${i.index},${i.name},${i.trits[0]},${i.trits[1]},${i.trits[2]},${i.trits[3]},${i.ternaryStr},${i.balancedStr},${i.stdVal},${i.balVal},"${i.mnemonic}","${i.categoryLabel}","${i.meaning.replace(/"/g, '""')}"`
                  )
                  .join('\n');
                handleCopy(csvHeader + rows, 'csv');
              }}
              className="text-xs font-mono-code px-2.5 py-1 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-colors"
            >
              {copiedType === 'csv' ? 'CSV 已複製到剪貼簿 ✓' : '📋 導出 81 首 CSV 指令表'}
            </button>
          </div>
        </div>

        {/* Right Side: Detailed Inspection & ALU Experiment Sandbox (4 cols) */}
        <div className="lg:col-span-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 space-y-5">
          {/* Active Item Title Card */}
          <div className="flex items-center justify-between pb-3.5 border-b border-slate-200 dark:border-slate-700/80">
            <div className="flex items-center gap-3">
              <span className="w-10 h-10 rounded-xl bg-sky-600 text-white font-serif-tc text-xl flex items-center justify-center font-bold shadow-xs">
                {selectedItem.unicodeChar}
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-base font-bold font-serif-tc text-slate-900 dark:text-slate-100">
                    首 {selectedItem.index} · {selectedItem.name}
                  </h4>
                  <span className="text-xs font-mono-code text-slate-400">
                    ({selectedItem.pinyin})
                  </span>
                </div>
                <span className="text-[11px] font-mono-code text-sky-600 dark:text-sky-400 font-semibold">
                  {selectedItem.mnemonic}
                </span>
              </div>
            </div>

            <span
              className={`text-[10px] px-2 py-0.5 rounded font-mono-code font-bold ${
                selectedItem.category === 'arithmetic'
                  ? 'bg-sky-100 dark:bg-sky-950 text-sky-800 dark:text-sky-300'
                  : selectedItem.category === 'logic'
                  ? 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300'
                  : 'bg-violet-100 dark:bg-violet-950 text-violet-800 dark:text-violet-300'
              }`}
            >
              {selectedItem.categoryLabel}
            </span>
          </div>

          {/* Visualizer of 4 Tiers */}
          <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-500 font-mono-code">
              <span>四爻儀象圖 (Tetragram)</span>
              <span>權重分解：27 + 9 + 3 + 1</span>
            </div>

            <TetragramVisualizer
              trits={selectedItem.trits}
              mode={mode}
              size="md"
              showDetails={false}
              headOverride={selectedItem}
            />

            {/* Individual Trit Layer Breakdown */}
            <div className="grid grid-cols-4 gap-1.5 pt-2 border-t border-slate-100 dark:border-slate-800 text-center font-mono-code text-[10px]">
              <div className="p-1 bg-slate-50 dark:bg-slate-800/80 rounded">
                <span className="text-slate-400 block">方 (27)</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{TRIT_INFO[selectedItem.trits[0]].name}</span>
              </div>
              <div className="p-1 bg-slate-50 dark:bg-slate-800/80 rounded">
                <span className="text-slate-400 block">州 (9)</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{TRIT_INFO[selectedItem.trits[1]].name}</span>
              </div>
              <div className="p-1 bg-slate-50 dark:bg-slate-800/80 rounded">
                <span className="text-slate-400 block">部 (3)</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{TRIT_INFO[selectedItem.trits[2]].name}</span>
              </div>
              <div className="p-1 bg-slate-50 dark:bg-slate-800/80 rounded">
                <span className="text-slate-400 block">家 (1)</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{TRIT_INFO[selectedItem.trits[3]].name}</span>
              </div>
            </div>
          </div>

          {/* Micro-Op Semantics & Description */}
          <div className="space-y-2 text-xs">
            <span className="font-semibold text-slate-700 dark:text-slate-300 block">
              微指令功能解析：
            </span>
            <p className="text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-200 dark:border-slate-800 leading-relaxed">
              {selectedItem.functionalDesc}
            </p>
            <p className="text-[11px] text-slate-400 italic">
              《太玄》古義：{selectedItem.meaning}
            </p>
          </div>

          {/* Quick Copy Snippets for Engineering Experiments */}
          <div className="space-y-2">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
              實驗對照複製 (Quick Copy for Lab):
            </span>

            <div className="grid grid-cols-2 gap-2 text-xs font-mono-code">
              <button
                type="button"
                onClick={() => handleCopy(`[${selectedItem.trits.join(', ')}]`, 'vector')}
                className="p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg hover:border-sky-500 text-left transition-colors"
              >
                <span className="text-[10px] text-slate-400 block">4-Trit 陣列向量</span>
                <span className="font-bold text-sky-600 dark:text-sky-400">
                  {copiedType === 'vector' ? '已複製 ✓' : `[${selectedItem.trits.join(', ')}]`}
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleCopy(`4't${selectedItem.ternaryStr}`, 'literal')}
                className="p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg hover:border-sky-500 text-left transition-colors"
              >
                <span className="text-[10px] text-slate-400 block">HDL 三進制常數</span>
                <span className="font-bold text-amber-600 dark:text-amber-400">
                  {copiedType === 'literal' ? '已複製 ✓' : `4't${selectedItem.ternaryStr}`}
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleCopy(selectedItem.balancedStr, 'balanced')}
                className="p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg hover:border-sky-500 text-left transition-colors"
              >
                <span className="text-[10px] text-slate-400 block">平衡三進制字串</span>
                <span className="font-bold text-violet-600 dark:text-violet-400">
                  {copiedType === 'balanced' ? '已複製 ✓' : selectedItem.balancedStr}
                </span>
              </button>

              <button
                type="button"
                onClick={() =>
                  handleCopy(
                    `CHIP TestOp {\n  IN in[4];\n  PARTS:\n  TAlu4(x=4't${selectedItem.ternaryStr}, y=in, out=out);\n}`,
                    'hdlChip'
                  )
                }
                className="p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg hover:border-sky-500 text-left transition-colors"
              >
                <span className="text-[10px] text-slate-400 block">TaiXuan HDL 晶片片段</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">
                  {copiedType === 'hdlChip' ? '已複製 ✓' : '複製 HDL 片段'}
                </span>
              </button>
            </div>
          </div>

          {/* Quick Simulation with ALU */}
          <div className="p-3.5 bg-slate-900 text-slate-100 rounded-xl space-y-3 text-xs border border-slate-800">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="font-semibold text-sky-400 font-mono-code">
                ALU 快捷運算試算 (Quick Simulation)
              </span>
              <span className="text-[10px] text-slate-500">X = 4't{selectedItem.ternaryStr}</span>
            </div>

            <div className="flex items-center justify-between gap-2 text-[11px] font-mono-code">
              <span>操作算子:</span>
              <div className="flex gap-1">
                {(['ADD', 'SUB', 'MIN', 'MAX'] as const).map((op) => (
                  <button
                    key={op}
                    type="button"
                    onClick={() => setTestOpcode(op)}
                    className={`px-2 py-0.5 rounded text-[10px] ${
                      testOpcode === op ? 'bg-sky-600 text-white font-bold' : 'bg-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    {op}
                  </button>
                ))}
              </div>
            </div>

            {/* Simulation Output Display */}
            <div className="p-2.5 bg-slate-950 rounded-lg font-mono-code border border-slate-800/80 space-y-1.5">
              <div className="flex items-center justify-between text-slate-400 text-[11px]">
                <span>運算結果 (Out):</span>
                <span className="text-sky-300 font-bold tracking-wider">
                  [{simResult.out.join(', ')}]
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-400 text-[11px]">
                <span>進位旗標 (Carry):</span>
                <span className="text-amber-300 font-bold">{simResult.carry}</span>
              </div>
              <div className="flex items-center justify-between text-slate-400 text-[10px] pt-1 border-t border-slate-800">
                <span>狀態標誌:</span>
                <span className="text-emerald-400">
                  {simResult.isZero ? '地歸 [Zero]' : simResult.isHeaven ? '陽昇 [Heaven]' : '人伏 [Human]'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
