# GoodBus 프로젝트 상태

이 문서는 완료된 것과 아직 완료되지 않은 것을 요약합니다.

**최종 갱신:** 2026-10-08

---

## 사업·운영 현황 (2026-08)

- **사업자 등록 완료** — PG(결제), SMS/알림톡, 호스팅 정식 연동 가능한 단계
- **제품 성숙도 (내부 평가)**
    - 클로즈드 베타: **가능** (핵심 루프·관리자 콘솔·배포 가이드 구비)
    - 유료 공개 론칭: **조기** (실 PG 키 전환·정산·보안·랜딩 정리 필요 — 결제·멤버십 강제 자체는 테스트 키로 구현 완료)
- **우선 과제:** 호스팅 → 휴대전화(알림톡/SMS) 로그인 → 나이스페이먼츠 실 키 전환(가맹심사, 2026-09-29 토스에서 나이스페이먼츠로 PG 자체를 교체 — 아래 "완료됨" 참고)

---

## 호스팅 (카페24) — 2026-09-14 서버 마이그레이션 완료 (구 서버 만료로 신규 이전)

- **2026-09-14 서버 마이그레이션**: 구 서버(`goodbus0716`, IP `172.237.7.249`, DEV B)가 자동연장 미설정 상태로 2026-09-11 호스팅 만료 → 완전히 다운(SSH 포트 자체 무응답), 요금제 특성상 다운그레이드 재구매도 안 돼서 새 서비스(`busrent0909`, **DEV A**, 33,000원/월·6개월 결제, 자동연장 설정함)를 새로 구매해 통째로 이전. 이전 시점에 실사용 데이터가 없었어서 DB는 새로 생성(구 서버 백업 복구 안 함). 상세 절차·현재 실제 구성표는 `DEPLOYMENT.md` "0. 현재 실제 배포 현황" 참고. 요약:
  - IP `172.237.7.249` → **`172.238.20.212`**
  - 배포 경로 `/var/www/goodbus`(root) → **`/opt/busrent`**(`appuser`, 비루트 최소권한 — 카페24 신규 "자동구성" 마법사가 이 구조로 세팅해 줌)
  - DB: Docker Postgres → **네이티브 Postgres 17**(systemd), DB `appdb`/계정 `appuser` — `server/scripts/backup-db.sh`(docker exec 기반)가 이 서버에서 안 먹혀서 `server/scripts/backup-db-native.sh`(pg_dump 직결) 신규 작성, appuser crontab에 03:00 등록. 정기결제 크론(04:00)도 같은 crontab으로 재등록
  - **Aligo SMS 발신 IP**, **Toss Payments API 키 접근 정책**(`busrent_test`, 테스트 탭 두 키 모두) 새 IP로 재등록 완료
  - Cloudflare DNS(`busrent.co.kr` A, `www` CNAME) 새 IP로 전환 완료(전환 중 임시로 DNS-only로 내렸다가 `busrent.co.kr`/`www` 인증서 새로 발급 후 다시 Proxied로 복귀 — Full strict 모드라 순서 중요했음), 새 인증서는 카페24 자동발급분(`busrent0909.mycafe24.com`)과 별개로 추가 발급해 같은 nginx 파일에 서버 블록 두 개로 공존
  - pm2는 새로 systemd 등록(`pm2 startup`) 완료, 재부팅에도 안전
  - **Cloudflare origin-bypass 직접 IP 차단 재설정 완료(2026-09-14)** — 이번엔 `deploy/nginx/cloudflare-origin-bypass.conf`로 리포에 커밋해둬서 다음에 서버 또 옮겨도 처음부터 다시 만들 필요 없음(자세한 내용은 `DEPLOYMENT.md` "0." 참고)
  - **아직 안 한 것**: Sentry DSN(구 서버에만 있던 값이라 유실, 로컬 백업 없음 — 필요 시 Sentry 대시보드에서 재발급)
- **스택:** Ubuntu 24.04, Node.js 24, pm2(fork 모드, appuser), 네이티브 PostgreSQL 17, Nginx + certbot(카페24 자동구성)
- **SSL:** Let's Encrypt(certbot), `busrent.co.kr`/`www.busrent.co.kr`/`busrent0909.mycafe24.com` 전부 유효 인증서 발급 완료, 자동갱신 타이머(`certbot.timer`) 확인함
- **배포 문서·스크립트:** `DEPLOYMENT.md`, `deploy/` — `deploy/ecosystem.config.cjs`는 경로 무관하게 그대로 재사용 가능해서 이번 이전에도 안 건드림. `deploy.sh`는 root로 실행되면 `appuser`로 자동 재실행(`exec sudo -u appuser`)하도록 수정(2026-09-14) — root로 그대로 돌리면 빌드 산출물이 root 소유가 돼 appuser pm2 프로세스와 소유권이 꼬이는 문제를 막기 위함. 새 서버에서 실제로 root 계정으로 `deploy.sh` 실행 → appuser로 전환되어 git pull·npm ci·db push·build·pm2 재시작까지 전부 정상 완료, 파일 소유권도 전부 appuser로 확인, 라이브 재확인까지 통과
- **서버 레벨 보안**: 카페24 자동구성이 fail2ban(sshd jail)·ufw는 깔아놨지만 ufw는 기본 비활성 상태였음 → 22/80/443만 허용해서 활성화함(2026-09-14). unattended-upgrades 상태는 미확인
- **커스텀 도메인 연결·Cloudflare 전체 프록시**: 2026-08-18/08-25에 구 서버 기준으로 처음 세팅했던 절차와 원리는 동일(아래 "완료됨" 항목 참고) — 2026-09-14 마이그레이션도 같은 방식(DNS-only 임시 전환 → 인증서 발급 → Proxied 복귀)으로 재현함

---

## 인증 — 휴대전화 / 알림톡 (2026-08-20 SMS 단독 발송 프로덕션 적용 완료, 2026-10-08 알림톡 템플릿 12종 중 11종 실발송 프로덕션 반영 완료 — 승객_리뷰요청만 보류)

### 현재 코드 상태 (2026-08-19 전 역할 전화번호 전용으로 전면 개편)

- **승객/기사/버스회사 전 역할이 이메일·비밀번호 없이 전화번호+OTP만으로 가입·로그인** — 로그인(`app/login/page.tsx`)·회원가입(`app/signup/page.tsx`, `app/signup-business/page.tsx`) 모두 전화번호 입력 → 인증 요청 → 코드 입력 → 로그인/가입까지 실제로 동작함. 승객은 전화번호만, 기사는 이름+전화번호, 버스회사는 회사명+담당자 이름+전화번호가 필수
- `/login`에는 "승객 로그인" / "기사·회사 로그인" 두 버튼(=`accountType`)이 있어 같은 화면에서 계정 유형을 먼저 선택 후 전화번호+OTP로 로그인
- **관리자는 별도 페이지 `/admin/login`에서 기존과 동일하게 이메일/비밀번호 로그인**(공개 로그인 페이지와 완전히 분리, 헤더 없음) — 전화 로그인 대상 아님
- **같은 전화번호로 승객 계정과 기사/회사 계정을 각각 만들 수 있음** — `User.phoneNumber` 단일 `@unique`를 없애고 `@@unique([phoneNumber, role])`로 전환, `accountType`(`'passenger' | 'business'`) 파라미터로 승객 그룹과 기사·회사 그룹을 구분(기사·회사는 같은 그룹으로 취급되어 한 번호에 하나만 허용, 앱 코드 레벨에서 강제)
- `User.email`/`passwordHash`가 nullable로 전환됨에 따라 관리자 콘솔 전 구간(목록·검색·상세 7개 패널 + 채팅 + 승객 대시보드)의 email-non-null 가정을 전수 수정, `lib/adminPersonLabel.ts`(신규)로 `displayName || companyName || email || phoneNumber || fallback` 표시 순서 통일, 검색도 이름/전화번호까지 확장
- 기존 이메일/비밀번호 계정은 **마이그레이션하지 않음** — 실제 배포 시점에 프로덕션 `User` 테이블을 초기화하기로 결정(사용자 확정 사항). **2026-08-20 프로덕션에 실제로 반영 완료**: 기존 계정(Passenger 1·Driver 2·Admin 1, 연결된 Trip 1·Bid 1·AdminAuditLog 2) 삭제, 공지사항(`SupportPost`)은 작성자만 null로 바뀌고 보존, 새 관리자 계정(`admin@busrent.co.kr`) 재발급
- `User.phoneVerifiedAt` + `PhoneVerification` 테이블(코드 bcrypt 해시, 만료 5분, 재전송 쿨다운 60초, 일일 5회/검증 5회 제한)은 기존 그대로. **2026-08-20에 `accountType`(`PhoneAccountType` enum, nullable) 컬럼 추가** — 쿨다운/일일한도/코드조회가 전부 `(phoneNumber, purpose)`로만 구분되던 걸 `(phoneNumber, purpose, accountType)`로 세분화. 승객 가입 OTP를 받자마자 같은 번호로 기사·회사 가입 OTP를 요청하면 불필요하게 60초 쿨다운에 걸리던 버그를 해소(번호당 다중 역할 기능이 실사용에서 막 걸리는 걸 실사용 중 발견해서 수정)
- `server/src/utils/aligo.ts`가 env 변수 유무에 따라 **개발 모드(서버 콘솔 출력) → SMS 단독 → 카카오 알림톡+SMS 자동대체(`failover=Y`)** 순으로 자동 전환 — 코드 수정 없이 `.env`만 채우면 전환됨. **2026-08-20부터 로컬·프로덕션 모두 SMS 단독 발송 모드로 실제 전환**(`ALIGO_API_KEY`/`ALIGO_USER_ID`/`ALIGO_SENDER` 3개 값 반영, 발송 서버 IP `172.237.7.249` 알리고 화이트리스트 등록 완료), 실제 문자 수신 확인함(문구: `[버스대절] 인증번호는 {code} 입니다. 5분 내에 입력해주세요` — SMS/알림톡 문구에 구 브랜드명 "GoodBus"가 남아있던 걸 이번에 발견해 "버스대절"로 수정)
- **다음 세션 시작 시 바로 이어갈 방법**: `.claude/roadmap.md`의 "다음 세션 시작 가이드" 참고 — 카카오 채널 승인 후 알림톡 env 채우는 순서와 확인 방법이 정리되어 있음(SMS 단독은 이미 완료)

### 목표 방식

1. 사용자가 휴대폰 번호 입력
2. 서버가 OTP 생성 → **알리고** API로 발송
3. **알림톡 우선**, 실패 시 **SMS 자동 대체** — 알리고의 `failover=Y` 옵션으로 API 차원에서 처리(직접 폴백 로직 불필요)
4. 인증 성공 시 기존과 동일하게 JWT(HttpOnly 쿠키) 발급

### 사전 준비 (심사·연동, 아직 진행 전)

| 항목 | 필요 여부 | 비고 |
|------|-----------|------|
| 카카오 **비즈니스 채널** | 알림톡 시 **필수** | 채널 없이 알리고에서 알림톡 신청 불가 |
| 알림톡 **템플릿** | **필수** | 문구마다 카카오 심사 (보통 4~5일) — **2026-10-01 11종 설계·Aligo 등록 완료, 심사 제출됨**(아래 "완료됨" 참고) |
| 알리고 가입 + API 키 | **필수** | `server/.env`의 `ALIGO_API_KEY`/`ALIGO_USER_ID` (카카오 지도 API와 별도) |
| 발신번호 등록 | **필수** | 서류 심사, `ALIGO_SENDER` |
| SMS만 먼저 켤 경우 | 카카오 채널 불필요 | 발신번호 + 알리고 가입만으로 가능 (더 빠름) — **2026-08-20 완료, 로컬·프로덕션 모두 실발송 확인됨** |

### 왜 알림톡을 쓰는지 (SMS 단독 대비)

- **가격**: 알림톡이 통신사 SMS망을 안 타서 건당 단가가 대체로 더 저렴함
- **도달률**: SMS 인증번호는 통신사 스팸 필터에 걸려 지연/차단되는 사례가 늘고 있음. 알림톡은 심사된 공식 채널이라 그런 문제가 적음
- **신뢰도**: 낯선 번호발 SMS보다 공식 카카오 채널 메시지가 스미싱 의심을 덜 받음
- 초기 심사 비용은 일회성이고, `failover=Y`로 SMS 폴백까지 이미 자동화돼 있어 승인 후 운영 부담은 SMS 단독과 비슷하면서 이점만 추가됨

---

## 결제·멤버십 (2026-08-13 토스페이먼츠로 최초 구현, 2026-09-29 나이스페이먼츠로 PG 교체)

### 현재 코드 상태

- **PG: 나이스페이먼츠**(2026-09-29부터, 이전엔 토스페이먼츠 — 아래 "완료됨"의 해당 날짜 항목 참고), 빌키(정기결제) 기반. 토스와 달리 나이스페이는 카드 등록에 호스팅 위젯을 제공하지 않아 카드번호/유효기간/생년월일(개인)·사업자번호(법인)/비밀번호 앞2자리를 우리 서버가 직접 받아 AES-256으로 암호화해 나이스페이에 전달(`POST /payments/billing-key/register`) — 암호화된 빌키(`bid`)만 `BillingKey.nicepayBillingKey`에 저장, 카드 원본은 저장하지 않음. 카드 등록 전 SMS OTP 재인증 필수(`server/src/utils/otp.ts` 재사용, `PhoneVerificationPurpose.card_registration`)(`components/PaymentCardsPanel.tsx`, `server/src/utils/nicepay.ts`)
- **멤버십 4단계**(베이직 무료/플러스/프리미엄/비즈니스), **2026-09-18 실 가격·실 기능으로 전면 개편**(아래 "완료됨"의 해당 날짜 항목 참고) — 베이직 무료/플러스 29,900원/프리미엄 49,900원/비즈니스 99,900원(`server/src/utils/paymentPricingCore.ts`)
    - **동시 활성 입찰 한도**(내가 열어둘 수 있는 내 입찰 건수, 20/40/60/80건, `CONCURRENT_BID_LIMITS`)와 **여정당 입찰 문턱**(한 여정에 이미 걸린 입찰 건수가 내 등급 이상이면 그 여정엔 입찰 불가, 10/15/20/25건, `TRIP_BID_CAP_BY_TIER`)이 서로 다른 별개 지표로 분리돼 있음 — 후자가 여정 카드의 "멤버십 전용"(10건 이상)/"비즈니스 전용"(20건 이상) 배지의 근거, 둘 다 `server/src/utils/membershipLimitsCore.ts` 단일 소스, `POST /bids`(`server/src/routes/bids.ts`)에서 매 요청마다 체크
    - **평균 입찰가 열람**(플러스 이상, `GET /trips`의 `avgBidPrice`)·**최저 입찰가 열람**(비즈니스 자동 포함, 기존 애드온과 동일 엔드포인트)·**먼저 말걸기 채팅 선톡**(프리미엄 이상, `POST /chats/rooms/for-quote` — 기존엔 등급 무관 전원 허용이었는데 베이직·플러스에 새로 제한 추가)·**운행일 중복낙찰**(비즈니스만, `POST /trips/:id/award` — 이것도 기존엔 무제한이었는데 새로 제한 추가, KST 자정 경계 직접 계산)
- **업그레이드**는 즉시 전액 청구 + 즉시 전환(안내문구+체크박스로 명시적 동의 후 진행, `PaymentTransaction.metadata`에 동의 기록 남음), **다운그레이드**는 즉시 결제 없이 예약만 되고 다음 결제일에 정기결제 크론이 전환+과금 (`MembershipSubscription.pendingPlan`). 비즈니스로 업그레이드하면 이미 있던 최저입찰가 애드온 구독을 자동 해지(이중결제 방지)
- 구독 해지 시 유예기간(다음 결제일까지) 동안 기존 혜택 유지 + "다시 구독하기"(무료 재활성화) 가능, 유예기간 지나면 크론이 자동으로 베이직 강등
- **차량별 최저입찰금액 확인**: 멤버십 티어와 무관한 독립 월 구독 상품(39,900원/월, `MinBidAddonSubscription`)으로 멤버십 페이지에 5번째 항목으로 노출 — 구독/해지/재구독 동일 패턴. 비즈니스 등급은 이 애드온 없이 자동으로 열람 가능하고, 구매 자체가 서버에서 차단됨(이미 포함된 혜택 재구매 방지)
- 정기결제 실행은 `server/src/prisma/run-recurring-billing.ts`(멤버십+애드온 공용, 독립 스크립트+시스템 crontab, `npm run db:run-recurring-billing`) — pm2 상시 프로세스 아님, `DEPLOYMENT.md` 8-1절 참고
- 웹훅(`POST /payments/webhook`, 나이스페이 서명 검증 — `hex(sha256(tid+amount+ediDate+SecretKey))`, 응답은 `text/html "OK"` 문자열이어야 함)은 등록돼 있으나 보조 채널 — 실제 결제/구독 확정은 빌키승인 API의 동기 응답이 authoritative. 운영환경에서는 나이스페이 발신 IP(`121.133.126.86`/`.87`) 화이트리스트까지 적용
- **아직 샌드박스 테스트 키 상태** — `server/.env`의 `NICEPAY_CLIENT_KEY`/`NICEPAY_SECRET_KEY`가 나이스페이 테스트 상점("버스대절_test") 키, `NICEPAY_ENV=sandbox`. 실 결제는 발생하지 않음(가상 승인/더미 응답). 카드등록→구독→정기결제 크론→낙찰 수수료→환불→카드삭제→웹훅까지 curl로 실제 샌드박스 API 호출해 end-to-end 검증 완료(2026-09-29). **실 상점 키(`R2_...`)는 이미 발급받았으나 아직 반영 안 함** — 반영 전 나이스페이에 PCI-DSS 요건(SAQ-D 여부, 거래량 기준) 확인 필요
- **낙찰 수수료(10%) 자동 결제** (2026-08-13 도입, 2026-09-29 나이스페이로 PG 교체) — `POST /trips/:id/award`에서 낙찰 확정 **전에** 낙찰자(기사/회사) 빌키로 `입찰가(만원) × 10%`를 선결제하고, 성공해야 낙찰이 확정됨(`server/src/utils/adminRevenue.ts`의 `DEFAULT_PLATFORM_COMMISSION_RATE`와 동일 소스). 카드 미등록 상태에서는 애초에 입찰 자체가 차단됨(`POST /bids`). 결제 실패 시 낙찰은 성립하지 않고 승객·기사 양쪽에 알림(`NotificationType.AWARD_PAYMENT_FAILED`) 발송. 낙찰된 여정이 취소되면 사유가 "기사님 사유로 취소"가 아닌 한 나이스페이 결제취소 API로 자동 환불(`PATCH /trips/:id/cancel`). 실제 청구/환불 흐름까지 curl로 end-to-end 검증 완료

### 남은 작업

1. **가맹 심사 신청** → 실 키 발급 후 env 값만 교체(코드 변경 없음)
2. ~~실 가격 확정~~ **2026-09-18 완료** — 베이직 무료/플러스 29,900/프리미엄 49,900/비즈니스 99,900원, 애드온 39,900원(아래 "완료됨" 참고)
3. 관리자 콘솔에 결제/구독/환불 조회 화면 (2026-08-19에 기사/회사용 개인 결제 내역 화면은 추가됨 — 아래 "완료됨" 참고. 관리자가 전체를 조회하는 화면은 여전히 없음)
4. `AdminRevenuePanel`의 GMV×10% "추정 매출"이 실제 `PaymentTransaction`(platform_commission) 기록과 별개로 계산됨 — 실 결제 도입 후 두 수치 정합화(reconcile) 필요

---

## 권장 작업 순서 (2026-08 기준)

1. **호스팅** — 카페24 VPS, 도메인·SSL, pm2, 스모크 테스트
2. **병행 신청** — 카카오 비즈니스 채널, 알리고 가입, 알림톡 템플릿, 나이스페이먼츠 가맹심사
3. **휴대전화 로그인** — 전 역할(승객/기사/버스회사) 전화번호 전용 가입·로그인 **프로덕션 배포·SMS 단독 실발송까지 완료**(2026-08-20), 카카오 심사 통과 후 `server/.env`에 알림톡 값만 채우면 전환 (`.claude/roadmap.md`의 "다음 세션 시작 가이드" 참고)
4. **출시 전 정리** — 랜딩 가짜 지표·플레이스홀더 제거, 실 가격 확정 (~~약관·개인정보~~ 페이지는 2026-08-14 추가 완료, 법률 검토는 남음)
5. **결제 실 키 전환** — 나이스페이먼츠 가맹심사·PCI-DSS 요건 확인 통과 후 env 값 교체 (기능 자체는 샌드박스 키로 구현·테스트 완료, **2026-09-29**)

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
    - `profile.ts`·`chats.ts`에 Zod 스키마 적용(CSRF도 GET 기반 상태변경 라우트 없음 재확인). **당시 admin.ts는 "크래시 유발 패턴 없음"으로 판단해 보류했으나, 2026-08-25 재점검 결과 이 판단이 틀렸던 것으로 확인됨** — 아래 2026-08-25 항목 참고
    - ~~Cloudflare Turnstile 도입~~(무료, 도메인 구매 불필요) — `signup-business`(기사/버스회사 가입)가 전화인증 비용장벽이 없는 유일한 가입 경로라 가장 취약했음. ~~`server/src/utils/turnstile.ts`(시크릿 미설정 시 항상 통과 — Aligo/Sentry와 동일한 "옵션 env 없으면 기능 꺼짐" 패턴), `components/auth/TurnstileWidget.tsx` 신설.~~ **2026-09-05 코드까지 완전히 제거** — 아래 "Cloudflare Turnstile 제거" 항목 참고
    - **Phase 2(재설치 완료 후 VPS 배포 시 반영)**: 네이티브 PostgreSQL 17 끄기(Docker와 5432 충돌), fail2ban jail 확장(nginx-http-auth/nginx-limit-req/nginx-botsearch + 위 로그인 실패 로그 기반 커스텀 jail), unattended-upgrades. **2026-08-16에 전부 완료 — 아래 항목 참고.** **Phase 3(Cloudflare 전체 프록시): 2026-08-25 완료** — 아래 항목 참고
- **실제 프로덕션 배포 + 인프라 보안 강화 완료** (2026-08-16)
    - `DEPLOYMENT.md` 순서대로 `goodbus0716.mycafe24.com`에 실제 배포. 문서에 없던 인프라 이슈 5건을 배포 중 새로 발견·수정(카페24 starter 앱의 포트 3000 선점, 네이티브 Postgres 5432 충돌, `/uploads` 프록시 누락, welcome 페이지 우선순위, Nginx `add_header` 상속 버그로 인한 HSTS 미노출) — 전부 `DEPLOYMENT.md` "10. 배포 후 체크리스트"/트러블슈팅 표에 반영
    - **fail2ban**: 카페24가 이미 설치해둔 fail2ban + `nginx-http-auth`/`nginx-limit-req`/`nginx-botsearch` 필터를 활성화하고, 우리 앱 전용 `goodbus-login` jail(로그인 실패 로그 기반) 추가. 과정에서 `backend=auto`가 조용히 journald만 보고 지정한 로그 파일은 무시하는 버그를 발견 — `backend=polling`으로 전 jail 수정. 실제 8회 실패 로그인으로 밴 발생시키고 해제까지 라이브 검증(`DEPLOYMENT.md` "10-4")
    - **unattended-upgrades**: 카페24가 이미 설치·보안오리진까지 구성해둔 상태였음 — `Automatic-Reboot false` 명시적으로 켜고 `--dry-run`으로 보안 오리진만 골라내는 것 확인(`DEPLOYMENT.md` "10-5")
    - **DB 백업 cron**: `crontab`에 03:00 등록 + 수동 1회 실행으로 실제 덤프 파일 생성·무결성 확인
    - **카페24 플랫폼 방화벽**: ON 전환 + INBOUND 22/80/443 허용 규칙 추가, 나머지 전부 차단. 콘솔 UI가 직관적이지 않아 절차를 `DEPLOYMENT.md`에 기록
    - **Kakao/Toss API 키**: 프로덕션 서버에 반영하고 실제 동작(카카오 장소검색 API 호출 성공, Toss 카드 등록 위젯 노출)까지 확인. 반영 과정에서 Toss 클라이언트 키 오타(문자 O ↔ 숫자 0) 하나로 실제 401 에러가 발생했고, 브라우저 네트워크 탭으로 원인 특정 후 수정
    - **nodemailer 취약점 발견·수정**: 위 8/15 npm audit 정리 때 보류됐던 `nodemailer`(당시 breaking major라 후순위)를 재점검 — high severity 8건(SMTP 인젝션, addressparser DoS, TLS 검증 미흡 등) 중 실제 사용 패턴(`server/src/utils/email.ts`, 단순 `createTransport`+`sendMail`)에서 트리거 가능한 건 주소 파싱 관련 2건으로 좁혀 확인 후 `^6.9.8`→`^9.0.5` 업그레이드. 타입체크·빌드·모듈 로드·기존 테스트 30개 전부 통과, `npm audit` 결과 root+server 둘 다 0 vulnerabilities
    - **SSH 키 전용 인증** — 2026-08-16 완료. `PasswordAuthentication no`+`PermitRootLogin prohibit-password` 적용, 키 로그인 유지·비밀번호 인증 즉시거부 라이브 검증 완료. Cafe24가 이미 깔아둔 `sshd_config.d/99-cafe24-harden.conf`(MaxAuthTries 등)에 이 두 항목만 빠져있어 별도 drop-in으로 추가
    - **재확인 결과 아직 안 된 것**: UptimeRobot 미가입, `SENTRY_DSN`/`NEXT_PUBLIC_SENTRY_DSN` 프로덕션에 미설정(OS 재설치로 새로 만들어진 env라 값 자체가 없음)
- **구매안전서비스 비적용대상 증빙자료 대응 + 결제 내역 화면 신설** (2026-08-19)
    - 동구청 민생경제과의 통신판매업 신고 심사 대응용 — "당사는 버스 이용대금을 수납하지 않고, 고객은 배차 확정된 버스업체/기사에게 직접 지급하며, 당사는 중개수수료만 별도로 정산받는다"는 안내문구를 입찰 팝업(`components/openTripBid/OpenTripBidFeeStep.tsx`, 기사/회사 대시보드 공용)에 추가
    - 기사/회사 대시보드에 신규 "결제 내역" 탭 추가 — `GET /payments/transactions`(본인 스코프, enum 쿼리 파라미터는 `admin.ts`의 `parseEnumQuery` 패턴으로 검증) + `components/PaymentHistoryPanel.tsx`(일시/항목/금액/상태를 일반 텍스트로 표시, 상태는 "결제완료/결제대기/결제실패/결제취소"). 위 "결제·멤버십" 남은 작업 3번의 사용자 측 절반을 해소 — 관리자가 전체를 조회하는 화면은 여전히 없음
    - 실제 승객→기사 입찰→낙찰 플로우를 시연해 커미션(10%) 결제 1건을 실제로 성공시키고 결제 내역 화면에서 확인까지 완료(증빙 스크린샷 확보)
    - 공지사항(`SupportPost`) 등록은 관리자 콘솔에서 수동으로 하는 콘텐츠 작업이라 이번 범위에서 제외 — 프로덕션 관리자 계정 확보 후 동일 문구로 별도 등록 필요
- **잔여 "GOODBUS" 브랜드명 정리** (2026-08-19)
    - "버스대절"로 상호 변경 이후에도 대시보드 헤더 기본값, 입찰 팝업 제목, 승객 견적 등록 안내문 등 5곳에 구 브랜드명("GOODBUS"/"굿버스")이 남아있던 것을 전부 "버스대절"로 교체(`DashboardMobileShell.tsx`, `useDriverDashboard.tsx`/`useCompanyDashboard.tsx`, `OpenTripBidFeeStep.tsx`, `PassengerQuoteRequestSection.tsx`). 관리자 전용 CSV 파일명 접두사·localStorage 내부 키는 사용자에게 노출되지 않아 그대로 유지
- **전화번호 전용 인증 전면 개편 + 관리자 로그인 분리 + 번호당 다중 역할 지원** (2026-08-19)
    - 승객/기사/버스회사 전 역할이 이메일·비밀번호 없이 **전화번호+OTP만으로 가입·로그인**하도록 재설계(위 "인증 — 휴대전화 / 알림톡" 섹션 참고). 승객은 전화번호만, 기사는 이름+전화번호, 버스회사는 회사명+담당자 이름+전화번호가 필수. 기존 이메일/비밀번호 계정은 마이그레이션하지 않고, 실제 배포 시점에 `User` 테이블을 초기화하기로 결정(로컬 코드는 완료, 프로덕션 반영은 보류)
    - `User.email`/`passwordHash`를 nullable로 전환하면서 `tsc --noEmit`으로 드러난 관리자 콘솔 전 구간의 email-non-null 가정을 전수 수정 — 목록/검색/상세 화면 7개 패널 + 채팅 + 승객 대시보드까지 `person.displayName || companyName || email || phoneNumber || fallback` 패턴(`lib/adminPersonLabel.ts`, 신규)으로 통일하고, 검색 로직도 이름/전화번호까지 포함하도록 확장
    - 관리자 로그인을 공개 로그인 페이지에서 분리 — 관리자는 `/admin/login`(이메일/비밀번호, 헤더 없음)으로, 일반 사용자는 `/login`(전화 OTP 전용, 승객/기사·회사 버튼으로 계정 유형 선택)으로 완전히 나뉨
    - 전화번호를 역할 그룹 단위로만 유일하게 만듦(`@@unique([phoneNumber, role])`, `accountType` 파라미터로 승객 그룹과 기사·회사 그룹을 구분) — 같은 번호로 승객 계정과 기사/회사 계정을 각각 만들 수 있게 됨(기사·회사끼리는 여전히 한 번호에 하나만 허용)
    - `/verify` 스킬로 로컬 서버(:3000/:4000) 기준 전체 흐름 검증 — 승객 사이드바 빈 이름 표시 버그, 채팅 `isMine` 판정의 안전하지 않은 email 동등비교 등을 발견해 함께 수정
    - `aligo` 브랜치에 커밋·푸시 완료(`7c54321`) — ~~프로덕션 서버에는 아직 미반영~~ **2026-08-20 프로덕션 배포 완료** (아래 2026-08-20 항목 참고)
- **전화번호 전용 인증 프로덕션 배포 + 알리고 SMS 실발송 연동 + 번호당 다중 역할 쿨다운 버그 수정** (2026-08-20)
    - 위 2026-08-19 전화번호 인증 개편 코드(`7c54321`, `bfec260`)를 실제 프로덕션(`busrent.co.kr`, 카페24 VPS)에 배포 — `git pull` → DB 백업 스냅샷 → `AdminAuditLog`/`Trip`/`User` 순서로 FK 제약 지키며 삭제(공지사항 `SupportPost`는 작성자만 null로 바뀌고 내용은 보존) → `prisma db push`로 스키마 반영(email/passwordHash nullable, `@@unique([phoneNumber, role])`) → 백엔드·프론트 빌드 → `pm2 restart`. 헬스체크·실제 페이지 서빙(`/login` 새 UI, `/admin/login`)까지 라이브 확인
    - 삭제로 사라진 관리자 계정을 새로 재발급(`admin@busrent.co.kr`, `adminRole: Super`) — 비밀번호는 최초 로그인 후 관리자 콘솔에서 직접 변경 필요
    - 알리고 SMS 단독 발송을 로컬·프로덕션 `.env`에 실제로 연동(`ALIGO_API_KEY`/`ALIGO_USER_ID`/`ALIGO_SENDER`) — 발송 서버 IP(`172.237.7.249`)가 알리고 화이트리스트에 등록돼 있어야만 성공한다는 걸 로컬 머신에서 직접 테스트하다 발견(로컬 공인 IP로는 `-101 인증오류` 거부당함, VPS IP로는 정상 발송). 실제 문자 수신까지 확인
    - 수신한 SMS 문구에 구 브랜드명 "GoodBus"가 그대로 남아있던 걸 발견 — `server/src/utils/aligo.ts`의 SMS/알림톡 문구를 "버스대절"로 수정(`fa65b00`), 프로덕션에도 재배포
    - `/verify` 스킬로 로컬에서 승객/기사/버스회사 3개 역할 가입→로그인 전체 플로우, 역할별 필수 필드 검증, 번호당 다중 역할(같은 번호로 승객+기사 계정 동시 보유), 관리자 이메일/비밀번호 로그인을 전부 실제 구동해 검증하던 중 — **승객 가입 OTP를 받자마자 같은 번호로 기사·회사 가입 OTP를 요청하면 불필요하게 60초 쿨다운에 걸리는 문제**를 발견. 원인은 `PhoneVerification` 테이블과 `otp.ts`(발급/검증)가 `accountType` 개념 자체가 없어 쿨다운·일일한도·코드조회가 전부 `(phoneNumber, purpose)`로만 묶여있었기 때문(번호당 다중 역할 기능을 추가하면서 그 아래 OTP 인프라는 안 건드렸던 게 원인) — `PhoneVerification`에 `accountType`(`PhoneAccountType` enum, nullable) 컬럼을 추가하고 `issueOtp`/`consumeOtp` 시그니처와 3개 호출부(`auth.ts`)에 반영해 `(phoneNumber, purpose, accountType)`로 완전히 분리. 로컬에서 승객→기사 OTP 연속 요청이 쿨다운 없이 각각 발급되는 것과 각자 코드로 가입 완료되는 것까지 재검증 후 프로덕션에 배포
- **Cloudflare 전체 프록시(Phase 3) + Turnstile 키 발급 + Kakao 키 재발급 + Toss 웹훅 등록 + admin.ts Zod 검증** (2026-08-25)
    - **Cloudflare 전체 프록시**: Free 플랜 가입, 네임서버를 카페24(`ns1/ns2.cafe24.*`)에서 Cloudflare(`cody.ns.cloudflare.com`/`paloma.ns.cloudflare.com`)로 이관, `busrent.co.kr`/`www`/`*` DNS 레코드 Proxied(오렌지 클라우드) 전환, SSL/TLS 모드 **Full (strict)**(기존 Let's Encrypt 정품 인증서로 검증 통과). VPS nginx에 `/etc/nginx/conf.d/goodbus-cloudflare.conf` 신설 — Cloudflare 엣지 IP 대역 `set_real_ip_from`+`real_ip_header CF-Connecting-IP`로 레이트리밋(`req_general`/`goodbus_auth` 존)·`X-Real-IP`가 방문자 IP 대신 Cloudflare IP 하나로 뭉치는 문제 방지. 여기에 `geo $realip_remote_addr $goodbus_is_cloudflare {...}` 맵 + `sites-available/GoodBus`의 호스트 매치 `if` 블록으로 **`busrent.co.kr` 원본 IP(`172.237.7.249`) 직접 우회 접속을 차단**(444) — `goodbus0716.mycafe24.com`은 UptimeRobot 모니터(`https://goodbus0716.mycafe24.com/api/health`)가 의존하고 있어 의도적으로 이 차단에서 제외. **프로덕션 nginx는 저장소 `deploy/nginx/goodbus.conf`와 별개로 관리됨**(카페24 재설치 이후 `sites-available/GoodBus`+`conf.d/*.conf` 구조로 갈라섬) — 향후 nginx 변경은 저장소 파일을 배포하는 게 아니라 VPS에서 직접 반영해야 함. curl로 라이브 검증: Cloudflare 경유 200, 원본 IP 직접 접속(`busrent.co.kr`/`www.busrent.co.kr` Host) 연결 거부, 포트 80 직접 접속은 차단 없이 리다이렉트만(앱 데이터 노출 없음), `goodbus0716.mycafe24.com` 직접 접속 그대로 200, 접속 로그에 실제 방문자 IP 정상 기록.
    - ~~Cloudflare Turnstile 키 발급~~: 위 Cloudflare 계정 생성으로 막혀있던 전제조건 해소 — 위젯 `busrent_bs`(Managed 모드, 호스트 `busrent.co.kr`) 생성해 `NEXT_PUBLIC_TURNSTILE_SITE_KEY`/`TURNSTILE_SECRET_KEY`를 로컬·프로덕션 env에 반영, 프론트 재빌드(`NEXT_PUBLIC_*`는 빌드 타임에 박히므로 env만 바꿔선 반영 안 됨) + `pm2 restart` 양쪽 다. 라이브 검증: `turnstileToken` 없이 `POST /api/auth/signup`(role=Driver)을 보내면 이제 `400`으로 거부됨(키 발급 전엔 시크릿 미설정으로 이 검증이 조용히 항상 통과였음) — OTP 소비·DB 저장 전 단계에서 걸러지는 것까지 코드로 확인해 부작용 없이 라이브로 검증. **2026-09-05 코드까지 완전히 제거** — 아래 항목 참고
    - **Kakao REST API 키 재발급**: 침해사고 이후 미확인 상태였던 키를 Kakao Developers 콘솔에서 재발급(`KAKAO_REST_API_KEY`=`KAKAO_MOBILITY_API_KEY`, 동일 키 공유가 정상 동작). 로컬·프로덕션 env 반영, 백엔드 재시작, 서버의 낡은 `.env.bak`(2026-08-16 스냅샷, 옛날 키 값 포함)까지 찾아서 삭제. `/api/kakao/places` 실제 카카오 장소검색 호출로 라이브 검증. 콘솔 쪽 옛날 키 삭제는 사용자가 직접 해야 하는 남은 절차.
    - **Toss Payments 테스트 웹훅 + API 키 접근 정책(IP 화이트리스트) 등록**: `server/src/routes/paymentsWebhook.ts`+`TOSS_WEBHOOK_SECRET`가 2026-08-16부터 코드/env엔 있었지만 Toss 대시보드에 웹훅 자체가 한 번도 등록된 적이 없어 실제로 호출된 적이 없었던 상태를 발견 — `busrent_pay`(`https://busrent.co.kr/api/payments/webhook`, 이벤트 `PAYMENT_STATUS_CHANGED`만, 코드가 실제로 처리하는 것과 일치) 등록, API 키 접근 정책 `busrent_prod`(허용 IP `172.237.7.249`)도 등록. 둘 다 "테스트" 탭 기준(공유 샌드박스 MID `tvivarepublica`) — 실 사업자 라이브 키 전환 시 "라이브" 탭에 동일 작업 재등록 필요. 라이브 검증: 서명 없는/깨진 바디 요청 모두 `400 Invalid signature`로 깔끔히 거부(500 아님).
    - **`admin.ts` Zod 검증 추가**: `PATCH /users/:id/status`, `PATCH /verifications/:id`, `POST /admins` 세 라우트가 `req.body as {...}` 캐스팅만 하고 `try/catch`가 없던 것을 Zod 스키마+`try/catch`로 교체(`auth.ts`/`trips.ts`와 동일 패턴). 특히 `POST /admins`는 `adminRole`을 검증 없이 그대로 `prisma.user.create`에 넘겨서, 스키마 밖 값을 보내면 `PrismaClientValidationError`가 잡히지 않고 새는 실제 크래시 경로였음(2026-08-15에 "이미 없다"고 판단했던 게 오판이었음, 위 참고). 로컬 시드 관리자 계정으로 실제 HTTP 라우트를 직접 호출해 라이브 검증 — `adminRole: "HackerRole"` 등 악의적 입력이 이제 `400`으로 깔끔히 막히는 것, 정상 입력은 여전히 `201`로 실제 DB에 관리자가 생성되는 것, 인접한(안 건드린) `support-posts` 라우트가 회귀 없이 그대로 동작하는 것까지 확인.
    - **부수 발견(오늘 변경과 무관, 기존 이슈)**: `X-Frame-Options`/`X-Content-Type-Options`/`Referrer-Policy` 헤더가 `next.config.ts`와 nginx 양쪽에서 중복 설정돼 응답에 두 번씩 찍힘 — 해롭진 않으나 언젠가 한쪽으로 정리 필요.
- **Kakao REST API 키 재발급** (2026-08-29) — Kakao Developers 콘솔에서 다시 재발급(`KAKAO_REST_API_KEY`=`KAKAO_MOBILITY_API_KEY`, 동일 키 공유). 로컬·프로덕션 `.env` 양쪽 반영 후 백엔드 재시작(로컬/`pm2 restart goodbus-api`), `/api/kakao/places` 실제 장소검색 호출로 라이브 동작 확인까지 완료.
- **Cloudflare Turnstile 제거** (2026-09-05) — Sentry에서 `/signup-business`(기사/회사 가입)의 `TurnstileError: [Cloudflare Turnstile] Error: 400020`(non-retryable, Cloudflare 공식 문서상 "Invalid sitekey")를 발견해 조사. 사이트 키·등록 Hostname(`busrent.co.kr`)·Widget Mode(Managed) 전부 Cloudflare 대시보드와 일치함을 확인해 우리 쪽 설정 문제가 아님을 확인했고, Cloudflare 커뮤니티에 서로 무관한 다수 계정이 동일 증상("실제 sitekey는 400020 실패, 공식 테스트 sitekey는 정상")을 보고 중인 것을 확인해 Cloudflare Turnstile 서비스 자체의 산발적 버그로 판단(공식 상태페이지엔 인시던트로 등록 안 됨, 자세한 조사 과정은 `TURNSTILE_400020_2026-09-05.md` 참고). 이 김에 애초에 Turnstile을 붙인 이유(2026-08-15 도입 당시 "`signup-business`만 전화OTP 비용장벽이 없어서")가 2026-08-19 전 역할 전화OTP 통일로 이미 무의미해졌다는 것과, 애초에 실제 비용이 나가는 지점(`POST /auth/phone/request-otp`의 SMS 발송)은 Turnstile이 지키지도 않고 있었다는 것(Turnstile은 그보다 뒤 단계인 `/auth/signup` 최종 제출에서만 체크됨)을 재확인 — SMS 비용 방어는 원래도 `/auth/phone/request-otp`의 IP 레이트리밋(10분 10회)·번호당 쿨다운/일일 캡이 담당하고 있어 Turnstile 유무와 무관했음. 실사용 임박 전이라 급하지 않았지만, 남겨둘 이유보다 (Cloudflare 버그로 가입 자체가 막히는) 리스크가 더 크다고 판단해 코드까지 완전히 제거하기로 결정 — `server/src/utils/turnstile.ts`/`components/auth/TurnstileWidget.tsx` 삭제, `server/src/routes/auth.ts`/`app/signup-business/page.tsx`/`lib/api.ts`의 관련 검증·상태·호출 제거, `.env.production.example`/`server/.env.example`의 관련 안내 삭제. Cloudflare 대시보드의 `busrent_bs` 위젯 자체 삭제는 사용자 몫으로 남음(코드에서 더 이상 참조 안 하므로 위험 없음)
- **"견적등록 알림" 동의 서버화 + "마케팅 수신동의" 제거** (2026-08-29) — `components/Notifications.tsx`의 알림 설정 다이얼로그가 두 토글(견적등록 알림/마케팅 수신동의) 모두 서버 저장 없이 `localStorage`에만 상태를 저장하던 스텁이었던 것을 발견 — "견적등록 알림"을 `User.quoteAlertConsent`(`Boolean @default(true)`, 승객·기사·회사 전 역할 공용) 필드로 승격하고 `PATCH /notifications/consent/quote-alert`(role 제한 없음) 신규 추가, `/auth/me`·회원가입·전화로그인 응답에 노출. "마케팅 수신동의"는 친구톡/광고 메시지 트랙(알림톡과 별개 심사·채널 친구 추가 필요)이라 이번 스코프에서 제외하기로 하고 UI·로컬스토리지 코드 전부 삭제. 로컬에서 기사 계정으로 실제 로그인 → 벨 아이콘 토글 클릭 → 새로고침 후 서버측 영속 확인, 백엔드를 강제로 내린 상태에서 토글해 낙관적 업데이트가 실패 시 자동 롤백되는 것까지 브라우저로 라이브 검증(`/verify` 스킬). 로컬 `db:push` 반영 완료 — **프로덕션 DB는 배포 시 별도로 `db:push` 필요**(deploy.sh가 자동으로 돌리지 않음).
- **멤버십 요금제 전면 개편 — 실 가격 확정 + 신규 등급별 기능 5종** (2026-09-18, 스키마 변경 없음) — 사용자가 확정한 실 가격(베이직 무료/플러스 29,900/프리미엄 49,900/비즈니스 99,900원, 최저입찰가 애드온 39,900원)과 신규 규칙을 반영:
    - **여정당 입찰 문턱**(신규 지표, `TRIP_BID_CAP_BY_TIER` 10/15/20/25건) — 한 여정에 이미 걸린 입찰 건수가 내 등급의 문턱 이상이면 그 여정엔 입찰 불가. 승객이 지정하는 게 아니라 시스템이 현재 입찰 건수로 자동 판정 — 10건 이상이면 "멤버십 전용"(베이직 차단), 20건 이상이면 "비즈니스 전용"(비즈니스만 가능), 25건 이상은 신규 입찰 마감. 기존 "동시 활성 입찰 한도"(`CONCURRENT_BID_LIMITS`, 내가 열어둘 수 있는 내 입찰 건수)와는 별개 지표이며 숫자도 20/40/60/80으로 상향됨. `POST /bids`에서 서버가 최종 강제, `components/trips/OpenTripCard.tsx`의 배지·버튼 비활성화는 UX 편의(보안 경계 아님)
    - **평균 입찰가 열람**(플러스 이상) — `GET /trips`의 기존 `minBidPrice` 계산 `groupBy`에 `_avg` 추가해 `avgBidPrice` 필드로 노출, 베이직은 마스킹
    - **최저 입찰가 열람 비즈니스 자동 포함** — 기존 독립 애드온(`MinBidAddonSubscription`)을 구매하지 않아도 비즈니스 등급이면 `GET /bids/min-by-vehicle-type`이 자동으로 값을 반환. 비즈니스 등급의 애드온 재구매는 서버에서 차단(`POST /payments/addon/min-bid/subscribe`)하고, 비즈니스로 업그레이드하는 순간 이미 있던 애드온 구독을 자동 해지(`POST /payments/subscribe`) — 안 하면 같은 혜택을 이중으로 결제하게 됨
    - **먼저 말걸기(채팅 선톡) 프리미엄 이상** — `POST /chats/rooms/for-quote`가 기존엔 등급 무관 전원에게 열려 있었는데, 베이직·플러스가 아직 없는 채팅방을 새로 여는 것만 403으로 새로 막음(승객이 먼저 만든 방엔 그대로 재입장 가능, 회귀 없음)
    - **운행일 중복낙찰 비즈니스만** — `POST /trips/:id/award`도 기존엔 제한이 전혀 없었는데, 낙찰자가 같은 날짜(KST 기준)에 이미 확정된 다른 여정이 있으면 비즈니스가 아닌 한 낙찰을 막도록 새로 추가. 왕복 여정 자동 파트너 낙찰(같은 트랜잭션 내부에서 직접 처리, 이 체크를 재귀적으로 타지 않음)과는 충돌하지 않음을 확인
    - `/verify` 스킬로 실제 서버 구동 + 브라우저로 라이브 검증: 여정당 문턱 10/15건 경계에서 베이직 차단·플러스는 실제 입찰 성공(DB 반영 확인), 배지·비활성 버튼이 사용자가 참고로 보여준 타 서비스 UI와 동일한 형태로 렌더링되는 것 확인, 비즈니스 등급 전환 시 애드온 카드가 "포함됨"으로 실시간 전환되는 것까지 확인. **비즈니스 업그레이드 시 애드온 자동해지와 운행일 중복낙찰 차단은 로컬 토스 테스트 키가 만료 상태라(기존 문제, 이번 변경과 무관) 실제 결제 트랜잭션까지는 검증 못 함** — 코드 재검토로만 확인, 키 갱신 후 재확인 권장
- **결제대행사 교체 — 토스페이먼츠 → 나이스페이먼츠** (2026-09-29, 전환 사유: 나이스페이 연회비 없음 vs 토스 연회비 20만원+더 높은 수수료) — 토스 관련 파일·의존성·DB 컬럼 전부 제거하고 완전 전환:
    - **가장 큰 구조 변화**: 토스는 카드 등록을 토스가 호스팅하는 위젯에서 처리해 카드 원본이 우리 서버를 전혀 안 거쳤는데, 나이스페이는 정기결제 빌키 발급(`POST /v1/subscribe/regist`)에 호스팅 위젯이 없어(나이스페이 공식 매뉴얼·"포스타트" 자동결제 상품·포트원 연동문서 3곳 교차 확인 — 신용카드 빌키는 업계 전체가 이 방식) 카드번호·유효기간·생년월일(개인)/사업자번호(법인)·비밀번호 앞2자리를 우리 서버가 직접 받아 AES-256(CBC)으로 암호화해 전달해야 함(`server/src/utils/nicepay.ts`의 `encryptCardData`). PCI-DSS SAQ-D(카드정보 처리 가맹점) 분류 가능성 있음 — 실 키 전환 전 나이스페이에 확인 필요(위 "결제·멤버십" 섹션 참고)
    - **보안 강화 6종**: 카드 등록 전 SMS OTP 재인증 필수(계정 탈취 상태에서 바로 카드 등록/카딩 오라클로 악용 방지), 카드 등록 엔드포인트 IP 레이트리밋(`createIpRateLimiter` 재사용), Luhn 체크섬 사전검증, Sentry `beforeSend`로 카드 등록 라우트 요청바디 전송 차단(`server/src/instrument.ts`), 나이스페이 웹훅 발신 IP 화이트리스트(운영환경만), 응답 타임아웃(30s) 시 orderId로 실제 승인 여부 조회 후 자동 취소하는 망취소 처리(`chargeBillingKey`가 이 로직까지 감싸서 호출부는 타임아웃을 몰라도 됨)
    - **DB**: `BillingKey.tossBillingKey`→`nicepayBillingKey`(`customerKey` 필드는 나이스페이에 대응 개념이 없어 삭제), `PaymentTransaction.tossOrderId`→`orderId`/`tossPaymentKey`→`tid`. `prisma db push`가 컬럼명 변경을 drop+add로 처리해 기존 결제 이력이 날아가는 걸 막기 위해 배포 전 수동 `ALTER TABLE ... RENAME COLUMN`으로 먼저 이름을 맞춰둠(로컬에 실제 적용해 기존 13건 트랜잭션 이력 보존 확인)
    - **프론트**: `PaymentCardsPanel.tsx` 카드 입력 폼 전면 재작성(OTP 스텝업 포함, `data-sentry-mask`로 세션 리플레이 대비), 토스 SDK(`@tosspayments/tosspayments-sdk`)·`lib/toss.ts`·리다이렉트 콜백 페이지(`app/payments/billing-key/callback/`) 전부 삭제 — 나이스페이는 클라이언트 키도 서버에서만 쓰여서 `NEXT_PUBLIC_TOSS_CLIENT_KEY` 같은 프론트 노출 값 자체가 없어짐(토스 대비 구조 단순화)
    - **검증**: 나이스페이 샌드박스 테스트 상점("버스대절_test")으로 curl 실사용 검증 — 카드등록(OTP→빌키발급, 실제 `BIKY...` 빌키 수신)→멤버십 플랜변경 결제(실제 `tid` 수신)→정기결제 크론 수동 실행→여정 낙찰 수수료 결제→여정 취소 환불(PaymentTransaction 상태 `cancelled`로 전환 확인)→카드 삭제(원격 빌키 만료)→웹훅 서명 시뮬레이션(`text/html "OK"` 응답, 잘못된 서명은 400 거부) 전부 실제 API 호출로 확인. OTP 재사용 차단, 기사 계정에 사업자번호 길이(10자리) 입력 시 차단도 확인. tsc(루트+서버)·lint·테스트(루트18+서버30) 전부 통과
- **카카오 알림톡 템플릿 11→12종 설계·등록** (2026-10-01~10-02) — 사용자가 작성한 초안(기사/업체 대상 10종)을 코드베이스 전체 이벤트와 대조 검토한 결과 **승객쪽 알림이 전무**하고, 서류심사 결과·정기결제 실패처럼 코드엔 이벤트가 있는데 알림이 안 나가는 구멍이 있는 걸 발견 — 범위를 재설계해 Aligo 웹 UI에 사용자가 직접 입력·등록, 카카오 심사 제출 완료:
    - **기사/업체 대상 8종**: 낙찰완료·예약취소·수수료환불완료(기존 초안 재사용) + 서류심사승인·서류심사반려(`admin.ts`의 `VERIFICATION_APPROVED`/`REJECTED`, 기존엔 인앱 알림만 있던 것에 알림톡 추가)·정기결제실패(`run-recurring-billing.ts`가 `past_due`로만 바꾸고 알림이 전혀 없던 구멍)·멤버십결제완료·카드등록변경(보안 알림, 계정 탈취 시 카드 변경을 본인이 바로 알아채는 용도) 신규
    - **승객 대상 3종(전부 신규)**: 입찰도착(`NotificationType.BID_RECEIVED`, `User.quoteAlertConsent` 동의자 전용)·낙찰확정(현재 낙찰 시 기사에게만 알림 가고 승객은 전혀 모르는 상태 — 알림톡 발송 코드 연결 시 승객 통지 로직 자체도 신규 추가 필요)·리뷰요청(`TripReview` 모델은 있으나 "운행 완료" 판정 로직이 없어 트리거는 추후 설계)
    - **의도적 제외**: "기사_고객문의도착"(채팅 알림인지 문의답변 알림인지 의미 불명확, 보류), "기사_미낙찰안내"(여정당 발송량이 제일 많아 정보가치 대비 비용 큼), 부가서비스 포함 낙찰완료·운행 D-3/D-1 리마인더·운행완료(대응하는 데이터 모델·cron이 없음 — `TripStatus`엔 "완료" 상태 자체가 없음)
    - **변수 재검증**: 원본 초안의 수수료환불완료 템플릿이 "환불수수료/보증수수료/부가서비스요금"처럼 항목을 나눈 변수를 썼는데, 실제 코드(`trips.ts`)는 `platform_commission` 거래 하나를 통째로 취소하는 구조라 항목별 분해가 불가능 — "환불금액" 단일 변수로 단순화해 등록
    - **알려진 이슈**: 등록 중 1~9번 템플릿의 "대체 발송 문자"를 단문(90byte)으로 설정했는데 본문이 150~670byte라 초과 상태 — 카카오 심사 중이라 지금은 수정 불가, 승인/반려 결과 나온 뒤 장문(LMS)으로 변경 필요
    - **반려 대응 + 마일스톤 템플릿 추가 (2026-10-02)**: `승객_입찰도착`이 카카오 "다발성 메시지" 기준으로 반려됨 — 동일 수신자에게 반복 발송될 수 있는 알림은 본문에 "수신자가 동의/요청했음을 확인 가능한 고정값 문구"가 있어야 승인된다는 사유. 본문 끝에 "※ 본 메시지는 고객님께서 입찰 알림 수신에 동의하신 여정에 한해, 새 입찰이 등록될 때마다 발송됩니다." 한 줄을 추가해 재제출. 같은 맥락에서 입찰이 몰리는 여정의 발송량 자체를 줄이는 방안으로 `User.quoteAlertConsent` 기본값(`schema.prisma:134`, `@default(true)` 옵트아웃)을 opt-in으로 바꾸는 안도 논의했으나, 스키마 변경 대신 **건별 발송을 멈추고 5건·10건 시점에만 묶어 보내는 `승객_입찰마일스톤` 템플릿을 신규 등록**하는 쪽으로 결정 — "입찰 건수 알림은 최대 10건까지만 발송됩니다" 문구로 상한을 명시, `quoteAlertConsent` 기본값 자체는 변경하지 않고 `true` 유지
    - **남은 작업**: 심사 결과 대기(영업일 3~5일, `승객_입찰도착`은 수정 재제출분 재심사·`승객_입찰마일스톤`은 신규 심사) → 승인 후 `aligo.ts`를 OTP 전용 구조에서 여러 템플릿 발송 가능하도록 확장 + 12종 각각 트리거 지점 연결(`승객_입찰마일스톤`은 `bids.ts`에 `prisma.bid.count()`로 1건째/5건째/10건째 체크 추가하면 됨, 별도 DB 필드 불필요)

- **알림톡 실발송 연동 — 입찰 알림 1·2차 구현, 실발송 수신 확인** (2026-10-06)
    - **구조**: `server/src/utils/aligo.ts`에 범용 전송 함수(`postAlimtalk`, 전송 1회만 수행·재시도 판단 반환) 추가. OTP의 `sendOtpSms` 경로는 건드리지 않음. `server/src/utils/alimtalkTemplates.ts`가 템플릿 레지스트리(코드·본문·대체문자·버튼)와 렌더러·활성화 체크를 담당. `server/src/utils/alimtalk.ts`의 `sendAlimtalk`가 로그 행(`AlimtalkLog`, `dedupeKey` unique)을 먼저 확보해 중복을 막고, 네트워크·5xx만 재시도(0.5s, 2s), 예외를 던지지 않음
    - **활성화**: `ALIMTALK_ENABLED_TEMPLATES`(콤마 목록)에 있는 템플릿만 발송, `ALIMTALK_DISABLED=true`면 전부 중단. 미설정이면 발송하지 않음
    - **연결된 트리거(현재)**: `승객_입찰도착`(입찰 1건째), `승객_입찰마일스톤`(5건·10건째) — `bids.ts` 입찰 생성 트랜잭션에서 트립 단위 advisory lock으로 건수를 세고, 커밋 후 발송. 발송 전 `quoteAlertConsent` 확인. 나머지 10종 트리거는 미연결
    - **검증**: 단위 테스트(렌더 결과가 등록본과 글자 단위로 같은지, 재시도 분류, 버튼 JSON 파라미터 등) 46개 통과. 로컬 dev 모드 E2E에서 순차 10건·동시 10건 모두 1/5/10 건수에서 정확히 1번씩 기록 확인. 실키로 승객 1명(카카오 사용)에게 입찰도착·마일스톤 실발송, 카카오 알림톡 수신과 버튼 노출 확인
    - **발견·수정한 버그**: (1) Aligo 알림톡 성공 응답은 `result_code`가 아니라 `code: 0`인데 `result_code === '1'`만 성공으로 봐서 실제 발송 성공을 실패로 기록 — 수정(단위 테스트 추가). (2) 입찰 생성 응답에 승객 전화번호·동의값이 실려 기사에게 노출될 수 있었음(제가 include를 넓히며 만든 문제) — 응답에서 승객 정보 제거, 발송용 값은 별도 조회. (3) 같은 응답에 승객 이메일이 실려 있던 기존 문제 — 응답에서 제거(일반 가입자는 이메일이 없지만 시드·예전 계정엔 있음). (4) Aligo 호출에 타임아웃이 없어 `pending` 로그가 고착될 수 있었음 — 10초 타임아웃 추가. (5) 취소 라우트: 환불 실패를 무시하고 여정을 취소 처리 + 낙찰과 락 없음 — 낙찰과 같은 여정 락(`trip_award`)으로 직렬화하고, 환불 실패 시 취소를 확정하지 않고 502 반환
    - **보류**: 기존 `AlimtalkLog` 2건(실제로 도착한 메시지인데 판정 버그로 `failed` 기록) 정정 — 보안 정책으로 자동 수정이 막혀 사용자가 직접 정정하기로 함. 대체 문자(SMS 폴백) 경로는 미검증이고 LMS 장문 전송 파라미터도 미확인. `승객_입찰도착` 본문의 "입찰이 등록될 때마다 발송" 문구는 실제 발송 방식(첫 입찰 + 5·10건)과 다르지만 사용자가 그대로 쓰기로 결정
    - **인증번호(OTP) 알림톡 전환 준비**: `인증문자_카카오` 템플릿 등록(심사 중). 승인 전까지 `ALIGO_ALIMTALK_TPL_CODE`·`ALIGO_ALIMTALK_TEMPLATE`은 주석 상태로 두어야 함 — 설정하면 알림톡 API가 거절해도 SMS로 넘어가지 않아 인증번호가 끊김. 같은 `result_code` 판정이 `sendViaAlimtalk`(OTP 경로)에도 남아 있어 전환 전 수정 필요. 운영이 SMS 단독인지는 운영 `.env` 확인 필요
    - **가입 환영 알림톡**: 승객·기사·버스회사 전원 대상, 최초 가입 1회(`WELCOME:{userId}` dedupe 키). 템플릿 `버스대절 바로가기`(웹링크 `https://busrent.co.kr`) 등록 완료, 심사 대기. 승인 후 레지스트리 추가와 가입 완료 지점 연결 필요
    - **남은 작업**: 나머지 10종(낙찰완료·예약취소·수수료환불완료·서류심사 승인/반려·정기결제실패·멤버십결제완료·카드등록변경·낙찰확정) 원문 확정 후 레지스트리와 트리거 연결, 취소 라우트 환불 실패 시 관리자 알림, 리뷰요청(운행완료 판정 cron 설계 필요)

- **인증번호 알림톡 전환 + 가입 환영 알림톡 연결, 킬 스위치 도입** (2026-10-06 저녁)
    - OTP 알림톡 경로(`sendViaAlimtalk`)의 성공 판정 버그(알림톡은 `code: 0`로 성공을 응답하는데 `result_code`만 봄)를 수정, 인증번호가 실제로 카카오 알림톡으로 전환됨
    - `WELCOME` 템플릿 등록·연결 — 신규 가입 시 계정당 1회만 발송(`WELCOME:{userId}` dedupe), 같은 번호 재가입(기존 계정 로그인 처리)은 중복 발송 안 되는 것 확인
    - `ALIGO_DISABLED` 킬 스위치 신설 — 로컬 검증 중 "dev 모드로 띄웠다고 생각했는데 `.env`의 실제 키가 `dotenv override`로 되살아나 무작위 테스트 번호 2건에 실제 인증번호가 발송된" 사고가 계기. 운영에서는 자동 무시 + 경고 로그
    - 커밋 `6a63645`, 운영 배포 완료. `.env`에 `ALIMTALK_ENABLED_TEMPLATES=WELCOME,BID_ARRIVED,BID_MILESTONE` — 인증번호·환영·입찰도착·입찰마일스톤 실발송 확인

- **알림톡 나머지 8종 연결 + 운영 반영, 관리자 콘솔 이미지 404 수정** (2026-10-08)
    - 남은 8종(기사_낙찰완료, 승객_낙찰확정, 기사_예약취소, 기사_수수료환불완료, 기사_서류심사승인/반려, 기사_정기결제실패, 기사_멤버십결제완료, 기사_카드등록변경) 전부 레지스트리 등록 + 트리거 연결. `trips.ts`(낙찰·취소), `admin.ts`(서류심사), `payments.ts`(구독·카드등록/삭제), `run-recurring-billing.ts`(정기결제 크론)에 훅 추가
    - 결제 불필요 경로(서류심사, 예약취소 4가지 분기, 정기결제 실패, 카드삭제)는 로컬에서 실제 HTTP 라우트·크론 스크립트를 직접 구동해 검증(가짜 빌링키로 나이스페이 샌드박스가 실제로 거절하는 경로까지 확인). **결제 성공이 필요한 5개(낙찰완료·낙찰확정·환불완료·멤버십결제완료·카드등록신규)는 검증된 나이스페이 테스트 카드번호가 없어 라우트 레벨 검증은 보류** — 발송 메커니즘(본문·버튼·실제 카카오 수신)만 직접 호출로 확인
    - 커밋 `d74f121`, 운영 배포 완료. `.env`의 `ALIMTALK_ENABLED_TEMPLATES`에 12종 중 11종(승객_리뷰요청 제외) 전부 활성화
    - 배포 직후 사용자가 관리자 승인 페이지 서류 이미지가 안 보인다고 보고 — 운영 Nginx(`/etc/nginx/sites-available/busrent`)에 `/uploads/` 프록시 블록이 없어 Express가 아닌 Next.js로 요청이 가서 404였던 것. 2026-09-14 신규 VPS 이전 때 빠진 채로 운영되던 기존에 알려진 재발 유형(`DEPLOYMENT.md` "12. 트러블슈팅" 참고) — 백업 후 블록 재추가, `nginx -t` 검증 후 reload로 해결. 서버 시스템 설정이라 git에는 반영되지 않음

## 미완료 / 실서비스 갭

- **배포**
    - ~~프로덕션 배포 미실행~~ **2026-08-16 실제 배포 완료**(위 "호스팅" 섹션·"완료됨" 참고)
    - CI(lint+build+test)는 GitHub Actions로 도입됐지만, 배포 자동화(CD)는 없음 — 여전히 수동 배포(`deploy/scripts/deploy.sh` 또는 수동 `git pull`+`build:prod`+`pm2 restart`)
    - `DEPLOYMENT.md` "10. 배포 후 체크리스트" 중 미완료 항목: 승객 견적 생성→기사 입찰→승객 낙찰 전체 흐름 브라우저 검증, 관리자 콘솔 UI(매출 탭 등) 브라우저 검증, Sentry 에러 리포트 실제 확인
- **휴대전화 로그인**
    - 전 역할(승객/기사/버스회사) 전화번호 전용 가입·로그인으로 전면 개편(스키마·API·UI) **구현·테스트·프로덕션 배포까지 전부 완료**(2026-08-19 구현, 2026-08-20 배포) — 자세한 내용은 위 "인증 — 휴대전화 / 알림톡" 섹션 참고
    - **SMS 단독 실발송도 프로덕션에서 완료**(2026-08-20) — 알림톡(카카오 채널·템플릿 심사)만 아직 **대기/예정** (외부 절차, 코드 아님)
- **보안 강화** (2026-08-15에 코드 레벨 갭 다수 해소 — 위 "완료됨"의 "보안 강화 — 백엔드 취약점 5건 수정" 참고)
    - OTP 요청은 IP 레이트리밋이 추가됐지만(위 참고), **로그인 등 나머지 라우트는 여전히 레이트 리밋/브루트포스 방어 없음**
    - 쿠키 기반 외 추가 CSRF 방어 없음
    - 관리자 행위 감사 로그는 도입됐지만(위 "완료됨" 참고), 보안 이벤트(로그인 실패·비정상 접근 등) 모니터링은 여전히 없음
    - **2026-08-14 RCE 침해사고 후속** — 취약점 자체와 DB/JWT/root SSH 비밀번호는 사고 당일, 코드 레벨 후속과 인프라 항목(백업 cron, fail2ban 확장, unattended-upgrades, 카페24 방화벽, nodemailer, SSH 키 전용 인증, UptimeRobot, Sentry DSN 2건)은 2026-08-15~16에 전부 완료(위 "완료됨" 참고). Toss Secret Key/Webhook Secret은 2026-08-16 실제로 재발급 받아 서버에 반영·재시작 완료(client key는 공개 키라 재발급 없음, 기존 값 유지). **Kakao API 키는 2026-08-25에 이어 2026-08-29에 한 번 더 재발급 완료**(위 "완료됨" 참고) — 콘솔에서 옛날 키 삭제만 사용자 몫으로 남음. 상세는 `DEPLOYMENT.md` "10-1" 참고
    - **UptimeRobot + Sentry 완료, 브라우저 에러 캡처 버그 발견·수정** (2026-08-16) — UptimeRobot에 `/api/health` 5분 간격 모니터 등록(이메일 알림). Sentry는 백엔드(`node-express`)·프론트(`javascript-nextjs`) 프로젝트 2개 생성해 DSN 반영, 실제 에러 발생시켜 둘 다 라이브 검증. 이 과정에서 **`sentry.client.config.ts`가 8/10 Sentry 도입 이후 계속 무시되고 있던 버그**를 발견 — `@sentry/nextjs` 10.x+Next 16은 브라우저 초기화를 `instrumentation-client.ts` 파일명으로 찾는데 구 컨벤션 파일명만 있어서 빌드 에러/경고 없이 조용히 누락되고 있었음(서버 에러는 정상 수집 중이었지만 사용자 브라우저 JS 에러는 한 번도 안 잡히고 있었음). 파일명 변경으로 해결, 브라우저에서 실제 미처리 예외를 던져 Sentry로 200 응답 나가는 것까지 확인(`DEPLOYMENT.md` "10-3" 참고)
- **OAuth / SSO**
    - Google/Kakao 등 소셜 로그인 없음
- **결제** (2026-08-13 토스페이먼츠로 최초 구현, 2026-09-29 나이스페이먼츠로 PG 교체 + 낙찰 수수료 자동화 — 위 "결제·멤버십" 섹션 참고)
    - 아직 **샌드박스 테스트 키** — 나이스페이 PCI-DSS 요건 확인 및 실 가맹심사·키 전환 전
    - ~~실 가격 미정~~ **2026-09-18 확정 완료** (베이직 무료/플러스 29,900/프리미엄 49,900/비즈니스 99,900원, 애드온 39,900원)
    - 관리자 콘솔에 결제/구독/수수료 내역 조회 UI 없음 (기사/회사 개인용 결제 내역 화면은 2026-08-19 추가됨 — 위 "완료됨" 참고) — 환불 자체는 취소 흐름에서 자동화됨
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
- ~~휴대전화 로그인 설계 방향 확정 — 2026-08-11에 이 방향대로 구현·테스트까지 완료~~ **2026-08-19에 아래 방향으로 재결정·재구현** (기사/버스회사 쪽도 이메일 회원가입 화면이 임시 상태였고, 승객과 마찬가지로 전화번호만으로 충분하다고 판단)
    - ~~승객 회원가입은 계속 이메일 기반, 단 전화번호도 필수 입력으로 추가~~ → **승객/기사/버스회사 전 역할이 이메일·비밀번호 없이 전화번호+OTP만으로 가입·로그인**(역할별 필수 필드는 위 "인증 — 휴대전화 / 알림톡" 참고)
    - 관리자 로그인은 그대로 **이메일/비밀번호 유지**(SMS 업체 장애 대비), 단 공개 로그인 페이지에서 분리해 `/admin/login`으로 이동
    - ~~별도의 "전화번호만으로 간편가입" 경로는 만들지 않기로 함~~ → 정반대로 결정 뒤집힘: 기존 이메일/비밀번호 계정은 마이그레이션하지 않고, 배포 시점에 `User` 테이블을 새로 밀어서 없애기로 함(사용자 확정, "기존 계정은 새로 디비 밀고 없애면 되잖아") — 재등록 부담보다 마이그레이션 로직 유지 비용이 더 크다고 판단
    - 같은 전화번호로 승객과 기사/회사 계정을 각각 만들 수 있어야 한다는 점이 뒤늦게 드러나 `@@unique([phoneNumber, role])` + `accountType` 구분으로 해결(위 참고)
    - SMS 발송은 **알리고(Aligo)** 사용 예정, 알림톡 우선 + SMS 폴백(카카오 채널·템플릿 심사 대기 중에는 개발모드로 서버 로그에 인증번호 출력) — 변경 없음

## 기술 메모

- Docker는 **PostgreSQL DB만** 로컬(및 배포 시 서버)에서 실행 — `server/docker-compose.yml`, 컨테이너명 `goodbus-postgres`
- **Next.js·Express는 Docker로 묶지 않음** — `npm` / `pm2`로 직접 실행 (의도된 구성)
- 개발: `npm run dev:all` (프론트 :3000 + API :4000)
- TypeScript: Next·Express 모두 TS 작성, 빌드 시 JS로 변환 후 Node 실행
- Node.js는 언어가 아니라 **JavaScript/TypeScript 실행 환경**(브라우저 vs 서버)

## 다음 단계

1. ~~카페24 VPS 결제·SSH → 도메인·SSL → `build:prod` + pm2 + Nginx~~ **2026-08-16 실제 배포 완료** (위 "호스팅" 섹션 참고)
2. ~~SSH 키 인증 전환~~ **2026-08-16 완료** (`DEPLOYMENT.md` "10-2")
3. ~~UptimeRobot 가입, Sentry DSN 재발급, Toss 키 재발급~~ **2026-08-16 완료** — ~~Kakao 키 재발급~~ **2026-08-25 완료, 2026-08-29 한 번 더 재발급**(콘솔에서 옛날 키 삭제만 사용자 몫으로 남음)
4. `DEPLOYMENT.md` "10. 배포 후 체크리스트" 나머지 — 견적→입찰→낙찰 전체 흐름, 관리자 콘솔 UI 브라우저 검증
5. ~~카카오 비즈니스 채널 + 알리고 신청, 알림톡 인증 템플릿 심사~~ ~~템플릿 12종 설계·등록, 카카오 심사 제출(2026-10-01~10-02)~~ **12종 전부 승인, 11종 발송 코드 연결·운영 반영 완료(2026-10-06~08, 위 "완료됨" 참고)** — 남은 건 승객_리뷰요청 하나뿐(운행완료 판정 cron 설계 선행 필요)
6. ~~휴대전화 OTP 로그인 API·UI~~ ~~전 역할(승객/기사/버스회사) 전화번호 전용으로 전면 개편·구현·테스트 완료(2026-08-19)~~ **프로덕션 배포 + SMS 단독 실발송까지 완료(2026-08-20)** — 남은 건 카카오 알림톡 심사뿐(`.claude/roadmap.md` 참고)
7. 랜딩 정리, 실 가격 확정 (~~약관 정리~~ 페이지는 2026-08-14 추가 완료, 법률 검토·통신판매업 신고번호 반영은 남음)
8. ~~PG 신청·결제·빌링키(카드 등록)·멤버십 서버 연동~~ **토스로 구현·프로덕션 반영까지 완료(2026-08-13~16), 2026-09-29 나이스페이먼츠로 PG 교체(샌드박스 키로 구현·테스트 완료)** — 나이스페이 가맹심사·PCI-DSS 요건 확인 통과 후 env만 교체하면 실 결제 전환
9. 관리자 콘솔에 결제/구독 조회·환불 UI 추가
10. ~~Phase 3 — Cloudflare 전체 프록시~~ **2026-08-25 완료**(네임서버 이관, DNS Proxied, SSL Full strict, 원본 IP 우회 차단까지 — 위 "완료됨" 참고)
11. 남은 보안·운영 과제: 로그인 등 OTP 외 라우트 레이트리밋, `adminRole` API 전면 RBAC, 감사 로그 필터, 사이드바 이름 표시 fallback, `X-Frame-Options` 등 보안 헤더 nginx/next.config.ts 중복 정리. ~~`admin.ts` 전체 Zod 스키마화~~ **2026-08-25 완료**(위 "완료됨" 참고)
