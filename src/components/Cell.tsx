import React from 'react';
import { CellValue, Position } from '../types/othello';

interface CellProps {
  row: number;
  col: number;
  value: CellValue;
  isFlipping: boolean;
  flipTarget: 'black' | 'white' | null;
  isLastMove: boolean;
  isValidMove: boolean;
  flipCount: number;
  onClick: () => void;
  disabled: boolean;
}

export const Cell: React.FC<CellProps> = ({
  row,
  col,
  value,
  isFlipping,
  flipTarget,
  isLastMove,
  isValidMove,
  flipCount,
  onClick,
  disabled
}) => {
  // アニメーションクラスの決定
  let discAnimationClass = '';
  if (isFlipping && flipTarget) {
    discAnimationClass = flipTarget === 'white' ? 'disc-flip-white' : 'disc-flip-black';
  } else if (isLastMove) {
    discAnimationClass = 'disc-place-pop';
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || (!isValidMove && !value)}
      className="relative aspect-square w-full cell-border flex items-center justify-center cursor-pointer disabled:cursor-default transition-colors duration-150 group"
      aria-label={`マス (${row}, ${col})`}
    >
      {/* 4箇所の星（ガイド点: (2,2), (2,6), (6,2), (6,6)） */}
      {((row === 2 || row === 6) && (col === 2 || col === 6)) && (
        <span className="absolute w-1.5 h-1.5 bg-black/60 rounded-full pointer-events-none" />
      )}

      {/* 石がある場合の描画（3Dフリップ） */}
      {value && (
        <div className="perspective-800 w-[84%] h-[84%] flex items-center justify-center">
          <div
            className={`w-full h-full rounded-full transition-transform duration-300 relative ${discAnimationClass}`}
            style={{
              boxShadow: '0 4px 8px rgba(0, 0, 0, 0.45), inset 0 2px 4px rgba(255, 255, 255, 0.3)'
            }}
          >
            {value === 'black' ? (
              // 黒石: 高級感のあるオニキスブラックの光沢
              <div className="w-full h-full rounded-full bg-gradient-to-br from-slate-700 via-slate-900 to-black flex items-center justify-center border border-slate-950 relative overflow-hidden shadow-inner">
                {/* ハイライト */}
                <div className="absolute top-[12%] left-[18%] w-[35%] h-[35%] bg-white/15 rounded-full blur-[1px]" />
                {/* 直前着手マーカー */}
                {isLastMove && (
                  <span className="w-2.5 h-2.5 bg-amber-400 rounded-full ring-2 ring-amber-300/60 shadow-lg animate-pulse" />
                )}
              </div>
            ) : (
              // 白石: 清潔感のあるセラミックホワイトの光沢
              <div className="w-full h-full rounded-full bg-gradient-to-br from-white via-slate-100 to-slate-300 flex items-center justify-center border border-slate-300 relative overflow-hidden shadow-inner">
                {/* ハイライト */}
                <div className="absolute top-[12%] left-[18%] w-[35%] h-[35%] bg-white/80 rounded-full blur-[1px]" />
                {/* 直前着手マーカー */}
                {isLastMove && (
                  <span className="w-2.5 h-2.5 bg-rose-500 rounded-full ring-2 ring-rose-400/60 shadow-lg animate-pulse" />
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 石がなく、打てるマス（合法手ガイド） */}
      {!value && isValidMove && !disabled && (
        <div className="absolute inset-0 flex items-center justify-center">
          {/* 通常時の半透明ドット */}
          <span className="w-3.5 h-3.5 rounded-full bg-black/25 group-hover:bg-amber-400/90 hint-dot transition-all duration-200" />
          
          {/* ホバー時にひっくり返る枚数のプレビューバッジ */}
          <span className="opacity-0 group-hover:opacity-100 absolute -top-1 -right-1 bg-amber-500 text-slate-950 text-[10px] font-extrabold px-1.5 py-0.5 rounded-full shadow-md transform scale-90 group-hover:scale-100 transition-all pointer-events-none z-10">
            +{flipCount}
          </span>
        </div>
      )}
    </button>
  );
};
