import { LIBRARY } from './library';
import { SUBWAY } from './subway';
import type { GameMap } from './types';

export const MAPS: GameMap[] = [LIBRARY, SUBWAY];

export const getMap = (id: string): GameMap => MAPS.find((m) => m.id === id) ?? LIBRARY;

export * from './types';
export { LIBRARY, SUBWAY };
