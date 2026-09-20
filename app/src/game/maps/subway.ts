import type { GameMap, SeatZone } from './types';

/** 벤치마다 칸 주제가 지정된다 — 같은 벤치에 앉으면 그 주제로 대화가 열린다 */
const THEMES = [
  '20대 취미방',
  '퇴근길 소주 한 잔',
  '주말 등산 크루',
  '심야 음악 취향',
  '맛집 원정대',
  '자취 요리 클럽',
  '러닝 크루 모집',
  '영화 취향 토크',
  '반려동물 자랑',
  '개발자 푸념방',
  '여행 계획 중',
  '고양이 vs 강아지',
];

const BENCH_COLS = [2, 6, 10, 14, 18, 22];
const BENCH_ROWS = [2, 10];

const zones: SeatZone[] = [];
BENCH_ROWS.forEach((row, ri) => {
  BENCH_COLS.forEach((col, ci) => {
    const n = ri * BENCH_COLS.length + ci;
    zones.push({
      id: `bench-${n + 1}`,
      label: THEMES[n],
      seats: [
        { x: col, y: row },
        { x: col + 1, y: row },
      ],
      capacity: 2,
    });
  });
});

export const SUBWAY: GameMap = {
  id: 'subway',
  name: '지하철',
  subtitle: '동적인 랜덤 매칭',
  emoji: '🚇',
  rule: '칸마다 주제가 달라요. 마음에 드는 벤치에 나란히 앉으면 대화가 열립니다.',
  ambient: '#101822',
  spawn: { x: 13, y: 6 },
  rows: [
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
  ],
  zones,
};
