import type { Cell } from "../types";

// 2D 그리드: grid[row][col], row 0이 그림의 맨 위
export type Grid = boolean[][];

const key = (c: Cell) => c.join(",");

export function dedupe(cells: Cell[]): Cell[] {
  const seen = new Set<string>();
  return cells.filter((c) => {
    const k = key(c);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

function bounds(cells: Cell[]) {
  const xs = cells.map((c) => c[0]);
  const ys = cells.map((c) => c[1]);
  const zs = cells.map((c) => c[2]);
  return {
    minX: Math.min(...xs), maxX: Math.max(...xs),
    minY: Math.min(...ys), maxY: Math.max(...ys),
    maxZ: Math.max(...zs),
  };
}

function emptyGrid(rows: number, cols: number): Grid {
  return Array.from({ length: rows }, () => Array<boolean>(cols).fill(false));
}

/** 위에서 본 모양: 가로 = x, 세로 = y (뒤쪽이 그림 위) */
export function topView(cells: Cell[]): Grid {
  if (!cells.length) return [];
  const b = bounds(cells);
  const g = emptyGrid(b.maxY - b.minY + 1, b.maxX - b.minX + 1);
  for (const [x, y] of cells) g[b.maxY - y][x - b.minX] = true;
  return g;
}

/** 위에서 본 모양에 각 칸의 쌓기나무 수를 쓴 것 */
export function topCounts(cells: Cell[]): number[][] {
  if (!cells.length) return [];
  const b = bounds(cells);
  const g = Array.from({ length: b.maxY - b.minY + 1 }, () =>
    Array<number>(b.maxX - b.minX + 1).fill(0),
  );
  for (const [x, y] of cells) g[b.maxY - y][x - b.minX] += 1;
  return g;
}

/** 앞에서 본 모양: 가로 = x, 세로 = 층 */
export function frontView(cells: Cell[]): Grid {
  if (!cells.length) return [];
  const b = bounds(cells);
  const g = emptyGrid(b.maxZ + 1, b.maxX - b.minX + 1);
  for (const [x, , z] of cells) g[b.maxZ - z][x - b.minX] = true;
  return g;
}

/** 오른쪽 옆에서 본 모양: 가로 = y (앞쪽이 그림 왼쪽), 세로 = 층 */
export function sideView(cells: Cell[]): Grid {
  if (!cells.length) return [];
  const b = bounds(cells);
  const g = emptyGrid(b.maxZ + 1, b.maxY - b.minY + 1);
  for (const [, y, z] of cells) g[b.maxZ - z][y - b.minY] = true;
  return g;
}

/** 아래 칸이 비어 공중에 뜬 쌓기나무 */
export function floatingCells(cells: Cell[]): Cell[] {
  const set = new Set(cells.map(key));
  return cells.filter(([x, y, z]) => z > 0 && !set.has(key([x, y, z - 1])));
}

export function layerCount(cells: Cell[]): number {
  return cells.length ? bounds(cells).maxZ + 1 : 0;
}

/** 3D 중심 맞추기용 (three.js 좌표: X=x, Y=z(위), Z=-y) */
export function center(cells: Cell[]): [number, number, number] {
  if (!cells.length) return [0, 0, 0];
  const b = bounds(cells);
  return [(b.minX + b.maxX + 1) / 2, (b.maxZ + 1) / 2, -(b.minY + b.maxY + 1) / 2];
}
