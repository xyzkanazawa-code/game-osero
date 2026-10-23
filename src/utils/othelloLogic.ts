import {
  CellValue,
  CellModifiers,
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

// 初期スキル数
export const createInitialSkills = (): { black: PlayerSkills; white: PlayerSkills } => ({
  black: { shield: 1, colorBomb: 1, timeStop: 1, reverse: 1 },
  white: { shield: 1, colorBomb: 1, timeStop: 1, reverse: 1 }
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
export const createInitialBoard = (rule: RuleType = 'classic'): CellValue[][] => {
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
 * 初期アンロック状態
 */
export const createInitialUnlockedZones = (rule: RuleType): UnlockedZones => {
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
} => {
  const standardFlipped = getFlippedPositions(board, row, col, player, rule, unlocked, modifiers);
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
    exploded = getBombExplodedPositions(board, row, col, player, rule, unlocked, modifiers);
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
    nextUnlocked[newZone.key] = true;
  }

  return {
    nextBoard,
    flipped,
    exploded,
    nextUnlocked,
    newZoneUnlocked: newZone
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
          const isGold = modifiers?.[`${r},${c}`]?.isGold;
          const points = isGold ? 3 : 1;
          if (val === 'black') black += points;
          else if (val === 'white') white += points;
        }
      }
    }
  }

  return { black, white };
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
        // シールド石は無効化されない
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
  modifiers?: CellModifiers
): { nextBoard: CellValue[][]; changedPositions: Position[] } => {
  const nextBoard = board.map((r) => [...r]);
  const changedPositions: Position[] = [];

  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      const val = nextBoard[r][c];
      if (val !== null) {
        // シールド石であっても全反転は効くか？（ゲームとして盛り上がるため全反転はすべてをひっくり返す）
        nextBoard[r][c] = val === 'black' ? 'white' : 'black';
        changedPositions.push({ row: r, col: c });
      }
    }
  }

  return { nextBoard, changedPositions };
};

/**
 * 🎲 天変地異ルーレットイベントの実行
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
} => {
  const nextBoard = board.map((r) => [...r]);
  const nextModifiers = { ...modifiers };
  const affectedPositions: Position[] = [];
  let message = '';

  switch (event) {
    case 'gale': {
      // 突風: ランダムな1方向（上・下・左・右）へ石が1マスズレる
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

      for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
          if (nextBoard[r][c] !== null) {
            const nr = r + dr;
            const nc = c + dc;
            if (isCellActive(nr, nc, rule, unlocked)) {
              tempBoard[nr][nc] = nextBoard[r][c];
              if (nextModifiers[`${r},${c}`]) {
                tempMods[`${nr},${nc}`] = nextModifiers[`${r},${c}`];
              }
              affectedPositions.push({ row: nr, col: nc });
            }
          }
        }
      }

      // ボードとモディファイアを更新
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
      // 日食: 盤面の白黒が全反転！
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
      // 落雷: 石のある場所からランダムに1〜2箇所直撃し、相手色に強制反転
      const occupied: Position[] = [];
      for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
          if (nextBoard[r][c] !== null && isCellActive(r, c, rule, unlocked)) {
            occupied.push({ row: r, col: c });
          }
        }
      }
      if (occupied.length > 0) {
        const targetCount = Math.min(2, occupied.length);
        const shuffled = [...occupied].sort(() => Math.random() - 0.5);
        for (let i = 0; i < targetCount; i++) {
          const pos = shuffled[i];
          const curr = nextBoard[pos.row][pos.col]!;
          nextBoard[pos.row][pos.col] = curr === 'black' ? 'white' : 'black';
          affectedPositions.push(pos);
        }
        message = `⚡ 盤面に落雷が直撃！${targetCount}箇所の石が反転した！`;
      } else {
        message = '⚡ 盤面に落雷が落ちたが、石がなかった！';
      }
      break;
    }

    case 'midas': {
      // 黄金変異: 石のある場所からランダムに2箇所が「黄金石（3点）」に変異！
      const occupied: Position[] = [];
      for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
          if (nextBoard[r][c] !== null && isCellActive(r, c, rule, unlocked)) {
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
          nextModifiers[key] = { ...(nextModifiers[key] || {}), isGold: true };
          affectedPositions.push(pos);
        }
        message = `💰 黄金変異！ランダムな${targetCount}箇所の石が【黄金石（3点）】に変化！`;
      } else {
        message = '💰 黄金の光が降り注いだが、石がなかった！';
      }
      break;
    }

    case 'peace':
    default:
      message = '🕊️ 天変地異ルーレット: 平穏な風が吹き抜けた（何も起こらなかった）';
      break;
  }

  return { nextBoard, nextModifiers, affectedPositions, message };
};
