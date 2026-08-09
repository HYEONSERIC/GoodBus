import { defineConfig } from 'vitest/config';

export default defineConfig({
    resolve: {
        alias: {
            '@': import.meta.dirname,
        },
    },
    test: {
        environment: 'node',
        include: ['{lib,components,hooks}/**/*.test.{ts,tsx}'],
        exclude: ['node_modules', 'server', '.next'],
        // 날짜 관련 로직(toLocalDateKey 등)이 로컬 타임존을 쓰므로,
        // 로컬 실행/CI 어디서나 같은 결과가 나오도록 타임존을 고정한다.
        env: {
            TZ: 'Asia/Seoul',
        },
    },
});
