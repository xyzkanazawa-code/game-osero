import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  AiLevel,
  BoardState,
  GameMode,
  Move,
  Player,
  Position,
  Score
} from './types/othello';
import {
  applyMove,
  countScore,
  createInitialBoard,
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

interface HistoryItem {
  board: BoardState;
  turn: Player;
  lastMove: Position | null;
}

export const App: React.FC = () => {
  const [board, setBoard] = useState<BoardState>(createInitialBoard());
  const [turn, setTurn] = useState<Player>('black');
  const [mode, setMode] = useState<GameMode>('cpu');
  const [aiLevel, setAiLevel] = useState<AiLevel>('medium');
  const [lastMove, setLastMove] = useState<Position | null>(null);
  const [flippingPositions, setFlippingPositions] = useState<Set<string>>(new Set());
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
  const score: Score = countScore(board);
  const validMoves: Move[] = getValidMoves(board, turn);
  const isFinished = checkIsGameOver(board);
  const winner = isFinished ? getWinner(board) : 'draw';

  // タイムアウトref
  const passTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ゲームリセット
  const handleResetGame = useCallback(() => {
    setBoard(createInitialBoard());
    setTurn('black');
    setLastMove(null);
    setFlippingPositions(new Set());
    setHistory([]);
    setIsAiThinking(false);
    setPassMessage(null);
    setIsGameOverModalOpen(false);
  }, []);

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
        } else if (msg.type === 'move') {
          // 相手の手を実行
          executeMove(msg.move.row, msg.move.col, msg.move.player, false);
        } else if (msg.type === 'restart') {
          handleResetGame();
        } else if (msg.type === 'resign') {
          alert('対戦相手が投了しました。');
          setIsGameOverModalOpen(true);
        }
      },
      onOpponentConnected: () => {
        setMyOnlineColor(p2pManager.isHost ? 'black' : 'white');
      },
      onOpponentDisconnected: () => {
        alert('対戦相手との接続が切断されました。');
      }
    });

    // URLクエリパラメータに ?room=XXXX があるかチェック（招待URLから開かれた場合）
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
  }, [handleResetGame]);

  // 石を打つ処理
  const executeMove = useCallback(
    (row: number, col: number, player: Player, sendToPeer: boolean = true) => {
      const { nextBoard, flipped } = applyMove(board, row, col, player);

      // 打石音と反転音
      soundManager.playPlaceDisc();
      soundManager.playFlipDiscs(flipped.length);

      // 反転アニメーション用座標をセット
      const flipSet = new Set<string>();
      flipped.forEach((p) => flipSet.add(`${p.row},${p.col}`));
      setFlippingPositions(flipSet);
      setTimeout(() => setFlippingPositions(new Set()), 400);

      // 履歴保存（アンドゥ用）
      setHistory((prev) => [...prev, { board, turn: player, lastMove }]);

      setBoard(nextBoard);
      setLastMove({ row, col });

      // オンライン対戦時は相手に着手情報を送信
      if (mode === 'online' && sendToPeer) {
        p2pManager.sendMessage({
          type: 'move',
          move: { row, col, player }
        });
      }

      // 次の手番を決定
      const nextPlayer = getOpponent(player);
      const nextMoves = getValidMoves(nextBoard, nextPlayer);

      if (nextMoves.length > 0) {
        // 次のプレイヤーに合法手がある場合、通常の手番交代
        setTurn(nextPlayer);
        setPassMessage(null);
      } else {
        // 次のプレイヤーに合法手がない（パス発生）
        const myNextMoves = getValidMoves(nextBoard, player);
        if (myNextMoves.length > 0) {
          // パス発生！手番は元のプレイヤーに戻る
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

          setTurn(player); // 手番維持
        } else {
          // 双方ともに合法手がない → 終局（Game Over）
          setPassMessage(null);
        }
      }
    },
    [board, lastMove, mode]
  );

  // マスクリック時のハンドラ
  const handleCellClick = (row: number, col: number) => {
    if (isAiThinking || isFinished) return;

    // オンライン対戦時、自分の手番でなければ打てない
    if (mode === 'online' && turn !== myOnlineColor) return;

    // CPU対戦時、CPUの番（白）は打てない
    if (mode === 'cpu' && turn !== 'black') return;

    // 合法手かチェック
    const move = validMoves.find((m) => m.row === row && m.col === col);
    if (!move) return;

    executeMove(row, col, turn, true);
  };

  // CPU自動着手
  useEffect(() => {
    if (mode === 'cpu' && turn === 'white' && !isFinished) {
      setIsAiThinking(true);
      // 人間味のある思考ディレイ（0.5〜0.8秒）
      const delay = Math.random() * 300 + 500;
      const timer = setTimeout(() => {
        const aiMove = calculateAiMove(board, 'white', aiLevel);
        if (aiMove) {
          executeMove(aiMove.row, aiMove.col, 'white', false);
        }
        setIsAiThinking(false);
      }, delay);

      return () => clearTimeout(timer);
    }
  }, [board, turn, mode, aiLevel, isFinished, executeMove]);

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

  // 待った（1手戻す）
  const handleUndo = () => {
    if (history.length === 0 || isAiThinking) return;

    if (mode === 'cpu') {
      // CPU対戦の場合は、自分の手番まで2手戻す
      if (history.length >= 2) {
        const target = history[history.length - 2];
        setBoard(target.board);
        setTurn('black');
        setLastMove(target.lastMove);
        setHistory((prev) => prev.slice(0, prev.length - 2));
      } else if (history.length === 1) {
        handleResetGame();
      }
    } else {
      // ローカル対戦の場合は1手戻す
      const last = history[history.length - 1];
      setBoard(last.board);
      setTurn(last.turn);
      setLastMove(last.lastMove);
      setHistory((prev) => prev.slice(0, prev.length - 1));
    }
    setPassMessage(null);
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

  // モード選択
  const handleSelectCpu = (level: AiLevel) => {
    setMode('cpu');
    setAiLevel(level);
    setIsModeModalOpen(false);
    p2pManager.cleanup();
    handleResetGame();
  };

  const handleSelectLocal = () => {
    setMode('local');
    setIsModeModalOpen(false);
    p2pManager.cleanup();
    handleResetGame();
  };

  const handleSelectOnline = () => {
    setMode('online');
    setIsModeModalOpen(false);
    setIsOnlineModalOpen(true);
  };

  // オンライン部屋作成
  const handleCreateOnlineRoom = async () => {
    try {
      const code = await p2pManager.createRoom();
      setRoomCode(code);
      setMyOnlineColor('black');
    } catch (e) {
      alert('部屋の作成に失敗しました。時間をおいて再試行してください。');
    }
  };

  // オンライン部屋参加
  const handleJoinOnlineRoom = async (code: string) => {
    try {
      await p2pManager.joinRoom(code);
      setRoomCode(code);
      setMyOnlineColor('white');
    } catch (e) {
      alert('部屋への接続に失敗しました。コードをご確認ください。');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-between p-3 sm:p-5 selection:bg-emerald-500 selection:text-white">
      {/* 上部タイトル */}
      <header className="w-full max-w-[500px] flex items-center justify-between pt-1 pb-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-700 flex items-center justify-center shadow-md border border-emerald-500/40">
            <span className="w-4 h-4 rounded-full bg-slate-900 border border-white/20 inline-block shadow-sm" />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-black tracking-tight text-white flex items-center gap-1.5">
              <span>対戦オセロ</span>
              <span className="text-[10px] text-emerald-400 font-mono bg-emerald-950/80 border border-emerald-800/80 px-1.5 py-0.2 rounded font-bold">
                Online
              </span>
            </h1>
          </div>
        </div>

        <div className="text-[11px] text-slate-400 font-bold bg-slate-900 border border-slate-800 px-2.5 py-1 rounded-full">
          {mode === 'online' ? (
            <span className="text-amber-400">オンライン対戦中</span>
          ) : mode === 'cpu' ? (
            <span className="text-emerald-400">CPU対戦中</span>
          ) : (
            <span className="text-sky-400">2人対面対戦中</span>
          )}
        </div>
      </header>

      {/* メインゲーム領域 */}
      <main className="w-full max-w-[500px] flex-1 flex flex-col items-center justify-center">
        {/* 手番・スコアヘッダー */}
        <GameHeader
          score={score}
          turn={turn}
          mode={mode}
          aiLevel={aiLevel}
          myColor={myOnlineColor}
          isAiThinking={isAiThinking}
          passMessage={passMessage}
        />

        {/* 8x8 オセロ盤 */}
        <Board
          board={board}
          validMoves={validMoves}
          lastMove={lastMove}
          flippingPositions={flippingPositions}
          turn={turn}
          onCellClick={handleCellClick}
          disabled={
            isAiThinking ||
            isFinished ||
            (mode === 'online' && turn !== myOnlineColor) ||
            (mode === 'cpu' && turn !== 'black')
          }
        />

        {/* 下部コントロールツールバー */}
        <GameControls
          mode={mode}
          canUndo={history.length > 0}
          isMuted={isMuted}
          onUndo={handleUndo}
          onReset={handleResetGame}
          onResign={handleResign}
          onToggleSound={handleToggleSound}
          onOpenModeSelector={() => setIsModeModalOpen(true)}
          disabled={isAiThinking}
        />
      </main>

      {/* フッター */}
      <footer className="w-full max-w-[500px] text-center text-[10px] text-slate-500 pt-3 pb-1">
        対戦オセロ (Reversi) © 2026 • マサ専用エディション
      </footer>

      {/* モード選択モーダル */}
      <ModeSelector
        isOpen={isModeModalOpen}
        currentMode={mode}
        currentAiLevel={aiLevel}
        onSelectCpu={handleSelectCpu}
        onSelectLocal={handleSelectLocal}
        onSelectOnline={handleSelectOnline}
        onClose={() => setIsModeModalOpen(false)}
      />

      {/* オンライン対戦モーダル */}
      <OnlineModal
        isOpen={isOnlineModalOpen}
        status={onlineStatus}
        statusMessage={onlineStatusMsg}
        roomCode={roomCode}
        onCreateRoom={handleCreateOnlineRoom}
        onJoinRoom={handleJoinOnlineRoom}
        onClose={() => setIsOnlineModalOpen(false)}
      />

      {/* 終局（勝敗判定）モーダル */}
      <GameOverModal
        isOpen={isGameOverModalOpen}
        winner={winner}
        score={score}
        mode={mode}
        myColor={myOnlineColor}
        onRestart={handleResetGame}
        onClose={() => setIsGameOverModalOpen(false)}
      />
    </div>
  );
};
