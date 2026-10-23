import React, { useState } from 'react';
import { RuleType } from '../types/othello';

interface RulesModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentRule: RuleType;
  enableSkills: boolean;
  enableRoulette: boolean;
  onStartGame?: () => void;
}

export const RulesModal: React.FC<RulesModalProps> = ({
  isOpen,
  onClose,
  currentRule,
  enableSkills,
  enableRoulette,
  onStartGame
}) => {
  const [activeTab, setActiveTab] = useState<'all' | 'fortress' | 'skills' | 'roulette' | 'bomb'>('all');

  if (!isOpen) return null;

  const handleStart = () => {
    if (onStartGame) {
      onStartGame();
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-xl max-h-[90vh] bg-slate-900 border-2 border-amber-500/50 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-100">
        {/* ヘッダー */}
        <div className="bg-gradient-to-r from-amber-900/60 via-slate-800 to-amber-900/60 px-5 py-4 border-b border-amber-500/30 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">📖</span>
            <div>
              <h2 className="text-lg font-black tracking-wide text-amber-300">
                あそびかた ＆ ルールガイド
              </h2>
              <p className="text-xs text-slate-400">
                ルールを確認して【対戦スタート】を押して始めよう！
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center text-sm font-bold transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* タブナビゲーション */}
        <div className="flex gap-1 p-2 bg-slate-950/80 border-b border-slate-800 text-xs overflow-x-auto">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'all'
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            🌟 全体概要
          </button>
          <button
            onClick={() => setActiveTab('fortress')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'fortress'
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            🏰 2段階拡張
          </button>
          <button
            onClick={() => setActiveTab('skills')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'skills'
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            🃏 特殊スキル
          </button>
          <button
            onClick={() => setActiveTab('roulette')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'roulette'
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            🎲 天変地異
          </button>
          <button
            onClick={() => setActiveTab('bomb')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'bomb'
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            💣 爆弾石
          </button>
        </div>

        {/* コンテンツ本文（スクロール可能） */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs sm:text-sm leading-relaxed text-slate-300">
          {activeTab === 'all' && (
            <div className="space-y-4">
              <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700/80">
                <h3 className="font-bold text-amber-400 text-sm mb-1 flex items-center gap-1.5">
                  <span>⚫⚪</span> 基本ルール（オセロ）
                </h3>
                <p className="text-slate-300 text-xs">
                  相手の石を自分の石で縦・横・斜めに挟むと、自分の色にひっくり返ります。
                  最後に石が多い方の勝ちです。
                </p>
              </div>

              <div className="p-3 bg-amber-950/40 rounded-xl border border-amber-600/40">
                <h3 className="font-bold text-amber-300 text-sm mb-1 flex items-center gap-1.5">
                  <span>🏰</span> 2段階城壁拡張モード
                </h3>
                <p className="text-slate-300 text-xs">
                  初期の8x8の角を取ると、手書き指定の**7マス要塞**が出現！さらにその先端の角を取ると**第2要塞（5マス）**が覚醒します！
                </p>
              </div>

              <div className="p-3 bg-blue-950/40 rounded-xl border border-blue-600/40">
                <h3 className="font-bold text-blue-300 text-sm mb-1 flex items-center gap-1.5">
                  <span>🃏</span> 特殊能力スキルバトル
                </h3>
                <p className="text-slate-300 text-xs">
                  裏返らない「🛡️鉄壁石」、3×3を一網打尽にする「🎨カラーボム」、2回連続で打てる「⚡タイムストップ」、白黒が総入れ替えになる「🔄全反転」が使えます！
                </p>
              </div>

              <div className="p-3 bg-purple-950/40 rounded-xl border border-purple-600/40">
                <h3 className="font-bold text-purple-300 text-sm mb-1 flex items-center gap-1.5">
                  <span>🎲</span> 天変地異ルーレット
                </h3>
                <p className="text-slate-300 text-xs">
                  8手ごとに突発ルーレットが回転！石が流される「🌪️突風」や「⚡落雷」、3点になる「💰黄金石」など大波乱の展開に！
                </p>
              </div>
            </div>
          )}

          {activeTab === 'fortress' && (
            <div className="space-y-3">
              <div className="p-4 bg-amber-950/30 rounded-xl border border-amber-500/40">
                <h3 className="text-base font-bold text-amber-300 mb-2">🏰 2段階城壁拡張の仕組み</h3>
                <p className="mb-3 text-xs leading-5">
                  中央8×8の四隅を取ることで、外側に向かって盤面が2段階で覚醒進化します！
                </p>
                <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-xs space-y-2 font-mono">
                  <div className="text-amber-400 font-bold">【第1段階】マサの手書き7マス要塞</div>
                  <div>・元の角を取ると、その角の外側に横3＋縦3＋角1の計7マスが出現。</div>
                  <div className="text-purple-400 font-bold mt-2">【第2段階】最果ての5マス城壁（パターンA）</div>
                  <div>・第1要塞の角（⚡マーク）を取ると、さらに外側へ横3＋縦2の計5マスが出現！</div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'skills' && (
            <div className="space-y-3">
              <h3 className="text-base font-bold text-blue-300">🃏 各プレイヤーが使える4大スキル</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div className="p-3 bg-slate-800 rounded-xl border border-amber-500/30">
                  <div className="flex items-center gap-2 font-bold text-amber-300 text-xs mb-1">
                    <span className="text-lg">🛡️</span> 鉄壁石（アンカー）
                  </div>
                  <p className="text-xs text-slate-300">
                    次に置く石が「絶対に裏返らない無敵石」になります。角の隣や激戦区に打つと強力！
                  </p>
                </div>

                <div className="p-3 bg-slate-800 rounded-xl border border-red-500/30">
                  <div className="flex items-center gap-2 font-bold text-red-300 text-xs mb-1">
                    <span className="text-lg">🎨</span> カラーボム（ペンキ弾）
                  </div>
                  <p className="text-xs text-slate-300">
                    挟めない場所でもOK！選んだマスを中心に3×3マスを一気に自分の色に染め上げます。
                  </p>
                </div>

                <div className="p-3 bg-slate-800 rounded-xl border border-yellow-500/30">
                  <div className="flex items-center gap-2 font-bold text-yellow-300 text-xs mb-1">
                    <span className="text-lg">⚡</span> タイムストップ（二連撃）
                  </div>
                  <p className="text-xs text-slate-300">
                    石を置いた後、ターンが相手に渡らず、連続でもう1手打つことができます！
                  </p>
                </div>

                <div className="p-3 bg-slate-800 rounded-xl border border-purple-500/30">
                  <div className="flex items-center gap-2 font-bold text-purple-300 text-xs mb-1">
                    <span className="text-lg">🔄</span> 全反転（リバース）
                  </div>
                  <p className="text-xs text-slate-300">
                    盤面上のすべての白と黒を反転させます！大劣勢からの超一発逆転カード！
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'roulette' && (
            <div className="space-y-3">
              <h3 className="text-base font-bold text-purple-300">🎲 天変地異ルーレットのハプニング一覧</h3>
              <p className="text-xs text-slate-400">8手ごとに突発イベントが抽選されます。</p>
              <div className="space-y-2">
                <div className="p-2.5 bg-slate-800/90 rounded-lg flex items-start gap-2.5">
                  <span className="text-xl">🌪️</span>
                  <div>
                    <span className="font-bold text-cyan-300 text-xs">突風（Gale）</span>
                    <p className="text-xs text-slate-300">暴風が吹き、盤面全体の石がランダムな方向へ1マス一斉にスライド！</p>
                  </div>
                </div>
                <div className="p-2.5 bg-slate-800/90 rounded-lg flex items-start gap-2.5">
                  <span className="text-xl">🌘</span>
                  <div>
                    <span className="font-bold text-indigo-300 text-xs">皆既日食（Eclipse）</span>
                    <p className="text-xs text-slate-300">光と闇が反転！すべての石の白黒が入れ替わります。</p>
                  </div>
                </div>
                <div className="p-2.5 bg-slate-800/90 rounded-lg flex items-start gap-2.5">
                  <span className="text-xl">⚡</span>
                  <div>
                    <span className="font-bold text-yellow-300 text-xs">落雷（Lightning）</span>
                    <p className="text-xs text-slate-300">盤面のランダムな地点に落雷！直撃した石が反転します。</p>
                  </div>
                </div>
                <div className="p-2.5 bg-slate-800/90 rounded-lg flex items-start gap-2.5">
                  <span className="text-xl">💰</span>
                  <div>
                    <span className="font-bold text-amber-300 text-xs">黄金変異（Midas）</span>
                    <p className="text-xs text-slate-300">ランダムな石が1個3点分の価値がある「黄金石」に変化！</p>
                  </div>
                </div>
                <div className="p-2.5 bg-slate-800/90 rounded-lg flex items-start gap-2.5">
                  <span className="text-xl">🕊️</span>
                  <div>
                    <span className="font-bold text-emerald-300 text-xs">平穏（Peace）</span>
                    <p className="text-xs text-slate-300">静かな風が吹き抜け、何も起きません。</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'bomb' && (
            <div className="space-y-3">
              <div className="p-4 bg-red-950/30 rounded-xl border border-red-500/40">
                <h3 className="text-base font-bold text-red-300 mb-2">💣 爆弾石モード</h3>
                <p className="text-xs leading-5 mb-2">
                  各プレイヤーが試合中**1回だけ**使えるダイナマイト級の必殺石！
                </p>
                <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-xs space-y-1">
                  <div>・【💣 爆弾モードON】を押して石を置くと発動！</div>
                  <div>・通常の挟み取りに加え、**着弾点周囲3×3の敵石を丸ごと爆破して自分の色に塗り替え**ます！</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* フッター（スタートボタン） */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between gap-3">
          <span className="text-[11px] text-slate-400 hidden sm:inline">
            いつでも画面上の「❓ ルール説明」から確認できます。
          </span>
          <button
            onClick={handleStart}
            className="w-full sm:w-auto px-6 py-2.5 bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-black text-sm rounded-xl shadow-[0_0_20px_rgba(245,158,11,0.5)] transition-all transform hover:scale-[1.02] active:scale-95 cursor-pointer flex items-center justify-center gap-2"
          >
            <span>🚀</span>
            <span>対戦スタート！</span>
          </button>
        </div>
      </div>
    </div>
  );
};