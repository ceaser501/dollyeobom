import type { Problem } from "../types";

const URL_ = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

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
  const res = await fetch(`${URL_}/functions/v1/analyze-problem`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${KEY}`, apikey: KEY },
    body: JSON.stringify({ image: imageDataUrl.split(",")[1], media_type: "image/jpeg", hint }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error ?? `서버 오류 (${res.status})`);
  return body.problem as Problem;
}
