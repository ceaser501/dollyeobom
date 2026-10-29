// data/curriculum-tags.csv → 웹과 Edge Function에서 쓰는 태그 모듈 생성
// 사용법: node scripts/gen-tags.mjs
import { readFileSync, writeFileSync } from "node:fs";

const csv = readFileSync(new URL("../data/curriculum-tags.csv", import.meta.url), "utf8").trim();
const [header, ...rows] = csv.split("\n");
const keys = header.split(",");
const tags = rows.map((line) => {
  const cols = line.split(",");
  const row = Object.fromEntries(keys.map((k, i) => [k, cols[i]]));
  return {
    id: row.tag_id,
    grade: Number(row.grade),
    unit: row.unit,
    problemType: row.problem_type,
    display: row.display_tag,
    sceneTypes: row.scene_types.split("|"),
  };
});

const body = `// 자동 생성 파일 — 직접 수정하지 말고 data/curriculum-tags.csv 수정 후 node scripts/gen-tags.mjs 실행
export const TAGS = [
${tags.map((t) => `  ${JSON.stringify(t)},`).join("\n")}
] as const;
`;
for (const out of ["../web/src/data/tags.ts", "../supabase/functions/analyze-problem/tags.ts"]) {
  writeFileSync(new URL(out, import.meta.url), body);
}
console.log(`${tags.length} tags written`);
