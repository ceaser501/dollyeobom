import type { BlocksScene, NetScene } from "../types";
import { frontView, sideView, topCounts, type Grid } from "../lib/blocks";
import { analyzeNet } from "../lib/cubeNet";
import { faceColor } from "../lib/colors";

const U = 28; // 칸 크기(px)

function GridSvg({ title, grid, counts }: { title: string; grid: Grid; counts?: number[][] }) {
  const rows = grid.length;
  const cols = grid[0]?.length ?? 0;
  return (
    <figure className="grid2d">
      <svg width={cols * U + 2} height={rows * U + 2} role="img" aria-label={title}>
        {grid.map((row, r) =>
          row.map((on, c) =>
            on ? (
              <g key={`${r}-${c}`}>
                <rect x={c * U + 1} y={r * U + 1} width={U} height={U} className="cell" />
                {counts && counts[r][c] > 0 && (
                  <text x={c * U + 1 + U / 2} y={r * U + 1 + U / 2 + 5} textAnchor="middle" className="count">
                    {counts[r][c]}
                  </text>
                )}
              </g>
            ) : null,
          ),
        )}
      </svg>
      <figcaption>{title}</figcaption>
    </figure>
  );
}

function BlocksViews({ scene, showCounts }: { scene: BlocksScene; showCounts: boolean }) {
  const counts = topCounts(scene.cells);
  const top = counts.map((r) => r.map((n) => n > 0));
  return (
    <div className="views2d">
      <GridSvg title="위에서 본 모양" grid={top} counts={showCounts ? counts : undefined} />
      <GridSvg title="앞에서 본 모양" grid={frontView(scene.cells)} />
      <GridSvg title="옆에서 본 모양" grid={sideView(scene.cells)} />
    </div>
  );
}

function FlatNet({ scene, pairColors, highlight }: { scene: NetScene; pairColors: boolean; highlight?: string[] }) {
  const N = 52;
  const result = analyzeNet(scene.faces, scene.base_face);
  const minC = Math.min(...scene.faces.map((f) => f.col));
  const minR = Math.min(...scene.faces.map((f) => f.row));
  const w = (Math.max(...scene.faces.map((f) => f.col)) - minC + 1) * N + 2;
  const h = (Math.max(...scene.faces.map((f) => f.row)) - minR + 1) * N + 2;
  return (
    <div className="views2d">
      <figure className="grid2d">
        <svg width={w} height={h} role="img" aria-label="전개도">
          {scene.faces.map((f, i) => {
            const p = pairColors && result.valid ? result.opposite.findIndex((pair) => pair.includes(f.id)) : -1;
            const on = highlight?.includes(f.id);
            const x = (f.col - minC) * N + 1;
            const y = (f.row - minR) * N + 1;
            return (
              <g key={f.id}>
                <rect x={x} y={y} width={N} height={N} fill={faceColor(p >= 0 ? p : i)} className={on ? "face on" : "face"} />
                <text x={x + N / 2} y={y + N / 2 + 7} textAnchor="middle" className="facelabel">
                  {f.id}
                </text>
              </g>
            );
          })}
        </svg>
        <figcaption>전개도</figcaption>
      </figure>
    </div>
  );
}

export default function View2D({
  scene,
  imageDataUrl,
  showCounts,
  pairColors,
  highlightFaces,
}: {
  scene: BlocksScene | NetScene;
  imageDataUrl?: string;
  showCounts: boolean;
  pairColors: boolean;
  highlightFaces?: string[];
}) {
  return (
    <div className="view2d">
      {imageDataUrl && (
        <figure className="photo">
          <img src={imageDataUrl} alt="올린 문제 사진" />
          <figcaption>원본 사진</figcaption>
        </figure>
      )}
      {scene.type === "blocks" ? (
        <BlocksViews scene={scene} showCounts={showCounts} />
      ) : (
        <FlatNet scene={scene} pairColors={pairColors} highlight={highlightFaces} />
      )}
    </div>
  );
}
