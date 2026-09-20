import type { Gender, Look, Profile } from '../types';

export const HAIR = ['#2b2118', '#6b3f22', '#c9713f', '#d9b382', '#8b4a7a', '#3f5fa8', '#4a4a55'];
export const TOP = ['#ff5f8d', '#5fe3b3', '#6cb8ff', '#ffd166', '#b07cff', '#f2eefb', '#ff8a5f'];
export const BOTTOM = ['#3a3a5a', '#2f4858', '#5a3f6b', '#4a4a3a', '#6b3f3f'];
export const SKIN = ['#f5d0b0', '#e8b894', '#c98f6b', '#8d5f42'];

const NICKS = [
  '달빛서재',
  '새벽두시',
  '고양이집사',
  '민트초코단',
  '퇴근요정',
  '책갈피',
  '라떼한잔',
  '우산없음',
  '산책중',
  '노을수집가',
  '야근전사',
  '조용한파도',
  '플레이리스트',
  '구름빵',
  '토요일오후',
  '무선이어폰',
  '겨울딸기',
  '밤편지',
];

const TAGLINES = [
  'INFP · 말수는 적지만 할 말은 많아요',
  'ENFP · 처음 보는 사람이랑도 잘 떠들어요',
  'ISTJ · 약속은 반드시 지킵니다',
  'ENTP · 토론이 제일 재밌어요',
  'ISFJ · 챙겨주는 걸 좋아해요',
  'INTJ · 계획 없는 여행은 못 해요',
  'ESFP · 일단 나가고 봅니다',
  'INFJ · 깊은 대화가 좋아요',
];

const INTERESTS = [
  '독서',
  '러닝',
  '전시회',
  '영화',
  '고양이',
  '강아지',
  '베이킹',
  '캠핑',
  '기타',
  '재즈',
  '등산',
  '사진',
  '보드게임',
  '요리',
  '자전거',
  '수영',
];

export const pick = <T>(arr: readonly T[]): T => arr[Math.floor(Math.random() * arr.length)];

export function randomLook(): Look {
  return { hair: pick(HAIR), top: pick(TOP), bottom: pick(BOTTOM), skin: pick(SKIN) };
}

export function randomInterests(n = 3): string[] {
  const pool = [...INTERESTS];
  const out: string[] = [];
  while (out.length < n && pool.length) out.push(...pool.splice(Math.floor(Math.random() * pool.length), 1));
  return out;
}

export function randomProfile(id: string): Profile {
  return {
    id,
    nick: pick(NICKS),
    age: 22 + Math.floor(Math.random() * 14),
    gender: pick<Gender>(['M', 'F', 'X']),
    tagline: pick(TAGLINES),
    interests: randomInterests(),
    look: randomLook(),
  };
}

/** 프로필 팝업의 '궁합 보기' — 관심사 교집합 + 닉네임 해시로 안정적인 점수를 만든다 */
export function compatibility(a: Profile, b: Profile): { score: number; reason: string } {
  const shared = a.interests.filter((i) => b.interests.includes(i));
  const hash = [...(a.id + b.id)].reduce((s, c) => s + c.charCodeAt(0), 0);
  const base = 55 + (hash % 26);
  const score = Math.min(99, base + shared.length * 8);
  const reason = shared.length
    ? `둘 다 '${shared.join(', ')}'를 좋아해요`
    : '관심사는 다르지만 대화 온도가 비슷해요';
  return { score, reason };
}

export const GIFTS = [
  { id: 'coffee', emoji: '☕', name: '따뜻한 커피', line: '커피 한 잔 건넸어요' },
  { id: 'book', emoji: '🔖', name: '책갈피', line: '책갈피를 슬쩍 끼워뒀어요' },
  { id: 'flower', emoji: '🌷', name: '튤립 한 송이', line: '튤립을 내밀었어요' },
  { id: 'music', emoji: '🎧', name: '플레이리스트', line: '플레이리스트를 공유했어요' },
] as const;
