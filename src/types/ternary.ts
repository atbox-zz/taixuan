/**
 * Tai Xuan Jing Ternary Logic Types & Definitions
 * @license Apache-2.0
 */

// A Trit has three possible states.
// Internal normalized numerical representation:
// In standard mode: 0 (人/False), 1 (地/Middle), 2 (天/True)
// In balanced mode: -1 (人/-), 0 (地/0), +1 (天/+)
export type TritValue = 0 | 1 | 2; // Standard internal index (0=人, 1=地, 2=天)
export type BalancedTritValue = -1 | 0 | 1;

export type DisplayMode = 'taixuan' | 'balanced' | 'standard';

export interface TritInfo {
  val: TritValue;
  balancedVal: BalancedTritValue;
  name: string; // '天' | '地' | '人'
  pinyin: string;
  symbol: string; // '⚊' | '⚋' | '𝌀'
  strokeCount: number; // 1, 2, 3
  color: string;
  bgLight: string;
  bgDark: string;
  borderLight: string;
  borderDark: string;
  desc: string;
}

export interface TetragramHead {
  index: number; // 1 to 81
  name: string; // e.g. "中", "羨", "睟", ...
  pinyin: string;
  meaning: string;
  trits: [TritValue, TritValue, TritValue, TritValue]; // [方(81), 州(27), 部(9), 家(3)] or [Tier 4, Tier 3, Tier 2, Tier 1]
  unicodeChar: string; // e.g. '𝌆'
  solarDate: string; // Historical solar term alignment
  interpretation: string;
}

export type AluOpcode = 
  | 'ADD'   // 4-trit Addition (加)
  | 'SUB'   // 4-trit Subtraction (減)
  | 'MIN'   // Trit-wise T-AND (與 / 降取)
  | 'MAX'   // Trit-wise T-OR (或 / 升取)
  | 'NEG'   // Trit-wise T-NOT (非 / 倒反)
  | 'CYCLE' // Trit-wise T-CYCLE (流轉 / 循變)
  | 'SHL'   // Shift Left (左移乘三)
  | 'SHR'   // Shift Right (右移除三)
  | 'CMP';  // Compare X and Y (天: X>Y, 地: X=Y, 人: X<Y)

export interface AluResult {
  out: [TritValue, TritValue, TritValue, TritValue];
  carry: TritValue;
  isZero: boolean;   // All 地 (0 in balanced)
  isHeaven: boolean; // Positive / 天 dominant
  isHuman: boolean;  // Negative / 人 dominant
  overflow: boolean;
}

export interface GateVerification {
  id: string;
  name: string;
  passed: boolean;
  totalTests: number;
  passedTests: number;
  details: string;
}
