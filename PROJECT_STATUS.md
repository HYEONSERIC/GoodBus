# GoodBus 프로젝트 상태

이 문서는 완료된 것과 아직 완료되지 않은 것을 요약합니다.

**최종 갱신:** 2026-08-16

---

## 사업·운영 현황 (2026-08)

- **사업자 등록 완료** — PG(결제), SMS/알림톡, 호스팅 정식 연동 가능한 단계
- **제품 성숙도 (내부 평가)**
    - 클로즈드 베타: **가능** (핵심 루프·관리자 콘솔·배포 가이드 구비)
    - 유료 공개 론칭: **조기** (실 PG 키 전환·정산·보안·랜딩 정리 필요 — 결제·멤버십 강제 자체는 테스트 키로 구현 완료)
- **우선 과제:** 호스팅 → 휴대전화(알림톡/SMS) 로그인 → 토스페이먼츠 실 키 전환(가맹심사)

---

## 호스팅 (카페24) — 2026-08-16 실제 프로덕션 배포 완료

- **운영 중:** `goodbus0716.mycafe24.com`, 카페24 개발언어 VPS **DEV B (4GB)** — 월 약 66,000원
- **스택:** Ubuntu 24.04, Node.js(pm2 fork 모드), Docker Postgres(네이티브 PostgreSQL 17은 `systemctl disable`로 끔), Nginx + certbot
- **SSL:** Let's Encrypt(certbot) 적용, HSTS 포함 보안 헤더 응답 확인
- **배포 문서·스크립트:** `DEPLOYMENT.md`, `deploy/` — 실제로 이 문서 순서대로 재배포하며 검증·보강함(starter 앱 정리, `/uploads` 프록시, welcome 페이지, HSTS 상속 버그 등 — 자세한 내용은 `DEPLOYMENT.md` "10. 배포 후 체크리스트" 상단 참고)
- **서버 레벨 보안**: fail2ban(5-jail), unattended-upgrades, DB 백업 cron, 카페24 플랫폼 방화벽(22/80/443만 개방) 전부 라이브 검증 완료 — 자세한 내용은 `DEPLOYMENT.md` "10"(체크리스트 상단)·"10-1"·"10-4"·"10-5" 참고
- **아직 안 됨:** SSH 키 인증 전환(비밀번호 인증 여전히 열려있음), UptimeRobot 다운타임 모니터링, Sentry DSN 미설정

---

## 인증 — 휴대전화 / 알림톡 (코드 구현 완료, 실발송은 외부 심사 대기)

### 현재 코드 상태 (2026-08-11 구현·테스트 완료)

- 로그인(`app/login/page.tsx`)·회원가입(`app/signup/page.tsx`) 모두 전화번호 입력 → 인증 요청 → 코드(4자리) 입력 → 로그인/가입까지 실제로 동작함 (더미 alert 아님)
- 승객 회원가입은 이메일/비밀번호 그대로 필수 + **전화번호도 필수**(가입 시 OTP 인증). 기사/버스회사는 기존과 동일(전화번호는 나중에 "나의 정보"에서), 관리자는 이메일/비밀번호만 유지(전화 로그인 대상 아님)
- `User.phoneNumber`에 `@unique` + `phoneVerifiedAt` 추가, `PhoneVerification` 테이블(코드 bcrypt 해시, 만료 5분, 재전송 쿨다운 60초, 일일 5회/검증 5회 제한) 신설
- `server/src/utils/aligo.ts`가 env 변수 유무에 따라 **개발 모드(서버 콘솔 출력) → SMS 단독 → 카카오 알림톡+SMS 자동대체(`failover=Y`)** 순으로 자동 전환 — 코드 수정 없이 `.env`만 채우면 전환됨
- 지금은 알리고/카카오 관련 env가 전혀 없어서 개발 모드로 동작 중(서버 로그에 인증번호 출력)
- **다음 세션 시작 시 바로 이어갈 방법**: `.claude/roadmap.md`의 "다음 세션 시작 가이드" 참고 — 알리고 가입/카카오 채널 승인 후 env 채우는 순서와 확인 방법이 정리되어 있음

### 목표 방식

1. 사용자가 휴대폰 번호 입력
2. 서버가 OTP 생성 → **알리고** API로 발송
3. **알림톡 우선**, 실패 시 **SMS 자동 대체** — 알리고의 `failover=Y` 옵션으로 API 차원에서 처리(직접 폴백 로직 불필요)
4. 인증 성공 시 기존과 동일하게 JWT(HttpOnly 쿠키) 발급

### 사전 준비 (심사·연동, 아직 진행 전)

| 항목 | 필요 여부 | 비고 |
|------|-----------|------|
| 카카오 **비즈니스 채널** | 알림톡 시 **필수** | 채널 없이 알리고에서 알림톡 신청 불가 |
| 알림톡 **템플릿** | **필수** | 문구마다 카카오 심사 (보통 4~5일) |
| 알리고 가입 + API 키 | **필수** | `server/.env`의 `ALIGO_API_KEY`/`ALIGO_USER_ID` (카카오 지도 API와 별도) |
| 발신번호 등록 | **필수** | 서류 심사, `ALIGO_SENDER` |
| SMS만 먼저 켤 경우 | 카카오 채널 불필요 | 발신번호 + 알리고 가입만으로 가능 (더 빠름) |

### 왜 알림톡을 쓰는지 (SMS 단독 대비)

- **가격**: 알림톡이 통신사 SMS망을 안 타서 건당 단가가 대체로 더 저렴함
- **도달률**: SMS 인증번호는 통신사 스팸 필터에 걸려 지연/차단되는 사례가 늘고 있음. 알림톡은 심사된 공식 채널이라 그런 문제가 적음
- **신뢰도**: 낯선 번호발 SMS보다 공식 카카오 채널 메시지가 스미싱 의심을 덜 받음
- 초기 심사 비용은 일회성이고, `failover=Y`로 SMS 폴백까지 이미 자동화돼 있어 승인 후 운영 부담은 SMS 단독과 비슷하면서 이점만 추가됨

---

## 결제·멤버십 (2026-08-13, 토스페이먼츠 테스트 키로 구현 완료)

### 현재 코드 상태

- **PG: 토스페이먼츠**, 빌링키(정기결제) 기반. 카드 원본정보는 서버에 저장되지 않음 — Toss 결제창(`requestBillingAuth`)에서 카드 등록 후 암호화된 `billingKey` 토큰만 우리 서버(`BillingKey` 모델)에 저장. `PaymentCardsPanel`의 localStorage 스텁 폼은 제거되고 실제 SDK 연동으로 교체됨(`components/PaymentCardsPanel.tsx`, `lib/toss.ts`)
- **멤버십 4단계**(베이직 무료/플러스/프리미엄/비즈니스)가 서버에서 실제로 강제됨 — 동시 활성 입찰 건수 한도(10/15/20/25건, `server/src/utils/membershipLimits.ts`)를 `POST /bids`에서 매 요청마다 체크. 가격은 아직 테스트용(100/200/300원, `server/src/utils/paymentPricing.ts`) — 실 가격 미정
- **업그레이드**는 즉시 전액 청구 + 즉시 전환(안내문구+체크박스로 명시적 동의 후 진행, `PaymentTransaction.metadata`에 동의 기록 남음), **다운그레이드**는 즉시 결제 없이 예약만 되고 다음 결제일에 정기결제 크론이 전환+과금 (`MembershipSubscription.pendingPlan`)
- 구독 해지 시 유예기간(다음 결제일까지) 동안 기존 혜택 유지 + "다시 구독하기"(무료 재활성화) 가능, 유예기간 지나면 크론이 자동으로 베이직 강등
- **차량별 최저입찰금액 확인**: 멤버십 티어와 무관한 독립 월 구독 상품(400원/월, `MinBidAddonSubscription`)으로 멤버십 페이지에 5번째 항목으로 노출 — 구독/해지/재구독 동일 패턴
- 정기결제 실행은 `server/src/prisma/run-recurring-billing.ts`(멤버십+애드온 공용, 독립 스크립트+시스템 crontab, `npm run db:run-recurring-billing`) — pm2 상시 프로세스 아님, `DEPLOYMENT.md` 8-1절 참고
- 웹훅(`POST /payments/webhook`, HMAC 서명 검증)은 등록돼 있으나 보조 채널 — 실제 결제/구독 확정은 confirm/billing API의 동기 응답이 authoritative
- **아직 테스트(test_) 키 상태** — `server/.env`의 `TOSS_SECRET_KEY`/`TOSS_WEBHOOK_SECRET`, 루트 `.env.local`의 `NEXT_PUBLIC_TOSS_CLIENT_KEY`가 전부 테스트 키. 실 결제는 발생하지 않음(가상 승인). **2026-08-16 프로덕션 서버에 반영 + 실제 카드 등록 위젯까지 브라우저로 검증 완료** — 반영 과정에서 클라이언트 키 오타(문자 O를 숫자 0으로 오독)로 인한 Toss 401 에러를 실제로 겪고 수정함(`DEPLOYMENT.md` 트러블슈팅 표 참고)
- **낙찰 수수료(10%) 자동 결제** (2026-08-13) — `POST /trips/:id/award`에서 낙찰 확정 **전에** 낙찰자(기사/회사) 빌링키로 `입찰가(만원) × 10%`를 선결제하고, 성공해야 낙찰이 확정됨(`server/src/utils/adminRevenue.ts`의 `DEFAULT_PLATFORM_COMMISSION_RATE`와 동일 소스). 카드 미등록 상태에서는 애초에 입찰 자체가 차단됨(`POST /bids`). 결제 실패 시 낙찰은 성립하지 않고 승객·기사 양쪽에 알림(`NotificationType.AWARD_PAYMENT_FAILED`) 발송. 낙찰된 여정이 취소되면 사유가 "기사님 사유로 취소"가 아닌 한 토스 결제취소 API로 자동 환불(`PATCH /trips/:id/cancel`). 실제 청구/환불 흐름까지 curl로 end-to-end 검증 완료

### 남은 작업

1. **가맹 심사 신청** → 실 키 발급 후 env 값만 교체(코드 변경 없음)
2. 실 가격 확정 (현재 100/200/300/400원은 테스트용 placeholder)
3. 관리자 콘솔에 결제/구독/환불 조회 화면 (현재 `PaymentTransaction`은 DB에만 쌓이고 관리자 UI 없음)
4. `AdminRevenuePanel`의 GMV×10% "추정 매출"이 실제 `PaymentTransaction`(platform_commission) 기록과 별개로 계산됨 — 실 결제 도입 후 두 수치 정합화(reconcile) 필요

---

## 권장 작업 순서 (2026-08 기준)

1. **호스팅** — 카페24 VPS, 도메인·SSL, pm2, 스모크 테스트
2. **병행 신청** — 카카오 비즈니스 채널, 알리고 가입, 알림톡 템플릿, 토스페이먼츠 가맹심사
3. **휴대전화 로그인** — OTP API·UI는 **구현·테스트 완료**(2026-08-11), 심사 통과 후 `server/.env`에 알리고/카카오 값만 채우면 실발송 전환 (`.claude/roadmap.md`의 "다음 세션 시작 가이드" 참고)
4. **출시 전 정리** — 랜딩 가짜 지표·플레이스홀더 제거, 실 가격 확정 (~~약관·개인정보~~ 페이지는 2026-08-14 추가 완료, 법률 검토는 남음)
5. **결제 실 키 전환** — 토스페이먼츠 가맹심사 통과 후 env 값 교체 (기능 자체는 테스트 키로 구현·테스트 완료, **2026-08-13**)

---

## 완료됨

- **핵심 서비스 흐름**
    - 승객이 여정을 생성
    - 기사/버스회사가 입찰
    - 승객이 입찰을 낙찰
- **역할 기반 접근**
    - 승객/기사/버스회사/관리자 역할
    - 보호된 라우트에 대한 서버 권한 검사
- **인증**
    - JWT + HttpOnly 쿠키 로그인/로그아웃
- **백엔드**
    - Node.js + Express API
    - Prisma ORM + PostgreSQL
- **데이터베이스**
    - User, Trip, Bid, Notification 모델
    - 테스트 계정 시드 데이터
- **알림**
    - 입찰 생성/낙찰에 대한 인앱 알림
    - SMTP 기반 이메일 발송 훅(환경변수 필요)
- **프론트엔드**
    - Next.js App Router
    - 역할별 대시보드 + 관리자 콘솔
    - Tailwind CSS + shadcn UI
- **관리자 콘솔** (`/admin`, `hooks/useAdminDashboard.tsx`, `components/admin/panels/*`)
    - **요약**: 오늘/이번 주 GMV(만원), 미답변 문의·승인 대기 배지, 최근 여정/입찰 → 사용자·입찰 탭 딥링크
    - **사용자**: 검색/필터/차단, 상세(프로필·차고지·차량·서류), 승객 여정 요약, **낙찰 건수·총 거래액**, 리뷰 요약, 활동(여정/입찰/리뷰, 최대 50건)
    - **입찰/낙찰**: 검색·필터(`bidderId`, `passengerId`, `tripId` 등), 사용자·여정 간 딥링크, 금액 만원 표기
    - **알림 히스토리**, **기사/회사 승인**(한국어 상태 라벨), **FAQ·공지 CRUD**, **문의**(검색·상태·미답변 우선 정렬·답변)
    - **매출·거래**: 월별 GMV·추정 수수료(10%), `Trip.awardedAt` 기준(없으면 `createdAt` 대체·건수 안내), 월별 목록·기간/월 **CSV**(합계 행)
    - **Super** 관리자 계정 생성; **CustomerSupport**는 매출 탭만 UI에서 숨김
    - **공통 UX**: 고정 사이드바·본문 스크롤, 로그아웃 하단 배치, `AdminErrorBanner` / 로딩 스켈레톤, URL 쿼리 북마크 (`lib/adminNav.ts`)
- **승객 UX**
    - 입찰 목록/상세에 **기사·회사 평균 평점** 표시 (`GET /reviews/drivers/summary`, 상세 `GET /reviews/drivers/:id`)
- **UI/UX 리디자인**
    - 상단바 + 사이드 메뉴 + 하단 탭
    - 필터 UI 중앙 정렬 및 카드 컴팩트화
    - 한국어 UI 정리
    - 기사/회사 나의정보-정보수정 화면 리디자인
    - 멤버십 화면 상단 뒤로가기/홈 아이콘 네비게이션 통일
- **Kakao 지도**
    - 여정 생성 시 주소 자동완성 (Kakao Places)
    - 기사/회사 차고지 주소 자동완성
- **프로필/서류 관리**
    - 기사/회사 프로필 정보 저장 API (`/profile/me`)
    - 프로필 사진, 차량 사진(최대 4장) 업로드/유지
    - 운전자격증/사업자등록증 업로드 및 상태 연동
    - 기사 한마디/연락처(휴대전화번호) 저장 및 관리자 조회
- **승객 여정 관리** (2026-08-09)
    - 여정 취소를 소프트 삭제로 전환 — `Trip.status=cancelled` + 취소 사유·시각 보존, 입찰·채팅·리뷰 데이터 유지(하드 삭제는 `npm run db:purge-cancelled-trips`로 이관)
    - 여정 수정 진입점 추가(날짜·인원·차량·결제방법·경유지·추가요청, 기존 `PATCH /trips/:id` 활용)
- **기사/회사 입찰 정합성** (2026-08-09)
    - 경쟁 입찰 마스킹 — `GET /trips`에서 기사/회사는 본인 입찰 외 타 입찰자의 가격·연락처·신원을 볼 수 없음(승객·관리자는 그대로)
    - 회사 화면을 기사 화면과 정합화 — 실제 리뷰 연동(하드코딩 별점 제거), 입찰 실패 에러 처리, 서류 심사대기/미제출 상태 구분, 1:1 문의 활성화
    - 미구현 상태였던 입찰 사진 첨부 UI 제거
- **파일 스토리지**
    - 로컬 업로드 + S3 전환 가능한 스토리지 추상화
    - 서버 재시작 후에도 업로드 파일 유지 구조 적용
- **로컬 개발**
    - Docker Compose로 Postgres 실행
    - 프론트/백엔드 실행 스크립트
- **테스트·CI·에러 트래킹** (2026-08-10)
    - 프론트·백엔드 Vitest 유닛 테스트 도입(순수 로직 위주, 총 48개) — `npm test`(루트) / `cd server && npm test`
    - GitHub Actions CI(`.github/workflows/ci.yml`) — `main`/`aligo` push·PR에서 lint+build+test 자동 실행 (배포 자동화(CD)는 아직 없음)
    - Sentry 에러 트래킹 도입(프론트 `@sentry/nextjs`, 백엔드 `@sentry/node`) — 프로덕션 DSN 설정 시에만 활성화
- **관리자 감사 로그** (2026-08-10)
    - `AdminAuditLog` 모델 + `recordAdminAudit` 유틸(fire-and-forget) — 사용자 차단/해제, 서류 심사, 서브관리자 생성, 공지/FAQ CRUD, 문의 답변 5개 지점 기록
    - `GET /admin/audit-log`(Super/Operations 전용) + `AdminAuditLogPanel` 조회 화면(페이지네이션 포함). 행위별 필터는 아직 없음(최근순 목록만)
- **입찰·문의 목록 페이지네이션** (2026-08-10)
    - `/admin/bids`(최대 200, 기본 50) · `/admin/support-inquiries`(최대 500, 기본 300) 모두 "더보기" 방식으로 확장 조회 가능, `AdminActivitySectionFooter` 공용화
- **회원가입 이름 저장** (2026-08-10)
    - `displayName`이 이제 서버에 실제로 저장됨(이전엔 입력해도 버려짐). 단, 사이드바 등 화면 표시는 여전히 `email` 우선이라 표시 fallback은 별도 후속 작업 필요(아래 "알려진 버그" 참고)
- **결제·멤버십 — 토스페이먼츠 연동** (2026-08-13)
    - 빌링키 기반 카드 등록, 멤버십 4단계 구독(업그레이드 즉시전환/다운그레이드 예약), 독립 애드온 구독, 해지·재구독·전환예약취소, 정기결제 크론, 웹훅. 자세한 내용은 위 "결제·멤버십" 섹션 참고. **아직 테스트 키 상태**
- **낙찰 수수료(10%) 자동 결제·환불** (2026-08-13)
    - 카드 등록해야 입찰 가능 → 낙찰 확정 전 수수료 선결제(실패 시 낙찰 불성립+양쪽 알림) → 여정 취소 시 사유별(기사 사유만 미환불) 자동 환불. 위 "결제·멤버십" 섹션 참고
- **회사소개/오시는길/약관 페이지 + 푸터 개편** (2026-08-14)
    - 사업자등록증(649-86-03636, 법인명 버스대절 주식회사, 대표 최덕현) 기준 정보로 `/company`(회사소개), `/location`(오시는길, 카카오맵 길찾기 링크), `/legal/terms`(이용약관), `/legal/privacy`(개인정보처리방침) 신규 페이지 추가
    - 홈 푸터를 `components/marketing/SiteFooter.tsx`로 분리해 4열 구성(브랜드/고객센터·운영시간/회사/약관) + 아이콘, `tel:`/`mailto:` 링크, 맨 위로 버튼으로 리디자인. `components/marketing/SiteHeader.tsx`도 분리
    - 회원가입/로그인/버스·회사 가입(`components/auth/AuthScaffold.tsx`)은 폼 전환에 집중하도록 푸터 제거, 헤더만 유지
    - **통신판매업 신고번호 미보유** — 사업자등록증과 별개로 전자상거래법상 신고 필요, 신고 완료 전까지 푸터/약관에서 항목 제외
    - 이용약관·개인정보처리방침은 표준 템플릿 초안 — 정식 공개 전 법률 검토 필요
- **기본 SEO 세팅** (2026-08-14)
    - `app/robots.ts`, `app/sitemap.ts` 추가 — 정적 라우팅으로 `/robots.txt`, `/sitemap.xml` 자동 생성 (`/admin`, `/dashboard`, `/api`, `/payments`는 크롤링 제외)
    - `lib/siteConfig.ts`로 사이트 URL·설명·사업자 정보 중앙화 (`NEXT_PUBLIC_SITE_URL` 미설정 시 `https://goodbus0716.mycafe24.com`로 폴백 — **프로덕션 서버 `.env`에 `NEXT_PUBLIC_SITE_URL` 채워주면 더 안전**)
    - `app/layout.tsx`에 `metadataBase`, keywords, Open Graph, Twitter 카드 메타데이터 추가; 하위 페이지 title은 템플릿(`%s | 버스대절`)을 쓰도록 정리
    - 홈페이지에 Organization/WebSite JSON-LD 구조화 데이터 추가 (`app/page.tsx`)
    - **참고**: "버스대절" 검색 시 경쟁사가 상단에 뜨는 건 대부분 구글 애즈 유료광고이고, 이번 작업은 무료 SEO 기초일 뿐 — 색인 반영까지 수 주~수개월 소요, Search Console 등록·소유권 확인은 별도로 필요
- **보안 강화 — 백엔드 취약점 5건 수정** (2026-08-15)
    - 관리자 API(`GET /admin/users`, `/admin/verifications`, `/admin/bids`)와 `GET /trips`의 미검증 쿼리스트링 enum 캐스팅 제거 — 잘못된 값 하나로 백엔드 프로세스 전체가 죽거나(admin, `requireAdminRole` 없이 아무 관리자나 유발 가능) 요청이 응답 없이 무한 대기하던(`GET /trips`, 관리자 아닌 일반 로그인 사용자도 트리거 가능) 문제 수정. `server/src/index.ts`에 `unhandledRejection` 전역 핸들러도 방어심층으로 추가
    - 결제/과금 라우트(`/payments/subscribe`, `/payments/addon/min-bid/subscribe`, `/trips/:id/award`)에 Postgres 어드바이저 락(`server/src/utils/paymentLock.ts`) 도입 — 동시 요청 레이스로 인한 중복 청구 방지. 실제 동시 요청으로 테스트해보니 락만으로는 "이미 활성 구독인데 재과금되는 것"까지는 못 막는다는 걸 발견해 각 라우트에 "이미 활성 상태면 스킵" 가드도 함께 추가
    - 전화 OTP 요청(`POST /auth/phone/request-otp`)에 IP 기준 레이트리밋 추가(전화번호 단위 제한만으로는 번호를 계속 바꿔가며 무제한 SMS 발송이 가능했음, 알리고 실키 전환 시 비용 공격 벡터), 가입 여부가 응답 형태(404 vs 400, `devMode` 필드 유무)로 노출되던 것도 완전히 동일한 응답으로 통일
    - 계정 차단이 기존 로그인 세션에 즉시 반영되도록 `requireAuth`가 매 요청마다 최신 계정 상태를 DB에서 조회하도록 변경(기존엔 JWT 만료(7일) 전까지 차단 후에도 세션이 그대로 유효)
    - JWT 서명/검증 알고리즘(`HS256`) 명시적 고정
    - 전 항목 실제로 서버를 띄우고 동시 요청·위조 토큰·DB row 대조 등으로 재현·검증(정적 분석/테스트 통과만으로 끝내지 않음), 검증 과정에서 `express-rate-limit`의 IPv6 우회 경고를 추가로 발견해 같이 수정
- **왕복 여정 낙찰 오류 수정** (2026-08-15)
    - 왕복 여정은 가는 편/오는 편이 별개의 Trip으로 생성되는데, 기사가 왕복 총액으로 입찰해도 실제 입찰(Bid)은 가는 편에만 걸려 있었음 — 승객이 낙찰하면 가는 편만 예약 확정되고, 오는 편은 입찰이 하나도 없는 채로 영원히 견적 탭에 "아직 견적 받는 중"으로 남는 버그(사용자 리포트로 발견, 실제 API 재현으로 확인)
    - 가는 편 낙찰 확정 시 오는 편을 같은 기사로 자동 낙찰하도록 수정(왕복 총액이 이미 낙찰가에 포함돼 있으므로 오는 편에 수수료 재청구 없음), 오는 편에 기사가 별도로 걸어둔 입찰이 있었다면 자동으로 낙찰 실패(lost) 처리
- **인프라 사고 예방·탐지·복구 체계** (2026-08-15)
    - **백업**: `server/scripts/backup-db.sh`(named volume이라 `docker exec pg_dump`) + `server/scripts/restore-db-rehearsal.sh`(별도 포트에 복원 검증 후 정리) 신규 추가, 로컬에서 실제 실행해 백업 생성→복구까지 검증 완료. **crontab 등록·서버 밖(로컬) 보관 설정은 사용자가 VPS에서 직접 해야 함** — 절차는 `DEPLOYMENT.md` "8-2" 참고
    - **npm audit 정리**: 재조사 결과 `server/`의 27건 중 26건이 `npm audit fix`(non-breaking)로 해소됨 — `tar`(bcrypt 설치 의존성)는 `package.json` `overrides`로 별도 고정, 나머지는 body-parser/qs/path-to-regexp/brace-expansion 등 patch 버전 갱신. `nodemailer` 1건만 breaking major(9.0.5) 필요해 보류, 매주 월요일 `.github/workflows/dependency-audit.yml`(non-blocking 리포트)로 추적
    - **Dependabot**: `gh api`로 확인해보니 실제로 꺼져 있었음(문서상 "미확인"이 아니라 확정) — `vulnerability-alerts`/`automated-security-fixes` 활성화 완료, `.github/dependabot.yml` 추가(root+server+github-actions 주간 스캔)
    - **Nginx 방어심층**: `deploy/nginx/goodbus.conf`에 보안 헤더(X-Frame-Options 등) + 레이트리밋(`/api/auth/` 2r/s, 나머지 10r/s) 추가, 문법 검증 완료. HSTS는 certbot 적용 후 HTTPS 안정성 확인 전까지 의도적으로 보류
    - **문서화**: `DEPLOYMENT.md`에 SSH 하드닝 절차(10-2), 다운타임 모니터링 절차(10-3), 보안 패치 롤백 금지 정책(13), 침해사고 대응 런북(14) 신설. `CLAUDE.md`에도 관련 아키텍처 패턴 반영
    - **사용자가 VPS/제3자 서비스에서 직접 해야 하는 것** (이 세션은 로컬 리포 작업만 가능): SSH 키 인증 전환, 백업 cron 실제 등록, UptimeRobot 가입·연결, Sentry DSN 생존 확인(OS 재설치로 프로덕션 env가 새로 만들어져 재확인 필요), Kakao/Toss API 키 재발급 — 전부 `DEPLOYMENT.md` 10-1~10-3에 체크리스트로 정리됨
    - **부수적으로 발견한 버그**: `.gitignore`의 `.env*`가 `.env.production.example`/`server/.env.example`까지 지워버려서 두 파일이 **한 번도 git에 커밋된 적이 없었음** — `DEPLOYMENT.md`가 시키는 `cp server/.env.example server/.env`가 신규 clone(재설치 시나리오 포함)에서 파일 자체가 없어 실패하는 상태였음. `!.env*.example` 예외 추가하고 두 파일을 커밋해 수정
- **봇 차단·애플리케이션 보안 종합 정리** (2026-08-15, 인프라 계획의 Phase 1 — 로컬 레포 작업분 전부 완료·검증)
    - `helmet` 도입(`server/src/index.ts`, HSTS는 HTTPS 안정성 확인 전까지 의도적으로 끔), `next.config.ts`에도 Nginx와 동일한 보안 헤더를 중복 정의(카페24가 재설치할 때마다 Nginx site config를 초기화하는 전례가 있어 git에 남는 이중 방어선)
    - 로그인(`/auth/login`)·회원가입(`/auth/signup`)·전화로그인(`/auth/phone/login`)에도 IP 레이트리밋 확장(`server/src/utils/ipRateLimit.ts`로 공용화), 로그인 실패를 `[SECURITY] failed login ip=... email=...` 형식으로 로그 — VPS의 fail2ban 커스텀 jail이 이 포맷을 그대로 사용 예정. 실제 curl로 20회에서 429 걸리는 것, 실패 로그 찍히는 것 확인 완료
    - 업로드 매직바이트 검증 추가(`server/src/utils/uploadFileFilter.ts`) — 지금까지 파일 확장자를 클라이언트가 신고한 `Content-Type`만으로 결정해서, 위조된 mimetype으로 임의 파일이 이미지인 척 저장될 수 있었음. 실제 첫 바이트 시그니처(JPEG/PNG/WEBP/GIF)를 재검증하도록 `services/storage.ts`에서 강제. 이 과정에서 `verification.ts`(신분증·사업자등록증 업로드)가 다른 라우트들과 다르게 `multer.diskStorage`를 직접 쓰고 있어 검증을 못 걸던 것도 발견해 `memoryStorage`+공용 `storage.saveFile`로 통일(부수적으로 누락돼 있던 try/catch도 같이 해결). 위조 파일 거부(400)·정상 파일 통과(200) 둘 다 실제 curl로 검증
    - Nginx에 알려진 스캐너 UA(sqlmap/nikto/nmap 등)·빈 UA·흔한 취약점 스캔 경로(`/wp-admin`, `/.env`, `/.git` 등) 차단(`444`, 무응답 종료) 추가 — Docker로 실제 요청 보내 정상 트래픽은 통과, 스캐너 패턴은 연결 즉시 종료되는 것 확인. UA 위조는 쉬워서 진짜 방어선이 아니라 노이즈 감소용임을 명시
    - `profile.ts`·`chats.ts`에 Zod 스키마 적용(admin.ts는 크래시 유발 패턴 재확인 결과 이미 없어서 보류, CSRF도 GET 기반 상태변경 라우트 없음 재확인)
    - **Cloudflare Turnstile 도입**(무료, 도메인 구매 불필요) — `signup-business`(기사/버스회사 가입)가 전화인증 비용장벽이 없는 유일한 가입 경로라 가장 취약했음. `server/src/utils/turnstile.ts`(시크릿 미설정 시 항상 통과 — Aligo/Sentry와 동일한 "옵션 env 없으면 기능 꺼짐" 패턴), `components/auth/TurnstileWidget.tsx` 신설. **실제 사이트/시크릿 키 발급(무료 Cloudflare 계정 가입)은 아직 안 됨** — 키 없으면 위젯 자체가 안 뜨고 서버 검증도 스킵되는 상태로 당분간 유지
    - **Phase 2(재설치 완료 후 VPS 배포 시 반영)**: 네이티브 PostgreSQL 17 끄기(Docker와 5432 충돌), fail2ban jail 확장(nginx-http-auth/nginx-limit-req/nginx-botsearch + 위 로그인 실패 로그 기반 커스텀 jail), unattended-upgrades. **2026-08-16에 전부 완료 — 아래 항목 참고.** **Phase 3(안정화 후 별도, 미착수)**: 도메인 구매→Cloudflare 전체 프록시(무료 DDoS 완화+WAF+Bot Fight Mode), Turnstile 키 실제 발급
- **실제 프로덕션 배포 + 인프라 보안 강화 완료** (2026-08-16)
    - `DEPLOYMENT.md` 순서대로 `goodbus0716.mycafe24.com`에 실제 배포. 문서에 없던 인프라 이슈 5건을 배포 중 새로 발견·수정(카페24 starter 앱의 포트 3000 선점, 네이티브 Postgres 5432 충돌, `/uploads` 프록시 누락, welcome 페이지 우선순위, Nginx `add_header` 상속 버그로 인한 HSTS 미노출) — 전부 `DEPLOYMENT.md` "10. 배포 후 체크리스트"/트러블슈팅 표에 반영
    - **fail2ban**: 카페24가 이미 설치해둔 fail2ban + `nginx-http-auth`/`nginx-limit-req`/`nginx-botsearch` 필터를 활성화하고, 우리 앱 전용 `goodbus-login` jail(로그인 실패 로그 기반) 추가. 과정에서 `backend=auto`가 조용히 journald만 보고 지정한 로그 파일은 무시하는 버그를 발견 — `backend=polling`으로 전 jail 수정. 실제 8회 실패 로그인으로 밴 발생시키고 해제까지 라이브 검증(`DEPLOYMENT.md` "10-4")
    - **unattended-upgrades**: 카페24가 이미 설치·보안오리진까지 구성해둔 상태였음 — `Automatic-Reboot false` 명시적으로 켜고 `--dry-run`으로 보안 오리진만 골라내는 것 확인(`DEPLOYMENT.md` "10-5")
    - **DB 백업 cron**: `crontab`에 03:00 등록 + 수동 1회 실행으로 실제 덤프 파일 생성·무결성 확인
    - **카페24 플랫폼 방화벽**: ON 전환 + INBOUND 22/80/443 허용 규칙 추가, 나머지 전부 차단. 콘솔 UI가 직관적이지 않아 절차를 `DEPLOYMENT.md`에 기록
    - **Kakao/Toss API 키**: 프로덕션 서버에 반영하고 실제 동작(카카오 장소검색 API 호출 성공, Toss 카드 등록 위젯 노출)까지 확인. 반영 과정에서 Toss 클라이언트 키 오타(문자 O ↔ 숫자 0) 하나로 실제 401 에러가 발생했고, 브라우저 네트워크 탭으로 원인 특정 후 수정
    - **nodemailer 취약점 발견·수정**: 위 8/15 npm audit 정리 때 보류됐던 `nodemailer`(당시 breaking major라 후순위)를 재점검 — high severity 8건(SMTP 인젝션, addressparser DoS, TLS 검증 미흡 등) 중 실제 사용 패턴(`server/src/utils/email.ts`, 단순 `createTransport`+`sendMail`)에서 트리거 가능한 건 주소 파싱 관련 2건으로 좁혀 확인 후 `^6.9.8`→`^9.0.5` 업그레이드. 타입체크·빌드·모듈 로드·기존 테스트 30개 전부 통과, `npm audit` 결과 root+server 둘 다 0 vulnerabilities
    - **재확인 결과 아직 안 된 것**: SSH 비밀번호 인증이 여전히 열려있음(`PasswordAuthentication yes`), UptimeRobot 미가입, `SENTRY_DSN`/`NEXT_PUBLIC_SENTRY_DSN` 프로덕션에 미설정(OS 재설치로 새로 만들어진 env라 값 자체가 없음)

## 미완료 / 실서비스 갭

- **배포**
    - ~~프로덕션 배포 미실행~~ **2026-08-16 실제 배포 완료**(위 "호스팅" 섹션·"완료됨" 참고)
    - CI(lint+build+test)는 GitHub Actions로 도입됐지만, 배포 자동화(CD)는 없음 — 여전히 수동 배포(`deploy/scripts/deploy.sh` 또는 수동 `git pull`+`build:prod`+`pm2 restart`)
    - `DEPLOYMENT.md` "10. 배포 후 체크리스트" 중 미완료 항목: 승객 견적 생성→기사 입찰→승객 낙찰 전체 흐름 브라우저 검증, 관리자 콘솔 UI(매출 탭 등) 브라우저 검증, Sentry 에러 리포트 실제 확인
- **휴대전화 로그인**
    - 코드(스키마·API·UI) **구현·테스트 완료**, 현재는 개발 모드(서버 로그 출력)로 동작 — 자세한 내용은 위 "인증 — 휴대전화 / 알림톡" 섹션 참고
    - 실제 알림톡/SMS 발송은 알리고 가입·카카오 채널·템플릿 심사 **대기/예정** (외부 절차, 코드 아님)
- **보안 강화** (2026-08-15에 코드 레벨 갭 다수 해소 — 위 "완료됨"의 "보안 강화 — 백엔드 취약점 5건 수정" 참고)
    - OTP 요청은 IP 레이트리밋이 추가됐지만(위 참고), **로그인 등 나머지 라우트는 여전히 레이트 리밋/브루트포스 방어 없음**
    - 쿠키 기반 외 추가 CSRF 방어 없음
    - 관리자 행위 감사 로그는 도입됐지만(위 "완료됨" 참고), 보안 이벤트(로그인 실패·비정상 접근 등) 모니터링은 여전히 없음
    - **2026-08-14 RCE 침해사고 후속** — 취약점 자체와 DB/JWT/root SSH 비밀번호는 사고 당일, 코드 레벨 후속과 대부분의 인프라 항목(백업 cron 실제 등록, fail2ban 확장, unattended-upgrades, 카페24 방화벽, nodemailer)은 2026-08-15~16에 완료(위 "완료됨" 참고). **여전히 남은 것**: ① **SSH 키 인증 전환** — 2026-08-16 재확인 결과 `PasswordAuthentication yes`/`PermitRootLogin yes` 그대로, 다른 항목이 다 끝난 지금 우선순위 1순위(절차는 `DEPLOYMENT.md` "10-2") ② UptimeRobot 등 다운타임 모니터링 가입("10-3") ③ Kakao/Toss API 키가 실제로 침해사고 이후 재발급된 값인지 미확인(현재 반영된 값은 로컬 개발 `.env`에서 그대로 가져온 것) ④ 프로덕션 `SENTRY_DSN`/`NEXT_PUBLIC_SENTRY_DSN` 여전히 미설정(OS 재설치로 env가 새로 만들어져 빈 상태). 상세는 `DEPLOYMENT.md` "10-1" 참고
- **OAuth / SSO**
    - Google/Kakao 등 소셜 로그인 없음
- **결제** (2026-08-13에 토스페이먼츠 + 낙찰 수수료 자동화로 대부분 구현 — 위 "결제·멤버십" 섹션 참고)
    - 아직 **테스트 키** — 실 가맹심사·키 전환 전
    - 실 가격 미정 (현재 100~400원대 placeholder)
    - 관리자 콘솔에 결제/구독/수수료 내역 조회 UI 없음(`PaymentTransaction`은 DB에만 존재) — 환불 자체는 취소 흐름에서 자동화됨
    - 영수증 발급 흐름 없음
- **관측성**
    - Sentry로 에러 추적은 도입됨(위 "완료됨" 참고), 다만 중앙 로깅·메트릭(응답시간, 처리량 등)은 여전히 없음
- **확장성**
    - 로드밸런싱/수평 확장 없음
- **이메일**
    - SMTP 기본 설정 미구성
    - 프로덕션 이메일 서비스 연동 없음
- **데이터 라이프사이클**
    - 데이터 보관/아카이빙 정책 없음
    - Kakao 지도 프로덕션 도메인 연결 필요
- **대외 공개**
    - 랜딩 페이지 가공 통계·플레이스홀더 카피 정리 필요
    - ~~이용약관·개인정보처리방침·사업자 정보 페이지 필요~~ **2026-08-14에 페이지 추가 완료** — 다만 약관류는 표준 템플릿 초안이라 법률 검토 필요, 통신판매업 신고번호는 아직 없어 미노출
    - **SEO**: robots.txt/sitemap.xml/메타데이터/구조화 데이터는 2026-08-14에 추가 완료(위 "기본 SEO 세팅" 참고). 아직 남은 것: Google Search Console 소유권 확인·sitemap 제출, 구글 비즈니스 프로필 등록, (선택) "버스대절" 키워드 구글 애즈 집행 — 전부 계정 소유자(사용자) 본인이 직접 해야 하는 절차
- **관리자·운영 (추가 예정)**
    - `adminRole`별 **API** 권한 분리(Finance/Operations 등); 감사 로그 조회 등 일부 라우트에만 `requireAdminRole` 적용, 전체 RBAC는 아님
    - 감사 로그 조회 화면에 행위 종류·기간·관리자별 **필터** 없음(현재는 최근순 목록+페이지네이션만)
    - ~~결제 연동 시 취소·환불 및 취소분 매출 반영~~ **낙찰 수수료 환불은 자동화 완료(2026-08-13)** — `AdminRevenuePanel`의 GMV 추정치와의 정합화는 남음(위 "결제·멤버십" 남은 작업 참고)

## 알려진 버그 / 결정 사항 (2026-08-06 논의)

- **회원가입 "이름" 필드 미저장 — 저장 자체는 2026-08-10에 수정 완료.** `authAPI.signup`이 이제 `displayName`을 서버로 전달하고 `User.displayName`에 저장됨. 다만 사이드바 등 화면은 아직 `user.email`을 그대로 표시하므로(예: `components/passenger/PassengerDashboardContent.tsx`), "이름 우선 → 없으면 이메일 fallback" 표시 로직은 여전히 후속 작업으로 남아 있음.
- **휴대전화 로그인 설계 방향 확정 — 2026-08-11에 이 방향대로 구현·테스트까지 완료**
    - 승객 회원가입은 계속 이메일 기반, 단 **전화번호도 필수 입력**으로 추가 → 가입 후 이메일 로그인 / 전화번호(OTP) 로그인 **둘 다** 가능한 단일 계정
    - 관리자 로그인은 SMS 업체 장애 대비를 위해 **이메일/비밀번호 유지** (전화번호 로그인 미적용)
    - 기사/버스회사는 기존 "나의 정보" 화면에 이미 전화번호 입력란이 있어 별도 화면 불필요
    - 별도의 "전화번호만으로 간편가입" 경로는 만들지 않기로 함 (기존 승객 전원 재등록 부담 + 관리자 fallback 필요성 때문)
    - SMS 발송은 **알리고(Aligo)** 사용 예정, 알림톡 우선 + SMS 폴백(카카오 채널·템플릿 심사 대기 중에는 개발모드로 서버 로그에 인증번호 출력)

## 기술 메모

- Docker는 **PostgreSQL DB만** 로컬(및 배포 시 서버)에서 실행 — `server/docker-compose.yml`, 컨테이너명 `goodbus-postgres`
- **Next.js·Express는 Docker로 묶지 않음** — `npm` / `pm2`로 직접 실행 (의도된 구성)
- 개발: `npm run dev:all` (프론트 :3000 + API :4000)
- TypeScript: Next·Express 모두 TS 작성, 빌드 시 JS로 변환 후 Node 실행
- Node.js는 언어가 아니라 **JavaScript/TypeScript 실행 환경**(브라우저 vs 서버)

## 다음 단계

1. ~~카페24 VPS 결제·SSH → 도메인·SSL → `build:prod` + pm2 + Nginx~~ **2026-08-16 실제 배포 완료** (위 "호스팅" 섹션 참고)
2. **SSH 키 인증 전환** — 유일하게 남은 인프라 보안 항목, 락아웃 위험 있어 절차대로 순서 준수 (`DEPLOYMENT.md` "10-2")
3. UptimeRobot 가입, Sentry DSN 재발급, Kakao/Toss 키 재발급 여부 확인 — 전부 사용자가 콘솔에서 직접 해야 하는 절차
4. `DEPLOYMENT.md` "10. 배포 후 체크리스트" 나머지 — 견적→입찰→낙찰 전체 흐름, 관리자 콘솔 UI 브라우저 검증
5. 카카오 비즈니스 채널 + 알리고 신청, 알림톡 인증 템플릿 심사 (병행)
6. ~~휴대전화 OTP 로그인 API·UI~~ **구현·테스트 완료(2026-08-11)** — 심사 통과 후 env만 채우면 개발 모드 → 실발송 전환 (`.claude/roadmap.md` 참고)
7. 랜딩 정리, 실 가격 확정 (~~약관 정리~~ 페이지는 2026-08-14 추가 완료, 법률 검토·통신판매업 신고번호 반영은 남음)
8. ~~PG 신청·결제·빌링키(카드 등록)·멤버십 서버 연동~~ **테스트 키로 구현·테스트 완료(2026-08-13), 프로덕션 반영·동작 확인도 2026-08-16 완료** — 토스페이먼츠 가맹심사 통과 후 env만 교체하면 실 결제 전환
9. 관리자 콘솔에 결제/구독 조회·환불 UI 추가
10. Phase 3 — 도메인 구매 + Cloudflare 전체 프록시 (미착수)
11. 남은 보안·운영 과제: 로그인 등 OTP 외 라우트 레이트리밋, `adminRole` API 전면 RBAC, 감사 로그 필터, 사이드바 이름 표시 fallback, `admin.ts` 전체 Zod 스키마화
