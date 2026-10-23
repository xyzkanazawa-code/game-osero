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
    <div className="w-full flex flex-col items-center justify-center my-1 select-none">
      {/* 盤面本体（画面幅に合わせた最大迫力サイズ） */}
      <div className="felt-board p-2 sm:p-3 w-full max-w-[min(96vw,460px)] flex flex-col box-border shadow-2xl">
        {/* 列ラベル (A-H) */}
        <div className="grid grid-cols-8 text-center text-[10px] sm:text-xs font-black text-emerald-950/80 mb-1 select-none">
          {COL_LABELS.map((col) => (
            <div key={col}>{col}</div>
          ))}
        </div>

        {/* 8x8 マス目グリッド（w-full aspect-square でスマホ幅いっぱいに正方形展開） */}
        <div className="grid grid-cols-8 w-full aspect-square border-2 border-emerald-950/70 rounded overflow-hidden bg-emerald-800/30">
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
