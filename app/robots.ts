import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/siteConfig';

export default function robots(): MetadataRoute.Robots {
    return {
        rules: [
            {
                userAgent: '*',
                allow: '/',
                disallow: ['/admin', '/dashboard', '/api', '/payments'],
            },
        ],
        sitemap: `${SITE_URL}/sitemap.xml`,
    };
}
