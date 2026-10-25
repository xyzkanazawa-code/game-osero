import React, { useState } from 'react';
import { RuleType } from '../types/othello';
import { ROULETTE_EVENTS } from './RouletteModal';

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
  onStartGame
}) => {
  const [activeTab, setActiveTab] = useState<'all' | 'gimmicks' | 'fortress' | 'skills' | 'roulette' | 'bomb'>('all');

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
        <div className="bg-gradient-to-r from-amber-900/60 via-slate-800 to-amber-900/60 px-5 py-3.5 border-b border-amber-500/30 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">📖</span>
            <div>
              <h2 className="text-base sm:text-lg font-black tracking-wide text-amber-300">
                あそびかた ＆ 超ギミック完全ガイド
              </h2>
              <p className="text-[11px] text-slate-300">
                ゲーム中も各ボタンや「💡マーク説明」を押すだけでいつでも効果が表示されます！
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
          {[
            { id: 'all', label: '🌟 全体まとめ' },
            { id: 'gimmicks', label: '👑 盤面ギミック' },
            { id: 'roulette', label: '🎲 天変地異10種' },
            { id: 'skills', label: '🃏 5大スキル' },
            { id: 'fortress', label: '🏰 2段階拡張' },
            { id: 'bomb', label: '💣 爆弾＆クエスト' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`px-2.5 py-1.5 rounded-lg font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-amber-500 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* コンテンツ本文 */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3.5 text-xs sm:text-sm leading-relaxed text-slate-300">
          {activeTab === 'all' && (
            <div className="space-y-3">
              <div className="p-3 bg-emerald-950/40 rounded-xl border border-emerald-500/40">
                <h3 className="font-bold text-emerald-300 text-sm mb-1">💡 迷ったらボタンを押すだけでOK！</h3>
                <p className="text-xs text-slate-200">
                  画面上の**「4大ルール切替」「5大スキル」「盤面下のマーク説明」**は、どのボタンを押してもすぐ下に**わかりやすい日本語ガイド**が表示されます！
                </p>
              </div>

              <div className="p-3 bg-amber-950/40 rounded-xl border border-amber-600/40">
                <h3 className="font-bold text-amber-300 text-sm mb-1">👑 盤面ギミック（王様・？箱・ワープ）</h3>
                <p className="text-xs text-slate-300">
                  ・**👑 キング石（王様）**：最初から黒・白1個ずつ配置！1個で**5点分**の価値！<br />
                  ・**❓ ミステリーマス**：踏むとその場で**天変地異ルーレット**が即発動！<br />
                  ・**🌀 ワープホール**：置くと反対側の同じ色のワープ周囲8マスの敵石も共鳴反転！
                </p>
              </div>

              <div className="p-3 bg-purple-950/40 rounded-xl border border-purple-600/40">
                <h3 className="font-bold text-purple-300 text-sm mb-1">🎲 天変地異ルーレット（全10種＋救済スロット）</h3>
                <p className="text-xs text-slate-300">
                  8手ごと、または「❓マス」を踏んだ時、さらに15点以上差がついた時の**🔥リベンジルーレット**で発動！隕石落下・大渦潮90度回転・福袋・バイオハザード・ドクロ石（−2点）など全10種！
                </p>
              </div>

              <div className="p-3 bg-blue-950/40 rounded-xl border border-blue-600/40">
                <h3 className="font-bold text-blue-300 text-sm mb-1">🃏 5大スキル ＆ 📜 懸賞金ミッション</h3>
                <p className="text-xs text-slate-300">
                  「🛡️鉄壁石」「🎨カラーボム」「🕸️地雷罠」「⚡二連撃」「🔄全反転」の5種類！さらに対局中の**📜ミッション**を達成すると爆弾やスキルがどんどん補充されます！
                </p>
              </div>
            </div>
          )}

          {activeTab === 'gimmicks' && (
            <div className="space-y-3">
              <h3 className="text-base font-bold text-amber-300">👑 盤面上の特殊マス・特別な石</h3>
              <div className="space-y-2.5">
                <div className="p-3 bg-slate-800/90 rounded-xl border border-amber-500/40">
                  <div className="font-bold text-amber-300 text-xs sm:text-sm mb-1">👑 キング石（王様オセロ：1個＝5点！）</div>
                  <p className="text-xs">
                    ゲーム開始時、中央の黒石1個と白石1個が「👑王様の石」になっています。王様は**1個で5点分**のスコアを持ちます！相手に挟まれると王様の所有権が奪われるため、「🛡️鉄壁石」で守るか、相手の王様を奪い取るかが勝敗のカギです！
                  </p>
                </div>

                <div className="p-3 bg-slate-800/90 rounded-xl border border-purple-500/40">
                  <div className="font-bold text-purple-300 text-xs sm:text-sm mb-1">❓ ミステリーマス（？ボックス）</div>
                  <p className="text-xs">
                    盤面の空きマスにある「❓」マークに石を置くと、8手目を待たずに**その場で天変地異ルーレットが即座に発動**します！しかも「平穏」が出ない特別抽選です！
                  </p>
                </div>

                <div className="p-3 bg-slate-800/90 rounded-xl border border-cyan-500/40">
                  <div className="font-bold text-cyan-300 text-xs sm:text-sm mb-1">🌀 次元ワープホール（青ワープ・橙ワープ）</div>
                  <p className="text-xs">
                    青色の🌀同士、オレンジ色の🌀同士が次元トンネルで繋がっています。ワープマスに石を置くと、**反対側にある同じ色のワープマス周囲3×3の敵石もレーザー共鳴して一気にあなたの色に裏返ります！**
                  </p>
                </div>

                <div className="p-3 bg-slate-800/90 rounded-xl border border-zinc-500/40">
                  <div className="font-bold text-yellow-300 text-xs sm:text-sm mb-1">💰 黄金石（＋3点） ＆ 💀 ドクロ石（−2点）</div>
                  <p className="text-xs">
                    ルーレットで変異する特殊石です。💰黄金石は1個3点のお宝石！逆に**💀ドクロ石は持っているとマイナス2点**になる呪いの石なので、わざと相手に挟ませて押し付けましょう！
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'roulette' && (
            <div className="space-y-2.5">
              <h3 className="text-base font-bold text-purple-300">🎲 天変地異ルーレット全10種一覧</h3>
              <p className="text-xs text-slate-400">
                8手ごと・❓マス着地時・🔥リベンジルーレットボタンで回転します！
              </p>
              <div className="grid grid-cols-1 gap-2">
                {ROULETTE_EVENTS.map((ev) => (
                  <div key={ev.type} className="p-2.5 bg-slate-800/90 rounded-xl border border-slate-700 flex items-start gap-2.5">
                    <span className="text-2xl">{ev.icon}</span>
                    <div>
                      <div className="font-bold text-amber-300 text-xs">{ev.name}</div>
                      <p className="text-[11px] text-slate-200">{ev.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'skills' && (
            <div className="space-y-3">
              <h3 className="text-base font-bold text-blue-300">🃏 5大スキルカードの使い方</h3>
              <div className="grid grid-cols-1 gap-2.5">
                <div className="p-3 bg-slate-800 rounded-xl border border-amber-500/30">
                  <div className="font-bold text-amber-300 text-xs mb-1">🛡️ 鉄壁石（アンカー）</div>
                  <p className="text-xs">次に置く石が「絶対に裏返らない無敵石」になります。角や要塞の入り口に置くと最強！</p>
                </div>
                <div className="p-3 bg-slate-800 rounded-xl border border-rose-500/30">
                  <div className="font-bold text-rose-300 text-xs mb-1">🎨 カラーボム（ペンキ弾）</div>
                  <p className="text-xs">挟めない場所でもOK！選んだマスを中心に周囲3×3マスを強制的に自分の色に塗り替えます。</p>
                </div>
                <div className="p-3 bg-slate-800 rounded-xl border border-emerald-500/30">
                  <div className="font-bold text-emerald-300 text-xs mb-1">🕸️ ステルス地雷（隠しトラップ）</div>
                  <p className="text-xs">空きマスにこっそり罠を仕掛けます（相手には見えません）。相手がそのマスに石を置いた瞬間、ドカーン！と周囲3×3があなたの色に吹き飛びます！</p>
                </div>
                <div className="p-3 bg-slate-800 rounded-xl border border-yellow-500/30">
                  <div className="font-bold text-yellow-300 text-xs mb-1">⚡ 二連撃（タイムストップ）</div>
                  <p className="text-xs">石を打った後、相手にターンが渡らず、連続でもう1手打つことができます！</p>
                </div>
                <div className="p-3 bg-slate-800 rounded-xl border border-purple-500/30">
                  <div className="font-bold text-purple-300 text-xs mb-1">🔄 全反転（リバース）</div>
                  <p className="text-xs">盤面上のすべての白石と黒石を入れ替えます！絶体絶命からの大逆転カード！</p>
                </div>
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
                <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-xs space-y-2">
                  <div className="text-amber-400 font-bold">【第1段階】🏰 7マス要塞解放</div>
                  <div>・元の角（🏰マーク）を取ると、その角の外側に横3＋縦3＋角1の計7マスが出現！</div>
                  <div className="text-purple-400 font-bold mt-2">【第2段階】⚡ 5マス最終要塞解放</div>
                  <div>・第1要塞の角（⚡マーク）を取ると、さらに外側へ横3＋縦2の計5マスが出現！</div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'bomb' && (
            <div className="space-y-3">
              <div className="p-3.5 bg-red-950/30 rounded-xl border border-red-500/40">
                <h3 className="text-sm font-bold text-red-300 mb-1">💣 爆弾石モード</h3>
                <p className="text-xs">
                  【💣 爆弾を使う】を押して石を置くと、通常の挟み取りに加えて**着弾点の周囲3×3マスの敵石を丸ごと爆破して自分の色**に変えます！
                </p>
              </div>

              <div className="p-3.5 bg-amber-950/30 rounded-xl border border-amber-500/40">
                <h3 className="text-sm font-bold text-amber-300 mb-1">📜 リアルタイム懸賞金ミッション</h3>
                <p className="text-xs">
                  画面上部に「1手で3枚以上裏返せ！」などのミッションが常時表示されます。達成するとその場で**爆弾石やスキルカードが＋1個ボーナス支給**され、次のミッションが出現します！
                </p>
              </div>
            </div>
          )}
        </div>

        {/* フッター */}
        <div className="p-3.5 bg-slate-950 border-t border-slate-800 flex items-center justify-between gap-3">
          <span className="text-[11px] text-slate-400 hidden sm:inline">
            画面下の「💬 かんたんチャット」でスタンプや会話も楽しめます！
          </span>
          <button
            onClick={handleStart}
            className="w-full sm:w-auto px-6 py-2 bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-black text-sm rounded-xl shadow-[0_0_20px_rgba(245,158,11,0.5)] transition-all transform hover:scale-[1.02] active:scale-95 cursor-pointer flex items-center justify-center gap-2"
          >
            <span>🚀</span>
            <span>理解した！ゲームに戻る</span>
          </button>
        </div>
      </div>
    </div>
  );
};
