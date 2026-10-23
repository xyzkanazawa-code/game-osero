import {
  CellValue,
  Move,
  Player,
  Position,
  RuleType,
  Score,
  UnlockedZones
} from '../types/othello';

export const GRID_SIZE = 14;
export const OFFSET = 3;

// 8方向ベクトル [dRow, dCol]
export const DIRECTIONS: [number, number][] = [
  [-1, -1], [-1, 0], [-1, 1],
  [0, -1],           [0, 1],
  [1, -1],  [1, 0],  [1, 1]
];

// 元の8x8の4隅の座標
export const ORIGINAL_CORNERS = {
  topLeft: { row: 3, col: 3 },
  topRight: { row: 3, col: 10 },
  bottomLeft: { row: 10, col: 3 },
  bottomRight: { row: 10, col: 10 }
};

/**
 * 初期盤面の生成
 */
export const createInitialBoard = (rule: RuleType = 'classic'): CellValue[][] => {
  const board: CellValue[][] = Array(GRID_SIZE)
    .fill(null)
    .map(() => Array(GRID_SIZE).fill(null));

  // 中央4石
  board[6][6] = 'white';
  board[6][7] = 'black';
  board[7][6] = 'black';
  board[7][7] = 'white';

  return board;
};

/**
 * 初期アンロック状態
 */
export const createInitialUnlockedZones = (rule: RuleType): UnlockedZones => {
  return {
    topLeft: false,
    topRight: false,
    bottomLeft: false,
    bottomRight: false
  };
};

/**
 * マスが有効（現在プレイ可能なエリア内）か判定
 */
export const isCellActive = (
  row: number,
  col: number,
  rule: RuleType,
  unlocked: UnlockedZones
): boolean => {
  if (row < 0 || row >= GRID_SIZE || col < 0 || col >= GRID_SIZE) return false;

  // 1. 中央8x8（row 3..10, col 3..10）は常に有効
  if (row >= 3 && row <= 10 && col >= 3 && col <= 10) {
    return true;
  }

  // classic や bomb ルール（通常サイズ）の場合は中央8x8のみ
  if (rule === 'classic' || rule === 'bomb') return false;

  // 2. 解放された四隅3x3ゾーン（fortress または chaos）
  if (unlocked.topLeft && row <= 2 && col <= 2) return true;
  if (unlocked.topRight && row <= 2 && col >= 11) return true;
  if (unlocked.bottomLeft && row >= 11 && col <= 2) return true;
  if (unlocked.bottomRight && row >= 11 && col >= 11) return true;

  return false;
};

/**
 * 相手プレイヤーの色を取得
 */
export const getOpponent = (player: Player): Player => {
  return player === 'black' ? 'white' : 'black';
};

/**
 * 通常の挟み込みによる反転座標リストを取得
 */
export const getFlippedPositions = (
  board: CellValue[][],
  row: number,
  col: number,
  player: Player,
  rule: RuleType,
  unlocked: UnlockedZones
): Position[] => {
  if (!isCellActive(row, col, rule, unlocked) || board[row][col] !== null) {
    return [];
  }

  const opponent = getOpponent(player);
  const flippable: Position[] = [];

  for (const [dr, dc] of DIRECTIONS) {
    const directionFlipped: Position[] = [];
    let r = row + dr;
    let c = col + dc;

    while (isCellActive(r, c, rule, unlocked) && board[r][c] === opponent) {
      directionFlipped.push({ row: r, col: c });
      r += dr;
      c += dc;
    }

    if (directionFlipped.length > 0 && isCellActive(r, c, rule, unlocked) && board[r][c] === player) {
      flippable.push(...directionFlipped);
    }
  }

  return flippable;
};

/**
 * 爆弾石投下時の周囲爆破対象リストを取得（周囲3x3の相手石）
 */
export const getBombExplodedPositions = (
  board: CellValue[][],
  row: number,
  col: number,
  player: Player,
  rule: RuleType,
  unlocked: UnlockedZones
): Position[] => {
  const opponent = getOpponent(player);
  const exploded: Position[] = [];

  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      const r = row + dr;
      const c = col + dc;
      if (isCellActive(r, c, rule, unlocked) && board[r][c] === opponent) {
        exploded.push({ row: r, col: c });
      }
    }
  }

  return exploded;
};

/**
 * 指定プレイヤーのすべての合法手を取得
 */
export const getValidMoves = (
  board: CellValue[][],
  player: Player,
  rule: RuleType,
  unlocked: UnlockedZones
): Move[] => {
  const moves: Move[] = [];

  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      if (isCellActive(r, c, rule, unlocked) && board[r][c] === null) {
        const flipped = getFlippedPositions(board, r, c, player, rule, unlocked);
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
 * 着手によってアンロックされる角ゾーンを判定（fortress または chaos）
 */
export const checkNewlyUnlockedZone = (
  row: number,
  col: number,
  rule: RuleType,
  unlocked: UnlockedZones
): keyof UnlockedZones | null => {
  if (rule !== 'fortress' && rule !== 'chaos') return null;

  if (row === ORIGINAL_CORNERS.topLeft.row && col === ORIGINAL_CORNERS.topLeft.col && !unlocked.topLeft) {
    return 'topLeft';
  }
  if (row === ORIGINAL_CORNERS.topRight.row && col === ORIGINAL_CORNERS.topRight.col && !unlocked.topRight) {
    return 'topRight';
  }
  if (row === ORIGINAL_CORNERS.bottomLeft.row && col === ORIGINAL_CORNERS.bottomLeft.col && !unlocked.bottomLeft) {
    return 'bottomLeft';
  }
  if (row === ORIGINAL_CORNERS.bottomRight.row && col === ORIGINAL_CORNERS.bottomRight.col && !unlocked.bottomRight) {
    return 'bottomRight';
  }

  return null;
};

/**
 * 石を配置して盤面を更新（通常石または爆弾石）
 */
export const applyMove = (
  board: CellValue[][],
  row: number,
  col: number,
  player: Player,
  rule: RuleType,
  unlocked: UnlockedZones,
  isBomb: boolean = false
): {
  nextBoard: CellValue[][];
  flipped: Position[];
  exploded: Position[];
  nextUnlocked: UnlockedZones;
  newZoneUnlocked: keyof UnlockedZones | null;
} => {
  const standardFlipped = getFlippedPositions(board, row, col, player, rule, unlocked);
  if (standardFlipped.length === 0) {
    throw new Error(`無効な着手です: (${row}, ${col}) for ${player}`);
  }

  const nextBoard: CellValue[][] = board.map((r) => [...r]);
  nextBoard[row][col] = player;

  // 通常反転
  for (const pos of standardFlipped) {
    nextBoard[pos.row][pos.col] = player;
  }

  // 💣 爆弾石の場合: 周囲3x3の相手石もすべて爆破自色化！
  let exploded: Position[] = [];
  if (isBomb) {
    exploded = getBombExplodedPositions(board, row, col, player, rule, unlocked);
    for (const pos of exploded) {
      nextBoard[pos.row][pos.col] = player;
    }
  }

  // 統合反転リスト（重複除去）
  const allFlippedMap = new Map<string, Position>();
  for (const p of [...standardFlipped, ...exploded]) {
    allFlippedMap.set(`${p.row},${p.col}`, p);
  }
  const flipped = Array.from(allFlippedMap.values());

  // 四隅拡張判定
  const newZone = checkNewlyUnlockedZone(row, col, rule, unlocked);
  const nextUnlocked = { ...unlocked };
  if (newZone) {
    nextUnlocked[newZone] = true;
  }

  return {
    nextBoard,
    flipped,
    exploded,
    nextUnlocked,
    newZoneUnlocked: newZone
  };
};

/**
 * 現在の石数をカウント
 */
export const countScore = (
  board: CellValue[][],
  rule: RuleType,
  unlocked: UnlockedZones
): Score => {
  let black = 0;
  let white = 0;

  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      if (isCellActive(r, c, rule, unlocked)) {
        if (board[r][c] === 'black') black++;
        else if (board[r][c] === 'white') white++;
      }
    }
  }

  return { black, white };
};

/**
 * ゲーム終了判定
 */
export const isGameOver = (
  board: CellValue[][],
  rule: RuleType,
  unlocked: UnlockedZones
): boolean => {
  const blackMoves = getValidMoves(board, 'black', rule, unlocked);
  const whiteMoves = getValidMoves(board, 'white', rule, unlocked);
  return blackMoves.length === 0 && whiteMoves.length === 0;
};

/**
 * 勝者を判定
 */
export const getWinner = (
  board: CellValue[][],
  rule: RuleType,
  unlocked: UnlockedZones
): Player | 'draw' => {
  const score = countScore(board, rule, unlocked);
  if (score.black > score.white) return 'black';
  if (score.white > score.black) return 'white';
  return 'draw';
};
