import React, { useMemo, useRef, useState } from 'react';
import { PanResponder, StyleSheet, View } from 'react-native';
import { C } from '../theme';

const SIZE = 116;
const KNOB = 46;
const RADIUS = (SIZE - KNOB) / 2;

interface Props {
  /** 정규화된 방향 벡터(-1~1). 손을 떼면 {0,0} */
  onChange: (v: { x: number; y: number }) => void;
}

/** 좌측 하단 가상 조이스틱. 값은 ref 콜백으로만 흘려보내 게임 루프와 렌더를 분리한다. */
export function Joystick({ onChange }: Props) {
  const [knob, setKnob] = useState({ x: 0, y: 0 });
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const pan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderMove: (_, g) => {
          const len = Math.hypot(g.dx, g.dy);
          const clamped = Math.min(len, RADIUS);
          const nx = len === 0 ? 0 : (g.dx / len) * clamped;
          const ny = len === 0 ? 0 : (g.dy / len) * clamped;
          setKnob({ x: nx, y: ny });
          // 데드존 — 살짝 스친 입력으로 캐릭터가 떨리지 않게
          const mag = clamped / RADIUS;
          if (mag < 0.18) onChangeRef.current({ x: 0, y: 0 });
          else onChangeRef.current({ x: nx / RADIUS, y: ny / RADIUS });
        },
        onPanResponderRelease: () => {
          setKnob({ x: 0, y: 0 });
          onChangeRef.current({ x: 0, y: 0 });
        },
        onPanResponderTerminate: () => {
          setKnob({ x: 0, y: 0 });
          onChangeRef.current({ x: 0, y: 0 });
        },
      }),
    [],
  );

  return (
    <View style={styles.base} {...pan.panHandlers}>
      <View style={styles.cross} />
      <View style={styles.crossV} />
      <View style={[styles.knob, { transform: [{ translateX: knob.x }, { translateY: knob.y }] }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    width: SIZE,
    height: SIZE,
    backgroundColor: 'rgba(30,27,46,0.78)',
    borderWidth: 3,
    borderColor: C.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cross: { position: 'absolute', width: SIZE - 24, height: 2, backgroundColor: C.line },
  crossV: { position: 'absolute', width: 2, height: SIZE - 24, backgroundColor: C.line },
  knob: {
    width: KNOB,
    height: KNOB,
    backgroundColor: C.accent,
    borderWidth: 3,
    borderColor: C.border,
  },
});
