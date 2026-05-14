import express from 'express';
import prisma from '../utils/db';
import { SupportPostKind } from '@prisma/client';
import {
    formatSupportAuthorLabel,
    parseSupportPostKind,
} from '../utils/supportPost';

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

export default router;
