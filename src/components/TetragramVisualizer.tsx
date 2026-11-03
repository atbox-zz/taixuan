/**
 * Tetragram Visualizer (太玄首四爻儀象圖)
 * Renders the 4 tiers (方、州、部、家) with authentic Chinese strokes and mathematical weights
 * @license Apache-2.0
 */

import React from 'react';
import { TritValue, DisplayMode, TetragramHead } from '../types/ternary';
import { TRIT_INFO, findTetragramByTrits, fourTritsToStandardInt, fourTritsToBalancedInt } from '../lib/taiXuanData';

interface TetragramVisualizerProps {
  trits: [TritValue, TritValue, TritValue, TritValue]; // [Tier 3(方), Tier 2(州), Tier 1(部), Tier 0(家)]
  mode?: DisplayMode;
  showDetails?: boolean;
  size?: 'sm' | 'md' | 'lg';
  headOverride?: TetragramHead;
}

export const TetragramVisualizer: React.FC<TetragramVisualizerProps> = ({
  trits,
  mode = 'taixuan',
  showDetails = true,
  size = 'md',
  headOverride,
}) => {
  const head = headOverride || findTetragramByTrits(trits);
  const stdVal = fourTritsToStandardInt(trits);
  const balVal = fourTritsToBalancedInt(trits);

  const tierNames = [
    { title: '方 (三品)', weight: 27, level: '第4爻 / 頂爻' },
    { title: '州 (九界)', weight: 9, level: '第3爻' },
    { title: '部 (廿七規)', weight: 3, level: '第2爻' },
    { title: '家 (八十一首)', weight: 1, level: '第1爻 / 初爻' },
  ];

  // Render individual stroke according to 天 (1 bar), 地 (2 bars), 人 (3 bars)
  const renderStroke = (val: TritValue) => {
    const strokeHeight = size === 'sm' ? 'h-1.5' : size === 'md' ? 'h-2.5' : 'h-3.5';
    const gapWidth = size === 'sm' ? 'gap-1' : size === 'md' ? 'gap-1.5' : 'gap-2';

    if (val === 2) {
      // 天: One continuous stroke (天道為一)
      return (
        <div className={`w-full ${strokeHeight} rounded-sm bg-sky-600 dark:bg-sky-400 transition-colors shadow-xs`} />
      );
    }
    if (val === 1) {
      // 地: Divided once into 2 segments (地道為二)
      return (
        <div className={`w-full flex ${gapWidth}`}>
          <div className={`flex-1 ${strokeHeight} rounded-sm bg-amber-600 dark:bg-amber-400 transition-colors shadow-xs`} />
          <div className={`flex-1 ${strokeHeight} rounded-sm bg-amber-600 dark:bg-amber-400 transition-colors shadow-xs`} />
        </div>
      );
    }
    // 人: Divided twice into 3 segments (人道為三)
    return (
      <div className={`w-full flex ${gapWidth}`}>
        <div className={`flex-1 ${strokeHeight} rounded-sm bg-violet-600 dark:bg-violet-400 transition-colors shadow-xs`} />
        <div className={`flex-1 ${strokeHeight} rounded-sm bg-violet-600 dark:bg-violet-400 transition-colors shadow-xs`} />
        <div className={`flex-1 ${strokeHeight} rounded-sm bg-violet-600 dark:bg-violet-400 transition-colors shadow-xs`} />
      </div>
    );
  };

  const containerWidth = size === 'sm' ? 'w-24' : size === 'md' ? 'w-36' : 'w-48';

  return (
    <div className="flex flex-col items-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs">
      {/* Visual Stroke Tower (方州部家 四爻) */}
      <div className={`${containerWidth} flex flex-col gap-2 py-2 px-1`}>
        {trits.map((val, idx) => {
          const info = TRIT_INFO[val];
          const tier = tierNames[idx];
          return (
            <div
              key={idx}
              className="group relative flex items-center gap-2 cursor-help"
              title={`${tier.title} (${tier.level}): ${info.name}爻 (數值: ${val}, 權重: ×${tier.weight})`}
            >
              <div className="flex-1">{renderStroke(val)}</div>
              <span className="text-[10px] font-mono-code text-slate-400 dark:text-slate-500 w-4 text-right">
                {info.name}
              </span>
            </div>
          );
        })}
      </div>

      {showDetails && (
        <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/80 w-full text-center">
          <div className="flex items-center justify-center gap-2">
            <span className="text-xl font-bold font-serif-tc text-slate-900 dark:text-slate-100">
              {head.name}
            </span>
            <span className="text-xs text-slate-500 font-mono-code">
              第 {head.index} 首
            </span>
          </div>

          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 line-clamp-1">
            {head.meaning}
          </p>

          <div className="flex items-center justify-center gap-3 mt-2 text-xs font-mono-code text-slate-500 dark:text-slate-400">
            <span>標準: <strong className="text-slate-800 dark:text-slate-200 tabular-nums">{stdVal}</strong></span>
            <span aria-hidden="true">·</span>
            <span>平衡: <strong className="text-slate-800 dark:text-slate-200 tabular-nums">{balVal > 0 ? `+${balVal}` : balVal}</strong></span>
            <span aria-hidden="true">·</span>
            <span>{head.solarDate}</span>
          </div>
        </div>
      )}
    </div>
  );
};
