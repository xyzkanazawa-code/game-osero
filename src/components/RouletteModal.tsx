import React, { useEffect, useState, useRef } from 'react';
import { RouletteEvent } from '../types/othello';

interface RouletteModalProps {
  isOpen: boolean;
  reason?: string;
  isRevengeOrMystery?: boolean;
  onSpinComplete: (event: RouletteEvent) => void;
}

export const ROULETTE_EVENTS: {
  type: RouletteEvent;
  name: string;
  icon: string;
  desc: string;
  detail: string;
  color: string;
}[] = [
  {
    type: 'gale',
    name: '突風（Gale）',
    icon: '🌪️',
    desc: '盤面全体の石がランダムな方向へ1マス移動！',
    detail: '北・南・東・西のいずれかへすべての石が1マス流されます。角や端の陣形が一変！',
    color: 'from-cyan-600 to-blue-700'
  },
  {
    type: 'eclipse',
    name: '皆既日食（Eclipse）',
    icon: '🌘',
    desc: '白と黒が一瞬で全反転！大逆転のチャンス！',
    detail: '盤面上のすべての黒石が白に、白石が黒に入れ替わります！負けている時に出れば一撃逆転！',
    color: 'from-indigo-700 to-purple-900'
  },
  {
    type: 'lightning',
    name: '落雷（Lightning）',
    icon: '⚡',
    desc: '盤面にカミナリが直撃！最大3箇所の石が反転！',
    detail: 'ランダムな石2〜3個に雷が落ち、反対の色にひっくり返ります。',
    color: 'from-yellow-500 to-amber-600'
  },
  {
    type: 'midas',
    name: '黄金変異（Midas）',
    icon: '💰',
    desc: '石が1個3点分の【黄金石】に変異！',
    detail: 'ランダムな石最大3個がキラキラ輝く黄金石（1個＝3点）にパワーアップします！',
    color: 'from-amber-400 to-yellow-600'
  },
  {
    type: 'meteor',
    name: '隕石落下（Meteor）',
    icon: '☄️',
    desc: '巨大隕石が直撃！石が吹き飛んで空きマスに戻る！',
    detail: '盤面の石（最大3個）が宇宙の彼方へ吹き飛び、再び打てる空きマスに戻ります！',
    color: 'from-orange-600 to-red-800'
  },
  {
    type: 'whirlpool',
    name: '大渦潮（Whirlpool）',
    icon: '🌀',
    desc: '中央の4×4エリアが時計回りに90度大回転！',
    detail: '盤面真ん中の16マスがグルッと時計回りに90度回転し、挟めるラインが劇的に変化します！',
    color: 'from-blue-600 to-indigo-800'
  },
  {
    type: 'treasure',
    name: '天からの福袋（Treasure）',
    icon: '🎁',
    desc: '両者に【💣爆弾＋1＆🃏スキル＋1】支給＋❓出現！',
    detail: 'お互いに爆弾石とランダムなスキルが1個ずつ補充され、盤面に❓ボックスも出現する大ボーナス！',
    color: 'from-pink-500 to-rose-600'
  },
  {
    type: 'biohazard',
    name: 'バイオハザード（Virus）',
    icon: '🦠',
    desc: 'ウイルス拡散！周囲の敵石を一気に感染同化！',
    detail: 'ランダムな石1個から周囲3×3の相手石へウイルスが感染し、同じ色に染め上げます！',
    color: 'from-lime-600 to-emerald-800'
  },
  {
    type: 'skull',
    name: '死神の宣告（Skull）',
    icon: '💀',
    desc: '石が【−2点のドクロ石】に変異！相手に押し付けろ！',
    detail: 'ランダムな石2個が持っているとマイナス2点になる「💀ドクロ石」になります。わざと相手に取らせよう！',
    color: 'from-slate-700 to-zinc-900'
  },
  {
    type: 'peace',
    name: '平穏（Peace）',
    icon: '🕊️',
    desc: '穏やかな風が吹き抜け、何も起きない（セーフ）',
    detail: '天変地異は起きず、そのままの盤面で対局が続きます。リードしている側には嬉しい出目！',
    color: 'from-emerald-600 to-teal-700'
  }
];

export const RouletteModal: React.FC<RouletteModalProps> = ({
  isOpen,
  reason = '8手ごとの定期天変地異',
  isRevengeOrMystery = false,
  onSpinComplete
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isSpinning, setIsSpinning] = useState(true);
  const [result, setResult] = useState<(typeof ROULETTE_EVENTS)[0] | null>(null);
  const chosenRef = useRef<(typeof ROULETTE_EVENTS)[0]>(ROULETTE_EVENTS[0]);
  const completedRef = useRef(false);

  useEffect(() => {
    if (!isOpen) {
      setIsSpinning(true);
      setResult(null);
      completedRef.current = false;
      return;
    }

    // 抽選プール（❓ボックスや🔥リベンジルーレットの時は平穏が出にくく強イベントが出やすい！）
    const pool = isRevengeOrMystery
      ? ROULETTE_EVENTS.filter((e) => e.type !== 'peace')
      : ROULETTE_EVENTS;
    const chosenEvent = pool[Math.floor(Math.random() * pool.length)];
    chosenRef.current = chosenEvent;

    let counter = 0;
    const maxSpins = 24 + Math.floor(Math.random() * 8);

    const interval = setInterval(() => {
      counter++;
      setCurrentIndex((prev) => (prev + 1) % ROULETTE_EVENTS.length);

      if (counter >= maxSpins) {
        clearInterval(interval);
        setResult(chosenEvent);
        setIsSpinning(false);

        setTimeout(() => {
          if (!completedRef.current) {
            completedRef.current = true;
            onSpinComplete(chosenEvent.type);
          }
        }, 1800);
      }
    }, 65);

    return () => clearInterval(interval);
  }, [isOpen, isRevengeOrMystery, onSpinComplete]);

  const handleManualStop = () => {
    if (!isSpinning) return;
    const chosen = ROULETTE_EVENTS[currentIndex];
    chosenRef.current = chosen;
    setResult(chosen);
    setIsSpinning(false);

    setTimeout(() => {
      if (!completedRef.current) {
        completedRef.current = true;
        onSpinComplete(chosen.type);
      }
    }, 1500);
  };

  if (!isOpen) return null;

  const currentItem = result || ROULETTE_EVENTS[currentIndex];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-sm bg-slate-900 border-2 border-purple-500/70 rounded-3xl p-5 shadow-[0_0_50px_rgba(168,85,247,0.5)] flex flex-col items-center text-center overflow-hidden">
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-purple-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-amber-500/20 rounded-full blur-3xl pointer-events-none" />

        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-950/80 border border-purple-500/50 mb-2 text-purple-200 font-extrabold text-[11px]">
          <span>🎲</span>
          <span>{reason}</span>
          <span>🎲</span>
        </div>

        <h3 className="text-base sm:text-lg font-black text-white mb-4">
          {isSpinning ? '運命のルーレット回転中…！' : '⚡ 天変地異が発動！！ ⚡'}
        </h3>

        {/* ルーレット表示カード */}
        <div
          className={`w-full py-5 px-4 rounded-2xl bg-gradient-to-br ${currentItem.color} text-white shadow-xl transition-all duration-150 transform ${
            isSpinning ? 'scale-95' : 'scale-105 ring-4 ring-amber-300 animate-bounce'
          }`}
        >
          <div className="text-5xl mb-2 filter drop-shadow-md">{currentItem.icon}</div>
          <div className="text-lg sm:text-xl font-black tracking-wide drop-shadow-md">{currentItem.name}</div>
          <p className="text-xs text-white font-bold mt-1.5 px-2">{currentItem.desc}</p>
          {!isSpinning && (
            <p className="text-[11px] text-white/90 mt-2 bg-black/30 rounded-lg p-2 leading-relaxed">
              💡 {currentItem.detail}
            </p>
          )}
        </div>

        {/* 手動ストップボタン */}
        {isSpinning ? (
          <button
            type="button"
            onClick={handleManualStop}
            className="mt-5 w-full py-2.5 bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-black text-sm rounded-xl shadow-lg active:scale-95 transition-all cursor-pointer"
          >
            🎯 今すぐストップ！（または自動停止）
          </button>
        ) : (
          <div className="mt-4 text-xs text-amber-300 font-extrabold animate-pulse">
            盤面にイベント効果を適用しています…！
          </div>
        )}
      </div>
    </div>
  );
};
