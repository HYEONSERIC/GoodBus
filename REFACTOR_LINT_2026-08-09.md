# 린트 에러 정리 (2026-08-09)

CI 도입 후 확인된 루트 `npm run lint` 에러 17개 중, 동작 변화 없이 안전하게 고칠 수 있는 15개를 정리했다. 나머지 2개는 실제로 고치면 회귀가 생길 수 있다고 판단해 의도적으로 남겨뒀다.

## 고친 것 (15개)

### JSX 미이스케이프 문자 4개
- **파일:** `components/passenger/PassengerTripCreateFlow.tsx`
- **내용:** 안내 문구 안의 작은따옴표(`'출발, 귀환만 운송'`, `'일정 동행'`)를 `&apos;`로 이스케이프. 화면 표시 텍스트는 동일.

### 재할당 없는 `let` → `const` 1개
- **파일:** `components/MyBidQuoteDetailDialog.tsx`
- **내용:** `parseBracketSection` 내부 `let rest`가 이후 재할당되지 않아 `const`로 변경.

### `Notifications.tsx`의 불필요한 마운트 후 리렌더 1개
- **파일:** `components/Notifications.tsx`
- **증상이던 것:** localStorage에서 알림 동의 상태를 읽어와 `useEffect` 안에서 `setState`로 반영 — 마운트 직후 "기본값 렌더 → 실제값으로 리렌더" 한 번의 추가 렌더가 발생.
- **수정:** 두 `useState`를 지연 초기화 함수(`useState(() => {...})`)로 변경해 최초 렌더부터 바로 실제값을 사용하도록 함. 이 컴포넌트는 마운트 시 한 번만 값을 읽으면 되고 이후 이 값이 바뀔 조건(다른 곳에서 `userId` 같은 값이 바뀌어 다시 읽어야 하는 경우)이 없어서 안전.

### `any` 타입 9개 → 실제 사용 필드 기반 타입으로 교체
- **파일:** `app/dashboard/page.tsx`, `hooks/useCompanyDashboard.tsx`, `hooks/useDriverDashboard.tsx`, `hooks/usePassengerDashboard.tsx`, `types/dashboard.ts`
- **내용:** `user`/`membershipPlan`/`verification` 상태가 전부 `useState<any>`였던 것을, 각 파일에서 실제로 접근하는 필드(`user.id`, `user?.email`, `user?.companyRegistrationUrl`, `user?.driverLicenseUrl`, `verification?.companyRegistrationStatus` 등)만 골라 `types/dashboard.ts`에 새 타입 3개를 정의해서 교체:
  - `DashboardSessionUser` (기존 `DashboardBidderRef`에 역할별 서류 URL 필드 추가)
  - `DashboardVerification`
  - `DashboardMembershipPlan`
  - 승객 대시보드의 여정 필터 콜백(`trip: any`)도 실제 접근 필드만 있는 인라인 타입으로 교체.
- **검증:** 필드를 빠뜨리면 바로 `tsc` 에러로 드러나는 구조라, 각 파일에서 `user.`/`membershipPlan.`/`verification.`으로 접근하는 지점을 전부 grep으로 훑은 뒤 타입을 정의했고 `npx tsc --noEmit` 통과 확인.

## 의도적으로 남긴 것 (2개)

### 1. `components/PaymentCardsPanel.tsx` — `react-hooks/set-state-in-effect`
- **린트가 원하는 것:** localStorage에서 카드 목록을 읽어와 `setCards`하는 로직을 effect 밖(지연 초기화 등)으로 빼라는 것.
- **못 그렇게 한 이유:** 이 effect는 `[userId]`에 의존한다. `userId`는 로그인 직후 `undefined`였다가 인증 완료 후 실제 값으로 바뀌는데, 그 변화에 반응해서 올바른 사용자의 카드 목록을 다시 불러오는 게 이 effect의 실제 목적이다. `useState` 지연 초기화로 바꾸면 최초 마운트 시점(`userId`가 아직 `undefined`인 시점)의 값으로 고정되어, 인증이 끝난 뒤에도 카드 목록이 영영 로드되지 않는 회귀가 생긴다.
- **결론:** 린트 규칙이 "마운트 후 한 번만 읽으면 되는 값"과 "prop 변화에 반응해 다시 읽어야 하는 값"을 구분하지 못해서 생기는 오탐으로 판단, 그대로 둠.

### 2. `components/passenger/PassengerQuoteTripsList.tsx` — `react-hooks/purity` (impure `Date.now()`)
- **린트가 원하는 것:** 렌더링 중 `Date.now()` 같은 비순수 함수 호출을 피하라는 것(주로 이후 React Compiler 최적화 대비).
- **못 그렇게 한 이유:** 이 값은 "지금 기준으로 지난 여정인지" 여정 목록을 필터링하는 기준 시각이다. `useState`로 한 번만 캡처하면 대시보드를 오래 켜두는 동안 기준 시각이 마운트 시점에 고정되어, 시간이 지나도 이미 지난 여정이 계속 "예정"으로 표시되는 회귀가 생긴다.
- **결론:** 매 렌더마다 새로 계산하는 현재 동작이 오히려 의도한 동작이라 그대로 둠.

## 검증

- `npx tsc --noEmit -p tsconfig.json` 통과
- `npm run lint` — 17 errors → **2 errors**(위 의도적 보류 2건), 경고 85개는 이번 작업 범위 밖이라 그대로
- `npm test` — 18/18 통과 (회귀 없음)
- `npm run build` — 성공
