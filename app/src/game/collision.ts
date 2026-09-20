import { BODY_H, BODY_W, TILE } from './constants';
import { TILES, type TileChar } from './tiles';
import type { GameMap } from './maps/types';

export const tileCharAt = (map: GameMap, tx: number, ty: number): TileChar => {
  const row = map.rows[ty];
  if (!row) return '#';
  const ch = row[tx];
  return (ch ?? '#') as TileChar;
};

export const isSolidTile = (map: GameMap, tx: number, ty: number) => TILES[tileCharAt(map, tx, ty)].solid;

export const isSeatTile = (map: GameMap, tx: number, ty: number) =>
  TILES[tileCharAt(map, tx, ty)].seat === true;

export const toTile = (px: number) => Math.floor(px / TILE);
export const tileCenter = (t: number) => t * TILE + TILE / 2;

/**
 * (x, y)는 캐릭터 발밑 중앙. 히트박스 네 모서리가 모두 통과 가능해야 이동을 허용한다.
 * 히트박스가 타일보다 작아서 문틈·의자 사이를 자연스럽게 빠져나간다.
 */
function canStand(map: GameMap, x: number, y: number) {
  const left = x - BODY_W / 2;
  const right = x + BODY_W / 2 - 0.01;
  const top = y - BODY_H;
  const bottom = y - 0.01;
  for (const px of [left, right]) {
    for (const py of [top, bottom]) {
      if (isSolidTile(map, toTile(px), toTile(py))) return false;
    }
  }
  return true;
}

/**
 * 축을 분리해서 검사한다 — 벽에 비스듬히 부딪혀도 멈추지 않고 벽을 따라 미끄러진다.
 */
export function moveWithCollision(
  map: GameMap,
  x: number,
  y: number,
  dx: number,
  dy: number,
): { x: number; y: number; blocked: boolean } {
  let nx = x;
  let ny = y;
  let blocked = false;

  if (dx !== 0) {
    if (canStand(map, x + dx, y)) nx = x + dx;
    else blocked = true;
  }
  if (dy !== 0) {
    if (canStand(map, nx, y + dy)) ny = y + dy;
    else blocked = true;
  }
  return { x: nx, y: ny, blocked };
}
