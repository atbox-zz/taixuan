/**
 * Ternary VRAM Display & Keyboard I/O Controller
 * Part of Project 5: Computer Architecture (Screen & Keyboard Integration)
 * Pre-requisite for Project 6 (Assembler) & Capstone (TaiXuan Tetris)
 * @license Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { TritValue, DisplayMode } from '../types/ternary';
import { TritBadge } from './TritBadge';
import {
  TAI_XUAN_HEADS,
  fourTritsToStandardInt,
  standardIntToFourTrits,
} from '../lib/taiXuanData';
import {
  Tv,
  Keyboard as KeyboardIcon,
  Play,
  Pause,
  RotateCcw,
  Sparkles,
  Layers,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  CircleDot,
  Brush,
  Eraser,
  Copy,
  Check,
} from 'lucide-react';

interface TernaryVramDisplayProps {
  mode: DisplayMode;
  onVramUpdate?: (address: number, trits: [TritValue, TritValue, TritValue, TritValue]) => void;
  externalKbdValue?: number;
}

// Key code mapping for Tai Xuan I/O
export const KBD_MAP: Record<string, { code: number; name: string; trits: [TritValue, TritValue, TritValue, TritValue] }> = {
  IDLE: { code: 0, name: '空閒 (IDLE)', trits: [1, 1, 1, 1] },
  ArrowLeft: { code: 1, name: '⭠ 左移 (LEFT)', trits: [0, 0, 0, 1] },
  KeyA: { code: 1, name: '⭠ 左移 (A)', trits: [0, 0, 0, 1] },
  ArrowRight: { code: 2, name: '⭢ 右移 (RIGHT)', trits: [0, 0, 0, 2] },
  KeyD: { code: 2, name: '⭢ 右移 (D)', trits: [0, 0, 0, 2] },
  ArrowUp: { code: 3, name: '⭡ 旋轉 (ROTATE)', trits: [0, 0, 1, 0] },
  KeyW: { code: 3, name: '⭡ 旋轉 (W)', trits: [0, 0, 1, 0] },
  ArrowDown: { code: 4, name: '⭣ 急墜 (DROP)', trits: [0, 0, 1, 1] },
  KeyS: { code: 4, name: '⭣ 急墜 (S)', trits: [0, 0, 1, 1] },
  Space: { code: 5, name: '␣ 動作 (ACTION)', trits: [0, 0, 1, 2] },
  Enter: { code: 6, name: '↵ 確認 (CONFIRM)', trits: [0, 0, 2, 0] },
  Escape: { code: 7, name: '⎋ 暫停 (PAUSE)', trits: [0, 0, 2, 1] },
};

// Polyomino shapes for previewing Tetris blocks in 9x9 VRAM
const TETRIS_SHAPES = [
  {
    name: '太玄一字 (I-Trit)',
    coords: [[3, 4], [4, 4], [5, 4], [6, 4]],
    colorTrit: 2 as TritValue, // 天 (金光)
  },
  {
    name: '三才鼎足 (T-Trit)',
    coords: [[4, 3], [3, 4], [4, 4], [5, 4]],
    colorTrit: 0 as TritValue, // 人 (赤朱)
  },
  {
    name: '玄宮折曲 (L-Trit)',
    coords: [[3, 3], [3, 4], [4, 4], [5, 4]],
    colorTrit: 2 as TritValue,
  },
  {
    name: '乾坤方塊 (O-Trit)',
    coords: [[3, 3], [4, 3], [3, 4], [4, 4]],
    colorTrit: 1 as TritValue, // 地 (玄黑)
  },
  {
    name: '陰陽之錯 (Z-Trit)',
    coords: [[3, 3], [4, 3], [4, 4], [5, 4]],
    colorTrit: 0 as TritValue,
  },
];

export const TernaryVramDisplay: React.FC<TernaryVramDisplayProps> = ({
  mode,
  onVramUpdate,
}) => {
  // 9x9 VRAM Matrix: exactly 81 pixels (indexes 0..80)
  // Each pixel has a TritValue (0: 人-赤, 1: 地-玄, 2: 天-金)
  const [vram, setVram] = useState<TritValue[]>(() => {
    const init = new Array<TritValue>(81).fill(1); // Default to 1 (地 / neutral baseline)
    // Draw an auspicious cross pattern initially
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (r === 4 || c === 4) {
          init[r * 9 + c] = 2; // 天
        } else if ((r === c || r + c === 8) && r >= 2 && r <= 6) {
          init[r * 9 + c] = 0; // 人
        }
      }
    }
    return init;
  });

  // Brush tool: current painting trit
  const [activeBrush, setActiveBrush] = useState<TritValue>(2);
  const [isMouseDown, setIsMouseDown] = useState<boolean>(false);

  // Keyboard Controller Register (@0x4F / 79)
  const [currentKeyName, setCurrentKeyName] = useState<string>('空閒 (IDLE)');
  const [currentKeyCode, setCurrentKeyCode] = useState<number>(0);
  const [currentKeyTrits, setCurrentKeyTrits] = useState<[TritValue, TritValue, TritValue, TritValue]>([1, 1, 1, 1]);
  const [keyHistory, setKeyHistory] = useState<Array<{ key: string; code: number; time: string }>>([]);

  // Demo Runner Animation
  const [activeDemo, setActiveDemo] = useState<'idle' | 'cursor' | 'tetris' | 'wave'>('idle');
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number }>({ x: 4, y: 4 });
  const [activeShapeIdx, setActiveShapeIdx] = useState<number>(0);
  const [shapeOffset, setShapeOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [copied, setCopied] = useState<boolean>(false);

  const animationRef = useRef<number | null>(null);
  const waveStepRef = useRef<number>(0);

  // Keyboard event handling
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Only intercept game keys when not typing in input
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
      e.preventDefault();
    }

    const mapping = KBD_MAP[e.code] || {
      code: e.key.charCodeAt(0) % 81,
      name: `ASCII: '${e.key}'`,
      trits: standardIntToFourTrits(e.key.charCodeAt(0) % 81),
    };

    setCurrentKeyName(mapping.name);
    setCurrentKeyCode(mapping.code);
    setCurrentKeyTrits(mapping.trits);

    const timeStr = new Date().toLocaleTimeString();
    setKeyHistory((prev) => [{ key: mapping.name, code: mapping.code, time: timeStr }, ...prev.slice(0, 7)]);

    // If demo is cursor, move cursor
    if (activeDemo === 'cursor') {
      setCursorPos((prev) => {
        let nx = prev.x;
        let ny = prev.y;
        if (e.code === 'ArrowLeft' || e.code === 'KeyA') nx = Math.max(0, nx - 1);
        if (e.code === 'ArrowRight' || e.code === 'KeyD') nx = Math.min(8, nx + 1);
        if (e.code === 'ArrowUp' || e.code === 'KeyW') ny = Math.max(0, ny - 1);
        if (e.code === 'ArrowDown' || e.code === 'KeyS') ny = Math.min(8, ny + 1);

        setVram((old) => {
          const next = [...old];
          next[ny * 9 + nx] = 2; // Paint cursor
          return next;
        });

        return { x: nx, y: ny };
      });
    }

    // If demo is tetris, move shape
    if (activeDemo === 'tetris') {
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
        setShapeOffset((o) => ({ ...o, x: Math.max(-2, o.x - 1) }));
      } else if (e.code === 'ArrowRight' || e.code === 'KeyD') {
        setShapeOffset((o) => ({ ...o, x: Math.min(2, o.x + 1) }));
      } else if (e.code === 'ArrowDown' || e.code === 'KeyS') {
        setShapeOffset((o) => ({ ...o, y: Math.min(2, o.y + 1) }));
      } else if (e.code === 'ArrowUp' || e.code === 'KeyW' || e.code === 'Space') {
        setActiveShapeIdx((s) => (s + 1) % TETRIS_SHAPES.length);
      }
    }
  }, [activeDemo]);

  const handleKeyUp = useCallback(() => {
    // Release key back to idle after short delay for crisp UX
    window.setTimeout(() => {
      setCurrentKeyName(KBD_MAP.IDLE.name);
      setCurrentKeyCode(KBD_MAP.IDLE.code);
      setCurrentKeyTrits(KBD_MAP.IDLE.trits);
    }, 180);
  }, []);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [handleKeyDown, handleKeyUp]);

  // Click / Drag to edit VRAM pixel
  const handlePixelClick = (index: number) => {
    setVram((prev) => {
      const next = [...prev];
      next[index] = activeBrush;
      return next;
    });
    if (onVramUpdate) {
      onVramUpdate(index, standardIntToFourTrits(activeBrush));
    }
  };

  const handlePixelMouseEnter = (index: number) => {
    if (isMouseDown) {
      handlePixelClick(index);
    }
  };

  // Clear VRAM
  const handleClearVram = (fillTrit: TritValue) => {
    setVram(new Array<TritValue>(81).fill(fillTrit));
    setActiveDemo('idle');
  };

  // Run Wave animation
  useEffect(() => {
    if (activeDemo === 'wave') {
      const interval = window.setInterval(() => {
        waveStepRef.current = (waveStepRef.current + 1) % 81;
        const step = waveStepRef.current;

        setVram((_) => {
          const next = new Array<TritValue>(81);
          for (let r = 0; r < 9; r++) {
            for (let c = 0; c < 9; c++) {
              const dist = Math.sqrt((r - 4) ** 2 + (c - 4) ** 2);
              const val = Math.floor(Math.sin((dist * 0.8) - (step * 0.2)) * 1.5 + 1);
              const trit: TritValue = val <= 0 ? 0 : val >= 2 ? 2 : 1;
              next[r * 9 + c] = trit;
            }
          }
          return next;
        });
      }, 90);

      return () => clearInterval(interval);
    }
  }, [activeDemo]);

  // Render Tetris Polyomino to VRAM when in 'tetris' mode
  useEffect(() => {
    if (activeDemo === 'tetris') {
      const shape = TETRIS_SHAPES[activeShapeIdx];
      const baseGrid = new Array<TritValue>(81).fill(1); // 1 = 地

      shape.coords.forEach(([r, c]) => {
        const tr = r + shapeOffset.y;
        const tc = c + shapeOffset.x;
        if (tr >= 0 && tr < 9 && tc >= 0 && tc < 9) {
          baseGrid[tr * 9 + tc] = shape.colorTrit;
        }
      });

      setVram(baseGrid);
    }
  }, [activeDemo, activeShapeIdx, shapeOffset]);

  // Copy VRAM Hex dump
  const handleCopyDump = () => {
    const dump = vram.map((v, i) => `@0x${i.toString(16).padStart(2, '0')}: ${v}`).join('\n');
    navigator.clipboard.writeText(dump);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // VRAM Statistics
  const heavenCount = vram.filter((v) => v === 2).length;
  const earthCount = vram.filter((v) => v === 1).length;
  const humanCount = vram.filter((v) => v === 0).length;

  return (
    <div className="space-y-6">
      {/* Top Banner & Technical Specification */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-slate-800 text-white rounded-xl p-5 shadow-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <Tv className="w-5 h-5 text-amber-400" />
              <h3 className="text-base font-bold font-serif-tc text-slate-100">
                太玄三進制顯存 (VRAM) 與 鍵盤控制器 (Keyboard I/O)
              </h3>
              <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono-code border border-amber-500/30 font-bold">
                PROJECT 5 I/O
              </span>
            </div>
            <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
              在《Nand to Tetris》硬體體系中，<strong>Screen (顯存映射)</strong> 與 <strong>Keyboard (鍵盤暫存器)</strong> 是運行俄羅斯方塊的基石。
              太玄微機將 81 首空間映射為 <code className="text-amber-300 font-mono-code font-bold">9×9 = 81 像素點陣</code>，
              每個像素具備 <strong>天(金光)、地(玄黑)、人(朱赤)</strong> 三態，並以 <code className="text-sky-300 font-mono-code">@0x4F</code> 實時捕捉方向鍵與動作輸入。
            </p>
          </div>

          {/* Quick Stats Pill */}
          <div className="flex items-center gap-2 bg-slate-800/80 p-2.5 rounded-lg border border-slate-700/80 text-xs font-mono-code shrink-0">
            <div className="text-center px-2 border-r border-slate-700">
              <span className="text-[10px] text-amber-400 block font-sans">天(金)</span>
              <span className="font-bold text-slate-100">{heavenCount}</span>
            </div>
            <div className="text-center px-2 border-r border-slate-700">
              <span className="text-[10px] text-slate-400 block font-sans">地(玄)</span>
              <span className="font-bold text-slate-100">{earthCount}</span>
            </div>
            <div className="text-center px-2">
              <span className="text-[10px] text-rose-400 block font-sans">人(赤)</span>
              <span className="font-bold text-slate-100">{humanCount}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Screen Visualizer (Left) + Keyboard & IO Register (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: 9x9 VRAM Display Screen (7 cols) */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Tv className="w-4 h-4 text-sky-600 dark:text-sky-400" />
              <span className="text-sm font-bold text-slate-900 dark:text-slate-100 font-serif-tc">
                太玄 9×9 點陣顯存終端 (81-Trit Screen)
              </span>
            </div>

            {/* Brush Selector */}
            <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg text-xs">
              <span className="text-[11px] text-slate-500 pl-1 font-mono-code">畫筆:</span>
              <button
                type="button"
                onClick={() => setActiveBrush(2)}
                className={`px-2 py-0.5 rounded text-[11px] font-semibold flex items-center gap-1 transition-all ${
                  activeBrush === 2
                    ? 'bg-amber-500 text-white shadow-2xs'
                    : 'text-amber-600 dark:text-amber-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                <span>天 (金)</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveBrush(1)}
                className={`px-2 py-0.5 rounded text-[11px] font-semibold flex items-center gap-1 transition-all ${
                  activeBrush === 1
                    ? 'bg-slate-700 text-white shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                <span>地 (玄)</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveBrush(0)}
                className={`px-2 py-0.5 rounded text-[11px] font-semibold flex items-center gap-1 transition-all ${
                  activeBrush === 0
                    ? 'bg-rose-500 text-white shadow-2xs'
                    : 'text-rose-600 dark:text-rose-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                <span>人 (赤)</span>
              </button>
            </div>
          </div>

          {/* Interactive 9x9 Screen Canvas */}
          <div
            className="flex flex-col items-center justify-center p-4 bg-slate-950 rounded-xl border border-slate-800 select-none shadow-inner"
            onMouseDown={() => setIsMouseDown(true)}
            onMouseUp={() => setIsMouseDown(false)}
            onMouseLeave={() => setIsMouseDown(false)}
          >
            {/* The 9x9 Grid with subtle glow */}
            <div className="grid grid-cols-9 gap-1.5 p-3 bg-slate-900/90 rounded-lg border border-slate-800/80 shadow-2xl">
              {vram.map((val, idx) => {
                const r = Math.floor(idx / 9);
                const c = idx % 9;
                const head = TAI_XUAN_HEADS[idx];

                // Pixel appearance based on trit value
                let pixelClasses = 'bg-slate-800 border-slate-700/60 text-slate-500';
                if (val === 2) {
                  // 天 (Heaven / Gold)
                  pixelClasses = 'bg-amber-400 dark:bg-amber-400 border-amber-300 text-slate-950 shadow-[0_0_8px_rgba(251,191,36,0.6)] font-bold';
                } else if (val === 1) {
                  // 地 (Earth / Dark neutral)
                  pixelClasses = 'bg-slate-800 dark:bg-slate-800/90 border-slate-700 text-slate-400';
                } else if (val === 0) {
                  // 人 (Human / Vermilion red)
                  pixelClasses = 'bg-rose-500 dark:bg-rose-500 border-rose-400 text-white shadow-[0_0_8px_rgba(244,63,94,0.6)] font-bold';
                }

                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handlePixelClick(idx)}
                    onMouseEnter={() => handlePixelMouseEnter(idx)}
                    title={`@0x${idx.toString(16).padStart(2, '0')} (${r},${c}) 首${idx + 1}【${head?.name}】：${val === 2 ? '天' : val === 1 ? '地' : '人'}`}
                    className={`w-7 h-7 sm:w-9 sm:h-9 rounded-md border text-[10px] font-mono-code transition-all flex items-center justify-center cursor-pointer hover:scale-105 ${pixelClasses}`}
                  >
                    <span className="opacity-75">{val === 2 ? '⚊' : val === 1 ? '⚋' : '𝌀'}</span>
                  </button>
                );
              })}
            </div>

            {/* Screen Bottom Legend */}
            <div className="flex items-center justify-between w-full mt-3 text-[11px] font-mono-code text-slate-400 px-2">
              <span>顯存規格：9×9 點陣 (81 Trits)</span>
              <span className="flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block shadow-xs"></span> 天(2)
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-700 inline-block"></span> 地(1)
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block shadow-xs"></span> 人(0)
                </span>
              </span>
            </div>
          </div>

          {/* VRAM Controls Bar */}
          <div className="flex items-center justify-between flex-wrap gap-2 pt-1 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 font-mono-code">清屏重置:</span>
              <button
                type="button"
                onClick={() => handleClearVram(1)}
                className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              >
                中和 (全地)
              </button>
              <button
                type="button"
                onClick={() => handleClearVram(0)}
                className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-rose-600 dark:text-rose-400 rounded hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              >
                重置 (全人)
              </button>
              <button
                type="button"
                onClick={() => handleClearVram(2)}
                className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-amber-600 dark:text-amber-400 rounded hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              >
                泛光 (全天)
              </button>
            </div>

            <button
              type="button"
              onClick={handleCopyDump}
              className="px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors flex items-center gap-1.5"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? '已複製 VRAM' : '導出顯存轉儲 (Dump)'}</span>
            </button>
          </div>

          {/* Demo Programs Selector (Cursor, Tetris, Wave) */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
            <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>顯存 I/O 預載微程式展示 (I/O Demo Modes)</span>
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => {
                  setActiveDemo(activeDemo === 'cursor' ? 'idle' : 'cursor');
                  if (activeDemo !== 'cursor') {
                    setCursorPos({ x: 4, y: 4 });
                  }
                }}
                className={`p-2.5 rounded-lg border text-left transition-all text-xs ${
                  activeDemo === 'cursor'
                    ? 'bg-sky-50 dark:bg-sky-950/60 border-sky-400 text-sky-900 dark:text-sky-100 font-semibold'
                    : 'bg-slate-50/60 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                }`}
              >
                <div className="font-bold font-serif-tc">1. 太玄光標巡遊</div>
                <div className="text-[10px] text-slate-500 mt-0.5">鍵盤方向鍵自由操縱光標繪製軌跡</div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveDemo(activeDemo === 'tetris' ? 'idle' : 'tetris');
                  setShapeOffset({ x: 0, y: 0 });
                }}
                className={`p-2.5 rounded-lg border text-left transition-all text-xs ${
                  activeDemo === 'tetris'
                    ? 'bg-amber-50 dark:bg-amber-950/60 border-amber-400 text-amber-900 dark:text-amber-100 font-semibold'
                    : 'bg-slate-50/60 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                }`}
              >
                <div className="font-bold font-serif-tc">2. 方塊投影 (Tetris Poly)</div>
                <div className="text-[10px] text-slate-500 mt-0.5">三才方塊平移與旋轉變換預覽</div>
              </button>

              <button
                type="button"
                onClick={() => setActiveDemo(activeDemo === 'wave' ? 'idle' : 'wave')}
                className={`p-2.5 rounded-lg border text-left transition-all text-xs ${
                  activeDemo === 'wave'
                    ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-400 text-emerald-900 dark:text-emerald-100 font-semibold'
                    : 'bg-slate-50/60 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                }`}
              >
                <div className="font-bold font-serif-tc">3. 三才波浪動畫</div>
                <div className="text-[10px] text-slate-500 mt-0.5">連續時鐘刷新顯存波形</div>
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Keyboard Controller & I/O Registers (5 cols) */}
        <div className="lg:col-span-5 space-y-5">
          {/* Keyboard Controller Unit Card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <KeyboardIcon className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                <span className="text-sm font-bold text-slate-900 dark:text-slate-100 font-serif-tc">
                  鍵盤輸入暫存器 (@0x4F KBD)
                </span>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 font-mono-code font-bold">
                實體鍵盤已監聽
              </span>
            </div>

            {/* Current Key Register Display */}
            <div className="p-4 bg-slate-900 text-white rounded-xl border border-slate-800 space-y-3 shadow-inner">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono-code text-slate-400">當前按鍵暫存器數值:</span>
                <span className="text-xs font-mono-code text-amber-400 font-bold">
                  RAM[@0x4F] = {currentKeyCode}
                </span>
              </div>

              <div className="text-center py-2 bg-slate-800/80 rounded-lg border border-slate-700">
                <div className="text-lg font-bold text-amber-300 font-mono-code">
                  {currentKeyName}
                </div>
                <div className="text-xs text-slate-400 font-mono-code mt-1 flex items-center justify-center gap-1.5">
                  <span>三進制向量:</span>
                  <div className="flex items-center gap-1">
                    {currentKeyTrits.map((t, idx) => (
                      <TritBadge key={idx} val={t} mode={mode} size="sm" showSymbol={false} />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Virtual Directional D-Pad & Action Buttons */}
            <div className="space-y-2">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
                虛擬十字方向盤與動作鍵 (Virtual Pad)
              </span>
              <div className="flex flex-col items-center justify-center gap-2 p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800">
                {/* Up */}
                <button
                  type="button"
                  onClick={() => {
                    handleKeyDown(new KeyboardEvent('keydown', { code: 'ArrowUp' }));
                    handleKeyUp();
                  }}
                  className="w-12 h-10 rounded-lg bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 shadow-xs hover:bg-sky-50 dark:hover:bg-slate-600 flex items-center justify-center transition-all active:scale-95"
                  title="旋轉 / 向上 (ArrowUp / W)"
                >
                  <ArrowUp className="w-5 h-5 text-slate-700 dark:text-slate-200" />
                </button>

                {/* Left - Center - Right */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      handleKeyDown(new KeyboardEvent('keydown', { code: 'ArrowLeft' }));
                      handleKeyUp();
                    }}
                    className="w-12 h-10 rounded-lg bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 shadow-xs hover:bg-sky-50 dark:hover:bg-slate-600 flex items-center justify-center transition-all active:scale-95"
                    title="左移 (ArrowLeft / A)"
                  >
                    <ArrowLeft className="w-5 h-5 text-slate-700 dark:text-slate-200" />
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      handleKeyDown(new KeyboardEvent('keydown', { code: 'Space' }));
                      handleKeyUp();
                    }}
                    className="w-14 h-10 rounded-lg bg-amber-500 hover:bg-amber-400 text-white font-bold text-xs shadow-xs flex items-center justify-center transition-all active:scale-95"
                    title="動作 / 空格 (Space)"
                  >
                    <span>動作</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      handleKeyDown(new KeyboardEvent('keydown', { code: 'ArrowRight' }));
                      handleKeyUp();
                    }}
                    className="w-12 h-10 rounded-lg bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 shadow-xs hover:bg-sky-50 dark:hover:bg-slate-600 flex items-center justify-center transition-all active:scale-95"
                    title="右移 (ArrowRight / D)"
                  >
                    <ArrowRight className="w-5 h-5 text-slate-700 dark:text-slate-200" />
                  </button>
                </div>

                {/* Down */}
                <button
                  type="button"
                  onClick={() => {
                    handleKeyDown(new KeyboardEvent('keydown', { code: 'ArrowDown' }));
                    handleKeyUp();
                  }}
                  className="w-12 h-10 rounded-lg bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 shadow-xs hover:bg-sky-50 dark:hover:bg-slate-600 flex items-center justify-center transition-all active:scale-95"
                  title="急墜 / 向下 (ArrowDown / S)"
                >
                  <ArrowDown className="w-5 h-5 text-slate-700 dark:text-slate-200" />
                </button>
              </div>
            </div>

            {/* Keyboard History Trace */}
            <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
              <span className="text-[11px] font-mono-code text-slate-500 block">
                按鍵事件捕獲佇列 (Key Buffer Log):
              </span>
              <div className="max-h-28 overflow-y-auto space-y-1 font-mono-code text-[10px]">
                {keyHistory.length === 0 ? (
                  <div className="text-slate-400 italic py-2 text-center">
                    請按鍵盤上的方向鍵、WASD 或點擊方向盤
                  </div>
                ) : (
                  keyHistory.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-1.5 bg-slate-50 dark:bg-slate-800/50 rounded border border-slate-100 dark:border-slate-800 text-slate-700 dark:text-slate-300"
                    >
                      <span>{item.key}</span>
                      <span className="text-slate-400">代碼:{item.code} · {item.time}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Hardware Memory Map Architecture Reference Card */}
          <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-xl p-4 text-xs space-y-2.5">
            <span className="font-bold text-slate-900 dark:text-slate-100 font-serif-tc block">
              太玄計算機 I/O 記憶體位址映射規格 (Memory Map)
            </span>
            <div className="space-y-1 font-mono-code text-[11px]">
              <div className="flex items-center justify-between p-1.5 bg-white dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-800">
                <span className="text-sky-600 dark:text-sky-400 font-bold">@0x00 ~ @0x2F (0..47)</span>
                <span className="text-slate-600 dark:text-slate-400">數據工作區 / 變數暫存器 (R0~R7)</span>
              </div>
              <div className="flex items-center justify-between p-1.5 bg-amber-50 dark:bg-amber-950/40 rounded border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200">
                <span className="font-bold">@0x30 ~ @0x4E (48..78)</span>
                <span>顯存映射區 (VRAM 31 點陣緩衝段)</span>
              </div>
              <div className="flex items-center justify-between p-1.5 bg-emerald-50 dark:bg-emerald-950/40 rounded border border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200">
                <span className="font-bold">@0x4F (79)</span>
                <span>鍵盤輸入埠 (KBD Register)</span>
              </div>
              <div className="flex items-center justify-between p-1.5 bg-purple-50 dark:bg-purple-950/40 rounded border border-purple-200 dark:border-purple-800 text-purple-900 dark:text-purple-200">
                <span className="font-bold">@0x50 (80)</span>
                <span>幀垂直同步中斷 (V-SYNC Control)</span>
              </div>
            </div>
            <p className="text-[10px] text-slate-500 pt-1 leading-normal">
              註：此映射規格直接與後續 Project 6（太玄彙編器）的符號表及 Project 12（太玄作業系統 Screen.drawPixel / KBD.readKey）完全相容！
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
