/**
 * Dynamic D3.js Data Flow & State Transition Visualizer for 4-Trit ALU
 * Shows real-time signal propagation through internal logic gates and multiplexers
 * @license Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { TritValue, DisplayMode, AluOpcode, AluResult } from '../types/ternary';
import { TRIT_INFO, formatTrit } from '../lib/taiXuanData';

interface AluDataFlowD3Props {
  x: [TritValue, TritValue, TritValue, TritValue];
  y: [TritValue, TritValue, TritValue, TritValue];
  opcode: AluOpcode;
  result: AluResult;
  mode: DisplayMode;
}

interface D3Node {
  id: string;
  label: string;
  sublabel?: string;
  x: number;
  y: number;
  type: 'inputX' | 'inputY' | 'gate' | 'mux' | 'output' | 'flag';
  val?: TritValue;
  active?: boolean;
  color?: string;
}

interface D3Link {
  source: string;
  target: string;
  active: boolean;
  color: string;
  label?: string;
}

export const AluDataFlowD3: React.FC<AluDataFlowD3Props> = ({
  x,
  y,
  opcode,
  result,
  mode,
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [animSpeed, setAnimSpeed] = useState<'normal' | 'fast' | 'pause'>('normal');

  const width = 840;
  const height = 440;

  // Map ALU opcode to gate id
  const opcodeToGateId: Record<AluOpcode, string> = {
    ADD: 'gate_add',
    SUB: 'gate_sub',
    MIN: 'gate_min',
    MAX: 'gate_max',
    NEG: 'gate_neg',
    CYCLE: 'gate_cycle',
    SHL: 'gate_shl',
    SHR: 'gate_shr',
    CMP: 'gate_cmp',
  };

  const activeGateId = opcodeToGateId[opcode];

  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove(); // Clean slate

    // Define defs: markers, gradients, filters
    const defs = svg.append('defs');

    // Glow filter
    const filter = defs.append('filter').attr('id', 'glow').attr('x', '-20%').attr('y', '-20%').attr('width', '140%').attr('height', '140%');
    filter.append('feGaussianBlur').attr('stdDeviation', '3').attr('result', 'coloredBlur');
    const feMerge = filter.append('feMerge');
    feMerge.append('feMergeNode').attr('in', 'coloredBlur');
    feMerge.append('feMergeNode').attr('in', 'SourceGraphic');

    // Arrow markers
    ['#38bdf8', '#f59e0b', '#a855f7', '#10b981', '#64748b'].forEach((col) => {
      defs
        .append('marker')
        .attr('id', `arrow-${col.replace('#', '')}`)
        .attr('viewBox', '0 -5 10 10')
        .attr('refX', 8)
        .attr('refY', 0)
        .attr('markerWidth', 6)
        .attr('markerHeight', 6)
        .attr('orient', 'auto')
        .append('path')
        .attr('d', 'M0,-4L8,0L0,4')
        .attr('fill', col);
    });

    const g = svg.append('g').attr('class', 'main-group');

    // Zoom behavior
    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.7, 1.8])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });

    svg.call(zoom);

    // Build Nodes
    const nodes: D3Node[] = [];
    const tierLabels = ['方 (T3)', '州 (T2)', '部 (T1)', '家 (T0)'];

    // Stage 0: Inputs X (x: 60)
    x.forEach((val, i) => {
      nodes.push({
        id: `x_${i}`,
        label: `X${3 - i} ${tierLabels[i]}`,
        sublabel: formatTrit(val, mode),
        x: 60,
        y: 45 + i * 44,
        type: 'inputX',
        val,
        color: TRIT_INFO[val].color,
      });
    });

    // Stage 0: Inputs Y (x: 60)
    y.forEach((val, i) => {
      nodes.push({
        id: `y_${i}`,
        label: `Y${3 - i} ${tierLabels[i]}`,
        sublabel: formatTrit(val, mode),
        x: 60,
        y: 245 + i * 44,
        type: 'inputY',
        val,
        color: TRIT_INFO[val].color,
      });
    });

    // Stage 1: ALU Functional Cores (x: 320)
    const gatesList: Array<{ id: string; name: string; formula: string; op: AluOpcode }> = [
      { id: 'gate_add', name: '四爻加法陣列 (T-ADD)', formula: 'X + Y 逐爻相加', op: 'ADD' },
      { id: 'gate_sub', name: '四爻求差單元 (T-SUB)', formula: 'X - Y 模81求差', op: 'SUB' },
      { id: 'gate_min', name: '降取門陣列 (T-MIN)', formula: 'min(X, Y) 與門', op: 'MIN' },
      { id: 'gate_max', name: '升取門陣列 (T-MAX)', formula: 'max(X, Y) 或門', op: 'MAX' },
      { id: 'gate_neg', name: '倒反門陣列 (T-NOT)', formula: '2 - X 爻態倒轉', op: 'NEG' },
      { id: 'gate_cycle', name: '三才循變門 (T-CYCLE)', formula: '(X + 1) mod 3', op: 'CYCLE' },
      { id: 'gate_shl', name: '四爻左移器 (T-SHL)', formula: 'X ≪ 1 (乘三)', op: 'SHL' },
      { id: 'gate_shr', name: '四爻右移器 (T-SHR)', formula: 'X ≫ 1 (除三)', op: 'SHR' },
      { id: 'gate_cmp', name: '三態比較器 (T-CMP)', formula: 'X ≶ Y 判定', op: 'CMP' },
    ];

    gatesList.forEach((gt, idx) => {
      const isActive = gt.id === activeGateId;
      nodes.push({
        id: gt.id,
        label: gt.name,
        sublabel: gt.formula,
        x: 320,
        y: 32 + idx * 43,
        type: 'gate',
        active: isActive,
        color: isActive ? '#38bdf8' : '#475569',
      });
    });

    // Stage 2: MUX Selector (x: 560, y: 210)
    nodes.push({
      id: 'mux_router',
      label: `T-MUX 多路選擇器`,
      sublabel: `選通 Opcode: ${opcode}`,
      x: 560,
      y: 210,
      type: 'mux',
      active: true,
      color: '#f59e0b',
    });

    // Stage 3: Outputs (x: 750)
    result.out.forEach((val, i) => {
      nodes.push({
        id: `out_${i}`,
        label: `OUT${3 - i} ${tierLabels[i]}`,
        sublabel: formatTrit(val, mode),
        x: 750,
        y: 60 + i * 55,
        type: 'output',
        val,
        color: TRIT_INFO[val].color,
      });
    });

    // Stage 3: Status Flags (x: 750)
    const flagsList = [
      { id: 'flag_heaven', label: '陽昇標誌 (Pos)', active: result.isHeaven, col: '#38bdf8' },
      { id: 'flag_zero', label: '地歸標誌 (Zero)', active: result.isZero, col: '#f59e0b' },
      { id: 'flag_human', label: '人伏標誌 (Neg)', active: result.isHuman, col: '#a855f7' },
      { id: 'flag_overflow', label: '溢出標誌 (Carry)', active: result.overflow, col: '#f43f5e' },
    ];

    flagsList.forEach((fl, idx) => {
      nodes.push({
        id: fl.id,
        label: fl.label,
        sublabel: fl.active ? '● 激發' : '○ 熄滅',
        x: 750,
        y: 295 + idx * 34,
        type: 'flag',
        active: fl.active,
        color: fl.active ? fl.col : '#334155',
      });
    });

    // Build Node Map for coords
    const nodeMap = new Map<string, D3Node>();
    nodes.forEach((n) => nodeMap.set(n.id, n));

    // Build Links
    const links: D3Link[] = [];

    // Connect Inputs X and Y to active gate
    x.forEach((_, i) => {
      links.push({
        source: `x_${i}`,
        target: activeGateId,
        active: true,
        color: TRIT_INFO[x[i]].color,
      });
    });

    if (opcode !== 'NEG' && opcode !== 'CYCLE' && opcode !== 'SHL' && opcode !== 'SHR') {
      y.forEach((_, i) => {
        links.push({
          source: `y_${i}`,
          target: activeGateId,
          active: true,
          color: TRIT_INFO[y[i]].color,
        });
      });
    }

    // Connect all gates to MUX (active one is glowing, others faint)
    gatesList.forEach((gt) => {
      const isActive = gt.id === activeGateId;
      links.push({
        source: gt.id,
        target: 'mux_router',
        active: isActive,
        color: isActive ? '#f59e0b' : '#334155',
      });
    });

    // Connect MUX to Output nodes
    result.out.forEach((_, i) => {
      links.push({
        source: 'mux_router',
        target: `out_${i}`,
        active: true,
        color: TRIT_INFO[result.out[i]].color,
      });
    });

    // Connect MUX to Flags
    flagsList.forEach((fl) => {
      links.push({
        source: 'mux_router',
        target: fl.id,
        active: fl.active,
        color: fl.active ? fl.col : '#1e293b',
      });
    });

    // Render Curved Links (d3.linkHorizontal)
    const linkGenerator = d3
      .linkHorizontal<any, [number, number]>()
      .x((d: [number, number]) => d[0])
      .y((d: [number, number]) => d[1]);

    const linkPaths = g
      .append('g')
      .attr('class', 'links')
      .selectAll('path')
      .data(links)
      .enter()
      .append('path')
      .attr('d', (d) => {
        const s = nodeMap.get(d.source)!;
        const t = nodeMap.get(d.target)!;
        return linkGenerator({
          source: [s.x + (s.type === 'gate' ? 70 : s.type === 'mux' ? 60 : 35), s.y],
          target: [t.x - (t.type === 'gate' ? 70 : t.type === 'mux' ? 60 : 35), t.y],
        });
      })
      .attr('fill', 'none')
      .attr('stroke', (d) => d.color)
      .attr('stroke-width', (d) => (d.active ? 2.5 : 0.8))
      .attr('stroke-opacity', (d) => (d.active ? 0.9 : 0.2))
      .attr('stroke-dasharray', (d) => (d.active ? '6 3' : 'none'))
      .attr('filter', (d) => (d.active ? 'url(#glow)' : 'none'));

    // Animated particles along active paths
    if (animSpeed !== 'pause') {
      const activeLinks = links.filter((l) => l.active);
      const particleGroup = g.append('g').attr('class', 'particles');

      const pathNodes: SVGPathElement[] = [];
      linkPaths.each(function (d) {
        if (d.active) {
          pathNodes.push(this as SVGPathElement);
        }
      });

      const particleCount = 28;
      const speedMultiplier = animSpeed === 'fast' ? 1.8 : 1.0;

      const particles = particleGroup
        .selectAll('circle')
        .data(d3.range(particleCount))
        .enter()
        .append('circle')
        .attr('r', 3)
        .attr('fill', '#fff')
        .attr('filter', 'url(#glow)');

      let elapsed = 0;
      const timer = d3.timer(() => {
        elapsed += 0.006 * speedMultiplier;
        particles.each(function (_, idx) {
          if (pathNodes.length === 0) return;
          const pathIndex = idx % pathNodes.length;
          const targetPath = pathNodes[pathIndex];
          const totalLen = targetPath.getTotalLength();
          const progress = (elapsed + idx / particleCount) % 1;
          const pt = targetPath.getPointAtLength(progress * totalLen);

          d3.select(this)
            .attr('cx', pt.x)
            .attr('cy', pt.y)
            .attr('fill', activeLinks[pathIndex]?.color || '#38bdf8');
        });
      });

      // Cleanup timer on re-render
      return () => {
        timer.stop();
      };
    }

    // Render Nodes
    const nodeGroup = g
      .append('g')
      .attr('class', 'nodes')
      .selectAll('g')
      .data(nodes)
      .enter()
      .append('g')
      .attr('transform', (d) => `translate(${d.x}, ${d.y})`)
      .style('cursor', 'pointer')
      .on('mouseenter', (_, d) => setHoveredNode(d.id))
      .on('mouseleave', () => setHoveredNode(null));

    // Input Nodes
    nodeGroup
      .filter((d) => d.type === 'inputX' || d.type === 'inputY')
      .each(function (d) {
        const el = d3.select(this);
        el.append('rect')
          .attr('x', -35)
          .attr('y', -16)
          .attr('width', 70)
          .attr('height', 32)
          .attr('rx', 6)
          .attr('fill', '#1e293b')
          .attr('stroke', d.color || '#64748b')
          .attr('stroke-width', 1.8);

        el.append('text')
          .attr('x', 0)
          .attr('y', -2)
          .attr('text-anchor', 'middle')
          .attr('fill', '#94a3b8')
          .attr('font-size', '10px')
          .attr('font-family', 'monospace')
          .text(d.label);

        el.append('text')
          .attr('x', 0)
          .attr('y', 11)
          .attr('text-anchor', 'middle')
          .attr('fill', '#f8fafc')
          .attr('font-size', '11px')
          .attr('font-weight', 'bold')
          .attr('font-family', 'monospace')
          .text(d.sublabel || '');
      });

    // Gate Nodes (Center Bank)
    nodeGroup
      .filter((d) => d.type === 'gate')
      .each(function (d) {
        const el = d3.select(this);
        const isActive = d.active;

        el.append('rect')
          .attr('x', -70)
          .attr('y', -15)
          .attr('width', 140)
          .attr('height', 30)
          .attr('rx', 6)
          .attr('fill', isActive ? '#0f2942' : '#0f172a')
          .attr('stroke', isActive ? '#38bdf8' : '#334155')
          .attr('stroke-width', isActive ? 2.5 : 1)
          .attr('filter', isActive ? 'url(#glow)' : 'none');

        el.append('text')
          .attr('x', 0)
          .attr('y', -1)
          .attr('text-anchor', 'middle')
          .attr('fill', isActive ? '#ffffff' : '#94a3b8')
          .attr('font-size', '10.5px')
          .attr('font-weight', isActive ? 'bold' : 'normal')
          .text(d.label);

        el.append('text')
          .attr('x', 0)
          .attr('y', 10)
          .attr('text-anchor', 'middle')
          .attr('fill', isActive ? '#7dd3fc' : '#475569')
          .attr('font-size', '9px')
          .attr('font-family', 'monospace')
          .text(d.sublabel || '');
      });

    // MUX Router Node
    nodeGroup
      .filter((d) => d.type === 'mux')
      .each(function (d) {
        const el = d3.select(this);
        el.append('rect')
          .attr('x', -60)
          .attr('y', -24)
          .attr('width', 120)
          .attr('height', 48)
          .attr('rx', 8)
          .attr('fill', '#1e293b')
          .attr('stroke', '#f59e0b')
          .attr('stroke-width', 2.5)
          .attr('filter', 'url(#glow)');

        el.append('text')
          .attr('x', 0)
          .attr('y', -4)
          .attr('text-anchor', 'middle')
          .attr('fill', '#ffffff')
          .attr('font-size', '11px')
          .attr('font-weight', 'bold')
          .text(d.label);

        el.append('text')
          .attr('x', 0)
          .attr('y', 13)
          .attr('text-anchor', 'middle')
          .attr('fill', '#fde68a')
          .attr('font-size', '10px')
          .attr('font-family', 'monospace')
          .text(d.sublabel || '');
      });

    // Output Nodes
    nodeGroup
      .filter((d) => d.type === 'output')
      .each(function (d) {
        const el = d3.select(this);
        el.append('rect')
          .attr('x', -40)
          .attr('y', -18)
          .attr('width', 80)
          .attr('height', 36)
          .attr('rx', 6)
          .attr('fill', '#0f172a')
          .attr('stroke', d.color || '#10b981')
          .attr('stroke-width', 2.2)
          .attr('filter', 'url(#glow)');

        el.append('text')
          .attr('x', 0)
          .attr('y', -3)
          .attr('text-anchor', 'middle')
          .attr('fill', '#cbd5e1')
          .attr('font-size', '10px')
          .attr('font-family', 'monospace')
          .text(d.label);

        el.append('text')
          .attr('x', 0)
          .attr('y', 12)
          .attr('text-anchor', 'middle')
          .attr('fill', '#ffffff')
          .attr('font-size', '12px')
          .attr('font-weight', 'bold')
          .attr('font-family', 'monospace')
          .text(d.sublabel || '');
      });

    // Flag Nodes
    nodeGroup
      .filter((d) => d.type === 'flag')
      .each(function (d) {
        const el = d3.select(this);
        el.append('rect')
          .attr('x', -45)
          .attr('y', -12)
          .attr('width', 90)
          .attr('height', 24)
          .attr('rx', 4)
          .attr('fill', d.active ? '#1e293b' : '#0f172a')
          .attr('stroke', d.color || '#334155')
          .attr('stroke-width', d.active ? 1.8 : 1);

        el.append('text')
          .attr('x', 0)
          .attr('y', 4)
          .attr('text-anchor', 'middle')
          .attr('fill', d.active ? '#f8fafc' : '#475569')
          .attr('font-size', '9.5px')
          .attr('font-family', 'monospace')
          .attr('font-weight', d.active ? 'bold' : 'normal')
          .text(`${d.label}: ${d.sublabel}`);
      });
  }, [x, y, opcode, result, mode, animSpeed]);

  const handleResetZoom = () => {
    if (!svgRef.current) return;
    const svg = d3.select(svgRef.current);
    svg.transition().duration(400).call(d3.zoom<SVGSVGElement, unknown>().transform, d3.zoomIdentity);
  };

  return (
    <div
      ref={containerRef}
      className="bg-slate-950 border border-slate-800 rounded-2xl p-5 text-white shadow-xl space-y-4 relative overflow-hidden"
    >
      {/* Visualizer Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono-code text-sky-400 font-bold">D3.JS DYNAMIC PIPELINE</span>
            <span aria-hidden="true" className="text-slate-600">·</span>
            <span className="text-xs text-slate-400">4-Trit 向量狀態遷移流向圖</span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            四爻向量經由指令解碼激發對應運算陣列，並經 T-MUX 匯聚輸出
          </p>
        </div>

        {/* Animation & Zoom Controls */}
        <div className="flex items-center gap-2">
          <div className="flex items-center p-0.5 bg-slate-900 rounded-lg text-xs font-mono-code border border-slate-800">
            <button
              type="button"
              onClick={() => setAnimSpeed('normal')}
              className={`px-2 py-1 rounded transition-colors ${
                animSpeed === 'normal' ? 'bg-sky-600 text-white font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              正常流速
            </button>
            <button
              type="button"
              onClick={() => setAnimSpeed('fast')}
              className={`px-2 py-1 rounded transition-colors ${
                animSpeed === 'fast' ? 'bg-sky-600 text-white font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              倍速
            </button>
            <button
              type="button"
              onClick={() => setAnimSpeed('pause')}
              className={`px-2 py-1 rounded transition-colors ${
                animSpeed === 'pause' ? 'bg-amber-600 text-white font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              靜態
            </button>
          </div>

          <button
            type="button"
            onClick={handleResetZoom}
            className="px-2.5 py-1 text-xs font-mono-code bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-lg text-slate-300 transition-colors"
          >
            重置視角
          </button>
        </div>
      </div>

      {/* Stage Legends */}
      <div className="flex items-center justify-between text-[11px] font-mono-code text-slate-400 px-4 pt-1 border-b border-slate-900 pb-2">
        <span className="w-24">① 四爻輸入引腳</span>
        <span className="text-center flex-1">② 算術邏輯運算核心陣列 (ALU Cores)</span>
        <span className="w-36 text-center">③ T-MUX 路由</span>
        <span className="w-28 text-right">④ 結果與標誌位</span>
      </div>

      {/* Main SVG Stage */}
      <div className="w-full overflow-hidden rounded-xl border border-slate-900 bg-slate-950/60 relative">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-80 sm:h-96 md:h-[420px] select-none"
        />

        {/* Hover inspection pill */}
        {hoveredNode && (
          <div className="absolute bottom-3 left-3 bg-slate-900/90 border border-slate-700 px-3 py-1.5 rounded-lg text-xs font-mono-code text-slate-200 backdrop-blur-sm pointer-events-none shadow-lg">
            節點探針：<span className="text-sky-400 font-bold">{hoveredNode}</span>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between text-[11px] font-mono-code text-slate-500 pt-1">
        <span>支援滑鼠滾輪縮放與拖曳移動 (Zoom & Pan)</span>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-sky-400" /> 天爻信號
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-amber-400" /> 地爻信號
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-violet-400" /> 人爻信號
          </span>
        </div>
      </div>
    </div>
  );
};
