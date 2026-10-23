import React, { useEffect, useState } from 'react';
import { RouletteEvent } from '../types/othello';

interface RouletteModalProps {
  isOpen: boolean;
  onSpinComplete: (event: RouletteEvent) => void;
}

const EVENTS: {
  type: RouletteEvent;
  name: string;
  icon: string;
  desc: string;
  color: string;
}[] = [
  {
    type: 'gale',
    name: '突風（Gale）',
    icon: '🌪️',
    desc: '盤面全体の石がランダムな方向へ1マス移動！',
    color: 'from-cyan-600 to-blue-600'
  },
  {
    type: 'eclipse',
    name: '皆既日食（Eclipse）',
    icon: '🌘',
    desc: '白と黒が一瞬で全反転！大逆転のチャンス！',
    color: 'from-indigo-700 to-purple-800'
  },
  {
    type: 'lightning',
    name: '落雷（Lightning）',
    icon: '⚡',
    desc: '盤面にカミナリが直撃！石が反転！',
    color: 'from-yellow-500 to-amber-600'
  },
  {
    type: 'midas',
    name: '黄金変異（Midas）',
    icon: '💰',
    desc: '石が1個3点分の【黄金石】に変異！',
    color: 'from-amber-400 to-yellow-600'
  },
  {
    type: 'peace',
    name: '平穏（Peace）',
    icon: '🕊️',
    desc: '穏やかな風が吹き抜け、何も起きない（セーフ）',
    color: 'from-emerald-600 to-teal-700'
  }
];

export const RouletteModal: React.FC<RouletteModalProps> = ({ isOpen, onSpinComplete }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isSpinning, setIsSpinning] = useState(true);
  const [result, setResult] = useState<(typeof EVENTS)[0] | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setIsSpinning(true);
      setResult(null);
      return;
    }

    // スピン開始
    let speed = 60;
    let counter = 0;
    const maxSpins = 25 + Math.floor(Math.random() * 10);
    const chosenEvent = EVENTS[Math.floor(Math.random() * EVENTS.length)];

    const interval = setInterval(() => {
      counter++;
      setCurrentIndex((prev) => (prev + 1) % EVENTS.length);

      if (counter >= maxSpins) {
        clearInterval(interval);
        setResult(chosenEvent);
        setIsSpinning(false);

        // 結果確定後、少し余韻を持たせて完了コールバック
        setTimeout(() => {
          onSpinComplete(chosenEvent.type);
        }, 1600);
      }
    }, speed);

    return () => clearInterval(interval);
  }, [isOpen, onSpinComplete]);

  if (!isOpen) return null;

  const currentItem = result || EVENTS[currentIndex];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-sm bg-slate-900 border-2 border-purple-500/60 rounded-3xl p-6 shadow-[0_0_50px_rgba(168,85,247,0.5)] flex flex-col items-center text-center overflow-hidden">
        {/* 背景の光彩 */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-purple-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-amber-500/20 rounded-full blur-3xl pointer-events-none" />

        <div className="flex items-center gap-2 mb-2 text-purple-300 font-extrabold tracking-widest text-xs uppercase">
          <span>🎲</span>
          <span>天変地異ルーレット</span>
          <span>🎲</span>
        </div>

        <h3 className="text-lg font-black text-white mb-6">
          {isSpinning ? '運命のルーレット回転中…！' : '天変地異が発動！！'}
        </h3>

        {/* ルーレット表示カード */}
        <div
          className={`w-full py-6 px-4 rounded-2xl bg-gradient-to-br ${currentItem.color} text-white shadow-xl transition-all duration-150 transform ${
            isSpinning ? 'scale-95' : 'scale-105 ring-4 ring-white/80 animate-bounce'
          }`}
        >
          <div className="text-5xl mb-2 filter drop-shadow-md">{currentItem.icon}</div>
          <div className="text-xl font-black tracking-wide drop-shadow-md">{currentItem.name}</div>
          <p className="text-xs text-white/90 mt-2 font-medium px-2">{currentItem.desc}</p>
        </div>

        <div className="mt-6 text-xs text-slate-400 font-bold">
          {isSpinning ? '何が起こるか予測不能…！' : '盤面に異変が発生中！'}
        </div>
      </div>
    </div>
  );
};