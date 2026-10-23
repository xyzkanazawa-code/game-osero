import {
  AiLevel,
  CellValue,
  Move,
  Player,
  RuleType,
  UnlockedZones
} from '../types/othello';
import {
  applyMove,
  countScore,
  getOpponent,
  getValidMoves,
  GRID_SIZE,
  isCellActive,
  isGameOver
} from './othelloLogic';

// 基本重みテーブル（14x14全体）
// 中央8x8（3..10）に標準オセロ重みを配置、外側3x3ゾーンの最果て（0,0 / 0,13 / 13,0 / 13,13）は150点の超重要マス！
const generateWeightTable = (): number[][] => {
  const table = Array(GRID_SIZE).fill(0).map(() => Array(GRID_SIZE).fill(0));

  // 標準8x8重み（3..10にマッピング）
  const base8: number[][] = [
    [ 100, -25,  10,   5,   5,  10, -25,  100],
    [-25,  -50,  -2,  -2,  -2,  -2, -50,  -25],
    [  10,  -2,   3,   2,   2,   3,  -2,   10],
    [   5,  -2,   2,   1,   1,   2,  -2,    5],
    [   5,  -2,   2,   1,   1,   2,  -2,    5],
    [  10,  -2,   3,   2,   2,   3,  -2,   10],
    [-25,  -50,  -2,  -2,  -2,  -2, -50,  -25],
    [ 100, -25,  10,   5,   5,  10, -25,  100]
  ];

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      table[r + 3][c + 3] = base8[r][c];
    }
  }

  // 4隅3x3エリアの重み（最果ての角は150点、隣接マスは注意）
  // 左上 (0..2, 0..2)
  table[0][0] = 150; table[0][1] = -30; table[0][2] = 20;
  table[1][0] = -30; table[1][1] = -60; table[1][2] = -10;
  table[2][0] = 20;  table[2][1] = -10; table[2][2] = 10;

  // 右上 (0..2, 11..13)
  table[0][13] = 150; table[0][12] = -30; table[0][11] = 20;
  table[1][13] = -30; table[1][12] = -60; table[1][11] = -10;
  table[2][13] = 20;  table[2][12] = -10; table[2][11] = 10;

  // 左下 (11..13, 0..2)
  table[13][0] = 150; table[13][1] = -30; table[13][2] = 20;
  table[12][0] = -30; table[12][1] = -60; table[12][2] = -10;
  table[11][0] = 20;  table[11][1] = -10; table[11][2] = 10;

  // 右下 (11..13, 11..13)
  table[13][13] = 150; table[13][12] = -30; table[13][11] = 20;
  table[12][13] = -30; table[12][12] = -60; table[12][11] = -10;
  table[11][13] = 20;  table[11][12] = -10; table[11][11] = 10;

  return table;
};

const WEIGHT_TABLE = generateWeightTable();

/**
 * 盤面の静的評価関数
 */
const evaluateBoard = (
  board: CellValue[][],
  player: Player,
  rule: RuleType,
  unlocked: UnlockedZones
): number => {
  const opponent = getOpponent(player);

  let positionalScore = 0;
  let playerCount = 0;
  let opponentCount = 0;

  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      if (isCellActive(r, c, rule, unlocked)) {
        const cell = board[r][c];
        if (cell === player) {
          playerCount++;
          positionalScore += WEIGHT_TABLE[r][c];
        } else if (cell === opponent) {
          opponentCount++;
          positionalScore -= WEIGHT_TABLE[r][c];
        }
      }
    }
  }

  // モビリティ（着手可能手数）の評価
  const myMoves = getValidMoves(board, player, rule, unlocked).length;
  const oppMoves = getValidMoves(board, opponent, rule, unlocked).length;
  const mobilityScore = myMoves + oppMoves > 0
    ? 100 * (myMoves - oppMoves) / (myMoves + oppMoves)
    : 0;

  return positionalScore + mobilityScore * 8;
};

/**
 * 初級AI
 */
const getEasyMove = (moves: Move[]): Move => {
  if (Math.random() < 0.35) {
    return moves[Math.floor(Math.random() * moves.length)];
  }
  const sorted = [...moves].sort((a, b) => b.flipped.length - a.flipped.length);
  const topMoves = sorted.slice(0, Math.min(3, sorted.length));
  return topMoves[Math.floor(Math.random() * topMoves.length)];
};

/**
 * 中級AI
 */
const getMediumMove = (
  board: CellValue[][],
  moves: Move[],
  player: Player,
  rule: RuleType,
  unlocked: UnlockedZones
): Move => {
  // 角（元の角、または新エリアの真の角）が取れるなら最優先
  const highPriorityCorners = [
    { r: 3, c: 3 }, { r: 3, c: 10 }, { r: 10, c: 3 }, { r: 10, c: 10 },
    { r: 0, c: 0 }, { r: 0, c: 13 }, { r: 13, c: 0 }, { r: 13, c: 13 }
  ];

  for (const move of moves) {
    if (highPriorityCorners.some((c) => c.r === move.row && c.c === move.col)) {
      return move;
    }
  }

  let bestScore = -Infinity;
  let bestMoves: Move[] = [];

  for (const move of moves) {
    const { nextBoard, nextUnlocked } = applyMove(board, move.row, move.col, player, rule, unlocked);
    const score = evaluateBoard(nextBoard, player, rule, nextUnlocked);

    if (score > bestScore) {
      bestScore = score;
      bestMoves = [move];
    } else if (score === bestScore) {
      bestMoves.push(move);
    }
  }

  return bestMoves[Math.floor(Math.random() * bestMoves.length)];
};

/**
 * 上級AI（Alpha-Beta探索）
 */
const alphaBeta = (
  board: CellValue[][],
  depth: number,
  alpha: number,
  beta: number,
  isMaximizing: boolean,
  targetPlayer: Player,
  rule: RuleType,
  unlocked: UnlockedZones
): number => {
  if (depth === 0 || isGameOver(board, rule, unlocked)) {
    return evaluateBoard(board, targetPlayer, rule, unlocked);
  }

  const currentPlayer = isMaximizing ? targetPlayer : getOpponent(targetPlayer);
  const validMoves = getValidMoves(board, currentPlayer, rule, unlocked);

  if (validMoves.length === 0) {
    return alphaBeta(board, depth - 1, alpha, beta, !isMaximizing, targetPlayer, rule, unlocked);
  }

  if (isMaximizing) {
    let maxEval = -Infinity;
    for (const move of validMoves) {
      const { nextBoard, nextUnlocked } = applyMove(board, move.row, move.col, currentPlayer, rule, unlocked);
      const evalValue = alphaBeta(nextBoard, depth - 1, alpha, beta, false, targetPlayer, rule, nextUnlocked);
      maxEval = Math.max(maxEval, evalValue);
      alpha = Math.max(alpha, evalValue);
      if (beta <= alpha) break;
    }
    return maxEval;
  } else {
    let minEval = Infinity;
    for (const move of validMoves) {
      const { nextBoard, nextUnlocked } = applyMove(board, move.row, move.col, currentPlayer, rule, unlocked);
      const evalValue = alphaBeta(nextBoard, depth - 1, alpha, beta, true, targetPlayer, rule, nextUnlocked);
      minEval = Math.min(minEval, evalValue);
      beta = Math.min(beta, evalValue);
      if (beta <= alpha) break;
    }
    return minEval;
  }
};

const getHardMove = (
  board: CellValue[][],
  moves: Move[],
  player: Player,
  rule: RuleType,
  unlocked: UnlockedZones
): Move => {
  const highPriorityCorners = [
    { r: 3, c: 3 }, { r: 3, c: 10 }, { r: 10, c: 3 }, { r: 10, c: 10 },
    { r: 0, c: 0 }, { r: 0, c: 13 }, { r: 13, c: 0 }, { r: 13, c: 13 }
  ];

  for (const move of moves) {
    if (highPriorityCorners.some((c) => c.r === move.row && c.c === move.col)) {
      return move;
    }
  }

  // 深さ3で高速かつ精緻に探索
  const searchDepth = 3;
  let bestScore = -Infinity;
  let bestMoves: Move[] = [];
  let alpha = -Infinity;
  const beta = Infinity;

  const sortedMoves = [...moves].sort((a, b) => {
    return WEIGHT_TABLE[b.row][b.col] - WEIGHT_TABLE[a.row][a.col];
  });

  for (const move of sortedMoves) {
    const { nextBoard, nextUnlocked } = applyMove(board, move.row, move.col, player, rule, unlocked);
    const score = alphaBeta(nextBoard, searchDepth - 1, alpha, beta, false, player, rule, nextUnlocked);

    if (score > bestScore) {
      bestScore = score;
      bestMoves = [move];
    } else if (score === bestScore) {
      bestMoves.push(move);
    }
    alpha = Math.max(alpha, score);
  }

  return bestMoves[Math.floor(Math.random() * bestMoves.length)];
};

/**
 * AI着手決定
 */
export const calculateAiMove = (
  board: CellValue[][],
  player: Player,
  level: AiLevel,
  rule: RuleType,
  unlocked: UnlockedZones
): Move | null => {
  const validMoves = getValidMoves(board, player, rule, unlocked);
  if (validMoves.length === 0) return null;

  switch (level) {
    case 'easy':
      return getEasyMove(validMoves);
    case 'medium':
      return getMediumMove(board, validMoves, player, rule, unlocked);
    case 'hard':
      return getHardMove(board, validMoves, player, rule, unlocked);
  }
};
