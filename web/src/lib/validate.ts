import type { Problem } from "../types";
import { floatingCells } from "./blocks";
import { analyzeNet } from "./cubeNet";

const COUNT_TAGS = new Set(["E2-BLOCK-COUNT", "E6-SPACE-VIEWS-TO-COUNT", "E6-CUBOID-VOLUME", "E6-SPACE-TOPNUM", "E6-SPACE-LAYERS"]);

export const normalizeAnswer = (s: string) =>
  s.replace(/\s+/g, "").replace(/(개|cm³|cm3|면)$/u, "").replace(/^면/u, "").toLowerCase();

/** AI가 만든 장면과 정답이 서로 맞는지 확인한다. 맞지 않으면 사용자에게 확인을 요청한다. */
export function checkProblem(p: Problem): string[] {
  const warnings: string[] = [];
  const s = p.scene;
  if (s.type === "blocks") {
    if (!s.cells.length) warnings.push("쌓기나무를 하나도 읽지 못했어요.");
    if (floatingCells(s.cells).length) warnings.push("공중에 떠 있는 쌓기나무가 있어요. 그림을 잘못 읽었을 수 있어요.");
    const n = Number(normalizeAnswer(p.answer.value));
    if (COUNT_TAGS.has(p.tag_id) && Number.isFinite(n) && n !== s.cells.length)
      warnings.push(`3D로 그린 쌓기나무는 ${s.cells.length}개인데 정답은 ${n}개예요. 둘 중 하나가 틀렸을 수 있어요.`);
  }
  if (s.type === "net") {
    const r = analyzeNet(s.faces, s.base_face);
    if (p.tag_id === "E5-CUBOID-NET-MATCH" && r.valid) {
      const asked = p.question.match(/면\s*([^\s와과]+)\s*[와과]\s*마주/u)?.[1];
      const ans = normalizeAnswer(p.answer.value);
      if (asked && !r.opposite.some((pair) => pair.includes(asked) && pair.includes(ans)))
        warnings.push(`접어 보면 면 ${asked}와 마주 보는 면이 정답(${p.answer.value})과 달라요.`);
    }
    if (p.tag_id === "E5-CUBOID-NET-MATCH" && !r.valid) warnings.push(`그린 전개도를 접으면 정육면체가 되지 않아요 (${r.reason}).`);
  }
  if (p.confidence < 0.6) warnings.push("AI가 문제를 확실하게 읽지 못했어요.");
  return warnings;
}
