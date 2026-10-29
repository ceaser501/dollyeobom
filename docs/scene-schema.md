# 장면 JSON 형식 (v0.1 초안)

> **프로토타입(v0.2) 구현 현황** — `web/src/types.ts`가 기준이다.
> - 3D로 그리는 타입은 `blocks`(쌓기나무)와 `net`(정육면체 전개도) 두 가지. 나머지는 `unsupported`로 받아 글 해설만 보여준다.
> - `net`은 `faces: [{id, col, row}]` + `base_face`로 단순화했다 (아래 v0.1의 `cell`/`labels`/`valid` 대신). 전개도가 맞는지와 마주 보는 면은 화면이 직접 접어서 계산한다.
> - 해설 단계는 `highlight_cells`(blocks), `highlight_faces`(net), `fold`(0~1) 필드를 쓴다.
> - AI 출력은 `supabase/functions/analyze-problem/prompt.ts`의 JSON 스키마로 강제된다.

비전 LLM이 문제 사진을 읽고 출력하는 형식이다. 렌더러는 이 JSON만 보고 3D를 그린다.
AI는 3D 모델을 직접 만들지 않고, **미리 정의된 장면 타입과 치수만 채운다.**

## 최상위 구조

```jsonc
{
  "version": "0.1",
  "tag_id": "E6-SPACE-VIEWS-TO-COUNT",      // data/curriculum-tags.csv 의 tag_id 중 하나
  "source": {                               // 선택
    "book": "OO수학 6-2",                    // 교재명 (보이면)
    "page": 42,
    "problem_no": "3"
  },
  "understanding": "위, 앞, 옆에서 본 모양을 보고 쌓기나무 개수를 구하는 문제예요.",  // 사용자 확인용 한 줄
  "question": "쌓기나무는 모두 몇 개인가요?",
  "choices": null,                          // 객관식이면 ["3개", "4개", ...]
  "scene": { "type": "blocks", "...": "..." },
  "answer": { "value": 4, "text": "4개" },
  "explanation": [ /* 단계별 해설, 아래 참고 */ ],
  "confidence": 0.86,                       // 0~1, 낮으면 사용자 확인을 더 강하게 요청
  "unclear": []                             // 읽기 어려웠던 부분 (예: "오른쪽 아래 그림이 잘림")
}
```

## 장면 타입

모든 길이 단위는 문제에 적힌 단위(cm 등)를 그대로 쓰고, `unit` 필드에 적는다.
치수가 문제에 없으면 비율만 맞춘 값을 넣고 `"dimensions_given": false`로 표시한다.

### 1. `blocks` — 쌓기나무, 단위 정육면체

```json
{
  "type": "blocks",
  "cells": [[0,0,0], [1,0,0], [0,1,0], [0,0,1]],
  "axes": "x=오른쪽, y=뒤쪽, z=위",
  "front": "-y"
}
```

- `cells`: 쌓기나무 하나의 [x, y, z] 정수 좌표. `z=0`이 1층.
- 위·앞·옆 모양만 주어지고 정답이 여러 개일 수 있으면 `cells`는 가능한 배치 하나로 하고, 해설에서 그 점을 언급한다.
- 렌더러 기능: 위/앞/옆 시점 버튼, 층별 보기, 개수 세기 하이라이트.

### 2. `solid` — 단일 입체

```json
{
  "type": "solid",
  "shape": "prism",
  "base": { "polygon": "triangle", "sides": [3, 4, 5] },
  "height": 6,
  "unit": "cm",
  "show_hidden_edges": true
}
```

| shape | 필수 값 |
|---|---|
| `cuboid` | `width`, `depth`, `height` (정육면체면 모두 같음) |
| `prism` | `base` (`polygon`, `sides` 또는 `regular_n` + `side`), `height` |
| `pyramid` | `base`, `height` |
| `cylinder` | `radius`, `height` |
| `cone` | `radius`, `height` |
| `sphere` | `radius` |

### 3. `solids` — 여러 입체 (모양 분류 등)

```json
{
  "type": "solids",
  "items": [
    { "id": "가", "shape": "cuboid", "width": 2, "depth": 1, "height": 1, "label": "상자" },
    { "id": "나", "shape": "cylinder", "radius": 0.5, "height": 2, "label": "음료수 캔" },
    { "id": "다", "shape": "sphere", "radius": 0.7, "label": "공" }
  ]
}
```

### 4. `net` — 전개도

```json
{
  "type": "net",
  "solid": "cube",
  "faces": [
    { "id": "A", "cell": [1, 0] },
    { "id": "B", "cell": [0, 1] },
    { "id": "C", "cell": [1, 1] },
    { "id": "D", "cell": [2, 1] },
    { "id": "E", "cell": [3, 1] },
    { "id": "F", "cell": [1, 2] }
  ],
  "base_face": "C",
  "labels": { "A": "가", "F": "바" },
  "vertex_labels": {},
  "valid": true
}
```

- 정육면체/직육면체 전개도는 격자 칸(`cell`)으로 면 배치를 표현한다. 직육면체는 각 면의 `w`, `h`를 함께 적는다.
- 각기둥·원기둥 전개도는 `solid`에 해당 입체 정의를 넣고 `"layout": "standard"`로 둔다 (렌더러가 표준 전개도를 그림).
- `valid`: 접었을 때 입체가 되는지. 렌더러가 접기 시뮬레이션으로 **AI의 판단을 검산**할 수 있다.
- 렌더러 기능: 펼침 ↔ 접힘 슬라이더, 마주 보는 면 같은 색 표시, 만나는 점·선분 강조.

### 5. `revolution` — 돌려 만든 입체

```json
{
  "type": "revolution",
  "profile": [[0,0], [3,0], [0,4]],
  "axis": "y",
  "unit": "cm",
  "result": "cone"
}
```

- `profile`: 회전축을 한 변으로 하는 평면도형 꼭짓점.
- 렌더러 기능: 평면도형이 축을 따라 도는 애니메이션 → 완성된 입체.

## 단계별 해설

각 단계는 3D 화면 동작과 연결된다.

```json
"explanation": [
  {
    "text": "먼저 위에서 본 모양을 보면 1층에 쌓기나무가 3개 있어요.",
    "camera": "top",
    "highlight": [[0,0,0], [1,0,0], [0,1,0]]
  },
  {
    "text": "앞에서 본 모양에서 왼쪽 줄만 2층이니, 2층에는 1개가 있어요.",
    "camera": "front",
    "highlight": [[0,0,1]]
  },
  {
    "text": "그래서 모두 3 + 1 = 4개예요.",
    "camera": "iso"
  }
]
```

| 필드 | 의미 |
|---|---|
| `text` | 초등학생 눈높이 문장 (학년에 맞춤) |
| `camera` | `top` / `front` / `side` / `iso` / `free` |
| `highlight` | `blocks`면 좌표, `net`·`solid`면 면·모서리·꼭짓점 id |
| `animation` | `fold` / `unfold` / `rotate` / `layer` 등 (선택) |

## 검증 규칙 (서버에서)

- `tag_id`가 태그 목록에 있는지
- `scene.type`이 해당 태그의 `scene_types`에 포함되는지
- `blocks`: 좌표 중복 없음, 공중에 뜬 블록 없음 (z>0이면 아래 칸이 있어야 함)
- `net`: 접기 시뮬레이션 결과와 `valid` 일치 여부
- 계산 문제: 장면 데이터로 다시 계산한 값(개수, 부피, 겉넓이)과 `answer`가 일치하는지 → 불일치하면 사용자 확인 요청
