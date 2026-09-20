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
    // 무료 호스팅(Render 등)은 재시작·순단이 흔하다. 재연결하면 소켓 id가 바뀌면서
    // 서버 쪽 플레이어 정보가 사라지므로, 매번 connect 시점에 다시 join 해서 방에 복귀시킨다.
    const join = () => socket.emit('join', { roomId: map.id, profile, spawn: map.spawn });
    join();
    socket.on('connect', join);

    socket.on('players', (p) => this.bus.emit('players', p));
    socket.on('message', (m) => this.bus.emit('message', m));
    socket.on('request', (r) => this.bus.emit('request', r));
    socket.on('requestResult', (r) => this.bus.emit('requestResult', r));
    socket.on('session', (s) => this.bus.emit('session', s));
    socket.on('system', (t) => this.bus.emit('system', t));
    socket.on('disconnect', () => this.bus.emit('system', '서버 연결이 끊겼어요. 재연결 시도 중…'));
    socket.on('reconnect', () => this.bus.emit('system', '다시 연결됐어요.'));

    // 최초 연결 확인용으로는 재연결을 꺼둔 채로(tryConnect) 넘어온 소켓이라, 여기서부터는 켠다.
    socket.io.reconnection(true);
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

/**
 * 서버가 떠 있으면 소켓, 아니면 null. 호출부에서 목 서버로 폴백한다.
 * 타임아웃을 넉넉히 잡는 이유: Render 무료 티어는 15분 무활동이면 잠들고,
 * 깨어나는 데 최대 20~30초 정도 걸린다. 서버가 아예 없는 경우(로컬 개발)는
 * ECONNREFUSED가 거의 즉시 나서 이 타임아웃과 무관하게 빠르게 폴백된다.
 */
export function tryConnect(url: string, timeoutMs = 25000): Promise<Socket | null> {
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
