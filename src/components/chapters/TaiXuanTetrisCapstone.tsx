/**
 * Stage A: Capstone Project — Tai Xuan Ternary Tetris (太玄三象方塊)
 * The ultimate capstone of "From T-NAND to Micro-Computer and Tetris":
 * A complete, interactive Ternary Tetris game engine running on the 9x9 (81-Trit) VRAM screen,
 * backed by live Tai Xuan CPU registers, ALU accumulator, sound synthesizer,
 * and Tai Xuan Trinity (天-地-人) elimination physics.
 * @license Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { TritValue, DisplayMode, AluOpcode } from '../../types/ternary';
import { TritBadge } from '../TritBadge';
import {
  TAI_XUAN_HEADS,
  fourTritsToStandardInt,
  standardIntToFourTrits,
  formatTrit,
} from '../../lib/taiXuanData';
import {
  Gamepad2,
  Play,
  Pause,
  RotateCcw,
  Sparkles,
  Trophy,
  Flame,
  Volume2,
  VolumeX,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Cpu,
  Tv,
  Code,
  Layers,
  Zap,
  Info,
  Check,
  Copy,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface TaiXuanTetrisCapstoneProps {
  mode: DisplayMode;
  onOpenAssembler?: () => void;
  onOpenGenealogy?: () => void;
}

// Sound Synthesizer via Web Audio API
class TernaryAudioSynth {
  private ctx: AudioContext | null = null;
  public muted: boolean = false;

  private init() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  playMove() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(320, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(220, this.ctx.currentTime + 0.05);
      gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.05);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.05);
    } catch {}
  }

  playRotate() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(660, this.ctx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.12, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.08);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.08);
    } catch {}
  }

  playDrop() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(160, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(60, this.ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.1);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.1);
    } catch {}
  }

  playLineClear() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;
    try {
      const freqs = [330, 440, 554, 659];
      freqs.forEach((f, idx) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(f, this.ctx.currentTime + idx * 0.05);
        gain.gain.setValueAtTime(0.12, this.ctx.currentTime + idx * 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + idx * 0.05 + 0.25);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(this.ctx.currentTime + idx * 0.05);
        osc.stop(this.ctx.currentTime + idx * 0.05 + 0.25);
      });
    } catch {}
  }

  playTrinityHarmonic() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;
    try {
      // Ancient Chinese Pentatonic Chime (宮商角徵羽: 261, 293, 329, 392, 523)
      const freqs = [261.6, 329.6, 392.0, 523.2, 659.2];
      freqs.forEach((f, idx) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(f, this.ctx.currentTime + idx * 0.06);
        gain.gain.setValueAtTime(0.15, this.ctx.currentTime + idx * 0.06);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + idx * 0.06 + 0.4);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(this.ctx.currentTime + idx * 0.06);
        osc.stop(this.ctx.currentTime + idx * 0.06 + 0.4);
      });
    } catch {}
  }

  playGameOver() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(280, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(70, this.ctx.currentTime + 0.5);
      gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.5);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.5);
    } catch {}
  }
}

const audioSynth = new TernaryAudioSynth();

// Polyomino Piece definitions
export interface TetrisPiece {
  name: string;
  symbolicMeaning: string;
  tritPattern: TritValue[]; // Values assigned to each cell of the shape
  matrix: number[][]; // 1s represent piece shape
}

const TAI_XUAN_PIECES: TetrisPiece[] = [
  {
    name: '太玄一字 (I-Trit)',
    symbolicMeaning: '元一統攝，至直不撓',
    tritPattern: [2, 2, 2, 2], // 4x 天
    matrix: [
      [1, 1, 1, 1],
    ],
  },
  {
    name: '三才鼎足 (T-Trit)',
    symbolicMeaning: '天地人三才立鼎',
    tritPattern: [2, 1, 0, 1], // 天, 地, 人, 地
    matrix: [
      [0, 1, 0],
      [1, 1, 1],
    ],
  },
  {
    name: '乾坤中土 (O-Trit)',
    symbolicMeaning: '地方日圓，凝靜重厚',
    tritPattern: [1, 1, 1, 1], // 4x 地
    matrix: [
      [1, 1],
      [1, 1],
    ],
  },
  {
    name: '玄宮曲折 (L-Trit)',
    symbolicMeaning: '九天四方，通流造化',
    tritPattern: [2, 2, 1, 0], // 天, 天, 地, 人
    matrix: [
      [1, 0],
      [1, 0],
      [1, 1],
    ],
  },
  {
    name: '玄序反曲 (J-Trit)',
    symbolicMeaning: '逆序迴還，溯流而上',
    tritPattern: [0, 0, 1, 2], // 人, 人, 地, 天
    matrix: [
      [0, 1],
      [0, 1],
      [1, 1],
    ],
  },
  {
    name: '陰陽互錯 (S-Trit)',
    symbolicMeaning: '陽升陰降，錯綜化生',
    tritPattern: [2, 1, 1, 0], // 天, 地, 地, 人
    matrix: [
      [0, 1, 1],
      [1, 1, 0],
    ],
  },
  {
    name: '天象變微 (Z-Trit)',
    symbolicMeaning: '天地交感，四時相代',
    tritPattern: [0, 1, 1, 2], // 人, 地, 地, 天
    matrix: [
      [1, 1, 0],
      [0, 1, 1],
    ],
  },
  {
    name: '三爻神微 (Tri-Trit)',
    symbolicMeaning: '三爻立極，造化幽微',
    tritPattern: [2, 1, 0], // 天, 地, 人
    matrix: [
      [1, 1],
      [0, 1],
    ],
  },
];

// Board Constants: 9 Columns wide, 12 Rows high (top 3 rows are spawn/buffer zone, lower 9 rows are VRAM)
const BOARD_WIDTH = 9;
const BOARD_HEIGHT = 12;
const VISIBLE_HEIGHT = 9; // Exactly 9x9 = 81 VRAM trits!

// Tai Xuan Assembly code running the game loop
const TETRIS_ASM_CODE = `; ==========================================
; TAI XUAN TERNARY TETRIS ENGINE (STAGE A)
; VRAM Matrix: 9x9 = 81 Trits [@0x00 .. @0x50]
; Keyboard I/O Register: @0x4F (79)
; ALU Accumulator: 4-Trit Balanced Vector
; ==========================================

MAIN_INIT:
    LOAD  @0x4F, ACC     ; 讀取鍵盤輸入狀態
    MOV   #0, R_LINES    ; 清零消行計數
    SET.PC @0x04         ; 進入主遊戲循環

GAME_LOOP:
    IN.KBD R_KEY         ; 輪詢三值方向鍵 (0=空, 1=左, 2=右, 3=轉, 4=落)
    CMP    R_KEY, #0     ; 判斷是否有按鍵觸發
    JZ     TICK_GRAVITY  ; 若無輸入，前進自然重力時鐘

PROCESS_INPUT:
    CMP    R_KEY, #1     ; 是否左移
    JZ     DO_MOVE_LEFT
    CMP    R_KEY, #2     ; 是否右移
    JZ     DO_MOVE_RIGHT
    CMP    R_KEY, #3     ; 是否旋轉
    JZ     DO_ROTATE
    CMP    R_KEY, #4     ; 是否急墜
    JZ     DO_HARD_DROP

TICK_GRAVITY:
    ADD    R_POS_Y, #1   ; Y 軸向下推進一格
    CALL   CHECK_COLLIDE ; 碰撞檢測 (邊界與既有爻塊)
    JNZ    LOCK_PIECE    ; 觸底碰撞，固化至顯存
    JMP    RENDER_FRAME

LOCK_PIECE:
    OUT.VRAM R_PIECE     ; 寫入 81 首顯存陣列
    CALL   SCAN_TRINITY  ; 掃描三才同契 (天+地+人) 與滿行
    CALL   UPDATE_SCORE  ; 累加太玄首象積分至 ACC
    SPAWN  R_NEXT        ; 生成下一卦象神木
    JMP    GAME_LOOP

SCAN_TRINITY:
    ; 專利三才同契算法：檢測相鄰三爻 {天,地,人}
    ; 觸發九天同和共鳴消除！
    RET
`;

export const TaiXuanTetrisCapstone: React.FC<TaiXuanTetrisCapstoneProps> = ({
  mode,
  onOpenAssembler,
  onOpenGenealogy,
}) => {
  // Game Board State: null = empty, TritValue = occupied cell
  const [grid, setGrid] = useState<Array<Array<TritValue | null>>>(() =>
    Array.from({ length: BOARD_HEIGHT }, () => new Array(BOARD_WIDTH).fill(null))
  );

  // Active Piece
  const [currentPiece, setCurrentPiece] = useState<TetrisPiece>(TAI_XUAN_PIECES[0]);
  const [currentMatrix, setCurrentMatrix] = useState<number[][]>(TAI_XUAN_PIECES[0].matrix);
  const [currentTritPattern, setCurrentTritPattern] = useState<TritValue[]>(TAI_XUAN_PIECES[0].tritPattern);
  const [piecePos, setPiecePos] = useState<{ x: number; y: number }>({ x: 3, y: 0 });

  // Next & Hold Piece
  const [nextPieceIndex, setNextPieceIndex] = useState<number>(1);
  const [holdPiece, setHoldPiece] = useState<TetrisPiece | null>(null);
  const [canHold, setCanHold] = useState<boolean>(true);

  // Game Progress & Score
  const [score, setScore] = useState<number>(0);
  const [linesCleared, setLinesCleared] = useState<number>(0);
  const [level, setLevel] = useState<number>(1);
  const [trinityCombos, setTrinityCombos] = useState<number>(0);
  const [isGameOver, setIsGameOver] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);

  // Special notification toast for Trinity resonance
  const [specialEffect, setSpecialEffect] = useState<string | null>(null);

  // Sound Mute
  const [isMuted, setIsMuted] = useState<boolean>(false);

  // Simulated CPU Pipeline Registers
  const [cpuPc, setCpuPc] = useState<number>(0x04);
  const [cpuOpcode, setCpuOpcode] = useState<string>('IN.KBD');
  const [cpuAcc, setCpuAcc] = useState<[TritValue, TritValue, TritValue, TritValue]>([1, 1, 1, 1]);
  const [cpuClockCycles, setCpuClockCycles] = useState<number>(0);

  // ASM Code drawer open/close
  const [showAsmDrawer, setShowAsmDrawer] = useState<boolean>(false);
  const [copiedAsm, setCopiedAsm] = useState<boolean>(false);

  // High Score in local storage
  const [highScore, setHighScore] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('taixuan_tetris_highscore');
      return saved ? parseInt(saved, 10) : 0;
    } catch {
      return 0;
    }
  });

  const timerRef = useRef<number | null>(null);

  // Current Tai Xuan Head calculated from Score
  const currentHeadIndex = ((score % 81) || 0) + 1;
  const currentHead = TAI_XUAN_HEADS[currentHeadIndex - 1] || TAI_XUAN_HEADS[0];

  // Helper: check collision
  const checkCollision = useCallback(
    (
      matrix: number[][],
      pos: { x: number; y: number },
      currentGrid: Array<Array<TritValue | null>>
    ): boolean => {
      for (let r = 0; r < matrix.length; r++) {
        for (let c = 0; c < matrix[r].length; c++) {
          if (matrix[r][c] !== 0) {
            const nextX = pos.x + c;
            const nextY = pos.y + r;

            // Out of horizontal or bottom bounds
            if (nextX < 0 || nextX >= BOARD_WIDTH || nextY >= BOARD_HEIGHT) {
              return true;
            }

            // Cell already occupied
            if (nextY >= 0 && currentGrid[nextY][nextX] !== null) {
              return true;
            }
          }
        }
      }
      return false;
    },
    []
  );

  // Rotate matrix 90 degrees clockwise
  const rotateMatrix = (matrix: number[][]): number[][] => {
    const rows = matrix.length;
    const cols = matrix[0].length;
    const rotated: number[][] = [];
    for (let c = 0; c < cols; c++) {
      const newRow: number[] = [];
      for (let r = rows - 1; r >= 0; r--) {
        newRow.push(matrix[r][c]);
      }
      rotated.push(newRow);
    }
    return rotated;
  };

  // Spawn new piece
  const spawnPiece = useCallback(
    (chosenPieceIndex?: number) => {
      const idx = chosenPieceIndex ?? nextPieceIndex;
      const piece = TAI_XUAN_PIECES[idx % TAI_XUAN_PIECES.length];
      const startX = Math.floor((BOARD_WIDTH - piece.matrix[0].length) / 2);
      const startY = 0;

      // Pick next piece randomly
      const nextIdx = Math.floor(Math.random() * TAI_XUAN_PIECES.length);
      setNextPieceIndex(nextIdx);

      setCurrentPiece(piece);
      setCurrentMatrix(piece.matrix);
      setCurrentTritPattern(piece.tritPattern);
      setPiecePos({ x: startX, y: startY });
      setCanHold(true);

      // Check immediate collision on spawn -> Game Over
      if (checkCollision(piece.matrix, { x: startX, y: startY }, grid)) {
        setIsGameOver(true);
        setIsPlaying(false);
        audioSynth.playGameOver();
      }
    },
    [nextPieceIndex, checkCollision, grid]
  );

  // Start / Restart Game
  const startNewGame = () => {
    const emptyGrid = Array.from({ length: BOARD_HEIGHT }, () =>
      new Array(BOARD_WIDTH).fill(null)
    );
    setGrid(emptyGrid);
    setScore(0);
    setLinesCleared(0);
    setLevel(1);
    setTrinityCombos(0);
    setIsGameOver(false);
    setIsPaused(false);
    setIsPlaying(true);
    setHoldPiece(null);
    setSpecialEffect(null);
    setCpuPc(0x04);
    setCpuOpcode('IN.KBD');
    setCpuAcc([1, 1, 1, 1]);
    setCpuClockCycles(0);

    const firstIdx = Math.floor(Math.random() * TAI_XUAN_PIECES.length);
    const nextIdx = Math.floor(Math.random() * TAI_XUAN_PIECES.length);
    setNextPieceIndex(nextIdx);

    const piece = TAI_XUAN_PIECES[firstIdx];
    setCurrentPiece(piece);
    setCurrentMatrix(piece.matrix);
    setCurrentTritPattern(piece.tritPattern);
    setPiecePos({ x: Math.floor((BOARD_WIDTH - piece.matrix[0].length) / 2), y: 0 });
    setCanHold(true);
  };

  // Lock active piece onto grid and perform line clear analysis
  const lockPieceAndClear = useCallback(() => {
    audioSynth.playDrop();

    // 1. Stamp current piece onto grid
    const newGrid = grid.map((row) => [...row]);
    let tritIdx = 0;

    for (let r = 0; r < currentMatrix.length; r++) {
      for (let c = 0; c < currentMatrix[r].length; c++) {
        if (currentMatrix[r][c] !== 0) {
          const gx = piecePos.x + c;
          const gy = piecePos.y + r;
          if (gy >= 0 && gy < BOARD_HEIGHT && gx >= 0 && gx < BOARD_WIDTH) {
            const val = currentTritPattern[tritIdx % currentTritPattern.length];
            newGrid[gy][gx] = val;
            tritIdx++;
          }
        }
      }
    }

    // 2. Scan for line clears:
    // Regular Full Lines + Tai Xuan Trinity Harmonic Resonances
    let rowsToClear: number[] = [];
    let trinityDetected = false;
    let monochromaticCount = 0;

    for (let r = 0; r < BOARD_HEIGHT; r++) {
      const row = newGrid[r];
      const isFull = row.every((cell) => cell !== null);

      if (isFull) {
        rowsToClear.push(r);

        // Check if row is Monochromatic (all 天, all 地, or all 人)
        const firstVal = row[0];
        if (row.every((cell) => cell === firstVal)) {
          monochromaticCount++;
        }

        // Check Trinity Resonance: does row contain adjacent {天, 地, 人}?
        for (let c = 0; c <= BOARD_WIDTH - 3; c++) {
          const trio = [row[c], row[c + 1], row[c + 2]];
          const hasTian = trio.includes(2);
          const hasDi = trio.includes(1);
          const hasRen = trio.includes(0);
          if (hasTian && hasDi && hasRen) {
            trinityDetected = true;
          }
        }
      }
    }

    // 3. Calculate score & trigger effects
    if (rowsToClear.length > 0) {
      let earnedScore = rowsToClear.length * 100 * level;

      if (trinityDetected) {
        earnedScore += 300 * level;
        setTrinityCombos((prev) => prev + 1);
        setSpecialEffect('🌟 三才同契！天地人共融消除 (+300)');
        audioSynth.playTrinityHarmonic();
        confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } });
      } else {
        audioSynth.playLineClear();
      }

      if (monochromaticCount > 0) {
        earnedScore *= 3;
        setSpecialEffect(`✨ 純一玄化！${monochromaticCount} 行同氣連枝 (3x 暴擊)`);
        confetti({ particleCount: 80, spread: 80 });
      }

      // Update state
      const newScore = score + earnedScore;
      const newLines = linesCleared + rowsToClear.length;
      const newLevel = Math.min(9, Math.floor(newLines / 2) + 1);

      setScore(newScore);
      setLinesCleared(newLines);
      setLevel(newLevel);

      if (newScore > highScore) {
        setHighScore(newScore);
        try {
          localStorage.setItem('taixuan_tetris_highscore', newScore.toString());
        } catch {}
      }

      // Update CPU Accumulator
      const newAcc = standardIntToFourTrits(newScore % 81);
      setCpuAcc(newAcc);
      setCpuPc(0x28);
      setCpuOpcode('SCAN_TRINITY');

      // Clear the rows and shift down
      const remainingRows = newGrid.filter((_, idx) => !rowsToClear.includes(idx));
      const blankRowsNeeded = BOARD_HEIGHT - remainingRows.length;
      const blankRows = Array.from({ length: blankRowsNeeded }, () =>
        new Array(BOARD_WIDTH).fill(null)
      );
      setGrid([...blankRows, ...remainingRows]);
    } else {
      setGrid(newGrid);
      setCpuPc(0x1C);
      setCpuOpcode('OUT.VRAM');
    }

    // Spawn next piece
    spawnPiece();
  }, [
    currentMatrix,
    currentTritPattern,
    piecePos,
    grid,
    level,
    score,
    linesCleared,
    highScore,
    spawnPiece,
  ]);

  // Movement Functions
  const moveLeft = useCallback(() => {
    if (!isPlaying || isPaused || isGameOver) return;
    const nextPos = { ...piecePos, x: piecePos.x - 1 };
    if (!checkCollision(currentMatrix, nextPos, grid)) {
      setPiecePos(nextPos);
      audioSynth.playMove();
      setCpuPc(0x08);
      setCpuOpcode('MOV.LEFT');
      setCpuClockCycles((c) => c + 1);
    }
  }, [isPlaying, isPaused, isGameOver, piecePos, currentMatrix, grid, checkCollision]);

  const moveRight = useCallback(() => {
    if (!isPlaying || isPaused || isGameOver) return;
    const nextPos = { ...piecePos, x: piecePos.x + 1 };
    if (!checkCollision(currentMatrix, nextPos, grid)) {
      setPiecePos(nextPos);
      audioSynth.playMove();
      setCpuPc(0x0C);
      setCpuOpcode('MOV.RIGHT');
      setCpuClockCycles((c) => c + 1);
    }
  }, [isPlaying, isPaused, isGameOver, piecePos, currentMatrix, grid, checkCollision]);

  const moveDown = useCallback(() => {
    if (!isPlaying || isPaused || isGameOver) return;
    const nextPos = { ...piecePos, y: piecePos.y + 1 };
    if (!checkCollision(currentMatrix, nextPos, grid)) {
      setPiecePos(nextPos);
      setCpuPc(0x12);
      setCpuOpcode('ADD.GRAV');
      setCpuClockCycles((c) => c + 1);
    } else {
      // Collided with floor or blocks -> lock
      lockPieceAndClear();
    }
  }, [isPlaying, isPaused, isGameOver, piecePos, currentMatrix, grid, checkCollision, lockPieceAndClear]);

  const rotate = useCallback(() => {
    if (!isPlaying || isPaused || isGameOver) return;
    const rotated = rotateMatrix(currentMatrix);
    // Simple wall kick attempt: try center, then left 1, then right 1
    let kickPos = { ...piecePos };
    if (checkCollision(rotated, kickPos, grid)) {
      kickPos = { ...piecePos, x: piecePos.x - 1 };
      if (checkCollision(rotated, kickPos, grid)) {
        kickPos = { ...piecePos, x: piecePos.x + 1 };
        if (checkCollision(rotated, kickPos, grid)) {
          return; // Can't rotate
        }
      }
    }
    setCurrentMatrix(rotated);
    setPiecePos(kickPos);
    audioSynth.playRotate();
    setCpuPc(0x16);
    setCpuOpcode('CYCLE.ROT');
    setCpuClockCycles((c) => c + 1);
  }, [isPlaying, isPaused, isGameOver, currentMatrix, piecePos, grid, checkCollision]);

  const hardDrop = useCallback(() => {
    if (!isPlaying || isPaused || isGameOver) return;
    let curY = piecePos.y;
    while (!checkCollision(currentMatrix, { x: piecePos.x, y: curY + 1 }, grid)) {
      curY++;
    }
    setPiecePos({ x: piecePos.x, y: curY });
    setCpuClockCycles((c) => c + (curY - piecePos.y) * 2);
    // Directly lock
    setTimeout(() => {
      lockPieceAndClear();
    }, 10);
  }, [isPlaying, isPaused, isGameOver, piecePos, currentMatrix, grid, checkCollision, lockPieceAndClear]);

  const handleHold = useCallback(() => {
    if (!isPlaying || isPaused || isGameOver || !canHold) return;
    audioSynth.playRotate();
    if (holdPiece === null) {
      setHoldPiece(currentPiece);
      spawnPiece();
    } else {
      const prevHold = holdPiece;
      setHoldPiece(currentPiece);
      setCurrentPiece(prevHold);
      setCurrentMatrix(prevHold.matrix);
      setCurrentTritPattern(prevHold.tritPattern);
      setPiecePos({ x: Math.floor((BOARD_WIDTH - prevHold.matrix[0].length) / 2), y: 0 });
    }
    setCanHold(false);
    setCpuPc(0x22);
    setCpuOpcode('XCHG.HOLD');
  }, [isPlaying, isPaused, isGameOver, canHold, holdPiece, currentPiece, spawnPiece]);

  // Keyboard Event Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Avoid stealing input if focused on an input/textarea
      const activeTag = document.activeElement?.tagName.toLowerCase();
      if (activeTag === 'input' || activeTag === 'textarea') return;

      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space'].includes(e.code)) {
        e.preventDefault();
      }

      if (e.code === 'ArrowLeft' || e.code === 'KeyA') moveLeft();
      if (e.code === 'ArrowRight' || e.code === 'KeyD') moveRight();
      if (e.code === 'ArrowUp' || e.code === 'KeyW') rotate();
      if (e.code === 'ArrowDown' || e.code === 'KeyS') moveDown();
      if (e.code === 'Space') hardDrop();
      if (e.code === 'KeyC') handleHold();
      if (e.code === 'KeyP') setIsPaused((p) => !p);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [moveLeft, moveRight, rotate, moveDown, hardDrop, handleHold]);

  // Main Gravity Game Loop Ticker
  useEffect(() => {
    if (!isPlaying || isPaused || isGameOver) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    // Speed formula: starts at 750ms, decreases by 55ms per level down to ~250ms
    const dropIntervalMs = Math.max(200, 750 - (level - 1) * 60);

    timerRef.current = window.setInterval(() => {
      moveDown();
    }, dropIntervalMs);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, isPaused, isGameOver, level, moveDown]);

  // Clear special effect toast after 2.5s
  useEffect(() => {
    if (specialEffect) {
      const t = setTimeout(() => setSpecialEffect(null), 2500);
      return () => clearTimeout(t);
    }
  }, [specialEffect]);

  // Copy ASM code
  const handleCopyAsm = () => {
    navigator.clipboard.writeText(TETRIS_ASM_CODE);
    setCopiedAsm(true);
    setTimeout(() => setCopiedAsm(false), 2000);
  };

  // Compute ghost piece position for hard drop visual guide
  const ghostY = (() => {
    if (!isPlaying || isPaused || isGameOver) return piecePos.y;
    let gy = piecePos.y;
    while (!checkCollision(currentMatrix, { x: piecePos.x, y: gy + 1 }, grid)) {
      gy++;
    }
    return gy;
  })();

  // Render Cell helper
  const renderCellContent = (
    val: TritValue | null,
    isGhost: boolean = false,
    previewTrit?: TritValue
  ) => {
    if (val === null && !isGhost) {
      return (
        <div className="w-full h-full bg-slate-900/60 dark:bg-slate-950/80 border border-slate-800/40 dark:border-slate-800/60 rounded-xs flex items-center justify-center">
          <div className="w-1 h-1 rounded-full bg-slate-800 dark:bg-slate-800/80" />
        </div>
      );
    }

    if (isGhost) {
      const targetTrit = previewTrit ?? 1;
      return (
        <div className="w-full h-full border border-dashed border-sky-400/50 bg-sky-500/10 rounded-xs flex items-center justify-center">
          <span className="text-[10px] font-serif text-sky-400 opacity-60">
            {targetTrit === 2 ? '⚊' : targetTrit === 1 ? '⚋' : '𝌀'}
          </span>
        </div>
      );
    }

    // Filled Trit
    let bgStyle = '';
    let textColor = '';
    let glyph = '⚋';

    if (val === 2) {
      // 天 (Gold / Solar / +1)
      bgStyle = 'bg-gradient-to-br from-amber-400 to-amber-600 shadow-amber-500/30';
      textColor = 'text-amber-950';
      glyph = '⚊';
    } else if (val === 1) {
      // 地 (Jade / Emerald / 0)
      bgStyle = 'bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-emerald-500/30';
      textColor = 'text-emerald-950';
      glyph = '⚋';
    } else {
      // 人 (Vermilion / Rose / -1)
      bgStyle = 'bg-gradient-to-br from-rose-400 to-rose-600 shadow-rose-500/30';
      textColor = 'text-rose-950';
      glyph = '𝌀';
    }

    return (
      <div
        className={`w-full h-full rounded-xs shadow-xs flex flex-col items-center justify-center transition-all ${bgStyle}`}
      >
        <span className={`text-[12px] font-bold font-serif leading-none select-none ${textColor}`}>
          {glyph}
        </span>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Capstone Header Strip */}
      <div className="bg-gradient-to-r from-amber-500/10 via-purple-500/10 to-sky-500/10 border border-amber-300/40 dark:border-amber-800/40 rounded-2xl p-5 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono-code font-bold bg-amber-500 text-white shadow-2xs">
                STAGE A · CROWN CAPSTONE
              </span>
              <span className="text-xs font-mono-code text-slate-500">
                NAND TO TETRIS 終極結業之作
              </span>
            </div>
            <h3 className="text-xl sm:text-2xl font-bold font-serif-tc text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Gamepad2 className="w-6 h-6 text-amber-500" />
              <span>太玄三象方塊 (Tai Xuan Ternary Tetris)</span>
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed max-w-2xl">
              自底層 T-NAND 門出發，逐層完成基本邏輯門、全加器、4-Trit ALU、主寄存器、81首指令譯碼與 9×9 顯存架構，
              此處即為完整的「太玄微機遊戲運行期」！融入《太玄經》天地人三進制哲學，解鎖「三才同契」與「純一玄化」獨創消行機制。
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              type="button"
              onClick={() => {
                const nextMute = !isMuted;
                setIsMuted(nextMute);
                audioSynth.muted = nextMute;
              }}
              className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shadow-2xs flex items-center gap-1.5 text-xs font-medium"
              title={isMuted ? '開啟三音合成器音效' : '靜音'}
            >
              {isMuted ? <VolumeX className="w-4 h-4 text-slate-400" /> : <Volume2 className="w-4 h-4 text-amber-500" />}
              <span>{isMuted ? '靜音' : '音效開啟'}</span>
            </button>

            <button
              type="button"
              onClick={() => setShowAsmDrawer(!showAsmDrawer)}
              className="px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white transition-colors shadow-xs flex items-center gap-1.5 text-xs font-semibold"
            >
              <Code className="w-4 h-4" />
              <span>{showAsmDrawer ? '隱藏彙編源碼' : '查看遊戲 HDL/ASM'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Assembly Source Drawer (Expandable) */}
      {showAsmDrawer && (
        <div className="bg-slate-900 text-slate-200 rounded-2xl p-5 border border-purple-500/30 shadow-lg space-y-3 font-mono-code text-xs animate-in fade-in duration-150">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-purple-500 animate-pulse" />
              <span className="font-bold text-purple-400">TETRIS.TXA — 太玄虛擬機彙編程序核心</span>
              <span className="text-[11px] text-slate-500">(運行於 81 首 Micro-Computer 內核)</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopyAsm}
                className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] flex items-center gap-1 transition-colors"
              >
                {copiedAsm ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedAsm ? '已複製' : '複製代碼'}</span>
              </button>
              {onOpenAssembler && (
                <button
                  type="button"
                  onClick={onOpenAssembler}
                  className="px-2.5 py-1 rounded bg-purple-900/60 hover:bg-purple-800 text-purple-300 text-[11px] flex items-center gap-1 transition-colors"
                >
                  <span>跳轉至 IDE 燒錄</span>
                </button>
              )}
            </div>
          </div>
          <pre className="max-h-56 overflow-y-auto text-[11px] leading-relaxed text-slate-300 bg-slate-950 p-3 rounded-xl border border-slate-800 select-text">
            {TETRIS_ASM_CODE}
          </pre>
        </div>
      )}

      {/* Main Game Arena */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Panel: Statistics & Hardware Telemetry (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          {/* Score & Shou Card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <span className="text-xs font-mono-code text-slate-500">SCORE & PROGRESS</span>
              <div className="flex items-center gap-1 text-xs font-bold text-amber-500">
                <Trophy className="w-4 h-4" />
                <span>最高: {highScore}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
                <span className="text-[11px] text-slate-500 block">當前積分 (Score)</span>
                <span className="text-2xl font-bold font-mono-code text-slate-900 dark:text-slate-100">
                  {score}
                </span>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
                <span className="text-[11px] text-slate-500 block">消行數 (Lines)</span>
                <span className="text-2xl font-bold font-mono-code text-sky-600 dark:text-sky-400">
                  {linesCleared}
                </span>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
                <span className="text-[11px] text-slate-500 block">重力天階 (Level)</span>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-xl font-bold font-mono-code text-amber-500">
                    第 {level} 天
                  </span>
                  <span className="text-[10px] text-slate-400">/ 9</span>
                </div>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
                <span className="text-[11px] text-slate-500 block">三才共融 (Trinity)</span>
                <span className="text-xl font-bold font-mono-code text-purple-600 dark:text-purple-400">
                  {trinityCombos} 次
                </span>
              </div>
            </div>

            {/* Current Tai Xuan Head Resonance */}
            <div className="p-3.5 bg-gradient-to-r from-amber-500/10 via-sky-500/10 to-transparent rounded-xl border border-amber-500/20 flex items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-mono-code text-amber-600 dark:text-amber-400 font-bold">
                    積分對應首象:
                  </span>
                  <span className="text-sm font-bold font-serif-tc text-slate-900 dark:text-slate-100">
                    第 {currentHead.index} 首【{currentHead.name}】
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  卦序曆日：{currentHead.solarDate} · 卦義：{currentHead.meaning}
                </p>
              </div>

              <div className="text-3xl select-none font-serif text-amber-500 font-bold">
                {currentHead.unicodeChar}
              </div>
            </div>
          </div>

          {/* Micro-Computer CPU Pipeline Realtime Monitor */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-3 font-mono-code text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-1.5 text-sky-600 dark:text-sky-400 font-bold">
                <Cpu className="w-4 h-4" />
                <span>CPU 流水線實時遙測</span>
              </div>
              <span className="text-[10px] text-slate-400">
                時鐘數: #{cpuClockCycles}
              </span>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-800/60 p-2 rounded-lg">
                <span className="text-slate-500">PC (程序計數器):</span>
                <span className="font-bold text-sky-600 dark:text-sky-400">
                  @0x{cpuPc.toString(16).toUpperCase().padStart(2, '0')}
                </span>
              </div>

              <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-800/60 p-2 rounded-lg">
                <span className="text-slate-500">IR (指令譯碼):</span>
                <span className="font-bold text-purple-600 dark:text-purple-400">
                  {cpuOpcode}
                </span>
              </div>

              <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-800/60 p-2 rounded-lg">
                <span className="text-slate-500">ACC (4-Trit 累加器):</span>
                <div className="flex items-center gap-1">
                  {cpuAcc.map((t, i) => (
                    <TritBadge key={i} val={t} mode={mode} size="sm" />
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-800/60 p-2 rounded-lg">
                <span className="text-slate-500">VRAM 坐標映射:</span>
                <span className="text-slate-800 dark:text-slate-200 font-semibold">
                  (X:{piecePos.x}, Y:{Math.max(0, piecePos.y - (BOARD_HEIGHT - VISIBLE_HEIGHT))}) → @0x
                  {Math.max(0, (piecePos.y - (BOARD_HEIGHT - VISIBLE_HEIGHT)) * 9 + piecePos.x)
                    .toString(16)
                    .toUpperCase()
                    .padStart(2, '0')}
                </span>
              </div>
            </div>
          </div>

          {/* Hold & Next Pieces Previews */}
          <div className="grid grid-cols-2 gap-3">
            {/* Hold Slot */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs text-center space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-500">存卦 (HOLD - [C])</span>
                <span className="text-[10px] text-slate-400">{canHold ? '就緒' : '鎖定'}</span>
              </div>
              <div className="h-16 flex items-center justify-center bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-100 dark:border-slate-800">
                {holdPiece ? (
                  <div className="grid gap-0.5" style={{ gridTemplateColumns: `repeat(${holdPiece.matrix[0].length}, 14px)` }}>
                    {holdPiece.matrix.map((row, r) =>
                      row.map((cell, c) => (
                        <div key={`${r}-${c}`} className="w-3.5 h-3.5">
                          {cell ? renderCellContent(holdPiece.tritPattern[0]) : null}
                        </div>
                      ))
                    )}
                  </div>
                ) : (
                  <span className="text-xs text-slate-400">無</span>
                )}
              </div>
              <div className="text-[10px] text-slate-400 truncate">
                {holdPiece ? holdPiece.name : '按 C 鍵暫存'}
              </div>
            </div>

            {/* Next Piece Slot */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs text-center space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-500">次象 (NEXT)</span>
                <span className="text-[10px] text-amber-500 font-bold">隨機</span>
              </div>
              <div className="h-16 flex items-center justify-center bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-100 dark:border-slate-800">
                {(() => {
                  const np = TAI_XUAN_PIECES[nextPieceIndex % TAI_XUAN_PIECES.length];
                  return (
                    <div className="grid gap-0.5" style={{ gridTemplateColumns: `repeat(${np.matrix[0].length}, 14px)` }}>
                      {np.matrix.map((row, r) =>
                        row.map((cell, c) => (
                          <div key={`${r}-${c}`} className="w-3.5 h-3.5">
                            {cell ? renderCellContent(np.tritPattern[0]) : null}
                          </div>
                        ))
                      )}
                    </div>
                  );
                })()}
              </div>
              <div className="text-[10px] text-slate-400 truncate">
                {TAI_XUAN_PIECES[nextPieceIndex % TAI_XUAN_PIECES.length].name}
              </div>
            </div>
          </div>
        </div>

        {/* Center Panel: 9x9 VRAM Display Grid (5 cols) */}
        <div className="lg:col-span-5 flex flex-col items-center">
          <div className="bg-slate-950 p-4 sm:p-5 rounded-2xl border-4 border-slate-800 shadow-2xl relative w-full max-w-[380px]">
            {/* Screen Top Frame Header */}
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800 text-[11px] font-mono-code text-slate-400">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-emerald-400 font-bold">TAIXUAN VRAM 9x9</span>
              </div>
              <span>81-TRITS [0..80]</span>
            </div>

            {/* Special Resonance Toast Overlay */}
            {specialEffect && (
              <div className="absolute top-16 left-6 right-6 z-30 p-2.5 bg-gradient-to-r from-amber-500/90 to-purple-600/90 text-white rounded-xl shadow-xl text-center text-xs font-bold font-serif-tc animate-bounce">
                {specialEffect}
              </div>
            )}

            {/* 9x9 Visible Matrix (Only display the lower 9 rows of the 12-row board) */}
            <div className="grid grid-cols-9 gap-1 bg-black p-2.5 rounded-xl border border-slate-800/80 aspect-square">
              {Array.from({ length: VISIBLE_HEIGHT }).map((_, vRow) => {
                const actualRow = vRow + (BOARD_HEIGHT - VISIBLE_HEIGHT);
                return Array.from({ length: BOARD_WIDTH }).map((_, col) => {
                  // Check if locked in grid
                  let cellVal = grid[actualRow][col];

                  // Check if covered by active piece
                  let isCurrentPiece = false;
                  const pr = actualRow - piecePos.y;
                  const pc = col - piecePos.x;
                  if (
                    pr >= 0 &&
                    pr < currentMatrix.length &&
                    pc >= 0 &&
                    pc < currentMatrix[pr].length &&
                    currentMatrix[pr][pc] !== 0
                  ) {
                    isCurrentPiece = true;
                    // Count index
                    let tCount = 0;
                    for (let r = 0; r < currentMatrix.length; r++) {
                      for (let c = 0; c < currentMatrix[r].length; c++) {
                        if (r === pr && c === pc) {
                          cellVal = currentTritPattern[tCount % currentTritPattern.length];
                        }
                        if (currentMatrix[r][c] !== 0) tCount++;
                      }
                    }
                  }

                  // Check if covered by ghost piece
                  let isGhost = false;
                  const gr = actualRow - ghostY;
                  if (
                    !isCurrentPiece &&
                    cellVal === null &&
                    gr >= 0 &&
                    gr < currentMatrix.length &&
                    pc >= 0 &&
                    pc < currentMatrix[gr].length &&
                    currentMatrix[gr][pc] !== 0
                  ) {
                    isGhost = true;
                  }

                  return (
                    <div
                      key={`${actualRow}-${col}`}
                      className="w-full aspect-square relative"
                    >
                      {renderCellContent(cellVal, isGhost, currentTritPattern[0])}
                    </div>
                  );
                });
              })}
            </div>

            {/* Overlay if Not Playing, Paused or Game Over */}
            {(!isPlaying || isPaused || isGameOver) && (
              <div className="absolute inset-0 z-20 bg-slate-950/85 backdrop-blur-xs rounded-2xl flex flex-col items-center justify-center p-6 text-center space-y-4">
                {isGameOver ? (
                  <>
                    <div className="w-14 h-14 rounded-2xl bg-rose-500/20 text-rose-500 border border-rose-500/40 flex items-center justify-center text-2xl font-serif">
                      𝌀
                    </div>
                    <div>
                      <h4 className="text-xl font-bold font-serif-tc text-rose-400">
                        氣數已終 · 陰陽入寂
                      </h4>
                      <p className="text-xs text-slate-400 mt-1">
                        太玄歷轉終局！最終得象：第 {currentHead.index} 首【{currentHead.name}】
                      </p>
                    </div>
                    <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 text-xs font-mono-code space-y-1 w-full max-w-[200px]">
                      <div className="flex justify-between text-slate-400">
                        <span>最終積分:</span>
                        <span className="text-white font-bold">{score}</span>
                      </div>
                      <div className="flex justify-between text-slate-400">
                        <span>三才共融:</span>
                        <span className="text-purple-400 font-bold">{trinityCombos} 次</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={startNewGame}
                      className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-lg transition-transform active:scale-95 flex items-center gap-2"
                    >
                      <RotateCcw className="w-4 h-4" />
                      <span>重新起卦 (Play Again)</span>
                    </button>
                  </>
                ) : isPaused ? (
                  <>
                    <Pause className="w-12 h-12 text-amber-500 animate-pulse" />
                    <div>
                      <h4 className="text-lg font-bold font-serif-tc text-white">
                        暫停中 (Paused)
                      </h4>
                      <p className="text-xs text-slate-400 mt-1">按 P 鍵或點擊下方繼續運算</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsPaused(false)}
                      className="px-6 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs shadow-lg transition-transform active:scale-95 flex items-center gap-2"
                    >
                      <Play className="w-4 h-4" />
                      <span>繼續運行</span>
                    </button>
                  </>
                ) : (
                  <>
                    <div className="w-16 h-16 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/30 flex items-center justify-center text-3xl font-serif">
                      𝌆
                    </div>
                    <div>
                      <h4 className="text-xl font-bold font-serif-tc text-white">
                        太玄三象方塊就緒
                      </h4>
                      <p className="text-xs text-slate-400 mt-1.5 leading-relaxed max-w-[240px]">
                        九天四方，首象八十一。點擊開始運行三進制俄羅斯方塊！
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={startNewGame}
                      className="px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs shadow-lg transition-transform active:scale-95 flex items-center gap-2"
                    >
                      <Play className="w-4 h-4 fill-slate-950" />
                      <span>開啟三象方塊 (Start Game)</span>
                    </button>
                  </>
                )}
              </div>
            )}
          </div>

          {/* On-Screen Touch / Mouse Control Pad */}
          <div className="mt-4 p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs w-full max-w-[380px] space-y-2">
            <div className="flex items-center justify-between text-[11px] font-mono-code text-slate-400 px-1">
              <span>CONTROLLER</span>
              <span>鍵盤/觸控雙模</span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={rotate}
                disabled={!isPlaying || isPaused || isGameOver}
                className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-40 transition-colors flex flex-col items-center justify-center gap-1 active:scale-95"
              >
                <ArrowUp className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                <span className="text-[10px] font-medium text-slate-700 dark:text-slate-300">旋轉 [↑/W]</span>
              </button>

              <button
                type="button"
                onClick={hardDrop}
                disabled={!isPlaying || isPaused || isGameOver}
                className="p-3 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 disabled:opacity-40 transition-colors flex flex-col items-center justify-center gap-1 active:scale-95 border border-amber-500/20"
              >
                <Zap className="w-4 h-4" />
                <span className="text-[10px] font-bold">急墜 [空格]</span>
              </button>

              <button
                type="button"
                onClick={handleHold}
                disabled={!isPlaying || isPaused || isGameOver || !canHold}
                className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-40 transition-colors flex flex-col items-center justify-center gap-1 active:scale-95"
              >
                <Layers className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                <span className="text-[10px] font-medium text-slate-700 dark:text-slate-300">存卦 [C]</span>
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={moveLeft}
                disabled={!isPlaying || isPaused || isGameOver}
                className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-40 transition-colors flex flex-col items-center justify-center gap-1 active:scale-95"
              >
                <ArrowLeft className="w-4 h-4 text-slate-700 dark:text-slate-300" />
                <span className="text-[10px] font-medium text-slate-700 dark:text-slate-300">左移 [←/A]</span>
              </button>

              <button
                type="button"
                onClick={moveDown}
                disabled={!isPlaying || isPaused || isGameOver}
                className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-40 transition-colors flex flex-col items-center justify-center gap-1 active:scale-95"
              >
                <ArrowDown className="w-4 h-4 text-slate-700 dark:text-slate-300" />
                <span className="text-[10px] font-medium text-slate-700 dark:text-slate-300">下移 [↓/S]</span>
              </button>

              <button
                type="button"
                onClick={moveRight}
                disabled={!isPlaying || isPaused || isGameOver}
                className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-40 transition-colors flex flex-col items-center justify-center gap-1 active:scale-95"
              >
                <ArrowRight className="w-4 h-4 text-slate-700 dark:text-slate-300" />
                <span className="text-[10px] font-medium text-slate-700 dark:text-slate-300">右移 [→/D]</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Panel: Game Rules & Trinity Elimination Encyclopedia (3 cols) */}
        <div className="lg:col-span-3 space-y-4">
          {/* Rules & Elimination Card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex items-center gap-2 text-xs font-mono-code text-slate-500 pb-2 border-b border-slate-100 dark:border-slate-800">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>太玄三進制消除律 (RULES)</span>
            </div>

            <div className="space-y-3 text-xs leading-relaxed">
              <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700/60 space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-slate-100">
                  <span className="text-amber-500">1.</span>
                  <span>全行填滿消行 (Row Clear)</span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  當 9 格顯存行被任意三值爻塊完全填滿時消除，基礎獎勵 100 分。
                </p>
              </div>

              <div className="p-3 bg-purple-50 dark:bg-purple-950/30 rounded-xl border border-purple-200 dark:border-purple-800/50 space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-purple-700 dark:text-purple-300">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>2. 三才同契大消除 (Trinity)</span>
                </div>
                <p className="text-[11px] text-purple-600 dark:text-purple-400">
                  若消除行中存在相鄰連續的 <strong>{`{天, 地, 人}`}</strong> 三色爻塊，觸發太玄共振，額外獎勵 <strong>+300 分</strong>！
                </p>
              </div>

              <div className="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-xl border border-amber-200 dark:border-amber-800/50 space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-amber-700 dark:text-amber-300">
                  <Flame className="w-3.5 h-3.5" />
                  <span>3. 純一玄化暴擊 (Monochrome)</span>
                </div>
                <p className="text-[11px] text-amber-600 dark:text-amber-400">
                  若整行 9 格均為同一種爻色（如全天、全地或全人），觸發 <strong>3 倍暴擊加成</strong>！
                </p>
              </div>
            </div>
          </div>

          {/* Trinity Legend Card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-3 text-xs">
            <span className="text-xs font-mono-code text-slate-500 block pb-2 border-b border-slate-100 dark:border-slate-800">
              三才本原圖說
            </span>

            <div className="space-y-2">
              <div className="flex items-center justify-between p-2 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-amber-500 shadow-xs" />
                  <span className="font-bold text-amber-900 dark:text-amber-200 font-serif">天 ⚊</span>
                </div>
                <span className="text-[11px] font-mono-code text-amber-700 dark:text-amber-300">+1 (金光 / 陽)</span>
              </div>

              <div className="flex items-center justify-between p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-emerald-500 shadow-xs" />
                  <span className="font-bold text-emerald-900 dark:text-emerald-200 font-serif">地 ⚋</span>
                </div>
                <span className="text-[11px] font-mono-code text-emerald-700 dark:text-emerald-300">0 (翡翠 / 和)</span>
              </div>

              <div className="flex items-center justify-between p-2 rounded-lg bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-rose-500 shadow-xs" />
                  <span className="font-bold text-rose-900 dark:text-rose-200 font-serif">人 𝌀</span>
                </div>
                <span className="text-[11px] font-mono-code text-rose-700 dark:text-rose-300">-1 (赤朱 / 陰)</span>
              </div>
            </div>

            {/* Quick Link to Genealogy */}
            {onOpenGenealogy && (
              <div className="pt-2">
                <button
                  type="button"
                  onClick={onOpenGenealogy}
                  className="w-full py-2 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
                >
                  <span>𝌆 查看 81 首卦象譜系</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
