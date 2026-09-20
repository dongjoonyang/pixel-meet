import React, { memo } from 'react';
import { View } from 'react-native';
import type { Dir, Look } from '../types';

export const AVATAR_W = 24;
export const AVATAR_H = 34;

interface Props {
  look: Look;
  dir: Dir;
  /** 걷는 중이면 다리 프레임이 교차한다 */
  walking?: boolean;
  frame?: 0 | 1;
  sitting?: boolean;
  dim?: boolean;
}

/**
 * 32x32 타일 위에 서는 도트 캐릭터.
 * 이미지 스프라이트 대신 View를 쌓아 만든다 — 색만 바꾸면 파츠 조합이 무한대라
 * '캐릭터 파츠 돌려막기' 플랜과 맞고, 에셋 0개로 돌아간다.
 */
function AvatarBase({ look, dir, walking, frame = 0, sitting, dim }: Props) {
  // 두 다리가 번갈아 들리면서 걷는 느낌을 만든다
  const legA = walking ? (frame === 0 ? 2 : 0) : 0;
  const legB = walking ? (frame === 0 ? 0 : 2) : 0;
  const legH = sitting ? 4 : 8;
  const bodyY = sitting ? 16 : 12;
  const eyeY = dir === 'up' ? -99 : 9;
  const eyeOffset = dir === 'left' ? -3 : dir === 'right' ? 3 : 0;

  return (
    <View style={{ width: AVATAR_W, height: AVATAR_H, opacity: dim ? 0.55 : 1 }}>
      {/* 그림자 */}
      <View
        style={{
          position: 'absolute',
          left: 3,
          top: AVATAR_H - 5,
          width: 18,
          height: 4,
          backgroundColor: 'rgba(0,0,0,0.35)',
        }}
      />
      {/* 다리 */}
      <View
        style={{
          position: 'absolute',
          left: 6,
          top: AVATAR_H - 4 - legH + legA,
          width: 5,
          height: legH,
          backgroundColor: look.bottom,
        }}
      />
      <View
        style={{
          position: 'absolute',
          left: 13,
          top: AVATAR_H - 4 - legH + legB,
          width: 5,
          height: legH,
          backgroundColor: look.bottom,
        }}
      />
      {/* 몸통 */}
      <View
        style={{
          position: 'absolute',
          left: 4,
          top: bodyY,
          width: 16,
          height: AVATAR_H - 4 - legH - bodyY + 2,
          backgroundColor: look.top,
        }}
      />
      {/* 팔 */}
      <View
        style={{
          position: 'absolute',
          left: 1,
          top: bodyY + 2,
          width: 3,
          height: 7,
          backgroundColor: look.skin,
        }}
      />
      <View
        style={{
          position: 'absolute',
          left: 20,
          top: bodyY + 2,
          width: 3,
          height: 7,
          backgroundColor: look.skin,
        }}
      />
      {/* 머리 */}
      <View
        style={{ position: 'absolute', left: 4, top: 2, width: 16, height: 13, backgroundColor: look.skin }}
      />
      {/* 머리카락 */}
      <View
        style={{ position: 'absolute', left: 3, top: 0, width: 18, height: 5, backgroundColor: look.hair }}
      />
      <View
        style={{ position: 'absolute', left: 3, top: 5, width: 3, height: 5, backgroundColor: look.hair }}
      />
      <View
        style={{ position: 'absolute', left: 18, top: 5, width: 3, height: 5, backgroundColor: look.hair }}
      />
      {/* 눈 (뒤돌아보면 숨김) */}
      <View
        style={{
          position: 'absolute',
          left: 7 + eyeOffset,
          top: eyeY,
          width: 2,
          height: 3,
          backgroundColor: '#1a1420',
        }}
      />
      <View
        style={{
          position: 'absolute',
          left: 14 + eyeOffset,
          top: eyeY,
          width: 2,
          height: 3,
          backgroundColor: '#1a1420',
        }}
      />
    </View>
  );
}

export const Avatar = memo(AvatarBase);
