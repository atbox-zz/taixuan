/**
 * Automated Unit Testbench & 81-ISA Verification Suite
 * (自動化單元測試台與 81 首指令集驗證引擎)
 * Allows users to write/load .hdl test scripts, automatically verifies all 81 Tetragram ISA instructions
 * across different input sequence vectors, and outputs detailed bit-level logic error reports.
 * @license Apache-2.0
 */

import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { TritValue, DisplayMode, AluOpcode } from '../../types/ternary';
import { TRIT_INFO, formatTrit } from '../../lib/taiXuanData';
import {
  parseHdlTestScript,
  executeHdlTestCommands,
  TestCaseResult,
  BitErrorDetail,
  ScriptSyntaxError,
  mapHeadToAluSpec,
} from '../../lib/hdlTestRunner';
import {
  Play,
  RotateCcw,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  FileCode,
  Copy,
  Download,
  Bug,
  Search,
  ShieldAlert,
  ShieldCheck,
  ChevronRight,
  Terminal,
  Activity,
  Zap,
  StepForward,
  Cpu,
  Layers,
  Sparkles,
  Info,
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface AutomatedUnitTestbenchProps {
  mode: DisplayMode;
}

// Built-in script presets
const PRESET_SCRIPTS = {
  golden81: `// ==========================================
// 太玄經 81 首指令集黃金全量單元測試腳本 (Golden 81-ISA Suite)
// Target: TaiXuan 4-Trit ALU Engine
// ==========================================
TEST_SUITE TaiXuan_81_Instruction_Set_Verification
TARGET_CHIP ALU4
CLOCK_PERIOD 10ns
VERIFY_ALL_81_ISA sequence=golden_vectors
ASSERT_CONVERGENCE full_strict
`,
  stressBoundary: `// ==========================================
// 四爻 ALU 極值與邊界溢出壓力測試腳本 (Boundary Stress Suite)
// Target: TaiXuan 4-Trit ALU Engine
// ==========================================
TEST_SUITE ALU_Boundary_Overflow_Stress_Test
TARGET_CHIP ALU4

// Case 1: 全陽極值加法 (All Heaven: 2+2=1 with carry 1)
EXEC 1 X=[2,2,2,2] Y=[2,2,2,2] OP=ADD EXPECT=[1,2,2,2] CARRY=1

// Case 2: 全陰零態減法 (All Earth: 0-0=0)
EXEC 2 X=[0,0,0,0] Y=[0,0,0,0] OP=SUB EXPECT=[0,0,0,0] CARRY=0

// Case 3: 和諧中態邏輯升取 (All Human Neutral: MAX)
EXEC 3 X=[1,1,1,1] Y=[1,1,1,1] OP=MAX EXPECT=[1,1,1,1] CARRY=0

// Case 4: 階梯爻象三才順行循變 (CYCLE: 2->0, 1->2, 0->1)
EXEC 4 X=[2,1,0,2] Y=[0,0,0,0] OP=CYCLE EXPECT=[0,2,1,0] CARRY=0

// Case 5: 跨界比較 (Heaven > Earth: CMP)
EXEC 5 X=[2,2,0,0] Y=[0,0,2,2] OP=CMP EXPECT=[2,2,2,2] CARRY=0

// Case 6: 乘三左移 (SHL)
EXEC 6 X=[1,2,0,1] Y=[0,0,0,0] OP=SHL EXPECT=[2,0,1,1] CARRY=1

// Case 7: 降取 T-AND (MIN)
EXEC 7 X=[2,0,1,2] Y=[1,1,2,0] OP=MIN EXPECT=[1,0,1,0] CARRY=0
`,
  logicGates: `// ==========================================
// 三才邏輯門與循變移位測試 (T-NOT / T-CYCLE / Shift Suite)
// Target: TaiXuan 4-Trit ALU Engine
// ==========================================
TEST_SUITE Logic_Gate_Permutation_Suite
TARGET_CHIP ALU4

// 測試 1: 太玄非門 (T-NOT: 2->0, 1->1, 0->2)
EXEC 20 X=[2,1,0,2] Y=[0,0,0,0] OP=NEG EXPECT=[0,1,2,0] CARRY=0

// 測試 2: 三才流轉循變門 (CYCLE: 2->0, 1->2, 0->1)
EXEC 44 X=[0,1,2,0] Y=[0,0,0,0] OP=CYCLE EXPECT=[1,2,0,1] CARRY=0

// 測試 3: 三進制除三右移 (SHR: Tier 0 移入 Carry)
EXEC 50 X=[2,1,0,2] Y=[0,0,0,0] OP=SHR EXPECT=[1,2,1,0] CARRY=2

// 測試 4: 雙重倒反等價性 (NOT(NOT(X)) == X)
EXEC 1 X=[2,0,1,2] Y=[0,0,0,0] OP=NEG EXPECT=[0,2,1,0] CARRY=0
`,
  faultInjection: `// ==========================================
// 故障注入診斷自檢腳本 (Fault Injection Diagnostic Suite)
// (故意引入位元偏差以驗證單元測試台之邏輯誤差定位與報告機制)
// ==========================================
TEST_SUITE Fault_Injection_Diagnostic_Test
TARGET_CHIP ALU4

// 啟用硬體故障注入模擬模式
INJECT_FAULT_SIMULATION enabled=true

// 故障注入 1: 首 7 蒙 (ADD) 注入部爻(Tier 1)半加器短路
INJECT_FAULT head=7 tier=1 val=2 reason="部爻(Tier 1)半加器延遲抖動與短路"
// 故障注入 2: 首 21 釋 (SUB) 注入高位 Carry Flag 溢出鎖存器異常
INJECT_FAULT head=21 tier=carry val=2 reason="高位 Carry Flag 溢出鎖存器信號反向導通"
// 故障注入 3: 首 44 竈 (CYCLE) 注入方爻(Tier 3)三態循變相位偏置
INJECT_FAULT head=44 tier=3 val=0 reason="方爻(Tier 3)三態循變相位失鎖偏置"

// 執行全量 81 首指令集驗證，捕捉注入之故障
VERIFY_ALL_81_ISA
`,
  customTest: `// ==========================================
// 用戶自定義 HDL 測試腳本 (Custom HDL Playground)
// 提示: 可使用 EXEC 或 SET/EVAL/EXPECT 語句
// ==========================================
TEST_SUITE My_Custom_Hardware_Test
TARGET_CHIP ALU4

// 範例 1: 加法測試
EXEC 1 X=[1,2,0,1] Y=[0,1,2,1] OP=ADD EXPECT=[2,0,0,2] CARRY=0

// 範例 2: 減法測試
EXEC 2 X=[2,2,1,0] Y=[1,1,0,2] OP=SUB EXPECT=[1,1,0,1] CARRY=0

// 範例 3: 模塊化語法測試
SET X=[2,1,0,1], Y=[0,1,2,0]
EVAL OP=MAX
EXPECT OUT=[2,1,2,1] CARRY=0
`,
};

export const AutomatedUnitTestbench: React.FC<AutomatedUnitTestbenchProps> = ({ mode }) => {
  // Script editor state
  const [activePreset, setActivePreset] = useState<
    'golden81' | 'stressBoundary' | 'logicGates' | 'faultInjection' | 'customTest'
  >('golden81');
  const [scriptContent, setScriptContent] = useState<string>(PRESET_SCRIPTS.golden81);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [runProgress, setRunProgress] = useState<number>(0);

  // Syntax and execution state
  const [syntaxErrors, setSyntaxErrors] = useState<ScriptSyntaxError[]>([]);
  const [testResults, setTestResults] = useState<TestCaseResult[]>([]);
  const [hasRun, setHasRun] = useState<boolean>(false);
  const [stepIndex, setStepIndex] = useState<number>(0);

  // Filters and inspection
  const [filterStatus, setFilterStatus] = useState<'all' | 'passed' | 'failed'>('all');
  const [filterCategory, setFilterCategory] = useState<'all' | 'arithmetic' | 'logic' | 'control'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedTestCase, setSelectedTestCase] = useState<TestCaseResult | null>(null);

  // Fault injection toggle
  const [injectFaults, setInjectFaults] = useState<boolean>(false);

  // Copy & export feedback
  const [copiedScript, setCopiedScript] = useState<boolean>(false);
  const [copiedReport, setCopiedReport] = useState<boolean>(false);

  // Timer ref for progressive animation
  const animTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Switch presets
  const handleLoadPreset = (
    key: 'golden81' | 'stressBoundary' | 'logicGates' | 'faultInjection' | 'customTest'
  ) => {
    setActivePreset(key);
    setScriptContent(PRESET_SCRIPTS[key]);
    if (key === 'faultInjection') {
      setInjectFaults(true);
    } else {
      setInjectFaults(false);
    }
  };

  // Execution engine: runs the test bench based on user's actual script content
  const runTestbench = useCallback(() => {
    if (animTimerRef.current) {
      clearInterval(animTimerRef.current);
    }

    // Step 1: Parse the user's HDL test script
    const { commands, syntaxErrors: errors } = parseHdlTestScript(scriptContent);
    setSyntaxErrors(errors);

    if (commands.length === 0 && errors.length > 0) {
      // Script has fatal syntax errors preventing execution
      setTestResults([]);
      setHasRun(true);
      return;
    }

    setIsRunning(true);
    setRunProgress(0);

    // Progressive simulated execution
    let progress = 0;
    animTimerRef.current = setInterval(() => {
      progress += 15;
      if (progress >= 100) {
        progress = 100;
        if (animTimerRef.current) clearInterval(animTimerRef.current);

        // Step 2: Execute commands against ALU hardware model
        const outcome = executeHdlTestCommands(commands, injectFaults);
        setTestResults(outcome.testResults);
        setHasRun(true);
        setIsRunning(false);
        setRunProgress(100);

        if (outcome.testResults.length > 0) {
          // Select first failed case or first test
          const firstFail = outcome.testResults.find((r) => !r.passed);
          setSelectedTestCase(firstFail || outcome.testResults[0]);
          setStepIndex(0);

          const allOk = outcome.testResults.every((r) => r.passed);
          if (allOk && outcome.testResults.length > 0) {
            confetti({ particleCount: 65, spread: 60, origin: { y: 0.65 } });
          }
        }
      } else {
        setRunProgress(progress);
      }
    }, 45);
  }, [scriptContent, injectFaults]);

  // Run automatically on first mount
  useEffect(() => {
    runTestbench();
    return () => {
      if (animTimerRef.current) clearInterval(animTimerRef.current);
    };
  }, []); // Run on mount

  // Step debugger handler: select next or prev test
  const handleStepNext = () => {
    if (testResults.length === 0) return;
    const nextIdx = (stepIndex + 1) % testResults.length;
    setStepIndex(nextIdx);
    setSelectedTestCase(testResults[nextIdx]);
  };

  const handleStepPrev = () => {
    if (testResults.length === 0) return;
    const prevIdx = (stepIndex - 1 + testResults.length) % testResults.length;
    setStepIndex(prevIdx);
    setSelectedTestCase(testResults[prevIdx]);
  };

  // Statistics
  const stats = useMemo(() => {
    const total = testResults.length;
    const passed = testResults.filter((r) => r.passed).length;
    const failed = total - passed;
    const passRate = total > 0 ? ((passed / total) * 100).toFixed(1) : '0';
    const totalTimeMs = testResults.reduce((acc, r) => acc + r.executionTimeMs, 0).toFixed(1);
    return { total, passed, failed, passRate, totalTimeMs };
  }, [testResults]);

  // Filtered results
  const filteredResults = useMemo(() => {
    return testResults.filter((item) => {
      if (filterStatus === 'passed' && !item.passed) return false;
      if (filterStatus === 'failed' && item.passed) return false;

      if (filterCategory !== 'all') {
        const spec = mapHeadToAluSpec(item.headIndex);
        if (spec.category !== filterCategory) return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = item.headName.toLowerCase().includes(q);
        const matchesMnemonic = item.mnemonic.toLowerCase().includes(q);
        const matchesIndex = String(item.headIndex) === q;
        if (!matchesName && !matchesMnemonic && !matchesIndex) return false;
      }

      return true;
    });
  }, [testResults, filterStatus, filterCategory, searchQuery]);

  // Copy HDL Test Script
  const handleCopyScript = () => {
    navigator.clipboard.writeText(scriptContent);
    setCopiedScript(true);
    setTimeout(() => setCopiedScript(false), 2000);
  };

  // Export full test error report
  const handleExportReport = () => {
    const lines = [
      '# 太玄經 81 首指令集自動化單元測試報告 (TaiXuan 81-ISA Unit Test Report)',
      `執行時間: ${new Date().toISOString()}`,
      `測試總數: ${stats.total} 步 | 通過: ${stats.passed} | 失敗: ${stats.failed} | 通過率: ${stats.passRate}%`,
      `總耗時: ${stats.totalTimeMs} ms`,
      '',
      '## 測試概要 (Summary)',
      '| 步驟 | 卦象 | 指令助記符 | 運算碼 | 狀態 | 執行耗時 |',
      '|---|---|---|---|---|---|',
      ...testResults.map(
        (r) =>
          `| ${r.id} | ${r.headSymbol} 首${r.headIndex} ${r.headName} | \`${r.mnemonic}\` | ${r.opcode} | ${r.passed ? '✓ PASSED' : '✗ FAILED'} | ${r.executionTimeMs}ms |`
      ),
      '',
      '## 邏輯誤差詳細診斷報告 (Logical Error & Diagnostics)',
      ...testResults
        .filter((r) => !r.passed)
        .map((r) => {
          return [
            `### 錯誤案例 #${r.id}: 首${r.headIndex} ${r.headName} (\`${r.mnemonic}\`)`,
            `- **輸入 X**: [${r.inputs.x.join(', ')}]`,
            `- **輸入 Y**: [${r.inputs.y.join(', ')}]`,
            `- **期望輸出**: [${r.expected.out.join(', ')}], Carry=${r.expected.carry}`,
            `- **實際輸出**: [${r.actual.out.join(', ')}], Carry=${r.actual.carry}`,
            `- **位元級偏差明細**:`,
            ...r.bitErrors.map(
              (b) =>
                `  - [${b.tierName}] 期望: ${b.exp} vs 實際: ${b.act} (電壓偏移量: ${b.voltageDelta})`
            ),
            `- **根本原因診斷**: ${r.diagnostics}`,
            `- **推薦修復方案**: ${r.remedy}`,
            '',
          ].join('\n');
        }),
    ];

    const reportText = lines.join('\n');
    navigator.clipboard.writeText(reportText);
    setCopiedReport(true);
    setTimeout(() => setCopiedReport(false), 2000);
  };

  // Download report file
  const handleDownloadReport = () => {
    const lines = [
      '# 太玄經 81 首指令集自動化單元測試報告',
      `產生時間: ${new Date().toLocaleString()}`,
      `通過率: ${stats.passRate}% (${stats.passed}/${stats.total})`,
      '',
      JSON.stringify(testResults, null, 2),
    ].join('\n');

    const blob = new Blob([lines], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `TaiXuan_81_ISA_Test_Report_${Date.now()}.md`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Render a tetragram line (Trit glyph)
  const renderTritGlyph = (val: TritValue) => {
    if (val === 2) {
      // 1 line (Heaven)
      return (
        <div className="w-12 h-2.5 bg-amber-500 rounded-sm shadow-xs flex items-center justify-center text-[9px] font-bold text-slate-900">
          ⚊
        </div>
      );
    }
    if (val === 1) {
      // 2 segments (Human/Earth)
      return (
        <div className="w-12 flex items-center justify-between gap-1">
          <div className="flex-1 h-2.5 bg-sky-500 rounded-sm shadow-xs" />
          <div className="flex-1 h-2.5 bg-sky-500 rounded-sm shadow-xs" />
        </div>
      );
    }
    // 3 segments (Earth/Human)
    return (
      <div className="w-12 flex items-center justify-between gap-0.5">
        <div className="flex-1 h-2.5 bg-emerald-500 rounded-sm shadow-xs" />
        <div className="flex-1 h-2.5 bg-emerald-500 rounded-sm shadow-xs" />
        <div className="flex-1 h-2.5 bg-emerald-500 rounded-sm shadow-xs" />
      </div>
    );
  };

  return (
    <div className="space-y-8">
      {/* Editorial Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-sky-950 to-slate-900 text-white rounded-2xl p-6 md:p-8 border border-sky-800/40 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-8 -translate-y-6 opacity-10 pointer-events-none select-none text-9xl font-serif">
          𝌆
        </div>
        <div className="relative z-10 max-w-3xl space-y-3">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-sky-500/20 border border-sky-400/30 text-sky-300 text-xs font-mono-code">
            <Terminal className="w-3.5 h-3.5 text-sky-400" />
            <span>AUTOMATED UNIT TESTBENCH & 81-ISA REGRESSION SUITE</span>
          </div>
          <h2 className="text-2xl md:text-3xl font-bold font-serif-tc text-sky-100 flex items-center gap-2.5">
            <span>太玄自動化單元測試台</span>
            <span className="text-xs font-mono-code px-2 py-0.5 rounded-md bg-sky-400/20 text-sky-200 border border-sky-400/30 font-normal">
              HDL Script & Bit Error Engine
            </span>
          </h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            支持編寫、加載自定義 <code>.hdl</code> 與 <code>.tst</code> 測試腳本，自動對《太玄經》81 首指令集在不同輸入序列向量下進行窮舉回歸驗證。提供精確到每一爻位（Tier 3 ~ Tier 0 及 Carry）的<strong>邏輯誤差報告</strong>、<strong>電壓偏移診斷</strong>與<strong>硬體網表修復建議</strong>。
          </p>
        </div>
      </div>

      {/* Script Editor & Testbench Controls */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h3 className="text-base font-bold font-serif-tc text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <FileCode className="w-4 h-4 text-sky-600 dark:text-sky-400" />
              <span>HDL 測試腳本控制台 (.tst / .hdl Script Editor)</span>
            </h3>
            <p className="text-xs text-slate-500">
              選擇內置標準測試規範，或直接在下方編輯器中編寫指令測試序列 (支援 EXEC, SET/EVAL/EXPECT, VERIFY_ALL_81_ISA)
            </p>
          </div>

          {/* Preset Buttons */}
          <div className="flex items-center flex-wrap gap-2">
            <button
              type="button"
              onClick={() => handleLoadPreset('golden81')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                activePreset === 'golden81'
                  ? 'bg-sky-600 text-white font-semibold shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              81首指令黃金基準
            </button>
            <button
              type="button"
              onClick={() => handleLoadPreset('stressBoundary')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                activePreset === 'stressBoundary'
                  ? 'bg-sky-600 text-white font-semibold shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              邊界極值壓力測試
            </button>
            <button
              type="button"
              onClick={() => handleLoadPreset('logicGates')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                activePreset === 'logicGates'
                  ? 'bg-sky-600 text-white font-semibold shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              三才邏輯門測試
            </button>
            <button
              type="button"
              onClick={() => handleLoadPreset('faultInjection')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all flex items-center gap-1.5 ${
                activePreset === 'faultInjection'
                  ? 'bg-amber-600 text-white font-semibold shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              <Bug className="w-3.5 h-3.5" />
              <span>故障注入診斷</span>
            </button>
            <button
              type="button"
              onClick={() => handleLoadPreset('customTest')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                activePreset === 'customTest'
                  ? 'bg-sky-600 text-white font-semibold shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              用戶自定義腳本
            </button>
          </div>
        </div>

        {/* Code Editor Box */}
        <div className="relative rounded-xl border border-slate-800 bg-slate-950 p-4 font-mono-code text-xs text-sky-300 shadow-inner">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800 text-slate-500 text-[11px]">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80"></span>
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80"></span>
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80"></span>
              <span className="ml-2 font-bold text-slate-400">TaiXuan_TestSuite.tst</span>
              <span className="text-[10px] text-slate-500">
                ({scriptContent.split('\n').length} 行代碼)
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopyScript}
                className="hover:text-slate-300 transition-colors flex items-center gap-1 text-[11px]"
              >
                <Copy className="w-3 h-3" />
                <span>{copiedScript ? '已複製' : '複製腳本'}</span>
              </button>
            </div>
          </div>

          <textarea
            value={scriptContent}
            onChange={(e) => setScriptContent(e.target.value)}
            rows={8}
            className="w-full bg-transparent text-sky-200/90 font-mono-code text-xs resize-y focus:outline-hidden leading-relaxed"
            spellCheck={false}
          />
        </div>

        {/* Syntax Errors Alert (if any) */}
        {syntaxErrors.length > 0 && (
          <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-xl space-y-1 text-xs">
            <div className="font-bold text-rose-700 dark:text-rose-400 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              <span>檢測到 {syntaxErrors.length} 個腳本語法解析錯誤：</span>
            </div>
            <ul className="list-disc list-inside space-y-0.5 text-slate-600 dark:text-slate-300 font-mono-code text-[11px]">
              {syntaxErrors.map((err, idx) => (
                <li key={idx}>
                  第 {err.line} 行: {err.message}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Action Toolbar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-1">
          <div className="flex items-center flex-wrap gap-3">
            <button
              type="button"
              onClick={runTestbench}
              disabled={isRunning}
              className="px-5 py-2.5 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center gap-2"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>{isRunning ? `正在執行回歸測試 (${runProgress}%)...` : '▶ 執行單元測試 (Run Testbench)'}</span>
            </button>

            {/* Step execution buttons */}
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700/60">
              <button
                type="button"
                onClick={handleStepPrev}
                disabled={testResults.length === 0}
                className="px-2.5 py-1.5 text-xs text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 rounded-lg transition-colors disabled:opacity-40"
                title="上一步測試"
              >
                ◀ 上一步
              </button>
              <span className="text-[11px] font-mono-code px-2 text-slate-500">
                {testResults.length > 0 ? `${stepIndex + 1}/${testResults.length}` : '0/0'}
              </span>
              <button
                type="button"
                onClick={handleStepNext}
                disabled={testResults.length === 0}
                className="px-2.5 py-1.5 text-xs text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 rounded-lg transition-colors disabled:opacity-40 flex items-center gap-1"
                title="下一步測試"
              >
                <span>下一步</span>
                <StepForward className="w-3.5 h-3.5" />
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                setInjectFaults((prev) => !prev);
              }}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all flex items-center gap-1.5 ${
                injectFaults
                  ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/40 ring-2 ring-amber-500/20'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700/60 hover:text-slate-900'
              }`}
            >
              <Bug className="w-3.5 h-3.5 text-amber-500" />
              <span>{injectFaults ? '已啟用硬體故障注入' : '模擬硬體故障注入'}</span>
            </button>
          </div>

          {/* Quick Stats Summary */}
          {hasRun && (
            <div className="flex items-center gap-4 text-xs font-mono-code">
              <div>
                總計: <span className="font-bold text-slate-800 dark:text-slate-200">{stats.total}</span>
              </div>
              <div className="text-emerald-600 dark:text-emerald-400">
                通過: <span className="font-bold">{stats.passed}</span>
              </div>
              {stats.failed > 0 ? (
                <div className="text-rose-600 dark:text-rose-400 font-bold">
                  誤差: {stats.failed}
                </div>
              ) : (
                <div className="text-emerald-600 dark:text-emerald-400 font-bold">
                  零誤差 (0 Errors)
                </div>
              )}
              <div className="text-slate-400">耗時: {stats.totalTimeMs}ms</div>
            </div>
          )}
        </div>

        {/* Running Progress Bar */}
        {isRunning && (
          <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
            <div
              className="bg-sky-600 h-full transition-all duration-150"
              style={{ width: `${runProgress}%` }}
            />
          </div>
        )}
      </div>

      {/* Regression Metrics & Pass Rate Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs">
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <span>全量測試通過率 (Pass Rate)</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span
              className={`text-2xl font-bold font-mono-code ${
                stats.failed === 0
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-amber-600 dark:text-amber-400'
              }`}
            >
              {stats.passRate}%
            </span>
            <span className="text-xs text-slate-400">
              ({stats.passed}/{stats.total})
            </span>
          </div>
          <div className="mt-2 text-[11px] text-slate-500">
            {stats.failed === 0 ? '✓ 全數符合 81 首指令金標' : `⚠ 偵測到 ${stats.failed} 組邊界位元偏差`}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs">
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
            <ShieldAlert className="w-4 h-4 text-rose-500" />
            <span>邏輯誤差報告數 (Errors)</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span
              className={`text-2xl font-bold font-mono-code ${
                stats.failed === 0
                  ? 'text-slate-800 dark:text-slate-200'
                  : 'text-rose-600 dark:text-rose-400'
              }`}
            >
              {stats.failed}
            </span>
            <span className="text-xs text-slate-400">個指令異常</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-500">
            {stats.failed === 0 ? '無寄生反向導通' : '已精確定位故障爻位'}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs">
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
            <Activity className="w-4 h-4 text-sky-500" />
            <span>仿真運行總耗時</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono-code text-slate-900 dark:text-slate-100">
              {stats.totalTimeMs}
            </span>
            <span className="text-xs text-slate-400">毫秒 (ms)</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-500">
            平均每步 ≈ {(Number(stats.totalTimeMs) / Math.max(1, stats.total)).toFixed(3)} ms
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs">
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
            <Zap className="w-4 h-4 text-amber-500" />
            <span>81 首指令集覆蓋率</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono-code text-sky-600 dark:text-sky-400">
              {stats.total >= 81 ? '100%' : `${((stats.total / 81) * 100).toFixed(0)}%`}
            </span>
            <span className="text-xs text-slate-400">全卦象算子</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-500">涵蓋 9 大核心 ALU 運算族</div>
        </div>
      </div>

      {/* Main Test Inspection Grid: Table on Left, Detailed Error Report on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Test Case Vector Table (7 Cols) */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-bold font-serif-tc text-slate-900 dark:text-slate-100">
                指令執行序列清單 ({filteredResults.length} / {testResults.length})
              </h4>
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center p-0.5 bg-slate-100 dark:bg-slate-800 rounded-lg text-[11px]">
                <button
                  type="button"
                  onClick={() => setFilterStatus('all')}
                  className={`px-2 py-1 rounded-md transition-all ${
                    filterStatus === 'all'
                      ? 'bg-white dark:bg-slate-900 text-sky-600 font-bold shadow-2xs'
                      : 'text-slate-500'
                  }`}
                >
                  全部
                </button>
                <button
                  type="button"
                  onClick={() => setFilterStatus('passed')}
                  className={`px-2 py-1 rounded-md transition-all ${
                    filterStatus === 'passed'
                      ? 'bg-white dark:bg-slate-900 text-emerald-600 font-bold shadow-2xs'
                      : 'text-slate-500'
                  }`}
                >
                  通過
                </button>
                <button
                  type="button"
                  onClick={() => setFilterStatus('failed')}
                  className={`px-2 py-1 rounded-md transition-all ${
                    filterStatus === 'failed'
                      ? 'bg-white dark:bg-slate-900 text-rose-600 font-bold shadow-2xs'
                      : 'text-slate-500'
                  }`}
                >
                  異常 ({stats.failed})
                </button>
              </div>

              {/* Category Filter */}
              <div className="flex items-center p-0.5 bg-slate-100 dark:bg-slate-800 rounded-lg text-[11px]">
                <button
                  type="button"
                  onClick={() => setFilterCategory('all')}
                  className={`px-2 py-1 rounded-md transition-all ${
                    filterCategory === 'all'
                      ? 'bg-white dark:bg-slate-900 text-sky-600 font-bold shadow-2xs'
                      : 'text-slate-500'
                  }`}
                >
                  全部族
                </button>
                <button
                  type="button"
                  onClick={() => setFilterCategory('arithmetic')}
                  className={`px-2 py-1 rounded-md transition-all ${
                    filterCategory === 'arithmetic'
                      ? 'bg-white dark:bg-slate-900 text-sky-600 font-bold shadow-2xs'
                      : 'text-slate-500'
                  }`}
                >
                  算術
                </button>
                <button
                  type="button"
                  onClick={() => setFilterCategory('logic')}
                  className={`px-2 py-1 rounded-md transition-all ${
                    filterCategory === 'logic'
                      ? 'bg-white dark:bg-slate-900 text-sky-600 font-bold shadow-2xs'
                      : 'text-slate-500'
                  }`}
                >
                  邏輯
                </button>
              </div>

              {/* Search Box */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
                <input
                  type="text"
                  placeholder="搜尋卦名或指令..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 pr-2.5 py-1 text-xs rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-hidden w-28 sm:w-36"
                />
              </div>
            </div>
          </div>

          {/* Table Container */}
          <div className="max-h-[500px] overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60">
            {filteredResults.length === 0 ? (
              <div className="text-center py-12 text-xs text-slate-400">
                無匹配的指令測試結果。請嘗試調整篩選條件或搜尋關鍵字。
              </div>
            ) : (
              filteredResults.map((item, idx) => {
                const isSelected = selectedTestCase?.id === item.id;
                return (
                  <div
                    key={item.id}
                    onClick={() => {
                      setSelectedTestCase(item);
                      setStepIndex(testResults.findIndex((r) => r.id === item.id));
                    }}
                    className={`p-3 cursor-pointer transition-all flex items-center justify-between text-xs rounded-xl my-1 ${
                      isSelected
                        ? 'bg-sky-50 dark:bg-sky-950/40 border border-sky-300 dark:border-sky-800 ring-1 ring-sky-400/30'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/40 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-6 h-6 rounded-md flex items-center justify-center font-bold text-xs ${
                          item.passed
                            ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                            : 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 animate-pulse'
                        }`}
                      >
                        {item.passed ? '✓' : '✗'}
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-serif-tc font-bold text-slate-900 dark:text-slate-100">
                            {item.headSymbol} 首{item.headIndex} {item.headName}
                          </span>
                          <span className="font-mono-code text-[11px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-sky-600 dark:text-sky-400 font-semibold">
                            {item.mnemonic}
                          </span>
                          {item.lineNumber && (
                            <span className="text-[10px] text-slate-400 font-mono-code">
                              L{item.lineNumber}
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono-code mt-0.5">
                          X:[{item.inputs.x.join('')}] Y:[{item.inputs.y.join('')}] → 實際:[
                          {item.actual.out.join('')}] C={item.actual.carry}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {item.passed ? (
                        <span className="text-[11px] font-mono-code text-emerald-600 dark:text-emerald-400 font-semibold">
                          PASSED ({item.executionTimeMs}ms)
                        </span>
                      ) : (
                        <span className="text-[11px] font-mono-code text-rose-600 dark:text-rose-400 font-bold bg-rose-50 dark:bg-rose-950/50 px-2 py-0.5 rounded border border-rose-200 dark:border-rose-900/40">
                          {item.bitErrors.length} 個爻位誤差
                        </span>
                      )}
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Detailed Error & Logic Report Panel (5 Cols) */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h4 className="text-sm font-bold font-serif-tc text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <AlertTriangle
                  className={`w-4 h-4 ${
                    selectedTestCase?.passed ? 'text-emerald-500' : 'text-rose-500'
                  }`}
                />
                <span>單元邏輯誤差深度診斷報告</span>
              </h4>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleExportReport}
                  className="px-2 py-1 text-[11px] font-medium bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-slate-700 dark:text-slate-300 transition-colors flex items-center gap-1"
                  title="複製完整 Markdown 測試報告"
                >
                  <Copy className="w-3 h-3" />
                  <span>{copiedReport ? '已複製報告' : '複製報告'}</span>
                </button>
                <button
                  type="button"
                  onClick={handleDownloadReport}
                  className="px-2 py-1 text-[11px] font-medium bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-slate-700 dark:text-slate-300 transition-colors flex items-center gap-1"
                  title="下載完整報告文件"
                >
                  <Download className="w-3 h-3" />
                  <span>下載</span>
                </button>
              </div>
            </div>

            {selectedTestCase ? (
              <div className="space-y-4 pt-3 text-xs">
                {/* Header Info */}
                <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 dark:text-slate-100 text-sm flex items-center gap-2">
                      <span className="text-xl font-serif">{selectedTestCase.headSymbol}</span>
                      <span>
                        首{selectedTestCase.headIndex} {selectedTestCase.headName} ({selectedTestCase.mnemonic})
                      </span>
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded font-mono-code font-bold text-[10px] ${
                        selectedTestCase.passed
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300'
                          : 'bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300'
                      }`}
                    >
                      {selectedTestCase.passed ? '✓ 邏輯等價一致' : '✗ 邏輯誤差觸發'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px] font-mono-code text-slate-600 dark:text-slate-400">
                    <div>運算碼 Opcode: {selectedTestCase.opcode}</div>
                    <div>單步耗時: {selectedTestCase.executionTimeMs} ms</div>
                    <div>
                      輸入 X: [
                      {selectedTestCase.inputs.x
                        .map((v) => formatTrit(v, mode))
                        .join(' ')}
                      ]
                    </div>
                    <div>
                      輸入 Y: [
                      {selectedTestCase.inputs.y
                        .map((v) => formatTrit(v, mode))
                        .join(' ')}
                      ]
                    </div>
                  </div>
                </div>

                {/* Tetragram Glyph Visualizer: Expected vs Actual */}
                <div className="p-3 bg-slate-50 dark:bg-slate-800/30 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-around">
                  <div className="flex flex-col items-center gap-1.5">
                    <span className="text-[10px] font-mono-code text-slate-400">期望爻象 (Exp)</span>
                    <div className="flex flex-col items-center gap-1 p-2 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700">
                      {[0, 1, 2, 3].map((tierIdx) => (
                        <div key={tierIdx}>{renderTritGlyph(selectedTestCase.expected.out[tierIdx])}</div>
                      ))}
                    </div>
                  </div>

                  <div className="text-slate-400 text-lg font-mono-code">vs</div>

                  <div className="flex flex-col items-center gap-1.5">
                    <span className="text-[10px] font-mono-code text-slate-400">實際爻象 (Act)</span>
                    <div
                      className={`flex flex-col items-center gap-1 p-2 bg-white dark:bg-slate-900 rounded-lg border ${
                        selectedTestCase.passed
                          ? 'border-emerald-300 dark:border-emerald-700'
                          : 'border-rose-400 dark:border-rose-700 ring-2 ring-rose-500/20'
                      }`}
                    >
                      {[0, 1, 2, 3].map((tierIdx) => {
                        const isMismatch =
                          selectedTestCase.actual.out[tierIdx] !==
                          selectedTestCase.expected.out[tierIdx];
                        return (
                          <div
                            key={tierIdx}
                            className={isMismatch ? 'ring-2 ring-rose-500 rounded-sm' : ''}
                          >
                            {renderTritGlyph(selectedTestCase.actual.out[tierIdx])}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Bit-level Discrepancy Matrix */}
                <div className="space-y-2">
                  <span className="font-semibold text-slate-800 dark:text-slate-200 block text-[11px]">
                    爻位輸出比對矩陣 (Bit-level Discrepancy)
                  </span>

                  <table className="w-full text-center border-collapse font-mono-code text-[11px]">
                    <thead>
                      <tr className="bg-slate-100 dark:bg-slate-800 text-slate-500">
                        <th className="p-1.5 text-left">爻位階梯 (Tier)</th>
                        <th className="p-1.5">期望標靶 (Exp)</th>
                        <th className="p-1.5">實際輸出 (Act)</th>
                        <th className="p-1.5">吻合度</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {[3, 2, 1, 0].map((tierIdx) => {
                        const tierArrayIdx = 3 - tierIdx;
                        const expVal = selectedTestCase.expected.out[tierArrayIdx];
                        const actVal = selectedTestCase.actual.out[tierArrayIdx];
                        const isMatch = expVal === actVal;
                        const tierName = ['家(0)', '部(1)', '州(2)', '方(3)'][tierIdx];

                        return (
                          <tr
                            key={tierIdx}
                            className={
                              !isMatch
                                ? 'bg-rose-50/60 dark:bg-rose-950/30 font-bold text-rose-700 dark:text-rose-300'
                                : ''
                            }
                          >
                            <td className="p-1.5 text-left text-slate-700 dark:text-slate-300">
                              Tier {tierIdx} {tierName}
                            </td>
                            <td className="p-1.5">{formatTrit(expVal, mode)}</td>
                            <td className="p-1.5">{formatTrit(actVal, mode)}</td>
                            <td className="p-1.5">
                              {isMatch ? (
                                <span className="text-emerald-600 dark:text-emerald-400">✓ 正確</span>
                              ) : (
                                <span className="text-rose-600 dark:text-rose-400">✗ 偏差</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}

                      {/* Carry row */}
                      <tr
                        className={
                          selectedTestCase.expected.carry !== selectedTestCase.actual.carry
                            ? 'bg-rose-50/60 dark:bg-rose-950/30 font-bold text-rose-700 dark:text-rose-300'
                            : ''
                        }
                      >
                        <td className="p-1.5 text-left text-slate-700 dark:text-slate-300">
                          進位標誌 (Carry)
                        </td>
                        <td className="p-1.5">{formatTrit(selectedTestCase.expected.carry, mode)}</td>
                        <td className="p-1.5">{formatTrit(selectedTestCase.actual.carry, mode)}</td>
                        <td className="p-1.5">
                          {selectedTestCase.expected.carry === selectedTestCase.actual.carry ? (
                            <span className="text-emerald-600 dark:text-emerald-400">✓ 正確</span>
                          ) : (
                            <span className="text-rose-600 dark:text-rose-400">✗ 偏差</span>
                          )}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Root Cause Diagnostics Box */}
                <div className="space-y-2">
                  <div className="p-3 bg-amber-50/60 dark:bg-amber-950/30 rounded-xl border border-amber-200 dark:border-amber-900/40 space-y-1">
                    <span className="font-bold text-amber-900 dark:text-amber-300 flex items-center gap-1.5 text-[11px]">
                      <Bug className="w-3.5 h-3.5" />
                      <span>根因診斷 (Root Cause Diagnostics)</span>
                    </span>
                    <p className="text-slate-700 dark:text-slate-300 text-[11px] leading-relaxed">
                      {selectedTestCase.diagnostics}
                    </p>
                  </div>

                  <div className="p-3 bg-sky-50/60 dark:bg-sky-950/30 rounded-xl border border-sky-200 dark:border-sky-900/40 space-y-1">
                    <span className="font-bold text-sky-900 dark:text-sky-300 flex items-center gap-1.5 text-[11px]">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>推薦硬體修復方案 (Remedy Recommendation)</span>
                    </span>
                    <p className="text-slate-700 dark:text-slate-300 text-[11px] leading-relaxed">
                      {selectedTestCase.remedy}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-16 text-slate-400 text-xs">
                請在左側清單中點選任意測試步驟以檢視詳細誤差報告。
              </div>
            )}
          </div>

          {/* Quick Info Footer */}
          <div className="pt-2 border-t border-slate-200 dark:border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
            <span>支援 4-Trit 81 首 ISA 形式驗證</span>
            <span>誤差定位精度: 1 Trit (0.5V)</span>
          </div>
        </div>
      </div>
    </div>
  );
};
