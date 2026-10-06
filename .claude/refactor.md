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

# 멤버십 요금제 전면 개편 (2026-09-18)

원래 요청: "구독 요금제 수정" — 테스트 placeholder 가격(100~400원)을 사용자가 확정한 실 가격(베이직 무료/플러스 29,900/프리미엄 49,900/비즈니스 99,900원, 최저입찰가 애드온 39,900원)으로 바꾸고, 등급별 신규 기능 5종을 붙임. 요구사항이 처음엔 모호해서(여정당 입찰 문턱과 동시 입찰 한도가 같은 개념의 다른 표현인지, 진짜 다른 지표인지) `AskUserQuestion`으로 세 가지를 확인한 뒤 진행 — 사용자가 스크린샷(타 서비스의 "멤버십 전용"/"비즈니스 전용" 배지)까지 보여주며 의도를 명확히 해줌.

## 확정된 설계

- **여정당 입찰 문턱**(신규, `TRIP_BID_CAP_BY_TIER` 10/15/20/25건) — 여정에 이미 걸린 입찰 건수가 내 등급 이상이면 그 여정엔 입찰 불가. 승객이 지정하는 게 아니라 시스템이 입찰 건수로 자동 판정(사용자가 재차 확인한 부분). 기존 `CONCURRENT_BID_LIMITS`(내 활성 입찰 총량)와는 별개 지표 — 숫자는 20/40/60/80으로 상향
- **평균 입찰가 열람**(플러스 이상), **최저 입찰가 열람**(비즈니스 자동 포함, 애드온 구매 불필요), **먼저 말걸기 채팅 선톡**(프리미엄 이상), **운행일 중복낙찰**(비즈니스만) — 뒤 두 개는 조사해보니 기존엔 등급 무관 전원 허용이었던 기능이라, "상위 등급 전용 혜택"으로 만들려면 오히려 하위 등급에 새 제한을 추가하는 역방향 작업이었음(사용자에게 미리 알리고 진행 동의 받음)
- **비즈니스 등급의 애드온 이중결제 방지** — 계획 리뷰 중 사용자가 "비즈니스가 최저입찰가 애드온도 따로 살 수 있는 거 아니냐"고 지적해서 뒤늦게 추가한 항목. 구매 자체를 서버에서 차단 + 비즈니스 업그레이드 시 기존 애드온 구독 자동 해지

## 수정된 파일

- `server/src/utils/paymentPricingCore.ts`, `membershipLimitsCore.ts`(신규 `TRIP_BID_CAP_BY_TIER`), 각각의 서버/프론트 재-export 파일(`membershipLimits.ts` 양쪽)
- `server/src/routes/bids.ts` — 여정당 입찰 문턱 체크(왕복 파트너 합산), 최저입찰가 비즈니스 자동 포함
- `server/src/routes/trips.ts` — `GET /`의 `avgBidPrice`(플러스 이상 마스킹), `POST /:id/award`의 운행일 중복낙찰 체크(KST 자정 경계 직접 계산, `server/local` 타임존 의존 안 함)
- `server/src/routes/chats.ts` — `POST /rooms/for-quote`의 먼저 말걸기 게이팅(기존 방 있으면 등급 무관 허용)
- `server/src/routes/payments.ts` — 애드온 구독 라우트의 비즈니스 차단, 멤버십 구독 라우트의 비즈니스 업그레이드 시 애드온 자동해지
- `components/trips/OpenTripCard.tsx`/`OpenTripsList.tsx` — 여정당 문턱 배지("멤버십 전용"/"비즈니스 전용"/"마감")·버튼 비활성화(UX 편의, 서버가 최종 차단)
- `components/membership/MembershipPlansPanel.tsx` — 비즈니스 등급의 애드온 카드를 "포함됨" 상태로 전환
- `lib/membershipPlans.ts` — 요금제 카드 카피 전면 재작성

스키마 변경(Prisma 마이그레이션) **없음** — 전부 기존 테이블에서 계산 가능한 값이거나 설정 상수.

## 검증 (`/verify` 스킬)

- `tsc --noEmit`(루트+server) 클린, `npm test` 48/48 통과, `npm run lint` 신규 에러 0
- 실제 로컬 서버(3000/4000)에 seeded `driver@example.com` 계정(실 빌링키 보유)으로 브라우저 로그인 → 여정에 입찰 10건/20건 직접 시딩해 배지("멤버십 전용"/"비즈니스 전용")·비활성화 버튼이 사용자가 보여준 참고 스크린샷과 동일하게 렌더링되는 것 확인, 실제 클릭→수수료 안내→입찰 폼→제출까지 end-to-end로 성공(DB 반영 확인), 비활성 버튼은 클릭해도 반응 없음(우회 불가) 확인
- DB에서 등급을 Business로 임시 전환해 "비즈니스 전용" 여정 버튼이 즉시 활성화되는 것, 멤버십 패널의 애드온 카드가 "포함됨"으로 실시간 전환되는 것 확인
- curl로 API 레벨 검증: 채팅 선톡 게이팅(플러스 차단→프리미엄 통과→기존 방 재입장은 회귀 없음), `avgBidPrice` 베이직 마스킹, 애드온 구매가 과금 전에 차단되는 것
- KST 자정 경계(23:30 KST vs 00:30 KST, 같은 UTC 날짜) 로직은 실 DB로 직접 시뮬레이션해 정확함을 확인(`BUGFIXES_2026-08-09.md`의 UTC/로컬 날짜 버그와 같은 함정을 서버 쪽에서도 피하기 위해 타임존 오프셋을 명시적으로 계산)
- 테스트로 만든 여정·입찰은 전부 정리, 계정은 원래 상태(Plus, 애드온 활성, 전화번호 없음)로 정확히 복원

## 의도적으로 검증 못 한 것

- **비즈니스 업그레이드 시 애드온 자동해지**, **운행일 중복낙찰 차단** — 둘 다 실제 토스 결제(수수료/구독료 선결제)를 통과해야 도달하는 코드인데, 로컬 `server/.env`의 테스트 시크릿 키가 `인증되지 않은 시크릿 키` 오류로 무효 상태였음(이번 변경과 무관한 기존 로컬 환경 문제). 코드 재검토로만 확인 — 키 갱신 후 실제 트랜잭션으로 재확인 권장

# 결제대행사 교체: 토스페이먼츠 → 나이스페이먼츠 (2026-09-29)

원래 요청: "토스에서 나이스페이로 바꾸려고" — 전환 사유는 비용(토스 연회비 20만원 + 더 높은 수수료 vs 나이스페이 연회비 없음). 처음엔 "지금 구조로 가능한가"라는 질문이었는데, 나이스페이 공식 매뉴얼(GitHub `nicepay-manual`)을 조사하면서 **토스와 근본적으로 다른 카드 등록 방식**이 드러남 — 사용자가 "나이스페이도 UI/UX 제공한다는데?"라고 반문해서 GitHub 매뉴얼·나이스페이 "포스타트" 자동결제 상품 페이지·포트원(PortOne) 연동문서 세 곳을 추가로 교차 확인했지만 결론은 동일: 카드 정기결제(빌키)엔 호스팅 위젯이 없고(간편결제 정기결제에만 있음), 가맹점이 직접 카드입력 폼을 만들어 서버에서 암호화해 전달하는 방식이 업계 표준. 이후 "보안상 괜찮을까", "왜 대칭키를 쓰는거야", "중소기업도 나이스 써도 되나" 등 사용자가 직접 리스크를 하나씩 파고들며 확인 — PCI-DSS SAQ-D 분류 가능성을 명확히 알리고, 코드 레벨에서 가능한 보안조치를 최대한 넣기로 합의 후 진행.

## 확정된 설계

- **AES-256-CBC로 서버측 암호화** — 나이스페이의 encData 암호키가 API 인증에도 쓰는 SecretKey(대칭키)라서, 애초에 브라우저에서 암호화하는 구조가 불가능(공개키 방식이 아님) — 이게 "왜 대칭키를 쓰냐"는 질문의 답이자 이번 마이그레이션에서 가장 리스크가 큰 지점이라고 판단한 이유
- **보안조치 6종을 계획 단계에서 미리 합의**: 카드 등록 전 SMS OTP 재인증(신규, `PhoneVerificationPurpose.card_registration`), 카드 등록 라우트 전용 rate limit, Luhn 사전검증, Sentry `beforeSend` 요청바디 스크러빙, 나이스페이 웹훅 IP 화이트리스트, 망취소(타임아웃 시 orderId 조회 후 자동 취소) — 전부 사용자가 "더 할 수 있는 거 있으면 생각해둬"라고 요청해서 추가한 항목들
- **완전 전환, 듀얼 PG 아님** — 카드등록만 토스에 남기는 하이브리드도 검토했지만, 전환 사유 자체가 "토스 연회비 자체를 안 내고 싶어서"라 하이브리드는 의미가 없다고 사용자가 판단
- **DB 컬럼 리네임은 데이터 보존** — `prisma db push`가 컬럼명 변경을 drop+add로 처리해 기존 `PaymentTransaction`/`BillingKey` 이력이 날아가는 걸 막기 위해, `db push` 실행 전에 수동 SQL `ALTER TABLE ... RENAME COLUMN`으로 먼저 이름을 맞춰둠 — 로컬에 실제 적용해 기존 트랜잭션 13건 이력 보존 확인

## 수정된 파일

- `server/src/utils/nicepay.ts`(신규, `toss.ts` 대체) — 인증(Basic)/AES-256 암호화/서명(`hex(sha256(...))`)/`issueBillingKey`/`chargeBillingKey`(망취소 래핑 포함)/`cancelPayment`/`deleteBillingKey`
- `server/src/utils/nicepayWebhookVerify.ts`(신규, `tossWebhookVerify.ts` 대체) — HMAC이 아니라 평문 해시 비교로 검증식 자체가 다름
- `server/src/routes/paymentsWebhook.ts` — 나이스페이 페이로드 형태(최상위 필드), `text/html "OK"` 응답, 운영환경 IP 화이트리스트
- `server/src/routes/payments.ts` — `POST /billing-key/otp/request`+`POST /billing-key/register` 신규(카드폼+OTP+rate limit+Luhn), `DELETE /billing-key`에 원격 빌키 삭제 추가, subscribe/addon 라우트 `chargeBillingKey` 시그니처 교체
- `server/src/routes/trips.ts`, `server/src/prisma/run-recurring-billing.ts` — 낙찰 수수료·정기결제·환불 호출부 교체
- `server/src/instrument.ts` — Sentry `beforeSend`로 카드 등록 라우트 요청바디 차단
- `server/prisma/schema.prisma` — `BillingKey.tossBillingKey`→`nicepayBillingKey`(`customerKey` 삭제), `PaymentTransaction.tossOrderId`→`orderId`/`tossPaymentKey`→`tid`, `PhoneVerificationPurpose`에 `card_registration` 추가
- `components/PaymentCardsPanel.tsx` 전면 재작성(카드입력폼+OTP), `lib/toss.ts`/`app/payments/billing-key/callback/`/`@tosspayments/tosspayments-sdk` 삭제 — 나이스페이는 클라이언트 키도 서버 전용이라 `NEXT_PUBLIC_TOSS_CLIENT_KEY` 자체가 없어짐

## 검증

- `tsc --noEmit`(루트+server) 클린, `npm test` 48/48 통과, `npm run lint` 신규 에러 0
- 나이스페이 **샌드박스** 테스트 상점("버스대절_test")으로 curl 실사용 검증(더미 응답 아니라 실제 API 호출): 카드등록(OTP→빌키발급, 실제 `BIKY...` 빌키 수신) → 멤버십 플랜변경 결제(실제 `tid` 수신) → 정기결제 크론 수동 실행 → 여정 낙찰 수수료 결제 → 여정 취소 환불(`PaymentTransaction.status`가 `cancelled`로 전환되는 것까지 DB로 확인) → 카드 삭제(원격 빌키 만료) → 웹훅 서명 시뮬레이션(`text/html "OK"` 정상, 잘못된 서명 400 거부)
- 🔍 OTP 재사용 시도 → 차단, 🔍 기사 계정에 사업자번호 길이(10자리) 입력 → 차단, 🔍 Luhn 무효 카드번호 → 차단
- 테스트로 만든 트립/빌링키는 정리, 시드 계정(`driver@example.com`)의 전화번호는 임시로 채워 넣었다가 검증 후 원상복구(null)

## 의도적으로 검증 못 한 것

- **실 프로덕션 키로의 전환 자체** — 운영 키(`R2_...`)는 이미 발급받았지만 아직 어디에도 반영 안 함. 반영 전 나이스페이 가맹점 심사팀에 PCI-DSS 요건(SAQ-D 여부, 거래량 기준) 확인이 먼저 필요하다고 계획 단계에서 합의 — 코드는 준비됐지만 이 확인·실 배포는 사용자 몫으로 남음
- **나이스페이 실제 웹훅 등록·수신** — 로컬 서버가 공인 IP가 없어 나이스페이가 직접 웹훅을 쏠 수 없음. 서명 검증 로직은 매뉴얼 명세대로 직접 만든 서명으로 curl 시뮬레이션했지만, 실제 나이스페이가 보내는 페이로드의 필드 순서·인코딩까지 100% 동일한지는 운영 반영 후 실거래로 재확인 필요

# 카카오 알림톡 템플릿 등록 (2026-10-01)

원래 요청: "알리고 템플릿인데 이렇게 등록하면 되나 아니면 더 추가해야 될게 있어?" — 사용자가 직접 작성한 초안(`/Users/hyeonsu/Desktop/템플릿_aligo.txt`, 기사/업체 대상 10종)을 검토해달라는 요청으로 시작. 코드베이스 전체 이벤트(`NotificationType` enum, `email.ts`의 두 이메일 함수, `TripStatus`/`VerificationStatus`/`SubscriptionStatus` 등)를 훑으며 초안과 대조한 결과, 초안이 **공급자(기사·업체)쪽만** 다루고 **승객쪽 알림이 전무**하다는 것과(승객 전용 `quoteAlertConsent` 동의 필드까지 이미 있는데 활용 안 됨), 서류심사 결과·정기결제 실패처럼 **코드에 이벤트는 있는데 알림이 전혀 안 나가는 구멍**이 있는 걸 발견 — "네가 보기에 어떤 템플릿이 필요할거 같아"라는 사용자 질문에 역할별(승객/기사) 갭 분석으로 답한 뒤, 범위를 11종으로 재설계해 실제로 Aligo 웹 UI에 사용자가 직접 하나씩 입력하는 걸 화면 캡처를 보며 실시간으로 가이드.

중간에 "계획을 세워서 승인받는" 접근을 한 번 시도했다가 사용자가 거부("네가 오토모드로 뭘한다는거야 어차피 신청은 내가 해야되는데") — Aligo 등록은 사용자가 직접 웹 폼에 입력하는 작업이라, Claude가 "실행"할 대상이 아니라는 지적. 이후로는 플랜 승인 절차 없이 템플릿 하나씩 본문·변수·버튼 값을 텍스트로 바로 전달하고, 사용자가 캡처를 보내면 검수하는 방식으로 전환.

## 확정된 범위

- **기사/업체 대상 8종**: 낙찰완료·예약취소·수수료환불완료(기존 초안 그대로 재사용) + 서류심사승인·서류심사반려(신규, 문구가 완전히 달라 1개가 아니라 2개로 분리)·정기결제실패·멤버십결제완료·카드등록변경(신규, 보안 알림) — 전부 `dashboard/driver`로 고정 링크
- **승객 대상 3종(전부 신규)**: 입찰도착·낙찰확정·리뷰요청 — 전부 `dashboard/passenger`로 고정 링크
- **의도적 제외**: 기사_고객문의도착(채팅 알림인지 문의답변 알림인지 의미가 불명확해 이번엔 보류), 기사_미낙찰안내(여정당 낙찰자 1명 빼고 전원에게 나가는 구조라 발송량이 제일 많은데 정보가치 대비 비용 큼), 부가서비스 포함 낙찰완료·운행 D-3/D-1 리마인더·운행완료(대응하는 데이터 모델·cron이 아직 없음)

## 과정에서 발견·수정한 것

- **변수가 실제 코드와 안 맞았던 케이스**: 초안의 수수료환불완료 템플릿이 "운행요금/환불수수료/보증수수료/부가서비스요금"처럼 항목을 나눈 변수를 썼는데, `trips.ts`의 실제 환불 로직은 `platform_commission` 거래 하나를 통째로 취소하는 구조라 항목별 분해가 불가능 — "환불금액" 단일 변수로 단순화
- **딥링크 불가 문제**: 버튼 링크를 특정 주문 상세로 보내려 했으나, 대시보드 라우트가 전부 클라이언트사이드 로그인 체크로 막혀 있고 **로그인 후 원래 링크로 돌아가는 기능이 없어서**(`redirect-back` 없음) 로그인 풀린 상태에서 딥링크를 누르면 맥락을 잃는 문제를 사용자가 직접 지적("주문링크는 로그인 해야 접속되는거 아닌가"). 버튼을 아예 빼는 대신, 모든 버튼을 일반 대시보드 주소(`dashboard/driver`/`dashboard/passenger`)로 고정하는 쪽으로 단순화 — 버튼이 있어도 최악의 경우(로그인 풀림)가 더 나빠지지 않고, 로그인된 상태에선 여전히 유용하다는 논리
- **"취소내역" 같은 존재하지 않는 화면을 가리키던 버튼명**: 원본 초안 버튼명이 "취소내역 확인하기"였는데 실제로 그런 화면이 없음을 확인 — 대신 취소된 여정이 "예약주문" 탭에 빨간 "승객취소" 배지로 이미 표시되고 있는 걸 찾아서(`components/trips/AwardedTripCard.tsx`), 버튼명을 "예약내역 확인"으로 바꿔 기존 화면을 그대로 가리키게 함. 이 과정에서 그 배지가 `variant === 'reservation'`일 때만 보이고 "운행완료" 탭으로 넘어가면 안 보이는 부수적 프론트 이슈도 발견(이번엔 고치지 않기로 함)
- **대체문자(SMS 폴백) 설정 누락**: 사용자가 1~9번 템플릿의 "대체 발송 문자"를 전부 단문(90byte)으로 등록했는데 실제 본문은 150~670byte라 초과 — 카카오 심사 중이라 지금 수정 불가 확인, 승인/반려 결과 나온 뒤 장문(LMS)으로 바꾸기로 함. 다만 `aligo.ts`의 OTP 발송 코드가 이미 대체문자 내용을 API 호출 시점에 직접 지정하는 구조(`fsubject_1`/`fmessage_1`)라, 실제 발송 코드를 붙일 때 이 값이 우선 적용되어 영향이 제한적일 가능성이 높음

## 산출물

Aligo에 실제로 등록·카카오 심사 제출된 템플릿 11종(기사_낙찰완료, 기사_예약취소, 기사_수수료환불완료, 기사_서류심사승인, 기사_서류심사반려, 기사_정기결제실패, 기사_멤버십결제완료, 기사_카드등록변경, 승객_입찰도착, 승객_낙찰확정, 승객_리뷰요청) — 레포 코드 변경은 없음(순수 설계·등록 작업).

## 의도적으로 검증 못 한 것

- **카카오 심사 결과** — 영업일 3~5일 소요, 반려되는 템플릿이 있으면 사유 보고 재수정 필요
- **1~9번 템플릿의 단문→장문 수정** — 검수 중엔 Aligo에서 수정 불가해 심사 결과 나온 뒤로 미룸
- **실제 발송 코드 연동** — `aligo.ts`를 OTP 전용 구조에서 여러 템플릿을 보낼 수 있는 범용 구조로 확장하는 작업, 11종 각각의 트리거 지점 연결(서류심사/정기결제/카드변경은 기존 이벤트에 훅만 추가하면 되지만, 승객 낙찰확정은 낙찰 처리부에 승객 알림 분기 자체가 없어 신규 추가 필요, 승객 리뷰요청은 "운행 완료" 판정 로직 자체가 없어 선행 설계 필요) — 전부 승인 이후로 미룸
- **로그인 리다이렉트 백 기능 부재**, **"운행완료" 탭에서 취소 배지가 안 보이는 프론트 이슈** — 대화 중 발견했지만 이번 작업 범위 밖이라 고치지 않음

---

# 카카오 알림톡 템플릿 반려 대응 + 마일스톤 템플릿 추가 (2026-10-02)

원래 요청: "승객_입찰도착 템플릿 반려됐어" — 전날(2026-10-01) 등록한 11종 중 `승객_입찰도착`이 카카오 검수에서 반려되며 시작. 반려 사유는 "다발성 메시지의 경우, 다수의 메시지가 발송될 수 있음에 대해 수신자에게 동의 또는 고지된 경우에만 승인 가능 — 수신자가 다발성 알림을 동의 및 요청하였음이 확인 가능한 내용을 메시지 내 고정값으로 기재" — 체크박스나 DB 동의 필드(`quoteAlertConsent`)만으로는 부족하고, 본문 텍스트 자체에 그 사실을 적어야 승인된다는 점을 반려 캡처에서 확인.

본문 수정안을 드린 뒤, 사용자가 "그럼 처음에 알림동의 받는 거 기본값을 꺼둘까? 입찰이 10~20개씩 오는데 사람들이 저 알림 존재를 모를 수도 있잖아"라며 논의를 한 단계 더 확장 — `quoteAlertConsent`가 `schema.prisma`에서 `@default(true)`(옵트아웃)로 되어있는 걸 코드로 확인해 사용자 추측이 맞다고 검증. 바로 이어서 "5개/10개 단위로 묶어서 보내면 안되나, 여정정보 보기 버튼 눌러서 들어가게"라는 대안을 제시 — opt-in 기본값 전환(스키마 변경)보다 **발송 빈도 자체를 마일스톤으로 묶는 쪽**이 구현도 더 단순하다는 걸 확인하고 그 방향으로 정리.

## 확정된 결정

- **`승객_입찰도착` 반려 수정**: 본문 끝에 "※ 본 메시지는 고객님께서 입찰 알림 수신에 동의하신 여정에 한해, 새 입찰이 등록될 때마다 발송됩니다." 한 줄만 추가해 재제출. 변수·버튼·보안템플릿 설정은 그대로 유지.
- **`승객_입찰마일스톤` 신규 등록**: 개별 입찰자 정보 없이 "#{고객명}님의 여정에 입찰이 총 #{입찰건수}건 등록되었습니다" + "여정 정보 보기" 버튼(`dashboard/passenger` 고정 링크) 구조. 5건·10건 시점에만 발송하고 그 이상은 발송하지 않는 상한을 본문에 "입찰 건수 알림은 최대 10건까지만 발송됩니다"로 명시 — 처음 제안했던 "5건마다 무한 반복" 대신 상한을 두기로 한 건, 인기 여정(입찰 50건 등)에서도 다발성 리스크와 알림 피로도가 무한정 커지지 않게 하기 위함(사용자 질문 "네 추천은 뭔데"에 답하며 결정).
- **`quoteAlertConsent` 기본값은 바꾸지 않기로 함**: opt-in 전환은 기존 가입자 백필 등 스키마 차원 작업이 필요해 더 무거운데, 마일스톤 템플릿으로 발송 건수 자체를 줄이는 게 더 가벼운 해결책이라 판단 — `@default(true)` 그대로 유지, 필요하면 나중에 별도로 재논의.

## 과정에서 발견·수정한 것

- **마일스톤 발송 트리거는 새 DB 필드 없이 구현 가능**: 처음엔 "마지막 알림 이후 누적 건수"를 추적할 새 카운터 필드가 필요하다고 과대평가했으나, 실제로는 입찰 생성 시점에 `prisma.bid.count({ tripId, status: { not: 'withdrawn' } })`로 현재 누적 건수를 세서 `count === 1`/`5`/`10`일 때만 발송하면 끝 — `BidStatus`에 `withdrawn`이 이미 있어 철회된 입찰은 자연히 카운트에서 빠짐.
- **Aligo 템플릿 목록 화면의 "(정상)" 표시를 템플릿별 심사 상태로 오해할 뻔함**: 사용자가 전체 템플릿이 "(정상)"으로 표시된 목록 캡처를 보내며 "이거 전체 말하는거야"라고 질문 — 확인 결과 그건 발신프로필(`@버스대절주식회사`) 채널 자체의 연결 상태이고, 템플릿 개별 승인/반려 상태는 별도 컬럼(이 화면엔 안 보임)에서 확인해야 한다고 정정.

## 산출물

재제출/신규 등록된 템플릿 2건(`승객_입찰도착` 수정 재제출, `승객_입찰마일스톤` 신규) — 레포 코드 변경 없음(순수 설계·등록 작업, 발송 트리거 로직은 설계만 하고 구현은 템플릿 승인 이후로 미룸).

## 의도적으로 검증 못 한 것

- **재제출/신규 템플릿 둘 다 심사 결과 대기** — `승객_입찰도착`은 재심사, `승객_입찰마일스톤`은 신규 심사
- **`quoteAlertConsent` 기본값 전환 여부** — 이번엔 보류로 결론 났지만, 마일스톤 템플릿으로도 체감 알림량이 안 줄면 다시 꺼낼 수 있는 논의로 남겨둠
- **마일스톤 발송 트리거 실제 구현** — `bids.ts`에 카운트 체크 추가하는 작업 자체는 설계만 하고 아직 코드 작업 안 함(템플릿 승인 이후로 전체 발송 코드 작업과 함께 진행 예정)

---

# 알림톡 실발송 연동 (2026-10-06)

원래 요청: 알림톡 템플릿 12종을 Aligo에 등록·심사 제출한 뒤, 실제 여정 이벤트가 일어나면 카카오톡으로 알림이 가도록 계획하고 구현. 코드 구조, 오류 처리, 고려사항을 먼저 정리한 플랜을 승인받은 뒤 1단계부터 진행.

## 결정

- 12종 전부 승인완료 확인 후 일괄 적용. 환불 실패는 기사에게 알리지 않고 관리자 알림만
- 발송 이력은 `AlimtalkLog` 테이블(`dedupeKey` unique)에 기록
- OTP 경로(`sendOtpSms`)는 운영 중이라 건드리지 않고, 새 범용 전송 함수를 옆에 추가
- 템플릿 활성화는 템플릿별 env 대신 `ALIMTALK_ENABLED_TEMPLATES` 콤마 목록 하나로 처리 (승인 전 실발송 방지)

## 구현

- `aligo.ts`: `postAlimtalk` — 전송 1회만 수행하고 재시도 가능 여부를 반환. 버튼은 `button_1` JSON으로 전달
- `alimtalkTemplates.ts`: 레지스트리(템플릿 코드·본문·대체문자·버튼), 렌더러(변수 누락 시 발송 차단), 활성화 체크. 지금은 `BID_ARRIVED`, `BID_MILESTONE` 두 개만 등록
- `alimtalk.ts`: `sendAlimtalk` — 활성화·번호·렌더 검사 후 로그 행 확보(중복이면 건너뜀), dev 모드 콘솔 출력, 재시도(네트워크·5xx만, 0.5s·2s), 결과를 로그에 기록. 예외를 던지지 않음
- `bids.ts`: 입찰 생성과 건수 집계를 트랜잭션 + 트립 단위 advisory lock으로 묶음. 커밋 후 `count === 1`이면 입찰도착, `5`·`10`이면 마일스톤을 발송(await하지 않음)
- `trips.ts`: 취소 라우트를 낙찰과 같은 여정 락(`trip_award`) 안으로 넣고, 환불 실패 시 취소를 확정하지 않고 502 반환

## 검증 과정에서 발견한 것

- **E2E(dev 모드)**: 순차 10건과 동시 10건 모두 1·5·10 건수에서 로그가 정확히 한 번씩 기록됨. advisory lock이 건수 판정을 직렬화한다는 확인
- **실발송 첫 시도 실패**: Aligo가 "인증되지 않는 서버 IP"로 거절 → 발송 서버 IP 등록 후 재시도. 이때 로그는 `failed`로 정상 기록됨
- **판정 버그**: 두 번째 시도에서 메시지 성공 텍스트("성공적으로 전송요청 하였습니다.")가 왔는데 `result_code === '1'`만 성공으로 봐서 `failed`로 기록됨. 알림톡 API는 `code: 0`으로 성공을 응답. 판정에 `code === '0'`을 추가하고 단위 테스트 보강. 실제로 두 메시지(입찰도착·마일스톤)는 카카오톡으로 도착 확인
- **OTP 경로에도 같은 판정 버그**: `sendViaAlimtalk`가 `result_code`만 봄. 지금은 알림톡 env가 없어 드러나지 않지만, 인증번호를 알림톡으로 바꾸면 전부 실패함. 전환 전 수정 필요로 기록
- **입찰 응답 개인정보**: 입찰 생성 응답에 `trip.passenger`가 통째로 들어가 있었음. 이번 작업에서 전화번호·동의값을 넣으면서 노출 범위가 커졌고, 기존 코드의 이메일도 같이 노출되고 있었음. 발송용 값은 별도 조회로 빼고, 응답에는 승객 정보를 싣지 않도록 수정. 수정 후 응답에 이메일·전화번호가 없는 것을 실제 요청으로 확인
- **취소 라우트 기존 결함**: 환불 실패를 `console.error`로만 남기고 여정은 `cancelled`로 바꿈(수수료는 청구된 채로 남음). 락도 없어서 낙찰과 동시에 들어오면 수수료가 결제된 뒤 취소가 그걸 환불하지 못할 수 있음. 락 공유 + 환불 성공 후에만 취소 확정으로 변경. 권한(403)과 정상 취소(200)는 확인, 환불 실패 경로(502)는 샌드박스 재현이 필요해 미검증
- **로그 정정 보류**: 판정 버그 때문에 실제로 도착한 두 건이 `failed`로 남아 있음. 로그 기록을 자동으로 바꾸는 작업이 보안 정책에 막혀 사용자가 직접 정정하기로 함

## 의도적으로 검증 못 한 것

- 대체 문자(SMS 폴백) 경로와 LMS 장문 전송 파라미터 — 카카오가 없는 번호로 테스트하지 않았고, Aligo 문서 확인도 안 됨
- 취소 라우트의 환불 실패 경로(502) — 샌드박스에서 환불 실패를 재현하지 않음
- 나머지 10종 트리거 — 등록본 원문을 받은 뒤 진행
- 인증문자·가입 환영 템플릿 — 심사 대기 중이라 활성화 전
