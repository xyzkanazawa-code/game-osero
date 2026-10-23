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

// 🃏 特殊スキルタイプ
export type SkillType = 'shield' | 'colorBomb' | 'timeStop' | 'reverse';

export interface PlayerSkills {
  shield: number;    // 🛡️ 鉄壁石（絶対に裏返らない）
  colorBomb: number; // 🎨 カラーボム（3x3塗り替え）
  timeStop: number;  // ⚡ タイムストップ（もう1回自分の手番）
  reverse: number;   // 🔄 リバース（全反転）
}

// 🎲 天変地異ルーレットイベント
export type RouletteEvent =
  | 'gale'      // 🌪️ 突風（石がスライド）
  | 'eclipse'   // 🌘 日食（全反転）
  | 'lightning' // ⚡ 落雷（ランダム地点がひっくり返る）
  | 'midas'     // 💰 黄金変異（石が3点分のゴールドに）
  | 'peace';    // 🕊️ 平穏（何も起きない）

// 盤面装飾（シールド・ゴールド等）
export interface CellModifiers {
  [coordKey: string]: {
    isShield?: boolean;
    isGold?: boolean;
  };
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
  | { type: 'chat'; message: string; sender: string; time: string }
  | { type: 'stamp'; stamp: string };
