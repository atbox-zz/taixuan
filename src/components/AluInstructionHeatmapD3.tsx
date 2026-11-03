/**
 * 81-Tetragram ALU Instruction Operation Heatmap (81首指令運算熱圖)
 * D3.js interactive heatmap visualizing logic node excitation levels and critical paths
 * @license Apache-2.0
 */

import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as d3 from 'd3';
import { TritValue, DisplayMode, AluOpcode, TetragramHead } from '../types/ternary';
import {
  TAI_XUAN_HEADS,
  TRIT_INFO,
  fourTritsToStandardInt,
  fourTritsToBalancedInt,
  formatTrit,
} from '../lib/taiXuanData';
import { executeAlu } from '../lib/ternaryLogic';
import { TritBadge } from './TritBadge';

interface AluInstructionHeatmapD3Props {
  x: [TritValue, TritValue, TritValue, TritValue];
  y: [TritValue, TritValue, TritValue, TritValue];
  opcode: AluOpcode;
  onSelectX: (newX: [TritValue, TritValue, TritValue, TritValue]) => void;
  mode: DisplayMode;
}

export interface GateNodeExcitation {
  head: TetragramHead;
  compositeExcitation: number; // 0 to 100 (%)
  carryDepth: number; // 0 to 4
  carryScore: number; // 0 to 100
  tnandScore: number; // 0 to 100
  logicSelectorScore: number; // 0 to 100
  flagScore: number; // 0 to 100
  shifterScore: number; // 0 to 100
  activeCriticalPath: string;
}

export interface LogicPathSummary {
  id: string;
  name: string;
  category: string;
  delayNs: number;
  avgExcitation: number;
  triggerCount: number;
  isCritical: boolean;
  desc: string;
}

export const AluInstructionHeatmapD3: React.FC<AluInstructionHeatmapD3Props> = ({
  x,
  y,
  opcode,
  onSelectX,
  mode,
}) => {
  const heatmapSvgRef = useRef<SVGSVGElement | null>(null);
  const pathChartSvgRef = useRef<SVGSVGElement | null>(null);

  const [metricMode, setMetricMode] = useState<'composite' | 'carry' | 'tnand' | 'flags'>('composite');
  const [hoveredHead, setHoveredHead] = useState<GateNodeExcitation | null>(null);
  const [selectedHeadIndex, setSelectedHeadIndex] = useState<number>(fourTritsToStandardInt(x));

  // Compute excitation scores for all 81 heads with current Opcode and Y
  const excitations: GateNodeExcitation[] = useMemo(() => {
    return TAI_XUAN_HEADS.map((head) => {
      const xVec = head.trits;
      const res = executeAlu(xVec, y, opcode);

      // 1. Carry Chain Depth & Score
      // In base-3 ternary adder: sum at each stage triggers carry when sum >= 3
      let carryDepth = 0;
      let c = 0;
      for (let i = 3; i >= 0; i--) {
        const sum = xVec[i] + y[i] + c;
        if (sum >= 3) {
          c = 1;
          carryDepth++;
        } else {
          c = 0;
        }
      }
      const carryScore = (carryDepth / 4) * 100;

      // 2. T-NAND Switching Activity (differential swing from high/low)
      let swingSum = 0;
      for (let i = 0; i < 4; i++) {
        swingSum += Math.abs(xVec[i] - y[i]);
      }
      const tnandScore = Math.min(100, Math.round((swingSum / 8) * 100));

      // 3. Logic Min-Max Selector Score
      let logicDiff = 0;
      for (let i = 0; i < 4; i++) {
        if (xVec[i] !== y[i]) logicDiff++;
      }
      const logicSelectorScore = Math.round((logicDiff / 4) * 100);

      // 4. Flags Score (how many status flags were triggered)
      let flagCount = 0;
      if (res.isHeaven) flagCount++;
      if (res.isZero) flagCount++;
      if (res.isHuman) flagCount++;
      if (res.overflow) flagCount++;
      const flagScore = Math.round((flagCount / 4) * 100);

      // 5. Shifter Activity
      const shifterScore = Math.round((((xVec[0] + xVec[1] + xVec[2] + xVec[3]) % 5) / 4) * 100);

      // 6. Weighted Composite Excitation based on current Opcode
      let composite = 0;
      let activePath = 'CarryChain';

      switch (opcode) {
        case 'ADD':
        case 'SUB':
          composite = 0.5 * carryScore + 0.25 * tnandScore + 0.15 * flagScore + 0.1 * logicSelectorScore;
          activePath = carryDepth >= 2 ? 'RippleCarryChain' : 'HalfAdderStage';
          break;
        case 'MIN':
        case 'MAX':
          composite = 0.5 * logicSelectorScore + 0.3 * tnandScore + 0.2 * flagScore;
          activePath = 'MinMaxComparatorTree';
          break;
        case 'NEG':
        case 'CYCLE':
          composite = 0.6 * tnandScore + 0.25 * flagScore + 0.15 * logicSelectorScore;
          activePath = 'InverterCycleRing';
          break;
        case 'CMP':
          composite = 0.5 * logicSelectorScore + 0.3 * flagScore + 0.2 * tnandScore;
          activePath = 'TristateMagnitudeComparator';
          break;
        case 'SHL':
        case 'SHR':
          composite = 0.5 * shifterScore + 0.3 * tnandScore + 0.2 * flagScore;
          activePath = 'BarrelShifterArray';
          break;
      }

      return {
        head,
        compositeExcitation: Math.max(8, Math.min(100, Math.round(composite))),
        carryDepth,
        carryScore,
        tnandScore,
        logicSelectorScore,
        flagScore,
        shifterScore,
        activeCriticalPath: activePath,
      };
    });
  }, [opcode, y]);

  // Aggregate logic path summary
  const logicPaths: LogicPathSummary[] = useMemo(() => {
    // 6 distinct internal paths
    const avgCarry = Math.round(d3.mean(excitations, (e) => e.carryScore) || 45);
    const avgTnand = Math.round(d3.mean(excitations, (e) => e.tnandScore) || 52);
    const avgLogic = Math.round(d3.mean(excitations, (e) => e.logicSelectorScore) || 60);
    const avgFlags = Math.round(d3.mean(excitations, (e) => e.flagScore) || 40);
    const avgShifter = Math.round(d3.mean(excitations, (e) => e.shifterScore) || 35);

    const paths: LogicPathSummary[] = [
      {
        id: 'carry',
        name: '四爻進位鏈穿透路徑 (Ripple Carry Chain)',
        category: '算術加減運算核心',
        delayNs: 4.8,
        avgExcitation: avgCarry,
        triggerCount: excitations.filter((e) => e.carryDepth >= 2).length,
        isCritical: opcode === 'ADD' || opcode === 'SUB',
        desc: '由 T-HA₀ 半加器穿透至 T-FA₃ 四爻全加器，在極陽相加時成為系統關鍵延遲瓶頸。',
      },
      {
        id: 'tnand',
        name: 'T-NAND 交叉邏輯樹 (Cross-Coupled Core)',
        category: '三值布爾邏輯原語',
        delayNs: 2.2,
        avgExcitation: avgTnand,
        triggerCount: excitations.filter((e) => e.tnandScore >= 50).length,
        isCritical: opcode === 'NEG' || opcode === 'CYCLE',
        desc: '實現天變人人變天的對稱倒反與三才循環，驅動全片晶體管高頻電平翻轉。',
      },
      {
        id: 'minmax',
        name: '升降選通門陣列 (Min-Max Logic Slicer)',
        category: 'T-AND / T-OR 升降選擇器',
        delayNs: 1.8,
        avgExcitation: avgLogic,
        triggerCount: excitations.filter((e) => e.logicSelectorScore >= 50).length,
        isCritical: opcode === 'MIN' || opcode === 'MAX',
        desc: '逐爻比對兩向量電位，藉由門控開關選通極大值（升取）或極小值（降取）。',
      },
      {
        id: 'cmp',
        name: '三態幅值比較器 (Tristate Magnitude Tree)',
        category: '比較與分支判斷',
        delayNs: 3.2,
        avgExcitation: Math.round((avgLogic + avgFlags) / 2),
        triggerCount: excitations.filter((e) => e.logicSelectorScore >= 40).length,
        isCritical: opcode === 'CMP',
        desc: '自高階頂爻（方）向低階初爻（家）逐層比對大小，輸出天（>）、地（=）、人（<）。',
      },
      {
        id: 'shifter',
        name: '階梯移位矩陣 (3-Trit Barrel Shifter)',
        category: '乘除階階位移',
        delayNs: 1.5,
        avgExcitation: avgShifter,
        triggerCount: excitations.filter((e) => e.shifterScore >= 50).length,
        isCritical: opcode === 'SHL' || opcode === 'SHR',
        desc: '四爻向量硬體並行左移（乘三）或右移（除三），兼具零態與符號位拓展。',
      },
      {
        id: 'flags',
        name: '條件標誌判定樹 (Status Flag Evaluator)',
        category: '狀態監測與溢出鎖存',
        delayNs: 2.6,
        avgExcitation: avgFlags,
        triggerCount: excitations.filter((e) => e.flagScore >= 50).length,
        isCritical: false,
        desc: '並行檢測「地歸（Zero）」、「陽昇（Positive）」、「人伏（Negative）」與「溢出」。',
      },
    ];

    // Determine the absolute most frequently/heavily triggered path
    const maxPath = [...paths].sort((a, b) => b.avgExcitation - a.avgExcitation)[0];
    if (maxPath) {
      paths.forEach((p) => {
        if (p.id === maxPath.id) p.isCritical = true;
      });
    }

    return paths;
  }, [excitations, opcode]);

  // Find most critical path
  const criticalPath = useMemo(() => {
    return logicPaths.find((p) => p.isCritical) || logicPaths[0];
  }, [logicPaths]);

  // Active selected excitation
  const activeSelected = useMemo(() => {
    return excitations[selectedHeadIndex] || excitations[0];
  }, [excitations, selectedHeadIndex]);

  // Color interpolator for heatmap
  const getColor = (val: number) => {
    // 0 to 100: dark slate -> cool cyan -> amber -> intense crimson
    if (val < 25) return '#0f172a'; // Deep base
    if (val < 50) return '#0369a1'; // Sky blue
    if (val < 75) return '#d97706'; // Amber
    return '#e11d48'; // Hot Rose / Crimson
  };

  // Render 9x9 D3 Heatmap Matrix
  useEffect(() => {
    if (!heatmapSvgRef.current) return;

    const svg = d3.select(heatmapSvgRef.current);
    svg.selectAll('*').remove();

    const cellSize = 38;
    const gap = 3.5;
    const paddingLeft = 32;
    const paddingTop = 32;

    const g = svg.append('g').attr('transform', `translate(${paddingLeft}, ${paddingTop})`);

    // Axis labels: Columns = 部·家 (0 to 8), Rows = 方·州 (0 to 8)
    const tierLabels = ['人人', '人地', '人天', '地人', '地地', '地天', '天人', '天地', '天天'];

    // Top X-axis labels
    tierLabels.forEach((lbl, c) => {
      g.append('text')
        .attr('x', c * (cellSize + gap) + cellSize / 2)
        .attr('y', -10)
        .attr('text-anchor', 'middle')
        .attr('fill', '#94a3b8')
        .attr('font-size', '9px')
        .attr('font-family', 'monospace')
        .text(lbl);
    });

    // Left Y-axis labels
    tierLabels.forEach((lbl, r) => {
      g.append('text')
        .attr('x', -8)
        .attr('y', r * (cellSize + gap) + cellSize / 2 + 3)
        .attr('text-anchor', 'end')
        .attr('fill', '#94a3b8')
        .attr('font-size', '9px')
        .attr('font-family', 'monospace')
        .text(lbl);
    });

    // Render 81 Cells
    excitations.forEach((item, idx) => {
      const row = Math.floor(idx / 9);
      const col = idx % 9;
      const xPos = col * (cellSize + gap);
      const yPos = row * (cellSize + gap);

      let val = item.compositeExcitation;
      if (metricMode === 'carry') val = item.carryScore;
      if (metricMode === 'tnand') val = item.tnandScore;
      if (metricMode === 'flags') val = item.flagScore;

      const isSelected = selectedHeadIndex === idx;
      const cellG = g.append('g').attr('transform', `translate(${xPos}, ${yPos})`);

      // Cell Rect
      cellG
        .append('rect')
        .attr('width', cellSize)
        .attr('height', cellSize)
        .attr('rx', 5)
        .attr('fill', getColor(val))
        .attr('stroke', isSelected ? '#38bdf8' : '#1e293b')
        .attr('stroke-width', isSelected ? 2.5 : 1)
        .attr('cursor', 'pointer')
        .style('transition', 'all 0.15s ease')
        .on('mouseenter', () => {
          setHoveredHead(item);
        })
        .on('mouseleave', () => {
          setHoveredHead(null);
        })
        .on('click', () => {
          setSelectedHeadIndex(idx);
          onSelectX(item.head.trits);
        });

      // Tetragram Unicode Glyph
      cellG
        .append('text')
        .attr('x', cellSize / 2)
        .attr('y', cellSize / 2 - 3)
        .attr('text-anchor', 'middle')
        .attr('fill', val > 45 ? '#ffffff' : '#94a3b8')
        .attr('font-size', '13px')
        .attr('font-family', 'serif')
        .attr('pointer-events', 'none')
        .text(item.head.unicodeChar);

      // Name & Excitation Value
      cellG
        .append('text')
        .attr('x', cellSize / 2)
        .attr('y', cellSize - 5)
        .attr('text-anchor', 'middle')
        .attr('fill', val > 45 ? '#e2e8f0' : '#64748b')
        .attr('font-size', '8px')
        .attr('font-family', 'monospace')
        .attr('font-weight', isSelected ? 'bold' : 'normal')
        .attr('pointer-events', 'none')
        .text(`${item.head.name}${val}%`);
    });
  }, [excitations, metricMode, selectedHeadIndex, onSelectX]);

  // Render Horizontal Bar Chart for Logic Paths
  useEffect(() => {
    if (!pathChartSvgRef.current) return;

    const svg = d3.select(pathChartSvgRef.current);
    svg.selectAll('*').remove();

    const width = 380;
    const height = 230;
    const margin = { top: 10, right: 45, bottom: 20, left: 145 };
    const innerW = width - margin.left - margin.right;
    const innerH = height - margin.top - margin.bottom;

    const g = svg.append('g').attr('transform', `translate(${margin.left}, ${margin.top})`);

    const yScale = d3
      .scaleBand()
      .domain(logicPaths.map((p) => p.name.split(' (')[0]))
      .range([0, innerH])
      .padding(0.28);

    const xScale = d3.scaleLinear().domain([0, 100]).range([0, innerW]);

    // Background track bars
    logicPaths.forEach((p) => {
      const shortName = p.name.split(' (')[0];
      const yPos = yScale(shortName) || 0;

      // Track
      g.append('rect')
        .attr('x', 0)
        .attr('y', yPos)
        .attr('width', innerW)
        .attr('height', yScale.bandwidth())
        .attr('fill', 'rgba(255,255,255,0.04)')
        .attr('rx', 3);

      // Value bar
      g.append('rect')
        .attr('x', 0)
        .attr('y', yPos)
        .attr('width', xScale(p.avgExcitation))
        .attr('height', yScale.bandwidth())
        .attr('fill', p.isCritical ? '#f43f5e' : '#0284c7')
        .attr('rx', 3);

      // Label on the left
      g.append('text')
        .attr('x', -8)
        .attr('y', yPos + yScale.bandwidth() / 2 + 3)
        .attr('text-anchor', 'end')
        .attr('fill', p.isCritical ? '#fda4af' : '#94a3b8')
        .attr('font-size', '10px')
        .attr('font-family', 'sans-serif')
        .attr('font-weight', p.isCritical ? 'bold' : 'normal')
        .text(shortName);

      // Value text on the right
      g.append('text')
        .attr('x', xScale(p.avgExcitation) + 6)
        .attr('y', yPos + yScale.bandwidth() / 2 + 3)
        .attr('fill', p.isCritical ? '#f43f5e' : '#cbd5e1')
        .attr('font-size', '10px')
        .attr('font-family', 'monospace')
        .attr('font-weight', 'bold')
        .text(`${p.avgExcitation}%`);
    });
  }, [logicPaths]);

  const activeDisplay = hoveredHead || activeSelected;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 text-slate-100 shadow-md space-y-5">
      {/* Editorial Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono-code text-rose-400 font-bold">
              HEATMAP & CRITICAL PATH ANALYSIS (D3.JS)
            </span>
            <span className="text-slate-600">·</span>
            <span className="text-xs font-mono-code text-slate-400">81首全空間激發拓撲</span>
          </div>
          <h3 className="text-lg font-bold font-serif-tc text-slate-100 mt-0.5">
            81首指令運算熱圖與 ALU 關鍵邏輯路徑
          </h3>
          <p className="text-xs text-slate-400 mt-0.5 max-w-2xl leading-relaxed">
            直觀展示當前操作碼（<strong>{opcode}</strong>）在四爻空間內，被操作數 X（81首）與操作數 Y
            交互時，ALU 內部各門電路節點（進位鏈、T-NAND 交叉樹、升降選通器）的動態激發程度。
          </p>
        </div>

        {/* Metric Selector Buttons */}
        <div className="flex items-center p-1 bg-slate-950 rounded-xl border border-slate-800 text-xs font-mono-code">
          <button
            type="button"
            onClick={() => setMetricMode('composite')}
            className={`px-2.5 py-1 rounded-lg transition-all ${
              metricMode === 'composite' ? 'bg-rose-600 text-white font-bold' : 'text-slate-400 hover:text-white'
            }`}
          >
            綜合激發
          </button>
          <button
            type="button"
            onClick={() => setMetricMode('carry')}
            className={`px-2.5 py-1 rounded-lg transition-all ${
              metricMode === 'carry' ? 'bg-rose-600 text-white font-bold' : 'text-slate-400 hover:text-white'
            }`}
          >
            進位鏈深度
          </button>
          <button
            type="button"
            onClick={() => setMetricMode('tnand')}
            className={`px-2.5 py-1 rounded-lg transition-all ${
              metricMode === 'tnand' ? 'bg-rose-600 text-white font-bold' : 'text-slate-400 hover:text-white'
            }`}
          >
            T-NAND 翻轉
          </button>
          <button
            type="button"
            onClick={() => setMetricMode('flags')}
            className={`px-2.5 py-1 rounded-lg transition-all ${
              metricMode === 'flags' ? 'bg-rose-600 text-white font-bold' : 'text-slate-400 hover:text-white'
            }`}
          >
            狀態標誌
          </button>
        </div>
      </div>

      {/* Main Grid Layout: Left 9x9 Matrix (7 cols) + Right Critical Path Inspector (5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left: 9x9 D3 Heatmap Grid (7 cols) */}
        <div className="lg:col-span-7 bg-slate-950 p-4 rounded-xl border border-slate-800 relative overflow-x-auto">
          <div className="flex items-center justify-between text-[11px] font-mono-code text-slate-400 pb-2 border-b border-slate-800/80 mb-1 min-w-[390px]">
            <span>縱軸: 方·州 (MSB) ⟷ 橫軸: 部·家 (LSB)</span>
            <span className="text-rose-400">點擊任一首象一鍵載入為向量 X</span>
          </div>

          <div className="flex justify-center overflow-x-auto">
            <svg
              ref={heatmapSvgRef}
              viewBox="0 0 420 420"
              className="w-full max-w-[420px] min-w-[380px] h-[390px] select-none"
            />
          </div>

          {/* Color Scale Legend */}
          <div className="flex items-center justify-between text-[10px] font-mono-code text-slate-400 pt-2 border-t border-slate-800/80">
            <span>低激發 (0%~25%)</span>
            <div className="flex items-center gap-1.5">
              <span className="w-3.5 h-2.5 rounded-xs bg-slate-900 border border-slate-700" />
              <span className="w-3.5 h-2.5 rounded-xs bg-sky-700" />
              <span className="w-3.5 h-2.5 rounded-xs bg-amber-600" />
              <span className="w-3.5 h-2.5 rounded-xs bg-rose-600" />
            </div>
            <span className="text-rose-400 font-bold">高激發 (75%~100%)</span>
          </div>
        </div>

        {/* Right: Critical Path Analyzer & Node Inspector (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Most Critical Path Banner */}
          <div className="bg-rose-950/40 border border-rose-800/60 rounded-xl p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono-code px-2 py-0.5 rounded bg-rose-900 text-rose-200 font-bold">
                🔥 當前最常觸發的關鍵邏輯路徑
              </span>
              <span className="text-xs font-mono-code text-rose-400 font-bold">
                延遲: {criticalPath.delayNs} ns
              </span>
            </div>

            <h4 className="text-sm font-bold font-serif-tc text-rose-100">
              {criticalPath.name}
            </h4>
            <p className="text-[11px] text-rose-200/80 leading-relaxed">
              {criticalPath.desc}
            </p>

            <div className="flex items-center justify-between text-[10px] font-mono-code text-rose-300 pt-1 border-t border-rose-900/60">
              <span>全域激發率: {criticalPath.avgExcitation}%</span>
              <span>高頻觸發首象: {criticalPath.triggerCount} / 81 首</span>
            </div>
          </div>

          {/* Internal Logic Node Excitation Bar Chart */}
          <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-xs pb-1 border-b border-slate-800">
              <span className="font-semibold text-slate-200">ALU 內部門電路模組激發分佈</span>
              <span className="text-[10px] font-mono-code text-slate-500">平均翻轉強度</span>
            </div>

            <svg
              ref={pathChartSvgRef}
              viewBox="0 0 380 230"
              className="w-full h-[180px] select-none"
            />
          </div>

          {/* Active / Hovered Tetragram Node Inspection Card */}
          {activeDisplay && (
            <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-7 h-7 rounded-lg bg-sky-600 text-white font-serif text-base flex items-center justify-center font-bold">
                    {activeDisplay.head.unicodeChar}
                  </span>
                  <div>
                    <h5 className="text-xs font-bold font-serif-tc text-slate-200">
                      【{activeDisplay.head.name}】第 {activeDisplay.head.index} 首
                    </h5>
                    <span className="text-[10px] font-mono-code text-slate-400">
                      四爻: [{activeDisplay.head.trits.join(', ')}]
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] font-mono-code text-slate-400 block">綜合激發率</span>
                  <span className="text-sm font-bold font-mono-code text-rose-400">
                    {activeDisplay.compositeExcitation}%
                  </span>
                </div>
              </div>

              {/* Sub-node Metrics */}
              <div className="grid grid-cols-4 gap-1.5 text-center font-mono-code text-[10px] pt-1 border-t border-slate-800">
                <div className="p-1 bg-slate-900 rounded">
                  <span className="text-slate-500 block">進位深度</span>
                  <span className="text-sky-400 font-bold">{activeDisplay.carryDepth} 級</span>
                </div>
                <div className="p-1 bg-slate-900 rounded">
                  <span className="text-slate-500 block">T-NAND</span>
                  <span className="text-amber-400 font-bold">{activeDisplay.tnandScore}%</span>
                </div>
                <div className="p-1 bg-slate-900 rounded">
                  <span className="text-slate-500 block">選通陣列</span>
                  <span className="text-violet-400 font-bold">{activeDisplay.logicSelectorScore}%</span>
                </div>
                <div className="p-1 bg-slate-900 rounded">
                  <span className="text-slate-500 block">標誌激發</span>
                  <span className="text-emerald-400 font-bold">{activeDisplay.flagScore}%</span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={() => onSelectX(activeDisplay.head.trits)}
                  className="w-full py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors flex items-center justify-center gap-1.5"
                >
                  <span>⚡ 載入【{activeDisplay.head.name}首】為當前向量 X</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
