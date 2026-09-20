export interface Vec {
  x: number;
  y: number;
}

/**
 * 좌석 존 — "같이 앉으면 대화가 열리는" 최소 단위.
 * 도서관은 책상 1개(마주보는 좌석 2개), 지하철은 2인용 벤치 1개가 존이 된다.
 */
export interface SeatZone {
  id: string;
  /** 존 이름. 지하철은 칸 주제("퇴근길 소주 한 잔")가 그대로 들어간다 */
  label: string;
  seats: Vec[];
  capacity: number;
}

export interface GameMap {
  id: string;
  name: string;
  subtitle: string;
  emoji: string;
  /** 공간 규칙 한 줄 — 로비와 입장 배너에 노출 */
  rule: string;
  /** ASCII 타일맵. 한 글자 = 32x32 타일 */
  rows: string[];
  zones: SeatZone[];
  /** 스폰 타일 좌표 */
  spawn: Vec;
  /** 맵 바깥 여백 색 */
  ambient: string;
}

export const mapSize = (m: GameMap) => ({ w: m.rows[0].length, h: m.rows.length });

/** 해당 타일이 속한 좌석 존 */
export function zoneAtTile(map: GameMap, x: number, y: number): SeatZone | undefined {
  return map.zones.find((z) => z.seats.some((s) => s.x === x && s.y === y));
}
