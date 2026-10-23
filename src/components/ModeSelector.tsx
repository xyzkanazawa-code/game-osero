import React, { useState } from 'react';
import { Bot, User, Globe, X, Trophy, Swords, Sparkles } from 'lucide-react';
import { AiLevel, GameMode } from '../types/othello';

interface ModeSelectorProps {
  isOpen: boolean;
  currentMode: GameMode;
  currentAiLevel: AiLevel;
  onSelectCpu: (level: AiLevel) => void;
  onSelectLocal: () => void;
  onSelectOnline: () => void;
  onClose: () => void;
}

export const ModeSelector: React.FC<ModeSelectorProps> = ({
  isOpen,
  currentMode,
  currentAiLevel,
  onSelectCpu,
  onSelectLocal,
  onSelectOnline,
  onClose
}) => {
  const [selectedLevel, setSelectedLevel] = useState<AiLevel>(currentAiLevel);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-700/80 rounded-2xl p-6 shadow-2xl flex flex-col gap-4">
        {/* ヘッダー */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2 text-white font-extrabold text-lg">
            <Swords className="text-emerald-400" size={22} />
            <span>対戦モード選択</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* モード一覧 */}
        <div className="flex flex-col gap-3">
          {/* 1. CPU対戦 */}
          <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/60 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-emerald-950/80 border border-emerald-700/60 flex items-center justify-center text-emerald-400">
                  <Bot size={22} />
                </div>
                <div>
                  <div className="text-sm font-bold text-white">CPU対戦 (1人プレイ)</div>
                  <div className="text-[11px] text-slate-400">思考AIといつでも対戦できます</div>
                </div>
              </div>
            </div>

            {/* AI難易度選択 */}
            <div className="grid grid-cols-3 gap-2 mt-1">
              {(['easy', 'medium', 'hard'] as AiLevel[]).map((level) => {
                const labels = { easy: '初級', medium: '中級', hard: '上級' };
                const desc = { easy: '初心者向け', medium: '角重視', hard: '深読みAI' };
                const isSelected = selectedLevel === level;

                return (
                  <button
                    key={level}
                    type="button"
                    onClick={() => setSelectedLevel(level)}
                    className={`p-2 rounded-lg text-center border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-600 text-white border-emerald-400 shadow-md font-bold'
                        : 'bg-slate-900/60 text-slate-300 border-slate-700 hover:border-slate-500 text-xs'
                    }`}
                  >
                    <div className="text-xs font-extrabold">{labels[level]}</div>
                    <div className={`text-[10px] ${isSelected ? 'text-emerald-100' : 'text-slate-500'}`}>
                      {desc[level]}
                    </div>
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => onSelectCpu(selectedLevel)}
              className="w-full mt-1 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-sm rounded-lg shadow-lg active:scale-98 transition-all cursor-pointer"
            >
              CPUと対戦開始
            </button>
          </div>

          {/* 2. ローカル2人対戦 */}
          <button
            type="button"
            onClick={onSelectLocal}
            className="p-4 rounded-xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 hover:border-slate-500 flex items-center justify-between text-left transition-all active:scale-98 cursor-pointer group"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-sky-950/80 border border-sky-700/60 flex items-center justify-center text-sky-400 group-hover:scale-105 transition-transform">
                <User size={22} />
              </div>
              <div>
                <div className="text-sm font-bold text-white">ローカル2人対戦</div>
                <div className="text-[11px] text-slate-400">1台の端末で交互に着手して対戦</div>
              </div>
            </div>
            <div className="text-xs font-bold text-sky-400 bg-sky-950/60 border border-sky-800/60 px-3 py-1.5 rounded-lg">
              選ぶ
            </div>
          </button>

          {/* 3. オンラインP2P対戦 */}
          <button
            type="button"
            onClick={onSelectOnline}
            className="p-4 rounded-xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 hover:border-amber-500/80 flex items-center justify-between text-left transition-all active:scale-98 cursor-pointer group"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-amber-950/80 border border-amber-700/60 flex items-center justify-center text-amber-400 group-hover:scale-105 transition-transform">
                <Globe size={22} />
              </div>
              <div>
                <div className="text-sm font-bold text-white flex items-center gap-1.5">
                  <span>オンラインP2P対戦</span>
                  <span className="text-[10px] bg-amber-500/20 text-amber-300 px-1.5 py-0.2 rounded font-extrabold">おすすめ</span>
                </div>
                <div className="text-[11px] text-slate-400">URLをLINE等で送ってリアルタイム対戦</div>
              </div>
            </div>
            <div className="text-xs font-bold text-amber-400 bg-amber-950/60 border border-amber-800/60 px-3 py-1.5 rounded-lg">
              選ぶ
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};
