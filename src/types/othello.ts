export type Player = 'black' | 'white';

export type CellValue = Player | null;

export type RuleType = 'classic' | 'fortress' | 'bomb' | 'chaos';

export interface Position {
  row: number;
  col: number;
}

export interface Move {
  row: number;
  col: number;
  player: Player;
  flipped: Position[];
  isBomb?: boolean;
}

export type GameMode = 'cpu' | 'local' | 'online';

export type AiLevel = 'easy' | 'medium' | 'hard';

export type GameStatus = 'playing' | 'passed' | 'finished';

export interface Score {
  black: number;
  white: number;
}

// 🏰 2段階拡張ゾーン管理
// _1: 第1段階（7マス L字帯）
// _2: 第2段階（5マス 2+3 L字帯）
export interface UnlockedZones {
  topLeft_1: boolean;
  topRight_1: boolean;
  bottomLeft_1: boolean;
  bottomRight_1: boolean;

  topLeft_2: boolean;
  topRight_2: boolean;
  bottomLeft_2: boolean;
  bottomRight_2: boolean;
}

export interface BombsRemaining {
  black: number;
  white: number;
}

// 🃏 特殊スキルタイプ（5大スキル）
export type SkillType = 'shield' | 'colorBomb' | 'timeStop' | 'reverse' | 'trap';

export interface PlayerSkills {
  shield: number;    // 🛡️ 鉄壁石（絶対に裏返らない）
  colorBomb: number; // 🎨 カラーボム（3x3塗り替え）
  timeStop: number;  // ⚡ タイムストップ（もう1回自分の手番）
  reverse: number;   // 🔄 リバース（全反転）
  trap: number;      // 🕸️ ステルス地雷（空きマスに罠を仕掛ける）
}

// 🎲 天変地異ルーレットイベント（全10種！）
export type RouletteEvent =
  | 'gale'      // 🌪️ 突風（石がスライド）
  | 'eclipse'   // 🌘 皆既日食（全反転）
  | 'lightning' // ⚡ 落雷（ランダム地点がひっくり返る）
  | 'midas'     // 💰 黄金変異（石が3点分のゴールドに）
  | 'meteor'    // ☄️ 隕石落下（十字5マスの石が消滅して空きマスに）
  | 'whirlpool' // 🌀 大渦潮（中央4x4が時計回りに90度回転）
  | 'treasure'  // 🎁 福袋（両者に爆弾+1＆スキル+1支給）
  | 'biohazard' // 🦠 バイオハザード（ウイルス感染で周囲の敵石を同化）
  | 'skull'     // 💀 死神の宣告（石が-2点のドクロ石に変異）
  | 'peace';    // 🕊️ 平穏（何も起きない）

// 盤面装飾・ギミック（シールド・ゴールド・ドクロ・キング・？ボックス・ワープ・トラップ）
export interface CellModifier {
  isShield?: boolean;            // 🛡️ 鉄壁石（絶対に裏返らない）
  isGold?: boolean;              // 💰 黄金石（+3点）
  isSkull?: boolean;             // 💀 ドクロ石（-2点）
  isKing?: boolean;              // 👑 キング石（+5点ボーナス！）
  isMystery?: boolean;           // ❓ ミステリーマス（踏むと即座にルーレット発動！）
  warpGroup?: 'blue' | 'orange'; // 🌀 ワープホール（踏むと反対のワープ周囲も共鳴反転！）
  trapOwner?: Player;            // 🕸️ ステルス地雷（相手が踏むと周囲3x3自色爆発！）
}

export interface CellModifiers {
  [coordKey: string]: CellModifier;
}

// 📜 リアルタイム・ミッション（懸賞金クエスト）
export interface Mission {
  id: string;
  title: string;
  desc: string;
  rewardText: string;
  rewardType: 'bomb' | SkillType;
}

// 💬 簡易チャット＆スタンプメッセージ
export interface ChatMessage {
  id: string;
  sender: Player | 'system';
  senderName: string;
  text: string;
  time: string;
  isStamp?: boolean;
}

export interface GameRecord {
  moveNumber: number;
  player: Player;
  position: Position | null;
  flippedCount: number;
  score: Score;
  isBomb?: boolean;
}

export type P2PMessage =
  | { type: 'join'; playerName: string }
  | { type: 'ready'; color: Player; rule?: RuleType; enableSkills?: boolean; enableRoulette?: boolean }
  | { type: 'move'; move: { row: number; col: number; player: Player; isBomb?: boolean; isShield?: boolean } }
  | { type: 'skill'; skill: SkillType; player: Player; position?: Position }
  | { type: 'roulette'; event: RouletteEvent }
  | { type: 'pass'; player: Player }
  | { type: 'restart' }
  | { type: 'resign'; player: Player }
  | { type: 'chat'; message: string; sender: string; time: string; isStamp?: boolean }
  | { type: 'stamp'; stamp: string };
