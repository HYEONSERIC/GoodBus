// 유닛 테스트는 실제 DB에 연결하지 않지만, `PrismaClient`가 생성 시점에
// `DATABASE_URL`을 검증하므로 더미 값을 채워 순수 함수 테스트가 깨지지 않게 한다.
process.env.DATABASE_URL ||=
    'postgresql://test:test@localhost:5432/goodbus_test';
process.env.JWT_SECRET ||= 'vitest-test-secret-do-not-use-in-production';
