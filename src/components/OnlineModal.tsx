import React, { useState } from 'react';
import { Globe, Copy, Check, X, Loader2, Share2, ArrowRight } from 'lucide-react';
import { ConnectionStatus } from '../utils/p2p';

interface OnlineModalProps {
  isOpen: boolean;
  status: ConnectionStatus;
  statusMessage?: string;
  roomCode: string;
  onCreateRoom: () => void;
  onJoinRoom: (code: string) => void;
  onClose: () => void;
}

export const OnlineModal: React.FC<OnlineModalProps> = ({
  isOpen,
  status,
  statusMessage,
  roomCode,
  onCreateRoom,
  onJoinRoom,
  onClose
}) => {
  const [tab, setTab] = useState<'create' | 'join'>('create');
  const [inputCode, setInputCode] = useState('');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const getShareUrl = () => {
    if (typeof window === 'undefined') return '';
    const base = window.location.origin + window.location.pathname;
    return `${base}?room=${roomCode}`;
  };

  const handleCopyUrl = async () => {
    const url = getShareUrl();
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      // フォールバック
      alert(`URLをコピーしてください:\n${url}`);
    }
  };

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputCode.trim()) {
      onJoinRoom(inputCode.trim());
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-700/80 rounded-2xl p-6 shadow-2xl flex flex-col gap-4">
        {/* ヘッダー */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2 text-white font-extrabold text-lg">
            <Globe className="text-amber-400" size={22} />
            <span>オンラインP2P対戦</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* タブ切り替え */}
        <div className="grid grid-cols-2 p-1 bg-slate-950/80 rounded-xl border border-slate-800">
          <button
            type="button"
            onClick={() => setTab('create')}
            className={`py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              tab === 'create'
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            部屋を作る (ホスト)
          </button>
          <button
            type="button"
            onClick={() => setTab('join')}
            className={`py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              tab === 'join'
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            部屋に入る (参加)
          </button>
        </div>

        {/* タブ1: 部屋を作る */}
        {tab === 'create' && (
          <div className="flex flex-col gap-4">
            {!roomCode ? (
              <div className="flex flex-col items-center py-4 gap-3 text-center">
                <p className="text-xs text-slate-300">
                  部屋を作成して発行されたURLを対戦相手に送るだけで、ブラウザ同士が直結して対戦できます。
                </p>
                <button
                  type="button"
                  onClick={onCreateRoom}
                  className="w-full py-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-extrabold text-sm rounded-xl shadow-lg active:scale-98 transition-all cursor-pointer"
                >
                  新しい部屋を作成する
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-3 py-2">
                <div className="p-3.5 bg-slate-950/90 rounded-xl border border-slate-800 flex flex-col items-center gap-1.5">
                  <span className="text-[11px] text-slate-400">部屋コード</span>
                  <span className="text-2xl font-extrabold text-amber-400 font-mono tracking-wider">
                    {roomCode}
                  </span>
                </div>

                {/* URL招待リンクコピー */}
                <div className="flex flex-col gap-1.5">
                  <span className="text-[11px] font-bold text-slate-300">対戦相手への招待リンク:</span>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={getShareUrl()}
                      className="flex-1 bg-slate-950 border border-slate-700 text-slate-300 text-xs px-3 py-2.5 rounded-xl font-mono truncate select-all"
                    />
                    <button
                      type="button"
                      onClick={handleCopyUrl}
                      className="px-3.5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all shadow-md active:scale-95 cursor-pointer whitespace-nowrap"
                    >
                      {copied ? <Check size={16} /> : <Copy size={16} />}
                      <span>{copied ? 'コピー済' : 'コピー'}</span>
                    </button>
                  </div>
                </div>

                {/* 待機ステータス */}
                <div className="mt-2 p-3 bg-slate-800/60 rounded-xl border border-slate-700/60 flex items-center justify-center gap-2 text-xs text-amber-300">
                  <Loader2 size={16} className="animate-spin text-amber-400" />
                  <span>対戦相手の入室を待っています...</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* タブ2: 部屋に入る */}
        {tab === 'join' && (
          <form onSubmit={handleJoin} className="flex flex-col gap-4 py-2">
            <div className="flex flex-col gap-2">
              <label htmlFor="room-code-input" className="text-xs font-bold text-slate-300">
                教えてもらった部屋コードを入力:
              </label>
              <input
                id="room-code-input"
                type="text"
                placeholder="例: ABC123"
                value={inputCode}
                onChange={(e) => setInputCode(e.target.value.toUpperCase())}
                className="bg-slate-950 border border-slate-700 text-white text-base tracking-widest font-mono font-bold px-4 py-3 rounded-xl focus:outline-none focus:border-amber-400 text-center uppercase"
                maxLength={12}
                autoFocus
              />
            </div>

            <button
              type="submit"
              disabled={!inputCode.trim() || status === 'connecting'}
              className="w-full py-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 disabled:opacity-50 disabled:pointer-events-none text-slate-950 font-extrabold text-sm rounded-xl shadow-lg active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              {status === 'connecting' ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  <span>接続中...</span>
                </>
              ) : (
                <>
                  <span>部屋に入室する</span>
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>
        )}

        {/* 状態メッセージ */}
        {statusMessage && (
          <div className="text-center text-[11px] text-slate-400 pt-1 border-t border-slate-800/80">
            {statusMessage}
          </div>
        )}
      </div>
    </div>
  );
};
