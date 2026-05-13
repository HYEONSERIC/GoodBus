import express from 'express';

const router = express.Router();

type Point = { x: number; y: number };

async function requestDirectionsDistance(
    directionsKey: string,
    origin: Point,
    destination: Point,
    priority: 'RECOMMEND' | 'TIME' | 'DISTANCE' = 'RECOMMEND',
) {
    const endpoint = new URL('https://apis-navi.kakaomobility.com/v1/directions');
    endpoint.searchParams.set('origin', `${origin.x},${origin.y}`);
    endpoint.searchParams.set('destination', `${destination.x},${destination.y}`);
    endpoint.searchParams.set('priority', priority);

    const response = await fetch(endpoint.toString(), {
        headers: {
            Authorization: `KakaoAK ${directionsKey}`,
        },
    });

    if (!response.ok) {
        const errorText = await response.text();
        return {
            ok: false as const,
            status: response.status,
            errorText: errorText || 'Kakao mobility API error',
        };
    }

    const data: any = await response.json();
    const firstRoute = data?.routes?.[0];
    const summaryDistance = Number(firstRoute?.summary?.distance);
    const sectionDistance = Array.isArray(firstRoute?.sections)
        ? firstRoute.sections.reduce((acc: number, section: any) => {
              const sectionDistanceValue = Number(section?.distance);
              return acc + (Number.isFinite(sectionDistanceValue) ? sectionDistanceValue : 0);
          }, 0)
        : Number.NaN;
    const distanceMeters = Number.isFinite(summaryDistance)
        ? summaryDistance
        : sectionDistance;
    if (!Number.isFinite(distanceMeters)) {
        return {
            ok: false as const,
            status: 404,
            errorText:
                String(data?.msg || '').trim() ||
                String(data?.message || '').trim() ||
                'Route distance not found',
        };
    }

    return {
        ok: true as const,
        distanceMeters,
    };
}

async function findNearbyRoadPoint(localKey: string, point: Point) {
    try {
        const reverseEndpoint = new URL(
            'https://dapi.kakao.com/v2/local/geo/coord2address.json',
        );
        reverseEndpoint.searchParams.set('x', String(point.x));
        reverseEndpoint.searchParams.set('y', String(point.y));

        const reverseResponse = await fetch(reverseEndpoint.toString(), {
            headers: {
                Authorization: `KakaoAK ${localKey}`,
            },
        });
        if (!reverseResponse.ok) return null;

        const reverseData: any = await reverseResponse.json();
        const firstDoc = reverseData?.documents?.[0];
        const roadAddressName = firstDoc?.road_address?.address_name;
        const addressName = firstDoc?.address?.address_name;
        const query = String(roadAddressName || addressName || '').trim();
        if (!query) return null;

        const searchEndpoint = new URL(
            'https://dapi.kakao.com/v2/local/search/address.json',
        );
        searchEndpoint.searchParams.set('query', query);
        searchEndpoint.searchParams.set('analyze_type', 'exact');

        const searchResponse = await fetch(searchEndpoint.toString(), {
            headers: {
                Authorization: `KakaoAK ${localKey}`,
            },
        });
        if (!searchResponse.ok) return null;

        const searchData: any = await searchResponse.json();
        const doc = searchData?.documents?.[0];
        const x = Number(doc?.road_address?.x ?? doc?.address?.x);
        const y = Number(doc?.road_address?.y ?? doc?.address?.y);
        if (!Number.isFinite(x) || !Number.isFinite(y)) return null;

        return { x, y };
    } catch {
        return null;
    }
}

router.get('/places', async (req, res) => {
    const query = String(req.query.query || '').trim();
    if (!query) {
        return res.status(400).json({ error: 'query is required' });
    }

    const kakaoKey = process.env.KAKAO_REST_API_KEY;
    if (!kakaoKey) {
        return res
            .status(500)
            .json({ error: 'KAKAO_REST_API_KEY is not set' });
    }

    try {
        const endpoint = new URL(
            'https://dapi.kakao.com/v2/local/search/keyword.json'
        );
        endpoint.searchParams.set('query', query);
        endpoint.searchParams.set('size', '5');

        const response = await fetch(endpoint.toString(), {
            headers: {
                Authorization: `KakaoAK ${kakaoKey}`,
            },
        });

        if (!response.ok) {
            const errorText = await response.text();
            return res.status(response.status).json({
                error: errorText || 'Kakao API error',
            });
        }

        const data: any = await response.json();
        const places = (data.documents || []).map((doc: any) => ({
            id: doc.id,
            place_name: doc.place_name,
            address_name: doc.address_name,
            road_address_name: doc.road_address_name,
            x: doc.x,
            y: doc.y,
        }));

        return res.json({ places });
    } catch (error) {
        console.error('Kakao places error:', error);
        return res.status(500).json({ error: 'Kakao API request failed' });
    }
});

router.get('/directions', async (req, res) => {
    const originX = Number(String(req.query.originX || '').trim());
    const originY = Number(String(req.query.originY || '').trim());
    const destX = Number(String(req.query.destX || '').trim());
    const destY = Number(String(req.query.destY || '').trim());
    if (
        !Number.isFinite(originX) ||
        !Number.isFinite(originY) ||
        !Number.isFinite(destX) ||
        !Number.isFinite(destY)
    ) {
        return res.status(400).json({
            error: 'originX, originY, destX, destY are required',
        });
    }

    const kakaoDirectionsKey =
        process.env.KAKAO_MOBILITY_API_KEY || process.env.KAKAO_REST_API_KEY;
    const kakaoLocalKey = process.env.KAKAO_REST_API_KEY || kakaoDirectionsKey;
    if (!kakaoDirectionsKey) {
        return res
            .status(500)
            .json({
                error: 'KAKAO_MOBILITY_API_KEY or KAKAO_REST_API_KEY is not set',
            });
    }

    try {
        const origin = { x: originX, y: originY };
        const destination = { x: destX, y: destY };

        const firstResult = await requestDirectionsDistance(
            kakaoDirectionsKey,
            origin,
            destination,
            'RECOMMEND',
        );
        if (firstResult.ok) {
            return res.json({
                distanceMeters: firstResult.distanceMeters,
                distanceKm: Math.round(firstResult.distanceMeters / 1000),
            });
        }

        const [adjustedOrigin, adjustedDestination] = await Promise.all([
            findNearbyRoadPoint(kakaoLocalKey, origin),
            findNearbyRoadPoint(kakaoLocalKey, destination),
        ]);

        const retryOrigin = adjustedOrigin ?? origin;
        const retryDestination = adjustedDestination ?? destination;
        const isSnapped =
            retryOrigin.x !== origin.x ||
            retryOrigin.y !== origin.y ||
            retryDestination.x !== destination.x ||
            retryDestination.y !== destination.y;

        if (isSnapped) {
            const retryResult = await requestDirectionsDistance(
                kakaoDirectionsKey,
                retryOrigin,
                retryDestination,
                'RECOMMEND',
            );
            if (retryResult.ok) {
                return res.json({
                    distanceMeters: retryResult.distanceMeters,
                    distanceKm: Math.round(retryResult.distanceMeters / 1000),
                    snapped: true,
                });
            }

            const retryByTimeResult = await requestDirectionsDistance(
                kakaoDirectionsKey,
                retryOrigin,
                retryDestination,
                'TIME',
            );
            if (retryByTimeResult.ok) {
                return res.json({
                    distanceMeters: retryByTimeResult.distanceMeters,
                    distanceKm: Math.round(retryByTimeResult.distanceMeters / 1000),
                    snapped: true,
                    priority: 'TIME',
                });
            }
        }

        return res.status(firstResult.status).json({
            error: firstResult.errorText,
        });
    } catch (error) {
        console.error('Kakao directions error:', error);
        return res.status(500).json({ error: 'Kakao directions request failed' });
    }
});

export default router;
