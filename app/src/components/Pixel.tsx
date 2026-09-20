import React from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { C } from '../theme';

export function Panel({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.panel, style]}>{children}</View>;
}

type Tone = 'primary' | 'ghost' | 'mint' | 'danger';

const TONE: Record<Tone, { bg: string; fg: string }> = {
  primary: { bg: C.accent, fg: '#1a1420' },
  mint: { bg: C.mint, fg: '#0f2a22' },
  ghost: { bg: C.panelAlt, fg: C.text },
  danger: { bg: C.danger, fg: '#2a1010' },
};

export function PixelButton({
  label,
  onPress,
  tone = 'primary',
  disabled,
  style,
}: {
  label: string;
  onPress: () => void;
  tone?: Tone;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const t = TONE[tone];
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.btn,
        { backgroundColor: t.bg, opacity: disabled ? 0.4 : 1 },
        // 눌리면 그림자만큼 내려앉는 8bit 버튼 느낌
        pressed && !disabled ? { transform: [{ translateY: 2 }] } : null,
        style,
      ]}
    >
      <Text style={[styles.btnText, { color: t.fg }]}>{label}</Text>
    </Pressable>
  );
}

export function Tag({ text, color = C.blue }: { text: string; color?: string }) {
  return (
    <View style={[styles.tag, { borderColor: color }]}>
      <Text style={[styles.tagText, { color }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    backgroundColor: C.panel,
    borderWidth: 3,
    borderColor: C.border,
    padding: 14,
  },
  btn: {
    borderWidth: 3,
    borderColor: C.border,
    paddingVertical: 10,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnText: { fontSize: 13, fontWeight: '800', letterSpacing: 0.5 },
  tag: {
    borderWidth: 2,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  tagText: { fontSize: 11, fontWeight: '700' },
});
