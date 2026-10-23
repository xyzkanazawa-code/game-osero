import React from 'react';
import { CellValue, Move, Player, Position, RuleType, UnlockedZones } from '../types/othello';
import { Cell } from './Cell';
import { isCellActive } from '../utils/othelloLogic';

interface BoardProps {
  board: CellValue[][];
  rule: RuleType;
  unlocked: UnlockedZones;
  validMoves: Move[];
  lastMove: Position | null;
  isLastMoveBomb?: boolean;
  isBombShaking?: boolean;
  flippingPositions: Set<string>;
  newlyUnlockedZone: keyof UnlockedZones | null;
  turn: Player;
  onCellClick: (row: number, col: number) => void;
  disabled: boolean;
}

const CLASSIC_COLS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

export const Board: React.FC<BoardProps> = ({
  board,
  rule,
  unlocked,
  validMoves,
  lastMove,
  isLastMoveBomb = false,
  isBombShaking = false,
  flippingPositions,
  newlyUnlockedZone,
  turn,
  onCellClick,
  disabled
}) => {
  const validMoveMap = new Map<string, number>();
  for (const m of validMoves) {
    validMoveMap.set(`${m.row},${m.col}`, m.flipped.length);
  }

  const is8x8 = rule === 'classic' || rule === 'bomb';

  // 1. 通常 8x8 または 爆弾石 8x8 ルールの場合
  if (is8x8) {
    return (
      <div className={`w-full flex flex-col items-center justify-center my-1 select-none ${isBombShaking ? 'bomb-shake' : ''}`}>
        <div className="felt-board p-2 sm:p-3 w-full max-w-[min(96vw,460px)] flex flex-col box-border shadow-2xl">
          <div className="grid grid-cols-8 text-center text-[10px] sm:text-xs font-black text-emerald-950/80 mb-1 select-none">
            {CLASSIC_COLS.map((col) => (
              <div key={col}>{col}</div>
            ))}
          </div>

          <div className="grid grid-cols-8 w-full aspect-square border-2 border-emerald-950/70 rounded overflow-hidden bg-emerald-800/30">
            {Array.from({ length: 8 }, (_, rIdx) => {
              const r = rIdx + 3;
              return Array.from({ length: 8 }, (_, cIdx) => {
                const c = cIdx + 3;
                const posKey = `${r},${c}`;
                const isValid = validMoveMap.has(posKey);
                const flipCount = validMoveMap.get(posKey) || 0;
                const isLast = lastMove ? lastMove.row === r && lastMove.col === c : false;
                const isFlipping = flippingPositions.has(posKey);

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
                    onClick={() => onCellClick(r, c)}
                    disabled={disabled}
                  />
                );
              });
            })}
          </div>
        </div>
      </div>
    );
  }

  // 2. 盤面拡張 (Fortress) または 全部盛り (Chaos) の場合: 14x14
  return (
    <div className={`w-full flex flex-col items-center justify-center my-1 select-none ${isBombShaking ? 'bomb-shake' : ''}`}>
      <div className="felt-board p-1.5 sm:p-2.5 w-full max-w-[min(96vw,460px)] flex flex-col box-border shadow-2xl relative">
        <div className="grid grid-cols-14 w-full aspect-square border-2 border-emerald-950/60 rounded overflow-hidden bg-slate-950/60">
          {board.map((rowArr, r) =>
            rowArr.map((cellValue, c) => {
              const posKey = `${r},${c}`;
              const active = isCellActive(r, c, rule, unlocked);
              const isValid = validMoveMap.has(posKey);
              const flipCount = validMoveMap.get(posKey) || 0;
              const isLast = lastMove ? lastMove.row === r && lastMove.col === c : false;
              const isFlipping = flippingPositions.has(posKey);

              let isNewlyUnlocked = false;
              if (newlyUnlockedZone) {
                if (newlyUnlockedZone === 'topLeft' && r <= 2 && c <= 2) isNewlyUnlocked = true;
                if (newlyUnlockedZone === 'topRight' && r <= 2 && c >= 11) isNewlyUnlocked = true;
                if (newlyUnlockedZone === 'bottomLeft' && r >= 11 && c <= 2) isNewlyUnlocked = true;
                if (newlyUnlockedZone === 'bottomRight' && r >= 11 && c >= 11) isNewlyUnlocked = true;
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
                  onClick={() => onCellClick(r, c)}
                  disabled={disabled}
                />
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
