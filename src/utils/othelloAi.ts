import { AiLevel, BoardState, Move, Player } from '../types/othello';
import {
  applyMove,
  countScore,
  getOpponent,
  getValidMoves,
  isGameOver
} from './othelloLogic';

// 8x8の位置評価テーブル（標準的なオセロ戦略の重み付け）
// 角(0,0),(0,7),(7,0),(7,7)は超高得点(100)
// 角に隣接するXマス(1,1),(1,6),(6,1),(6,6)は超危険(-50)
// 角に隣接するCマス(0,1),(1,0)などは危険(-20)
const WEIGHT_TABLE: number[][] = [
  [ 100, -25,  10,   5,   5,  10, -25,  100],
  [-25,  -50,  -2,  -2,  -2,  -2, -50,  -25],
  [  10,  -2,   3,   2,   2,   3,  -2,   10],
  [   5,  -2,   2,   1,   1,   2,  -2,    5],
  [   5,  -2,   2,   1,   1,   2,  -2,    5],
  [  10,  -2,   3,   2,   2,   3,  -2,   10],
  [-25,  -50,  -2,  -2,  -2,  -2, -50,  -25],
  [ 100, -25,  10,   5,   5,  10, -25,  100]
];

// 角の座標
const CORNERS = [
  { r: 0, c: 0 },
  { r: 0, c: 7 },
  { r: 7, c: 0 },
  { r: 7, c: 7 }
];

/**
 * 盤面の静的評価関数
 */
const evaluateBoard = (board: BoardState, player: Player): number => {
  const opponent = getOpponent(player);

  let positionalScore = 0;
  let playerCount = 0;
  let opponentCount = 0;

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const cell = board[r][c];
      if (cell === player) {
        playerCount++;
        // すでに角を取っている場合、隣接マスのマイナス評価を解除する動的補正
        let weight = WEIGHT_TABLE[r][c];
        if (weight < 0) {
          // 該当する角が自分の石ならマイナスをプラスに反転
          if ((r <= 1 && c <= 1 && board[0][0] === player) ||
              (r <= 1 && c >= 6 && board[0][7] === player) ||
              (r >= 6 && c <= 1 && board[7][0] === player) ||
              (r >= 6 && c >= 6 && board[7][7] === player)) {
            weight = Math.abs(weight) / 2;
          }
        }
        positionalScore += weight;
      } else if (cell === opponent) {
        opponentCount++;
        let weight = WEIGHT_TABLE[r][c];
        if (weight < 0) {
          if ((r <= 1 && c <= 1 && board[0][0] === opponent) ||
              (r <= 1 && c >= 6 && board[0][7] === opponent) ||
              (r >= 6 && c <= 1 && board[7][0] === opponent) ||
              (r >= 6 && c >= 6 && board[7][7] === opponent)) {
            weight = Math.abs(weight) / 2;
          }
        }
        positionalScore -= weight;
      }
    }
  }

  // 着手可能手数（モビリティ）の評価: 打てる手が多い方が有利
  const myMoves = getValidMoves(board, player).length;
  const oppMoves = getValidMoves(board, opponent).length;
  const mobilityScore = myMoves + oppMoves > 0 
    ? 100 * (myMoves - oppMoves) / (myMoves + oppMoves)
    : 0;

  // 終盤（空きマスが少ない場合）は石の獲得枚数の重要度を跳ね上げる
  const totalDiscs = playerCount + opponentCount;
  if (totalDiscs >= 54) {
    const discScore = (playerCount - opponentCount) * 15;
    return positionalScore + mobilityScore * 0.5 + discScore;
  }

  return positionalScore * 1.0 + mobilityScore * 10;
};

/**
 * 初級AI: ランダムまたは少し獲得枚数を意識する程度
 */
const getEasyMove = (moves: Move[]): Move => {
  // 30%の確率で完全ランダム、70%は取れる石が2〜4枚の無難な手
  if (Math.random() < 0.35) {
    return moves[Math.floor(Math.random() * moves.length)];
  }
  // 取れる枚数順でソートして上位3手からランダム
  const sorted = [...moves].sort((a, b) => b.flipped.length - a.flipped.length);
  const topMoves = sorted.slice(0, Math.min(3, sorted.length));
  return topMoves[Math.floor(Math.random() * topMoves.length)];
};

/**
 * 中級AI: 1手先の位置評価（角の取得とX・Cマスの回避）
 */
const getMediumMove = (board: BoardState, moves: Move[], player: Player): Move => {
  // 角が取れるなら最優先で取る
  for (const move of moves) {
    if (CORNERS.some((c) => c.r === move.row && c.c === move.col)) {
      return move;
    }
  }

  let bestScore = -Infinity;
  let bestMoves: Move[] = [];

  for (const move of moves) {
    const { nextBoard } = applyMove(board, move.row, move.col, player);
    const score = evaluateBoard(nextBoard, player);

    if (score > bestScore) {
      bestScore = score;
      bestMoves = [move];
    } else if (score === bestScore) {
      bestMoves.push(move);
    }
  }

  // 同点の中からランダム選択
  return bestMoves[Math.floor(Math.random() * bestMoves.length)];
};

/**
 * 上級AI: Minimax + Alpha-Beta探索
 */
const alphaBeta = (
  board: BoardState,
  depth: number,
  alpha: number,
  beta: number,
  isMaximizing: boolean,
  targetPlayer: Player
): number => {
  if (depth === 0 || isGameOver(board)) {
    return evaluateBoard(board, targetPlayer);
  }

  const currentPlayer = isMaximizing ? targetPlayer : getOpponent(targetPlayer);
  const validMoves = getValidMoves(board, currentPlayer);

  // パスの場合
  if (validMoves.length === 0) {
    return alphaBeta(board, depth - 1, alpha, beta, !isMaximizing, targetPlayer);
  }

  if (isMaximizing) {
    let maxEval = -Infinity;
    for (const move of validMoves) {
      const { nextBoard } = applyMove(board, move.row, move.col, currentPlayer);
      const evalValue = alphaBeta(nextBoard, depth - 1, alpha, beta, false, targetPlayer);
      maxEval = Math.max(maxEval, evalValue);
      alpha = Math.max(alpha, evalValue);
      if (beta <= alpha) break; // β枝刈り
    }
    return maxEval;
  } else {
    let minEval = Infinity;
    for (const move of validMoves) {
      const { nextBoard } = applyMove(board, move.row, move.col, currentPlayer);
      const evalValue = alphaBeta(nextBoard, depth - 1, alpha, beta, true, targetPlayer);
      minEval = Math.min(minEval, evalValue);
      beta = Math.min(beta, evalValue);
      if (beta <= alpha) break; // α枝刈り
    }
    return minEval;
  }
};

/**
 * 上級AIの着手決定
 */
const getHardMove = (board: BoardState, moves: Move[], player: Player): Move => {
  // 角が取れる手は即座に選択
  for (const move of moves) {
    if (CORNERS.some((c) => c.r === move.row && c.c === move.col)) {
      return move;
    }
  }

  const totalScore = countScore(board);
  const totalDiscs = totalScore.black + totalScore.white;
  // 終盤（空きマスが10個以下）は深さ5、それ以外は深さ4で高速かつ深読み
  const searchDepth = totalDiscs >= 54 ? 5 : 4;

  let bestScore = -Infinity;
  let bestMoves: Move[] = [];
  let alpha = -Infinity;
  const beta = Infinity;

  // 角に近い危険な手を後ろに回す等のMove Orderingで枝刈り効率化
  const sortedMoves = [...moves].sort((a, b) => {
    return WEIGHT_TABLE[b.row][b.col] - WEIGHT_TABLE[a.row][a.col];
  });

  for (const move of sortedMoves) {
    const { nextBoard } = applyMove(board, move.row, move.col, player);
    const score = alphaBeta(nextBoard, searchDepth - 1, alpha, beta, false, player);

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
 * AIレベルに応じた着手を算出
 */
export const calculateAiMove = (
  board: BoardState,
  player: Player,
  level: AiLevel
): Move | null => {
  const validMoves = getValidMoves(board, player);
  if (validMoves.length === 0) return null;

  switch (level) {
    case 'easy':
      return getEasyMove(validMoves);
    case 'medium':
      return getMediumMove(board, validMoves, player);
    case 'hard':
      return getHardMove(board, validMoves, player);
  }
};
