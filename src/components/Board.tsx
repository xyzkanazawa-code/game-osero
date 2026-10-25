import React, { useState } from 'react';
import { CellModifiers, CellValue, Move, Player, Position, RuleType, SkillType, UnlockedZones } from '../types/othello';
import { Cell } from './Cell';
import { FORTRESS_ZONE_PHASE1, FORTRESS_ZONE_PHASE2, isCellActive } from '../utils/othelloLogic';

interface BoardProps {
  board: CellValue[][];
  rule: RuleType;
  unlocked: UnlockedZones;
  modifiers?: CellModifiers;
  validMoves: Move[];
  lastMove: Position | null;
  isLastMoveBomb?: boolean;
  isBombShaking?: boolean;
  flippingPositions: Set<string>;
  newlyUnlockedZone: { key: keyof UnlockedZones; phase: 1 | 2 } | null;
  turn: Player;
  myViewerColor?: Player;
  activeSkill?: SkillType | null;
  onCellClick: (row: number, col: number) => void;
  disabled: boolean;
}

const CLASSIC_COLS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

const LEGEND_ITEMS = [
  {
    id: 'king',
    icon: '👑',
    label: '王様(5点)',
    desc: '【👑 キング石（王様石）】1個で5点分の価値がある王様石！相手に挟まれると奪われるので、死守するか相手の王様を奪いましょう！（🛡️鉄壁石と組み合わせると最強）'
  },
  {
    id: 'mystery',
    icon: '❓',
    label: '？ボックス',
    desc: '【❓ ミステリーマス】このマスに石を置くと、その場で「🎲天変地異ルーレット」が即座に発動します！（平穏が出ない特別ボーナス抽選！）'
  },
  {
    id: 'warp',
    icon: '🌀',
    label: 'ワープ共鳴',
    desc: '【🌀 次元ワープホール】青同士・オレンジ同士が繋がっています。ワープマスに石を置くと、反対側の同じ色のワープ周囲8マスの敵石も一気に共鳴して自分の色に裏返ります！'
  },
  {
    id: 'fortress',
    icon: '🏰',
    label: '2段要塞',
    desc: '【🏰 第1要塞 ＆ ⚡第2要塞】🏰マークの角を取ると外側に7マスの第1要塞が出現！さらにその角の⚡マークを取ると最果ての5マス第2要塞が解放されます！'
  },
  {
    id: 'gold_skull',
    icon: '💰/💀',
    label: '黄金/ドクロ',
    desc: '【💰黄金石(＋3点) ／ 💀ドクロ石(−2点)】ルーレットで出現！💰黄金石は1個3点のお宝、💀ドクロ石は持っているとマイナス2点になる呪いの石です（相手に裏返させて押し付けよう！）。'
  },
  {
    id: 'shield_trap',
    icon: '🛡️/🕸️',
    label: '鉄壁/地雷',
    desc: '【🛡️鉄壁石 ／ 🕸️ステルス地雷】🛡️鉄壁石は絶対に裏返らない無敵の石！🕸️地雷は空きマスにこっそり仕掛け、相手が踏むと周囲3×3をドカンと自分の色に吹き飛ばします！'
  }
];

export const Board: React.FC<BoardProps> = ({
  board,
  rule,
  unlocked,
  modifiers,
  validMoves,
  lastMove,
  isLastMoveBomb = false,
  isBombShaking = false,
  flippingPositions,
  newlyUnlockedZone,
  myViewerColor = 'black',
  activeSkill = null,
  onCellClick,
  disabled
}) => {
  const [selectedLegendId, setSelectedLegendId] = useState<string | null>(null);

  const validMoveMap = new Map<string, number>();
  for (const m of validMoves) {
    validMoveMap.set(`${m.row},${m.col}`, m.flipped.length);
  }

  const is8x8 = rule === 'classic' || rule === 'bomb';
  const selectedLegend = LEGEND_ITEMS.find((item) => item.id === selectedLegendId);

  return (
    <div className={`w-full flex flex-col items-center justify-center my-0.5 select-none ${isBombShaking ? 'bomb-shake' : ''}`}>
      {/* 1. 通常 8x8 または 爆弾石 8x8 ルールの場合 */}
      {is8x8 ? (
        <div className="felt-board p-2 sm:p-3 w-full max-w-[min(96vw,440px)] flex flex-col box-border shadow-2xl">
          <div className="grid grid-cols-8 text-center text-[10px] sm:text-xs font-black text-emerald-950/80 mb-1 select-none">
            {CLASSIC_COLS.map((col) => (
              <div key={col}>{col}</div>
            ))}
          </div>

          <div className="grid grid-cols-8 w-full aspect-square border-2 border-emerald-950/70 rounded overflow-hidden bg-emerald-800/30">
            {Array.from({ length: 8 }, (_, rIdx) => {
              const r = rIdx + 2;
              return Array.from({ length: 8 }, (_, cIdx) => {
                const c = cIdx + 2;
                const posKey = `${r},${c}`;
                const isValid = validMoveMap.has(posKey);
                const flipCount = validMoveMap.get(posKey) || 0;
                const isLast = lastMove ? lastMove.row === r && lastMove.col === c : false;
                const isFlipping = flippingPositions.has(posKey);
                const mod = modifiers?.[posKey];
                const showTrap = mod?.trapOwner === myViewerColor;

                return (
                  <Cell
                    key={posKey}
                    row={r}
                    col={c}
                    value={board[r][c]}
                    isActive={true}
                    isFlipping={isFlipping}
                    flipTarget={isFlipping ? board[r][c] : null}
                    isLastMove={isLast}
                    isLastBomb={isLast && isLastMoveBomb}
                    isValidMove={isValid}
                    flipCount={flipCount}
                    modifier={mod}
                    showTrap={showTrap}
                    activeSkill={activeSkill}
                    onClick={() => onCellClick(r, c)}
                    disabled={disabled}
                  />
                );
              });
            })}
          </div>
        </div>
      ) : (
        /* 2. 🏰 2段階四隅拡張 (Fortress) または 全部盛り (Chaos) の場合: 12x12 */
        <div className="felt-board p-1.5 sm:p-2.5 w-full max-w-[min(96vw,440px)] flex flex-col box-border shadow-2xl relative">
          <div className="grid grid-cols-12 w-full aspect-square border-2 border-emerald-950/60 rounded overflow-hidden bg-slate-950/50">
            {board.map((rowArr, r) =>
              rowArr.map((cellValue, c) => {
                const posKey = `${r},${c}`;
                const active = isCellActive(r, c, rule, unlocked);
                const isValid = validMoveMap.has(posKey);
                const flipCount = validMoveMap.get(posKey) || 0;
                const isLast = lastMove ? lastMove.row === r && lastMove.col === c : false;
                const isFlipping = flippingPositions.has(posKey);
                const mod = modifiers?.[posKey];
                const showTrap = mod?.trapOwner === myViewerColor;

                let isNewlyUnlocked = false;
                if (newlyUnlockedZone) {
                  const { key, phase } = newlyUnlockedZone;
                  if (phase === 1) {
                    const zKey = key.replace('_1', '') as keyof typeof FORTRESS_ZONE_PHASE1;
                    if (FORTRESS_ZONE_PHASE1[zKey]?.some((p) => p.r === r && p.c === c)) isNewlyUnlocked = true;
                  } else if (phase === 2) {
                    const zKey = key.replace('_2', '') as keyof typeof FORTRESS_ZONE_PHASE2;
                    if (FORTRESS_ZONE_PHASE2[zKey]?.some((p) => p.r === r && p.c === c)) isNewlyUnlocked = true;
                  }
                }

                return (
                  <Cell
                    key={posKey}
                    row={r}
                    col={c}
                    value={cellValue}
                    isActive={active}
                    isFlipping={isFlipping}
                    flipTarget={isFlipping ? cellValue : null}
                    isLastMove={isLast}
                    isLastBomb={isLast && isLastMoveBomb}
                    isValidMove={isValid}
                    flipCount={flipCount}
                    isNewlyUnlocked={isNewlyUnlocked}
                    modifier={mod}
                    showTrap={showTrap}
                    activeSkill={activeSkill}
                    onClick={() => onCellClick(r, c)}
                    disabled={disabled}
                  />
                );
              })
            )}
          </div>
        </div>
      )}

      {/* 💡 盤面マーク早見バー（ボタンを押すとわかりやすい説明が表示！） */}
      <div className="w-full max-w-[440px] mt-1">
        <div className="flex items-center justify-between gap-1 bg-slate-900/80 border border-slate-800 rounded-lg px-1.5 py-1 overflow-x-auto">
          <span className="text-[9px] text-amber-400 font-black whitespace-nowrap">
            💡マーク説明:
          </span>
          <div className="flex items-center gap-1">
            {LEGEND_ITEMS.map((item) => {
              const isSelected = selectedLegendId === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelectedLegendId(isSelected ? null : item.id)}
                  className={`px-1.5 py-0.5 rounded text-[9px] font-bold flex items-center gap-0.5 whitespace-nowrap transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-amber-500 text-slate-950 font-black shadow-sm'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                  }`}
                >
                  <span>{item.icon}</span>
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 選択されたマークの詳細ポップアップ説明 */}
        {selectedLegend && (
          <div className="mt-1 p-2 bg-slate-900/95 border border-amber-500/60 rounded-lg text-[11px] text-amber-100 leading-relaxed flex items-start justify-between gap-2 shadow-lg animate-fade-in">
            <span>{selectedLegend.desc}</span>
            <button
              type="button"
              onClick={() => setSelectedLegendId(null)}
              className="text-slate-400 hover:text-white font-bold px-1 cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
