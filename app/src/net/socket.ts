import { io, type Socket } from 'socket.io-client';
import type { GameMap } from '../game/maps/types';
import type { AfkMotion, Dir, Profile, UserState } from '../types';
import { Emitter, type RoomConnection } from './connection';

/**
 * server/index.js 와 짝을 이루는 실시간 연결.
 * 이벤트 이름은 서버와 1:1로 맞춰 둔다.
 */
export class SocketConnection implements RoomConnection {
  readonly transport = 'socket' as const;
  private bus = new Emitter();

  constructor(
    private socket: Socket,
    map: GameMap,
    profile: Profile,
  ) {
    socket.emit('join', { roomId: map.id, profile, spawn: map.spawn });
    socket.on('players', (p) => this.bus.emit('players', p));
    socket.on('message', (m) => this.bus.emit('message', m));
    socket.on('request', (r) => this.bus.emit('request', r));
    socket.on('requestResult', (r) => this.bus.emit('requestResult', r));
    socket.on('session', (s) => this.bus.emit('session', s));
    socket.on('system', (t) => this.bus.emit('system', t));
    socket.on('disconnect', () => this.bus.emit('system', '서버 연결이 끊겼어요.'));
  }

  on: RoomConnection['on'] = (ev, cb) => this.bus.on(ev, cb);

  move(p: { x: number; y: number; dir: Dir; state: UserState; afkMotion?: AfkMotion }) {
    this.socket.emit('move', p);
  }
  sit(seatId: string | null) {
    this.socket.emit('sit', { seatId });
  }
  requestChat(toId: string) {
    this.socket.emit('requestChat', { toId });
  }
  respond(requestId: string, accept: boolean) {
    this.socket.emit('respond', { requestId, accept });
  }
  say(text: string) {
    this.socket.emit('say', { text });
  }
  leaveSession() {
    this.socket.emit('leaveSession');
  }
  gift(toId: string, giftName: string) {
    this.socket.emit('gift', { toId, giftName });
  }
  dispose() {
    this.bus.clear();
    this.socket.removeAllListeners();
    this.socket.disconnect();
  }
}

/** 서버가 떠 있으면 소켓, 아니면 null. 호출부에서 목 서버로 폴백한다. */
export function tryConnect(url: string, timeoutMs = 1500): Promise<Socket | null> {
  return new Promise((resolve) => {
    let done = false;
    const socket = io(url, {
      transports: ['websocket'],
      timeout: timeoutMs,
      reconnection: false,
    });
    const finish = (s: Socket | null) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      if (!s) socket.close();
      resolve(s);
    };
    const timer = setTimeout(() => finish(null), timeoutMs);
    socket.on('connect', () => finish(socket));
    socket.on('connect_error', () => finish(null));
  });
}
