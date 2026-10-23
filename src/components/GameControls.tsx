import React from 'react';
import { RotateCcw, Undo2, Flag, Volume2, VolumeX, Settings2 } from 'lucide-react';
import { GameMode } from '../types/othello';

interface GameControlsProps {
  mode: GameMode;
  canUndo: boolean;
  isMuted: boolean;
  onUndo: () => void;
  onReset: () => void;
  onResign: () => void;
  onToggleSound: () => void;
  onOpenModeSelector: () => void;
  disabled?: boolean;
}

export const GameControls: React.FC<GameControlsProps> = ({
  mode,
  canUndo,
  isMuted,
  onUndo,
  onReset,
  onResign,
  onToggleSound,
  onOpenModeSelector,
  disabled = false
}) => {
  return (
    <div className="w-full max-w-[500px] mt-3.5 flex items-center justify-between gap-2 px-1">
      {/* 左側：設定・モード選択 */}
      <button
        type="button"
        onClick={onOpenModeSelector}
        className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900/90 border border-slate-700/80 text-slate-300 hover:text-white hover:border-slate-500 hover:bg-slate-800 text-xs font-bold transition-all shadow-sm active:scale-95 cursor-pointer"
        title="対戦モードを変更"
      >
        <Settings2 size={15} />
        <span>モード切替</span>
      </button>

      {/* 右側アクション群 */}
      <div className="flex items-center gap-2">
        {/* 待った（ローカル・CPUのみ） */}
        {mode !== 'online' && (
          <button
            type="button"
            onClick={onUndo}
            disabled={!canUndo || disabled}
            className="flex items-center gap-1 px-3 py-2 rounded-xl bg-slate-900/90 border border-slate-700/80 text-slate-300 hover:text-white hover:border-slate-500 hover:bg-slate-800 disabled:opacity-40 disabled:pointer-events-none text-xs font-bold transition-all shadow-sm active:scale-95 cursor-pointer"
            title="1手戻す"
          >
            <Undo2 size={15} />
            <span className="hidden sm:inline">待った</span>
          </button>
        )}

        {/* リセット */}
        <button
          type="button"
          onClick={onReset}
          disabled={disabled}
          className="flex items-center gap-1 px-3 py-2 rounded-xl bg-slate-900/90 border border-slate-700/80 text-slate-300 hover:text-white hover:border-slate-500 hover:bg-slate-800 text-xs font-bold transition-all shadow-sm active:scale-95 cursor-pointer"
          title="最初からやり直す"
        >
          <RotateCcw size={15} />
          <span className="hidden sm:inline">やり直す</span>
        </button>

        {/* 投了（オンライン時など） */}
        <button
          type="button"
          onClick={onResign}
          disabled={disabled}
          className="flex items-center gap-1 px-3 py-2 rounded-xl bg-rose-950/40 border border-rose-800/60 text-rose-300 hover:bg-rose-900/60 hover:border-rose-600 text-xs font-bold transition-all shadow-sm active:scale-95 cursor-pointer"
          title="降参する"
        >
          <Flag size={15} />
          <span className="hidden sm:inline">投了</span>
        </button>

        {/* サウンド切替 */}
        <button
          type="button"
          onClick={onToggleSound}
          className="p-2 rounded-xl bg-slate-900/90 border border-slate-700/80 text-slate-300 hover:text-white hover:border-slate-500 hover:bg-slate-800 text-xs font-bold transition-all shadow-sm active:scale-95 cursor-pointer"
          title={isMuted ? 'サウンドをオン' : 'サウンドをオフ'}
        >
          {isMuted ? <VolumeX size={16} className="text-slate-500" /> : <Volume2 size={16} className="text-emerald-400" />}
        </button>
      </div>
    </div>
  );
};
