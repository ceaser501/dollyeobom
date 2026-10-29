import type { Problem } from "../types";

// .env를 복사할 때 끼어든 공백·줄바꿈·따옴표를 제거한다 (Safari는 이런 값으로 요청하면 "Type error"를 낸다)
const clean = (v: unknown) => String(v ?? "").replace(/[\s"']/g, "");
const URL_ = clean(import.meta.env.VITE_SUPABASE_URL).replace(/\/+$/, "") || undefined;
const KEY = clean(import.meta.env.VITE_SUPABASE_ANON_KEY) || undefined;

export const serverConfigured = Boolean(URL_ && KEY);

/** 사진을 긴 변 1568px 이하 JPEG로 줄인다 (토큰 비용과 업로드 시간 절약) */
export async function resizeImage(file: File, maxSide = 1568, quality = 0.85): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", quality);
}

export async function analyzeProblem(imageDataUrl: string, hint?: string): Promise<Problem> {
  if (!URL_ || !KEY) throw new Error("서버가 아직 연결되지 않았어요.");
  let res: Response;
  try {
    res = await fetch(`${URL_}/functions/v1/analyze-problem`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${KEY}`, apikey: KEY },
      body: JSON.stringify({ image: imageDataUrl.split(",")[1], media_type: "image/jpeg", hint }),
    });
  } catch (e) {
    console.error(e);
    throw new Error("서버에 연결하지 못했어요. 인터넷 연결과 web/.env 설정을 확인해 주세요.");
  }
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error ?? `서버 오류 (${res.status})`);
  return body.problem as Problem;
}
