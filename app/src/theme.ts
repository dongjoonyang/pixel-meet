/** 픽셀 UI 팔레트 — 8bit 느낌의 낮은 채도 + 또렷한 대비 */
export const C = {
  bg: '#12101c',
  panel: '#1e1b2e',
  panelAlt: '#2a2640',
  border: '#0a0812',
  line: '#4a4370',
  text: '#f2eefb',
  textDim: '#9a92bd',
  accent: '#ff5f8d',
  accentDark: '#c23a66',
  mint: '#5fe3b3',
  gold: '#ffd166',
  blue: '#6cb8ff',
  danger: '#ff6b6b',
  shadow: 'rgba(0,0,0,0.45)',
} as const;

/** 픽셀 UI는 곡률을 쓰지 않는다. 테두리는 항상 2px 단색. */
export const pixelBorder = {
  borderWidth: 2,
  borderColor: C.border,
  borderRadius: 0,
} as const;

export const FONT_MONO = 'Courier' as const;
