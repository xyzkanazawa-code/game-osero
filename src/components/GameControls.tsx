import React from 'react';
import { RotateCcw, Undo2, Flag, Volume2, VolumeX, Settings2, Bomb } from 'lucide-react';
import { GameMode, RuleType } from '../types/othello';

interface GameControlsProps {
  mode: GameMode;
  rule: RuleType;
  bombsAvailable: number;
  isBombActive: boolean;
  canUndo: boolean;
  isMuted: boolean;
  onToggleBomb: () => void;
  onUndo: () => void;
  onReset: () => void;
  onResign: () => void;
  onToggleSound: () => void;
  onOpenModeSelector: () => void;
  disabled?: boolean;
}

export const GameControls: React.FC<GameControlsProps> = ({
  mode,
  rule,
  bombsAvailable,
  isBombActive,
  canUndo,
  isMuted,
  onToggleBomb,
  onUndo,
  onReset,
  onResign,
  onToggleSound,
  onOpenModeSelector,
  disabled = false
}) => {
  const hasBombFeature = rule === 'bomb' || rule === 'chaos';

  return (
    <div className="w-full mt-2 flex flex-col gap-2 px-1">
      {/* 💣 爆弾石装填バー（爆弾石モード時のみ表示） */}
      {hasBombFeature && (
        <div className="w-full flex items-center justify-between p-2 rounded-xl bg-slate-900/90 border border-slate-800 shadow-md">
          <div className="flex items-center gap-2">
            <span className="text-base">💣</span>
            <div className="flex flex-col">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <span>爆弾石ストック:</span>
                <span className="text-amber-400 font-extrabold">{bombsAvailable} 個</span>
              </span>
              <span className="text-[10px] text-slate-400">
                {bombsAvailable > 0 ? '置いたマスの周囲3×3を大爆破自色化！' : '爆弾石は使い切りました'}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onToggleBomb}
            disabled={disabled || bombsAvailable === 0}
            className={`px-3 py-1.5 rounded-lg text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer shadow-md active:scale-95 ${
              isBombActive
                ? 'bg-gradient-to-r from-red-600 to-amber-500 text-white bomb-active-glow ring-2 ring-amber-300'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 disabled:opacity-40 disabled:pointer-events-none'
            }`}
          >
            <Bomb size={14} className={isBombActive ? 'text-amber-200 animate-spin' : ''} />
            <span>{isBombActive ? '🔥 爆弾装填中！' : '爆弾を使う'}</span>
          </button>
        </div>
      )}

      {/* 通常操作ツールバー */}
      <div className="w-full flex items-center justify-between gap-1.5">
        <button
          type="button"
          onClick={onOpenModeSelector}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-900/90 border border-slate-700/80 text-slate-300 hover:text-white hover:border-slate-500 hover:bg-slate-800 text-xs font-bold transition-all shadow-sm active:scale-95 cursor-pointer"
          title="モード・ルールを変更"
        >
          <Settings2 size={14} />
          <span>設定</span>
        </button>

        <div className="flex items-center gap-1.5">
          {mode !== 'online' && (
            <button
              type="button"
              onClick={onUndo}
              disabled={!canUndo || disabled}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-900/90 border border-slate-700/80 text-slate-300 hover:text-white hover:border-slate-500 hover:bg-slate-800 disabled:opacity-40 disabled:pointer-events-none text-xs font-bold transition-all shadow-sm active:scale-95 cursor-pointer"
              title="1手戻す"
            >
              <Undo2 size={14} />
              <span>待った</span>
            </button>
          )}

          <button
            type="button"
            onClick={onReset}
            disabled={disabled}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-900/90 border border-slate-700/80 text-slate-300 hover:text-white hover:border-slate-500 hover:bg-slate-800 text-xs font-bold transition-all shadow-sm active:scale-95 cursor-pointer"
            title="最初からやり直す"
          >
            <RotateCcw size={14} />
            <span>やり直し</span>
          </button>

          <button
            type="button"
            onClick={onResign}
            disabled={disabled}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-rose-950/40 border border-rose-800/60 text-rose-300 hover:bg-rose-900/60 hover:border-rose-600 text-xs font-bold transition-all shadow-sm active:scale-95 cursor-pointer"
            title="降参する"
          >
            <Flag size={14} />
            <span>投了</span>
          </button>

          <button
            type="button"
            onClick={onToggleSound}
            className="p-1.5 rounded-xl bg-slate-900/90 border border-slate-700/80 text-slate-300 hover:text-white hover:border-slate-500 hover:bg-slate-800 text-xs font-bold transition-all shadow-sm active:scale-95 cursor-pointer"
            title={isMuted ? 'サウンドをオン' : 'サウンドをオフ'}
          >
            {isMuted ? <VolumeX size={15} className="text-slate-500" /> : <Volume2 size={15} className="text-emerald-400" />}
          </button>
        </div>
      </div>
    </div>
  );
};
