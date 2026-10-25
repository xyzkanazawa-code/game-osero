import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  AiLevel,
  BombsRemaining,
  CellModifiers,
  CellValue,
  ChatMessage,
  GameMode,
  Mission,
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
  MISSION_POOL,
  applyMove,
  checkMissionCompleted,
  countScore,
  createInitialBoard,
  createInitialModifiers,
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
import { QuickChat } from './components/QuickChat';
import { Bot, User, Globe, BookOpen, Dices, Sparkles, HelpCircle, Flame, Award } from 'lucide-react';

interface HistoryItem {
  board: CellValue[][];
  unlocked: UnlockedZones;
  bombsRemaining: BombsRemaining;
  cellModifiers: CellModifiers;
  turn: Player;
  lastMove: Position | null;
  isLastMoveBomb: boolean;
}

// 💡 ルールごとのわかりやすいワンポイント説明
const RULE_DESCRIPTIONS: Record<RuleType, { title: string; desc: string }> = {
  classic: {
    title: '⚫⚪ 通常モード (8×8)',
    desc: '基本の8×8オセロです。（下の「特殊スキル」「天変地異」をONにすると、通常盤面でもスキルやルーレット・👑王様石・🌀ワープが遊べます！）'
  },
  fortress: {
    title: '🏰 2段階四隅拡張モード',
    desc: '四隅の角（🏰マーク）を取ると外側に「7マスの第1要塞」が出現！さらにその先端の角（⚡マーク）を取ると「5マスの第2要塞」が解放されます！'
  },
  bomb: {
    title: '💣 爆弾石モード (3×3大爆破)',
    desc: '下の「💣爆弾を使う」ボタンを押して石を置くと、着弾点の周囲3×3マスの敵石を丸ごと爆破して自分の色に塗り替えます！'
  },
  chaos: {
    title: '🔥 全部盛りカオスモード（一番人気！）',
    desc: '「🏰2段階要塞拡張」＋「💣爆弾石」＋「👑王様石・🌀ワープ・❓ルーレット箱」がすべて融合した超ド派手モードです！'
  }
};

export const App: React.FC = () => {
  // ルール（デフォルトは全部盛り or 2段階拡張）
  const [rule, setRule] = useState<RuleType>('chaos');
  const [unlocked, setUnlocked] = useState<UnlockedZones>(createInitialUnlockedZones('chaos'));
  const [board, setBoard] = useState<CellValue[][]>(createInitialBoard('chaos'));
  const [turn, setTurn] = useState<Player>('black');
  const [mode, setMode] = useState<GameMode>('cpu');
  const [aiLevel, setAiLevel] = useState<AiLevel>('medium');
  const [lastMove, setLastMove] = useState<Position | null>(null);
  const [isLastMoveBomb, setIsLastMoveBomb] = useState(false);
  const [flippingPositions, setFlippingPositions] = useState<Set<string>>(new Set());
  const [newlyUnlockedZone, setNewlyUnlockedZone] = useState<{ key: keyof UnlockedZones; phase: 1 | 2 } | null>(null);
  const [zoneAlertMessage, setZoneAlertMessage] = useState<string | null>(null);

  // 💡 わかりやすいルール説明バナー表示状態
  const [showRuleBanner, setShowRuleBanner] = useState(true);

  // 💣 爆弾石
  const [bombsRemaining, setBombsRemaining] = useState<BombsRemaining>({ black: 1, white: 1 });
  const [isBombActive, setIsBombActive] = useState(false);
  const [isBombShaking, setIsBombShaking] = useState(false);

  // 🃏 特殊スキル & 🎲 天変地異ルーレット & 📜 ミッション
  const [enableSkills, setEnableSkills] = useState(true);
  const [enableRoulette, setEnableRoulette] = useState(true);
  const [skills, setSkills] = useState<{ black: PlayerSkills; white: PlayerSkills }>(createInitialSkills());
  const [activeSkill, setActiveSkill] = useState<SkillType | null>(null);
  const [cellModifiers, setCellModifiers] = useState<CellModifiers>(() => createInitialModifiers('chaos', true));
  const [moveCount, setMoveCount] = useState(0);
  const [pendingTimeStop, setPendingTimeStop] = useState(false);

  // ルーレットモーダル状態
  const [isRouletteModalOpen, setIsRouletteModalOpen] = useState(false);
  const [rouletteReason, setRouletteReason] = useState('8手ごとの定期天変地異');
  const [isSpecialRoulette, setIsSpecialRoulette] = useState(false);
  const [rouletteAlertMessage, setRouletteAlertMessage] = useState<string | null>(null);
  const [revengeUsed, setRevengeUsed] = useState<{ black: boolean; white: boolean }>({ black: false, white: false });

  // 📜 リアルタイム・ミッション
  const [missionIndex, setMissionIndex] = useState(0);
  const [showMissionDetail, setShowMissionDetail] = useState(false);
  const currentMission: Mission = MISSION_POOL[missionIndex % MISSION_POOL.length];

  // 💬 簡易チャット履歴
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome-1',
      sender: 'system',
      senderName: 'システム',
      text: '対局スタート！ボタンを押すと下にわかりやすい説明が出ます💡',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);

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

  const addChatMessage = useCallback(
    (sender: Player | 'system', senderName: string, text: string, isStamp: boolean = false) => {
      const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setChatMessages((prev) => [
        ...prev,
        {
          id: `${Date.now()}-${Math.random()}`,
          sender,
          senderName,
          text,
          time,
          isStamp
        }
      ]);
    },
    []
  );

  const handleResetGame = useCallback(
    (targetRule?: RuleType, targetSkills?: boolean, targetRoulette?: boolean) => {
      const r = targetRule ?? rule;
      const sk = targetSkills ?? enableSkills;
      const rl = targetRoulette ?? enableRoulette;
      setBoard(createInitialBoard(r));
      setUnlocked(createInitialUnlockedZones(r));
      setBombsRemaining({ black: 1, white: 1 });
      setIsBombActive(false);
      setIsBombShaking(false);
      setSkills(createInitialSkills());
      setActiveSkill(null);
      setCellModifiers(createInitialModifiers(r, sk || rl));
      setMoveCount(0);
      setPendingTimeStop(false);
      setIsRouletteModalOpen(false);
      setRouletteAlertMessage(null);
      setRevengeUsed({ black: false, white: false });
      setMissionIndex(0);
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
    },
    [rule, enableSkills, enableRoulette]
  );

  // 💬 プレイヤーからのチャット送信処理（オンライン＆CPU自動返信対応）
  const handleSendChat = useCallback(
    (text: string, isStamp: boolean = false) => {
      const mySender: Player = mode === 'online' ? myOnlineColor : turn;
      const myName =
        mode === 'cpu'
          ? 'あなた'
          : mode === 'online'
          ? `あなた(${myOnlineColor === 'black' ? '黒' : '白'})`
          : turn === 'black'
          ? '黒プレイヤー'
          : '白プレイヤー';

      addChatMessage(mySender, myName, text, isStamp);

      if (mode === 'online') {
        const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        p2pManager.sendMessage({
          type: 'chat',
          message: text,
          sender: myOnlineColor === 'black' ? '黒プレイヤー' : '白プレイヤー',
          time,
          isStamp
        });
      } else if (mode === 'cpu') {
        // CPUが文脈に合わせて楽しく返信！
        setTimeout(() => {
          let reply = 'いい勝負ですね！🤖🔥';
          if (text.includes('よろしく')) {
            reply = 'よろしくお願いします！全力で相手しますよ🤖✨';
          } else if (text.includes('ナイス')) {
            reply = 'ありがとうございます！そちらも鋭い読みですね🤖👏';
          } else if (text.includes('ピンチ')) {
            reply = 'ふっふっふ、このまま一気に押し切りますよ！🤖⚡';
          } else if (text.includes('天変地異')) {
            reply = 'ルーレットで何が起きるかドキドキしますね…！🤖🎲';
          } else if (text.includes('長考') || text.includes('考え中')) {
            reply = 'ゆっくり考えて大丈夫ですよ！じっくり打ちましょう🤖🍵';
          } else if (text.includes('逆転')) {
            reply = 'むむっ！？油断しないように気を引き締めます！🤖🛡️';
          } else if (text.includes('王様')) {
            reply = '👑キング石（5点）は私も狙っていますよ…！🤖👑';
          } else if (text.includes('ありがとう')) {
            reply = 'こちらこそ楽しい対局ありがとうございます！🤖🎉';
          } else {
            const randomReplies = [
              'なるほど、そう来ますか！🤖💡',
              'この盤面、まだどう転ぶかわかりませんよ！🤖🔥',
              '天変地異ルーレット次第で一発逆転もありえますね🤖🎲',
              '👑王様石と🌀ワープの位置がカギになりそうです🤖✨'
            ];
            reply = randomReplies[Math.floor(Math.random() * randomReplies.length)];
          }
          addChatMessage('white', `CPU (${aiLevel === 'easy' ? '初級' : aiLevel === 'medium' ? '中級' : '上級'})`, reply, true);
        }, 700);
      }
    },
    [mode, myOnlineColor, turn, aiLevel, addChatMessage]
  );

  // オンラインP2P
  useEffect(() => {
    p2pManager.init({
      onStatusChange: (status, msg) => {
        setOnlineStatus(status);
        if (msg) setOnlineStatusMsg(msg);
        if (status === 'connected') {
          setIsOnlineModalOpen(false);
          handleResetGame();
          addChatMessage('system', 'システム', 'オンライン対戦相手と接続しました！チャットで挨拶してみましょう💬');
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
          executeMove(msg.move.row, msg.move.col, msg.move.player, !!msg.move.isBomb, !!msg.move.isShield, false);
        } else if (msg.type === 'chat') {
          const oppColor = myOnlineColor === 'black' ? 'white' : 'black';
          addChatMessage(oppColor, msg.sender || '相手', msg.message, msg.isStamp);
        } else if (msg.type === 'roulette') {
          handleSpinComplete(msg.event, false);
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
  }, [handleResetGame, rule, myOnlineColor, addChatMessage]);

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
      const {
        nextBoard,
        flipped,
        nextUnlocked,
        newZoneUnlocked,
        triggeredMystery,
        triggeredWarp,
        triggeredTrapBy,
        nextModifiers
      } = applyMove(board, row, col, player, rule, unlocked, useBomb, cellModifiers);

      // シールド（鉄壁石）付与
      if (useShield) {
        nextModifiers[`${row},${col}`] = { ...(nextModifiers[`${row},${col}`] || {}), isShield: true };
        setSkills((prev) => ({
          ...prev,
          [player]: { ...prev[player], shield: Math.max(0, prev[player].shield - 1) }
        }));
        setActiveSkill(null);
      }
      setCellModifiers(nextModifiers);

      // 💣 爆弾石 or 🕸️ 地雷爆発
      if (useBomb || triggeredTrapBy) {
        soundManager.playExplosion();
        setIsBombShaking(true);
        if (shakeTimerRef.current) clearTimeout(shakeTimerRef.current);
        shakeTimerRef.current = setTimeout(() => setIsBombShaking(false), 500);

        if (useBomb) {
          setBombsRemaining((prev) => ({
            ...prev,
            [player]: Math.max(0, prev[player] - 1)
          }));
          setIsBombActive(false);
        }
      } else {
        soundManager.playPlaceDisc();
        soundManager.playFlipDiscs(flipped.length);
      }

      // 🕸️ ステルス地雷を踏んだ時のアラート
      if (triggeredTrapBy) {
        const trapOwnerLabel = triggeredTrapBy === 'black' ? '黒' : '白';
        setRouletteAlertMessage(`🕸️ ドカーン！！${trapOwnerLabel}のステルス地雷が炸裂！周囲3×3が吹き飛んだ！`);
        setTimeout(() => setRouletteAlertMessage(null), 4000);
      } else if (triggeredWarp) {
        // 🌀 ワープ共鳴アラート
        soundManager.playZoneUnlock();
        const warpColorLabel = triggeredWarp === 'blue' ? '🌀青ワープ' : '🟠オレンジワープ';
        setRouletteAlertMessage(`${warpColorLabel}共鳴発動！反対側のワープ周囲の敵石も一気に裏返った！`);
        setTimeout(() => setRouletteAlertMessage(null), 3500);
      }

      // 📜 リアルタイム・ミッション達成判定！
      if ((enableSkills || enableRoulette) && checkMissionCompleted(currentMission, row, col, flipped.length, triggeredMystery, triggeredWarp)) {
        const rewardType = currentMission.rewardType;
        if (rewardType === 'bomb') {
          setBombsRemaining((prev) => ({ ...prev, [player]: prev[player] + 1 }));
        } else {
          setSkills((prev) => ({
            ...prev,
            [player]: { ...prev[player], [rewardType]: prev[player][rewardType] + 1 }
          }));
        }
        const playerLabel = player === 'black' ? '黒' : '白';
        addChatMessage('system', 'クエスト達成', `🎉 ${playerLabel}がミッション「${currentMission.title}」を達成！【${currentMission.rewardText}】を獲得！`);
        setMissionIndex((prev) => prev + 1);
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

        const alertText =
          newZoneUnlocked.phase === 2
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
        { board, unlocked, bombsRemaining, cellModifiers, turn: player, lastMove, isLastMoveBomb: useBomb }
      ]);

      setBoard(nextBoard);
      setUnlocked(nextUnlocked);
      setLastMove({ row, col });
      setIsLastMoveBomb(useBomb);

      // 手数カウント & 天変地異ルーレット判定（❓ミステリーマス着地 or 8手ごと）
      const nextMoveCount = moveCount + 1;
      setMoveCount(nextMoveCount);

      if (enableRoulette) {
        if (triggeredMystery) {
          setRouletteReason('❓ ミステリーマス（？箱）ボーナス発動！');
          setIsSpecialRoulette(true);
          setIsRouletteModalOpen(true);
        } else if (nextMoveCount > 0 && nextMoveCount % 8 === 0) {
          setRouletteReason(`🎲 ${nextMoveCount}手目：定期天変地異ルーレット！`);
          setIsSpecialRoulette(false);
          setIsRouletteModalOpen(true);
        }
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
          setPassMessage('⚡ 二連撃（タイムストップ）！連続であなたのターン！');
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
      enableSkills,
      pendingTimeStop,
      currentMission,
      addChatMessage
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
    } else if (skill === 'trap') {
      setActiveSkill((prev) => (prev === 'trap' ? null : 'trap'));
      setIsBombActive(false);
    } else if (skill === 'timeStop') {
      if (pendingTimeStop) return;
      setPendingTimeStop(true);
      setActiveSkill(null);
      setSkills((prev) => ({
        ...prev,
        [turn]: { ...prev[turn], timeStop: prev[turn].timeStop - 1 }
      }));
      setPassMessage('⚡ 二連撃発動！この手を打った後、もう一度あなたの番になります！');
      if (passTimerRef.current) clearTimeout(passTimerRef.current);
      passTimerRef.current = setTimeout(() => setPassMessage(null), 3500);
    } else if (skill === 'reverse') {
      const { nextBoard, changedPositions } = executeBoardReverse(board, cellModifiers);
      setBoard(nextBoard);
      setActiveSkill(null);
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

      const nextPlayer = getOpponent(turn);
      setTurn(nextPlayer);
    }
  };

  // 🎲 天変地異ルーレット結果適用
  const handleSpinComplete = useCallback(
    (event: RouletteEvent, broadcast: boolean = true) => {
      const res = executeRouletteEvent(board, rule, unlocked, event, cellModifiers);
      setBoard(res.nextBoard);
      setCellModifiers(res.nextModifiers);

      // 🎁 福袋ボーナスの場合は両プレイヤーに爆弾+1 ＆ 鉄壁/カラーボム+1支給！
      if (res.grantBonus) {
        setBombsRemaining((prev) => ({ black: prev.black + 1, white: prev.white + 1 }));
        setSkills((prev) => ({
          black: { ...prev.black, shield: prev.black.shield + 1, colorBomb: prev.black.colorBomb + 1 },
          white: { ...prev.white, shield: prev.white.shield + 1, colorBomb: prev.white.colorBomb + 1 }
        }));
      }

      const flipSet = new Set<string>();
      res.affectedPositions.forEach((p) => flipSet.add(`${p.row},${p.col}`));
      setFlippingPositions(flipSet);
      setTimeout(() => setFlippingPositions(new Set()), 500);

      soundManager.playZoneUnlock();
      setRouletteAlertMessage(res.message);
      addChatMessage('system', '天変地異', res.message);
      setTimeout(() => setRouletteAlertMessage(null), 5000);
      setIsRouletteModalOpen(false);

      if (mode === 'online' && broadcast) {
        p2pManager.sendMessage({ type: 'roulette', event });
      }
    },
    [board, rule, unlocked, cellModifiers, mode, addChatMessage]
  );

  // 🔥 劣勢救済リベンジ・ルーレット発動
  const handleTriggerRevengeRoulette = () => {
    if (revengeUsed[turn]) return;
    setRevengeUsed((prev) => ({ ...prev, [turn]: true }));
    setRouletteReason('🔥 劣勢からの一発逆転！リベンジ・ルーレット！');
    setIsSpecialRoulette(true);
    setIsRouletteModalOpen(true);
  };

  const handleCellClick = (row: number, col: number) => {
    if (isAiThinking || isFinished) return;
    if (mode === 'online' && turn !== myOnlineColor) return;
    if (mode === 'cpu' && turn !== 'black') return;

    // 🕸️ ステルス地雷設置モード中（手番を消費せずに罠を仕掛けられる！）
    if (activeSkill === 'trap') {
      if (board[row][col] !== null) return;
      const key = `${row},${col}`;
      setCellModifiers((prev) => ({
        ...prev,
        [key]: { ...(prev[key] || {}), trapOwner: turn }
      }));
      setSkills((prev) => ({
        ...prev,
        [turn]: { ...prev[turn], trap: Math.max(0, prev[turn].trap - 1) }
      }));
      setActiveSkill(null);
      soundManager.playPlaceDisc();
      setPassMessage('🕸️ ステルス地雷を設置しました！続けて通常の石を打ってください！');
      if (passTimerRef.current) clearTimeout(passTimerRef.current);
      passTimerRef.current = setTimeout(() => setPassMessage(null), 3500);
      return;
    }

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

  // CPU自動着手（ルーレットが開いている間は待機）
  useEffect(() => {
    if (mode === 'cpu' && turn === 'white' && !isFinished && !isRouletteModalOpen) {
      setIsAiThinking(true);
      const delay = Math.random() * 300 + 550;
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
          const isCorner =
            ((aiMove.row === 2 || aiMove.row === 9) && (aiMove.col === 2 || aiMove.col === 9)) ||
            ((aiMove.row === 1 || aiMove.row === 10) && (aiMove.col === 1 || aiMove.col === 10)) ||
            ((aiMove.row === 0 || aiMove.row === 11) && (aiMove.col === 0 || aiMove.col === 11));
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
    isRouletteModalOpen,
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
    if (isFinished && !isRouletteModalOpen) {
      soundManager.playVictory();
      const timer = setTimeout(() => {
        setIsGameOverModalOpen(true);
      }, 700);
      return () => clearTimeout(timer);
    }
  }, [isFinished, isRouletteModalOpen]);

  // 待った
  const handleUndo = () => {
    if (history.length === 0 || isAiThinking) return;

    if (mode === 'cpu') {
      if (history.length >= 2) {
        const target = history[history.length - 2];
        setBoard(target.board);
        setUnlocked(target.unlocked);
        setBombsRemaining(target.bombsRemaining);
        setCellModifiers(target.cellModifiers);
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
      setCellModifiers(last.cellModifiers);
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
      setActiveSkill(null);
    }
  };

  const handleQuickChangeRule = (newRule: RuleType) => {
    setShowRuleBanner(true);
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
    } catch {
      alert('部屋の作成に失敗しました。時間をおいて再試行してください。');
    }
  };

  const handleJoinOnlineRoom = async (code: string) => {
    try {
      await p2pManager.joinRoom(code);
      setRoomCode(code);
      setMyOnlineColor('white');
    } catch {
      alert('部屋への接続に失敗しました。コードをご確認ください。');
    }
  };

  const currentTurnBombs = bombsRemaining[turn] || 0;
  const myViewerColor: Player = mode === 'online' ? myOnlineColor : mode === 'cpu' ? 'black' : turn;

  // 🔥 リベンジルーレット発動可能か判定（10点以上負けている＆未使用＆自分の手番）
  const myScore = score[turn];
  const oppScore = score[getOpponent(turn)];
  const canUseRevengeRoulette =
    enableRoulette &&
    !revengeUsed[turn] &&
    oppScore - myScore >= 10 &&
    (mode !== 'cpu' || turn === 'black') &&
    (mode !== 'online' || turn === myOnlineColor);

  // 次の定期ルーレットまでの残り手数
  const movesUntilRoulette = 8 - (moveCount % 8);

  return (
    <div className="min-h-[100dvh] bg-slate-950 text-slate-100 flex flex-col items-center justify-between p-2 sm:p-3 max-w-[500px] mx-auto w-full selection:bg-emerald-500 selection:text-white">
      {/* 上部ヘッダー */}
      <header className="w-full flex items-center justify-between py-1 px-0.5">
        <div className="flex items-center gap-1.5">
          <div className="w-6 h-6 rounded-md bg-emerald-700 flex items-center justify-center shadow-md border border-emerald-500/40">
            <span className="w-3 h-3 rounded-full bg-slate-900 border border-white/20 inline-block shadow-sm" />
          </div>
          <h1 className="text-sm font-black tracking-tight text-white flex items-center gap-1">
            <span>超ギミック対戦オセロ</span>
          </h1>
        </div>

        <div className="flex items-center gap-1.5">
          {/* 📖 ルール説明ボタン */}
          <button
            type="button"
            onClick={() => setIsRulesModalOpen(true)}
            className="px-2 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-[10px] sm:text-xs font-black flex items-center gap-1 transition-all shadow-md cursor-pointer"
          >
            <BookOpen size={12} />
            <span>📖 ルール図鑑</span>
          </button>

          {/* 対戦モード切替 */}
          <div className="flex items-center gap-0.5 p-0.5 bg-slate-900 border border-slate-800 rounded-lg">
            <button
              type="button"
              onClick={() => handleQuickChangeMode('cpu')}
              className={`px-1.5 py-0.5 rounded text-[10px] font-bold flex items-center gap-0.5 transition-all cursor-pointer ${
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
              className={`px-1.5 py-0.5 rounded text-[10px] font-bold flex items-center gap-0.5 transition-all cursor-pointer ${
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
              className={`px-1.5 py-0.5 rounded text-[10px] font-bold flex items-center gap-0.5 transition-all cursor-pointer ${
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

      {/* 🌟 4大ルール・クイック切替バー ＆ わかりやすい説明ボックス */}
      <div className="w-full flex flex-col gap-1 my-1">
        <div className="grid grid-cols-4 gap-1 p-1 bg-slate-900/90 rounded-xl border border-slate-800 shadow-md">
          <button
            type="button"
            onClick={() => handleQuickChangeRule('classic')}
            className={`py-1 px-1 rounded-lg text-center transition-all cursor-pointer flex flex-col items-center justify-center ${
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
            className={`py-1 px-1 rounded-lg text-center transition-all cursor-pointer flex flex-col items-center justify-center ${
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
            className={`py-1 px-1 rounded-lg text-center transition-all cursor-pointer flex flex-col items-center justify-center ${
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
            className={`py-1 px-1 rounded-lg text-center transition-all cursor-pointer flex flex-col items-center justify-center ${
              rule === 'chaos'
                ? 'bg-purple-600 text-white font-black shadow-[0_0_10px_rgba(168,85,247,0.4)] ring-1 ring-purple-300'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <span className="text-[11px] sm:text-xs">🔥 全部盛り</span>
            <span className="text-[8px] sm:text-[9px] opacity-80">全ギミック</span>
          </button>
        </div>

        {/* 💡 選択中のルール説明バナー（ボタンを押すと常にわかりやすい説明が出る！） */}
        {showRuleBanner && (
          <div className="px-2.5 py-1.5 bg-slate-900/95 border border-amber-500/40 rounded-lg text-[10px] sm:text-[11px] text-slate-200 flex items-start justify-between gap-2 shadow-sm">
            <div>
              <span className="font-black text-amber-300 mr-1.5">{RULE_DESCRIPTIONS[rule].title}:</span>
              <span>{RULE_DESCRIPTIONS[rule].desc}</span>
            </div>
            <button
              type="button"
              onClick={() => setShowRuleBanner(false)}
              className="text-slate-400 hover:text-white font-bold px-1 cursor-pointer"
              title="説明を閉じる"
            >
              ✕
            </button>
          </div>
        )}

        {/* 🃏 スキル & 🎲 天変地異ルーレット トグルバー ＋ CPU難易度 */}
        <div className="flex flex-wrap items-center justify-between gap-1 px-1.5 py-1 bg-slate-900/60 rounded-lg border border-slate-800 text-[10px]">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => {
                const next = !enableSkills;
                setEnableSkills(next);
                setActiveSkill(null);
              }}
              className={`px-2 py-0.5 rounded-md font-bold flex items-center gap-1 transition-all cursor-pointer ${
                enableSkills
                  ? 'bg-blue-600/90 text-white shadow-sm ring-1 ring-blue-400'
                  : 'bg-slate-900 text-slate-500 border border-slate-800'
              }`}
            >
              <Sparkles size={11} />
              <span>🃏 5大スキル:{enableSkills ? 'ON' : 'OFF'}</span>
            </button>

            <button
              type="button"
              onClick={() => setEnableRoulette(!enableRoulette)}
              className={`px-2 py-0.5 rounded-md font-bold flex items-center gap-1 transition-all cursor-pointer ${
                enableRoulette
                  ? 'bg-purple-600/90 text-white shadow-sm ring-1 ring-purple-400'
                  : 'bg-slate-900 text-slate-500 border border-slate-800'
              }`}
            >
              <Dices size={11} />
              <span>🎲 ルーレット:{enableRoulette ? `ON(あと${movesUntilRoulette}手)` : 'OFF'}</span>
            </button>
          </div>

          {mode === 'cpu' && (
            <div className="flex items-center gap-1">
              <span className="text-slate-400 font-bold">CPU:</span>
              {(['easy', 'medium', 'hard'] as AiLevel[]).map((lvl) => {
                const label = lvl === 'easy' ? '初級' : lvl === 'medium' ? '中級' : '上級';
                const isSelected = aiLevel === lvl;
                return (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => handleQuickChangeAiLevel(lvl)}
                    className={`px-1.5 py-0.5 rounded text-[10px] font-extrabold cursor-pointer transition-all ${
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
          )}
        </div>

        {/* 📜 リアルタイム・ミッション（懸賞金クエスト）バー */}
        {(enableSkills || enableRoulette) && (
          <div
            onClick={() => setShowMissionDetail(!showMissionDetail)}
            className="px-2.5 py-1 bg-gradient-to-r from-amber-950/70 via-slate-900 to-amber-950/70 border border-amber-500/40 rounded-lg flex flex-col gap-1 cursor-pointer hover:border-amber-400 transition-all"
          >
            <div className="flex items-center justify-between text-[10px] sm:text-[11px]">
              <div className="flex items-center gap-1 font-black text-amber-300 truncate">
                <Award size={13} className="text-amber-400 shrink-0" />
                <span>📜 ミッション: {currentMission.title}</span>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <span className="px-1.5 py-0.2 rounded bg-amber-500/20 border border-amber-400/50 text-amber-200 font-extrabold text-[9px]">
                  報酬: {currentMission.rewardText}
                </span>
                <HelpCircle size={12} className="text-slate-400" />
              </div>
            </div>
            {showMissionDetail && (
              <div className="text-[10px] text-slate-200 bg-slate-950/80 px-2 py-1 rounded border border-slate-800">
                💡 達成条件: {currentMission.desc}（先に達成したプレイヤーに即座に報酬が支給されます！）
              </div>
            )}
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

        {/* 🔥 劣勢救済！リベンジ・ルーレット発動ボタン */}
        {canUseRevengeRoulette && (
          <button
            type="button"
            onClick={handleTriggerRevengeRoulette}
            className="w-full max-w-[440px] my-1 py-1.5 px-3 bg-gradient-to-r from-rose-600 via-amber-500 to-rose-600 text-slate-950 font-black text-xs rounded-xl shadow-[0_0_20px_rgba(244,63,94,0.6)] flex items-center justify-center gap-1.5 animate-pulse cursor-pointer"
          >
            <Flame size={15} />
            <span>🔥 劣勢救済！一発逆転【リベンジ・ルーレット】を回す！（試合中1回限定）</span>
          </button>
        )}

        {/* 🎲 天変地異ルーレット＆ワープ＆地雷のアラートメッセージ */}
        {rouletteAlertMessage && (
          <div className="w-full max-w-[440px] my-1 p-2 bg-gradient-to-r from-purple-900/95 via-indigo-900/95 to-purple-900/95 border border-purple-400 text-amber-200 text-center font-black text-xs rounded-xl shadow-lg animate-bounce">
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
          myViewerColor={myViewerColor}
          activeSkill={activeSkill}
          onCellClick={handleCellClick}
          disabled={
            isAiThinking ||
            isFinished ||
            (mode === 'online' && turn !== myOnlineColor) ||
            (mode === 'cpu' && turn !== 'black')
          }
        />

        {/* 🃏 特殊能力スキルバー（5大スキル＋押すと出る説明バナー） */}
        {enableSkills && (
          <div className="w-full flex justify-center my-1 px-0.5">
            <SkillBar
              skills={skills[turn]}
              activeSkill={activeSkill}
              onSelectSkill={handleSelectSkill}
              turn={turn}
              isMyTurn={(mode !== 'cpu' || turn === 'black') && (mode !== 'online' || turn === myOnlineColor)}
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

        {/* 💬 簡易チャット＆スタンプ */}
        <QuickChat
          messages={chatMessages}
          onSendMessage={handleSendChat}
          mode={mode}
          myColor={myViewerColor}
        />
      </main>

      {/* フッター */}
      <footer className="w-full text-center text-[9px] text-slate-500 py-0.5">
        超ギミック四隅2段階要塞オセロ © 2026 • マサ考案スペシャルエディション
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
        reason={rouletteReason}
        isRevengeOrMystery={isSpecialRoulette}
        onSpinComplete={(ev) => handleSpinComplete(ev, true)}
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
