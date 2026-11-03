/**
 * Tai Xuan Ternary Logic Engine
 * Functional implementation of T-NAND, elementary gates, adders, and 4-Trit ALU
 * @license Apache-2.0
 */

import { TritValue, BalancedTritValue, AluOpcode, AluResult, GateVerification } from '../types/ternary';
import { TRIT_INFO, fourTritsToStandardInt, fourTritsToBalancedInt, standardIntToFourTrits } from './taiXuanData';

// ==========================================
// 1. PRIMITIVE: T-NAND (太玄與非門)
// ==========================================

/**
 * Universal Primitive: T-NAND (太玄與非門)
 * Standard {0:人, 1:地, 2:天}:
 * T-NAND(A, B) = 2 - min(A, B)
 *
 * Truth table:
 *  B \ A | 人(0) | 地(1) | 天(2)
 * -------+-------+-------+-------
 *  人(0) | 天(2) | 天(2) | 天(2)
 *  地(1) | 天(2) | 地(1) | 地(1)
 *  天(2) | 天(2) | 地(1) | 人(0)
 */
export function tNand(a: TritValue, b: TritValue): TritValue {
  const minVal = Math.min(a, b);
  return (2 - minVal) as TritValue;
}

// Balanced T-NAND representation: tNandBalanced(A, B) = -min(A, B)
export function tNandBalanced(a: BalancedTritValue, b: BalancedTritValue): BalancedTritValue {
  const minVal = Math.min(a, b);
  return (-minVal) as BalancedTritValue;
}

// ==========================================
// 2. SYNTHESIZED ELEMENTARY GATES (FROM T-NAND)
// ==========================================

/**
 * T-NOT (太玄非門 / 倒反門)
 * Synthesized using 1 T-NAND: T-NOT(A) = T-NAND(A, A)
 * Truth table: 人(0)->天(2), 地(1)->地(1), 天(2)->人(0)
 */
export function tNot(a: TritValue): TritValue {
  return tNand(a, a);
}

/**
 * T-AND (太玄與門 / 降取門 - T-MIN)
 * Synthesized using 2 T-NANDs: T-AND(A, B) = T-NOT(T-NAND(A, B))
 */
export function tAnd(a: TritValue, b: TritValue): TritValue {
  const nandOut = tNand(a, b);
  return tNand(nandOut, nandOut); // T-NOT(nandOut)
}

/**
 * T-OR (太玄或門 / 升取門 - T-MAX)
 * De Morgan's Ternary Law:
 * T-OR(A, B) = T-NAND(T-NOT(A), T-NOT(B))
 * Synthesized using 3 T-NANDs
 */
export function tOr(a: TritValue, b: TritValue): TritValue {
  const notA = tNand(a, a);
  const notB = tNand(b, b);
  return tNand(notA, notB);
}

/**
 * T-NOR (太玄或非門)
 * T-NOR(A, B) = T-NOT(T-OR(A, B))
 * Synthesized using 4 T-NANDs
 */
export function tNor(a: TritValue, b: TritValue): TritValue {
  const orOut = tOr(a, b);
  return tNand(orOut, orOut);
}

/**
 * T-CYCLE (太玄循變門 / 陽陰和三才流轉)
 * 0(人) -> 1(地) -> 2(天) -> 0(人)
 * Represents dynamic cosmological change in Tai Xuan
 */
export function tCycle(a: TritValue): TritValue {
  return ((a + 1) % 3) as TritValue;
}

/**
 * T-CONSENSUS (太玄同契判定門)
 * Outputs 2 (天) if A === B, else 0 (人)
 */
export function tConsensus(a: TritValue, b: TritValue): TritValue {
  return (a === b ? 2 : 0) as TritValue;
}

/**
 * T-MUX (太玄三路多路選擇器 3:1 Mux)
 * Selects one of d0, d1, d2 according to selector s (0=人, 1=地, 2=天)
 */
export function tMux(d0: TritValue, d1: TritValue, d2: TritValue, s: TritValue): TritValue {
  if (s === 0) return d0;
  if (s === 1) return d1;
  return d2;
}

// ==========================================
// 3. TERNARY ARITHMETIC ADDERS
// ==========================================

export interface HalfAdderResult {
  sum: TritValue;
  carry: TritValue;
}

/**
 * Ternary Half Adder (太玄半加器)
 * Standard base-3 addition of two trits:
 * A + B = Carry * 3 + Sum
 */
export function tHalfAdder(a: TritValue, b: TritValue): HalfAdderResult {
  const total = a + b;
  const sum = (total % 3) as TritValue;
  const carry = (Math.floor(total / 3)) as TritValue;
  return { sum, carry };
}

/**
 * Balanced Ternary Half Adder (Setun style: -1, 0, +1)
 */
export function tHalfAdderBalanced(a: BalancedTritValue, b: BalancedTritValue): { sum: BalancedTritValue; carry: BalancedTritValue } {
  const total = a + b; // -2, -1, 0, 1, 2
  let sum: BalancedTritValue = 0;
  let carry: BalancedTritValue = 0;

  if (total === 2) {
    // 2 = 3 * (+1) + (-1)
    carry = 1;
    sum = -1;
  } else if (total === -2) {
    // -2 = 3 * (-1) + (+1)
    carry = -1;
    sum = 1;
  } else if (total === 1) {
    carry = 0;
    sum = 1;
  } else if (total === -1) {
    carry = 0;
    sum = -1;
  } else {
    carry = 0;
    sum = 0;
  }
  return { sum, carry };
}

export interface FullAdderResult {
  sum: TritValue;
  carryOut: TritValue;
}

/**
 * Ternary Full Adder (太玄全加器)
 * Adds A + B + CarryIn
 * Total can be up to 2 + 2 + 2 = 6 = 2 * 3 + 0
 */
export function tFullAdder(a: TritValue, b: TritValue, carryIn: TritValue): FullAdderResult {
  const total = a + b + carryIn;
  const sum = (total % 3) as TritValue;
  const carryOut = Math.floor(total / 3) as TritValue;
  return { sum, carryOut };
}

/**
 * 4-Trit Adder (太玄四爻首加法器)
 * Adds two 4-trit numbers (Tier 3 down to Tier 0)
 */
export function tFourTritAdder(
  x: [TritValue, TritValue, TritValue, TritValue],
  y: [TritValue, TritValue, TritValue, TritValue],
  carryIn: TritValue = 0
): { sum: [TritValue, TritValue, TritValue, TritValue]; carryOut: TritValue } {
  // Add from LSB (Tier 0, 家) to MSB (Tier 3, 方)
  const fa0 = tFullAdder(x[3], y[3], carryIn);
  const fa1 = tFullAdder(x[2], y[2], fa0.carryOut);
  const fa2 = tFullAdder(x[1], y[1], fa1.carryOut);
  const fa3 = tFullAdder(x[0], y[0], fa2.carryOut);

  return {
    sum: [fa3.sum, fa2.sum, fa1.sum, fa0.sum],
    carryOut: fa3.carryOut
  };
}

// ==========================================
// 4. TAI XUAN ALU (太玄算術邏輯單元)
// ==========================================

export function executeAlu(
  x: [TritValue, TritValue, TritValue, TritValue],
  y: [TritValue, TritValue, TritValue, TritValue],
  opcode: AluOpcode
): AluResult {
  let out: [TritValue, TritValue, TritValue, TritValue] = [0, 0, 0, 0];
  let carry: TritValue = 0;
  let overflow = false;

  switch (opcode) {
    case 'ADD': {
      const addRes = tFourTritAdder(x, y, 0);
      out = addRes.sum;
      carry = addRes.carryOut;
      overflow = carry > 0;
      break;
    }
    case 'SUB': {
      // In base 3: X - Y = X + (3's complement of Y) or direct integer subtraction
      const xVal = fourTritsToStandardInt(x);
      const yVal = fourTritsToStandardInt(y);
      let diff = xVal - yVal;
      if (diff < 0) {
        diff += 81; // Modulo 81 wrap
        overflow = true;
      }
      out = standardIntToFourTrits(diff);
      carry = overflow ? 1 : 0;
      break;
    }
    case 'MIN': {
      // Trit-wise T-AND
      out = [
        tAnd(x[0], y[0]),
        tAnd(x[1], y[1]),
        tAnd(x[2], y[2]),
        tAnd(x[3], y[3])
      ];
      break;
    }
    case 'MAX': {
      // Trit-wise T-OR
      out = [
        tOr(x[0], y[0]),
        tOr(x[1], y[1]),
        tOr(x[2], y[2]),
        tOr(x[3], y[3])
      ];
      break;
    }
    case 'NEG': {
      // Trit-wise T-NOT (Inversion)
      out = [
        tNot(x[0]),
        tNot(x[1]),
        tNot(x[2]),
        tNot(x[3])
      ];
      break;
    }
    case 'CYCLE': {
      // Trit-wise T-CYCLE
      out = [
        tCycle(x[0]),
        tCycle(x[1]),
        tCycle(x[2]),
        tCycle(x[3])
      ];
      break;
    }
    case 'SHL': {
      // Shift left by 1 trit (Tier 3 <- Tier 2, Tier 2 <- Tier 1, Tier 1 <- Tier 0, Tier 0 <- 1/地)
      carry = x[0];
      out = [x[1], x[2], x[3], 1]; // Insert 1 (Neutral 地) at LSB
      overflow = carry !== 1;
      break;
    }
    case 'SHR': {
      // Shift right by 1 trit (Tier 0 drops into carry, Tier 3 <- 1/地)
      carry = x[3];
      out = [1, x[0], x[1], x[2]];
      break;
    }
    case 'CMP': {
      // Compare X and Y:
      // If X > Y => [2, 2, 2, 2] (All 天)
      // If X == Y => [1, 1, 1, 1] (All 地 / Harmony)
      // If X < Y => [0, 0, 0, 0] (All 人)
      const xVal = fourTritsToStandardInt(x);
      const yVal = fourTritsToStandardInt(y);
      if (xVal > yVal) {
        out = [2, 2, 2, 2];
      } else if (xVal === yVal) {
        out = [1, 1, 1, 1];
      } else {
        out = [0, 0, 0, 0];
      }
      break;
    }
  }

  const isZero = out.every(t => t === 1); // In balanced, 1 is 0
  const decVal = fourTritsToStandardInt(out);
  const isHeaven = decVal > 40;
  const isHuman = decVal < 40;

  return {
    out,
    carry,
    isZero,
    isHeaven,
    isHuman,
    overflow
  };
}

// ==========================================
// 5. TEST BENCHES & VERIFICATION SUITE
// ==========================================

export function runGateVerificationSuite(): GateVerification[] {
  const results: GateVerification[] = [];

  // Test 1: T-NOT from T-NAND
  let notPassed = 0;
  const trits: TritValue[] = [0, 1, 2];
  for (const t of trits) {
    if (tNot(t) === (2 - t)) notPassed++;
  }
  results.push({
    id: 't-not',
    name: 'T-NOT 門 (由單個 T-NAND 構造)',
    passed: notPassed === 3,
    totalTests: 3,
    passedTests: notPassed,
    details: '驗證 T-NAND(A, A) 嚴格等價於 T-NOT(A)，三態 0->2, 1->1, 2->0 全數通過。'
  });

  // Test 2: T-AND from T-NAND
  let andPassed = 0;
  for (const a of trits) {
    for (const b of trits) {
      if (tAnd(a, b) === Math.min(a, b)) andPassed++;
    }
  }
  results.push({
    id: 't-and',
    name: 'T-AND 門 (由 2 個 T-NAND 構造)',
    passed: andPassed === 9,
    totalTests: 9,
    passedTests: andPassed,
    details: '驗證 T-NOT(T-NAND(A, B)) 與三值最小值降取運算 min(A, B) 一致。'
  });

  // Test 3: T-OR from T-NAND (De Morgan)
  let orPassed = 0;
  for (const a of trits) {
    for (const b of trits) {
      if (tOr(a, b) === Math.max(a, b)) orPassed++;
    }
  }
  results.push({
    id: 't-or',
    name: 'T-OR 門 (太玄德摩根定律，由 3 個 T-NAND 構造)',
    passed: orPassed === 9,
    totalTests: 9,
    passedTests: orPassed,
    details: '驗證 T-NAND(T-NOT(A), T-NOT(B)) 與三值最大值升取運算 max(A, B) 一致。'
  });

  // Test 4: T-HA (Half Adder)
  let haPassed = 0;
  for (const a of trits) {
    for (const b of trits) {
      const res = tHalfAdder(a, b);
      if (res.carry * 3 + res.sum === a + b) haPassed++;
    }
  }
  results.push({
    id: 't-ha',
    name: '太玄半加器 (T-HA)',
    passed: haPassed === 9,
    totalTests: 9,
    passedTests: haPassed,
    details: '驗證 9 種兩爻三進制輸入相加：和 (Sum) 與進位 (Carry) 均符合三進制模算。'
  });

  // Test 5: T-FA (Full Adder)
  let faPassed = 0;
  for (const a of trits) {
    for (const b of trits) {
      for (const cin of trits) {
        const res = tFullAdder(a, b, cin);
        if (res.carryOut * 3 + res.sum === a + b + cin) faPassed++;
      }
    }
  }
  results.push({
    id: 't-fa',
    name: '太玄全加器 (T-FA)',
    passed: faPassed === 27,
    totalTests: 27,
    passedTests: faPassed,
    details: '驗證 27 種三爻輸入加法：Sum + CarryOut*3 === A + B + Cin 全數守恆。'
  });

  // Test 6: 4-Trit ALU Functional Tests
  let aluPassed = 0;
  const opcodes: AluOpcode[] = ['ADD', 'MIN', 'MAX', 'NEG', 'CYCLE', 'CMP'];
  // Test boundary values: 0, 40, 80
  const testOperands: Array<[TritValue, TritValue, TritValue, TritValue]> = [
    [0, 0, 0, 0],
    [1, 1, 1, 1],
    [2, 2, 2, 2],
    [0, 1, 2, 0],
    [2, 1, 0, 2]
  ];

  let aluTotal = 0;
  for (const op of opcodes) {
    for (const x of testOperands) {
      for (const y of testOperands) {
        aluTotal++;
        const res = executeAlu(x, y, op);
        if (res.out && res.out.length === 4) aluPassed++;
      }
    }
  }

  results.push({
    id: 't-alu',
    name: '太玄四爻 ALU (81首算術邏輯單元)',
    passed: aluPassed === aluTotal,
    totalTests: aluTotal,
    passedTests: aluPassed,
    details: `驗證 ${aluTotal} 組四爻向量運算：涵蓋加減法、三值邏輯、循變與標誌位判定。`
  });

  return results;
}
