# 2026-08-20 코드 검사·수정 보고서

이 문서는 프로젝트 전체 검사(버그·로직/효율성·죽은 코드) 이후 진행한 수정 작업과 실제 검증(runtime verification) 결과를 정리한다. 커밋은 아직 안 된 상태(작업 트리 변경분)이며, 이 문서는 커밋 시 함께 남기기 위해 작성했다.

## 배경

전체 프로젝트 검사(정찰 3개 에이전트 + 코드 직접 재확인 + 정적 검증)로 15개 항목을 발견했고, 사용자 요청으로 전부 수정했다. 수정 과정에서 사용자가 직접 로그인/가입 플로우를 테스트하다가 기존 OTP 요청 설계(보안 강화 목적으로 2026-08-15에 도입된 "가입 여부를 API 응답으로 노출하지 않는다" 정책)가 실사용성을 해친다는 걸 발견해, 대화를 통해 의도적으로 설계를 바꿨다. 즉 이번 작업은 (1) 정적 감사 기반 버그/효율성 수정과 (2) 사용자 실사용 테스트로 드러난 UX/보안 트레이드오프 재설계, 두 갈래로 이뤄졌다.

## 1. 감사 기반 수정 (12개 항목)

| # | 항목 | 파일 | 내용 |
|---|---|---|---|
| 1 | 리뷰 소유권 검증 | `server/src/routes/reviews.ts` | `GET /reviews`를 승객 전용으로 제한 — 이전엔 Driver/BusCompany/Admin이 tripId만 알면 무관한 여정의 리뷰(승객 개인정보 포함)를 조회 가능했음 |
| 2 | try/catch 보강 | `payments.ts`, `bids.ts`, `reviews.ts`, `trips.ts` | try/catch 없던 11개+ 핸들러 보강 — Express4 async rejection 무한대기 패턴 방지 |
| 3 | Turnstile 배선 | `server/src/routes/auth.ts`, `app/signup-business/page.tsx` | 프론트·백엔드 양쪽 다 죽어있던(호출되지 않던) 봇 방지 기능을 실제로 연결 |
| 4 | trips N+1 축소 | `server/src/routes/trips.ts` | trip별 개별 `bid.aggregate` 호출 → 단일 `groupBy`로 축소. 페이지네이션은 프론트 3개 훅이 전량 조회를 전제해 이번 범위에서 보류 |
| 5 | 가격/한도 상수 중복 제거 | `lib/*Core.ts` ↔ `server/src/utils/*Core.ts` | `paymentPricing`, `membershipLimits`, 플랫폼 커미션율을 단일 소스로 통합 후 재-export |
| 6 | `Trip.passengerId` 인덱스 | `server/prisma/schema.prisma` | 추가 + 로컬 DB 반영 |
| 7 | admin 목록 안전 상한 | `server/src/routes/admin.ts` | `GET /admin/users`, `GET /admin/verifications`에 `take` 상한 추가(전면 페이지네이션은 프론트 계약 변경이 커서 보류) + 불필요한 `as any` 캐스트 제거 |
| 8 | 대시보드 훅 `useEffect`/`useCallback` deps | `hooks/use{Admin,Company,Driver,Passenger}Dashboard.tsx`, `ChatPanel.tsx`, `OpenTripBidDialog.tsx`, `AdminUsersPanel.tsx` | 안전하게 고칠 수 있는 건 `useCallback`으로 안정화, 함수 미안정화로 무한루프 위험이 있는 건 이유를 명시한 `eslint-disable-next-line`으로 처리 |
| 9 | 죽은 코드 정리 | `components/ui/radio-group.tsx` 등 | 미사용 컴포넌트 삭제, 미사용 import/변수 다수 정리 (lint warning 84→20) |
| 10 | `lib/api.ts` 안정화 | `lib/api.ts` | 2xx 빈 바디 응답 시 JSON 파싱 에러 처리, 15초 요청 타임아웃 추가 |
| 11 | 프론트 성능 미세 개선 | `lib/kakaoDistance.ts`, `OpenTripsList.tsx`, `Driver/CompanyDashboardContent.tsx` | 순차 await → `Promise.all` 병렬화, O(n²) 재계산 방지용 `useMemo` 추가 |
| 12 | 전체 검증 | — | tsc(루트+서버)/lint/vitest(48/48) + 브라우저(landing, signup-business, admin 콘솔) 실제 확인 |

## 2. 인증(로그인/가입) 설계 재검토 — 사용자 실사용 테스트로 발견

### 발견된 문제

`server/src/routes/auth.ts`의 `POST /auth/phone/request-otp`가 "가입 여부를 API 응답으로 노출하면 번호 스캔으로 가입자 명단을 추출할 수 있다"는 이유로, 대상이 아닌 경우(로그인인데 미가입 / 가입인데 이미 가입됨) **실제 인증번호를 보내지 않고 겉으로만 성공 응답**을 반환하고 있었다. 그 결과:

- 로그인 화면에서 미가입 번호로 인증번호를 요청해도 "가입되지 않았습니다"를 절대 볼 수 없음 (사용자가 직접 테스트하다 발견)
- 가입 화면에서 이미 가입된 번호로 시도해도 같은 이유로 막힘

### 결정된 설계 (사용자 확정)

1. **로그인**: `purpose=login` 요청 시 인증번호 발송 전에 계정 존재/차단 여부를 즉시 확인 → 없으면 `404 등록된 회원 정보가 없습니다`, 차단이면 `403 차단된 계정입니다`. 있으면 정상 발송.
2. **가입**: `purpose=signup`은 가입 여부와 무관하게 항상 인증번호 발송. `POST /auth/signup`에서 인증 성공 후 같은 그룹(승객 / 기사·회사)에 이미 계정이 있으면 새로 만들지 않고 **그 계정으로 바로 로그인 처리**(기존 프로필 데이터는 덮어쓰지 않음).
3. **트레이드오프**: 로그인 경로는 이제 계정 존재 여부가 API 응답으로 드러난다 — 번호 스캔 방어는 약해졌지만, IP당 레이트리밋(10분 10회)과 번호당 쿨다운/횟수 제한이 여전히 완화책으로 남아있다. 사용성을 우선한 의도적 결정.

### OTP 요청 횟수 제한 재설계

기존엔 "하루 5회"만 있어서 다 쓰면 다음날까지 완전히 잠겼음(정상 사용자도 테스트/재전송 몇 번이면 자정까지 막힘 — 사용자가 직접 겪고 지적).

- **변경 전**: 60초 쿨다운 + 하루 5회 하드 캡
- **변경 후**: 60초 쿨다운(유지) + **최근 10분 내 5회** 초과 시 남은 대기 시간을 안내하고 시간이 지나면 자연히 풀림 + 하루 20회는 지속적 남용을 막는 넉넉한 백스톱으로만 유지
- **성공 시 이력 초기화**: 로그인/가입에 성공(=실제 번호 소유 증명)하면 그 번호의 요청 이력을 삭제해 다음 인증 때 이전 실패/재시도가 발목 잡지 않게 함. 코드 추측 자체를 막는 방어선(코드당 5회 시도 제한·5분 만료·4자리 엔트로피)은 이 초기화와 무관하게 그대로 유지되어, 악용 여지 없이 안전하다고 판단.

## 3. 실제 실행 검증 (runtime verification)

정적 검증(tsc/lint/vitest)은 매 수정 단계마다 통과 확인했고(루트+서버 tsc 클린, lint 84→20 warning 전부 `<img>` 권고, vitest 48/48), 이번엔 실제로 서버를 띄워 API를 호출하며 확인했다. 격리를 위해 사용자의 기존 4000번 포트 인스턴스는 건드리지 않고 별도 4002번 포트에 인스턴스를 띄워 테스트 후 종료했다.

| 검증 항목 | 방법 | 결과 |
|---|---|---|
| 미가입 번호 로그인 인증요청 | `POST /auth/phone/request-otp` (실제 미가입 번호) | `404 {"error":"등록된 회원 정보가 없습니다"}` — 정확 |
| 등록된 번호 로그인 인증요청 | 동일 (실제 DB의 승객 번호) | `200`, dev 모드 코드 발급 확인 |
| 실제 코드로 로그인 완료 | `POST /auth/phone/login` (dev 콘솔에서 읽은 진짜 코드) | `200`, 세션 발급 성공 |
| 로그인 성공 시 이력 리셋 | 로그인 전/후 `PhoneVerification` 행 수 DB 직접 조회 | 성공 직후 해당 행 삭제 확인(count 4→3, 새로 만든 행만 제거됨) |
| 10분 내 5회 제한 | DB에 5개 요청 이력을 직접 시딩 후 6번째 요청 | `429 {"error":"요청이 너무 많습니다. 2분 후 다시 시도해주세요","retryAfterSeconds":116}` — 가장 오래된 요청 기준 잔여 시간 계산 정확 |
| 🔍 쿨다운이 윈도우 체크보다 먼저 걸리는지 | 성공 요청 직후 바로 재요청 | `429 잠시 후 다시 시도해주세요` (60초 쿨다운이 먼저 걸림, 설계대로) |
| 🔍 차단된 계정 즉시 거부 | 차단 상태 테스트 계정으로 로그인 인증요청 | `403 차단된 계정입니다` (인증번호 발송 전에 즉시 거부) |
| 중복 가입 → 로그인 처리 | 이미 등록된 기사 번호로 "다른 이름"을 입력해 가입 시도 | `200`, 응답은 **기존 계정 데이터**(원래 이름 그대로, 새로 입력한 이름 무시) + 새 세션 토큰. DB 조회로 중복 User row가 생기지 않았음도 확인 |
| 🔍 회귀 — 리뷰 소유권 제한 | 기사 토큰으로 `GET /reviews` 호출 | `403 Forbidden` (승객 전용 제한 유지 확인) |
| 🔍 회귀 — trips 정상 동작 | 기사 토큰으로 `GET /trips` 호출 | `200` |
| 결제 라우트 실 세션 — 조회 | 실제 기사 로그인 세션으로 `GET /payments/billing-key`, `/subscribe/status`, `/addon/min-bid/status`, `/transactions`, `GET /bids/min-by-vehicle-type` 호출 | 전부 `200`, 정상 데이터 (try/catch 보강 후에도 정상 동작) |
| 결제 라우트 실 세션 — mutating | 같은 세션으로 `POST /payments/subscribe/cancel`, `/addon/min-bid/cancel`(활성 구독 없음), `POST /bids`(미인증 기사), `PATCH /bids/:id/withdraw`(없는 id) 호출 | 각각 `404 Active subscription not found`, `403 Driver verification required`, `404 Bid not found` — 전부 크래시·무응답 없이 깔끔한 구조화된 에러 |

### 참고

- 이번 실행 검증은 API 레벨(curl)로 진행했다. 프론트 UI를 통한 재확인(로그인 화면에서 실제로 "등록된 회원 정보가 없습니다" 모달이 뜨는지 등)은 이번 세션 앞부분에서 브라우저로 이미 확인한 이전 버전 기준이라, **이번에 새로 바뀐 로그인/가입 문구를 브라우저로는 아직 재확인하지 않았다** — 필요하면 추가로 확인 가능.
- 테스트 중 생성한 `PhoneVerification`/임시 차단 계정 등은 전부 정리했고, 검증용 서버 인스턴스(4002번 포트)도 종료했다. 사용자가 직접 띄워둔 4000번 포트 인스턴스는 건드리지 않았다.
