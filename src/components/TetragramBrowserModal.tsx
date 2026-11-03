/**
 * 81 Tetragrams Complete Gallery & Search Browser
 * @license Apache-2.0
 */

import React, { useState } from 'react';
import { TAI_XUAN_HEADS, fourTritsToStandardInt, fourTritsToBalancedInt } from '../lib/taiXuanData';
import { TetragramVisualizer } from './TetragramVisualizer';
import { DisplayMode, TetragramHead } from '../types/ternary';

interface TetragramBrowserModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: DisplayMode;
  onSelectHead?: (head: TetragramHead) => void;
}

export const TetragramBrowserModal: React.FC<TetragramBrowserModalProps> = ({
  isOpen,
  onClose,
  mode,
  onSelectHead,
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  if (!isOpen) return null;

  const filteredHeads = TAI_XUAN_HEADS.filter(
    (h) =>
      h.name.includes(searchTerm) ||
      h.pinyin.includes(searchTerm.toLowerCase()) ||
      h.meaning.includes(searchTerm) ||
      h.solarDate.includes(searchTerm) ||
      h.index.toString() === searchTerm.trim()
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4">
          <div>
            <span className="text-xs font-mono-code text-sky-600 dark:text-sky-400 block mb-1">
              81 TETRAGRAMS ENCYCLOPEDIA (3⁴ = 81 首)
            </span>
            <h3 className="text-xl font-bold font-serif-tc text-slate-900 dark:text-slate-100">
              漢代揚雄《太玄經》八十一首全圖譜速查
            </h3>
          </div>

          <div className="flex items-center gap-3">
            <input
              type="text"
              placeholder="搜尋首名、拼音、節氣或序號..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="text-xs px-3 py-2 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 w-56 focus:outline-hidden focus:ring-2 focus:ring-sky-500"
            />
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Grid of 81 Heads */}
        <div className="p-6 overflow-y-auto flex-1 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3.5">
          {filteredHeads.map((head) => {
            const stdVal = fourTritsToStandardInt(head.trits);
            const balVal = fourTritsToBalancedInt(head.trits);

            return (
              <button
                key={head.index}
                type="button"
                onClick={() => {
                  if (onSelectHead) onSelectHead(head);
                }}
                className="p-3 bg-slate-50 dark:bg-slate-800/40 hover:bg-sky-50 dark:hover:bg-sky-950/40 border border-slate-200 dark:border-slate-800 hover:border-sky-300 dark:hover:border-sky-700 rounded-xl transition-all text-left flex flex-col justify-between group"
              >
                <div className="flex items-center justify-between w-full mb-1">
                  <span className="text-xs font-mono-code text-slate-400">#{head.index}</span>
                  <span className="text-[10px] text-slate-500 font-mono-code">{head.solarDate}</span>
                </div>

                <div className="my-1 flex items-center justify-center">
                  <TetragramVisualizer
                    trits={head.trits}
                    mode={mode}
                    size="sm"
                    showDetails={false}
                    headOverride={head}
                  />
                </div>

                <div className="mt-2 pt-2 border-t border-slate-200/60 dark:border-slate-800/80 w-full text-center">
                  <div className="text-sm font-bold font-serif-tc text-slate-900 dark:text-slate-100 group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors">
                    【{head.name}】
                  </div>
                  <div className="text-[10px] font-mono-code text-slate-500 mt-0.5">
                    數值: {stdVal} ({balVal > 0 ? `+${balVal}` : balVal})
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between text-xs text-slate-500">
          <span>共顯示 {filteredHeads.length} 首</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-lg font-medium transition-colors"
          >
            返回
          </button>
        </div>
      </div>
    </div>
  );
};
