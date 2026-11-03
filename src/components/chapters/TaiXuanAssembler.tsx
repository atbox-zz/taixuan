/**
 * Tai Xuan Symbolic Assembler & ROM Burner (太玄符號彙編器與 ROM 燒錄器)
 * Full interactive IDE for assembling TaiXuan assembly programs, resolving labels,
 * inspecting 81-Head machine code, and burning directly into the TaiXuan 4-Trit Computer.
 * @license Apache-2.0
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { DisplayMode } from '../../types/ternary';
import {
  assembleTaiXuan,
  SAMPLE_ASSEMBLY_PROGRAMS,
  AssembledInstruction,
  AssemblyResult,
} from '../../lib/taixuanAssembler';
import { standardIntToFourTrits } from '../../lib/taiXuanData';
import { TritBadge } from '../TritBadge';
import {
  Code,
  Flame,
  Play,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  FileCode,
  Copy,
  Check,
  Download,
  Database,
  Layers,
  Sparkles,
  ArrowRight,
  HelpCircle,
  Hash,
  Tv,
  Keyboard as KeyboardIcon,
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface TaiXuanAssemblerProps {
  mode: DisplayMode;
  onBurnToRom?: (
    instructions: AssembledInstruction[],
    programTitle: string,
    programDesc: string
  ) => void;
  onSwitchToPipeline?: () => void;
}

export const TaiXuanAssembler: React.FC<TaiXuanAssemblerProps> = ({
  mode,
  onBurnToRom,
  onSwitchToPipeline,
}) => {
  // Preset template selection
  const [selectedTemplateKey, setSelectedTemplateKey] = useState<string>('vram_clear_draw');

  // Source code state
  const [sourceCode, setSourceCode] = useState<string>(
    SAMPLE_ASSEMBLY_PROGRAMS.vram_clear_draw.code
  );

  // Active inspector tab: 'machine' | 'symbols' | 'isa' | 'stats'
  const [activeTab, setActiveTab] = useState<'machine' | 'symbols' | 'isa' | 'stats'>('machine');

  // Copy feedback state
  const [copied, setCopied] = useState<boolean>(false);
  const [burnedNotice, setBurnedNotice] = useState<string | null>(null);

  // Textarea reference
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Run assembler on source code changes
  const assemblyResult: AssemblyResult = useMemo(() => {
    return assembleTaiXuan(sourceCode);
  }, [sourceCode]);

  // Handle template switch
  const handleSelectTemplate = (key: string) => {
    setSelectedTemplateKey(key);
    if (SAMPLE_ASSEMBLY_PROGRAMS[key]) {
      setSourceCode(SAMPLE_ASSEMBLY_PROGRAMS[key].code);
      setBurnedNotice(null);
    }
  };

  // Quick insert snippet at cursor
  const handleInsertSnippet = (snippet: string) => {
    if (!textareaRef.current) {
      setSourceCode((prev) => prev + '\n' + snippet);
      return;
    }
    const el = textareaRef.current;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const current = el.value;
    const nextVal = current.substring(0, start) + snippet + current.substring(end);
    setSourceCode(nextVal);
    setTimeout(() => {
      el.focus();
      el.selectionStart = el.selectionEnd = start + snippet.length;
    }, 10);
  };

  // Burn compiled code into Microcomputer ROM
  const handleBurnToRom = () => {
    if (!assemblyResult.success || assemblyResult.instructions.length === 0) {
      return;
    }

    const currentProgMeta = SAMPLE_ASSEMBLY_PROGRAMS[selectedTemplateKey] || {
      title: '自定義彙編程式 (Custom Assembled Program)',
      description: '由用戶在太玄符號彙編器編寫並編譯的 4-Trit 機器碼。',
    };

    if (onBurnToRom) {
      onBurnToRom(
        assemblyResult.instructions,
        `【彙編】${currentProgMeta.title}`,
        currentProgMeta.description
      );
    }

    confetti({
      particleCount: 50,
      spread: 60,
      origin: { y: 0.7 },
    });

    setBurnedNotice(`成功燒錄 ${assemblyResult.instructions.length} 條微指令至 ROM！`);
    setTimeout(() => {
      setBurnedNotice(null);
    }, 4000);
  };

  // Copy source code
  const handleCopyCode = () => {
    navigator.clipboard.writeText(sourceCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Export as .txa file
  const handleDownloadSource = () => {
    const blob = new Blob([sourceCode], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `taixuan_program_${Date.now()}.txa`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Line numbers calculation
  const lineCount = sourceCode.split('\n').length;
  const lineNumbers = Array.from({ length: lineCount }, (_, i) => i + 1);

  return (
    <div className="space-y-6">
      {/* Top Banner & Control Deck */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-slate-100 p-5 rounded-2xl border border-slate-700/60 shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 text-[10px] font-mono-code font-bold uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-md">
                Stage C · 專項工程
              </span>
              <span className="text-xs font-mono-code text-slate-400">
                TaiXuan Symbolic Assembler & ROM Burner
              </span>
            </div>
            <h3 className="text-xl font-bold font-serif-tc text-white flex items-center gap-2">
              <Code className="w-5 h-5 text-amber-400" />
              <span>太玄符號彙編器與微機 ROM 燒錄台</span>
            </h3>
            <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
              支持雙遍掃描（Two-Pass）、標籤地址自動回填（
              <code className="text-amber-300 font-mono-code">LABEL:</code> /{' '}
              <code className="text-amber-300 font-mono-code">@LABEL</code>
              ）、81首指令助記符譯碼，並可直火燒錄至 Chapter 7
              微機流水線及顯存控制器！
            </p>
          </div>

          {/* Action Button Deck */}
          <div className="flex items-center flex-wrap gap-2.5">
            <button
              type="button"
              onClick={handleBurnToRom}
              disabled={!assemblyResult.success || assemblyResult.instructions.length === 0}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-2 ${
                assemblyResult.success && assemblyResult.instructions.length > 0
                  ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 hover:from-amber-400 hover:to-amber-500 shadow-amber-500/20 scale-[1.02] active:scale-[0.98]'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
              }`}
            >
              <Flame className="w-4 h-4 fill-amber-400 text-amber-400" />
              <span>燒錄至微機 ROM (Burn to ROM)</span>
            </button>

            {onSwitchToPipeline && (
              <button
                type="button"
                onClick={onSwitchToPipeline}
                className="px-3.5 py-2.5 bg-slate-800/90 hover:bg-slate-700/90 border border-slate-600/60 rounded-xl text-xs font-semibold text-slate-200 transition-colors flex items-center gap-1.5"
              >
                <Play className="w-3.5 h-3.5 text-sky-400" />
                <span>切換至運行流水線</span>
              </button>
            )}
          </div>
        </div>

        {/* Burned Notice Toast */}
        {burnedNotice && (
          <div className="mt-4 p-3 bg-emerald-950/80 border border-emerald-500/50 rounded-xl text-emerald-300 text-xs flex items-center justify-between gap-2 animate-fade-in">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span className="font-semibold">{burnedNotice}</span>
              <span className="text-emerald-400/80">
                可點擊「切換至運行流水線」或切換到「顯存與鍵盤終端」觀察實時效果！
              </span>
            </div>
            {onSwitchToPipeline && (
              <button
                type="button"
                onClick={onSwitchToPipeline}
                className="px-2.5 py-1 bg-emerald-500 text-slate-950 font-bold rounded-lg text-[11px] hover:bg-emerald-400 transition-colors flex items-center gap-1"
              >
                <span>立即前去運行</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Preset Selector & Quick Insert Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex items-center gap-3 flex-wrap">
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
            <FileCode className="w-4 h-4 text-amber-500" />
            <span>範例程式庫 (Templates):</span>
          </label>
          <select
            value={selectedTemplateKey}
            onChange={(e) => handleSelectTemplate(e.target.value)}
            className="px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 font-medium focus:outline-none focus:ring-2 focus:ring-amber-500"
          >
            {Object.entries(SAMPLE_ASSEMBLY_PROGRAMS).map(([key, item]) => (
              <option key={key} value={key}>
                {item.title} ({item.category})
              </option>
            ))}
          </select>
        </div>

        {/* Quick insertion chips */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[11px] text-slate-400 font-mono-code mr-1">快捷代碼:</span>
          {[
            { label: 'IN.KBD', code: 'IN.KBD' },
            { label: 'OUT.PX 4,4', code: 'OUT.PX 4, 4' },
            { label: 'CLS.VRAM', code: 'CLS.VRAM #1' },
            { label: 'CYCLE', code: 'CYCLE' },
            { label: 'JMP @LOOP', code: 'JMP @LOOP' },
            { label: 'ADD #1', code: 'ADD #1' },
          ].map((chip) => (
            <button
              key={chip.label}
              type="button"
              onClick={() => handleInsertSnippet(chip.code)}
              className="px-2 py-0.5 text-[11px] font-mono-code bg-slate-100 dark:bg-slate-800 hover:bg-amber-50 dark:hover:bg-amber-950/40 text-slate-700 dark:text-slate-300 hover:text-amber-600 dark:hover:text-amber-400 border border-slate-200 dark:border-slate-700 rounded transition-colors"
            >
              +{chip.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Two-Column Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Code Editor (7 cols) */}
        <div className="lg:col-span-7 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 font-mono-code flex items-center gap-1.5">
                <span>TAIXUAN ASSEMBLY SOURCE (.TXA)</span>
              </h4>
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full font-mono-code font-bold ${
                  assemblyResult.success
                    ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                    : 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300'
                }`}
              >
                {assemblyResult.success
                  ? `編譯通過 · ${assemblyResult.instructions.length} 字`
                  : `編譯錯誤 (${assemblyResult.errors.length})`}
              </span>
            </div>

            <div className="flex items-center gap-1.5 text-xs">
              <button
                type="button"
                onClick={handleCopyCode}
                className="px-2.5 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 transition-colors flex items-center gap-1"
                title="複製彙編代碼"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? '已複製' : '複製'}</span>
              </button>
              <button
                type="button"
                onClick={handleDownloadSource}
                className="px-2.5 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 transition-colors flex items-center gap-1"
                title="下載原始碼檔案"
              >
                <Download className="w-3.5 h-3.5" />
                <span>導出</span>
              </button>
              <button
                type="button"
                onClick={() => setSourceCode(SAMPLE_ASSEMBLY_PROGRAMS[selectedTemplateKey].code)}
                className="px-2.5 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 transition-colors flex items-center gap-1"
                title="恢復範例初始代碼"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>重置</span>
              </button>
            </div>
          </div>

          {/* Code Textarea with Line Numbers */}
          <div className="relative flex rounded-xl border border-slate-300 dark:border-slate-800 bg-slate-950 text-slate-100 font-mono-code text-xs overflow-hidden shadow-inner focus-within:ring-2 focus-within:ring-amber-500">
            {/* Line Numbers Column */}
            <div className="py-3 px-2.5 bg-slate-900/90 text-slate-500 border-r border-slate-800 select-none text-right font-mono-code text-xs w-11 shrink-0 leading-5">
              {lineNumbers.map((num) => (
                <div key={num} className="h-5">
                  {num}
                </div>
              ))}
            </div>

            {/* Textarea */}
            <textarea
              ref={textareaRef}
              value={sourceCode}
              onChange={(e) => setSourceCode(e.target.value)}
              spellCheck={false}
              wrap="off"
              className="w-full h-96 p-3 bg-transparent text-slate-100 font-mono-code text-xs leading-5 focus:outline-none resize-y selection:bg-amber-500/30 overflow-auto"
              placeholder="// 請在此處編寫太玄彙編代碼..."
            />
          </div>

          {/* Compilation Errors & Warnings */}
          {assemblyResult.errors.length > 0 && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/50 border border-rose-300 dark:border-rose-800 rounded-xl space-y-1.5 text-xs text-rose-800 dark:text-rose-300 animate-fade-in">
              <div className="flex items-center gap-1.5 font-bold">
                <AlertCircle className="w-4 h-4 text-rose-500" />
                <span>彙編編譯失敗：發現 {assemblyResult.errors.length} 處錯誤</span>
              </div>
              <ul className="space-y-1 pl-5 list-disc text-[11px] font-mono-code">
                {assemblyResult.errors.map((err, idx) => (
                  <li key={idx}>
                    <strong>第 {err.line} 行：</strong> {err.message}
                    <div className="text-slate-500 text-[10px] mt-0.5">
                      來源代碼：<code className="text-rose-600 dark:text-rose-400">{err.rawLine}</code>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {assemblyResult.warnings.length > 0 && (
            <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 rounded-xl space-y-1 text-xs text-amber-800 dark:text-amber-300">
              <div className="font-semibold flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
                <span>彙編警告：</span>
              </div>
              <ul className="space-y-0.5 pl-5 list-disc text-[11px]">
                {assemblyResult.warnings.map((warn, idx) => (
                  <li key={idx}>{warn}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Right Column: Tabbed Inspector & Bytecode Deck (5 cols) */}
        <div className="lg:col-span-5 space-y-3">
          {/* Tab navigation */}
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
            <div className="flex items-center gap-1 overflow-x-auto">
              <button
                type="button"
                onClick={() => setActiveTab('machine')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                  activeTab === 'machine'
                    ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-300/60'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                <Database className="w-3.5 h-3.5 text-amber-500" />
                <span>81首機器碼 ({assemblyResult.instructions.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('symbols')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                  activeTab === 'symbols'
                    ? 'bg-sky-100 dark:bg-sky-950/80 text-sky-800 dark:text-sky-300 border border-sky-300/60'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                <Hash className="w-3.5 h-3.5 text-sky-500" />
                <span>符號表 ({Object.keys(assemblyResult.symbols).length})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('isa')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                  activeTab === 'isa'
                    ? 'bg-indigo-100 dark:bg-indigo-950/80 text-indigo-800 dark:text-indigo-300 border border-indigo-300/60'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                <HelpCircle className="w-3.5 h-3.5 text-indigo-500" />
                <span>指令速查</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('stats')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                  activeTab === 'stats'
                    ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-300/60'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                <Layers className="w-3.5 h-3.5 text-emerald-500" />
                <span>內存足跡</span>
              </button>
            </div>
          </div>

          {/* TAB 1: 81-Head Machine Code Table */}
          {activeTab === 'machine' && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs">
              <div className="p-2.5 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  譯碼機器字列表 (ROM Address Space: 0x00..0x50)
                </span>
                <span className="text-[11px] font-mono-code text-slate-500">
                  {assemblyResult.instructions.length} / 81 Words
                </span>
              </div>

              <div className="max-h-96 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                {assemblyResult.instructions.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-400">
                    尚無有效指令。請在左側輸入太玄彙編代碼。
                  </div>
                ) : (
                  assemblyResult.instructions.map((instr) => (
                    <div
                      key={instr.address}
                      className="p-2.5 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors flex items-center justify-between gap-3 text-xs"
                    >
                      {/* Address & Label */}
                      <div className="flex items-center gap-2 min-w-[70px]">
                        <span className="font-mono-code text-[11px] font-bold text-slate-400 dark:text-slate-500">
                          {instr.hexCode}
                        </span>
                        {instr.label && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 font-mono-code font-bold">
                            {instr.label}
                          </span>
                        )}
                      </div>

                      {/* Head Glyph & Name */}
                      <div className="flex items-center gap-1.5">
                        <span className="text-base font-serif text-slate-800 dark:text-slate-200">
                          {instr.headUnicode}
                        </span>
                        <span className="font-serif-tc font-bold text-slate-800 dark:text-slate-200">
                          【{instr.headName}】
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono-code">
                          #{instr.headIndex}
                        </span>
                      </div>

                      {/* 4-Trits Vector */}
                      <div className="flex items-center gap-0.5">
                        {instr.immediate.map((t, idx) => (
                          <TritBadge key={idx} val={t} mode={mode} size="sm" />
                        ))}
                      </div>

                      {/* Raw text */}
                      <div className="text-right max-w-[120px] truncate">
                        <span className="font-mono-code text-[11px] text-slate-600 dark:text-slate-300">
                          {instr.rawText.trim()}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB 2: Symbol Table */}
          {activeTab === 'symbols' && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs">
              <div className="p-2.5 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300">
                符號標籤與地址解析表 (Symbol Table)
              </div>

              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {Object.keys(assemblyResult.symbols).length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-400">
                    未定義標籤符號。可使用 <code className="font-mono-code">LABEL:</code> 定義跳轉錨點。
                  </div>
                ) : (
                  Object.values(assemblyResult.symbols).map((sym) => (
                    <div
                      key={sym.name}
                      className="p-3 flex items-center justify-between text-xs hover:bg-slate-50 dark:hover:bg-slate-800/40"
                    >
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded bg-sky-100 dark:bg-sky-950 text-sky-800 dark:text-sky-300 font-mono-code font-bold">
                          @{sym.name}
                        </span>
                        <span className="text-slate-400 text-[11px]">定義於第 {sym.sourceLine} 行</span>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="font-mono-code text-slate-700 dark:text-slate-300">
                          PC = {sym.address} (0x{sym.address.toString(16).toUpperCase().padStart(2, '0')})
                        </span>
                        <div className="flex items-center gap-0.5">
                          {standardIntToFourTrits(sym.address).map((t, idx) => (
                            <TritBadge key={idx} val={t} mode={mode} size="sm" />
                          ))}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB 3: ISA Reference */}
          {activeTab === 'isa' && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 space-y-3 text-xs max-h-96 overflow-y-auto">
              <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <HelpCircle className="w-4 h-4 text-indigo-500" />
                <span>太玄 81-Trit 符號彙編語法規格 (ISA Specification)</span>
              </div>

              <div className="space-y-2 text-[11px] leading-relaxed">
                <div className="p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-lg">
                  <div className="font-bold text-amber-600 dark:text-amber-400 font-mono-code">
                    1. 算術運算 (Arithmetic ALU)
                  </div>
                  <div className="text-slate-600 dark:text-slate-300 mt-1">
                    <code>ADD #N</code>, <code>SUB #N</code>, <code>CMP #N</code>: 四爻累加器算術，支持立即數
                    #N、十六進制 0xNN 或三進制字面量 %2101。
                  </div>
                </div>

                <div className="p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-lg">
                  <div className="font-bold text-sky-600 dark:text-sky-400 font-mono-code">
                    2. 邏輯與位移 (Logic & Shift)
                  </div>
                  <div className="text-slate-600 dark:text-slate-300 mt-1">
                    <code>MAX #N</code> (T-OR升取), <code>MIN #N</code> (T-AND降取), <code>NOT</code> (T-NOT倒反), <code>CYCLE</code> (三才循變 (X+1) mod 3), <code>SHL</code> / <code>SHR</code>。
                  </div>
                </div>

                <div className="p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-lg">
                  <div className="font-bold text-emerald-600 dark:text-emerald-400 font-mono-code">
                    3. 顯存與 I/O 外設 (VRAM & Keyboard)
                  </div>
                  <div className="text-slate-600 dark:text-slate-300 mt-1 space-y-1">
                    <div>
                      <code>IN.KBD</code>: 讀取鍵盤暫存器 @0x4F (1=左, 2=右, 3=轉, 4=墜, 5=動)
                    </div>
                    <div>
                      <code>OUT.PX x, y</code>: 繪製點至 9x9 顯存坐標 (x: 0~8, y: 0~8)
                    </div>
                    <div>
                      <code>CLS.VRAM #color</code>: 全屏清除顯存 (0=人, 1=地, 2=天)
                    </div>
                  </div>
                </div>

                <div className="p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-lg">
                  <div className="font-bold text-rose-600 dark:text-rose-400 font-mono-code">
                    4. 分支與控制流 (Branch & Control)
                  </div>
                  <div className="text-slate-600 dark:text-slate-300 mt-1">
                    <code>JMP @LABEL</code> (無條件跳轉), <code>JZ @LABEL</code> (零跳轉), <code>JNZ @LABEL</code>, <code>JP @LABEL</code> (正跳轉), <code>JN @LABEL</code> (負跳轉), <code>HALT</code> (停機)。
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: Memory Footprint & Stats */}
          {activeTab === 'stats' && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-4 text-xs">
              <div className="font-bold text-slate-800 dark:text-slate-200">
                微機資源佔用分析 (Microcomputer Resource Allocation)
              </div>

              <div className="space-y-3">
                {/* ROM Usage Bar */}
                <div>
                  <div className="flex justify-between text-slate-600 dark:text-slate-400 mb-1">
                    <span>ROM 指令容量佔用 (0x00 ~ 0x50):</span>
                    <span className="font-mono-code font-bold text-amber-500">
                      {assemblyResult.instructions.length} / 81 字 (
                      {((assemblyResult.instructions.length / 81) * 100).toFixed(1)}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-amber-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${Math.min(100, (assemblyResult.instructions.length / 81) * 100)}%` }}
                    />
                  </div>
                </div>

                {/* VRAM I/O Operations */}
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-700/60">
                    <div className="text-slate-500 text-[11px]">顯存操作指令數</div>
                    <div className="text-lg font-bold font-mono-code text-slate-900 dark:text-slate-100 mt-0.5">
                      {assemblyResult.vramFootprint}
                    </div>
                  </div>

                  <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-700/60">
                    <div className="text-slate-500 text-[11px]">跳轉與分支指令數</div>
                    <div className="text-lg font-bold font-mono-code text-slate-900 dark:text-slate-100 mt-0.5">
                      {assemblyResult.instructions.filter((i) => i.branchTarget !== undefined).length}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
