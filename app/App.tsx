import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, SafeAreaView, StatusBar, StyleSheet, View } from 'react-native';
import { C } from './src/theme';
import { LobbyScreen } from './src/screens/LobbyScreen';
import { RoomScreen } from './src/screens/RoomScreen';
import type { GameMap } from './src/game/maps/types';
import { randomLook } from './src/data/people';
import { loadProfile, saveProfile } from './src/data/storage';
import { ensureSession, fetchCloudProfile, upsertCloudProfile } from './src/data/cloudProfile';
import { supabaseEnabled } from './src/data/supabase';
import type { Profile } from './src/types';

const freshProfile = (id: string): Profile => ({
  id,
  nick: '',
  age: 27,
  gender: 'X',
  tagline: '',
  interests: [],
  look: randomLook(),
});

export default function App() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [room, setRoom] = useState<GameMap | null>(null);
  const [cloudUserId, setCloudUserId] = useState<string | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 최초 실행: 로컬 캐시로 먼저 빠르게 뜨고, Supabase가 켜져 있으면 익명 로그인 후
  // 클라우드 프로필로 맞춰서 여러 기기에서도 같은 캐릭터를 쓸 수 있게 한다.
  // Supabase가 없거나 실패하면 조용히 로컬 전용 모드로 계속 동작한다.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const local = await loadProfile();

      if (supabaseEnabled) {
        const userId = await ensureSession();
        if (userId && !cancelled) {
          setCloudUserId(userId);
          const cloud = await fetchCloudProfile(userId);
          if (cancelled) return;
          if (cloud) {
            setProfile(cloud);
            saveProfile(cloud);
          } else {
            // 클라우드에 아직 없음 — 로컬에 쓰던 프로필이 있으면 그 내용을 새 계정 id로 이어받는다.
            const merged: Profile = { ...(local ?? freshProfile(userId)), id: userId };
            setProfile(merged);
            saveProfile(merged);
            upsertCloudProfile(merged);
          }
          return;
        }
      }

      if (!cancelled) setProfile(local ?? freshProfile(`local_${Math.random().toString(36).slice(2, 8)}`));
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // 로컬에는 즉시 캐시하고(오프라인 대비), 클라우드는 살짝 디바운스해서 올린다.
  const handleChange = (next: Profile) => {
    setProfile(next);
    saveProfile(next);
    if (!cloudUserId) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => upsertCloudProfile(next), 500);
  };

  if (!profile) {
    return (
      <SafeAreaView style={styles.root}>
        <StatusBar barStyle="light-content" backgroundColor={C.bg} />
        <View style={styles.loading}>
          <ActivityIndicator color={C.accent} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />
      {room ? (
        <RoomScreen map={room} me={profile} onExit={() => setRoom(null)} />
      ) : (
        <LobbyScreen
          profile={profile}
          onChange={handleChange}
          onEnter={(map) => {
            saveProfile(profile);
            if (cloudUserId) upsertCloudProfile(profile);
            setRoom(map);
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
