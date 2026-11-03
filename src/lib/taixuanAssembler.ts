/**
 * Tai Xuan Symbolic Assembler Engine (太玄符號彙編器核心引擎)
 * Two-pass Assembler for the 4-Trit 81-Tetragram TaiXuan Computer Architecture
 * Supports:
 * - Label definition (LABEL:, @LABEL) and forward/backward address resolution
 * - Arithmetic/Logic Mnemonics (ADD, SUB, MAX, MIN, NOT, CYCLE, SHL, SHR, CMP)
 * - Memory & I/O Mnemonics (LOAD, STORE, MOV, IN.KBD, OUT.VRAM, OUT.PX, CLS.VRAM)
 * - Branch & Control Flow (JMP, JZ, JNZ, JP, JN, HALT, NOP)
 * - 81 Authentic Tetragram Heads as Direct Instructions (【中】..【養】)
 * - Number formats: Decimal (42), Hex (0x2A), Trits (%2101 or 天天地人)
 * @license Apache-2.0
 */

import { TritValue, AluOpcode, TetragramHead } from '../types/ternary';
import {
  TAI_XUAN_HEADS,
  standardIntToFourTrits,
  fourTritsToStandardInt,
  TRIT_INFO,
} from './taiXuanData';

export interface AssembledInstruction {
  address: number;
  label?: string;
  sourceLineNumber: number;
  rawText: string;
  headIndex: number; // 1..81
  headName: string;
  headUnicode: string;
  opcode: AluOpcode;
  immediate: [TritValue, TritValue, TritValue, TritValue];
  immediateDec: number;
  hexCode: string;
  tritString: string;
  comment: string;
  isIoOrBranch?: boolean;
  branchTarget?: number;
  ioTarget?: 'KBD' | 'VRAM' | 'RAM' | 'NONE';
  ioAddress?: number;
}

export interface AssemblySymbol {
  name: string;
  address: number;
  sourceLine: number;
}

export interface AssemblyError {
  line: number;
  rawLine: string;
  message: string;
  column?: number;
}

export interface AssemblyResult {
  success: boolean;
  instructions: AssembledInstruction[];
  symbols: Record<string, AssemblySymbol>;
  errors: AssemblyError[];
  warnings: string[];
  totalWords: number;
  vramFootprint: number;
  sourceLinesCount: number;
}

// Map from Chinese Trit character to TritValue
const TRIT_CHAR_MAP: Record<string, TritValue> = {
  '天': 2,
  '2': 2,
  '+': 2,
  '地': 1,
  '1': 1,
  '0': 1, // in balanced ternary, 0 is 地
  '人': 0,
  '-': 0,
};

// Map head names to 1-based index (e.g. '中' -> 1)
const HEAD_NAME_TO_INDEX: Record<string, number> = {};
TAI_XUAN_HEADS.forEach((h, idx) => {
  HEAD_NAME_TO_INDEX[h.name] = idx + 1;
});

/**
 * Parse an operand string into a 4-trit vector.
 * Supports:
 * - Immediate integer: '#42', '42', '#-5'
 * - Hex address/value: '0x30', '@0x4F'
 * - Trit literal: '%2101', '天天地人'
 * - Label reference: '@LOOP' (resolved via symbols map)
 */
export function parseOperand(
  operandStr: string,
  symbols: Record<string, AssemblySymbol>
): { trits: [TritValue, TritValue, TritValue, TritValue]; dec: number; error?: string } {
  let clean = operandStr.trim();
  if (clean.startsWith('#')) clean = clean.slice(1).trim();

  // Check if it's a label reference (e.g. '@LOOP' or 'LOOP')
  const labelCandidate = clean.startsWith('@') ? clean.slice(1) : clean;
  if (symbols[labelCandidate]) {
    const addr = symbols[labelCandidate].address;
    return {
      trits: standardIntToFourTrits(addr),
      dec: addr,
    };
  }

  // Hexadecimal notation: 0x2A or @0x2A
  if (clean.startsWith('@0x') || clean.startsWith('0x') || clean.startsWith('@0X') || clean.startsWith('0X')) {
    const hexPart = clean.replace(/^@?0[xX]/, '');
    const val = parseInt(hexPart, 16);
    if (!isNaN(val)) {
      const clamped = Math.max(0, Math.min(80, val));
      return {
        trits: standardIntToFourTrits(clamped),
        dec: clamped,
      };
    }
  }

  // Pure memory address @35
  if (clean.startsWith('@')) {
    const num = parseInt(clean.slice(1), 10);
    if (!isNaN(num)) {
      const clamped = Math.max(0, Math.min(80, num));
      return {
        trits: standardIntToFourTrits(clamped),
        dec: clamped,
      };
    }
  }

  // Trit literal syntax: %2101 or %天天地人
  if (clean.startsWith('%')) {
    const tritChars = clean.slice(1);
    if (tritChars.length <= 4) {
      const padded = tritChars.padStart(4, '地');
      const trits: TritValue[] = [];
      for (const ch of padded) {
        if (ch in TRIT_CHAR_MAP) {
          trits.push(TRIT_CHAR_MAP[ch]);
        } else {
          trits.push(1); // default 地
        }
      }
      const val = fourTritsToStandardInt(trits as [TritValue, TritValue, TritValue, TritValue]);
      return {
        trits: trits as [TritValue, TritValue, TritValue, TritValue],
        dec: val,
      };
    }
  }

  // Check Chinese trit representation directly: e.g. "天天地人"
  if (/^[天地人]{1,4}$/.test(clean)) {
    const padded = clean.padStart(4, '地');
    const trits = Array.from(padded).map((ch) => TRIT_CHAR_MAP[ch] ?? 1) as [
      TritValue,
      TritValue,
      TritValue,
      TritValue
    ];
    return {
      trits,
      dec: fourTritsToStandardInt(trits),
    };
  }

  // Standard Decimal integer
  const num = parseInt(clean, 10);
  if (!isNaN(num)) {
    const clamped = Math.max(0, Math.min(80, num));
    return {
      trits: standardIntToFourTrits(clamped),
      dec: clamped,
    };
  }

  // Check if it is a Tetragram name directly (e.g. "中", "羨")
  const strippedHead = clean.replace(/[【】]/g, '');
  if (HEAD_NAME_TO_INDEX[strippedHead]) {
    const headIdx = HEAD_NAME_TO_INDEX[strippedHead];
    const headObj = TAI_XUAN_HEADS[headIdx - 1];
    return {
      trits: [...headObj.trits],
      dec: fourTritsToStandardInt(headObj.trits),
    };
  }

  return {
    trits: [1, 1, 1, 1],
    dec: 40,
    error: `無法解析操作數 "${operandStr}"`,
  };
}

/**
 * Two-pass Assembler implementation
 */
export function assembleTaiXuan(sourceCode: string): AssemblyResult {
  const lines = sourceCode.split('\n');
  const symbols: Record<string, AssemblySymbol> = {};
  const errors: AssemblyError[] = [];
  const warnings: string[] = [];

  interface IntermediateLine {
    lineNumber: number;
    rawText: string;
    label?: string;
    instructionText: string;
    comment: string;
    address: number;
  }

  const intermediateLines: IntermediateLine[] = [];
  let currentAddress = 0;

  // PASS 1: Parse labels, remove comments, calculate PC addresses
  for (let i = 0; i < lines.length; i++) {
    const lineNum = i + 1;
    const rawLine = lines[i];

    // Separate comment
    let codePart = rawLine;
    let commentPart = '';
    const commentIdx = rawLine.search(/(\/\/|;)/);
    if (commentIdx !== -1) {
      codePart = rawLine.slice(0, commentIdx);
      commentPart = rawLine.slice(commentIdx).trim();
    }

    let trimmed = codePart.trim();
    if (trimmed.length === 0) continue; // Empty or comment-only line

    // Directive: .ORG <address>
    if (trimmed.startsWith('.ORG') || trimmed.startsWith('.org')) {
      const parts = trimmed.split(/\s+/);
      if (parts.length >= 2) {
        const targetAddr = parseInt(parts[1], parts[1].startsWith('0x') ? 16 : 10);
        if (!isNaN(targetAddr)) {
          currentAddress = targetAddr;
        }
      }
      continue;
    }

    // Check for label definition: "LABEL:" or "@LABEL" at start
    let label: string | undefined;
    const labelColonMatch = trimmed.match(/^([A-Za-z0-9_$\u4e00-\u9fa5]+):\s*(.*)$/);
    if (labelColonMatch) {
      label = labelColonMatch[1];
      trimmed = labelColonMatch[2].trim();
    } else if (trimmed.startsWith('@') && trimmed.endsWith(':')) {
      label = trimmed.slice(1, -1).trim();
      trimmed = '';
    }

    if (label) {
      if (symbols[label]) {
        errors.push({
          line: lineNum,
          rawLine,
          message: `重複定義的標籤符號: "${label}"`,
        });
      } else {
        symbols[label] = {
          name: label,
          address: currentAddress,
          sourceLine: lineNum,
        };
      }
    }

    // If there is still instruction text on this line, allocate an address
    if (trimmed.length > 0) {
      intermediateLines.push({
        lineNumber: lineNum,
        rawText: rawLine,
        label,
        instructionText: trimmed,
        comment: commentPart,
        address: currentAddress,
      });
      currentAddress++;
      if (currentAddress > 81) {
        warnings.push(`地址溢出警告：代碼行 ${lineNum} 超出 81-Trit ROM 總容量上限 (81 字)。`);
      }
    }
  }

  // PASS 2: Encode mnemonics and resolve symbols
  const instructions: AssembledInstruction[] = [];

  for (const item of intermediateLines) {
    const { lineNumber, rawText, label, instructionText, comment, address } = item;
    const tokens = instructionText.split(/[\s,]+/).filter(Boolean);
    if (tokens.length === 0) continue;

    const mnemonic = tokens[0].toUpperCase();
    const arg1 = tokens[1] || '';
    const arg2 = tokens[2] || '';

    let opcode: AluOpcode = 'ADD';
    let headIndex = 1;
    let immediate: [TritValue, TritValue, TritValue, TritValue] = [1, 1, 1, 1];
    let isIoOrBranch = false;
    let branchTarget: number | undefined;
    let ioTarget: 'KBD' | 'VRAM' | 'RAM' | 'NONE' = 'NONE';
    let ioAddress: number | undefined;

    // Check if mnemonic is a direct Tetragram Head Name: e.g. "【中】", "中", "羨"
    const strippedMnemonic = mnemonic.replace(/[【】]/g, '');
    if (HEAD_NAME_TO_INDEX[strippedMnemonic]) {
      headIndex = HEAD_NAME_TO_INDEX[strippedMnemonic];
      const headObj = TAI_XUAN_HEADS[headIndex - 1];
      opcode = 'ADD';
      immediate = [...headObj.trits];
    } else {
      switch (mnemonic) {
        case 'NOP':
          opcode = 'ADD';
          headIndex = 1; // 中
          immediate = [1, 1, 1, 1];
          break;

        case 'ADD':
          opcode = 'ADD';
          headIndex = 2; // 羨
          if (arg1) {
            const parsed = parseOperand(arg1, symbols);
            immediate = parsed.trits;
          }
          break;

        case 'SUB':
          opcode = 'SUB';
          headIndex = 11; // 窮
          if (arg1) {
            const parsed = parseOperand(arg1, symbols);
            immediate = parsed.trits;
          }
          break;

        case 'MAX':
        case 'OR':
        case 'T_OR':
          opcode = 'MAX';
          headIndex = 28; // 裝
          if (arg1) {
            const parsed = parseOperand(arg1, symbols);
            immediate = parsed.trits;
          }
          break;

        case 'MIN':
        case 'AND':
        case 'T_AND':
          opcode = 'MIN';
          headIndex = 30; // 密
          if (arg1) {
            const parsed = parseOperand(arg1, symbols);
            immediate = parsed.trits;
          }
          break;

        case 'NOT':
        case 'NEG':
        case 'T_NOT':
          opcode = 'NEG';
          headIndex = 81; // 難
          if (arg1) {
            const parsed = parseOperand(arg1, symbols);
            immediate = parsed.trits;
          } else {
            immediate = [2, 2, 2, 2];
          }
          break;

        case 'CYCLE':
        case 'CYC':
          opcode = 'CYCLE';
          headIndex = 41; // 文
          immediate = [1, 1, 1, 1];
          break;

        case 'SHL':
          opcode = 'SHL';
          headIndex = 5; // 達
          immediate = [1, 1, 1, 1];
          break;

        case 'SHR':
          opcode = 'SHR';
          headIndex = 4; // 斂
          immediate = [1, 1, 1, 1];
          break;

        case 'CMP':
          opcode = 'CMP';
          headIndex = 7; // 視
          if (arg1) {
            const parsed = parseOperand(arg1, symbols);
            immediate = parsed.trits;
          }
          break;

        case 'SET':
        case 'MOV':
          opcode = 'ADD';
          headIndex = 3; // 睟
          if (arg1) {
            const parsed = parseOperand(arg1, symbols);
            immediate = parsed.trits;
          }
          break;

        case 'LOAD':
          opcode = 'ADD';
          headIndex = 17; // 進
          isIoOrBranch = true;
          ioTarget = 'RAM';
          if (arg1) {
            const parsed = parseOperand(arg1, symbols);
            immediate = parsed.trits;
            ioAddress = parsed.dec;
          }
          break;

        case 'STORE':
          opcode = 'ADD';
          headIndex = 16; // 守
          isIoOrBranch = true;
          ioTarget = 'RAM';
          if (arg1) {
            const parsed = parseOperand(arg1, symbols);
            immediate = parsed.trits;
            ioAddress = parsed.dec;
          }
          break;

        // I/O Instructions
        case 'IN.KBD':
        case 'KBD.IN':
          opcode = 'ADD';
          headIndex = 49; // 減 (Keyboard poll)
          isIoOrBranch = true;
          ioTarget = 'KBD';
          ioAddress = 0x4f; // 79
          immediate = standardIntToFourTrits(0x4f);
          break;

        case 'OUT.VRAM':
        case 'VRAM.OUT':
          opcode = 'ADD';
          headIndex = 39; // 大 (VRAM screen output)
          isIoOrBranch = true;
          ioTarget = 'VRAM';
          if (arg1) {
            const parsed = parseOperand(arg1, symbols);
            ioAddress = 0x30 + (parsed.dec % 81);
            immediate = standardIntToFourTrits(ioAddress);
          } else {
            ioAddress = 0x30;
            immediate = standardIntToFourTrits(0x30);
          }
          break;

        case 'OUT.PX': {
          opcode = 'ADD';
          headIndex = 40; // 廓 (Pixel coordinate draw)
          isIoOrBranch = true;
          ioTarget = 'VRAM';
          const x = parseInt(arg1, 10) || 0;
          const y = parseInt(arg2, 10) || 0;
          const offset = (y % 9) * 9 + (x % 9);
          ioAddress = 0x30 + offset;
          immediate = standardIntToFourTrits(ioAddress);
          break;
        }

        case 'CLS.VRAM':
          opcode = 'ADD';
          headIndex = 18; // 釋 (Clear VRAM)
          isIoOrBranch = true;
          ioTarget = 'VRAM';
          if (arg1) {
            const parsed = parseOperand(arg1, symbols);
            immediate = parsed.trits;
          } else {
            immediate = [1, 1, 1, 1]; // Clear with 地
          }
          break;

        // Branch and Flow Control
        case 'JMP':
        case 'GOTO':
          opcode = 'ADD';
          headIndex = 25; // 更 (Change / Jump)
          isIoOrBranch = true;
          if (arg1) {
            const parsed = parseOperand(arg1, symbols);
            branchTarget = parsed.dec;
            immediate = parsed.trits;
          }
          break;

        case 'JZ':
          opcode = 'ADD';
          headIndex = 55; // 止 (Stop / Jump if Zero)
          isIoOrBranch = true;
          if (arg1) {
            const parsed = parseOperand(arg1, symbols);
            branchTarget = parsed.dec;
            immediate = parsed.trits;
          }
          break;

        case 'JNZ':
          opcode = 'ADD';
          headIndex = 56; // 堅 (Jump if Not Zero)
          isIoOrBranch = true;
          if (arg1) {
            const parsed = parseOperand(arg1, symbols);
            branchTarget = parsed.dec;
            immediate = parsed.trits;
          }
          break;

        case 'JP':
          opcode = 'ADD';
          headIndex = 37; // 遇 (Jump if Heaven / Positive)
          isIoOrBranch = true;
          if (arg1) {
            const parsed = parseOperand(arg1, symbols);
            branchTarget = parsed.dec;
            immediate = parsed.trits;
          }
          break;

        case 'JN':
          opcode = 'ADD';
          headIndex = 59; // 苦 (Jump if Human / Negative)
          isIoOrBranch = true;
          if (arg1) {
            const parsed = parseOperand(arg1, symbols);
            branchTarget = parsed.dec;
            immediate = parsed.trits;
          }
          break;

        case 'HALT':
          opcode = 'ADD';
          headIndex = 81; // 難 (Halt / End)
          immediate = [0, 0, 0, 0];
          break;

        default:
          errors.push({
            line: lineNumber,
            rawLine: rawText,
            message: `未知的指令或助記符: "${mnemonic}"`,
          });
          break;
      }
    }

    const headObj = TAI_XUAN_HEADS[headIndex - 1] || TAI_XUAN_HEADS[0];
    const immediateDec = fourTritsToStandardInt(immediate);
    const hexCode = `0x${address.toString(16).toUpperCase().padStart(2, '0')}`;
    const tritString = immediate.map((t) => TRIT_INFO[t].name).join('');

    instructions.push({
      address,
      label,
      sourceLineNumber: lineNumber,
      rawText,
      headIndex,
      headName: headObj.name,
      headUnicode: headObj.unicodeChar,
      opcode,
      immediate,
      immediateDec,
      hexCode,
      tritString,
      comment: comment || `[${headObj.name}] 第${headIndex}首 · ${headObj.meaning}`,
      isIoOrBranch,
      branchTarget,
      ioTarget,
      ioAddress,
    });
  }

  // Calculate VRAM footprint
  const vramFootprint = instructions.filter((i) => i.ioTarget === 'VRAM').length;

  return {
    success: errors.length === 0,
    instructions,
    symbols,
    errors,
    warnings,
    totalWords: instructions.length,
    vramFootprint,
    sourceLinesCount: lines.length,
  };
}

/**
 * Built-in Sample Assembly Programs
 */
export const SAMPLE_ASSEMBLY_PROGRAMS: Record<
  string,
  { title: string; category: string; description: string; code: string }
> = {
  vram_clear_draw: {
    title: '1. 九宮顯存初始化與太極畫點 (VRAM Init & Point Draw)',
    category: 'VRAM 繪圖與顯存',
    description: '使用 CLS.VRAM 清除 9x9 顯存為純地 (玄黑)，隨後在太極核心 (4,4) 畫入金光天爻，並於四維繪製人道靈動點。',
    code: `// ==========================================
// 太玄顯存繪圖演示程式 (VRAM Demo)
// 顯存映射空間：@0x30 ~ @0x4E (81 個三進制光點)
// ==========================================

.ORG 0x00
INIT:
  CLS.VRAM #1         // 1. 全屏清屏：鋪設「地爻」玄黑底色
  SET #2              // 2. 累加器載入純陽「天爻」(+1 / 金光)
  OUT.PX 4, 4         // 3. 在 9x9 畫面幾何中心 (4,4) 點亮太極中樞

CORNER_TIAN:
  SET #2              // 4. 四角天位配置
  OUT.PX 0, 0         // 左上乾位 (0,0)
  OUT.PX 8, 8         // 右下坤位 (8,8)

CORNER_REN:
  SET #0              // 5. 赤朱「人爻」(-1 / 赤朱)
  OUT.PX 0, 8         // 左下
  OUT.PX 8, 0         // 右上

CROSS_SCAN:
  ADD #1              // 累加步進
  OUT.PX 4, 2         // 縱軸正中
  OUT.PX 4, 6         // 縱軸正下

HALT:
  NOP                 // 程式運行完成，保持當前顯存狀態
`,
  },

  kbd_cursor: {
    title: '2. 鍵盤輪詢與光標實時移動 (Interactive KBD Polling)',
    category: 'I/O 鍵盤中斷',
    description: '持續輪詢 @0x4F 鍵盤緩衝區。偵測到 A(左移)、D(右移)、W(旋轉)、SPACE(動作) 時，實時計算位移並刷新顯存！',
    code: `// ==========================================
// 太玄鍵盤輪詢交互內核 (KBD Polling Kernel)
// 鍵盤暫存器地址：@0x4F (79)
// 鍵值編碼：1=左, 2=右, 3=轉, 4=墜, 5=動
// ==========================================

.ORG 0x00
MAIN_LOOP:
  IN.KBD              // 1. 輪詢鍵盤緩衝區 @0x4F -> 載入 Acc
  CMP #0              // 2. 比較是否空閒 (IDLE)
  JZ NO_KEY           // 3. 若為空閒，跳轉等待

PROCESS_KEY:
  CMP #1              // 檢查是否為 A / 左移
  JZ MOVE_LEFT
  CMP #2              // 檢查是否為 D / 右移
  JZ MOVE_RIGHT
  CMP #5              // 檢查是否為 Space / 動作
  JZ DO_ACTION
  JMP REFRESH

MOVE_LEFT:
  SET #2              // 天光標誌
  OUT.PX 2, 4         // 在左側點亮反饋光點
  JMP REFRESH

MOVE_RIGHT:
  SET #2
  OUT.PX 6, 4         // 在右側點亮反饋光點
  JMP REFRESH

DO_ACTION:
  CLS.VRAM #2         // 全屏天光爆發閃爍
  JMP REFRESH

NO_KEY:
  NOP                 // 保持待命

REFRESH:
  CYCLE               // 三才相移，推進時鐘
  JMP MAIN_LOOP       // 循環輪詢
`,
  },

  tetris_gravity: {
    title: '3. 太玄俄羅斯方塊引力內核 (Tetris Gravity Fall Loop)',
    category: '遊戲引力引擎',
    description: '太玄方塊的核心時序循變：讀取當前方塊 Y 坐標，執行引力下墜 (Y+1)，偵測底邊碰撞，若著陸則固化至顯存並生成新方塊。',
    code: `// ==========================================
// 太玄方塊引力下墜核心 (Tetris Gravity Kernel)
// 管理下落時鐘、地界碰撞與顯存投影
// ==========================================

.ORG 0x00
SPAWN_BLOCK:
  SET #2              // 方塊材質：天爻純陽 (金光)
  OUT.PX 4, 0         // 在天門頂部中心生成第一爻 (4,0)
  OUT.PX 4, 1         // 構造豎向二爻 (4,1)
  OUT.PX 5, 1         // 折向出「玄宮折角」L-方塊 (5,1)

GRAVITY_TICK:
  CYCLE               // 時鐘相移步進
  IN.KBD              // 檢測下落過程中有無橫向操縱
  CMP #1
  JZ DRIFT_LEFT
  JMP CHECK_FLOOR

DRIFT_LEFT:
  OUT.PX 3, 2         // 左傾位移
  JMP ADVANCE_Y

CHECK_FLOOR:
  ADD #1              // 累加 Y 重力階梯
  CMP #8              // 是否觸及地道底界 (Y=8)?
  JP LOCK_AND_CLEAR   // 若觸底，跳轉固化判定

ADVANCE_Y:
  OUT.PX 4, 3         // 重力引導向下落一格
  JMP GRAVITY_TICK    // 進入下一重力週期

LOCK_AND_CLEAR:
  SET #1              // 固化為地爻穩定態
  OUT.PX 4, 8         // 固化至底盤
  JMP SPAWN_BLOCK     // 生成下一枚太玄神卦方塊
`,
  },

  fibonacci_four_trits: {
    title: '4. 太玄四爻斐波那契演化 (Ternary Fibonacci Evolution)',
    category: '純算術演算法',
    description: '在 4-Trit 模 81 空間內遞推計算 F(n+1) = (F(n) + F(n-1)) mod 81，觀察首象輪轉軌跡並輸出至顯存。',
    code: `// ==========================================
// 太玄三進制斐波那契序列
// F(0)=1, F(1)=2, F(2)=3, F(3)=5, F(4)=8...
// ==========================================

.ORG 0x00
INIT:
  SET #1              // F(0) = 1 (中首)
  OUT.PX 0, 0         // 映射至顯存起點
  ADD #1              // F(1) = 2 (羨首)
  OUT.PX 1, 0

FIB_STEP1:
  ADD #1              // F(2) = 3 (睟首)
  OUT.PX 2, 0

FIB_STEP2:
  ADD #2              // F(3) = 5 (達首)
  OUT.PX 3, 0

FIB_STEP3:
  ADD #3              // F(4) = 8 (劇首)
  OUT.PX 4, 0

FIB_CYCLE:
  CYCLE               // 三才順向循變
  OUT.PX 5, 0
  ADD #8              // F(5) = 13 (少首)
  OUT.PX 6, 0

EQUILIBRIUM:
  MIN #40             // 降取太和，防止數值偏亢
  OUT.PX 7, 0
  HALT                // 演化完成
`,
  },

  sancai_oscillator: {
    title: '5. 天地人三才極性震盪器 (Three-Realm Oscillator)',
    category: '邏輯循環',
    description: '利用 T-NOT 倒反門與 T-CYCLE 流轉門，在天(2)、地(1)、人(0) 之間往復振盪，產生三值對稱波形。',
    code: `// ==========================================
// 天地人三才極性震盪器
// ==========================================

.ORG 0x00
START:
  SET #2              // 初始天位 (純陽)
  OUT.PX 4, 4         // 投射至中心

OSCILLATE:
  NOT                 // 倒反：天(2) -> 人(0)
  OUT.PX 3, 4
  CYCLE               // 流轉：人(0) -> 地(1)
  OUT.PX 4, 5
  CYCLE               // 流轉：地(1) -> 天(2)
  OUT.PX 5, 4
  JMP OSCILLATE       // 永續震盪
`,
  },
};
