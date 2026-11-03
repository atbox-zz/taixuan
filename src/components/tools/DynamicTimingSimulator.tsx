/**
 * Dynamic Timing & Sequential Simulation Panel (動態時序模擬)
 * Interactive D3.js timing diagram illustrating Clock pulses, Tri-stable Latch,
 * edge-triggered T-Flip-Flop (T-DFF), 4-Trit Register, and CPU pipeline stages.
 * @license Apache-2.0
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import * as d3 from 'd3';
import { TritValue, DisplayMode } from '../../types/ternary';
import { TRIT_INFO, TAI_XUAN_HEADS, formatTrit, fourTritsToStandardInt } from '../../lib/taiXuanData';
import { TritBadge } from '../TritBadge';

interface DynamicTimingSimulatorProps {
  mode: DisplayMode;
}

export type CpuStage = 'FETCH' | 'DECODE' | 'EXECUTE' | 'WRITEBACK';

export interface TimingSample {
  timeIndex: number; // 0, 1, 2, 3 ... (each integer is a half-cycle)
  cycle: number; // Math.floor(timeIndex / 2)
  phase: 'LOW' | 'HIGH';
  clk: 0 | 1;
  dIn: TritValue;
  writeEnable: boolean;
  qLatch: TritValue;
  qFlipFlop: TritValue;
  reg4: [TritValue, TritValue, TritValue, TritValue];
  regHeadName: string;
  regHeadIndex: number;
  cpuStage: CpuStage;
  cpuPc: number;
  isRisingEdge: boolean;
}

const PRESET_SEQUENCES: Record<
  string,
  {
    name: string;
    desc: string;
    sequence: Array<{ d: TritValue; en: boolean; reg?: [TritValue, TritValue, TritValue, TritValue] }>;
  }
> = {
  cpuPipeline: {
    name: 'CPU 四階流水線時序追蹤 (Fetch → Writeback)',
    desc: '展示 CPU 從 ROM 取指、指令譯碼、4-Trit ALU 運算到最後將結果寫回寄存器的完整時鐘同步過程。',
    sequence: [
      { d: 2, en: true, reg: [0, 0, 0, 1] }, // Fetch
      { d: 2, en: false, reg: [0, 0, 0, 1] }, // Decode
      { d: 1, en: false, reg: [0, 0, 0, 1] }, // Execute
      { d: 1, en: true, reg: [0, 0, 1, 0] }, // Writeback
      { d: 0, en: true, reg: [0, 0, 1, 2] }, // Next Fetch
      { d: 0, en: false, reg: [0, 0, 1, 2] },
      { d: 2, en: false, reg: [0, 0, 1, 2] },
      { d: 2, en: true, reg: [0, 1, 1, 0] },
      { d: 1, en: true, reg: [0, 2, 1, 1] },
      { d: 1, en: false, reg: [0, 2, 1, 1] },
      { d: 2, en: false, reg: [0, 2, 1, 1] },
      { d: 2, en: true, reg: [1, 1, 1, 1] },
    ],
  },
  fibonacci: {
    name: '斐波那契首象演進時序 (Fibonacci State Sequence)',
    desc: '四爻寄存器在時鐘上升沿逐次累加，展現從【中首】、【羨首】、【睟首】至【少首】的狀態跳變。',
    sequence: [
      { d: 2, en: true, reg: [0, 0, 0, 1] },
      { d: 1, en: true, reg: [0, 0, 0, 2] },
      { d: 0, en: true, reg: [0, 0, 1, 0] },
      { d: 2, en: true, reg: [0, 0, 1, 2] },
      { d: 1, en: true, reg: [0, 0, 2, 2] },
      { d: 0, en: true, reg: [0, 1, 1, 1] },
      { d: 2, en: true, reg: [0, 2, 1, 0] },
      { d: 1, en: true, reg: [1, 1, 2, 1] },
    ],
  },
  raceCondition: {
    name: '鎖存器穿透對比正反器防冒險 (Latch vs Flip-Flop Race)',
    desc: '模擬高電平期間輸入頻繁抖動，直觀揭示電平敏感鎖存器（Latch）的毛刺穿透，與邊沿觸發正反器（T-DFF）的穩定鎖定。',
    sequence: [
      { d: 2, en: true, reg: [0, 0, 0, 0] },
      { d: 0, en: true, reg: [0, 0, 0, 0] },
      { d: 1, en: true, reg: [1, 1, 1, 1] },
      { d: 2, en: true, reg: [1, 1, 1, 1] },
      { d: 0, en: false, reg: [1, 1, 1, 1] },
      { d: 1, en: false, reg: [1, 1, 1, 1] },
      { d: 2, en: true, reg: [2, 2, 1, 0] },
      { d: 0, en: true, reg: [2, 2, 1, 0] },
    ],
  },
};

export const DynamicTimingSimulator: React.FC<DynamicTimingSimulatorProps> = ({ mode }) => {
  const svgRef = useRef<SVGSVGElement | null>(null);

  // Simulation State
  const [samples, setSamples] = useState<TimingSample[]>([]);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [speedMs, setSpeedMs] = useState<number>(600); // interval per half-step
  const [activePreset, setActivePreset] = useState<string>('cpuPipeline');

  // Manual interactive inputs for when user tweaks inputs
  const [manualD, setManualD] = useState<TritValue>(2);
  const [manualEn, setManualEn] = useState<boolean>(true);

  // Selected sample for time-cursor inspection
  const [inspectedIndex, setInspectedIndex] = useState<number | null>(null);

  // Initialize simulation trace with initial cycles
  const resetSimulation = () => {
    const initial: TimingSample[] = [];
    let curLatch: TritValue = 1;
    let curFlipFlop: TritValue = 1;
    let curReg: [TritValue, TritValue, TritValue, TritValue] = [0, 0, 0, 0];
    let curPc = 0;

    const presetSeq = PRESET_SEQUENCES[activePreset].sequence;
    const stages: CpuStage[] = ['FETCH', 'DECODE', 'EXECUTE', 'WRITEBACK'];

    for (let i = 0; i < 16; i++) {
      const cycle = Math.floor(i / 2);
      const isHighPhase = i % 2 === 1;
      const clk: 0 | 1 = isHighPhase ? 1 : 0;
      const isRisingEdge = isHighPhase; // 0 -> 1 occurs at high phase entry

      const seqItem = presetSeq[cycle % presetSeq.length];
      const dIn = seqItem.d;
      const writeEnable = seqItem.en;

      // Level-sensitive Latch logic: transparent when CLK=1 and EN=true
      if (clk === 1 && writeEnable) {
        curLatch = dIn;
      }

      // Edge-triggered T-Flip-Flop logic: updates strictly on rising edge (isRisingEdge) when enabled
      if (isRisingEdge && writeEnable) {
        curFlipFlop = dIn;
        if (seqItem.reg) {
          curReg = [...seqItem.reg];
        }
      }

      const cpuStage = stages[cycle % 4];
      if (cycle % 4 === 0 && isRisingEdge) {
        curPc = (Math.floor(cycle / 4)) % 16;
      }

      const stdVal = fourTritsToStandardInt(curReg);
      const head = TAI_XUAN_HEADS[stdVal] || TAI_XUAN_HEADS[0];

      initial.push({
        timeIndex: i,
        cycle,
        phase: isHighPhase ? 'HIGH' : 'LOW',
        clk,
        dIn,
        writeEnable,
        qLatch: curLatch,
        qFlipFlop: curFlipFlop,
        reg4: [...curReg],
        regHeadName: head.name,
        regHeadIndex: head.index,
        cpuStage,
        cpuPc: curPc,
        isRisingEdge,
      });
    }

    setSamples(initial);
    setInspectedIndex(initial.length - 1);
  };

  useEffect(() => {
    resetSimulation();
  }, [activePreset]);

  // Step simulation forward by one half-cycle
  const stepClockHalfCycle = () => {
    setSamples((prev) => {
      const last = prev[prev.length - 1];
      const nextIndex = last ? last.timeIndex + 1 : 0;
      const cycle = Math.floor(nextIndex / 2);
      const isHighPhase = nextIndex % 2 === 1;
      const clk: 0 | 1 = isHighPhase ? 1 : 0;
      const isRisingEdge = isHighPhase;

      const presetSeq = PRESET_SEQUENCES[activePreset]?.sequence || [];
      const seqItem = presetSeq[cycle % presetSeq.length] || { d: manualD, en: manualEn };
      const dIn = activePreset === 'manual' ? manualD : seqItem.d;
      const writeEnable = activePreset === 'manual' ? manualEn : seqItem.en;

      let curLatch = last ? last.qLatch : 1;
      let curFlipFlop = last ? last.qFlipFlop : 1;
      let curReg: [TritValue, TritValue, TritValue, TritValue] = last ? [...last.reg4] : [0, 0, 0, 0];
      let curPc = last ? last.cpuPc : 0;

      // Latch transparent when clk=1 and en=true
      if (clk === 1 && writeEnable) {
        curLatch = dIn;
      }

      // Flip flop strictly edge triggered
      if (isRisingEdge && writeEnable) {
        curFlipFlop = dIn;
        if (seqItem.reg) {
          curReg = [...seqItem.reg];
        } else {
          // shift or accumulate
          curReg = [curReg[1], curReg[2], curReg[3], dIn];
        }
      }

      const stages: CpuStage[] = ['FETCH', 'DECODE', 'EXECUTE', 'WRITEBACK'];
      const cpuStage = stages[cycle % 4];
      if (cycle % 4 === 0 && isRisingEdge) {
        curPc = (curPc + 1) % 16;
      }

      const stdVal = fourTritsToStandardInt(curReg);
      const head = TAI_XUAN_HEADS[stdVal] || TAI_XUAN_HEADS[0];

      const newSample: TimingSample = {
        timeIndex: nextIndex,
        cycle,
        phase: isHighPhase ? 'HIGH' : 'LOW',
        clk,
        dIn,
        writeEnable,
        qLatch: curLatch,
        qFlipFlop: curFlipFlop,
        reg4: curReg,
        regHeadName: head.name,
        regHeadIndex: head.index,
        cpuStage,
        cpuPc: curPc,
        isRisingEdge,
      };

      // Keep sliding window of latest 24 half-cycles
      const updated = [...prev.slice(-23), newSample];
      setInspectedIndex(updated.length - 1);
      return updated;
    });
  };

  // Auto playback ticker
  useEffect(() => {
    let timer: number | null = null;
    if (isPlaying) {
      timer = window.setInterval(() => {
        stepClockHalfCycle();
      }, speedMs);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isPlaying, speedMs, activePreset, manualD, manualEn]);

  // D3 Rendering of Timing Diagram
  useEffect(() => {
    if (!svgRef.current || samples.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const width = 880;
    const height = 430;
    const margin = { top: 35, right: 30, bottom: 25, left: 165 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const g = svg
      .append('g')
      .attr('transform', `translate(${margin.left}, ${margin.top})`);

    // Channel Layout Definitions (Y coordinates)
    const channels = [
      { id: 'clk', label: 'CLK 時鐘脈衝', y: 0, height: 36, type: 'binary' },
      { id: 'dIn', label: 'D_in 激勵數據', y: 52, height: 48, type: 'ternary' },
      { id: 'en', label: 'EN 寫入致能', y: 114, height: 32, type: 'binary' },
      { id: 'latch', label: 'Q_Latch 鎖存器 (電平)', y: 160, height: 48, type: 'ternary' },
      { id: 'flipflop', label: 'Q_DFF 正反器 (邊沿)', y: 222, height: 48, type: 'ternary' },
      { id: 'reg4', label: 'REG4 四爻主寄存器', y: 284, height: 36, type: 'bus' },
      { id: 'cpu', label: 'CPU 流水線微週期', y: 334, height: 36, type: 'pipeline' },
    ];

    // X Scale: spans the half-cycle samples
    const xScale = d3
      .scaleLinear()
      .domain([0, Math.max(samples.length - 1, 1)])
      .range([0, innerWidth]);

    // Draw Channel Background Rows & Separator Lines
    channels.forEach((ch, idx) => {
      // Row alternate background
      g.append('rect')
        .attr('x', 0)
        .attr('y', ch.y - 4)
        .attr('width', innerWidth)
        .attr('height', ch.height + 8)
        .attr('fill', idx % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.04)')
        .attr('rx', 4);

      // Channel label in left margin
      svg
        .append('text')
        .attr('x', margin.left - 12)
        .attr('y', margin.top + ch.y + ch.height / 2 + 4)
        .attr('text-anchor', 'end')
        .attr('fill', '#94a3b8')
        .attr('font-size', '11px')
        .attr('font-family', 'monospace')
        .attr('font-weight', ch.id === 'flipflop' || ch.id === 'clk' ? 'bold' : 'normal')
        .text(ch.label);
    });

    // Vertical Clock Cycle Grid Lines
    samples.forEach((s, i) => {
      if (s.phase === 'LOW') {
        const xPos = xScale(i);
        // Vertical dashed line for full clock boundary
        g.append('line')
          .attr('x1', xPos)
          .attr('y1', 0)
          .attr('x2', xPos)
          .attr('y2', innerHeight)
          .attr('stroke', '#334155')
          .attr('stroke-dasharray', '2 3')
          .attr('stroke-width', 1);

        // Cycle label at top
        g.append('text')
          .attr('x', xPos + (innerWidth / (samples.length - 1)))
          .attr('y', -10)
          .attr('text-anchor', 'middle')
          .attr('fill', '#64748b')
          .attr('font-size', '10px')
          .attr('font-family', 'monospace')
          .text(`T${s.cycle}`);
      }
    });

    // 1. Channel: CLK
    const clkCh = channels.find((c) => c.id === 'clk')!;
    const clkPoints: [number, number][] = samples.map((s, i) => [
      xScale(i),
      clkCh.y + (s.clk === 1 ? 4 : clkCh.height),
    ]);

    const stepLineGenerator = d3.line<[number, number]>().curve(d3.curveStepAfter);

    g.append('path')
      .datum(clkPoints)
      .attr('d', stepLineGenerator)
      .attr('fill', 'none')
      .attr('stroke', '#38bdf8')
      .attr('stroke-width', 2.2);

    // Rising Edge Markers ⚡ on CLK
    samples.forEach((s, i) => {
      if (s.isRisingEdge) {
        const xPos = xScale(i);
        g.append('circle')
          .attr('cx', xPos)
          .attr('cy', clkCh.y + 4)
          .attr('r', 3)
          .attr('fill', '#38bdf8')
          .attr('stroke', '#0284c7');

        g.append('text')
          .attr('x', xPos)
          .attr('y', clkCh.y - 3)
          .attr('text-anchor', 'middle')
          .attr('fill', '#38bdf8')
          .attr('font-size', '9px')
          .attr('font-weight', 'bold')
          .text('↗');
      }
    });

    // Helper to calculate Y position for Ternary signals (0:人, 1:地, 2:天)
    const getTernaryY = (val: TritValue, baseY: number, chHeight: number) => {
      if (val === 2) return baseY + 6; // 天 (High)
      if (val === 1) return baseY + chHeight / 2; // 地 (Middle)
      return baseY + chHeight - 4; // 人 (Low)
    };

    const getTernaryColor = (val: TritValue) => {
      if (val === 2) return '#0284c7'; // 天 Sky
      if (val === 1) return '#d97706'; // 地 Amber
      return '#7c3aed'; // 人 Violet
    };

    // 2. Channel: D_in
    const dInCh = channels.find((c) => c.id === 'dIn')!;
    const dInPoints: [number, number][] = samples.map((s, i) => [
      xScale(i),
      getTernaryY(s.dIn, dInCh.y, dInCh.height),
    ]);

    g.append('path')
      .datum(dInPoints)
      .attr('d', stepLineGenerator)
      .attr('fill', 'none')
      .attr('stroke', '#e2e8f0')
      .attr('stroke-width', 1.8);

    // 3. Channel: EN (Write Enable)
    const enCh = channels.find((c) => c.id === 'en')!;
    const enPoints: [number, number][] = samples.map((s, i) => [
      xScale(i),
      enCh.y + (s.writeEnable ? 3 : enCh.height),
    ]);

    g.append('path')
      .datum(enPoints)
      .attr('d', stepLineGenerator)
      .attr('fill', 'none')
      .attr('stroke', '#10b981')
      .attr('stroke-width', 1.8);

    // 4. Channel: Q_Latch (Level-Sensitive)
    const latchCh = channels.find((c) => c.id === 'latch')!;
    const latchPoints: [number, number][] = samples.map((s, i) => [
      xScale(i),
      getTernaryY(s.qLatch, latchCh.y, latchCh.height),
    ]);

    g.append('path')
      .datum(latchPoints)
      .attr('d', stepLineGenerator)
      .attr('fill', 'none')
      .attr('stroke', '#f59e0b')
      .attr('stroke-width', 2);

    // 5. Channel: Q_FlipFlop (Edge-Triggered)
    const ffCh = channels.find((c) => c.id === 'flipflop')!;
    const ffPoints: [number, number][] = samples.map((s, i) => [
      xScale(i),
      getTernaryY(s.qFlipFlop, ffCh.y, ffCh.height),
    ]);

    g.append('path')
      .datum(ffPoints)
      .attr('d', stepLineGenerator)
      .attr('fill', 'none')
      .attr('stroke', '#06b6d4')
      .attr('stroke-width', 2.4);

    // Discrete Trit Node Badges on Q_FlipFlop
    samples.forEach((s, i) => {
      const x = xScale(i);
      const y = getTernaryY(s.qFlipFlop, ffCh.y, ffCh.height);
      g.append('circle')
        .attr('cx', x)
        .attr('cy', y)
        .attr('r', 3)
        .attr('fill', getTernaryColor(s.qFlipFlop));
    });

    // 6. Channel: 4-Trit Register (Bus Block View)
    const regCh = channels.find((c) => c.id === 'reg4')!;
    const cycleWidth = (innerWidth / (samples.length - 1)) * 2;

    for (let c = 0; c < Math.floor(samples.length / 2); c++) {
      const sampleAtRising = samples[c * 2 + 1] || samples[c * 2];
      const startX = xScale(c * 2);
      const blockWidth = Math.min(cycleWidth, innerWidth - startX);

      const blockG = g.append('g').attr('transform', `translate(${startX}, ${regCh.y})`);

      // Block outline
      blockG
        .append('rect')
        .attr('width', Math.max(blockWidth - 3, 2))
        .attr('height', regCh.height)
        .attr('fill', '#0f172a')
        .attr('stroke', '#3b82f6')
        .attr('stroke-width', 1.2)
        .attr('rx', 4);

      // Text label inside
      if (blockWidth > 45) {
        blockG
          .append('text')
          .attr('x', blockWidth / 2)
          .attr('y', regCh.height / 2 + 4)
          .attr('text-anchor', 'middle')
          .attr('fill', '#93c5fd')
          .attr('font-size', '10px')
          .attr('font-family', 'monospace')
          .text(`【${sampleAtRising.regHeadName}】#${sampleAtRising.regHeadIndex}`);
      }
    }

    // 7. Channel: CPU Pipeline Stages
    const cpuCh = channels.find((c) => c.id === 'cpu')!;
    const stageColors: Record<CpuStage, { bg: string; text: string }> = {
      FETCH: { bg: '#0369a1', text: '#bae6fd' },
      DECODE: { bg: '#4338ca', text: '#c7d2fe' },
      EXECUTE: { bg: '#b45309', text: '#fde68a' },
      WRITEBACK: { bg: '#047857', text: '#a7f3d0' },
    };

    for (let c = 0; c < Math.floor(samples.length / 2); c++) {
      const sample = samples[c * 2];
      const startX = xScale(c * 2);
      const blockWidth = Math.min(cycleWidth, innerWidth - startX);
      const col = stageColors[sample.cpuStage];

      const stageG = g.append('g').attr('transform', `translate(${startX}, ${cpuCh.y})`);

      stageG
        .append('rect')
        .attr('width', Math.max(blockWidth - 3, 2))
        .attr('height', cpuCh.height)
        .attr('fill', col.bg)
        .attr('stroke', '#1e293b')
        .attr('rx', 4);

      if (blockWidth > 40) {
        stageG
          .append('text')
          .attr('x', blockWidth / 2)
          .attr('y', cpuCh.height / 2 + 3)
          .attr('text-anchor', 'middle')
          .attr('fill', col.text)
          .attr('font-size', '9px')
          .attr('font-family', 'monospace')
          .attr('font-weight', 'bold')
          .text(sample.cpuStage);
      }
    }

    // Current Timeline Playhead Cursor
    if (inspectedIndex !== null && inspectedIndex < samples.length) {
      const curX = xScale(inspectedIndex);
      g.append('line')
        .attr('x1', curX)
        .attr('y1', -8)
        .attr('x2', curX)
        .attr('y2', innerHeight)
        .attr('stroke', '#f43f5e')
        .attr('stroke-width', 2)
        .attr('stroke-dasharray', '3 2');

      g.append('polygon')
        .attr(
          'points',
          `${curX - 5},-12 ${curX + 5},-12 ${curX},-4`
        )
        .attr('fill', '#f43f5e');
    }
  }, [samples, inspectedIndex]);

  const currentSample = useMemo(() => {
    if (inspectedIndex === null || inspectedIndex >= samples.length) {
      return samples[samples.length - 1] || null;
    }
    return samples[inspectedIndex];
  }, [samples, inspectedIndex]);

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-6">
      {/* Editorial Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono-code text-sky-600 dark:text-sky-400">
              DYNAMIC TIMING & SEQUENTIAL SIMULATION (D3.JS)
            </span>
            <span className="text-slate-300 dark:text-slate-700">·</span>
            <span className="text-xs font-mono-code text-slate-500">時鐘脈衝與正反器狀態跳變</span>
          </div>
          <h3 className="text-xl font-bold font-serif-tc text-slate-900 dark:text-slate-100 mt-1">
            太玄動態時序模擬器：從鎖存器到 CPU 微流水線
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-2xl leading-relaxed">
            利用 D3.js 繪製實時多通道三值波形時序圖，直觀展現由 Chapter 6 三穩態鎖存器（電平透明）演進為
            <strong>邊沿觸發三值正反器（T-DFF）</strong>、<strong>四爻主寄存器</strong>，並最終驅動
            <strong>Chapter 7 CPU 四步流水線（取指 → 譯碼 → 運算 → 回寫）</strong>的時序機制。
          </p>
        </div>

        {/* Playback & Step Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setIsPlaying(!isPlaying)}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all shadow-xs flex items-center gap-1.5 ${
              isPlaying
                ? 'bg-amber-600 hover:bg-amber-500 text-white'
                : 'bg-sky-600 hover:bg-sky-500 text-white'
            }`}
          >
            <span>{isPlaying ? '⏸ 暫停' : '▶ 連續模擬 (Run)'}</span>
          </button>

          <button
            type="button"
            onClick={stepClockHalfCycle}
            disabled={isPlaying}
            className="px-3 py-1.5 text-xs font-medium bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-50 text-slate-800 dark:text-slate-200 rounded-lg transition-colors border border-slate-200 dark:border-slate-700 flex items-center gap-1"
          >
            <span>⚡ 單步前進 (Step)</span>
          </button>

          <button
            type="button"
            onClick={resetSimulation}
            className="px-2.5 py-1.5 text-xs font-medium bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 rounded-lg transition-colors border border-slate-200 dark:border-slate-700"
            title="重置時鐘時序"
          >
            ↺ 重置
          </button>

          {/* Speed Toggle */}
          <div className="flex items-center p-0.5 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 text-[10px] font-mono-code">
            <button
              type="button"
              onClick={() => setSpeedMs(900)}
              className={`px-2 py-1 rounded ${speedMs === 900 ? 'bg-white dark:bg-slate-900 font-bold text-sky-600' : 'text-slate-500'}`}
            >
              0.5x
            </button>
            <button
              type="button"
              onClick={() => setSpeedMs(600)}
              className={`px-2 py-1 rounded ${speedMs === 600 ? 'bg-white dark:bg-slate-900 font-bold text-sky-600' : 'text-slate-500'}`}
            >
              1.0x
            </button>
            <button
              type="button"
              onClick={() => setSpeedMs(280)}
              className={`px-2 py-1 rounded ${speedMs === 280 ? 'bg-white dark:bg-slate-900 font-bold text-sky-600' : 'text-slate-500'}`}
            >
              2.0x
            </button>
          </div>
        </div>
      </div>

      {/* Preset Scenario Selector Strip */}
      <div className="flex items-center justify-between flex-wrap gap-2 text-xs bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="font-semibold text-slate-700 dark:text-slate-300 font-mono-code mr-1">
            時序實驗場景:
          </span>
          {Object.entries(PRESET_SEQUENCES).map(([key, item]) => (
            <button
              key={key}
              type="button"
              onClick={() => {
                setActivePreset(key);
                setIsPlaying(false);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs transition-colors font-medium ${
                activePreset === key
                  ? 'bg-sky-600 text-white font-bold shadow-xs'
                  : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              {item.name}
            </button>
          ))}
        </div>

        <div className="text-[11px] text-slate-500">
          {PRESET_SEQUENCES[activePreset]?.desc}
        </div>
      </div>

      {/* Main D3 Timing Canvas */}
      <div className="bg-slate-950 rounded-2xl p-4 border border-slate-800 relative shadow-inner overflow-x-auto">
        <div className="flex items-center justify-between text-[11px] font-mono-code text-slate-400 pb-2 border-b border-slate-800/80 mb-2 min-w-[850px]">
          <div className="flex items-center gap-4">
            <span className="text-sky-400 font-bold">● 多通道三值同步時序圖 (Multi-Channel Trace)</span>
            <span>高電平: 天 (+1/2) | 中電平: 地 (0/1) | 低電平: 人 (-1/0)</span>
          </div>
          <span className="text-slate-500">⚡ 箭頭標記：上升沿觸發點 (CLK ↗)</span>
        </div>

        <svg
          ref={svgRef}
          viewBox="0 0 880 430"
          className="w-full min-w-[850px] h-[390px] select-none"
        />

        {/* Legend */}
        <div className="flex items-center justify-between flex-wrap gap-4 text-[11px] font-mono-code text-slate-400 pt-2 border-t border-slate-800/80 min-w-[850px]">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-1.5 bg-sky-400 rounded-xs" /> CLK 時鐘
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-1.5 bg-amber-400 rounded-xs" /> Q_Latch (電平透明)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-1.5 bg-cyan-400 rounded-xs" /> Q_FlipFlop (邊沿觸發)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-1.5 bg-blue-500 rounded-xs" /> REG4 (81首主寄存器)
            </span>
          </div>
          <span className="text-rose-400">紅色虛線游標：當前時鐘剖析取樣點</span>
        </div>
      </div>

      {/* Side-by-Side Analysis: Latch vs Flip-Flop vs CPU Pipeline Inspector */}
      {currentSample && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Card 1: Chapter 6 Latch vs Flip-Flop State Transition */}
          <div className="bg-slate-50 dark:bg-slate-800/40 rounded-xl p-4 border border-slate-200 dark:border-slate-800 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700/80 pb-2">
              <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                1. 鎖存器 vs 正反器狀態跳變
              </span>
              <span className="text-[10px] font-mono-code text-slate-400">
                週期 T{currentSample.cycle} [{currentSample.phase}]
              </span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between p-2 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
                <span className="text-slate-500">激勵輸入 (D_in):</span>
                <TritBadge val={currentSample.dIn} mode={mode} size="sm" />
              </div>

              <div className="flex items-center justify-between p-2 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
                <div>
                  <span className="text-slate-500 block">Q_Latch (三穩態鎖存):</span>
                  <span className="text-[10px] text-amber-600 dark:text-amber-400">
                    {currentSample.clk === 1 ? '高電平穿透導通' : '低電平維持'}
                  </span>
                </div>
                <TritBadge val={currentSample.qLatch} mode={mode} size="sm" />
              </div>

              <div className="flex items-center justify-between p-2 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 ring-1 ring-cyan-500/30">
                <div>
                  <span className="text-slate-900 dark:text-slate-100 font-bold block">
                    Q_FlipFlop (三值正反器):
                  </span>
                  <span className="text-[10px] text-cyan-600 dark:text-cyan-400">
                    {currentSample.isRisingEdge ? '⚡ 上升沿同步採樣鎖存' : '時鐘平穩保持'}
                  </span>
                </div>
                <TritBadge val={currentSample.qFlipFlop} mode={mode} size="sm" />
              </div>
            </div>

            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
              <strong>電平與邊沿核心差別：</strong> 鎖存器隨輸入即時跳變，易受總線冒險毛刺干擾；而 T-DFF 僅於上升沿瞬時鎖定，確保下游組合電路輸入絕對穩定。
            </p>
          </div>

          {/* Card 2: 4-Trit Accumulator Register State */}
          <div className="bg-slate-50 dark:bg-slate-800/40 rounded-xl p-4 border border-slate-200 dark:border-slate-800 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700/80 pb-2">
              <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                2. 四爻主寄存器 (REG4)
              </span>
              <span className="text-[10px] font-mono-code text-sky-600 dark:text-sky-400 font-bold">
                81首象鎖存
              </span>
            </div>

            <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono-code text-slate-400 block">當前鎖定首象</span>
                <h4 className="text-lg font-bold font-serif-tc text-slate-900 dark:text-slate-100">
                  【{currentSample.regHeadName}】第 {currentSample.regHeadIndex} 首
                </h4>
              </div>
              <div className="flex gap-1">
                {currentSample.reg4.map((t, idx) => (
                  <TritBadge key={idx} val={t} mode={mode} size="sm" showSymbol={false} />
                ))}
              </div>
            </div>

            <div className="space-y-1 text-[11px] font-mono-code text-slate-500">
              <div className="flex justify-between">
                <span>四爻向量 [方, 州, 部, 家]:</span>
                <span className="text-slate-800 dark:text-slate-200 font-bold">
                  [{currentSample.reg4.join(', ')}]
                </span>
              </div>
              <div className="flex justify-between">
                <span>寫入致能訊號 (Write Enable):</span>
                <span className={currentSample.writeEnable ? 'text-emerald-600 font-bold' : 'text-slate-400'}>
                  {currentSample.writeEnable ? '致能 ACTIVE (1)' : '關閉 IDLE (0)'}
                </span>
              </div>
            </div>

            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
              4 個三值正反器並聯構成四爻字長暫存單元，位元寬度正好完備編碼《太玄經》八十一首。
            </p>
          </div>

          {/* Card 3: CPU Micro-Pipeline Execution Stage */}
          <div className="bg-slate-50 dark:bg-slate-800/40 rounded-xl p-4 border border-slate-200 dark:border-slate-800 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700/80 pb-2">
              <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                3. Chapter 7 CPU 流水線
              </span>
              <span className="text-[10px] font-mono-code px-2 py-0.5 rounded bg-sky-100 dark:bg-sky-950 text-sky-800 dark:text-sky-300 font-bold">
                PC={currentSample.cpuPc}
              </span>
            </div>

            <div className="space-y-2">
              <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                <span className="text-[10px] font-mono-code text-slate-400 block mb-1">
                  當前時鐘微週期階段 (Micro-Phase)
                </span>
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2.5 py-1 rounded text-xs font-mono-code font-bold ${
                      currentSample.cpuStage === 'FETCH'
                        ? 'bg-sky-600 text-white'
                        : currentSample.cpuStage === 'DECODE'
                        ? 'bg-indigo-600 text-white'
                        : currentSample.cpuStage === 'EXECUTE'
                        ? 'bg-amber-600 text-white'
                        : 'bg-emerald-600 text-white'
                    }`}
                  >
                    {currentSample.cpuStage}
                  </span>
                  <span className="text-xs text-slate-700 dark:text-slate-300">
                    {currentSample.cpuStage === 'FETCH' && '取指：PC 指標自 ROM 載入首象指令'}
                    {currentSample.cpuStage === 'DECODE' && '譯碼：解析頂爻操作碼與操作數尋址'}
                    {currentSample.cpuStage === 'EXECUTE' && '運算：4-Trit ALU 執行加減或邏輯'}
                    {currentSample.cpuStage === 'WRITEBACK' && '回寫：時鐘邊沿將結果鎖入寄存器'}
                  </span>
                </div>
              </div>

              <div className="p-2.5 bg-slate-900 text-sky-300 rounded-lg font-mono-code text-[11px] leading-relaxed">
                時序推進：時鐘脈衝 CLK 驅動 PC 計數器與流水線暫存器步調一致，實現全系統確定性同步。
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
