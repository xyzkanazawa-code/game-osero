import React from 'react';
import { BoardState, Move, Player, Position } from '../types/othello';
import { Cell } from './Cell';

interface BoardProps {
  board: BoardState;
  validMoves: Move[];
  lastMove: Position | null;
  flippingPositions: Set<string>;
  turn: Player;
  onCellClick: (row: number, col: number) => void;
  disabled: boolean;
}

const COL_LABELS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

export const Board: React.FC<BoardProps> = ({
  board,
  validMoves,
  lastMove,
  flippingPositions,
  turn,
  onCellClick,
  disabled
}) => {
  // マスごとの有効手マップ（高速参照用）
  const validMoveMap = new Map<string, number>();
  for (const m of validMoves) {
    validMoveMap.set(`${m.row},${m.col}`, m.flipped.length);
  }

  return (
    <div className="flex flex-col items-center">
      {/* 盤面本体 */}
      <div className="felt-board p-2 sm:p-3 w-full max-w-[460px] sm:max-w-[500px]">
        {/* 列ラベル (A-H) */}
        <div className="grid grid-cols-8 text-center text-[10px] sm:text-xs font-bold text-emerald-950/70 mb-1 select-none">
          {COL_LABELS.map((col) => (
            <div key={col}>{col}</div>
          ))}
        </div>

        {/* 8x8 マス目グリッド */}
        <div className="grid grid-cols-8 border-2 border-emerald-950/60 rounded overflow-hidden bg-emerald-800/20">
          {board.map((rowArr, r) =>
            rowArr.map((cellValue, c) => {
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
                  value={cellValue}
                  isFlipping={isFlipping}
                  flipTarget={isFlipping ? cellValue : null}
                  isLastMove={isLast}
                  isValidMove={isValid}
                  flipCount={flipCount}
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
