import type { NextConfig } from 'next';
import fs from 'fs';
import path from 'path';

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

export default nextConfig;
