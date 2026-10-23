import {
  CellValue,
  Move,
  Player,
  Position,
  RuleType,
  Score,
  UnlockedZones
} from '../types/othello';

// グリッドサイズ: 中央8x8 + 周囲1周（各角7マス）を内包する 10x10
export const GRID_SIZE = 10;
export const OFFSET = 1; // 中央8x8は行1..8, 列1..8

// 8方向ベクトル [dRow, dCol]
export const DIRECTIONS: [number, number][] = [
  [-1, -1], [-1, 0], [-1, 1],
  [0, -1],           [0, 1],
  [1, -1],  [1, 0],  [1, 1]
];

// 元の8x8の4隅の座標（10x10座標系内）
export const ORIGINAL_CORNERS = {
  topLeft: { row: 1, col: 1 },
  topRight: { row: 1, col: 8 },
  bottomLeft: { row: 8, col: 1 },
  bottomRight: { row: 8, col: 8 }
};

// 各角7マス（横3 + 縦3 + 斜め角1）の座標リスト
export const FORTRESS_ZONE_CELLS = {
  topLeft: [
    { r: 0, c: 0 }, // 斜め角
    { r: 0, c: 1 }, { r: 0, c: 2 }, { r: 0, c: 3 }, // 上横3マス
    { r: 1, c: 0 }, { r: 2, c: 0 }, { r: 3, c: 0 }  // 左縦3マス
  ],
  topRight: [
    { r: 0, c: 9 }, // 斜め角
    { r: 0, c: 6 }, { r: 0, c: 7 }, { r: 0, c: 8 }, // 上横3マス
    { r: 1, c: 9 }, { r: 2, c: 9 }, { r: 3, c: 9 }  // 右縦3マス
  ],
  bottomLeft: [
    { r: 9, c: 0 }, // 斜め角
    { r: 9, c: 1 }, { r: 9, c: 2 }, { r: 9, c: 3 }, // 下横3マス
    { r: 6, c: 0 }, { r: 7, c: 0 }, { r: 8, c: 0 }  // 左縦3マス
  ],
  bottomRight: [
    { r: 9, c: 9 }, // 斜め角
    { r: 9, c: 6 }, { r: 9, c: 7 }, { r: 9, c: 8 }, // 下横3マス
    { r: 6, c: 9 }, { r: 7, c: 9 }, { r: 8, c: 9 }  // 右縦3マス
  ]
};

/**
 * 初期盤面の生成
 */
export const createInitialBoard = (rule: RuleType = 'classic'): CellValue[][] => {
  const board: CellValue[][] = Array(GRID_SIZE)
    .fill(null)
    .map(() => Array(GRID_SIZE).fill(null));

  // 中央4石（行4,5 / 列4,5）
  board[4][4] = 'white';
  board[4][5] = 'black';
  board[5][4] = 'black';
  board[5][5] = 'white';

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

  // 1. 中央8x8（row 1..8, col 1..8）は常に有効
  if (row >= 1 && row <= 8 && col >= 1 && col <= 8) {
    return true;
  }

  // classic や bomb ルール（通常サイズ）の場合は中央8x8のみ
  if (rule === 'classic' || rule === 'bomb') return false;

  // 2. 解放された四隅7マス（fortress または chaos）
  if (unlocked.topLeft && FORTRESS_ZONE_CELLS.topLeft.some((p) => p.r === row && p.c === col)) return true;
  if (unlocked.topRight && FORTRESS_ZONE_CELLS.topRight.some((p) => p.r === row && p.c === col)) return true;
  if (unlocked.bottomLeft && FORTRESS_ZONE_CELLS.bottomLeft.some((p) => p.r === row && p.c === col)) return true;
  if (unlocked.bottomRight && FORTRESS_ZONE_CELLS.bottomRight.some((p) => p.r === row && p.c === col)) return true;

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
 * 石を配置して盤面を更新
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

  for (const pos of standardFlipped) {
    nextBoard[pos.row][pos.col] = player;
  }

  let exploded: Position[] = [];
  if (isBomb) {
    exploded = getBombExplodedPositions(board, row, col, player, rule, unlocked);
    for (const pos of exploded) {
      nextBoard[pos.row][pos.col] = player;
    }
  }

  const allFlippedMap = new Map<string, Position>();
  for (const p of [...standardFlipped, ...exploded]) {
    allFlippedMap.set(`${p.row},${p.col}`, p);
  }
  const flipped = Array.from(allFlippedMap.values());

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
