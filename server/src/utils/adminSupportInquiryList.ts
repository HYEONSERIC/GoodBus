import { Prisma } from '@prisma/client';
import prisma from './db';
import { formatSupportInquiryCategory } from './supportInquiry';

export type SupportInquiryListStatus = 'all' | 'pending' | 'replied';
export type SupportInquiryListSort =
    | 'unanswered_first'
    | 'newest'
    | 'oldest';

const inquiryListSelect = {
    id: true,
    title: true,
    category: true,
    createdAt: true,
    repliedAt: true,
    user: {
        select: {
            email: true,
            role: true,
            displayName: true,
            companyName: true,
            phoneNumber: true,
        },
    },
} as const;

export function parseSupportInquiryListStatus(
    raw: unknown,
): SupportInquiryListStatus {
    const s = String(raw ?? 'all').trim();
    if (s === 'pending' || s === 'replied') return s;
    return 'all';
}

export function parseSupportInquiryListSort(
    raw: unknown,
): SupportInquiryListSort {
    const s = String(raw ?? 'unanswered_first').trim();
    if (s === 'newest' || s === 'oldest') return s;
    return 'unanswered_first';
}

function buildSearchWhere(search: string): Prisma.SupportInquiryWhereInput {
    if (!search) return {};
    return {
        OR: [
            { title: { contains: search, mode: 'insensitive' } },
            { body: { contains: search, mode: 'insensitive' } },
            {
                user: {
                    email: { contains: search, mode: 'insensitive' },
                },
            },
            {
                user: {
                    displayName: { contains: search, mode: 'insensitive' },
                },
            },
            {
                user: {
                    companyName: { contains: search, mode: 'insensitive' },
                },
            },
            {
                user: {
                    phoneNumber: { contains: search },
                },
            },
        ],
    };
}

function buildStatusWhere(
    status: SupportInquiryListStatus,
): Prisma.SupportInquiryWhereInput {
    if (status === 'pending') return { repliedAt: null };
    if (status === 'replied') return { repliedAt: { not: null } };
    return {};
}

function listOrderBy(
    sort: SupportInquiryListSort,
): Prisma.SupportInquiryOrderByWithRelationInput[] {
    if (sort === 'oldest') {
        return [{ createdAt: 'asc' }];
    }
    if (sort === 'newest') {
        return [{ createdAt: 'desc' }];
    }
    return [
        { repliedAt: { sort: 'asc', nulls: 'first' } },
        { createdAt: 'desc' },
    ];
}

export async function listAdminSupportInquiries(params: {
    search?: string;
    status?: SupportInquiryListStatus;
    sort?: SupportInquiryListSort;
    take?: number;
}) {
    const search = (params.search ?? '').trim();
    const status = params.status ?? 'all';
    const sort = params.sort ?? 'unanswered_first';
    const take = Math.min(params.take ?? 300, 500);

    const searchWhere = buildSearchWhere(search);
    const statusWhere = buildStatusWhere(status);
    const listWhere: Prisma.SupportInquiryWhereInput = {
        AND: [searchWhere, statusWhere],
    };

    const [rows, totalMatching, unansweredTotal] = await Promise.all([
        prisma.supportInquiry.findMany({
            where: listWhere,
            orderBy: listOrderBy(sort),
            take,
            select: inquiryListSelect,
        }),
        prisma.supportInquiry.count({ where: listWhere }),
        prisma.supportInquiry.count({ where: { repliedAt: null } }),
    ]);

    const pendingInFilter = await prisma.supportInquiry.count({
        where: {
            AND: [searchWhere, statusWhere, { repliedAt: null }],
        },
    });

    return {
        inquiries: rows.map((r) => ({
            id: r.id,
            title: r.title,
            category: r.category,
            categoryLabel: formatSupportInquiryCategory(r.category),
            createdAt: r.createdAt.toISOString(),
            repliedAt: r.repliedAt ? r.repliedAt.toISOString() : null,
            authorEmail: r.user.email,
            authorRole: r.user.role,
            authorDisplay:
                r.user.displayName ||
                r.user.companyName ||
                r.user.email ||
                r.user.phoneNumber ||
                '알 수 없음',
        })),
        meta: {
            unansweredTotal,
            totalMatching,
            pendingInFilter,
            returned: rows.length,
        },
    };
}
