/**
 * Tai Xuan Ternary Computing - From T-NAND to ALU & Micro-Computer
 * @license Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { DisplayMode } from './types/ternary';
import { Header } from './components/Header';
import { Chapter1Primitive } from './components/chapters/Chapter1Primitive';
import { Chapter2Elementary } from './components/chapters/Chapter2Elementary';
import { Chapter3Multiplexer } from './components/chapters/Chapter3Multiplexer';
import { Chapter4Adders } from './components/chapters/Chapter4Adders';
import { Chapter5Alu } from './components/chapters/Chapter5Alu';
import { Chapter6Memory } from './components/chapters/Chapter6Memory';
import { Chapter7Computer } from './components/chapters/Chapter7Computer';
import { Chapter8Workbench } from './components/chapters/Chapter8Workbench';
import { CultureModal } from './components/CultureModal';
import { VerificationModal } from './components/VerificationModal';
import { HdlViewerModal } from './components/HdlViewerModal';
import { TetragramBrowserModal } from './components/TetragramBrowserModal';
import { De2FpgaModal } from './components/De2FpgaModal';

export default function App() {
  const [activeChapter, setActiveChapter] = useState<number>(1);
  const [displayMode, setDisplayMode] = useState<DisplayMode>('taixuan');
  const [isDark, setIsDark] = useState<boolean>(false);

  // Modals
  const [isCultureOpen, setIsCultureOpen] = useState<boolean>(false);
  const [isVerificationOpen, setIsVerificationOpen] = useState<boolean>(false);
  const [isHdlOpen, setIsHdlOpen] = useState<boolean>(false);
  const [isBrowserOpen, setIsBrowserOpen] = useState<boolean>(false);
  const [isDe2Open, setIsDe2Open] = useState<boolean>(false);

  // Sync dark class on documentElement
  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  const chaptersMeta = [
    { num: 1, title: '太玄元始門', subtitle: 'T-NAND 與 T-NOT 倒反門' },
    { num: 2, title: '基礎門殿', subtitle: 'T-AND, T-OR 與德摩根律' },
    { num: 3, title: '選擇與特徵', subtitle: 'T-MUX 3:1、循變門與同契' },
    { num: 4, title: '算術加法', subtitle: '半加器、全加器與四爻首加法器' },
    { num: 5, title: '四爻ALU', subtitle: '81首算術邏輯運算單元' },
    { num: 6, title: '記憶時序', subtitle: '三穩態鎖存器與主寄存器' },
    { num: 7, title: '八十一首微機', subtitle: '太玄CPU·虛擬機·太玄三象方塊' },
    { num: 8, title: '工程工作台', subtitle: 'ALU延遲流轉·測試台·優化器·時序' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors flex flex-col font-sans">
      {/* Top Bar Contract Navigation */}
      <Header
        activeChapter={activeChapter}
        onSelectChapter={setActiveChapter}
        displayMode={displayMode}
        onChangeDisplayMode={setDisplayMode}
        isDark={isDark}
        onToggleDark={() => setIsDark(!isDark)}
        onOpenCultureModal={() => setIsCultureOpen(true)}
        onOpenVerificationModal={() => setIsVerificationOpen(true)}
        onOpenDe2Modal={() => setIsDe2Open(true)}
      />

      {/* Hero Strip & Interactive Roadmap */}
      <section className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-10">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
            <div className="max-w-3xl space-y-3">
              <div className="flex items-center gap-2 text-xs font-mono-code text-sky-600 dark:text-sky-400">
                <span>TAI XUAN JING TERNARY COMPUTING ARCHITECTURE</span>
                <span aria-hidden="true">·</span>
                <span>NAND TO TETRIS PEDAGOGY</span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-bold font-serif-tc text-slate-900 dark:text-slate-100 tracking-tight leading-tight">
                從 T-NAND 到太玄三進制計算機
              </h1>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed max-w-2xl">
                融匯漢代揚雄《太玄經》三進制本體論（天 ⚊、地 ⚋、人 𝌀）與現代數字邏輯經典《Nand to Tetris》，自底向上逐級構建完整的符號邏輯、四爻加法器、4-Trit ALU 以及八十一首微型計算機與俄羅斯方塊遊戲。
              </p>
            </div>

            {/* Quick Action Badges */}
            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              <button
                type="button"
                onClick={() => setActiveChapter(7)}
                className="px-3.5 py-2 text-xs font-bold bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 rounded-lg transition-all shadow-xs flex items-center gap-1.5 ring-1 ring-amber-400/50"
              >
                <span>🎮</span>
                <span>太玄方塊 (Stage A)</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveChapter(8)}
                className="px-3.5 py-2 text-xs font-semibold bg-sky-600 hover:bg-sky-500 text-white rounded-lg transition-colors shadow-xs flex items-center gap-1.5"
              >
                <span>🛠️</span>
                <span>工程輔助工作台</span>
              </button>

              <button
                type="button"
                onClick={() => setIsBrowserOpen(true)}
                className="px-3.5 py-2 text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-lg transition-colors border border-slate-200 dark:border-slate-700/60 flex items-center gap-1.5"
              >
                <span>𝌆</span>
                <span>八十一首圖譜速查</span>
              </button>

              <button
                type="button"
                onClick={() => setIsHdlOpen(true)}
                className="px-3.5 py-2 text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-lg transition-colors border border-slate-200 dark:border-slate-700/60 flex items-center gap-1.5 font-mono-code"
              >
                <span>&lt;/&gt;</span>
                <span>TaiXuan HDL</span>
              </button>
            </div>
          </div>

          {/* Stepper Roadmap Tabs */}
          <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800/80 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
            {chaptersMeta.map((ch) => {
              const isActive = activeChapter === ch.num;
              return (
                <button
                  key={ch.num}
                  type="button"
                  onClick={() => setActiveChapter(ch.num)}
                  className={`p-3 rounded-xl border text-left transition-all relative flex flex-col justify-between ${
                    isActive
                      ? 'bg-sky-50/80 dark:bg-sky-950/40 border-sky-400 dark:border-sky-700 ring-1 ring-sky-300 dark:ring-sky-600 shadow-xs'
                      : 'bg-slate-50/50 dark:bg-slate-800/20 border-slate-200/80 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <div className="flex items-center justify-between w-full mb-1">
                    <span className="text-[11px] font-mono-code font-bold text-sky-600 dark:text-sky-400">
                      階梯 0{ch.num}
                    </span>
                    {isActive && (
                      <span className="w-1.5 h-1.5 rounded-full bg-sky-600 dark:bg-sky-400" />
                    )}
                  </div>
                  <div>
                    <div className="text-xs font-bold font-serif-tc text-slate-900 dark:text-slate-100">
                      {ch.title}
                    </div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                      {ch.subtitle}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Main Chapter Stage */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeChapter === 1 && <Chapter1Primitive mode={displayMode} />}
        {activeChapter === 2 && <Chapter2Elementary mode={displayMode} />}
        {activeChapter === 3 && <Chapter3Multiplexer mode={displayMode} />}
        {activeChapter === 4 && <Chapter4Adders mode={displayMode} />}
        {activeChapter === 5 && <Chapter5Alu mode={displayMode} />}
        {activeChapter === 6 && <Chapter6Memory mode={displayMode} />}
        {activeChapter === 7 && <Chapter7Computer mode={displayMode} />}
        {activeChapter === 8 && (
          <Chapter8Workbench
            mode={displayMode}
            onOpenBrowser={() => setIsBrowserOpen(true)}
            onOpenCulture={() => setIsCultureOpen(true)}
          />
        )}

        {/* Chapter Navigation Footer Controls */}
        <div className="mt-12 pt-6 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setActiveChapter(Math.max(1, activeChapter - 1))}
            disabled={activeChapter === 1}
            className="px-4 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 disabled:opacity-40 hover:bg-slate-200/60 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            ← 上一階梯：{activeChapter > 1 ? chaptersMeta[activeChapter - 2].title : '已至頂'}
          </button>

          <span className="text-xs font-mono-code text-slate-400">
            {activeChapter} / 8 階梯
          </span>

          <button
            type="button"
            onClick={() => setActiveChapter(Math.min(8, activeChapter + 1))}
            disabled={activeChapter === 8}
            className="px-4 py-2 text-xs font-medium bg-sky-600 hover:bg-sky-500 disabled:opacity-40 text-white rounded-lg transition-colors shadow-xs"
          >
            下一階梯：{activeChapter < 8 ? chaptersMeta[activeChapter].title : '終章'} →
          </button>
        </div>
      </main>

      {/* Quiet, Clean Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800 py-6 bg-white dark:bg-slate-900 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-2 font-serif-tc">
            <span>西漢 · 揚雄《太玄經》三進制計算科學體系</span>
            <span aria-hidden="true">·</span>
            <span>Nand to Tetris 模塊化模擬器</span>
          </div>

          <div className="flex items-center gap-4 text-[11px] font-mono-code">
            <span>天 ⚊ (+1 / 2)</span>
            <span aria-hidden="true">·</span>
            <span>地 ⚋ (0 / 1)</span>
            <span aria-hidden="true">·</span>
            <span>人 𝌀 (-1 / 0)</span>
            <span aria-hidden="true">·</span>
            <span>3⁴ = 81 首</span>
          </div>
        </div>
      </footer>

      {/* Modals */}
      {isCultureOpen && <CultureModal isOpen={isCultureOpen} onClose={() => setIsCultureOpen(false)} />}
      {isVerificationOpen && <VerificationModal isOpen={isVerificationOpen} onClose={() => setIsVerificationOpen(false)} />}
      {isHdlOpen && <HdlViewerModal isOpen={isHdlOpen} onClose={() => setIsHdlOpen(false)} />}
      {isDe2Open && <De2FpgaModal isOpen={isDe2Open} onClose={() => setIsDe2Open(false)} />}
      {isBrowserOpen && (
        <TetragramBrowserModal
          isOpen={isBrowserOpen}
          onClose={() => setIsBrowserOpen(false)}
          mode={displayMode}
        />
      )}
    </div>
  );
}
