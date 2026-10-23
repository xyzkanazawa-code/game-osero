import React, { useState } from 'react';
import { Bot, User, Globe, X, Swords, Check, Bomb, Sparkles } from 'lucide-react';
import { AiLevel, GameMode, RuleType } from '../types/othello';

interface ModeSelectorProps {
  isOpen: boolean;
  currentMode: GameMode;
  currentRule: RuleType;
  currentAiLevel: AiLevel;
  onSelectCpu: (level: AiLevel, rule: RuleType) => void;
  onSelectLocal: (rule: RuleType) => void;
  onSelectOnline: (rule: RuleType) => void;
  onClose: () => void;
}

export const ModeSelector: React.FC<ModeSelectorProps> = ({
  isOpen,
  currentMode,
  currentRule,
  currentAiLevel,
  onSelectCpu,
  onSelectLocal,
  onSelectOnline,
  onClose
}) => {
  const [selectedRule, setSelectedRule] = useState<RuleType>(currentRule);
  const [selectedLevel, setSelectedLevel] = useState<AiLevel>(currentAiLevel);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-700/80 rounded-2xl p-4 sm:p-5 shadow-2xl flex flex-col gap-3.5 max-h-[92vh] overflow-y-auto">
        {/* ヘッダー */}
        <div className="flex items-center justify-between pb-2.5 border-b border-slate-800">
          <div className="flex items-center gap-2 text-white font-extrabold text-base">
            <Swords className="text-emerald-400" size={18} />
            <span>ゲーム設定 & 対戦モード</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* 🌟 ルール選択（通常 / 盤面拡張 / 爆弾石 / 全部盛り） */}
        <div className="flex flex-col gap-1.5 p-3 bg-slate-950/80 rounded-xl border border-slate-800">
          <span className="text-xs font-bold text-slate-300">
            ゲームルールを選択:
          </span>
          <div className="grid grid-cols-2 gap-2">
            {/* 1. 通常 8x8 */}
            <button
              type="button"
              onClick={() => setSelectedRule('classic')}
              className={`p-2.5 rounded-xl border text-left flex flex-col gap-0.5 transition-all cursor-pointer ${
                selectedRule === 'classic'
                  ? 'bg-emerald-950/80 border-emerald-500 text-white shadow-md'
                  : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold">通常 8×8</span>
                {selectedRule === 'classic' && <Check size={14} className="text-emerald-400" />}
              </div>
              <span className="text-[10px] text-slate-400 leading-tight">
                伝統オセロ。角を取ったら確定！
              </span>
            </button>

            {/* 2. 盤面拡張 (四隅3x3) */}
            <button
              type="button"
              onClick={() => setSelectedRule('fortress')}
              className={`p-2.5 rounded-xl border text-left flex flex-col gap-0.5 transition-all cursor-pointer ${
                selectedRule === 'fortress'
                  ? 'bg-amber-950/80 border-amber-500 text-white shadow-[0_0_10px_rgba(245,158,11,0.25)]'
                  : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-300">🏰 盤面拡張</span>
                {selectedRule === 'fortress' && <Check size={14} className="text-amber-400" />}
              </div>
              <span className="text-[10px] text-slate-300 leading-tight">
                角を取ると外側3×3が突如出現！
              </span>
            </button>

            {/* 3. 爆弾石モード */}
            <button
              type="button"
              onClick={() => setSelectedRule('bomb')}
              className={`p-2.5 rounded-xl border text-left flex flex-col gap-0.5 transition-all cursor-pointer ${
                selectedRule === 'bomb'
                  ? 'bg-red-950/80 border-red-500 text-white shadow-[0_0_10px_rgba(239,68,68,0.3)]'
                  : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-red-300 flex items-center gap-1">
                  <span>💣 爆弾石</span>
                </span>
                {selectedRule === 'bomb' && <Check size={14} className="text-red-400" />}
              </div>
              <span className="text-[10px] text-slate-300 leading-tight">
                周囲3×3をドカンと一斉爆破自色化！
              </span>
            </button>

            {/* 4. 全部盛り (拡張 + 爆弾石) */}
            <button
              type="button"
              onClick={() => setSelectedRule('chaos')}
              className={`p-2.5 rounded-xl border text-left flex flex-col gap-0.5 transition-all cursor-pointer ${
                selectedRule === 'chaos'
                  ? 'bg-purple-950/80 border-purple-500 text-white shadow-[0_0_10px_rgba(168,85,247,0.3)]'
                  : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-purple-300 flex items-center gap-1">
                  <span>🔥 拡張＋爆弾</span>
                </span>
                {selectedRule === 'chaos' && <Check size={14} className="text-purple-400" />}
              </div>
              <span className="text-[10px] text-slate-300 leading-tight">
                四隅拡張と爆弾石の超ド迫力バトル！
              </span>
            </button>
          </div>
        </div>

        {/* モード一覧 */}
        <div className="flex flex-col gap-2.5">
          {/* 1. CPU対戦 */}
          <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60 flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-emerald-950/80 border border-emerald-700/60 flex items-center justify-center text-emerald-400">
                <Bot size={18} />
              </div>
              <div>
                <div className="text-xs font-bold text-white">CPU対戦 (1人プレイ)</div>
                <div className="text-[10px] text-slate-400">AIといつでも対戦できます</div>
              </div>
            </div>

            {/* AI難易度選択 */}
            <div className="grid grid-cols-3 gap-1.5">
              {(['easy', 'medium', 'hard'] as AiLevel[]).map((level) => {
                const labels = { easy: '初級', medium: '中級', hard: '上級' };
                const desc = { easy: '初心者向け', medium: '角重視', hard: '深読みAI' };
                const isSelected = selectedLevel === level;

                return (
                  <button
                    key={level}
                    type="button"
                    onClick={() => setSelectedLevel(level)}
                    className={`p-1 rounded-lg text-center border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-600 text-white border-emerald-400 shadow-md font-bold'
                        : 'bg-slate-900/60 text-slate-300 border-slate-700 hover:border-slate-500 text-xs'
                    }`}
                  >
                    <div className="text-[11px] font-extrabold">{labels[level]}</div>
                    <div className={`text-[9px] ${isSelected ? 'text-emerald-100' : 'text-slate-500'}`}>
                      {desc[level]}
                    </div>
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => onSelectCpu(selectedLevel, selectedRule)}
              className="w-full mt-0.5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-xs rounded-lg shadow-lg active:scale-98 transition-all cursor-pointer"
            >
              この設定でCPUと対戦開始
            </button>
          </div>

          {/* 2. ローカル2人対戦 */}
          <button
            type="button"
            onClick={() => onSelectLocal(selectedRule)}
            className="p-3 rounded-xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 hover:border-slate-500 flex items-center justify-between text-left transition-all active:scale-98 cursor-pointer group"
          >
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-sky-950/80 border border-sky-700/60 flex items-center justify-center text-sky-400 group-hover:scale-105 transition-transform">
                <User size={18} />
              </div>
              <div>
                <div className="text-xs font-bold text-white">ローカル2人対戦</div>
                <div className="text-[10px] text-slate-400">1台の端末で交互に着手して対戦</div>
              </div>
            </div>
            <div className="text-xs font-bold text-sky-400 bg-sky-950/60 border border-sky-800/60 px-2.5 py-1 rounded-lg">
              開始
            </div>
          </button>

          {/* 3. オンラインP2P対戦 */}
          <button
            type="button"
            onClick={() => onSelectOnline(selectedRule)}
            className="p-3 rounded-xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 hover:border-amber-500/80 flex items-center justify-between text-left transition-all active:scale-98 cursor-pointer group"
          >
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-amber-950/80 border border-amber-700/60 flex items-center justify-center text-amber-400 group-hover:scale-105 transition-transform">
                <Globe size={18} />
              </div>
              <div>
                <div className="text-xs font-bold text-white flex items-center gap-1.5">
                  <span>オンラインP2P対戦</span>
                  <span className="text-[9px] bg-amber-500/20 text-amber-300 px-1 py-0.2 rounded font-extrabold">おすすめ</span>
                </div>
                <div className="text-[10px] text-slate-400">URLをLINE等で送ってリアルタイム対戦</div>
              </div>
            </div>
            <div className="text-xs font-bold text-amber-400 bg-amber-950/60 border border-amber-800/60 px-2.5 py-1 rounded-lg">
              部屋へ
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};
