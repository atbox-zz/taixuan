/**
 * Circuit Schematic Visualizer
 * Dynamic SVG schematic diagram with animated signal pulses and color-coded trit states
 * @license Apache-2.0
 */

import React from 'react';
import { TritValue, DisplayMode } from '../types/ternary';
import { TRIT_INFO } from '../lib/taiXuanData';

interface CircuitCanvasProps {
  gateType: 'TNAND' | 'TNOT' | 'TAND' | 'TOR' | 'THA' | 'TALU';
  inputs: Record<string, TritValue>;
  outputs: Record<string, TritValue>;
  mode?: DisplayMode;
  title?: string;
  className?: string;
}

export const CircuitCanvas: React.FC<CircuitCanvasProps> = ({
  gateType,
  inputs,
  outputs,
  mode = 'taixuan',
  title,
  className = '',
}) => {
  const getColor = (val: TritValue | undefined) => {
    if (val === undefined) return '#94a3b8';
    return TRIT_INFO[val].color;
  };

  const getLabel = (val: TritValue | undefined) => {
    if (val === undefined) return '?';
    if (mode === 'balanced') {
      const b = TRIT_INFO[val].balancedVal;
      return b === 1 ? '+1' : b === -1 ? '-1' : '0';
    }
    if (mode === 'standard') return val.toString();
    return `${TRIT_INFO[val].name} ${TRIT_INFO[val].symbol}`;
  };

  return (
    <div className={`bg-slate-900 border border-slate-800 rounded-xl p-5 text-white shadow-md ${className}`}>
      {title && (
        <div className="flex items-center justify-between pb-3 mb-2 border-b border-slate-800">
          <span className="text-xs font-semibold text-slate-300 tracking-wide">{title}</span>
          <span className="text-[11px] text-slate-400 font-mono-code">實時信號流傳導圖 (Signal Trace)</span>
        </div>
      )}

      <div className="relative w-full h-56 flex items-center justify-center overflow-hidden">
        {/* SVG Diagram based on gateType */}
        {gateType === 'TNAND' && (
          <svg viewBox="0 0 460 180" className="w-full h-full max-w-lg">
            <defs>
              <linearGradient id="glowNand" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#1e293b" />
                <stop offset="100%" stopColor="#0f172a" />
              </linearGradient>
            </defs>

            {/* Input A Wire */}
            <path
              d="M 40 50 L 170 50"
              stroke={getColor(inputs.A)}
              strokeWidth="3.5"
              strokeDasharray="6 3"
              className="animate-pulse"
            />
            {/* Input B Wire */}
            <path
              d="M 40 130 L 170 130"
              stroke={getColor(inputs.B)}
              strokeWidth="3.5"
              strokeDasharray="6 3"
              className="animate-pulse"
            />

            {/* Input Port Labels */}
            <g transform="translate(10, 42)">
              <rect width="48" height="24" rx="4" fill="#1e293b" stroke={getColor(inputs.A)} strokeWidth="1.5" />
              <text x="24" y="16" fill="#fff" fontSize="11" textAnchor="middle" fontFamily="monospace">
                A:{getLabel(inputs.A)}
              </text>
            </g>
            <g transform="translate(10, 122)">
              <rect width="48" height="24" rx="4" fill="#1e293b" stroke={getColor(inputs.B)} strokeWidth="1.5" />
              <text x="24" y="16" fill="#fff" fontSize="11" textAnchor="middle" fontFamily="monospace">
                B:{getLabel(inputs.B)}
              </text>
            </g>

            {/* Gate Body: Traditional AND shape with Inversion Bubble */}
            <path
              d="M 170 30 L 220 30 A 60 60 0 0 1 220 150 L 170 150 Z"
              fill="url(#glowNand)"
              stroke="#38bdf8"
              strokeWidth="2.5"
            />
            <text x="205" y="85" fill="#f8fafc" fontSize="13" fontWeight="bold" textAnchor="middle" fontFamily="serif">
              太玄與
            </text>
            <text x="205" y="105" fill="#94a3b8" fontSize="10" textAnchor="middle" fontFamily="monospace">
              T-MIN
            </text>

            {/* Inversion Bubble (太玄倒反圓圈 / NOT bubble) */}
            <circle cx="288" cy="90" r="9" fill="#0f172a" stroke="#f43f5e" strokeWidth="2.5" />
            <text x="288" y="94" fill="#f43f5e" fontSize="9" fontWeight="bold" textAnchor="middle">
              非
            </text>

            {/* Output Wire */}
            <path
              d="M 297 90 L 390 90"
              stroke={getColor(outputs.OUT)}
              strokeWidth="4"
              strokeDasharray="6 3"
              className="animate-pulse"
            />

            {/* Output Port Label */}
            <g transform="translate(380, 77)">
              <rect width="66" height="28" rx="5" fill="#0f172a" stroke={getColor(outputs.OUT)} strokeWidth="2" />
              <text x="33" y="18" fill="#fff" fontSize="12" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
                {getLabel(outputs.OUT)}
              </text>
            </g>
          </svg>
        )}

        {gateType === 'TNOT' && (
          <svg viewBox="0 0 460 180" className="w-full h-full max-w-lg">
            {/* Input Split */}
            <path d="M 40 90 L 110 90" stroke={getColor(inputs.A)} strokeWidth="3" />
            <circle cx="110" cy="90" r="4" fill={getColor(inputs.A)} />
            <path d="M 110 90 L 110 50 L 170 50" stroke={getColor(inputs.A)} strokeWidth="3" />
            <path d="M 110 90 L 110 130 L 170 130" stroke={getColor(inputs.A)} strokeWidth="3" />

            {/* Input Label */}
            <g transform="translate(5, 78)">
              <rect width="52" height="24" rx="4" fill="#1e293b" stroke={getColor(inputs.A)} strokeWidth="1.5" />
              <text x="26" y="16" fill="#fff" fontSize="11" textAnchor="middle" fontFamily="monospace">
                A:{getLabel(inputs.A)}
              </text>
            </g>

            {/* T-NAND Box acting as NOT */}
            <rect x="170" y="30" width="110" height="120" rx="8" fill="#1e293b" stroke="#38bdf8" strokeWidth="2" />
            <text x="225" y="80" fill="#f8fafc" fontSize="14" fontWeight="bold" textAnchor="middle">
              T-NAND
            </text>
            <text x="225" y="100" fill="#94a3b8" fontSize="10" textAnchor="middle" fontFamily="monospace">
              (A ⊼ A)
            </text>

            <path
              d="M 280 90 L 380 90"
              stroke={getColor(outputs.OUT)}
              strokeWidth="4"
              strokeDasharray="6 3"
              className="animate-pulse"
            />
            <g transform="translate(370, 76)">
              <rect width="68" height="28" rx="5" fill="#0f172a" stroke={getColor(outputs.OUT)} strokeWidth="2" />
              <text x="34" y="18" fill="#fff" fontSize="12" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
                {getLabel(outputs.OUT)}
              </text>
            </g>
          </svg>
        )}

        {gateType === 'TAND' && (
          <svg viewBox="0 0 460 180" className="w-full h-full max-w-lg">
            {/* 2 T-NAND stages */}
            <path d="M 30 50 L 90 50" stroke={getColor(inputs.A)} strokeWidth="3" />
            <path d="M 30 110 L 90 110" stroke={getColor(inputs.B)} strokeWidth="3" />

            {/* Stage 1: T-NAND */}
            <rect x="90" y="35" width="90" height="90" rx="6" fill="#1e293b" stroke="#38bdf8" strokeWidth="1.5" />
            <text x="135" y="85" fill="#fff" fontSize="11" textAnchor="middle">
              1. T-NAND
            </text>

            {/* Intermediate Wire */}
            <path d="M 180 80 L 230 80" stroke="#f43f5e" strokeWidth="3" strokeDasharray="4 2" />
            <circle cx="230" cy="80" r="3" fill="#f43f5e" />
            <path d="M 230 80 L 230 65 L 260 65" stroke="#f43f5e" strokeWidth="2.5" />
            <path d="M 230 80 L 230 95 L 260 95" stroke="#f43f5e" strokeWidth="2.5" />

            {/* Stage 2: T-NOT (via T-NAND) */}
            <rect x="260" y="45" width="90" height="70" rx="6" fill="#1e293b" stroke="#f43f5e" strokeWidth="1.5" />
            <text x="305" y="85" fill="#fff" fontSize="11" textAnchor="middle">
              2. T-NOT
            </text>

            {/* Output */}
            <path d="M 350 80 L 400 80" stroke={getColor(outputs.OUT)} strokeWidth="4" />
            <g transform="translate(390, 66)">
              <rect width="64" height="28" rx="4" fill="#0f172a" stroke={getColor(outputs.OUT)} strokeWidth="2" />
              <text x="32" y="18" fill="#fff" fontSize="12" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
                {getLabel(outputs.OUT)}
              </text>
            </g>
          </svg>
        )}

        {gateType === 'TOR' && (
          <svg viewBox="0 0 460 180" className="w-full h-full max-w-lg">
            {/* Input A into Inverter 1 */}
            <path d="M 20 45 L 60 45" stroke={getColor(inputs.A)} strokeWidth="3" />
            <rect x="60" y="25" width="75" height="40" rx="4" fill="#1e293b" stroke="#94a3b8" strokeWidth="1.5" />
            <text x="97" y="49" fill="#e2e8f0" fontSize="10" textAnchor="middle">NOT(A)</text>

            {/* Input B into Inverter 2 */}
            <path d="M 20 135 L 60 135" stroke={getColor(inputs.B)} strokeWidth="3" />
            <rect x="60" y="115" width="75" height="40" rx="4" fill="#1e293b" stroke="#94a3b8" strokeWidth="1.5" />
            <text x="97" y="139" fill="#e2e8f0" fontSize="10" textAnchor="middle">NOT(B)</text>

            {/* Connecting wires to Combiner T-NAND */}
            <path d="M 135 45 L 210 70" stroke="#f43f5e" strokeWidth="2.5" />
            <path d="M 135 135 L 210 110" stroke="#f43f5e" strokeWidth="2.5" />

            {/* Third T-NAND */}
            <rect x="210" y="55" width="105" height="70" rx="6" fill="#1e293b" stroke="#38bdf8" strokeWidth="2" />
            <text x="262" y="90" fill="#fff" fontSize="11" fontWeight="bold" textAnchor="middle">3. T-NAND</text>
            <text x="262" y="105" fill="#94a3b8" fontSize="9" textAnchor="middle">De Morgan</text>

            {/* Final Output */}
            <path d="M 315 90 L 390 90" stroke={getColor(outputs.OUT)} strokeWidth="4" />
            <g transform="translate(385, 76)">
              <rect width="66" height="28" rx="4" fill="#0f172a" stroke={getColor(outputs.OUT)} strokeWidth="2" />
              <text x="33" y="18" fill="#fff" fontSize="12" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
                {getLabel(outputs.OUT)}
              </text>
            </g>
          </svg>
        )}

        {gateType === 'THA' && (
          <svg viewBox="0 0 460 180" className="w-full h-full max-w-lg">
            {/* Inputs A and B */}
            <path d="M 30 50 L 120 50" stroke={getColor(inputs.A)} strokeWidth="3" />
            <path d="M 30 130 L 120 130" stroke={getColor(inputs.B)} strokeWidth="3" />

            {/* T-HA Core Block */}
            <rect x="120" y="25" width="180" height="130" rx="10" fill="#1e293b" stroke="#38bdf8" strokeWidth="2" />
            <text x="210" y="65" fill="#f8fafc" fontSize="14" fontWeight="bold" textAnchor="middle">
              太玄半加器 (T-HA)
            </text>
            <text x="210" y="85" fill="#94a3b8" fontSize="10" textAnchor="middle" fontFamily="monospace">
              Sum = (A+B) mod 3
            </text>
            <text x="210" y="102" fill="#94a3b8" fontSize="10" textAnchor="middle" fontFamily="monospace">
              Carry = ⌊(A+B)/3⌋
            </text>

            {/* Sum Out */}
            <path d="M 300 60 L 370 60" stroke={getColor(outputs.SUM)} strokeWidth="3.5" />
            <g transform="translate(365, 46)">
              <rect width="75" height="28" rx="4" fill="#0f172a" stroke={getColor(outputs.SUM)} strokeWidth="2" />
              <text x="37" y="18" fill="#fff" fontSize="11" textAnchor="middle" fontFamily="monospace">
                和:{getLabel(outputs.SUM)}
              </text>
            </g>

            {/* Carry Out */}
            <path d="M 300 120 L 370 120" stroke={getColor(outputs.CARRY)} strokeWidth="3.5" />
            <g transform="translate(365, 106)">
              <rect width="75" height="28" rx="4" fill="#0f172a" stroke={getColor(outputs.CARRY)} strokeWidth="2" />
              <text x="37" y="18" fill="#fff" fontSize="11" textAnchor="middle" fontFamily="monospace">
                進:{getLabel(outputs.CARRY)}
              </text>
            </g>
          </svg>
        )}

        {gateType === 'TALU' && (
          <svg viewBox="0 0 460 180" className="w-full h-full max-w-lg">
            {/* ALU V-shape / Trap-shape */}
            <polygon
              points="110,20 230,20 200,80 200,100 230,160 110,160 150,90"
              fill="#1e293b"
              stroke="#0284c7"
              strokeWidth="2.5"
            />
            <text x="160" y="85" fill="#f8fafc" fontSize="13" fontWeight="bold" textAnchor="middle">
              太玄 ALU
            </text>
            <text x="160" y="105" fill="#38bdf8" fontSize="10" textAnchor="middle" fontFamily="monospace">
              4-Trit Core
            </text>

            {/* Opcode control line top */}
            <path d="M 170 5 L 170 30" stroke="#f59e0b" strokeWidth="2" strokeDasharray="3 2" />
            <text x="170" y="0" fill="#f59e0b" fontSize="9" textAnchor="middle" fontFamily="monospace">
              OPCODE
            </text>

            {/* Inputs X & Y */}
            <path d="M 40 40 L 125 40" stroke="#38bdf8" strokeWidth="3" />
            <text x="75" y="32" fill="#93c5fd" fontSize="10" textAnchor="middle" fontFamily="monospace">
              四爻 X [方州部家]
            </text>

            <path d="M 40 140 L 125 140" stroke="#a855f7" strokeWidth="3" />
            <text x="75" y="155" fill="#d8b4fe" fontSize="10" textAnchor="middle" fontFamily="monospace">
              四爻 Y [方州部家]
            </text>

            {/* Result Out */}
            <path d="M 220 90 L 330 90" stroke="#10b981" strokeWidth="3.5" />
            <g transform="translate(320, 75)">
              <rect width="115" height="30" rx="5" fill="#0f172a" stroke="#10b981" strokeWidth="2" />
              <text x="57" y="20" fill="#fff" fontSize="11" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
                運算結果 OUT
              </text>
            </g>

            {/* Status flags */}
            <g transform="translate(240, 130)">
              <rect width="180" height="24" rx="4" fill="#0f172a" stroke="#64748b" strokeWidth="1" />
              <text x="90" y="16" fill="#cbd5e1" fontSize="9" textAnchor="middle" fontFamily="monospace">
                標誌: 陽昇·地歸·人伏·溢出
              </text>
            </g>
          </svg>
        )}
      </div>
    </div>
  );
};
