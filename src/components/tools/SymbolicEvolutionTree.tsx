/**
 * Symbolic Evolution Tree Visualizer (符號演化史：從陰陽二進制到太玄三進制的邏輯演進樹)
 * D3.js interactive hierarchical tree with node inspection and HDL code preview
 * @license Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';

export interface EvolutionNode {
  id: string;
  name: string;
  glyph: string;
  epoch: string;
  category: 'root' | 'binary' | 'ternary' | 'synthesis';
  concept: string;
  mathMapping: string;
  description: string;
  hdlFile: string;
  hdlCode: string;
  children?: EvolutionNode[];
}

const EVOLUTION_TREE_DATA: EvolutionNode = {
  id: 'root',
  name: '元元本始 · 數理之源',
  glyph: '𝌆',
  epoch: '上古觀象授時',
  category: 'root',
  concept: '天地之大數，生於虛無而形於萬象。二進制立陰陽之對立，三進制立三才之調和。',
  mathMapping: 'Radix r ∈ {2, 3}',
  description: '世界計算文明的雙峰：伏羲畫卦啟迪了萊布尼茨二進制布爾代數；漢代揚雄《太玄經》則以「一玄策三才」開創了世界最早的完備三進制宇宙模型。',
  hdlFile: 'Origin.thdl',
  hdlCode: `/**
 * Architecture Origin: From Binary Dualism to Ternary Harmony
 * Binary:  S = {0, 1}        -> Dual Inversion: NOT(x) = 1 - x
 * Ternary: S = {-1, 0, +1}   -> Symmetrical Inversion: TNOT(x) = -x
 */`,
  children: [
    {
      id: 'bin_root',
      name: '易經陰陽二進制分支 (2ⁿ)',
      glyph: '☯',
      epoch: '殷周 · 伏羲易卦',
      category: 'binary',
      concept: '易有太極，是生兩儀。陰陽二分法，對立而轉化。',
      mathMapping: '|S| = 2ⁿ (2, 4, 8, 16, 32, 64)',
      description: '萊布尼茨於 1703 年《二進制算術的闡述》中指出：伏羲六十四卦以一長橫（陽 ⚊）與兩短橫（陰 ⚋）組合，乃人類最早之二進制記數思想。',
      hdlFile: 'BinaryOrigin.hdl',
      hdlCode: `/**
 * Classical Binary Axiom
 * 0 = Yin (⚋), 1 = Yang (⚊)
 */
CHIP BinaryAxiom {
    IN in;
    OUT out;
    PARTS:
    Not(in=in, out=out);
}`,
      children: [
        {
          id: 'bin_liangyi',
          name: '兩儀二態 (Yin & Yang)',
          glyph: '⚊⚋',
          epoch: '周易本經',
          category: 'binary',
          concept: '陽爻 ⚊ (1) 與陰爻 ⚋ (0)，互為反相。',
          mathMapping: 'NOT(x) = 1 - x',
          description: '現代計算機反相門（Inverter/NOT Gate）的原型，雙態對稱反轉。',
          hdlFile: 'Not.hdl',
          hdlCode: `CHIP Not {
    IN in;
    OUT out;
    PARTS:
    Nand(a=in, b=in, out=out);
}`,
        },
        {
          id: 'bin_sixiang',
          name: '四象與邏輯與非 (Four Images)',
          glyph: '⚏⚌',
          epoch: '易傳 · 繫辭',
          category: 'binary',
          concept: '太陽、少陰、少陽、太陰，2² = 4 種狀態，對應雙變量布爾真值。',
          mathMapping: 'NAND(a, b) = 1 - (a ∧ b)',
          description: '現代數字邏輯的萬能基石 NAND 門，4 組真值對應太極生四象。',
          hdlFile: 'Nand.hdl',
          hdlCode: `CHIP Nand {
    IN a, b;
    OUT out;
    BUILTIN Nand;
}`,
        },
        {
          id: 'bin_bagua',
          name: '八卦與半加器 (Eight Trigrams)',
          glyph: '☰☷',
          epoch: '文王八卦',
          category: 'binary',
          concept: '三爻成卦，2³ = 8 卦。八卦互盪，生數進位。',
          mathMapping: 'HalfAdder: Sum = a ⊕ b, Carry = a ∧ b',
          description: '經典二進制半加器與全加器，以進位與本位和演繹卦象交泰。',
          hdlFile: 'HalfAdder.hdl',
          hdlCode: `CHIP HalfAdder {
    IN a, b;
    OUT sum, carry;
    PARTS:
    Xor(a=a, b=b, out=sum);
    And(a=a, b=b, out=carry);
}`,
        },
        {
          id: 'bin_64gua',
          name: '六十四卦與經典 ALU',
          glyph: '䷀䷁',
          epoch: '周漢 · 萊布尼茨二進制',
          category: 'binary',
          concept: '重卦六爻，2⁶ = 64 卦，為二進制字節運算與 ALU 之先聲。',
          mathMapping: 'ALU(x, y, op) -> out',
          description: '經典 Nand to Tetris Hack ALU 架構，以二進制六位元控制運算。',
          hdlFile: 'ALU.hdl',
          hdlCode: `CHIP ALU {
    IN x[16], y[16], zx, nx, zy, ny, f, no;
    OUT out[16], zr, ng;
    // Classical 2's Complement Hack ALU
}`,
        },
      ],
    },
    {
      id: 'ter_root',
      name: '太玄三才三進制分支 (3ⁿ)',
      glyph: '𝌀',
      epoch: '西漢 · 揚雄《太玄經》',
      category: 'ternary',
      concept: '夫玄也，幽攡萬類而不見形。一玄策三才，天地人鼎足而立。',
      mathMapping: '|S| = 3ⁿ (3, 9, 27, 81, 243, 729)',
      description: '公元前 2 年揚雄撰寫《太玄經》，將每爻分為一畫（天 ⚊）、二畫（地 ⚋）、三畫（人 𝌀），建立了世界首個完整三進制宇宙模型。',
      hdlFile: 'TaiXuanAxiom.thdl',
      hdlCode: `/**
 * Tai Xuan Ternary Axiom
 * Heaven (天: 2 / +1), Earth (地: 1 / 0), Human (人: 0 / -1)
 */
CHIP TaiXuanAxiom {
    IN in;
    OUT out;
    PARTS:
    TNand(a=in, b=in, out=out);
}`,
      children: [
        {
          id: 'ter_sancai',
          name: '三才本原：T-NAND 門',
          glyph: '⚊⚋𝌀',
          epoch: '太玄 · 玄數',
          category: 'ternary',
          concept: '天純陽、地處中、人和合。物極必反，亢陽降為人，人伏升為天。',
          mathMapping: 'TNAND(a, b) = 2 - min(a, b) [平衡: -min(a, b)]',
          description: '太玄元始通用門，為三進制體系自底向上構建的唯一出發點。',
          hdlFile: 'TNand.thdl',
          hdlCode: `CHIP TNand {
    IN a, b;
    OUT out;
    BUILTIN TNand;
}`,
        },
        {
          id: 'ter_jiudeng',
          name: '兩爻九州：T-AND / T-OR 門殿',
          glyph: '𝌇𝌈',
          epoch: '太玄 · 九州',
          category: 'ternary',
          concept: '兩爻成九，3² = 9 州。太玄德摩根律：升取為或，降取為與。',
          mathMapping: 'max(a, b) = TNAND(TNOT(a), TNOT(b))',
          description: '由 2 個與 3 個 T-NAND 分別合成三值與門（min）與或門（max）。',
          hdlFile: 'TOr.thdl',
          hdlCode: `CHIP TOr {
    IN a, b;
    OUT out;
    PARTS:
    TNot(in=a, out=notA);
    TNot(in=b, out=notB);
    TNand(a=notA, b=notB, out=out);
}`,
        },
        {
          id: 'ter_sanbu',
          name: '三爻廿七部：三進制加法器',
          glyph: '𝌊𝌋',
          epoch: '太玄 · 廿七部',
          category: 'ternary',
          concept: '三爻相生，3³ = 27 部。半加與全加，逢三進一，位權相承。',
          mathMapping: 'Sum = (a + b + cin) mod 3, Cout = ⌊(a + b + cin)/3⌋',
          description: '太玄半加器與全加器，實現了純粹三進制模算與進位波紋傳導。',
          hdlFile: 'THalfAdder.thdl',
          hdlCode: `CHIP THalfAdder {
    IN a, b;
    OUT sum, carry;
    PARTS:
    TMod3Sum(a=a, b=b, out=sum);
    TThresholdCarry(a=a, b=b, out=carry);
}`,
        },
        {
          id: 'ter_81shou',
          name: '四爻八十一首：太玄 4-Trit ALU',
          glyph: '𝌆𝍖',
          epoch: '太玄 · 八十一首',
          category: 'ternary',
          concept: '方州部家四爻成首，3⁴ = 81 首。首冠萬物，周流曆法。',
          mathMapping: 'ALU4(x[4], y[4], op) -> out[4], flags',
          description: '完備 4-Trit 算術邏輯單元，驅動八十一首運算與陽昇/地歸/人伏/溢出標誌。',
          hdlFile: 'TAlu4.thdl',
          hdlCode: `CHIP TAlu4 {
    IN x[4], y[4], opcode[3];
    OUT out[4], carry, isZero, isHeaven, isHuman;
    PARTS:
    TFourTritAdder(x=x, y=y, sum=addOut, carry=addCarry);
    TFourTritMin(x=x, y=y, out=minOut);
    TFourTritMax(x=x, y=y, out=maxOut);
    TFourTritNeg(x=x, out=negOut);
}`,
        },
      ],
    },
    {
      id: 'comp_root',
      name: '計算科學交匯與物理實體',
      glyph: '⚡',
      epoch: '1958 ~ 現代前沿',
      category: 'synthesis',
      concept: '高德納平衡三進制極致讚頌，蘇聯 Setun 計算機硬體實體實現。',
      mathMapping: 'ln(3)/ln(2) ≈ 1.585 bits/trit',
      description: '從 1958 蘇聯莫斯科大學 Setun 三進制計算機到現代三值光學/量子計算（Qutrit），三進制以高信息密度與零符號位偏置展現出驚人生命力。',
      hdlFile: 'SetunTrit.thdl',
      hdlCode: `/**
 * Soviet Setun 1958 & Balanced Ternary Architecture
 * Inherent Sign Symmetry: Negation requires zero adder cycles
 */
CHIP SetunRegister {
    IN in[4], load;
    OUT out[4];
    PARTS:
    TriStableLatch4(in=in, load=load, out=out);
}`,
      children: [
        {
          id: 'setun_1958',
          name: '蘇聯 Setun 1958 計算機',
          glyph: 'С',
          epoch: '1958 莫斯科國立大學',
          category: 'synthesis',
          concept: '布魯森佐夫研製，人類歷史上唯一成功量產的平衡三進制硬體計算機。',
          mathMapping: 'Tri-stable Magnetic Core Memory',
          description: '採用鐵氧體磁心三穩態單元，能耗與元器件數量顯著低於同期二進制管機。',
          hdlFile: 'SetunCore.thdl',
          hdlCode: `CHIP SetunCore {
    IN data[18], clk;
    OUT acc[18];
    // 18-Trit Balanced Word Length
}`,
        },
        {
          id: 'knuth_symmetry',
          name: '高德納平衡三進制對稱律',
          glyph: 'K',
          epoch: '1969 TAOCP Vol. 2',
          category: 'synthesis',
          concept: '「平衡三進制也許是所有進位記數法中最為優美對稱的。」',
          mathMapping: 'Neg(x) = -x (No sign bit, no 2s complement overhead)',
          description: '高德納指出，四捨五入在平衡三進制中退化為直接截斷，乘法與符號判定無額外分支代價。',
          hdlFile: 'KnuthSymmetry.thdl',
          hdlCode: `CHIP KnuthSymmetry {
    IN a[4];
    OUT negA[4];
    PARTS:
    TNot4(in=a, out=negA);
}`,
        },
      ],
    },
  ],
};

export const SymbolicEvolutionTree: React.FC = () => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [selectedNode, setSelectedNode] = useState<EvolutionNode>(
    EVOLUTION_TREE_DATA.children![1].children![3] // Default to 81首 ALU
  );
  const [copied, setCopied] = useState<boolean>(false);

  const width = 860;
  const height = 480;

  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove(); // Clean previous render

    // Glow filter
    const defs = svg.append('defs');
    const filter = defs
      .append('filter')
      .attr('id', 'tree-glow')
      .attr('x', '-20%')
      .attr('y', '-20%')
      .attr('width', '140%')
      .attr('height', '140%');
    filter.append('feGaussianBlur').attr('stdDeviation', '3').attr('result', 'coloredBlur');
    const feMerge = filter.append('feMerge');
    feMerge.append('feMergeNode').attr('in', 'coloredBlur');
    feMerge.append('feMergeNode').attr('in', 'SourceGraphic');

    const g = svg.append('g').attr('class', 'tree-container');

    // Zoom setup
    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.6, 2.0])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });

    svg.call(zoom);

    // Initial transform: slight shift right & vertically centered
    svg.call(zoom.transform, d3.zoomIdentity.translate(40, 20).scale(0.92));

    // D3 Hierarchy & Tree Layout
    const rootHierarchy = d3.hierarchy<EvolutionNode>(EVOLUTION_TREE_DATA);
    const treeLayout = d3.tree<EvolutionNode>().size([height - 60, width - 260]);
    const treeData = treeLayout(rootHierarchy);

    // Category Color Palette
    const getCategoryColor = (cat: EvolutionNode['category'], isSelected: boolean) => {
      if (isSelected) return '#38bdf8';
      switch (cat) {
        case 'root':
          return '#e2e8f0';
        case 'binary':
          return '#94a3b8';
        case 'ternary':
          return '#38bdf8';
        case 'synthesis':
          return '#f59e0b';
      }
    };

    // Render Curved Connecting Links
    const linkGenerator = d3
      .linkHorizontal<d3.HierarchyPointLink<EvolutionNode>, d3.HierarchyPointNode<EvolutionNode>>()
      .x((d) => d.y)
      .y((d) => d.x);

    g.append('g')
      .attr('class', 'links')
      .selectAll('path')
      .data(treeData.links())
      .enter()
      .append('path')
      .attr('d', linkGenerator)
      .attr('fill', 'none')
      .attr('stroke', (d) => {
        const cat = d.target.data.category;
        return cat === 'ternary' ? '#0284c7' : cat === 'binary' ? '#475569' : '#b45309';
      })
      .attr('stroke-width', (d) => (d.target.data.category === 'ternary' ? 2.2 : 1.4))
      .attr('stroke-opacity', 0.6)
      .attr('stroke-dasharray', (d) => (d.target.data.category === 'binary' ? '3 3' : 'none'));

    // Render Nodes Group
    const nodeElements = g
      .append('g')
      .attr('class', 'nodes')
      .selectAll('g')
      .data(treeData.descendants())
      .enter()
      .append('g')
      .attr('transform', (d) => `translate(${d.y}, ${d.x})`)
      .style('cursor', 'pointer')
      .on('click', (_, d) => {
        setSelectedNode(d.data);
      });

    // Node Outer Ring / Box
    nodeElements.each(function (d) {
      const el = d3.select(this);
      const isSelected = selectedNode.id === d.data.id;
      const col = getCategoryColor(d.data.category, isSelected);

      // Node base circle/pill
      el.append('circle')
        .attr('r', d.depth === 0 ? 18 : 14)
        .attr('fill', isSelected ? '#0369a1' : '#0f172a')
        .attr('stroke', col)
        .attr('stroke-width', isSelected ? 3 : 1.8)
        .attr('filter', isSelected ? 'url(#tree-glow)' : 'none');

      // Glyph inside node
      el.append('text')
        .attr('text-anchor', 'middle')
        .attr('dominant-baseline', 'central')
        .attr('fill', isSelected ? '#ffffff' : col)
        .attr('font-size', d.depth === 0 ? '13px' : '11px')
        .attr('font-family', 'serif')
        .attr('font-weight', 'bold')
        .text(d.data.glyph.slice(0, 2));

      // Label beside node
      el.append('text')
        .attr('dx', d.children ? -18 : 20)
        .attr('dy', 4)
        .attr('text-anchor', d.children ? 'end' : 'start')
        .attr('fill', isSelected ? '#ffffff' : '#cbd5e1')
        .attr('font-size', '11px')
        .attr('font-weight', isSelected ? 'bold' : 'normal')
        .attr('font-family', 'sans-serif')
        .text(d.data.name);

      // Epoch tag below
      el.append('text')
        .attr('dx', d.children ? -18 : 20)
        .attr('dy', 16)
        .attr('text-anchor', d.children ? 'end' : 'start')
        .attr('fill', '#64748b')
        .attr('font-size', '9px')
        .attr('font-family', 'monospace')
        .text(d.data.epoch);
    });
  }, [selectedNode]);

  const handleCopyCode = () => {
    navigator.clipboard?.writeText(selectedNode.hdlCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleResetZoom = () => {
    if (!svgRef.current) return;
    const svg = d3.select(svgRef.current);
    svg.transition().duration(400).call(
      d3.zoom<SVGSVGElement, unknown>().transform,
      d3.zoomIdentity.translate(40, 20).scale(0.92)
    );
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <span className="text-xs font-mono-code text-sky-600 dark:text-sky-400 block mb-0.5">
            LOGICAL EVOLUTION MAPPING TREE (D3.JS)
          </span>
          <h3 className="text-lg font-bold font-serif-tc text-slate-900 dark:text-slate-100">
            符號演化史：從陰陽二進制到太玄三進制邏輯演進樹
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            點擊演化樹中的任意哲學與邏輯節點，檢視對應的 HDL 硬件源碼規範與數理映射
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleResetZoom}
            className="px-3 py-1.5 text-xs font-mono-code bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg transition-colors border border-slate-200 dark:border-slate-700"
          >
            重置視角
          </button>
        </div>
      </div>

      {/* Main Split: D3 Tree (7 cols) + HDL Inspection Drawer (5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left D3 Canvas (7 cols) */}
        <div className="lg:col-span-7 bg-slate-950 rounded-2xl p-4 border border-slate-800 relative overflow-hidden shadow-inner">
          <div className="flex items-center justify-between text-[11px] font-mono-code text-slate-400 pb-2 border-b border-slate-800/80 mb-2">
            <span>演進拓撲分支：易經 (2ⁿ) ⟷ 太玄 (3ⁿ) ⟷ 現代計算</span>
            <span className="text-slate-500">支援拖曳與滾輪縮放</span>
          </div>

          <svg
            ref={svgRef}
            viewBox={`0 0 ${width} ${height}`}
            className="w-full h-[420px] select-none"
          />

          {/* Category Legends */}
          <div className="flex items-center justify-center gap-5 text-[11px] font-mono-code text-slate-400 pt-2 border-t border-slate-800/80">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-400" /> 易經陰陽二進制 (2ⁿ)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-sky-400" /> 太玄三進制體系 (3ⁿ)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400" /> Setun & 現代計算科學
            </span>
          </div>
        </div>

        {/* Right HDL Code & Concept Inspector (5 cols) */}
        <div className="lg:col-span-5 bg-slate-50 dark:bg-slate-800/40 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-700/80">
            <div className="flex items-center gap-2.5">
              <span className="w-8 h-8 rounded-lg bg-sky-600 text-white font-serif-tc text-base flex items-center justify-center font-bold shadow-xs">
                {selectedNode.glyph}
              </span>
              <div>
                <h4 className="text-sm font-bold font-serif-tc text-slate-900 dark:text-slate-100">
                  {selectedNode.name}
                </h4>
                <span className="text-[10px] font-mono-code text-slate-500">
                  {selectedNode.epoch}
                </span>
              </div>
            </div>

            <span className="text-[10px] font-mono-code px-2 py-0.5 rounded bg-sky-100 dark:bg-sky-950/60 text-sky-800 dark:text-sky-300 font-semibold">
              {selectedNode.hdlFile}
            </span>
          </div>

          {/* Description & Concept */}
          <div className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
            <p className="leading-relaxed">{selectedNode.description}</p>
            <div className="p-2.5 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 font-mono-code text-[11px] text-sky-700 dark:text-sky-400">
              數理映射：{selectedNode.mathMapping}
            </div>
          </div>

          {/* HDL Source Code Snippet */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
              <span className="font-semibold font-mono-code">{selectedNode.hdlFile} 規格定義</span>
              <button
                type="button"
                onClick={handleCopyCode}
                className="text-[11px] font-mono-code px-2 py-0.5 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                {copied ? '已複製 ✓' : '複製 HDL'}
              </button>
            </div>

            <pre className="p-3.5 bg-slate-950 text-sky-300 font-mono-code text-[11px] rounded-xl overflow-x-auto leading-relaxed border border-slate-800 max-h-52">
              <code>{selectedNode.hdlCode}</code>
            </pre>
          </div>

          <div className="text-[10px] text-slate-400 pt-1 leading-relaxed">
            提示：在左側樹狀圖中點選任意分支節點（如兩儀、四象、八卦、T-NAND、加法器、ALU 或 Setun），此面板將實時載入該層級的硬體描述代碼。
          </div>
        </div>
      </div>
    </div>
  );
};
