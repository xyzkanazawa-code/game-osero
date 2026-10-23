import Peer, { DataConnection } from 'peerjs';
import { P2PMessage, Player } from '../types/othello';

export type ConnectionStatus = 'disconnected' | 'connecting' | 'waiting' | 'connected' | 'error';

export interface P2PCallbacks {
  onStatusChange: (status: ConnectionStatus, message?: string) => void;
  onMessage: (msg: P2PMessage) => void;
  onOpponentConnected: (peerId: string) => void;
  onOpponentDisconnected: () => void;
}

export class P2PManager {
  private peer: Peer | null = null;
  private conn: DataConnection | null = null;
  private callbacks: P2PCallbacks | null = null;
  public myPeerId: string = '';
  public isHost: boolean = false;
  public myColor: Player = 'black';

  public init(callbacks: P2PCallbacks) {
    this.callbacks = callbacks;
  }

  /**
   * ホストとして部屋を作成（PeerIDを自動生成して接続待機）
   */
  public createRoom(roomPrefix: string = 'osero'): Promise<string> {
    return new Promise((resolve, reject) => {
      this.cleanup();
      this.isHost = true;
      this.myColor = 'black'; // ホストが黒（先手）

      // 6桁の英数字を生成
      const randomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      const peerId = `${roomPrefix}-${randomCode}`;

      try {
        this.peer = new Peer(peerId, {
          debug: 1,
          config: {
            iceServers: [
              { urls: 'stun:stun.l.google.com:19302' },
              { urls: 'stun:global.stun.twilio.com:3478' }
            ]
          }
        });

        this.peer.on('open', (id) => {
          this.myPeerId = id;
          this.callbacks?.onStatusChange('waiting', `部屋番号: ${randomCode}`);
          resolve(randomCode);
        });

        this.peer.on('connection', (conn) => {
          if (this.conn) {
            // すでに相手がいる場合は拒否
            conn.close();
            return;
          }
          this.setupConnection(conn);
        });

        this.peer.on('error', (err) => {
          console.error('PeerJSエラー:', err);
          this.callbacks?.onStatusChange('error', '通信エラーが発生しました');
          reject(err);
        });
      } catch (e) {
        reject(e);
      }
    });
  }

  /**
   * ゲストとして部屋に参加
   */
  public joinRoom(roomCode: string, roomPrefix: string = 'osero'): Promise<void> {
    return new Promise((resolve, reject) => {
      this.cleanup();
      this.isHost = false;
      this.myColor = 'white'; // ゲストが白（後手）

      const targetPeerId = roomCode.includes('-')
        ? roomCode.trim()
        : `${roomPrefix}-${roomCode.trim().toUpperCase()}`;

      try {
        this.peer = new Peer({
          debug: 1,
          config: {
            iceServers: [
              { urls: 'stun:stun.l.google.com:19302' },
              { urls: 'stun:global.stun.twilio.com:3478' }
            ]
          }
        });

        this.peer.on('open', (myId) => {
          this.myPeerId = myId;
          this.callbacks?.onStatusChange('connecting', '対戦相手に接続中...');

          const conn = this.peer!.connect(targetPeerId, {
            reliable: true
          });

          this.setupConnection(conn);
          resolve();
        });

        this.peer.on('error', (err) => {
          console.error('PeerJS接続エラー:', err);
          this.callbacks?.onStatusChange('error', '部屋が見つからないか、接続できませんでした');
          reject(err);
        });
      } catch (e) {
        reject(e);
      }
    });
  }

  private setupConnection(conn: DataConnection) {
    this.conn = conn;

    conn.on('open', () => {
      this.callbacks?.onStatusChange('connected', '対戦相手が接続しました！');
      this.callbacks?.onOpponentConnected(conn.peer);

      // ホストの場合、相手に白番であることを通知
      if (this.isHost) {
        this.sendMessage({ type: 'ready', color: 'white' });
      }
    });

    conn.on('data', (data) => {
      const msg = data as P2PMessage;
      this.callbacks?.onMessage(msg);
    });

    conn.on('close', () => {
      this.callbacks?.onStatusChange('disconnected', '相手との接続が切れました');
      this.callbacks?.onOpponentDisconnected();
      this.conn = null;
    });

    conn.on('error', (err) => {
      console.error('コネクションエラー:', err);
      this.callbacks?.onStatusChange('error', '通信が切断されました');
    });
  }

  public sendMessage(msg: P2PMessage) {
    if (this.conn && this.conn.open) {
      this.conn.send(msg);
    }
  }

  public cleanup() {
    if (this.conn) {
      this.conn.close();
      this.conn = null;
    }
    if (this.peer) {
      this.peer.destroy();
      this.peer = null;
    }
    this.myPeerId = '';
    this.isHost = false;
  }
}

export const p2pManager = new P2PManager();
