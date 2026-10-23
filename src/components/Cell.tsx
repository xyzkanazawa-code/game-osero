import React from 'react';
import { CellValue } from '../types/othello';

interface CellProps {
  row: number;
  col: number;
  value: CellValue;
  isActive: boolean;
  isFlipping: boolean;
  flipTarget: 'black' | 'white' | null;
  isLastMove: boolean;
  isLastBomb?: boolean;
  isValidMove: boolean;
  flipCount: number;
  isNewlyUnlocked?: boolean;
  onClick: () => void;
  disabled: boolean;
}

export const Cell: React.FC<CellProps> = ({
  row,
  col,
  value,
  isActive,
  isFlipping,
  flipTarget,
  isLastMove,
  isLastBomb,
  isValidMove,
  flipCount,
  isNewlyUnlocked,
  onClick,
  disabled
}) => {
  // 非アクティブなマス（まだ出現していないエリア）は透明な空洞としてレンダリング
  if (!isActive) {
    return <div className="aspect-square w-full opacity-0 pointer-events-none" />;
  }

  // アニメーションクラスの決定
  let discAnimationClass = '';
  if (isFlipping && flipTarget) {
    discAnimationClass = flipTarget === 'white' ? 'disc-flip-white' : 'disc-flip-black';
  } else if (isLastMove) {
    discAnimationClass = 'disc-place-pop';
  }

  // 元の8x8の4隅（(2,2), (2,9), (9,2), (9,9)）
  const isOriginalCorner = (row === 2 || row === 9) && (col === 2 || col === 9);
  // 第1要塞の4隅（第2覚醒トリガーマス: (1,1), (1,10), (10,1), (10,10)）
  const isPhase2Corner = (row === 1 || row === 10) && (col === 1 || col === 10);

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || (!isValidMove && !value)}
      className={`relative aspect-square w-full cell-border flex items-center justify-center cursor-pointer disabled:cursor-default transition-all duration-150 group p-0 m-0 ${
        isNewlyUnlocked ? 'animate-pulse bg-amber-500/25 ring-2 ring-amber-400' : ''
      } ${isOriginalCorner ? 'bg-amber-950/25' : ''} ${isPhase2Corner ? 'bg-purple-950/25' : ''}`}
      aria-label={`マス (${row}, ${col})`}
    >
      {/* 元の4隅の角マーク（第1覚醒トリガー） */}
      {isOriginalCorner && !value && (
        <span className="absolute inset-0 flex items-center justify-center text-[8px] sm:text-[10px] text-amber-300/40 font-black pointer-events-none">
          🏰
        </span>
      )}

      {/* 第1要塞の角マーク（第2覚醒トリガー） */}
      {isPhase2Corner && !value && (
        <span className="absolute inset-0 flex items-center justify-center text-[8px] sm:text-[10px] text-purple-300/50 font-black pointer-events-none">
          ⚡
        </span>
      )}

      {/* 石がある場合の描画（3Dフリップ） */}
      {value && (
        <div className="perspective-800 w-[90%] h-[90%] flex items-center justify-center pointer-events-none">
          <div
            className={`w-full h-full rounded-full transition-transform duration-300 relative ${discAnimationClass}`}
            style={{
              boxShadow: '0 3px 6px rgba(0, 0, 0, 0.45), inset 0 2px 3px rgba(255, 255, 255, 0.35)'
            }}
          >
            {value === 'black' ? (
              // 黒石
              <div className="w-full h-full rounded-full bg-gradient-to-br from-slate-700 via-slate-900 to-black flex items-center justify-center border border-slate-950 relative overflow-hidden shadow-inner">
                <div className="absolute top-[12%] left-[18%] w-[35%] h-[35%] bg-white/15 rounded-full blur-[1px]" />
                {isLastBomb ? (
                  <span className="text-[12px] sm:text-sm animate-bounce pointer-events-none">💣</span>
                ) : isLastMove ? (
                  <span className="w-2.5 h-2.5 bg-amber-400 rounded-full ring-2 ring-amber-300/60 shadow-lg animate-pulse" />
                ) : null}
              </div>
            ) : (
              // 白石
              <div className="w-full h-full rounded-full bg-gradient-to-br from-white via-slate-100 to-slate-300 flex items-center justify-center border border-slate-300 relative overflow-hidden shadow-inner">
                <div className="absolute top-[12%] left-[18%] w-[35%] h-[35%] bg-white/80 rounded-full blur-[1px]" />
                {isLastBomb ? (
                  <span className="text-[12px] sm:text-sm animate-bounce pointer-events-none">💣</span>
                ) : isLastMove ? (
                  <span className="w-2.5 h-2.5 bg-rose-500 rounded-full ring-2 ring-rose-400/60 shadow-lg animate-pulse" />
                ) : null}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 石がなく、打てるマス（合法手ガイド） */}
      {!value && isValidMove && !disabled && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span className="w-3.5 h-3.5 rounded-full bg-black/25 group-hover:bg-amber-400/90 hint-dot transition-all duration-200" />
          <span className="opacity-0 group-hover:opacity-100 absolute -top-1 -right-1 bg-amber-500 text-slate-950 text-[10px] font-extrabold px-1.5 py-0.5 rounded-full shadow-md transform scale-90 group-hover:scale-100 transition-all z-10">
            +{flipCount}
          </span>
        </div>
      )}
    </button>
  );
};
