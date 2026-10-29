import type { Problem } from "../types";

// 프로토타입 서버 (Supabase 프로젝트 oneteam-vote). 둘 다 공개용 값이라 코드에 둬도 된다.
// 다른 프로젝트를 쓰려면 web/.env의 VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY로 바꾼다.
const DEFAULT_URL = "https://gxyckkinlygeasruapmj.supabase.co";
const DEFAULT_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd4eWNra2lubHlnZWFzcnVhcG1qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAxMzcwNzQsImV4cCI6MjEwNTcxMzA3NH0.8YYHtKltWy4cER_YLM5Wbn5lol1-ExvVo8iMt2QWRR0";

// .env를 복사할 때 끼어든 공백·줄바꿈·따옴표를 제거하고, 형식이 이상하면 기본값을 쓴다
const clean = (v: unknown) => String(v ?? "").replace(/[\s"']/g, "");
const envUrl = clean(import.meta.env.VITE_SUPABASE_URL).replace(/\/+$/, "");
const envKey = clean(import.meta.env.VITE_SUPABASE_ANON_KEY);
const URL_ = /^https:\/\/[a-z0-9]{20}\.supabase\.co$/.test(envUrl) ? envUrl : DEFAULT_URL;
const KEY = /^(eyJ[\w-]+\.[\w-]+\.[\w-]+|sb_publishable_\w+)$/.test(envKey) ? envKey : DEFAULT_KEY;

export const serverConfigured = true;

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
  let res: Response;
  try {
    res = await fetch(`${URL_}/functions/v1/analyze-problem`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${KEY}`, apikey: KEY },
      body: JSON.stringify({ image: imageDataUrl.split(",")[1], media_type: "image/jpeg", hint }),
    });
  } catch (e) {
    console.error(e);
    throw new Error(`서버(${new URL(URL_).host})에 연결하지 못했어요. 인터넷 연결을 확인해 주세요. (${(e as Error).message})`);
  }
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error ?? `서버 오류 (${res.status})`);
  return body.problem as Problem;
}
