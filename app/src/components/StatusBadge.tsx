import React, { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { C } from '../theme';
import type { AfkMotion, UserState } from '../types';

const AFK_LABEL: Record<AfkMotion, string> = {
  FORTUNE: '📖 사주 보는 중',
  MUSIC: '🎧 음악 듣는 중',
  READING: '📚 열람 중',
};

export function badgeFor(state: UserState, afk?: AfkMotion): { text: string; color: string } | null {
  switch (state) {
    case 'IDLE':
      return { text: '🟢 대화 가능', color: C.mint };
    case 'BUSY':
      return { text: '💬 대화 중', color: C.accent };
    case 'AFK':
      return { text: AFK_LABEL[afk ?? 'READING'], color: C.textDim };
    case 'WALK':
    default:
      return null;
  }
}

/** 캐릭터 머리 위 픽셀 말풍선 — 한 눈에 접근 가능 여부를 읽게 하는 핵심 UI */
function StatusBadgeBase({ state, afk }: { state: UserState; afk?: AfkMotion }) {
  const badge = badgeFor(state, afk);
  if (!badge) return null;
  return (
    <View style={styles.wrap} pointerEvents="none">
      <View style={[styles.bubble, { borderColor: badge.color }]}>
        <Text style={[styles.text, { color: badge.color }]} numberOfLines={1}>
          {badge.text}
        </Text>
      </View>
      <View style={[styles.tail, { borderTopColor: badge.color }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center' },
  bubble: {
    backgroundColor: '#15121f',
    borderWidth: 2,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  text: { fontSize: 9, fontWeight: '700' },
  tail: {
    width: 0,
    height: 0,
    borderLeftWidth: 3,
    borderRightWidth: 3,
    borderTopWidth: 4,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
});

export const StatusBadge = memo(StatusBadgeBase);
