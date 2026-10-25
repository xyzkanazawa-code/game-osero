import React, { useState } from 'react';
import { Player, PlayerSkills, SkillType } from '../types/othello';

interface SkillBarProps {
  skills: PlayerSkills;
  activeSkill: SkillType | null;
  onSelectSkill: (skill: SkillType) => void;
  turn: Player;
  isMyTurn: boolean;
  disabled?: boolean;
}

export const SKILL_INFO_LIST: {
  type: SkillType;
  label: string;
  icon: string;
  shortDesc: string;
  actionGuide: string;
}[] = [
  {
    type: 'shield',
    label: '鉄壁石',
    icon: '🛡️',
    shortDesc: '裏返らない無敵の石を置く',
    actionGuide: '🛡️【鉄壁石 装填中！】次にあなたが打つ石が「絶対に裏返らない無敵の鉄壁石」になります。そのまま打てるマス（黄色い点）をタップして石を置いてください！（もう一度ボタンを押すと解除）'
  },
  {
    type: 'colorBomb',
    label: 'カラーボム',
    icon: '🎨',
    shortDesc: '3×3マスを直接自分色に塗装',
    actionGuide: '🎨【カラーボム 選択中！】挟めない場所でもOK！盤面上の好きなマスをタップすると、その周囲3×3マスを一気にあなたの色に塗り替えます！（もう一度ボタンを押すと解除）'
  },
  {
    type: 'trap',
    label: '地雷罠',
    icon: '🕸️',
    shortDesc: '空きマスにステルス地雷設置',
    actionGuide: '🕸️【地雷罠 選択中！】盤面の好きな「空きマス」をタップして、相手に見えないステルス地雷を仕掛けます！相手がそのマスに石を置いた瞬間、周囲3×3があなたの色に大爆発します！'
  },
  {
    type: 'timeStop',
    label: '二連撃',
    icon: '⚡',
    shortDesc: '2回連続で自分の手番になる',
    actionGuide: '⚡【二連撃（タイムストップ）】ボタンを押すと即発動！このターンに石を打った後、相手に手番が渡らず、連続でもう1回あなたが打てます！'
  },
  {
    type: 'reverse',
    label: '全反転',
    icon: '🔄',
    shortDesc: '盤面の白黒をすべて入れ替え',
    actionGuide: '🔄【全反転（リバース）】ボタンを押すと即発動！盤面上のすべての白石と黒石を一瞬で入れ替えます！大劣勢からの一発大逆転カード！'
  }
];

export const SkillBar: React.FC<SkillBarProps> = ({
  skills,
  activeSkill,
  onSelectSkill,
  isMyTurn,
  disabled = false
}) => {
  const [infoSkill, setInfoSkill] = useState<SkillType | null>(null);

  const currentGuideSkill = activeSkill || infoSkill;
  const currentGuide = SKILL_INFO_LIST.find((s) => s.type === currentGuideSkill);

  return (
    <div className="w-full max-w-[440px] flex flex-col gap-1">
      <div className="w-full bg-slate-900/95 border border-slate-700/80 rounded-xl p-1.5 shadow-lg flex flex-col gap-1 text-slate-100">
        <div className="flex items-center justify-between px-1">
          <div className="text-[10px] font-black text-amber-300 flex items-center gap-1">
            <span>🃏</span>
            <span>特殊能力スキル（ボタンを押すと説明＆発動！）</span>
          </div>
          <button
            type="button"
            onClick={() => setInfoSkill(infoSkill ? null : 'shield')}
            className="text-[9px] text-sky-300 hover:text-sky-200 bg-sky-950/70 border border-sky-700/60 px-1.5 py-0.5 rounded font-bold cursor-pointer"
          >
            {infoSkill ? '説明を閉じる ✕' : '❓ スキルとは？'}
          </button>
        </div>

        <div className="grid grid-cols-5 gap-1">
          {SKILL_INFO_LIST.map((item) => {
            const count = skills[item.type] || 0;
            const isSelected = activeSkill === item.type;
            const isUsable = !disabled && isMyTurn && count > 0;

            return (
              <button
                key={item.type}
                type="button"
                onClick={() => {
                  setInfoSkill(item.type);
                  if (isUsable) {
                    onSelectSkill(item.type);
                  }
                }}
                className={`relative py-1 px-0.5 rounded-lg flex flex-col items-center justify-center transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-gradient-to-b from-amber-400 to-yellow-500 text-slate-950 font-black shadow-[0_0_12px_rgba(245,158,11,0.7)] ring-2 ring-amber-200 scale-105 z-10'
                    : isUsable
                    ? 'bg-slate-800/90 hover:bg-slate-700 text-slate-100 border border-slate-600/80'
                    : 'bg-slate-950/60 text-slate-500 border border-slate-800/80 opacity-65'
                }`}
              >
                <div className="flex items-center gap-0.5">
                  <span className="text-xs sm:text-sm">{item.icon}</span>
                  <span className="text-[9px] sm:text-[11px] font-extrabold">{item.label}</span>
                </div>
                <span
                  className={`text-[8px] px-1 rounded-full mt-0.5 ${
                    isSelected
                      ? 'bg-slate-950 text-amber-300 font-extrabold'
                      : count > 0
                      ? 'bg-slate-900 text-amber-300 font-bold'
                      : 'bg-slate-900 text-slate-500'
                  }`}
                >
                  残{count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 💡 選択中または確認中のスキル説明バナー */}
      {currentGuide && (
        <div
          className={`p-2 rounded-xl border text-[11px] leading-relaxed flex items-start justify-between gap-2 shadow-md animate-fade-in ${
            activeSkill
              ? 'bg-amber-950/90 border-amber-400 text-amber-100 font-bold'
              : 'bg-slate-900/95 border-sky-500/50 text-slate-200'
          }`}
        >
          <div>
            <div className="font-black text-amber-300 mb-0.5 flex items-center gap-1">
              <span>{currentGuide.icon}</span>
              <span>{currentGuide.label}: {currentGuide.shortDesc}</span>
            </div>
            <p className="text-[10px] sm:text-[11px] text-slate-100">{currentGuide.actionGuide}</p>
          </div>
          <button
            type="button"
            onClick={() => setInfoSkill(null)}
            className="text-slate-400 hover:text-white font-bold px-1 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
};
