import { describe, expect, it, vi } from 'vitest';
import { recordAdminAudit } from './adminAuditLog';

function makeMockClient(createImpl: (...args: unknown[]) => unknown) {
    return {
        adminAuditLog: {
            create: vi.fn(createImpl),
        },
    } as unknown as Parameters<typeof recordAdminAudit>[1];
}

describe('recordAdminAudit', () => {
    it('actorId/action/target/metadata를 그대로 전달해 기록한다', async () => {
        const create = vi.fn().mockResolvedValue({});
        const client = { adminAuditLog: { create } } as unknown as Parameters<
            typeof recordAdminAudit
        >[1];

        await recordAdminAudit(
            {
                actorId: 'admin-1',
                action: 'user.status.update',
                targetType: 'User',
                targetId: 'user-2',
                metadata: { from: 'Active', to: 'Blocked' },
            },
            client
        );

        expect(create).toHaveBeenCalledWith({
            data: {
                actorId: 'admin-1',
                action: 'user.status.update',
                targetType: 'User',
                targetId: 'user-2',
                metadata: { from: 'Active', to: 'Blocked' },
            },
        });
    });

    it('로그 기록이 실패해도 예외를 던지지 않는다', async () => {
        const client = makeMockClient(() => {
            throw new Error('db unavailable');
        });

        await expect(
            recordAdminAudit(
                { actorId: 'admin-1', action: 'admin.create' },
                client
            )
        ).resolves.toBeUndefined();
    });
});
