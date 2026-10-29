import { useState } from "react";
import type { Problem, ProblemEntry } from "./types";
import { SAMPLES } from "./data/samples";
import { loadHistory, saveHistory } from "./lib/history";
import ProblemView from "./components/ProblemView";
import UploadFlow from "./components/UploadFlow";

export default function App() {
  const [history, setHistory] = useState<ProblemEntry[]>(loadHistory);
  const [currentId, setCurrentId] = useState(history[0]?.id ?? SAMPLES[0].id);
  const all = [...history, ...SAMPLES];
  const current = all.find((e) => e.id === currentId) ?? SAMPLES[0];

  const accept = (image: string, problem: Problem) => {
    const entry: ProblemEntry = {
      id: crypto.randomUUID(),
      title: problem.question.slice(0, 24),
      createdAt: Date.now(),
      imageDataUrl: image,
      problem,
    };
    const next = [entry, ...history];
    setHistory(next);
    saveHistory(next);
    setCurrentId(entry.id);
  };

  return (
    <div className="app">
      <header>
        <h1>
          돌려봄 <small>찍고, 돌려 보며 이해해요</small>
        </h1>
        <div className="header-actions">
          <select value={current.id} onChange={(e) => setCurrentId(e.target.value)} aria-label="문제 선택">
            {history.length > 0 && (
              <optgroup label="내가 올린 문제">
                {history.map((e) => (
                  <option key={e.id} value={e.id}>
                    {new Date(e.createdAt).toLocaleDateString("ko-KR")} · {e.title}
                  </option>
                ))}
              </optgroup>
            )}
            <optgroup label="예시 문제">
              {SAMPLES.map((e) => (
                <option key={e.id} value={e.id}>{e.title}</option>
              ))}
            </optgroup>
          </select>
          <UploadFlow onAccept={accept} />
        </div>
      </header>
      <main>
        <ProblemView entry={current} />
      </main>
    </div>
  );
}
