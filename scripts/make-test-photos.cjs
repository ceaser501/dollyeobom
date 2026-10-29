// 학습지처럼 보이는 테스트 문제 이미지 생성 (직접 만든 문제라 저작권 문제 없음)
// 사용법: node scripts/make-test-photos.cjs samples/generated  (playwright 필요)
const { chromium } = require('playwright');
const OUT = process.argv[2];

// 등각 투영 쌓기나무 SVG (x 오른쪽, y 뒤, z 위)
function iso(cells, u = 34) {
  const P = (x, y, z) => [(x - y) * u * 0.866, -(x + y) * u * 0.5 - z * u];
  const sorted = [...cells].sort((a, b) => (b[0] + b[1]) - (a[0] + a[1]) || a[2] - b[2]);
  // 뒤(큰 x+y)부터, 아래부터 그림 → 앞쪽이 덮음
  const sorted2 = [...cells].sort((a, b) => (a[2] - b[2]) || ((b[0] + b[1]) - (a[0] + a[1])));
  const order = [...cells].sort((a, b) => ((b[0]+b[1]) - (a[0]+a[1])) || (a[2]-b[2]));
  let polys = '';
  const pts = (arr) => arr.map((p) => p.join(',')).join(' ');
  for (const [x, y, z] of order) {
    // 보이는 면: 위(z+1), 왼쪽 앞(y면: y), 오른쪽 앞(x면: x... ) — 시점이 -x,-y 쪽 앞
    const top = [P(x, y, z + 1), P(x + 1, y, z + 1), P(x + 1, y + 1, z + 1), P(x, y + 1, z + 1)];
    const left = [P(x, y, z), P(x + 1, y, z), P(x + 1, y, z + 1), P(x, y, z + 1)];
    const right = [P(x, y, z), P(x, y + 1, z), P(x, y + 1, z + 1), P(x, y, z + 1)];
    polys += `<polygon points="${pts(right)}" fill="#e9e9e9" stroke="#222" stroke-width="1.6"/>`;
    polys += `<polygon points="${pts(left)}" fill="#d0d0d0" stroke="#222" stroke-width="1.6"/>`;
    polys += `<polygon points="${pts(top)}" fill="#fff" stroke="#222" stroke-width="1.6"/>`;
  }
  return `<svg viewBox="-200 -260 400 300" width="300" height="225">${polys}</svg>`;
}
function grid(g, u = 26, nums) {
  let s = '';
  g.forEach((row, r) => row.forEach((on, c) => { if (on) s += `<rect x="${c*u}" y="${r*u}" width="${u}" height="${u}" fill="#fff" stroke="#222" stroke-width="1.5"/>` + (nums ? `<text x="${c*u+u/2}" y="${r*u+u/2+6}" text-anchor="middle" font-size="16">${nums[r][c]}</text>` : ''); }));
  return `<svg width="${g[0].length*u+2}" height="${g.length*u+2}" viewBox="-1 -1 ${g[0].length*u+2} ${g.length*u+2}">${s}</svg>`;
}
function net(faces, u = 40, labels = true) {
  let s = '';
  for (const [id, c, r] of faces) s += `<rect x="${c*u}" y="${r*u}" width="${u}" height="${u}" fill="#fff" stroke="#222" stroke-width="1.5"/>` + (labels ? `<text x="${c*u+u/2}" y="${r*u+u/2+7}" text-anchor="middle" font-size="18">${id}</text>` : '');
  const W = Math.max(...faces.map(f => f[1])) + 1, H = Math.max(...faces.map(f => f[2])) + 1;
  return `<svg width="${W*u+2}" height="${H*u+2}" viewBox="-1 -1 ${W*u+2} ${H*u+2}">${s}</svg>`;
}
const fig = (inner, cap) => `<figure>${inner}<figcaption>${cap}</figcaption></figure>`;

const problems = [
  { id: '01-blocks-count', no: 3, unit: '6-2  1. 공간과 입체', q: '쌓기나무로 쌓은 모양입니다. 똑같은 모양으로 쌓는 데 필요한 쌓기나무는 몇 개인가요? (보이지 않는 쌓기나무는 없습니다.)',
    body: iso([[0,0,0],[1,0,0],[2,0,0],[0,1,0],[1,1,0],[0,2,0],[0,1,1],[0,2,1],[0,2,2]]), answer: '9개' },
  { id: '02-top-numbers', no: 5, unit: '6-2  1. 공간과 입체', q: '쌓기나무로 쌓은 모양을 위에서 본 모양에 각 자리에 쌓은 쌓기나무의 수를 썼습니다. 쌓기나무는 모두 몇 개인가요?',
    body: grid([[true,false,false],[true,true,false],[true,true,true]], 34, [[3,0,0],[2,1,0],[1,1,1]]), answer: '9개' },
  { id: '03-views-count', no: 7, unit: '6-2  1. 공간과 입체', q: '쌓기나무로 쌓은 모양을 위, 앞, 옆에서 본 모양입니다. 쌓기나무를 가장 적게 사용할 때, 필요한 쌓기나무는 몇 개인가요?',
    body: `<div class="row">${fig(grid([[true,true],[true,true]]), '위')}${fig(grid([[true,false],[true,true]]), '앞')}${fig(grid([[false,true],[true,true]]), '옆')}</div>`, answer: '5개 (최소)' },
  { id: '04-net-opposite', no: 2, unit: '5-2  5. 직육면체', q: '정육면체의 전개도를 접어서 정육면체를 만들었을 때, 면 나와 마주 보는 면을 찾아 쓰세요.',
    body: net([['가',0,0],['나',0,1],['다',1,1],['라',2,1],['마',2,2],['바',3,2]], 46), answer: '라' },
  { id: '05-net-choose', no: 4, unit: '5-2  5. 직육면체', q: '정육면체의 전개도가 아닌 것을 찾아 기호를 쓰세요.',
    body: `<div class="row">${fig(net([['',1,0],['',0,1],['',1,1],['',2,1],['',3,1],['',1,2]],22,false),'①')}${fig(net([['',0,0],['',1,0],['',1,1],['',2,1],['',2,2],['',3,2]],22,false),'②')}${fig(net([['',0,0],['',1,0],['',2,0],['',0,1],['',1,1],['',2,1]],22,false),'③')}${fig(net([['',0,1],['',1,1],['',2,1],['',2,0],['',3,0],['',4,0]],22,false),'④')}</div>`, answer: '③' },
  { id: '06-cylinder', no: 1, unit: '6-2  6. 원기둥, 원뿔, 구', q: '원기둥의 전개도에서 옆면의 가로의 길이는 몇 cm인가요? (원주율: 3.14, 밑면의 반지름: 5 cm, 높이: 10 cm)',
    body: `<svg width="220" height="180" viewBox="0 0 220 180"><ellipse cx="110" cy="30" rx="60" ry="18" fill="#fff" stroke="#222" stroke-width="1.6"/><line x1="50" y1="30" x2="50" y2="150" stroke="#222" stroke-width="1.6"/><line x1="170" y1="30" x2="170" y2="150" stroke="#222" stroke-width="1.6"/><path d="M50 150 A60 18 0 0 0 170 150" fill="none" stroke="#222" stroke-width="1.6"/><path d="M50 150 A60 18 0 0 1 170 150" fill="none" stroke="#222" stroke-width="1.4" stroke-dasharray="5 4"/><line x1="110" y1="30" x2="170" y2="30" stroke="#222"/><text x="132" y="24" font-size="13">5cm</text><text x="176" y="95" font-size="13">10cm</text></svg>`, answer: '31.4 cm' },
];

const page = (p) => `<!doctype html><html><head><meta charset="utf-8"><style>
body{margin:0;background:#cfc6b8;font-family:'Noto Sans CJK KR','Apple SD Gothic Neo',sans-serif}
.paper{width:620px;margin:40px auto;background:#fdfcf8;padding:28px 34px 40px;box-shadow:0 8px 30px rgba(0,0,0,.35);transform:${p.tilt};}
.unit{font-size:13px;color:#666;border-bottom:1px solid #bbb;padding-bottom:6px;margin-bottom:16px}
.q{font-size:17px;line-height:1.6;margin-bottom:18px}.no{display:inline-block;background:#333;color:#fff;border-radius:4px;padding:0 7px;margin-right:6px}
.body{display:flex;justify-content:center;padding:6px 0 10px}.row{display:flex;gap:28px;align-items:flex-end}
figure{margin:0;text-align:center}figcaption{font-size:15px;margin-top:4px}
.ans{margin-top:22px;border-top:1px dashed #aaa;padding-top:12px;color:#888;font-size:15px}
.hand{font-family:cursive;color:#2b4fa3;font-size:22px;margin-left:12px}
.shade{position:fixed;inset:0;pointer-events:none;background:linear-gradient(115deg,rgba(0,0,0,0) 40%,rgba(0,0,0,.18) 100%)}
</style></head><body><div class="paper"><div class="unit">${p.unit}</div><div class="q"><span class="no">${p.no}</span>${p.q}</div><div class="body">${p.body}</div><div class="ans">답: ${p.scribble ? '<span class="hand">?</span>' : ''}</div></div>${p.shadow ? '<div class="shade"></div>' : ''}</body></html>`;

(async () => {
  const b = await chromium.launch();
  const pg = await b.newPage({ viewport: { width: 700, height: 640 }, deviceScaleFactor: 2 });
  const tilts = ['rotate(-2.5deg)', 'perspective(900px) rotateX(8deg) rotate(1.5deg)', 'rotate(1.8deg)', 'perspective(900px) rotateY(-7deg) rotate(-1deg)', 'rotate(-1deg)', 'perspective(900px) rotateX(6deg)'];
  const key = [];
  for (const [i, p] of problems.entries()) {
    await pg.setContent(page({ ...p, tilt: tilts[i], shadow: i % 2 === 0, scribble: i === 1 }));
    await pg.waitForTimeout(150);
    await pg.screenshot({ path: `${OUT}/${p.id}.jpg`, type: 'jpeg', quality: 82 });
    key.push(`${p.id}.jpg\t${p.unit}\t정답: ${p.answer}`);
  }
  require('fs').writeFileSync(`${OUT}/정답표.txt`, key.join('\n') + '\n');
  await b.close();
})();
