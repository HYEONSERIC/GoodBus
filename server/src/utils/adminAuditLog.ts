import { Prisma, PrismaClient } from '@prisma/client';
import prisma from './db';

type AdminAuditLogClient = PrismaClient | Prisma.TransactionClient;

/**
 * 관리자 콘솔에서 실제로 기록하는 감사 로그 행위 종류.
 * 새 행위를 추가할 때는 이 목록에도 함께 추가한다.
 */
export type AdminAuditAction =
    | 'user.status.update'
    | 'verification.review'
    | 'admin.create'
    | 'supportPost.create'
    | 'supportPost.update'
    | 'supportPost.delete'
    | 'supportInquiry.reply';

export type RecordAdminAuditParams = {
    actorId: string;
    action: AdminAuditAction;
    targetType?: string;
    targetId?: string;
    metadata?: Record<string, unknown>;
};

/**
 * 관리자 행위를 감사 로그에 남긴다. 로그 기록 자체가 실패해도(DB 일시 오류 등)
 * 사용자 차단·서류 승인처럼 이미 완료된 실제 작업을 막아서는 안 되므로,
 * 여기서 발생한 에러는 호출자에게 전파하지 않고 콘솔에만 남긴다.
 */
export async function recordAdminAudit(
    params: RecordAdminAuditParams,
    client: AdminAuditLogClient = prisma
): Promise<void> {
    try {
        await client.adminAuditLog.create({
            data: {
                actorId: params.actorId,
                action: params.action,
                targetType: params.targetType,
                targetId: params.targetId,
                metadata: params.metadata as Prisma.InputJsonValue | undefined,
            },
        });
    } catch (error) {
        console.error('recordAdminAudit failed:', error);
    }
}
