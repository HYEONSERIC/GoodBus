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

# 승객·기사/회사 대시보드 기능 개선 (2026-08-09)

원래 요청: "승객페이지랑 버스기사/회사 페이지도 평가를 부탁해" — 관리자 콘솔 평가 때와 같은 방식(코드 직접 확인 후 부족한/추가할/삭제할 기능 정리)으로 두 Explore 에이전트를 병렬로 붙여 평가. 이어서 "UI/UX는 크게 안 건드리고 부족한 부분만 개선, 1.승객 2.기사/버스회사 순으로, 헷갈리면 먼저 물어보고" 요청에 따라 각 라운드 시작 전 `AskUserQuestion`으로 범위를 확정한 뒤 구현.

## 평가에서 발견한 주요 문제 (구현 전)

- **승객**: 여정 취소가 실제로는 DB `DELETE`(하드 삭제) — 낙찰된 여정을 취소하면 기사에게 알림 없이 그냥 사라지고, 입찰·채팅·리뷰까지 함께 삭제됨. 취소 사유도 UI에서만 쓰고 서버로 전송 안 됨. `PATCH /trips/:id`(여정 수정) API는 이미 있는데 프론트 진입점이 없음.
- **기사/회사**: 입찰 사진 첨부(최대 3장)가 실제로는 업로드되지 않는 죽은 기능. `GET /trips` 응답에 다른 입찰자의 가격·전화번호가 마스킹 없이 그대로 포함(화면엔 안 보이지만 네트워크 응답엔 존재). 회사 화면만 별점 하드코딩(`★★★★☆ (4.9)`), 입찰 실패 에러 처리 없음, 서류 심사대기/미제출 상태 구분 없음, 1:1 문의 비활성화.

## 1. 승객 페이지

| 항목 | 수정 전 | 수정 후 |
|---|---|---|
| 여정 취소 | `deleteTripFully`로 하드 삭제(입찰·채팅·리뷰까지 cascade 삭제) | `Trip.status=cancelled` 소프트 삭제 + `cancelReason`/`cancelledAt` 저장. 실제 삭제는 이미 존재했지만 데이터를 받은 적이 없던 `npm run db:purge-cancelled-trips` 스크립트로 이관 |
| 취소 사유 | UI에서 선택만 하고 서버로 미전송 | `PATCH /trips/:id/cancel` body로 전송·저장(Zod 검증 추가) |
| 여정 수정 | 백엔드 API(`PATCH /trips/:id`)는 있지만 프론트 진입점 없음 | 견적(open) 카드 ⋮ 메뉴에 "여정 수정" 추가 — 날짜·인원·차량·결제방법·경유지·추가요청을 가벼운 다이얼로그로 수정(출발지·도착지는 지도 재연동이 필요해 이번엔 제외). `PassengerEditTripDialog.tsx` 신규 |
| 회원등급/적립금/추천혜택 | 하드코딩된 가짜 값("일반회원"/"0원"/"월 100만원") | "준비중"으로 대체 |
| 죽은 코드 | `components/passenger/PassengerBidDetailDialog.tsx` 1줄짜리 중복 re-export | 삭제, import를 `dialogs/index.ts` 배럴로 통일 |

## 2. 기사/버스회사 페이지

| 항목 | 수정 전 | 수정 후 |
|---|---|---|
| 입찰 사진 첨부 | 최대 3장 선택 가능하지만 서버 업로드 없이 "채팅으로 전달 예정" 텍스트만 note에 남김 | UI 전체 제거(`OpenTripBidDialog`/`OpenTripBidFormBody`/`assembleBidNote`) |
| 경쟁 입찰 정보 | `GET /trips` 응답에 다른 입찰자 가격·전화번호·이메일·이름·사진이 마스킹 없이 포함 | 요청자가 Driver/BusCompany일 때 본인 입찰 외에는 서버에서 마스킹(가격 0, 연락처·신원 null) — 승객·관리자 응답은 변경 없음. 실제 멤버십 등급이 서버에 없어(전원 데모 스텁) 등급별 차등 해제는 하지 않고, 나중에 붙일 수 있게 주석으로 훅포인트만 남김 |
| 회사 별점 | `ratingLine="★★★★☆ (4.9)"` 하드코딩(프로필탭 + 사이드 메뉴 2곳) | 기사와 동일하게 `GET /reviews/driver/me` 실제 연동. 기사 쪽 사이드 메뉴에도 동일한 하드코딩이 있어 함께 수정 |
| 입찰 실패 처리 | 기사는 try/catch로 처리, 회사는 없음 | 회사도 동일하게 에러 처리·재조회 추가 |
| 서류 심사 상태 | 기사는 "승인 대기중" 전용 안내, 회사는 미제출과 구분 없이 항상 업로드 다이얼로그 | 회사도 `pendingDialogOpen` 분기 추가(기사와 동일) |
| 1:1 문의 | 회사는 `showInquiry={false}`로 비활성(백엔드는 원래 회사도 허용) | 활성화(`SupportInquiryDialog` 연결, 기사와 동일 메뉴 재사용) |
| 이메일/알림 금액 표기 | `$${price}`(달러 기호, 만원 단위 앱인데) | `${price}만원`으로 수정 — 이메일 템플릿 2곳 + 인앱 알림 메시지 2곳 |
| 서류 재업로드 | 프로필 수정 화면에 재업로드 버튼 없음(입찰 시도로 막혀야만 간접 진입) | "재업로드" 버튼 추가(`BidderProfileEditPanel`, 기사·회사 공통) |
| 취소된 여정 표시 | `AwardedTripCard`에 "취소됨"(승객취소) 뱃지 코드가 이미 있었지만 `awardedTrips`가 `status=awarded`만 fetch해서 도달 불가 | `status=cancelled`도 함께 fetch해 본인 낙찰 건만 병합 — 뱃지가 실제로 노출됨 |

## 검증

- 프론트/백엔드 `tsc --noEmit`, `eslint` 통과 (기존 `kakao.ts` any-타입 에러 2건은 무관한 기존 이슈)
- 실제 로그인 세션으로 curl·브라우저 검증: 승객 계정으로 여정 생성→수정→취소(사유 저장·DB row 보존 확인), 기사·회사 두 계정으로 같은 여정에 입찰 걸어 마스킹 응답 확인(상대 입찰 price=0/연락처 null, 본인 입찰은 그대로), 낙찰→취소 후 기사 쪽 계약탭에 "취소됨" 노출 확인, 회사 계정으로 1:1 문의 등록·조회 확인, 프로필 재업로드 다이얼로그 동작 확인
- 테스트 데이터(트립·입찰·문의)는 작업 후 정리

## 수정된 파일

- `server/prisma/schema.prisma` — `Trip.cancelReason`, `Trip.cancelledAt` 추가
- `server/src/routes/trips.ts` — 취소 소프트 삭제·Zod 검증, `GET /trips` 경쟁 입찰 마스킹, 알림 메시지 금액 표기
- `server/src/routes/bids.ts` — 알림 메시지 금액 표기
- `server/src/utils/email.ts` — 이메일 템플릿 금액 표기
- `lib/api.ts` — `tripsAPI.cancel`에 `reason` 파라미터 추가
- `lib/openTripBidForm.ts` — `assembleBidNote`에서 사진 카운트 라인 제거
- `hooks/usePassengerDashboard.tsx` — 취소 사유 전송, 여정 수정 다이얼로그 상태·핸들러
- `hooks/useDriverDashboard.tsx`, `hooks/useCompanyDashboard.tsx` — 취소 여정 fetch 병합, (회사만) 리뷰 통계·pending 다이얼로그·1:1 문의 상태 추가
- `components/passenger/dialogs/PassengerEditTripDialog.tsx`(신규), `dialogs/index.ts`
- `components/passenger/PassengerDashboardContent.tsx`, `PassengerQuoteTripCard.tsx`, `PassengerQuoteTripsList.tsx`, `PassengerQuoteRequestSection.tsx`
- `components/passenger/PassengerBidDetailDialog.tsx` — 삭제(중복 shim)
- `components/OpenTripBidDialog.tsx`, `components/openTripBid/OpenTripBidFormBody.tsx` — 사진 첨부 UI 제거
- `components/company/CompanyDashboardContent.tsx` — 리뷰 연동·pending 다이얼로그·1:1 문의 UI
- `components/driver/DriverDashboardContent.tsx` — 사이드 메뉴 별점 실연동
- `components/bidder/BidderProfileEditPanel.tsx` — 재업로드 버튼(`onOpenVerification`)

## 의도적으로 손 안 댄 것

1. 입찰 데이터가 `note` 필드에 텍스트로 뭉쳐 저장되는 구조(추가비용·차량정보·부가서비스가 전부 자유텍스트) — 스키마·파싱 로직을 통째로 바꿔야 하는 큰 작업이라 범위 밖으로 판단, 다음에 별도 논의
2. 왕복 여정 취소가 API 2번(`Promise.all`)으로 처리되는 원자성 문제 — 소프트 삭제 전환으로 리스크는 줄었지만(삭제가 아니라 상태 갱신), 트랜잭션 묶음 자체는 이번 라운드 합의 범위 밖이라 손대지 않음
3. 경쟁 입찰 마스킹의 멤버십 등급별 차등 해제 — 실제 멤버십이 서버에 없어 구현 보류, 훅포인트만 남김

# 테스트·CI·에러 트래킹 도입 (2026-08-10, 오전)

원래 요청: "테스트·CI·에러 트래킹 도입 계획" → 계획 승인 후 구현. 목표는 회귀를 막을 최소한의 자동 검증(유닛 테스트+CI)과 프로덕션 장애를 알 수 있는 관측성(Sentry)을 갖추는 것.

## 구현 내용

| 영역 | 내용 |
|---|---|
| 유닛 테스트 | 프론트 Vitest(`vitest.config.mts`) + 백엔드 Vitest(`server/vitest.config.mts`, `server/vitest.setup.ts`로 `DATABASE_URL`/`JWT_SECRET` 더미값 주입) 도입. 순수 로직 위주로 46개 테스트 작성 (프론트: `lib/tripFilters`, `lib/adminRevenueDisplay`, `lib/exportRevenueCsv` / 백엔드: `tripGroupsCore`, `adminRevenue`, `adminOverview`, `uploadFileFilter`, `jwt`) |
| CI | `.github/workflows/ci.yml` 신규 — `main`/`aligo` push·PR에서 프론트(`lint`→`build`→`test`)·백엔드(`prisma generate`→`build`→`test`) 2개 job 실행 |
| 에러 트래킹 | Sentry 도입 — 프론트(`@sentry/nextjs`: `sentry.client/server/edge.config.ts`, `instrumentation.ts`, `next.config.ts`를 `withSentryConfig`로 래핑) + 백엔드(`@sentry/node`: `server/src/instrument.ts`를 진입점 최상단에서 import, `Sentry.setupExpressErrorHandler`). `NODE_ENV==='production'`이고 DSN이 설정된 경우에만 활성화 |
| 린트 정리 | 루트 `npm run lint`가 `server/`·`deploy/`까지 스캔하던 문제 수정(`eslint.config.mjs`에 ignore 추가). React Compiler purity 경고 2건은 조사 후 **의도적으로 남김**(아래 참고) |

## 검증

- `npx tsc --noEmit`(루트+server), `npm run build`(루트+server), `npm run lint`(0 에러), `npm test`(루트+server, 46개 전부 통과)

## 의도적으로 손 안 댄 것

1. `components/PaymentCardsPanel.tsx`의 `react-hooks/set-state-in-effect` 경고, `components/passenger/PassengerQuoteTripsList.tsx`의 `react-hooks/purity`(`Date.now()`) 경고 — 둘 다 "정상적인" 방식(지연 초기화, `useMemo`)으로 고쳐봤지만 `BUGFIXES_2026-08-09.md`에 기록된 것과 동일한 회귀(로그인 직후 카드 안 보임 / 오래된 여정이 계속 "예정"으로 남음)가 재현됨 → 원복하고 `eslint-disable-next-line` + 이유를 코드에 주석으로 남김
2. 라우트 레벨 통합 테스트(실제 DB 붙여서 API 엔드투엔드 검증)는 없음 — 이번 범위는 순수 함수 위주 유닛 테스트로 한정, 통합 테스트 인프라(테스트 DB 스핀업 등)는 별도 작업

## 수정된 파일

- `package.json`, `server/package.json` — 의존성(`@sentry/nextjs`, `@sentry/node`, `vitest`, `npm-run-all`) + `test`/`test:all` 스크립트
- `next.config.ts`, `sentry.client.config.ts`/`sentry.server.config.ts`/`sentry.edge.config.ts`(신규), `instrumentation.ts`(신규), `server/src/instrument.ts`(신규), `server/src/index.ts`
- `.github/workflows/ci.yml`(신규), `vitest.config.mts`/`server/vitest.config.mts`/`server/vitest.setup.ts`(신규)
- `eslint.config.mjs` — `server/**`, `deploy/**` ignore 추가
- `server/src/utils/adminOverview.ts`(`summarizeAwardsInRange` export), `lib/exportRevenueCsv.ts`(`buildRevenueAwardsCsv` 순수 함수 분리) — 테스트 가능하게 리팩터
- `server/src/routes/kakao.ts` — 무관한 기존 TS 타입 에러 1건 수정(변수 할당 순서)
- `.env.production.example`, `server/.env.example`, `DEPLOYMENT.md` — Sentry 환경변수·체크리스트
- 신규 테스트 파일 9개(위 표 참고)
- `CLAUDE.md` — 작업 브랜치 `aligo` 명시, 테스트/CI 서술 추가

# 회원가입 이름 버그 + 관리자 감사 로그 + 목록 페이지네이션 (2026-08-10, 오후)

원래 요청: 프로젝트 시급 이슈 분석(analyst 서브에이전트) → "운영/데이터" 카테고리 3건(감사 로그 없음, 입찰/문의 페이지네이션 미비, signup 이름 필드 누락 버그) 확정 → 계획 수립 후 구현.

## 1. signup 이름(displayName) 저장 버그

두 회원가입 화면 모두 이름 입력 state는 있었지만 `authAPI.signup` 호출 시 넘기지 않아 버려지던 문제. `lib/api.ts`(`authAPI.signup` 4번째 파라미터), `server/src/routes/auth.ts`(`signupSchema`에 `displayName` 추가, `user.create`에 반영), 두 signup 페이지(호출부만 `name.trim() || undefined`로 수정 — 빈 값은 `undefined`로 보내 서버의 `min(1)` 검증과 충돌하지 않게 처리)를 연결.

**주의**: 이번 수정은 "저장"만 해결했고, 사이드바 등 화면에 `user.email`을 그대로 표시하는 부분(예: `components/passenger/PassengerDashboardContent.tsx:51`)은 그대로 남아 있음 — `displayName` 우선 표시 fallback은 이번 범위 밖(`PROJECT_STATUS.md`의 기존 버그 기록에 언급돼 있던 후속 작업, 아직 미완료).

## 2. 관리자 감사 로그(AdminAuditLog)

- **스키마**: `server/prisma/schema.prisma`에 `AdminAuditLog` 모델(`actorId`/`action`/`targetType`/`targetId`/`metadata` Json/`createdAt`) 추가, `User`에 역관계 추가, `db:push`로 반영(로컬 Postgres 컨테이너 기동 후 진행)
- **기록 유틸**: `server/src/utils/adminAuditLog.ts`의 `recordAdminAudit` — DB 클라이언트를 파라미터로 주입 가능하게(`= prisma` 기본값) 만들어 테스트 가능하게 함, 내부 `try/catch`로 실패를 삼켜 실제 관리자 작업(차단·승인 등)을 막지 않음(fire-and-forget, `void recordAdminAudit(...)` 형태로 호출)
- **기록 지점 5곳**(`server/src/routes/admin.ts`): 사용자 차단/해제, 서류 심사, 서브관리자 생성, 공지/FAQ 작성·수정·삭제, 문의 답변
- **조회**: `GET /admin/audit-log`(`requireAdminRole(Super, Operations)` — revenue-stats와 동일하게 CustomerSupport 제외), 프론트 `AdminAuditLogPanel`(시각/관리자/행위/대상/메모 테이블 + 이전/다음 페이저), `adminNav.ts`에 "감사 로그" 탭 추가(Super/Operations만 노출)

## 3. 입찰·문의 목록 페이지네이션

- `components/admin/AdminActivitySectionFooter.tsx`를 `max`/`step` prop 기반으로 범용화(기존 3곳은 기본값으로 하위 호환 유지)
- `GET /admin/bids`: `take` 고정값(50) → 쿼리 파라미터화(최대 200) + `prisma.bid.count`를 병렬 실행해 `meta.totalMatching` 추가. `where` 절을 변수로 추출하면서 타입이 widen되는 문제가 생겨 `Prisma.BidWhereInput` 명시적 타입 추가로 해결
- `GET /admin/support-inquiries`: 유틸(`adminSupportInquiryList.ts`)은 이미 `take` 지원했지만 라우트가 안 전달하던 것만 연결
- 프론트: `bidsTake`(+50, 최대 200)/`supportInquiryTake`(+100, 최대 500) state와 "더보기" 핸들러를 `useAdminDashboard.tsx`에 추가, 검색 조건이 바뀌는 지점(검색 버튼·딥링크 이동 등)마다 take를 초기값으로 리셋

## 검증

- `npx tsc --noEmit`(루트+server), `npm run build`(루트+server), `npm run lint`(0 에러, 기존 84개 경고 그대로), `npm test`(루트 18개+server 30개=48개, 신규 `recordAdminAudit` 테스트 2개 포함)

## 의도적으로 손 안 댄 것

1. 사이드바 등 화면의 이름 표시 fallback(위 1번 참고) — 저장 버그만 이번 범위
2. `adminRole`별 API 권한의 전면 RBAC화 — 감사 로그 조회에는 `requireAdminRole` 적용했지만, 다른 admin 서브 라우트(공지/문의 등)는 여전히 서브롤 구분 없음(기존과 동일, 계획 범위 밖)
3. 감사 로그 조회 화면의 필터(행위 종류·기간·관리자별 검색) — 1차는 최근순 목록+페이지네이션만, 필터는 후속 작업으로 남김
