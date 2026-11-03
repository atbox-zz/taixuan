/**
 * ALU Latency & Data Flow Profiler (ALU 延遲與數據流轉動態分析儀)
 * Chapter 8 Engineering Workbench Component
 * Uses D3.js to monitor 4-Trit ALU processing delays, data throughput efficiency,
 * and visualizes potential logic bottlenecks across all 81 Tai Xuan Tetragram instructions.
 * @license Apache-2.0
 */

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import * as d3 from 'd3';
import { TritValue, DisplayMode, AluOpcode } from '../../types/ternary';
import {
  TAI_XUAN_HEADS,
  TRIT_INFO,
  formatTrit,
  fourTritsToStandardInt,
  fourTritsToBalancedInt,
} from '../../lib/taiXuanData';
import { mapHeadToAluSpec } from '../../lib/hdlTestRunner';
import {
  Activity,
  Zap,
  AlertTriangle,
  Play,
  Pause,
  RotateCcw,
  Sparkles,
  Layers,
  Cpu,
  BarChart2,
  Sliders,
  Filter,
  CheckCircle2,
  Clock,
  Gauge,
  HelpCircle,
  TrendingUp,
} from 'lucide-react';
import { TritBadge } from '../TritBadge';

interface AluLatencyFlowProfilerProps {
  mode: DisplayMode;
}

export type ProfilerMetric = 'bottleneckScore' | 'delayNs' | 'throughput' | 'gateDepth' | 'switchingPower';

export interface InstructionPerformanceData {
  index: number; // 1 to 81
  name: string;
  unicodeChar: string;
  trits: [TritValue, TritValue, TritValue, TritValue];
  opcode: AluOpcode;
  mnemonic: string;
  category: 'arithmetic' | 'logic' | 'control';
  delayNs: number; // Propagation delay in nanoseconds (e.g. 0.85 - 4.25 ns)
  throughput: number; // M-ops / s (e.g. 235 - 1176 M-ops/s)
  gateDepth: number; // Critical path T-NAND equivalent gate stages (4 - 14 gates)
  switchingActivity: number; // Dynamic wire switching activity percentage (25% - 95%)
  bottleneckScore: number; // 0 to 100 risk score
  bottleneckLevel: 'optimal' | 'warning' | 'critical';
  criticalGate: string; // Critical path hardware component
  bottleneckReason: string; // Engineering bottleneck explanation
  mitigationAdvice: string; // Hardware optimization recommendation
  stageDelays: {
    s1Decode: number;
    s2Fanout: number;
    s3CoreLogic: number;
    s4CarryChain: number;
    s5MuxSelect: number;
  };
}

export interface StreamDataPoint {
  step: number;
  timeMs: number;
  shouIndex: number;
  name: string;
  mnemonic: string;
  delayNs: number;
  throughput: number;
  bottleneckLevel: 'optimal' | 'warning' | 'critical';
}

// Generate deterministic hardware latency and data flow metrics for all 81 instructions
function generate81InstructionMetrics(): InstructionPerformanceData[] {
  return TAI_XUAN_HEADS.map((head) => {
    const spec = mapHeadToAluSpec(head.index);
    const [t3, t2, t1, t0] = head.trits;

    // 1. Calculate Carry Ripple / Borrow chain depth
    let carryRippleSteps = 0;
    if (spec.opcode === 'ADD') {
      // High trits (2, 2) generate maximum ripple propagation
      if (t0 === 2 && t1 === 2) carryRippleSteps += 2;
      else if (t0 === 2 || t1 === 2) carryRippleSteps += 1;
      if (t2 === 2 && t3 === 2) carryRippleSteps += 2;
      else if (t2 === 2 || t3 === 2) carryRippleSteps += 1;
    } else if (spec.opcode === 'SUB') {
      // Subtraction requires borrow propagation through 4-stage subtractor
      carryRippleSteps = 2 + (t0 === 0 ? 1 : 0) + (t1 === 0 ? 1 : 0);
    }

    // 2. Base delay components by opcode category
    let s1Decode = 0.35 + (t3 === 0 ? 0.08 : 0.04);
    let s2Fanout = 0.32 + (t2 !== 1 ? 0.12 : 0.05);
    let s3CoreLogic = 0.55;
    let s4CarryChain = 0.25;
    let s5MuxSelect = 0.38;

    let criticalGate = 'T-NAND Core Array';
    let bottleneckReason = '均衡的三值基本門切換，無顯著級聯瓶頸。';
    let mitigationAdvice = '保持當前邏輯綜合拓撲，時序裕量充裕 (>30%)。';
    let gateDepth = 5;
    let switchingActivity = 45;

    if (spec.opcode === 'ADD') {
      s3CoreLogic = 0.85;
      s4CarryChain = 0.65 + carryRippleSteps * 0.52;
      s5MuxSelect = 0.45;
      gateDepth = 7 + carryRippleSteps * 2;
      switchingActivity = 60 + carryRippleSteps * 8;
      if (carryRippleSteps >= 3) {
        criticalGate = `T-RippleAdder[3] 行波進位鏈`;
        bottleneckReason = `全加器高位進位訊號需穿越 ${carryRippleSteps} 級全加器傳輸門，形成長串級聯延遲。`;
        mitigationAdvice = '建議引入三值超前進位生成器 (T-CLA Lookahead Block)，將進位深度由 O(N) 壓縮為 O(log3 N)。';
      } else {
        criticalGate = 'T-HalfAdder Carry Logic';
        bottleneckReason = '局部進位延遲，處於可控容差範圍。';
        mitigationAdvice = '可在低位適當插入非對稱驅動器以均衡傳輸斜率。';
      }
    } else if (spec.opcode === 'SUB') {
      s3CoreLogic = 0.95;
      s4CarryChain = 0.85 + carryRippleSteps * 0.58;
      s5MuxSelect = 0.48;
      gateDepth = 9 + carryRippleSteps * 2;
      switchingActivity = 72 + carryRippleSteps * 6;
      criticalGate = `T-Sub Borrow Logic & Ripple Inverter`;
      bottleneckReason = '三值減法借位邏輯包含雙相取反與行波借位，寄生電容與充放電延遲最大。';
      mitigationAdvice = '採用補碼直加電路 (Balanced Ternary Invert-and-Add) 並對負權重位實施先行借位預測。';
    } else if (spec.opcode === 'MIN' || spec.opcode === 'MAX') {
      s3CoreLogic = 0.72;
      s4CarryChain = 0.18;
      s5MuxSelect = 0.62; // MUX3 comparator tree
      gateDepth = 6;
      switchingActivity = 52;
      criticalGate = 'MUX3 Ternary Comparator Tree';
      bottleneckReason = '三值極值判斷需要多級比較器與 3:1 多路復用門樹，扇出電容負載較高。';
      mitigationAdvice = '將 3:1 MUX 樹扁平化為單級傳輸門陣列 (Transmission Gate MUX)，降低多級門扇出。';
    } else if (spec.opcode === 'NEG' || spec.opcode === 'CYCLE') {
      s3CoreLogic = 0.42;
      s4CarryChain = 0.08;
      s5MuxSelect = 0.32;
      gateDepth = 4;
      switchingActivity = 38;
      criticalGate = 'T-Inverter Fast Path';
      bottleneckReason = '單週期純組合邏輯置換，無任何進位鏈與深層選擇器，為超高速直通路徑。';
      mitigationAdvice = '該路徑已為最優硬件配置，延遲低於 1.2ns，可作為流水線基準時鐘參考。';
    } else if (spec.opcode === 'SHL') {
      s3CoreLogic = 0.68;
      s4CarryChain = 0.12;
      s5MuxSelect = 0.58;
      gateDepth = 6;
      switchingActivity = 48;
      criticalGate = 'Barrel Shifter Crossbar';
      bottleneckReason = '桶形移位器交叉開關陣列存在線路寄生電容與金屬層互連電阻。';
      mitigationAdvice = '優化金屬走線拓撲，對高位移位線路加裝雙反向器中繼緩衝單元。';
    } else {
      // CMP or Control
      s3CoreLogic = 0.78;
      s4CarryChain = 0.32;
      s5MuxSelect = 0.65;
      gateDepth = 7;
      switchingActivity = 58;
      criticalGate = 'T-Equivalence & Zero-Flag Arbiter';
      bottleneckReason = '四爻全等判定與狀態標誌仲裁樹形成多輸入匯聚節點。';
      mitigationAdvice = '改用三值並行 NOR 樹實現零標誌快速判決。';
    }

    const totalDelay = Number((s1Decode + s2Fanout + s3CoreLogic + s4CarryChain + s5MuxSelect).toFixed(2));
    // Throughput in M-ops/s = 1000 / (delayNs * pipelineEfficiency)
    const pipelineFactor = totalDelay > 3.0 ? 1.15 : 1.05;
    const throughput = Math.round(1000 / (totalDelay * pipelineFactor) * 1.8);

    // Bottleneck score (0 - 100)
    const bottleneckScore = Math.min(
      100,
      Math.max(10, Math.round(((totalDelay - 1.0) / 3.3) * 85 + (gateDepth / 14) * 15))
    );

    let bottleneckLevel: 'optimal' | 'warning' | 'critical' = 'optimal';
    if (totalDelay >= 2.8) {
      bottleneckLevel = 'critical';
    } else if (totalDelay >= 1.9) {
      bottleneckLevel = 'warning';
    }

    return {
      index: head.index,
      name: head.name,
      unicodeChar: head.unicodeChar,
      trits: head.trits,
      opcode: spec.opcode,
      mnemonic: spec.mnemonic,
      category: spec.category,
      delayNs: totalDelay,
      throughput,
      gateDepth,
      switchingActivity,
      bottleneckScore,
      bottleneckLevel,
      criticalGate,
      bottleneckReason,
      mitigationAdvice,
      stageDelays: {
        s1Decode: Number(s1Decode.toFixed(2)),
        s2Fanout: Number(s2Fanout.toFixed(2)),
        s3CoreLogic: Number(s3CoreLogic.toFixed(2)),
        s4CarryChain: Number(s4CarryChain.toFixed(2)),
        s5MuxSelect: Number(s5MuxSelect.toFixed(2)),
      },
    };
  });
}

export const AluLatencyFlowProfiler: React.FC<AluLatencyFlowProfilerProps> = ({ mode }) => {
  // All 81 instructions metrics
  const allMetrics = useMemo(() => generate81InstructionMetrics(), []);

  // UI States
  const [selectedMetric, setSelectedMetric] = useState<ProfilerMetric>('bottleneckScore');
  const [selectedInstruction, setSelectedInstruction] = useState<InstructionPerformanceData>(allMetrics[0]);
  const [hoveredInstruction, setHoveredInstruction] = useState<InstructionPerformanceData | null>(null);
  const [filterCategory, setFilterCategory] = useState<'ALL' | 'arithmetic' | 'logic' | 'control'>('ALL');
  const [filterRisk, setFilterRisk] = useState<'ALL' | 'critical' | 'warning' | 'optimal'>('ALL');

  // Real-time stream simulator state
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [simSpeed, setSimSpeed] = useState<number>(1); // 1x, 2x, 4x
  const [streamData, setStreamData] = useState<StreamDataPoint[]>([]);
  const streamStepRef = useRef<number>(0);
  const streamTimerRef = useRef<NodeJS.Timeout | null>(null);

  // SVG Refs for D3
  const heatmapSvgRef = useRef<SVGSVGElement | null>(null);
  const timelineSvgRef = useRef<SVGSVGElement | null>(null);
  const stagesSvgRef = useRef<SVGSVGElement | null>(null);

  // Active inspected instruction (hovered or selected)
  const activeInspected = hoveredInstruction || selectedInstruction;

  // Filtered metrics list for ranking & stats
  const filteredMetrics = useMemo(() => {
    return allMetrics.filter((m) => {
      const matchCat = filterCategory === 'ALL' || m.category === filterCategory;
      const matchRisk = filterRisk === 'ALL' || m.bottleneckLevel === filterRisk;
      return matchCat && matchRisk;
    });
  }, [allMetrics, filterCategory, filterRisk]);

  // Aggregate stats
  const stats = useMemo(() => {
    const delays = allMetrics.map((m) => m.delayNs);
    const avgDelay = delays.reduce((a, b) => a + b, 0) / delays.length;
    const maxDelay = Math.max(...delays);
    const minDelay = Math.min(...delays);
    const criticalCount = allMetrics.filter((m) => m.bottleneckLevel === 'critical').length;
    const warningCount = allMetrics.filter((m) => m.bottleneckLevel === 'warning').length;
    const optimalCount = allMetrics.filter((m) => m.bottleneckLevel === 'optimal').length;
    const avgThroughput = Math.round(
      allMetrics.reduce((acc, cur) => acc + cur.throughput, 0) / allMetrics.length
    );

    return {
      avgDelay: avgDelay.toFixed(2),
      maxDelay: maxDelay.toFixed(2),
      minDelay: minDelay.toFixed(2),
      criticalCount,
      warningCount,
      optimalCount,
      avgThroughput,
      criticalPercentage: ((criticalCount / 81) * 100).toFixed(1),
    };
  }, [allMetrics]);

  // Initialize stream buffer
  useEffect(() => {
    const initialStream: StreamDataPoint[] = [];
    for (let i = 0; i < 24; i++) {
      const targetItem = allMetrics[i % allMetrics.length];
      initialStream.push({
        step: i,
        timeMs: i * 80,
        shouIndex: targetItem.index,
        name: targetItem.name,
        mnemonic: targetItem.mnemonic,
        delayNs: targetItem.delayNs + (Math.random() * 0.16 - 0.08),
        throughput: targetItem.throughput + Math.round(Math.random() * 20 - 10),
        bottleneckLevel: targetItem.bottleneckLevel,
      });
    }
    streamStepRef.current = 24;
    setStreamData(initialStream);
  }, [allMetrics]);

  // Stream simulator interval
  useEffect(() => {
    if (!isPlaying) {
      if (streamTimerRef.current) clearInterval(streamTimerRef.current);
      return;
    }

    const intervalMs = Math.max(120, Math.floor(400 / simSpeed));

    streamTimerRef.current = setInterval(() => {
      setStreamData((prev) => {
        const nextStep = streamStepRef.current + 1;
        streamStepRef.current = nextStep;

        // Pick next instruction (semi-randomized realistic program stream)
        const randomIndex = Math.floor(Math.random() * allMetrics.length);
        const item = allMetrics[randomIndex];

        const jitter = (Math.random() - 0.5) * 0.18;
        const throughputJitter = Math.round((Math.random() - 0.5) * 24);

        const newPoint: StreamDataPoint = {
          step: nextStep,
          timeMs: nextStep * 80,
          shouIndex: item.index,
          name: item.name,
          mnemonic: item.mnemonic,
          delayNs: Number(Math.max(0.7, item.delayNs + jitter).toFixed(2)),
          throughput: Math.max(150, item.throughput + throughputJitter),
          bottleneckLevel: item.bottleneckLevel,
        };

        const updated = [...prev.slice(1), newPoint];
        return updated;
      });
    }, intervalMs);

    return () => {
      if (streamTimerRef.current) clearInterval(streamTimerRef.current);
    };
  }, [isPlaying, simSpeed, allMetrics]);

  // ==========================================
  // D3 Visualization 1: 9x9 81-Shou Bottleneck Heatmap
  // ==========================================
  useEffect(() => {
    if (!heatmapSvgRef.current) return;

    const svg = d3.select(heatmapSvgRef.current);
    svg.selectAll('*').remove();

    const width = 640;
    const height = 480;
    const margin = { top: 40, right: 30, bottom: 40, left: 55 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const cellWidth = innerWidth / 9;
    const cellHeight = innerHeight / 9;

    const g = svg
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Color Scales based on selected metric
    let colorScale: (val: number) => string;

    if (selectedMetric === 'bottleneckScore') {
      // Green (low risk) -> Amber (moderate) -> Crimson (high risk)
      colorScale = (val: number) => {
        if (val < 45) return d3.interpolateLab('#10b981', '#0ea5e9')(val / 45);
        if (val < 70) return d3.interpolateLab('#0ea5e9', '#f59e0b')((val - 45) / 25);
        return d3.interpolateLab('#f59e0b', '#ef4444')((val - 70) / 30);
      };
    } else if (selectedMetric === 'delayNs') {
      // 0.8ns to 4.3ns
      const minD = 0.8;
      const maxD = 4.3;
      colorScale = (val: number) => {
        const ratio = Math.max(0, Math.min(1, (val - minD) / (maxD - minD)));
        return d3.interpolateLab('#0284c7', '#dc2626')(ratio);
      };
    } else if (selectedMetric === 'throughput') {
      // Higher is better: Crimson (low) -> Green (high)
      colorScale = (val: number) => {
        const ratio = Math.max(0, Math.min(1, (val - 200) / 800));
        return d3.interpolateLab('#ef4444', '#10b981')(ratio);
      };
    } else if (selectedMetric === 'gateDepth') {
      colorScale = (val: number) => {
        const ratio = Math.max(0, Math.min(1, (val - 4) / 10));
        return d3.interpolateLab('#8b5cf6', '#f43f5e')(ratio);
      };
    } else {
      // switchingPower
      colorScale = (val: number) => {
        const ratio = Math.max(0, Math.min(1, (val - 25) / 70));
        return d3.interpolateLab('#06b6d4', '#e11d48')(ratio);
      };
    }

    // Axes Labels
    const colLabels = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];
    const rowLabels = ['1族', '2族', '3族', '4族', '5族', '6族', '7族', '8族', '9族'];

    // Top X Column labels
    g.selectAll('.col-label')
      .data(colLabels)
      .enter()
      .append('text')
      .attr('class', 'col-label')
      .attr('x', (_, i) => i * cellWidth + cellWidth / 2)
      .attr('y', -12)
      .attr('text-anchor', 'middle')
      .attr('font-size', '11px')
      .attr('font-family', 'monospace')
      .attr('fill', '#94a3b8')
      .text((d) => `列 ${d}`);

    // Left Y Row labels
    g.selectAll('.row-label')
      .data(rowLabels)
      .enter()
      .append('text')
      .attr('class', 'row-label')
      .attr('x', -10)
      .attr('y', (_, i) => i * cellHeight + cellHeight / 2 + 4)
      .attr('text-anchor', 'end')
      .attr('font-size', '11px')
      .attr('font-family', 'sans-serif')
      .attr('fill', '#94a3b8')
      .text((d) => d);

    // Heatmap Cells
    allMetrics.forEach((item) => {
      const row = Math.floor((item.index - 1) / 9);
      const col = (item.index - 1) % 9;

      const isSelected = selectedInstruction.index === item.index;
      const isHovered = hoveredInstruction?.index === item.index;

      let metricVal = item.bottleneckScore;
      let displayValStr = `${item.bottleneckScore}`;
      if (selectedMetric === 'delayNs') {
        metricVal = item.delayNs;
        displayValStr = `${item.delayNs}ns`;
      } else if (selectedMetric === 'throughput') {
        metricVal = item.throughput;
        displayValStr = `${item.throughput}`;
      } else if (selectedMetric === 'gateDepth') {
        metricVal = item.gateDepth;
        displayValStr = `${item.gateDepth}G`;
      } else if (selectedMetric === 'switchingPower') {
        metricVal = item.switchingActivity;
        displayValStr = `${item.switchingActivity}%`;
      }

      const fillColor = colorScale(metricVal);

      const cellGroup = g
        .append('g')
        .attr('transform', `translate(${col * cellWidth}, ${row * cellHeight})`)
        .attr('cursor', 'pointer')
        .on('click', () => {
          setSelectedInstruction(item);
        })
        .on('mouseenter', () => {
          setHoveredInstruction(item);
        })
        .on('mouseleave', () => {
          setHoveredInstruction(null);
        });

      // Cell background rect
      cellGroup
        .append('rect')
        .attr('width', cellWidth - 3)
        .attr('height', cellHeight - 3)
        .attr('rx', 4)
        .attr('fill', fillColor)
        .attr('fill-opacity', item.bottleneckLevel === 'critical' ? 0.92 : 0.85)
        .attr('stroke', isSelected ? '#38bdf8' : isHovered ? '#ffffff' : '#0f172a')
        .attr('stroke-width', isSelected ? 2.5 : isHovered ? 1.8 : 0.8)
        .style('transition', 'all 0.15s ease');

      // Critical pulse circle for severe bottlenecks
      if (item.bottleneckLevel === 'critical') {
        cellGroup
          .append('circle')
          .attr('cx', cellWidth - 10)
          .attr('cy', 8)
          .attr('r', 3)
          .attr('fill', '#fee2e2')
          .attr('stroke', '#ef4444')
          .attr('stroke-width', 1);
      }

      // Unicode symbol & Head name
      cellGroup
        .append('text')
        .attr('x', 6)
        .attr('y', 15)
        .attr('font-size', '11px')
        .attr('font-weight', 'bold')
        .attr('fill', '#ffffff')
        .style('pointer-events', 'none')
        .text(`${item.unicodeChar} ${item.name}`);

      // Metric value text
      cellGroup
        .append('text')
        .attr('x', cellWidth - 8)
        .attr('y', cellHeight - 8)
        .attr('text-anchor', 'end')
        .attr('font-size', '9.5px')
        .attr('font-family', 'monospace')
        .attr('font-weight', '600')
        .attr('fill', '#ffffff')
        .attr('opacity', 0.95)
        .style('pointer-events', 'none')
        .text(displayValStr);
    });
  }, [allMetrics, selectedMetric, selectedInstruction, hoveredInstruction]);

  // ==========================================
  // D3 Visualization 2: Dynamic Real-time Latency & Flow Stream
  // ==========================================
  useEffect(() => {
    if (!timelineSvgRef.current || streamData.length === 0) return;

    const svg = d3.select(timelineSvgRef.current);
    svg.selectAll('*').remove();

    const width = 640;
    const height = 230;
    const margin = { top: 20, right: 35, bottom: 35, left: 45 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const g = svg
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Scales
    const xScale = d3
      .scaleLinear()
      .domain([d3.min(streamData, (d) => d.step) || 0, d3.max(streamData, (d) => d.step) || 1])
      .range([0, innerWidth]);

    const yScale = d3
      .scaleLinear()
      .domain([0, 5.0]) // 0 to 5 ns
      .range([innerHeight, 0]);

    // Grid lines
    g.append('g')
      .attr('class', 'grid')
      .attr('opacity', 0.15)
      .call(
        d3
          .axisLeft(yScale)
          .ticks(5)
          .tickSize(-innerWidth)
          .tickFormat(() => '')
      );

    // X Axis
    g.append('g')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(
        d3
          .axisBottom(xScale)
          .ticks(6)
          .tickFormat((d) => `#${d}`)
      )
      .attr('color', '#64748b')
      .selectAll('text')
      .attr('font-size', '10px');

    // Y Axis
    g.append('g')
      .call(
        d3
          .axisLeft(yScale)
          .ticks(5)
          .tickFormat((d) => `${d}ns`)
      )
      .attr('color', '#64748b')
      .selectAll('text')
      .attr('font-size', '10px');

    // Critical Latency Warning Threshold Line (2.8 ns)
    const thresholdY = yScale(2.8);
    g.append('line')
      .attr('x1', 0)
      .attr('x2', innerWidth)
      .attr('y1', thresholdY)
      .attr('y2', thresholdY)
      .attr('stroke', '#ef4444')
      .attr('stroke-width', 1.5)
      .attr('stroke-dasharray', '4 4')
      .attr('opacity', 0.85);

    g.append('text')
      .attr('x', innerWidth - 6)
      .attr('y', thresholdY - 6)
      .attr('text-anchor', 'end')
      .attr('font-size', '9.5px')
      .attr('font-family', 'monospace')
      .attr('fill', '#ef4444')
      .text('臨界瓶頸線 (2.80 ns)');

    // Gradient for area under curve
    const defs = svg.append('defs');
    const areaGradient = defs
      .append('linearGradient')
      .attr('id', 'latency-gradient')
      .attr('x1', '0%')
      .attr('y1', '0%')
      .attr('x2', '0%')
      .attr('y2', '100%');

    areaGradient.append('stop').attr('offset', '0%').attr('stop-color', '#38bdf8').attr('stop-opacity', 0.4);
    areaGradient.append('stop').attr('offset', '100%').attr('stop-color', '#0284c7').attr('stop-opacity', 0.02);

    // Area Generator
    const areaGen = d3
      .area<StreamDataPoint>()
      .x((d) => xScale(d.step))
      .y0(innerHeight)
      .y1((d) => yScale(d.delayNs))
      .curve(d3.curveMonotoneX);

    g.append('path')
      .datum(streamData)
      .attr('fill', 'url(#latency-gradient)')
      .attr('d', areaGen);

    // Line Generator
    const lineGen = d3
      .line<StreamDataPoint>()
      .x((d) => xScale(d.step))
      .y((d) => yScale(d.delayNs))
      .curve(d3.curveMonotoneX);

    g.append('path')
      .datum(streamData)
      .attr('fill', 'none')
      .attr('stroke', '#38bdf8')
      .attr('stroke-width', 2.2)
      .attr('d', lineGen);

    // Data points & markers
    streamData.forEach((pt) => {
      const cx = xScale(pt.step);
      const cy = yScale(pt.delayNs);
      const isCritical = pt.delayNs >= 2.8;

      g.append('circle')
        .attr('cx', cx)
        .attr('cy', cy)
        .attr('r', isCritical ? 4.5 : 3)
        .attr('fill', isCritical ? '#ef4444' : '#0284c7')
        .attr('stroke', '#ffffff')
        .attr('stroke-width', 1.5);

      // Label critical peaks
      if (isCritical) {
        g.append('text')
          .attr('x', cx)
          .attr('y', cy - 8)
          .attr('text-anchor', 'middle')
          .attr('font-size', '9px')
          .attr('font-family', 'monospace')
          .attr('font-weight', 'bold')
          .attr('fill', '#f87171')
          .text(`${pt.name} ${pt.delayNs}ns`);
      }
    });
  }, [streamData]);

  // ==========================================
  // D3 Visualization 3: 5-Stage Pipeline Latency Breakdown
  // ==========================================
  useEffect(() => {
    if (!stagesSvgRef.current) return;

    const svg = d3.select(stagesSvgRef.current);
    svg.selectAll('*').remove();

    const width = 560;
    const height = 180;
    const margin = { top: 25, right: 30, bottom: 25, left: 160 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const g = svg
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    const stages = [
      { name: 'S1 取指與三值解碼', delay: activeInspected.stageDelays.s1Decode, color: '#38bdf8' },
      { name: 'S2 操作數路由與分流', delay: activeInspected.stageDelays.s2Fanout, color: '#818cf8' },
      { name: 'S3 T-NAND 核心邏輯', delay: activeInspected.stageDelays.s3CoreLogic, color: '#fbbf24' },
      { name: 'S4 行波進位/借位鏈', delay: activeInspected.stageDelays.s4CarryChain, color: '#f87171' },
      { name: 'S5 MUX3 選通與寫回', delay: activeInspected.stageDelays.s5MuxSelect, color: '#34d399' },
    ];

    const yScale = d3
      .scaleBand()
      .domain(stages.map((s) => s.name))
      .range([0, innerHeight])
      .padding(0.28);

    const xScale = d3
      .scaleLinear()
      .domain([0, 2.5])
      .range([0, innerWidth]);

    // Stage labels
    g.selectAll('.stage-label')
      .data(stages)
      .enter()
      .append('text')
      .attr('class', 'stage-label')
      .attr('x', -10)
      .attr('y', (d) => (yScale(d.name) || 0) + yScale.bandwidth() / 2 + 4)
      .attr('text-anchor', 'end')
      .attr('font-size', '11px')
      .attr('fill', '#94a3b8')
      .text((d) => d.name);

    // Bars
    g.selectAll('.stage-bar')
      .data(stages)
      .enter()
      .append('rect')
      .attr('class', 'stage-bar')
      .attr('x', 0)
      .attr('y', (d) => yScale(d.name) || 0)
      .attr('width', (d) => xScale(d.delay))
      .attr('height', yScale.bandwidth())
      .attr('rx', 3)
      .attr('fill', (d) => d.color)
      .attr('fill-opacity', 0.9);

    // Delay Values Text
    g.selectAll('.stage-val')
      .data(stages)
      .enter()
      .append('text')
      .attr('class', 'stage-val')
      .attr('x', (d) => xScale(d.delay) + 8)
      .attr('y', (d) => (yScale(d.name) || 0) + yScale.bandwidth() / 2 + 4)
      .attr('font-size', '10.5px')
      .attr('font-family', 'monospace')
      .attr('font-weight', '600')
      .attr('fill', '#e2e8f0')
      .text((d) => `${d.delay.toFixed(2)} ns`);
  }, [activeInspected]);

  return (
    <div className="space-y-6">
      {/* Top Banner & KPI Stat Cards */}
      <div className="bg-slate-900/90 text-white border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden backdrop-blur-md">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-sky-500/10 via-amber-500/10 to-transparent rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono-code text-sky-400 mb-1.5">
              <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
              <span>D3.JS DYNAMIC PROFILING & HARDWARE BOTTLENECK MONITOR</span>
            </div>
            <h3 className="text-2xl font-bold font-serif-tc tracking-tight text-white flex items-center gap-2.5">
              <span>ALU 延遲與數據流轉效能分析儀</span>
              <span className="text-xs font-normal font-sans px-2.5 py-0.5 rounded-full bg-sky-950/80 text-sky-300 border border-sky-800">
                81 首微指令實時剖析
              </span>
            </h3>
            <p className="mt-2 text-sm text-slate-300 max-w-2xl leading-relaxed">
              利用 D3.js 監控 4-Trit ALU 在執行不同太玄 81 首指令時的門級傳播時延（Propagation Latency）、
              數據流轉吞吐效率（Throughput M-ops/s），並透過 9x9 拓撲熱點圖精確定位行波進位鏈、MUX3 樹及
              三值反相器飽和等潛在邏輯瓶頸。
            </p>
          </div>

          {/* Quick Metrics KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-slate-800/80 border border-slate-700/80 rounded-xl p-3.5 flex flex-col justify-between">
              <span className="text-[11px] text-slate-400 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-sky-400" />
                平均處理時延
              </span>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className="text-xl font-bold font-mono-code text-sky-300">{stats.avgDelay}</span>
                <span className="text-xs text-slate-400">ns</span>
              </div>
              <span className="text-[10px] text-slate-500 mt-1">範圍: {stats.minDelay} ~ {stats.maxDelay} ns</span>
            </div>

            <div className="bg-slate-800/80 border border-slate-700/80 rounded-xl p-3.5 flex flex-col justify-between">
              <span className="text-[11px] text-slate-400 flex items-center gap-1">
                <Gauge className="w-3.5 h-3.5 text-emerald-400" />
                平均流轉吞吐率
              </span>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className="text-xl font-bold font-mono-code text-emerald-300">{stats.avgThroughput}</span>
                <span className="text-xs text-slate-400">M-ops/s</span>
              </div>
              <span className="text-[10px] text-slate-500 mt-1">三進制流水線峰值</span>
            </div>

            <div className="bg-slate-800/80 border border-slate-700/80 rounded-xl p-3.5 flex flex-col justify-between">
              <span className="text-[11px] text-slate-400 flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                嚴重瓶頸指令
              </span>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className="text-xl font-bold font-mono-code text-rose-300">{stats.criticalCount}</span>
                <span className="text-xs text-slate-400">/ 81 首</span>
              </div>
              <span className="text-[10px] text-rose-400/80 mt-1">佔比: {stats.criticalPercentage}%</span>
            </div>

            <div className="bg-slate-800/80 border border-slate-700/80 rounded-xl p-3.5 flex flex-col justify-between">
              <span className="text-[11px] text-slate-400 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-teal-400" />
                高速流暢指令
              </span>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className="text-xl font-bold font-mono-code text-teal-300">{stats.optimalCount}</span>
                <span className="text-xs text-slate-400">/ 81 首</span>
              </div>
              <span className="text-[10px] text-teal-400/80 mt-1">時延 &lt; 1.9 ns</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Left Heatmap & Right Inspector/Real-time Graph */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* Left Column (Heatmap & Controls): 7 cols */}
        <div className="xl:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-5">
          {/* Header Controls: Metric switcher & filters */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
            <div>
              <span className="text-xs font-mono-code text-sky-600 dark:text-sky-400 block mb-0.5">
                HEATMAP MATRIX (9×9 TOPOLOGY)
              </span>
              <h4 className="text-base font-bold text-slate-900 dark:text-slate-100">
                81 首指令邏輯瓶頸熱點圖
              </h4>
            </div>

            {/* Metric Switcher */}
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl text-xs overflow-x-auto">
              <button
                type="button"
                onClick={() => setSelectedMetric('bottleneckScore')}
                className={`px-2.5 py-1.5 rounded-lg font-medium transition-all ${
                  selectedMetric === 'bottleneckScore'
                    ? 'bg-white dark:bg-slate-900 text-sky-600 dark:text-sky-400 shadow-xs font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                綜合瓶頸指數
              </button>
              <button
                type="button"
                onClick={() => setSelectedMetric('delayNs')}
                className={`px-2.5 py-1.5 rounded-lg font-medium transition-all ${
                  selectedMetric === 'delayNs'
                    ? 'bg-white dark:bg-slate-900 text-sky-600 dark:text-sky-400 shadow-xs font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                傳播延遲 (ns)
              </button>
              <button
                type="button"
                onClick={() => setSelectedMetric('throughput')}
                className={`px-2.5 py-1.5 rounded-lg font-medium transition-all ${
                  selectedMetric === 'throughput'
                    ? 'bg-white dark:bg-slate-900 text-sky-600 dark:text-sky-400 shadow-xs font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                吞吐率 (M/s)
              </button>
              <button
                type="button"
                onClick={() => setSelectedMetric('gateDepth')}
                className={`px-2.5 py-1.5 rounded-lg font-medium transition-all ${
                  selectedMetric === 'gateDepth'
                    ? 'bg-white dark:bg-slate-900 text-sky-600 dark:text-sky-400 shadow-xs font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                門級深度
              </button>
              <button
                type="button"
                onClick={() => setSelectedMetric('switchingPower')}
                className={`px-2.5 py-1.5 rounded-lg font-medium transition-all ${
                  selectedMetric === 'switchingPower'
                    ? 'bg-white dark:bg-slate-900 text-sky-600 dark:text-sky-400 shadow-xs font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                開關活躍度
              </button>
            </div>
          </div>

          {/* D3 Heatmap SVG Container */}
          <div className="w-full overflow-x-auto flex justify-center bg-slate-950/95 dark:bg-slate-950 p-4 rounded-xl border border-slate-800">
            <svg
              ref={heatmapSvgRef}
              viewBox="0 0 640 480"
              className="w-full max-w-[640px] h-auto select-none"
            />
          </div>

          {/* Legend and Navigation hint */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 pt-2 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-4 flex-wrap">
              <span className="font-medium text-slate-700 dark:text-slate-300">圖例標準：</span>
              <div className="flex items-center gap-1.5">
                <span className="w-3.5 h-3.5 rounded-xs bg-emerald-500" />
                <span>流暢 (&lt; 1.9ns)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3.5 h-3.5 rounded-xs bg-sky-500" />
                <span>普通 (1.9~2.5ns)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3.5 h-3.5 rounded-xs bg-amber-500" />
                <span>警戒 (2.5~2.8ns)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3.5 h-3.5 rounded-xs bg-rose-500" />
                <span>臨界瓶頸 (&gt; 2.8ns)</span>
              </div>
            </div>
            <div className="text-[11px] text-slate-400 italic">
              💡 點擊網格單元即可固定鎖定檢查該首指令
            </div>
          </div>
        </div>

        {/* Right Column: Detailed Instruction Inspector & Diagnostic (5 cols) */}
        <div className="xl:col-span-5 space-y-5">
          {/* Detailed Inspector Card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-2xl font-serif-tc text-sky-600 dark:text-sky-400 border border-slate-200 dark:border-slate-700 shadow-xs">
                  {activeInspected.unicodeChar}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-lg font-bold font-serif-tc text-slate-900 dark:text-slate-100">
                      第 {activeInspected.index} 首 · {activeInspected.name}
                    </h4>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        activeInspected.bottleneckLevel === 'critical'
                          ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/80 dark:text-rose-400 border border-rose-300 dark:border-rose-800'
                          : activeInspected.bottleneckLevel === 'warning'
                          ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/80 dark:text-amber-400 border border-amber-300 dark:border-amber-800'
                          : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800'
                      }`}
                    >
                      {activeInspected.bottleneckLevel === 'critical'
                        ? '⚠️ 臨界瓶頸'
                        : activeInspected.bottleneckLevel === 'warning'
                        ? '⚡ 中度時延'
                        : '✅ 時序最優'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5 text-xs font-mono-code text-slate-500">
                    <span>{activeInspected.mnemonic}</span>
                    <span>·</span>
                    <span className="uppercase">{activeInspected.opcode}</span>
                    <span>·</span>
                    <span>四爻 [{activeInspected.trits.join(',')}]</span>
                  </div>
                </div>
              </div>

              {/* Trits Badges */}
              <div className="flex gap-1">
                {activeInspected.trits.map((val, idx) => (
                  <TritBadge key={idx} val={val} mode={mode} size="sm" />
                ))}
              </div>
            </div>

            {/* Microarchitectural Numbers Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/50">
                <span className="text-[10px] text-slate-500 block">傳播時延</span>
                <span className="text-base font-bold font-mono-code text-sky-600 dark:text-sky-400">
                  {activeInspected.delayNs} ns
                </span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/50">
                <span className="text-[10px] text-slate-500 block">流轉吞吐率</span>
                <span className="text-base font-bold font-mono-code text-emerald-600 dark:text-emerald-400">
                  {activeInspected.throughput} M/s
                </span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/50">
                <span className="text-[10px] text-slate-500 block">關鍵路徑門數</span>
                <span className="text-base font-bold font-mono-code text-purple-600 dark:text-purple-400">
                  {activeInspected.gateDepth} 級
                </span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/50">
                <span className="text-[10px] text-slate-500 block">開關跳變率</span>
                <span className="text-base font-bold font-mono-code text-amber-600 dark:text-amber-400">
                  {activeInspected.switchingActivity}%
                </span>
              </div>
            </div>

            {/* 5-Stage Pipeline Delay Bar Chart */}
            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-sky-500" />
                  五階三值流水線延遲分佈 (Pipeline Latency Breakdown)
                </span>
                <span className="font-mono-code text-[11px] text-slate-500">
                  總計: {activeInspected.delayNs} ns
                </span>
              </div>
              <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 overflow-x-auto">
                <svg
                  ref={stagesSvgRef}
                  viewBox="0 0 560 180"
                  className="w-full max-w-[560px] h-auto"
                />
              </div>
            </div>

            {/* Hardware Bottleneck & Optimization Advice */}
            <div className="space-y-2.5 pt-1">
              <div className="p-3 rounded-xl bg-rose-50/80 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/60">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-rose-800 dark:text-rose-300 mb-1">
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400 shrink-0" />
                  <span>邏輯瓶頸成因 ({activeInspected.criticalGate})</span>
                </div>
                <p className="text-xs text-rose-700 dark:text-rose-300/90 leading-relaxed">
                  {activeInspected.bottleneckReason}
                </p>
              </div>

              <div className="p-3 rounded-xl bg-sky-50/80 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-900/60">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-sky-800 dark:text-sky-300 mb-1">
                  <Sparkles className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400 shrink-0" />
                  <span>硬體重構與延遲優化建議</span>
                </div>
                <p className="text-xs text-sky-700 dark:text-sky-300/90 leading-relaxed">
                  {activeInspected.mitigationAdvice}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Section: Dynamic D3 Real-Time Stress Timeline & Top Bottlenecks Ranking */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* Dynamic Latency Timeline (7 cols) */}
        <div className="xl:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <span className="text-xs font-mono-code text-sky-600 dark:text-sky-400 block mb-0.5">
                REAL-TIME STREAM & LATENCY JITTER
              </span>
              <h4 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <span>動態指令流轉時延與波形抖動監控</span>
                {isPlaying && (
                  <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
                )}
              </h4>
            </div>

            {/* Playback Controls */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsPlaying(!isPlaying)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all ${
                  isPlaying
                    ? 'bg-amber-100 hover:bg-amber-200 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 border border-amber-300 dark:border-amber-700'
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs'
                }`}
              >
                {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                <span>{isPlaying ? '暫停串流' : '繼續串流'}</span>
              </button>

              <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg text-xs">
                {[1, 2, 4].map((spd) => (
                  <button
                    key={spd}
                    type="button"
                    onClick={() => setSimSpeed(spd)}
                    className={`px-2 py-0.5 rounded text-[11px] font-mono-code transition-all ${
                      simSpeed === spd
                        ? 'bg-white dark:bg-slate-900 text-sky-600 dark:text-sky-400 font-bold shadow-xs'
                        : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    {spd}x
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* D3 Real-time Timeline SVG */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 overflow-x-auto">
            <svg
              ref={timelineSvgRef}
              viewBox="0 0 640 230"
              className="w-full max-w-[640px] h-auto select-none"
            />
          </div>

          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>橫軸：動態指令執行序號 (Instruction Stream Ticks)</span>
            <span>縱軸：ALU 關鍵路徑延遲 (0 ~ 5.0 ns)</span>
          </div>
        </div>

        {/* Top Bottlenecks Ranking Table (5 cols) */}
        <div className="xl:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <span className="text-xs font-mono-code text-rose-600 dark:text-rose-400 block mb-0.5">
                TOP LOGIC BOTTLENECKS
              </span>
              <h4 className="text-base font-bold text-slate-900 dark:text-slate-100">
                潛在邏輯瓶頸指令排行 (Top 6)
              </h4>
            </div>

            {/* Filter by Category */}
            <div className="flex items-center gap-1 text-xs">
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value as any)}
                aria-label="指令族群篩選"
                className="bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-700 dark:text-slate-300 focus:outline-none"
              >
                <option value="ALL">全部族群</option>
                <option value="arithmetic">算術族 (ADD/SUB)</option>
                <option value="logic">邏輯族 (MIN/MAX)</option>
                <option value="control">控制族 (CMP/SYS)</option>
              </select>
            </div>
          </div>

          {/* Ranking list */}
          <div className="space-y-2.5">
            {allMetrics
              .filter((m) => filterCategory === 'ALL' || m.category === filterCategory)
              .sort((a, b) => b.delayNs - a.delayNs)
              .slice(0, 6)
              .map((item, idx) => (
                <div
                  key={item.index}
                  onClick={() => setSelectedInstruction(item)}
                  className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                    selectedInstruction.index === item.index
                      ? 'bg-sky-50 dark:bg-sky-950/40 border-sky-400 dark:border-sky-700 shadow-xs'
                      : 'bg-slate-50 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800/80 border-slate-200/70 dark:border-slate-700/60'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold font-mono-code ${
                        idx === 0
                          ? 'bg-rose-500 text-white'
                          : idx === 1
                          ? 'bg-orange-500 text-white'
                          : idx === 2
                          ? 'bg-amber-500 text-white'
                          : 'bg-slate-300 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {idx + 1}
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-serif-tc font-bold text-sm text-slate-900 dark:text-slate-100">
                          {item.unicodeChar} {item.name}首
                        </span>
                        <span className="text-xs font-mono-code text-slate-500">
                          ({item.mnemonic})
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 block truncate max-w-[220px]">
                        {item.criticalGate}
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-sm font-bold font-mono-code text-rose-600 dark:text-rose-400 block">
                      {item.delayNs} ns
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {item.throughput} M/s · {item.gateDepth}G
                    </span>
                  </div>
                </div>
              ))}
          </div>

          <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 text-xs text-slate-600 dark:text-slate-400 flex items-start gap-2">
            <TrendingUp className="w-4 h-4 text-sky-500 shrink-0 mt-0.5" />
            <span>
              <strong>瓶頸收斂指引：</strong> 高位全加器（如差首、斂首）佔據關鍵延遲前三席。建議在工程實現中採用
              四位混合三值超前進位 (Ternary Hybrid CLA) 模組，可直接消除 1.25ns 的連鎖行波時延。
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
