/**
 * Top Navigation Bar adhering to the Top Bar Contract
 * Zone 1: Wordmark
 * Zone 2: 5 single-line navigation links
 * Zone 3: Primary action + Utilities
 * @license Apache-2.0
 */

import React from 'react';
import { DisplayMode } from '../types/ternary';

interface HeaderProps {
  activeChapter: number;
  onSelectChapter: (ch: number) => void;
  displayMode: DisplayMode;
  onChangeDisplayMode: (mode: DisplayMode) => void;
  isDark: boolean;
  onToggleDark: () => void;
  onOpenCultureModal: () => void;
  onOpenVerificationModal: () => void;
  onOpenDe2Modal?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeChapter,
  onSelectChapter,
  displayMode,
  onChangeDisplayMode,
  isDark,
  onToggleDark,
  onOpenCultureModal,
  onOpenVerificationModal,
  onOpenDe2Modal,
}) => {
  const chapters = [
    { num: 1, label: '01.元始門' },
    { num: 2, label: '02.基礎門殿' },
    { num: 3, label: '03.選擇器' },
    { num: 4, label: '04.算術加法' },
    { num: 5, label: '05.四爻ALU' },
    { num: 6, label: '06.記憶時序' },
    { num: 7, label: '07.八十一首微機' },
    { num: 8, label: '08.工程工作台' },
  ];

  return (
    <header className="sticky top-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Single text element wordmark */}
        <button
          type="button"
          onClick={() => onSelectChapter(1)}
          className="text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100 font-serif-tc whitespace-nowrap shrink-0 flex items-center gap-2 hover:opacity-90 transition-opacity"
        >
          <span className="text-xl text-sky-600 dark:text-sky-400 select-none">𝌆</span>
          <span>太玄三進制</span>
        </button>

        {/* Zone 2: Clean single-line navigation links */}
        <nav className="hidden xl:flex items-center gap-5 text-xs font-medium text-slate-600 dark:text-slate-400">
          {chapters.map((ch) => (
            <button
              key={ch.num}
              type="button"
              onClick={() => onSelectChapter(ch.num)}
              className={`whitespace-nowrap shrink-0 transition-colors py-1 ${
                activeChapter === ch.num
                  ? 'text-sky-600 dark:text-sky-400 font-bold border-b-2 border-sky-600 dark:border-sky-400'
                  : 'hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              {ch.label}
            </button>
          ))}
        </nav>

        {/* Zone 3: 1 primary action + Display mode selector & Dark mode */}
        <div className="flex items-center gap-2.5 shrink-0">
          {/* Display Mode Toggle */}
          <div className="hidden sm:flex items-center p-0.5 bg-slate-100 dark:bg-slate-800 rounded-lg text-[11px] font-mono-code border border-slate-200 dark:border-slate-700/60">
            <button
              type="button"
              onClick={() => onChangeDisplayMode('taixuan')}
              className={`px-2 py-1 rounded transition-colors whitespace-nowrap ${
                displayMode === 'taixuan'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs font-semibold'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
              title="太玄本原三態：天 ⚊, 地 ⚋, 人 𝌀"
            >
              太玄 (天地人)
            </button>
            <button
              type="button"
              onClick={() => onChangeDisplayMode('balanced')}
              className={`px-2 py-1 rounded transition-colors whitespace-nowrap ${
                displayMode === 'balanced'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs font-semibold'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
              title="平衡三進制：+1, 0, -1 (Setun 經典)"
            >
              平衡 (+, 0, -)
            </button>
            <button
              type="button"
              onClick={() => onChangeDisplayMode('standard')}
              className={`px-2 py-1 rounded transition-colors whitespace-nowrap ${
                displayMode === 'standard'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs font-semibold'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
              title="標準三進制：2, 1, 0"
            >
              標準 (2, 1, 0)
            </button>
          </div>

          {/* DE2 FPGA Verilog Export CTA */}
          {onOpenDe2Modal && (
            <button
              type="button"
              onClick={onOpenDe2Modal}
              className="px-3 py-1.5 text-xs font-semibold text-amber-950 dark:text-amber-200 bg-amber-400/90 hover:bg-amber-400 dark:bg-amber-500/20 dark:hover:bg-amber-500/30 border border-amber-500/30 rounded-lg transition-all whitespace-nowrap shadow-xs flex items-center gap-1.5"
              title="查看並導出 Altera DE2 Cyclone II 完整 Verilog & 引腳配置"
            >
              <span>⚡</span>
              <span>DE2 FPGA 燒錄庫</span>
            </button>
          )}

          {/* Verification CTA */}
          <button
            type="button"
            onClick={onOpenVerificationModal}
            className="px-3.5 py-1.5 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-500 rounded-lg transition-colors whitespace-nowrap shadow-xs"
          >
            測試驗證體系
          </button>

          {/* Culture Philosophy Button */}
          <button
            type="button"
            onClick={onOpenCultureModal}
            className="px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors whitespace-nowrap"
          >
            太玄源流
          </button>

          {/* Theme Toggle */}
          <button
            type="button"
            onClick={onToggleDark}
            className="p-1.5 text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            title={isDark ? '切換淺色模式' : '切換深色模式'}
            aria-label="Toggle Dark Mode"
          >
            {isDark ? '☀️' : '🌙'}
          </button>
        </div>
      </div>

      {/* Sub-header for mobile chapter selector */}
      <div className="xl:hidden flex items-center overflow-x-auto gap-2 px-4 py-2 border-t border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/60">
        {chapters.map((ch) => (
          <button
            key={ch.num}
            type="button"
            onClick={() => onSelectChapter(ch.num)}
            className={`whitespace-nowrap px-2.5 py-1 text-xs rounded-md font-medium transition-colors ${
              activeChapter === ch.num
                ? 'bg-sky-600 text-white font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800'
            }`}
          >
            {ch.label}
          </button>
        ))}
      </div>
    </header>
  );
};
