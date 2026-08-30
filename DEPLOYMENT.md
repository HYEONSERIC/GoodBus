# GoodBus — 카페24 VPS 배포 가이드

PG(결제) 없이 **베타·파일럿**을 올리는 것을 기준으로 한 설계입니다.

> 이 문서는 원래 AWS Lightsail 기준으로 작성됐다가, 실제 배포처가 **카페24 VPS**로 정해지면서 카페24 스택(자동설치로 Node/PostgreSQL/Nginx/PM2가 미리 깔림)에 맞춰 다시 정리했습니다. 핵심 차이는 두 가지입니다: ① DB는 카페24가 깔아준 네이티브 PostgreSQL 대신 **Docker Postgres를 그대로 유지**(기존 코드/스크립트 변경 최소화), ② HTTPS는 Caddy 대신 **Nginx + certbot**을 씁니다.

## 1. 아키텍처 (추천: 올인원)

```
                    [인터넷]
                        │
                        ▼
              ┌─────────────────────┐
              │  카페24 개발언어 VPS   │  DEV B, 4GB RAM (~66,000원/월)
              │  (자동설치: Node·PostgreSQL·Nginx·PM2)│
              ├─────────────────────┤
              │  Nginx                │  :443 HTTPS (certbot Let's Encrypt)
              │    /      → Next :3000│
              │    /api/* → Next :3000│  (Next가 Express로 프록시)
              │    /uploads → API :4000│
              ├─────────────────────┤
              │  pm2                  │
              │    goodbus-web :3000  │  next start
              │    goodbus-api :4000  │  node dist/index.js
              ├─────────────────────┤
              │  Docker Postgres :5432│  docker-compose (카페24 네이티브 Postgres는 미사용)
              │  server/uploads/      │  프로필·면허증 파일 (디스크)
              └─────────────────────┘
```

### 요청 흐름

| 경로 | 처리 |
|------|------|
| `https://도메인/` | Next.js (페이지) |
| `https://도메인/api/*` | Next `app/api/[...path]` → Express |
| `https://도메인/uploads/*` | Express 정적 파일 (Nginx가 직접 프록시) |

브라우저 API 호출은 **same-origin `/api`** 를 쓰므로 CORS·쿠키 문제를 줄입니다.
이미지 URL은 `NEXT_PUBLIC_API_URL=https://도메인` 으로 맞춥니다.

### 왜 Docker Postgres를 유지하나 (카페24 네이티브 PostgreSQL 17 대신)

카페24 자동설치 패키지를 선택하면 서버에 PostgreSQL 17이 이미 깔려 있습니다. 하지만 지금 코드(`server/docker-compose.yml`, `DATABASE_URL` 기본값)는 전부 Docker 컨테이너 기준으로 짜여 있어서, **그대로 Docker Postgres를 쓰는 쪽이 코드·스크립트 변경이 없어 더 안전**합니다. 카페24가 깐 네이티브 PostgreSQL 서비스는 꺼둡니다(5432 포트 충돌 방지):
```bash
sudo systemctl stop postgresql && sudo systemctl disable postgresql
```

> **대안 — 네이티브 PostgreSQL을 쓰고 싶다면**: Docker 설치를 생략하고, 카페24 PostgreSQL에 `goodbus` DB·계정을 만든 뒤 `server/.env`의 `DATABASE_URL`을 그 값으로 바꾸면 됩니다. 이 경우 `docker compose up -d` 단계는 건너뜁니다. (이 문서의 기본 경로는 Docker 유지 쪽입니다.)

---

## 2. 비용

| 항목 | 내용 |
|------|------|
| 카페24 개발언어 VPS **DEV B (4GB)** | 약 66,000원/월 |
| 도메인 | 연 1~2만원대 (등록 대행사에 따라 다름) |
| Kakao API | 무료 한도 내 |
| SMTP | 선택 (미설정 시 이메일 알림만 비활성) |

다른 스펙이 필요하면 카페24 콘솔에서 현재 플랜별 가격을 확인하세요.

---

## 3. 사전 준비

- 카페24 계정 + 개발언어 VPS 신청 (자동설치 패키지에서 **Node.js, PostgreSQL, Nginx, PM2** 선택)
- (권장) 도메인 — 카페24 DNS 또는 별도 등록기관
- Kakao Developers — REST API 키, **웹 도메인 등록**
- GitHub 등에서 코드 clone 가능한 저장소
- 배포 브랜치 확정 (`refactor/GB` → `main` 머지 권장)

---

## 4. 카페24 VPS 초기 설정

자동설치 패키지를 선택했다면 Node·Nginx·PM2는 이미 설치돼 있습니다. SSH 접속 후 버전만 확인하고, **Docker(Postgres용)와 certbot만 추가로 설치**합니다.

```bash
# 기본 패키지 확인
node -v      # 카페24 자동설치는 Node 24 — 아래 "Node 버전" 참고
pm2 -v
nginx -v

# Docker (Postgres 컨테이너용 — 네이티브 Postgres를 쓰기로 했다면 생략)
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER
# 재접속 후 docker ps 확인

# certbot (Nginx용 Let's Encrypt)
sudo apt update
sudo apt install -y certbot python3-certbot-nginx
```

### Node 버전 — 24 그대로 쓸지, 20으로 맞출지

이 프로젝트는 지금까지 Node 20에서 개발·테스트됐고, 카페24 자동설치는 Node 24를 깝니다. Next 16 / React 19.2가 Node 24에서 문제없이 빌드된다는 보장은 아직 없으므로, 아래 중 하나를 선택하세요.

- **Node 24 그대로 사용**: `npm run build:prod`가 정상적으로 도는지 먼저 한 번 테스트해보고 문제없으면 그대로 진행
- **nvm으로 Node 20 병행 설치** (더 보수적, 권장): 지금까지 검증된 버전과 맞춰 리스크를 줄임
  ```bash
  curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
  source ~/.bashrc
  nvm install 20
  nvm alias default 20
  ```

---

## 5. 코드 배포

```bash
sudo mkdir -p /var/www/goodbus
sudo chown $USER:$USER /var/www/goodbus
cd /var/www/goodbus

git clone https://github.com/HYEONSERIC/GoodBus.git .
# 배포 브랜치: git checkout refactor/GB  # 또는 main

# 의존성
npm ci
cd server && npm ci && cd ..

# 환경 변수 (아래 6절 참고)
cp .env.production.example .env.local
cp server/.env.example server/.env
nano .env.local
nano server/.env

# DB (Docker Postgres 경로 — 네이티브를 쓰기로 했다면 이 블록 대신 DATABASE_URL만 맞추고 다음 줄로)
cd server
docker compose up -d
npm run db:push
# 베타: npm run db:seed  (프로덕션에서는 시드 생략 또는 비밀번호 변경)

# 빌드
cd /var/www/goodbus
npm run build:prod
```

---

## 6. 환경 변수

### 루트 `.env.local` (Next.js)

```env
NODE_ENV=production
API_URL=http://127.0.0.1:4000
NEXT_PUBLIC_API_URL=https://your-domain.com
NEXT_PUBLIC_KAKAO_JS_KEY=your_kakao_js_key
NEXT_PUBLIC_TOSS_CLIENT_KEY=your_toss_client_key

# 선택: 에러 트래킹 (Sentry) — DSN 없으면 비활성 상태로 빌드/실행됨
NEXT_PUBLIC_SENTRY_DSN=
```

- `API_URL`: **서버 내부** Express 주소 (프록시용, 외부 노출 X)
- `NEXT_PUBLIC_API_URL`: 브라우저가 `/uploads` 이미지를 불러올 **공개 URL**
- `NEXT_PUBLIC_TOSS_CLIENT_KEY`: 토스페이먼츠 클라이언트 키(공개 키, `test_ck_`/`live_ck_`) — 가맹심사 통과 전까지는 테스트 키 유지
- `NEXT_PUBLIC_SENTRY_DSN`: Sentry 프로젝트 DSN. 비워두면 Sentry가 비활성화되며 빌드·실행에 영향 없음

### `server/.env` (Express)

```env
NODE_ENV=production
PORT=4000
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/goodbus
JWT_SECRET=긴랜덤문자열_32자이상_반드시변경
CORS_ORIGIN=https://your-domain.com
KAKAO_REST_API_KEY=your_rest_key
KAKAO_MOBILITY_API_KEY=your_mobility_key
STORAGE_PROVIDER=local
TOSS_SECRET_KEY=your_toss_secret_key
TOSS_WEBHOOK_SECRET=your_toss_webhook_secret

# 선택: 에러 트래킹 (Sentry) — DSN 없으면 비활성 상태로 실행됨
SENTRY_DSN=
```

`TOSS_SECRET_KEY`/`TOSS_WEBHOOK_SECRET`: https://developers.tosspayments.com/my/api-keys 에서 발급(무료 가입, 사업자등록 불필요) — 가맹심사 통과 전까지는 테스트(`test_`) 키 유지, 통과 후 값만 실 키로 교체(코드 변경 없음).

`JWT_SECRET` 생성 예:

```bash
openssl rand -base64 48
```

**주의**: 예시 파일의 `change-me-in-production` 같은 placeholder 값을 그대로 두고 배포하지 마세요 — 특히 `JWT_SECRET`.

---

## 7. Nginx + certbot 설정 (HTTPS)

`deploy/nginx/goodbus.conf`를 카페24 Nginx 설정에 연결합니다.

```bash
sudo ln -s /var/www/goodbus/deploy/nginx/goodbus.conf /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx

sudo certbot --nginx -d your-domain.com
```

`goodbus.conf`는 이미 `/`는 Next(:3000)로, `/uploads/*`는 Express(:4000)로 나눠 프록시하도록 작성돼 있습니다. 도메인만 실제 값으로 바꾸면 됩니다.

IP만 쓸 때는 도메인 대신 IP를 넣을 수 있지만, **HTTPS·쿠키·Kakao** 때문에 도메인 권장.

---

## 8. pm2로 프로세스 실행

```bash
cd /var/www/goodbus
pm2 start deploy/ecosystem.config.cjs
pm2 save
pm2 startup   # 출력되는 sudo 명령 실행
```

`deploy/ecosystem.config.cjs`는 호스팅사와 무관하게 그대로 재사용합니다.

### 8-1. 정기결제(멤버십 + 최저입찰금액 애드온) 크론 등록

`npm run db:purge-*`류와 동일하게 pm2 상시 프로세스가 아니라 독립 스크립트 + 시스템 crontab 방식입니다. 멤버십 구독과 최저입찰금액 애드온 구독을 한 스크립트에서 함께 처리합니다. 매일 1회 실행하면 충분합니다 (`nextBillingAt`이 지난 구독만 골라 처리하므로 몇 시간 늦어져도 안전).

```bash
crontab -e
# 매일 04:00 (KST) 실행 예시
0 4 * * * cd /var/www/goodbus/server && /usr/bin/npm run db:run-recurring-billing >> /var/log/goodbus-billing.log 2>&1
```

### 8-2. DB 자동 백업 (2026-08-15 도입)

2026-08-14 침해사고 때 백업이 하나도 없어서 데이터를 통째로 유실한 것이 재발하지 않도록 하는 항목. Postgres가 named volume(`server/docker-compose.yml`의 `postgres_data`, bind mount 아님)이라 `docker exec`로 접근하는 `server/scripts/backup-db.sh`를 사용한다.

```bash
# 최초 1회
sudo mkdir -p /var/backups/goodbus
sudo chown $USER:$USER /var/backups/goodbus

crontab -e
# 정기결제 크론(04:00)보다 앞서 겹치지 않게 03:00
0 3 * * * /var/www/goodbus/server/scripts/backup-db.sh >> /var/log/goodbus-backup.log 2>&1
```

기본값은 `BACKUP_DIR=/var/backups/goodbus`, `BACKUP_RETENTION_DAYS=14`(`server/.env.example` 참고, 오버라이드 가능). 서버 자체가 뚫리면 서버 안 백업도 같이 날아가므로, **서버 밖 보관**이 진짜 목적이다 — 로컬 mac에서 주기적으로 pull:

```bash
# 로컬 mac에서 (예: 매일 아침 cron 또는 launchd)
rsync -avz <user>@<서버IP>:/var/backups/goodbus/ ~/goodbus-backups/
```

**백업은 복구가 확인돼야 진짜 백업이다** — `server/scripts/restore-db-rehearsal.sh`가 별도 포트(5433)에 임시 컨테이너를 띄워 최신 백업을 복원하고 sanity query로 검증한 뒤 정리까지 한다. 프로덕션 DB를 전혀 건드리지 않으므로 월 1회 정기 실행 권장:

```bash
/var/www/goodbus/server/scripts/restore-db-rehearsal.sh
```

실제 재해 시 프로덕션 복구 절차는 "14. 침해사고 대응 런북" 참고.

---

## 9. 배포(업데이트) 절차

```bash
cd /var/www/goodbus
./deploy/scripts/deploy.sh
```

또는 수동:

```bash
git pull
npm ci && cd server && npm ci && cd ..
(cd server && npm run db:push)
npm run build:prod
pm2 restart all
```

`deploy.sh`는 2026-08-29부터 `db:push`를 빌드 전 단계에 자동으로 포함한다(마이그레이션
파일 없이 `schema.prisma` 기준으로 DB를 맞추는 방식이라 별도 마이그레이션 실행 단계가
없음). 데이터 손실이 있는 변경은 `--accept-data-loss` 플래그 없이는 여기서 그냥
실패하고 스크립트가 중단되므로(`set -e`), 위험한 스키마 변경(컬럼 삭제·타입 변경 등)은
자동으로 밀리지 않고 배포 자체가 멈춘다 — 그 경우에만 수동으로 내용을 확인하고
`--accept-data-loss`를 붙여 직접 실행할 것.

배포 시 **1~2분** 서비스 중단 가능 (허용 범위).

---

## 10. 배포 후 체크리스트

> **2026-08-16 실제 프로덕션 배포 완료** (`goodbus0716.mycafe24.com`) — 아래 항목 중 이 날짜로 표시된 것은 실제 라이브 서버에서 검증됨. 카페24 OS 재설치 이후 이 문서 순서대로 처음부터 다시 배포하면서, 문서에 없던 인프라 이슈 몇 개를 새로 발견·수정함(아래 "트러블슈팅" 표에 추가):
> - 카페24 자동설치 마법사가 만들어둔 starter 앱이 `appuser` 계정으로 포트 3000을 선점해 `goodbus-web`이 크래시루프
> - 네이티브 PostgreSQL 17이 5432를 이미 점유(문서에 이미 있던 경고대로 `systemctl stop/disable postgresql`로 해결)
> - `/uploads/*`가 카페24 자동생성 Nginx config에 프록시 안 돼 있어 404
> - `/var/www/cafe24-welcome/index.html`이 실제 앱보다 우선 서빙됨
> - Nginx `add_header` 상속 규칙 때문에 카페24가 이미 선언해둔 HSTS 헤더가 실제로는 응답에 안 붙고 있었음

- [x] 방화벽에서 **22(SSH), 80, 443만 개방** — 카페24 **플랫폼 레벨** 방화벽(콘솔 UI, iptables 아님)을 ON으로 전환하고 INBOUND 규칙 3개(TCP 22/80/443, 전체 허용) 추가로 완료(2026-08-16). 콘솔 UI 흐름이 직관적이지 않아 기록해둠: 상단 **"방화벽 정책(Rule) 추가"** 버튼이 신규 규칙을 만드는 유일한 경로 — 하위 테이블의 "허용 IP 추가"/"차단 IP 추가" 버튼은 *이미 존재하는* 규칙 행에 IP를 붙이는 용도라, 빈 상태에서 누르면 "IP를 추가하실 정책을 선택해 주세요" 에러만 반복됨. "방화벽 정책(Rule) 추가" → "INBOUND 정책: 익명접속(모든IP)" 선택 → 서비스이름/프로토콜/포트 입력이 정공법. 방화벽 OFF 상태에서 "정책 추가"를 누르면 먼저 ON으로 전환할지 묻는 확인창이 뜸 — **이 순간부터 허용 규칙이 하나도 없으면 즉시 전체 인바운드가 막히므로, ON 전환 직후 곧바로 22/80/443 규칙부터 추가할 것.**
- [x] `https://도메인/` 접속 — 200 (2026-08-16)
- [x] 로그인 / 로그아웃 — 회원가입(Driver) → 로그인 스모크 테스트로 확인(2026-08-16)
- [ ] 승객 견적 생성, Kakao 주소·거리 — Kakao REST API 키 반영 후 검색 API 자체는 확인(아래 참고), 실제 견적 생성 플로우는 미확인
- [ ] 기사 입찰, 승객 낙찰
- [x] 프로필·면허증 업로드 → 이미지 표시 — 업로드 라우트 자체는 8/15에 curl로 검증 완료, 이번 배포 후 브라우저 재확인은 미완
- [x] Kakao API 키 동작 확인 — `KAKAO_REST_API_KEY` 반영 후 `/api/kakao/places?query=서울역` 실제 검색 성공(2026-08-16)
- [x] Toss 카드 등록 동작 확인 — `NEXT_PUBLIC_TOSS_CLIENT_KEY` 반영 후 첫 시도에서 401(Unauthorized)로 실패, 원인은 로컬→서버로 값을 옮기며 클라이언트 키 끝자리를 **대문자 O를 숫자 0으로 오독**한 오타(`...RGZwXL0` vs 실제 `...RGZwXLO`) — Toss 개발자센터에서 원본 대조 후 정정, 재빌드 후 실제 카드 등록 위젯("실제 결제가 안되는 테스트입니다" 배지)까지 뜨는 것 확인
- [x] 관리자 로그인 — Admin 계정 생성 후 API 로그인 200 확인(2026-08-16). **관리자 콘솔 UI(매출 탭 등)는 브라우저로 아직 미확인**
- [x] `curl https://도메인/api/health` — `{"status":"ok"}` 200 확인(2026-08-16)
- [x] `SENTRY_DSN`/`NEXT_PUBLIC_SENTRY_DSN` 설정 + 실제 에러 발생시켜 Sentry 대시보드 리포트 확인 — 2026-08-16 완료. 이 과정에서 브라우저 에러가 8/10부터 계속 안 잡히고 있던 버그(`sentry.client.config.ts` → `instrumentation-client.ts`)를 발견·수정함(아래 "10-3" 참고)

### 10-1. 보안 침해사고 이후 강화 항목 (2026-08-14 RCE 사고 대응)

2026-08-14 Next.js 취약점을 통한 RCE로 서버가 침해돼 OS 재설치로 복구한 사고가 있었음(전체 경위는 `PROJECT_STATUS.md` 참고). 그때 드러난 운영 공백들:

- [x] **DB 자동 백업** — 2026-08-15 스크립트 작성, **2026-08-16 crontab 실제 등록 + 실행 검증 완료**(위 "8-2" 참고). `crontab -l`에 03:00 등록 확인, 수동 1회 실행으로 만든 덤프(`goodbus_2026-08-16_162355.sql.gz`)의 gzip 무결성과 `CREATE TABLE public."User"` 포함 여부까지 확인
- [x] **SSH 키 전용 인증** — 2026-08-16 완료. `PasswordAuthentication no` + `PermitRootLogin prohibit-password` 적용 후, 키 로그인 유지 + 비밀번호 인증이 프롬프트 없이 즉시 거부되는 것까지 라이브 검증(아래 "10-2" 참고)
- [ ] **다운 감지 알림 없음** — 서버가 몇 시간 죽어있어도 아무도 모름. 아래 "10-3" 참고 (UptimeRobot 가입 여전히 안 함)
- [x] **GitHub Dependabot/vulnerability alerts** — 2026-08-15, 꺼져 있는 것으로 확인(`gh api` 조회 결과), `gh api -X PUT repos/HYEONSERIC/GoodBus/vulnerability-alerts`와 `.../automated-security-fixes`로 활성화 완료. `.github/dependabot.yml` 추가(root+server 주간 스캔)
- [x] **카페24 플랫폼 방화벽 ON + fail2ban 확장 + OS 자동패치** — 2026-08-16, 아래 "10-4"/"10-5" 참고, 전부 라이브 검증 완료
- [x] **Toss Secret Key/Webhook Secret 재발급 완료** (2026-08-16) — [Toss 개발자센터](https://developers.tosspayments.com/my/api-keys)에서 재발급 받아 `server/.env` 갱신 → `pm2 restart goodbus-api`, 헬스체크·에러 로그로 정상 기동 확인. Client key(`NEXT_PUBLIC_TOSS_CLIENT_KEY`)는 공개 키라 재발급 대상 아님, 기존 값 유지
- [~] Kakao API 키는 프로덕션 서버에 반영되고 실제 동작(장소검색)까지 확인됨(2026-08-16, 위 체크리스트 참고) — **단, 침해사고 이후 실제로 재발급된 새 키인지는 이번 세션에서 확인 안 됨**(로컬 개발 `.env` 파일에 있던 값을 그대로 옮김). 재발급 여부가 불확실하면 안전하게 [Kakao Developers](https://developers.kakao.com)에서 재발급 후 교체 권장
- [x] **`server/` npm 패키지 감사 미처리 취약점** — 2026-08-15에 27건 중 26건 해소, **`nodemailer`도 2026-08-16에 `9.0.5`로 업그레이드해 마저 해소**(`^6.9.8`→`^9.0.5`, 타입체크·빌드·모듈 로드·기존 테스트 30개 전부 통과 확인). `npm audit` 결과 현재 `server`/루트 둘 다 0 vulnerabilities

### 10-2. SSH 하드닝 (2026-08-16 완료 + 라이브 검증)

카페24 자동설치가 `/etc/ssh/sshd_config.d/99-cafe24-harden.conf`를 이미 깔아둔다(`MaxAuthTries 3`, `LoginGraceTime 30`, 포워딩 차단 등) — 단, **비밀번호 인증 차단은 빠져있어서** 이 부분만 별도 drop-in으로 추가한다. `sshd_config`의 `Include /etc/ssh/sshd_config.d/*.conf`가 파일 앞부분에 있어 나중에 오는 메인 설정과 충돌 안 남.

1. `authorized_keys`에 재설치 이후 새로 만든 키(`goodbus-vps-2026-08`, `ssh-copy-id`로 등록 완료)만 있는지 먼저 확인 — 침해 기간 이전 키가 남아있지 않아야 함
2. `/etc/ssh/sshd_config.d/90-goodbus-keyonly.conf` 신설:
   ```ini
   PasswordAuthentication no
   PermitRootLogin prohibit-password
   PubkeyAuthentication yes
   ```
   **주의**: `PermitRootLogin no`가 아니라 **`prohibit-password`**를 써야 한다 — root로 키 접속하는 구조라 `no`를 쓰면 root 로그인 자체가(키 포함) 완전히 막혀 락아웃된다. `prohibit-password`는 "root는 키로만" 허용.
3. `sshd -t`로 문법 검증 → **먼저 검증하고** 나서 재시작(순서 중요)
4. `systemctl restart ssh` — Ubuntu 24.04는 유닛명이 `sshd`가 아니라 **`ssh`**(`sshd`로 하면 "Unit sshd.service not found")
5. 재시작 직후 곧바로 두 가지 확인: ① 기존 키로 새 연결이 되는지 ② `-o PreferredAuthentications=password -o PubkeyAuthentication=no -o BatchMode=yes`로 비밀번호 인증을 강제한 연결이 프롬프트도 없이 즉시 `Permission denied (publickey)`로 거부되는지
6. `fail2ban-client status sshd`로 fail2ban이 살아있는지 확인 — 이미 실제 브루트포스 시도를 자동 차단한 이력 있음(위 "10-4" 참고)
7. 카페24 콘솔의 웹 기반 서버 접속(VNC/시리얼 콘솔) 방법을 미리 확인해둔다 — 키를 잃어버려도 이걸로 복구 가능

여러 기기에서 접속해야 하면 각 기기의 공개키를 `authorized_keys`에 추가로 등록하면 된다.

### 10-3. 다운타임 모니터링 + 에러 트래킹 (2026-08-16 완료 + 라이브 검증)

Sentry는 애플리케이션이 살아서 에러를 던질 때만 잡는다 — 프로세스가 죽거나(크립토마이너가 CPU를 다 먹는 등) 크래시 루프에 빠지면 감지 못 한다. 별도 외부 핑 모니터링이 필요:

1. **UptimeRobot** 가입 완료. 모니터 대상은 `https://<도메인>/api/health`(Next → Express 프록시 경로라 두 계층을 동시에 검증 — Express만 죽어도, Next만 죽어도 이 경로가 실패함), 5분 간격, 이메일 알림 등록 확인. SMS/전화는 유료 크레딧 기반이라 스킵(무료 25건 제공되지만 굳이 안 씀)
2. **Sentry 프로젝트 2개** 생성 완료 — 백엔드(`node-express`, Express 플랫폼), 프론트(`javascript-nextjs`, Next.js 플랫폼). 각 DSN을 `server/.env`의 `SENTRY_DSN`, `.env.local`의 `NEXT_PUBLIC_SENTRY_DSN`에 반영

**⚠️ 발견한 버그 — `sentry.client.config.ts`가 8/10 도입 이후 계속 무시되고 있었음**: `@sentry/nextjs`(현재 10.x) + Next.js 16 조합은 브라우저 쪽 초기화를 Next.js의 공식 client instrumentation 훅 파일(**`instrumentation-client.ts`**, 프로젝트 루트)로 찾는데, 이 레포는 예전 컨벤션 파일명(`sentry.client.config.ts`)만 있어서 빌드 시 조용히 무시되고 있었다 — 빌드 로그에 에러도 경고도 전혀 없어서 `.next/static/chunks/*.js`를 직접 grep해서 "sentry" 문자열이 0개라는 걸로 확인했다. 즉 **서버(Express)/Next 서버사이드 에러는 계속 정상 수집되고 있었지만, 실제 사용자 브라우저에서 나는 JS 에러는 한 번도 Sentry에 안 잡히고 있었다.** `git mv sentry.client.config.ts instrumentation-client.ts`로 해결 — 파일 내용(단순 `Sentry.init({...})` 호출)은 그대로 재사용 가능, 재빌드하면 클라이언트 청크에 SDK가 포함되는 것으로 확인.

**라이브 검증 순서**: ① `dist/loadEnv.js`를 먼저 `require`하지 않고 `dist/instrument.js`만 단독 실행하면 `SENTRY_DSN`이 로드 안 된 상태라 `Sentry.flush()`가 "성공"을 리턴해도 실제로는 아무것도 안 보낸 거짓 양성이 나온다(env 로딩 순서 확인 필수) ② 백엔드는 `loadEnv.js` → `instrument.js` 순서로 로드 후 `captureException`+`flush`로 Sentry Issues에 실제로 뜨는 것 확인 ③ 프론트는 브라우저에서 직접 `setTimeout(() => { throw new Error(...) }, 100)`으로 미처리 예외를 발생시켜 네트워크 탭에서 `ingest.us.sentry.io/.../envelope/` POST가 200으로 나가는 것까지 확인 — 두 프로젝트 Issues 탭에 실제로 이슈가 뜨는 것으로 최종 확정

### 10-4. 봇/브루트포스 방어 확장 (2026-08-16, 실제 배포 시 적용 + 라이브 검증 완료)

카페24 자동설치가 fail2ban과 `nginx-http-auth`/`nginx-limit-req`/`nginx-botsearch` 필터를 이미 깔아준다 — 우리가 한 건 jail을 켜고, 아래 버그를 고치고, 앱 전용 jail 하나를 추가한 것뿐이다.

**⚠️ 발견한 버그 — `backend=auto`가 로그 파일이 아니라 journald를 감시함**: `/etc/fail2ban/jail.conf`의 기본 `backend = auto`가 이 서버에서는 조용히 `systemd`(journald)로 해석돼, `logpath`를 지정해도 무시하고 저널만 본다. Nginx 로그도, pm2 로그(journald에 안 실림)도 이 상태로는 fail2ban이 절대 못 본다 — `fail2ban-client status <jail>`의 `Journal matches` 줄이 `File list` 대신 떠 있으면 이 상태다. **해결: 아래 4개 jail 전부 `backend = polling`을 명시.** 이걸 놓치면 jail이 "실행 중"으로는 보이지만 실제로는 아무것도 차단하지 않는 죽은 설정이 된다.

`/etc/fail2ban/jail.d/goodbus.local`:
```ini
[sshd]
enabled = true

[nginx-http-auth]
enabled = true
backend = polling
port = http,https
logpath = /var/log/nginx/error.log

[nginx-limit-req]
enabled = true
backend = polling
port = http,https
logpath = /var/log/nginx/error.log
findtime = 10m
maxretry = 10
bantime = 1h

[nginx-botsearch]
enabled = true
backend = polling
port = http,https
logpath = /var/log/nginx/error.log

[goodbus-login]
enabled = true
backend = polling
filter = goodbus-login
logpath = /root/.pm2/logs/goodbus-api-error-0.log
port = http,https
findtime = 10m
maxretry = 8
bantime = 1h
```

**커스텀 jail — 로그인 실패**: `server/src/routes/auth.ts`가 `/auth/login` 실패 시 `[SECURITY] failed login ip=<IP> email=<email>`를 `console.warn`으로 남기는데, 이건 stderr로 가므로 **로그 경로는 `-out-`이 아니라 `-error-0.log`**(pm2가 stdout/stderr를 분리 파일로 관리). 필터:
```ini
# /etc/fail2ban/filter.d/goodbus-login.conf
[Definition]
failregex = ^.*\[SECURITY\] failed login ip=<HOST> .*$
ignoreregex =
```

```bash
sudo fail2ban-client -t   # 문법 검증
sudo systemctl restart fail2ban
sudo fail2ban-client status goodbus-login   # "File list"에 로그 경로가 떠야 정상 (Journal matches면 위 버그 재발)
```

**라이브 검증(2026-08-16)**: 실패 로그인 8회를 실제 공인 IP로 반복 요청해 `goodbus-login`이 진짜로 밴하는 것 확인 후 즉시 `fail2ban-client set goodbus-login unbanip <IP>`로 해제. `sshd` jail은 배포 당일에만 이미 실제 브루트포스 시도 4건을 자체적으로 차단함. **주의**: fail2ban의 기본 `ignoreself` 설정 때문에 서버 자신에서(예: `curl 127.0.0.1`) 테스트하면 밴이 안 걸린다 — 반드시 외부 IP로 테스트할 것.

### 10-5. OS 보안패치 자동화 (2026-08-16, 실제 배포 시 확인 + 라이브 검증 완료)

카페24 자동설치가 `unattended-upgrades`를 이미 설치하고 보안 오리진(`-security`, ESM)까지 구성해둔 상태였다 — 별도 설치 불필요, 아래만 확인/보강하면 된다.

```bash
# 이미 설치돼 있는지 확인
dpkg -l | grep unattended-upgrades
cat /etc/apt/apt.conf.d/20auto-upgrades   # Update-Package-Lists/Unattended-Upgrade 둘 다 "1"이어야 함
```

`/etc/apt/apt.conf.d/50unattended-upgrades`에서 `Unattended-Upgrade::Automatic-Reboot "false";`를 **주석 해제해서 명시적으로 켜기**(기존엔 주석 처리라 암묵적 기본값에 의존하고 있었음) — 커널 업데이트로 재부팅이 필요해지면 자동 재부팅 대신 "10-3 다운타임 모니터링"(UptimeRobot)이 감지하게 하고, 재부팅은 직접 확인 후 진행한다(자동 재부팅 중 pm2/Docker가 안 살아나는 걸 아무도 모르는 상태로 방치하는 게 더 위험).

**라이브 검증(2026-08-16)**: `unattended-upgrade --dry-run --debug`로 실행해 `-security`/ESM 오리진만 후보로 잡고 일반 `-updates` 오리진은 의도대로 건너뛰는 것 확인, `apt-daily.timer`/`apt-daily-upgrade.timer` 둘 다 enabled 확인.

### 10-6. 커스텀 도메인 연결 (busrent.co.kr, 2026-08-18 완료 + 라이브 검증)

카페24 콘솔에서 도메인을 구매해 "대표 도메인"으로 지정하는 것은 **DNS를 VPS IP로 연결하는 것뿐**이고, 서버의 Nginx/인증서에는 자동 반영되지 않는다. DNS가 이미 VPS를 가리키고 있는데도(`dig busrent.co.kr` → VPS IP) `http://busrent.co.kr`가 Nginx 기본 404를 뱉는다면 이 절차가 누락된 것 — Nginx `server_name`에 새 도메인이 없으면 포트 80 블록의 `return 404;`(certbot이 생성한 catch-all)에 걸린다.

**주의**: 이 서버는 `deploy/nginx/goodbus.conf`(이 레포의 템플릿)를 직접 심볼릭 링크한 게 아니라, 카페24 자동설치가 만들어둔 자체 템플릿(`/etc/nginx/sites-available/GoodBus`, `location = /` welcome fallback·`/etc/nginx/cafe24-proxy.conf` include 등 구조가 다름)을 실사용 중이다. 아래 절차는 **실제 운영 파일 기준**이며, 레포의 `deploy/nginx/goodbus.conf`는 최초 셋업 참고용 초안일 뿐 실서버와 100% 동일하지 않다는 점을 감안한다.

```bash
# 1) 인증서를 기존 도메인 + 신규 도메인까지 포함하도록 확장 발급
#    (기존 계정 재사용, --expand로 goodbus0716.mycafe24.com 인증서에 SAN 추가)
certbot --nginx -d goodbus0716.mycafe24.com -d busrent.co.kr -d www.busrent.co.kr \
  --expand --non-interactive --agree-tos

# 인증서 발급/설치는 성공하지만, busrent.co.kr에 매칭되는 server 블록이 없어서
# "Could not automatically find a matching server block for busrent.co.kr" 경고가 뜬다 —
# 인증서 자체(SAN)는 이미 3개 도메인 다 포함된 상태이므로, 아래 2)만 하면 된다.

# 2) /etc/nginx/sites-available/GoodBus 수동 수정 (편집 전 반드시 백업)
cp /etc/nginx/sites-available/GoodBus /etc/nginx/sites-available/GoodBus.bak-$(date +%Y%m%d%H%M%S)
```

수정 내용 (443 블록과 80 블록 둘 다):

- `server_name goodbus0716.mycafe24.com;` → `server_name goodbus0716.mycafe24.com busrent.co.kr www.busrent.co.kr;`
- 80번 포트 블록의 `if ($host = goodbus0716.mycafe24.com) { return 301 https://$host$request_uri; }` 바로 아래에, 같은 패턴으로 `busrent.co.kr`/`www.busrent.co.kr`용 `if` 블록을 하나씩 추가(certbot이 도메인을 추가로 인식했을 때 자동 생성하는 것과 동일한 패턴)

```bash
nginx -t && systemctl reload nginx
```

**라이브 검증(2026-08-18)**: `curl -I http://busrent.co.kr/`(301→https), `curl -I https://busrent.co.kr/`·`https://www.busrent.co.kr/`(200), `openssl s_client`로 인증서 SAN에 3개 도메인 전부 포함 확인, 기존 `goodbus0716.mycafe24.com`도 그대로 정상 동작 확인.

**부수 작업 — `NEXT_PUBLIC_SITE_URL` 반영**: `lib/siteConfig.ts`의 `SITE_URL`(sitemap/robots/OG태그/JSON-LD의 기준 URL)이 이 값 없으면 `goodbus0716.mycafe24.com`로 폴백한다. 커스텀 도메인 연결 후 `.env.local`에 `NEXT_PUBLIC_SITE_URL=https://busrent.co.kr` 추가 → **`NEXT_PUBLIC_*`는 빌드 타임에 굽는 값이라 `.env.local`만 고치면 반영 안 됨, 반드시 재빌드 필요**:

```bash
cd /var/www/goodbus
npm run build:prod
pm2 restart all
```

재빌드 후 `curl https://busrent.co.kr/sitemap.xml`·`/robots.txt`와 홈페이지 `og:url`/JSON-LD `url` 필드가 전부 `busrent.co.kr` 기준으로 나오는 것 확인(2026-08-18).

**아직 안 한 것**: 카카오맵 API는 허용 도메인에 `busrent.co.kr` 등록 완료(사용자 확인, 2026-08-18). 토스페이먼츠 쪽 허용 도메인(있다면)은 미확인 — 실 키 전환 시점에 함께 확인 필요. Cloudflare 전체 프록시(Phase 3)는 여전히 미착수 — 이번 도메인 구매로 전제조건은 충족됐으므로 다음 후보 작업.

**추가 후속 조치 — 옛 도메인 하드코딩 정리 + 모니터링 (2026-08-18 완료 + 라이브 검증)**: 도메인 연결 자체는 끝났지만, 코드/외부 서비스에 옛 도메인이 하드코딩된 곳이 몇 군데 더 있었다. 전체 리포 `grep`으로 훑고, 실제 UptimeRobot/Sentry 대시보드까지 직접 열어 확인함:

- `NEXT_PUBLIC_API_URL`(`.env.local`) — 업로드 이미지(`hooks/use*Dashboard.tsx`, `components/ChatPanel.tsx` 등) 절대경로 생성에 쓰임. 옛 도메인이 계속 살아있어 당장 깨지진 않지만 새 도메인으로 갱신. `NEXT_PUBLIC_*`라 마찬가지로 재빌드 필요.
- `CORS_ORIGIN`(`server/.env`) — Express `cors()` 설정. 브라우저는 `app/api/[...path]/route.ts`가 서버사이드로 Express를 프록시하는 same-origin 구조라 옛 값이어도 실제로 브라우저에 영향은 없었지만(프록시 라우트가 `access-control-allow-*` 헤더를 반환 전에 삭제), 값 자체가 맞지 않는 상태를 방치할 이유가 없어 함께 갱신.

```bash
# .env.local / server/.env 값 교체 후
cd /var/www/goodbus
npm run build:prod
pm2 restart all
```

재빌드 후 `.next/static/chunks/*.js`를 `grep`해서 옛 도메인 문자열이 0건, 새 도메인 문자열만 남은 것 확인. `/api/auth/login`·`/api/health` 응답 정상 확인.

- **UptimeRobot**: 기존 모니터가 `goodbus0716.mycafe24.com` 하나뿐이었음(실제 대시보드에서 직접 확인) — 두 도메인이 같은 서버를 가리켜도 이번 사고처럼 도메인 단위로 따로 깨질 수 있으므로, `busrent.co.kr/api/health` 모니터를 동일 패턴(5분 간격, 이메일 알림)으로 신규 추가.
- **Sentry**: `javascript-nextjs`/`node-express` 두 프로젝트의 Inbound Filters·Client Keys를 직접 열어 확인 — 도메인/오리진 화이트리스트가 전혀 없어 DSN은 도메인과 무관하게 동작함. **조치 불필요**로 결론.
- **확인은 했지만 코드 조치 없음**: JWT 쿠키는 `domain` 속성이 없는 host-only 쿠키라 도메인별로 자연스럽게 분리됨(기존 세션 재사용 불가는 정상, 재로그인 필요). Toss 결제창 `successUrl`/`failUrl`은 `window.location.origin` 기반이라 하드코딩 없음.
- **여전히 코드 밖에서 확인 필요**: Toss Payments 대시보드의 웹훅 URL/허용 도메인 설정 — 로그인 필요해 이번엔 미확인, 가맹심사 통과·실 키 전환 시점에 같이 볼 것.

### 10-7. 옛 도메인(goodbus0716.mycafe24.com) 브라우저 트래픽을 새 도메인으로 리다이렉트 (2026-08-18 완료 + 라이브 검증)

커스텀 도메인이 생긴 뒤에도 카페24 기본 서브도메인(`goodbus0716.mycafe24.com`)이 완전히 동일한 사이트를 계속 서빙하면 사용자 입장에서 "사이트가 2개"로 보이고, `<link rel="canonical">`이 없는 상태라 검색엔진 중복 콘텐츠로 잡힐 여지도 있었다(`og:url`만 새 도메인을 가리키는 건 약한 신호). Vercel(`*.vercel.app`)·Heroku(`*.herokuapp.com`) 등이 흔히 쓰는 패턴대로, 기본 서브도메인은 살려두되 **사람이 보는 페이지만 커스텀 도메인으로 301 리다이렉트**하기로 함.

**주의해서 뺀 것 — `/api/*`는 리다이렉트 대상에서 제외**: 웹훅(예: Toss)은 POST인데, 클라이언트에 따라 301 응답을 받으면 POST 바디를 안 실어 나르거나 재시도를 안 하는 경우가 있어 조용히 유실될 수 있다. `/api/*`(헬스체크·백엔드 프록시 전부 포함)는 옛 도메인에서도 그대로 직접 응답하도록 남겨뒀다 — 실제로 기존 UptimeRobot 모니터가 처음부터 `/api/health`를 보고 있었다는 것도 이번에 확인(root `/`가 아니었음), 그래서 이 모니터도 영향 없음.

`/etc/nginx/sites-available/GoodBus`의 443 서버 블록, `# --- Method whitelist ---` 바로 아래에 추가(플래그 변수 방식 — `if`를 하나로 합치는 대신 두 단계로 나눠 host 매치→api 경로면 취소 순으로 처리):

```nginx
set $redirect_to_new 0;
if ($host = goodbus0716.mycafe24.com) {
    set $redirect_to_new 1;
}
if ($uri ~ ^/api/) {
    set $redirect_to_new 0;
}
if ($redirect_to_new) {
    return 301 https://busrent.co.kr$request_uri;
}
```

```bash
cp /etc/nginx/sites-available/GoodBus /etc/nginx/sites-available/GoodBus.bak-$(date +%Y%m%d%H%M%S)
# (수정)
nginx -t && systemctl reload nginx
```

**라이브 검증(2026-08-18)**:
- `curl https://goodbus0716.mycafe24.com/`, `/company` → 301, `Location: https://busrent.co.kr/...` (경로 보존)
- `curl https://goodbus0716.mycafe24.com/api/health` → 200 직접 응답(리다이렉트 없음), `busrent.co.kr`/`www.busrent.co.kr`도 그대로 정상
- **인증서 자동 갱신 재검증**: 리다이렉트 로직 추가 전/후 두 번 다 `certbot renew --dry-run --cert-name goodbus0716.mycafe24.com` → `Congratulations, all simulated renewals succeeded`. (걱정했던 지점: `if`는 location 매칭보다 먼저 처리되는 rewrite phase라 ACME 챌린지 요청도 가로챌 수 있는데, 이 서버는 3개 도메인이 **하나의 공유 서버 블록**에 있어서 certbot이 갱신 시 넣는 `location = /.well-known/acme-challenge/...` 응답 블록이 어느 호스트로 리졸브되든 같은 블록 안에 이미 존재함 — 그래서 리다이렉트를 한 번 더 타도 문제없이 검증됨. 도메인마다 서버 블록이 분리된 구성이라면 이 가정이 깨지니 그대로 복붙하지 말 것.)
- UptimeRobot의 기존 `goodbus0716.mycafe24.com` 모니터(`/api/health` 대상) — 리다이렉트 적용 전후 응답시간 그래프 끊김 없이 정상, 0 incidents

---

## 11. 나중에 확장 (비용 ↑)

| 단계 | 작업 |
|------|------|
| 파일 | S3 + `STORAGE_PROVIDER=s3` 구현 |
| DB | 관리형 PostgreSQL로 이전 (또는 카페24 네이티브 Postgres로 전환) |
| 모니터링 | ~~Sentry~~ 도입 완료(위 6번 환경변수 참고) — UptimeRobot 등 가동률 모니터링은 절차만 준비됨(위 "10-3"), 실제 가입은 아직 |
| CI/CD | CI(`lint`+`build`+`test`, `.github/workflows/ci.yml`)와 의존성 감사(`.github/workflows/dependency-audit.yml`, non-blocking)는 이미 있음 — 남은 건 CD(GitHub Actions → SSH deploy 자동화) |
| 결제 | 사업자 등록 후 PG 연동 |
| 무중단 | 인스턴스 2대 + 로드밸런서 |

---

## 12. 트러블슈팅

| 증상 | 확인 |
|------|------|
| 로그인 안 됨 | `JWT_SECRET`, HTTPS, `CORS_ORIGIN` |
| 이미지 깨짐 | `NEXT_PUBLIC_API_URL`, Nginx `/uploads` 프록시 |
| API 500 | `pm2 logs goodbus-api`, Postgres `docker ps` |
| Kakao 실패 | 도메인 등록, API 키 |
| `Missing backend URL` | 루트 `.env.local` 의 `API_URL` |
| DB 접속 안 됨 | Docker Postgres와 카페24 네이티브 Postgres가 동시에 5432를 쓰려는 충돌인지 확인 |
| 빌드는 되는데 배포 후 동작 이상 | 로컬 개발은 Node 20인데 서버가 Node 24로 실행 중인 건 아닌지 (`node -v`) |
| 카페24 도메인 접속 시 "Server is running" 환영 페이지만 뜸 | `/var/www/cafe24-welcome/index.html`이 존재하면 Nginx `location = /`가 실제 앱보다 그 파일을 우선 서빙함 — `mv`로 치우고 `nginx -s reload` |
| `/uploads/*` 이미지 404 | 카페24가 도메인별로 자동 생성하는 `/etc/nginx/sites-available/<서비스명>`은 OS 재설치/재프로비저닝될 때마다 기본값으로 초기화됨 — `/uploads/` → `127.0.0.1:4000` proxy_pass 블록이 살아있는지 매번 확인 (`deploy/nginx/goodbus.conf`의 내용을 참고해 다시 추가) |
| CI의 `Backend (Express)` job만 `npm ci`에서 `Missing: ... from lock file`로 실패 | `server/package-lock.json`이 macOS에서 생성돼 Linux 전용 `optionalDependencies`가 빠진 상태 — `CLAUDE.md`의 "Regenerating package-lock.json on macOS" 항목대로 Docker(`--platform linux/amd64`)에서 재생성 |
| SSH `Connection refused`가 갑자기 뜸 | 서버가 죽은 게 아니라 fail2ban이 실패한 로그인 시도를 감지해 접속 IP를 일시 차단했을 가능성 — 몇 분 기다리거나 Cafe24 웹 콘솔로 우회 접속해 `fail2ban-client status sshd`/`unban` 확인 |
| 정상 사용자인데 간헐적으로 429 응답 | `deploy/nginx/goodbus.conf`의 `limit_req`(2026-08-15 추가, `/api/auth/` 2r/s, 나머지 10r/s)에 걸렸을 가능성 — burst 값(각각 5/20) 조정 검토 |
| fail2ban jail이 "started"인데 실제로 아무도 밴이 안 됨 | `fail2ban-client status <jail>`에서 `File list` 대신 `Journal matches`가 떠 있으면 `backend=auto`가 조용히 journald를 보고 있는 것 — logpath가 있어도 무시됨. `backend = polling` 명시 필요(위 "10-4" 참고) |
| Toss 결제창에서 "알 수 없는 에러가 발생했습니다" | 네트워크 탭에서 `apigw-sandbox.tosspayments.com/.../billing/route` 요청의 상태코드 확인 — 401이면 `NEXT_PUBLIC_TOSS_CLIENT_KEY` 자체가 틀린 것(Toss 개발자센터 원본과 문자 단위로 대조, 특히 대문자 O/숫자 0 오독 주의). `.env.local` 값을 바꿨다면 Next.js가 빌드 타임에 굽는 값이라 `npm run build` 재실행 없이는 반영 안 됨 |

로그:

```bash
pm2 logs
docker logs goodbus-postgres
```

---

## 13. 보안 패치 대응 정책 (2026-08-15, 재발 방지)

2026-08-14 침해사고의 직접 원인은 도구 부재가 아니라 **판단**이었다: `npm audit`이 잡은 Next.js 취약점을 패치했더니 `next/font/google`이 빌드 중 폰트 서브셋을 못 받아와 빌드가 깨졌고, "정상 빌드 유지"를 택해 취약한 버전을 그대로 프로덕션에 둔 채 몇 시간 뒤 실제로 RCE를 당했다.

**앞으로의 원칙 — critical/high severity CVE 패치가 빌드를 깨뜨리면, 롤백이 아니라 그날 안에 다음 중 하나를 실행한다:**

1. **빌드를 고쳐서 패치를 유지한다** (권장, 대부분 가능) — 예: 이번 Next.js 건은 `next/font/local`로 self-host해서 외부 fetch 자체를 없애 해결
2. 그게 당장 안 되면, **취약점이 있는 기능/라우트를 임시로 내리거나 Nginx에서 막아** 노출 표면을 줄인다
3. 그래도 안 되면 **서버를 일시적으로 내린다**

"정상 동작 유지"보다 "알려진 RCE 벡터를 열어둔 채 운영"이 항상 더 나쁜 선택이다. `CLAUDE.md`의 "Security & dependency hygiene"에도 같은 원칙이 있음 — 함께 참고.

---

## 14. 침해사고 대응 런북

실제 사고 대응 시 판단할 시간을 줄이기 위해, 2026-08-14 사고에서 실제로 밟았던 순서를 표준화해둔다.

1. **탐지**: UptimeRobot 다운 알림(10-3) / Sentry 이상 이벤트 폭증 / `docker ps`에서 Postgres 크래시 루프 확인 / 서버 CPU 비정상(크립토마이너 징후 — `top`/`htop`으로 낯선 프로세스 확인)
2. **격리** (조사보다 먼저): 의심되면 즉시 `sudo systemctl stop nginx` 또는 방화벽에서 80/443 차단 — 외부 접근을 끊어 더 이상의 피해·전파를 막는다
3. **자격증명 로테이션** (이번과 동일한 순서로 표준화): `JWT_SECRET` → DB 비밀번호 → root/SSH 비밀번호(또는 키 폐기 후 재발급) → Kakao/Toss API 키
4. **백업 확보**: 가능하면 격리 직후, 재설치 전에 `server/scripts/backup-db.sh`를 한 번 더 수동 실행해 최신 상태를 서버 밖으로 빼둔다(위 "8-2" 도입으로 이 단계의 리스크가 크게 줄었음 — 이번 계획의 핵심 목적)
5. **재설치/재구축**: OS 재설치 또는 컨테이너 전체 재생성, `deploy/scripts/bootstrap.sh` + 이 문서 4~9절 순서로 재배포
6. **복구**: `server/scripts/restore-db-rehearsal.sh`와 동일한 절차로 최신 백업을 실제 프로덕션 DB에 restore
7. **사후 검증**: "10. 배포 후 체크리스트" 전체 재실행 + Sentry로 에러 유입 확인 + UptimeRobot 정상 확인
8. **포스트모템**: 원인·타임라인·재발 방지 항목을 `PROJECT_STATUS.md`에 기록 (이번 사고를 기록한 것과 동일한 형식 유지)
