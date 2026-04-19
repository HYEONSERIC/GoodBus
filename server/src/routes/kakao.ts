import express from 'express';

const router = express.Router();

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
        }));

        return res.json({ places });
    } catch (error) {
        console.error('Kakao places error:', error);
        return res.status(500).json({ error: 'Kakao API request failed' });
    }
});

export default router;
