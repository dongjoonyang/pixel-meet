import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  KeyboardAvoidingView,
  LayoutChangeEvent,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { C } from '../theme';
import { AFK_AFTER_MS, NET_TICK_MS, TILE, WALK_SPEED } from '../game/constants';
import { isSeatTile, isSolidTile, moveWithCollision, tileCenter, toTile } from '../game/collision';
import { nearby } from '../game/proximity';
import { zoneAtTile, type GameMap } from '../game/maps/types';
import { createConnection, type RoomConnection } from '../net';
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
import { MapCanvas } from '../components/MapCanvas';
import { Avatar, AVATAR_H, AVATAR_W } from '../components/Avatar';
import { StatusBadge } from '../components/StatusBadge';
import { Joystick } from '../components/Joystick';
import { ProfileSheet } from '../components/ProfileSheet';
import { ChatPanel } from '../components/ChatPanel';
import { HintBar, RequestPrompt, Toast } from '../components/Overlays';
import { PixelButton } from '../components/Pixel';

interface Props {
  map: GameMap;
  me: Profile;
  onExit: () => void;
}

/**
 * 좌석 타일(tx, ty)에서 일어설 때 나갈 빈 칸을 찾는다.
 * 무조건 '아래로 한 칸'만 시도하면 도서관처럼 좌석 바로 아래가 책상인 자리(desk-1의 위쪽 좌석 등),
 * 지하철 아래쪽 벤치처럼 아래가 벽인 자리에서 그대로 책상/벽 안에 박혀버린다.
 * 아래→위→왼쪽→오른쪽 순으로 실제로 통과 가능한 칸을 찾아서 그리로 내보낸다.
 */
function standUpTile(map: GameMap, tx: number, ty: number): { x: number; y: number } {
  const candidates: [number, number][] = [
    [tx, ty + 1],
    [tx, ty - 1],
    [tx - 1, ty],
    [tx + 1, ty],
  ];
  const [fx, fy] = candidates.find(([cx, cy]) => !isSolidTile(map, cx, cy)) ?? candidates[0];
  return { x: tileCenter(fx), y: tileCenter(fy) };
}

export function RoomScreen({ map, me, onExit }: Props) {
  const [conn, setConn] = useState<RoomConnection | null>(null);
  const [others, setOthers] = useState<Player[]>([]);
  const [session, setSession] = useState<ChatSession | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [incoming, setIncoming] = useState<ChatRequest | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [target, setTarget] = useState<Player | null>(null);
  const [viewport, setViewport] = useState({ w: 0, h: 0 });

  /** 렌더에 필요한 내 상태만 따로 — 좌표는 Animated로 빠져 있어 매 프레임 리렌더하지 않는다 */
  const [meView, setMeView] = useState<{
    state: UserState;
    dir: Dir;
    seatId?: string;
    afkMotion?: AfkMotion;
    frame: 0 | 1;
  }>({ state: 'IDLE', dir: 'down', frame: 0 });

  const worldW = map.rows[0].length * TILE;
  const worldH = map.rows.length * TILE;

  // ---- 게임 루프용 ref (리렌더를 유발하지 않는 값들) ----
  const pos = useRef({ x: tileCenter(map.spawn.x), y: tileCenter(map.spawn.y) });
  const input = useRef({ x: 0, y: 0 });
  const meta = useRef<{ dir: Dir; state: UserState; seatId?: string; afkMotion?: AfkMotion }>({
    dir: 'down',
    state: 'IDLE',
  });
  const lastInputAt = useRef(Date.now());
  const lastNetAt = useRef(0);
  const lastFrameAt = useRef(0);
  const walkClock = useRef(0);
  const sessionRef = useRef<ChatSession | null>(null);
  const connRef = useRef<RoomConnection | null>(null);

  const playerXY = useRef(new Animated.ValueXY({ x: pos.current.x, y: pos.current.y })).current;
  const camera = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;

  sessionRef.current = session;

  // ---- 연결 ----
  useEffect(() => {
    let disposed = false;
    let c: RoomConnection | null = null;
    createConnection(map, me).then((made) => {
      if (disposed) {
        made.dispose();
        return;
      }
      c = made;
      connRef.current = made;
      setConn(made);
      made.on('players', setOthers);
      made.on('message', (m) => setMessages((prev) => [...prev, m]));
      made.on('request', setIncoming);
      made.on('requestResult', (r) =>
        setToast(r.accepted ? `${r.toNick}님이 대화를 수락했어요!` : `${r.toNick}님이 지금은 어렵다고 해요.`),
      );
      made.on('session', (s) => {
        setSession(s);
        if (s) setMessages([]);
        meta.current.state = s ? 'BUSY' : meta.current.seatId ? 'IDLE' : 'IDLE';
        setMeView((v) => ({ ...v, state: meta.current.state }));
      });
      made.on('system', setToast);
    });
    return () => {
      disposed = true;
      c?.dispose();
      connRef.current = null;
    };
  }, [map, me]);

  // ---- 카메라: 플레이어를 중앙에 두되 맵 밖은 보여주지 않는다 ----
  const applyCamera = useCallback(() => {
    if (!viewport.w || !viewport.h) return;
    const cx = Math.min(Math.max(pos.current.x - viewport.w / 2, 0), Math.max(worldW - viewport.w, 0));
    const cy = Math.min(Math.max(pos.current.y - viewport.h / 2, 0), Math.max(worldH - viewport.h, 0));
    camera.setValue({ x: -cx, y: -cy });
  }, [viewport.w, viewport.h, worldW, worldH, camera]);

  useEffect(applyCamera, [applyCamera]);

  // ---- 메인 루프 ----
  useEffect(() => {
    let raf: number;
    const step = (t: number) => {
      raf = requestAnimationFrame(step);
      const last = lastFrameAt.current || t;
      lastFrameAt.current = t;
      const dt = Math.min((t - last) / 1000, 0.05);
      const now = Date.now();

      const inChat = !!sessionRef.current;
      const v = inChat ? { x: 0, y: 0 } : input.current;
      const moving = Math.hypot(v.x, v.y) > 0.01;

      if (moving) {
        lastInputAt.current = now;
        const speed = WALK_SPEED * dt;
        const moved = moveWithCollision(map, pos.current.x, pos.current.y, v.x * speed, v.y * speed);
        pos.current = { x: moved.x, y: moved.y };
        playerXY.setValue({ x: moved.x, y: moved.y });
        applyCamera();

        meta.current.dir =
          Math.abs(v.x) > Math.abs(v.y) ? (v.x > 0 ? 'right' : 'left') : v.y > 0 ? 'down' : 'up';
        meta.current.state = 'WALK';
        meta.current.afkMotion = undefined;
        walkClock.current += dt;
      } else if (!inChat) {
        if (meta.current.state === 'WALK') meta.current.state = 'IDLE';
        // 오래 가만히 있으면 자리비움 모션으로 전환된다
        if (meta.current.state === 'IDLE' && now - lastInputAt.current > AFK_AFTER_MS) {
          meta.current.state = 'AFK';
          meta.current.afkMotion = meta.current.seatId ? 'READING' : 'MUSIC';
        }
      }

      // 좌석 판정: 의자 타일에 올라서면 Sit 모션 + 해당 존에 체크인
      const tx = toTile(pos.current.x);
      const ty = toTile(pos.current.y - 1);
      const onSeat = isSeatTile(map, tx, ty);
      const zone = onSeat ? zoneAtTile(map, tx, ty) : undefined;
      const nextSeat = zone?.id;
      if (nextSeat !== meta.current.seatId) {
        meta.current.seatId = nextSeat;
        connRef.current?.sit(nextSeat ?? null);
        if (nextSeat) {
          // 의자에 정확히 스냅시켜 '진짜 앉은' 느낌을 준다
          pos.current = { x: tileCenter(tx), y: tileCenter(ty) + TILE / 2 - 2 };
          playerXY.setValue(pos.current);
          applyCamera();
        }
      }

      // 네트워크 스로틀
      if (now - lastNetAt.current > NET_TICK_MS) {
        lastNetAt.current = now;
        connRef.current?.move({
          x: pos.current.x,
          y: pos.current.y,
          dir: meta.current.dir,
          state: meta.current.state,
          afkMotion: meta.current.afkMotion,
        });
      }

      // 렌더 상태는 실제로 바뀔 때만 갱신
      const frame: 0 | 1 = Math.floor(walkClock.current * 6) % 2 === 0 ? 0 : 1;
      setMeView((prev) =>
        prev.state === meta.current.state &&
        prev.dir === meta.current.dir &&
        prev.seatId === meta.current.seatId &&
        prev.afkMotion === meta.current.afkMotion &&
        prev.frame === frame
          ? prev
          : {
              state: meta.current.state,
              dir: meta.current.dir,
              seatId: meta.current.seatId,
              afkMotion: meta.current.afkMotion,
              frame,
            },
      );
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [map, applyCamera, playerXY]);

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setViewport({ w: width, h: height });
  };

  const partner = useMemo(() => {
    if (!session) return undefined;
    const id = session.members.find((m) => m !== me.id);
    return others.find((o) => o.profile.id === id);
  }, [session, others, me.id]);

  const myPlayer: Player = useMemo(
    () => ({ profile: me, x: pos.current.x, y: pos.current.y, dir: meView.dir, state: meView.state }),
    [me, meView.dir, meView.state],
  );

  /** 근처 2타일 안의 사람 — 하단 힌트 바에 노출 */
  const near = useMemo(() => nearby(myPlayer, others)[0], [myPlayer, others, meView.state]);

  const zoneLabel = meView.seatId ? map.zones.find((z) => z.id === meView.seatId)?.label : undefined;

  const hint = session
    ? null
    : meView.seatId
      ? {
          text: `${zoneLabel} 에 앉았어요. 같은 자리에 누가 앉으면 대화가 열려요.`,
          action: undefined,
        }
      : near
        ? {
            text: `${near.profile.nick}님이 바로 옆에 있어요.`,
            action: {
              label: near.state === 'BUSY' ? '신청 보내기' : '대화 신청',
              onPress: () => conn?.requestChat(near.profile.id),
            },
          }
        : { text: map.rule, action: undefined };

  if (!conn) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={C.accent} />
        <Text style={styles.loadingText}>
          {map.emoji} {map.name} 입장 중…
        </Text>
        <Text style={styles.loadingHint}>서버가 잠들어 있었다면 깨우는 데 20~30초 걸릴 수 있어요</Text>
      </View>
    );
  }

  return (
    // 채팅 입력창이 키보드에 가려지는 문제: 화면 전체를 여기서 한 번만 감싼다.
    // 게임 지도(stage)는 flex:1이라 키보드가 뜨면 자연히 줄어들고, ChatPanel은
    // 고정 높이 그대로 항상 화면 안에 남는다. (ChatPanel 내부에 별도로 KeyboardAvoidingView를
    // 두면 이중으로 밀려서 오히려 더 어긋난다 — 여기 한 곳에서만 처리한다.)
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={styles.topBar}>
        <Pressable onPress={onExit} style={styles.exit}>
          <Text style={styles.exitText}>‹ 로비</Text>
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>
            {map.emoji} {map.name}
          </Text>
          <Text style={styles.sub}>
            {others.length + 1}명 접속 중 · {conn.transport === 'socket' ? '실시간 서버' : '로컬 모드'}
          </Text>
        </View>
      </View>

      <View style={styles.stage} onLayout={onLayout}>
        <Animated.View
          style={[styles.world, { width: worldW, height: worldH, transform: camera.getTranslateTransform() }]}
        >
          <MapCanvas map={map} />

          {others.map((p) => (
            <Pressable
              key={p.profile.id}
              onPress={() => setTarget(p)}
              style={{
                position: 'absolute',
                left: p.x - AVATAR_W / 2,
                top: p.y - AVATAR_H,
                width: AVATAR_W,
                height: AVATAR_H,
              }}
            >
              <View style={styles.badgeSlot} pointerEvents="none">
                <StatusBadge state={p.state} afk={p.afkMotion} />
              </View>
              <Avatar
                look={p.profile.look}
                dir={p.dir}
                walking={p.state === 'WALK'}
                frame={Math.floor(Date.now() / 160) % 2 === 0 ? 0 : 1}
                sitting={!!p.seatId}
                dim={p.state === 'AFK'}
              />
              <Text style={styles.nameTag} numberOfLines={1}>
                {p.profile.nick}
              </Text>
            </Pressable>
          ))}

          <Animated.View
            style={{
              position: 'absolute',
              width: AVATAR_W,
              height: AVATAR_H,
              transform: [
                { translateX: Animated.subtract(playerXY.x, AVATAR_W / 2) },
                { translateY: Animated.subtract(playerXY.y, AVATAR_H) },
              ],
            }}
            pointerEvents="none"
          >
            <View style={styles.badgeSlot}>
              <StatusBadge state={meView.state} afk={meView.afkMotion} />
            </View>
            <Avatar
              look={me.look}
              dir={meView.dir}
              walking={meView.state === 'WALK'}
              frame={meView.frame}
              sitting={!!meView.seatId}
            />
            <Text style={[styles.nameTag, { color: C.gold }]} numberOfLines={1}>
              {me.nick}
            </Text>
          </Animated.View>
        </Animated.View>

        <Toast text={toast} onDone={() => setToast(null)} />

        {hint ? (
          <View style={styles.hintWrap}>
            <HintBar text={hint.text} action={hint.action} />
          </View>
        ) : null}

        {!session ? (
          <>
            <View style={styles.joystickWrap}>
              <Joystick onChange={(v) => (input.current = v)} />
            </View>
            <View style={styles.actionWrap}>
              <PixelButton
                label={meView.seatId ? '일어서기' : '주변 보기'}
                tone="ghost"
                onPress={() => {
                  if (meView.seatId) {
                    const seatTx = toTile(pos.current.x);
                    const seatTy = toTile(pos.current.y - 1);
                    pos.current = standUpTile(map, seatTx, seatTy);
                    playerXY.setValue(pos.current);
                    applyCamera();
                  } else if (near) {
                    setTarget(near);
                  } else {
                    setToast('2타일 안에 아무도 없어요.');
                  }
                }}
              />
            </View>
          </>
        ) : null}
      </View>

      {session ? (
        <ChatPanel
          session={session}
          partner={partner}
          me={me}
          messages={messages.filter((m) => m.sessionId === session.id)}
          onSend={(t) => conn.say(t)}
          onLeave={() => conn.leaveSession()}
        />
      ) : null}

      <ProfileSheet
        target={target}
        me={me}
        onClose={() => setTarget(null)}
        onRequest={(id) => conn.requestChat(id)}
        onGift={(id, g) => conn.gift(id, g)}
      />

      <RequestPrompt
        request={incoming}
        onRespond={(accept) => {
          if (incoming) conn.respond(incoming.id, accept);
          setIncoming(null);
        }}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  loading: { flex: 1, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { color: C.textDim, fontSize: 13 },
  loadingHint: { color: C.textDim, fontSize: 11, opacity: 0.7 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingBottom: 10,
    borderBottomWidth: 3,
    borderColor: C.border,
    backgroundColor: C.panel,
  },
  exit: { borderWidth: 2, borderColor: C.line, paddingHorizontal: 8, paddingVertical: 5 },
  exitText: { color: C.text, fontSize: 12, fontWeight: '800' },
  title: { color: C.text, fontSize: 15, fontWeight: '900' },
  sub: { color: C.textDim, fontSize: 11, marginTop: 1 },
  stage: { flex: 1, overflow: 'hidden' },
  world: { position: 'absolute', left: 0, top: 0 },
  badgeSlot: { position: 'absolute', top: -20, left: -40, width: 104, alignItems: 'center' },
  nameTag: {
    position: 'absolute',
    bottom: -13,
    left: -28,
    width: 80,
    textAlign: 'center',
    color: C.text,
    fontSize: 9,
    fontWeight: '700',
  },
  hintWrap: { position: 'absolute', left: 12, right: 12, bottom: 12 },
  joystickWrap: { position: 'absolute', left: 16, bottom: 58 },
  actionWrap: { position: 'absolute', right: 16, bottom: 58 },
});
