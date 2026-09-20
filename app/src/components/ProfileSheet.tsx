import React, { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { C } from '../theme';
import { compatibility, GIFTS } from '../data/people';
import type { Player, Profile } from '../types';
import { Avatar } from './Avatar';
import { badgeFor } from './StatusBadge';
import { Panel, PixelButton, Tag } from './Pixel';

const GENDER_LABEL = { M: '남', F: '여', X: '비공개' } as const;

interface Props {
  target: Player | null;
  me: Profile;
  onClose: () => void;
  onRequest: (id: string) => void;
  onGift: (id: string, giftName: string) => void;
}

/** 상대 캐릭터를 터치하면 뜨는 픽셀 프로필 팝업 */
export function ProfileSheet({ target, me, onClose, onRequest, onGift }: Props) {
  const [showMatch, setShowMatch] = useState(false);
  const [showGifts, setShowGifts] = useState(false);

  const close = () => {
    setShowMatch(false);
    setShowGifts(false);
    onClose();
  };

  if (!target) return null;
  const p = target.profile;
  const badge = badgeFor(target.state, target.afkMotion);
  const busy = target.state === 'BUSY';
  const match = compatibility(me, p);

  return (
    <Modal transparent visible animationType="fade" onRequestClose={close}>
      <Pressable style={styles.backdrop} onPress={close}>
        <Pressable onPress={() => {}} style={styles.center}>
          <Panel style={styles.card}>
            <View style={styles.head}>
              <View style={styles.avatarBox}>
                <Avatar look={p.look} dir="down" sitting={!!target.seatId} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.nick}>{p.nick}</Text>
                <Text style={styles.meta}>
                  {p.age}세 · {GENDER_LABEL[p.gender]}
                </Text>
                {badge ? <Text style={[styles.badge, { color: badge.color }]}>{badge.text}</Text> : null}
              </View>
            </View>

            <Text style={styles.tagline}>{p.tagline}</Text>

            <View style={styles.tags}>
              {p.interests.map((i) => (
                <Tag key={i} text={`#${i}`} />
              ))}
            </View>

            {busy ? (
              <View style={styles.busyBox}>
                <Text style={styles.busyText}>현재 대화 중입니다.</Text>
                <Text style={styles.busySub}>신청을 보내면 대화가 끝난 뒤 전달돼요.</Text>
              </View>
            ) : null}

            {showMatch ? (
              <View style={styles.matchBox}>
                <View style={styles.matchRow}>
                  <Text style={styles.matchLabel}>궁합</Text>
                  <Text style={styles.matchScore}>{match.score}%</Text>
                </View>
                <View style={styles.bar}>
                  <View style={[styles.barFill, { width: `${match.score}%` }]} />
                </View>
                <Text style={styles.matchReason}>{match.reason}</Text>
              </View>
            ) : null}

            {showGifts ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.giftRow}>
                {GIFTS.map((g) => (
                  <Pressable
                    key={g.id}
                    style={styles.gift}
                    onPress={() => {
                      onGift(p.id, g.name);
                      setShowGifts(false);
                    }}
                  >
                    <Text style={styles.giftEmoji}>{g.emoji}</Text>
                    <Text style={styles.giftName}>{g.name}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            ) : null}

            <View style={styles.actions}>
              <PixelButton
                label={busy ? '대화 신청 보내기' : '대화 신청'}
                onPress={() => {
                  onRequest(p.id);
                  close();
                }}
                style={{ flex: 1 }}
              />
              <PixelButton
                label="궁합 보기"
                tone="mint"
                onPress={() => setShowMatch((v) => !v)}
                style={{ flex: 1 }}
              />
              <PixelButton
                label="선물하기"
                tone="ghost"
                onPress={() => setShowGifts((v) => !v)}
                style={{ flex: 1 }}
              />
            </View>

            <Pressable onPress={close} style={styles.closeHit}>
              <Text style={styles.closeText}>닫기</Text>
            </Pressable>
          </Panel>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(8,6,14,0.72)' },
  center: { flex: 1, justifyContent: 'center', paddingHorizontal: 18 },
  card: { gap: 10 },
  head: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  avatarBox: {
    width: 52,
    height: 52,
    backgroundColor: C.panelAlt,
    borderWidth: 2,
    borderColor: C.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nick: { color: C.text, fontSize: 18, fontWeight: '800' },
  meta: { color: C.textDim, fontSize: 12, marginTop: 2 },
  badge: { fontSize: 11, fontWeight: '700', marginTop: 4 },
  tagline: { color: C.text, fontSize: 13, lineHeight: 19 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  busyBox: { backgroundColor: C.panelAlt, borderWidth: 2, borderColor: C.accentDark, padding: 8 },
  busyText: { color: C.accent, fontSize: 12, fontWeight: '800' },
  busySub: { color: C.textDim, fontSize: 11, marginTop: 2 },
  matchBox: { backgroundColor: C.panelAlt, borderWidth: 2, borderColor: C.border, padding: 10, gap: 6 },
  matchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  matchLabel: { color: C.textDim, fontSize: 12, fontWeight: '700' },
  matchScore: { color: C.gold, fontSize: 20, fontWeight: '900' },
  bar: { height: 10, backgroundColor: C.bg, borderWidth: 2, borderColor: C.border },
  barFill: { height: '100%', backgroundColor: C.gold },
  matchReason: { color: C.textDim, fontSize: 11 },
  giftRow: { maxHeight: 76 },
  gift: {
    width: 74,
    padding: 6,
    marginRight: 6,
    alignItems: 'center',
    backgroundColor: C.panelAlt,
    borderWidth: 2,
    borderColor: C.line,
  },
  giftEmoji: { fontSize: 22 },
  giftName: { color: C.text, fontSize: 10, marginTop: 4, textAlign: 'center' },
  actions: { flexDirection: 'row', gap: 6, marginTop: 2 },
  closeHit: { alignSelf: 'center', paddingVertical: 6 },
  closeText: { color: C.textDim, fontSize: 12 },
});
