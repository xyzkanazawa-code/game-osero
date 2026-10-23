import { BoardState, CellValue, Move, Player, Position, Score } from '../types/othello';

export const BOARD_SIZE = 8;

// 8方向ベクトル [dRow, dCol]
export const DIRECTIONS: [number, number][] = [
  [-1, -1], [-1, 0], [-1, 1],
  [0, -1],           [0, 1],
  [1, -1],  [1, 0],  [1, 1]
];

/**
 * 初期盤面の生成
 * 中央4マスに白黒が交差して配置される
 */
export const createInitialBoard = (): BoardState => {
  const board: BoardState = Array(BOARD_SIZE)
    .fill(null)
    .map(() => Array(BOARD_SIZE).fill(null));

  // オセロ公式配置:
  // (3,3): 白, (3,4): 黒
  // (4,3): 黒, (4,4): 白
  board[3][3] = 'white';
  board[3][4] = 'black';
  board[4][3] = 'black';
  board[4][4] = 'white';

  return board;
};

/**
 * 盤面内の座標かチェック
 */
export const isInsideBoard = (row: number, col: number): boolean => {
  return row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE;
};

/**
 * 相手プレイヤーの色を取得
 */
export const getOpponent = (player: Player): Player => {
  return player === 'black' ? 'white' : 'black';
};

/**
 * 特定のマスに石を置いた時に裏返せる相手の石の座標リストを取得
 */
export const getFlippedPositions = (
  board: BoardState,
  row: number,
  col: number,
  player: Player
): Position[] => {
  // すでに石が置かれている場合は置けない
  if (board[row][col] !== null) return [];

  const opponent = getOpponent(player);
  const flippable: Position[] = [];

  for (const [dr, dc] of DIRECTIONS) {
    const directionFlipped: Position[] = [];
    let r = row + dr;
    let c = col + dc;

    // 相手の石が連続しているかチェック
    while (isInsideBoard(r, c) && board[r][c] === opponent) {
      directionFlipped.push({ row: r, col: c });
      r += dr;
      c += dc;
    }

    // 相手の石の先に自分の石があれば、その列の石は裏返せる
    if (directionFlipped.length > 0 && isInsideBoard(r, c) && board[r][c] === player) {
      flippable.push(...directionFlipped);
    }
  }

  return flippable;
};

/**
 * そのマスが合法手かどうか
 */
export const isValidMove = (
  board: BoardState,
  row: number,
  col: number,
  player: Player
): boolean => {
  return getFlippedPositions(board, row, col, player).length > 0;
};

/**
 * 指定プレイヤーのすべての合法手を取得
 */
export const getValidMoves = (board: BoardState, player: Player): Move[] => {
  const moves: Move[] = [];

  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (board[r][c] === null) {
        const flipped = getFlippedPositions(board, r, c, player);
        if (flipped.length > 0) {
          moves.push({
            row: r,
            col: c,
            player,
            flipped
          });
        }
      }
    }
  }

  return moves;
};

/**
 * 石を配置して盤面を更新
 */
export const applyMove = (
  board: BoardState,
  row: number,
  col: number,
  player: Player
): { nextBoard: BoardState; flipped: Position[] } => {
  const flipped = getFlippedPositions(board, row, col, player);
  if (flipped.length === 0) {
    throw new Error(`無効な着手です: (${row}, ${col}) for ${player}`);
  }

  // 盤面のディープコピー
  const nextBoard: BoardState = board.map((r) => [...r]);

  // 新しい石を配置
  nextBoard[row][col] = player;

  // 挟まれた石を反転
  for (const pos of flipped) {
    nextBoard[pos.row][pos.col] = player;
  }

  return { nextBoard, flipped };
};

/**
 * 現在の石数をカウント
 */
export const countScore = (board: BoardState): Score => {
  let black = 0;
  let white = 0;

  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (board[r][c] === 'black') black++;
      else if (board[r][c] === 'white') white++;
    }
  }

  return { black, white };
};

/**
 * ゲーム終了判定（双方がパスまたは全マス埋まったか）
 */
export const isGameOver = (board: BoardState): boolean => {
  const blackMoves = getValidMoves(board, 'black');
  const whiteMoves = getValidMoves(board, 'white');
  return blackMoves.length === 0 && whiteMoves.length === 0;
};

/**
 * 勝者を判定
 */
export const getWinner = (board: BoardState): Player | 'draw' => {
  const score = countScore(board);
  if (score.black > score.white) return 'black';
  if (score.white > score.black) return 'white';
  return 'draw';
};
