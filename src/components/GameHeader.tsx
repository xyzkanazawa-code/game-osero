import React from 'react';
import { AiLevel, GameMode, Player, Score } from '../types/othello';
import { Bot, User, Globe, AlertCircle } from 'lucide-react';

interface GameHeaderProps {
  score: Score;
  turn: Player;
  mode: GameMode;
  aiLevel: AiLevel;
  myColor?: Player;
  isAiThinking?: boolean;
  passMessage: string | null;
}

export const GameHeader: React.FC<GameHeaderProps> = ({
  score,
  turn,
  mode,
  aiLevel,
  myColor = 'black',
  isAiThinking = false,
  passMessage
}) => {
  const total = score.black + score.white;
  const blackPct = total > 0 ? (score.black / total) * 100 : 50;
  const whitePct = total > 0 ? (score.white / total) * 100 : 50;

  const getModeLabel = () => {
    if (mode === 'cpu') {
      const levelNames = { easy: '初級', medium: '中級', hard: '上級' };
      return `CPU対戦 (${levelNames[aiLevel]})`;
    }
    if (mode === 'local') return 'ローカル2人対戦';
    return 'オンラインP2P対戦';
  };

  const getPlayerLabel = (color: Player) => {
    if (mode === 'cpu') {
      return color === 'black' ? 'あなた' : `CPU (${aiLevel})`;
    }
    if (mode === 'online') {
      return color === myColor ? 'あなた' : '相手';
    }
    return color === 'black' ? 'プレイヤー 1' : 'プレイヤー 2';
  };

  return (
    <div className="w-full max-w-[500px] mb-3">
      {/* モード表示バッジ */}
      <div className="flex items-center justify-between mb-2 px-1">
        <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400 bg-emerald-950/70 border border-emerald-800/60 px-2.5 py-1 rounded-full shadow-sm">
          {mode === 'cpu' && <Bot size={14} />}
          {mode === 'local' && <User size={14} />}
          {mode === 'online' && <Globe size={14} />}
          <span>{getModeLabel()}</span>
        </div>

        {/* AI思考中インジケータ */}
        {isAiThinking && (
          <div className="flex items-center gap-1.5 text-xs text-amber-300 bg-amber-950/60 border border-amber-700/60 px-2 py-0.5 rounded-full animate-pulse">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
            <span>CPU思考中...</span>
          </div>
        )}
      </div>

      {/* プレイヤー対比カード */}
      <div className="grid grid-cols-2 gap-3 mb-2">
        {/* 黒プレイヤー */}
        <div
          className={`relative p-3 rounded-xl border transition-all duration-300 flex items-center gap-3 ${
            turn === 'black'
              ? 'bg-slate-900/90 border-amber-400/80 shadow-[0_0_15px_rgba(251,191,36,0.25)] ring-1 ring-amber-400/50'
              : 'bg-slate-900/40 border-slate-800 opacity-75'
          }`}
        >
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-700 via-slate-900 to-black border border-slate-700 flex items-center justify-center shadow-md flex-shrink-0">
            <div className="w-2.5 h-2.5 rounded-full bg-white/10" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[11px] font-bold text-slate-400 truncate flex items-center gap-1">
              <span>{getPlayerLabel('black')}</span>
              {turn === 'black' && (
                <span className="bg-amber-400/20 text-amber-300 text-[9px] px-1.5 py-0.2 rounded font-extrabold">手番</span>
              )}
            </div>
            <div className="text-2xl font-extrabold text-white font-mono leading-tight">
              {score.black} <span className="text-xs font-normal text-slate-400">枚</span>
            </div>
          </div>
        </div>

        {/* 白プレイヤー */}
        <div
          className={`relative p-3 rounded-xl border transition-all duration-300 flex items-center gap-3 ${
            turn === 'white'
              ? 'bg-slate-900/90 border-amber-400/80 shadow-[0_0_15px_rgba(251,191,36,0.25)] ring-1 ring-amber-400/50'
              : 'bg-slate-900/40 border-slate-800 opacity-75'
          }`}
        >
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-white via-slate-100 to-slate-300 border border-slate-300 flex items-center justify-center shadow-md flex-shrink-0">
            <div className="w-2.5 h-2.5 rounded-full bg-white/60" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[11px] font-bold text-slate-400 truncate flex items-center gap-1">
              <span>{getPlayerLabel('white')}</span>
              {turn === 'white' && (
                <span className="bg-amber-400/20 text-amber-300 text-[9px] px-1.5 py-0.2 rounded font-extrabold">手番</span>
              )}
            </div>
            <div className="text-2xl font-extrabold text-white font-mono leading-tight">
              {score.white} <span className="text-xs font-normal text-slate-400">枚</span>
            </div>
          </div>
        </div>
      </div>

      {/* 勢力比率プログレスバー */}
      <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden flex shadow-inner">
        <div
          className="bg-slate-950 transition-all duration-500 border-r border-slate-700"
          style={{ width: `${blackPct}%` }}
        />
        <div
          className="bg-slate-100 transition-all duration-500"
          style={{ width: `${whitePct}%` }}
        />
      </div>

      {/* パス発生アラートバナー */}
      {passMessage && (
        <div className="mt-2.5 flex items-center justify-center gap-2 p-2 rounded-lg bg-rose-950/80 border border-rose-700 text-rose-200 text-xs font-bold animate-bounce shadow-md">
          <AlertCircle size={15} />
          <span>{passMessage}</span>
        </div>
      )}
    </div>
  );
};
