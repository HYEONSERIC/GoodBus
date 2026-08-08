# 보안 최소 조치 (2026-08-07)

원래 요청: "JWT secret, AdminRole 등 보안 최소 조치". 직접 구현 후 셀프 승인하지 않고 보안 리뷰 에이전트 + 아키텍트 검증 에이전트를 붙여 라이브 PoC 기반으로 재검증. 처음 요청한 3가지 외에 실제로 뚫리는 우회 경로가 6개 더 발견되어 함께 수정, 최종 재검증까지 통과.

## 1차: 원래 요청한 3가지

| 항목 | 수정 전 | 수정 후 |
|---|---|---|
| JWT secret | 하드코딩된 fallback 값 사용 (`'fallback-secret-change-in-production'`) | env 미설정 시 서버 시작 즉시 크래시 |
| AdminRole | 백엔드는 `UserRole`만 체크, sub-role(CustomerSupport 등) 구분은 프론트에서만 | `requireAdminRole` 미들웨어로 `/revenue-stats`, `/revenue-stats/awards`, `POST /admins`, `PATCH /users/:id/status` 백엔드 강제 |
| 업로드 검증 | multer에 크기 제한만, 파일 타입 검증 없음 | 이미지 MIME 필터 추가 |

## 2차: 첫 보안 리뷰에서 발견 (자체 검증, 리뷰어 에이전트)

| 문제 | 실제 시나리오 | 조치 |
|---|---|---|
| **업로드 파일명 스푸핑 → 스토어드 XSS** | `x.html` 파일을 `Content-Type: image/jpeg`로 위장해서 올리면, 서버가 원본 파일명 확장자(`.html`)를 그대로 써서 저장 → `text/html`로 서빙되어 같은 도메인에서 스크립트 실행 가능 (PoC로 재현됨) | 확장자를 서버가 신뢰하는 MIME→확장자 매핑에서만 결정하도록 변경, `/uploads`에 `nosniff`/CSP 헤더 추가 |
| **매출 데이터 우회 노출** | `/revenue-stats`만 막았지 `/admin/overview`, `/admin/bids`, `/admin/users/:id`, `/admin/users/:id/activity`에서 CustomerSupport 관리자도 매출·가격 그대로 조회 가능 | 4개 라우트 전부 마스킹 처리 |
| **dotenv 로딩 순서 우연성** | `JWT_SECRET` 검증이 실제로는 import 순서에 우연히 의존 — 코드 조금만 바뀌어도 정상 배포에서 크래시 위험 | `loadEnv.ts`로 분리해 최우선 로드 고정 |
| **에러 핸들러 정보 노출** | 새로 추가한 에러 핸들러가 서버 파일 경로 등 내부 에러 메시지를 그대로 클라이언트에 응답 | 업로드 오류만 정해진 메시지, 나머지는 일반 500 |
| **DB 장애 시 크래시 위험** | `requireAdminRole`의 DB 조회에 에러 처리 없어서 DB 순단 시 요청 행/서버 다운 가능 | try/catch 추가 |

## 3차: 아키텍트 최종 검증에서 추가로 발견

| 문제 | 실제 시나리오 | 조치 |
|---|---|---|
| **`GET /trips` 가격 완전 노출** (가장 심각) | 이 라우트는 역할 구분 없이 `requireAuth`만 있어서, 관리자 UI의 매출 마스킹을 전부 우회하고 **`fetch('/trips')` 한 번으로** 모든 여정의 입찰가를 그대로 볼 수 있었음 (라이브로 CustomerSupport 토큰으로 재현) | Admin 역할이면서 매출 조회 권한 없는 경우 `bids[].price`/`minBidPrice` 마스킹 |
| **`JWT_SECRET` 빈 문자열 우회** | `JWT_SECRET=` (빈 값)처럼 흔한 배포 실수는 fail-fast 가드를 안 타고 그냥 부팅됨 | `??` → `?.trim() ||`로 변경, `loadEnv.ts`에도 별도 assertion 추가 |
| **`/admin/notification-history` 가격 노출** | `bid.price`는 가렸는데 같은 응답의 `message` 필드에 `"You received a new bid of $777..."`처럼 가격이 텍스트로 그대로 박혀 있었음. `?search=$777`로 검색해서 가격대별 조회도 가능했음 | 가격 포함 알림 타입(BID_RECEIVED/BID_AWARDED)의 메시지를 `[금액 정보 비공개]`로 대체, 검색 대상에서도 message 필드 제외 |
| (덤) `reviews.ts` 리뷰 등록 실패 시 프로세스 다운 | `throw e`로 재던짐 → Express 4는 async 핸들러의 미처리 rejection을 못 잡아서 프로세스 자체가 죽음 | 로그 남기고 500 응답으로 변경 |

## 최종 검증 결과 (라이브 테스트, 실제 토큰으로 확인)

- CustomerSupport 토큰: `/revenue-stats`, `/revenue-stats/awards`, `POST /admins` → 403 / `/overview`, `/bids`, `/trips`, `/notification-history` → 가격·매출 필드 전부 마스킹, `?search=가격` 검색해도 0건
- Super/Finance/Operations 토큰: 전부 정상적으로 실제 값 조회됨 (회귀 없음)
- Passenger/Driver 토큰: `/trips` 응답 그대로 (관리자 아닌 사용자는 원래 동작 유지, 회귀 없음)
- `JWT_SECRET` 미설정/빈 값/공백만 있는 값 → 전부 서버 시작 시 즉시 크래시 확인
- `npm run build`, 서버 부팅, `/health` 응답 전부 정상 (남은 타입 에러 2개는 이번 작업과 무관한 `kakao.ts` 기존 이슈)

## 수정된 파일

- `server/src/utils/jwt.ts` — fallback secret 제거, fail-fast
- `server/src/loadEnv.ts` (신규) — env 로딩 최우선 순서 고정 + JWT_SECRET assertion
- `server/src/middleware/auth.ts` — `requireAdminRole`, `canViewRevenue` 추가
- `server/src/routes/admin.ts` — AdminRole 강제, 매출 마스킹(overview/bids/users/:id/users/:id/activity/notification-history), 검색 필터 조정
- `server/src/routes/trips.ts` — `/trips`, `/trips/:id` 가격 마스킹
- `server/src/routes/reviews.ts` — 업로드 필터 적용, 미처리 rejection 수정
- `server/src/routes/profile.ts`, `chats.ts`, `verification.ts` — 업로드 이미지 필터 + 확장자 스푸핑 방지
- `server/src/services/storage.ts` — 확장자를 서버 신뢰 MIME 매핑에서만 결정
- `server/src/utils/uploadFileFilter.ts` (신규) — 이미지 MIME 화이트리스트 + MIME→확장자 매핑
- `server/src/index.ts` — `/uploads` 정적 서빙에 `nosniff`/CSP 헤더, 전역 에러 핸들러(정보 노출 방지)
- `CLAUDE.md` — JWT_SECRET/AdminRole 관련 서술 최신화

## 의도적으로 손 안 댄 것 (범위 밖으로 판단, 검증 에이전트도 동의)

1. `trips.ts`의 알림 타입 재사용 버그(`BID_RECEIVED`를 가격 없는 다른 메시지에도 재사용) — 보안 문제는 아니고, CustomerSupport가 봐도 되는 메시지까지 과잉 마스킹되는 사소한 UX 문제. 새 `NotificationType` 추가(스키마 마이그레이션 필요)로 고쳐야 해서 별도 작업으로 남김
2. `/trips`가 애초에 역할/소유자 구분 없이 전체 여정을 다 보여주는 더 큰 IDOR — 이번 작업 전부터 있던 문제이고, 프론트까지 건드려야 하는 큰 작업이라 범위 밖
3. Express 4의 async 에러 처리 한계가 `admin.ts` 전체 라우트에 남아있음 — `express-async-errors` 도입 같은 레포 전역 작업 필요
4. `server/.env`의 `JWT_SECRET=changeme` — 로컬 개발용 파일(git 제외됨)이라 임의로 안 건드림, 배포 전 직접 바꾸시면 됩니다

# 홈페이지 리디자인 (2026-08-08)

원래 요청: "AI가 만든 것 같은 느낌을 없애고 세련되고 현대적으로" — 새 기능/API/백엔드 로직 추가 없이 순수 시각 디자인(레이아웃·색상·타이포그래피·카피)만 개선. `ui-ux-pro-max` 스킬(npm으로 설치)의 디자인 인텔리전스를 참고하며 여러 라운드에 걸쳐 자체 평가(관점/색상/위계/타이포그래피/스타일/섹션/카피라이팅 7개 기준, 10점 척도)를 반복해 개선.

## 대상 파일
- `app/page.tsx` — 홈페이지 전체
- `app/layout.tsx` — 메타데이터(create-next-app 기본값), 폰트, `lang` 속성
- `app/globals.css` — 폰트 CSS 변수 매핑 1줄

## 1차: 첫 리디자인

| 항목 | 수정 전 | 수정 후 |
|---|---|---|
| 통계 섹션 | 하드코딩된 가짜 숫자(누적 요청 1,182,037건 등) | 섹션 자체 제거, "이용 방법" 3단계 섹션으로 대체 |
| 차종 카드 "가격비교" 버튼 | 클릭해도 아무 동작 없는 장식용 버튼 | `/signup`으로 연결 |
| 아이콘 | 이모지(🚌🚐🚍) | `lucide-react` 아이콘 |
| 레이아웃 | 균등 대칭 그리드(2×2 등) | 벤토형 비대칭 카드(1개 큰 카드 + 3개 작은 카드) 등 도입 |
| `layout.tsx` 메타데이터 | `title: "Create Next App"` (create-next-app 기본값 그대로) | 실제 서비스명/설명으로 교체 |
| 브랜드 컬러 | 유지 (기존 오렌지 `#e08030`/hover `#d07526`가 로그인·회원가입 등 9개 이상 파일에 이미 쓰이고 있어 바꾸지 않기로 결정) | 다른 페이지와 계속 통일 |

1차 자체 평가: **5.9/10** (관점6 색상7 위계6 타이포5 스타일6 섹션6 카피5) — 특히 타이포그래피 5점의 원인은 `layout.tsx`의 `Geist` 폰트가 `subsets: ["latin"]`만 지정되어 있어 한글 텍스트가 전부 시스템 폴백 폰트로 렌더링되고 있었던 것.

## 2차: 약점 일괄 개선

- **한글 폰트 버그 수정**: `Geist`(라틴 전용) → `Noto_Sans_KR`로 교체, `<html lang="en">` → `lang="ko"`로 수정
- **신뢰 섹션 추가**: "GoodBus를 선택하는 이유" 벤토 카드 중 하나로 "서류로 검증된 기사·회사" 카드 추가 — 실제로 구현되어 있는 관리자 인증 검토 기능(`AdminVerificationPanel`, `/admin/verifications` 라우트)을 코드에서 직접 확인한 뒤에만 카피에 반영 (없는 기능을 있는 것처럼 쓰지 않기 위해)
- **카피 재작성**: "인증 기능은 순차적으로 고도화될 예정이며 현재는 이메일 기반..." 같은 개발 로드맵 톤 문구 삭제. 헤드라인을 "비교가 아니라 입찰로 결정하세요"로 바꿔 포지셔닝을 명확히 함

## 3차: 히어로 배경 영상 추가 + 실사용 중 발견된 버그 수정

사용자가 제공한 영상(`public/videos/영상.mp4`)을 히어로 배경으로 삽입(`autoplay muted loop playsInline`). 이 과정에서 다음 문제가 순서대로 드러남:

1. **오진**: 사용자가 화면 하단에 뜬 검은 알약 모양 배너("Permissions needed. Click to set up.")를 보고 "페이지가 깨졌다"고 보고 → 코드 grep + 직접 재현으로 확인한 뒤 "브라우저 확장 프로그램 UI이지 페이지 버그가 아니다"라고 답했음
2. **재질문으로 실제 버그 발견**: 사용자가 "히어로에 떠 있는 '여정 등록'/'입�찰 도착' 카드는 왜 있냐"고 다시 물음 → 이건 원래 SVG 장식 패널이 있던 자리에 영상을 끼워 넣으면서, 두 카드를 잇던 점선 경로(연결 요소)만 함께 빠져서 허공에 떠 있는 상태였던 실제 디자인 버그였음. 사용자가 "브라우저 창을 줄이면 없어지고 늘리면 생긴다"고 확인해줘서 `hidden lg:flex` 반응형 클래스 때문이라는 것도 함께 검증됨
3. **조치**: 플로팅 카드 완전 제거, 영상→다음 섹션(차종 카드) 전환부에 `bg-gradient-to-t from-stone-50 to-transparent` 페이드 추가, 카드 섹션에 없던 상단 여백(`pt-16`) 추가

## 4차: 스타일 이원화 개선

지적된 문제: 히어로는 시네마틱한데 그 아래 카드 섹션들은 평범한 shadcn 스타일 그대로라 한 페이지에 톤이 두 개 섞여 있었음.

- CTA 배너를 오렌지 단색 → 히어로와 동일한 잉크 그라데이션(`#1b2130→#0e1119`) + 우상단 오렌지 radial glow로 전환, 버튼은 흰색 → 오렌지 솔리드로 변경 — 페이지 처음(히어로)과 끝(CTA)이 같은 톤으로 묶이는 "북엔드" 구조
- 아이콘 배지 4곳(차종 카드 3 + 이유 섹션) 전부 플랫 틴트 → 그라데이션으로 통일
- 카드 8곳(차종 카드 3 + 이유 카드 4 + 다크 카드)에 `hover:-translate-y-1` 리프트 추가

## 5차: 모바일 반응형 개선

- 히어로 상하 여백을 모바일 기준으로 축소(`pt-28 pb-36` 고정 → `pt-16 pb-24`, `sm`/`md`에서 단계적으로 확대)
- 헤드라인 크기를 `text-4xl` 고정 → `text-3xl sm:text-4xl md:text-5xl`로 세분화
- 히어로 CTA 2개 + 하단 CTA 배너 버튼을 모바일에서 `w-full`, `sm:` 이상부터 `w-auto`로 전환
- 차종 카드 그리드를 `md:grid-cols-3` 단일 브레이크포인트 → `sm:grid-cols-2 lg:grid-cols-3`로 세분화(태블릿 폭에서 카드가 좁게 눌리지 않도록)
- 390px(폰), 700px(태블릿 `sm` 구간) 실제 렌더링으로 브레이크포인트 전환 확인

## 자체 평가 추이 (10점 척도, 7개 기준)

| 라운드 | 관점 | 색상 | 위계 | 타이포 | 스타일 | 섹션 | 카피 | 합계 |
|---|---|---|---|---|---|---|---|---|
| 1차 (첫 리디자인 직후) | 6 | 7 | 6 | 5 | 6 | 6 | 5 | 41/70 (5.9) |
| 2차 (폰트·벤토·카피·영상 반영 후) | 7 | 7 | 7 | 7 | 6 | 6 | 6 | 46/70 (6.6) |

4차(스타일 통일)·5차(모바일)는 아직 정식으로 재평가하지 않음 — 다음에 이어서 체크 가능.

## 의도적으로 손 안 댄 것 / 남은 약점

1. **관점**: 여전히 범용 SaaS 마켓플레이스 템플릿 골격(히어로+카드+3단계+벤토+CTA배너) — GoodBus만의 고유한 구조는 아직 아님
2. **섹션 구성**: 실질적 신뢰 요소(후기, 파트너사 로고, FAQ)가 없음 — 실제 데이터/사실이 없는 상태에서 지어낼 수는 없어 보류 중
3. **카피**: CTA 버튼 문구 등 일부는 여전히 무난한 SaaS 상투어 수준
4. 모바일 헤더에서 "회원가입"/"버스·회사 가입" 링크는 `sm` 이하에서 숨김 처리(햄버거 메뉴 없음) — 히어로의 동일 CTA로 대체 가능하다고 판단해 별도 모바일 메뉴는 구현하지 않음
