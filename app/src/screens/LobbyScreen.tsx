import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { C } from '../theme';
import { MAPS } from '../game/maps';
import type { GameMap } from '../game/maps/types';
import { BOTTOM, HAIR, randomLook, SKIN, TOP } from '../data/people';
import type { Gender, Profile } from '../types';
import { Avatar } from '../components/Avatar';
import { Panel, PixelButton, Tag } from '../components/Pixel';

const INTEREST_POOL = [
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

const GENDERS: { key: Gender; label: string }[] = [
  { key: 'F', label: '여성' },
  { key: 'M', label: '남성' },
  { key: 'X', label: '비공개' },
];

interface Props {
  profile: Profile;
  onChange: (p: Profile) => void;
  onEnter: (map: GameMap) => void;
}

export function LobbyScreen({ profile, onChange, onEnter }: Props) {
  const [error, setError] = useState<string | null>(null);

  const cycle = (arr: readonly string[], cur: string) => arr[(arr.indexOf(cur) + 1) % arr.length];

  const toggleInterest = (i: string) => {
    const has = profile.interests.includes(i);
    if (!has && profile.interests.length >= 4) {
      setError('관심사는 최대 4개까지 고를 수 있어요.');
      return;
    }
    setError(null);
    onChange({
      ...profile,
      interests: has ? profile.interests.filter((x) => x !== i) : [...profile.interests, i],
    });
  };

  const enter = (map: GameMap) => {
    if (!profile.nick.trim()) {
      setError('닉네임을 먼저 정해주세요.');
      return;
    }
    if (!profile.interests.length) {
      setError('관심사를 하나 이상 골라주세요. 궁합 계산에 쓰여요.');
      return;
    }
    setError(null);
    onEnter(map);
  };

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.inner}>
      <Text style={styles.brand}>PIXEL MEET</Text>
      <Text style={styles.brandSub}>도트 공간에서 만나는 느슨한 소개팅</Text>

      <Panel style={styles.card}>
        <Text style={styles.section}>캐릭터 만들기</Text>

        <View style={styles.charRow}>
          <View style={styles.preview}>
            <Avatar look={profile.look} dir="down" />
          </View>
          <View style={styles.partCol}>
            <PartButton
              label="머리"
              color={profile.look.hair}
              onPress={() =>
                onChange({ ...profile, look: { ...profile.look, hair: cycle(HAIR, profile.look.hair) } })
              }
            />
            <PartButton
              label="상의"
              color={profile.look.top}
              onPress={() =>
                onChange({ ...profile, look: { ...profile.look, top: cycle(TOP, profile.look.top) } })
              }
            />
            <PartButton
              label="하의"
              color={profile.look.bottom}
              onPress={() =>
                onChange({
                  ...profile,
                  look: { ...profile.look, bottom: cycle(BOTTOM, profile.look.bottom) },
                })
              }
            />
            <PartButton
              label="피부"
              color={profile.look.skin}
              onPress={() =>
                onChange({ ...profile, look: { ...profile.look, skin: cycle(SKIN, profile.look.skin) } })
              }
            />
          </View>
          <PixelButton
            label="랜덤"
            tone="ghost"
            onPress={() => onChange({ ...profile, look: randomLook() })}
          />
        </View>

        <Text style={styles.label}>닉네임</Text>
        <TextInput
          style={styles.input}
          value={profile.nick}
          onChangeText={(nick) => onChange({ ...profile, nick })}
          placeholder="예: 달빛서재"
          placeholderTextColor={C.textDim}
          maxLength={10}
        />

        <View style={styles.rowGap}>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>나이</Text>
            <View style={styles.stepper}>
              <Pressable
                onPress={() => onChange({ ...profile, age: Math.max(19, profile.age - 1) })}
                style={styles.stepBtn}
              >
                <Text style={styles.stepText}>−</Text>
              </Pressable>
              <Text style={styles.stepValue}>{profile.age}</Text>
              <Pressable
                onPress={() => onChange({ ...profile, age: Math.min(60, profile.age + 1) })}
                style={styles.stepBtn}
              >
                <Text style={styles.stepText}>＋</Text>
              </Pressable>
            </View>
          </View>
          <View style={{ flex: 1.4 }}>
            <Text style={styles.label}>성별</Text>
            <View style={styles.genderRow}>
              {GENDERS.map((g) => (
                <Pressable
                  key={g.key}
                  onPress={() => onChange({ ...profile, gender: g.key })}
                  style={[styles.gender, profile.gender === g.key && styles.genderOn]}
                >
                  <Text style={[styles.genderText, profile.gender === g.key && { color: '#1a1420' }]}>
                    {g.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        </View>

        <Text style={styles.label}>한 줄 소개</Text>
        <TextInput
          style={styles.input}
          value={profile.tagline}
          onChangeText={(tagline) => onChange({ ...profile, tagline })}
          placeholder="예: INFP · 조용한 대화가 좋아요"
          placeholderTextColor={C.textDim}
          maxLength={40}
        />

        <Text style={styles.label}>관심사 (최대 4개)</Text>
        <View style={styles.tags}>
          {INTEREST_POOL.map((i) => {
            const on = profile.interests.includes(i);
            return (
              <Pressable key={i} onPress={() => toggleInterest(i)}>
                <View style={[styles.interest, on && styles.interestOn]}>
                  <Text style={[styles.interestText, on && { color: '#1a1420' }]}>#{i}</Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      </Panel>

      <Text style={styles.section2}>어디로 갈까요?</Text>
      {MAPS.map((m) => (
        <Panel key={m.id} style={styles.mapCard}>
          <View style={styles.mapHead}>
            <Text style={styles.mapEmoji}>{m.emoji}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.mapName}>{m.name}</Text>
              <Text style={styles.mapSub}>{m.subtitle}</Text>
            </View>
            <Tag text={`좌석 ${m.zones.length}`} color={C.gold} />
          </View>
          <Text style={styles.mapRule}>{m.rule}</Text>
          <PixelButton label="입장하기" onPress={() => enter(m)} />
        </Panel>
      ))}

      {error ? <Text style={styles.error}>{error}</Text> : null}
      <View style={{ height: 30 }} />
    </ScrollView>
  );
}

function PartButton({ label, color, onPress }: { label: string; color: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.part}>
      <View style={[styles.swatch, { backgroundColor: color }]} />
      <Text style={styles.partLabel}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  inner: { padding: 16, gap: 12 },
  brand: { color: C.text, fontSize: 30, fontWeight: '900', letterSpacing: 2 },
  brandSub: { color: C.textDim, fontSize: 12, marginTop: -6, marginBottom: 6 },
  card: { gap: 8 },
  section: { color: C.accent, fontSize: 14, fontWeight: '900', marginBottom: 4 },
  section2: { color: C.mint, fontSize: 14, fontWeight: '900', marginTop: 10 },
  charRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  preview: {
    width: 64,
    height: 64,
    backgroundColor: C.panelAlt,
    borderWidth: 2,
    borderColor: C.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  partCol: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  part: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 2,
    borderColor: C.line,
    padding: 4,
  },
  swatch: { width: 14, height: 14, borderWidth: 1, borderColor: C.border },
  partLabel: { color: C.text, fontSize: 11, fontWeight: '700' },
  label: { color: C.textDim, fontSize: 11, fontWeight: '700', marginTop: 6 },
  input: {
    backgroundColor: C.bg,
    borderWidth: 2,
    borderColor: C.line,
    color: C.text,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
  },
  rowGap: { flexDirection: 'row', gap: 12 },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  stepBtn: {
    width: 34,
    height: 34,
    borderWidth: 2,
    borderColor: C.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepText: { color: C.text, fontSize: 16, fontWeight: '900' },
  stepValue: { color: C.text, fontSize: 15, fontWeight: '800', minWidth: 30, textAlign: 'center' },
  genderRow: { flexDirection: 'row', gap: 6 },
  gender: { flex: 1, borderWidth: 2, borderColor: C.line, paddingVertical: 8, alignItems: 'center' },
  genderOn: { backgroundColor: C.accent, borderColor: C.border },
  genderText: { color: C.text, fontSize: 12, fontWeight: '700' },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  interest: { borderWidth: 2, borderColor: C.line, paddingHorizontal: 8, paddingVertical: 5 },
  interestOn: { backgroundColor: C.mint, borderColor: C.border },
  interestText: { color: C.text, fontSize: 11, fontWeight: '700' },
  mapCard: { gap: 10 },
  mapHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  mapEmoji: { fontSize: 30 },
  mapName: { color: C.text, fontSize: 17, fontWeight: '900' },
  mapSub: { color: C.textDim, fontSize: 11, marginTop: 2 },
  mapRule: { color: C.textDim, fontSize: 12, lineHeight: 18 },
  error: { color: C.danger, fontSize: 12, textAlign: 'center', marginTop: 6 },
});
