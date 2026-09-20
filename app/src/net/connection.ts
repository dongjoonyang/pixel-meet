import type {
  AfkMotion,
  ChatMessage,
  ChatRequest,
  ChatSession,
  Dir,
  Player,
  Profile,
  UserState,
} from '../types';

export interface ConnEvents {
  /** 나를 제외한 방 안 모든 사람의 스냅샷 */
  players: Player[];
  message: ChatMessage;
  /** 나에게 도착한 대화 신청 */
  request: ChatRequest;
  /** 내가 보낸 신청의 결과 */
  requestResult: { toId: string; toNick: string; accepted: boolean };
  /** 내 대화 세션이 열리거나(객체) 닫힘(null) */
  session: ChatSession | null;
  /** 상단 토스트로 띄우는 시스템 안내 */
  system: string;
}

export type Unsub = () => void;

export interface RoomConnection {
  readonly transport: 'socket' | 'local';
  on<K extends keyof ConnEvents>(ev: K, cb: (payload: ConnEvents[K]) => void): Unsub;
  /** 내 좌표/상태 브로드캐스트 */
  move(p: { x: number; y: number; dir: Dir; state: UserState; afkMotion?: AfkMotion }): void;
  sit(seatId: string | null): void;
  requestChat(toId: string): void;
  respond(requestId: string, accept: boolean): void;
  say(text: string): void;
  leaveSession(): void;
  gift(toId: string, giftName: string): void;
  dispose(): void;
}

/** 아주 작은 타입 안전 이벤트 버스 */
export class Emitter {
  private map = new Map<string, Set<(p: any) => void>>();

  on<K extends keyof ConnEvents>(ev: K, cb: (p: ConnEvents[K]) => void): Unsub {
    const key = ev as string;
    if (!this.map.has(key)) this.map.set(key, new Set());
    this.map.get(key)!.add(cb);
    return () => this.map.get(key)?.delete(cb);
  }

  emit<K extends keyof ConnEvents>(ev: K, payload: ConnEvents[K]) {
    this.map.get(ev as string)?.forEach((cb) => cb(payload));
  }

  clear() {
    this.map.clear();
  }
}

export const uid = (prefix = 'id') =>
  `${prefix}_${Math.random().toString(36).slice(2, 9)}${Date.now().toString(36).slice(-3)}`;

export type { ChatMessage, ChatRequest, ChatSession, Player, Profile };
