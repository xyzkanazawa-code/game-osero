import {
  CellValue,
  CellModifiers,
  Mission,
  Move,
  Player,
  PlayerSkills,
  Position,
  RouletteEvent,
  RuleType,
  Score,
  SkillType,
  UnlockedZones
} from '../types/othello';

// グリッドサイズ: 12x12 (中央8x8 + 第1層10x10 + 第2層12x12)
export const GRID_SIZE = 12;
export const OFFSET = 2; // 中央8x8は行2..9, 列2..9

// 初期スキル数（5種類すべて1回ずつ使える！）
export const createInitialSkills = (): { black: PlayerSkills; white: PlayerSkills } => ({
  black: { shield: 1, colorBomb: 1, timeStop: 1, reverse: 1, trap: 1 },
  white: { shield: 1, colorBomb: 1, timeStop: 1, reverse: 1, trap: 1 }
});

// 8方向ベクトル
export const DIRECTIONS: [number, number][] = [
  [-1, -1], [-1, 0], [-1, 1],
  [0, -1],           [0, 1],
  [1, -1],  [1, 0],  [1, 1]
];

// 元の8x8の4隅の座標（フェーズ1トリガー）
export const PHASE1_CORNERS = {
  topLeft: { row: 2, col: 2 },
  topRight: { row: 2, col: 9 },
  bottomLeft: { row: 9, col: 2 },
  bottomRight: { row: 9, col: 9 }
};

// 第1要塞の4隅の座標（フェーズ2トリガー）
export const PHASE2_CORNERS = {
  topLeft: { row: 1, col: 1 },
  topRight: { row: 1, col: 10 },
  bottomLeft: { row: 10, col: 1 },
  bottomRight: { row: 10, col: 10 }
};

// 🏰 第1段階（各角7マス: 横3 + 縦3 + 斜め角1）
export const FORTRESS_ZONE_PHASE1 = {
  topLeft: [
    { r: 1, c: 1 }, // 斜め角
    { r: 1, c: 2 }, { r: 1, c: 3 }, { r: 1, c: 4 }, // 上横3マス
    { r: 2, c: 1 }, { r: 3, c: 1 }, { r: 4, c: 1 }  // 左縦3マス
  ],
  topRight: [
    { r: 1, c: 10 }, // 斜め角
    { r: 1, c: 7 }, { r: 1, c: 8 }, { r: 1, c: 9 }, // 上横3マス
    { r: 2, c: 10 }, { r: 3, c: 10 }, { r: 4, c: 10 } // 右縦3マス
  ],
  bottomLeft: [
    { r: 10, c: 1 }, // 斜め角
    { r: 10, c: 2 }, { r: 10, c: 3 }, { r: 10, c: 4 }, // 下横3マス
    { r: 7, c: 1 }, { r: 8, c: 1 }, { r: 9, c: 1 }   // 左縦3マス
  ],
  bottomRight: [
    { r: 10, c: 10 }, // 斜め角
    { r: 10, c: 7 }, { r: 10, c: 8 }, { r: 10, c: 9 }, // 下横3マス
    { r: 7, c: 10 }, { r: 8, c: 10 }, { r: 9, c: 10 } // 右縦3マス
  ]
};

// 🔥 第2段階（各角5マス: マサご指定のA 横3 + 縦2）
export const FORTRESS_ZONE_PHASE2 = {
  topLeft: [
    { r: 0, c: 0 }, { r: 0, c: 1 }, { r: 0, c: 2 }, // 上横3マス
    { r: 1, c: 0 }, { r: 2, c: 0 }                  // 左縦2マス
  ],
  topRight: [
    { r: 0, c: 9 }, { r: 0, c: 10 }, { r: 0, c: 11 }, // 上横3マス
    { r: 1, c: 11 }, { r: 2, c: 11 }                  // 右縦2マス
  ],
  bottomLeft: [
    { r: 11, c: 0 }, { r: 11, c: 1 }, { r: 11, c: 2 }, // 下横3マス
    { r: 9, c: 0 }, { r: 10, c: 0 }                    // 左縦2マス
  ],
  bottomRight: [
    { r: 11, c: 9 }, { r: 11, c: 10 }, { r: 11, c: 11 }, // 下横3マス
    { r: 9, c: 11 }, { r: 10, c: 11 }                    // 右縦2マス
  ]
};

/**
 * 初期盤面の生成
 */
export const createInitialBoard = (_rule: RuleType = 'classic'): CellValue[][] => {
  const board: CellValue[][] = Array(GRID_SIZE)
    .fill(null)
    .map(() => Array(GRID_SIZE).fill(null));

  // 中央4石（行5,6 / 列5,6）
  board[5][5] = 'white';
  board[5][6] = 'black';
  board[6][5] = 'black';
  board[6][6] = 'white';

  return board;
};

/**
 * 初期盤面ギミック（👑キング石・❓ミステリーマス・🌀ワープホール）の生成
 */
export const createInitialModifiers = (rule: RuleType, enableGimmicks: boolean = true): CellModifiers => {
  if (rule === 'classic' && !enableGimmicks) {
    return {};
  }

  return {
    // 👑 キング石（初期配置の黒1個・白1個が王様石！1個5点！）
    '5,6': { isKing: true },
    '5,5': { isKing: true },

    // ❓ ミステリーマス（踏むと即座に天変地異ルーレット発動！）
    '3,3': { isMystery: true },
    '3,8': { isMystery: true },
    '8,3': { isMystery: true },
    '8,8': { isMystery: true },

    // 🌀 ワープホール（青ペア・オレンジペア：置くと反対側の周囲の敵石も共鳴反転！）
    '2,5': { warpGroup: 'blue' },
    '9,6': { warpGroup: 'blue' },
    '5,2': { warpGroup: 'orange' },
    '6,9': { warpGroup: 'orange' }
  };
};

/**
 * 初期アンロック状態
 */
export const createInitialUnlockedZones = (_rule: RuleType): UnlockedZones => {
  return {
    topLeft_1: false,
    topRight_1: false,
    bottomLeft_1: false,
    bottomRight_1: false,
    topLeft_2: false,
    topRight_2: false,
    bottomLeft_2: false,
    bottomRight_2: false
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

  // 1. 中央8x8（row 2..9, col 2..9）は常に有効
  if (row >= 2 && row <= 9 && col >= 2 && col <= 9) {
    return true;
  }

  // classic や bomb ルールの場合は中央8x8のみ
  if (rule === 'classic' || rule === 'bomb') return false;

  // 2. 第1段階ゾーン（各角7マス）
  if (unlocked.topLeft_1 && FORTRESS_ZONE_PHASE1.topLeft.some((p) => p.r === row && p.c === col)) return true;
  if (unlocked.topRight_1 && FORTRESS_ZONE_PHASE1.topRight.some((p) => p.r === row && p.c === col)) return true;
  if (unlocked.bottomLeft_1 && FORTRESS_ZONE_PHASE1.bottomLeft.some((p) => p.r === row && p.c === col)) return true;
  if (unlocked.bottomRight_1 && FORTRESS_ZONE_PHASE1.bottomRight.some((p) => p.r === row && p.c === col)) return true;

  // 3. 第2段階ゾーン（各角5マス: 横3+縦2）
  if (unlocked.topLeft_2 && FORTRESS_ZONE_PHASE2.topLeft.some((p) => p.r === row && p.c === col)) return true;
  if (unlocked.topRight_2 && FORTRESS_ZONE_PHASE2.topRight.some((p) => p.r === row && p.c === col)) return true;
  if (unlocked.bottomLeft_2 && FORTRESS_ZONE_PHASE2.bottomLeft.some((p) => p.r === row && p.c === col)) return true;
  if (unlocked.bottomRight_2 && FORTRESS_ZONE_PHASE2.bottomRight.some((p) => p.r === row && p.c === col)) return true;

  return false;
};

export const getOpponent = (player: Player): Player => {
  return player === 'black' ? 'white' : 'black';
};

export const getFlippedPositions = (
  board: CellValue[][],
  row: number,
  col: number,
  player: Player,
  rule: RuleType,
  unlocked: UnlockedZones,
  modifiers?: CellModifiers
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
      // 🛡️ シールド石（鉄壁石）は裏返らない
      const isShield = modifiers?.[`${r},${c}`]?.isShield;
      if (!isShield) {
        directionFlipped.push({ row: r, col: c });
      }
      r += dr;
      c += dc;
    }

    if (directionFlipped.length > 0 && isCellActive(r, c, rule, unlocked) && board[r][c] === player) {
      flippable.push(...directionFlipped);
    }
  }

  return flippable;
};

export const getBombExplodedPositions = (
  board: CellValue[][],
  row: number,
  col: number,
  player: Player,
  rule: RuleType,
  unlocked: UnlockedZones,
  modifiers?: CellModifiers
): Position[] => {
  const opponent = getOpponent(player);
  const exploded: Position[] = [];

  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      const r = row + dr;
      const c = col + dc;
      if (
        isCellActive(r, c, rule, unlocked) &&
        board[r][c] === opponent &&
        !modifiers?.[`${r},${c}`]?.isShield
      ) {
        exploded.push({ row: r, col: c });
      }
    }
  }

  return exploded;
};

export const getValidMoves = (
  board: CellValue[][],
  player: Player,
  rule: RuleType,
  unlocked: UnlockedZones,
  modifiers?: CellModifiers
): Move[] => {
  const moves: Move[] = [];

  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      if (isCellActive(r, c, rule, unlocked) && board[r][c] === null) {
        const flipped = getFlippedPositions(board, r, c, player, rule, unlocked, modifiers);
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
 * 着手によってアンロックされるゾーンを判定（第1段階 or 第2段階）
 */
export const checkNewlyUnlockedZone = (
  row: number,
  col: number,
  rule: RuleType,
  unlocked: UnlockedZones
): { key: keyof UnlockedZones; phase: 1 | 2 } | null => {
  if (rule !== 'fortress' && rule !== 'chaos') return null;

  // 1. 第1段階トリガー（元の8x8の角）
  if (row === PHASE1_CORNERS.topLeft.row && col === PHASE1_CORNERS.topLeft.col && !unlocked.topLeft_1) {
    return { key: 'topLeft_1', phase: 1 };
  }
  if (row === PHASE1_CORNERS.topRight.row && col === PHASE1_CORNERS.topRight.col && !unlocked.topRight_1) {
    return { key: 'topRight_1', phase: 1 };
  }
  if (row === PHASE1_CORNERS.bottomLeft.row && col === PHASE1_CORNERS.bottomLeft.col && !unlocked.bottomLeft_1) {
    return { key: 'bottomLeft_1', phase: 1 };
  }
  if (row === PHASE1_CORNERS.bottomRight.row && col === PHASE1_CORNERS.bottomRight.col && !unlocked.bottomRight_1) {
    return { key: 'bottomRight_1', phase: 1 };
  }

  // 2. 第2段階トリガー（第1要塞の角）
  if (row === PHASE2_CORNERS.topLeft.row && col === PHASE2_CORNERS.topLeft.col && unlocked.topLeft_1 && !unlocked.topLeft_2) {
    return { key: 'topLeft_2', phase: 2 };
  }
  if (row === PHASE2_CORNERS.topRight.row && col === PHASE2_CORNERS.topRight.col && unlocked.topRight_1 && !unlocked.topRight_2) {
    return { key: 'topRight_2', phase: 2 };
  }
  if (row === PHASE2_CORNERS.bottomLeft.row && col === PHASE2_CORNERS.bottomLeft.col && unlocked.bottomLeft_1 && !unlocked.bottomLeft_2) {
    return { key: 'bottomLeft_2', phase: 2 };
  }
  if (row === PHASE2_CORNERS.bottomRight.row && col === PHASE2_CORNERS.bottomRight.col && unlocked.bottomRight_1 && !unlocked.bottomRight_2) {
    return { key: 'bottomRight_2', phase: 2 };
  }

  return null;
};

export const applyMove = (
  board: CellValue[][],
  row: number,
  col: number,
  player: Player,
  rule: RuleType,
  unlocked: UnlockedZones,
  isBomb: boolean = false,
  modifiers?: CellModifiers
): {
  nextBoard: CellValue[][];
  flipped: Position[];
  exploded: Position[];
  nextUnlocked: UnlockedZones;
  newZoneUnlocked: { key: keyof UnlockedZones; phase: 1 | 2 } | null;
  triggeredMystery: boolean;
  triggeredWarp: 'blue' | 'orange' | null;
  triggeredTrapBy: Player | null;
  nextModifiers: CellModifiers;
} => {
  const standardFlipped = getFlippedPositions(board, row, col, player, rule, unlocked, modifiers);
  if (standardFlipped.length === 0) {
    throw new Error(`無効な着手です: (${row}, ${col}) for ${player}`);
  }

  const nextBoard: CellValue[][] = board.map((r) => [...r]);
  const nextModifiers: CellModifiers = { ...(modifiers || {}) };
  nextBoard[row][col] = player;

  for (const pos of standardFlipped) {
    nextBoard[pos.row][pos.col] = player;
  }

  let exploded: Position[] = [];
  if (isBomb) {
    exploded = getBombExplodedPositions(board, row, col, player, rule, unlocked, modifiers);
    for (const pos of exploded) {
      nextBoard[pos.row][pos.col] = player;
    }
  }

  const cellKey = `${row},${col}`;
  const cellMod = nextModifiers[cellKey] || {};

  // ❓ ミステリーマス判定
  let triggeredMystery = false;
  if (cellMod.isMystery) {
    triggeredMystery = true;
    nextModifiers[cellKey] = { ...cellMod, isMystery: false };
  }

  // 🌀 ワープホール共鳴判定（同じ色の反対側ワープの周囲8マスの敵石も共鳴反転！）
  let triggeredWarp: 'blue' | 'orange' | null = null;
  const warpFlipped: Position[] = [];
  if (cellMod.warpGroup) {
    triggeredWarp = cellMod.warpGroup;
    const opponent = getOpponent(player);
    // ペアのワープ座標を探す
    Object.entries(nextModifiers).forEach(([k, mod]) => {
      if (k !== cellKey && mod.warpGroup === cellMod.warpGroup) {
        const [wr, wc] = k.split(',').map(Number);
        // ワープ先のマス自体が相手石なら反転
        if (nextBoard[wr][wc] === opponent && !nextModifiers[k]?.isShield) {
          nextBoard[wr][wc] = player;
          warpFlipped.push({ row: wr, col: wc });
        }
        // ワープ先の周囲8マスの相手石も共鳴反転！
        for (let dr = -1; dr <= 1; dr++) {
          for (let dc = -1; dc <= 1; dc++) {
            const nr = wr + dr;
            const nc = wc + dc;
            if (
              isCellActive(nr, nc, rule, unlocked) &&
              nextBoard[nr][nc] === opponent &&
              !nextModifiers[`${nr},${nc}`]?.isShield
            ) {
              nextBoard[nr][nc] = player;
              warpFlipped.push({ row: nr, col: nc });
            }
          }
        }
      }
    });
  }

  // 🕸️ ステルス地雷（トラップ）発動判定！
  let triggeredTrapBy: Player | null = null;
  const trapFlipped: Position[] = [];
  if (cellMod.trapOwner && cellMod.trapOwner !== player) {
    triggeredTrapBy = cellMod.trapOwner;
    // 地雷爆発！着弾点と周囲3x3がすべて罠を仕掛けたプレイヤーの色になる！
    nextBoard[row][col] = triggeredTrapBy;
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        const nr = row + dr;
        const nc = col + dc;
        if (
          isCellActive(nr, nc, rule, unlocked) &&
          nextBoard[nr][nc] !== null &&
          !nextModifiers[`${nr},${nc}`]?.isShield
        ) {
          nextBoard[nr][nc] = triggeredTrapBy;
          trapFlipped.push({ row: nr, col: nc });
        }
      }
    }
    nextModifiers[cellKey] = { ...nextModifiers[cellKey], trapOwner: undefined };
  }

  const allFlippedMap = new Map<string, Position>();
  for (const p of [...standardFlipped, ...exploded, ...warpFlipped, ...trapFlipped]) {
    allFlippedMap.set(`${p.row},${p.col}`, p);
  }
  const flipped = Array.from(allFlippedMap.values());

  const newZone = checkNewlyUnlockedZone(row, col, rule, unlocked);
  const nextUnlocked = { ...unlocked };
  if (newZone) {
    nextUnlocked[newZone.key] = true;
  }

  return {
    nextBoard,
    flipped,
    exploded,
    nextUnlocked,
    newZoneUnlocked: newZone,
    triggeredMystery,
    triggeredWarp,
    triggeredTrapBy,
    nextModifiers
  };
};

export const countScore = (
  board: CellValue[][],
  rule: RuleType,
  unlocked: UnlockedZones,
  modifiers?: CellModifiers
): Score => {
  let black = 0;
  let white = 0;

  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      if (isCellActive(r, c, rule, unlocked)) {
        const val = board[r][c];
        if (val) {
          const mod = modifiers?.[`${r},${c}`];
          let points = 1;
          if (mod?.isKing) points += 4;  // 👑 キング石は1個で5点！
          if (mod?.isGold) points += 2;  // 💰 黄金石は1個で3点！
          if (mod?.isSkull) points = -2; // 💀 ドクロ石は-2点！

          if (val === 'black') black += points;
          else if (val === 'white') white += points;
        }
      }
    }
  }

  return {
    black: Math.max(0, black),
    white: Math.max(0, white)
  };
};

export const isGameOver = (
  board: CellValue[][],
  rule: RuleType,
  unlocked: UnlockedZones,
  modifiers?: CellModifiers
): boolean => {
  const blackMoves = getValidMoves(board, 'black', rule, unlocked, modifiers);
  const whiteMoves = getValidMoves(board, 'white', rule, unlocked, modifiers);
  return blackMoves.length === 0 && whiteMoves.length === 0;
};

export const getWinner = (
  board: CellValue[][],
  rule: RuleType,
  unlocked: UnlockedZones,
  modifiers?: CellModifiers
): Player | 'draw' => {
  const score = countScore(board, rule, unlocked, modifiers);
  if (score.black > score.white) return 'black';
  if (score.white > score.black) return 'white';
  return 'draw';
};

/**
 * 🎨 カラーボム発動: 指定マスを中心に3×3をプレイヤーの色に強制変換
 */
export const executeColorBomb = (
  board: CellValue[][],
  centerR: number,
  centerC: number,
  player: Player,
  rule: RuleType,
  unlocked: UnlockedZones,
  modifiers?: CellModifiers
): { nextBoard: CellValue[][]; changedPositions: Position[] } => {
  const nextBoard = board.map((r) => [...r]);
  const changedPositions: Position[] = [];

  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      const r = centerR + dr;
      const c = centerC + dc;
      if (isCellActive(r, c, rule, unlocked)) {
        if (!modifiers?.[`${r},${c}`]?.isShield) {
          nextBoard[r][c] = player;
          changedPositions.push({ row: r, col: c });
        }
      }
    }
  }

  return { nextBoard, changedPositions };
};

/**
 * 🔄 全反転（リバース）発動: 盤面上の全石の白黒を入れ替える
 */
export const executeBoardReverse = (
  board: CellValue[][],
  _modifiers?: CellModifiers
): { nextBoard: CellValue[][]; changedPositions: Position[] } => {
  const nextBoard = board.map((r) => [...r]);
  const changedPositions: Position[] = [];

  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      const val = nextBoard[r][c];
      if (val !== null) {
        nextBoard[r][c] = val === 'black' ? 'white' : 'black';
        changedPositions.push({ row: r, col: c });
      }
    }
  }

  return { nextBoard, changedPositions };
};

/**
 * 🎲 天変地異ルーレットイベントの実行（全10種！）
 */
export const executeRouletteEvent = (
  board: CellValue[][],
  rule: RuleType,
  unlocked: UnlockedZones,
  event: RouletteEvent,
  modifiers: CellModifiers
): {
  nextBoard: CellValue[][];
  nextModifiers: CellModifiers;
  affectedPositions: Position[];
  message: string;
  grantBonus?: boolean;
} => {
  const nextBoard = board.map((r) => [...r]);
  const nextModifiers = { ...modifiers };
  const affectedPositions: Position[] = [];
  let message = '';
  let grantBonus = false;

  switch (event) {
    case 'gale': {
      // 🌪️ 突風: ランダムな1方向へ石が1マスズレる
      const dirs: [number, number, string][] = [
        [-1, 0, '北（上）'],
        [1, 0, '南（下）'],
        [0, -1, '西（左）'],
        [0, 1, '東（右）']
      ];
      const [dr, dc, dirName] = dirs[Math.floor(Math.random() * dirs.length)];
      message = `🌪️ 突風が吹き荒れた！すべての石が【${dirName}】へ1マス移動！`;

      const tempBoard: CellValue[][] = Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(null));
      const tempMods: CellModifiers = {};

      // ワープやミステリーマスなどの地形属性はそのまま保持
      Object.entries(nextModifiers).forEach(([k, mod]) => {
        if (mod.warpGroup || mod.isMystery || mod.trapOwner) {
          tempMods[k] = {
            warpGroup: mod.warpGroup,
            isMystery: mod.isMystery,
            trapOwner: mod.trapOwner
          };
        }
      });

      for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
          if (nextBoard[r][c] !== null) {
            const nr = r + dr;
            const nc = c + dc;
            const oldMod = nextModifiers[`${r},${c}`];
            if (isCellActive(nr, nc, rule, unlocked)) {
              tempBoard[nr][nc] = nextBoard[r][c];
              if (oldMod) {
                tempMods[`${nr},${nc}`] = {
                  ...(tempMods[`${nr},${nc}`] || {}),
                  isShield: oldMod.isShield,
                  isGold: oldMod.isGold,
                  isSkull: oldMod.isSkull,
                  isKing: oldMod.isKing
                };
              }
              affectedPositions.push({ row: nr, col: nc });
            } else {
              // 移動先が盤面外の場合は元の場所に留まる（消滅防止）
              tempBoard[r][c] = nextBoard[r][c];
              if (oldMod) {
                tempMods[`${r},${c}`] = {
                  ...(tempMods[`${r},${c}`] || {}),
                  isShield: oldMod.isShield,
                  isGold: oldMod.isGold,
                  isSkull: oldMod.isSkull,
                  isKing: oldMod.isKing
                };
              }
            }
          }
        }
      }

      for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
          if (isCellActive(r, c, rule, unlocked)) {
            nextBoard[r][c] = tempBoard[r][c];
          }
        }
      }
      Object.keys(nextModifiers).forEach((k) => delete nextModifiers[k]);
      Object.assign(nextModifiers, tempMods);
      break;
    }

    case 'eclipse': {
      // 🌘 日食: 盤面の白黒が全反転！
      message = '🌘 皆既日食が発生！光と闇が入れ替わった！（白黒全反転）';
      for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
          if (nextBoard[r][c] !== null && isCellActive(r, c, rule, unlocked)) {
            nextBoard[r][c] = nextBoard[r][c] === 'black' ? 'white' : 'black';
            affectedPositions.push({ row: r, col: c });
          }
        }
      }
      break;
    }

    case 'lightning': {
      // ⚡ 落雷: 石のある場所からランダムに2〜3箇所直撃し反転
      const occupied: Position[] = [];
      for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
          if (nextBoard[r][c] !== null && isCellActive(r, c, rule, unlocked)) {
            occupied.push({ row: r, col: c });
          }
        }
      }
      if (occupied.length > 0) {
        const targetCount = Math.min(3, occupied.length);
        const shuffled = [...occupied].sort(() => Math.random() - 0.5);
        for (let i = 0; i < targetCount; i++) {
          const pos = shuffled[i];
          const curr = nextBoard[pos.row][pos.col]!;
          nextBoard[pos.row][pos.col] = curr === 'black' ? 'white' : 'black';
          affectedPositions.push(pos);
        }
        message = `⚡ 盤面に落雷が直撃！${targetCount}箇所の石が感電反転した！`;
      } else {
        message = '⚡ 盤面に落雷が落ちたが、石がなかった！';
      }
      break;
    }

    case 'midas': {
      // 💰 黄金変異: ランダムな2〜3箇所が「黄金石（3点）」に変異！
      const occupied: Position[] = [];
      for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
          if (nextBoard[r][c] !== null && isCellActive(r, c, rule, unlocked)) {
            occupied.push({ row: r, col: c });
          }
        }
      }
      if (occupied.length > 0) {
        const targetCount = Math.min(3, occupied.length);
        const shuffled = [...occupied].sort(() => Math.random() - 0.5);
        for (let i = 0; i < targetCount; i++) {
          const pos = shuffled[i];
          const key = `${pos.row},${pos.col}`;
          nextModifiers[key] = { ...(nextModifiers[key] || {}), isGold: true, isSkull: false };
          affectedPositions.push(pos);
        }
        message = `💰 黄金変異！ランダムな${targetCount}箇所の石が【黄金石（3点）】に変化！`;
      } else {
        message = '💰 黄金の光が降り注いだが、石がなかった！';
      }
      break;
    }

    case 'meteor': {
      // ☄️ 隕石落下: 盤面の石が2〜3個吹き飛んで空きマスに戻る（ただし残り4個以下の時は発生しない）
      const occupied: Position[] = [];
      for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
          if (
            nextBoard[r][c] !== null &&
            isCellActive(r, c, rule, unlocked) &&
            !nextModifiers[`${r},${c}`]?.isKing &&
            !nextModifiers[`${r},${c}`]?.isShield
          ) {
            occupied.push({ row: r, col: c });
          }
        }
      }
      if (occupied.length > 4) {
        const targetCount = Math.min(3, occupied.length - 4);
        const shuffled = [...occupied].sort(() => Math.random() - 0.5);
        for (let i = 0; i < targetCount; i++) {
          const pos = shuffled[i];
          nextBoard[pos.row][pos.col] = null;
          const key = `${pos.row},${pos.col}`;
          if (nextModifiers[key]) {
            nextModifiers[key] = {
              ...nextModifiers[key],
              isGold: false,
              isSkull: false
            };
          }
          affectedPositions.push(pos);
        }
        message = `☄️ 巨大隕石が落下！${targetCount}箇所の石が吹き飛んで空きマスに戻った！`;
      } else {
        message = '☄️ 隕石が接近したが、大気圏で燃え尽きた！';
      }
      break;
    }

    case 'whirlpool': {
      // 🌀 大渦潮: 中央4x4エリア（行4..7, 列4..7）が時計回りに90度回転！
      const temp4x4: CellValue[][] = Array(4).fill(null).map(() => Array(4).fill(null));
      const tempMod4x4: (CellModifiers[string] | undefined)[][] = Array(4).fill(null).map(() => Array(4).fill(undefined));

      for (let i = 0; i < 4; i++) {
        for (let j = 0; j < 4; j++) {
          temp4x4[j][3 - i] = nextBoard[4 + i][4 + j];
          tempMod4x4[j][3 - i] = nextModifiers[`${4 + i},${4 + j}`];
        }
      }

      for (let i = 0; i < 4; i++) {
        for (let j = 0; j < 4; j++) {
          nextBoard[4 + i][4 + j] = temp4x4[i][j];
          const key = `${4 + i},${4 + j}`;
          if (tempMod4x4[i][j]) {
            nextModifiers[key] = { ...tempMod4x4[i][j] };
          } else {
            delete nextModifiers[key];
          }
          if (nextBoard[4 + i][4 + j] !== null) {
            affectedPositions.push({ row: 4 + i, col: 4 + j });
          }
        }
      }
      message = '🌀 大渦潮が発生！盤面中央の4×4エリアが時計回りに90度大回転した！';
      break;
    }

    case 'treasure': {
      // 🎁 福袋: お互いに爆弾石+1 ＆ スキル+1支給！さらに盤面に？ボックスも2個出現！
      grantBonus = true;
      const emptyCells: Position[] = [];
      for (let r = 2; r <= 9; r++) {
        for (let c = 2; c <= 9; c++) {
          if (nextBoard[r][c] === null && !nextModifiers[`${r},${c}`]?.isMystery) {
            emptyCells.push({ row: r, col: c });
          }
        }
      }
      if (emptyCells.length > 0) {
        const shuffled = [...emptyCells].sort(() => Math.random() - 0.5);
        for (let i = 0; i < Math.min(2, shuffled.length); i++) {
          const p = shuffled[i];
          nextModifiers[`${p.row},${p.col}`] = {
            ...(nextModifiers[`${p.row},${p.col}`] || {}),
            isMystery: true
          };
          affectedPositions.push(p);
        }
      }
      message = '🎁 天からの福袋！両プレイヤーに【💣爆弾＋1＆🃏スキル＋1】が支給され、盤面に❓ボックスが出現！';
      break;
    }

    case 'biohazard': {
      // 🦠 バイオハザード: ランダムな石が周囲の敵石を感染同化！
      const occupied: Position[] = [];
      for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
          if (nextBoard[r][c] !== null && isCellActive(r, c, rule, unlocked)) {
            occupied.push({ row: r, col: c });
          }
        }
      }
      if (occupied.length > 0) {
        const source = occupied[Math.floor(Math.random() * occupied.length)];
        const virusColor = nextBoard[source.row][source.col]!;
        let infectedCount = 0;
        for (let dr = -1; dr <= 1; dr++) {
          for (let dc = -1; dc <= 1; dc++) {
            const nr = source.row + dr;
            const nc = source.col + dc;
            if (
              isCellActive(nr, nc, rule, unlocked) &&
              nextBoard[nr][nc] !== null &&
              nextBoard[nr][nc] !== virusColor &&
              !nextModifiers[`${nr},${nc}`]?.isShield
            ) {
              nextBoard[nr][nc] = virusColor;
              affectedPositions.push({ row: nr, col: nc });
              infectedCount++;
            }
          }
        }
        message =
          infectedCount > 0
            ? `🦠 バイオハザード発生！ウイルスが拡散し、周囲${infectedCount}個の石が${virusColor === 'black' ? '黒' : '白'}に感染変異した！`
            : '🦠 バイオハザードが発生したが、周囲に感染する石がなかった！';
      }
      break;
    }

    case 'skull': {
      // 💀 死神の宣告: ランダムな石2個が「💀ドクロ石（-2点）」に変異！
      const occupied: Position[] = [];
      for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
          if (
            nextBoard[r][c] !== null &&
            isCellActive(r, c, rule, unlocked) &&
            !nextModifiers[`${r},${c}`]?.isKing
          ) {
            occupied.push({ row: r, col: c });
          }
        }
      }
      if (occupied.length > 0) {
        const targetCount = Math.min(2, occupied.length);
        const shuffled = [...occupied].sort(() => Math.random() - 0.5);
        for (let i = 0; i < targetCount; i++) {
          const pos = shuffled[i];
          const key = `${pos.row},${pos.col}`;
          nextModifiers[key] = { ...(nextModifiers[key] || {}), isSkull: true, isGold: false };
          affectedPositions.push(pos);
        }
        message = `💀 死神の宣告！${targetCount}個の石が【💀ドクロ石（−2点）】に変異！相手に裏返させて押し付けろ！`;
      } else {
        message = '💀 死神が通り過ぎたが、何も起きなかった！';
      }
      break;
    }

    case 'peace':
    default:
      message = '🕊️ 天変地異ルーレット: 平穏な風が吹き抜けた（何も起こらなかった）';
      break;
  }

  return { nextBoard, nextModifiers, affectedPositions, message, grantBonus };
};

/**
 * 📜 リアルタイム・ミッション（懸賞金クエスト）一覧と達成判定
 */
export const MISSION_POOL: Mission[] = [
  {
    id: 'flip_3',
    title: '⚡ 一撃3枚返し！',
    desc: '1回の着手で3枚以上の石を同時に裏返せ！',
    rewardText: '💣 爆弾石 +1',
    rewardType: 'bomb'
  },
  {
    id: 'gimmick_step',
    title: '🌀 ギミックハンター！',
    desc: '盤面の「❓ミステリー」または「🌀ワープ」マスに石を置け！',
    rewardText: '⚡ 二連撃スキル +1',
    rewardType: 'timeStop'
  },
  {
    id: 'outer_edge',
    title: '🧱 外周ライン制圧！',
    desc: '盤面の端（外周ライン）または🏰要塞マスに石を置け！',
    rewardText: '🛡️ 鉄壁石スキル +1',
    rewardType: 'shield'
  },
  {
    id: 'flip_4',
    title: '🔥 大量4枚返し！',
    desc: '1回の着手で4枚以上の石を一気に裏返せ！',
    rewardText: '🎨 カラーボム +1',
    rewardType: 'colorBomb'
  },
  {
    id: 'diagonal_strike',
    title: '👑 クロスライン進撃！',
    desc: '対角線上のマスまたは角マスに石を置け！',
    rewardText: '🕸️ ステルス地雷 +1',
    rewardType: 'trap'
  }
];

export const checkMissionCompleted = (
  mission: Mission,
  row: number,
  col: number,
  flippedCount: number,
  triggeredMystery: boolean,
  triggeredWarp: 'blue' | 'orange' | null
): boolean => {
  switch (mission.id) {
    case 'flip_3':
      return flippedCount >= 3;
    case 'gimmick_step':
      return triggeredMystery || triggeredWarp !== null;
    case 'outer_edge':
      return row <= 2 || row >= 9 || col <= 2 || col >= 9;
    case 'flip_4':
      return flippedCount >= 4;
    case 'diagonal_strike':
      return row === col || row + col === GRID_SIZE - 1;
    default:
      return false;
  }
};
