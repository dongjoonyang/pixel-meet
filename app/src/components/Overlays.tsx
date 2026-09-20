import React, { useEffect } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { C } from '../theme';
import type { ChatRequest } from '../types';
import { Avatar } from './Avatar';
import { Panel, PixelButton } from './Pixel';

/** 상단 시스템 토스트 — 신청 결과, 자리 안내 등 */
export function Toast({ text, onDone }: { text: string | null; onDone: () => void }) {
  useEffect(() => {
    if (!text) return;
    const t = setTimeout(onDone, 2600);
    return () => clearTimeout(t);
  }, [text, onDone]);

  if (!text) return null;
  return (
    <View style={styles.toast} pointerEvents="none">
      <Text style={styles.toastText}>{text}</Text>
    </View>
  );
}

/** 나에게 들어온 대화 신청 */
export function RequestPrompt({
  request,
  onRespond,
}: {
  request: ChatRequest | null;
  onRespond: (accept: boolean) => void;
}) {
  if (!request) return null;
  return (
    <Modal transparent visible animationType="fade" onRequestClose={() => onRespond(false)}>
      <View style={styles.backdrop}>
        <Panel style={styles.card}>
          <View style={styles.row}>
            <View style={styles.avatarBox}>
              <Avatar look={request.from.look} dir="down" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.nick}>{request.from.nick}</Text>
              <Text style={styles.sub}>{request.from.tagline}</Text>
            </View>
          </View>
          <Text style={styles.ask}>대화를 신청했어요. 수락할까요?</Text>
          <View style={styles.actions}>
            <PixelButton label="수락" onPress={() => onRespond(true)} style={{ flex: 1 }} />
            <PixelButton label="거절" tone="ghost" onPress={() => onRespond(false)} style={{ flex: 1 }} />
          </View>
        </Panel>
      </View>
    </Modal>
  );
}

/** 좌석/근접 상황을 알려주는 하단 힌트 바 */
export function HintBar({ text, action }: { text: string; action?: { label: string; onPress: () => void } }) {
  return (
    <View style={styles.hint}>
      <Text style={styles.hintText} numberOfLines={2}>
        {text}
      </Text>
      {action ? (
        <Pressable onPress={action.onPress} style={styles.hintBtn}>
          <Text style={styles.hintBtnText}>{action.label}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    top: 8,
    left: 12,
    right: 12,
    backgroundColor: 'rgba(30,27,46,0.95)',
    borderWidth: 2,
    borderColor: C.line,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  toastText: { color: C.text, fontSize: 12, textAlign: 'center' },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(8,6,14,0.72)',
    justifyContent: 'center',
    paddingHorizontal: 22,
  },
  card: { gap: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatarBox: {
    width: 44,
    height: 44,
    backgroundColor: C.panelAlt,
    borderWidth: 2,
    borderColor: C.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nick: { color: C.text, fontSize: 16, fontWeight: '800' },
  sub: { color: C.textDim, fontSize: 11, marginTop: 2 },
  ask: { color: C.text, fontSize: 13 },
  actions: { flexDirection: 'row', gap: 8 },
  hint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(30,27,46,0.92)',
    borderWidth: 2,
    borderColor: C.line,
    paddingVertical: 7,
    paddingHorizontal: 10,
  },
  hintText: { color: C.text, fontSize: 11, flex: 1 },
  hintBtn: {
    backgroundColor: C.mint,
    borderWidth: 2,
    borderColor: C.border,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  hintBtnText: { color: '#0f2a22', fontSize: 11, fontWeight: '900' },
});
