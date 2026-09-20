import React, { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { C } from '../theme';
import type { ChatMessage, ChatSession, Player, Profile } from '../types';
import { Avatar } from './Avatar';

interface Props {
  session: ChatSession;
  partner?: Player;
  me: Profile;
  messages: ChatMessage[];
  onSend: (text: string) => void;
  onLeave: () => void;
}

const ORIGIN_LABEL: Record<ChatSession['origin'], string> = {
  SEAT: '같은 자리',
  PROXIMITY: '근처에서',
  REQUEST: '대화 신청',
};

/** 1:1 프라이빗 픽셀 대화창. 열려 있는 동안 내 상태는 BUSY로 잠긴다. */
export function ChatPanel({ session, partner, me, messages, onSend, onLeave }: Props) {
  const [text, setText] = useState('');
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    const t = setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
    return () => clearTimeout(t);
  }, [messages.length]);

  const send = () => {
    const t = text.trim();
    if (!t) return;
    onSend(t);
    setText('');
  };

  return (
    // 키보드 대응은 RoomScreen 최상단의 KeyboardAvoidingView 하나가 화면 전체를 맡는다.
    // 여기서 또 감싸면 이중으로 밀려서 입력창이 오히려 더 어긋난다.
    <View style={styles.wrap}>
      <View style={styles.header}>
        <View style={styles.avatarBox}>
          {partner ? <Avatar look={partner.profile.look} dir="down" /> : null}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.nick}>{partner?.profile.nick ?? '알 수 없음'}</Text>
          <Text style={styles.sub}>
            {session.zoneLabel ? `${session.zoneLabel} · ` : ''}
            {ORIGIN_LABEL[session.origin]}
          </Text>
        </View>
        <Pressable onPress={onLeave} style={styles.leave}>
          <Text style={styles.leaveText}>나가기</Text>
        </Pressable>
      </View>

      <ScrollView ref={scrollRef} style={styles.list} contentContainerStyle={styles.listInner}>
        <Text style={styles.notice}>
          🔒 이 대화는 두 사람에게만 보여요. 주변 사람에게는 '💬 대화 중'으로만 표시됩니다.
        </Text>
        {messages.map((m) => {
          const mine = m.from === me.id;
          return (
            <View key={m.id} style={[styles.row, mine ? styles.rowMine : styles.rowTheirs]}>
              <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleTheirs]}>
                <Text style={[styles.msg, mine && { color: '#1a1420' }]}>{m.text}</Text>
              </View>
            </View>
          );
        })}
      </ScrollView>

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={text}
          onChangeText={setText}
          placeholder="메시지 입력…"
          placeholderTextColor={C.textDim}
          onSubmitEditing={send}
          returnKeyType="send"
          blurOnSubmit={false}
          maxLength={200}
        />
        <Pressable onPress={send} style={styles.send}>
          <Text style={styles.sendText}>전송</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: C.panel,
    borderTopWidth: 3,
    borderColor: C.border,
    maxHeight: 340,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 10,
    borderBottomWidth: 2,
    borderColor: C.border,
    backgroundColor: C.panelAlt,
  },
  avatarBox: { width: 30, height: 36, alignItems: 'center', justifyContent: 'flex-end' },
  nick: { color: C.text, fontSize: 15, fontWeight: '800' },
  sub: { color: C.textDim, fontSize: 11, marginTop: 1 },
  leave: { borderWidth: 2, borderColor: C.danger, paddingHorizontal: 8, paddingVertical: 4 },
  leaveText: { color: C.danger, fontSize: 11, fontWeight: '800' },
  list: { maxHeight: 210 },
  listInner: { padding: 10, gap: 8 },
  notice: { color: C.textDim, fontSize: 10, textAlign: 'center', marginBottom: 4 },
  row: { flexDirection: 'row' },
  rowMine: { justifyContent: 'flex-end' },
  rowTheirs: { justifyContent: 'flex-start' },
  bubble: {
    maxWidth: '78%',
    borderWidth: 2,
    borderColor: C.border,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  bubbleMine: { backgroundColor: C.accent },
  bubbleTheirs: { backgroundColor: C.panelAlt },
  msg: { color: C.text, fontSize: 13, lineHeight: 18 },
  inputRow: {
    flexDirection: 'row',
    gap: 8,
    padding: 10,
    borderTopWidth: 2,
    borderColor: C.border,
  },
  input: {
    flex: 1,
    backgroundColor: C.bg,
    borderWidth: 2,
    borderColor: C.line,
    color: C.text,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
  },
  send: {
    backgroundColor: C.mint,
    borderWidth: 2,
    borderColor: C.border,
    paddingHorizontal: 14,
    justifyContent: 'center',
  },
  sendText: { color: '#0f2a22', fontWeight: '900', fontSize: 13 },
});
