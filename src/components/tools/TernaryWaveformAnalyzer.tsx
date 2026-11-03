/**
 * Ternary Digital Logic Waveform Analyzer (太玄三值時序邏輯分析儀)
 * Multi-channel real-time waveform oscilloscope for ternary digital signals
 * @license Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { TritValue, DisplayMode } from '../../types/ternary';
import { tNand, tAnd, tOr, tHalfAdder } from '../../lib/ternaryLogic';
import { TRIT_INFO, formatTrit } from '../../lib/taiXuanData';

interface WavePoint {
  cycle: number;
  clk: 0 | 1;
  inA: TritValue;
  inB: TritValue;
  tNandOut: TritValue;
  tAndOut: TritValue;
  tOrOut: TritValue;
  sum: TritValue;
  carry: TritValue;
}

interface TernaryWaveformAnalyzerProps {
  mode: DisplayMode;
}

export const TernaryWaveformAnalyzer: React.FC<TernaryWaveformAnalyzerProps> = ({ mode }) => {
  const [history, setHistory] = useState<WavePoint[]>([]);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [inA, setInA] = useState<TritValue>(2);
  const [inB, setInB] = useState<TritValue>(1);
  const [cycleCount, setCycleCount] = useState<number>(0);
  const [patternMode, setPatternMode] = useState<'manual' | 'sweep' | 'random'>('sweep');

  const intervalRef = useRef<number | null>(null);

  // Calculate live values
  const computePoint = (c: number, a: TritValue, b: TritValue, clkVal: 0 | 1): WavePoint => {
    const ha = tHalfAdder(a, b);
    return {
      cycle: c,
      clk: clkVal,
      inA: a,
      inB: b,
      tNandOut: tNand(a, b),
      tAndOut: tAnd(a, b),
      tOrOut: tOr(a, b),
      sum: ha.sum,
      carry: ha.carry,
    };
  };

  // Initialize with initial points
  useEffect(() => {
    const initial: WavePoint[] = [];
    const values: TritValue[] = [0, 1, 2];
    let c = 0;
    for (const a of values) {
      for (const b of values) {
        c++;
        initial.push(computePoint(c, a, b, (c % 2 === 0 ? 1 : 0)));
      }
    }
    setHistory(initial);
    setCycleCount(c);
  }, []);

  const stepNext = () => {
    setCycleCount((prevC) => {
      const nextC = prevC + 1;
      let nextA = inA;
      let nextB = inB;

      if (patternMode === 'sweep') {
        // Sequentially sweep all 9 combinations
        const step = nextC % 9;
        nextA = (Math.floor(step / 3) % 3) as TritValue;
        nextB = (step % 3) as TritValue;
        setInA(nextA);
        setInB(nextB);
      } else if (patternMode === 'random') {
        nextA = (Math.floor(Math.random() * 3)) as TritValue;
        nextB = (Math.floor(Math.random() * 3)) as TritValue;
        setInA(nextA);
        setInB(nextB);
      }

      const clkVal = (nextC % 2 === 0 ? 1 : 0) as 0 | 1;
      const pt = computePoint(nextC, nextA, nextB, clkVal);

      setHistory((prev) => [...prev.slice(-17), pt]);
      return nextC;
    });
  };

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = window.setInterval(() => {
        stepNext();
      }, 700);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunning, inA, inB, patternMode]);

  const channels: Array<{
    id: keyof WavePoint;
    name: string;
    label: string;
    color: string;
    isBinary?: boolean;
  }> = [
    { id: 'clk', name: '時鐘脈衝 (CLK)', label: '時鐘', color: '#94a3b8', isBinary: true },
    { id: 'inA', name: '輸入端 A (Pin A)', label: '信號A', color: '#38bdf8' },
    { id: 'inB', name: '輸入端 B (Pin B)', label: '信號B', color: '#38bdf8' },
    { id: 'tNandOut', name: '元始 T-NAND 輸出', label: 'T-NAND', color: '#f43f5e' },
    { id: 'tAndOut', name: '太玄與門 T-AND (min)', label: 'T-AND', color: '#10b981' },
    { id: 'tOrOut', name: '太玄或門 T-OR (max)', label: 'T-OR', color: '#a855f7' },
    { id: 'sum', name: '半加器本位和 (Sum)', label: 'Sum', color: '#f59e0b' },
    { id: 'carry', name: '半加器進位 (Carry)', label: 'Carry', color: '#06b6d4' },
  ];

  // Render SVG waveform for a channel
  const renderWaveform = (ch: typeof channels[0]) => {
    if (history.length === 0) return null;

    const width = 640;
    const height = 36;
    const stepX = width / Math.max(1, history.length - 1);

    // Map trit value 2(天)->top(4), 1(地)->mid(18), 0(人)->bottom(32)
    const getY = (val: number) => {
      if (ch.isBinary) {
        return val === 1 ? 6 : 30;
      }
      if (val === 2) return 5;   // 天
      if (val === 1) return 18;  // 地
      return 31;                 // 人
    };

    let pathD = '';
    history.forEach((pt, idx) => {
      const x = idx * stepX;
      const y = getY(pt[ch.id] as number);

      if (idx === 0) {
        pathD += `M ${x} ${y}`;
      } else {
        const prevY = getY(history[idx - 1][ch.id] as number);
        // Square transition: horizontal to current X, then vertical to current Y
        pathD += ` L ${x} ${prevY} L ${x} ${y}`;
      }
    });

    const latestVal = history[history.length - 1][ch.id] as number;

    return (
      <div key={ch.id} className="flex items-center gap-3 py-1.5 border-b border-slate-800/60 last:border-0">
        <div className="w-28 shrink-0">
          <span className="text-[11px] font-mono-code font-bold text-slate-300 block truncate" title={ch.name}>
            {ch.label}
          </span>
          <span className="text-[10px] font-mono-code text-slate-400">
            {ch.isBinary
              ? latestVal === 1 ? '高電位 1' : '低電位 0'
              : formatTrit(latestVal as TritValue, mode)}
          </span>
        </div>

        <div className="flex-1 bg-slate-950/70 rounded-md border border-slate-800 px-2 py-1 overflow-hidden relative">
          {/* Level Guide Lines */}
          <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-20 px-2 py-1">
            <div className="border-b border-dashed border-sky-400 w-full" />
            <div className="border-b border-dashed border-amber-400 w-full" />
            <div className="border-b border-dashed border-violet-400 w-full" />
          </div>

          <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-8 overflow-visible">
            <path
              d={pathD}
              fill="none"
              stroke={ch.color}
              strokeWidth="2.2"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
            {/* Latest point dot */}
            {history.length > 0 && (
              <circle
                cx={(history.length - 1) * stepX}
                cy={getY(latestVal)}
                r="3.5"
                fill={ch.color}
              />
            )}
          </svg>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-white shadow-xl space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <span className="text-xs font-mono-code text-sky-400 block mb-1">
            DIGITAL LOGIC TIMING OSCILLOSCOPE
          </span>
          <h3 className="text-lg font-bold font-serif-tc text-slate-100">
            太玄三值多通道邏輯時序分析儀
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            實時捕獲高電平（天 ⚊）、中電平（地 ⚋）、低電平（人 𝌀）在各級門電路中的波形響應
          </p>
        </div>

        {/* Oscilloscope Controls */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="flex items-center p-0.5 bg-slate-800 rounded-lg text-xs font-mono-code border border-slate-700">
            <button
              type="button"
              onClick={() => setPatternMode('sweep')}
              className={`px-2.5 py-1 rounded transition-colors ${
                patternMode === 'sweep' ? 'bg-sky-600 text-white font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              真值掃描 (Sweep)
            </button>
            <button
              type="button"
              onClick={() => setPatternMode('random')}
              className={`px-2.5 py-1 rounded transition-colors ${
                patternMode === 'random' ? 'bg-sky-600 text-white font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              隨機噪聲 (Noise)
            </button>
            <button
              type="button"
              onClick={() => setPatternMode('manual')}
              className={`px-2.5 py-1 rounded transition-colors ${
                patternMode === 'manual' ? 'bg-sky-600 text-white font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              手動輸入 (Manual)
            </button>
          </div>

          <button
            type="button"
            onClick={() => setIsRunning(!isRunning)}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold shadow-xs transition-colors flex items-center gap-1.5 ${
              isRunning ? 'bg-amber-600 hover:bg-amber-500' : 'bg-emerald-600 hover:bg-emerald-500'
            }`}
          >
            <span>{isRunning ? '⏸ 暫停時鐘' : '▶ 啟動脈衝'}</span>
          </button>

          <button
            type="button"
            onClick={stepNext}
            disabled={isRunning}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 disabled:opacity-40 rounded-lg text-xs font-mono-code border border-slate-700 transition-colors"
          >
            單步時鐘 (CLK+1)
          </button>
        </div>
      </div>

      {/* Manual Input Controls when in manual mode */}
      {patternMode === 'manual' && (
        <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700/80 flex items-center gap-6 text-xs">
          <span className="text-slate-400 font-mono-code">手動調節引腳：</span>
          <div className="flex items-center gap-2">
            <span className="text-slate-300">輸入 A:</span>
            {[0, 1, 2].map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setInA(v as TritValue)}
                className={`px-2 py-0.5 rounded font-mono-code ${
                  inA === v ? 'bg-sky-500 text-white font-bold' : 'bg-slate-700 text-slate-300'
                }`}
              >
                {TRIT_INFO[v as TritValue].name}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-slate-300">輸入 B:</span>
            {[0, 1, 2].map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setInB(v as TritValue)}
                className={`px-2 py-0.5 rounded font-mono-code ${
                  inB === v ? 'bg-sky-500 text-white font-bold' : 'bg-slate-700 text-slate-300'
                }`}
              >
                {TRIT_INFO[v as TritValue].name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Waveform Trace Stack */}
      <div className="space-y-1 bg-slate-950/50 p-4 rounded-xl border border-slate-800">
        <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono-code pb-1 border-b border-slate-800">
          <span>信號通道路徑 (Signal Channel)</span>
          <span>三值階躍電平：天(頂部) · 地(居中) · 人(基底)</span>
        </div>

        {channels.map((ch) => renderWaveform(ch))}
      </div>

      {/* Timeline ruler */}
      <div className="flex items-center justify-between text-[10px] font-mono-code text-slate-500 px-2">
        <span>歷史採樣幀 T-18</span>
        <span>當前時鐘週期：#{cycleCount}</span>
        <span>實時最新幀 T0</span>
      </div>
    </div>
  );
};
