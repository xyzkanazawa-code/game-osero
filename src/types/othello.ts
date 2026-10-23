export type Player = 'black' | 'white';

export type CellValue = Player | null;

// ルール種別:
// classic: 通常 8x8
// fortress: 盤面拡張（角を取ると四隅に3x3エリア出現）
// bomb: 爆弾石モード（周囲3x3を一斉爆破自色化）
// chaos: 四隅拡張 + 爆弾石（全部盛り）
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

export interface UnlockedZones {
  topLeft: boolean;
  topRight: boolean;
  bottomLeft: boolean;
  bottomRight: boolean;
}

export interface BombsRemaining {
  black: number;
  white: number;
}

export interface GameRecord {
  moveNumber: number;
  player: Player;
  position: Position | null;
  flippedCount: number;
  score: Score;
  isBomb?: boolean;
}

// オンライン通信用メッセージ構造
export type P2PMessage =
  | { type: 'join'; playerName: string }
  | { type: 'ready'; color: Player; rule?: RuleType }
  | { type: 'move'; move: { row: number; col: number; player: Player; isBomb?: boolean } }
  | { type: 'pass'; player: Player }
  | { type: 'restart' }
  | { type: 'resign'; player: Player }
  | { type: 'chat'; message: string; sender: string; time: string }
  | { type: 'stamp'; stamp: string };
