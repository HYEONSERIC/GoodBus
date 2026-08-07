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
