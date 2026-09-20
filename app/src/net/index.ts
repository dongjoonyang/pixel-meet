import type { GameMap } from '../game/maps/types';
import type { Profile } from '../types';
import type { RoomConnection } from './connection';
import { MockConnection } from './mock';
import { SocketConnection, tryConnect } from './socket';

/**
 * 서버 주소. 실기기에서 테스트할 땐 PC의 LAN IP로 바꾼다.
 * (예: 'http://192.168.0.10:4000')
 */
export const SERVER_URL = process.env.EXPO_PUBLIC_SERVER_URL ?? 'http://localhost:4000';

/** 서버가 없으면 조용히 로컬 목 서버로 폴백한다 — 0원 MVP라 서버 없이도 돌아가야 한다 */
export async function createConnection(map: GameMap, profile: Profile): Promise<RoomConnection> {
  const socket = await tryConnect(SERVER_URL);
  if (socket) return new SocketConnection(socket, map, profile);
  return new MockConnection(map, profile);
}

export * from './connection';
