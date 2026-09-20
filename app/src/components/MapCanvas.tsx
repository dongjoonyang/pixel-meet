import React, { memo, useMemo } from 'react';
import { View } from 'react-native';
import { TILE } from '../game/constants';
import { DECOR_COLORS, TILES, type TileChar, type TileSpec } from '../game/tiles';
import type { GameMap } from '../game/maps/types';

type Decor = NonNullable<TileSpec['decor']>;

/** 타일 위에 얹는 오브젝트. 전부 View 조합 — 이미지 에셋 0개. */
const DecorTile = memo(({ kind }: { kind: Decor }) => {
  const [a, b] = DECOR_COLORS[kind];
  switch (kind) {
    case 'desk':
      return (
        <>
          <View
            style={{ position: 'absolute', left: 0, top: 6, width: TILE, height: 16, backgroundColor: a }}
          />
          <View
            style={{ position: 'absolute', left: 0, top: 22, width: TILE, height: 5, backgroundColor: b }}
          />
          <View style={{ position: 'absolute', left: 3, top: 27, width: 4, height: 5, backgroundColor: b }} />
          <View
            style={{ position: 'absolute', left: 25, top: 27, width: 4, height: 5, backgroundColor: b }}
          />
        </>
      );
    case 'chair':
      return (
        <>
          <View style={{ position: 'absolute', left: 6, top: 4, width: 20, height: 5, backgroundColor: b }} />
          <View
            style={{ position: 'absolute', left: 6, top: 12, width: 20, height: 12, backgroundColor: a }}
          />
          <View style={{ position: 'absolute', left: 7, top: 24, width: 3, height: 5, backgroundColor: b }} />
          <View
            style={{ position: 'absolute', left: 22, top: 24, width: 3, height: 5, backgroundColor: b }}
          />
        </>
      );
    case 'shelf':
      return (
        <>
          <View
            style={{ position: 'absolute', left: 0, top: 0, width: TILE, height: TILE, backgroundColor: a }}
          />
          {[3, 13, 23].map((top) => (
            <View
              key={top}
              style={{ position: 'absolute', left: 3, top, width: TILE - 6, height: 7, backgroundColor: b }}
            />
          ))}
        </>
      );
    case 'window':
      return (
        <>
          <View
            style={{ position: 'absolute', left: 0, top: 0, width: TILE, height: TILE, backgroundColor: a }}
          />
          <View
            style={{ position: 'absolute', left: 4, top: 6, width: TILE - 8, height: 18, backgroundColor: b }}
          />
        </>
      );
    case 'pole':
      return (
        <View
          style={{ position: 'absolute', left: 13, top: 0, width: 6, height: TILE, backgroundColor: a }}
        />
      );
    case 'plant':
      return (
        <>
          <View
            style={{ position: 'absolute', left: 11, top: 20, width: 10, height: 10, backgroundColor: a }}
          />
          <View
            style={{ position: 'absolute', left: 6, top: 6, width: 20, height: 14, backgroundColor: b }}
          />
        </>
      );
    case 'door':
      return (
        <>
          <View
            style={{
              position: 'absolute',
              left: 2,
              top: 2,
              width: TILE - 4,
              height: TILE - 4,
              backgroundColor: a,
            }}
          />
          <View
            style={{
              position: 'absolute',
              left: 6,
              top: 6,
              width: TILE - 12,
              height: TILE - 12,
              backgroundColor: b,
            }}
          />
        </>
      );
  }
});

interface Run {
  key: string;
  x: number;
  y: number;
  w: number;
  fill: string;
}

/**
 * 바닥 타일은 연속된 같은 종류를 가로로 합쳐서 그린다.
 * 24x18 맵이 432개 View → 60개 수준으로 줄어 RN에서도 가볍게 돈다.
 */
function buildRuns(map: GameMap): Run[] {
  const runs: Run[] = [];
  map.rows.forEach((row, y) => {
    let start = 0;
    for (let x = 1; x <= row.length; x++) {
      const prev = row[start] as TileChar;
      const cur = row[x] as TileChar | undefined;
      if (cur !== prev) {
        runs.push({
          key: `${y}-${start}`,
          x: start * TILE,
          y: y * TILE,
          w: (x - start) * TILE,
          fill: TILES[prev].fill,
        });
        start = x;
      }
    }
  });
  return runs;
}

function MapCanvasBase({ map }: { map: GameMap }) {
  const runs = useMemo(() => buildRuns(map), [map]);
  const decors = useMemo(() => {
    const out: { key: string; x: number; y: number; kind: Decor }[] = [];
    map.rows.forEach((row, y) => {
      [...row].forEach((ch, x) => {
        const d = TILES[ch as TileChar]?.decor;
        if (d) out.push({ key: `d${y}-${x}`, x: x * TILE, y: y * TILE, kind: d });
      });
    });
    return out;
  }, [map]);

  const w = map.rows[0].length * TILE;
  const h = map.rows.length * TILE;

  return (
    <View style={{ position: 'absolute', width: w, height: h, backgroundColor: map.ambient }}>
      {runs.map((r) => (
        <View
          key={r.key}
          style={{
            position: 'absolute',
            left: r.x,
            top: r.y,
            width: r.w,
            height: TILE,
            backgroundColor: r.fill,
          }}
        />
      ))}
      {decors.map((d) => (
        <View key={d.key} style={{ position: 'absolute', left: d.x, top: d.y, width: TILE, height: TILE }}>
          <DecorTile kind={d.kind} />
        </View>
      ))}
    </View>
  );
}

export const MapCanvas = memo(MapCanvasBase);
