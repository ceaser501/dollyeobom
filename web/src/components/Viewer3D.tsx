import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Edges, OrbitControls } from "@react-three/drei";
import { useEffect, useMemo, useRef } from "react";
import { CanvasTexture, DoubleSide, Group, Mesh, PlaneGeometry, Vector3 } from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import type { BlocksScene, CameraPreset, Cell, NetScene } from "../types";
import { center as blocksCenter } from "../lib/blocks";
import { analyzeNet, buildFoldTree, faceMatrices } from "../lib/cubeNet";
import { faceColor } from "../lib/colors";

interface Props {
  scene: BlocksScene | NetScene;
  camera: CameraPreset;
  cameraNonce: number; // 같은 시점 버튼을 다시 눌러도 이동하도록
  highlightCells?: Cell[];
  highlightFaces?: string[];
  fold: number;
  pairColors: boolean;
}

const DIRS: Record<CameraPreset, [number, number, number]> = {
  top: [0, 1, 0.0001],
  front: [0, 0, 1],
  side: [1, 0, 0],
  iso: [0.75, 0.65, 1],
};

function CameraRig({ preset, nonce, extent }: { preset: CameraPreset; nonce: number; extent: number }) {
  const { camera, controls, size } = useThree();
  const goal = useRef<Vector3 | null>(null);

  useEffect(() => {
    goal.current = new Vector3(...DIRS[preset]).normalize().multiplyScalar(20);
  }, [preset, nonce]);

  useFrame(() => {
    // 화면 크기와 물체 크기에 맞춰 부드럽게 확대/축소
    const zoom = Math.min(size.width, size.height) / (extent * 1.45);
    if (Math.abs(camera.zoom - zoom) > 0.01) {
      camera.zoom += (zoom - camera.zoom) * 0.08;
      camera.updateProjectionMatrix();
    }
    if (!goal.current) return;
    const ctl = controls as unknown as OrbitControlsImpl | null;
    camera.position.lerp(goal.current, 0.15);
    if (ctl) ctl.target.lerp(new Vector3(0, 0, 0), 0.15);
    if (camera.position.distanceTo(goal.current) < 0.01) {
      camera.position.copy(goal.current);
      goal.current = null;
    }
    camera.lookAt(0, 0, 0);
    ctl?.update();
  });
  return null;
}

const cellKey = (c: Cell) => c.join(",");

function Blocks({ scene, highlight }: { scene: BlocksScene; highlight?: Cell[] }) {
  const [cx, cy, cz] = blocksCenter(scene.cells);
  const hl = new Set((highlight ?? []).map(cellKey));
  const dim = hl.size > 0;
  return (
    <group position={[-cx, -cy, -cz]}>
      {scene.cells.map((c) => {
        const on = hl.has(cellKey(c));
        return (
          <mesh key={cellKey(c)} position={[c[0] + 0.5, c[2] + 0.5, -(c[1] + 0.5)]}>
            <boxGeometry args={[0.98, 0.98, 0.98]} />
            <meshStandardMaterial
              color={on ? "#ff7a1a" : "#f4d8a8"}
              transparent={dim && !on}
              opacity={dim && !on ? 0.3 : 1}
              depthWrite={!(dim && !on)}
            />
            <Edges color="#5b4636" />
          </mesh>
        );
      })}
    </group>
  );
}

function labelTexture(text: string, bg: string) {
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const g = c.getContext("2d")!;
  g.fillStyle = bg;
  g.fillRect(0, 0, 256, 256);
  g.fillStyle = "#2b2118";
  g.font = "bold 120px system-ui, 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif";
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillText(text, 128, 136);
  return new CanvasTexture(c);
}

function Net({ scene, fold, highlight, pairColors }: { scene: NetScene; fold: number; highlight?: string[]; pairColors: boolean }) {
  const tree = useMemo(() => buildFoldTree(scene.faces, scene.base_face), [scene]);
  const result = useMemo(() => analyzeNet(scene.faces, scene.base_face), [scene]);
  const geometry = useMemo(() => new PlaneGeometry(1, 1).rotateX(-Math.PI / 2).translate(0.5, 0, 0.5), []);
  const meshes = useRef(new Map<string, Mesh>());
  const group = useRef<Group>(null);
  const t = useRef(fold);

  const textures = useMemo(() => {
    return new Map(
      scene.faces.map((f, i) => {
        let idx = i;
        if (pairColors && result.valid) {
          const p = result.opposite.findIndex((pair) => pair.includes(f.id));
          idx = p >= 0 ? p : i;
        }
        return [f.id, labelTexture(f.id, faceColor(idx))];
      }),
    );
  }, [scene, pairColors, result]);

  const cols = scene.faces.map((f) => f.col);
  const rows = scene.faces.map((f) => f.row);
  const netCenter = new Vector3((Math.min(...cols) + Math.max(...cols) + 1) / 2, 0, (Math.min(...rows) + Math.max(...rows) + 1) / 2);
  const base = scene.faces.find((f) => f.id === scene.base_face) ?? scene.faces[0];
  const cubeCenter = new Vector3(base.col + 0.5, 0.5, base.row + 0.5);

  useFrame(() => {
    if (!tree) return;
    t.current += (fold - t.current) * 0.08;
    const mats = faceMatrices(tree, t.current);
    for (const [id, m] of mats) {
      const mesh = meshes.current.get(id);
      if (mesh) mesh.matrix.copy(m);
    }
    group.current?.position.copy(netCenter.clone().lerp(cubeCenter, t.current).negate());
  });

  if (!tree) return null;
  const dim = (highlight?.length ?? 0) > 0;
  return (
    <group ref={group}>
      {scene.faces.map((f) => {
        const on = highlight?.includes(f.id);
        return (
          <mesh
            key={f.id}
            geometry={geometry}
            matrixAutoUpdate={false}
            ref={(m) => {
              if (m) meshes.current.set(f.id, m);
              else meshes.current.delete(f.id);
            }}
          >
            <meshStandardMaterial
              map={textures.get(f.id)}
              side={DoubleSide}
              transparent
              opacity={dim && !on ? 0.35 : 0.95}
              emissive={on ? "#ff9f1c" : "#000000"}
              emissiveIntensity={on ? 0.35 : 0}
            />
            <Edges color={on ? "#d9480f" : "#5b4636"} />
          </mesh>
        );
      })}
    </group>
  );
}

export default function Viewer3D(p: Props) {
  const extent = useMemo(() => {
    if (p.scene.type === "blocks") {
      const c = p.scene.cells;
      const span = (i: 0 | 1 | 2) => Math.max(...c.map((v) => v[i])) - Math.min(...c.map((v) => v[i])) + 1;
      return Math.max(span(0), span(1), span(2)) * 1.3;
    }
    // 펼친 전개도 크기 → 접힌 정육면체 크기로
    const cols = p.scene.faces.map((f) => f.col);
    const rows = p.scene.faces.map((f) => f.row);
    const flat = Math.max(Math.max(...cols) - Math.min(...cols) + 1, Math.max(...rows) - Math.min(...rows) + 1);
    return flat + (1.8 - flat) * p.fold;
  }, [p.scene, p.fold]);

  return (
    <Canvas orthographic camera={{ position: [15, 13, 20], zoom: 60, near: -100, far: 200 }} dpr={[1, 2]}>
      <color attach="background" args={["#fffaf2"]} />
      <ambientLight intensity={1.6} />
      <directionalLight position={[5, 10, 7]} intensity={1.4} />
      <directionalLight position={[-6, 4, -5]} intensity={0.5} />
      {p.scene.type === "blocks" ? (
        <Blocks scene={p.scene} highlight={p.highlightCells} />
      ) : (
        <Net scene={p.scene} fold={p.fold} highlight={p.highlightFaces} pairColors={p.pairColors} />
      )}
      <OrbitControls makeDefault enablePan={false} />
      <CameraRig preset={p.camera} nonce={p.cameraNonce} extent={extent} />
    </Canvas>
  );
}
