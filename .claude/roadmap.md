# 로드맵: 휴대전화(알리고 OTP) 로그인/회원가입

브랜치: `aligo`.

## 다음 세션 시작 가이드 (2026-08-11 기준 — 여기서부터 읽으면 됨)

**코드는 100% 완성·테스트 완료.** 남은 건 알리고 계정 가입 + 카카오 비즈니스 채널/템플릿 심사(외부 절차, 코드 아님)뿐. 이 세션을 다시 시작할 때 알리고 계정이나 카카오 채널이 준비돼 있다면, 아래 순서대로 바로 진행하면 됨.

### 지금 상태 (env 변수 없음 → dev 모드)
`server/.env`에 `ALIGO_*` 관련 값이 전혀 없어서 `server/src/utils/aligo.ts`가 실제 발송 대신 서버 콘솔에 `[Aligo:DEV] {전화번호} 인증번호: {4자리코드}`를 출력함. `npm run dev:all`로 지금 바로 회원가입/로그인 UI를 눌러봐도 실제 문자는 안 오고 서버 터미널에 코드가 찍힘 — 이 상태로도 플로우 자체는 완전히 동작함(QA 가능).

### Step 1 — SMS 단독 발송부터 켜기 (알리고 가입만 됐으면 바로 가능)
1. 알리고에서 API 키(`ALIGO_API_KEY`, `ALIGO_USER_ID`)와 승인된 발신번호(`ALIGO_SENDER`) 확보
2. `server/.env`(`.env.example`이 아니라 실제 `.env`)에 3개 값 채우기
3. 서버 재시작 후, 본인 실제 휴대폰 번호로 회원가입 또는 로그인 시도 → 진짜 문자가 오는지 확인
4. 만약 실패하면 서버 로그의 `Aligo SMS error` / `Aligo SMS rejected` 메시지를 보고 알리고가 뭐라고 응답했는지 확인 → 필요시 `server/src/utils/aligo.ts`의 `sendViaSms` 함수만 수정 (다른 곳은 안 건드려도 됨)

### Step 2 — 카카오 알림톡까지 켜기 (채널+템플릿 승인 후)
1. 승인된 발신 프로필키(`ALIGO_KAKAO_SENDERKEY`), 템플릿 코드(`ALIGO_ALIMTALK_TPL_CODE`)를 알리고에서 확보
2. 카카오가 승인한 템플릿 문구를 그대로 `ALIGO_ALIMTALK_TEMPLATE`에 넣기, 인증번호 자리만 `{{CODE}}`로 표시 (예: `[버스대절] 인증번호는 {{CODE}} 입니다. 5분 이내에 입력해주세요.`)
3. `server/.env`에 이 3개 추가 (Step 1의 3개는 그대로 유지 — SMS 폴백용으로 계속 씀)
4. 서버 재시작 후 다시 실제 번호로 테스트 → 카카오톡 메시지로 오는지 확인
5. **가장 중요**: 알림톡 API 응답 파라미터명(`result_code` 등)은 2026-08-07 리서치 기록을 그대로 코드에 반영한 것이라 실제 응답과 다를 수 있음. 처음 실발송 테스트할 때 서버 로그의 `Aligo AlimTalk rejected`/`error` 내용을 꼭 확인하고, 다르면 `server/src/utils/aligo.ts`의 `sendViaAlimtalk` 함수만 수정하면 됨(OTP 발급/검증/DB 로직은 전혀 안 건드려도 됨)

### 관련 코드 위치
| 역할 | 파일 |
|---|---|
| OTP 발급/검증, 쿨다운·횟수 제한 | `server/src/utils/otp.ts` |
| 알리고 발송 클라이언트 (dev/SMS/알림톡 자동 전환) | `server/src/utils/aligo.ts` |
| API 라우트 (`/auth/phone/request-otp`, `/auth/phone/login`, `/auth/signup` 확장) | `server/src/routes/auth.ts` |
| DB 스키마 (`PhoneVerification`, `User.phoneNumber @unique`) | `server/prisma/schema.prisma` |
| 로그인/가입 화면 | `app/login/page.tsx`, `app/signup/page.tsx` |
| 프론트 API 클라이언트 | `lib/api.ts`의 `authAPI.requestPhoneOtp`/`loginWithPhone`, `authAPI.signup` |
| env 변수 문서 | `server/.env.example` |

### 참고: 이 문서 vs `PROJECT_STATUS.md` 설계 차이 (해결됨)
이 문서의 원래(2026-08-07) 설계는 "전화번호만으로 가입(이메일 없음)"이었는데, `PROJECT_STATUS.md`(2026-08-06 결정)는 "이메일+비밀번호 유지, 전화번호는 추가 필수"였음 — 서로 상충. **`PROJECT_STATUS.md` 쪽으로 확정하고 구현함.** 아래 "확정된 설계 결정"부터 "제안하는 작업 순서"까지는 **당시 논의 기록으로만 보존**(email/passwordHash nullable 관련 내용은 무효), 알리고 API 파라미터 리서치는 여전히 유효해서 그대로 반영함.

## 진행 상황 업데이트 (2026-08-08)

- OTP 기능 자체는 아직 미착수. 대신 이 사이에 `aligo` 브랜치에서 **홈페이지 리디자인** 작업을 진행함(사용자 요청으로 우선순위가 바뀜) — 가짜 통계/장식 버튼 제거, 한글 폰트 수정, 히어로 배경 영상, 모바일 반응형 등. 세부 내역은 `.claude/refactor.md`의 "홈페이지 리디자인 (2026-08-08)" 섹션 참고
- 해당 작업은 커밋 후 PR #15로 `main`에 병합 완료. **`aligo` 브랜치는 삭제하지 않고 그대로 유지**(사용자 명시적 요청) — 현재 `aligo`와 `main`은 동일 커밋 상태
- 즉 다음 세션에서 `aligo` 브랜치로 OTP 작업을 시작해도 `main`과 이미 동기화되어 있어 별도 리베이스 없이 바로 이어갈 수 있음
- 아래 "현재 코드 상태"에 기록된 `auth.ts`/`signup` 관련 조사 내용은 홈페이지 변경과 무관한 영역이라 여전히 유효함(재조사 불필요)

## 진행 상황 업데이트 (2026-08-10)

- OTP 작업은 여전히 미착수. 그 사이 `aligo` 브랜치에서 두 가지가 더 진행됨(세부 내역은 `.claude/refactor.md` 해당 날짜 섹션 참고):
    1. **테스트·CI·에러 트래킹**: Vitest 유닛 테스트(프론트+백엔드 총 48개), GitHub Actions CI(`main`/`aligo` 트리거로 이미 갱신됨), Sentry 에러 트래킹
    2. **회원가입 이름 버그 + 관리자 감사 로그 + 목록 페이지네이션**
- 이 중 하나가 **바로 이 로드맵과 직접 겹침**: 아래 43-52행에 적힌 "`app/signup/page.tsx`는 이름을 입력받지만 `authAPI.signup`이 안 보냄" 버그가 **이미 고쳐짐** — `authAPI.signup`은 이제 4번째 파라미터로 `displayName`을 받아 서버에 저장한다. OTP 작업 시작 시 이 부분을 다시 고치려 하지 말 것. 단, `signupSchema`가 지금은 `email`/`password`/`role` 필수 + `displayName` 선택 구조라서, OTP 작업에서 계획한 "email/passwordHash nullable, phoneNumber unique" 스키마 변경은 여전히 그대로 필요함(영향 없음)
- 나머지(테스트/CI/Sentry/감사로그/페이지네이션)는 OTP 로그인과 겹치는 영역 없음, 그대로 참고만 하면 됨
- `aligo`는 이번에도 삭제되지 않고 유지 중, `main`과 동기화 여부는 다음 세션 시작 시 `git log`로 확인 필요(이번엔 PR 병합 여부 미확인 상태로 세션 종료)

## 목표

승객 회원가입/로그인을 **전화번호 + 인증번호(OTP)** 방식으로 가능하게 함. 알리고(Aligo)의 카카오 알림톡 API를 우선 사용하고, 실패 시 SMS로 자동 대체.

## 확정된 설계 결정

- **승객 회원가입은 전화번호만으로 가능** (이메일 없음). 이메일은 나중에 프로필에서 선택적으로 추가 가능하게 할 수 있음.
- 전화 가입 계정은 **비밀번호가 없음** — 로그인은 매번 OTP로.
- 기존 이메일 가입 승객은 그대로 이메일/비밀번호 로그인 유지. 새로 전화번호를 추가로 등록해서 전화 로그인도 병행 가능하게 하려면 별도 프로필 화면이 필요함(아래 참고).
- **전화 가입 계정과 기존 이메일 계정은 자동으로 연동되지 않음** — 같은 사람이 이메일로도, 전화로도 각각 가입하면 별개의 두 계정이 될 수 있음. 이건 일단 감수하기로 함(MVP 단계).
- **관리자(Admin) 로그인은 영향 없음** — 관리자는 공개 회원가입 화면이 아니라 기존 Super 관리자가 관리자 콘솔에서 직접 발급하는 계정이라(이메일+비밀번호), 이번 변경과 완전히 분리되어 있음. SMS 업체 장애 시에도 관리자는 그대로 접속 가능.
- 기사(Driver)/버스회사(BusCompany)는 이번 작업 범위 아님 — 이미 "나의 정보"에 전화번호 입력란 있음, 그쪽은 안 건드림.

## 알리고(Aligo) API 사용법 (조사 완료)

### 1) 카카오 알림톡 발송
- `POST https://kakaoapi.aligo.in/akv10/alimtalk/send/`
- 사전 준비 필수: 카카오 비즈니스 채널 인증 + **메시지 템플릿 사전 심사·승인**(보통 4~5일 소요, 승인 전엔 사용 불가)
- 주요 파라미터: `apikey`, `userid`, `senderkey`(발신 프로필키), `tpl_code`(승인된 템플릿 코드), `sender`, `receiver_1`, `message_1`(승인된 템플릿 문구·개행과 정확히 일치, 변수만 실제 값 치환)
- **`failover=Y`** + `fsubject_1`/`fmessage_1` 파라미터만 추가하면 "알림톡 실패 시 자동 SMS 대체발송"이 API 차원에서 처리됨 — 직접 폴백 로직 안 짜도 됨. 원하는 "카카오채널 우선, 없으면 문자" 흐름이 이 옵션 하나로 해결됨.

### 2) SMS 단독 발송 (템플릿 승인 전 개발/테스트용)
- `POST https://apis.aligo.in/send/`
- 파라미터: `key`, `user_id`, `sender`, `receiver`, `msg` — 사전 승인 템플릿 불필요, 그냥 텍스트로 인증번호 전송

### 3) 인증번호 생성·검증은 알리고가 안 해줌
알리고는 "메시지 전송"만 담당. 코드 생성/저장/만료/비교는 우리 서버가 직접 구현 필요 → `PhoneVerification` 임시 테이블 필요 (아래 참고).

### 실무 순서
템플릿 승인 전(개발 단계)엔 SMS API 또는 서버 로그 출력으로 대체 → 카카오 승인 나면 알림톡 API(`failover=Y`)로 전환. 코드 구조는 거의 안 바뀌고 발송 클라이언트만 교체.

## 현재 코드 상태 (조사 완료, 2026-08-07 기준)

- `app/signup/page.tsx`: 이메일/비밀번호만 받음, `name` 입력칸 있지만 API로 안 보내지는 기존 버그 있음 (`lib/api.ts:63-71`의 `authAPI.signup`이 email/password/role만 전송)
- `server/src/routes/auth.ts`의 `signupSchema`/`loginSchema`: `email`, `password` 둘 다 필수, `phone` 필드 자체가 없음
- `app/login/page.tsx`: 전화 탭 UI는 이미 있지만 `handlePhoneRequest`가 `alert('아직 기능 구현 전입니다.')`만 띄우는 껍데기 (line 35-37)
- `server/prisma/schema.prisma` User 모델: `email String @unique`(필수), `passwordHash String`(필수), `phoneNumber String?`(nullable, **unique 아님**) — 셋 다 이번에 바뀌어야 함
- `server/src/types/index.ts`의 `JWTPayload`: `userId`, `role`만 있음 (phone 없음, 이대로 유지해도 됨)
- 승객용 프로필 수정 화면/API: **없음**. `PATCH /profile/me`는 Driver/BusCompany 전용으로 막혀있음 (`server/src/routes/profile.ts:20,52`)
- 사이드바 표시: `components/passenger/PassengerDashboardContent.tsx:48`에서 `user.email`을 그대로 표시 — 전화 가입 계정은 email이 없어서 이 부분 반드시 고쳐야 함
- OTP/인증번호 관련 기존 코드: 전혀 없음 (처음부터 구현)

## 필요한 변경사항

### 데이터 모델 (Prisma)
- `email` → nullable로 변경
- `passwordHash` → nullable로 변경
- `phoneNumber` → `@unique` 추가
- `PhoneVerification` 모델 신규: `phoneNumber`, `code`(해시 저장 권장), `purpose`(signup/login), `expiresAt`, `attempts`, `consumedAt`

### 백엔드
- `POST /auth/otp/request` 신규 — `{ phone, purpose }`. signup이면 "이미 가입된 번호" 체크, login이면 "미가입 번호" 체크 후 코드 발급·발송
- `POST /auth/otp/verify` 신규 — `{ phone, code, purpose }`. signup이면 계정 생성+로그인, login이면 로그인 처리
- 알리고 연동 모듈 신규 (`utils/aligo.ts` 등) — 알림톡(failover)/SMS 단독 둘 다 감싸고, 템플릿 승인 전 개발모드(로그 출력) 스위치 포함
- 기존 `/auth/signup`, `/auth/login`(이메일/비밀번호)은 그대로 유지 — 기사/버스회사, 기존 이메일 승객용
- 승객용 프로필 수정 API 신규 — 기존 이메일 승객이 전화번호를 추가 등록(OTP 인증 후 연결)할 수 있게
- env 변수 추가: 알리고 API키, 발신번호, 발신프로필키, 템플릿코드, 개발모드 플래그

### 프론트엔드
- `app/signup/page.tsx`: 전화번호 가입 흐름 추가 (번호 입력 → 인증번호 받기 → 코드 입력 → 가입)
- `app/login/page.tsx`: 전화 탭 실제 구현 (번호 등록 여부 체크 → 미가입이면 회원가입 유도, 가입되어 있으면 인증번호 발송·입력 UI)
- 승객용 "나의 정보" 화면 신규 (`BidderProfileEditPanel.tsx` 패턴 참고) — 전화번호 추가 등록용
- 사이드바 표시 로직 수정 — 이름 → 전화번호 → 이메일 순서로 fallback
- `lib/api.ts`: `authAPI.requestOtp`, `authAPI.verifyOtp` 추가

### 외부 절차 (코드 아님)
- 알리고 가입 + API 키 발급
- 카카오 비즈니스 채널 개설 + 인증
- 알림톡 템플릿 등록·심사 신청 (승인까지 보통 4~5일)

## 제안하는 작업 순서

1. Prisma 스키마 변경 (email/passwordHash nullable, phoneNumber unique, PhoneVerification 모델)
2. 백엔드 OTP 엔드포인트 (개발모드 — 로그만 출력, 알리고 실제 연동 전)
3. 프론트 signup/login 화면 연결
4. 알리고 실제 발송 연동 (카카오 템플릿 승인 나면 알림톡, 아니면 SMS API)
5. 승객 프로필 화면 + 사이드바 fallback

## 관련 문서

- `PROJECT_STATUS.md`의 "알려진 버그 / 결정 사항 (2026-08-06 논의)" 섹션 — 이번 로드맵 이전의 초기 논의 기록
- `.claude/refactor.md` — 지금까지 진행한 작업 기록 (보안 최소 조치: JWT secret/AdminRole/업로드 검증 + 홈페이지 리디자인: AI 티 제거/히어로 영상/모바일 반응형 + 승객·기사/회사 대시보드 개선 + 테스트·CI·Sentry + signup 이름/감사로그/페이지네이션)
