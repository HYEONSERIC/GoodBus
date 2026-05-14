import express from 'express';
import prisma from '../utils/db';
import { SupportPostKind, UserRole } from '@prisma/client';
import {
    formatSupportAuthorLabel,
    parseSupportPostKind,
} from '../utils/supportPost';
import { requireAuth } from '../middleware/auth';
import {
    formatSupportInquiryCategory,
    parseSupportInquiryCategory,
} from '../utils/supportInquiry';

const router = express.Router();

function buildPublicList(
    rows: Array<{
        id: string;
        kind: SupportPostKind;
        title: string;
        pinned: boolean;
        authorRole: Parameters<typeof formatSupportAuthorLabel>[0];
        createdAt: Date;
    }>,
) {
    const sorted = [...rows].sort((a, b) => {
        if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
    const nonPinned = sorted.filter((p) => !p.pinned);
    const total = nonPinned.length;
    let nonPinnedIndex = 0;
    return sorted.map((p) => ({
        id: p.id,
        kind: p.kind,
        title: p.title,
        pinned: p.pinned,
        authorLabel: formatSupportAuthorLabel(p.authorRole),
        createdAt: p.createdAt.toISOString(),
        listNo: p.pinned ? null : total - nonPinnedIndex++,
    }));
}

router.get('/posts', async (req, res) => {
    try {
        const kind = parseSupportPostKind(req.query.kind);
        if (!kind) {
            return res
                .status(400)
                .json({ error: 'Query kind must be notice or faq' });
        }
        const search = String(req.query.q || '').trim();

        const rows = await prisma.supportPost.findMany({
            where: {
                kind,
                ...(search
                    ? {
                          title: {
                              contains: search,
                              mode: 'insensitive',
                          },
                      }
                    : {}),
            },
            orderBy: [{ pinned: 'desc' }, { createdAt: 'desc' }],
            select: {
                id: true,
                kind: true,
                title: true,
                pinned: true,
                authorRole: true,
                createdAt: true,
            },
        });

        res.json({ posts: buildPublicList(rows) });
    } catch (e) {
        console.error('support list', e);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.get('/posts/:id', async (req, res) => {
    try {
        const post = await prisma.supportPost.findUnique({
            where: { id: String(req.params.id || '').trim() },
            select: {
                id: true,
                kind: true,
                title: true,
                body: true,
                pinned: true,
                authorRole: true,
                createdAt: true,
            },
        });
        if (!post) {
            return res.status(404).json({ error: 'Not found' });
        }
        res.json({
            post: {
                ...post,
                authorLabel: formatSupportAuthorLabel(post.authorRole),
                createdAt: post.createdAt.toISOString(),
            },
        });
    } catch (e) {
        console.error('support detail', e);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.get('/my-inquiries', requireAuth, async (req, res) => {
    try {
        if (req.user!.role === UserRole.Admin) {
            return res.status(403).json({
                error: '관리자는 이 목록을 사용할 수 없습니다.',
            });
        }

        const rows = await prisma.supportInquiry.findMany({
            where: { userId: req.user!.userId },
            orderBy: { createdAt: 'desc' },
            take: 100,
            select: {
                id: true,
                title: true,
                category: true,
                createdAt: true,
            },
        });

        res.json({
            inquiries: rows.map((r) => ({
                id: r.id,
                title: r.title,
                category: r.category,
                categoryLabel: formatSupportInquiryCategory(r.category),
                createdAt: r.createdAt.toISOString(),
            })),
        });
    } catch (e) {
        console.error('support my inquiries list', e);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.get('/my-inquiries/:id', requireAuth, async (req, res) => {
    try {
        if (req.user!.role === UserRole.Admin) {
            return res.status(403).json({ error: 'Forbidden' });
        }

        const id = String(req.params.id || '').trim();
        if (!id) {
            return res.status(400).json({ error: 'Missing id' });
        }

        const row = await prisma.supportInquiry.findFirst({
            where: { id, userId: req.user!.userId },
            select: {
                id: true,
                title: true,
                body: true,
                category: true,
                createdAt: true,
            },
        });
        if (!row) {
            return res.status(404).json({ error: 'Not found' });
        }

        res.json({
            inquiry: {
                id: row.id,
                title: row.title,
                body: row.body,
                category: row.category,
                categoryLabel: formatSupportInquiryCategory(row.category),
                createdAt: row.createdAt.toISOString(),
            },
        });
    } catch (e) {
        console.error('support my inquiry detail', e);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.post('/inquiries', requireAuth, async (req, res) => {
    try {
        if (req.user!.role === UserRole.Admin) {
            return res.status(403).json({
                error: '관리자 계정으로는 문의를 등록할 수 없습니다.',
            });
        }

        const category = parseSupportInquiryCategory(req.body?.category);
        if (!category) {
            return res.status(400).json({ error: 'Invalid inquiry category' });
        }

        const title = String(req.body?.title ?? '').trim();
        const body = String(req.body?.body ?? '').trim();
        if (!title || title.length > 200) {
            return res
                .status(400)
                .json({ error: 'Title is required (max 200 characters)' });
        }
        if (!body || body.length > 20000) {
            return res.status(400).json({
                error: 'Inquiry content is required (max 20000 characters)',
            });
        }

        const row = await prisma.supportInquiry.create({
            data: {
                userId: req.user!.userId,
                category,
                title,
                body,
            },
            select: { id: true, createdAt: true },
        });

        res.status(201).json({
            inquiry: {
                id: row.id,
                createdAt: row.createdAt.toISOString(),
            },
        });
    } catch (e) {
        console.error('support inquiry create', e);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
