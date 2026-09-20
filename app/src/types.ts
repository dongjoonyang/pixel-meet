/** 유저 상태 머신: IDLE(대기) / WALK(이동) / BUSY(대화중) / AFK(자리비움) */
export type UserState = 'IDLE' | 'WALK' | 'BUSY' | 'AFK';

/** AFK일 때 머리 위에 띄우는 세부 모션 */
export type AfkMotion = 'FORTUNE' | 'MUSIC' | 'READING';

export type Dir = 'up' | 'down' | 'left' | 'right';

export type Gender = 'M' | 'F' | 'X';

export interface Look {
  /** 헤어 컬러 */
  hair: string;
  /** 상의 컬러 */
  top: string;
  /** 하의 컬러 */
  bottom: string;
  /** 피부 컬러 */
  skin: string;
}

export interface Profile {
  id: string;
  nick: string;
  age: number;
  gender: Gender;
  /** MBTI 등 한 줄 성향 */
  tagline: string;
  interests: string[];
  look: Look;
}

/** 서버/목이 브로드캐스트하는 플레이어 1명의 실시간 스냅샷 */
export interface Player {
  profile: Profile;
  /** 월드 픽셀 좌표 (캐릭터 발밑 중앙) */
  x: number;
  y: number;
  dir: Dir;
  state: UserState;
  afkMotion?: AfkMotion;
  /** 앉아 있는 좌석 zone id (없으면 서 있음) */
  seatId?: string;
  /** 현재 참여 중인 대화 세션 id */
  sessionId?: string;
}

export interface ChatMessage {
  id: string;
  sessionId: string;
  from: string;
  text: string;
  at: number;
}

/** 1:1 프라이빗 대화 세션 */
export interface ChatSession {
  id: string;
  members: [string, string];
  /** 근접/좌석 트리거로 자동 생성됐는지, 대화 신청으로 생성됐는지 */
  origin: 'PROXIMITY' | 'SEAT' | 'REQUEST';
  zoneLabel?: string;
  startedAt: number;
}

export interface ChatRequest {
  id: string;
  from: Profile;
  to: string;
  at: number;
}
