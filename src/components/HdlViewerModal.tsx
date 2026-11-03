/**
 * HDL Viewer Modal: Tai Xuan HDL Specifications
 * Demonstrates formal HDL code for T-NAND, T-NOT, T-AND, T-OR, T-HA, T-FA, and ALU
 * @license Apache-2.0
 */

import React, { useState } from 'react';

interface HdlViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const HDL_FILES: Record<string, { filename: string; code: string; desc: string }> = {
  TNand: {
    filename: 'TNand.thdl',
    desc: '太玄元始與非門（硬體內建原語）',
    code: `/**
 * Tai Xuan Primitive Gate: TNand (太玄與非門)
 * Functions: out = 2 - min(a, b)
 * Values: 0 (Man/人), 1 (Earth/地), 2 (Heaven/天)
 */
CHIP TNand {
    IN a, b;
    OUT out;

    BUILTIN TNand;
}`,
  },
  TNot: {
    filename: 'TNot.thdl',
    desc: '由單個 TNand 合成的太玄倒反門',
    code: `/**
 * Tai Xuan Inverter: TNot (太玄倒反門)
 * Functions: out = 2 - in (天->人, 地->地, 人->天)
 */
CHIP TNot {
    IN in;
    OUT out;

    PARTS:
    TNand(a=in, b=in, out=out);
}`,
  },
  TAnd: {
    filename: 'TAnd.thdl',
    desc: '由 2 個 TNand 合成的降取門 (min)',
    code: `/**
 * Tai Xuan Min/And Gate: TAnd (太玄與門)
 * Functions: out = min(a, b)
 */
CHIP TAnd {
    IN a, b;
    OUT out;

    PARTS:
    TNand(a=a, b=b, out=nandOut);
    TNot(in=nandOut, out=out);
}`,
  },
  TOr: {
    filename: 'TOr.thdl',
    desc: '基於太玄德摩根定律合成的升取門 (max)',
    code: `/**
 * Tai Xuan Max/Or Gate: TOr (太玄或門)
 * Functions: out = max(a, b)
 * Synthesized using De Morgan's Ternary Theorem:
 * out = TNand(TNot(a), TNot(b))
 */
CHIP TOr {
    IN a, b;
    OUT out;

    PARTS:
    TNot(in=a, out=notA);
    TNot(in=b, out=notB);
    TNand(a=notA, b=notB, out=out);
}`,
  },
  THalfAdder: {
    filename: 'THalfAdder.thdl',
    desc: '三進制半加器 (Sum & Carry)',
    code: `/**
 * Ternary Half Adder: THalfAdder (太玄半加器)
 * Computes: a + b = carry * 3 + sum
 */
CHIP THalfAdder {
    IN a, b;
    OUT sum, carry;

    PARTS:
    // Core sum mod 3 and threshold carry generation
    TMod3Sum(a=a, b=b, out=sum);
    TThresholdCarry(a=a, b=b, out=carry);
}`,
  },
  TAlu4: {
    filename: 'TAlu4.thdl',
    desc: '四爻太玄算術邏輯單元 (4-Trit ALU)',
    code: `/**
 * Tai Xuan 4-Trit Arithmetic Logic Unit: TAlu4
 * Inputs:  x[4], y[4], opcode[3]
 * Outputs: out[4], carry, isZero, isHeaven, isHuman
 */
CHIP TAlu4 {
    IN x[4], y[4], opcode[3];
    OUT out[4], carry, isZero, isHeaven, isHuman;

    PARTS:
    TFourTritAdder(x=x, y=y, sum=addOut, carry=addCarry);
    TFourTritSub(x=x, y=y, diff=subOut, carry=subCarry);
    TFourTritMin(x=x, y=y, out=minOut);
    TFourTritMax(x=x, y=y, out=maxOut);
    TFourTritNeg(x=x, out=negOut);
    TFourTritCycle(x=x, out=cycleOut);

    TMux3Way4(d0=addOut, d1=subOut, d2=minOut, sel=opcode[0..1], out=stage1);
    TMux3Way4(d0=maxOut, d1=negOut, d2=cycleOut, sel=opcode[0..1], out=stage2);
    TMux3Way4(d0=stage1, d1=stage2, d2=stage1, sel=opcode[2], out=out);
}`,
  },
};

export const HdlViewerModal: React.FC<HdlViewerModalProps> = ({ isOpen, onClose }) => {
  // All hooks must always execute in the exact same order on every render!
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [activeChip, setActiveChip] = useState<string>('TNand');

  if (!isOpen) return null;

  const chip = HDL_FILES[activeChip] || HDL_FILES.TNand;

  const handleCopy = async (text: string, key: string) => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
        setCopiedKey(key);
        setTimeout(() => setCopiedKey(null), 1500);
      }
    } catch {
      // Graceful fallback for sandboxed iFrames
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 1500);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-3xl w-full max-h-[85vh] overflow-y-auto shadow-2xl p-6 sm:p-8 space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
          <div>
            <span className="text-xs font-mono-code text-sky-600 dark:text-sky-400 block mb-1">
              TAI XUAN HARDWARE DESCRIPTION LANGUAGE (T-HDL)
            </span>
            <h3 className="text-xl font-bold font-serif-tc text-slate-900 dark:text-slate-100">
              太玄 HDL 硬件描述語言規範 (TaiXuan HDL)
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Chip Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {Object.entries(HDL_FILES).map(([key, item]) => (
            <button
              key={key}
              type="button"
              onClick={() => setActiveChip(key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono-code whitespace-nowrap transition-colors ${
                activeChip === key
                  ? 'bg-sky-600 text-white font-semibold'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {item.filename}
            </button>
          ))}
        </div>

        {/* Code Viewer */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>{chip.desc}</span>
            <button
              type="button"
              onClick={() => handleCopy(chip.code, activeChip)}
              className="px-2.5 py-1 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-mono-code transition-colors"
            >
              {copiedKey === activeChip ? '已複製 ✓' : '複製代碼'}
            </button>
          </div>

          <pre className="p-4 bg-slate-950 text-sky-300 font-mono-code text-xs rounded-xl overflow-x-auto leading-relaxed border border-slate-800">
            <code>{chip.code}</code>
          </pre>
        </div>

        <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-lg transition-colors"
          >
            關閉
          </button>
        </div>
      </div>
    </div>
  );
};
