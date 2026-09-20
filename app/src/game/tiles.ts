import { C } from '../theme';

/**
 * ASCII 한 글자 = 타일 1개.
 * 맵은 문자열 배열로 작성하므로 에디터에서 그대로 눈으로 읽고 수정할 수 있다.
 */
export type TileChar =
  | '#' // 벽
  | '.' // 바닥
  | ',' // 카펫
  | '=' // 책상 / 테이블
  | 'c' // 의자 (앉기 트리거)
  | 'B' // 책장
  | 'D' // 출입문
  | '~' // 창문
  | '|' // 지하철 손잡이 기둥
  | 'P'; // 화분

export interface TileSpec {
  /** 통과 불가 여부 (Tile Collision) */
  solid: boolean;
  /** 의자 타일 — 올라서면 Sit 모션으로 전환 */
  seat?: boolean;
  fill: string;
  /** 타일 위에 얹는 장식 레이어 */
  decor?: 'desk' | 'chair' | 'shelf' | 'window' | 'pole' | 'plant' | 'door';
}

export const TILES: Record<TileChar, TileSpec> = {
  '#': { solid: true, fill: '#2b2438' },
  '.': { solid: false, fill: '#3d3550' },
  ',': { solid: false, fill: '#4a3a52' },
  '=': { solid: true, fill: '#3d3550', decor: 'desk' },
  c: { solid: false, seat: true, fill: '#3d3550', decor: 'chair' },
  B: { solid: true, fill: '#3d3550', decor: 'shelf' },
  D: { solid: false, fill: '#57496e', decor: 'door' },
  '~': { solid: true, fill: '#2b2438', decor: 'window' },
  '|': { solid: true, fill: '#3d3550', decor: 'pole' },
  P: { solid: true, fill: '#3d3550', decor: 'plant' },
};

/** 장식 레이어의 색 — MapCanvas 가 그대로 View 스타일로 사용한다 */
export const DECOR_COLORS: Record<NonNullable<TileSpec['decor']>, string[]> = {
  desk: ['#8a5a3c', '#6b432c'],
  chair: ['#5c4a7a', '#463864'],
  shelf: ['#7a4f34', '#c99b6a'],
  window: ['#20304f', '#4d7cb8'],
  pole: ['#9aa4c4', '#6e7796'],
  plant: ['#3f7a4a', '#7fc98a'],
  door: [C.gold, '#b88f39'],
};
