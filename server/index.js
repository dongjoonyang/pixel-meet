import { createServer } from 'node:http';
import { Server } from 'socket.io';
import { isNearSeat, isSolid } from './maps.js';

const PORT = process.env.PORT ?? 4000;
const TICK_MS = 100;

/** app/src/game/constants.ts 와 맞춘 값 — 이 이상의 속도로 이동을 보고하면 클램프한다. */
const WALK_SPEED = 96; // px/sec
/** 네트워크 지연·프레임 드랍을 감안한 여유치 */
const SPEED_TOLERANCE = 1.6;
/** 이 이상 dt가 벌어지면(재접속, 백그라운드 복귀 등) 한 번에 멀리 순간이동하지 못하도록 캡을 씌운다 */
const MAX_DT_MS = 400;

/**
 * 방(=테마 맵) 하나당 상태 한 덩어리.
 * players: socketId -> { profile, x, y, dir, state, afkMotion, seatId, sessionId }
 * sessions: sessionId -> { id, members:[socketId,socketId], origin, zoneLabel, startedAt }
 * requests: requestId -> { id, from, to }
 */
const rooms = new Map();

const getRoom = (id) => {
  if (!rooms.has(id)) rooms.set(id, { players: new Map(), sessions: new Map(), requests: new Map() });
  return rooms.get(id);
};

const uid = (p) => `${p}_${Math.random().toString(36).slice(2, 9)}`;

const io = new Server(createServer().listen(PORT), {
  cors: { origin: '*' },
});

console.log(`[pixel-meet] socket.io listening on :${PORT}`);

io.on('connection', (socket) => {
  let roomId = null;

  const room = () => (roomId ? getRoom(roomId) : null);
  const meP = () => room()?.players.get(socket.id);

  const partnerOf = (session) => session.members.find((m) => m !== socket.id);

  const endSession = (sessionId, reason) => {
    const r = room();
    const session = r?.sessions.get(sessionId);
    if (!session) return;
    r.sessions.delete(sessionId);
    for (const id of session.members) {
      const p = r.players.get(id);
      if (p) {
        p.sessionId = undefined;
        p.state = 'IDLE';
      }
      io.to(id).emit('session', null);
      if (reason) io.to(id).emit('system', reason);
    }
  };

  const openSession = (aId, bId, origin, zoneLabel) => {
    const r = room();
    const a = r.players.get(aId);
    const b = r.players.get(bId);
    if (!a || !b || a.sessionId || b.sessionId) return;
    const session = {
      id: uid('ses'),
      members: [aId, bId],
      origin,
      zoneLabel,
      startedAt: Date.now(),
    };
    r.sessions.set(session.id, session);
    a.sessionId = session.id;
    b.sessionId = session.id;
    a.state = 'BUSY';
    b.state = 'BUSY';
    // 클라이언트는 profile.id 로 상대를 찾으므로 멤버를 프로필 id로 바꿔 보낸다
    const wire = { ...session, members: [a.profile.id, b.profile.id] };
    io.to(aId).emit('session', wire);
    io.to(bId).emit('session', wire);
  };

  socket.on('join', ({ roomId: rid, profile, spawn }) => {
    roomId = rid;
    socket.join(rid);
    const startX = (spawn?.x ?? 2) * 32 + 16;
    const startY = (spawn?.y ?? 2) * 32 + 16;
    getRoom(rid).players.set(socket.id, {
      profile,
      x: startX,
      y: startY,
      dir: 'down',
      state: 'IDLE',
      lastMoveAt: Date.now(),
    });
    socket.emit('system', '실시간 서버에 연결됐어요.');
  });

  /**
   * 클라이언트가 보고한 좌표를 그대로 반영하지 않는다.
   * 1) 마지막 검증 위치 대비 실제 경과 시간(dt)에서 낼 수 있는 최대 이동 거리를 넘으면 그 방향으로 클램프한다
   *    (좌표를 조작해 순간이동/스피드핵을 하는 걸 막는다).
   * 2) 클램프된 위치가 벽 타일이면 아예 반영하지 않는다 (벽 통과 방지).
   * dt는 클라이언트가 아니라 서버 시계로 잰다 — 그래야 클라이언트가 dt 값을 속일 수 없다.
   */
  socket.on('move', (p) => {
    const me = meP();
    if (!me || !roomId) return;

    const now = Date.now();
    const dtMs = Math.min(Math.max(now - (me.lastMoveAt ?? now), 0), MAX_DT_MS);
    me.lastMoveAt = now;

    const reportedX = Number(p.x);
    const reportedY = Number(p.y);
    if (!Number.isFinite(reportedX) || !Number.isFinite(reportedY)) return;

    const dx = reportedX - me.x;
    const dy = reportedY - me.y;
    const dist = Math.hypot(dx, dy);
    const maxDist = (WALK_SPEED * dtMs) / 1000 * SPEED_TOLERANCE + 2;

    let nextX = reportedX;
    let nextY = reportedY;
    if (dist > maxDist && dist > 0) {
      const ratio = maxDist / dist;
      nextX = me.x + dx * ratio;
      nextY = me.y + dy * ratio;
    }

    if (!isSolid(roomId, nextX, nextY)) {
      me.x = nextX;
      me.y = nextY;
    }
    // 벽이면 위치는 그대로 두고 방향/상태만 갱신 — 클라이언트 화면과 몇 프레임 어긋날 수 있지만
    // 좌표 조작으로 벽을 통과하는 것보단 훨씬 낫다.
    me.dir = p.dir ?? me.dir;
    me.state = p.state ?? me.state;
    me.afkMotion = p.afkMotion;
    // 대화 중에는 서버가 상태를 BUSY로 고정한다 — 클라이언트 상태를 신뢰하지 않는다
    if (me.sessionId) me.state = 'BUSY';
  });

  socket.on('sit', ({ seatId }) => {
    const me = meP();
    const r = room();
    if (!me || !r) return;

    // 실제로 그 좌석 근처에 있는지 검증한다 — 이게 없으면 멀리서 seatId만 우겨서
    // 아무하고나 "동석했다"고 세션을 열 수 있다. 좌석 매칭은 이 앱의 핵심 신뢰 규칙이라
    // 좌표 검증보다 오히려 더 중요하게 다룬다.
    if (seatId && !isNearSeat(roomId, seatId, me.x, me.y)) {
      socket.emit('system', '그 자리와는 너무 멀어요.');
      return;
    }

    const prev = me.seatId;
    me.seatId = seatId ?? undefined;

    if (!seatId) {
      // 좌석 기반 세션은 일어나는 순간 닫힌다
      const s = me.sessionId ? r.sessions.get(me.sessionId) : null;
      if (s?.origin === 'SEAT') endSession(s.id, '자리에서 일어나 대화가 끝났어요.');
      return;
    }
    if (prev === seatId || me.sessionId) return;

    // 같은 좌석 존에 앉아 있는 다른 사람이 있으면 대화가 열린다
    for (const [id, p] of r.players) {
      if (id !== socket.id && p.seatId === seatId && !p.sessionId) {
        openSession(socket.id, id, 'SEAT', seatId);
        break;
      }
    }
  });

  socket.on('requestChat', ({ toId }) => {
    const r = room();
    const me = meP();
    if (!r || !me) return;
    const entry = [...r.players].find(([, p]) => p.profile.id === toId);
    if (!entry) return;
    const [targetSocketId, target] = entry;
    if (target.sessionId) {
      socket.emit('system', `${target.profile.nick}님은 현재 대화 중입니다.`);
      return;
    }
    const req = { id: uid('req'), from: me.profile, to: toId, at: Date.now(), fromSocket: socket.id };
    r.requests.set(req.id, req);
    io.to(targetSocketId).emit('request', { id: req.id, from: me.profile, to: toId, at: req.at });
    socket.emit('system', `${target.profile.nick}님에게 대화를 신청했어요…`);
  });

  socket.on('respond', ({ requestId, accept }) => {
    const r = room();
    if (!r) return;
    const req = r.requests.get(requestId);
    if (!req) return;
    r.requests.delete(requestId);
    const me = meP();
    io.to(req.fromSocket).emit('requestResult', {
      toId: me?.profile.id,
      toNick: me?.profile.nick,
      accepted: !!accept,
    });
    if (accept) openSession(req.fromSocket, socket.id, 'REQUEST');
  });

  socket.on('say', ({ text }) => {
    const r = room();
    const me = meP();
    if (!r || !me?.sessionId) return;
    const session = r.sessions.get(me.sessionId);
    if (!session) return;
    const msg = {
      id: uid('msg'),
      sessionId: session.id,
      from: me.profile.id,
      text: String(text).slice(0, 200),
      at: Date.now(),
    };
    for (const id of session.members) io.to(id).emit('message', msg);
  });

  socket.on('gift', ({ toId, giftName }) => {
    const r = room();
    const me = meP();
    if (!r || !me) return;
    const entry = [...r.players].find(([, p]) => p.profile.id === toId);
    if (!entry) return;
    socket.emit('system', `${entry[1].profile.nick}님에게 ${giftName}을(를) 보냈어요 🎁`);
    io.to(entry[0]).emit('system', `${me.profile.nick}님이 ${giftName}을(를) 보냈어요 🎁`);
  });

  socket.on('leaveSession', () => {
    const me = meP();
    if (me?.sessionId) endSession(me.sessionId, '대화를 종료했어요.');
  });

  socket.on('disconnect', () => {
    const r = room();
    if (!r) return;
    const me = r.players.get(socket.id);
    if (me?.sessionId) endSession(me.sessionId, '상대방이 공간을 떠났어요.');
    r.players.delete(socket.id);
    if (!r.players.size) rooms.delete(roomId);
  });
});

/** 좌표 브로드캐스트 — 각자 자기 자신은 빼고 받는다 */
setInterval(() => {
  for (const [roomId, room] of rooms) {
    for (const [socketId] of room.players) {
      const others = [];
      for (const [id, p] of room.players) {
        if (id === socketId) continue;
        others.push({
          profile: p.profile,
          x: p.x,
          y: p.y,
          dir: p.dir,
          state: p.state,
          afkMotion: p.afkMotion,
          seatId: p.seatId,
          sessionId: p.sessionId,
        });
      }
      io.to(socketId).emit('players', others);
    }
    void roomId;
  }
}, TICK_MS);
