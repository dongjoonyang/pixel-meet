import { isSolidTile } from './collision';
import type { GameMap, Vec } from './maps/types';

/**
 * 맵이 24x18 수준이라 BFS 한 번이 충분히 싸다.
 * NPC가 목표 좌석까지 벽을 돌아 실제로 도착하게 만드는 용도.
 */
export function findPath(map: GameMap, from: Vec, to: Vec): Vec[] | null {
  if (isSolidTile(map, to.x, to.y)) return null;
  const w = map.rows[0].length;
  const h = map.rows.length;
  const key = (x: number, y: number) => y * w + x;

  const prev = new Map<number, number>();
  const seen = new Set<number>([key(from.x, from.y)]);
  const queue: Vec[] = [from];

  while (queue.length) {
    const cur = queue.shift()!;
    if (cur.x === to.x && cur.y === to.y) {
      const path: Vec[] = [];
      let k: number | undefined = key(cur.x, cur.y);
      while (k !== undefined) {
        path.push({ x: k % w, y: Math.floor(k / w) });
        k = prev.get(k);
      }
      return path.reverse().slice(1);
    }
    const steps: Vec[] = [
      { x: cur.x + 1, y: cur.y },
      { x: cur.x - 1, y: cur.y },
      { x: cur.x, y: cur.y + 1 },
      { x: cur.x, y: cur.y - 1 },
    ];
    for (const s of steps) {
      if (s.x < 0 || s.y < 0 || s.x >= w || s.y >= h) continue;
      const k2 = key(s.x, s.y);
      if (seen.has(k2) || isSolidTile(map, s.x, s.y)) continue;
      seen.add(k2);
      prev.set(k2, key(cur.x, cur.y));
      queue.push(s);
    }
  }
  return null;
}
