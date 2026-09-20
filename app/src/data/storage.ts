import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Profile } from '../types';

const PROFILE_KEY = 'pixelmeet:profile:v1';

/**
 * 캐릭터/프로필 로컬 영속화.
 * 지금은 서버 계정이 없으므로 기기(브라우저)당 하나의 정체성을 로컬에 저장한다.
 * id는 최초 생성 시 한 번만 만들고 계속 재사용해야 서버가 "같은 사람"으로 인식한다.
 */
export async function loadProfile(): Promise<Profile | null> {
  try {
    const raw = await AsyncStorage.getItem(PROFILE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.id || !parsed?.look) return null;
    return parsed as Profile;
  } catch {
    // 프라이빗 모드 등에서 스토리지 접근이 막혀 있을 수 있다 — 조용히 폴백
    return null;
  }
}

export async function saveProfile(profile: Profile): Promise<void> {
  try {
    await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  } catch {
    // 저장 실패해도 앱 동작에는 지장 없음 (다음 실행 때 새로 만들 뿐)
  }
}

export async function clearProfile(): Promise<void> {
  try {
    await AsyncStorage.removeItem(PROFILE_KEY);
  } catch {
    /* noop */
  }
}
