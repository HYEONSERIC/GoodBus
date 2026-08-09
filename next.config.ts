import type { NextConfig } from 'next';
import fs from 'fs';
import path from 'path';
import { withSentryConfig } from '@sentry/nextjs';

const envPath = path.join(process.cwd(), '.env.local');
const envFile = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';

const readEnvValue = (key: string) => {
    const match = envFile.match(new RegExp(`^${key}=(.+)$`, 'm'));
    if (!match) return undefined;
    return match[1].trim().replace(/^['"]|['"]$/g, '');
};

const kakaoJsKey =
    process.env.NEXT_PUBLIC_KAKAO_JS_KEY ||
    readEnvValue('NEXT_PUBLIC_KAKAO_JS_KEY') ||
    readEnvValue('NEXT_PUBLIC_KAKAO_MAPS_KEY');

const nextConfig: NextConfig = {
    env: {
        ...(kakaoJsKey ? { NEXT_PUBLIC_KAKAO_JS_KEY: kakaoJsKey } : {}),
    },
};

export default withSentryConfig(nextConfig, {
    silent: true,
    org: process.env.SENTRY_ORG,
    project: process.env.SENTRY_PROJECT,
    authToken: process.env.SENTRY_AUTH_TOKEN,
    // 소스맵 업로드는 SENTRY_AUTH_TOKEN이 있을 때만 실행 (없으면 빌드에 영향 없음)
    sourcemaps: {
        disable: !process.env.SENTRY_AUTH_TOKEN,
    },
    widenClientFileUpload: true,
});
