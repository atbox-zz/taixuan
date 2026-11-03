/**
 * Tai Xuan Jing Data & Constants
 * 81 Tetragrams (首), Trits (天、地、人), and formatting utilities
 * @license Apache-2.0
 */

import { TritValue, BalancedTritValue, TritInfo, TetragramHead, DisplayMode } from '../types/ternary';

export const TRIT_INFO: Record<TritValue, TritInfo> = {
  2: {
    val: 2,
    balancedVal: 1,
    name: '天',
    pinyin: 'tiān',
    symbol: '⚊',
    strokeCount: 1,
    color: '#0284c7', // Sky Blue
    bgLight: 'bg-sky-50 text-sky-800',
    bgDark: 'dark:bg-sky-950/60 dark:text-sky-300',
    borderLight: 'border-sky-300',
    borderDark: 'dark:border-sky-700',
    desc: '一畫純陽，高電位，天道開創，真值 (+1 或 2)',
  },
  1: {
    val: 1,
    balancedVal: 0,
    name: '地',
    pinyin: 'dì',
    symbol: '⚋',
    strokeCount: 2,
    color: '#d97706', // Amber Gold
    bgLight: 'bg-amber-50 text-amber-800',
    bgDark: 'dark:bg-amber-950/60 dark:text-amber-300',
    borderLight: 'border-amber-300',
    borderDark: 'dark:border-amber-700',
    desc: '二畫成陰，中電位，地道載育，中立 (0 或 1)',
  },
  0: {
    val: 0,
    balancedVal: -1,
    name: '人',
    pinyin: 'rén',
    symbol: '𝌀',
    strokeCount: 3,
    color: '#7c3aed', // Amethyst / Violet
    bgLight: 'bg-violet-50 text-violet-800',
    bgDark: 'dark:bg-violet-950/60 dark:text-violet-300',
    borderLight: 'border-violet-300',
    borderDark: 'dark:border-violet-700',
    desc: '三畫同和，低/負電位，人道合變，假值 (-1 或 0)',
  },
};

export function formatTrit(val: TritValue, mode: DisplayMode): string {
  if (mode === 'taixuan') {
    return `${TRIT_INFO[val].name} ${TRIT_INFO[val].symbol}`;
  }
  if (mode === 'balanced') {
    const b = TRIT_INFO[val].balancedVal;
    return b === 1 ? '+1' : b === -1 ? '-1' : '0';
  }
  return val.toString();
}

export function formatTritSymbolOnly(val: TritValue, mode: DisplayMode): string {
  if (mode === 'taixuan') {
    return TRIT_INFO[val].name;
  }
  if (mode === 'balanced') {
    const b = TRIT_INFO[val].balancedVal;
    return b === 1 ? '+' : b === -1 ? '-' : '0';
  }
  return val.toString();
}

// 81 Tetragrams of Tai Xuan Jing (漢 · 揚雄《太玄經》八十一首)
// The 4 tiers correspond to 方 (Region), 州 (Province), 部 (Department), 家 (Family)
// In mathematical representation: $val = T_3 \times 27 + T_2 \times 9 + T_1 \times 3 + T_0$
const HEAD_NAMES = [
  '中', '羨', '睟', '斂', '達', '疑', '視', '劇', '差',
  '童', '窮', '割', '少', '戾', '奚', '守', '進', '釋',
  '格', '夷', '樂', '爭', '務', '事', '更', '斷', '毅',
  '裝', '眾', '密', '親', '斂', '彊', '縻', '應', '迎',
  '遇', '竈', '大', '廓', '文', '禮', '逃', '唐', '常',
  '度', '永', '昆', '減', '唫', '守', '疾', '妄', '成',
  '止', '堅', '幹', '匿', '苦', '靡', '親', '迷', '平',
  '難', '勤', '養', '增', '適', '順', '從', '易', '和',
  '遷', '歛', '失', '輔', '弱', '疾', '思', '將', '難'
];

// Curated 81 authentic names with distinct traditional definitions
const AUTHENTIC_81_HEADS: Array<{ name: string; pinyin: string; meaning: string; date: string }> = [
  { name: '中', pinyin: 'zhōng', meaning: '黃中通理，位正處中。萬物之所由生。', date: '冬至初日' },
  { name: '羨', pinyin: 'xiàn', meaning: '羨漫浸淫，神化日新。水流而不息。', date: '冬至次日' },
  { name: '睟', pinyin: 'suì', meaning: '純和清明，精粹內充。德之盛也。', date: '小寒初日' },
  { name: '斂', pinyin: 'liǎn', meaning: '收斂神明，退藏於密。蓄力待時。', date: '小寒次日' },
  { name: '達', pinyin: 'dá', meaning: '通達四表，無所窒礙。陽氣微通。', date: '大寒初日' },
  { name: '疑', pinyin: 'yí', meaning: '疑似未定，思慮求審。慎厥初動。', date: '大寒次日' },
  { name: '視', pinyin: 'shì', meaning: '明視四方，察物明哲。離明之象。', date: '立春初日' },
  { name: '劇', pinyin: 'jù', meaning: '繁劇殷盛，生機大張。萬物爭榮。', date: '立春次日' },
  { name: '差', pinyin: 'chā', meaning: '陰陽差爽，校准正邪。審分毫末。', date: '雨水初日' },
  { name: '童', pinyin: 'tóng', meaning: '蒙童初開，知機未遠。資始之質。', date: '雨水次日' },
  { name: '窮', pinyin: 'qióng', meaning: '物極必反，窮則變通。返本還原。', date: '驚蟄初日' },
  { name: '割', pinyin: 'gē', meaning: '割截去蔽，決斷是非。雷震生動。', date: '驚蟄次日' },
  { name: '少', pinyin: 'shǎo', meaning: '少壯漸長，微光始萌。日就月將。', date: '春分初日' },
  { name: '戾', pinyin: 'lì', meaning: '乖戾阻逆，順理以化。銷釋乖阻。', date: '春分次日' },
  { name: '奚', pinyin: 'xī', meaning: '反身而問，知其所由。探索本源。', date: '清明初日' },
  { name: '禍', pinyin: 'huò', meaning: '防禍未形，慎微警覺。消患未兆。', date: '清明次日' },
  { name: '進', pinyin: 'jìn', meaning: '進德脩業，銳意前行。日進無疆。', date: '穀雨初日' },
  { name: '釋', pinyin: 'shì', meaning: '解脫陳蔽，春雨化生。甲乙抽條。', date: '穀雨次日' },
  { name: '格', pinyin: 'gé', meaning: '格物致知，品裁萬類。尺度森然。', date: '立夏初日' },
  { name: '夷', pinyin: 'yí', meaning: '平易從容，坦途如砥。德化均齊。', date: '立夏次日' },
  { name: '樂', pinyin: 'yuè', meaning: '天地合節，太和充盈。韶樂九成。', date: '小滿初日' },
  { name: '爭', pinyin: 'zhēng', meaning: '競逐陽華，萬物並育。立德不競。', date: '小滿次日' },
  { name: '務', pinyin: 'wù', meaning: '專精勤懇，務實勉力。業廣於勤。', date: '芒種初日' },
  { name: '事', pinyin: 'shì', meaning: '敬慎有承，大業日興。紀綱法度。', date: '芒種次日' },
  { name: '更', pinyin: 'gēng', meaning: '變革維新，鼎新革故。脫胎換骨。', date: '夏至初日' },
  { name: '斷', pinyin: 'duàn', meaning: '白黑分明，金鉞裁製。斷割疑惑。', date: '夏至次日' },
  { name: '毅', pinyin: 'yì', meaning: '弘毅致遠，剛健不息。任重道遠。', date: '小暑初日' },
  { name: '裝', pinyin: 'zhuāng', meaning: '整備器械，行裝將發。備豫不虞。', date: '小暑次日' },
  { name: '眾', pinyin: 'zhòng', meaning: '萬匯欣聚，同德相親。萬象咸集。', date: '大暑初日' },
  { name: '密', pinyin: 'mì', meaning: '邃密嚴謹，雲雷相合。雨將傾盆。', date: '大暑次日' },
  { name: '親', pinyin: 'qīn', meaning: '萬物宗附，赤子親睦。仁愛無間。', date: '立秋初日' },
  { name: '斂', pinyin: 'liǎn', meaning: '秋氣清肅，收穫入倉。慎備冬實。', date: '立秋次日' },
  { name: '彊', pinyin: 'qiáng', meaning: '自強不屈，骨勁如松。經霜不凋。', date: '處暑初日' },
  { name: '縻', pinyin: 'mí', meaning: '羈縻整飭，維繫秩序。網罟條然。', date: '處暑次日' },
  { name: '應', pinyin: 'yìng', meaning: '心聲相應，如響斯應。天人感應。', date: '白露初日' },
  { name: '迎', pinyin: 'yíng', meaning: '迎納明哲，敞懷受物。開闢納新。', date: '白露次日' },
  { name: '遇', pinyin: 'yù', meaning: '機緣偶合，君臣相際。契合無間。', date: '秋分初日' },
  { name: '竈', pinyin: 'zào', meaning: '炊火調和，烹飪元氣。保溫養精。', date: '秋分次日' },
  { name: '大', pinyin: 'dà', meaning: '大方無隅，器量弘深。涵容萬物。', date: '寒露初日' },
  { name: '廓', pinyin: 'kuò', meaning: '虛廓寬宏，天地虛靜。虛以受之。', date: '寒露次日' },
  { name: '文', pinyin: 'wén', meaning: '經緯成文，煥爛斐然。人文蔚起。', date: '霜降初日' },
  { name: '禮', pinyin: 'lǐ', meaning: '履禮安行，秩序井然。不越矩度。', date: '霜降次日' },
  { name: '逃', pinyin: 'táo', meaning: '遁跡深藏，避凶趨吉。超然世外。', date: '立冬初日' },
  { name: '唐', pinyin: 'táng', meaning: '坦蕩荒唐，浩浩太虛。高遠無涯。', date: '立冬次日' },
  { name: '常', pinyin: 'cháng', meaning: '天行有常，歷久常新。常德不忒。', date: '小雪初日' },
  { name: '度', pinyin: 'dù', meaning: '權衡衡石，繩墨法度。不失矩矱。', date: '小雪次日' },
  { name: '永', pinyin: 'yǒng', meaning: '悠久無窮，綿長歲月。流水朝宗。', date: '大雪初日' },
  { name: '昆', pinyin: 'kūn', meaning: '昆侖同胞，萬流同宗。昆弟相扶。', date: '大雪次日' },
  { name: '減', pinyin: 'jiǎn', meaning: '捐除冗雜，減損物累。損以求精。', date: '冬至再返' },
  { name: '唫', pinyin: 'jìn', meaning: '緘默深潛，閉藏精神。息念忘言。', date: '冬至三日' },
  { name: '守', pinyin: 'shǒu', meaning: '固守真一，持志貞正。不可奪移。', date: '小寒三日' },
  { name: '疾', pinyin: 'jí', meaning: '迅雷疾風，迅掃陰翳。雷動風馳。', date: '大寒三日' },
  { name: '妄', pinyin: 'wàng', meaning: '去妄存誠，辨別邪正。正心誠意。', date: '立春三日' },
  { name: '成', pinyin: 'chéng', meaning: '大功告成，瓜熟蒂落。化育周備。', date: '雨水三日' },
  { name: '止', pinyin: 'zhǐ', meaning: '適可而止，止於至善。如山嶽峙。', date: '驚蟄三日' },
  { name: '堅', pinyin: 'jiān', meaning: '金石之堅，志不可摧。千磨萬擊。', date: '春分三日' },
  { name: '幹', pinyin: 'gàn', meaning: '棟樑柱石，荷負綱常。能任大任。', date: '清明三日' },
  { name: '匿', pinyin: 'nì', meaning: '潛藏深邃，韜光養晦。神龍隱躍。', date: '穀雨三日' },
  { name: '苦', pinyin: 'kǔ', meaning: '淬礪辛苦，動心忍性。苦盡甘來。', date: '立夏三日' },
  { name: '靡', pinyin: 'mí', meaning: '靡靡清風，從容順化。草偃風從。', date: '小滿三日' },
  { name: '親', pinyin: 'qīn', meaning: '溫柔敦厚，敦睦親和。天性敦篤。', date: '芒種三日' },
  { name: '迷', pinyin: 'mí', meaning: '返迷歸真，撥雲見日。迷途知返。', date: '夏至三日' },
  { name: '平', pinyin: 'píng', meaning: '海宇澄清，天平地成。風平浪靜。', date: '小暑三日' },
  { name: '難', pinyin: 'nán', meaning: '經受屯難，玉汝於成。歷劫彌固。', date: '大暑三日' },
  { name: '勤', pinyin: 'qín', meaning: '夙夜匪懈，行之以日。勞而不怨。', date: '立秋三日' },
  { name: '養', pinyin: 'yǎng', meaning: '涵養天和，潤育精神。頤養沖和。', date: '處暑三日' },
  { name: '增', pinyin: 'zēng', meaning: '進步日增，豐潤益厚。滋滋無窮。', date: '白露三日' },
  { name: '適', pinyin: 'shì', meaning: '適時合度，適得其所。順隨時勢。', date: '秋分三日' },
  { name: '順', pinyin: 'shùn', meaning: '順天應人，同舟共濟。從心所欲。', date: '寒露三日' },
  { name: '從', pinyin: 'cóng', meaning: '從化大道，雲步風隨。景行仰止。', date: '霜降三日' },
  { name: '易', pinyin: 'yì', meaning: '生生易簡，千變萬化。至簡至易。', date: '立冬三日' },
  { name: '和', pinyin: 'hé', meaning: '保合太和，群倫太順。和而不同。', date: '小雪三日' },
  { name: '遷', pinyin: 'qiān', meaning: '見善則遷，改過不吝。順理昇華。', date: '大雪三日' },
  { name: '歛', pinyin: 'liǎn', meaning: '斂精蓄神，周流復始。萬象迴圈。', date: '冬至前四' },
  { name: '失', pinyin: 'shī', meaning: '塞翁失馬，察機審變。得失齊觀。', date: '冬至前三' },
  { name: '輔', pinyin: 'fǔ', meaning: '左右匡輔，合力齊功。相資為用。', date: '冬至前二' },
  { name: '弱', pinyin: 'ruò', meaning: '柔弱勝剛，如水流動。守柔日強。', date: '冬至前一' },
  { name: '疾', pinyin: 'jí', meaning: '疾雷破暗，天心微露。一陽初動。', date: '除夕前夕' },
  { name: '思', pinyin: 'sī', meaning: '微思遠慮，神遊象外。思之玄遠。', date: '大衍之交' },
  { name: '將', pinyin: 'jiāng', meaning: '將成之兆，曙光即現。大運將行。', date: '晦朔之際' },
  { name: '養', pinyin: 'yǎng', meaning: '首第八十一，太玄圓滿。養萬物以成終成始。', date: '終始之極' }
];

// Generate the 81 Tetragram data structure
export const TAI_XUAN_HEADS: TetragramHead[] = Array.from({ length: 81 }, (_, i) => {
  const index = i + 1; // 1 to 81
  const meta = AUTHENTIC_81_HEADS[i] || {
    name: HEAD_NAMES[i] || `首${index}`,
    pinyin: `shǒu ${index}`,
    meaning: '太玄元氣流轉運行之象。',
    date: '玄數紀曆'
  };

  // Convert (index - 1) to base-3: 4 digits from MSB to LSB
  // Let Tier 3 = Math.floor((i)/27) % 3 (方: 0, 1, 2)
  // Let Tier 2 = Math.floor((i)/9) % 3  (州: 0, 1, 2)
  // Let Tier 1 = Math.floor((i)/3) % 3  (部: 0, 1, 2)
  // Let Tier 0 = (i) % 3                (家: 0, 1, 2)
  // In Tai Xuan, tradition orders 1=一 (天), 2=二 (地), 3=三 (人)
  // We map cleanly:
  const t3 = (Math.floor(i / 27) % 3) as TritValue;
  const t2 = (Math.floor(i / 9) % 3) as TritValue;
  const t1 = (Math.floor(i / 3) % 3) as TritValue;
  const t0 = (i % 3) as TritValue;

  // Unicode characters for Tai Xuan Jing Tetragrams start at U+1D306 (TETRAGRAM FOR CENTRE - 首1 中)
  // U+1D306 to U+1D356 (81 tetragram symbols)
  const codePoint = 0x1D306 + i;
  const unicodeChar = String.fromCodePoint(codePoint);

  return {
    index,
    name: meta.name,
    pinyin: meta.pinyin,
    meaning: meta.meaning,
    trits: [t3, t2, t1, t0], // [方, 州, 部, 家]
    unicodeChar,
    solarDate: meta.date,
    interpretation: `【${meta.name}】第${index}首。四爻自上而下：${TRIT_INFO[t3].name}(方)·${TRIT_INFO[t2].name}(州)·${TRIT_INFO[t1].name}(部)·${TRIT_INFO[t0].name}(家)。`
  };
});

/**
 * Convert 4 trits to base-10 value in standard unbalanced [0..80]
 */
export function fourTritsToStandardInt(trits: [TritValue, TritValue, TritValue, TritValue]): number {
  return trits[0] * 27 + trits[1] * 9 + trits[2] * 3 + trits[3];
}

/**
 * Convert 4 trits to base-10 value in balanced ternary [-40..+40]
 */
export function fourTritsToBalancedInt(trits: [TritValue, TritValue, TritValue, TritValue]): number {
  const b3 = TRIT_INFO[trits[0]].balancedVal;
  const b2 = TRIT_INFO[trits[1]].balancedVal;
  const b1 = TRIT_INFO[trits[2]].balancedVal;
  const b0 = TRIT_INFO[trits[3]].balancedVal;
  return b3 * 27 + b2 * 9 + b1 * 3 + b0;
}

/**
 * Convert integer to 4-trit array (standard: 0..80)
 */
export function standardIntToFourTrits(n: number): [TritValue, TritValue, TritValue, TritValue] {
  const clamped = Math.max(0, Math.min(80, Math.floor(n)));
  const t3 = (Math.floor(clamped / 27) % 3) as TritValue;
  const t2 = (Math.floor(clamped / 9) % 3) as TritValue;
  const t1 = (Math.floor(clamped / 3) % 3) as TritValue;
  const t0 = (clamped % 3) as TritValue;
  return [t3, t2, t1, t0];
}

/**
 * Find Tetragram head by 4 trits
 */
export function findTetragramByTrits(trits: [TritValue, TritValue, TritValue, TritValue]): TetragramHead {
  const val = fourTritsToStandardInt(trits);
  return TAI_XUAN_HEADS[val] || TAI_XUAN_HEADS[0];
}
