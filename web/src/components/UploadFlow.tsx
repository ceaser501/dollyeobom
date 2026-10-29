import { useRef, useState } from "react";
import type { Problem } from "../types";
import { TAGS } from "../data/tags";
import { analyzeProblem, resizeImage, serverConfigured } from "../lib/api";
import { checkProblem } from "../lib/validate";

type State =
  | { kind: "idle" }
  | { kind: "loading"; image: string }
  | { kind: "confirm"; image: string; problem: Problem; warnings: string[] }
  | { kind: "error"; image?: string; message: string };

export default function UploadFlow({ onAccept }: { onAccept: (image: string, p: Problem) => void }) {
  const [state, setState] = useState<State>({ kind: "idle" });
  const [hint, setHint] = useState("");
  const [fixing, setFixing] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const run = async (image: string, h?: string) => {
    setState({ kind: "loading", image });
    try {
      const problem = await analyzeProblem(image, h);
      setState({ kind: "confirm", image, problem, warnings: checkProblem(problem) });
    } catch (e) {
      setState({ kind: "error", image, message: (e as Error).message });
    }
  };

  const onFile = async (file?: File) => {
    if (!file) return;
    setHint("");
    setFixing(false);
    run(await resizeImage(file));
  };

  const close = () => setState({ kind: "idle" });

  return (
    <>
      <button
        className="primary"
        onClick={() => (serverConfigured ? fileRef.current?.click() : setState({ kind: "error", message: "아직 서버가 연결되지 않아 예시 문제만 볼 수 있어요." }))}
      >
        📷 문제 사진 올리기
      </button>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        onChange={(e) => {
          onFile(e.target.files?.[0]);
          e.target.value = "";
        }}
      />

      {state.kind !== "idle" && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="modal">
            {"image" in state && state.image && <img className="thumb" src={state.image} alt="올린 사진" />}

            {state.kind === "loading" && <p className="loading">문제를 읽고 있어요… (30초~1분쯤 걸려요)</p>}

            {state.kind === "error" && (
              <>
                <p className="error">{state.message}</p>
                <div className="row">
                  {state.image && <button onClick={() => run(state.image!, hint || undefined)}>다시 시도</button>}
                  <button className="secondary" onClick={close}>닫기</button>
                </div>
              </>
            )}

            {state.kind === "confirm" && (
              <>
                <h3>이렇게 이해했어요</h3>
                <p>{state.problem.understanding}</p>
                <p className="muted">
                  {TAGS.find((t) => t.id === state.problem.tag_id)?.display ?? state.problem.tag_id} · 확신도{" "}
                  {Math.round(state.problem.confidence * 100)}%
                </p>
                {[...state.warnings, ...state.problem.unclear].length > 0 && (
                  <ul className="warnings">
                    {[...state.warnings, ...state.problem.unclear].map((w) => (
                      <li key={w}>⚠️ {w}</li>
                    ))}
                  </ul>
                )}
                {fixing ? (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      run(state.image, hint);
                    }}
                  >
                    <textarea
                      value={hint}
                      onChange={(e) => setHint(e.target.value)}
                      placeholder="어디가 틀렸는지 알려 주세요. 예) 쌓기나무는 2층까지만 있어요 / 마주 보는 면을 묻는 문제예요"
                      rows={3}
                    />
                    <div className="row">
                      <button type="submit" disabled={!hint.trim()}>다시 읽기</button>
                      <button type="button" className="secondary" onClick={() => setFixing(false)}>취소</button>
                    </div>
                  </form>
                ) : (
                  <div className="row">
                    <button
                      className="primary"
                      onClick={() => {
                        onAccept(state.image, state.problem);
                        close();
                      }}
                    >
                      맞아요
                    </button>
                    <button onClick={() => setFixing(true)}>아니에요, 고칠래요</button>
                    <button className="secondary" onClick={close}>취소</button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
