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

카페24 자동설치 패키지를 선택하면 서버에 PostgreSQL 17이 이미 깔려 있습니다. 하지만 지금 코드(`server/docker-compose.yml`, `DATABASE_URL` 기본값)는 전부 Docker 컨테이너 기준으로 짜여 있어서, **그대로 Docker Postgres를 쓰는 쪽이 코드·스크립트 변경이 없어 더 안전**합니다. 카페24가 깐 네이티브 PostgreSQL 서비스는 그냥 켜두거나 꺼두면 됩니다 (충돌 방지를 위해 포트를 5432로 동시에 열지 않도록만 주의).

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

# 선택: 에러 트래킹 (Sentry) — DSN 없으면 비활성 상태로 빌드/실행됨
NEXT_PUBLIC_SENTRY_DSN=
```

- `API_URL`: **서버 내부** Express 주소 (프록시용, 외부 노출 X)
- `NEXT_PUBLIC_API_URL`: 브라우저가 `/uploads` 이미지를 불러올 **공개 URL**
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

# 선택: 에러 트래킹 (Sentry) — DSN 없으면 비활성 상태로 실행됨
SENTRY_DSN=
```

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

- [ ] 방화벽에서 **22(SSH), 80, 443만 개방** — 5432(Postgres)는 반드시 외부 차단 (카페24 콘솔/서버 방화벽에서 직접 설정, 자동으로 막혀 있지 않음)
- [ ] `https://도메인/` 접속
- [ ] 로그인 / 로그아웃
- [ ] 승객 견적 생성, Kakao 주소·거리
- [ ] 기사 입찰, 승객 낙찰
- [ ] 프로필·면허증 업로드 → 이미지 표시
- [ ] 관리자 로그인·매출 탭
- [ ] `curl https://도메인/api/health` 또는 Express `/health` (내부)
- [ ] `SENTRY_DSN`/`NEXT_PUBLIC_SENTRY_DSN` 설정했다면, 의도적으로 에러를 한 번 발생시켜 Sentry 대시보드에 리포트가 뜨는지 확인

---

## 11. 나중에 확장 (비용 ↑)

| 단계 | 작업 |
|------|------|
| 파일 | S3 + `STORAGE_PROVIDER=s3` 구현 |
| DB | 관리형 PostgreSQL로 이전 (또는 카페24 네이티브 Postgres로 전환) |
| 모니터링 | Sentry, UptimeRobot |
| CI/CD | GitHub Actions → SSH deploy |
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

로그:

```bash
pm2 logs
docker logs goodbus-postgres
```
