import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  AiLevel,
  BombsRemaining,
  CellModifiers,
  CellValue,
  GameMode,
  Move,
  Player,
  PlayerSkills,
  Position,
  RouletteEvent,
  RuleType,
  Score,
  SkillType,
  UnlockedZones
} from './types/othello';
import {
  applyMove,
  countScore,
  createInitialBoard,
  createInitialSkills,
  createInitialUnlockedZones,
  executeBoardReverse,
  executeColorBomb,
  executeRouletteEvent,
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
import { RulesModal } from './components/RulesModal';
import { SkillBar } from './components/SkillBar';
import { RouletteModal } from './components/RouletteModal';
import { Bot, User, Globe, BookOpen, Dices, Sparkles } from 'lucide-react';

interface HistoryItem {
  board: CellValue[][];
  unlocked: UnlockedZones;
  bombsRemaining: BombsRemaining;
  turn: Player;
  lastMove: Position | null;
  isLastMoveBomb: boolean;
}

export const App: React.FC = () => {
  // ルール（デフォルトは2段階拡張）
  const [rule, setRule] = useState<RuleType>('fortress');
  const [unlocked, setUnlocked] = useState<UnlockedZones>(createInitialUnlockedZones('fortress'));
  const [board, setBoard] = useState<CellValue[][]>(createInitialBoard('fortress'));
  const [turn, setTurn] = useState<Player>('black');
  const [mode, setMode] = useState<GameMode>('cpu');
  const [aiLevel, setAiLevel] = useState<AiLevel>('medium');
  const [lastMove, setLastMove] = useState<Position | null>(null);
  const [isLastMoveBomb, setIsLastMoveBomb] = useState(false);
  const [flippingPositions, setFlippingPositions] = useState<Set<string>>(new Set());
  const [newlyUnlockedZone, setNewlyUnlockedZone] = useState<{ key: keyof UnlockedZones; phase: 1 | 2 } | null>(null);
  const [zoneAlertMessage, setZoneAlertMessage] = useState<string | null>(null);

  // 💣 爆弾石
  const [bombsRemaining, setBombsRemaining] = useState<BombsRemaining>({ black: 1, white: 1 });
  const [isBombActive, setIsBombActive] = useState(false);
  const [isBombShaking, setIsBombShaking] = useState(false);

  // 🃏 特殊スキル & 🎲 天変地異ルーレット
  const [enableSkills, setEnableSkills] = useState(true);
  const [enableRoulette, setEnableRoulette] = useState(true);
  const [skills, setSkills] = useState<{ black: PlayerSkills; white: PlayerSkills }>(createInitialSkills());
  const [activeSkill, setActiveSkill] = useState<SkillType | null>(null);
  const [cellModifiers, setCellModifiers] = useState<CellModifiers>({});
  const [moveCount, setMoveCount] = useState(0);
  const [pendingTimeStop, setPendingTimeStop] = useState(false);
  const [isRouletteModalOpen, setIsRouletteModalOpen] = useState(false);
  const [rouletteAlertMessage, setRouletteAlertMessage] = useState<string | null>(null);

  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [passMessage, setPassMessage] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(soundManager.getMuted());

  // モーダル
  const [isModeModalOpen, setIsModeModalOpen] = useState(false);
  const [isOnlineModalOpen, setIsOnlineModalOpen] = useState(false);
  const [isGameOverModalOpen, setIsGameOverModalOpen] = useState(false);
  const [isRulesModalOpen, setIsRulesModalOpen] = useState(false);

  // オンライン対戦
  const [onlineStatus, setOnlineStatus] = useState<ConnectionStatus>('disconnected');
  const [onlineStatusMsg, setOnlineStatusMsg] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [myOnlineColor, setMyOnlineColor] = useState<Player>('black');

  // スコアと有効手
  const score: Score = countScore(board, rule, unlocked, cellModifiers);
  const validMoves: Move[] = getValidMoves(board, turn, rule, unlocked, cellModifiers);
  const isFinished = checkIsGameOver(board, rule, unlocked, cellModifiers);
  const winner = isFinished ? getWinner(board, rule, unlocked, cellModifiers) : 'draw';

  const passTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const zoneTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const shakeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleResetGame = useCallback((targetRule?: RuleType) => {
    const r = targetRule || rule;
    setBoard(createInitialBoard(r));
    setUnlocked(createInitialUnlockedZones(r));
    setBombsRemaining({ black: 1, white: 1 });
    setIsBombActive(false);
    setIsBombShaking(false);
    setSkills(createInitialSkills());
    setActiveSkill(null);
    setCellModifiers({});
    setMoveCount(0);
    setPendingTimeStop(false);
    setIsRouletteModalOpen(false);
    setRouletteAlertMessage(null);
    setTurn('black');
    setLastMove(null);
    setIsLastMoveBomb(false);
    setFlippingPositions(new Set());
    setNewlyUnlockedZone(null);
    setZoneAlertMessage(null);
    setHistory([]);
    setIsAiThinking(false);
    setPassMessage(null);
    setNewlyUnlockedZone(null);
    setZoneAlertMessage(null);
    setHistory([]);
    setIsAiThinking(false);
    setPassMessage(null);
    setIsGameOverModalOpen(false);
  }, [rule]);

  // オンラインP2P
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
    (
      row: number,
      col: number,
      player: Player,
      useBomb: boolean = false,
      useShield: boolean = false,
      sendToPeer: boolean = true
    ) => {
      const { nextBoard, flipped, exploded, nextUnlocked, newZoneUnlocked } = applyMove(
        board,
        row,
        col,
        player,
        rule,
        unlocked,
        useBomb,
        cellModifiers
      );

      // シールド（鉄壁石）付与
      const nextModifiers = { ...cellModifiers };
      if (useShield) {
        nextModifiers[`${row},${col}`] = { ...(nextModifiers[`${row},${col}`] || {}), isShield: true };
        setSkills((prev) => ({
          ...prev,
          [player]: { ...prev[player], shield: Math.max(0, prev[player].shield - 1) }
        }));
        setActiveSkill(null);
      }
      setCellModifiers(nextModifiers);

      // 💣 爆弾石
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

      // 🏰 第1段階または第2段階エリア出現時！
      if (newZoneUnlocked) {
        soundManager.playZoneUnlock();
        setNewlyUnlockedZone(newZoneUnlocked);
        const zoneNameMap: Record<string, string> = {
          topLeft_1: '左上の第1要塞（7マス）',
          topRight_1: '右上の第1要塞（7マス）',
          bottomLeft_1: '左下の第1要塞（7マス）',
          bottomRight_1: '右下の第1要塞（7マス）',
          topLeft_2: '左上の第2要塞（5マス: 2+3）',
          topRight_2: '右上の第2要塞（5マス: 2+3）',
          bottomLeft_2: '左下の第2要塞（5マス: 2+3）',
          bottomRight_2: '右下の第2要塞（5マス: 2+3）'
        };

        const alertText = newZoneUnlocked.phase === 2
          ? `🔥 第2覚醒！${zoneNameMap[newZoneUnlocked.key]}が解放されました！`
          : `⚠️ 警報！${zoneNameMap[newZoneUnlocked.key]}が解放されました！`;

        setZoneAlertMessage(alertText);
        if (zoneTimerRef.current) clearTimeout(zoneTimerRef.current);
        zoneTimerRef.current = setTimeout(() => {
          setZoneAlertMessage(null);
          setNewlyUnlockedZone(null);
        }, 4500);
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

      // 手数カウント & 天変地異ルーレット判定（8手ごと）
      const nextMoveCount = moveCount + 1;
      setMoveCount(nextMoveCount);

      if (enableRoulette && nextMoveCount > 0 && nextMoveCount % 8 === 0) {
        setIsRouletteModalOpen(true);
      }

      if (mode === 'online' && sendToPeer) {
        p2pManager.sendMessage({
          type: 'move',
          move: { row, col, player, isBomb: useBomb, isShield: useShield }
        });
      }

      // ⚡ タイムストップ（二連撃）発動中か判定
      if (pendingTimeStop) {
        setPendingTimeStop(false);
        const continuedMoves = getValidMoves(nextBoard, player, rule, nextUnlocked, nextModifiers);
        if (continuedMoves.length > 0) {
          setTurn(player);
          setPassMessage('⚡ タイムストップ！連続であなたのターン！');
          if (passTimerRef.current) clearTimeout(passTimerRef.current);
          passTimerRef.current = setTimeout(() => setPassMessage(null), 3000);
          return;
        }
      }

      // 次の手番
      const nextPlayer = getOpponent(player);
      const nextMoves = getValidMoves(nextBoard, nextPlayer, rule, nextUnlocked, nextModifiers);

      if (nextMoves.length > 0) {
        setTurn(nextPlayer);
        setPassMessage(null);
      } else {
        const myNextMoves = getValidMoves(nextBoard, player, rule, nextUnlocked, nextModifiers);
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
    [
      board,
      lastMove,
      mode,
      rule,
      unlocked,
      bombsRemaining,
      cellModifiers,
      moveCount,
      enableRoulette,
      pendingTimeStop
    ]
  );

  // スキル選択・発動
  const handleSelectSkill = (skill: SkillType) => {
    if (isAiThinking || isFinished) return;
    if (mode === 'online' && turn !== myOnlineColor) return;
    if (mode === 'cpu' && turn !== 'black') return;
    if (skills[turn][skill] <= 0) return;

    if (skill === 'shield') {
      setActiveSkill((prev) => (prev === 'shield' ? null : 'shield'));
      setIsBombActive(false);
    } else if (skill === 'colorBomb') {
      setActiveSkill((prev) => (prev === 'colorBomb' ? null : 'colorBomb'));
      setIsBombActive(false);
    } else if (skill === 'timeStop') {
      if (pendingTimeStop) return;
      setPendingTimeStop(true);
      setSkills((prev) => ({
        ...prev,
        [turn]: { ...prev[turn], timeStop: prev[turn].timeStop - 1 }
      }));
      setPassMessage('⚡ タイムストップ発動！この手を打った後、もう一度あなたの番になります！');
      if (passTimerRef.current) clearTimeout(passTimerRef.current);
      passTimerRef.current = setTimeout(() => setPassMessage(null), 3500);
    } else if (skill === 'reverse') {
      const { nextBoard, changedPositions } = executeBoardReverse(board, cellModifiers);
      setBoard(nextBoard);
      setSkills((prev) => ({
        ...prev,
        [turn]: { ...prev[turn], reverse: prev[turn].reverse - 1 }
      }));

      const flipSet = new Set<string>();
      changedPositions.forEach((p) => flipSet.add(`${p.row},${p.col}`));
      setFlippingPositions(flipSet);
      setTimeout(() => setFlippingPositions(new Set()), 400);

      soundManager.playZoneUnlock();
      setPassMessage('🔄 全反転発動！白黒がすべて入れ替わりました！');
      if (passTimerRef.current) clearTimeout(passTimerRef.current);
      passTimerRef.current = setTimeout(() => setPassMessage(null), 3500);

      // 手番を相手へ
      const nextPlayer = getOpponent(turn);
      setTurn(nextPlayer);
    }
  };

  // 天変地異ルーレット結果適用
  const handleSpinComplete = (event: RouletteEvent) => {
    const res = executeRouletteEvent(board, rule, unlocked, event, cellModifiers);
    setBoard(res.nextBoard);
    setCellModifiers(res.nextModifiers);

    const flipSet = new Set<string>();
    res.affectedPositions.forEach((p) => flipSet.add(`${p.row},${p.col}`));
    setFlippingPositions(flipSet);
    setTimeout(() => setFlippingPositions(new Set()), 500);

    soundManager.playZoneUnlock();
    setRouletteAlertMessage(res.message);
    setTimeout(() => setRouletteAlertMessage(null), 4500);
    setIsRouletteModalOpen(false);
  };

  const handleCellClick = (row: number, col: number) => {
    if (isAiThinking || isFinished) return;
    if (mode === 'online' && turn !== myOnlineColor) return;
    if (mode === 'cpu' && turn !== 'black') return;

    // 🎨 カラーボム発動中
    if (activeSkill === 'colorBomb') {
      const { nextBoard, changedPositions } = executeColorBomb(board, row, col, turn, rule, unlocked, cellModifiers);
      setBoard(nextBoard);
      setSkills((prev) => ({
        ...prev,
        [turn]: { ...prev[turn], colorBomb: Math.max(0, prev[turn].colorBomb - 1) }
      }));
      setActiveSkill(null);

      const flipSet = new Set<string>();
      changedPositions.forEach((p) => flipSet.add(`${p.row},${p.col}`));
      setFlippingPositions(flipSet);
      setTimeout(() => setFlippingPositions(new Set()), 400);
      soundManager.playExplosion();

      // 手番交代
      const nextPlayer = getOpponent(turn);
      const nextMoves = getValidMoves(nextBoard, nextPlayer, rule, unlocked, cellModifiers);
      if (nextMoves.length > 0) {
        setTurn(nextPlayer);
      }
      return;
    }

    const move = validMoves.find((m) => m.row === row && m.col === col);
    if (!move) return;

    const willUseBomb = isBombActive && bombsRemaining[turn] > 0;
    const willUseShield = activeSkill === 'shield' && skills[turn].shield > 0;
    executeMove(row, col, turn, willUseBomb, willUseShield, true);
  };

  // CPU自動着手
  useEffect(() => {
    if (mode === 'cpu' && turn === 'white' && !isFinished) {
      setIsAiThinking(true);
      const delay = Math.random() * 300 + 500;
      const timer = setTimeout(() => {
        const aiMove = calculateAiMove(
          board,
          'white',
          aiLevel,
          rule,
          unlocked,
          bombsRemaining.white,
          cellModifiers
        );
        if (aiMove) {
          // 角を取る場合はシールド石を使う判断（中級以上でシールドが残っている場合）
          const isCorner =
            (aiMove.row === 2 || aiMove.row === 9) && (aiMove.col === 2 || aiMove.col === 9) ||
            (aiMove.row === 1 || aiMove.row === 10) && (aiMove.col === 1 || aiMove.col === 10) ||
            (aiMove.row === 0 || aiMove.row === 11) && (aiMove.col === 0 || aiMove.col === 11);
          const shouldShield = enableSkills && isCorner && skills.white.shield > 0 && aiLevel !== 'easy';

          executeMove(aiMove.row, aiMove.col, 'white', !!aiMove.isBomb, shouldShield, false);
        }
        setIsAiThinking(false);
      }, delay);

      return () => clearTimeout(timer);
    }
  }, [
    board,
    turn,
    mode,
    aiLevel,
    isFinished,
    rule,
    unlocked,
    bombsRemaining.white,
    cellModifiers,
    enableSkills,
    skills.white.shield,
    executeMove
  ]);

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

  const handleResign = () => {
    if (window.confirm('降参（投了）しますか？')) {
      if (mode === 'online') {
        p2pManager.sendMessage({ type: 'resign', player: myOnlineColor });
      }
      setIsGameOverModalOpen(true);
    }
  };

  const handleToggleSound = () => {
    const muted = soundManager.toggleMute();
    setIsMuted(muted);
  };

  const handleToggleBomb = () => {
    if (bombsRemaining[turn] > 0) {
      setIsBombActive(!isBombActive);
    }
  };

  const handleQuickChangeRule = (newRule: RuleType) => {
    if (newRule === rule) return;
    setRule(newRule);
    handleResetGame(newRule);
  };

  const handleQuickChangeMode = (newMode: GameMode) => {
    if (newMode === 'online') {
      setIsOnlineModalOpen(true);
      return;
    }
    setMode(newMode);
    p2pManager.cleanup();
    handleResetGame(rule);
  };

  const handleQuickChangeAiLevel = (newLevel: AiLevel) => {
    setAiLevel(newLevel);
    if (mode !== 'cpu') {
      setMode('cpu');
      handleResetGame(rule);
    }
  };

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
      {/* 上部ヘッダー */}
      <header className="w-full flex items-center justify-between py-1 px-0.5">
        <div className="flex items-center gap-1.5">
          <div className="w-6 h-6 rounded-md bg-emerald-700 flex items-center justify-center shadow-md border border-emerald-500/40">
            <span className="w-3 h-3 rounded-full bg-slate-900 border border-white/20 inline-block shadow-sm" />
          </div>
          <h1 className="text-sm font-black tracking-tight text-white flex items-center gap-1">
            <span>対戦オセロ</span>
          </h1>
        </div>

        <div className="flex items-center gap-1.5">
          {/* 📖 ルール説明ボタン */}
          <button
            type="button"
            onClick={() => setIsRulesModalOpen(true)}
            className="px-2 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/50 text-[10px] sm:text-xs font-black flex items-center gap-1 transition-all shadow-sm cursor-pointer"
          >
            <BookOpen size={12} />
            <span>ルール説明</span>
          </button>

          {/* 対戦モード切替 */}
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
              <span>通信</span>
            </button>
          </div>
        </div>
      </header>

      {/* 🌟 4大ルール・クイック切替バー */}
      <div className="w-full flex flex-col gap-1 my-1">
        <div className="grid grid-cols-4 gap-1 p-1 bg-slate-900/90 rounded-xl border border-slate-800 shadow-md">
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

          <button
            type="button"
            onClick={() => handleQuickChangeRule('fortress')}
            className={`py-1.5 px-1 rounded-lg text-center transition-all cursor-pointer flex flex-col items-center justify-center ${
              rule === 'fortress'
                ? 'bg-amber-600 text-white font-black shadow-[0_0_10px_rgba(245,158,11,0.4)] ring-1 ring-amber-300'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <span className="text-[11px] sm:text-xs">🏰 2段拡張</span>
            <span className="text-[8px] sm:text-[9px] opacity-80">7マス+5マス</span>
          </button>

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
            <span className="text-[8px] sm:text-[9px] opacity-80">2段拡張+爆弾</span>
          </button>
        </div>

        {/* 🃏 スキル & 🎲 天変地異ルーレット トグルバー */}
        <div className="flex items-center justify-between px-1 py-1 bg-slate-900/60 rounded-lg border border-slate-800 text-[10px]">
          <span className="text-slate-400 font-bold hidden sm:inline">拡張ギミック:</span>
          <div className="flex gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={() => {
                setEnableSkills(!enableSkills);
                setActiveSkill(null);
              }}
              className={`flex-1 sm:flex-initial px-2 py-1 rounded-md font-bold flex items-center justify-center gap-1 transition-all cursor-pointer ${
                enableSkills
                  ? 'bg-blue-600/90 text-white shadow-[0_0_8px_rgba(59,130,246,0.5)] ring-1 ring-blue-400'
                  : 'bg-slate-900 text-slate-500 border border-slate-800 hover:text-slate-300'
              }`}
            >
              <Sparkles size={11} />
              <span>🃏 特殊スキル: {enableSkills ? 'ON' : 'OFF'}</span>
            </button>

            <button
              type="button"
              onClick={() => setEnableRoulette(!enableRoulette)}
              className={`flex-1 sm:flex-initial px-2 py-1 rounded-md font-bold flex items-center justify-center gap-1 transition-all cursor-pointer ${
                enableRoulette
                  ? 'bg-purple-600/90 text-white shadow-[0_0_8px_rgba(168,85,247,0.5)] ring-1 ring-purple-400'
                  : 'bg-slate-900 text-slate-500 border border-slate-800 hover:text-slate-300'
              }`}
            >
              <Dices size={11} />
              <span>🎲 天変地異: {enableRoulette ? 'ON' : 'OFF'}</span>
            </button>
          </div>
        </div>

        {/* CPU難易度切替 */}
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

        {/* 🎲 天変地異ルーレットのアラートメッセージ */}
        {rouletteAlertMessage && (
          <div className="w-full max-w-[460px] my-1 p-2 bg-gradient-to-r from-purple-900/90 via-indigo-900/90 to-purple-900/90 border border-purple-400 text-purple-200 text-center font-black text-xs rounded-xl shadow-lg animate-bounce">
            {rouletteAlertMessage}
          </div>
        )}

        <Board
          board={board}
          rule={rule}
          unlocked={unlocked}
          modifiers={cellModifiers}
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

        {/* 🃏 特殊能力スキルバー */}
        {enableSkills && (
          <div className="w-full flex justify-center my-1 px-1">
            <SkillBar
              skills={skills[turn]}
              activeSkill={activeSkill}
              onSelectSkill={handleSelectSkill}
              turn={turn}
              isMyTurn={mode !== 'cpu' || turn === 'black'}
              disabled={isAiThinking || isFinished}
            />
          </div>
        )}

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
        四隅2段階要塞オセロ © 2026 • マサ考案スペシャルエディション
      </footer>

      {/* モーダル群 */}
      <RulesModal
        isOpen={isRulesModalOpen}
        onClose={() => setIsRulesModalOpen(false)}
        currentRule={rule}
        enableSkills={enableSkills}
        enableRoulette={enableRoulette}
        onStartGame={() => handleResetGame()}
      />

      <RouletteModal
        isOpen={isRouletteModalOpen}
        onSpinComplete={handleSpinComplete}
      />

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
