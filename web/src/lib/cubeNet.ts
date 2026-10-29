import { Matrix4, Vector3 } from "three";
import type { NetFace } from "../types";

// 정육면체 전개도 접기.
// 각 면은 자기 좌표계에서 x∈[0,1], z∈[0,1], y=0 인 정사각형이다 (격자 col → x, row → z).
// 바닥 면에서 시작해 이웃 면을 경첩(공유 모서리) 기준으로 위(+y)로 접는다.

export type Dir = "right" | "left" | "down" | "up";

export interface FoldNode {
  face: NetFace;
  dir?: Dir; // 부모에서 이 면으로 가는 방향
  children: FoldNode[];
}

export interface Hinge {
  hinge: [number, number, number]; // 부모 좌표계에서 경첩 위치
  axis: "x" | "z";
  sign: 1 | -1; // 접는 각도 부호
  offset: [number, number, number]; // 경첩에서 자식 면 모서리까지
}

export const HINGES: Record<Dir, Hinge> = {
  right: { hinge: [1, 0, 0], axis: "z", sign: 1, offset: [0, 0, 0] },
  left: { hinge: [0, 0, 0], axis: "z", sign: -1, offset: [-1, 0, 0] },
  down: { hinge: [0, 0, 1], axis: "x", sign: -1, offset: [0, 0, 0] },
  up: { hinge: [0, 0, 0], axis: "x", sign: 1, offset: [0, 0, -1] },
};

const STEPS: [Dir, number, number][] = [
  ["right", 1, 0],
  ["left", -1, 0],
  ["down", 0, 1],
  ["up", 0, -1],
];

/** 바닥 면에서 시작하는 접기 트리. 연결되지 않은 면이 있으면 null */
export function buildFoldTree(faces: NetFace[], baseId: string): FoldNode | null {
  const base = faces.find((f) => f.id === baseId) ?? faces[0];
  if (!base) return null;
  const at = new Map(faces.map((f) => [`${f.col},${f.row}`, f]));
  const visited = new Set([base.id]);
  const root: FoldNode = { face: base, children: [] };
  const queue = [root];
  while (queue.length) {
    const node = queue.shift()!;
    for (const [dir, dc, dr] of STEPS) {
      const next = at.get(`${node.face.col + dc},${node.face.row + dr}`);
      if (!next || visited.has(next.id)) continue;
      visited.add(next.id);
      const child: FoldNode = { face: next, dir, children: [] };
      node.children.push(child);
      queue.push(child);
    }
  }
  return visited.size === faces.length ? root : null;
}

/** 접힘 정도 t(0~1)에서 각 면의 월드 변환 행렬 */
export function faceMatrices(root: FoldNode, t: number): Map<string, Matrix4> {
  const out = new Map<string, Matrix4>();
  const angle = (t * Math.PI) / 2;
  const walk = (node: FoldNode, parent: Matrix4) => {
    let m: Matrix4;
    if (!node.dir) {
      m = new Matrix4().makeTranslation(node.face.col, 0, node.face.row);
    } else {
      const h = HINGES[node.dir];
      const rot =
        h.axis === "z"
          ? new Matrix4().makeRotationZ(h.sign * angle)
          : new Matrix4().makeRotationX(h.sign * angle);
      m = parent
        .clone()
        .multiply(new Matrix4().makeTranslation(...h.hinge))
        .multiply(rot)
        .multiply(new Matrix4().makeTranslation(...h.offset));
    }
    out.set(node.face.id, m);
    node.children.forEach((c) => walk(c, m));
  };
  walk(root, new Matrix4());
  return out;
}

export interface FoldResult {
  valid: boolean;
  reason?: string;
  opposite: [string, string][];
}

/** 완전히 접었을 때 정육면체가 되는지, 마주 보는 면은 무엇인지 */
export function analyzeNet(faces: NetFace[], baseId: string): FoldResult {
  if (faces.length !== 6) return { valid: false, reason: `면이 ${faces.length}개예요 (정육면체는 6개)`, opposite: [] };
  const root = buildFoldTree(faces, baseId);
  if (!root) return { valid: false, reason: "서로 이어지지 않은 면이 있어요", opposite: [] };
  const mats = faceMatrices(root, 1);
  const centers = faces.map((f) => ({
    id: f.id,
    c: new Vector3(0.5, 0, 0.5).applyMatrix4(mats.get(f.id)!),
  }));
  const keys = new Set(centers.map(({ c }) => c.toArray().map((v) => v.toFixed(2)).join(",")));
  if (keys.size !== 6) return { valid: false, reason: "접으면 겹치는 면이 생겨요", opposite: [] };
  const opposite: [string, string][] = [];
  for (let i = 0; i < 6; i++)
    for (let j = i + 1; j < 6; j++)
      if (Math.abs(centers[i].c.distanceTo(centers[j].c) - 1) < 1e-6)
        opposite.push([centers[i].id, centers[j].id]);
  return { valid: true, opposite };
}
