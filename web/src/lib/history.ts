import type { ProblemEntry } from "../types";

// 프로토타입: 히스토리는 이 브라우저에만 저장한다 (로그인·DB 연결 전)
const KEY = "dollyeobom.history.v1";
const MAX = 20;

export function loadHistory(): ProblemEntry[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]") as ProblemEntry[];
  } catch {
    return [];
  }
}

export function saveHistory(entries: ProblemEntry[]) {
  // 용량이 넘치면 오래된 것부터 버린다
  for (let n = Math.min(entries.length, MAX); n >= 0; n--) {
    try {
      localStorage.setItem(KEY, JSON.stringify(entries.slice(0, n)));
      return;
    } catch {
      /* 다음 반복에서 더 적게 저장 */
    }
  }
}
