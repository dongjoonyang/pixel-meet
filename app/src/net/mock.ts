import { TILE, WALK_SPEED } from '../game/constants';
import { moveWithCollision, tileCenter, toTile } from '../game/collision';
import { findPath } from '../game/path';
import type { GameMap, Vec } from '../game/maps/types';
import { pick, randomProfile } from '../data/people';
import type { AfkMotion, ChatSession, Dir, Player, Profile, UserState } from '../types';
import { Emitter, uid, type RoomConnection } from './connection';

const TICK = 100;

interface Brain {
  mode: 'wander' | 'goto' | 'sit' | 'afk';
  path: Vec[];
  until: number;
  /** 앉으러 가는 중인 좌석 */
  targetSeat?: { zoneId: string; tile: Vec };
  /** 내가 보낸 신청에 대한 답을 예약해 둔 시각 */
  replyAt?: number;
}

const SMALLTALK: Record<string, string[]> = {
  open: [
    '안녕하세요! 여기 자주 오세요?',
    '앗 옆자리 괜찮으시죠? 반가워요 :)',
    '조용해서 좋네요. 오늘 하루 어떠셨어요?',
    '혹시 이 시간에 자주 계신 분이신가요?',
  ],
  reply: [
    '오 저도 그래요. 완전 공감이에요.',
    '헐 진짜요? 좀 더 얘기해주세요!',
    'ㅋㅋㅋ 그거 저만 그런 게 아니었네요.',
    '음... 저는 좀 다르게 생각하는데, 그것도 재밌네요.',
    '그런 얘기 오랜만이에요. 좋다.',
    '다음에 같이 가보면 재밌겠어요.',
  ],
  bye: ['오늘 얘기 즐거웠어요, 또 봬요!', '저 이만 가볼게요. 좋은 하루 보내세요!'],
};

/**
 * 서버 없이 앱 전체 흐름(이동/좌석/신청/대화)을 돌리기 위한 로컬 목 서버.
 * RoomConnection 을 그대로 구현하므로 socket.io 연결이 살아나면 그대로 갈아끼우면 된다.
 */
export class MockConnection implements RoomConnection {
  readonly transport = 'local' as const;
  private bus = new Emitter();
  private timer: ReturnType<typeof setInterval> | null = null;
  private npcs: { player: Player; brain: Brain }[] = [];
  private me: Player;
  private session: ChatSession | null = null;
  private pendingFromMe: { id: string; toId: string; at: number } | null = null;
  private lastNpcReplyAt = 0;

  constructor(
    private map: GameMap,
    profile: Profile,
    npcCount = 7,
  ) {
    this.me = {
      profile,
      x: tileCenter(map.spawn.x),
      y: tileCenter(map.spawn.y),
      dir: 'down',
      state: 'IDLE',
    };
    this.spawnNpcs(npcCount);
    this.timer = setInterval(() => this.tick(), TICK);
  }

  // ---------- RoomConnection ----------

  on: RoomConnection['on'] = (ev, cb) => this.bus.on(ev, cb);

  move(p: { x: number; y: number; dir: Dir; state: UserState; afkMotion?: AfkMotion }) {
    this.me = { ...this.me, ...p };
    if (this.session?.origin === 'PROXIMITY') this.closeIfFarApart();
  }

  sit(seatId: string | null) {
    this.me.seatId = seatId ?? undefined;
    if (!seatId) {
      if (this.session?.origin === 'SEAT') this.endSession('자리에서 일어났어요.');
      return;
    }
    const mate = this.npcs.find((n) => n.player.seatId === seatId);
    if (mate && !this.session && !mate.player.sessionId) {
      const zone = this.map.zones.find((z) => z.id === seatId);
      this.openSession(mate.player, 'SEAT', zone?.label);
    }
  }

  requestChat(toId: string) {
    const target = this.npcs.find((n) => n.player.profile.id === toId);
    if (!target) return;
    if (target.player.state === 'BUSY') {
      this.bus.emit('system', `${target.player.profile.nick}님은 현재 대화 중입니다.`);
      return;
    }
    this.pendingFromMe = { id: uid('req'), toId, at: Date.now() };
    target.brain.replyAt = Date.now() + 900 + Math.random() * 1400;
    this.bus.emit('system', `${target.player.profile.nick}님에게 대화를 신청했어요…`);
  }

  respond(_requestId: string, accept: boolean) {
    // 목 서버에서는 NPC가 나에게 먼저 신청하는 경우만 여기로 들어온다.
    const asker = this.npcs.find((n) => n.player.profile.id === this.incomingFrom);
    this.incomingFrom = undefined;
    if (!asker) return;
    if (!accept) {
      this.bus.emit('system', '대화 신청을 정중히 거절했어요.');
      return;
    }
    this.openSession(asker.player, 'REQUEST');
  }

  say(text: string) {
    if (!this.session) return;
    const sessionId = this.session.id;
    this.bus.emit('message', {
      id: uid('msg'),
      sessionId,
      from: this.me.profile.id,
      text,
      at: Date.now(),
    });
    this.lastNpcReplyAt = Date.now() + 700 + Math.random() * 1200;
  }

  leaveSession() {
    this.endSession('대화를 종료했어요.');
  }

  gift(toId: string, giftName: string) {
    const target = this.npcs.find((n) => n.player.profile.id === toId);
    if (!target) return;
    this.bus.emit('system', `${target.player.profile.nick}님에게 ${giftName}을(를) 보냈어요 🎁`);
    if (this.session && this.session.members.includes(toId)) {
      setTimeout(() => {
        if (!this.session) return;
        this.bus.emit('message', {
          id: uid('msg'),
          sessionId: this.session.id,
          from: toId,
          text: '앗 선물 감사해요! 잘 받을게요 ☺️',
          at: Date.now(),
        });
      }, 800);
    }
  }

  dispose() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.bus.clear();
  }

  // ---------- 내부 ----------

  private incomingFrom?: string;

  private spawnNpcs(n: number) {
    const free = [...this.map.zones];
    for (let i = 0; i < n; i++) {
      const profile = randomProfile(uid('npc'));
      const spot = this.randomFreeTile();
      const player: Player = {
        profile,
        x: tileCenter(spot.x),
        y: tileCenter(spot.y),
        dir: 'down',
        state: 'IDLE',
      };
      const brain: Brain = { mode: 'wander', path: [], until: Date.now() + Math.random() * 3000 };
      // 절반 정도는 처음부터 좌석을 향해 걸어가게 해서 공간이 살아있게 보이도록
      if (i % 2 === 0 && free.length) {
        const zone = free.splice(Math.floor(Math.random() * free.length), 1)[0];
        brain.targetSeat = {
          zoneId: zone.id,
          tile: zone.seats[Math.floor(Math.random() * zone.seats.length)],
        };
        brain.mode = 'goto';
      }
      this.npcs.push({ player, brain });
    }
  }

  private randomFreeTile(): Vec {
    const h = this.map.rows.length;
    const w = this.map.rows[0].length;
    for (let i = 0; i < 200; i++) {
      const x = 1 + Math.floor(Math.random() * (w - 2));
      const y = 1 + Math.floor(Math.random() * (h - 2));
      if (findPath(this.map, this.map.spawn, { x, y })) return { x, y };
    }
    return this.map.spawn;
  }

  private openSession(other: Player, origin: ChatSession['origin'], zoneLabel?: string) {
    this.session = {
      id: uid('ses'),
      members: [this.me.profile.id, other.profile.id],
      origin,
      zoneLabel,
      startedAt: Date.now(),
    };
    other.sessionId = this.session.id;
    other.state = 'BUSY';
    this.bus.emit('session', this.session);
    const opener = zoneLabel ? `여기 '${zoneLabel}' 자리네요. 안녕하세요!` : pick(SMALLTALK.open);
    setTimeout(() => {
      if (!this.session) return;
      this.bus.emit('message', {
        id: uid('msg'),
        sessionId: this.session.id,
        from: other.profile.id,
        text: opener,
        at: Date.now(),
      });
    }, 600);
  }

  private endSession(reason: string) {
    if (!this.session) return;
    const otherId = this.session.members.find((m) => m !== this.me.profile.id);
    const other = this.npcs.find((n) => n.player.profile.id === otherId);
    if (other) {
      other.player.sessionId = undefined;
      other.player.state = other.player.seatId ? 'IDLE' : 'WALK';
    }
    this.session = null;
    this.bus.emit('session', null);
    this.bus.emit('system', reason);
  }

  private closeIfFarApart() {
    const otherId = this.session!.members.find((m) => m !== this.me.profile.id);
    const other = this.npcs.find((n) => n.player.profile.id === otherId)?.player;
    if (!other) return;
    if (Math.hypot(other.x - this.me.x, other.y - this.me.y) > TILE * 3.5) {
      this.endSession('거리가 멀어져 대화가 끊겼어요.');
    }
  }

  private tick() {
    const now = Date.now();
    const dt = TICK / 1000;

    for (const npc of this.npcs) {
      this.stepNpc(npc, dt, now);
      this.maybeAnswerMyRequest(npc, now);
    }

    // NPC 답장
    if (this.session && this.lastNpcReplyAt && now >= this.lastNpcReplyAt) {
      this.lastNpcReplyAt = 0;
      const otherId = this.session.members.find((m) => m !== this.me.profile.id)!;
      this.bus.emit('message', {
        id: uid('msg'),
        sessionId: this.session.id,
        from: otherId,
        text: pick(SMALLTALK.reply),
        at: now,
      });
    }

    // NPC가 먼저 말을 걸어오는 경우 (대화 중이 아닐 때만)
    if (!this.session && !this.incomingFrom && Math.random() < 0.004) {
      const cand = this.npcs.find(
        (n) =>
          n.player.state !== 'BUSY' && Math.hypot(n.player.x - this.me.x, n.player.y - this.me.y) < TILE * 4,
      );
      if (cand) {
        this.incomingFrom = cand.player.profile.id;
        this.bus.emit('request', {
          id: uid('req'),
          from: cand.player.profile,
          to: this.me.profile.id,
          at: now,
        });
      }
    }

    this.bus.emit(
      'players',
      this.npcs.map((n) => ({ ...n.player })),
    );
  }

  private maybeAnswerMyRequest(npc: { player: Player; brain: Brain }, now: number) {
    const req = this.pendingFromMe;
    if (!req || req.toId !== npc.player.profile.id || !npc.brain.replyAt) return;
    if (now < npc.brain.replyAt) return;
    npc.brain.replyAt = undefined;
    this.pendingFromMe = null;
    const accepted = Math.random() < 0.72;
    this.bus.emit('requestResult', {
      toId: npc.player.profile.id,
      toNick: npc.player.profile.nick,
      accepted,
    });
    if (accepted) this.openSession(npc.player, 'REQUEST');
  }

  private stepNpc(npc: { player: Player; brain: Brain }, dt: number, now: number) {
    const { player, brain } = npc;
    if (player.state === 'BUSY') return;

    if (brain.mode === 'sit' || brain.mode === 'afk') {
      if (now > brain.until) {
        brain.mode = 'wander';
        brain.path = [];
        player.seatId = undefined;
        player.afkMotion = undefined;
        player.state = 'IDLE';
      }
      return;
    }

    // 목적지가 없으면 새로 정한다: 빈 좌석을 노리거나 그냥 배회
    if (!brain.path.length) {
      if (now < brain.until) {
        player.state = 'IDLE';
        return;
      }
      const from = { x: toTile(player.x), y: toTile(player.y - 1) };
      let dest: Vec | null = null;
      if (brain.targetSeat) {
        dest = brain.targetSeat.tile;
      } else if (Math.random() < 0.45) {
        const zone = pick(this.map.zones);
        const taken = this.npcs.some((n) => n.player.seatId === zone.id);
        if (!taken) {
          const tile = pick(zone.seats);
          brain.targetSeat = { zoneId: zone.id, tile };
          dest = tile;
        }
      }
      if (!dest) dest = this.randomFreeTile();
      const path = findPath(this.map, from, dest);
      if (!path || !path.length) {
        brain.until = now + 1200;
        brain.targetSeat = undefined;
        return;
      }
      brain.path = path;
      brain.mode = 'goto';
    }

    // 웨이포인트 따라 이동
    const next = brain.path[0];
    const tx = tileCenter(next.x);
    const ty = tileCenter(next.y);
    const dx = tx - player.x;
    const dy = ty - player.y;
    const dist = Math.hypot(dx, dy);
    const step = WALK_SPEED * 0.75 * dt;

    if (dist <= step) {
      player.x = tx;
      player.y = ty;
      brain.path.shift();
      if (!brain.path.length) this.arrive(npc, now);
      return;
    }

    const moved = moveWithCollision(this.map, player.x, player.y, (dx / dist) * step, (dy / dist) * step);
    player.x = moved.x;
    player.y = moved.y;
    player.state = 'WALK';
    player.dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up';
    if (moved.blocked) brain.path = [];
  }

  private arrive(npc: { player: Player; brain: Brain }, now: number) {
    const { player, brain } = npc;
    if (brain.targetSeat) {
      player.seatId = brain.targetSeat.zoneId;
      brain.targetSeat = undefined;
      brain.mode = 'sit';
      brain.until = now + 20_000 + Math.random() * 40_000;
      player.state = 'IDLE';
      player.dir = 'down';
      // 앉아 있는 동안 일부는 '사주 보는 중' / '음악 듣는 중' 으로 전환
      if (Math.random() < 0.35) {
        brain.mode = 'afk';
        player.state = 'AFK';
        player.afkMotion = pick<AfkMotion>(['FORTUNE', 'MUSIC', 'READING']);
      }
      // 내가 이미 그 좌석 존에 앉아 있었다면 여기서 대화가 열린다
      if (this.me.seatId && this.me.seatId === player.seatId && !this.session && player.state !== 'AFK') {
        const zone = this.map.zones.find((z) => z.id === player.seatId);
        this.openSession(player, 'SEAT', zone?.label);
      }
      return;
    }
    brain.mode = 'wander';
    brain.until = now + 800 + Math.random() * 2500;
    player.state = 'IDLE';
  }
}
