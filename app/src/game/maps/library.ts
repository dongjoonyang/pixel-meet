import type { GameMap, SeatZone } from './types';

// 독서실 책상 배치: 책상은 (col, row)에 놓이고 위/아래로 마주보는 좌석 2개가 붙는다.
const DESK_COLS = [3, 8, 13, 18];
const DESK_ROWS = [5, 10];

const zones: SeatZone[] = [];
DESK_ROWS.forEach((row, ri) => {
  DESK_COLS.forEach((col, ci) => {
    const n = ri * DESK_COLS.length + ci + 1;
    zones.push({
      id: `desk-${n}`,
      label: `${n}번 열람석`,
      seats: [
        { x: col, y: row - 1 },
        { x: col, y: row + 1 },
      ],
      capacity: 2,
    });
  });
});

export const LIBRARY: GameMap = {
  id: 'library',
  name: '도서관',
  subtitle: '내향형 · 소소한 대화',
  emoji: '📚',
  rule: '정숙 구역입니다. 같은 책상에 앉은 사람과만 대화할 수 있어요.',
  ambient: '#191426',
  spawn: { x: 11, y: 15 },
  rows: [
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
  ],
  zones,
};
