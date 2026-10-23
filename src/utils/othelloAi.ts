import {
  AiLevel,
  BombsRemaining,
  CellValue,
  Move,
  Player,
  RuleType,
  UnlockedZones
} from '../types/othello';
import {
  applyMove,
  countScore,
  getBombExplodedPositions,
  getOpponent,
  getValidMoves,
  GRID_SIZE,
  isCellActive,
  isGameOver
} from './othelloLogic';

const generateWeightTable = (): number[][] => {
  const table = Array(GRID_SIZE).fill(0).map(() => Array(GRID_SIZE).fill(0));

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

  table[0][0] = 150; table[0][1] = -30; table[0][2] = 20;
  table[1][0] = -30; table[1][1] = -60; table[1][2] = -10;
  table[2][0] = 20;  table[2][1] = -10; table[2][2] = 10;

  table[0][13] = 150; table[0][12] = -30; table[0][11] = 20;
  table[1][13] = -30; table[1][12] = -60; table[1][11] = -10;
  table[2][13] = 20;  table[2][12] = -10; table[2][11] = 10;

  table[13][0] = 150; table[13][1] = -30; table[13][2] = 20;
  table[12][0] = -30; table[12][1] = -60; table[12][2] = -10;
  table[11][0] = 20;  table[11][1] = -10; table[11][2] = 10;

  table[13][13] = 150; table[13][12] = -30; table[13][11] = 20;
  table[12][13] = -30; table[12][12] = -60; table[12][11] = -10;
  table[11][13] = 20;  table[11][12] = -10; table[11][11] = 10;

  return table;
};

const WEIGHT_TABLE = generateWeightTable();

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

  const myMoves = getValidMoves(board, player, rule, unlocked).length;
  const oppMoves = getValidMoves(board, opponent, rule, unlocked).length;
  const mobilityScore = myMoves + oppMoves > 0
    ? 100 * (myMoves - oppMoves) / (myMoves + oppMoves)
    : 0;

  return positionalScore + mobilityScore * 8;
};

/**
 * AI着手決定（爆弾使用判断含む）
 */
export const calculateAiMove = (
  board: CellValue[][],
  player: Player,
  level: AiLevel,
  rule: RuleType,
  unlocked: UnlockedZones,
  bombsAvailable: number = 0
): Move | null => {
  const validMoves = getValidMoves(board, player, rule, unlocked);
  if (validMoves.length === 0) return null;

  // 1. 通常の最適手を算出
  let chosenMove: Move;

  if (level === 'easy') {
    if (Math.random() < 0.35) {
      chosenMove = validMoves[Math.floor(Math.random() * validMoves.length)];
    } else {
      const sorted = [...validMoves].sort((a, b) => b.flipped.length - a.flipped.length);
      chosenMove = sorted[0];
    }
  } else {
    // 中級・上級
    const highPriorityCorners = [
      { r: 3, c: 3 }, { r: 3, c: 10 }, { r: 10, c: 3 }, { r: 10, c: 10 },
      { r: 0, c: 0 }, { r: 0, c: 13 }, { r: 13, c: 0 }, { r: 13, c: 13 }
    ];

    let cornerMove = validMoves.find((m) =>
      highPriorityCorners.some((c) => c.r === m.row && c.c === m.col)
    );

    if (cornerMove) {
      chosenMove = cornerMove;
    } else {
      let bestScore = -Infinity;
      let bestMoves: Move[] = [];

      for (const move of validMoves) {
        const { nextBoard, nextUnlocked } = applyMove(board, move.row, move.col, player, rule, unlocked, false);
        const score = evaluateBoard(nextBoard, player, rule, nextUnlocked);

        if (score > bestScore) {
          bestScore = score;
          bestMoves = [move];
        } else if (score === bestScore) {
          bestMoves.push(move);
        }
      }

      chosenMove = bestMoves[Math.floor(Math.random() * bestMoves.length)];
    }
  }

  // 2. 💣 爆弾石を使用するかどうかの判断（bomb または chaos ルール時）
  if ((rule === 'bomb' || rule === 'chaos') && bombsAvailable > 0) {
    // 全合法手の中で、爆弾を使うと相手の石を最も多く爆破（3個以上）できるマスを探す
    let maxExplosion = 0;
    let bestBombMove: Move | null = null;

    for (const move of validMoves) {
      const exploded = getBombExplodedPositions(board, move.row, move.col, player, rule, unlocked);
      if (exploded.length > maxExplosion) {
        maxExplosion = exploded.length;
        bestBombMove = { ...move, isBomb: true };
      }
    }

    // 周囲に3個以上相手の石を巻き込めるなら、ドカンと爆弾を使用！
    if (bestBombMove && maxExplosion >= 3) {
      return bestBombMove;
    }
  }

  return chosenMove;
};
