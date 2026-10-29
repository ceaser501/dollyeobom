// 장면 JSON 형식 (docs/scene-schema.md v0.2)
// 프로토타입은 쌓기나무(blocks)와 정육면체 전개도(net)만 3D로 그린다.

export type Cell = [number, number, number]; // [x, y, z] x=오른쪽, y=뒤쪽, z=위(층)

export type CameraPreset = "top" | "front" | "side" | "iso";

export interface BlocksScene {
  type: "blocks";
  cells: Cell[];
}

export interface NetFace {
  id: string; // 면 이름 (그림의 기호 그대로: 가, 나, ㄱ, A ...)
  col: number; // 전개도 격자 칸 (오른쪽으로 증가)
  row: number; // 전개도 격자 칸 (아래로 증가)
}

export interface NetScene {
  type: "net";
  faces: NetFace[];
  base_face: string; // 접었을 때 바닥에 놓이는 면
}

export interface UnsupportedScene {
  type: "unsupported";
  reason: string;
}

export type Scene = BlocksScene | NetScene | UnsupportedScene;

export interface ExplanationStep {
  text: string;
  camera?: CameraPreset;
  highlight_cells?: Cell[];
  highlight_faces?: string[];
  fold?: number; // 전개도 접힘 정도 0(펼침) ~ 1(완전히 접힘)
}

export interface Problem {
  version: string;
  tag_id: string;
  understanding: string;
  question: string;
  choices: string[];
  scene: Scene;
  answer: { value: string; text: string };
  explanation: ExplanationStep[];
  confidence: number;
  unclear: string[];
  source_book?: string;
}

// 화면에서 다루는 문제 한 건 (원본 사진 포함)
export interface ProblemEntry {
  id: string;
  title: string;
  createdAt: number;
  imageDataUrl?: string; // 원본 사진 (예시 문제는 없음)
  problem: Problem;
  isSample?: boolean;
}
