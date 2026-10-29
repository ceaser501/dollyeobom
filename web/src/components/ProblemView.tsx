import { useEffect, useState } from "react";
import type { CameraPreset, ProblemEntry } from "../types";
import { TAGS } from "../data/tags";
import { normalizeAnswer } from "../lib/validate";
import Viewer3D from "./Viewer3D";
import View2D from "./View2D";

const CAMERA_LABEL: Record<CameraPreset, string> = { iso: "비스듬히", top: "위", front: "앞", side: "옆" };

type Phase = "solving" | "correct" | "wrong" | "revealed";

export default function ProblemView({ entry }: { entry: ProblemEntry }) {
  const p = entry.problem;
  const scene = p.scene;
  const tag = TAGS.find((t) => t.id === p.tag_id);

  const [mode, setMode] = useState<"2d" | "3d">("2d");
  const [phase, setPhase] = useState<Phase>("solving");
  const [input, setInput] = useState("");
  const [step, setStep] = useState(-1);
  const [camera, setCamera] = useState<CameraPreset>("iso");
  const [cameraNonce, setCameraNonce] = useState(0);
  const [fold, setFold] = useState(0);
  const [showCounts, setShowCounts] = useState(false);
  const [pairColors, setPairColors] = useState(false);

  // 문제가 바뀌면 처음부터 다시 풀기
  const reset = () => {
    setPhase("solving");
    setInput("");
    setStep(-1);
    setCamera("iso");
    setCameraNonce((n) => n + 1);
    setFold(0);
    setShowCounts(false);
    setPairColors(false);
    setMode("2d");
  };
  useEffect(reset, [entry.id]);

  const showSolution = phase !== "solving";
  const current = step >= 0 ? p.explanation[step] : undefined;

  const goStep = (i: number) => {
    const s = p.explanation[i];
    if (!s) return;
    setStep(i);
    if (s.camera) setCamera(s.camera);
    setCameraNonce((n) => n + 1);
    if (typeof s.fold === "number") setFold(s.fold);
    if (scene.type !== "unsupported") setMode("3d");
  };

  const submit = (value: string) => {
    if (!value.trim()) return;
    setInput(value);
    setPhase(normalizeAnswer(value) === normalizeAnswer(p.answer.value) ? "correct" : "wrong");
  };

  return (
    <div className="problem">
      <section className="stage">
        {scene.type === "unsupported" ? (
          <div className="unsupported">
            {entry.imageDataUrl && <img src={entry.imageDataUrl} alt="올린 문제 사진" />}
            <p>이 유형은 아직 3D로 보여줄 수 없어요. ({scene.reason})</p>
          </div>
        ) : (
          <>
            <div className="toolbar">
              <div className="seg" role="tablist" aria-label="보기 방식">
                <button role="tab" aria-selected={mode === "2d"} onClick={() => setMode("2d")}>2D로 보기</button>
                <button role="tab" aria-selected={mode === "3d"} onClick={() => setMode("3d")}>3D로 보기</button>
              </div>
              {mode === "3d" && (
                <div className="seg small" aria-label="시점">
                  {(Object.keys(CAMERA_LABEL) as CameraPreset[]).map((c) => (
                    <button
                      key={c}
                      aria-pressed={camera === c}
                      onClick={() => {
                        setCamera(c);
                        setCameraNonce((n) => n + 1);
                      }}
                    >
                      {CAMERA_LABEL[c]}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className={mode === "3d" ? "canvas-wrap" : "flat-wrap"}>
              {mode === "3d" ? (
                <Viewer3D
                  scene={scene}
                  camera={camera}
                  cameraNonce={cameraNonce}
                  highlightCells={showSolution ? current?.highlight_cells : undefined}
                  highlightFaces={showSolution ? current?.highlight_faces : undefined}
                  fold={fold}
                  pairColors={pairColors}
                />
              ) : (
                <View2D
                  scene={scene}
                  imageDataUrl={entry.imageDataUrl}
                  showCounts={showCounts}
                  pairColors={pairColors}
                  highlightFaces={showSolution ? current?.highlight_faces : undefined}
                />
              )}
              {mode === "3d" && <p className="hint">드래그해서 돌려 보고, 휠이나 두 손가락으로 확대해요.</p>}
            </div>

            <div className="controls">
              {scene.type === "net" && mode === "3d" && (
                <label className="slider">
                  펼침
                  <input type="range" min={0} max={1} step={0.01} value={fold} onChange={(e) => setFold(Number(e.target.value))} />
                  접힘
                </label>
              )}
              {scene.type === "blocks" && mode === "2d" && (
                <label className="check">
                  <input type="checkbox" checked={showCounts} onChange={(e) => setShowCounts(e.target.checked)} />
                  위에서 본 모양에 개수 쓰기
                </label>
              )}
              {scene.type === "net" && (
                <label className="check">
                  <input type="checkbox" checked={pairColors} onChange={(e) => setPairColors(e.target.checked)} />
                  마주 보는 면 같은 색으로
                </label>
              )}
            </div>
          </>
        )}
      </section>

      <aside className="panel">
        {tag && <span className="chip">{tag.display}</span>}
        {p.source_book && <span className="chip muted">{p.source_book}</span>}
        <h2 className="question">{p.question}</h2>

        {phase === "solving" ? (
          <div className="answer-box">
            {p.choices.length > 0 ? (
              <div className="choices">
                {p.choices.map((c) => (
                  <button key={c} onClick={() => submit(c)}>{c}</button>
                ))}
              </div>
            ) : (
              <form
                className="answer-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  submit(input);
                }}
              >
                <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="답을 써 보세요" aria-label="답" />
                <button type="submit">채점</button>
              </form>
            )}
            <button className="link" onClick={() => setPhase("revealed")}>모르겠어요, 해설 볼래요</button>
          </div>
        ) : (
          <div className={`result ${phase}`}>
            {phase === "correct" && <p>정답이에요! 🎉 ({p.answer.text})</p>}
            {phase === "wrong" && <p>아쉬워요. 내 답: {input} → 정답: {p.answer.text}</p>}
            {phase === "revealed" && <p>정답: {p.answer.text}</p>}
            <button className="secondary" onClick={reset}>다시 풀기</button>
          </div>
        )}

        {showSolution && (
          <ol className="steps">
            {p.explanation.map((s, i) => (
              <li key={i}>
                <button className={i === step ? "active" : ""} onClick={() => goStep(i)}>
                  <span className="num">{i + 1}</span>
                  <span>{s.text}</span>
                </button>
              </li>
            ))}
          </ol>
        )}
        {showSolution && p.explanation.length > 0 && (
          <div className="step-nav">
            <button disabled={step <= 0} onClick={() => goStep(step - 1)}>← 이전</button>
            <button disabled={step >= p.explanation.length - 1} onClick={() => goStep(step + 1)}>다음 →</button>
          </div>
        )}
      </aside>
    </div>
  );
}
