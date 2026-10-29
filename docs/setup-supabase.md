# 프로토타입 실행·배포 안내

## 1. 내 컴퓨터에서 화면만 보기 (키 없이)

```bash
cd web
npm install
npm run dev
```

브라우저에서 http://localhost:5173 을 열면 예시 문제 4개로 2D/3D 보기, 해설, 다시 풀기를 확인할 수 있다.

## 2. 사진 해석 서버 연결 (Supabase)

### 2-1. API 키 등록 (한 번만)
Supabase 대시보드 → 프로젝트 → **Edge Functions → Secrets**에서 추가한다. 키는 채팅·코드·저장소에 절대 넣지 않는다.

| 이름 | 값 | 필수 |
|---|---|---|
| `ANTHROPIC_API_KEY` | Anthropic Console에서 발급한 키 | 필수 |
| `ANTHROPIC_MODEL` | 기본 `claude-opus-5-5`. 비용을 줄이려면 `claude-sonnet-5-5` | 선택 |
| `ANTHROPIC_EFFORT` | `low` / `medium`(기본) / `high` | 선택 |
| `DAILY_LIMIT` | 하루 최대 해석 횟수 (기본 50) | 선택 |

### 2-2. DB와 함수 배포
- `supabase/migrations/0001_analyze_usage.sql`: 하루 사용량 제한 테이블과 함수
- `supabase/functions/analyze-problem/`: 사진 → 장면 JSON 함수

Supabase CLI를 쓴다면:

```bash
supabase link --project-ref <프로젝트 ref>
supabase db push
supabase functions deploy analyze-problem
```

### 2-3. 웹 화면에 서버 주소 넣기
`web/.env.example`을 `web/.env`로 복사하고, 대시보드 **Project Settings → API**의 Project URL과 anon(public) 키를 넣는다. 이 키는 공개용이라 브라우저에 노출돼도 된다. 진짜 비밀인 `ANTHROPIC_API_KEY`는 서버(Edge Function)에만 있다.

```
VITE_SUPABASE_URL=https://<ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon key>
```

## 구조

```
브라우저 (web/)
  └─ 사진을 1568px JPEG로 줄여서 전송 (anon 키)
Supabase Edge Function (analyze-problem)
  ├─ 하루 사용량 확인 (DB 함수 try_use_analyze)
  └─ Claude API 호출 (ANTHROPIC_API_KEY는 여기에만 있음)
       → JSON 스키마로 강제된 장면 데이터
브라우저
  ├─ 장면과 정답이 맞는지 자체 검산 (쌓기나무 개수, 전개도 접기)
  ├─ "이렇게 이해했어요" 확인 → 틀리면 고칠 점을 적어 다시 읽기
  └─ 2D/3D 보기 + 단계별 해설 + 다시 풀기, 히스토리는 브라우저에 저장
```

## 비용 감각

문제 1건당 사진 입력과 해설 출력으로 대략 수천 토큰을 쓴다. 기본 모델(Opus 5.5) 기준 1건에 대략 100~200원 수준이고, Sonnet 5.5로 바꾸면 그 절반 정도다. 실제 사용량은 Supabase 함수 로그(`usage`)와 Anthropic Console에서 확인한다.
