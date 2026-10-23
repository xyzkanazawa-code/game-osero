import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Trophy, RotateCcw, X, Award } from 'lucide-react';
import { GameMode, Player, Score } from '../types/othello';

interface GameOverModalProps {
  isOpen: boolean;
  winner: Player | 'draw';
  score: Score;
  mode: GameMode;
  myColor?: Player;
  onRestart: () => void;
  onClose: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  isOpen,
  winner,
  score,
  mode,
  myColor = 'black',
  onRestart,
  onClose
}) => {
  useEffect(() => {
    if (isOpen) {
      const isPlayerWin =
        (mode === 'cpu' && winner === 'black') ||
        (mode === 'online' && winner === myColor) ||
        (mode === 'local' && winner !== 'draw');

      if (isPlayerWin) {
        // 華やかな紙吹雪
        try {
          confetti({
            particleCount: 80,
            spread: 70,
            origin: { y: 0.6 }
          });
          setTimeout(() => {
            confetti({
              particleCount: 50,
              angle: 60,
              spread: 55,
              origin: { x: 0 }
            });
            confetti({
              particleCount: 50,
              angle: 120,
              spread: 55,
              origin: { x: 1 }
            });
          }, 300);
        } catch (e) {}
      }
    }
  }, [isOpen, winner, mode, myColor]);

  if (!isOpen) return null;

  const getResultTitle = () => {
    if (winner === 'draw') return '引き分け！ (Draw)';
    if (mode === 'cpu') {
      return winner === 'black' ? '🎉 あなたの勝利！' : '😢 CPUの勝利...';
    }
    if (mode === 'online') {
      return winner === myColor ? '🎉 あなたの勝利！' : '相手の勝利';
    }
    return winner === 'black' ? '黒の勝利！' : '白の勝利！';
  };

  const diff = Math.abs(score.black - score.white);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-sm bg-slate-900 border border-slate-700/80 rounded-2xl p-6 shadow-2xl flex flex-col items-center text-center gap-4">
        {/* アイコン */}
        <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-amber-500 to-yellow-300 flex items-center justify-center text-slate-950 shadow-lg shadow-amber-500/30">
          <Trophy size={36} />
        </div>

        {/* 勝敗タイトル */}
        <div>
          <h2 className="text-2xl font-extrabold text-white tracking-wide">
            {getResultTitle()}
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            {diff > 0 ? `${diff}枚差で決着しました！` : '同数で終局しました！'}
          </p>
        </div>

        {/* 最終スコアボード */}
        <div className="grid grid-cols-2 gap-3 w-full p-4 bg-slate-950/80 rounded-xl border border-slate-800">
          {/* 黒 */}
          <div className="flex flex-col items-center gap-1">
            <div className="flex items-center gap-1.5 text-xs text-slate-300 font-bold">
              <span className="w-3.5 h-3.5 rounded-full bg-slate-950 border border-slate-700 inline-block shadow-sm" />
              <span>黒</span>
            </div>
            <div className="text-3xl font-extrabold text-white font-mono">
              {score.black}
            </div>
          </div>

          {/* 白 */}
          <div className="flex flex-col items-center gap-1">
            <div className="flex items-center gap-1.5 text-xs text-slate-300 font-bold">
              <span className="w-3.5 h-3.5 rounded-full bg-slate-100 border border-slate-300 inline-block shadow-sm" />
              <span>白</span>
            </div>
            <div className="text-3xl font-extrabold text-white font-mono">
              {score.white}
            </div>
          </div>
        </div>

        {/* アクションボタン */}
        <div className="flex flex-col gap-2 w-full mt-2">
          <button
            type="button"
            onClick={onRestart}
            className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-sm rounded-xl shadow-lg active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <RotateCcw size={16} />
            <span>もう一度対戦する</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl transition-all cursor-pointer"
          >
            盤面を確認する
          </button>
        </div>
      </div>
    </div>
  );
};
