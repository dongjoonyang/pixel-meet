import { supabase, supabaseEnabled } from './supabase';
import type { Profile } from '../types';

/**
 * Supabase Auth의 "익명 로그인"으로 계정을 만든다.
 * 이메일/비밀번호 화면 없이도 기기마다 안정적인 user id를 얻어서,
 * profiles 테이블의 RLS(auth.uid() = id)가 그대로 통하게 하기 위함이다.
 * 세션은 AsyncStorage에 저장돼 앱을 지우지 않는 한 재로그인 없이 유지된다.
 */
export async function ensureSession(): Promise<string | null> {
  if (!supabaseEnabled || !supabase) return null;
  try {
    const { data } = await supabase.auth.getSession();
    if (data.session?.user.id) return data.session.user.id;

    const { data: signed, error } = await supabase.auth.signInAnonymously();
    if (error) {
      console.warn('[supabase] 익명 로그인 실패, 로컬 모드로 폴백:', error.message);
      return null;
    }
    return signed.user?.id ?? null;
  } catch (e) {
    console.warn('[supabase] 세션 확인 실패, 로컬 모드로 폴백:', e);
    return null;
  }
}

interface ProfileRow {
  id: string;
  nick: string;
  age: number;
  gender: Profile['gender'];
  tagline: string;
  interests: string[];
  look: Profile['look'];
}

const fromRow = (row: ProfileRow): Profile => ({
  id: row.id,
  nick: row.nick,
  age: row.age,
  gender: row.gender,
  tagline: row.tagline,
  interests: row.interests ?? [],
  look: row.look,
});

export async function fetchCloudProfile(userId: string): Promise<Profile | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
  if (error) {
    console.warn('[supabase] 프로필 조회 실패:', error.message);
    return null;
  }
  return data ? fromRow(data as ProfileRow) : null;
}

/** id는 반드시 auth.uid() 와 같아야 RLS를 통과한다 — 호출부에서 ensureSession() 결과를 id로 넣어준다. */
export async function upsertCloudProfile(profile: Profile): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.from('profiles').upsert({
    id: profile.id,
    nick: profile.nick,
    age: profile.age,
    gender: profile.gender,
    tagline: profile.tagline,
    interests: profile.interests,
    look: profile.look,
  });
  if (error) console.warn('[supabase] 프로필 저장 실패:', error.message);
}
