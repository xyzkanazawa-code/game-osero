export type Player = 'black' | 'white';

export type CellValue = Player | null;

export type RuleType = 'classic' | 'fortress'; // classic: 通常8x8, fortress: 4隅3x3拡張

export interface Position {
  row: number;
  col: number;
}

export interface Move {
  row: number;
  col: number;
  player: Player;
  flipped: Position[];
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

export interface GameRecord {
  moveNumber: number;
  player: Player;
  position: Position | null; // null for pass
  flippedCount: number;
  score: Score;
}

// オンライン通信用メッセージ構造
export type P2PMessage =
  | { type: 'join'; playerName: string }
  | { type: 'ready'; color: Player; rule?: RuleType }
  | { type: 'move'; move: { row: number; col: number; player: Player } }
  | { type: 'pass'; player: Player }
  | { type: 'restart' }
  | { type: 'resign'; player: Player }
  | { type: 'chat'; message: string; sender: string; time: string }
  | { type: 'stamp'; stamp: string };
