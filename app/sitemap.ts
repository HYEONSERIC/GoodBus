import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/siteConfig';

const staticRoutes = [
    { path: '/', priority: 1, changeFrequency: 'daily' as const },
    { path: '/company', priority: 0.6, changeFrequency: 'monthly' as const },
    { path: '/location', priority: 0.5, changeFrequency: 'monthly' as const },
    { path: '/legal/terms', priority: 0.3, changeFrequency: 'yearly' as const },
    {
        path: '/legal/privacy',
        priority: 0.3,
        changeFrequency: 'yearly' as const,
    },
    { path: '/signup', priority: 0.7, changeFrequency: 'monthly' as const },
    {
        path: '/signup-business',
        priority: 0.7,
        changeFrequency: 'monthly' as const,
    },
    { path: '/login', priority: 0.4, changeFrequency: 'monthly' as const },
];

export default function sitemap(): MetadataRoute.Sitemap {
    return staticRoutes.map((route) => ({
        url: `${SITE_URL}${route.path}`,
        changeFrequency: route.changeFrequency,
        priority: route.priority,
    }));
}
