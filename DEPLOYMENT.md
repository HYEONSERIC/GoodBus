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
npm run build:prod
pm2 restart all
```

배포 시 **1~2분** 서비스 중단 가능 (허용 범위).

---

## 10. 배포 후 체크리스트

- [x] 방화벽에서 **22(SSH), 80, 443만 개방** — 5432(Postgres)는 반드시 외부 차단 (2026-08-15, `nc -z goodbus0716.mycafe24.com {22,80,443,5432}`로 외부에서 직접 확인: 22/80/443만 열려있고 5432는 닫혀있음 확인 완료)
- [ ] `https://도메인/` 접속
- [ ] 로그인 / 로그아웃
- [ ] 승객 견적 생성, Kakao 주소·거리
- [ ] 기사 입찰, 승객 낙찰
- [ ] 프로필·면허증 업로드 → 이미지 표시
- [ ] 관리자 로그인·매출 탭
- [ ] `curl https://도메인/api/health` 또는 Express `/health` (내부)
- [ ] `SENTRY_DSN`/`NEXT_PUBLIC_SENTRY_DSN` 설정했다면, 의도적으로 에러를 한 번 발생시켜 Sentry 대시보드에 리포트가 뜨는지 확인

### 10-1. 보안 침해사고 이후 강화 항목 (2026-08-14 RCE 사고 대응)

2026-08-14 Next.js 취약점을 통한 RCE로 서버가 침해돼 OS 재설치로 복구한 사고가 있었음(전체 경위는 `PROJECT_STATUS.md` 참고). 그때 드러난 운영 공백들:

- [x] **DB 자동 백업** — 2026-08-15, `server/scripts/backup-db.sh` + crontab으로 해결(위 "8-2" 참고). **crontab 실제 등록은 여전히 사용자가 VPS에서 해야 함**
- [ ] **SSH 비밀번호 인증만 있음** — `authorized_keys`가 비어있어 브루트포스에 노출. 아래 "10-2" 절차대로 전환 필요 (락아웃 위험이 있는 작업이라 VPS에서 직접, 순서 지켜서)
- [ ] **다운 감지 알림 없음** — 서버가 몇 시간 죽어있어도 아무도 모름. 아래 "10-3" 참고
- [x] **GitHub Dependabot/vulnerability alerts** — 2026-08-15, 꺼져 있는 것으로 확인(`gh api` 조회 결과), `gh api -X PUT repos/HYEONSERIC/GoodBus/vulnerability-alerts`와 `.../automated-security-fixes`로 활성화 완료. `.github/dependabot.yml` 추가(root+server 주간 스캔)
- [ ] 침해 기간 `.env`가 노출됐을 수 있으므로 **Kakao/Toss API 키는 여전히 재발급 안 됨** — JWT_SECRET/DB 비밀번호/root SSH 비밀번호는 사고 당일 로테이션 완료했지만 이 항목만 남음:
  - Kakao REST API Key / Mobility API Key / JS Key — [Kakao Developers](https://developers.kakao.com) 콘솔에서 재발급
  - Toss Secret Key / Webhook Secret — [Toss Payments 개발자센터](https://developers.tosspayments.com/my/api-keys)에서 재발급 (client key는 공개 키라 후순위)
  - 재발급 후 VPS `server/.env`/`.env.local` 갱신 → `pm2 restart all`
- [x] **`server/` npm 패키지 감사 미처리 취약점** — 2026-08-15, 재점검 결과 실제로는 27건 중 26건이 `npm audit fix`(non-breaking)로 해소됨(`tar`는 `package.json` `overrides`로 별도 고정). **`nodemailer` 1건만 남음** — breaking major(`9.0.5`) 필요해 별도 검증 후 처리 예정, 매주 월요일 `.github/workflows/dependency-audit.yml`로 추적

### 10-2. SSH 하드닝 (사용자가 VPS에서 직접 — 락아웃 위험, 순서 준수)

1. 로컬 mac: `ssh-keygen -t ed25519 -C "goodbus-vps-2026-08"` (기존 키 재사용 금지 — 침해 기간 노출 가능성 배제)
2. `ssh-copy-id -i ~/.ssh/goodbus_vps.pub <user>@<서버IP>` — 비밀번호 인증이 아직 살아있을 때만 가능
3. **새 터미널 창**을 열어 `ssh -i ~/.ssh/goodbus_vps <user>@<서버IP>`로 키 로그인이 실제로 되는지 확인. 기존 비밀번호 세션은 그대로 열어둔 채로 둔다(안전장치)
4. `/etc/ssh/sshd_config`: `PasswordAuthentication no`, `PermitRootLogin no`(또는 `prohibit-password`), `PubkeyAuthentication yes`
5. `sudo systemctl restart sshd`
6. 다시 새 터미널에서 키 로그인 확인 + 비밀번호 로그인이 실제로 거부되는지 확인
7. `fail2ban-client status sshd`로 fail2ban이 살아있는지 확인 (트러블슈팅 절 참고 — 이미 동작 중일 가능성 높음)
8. 카페24 콘솔의 웹 기반 서버 접속(VNC/시리얼 콘솔) 방법을 미리 확인해둔다 — 키를 잃어버려도 이걸로 복구 가능

여러 기기에서 접속해야 하면 각 기기의 공개키를 `authorized_keys`에 추가로 등록하면 된다.

### 10-3. 다운타임 모니터링 (사용자가 제3자 서비스 가입 필요)

Sentry는 애플리케이션이 살아서 에러를 던질 때만 잡는다 — 프로세스가 죽거나(크립토마이너가 CPU를 다 먹는 등) 크래시 루프에 빠지면 감지 못 한다. 별도 외부 핑 모니터링이 필요:

1. [UptimeRobot](https://uptimerobot.com) (또는 동급 무료 서비스) 가입
2. 모니터 대상: `https://<도메인>/api/health` — Next → Express 프록시 경로라 두 계층을 동시에 검증(Express만 죽어도, Next만 죽어도 이 경로가 실패함)
3. 타입: HTTP(s) Keyword 모니터, 응답 바디에 `"status":"ok"` 포함 여부까지 체크(단순 200 응답이 아니라 실제 정상 JSON인지까지 확인 — 타임아웃과 502를 둘 다 잡음), 5분 간격
4. 알림 채널: 이메일 + (선택) Slack/텔레그램 — 최소 2개 채널 권장(이메일 서버 자체 장애 시 단일 채널이면 무용지물)
5. 프로덕션 `server/.env`/`.env.local`의 `SENTRY_DSN`이 실제로 채워져 있는지도 함께 확인 — OS 재설치 이후 처음부터 다시 만들어진 파일이라 "선택 항목"으로 표시된 값이 누락됐을 가능성이 있음. 없으면 각 Sentry 프로젝트에서 재발급해 채우고 `pm2 restart all`

### 10-4. 봇/브루트포스 방어 확장 (2026-08-15, 재설치 후 배포 시 VPS에서 진행)

카페24 자동설치가 fail2ban을 이미 깔아준다 — SSH 외에 애플리케이션 레벨까지 감시 범위를 넓힌다.

1. **Nginx 로그 기반 기본 제공 필터 활성화**: `/etc/fail2ban/jail.local`에 아래 추가
   ```ini
   [nginx-http-auth]
   enabled = true
   [nginx-limit-req]
   enabled = true
   filter = nginx-limit-req
   logpath = /var/log/nginx/error.log
   [nginx-botsearch]
   enabled = true
   ```
2. **커스텀 jail — 로그인 실패**: `server/src/routes/auth.ts`가 `/auth/login` 실패 시 `[SECURITY] failed login ip=<IP> email=<email>` 형식으로 pm2 로그(`~/.pm2/logs/goodbus-api-out.log`)에 남긴다. 필터 신설:
   ```ini
   # /etc/fail2ban/filter.d/goodbus-login.conf
   [Definition]
   failregex = ^\[SECURITY\] failed login ip=<HOST> email=.*$
   ```
   ```ini
   # /etc/fail2ban/jail.local에 추가
   [goodbus-login]
   enabled = true
   filter = goodbus-login
   logpath = /root/.pm2/logs/goodbus-api-out.log
   maxretry = 10
   findtime = 600
   bantime = 3600
   ```
3. `sudo systemctl restart fail2ban` 후 `sudo fail2ban-client status goodbus-login`으로 jail이 로드됐는지 확인

### 10-5. OS 보안패치 자동화 (2026-08-15, 재설치 후 배포 시 VPS에서 진행)

2026-08-14 사고의 근본 원인이 "패치를 미룬 것"이었던 만큼(위 13절 정책 참고), OS 레벨 보안패치는 사람이 안 챙겨도 자동으로 들어가게 한다.

```bash
sudo apt install -y unattended-upgrades
sudo dpkg-reconfigure -plow unattended-upgrades
```
`/etc/apt/apt.conf.d/50unattended-upgrades`에서 `Unattended-Upgrade::Automatic-Reboot`는 **`false`로 유지** — 커널 업데이트로 재부팅이 필요해지면 자동 재부팅 대신 "10-3 다운타임 모니터링"(UptimeRobot)이 감지하게 하고, 재부팅은 직접 확인 후 진행한다(자동 재부팅 중 pm2/Docker가 안 살아나는 걸 아무도 모르는 상태로 방치하는 게 더 위험).

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
