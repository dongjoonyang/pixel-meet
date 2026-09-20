/** 타일 한 칸 = 32x32px (Aseprite 타일맵 규격) */
export const TILE = 32;

/** 캐릭터 히트박스 — 타일보다 약간 작아야 문틈을 자연스럽게 통과한다 */
export const BODY_W = 18;
export const BODY_H = 14;

/** 픽셀/초 */
export const WALK_SPEED = 96;

/** 근접 대화 트리거 반경 (타일) */
export const PROXIMITY_TILES = 2;

/** 이 시간 동안 입력이 없으면 AFK 로 전환 (ms) */
export const AFK_AFTER_MS = 45_000;

/** 좌표 브로드캐스트 주기 (ms) — 서버 대역폭 절약용 스로틀 */
export const NET_TICK_MS = 100;
