import { PROXIMITY_TILES, TILE } from './constants';
import { toTile } from './collision';
import { zoneAtTile, type GameMap, type SeatZone } from './maps/types';
import type { Player } from '../types';

export const distance = (a: Player, b: Player) => Math.hypot(a.x - b.x, a.y - b.y);

/** 2타일 이내에 있는 다른 유저 (게더타운식 근접 판정) */
export function nearby(me: Player, others: Player[]): Player[] {
  const r = PROXIMITY_TILES * TILE;
  return others
    .filter((p) => p.profile.id !== me.profile.id && distance(me, p) <= r)
    .sort((a, b) => distance(me, a) - distance(me, b));
}

/** 플레이어가 서 있는 타일이 속한 좌석 존 */
export function zoneOf(map: GameMap, p: Player): SeatZone | undefined {
  return zoneAtTile(map, toTile(p.x), toTile(p.y - 1));
}

export function occupantsOfZone(map: GameMap, zoneId: string, players: Player[]): Player[] {
  return players.filter((p) => p.seatId === zoneId);
}

/**
 * 같은 좌석 존에 앉은 상대를 찾는다. 이게 대화 세션 자동 생성의 트리거.
 * 존이 꽉 찼을 때만(정확히 2명) 열리므로, 혼자 앉아 있으면 대화가 시작되지 않는다.
 */
export function seatPartner(map: GameMap, me: Player, players: Player[]): Player | undefined {
  if (!me.seatId) return undefined;
  const mates = occupantsOfZone(map, me.seatId, players).filter((p) => p.profile.id !== me.profile.id);
  return mates[0];
}
