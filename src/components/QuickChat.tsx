import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage, GameMode, Player } from '../types/othello';
import { MessageCircle, Send, ChevronDown, ChevronUp, Sparkles } from 'lucide-react';

interface QuickChatProps {
  messages: ChatMessage[];
  onSendMessage: (text: string, isStamp?: boolean) => void;
  mode: GameMode;
  myColor: Player;
}

const QUICK_PHRASES = [
  { label: '🙇 よろしく！', text: 'よろしくお願いします！🙇✨' },
  { label: '👏 ナイス手！', text: 'ナイス手です！👏🔥' },
  { label: '😱 ピンチ…', text: 'うわぁぁピンチ…！😱💦' },
  { label: '🎲 天変地異！', text: '天変地異ルーレットきたー！！🎲⚡' },
  { label: '🤔 考え中…', text: 'ちょっと長考すみません…🤔💭' },
  { label: '🔥 逆転するぞ', text: 'ここから大逆転いきます！！🔥🚀' },
  { label: '👑 王様死守！', text: '王様（👑5点）は絶対渡さないぞ！🛡️' },
  { label: '🎉 ありがとう', text: '対戦ありがとうございました！🎉😊' }
];

export const QuickChat: React.FC<QuickChatProps> = ({
  messages,
  onSendMessage,
  mode,
  myColor
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [inputText, setInputText] = useState('');
  const [latestToast, setLatestToast] = useState<ChatMessage | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const lastMsgCountRef = useRef(messages.length);

  // 新着メッセージが来たら吹き出しトーストを表示＆スクロール
  useEffect(() => {
    if (messages.length > lastMsgCountRef.current) {
      const newest = messages[messages.length - 1];
      setLatestToast(newest);
      const timer = setTimeout(() => {
        setLatestToast(null);
      }, 4000);
      lastMsgCountRef.current = messages.length;
      return () => clearTimeout(timer);
    }
    lastMsgCountRef.current = messages.length;
  }, [messages]);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = inputText.trim();
    if (!trimmed) return;
    onSendMessage(trimmed, false);
    setInputText('');
  };

  return (
    <div className="w-full max-w-[440px] my-1 relative">
      {/* 🎈 新着メッセージの吹き出しポップアップ（閉じていても画面上にフワッと表示！） */}
      {latestToast && !isOpen && (
        <div
          onClick={() => setIsOpen(true)}
          className="mb-1.5 px-3 py-1.5 rounded-2xl bg-gradient-to-r from-indigo-900/95 via-slate-900/95 to-indigo-900/95 border border-indigo-400/70 text-white text-xs font-bold shadow-[0_0_15px_rgba(99,102,241,0.5)] flex items-center justify-between gap-2 animate-bounce cursor-pointer"
        >
          <div className="flex items-center gap-1.5 truncate">
            <span className="px-1.5 py-0.5 rounded bg-indigo-500/30 text-indigo-200 text-[10px] font-black">
              💬 {latestToast.senderName}
            </span>
            <span className="truncate text-amber-200">{latestToast.text}</span>
          </div>
          <span className="text-[9px] text-indigo-300 whitespace-nowrap">{latestToast.time}</span>
        </div>
      )}

      {/* チャットヘッダー＆ワンタップ定型文バー */}
      <div className="bg-slate-900/95 border border-slate-700/80 rounded-xl overflow-hidden shadow-lg">
        <div className="flex items-center justify-between px-2.5 py-1.5 bg-slate-900 border-b border-slate-800">
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="flex items-center gap-1.5 text-xs font-black text-emerald-300 hover:text-emerald-200 cursor-pointer"
          >
            <MessageCircle size={14} className="text-emerald-400" />
            <span>💬 かんたんチャット＆スタンプ</span>
            <span className="px-1.5 py-0.2 bg-emerald-950 text-emerald-300 border border-emerald-700/60 rounded-full text-[9px]">
              {messages.length}件
            </span>
          </button>

          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="flex items-center gap-1 text-[10px] font-bold text-slate-300 hover:text-white bg-slate-800 px-2 py-0.5 rounded-md cursor-pointer"
          >
            <span>{isOpen ? '閉じる' : '履歴・入力を開く'}</span>
            {isOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>
        </div>

        {/* 常時すぐ押せる！ワンタップ定型スタンプ横スクロールバー */}
        <div className="flex items-center gap-1 px-2 py-1.5 overflow-x-auto bg-slate-950/60">
          <span className="text-[9px] text-slate-400 font-bold whitespace-nowrap flex items-center gap-0.5">
            <Sparkles size={10} className="text-amber-400" />
            1タップ送信:
          </span>
          {QUICK_PHRASES.map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={() => onSendMessage(item.text, true)}
              className="px-2 py-0.5 rounded-full bg-slate-800 hover:bg-indigo-600 text-slate-200 hover:text-white border border-slate-700 hover:border-indigo-400 text-[10px] font-bold whitespace-nowrap transition-all active:scale-95 cursor-pointer"
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* 開いているとき：チャット履歴 ＆ 自由テキスト入力 */}
        {isOpen && (
          <div className="p-2 bg-slate-950/90 border-t border-slate-800 flex flex-col gap-2 animate-fade-in">
            <div className="max-h-36 overflow-y-auto space-y-1.5 px-1 py-1 bg-slate-900/60 rounded-lg border border-slate-800/80">
              {messages.length === 0 ? (
                <div className="text-center text-[11px] text-slate-500 py-3">
                  上のスタンプボタンを押すか、メッセージを入力して話しかけてみましょう！
                  {mode === 'cpu' && '（CPUも返事してくれます🤖）'}
                </div>
              ) : (
                messages.map((m) => {
                  const isMe = m.sender === myColor;
                  const isSystem = m.sender === 'system';

                  if (isSystem) {
                    return (
                      <div key={m.id} className="text-center">
                        <span className="inline-block px-2 py-0.5 rounded-full bg-amber-950/60 border border-amber-700/40 text-amber-300 text-[10px] font-bold">
                          📢 {m.text}
                        </span>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={m.id}
                      className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                    >
                      <div className="flex items-center gap-1 text-[9px] text-slate-400 px-1">
                        <span className="font-bold">{m.senderName}</span>
                        <span>{m.time}</span>
                      </div>
                      <div
                        className={`max-w-[85%] px-2.5 py-1 rounded-2xl text-xs font-bold shadow-sm ${
                          isMe
                            ? 'bg-emerald-600 text-white rounded-br-xs'
                            : 'bg-slate-800 text-slate-100 border border-slate-700 rounded-bl-xs'
                        }`}
                      >
                        {m.text}
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* 自由入力フォーム */}
            <form onSubmit={handleSubmit} className="flex items-center gap-1.5">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="メッセージを入力して送信..."
                maxLength={80}
                className="flex-1 bg-slate-900 border border-slate-700 focus:border-emerald-500 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-500 outline-none"
              />
              <button
                type="submit"
                disabled={!inputText.trim()}
                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-xs font-black flex items-center gap-1 transition-all cursor-pointer"
              >
                <Send size={12} />
                <span>送信</span>
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
