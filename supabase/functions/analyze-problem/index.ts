// 문제 사진 → 장면 JSON (docs/scene-schema.md v0.2)
// 필요한 비밀값: ANTHROPIC_API_KEY
// 선택 비밀값: ANTHROPIC_MODEL (기본 claude-opus-5-5), ANTHROPIC_EFFORT (기본 medium), DAILY_LIMIT (기본 50)
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import Anthropic from "npm:@anthropic-ai/sdk@1.3.0";
import { OUTPUT_SCHEMA, SYSTEM_PROMPT } from "./prompt.ts";

const MODEL = Deno.env.get("ANTHROPIC_MODEL") ?? "claude-opus-5-5";
const EFFORT = (Deno.env.get("ANTHROPIC_EFFORT") ?? "medium") as "low" | "medium" | "high";
const DAILY_LIMIT = Number(Deno.env.get("DAILY_LIMIT") ?? "50");
const MAX_IMAGE_BASE64 = 6_000_000;
const MEDIA_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
type MediaType = (typeof MEDIA_TYPES)[number];

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });

const client = new Anthropic(); // ANTHROPIC_API_KEY 환경변수를 읽는다

/** 하루 사용량 제한 (supabase/migrations/0001_analyze_usage.sql). 확인할 수 없으면 막는다. */
async function tryUse(): Promise<boolean> {
  const res = await fetch(`${Deno.env.get("SUPABASE_URL")}/rest/v1/rpc/dollyeobom_try_use_analyze`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
    },
    body: JSON.stringify({ daily_limit: DAILY_LIMIT }),
  });
  if (!res.ok) {
    console.error("usage check failed", res.status, await res.text());
    return false;
  }
  return (await res.json()) === true;
}

type Raw = {
  tag_id: string;
  understanding: string;
  question: string;
  choices: string[];
  scene: { type: string; cells: number[][]; faces: { id: string; col: number; row: number }[]; base_face: string; reason: string };
  answer: { value: string; text: string };
  explanation: { text: string; camera: string; highlight_cells: number[][]; highlight_faces: string[]; fold: number }[];
  confidence: number;
  unclear: string[];
  source_book: string;
};

const isCell = (c: number[]) => c.length === 3 && c.every(Number.isInteger);

/** 모델 출력 → 웹에서 쓰는 Problem 형식 */
function toProblem(r: Raw) {
  const s = r.scene;
  const scene =
    s.type === "blocks"
      ? { type: "blocks", cells: [...new Map(s.cells.filter(isCell).map((c) => [c.join(","), c])).values()] }
      : s.type === "net"
        ? { type: "net", faces: s.faces, base_face: s.base_face || s.faces[0]?.id || "" }
        : { type: "unsupported", reason: s.reason || "아직 3D로 그릴 수 없는 유형" };
  return {
    version: "0.2",
    tag_id: r.tag_id,
    understanding: r.understanding,
    question: r.question,
    choices: r.choices,
    scene,
    answer: r.answer,
    explanation: r.explanation.map((e) => ({
      text: e.text,
      camera: e.camera,
      ...(scene.type === "blocks" && e.highlight_cells.length ? { highlight_cells: e.highlight_cells.filter(isCell) } : {}),
      ...(scene.type === "net" ? { highlight_faces: e.highlight_faces, fold: Math.min(1, Math.max(0, e.fold)) } : {}),
    })),
    confidence: Math.min(1, Math.max(0, r.confidence)),
    unclear: r.unclear,
    ...(r.source_book ? { source_book: r.source_book } : {}),
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "POST만 지원해요." }, 405);

  let body: { image?: string; media_type?: string; hint?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: "요청 형식이 잘못됐어요." }, 400);
  }
  const mediaType = (body.media_type ?? "image/jpeg") as MediaType;
  if (!body.image || !MEDIA_TYPES.includes(mediaType)) return json({ error: "사진이 없어요." }, 400);
  if (body.image.length > MAX_IMAGE_BASE64) return json({ error: "사진이 너무 커요." }, 413);
  const hint = body.hint?.slice(0, 500);

  if (!(await tryUse())) return json({ error: "오늘 사용할 수 있는 횟수를 모두 썼어요. 내일 다시 시도해 주세요." }, 429);

  try {
    const response = await client.beta.messages.create({
      model: MODEL,
      max_tokens: 16000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: EFFORT, format: { type: "json_schema", schema: OUTPUT_SCHEMA } },
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: mediaType, data: body.image } },
            { type: "text", text: hint ? `이 문제를 읽어 주세요.\n\n고칠 점: ${hint}` : "이 문제를 읽어 주세요." },
          ],
        },
      ],
    });

    if (response.stop_reason === "refusal") return json({ error: "이 사진은 처리할 수 없어요." }, 422);
    if (response.stop_reason === "max_tokens") return json({ error: "답이 너무 길어 중간에 끊겼어요. 다시 시도해 주세요." }, 502);
    const text = response.content.find((b) => b.type === "text");
    if (!text || text.type !== "text") return json({ error: "AI 응답이 비어 있어요." }, 502);

    const problem = toProblem(JSON.parse(text.text) as Raw);
    console.log("analyzed", { model: response.model, tag: problem.tag_id, usage: response.usage });
    return json({ problem });
  } catch (e) {
    if (e instanceof Anthropic.RateLimitError) return json({ error: "요청이 많아요. 잠시 후 다시 시도해 주세요." }, 429);
    if (e instanceof Anthropic.AuthenticationError) {
      console.error("ANTHROPIC_API_KEY is missing or invalid");
      return json({ error: "서버 설정 문제로 사진을 읽지 못했어요." }, 500);
    }
    if (e instanceof Anthropic.APIError) {
      console.error("anthropic error", e.status, e.message);
      return json({ error: "AI 서버 오류로 사진을 읽지 못했어요." }, 502);
    }
    console.error(e);
    return json({ error: "사진을 읽지 못했어요." }, 500);
  }
});
