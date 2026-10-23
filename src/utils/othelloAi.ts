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
  getBombExplodedPositions,
  getOpponent,
  getValidMoves,
  GRID_SIZE,
  isCellActive,
  ORIGINAL_CORNERS
} from './othelloLogic';

// 10x10 重みテーブル
const generateWeightTable = (): number[][] => {
  const table = Array(GRID_SIZE).fill(0).map(() => Array(GRID_SIZE).fill(0));

  // 中央8x8（行1..8, 列1..8）の標準オセロ重み
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
      table[r + 1][c + 1] = base8[r][c];
    }
  }

  // 四隅外周7マス（最先端の角は150点）
  // 左上
  table[0][0] = 150; table[0][1] = 20; table[0][2] = 15; table[0][3] = 10;
  table[1][0] = 20;  table[2][0] = 15; table[3][0] = 10;

  // 右上
  table[0][9] = 150; table[0][8] = 20; table[0][7] = 15; table[0][6] = 10;
  table[1][9] = 20;  table[2][9] = 15; table[3][9] = 10;

  // 左下
  table[9][0] = 150; table[9][1] = 20; table[9][2] = 15; table[9][3] = 10;
  table[8][0] = 20;  table[7][0] = 15; table[6][0] = 10;

  // 右下
  table[9][9] = 150; table[9][8] = 20; table[9][7] = 15; table[9][6] = 10;
  table[8][9] = 20;  table[7][9] = 15; table[6][9] = 10;

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

  let chosenMove: Move;

  if (level === 'easy') {
    if (Math.random() < 0.35) {
      chosenMove = validMoves[Math.floor(Math.random() * validMoves.length)];
    } else {
      const sorted = [...validMoves].sort((a, b) => b.flipped.length - a.flipped.length);
      chosenMove = sorted[0];
    }
  } else {
    // 角マス優先
    const highPriorityCorners = [
      { r: 1, c: 1 }, { r: 1, c: 8 }, { r: 8, c: 1 }, { r: 8, c: 8 },
      { r: 0, c: 0 }, { r: 0, c: 9 }, { r: 9, c: 0 }, { r: 9, c: 9 }
    ];

    const cornerMove = validMoves.find((m) =>
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

  // 💣 爆弾石を使用するかどうかの判断
  if ((rule === 'bomb' || rule === 'chaos') && bombsAvailable > 0) {
    let maxExplosion = 0;
    let bestBombMove: Move | null = null;

    for (const move of validMoves) {
      const exploded = getBombExplodedPositions(board, move.row, move.col, player, rule, unlocked);
      if (exploded.length > maxExplosion) {
        maxExplosion = exploded.length;
        bestBombMove = { ...move, isBomb: true };
      }
    }

    if (bestBombMove && maxExplosion >= 3) {
      return bestBombMove;
    }
  }

  return chosenMove;
};
