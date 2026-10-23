import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  AiLevel,
  BombsRemaining,
  CellValue,
  GameMode,
  Move,
  Player,
  Position,
  RuleType,
  Score,
  UnlockedZones
} from './types/othello';
import {
  applyMove,
  countScore,
  createInitialBoard,
  createInitialUnlockedZones,
  getOpponent,
  getValidMoves,
  getWinner,
  isGameOver as checkIsGameOver
} from './utils/othelloLogic';
import { calculateAiMove } from './utils/othelloAi';
import { soundManager } from './utils/sound';
import { ConnectionStatus, p2pManager } from './utils/p2p';
import { Board } from './components/Board';
import { GameHeader } from './components/GameHeader';
import { GameControls } from './components/GameControls';
import { ModeSelector } from './components/ModeSelector';
import { OnlineModal } from './components/OnlineModal';
import { GameOverModal } from './components/GameOverModal';
import { Bot, User, Globe } from 'lucide-react';

interface HistoryItem {
  board: CellValue[][];
  unlocked: UnlockedZones;
  bombsRemaining: BombsRemaining;
  turn: Player;
  lastMove: Position | null;
  isLastMoveBomb: boolean;
}

export const App: React.FC = () => {
  // ルール（デフォルトは盤面拡張）
  const [rule, setRule] = useState<RuleType>('fortress');
  const [unlocked, setUnlocked] = useState<UnlockedZones>(createInitialUnlockedZones('fortress'));
  const [board, setBoard] = useState<CellValue[][]>(createInitialBoard('fortress'));
  const [turn, setTurn] = useState<Player>('black');
  const [mode, setMode] = useState<GameMode>('cpu');
  const [aiLevel, setAiLevel] = useState<AiLevel>('medium');
  const [lastMove, setLastMove] = useState<Position | null>(null);
  const [isLastMoveBomb, setIsLastMoveBomb] = useState(false);
  const [flippingPositions, setFlippingPositions] = useState<Set<string>>(new Set());
  const [newlyUnlockedZone, setNewlyUnlockedZone] = useState<keyof UnlockedZones | null>(null);
  const [zoneAlertMessage, setZoneAlertMessage] = useState<string | null>(null);

  // 💣 爆弾石関連ステート
  const [bombsRemaining, setBombsRemaining] = useState<BombsRemaining>({ black: 1, white: 1 });
  const [isBombActive, setIsBombActive] = useState(false);
  const [isBombShaking, setIsBombShaking] = useState(false);

  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [passMessage, setPassMessage] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(soundManager.getMuted());

  // モーダル
  const [isModeModalOpen, setIsModeModalOpen] = useState(false);
  const [isOnlineModalOpen, setIsOnlineModalOpen] = useState(false);
  const [isGameOverModalOpen, setIsGameOverModalOpen] = useState(false);

  // オンライン対戦
  const [onlineStatus, setOnlineStatus] = useState<ConnectionStatus>('disconnected');
  const [onlineStatusMsg, setOnlineStatusMsg] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [myOnlineColor, setMyOnlineColor] = useState<Player>('black');

  // スコアと有効手
  const score: Score = countScore(board, rule, unlocked);
  const validMoves: Move[] = getValidMoves(board, turn, rule, unlocked);
  const isFinished = checkIsGameOver(board, rule, unlocked);
  const winner = isFinished ? getWinner(board, rule, unlocked) : 'draw';

  const passTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const zoneTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const shakeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ゲームリセット
  const handleResetGame = useCallback((targetRule?: RuleType) => {
    const r = targetRule || rule;
    setBoard(createInitialBoard(r));
    setUnlocked(createInitialUnlockedZones(r));
    setBombsRemaining({ black: 1, white: 1 });
    setIsBombActive(false);
    setIsBombShaking(false);
    setTurn('black');
    setLastMove(null);
    setIsLastMoveBomb(false);
    setFlippingPositions(new Set());
    setNewlyUnlockedZone(null);
    setZoneAlertMessage(null);
    setHistory([]);
    setIsAiThinking(false);
    setPassMessage(null);
    setIsGameOverModalOpen(false);
  }, [rule]);

  // オンラインP2Pの初期化
  useEffect(() => {
    p2pManager.init({
      onStatusChange: (status, msg) => {
        setOnlineStatus(status);
        if (msg) setOnlineStatusMsg(msg);
        if (status === 'connected') {
          setIsOnlineModalOpen(false);
          handleResetGame();
        }
      },
      onMessage: (msg) => {
        if (msg.type === 'ready') {
          setMyOnlineColor(msg.color);
          if (msg.rule) {
            setRule(msg.rule);
            handleResetGame(msg.rule);
          }
        } else if (msg.type === 'move') {
          executeMove(msg.move.row, msg.move.col, msg.move.player, !!msg.move.isBomb, false);
        } else if (msg.type === 'restart') {
          handleResetGame();
        } else if (msg.type === 'resign') {
          alert('対戦相手が投了しました。');
          setIsGameOverModalOpen(true);
        }
      },
      onOpponentConnected: () => {
        setMyOnlineColor(p2pManager.isHost ? 'black' : 'white');
        if (p2pManager.isHost) {
          p2pManager.sendMessage({ type: 'ready', color: 'white', rule });
        }
      },
      onOpponentDisconnected: () => {
        alert('対戦相手との接続が切断されました。');
      }
    });

    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const code = params.get('room');
      if (code) {
        setMode('online');
        setIsOnlineModalOpen(true);
        p2pManager.joinRoom(code).catch(console.error);
      }
    }

    return () => {
      p2pManager.cleanup();
    };
  }, [handleResetGame, rule]);

  // 石を打つ処理
  const executeMove = useCallback(
    (row: number, col: number, player: Player, useBomb: boolean = false, sendToPeer: boolean = true) => {
      const { nextBoard, flipped, exploded, nextUnlocked, newZoneUnlocked } = applyMove(
        board,
        row,
        col,
        player,
        rule,
        unlocked,
        useBomb
      );

      // 💣 爆弾石の場合のサウンド & 画面シェイク
      if (useBomb) {
        soundManager.playExplosion();
        setIsBombShaking(true);
        if (shakeTimerRef.current) clearTimeout(shakeTimerRef.current);
        shakeTimerRef.current = setTimeout(() => setIsBombShaking(false), 500);

        setBombsRemaining((prev) => ({
          ...prev,
          [player]: Math.max(0, prev[player] - 1)
        }));
        setIsBombActive(false);
      } else {
        soundManager.playPlaceDisc();
        soundManager.playFlipDiscs(flipped.length);
      }

      // 🏰 四隅エリア出現時
      if (newZoneUnlocked) {
        soundManager.playZoneUnlock();
        setNewlyUnlockedZone(newZoneUnlocked);
        const zoneNames = {
          topLeft: '左上',
          topRight: '右上',
          bottomLeft: '左下',
          bottomRight: '右下'
        };
        setZoneAlertMessage(`⚠️ 警報！${zoneNames[newZoneUnlocked]}の7マス新エリアが解放されました！`);
        if (zoneTimerRef.current) clearTimeout(zoneTimerRef.current);
        zoneTimerRef.current = setTimeout(() => {
          setZoneAlertMessage(null);
          setNewlyUnlockedZone(null);
        }, 4000);
      }

      // 反転アニメーション用座標
      const flipSet = new Set<string>();
      flipped.forEach((p) => flipSet.add(`${p.row},${p.col}`));
      setFlippingPositions(flipSet);
      setTimeout(() => setFlippingPositions(new Set()), 400);

      // 履歴保存
      setHistory((prev) => [
        ...prev,
        { board, unlocked, bombsRemaining, turn: player, lastMove, isLastMoveBomb: useBomb }
      ]);

      setBoard(nextBoard);
      setUnlocked(nextUnlocked);
      setLastMove({ row, col });
      setIsLastMoveBomb(useBomb);

      // オンライン対戦時は相手に着手情報を送信
      if (mode === 'online' && sendToPeer) {
        p2pManager.sendMessage({
          type: 'move',
          move: { row, col, player, isBomb: useBomb }
        });
      }

      // 次の手番を決定
      const nextPlayer = getOpponent(player);
      const nextMoves = getValidMoves(nextBoard, nextPlayer, rule, nextUnlocked);

      if (nextMoves.length > 0) {
        setTurn(nextPlayer);
        setPassMessage(null);
      } else {
        const myNextMoves = getValidMoves(nextBoard, player, rule, nextUnlocked);
        if (myNextMoves.length > 0) {
          soundManager.playPass();
          const passPlayerName =
            mode === 'cpu'
              ? nextPlayer === 'white'
                ? 'CPU'
                : 'あなた'
              : nextPlayer === 'black'
              ? '黒'
              : '白';

          setPassMessage(`${passPlayerName} は打てるマスがないためパスしました`);
          if (passTimerRef.current) clearTimeout(passTimerRef.current);
          passTimerRef.current = setTimeout(() => setPassMessage(null), 3000);

          setTurn(player);
        } else {
          setPassMessage(null);
        }
      }
    },
    [board, lastMove, mode, rule, unlocked, bombsRemaining]
  );

  // マスクリック時のハンドラ
  const handleCellClick = (row: number, col: number) => {
    if (isAiThinking || isFinished) return;
    if (mode === 'online' && turn !== myOnlineColor) return;
    if (mode === 'cpu' && turn !== 'black') return;

    const move = validMoves.find((m) => m.row === row && m.col === col);
    if (!move) return;

    const willUseBomb = isBombActive && bombsRemaining[turn] > 0;
    executeMove(row, col, turn, willUseBomb, true);
  };

  // CPU自動着手
  useEffect(() => {
    if (mode === 'cpu' && turn === 'white' && !isFinished) {
      setIsAiThinking(true);
      const delay = Math.random() * 300 + 500;
      const timer = setTimeout(() => {
        const aiMove = calculateAiMove(board, 'white', aiLevel, rule, unlocked, bombsRemaining.white);
        if (aiMove) {
          executeMove(aiMove.row, aiMove.col, 'white', !!aiMove.isBomb, false);
        }
        setIsAiThinking(false);
      }, delay);

      return () => clearTimeout(timer);
    }
  }, [board, turn, mode, aiLevel, isFinished, rule, unlocked, bombsRemaining.white, executeMove]);

  // 終局検知
  useEffect(() => {
    if (isFinished) {
      soundManager.playVictory();
      const timer = setTimeout(() => {
        setIsGameOverModalOpen(true);
      }, 700);
      return () => clearTimeout(timer);
    }
  }, [isFinished]);

  // 待った
  const handleUndo = () => {
    if (history.length === 0 || isAiThinking) return;

    if (mode === 'cpu') {
      if (history.length >= 2) {
        const target = history[history.length - 2];
        setBoard(target.board);
        setUnlocked(target.unlocked);
        setBombsRemaining(target.bombsRemaining);
        setTurn('black');
        setLastMove(target.lastMove);
        setIsLastMoveBomb(target.isLastMoveBomb);
        setHistory((prev) => prev.slice(0, prev.length - 2));
      } else if (history.length === 1) {
        handleResetGame();
      }
    } else {
      const last = history[history.length - 1];
      setBoard(last.board);
      setUnlocked(last.unlocked);
      setBombsRemaining(last.bombsRemaining);
      setTurn(last.turn);
      setLastMove(last.lastMove);
      setIsLastMoveBomb(last.isLastMoveBomb);
      setHistory((prev) => prev.slice(0, prev.length - 1));
    }
    setIsBombActive(false);
    setPassMessage(null);
    setZoneAlertMessage(null);
  };

  // 投了
  const handleResign = () => {
    if (window.confirm('降参（投了）しますか？')) {
      if (mode === 'online') {
        p2pManager.sendMessage({ type: 'resign', player: myOnlineColor });
      }
      setIsGameOverModalOpen(true);
    }
  };

  // サウンドトグル
  const handleToggleSound = () => {
    const muted = soundManager.toggleMute();
    setIsMuted(muted);
  };

  // 爆弾石トグル
  const handleToggleBomb = () => {
    if (bombsRemaining[turn] > 0) {
      setIsBombActive(!isBombActive);
    }
  };

  // 🌟 メイン画面上のクイック・ルール切り替え（通常・盤面拡張・爆弾石・全部盛り）
  const handleQuickChangeRule = (newRule: RuleType) => {
    if (newRule === rule) return;
    setRule(newRule);
    handleResetGame(newRule);
  };

  // 🌟 メイン画面上のクイック・対戦相手切り替え
  const handleQuickChangeMode = (newMode: GameMode) => {
    if (newMode === 'online') {
      setIsOnlineModalOpen(true);
      return;
    }
    setMode(newMode);
    p2pManager.cleanup();
    handleResetGame(rule);
  };

  // 🌟 メイン画面上のクイック・AI難易度切り替え
  const handleQuickChangeAiLevel = (newLevel: AiLevel) => {
    setAiLevel(newLevel);
    if (mode !== 'cpu') {
      setMode('cpu');
      handleResetGame(rule);
    }
  };

  // モード選択モーダルからの確定
  const handleSelectCpu = (level: AiLevel, selectedRule: RuleType) => {
    setMode('cpu');
    setAiLevel(level);
    setRule(selectedRule);
    setIsModeModalOpen(false);
    p2pManager.cleanup();
    handleResetGame(selectedRule);
  };

  const handleSelectLocal = (selectedRule: RuleType) => {
    setMode('local');
    setRule(selectedRule);
    setIsModeModalOpen(false);
    p2pManager.cleanup();
    handleResetGame(selectedRule);
  };

  const handleSelectOnline = (selectedRule: RuleType) => {
    setMode('online');
    setRule(selectedRule);
    setIsModeModalOpen(false);
    setIsOnlineModalOpen(true);
  };

  const handleCreateOnlineRoom = async () => {
    try {
      const code = await p2pManager.createRoom();
      setRoomCode(code);
      setMyOnlineColor('black');
    } catch (e) {
      alert('部屋の作成に失敗しました。時間をおいて再試行してください。');
    }
  };

  const handleJoinOnlineRoom = async (code: string) => {
    try {
      await p2pManager.joinRoom(code);
      setRoomCode(code);
      setMyOnlineColor('white');
    } catch (e) {
      alert('部屋への接続に失敗しました。コードをご確認ください。');
    }
  };

  const currentTurnBombs = bombsRemaining[turn] || 0;

  return (
    <div className="min-h-[100dvh] bg-slate-950 text-slate-100 flex flex-col items-center justify-between p-2 sm:p-4 max-w-[500px] mx-auto w-full selection:bg-emerald-500 selection:text-white">
      {/* 上部ヘッダー（タイトル ＆ 対戦相手切替） */}
      <header className="w-full flex items-center justify-between py-1 px-0.5">
        <div className="flex items-center gap-1.5">
          <div className="w-6 h-6 rounded-md bg-emerald-700 flex items-center justify-center shadow-md border border-emerald-500/40">
            <span className="w-3 h-3 rounded-full bg-slate-900 border border-white/20 inline-block shadow-sm" />
          </div>
          <h1 className="text-sm font-black tracking-tight text-white flex items-center gap-1">
            <span>対戦オセロ</span>
          </h1>
        </div>

        {/* 対戦モードクイック切替（CPU / 2人対面 / オンライン） */}
        <div className="flex items-center gap-1 p-0.5 bg-slate-900 border border-slate-800 rounded-lg">
          <button
            type="button"
            onClick={() => handleQuickChangeMode('cpu')}
            className={`px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer ${
              mode === 'cpu'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Bot size={11} />
            <span>CPU</span>
          </button>
          <button
            type="button"
            onClick={() => handleQuickChangeMode('local')}
            className={`px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer ${
              mode === 'local'
                ? 'bg-sky-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <User size={11} />
            <span>2人</span>
          </button>
          <button
            type="button"
            onClick={() => handleQuickChangeMode('online')}
            className={`px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer ${
              mode === 'online'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Globe size={11} />
            <span>オンライン</span>
          </button>
        </div>
      </header>

      {/* 🌟 【誰でも見える！】4大ルール・常時クイック切替タブバー */}
      <div className="w-full flex flex-col gap-1 my-1">
        <div className="grid grid-cols-4 gap-1 p-1 bg-slate-900/90 rounded-xl border border-slate-800 shadow-md">
          {/* 1. 通常 8x8 */}
          <button
            type="button"
            onClick={() => handleQuickChangeRule('classic')}
            className={`py-1.5 px-1 rounded-lg text-center transition-all cursor-pointer flex flex-col items-center justify-center ${
              rule === 'classic'
                ? 'bg-emerald-600 text-white font-black shadow-md ring-1 ring-emerald-400'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <span className="text-[11px] sm:text-xs">通常</span>
            <span className="text-[8px] sm:text-[9px] opacity-80">8×8</span>
          </button>

          {/* 2. 🏰 盤面拡張 (四隅7マス) */}
          <button
            type="button"
            onClick={() => handleQuickChangeRule('fortress')}
            className={`py-1.5 px-1 rounded-lg text-center transition-all cursor-pointer flex flex-col items-center justify-center ${
              rule === 'fortress'
                ? 'bg-amber-600 text-white font-black shadow-[0_0_10px_rgba(245,158,11,0.4)] ring-1 ring-amber-300'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <span className="text-[11px] sm:text-xs">🏰 盤面拡張</span>
            <span className="text-[8px] sm:text-[9px] opacity-80">四隅7マス</span>
          </button>

          {/* 3. 💣 爆弾石 */}
          <button
            type="button"
            onClick={() => handleQuickChangeRule('bomb')}
            className={`py-1.5 px-1 rounded-lg text-center transition-all cursor-pointer flex flex-col items-center justify-center ${
              rule === 'bomb'
                ? 'bg-red-600 text-white font-black shadow-[0_0_10px_rgba(239,68,68,0.4)] ring-1 ring-red-300'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <span className="text-[11px] sm:text-xs">💣 爆弾石</span>
            <span className="text-[8px] sm:text-[9px] opacity-80">3×3大爆破</span>
          </button>

          {/* 4. 🔥 全部盛り */}
          <button
            type="button"
            onClick={() => handleQuickChangeRule('chaos')}
            className={`py-1.5 px-1 rounded-lg text-center transition-all cursor-pointer flex flex-col items-center justify-center ${
              rule === 'chaos'
                ? 'bg-purple-600 text-white font-black shadow-[0_0_10px_rgba(168,85,247,0.4)] ring-1 ring-purple-300'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <span className="text-[11px] sm:text-xs">🔥 全部盛り</span>
            <span className="text-[8px] sm:text-[9px] opacity-80">拡張＋爆弾</span>
          </button>
        </div>

        {/* CPU対戦時：初級・中級・上級クイック切替 */}
        {mode === 'cpu' && (
          <div className="flex items-center justify-between px-1 py-0.5 text-[10px] text-slate-400 font-bold">
            <span>CPU難易度:</span>
            <div className="flex gap-1">
              {(['easy', 'medium', 'hard'] as AiLevel[]).map((lvl) => {
                const label = lvl === 'easy' ? '初級' : lvl === 'medium' ? '中級' : '上級';
                const isSelected = aiLevel === lvl;
                return (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => handleQuickChangeAiLevel(lvl)}
                    className={`px-2 py-0.5 rounded text-[10px] font-extrabold cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-slate-200 text-slate-950 shadow-sm'
                        : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* メインゲーム領域 */}
      <main className="w-full flex-1 flex flex-col items-center justify-center py-0.5">
        <GameHeader
          score={score}
          turn={turn}
          mode={mode}
          rule={rule}
          unlocked={unlocked}
          bombsRemaining={bombsRemaining}
          aiLevel={aiLevel}
          myColor={myOnlineColor}
          isAiThinking={isAiThinking}
          passMessage={passMessage}
          zoneAlertMessage={zoneAlertMessage}
        />

        <Board
          board={board}
          rule={rule}
          unlocked={unlocked}
          validMoves={validMoves}
          lastMove={lastMove}
          isLastMoveBomb={isLastMoveBomb}
          isBombShaking={isBombShaking}
          flippingPositions={flippingPositions}
          newlyUnlockedZone={newlyUnlockedZone}
          turn={turn}
          onCellClick={handleCellClick}
          disabled={
            isAiThinking ||
            isFinished ||
            (mode === 'online' && turn !== myOnlineColor) ||
            (mode === 'cpu' && turn !== 'black')
          }
        />

        <GameControls
          mode={mode}
          rule={rule}
          bombsAvailable={currentTurnBombs}
          isBombActive={isBombActive}
          canUndo={history.length > 0}
          isMuted={isMuted}
          onToggleBomb={handleToggleBomb}
          onUndo={handleUndo}
          onReset={() => handleResetGame()}
          onResign={handleResign}
          onToggleSound={handleToggleSound}
          onOpenModeSelector={() => setIsModeModalOpen(true)}
          disabled={isAiThinking}
        />
      </main>

      {/* フッター */}
      <footer className="w-full text-center text-[9px] text-slate-500 py-0.5">
        対戦オセロ (Reversi) © 2026 • マサ専用エディション
      </footer>

      {/* モーダル群 */}
      <ModeSelector
        isOpen={isModeModalOpen}
        currentMode={mode}
        currentRule={rule}
        currentAiLevel={aiLevel}
        onSelectCpu={handleSelectCpu}
        onSelectLocal={handleSelectLocal}
        onSelectOnline={handleSelectOnline}
        onClose={() => setIsModeModalOpen(false)}
      />

      <OnlineModal
        isOpen={isOnlineModalOpen}
        status={onlineStatus}
        statusMessage={onlineStatusMsg}
        roomCode={roomCode}
        onCreateRoom={handleCreateOnlineRoom}
        onJoinRoom={handleJoinOnlineRoom}
        onClose={() => setIsOnlineModalOpen(false)}
      />

      <GameOverModal
        isOpen={isGameOverModalOpen}
        winner={winner}
        score={score}
        mode={mode}
        myColor={myOnlineColor}
        onRestart={() => handleResetGame()}
        onClose={() => setIsGameOverModalOpen(false)}
      />
    </div>
  );
};
