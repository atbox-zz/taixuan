/**
 * Cultural & Philosophical Exploration Modal: Tai Xuan Jing & Ternary Computing
 * @license Apache-2.0
 */

import React from 'react';

interface CultureModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CultureModal: React.FC<CultureModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-3xl w-full max-h-[85vh] overflow-y-auto shadow-2xl p-6 sm:p-8 space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
          <div>
            <span className="text-xs font-mono-code text-sky-600 dark:text-sky-400 block mb-1">
              PHILOSOPHY & COMPUTER SCIENCE HISTORY
            </span>
            <h3 className="text-xl font-bold font-serif-tc text-slate-900 dark:text-slate-100">
              太玄探微：揚雄《太玄經》與三進制計算科學
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

        <div className="space-y-5 text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-sans">
          <section className="space-y-2">
            <h4 className="font-bold text-slate-900 dark:text-slate-100 font-serif-tc text-base">
              一、二進制《易經》與三進制《太玄經》
            </h4>
            <p>
              萊布尼茨（G. W. Leibniz）曾盛讚伏羲六十四卦為二進制（0 與 1，陰 ⚋ 與陽 ⚊）之先驅（2⁶ = 64）。
              然而，早在西漢末年，大儒<strong>揚雄（前53年－18年）</strong>便以驚世的數學直覺，建立了世界上最早的完備三進制宇宙體系——<strong>《太玄經》</strong>。
            </p>
            <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700/60 font-serif-tc text-xs text-slate-700 dark:text-slate-200">
              「夫玄也，幽攡萬類而不見形者也。天以三分，地以三策，人以三軌……三三相乘，四重而成八十一首。」
            </div>
            <p>
              揚雄將每爻分為三態：<strong>一畫（天 ⚊）</strong>、<strong>二畫（地 ⚋）</strong>、<strong>三畫（人 𝌀）</strong>。
              四爻自上而下形成「方（27）、州（9）、部（3）、家（1）」，剛好涵蓋 3⁴ = 81 首，每首九贊共 729 贊，精確對應漢代太初曆之一年 365.25 日（包含晝夜之策）！
            </p>
          </section>

          <section className="space-y-2">
            <h4 className="font-bold text-slate-900 dark:text-slate-100 font-serif-tc text-base">
              二、高德納與平衡三進制的數學之美
            </h4>
            <p>
              計算機科學宗師<strong>高德納（Donald E. Knuth）</strong>在名著《計算機程序設計藝術》（TAOCP）卷二中寫道：
            </p>
            <blockquote className="p-3 bg-sky-50 dark:bg-sky-950/40 rounded-xl border border-sky-200 dark:border-sky-800 text-sky-900 dark:text-sky-200 italic font-mono-code text-xs">
              "Perhaps the prettiest number system of all is the balanced ternary notation."
              （也許所有進位記數法中最為優美對稱的，便是平衡三進制記數法。）
            </blockquote>
            <p>
              在平衡三進制中，三態為 <span className="font-mono-code">{'-1, 0, +1'}</span>。它的非凡優勢在於：
              <strong>負數不需要額外的符號位（Sign Bit）或補碼轉換</strong>，求相反數只需簡單地將所有爻態倒反（天變人人變天，地保持不動）。而且加法器中的捨入（Rounding）就是簡單的截斷，天然具備零偏置！
            </p>
          </section>

          <section className="space-y-2">
            <h4 className="font-bold text-slate-900 dark:text-slate-100 font-serif-tc text-base">
              三、工程實踐：蘇聯 Setun 計算機與 T-NAND 完備性
            </h4>
            <p>
              1958年，莫斯科國立大學尼古拉·布魯森佐夫（Nikolay Brusentsov）研發了人類歷史上首台三進制計算機<strong>「Сетунь (Setun)」</strong>。其實踐證明，三進制計算機比當時同規模的二進制機器更節省元器件、運算效率更高、邏輯簡潔優雅。
            </p>
            <p>
              在本系統中，我們受經典《Nand to Tetris》體系啟發，以揚雄《太玄經》中的三才為底蘊，建立
              <strong className="text-slate-900 dark:text-slate-100 font-mono-code mx-1">T-NAND 門</strong>。
              由此單一基石，推演出與、或、非、選擇器、加法器、4-Trit ALU、三穩態鎖存器以及八十一首微機，完成東方古典哲學與現代數字計算體系跨越兩千年的交相輝映。
            </p>
          </section>
        </div>

        <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 text-xs font-semibold bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-lg hover:bg-slate-800 transition-colors"
          >
            關閉並返回學習體系
          </button>
        </div>
      </div>
    </div>
  );
};
