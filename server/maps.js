/**
 * 클라이언트(app/src/game/maps/*.ts)와 같은 ASCII 타일맵을 서버에도 둔다.
 * 서버는 이동 검증(속도 상한 + 벽 충돌)에만 쓰므로 좌석 라벨 등은 필요 없다.
 *
 * 주의: 맵을 바꿀 때는 여기와 app/src/game/maps/*.ts 둘 다 고쳐야 한다.
 * (RN TS 소스를 그대로 Node에서 import 하려면 빌드 단계가 필요해서, MVP에서는 값만 복제했다.)
 */

const TILE = 32;

// '#','=','B','~','|','P' 는 통과 불가 — app/src/game/tiles.ts 의 solid:true 항목과 동일해야 한다.
const SOLID = new Set(['#', '=', 'B', '~', '|', 'P']);

const LIBRARY_ROWS = [
  '########################',
  '#,,,,,,,,,,,,,,,,,,,,,,#',
  '#,BBBBBB,,,,,,BBBBBB,,,#',
  '#,,,,,,,,,,,,,,,,,,,,,,#',
  '#,,c,,,,c,,,,c,,,,c,,,,#',
  '#,,=,,,,=,,,,=,,,,=,,,,#',
  '#,,c,,,,c,,,,c,,,,c,,,,#',
  '#,,,,,,,,,,,,,,,,,,,,,,#',
  '#,,,,,,,,,,,,,,,,,,,,,,#',
  '#,,c,,,,c,,,,c,,,,c,,,,#',
  '#,,=,,,,=,,,,=,,,,=,,,,#',
  '#,,c,,,,c,,,,c,,,,c,,,,#',
  '#,,,,,,,,,,,,,,,,,,,,,,#',
  '#,BBBB,,,,,,,,,,P,,,P,,#',
  '#,,,,,,,,,,,,,,,,,,,,,,#',
  '#,,,,,,,,,,,,,,,,,,,,,,#',
  '#,,,,,,,,,,DD,,,,,,,,,,#',
  '########################',
];

const SUBWAY_ROWS = [
  '############################',
  '#~~~~~##~~~~~##~~~~~##~~~~~#',
  '#.cc..cc..cc..cc..cc..cc...#',
  '#..........................#',
  '#....|........|........|...#',
  '#..........................#',
  'D..........................D',
  '#..........................#',
  '#....|........|........|...#',
  '#..........................#',
  '#.cc..cc..cc..cc..cc..cc...#',
  '#~~~~~##~~~~~##~~~~~##~~~~~#',
  '############################',
];

// app/src/game/maps/library.ts 와 동일한 규칙으로 좌석 존을 만든다 (책상 1개 = 마주보는 좌석 2개)
function libraryZones() {
  const cols = [3, 8, 13, 18];
  const rows = [5, 10];
  const zones = [];
  rows.forEach((row, ri) => {
    cols.forEach((col, ci) => {
      const n = ri * cols.length + ci + 1;
      zones.push({
        id: `desk-${n}`,
        seats: [
          { x: col, y: row - 1 },
          { x: col, y: row + 1 },
        ],
      });
    });
  });
  return zones;
}

// app/src/game/maps/subway.ts 와 동일한 규칙 (벤치 1개 = 나란히 붙은 좌석 2개)
function subwayZones() {
  const cols = [2, 6, 10, 14, 18, 22];
  const rows = [2, 10];
  const zones = [];
  rows.forEach((row, ri) => {
    cols.forEach((col, ci) => {
      const n = ri * cols.length + ci;
      zones.push({
        id: `bench-${n + 1}`,
        seats: [
          { x: col, y: row },
          { x: col + 1, y: row },
        ],
      });
    });
  });
  return zones;
}

export const MAPS = {
  library: { rows: LIBRARY_ROWS, zones: libraryZones() },
  subway: { rows: SUBWAY_ROWS, zones: subwayZones() },
};

/** seatId가 실존하는 좌석이고, (px,py) 가 그 좌석 타일들 중 하나에서 1.5타일 이내인지 검증한다. */
export function isNearSeat(mapId, seatId, px, py) {
  const zone = MAPS[mapId]?.zones.find((z) => z.id === seatId);
  if (!zone) return false;
  const maxDist = TILE * 1.5;
  return zone.seats.some((s) => {
    const sx = s.x * TILE + TILE / 2;
    const sy = s.y * TILE + TILE / 2;
    return Math.hypot(px - sx, py - sy) <= maxDist;
  });
}

export function isSolid(mapId, px, py) {
  const map = MAPS[mapId];
  if (!map) return false;
  const tx = Math.floor(px / TILE);
  const ty = Math.floor(py / TILE);
  const row = map.rows[ty];
  if (!row) return true; // 맵 밖은 벽 취급
  const ch = row[tx];
  if (ch === undefined) return true;
  return SOLID.has(ch);
}

export { TILE };
