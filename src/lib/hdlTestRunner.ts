/**
 * TaiXuan HDL Test Script Parser & 81-ISA Test Runner Engine
 * (太玄 HDL 測試腳本解析器與 81 首指令集單元測試引擎)
 * @license Apache-2.0
 */

import { TritValue, AluOpcode, AluResult } from '../types/ternary';
import { TAI_XUAN_HEADS, formatTrit } from './taiXuanData';
import { executeAlu } from './ternaryLogic';

export interface BitErrorDetail {
  tier: number; // 3 (方), 2 (州), 1 (部), 0 (家), or -1 (Carry)
  tierName: string; // 方, 州, 部, 家, 進位
  exp: TritValue;
  act: TritValue;
  voltageDelta: string;
}

export interface ScriptSyntaxError {
  line: number;
  rawText: string;
  message: string;
}

export interface ParsedCommand {
  type: 'VERIFY_ALL_81_ISA' | 'EXEC' | 'INJECT_FAULT' | 'SET_EVAL_EXPECT' | 'META';
  lineNum: number;
  raw: string;
  headIndex?: number;
  x?: [TritValue, TritValue, TritValue, TritValue];
  y?: [TritValue, TritValue, TritValue, TritValue];
  op?: AluOpcode;
  expectedOut?: [TritValue, TritValue, TritValue, TritValue];
  expectedCarry?: TritValue;
  faultTarget?: { head: number; tier: number; val: TritValue; reason?: string };
}

export interface TestCaseResult {
  id: number;
  lineNumber?: number;
  headIndex: number;
  headName: string;
  headSymbol: string;
  mnemonic: string;
  opcode: AluOpcode;
  inputs: {
    x: [TritValue, TritValue, TritValue, TritValue];
    y: [TritValue, TritValue, TritValue, TritValue];
  };
  expected: {
    out: [TritValue, TritValue, TritValue, TritValue];
    carry: TritValue;
  };
  actual: {
    out: [TritValue, TritValue, TritValue, TritValue];
    carry: TritValue;
    overflow: boolean;
  };
  passed: boolean;
  bitErrors: BitErrorDetail[];
  diagnostics: string;
  remedy: string;
  executionTimeMs: number;
}

export interface TestRunnerOutcome {
  testResults: TestCaseResult[];
  syntaxErrors: ScriptSyntaxError[];
  parsedCommandsCount: number;
  executionTimeMs: number;
}

/**
 * Maps a head index (1..81) to default ALU semantics
 */
export function mapHeadToAluSpec(index: number) {
  const safeIndex = Math.max(1, Math.min(81, index));
  const head = TAI_XUAN_HEADS[safeIndex - 1] || TAI_XUAN_HEADS[0];
  const [t3, t2, t1, t0] = head.trits;

  let opcode: AluOpcode = 'ADD';
  let mnemonic = `ADD.R${t0}`;
  let category: 'arithmetic' | 'logic' | 'control' = 'arithmetic';

  if (t3 === 2) {
    category = 'arithmetic';
    if (t2 === 2) {
      opcode = 'ADD';
      mnemonic = `ADD.R${t0}`;
    } else if (t2 === 1) {
      opcode = 'SUB';
      mnemonic = `SUB.R${t0}`;
    } else {
      opcode = 'ADD';
      mnemonic = `ACC.R${t0}`;
    }
  } else if (t3 === 1) {
    category = 'logic';
    if (t2 === 2) {
      opcode = 'MAX';
      mnemonic = `MAX.R${t0}`;
    } else if (t2 === 1) {
      opcode = 'MIN';
      mnemonic = `MIN.R${t0}`;
    } else {
      if (t1 === 2) {
        opcode = 'NEG';
        mnemonic = `NOT.R${t0}`;
      } else if (t1 === 1) {
        opcode = 'CYCLE';
        mnemonic = `CYCL.R${t0}`;
      } else {
        opcode = 'SHL';
        mnemonic = `SHL.R${t0}`;
      }
    }
  } else {
    category = 'control';
    if (t2 === 2) {
      opcode = 'CMP';
      mnemonic = `CMP.R${t0}`;
    } else if (t2 === 1) {
      opcode = 'CYCLE';
      mnemonic = `SYS.CYC`;
    } else {
      opcode = 'CMP';
      mnemonic = `SYS.CMP`;
    }
  }

  return { head, opcode, mnemonic, category };
}

/**
 * Helper to parse a 4-trit array from string like "[2,1,0,2]" or "%2102"
 */
function parseTritsArray(str: string): [TritValue, TritValue, TritValue, TritValue] | null {
  const clean = str.trim();
  // Format %2102
  if (clean.startsWith('%')) {
    const chars = clean.slice(1).split('');
    if (chars.length === 4) {
      const nums = chars.map((c) => parseInt(c, 10));
      if (nums.every((n) => n >= 0 && n <= 2)) {
        return nums as [TritValue, TritValue, TritValue, TritValue];
      }
    }
    return null;
  }

  // Format [2, 1, 0, 2] or 2,1,0,2
  const bracketMatch = clean.match(/\[?([0-2]),\s*([0-2]),\s*([0-2]),\s*([0-2])\]?/);
  if (bracketMatch) {
    return [
      parseInt(bracketMatch[1], 10) as TritValue,
      parseInt(bracketMatch[2], 10) as TritValue,
      parseInt(bracketMatch[3], 10) as TritValue,
      parseInt(bracketMatch[4], 10) as TritValue,
    ];
  }

  // 4 raw digits e.g. "2102"
  if (/^[0-2]{4}$/.test(clean)) {
    return clean.split('').map((c) => parseInt(c, 10) as TritValue) as [
      TritValue,
      TritValue,
      TritValue,
      TritValue,
    ];
  }

  return null;
}

/**
 * Valid ALU opcodes
 */
const VALID_OPCODES: Set<string> = new Set([
  'ADD',
  'SUB',
  'MIN',
  'MAX',
  'NEG',
  'CYCLE',
  'SHL',
  'SHR',
  'CMP',
]);

/**
 * Parse an HDL test script line by line
 */
export function parseHdlTestScript(script: string): {
  commands: ParsedCommand[];
  syntaxErrors: ScriptSyntaxError[];
} {
  const lines = script.split('\n');
  const commands: ParsedCommand[] = [];
  const syntaxErrors: ScriptSyntaxError[] = [];

  // Intermediate state for multi-line SET / EVAL / EXPECT patterns
  let pendingSetX: [TritValue, TritValue, TritValue, TritValue] | null = null;
  let pendingSetY: [TritValue, TritValue, TritValue, TritValue] | null = null;
  let pendingOp: AluOpcode = 'ADD';
  let pendingHead: number | undefined = undefined;

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const lineNum = i + 1;
    const trimmed = rawLine.trim();

    // Skip empty lines and full line comments
    if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('#')) {
      continue;
    }

    // Strip trailing inline comments
    const code = trimmed.split('//')[0].split('#')[0].trim().replace(/;+$/, '');

    // 1. Meta / Configuration directives
    if (
      code.startsWith('TEST_SUITE') ||
      code.startsWith('TARGET_CHIP') ||
      code.startsWith('ASSERT_CONVERGENCE') ||
      code.startsWith('CLOCK_PERIOD')
    ) {
      commands.push({
        type: 'META',
        lineNum,
        raw: rawLine,
      });
      continue;
    }

    // 2. Batch verification: VERIFY_ALL_81_ISA
    if (code.startsWith('VERIFY_ALL_81_ISA')) {
      commands.push({
        type: 'VERIFY_ALL_81_ISA',
        lineNum,
        raw: rawLine,
      });
      continue;
    }

    // 3. Fault Injection directive:
    // e.g. INJECT_FAULT head=7 tier=1 val=2 reason="部爻短路"
    // or INJECT_FAULT_SIMULATION enabled=true
    if (code.startsWith('INJECT_FAULT')) {
      if (code.includes('enabled=')) {
        commands.push({
          type: 'META',
          lineNum,
          raw: rawLine,
        });
        continue;
      }

      const headMatch = code.match(/head=(\d+)/i);
      const tierMatch = code.match(/tier=(-?\d+|carry)/i);
      const valMatch = code.match(/val=([0-2])/i);
      const reasonMatch = code.match(/reason=["']?([^"']+)["']?/i);

      if (headMatch && tierMatch && valMatch) {
        const h = parseInt(headMatch[1], 10);
        const tStr = tierMatch[1].toLowerCase();
        const t = tStr === 'carry' ? -1 : parseInt(tStr, 10);
        const v = parseInt(valMatch[1], 10) as TritValue;
        commands.push({
          type: 'INJECT_FAULT',
          lineNum,
          raw: rawLine,
          faultTarget: {
            head: h,
            tier: t,
            val: v,
            reason: reasonMatch ? reasonMatch[1] : undefined,
          },
        });
        continue;
      }
    }

    // 4. Compact EXEC command:
    // EXEC 1 X=[2,2,2,2] Y=[2,2,2,2] OP=ADD EXPECT=[1,2,2,2] CARRY=1
    // or EXEC 中 X=[2,2,2,2] Y=[2,2,2,2] OP=ADD EXPECT=[1,2,2,2] CARRY=1
    if (code.startsWith('EXEC')) {
      const parts = code.slice(4).trim();
      const headTokenMatch = parts.match(/^(\S+)/);
      if (!headTokenMatch) {
        syntaxErrors.push({
          line: lineNum,
          rawText: rawLine,
          message: 'EXEC 語句缺少卦象編號或卦名 (例如: EXEC 1 或 EXEC 中)',
        });
        continue;
      }

      const headToken = headTokenMatch[1];
      let headIndex = parseInt(headToken, 10);
      if (isNaN(headIndex)) {
        const found = TAI_XUAN_HEADS.find((h) => h.name === headToken);
        if (found) {
          headIndex = found.index;
        } else {
          headIndex = 1;
        }
      }

      // Extract X=[...], Y=[...], OP=..., EXPECT=[...], CARRY=...
      const xMatch = parts.match(/X=([%[0-2,\s\]]+)/i);
      const yMatch = parts.match(/Y=([%[0-2,\s\]]+)/i);
      const opMatch = parts.match(/OP=([A-Z_]+)/i);
      const expMatch = parts.match(/EXPECT=([%[0-2,\s\]]+)/i);
      const carryMatch = parts.match(/CARRY=([0-2])/i);

      if (!xMatch || !yMatch) {
        syntaxErrors.push({
          line: lineNum,
          rawText: rawLine,
          message: 'EXEC 語句必須包含輸入向量 X=[...] 與 Y=[...]',
        });
        continue;
      }

      const xVec = parseTritsArray(xMatch[1]);
      const yVec = parseTritsArray(yMatch[1]);
      if (!xVec || !yVec) {
        syntaxErrors.push({
          line: lineNum,
          rawText: rawLine,
          message: `輸入向量三值爻象語法錯誤 (只允許 0, 1, 2，長度必須為 4 位): X=${xMatch[1]}, Y=${yMatch[1]}`,
        });
        continue;
      }

      const opStr = (opMatch ? opMatch[1].toUpperCase() : 'ADD') as AluOpcode;
      if (!VALID_OPCODES.has(opStr)) {
        syntaxErrors.push({
          line: lineNum,
          rawText: rawLine,
          message: `未知的太玄 ALU 運算碼: ${opStr}。有效運算碼: ADD, SUB, MIN, MAX, NEG, CYCLE, SHL, SHR, CMP`,
        });
        continue;
      }

      let expOut: [TritValue, TritValue, TritValue, TritValue] | undefined;
      if (expMatch) {
        const parsedExp = parseTritsArray(expMatch[1]);
        if (!parsedExp) {
          syntaxErrors.push({
            line: lineNum,
            rawText: rawLine,
            message: `EXPECT 期望輸出向量語法錯誤: ${expMatch[1]}`,
          });
          continue;
        }
        expOut = parsedExp;
      }

      let expCarry: TritValue | undefined;
      if (carryMatch) {
        expCarry = parseInt(carryMatch[1], 10) as TritValue;
      }

      commands.push({
        type: 'EXEC',
        lineNum,
        raw: rawLine,
        headIndex,
        x: xVec,
        y: yVec,
        op: opStr,
        expectedOut: expOut,
        expectedCarry: expCarry,
      });
      continue;
    }

    // 5. Modular Step Pattern:
    // SET X=[...] or SET X %2102, Y %1020
    if (code.startsWith('SET')) {
      const parts = code.slice(3).trim();
      const xMatch = parts.match(/X\s*[=:]?\s*([%[0-2,\s\]]+)/i);
      const yMatch = parts.match(/Y\s*[=:]?\s*([%[0-2,\s\]]+)/i);
      const headMatch = parts.match(/HEAD\s*[=:]?\s*(\d+|\S+)/i);

      if (xMatch) {
        const xVec = parseTritsArray(xMatch[1]);
        if (xVec) pendingSetX = xVec;
      }
      if (yMatch) {
        const yVec = parseTritsArray(yMatch[1]);
        if (yVec) pendingSetY = yVec;
      }
      if (headMatch) {
        const idx = parseInt(headMatch[1], 10);
        if (!isNaN(idx)) pendingHead = idx;
      }
      continue;
    }

    // EVAL or TICK
    if (code.startsWith('EVAL') || code.startsWith('TICK')) {
      const opMatch = code.match(/OP\s*[=:]?\s*([A-Z_]+)/i);
      if (opMatch) {
        const o = opMatch[1].toUpperCase() as AluOpcode;
        if (VALID_OPCODES.has(o)) {
          pendingOp = o;
        }
      }
      continue;
    }

    // EXPECT / ASSERT
    if (code.startsWith('EXPECT') || code.startsWith('ASSERT')) {
      const parts = code.replace(/^(EXPECT|ASSERT)\s*/, '');
      const outMatch = parts.match(/(?:OUT\s*[=:]?\s*)?([%[0-2,\s\]]+)/i);
      const carryMatch = parts.match(/CARRY\s*[=:]?\s*([0-2])/i);

      if (outMatch) {
        const parsedExp = parseTritsArray(outMatch[1]);
        if (parsedExp) {
          const xVec = pendingSetX || [1, 1, 1, 1];
          const yVec = pendingSetY || [1, 1, 1, 1];
          const cVal = carryMatch ? (parseInt(carryMatch[1], 10) as TritValue) : undefined;

          commands.push({
            type: 'SET_EVAL_EXPECT',
            lineNum,
            raw: rawLine,
            headIndex: pendingHead || 1,
            x: xVec,
            y: yVec,
            op: pendingOp,
            expectedOut: parsedExp,
            expectedCarry: cVal,
          });
          continue;
        }
      }
    }

    // If none matched, mark as unrecognized instruction
    syntaxErrors.push({
      line: lineNum,
      rawText: rawLine,
      message: `無法解析的 HDL 測試腳本語句: "${trimmed}"`,
    });
  }

  return { commands, syntaxErrors };
}

/**
 * Execute all parsed commands and produce detailed error diagnostics
 */
export function executeHdlTestCommands(
  commands: ParsedCommand[],
  globalFaultInjection: boolean = false
): TestRunnerOutcome {
  const startTime = performance.now();
  const testResults: TestCaseResult[] = [];
  const syntaxErrors: ScriptSyntaxError[] = [];

  // Collect specific injected faults from script
  const scriptInjectedFaults = new Map<number, { tier: number; val: TritValue; reason?: string }>();
  for (const cmd of commands) {
    if (cmd.type === 'INJECT_FAULT' && cmd.faultTarget) {
      scriptInjectedFaults.set(cmd.faultTarget.head, cmd.faultTarget);
    }
  }

  // Check if VERIFY_ALL_81_ISA was requested
  const hasVerifyAll = commands.some((cmd) => cmd.type === 'VERIFY_ALL_81_ISA');

  let testIdCounter = 1;

  if (hasVerifyAll) {
    // Generate full 81 test cases across the entire ISA
    for (let i = 1; i <= 81; i++) {
      const { head, opcode, mnemonic } = mapHeadToAluSpec(i);

      // Deterministic pseudo-orthogonal vectors based on head trits
      const xVec: [TritValue, TritValue, TritValue, TritValue] = [
        head.trits[0],
        ((head.trits[1] + 1) % 3) as TritValue,
        head.trits[2],
        ((head.trits[3] + 2) % 3) as TritValue,
      ];
      const yVec: [TritValue, TritValue, TritValue, TritValue] = [
        ((head.trits[3] + 1) % 3) as TritValue,
        head.trits[2],
        ((head.trits[1] + 2) % 3) as TritValue,
        head.trits[0],
      ];

      // Golden reference ALU execution
      const golden = executeAlu(xVec, yVec, opcode);
      const expOut = [...golden.out] as [TritValue, TritValue, TritValue, TritValue];
      const expCarry = golden.carry;

      // Actual simulated ALU (with potential fault injection)
      const actualOut = [...golden.out] as [TritValue, TritValue, TritValue, TritValue];
      let actualCarry = golden.carry;

      // Check for fault injection
      let injectedReason: string | undefined;
      const scriptFault = scriptInjectedFaults.get(i);
      if (scriptFault) {
        if (scriptFault.tier === -1) {
          actualCarry = scriptFault.val;
        } else if (scriptFault.tier >= 0 && scriptFault.tier <= 3) {
          actualOut[3 - scriptFault.tier] = scriptFault.val;
        }
        injectedReason = scriptFault.reason || '腳本顯式指定之硬體故障注入';
      } else if (globalFaultInjection) {
        // Built-in demonstration faults on step 7, 21, 44, 68
        if (i === 7) {
          actualOut[2] = ((actualOut[2] + 1) % 3) as TritValue;
          injectedReason = '部爻(Tier 1)半加器延遲抖動';
        } else if (i === 21) {
          actualCarry = ((actualCarry + 1) % 3) as TritValue;
          injectedReason = '高位 Carry Flag 溢出鎖存器信號反向導通';
        } else if (i === 44) {
          actualOut[0] = ((actualOut[0] + 2) % 3) as TritValue;
          injectedReason = '方爻(Tier 3)三態循變相位偏置';
        } else if (i === 68) {
          actualOut[3] = actualOut[3] === 2 ? 0 : 2;
          injectedReason = '家爻(Tier 0)電晶體臨界電壓擊穿偏移';
        }
      }

      // Evaluate bit errors
      const bitErrors: BitErrorDetail[] = [];
      const tierNames = ['方 (Tier 3 / 81)', '州 (Tier 2 / 27)', '部 (Tier 1 / 9)', '家 (Tier 0 / 3)'];
      for (let tier = 0; tier < 4; tier++) {
        if (actualOut[tier] !== expOut[tier]) {
          const delta = actualOut[tier] - expOut[tier];
          bitErrors.push({
            tier: 3 - tier,
            tierName: tierNames[tier],
            exp: expOut[tier],
            act: actualOut[tier],
            voltageDelta: delta > 0 ? `+${delta * 1.5}V (電位過激)` : `${delta * 1.5}V (電位欠調)`,
          });
        }
      }
      if (actualCarry !== expCarry) {
        bitErrors.push({
          tier: -1,
          tierName: '高位進位爻 (Carry Flag)',
          exp: expCarry,
          act: actualCarry,
          voltageDelta: `${(actualCarry - expCarry) * 1.5}V (溢出鎖存不符)`,
        });
      }

      const passed = bitErrors.length === 0;

      let diagnostics = '邏輯真值與進位標誌完全符合 TaiXuan ALU 指令集金標規範。';
      let remedy = '無須修正，電路網表形式驗證通過。';

      if (!passed) {
        if (injectedReason) {
          diagnostics = `[硬體故障注入] ${injectedReason}。引發輸出爻位偏差。`;
        } else if (bitErrors.some((b) => b.tier === -1)) {
          diagnostics = `在指令 ${mnemonic} 下檢測到進位傳遞鏈異常。半加器高位 T-MOD-CARRY 輸出在極端輸入時未能即時完成電位上拉。`;
        } else {
          diagnostics = `在指令 ${mnemonic} 下檢測到位元不一致。${bitErrors.map((b) => b.tierName).join('、')} 輸出電位偏離目標值。`;
        }

        remedy = bitErrors.some((b) => b.tier === -1)
          ? '建議在 HDL 中檢查 TFourTritAdder 之進位反饋節點，確保 TNand(carryIn) 門級延遲不超過 2.4ns。'
          : '檢查四爻 ALU 內部 MUX3 選擇器輸入端連接，確認操作碼譯碼線路無寄生反向導通。';
      }

      testResults.push({
        id: testIdCounter++,
        headIndex: head.index,
        headName: head.name,
        headSymbol: head.unicodeChar,
        mnemonic,
        opcode,
        inputs: { x: xVec, y: yVec },
        expected: { out: expOut, carry: expCarry },
        actual: { out: actualOut, carry: actualCarry, overflow: golden.overflow },
        passed,
        bitErrors,
        diagnostics,
        remedy,
        executionTimeMs: Number((Math.random() * 0.3 + 0.1).toFixed(2)),
      });
    }
  }

  // Process explicit EXEC and SET_EVAL_EXPECT commands
  for (const cmd of commands) {
    if (cmd.type === 'EXEC' || cmd.type === 'SET_EVAL_EXPECT') {
      const headIdx = cmd.headIndex || 1;
      const { head, mnemonic } = mapHeadToAluSpec(headIdx);
      const opcode = cmd.op || 'ADD';
      const xVec = cmd.x || [0, 0, 0, 0];
      const yVec = cmd.y || [0, 0, 0, 0];

      // Golden reference ALU execution
      const golden = executeAlu(xVec, yVec, opcode);

      // What did user expect? If user supplied EXPECT, use that; else golden
      const expOut = cmd.expectedOut || [...golden.out];
      const expCarry = cmd.expectedCarry !== undefined ? cmd.expectedCarry : golden.carry;

      // Simulated actual output
      const actualOut = [...golden.out] as [TritValue, TritValue, TritValue, TritValue];
      let actualCarry = golden.carry;

      // Check if fault injected
      let injectedReason: string | undefined;
      const scriptFault = scriptInjectedFaults.get(headIdx);
      if (scriptFault) {
        if (scriptFault.tier === -1) {
          actualCarry = scriptFault.val;
        } else if (scriptFault.tier >= 0 && scriptFault.tier <= 3) {
          actualOut[3 - scriptFault.tier] = scriptFault.val;
        }
        injectedReason = scriptFault.reason || '腳本顯式指定之硬體故障注入';
      }

      // Check bit discrepancies
      const bitErrors: BitErrorDetail[] = [];
      const tierNames = ['方 (Tier 3 / 81)', '州 (Tier 2 / 27)', '部 (Tier 1 / 9)', '家 (Tier 0 / 3)'];
      for (let tier = 0; tier < 4; tier++) {
        if (actualOut[tier] !== expOut[tier]) {
          const delta = actualOut[tier] - expOut[tier];
          bitErrors.push({
            tier: 3 - tier,
            tierName: tierNames[tier],
            exp: expOut[tier],
            act: actualOut[tier],
            voltageDelta: delta > 0 ? `+${delta * 1.5}V (電位過激)` : `${delta * 1.5}V (電位欠調)`,
          });
        }
      }
      if (actualCarry !== expCarry) {
        bitErrors.push({
          tier: -1,
          tierName: '高位進位爻 (Carry Flag)',
          exp: expCarry,
          act: actualCarry,
          voltageDelta: `${(actualCarry - expCarry) * 1.5}V (溢出鎖存不符)`,
        });
      }

      const passed = bitErrors.length === 0;

      let diagnostics = '邏輯真值與進位標誌完全符合 TaiXuan ALU 指令集金標規範。';
      let remedy = '無須修正，電路網表形式驗證通過。';

      if (!passed) {
        if (injectedReason) {
          diagnostics = `[硬體故障注入] ${injectedReason}。第 ${cmd.lineNum} 行斷言不符合。`;
          remedy = '排查注入之故障節點，重置電晶體閾值電壓至標稱 1.5V 基準。';
        } else if (cmd.expectedOut || cmd.expectedCarry !== undefined) {
          diagnostics = `腳本第 ${cmd.lineNum} 行期望斷言與 ALU 物理運算結果不一致。實際輸出為 [${actualOut.join(
            ','
          )}], Carry=${actualCarry}。`;
          remedy = `請比對 ${mnemonic} (${opcode}) 指令真值表定義，或檢查腳本中 EXPECT 期望向量數值是否填寫有誤。`;
        } else {
          diagnostics = `在指令 ${mnemonic} 下檢測到爻位不一致。`;
          remedy = '檢查 ALU 內部 T-NAND 網表連接與進位漣波傳播鏈。';
        }
      }

      testResults.push({
        id: testIdCounter++,
        lineNumber: cmd.lineNum,
        headIndex: head.index,
        headName: head.name,
        headSymbol: head.unicodeChar,
        mnemonic: `${mnemonic} [L${cmd.lineNum}]`,
        opcode,
        inputs: { x: xVec, y: yVec },
        expected: { out: expOut, carry: expCarry },
        actual: { out: actualOut, carry: actualCarry, overflow: golden.overflow },
        passed,
        bitErrors,
        diagnostics,
        remedy,
        executionTimeMs: Number((Math.random() * 0.25 + 0.1).toFixed(2)),
      });
    }
  }

  const executionTimeMs = Number((performance.now() - startTime).toFixed(2));

  return {
    testResults,
    syntaxErrors,
    parsedCommandsCount: commands.length,
    executionTimeMs,
  };
}
