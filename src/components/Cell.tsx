import React from 'react';
import { CellModifier, CellValue, SkillType } from '../types/othello';

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
  modifier?: CellModifier;
  showTrap?: boolean;
  activeSkill?: SkillType | null;
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
  modifier,
  showTrap = false,
  activeSkill = null,
  onClick,
  disabled
}) => {
  // 非アクティブなマス（まだ出現していないエリア）は透明な空洞としてレンダリング
  if (!isActive) {
    return <div className="aspect-square w-full opacity-0 pointer-events-none" />;
  }

  const isShield = !!modifier?.isShield;
  const isGold = !!modifier?.isGold;
  const isSkull = !!modifier?.isSkull;
  const isKing = !!modifier?.isKing;
  const isMystery = !!modifier?.isMystery;
  const warpGroup = modifier?.warpGroup;

  // スキル選択中は対象マスをクリック可能にする
  const isSkillTargetable =
    (activeSkill === 'colorBomb') ||
    (activeSkill === 'trap' && !value && !modifier?.trapOwner);

  const canClick = !disabled && (isValidMove || isSkillTargetable);

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
      disabled={!canClick}
      className={`relative aspect-square w-full cell-border flex items-center justify-center cursor-pointer disabled:cursor-default transition-all duration-150 group p-0 m-0 ${
        isNewlyUnlocked ? 'animate-pulse bg-amber-500/25 ring-2 ring-amber-400' : ''
      } ${isOriginalCorner ? 'bg-amber-950/25' : ''} ${isPhase2Corner ? 'bg-purple-950/25' : ''} ${
        warpGroup === 'blue' ? 'bg-cyan-950/40 inset-ring ring-cyan-400/40' : ''
      } ${warpGroup === 'orange' ? 'bg-orange-950/40 inset-ring ring-orange-400/40' : ''} ${
        isSkillTargetable ? 'hover:bg-rose-500/30 ring-1 ring-inset ring-rose-400/30' : ''
      }`}
      aria-label={`マス (${row}, ${col})`}
    >
      {/* 🌀 ワープホール表示（空きマス時・石がある時も背景リングでわかる） */}
      {warpGroup && !value && (
        <span
          className={`absolute inset-0 flex items-center justify-center text-[10px] sm:text-xs font-black pointer-events-none animate-spin ${
            warpGroup === 'blue'
              ? 'text-cyan-300 drop-shadow-[0_0_4px_rgba(34,211,238,0.8)]'
              : 'text-orange-300 drop-shadow-[0_0_4px_rgba(251,146,60,0.8)]'
          }`}
          style={{ animationDuration: '6s' }}
        >
          🌀
        </span>
      )}

      {/* ❓ ミステリーマス（？ボックス） */}
      {isMystery && !value && (
        <span className="absolute inset-0 flex items-center justify-center text-[10px] sm:text-xs bg-purple-600/35 text-amber-200 font-black pointer-events-none animate-pulse rounded-sm border border-purple-400/50">
          ❓
        </span>
      )}

      {/* 🕸️ 自分が仕掛けたステルス地雷 */}
      {showTrap && !value && (
        <span className="absolute bottom-0 right-0 text-[8px] sm:text-[10px] pointer-events-none opacity-80">
          🕸️
        </span>
      )}

      {/* 元の4隅の角マーク（第1覚醒トリガー） */}
      {isOriginalCorner && !value && !isMystery && (
        <span className="absolute inset-0 flex items-center justify-center text-[8px] sm:text-[10px] text-amber-300/45 font-black pointer-events-none">
          🏰
        </span>
      )}

      {/* 第1要塞の角マーク（第2覚醒トリガー） */}
      {isPhase2Corner && !value && !isMystery && (
        <span className="absolute inset-0 flex items-center justify-center text-[8px] sm:text-[10px] text-purple-300/55 font-black pointer-events-none">
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
              <div
                className={`w-full h-full rounded-full bg-gradient-to-br from-slate-700 via-slate-900 to-black flex items-center justify-center border border-slate-950 relative overflow-hidden shadow-inner ${
                  isKing ? 'ring-2 ring-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.9)]' : ''
                } ${isShield ? 'ring-2 ring-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]' : ''} ${
                  isGold ? 'ring-2 ring-yellow-300 bg-gradient-to-br from-yellow-700 via-amber-900 to-black' : ''
                } ${isSkull ? 'ring-2 ring-purple-500 bg-gradient-to-br from-purple-950 via-slate-950 to-black' : ''}`}
              >
                <div className="absolute top-[12%] left-[18%] w-[35%] h-[35%] bg-white/15 rounded-full blur-[1px]" />
                {isKing ? (
                  <span className="text-[10px] sm:text-xs pointer-events-none drop-shadow">👑</span>
                ) : isShield ? (
                  <span className="text-[10px] sm:text-xs pointer-events-none">🛡️</span>
                ) : isGold ? (
                  <span className="text-[10px] sm:text-xs pointer-events-none">💰</span>
                ) : isSkull ? (
                  <span className="text-[10px] sm:text-xs pointer-events-none">💀</span>
                ) : isLastBomb ? (
                  <span className="text-[12px] sm:text-sm animate-bounce pointer-events-none">💣</span>
                ) : isLastMove ? (
                  <span className="w-2.5 h-2.5 bg-amber-400 rounded-full ring-2 ring-amber-300/60 shadow-lg animate-pulse" />
                ) : null}

                {/* キング石にさらにシールドやゴールドがついている場合のサブバッジ */}
                {isKing && isShield && (
                  <span className="absolute -bottom-0.5 -right-0.5 text-[7px]">🛡️</span>
                )}
              </div>
            ) : (
              // 白石
              <div
                className={`w-full h-full rounded-full bg-gradient-to-br from-white via-slate-100 to-slate-300 flex items-center justify-center border border-slate-300 relative overflow-hidden shadow-inner ${
                  isKing ? 'ring-2 ring-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.9)]' : ''
                } ${isShield ? 'ring-2 ring-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.8)]' : ''} ${
                  isGold ? 'ring-2 ring-yellow-400 bg-gradient-to-br from-yellow-100 via-amber-100 to-yellow-300' : ''
                } ${isSkull ? 'ring-2 ring-purple-600 bg-gradient-to-br from-purple-200 via-slate-300 to-purple-400' : ''}`}
              >
                <div className="absolute top-[12%] left-[18%] w-[35%] h-[35%] bg-white/80 rounded-full blur-[1px]" />
                {isKing ? (
                  <span className="text-[10px] sm:text-xs pointer-events-none drop-shadow">👑</span>
                ) : isShield ? (
                  <span className="text-[10px] sm:text-xs pointer-events-none">🛡️</span>
                ) : isGold ? (
                  <span className="text-[10px] sm:text-xs pointer-events-none">💰</span>
                ) : isSkull ? (
                  <span className="text-[10px] sm:text-xs pointer-events-none">💀</span>
                ) : isLastBomb ? (
                  <span className="text-[12px] sm:text-sm animate-bounce pointer-events-none">💣</span>
                ) : isLastMove ? (
                  <span className="w-2.5 h-2.5 bg-rose-500 rounded-full ring-2 ring-rose-400/60 shadow-lg animate-pulse" />
                ) : null}

                {isKing && isShield && (
                  <span className="absolute -bottom-0.5 -right-0.5 text-[7px]">🛡️</span>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 石がなく、打てるマス（合法手ガイド） */}
      {!value && isValidMove && !disabled && !activeSkill && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span className="w-3 h-3 sm:w-3.5 sm:h-3.5 rounded-full bg-black/30 group-hover:bg-amber-400/90 hint-dot transition-all duration-200" />
          <span className="opacity-0 group-hover:opacity-100 absolute -top-1 -right-1 bg-amber-500 text-slate-950 text-[9px] font-extrabold px-1 py-0.2 rounded-full shadow-md transform scale-90 group-hover:scale-100 transition-all z-10">
            +{flipCount}
          </span>
        </div>
      )}
    </button>
  );
};
