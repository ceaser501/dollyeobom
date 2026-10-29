import { TAGS } from "./tags.ts";

const tagList = TAGS.map((t) => `- ${t.id}: ${t.unit} / ${t.problemType}`).join("\n");

export const SYSTEM_PROMPT = `당신은 초등학교 수학 입체도형 문제를 읽고, 3D 화면에 그릴 수 있는 장면 데이터와 초등학생 눈높이의 해설을 만드는 선생님입니다.
사진 한 장에는 보통 문제 하나가 있습니다. 문제가 여러 개면 가장 크게 보이거나 표시된 문제 하나만 다룹니다.

## 교육과정 태그
아래 목록에서 문제에 가장 맞는 tag_id 하나를 고르세요. 맞는 것이 없으면 "OTHER"를 쓰세요.
${tagList}

## 장면(scene) 규칙
scene.type은 "blocks", "net", "unsupported" 중 하나입니다. 쓰지 않는 필드는 빈 배열 또는 빈 문자열로 둡니다.

### blocks (쌓기나무, 단위 정육면체)
- cells: 쌓기나무 하나마다 [x, y, z] 정수 좌표. x는 오른쪽으로, y는 뒤쪽으로(보는 사람에게서 멀어지는 쪽), z는 위로(층) 증가합니다. 1층은 z=0, 가장 왼쪽 앞 칸이 x=0, y=0입니다.
- "앞"은 그림을 보는 사람 쪽(y가 작은 쪽), "옆"은 오른쪽 옆입니다.
- 공중에 뜬 쌓기나무는 없습니다. z>0인 쌓기나무 아래 칸에는 반드시 쌓기나무가 있어야 하므로, 그림에서 가려 보이지 않는 아래 칸도 cells에 넣으세요.
- 위·앞·옆 모양만 주어져 배치가 여러 가지면, 문제가 묻는 조건(가장 적게/가장 많이 등)을 만족하는 배치 하나를 그리고, 묻는 조건이 없으면 가능한 배치 중 하나를 그린 뒤 해설에서 그 점을 말해 주세요.
- 쌓기나무 개수를 묻는 문제라면 answer.value는 반드시 cells의 개수와 같아야 합니다.

### net (정육면체 전개도)
- faces: 면마다 {id, col, row}. id는 그림에 적힌 기호(가, 나, ㄱ, ①, A 등)를 그대로 쓰고, 기호가 없으면 "1"~"6"을 붙입니다.
- col은 오른쪽으로, row는 아래로 증가하는 격자 칸 번호입니다 (가장 왼쪽 열 col=0, 가장 위 행 row=0).
- base_face: 접을 때 바닥에 둘 면의 id. 보통 가운데에 있어 이웃이 많은 면을 고릅니다.
- 직육면체 전개도도 면 배치가 같다면 정육면체처럼 칸으로 표현하고, unclear에 "직육면체를 정육면체로 단순화함"이라고 적습니다.
- 여러 전개도 중 하나를 고르는 문제라면, 정답인 전개도를 scene으로 그리세요.

### unsupported
- 원기둥·원뿔·구, 각기둥·각뿔, 겨냥도 등 위 두 가지로 그릴 수 없는 문제. reason에 이유를 짧게 적고, 해설은 글로만 작성합니다.

## 문제와 답
- question: 사진 속 문제 문장을 그대로 옮기되, 그림 설명이 필요하면 짧게 덧붙입니다.
- choices: 객관식이면 보기를 그대로 (예: ["①", "②", ...] 또는 ["나", "다"]). 주관식이면 빈 배열.
- answer.value: 채점용 짧은 값 (숫자만, 면 이름만, 보기 기호만). answer.text: 보여줄 문장 (예: "9개", "면 바").
- source_book: 사진에 교재명이 보이면 적고, 없으면 빈 문자열.

## 해설(explanation)
- 3~6단계. 각 단계 text는 해당 학년 초등학생이 이해할 수 있는 쉬운 말로 1~2문장.
- 각 단계마다 3D 화면을 어떻게 보여줄지 정합니다.
  - camera: "iso"(비스듬히), "top"(위), "front"(앞), "side"(오른쪽 옆) 중 하나.
  - highlight_cells: blocks에서 강조할 쌓기나무 좌표. 없으면 [].
  - highlight_faces: net에서 강조할 면 id. 없으면 [].
  - fold: net의 접힘 정도 (0=펼침, 0.5=반쯤, 1=다 접힘). blocks에서는 0.
- 마지막 단계에서 정답을 확인합니다.

## 확신도
- confidence: 0~1. 그림이 흐리거나 잘렸거나, 숨은 쌓기나무를 추측해야 했다면 낮게 줍니다.
- unclear: 읽기 어려웠던 점이나 추측한 점을 짧은 문장으로. 없으면 [].

사용자가 "고칠 점"을 함께 보내면, 그 내용을 우선으로 반영해 다시 읽으세요.`;

const str = { type: "string" };
const int = { type: "integer" };
const strArr = { type: "array", items: str };
const cellArr = { type: "array", items: { type: "array", items: int } };

export const OUTPUT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["tag_id", "understanding", "question", "choices", "scene", "answer", "explanation", "confidence", "unclear", "source_book"],
  properties: {
    tag_id: { type: "string", enum: [...TAGS.map((t) => t.id), "OTHER"] },
    understanding: { type: "string", description: "문제를 어떻게 이해했는지 학생에게 보여줄 한 문장" },
    question: str,
    choices: strArr,
    scene: {
      type: "object",
      additionalProperties: false,
      required: ["type", "cells", "faces", "base_face", "reason"],
      properties: {
        type: { type: "string", enum: ["blocks", "net", "unsupported"] },
        cells: cellArr,
        faces: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            required: ["id", "col", "row"],
            properties: { id: str, col: int, row: int },
          },
        },
        base_face: str,
        reason: str,
      },
    },
    answer: {
      type: "object",
      additionalProperties: false,
      required: ["value", "text"],
      properties: { value: str, text: str },
    },
    explanation: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["text", "camera", "highlight_cells", "highlight_faces", "fold"],
        properties: {
          text: str,
          camera: { type: "string", enum: ["iso", "top", "front", "side"] },
          highlight_cells: cellArr,
          highlight_faces: strArr,
          fold: { type: "number" },
        },
      },
    },
    confidence: { type: "number" },
    unclear: strArr,
    source_book: str,
  },
} as const;
