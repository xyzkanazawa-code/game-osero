import React from 'react';
import { AiLevel, GameMode, Player, RuleType, Score, UnlockedZones } from '../types/othello';
import { Bot, User, Globe, AlertCircle, ShieldAlert } from 'lucide-react';

interface GameHeaderProps {
  score: Score;
  turn: Player;
  mode: GameMode;
  rule: RuleType;
  unlocked: UnlockedZones;
  aiLevel: AiLevel;
  myColor?: Player;
  isAiThinking?: boolean;
  passMessage: string | null;
  zoneAlertMessage: string | null;
}

export const GameHeader: React.FC<GameHeaderProps> = ({
  score,
  turn,
  mode,
  rule,
  unlocked,
  aiLevel,
  myColor = 'black',
  isAiThinking = false,
  passMessage,
  zoneAlertMessage
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

  const unlockedCount = [
    unlocked.topLeft,
    unlocked.topRight,
    unlocked.bottomLeft,
    unlocked.bottomRight
  ].filter(Boolean).length;

  return (
    <div className="w-full mb-1">
      {/* モード & ルール表示バッジ */}
      <div className="flex items-center justify-between mb-1.5 px-0.5">
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* 対戦モード */}
          <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-950/70 border border-emerald-800/60 px-2 py-0.5 rounded-full shadow-sm">
            {mode === 'cpu' && <Bot size={13} />}
            {mode === 'local' && <User size={13} />}
            {mode === 'online' && <Globe size={13} />}
            <span>{getModeLabel()}</span>
          </div>

          {/* ルールバッジ */}
          <div
            className={`flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full shadow-sm border ${
              rule === 'fortress'
                ? 'bg-amber-950/80 text-amber-300 border-amber-600/80 shadow-[0_0_8px_rgba(245,158,11,0.2)]'
                : 'bg-slate-900 text-slate-300 border-slate-700'
            }`}
          >
            {rule === 'fortress' ? (
              <>
                <span>🏰 四隅拡張モード</span>
                <span className="text-[9px] bg-amber-400 text-slate-950 px-1 rounded font-extrabold">
                  {unlockedCount}/4 解放
                </span>
              </>
            ) : (
              <span>通常 8×8</span>
            )}
          </div>
        </div>

        {/* AI思考中インジケータ */}
        {isAiThinking && (
          <div className="flex items-center gap-1 text-[11px] text-amber-300 bg-amber-950/60 border border-amber-700/60 px-2 py-0.5 rounded-full animate-pulse">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
            <span>思考中...</span>
          </div>
        )}
      </div>

      {/* プレイヤー対比カード */}
      <div className="grid grid-cols-2 gap-2 mb-1.5">
        {/* 黒プレイヤー */}
        <div
          className={`relative p-2.5 rounded-xl border transition-all duration-300 flex items-center gap-2.5 ${
            turn === 'black'
              ? 'bg-slate-900/95 border-amber-400/80 shadow-[0_0_12px_rgba(251,191,36,0.25)] ring-1 ring-amber-400/50'
              : 'bg-slate-900/40 border-slate-800 opacity-75'
          }`}
        >
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-700 via-slate-900 to-black border border-slate-700 flex items-center justify-center shadow-md flex-shrink-0">
            <div className="w-2 h-2 rounded-full bg-white/10" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[10px] font-bold text-slate-400 truncate flex items-center gap-1">
              <span>{getPlayerLabel('black')}</span>
              {turn === 'black' && (
                <span className="bg-amber-400/20 text-amber-300 text-[8px] px-1 py-0.2 rounded font-black">手番</span>
              )}
            </div>
            <div className="text-xl font-extrabold text-white font-mono leading-tight">
              {score.black} <span className="text-[10px] font-normal text-slate-400">枚</span>
            </div>
          </div>
        </div>

        {/* 白プレイヤー */}
        <div
          className={`relative p-2.5 rounded-xl border transition-all duration-300 flex items-center gap-2.5 ${
            turn === 'white'
              ? 'bg-slate-900/95 border-amber-400/80 shadow-[0_0_12px_rgba(251,191,36,0.25)] ring-1 ring-amber-400/50'
              : 'bg-slate-900/40 border-slate-800 opacity-75'
          }`}
        >
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-white via-slate-100 to-slate-300 border border-slate-300 flex items-center justify-center shadow-md flex-shrink-0">
            <div className="w-2 h-2 rounded-full bg-white/60" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[10px] font-bold text-slate-400 truncate flex items-center gap-1">
              <span>{getPlayerLabel('white')}</span>
              {turn === 'white' && (
                <span className="bg-amber-400/20 text-amber-300 text-[8px] px-1 py-0.2 rounded font-black">手番</span>
              )}
            </div>
            <div className="text-xl font-extrabold text-white font-mono leading-tight">
              {score.white} <span className="text-[10px] font-normal text-slate-400">枚</span>
            </div>
          </div>
        </div>
      </div>

      {/* 勢力比率プログレスバー */}
      <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden flex shadow-inner">
        <div
          className="bg-slate-950 transition-all duration-500 border-r border-slate-700"
          style={{ width: `${blackPct}%` }}
        />
        <div
          className="bg-slate-100 transition-all duration-500"
          style={{ width: `${whitePct}%` }}
        />
      </div>

      {/* 🏰 新エリア出現アラートバナー */}
      {zoneAlertMessage && (
        <div className="mt-1.5 flex items-center justify-center gap-2 py-1.5 px-2 rounded-lg bg-amber-950/90 border border-amber-500 text-amber-200 text-xs font-black shadow-lg animate-bounce">
          <ShieldAlert size={16} className="text-amber-400" />
          <span>{zoneAlertMessage}</span>
        </div>
      )}

      {/* パス発生アラートバナー */}
      {passMessage && (
        <div className="mt-1.5 flex items-center justify-center gap-2 py-1 px-2 rounded-lg bg-rose-950/80 border border-rose-700 text-rose-200 text-[11px] font-bold shadow-md">
          <AlertCircle size={14} />
          <span>{passMessage}</span>
        </div>
      )}
    </div>
  );
};
