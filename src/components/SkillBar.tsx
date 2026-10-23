import React from 'react';
import { Player, PlayerSkills, SkillType } from '../types/othello';

interface SkillBarProps {
  skills: PlayerSkills;
  activeSkill: SkillType | null;
  onSelectSkill: (skill: SkillType) => void;
  turn: Player;
  isMyTurn: boolean;
  disabled?: boolean;
}

export const SkillBar: React.FC<SkillBarProps> = ({
  skills,
  activeSkill,
  onSelectSkill,
  turn,
  isMyTurn,
  disabled = false
}) => {
  const skillList: {
    type: SkillType;
    label: string;
    icon: string;
    count: number;
    desc: string;
    color: string;
  }[] = [
    {
      type: 'shield',
      label: '鉄壁石',
      icon: '🛡️',
      count: skills.shield,
      desc: '裏返らない無敵石を置く',
      color: 'from-amber-600 to-amber-700'
    },
    {
      type: 'colorBomb',
      label: 'カラーボム',
      icon: '🎨',
      count: skills.colorBomb,
      desc: '3×3を直接塗り替え',
      color: 'from-rose-600 to-rose-700'
    },
    {
      type: 'timeStop',
      label: '二連撃',
      icon: '⚡',
      count: skills.timeStop,
      desc: 'もう一度自分の手番',
      color: 'from-yellow-600 to-amber-700'
    },
    {
      type: 'reverse',
      label: '全反転',
      icon: '🔄',
      count: skills.reverse,
      desc: '盤面の白黒を全反転',
      color: 'from-purple-600 to-indigo-700'
    }
  ];

  return (
    <div className="w-full max-w-[500px] bg-slate-900/90 border border-slate-700/80 rounded-xl p-1.5 shadow-lg flex items-center justify-between gap-1 text-slate-100">
      <div className="text-[10px] font-black text-slate-400 px-1 hidden sm:flex items-center gap-1">
        <span>🃏</span>
        <span>スキル</span>
      </div>

      <div className="flex-1 grid grid-cols-4 gap-1">
        {skillList.map((item) => {
          const isSelected = activeSkill === item.type;
          const isUsable = !disabled && isMyTurn && item.count > 0;

          return (
            <button
              key={item.type}
              type="button"
              disabled={!isUsable}
              onClick={() => onSelectSkill(item.type)}
              className={`relative py-1 px-1 rounded-lg flex flex-col items-center justify-center transition-all cursor-pointer ${
                isSelected
                  ? 'bg-gradient-to-b from-amber-400 to-yellow-500 text-slate-950 font-black shadow-[0_0_12px_rgba(245,158,11,0.6)] ring-2 ring-amber-300 scale-105 z-10'
                  : isUsable
                  ? 'bg-slate-800/90 hover:bg-slate-700 text-slate-200 border border-slate-700'
                  : 'bg-slate-950/60 text-slate-600 border border-slate-900 opacity-50 cursor-not-allowed'
              }`}
            >
              <div className="flex items-center gap-1">
                <span className="text-xs sm:text-sm">{item.icon}</span>
                <span className="text-[10px] sm:text-xs font-bold">{item.label}</span>
              </div>
              <span
                className={`text-[8px] sm:text-[9px] px-1 rounded-full mt-0.5 ${
                  isSelected
                    ? 'bg-slate-950 text-amber-300 font-extrabold'
                    : 'bg-slate-900 text-slate-300'
                }`}
              >
                残り {item.count}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};